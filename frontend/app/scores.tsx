import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { getScoreHistory, getScoreSummary, ScoreSummary } from '@/src/api/scores';
import { loadSession } from '@/src/utils/storage';

type GameScore = {
  grid_size: number;
  total_score: number;
  word_count: number;
  longest_word: string;
  longest_word_score: number;
  duration_seconds: number;
};

export default function ScoresScreen() {
  const [summary, setSummary] = useState<ScoreSummary | null>(null);
  const [history, setHistory] = useState<GameScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScores = useCallback(async (userId: string) => {
    try {
      const [summaryData, historyData] = await Promise.all([
        getScoreSummary(userId),
        getScoreHistory(userId)
      ]);
      setSummary(summaryData);
      setHistory(historyData.reverse()); // Sort newest first, assuming backend returns chronological
    } catch {
      // Handle error gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const session = await loadSession();
      if (!session) {
        router.replace('/onboarding');
        return;
      }
      fetchScores(session.userId);
    }
    init();
  }, [fetchScores]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Scores</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#365314" style={{ marginTop: 40 }} />
      ) : (
        <>
          {summary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              
              <View style={styles.summaryRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Games</Text>
                  <Text style={styles.statValue}>{summary.total_games}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>High Score</Text>
                  <Text style={styles.statValue}>{summary.highest_score}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Avg Score</Text>
                  <Text style={styles.statValue}>{summary.average_score}</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Words</Text>
                  <Text style={styles.statValue}>{summary.total_words}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Play Time</Text>
                  <Text style={styles.statValue}>{formatDuration(summary.total_duration_seconds)}</Text>
                </View>
              </View>

              {summary.longest_word ? (
                <View style={styles.longestWordBox}>
                  <Text style={styles.statLabel}>Longest Word</Text>
                  <Text style={styles.longestWordValue}>{summary.longest_word}</Text>
                </View>
              ) : null}
            </View>
          )}

          <Text style={styles.historyTitle}>Game History</Text>

          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No games played yet. Go crush some words!</Text>
            </View>
          ) : (
            <View style={styles.historyContainer}>
              {history.map((game, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyGameNum}>Game #{history.length - index}</Text>
                    <View style={styles.gridBadge}>
                      <Text style={styles.gridBadgeText}>{game.grid_size}x{game.grid_size}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.historyStats}>
                    <View style={styles.historyStatBox}>
                      <Text style={styles.historyStatLabel}>Score</Text>
                      <Text style={styles.historyStatScore}>{game.total_score}</Text>
                    </View>
                    <View style={styles.historyStatBox}>
                      <Text style={styles.historyStatLabel}>Words</Text>
                      <Text style={styles.historyStatValue}>{game.word_count}</Text>
                    </View>
                    <View style={styles.historyStatBox}>
                      <Text style={styles.historyStatLabel}>Duration</Text>
                      <Text style={styles.historyStatValue}>{formatDuration(game.duration_seconds)}</Text>
                    </View>
                  </View>
                  
                  {game.longest_word ? (
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyStatLabel}>Longest:</Text>
                      <Text style={styles.historyLongestText}>{game.longest_word} ({game.longest_word_score} pts)</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fefce8',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '900',
    color: '#365314',
  },
  summaryCard: {
    backgroundColor: '#15803d',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#dcfce7',
    fontWeight: '700',
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  longestWordBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  longestWordValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '900',
    color: '#facc15',
    letterSpacing: 2,
  },
  historyTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyGameNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  gridBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gridBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  historyStatBox: {
    alignItems: 'center',
  },
  historyStatLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  historyStatScore: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
  },
  historyStatValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyLongestText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f766e',
  },
  backButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
});
