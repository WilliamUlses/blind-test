/**
 * ScoreBoard - Classement des joueurs en temps réel
 * Design Premium Glassmorphism
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

const ScoreDelta = ({ score }: { score: number }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (score > prevScore) {
      setDelta(score - prevScore);
      setPrevScore(score);
    }
  }, [score, prevScore]);

  return (
    <AnimatePresence>
      {delta > 0 && (
        <motion.span
          key={score}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -10, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onAnimationComplete={() => setDelta(0)}
          className="absolute -right-2 -top-4 text-green-400 font-bold text-sm"
        >
          +{delta}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

export function ScoreBoard() {
  const roomState = useGameStore((state) => state.roomState);
  const localPlayer = useGameStore((state) => state.localPlayer);

  // Trier les joueurs par score décroissant
  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort((a, b) => b.score - a.score);
  }, [roomState]);

  if (!roomState) {
    return null;
  }

  /**
   * Badge de position
   */
  const getPositionBadge = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return null;
    }
  };

  /**
   * Couleur selon la position
   */
  const getPositionStyle = (index: number) => {
    switch (index) {
      case 0: return 'bg-gradient-to-r from-yellow-300 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]';
      case 1: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black';
      case 2: return 'bg-gradient-to-r from-orange-300 to-orange-600 text-black';
      default: return 'bg-white/10 text-white';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => {
            const isLocalPlayer = player.id === localPlayer.id;

            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`
                  relative flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300
                  ${isLocalPlayer
                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'}
                `}
              >
                {/* Position / Rank */}
                <div className="flex-shrink-0 w-8 text-center font-black text-white/40 text-sm">
                  {getPositionBadge(index) || `#${index + 1}`}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-lg
                    ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                          'bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/10'}
                  `}>
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      player.pseudo[0].toUpperCase()
                    )}
                  </div>

                  {/* Status Indicator (Correct/Active) */}
                  <AnimatePresence>
                    {player.hasAnsweredCorrectly && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-background shadow-lg"
                      >
                        <svg className="w-3 h-3 text-black font-bold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold truncate ${isLocalPlayer ? 'text-primary' : 'text-white'}`}>
                      {player.pseudo}
                    </p>
                    {isLocalPlayer && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">You</span>}
                  </div>

                  {player.streak > 1 && (
                    <div className="flex items-center gap-1 text-xs text-orange-400 font-bold uppercase tracking-wide animate-pulse">
                      <span>🔥</span>
                      <span>Streak {player.streak}</span>
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="text-right relative">
                  <p className="font-black text-xl text-white tracking-tight leading-none">
                    {player.score}
                  </p>
                  <ScoreDelta score={player.score} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {sortedPlayers.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-white/20 font-bold uppercase tracking-widest">
          Thinking...
        </div>
      )}
    </div>
  );
}
