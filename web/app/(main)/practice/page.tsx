import { pageMetadata } from '@/lib/siteMetadata';
import PracticeClient from './PracticeClient';

export const metadata = pageMetadata({
  title: 'Practice Drills and Quizzes',
  description: 'Drill Hong Kong Mahjong tile recognition, fan scoring, and winning-hand patterns, or play a guided game with shanten counts and safe-tile hints.',
  path: '/practice',
});

export default function Page() {
  return <PracticeClient />;
}
