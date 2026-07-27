import { pageMetadata } from '@/lib/siteMetadata';
import HomeClient from './HomeClient';

export const metadata = pageMetadata({
  title: 'Learn and Play Hong Kong Mahjong',
  description: 'Learn Hong Kong Mahjong from scratch and play a full game solo against AI. Tiles, sets, scoring, and how a hand actually runs — free, no account, works offline.',
  path: '/',
});

export default function Page() {
  return <HomeClient />;
}
