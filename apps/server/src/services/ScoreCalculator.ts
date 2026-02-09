/**
 * Service de calcul des scores
 * Gère la logique de scoring avec bonus de temps, streak et position
 */

import {
  GAME_CONSTANTS,
  type ScoreCalculationData,
  type ScoreResult,
} from '../../../../packages/shared/types';

/**
 * Calcule le bonus de temps basé sur la rapidité de réponse
 * Plus le joueur répond vite, plus le bonus est élevé
 *
 * Formula: (tempsRestantMs / tempsTotal) × MULTIPLIER × BASE_POINTS
 *
 * @param timeTakenMs - Temps pris pour répondre en ms
 * @param roundDurationMs - Durée totale du round en ms
 * @returns Le bonus de temps calculé
 */
export function calculateTimeBonus(timeTakenMs: number, roundDurationMs: number): number {
  // Sécurité: si le temps pris est supérieur à la durée du round, pas de bonus
  if (timeTakenMs >= roundDurationMs) {
    return 0;
  }

  const timeRemaining = roundDurationMs - timeTakenMs;
  const timeRatio = timeRemaining / roundDurationMs;

  const bonus = Math.floor(
    timeRatio * GAME_CONSTANTS.TIME_BONUS_MULTIPLIER * GAME_CONSTANTS.BASE_POINTS
  );

  return Math.max(0, bonus);
}

/**
 * Calcule le bonus de streak basé sur le nombre de bonnes réponses consécutives
 * Reward la régularité des joueurs
 *
 * @param currentStreak - Nombre de bonnes réponses consécutives
 * @returns Le bonus de streak
 */
export function calculateStreakBonus(currentStreak: number): number {
  // Le tableau STREAK_BONUS contient les bonus par niveau de streak
  // Index 0 = 0 streak, index 1 = 1 streak, etc.
  const maxStreakLevel = GAME_CONSTANTS.STREAK_BONUS.length - 1;
  const streakLevel = Math.min(currentStreak, maxStreakLevel);

  return GAME_CONSTANTS.STREAK_BONUS[streakLevel] || 0;
}

/**
 * Calcule le bonus de position basé sur l'ordre de réponse
 * Le premier joueur à trouver obtient le plus gros bonus
 *
 * @param position - Position du joueur (1 = premier, 2 = deuxième, etc.)
 * @returns Le bonus de position
 */
export function calculatePositionBonus(position: number): number {
  switch (position) {
    case 1:
      return GAME_CONSTANTS.FIRST_FINDER_BONUS;
    case 2:
      return GAME_CONSTANTS.SECOND_FINDER_BONUS;
    case 3:
      return GAME_CONSTANTS.THIRD_FINDER_BONUS;
    default:
      return 0; // Pas de bonus à partir de la 4ème position
  }
}

/**
 * Calcule le score total d'un joueur pour une réponse correcte
 * Combine tous les bonus : base + temps + streak + position
 *
 * @param data - Données nécessaires au calcul
 * @returns Le résultat détaillé du calcul de score
 */
export function calculateScore(data: ScoreCalculationData): ScoreResult {
  const { timeTakenMs, roundDurationMs, currentStreak, position } = data;

  // Points de base
  const basePoints = GAME_CONSTANTS.BASE_POINTS;

  // Calcul des différents bonus
  const timeBonus = calculateTimeBonus(timeTakenMs, roundDurationMs);
  const streakBonus = calculateStreakBonus(currentStreak);
  const positionBonus = calculatePositionBonus(position);

  // Total
  const totalPoints = basePoints + timeBonus + streakBonus + positionBonus;

  return {
    basePoints,
    timeBonus,
    streakBonus,
    positionBonus,
    totalPoints,
  };
}

/**
 * Classe ScoreCalculator pour encapsuler la logique de scoring
 * Permet de tracker l'état et de faciliter les tests
 */
export class ScoreCalculator {
  /**
   * Calcule le score pour une réponse correcte
   */
  calculate(data: ScoreCalculationData): ScoreResult {
    return calculateScore(data);
  }

  /**
   * Calcule uniquement le bonus de temps
   */
  getTimeBonus(timeTakenMs: number, roundDurationMs: number): number {
    return calculateTimeBonus(timeTakenMs, roundDurationMs);
  }

  /**
   * Calcule uniquement le bonus de streak
   */
  getStreakBonus(currentStreak: number): number {
    return calculateStreakBonus(currentStreak);
  }

  /**
   * Calcule uniquement le bonus de position
   */
  getPositionBonus(position: number): number {
    return calculatePositionBonus(position);
  }

  /**
   * Simule le score pour différentes situations (utile pour l'UI)
   * Retourne les points pour chaque seconde du round
   */
  simulateScoreOverTime(
    roundDurationMs: number,
    currentStreak: number,
    position: number,
    intervalMs: number = 1000
  ): Array<{ timeMs: number; score: number }> {
    const results: Array<{ timeMs: number; score: number }> = [];

    for (let time = 0; time <= roundDurationMs; time += intervalMs) {
      const scoreData: ScoreCalculationData = {
        timeTakenMs: time,
        roundDurationMs,
        currentStreak,
        position,
      };

      const result = this.calculate(scoreData);
      results.push({
        timeMs: time,
        score: result.totalPoints,
      });
    }

    return results;
  }

  /**
   * Retourne les constantes de scoring actuelles
   * Utile pour afficher les informations dans l'UI
   */
  getConstants() {
    return {
      basePoints: GAME_CONSTANTS.BASE_POINTS,
      timeBonusMultiplier: GAME_CONSTANTS.TIME_BONUS_MULTIPLIER,
      streakBonus: GAME_CONSTANTS.STREAK_BONUS,
      firstFinderBonus: GAME_CONSTANTS.FIRST_FINDER_BONUS,
      secondFinderBonus: GAME_CONSTANTS.SECOND_FINDER_BONUS,
      thirdFinderBonus: GAME_CONSTANTS.THIRD_FINDER_BONUS,
    };
  }

  /**
   * Calcule le score maximum possible pour un round donné
   * (réponse immédiate avec le meilleur streak et en première position)
   */
  getMaxPossibleScore(roundDurationMs: number): number {
    const maxStreakLevel = GAME_CONSTANTS.STREAK_BONUS.length - 1;

    const maxScoreData: ScoreCalculationData = {
      timeTakenMs: 0, // Réponse instantanée
      roundDurationMs,
      currentStreak: maxStreakLevel, // Meilleur streak possible
      position: 1, // Première position
    };

    const result = this.calculate(maxScoreData);
    return result.totalPoints;
  }

  /**
   * Calcule le score minimum possible pour un round donné
   * (réponse à la dernière seconde, sans streak, pas dans le top 3)
   */
  getMinPossibleScore(roundDurationMs: number): number {
    const minScoreData: ScoreCalculationData = {
      timeTakenMs: roundDurationMs - 1, // Dernière seconde
      roundDurationMs,
      currentStreak: 0, // Pas de streak
      position: 4, // Pas de bonus de position
    };

    const result = this.calculate(minScoreData);
    return result.totalPoints;
  }
}

// Export d'une instance par défaut pour faciliter l'utilisation
export const defaultScoreCalculator = new ScoreCalculator();

/**
 * Exemples de calculs pour référence:
 *
 * Réponse en 3s (premier, no streak):
 * - Base: 1000
 * - Time: (27000/30000) × 2 × 1000 = 1800
 * - Streak: 0
 * - Position: 200
 * - Total: 3000 points
 *
 * Réponse en 15s (deuxième, streak 2):
 * - Base: 1000
 * - Time: (15000/30000) × 2 × 1000 = 1000
 * - Streak: 100
 * - Position: 100
 * - Total: 2200 points
 *
 * Réponse en 28s (quatrième, streak 5):
 * - Base: 1000
 * - Time: (2000/30000) × 2 × 1000 = 133
 * - Streak: 500
 * - Position: 0
 * - Total: 1633 points
 */
