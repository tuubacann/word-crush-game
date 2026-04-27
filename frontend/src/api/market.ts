import { apiClient } from '@/src/api/client';
import { getUser } from '@/src/api/user';

export type JokerItem = {
  id: string;
  name: string;
  cost: number;
  description: string;
};

type BuyJokerRequest = {
  user_id: string;
  joker_id: string;
};

type BuyJokerResponse = {
  message: string;
  joker: JokerItem;
  remaining_gold: number;
};

export async function getJokers(): Promise<JokerItem[]> {
  const response = await apiClient.get<JokerItem[]>('/market/jokers');
  return response.data;
}

export async function buyJoker(payload: BuyJokerRequest): Promise<BuyJokerResponse> {
  const response = await apiClient.post<BuyJokerResponse>('/market/buy', payload);
  return response.data;
}

export async function getGold(userId: string): Promise<number> {
  const user = await getUser(userId);
  return user.gold;
}

export async function getInventory(userId: string): Promise<string[]> {
  const user = await getUser(userId);
  return user.jokers ?? [];
}
