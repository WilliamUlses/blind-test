'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { GAME_CONSTANTS } from '../../../../packages/shared/types';

export function TimelineView() {
  const roomState = useGameStore((state) => state.roomState);
  const localPlayerId = useGameStore((state) => state.localPlayer.id) || '';

  const cardsToWin = roomState?.settings?.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN;

  // Team mode detection
  const isTeamMode = !!(roomState?.settings?.enableTeams && roomState.teams && roomState.teams.length > 0);
  const currentTeamTurnId = roomState?.currentTeamTurnId;

  // Find which team the local player belongs to
  const myTeamId = isTeamMode
    ? roomState?.teams?.find((t) => t.playerIds.includes(localPlayerId))?.id
    : null;

  // Sort teams by card count (descending)
  const sortedTeams = useMemo(() => {
    if (!roomState?.teams) return [];
    return [...roomState.teams].sort(
      (a, b) => (b.timelineCards?.length || 0) - (a.timelineCards?.length || 0)
    );
  }, [roomState?.teams]);

  // Sort players by card count (descending) — for non-team mode
  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort(
      (a, b) => b.timelineCards.length - a.timelineCards.length
    );
  }, [roomState]);

  if (!roomState) return null;

  // ─── Team Mode View ───────────────────────────────────────
  if (isTeamMode) {
    return (
      <div className="space-y-4">
        {sortedTeams.map((team, index) => {
          const cardCount = team.timelineCards?.length || 0;
          const progress = Math.min(cardCount / cardsToWin, 1);
          const isMyTeam = team.id === myTeamId;
          const isActiveTurn = team.id === currentTeamTurnId;

          return (
            <motion.div
              key={team.id}
              layout
              className={`rounded-xl p-3 transition-all ${
                isMyTeam
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-white/5 border border-white/5'
              } ${isActiveTurn ? 'ring-2 ring-purple-400/50 ring-offset-1 ring-offset-black animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white/30 text-xs font-bold w-4 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: team.color || '#8B5CF6' }}
                  />
                  <span className={`font-bold text-sm truncate ${
                    isMyTeam ? 'text-amber-400' : 'text-white'
                  }`}>
                    {team.name}
                    {isMyTeam && <span className="text-white/30 text-[10px] ml-1">(toi)</span>}
                  </span>
                  {isActiveTurn && (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-wider flex-shrink-0">
                      Tour
                    </span>
                  )}
                </div>
                <span className={`font-black text-sm flex-shrink-0 ${
                  isMyTeam ? 'text-amber-400' : 'text-white/60'
                }`}>
                  {cardCount}/{cardsToWin}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    progress >= 1
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : isMyTeam
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-white/20'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              {/* Team members */}
              <div className="mt-2 flex flex-wrap gap-1">
                {team.playerIds.map((pid) => {
                  const player = roomState.players.find((p) => p.id === pid);
                  if (!player) return null;
                  return (
                    <span
                      key={pid}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        pid === localPlayerId
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      {player.pseudo}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // ─── Solo Mode View (default) ─────────────────────────────
  return (
    <div className="space-y-4">
      {/* Mini leaderboard by cards */}
      {sortedPlayers.map((player, index) => {
        const cardCount = player.timelineCards.length;
        const progress = Math.min(cardCount / cardsToWin, 1);
        const isMe = player.id === localPlayerId;

        return (
          <motion.div
            key={player.id}
            layout
            className={`rounded-xl p-3 transition-all ${
              isMe
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-white/5 border border-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/30 text-xs font-bold w-4 flex-shrink-0">
                  {index + 1}
                </span>
                <span className={`font-bold text-sm truncate ${
                  isMe ? 'text-amber-400' : 'text-white'
                }`}>
                  {player.pseudo}
                </span>
              </div>
              <span className={`font-black text-sm flex-shrink-0 ${
                isMe ? 'text-amber-400' : 'text-white/60'
              }`}>
                {cardCount}/{cardsToWin}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  progress >= 1
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : isMe
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-white/20'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
