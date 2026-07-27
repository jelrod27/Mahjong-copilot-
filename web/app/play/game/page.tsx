import { pageMetadata } from '@/lib/siteMetadata';
import GameShell from './GameShell';

/**
 * noindex: this is the live game surface, not a page with readable content,
 * and it is reached with query params (?difficulty=, ?table=, ?minFaan=) that
 * would otherwise present Google with many near-duplicate URLs of one screen.
 */
export const metadata = pageMetadata({
  title: 'Playing',
  description: 'A game of Hong Kong Mahjong in progress.',
  path: '/play/game',
  noindex: true,
});

export default function Page() {
  return <GameShell />;
}
