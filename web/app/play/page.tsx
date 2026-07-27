import { pageMetadata } from '@/lib/siteMetadata';
import PlayClient from './PlayClient';

export const metadata = pageMetadata({
  title: 'Play Hong Kong Mahjong Solo',
  description: 'Play a full game of Hong Kong Mahjong against AI opponents at three difficulty levels. Free, no account required, and fully playable offline.',
  path: '/play',
});

export default function Page() {
  return <PlayClient />;
}
