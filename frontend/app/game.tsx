import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Animated, { FadeInUp, ZoomOut, LinearTransition } from 'react-native-reanimated';

import { getGrid, playMove, startGame } from '../src/api/game';
import { loadSession } from '../src/utils/storage';
import { generateGrid, generateLetter } from '../src/utils/grid';

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

  const tileSize = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const horizontalPadding = 40;
    const gap = 6;
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
    const gap = 6;
    const paddingHorizontal = 24;
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

        const response = await startGame({
          user_id: session.userId,
          username: session.username,
          grid_size: gridSize,
        });

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

  async function submitSelection() {
    if (!gameId) {
      if (selectedPositions.length >= 3) {
         // Local mock for testing animations
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

    if (selectedPositions.length < 3) {
      setErrorMessage('Select at least 3 letters.');
      resetSelection();
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      const letters = selectedPositions.map((pos) => grid[pos.row]?.[pos.col]?.letter ?? '');
      const positions = selectedPositions.map((pos) => [pos.row, pos.col] as [number, number]);
      const response = await playMove({
        game_id: gameId,
        letters,
        positions,
      });

      if (response.grid) {
        if (response.valid) {
          syncGrid(response.grid, selectedPositions);
        } else {
          // On invalid move, preserve IDs so the board doesn't flash/animate unnecessarily
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

      if (typeof response.total_score === 'number') {
        setScore(response.total_score);
      }

      if (typeof response.move_count === 'number') {
        setMoveCount(response.move_count);
      }

      setPossibleWordCount(response.possible_word_count ?? null);
      setLastWord(response.word ?? null);
      setScoreDelta(typeof response.score_added === 'number' ? response.score_added : null);
      setComboScore(typeof response.combo_score === 'number' ? response.combo_score : null);
      setComboWords(response.combos ?? []);
      setErrorMessage(response.valid ? null : response.message ?? 'Word rejected.');
    } catch {
      setErrorMessage('Could not validate the word.');
    } finally {
      setIsSubmitting(false);
      resetSelection();
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Game</Text>

        <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>Moves</Text>
          <Text style={styles.headerValue}>{moveCount}</Text>
        </View>
        <View>
          <Text style={styles.headerLabel}>Score</Text>
          <Text style={styles.headerValue}>{score}</Text>
        </View>
        <View>
          <Text style={styles.headerLabel}>Grid</Text>
          <Text style={styles.headerValue}>{gridSize}x{gridSize}</Text>
        </View>
        <View>
          <Text style={styles.headerLabel}>Words</Text>
          <Text style={styles.headerValue}>{possibleWordCount ?? '--'}</Text>
        </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.resultCard}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Last word</Text>
          <Text style={styles.resultValue}>{lastWord ?? '--'}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Score +</Text>
          <Text style={styles.resultValue}>{scoreDelta ?? '--'}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Combo +</Text>
          <Text style={styles.resultValue}>{comboScore ?? '--'}</Text>
        </View>
        {comboWords.length > 0 ? (
          <Text style={styles.comboText}>Combos: {comboWords.join(', ')}</Text>
        ) : null}
        </View>

        <PanGestureHandler
        onGestureEvent={(event) => {
          const { x, y, state } = event.nativeEvent;
          if (state === State.BEGAN || state === State.ACTIVE) {
            if (!isSelecting) {
              setIsSelecting(true);
            }
            trySelectAt(x, y);
          }
        }}
        onHandlerStateChange={(event) => {
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
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
              {Array.from({ length: gridSize }).map((_, colIndex) => (
                <View key={`col-${colIndex}`} style={{ flexDirection: 'column', gap: 6 }}>
                  {grid.map((row, rowIndex) => {
                    const tileObj = grid[rowIndex][colIndex];
                    const isSelected = selectedPositions.some((pos) => pos.row === rowIndex && pos.col === colIndex);
                    
                    const powerIcons: Record<string, string> = {
                      row_clear: '⇆',
                      area_bomb: '✹',
                      column_clear: '⇅',
                      mega_bomb: '✪'
                    };

                    return (
                      <Animated.View
                        key={tileObj.id}
                        layout={LinearTransition.springify().damping(16).stiffness(150)}
                        entering={FadeInUp.springify()}
                        exiting={ZoomOut}
                        style={[
                          styles.tile,
                          { width: tileSize, height: tileSize },
                          isSelected ? styles.tileSelected : null,
                        ]}
                      >
                        <Text style={styles.tileText}>{tileObj.letter}</Text>
                        {tileObj.power && (
                          <Text style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 12, color: '#be123c', fontWeight: '800' }}>
                            {powerIcons[tileObj.power] ?? '*'}
                          </Text>
                        )}
                      </Animated.View>
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

        <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={regenerateGrid}>
          <Text style={styles.secondaryButtonText}>Mock regenerate</Text>
        </Pressable>
        <Pressable style={styles.primaryOutlineButton} onPress={refreshFromApi}>
          <Text style={styles.primaryOutlineText}>Refresh from API</Text>
        </Pressable>
        </View>

        <Pressable style={styles.backButton} onPress={() => router.replace('/home')}>
          <Text style={styles.backButtonText}>Back to Home</Text>
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
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
