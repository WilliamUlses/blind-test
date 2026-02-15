/**
 * DailyService - Daily challenge management
 * One track per day, one attempt per user, leaderboard
 */

import { prisma } from '../lib/prisma';
import { itunesService } from './iTunesService';
import { AnswerChecker } from './AnswerChecker';
import { GAME_CONSTANTS } from '../../../../packages/shared/types';

const answerChecker = new AnswerChecker();

// Genre rotation for daily challenges (deterministic from date)
const DAILY_GENRES = ['pop', 'rock', 'rap', 'dance', 'jazz', 'reggae', 'electro', 'blues'];

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateSeed(dateStr: string): number {
  let hash = 0;
  const compact = dateStr.replace(/-/g, '');
  for (let i = 0; i < compact.length; i++) {
    hash = (hash * 31 + compact.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export class DailyService {
  /**
   * Get today's track. Creates it if it doesn't exist yet.
   */
  async getTodaysTrack(): Promise<{
    previewUrl: string;
    albumCover: string;
    genre: string | null;
    date: string;
  } | null> {
    const today = getTodayDateString();

    // Check if we already have a track for today
    let dailyTrack = await prisma.dailyTrack.findUnique({ where: { date: today } });

    if (!dailyTrack) {
      // Generate one using iTunes
      const seed = dateSeed(today);
      const genre = DAILY_GENRES[seed % DAILY_GENRES.length];

      const track = await itunesService.getRandomTrack(genre);
      if (!track) return null;

      dailyTrack = await prisma.dailyTrack.create({
        data: {
          date: today,
          trackId: track.trackId,
          trackTitle: track.trackTitle,
          artistName: track.artistName,
          previewUrl: track.previewUrl,
          albumCover: track.albumCover,
          releaseYear: track.releaseYear,
          genre,
        },
      });
    }

    // Return only safe fields (no title/artist to prevent cheating)
    return {
      previewUrl: dailyTrack.previewUrl,
      albumCover: dailyTrack.albumCover,
      genre: dailyTrack.genre,
      date: dailyTrack.date,
    };
  }

  /**
   * Submit an answer for today's daily challenge.
   */
  async submitAnswer(
    userId: string,
    answer: string,
    timestamp: number
  ): Promise<{
    correct: boolean;
    score: number;
    trackTitle: string;
    artistName: string;
    albumCover: string;
    releaseYear: number;
    alreadyCompleted: boolean;
  }> {
    const today = getTodayDateString();

    const dailyTrack = await prisma.dailyTrack.findUnique({ where: { date: today } });
    if (!dailyTrack) {
      throw new Error('No daily track available');
    }

    // Check if already completed
    const existing = await prisma.dailyResult.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing?.completed) {
      return {
        correct: existing.score > 0,
        score: existing.score,
        trackTitle: dailyTrack.trackTitle,
        artistName: dailyTrack.artistName,
        albumCover: dailyTrack.albumCover,
        releaseYear: dailyTrack.releaseYear,
        alreadyCompleted: true,
      };
    }

    // Validate answer
    const result = answerChecker.check(
      answer,
      dailyTrack.trackTitle,
      dailyTrack.artistName,
      false, // acceptArtistOnly
      false  // acceptTitleOnly
    );

    const isCorrect = result.matchType !== null;
    const answeredInMs = timestamp ? Math.max(0, Math.min(timestamp, 30000)) : null;

    // Calculate score: base 1000, time bonus if correct
    let score = 0;
    if (isCorrect && answeredInMs !== null) {
      const timeRatio = Math.max(0, 1 - answeredInMs / 30000);
      score = Math.floor(GAME_CONSTANTS.BASE_POINTS + timeRatio * GAME_CONSTANTS.BASE_POINTS * GAME_CONSTANTS.TIME_BONUS_MULTIPLIER);
    }

    const attempts = (existing?.attempts || 0) + 1;

    // Upsert result
    await prisma.dailyResult.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        score: isCorrect ? score : 0,
        completed: isCorrect,
        answeredInMs,
        attempts,
      },
      create: {
        userId,
        date: today,
        trackId: dailyTrack.trackId,
        score: isCorrect ? score : 0,
        completed: isCorrect,
        answeredInMs,
        attempts,
      },
    });

    // Update daily streak if correct
    if (isCorrect) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastDailyDate: true, dailyStreak: true },
      });

      if (user) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const newStreak = user.lastDailyDate === yesterdayStr
          ? user.dailyStreak + 1
          : 1;

        await prisma.user.update({
          where: { id: userId },
          data: {
            dailyStreak: newStreak,
            lastDailyDate: today,
          },
        });
      }
    }

    return {
      correct: isCorrect,
      score: isCorrect ? score : 0,
      trackTitle: dailyTrack.trackTitle,
      artistName: dailyTrack.artistName,
      albumCover: dailyTrack.albumCover,
      releaseYear: dailyTrack.releaseYear,
      alreadyCompleted: false,
    };
  }

  /**
   * Get leaderboard for a given date (default: today)
   */
  async getLeaderboard(date?: string): Promise<{
    entries: { pseudo: string; score: number; answeredInMs: number | null; avatarIndex: number }[];
  }> {
    const targetDate = date || getTodayDateString();

    const results = await prisma.dailyResult.findMany({
      where: { date: targetDate, completed: true },
      orderBy: { score: 'desc' },
      take: 50,
      include: {
        user: {
          select: { pseudo: true, avatarIndex: true },
        },
      },
    });

    return {
      entries: results.map((r) => ({
        pseudo: r.user.pseudo,
        score: r.score,
        answeredInMs: r.answeredInMs,
        avatarIndex: r.user.avatarIndex,
      })),
    };
  }

  /**
   * Get daily history for a user (last 30 days)
   */
  async getHistory(userId: string): Promise<{
    entries: { date: string; score: number; completed: boolean; attempts: number }[];
    streak: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const minDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const results = await prisma.dailyResult.findMany({
      where: {
        userId,
        date: { gte: minDate },
      },
      orderBy: { date: 'desc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyStreak: true },
    });

    return {
      entries: results.map((r) => ({
        date: r.date,
        score: r.score,
        completed: r.completed,
        attempts: r.attempts,
      })),
      streak: user?.dailyStreak || 0,
    };
  }
}

export const dailyService = new DailyService();
