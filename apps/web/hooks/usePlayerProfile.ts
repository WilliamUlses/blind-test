'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Types ─────────────────────────────────────────────────

export interface GameRecord {
    date: string;           // ISO date
    mode: string;           // gameMode
    score: number;
    rank: number;           // 1-based position
    totalPlayers: number;
    won: boolean;
    genre: string | null;
}

export interface PlayerStats {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    bestScore: number;
    bestStreak: number;
    totalResponseTimeMs: number;
    totalAnswers: number; // to compute avg
    favoriteGenre: string | null;
    genreCounts: Record<string, number>;
    recentGames: GameRecord[]; // last 20
}

export interface DailyChallengeEntry {
    date: string;       // YYYY-MM-DD
    score: number;
    completed: boolean;
}

export interface PlayerProfile {
    pseudo: string;
    avatarIndex: number;
    stats: PlayerStats;
    dailyChallenges: DailyChallengeEntry[];
    createdAt: string; // ISO date
}

// ─── Defaults ──────────────────────────────────────────────

const DEFAULT_STATS: PlayerStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    bestScore: 0,
    bestStreak: 0,
    totalResponseTimeMs: 0,
    totalAnswers: 0,
    favoriteGenre: null,
    genreCounts: {},
    recentGames: [],
};

const DEFAULT_PROFILE: PlayerProfile = {
    pseudo: '',
    avatarIndex: 0,
    stats: { ...DEFAULT_STATS },
    dailyChallenges: [],
    createdAt: new Date().toISOString(),
};

const STORAGE_KEY = 'blindtest_player_profile';

// ─── Hook ──────────────────────────────────────────────────

export function usePlayerProfile() {
    const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
    const [loaded, setLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as PlayerProfile;
                setProfile({ ...DEFAULT_PROFILE, ...parsed, stats: { ...DEFAULT_STATS, ...parsed.stats } });
            }
        } catch {
            // ignore parse errors
        }
        setLoaded(true);
    }, []);

    // Save to localStorage on change
    const save = useCallback((updated: PlayerProfile) => {
        setProfile(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // storage full, ignore
        }
    }, []);

    // Update pseudo
    const updatePseudo = useCallback((pseudo: string) => {
        save({ ...profile, pseudo });
    }, [profile, save]);

    // Update avatar
    const updateAvatar = useCallback((avatarIndex: number) => {
        save({ ...profile, avatarIndex });
    }, [profile, save]);

    // Record a game result
    const recordGame = useCallback((record: GameRecord) => {
        const stats = { ...profile.stats };
        stats.gamesPlayed++;
        stats.totalScore += record.score;
        if (record.score > stats.bestScore) stats.bestScore = record.score;
        if (record.won) stats.gamesWon++;

        // Track genre
        if (record.genre) {
            stats.genreCounts = { ...stats.genreCounts };
            stats.genreCounts[record.genre] = (stats.genreCounts[record.genre] || 0) + 1;
            // Find favorite genre
            let maxCount = 0;
            let fav: string | null = null;
            for (const [genre, count] of Object.entries(stats.genreCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    fav = genre;
                }
            }
            stats.favoriteGenre = fav;
        }

        // Recent games (keep last 20)
        stats.recentGames = [record, ...stats.recentGames].slice(0, 20);

        save({ ...profile, stats });
    }, [profile, save]);

    // Record an answer time (for avg calculation)
    const recordAnswerTime = useCallback((timeMs: number) => {
        const stats = { ...profile.stats };
        stats.totalResponseTimeMs += timeMs;
        stats.totalAnswers++;
        save({ ...profile, stats });
    }, [profile, save]);

    // Update best streak
    const updateStreak = useCallback((streak: number) => {
        if (streak > profile.stats.bestStreak) {
            save({ ...profile, stats: { ...profile.stats, bestStreak: streak } });
        }
    }, [profile, save]);

    // Record daily challenge
    const recordDailyChallenge = useCallback((score: number) => {
        const today = new Date().toISOString().slice(0, 10);
        const existing = profile.dailyChallenges.find(d => d.date === today);
        if (existing) {
            // Update if better score
            if (score > existing.score) {
                const updated = profile.dailyChallenges.map(d =>
                    d.date === today ? { ...d, score, completed: true } : d
                );
                save({ ...profile, dailyChallenges: updated });
            }
        } else {
            save({
                ...profile,
                dailyChallenges: [
                    ...profile.dailyChallenges.slice(-29), // keep last 30 days
                    { date: today, score, completed: true },
                ],
            });
        }
    }, [profile, save]);

    // Check if today's daily is completed
    const isTodayCompleted = useCallback(() => {
        const today = new Date().toISOString().slice(0, 10);
        return profile.dailyChallenges.some(d => d.date === today && d.completed);
    }, [profile]);

    // Computed
    const winRate = profile.stats.gamesPlayed > 0
        ? Math.round((profile.stats.gamesWon / profile.stats.gamesPlayed) * 100)
        : 0;

    const avgResponseTime = profile.stats.totalAnswers > 0
        ? Math.round(profile.stats.totalResponseTimeMs / profile.stats.totalAnswers)
        : 0;

    return {
        profile,
        loaded,
        winRate,
        avgResponseTime,
        updatePseudo,
        updateAvatar,
        recordGame,
        recordAnswerTime,
        updateStreak,
        recordDailyChallenge,
        isTodayCompleted,
    };
}
