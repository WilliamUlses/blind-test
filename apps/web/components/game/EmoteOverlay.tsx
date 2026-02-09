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
  // Limit to 5 visible emotes to reduce re-renders on mobile
  const visibleEmotes = emotes.slice(-5);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden will-change-transform">
      <AnimatePresence>
        {visibleEmotes.map((em) => (
          <motion.div
            key={em.id}
            initial={{ opacity: 1, y: '80vh', scale: 0.8 }}
            animate={{ opacity: 0, y: '10vh', scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute flex flex-col items-center"
            style={{ left: `${em.x}%`, willChange: 'transform, opacity' }}
          >
            <span className="text-2xl md:text-4xl drop-shadow-lg">{em.emote}</span>
            <span className="text-[10px] font-bold text-white/60 bg-black/40 px-2 py-0.5 rounded-full mt-1">
              {em.pseudo}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export type { EmoteMessage };
