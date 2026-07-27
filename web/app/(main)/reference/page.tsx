import { pageMetadata } from '@/lib/siteMetadata';
import ReferenceClient from './ReferenceClient';

export const metadata = pageMetadata({
  title: 'Mahjong Reference — Tiles, Scoring, Hands, Glossary',
  description: 'Quick reference for Hong Kong Mahjong: all 144 tiles, the full fan table and payment formula, every limit hand, and a glossary of mahjong terms.',
  path: '/reference',
});

export default function Page() {
  return <ReferenceClient />;
}
