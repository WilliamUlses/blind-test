/**
 * Timer circulaire avec Gradient SVG Neon
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export function Timer() {
  const currentRound = useGameStore((state) => state.currentRound);
  const serverTimeOffset = useGameStore((state) => state.serverTimeOffset);
  const [progress, setProgress] = useState(100);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!currentRound) {
      setProgress(100);
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      // Corriger le temps local avec l'offset serveur pour synchronisation
      const now = Date.now() + serverTimeOffset;
      const elapsed = now - currentRound.startTimestamp;
      const total = currentRound.endTimestamp - currentRound.startTimestamp;
      const remaining = Math.max(0, total - elapsed);

      const progressPercent = (remaining / total) * 100;
      setProgress(Math.max(0, Math.min(100, progressPercent)));
      setTimeLeft(remaining);
      // setTimeRemaining(remaining); // Removed to prevent loop
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [currentRound]);

  const getTimeColor = () => {
    if (progress > 66) return 'text-white';
    if (progress > 33) return 'text-yellow-400';
    return 'text-red-500';
  };

  const formatTime = () => {
    if (!currentRound) return '00';
    const seconds = Math.ceil(timeLeft / 1000); // Use local state
    return seconds.toString();
  };

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" role="status" aria-label={`${formatTime()} seconds remaining`}>
      {/* Gradient Config (hidden) */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="timerGradient" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative" style={{ width: size, height: size }}>
        {/* Track */}
        <svg width={size} height={size} className="transform -rotate-90 drop-shadow-lg">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />

          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progress > 30 ? "url(#timerGradient)" : "rgb(239, 68, 68)"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </svg>

        {/* Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-black tracking-tighter ${progress <= 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime()}
          </span>
        </div>
      </div>
    </div>
  );
}
