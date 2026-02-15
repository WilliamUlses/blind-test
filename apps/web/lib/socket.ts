/**
 * Singleton Socket.io client
 * Instance unique partagée dans toute l'application
 */

import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../../packages/shared/types';

/**
 * URL du serveur Socket.io
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

/**
 * Type du socket avec typage des événements
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Instance singleton du socket
 */
let socketInstance: TypedSocket | null = null;

/**
 * Récupère ou crée l'instance du socket
 * @returns Instance Socket.io typée
 */
export function getSocket(): TypedSocket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false, // On se connecte manuellement
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true, // Send cookies for JWT auth
    });

  }

  return socketInstance;
}

/**
 * Déconnecte et détruit l'instance du socket
 */
export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
  }
}

/**
 * Vérifie si le socket est connecté
 */
export function isSocketConnected(): boolean {
  return socketInstance?.connected || false;
}
