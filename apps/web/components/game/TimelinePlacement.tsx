'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameActions } from '../../hooks/useGameActions';
import { useCurrentRound, useLocalPlayer, useGameStore } from '../../stores/gameStore';
import type { TimelineCard } from '../../../../packages/shared/types';

export function TimelinePlacement() {
  const { submitAnswer } = useGameActions();
  const currentRound = useCurrentRound();
  const localPlayer = useLocalPlayer();
  const roomState = useGameStore((state) => state.roomState);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  // Get the current player's timeline cards from server state
  const myCards: TimelineCard[] = useMemo(() => {
    if (!roomState || !localPlayer.id) return [];
    const me = roomState.players.find((p) => p.id === localPlayer.id);
    return me?.timelineCards || [];
  }, [roomState, localPlayer.id]);

  // Reset submission state when round changes
  useEffect(() => {
    setHasSubmitted(false);
    setHoveredSlot(null);
  }, [currentRound?.roundNumber]);

  const handlePlacement = (insertIndex: number) => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    // submit_answer with the insert index as the answer string
    submitAnswer(String(insertIndex));
  };

  if (!currentRound) return null;

  return (
    <div className="w-full space-y-6">
      {/* Current track info */}
      <div className="text-center">
        {currentRound.albumCover && (
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            src={currentRound.albumCover}
            alt="Album"
            className="w-20 h-20 rounded-xl mx-auto mb-3 shadow-lg border-2 border-white/10"
          />
        )}
        <h3 className="text-white font-black text-xl md:text-2xl tracking-tight">
          {currentRound.trackTitle}
        </h3>
        <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-bold text-lg">
          {currentRound.artistName}
        </p>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">
          Place this song on your timeline
        </p>
      </div>

      {/* Timeline with insertion slots */}
      {hasSubmitted ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-white/60 font-bold text-sm uppercase tracking-wider">
              En attente du résultat...
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="relative">
          {/* The timeline row */}
          <div className="flex items-center gap-0 overflow-x-auto pb-2 px-2 custom-scrollbar">
            {/* Slot before first card */}
            <InsertSlot
              index={0}
              isHovered={hoveredSlot === 0}
              onHover={() => setHoveredSlot(0)}
              onLeave={() => setHoveredSlot(null)}
              onClick={() => handlePlacement(0)}
            />

            {myCards.map((card, i) => (
              <div key={`${card.releaseYear}-${card.trackTitle}-${i}`} className="flex items-center">
                {/* Card */}
                <div className="flex-shrink-0 w-24 md:w-28">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    {card.albumCover && (
                      <img
                        src={card.albumCover}
                        alt=""
                        className="w-12 h-12 rounded-lg mx-auto mb-1.5 object-cover"
                      />
                    )}
                    <p className="text-amber-400 font-black text-sm">{card.releaseYear}</p>
                    <p className="text-white text-[10px] font-bold truncate">{card.trackTitle}</p>
                    <p className="text-white/40 text-[9px] truncate">{card.artistName}</p>
                  </div>
                </div>

                {/* Slot after this card */}
                <InsertSlot
                  index={i + 1}
                  isHovered={hoveredSlot === i + 1}
                  onHover={() => setHoveredSlot(i + 1)}
                  onLeave={() => setHoveredSlot(null)}
                  onClick={() => handlePlacement(i + 1)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InsertSlot({
  index,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: {
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <button
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`flex-shrink-0 flex items-center justify-center transition-all duration-200 mx-1 ${
        isHovered
          ? 'w-16 md:w-20 h-24 bg-amber-500/20 border-2 border-dashed border-amber-500 rounded-xl'
          : 'w-8 md:w-10 h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/10'
      }`}
      aria-label={`Insert at position ${index}`}
    >
      <AnimatePresence>
        {isHovered ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-amber-500 font-black text-lg"
          >
            +
          </motion.span>
        ) : (
          <span className="text-white/20 text-sm">+</span>
        )}
      </AnimatePresence>
    </button>
  );
}
