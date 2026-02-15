/**
 * Page de résultats finaux
 * Design moderne avec podium, partage et stats
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRoomState, useIsHost, useGamePhase, useGameMode } from '../../../stores/gameStore';
import { useGameActions } from '../../../hooks/useGameActions';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Share2, Copy, Check, RotateCcw, Home, Music } from 'lucide-react';
import { useGameStore } from '../../../stores/gameStore';
import { usePlayerProfile } from '../../../hooks/usePlayerProfile';
import { useAuthStore } from '../../../hooks/useAuth';

const MEDAL_COLORS = [
  'from-yellow-400/20 to-yellow-600/10 border-yellow-500/40',
  'from-gray-300/20 to-gray-500/10 border-gray-400/40',
  'from-amber-600/20 to-amber-800/10 border-amber-700/40',
];

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const roomState = useRoomState();
  const isHost = useIsHost();
  const gamePhase = useGamePhase();
  const { returnToLobby, leaveRoom } = useGameActions();
  const gameMode = useGameMode();
  const isTimeline = gameMode === 'timeline';
  const [copied, setCopied] = useState(false);
  const missedTracks = useGameStore(s => s.missedTracks);
  const [showDiscoveries, setShowDiscoveries] = useState(false);
  const { recordGame } = usePlayerProfile();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [statsRecorded, setStatsRecorded] = useState(false);

  // When the room resets to WAITING (host clicked replay), redirect everyone to lobby
  useEffect(() => {
    if (gamePhase === 'WAITING') {
      router.push(`/lobby/${roomCode}`);
    }
  }, [gamePhase, roomCode, router]);

  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort((a, b) =>
      isTimeline
        ? b.timelineCards.length - a.timelineCards.length
        : b.score - a.score
    );
  }, [roomState, isTimeline]);

  // Record game stats (once) — skip for authenticated users (server already persists via endGame)
  useEffect(() => {
    if (!roomState || statsRecorded || sortedPlayers.length === 0 || isAuthenticated) return;
    const localId = useGameStore.getState().localPlayer.id;
    const myIndex = sortedPlayers.findIndex(p => p.id === localId);
    if (myIndex === -1) return;
    const me = sortedPlayers[myIndex];
    recordGame({
      date: new Date().toISOString(),
      mode: gameMode || 'classic',
      score: isTimeline ? me.timelineCards.length : me.score,
      rank: myIndex + 1,
      totalPlayers: sortedPlayers.length,
      won: myIndex === 0,
      genre: roomState.settings.genre || null,
    });
    setStatsRecorded(true);
  }, [roomState, sortedPlayers, statsRecorded, recordGame, gameMode, isTimeline, isAuthenticated]);

  const top3 = sortedPlayers.slice(0, 3);
  const others = sortedPlayers.slice(3);

  const shareText = useMemo(() => {
    if (sortedPlayers.length === 0) return '';
    const winner = sortedPlayers[0];
    if (isTimeline) {
      return `🎵 Timeline Results!\n🏆 ${winner.pseudo} — ${winner.timelineCards.length} cards\nRoom: ${roomCode}`;
    }
    return `🎵 Blind Test Results!\n🏆 ${winner.pseudo} — ${winner.score.toLocaleString()} pts\nRoom: ${roomCode}`;
  }, [sortedPlayers, roomCode, isTimeline]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareText]);

  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px]" />
        </div>
        <div className="text-white/60 text-lg z-10">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow delay-700" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="font-display text-4xl md:text-6xl font-black mb-3 tracking-tighter">
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isTimeline ? 'from-amber-400 to-orange-400' : 'from-primary to-secondary'
              }`}>
              Résultats
            </span>
          </h1>
          <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
            Room {roomCode}
          </p>
        </motion.div>

        {/* Podium Top 3 */}
        <div className="mb-10 space-y-4">
          {top3.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
              className={`relative bg-gradient-to-r ${MEDAL_COLORS[index]} border rounded-2xl p-4 md:p-6 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl md:text-5xl">{MEDAL_EMOJIS[index]}</div>
                  <div>
                    <p className="text-white font-display text-lg md:text-2xl font-bold">
                      {player.pseudo}
                    </p>
                    {player.streak > 0 && (
                      <p className="text-white/50 text-sm mt-0.5">
                        🔥 Meilleure série : {player.streak}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-display text-2xl md:text-3xl font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'
                    }`}>
                    {isTimeline ? player.timelineCards.length : player.score.toLocaleString()}
                  </p>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                    {isTimeline ? 'cartes' : 'points'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Other players */}
        {others.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-10"
          >
            <h2 className="text-white/30 text-xs font-bold mb-3 uppercase tracking-widest ml-2">
              Autres joueurs
            </h2>
            <div className="space-y-2">
              {others.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-sm font-bold w-8">
                      #{index + 4}
                    </span>
                    <span className="text-white font-semibold">
                      {player.pseudo}
                    </span>
                  </div>
                  <span className="text-white/60 font-mono text-sm">
                    {isTimeline
                      ? `${player.timelineCards.length} cartes`
                      : `${player.score.toLocaleString()} pts`
                    }
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Missed tracks / Discoveries */}
        {missedTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <button
              onClick={() => setShowDiscoveries(!showDiscoveries)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Music className="w-4 h-4 text-primary" />
              Mes découvertes ({missedTracks.length})
              <span className="text-white/30 text-xs">{showDiscoveries ? '▲' : '▼'}</span>
            </button>

            {showDiscoveries && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {missedTracks.map((track, i) => (
                  <a
                    key={i}
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${track.artistName} ${track.trackTitle} spotify`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group"
                  >
                    {track.albumCover && (
                      <img src={track.albumCover} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{track.trackTitle}</p>
                      <p className="text-white/40 text-xs truncate">{track.artistName}</p>
                    </div>
                    <span className="text-white/20 group-hover:text-primary text-xs">🔗</span>
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-3"
        >
          {/* Play Again */}
          {isHost ? (
            <button
              onClick={returnToLobby}
              className="w-full px-8 py-5 bg-gradient-to-r from-primary to-secondary rounded-2xl text-white text-lg font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider shadow-lg shadow-primary/25 flex items-center justify-center gap-3"
            >
              <RotateCcw className="w-5 h-5" />
              Rejouer
            </button>
          ) : (
            <div className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white/40 text-lg font-black text-center uppercase tracking-wider flex items-center justify-center gap-3">
              <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
              {"En attente de l'hôte..."}
            </div>
          )}

          <div className="flex gap-3">
            {/* Share */}
            <button
              onClick={handleShare}
              className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copié !</span>
                </>
              ) : (
                <>
                  {typeof navigator !== 'undefined' && 'share' in navigator ? (
                    <Share2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>Partager</span>
                </>
              )}
            </button>

            {/* Back to Home */}
            <button
              onClick={() => { leaveRoom(); router.push('/'); }}
              className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-bold hover:bg-white/10 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Accueil
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
