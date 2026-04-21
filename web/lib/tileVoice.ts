/**
 * Tile voice callouts — speaks tile names aloud using the browser's
 * SpeechSynthesis API, with a subtitle overlay so learners see the Chinese
 * characters + English translation alongside every spoken tile.
 *
 * Language preference order when `language = 'cantonese'`:
 *   1. Cantonese (yue-*, zh-HK)
 *   2. Mandarin (zh-CN, zh-TW, zh)
 *   3. English fallback (speaks the English name instead)
 *
 * SSR-safe: all window/speechSynthesis access is guarded.
 */

import { Tile, TileSuit, TileType, DragonTile, WindTile } from '@/models/Tile';

export type TileVoiceLanguage = 'cantonese' | 'english';

export interface TileSubtitle {
  id: string;
  /** Chinese characters (rendered large) */
  chinese: string;
  /** Short English translation (rendered underneath) */
  english: string;
  /** Speaker context, e.g. "You discarded" or "West AI discarded" */
  speaker?: string;
  /** Millisecond timestamp — consumers key off this to re-trigger animations */
  at: number;
}

type SubtitleListener = (subtitle: TileSubtitle) => void;

/** Pub/sub so multiple UI components can react to a spoken tile. */
const listeners = new Set<SubtitleListener>();

export function subscribeToSubtitles(listener: SubtitleListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(subtitle: TileSubtitle): void {
  listeners.forEach(l => {
    try {
      l(subtitle);
    } catch {
      // Listener errors shouldn't break the game loop.
    }
  });
}

/** Cached voice selection so we don't scan voices on every call. */
let cachedVoice: SpeechSynthesisVoice | null | undefined;
let cachedLang: TileVoiceLanguage | null = null;

function pickVoice(language: TileVoiceLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  if (cachedVoice !== undefined && cachedLang === language) return cachedVoice ?? null;

  const voices = window.speechSynthesis.getVoices();
  let picked: SpeechSynthesisVoice | null = null;

  if (language === 'cantonese') {
    // Prefer Cantonese, then Mandarin, then any Chinese voice.
    picked =
      voices.find(v => /yue/i.test(v.lang) || /zh[-_]?HK/i.test(v.lang)) ??
      voices.find(v => /zh[-_]?(CN|TW)/i.test(v.lang)) ??
      voices.find(v => /^zh/i.test(v.lang)) ??
      null;
  } else {
    picked = voices.find(v => /^en/i.test(v.lang)) ?? null;
  }

  cachedVoice = picked;
  cachedLang = language;
  return picked;
}

/** Reset the voice cache — call this once voices are ready (voiceschanged event). */
function primeVoiceCache() {
  cachedVoice = undefined;
  cachedLang = null;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.addEventListener?.('voiceschanged', primeVoiceCache);
}

/**
 * Speak a tile and emit a subtitle for the UI. When `language = 'cantonese'`
 * but no Chinese voice is available, the subtitle still shows characters +
 * English, and the voice speaks the English name.
 */
export function speakTile(
  tile: Tile,
  language: TileVoiceLanguage,
  speaker?: string,
): void {
  const voiceInfo = tileVoiceInfo(tile);
  if (!voiceInfo) return;

  const subtitleId = `${tile.id}-${Date.now()}`;
  emit({
    id: subtitleId,
    chinese: voiceInfo.chinese,
    english: voiceInfo.english,
    speaker,
    at: Date.now(),
  });

  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const voice = pickVoice(language);
  // If the user asked for Cantonese but no zh voice is available, speak the
  // English name so learners still hear *something* that matches the subtitle.
  const canSpeakChinese = voice !== null && /^(zh|yue)/i.test(voice.lang);
  const text = language === 'cantonese' && canSpeakChinese ? voiceInfo.chinese : voiceInfo.english;

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = 0.95;
    utterance.volume = 0.9;
    // Clip anything currently speaking so rapid discards don't queue up.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech APIs are best-effort; never crash the game loop.
  }
}

/** Map a tile to the canonical Chinese + English callout text. */
export function tileVoiceInfo(tile: Tile): { chinese: string; english: string } | null {
  if (tile.type === TileType.BONUS) return null;

  if (tile.type === TileType.SUIT && tile.number !== undefined) {
    const numZh = NUMBER_CHINESE[tile.number];
    const suitZh = SUIT_CHINESE[tile.suit];
    const suitEn = SUIT_ENGLISH[tile.suit];
    if (!numZh || !suitZh || !suitEn) return null;
    return {
      chinese: `${numZh}${suitZh}`,
      english: `${NUMBER_ENGLISH[tile.number]} ${suitEn}`,
    };
  }

  if (tile.suit === TileSuit.WIND && tile.wind) {
    return {
      chinese: WIND_CHINESE[tile.wind],
      english: `${capitalize(tile.wind)} Wind`,
    };
  }

  if (tile.suit === TileSuit.DRAGON && tile.dragon) {
    return {
      chinese: DRAGON_CHINESE[tile.dragon],
      english: `${capitalize(tile.dragon)} Dragon`,
    };
  }

  return null;
}

const NUMBER_CHINESE: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};
const NUMBER_ENGLISH: Record<number, string> = {
  1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
  6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
};
const SUIT_CHINESE: Record<string, string> = {
  [TileSuit.BAMBOO]: '索',
  [TileSuit.CHARACTER]: '萬',
  [TileSuit.DOT]: '筒',
};
const SUIT_ENGLISH: Record<string, string> = {
  [TileSuit.BAMBOO]: 'Bamboo',
  [TileSuit.CHARACTER]: 'Character',
  [TileSuit.DOT]: 'Dot',
};
const WIND_CHINESE: Record<string, string> = {
  [WindTile.EAST]: '東',
  [WindTile.SOUTH]: '南',
  [WindTile.WEST]: '西',
  [WindTile.NORTH]: '北',
};
const DRAGON_CHINESE: Record<string, string> = {
  [DragonTile.RED]: '中',
  [DragonTile.GREEN]: '發',
  [DragonTile.WHITE]: '白',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
