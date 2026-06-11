'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setLargerUiText,
  setSoundEnabled,
  setThemeMode,
  setNotificationsEnabled,
  setShowTutor,
  setLiveFaanMeter,
  setCrtEffect,
  setTileVoice,
  SettingsState,
} from '@/store/actions/settingsActions';
import soundManager from '@/lib/soundManager';
import {
  saveSettings,
  loadGamePreferences,
  saveGamePreferences,
  clearGameStats,
  GamePreferences,
} from '@/lib/settingsStorage';

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

export default function SettingsPageClient() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings);

  // Game-specific prefs (localStorage only)
  const [gamePrefs, setGamePrefs] = useState<GamePreferences>({
    turnTimer: 20,
    autoPass: false,
  });

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<'clearStats' | 'resetAll' | null>(null);

  // Load game prefs on mount
  useEffect(() => {
    setGamePrefs(loadGamePreferences());
  }, []);

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
    [],
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
    void dispatch(setLiveFaanMeter(true));
    void dispatch(setTileVoice('off'));
    const defaultPrefs: GamePreferences = { turnTimer: 20, autoPass: false };
    setGamePrefs(defaultPrefs);
    saveGamePreferences(defaultPrefs);
    setConfirmAction(null);
    showToast('Settings reset to defaults.');
  }, [dispatch, showToast]);

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

        {/* Auto-pass */}
        <ToggleRow
          checked={gamePrefs.autoPass}
          onChange={(v) => updateGamePref('autoPass', v)}
          label="Auto-pass when no claims"
          description="Automatically pass during claim phase when you have no valid claims"
        />

        {/* Tutor panel */}
        <ToggleRow
          checked={settings.showTutor}
          onChange={(v) => void dispatch(setShowTutor(v))}
          label="Show tutor hints"
          description="In-game discard tips, claim suggestions, and safe-tile hints across all difficulties."
        />

        {/* Live faan meter */}
        <ToggleRow
          checked={settings.liveFaanMeter}
          onChange={(v) => void dispatch(setLiveFaanMeter(v))}
          label="Live faan meter"
          description="During play, show what faan your hand is building toward and whether it meets the 3-faan minimum."
        />

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
