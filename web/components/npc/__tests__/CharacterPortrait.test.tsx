import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import CharacterPortrait from '../CharacterPortrait';
import { NpcEmotion, NpcId } from '@/content/npcs';

const ALL_EMOTIONS: NpcEmotion[] = [
  'idle',
  'thinking',
  'smug',
  'surprised',
  'frustrated',
  'triumphant',
];

const ALL_CHARACTERS: NpcId[] = ['mei', 'hana', 'yuki'];

describe('CharacterPortrait', () => {
  it('renders an SVG with an aria-label naming the character and emotion', () => {
    const { getByRole } = render(<CharacterPortrait character="mei" emotion="idle" />);
    const svg = getByRole('img');
    expect(svg.getAttribute('aria-label')).toMatch(/mei.*idle/i);
  });

  it('renders without crashing for every character × emotion combination', () => {
    for (const character of ALL_CHARACTERS) {
      for (const emotion of ALL_EMOTIONS) {
        const { unmount, getByTestId } = render(
          <CharacterPortrait character={character} emotion={emotion} />,
        );
        expect(getByTestId(`portrait-${character}-${emotion}`)).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('omits the aura halo when showAura is false', () => {
    const { container, rerender } = render(
      <CharacterPortrait character="hana" emotion="thinking" showAura={false} />,
    );
    // The aura is the only <circle> with r="105". When showAura=false it must not exist.
    expect(container.querySelector('circle[r="105"]')).toBeNull();

    rerender(<CharacterPortrait character="hana" emotion="thinking" showAura={true} />);
    expect(container.querySelector('circle[r="105"]')).not.toBeNull();
  });
});
