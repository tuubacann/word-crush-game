import { apiClient } from '@/src/api/client';

type CreateUserResponse = {
  message: string;
  user_id: string;
};

type UserResponse = {
  _id: string;
  username: string;
  gold: number;
  jokers?: string[];
};

export async function createUser(username: string): Promise<CreateUserResponse> {
  const response = await apiClient.post<CreateUserResponse>('/users', username);
  return response.data;
}

export async function getUser(userId: string): Promise<UserResponse> {
  const response = await apiClient.get<UserResponse>(`/users/${userId}`);
  return response.data;
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  await apiClient.put(`/users/${userId}`, username);
}
