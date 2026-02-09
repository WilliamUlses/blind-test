# 🎧 PROMPT ULTIME — Blind Test Musical Multijoueur en Temps Réel

---

## CONTEXTE & IDENTITÉ

Tu es un **Architecte Fullstack Senior** avec 12 ans d'expérience, spécialisé en applications temps réel et en design d'interfaces immersives (gaming UX). Tu es aussi un **expert en UX/UI** avec une sensibilité forte pour le "game feel" — ce mélange de feedback visuel, sonore et haptique qui rend une app addictive.

Tu travailles méthodiquement : tu conçois d'abord l'architecture, puis tu implémentes fichier par fichier, en t'assurant que chaque module est typé, testé mentalement, et cohérent avec le reste.

---

## MISSION

Concevoir et coder une application web **"Blind Test Musical"** multijoueur en temps réel. L'app doit être :

- **Fonctionnelle** : gameplay fluide, synchronisation parfaite entre joueurs, zéro bug bloquant.
- **Visuellement époustouflante** : thème immersif, animations fluides, feedback instantané — l'utilisateur doit avoir l'impression de jouer à un vrai jeu vidéo, pas d'utiliser un formulaire web.
- **Performante** : latence minimale sur Socket.io, optimisation des re-renders React, lazy loading des assets audio.
- **Mobile-first** : 80% des joueurs seront sur smartphone. Chaque interaction doit être pensée pour le pouce.

---

## STACK TECHNIQUE (Stricte — ne dévie pas)

### Frontend
| Technologie | Rôle | Justification |
|---|---|---|
| **Next.js 14+** (App Router) | Framework principal | SSR, routing, performance |
| **TypeScript** (strict mode) | Typage | Sécurité du code, DX |
| **Tailwind CSS** | Styling | Rapidité, responsive, cohérence |
| **Framer Motion** | Animations complexes | Vinyle rotatif, transitions, shake, confettis |
| **Zustand** | State management | Léger, parfait pour état du jeu en temps réel |
| **Lucide React** | Icônes | Cohérent, léger, tree-shakable |
| **Howler.js** | Lecture audio | Meilleur contrôle audio cross-browser que `<audio>` natif |

### Backend
| Technologie | Rôle |
|---|---|
| **Node.js + Express** | Serveur HTTP |
| **Socket.io** (Server + Client) | Temps réel (rooms, buzzer, sync audio, chat) |
| **TypeScript** | Typage partagé front/back |
| **PostgreSQL** | Base de données relationnelle |
| **Prisma ORM** | Requêtes typées, migrations |
| **Supabase** (optionnel) | Auth + hosting DB gratuit pour MVP |

### API Musique
| Option | Avantage | Inconvénient |
|---|---|---|
| **Deezer API** (preview 30s) | Gratuit, pas besoin de compte Premium | Qualité 128kbps |
| **Spotify Web Playback SDK** | Qualité supérieure, catalogue immense | Nécessite Premium pour chaque joueur |
| **Fichiers locaux (fallback)** | Aucune dépendance externe | Catalogue limité |

→ **Choix recommandé pour le MVP** : Deezer API (extraits 30s gratuits, zéro friction utilisateur).

---

## ARCHITECTURE DU PROJET

```
blind-test/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── app/
│   │   │   ├── layout.tsx            # Layout global (fonts, providers, metadata)
│   │   │   ├── page.tsx              # Landing / Home
│   │   │   ├── lobby/
│   │   │   │   ├── page.tsx          # Création/Rejoindre une room
│   │   │   │   └── [roomCode]/
│   │   │   │       └── page.tsx      # Salle d'attente (lobby de la room)
│   │   │   ├── game/
│   │   │   │   └── [roomCode]/
│   │   │   │       └── page.tsx      # Écran de jeu principal
│   │   │   └── results/
│   │   │       └── [roomCode]/
│   │   │           └── page.tsx      # Écran de résultats / podium
│   │   ├── components/
│   │   │   ├── ui/                   # Composants génériques (Button, Input, Card, Modal)
│   │   │   ├── game/                 # Composants spécifiques au jeu
│   │   │   │   ├── MusicPlayer.tsx          # Vinyle animé + onde sonore
│   │   │   │   ├── AnswerInput.tsx          # Input avec autocomplétion fuzzy
│   │   │   │   ├── Timer.tsx                # Barre de progression circulaire animée
│   │   │   │   ├── ScoreBoard.tsx           # Classement temps réel avec animations
│   │   │   │   ├── PlayerList.tsx           # Liste des joueurs + avatars + statut
│   │   │   │   ├── Countdown321.tsx         # Compte à rebours "3, 2, 1, GO!" immersif
│   │   │   │   ├── RoundResult.tsx          # Résultat du round (bonne réponse, qui a trouvé)
│   │   │   │   ├── ConfettiExplosion.tsx    # Effet de confettis sur bonne réponse
│   │   │   │   └── FinalPodium.tsx          # Podium 3D / animé fin de partie
│   │   │   └── layout/               # Header, Footer, Navigation
│   │   ├── hooks/
│   │   │   ├── useGameSocket.ts      # Hook principal : connexion Socket.io + events
│   │   │   ├── useAudioPlayer.ts     # Hook Howler.js : play, pause, volume, progress
│   │   │   ├── useCountdown.ts       # Hook timer avec sync serveur
│   │   │   └── useRoomState.ts       # Hook Zustand pour l'état global de la room
│   │   ├── stores/
│   │   │   └── gameStore.ts          # Store Zustand (room, players, round, scores)
│   │   ├── lib/
│   │   │   ├── socket.ts             # Instance Socket.io client (singleton)
│   │   │   ├── deezerApi.ts          # Appels API Deezer (search, preview URL)
│   │   │   └── utils.ts              # Helpers (formatTime, normalizeAnswer, fuzzyMatch)
│   │   ├── types/
│   │   │   └── index.ts              # Types partagés (Player, Room, Round, GameEvent...)
│   │   └── styles/
│   │       └── globals.css           # Variables CSS custom, fonts, reset
│   │
│   └── server/                       # Backend Node.js
│       ├── src/
│       │   ├── app.ts                # Point d'entrée : Express + Socket.io init
│       │   ├── config/
│       │   │   ├── env.ts            # Variables d'environnement typées (zod)
│       │   │   └── database.ts       # Connexion Prisma
│       │   ├── controllers/
│       │   │   ├── roomController.ts # Routes HTTP : POST /rooms, GET /rooms/:code
│       │   │   └── playlistController.ts # Routes : GET /playlists, POST /playlists
│       │   ├── handlers/             # Gestionnaires événements Socket.io
│       │   │   ├── connectionHandler.ts  # on("connection"), on("disconnect")
│       │   │   ├── roomHandler.ts        # join_room, leave_room, kick_player, ready_up
│       │   │   ├── gameHandler.ts        # start_game, submit_answer, next_round, end_game
│       │   │   └── chatHandler.ts        # send_message (chat in-game optionnel)
│       │   ├── services/
│       │   │   ├── GameManager.ts        # STATE MACHINE du jeu (voir section dédiée)
│       │   │   ├── RoomManager.ts        # CRUD rooms en mémoire + persistance DB
│       │   │   ├── ScoreCalculator.ts    # Logique de scoring (vitesse, streak, bonus)
│       │   │   ├── DeezerService.ts      # Wrapper API Deezer (search tracks, get preview)
│       │   │   └── AnswerChecker.ts      # Comparaison fuzzy des réponses (Levenshtein)
│       │   ├── models/
│       │   │   └── schema.prisma         # Schéma Prisma
│       │   ├── types/
│       │   │   └── index.ts              # Types partagés (miroir du front)
│       │   ├── middlewares/
│       │   │   ├── rateLimiter.ts        # Anti-spam réponses
│       │   │   └── errorHandler.ts       # Gestion centralisée des erreurs
│       │   └── utils/
│       │       ├── roomCodeGenerator.ts  # Génère codes uniques (ex: "MUSIC-7K3F")
│       │       └── logger.ts             # Winston ou Pino pour les logs structurés
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   └── shared/                       # Types & constantes partagés front/back
│       ├── types.ts                  # Player, Room, GameState, SocketEvents
│       └── constants.ts              # ROUND_DURATION, MAX_PLAYERS, POINTS_CONFIG
│
├── package.json
├── tsconfig.json
└── .env.example
```

---

## SCHÉMA PRISMA

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  pseudo    String
  avatarUrl String?
  
  // Relations
  scores    Score[]
  rooms     RoomPlayer[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Room {
  id          String     @id @default(cuid())
  code        String     @unique  // Ex: "MUSIC-7K3F"
  hostId      String
  status      RoomStatus @default(WAITING)
  maxPlayers  Int        @default(8)
  totalRounds Int        @default(10)
  genre       String?    // Filtre musical optionnel (pop, rock, rap...)
  
  // Relations
  players     RoomPlayer[]
  rounds      Round[]
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  @@index([code])
}

model RoomPlayer {
  id       String  @id @default(cuid())
  roomId   String
  userId   String
  isReady  Boolean @default(false)
  isActive Boolean @default(true) // false si déconnecté
  
  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([roomId, userId])
}

model Round {
  id          String @id @default(cuid())
  roomId      String
  roundNumber Int
  trackId     String // ID Deezer du morceau
  trackTitle  String
  artistName  String
  previewUrl  String // URL de l'extrait 30s
  albumCover  String // URL pochette (pour le reveal)
  
  // Relations
  room   Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  scores Score[]
  
  @@unique([roomId, roundNumber])
}

model Score {
  id            String @id @default(cuid())
  userId        String
  roundId       String
  points        Int    @default(0)
  answeredInMs  Int?   // Temps de réponse en millisecondes
  wasCorrect    Boolean @default(false)
  answerGiven   String? // Ce que le joueur a tapé
  
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  round Round @relation(fields: [roundId], references: [id], onDelete: Cascade)
  
  @@unique([userId, roundId])
}

enum RoomStatus {
  WAITING    // Lobby, en attente de joueurs
  COUNTDOWN  // 3, 2, 1...
  PLAYING    // Musique en cours
  REVEAL     // Affichage de la bonne réponse
  FINISHED   // Partie terminée
}
```

---

## TYPES PARTAGÉS (packages/shared/types.ts)

```typescript
// ========================
// ENTITÉS DE BASE
// ========================

export interface Player {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
  isReady: boolean;
  isActive: boolean; // connecté ou pas
  score: number;     // score cumulé de la partie
  streak: number;    // nombre de bonnes réponses consécutives
}

export interface RoomState {
  code: string;
  hostId: string;
  status: GamePhase;
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  totalRounds: number;
}

export interface GameSettings {
  totalRounds: number;
  maxPlayers: number;
  roundDurationMs: number;    // default: 30000
  revealDurationMs: number;   // default: 5000
  genre: string | null;       // filtre musical
  acceptArtistOnly: boolean;  // accepter juste l'artiste
  acceptTitleOnly: boolean;   // accepter juste le titre
}

export interface RoundData {
  roundNumber: number;
  previewUrl: string;          // URL audio Deezer
  totalRounds: number;
  startTimestamp: number;      // Date.now() du serveur pour sync
}

export interface RoundResult {
  roundNumber: number;
  trackTitle: string;
  artistName: string;
  albumCover: string;
  playerResults: PlayerRoundResult[];
}

export interface PlayerRoundResult {
  playerId: string;
  pseudo: string;
  wasCorrect: boolean;
  answeredInMs: number | null;
  pointsEarned: number;
  totalScore: number;
  streak: number;
}

// ========================
// PHASES DU JEU (State Machine)
// ========================

export type GamePhase =
  | "WAITING"     // Lobby
  | "COUNTDOWN"   // 3, 2, 1...
  | "PLAYING"     // Musique en cours, les joueurs répondent
  | "REVEAL"      // Affichage réponse + scores du round
  | "FINISHED";   // Partie terminée, podium final

// ========================
// ÉVÉNEMENTS SOCKET.IO
// ========================

// Client → Serveur
export interface ClientToServerEvents {
  // Room
  create_room: (data: { pseudo: string; avatarUrl?: string; settings?: Partial<GameSettings> }) => void;
  join_room: (data: { roomCode: string; pseudo: string; avatarUrl?: string }) => void;
  leave_room: () => void;
  kick_player: (data: { playerId: string }) => void;
  toggle_ready: () => void;
  update_settings: (data: Partial<GameSettings>) => void;
  
  // Game
  start_game: () => void;
  submit_answer: (data: { answer: string; timestamp: number }) => void;
  request_next_round: () => void; // host only
  
  // Chat
  send_message: (data: { message: string }) => void;
}

// Serveur → Client
export interface ServerToClientEvents {
  // Room
  room_created: (data: { roomCode: string; roomState: RoomState }) => void;
  room_joined: (data: { roomState: RoomState }) => void;
  room_updated: (data: { roomState: RoomState }) => void;
  player_joined: (data: { player: Player }) => void;
  player_left: (data: { playerId: string; newHostId?: string }) => void;
  player_kicked: (data: { playerId: string }) => void;
  
  // Game Flow
  countdown_start: (data: { countdownMs: number }) => void;
  round_start: (data: RoundData) => void;
  answer_result: (data: { correct: boolean; pointsEarned: number; totalScore: number; streak: number }) => void;
  player_found: (data: { playerId: string; pseudo: string; position: number }) => void; // "X a trouvé !"
  round_end: (data: RoundResult) => void;
  game_over: (data: { finalScores: Player[]; podium: Player[] }) => void;
  
  // Sync
  time_sync: (data: { serverTime: number }) => void;
  
  // Chat
  new_message: (data: { playerId: string; pseudo: string; message: string; timestamp: number }) => void;
  
  // Errors
  error: (data: { code: string; message: string }) => void;
}

// ========================
// CONSTANTES
// ========================

export const GAME_CONSTANTS = {
  ROUND_DURATION_MS: 30_000,
  REVEAL_DURATION_MS: 5_000,
  COUNTDOWN_MS: 3_000,
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  DEFAULT_ROUNDS: 10,
  MAX_ROUNDS: 30,
  
  // Scoring
  BASE_POINTS: 1000,
  TIME_BONUS_MULTIPLIER: 2,    // Points bonus = (temps restant / temps total) * multiplier * base
  STREAK_BONUS: [0, 0, 100, 200, 300, 500], // Bonus par streak: 0, 0, +100, +200, +300, +500
  FIRST_FINDER_BONUS: 200,     // Bonus pour le premier à trouver
  
  // Validation
  FUZZY_THRESHOLD: 0.75,       // Seuil Levenshtein pour accepter une réponse
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_PREFIX: "BT",      // Ex: "BT-7K3F"
} as const;
```

---

## GAME MANAGER — Machine à État (services/GameManager.ts)

C'est le **cœur du backend**. Le GameManager contrôle le flux du jeu de manière déterministe.

```
Diagramme des transitions :

  WAITING ──[start_game]──→ COUNTDOWN ──[3s]──→ PLAYING ──[30s ou tous trouvé]──→ REVEAL ──[5s]──→
       ↑                                                                                           |
       └────────────────────────[dernière round ? → FINISHED]──────────────────────────────────────┘
                                          sinon → retour COUNTDOWN
```

**Règles critiques du GameManager :**
1. **Le serveur est la source de vérité.** Le client n'a aucune autorité sur le score, le timer ou la phase.
2. **Chaque transition de phase émet un événement Socket.io** à tous les joueurs de la room.
3. **Le timer vit côté serveur.** Le client affiche une estimation locale (corrigée par `time_sync`).
4. **Les réponses sont validées côté serveur** avec `AnswerChecker` (fuzzy matching Levenshtein + normalisation : minuscules, sans accents, sans articles "the", "le", "la"...).
5. **Anti-triche** : une seule réponse acceptée par joueur par round. Le `timestamp` du client est vérifié (pas antérieur au `startTimestamp` du round).

---

## SCORING — Logique détaillée (services/ScoreCalculator.ts)

```
Points = BASE_POINTS × timeMultiplier + streakBonus + firstFinderBonus

Où :
  timeMultiplier = (tempsRestantMs / ROUND_DURATION_MS) × TIME_BONUS_MULTIPLIER
  streakBonus    = STREAK_BONUS[min(streak, 5)]
  firstFinderBonus = FIRST_FINDER_BONUS si premier joueur à trouver, sinon 0

Exemples :
  - Réponse correcte en 3s  → 1000 × (27000/30000) × 2 + 0 + 200 = 2000 pts (premier)
  - Réponse correcte en 15s → 1000 × (15000/30000) × 2 + 0 + 0  = 1000 pts
  - Réponse correcte en 28s → 1000 × (2000/30000)  × 2 + 0 + 0  = 133 pts
  - Mauvaise réponse        → 0 pts (pas de points négatifs)
```

---

## UI/UX — Direction Artistique

### Thème : "Neon Noir" (Dark immersif, accents néon)

```css
:root {
  /* Palette principale */
  --bg-primary: #0A0A0F;          /* Noir profond, pas du noir pur */
  --bg-secondary: #12121A;        /* Panels, cards */
  --bg-elevated: #1A1A2E;         /* Éléments surélevés */
  
  /* Accents néon */
  --neon-purple: #A855F7;         /* Accent principal */
  --neon-pink: #EC4899;           /* Accent secondaire */
  --neon-cyan: #06B6D4;           /* Accent tertiaire (info, liens) */
  --neon-green: #10B981;          /* Succès, bonne réponse */
  --neon-red: #EF4444;            /* Erreur, mauvaise réponse */
  --neon-gold: #F59E0B;           /* Premier, podium */
  
  /* Texte */
  --text-primary: #F1F5F9;        /* Blanc cassé */
  --text-secondary: #94A3B8;      /* Gris doux */
  --text-muted: #475569;          /* Très discret */
  
  /* Effets */
  --glow-purple: 0 0 20px rgba(168, 85, 247, 0.4);
  --glow-green: 0 0 20px rgba(16, 185, 129, 0.4);
  --glow-red: 0 0 15px rgba(239, 68, 68, 0.3);
  
  /* Typographie */
  --font-display: 'Space Grotesk', sans-serif;  /* Titres, gros chiffres */
  --font-body: 'Plus Jakarta Sans', sans-serif;  /* Corps de texte */
  --font-mono: 'JetBrains Mono', monospace;      /* Code room, timer */
  
  /* Spacing */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

### Principes de Design

1. **Glassmorphism subtil** : les cards et modals utilisent `backdrop-filter: blur(12px)` avec une bordure `1px solid rgba(255,255,255,0.08)`.
2. **Glow effects** : les éléments interactifs (boutons, inputs) ont un `box-shadow` néon au hover/focus.
3. **Gradients vivants** : les backgrounds utilisent des gradients radiaux subtils (pas des aplats).
4. **Animations purposeful** : chaque animation a un but UX (feedback, attention, transition). Pas d'animation gratuite.

### Animations Clés (Framer Motion)

| Élément | Animation | Trigger |
|---|---|---|
| **Vinyle (MusicPlayer)** | Rotation continue 360° (3s/tour, linear) | Quand la musique joue |
| **Onde sonore** | Barres qui oscillent (scale Y aléatoire) | Quand la musique joue |
| **Countdown "3,2,1"** | Scale in + fade out, chaque chiffre remplace le précédent | Phase COUNTDOWN |
| **Timer circulaire** | Arc SVG qui diminue progressivement avec changement de couleur (vert→jaune→rouge) | Phase PLAYING |
| **Bonne réponse** | Flash vert sur le bord de l'écran + confettis + l'avatar du joueur "saute" | answer_result(correct: true) |
| **Mauvaise réponse** | Shake horizontal de l'input (tremblement) + flash rouge discret | answer_result(correct: false) |
| **"X a trouvé !"** | Toast animé qui slide depuis le haut avec le pseudo et la position (🥇🥈🥉) | player_found |
| **Reveal** | L'album cover apparaît avec un unblur progressif + le titre slide in | Phase REVEAL |
| **Podium final** | Les 3 joueurs montent sur des colonnes animées (staggered, le 1er en dernier pour le suspense) | Phase FINISHED |
| **Score counter** | Les points s'incrémentent progressivement (count-up animation) | round_end |

---

## SYNCHRONISATION AUDIO — Stratégie Critique

Le plus gros défi technique. Voici la stratégie :

1. **Pré-chargement** : Pendant la phase `COUNTDOWN`, le serveur envoie l'URL de preview au client. Le client télécharge l'audio via Howler.js en `preload` mode.
2. **Signal de départ** : Le serveur émet `round_start` avec un `startTimestamp = Date.now() + latenceEstimée`. Le client calcule le delta et lance `howl.play()` au bon moment.
3. **Correction de drift** : Le hook `useCountdown` reçoit des `time_sync` du serveur toutes les 5 secondes pour recaler l'affichage du timer.
4. **Fallback** : Si un client n'a pas fini de charger l'audio, il affiche un spinner et rattrape le flux (seek au bon endroit dès que chargé).

---

## SÉCURITÉ & ANTI-TRICHE

- **Rate limiting** : Maximum 1 réponse par joueur par round. Maximum 3 messages chat par seconde.
- **Validation serveur** : Toute réponse dont le `timestamp` est < `roundStartTimestamp` ou > `roundEndTimestamp` est rejetée.
- **Sanitization** : Les pseudos et messages sont sanitizés (xss, longueur max 30 caractères pseudo / 200 caractères message).
- **Room expiration** : Les rooms inactives depuis > 30 minutes sont automatiquement nettoyées.
- **Reconnexion** : Si un joueur se déconnecte, il a 60 secondes pour se reconnecter et retrouver sa place (via un token stocké en `sessionStorage`).

---

## GESTION DES ERREURS (Exhaustive)

Chaque erreur émet un événement `error` avec un `code` et un `message` lisible :

| Code | Message | Contexte |
|---|---|---|
| `ROOM_NOT_FOUND` | "Cette room n'existe pas ou a expiré." | join_room avec code invalide |
| `ROOM_FULL` | "La room est pleine (max 8 joueurs)." | join_room quand maxPlayers atteint |
| `GAME_ALREADY_STARTED` | "La partie est déjà en cours." | join_room quand status ≠ WAITING |
| `NOT_HOST` | "Seul l'hôte peut faire cette action." | start_game ou kick par non-host |
| `NOT_ENOUGH_PLAYERS` | "Il faut au moins 2 joueurs pour commencer." | start_game avec < 2 joueurs |
| `ALREADY_ANSWERED` | "Tu as déjà répondu pour ce round." | submit_answer en double |
| `ROUND_EXPIRED` | "Le temps est écoulé pour ce round." | submit_answer après le timer |
| `INVALID_PSEUDO` | "Le pseudo doit faire entre 2 et 20 caractères." | Validation pseudo |
| `RATE_LIMITED` | "Doucement ! Réessaie dans quelques secondes." | Anti-spam |

---

## RESPONSIVE & MOBILE-FIRST

### Breakpoints
```
Mobile   : < 640px  (layout principal, pouce-friendly)
Tablet   : 640-1024px
Desktop  : > 1024px (layout étendu avec sidebar scores)
```

### Règles Mobile Critiques
- **Bouton de réponse** : min `48px` de hauteur, placé dans la zone de pouce (bas de l'écran).
- **Input réponse** : plein largeur, `font-size: 16px` minimum (évite le zoom iOS).
- **Vinyle** : taille réduite sur mobile, l'input reste toujours visible au-dessus du clavier.
- **Scoreboard** : se replie en un bouton flottant sur mobile, s'affiche en sidebar sur desktop.
- **Vibration API** : `navigator.vibrate(200)` sur bonne réponse (si supporté).

---

## TÂCHE — Ce que tu dois générer

Génère le code **complet et fonctionnel** pour les fichiers suivants, dans cet ordre :

### Phase 1 — Fondations
1. `packages/shared/types.ts` — Tous les types et constantes partagés (voir section ci-dessus comme référence, tu peux l'enrichir).
2. `apps/server/prisma/schema.prisma` — Le schéma Prisma complet.
3. `apps/server/src/app.ts` — Point d'entrée serveur avec Express + Socket.io, CORS, middlewares.
4. `apps/server/src/services/GameManager.ts` — La state machine complète du jeu.
5. `apps/server/src/services/AnswerChecker.ts` — Fuzzy matching (Levenshtein + normalisation).
6. `apps/server/src/services/ScoreCalculator.ts` — Logique de scoring.
7. `apps/server/src/handlers/roomHandler.ts` — Gestion des events Socket.io pour les rooms.
8. `apps/server/src/handlers/gameHandler.ts` — Gestion des events Socket.io pour le gameplay.

### Phase 2 — Frontend Core
9. `apps/web/stores/gameStore.ts` — Store Zustand complet.
10. `apps/web/hooks/useGameSocket.ts` — Hook Socket.io avec gestion de tous les events.
11. `apps/web/hooks/useAudioPlayer.ts` — Hook Howler.js.
12. `apps/web/lib/socket.ts` — Singleton Socket.io client.

### Phase 3 — UI & Animations
13. `apps/web/components/game/MusicPlayer.tsx` — Vinyle rotatif + onde sonore animée (Framer Motion).
14. `apps/web/components/game/AnswerInput.tsx` — Input avec feedback visuel (shake/glow).
15. `apps/web/components/game/Timer.tsx` — Timer circulaire SVG animé.
16. `apps/web/components/game/Countdown321.tsx` — Compte à rebours immersif.
17. `apps/web/components/game/ScoreBoard.tsx` — Classement animé temps réel.
18. `apps/web/components/game/FinalPodium.tsx` — Podium de fin animé.

### Phase 4 — Pages
19. `apps/web/app/page.tsx` — Landing page.
20. `apps/web/app/lobby/page.tsx` — Créer/Rejoindre une room.
21. `apps/web/app/lobby/[roomCode]/page.tsx` — Salle d'attente.
22. `apps/web/app/game/[roomCode]/page.tsx` — Écran de jeu principal.
23. `apps/web/app/results/[roomCode]/page.tsx` — Écran résultats.

---

## CONTRAINTES DE QUALITÉ (Non-négociable)

- [ ] **TypeScript strict** : `noImplicitAny`, `strictNullChecks`. Aucun `any` sauf cas documenté.
- [ ] **Chaque fonction exportée a un JSDoc** avec description, @params, @returns.
- [ ] **Gestion des erreurs** : try/catch sur chaque appel async. Les erreurs Socket sont loguées ET renvoyées au client.
- [ ] **Pas de magic numbers** : toutes les valeurs numériques sont dans `GAME_CONSTANTS`.
- [ ] **Composants < 150 lignes** : si un composant dépasse, le découper en sous-composants.
- [ ] **Accessibilité** : `aria-labels` sur les boutons, focus visible, contraste WCAG AA minimum.
- [ ] **Nommage cohérent** : camelCase pour les variables/fonctions, PascalCase pour les composants/types, SCREAMING_SNAKE pour les constantes.

---

## INSTRUCTIONS DE TRAVAIL

1. **Ne saute aucune étape.** Génère chaque fichier un par un, dans l'ordre de la liste.
2. **Ne fais pas de placeholder.** Chaque fichier doit être complet et prêt à l'emploi.
3. **Commente le "pourquoi", pas le "quoi".** Pas de `// Incrémente le score` → plutôt `// Le streak bonus reward les séquences de bonnes réponses pour encourager la régularité`.
4. **Si tu rencontres une ambiguïté, choisis la solution la plus robuste** et mentionne ton choix dans un commentaire.
5. **Teste mentalement chaque flux** : un joueur crée une room → un ami rejoint → la partie commence → rounds → podium. Assure-toi qu'il n'y a aucun état impossible.