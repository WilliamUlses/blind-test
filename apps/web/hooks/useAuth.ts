'use client';

import { create } from 'zustand';

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export interface AuthUser {
  id: string;
  pseudo: string;
  email: string | null;
  avatarIndex: number;
  avatarUrl: string | null;
  googleId: string | null;
  discordId: string | null;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestScore: number;
  bestStreak: number;
  totalResponseTimeMs: number;
  totalAnswers: number;
  favoriteGenre: string | null;
  dailyStreak: number;
  lastDailyDate: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, pseudo: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: { pseudo?: string; avatarIndex?: number }) => Promise<boolean>;
  clearError: () => void;
}

// Version counter to prevent stale fetchMe from overwriting login/register state
let authVersion = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  fetchMe: async () => {
    const myVersion = ++authVersion;
    try {
      set({ isLoading: true });
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });

      // Abort if login/register/logout happened while we were fetching
      if (myVersion !== authVersion) return;

      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        // Try refresh
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (myVersion !== authVersion) return;

        if (refreshRes.ok) {
          // Retry /me after refresh
          const retryRes = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include',
          });
          if (myVersion !== authVersion) return;
          if (retryRes.ok) {
            const data = await retryRes.json();
            set({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
            return;
          }
        }

        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      if (myVersion !== authVersion) return;
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    ++authVersion; // Invalidate any in-flight fetchMe
    try {
      set({ error: null, isLoading: true });
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        set({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      } else {
        set({ error: data.error || 'Erreur de connexion', isLoading: false });
        return false;
      }
    } catch {
      set({ error: 'Erreur de connexion au serveur', isLoading: false });
      return false;
    }
  },

  register: async (email: string, password: string, pseudo: string) => {
    ++authVersion; // Invalidate any in-flight fetchMe
    try {
      set({ error: null, isLoading: true });
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, pseudo }),
      });

      const data = await res.json();

      if (res.ok) {
        set({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      } else {
        set({ error: data.error || "Erreur d'inscription", isLoading: false });
        return false;
      }
    } catch {
      set({ error: 'Erreur de connexion au serveur', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    ++authVersion; // Invalidate any in-flight fetchMe
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors
    }
    set({ user: null, isAuthenticated: false, error: null });
  },

  updateProfile: async (data: { pseudo?: string; avatarIndex?: number }) => {
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        const current = get().user;
        if (current) {
          set({
            user: {
              ...current,
              pseudo: result.user.pseudo ?? current.pseudo,
              avatarIndex: result.user.avatarIndex ?? current.avatarIndex,
            },
          });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
