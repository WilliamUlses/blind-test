/**
 * Hook pour gérer la lecture audio avec Howler.js
 * Gère le préchargement, la synchronisation et la progression
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
        html5: true, // Utiliser HTML5 audio pour le streaming
        preload: true,
        volume: state.volume,

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
 */
export function useSyncedAudioPlayer() {
  const audioPlayer = useAudioPlayer();
  const [syncTarget, setSyncTarget] = useState<{ url: string; startTimestamp: number; offset: number } | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoading, duration, error, play, playAtTime, load, unload } = audioPlayer;

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
    // Conditions pour tenter la synchro :
    // 1. On a une cible de synchro
    // 2. Ce n'est pas encore synchro
    // 3. Le chargement est terminé
    // 4. Pas d'erreur
    if (!syncTarget || isSynced || isLoading || error) {
      return;
    }

    // Sécurité : vérifier que la durée est valide
    if (duration <= 0) {
      return;
    }

    // Calculer le moment de départ
    const now = Date.now() + syncTarget.offset;
    const delay = syncTarget.startTimestamp - now;

    if (delay > 0) {
      // Attendre le bon moment
      playTimeoutRef.current = setTimeout(() => {
        play();
        setIsSynced(true);
      }, delay);
    } else {
      // On est en retard (ou pile à l'heure), chercher le bon moment
      const elapsed = Math.abs(delay);
      const seekTime = elapsed / 1000; // secondes

      if (seekTime < duration) {
        playAtTime(seekTime);
        setIsSynced(true);
      } else {
        setIsSynced(true); // Marquer comme traité même si trop tard
      }
    }

    // Cleanup function du useEffect pour nettoyer le timeout si le composant démonte ou si les dépendances changent
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [syncTarget, isSynced, isLoading, duration, error, play, playAtTime]);

  // Reset sync state on unload
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    }
  }, []);


  return {
    ...audioPlayer,
    loadAndSync,
    isSynced,
  };
}
