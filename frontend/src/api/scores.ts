import { apiClient } from '@/src/api/client';

export type SaveScorePayload = {
  user_id: string;
  username: string;
  grid_size: number;
  total_score: number;
  word_count: number;
  longest_word: string;
  duration_seconds: number;
};

export type ScoreSummary = {
  total_games: number;
  highest_score: number;
  average_score: number;
  total_words: number;
  longest_word: string;
  total_duration_seconds: number;
};

export async function saveScore(payload: SaveScorePayload) {
  const response = await apiClient.post('/scores', payload);
  return response.data;
}

export async function getScoreSummary(userId: string): Promise<ScoreSummary> {
  const response = await apiClient.get<ScoreSummary>(`/scores/${userId}/summary`);
  return response.data;
}

export async function getScoreHistory(userId: string) {
  const response = await apiClient.get(`/scores/${userId}`);
  return response.data;
}
