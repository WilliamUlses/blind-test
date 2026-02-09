/**
 * Middleware de rate limiting pour Socket.io
 * Gère la limitation du nombre de requêtes par utilisateur
 * Le cooldown de 2s après mauvaise réponse est géré dans le GameManager
 */

import { Socket } from 'socket.io';
import { GAME_CONSTANTS } from '../../../../packages/shared/types';

/**
 * Structure pour tracker les tentatives d'un utilisateur
 */
interface RateLimitEntry {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

/**
 * Map pour tracker les tentatives par socket et par événement
 * Key: `${socketId}:${eventName}`
 */
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Map pour tracker les tentatives de réponse par round
 * Key: `${socketId}:${roomCode}:${roundNumber}`
 */
const answerAttemptsMap = new Map<string, number>();

/**
 * Nettoie les anciennes entrées du rate limit
 * Appelé périodiquement pour éviter les fuites mémoire
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  const expirationTime = 60_000; // 1 minute

  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.lastRequestTime > expirationTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Nettoyage toutes les minutes
setInterval(cleanupOldEntries, 60_000);

/**
 * Vérifie si un socket a dépassé la limite de requêtes
 *
 * @param socketId - ID du socket
 * @param eventName - Nom de l'événement
 * @param maxRequests - Nombre maximum de requêtes autorisées
 * @param windowMs - Fenêtre de temps en ms
 * @returns true si la limite est dépassée, false sinon
 */
export function isRateLimited(
  socketId: string,
  eventName: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry) {
    // Première requête
    rateLimitMap.set(key, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
    });
    return false;
  }

  // Si la fenêtre de temps est dépassée, reset le compteur
  if (now - entry.firstRequestTime > windowMs) {
    rateLimitMap.set(key, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
    });
    return false;
  }

  // Incrémenter le compteur
  entry.count++;
  entry.lastRequestTime = now;

  // Vérifier la limite
  return entry.count > maxRequests;
}

/**
 * Reset le rate limit pour un socket et un événement
 */
export function resetRateLimit(socketId: string, eventName: string): void {
  const key = `${socketId}:${eventName}`;
  rateLimitMap.delete(key);
}

/**
 * Middleware pour les messages chat
 * Limite à MAX_MESSAGES_PER_SECOND messages par seconde
 */
export function rateLimitChatMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const maxMessages = GAME_CONSTANTS.MAX_MESSAGES_PER_SECOND;
  const windowMs = 1000; // 1 seconde

  if (isRateLimited(socket.id, 'send_message', maxMessages, windowMs)) {
    return next(new Error('RATE_LIMITED'));
  }

  next();
}

/**
 * Incrémente le compteur de tentatives de réponse pour un round
 *
 * @param socketId - ID du socket
 * @param roomCode - Code de la room
 * @param roundNumber - Numéro du round
 * @returns Le nombre de tentatives après incrémentation
 */
export function incrementAnswerAttempts(
  socketId: string,
  roomCode: string,
  roundNumber: number
): number {
  const key = `${socketId}:${roomCode}:${roundNumber}`;
  const current = answerAttemptsMap.get(key) || 0;
  const newCount = current + 1;

  answerAttemptsMap.set(key, newCount);
  return newCount;
}

/**
 * Récupère le nombre de tentatives de réponse pour un round
 */
export function getAnswerAttempts(
  socketId: string,
  roomCode: string,
  roundNumber: number
): number {
  const key = `${socketId}:${roomCode}:${roundNumber}`;
  return answerAttemptsMap.get(key) || 0;
}

/**
 * Reset les tentatives de réponse pour un round
 */
export function resetAnswerAttempts(roomCode: string, roundNumber: number): void {
  // Nettoyer toutes les tentatives pour ce round
  const prefix = `:${roomCode}:${roundNumber}`;

  for (const key of answerAttemptsMap.keys()) {
    if (key.endsWith(prefix)) {
      answerAttemptsMap.delete(key);
    }
  }
}

/**
 * Vérifie si un joueur a dépassé la limite de tentatives pour un round
 * Sécurité anti-spam
 */
export function hasExceededAnswerAttempts(
  socketId: string,
  roomCode: string,
  roundNumber: number
): boolean {
  const attempts = getAnswerAttempts(socketId, roomCode, roundNumber);
  return attempts >= GAME_CONSTANTS.MAX_ANSWER_ATTEMPTS_PER_ROUND;
}

/**
 * Classe RateLimiter pour encapsuler la logique
 */
export class RateLimiter {
  /**
   * Vérifie le rate limit pour un événement générique
   */
  check(
    socketId: string,
    eventName: string,
    maxRequests: number = 10,
    windowMs: number = 1000
  ): boolean {
    return isRateLimited(socketId, eventName, maxRequests, windowMs);
  }

  /**
   * Reset le rate limit pour un événement
   */
  reset(socketId: string, eventName: string): void {
    resetRateLimit(socketId, eventName);
  }

  /**
   * Track une tentative de réponse
   */
  trackAnswerAttempt(socketId: string, roomCode: string, roundNumber: number): number {
    return incrementAnswerAttempts(socketId, roomCode, roundNumber);
  }

  /**
   * Vérifie si la limite de tentatives est dépassée
   */
  checkAnswerLimit(socketId: string, roomCode: string, roundNumber: number): boolean {
    return hasExceededAnswerAttempts(socketId, roomCode, roundNumber);
  }

  /**
   * Reset les tentatives pour un round
   */
  resetRound(roomCode: string, roundNumber: number): void {
    resetAnswerAttempts(roomCode, roundNumber);
  }

  /**
   * Nettoie toutes les données
   */
  clear(): void {
    rateLimitMap.clear();
    answerAttemptsMap.clear();
  }
}

// Export d'une instance par défaut
export const defaultRateLimiter = new RateLimiter();
