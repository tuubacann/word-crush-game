import { apiClient } from '@/src/api/client';

type CheckWordResult = {
  valid: boolean;
  message?: string;
  word?: string;
  score?: number;
  combos?: string[];
  combo_score?: number;
  total_score?: number;
};

export async function validateWord(word: string): Promise<CheckWordResult> {
  const letters = word.toUpperCase().split('');
  const response = await apiClient.post<CheckWordResult>('/game/check-word', letters);
  return response.data;
}
