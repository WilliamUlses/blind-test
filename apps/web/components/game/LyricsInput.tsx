/**
 * LyricsInput - Mode Lyrics avec fill-in-the-blank
 * Après 10s de musique, l'audio s'arrête et les paroles apparaissent
 * avec des mots manquants à compléter
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

interface LyricsInputProps {
    onSubmitLyrics: (answers: string[]) => void;
}

export function LyricsInput({ onSubmitLyrics }: LyricsInputProps) {
    const localPlayer = useGameStore((state) => state.localPlayer);
    const roomState = useGameStore((state) => state.roomState);
    const lyricsData = useGameStore((state) => state.lyricsData);

    const [answers, setAnswers] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const hasFoundAll = localPlayer.foundArtist && localPlayer.foundTitle;

    // Reset answers when new lyrics arrive
    useEffect(() => {
        if (lyricsData) {
            setAnswers(new Array(lyricsData.blanks.length).fill(''));
            setSubmitted(false);
        }
    }, [lyricsData]);

    // Focus first blank on mount
    useEffect(() => {
        if (lyricsData && inputRefs.current[0]) {
            inputRefs.current[0]?.focus();
        }
    }, [lyricsData]);

    const handleAnswerChange = useCallback((index: number, value: string) => {
        setAnswers((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            // Move to next blank
            const nextIndex = index + 1;
            if (nextIndex < (lyricsData?.blanks.length || 0)) {
                inputRefs.current[nextIndex]?.focus();
            } else {
                // Last blank, submit
                handleSubmit();
            }
        }
    }, [lyricsData]);

    const handleSubmit = useCallback(() => {
        if (submitted) return;
        setSubmitted(true);
        onSubmitLyrics(answers);
    }, [submitted, answers, onSubmitLyrics]);

    // No lyrics data yet — show waiting state
    if (!lyricsData) {
        return (
            <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-white/60 text-sm font-bold uppercase tracking-wider">
                        Écoute la musique...
                    </span>
                </div>
            </div>
        );
    }

    if (hasFoundAll) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
            >
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500/20 border border-green-500/30">
                    <span className="text-green-400 text-lg">✓</span>
                    <span className="text-green-400 font-black uppercase tracking-wider text-sm">Bien trouvé !</span>
                </div>
            </motion.div>
        );
    }

    // Parse lyrics with blanks
    const segments = parseLyricsWithBlanks(lyricsData.lyricsText, lyricsData.blanks);
    let blankIndex = 0;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
            {/* Phase indicator */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
                    📝 Complète les paroles !
                </span>
            </div>

            {/* Lyrics display with blanks */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm"
            >
                <div className="text-white leading-relaxed text-center">
                    {segments.map((segment, i) => {
                        if (segment.type === 'text') {
                            return (
                                <span key={i} className="text-white/80 font-medium">
                                    {segment.content}
                                </span>
                            );
                        } else {
                            const bi = blankIndex++;
                            const isRevealed = submitted && lyricsData.blanks[bi];
                            const isCorrect = submitted && answers[bi]?.toLowerCase().trim() === lyricsData.blanks[bi]?.answer.toLowerCase().trim();

                            return (
                                <span key={i} className="inline-block mx-1 align-middle">
                                    {submitted ? (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-sm ${isCorrect
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                            {isCorrect ? answers[bi] : lyricsData.blanks[bi].answer}
                                            {!isCorrect && (
                                                <span className="ml-1 text-white/30 line-through text-xs">{answers[bi] || '?'}</span>
                                            )}
                                        </span>
                                    ) : (
                                        <input
                                            ref={(el) => { inputRefs.current[bi] = el; }}
                                            type="text"
                                            value={answers[bi] || ''}
                                            onChange={(e) => handleAnswerChange(bi, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, bi)}
                                            placeholder="___"
                                            autoComplete="off"
                                            className={`
                        w-24 px-2 py-0.5 rounded-lg text-center font-bold text-sm
                        bg-purple-500/10 border-2 border-purple-400/30
                        text-white placeholder-white/20
                        focus:outline-none focus:border-purple-400 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)]
                        transition-all
                      `}
                                        />
                                    )}
                                </span>
                            );
                        }
                    })}
                </div>
            </motion.div>

            {/* Submit button */}
            {!submitted && (
                <motion.button
                    onClick={handleSubmit}
                    disabled={answers.some((a) => !a.trim())}
                    whileTap={{ scale: 0.95 }}
                    className="w-full max-w-xs py-3 rounded-xl bg-primary text-white font-black uppercase tracking-wider text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                    Valider
                </motion.button>
            )}

            {/* Result message */}
            <AnimatePresence>
                {submitted && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <span className="text-white/40 text-xs font-bold uppercase tracking-wider">
                            {answers.filter((a, i) => a.toLowerCase().trim() === lyricsData.blanks[i]?.answer.toLowerCase().trim()).length}
                            /{lyricsData.blanks.length} mots trouvés
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Parse lyrics text with blank positions into segments
 */
function parseLyricsWithBlanks(
    lyricsText: string,
    blanks: { position: number; answer: string }[]
): { type: 'text' | 'blank'; content: string }[] {
    if (!blanks.length) {
        return [{ type: 'text', content: lyricsText }];
    }

    const segments: { type: 'text' | 'blank'; content: string }[] = [];
    const words = lyricsText.split(/(\s+)/);
    let wordIndex = 0;
    let blankIdx = 0;
    let currentText = '';

    for (const word of words) {
        if (/^\s+$/.test(word)) {
            currentText += word;
            continue;
        }

        if (blankIdx < blanks.length && wordIndex === blanks[blankIdx].position) {
            if (currentText) {
                segments.push({ type: 'text', content: currentText });
                currentText = '';
            }
            segments.push({ type: 'blank', content: word });
            blankIdx++;
        } else {
            currentText += word;
        }
        wordIndex++;
    }

    if (currentText) {
        segments.push({ type: 'text', content: currentText });
    }

    return segments;
}
