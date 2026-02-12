'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { GAME_CONSTANTS } from '../../../../packages/shared/types';

export function TimelineView() {
  const roomState = useGameStore((state) => state.roomState);
  const localPlayerId = useGameStore((state) => state.localPlayer.id);

  const cardsToWin = roomState?.settings?.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN;

  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort(
      (a, b) => b.timelineCards.length - a.timelineCards.length
    );
  }, [roomState]);

  if (!roomState) return null;

  return (
    <div className="space-y-4">
      {/* Mini leaderboard by cards */}
      {sortedPlayers.map((player, index) => {
        const cardCount = player.timelineCards.length;
        const progress = Math.min(cardCount / cardsToWin, 1);
        const isMe = player.id === localPlayerId;

        return (
          <motion.div
            key={player.id}
            layout
            className={`rounded-xl p-3 transition-all ${
              isMe
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-white/5 border border-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/30 text-xs font-bold w-4 flex-shrink-0">
                  {index + 1}
                </span>
                <span className={`font-bold text-sm truncate ${
                  isMe ? 'text-amber-400' : 'text-white'
                }`}>
                  {player.pseudo}
                </span>
              </div>
              <span className={`font-black text-sm flex-shrink-0 ${
                isMe ? 'text-amber-400' : 'text-white/60'
              }`}>
                {cardCount}/{cardsToWin}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  progress >= 1
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : isMe
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-white/20'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
