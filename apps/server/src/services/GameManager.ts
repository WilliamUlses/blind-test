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
  startTimestamp: number;
  endTimestamp: number;
  playersWhoFound: Set<string>; // IDs des joueurs qui ont trouvé
  playerPositions: Map<string, number>; // Position de chaque joueur (1, 2, 3...)
  attempts: AnswerAttempt[]; // Toutes les tentatives de réponse
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

    // Auto-close si un seul joueur reste en cours de partie
    if (this.roomState.status !== 'WAITING' && this.roomState.status !== 'FINISHED' && this.roomState.players.length < 2) {
      console.log('🛑 Auto-closing game: only 1 player left');
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
   */
  updateSettings(playerId: string, settings: Partial<GameSettings>): boolean {
    if (playerId !== this.roomState.hostId) {
      return false;
    }

    this.roomState.settings = { ...this.roomState.settings, ...settings };
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

    if (this.roomState.players.length < GAME_CONSTANTS.MIN_PLAYERS) {
      return { success: false, error: 'NOT_ENOUGH_PLAYERS' };
    }

    if (this.roomState.status !== 'WAITING') {
      return { success: false, error: 'GAME_ALREADY_STARTED' };
    }

    // Initialiser les scores
    this.roomState.players.forEach((player) => {
      player.score = 0;
      player.streak = 0;
      player.hasAnsweredCorrectly = false;
      player.foundArtist = false;
      player.foundTitle = false;
    });

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
   * Démarre un nouveau round
   */
  /**
   * Démarre un nouveau round
   */
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
      console.log('⚠️ Fallback to mock data');
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
      startTimestamp,
      endTimestamp: startTimestamp + roundDurationMs,
      playersWhoFound: new Set(),
      playerPositions: new Map(),
      attempts: [],
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
    const roundData: RoundData = {
      roundNumber: this.currentRound.roundNumber,
      previewUrl: this.currentRound.previewUrl,
      totalRounds: this.roomState.totalRounds,
      startTimestamp,
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

    // Vérifier que le timestamp est valide
    if (timestamp < this.currentRound.startTimestamp || timestamp > this.currentRound.endTimestamp) {
      return { success: false, error: 'ROUND_EXPIRED' };
    }

    const timeTakenMs = timestamp - this.currentRound.startTimestamp;

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

      // Vraie mauvaise réponse -> Cooldown
      const cooldownMs = this.roomState.settings.wrongAnswerCooldownMs;
      const cooldownUntil = now + cooldownMs;

      this.playerCooldowns.set(playerId, cooldownUntil);
      player.cooldownUntil = cooldownUntil;

      // Reset le streak sur erreur ?
      // Débat: Est-ce qu'une erreur sur le titre après avoir trouvé l'artiste casse le streak ?
      // Sévère: oui. Gentil: non.
      // On garde le comportement précédent : Erreur = Reset Streak. 
      // Mais attention, si on a déjà trouvé l'artiste, on a peut-être déjà gagné des points.
      // Le streak est un multiplicateur pour le futur.
      player.streak = 0;

      // Notifier le joueur
      this.io.to(playerId).emit('answer_result', {
        correct: false,
        pointsEarned: 0,
        totalScore: player.score,
        streak: 0,
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
   * Termine le round en cours
   */
  private endRound(): void {
    if (!this.currentRound) return;

    this.roomState.status = 'REVEAL';
    this.emitRoomUpdate();

    // Préparer les résultats
    const playerResults: PlayerRoundResult[] = this.roomState.players.map((player) => {
      const position = this.currentRound!.playerPositions.get(player.id);
      const wasCorrect = this.currentRound!.playersWhoFound.has(player.id);

      // Compter les tentatives du joueur
      const attemptsCount = this.currentRound!.attempts.filter((a) => a.playerId === player.id).length;

      // Trouver le temps de réponse correcte
      const correctAttempt = this.currentRound!.attempts.find(
        (a) => a.playerId === player.id && a.wasCorrect
      );

      return {
        playerId: player.id,
        pseudo: player.pseudo,
        wasCorrect,
        answeredInMs: correctAttempt?.timeTakenMs ?? null,
        pointsEarned: wasCorrect ? this.getPointsEarnedInRound(player.id) : 0,
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
    };

    // Émettre les résultats
    this.io.to(this.roomCode).emit('round_end', roundResult);

    // Attendre la durée de reveal avant de passer au round suivant ou de terminer
    this.phaseTimer = setTimeout(() => {
      if (this.roomState.currentRound >= this.roomState.totalRounds) {
        this.endGame();
      } else {
        this.roomState.status = 'COUNTDOWN';
        this.startCountdown();
      }
    }, this.roomState.settings.revealDurationMs);
  }

  /**
   * Calcule les points gagnés par un joueur dans le round actuel
   */
  private getPointsEarnedInRound(playerId: string): number {
    if (!this.currentRound) return 0;

    const player = this.roomState.players.find((p) => p.id === playerId);
    if (!player || !player.hasAnsweredCorrectly) return 0;

    const correctAttempt = this.currentRound.attempts.find(
      (a) => a.playerId === playerId && a.wasCorrect
    );

    if (!correctAttempt) return 0;

    const position = this.currentRound.playerPositions.get(playerId) || 999;

    const scoreResult = this.scoreCalculator.calculate({
      timeTakenMs: correctAttempt.timeTakenMs,
      roundDurationMs: this.roomState.settings.roundDurationMs,
      currentStreak: player.streak,
      position,
    });

    return scoreResult.totalPoints;
  }

  /**
   * Termine la partie
   */
  private endGame(): void {
    this.roomState.status = 'FINISHED';

    // Trier les joueurs par score
    const finalScores = [...this.roomState.players].sort((a, b) => b.score - a.score);

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
  } {
    const mockTracks = [
      {
        trackId: '1',
        trackTitle: 'Bohemian Rhapsody',
        artistName: 'Queen',
        previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/mock1.mp3',
        albumCover: 'https://api.deezer.com/album/1/image',
      },
      {
        trackId: '2',
        trackTitle: 'Billie Jean',
        artistName: 'Michael Jackson',
        previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/mock2.mp3',
        albumCover: 'https://api.deezer.com/album/2/image',
      },
      {
        trackId: '3',
        trackTitle: 'Hotel California',
        artistName: 'Eagles',
        previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/mock3.mp3',
        albumCover: 'https://api.deezer.com/album/3/image',
      },
    ];

    return mockTracks[(roundNumber - 1) % mockTracks.length];
  }
}
