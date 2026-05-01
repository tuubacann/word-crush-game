import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function GameScreen() {
  const params = useLocalSearchParams<{ gridSize?: string; moveCount?: string }>();
  const gridSize = Number(params.gridSize ?? '8');
  const moveCount = Number(params.moveCount ?? '20');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Setup</Text>
      <Text style={styles.subtitle}>Grid: {gridSize}x{gridSize}</Text>
      <Text style={styles.subtitle}>Moves: {moveCount}</Text>

      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderText}>Game screen coming next.</Text>
      </View>

      <Pressable style={styles.backButton} onPress={() => router.replace('/home')}>
        <Text style={styles.backButtonText}>Back to Home</Text>
      </Pressable>
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
    fontSize: 16,
    color: '#475569',
  },
  placeholderCard: {
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#64748b',
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
