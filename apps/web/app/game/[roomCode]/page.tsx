/**
 * Page de jeu principale
 * Design Premium Glassmorphism & Animations
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGamePhase, useCurrentRound, useRoomState, useGameStore, useConnectionStatus, useGameMode } from '../../../stores/gameStore';
import { useGameActions } from '../../../hooks/useGameActions';
import { Countdown321 } from '../../../components/game/Countdown321';
import { MusicPlayer } from '../../../components/game/MusicPlayer';
import { Timer } from '../../../components/game/Timer';
import { AnswerInput } from '../../../components/game/AnswerInput';
import { ScoreBoard } from '../../../components/game/ScoreBoard';
import { useSyncedAudioPlayer } from '../../../hooks/useAudioPlayer';
import { RevealView } from '../../../components/game/RevealView';
import { EmoteBar } from '../../../components/game/EmoteBar';
import { EmoteOverlay } from '../../../components/game/EmoteOverlay';
import { TimelinePlacement } from '../../../components/game/TimelinePlacement';
import { TimelineView } from '../../../components/game/TimelineView';
import { BuzzerInput } from '../../../components/game/BuzzerInput';
import { PowerUpBar } from '../../../components/game/PowerUpBar';
import { IntroTierIndicator } from '../../../components/game/IntroTierIndicator';
import { LyricsInput } from '../../../components/game/LyricsInput';
import { GAME_CONSTANTS } from '../../../../../packages/shared/types';

// Helper component for Rejoin
function JoinButton({ pseudo, roomCode, onJoin }: { pseudo: string, roomCode: string, onJoin: () => void }) {
  const { joinRoom } = useGameActions(); // togglePause not needed here

  return (
    <button
      onClick={() => {
        if (pseudo.trim()) {
          onJoin();
          joinRoom(roomCode, pseudo.trim());
        }
      }}
      className="w-full px-8 py-4 bg-primary text-white rounded-xl text-lg font-black uppercase tracking-wider hover:bg-primary/90 transition-all"
    >
      Rejoin Game
    </button>
  );
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const gamePhase = useGamePhase();
  const currentRound = useCurrentRound();
  const roomState = useRoomState();
  const gameMode = useGameMode();
  // Never apply progressive audio filter in buzzer mode (causes distortion)
  const shouldUseProgressiveAudio = gameMode !== 'buzzer' &&
    ((roomState?.settings?.progressiveAudio ?? false) || roomState?.settings?.difficulty === 'hard');
  const audioPlayer = useSyncedAudioPlayer({
    progressiveAudio: shouldUseProgressiveAudio,
    roundDurationMs: roomState?.settings?.roundDurationMs ?? 30000,
  });
  const serverTimeOffset = useGameStore((state) => state.serverTimeOffset);
  const { isConnected, isConnecting } = useConnectionStatus();
  const isTimeline = gameMode === 'timeline';
  const isBuzzer = gameMode === 'buzzer';
  const isElimination = gameMode === 'elimination';
  const isIntro = gameMode === 'intro';
  const isLyrics = gameMode === 'lyrics';
  const buzzerLock = useGameStore(s => s.buzzerLock);
  const currentIntroTier = useGameStore(s => s.currentIntroTier);
  const activeHint = useGameStore(s => s.activeHint);
  const introPhase = useGameStore(s => s.introPhase);
  const [showVolume, setShowVolume] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const volumeRef = useRef<HTMLDivElement>(null);

  // Charger l'audio quand un round démarre
  useEffect(() => {
    if (currentRound && gamePhase === 'PLAYING') {
      audioPlayer.loadAndSync(
        currentRound.previewUrl,
        currentRound.startTimestamp,
        serverTimeOffset
      );
    }


    return () => {
      audioPlayer.unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound?.previewUrl, currentRound?.startTimestamp, gamePhase]);

  // Intro mode: pause/resume audio based on phase
  useEffect(() => {
    if (!isIntro || gamePhase !== 'PLAYING') return;
    if (introPhase === 'guessing') {
      audioPlayer.pause();
    } else if (introPhase === 'listening') {
      // Replay from the beginning for cumulative listening
      audioPlayer.seek(0);
      audioPlayer.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introPhase, isIntro, gamePhase]);

  const { togglePause, sendEmote, leaveRoom, buzzerPress, submitAnswer, submitTimelineAnswer, submitLyrics } = useGameActions();
  const emotes = useGameStore((state) => state.emotes);

  // Rediriger si la partie est terminée
  useEffect(() => {
    if (gamePhase === 'FINISHED') {
      router.push(`/results/${roomCode}`);
    }
  }, [gamePhase, roomCode, router]);

  // Close volume popover on outside click
  useEffect(() => {
    if (!showVolume) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolume(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolume]);

  const toggleMute = () => {
    if (audioPlayer.volume > 0) {
      setPrevVolume(audioPlayer.volume);
      audioPlayer.setVolume(0);
    } else {
      audioPlayer.setVolume(prevVolume || 0.8);
    }
  };

  /* State for manual rejoin */
  const [pseudo, setPseudo] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // If no roomState, allow manual rejoin
  if (!roomState) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        {!isJoining ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 rounded-3xl max-w-md w-full"
          >
            <h1 className="font-display text-4xl font-bold mb-2 text-white">Rejoin Game</h1>
            <p className="text-white/40 mb-8">Enter your name to reconnect</p>

            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="YOUR NAME"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-center uppercase tracking-widest mb-6"
              maxLength={20}
            />

            <JoinButton pseudo={pseudo} roomCode={roomCode} onJoin={() => setIsJoining(true)} />

            <div className="mt-4">
              <button
                onClick={() => router.push('/')}
                className="text-white/40 hover:text-white text-sm font-bold uppercase tracking-wider"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 font-bold uppercase tracking-widest animate-pulse">Reconnecting...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Emote Overlay */}
      <EmoteOverlay emotes={emotes} />

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      {/* Countdown overlay */}
      <Countdown321 />

      <div className="flex-1 p-4 lg:p-8 z-10 flex flex-col max-w-7xl mx-auto w-full">
        {/* Header (Timer & Round Info) */}
        <header className="flex justify-between items-center mb-4 md:mb-8 relative">
          {/* Room Code */}
          <div className="glass-panel px-3 py-2 md:px-6 md:py-3 rounded-full flex items-center gap-2 md:gap-4">
            <span className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest">Room</span>
            <span className="text-white font-black text-sm md:text-lg tracking-wider">{roomCode}</span>
          </div>

          {/* Timer Centered — hidden for buzzer (has its own timer) and intro (no global timer) */}
          {gamePhase === 'PLAYING' && !isBuzzer && !isIntro && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <Timer />
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Connection Indicator */}
            <div
              role="status"
              aria-label={isConnected ? 'Connected' : isConnecting ? 'Reconnecting' : 'Disconnected'}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${isConnected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                : isConnecting ? 'bg-yellow-500 animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.5)]'
                  : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                }`}
              title={isConnected ? 'Connected' : isConnecting ? 'Reconnecting...' : 'Disconnected'}
            />

            {/* Round Info — conditional for timeline */}
            {isTimeline ? (
              <div className="glass-panel px-3 py-2 md:px-6 md:py-3 rounded-full flex items-center gap-2 md:gap-4">
                <span className="text-amber-500/60 text-[10px] md:text-xs font-bold uppercase tracking-widest hidden md:inline">Cards</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-amber-500 font-black text-sm md:text-xl">
                    {(() => {
                      const localId = useGameStore.getState().localPlayer?.id || '';
                      const isTeamMode = roomState.settings?.enableTeams && roomState.teams && roomState.teams.length > 0;
                      if (isTeamMode) {
                        const myTeam = roomState.teams?.find(t => t.playerIds.includes(localId));
                        return myTeam?.timelineCards?.length || 0;
                      }
                      const me = roomState.players.find(p => p.id === localId);
                      return me?.timelineCards?.length || 0;
                    })()}
                  </span>
                  <span className="text-white/40 font-bold text-[10px] md:text-sm">/ {roomState.settings.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN}</span>
                </div>
              </div>
            ) : (
              <div className="glass-panel px-3 py-2 md:px-6 md:py-3 rounded-full flex items-center gap-2 md:gap-4">
                <span className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest hidden md:inline">Round</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-primary font-black text-sm md:text-xl">{currentRound?.roundNumber || '-'}</span>
                  <span className="text-white/40 font-bold text-[10px] md:text-sm">/ {roomState.settings.totalRounds}</span>
                </div>
              </div>
            )}

            {/* Volume Control */}
            <div className="relative" ref={volumeRef}>
              <button
                onClick={toggleMute}
                onContextMenu={(e) => { e.preventDefault(); setShowVolume(!showVolume); }}
                onMouseEnter={() => setShowVolume(true)}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${audioPlayer.volume === 0
                  ? 'bg-white/5 text-white/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                aria-label={audioPlayer.volume === 0 ? 'Unmute audio' : 'Mute audio'}
                title={audioPlayer.volume === 0 ? 'Unmute' : 'Mute'}
              >
                {audioPlayer.volume === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : audioPlayer.volume < 0.5 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>

              {/* Volume Slider Popover */}
              {showVolume && (
                <div
                  className="absolute top-full right-0 mt-2 z-50 glass-panel rounded-2xl p-3 flex items-center gap-3"
                  onMouseLeave={() => setShowVolume(false)}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audioPlayer.volume * 100)}
                    onChange={(e) => audioPlayer.setVolume(Number(e.target.value) / 100)}
                    className="w-24 accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                    aria-label="Volume"
                  />
                  <span className="text-xs text-white/40 font-bold w-8">{Math.round(audioPlayer.volume * 100)}%</span>
                </div>
              )}
            </div>

            {/* Pause Button */}
            {gamePhase === 'PLAYING' && (
              <button
                onClick={() => togglePause()}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all text-xs md:text-base ${roomState.players.find(p => p.id === useGameStore.getState().localPlayer?.id)?.hasVotedToPause
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                aria-label={roomState.isPaused ? 'Resume game' : 'Pause game'}
                title={roomState.isPaused ? 'Resume' : 'Pause'}
              >
                {roomState.isPaused ? '▶' : 'II'}
              </button>
            )}

            {/* Leave Button */}
            <button
              onClick={() => {
                const isActive = gamePhase === 'PLAYING' || gamePhase === 'COUNTDOWN' || gamePhase === 'REVEAL';
                if (isActive) {
                  setShowLeaveConfirm(true);
                } else {
                  leaveRoom();
                  router.push('/');
                }
              }}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all text-xs md:text-base"
              aria-label="Leave game"
              title="Leave Game"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-center">
          {/* Main Game Area */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-6 md:space-y-12">

            {/* Visualizer / Player */}
            <div className="w-full max-w-[250px] md:max-w-lg aspect-square flex items-center justify-center relative mx-auto">
              <div className={`absolute inset-0 ${isTimeline ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' : 'bg-gradient-to-br from-primary/20 to-secondary/20'} rounded-full blur-3xl animate-pulse-slow`} />
              <MusicPlayer isPlaying={audioPlayer.isPlaying} />
            </div>

            {/* Answer Input Area */}
            <div className="w-full max-w-2xl relative z-20">
              {/* Intro tier indicator */}
              {isIntro && gamePhase === 'PLAYING' && (
                <IntroTierIndicator />
              )}

              {/* Hint display */}
              {activeHint && gamePhase === 'PLAYING' && (
                <div className="mb-3 text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-bold">
                    <span>💡</span>
                    {activeHint.hintType === 'artist' ? 'Artiste' : 'Titre'} commence par : <span className="text-white font-black text-lg">{activeHint.hint}</span>
                  </span>
                </div>
              )}

              {/* Power-up bar */}
              {roomState.settings.enablePowerUps && gamePhase === 'PLAYING' && (
                <PowerUpBar />
              )}

              {/* Timeline: single render across PLAYING + REVEAL to preserve flip animation state */}
              {isTimeline && (gamePhase === 'PLAYING' || gamePhase === 'REVEAL') ? (
                <>
                  <TimelinePlacement onSubmit={submitTimelineAnswer} />
                  {gamePhase === 'PLAYING' && <EmoteBar onEmote={sendEmote} />}
                </>
              ) : gamePhase === 'PLAYING' ? (
                (() => {
                  // Check if eliminated (spectator overlay)
                  const meInRoom = roomState.players.find(p => p.id === useGameStore.getState().localPlayer?.id);
                  if (meInRoom?.isEliminated) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-5xl mb-4">💀</div>
                        <p className="text-white/60 font-bold uppercase tracking-wider text-sm">Éliminé</p>
                        <p className="text-white/30 text-xs mt-2">Tu regardes en spectateur</p>
                      </div>
                    );
                  }

                  if (isBuzzer) {
                    return (
                      <>
                        <BuzzerInput
                          onBuzz={buzzerPress}
                          onSubmitAnswer={submitAnswer}
                          onPauseAudio={() => audioPlayer.pause()}
                          onResumeAudio={() => audioPlayer.play()}
                        />
                        <EmoteBar onEmote={sendEmote} />
                      </>
                    );
                  }
                  if (isLyrics) {
                    return (
                      <>
                        <AnswerInput placeholder="Artiste + Titre..." />
                        <LyricsInput
                          onSubmitLyrics={(answers) => {
                            submitLyrics(answers);
                          }}
                        />
                        <EmoteBar onEmote={sendEmote} />
                      </>
                    );
                  }
                  return (
                    <>
                      <AnswerInput placeholder="Type Artist + Title..." />
                      <EmoteBar onEmote={sendEmote} />
                    </>
                  );
                })()
              ) : gamePhase === 'REVEAL' ? (
                <RevealView />
              ) : (
                <div className="text-center text-white/40 font-bold uppercase tracking-widest animate-pulse">
                  Get Ready...
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 h-full max-h-[300px] lg:max-h-[600px] glass-panel rounded-3xl p-4 md:p-6 overflow-hidden flex flex-col">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              {isTimeline ? 'Timeline' : 'Leaderboard'}
              <span className="flex-1 h-px bg-white/10"></span>
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" aria-live="polite">
              {isTimeline ? <TimelineView /> : <ScoreBoard />}
            </div>
          </div>
        </div>
      </div>
      {/* LEAVE CONFIRMATION OVERLAY */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="glass-panel p-8 rounded-3xl text-center max-w-sm w-full animate-scale-up">
            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Quitter la partie ?</h2>
            <p className="text-white/60 mb-8 font-medium text-sm">Ta progression sera perdue.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-white/20 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => { leaveRoom(); router.push('/'); }}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-red-600 transition-all"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {roomState.isPaused && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="glass-panel p-12 rounded-3xl text-center max-w-lg w-full animate-scale-up border-yellow-500/20">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 bg-yellow-500 rounded-sm" />
              <div className="w-8 h-8 bg-yellow-500 rounded-sm ml-2" />
            </div>
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">GAME PAUSED</h2>
            <p className="text-white/60 mb-8 font-medium">Wait for other players to resume...</p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => togglePause()}
                className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${roomState.players.find(p => p.id === useGameStore.getState().localPlayer?.id)?.hasVotedToPause
                  ? 'bg-green-500 text-black hover:bg-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                {roomState.players.find(p => p.id === useGameStore.getState().localPlayer?.id)?.hasVotedToPause
                  ? 'VOTE TO RESUME'
                  : 'VOTE TO RESUME'}
              </button>
            </div>
            <p className="mt-6 text-xs text-white/40 font-bold uppercase tracking-widest">
              {roomState.players.filter(p => p.hasVotedToPause).length} / {Math.ceil(roomState.players.length / 2) + 1} VOTES NEEDED
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
