/**
 * Compte à rebours "3, 2, 1, GO!" immersif
 * Animations scale in + fade out pour chaque chiffre
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export function Countdown321() {
  const gamePhase = useGameStore((state) => state.getPhase());
  const [count, setCount] = useState<number | 'GO' | null>(null);

  useEffect(() => {
    if (gamePhase !== 'COUNTDOWN') {
      setCount(null);
      return;
    }

    // Sequence: 3, 2, 1, GO
    const sequence = [3, 2, 1, 'GO' as const];
    let index = 0;

    setCount(sequence[0]);

    const interval = setInterval(() => {
      index++;
      if (index < sequence.length) {
        setCount(sequence[index]);
      } else {
        clearInterval(interval);
        setCount(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gamePhase]);

  if (gamePhase !== 'COUNTDOWN') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {count !== null && (
          <motion.div
            key={count}
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
            className="text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
              }}
              className={`
                text-9xl font-black
                ${count === 'GO' ? 'text-green-500' : 'text-purple-500'}
                drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]
              `}
            >
              {count}
            </motion.div>

            {count === 'GO' && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-white mt-4"
              >
                Écoute bien !
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
