/**
 * Page d'accueil - Sélection du mode de jeu + Créer/Rejoindre
 * Flow: Choix du mode → Solo/Groupe → Pseudo + Créer/Rejoindre → Lobby
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameSocket } from '../hooks/useGameSocket';
import { useRoomState, useGameError } from '../stores/gameStore';
import { Loader2, ArrowLeft, Crown, User, Calendar, LogIn, LogOut } from 'lucide-react';
import type { GameMode } from '../../../packages/shared/types';
import { GAME_MODES_INFO } from '../../../packages/shared/types';
import { useAuthStore } from '../hooks/useAuth';

const AVATARS = ['🎵', '🎸', '🎤', '🎹', '🥁', '🎷', '🎺', '🎻', '🎧', '🎶', '🎼', '🎙️'];

type Step = 'mode-select' | 'setup';

export default function HomePage() {
  const router = useRouter();
  const { createRoom, joinRoom } = useGameSocket();
  const roomState = useRoomState();
  const error = useGameError();

  const [step, setStep] = useState<Step>('mode-select');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [pseudo, setPseudo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [action, setAction] = useState<'create' | 'join' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill pseudo from auth
  useEffect(() => {
    if (isAuthenticated && authUser?.pseudo && !pseudo) {
      setPseudo(authUser.pseudo);
    }
  }, [isAuthenticated, authUser, pseudo]);

  // Redirect when a room is joined
  useEffect(() => {
    if (roomState?.code) {
      setIsLoading(false);
      router.push(`/lobby/${roomState.code}`);
    }
  }, [roomState, router]);

  // Reset loading on error
  useEffect(() => {
    if (error) {
      setIsLoading(false);
    }
  }, [error]);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setStep('setup');
  };

  const handleCreateRoom = useCallback(() => {
    if (!pseudo.trim() || !selectedMode || isLoading) return;
    setIsLoading(true);
    createRoom(pseudo.trim(), undefined, { gameMode: selectedMode });
  }, [pseudo, selectedMode, isLoading, createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!pseudo.trim() || !roomCode.trim() || isLoading) return;

    let code = roomCode.trim().toUpperCase();
    if (!code.startsWith('BT-') && code.length === 4) {
      code = `BT-${code}`;
    }

    setIsLoading(true);
    joinRoom(code, pseudo.trim());
  }, [pseudo, roomCode, isLoading, joinRoom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (action === 'create') handleCreateRoom();
      else if (action === 'join') handleJoinRoom();
    },
    [action, handleCreateRoom, handleJoinRoom]
  );

  const handleBack = () => {
    if (action) {
      setAction(null);
    } else {
      setStep('mode-select');
      setSelectedMode(null);
    }
    setIsLoading(false);
  };

  const selectedModeInfo = selectedMode ? GAME_MODES_INFO.find(m => m.id === selectedMode) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow delay-700" />
      </div>

      <div className="w-full max-w-3xl z-10 relative">
        {/* Auth bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end mb-4"
        >
          {isAuthenticated && authUser ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all"
              >
                <span>{AVATARS[authUser.avatarIndex] || '🎵'}</span>
                <span className="uppercase tracking-wider">{authUser.pseudo}</span>
              </button>
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/auth')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold uppercase tracking-wider hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Connexion
            </button>
          )}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 md:mb-12 text-center"
        >
          <h1 className="font-display text-5xl md:text-8xl font-black mb-4 tracking-tighter leading-none">
            <span className="text-white">BLIND</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">TEST</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg font-light tracking-wide uppercase">
            Music Quiz Multiplayer
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Mode Selection */}
          {step === 'mode-select' && (
            <motion.div
              key="mode-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mb-6">
                Choisis ton mode
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {GAME_MODES_INFO.map((mode, index) => {
                  const isComingSoon = mode.id === 'lyrics';
                  return (
                    <motion.button
                      key={mode.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => !isComingSoon && handleModeSelect(mode.id)}
                      disabled={isComingSoon}
                      className={`relative group p-5 md:p-6 rounded-2xl border text-left transition-all duration-300
                        ${isComingSoon
                          ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                          : `bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.03] active:scale-[0.98] ${mode.isPremium ? 'hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]' : 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]'}`
                        }
                      `}
                    >
                      {isComingSoon && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-wider text-white/50">
                            Bientôt
                          </span>
                        </div>
                      )}
                      {!isComingSoon && mode.isPremium && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full text-[9px] font-black uppercase tracking-wider text-black">
                            <Crown className="w-2.5 h-2.5" />
                            PRO
                          </span>
                        </div>
                      )}

                      <div className="text-3xl md:text-4xl mb-3">{mode.icon}</div>
                      <h3 className="text-white font-black text-sm md:text-base uppercase tracking-wider mb-1">
                        {mode.title}
                      </h3>
                      <p className="text-white/40 text-[10px] md:text-xs font-medium leading-relaxed">
                        {mode.description}
                      </p>

                      {/* Hover gradient accent */}
                      {!isComingSoon && (
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Create / Join Setup */}
          {step === 'setup' && selectedModeInfo && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              {/* Back + Mode Badge */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${selectedModeInfo.gradient} text-white text-xs font-black uppercase tracking-wider`}>
                  <span>{selectedModeInfo.icon}</span>
                  <span>{selectedModeInfo.title}</span>
                </div>
              </div>

              <div
                className="glass-panel rounded-3xl p-6 md:p-8 backdrop-blur-2xl"
                onKeyDown={handleKeyDown}
              >
                {/* Pseudo input */}
                <div className="mb-5">
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
                    disabled={isLoading}
                  />
                </div>

                {/* Action selection */}
                {!action ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setAction('create')}
                      disabled={!pseudo.trim() || isLoading}
                      className={`w-full px-8 py-5 bg-gradient-to-r ${selectedModeInfo.gradient} rounded-2xl text-white text-lg font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg`}
                    >
                      Créer une partie
                    </button>

                    <button
                      onClick={() => setAction('join')}
                      disabled={!pseudo.trim() || isLoading}
                      className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-lg font-bold hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                      Rejoindre une partie
                    </button>
                  </div>
                ) : action === 'create' ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleCreateRoom}
                      disabled={isLoading}
                      className="w-full px-8 py-5 bg-white text-black rounded-2xl text-lg font-black hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Création...
                        </>
                      ) : (
                        'Lancer la partie'
                      )}
                    </button>

                    <button
                      onClick={handleBack}
                      disabled={isLoading}
                      className="w-full px-8 py-3 text-white/40 hover:text-white transition-all text-sm font-bold uppercase tracking-widest disabled:opacity-30"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2 ml-4">
                        Code de la room
                      </label>
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="X Y Z 1"
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-xl md:text-3xl font-black placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-secondary/50 transition-all tracking-[0.3em] md:tracking-[0.5em] uppercase"
                        maxLength={7}
                        disabled={isLoading}
                      />
                    </div>

                    <button
                      onClick={handleJoinRoom}
                      disabled={!roomCode.trim() || isLoading}
                      className={`w-full px-8 py-5 bg-gradient-to-r ${selectedModeInfo.gradient} rounded-2xl text-white text-lg font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg flex items-center justify-center gap-3`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        'Rejoindre'
                      )}
                    </button>

                    <button
                      onClick={handleBack}
                      disabled={isLoading}
                      className="w-full px-8 py-3 text-white/40 hover:text-white transition-all text-sm font-bold uppercase tracking-widest disabled:opacity-30"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-red-400 text-sm text-center font-medium"
                  >
                    {error.message}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex gap-3 justify-center"
        >
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold uppercase tracking-wider hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            Profil
          </button>
          <button
            onClick={() => router.push('/daily')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400/70 text-xs font-bold uppercase tracking-wider hover:from-amber-500/20 hover:to-orange-500/20 hover:text-amber-400 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            Défi du jour
          </button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 md:mt-8 text-center"
        >
          <p className="text-white/20 text-xs font-medium tracking-wide">
            Créé par{' '}
            <a
              href="https://portfolio.williamulses.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
            >
              William Ulses
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
