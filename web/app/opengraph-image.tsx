import { ImageResponse } from 'next/og';
import { AllLevels } from '@/content';

/**
 * Social card, generated at build time rather than checked in as a binary.
 *
 * Colours are the literal token values from globals.css (background,
 * highlight, info, muted-foreground). They cannot be read from CSS here —
 * Satori resolves no custom properties — so they are duplicated with the
 * source named, and the values are stable enough that this is a better trade
 * than shipping a PNG nobody can edit.
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
          background: 'rgb(13, 15, 20)',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 44, letterSpacing: 10, color: 'rgb(212, 175, 55)' }}>
          16 BIT
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 104,
            letterSpacing: 6,
            color: 'rgb(240, 232, 210)',
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
            color: 'rgb(126, 168, 178)',
          }}
        >
          Learn and play Hong Kong Mahjong
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 46,
            fontSize: 22,
            color: 'rgb(150, 150, 150)',
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
