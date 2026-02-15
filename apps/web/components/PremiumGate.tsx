'use client';

import { motion } from 'framer-motion';
import { Crown, Lock } from 'lucide-react';

interface PremiumGateProps {
  children: React.ReactNode;
  isPremium?: boolean;
  featureName?: string;
}

export function PremiumGate({ children, isPremium = false, featureName = 'cette fonctionnalité' }: PremiumGateProps) {
  // For now, premium is always unlocked (no auth system yet)
  // When auth is implemented, check UserProfile.isPremium
  const isUnlocked = true; // TODO: replace with actual premium check

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none blur-sm select-none">
        {children}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full mb-3">
          <Crown className="w-4 h-4 text-black" />
          <span className="text-black text-xs font-black uppercase tracking-wider">PRO</span>
        </div>
        <p className="text-white/60 text-sm font-medium text-center px-4 mb-4">
          {featureName} nécessite un abonnement PRO
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl text-black font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          Débloquer
        </button>
      </motion.div>
    </div>
  );
}
