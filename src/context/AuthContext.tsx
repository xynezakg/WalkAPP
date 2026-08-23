import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUserProfile,
  setStoredUserProfile,
} from '../services/apiClient';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  coinsBalance: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: UserAccount | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateCoinsBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore stored session on boot
  const checkAuth = useCallback(async () => {
    try {
      const [storedToken, cachedUser] = await Promise.all([
        getStoredToken(),
        getStoredUserProfile(),
      ]);

      if (storedToken) {
        setToken(storedToken);
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Background refresh from server without blocking UI
        try {
          const { user: me } = await api.getMe();
          setUser(me);
          await setStoredUserProfile(me);
        } catch (err: any) {
          // If server explicitly rejected token (401 / 403), logout. Otherwise keep cached user!
          if (err.status === 401 || err.status === 403) {
            await clearStoredToken();
            setToken(null);
            setUser(null);
          } else {
            console.log('Server waking up / offline, keeping cached profile');
          }
        }
      }
    } catch (err) {
      console.log('Session restoration error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ identifier, password: pass });
      await Promise.all([
        setStoredToken(res.token),
        setStoredUserProfile(res.user),
      ]);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.register({ username, email, password: pass });
      await Promise.all([
        setStoredToken(res.token),
        setStoredUserProfile(res.user),
      ]);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const refreshUserProfile = async () => {
    if (!token) return;
    try {
      const { user: me } = await api.getMe();
      setUser(me);
    } catch (e) {
      console.log('Error refreshing user profile:', e);
    }
  };

  const updateCoinsBalance = (newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, coinsBalance: newBalance } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        logout,
        refreshUserProfile,
        updateCoinsBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
