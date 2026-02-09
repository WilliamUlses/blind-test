'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Howl } from 'howler';

const SFX_VOLUME = 0.4;

export function useSoundEffects() {
  const correctRef = useRef<Howl | null>(null);
  const incorrectRef = useRef<Howl | null>(null);
  const tickRef = useRef<Howl | null>(null);

  useEffect(() => {
    correctRef.current = new Howl({ src: ['/sounds/correct.wav'], volume: SFX_VOLUME, preload: true });
    incorrectRef.current = new Howl({ src: ['/sounds/incorrect.wav'], volume: SFX_VOLUME, preload: true });
    tickRef.current = new Howl({ src: ['/sounds/tick.wav'], volume: SFX_VOLUME, preload: true });

    return () => {
      correctRef.current?.unload();
      incorrectRef.current?.unload();
      tickRef.current?.unload();
    };
  }, []);

  const playCorrect = useCallback(() => { correctRef.current?.play(); }, []);
  const playIncorrect = useCallback(() => { incorrectRef.current?.play(); }, []);
  const playTick = useCallback(() => { tickRef.current?.play(); }, []);

  return { playCorrect, playIncorrect, playTick };
}
