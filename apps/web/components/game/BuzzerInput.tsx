/**
 * BuzzerInput - Mode Buzzer avec timer visuel et contrôle audio
 * Quand un joueur buzze: la musique s'arrête, un timer de 10s démarre
 * Mauvaise réponse: musique reprend, joueur verrouillé
 * Bonne réponse: points attribués
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../lib/socket';

interface BuzzerInputProps {
  onBuzz: () => void;
  onSubmitAnswer: (answer: string) => void;
  onPauseAudio: () => void;
  onResumeAudio: () => void;
}

export function BuzzerInput({ onBuzz, onSubmitAnswer, onPauseAudio, onResumeAudio }: BuzzerInputProps) {
  const localPlayer = useGameStore((state) => state.localPlayer);
  const roomState = useGameStore((state) => state.roomState);
  const buzzerLock = useGameStore((state) => state.buzzerLock);

  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [buzzerLockedAt, setBuzzerLockedAt] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPlayer = roomState?.players.find((p) => p.id === localPlayer.id);
  const isMyBuzz = buzzerLock?.playerId === localPlayer.id;
  const hasBuzzed = currentPlayer?.hasBuzzed ?? false;
  const hasFoundAll = (currentPlayer?.foundArtist && currentPlayer?.foundTitle) ?? false;
  const isLocked = buzzerLock !== null;
  const buzzerTimeMs = buzzerLock?.buzzerTimeMs ?? 10000;

  // Pause audio when someone buzzes, resume when released
  useEffect(() => {
    if (buzzerLock) {
      onPauseAudio();
      setBuzzerLockedAt(Date.now());
      setTimeLeft(buzzerTimeMs);
      setAnswer('');
    } else {
      onResumeAudio();
      setBuzzerLockedAt(null);
      setTimeLeft(0);
    }
  }, [buzzerLock, buzzerTimeMs, onPauseAudio, onResumeAudio]);

  // Countdown timer
  useEffect(() => {
    if (!buzzerLock || !buzzerLockedAt) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - buzzerLockedAt;
      const remaining = Math.max(0, buzzerTimeMs - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [buzzerLock, buzzerLockedAt, buzzerTimeMs]);

  // Focus input when it's my buzz
  useEffect(() => {
    if (isMyBuzz && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyBuzz]);

  const handleBuzz = useCallback(() => {
    if (isLocked || hasBuzzed || hasFoundAll) return;
    onBuzz();
  }, [isLocked, hasBuzzed, hasFoundAll, onBuzz]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !isMyBuzz) return;
    onSubmitAnswer(answer.trim());
    setAnswer('');
  }, [answer, isMyBuzz, onSubmitAnswer]);

  // Timer progress (0 to 1)
  const timerProgress = buzzerTimeMs > 0 ? timeLeft / buzzerTimeMs : 0;
  const timerSeconds = Math.ceil(timeLeft / 1000);

  // Already answered correctly
  if (hasFoundAll) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500/20 border border-green-500/30">
          <span className="text-green-400 text-lg">✓</span>
          <span className="text-green-400 font-black uppercase tracking-wider text-sm">Bien joué !</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      {/* Timer circle visible when someone buzzed */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-2"
          >
            {/* Circular countdown */}
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke={timerProgress < 0.3 ? '#ef4444' : timerProgress < 0.6 ? '#eab308' : '#a855f7'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 68}`}
                  strokeDashoffset={`${Math.PI * 68 * (1 - timerProgress)}`}
                  className="transition-all duration-100"
                />
              </svg>
              {/* Timer text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-black text-2xl ${timerProgress < 0.3 ? 'text-red-400' : 'text-white'
                  }`}>
                  {timerSeconds}
                </span>
              </div>
            </div>

            {/* Who buzzed */}
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">
              🔔 {buzzerLock.pseudo} a buzzé !
            </p>

            {/* Music paused indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-400 text-xs">⏸</span>
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Musique en pause</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buzzer button or answer input */}
      {isMyBuzz ? (
        /* Answer input when I have the lock */
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="w-full space-y-3"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Ta réponse..."
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-primary/50 text-white placeholder-white/30 font-bold text-center focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!answer.trim()}
            className="w-full py-3 rounded-xl bg-primary text-white font-black uppercase tracking-wider text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          >
            Valider
          </button>
        </motion.form>
      ) : isLocked ? (
        /* Someone else has the lock */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-white/40 text-sm font-bold">
            Attends le résultat de {buzzerLock?.pseudo}...
          </p>
        </motion.div>
      ) : (
        /* Buzzer button */
        <motion.button
          onClick={handleBuzz}
          disabled={hasBuzzed}
          whileTap={hasBuzzed ? {} : { scale: 0.9 }}
          className={`
            relative w-32 h-32 rounded-full font-black text-lg uppercase tracking-wider
            transition-all
            ${hasBuzzed
              ? 'bg-white/5 text-white/20 cursor-not-allowed border-2 border-white/10'
              : 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:shadow-[0_0_60px_rgba(239,68,68,0.5)] hover:scale-105 border-4 border-red-400/50 cursor-pointer active:scale-95'
            }
          `}
        >
          {hasBuzzed ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">🔒</span>
              <span className="text-[10px]">Déjà buzzé</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-1">🔔</span>
              <span className="text-sm">BUZZ</span>
            </div>
          )}
        </motion.button>
      )}
    </div>
  );
}
