/**
 * TimelinePlacement - Mode Timeline avec cartes mystères
 * Drag-and-drop + animation de révélation (flip, shake, glow)
 * Supports team mode: reads team.timelineCards, blocks when not team's turn
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import type { TimelineCard } from '../../../../packages/shared/types';

interface TimelinePlacementProps {
  onSubmit: (insertIndex: number) => void;
}

export function TimelinePlacement({ onSubmit }: TimelinePlacementProps) {
  const roomState = useGameStore((state) => state.roomState);
  const localPlayer = useGameStore((state) => state.localPlayer);
  const timelineReveal = useGameStore((state) => state.timelineReveal);
  const gamePhase = useGameStore((state) => state.roomState?.status);

  const currentPlayer = roomState?.players.find((p) => p.id === localPlayer.id);

  // Team mode detection
  const isTeamMode = !!(roomState?.settings?.enableTeams && roomState.teams && roomState.teams.length > 0);
  const myTeam = isTeamMode
    ? roomState?.teams?.find((t) => t.playerIds.includes(localPlayer.id))
    : null;
  const currentTeamTurnId = roomState?.currentTeamTurnId;
  const isMyTeamTurn = !isTeamMode || (myTeam?.id === currentTeamTurnId);
  const activeTeam = isTeamMode
    ? roomState?.teams?.find((t) => t.id === currentTeamTurnId)
    : null;

  // In team mode, use team's cards; otherwise use player's cards
  const cards: TimelineCard[] = useMemo(() => {
    if (isTeamMode && myTeam?.timelineCards) {
      return myTeam.timelineCards;
    }
    return currentPlayer?.timelineCards || [];
  }, [isTeamMode, myTeam, currentPlayer]);

  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  // For tap-to-place on mobile
  const [tapMode, setTapMode] = useState(false);

  // Reset state when round changes (new reveal)
  useEffect(() => {
    if (!timelineReveal) {
      setHasSubmitted(false);
      setIsFlipped(false);
      setShowResult(false);
      setFadeOut(false);
      setTapMode(false);
    }
  }, [timelineReveal]);

  // When timelineReveal arrives, trigger flip animation
  useEffect(() => {
    if (timelineReveal && hasSubmitted) {
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
        setShowResult(true);
      }, 800);
      return () => clearTimeout(flipTimer);
    }
  }, [timelineReveal, hasSubmitted]);

  // If wrong answer, fade out after reveal
  useEffect(() => {
    if (showResult && timelineReveal && !timelineReveal.correct) {
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 2500);
      return () => clearTimeout(fadeTimer);
    }
  }, [showResult, timelineReveal]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'mystery-card');
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setHoveredSlot(null);
  }, []);

  const handleDrop = useCallback((index: number) => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    setIsDragging(false);
    setHoveredSlot(null);
    setTapMode(false);
    onSubmit(index);
  }, [hasSubmitted, onSubmit]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredSlot(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  // Tap-to-place: tap card to activate, then tap a slot
  const handleCardTap = useCallback(() => {
    if (hasSubmitted) return;
    setTapMode(true);
    setIsDragging(true); // Show drop zones
  }, [hasSubmitted]);

  const handleSlotTap = useCallback((index: number) => {
    if (!tapMode || hasSubmitted) return;
    handleDrop(index);
  }, [tapMode, hasSubmitted, handleDrop]);

  if (!roomState) return null;

  // During REVEAL phase, just show the result without the mystery card UI
  const isRevealPhase = gamePhase === 'REVEAL';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      {/* Team turn indicator (team mode only) */}
      {isTeamMode && !isRevealPhase && (
        <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
          isMyTeamTurn
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-white/10 text-white/50 border border-white/10'
        }`}>
          {isMyTeamTurn ? (
            <>C&apos;est le tour de ton équipe !</>
          ) : (
            <>Tour de {activeTeam?.name || 'l\'autre équipe'}</>
          )}
        </div>
      )}

      {/* Mystery Card (only during PLAYING, and only when it's this team's turn) */}
      {!isRevealPhase && !hasSubmitted && isMyTeamTurn && (
        <>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleCardTap}
          >
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isDragging ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`
                relative w-28 h-36 rounded-2xl cursor-grab active:cursor-grabbing
                bg-gradient-to-br from-purple-600/80 to-indigo-800/80
                border-2 border-purple-400/40
                shadow-[0_0_30px_rgba(168,85,247,0.3)]
                flex flex-col items-center justify-center
                select-none backdrop-blur-sm
                ${isDragging ? 'z-50 shadow-[0_0_50px_rgba(168,85,247,0.5)]' : ''}
                ${tapMode ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-black' : ''}
              `}
            >
              <span className="text-4xl mb-1">🎵</span>
              <span className="text-white text-3xl font-black">?</span>
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-2">
                {tapMode ? 'Choisis un emplacement' : 'Glisse ou tape'}
              </span>
            </motion.div>
          </div>
          {tapMode && (
            <p className="text-purple-400/60 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              Tape entre les cartes pour placer
            </p>
          )}
        </>
      )}

      {/* "Not your turn" waiting message */}
      {!isRevealPhase && !hasSubmitted && !isMyTeamTurn && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
            En attente du tour de ton équipe...
          </p>
        </motion.div>
      )}

      {/* Revealed card after submission (flip animation) */}
      {hasSubmitted && timelineReveal && (
        <div style={{ perspective: '1000px' }}>
          <motion.div
            initial={{ rotateY: 0 }}
            animate={{
              rotateY: isFlipped ? 180 : 0,
              opacity: fadeOut ? 0 : 1,
              scale: fadeOut ? 0.6 : 1,
              y: fadeOut ? 30 : 0,
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="relative w-28 h-36"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Card back (mystery) */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600/80 to-indigo-800/80 border-2 border-purple-400/40 flex flex-col items-center justify-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-4xl mb-1">🎵</span>
              <span className="text-white text-3xl font-black">?</span>
            </div>

            {/* Card front (revealed info) */}
            <div
              className={`
                absolute inset-0 rounded-2xl flex flex-col items-center justify-center overflow-hidden
                border-2 shadow-lg
                ${timelineReveal.correct
                  ? 'border-green-400/60 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                  : 'border-red-400/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                }
              `}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {timelineReveal.albumCover ? (
                <img
                  src={timelineReveal.albumCover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-indigo-900" />
              )}
              <div className="relative z-10 text-center px-2">
                <p className="text-white font-black text-sm leading-tight truncate max-w-full">
                  {timelineReveal.trackTitle}
                </p>
                <p className="text-white/60 text-[10px] font-bold truncate max-w-full mt-0.5">
                  {timelineReveal.artistName}
                </p>
                <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black inline-block ${
                  timelineReveal.correct ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                }`}>
                  {timelineReveal.releaseYear}
                </div>
              </div>
              {/* Result icon */}
              <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                timelineReveal.correct ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <span className="text-white text-xs">
                  {timelineReveal.correct ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Success particles */}
          {isFlipped && timelineReveal.correct && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1.5,
                    x: (Math.random() - 0.5) * 120,
                    y: (Math.random() - 0.5) * 120,
                  }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-green-400"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result message */}
      <AnimatePresence>
        {showResult && timelineReveal && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`text-center py-2 px-4 rounded-xl font-black text-sm uppercase tracking-wider ${
              timelineReveal.correct
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {timelineReveal.correct
              ? '✨ Bien placé !'
              : `✗ Raté — c'était ${timelineReveal.releaseYear}`
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline rail */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex items-center gap-0 min-w-min mx-auto justify-center">
          {/* Drop zone before first card */}
          <DropSlot
            index={0}
            isDragging={isDragging && !hasSubmitted && isMyTeamTurn}
            isHovered={hoveredSlot === 0}
            hasSubmitted={hasSubmitted || !isMyTeamTurn}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tapMode={tapMode}
            onSlotTap={handleSlotTap}
          />

          {cards.map((card, i) => (
            <div key={`${card.trackTitle}-${card.releaseYear}-${i}`} className="flex items-center">
              {/* Existing card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-24 h-32 rounded-xl overflow-hidden border border-white/10 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0"
              >
                {card.albumCover ? (
                  <img
                    src={card.albumCover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
                )}
                <div className="relative z-10 text-center px-1.5">
                  <p className="text-white font-bold text-[10px] leading-tight truncate max-w-full">
                    {card.trackTitle}
                  </p>
                  <p className="text-white/50 text-[9px] truncate max-w-full">
                    {card.artistName}
                  </p>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black inline-block">
                    {card.releaseYear}
                  </div>
                </div>
              </motion.div>

              {/* Drop zone after each card */}
              <DropSlot
                index={i + 1}
                isDragging={isDragging && !hasSubmitted && isMyTeamTurn}
                isHovered={hoveredSlot === i + 1}
                hasSubmitted={hasSubmitted || !isMyTeamTurn}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                tapMode={tapMode}
                onSlotTap={handleSlotTap}
              />
            </div>
          ))}

          {/* Empty state when no cards yet */}
          {cards.length === 0 && (
            <div className="text-white/20 text-xs font-bold uppercase tracking-wider px-8 py-4">
              {isTeamMode ? 'Frise de l\'équipe vide — place la première carte !' : 'Ta frise est vide — place ta première carte !'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Drop slot between timeline cards
 */
function DropSlot({
  index,
  isDragging,
  isHovered,
  hasSubmitted,
  onDragOver,
  onDragLeave,
  onDrop,
  tapMode,
  onSlotTap,
}: {
  index: number;
  isDragging: boolean;
  isHovered: boolean;
  hasSubmitted: boolean;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (index: number) => void;
  tapMode: boolean;
  onSlotTap: (index: number) => void;
}) {
  if (hasSubmitted) {
    return <div className="w-2" />;
  }

  return (
    <div
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onClick={() => { if (tapMode) onSlotTap(index); }}
      className={`
        transition-all duration-200 flex items-center justify-center flex-shrink-0
        ${isDragging
          ? `w-12 h-32 rounded-xl border-2 border-dashed mx-1
             ${tapMode ? 'cursor-pointer' : ''}
             ${isHovered
              ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'border-white/20 bg-white/5 hover:border-purple-400/50 hover:bg-purple-500/10'
            }`
          : 'w-2 h-8'
        }
      `}
    >
      {isDragging && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: isHovered ? 1.2 : 0.8, opacity: isHovered ? 1 : 0.4 }}
          className="text-purple-400 text-lg"
        >
          ↓
        </motion.span>
      )}
    </div>
  );
}
