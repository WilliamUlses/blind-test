'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-red-500 text-3xl font-black">!</span>
        </div>

        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Something went wrong</h1>
        <p className="text-white/40 mb-8 text-sm">
          An unexpected error occurred. Try again or go back to the home page.
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full py-4 bg-primary text-white rounded-xl text-lg font-black uppercase tracking-wider hover:bg-primary/90 transition-all"
          >
            Try Again
          </button>

          <a
            href="/"
            className="block w-full py-3 text-white/40 hover:text-white/80 text-sm font-bold uppercase tracking-widest transition-all text-center"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
