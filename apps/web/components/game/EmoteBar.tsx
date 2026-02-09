'use client';

import { motion } from 'framer-motion';
import { GAME_CONSTANTS } from '../../../../packages/shared/types';

interface EmoteBarProps {
  onEmote: (emote: string) => void;
  disabled?: boolean;
}

export function EmoteBar({ onEmote, disabled = false }: EmoteBarProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {GAME_CONSTANTS.VALID_EMOTES.map((emote) => (
        <motion.button
          key={emote}
          onClick={() => !disabled && onEmote(emote)}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.15 }}
          disabled={disabled}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Send ${emote} reaction`}
        >
          {emote}
        </motion.button>
      ))}
    </div>
  );
}
