import { pageMetadata } from '@/lib/siteMetadata';
import ParlourClient from './ParlourClient';

export const metadata = pageMetadata({
  title: 'The Jade Parlour — Story Mode',
  description: 'Climb nine floors of the Jade Parlour, beating a different opponent on each to light the house back up. Hong Kong Mahjong story mode.',
  path: '/parlour',
});

export default function Page() {
  return <ParlourClient />;
}
