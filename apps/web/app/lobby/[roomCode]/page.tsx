/**
 * Page lobby - Salle d'attente
 * Design Premium Glassmorphism
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameActions } from '../../../hooks/useGameActions';
import { useRoomState, useIsHost, useGamePhase, useLocalPlayer } from '../../../stores/gameStore';
import { useGameStore } from '../../../stores/gameStore';
import { LobbySettings } from '../../../components/game/LobbySettings';
import { SharePanel } from '../../../components/game/SharePanel';

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const { startGame, toggleReady, leaveRoom, joinRoom, updateSettings } = useGameActions();
  const roomState = useRoomState();
  const isHost = useIsHost();
  const gamePhase = useGamePhase();
  const localPlayer = useLocalPlayer();
  const error = useGameStore((state) => state.error);

  const [copied, setCopied] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Reset loading state on error
  useEffect(() => {
    if (error) {
      setIsJoining(false);
    }
  }, [error]);

  // Rediriger vers le jeu si la partie démarre
  useEffect(() => {
    if (gamePhase === 'COUNTDOWN' || gamePhase === 'PLAYING') {
      router.push(`/game/${roomCode}`);
    }
  }, [gamePhase, roomCode, router]);

  const handleJoin = () => {
    if (!pseudo.trim()) return;
    setIsJoining(true);
    joinRoom(roomCode, pseudo.trim());
  };

  // --- No room state: show rejoin form or loading spinner ---
  if (!roomState) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        {!isJoining ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 rounded-3xl max-w-md w-full"
          >
            <h1 className="font-display text-4xl font-bold mb-2 text-white">Rejoin Room</h1>
            <p className="text-white/40 mb-8">Enter your name to reconnect</p>

            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="YOUR NAME"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-center uppercase tracking-widest mb-6"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />

            {error && (
              <p className="text-red-400 text-sm font-bold mb-4">{error.message}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={!pseudo.trim()}
              className="w-full px-8 py-4 bg-primary text-white rounded-xl text-lg font-black uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Game
            </button>

            <div className="mt-4">
              <button
                onClick={() => router.push('/')}
                className="text-white/40 hover:text-white text-sm font-bold uppercase tracking-wider"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 font-bold uppercase tracking-widest animate-pulse">Connecting...</p>
          </div>
        )}
      </div>
    );
  }

  // --- Room state exists: show lobby ---

  // Host determines start, so we only check if OTHER players are ready
  const otherPlayers = roomState.players.filter(p => p.id !== roomState.hostId);
  const othersReady = otherPlayers.every(p => p.isReady);
  const minPlayers = roomState.settings.isSoloMode ? 1 : 2;
  const canStart = roomState.players.length >= minPlayers && (roomState.settings.isSoloMode || othersReady);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-12 glass-panel p-4 md:p-6 rounded-3xl"
        >
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Room Code</p>
            <div
              onClick={copyCode}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <h1 className="font-display text-3xl md:text-6xl font-black tracking-wider text-white group-hover:text-primary transition-colors">
                {roomCode}
              </h1>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 p-2 rounded-lg">
                📋
              </div>
            </div>
            {copied && <p className="text-green-400 text-xs font-bold absolute mt-1">COPIED!</p>}
          </div>

          <div className="mt-4 md:mt-0 text-right">
            <div className="inline-block px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <span className="text-2xl font-bold text-white">{roomState.players.length}</span>
              <span className="text-white/40 ml-2 text-sm font-bold uppercase">Players</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Liste des joueurs */}
          <div className="md:col-span-8">
            <h2 className="text-white/60 text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>Roster</span>
              <span className="flex-1 h-px bg-white/10"></span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {roomState.players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                        relative p-4 rounded-2xl border transition-all duration-300
                        ${player.id === localPlayer?.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5'}
                        ${player.isReady ? 'shadow-[0_0_20px_rgba(16,185,129,0.15)] border-green-500/30' : ''}
                      `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black
                          ${player.isReady ? 'bg-green-500 text-black' : 'bg-white/10 text-white'}
                        `}>
                        {player.pseudo[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate text-lg">
                            {player.pseudo}
                          </p>
                          {player.id === roomState.hostId && (
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              Host
                            </span>
                          )}
                        </div>

                        <p className={`text-xs font-bold uppercase tracking-wider ${player.isReady ? 'text-green-400' : 'text-white/20'}`}>
                          {player.isReady ? 'Ready' : 'Not Ready'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="md:col-span-4 space-y-6">
            <SharePanel roomCode={roomCode} />

            <div className="glass-panel p-6 rounded-3xl">
              <h2 className="text-white/60 text-sm font-bold uppercase tracking-widest mb-6">Match Settings</h2>

              <LobbySettings
                settings={roomState.settings}
                isHost={isHost}
                onUpdateSettings={updateSettings}
              />

              {/* Game Loop Controls */}
              <div className="mt-8 space-y-3">
                {!isHost && (
                  <button
                    onClick={toggleReady}
                    className={`
                        w-full py-4 rounded-xl text-lg font-black uppercase tracking-wider transition-all
                        ${roomState.players.find(p => p.id === localPlayer?.id)?.isReady
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'}
                      `}
                  >
                    {roomState.players.find(p => p.id === localPlayer?.id)?.isReady ? 'Cancel Ready' : 'I\'m Ready!'}
                  </button>
                )}

                {isHost && (
                  <button
                    onClick={() => startGame()}
                    disabled={!canStart}
                    className={`
                        w-full py-4 rounded-xl text-lg font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                        ${canStart
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_30px_rgba(168,85,247,0.4)] animate-pulse-slow'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'}
                      `}
                  >
                    Launch Match
                  </button>
                )}

                <button
                  onClick={leaveRoom}
                  className="w-full py-3 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 text-sm font-bold uppercase tracking-widest transition-all"
                >
                  Leave Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
