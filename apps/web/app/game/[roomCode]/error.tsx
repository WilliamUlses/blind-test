'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Game error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Game Error</h1>
        <p className="text-white/40 mb-8 text-sm">
          The game encountered an error. You can try to recover or return to the lobby.
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full py-4 bg-primary text-white rounded-xl text-lg font-black uppercase tracking-wider hover:bg-primary/90 transition-all"
          >
            Try Again
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 text-white/40 hover:text-white/80 text-sm font-bold uppercase tracking-widest transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
