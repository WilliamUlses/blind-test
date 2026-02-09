/**
 * Composant d'input pour soumettre les réponses
 * Affiche le cooldown de 2s après une mauvaise réponse avec animation visuelle
 * Animations: shake (mauvaise réponse), glow (bonne réponse), progress bar (cooldown)
 */

'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useGameSocket } from '../../hooks/useGameSocket';

interface AnswerInputProps {
  disabled?: boolean;
  placeholder?: string;
}

export function AnswerInput({ disabled = false, placeholder = 'Titre ou Artiste...' }: AnswerInputProps) {
  const [answer, setAnswer] = useState('');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [cooldownProgress, setCooldownProgress] = useState(0); // 0-100
  const inputRef = useRef<HTMLInputElement>(null);

  const { submitAnswer } = useGameSocket();
  const localPlayer = useGameStore((state) => state.localPlayer);
  const currentPlayer = useGameStore((state) => state.getCurrentPlayer());
  const gamePhase = useGameStore((state) => state.getPhase());
  const addAnswerAttempt = useGameStore((state) => state.addAnswerAttempt);

  const roomState = useGameStore((state) => state.roomState);
  const isInCooldown = localPlayer.isInCooldown;
  const cooldownEndsAt = localPlayer.cooldownEndsAt;
  const hasSubmittedCorrect = currentPlayer?.hasAnsweredCorrectly || false;
  const cooldownDurationMs = roomState?.settings.wrongAnswerCooldownMs ?? 2000;

  /**
   * Gère le cooldown visuel avec progress bar
   */
  useEffect(() => {
    if (!isInCooldown || !cooldownEndsAt) {
      setCooldownProgress(0);
      return;
    }

    const updateCooldown = () => {
      const now = Date.now();
      const remaining = cooldownEndsAt - now;
      const total = cooldownDurationMs;

      if (remaining <= 0) {
        setCooldownProgress(0);
        return;
      }

      const progress = ((total - remaining) / total) * 100;
      setCooldownProgress(Math.min(100, Math.max(0, progress)));
    };

    // Mise à jour immédiate
    updateCooldown();

    // Mise à jour toutes les 50ms pour une animation fluide
    const interval = setInterval(updateCooldown, 50);

    return () => clearInterval(interval);
  }, [isInCooldown, cooldownEndsAt]);

  /**
   * Soumet la réponse
   */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!answer.trim() || isInCooldown || hasSubmittedCorrect || disabled || gamePhase !== 'PLAYING') {
      return;
    }

    // Enregistrer la tentative localement puis soumettre au serveur
    addAnswerAttempt(answer.trim());
    submitAnswer(answer.trim());

    // Vider l'input (le joueur peut réessayer après le cooldown)
    setAnswer('');

    // Focus sur l'input pour faciliter les tentatives multiples
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Déclencher le feedback "incorrect" quand le cooldown s'active
  const prevCooldownRef = useRef(isInCooldown);
  useEffect(() => {
    if (isInCooldown && !prevCooldownRef.current) {
      setFeedbackState('incorrect');
      const timer = setTimeout(() => setFeedbackState('idle'), 600);
      return () => clearTimeout(timer);
    }
    prevCooldownRef.current = isInCooldown;
  }, [isInCooldown]);

  // Déclencher le feedback "correct" quand une partie est trouvée
  const prevFoundRef = useRef({ artist: localPlayer.foundArtist, title: localPlayer.foundTitle });
  useEffect(() => {
    const newArtist = localPlayer.foundArtist && !prevFoundRef.current.artist;
    const newTitle = localPlayer.foundTitle && !prevFoundRef.current.title;
    if (newArtist || newTitle) {
      setFeedbackState('correct');
      const timer = setTimeout(() => setFeedbackState('idle'), 1000);
      prevFoundRef.current = { artist: localPlayer.foundArtist, title: localPlayer.foundTitle };
      return () => clearTimeout(timer);
    }
    prevFoundRef.current = { artist: localPlayer.foundArtist, title: localPlayer.foundTitle };
  }, [localPlayer.foundArtist, localPlayer.foundTitle]);

  /**
   * Détermine si l'input est désactivé
   */
  const isDisabled = disabled || isInCooldown || hasSubmittedCorrect || gamePhase !== 'PLAYING';

  /**
   * Messages d'aide selon l'état
   */
  const getHelperText = () => {
    if (hasSubmittedCorrect) {
      return '✓ Tu as trouvé la bonne réponse !';
    }

    if (isInCooldown) {
      const remaining = cooldownEndsAt ? Math.ceil((cooldownEndsAt - Date.now()) / 1000) : 0;
      return `Attends ${remaining}s avant de réessayer...`;
    }

    if (gamePhase !== 'PLAYING') {
      return 'Attends le prochain round...';
    }

    return 'Entre le titre ou l\'artiste';
  };

  /**
   * Couleur de la bordure selon l'état
   */
  const getBorderColor = () => {
    if (hasSubmittedCorrect) return 'border-green-500';
    if (feedbackState === 'correct') return 'border-green-500';
    if (feedbackState === 'incorrect') return 'border-red-500';
    if (isInCooldown) return 'border-yellow-500';
    return 'border-purple-500';
  };

  /**
   * Animation shake pour mauvaise réponse
   */
  const shakeAnimation = feedbackState === 'incorrect' ? {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 },
  } : {};

  /**
   * Animation glow pour bonne réponse
   */
  const glowAnimation = feedbackState === 'correct' || hasSubmittedCorrect ? {
    boxShadow: [
      '0 0 0px rgba(16, 185, 129, 0)',
      '0 0 20px rgba(16, 185, 129, 0.6)',
      '0 0 0px rgba(16, 185, 129, 0)',
    ],
    transition: { duration: 1, repeat: hasSubmittedCorrect ? Infinity : 0 },
  } : {};

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        {/* Partial Success Badges */}
        <div className="absolute -top-12 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          <AnimatePresence>
            {localPlayer.foundArtist && (
              <motion.div
                key="artist-found"
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                🎤 ARTIST FOUND
              </motion.div>
            )}
            {localPlayer.foundTitle && (
              <motion.div
                key="title-found"
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                🎵 TITLE FOUND
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input principal */}
        <motion.div
          animate={{ ...shakeAnimation, ...glowAnimation }}
          className="relative"
        >
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isDisabled}
            placeholder={placeholder}
            autoFocus
            autoComplete="off"
            className={`
              w-full px-6 py-4 text-lg font-medium
              bg-[#1A1A2E] text-white
              border-2 ${getBorderColor()}
              rounded-xl
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0F]
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-gray-500
            `}
          />

          {/* Barre de progression du cooldown */}
          <AnimatePresence>
            {isInCooldown && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: cooldownProgress / 100 }}
                exit={{ scaleX: 0 }}
                className="absolute bottom-0 left-0 h-1 bg-yellow-500 origin-left rounded-b-xl"
                style={{ width: '100%' }}
              />
            )}
          </AnimatePresence>

          {/* Icône de succès */}
          <AnimatePresence>
            {hasSubmittedCorrect && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Texte d'aide */}
        <motion.p
          key={getHelperText()}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className={`
            mt-2 text-sm text-center
            ${hasSubmittedCorrect ? 'text-green-400' : ''}
            ${isInCooldown ? 'text-yellow-400' : ''}
            ${!hasSubmittedCorrect && !isInCooldown ? 'text-gray-400' : ''}
          `}
        >
          {getHelperText()}
        </motion.p>

        {/* Bouton de soumission (masqué, le form se soumet avec Enter) */}
        <button type="submit" className="hidden" aria-label="Submit answer" />
      </form>

      {/* Historique des tentatives */}
      {localPlayer.answerHistory.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center max-h-20 overflow-y-auto">
          {localPlayer.answerHistory.map((attempt, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                attempt.correct
                  ? attempt.foundPart === 'artist'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : attempt.foundPart === 'title'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-red-500/10 text-red-400/70 border border-red-500/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${attempt.correct ? 'bg-green-400' : 'bg-red-400/70'}`} />
              {attempt.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
