/**
 * Handler des événements Socket.io liés à la gestion des rooms
 * Gère create_room, join_room, leave_room, etc.
 */

import { Socket, Server } from 'socket.io';
import {
  Player,
  RoomState,
  GameSettings,
  GAME_CONSTANTS,
  ERROR_MESSAGES,
  type ErrorCode,
} from '../../../../packages/shared/types';
import { createGameManager, gameManagers, deleteGameManager } from './gameHandler';

/**
 * Génère un code de room unique
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1 pour éviter confusion
  let code = GAME_CONSTANTS.ROOM_CODE_PREFIX + '-';

  for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

/**
 * Génère un code unique (qui n'existe pas déjà)
 */
function generateUniqueRoomCode(): string {
  let code: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    code = generateRoomCode();
    attempts++;

    if (attempts > maxAttempts) {
      // Fallback: ajouter un timestamp
      code = `${GAME_CONSTANTS.ROOM_CODE_PREFIX}-${Date.now().toString(36).toUpperCase()}`;
      break;
    }
  } while (gameManagers.has(code));

  return code;
}

/**
 * Crée un objet Player à partir des données
 */
function createPlayer(
  playerId: string,
  pseudo: string,
  avatarUrl?: string
): Player {
  return {
    id: playerId,
    pseudo,
    avatarUrl: avatarUrl || null,
    isReady: false,
    isActive: true,
    score: 0,
    streak: 0,
    hasAnsweredCorrectly: false,
    cooldownUntil: null,
    hasVotedToPause: false,
  };
}

/**
 * Valide un pseudo
 */
function validatePseudo(pseudo: string): { valid: boolean; error?: string } {
  if (!pseudo || typeof pseudo !== 'string') {
    return { valid: false, error: 'Le pseudo est requis' };
  }

  const trimmed = pseudo.trim();

  if (trimmed.length < GAME_CONSTANTS.MIN_PSEUDO_LENGTH) {
    return {
      valid: false,
      error: `Le pseudo doit faire au moins ${GAME_CONSTANTS.MIN_PSEUDO_LENGTH} caractères`,
    };
  }

  if (trimmed.length > GAME_CONSTANTS.MAX_PSEUDO_LENGTH) {
    return {
      valid: false,
      error: `Le pseudo ne peut pas dépasser ${GAME_CONSTANTS.MAX_PSEUDO_LENGTH} caractères`,
    };
  }

  return { valid: true };
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
 * Configure les handlers de room pour un socket
 */
export function setupRoomHandlers(socket: Socket, io: Server): void {
  /**
   * Créer une nouvelle room
   */
  socket.on('create_room', async (data: {
    pseudo: string;
    avatarUrl?: string;
    settings?: Partial<GameSettings>;
  }) => {
    try {
      const { pseudo, avatarUrl, settings } = data;

      // Validation du pseudo
      const pseudoValidation = validatePseudo(pseudo);
      if (!pseudoValidation.valid) {
        return sendError(socket, 'INVALID_PSEUDO', pseudoValidation.error);
      }

      // Générer un code unique
      const roomCode = generateUniqueRoomCode();

      // Créer le player (qui sera l'hôte)
      const playerId = socket.id;
      const host = createPlayer(playerId, pseudo.trim(), avatarUrl);

      // Configuration par défaut
      const defaultSettings: GameSettings = {
        totalRounds: GAME_CONSTANTS.DEFAULT_ROUNDS,
        maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
        roundDurationMs: GAME_CONSTANTS.ROUND_DURATION_MS,
        revealDurationMs: GAME_CONSTANTS.REVEAL_DURATION_MS,
        genre: null,
        acceptArtistOnly: false,
        acceptTitleOnly: false,
        wrongAnswerCooldownMs: GAME_CONSTANTS.WRONG_ANSWER_COOLDOWN_MS,
      };

      // Fusionner avec les settings personnalisés
      const finalSettings: GameSettings = { ...defaultSettings, ...settings };

      // État initial de la room
      const initialState: RoomState = {
        code: roomCode,
        hostId: playerId,
        status: 'WAITING',
        players: [host],
        settings: finalSettings,
        currentRound: 0,
        totalRounds: finalSettings.totalRounds,
      };

      // Créer le GameManager
      const manager = createGameManager(roomCode, io, initialState);

      // Joindre le socket à la room Socket.io
      await socket.join(roomCode);

      // Sauvegarder les données dans le socket
      socket.data.roomCode = roomCode;
      socket.data.playerId = playerId;
      socket.data.pseudo = pseudo.trim();

      // Notifier le client
      socket.emit('room_created', {
        roomCode,
        roomState: manager.getState(),
      });

      console.log(`Room ${roomCode} created by ${pseudo}`);
    } catch (error) {
      console.error('Error in create_room:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Rejoindre une room existante
   */
  /**
   * Rejoindre une room existante
   */
  socket.on('join_room', async (data: {
    roomCode: string;
    pseudo: string;
    avatarUrl?: string;
  }) => {
    try {
      const { roomCode, pseudo, avatarUrl } = data;

      // Validation du pseudo
      const pseudoValidation = validatePseudo(pseudo);
      if (!pseudoValidation.valid) {
        return sendError(socket, 'INVALID_PSEUDO', pseudoValidation.error);
      }

      // Validation du code
      if (!roomCode || typeof roomCode !== 'string') {
        return sendError(socket, 'INVALID_ROOM_CODE');
      }

      // Vérifier que la room existe
      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const state = manager.getState();

      // --- LOGIQUE DE RECONNEXION ---
      // Chercher un joueur inactif avec le même pseudo
      const existingPlayer = state.players.find(
        (p) => p.pseudo.toLowerCase() === pseudo.trim().toLowerCase()
      );

      if (existingPlayer) {
        if (!existingPlayer.isActive) {
          // C'est une reconnexion !
          console.log(`Player ${pseudo} reconnecting to ${roomCode}`);

          const oldPlayerId = existingPlayer.id;
          const newPlayerId = socket.id;

          // Mettre à jour le joueur
          existingPlayer.id = newPlayerId;
          existingPlayer.isActive = true;
          if (avatarUrl) existingPlayer.avatarUrl = avatarUrl; // Mettre à jour l'avatar si fourni

          // Si c'était l'hôte, mettre à jour l'hostId de la room
          if (state.hostId === oldPlayerId) {
            state.hostId = newPlayerId;
          }

          // Mettre à jour le state dans le manager
          manager.updateState(state);

          // Joindre le socket
          await socket.join(roomCode);
          socket.data.roomCode = roomCode;
          socket.data.playerId = newPlayerId;
          socket.data.pseudo = pseudo.trim();

          // Notifier le client
          socket.emit('room_joined', { roomState: manager.getState() });

          // Notifier les autres (que le joueur est de retour)
          socket.to(roomCode).emit('player_joined', { player: existingPlayer });

          return; // Succès reconnexion
        } else {
          // Le pseudo est déjà pris par un joueur actif
          return sendError(socket, 'INVALID_PSEUDO', 'Ce pseudo est déjà utilisé dans la partie');
        }
      }

      // --- LOGIQUE STANDARD JOUEUR ---

      // Vérifier que la partie n'a pas déjà commencé
      if (state.status !== 'WAITING') {
        return sendError(socket, 'GAME_ALREADY_STARTED');
      }

      // Vérifier que la room n'est pas pleine
      if (state.players.length >= state.settings.maxPlayers) {
        return sendError(socket, 'ROOM_FULL');
      }

      // Créer le player
      const playerId = socket.id;
      const player = createPlayer(playerId, pseudo.trim(), avatarUrl);

      // Ajouter le joueur
      manager.addPlayer(player);

      // Joindre le socket à la room
      await socket.join(roomCode);

      // Sauvegarder les données dans le socket
      socket.data.roomCode = roomCode;
      socket.data.playerId = playerId;
      socket.data.pseudo = pseudo.trim();

      // Notifier le joueur qui rejoint
      socket.emit('room_joined', {
        roomState: manager.getState(),
      });

      // Notifier tous les autres joueurs
      socket.to(roomCode).emit('player_joined', { player });

      console.log(`${pseudo} joined room ${roomCode}`);
    } catch (error) {
      console.error('Error in join_room:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Quitter la room
   */
  socket.on('leave_room', async () => {
    try {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;

      if (!roomCode || !playerId) {
        return;
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return;
      }

      // Retirer le joueur
      const result = manager.removePlayer(playerId);

      // Quitter la room Socket.io
      await socket.leave(roomCode);

      // Nettoyer les données du socket
      delete socket.data.roomCode;
      delete socket.data.playerId;

      // Notifier les autres joueurs
      socket.to(roomCode).emit('player_left', {
        playerId,
        newHostId: result.newHostId,
      });

      // Si la room est vide, la supprimer
      const state = manager.getState();
      if (state.players.length === 0) {
        deleteGameManager(roomCode);
        console.log(`Room ${roomCode} deleted (empty)`);
      }

      console.log(`Player ${playerId} left room ${roomCode}`);
    } catch (error) {
      console.error('Error in leave_room:', error);
    }
  });

  /**
   * Kick un joueur (host only)
   */
  socket.on('kick_player', async (data: { playerId: string }) => {
    try {
      const roomCode = socket.data.roomCode;
      const hostId = socket.data.playerId;
      const { playerId } = data;

      if (!roomCode || !hostId) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const state = manager.getState();

      // Vérifier que c'est l'hôte
      if (hostId !== state.hostId) {
        return sendError(socket, 'NOT_HOST');
      }

      // Ne pas se kicker soi-même
      if (playerId === hostId) {
        return sendError(socket, 'INVALID_PSEUDO', 'Tu ne peux pas te kicker toi-même');
      }

      // Trouver le socket du joueur à kicker
      const socketsInRoom = await io.in(roomCode).fetchSockets();
      const targetSocket = socketsInRoom.find((s) => s.data.playerId === playerId);

      if (targetSocket) {
        // Notifier le joueur qu'il a été kické
        targetSocket.emit('player_kicked', { playerId });

        // Le faire quitter la room
        await targetSocket.leave(roomCode);
        delete targetSocket.data.roomCode;
        delete targetSocket.data.playerId;
      }

      // Retirer le joueur du manager
      manager.removePlayer(playerId);

      // Notifier les autres
      socket.to(roomCode).emit('player_left', { playerId });

      console.log(`Player ${playerId} kicked from room ${roomCode}`);
    } catch (error) {
      console.error('Error in kick_player:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Toggle le statut ready
   */
  socket.on('toggle_ready', async () => {
    try {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;

      if (!roomCode || !playerId) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      manager.togglePlayerReady(playerId);
      // Le manager émet automatiquement room_updated
    } catch (error) {
      console.error('Error in toggle_ready:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Mettre à jour les paramètres de la room (host only)
   */
  socket.on('update_settings', async (data: Partial<GameSettings>) => {
    try {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;

      if (!roomCode || !playerId) {
        return sendError(socket, 'PLAYER_NOT_IN_ROOM');
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return sendError(socket, 'ROOM_NOT_FOUND');
      }

      const success = manager.updateSettings(playerId, data);
      if (!success) {
        return sendError(socket, 'NOT_HOST');
      }

      // Le manager émet automatiquement room_updated
    } catch (error) {
      console.error('Error in update_settings:', error);
      sendError(socket, 'SERVER_ERROR');
    }
  });

  /**
   * Déconnexion
   */
  socket.on('disconnect', async () => {
    try {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;

      if (!roomCode || !playerId) {
        return;
      }

      const manager = gameManagers.get(roomCode);
      if (!manager) {
        return;
      }

      // Marquer le joueur comme inactif mais ne pas le retirer immédiatement
      // (permet la reconnexion pendant RECONNECTION_WINDOW_MS)
      const state = manager.getState();
      const player = state.players.find((p) => p.id === playerId);

      if (player) {
        player.isActive = false;
        manager.updateState(state);

        // Après le délai de reconnexion, retirer définitivement si toujours inactif
        setTimeout(() => {
          const currentState = manager.getState();
          const currentPlayer = currentState.players.find((p) => p.id === playerId);

          if (currentPlayer && !currentPlayer.isActive) {
            const result = manager.removePlayer(playerId);

            socket.to(roomCode).emit('player_left', {
              playerId,
              newHostId: result.newHostId,
            });

            // Si la room est vide, la supprimer
            if (currentState.players.length === 0) {
              deleteGameManager(roomCode);
              console.log(`Room ${roomCode} deleted (empty after disconnection)`);
            }
          }
        }, GAME_CONSTANTS.RECONNECTION_WINDOW_MS);
      }

      console.log(`Player ${playerId} disconnected from room ${roomCode}`);
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });
}
