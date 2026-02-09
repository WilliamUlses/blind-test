/**
 * Page de résultats finaux
 * Design moderne minimaliste
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRoomState } from '../../../stores/gameStore';
import { useMemo } from 'react';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const roomState = useRoomState();

  // Trier les joueurs par score
  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort((a, b) => b.score - a.score);
  }, [roomState]);

  const top3 = sortedPlayers.slice(0, 3);
  const others = sortedPlayers.slice(3);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto">
        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <h1 className="font-display text-6xl font-bold mb-4">
            <span className="text-white">Résultats</span>
          </h1>
          <p className="text-muted">Room {roomCode}</p>
        </motion.div>

        {/* Podium Top 3 */}
        <div className="mb-12 space-y-4">
          {top3.map((player, index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const heights = ['h-32', 'h-24', 'h-20'];

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2 }}
                className={`bg-white/5 rounded-2xl p-6 ${
                  index === 0 ? 'border-2 border-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{medals[index]}</div>
                    <div>
                      <p className="text-white font-display text-2xl font-bold">
                        {player.pseudo}
                      </p>
                      <p className="text-muted text-sm">
                        {player.streak > 0 && `🔥 Série de ${player.streak}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-accent font-display text-3xl font-bold">
                      {player.score.toLocaleString()}
                    </p>
                    <p className="text-muted text-sm">points</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Autres joueurs */}
        {others.length > 0 && (
          <div className="mb-12">
            <h2 className="text-white/50 text-sm font-semibold mb-4 uppercase tracking-wide">
              Autres joueurs
            </h2>
            <div className="space-y-2">
              {others.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted text-lg font-bold">
                      #{index + 4}
                    </span>
                    <span className="text-white font-semibold">
                      {player.pseudo}
                    </span>
                  </div>

                  <span className="text-accent font-mono">
                    {player.score.toLocaleString()} pts
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton retour */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <button
            onClick={() => router.push('/')}
            className="w-full px-8 py-5 bg-accent rounded-full text-black text-lg font-bold hover:bg-accent/90 transition-all"
          >
            Nouvelle partie
          </button>
        </motion.div>
      </div>
    </div>
  );
}
