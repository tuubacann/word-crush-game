import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';

import { getGrid, startGame } from '../src/api/game';
import { loadSession } from '../src/utils/storage';
import { generateGrid } from '../src/utils/grid';

export default function GameScreen() {
  const params = useLocalSearchParams<{ gridSize?: string; moveCount?: string }>();
  const gridSize = Number(params.gridSize ?? '8');
  const [moveCount, setMoveCount] = useState(Number(params.moveCount ?? '20'));
  const [grid, setGrid] = useState<string[][]>(() => generateGrid(gridSize));
  const [score, setScore] = useState(0);
  const [possibleWordCount, setPossibleWordCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    return selectedPositions.map((pos) => grid[pos.row]?.[pos.col] ?? '').join('');
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

        setGrid(response.grid);
        setScore(response.score);
        setMoveCount(response.move_count);
        setPossibleWordCount(response.possible_word_count ?? null);
      } catch {
        if (!isMounted) {
          return;
        }

        setErrorMessage('Could not start a game from the server. Showing a mock grid.');
        setGrid(generateGrid(gridSize));
        setPossibleWordCount(null);
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

  function regenerateGrid() {
    setGrid(generateGrid(gridSize));
    setPossibleWordCount(null);
    setErrorMessage('Mock grid regenerated locally.');
  }

  async function refreshFromApi() {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await getGrid(gridSize);
      setGrid(response.grid);
      setPossibleWordCount(response.possible_word_count ?? null);
    } catch {
      setErrorMessage('Failed to refresh grid from the server.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
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
            if (selectedPositions.length < 3) {
              setErrorMessage('Select at least 3 letters.');
              resetSelection();
              return;
            }

            setErrorMessage(null);
            resetSelection();
          }
        }}
      >
        <View style={styles.gridCard}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#365314" />
            </View>
          ) : (
            grid.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={[styles.gridRow, { gap: 6 }]}>
                {row.map((letter, colIndex) => (
                  <View
                    key={`tile-${rowIndex}-${colIndex}`}
                    style={[
                      styles.tile,
                      { width: tileSize, height: tileSize },
                      selectedPositions.some((pos) => pos.row === rowIndex && pos.col === colIndex)
                        ? styles.tileSelected
                        : null,
                    ]}
                  >
                    <Text style={styles.tileText}>{letter}</Text>
                  </View>
                ))}
              </View>
            ))
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefce8',
    padding: 20,
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
  },
  gridCard: {
    marginTop: 24,
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
    marginTop: 16,
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
