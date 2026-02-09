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
 * Nettoie les mentions "feat" / "ft" des titres de morceaux
 * Ex: "Love Me Again (feat. John Newman)" → "Love Me Again"
 * Ex: "Song [ft. Artist]" → "Song"
 * Ex: "Song - feat. Artist" → "Song"
 */
export function stripFeaturing(title: string): string {
  return title
    // Parenthèses/crochets contenant feat/ft/featuring
    .replace(/\s*[\(\[][^)\]]*\b(?:feat|ft|featuring)\.?\b[^)\]]*[\)\]]/gi, '')
    // "- feat. Artist" ou "- ft. Artist" en fin de chaîne
    .replace(/\s*-\s*(?:feat|ft|featuring)\.?\s.*/gi, '')
    // "feat. Artist" en fin de chaîne (sans tiret ni parenthèses)
    .replace(/\s+(?:feat|ft|featuring)\.?\s.*/gi, '')
    .trim();
}

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
  // Normalisation - strip "feat." from title so users don't need to type it
  const normalizedAnswer = normalizeString(answer);
  const cleanTitle = stripFeaturing(trackTitle);
  const normalizedTitle = normalizeString(cleanTitle);
  const normalizedArtist = normalizeString(artistName);

  // Seuil de similarité proportionnel (0.75 = 75% de ressemblance minimum)
  const threshold = GAME_CONSTANTS.FUZZY_THRESHOLD;

  // Combinaisons possibles pour "Artiste + Titre"
  const full1 = `${normalizedTitle} ${normalizedArtist}`;
  const full2 = `${normalizedArtist} ${normalizedTitle}`; // Ordre inverse accepté

  // Calcul des similarités (proportionnel à la longueur des chaînes)
  const simTitle = similarityScore(normalizedAnswer, normalizedTitle);
  const simArtist = similarityScore(normalizedAnswer, normalizedArtist);
  const simFull1 = similarityScore(normalizedAnswer, full1);
  const simFull2 = similarityScore(normalizedAnswer, full2);

  // Checks basés sur le seuil proportionnel
  const isTitleCorrect = simTitle >= threshold;
  let isArtistCorrect = simArtist >= threshold;
  const isFullCorrect = simFull1 >= threshold || simFull2 >= threshold;

  // Si l'artiste n'est pas trouvé, on vérifie les parties (feat.)
  if (!isArtistCorrect) {
    const artistParts = splitArtistNames(artistName);
    if (artistParts.length > 1) {
      for (const part of artistParts) {
        const normalizedPart = normalizeString(part);
        if (similarityScore(normalizedAnswer, normalizedPart) >= threshold) {
          isArtistCorrect = true;
          break;
        }
      }
    }
  }

  // Meilleure similarité trouvée
  const similarity = Math.max(simTitle, simArtist, simFull1, simFull2);

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
