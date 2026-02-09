/**
 * Service de validation des réponses avec fuzzy matching
 * Utilise l'algorithme de Levenshtein pour accepter des réponses approximatives
 */

import { GAME_CONSTANTS, type FuzzyMatchConfig } from '../../../../packages/shared/types';

/**
 * Configuration par défaut du fuzzy matching
 */
const DEFAULT_CONFIG: FuzzyMatchConfig = {
  threshold: GAME_CONSTANTS.FUZZY_THRESHOLD,
  normalizeAccents: true,
  normalizeCasing: true,
  removeArticles: true,
};

/**
 * Articles à retirer des réponses (français et anglais)
 */
const ARTICLES = ['le', 'la', 'les', 'l', 'un', 'une', 'des', 'the', 'a', 'an'];

/**
 * Normalise une chaîne de caractères pour la comparaison
 * @param str - La chaîne à normaliser
 * @param config - Configuration du fuzzy matching
 * @returns La chaîne normalisée
 */
export function normalizeString(str: string, config: FuzzyMatchConfig = DEFAULT_CONFIG): string {
  let normalized = str;

  // Mise en minuscules
  if (config.normalizeCasing) {
    normalized = normalized.toLowerCase();
  }

  // Suppression des accents
  if (config.normalizeAccents) {
    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Suppression de la ponctuation et caractères spéciaux
  normalized = normalized.replace(/[^\w\s]/g, ' ');

  // Suppression des articles en début de chaîne
  if (config.removeArticles) {
    const words = normalized.trim().split(/\s+/);
    if (words.length > 1 && ARTICLES.includes(words[0])) {
      words.shift();
    }
    normalized = words.join(' ');
  }

  // Suppression des espaces multiples et trim
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * La distance de Levenshtein mesure le nombre minimum de modifications
 * (insertion, suppression, substitution) nécessaires pour transformer une chaîne en une autre
 *
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns La distance de Levenshtein
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Cas de base : si une des chaînes est vide
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Matrice pour la programmation dynamique
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialisation de la première ligne et colonne
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Remplissage de la matrice
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Suppression
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calcule le score de similarité entre deux chaînes (0-1)
 * 1 = identique, 0 = complètement différent
 *
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Score de similarité entre 0 et 1
 */
export function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

/**
 * Vérifie si deux chaînes correspondent avec le fuzzy matching
 *
 * @param answer - La réponse donnée par le joueur
 * @param expected - La réponse attendue
 * @param config - Configuration optionnelle du fuzzy matching
 * @returns true si les chaînes correspondent selon le seuil, false sinon
 */
export function fuzzyMatch(
  answer: string,
  expected: string,
  config: FuzzyMatchConfig = DEFAULT_CONFIG
): boolean {
  // Normalisation des deux chaînes
  const normalizedAnswer = normalizeString(answer, config);
  const normalizedExpected = normalizeString(expected, config);

  // Cas d'égalité parfaite après normalisation
  if (normalizedAnswer === normalizedExpected) {
    return true;
  }

  // Calcul du score de similarité
  const similarity = similarityScore(normalizedAnswer, normalizedExpected);

  // Vérification du seuil
  return similarity >= config.threshold;
}

/**
 * Vérifie si une réponse est correcte en comparant avec le titre et l'artiste
 *
 * @param answer - La réponse donnée par le joueur
 * @param trackTitle - Le titre du morceau
 * @param artistName - Le nom de l'artiste
 * @param acceptArtistOnly - Accepter seulement l'artiste comme réponse valide
 * @param acceptTitleOnly - Accepter seulement le titre comme réponse valide
 * @returns Un objet indiquant si la réponse est correcte et quel type de correspondance
 */
/**
 * Sépare les noms d'artistes (feat, &, vs, etc.)
 */
export function splitArtistNames(artistName: string): string[] {
  // Délimiteurs communs : feat, ft, &, ,, et, vs, x, con, with
  // On utilise une regex avec des séparateurs entourés d'espaces (sauf pour ,)
  const separators = / feat\.? | ft\.? | & | et | vs\.? | x | con | with |,/gi;

  return artistName
    .split(separators)
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

export function checkAnswer(
  answer: string,
  trackTitle: string,
  artistName: string,
  acceptArtistOnly: boolean = false,
  acceptTitleOnly: boolean = false
): {
  correct: boolean;
  matchType: 'title' | 'artist' | 'both' | 'none';
  similarity: number;
} {
  // Normalisation
  const normalizedAnswer = normalizeString(answer);
  const normalizedTitle = normalizeString(trackTitle);
  const normalizedArtist = normalizeString(artistName);

  // Combinaisons possibles pour "Artiste + Titre"
  const full1 = `${normalizedTitle} ${normalizedArtist}`;
  const full2 = `${normalizedArtist} ${normalizedTitle}`; // Ordre inverse accepté

  // Calcul des distances principales
  const distTitle = levenshteinDistance(normalizedAnswer, normalizedTitle);
  const distArtist = levenshteinDistance(normalizedAnswer, normalizedArtist);
  const distFull1 = levenshteinDistance(normalizedAnswer, full1);
  const distFull2 = levenshteinDistance(normalizedAnswer, full2);

  // Tolérance d'erreur (4-5 char max comme demandé)
  const MAX_ERRORS = 5;

  // Checks spécifiques de base
  const isTitleCorrect = distTitle <= MAX_ERRORS;
  let isArtistCorrect = distArtist <= MAX_ERRORS;
  const isFullCorrect = distFull1 <= MAX_ERRORS || distFull2 <= MAX_ERRORS;

  // Si l'artiste n'est pas trouvé "exactement", on vérifie les parties (feat.)
  if (!isArtistCorrect) {
    const artistParts = splitArtistNames(artistName);
    // Si on a plusieurs parties, on vérifie chacune
    if (artistParts.length > 1) {
      for (const part of artistParts) {
        const normalizedPart = normalizeString(part);
        const distPart = levenshteinDistance(normalizedAnswer, normalizedPart);
        if (distPart <= MAX_ERRORS) {
          isArtistCorrect = true;
          break;
        }
      }
    }
  }

  // Calcul pour la similarité (statistique - approximatif ici car on a plusieurs checks)
  const bestDist = Math.min(distTitle, distArtist, distFull1, distFull2);
  const maxLength = Math.max(normalizedAnswer.length, full1.length);
  const similarity = 1 - (bestDist / maxLength);

  // 1. Si on force "Artiste seulement"
  if (acceptArtistOnly) {
    return { correct: isArtistCorrect, matchType: isArtistCorrect ? 'artist' : 'none', similarity };
  }

  // 2. Si on force "Titre seulement"
  if (acceptTitleOnly) {
    return { correct: isTitleCorrect, matchType: isTitleCorrect ? 'title' : 'none', similarity };
  }

  // 3. Mode standard : On vérifie tout ce qu'on trouve
  if (isFullCorrect) {
    return { correct: true, matchType: 'both', similarity };
  }

  // Vérification partielle (Artiste seulement)
  if (isArtistCorrect) {
    return { correct: true, matchType: 'artist', similarity };
  }

  // Vérification partielle (Titre seulement)
  if (isTitleCorrect) {
    return { correct: true, matchType: 'title', similarity };
  }

  return { correct: false, matchType: 'none', similarity };
}

/**
 * Classe AnswerChecker pour encapsuler la logique de validation
 */
export class AnswerChecker {
  private config: FuzzyMatchConfig;

  constructor(config: Partial<FuzzyMatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Vérifie si une réponse est correcte
   */
  check(
    answer: string,
    trackTitle: string,
    artistName: string,
    acceptArtistOnly: boolean = false,
    acceptTitleOnly: boolean = false
  ) {
    return checkAnswer(answer, trackTitle, artistName, acceptArtistOnly, acceptTitleOnly);
  }

  /**
   * Normalise une chaîne avec la configuration de l'instance
   */
  normalize(str: string): string {
    return normalizeString(str, this.config);
  }

  /**
   * Calcule la similarité entre deux chaînes
   */
  getSimilarity(str1: string, str2: string): number {
    const normalized1 = normalizeString(str1, this.config);
    const normalized2 = normalizeString(str2, this.config);
    return similarityScore(normalized1, normalized2);
  }

  /**
   * Met à jour la configuration du checker
   */
  updateConfig(config: Partial<FuzzyMatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): FuzzyMatchConfig {
    return { ...this.config };
  }
}

// Export d'une instance par défaut pour faciliter l'utilisation
export const defaultAnswerChecker = new AnswerChecker();
