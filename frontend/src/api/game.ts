import { apiClient } from '@/src/api/client';

export type StartGamePayload = {
  user_id: string;
  username: string;
  grid_size: number;
};

export type StartGameResponse = {
  message: string;
  game_id: string;
  grid_size: number;
  move_count: number;
  score: number;
  grid: string[][];
  possible_word_count?: number;
  possible_words?: string[];
};

export type GridResponse = {
  size: number;
  grid: string[][];
  possible_word_count?: number;
  possible_words?: string[];
};

export type PlayMovePayload = {
  game_id: string;
  letters: string[];
  positions: Array<[number, number]>;
};

export type PlayMoveResponse = {
  valid: boolean;
  message?: string;
  word?: string;
  word_score?: number;
  combos?: string[];
  combo_score?: number;
  score_added?: number;
  total_score?: number;
  move_count?: number;
  game_over?: boolean;
  grid?: string[][];
  possible_word_count?: number;
  possible_words?: string[];
};

export async function startGame(payload: StartGamePayload): Promise<StartGameResponse> {
  const response = await apiClient.post<StartGameResponse>('/game/start', payload);
  return response.data;
}

export async function getGrid(size: number): Promise<GridResponse> {
  const response = await apiClient.get<GridResponse>('/game/grid', { params: { size } });
  return response.data;
}

export async function playMove(payload: PlayMovePayload): Promise<PlayMoveResponse> {
  const response = await apiClient.post<PlayMoveResponse>('/game/move', payload);
  return response.data;
}

export type UseJokerPayload = {
  game_id: string;
  joker_id: string;
  positions?: Array<[number, number]>;
};

export type UseJokerResponse = {
  message: string;
  joker_id: string;
  grid: any[][];
  possible_word_count: number;
  possible_words: string[];
};

export async function useJoker(payload: UseJokerPayload): Promise<UseJokerResponse> {
  const response = await apiClient.post<UseJokerResponse>('/game/use-joker', payload);
  return response.data;
}
