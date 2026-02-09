/**
 * Handler des événements Socket.io liés au gameplay
 * Gère start_game, submit_answer, etc.
 */

import { Socket, Server } from 'socket.io';
import { GameManager } from '../services/GameManager';
import { ERROR_MESSAGES, type ErrorCode } from '../../../../packages/shared/types';
import { defaultRateLimiter } from '../middlewares/rateLimiter';

/**
 * Map des GameManagers par code de room
 * En production, cela devrait être dans un store plus robuste (Redis, etc.)
 */
const gameManagers = new Map<string, GameManager>();

/**
 * Récupère ou crée un GameManager pour une room
 */
export function getOrCreateGameManager(roomCode: string, io: Server, socket: Socket): GameManager | null {
  // Récupérer le GameManager existant
  if (gameManagers.has(roomCode)) {
    return gameManagers.get(roomCode)!;
  }

  // Si pas de GameManager, la room n'existe pas
  return null;
}

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
      if (!answer || typeof answer !== 'string') {
        return sendError(socket, 'INVALID_PSEUDO', 'Réponse invalide');
      }

      if (answer.length > 100) {
        return sendError(socket, 'INVALID_PSEUDO', 'Réponse trop longue');
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
   * Passer au round suivant (host only)
   * Permet à l'hôte de forcer le passage au round suivant si besoin
   */
  socket.on('request_next_round', async () => {
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

      // Cette fonctionnalité pourrait être implémentée dans le GameManager
      // Pour l'instant, on ne fait rien (le flow automatique gère déjà tout)
    } catch (error) {
      console.error('Error in request_next_round:', error);
      sendError(socket, 'SERVER_ERROR');
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
