import { useEffect, useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View, Image, Alert, BackHandler } from 'react-native';
import { router, useLocalSearchParams, useNavigation, Stack } from 'expo-router';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Animated, { FadeInUp, ZoomOut, LinearTransition, withSpring, useAnimatedStyle } from 'react-native-reanimated';

import { getGrid, playMove, startGame, useJoker, finishGame, usePower } from '../src/api/game';
import { getInventory } from '../src/api/market';
import { loadSession } from '../src/utils/storage';
import { generateGrid, generateLetter } from '../src/utils/grid';

const JOKER_IMAGES: Record<string, any> = {
  fish: require('../assets/images/fish.png'),
  wheel: require('../assets/images/wheel.png'),
  lollipop: require('../assets/images/lollipop-breaker.png'),
  swap: require('../assets/images/free-swap.png'),
  shuffle: require('../assets/images/shuffle.png'),
  party: require('../assets/images/party-booster.png'),
};

type TileObj = {
  id: string;
  letter: string;
  power?: string | null;
};

export default function GameScreen() {
  const params = useLocalSearchParams<{ gridSize?: string; moveCount?: string }>();
  const gridSize = Number(params.gridSize ?? '8');
  const [moveCount, setMoveCount] = useState(Number(params.moveCount ?? '20'));
  const [grid, setGrid] = useState<TileObj[][]>(() => {
    const strGrid = generateGrid(gridSize);
    return strGrid.map(row => row.map(letter => ({ id: Math.random().toString(), letter })));
  });
  const [score, setScore] = useState(0);
  const [possibleWordCount, setPossibleWordCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastWord, setLastWord] = useState<string | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [comboScore, setComboScore] = useState<number | null>(null);
  const [comboWords, setComboWords] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<{ row: number; col: number }[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Joker State
  const [ownedJokers, setOwnedJokers] = useState<string[]>([]);
  const [activeJoker, setActiveJoker] = useState<string | null>(null);
  const [jokerPositions, setJokerPositions] = useState<{ row: number; col: number }[]>([]);

  const navigation = useNavigation();

  const tileSize = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const horizontalPadding = 80; 
    const gap = 10; // Increased gap
    const totalGap = gap * (gridSize - 1);
    return Math.floor((screenWidth - horizontalPadding - totalGap) / gridSize);
  }, [gridSize]);

  const selectedWord = useMemo(() => {
    return selectedPositions.map((pos) => grid[pos.row]?.[pos.col]?.letter ?? '').join('');
  }, [grid, selectedPositions]);

  function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }) {
    return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) <= 1;
  }

  function isAlreadySelected(row: number, col: number) {
    return selectedPositions.some((pos) => pos.row === row && pos.col === col);
  }

  function trySelectAt(x: number, y: number) {
    const gap = 10;
    const paddingHorizontal = 40; 
    const paddingVertical = 20;

    const localX = x - paddingHorizontal;
    const localY = y - paddingVertical;

    if (localX < 0 || localY < 0) {
      return;
    }

    const step = tileSize + gap;
    const col = Math.floor(localX / step);
    const row = Math.floor(localY / step);

    if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) {
      return;
    }

    const offsetX = localX % step;
    const offsetY = localY % step;

    if (offsetX > tileSize || offsetY > tileSize) {
      return;
    }

    if (activeJoker) {
      if (jokerPositions.some(p => p.row === row && p.col === col)) return;

      const isSwap = activeJoker === 'swap';
      if (isSwap && jokerPositions.length === 1 && !isAdjacent(jokerPositions[0], { row, col })) {
        return; // swap requires adjacent
      }

      const newPositions = [...jokerPositions, { row, col }];
      setJokerPositions(newPositions);

      const maxPositions = isSwap ? 2 : 1;
      if (newPositions.length === maxPositions) {
        applyJoker(activeJoker, newPositions);
      }
      return;
    }

    if (isAlreadySelected(row, col)) {
      return;
    }

    if (selectedPositions.length === 0) {
      setSelectedPositions([{ row, col }]);
      return;
    }

    const last = selectedPositions[selectedPositions.length - 1];
    if (!isAdjacent(last, { row, col })) {
      return;
    }

    setSelectedPositions((prev) => [...prev, { row, col }]);
  }

  function resetSelection() {
    setSelectedPositions([]);
    setIsSelecting(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrapGame() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const session = await loadSession();
        if (!session) {
          router.replace('/onboarding');
          return;
        }

        const [response, inventory] = await Promise.all([
          startGame({
            user_id: session.userId,
            username: session.username,
            grid_size: gridSize,
          }),
          getInventory(session.userId)
        ]);

        if (!isMounted) {
          return;
        }

        initGrid(response.grid);
        setScore(response.score);
        setMoveCount(response.move_count);
        setPossibleWordCount(response.possible_word_count ?? null);
        setGameId(response.game_id);
        setLastWord(null);
        setScoreDelta(null);
        setComboScore(null);
        setComboWords([]);
        setOwnedJokers(inventory);
      } catch {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Could not start a game from the server. Showing a mock grid.');
        initGrid(generateGrid(gridSize));
        setPossibleWordCount(null);
        setGameId(null);
        setLastWord(null);
        setScoreDelta(null);
        setComboScore(null);
        setComboWords([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapGame();

    return () => {
      isMounted = false;
    };
  }, [gridSize]);

  function initGrid(newGridStr: any[][]) {
    setGrid(newGridStr.map(row => row.map(item => {
      const isObj = typeof item === 'object' && item !== null;
      return { 
        id: Math.random().toString(), 
        letter: isObj ? item.letter : item,
        power: isObj ? item.power : null
      };
    })));
  }

  function syncGrid(newGridStr: any[][], explodedPositions: {row: number, col: number}[]) {
    setGrid((oldGrid) => {
      const size = newGridStr.length;
      const newGridObj: TileObj[][] = Array.from({length: size}, () => []);

      for (let c = 0; c < size; c++) {
        let survivors: TileObj[] = [];
        for (let r = 0; r < size; r++) {
          if (!explodedPositions.some(p => p.row === r && p.col === c)) {
            survivors.push(oldGrid[r][c]);
          }
        }
        
        const newItemsCount = size - survivors.length;
        for (let r = 0; r < size; r++) {
          const item = newGridStr[r][c];
          const isObj = typeof item === 'object' && item !== null;
          const letterVal = isObj ? item.letter : item;
          const powerVal = isObj ? item.power : null;

          if (r < newItemsCount) {
             newGridObj[r][c] = { id: Math.random().toString(), letter: letterVal, power: powerVal };
          } else {
             const survivor = survivors[r - newItemsCount];
             newGridObj[r][c] = { ...survivor, letter: letterVal, power: powerVal };
          }
        }
      }
      return newGridObj;
    });
  }

  function regenerateGrid() {
    initGrid(generateGrid(gridSize));
    setPossibleWordCount(null);
    setErrorMessage('Mock grid regenerated locally.');
  }

  async function refreshFromApi() {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await getGrid(gridSize);
      initGrid(response.grid);
      setPossibleWordCount(response.possible_word_count ?? null);
    } catch {
      setErrorMessage('Failed to refresh grid from the server.');
    } finally {
      setIsLoading(false);
    }
  }

  async function applyPower(row: number, col: number, powerType: string) {
    if (!gameId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await usePower({ game_id: gameId, row, col });

      if (!response.grid) {
        setErrorMessage('Power failed.');
        return;
      }

      // Build list of affected cells for targeted animation
      const size = grid.length;
      let affectedCells: {row: number, col: number}[] = [];

      if (powerType === 'row_clear') {
        for (let c = 0; c < size; c++) affectedCells.push({ row, col: c });
      } else if (powerType === 'column_clear') {
        for (let r = 0; r < size; r++) affectedCells.push({ row: r, col });
      } else if (powerType === 'area_bomb') {
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < size && c >= 0 && c < size) affectedCells.push({ row: r, col: c });
          }
        }
      } else if (powerType === 'mega_bomb') {
        for (let r = row - 2; r <= row + 2; r++) {
          for (let c = col - 2; c <= col + 2; c++) {
            if (r >= 0 && r < size && c >= 0 && c < size) affectedCells.push({ row: r, col: c });
          }
        }
      }

      syncGrid(response.grid, affectedCells);
      setPossibleWordCount(response.possible_word_count);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to activate power.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJokerTap(jokerId: string) {
    if (activeJoker === jokerId) {
      setActiveJoker(null);
      setJokerPositions([]);
      return;
    }
    
    if (['fish', 'shuffle', 'party'].includes(jokerId)) {
      await applyJoker(jokerId, []);
    } else {
      setActiveJoker(jokerId);
      setJokerPositions([]);
    }
  }

  async function applyJoker(jokerId: string, positions: {row: number, col: number}[]) {
    if (!gameId) return;
    try {
      setIsSubmitting(true);
      
      // For swap, aggressively swap locally first so Reanimated animates the movement
      if (jokerId === 'swap' && positions.length === 2) {
        setGrid(oldGrid => {
          const newGrid = oldGrid.map(row => [...row]);
          const t1 = newGrid[positions[0].row][positions[0].col];
          const t2 = newGrid[positions[1].row][positions[1].col];
          newGrid[positions[0].row][positions[0].col] = t2;
          newGrid[positions[1].row][positions[1].col] = t1;
          return newGrid;
        });
      }

      const response = await useJoker({
        game_id: gameId,
        joker_id: jokerId,
        positions: positions.map(p => [p.row, p.col])
      });
      
      if (!response.grid) {
        setErrorMessage(response.message || 'Joker failed on server');
        setActiveJoker(null);
        setJokerPositions([]);
        setIsSubmitting(false);
        // If swap was reverted locally, we might need to refresh, but let's just refresh to be safe
        if (jokerId === 'swap') refreshFromApi();
        return;
      }

      if (jokerId === 'lollipop') {
        syncGrid(response.grid, [positions[0]]);
      } else if (jokerId === 'wheel') {
        const exploded: {row: number, col: number}[] = [];
        for (let r = 0; r < gridSize; r++) exploded.push({ row: r, col: positions[0].col });
        for (let c = 0; c < gridSize; c++) {
          if (c !== positions[0].col) exploded.push({ row: positions[0].row, col: c });
        }
        syncGrid(response.grid, exploded);
      } else if (jokerId === 'swap') {
        syncGrid(response.grid, []); // IDs already swapped locally, just sync the letters
      } else {
        initGrid(response.grid); // For fish, shuffle, party - refresh all
      }

      setPossibleWordCount(response.possible_word_count);
      setActiveJoker(null);
      setJokerPositions([]);
      
      setOwnedJokers(prev => {
        const idx = prev.indexOf(jokerId);
        if (idx > -1) {
          const newOwned = [...prev];
          newOwned.splice(idx, 1);
          return newOwned;
        }
        return prev;
      });

    } catch (err: any) {
      setErrorMessage(err.message || `Failed to use joker: ${jokerId}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitSelection() {
    if (activeJoker) return; // Ignore word selection if joker is active

    if (!gameId) {
      if (selectedPositions.length >= 3) {
         const newGridStr: any[][] = grid.map(r => r.map(t => t.power ? { letter: t.letter, power: t.power } : t.letter));
         const size = gridSize;
         for (let c = 0; c < size; c++) {
            let emptySlots = 0;
            for (let r = size - 1; r >= 0; r--) {
               if (selectedPositions.some(p => p.row === r && p.col === c)) {
                  emptySlots++;
               } else if (emptySlots > 0) {
                  newGridStr[r + emptySlots][c] = newGridStr[r][c];
                  newGridStr[r][c] = '';
               }
            }
         }
         for (let c = 0; c < size; c++) {
            for (let r = 0; r < size; r++) {
               if (newGridStr[r][c] === '') {
                  newGridStr[r][c] = generateLetter();
               }
            }
         }

         syncGrid(newGridStr, selectedPositions);
         setScore(s => s + (selectedPositions.length * 10));
         setLastWord(selectedWord);
      }
      resetSelection();
      return;
    }

    if (selectedPositions.length >= 3) {
      setIsSubmitting(true);
      setErrorMessage(null);

      const letters = selectedPositions.map((pos) => grid[pos.row]?.[pos.col]?.letter ?? '');
      const positions: Array<[number, number]> = selectedPositions.map((pos) => [pos.row, pos.col]);

      try {
        const response = await playMove({
          game_id: gameId,
          letters,
          positions,
        });

        if (response.grid) {
          if (response.valid) {
            syncGrid(response.grid, selectedPositions);
          } else {
            setGrid(old => old.map((r, rowIdx) => 
              r.map((t, colIdx) => {
                const item = response.grid![rowIdx]?.[colIdx];
                if (!item) return t;
                const isObj = typeof item === 'object' && item !== null;
                return { 
                  ...t, 
                  letter: isObj ? item.letter : item,
                  power: isObj ? item.power : null
                };
              })
            ));
          }
        }

        if (response.move_count !== undefined) {
          setMoveCount(response.move_count);
        }
        if (response.possible_word_count !== undefined) {
          setPossibleWordCount(response.possible_word_count);
        }

        if (response.valid) {
          setScore(response.total_score ?? score);
          setLastWord(response.word ?? null);
          setScoreDelta(response.score_added ?? null);
          setComboScore(response.combo_score ?? null);
          setComboWords(response.combos ?? []);

          // Animate power tiles that were triggered by this word
          const triggeredPowers: { type: string; row: number; col: number }[] = (response as any).triggered_powers ?? [];
          if (triggeredPowers.length > 0) {
            const size = grid.length;
            let allPowerCells: { row: number; col: number }[] = [];
            for (const p of triggeredPowers) {
              if (p.type === 'row_clear') {
                for (let c = 0; c < size; c++) allPowerCells.push({ row: p.row, col: c });
              } else if (p.type === 'column_clear') {
                for (let r = 0; r < size; r++) allPowerCells.push({ row: r, col: p.col });
              } else if (p.type === 'area_bomb') {
                for (let r = p.row - 1; r <= p.row + 1; r++)
                  for (let c = p.col - 1; c <= p.col + 1; c++)
                    if (r >= 0 && r < size && c >= 0 && c < size) allPowerCells.push({ row: r, col: c });
              } else if (p.type === 'mega_bomb') {
                for (let r = p.row - 2; r <= p.row + 2; r++)
                  for (let c = p.col - 2; c <= p.col + 2; c++)
                    if (r >= 0 && r < size && c >= 0 && c < size) allPowerCells.push({ row: r, col: c });
              }
            }
            // syncGrid already has the final server grid; replay animation with power cells
            syncGrid(response.grid!, [...selectedPositions, ...allPowerCells]);
          }
        }

        setErrorMessage(response.valid ? null : response.message ?? 'Word rejected.');

        if (response.game_over) {
          Alert.alert('Game Over', 'No more moves or possible words left! Your score has been saved.');
          router.replace('/home');
        }

      } catch {
        setErrorMessage('Could not validate the word.');
      } finally {
        setIsSubmitting(false);
      }
    }

    resetSelection();
  }

  const handleExit = useCallback(() => {
    Alert.alert(
      'Exit Game',
      'Are you sure you want to exit? Your score will be saved and the game will end.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Exit', 
          style: 'destructive',
          onPress: async () => {
            if (gameId) {
              try {
                setIsLoading(true);
                await finishGame(gameId);
              } catch (err) {
                console.error(err);
              }
            }
            router.replace('/home');
          }
        }
      ]
    );
  }, [gameId]);

  useEffect(() => {
    const onBackPress = () => {
      handleExit();
      return true; // true prevents the default back action
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => subscription.remove();
  }, [handleExit]);

  // Count instances of each joker
  const ownedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ownedJokers.forEach(j => {
      counts[j] = (counts[j] || 0) + 1;
    });
    return counts;
  }, [ownedJokers]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen 
        options={{
          headerLeft: () => (
            <Pressable onPress={handleExit} style={{ paddingRight: 16 }}>
              <Text style={{ color: '#15803d', fontSize: 16, fontWeight: '700' }}>Back</Text>
            </Pressable>
          ),
          gestureEnabled: false,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Word Crush</Text>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Score</Text>
            <Text style={styles.headerValue}>{score}</Text>
          </View>
          <View>
            <Text style={styles.headerLabel}>Moves Left</Text>
            <Text style={styles.headerValue}>{moveCount}</Text>
          </View>
          <View>
            <Text style={styles.headerLabel}>Possible Words</Text>
            <Text style={styles.headerValue}>{possibleWordCount ?? '?'}</Text>
          </View>
        </View>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {lastWord && (
          <Animated.View key={`result-${moveCount}`} entering={FadeInUp.springify()} style={styles.resultCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Word</Text>
              <Text style={styles.resultValue}>{lastWord}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Points</Text>
              <Text style={[styles.resultValue, { color: '#059669' }]}>
                +{scoreDelta}
              </Text>
            </View>
            {comboWords.length > 0 && (
              <Text style={styles.comboText}>
                Combos: {comboWords.join(', ')} (+{comboScore})
              </Text>
            )}
          </Animated.View>
        )}

        {activeJoker && (
          <View style={{ marginTop: 12, backgroundColor: '#fbbf24', padding: 8, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: '#78350f' }}>
              Joker active: Tap {activeJoker === 'swap' ? '2 adjacent tiles' : 'a tile'} to use {activeJoker}
            </Text>
          </View>
        )}

        <PanGestureHandler
        onGestureEvent={(event) => {
          if (activeJoker) return; // No dragging for joker selection
          const { x, y } = event.nativeEvent;
          trySelectAt(x, y);
        }}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.BEGAN) {
            if (activeJoker) {
              const { x, y } = event.nativeEvent;
              trySelectAt(x, y);
            }
          }
          if (event.nativeEvent.state === State.END) {
            submitSelection();
          }
        }}
      >
        <View style={styles.gridCard}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#365314" />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
              {Array.from({ length: gridSize }).map((_, colIndex) => (
                <View key={`col-${colIndex}`} style={{ flexDirection: 'column', gap: 10 }}>
                  {grid.map((row, rowIndex) => {
                    const tileObj = grid[rowIndex][colIndex];
                    const isSelected = selectedPositions.some((pos) => pos.row === rowIndex && pos.col === colIndex);
                    const isJokerSelected = jokerPositions.some((pos) => pos.row === rowIndex && pos.col === colIndex);
                    
                    return (
                      <Tile 
                        key={tileObj.id}
                        tileObj={tileObj}
                        isSelected={isSelected}
                        isJokerSelected={isJokerSelected}
                        tileSize={tileSize}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      </PanGestureHandler>

        <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>Selected word</Text>
        <Text style={styles.previewValue}>{selectedWord || '--'}</Text>
        </View>

        {/* Joker Tray */}
        <View style={styles.jokerTray}>
          <Text style={styles.jokerTrayTitle}>Jokers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
            {Object.keys(JOKER_IMAGES).map((jokerId) => {
              const count = ownedCounts[jokerId] || 0;
              const isActive = activeJoker === jokerId;
              
              return (
                <Pressable 
                  key={jokerId} 
                  style={[
                    styles.jokerButton, 
                    count === 0 && styles.jokerButtonDisabled,
                    isActive && styles.jokerButtonActive
                  ]}
                  onPress={() => count > 0 && handleJokerTap(jokerId)}
                >
                  <Image source={JOKER_IMAGES[jokerId]} style={styles.jokerIcon} />
                  <View style={styles.jokerBadge}>
                    <Text style={styles.jokerBadgeText}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={regenerateGrid}>
          <Text style={styles.secondaryButtonText}>Mock regenerate</Text>
        </Pressable>
        <Pressable style={styles.primaryOutlineButton} onPress={refreshFromApi}>
          <Text style={styles.primaryOutlineText}>Refresh from API</Text>
        </Pressable>
        </View>

        <Pressable style={styles.backButton} onPress={handleExit}>
          <Text style={styles.backButtonText}>End Game & View Scores</Text>
        </Pressable>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefce8',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '900',
    color: '#365314',
  },
  headerRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  headerValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '700',
    textAlign: 'center',
  },
  resultCard: {
    marginTop: 2,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultRow: {
    minWidth: 90,
    alignItems: 'flex-start',
  },
  resultLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1f2937',
  },
  comboText: {
    marginTop: 4,
    width: '100%',
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '700',
  },
  gridCard: {
    marginTop: 2,
    borderRadius: 16,
    padding: 20,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    borderRadius: 10,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  tileSelected: {
    backgroundColor: '#fb7185',
    borderColor: '#be123c',
  },
  tileText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#713f12',
  },
  previewCard: {
    marginTop: 2,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  previewValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  jokerTray: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jokerTrayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  jokerButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  jokerButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  jokerButtonDisabled: {
    opacity: 0.5,
  },
  jokerIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  jokerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#be123c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  jokerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  primaryOutlineButton: {
    flex: 1,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#15803d',
    backgroundColor: '#ffffff',
  },
  primaryOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  backButton: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#15803d',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});

type TileProps = {
  tileObj: TileObj;
  isSelected: boolean;
  isJokerSelected: boolean;
  tileSize: number;
};

function Tile({ tileObj, isSelected, isJokerSelected, tileSize }: TileProps) {
  const powerIcons: Record<string, string> = {
    row_clear: '⇆',
    area_bomb: '✹',
    column_clear: '⇅',
    mega_bomb: '✪'
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isSelected ? 1.05 : 1) }]
    };
  }, [isSelected]);

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(16).stiffness(150)}
      entering={FadeInUp.springify()}
      exiting={ZoomOut}
      style={{ width: tileSize, height: tileSize }}
    >
      <Animated.View
        style={[
          styles.tile,
          { width: '100%', height: '100%' },
          isSelected ? styles.tileSelected : null,
          isJokerSelected ? { backgroundColor: '#3b82f6', borderColor: '#2563eb' } : null,
          animatedStyle,
        ]}
      >
        <Text style={[styles.tileText, isJokerSelected ? {color: '#fff'} : null]}>{tileObj.letter}</Text>
        {tileObj.power && (
          <Text style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 12, color: '#be123c', fontWeight: '800' }}>
            {powerIcons[tileObj.power] ?? '*'}
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}
