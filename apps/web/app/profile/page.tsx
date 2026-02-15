/**
 * Page Profil — Stats du joueur, historique, daily challenge
 * Auth-aware: server stats when authenticated, localStorage when guest
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Flame, Clock, Music, Star, Calendar, LogIn } from 'lucide-react';
import { usePlayerProfile } from '../../hooks/usePlayerProfile';
import { useAuthStore } from '../../hooks/useAuth';

const AVATARS = ['🎵', '🎸', '🎤', '🎹', '🥁', '🎷', '🎺', '🎻', '🎧', '🎶', '🎼', '🎙️'];

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default function ProfilePage() {
    const router = useRouter();
    const {
        profile: localProfile,
        loaded: localLoaded,
        updateAvatar: localUpdateAvatar,
        isTodayCompleted: localIsTodayCompleted,
    } = usePlayerProfile();

    const authUser = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const authLoading = useAuthStore((s) => s.isLoading);
    const updateProfile = useAuthStore((s) => s.updateProfile);

    const [serverHistory, setServerHistory] = useState<any[]>([]);

    // Fetch game history from server when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;
        fetch(`${API_URL}/api/profile/history`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : { history: [] }))
            .then((data) => setServerHistory(data.history || []))
            .catch(() => {});
    }, [isAuthenticated]);

    // Derived stats
    const stats = useMemo(() => {
        if (isAuthenticated && authUser) {
            return {
                gamesPlayed: authUser.gamesPlayed,
                gamesWon: authUser.gamesWon,
                totalScore: authUser.totalScore,
                bestScore: authUser.bestScore,
                bestStreak: authUser.bestStreak,
                totalResponseTimeMs: authUser.totalResponseTimeMs,
                totalAnswers: authUser.totalAnswers,
                favoriteGenre: authUser.favoriteGenre,
            };
        }
        return localProfile.stats;
    }, [isAuthenticated, authUser, localProfile.stats]);

    const winRate = stats.gamesPlayed > 0
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0;

    const avgResponseTime = stats.totalAnswers > 0
        ? Math.round(stats.totalResponseTimeMs / stats.totalAnswers)
        : 0;

    const pseudo = isAuthenticated && authUser ? authUser.pseudo : localProfile.pseudo;
    const avatarIndex = isAuthenticated && authUser ? authUser.avatarIndex : localProfile.avatarIndex;
    const createdAt = isAuthenticated && authUser ? authUser.createdAt : localProfile.createdAt;

    const handleAvatarChange = useCallback(() => {
        const nextIndex = (avatarIndex + 1) % AVATARS.length;
        if (isAuthenticated) {
            updateProfile({ avatarIndex: nextIndex });
        } else {
            localUpdateAvatar(nextIndex);
        }
    }, [avatarIndex, isAuthenticated, updateProfile, localUpdateAvatar]);

    const loaded = authLoading ? false : (isAuthenticated ? true : localLoaded);

    if (!loaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
                <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 pb-8">
                    <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-bold mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </button>

                    {/* Auth banner for guests */}
                    {!isAuthenticated && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6"
                        >
                            <button
                                onClick={() => router.push('/auth')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-white/80 text-xs font-bold uppercase tracking-wider hover:from-primary/30 hover:to-secondary/30 transition-all"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                Connecte-toi pour sauvegarder tes stats
                            </button>
                        </motion.div>
                    )}

                    {/* Avatar + Name */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="text-5xl">{AVATARS[avatarIndex] || '🎵'}</div>
                            <button
                                onClick={handleAvatarChange}
                                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                            >
                                ✏️
                            </button>
                        </div>
                        <h1 className="text-white font-black text-2xl uppercase tracking-wider">
                            {pseudo || 'Joueur'}
                        </h1>
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                            {isAuthenticated ? (
                                <>Membre depuis {new Date(createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</>
                            ) : (
                                'Profil local'
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-lg mx-auto px-4 -mt-2">
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { icon: <Trophy className="w-5 h-5" />, label: 'Parties jouées', value: stats.gamesPlayed, color: 'text-purple-400' },
                        { icon: <Target className="w-5 h-5" />, label: 'Taux de victoire', value: `${winRate}%`, color: 'text-green-400' },
                        { icon: <Star className="w-5 h-5" />, label: 'Meilleur score', value: stats.bestScore.toLocaleString(), color: 'text-yellow-400' },
                        { icon: <Flame className="w-5 h-5" />, label: 'Meilleur streak', value: stats.bestStreak, color: 'text-orange-400' },
                        { icon: <Clock className="w-5 h-5" />, label: 'Temps moyen', value: avgResponseTime > 0 ? `${(avgResponseTime / 1000).toFixed(1)}s` : '–', color: 'text-cyan-400' },
                        { icon: <Music className="w-5 h-5" />, label: 'Genre favori', value: stats.favoriteGenre || '–', color: 'text-pink-400' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                        >
                            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                            <div className="text-white font-black text-lg">{stat.value}</div>
                            <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Daily Challenge Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4"
                >
                    <button
                        onClick={() => router.push('/daily')}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-left hover:from-amber-500/30 hover:to-orange-500/30 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-amber-400" />
                                <div>
                                    <div className="text-white font-black text-sm uppercase tracking-wider">Défi du jour</div>
                                    <div className="text-amber-400/60 text-xs font-bold">
                                        {isAuthenticated
                                            ? (authUser?.dailyStreak ? `🔥 ${authUser.dailyStreak} jour${authUser.dailyStreak > 1 ? 's' : ''} de suite` : 'Pas encore joué')
                                            : (localIsTodayCompleted() ? '✓ Complété' : "Pas encore joué aujourd'hui !")
                                        }
                                    </div>
                                </div>
                            </div>
                            <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
                        </div>
                    </button>
                </motion.div>

                {/* Recent Games — server history when authenticated */}
                {isAuthenticated && serverHistory.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6"
                    >
                        <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
                            Parties récentes
                        </h2>
                        <div className="space-y-2">
                            {serverHistory.slice(0, 10).map((game: any, i: number) => (
                                <div
                                    key={`${game.roundId || i}-${i}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">💿</span>
                                        <div>
                                            <div className="text-white text-xs font-bold">{game.trackTitle}</div>
                                            <div className="text-white/30 text-[10px]">
                                                {new Date(game.playedAt).toLocaleDateString('fr-FR')} • {game.artistName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-primary font-black text-sm">{game.totalPoints?.toLocaleString() || '0'}</div>
                                        <div className="text-white/30 text-[10px]">pts</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Recent Games — localStorage when guest */}
                {!isAuthenticated && localProfile.stats.recentGames.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6"
                    >
                        <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
                            Parties récentes
                        </h2>
                        <div className="space-y-2">
                            {localProfile.stats.recentGames.slice(0, 10).map((game, i) => (
                                <div
                                    key={`${game.date}-${i}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg ${game.won ? '' : 'opacity-40'}`}>
                                            {game.won ? '🏆' : '💿'}
                                        </span>
                                        <div>
                                            <div className="text-white text-xs font-bold capitalize">{game.mode}</div>
                                            <div className="text-white/30 text-[10px]">
                                                {new Date(game.date).toLocaleDateString('fr-FR')} • {game.genre || 'Random'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-primary font-black text-sm">{game.score.toLocaleString()}</div>
                                        <div className="text-white/30 text-[10px]">
                                            #{game.rank}/{game.totalPlayers}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Empty state */}
                {stats.gamesPlayed === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 text-center"
                    >
                        <div className="text-4xl mb-3">🎵</div>
                        <p className="text-white/40 text-sm font-bold">Aucune partie jouée pour l&apos;instant</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
                        >
                            Jouer maintenant
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
