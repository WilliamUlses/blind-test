/**
 * Page Défi du jour — 1 musique par jour, REST API
 * Auth required: fetches track from server, submits answer via REST
 * Falls back to localStorage info for guests (view-only streak/calendar)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Trophy, Play, Flame, Pause, Send, Loader2, LogIn, Lock, Volume2, VolumeX } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuth';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

type DailyPhase = 'idle' | 'loading' | 'playing' | 'submitting' | 'result';

interface DailyTrackInfo {
    previewUrl: string;
    albumCover: string;
    genre: string | null;
    alreadyCompleted: boolean;
    existingScore?: number;
}

interface DailyResultInfo {
    correct: boolean;
    score: number;
    trackTitle: string;
    artistName: string;
    albumCover: string;
    streak: number;
    answeredInMs: number;
}

interface LeaderboardEntry {
    rank: number;
    pseudo: string;
    score: number;
    answeredInMs: number | null;
}

interface HistoryEntry {
    date: string;
    score: number;
    completed: boolean;
}

export default function DailyChallengePage() {
    const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const authLoading = useAuthStore((s) => s.isLoading);
    const authUser = useAuthStore((s) => s.user);
    const fetchMe = useAuthStore((s) => s.fetchMe);

    const audio = useAudioPlayer();

    const [phase, setPhase] = useState<DailyPhase>('idle');
    const [trackInfo, setTrackInfo] = useState<DailyTrackInfo | null>(null);
    const [answer, setAnswer] = useState('');
    const [result, setResult] = useState<DailyResultInfo | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const startTimeRef = useRef<number>(0);

    const today = new Date().toISOString().slice(0, 10);

    // Fetch leaderboard (available to everyone)
    useEffect(() => {
        fetch(`${API_URL}/api/daily/leaderboard`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : { leaderboard: [] }))
            .then((data) => setLeaderboard(data.leaderboard || []))
            .catch(() => {});
    }, [result]); // Refetch after submitting

    // Fetch history when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;
        fetch(`${API_URL}/api/daily/history`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : { history: [] }))
            .then((data) => setHistory(data.history || []))
            .catch(() => {});
    }, [isAuthenticated, result]);

    // Compute streak from history
    const streak = useMemo(() => {
        if (!isAuthenticated && authUser?.dailyStreak) return authUser.dailyStreak;
        let count = 0;
        const now = new Date();
        for (let i = 0; i < 60; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const entry = history.find((e) => e.date === dateStr && e.completed);
            if (entry) {
                count++;
            } else if (i > 0) {
                break;
            }
        }
        return count;
    }, [history, isAuthenticated, authUser]);

    // Build last 30 days grid
    const calendarDays = useMemo(() => {
        const days: { date: string; label: string; status: 'completed' | 'missed' | 'today' }[] = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const entry = history.find((e) => e.date === dateStr);
            const isToday = dateStr === today;

            days.push({
                date: dateStr,
                label: String(d.getDate()),
                status: isToday
                    ? entry?.completed ? 'completed' : 'today'
                    : entry?.completed ? 'completed' : 'missed',
            });
        }
        return days;
    }, [history, today]);

    const alreadyCompleted = trackInfo?.alreadyCompleted || result !== null;

    // Start playing: fetch track from server, load audio
    const handleStartDaily = useCallback(async () => {
        if (!isAuthenticated) {
            router.push('/auth');
            return;
        }
        setError(null);
        setPhase('loading');

        try {
            const res = await fetch(`${API_URL}/api/daily/track`, { credentials: 'include' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Erreur de chargement');
                setPhase('idle');
                return;
            }

            const data = await res.json();
            setTrackInfo(data);

            if (data.alreadyCompleted) {
                // Already completed today — show result directly
                setResult({
                    correct: true,
                    score: data.existingScore || 0,
                    trackTitle: data.trackTitle || '???',
                    artistName: data.artistName || '???',
                    albumCover: data.albumCover || '',
                    streak: authUser?.dailyStreak || 0,
                    answeredInMs: 0,
                });
                setPhase('result');
                return;
            }

            // Load audio
            audio.load(data.previewUrl);
            startTimeRef.current = Date.now();
            setPhase('playing');
        } catch {
            setError('Erreur de connexion au serveur');
            setPhase('idle');
        }
    }, [isAuthenticated, router, audio, authUser]);

    // Auto-play when audio loaded
    useEffect(() => {
        if (phase === 'playing' && !audio.isLoading && !audio.isPlaying && audio.duration > 0 && !audio.error) {
            audio.play();
        }
    }, [phase, audio.isLoading, audio.isPlaying, audio.duration, audio.error]);

    // Submit answer
    const handleSubmit = useCallback(async () => {
        if (!answer.trim() || phase !== 'playing') return;
        setPhase('submitting');

        const answeredInMs = Date.now() - startTimeRef.current;

        try {
            const res = await fetch(`${API_URL}/api/daily/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ answer: answer.trim(), answeredInMs }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Erreur');
                setPhase('playing');
                return;
            }

            audio.stop();
            setResult(data);
            setPhase('result');

            // Refresh auth user to get updated streak
            fetchMe();
        } catch {
            setError('Erreur de connexion');
            setPhase('playing');
        }
    }, [answer, phase, audio, fetchMe]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') handleSubmit();
        },
        [handleSubmit]
    );

    const toggleMute = useCallback(() => {
        setMuted((m) => {
            audio.setVolume(m ? 0.8 : 0);
            return !m;
        });
    }, [audio]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 via-orange-500/5 to-transparent" />
                <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 pb-8">
                    <button
                        onClick={() => { audio.stop(); router.push('/'); }}
                        className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-bold mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </button>

                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-8 h-8 text-amber-400" />
                            <h1 className="text-white font-black text-2xl uppercase tracking-wider">
                                Défi du jour
                            </h1>
                        </div>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 space-y-6">
                {/* Streak */}
                {streak > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 py-2"
                    >
                        <Flame className="w-5 h-5 text-orange-400" />
                        <span className="text-orange-400 font-black text-lg">{streak}</span>
                        <span className="text-white/40 text-xs font-bold uppercase tracking-wider">
                            jour{streak > 1 ? 's' : ''} de suite
                        </span>
                    </motion.div>
                )}

                {/* Auth gate for guests */}
                {!isAuthenticated && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center"
                    >
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                        <h2 className="text-white font-black text-lg uppercase tracking-wider mb-2">
                            Connecte-toi pour jouer
                        </h2>
                        <p className="text-white/40 text-xs font-bold mb-4">
                            Le défi du jour nécessite un compte pour sauvegarder tes scores et ton streak
                        </p>
                        <button
                            onClick={() => router.push('/auth')}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase tracking-wider text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                        >
                            <LogIn className="w-4 h-4" />
                            Connexion
                        </button>
                    </motion.div>
                )}

                {/* Challenge card — authenticated users */}
                {isAuthenticated && (
                    <AnimatePresence mode="wait">
                        {/* IDLE phase */}
                        {phase === 'idle' && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center"
                            >
                                <div className="text-4xl mb-3">🎵</div>
                                <h2 className="text-white font-black text-lg uppercase tracking-wider mb-1">
                                    1 musique à deviner
                                </h2>
                                <p className="text-white/40 text-xs font-bold mb-4">
                                    Trouve le titre ou l&apos;artiste le plus vite possible
                                </p>
                                <button
                                    onClick={handleStartDaily}
                                    className="w-full max-w-xs mx-auto py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase tracking-wider text-sm transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
                                >
                                    <Play className="w-4 h-4" />
                                    Jouer
                                </button>
                            </motion.div>
                        )}

                        {/* LOADING phase */}
                        {phase === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center"
                            >
                                <Loader2 className="w-8 h-8 text-amber-400 mx-auto mb-3 animate-spin" />
                                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                                    Chargement...
                                </p>
                            </motion.div>
                        )}

                        {/* PLAYING phase */}
                        {(phase === 'playing' || phase === 'submitting') && trackInfo && (
                            <motion.div
                                key="playing"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                            >
                                {/* Album cover + audio controls */}
                                <div className="flex flex-col items-center gap-4 mb-6">
                                    {trackInfo.albumCover && (
                                        <img
                                            src={trackInfo.albumCover}
                                            alt=""
                                            className="w-32 h-32 rounded-2xl object-cover shadow-xl blur-sm"
                                        />
                                    )}

                                    {/* Audio progress */}
                                    <div className="w-full max-w-xs">
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                                                style={{ width: `${audio.progress}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-white/30 text-[10px]">
                                                {Math.floor(audio.currentTime)}s
                                            </span>
                                            <button onClick={toggleMute} className="text-white/30 hover:text-white/60 transition-colors">
                                                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {trackInfo.genre && (
                                        <span className="px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                            {trackInfo.genre}
                                        </span>
                                    )}
                                </div>

                                {/* Answer input */}
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Titre ou artiste..."
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-amber-500/50 transition-all text-center"
                                        autoFocus
                                        disabled={phase === 'submitting'}
                                    />
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!answer.trim() || phase === 'submitting'}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase tracking-wider text-sm transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-30 flex items-center justify-center gap-2"
                                    >
                                        {phase === 'submitting' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Valider
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* RESULT phase */}
                        {phase === 'result' && result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center"
                            >
                                <div className="text-4xl mb-3">{result.correct ? '✅' : '❌'}</div>
                                <h2 className="text-white font-black text-lg uppercase tracking-wider mb-1">
                                    {result.correct ? 'Bravo !' : 'Raté !'}
                                </h2>

                                {/* Track reveal */}
                                <div className="flex items-center justify-center gap-3 my-4">
                                    {result.albumCover && (
                                        <img src={result.albumCover} alt="" className="w-16 h-16 rounded-xl object-cover" />
                                    )}
                                    <div className="text-left">
                                        <p className="text-white font-black text-sm">{result.trackTitle}</p>
                                        <p className="text-white/40 text-xs font-bold">{result.artistName}</p>
                                    </div>
                                </div>

                                {/* Score */}
                                {result.correct && (
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <Trophy className="w-5 h-5 text-amber-400" />
                                        <span className="text-amber-400 font-black text-xl">{result.score.toLocaleString()} pts</span>
                                    </div>
                                )}

                                {result.answeredInMs > 0 && (
                                    <p className="text-white/30 text-xs font-bold mb-4">
                                        Répondu en {(result.answeredInMs / 1000).toFixed(1)}s
                                    </p>
                                )}

                                <button
                                    onClick={() => { setPhase('idle'); setAnswer(''); setResult(null); setTrackInfo(null); }}
                                    className="mt-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-xs uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Fermer
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {/* Error */}
                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-400 text-xs text-center font-bold"
                    >
                        {error}
                    </motion.p>
                )}

                {/* Leaderboard */}
                {leaderboard.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
                            Classement du jour
                        </h2>
                        <div className="space-y-2">
                            {leaderboard.slice(0, 10).map((entry, i) => (
                                <div
                                    key={`${entry.pseudo}-${i}`}
                                    className={`flex items-center justify-between p-3 rounded-xl border ${
                                        i < 3
                                            ? 'bg-amber-500/10 border-amber-500/20'
                                            : 'bg-white/5 border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-white/40 text-sm font-black w-6">
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                        <span className="text-white text-xs font-bold">{entry.pseudo}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {entry.answeredInMs != null && (
                                            <span className="text-white/20 text-[10px]">
                                                {(entry.answeredInMs / 1000).toFixed(1)}s
                                            </span>
                                        )}
                                        <span className="text-amber-400 font-black text-sm">{entry.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Calendar grid (last 30 days) — only for authenticated */}
                {isAuthenticated && history.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
                            30 derniers jours
                        </h2>
                        <div className="grid grid-cols-10 gap-1.5">
                            {calendarDays.map((day) => (
                                <div
                                    key={day.date}
                                    title={day.date}
                                    className={`
                                        aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all
                                        ${day.status === 'completed'
                                            ? 'bg-green-500/80 text-white'
                                            : day.status === 'today'
                                                ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50 animate-pulse'
                                                : 'bg-white/5 text-white/15'
                                        }
                                    `}
                                >
                                    {day.label}
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 mt-2 justify-center">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-green-500/80" />
                                <span className="text-white/30 text-[9px] font-bold">Complété</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/50" />
                                <span className="text-white/30 text-[9px] font-bold">Aujourd&apos;hui</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-white/5" />
                                <span className="text-white/30 text-[9px] font-bold">Manqué</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
