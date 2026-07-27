import { pageMetadata } from '@/lib/siteMetadata';
import CosmeticsClient from './CosmeticsClient';

export const metadata = pageMetadata({
  title: 'Table Styles and Tile Sets',
  description: 'Choose a tile palette, table felt, and opponent roster for your Hong Kong Mahjong table. All free and stored locally on your device.',
  path: '/cosmetics',
});

export default function Page() {
  return <CosmeticsClient />;
}
