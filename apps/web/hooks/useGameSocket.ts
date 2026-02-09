/**
 * Hook principal pour gérer la connexion Socket.io et les événements du jeu
 * Synchronise automatiquement avec le store Zustand
 * VERSION CORRIGÉE - Actions uniquement
 */

import { useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../stores/gameStore';
import type { GameSettings } from '../../../packages/shared/types';

/**
 * Hook pour gérer toutes les actions Socket.io du jeu
 */
export function useGameSocket() {
  // On utilise le store pour l'état réactif
  const isConnected = useGameStore((state) => state.isConnected);

  // Instance socket (singleton)
  const socket = getSocket();

  // === ACTIONS (fonctions helper pour émettre des événements) ===

  const createRoom = useCallback(
    (pseudo: string, avatarUrl?: string, settings?: Partial<GameSettings>) => {
      if (!socket) {
        console.error('❌ Socket non initialisé');
        return;
      }

      console.log('📤 Émission create_room:', pseudo);
      // On connecte manuellement si besoin (cas edge)
      if (!socket.connected) socket.connect();
      socket.emit('create_room', { pseudo, avatarUrl, settings });
    },
    [socket]
  );

  const joinRoom = useCallback((roomCode: string, pseudo: string, avatarUrl?: string) => {
    if (!socket) {
      console.error('❌ Socket non initialisé');
      return;
    }

    console.log('📤 Émission join_room:', roomCode, pseudo);
    if (!socket.connected) socket.connect();
    socket.emit('join_room', { roomCode, pseudo, avatarUrl });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    socket.emit('leave_room');
    // Le reset est géré par les listeners ou le composant
  }, [socket]);

  const kickPlayer = useCallback((playerId: string) => {
    if (!socket) return;
    socket.emit('kick_player', { playerId });
  }, [socket]);

  const toggleReady = useCallback(() => {
    if (!socket) return;
    socket.emit('toggle_ready');
  }, [socket]);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    if (!socket) return;
    socket.emit('update_settings', settings);
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket) return;
    console.log('📤 Émission start_game');
    socket.emit('start_game');
  }, [socket]);

  const submitAnswer = useCallback((answer: string) => {
    if (!socket) return;
    const timestamp = Date.now();
    socket.emit('submit_answer', { answer, timestamp });
  }, [socket]);

  const sendMessage = useCallback((message: string) => {
    if (!socket) return;
    socket.emit('send_message', { message });
  }, [socket]);

  return {
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    kickPlayer,
    toggleReady,
    updateSettings,
    startGame,
    submitAnswer,
    sendMessage,

    // État de connexion (réactif via store)
    isConnected,
    socket,
  };
}
