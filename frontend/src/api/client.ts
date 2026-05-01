import axios from 'axios';

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
