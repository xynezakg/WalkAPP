import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 👉 PASTE YOUR RENDER URL HERE (e.g. 'https://walkapp-backend.onrender.com')
// If left empty, it will automatically connect to your local PC over Wi-Fi
export const PRODUCTION_SERVER_URL: string = 'https://walkapp-backend-3eqp.onrender.com';

/**
 * Automatically detects your computer's local Wi-Fi IP address
 * when running inside the Expo Go app on a physical phone.
 */
function resolveServerHost(): string {
  if (PRODUCTION_SERVER_URL && PRODUCTION_SERVER_URL.trim().length > 0) {
    return PRODUCTION_SERVER_URL.trim().replace(/\/$/, '');
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:4000`;
    }
  }

  // Fallback for Android emulator or localhost
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

const SERVER_BASE = resolveServerHost();
export const API_BASE_URL = `${SERVER_BASE}/api`;
export const SOCKET_SERVER_URL = SERVER_BASE;

const AUTH_TOKEN_KEY = '@walkapp_jwt_auth_token_v1';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

// Generic Fetch wrapper with automatic Auth Header
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Network request failed');
  }

  return data as T;
}

// Auth API Calls
export const api = {
  register: (body: { username: string; email: string; password: string }) =>
    apiRequest<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { identifier: string; password: string }) =>
    apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => apiRequest<{ user: any }>('/auth/me'),

  // Challenges API Calls
  createChallenge: (body: {
    title: string;
    description?: string;
    targetSteps: number;
    maxPlayers: number;
    visibility: 'public' | 'private';
    rewardPoolCoins: number;
  }) =>
    apiRequest<{ challenge: any; participants: any[] }>('/challenges', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getPublicChallenges: () =>
    apiRequest<{ challenges: any[] }>('/challenges/public'),

  getUserActiveChallenges: () =>
    apiRequest<{ challenges: any[] }>('/challenges/user/active'),

  getChallengeDetails: (idOrCode: string) =>
    apiRequest<{ challenge: any; participants: any[]; photos: any[] }>(`/challenges/${idOrCode}`),

  joinChallenge: (codeOrId: string) =>
    apiRequest<{ message: string; challengeId: string }>('/challenges/join', {
      method: 'POST',
      body: JSON.stringify({ codeOrId }),
    }),

  inviteUser: (challengeId: string, targetUsernameOrId: string) =>
    apiRequest<{ message: string; invitedUser: any }>(`/challenges/${challengeId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ targetUsernameOrId }),
    }),

  uploadCelebrationPhoto: (challengeId: string, photoBase64: string, caption?: string) =>
    apiRequest<{ message: string; photos: any[] }>(`/challenges/${challengeId}/photo`, {
      method: 'POST',
      body: JSON.stringify({ photoBase64, caption }),
    }),

  // Admin API Calls
  getAdminStats: () => apiRequest<{ stats: any }>('/admin/stats'),

  getAdminUsers: () => apiRequest<{ users: any[] }>('/admin/users'),

  toggleAdminBan: (userId: string) =>
    apiRequest<{ message: string; isBanned: boolean }>(`/admin/users/${userId}/toggle-ban`, {
      method: 'POST',
    }),

  adjustAdminCoins: (userId: string, amount: number, reason?: string) =>
    apiRequest<{ message: string; newBalance: number }>(`/admin/users/${userId}/adjust-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    }),

  getAdminChallenges: () => apiRequest<{ challenges: any[] }>('/admin/challenges'),

  deleteAdminChallenge: (challengeId: string) =>
    apiRequest<{ message: string }>(`/admin/challenges/${challengeId}`, {
      method: 'DELETE',
    }),
};
