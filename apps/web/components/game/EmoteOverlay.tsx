'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface EmoteMessage {
  id: string;
  playerId: string;
  pseudo: string;
  emote: string;
  x: number; // random X position (0-90%)
}

interface EmoteOverlayProps {
  emotes: EmoteMessage[];
}

export function EmoteOverlay({ emotes }: EmoteOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {emotes.map((em) => (
          <motion.div
            key={em.id}
            initial={{ opacity: 1, y: '80vh', scale: 0.8 }}
            animate={{ opacity: 0, y: '10vh', scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute flex flex-col items-center"
            style={{ left: `${em.x}%` }}
          >
            <span className="text-4xl drop-shadow-lg">{em.emote}</span>
            <span className="text-[10px] font-bold text-white/60 bg-black/40 px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm">
              {em.pseudo}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export type { EmoteMessage };
