/**
 * Podium final animé
 * Les 3 premiers montent sur des colonnes avec animations staggered
 * Le 1er apparaît en dernier pour le suspense
 */

'use client';

import { motion } from 'framer-motion';
import { Player } from '../../../../packages/shared/types';

interface FinalPodiumProps {
  players: Player[];
}

export function FinalPodium({ players }: FinalPodiumProps) {
  // Trier par score décroissant
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Top 3
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  /**
   * Hauteur de la colonne selon la position
   */
  const getColumnHeight = (position: number) => {
    switch (position) {
      case 1:
        return 'h-64'; // 1er - le plus haut
      case 2:
        return 'h-48'; // 2ème
      case 3:
        return 'h-40'; // 3ème
      default:
        return 'h-32';
    }
  };

  /**
   * Couleur selon la position
   */
  const getColor = (position: number) => {
    switch (position) {
      case 1:
        return 'from-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-400 to-gray-500';
      case 3:
        return 'from-orange-600 to-orange-700';
      default:
        return 'from-purple-500 to-purple-600';
    }
  };

  /**
   * Composant d'un podium
   */
  const PodiumColumn = ({
    player,
    position,
    delay,
  }: {
    player: Player | undefined;
    position: number;
    delay: number;
  }) => {
    if (!player) return null;

    return (
      <motion.div
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.8,
          delay,
          type: 'spring',
          bounce: 0.4,
        }}
        className="flex flex-col items-center"
      >
        {/* Avatar et info au-dessus de la colonne */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.3, duration: 0.5 }}
          className="mb-4 text-center"
        >
          {/* Avatar */}
          <div className="relative mb-2">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.pseudo}
                className={`
                  rounded-full object-cover ring-4
                  ${position === 1 ? 'w-24 h-24 ring-yellow-500' : 'w-16 h-16 ring-white/50'}
                `}
              />
            ) : (
              <div
                className={`
                  rounded-full bg-gradient-to-br ${getColor(position)}
                  flex items-center justify-center text-white font-bold ring-4
                  ${position === 1 ? 'w-24 h-24 text-4xl ring-yellow-500' : 'w-16 h-16 text-2xl ring-white/50'}
                `}
              >
                {player.pseudo[0].toUpperCase()}
              </div>
            )}

            {/* Couronne pour le 1er */}
            {position === 1 && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: -30, opacity: 1 }}
                transition={{ delay: delay + 0.5, duration: 0.3 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl"
              >
                👑
              </motion.div>
            )}
          </div>

          {/* Pseudo */}
          <p className={`font-bold text-white ${position === 1 ? 'text-xl' : 'text-lg'}`}>
            {player.pseudo}
          </p>

          {/* Score */}
          <p className={`text-yellow-400 font-mono ${position === 1 ? 'text-2xl' : 'text-lg'}`}>
            {player.score.toLocaleString()} pts
          </p>
        </motion.div>

        {/* Colonne */}
        <div
          className={`
            w-32 ${getColumnHeight(position)}
            bg-gradient-to-t ${getColor(position)}
            rounded-t-xl
            flex items-start justify-center pt-4
            shadow-2xl
          `}
        >
          <span className="text-white text-6xl font-black">
            {position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#0A0A0F] via-purple-900/20 to-[#0A0A0F] py-12">
      {/* Titre */}
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 mb-12"
      >
        Classement Final
      </motion.h1>

      {/* Podium - Ordre: 2ème, 1er, 3ème */}
      <div className="flex items-end justify-center gap-8 mb-12">
        {/* 2ème place */}
        <PodiumColumn player={second} position={2} delay={0.3} />

        {/* 1ère place (au milieu, apparaît en dernier) */}
        <PodiumColumn player={first} position={1} delay={0.9} />

        {/* 3ème place */}
        <PodiumColumn player={third} position={3} delay={0.6} />
      </div>

      {/* Liste des autres joueurs */}
      {sortedPlayers.length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="w-full max-w-md"
        >
          <h2 className="text-xl font-bold text-white mb-4 text-center">Autres participants</h2>
          <div className="space-y-2">
            {sortedPlayers.slice(3).map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.7 + index * 0.1 }}
                className="flex items-center justify-between bg-[#1A1A2E] rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-bold">#{index + 4}</span>
                  <span className="text-white font-semibold">{player.pseudo}</span>
                </div>
                <span className="text-purple-400 font-mono">
                  {player.score.toLocaleString()} pts
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Confettis effect (could be enhanced with react-confetti) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, delay: 1.2 }}
        className="fixed inset-0 pointer-events-none"
      >
        <div className="absolute top-0 left-1/4 text-6xl animate-bounce">🎉</div>
        <div className="absolute top-10 right-1/4 text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>
          🎊
        </div>
        <div className="absolute top-5 left-1/2 text-6xl animate-bounce" style={{ animationDelay: '0.4s' }}>
          ✨
        </div>
      </motion.div>
    </div>
  );
}
