import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

type LevelOption = {
  label: string;
  gridSize: number;
  tone: string;
  subLabel: string;
};

const LEVELS: LevelOption[] = [
  { label: 'Hard', gridSize: 6, tone: '#dc2626', subLabel: '6x6 grid' },
  { label: 'Medium', gridSize: 8, tone: '#f59e0b', subLabel: '8x8 grid' },
  { label: 'Easy', gridSize: 10, tone: '#16a34a', subLabel: '10x10 grid' },
];

export default function NewGameScreen() {
  function selectGrid(level: LevelOption) {
    router.push({
      pathname: '/move-count',
      params: {
        gridSize: String(level.gridSize),
      },
    } as never);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Game</Text>
      <Text style={styles.subtitle}>Choose a grid size</Text>

      <View style={styles.cardList}>
        {LEVELS.map((level) => (
          <Pressable key={level.gridSize} style={styles.card} onPress={() => selectGrid(level)}>
            <View>
              <Text style={[styles.cardTitle, { color: level.tone }]}>{level.label}</Text>
              <Text style={styles.cardSubtitle}>{level.subLabel}</Text>
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
    borderColor: '#fef08a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
  },
  cardArrow: {
    fontSize: 18,
    color: '#64748b',
  },
});
