# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time multiplayer music blind test application with a **multiple-answer system** and **2-second cooldown** on wrong answers. The app uses Socket.io for real-time communication between a Node.js backend and a Next.js 14 frontend.

**Key Architecture Pattern**: Server is the **source of truth** for all game state, scores, and timing. The client is primarily a presentation layer.

## Development Commands

### Server (Backend)
```bash
cd apps/server

# Development (watch mode with tsx)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production start
npm start

# Prisma commands
npm run prisma:generate    # Generate Prisma client after schema changes
npm run prisma:migrate     # Create and apply database migrations
npm run prisma:studio      # Open Prisma Studio GUI
```

### Frontend (Web)
```bash
cd apps/web

# Development server
npm run dev

# Production build
npm run build

# Production start
npm start

# Linting
npm run lint
```

### First-Time Setup
```bash
# 1. Install dependencies for both apps
cd apps/server && npm install
cd ../web && npm install

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Setup database
cd apps/server
npm run prisma:generate
npm run prisma:migrate
```

## Architecture & Key Concepts

### Monorepo Structure
- `apps/server/` - Express + Socket.io backend
- `apps/web/` - Next.js 14 frontend (App Router)
- `packages/shared/` - Shared TypeScript types and constants

### Game State Machine
The game follows a strict state machine flow managed by `GameManager.ts`:

```
WAITING → COUNTDOWN → PLAYING → REVEAL → (next round or FINISHED)
```

- **WAITING**: Lobby phase, players join and set ready status
- **COUNTDOWN**: 3-2-1 countdown before music starts
- **PLAYING**: Music playing, players submit answers (with cooldown on wrong answers)
- **REVEAL**: Show correct answer, display round scores
- **FINISHED**: Game over, show final podium

### Multiple Answer System with Cooldown
**Critical Feature**: Players can submit multiple answers per round:
- ✅ **Correct answer**: Player earns points and is locked out from further answers
- ❌ **Wrong answer**: 2-second cooldown before next attempt (configurable via `wrongAnswerCooldownMs`)
- Player state tracks `hasAnsweredCorrectly`, `foundArtist`, `foundTitle`, and `cooldownUntil` timestamp
- Anti-spam: Maximum 50 attempts per round per player

### Scoring System
Implemented in `apps/server/src/services/ScoreCalculator.ts`:

- **Base points**: 1000
- **Time bonus**: `(timeRemaining / totalTime) × 2 × 1000`
- **Position bonus**: 1st = +200, 2nd = +100, 3rd = +50
- **Streak bonus**: Consecutive correct answers (0, 0, +100, +200, +300, +500)

The scoring heavily rewards speed and consistency.

### Answer Validation
Implemented in `apps/server/src/services/AnswerChecker.ts`:

- Uses **Levenshtein distance** fuzzy matching (threshold: 0.75)
- Normalizes accents, casing, and removes articles ("le", "the", "a", etc.)
- Validates against artist name, track title, or both
- Server-side only (cannot be tampered with by client)

### Real-Time Communication
Socket.io events defined in `packages/shared/types.ts`:

**Client → Server**:
- `create_room`, `join_room`, `leave_room`
- `submit_answer` (can be called multiple times per round)
- `start_game`, `toggle_ready`

**Server → Client**:
- `room_updated` - Broadcast room state changes
- `round_start` - Send round data with audio URL
- `answer_result` - Individual feedback with `cooldownUntil` timestamp
- `player_found` - Notify all players when someone finds correct answer
- `round_end` - Show correct answer and scores

### Type Safety
All Socket.io events and game entities are fully typed in `packages/shared/types.ts`. The client and server share the same type definitions to ensure consistency.

## Key Files & Responsibilities

### Server Core
- `apps/server/src/app.ts` - Express + Socket.io setup, connection handling
- `apps/server/src/services/GameManager.ts` - **Core game state machine** (175-235: cooldown logic)
- `apps/server/src/services/AnswerChecker.ts` - Fuzzy matching validation
- `apps/server/src/services/ScoreCalculator.ts` - Points calculation
- `apps/server/src/services/iTunesService.ts` - Music track fetching (iTunes API)
- `apps/server/src/handlers/roomHandler.ts` - Room join/leave/create logic
- `apps/server/src/handlers/gameHandler.ts` - Game flow events
- `apps/server/src/middlewares/rateLimiter.ts` - Anti-spam protection

### Frontend Core
- `apps/web/app/` - Next.js App Router pages
- `apps/web/components/game/AnswerInput.tsx` - **Answer input with cooldown UI**
- `apps/web/components/game/MusicPlayer.tsx` - Rotating vinyl player (Howler.js)
- `apps/web/components/game/Timer.tsx` - Circular countdown timer
- `apps/web/components/game/ScoreBoard.tsx` - Live leaderboard
- `apps/web/components/game/FinalPodium.tsx` - End-game podium animation
- `apps/web/hooks/useGameSocket.ts` - Socket.io connection hook
- `apps/web/hooks/useAudioPlayer.ts` - Audio playback with Howler.js
- `apps/web/stores/gameStore.ts` - Zustand global state

### Shared
- `packages/shared/types.ts` - **All shared types, constants, and Socket.io event definitions**

## Database Schema (Prisma + PostgreSQL)

Models:
- `User` - Player profiles
- `Room` - Game room configuration
- `RoomPlayer` - Many-to-many join table with session tracking
- `Round` - Individual round data (track info, timestamps)
- `Score` - Player scores per round (with bonus breakdowns)
- `AnswerAttempt` - Full audit trail of all answer attempts

The database is used for persistence and analytics but **not** for real-time game state (which lives in memory in `GameManager`).

## Important Development Notes

### Server as Source of Truth
- All game timing, score calculation, and answer validation happens server-side
- Client timestamp validation prevents time-travel attacks
- Never trust client-side calculations or state for game logic

### Cooldown Implementation
When a player submits a wrong answer:
1. Server calculates `cooldownUntil = Date.now() + wrongAnswerCooldownMs`
2. Server stores this in `playerCooldowns` Map and player state
3. Server sends `answer_result` event with `cooldownUntil` timestamp
4. Client displays progress bar and disables input until cooldown expires
5. Client can attempt submission, but server rejects with `ANSWER_COOLDOWN` error

### Audio Synchronization
- Server sends `startTimestamp` with each round
- Client uses `Howler.js` for audio playback
- Client corrects for network latency using server time sync (every 5 seconds)
- Timer countdown is purely visual; server enforces round duration

### Room Lifecycle
- Rooms expire after 30 minutes of inactivity
- Players can reconnect within 60 seconds of disconnection
- If host leaves, a new host is automatically assigned
- Rooms auto-close when only one player remains during gameplay

## Tech Stack

**Backend**:
- Node.js + Express
- Socket.io (real-time)
- TypeScript (strict mode)
- PostgreSQL + Prisma ORM
- tsx (TypeScript execution)

**Frontend**:
- Next.js 14 (App Router)
- React 18
- TypeScript (strict mode)
- Zustand (state management)
- Framer Motion (animations)
- Howler.js (audio)
- Tailwind CSS + Lucide icons

## Configuration

Environment variables (see `.env.example`):
- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - CORS allowed origin
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SOCKET_URL` - WebSocket server URL for client

Game constants are centralized in `packages/shared/types.ts` under `GAME_CONSTANTS`. Modify there to change:
- Round duration, reveal duration, cooldown duration
- Score multipliers and bonuses
- Player limits, round limits
- Fuzzy matching threshold
- Rate limiting values

## Testing the Cooldown Feature

1. Start server and frontend
2. Create a room and start a game (solo mode works)
3. Submit a **wrong answer**
4. Observe:
   - "Attends 2s avant de réessayer..." message
   - Yellow progress bar at bottom of input
   - Input disabled for 2 seconds
   - After 2s, input re-enables for retry

## Known Limitations & TODOs

- iTunes API is used for music tracks (Deezer planned but not implemented)
- No real-time chat in-game (structure exists but disabled)
- No user authentication system (players identified by socket ID + pseudo)
- No game history or replay system
- No mobile app (PWA planned)
