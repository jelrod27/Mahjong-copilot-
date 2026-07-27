import { ImageResponse } from 'next/og';
import { AllLevels } from '@/content';
import { TOKENS } from '@/lib/designTokens';

/**
 * Social card, generated at build time rather than checked in as a binary.
 *
 * Colours come from lib/designTokens.ts, which mirrors the `@theme` block in
 * globals.css. Satori does resolve CSS variables declared inside its own
 * render tree; what it cannot do is read the app's external stylesheet, so the
 * values have to arrive as literals. A test parses globals.css and asserts the
 * mirror matches, so the duplication cannot drift.
 *
 * Deliberately no external fonts: the CSP blocks nothing at build time, but
 * fetching a font here would add a network dependency to every build for a
 * card that reads fine in the system serif.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '16 Bit Mahjong — Learn and Play Hong Kong Mahjong';

export default function OpenGraphImage() {
  // Derived, not typed in: a hardcoded "56 LESSONS" would go stale the next
  // time the curriculum grows, and a social card is the last place anyone
  // thinks to check.
  const levelCount = AllLevels.length;
  const lessonCount = AllLevels.reduce((sum, level) => sum + level.lessons.length, 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: TOKENS.background,
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 44, letterSpacing: 10, color: TOKENS.highlight }}>
          16 BIT
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 104,
            letterSpacing: 6,
            color: TOKENS.foreground,
            marginTop: 8,
          }}
        >
          MAHJONG
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 34,
            fontSize: 30,
            color: TOKENS.info,
          }}
        >
          Learn and play Hong Kong Mahjong
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 46,
            fontSize: 22,
            color: TOKENS.mutedForeground,
            letterSpacing: 2,
          }}
        >
          {levelCount} LEVELS · {lessonCount} LESSONS · FREE · NO ACCOUNT
        </div>
      </div>
    ),
    size,
  );
}
