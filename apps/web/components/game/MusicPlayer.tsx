/**
 * Composant MusicPlayer - Style Vinyle Neon
 * Animation fluide et premium
 */

'use client';

import { motion } from 'framer-motion';

interface MusicPlayerProps {
  isPlaying: boolean;
  albumCover?: string;
}

export function MusicPlayer({ isPlaying, albumCover }: MusicPlayerProps) {
  return (
    <div className="relative">
      {/* Glow effect surrounding the vinyl */}
      <div className={`
         absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-full blur-[40px] opacity-30
         transition-opacity duration-1000 ${isPlaying ? 'opacity-50 animate-pulse-slow' : 'opacity-20'}
      `} />

      {/* Exterior Ring */}
      <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-black border border-white/10 relative flex items-center justify-center shadow-2xl">

        {/* Spinning Vinyl */}
        <motion.div
          className="w-[96%] h-[96%] rounded-full bg-[#111] relative overflow-hidden ring-1 ring-white/5 shadow-inner"
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          {/* Vinyl Texture/Grooves */}
          <div className="absolute inset-0 rounded-full opacity-30"
            style={{
              backgroundImage: 'repeating-radial-gradient(#222 0, #222 2px, transparent 3px, transparent 4px)'
            }}
          />

          {/* Light Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 rounded-full transform rotate-45" />

          {/* Central Label */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-lg">
            <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
              {albumCover ? (
                <img src={albumCover} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <span className="text-2xl animate-pulse">🎵</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Equalizer Visualizer (Decorative) */}
      {isPlaying && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-primary to-secondary"
              animate={{ height: [4, 24, 8, 16, 4] }}
              transition={{
                duration: 0.5 + Math.random() * 0.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
