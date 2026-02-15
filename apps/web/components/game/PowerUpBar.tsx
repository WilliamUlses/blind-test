'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { POWER_UP_DEFINITIONS } from '../../../../packages/shared/types';
import type { PowerUpType } from '../../../../packages/shared/types';

export function PowerUpBar() {
  const localPlayer = useGameStore(s => s.localPlayer);
  const roomState = useGameStore(s => s.roomState);

  const meInRoom = roomState?.players.find(p => p.id === localPlayer.id);
  const powerUps = meInRoom?.powerUps || [];
  const activePowerUp = meInRoom?.activePowerUp;

  const handleActivate = useCallback((powerUp: PowerUpType) => {
    import('../../lib/socket').then(mod => {
      const socket = mod.getSocket();
      socket.emit('activate_powerup', { powerUp });
    });
  }, []);

  if (powerUps.length === 0 && !activePowerUp) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      <AnimatePresence>
        {powerUps.map((pu, i) => {
          const def = POWER_UP_DEFINITIONS[pu];
          return (
            <motion.button
              key={`${pu}-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleActivate(pu)}
              disabled={!!activePowerUp}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                activePowerUp
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/30'
              }`}
              title={def.description}
            >
              <span className="mr-1">{def.icon}</span>
              <span className="text-xs uppercase tracking-wider">{def.name}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {activePowerUp && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="px-3 py-2 rounded-xl text-sm font-bold bg-yellow-500/20 border border-yellow-500/30 text-yellow-400"
        >
          <span className="mr-1">{POWER_UP_DEFINITIONS[activePowerUp].icon}</span>
          <span className="text-xs uppercase tracking-wider">Actif</span>
        </motion.div>
      )}
    </div>
  );
}
