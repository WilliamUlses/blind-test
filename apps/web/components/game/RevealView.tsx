
import { motion } from 'framer-motion';
import { useGameStore, useGameMode } from '../../stores/gameStore';

export function RevealView() {
    const result = useGameStore((state) => state.lastRoundResult);
    const gameMode = useGameMode();
    const isTimeline = gameMode === 'timeline';

    if (!result) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
            <div className={`text-center space-y-6 glass-panel p-8 rounded-3xl ${isTimeline ? 'border-amber-500/20' : 'border-primary/20'} animate-scale-up max-w-2xl w-full mx-auto relative overflow-hidden`}>
                {/* Background Glow */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] ${isTimeline ? 'bg-amber-500/10' : 'bg-primary/10'} rounded-full blur-[100px] pointer-events-none`} />

                <p className="text-white/40 text-xs font-bold uppercase tracking-widest relative z-10">
                    {isTimeline ? 'The song was' : 'The answer was'}
                </p>

                <div className="flex flex-col items-center gap-6 relative z-10">
                    {result.albumCover && (
                        <motion.img
                            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            src={result.albumCover}
                            alt="Album Cover"
                            className="w-48 h-48 rounded-2xl shadow-2xl border-4 border-white/10"
                        />
                    )}

                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2 tracking-tight">
                            {result.trackTitle}
                        </h2>
                        <p className={`text-2xl md:text-3xl text-transparent bg-clip-text font-bold ${
                            isTimeline
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                : 'bg-gradient-to-r from-primary to-secondary'
                        }`}>
                            {result.artistName}
                        </p>
                        {/* Show release year for timeline mode */}
                        {isTimeline && result.releaseYear && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-5xl md:text-6xl font-black text-amber-400 mt-4"
                            >
                                {result.releaseYear}
                            </motion.p>
                        )}
                    </div>
                </div>

                <div className="pt-6 border-t border-white/10 relative z-10">
                    <div className="flex justify-center gap-2 mb-4 flex-wrap">
                        {result.playerResults.filter(p => p.wasCorrect).map(p => (
                            <span key={p.playerId} className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                                isTimeline
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-green-500/20 text-green-400'
                            }`}>
                                {p.pseudo} {isTimeline ? 'placed it!' : 'found it!'}
                            </span>
                        ))}
                    </div>
                    <p className="text-white/60 text-sm font-medium animate-pulse">Next round starting soon...</p>
                </div>
            </div>
        </div>
    );
}
