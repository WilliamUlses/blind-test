/*
 * Types et constantes partagés entre le frontend et le backend
 * Support des réponses multiples avec cooldown de 2s sur erreur
 */

// ========================
// ENTITÉS DE BASE
// ========================

/**
 * Représente un joueur dans une partie
 */
export interface Player {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
  isReady: boolean;
  isActive: boolean; // Connecté ou déconnecté
  score: number;     // Score cumulé de la partie
  streak: number;    // Nombre de bonnes réponses consécutives
  hasAnsweredCorrectly: boolean; // Obsolète (gardé pour compatibilité) -> utiliser foundArtist && foundTitle
  foundArtist: boolean; // A trouvé l'artiste
  foundTitle: boolean; // A trouvé le titre
  cooldownUntil: number | null; // Timestamp jusqu'auquel le joueur est en cooldown (null si pas de cooldown)
  hasVotedToPause: boolean; // A voté pour mettre en pause
}

/**
 * État global d'une room
 */
export interface RoomState {
  code: string;
  hostId: string;
  status: GamePhase;
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  totalRounds: number;
  isPaused: boolean;
}

/**
 * Configuration d'une partie
 */
export interface GameSettings {
  totalRounds: number;
  maxPlayers: number;
  roundDurationMs: number;    // default: 30000
  revealDurationMs: number;   // default: 5000
  genre: string | null;       // Filtre musical (pop, rock, rap...)
  acceptArtistOnly: boolean;  // Accepter juste l'artiste comme réponse valide
  acceptTitleOnly: boolean;   // Accepter juste le titre comme réponse valide
  wrongAnswerCooldownMs: number; // Cooldown après une mauvaise réponse (default: 2000)
  difficulty?: 'easy' | 'medium' | 'hard'; // Preset (cosmetic, actual values in other fields)
}

/**
 * Données d'un round envoyées au client
 */
export interface RoundData {
  roundNumber: number;
  previewUrl: string;          // URL audio Deezer
  totalRounds: number;
  startTimestamp: number;      // Date.now() du serveur pour synchronisation
}

/**
 * Résultats d'un round après sa fin
 */
export interface RoundResult {
  roundNumber: number;
  trackTitle: string;
  artistName: string;
  albumCover: string;
  playerResults: PlayerRoundResult[];
}

/**
 * Résultat individuel d'un joueur pour un round
 */
export interface PlayerRoundResult {
  playerId: string;
  pseudo: string;
  wasCorrect: boolean;
  answeredInMs: number | null; // Temps de réponse en ms (null si pas répondu)
  pointsEarned: number;
  totalScore: number;
  streak: number;
  attemptsCount: number; // Nombre de tentatives faites pendant le round
}

/**
 * Tentative de réponse d'un joueur (pour tracking serveur)
 */
export interface AnswerAttempt {
  playerId: string;
  answer: string;
  timestamp: number;
  wasCorrect: boolean;
  timeTakenMs: number;
}

// ========================
// PHASES DU JEU (State Machine)
// ========================

/**
 * Les différentes phases du jeu dans la state machine
 * WAITING → COUNTDOWN → PLAYING → REVEAL → (retour COUNTDOWN ou FINISHED)
 */
export type GamePhase =
  | "WAITING"     // Lobby, en attente de joueurs
  | "COUNTDOWN"   // Compte à rebours "3, 2, 1, GO!"
  | "PLAYING"     // Musique en cours, les joueurs répondent
  | "REVEAL"      // Affichage de la réponse + scores du round
  | "FINISHED";   // Partie terminée, podium final

// ========================
// ÉVÉNEMENTS SOCKET.IO
// ========================

/**
 * Événements émis par le client vers le serveur
 */
export interface ClientToServerEvents {
  // Room Management
  create_room: (data: {
    pseudo: string;
    avatarUrl?: string;
    settings?: Partial<GameSettings>
  }) => void;

  join_room: (data: {
    roomCode: string;
    pseudo: string;
    avatarUrl?: string
  }) => void;

  leave_room: () => void;

  kick_player: (data: { playerId: string }) => void;

  toggle_ready: () => void;

  update_settings: (data: Partial<GameSettings>) => void;

  toggle_pause: () => void;

  // Game Flow
  start_game: () => void;

  /**
   * Soumettre une réponse (peut être appelé plusieurs fois par round)
   * Le serveur gère le cooldown de 2s après chaque mauvaise réponse
   */
  submit_answer: (data: { answer: string; timestamp: number }) => void;

  request_next_round: () => void; // Host only

  // Chat
  send_message: (data: { message: string }) => void;
}

/**
 * Événements émis par le serveur vers les clients
 */
export interface ServerToClientEvents {
  // Room Management
  room_created: (data: { roomCode: string; roomState: RoomState }) => void;

  room_joined: (data: { roomState: RoomState }) => void;

  room_updated: (data: { roomState: RoomState }) => void;

  player_joined: (data: { player: Player }) => void;

  player_left: (data: { playerId: string; newHostId?: string }) => void;

  player_kicked: (data: { playerId: string }) => void;

  // Game Flow
  countdown_start: (data: { countdownMs: number }) => void;

  round_start: (data: RoundData) => void;

  /**
   * Résultat de la réponse soumise par le joueur
   * Si correct=false, le joueur entre en cooldown de 2s
   */
  answer_result: (data: {
    correct: boolean;
    pointsEarned: number;
    totalScore: number;
    streak: number;
    foundPart?: 'artist' | 'title' | 'both'; // Partie trouvée
    cooldownUntil?: number; // Timestamp jusqu'auquel le joueur est en cooldown (si mauvaise réponse)
  }) => void;

  /**
   * Notification quand un joueur trouve la bonne réponse
   * Permet d'afficher "X a trouvé!" dans l'UI
   */
  player_found: (data: {
    playerId: string;
    pseudo: string;
    position: number; // Position (1er, 2ème, 3ème...)
    timeTakenMs: number;
  }) => void;

  round_end: (data: RoundResult) => void;

  game_over: (data: {
    finalScores: Player[];
    podium: Player[]; // Top 3
  }) => void;

  // Synchronisation
  /**
   * Événement de synchronisation du temps serveur
   * Permet de corriger le drift côté client
   */
  time_sync: (data: { serverTime: number }) => void;

  // Chat
  new_message: (data: {
    playerId: string;
    pseudo: string;
    message: string;
    timestamp: number
  }) => void;

  // Errors
  error: (data: { code: ErrorCode; message: string }) => void;
}

// ========================
// CODES D'ERREUR
// ========================

/**
 * Codes d'erreur possibles retournés par le serveur
 */
export type ErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NOT_HOST"
  | "NOT_ENOUGH_PLAYERS"
  | "ALREADY_ANSWERED"      // Le joueur a déjà répondu correctement ce round
  | "ANSWER_COOLDOWN"       // Le joueur est en cooldown (2s après mauvaise réponse)
  | "ROUND_EXPIRED"
  | "INVALID_PSEUDO"
  | "RATE_LIMITED"
  | "PLAYER_NOT_IN_ROOM"
  | "INVALID_ROOM_CODE"
  | "SERVER_ERROR";

/**
 * Messages d'erreur lisibles par l'utilisateur
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND: "Cette room n'existe pas ou a expiré.",
  ROOM_FULL: "La room est pleine (maximum 8 joueurs).",
  GAME_ALREADY_STARTED: "La partie est déjà en cours.",
  NOT_HOST: "Seul l'hôte peut effectuer cette action.",
  NOT_ENOUGH_PLAYERS: "Il faut au moins 2 joueurs pour commencer.",
  ALREADY_ANSWERED: "Tu as déjà trouvé la bonne réponse pour ce round !",
  ANSWER_COOLDOWN: "Attends un peu avant de répondre à nouveau...",
  ROUND_EXPIRED: "Le temps est écoulé pour ce round.",
  INVALID_PSEUDO: "Le pseudo doit faire entre 2 et 20 caractères.",
  RATE_LIMITED: "Doucement ! Réessaie dans quelques secondes.",
  PLAYER_NOT_IN_ROOM: "Tu n'es pas dans cette room.",
  INVALID_ROOM_CODE: "Code de room invalide.",
  SERVER_ERROR: "Une erreur serveur est survenue."
};

// ========================
// CONSTANTES DU JEU
// ========================

/**
 * Constantes globales du jeu
 * Toutes les valeurs numériques doivent être définies ici (pas de magic numbers)
 */
export const GAME_CONSTANTS = {
  // Durées (en millisecondes)
  ROUND_DURATION_MS: 30_000,      // 30 secondes par round
  REVEAL_DURATION_MS: 5_000,      // 5 secondes pour afficher le résultat
  COUNTDOWN_MS: 3_000,            // 3 secondes de compte à rebours
  WRONG_ANSWER_COOLDOWN_MS: 2_000, // 2 secondes de cooldown après mauvaise réponse
  TIME_SYNC_INTERVAL_MS: 5_000,   // Sync du temps serveur toutes les 5s
  ROOM_EXPIRATION_MS: 30 * 60 * 1000, // 30 minutes d'inactivité = room supprimée
  RECONNECTION_WINDOW_MS: 60_000, // 60 secondes pour se reconnecter

  // Limites joueurs
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,

  // Limites rounds
  DEFAULT_ROUNDS: 10,
  MIN_ROUNDS: 3,
  MAX_ROUNDS: 30,

  // Scoring - Les points reward la rapidité et la régularité
  BASE_POINTS: 1000,
  TIME_BONUS_MULTIPLIER: 2,    // Points bonus = (temps restant / temps total) × multiplier × base
  STREAK_BONUS: [0, 0, 100, 200, 300, 500], // Bonus par streak: 0, 0, +100, +200, +300, +500
  FIRST_FINDER_BONUS: 200,     // Bonus pour le premier à trouver
  SECOND_FINDER_BONUS: 100,    // Bonus pour le deuxième
  THIRD_FINDER_BONUS: 50,      // Bonus pour le troisième

  // Validation des réponses
  FUZZY_THRESHOLD: 0.75,       // Seuil de similarité Levenshtein (0-1, 1 = identique)
  MAX_ANSWER_LENGTH: 100,      // Longueur maximale d'une réponse

  // Room codes
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_PREFIX: "BT",      // Ex: "BT-7K3F"

  // Validation inputs
  MIN_PSEUDO_LENGTH: 2,
  MAX_PSEUDO_LENGTH: 20,
  MAX_MESSAGE_LENGTH: 200,

  // Rate limiting
  MAX_MESSAGES_PER_SECOND: 3,
  MAX_ANSWER_ATTEMPTS_PER_ROUND: 50, // Limite de sécurité pour éviter le spam
} as const;

/**
 * Type helper pour extraire les valeurs des constantes
 */
export type GameConstants = typeof GAME_CONSTANTS;

// ========================
// TYPES UTILITAIRES
// ========================

/**
 * Données nécessaires pour calculer le score d'un joueur
 */
export interface ScoreCalculationData {
  timeTakenMs: number;
  roundDurationMs: number;
  currentStreak: number;
  position: number; // Position de réponse (1 = premier, 2 = deuxième, etc.)
}

/**
 * Résultat du calcul de score
 */
export interface ScoreResult {
  basePoints: number;
  timeBonus: number;
  streakBonus: number;
  positionBonus: number;
  totalPoints: number;
}

/**
 * Configuration du matching fuzzy pour valider les réponses
 */
export interface FuzzyMatchConfig {
  threshold: number;
  normalizeAccents: boolean;
  normalizeCasing: boolean;
  removeArticles: boolean;
}
