/**
 * Handler des événements Socket.io liés au gameplay
 * Gère start_game, submit_answer, etc.
 */

import { Socket, Server } from 'socket.io';
import { GameManager } from '../services/GameManager';
import { ERROR_MESSAGES, GAME_CONSTANTS, type ErrorCode } from '../../../../packages/shared/types';
import { defaultRateLimiter, isRateLimited } from '../middlewares/rateLimiter';

/**
 * Map des GameManagers par code de room
 * En production, cela devrait être dans un store plus robuste (Redis, etc.)
 */
const gameManagers = new Map<string, GameManager>();

/**
 * Crée un nouveau GameManager pour une room
 */
export function createGameManager(roomCode: string, io: Server, initialState: any): GameManager {
  const manager = new GameManager(roomCode, io, initialState);
  gameManagers.set(roomCode, manager);
  return manager;
}

/**
 * Supprime un GameManager
 */
export function deleteGameManager(roomCode: string): void {
  const manager = gameManagers.get(roomCode);
  if (manager) {
    manager.cleanup();
    gameManagers.delete(roomCode);
  }
}

/**
 * Envoie une erreur au client
 */
function sendError(socket: Socket, code: ErrorCode, customMessage?: string): void {
  socket.emit('error', {
    code,
    message: customMessage || ERROR_MESSAGES[code],
  });
}

/**
 * Configure les handlers de gameplay pour un socket
 */
export function setupGameHandlers(socket: Socket, io: Server): void {
  /**
   * Démarrer une partie (host only)
   */
  socket.on('start_game', async () => {
    try {
      const roomCode = getRoomCodeFromSocket(socket);
      if (!roomCode) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const result = await manager.startGame(socket.data.playerId);

      if (!result.success) {
        return sendError(socket, result.error as ErrorCode);
      }

      // Le manager émet automatiquement les événements nécessaires
    } catch (error) {
      console.error('Error in start_game:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Soumettre une réponse
   * Supporte les réponses multiples avec cooldown de 2s après erreur
   */
  socket.on('submit_answer', async (data: { answer: string; timestamp: number }) => {
    try {
      const { answer, timestamp } = data;

      // Validation de base
      if (!answer || typeof answer !== 'string' || !answer.trim()) {
        return sendError(socket, 'RATE_LIMITED', 'Réponse invalide');
      }

      if (answer.length > GAME_CONSTANTS.MAX_ANSWER_LENGTH) {
        return sendError(socket, 'RATE_LIMITED', 'Réponse trop longue');
      }

      const roomCode = getRoomCodeFromSocket(socket);
      if (!roomCode) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const playerId = socket.data.playerId;
      if (!playerId) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      // Vérifier le rate limiting anti-spam
      const currentRound = manager.getState().currentRound;
      if (defaultRateLimiter.checkAnswerLimit(socket.id, roomCode, currentRound)) {
        return sendError(socket, 'RATE_LIMITED', 'Trop de tentatives de réponse');
      }

      // Tracker la tentative
      defaultRateLimiter.trackAnswerAttempt(socket.id, roomCode, currentRound);

      // Soumettre la réponse au GameManager
      const result = await manager.submitAnswer(playerId, answer, timestamp);

      if (!result.success) {
        return sendError(socket, result.error as ErrorCode);
      }

      // Le manager émet automatiquement les événements answer_result et player_found
    } catch (error) {
      console.error('Error in submit_answer:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Toggle pause (vote-based)
   */
  socket.on('toggle_pause', () => {
    try {
      const roomCode = getRoomCodeFromSocket(socket);
      if (!roomCode) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const playerId = socket.data.playerId;
      if (!playerId) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      manager.togglePauseVote(playerId);
    } catch (error) {
      console.error('Error in toggle_pause:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Retourner au lobby après une partie terminée (host only)
   */
  socket.on('return_to_lobby', () => {
    try {
      const roomCode = getRoomCodeFromSocket(socket);
      if (!roomCode) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const state = manager.getState();

      if (socket.data.playerId !== state.hostId) {
        return sendError(socket, 'NOT_HOST');
      }

      if (state.status !== 'FINISHED') {
        return sendError(socket, 'SERVER_ERROR', 'La partie n\'est pas terminée');
      }

      manager.resetForNewGame();
      // resetForNewGame() calls emitRoomUpdate() which broadcasts to all clients
    } catch (error) {
      console.error('Error in return_to_lobby:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Envoyer un emote (réaction emoji)
   */
  socket.on('send_emote', (data: { emote: string }) => {
    try {
      const { emote } = data;

      // Validate emote
      if (!emote || !GAME_CONSTANTS.VALID_EMOTES.includes(emote)) {
        return;
      }

      const roomCode = getRoomCodeFromSocket(socket);
      if (!roomCode) return;

      const playerId = socket.data.playerId;
      const pseudo = socket.data.pseudo;
      if (!playerId || !pseudo) return;

      // Rate limit: 5 emotes per 10s
      if (isRateLimited(socket.id, 'send_emote', 5, 10_000)) {
        return;
      }

      // Broadcast to room
      io.to(roomCode).emit('emote_received', {
        playerId,
        pseudo,
        emote,
      });
    } catch (error) {
      console.error('Error in send_emote:', error);
    }
  });

}

/**
 * Récupère le code de room depuis le socket
 */
function getRoomCodeFromSocket(socket: Socket): string | null {
  // Le socket doit avoir rejoint une room
  // On utilise socket.data.roomCode ou on cherche dans les rooms
  return socket.data.roomCode || null;
}

/**
 * Export de la map des GameManagers
 */
export { gameManagers };
