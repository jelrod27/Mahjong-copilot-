'use client';

import { Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLargerUiText } from '@/store/actions/settingsActions';

export default function SettingsPageClient() {
  const dispatch = useAppDispatch();
  const largerUiText = useAppSelector((s) => s.settings.largerUiText);

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-slide-up px-1">
      <div className="flex items-center gap-3">
        <Settings size={40} className="text-retro-cyan shrink-0" aria-hidden />
        <div>
          <h1 className="font-pixel text-sm text-retro-cyan retro-glow">Settings</h1>
          <p className="text-retro-textDim font-retro text-sm mt-1">
            Tune how the app feels on your device.
          </p>
        </div>
      </div>

      <section
        className="retro-panel p-4 space-y-3"
        aria-labelledby="settings-access-heading"
      >
        <h2 id="settings-access-heading" className="font-pixel text-[10px] text-retro-gold uppercase tracking-widest">
          Accessibility
        </h2>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={largerUiText}
            onChange={(e) => void dispatch(setLargerUiText(e.target.checked))}
            className="mt-1 size-4 rounded border-retro-border accent-retro-cyan"
          />
          <span>
            <span className="font-retro text-retro-text block group-hover:text-retro-cyan transition-colors">
              Comfortable text size
            </span>
            <span className="text-retro-textDim text-sm font-sans leading-snug">
              Slightly larger labels in the bottom navigation and compact headers.
            </span>
          </span>
        </label>
      </section>

      <p className="text-retro-textDim/70 font-retro text-xs text-center">
        More preferences (theme, notifications) coming soon.
      </p>
    </div>
  );
}
