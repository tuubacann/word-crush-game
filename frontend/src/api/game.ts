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
};

export async function startGame(payload: StartGamePayload): Promise<StartGameResponse> {
  const response = await apiClient.post<StartGameResponse>('/game/start', payload);
  return response.data;
}

export async function getGrid(size: number) {
  const response = await apiClient.get('/game/grid', { params: { size } });
  return response.data;
}
