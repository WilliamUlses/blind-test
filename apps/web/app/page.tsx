/**
 * Page d'accueil - Design Premium Neo-Grotesque
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameSocket } from '../hooks/useGameSocket';
import { useRoomState } from '../stores/gameStore';

export default function HomePage() {
  const router = useRouter();
  const { createRoom, joinRoom } = useGameSocket();
  const roomState = useRoomState();

  const [pseudo, setPseudo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join' | null>(null);

  // Redirection vers le lobby quand une room est rejointe
  useEffect(() => {
    if (roomState?.code) {
      router.push(`/lobby/${roomState.code}`);
    }
  }, [roomState, router]);

  const handleCreateRoom = () => {
    if (!pseudo.trim()) return;
    createRoom(pseudo.trim());
  };

  const handleJoinRoom = () => {
    if (!pseudo.trim() || !roomCode.trim()) return;

    // Auto-formatting: Ajoute BT- si nécessaire
    let code = roomCode.trim().toUpperCase();
    if (!code.startsWith('BT-') && code.length === 4) {
      code = `BT-${code}`;
    }

    joinRoom(code, pseudo.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow delay-700" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <h1 className="font-display text-8xl font-black mb-6 tracking-tighter leading-none">
            <span className="text-white">BLIND</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">TEST</span>
          </h1>
          <p className="text-white/60 text-lg font-light tracking-wide uppercase">
            Music Quiz Multiplayer
          </p>
        </motion.div>

        {/* Card principale */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass-panel rounded-3xl p-8 backdrop-blur-2xl"
        >
          {/* Input pseudo */}
          <div className="mb-6 group">
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2 ml-4">
              Player Name
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="ENTER YOUR NAME"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-center uppercase tracking-widest"
              maxLength={20}
              autoFocus
            />
          </div>

          {/* Boutons d'action */}
          {!mode ? (
            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                disabled={!pseudo.trim()}
                className="w-full px-8 py-5 bg-gradient-to-r from-primary to-secondary rounded-2xl text-white text-lg font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg shadow-primary/25"
              >
                Create Room
              </button>

              <button
                onClick={() => setMode('join')}
                disabled={!pseudo.trim()}
                className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-lg font-bold hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                Join Room
              </button>
            </div>
          ) : mode === 'create' ? (
            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                className="w-full px-8 py-5 bg-white text-black rounded-2xl text-lg font-black hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider shadow-xl"
              >
                Launch Game
              </button>

              <button
                onClick={() => setMode(null)}
                className="w-full px-8 py-4 text-white/40 hover:text-white transition-all text-sm font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2 ml-4">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="X Y Z 1"
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-3xl font-black placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-secondary/50 transition-all tracking-[0.5em] uppercase"
                  maxLength={7}
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="w-full px-8 py-5 bg-gradient-to-r from-secondary to-purple-600 rounded-2xl text-white text-lg font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg shadow-secondary/25"
              >
                Enter
              </button>

              <button
                onClick={() => setMode(null)}
                className="w-full px-8 py-4 text-white/40 hover:text-white transition-all text-sm font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>

        {/* Info footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >

        </motion.div>
      </div>
    </div>
  );
}
