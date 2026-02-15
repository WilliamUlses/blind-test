'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

const TEAM_COLORS = [
  { id: 'team-red', name: 'Rouge', color: 'bg-red-500', border: 'border-red-500/30' },
  { id: 'team-blue', name: 'Bleu', color: 'bg-blue-500', border: 'border-blue-500/30' },
  { id: 'team-green', name: 'Vert', color: 'bg-green-500', border: 'border-green-500/30' },
  { id: 'team-yellow', name: 'Jaune', color: 'bg-yellow-500', border: 'border-yellow-500/30' },
];

interface TeamSelectorProps {
  onJoinTeam: (teamId: string) => void;
}

export function TeamSelector({ onJoinTeam }: TeamSelectorProps) {
  const roomState = useGameStore(s => s.roomState);
  const localPlayer = useGameStore(s => s.localPlayer);

  if (!roomState) return null;

  const myTeamId = roomState.players.find(p => p.id === localPlayer.id)?.teamId;

  return (
    <div>
      <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
        Équipe
      </label>
      <div className="grid grid-cols-2 gap-2">
        {TEAM_COLORS.map(team => {
          const membersCount = roomState.players.filter(p => p.teamId === team.id).length;
          const isSelected = myTeamId === team.id;

          return (
            <motion.button
              key={team.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onJoinTeam(team.id)}
              className={`relative p-3 rounded-xl border transition-all ${
                isSelected
                  ? `${team.border} bg-white/10 shadow-lg`
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${team.color}`} />
                <span className="text-white text-xs font-bold">{team.name}</span>
                <span className="text-white/30 text-[10px] font-bold ml-auto">{membersCount}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
      {!myTeamId && (
        <p className="text-white/20 text-[10px] font-medium mt-2 text-center">
          Choisis une équipe
        </p>
      )}
    </div>
  );
}
