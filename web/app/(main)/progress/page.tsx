import { pageMetadata } from '@/lib/siteMetadata';
import ProgressClient from './ProgressClient';

export const metadata = pageMetadata({
  title: 'Your Progress and Stats',
  description: 'Track your Hong Kong Mahjong lessons completed, quiz mastery, hands played, and win rate.',
  path: '/progress',
});

export default function Page() {
  return <ProgressClient />;
}
