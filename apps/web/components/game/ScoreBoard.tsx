/**
 * ScoreBoard - Classement des joueurs en temps réel
 * Design Premium Glassmorphism
 * Supporte les modes individuel et équipes
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import type { Player, Team } from '../../../../packages/shared/types';

const ScoreDelta = ({ score }: { score: number }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (score > prevScore) {
      setDelta(score - prevScore);
      setPrevScore(score);
    }
  }, [score, prevScore]);

  return (
    <AnimatePresence>
      {delta > 0 && (
        <motion.span
          key={score}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -10, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onAnimationComplete={() => setDelta(0)}
          className="absolute -right-2 -top-4 text-green-400 font-bold text-sm"
        >
          +{delta}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

/**
 * Badge de position
 */
const getPositionBadge = (index: number) => {
  switch (index) {
    case 0: return '🥇';
    case 1: return '🥈';
    case 2: return '🥉';
    default: return null;
  }
};

/**
 * Team ranking row
 */
function TeamRow({ team, totalScore, rank, playerCount }: {
  team: Team;
  totalScore: number;
  rank: number;
  playerCount: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5"
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center font-black text-white/40 text-sm">
        {getPositionBadge(rank) || `#${rank + 1}`}
      </div>

      {/* Team color dot + name */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shadow-lg"
        style={{ backgroundColor: team.color + '33', borderColor: team.color, borderWidth: 2 }}
      >
        <span style={{ color: team.color }}>{team.name[0]}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate">{team.name}</p>
        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
          {playerCount} joueur{playerCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Total team score */}
      <div className="text-right">
        <p className="font-black text-xl tracking-tight leading-none text-white">{totalScore}</p>
      </div>
    </motion.div>
  );
}

/**
 * Individual player row (supports team indicator dot)
 */
function PlayerRow({ player, index, isLocalPlayer, teamColor, showLives }: {
  player: Player;
  index: number;
  isLocalPlayer: boolean;
  teamColor?: string;
  showLives?: boolean;
}) {
  return (
    <motion.div
      key={player.id}
      layout
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300
        ${isLocalPlayer
          ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
          : 'bg-white/5 border-white/5 hover:bg-white/10'}
      `}
    >
      {/* Position / Rank */}
      <div className="flex-shrink-0 w-8 text-center font-black text-white/40 text-sm">
        {getPositionBadge(index) || `#${index + 1}`}
      </div>

      {/* Avatar */}
      <div className="relative">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-lg
          ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                'bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/10'}
        `}>
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
          ) : (
            player.pseudo[0].toUpperCase()
          )}
        </div>

        {/* Status Indicator (Correct/Active) */}
        <AnimatePresence>
          {player.hasAnsweredCorrectly && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-background shadow-lg"
            >
              <svg className="w-3 h-3 text-black font-bold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team color dot */}
        {teamColor && (
          <div
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-background shadow-lg"
            style={{ backgroundColor: teamColor }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-bold truncate ${isLocalPlayer ? 'text-primary' : 'text-white'}`}>
            {player.pseudo}
          </p>
          {isLocalPlayer && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">You</span>}
        </div>

        {player.streak > 1 && (
          <div className="flex items-center gap-1 text-xs text-orange-400 font-bold uppercase tracking-wide animate-pulse">
            <span>🔥</span>
            <span>Streak {player.streak}</span>
          </div>
        )}
        {showLives && !player.isEliminated && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: player.lives }).map((_, i) => (
              <span key={i} className="text-red-500 text-xs">❤️</span>
            ))}
          </div>
        )}
      </div>

      {/* Score */}
      <div className="text-right relative">
        <p className={`font-black text-xl tracking-tight leading-none ${player.isEliminated ? 'text-white/30' : 'text-white'}`}>
          {player.score}
        </p>
        <ScoreDelta score={player.score} />
      </div>

      {/* Eliminated overlay */}
      {player.isEliminated && (
        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
          <span className="text-red-400 text-xs font-black uppercase tracking-wider">Éliminé</span>
        </div>
      )}
    </motion.div>
  );
}

export function ScoreBoard() {
  const roomState = useGameStore((state) => state.roomState);
  const localPlayer = useGameStore((state) => state.localPlayer);
  const isElimination = roomState?.settings?.gameMode === 'elimination';
  const [viewMode, setViewMode] = useState<'players' | 'teams'>('players');

  const enableTeams = roomState?.settings?.enableTeams && roomState?.teams && roomState.teams.length > 0;

  // Trier les joueurs par score décroissant
  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort((a, b) => b.score - a.score);
  }, [roomState]);

  // Team color map for quick lookup
  const teamColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (roomState?.teams) {
      for (const team of roomState.teams) {
        map[team.id] = team.color;
      }
    }
    return map;
  }, [roomState?.teams]);

  // Team rankings (sorted by total team score)
  const teamRankings = useMemo(() => {
    if (!roomState?.teams || !enableTeams) return [];
    return roomState.teams
      .map((team) => {
        const teamPlayers = roomState.players.filter((p) => p.teamId === team.id);
        const totalScore = teamPlayers.reduce((sum, p) => sum + p.score, 0);
        return { team, totalScore, playerCount: teamPlayers.length };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [roomState, enableTeams]);

  if (!roomState) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab switcher - show only when teams are enabled */}
      {enableTeams && (
        <div className="flex gap-1 mb-3 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setViewMode('players')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'players'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/30 hover:text-white/50'
              }`}
          >
            Joueurs
          </button>
          <button
            onClick={() => setViewMode('teams')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'teams'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/30 hover:text-white/50'
              }`}
          >
            Équipes
          </button>
        </div>
      )}

      <div className="space-y-3">
        {/* Team view */}
        {enableTeams && viewMode === 'teams' ? (
          <AnimatePresence mode="popLayout">
            {teamRankings.map(({ team, totalScore, playerCount }, rank) => (
              <TeamRow
                key={team.id}
                team={team}
                totalScore={totalScore}
                rank={rank}
                playerCount={playerCount}
              />
            ))}
          </AnimatePresence>
        ) : (
          /* Individual player view */
          <AnimatePresence mode="popLayout">
            {sortedPlayers.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                index={index}
                isLocalPlayer={player.id === localPlayer.id}
                teamColor={enableTeams && player.teamId ? teamColorMap[player.teamId] : undefined}
                showLives={isElimination}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {sortedPlayers.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-white/20 font-bold uppercase tracking-widest">
          Thinking...
        </div>
      )}
    </div>
  );
}
