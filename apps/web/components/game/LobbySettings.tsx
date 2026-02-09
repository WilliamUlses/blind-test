'use client';

import { useState } from 'react';
import type { GameSettings } from '../../../../packages/shared/types';

interface LobbySettingsProps {
  settings: GameSettings;
  isHost: boolean;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

const GENRES = [
  { id: null, label: 'Random' },
  { id: 'pop', label: 'Pop' },
  { id: 'rock', label: 'Rock' },
  { id: 'rap', label: 'Rap' },
  { id: 'hip-hop', label: 'Hip-Hop' },
  { id: 'dance', label: 'Dance' },
  { id: 'electro', label: 'Electro' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'blues', label: 'Blues' },
  { id: 'country', label: 'Country' },
  { id: 'reggae', label: 'Reggae' },
] as const;

const DIFFICULTY_PRESETS = {
  easy: {
    roundDurationMs: 45_000,
    wrongAnswerCooldownMs: 1_500,
    acceptArtistOnly: false,
    acceptTitleOnly: false,
  },
  medium: {
    roundDurationMs: 30_000,
    wrongAnswerCooldownMs: 2_000,
    acceptArtistOnly: false,
    acceptTitleOnly: false,
  },
  hard: {
    roundDurationMs: 20_000,
    wrongAnswerCooldownMs: 3_000,
    acceptArtistOnly: false,
    acceptTitleOnly: false,
  },
} as const;

type AnswerMode = 'both' | 'artist' | 'title';

function getAnswerMode(settings: GameSettings): AnswerMode {
  if (settings.acceptArtistOnly) return 'artist';
  if (settings.acceptTitleOnly) return 'title';
  return 'both';
}

export function LobbySettings({ settings, isHost, onUpdateSettings }: LobbySettingsProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const difficulty = settings.difficulty || 'medium';
  const answerMode = getAnswerMode(settings);

  const handleDifficulty = (level: 'easy' | 'medium' | 'hard') => {
    if (!isHost) return;
    onUpdateSettings({ ...DIFFICULTY_PRESETS[level], difficulty: level });
  };

  const handleGenre = (genre: string | null) => {
    if (!isHost) return;
    onUpdateSettings({ genre });
  };

  const handleRounds = (value: number) => {
    if (!isHost) return;
    onUpdateSettings({ totalRounds: value });
  };

  const handleDuration = (value: number) => {
    if (!isHost) return;
    onUpdateSettings({ roundDurationMs: value * 1000 });
  };

  const handleAnswerMode = (mode: AnswerMode) => {
    if (!isHost) return;
    onUpdateSettings({
      acceptArtistOnly: mode === 'artist',
      acceptTitleOnly: mode === 'title',
    });
  };

  // Read-only display for non-host
  if (!isHost) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">Difficulty</span>
          <span className="text-primary font-bold capitalize">{difficulty}</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">Genre</span>
          <span className="text-primary font-bold">{settings.genre || 'Random'}</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">Rounds</span>
          <span className="text-primary font-bold text-xl">{settings.totalRounds}</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">Duration</span>
          <span className="text-primary font-bold text-xl">{settings.roundDurationMs / 1000}s</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-sm">Answer Mode</span>
          <span className="text-primary font-bold capitalize">
            {answerMode === 'both' ? 'Artist + Title' : answerMode === 'artist' ? 'Artist Only' : 'Title Only'}
          </span>
        </div>
      </div>
    );
  }

  // Interactive settings for host
  return (
    <div className="space-y-5">
      {/* Difficulty Presets */}
      <div>
        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
          Difficulty
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              onClick={() => handleDifficulty(level)}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                difficulty === level
                  ? level === 'easy'
                    ? 'bg-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                    : level === 'medium'
                    ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                    : 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Genre Selector */}
      <div>
        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
          Genre
        </label>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((g) => (
            <button
              key={g.id ?? 'random'}
              onClick={() => handleGenre(g.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                settings.genre === g.id
                  ? 'bg-primary text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Round Count */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Rounds
          </label>
          <span className="text-primary font-black text-lg">{settings.totalRounds}</span>
        </div>
        <input
          type="range"
          min={3}
          max={30}
          value={settings.totalRounds}
          onChange={(e) => handleRounds(Number(e.target.value))}
          className="w-full accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.5)]"
          aria-label="Number of rounds"
        />
        <div className="flex justify-between text-[10px] text-white/20 font-bold mt-1">
          <span>3</span>
          <span>30</span>
        </div>
      </div>

      {/* Round Duration */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Duration
          </label>
          <span className="text-primary font-black text-lg">{settings.roundDurationMs / 1000}s</span>
        </div>
        <input
          type="range"
          min={10}
          max={60}
          step={5}
          value={settings.roundDurationMs / 1000}
          onChange={(e) => handleDuration(Number(e.target.value))}
          className="w-full accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.5)]"
          aria-label="Round duration in seconds"
        />
        <div className="flex justify-between text-[10px] text-white/20 font-bold mt-1">
          <span>10s</span>
          <span>60s</span>
        </div>
      </div>

      {/* Answer Mode */}
      <div>
        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
          Answer Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { mode: 'both' as const, label: 'Both' },
            { mode: 'artist' as const, label: 'Artist' },
            { mode: 'title' as const, label: 'Title' },
          ]).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => handleAnswerMode(mode)}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                answerMode === mode
                  ? 'bg-primary text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
