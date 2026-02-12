/**
 * GameManager - Cœur de la logique du jeu
 * State Machine qui gère tout le flow: WAITING → COUNTDOWN → PLAYING → REVEAL → FINISHED
 * Support des réponses multiples avec cooldown de 2s après mauvaise réponse
 */

import { Server } from 'socket.io';
import {
  Player,
  RoomState,
  GamePhase,
  GameSettings,
  RoundData,
  RoundResult,
  PlayerRoundResult,
  AnswerAttempt,
  TimelineCard,
  GAME_CONSTANTS,
} from '../../../../packages/shared/types';
import { AnswerChecker } from './AnswerChecker';
import { ScoreCalculator } from './ScoreCalculator';
import { itunesService } from './iTunesService';

/**
 * Informations internes d'un round en cours
 */
interface RoundInfo {
  roundNumber: number;
  trackId: string;
  trackTitle: string;
  artistName: string;
  previewUrl: string;
  albumCover: string;
  releaseYear: number;
  startTimestamp: number;
  endTimestamp: number;
  playersWhoFound: Set<string>; // IDs des joueurs qui ont tout trouvé (artiste + titre)
  playerPositions: Map<string, number>; // Position de chaque joueur (1, 2, 3...)
  playerRoundPoints: Map<string, number>; // Points gagnés par joueur dans ce round
  attempts: AnswerAttempt[]; // Toutes les tentatives de réponse
  timelineAnswered: Set<string>; // IDs des joueurs qui ont soumis une réponse en mode Timeline (1 par round)
}

/**
 * Cooldown actif pour un joueur
 */
interface PlayerCooldown {
  playerId: string;
  until: number; // Timestamp jusqu'auquel le joueur est en cooldown
}

/**
 * GameManager gère l'état et la logique d'une room
 */
export class GameManager {
  private roomCode: string;
  private io: Server;
  private roomState: RoomState;
  private currentRound: RoundInfo | null = null;
  private roundTimer: NodeJS.Timeout | null = null;
  private phaseTimer: NodeJS.Timeout | null = null;
  private playerCooldowns: Map<string, number> = new Map(); // playerId -> timestamp
  private answerChecker: AnswerChecker;
  private scoreCalculator: ScoreCalculator;

  constructor(roomCode: string, io: Server, initialState: RoomState) {
    this.roomCode = roomCode;
    this.io = io;
    this.roomState = { ...initialState, isPaused: false };
    this.answerChecker = new AnswerChecker();
    this.scoreCalculator = new ScoreCalculator();
  }

  /**
   * Récupère l'état public de la room
   */
  public getState(): RoomState {
    return this.roomState;
  }

  /**
   * Met à jour l'état de la room (utilisé lors de la reconnexion)
   */
  public updateState(state: RoomState): void {
    this.roomState = state;
  }

  // ... (existing code)

  /**
   * Ajoute un joueur à la room
   */
  public addPlayer(player: Player): void {
    this.roomState.players.push(player);
    this.emitRoomUpdate();
  }

  /**
   * Retire un joueur de la room
   */
  removePlayer(playerId: string): { newHostId?: string } {
    this.roomState.players = this.roomState.players.filter((p) => p.id !== playerId);

    // Si c'était l'hôte, désigner un nouveau host
    let newHostId: string | undefined;
    if (this.roomState.hostId === playerId && this.roomState.players.length > 0) {
      newHostId = this.roomState.players[0].id;
      this.roomState.hostId = newHostId;
    }

    // Auto-close si un seul joueur reste en cours de partie (skip in solo mode)
    if (!this.roomState.settings.isSoloMode && this.roomState.status !== 'WAITING' && this.roomState.status !== 'FINISHED' && this.roomState.players.length < 2) {
      this.endGame();
    }

    this.emitRoomUpdate();
    return { newHostId };
  }

  // ... (existing code)

  /**
   * Gère le vote pour la pause
   */
  togglePauseVote(playerId: string): void {
    if (this.roomState.status !== 'PLAYING') return;

    const player = this.roomState.players.find(p => p.id === playerId);
    if (!player) return;

    player.hasVotedToPause = !player.hasVotedToPause;

    // Compter les votes
    const votes = this.roomState.players.filter(p => p.hasVotedToPause).length;
    const threshold = this.roomState.players.length / 2;

    if (this.roomState.isPaused) {
      // Si déjà en pause, on vérifie si on doit reprendre (si < 50% veulent pause => resume ???)
      // Non, généralement "Vote to Pause" => Pause. "Vote to Resume" => Resume.
      // Simplification : Si > 50% ont le flag "hasVotedToPause", on est en pause.
      // Si le ratio repasse en dessous, on reprend.
      if (votes <= threshold) {
        this.resumeGame();
      }
    } else {
      // Si pas en pause, on vérifie si on doit mettre en pause
      if (votes > threshold) {
        this.pauseGame();
      }
    }

    this.emitRoomUpdate();
  }

  private remainingTimeMs: number = 0;

  private pauseGame(): void {
    if (!this.currentRound || this.roomState.isPaused) return;

    this.roomState.isPaused = true;

    // Calculer le temps restant
    const now = Date.now();
    this.remainingTimeMs = Math.max(0, this.currentRound.endTimestamp - now);

    // Arrêter le timer
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  private resumeGame(): void {
    if (!this.currentRound || !this.roomState.isPaused) return;

    this.roomState.isPaused = false;

    // Recalculer les timestamps
    const now = Date.now();
    this.currentRound.startTimestamp = now - (this.roomState.settings.roundDurationMs - this.remainingTimeMs);
    this.currentRound.endTimestamp = now + this.remainingTimeMs;

    // Relancer le timer
    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, this.remainingTimeMs);
  }

  // ... 



  /**
   * Toggle le statut ready d'un joueur
   */
  togglePlayerReady(playerId: string): void {
    const player = this.roomState.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      this.emitRoomUpdate();
    }
  }

  /**
   * Met à jour les paramètres de la room (host only)
   * Valide les bornes pour empêcher des valeurs abusives
   */
  updateSettings(playerId: string, settings: Partial<GameSettings>): boolean {
    if (playerId !== this.roomState.hostId) {
      return false;
    }

    // Clamp les valeurs numériques dans des bornes sûres
    const sanitized: Partial<GameSettings> = { ...settings };

    if (sanitized.totalRounds !== undefined) {
      sanitized.totalRounds = Math.max(GAME_CONSTANTS.MIN_ROUNDS, Math.min(GAME_CONSTANTS.MAX_ROUNDS, sanitized.totalRounds));
    }
    if (sanitized.maxPlayers !== undefined) {
      sanitized.maxPlayers = Math.max(GAME_CONSTANTS.MIN_PLAYERS, Math.min(GAME_CONSTANTS.MAX_PLAYERS, sanitized.maxPlayers));
    }
    if (sanitized.roundDurationMs !== undefined) {
      sanitized.roundDurationMs = Math.max(5_000, Math.min(120_000, sanitized.roundDurationMs));
    }
    if (sanitized.revealDurationMs !== undefined) {
      sanitized.revealDurationMs = Math.max(2_000, Math.min(30_000, sanitized.revealDurationMs));
    }
    if (sanitized.wrongAnswerCooldownMs !== undefined) {
      sanitized.wrongAnswerCooldownMs = Math.max(500, Math.min(10_000, sanitized.wrongAnswerCooldownMs));
    }
    if (sanitized.genre !== undefined && sanitized.genre !== null) {
      sanitized.genre = String(sanitized.genre).slice(0, 50);
    }
    if (sanitized.isSoloMode !== undefined) {
      sanitized.isSoloMode = Boolean(sanitized.isSoloMode);
    }
    if (sanitized.gameMode !== undefined) {
      sanitized.gameMode = sanitized.gameMode === 'timeline' ? 'timeline' : 'blind-test';
    }
    if (sanitized.timelineCardsToWin !== undefined) {
      sanitized.timelineCardsToWin = Math.max(3, Math.min(20, sanitized.timelineCardsToWin));
    }

    this.roomState.settings = { ...this.roomState.settings, ...sanitized };

    // Sync the top-level totalRounds field used by game flow
    if (sanitized.totalRounds !== undefined) {
      this.roomState.totalRounds = sanitized.totalRounds;
    }

    this.emitRoomUpdate();
    return true;
  }

  /**
   * Démarre la partie (host only)
   */
  async startGame(playerId: string): Promise<{ success: boolean; error?: string }> {
    // Vérifications
    if (playerId !== this.roomState.hostId) {
      return { success: false, error: 'NOT_HOST' };
    }

    const minPlayers = this.roomState.settings.isSoloMode ? 1 : GAME_CONSTANTS.MIN_PLAYERS;
    if (this.roomState.players.length < minPlayers) {
      return { success: false, error: 'NOT_ENOUGH_PLAYERS' };
    }

    if (this.roomState.status !== 'WAITING') {
      return { success: false, error: 'GAME_ALREADY_STARTED' };
    }

    // Reset iTunes service state for new game
    itunesService.resetUsedArtists();

    const isTimeline = this.roomState.settings.gameMode === 'timeline';

    // Initialiser les scores
    this.roomState.players.forEach((player) => {
      player.score = 0;
      player.streak = 0;
      player.hasAnsweredCorrectly = false;
      player.foundArtist = false;
      player.foundTitle = false;
      player.timelineCards = [];
    });

    // En mode timeline, le nombre de rounds est illimité (on joue jusqu'à ce qu'un joueur gagne)
    if (isTimeline) {
      this.roomState.totalRounds = 999;

      // Donner une carte de référence initiale à chaque joueur
      const refTrack = await this.getiTunesTrack() || this.generateMockTrack(0);
      const refCard: TimelineCard = {
        trackTitle: refTrack.trackTitle,
        artistName: refTrack.artistName,
        albumCover: refTrack.albumCover,
        releaseYear: refTrack.releaseYear,
      };
      this.roomState.players.forEach((player) => {
        player.timelineCards = [refCard];
      });
    }

    this.roomState.currentRound = 0;
    this.roomState.status = 'COUNTDOWN';
    this.emitRoomUpdate();

    // Démarrer le countdown
    this.startCountdown();

    return { success: true };
  }

  /**
   * Lance le compte à rebours avant un round
   */
  private startCountdown(): void {
    const countdownMs = GAME_CONSTANTS.COUNTDOWN_MS;

    // Émettre l'événement de countdown
    this.io.to(this.roomCode).emit('countdown_start', { countdownMs });

    this.phaseTimer = setTimeout(() => {
      this.startRound();
    }, countdownMs);
  }

  /**
   * Notifie les joueurs de la mise à jour de la room
   */
  private emitRoomUpdate(): void {
    this.io.to(this.roomCode).emit('room_updated', {
      roomState: this.roomState,
    });
  }

  /**
   * Démarre un nouveau round
   */
  private async startRound(): Promise<void> {
    // Reset pause state
    this.roomState.isPaused = false;
    this.roomState.players.forEach(p => p.hasVotedToPause = false);

    this.roomState.currentRound++;

    // Tenter de récupérer un morceau via iTunes
    let track = await this.getiTunesTrack();

    // Fallback si iTunes échoue
    if (!track) {
      track = this.generateMockTrack(this.roomState.currentRound);
    }

    const startTimestamp = Date.now();
    const roundDurationMs = this.roomState.settings.roundDurationMs;

    this.currentRound = {
      roundNumber: this.roomState.currentRound,
      trackId: track.trackId,
      trackTitle: track.trackTitle,
      artistName: track.artistName,
      previewUrl: track.previewUrl,
      albumCover: track.albumCover,
      releaseYear: track.releaseYear,
      startTimestamp,
      endTimestamp: startTimestamp + roundDurationMs,
      playersWhoFound: new Set(),
      playerPositions: new Map(),
      playerRoundPoints: new Map(),
      attempts: [],
      timelineAnswered: new Set(),
    };

    // Reset les flags de réponse
    this.roomState.players.forEach((player) => {
      player.hasAnsweredCorrectly = false;
      player.foundArtist = false;
      player.foundTitle = false;
      player.cooldownUntil = null;
    });

    // Reset les cooldowns
    this.playerCooldowns.clear();

    this.roomState.status = 'PLAYING';
    this.emitRoomUpdate();

    // Émettre le démarrage du round
    const isTimeline = this.roomState.settings.gameMode === 'timeline';
    const roundData: RoundData = {
      roundNumber: this.currentRound.roundNumber,
      previewUrl: this.currentRound.previewUrl,
      totalRounds: this.roomState.totalRounds,
      startTimestamp,
      ...(isTimeline ? {
        gameMode: 'timeline' as const,
        trackTitle: this.currentRound.trackTitle,
        artistName: this.currentRound.artistName,
        albumCover: this.currentRound.albumCover,
      } : {}),
    };

    this.io.to(this.roomCode).emit('round_start', roundData);

    // Timer pour la fin du round
    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, roundDurationMs);
  }

  private async getiTunesTrack() {
    try {
      // Utiliser le genre des settings si défini, sinon 'pop' par défaut
      const genre = this.roomState.settings.genre || 'pop';
      return await itunesService.getRandomTrack(genre);
    } catch (e) {
      console.error('Error getting iTunes track', e);
      return null;
    }
  }

  /**
   * Traite une tentative de réponse
   * Support des réponses multiples avec cooldown de 2s après erreur
   */
  async submitAnswer(
    playerId: string,
    answer: string,
    timestamp: number
  ): Promise<{ success: boolean; error?: string }> {
    // Vérifications de base
    if (this.roomState.status !== 'PLAYING' || !this.currentRound) {
      return { success: false, error: 'ROUND_EXPIRED' };
    }

    const player = this.roomState.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'PLAYER_NOT_IN_ROOM' };
    }

    // Si le joueur a déjà tout trouvé, ignorer
    if (player.foundArtist && player.foundTitle) {
      return { success: false, error: 'ALREADY_ANSWERED' };
    }

    // Vérifier le cooldown
    const cooldownUntil = this.playerCooldowns.get(playerId);
    const now = Date.now();

    if (cooldownUntil && now < cooldownUntil) {
      return { success: false, error: 'ANSWER_COOLDOWN' };
    }

    // Vérifier que le timestamp est valide et cohérent avec le temps serveur
    if (timestamp < this.currentRound.startTimestamp || timestamp > this.currentRound.endTimestamp) {
      return { success: false, error: 'ROUND_EXPIRED' };
    }
    // Protection contre le clock skew : le timestamp client ne peut pas être dans le futur du serveur
    // Tolérance de 2s pour le lag réseau
    const maxAllowedTimestamp = now + 2000;
    const effectiveTimestamp = Math.min(timestamp, maxAllowedTimestamp);

    const timeTakenMs = effectiveTimestamp - this.currentRound.startTimestamp;

    // Vérifier la réponse
    const settings = this.roomState.settings;
    const result = this.answerChecker.check(
      answer,
      this.currentRound.trackTitle,
      this.currentRound.artistName,
      settings.acceptArtistOnly,
      settings.acceptTitleOnly
    );

    let pointsEarned = 0;
    let foundPart: 'artist' | 'title' | 'both' | undefined;
    let somethingNewFound = false;

    // Logique de scoring additive
    // Si la réponse correspond à l'artiste ET que l'artiste n'a pas encore été trouvé
    if ((result.matchType === 'artist' || result.matchType === 'both') && !player.foundArtist) {
      player.foundArtist = true;
      somethingNewFound = true;
      foundPart = 'artist'; // Initialement trouvé artiste
    }

    // Si la réponse correspond au titre ET que le titre n'a pas encore été trouvé
    if ((result.matchType === 'title' || result.matchType === 'both') && !player.foundTitle) {
      player.foundTitle = true;
      somethingNewFound = true;
      // Si on avait déjà trouvé l'artiste dans ce même appel, c'est 'both', sinon c'est 'title'
      foundPart = foundPart === 'artist' ? 'both' : 'title';
    }

    // Si le joueur a trouvé quelque chose de nouveau
    if (somethingNewFound) {
      player.cooldownUntil = null; // Supprimer le cooldown
      this.playerCooldowns.delete(playerId);

      // Incrémenter le streak seulement si tout est trouvé (ou si on considère le streak par partie ?)
      // Pour simplifier : streak augmente quand on trouve TOUT.
      const fullyFound = player.foundArtist && player.foundTitle;

      if (fullyFound) {
        player.hasAnsweredCorrectly = true; // Compatibilité
        player.streak++;
      }

      // Déterminer la position (seulement si tout est trouvé ?)
      // Ou position séparée pour artiste/titre ?
      // Simplification: Position basée sur le moment où on finit le round (trouve tout)
      let position = 0;
      if (fullyFound) {
        position = this.currentRound.playersWhoFound.size + 1;
        this.currentRound.playersWhoFound.add(playerId);
        this.currentRound.playerPositions.set(playerId, position);
      }

      // Calcul des points
      // On divise les points : 50% pour artiste, 50% pour titre
      const fullScore = this.scoreCalculator.calculate({
        timeTakenMs,
        roundDurationMs: this.roomState.settings.roundDurationMs,
        currentStreak: player.streak, // On utilise le streak actuel (augmenté si full)
        position: position || 10, // Si pas fini, pas de bonus position (ou minime)
      }).totalPoints;

      // Distribution des points
      if (foundPart === 'both') {
        pointsEarned = fullScore;
      } else {
        pointsEarned = Math.floor(fullScore / 2);
      }

      player.score += pointsEarned;
      const prevRoundPoints = this.currentRound.playerRoundPoints.get(playerId) || 0;
      this.currentRound.playerRoundPoints.set(playerId, prevRoundPoints + pointsEarned);
      this.emitRoomUpdate();

      // Notifier le joueur
      this.io.to(playerId).emit('answer_result', {
        correct: true,
        pointsEarned,
        totalScore: player.score,
        streak: player.streak,
        foundPart,
      });

      // Notifier les autres SI le joueur a TOUT trouvé (pour pas spammer)
      // Ou on peut notifier "X a trouvé l'artiste" ?
      // Pour l'instant, on notifie quand le joueur a fini le round
      if (fullyFound) {
        this.io.to(this.roomCode).emit('player_found', {
          playerId,
          pseudo: player.pseudo,
          position,
          timeTakenMs
        });

        // Si tous les joueurs ont TOUT trouvé, terminer le round immédiatement
        if (this.currentRound.playersWhoFound.size === this.roomState.players.length) {
          if (this.roundTimer) {
            clearTimeout(this.roundTimer);
          }
          this.endRound();
        }
      }

    } else {
      // Mauvaise réponse OU déjà trouvé cette partie
      // Si déjà trouvé, on envoie "ALREADY_ANSWERED" sans cooldown (si c'est exactement la même chose ?)
      // Mais ici on est dans le cas ou result.matchType ne correspond pas à ce qu'il reste à trouver.

      // Cas spécial: J'ai déjà trouvé l'artiste, je retape l'artiste -> ALREADY_ANSWERED (pas de cooldown)
      if ((result.matchType === 'artist' && player.foundArtist) ||
        (result.matchType === 'title' && player.foundTitle)) {
        return { success: false, error: 'ALREADY_ANSWERED' }; // Petit message UI, pas de cooldown
      }

      // Vraie mauvaise réponse -> Cooldown (le cooldown est la pénalité suffisante)
      const cooldownMs = this.roomState.settings.wrongAnswerCooldownMs;
      const cooldownUntil = now + cooldownMs;

      this.playerCooldowns.set(playerId, cooldownUntil);
      player.cooldownUntil = cooldownUntil;

      // Le streak n'est PAS reset ici. Le cooldown de 2s est une pénalité suffisante.
      // Le streak sera reset en fin de round si le joueur n'a rien trouvé du tout.

      // Notifier le joueur
      this.io.to(playerId).emit('answer_result', {
        correct: false,
        pointsEarned: 0,
        totalScore: player.score,
        streak: player.streak,
        cooldownUntil,
      });
    }

    // Enregistrer la tentative
    const attempt: AnswerAttempt = {
      playerId,
      answer,
      timestamp,
      wasCorrect: somethingNewFound,
      timeTakenMs,
    };
    this.currentRound.attempts.push(attempt);

    return { success: true };
  }

  /**
   * Traite un placement Timeline.
   * Le joueur choisit un index d'insertion sur sa frise personnelle.
   * On vérifie que l'année de la chanson est cohérente à cette position.
   */
  submitTimelineAnswer(
    playerId: string,
    insertIndex: number,
    timestamp: number
  ): { success: boolean; error?: string } {
    if (this.roomState.status !== 'PLAYING' || !this.currentRound) {
      return { success: false, error: 'ROUND_EXPIRED' };
    }

    const player = this.roomState.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'PLAYER_NOT_IN_ROOM' };
    }

    // 1 seule réponse par round en mode Timeline
    if (this.currentRound.timelineAnswered.has(playerId)) {
      return { success: false, error: 'ALREADY_ANSWERED' };
    }

    this.currentRound.timelineAnswered.add(playerId);

    const actualYear = this.currentRound.releaseYear;
    const cards = player.timelineCards; // Already sorted by releaseYear

    // Validate insertion position
    const clampedIndex = Math.max(0, Math.min(insertIndex, cards.length));

    const yearBefore = clampedIndex > 0 ? cards[clampedIndex - 1].releaseYear : -Infinity;
    const yearAfter = clampedIndex < cards.length ? cards[clampedIndex].releaseYear : Infinity;

    const isCorrect = actualYear >= yearBefore && actualYear <= yearAfter;

    if (isCorrect) {
      // Create the card and insert at the right position
      const newCard: TimelineCard = {
        trackTitle: this.currentRound.trackTitle,
        artistName: this.currentRound.artistName,
        albumCover: this.currentRound.albumCover,
        releaseYear: actualYear,
      };

      // Insert in sorted position (cards are always sorted by year)
      cards.splice(clampedIndex, 0, newCard);
      player.hasAnsweredCorrectly = true;

      // Notify all players
      this.io.to(this.roomCode).emit('timeline_card_added', {
        playerId,
        pseudo: player.pseudo,
        card: newCard,
        totalCards: cards.length,
      });

      this.emitRoomUpdate();

      // Check win condition
      const cardsToWin = this.roomState.settings.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN;
      if (cards.length >= cardsToWin) {
        this.io.to(this.roomCode).emit('timeline_winner', {
          playerId,
          pseudo: player.pseudo,
          totalCards: cards.length,
        });

        // End the round and game
        if (this.roundTimer) {
          clearTimeout(this.roundTimer);
        }
        this.endRound();
        return { success: true };
      }
    }

    // Notify the individual player of their result
    this.io.to(playerId).emit('answer_result', {
      correct: isCorrect,
      pointsEarned: 0,
      totalScore: player.score,
      streak: 0,
    });

    // If all players have answered, end round early
    if (this.currentRound.timelineAnswered.size >= this.roomState.players.length) {
      if (this.roundTimer) {
        clearTimeout(this.roundTimer);
      }
      this.endRound();
    }

    return { success: true };
  }

  /**
   * Termine le round en cours
   */
  private endRound(): void {
    if (!this.currentRound) return;

    const isTimeline = this.roomState.settings.gameMode === 'timeline';

    // Reset le streak des joueurs qui n'ont rien trouvé ce round (skip for timeline)
    if (!isTimeline) {
      this.roomState.players.forEach((player) => {
        if (!player.foundArtist && !player.foundTitle) {
          player.streak = 0;
        }
      });
    }

    this.roomState.status = 'REVEAL';
    this.emitRoomUpdate();

    // Préparer les résultats
    const playerResults: PlayerRoundResult[] = this.roomState.players.map((player) => {
      // Un joueur est "correct" s'il a trouvé au moins quelque chose (artiste ou titre)
      const wasCorrect = player.foundArtist || player.foundTitle;

      // Compter les tentatives du joueur
      const attemptsCount = this.currentRound!.attempts.filter((a) => a.playerId === player.id).length;

      // Trouver le temps de la première réponse correcte
      const correctAttempt = this.currentRound!.attempts.find(
        (a) => a.playerId === player.id && a.wasCorrect
      );

      return {
        playerId: player.id,
        pseudo: player.pseudo,
        wasCorrect,
        answeredInMs: correctAttempt?.timeTakenMs ?? null,
        pointsEarned: this.getPointsEarnedInRound(player.id),
        totalScore: player.score,
        streak: player.streak,
        attemptsCount,
      };
    });

    const roundResult: RoundResult = {
      roundNumber: this.currentRound.roundNumber,
      trackTitle: this.currentRound.trackTitle,
      artistName: this.currentRound.artistName,
      albumCover: this.currentRound.albumCover,
      playerResults,
      ...(isTimeline ? { releaseYear: this.currentRound.releaseYear } : {}),
    };

    // Émettre les résultats
    this.io.to(this.roomCode).emit('round_end', roundResult);

    // Check timeline win condition
    const cardsToWin = this.roomState.settings.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN;
    const timelineWinner = isTimeline && this.roomState.players.some(p => p.timelineCards.length >= cardsToWin);

    // Attendre la durée de reveal avant de passer au round suivant ou de terminer
    this.phaseTimer = setTimeout(() => {
      if (timelineWinner || this.roomState.currentRound >= this.roomState.totalRounds) {
        this.endGame();
      } else {
        this.roomState.status = 'COUNTDOWN';
        this.startCountdown();
      }
    }, this.roomState.settings.revealDurationMs);
  }

  /**
   * Retourne les points gagnés par un joueur dans le round actuel
   * Utilise le tracking direct plutôt qu'un recalcul (inclut les points partiels)
   */
  private getPointsEarnedInRound(playerId: string): number {
    if (!this.currentRound) return 0;
    return this.currentRound.playerRoundPoints.get(playerId) || 0;
  }

  /**
   * Termine la partie
   */
  private endGame(): void {
    this.roomState.status = 'FINISHED';

    const isTimeline = this.roomState.settings.gameMode === 'timeline';

    // Trier les joueurs par score (ou par nombre de cartes en timeline)
    const finalScores = [...this.roomState.players].sort((a, b) =>
      isTimeline ? b.timelineCards.length - a.timelineCards.length : b.score - a.score
    );

    // Top 3
    const podium = finalScores.slice(0, 3);

    // Émettre les résultats finaux
    this.io.to(this.roomCode).emit('game_over', {
      finalScores,
      podium,
    });

    this.emitRoomUpdate();
  }

  /**
   * Reset la room pour une nouvelle partie (retour au lobby)
   */
  public resetForNewGame(): void {
    // Clear timers
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    // Reset game state
    this.roomState.status = 'WAITING';
    this.roomState.currentRound = 0;
    this.roomState.isPaused = false;

    // Reset all players
    this.roomState.players.forEach((player) => {
      player.score = 0;
      player.streak = 0;
      player.isReady = false;
      player.hasAnsweredCorrectly = false;
      player.foundArtist = false;
      player.foundTitle = false;
      player.cooldownUntil = null;
      player.hasVotedToPause = false;
      player.timelineCards = [];
    });

    // Clear internal state
    this.currentRound = null;
    this.playerCooldowns.clear();
    this.remainingTimeMs = 0;

    // Reset iTunes service state for replay
    itunesService.resetUsedArtists();

    this.emitRoomUpdate();
  }

  /**
   * Nettoie les ressources (timers, etc.)
   */
  cleanup(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }
  }

  /**
   * Génère un morceau de test (à remplacer par l'API Deezer)
   */
  private generateMockTrack(roundNumber: number): {
    trackId: string;
    trackTitle: string;
    artistName: string;
    previewUrl: string;
    albumCover: string;
    releaseYear: number;
  } {
    const mockTracks = [
      {
        trackId: '1',
        trackTitle: 'Bohemian Rhapsody',
        artistName: 'Queen',
        previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/mock1.mp3',
        albumCover: 'https://api.deezer.com/album/1/image',
        releaseYear: 1975,
      },
      {
        trackId: '2',
        trackTitle: 'Billie Jean',
        artistName: 'Michael Jackson',
        previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/mock2.mp3',
        albumCover: 'https://api.deezer.com/album/2/image',
        releaseYear: 1982,
      },
      {
        trackId: '3',
        trackTitle: 'Hotel California',
        artistName: 'Eagles',
        previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/mock3.mp3',
        albumCover: 'https://api.deezer.com/album/3/image',
        releaseYear: 1977,
      },
    ];

    return mockTracks[(roundNumber - 1) % mockTracks.length];
  }
}
