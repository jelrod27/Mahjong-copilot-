'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setLargerUiText,
  setSoundEnabled,
  setThemeMode,
  setNotificationsEnabled,
  setShowTutor,
  setDisplayMode,
  setGameSpeed,
  setLiveFaanMeter,
  setCrtEffect,
  setMusicEnabled,
  setMusicVolume,
  setBeginnerAssist,
  setTileVoice,
  SettingsState,
} from '@/store/actions/settingsActions';
import soundManager from '@/lib/soundManager';
import musicEngine from '@/lib/musicEngine';
import {
  saveSettings,
  loadGamePreferences,
  saveGamePreferences,
  clearGameStats,
  GamePreferences,
} from '@/lib/settingsStorage';
import { useBrowserValue } from '@/hooks/useBrowserValue';
import { AppConstants } from '@/constants/appConstants';

const TIMER_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
  { value: 0, label: 'No limit' },
] as const;

const THEME_OPTIONS: { value: SettingsState['themeMode']; label: string }[] = [
  { value: 'retro', label: 'Classic dark' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const DISPLAY_MODE_OPTIONS: { value: SettingsState['displayMode']; label: string; description: string }[] = [
  { value: 'tutor', label: 'Tutor', description: 'Beginner discard tips, claim suggestions, and safe-tile hints.' },
  { value: 'shantenHeat', label: 'Shanten Heat', description: 'Color each tile by how close to winning you are if you discard it. Blue = tenpai, red = far. No text — just the math made visible.' },
  { value: 'off', label: 'Off', description: 'No in-game overlay. Just you and the tiles.' },
];

// Labelled "Tile numbers" rather than "Beginner Assist": that phrase already
// names the tutor's colour strip in GameHUD and on the tile itself, and two
// unrelated features under one name is worse than a longer label.
const TILE_NUMBER_OPTIONS: { value: SettingsState['beginnerAssist']; label: string; description: string }[] = [
  { value: 'auto', label: 'Follow the table', description: 'On at Beginner tables, off elsewhere.' },
  { value: 'on', label: 'Always show', description: 'Print the rank on every suited tile.' },
  { value: 'off', label: 'Never show', description: 'Read the rank from the artwork alone.' },
];

const GAME_SPEED_OPTIONS: { value: SettingsState['gameSpeed']; label: string; description: string }[] = [
  { value: 'relaxed', label: 'Relaxed', description: 'More time to read the table between moves.' },
  { value: 'normal', label: 'Normal', description: 'Balanced pacing.' },
  { value: 'fast', label: 'Fast', description: 'Minimal waiting. Best once you know the flow.' },
];

// Stable identity, and what the server renders before localStorage is readable.
const DEFAULT_GAME_PREFS: GamePreferences = { turnTimer: 20, autoPass: false };

export default function SettingsPageClient() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings);

  // Game-specific prefs (localStorage only). The stored value is read during
  // render so the controls show the real setting on the first client paint;
  // `edited` holds changes made in this session and wins once it exists.
  const storedPrefs = useBrowserValue(loadGamePreferences, DEFAULT_GAME_PREFS);
  const [edited, setEdited] = useState<GamePreferences | null>(null);
  const gamePrefs = edited ?? storedPrefs;
  const setGamePrefs = useCallback(
    (next: GamePreferences | ((prev: GamePreferences) => GamePreferences)) =>
      setEdited((prev) =>
        typeof next === 'function'
          ? next(prev ?? loadGamePreferences())
          : next,
      ),
    [],
  );

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<'clearStats' | 'resetAll' | null>(null);

  // Persist Redux settings to localStorage on every change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Sync sound manager with Redux state
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const updateGamePref = useCallback(
    <K extends keyof GamePreferences>(key: K, value: GamePreferences[K]) => {
      setGamePrefs((prev) => {
        const next = { ...prev, [key]: value };
        saveGamePreferences(next);
        return next;
      });
    },
    [setGamePrefs],
  );

  const handleClearStats = useCallback(() => {
    clearGameStats();
    setConfirmAction(null);
    showToast('Game stats cleared.');
  }, [showToast]);

  const handleResetAll = useCallback(() => {
    void dispatch(setLargerUiText(false));
    void dispatch(setSoundEnabled(true));
    void dispatch(setThemeMode('retro'));
    void dispatch(setNotificationsEnabled(true));
    void dispatch(setShowTutor(true));
    void dispatch(setDisplayMode('tutor'));
    void dispatch(setGameSpeed('normal'));
    void dispatch(setLiveFaanMeter(true));
    void dispatch(setMusicEnabled(true));
    void dispatch(setMusicVolume(AppConstants.DEFAULT_MUSIC_VOLUME));
    void dispatch(setBeginnerAssist('auto'));
    void dispatch(setCrtEffect(false));
    void dispatch(setTileVoice('off'));
    const defaultPrefs: GamePreferences = { ...DEFAULT_GAME_PREFS };
    setGamePrefs(defaultPrefs);
    saveGamePreferences(defaultPrefs);
    setConfirmAction(null);
    showToast('Settings reset to defaults.');
  }, [dispatch, showToast, setGamePrefs]);

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up px-1 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings size={40} className="text-info shrink-0" aria-hidden />
        <div>
          <h1 className="font-display text-sm text-info ds-text-glow">Settings</h1>
          <p className="text-muted-foreground font-sans text-sm mt-1">
            Tune how the app feels on your device.
          </p>
        </div>
      </div>

      {/* ── Accessibility ─────────────────────────────────────────────── */}
      <section className="ds-panel p-4 space-y-3" aria-labelledby="settings-access-heading">
        <h2
          id="settings-access-heading"
          className="font-display text-[10px] text-highlight uppercase tracking-widest"
        >
          Accessibility
        </h2>
        <ToggleRow
          checked={settings.largerUiText}
          onChange={(v) => void dispatch(setLargerUiText(v))}
          label="Comfortable text size"
          description="Slightly larger labels in the bottom navigation and compact headers."
        />
      </section>

      {/* ── Sound & Music ─────────────────────────────────────────────── */}
      <section className="ds-panel p-4 space-y-3" aria-labelledby="settings-sound-heading">
        <h2
          id="settings-sound-heading"
          className="font-display text-[10px] text-highlight uppercase tracking-widest"
        >
          Sound &amp; Music
        </h2>
        <ToggleRow
          checked={settings.soundEnabled}
          onChange={(v) => {
            soundManager.setEnabled(v);
            void dispatch(setSoundEnabled(v));
          }}
          label="Game sounds"
          description="Tile clicks, claims, and win sounds"
        />
      </section>

      {/* ── Display ───────────────────────────────────────────────────── */}
      <section className="ds-panel p-4 space-y-3" aria-labelledby="settings-display-heading">
        <h2
          id="settings-display-heading"
          className="font-display text-[10px] text-highlight uppercase tracking-widest"
        >
          Display
        </h2>
        <div>
          <span className="font-sans text-foreground block mb-2">Theme</span>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => void dispatch(setThemeMode(opt.value))}
                className={`font-sans text-sm px-3 py-1.5 border transition-colors ${
                  settings.themeMode === opt.value
                    ? 'border-info text-info bg-info/10'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground/60 text-xs font-sans mt-2">
            Theme switching coming in a future update.
          </p>
        </div>
      </section>

      {/* ── Cosmetics ─────────────────────────────────────────────────── */}
      <section className="ds-panel p-4 space-y-3" aria-labelledby="settings-cosmetics-heading">
        <h2
          id="settings-cosmetics-heading"
          className="font-display text-[10px] text-highlight uppercase tracking-widest"
        >
          Cosmetics
        </h2>
        <p className="text-muted-foreground text-sm font-sans">
          Tile palette, table felt, and NPC roster — all free, all local.
        </p>
        <Link href="/cosmetics" className="ds-btn font-sans text-sm w-full py-2 inline-block text-center">
          Open cosmetics
        </Link>
      </section>

      {/* ── Game Preferences ──────────────────────────────────────────── */}
      <section className="ds-panel p-4 space-y-4" aria-labelledby="settings-game-heading">
        <h2
          id="settings-game-heading"
          className="font-display text-[10px] text-highlight uppercase tracking-widest"
        >
          Game Preferences
        </h2>

        {/* Turn timer */}
        <div>
          <span className="font-sans text-foreground block mb-2">Turn timer</span>
          <div className="flex gap-2 flex-wrap">
            {TIMER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateGamePref('turnTimer', opt.value)}
                className={`font-sans text-sm px-3 py-1.5 border transition-colors ${
                  gamePrefs.turnTimer === opt.value
                    ? 'border-info text-info bg-info/10'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tile numbers */}
        <div>
          <span className="font-sans text-foreground block mb-1">Tile numbers</span>
          <p className="text-muted-foreground text-xs font-sans mb-2">
            Whether suited tiles print their rank as a digit. The artwork shows the
            rank by counting sticks, circles or characters, which takes practice to
            read at a glance.
          </p>
          <div className="space-y-2">
            {TILE_NUMBER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void dispatch(setBeginnerAssist(opt.value))}
                aria-pressed={settings.beginnerAssist === opt.value}
                className={`w-full text-left font-sans text-sm px-3 py-2 border transition-colors ${
                  settings.beginnerAssist === opt.value
                    ? 'border-info text-info bg-info/10'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                <span className="block font-medium text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game speed */}
        <div>
          <span className="font-sans text-foreground block mb-1">Game speed</span>
          <p className="text-muted-foreground text-xs font-sans mb-2">
            How fast opponents take their turns. Separate from difficulty.
          </p>
          <div className="space-y-2">
            {GAME_SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void dispatch(setGameSpeed(opt.value))}
                aria-pressed={settings.gameSpeed === opt.value}
                className={`w-full text-left font-sans text-sm px-3 py-2 border transition-colors ${
                  settings.gameSpeed === opt.value
                    ? 'border-info text-info bg-info/10'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                <span className="block font-medium text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-pass */}
        <ToggleRow
          checked={gamePrefs.autoPass}
          onChange={(v) => updateGamePref('autoPass', v)}
          label="Auto-pass when no claims"
          description="Automatically pass during claim phase when you have no valid claims"
        />

        {/* In-game overlay mode */}
        <div>
          <span className="font-sans text-foreground block mb-1">In-game overlay</span>
          <p className="text-muted-foreground text-xs font-sans mb-2">
            Choose how the game helps you during your discard turn.
          </p>
          <div className="space-y-2">
            {DISPLAY_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void dispatch(setDisplayMode(opt.value))}
                aria-pressed={settings.displayMode === opt.value}
                className={`w-full text-left font-sans text-sm px-3 py-2 border transition-colors ${
                  settings.displayMode === opt.value
                    ? 'border-info text-info bg-info/10'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                <span className="block font-medium text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tutor sub-toggle — only when tutor overlay is selected */}
        {settings.displayMode === 'tutor' && (
          <ToggleRow
            checked={settings.showTutor}
            onChange={(v) => void dispatch(setShowTutor(v))}
            label="Show tutor hints"
            description="In-game discard tips, claim suggestions, and safe-tile hints across all difficulties."
          />
        )}

        {/* Live faan meter */}
        <ToggleRow
          checked={settings.liveFaanMeter}
          onChange={(v) => void dispatch(setLiveFaanMeter(v))}
          label="Live faan meter"
          description="During play, show what faan your hand is building toward and whether it meets the 3-faan minimum."
        />

        {/* Music */}
        <ToggleRow
          checked={settings.musicEnabled}
          onChange={(v) => void dispatch(setMusicEnabled(v))}
          label="Parlour music"
          description="Rotating chiptune score during play. The tempo picks up as the wall runs down."
        />

        {settings.musicEnabled && (
          <div className="flex flex-col gap-2 py-3">
            <label htmlFor="music-volume" className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-sm text-foreground">Music volume</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {settings.musicVolume}%
              </span>
            </label>
            <input
              id="music-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.musicVolume}
              onChange={(e) => {
                const next = Number(e.target.value);
                // Applied to the engine immediately so the slider is audible
                // while it is being dragged; persistence follows the dispatch.
                musicEngine.setVolume(next / 100);
                void dispatch(setMusicVolume(next));
              }}
              className="w-full accent-accent"
              aria-describedby="music-volume-help"
            />
            <p id="music-volume-help" className="font-sans text-xs text-muted-foreground">
              Independent of sound effects, so the tile clack stays audible with the score turned down.
            </p>
          </div>
        )}

        {/* CRT effect */}
        <ToggleRow
          checked={settings.crtEffect}
          onChange={(v) => void dispatch(setCrtEffect(v))}
          label="CRT scanlines"
          description="Retro display effect over the game table. Pure cosmetics — disable if it strains your eyes."
        />

        {/* Tile voice callouts */}
        <div>
          <span className="font-sans text-foreground block mb-1">Tile voice callouts</span>
          <p className="text-muted-foreground text-xs font-sans mb-2">
            Speak each discarded tile aloud with an on-screen subtitle (中 · Red Dragon). Cantonese
            uses your OS voice if available, otherwise falls back to English.
          </p>
          <div className="flex gap-2 flex-wrap">
            {(['off', 'cantonese', 'english'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => void dispatch(setTileVoice(mode))}
                aria-pressed={settings.tileVoice === mode}
                aria-label={`Tile voice callouts: ${mode}`}
                className={`font-sans text-sm px-3 py-1.5 border transition-colors capitalize ${
                  settings.tileVoice === mode
                    ? 'border-info text-info bg-info/10'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Data ──────────────────────────────────────────────────────── */}
      <section className="ds-panel p-4 space-y-3" aria-labelledby="settings-data-heading">
        <h2
          id="settings-data-heading"
          className="font-display text-[10px] text-highlight uppercase tracking-widest"
        >
          Data
        </h2>

        {confirmAction === 'clearStats' ? (
          <ConfirmRow
            message="Clear all game stats? This cannot be undone."
            onConfirm={handleClearStats}
            onCancel={() => setConfirmAction(null)}
          />
        ) : (
          <button
            onClick={() => setConfirmAction('clearStats')}
            className="ds-btn font-sans text-sm w-full py-2"
          >
            Clear game stats
          </button>
        )}

        {confirmAction === 'resetAll' ? (
          <ConfirmRow
            message="Reset all settings to defaults?"
            onConfirm={handleResetAll}
            onCancel={() => setConfirmAction(null)}
          />
        ) : (
          <button
            onClick={() => setConfirmAction('resetAll')}
            className="ds-btn font-sans text-sm w-full py-2"
          >
            Reset all settings
          </button>
        )}
      </section>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 ds-panel px-4 py-2 border-success text-success font-sans text-sm animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Reusable toggle row ──────────────────────────────────────────────────

function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 rounded border-border accent-info"
      />
      <span>
        <span className="font-sans text-foreground block group-hover:text-info transition-colors">
          {label}
        </span>
        <span className="text-muted-foreground text-sm font-sans leading-snug">{description}</span>
      </span>
    </label>
  );
}

// ── Inline confirmation row ──────────────────────────────────────────────

function ConfirmRow({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border border-border/50 p-3">
      <p className="font-sans text-sm text-foreground">{message}</p>
      <div className="flex gap-2">
        <button onClick={onConfirm} className="ds-btn font-sans text-sm px-4 py-1 border-red-500 text-red-400">
          Confirm
        </button>
        <button onClick={onCancel} className="ds-btn font-sans text-sm px-4 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
