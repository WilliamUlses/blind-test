/**
 * Hook pour gérer la lecture audio avec Howler.js
 * Gère le préchargement, la synchronisation et la progression
 * Supporte le son progressif (filtre low-pass)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl, Howler } from 'howler';

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0-100
  currentTime: number; // en secondes
  duration: number; // en secondes
  volume: number; // 0-1
  error: string | null;
}

export interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void; // en secondes
  setVolume: (volume: number) => void; // 0-1
  load: (url: string) => void;
  unload: () => void;
  playAtTime: (startTime: number) => void; // Jouer à partir d'un temps donné
}

/**
 * Hook pour gérer l'audio avec Howler.js
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const howlRef = useRef<Howl | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    error: null,
  });

  /**
   * Met à jour la progression (appelé régulièrement pendant la lecture)
   */
  const updateProgress = useCallback(() => {
    const howl = howlRef.current;
    if (!howl || !howl.playing()) {
      return;
    }

    const currentTime = howl.seek() as number;
    const duration = howl.duration();
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    setState((prev) => ({
      ...prev,
      currentTime,
      progress,
      duration,
    }));
  }, []);

  /**
   * Démarre l'intervalle de mise à jour de la progression
   */
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(updateProgress, 100); // Mise à jour 10x/seconde
  }, [updateProgress]);

  /**
   * Arrête l'intervalle de mise à jour
   */
  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  /**
   * Charge un fichier audio
   */
  const load = useCallback(
    (url: string) => {
      // Décharger l'audio précédent
      if (howlRef.current) {
        howlRef.current.unload();
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 0,
        currentTime: 0,
      }));

      const howl = new Howl({
        src: [url],
        html5: true,
        preload: true,
        volume: state.volume,
        format: ['mp3', 'aac'],

        onload: () => {
          const duration = howl.duration();
          setState((prev) => ({
            ...prev,
            isLoading: false,
            duration,
          }));
        },

        onloaderror: (_id, error) => {
          console.error('Audio load error:', error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Erreur de chargement audio',
          }));
        },

        onplay: () => {
          setState((prev) => ({ ...prev, isPlaying: true }));
          startProgressTracking();
        },

        onpause: () => {
          setState((prev) => ({ ...prev, isPlaying: false }));
          stopProgressTracking();
        },

        onstop: () => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            progress: 0,
            currentTime: 0,
          }));
          stopProgressTracking();
        },

        onend: () => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            progress: 100,
          }));
          stopProgressTracking();
        },

        onplayerror: (_id, error) => {
          console.error('Audio play error:', error);
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            error: 'Erreur de lecture audio',
          }));
          stopProgressTracking();
        },
      });

      howlRef.current = howl;
    },
    [state.volume, startProgressTracking, stopProgressTracking]
  );

  /**
   * Décharge l'audio
   */
  const unload = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }

    stopProgressTracking();

    setState({
      isPlaying: false,
      isLoading: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      volume: state.volume,
      error: null,
    });
  }, [state.volume, stopProgressTracking]);

  /**
   * Lance la lecture
   */
  const play = useCallback(() => {
    const howl = howlRef.current;
    if (!howl) return;

    howl.play();
  }, []);

  /**
   * Met en pause
   */
  const pause = useCallback(() => {
    const howl = howlRef.current;
    if (!howl) return;

    howl.pause();
  }, []);

  /**
   * Arrête la lecture
   */
  const stop = useCallback(() => {
    const howl = howlRef.current;
    if (!howl) return;

    howl.stop();
  }, []);

  /**
   * Cherche un moment précis de la lecture
   */
  const seek = useCallback((time: number) => {
    const howl = howlRef.current;
    if (!howl) return;

    howl.seek(time);
    updateProgress();
  }, [updateProgress]);

  /**
   * Définit le volume
   */
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    const howl = howlRef.current;
    if (howl) {
      howl.volume(clampedVolume);
    }

    // Définir le volume global pour les prochains sons
    Howler.volume(clampedVolume);

    setState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  /**
   * Joue à partir d'un temps donné (pour la synchronisation)
   */
  const playAtTime = useCallback((startTime: number) => {
    const howl = howlRef.current;
    if (!howl) return;

    howl.seek(startTime);
    howl.play();
  }, []);

  /**
   * Cleanup au démontage
   */
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (howlRef.current) {
        howlRef.current.unload();
      }
    };
  }, [stopProgressTracking]);

  return {
    ...state,
    play,
    pause,
    stop,
    seek,
    setVolume,
    load,
    unload,
    playAtTime,
  };
}

/**
 * Hook spécialisé pour gérer la synchronisation audio dans le blind test
 * Précharge l'audio et le joue au bon moment selon le timestamp serveur
 * Supporte le filtre low-pass pour le mode "Son progressif"
 */
export function useSyncedAudioPlayer(options?: { progressiveAudio?: boolean; roundDurationMs?: number }) {
  const audioPlayer = useAudioPlayer();
  const [syncTarget, setSyncTarget] = useState<{ url: string; startTimestamp: number; offset: number } | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Progressive audio filter refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const filterConnectedRef = useRef(false);

  const { isLoading, duration, error, play, playAtTime, load, unload, pause, stop } = audioPlayer;

  const progressiveAudio = options?.progressiveAudio ?? false;
  const roundDurationMs = options?.roundDurationMs ?? 30000;

  /**
   * Setup progressive audio filter (low-pass sweep from 200Hz to 20kHz)
   * Only activates when progressiveAudio is true.
   * Uses Howler's masterGain node to insert a BiquadFilter.
   */
  const setupProgressiveFilter = useCallback(() => {
    if (!progressiveAudio || filterConnectedRef.current) return;

    try {
      const ctx = Howler.ctx;
      if (!ctx) return;
      audioContextRef.current = ctx;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 1;
      filterNodeRef.current = filter;

      // Use Howler's masterGain (Web Audio API mode)
      const howlerMasterGain = (Howler as any).masterGain;
      if (howlerMasterGain) {
        try {
          howlerMasterGain.disconnect();
          howlerMasterGain.connect(filter);
          filter.connect(ctx.destination);
          filterConnectedRef.current = true;
        } catch (connectErr) {
          // If disconnect fails, skip filter setup
          console.warn('Could not reroute audio through filter:', connectErr);
        }
      }
    } catch (err) {
      console.warn('Could not setup progressive audio filter:', err);
    }
  }, [progressiveAudio]);

  /**
   * Start sweeping the filter frequency from 200Hz to 20kHz over roundDuration
   */
  const startFilterSweep = useCallback(() => {
    if (!progressiveAudio || !filterNodeRef.current) return;

    const filter = filterNodeRef.current;
    const startFreq = 200;
    const endFreq = 20000;
    const steps = roundDurationMs / 100; // Update every 100ms
    let step = 0;

    // Clear existing interval
    if (filterIntervalRef.current) {
      clearInterval(filterIntervalRef.current);
    }

    filter.frequency.value = startFreq;

    filterIntervalRef.current = setInterval(() => {
      step++;
      // Exponential sweep sounds more natural
      const progress = step / steps;
      const freq = startFreq * Math.pow(endFreq / startFreq, progress);
      filter.frequency.value = Math.min(freq, endFreq);

      if (step >= steps) {
        if (filterIntervalRef.current) {
          clearInterval(filterIntervalRef.current);
          filterIntervalRef.current = null;
        }
      }
    }, 100);
  }, [progressiveAudio, roundDurationMs]);

  /**
   * Reset the filter to initial state
   */
  const resetFilter = useCallback(() => {
    if (filterIntervalRef.current) {
      clearInterval(filterIntervalRef.current);
      filterIntervalRef.current = null;
    }
    if (filterNodeRef.current) {
      filterNodeRef.current.frequency.value = 200;
    }
  }, []);

  /**
   * Cleanup filter on unmount
   */
  const cleanupFilter = useCallback(() => {
    resetFilter();
    if (filterConnectedRef.current) {
      try {
        // Reconnect Howler's master gain directly to destination
        const howlerMasterGain = (Howler as any).masterGain;
        const ctx = audioContextRef.current;
        if (howlerMasterGain && ctx) {
          if (filterNodeRef.current) {
            filterNodeRef.current.disconnect();
          }
          howlerMasterGain.disconnect();
          howlerMasterGain.connect(ctx.destination);
        }
      } catch (err) {
        // Ignore cleanup errors
      }
      filterConnectedRef.current = false;
    }
    filterNodeRef.current = null;
    sourceNodeRef.current = null;
  }, [resetFilter]);

  /**
   * Précharge et synchronise la lecture avec le timestamp serveur
   */
  const loadAndSync = useCallback(
    (url: string, startTimestamp: number, serverTimeOffset: number = 0) => {
      // Nettoyer les timeouts précédents
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }

      setSyncTarget({ url, startTimestamp, offset: serverTimeOffset });
      setIsSynced(false);
      load(url);
    },
    [load]
  );

  // Effet pour gérer la synchronisation une fois l'audio chargé
  useEffect(() => {
    if (!syncTarget || isSynced || isLoading || error) {
      return;
    }

    if (duration <= 0) {
      return;
    }

    // Calculer le moment de départ
    const now = Date.now() + syncTarget.offset;
    const delay = syncTarget.startTimestamp - now;

    if (delay > 0) {
      playTimeoutRef.current = setTimeout(() => {
        // Setup progressive filter before playing
        if (progressiveAudio) {
          setupProgressiveFilter();
          startFilterSweep();
        }
        play();
        setIsSynced(true);
      }, delay);
    } else {
      const elapsed = Math.abs(delay);
      const seekTime = elapsed / 1000;

      if (seekTime < duration) {
        // Setup progressive filter
        if (progressiveAudio) {
          setupProgressiveFilter();
          // Fast-forward the filter to match elapsed time
          if (filterNodeRef.current) {
            const progress = elapsed / roundDurationMs;
            const freq = 200 * Math.pow(20000 / 200, Math.min(progress, 1));
            filterNodeRef.current.frequency.value = freq;
          }
          startFilterSweep();
        }
        playAtTime(seekTime);
        setIsSynced(true);
      } else {
        setIsSynced(true);
      }
    }

    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [syncTarget, isSynced, isLoading, duration, error, play, playAtTime, progressiveAudio, setupProgressiveFilter, startFilterSweep, roundDurationMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      cleanupFilter();
    };
  }, [cleanupFilter]);


  return {
    ...audioPlayer,
    loadAndSync,
    isSynced,
    resetFilter,
  };
}
