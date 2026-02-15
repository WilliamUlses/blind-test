'use client';

import { useState } from 'react';
import type { GameSettings, GameMode } from '../../../../packages/shared/types';
import { GAME_CONSTANTS, GAME_MODES_INFO } from '../../../../packages/shared/types';

interface LobbySettingsProps {
  settings: GameSettings;
  isHost: boolean;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

const MUSIC_CATEGORIES = {
  genres: [
    { id: null, label: 'Random' }, { id: 'pop', label: 'Pop' }, { id: 'rock', label: 'Rock' },
    { id: 'rap', label: 'Rap' }, { id: 'hip-hop', label: 'Hip-Hop' }, { id: 'dance', label: 'Dance' },
    { id: 'electro', label: 'Electro' }, { id: 'jazz', label: 'Jazz' }, { id: 'blues', label: 'Blues' },
    { id: 'country', label: 'Country' }, { id: 'reggae', label: 'Reggae' },
  ],
  decades: [
    { id: '80s', label: '80s' }, { id: '90s', label: '90s' },
    { id: '2000s', label: '2000s' }, { id: '2010s', label: '2010s' },
  ],
  themes: [
    { id: 'french-classics', label: 'Classiques FR' }, { id: 'summer-hits', label: 'Summer Hits' },
    { id: 'movie-soundtracks', label: 'Films' }, { id: 'tv-themes', label: 'Séries TV' },
  ],
} as const;

type MusicTab = 'genres' | 'decades' | 'themes';

const ALL_GENRE_LABELS: Record<string, string> = {};
for (const cat of Object.values(MUSIC_CATEGORIES)) {
  for (const item of cat) {
    if (item.id) ALL_GENRE_LABELS[item.id] = item.label;
  }
}

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
  const [musicTab, setMusicTab] = useState<MusicTab>('genres');

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

  const handleSoloMode = (solo: boolean) => {
    if (!isHost) return;
    onUpdateSettings({ isSoloMode: solo });
  };

  const handleTimelineCards = (value: number) => {
    if (!isHost) return;
    onUpdateSettings({ timelineCardsToWin: value });
  };

  const handleEliminationLives = (value: number) => {
    if (!isHost) return;
    onUpdateSettings({ eliminationLives: value });
  };

  const gameMode = settings.gameMode || 'blind-test';
  const isTimeline = gameMode === 'timeline';
  const isElimination = gameMode === 'elimination';

  // Read-only display for non-host
  if (!isHost) {
    return (
      <div className="space-y-4">
        {/* Game Mode Badge */}
        {(() => {
          const modeInfo = GAME_MODES_INFO.find(m => m.id === gameMode);
          return modeInfo ? (
            <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r ${modeInfo.gradient} text-white shadow-lg`}>
              <span>{modeInfo.icon}</span>
              <span>{modeInfo.title}</span>
            </div>
          ) : null;
        })()}

        {/* Core Settings */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">🎮 Mode</span>
          <span className="text-primary font-bold">{settings.isSoloMode ? 'Solo' : 'Multiplayer'}</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">📊 Difficulté</span>
          <span className={`font-bold capitalize ${difficulty === 'easy' ? 'text-green-400' : difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'
            }`}>{difficulty}</span>
        </div>
        {gameMode === 'elimination' && (
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-white/60 text-sm">💀 Vies</span>
            <span className="text-red-400 font-bold">
              {(settings.eliminationLives ?? 3) === 1 ? 'Mort subite' : `${settings.eliminationLives ?? 3} vies`}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">🎵 Genre</span>
          <span className="text-primary font-bold">{settings.genre ? (ALL_GENRE_LABELS[settings.genre] || settings.genre) : 'Random'}</span>
        </div>
        {isTimeline ? (
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-white/60 text-sm">🃏 Cartes à gagner</span>
            <span className="text-amber-500 font-black text-lg">{settings.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN}</span>
          </div>
        ) : (
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-white/60 text-sm">🔄 Rounds</span>
            <span className="text-primary font-black text-lg">{settings.totalRounds}</span>
          </div>
        )}
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <span className="text-white/60 text-sm">⏱️ Durée</span>
          <span className="text-primary font-black text-lg">{settings.roundDurationMs / 1000}s</span>
        </div>
        {!isTimeline && (
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-white/60 text-sm">✍️ Réponses</span>
            <span className="text-primary font-bold">
              {answerMode === 'both' ? 'Artiste + Titre' : answerMode === 'artist' ? 'Artiste seul' : 'Titre seul'}
            </span>
          </div>
        )}

        {/* Options Toggles (read-only) */}
        <div>
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
            Options
          </label>
          <div className="space-y-1.5">
            {[
              { label: '⚡ Power-ups', active: !!settings.enablePowerUps },
              { label: '👥 Équipes', active: !!settings.enableTeams },
              { label: '🔊 Son progressif', active: !!settings.progressiveAudio },
            ].map(({ label, active }) => (
              <div key={label} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
                <span className="text-white text-xs font-bold">{label}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${active
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-white/30 border border-white/5'
                  }`}>
                  {active ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Interactive settings for host
  return (
    <div className="space-y-5">
      {/* Game Mode Badge (read-only, chosen on homepage) */}
      {(() => {
        const modeInfo = GAME_MODES_INFO.find(m => m.id === gameMode);
        return modeInfo ? (
          <div>
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
              Mode
            </label>
            <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r ${modeInfo.gradient} text-white shadow-lg`}>
              <span>{modeInfo.icon}</span>
              <span>{modeInfo.title}</span>
            </div>
          </div>
        ) : null;
      })()}

      {/* Player Mode */}
      <div>
        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
          Player Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSoloMode(false)}
            className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${!settings.isSoloMode
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
          >
            Multiplayer
          </button>
          <button
            onClick={() => handleSoloMode(true)}
            className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${settings.isSoloMode
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
          >
            Solo
          </button>
        </div>
      </div>

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
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${difficulty === level
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

      {/* Elimination Lives (only for elimination mode) */}
      {isElimination && (
        <div>
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
            Vies
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleEliminationLives(1)}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${(settings.eliminationLives ?? 3) === 1
                  ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
            >
              💀 Mort subite
            </button>
            <button
              onClick={() => handleEliminationLives(3)}
              className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${(settings.eliminationLives ?? 3) === 3
                  ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
            >
              ❤️❤️❤️ 3 vies
            </button>
          </div>
        </div>
      )}

      {/* Genre Selector (Tabbed) */}
      <div>
        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
          Music
        </label>
        {/* Tabs */}
        <div className="flex gap-1 mb-2">
          {([
            { tab: 'genres' as const, label: 'Genres' },
            { tab: 'decades' as const, label: 'Decades' },
            { tab: 'themes' as const, label: 'Themes' },
          ]).map(({ tab, label }) => (
            <button
              key={tab}
              onClick={() => setMusicTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${musicTab === tab
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          {MUSIC_CATEGORIES[musicTab].map((g) => (
            <button
              key={g.id ?? 'random'}
              onClick={() => handleGenre(g.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${settings.genre === g.id
                  ? 'bg-primary text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Round Count / Cards to Win */}
      {isTimeline ? (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
              Cards to Win
            </label>
            <span className="text-amber-500 font-black text-lg">{settings.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN}</span>
          </div>
          <input
            type="range"
            min={3}
            max={20}
            value={settings.timelineCardsToWin || GAME_CONSTANTS.TIMELINE_CARDS_TO_WIN}
            onChange={(e) => handleTimelineCards(Number(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            aria-label="Cards to win"
          />
          <div className="flex justify-between text-[10px] text-white/20 font-bold mt-1">
            <span>3</span>
            <span>20</span>
          </div>
        </div>
      ) : (
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
      )}

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

      {/* Power-ups Toggle */}
      <div>
        <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 block">
          Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-white text-xs font-bold">Power-ups</span>
            <input
              type="checkbox"
              checked={!!settings.enablePowerUps}
              onChange={(e) => isHost && onUpdateSettings({ enablePowerUps: e.target.checked })}
              disabled={!isHost}
              className="accent-primary w-4 h-4"
            />
          </label>
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-white text-xs font-bold">Équipes</span>
            <input
              type="checkbox"
              checked={!!settings.enableTeams}
              onChange={(e) => isHost && onUpdateSettings({ enableTeams: e.target.checked })}
              disabled={!isHost}
              className="accent-primary w-4 h-4"
            />
          </label>
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-white text-xs font-bold">Son progressif</span>
            <input
              type="checkbox"
              checked={!!settings.progressiveAudio}
              onChange={(e) => isHost && onUpdateSettings({ progressiveAudio: e.target.checked })}
              disabled={!isHost}
              className="accent-primary w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Answer Mode (hidden for Timeline) */}
      {!isTimeline && (
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
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${answerMode === mode
                    ? 'bg-primary text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
