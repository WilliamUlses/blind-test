/*
 * Types et constantes partagés entre le frontend et le backend
 * Support des réponses multiples avec cooldown de 2s sur erreur
 */

// ========================
// GAME MODES
// ========================

export type GameMode = 'blind-test' | 'timeline' | 'buzzer' | 'elimination' | 'intro' | 'lyrics';

/**
 * Carte sur la frise chronologique d'un joueur (mode Timeline)
 */
export interface TimelineCard {
  trackTitle: string;
  artistName: string;
  albumCover: string;
  releaseYear: number;
}

// ========================
// POWER-UPS
// ========================

export type PowerUpType = 'x2' | 'hint' | 'steal' | 'shield';

export interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
}

export const POWER_UP_DEFINITIONS: Record<PowerUpType, PowerUp> = {
  x2: { type: 'x2', name: 'Double', description: 'Double tes points ce round', icon: '✕2' },
  hint: { type: 'hint', name: 'Indice', description: 'Première lettre de l\'artiste ou titre', icon: '💡' },
  steal: { type: 'steal', name: 'Vol', description: 'Vole 200 pts au leader si tu trouves en premier', icon: '🏴‍☠️' },
  shield: { type: 'shield', name: 'Bouclier', description: 'Pas de cooldown ce round', icon: '🛡️' },
};

// ========================
// ÉQUIPES
// ========================

export interface Team {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
  timelineCards?: TimelineCard[]; // Frise partagée de l'équipe (mode Timeline + équipes)
}

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
  userId: string | null; // Authenticated user ID (null for guests)
  isReady: boolean;
  isActive: boolean; // Connecté ou déconnecté
  score: number;     // Score cumulé de la partie
  streak: number;    // Nombre de bonnes réponses consécutives
  hasAnsweredCorrectly: boolean; // Obsolète (gardé pour compatibilité) -> utiliser foundArtist && foundTitle
  foundArtist: boolean; // A trouvé l'artiste
  foundTitle: boolean; // A trouvé le titre
  cooldownUntil: number | null; // Timestamp jusqu'auquel le joueur est en cooldown (null si pas de cooldown)
  hasVotedToPause: boolean; // A voté pour mettre en pause
  timelineCards: TimelineCard[]; // Cartes accumulées en mode Timeline
  // Buzzer mode
  hasBuzzed: boolean; // A buzzé ce round
  // Elimination mode
  isEliminated: boolean; // Éliminé de la partie
  lives: number; // Vies restantes (elimination mode)
  // Spectator
  isSpectator: boolean; // Rejoint en tant que spectateur
  // Teams
  teamId: string | null; // ID de l'équipe (null = pas d'équipe)
  // Power-ups
  powerUps: PowerUpType[]; // Power-ups en stock (max 3)
  activePowerUp: PowerUpType | null; // Power-up actif ce round
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
  teams?: Team[]; // Équipes (optionnel)
  currentTeamTurnId?: string; // ID de l'équipe active en mode Timeline+équipes (tour par tour)
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
  isSoloMode?: boolean; // Solo practice mode (single player allowed)
  gameMode: GameMode;
  timelineCardsToWin: number; // Nombre de cartes pour gagner en mode Timeline (default 10)
  progressiveAudio?: boolean; // Son progressif (low-pass filter qui s'ouvre)
  enablePowerUps?: boolean; // Active les power-ups
  enableTeams?: boolean; // Active le mode équipes
  buzzerTimeMs?: number; // Temps pour répondre après buzz (default 5000)
  introTierMs?: number; // Durée de chaque palier en mode intro (default 2000)
  eliminationLives?: number; // Nombre de vies en mode élimination (1 = mort subite, 3 = default)
}

/**
 * Données d'un round envoyées au client
 */
export interface RoundData {
  roundNumber: number;
  previewUrl: string;          // URL audio Deezer
  totalRounds: number;
  startTimestamp: number;      // Date.now() du serveur pour synchronisation
  // Timeline mode fields
  gameMode?: GameMode;
  trackTitle?: string;         // Visible pendant le round en timeline
  artistName?: string;
  albumCover?: string;
  // Intro mode
  introTierMs?: number; // Durée de chaque palier en mode intro
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
  releaseYear?: number; // Année de sortie (affiché en reveal pour le mode Timeline)
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
    avatarUrl?: string;
    spectator?: boolean;
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

  // Game lifecycle
  return_to_lobby: () => void;

  // Chat
  send_message: (data: { message: string }) => void;

  // Emotes
  send_emote: (data: { emote: string }) => void;

  // Buzzer mode
  buzzer_press: () => void;

  // Power-ups
  activate_powerup: (data: { powerUp: PowerUpType }) => void;

  // Teams
  join_team: (data: { teamId: string }) => void;

  // Lyrics mode
  submit_lyrics: (data: { answers: string[]; timestamp: number }) => void;
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

  // Emotes
  emote_received: (data: { playerId: string; pseudo: string; emote: string }) => void;

  // Timeline mode
  timeline_card_added: (data: {
    playerId: string;
    pseudo: string;
    card: TimelineCard;
    totalCards: number;
  }) => void;

  timeline_winner: (data: {
    playerId: string;
    pseudo: string;
    totalCards: number;
  }) => void;

  // Buzzer mode
  buzzer_locked: (data: { playerId: string; pseudo: string }) => void;
  buzzer_released: () => void;
  buzzer_timeout: () => void;

  // Elimination mode
  player_eliminated: (data: { playerId: string; pseudo: string }) => void;

  // Intro mode
  intro_tier_unlock: (data: { tier: number; durationMs: number; phase: 'listening' | 'guessing' }) => void;

  // Lyrics mode
  lyrics_data: (data: { lyricsText: string; blanks: { position: number; answer: string }[] }) => void;
  lyrics_result: (data: { results: { correct: boolean; expected: string; given: string }[]; pointsEarned: number; correctCount: number; totalBlanks: number }) => void;

  // Power-ups
  powerup_activated: (data: { playerId: string; pseudo: string; powerUp: PowerUpType }) => void;
  powerup_earned: (data: { playerId: string; powerUp: PowerUpType }) => void;
  hint_received: (data: { hint: string; hintType: 'artist' | 'title' }) => void;

  // Contextual reactions
  contextual_reaction: (data: { type: 'insane' | 'fast' | 'silence' | 'comeback' | 'sweep' }) => void;

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
  | "NOT_YOUR_TURN"         // Pas le tour de cette équipe (mode Timeline+équipes)
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
  NOT_YOUR_TURN: "Ce n'est pas le tour de ton équipe.",
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

  // Emotes
  VALID_EMOTES: ['🔥', '👏', '😂', '😮', '💀', '❤️', '🎵', '⚡'] as string[],

  // Timeline mode
  TIMELINE_CARDS_TO_WIN: 10,
  TIMELINE_MIN_YEAR: 1960,
  TIMELINE_MAX_YEAR: 2024,

  // Buzzer mode
  BUZZER_ANSWER_TIME_MS: 10_000, // 10s pour répondre après buzz

  // Intro mode — cumulative listening durations (each tier plays from start to this duration)
  INTRO_TIER_DURATIONS_MS: [2_000, 4_000, 6_000, 10_000, 20_000, 30_000] as number[],
  INTRO_TIER_MS: 2_000, // deprecated, kept for backwards compat
  INTRO_MAX_TIERS: 6,
  INTRO_TIER_MULTIPLIERS: [5, 3, 2, 1.5, 1, 0.5] as number[],
  // Guess window (time between tiers to answer)
  INTRO_GUESS_WINDOW_MS: 15_000,

  // Power-ups
  POWERUP_STREAK_THRESHOLD: 3, // Streak de 3 pour gagner un power-up
  POWERUP_MAX_STOCK: 3, // Max 3 power-ups en stock
  POWERUP_STEAL_AMOUNT: 200, // Points volés avec le steal

  // Premium modes
  PREMIUM_MODES: ['intro', 'lyrics'] as string[],

  // Difficulty scoring multipliers
  DIFFICULTY_MULTIPLIERS: { easy: 0.75, medium: 1.0, hard: 1.5 } as Record<string, number>,
} as const;

/**
 * Type helper pour extraire les valeurs des constantes
 */
export type GameConstants = typeof GAME_CONSTANTS;

/**
 * Informations sur les modes de jeu (pour l'UI)
 */
export interface GameModeInfo {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  isPremium: boolean;
}

export const GAME_MODES_INFO: GameModeInfo[] = [
  {
    id: 'blind-test',
    title: 'Blind Test',
    description: 'Devine l\'artiste et le titre le plus vite possible',
    icon: '🎵',
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-600',
    isPremium: false,
  },
  {
    id: 'timeline',
    title: 'Timeline',
    description: 'Place les morceaux dans l\'ordre chronologique',
    icon: '📅',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    isPremium: false,
  },
  {
    id: 'buzzer',
    title: 'Buzzer',
    description: 'Buzze le premier pour avoir le droit de répondre',
    icon: '🔔',
    color: 'red',
    gradient: 'from-red-500 to-pink-600',
    isPremium: false,
  },
  {
    id: 'elimination',
    title: 'Élimination',
    description: 'Le dernier à trouver est éliminé chaque round',
    icon: '💀',
    color: 'rose',
    gradient: 'from-rose-500 to-red-700',
    isPremium: false,
  },
  {
    id: 'intro',
    title: 'Intro 2s',
    description: 'Seulement 2 secondes d\'intro, puis +2s par palier',
    icon: '⚡',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-600',
    isPremium: true,
  },
  {
    id: 'lyrics',
    title: 'Paroles',
    description: 'Devine le morceau à partir des paroles mot par mot',
    icon: '📝',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    isPremium: true,
  },
];

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
