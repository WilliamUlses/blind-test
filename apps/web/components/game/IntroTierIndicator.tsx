/**
 * IntroTierIndicator - Indicateur de palier en mode Intro
 * Affiche la durée d'écoute actuelle, la phase (écoute/devinette), et le multiplicateur de points
 */

'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_CONSTANTS } from '../../../../packages/shared/types';
import { useGameStore } from '../../stores/gameStore';

export function IntroTierIndicator() {
  const currentIntroTier = useGameStore((s) => s.currentIntroTier);
  const introPhase = useGameStore((s) => s.introPhase);
  const introDurationMs = useGameStore((s) => s.introDurationMs);

  const tierDurations = GAME_CONSTANTS.INTRO_TIER_DURATIONS_MS;
  const multipliers = GAME_CONSTANTS.INTRO_TIER_MULTIPLIERS;
  const maxTiers = tierDurations.length;
  const currentMultiplier = multipliers[Math.min(currentIntroTier, multipliers.length - 1)];
  const currentDurationSec = tierDurations[Math.min(currentIntroTier, tierDurations.length - 1)] / 1000;

  // Countdown for guess window
  const [guessTimeLeft, setGuessTimeLeft] = useState(0);
  const guessStartRef = useRef<number>(0);

  useEffect(() => {
    if (introPhase === 'guessing' && introDurationMs > 0) {
      guessStartRef.current = Date.now();
      setGuessTimeLeft(introDurationMs);

      const interval = setInterval(() => {
        const elapsed = Date.now() - guessStartRef.current;
        const remaining = Math.max(0, introDurationMs - elapsed);
        setGuessTimeLeft(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [introPhase, introDurationMs]);

  const isListening = introPhase === 'listening';
  const isGuessing = introPhase === 'guessing';

  return (
    <div className="mb-4 flex flex-col items-center gap-3">
      {/* Phase indicator */}
      <AnimatePresence mode="wait">
        {isListening && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 text-xs font-black uppercase tracking-wider">
              Écoute — {currentDurationSec}s
            </span>
          </motion.div>
        )}
        {isGuessing && (
          <motion.div
            key="guessing"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30"
          >
            <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
              ⏱ Devine ! {Math.ceil(guessTimeLeft / 1000)}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier progress dots */}
      <div className="flex items-center gap-1.5">
        {tierDurations.map((dur, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{
              scale: i <= currentIntroTier ? 1 : 0.8,
              opacity: i <= currentIntroTier ? 1 : 0.3,
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <div
              className={`w-8 h-1.5 rounded-full transition-colors ${i <= currentIntroTier
                  ? i === 0 ? 'bg-cyan-400'
                    : i === 1 ? 'bg-blue-400'
                      : i === 2 ? 'bg-indigo-400'
                        : i === 3 ? 'bg-purple-400'
                          : i === 4 ? 'bg-pink-400'
                            : 'bg-red-400'
                  : 'bg-white/10'
                }`}
            />
            <span className="text-[8px] text-white/30 font-bold">{dur / 1000}s</span>
          </motion.div>
        ))}
      </div>

      {/* Multiplier badge */}
      <motion.div
        key={`mult-${currentIntroTier}`}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${currentMultiplier >= 5 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
            currentMultiplier >= 3 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              currentMultiplier >= 2 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                currentMultiplier >= 1.5 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  currentMultiplier >= 1 ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
      >
        x{currentMultiplier} points
      </motion.div>
    </div>
  );
}
