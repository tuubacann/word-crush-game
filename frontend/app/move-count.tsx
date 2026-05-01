import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

type MoveOption = {
  moves: number;
  label: string;
};

const MOVE_OPTIONS: MoveOption[] = [
  { moves: 15, label: '15 moves' },
  { moves: 20, label: '20 moves' },
  { moves: 25, label: '25 moves' },
];

export default function MoveCountScreen() {
  const params = useLocalSearchParams<{ gridSize?: string }>();
  const gridSize = Number(params.gridSize ?? '8');
  const recommendedMoves = gridSize === 6 ? 15 : gridSize === 8 ? 20 : 25;

  function selectMoves(moves: number) {
    router.push({
      pathname: '/game',
      params: {
        gridSize: String(gridSize),
        moveCount: String(moves),
      },
    } as never);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moves</Text>
      <Text style={styles.subtitle}>Choose how many moves you want</Text>

      <View style={styles.cardList}>
        {MOVE_OPTIONS.map((option) => (
          <Pressable key={option.moves} style={styles.card} onPress={() => selectMoves(option.moves)}>
            <View>
              <Text style={styles.cardTitle}>{option.label}</Text>
              {option.moves === recommendedMoves ? (
                <Text style={styles.cardHint}>Recommended for {gridSize}x{gridSize}</Text>
              ) : (
                <Text style={styles.cardHint}>Tap to select</Text>
              )}
            </View>
            <Text style={styles.cardArrow}>{'>'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
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
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: '#65a30d',
  },
  cardList: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  cardHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  cardArrow: {
    fontSize: 18,
    color: '#64748b',
  },
});
