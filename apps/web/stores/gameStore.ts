/**
 * Store Zustand pour l'état global du jeu
 * Gère l'état de la room, du round en cours, et des informations locales du joueur
 */

import { create } from 'zustand';
import {
  RoomState,
  RoundData,
  RoundResult,
  GamePhase,
} from '../../../packages/shared/types';

/**
 * État local du joueur (informations côté client uniquement)
 */
interface LocalPlayerState {
  id: string | null;
  pseudo: string | null;
  isInCooldown: boolean;
  cooldownEndsAt: number | null;
  hasSubmittedAnswer: boolean; // A soumis une réponse ce round (correcte ou non)
  foundArtist: boolean;
  foundTitle: boolean;
}

/**
 * État du round en cours
 */
interface CurrentRound {
  roundNumber: number;
  previewUrl: string;
  totalRounds: number;
  startTimestamp: number;
  endTimestamp: number;
  timeRemaining: number; // Temps restant en ms (mis à jour par le timer)
}

/**
 * État global du store
 */
interface GameStore {
  // Room state
  roomState: RoomState | null;
  currentRound: CurrentRound | null;
  lastRoundResult: RoundResult | null;

  // Local player state
  localPlayer: LocalPlayerState;

  // Loading & errors
  isConnecting: boolean;
  isConnected: boolean;
  error: { code: string; message: string } | null;

  // Time sync
  serverTimeOffset: number; // Différence entre le temps serveur et local

  // Actions
  setRoomState: (roomState: RoomState) => void;
  setCurrentRound: (roundData: RoundData) => void;
  setTimeRemaining: (timeRemaining: number) => void;
  setLastRoundResult: (result: RoundResult) => void;
  setLocalPlayerId: (id: string, pseudo: string) => void;
  setPlayerCooldown: (cooldownUntil: number) => void;
  clearPlayerCooldown: () => void;
  setHasSubmittedAnswer: (value: boolean) => void;
  setLocalPlayerFoundPart: (part: 'artist' | 'title' | 'both') => void;
  setConnectionStatus: (isConnected: boolean, isConnecting?: boolean) => void;
  setError: (error: { code: string; message: string } | null) => void;
  updateServerTimeOffset: (serverTime: number) => void;
  reset: () => void;

  // Computed helpers
  getCurrentPlayer: () => any;
  getPhase: () => GamePhase | null;
  isHost: () => boolean;
}

/**
 * Valeurs initiales
 */
const initialLocalPlayer: LocalPlayerState = {
  id: null,
  pseudo: null,
  isInCooldown: false,
  cooldownEndsAt: null,
  hasSubmittedAnswer: false,
  foundArtist: false,
  foundTitle: false,
};

/**
 * Crée le store avec Zustand
 */
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  roomState: null,
  currentRound: null,
  lastRoundResult: null,
  localPlayer: initialLocalPlayer,
  isConnecting: false,
  isConnected: false,
  error: null,
  serverTimeOffset: 0,

  // Actions
  setRoomState: (roomState: RoomState) => {
    set({ roomState, error: null });
  },

  setCurrentRound: (roundData: RoundData) => {
    const { roundNumber, previewUrl, totalRounds, startTimestamp } = roundData;
    const { roomState } = get();

    if (!roomState) return;

    const roundDurationMs = roomState.settings.roundDurationMs;
    const endTimestamp = startTimestamp + roundDurationMs;

    set({
      currentRound: {
        roundNumber,
        previewUrl,
        totalRounds,
        startTimestamp,
        endTimestamp,
        timeRemaining: roundDurationMs,
      },
      localPlayer: {
        ...get().localPlayer,
        hasSubmittedAnswer: false,
        isInCooldown: false,
        cooldownEndsAt: null,
        foundArtist: false,
        foundTitle: false,
      },
    });
  },

  setTimeRemaining: (timeRemaining: number) => {
    const { currentRound } = get();
    if (!currentRound) return;

    set({
      currentRound: {
        ...currentRound,
        timeRemaining: Math.max(0, timeRemaining),
      },
    });
  },

  setLastRoundResult: (result: RoundResult) => {
    set({ lastRoundResult: result });
  },

  setLocalPlayerId: (id: string, pseudo: string) => {
    set({
      localPlayer: {
        ...get().localPlayer,
        id,
        pseudo,
      },
    });
  },

  setPlayerCooldown: (cooldownUntil: number) => {
    set({
      localPlayer: {
        ...get().localPlayer,
        isInCooldown: true,
        cooldownEndsAt: cooldownUntil,
      },
    });

    // Auto-clear le cooldown quand il expire
    const cooldownDuration = cooldownUntil - Date.now();
    if (cooldownDuration > 0) {
      setTimeout(() => {
        get().clearPlayerCooldown();
      }, cooldownDuration);
    }
  },

  clearPlayerCooldown: () => {
    set({
      localPlayer: {
        ...get().localPlayer,
        isInCooldown: false,
        cooldownEndsAt: null,
      },
    });
  },

  setHasSubmittedAnswer: (value: boolean) => {
    set({
      localPlayer: {
        ...get().localPlayer,
        hasSubmittedAnswer: value,
      },
    });
  },

  setLocalPlayerFoundPart: (part: 'artist' | 'title' | 'both') => {
    set((state) => ({
      localPlayer: {
        ...state.localPlayer,
        foundArtist: part === 'artist' || part === 'both' ? true : state.localPlayer.foundArtist,
        foundTitle: part === 'title' || part === 'both' ? true : state.localPlayer.foundTitle,
      },
    }));
  },

  setConnectionStatus: (isConnected: boolean, isConnecting = false) => {
    set({ isConnected, isConnecting });
  },

  setError: (error: { code: string; message: string } | null) => {
    set({ error });
  },

  updateServerTimeOffset: (serverTime: number) => {
    const localTime = Date.now();
    const offset = serverTime - localTime;
    set({ serverTimeOffset: offset });
  },

  reset: () => {
    set({
      roomState: null,
      currentRound: null,
      lastRoundResult: null,
      localPlayer: initialLocalPlayer,
      isConnecting: false,
      isConnected: false,
      error: null,
      serverTimeOffset: 0,
    });
  },

  // Computed helpers
  getCurrentPlayer: () => {
    const { roomState, localPlayer } = get();
    if (!roomState || !localPlayer.id) return null;

    return roomState.players.find((p) => p.id === localPlayer.id) || null;
  },

  getPhase: () => {
    const { roomState } = get();
    return roomState?.status || null;
  },

  isHost: () => {
    const { roomState, localPlayer } = get();
    return roomState?.hostId === localPlayer.id;
  },
}));

/**
 * Hooks utilitaires pour accéder à des parties spécifiques du store
 */

export const useRoomState = () => useGameStore((state) => state.roomState);
export const useCurrentRound = () => useGameStore((state) => state.currentRound);
export const useLocalPlayer = () => useGameStore((state) => state.localPlayer);
export const useCurrentPlayer = () => useGameStore((state) => state.getCurrentPlayer());
export const useIsHost = () => useGameStore((state) => state.isHost());
export const useGamePhase = () => useGameStore((state) => state.getPhase());
export const useConnectionStatus = () =>
  useGameStore((state) => ({
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
  }));
export const useGameError = () => useGameStore((state) => state.error);
