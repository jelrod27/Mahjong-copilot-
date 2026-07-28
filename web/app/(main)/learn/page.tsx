import { pageMetadata } from '@/lib/siteMetadata';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, courseListJsonLd } from '@/lib/structuredData';
import LearnClient from './LearnClient';

export const metadata = pageMetadata({
  title: 'Learn Hong Kong Mahjong',
  description: 'A seven-level course in Hong Kong Mahjong: identify all 144 tiles, build sets and winning hands, count fan, and learn how a hand actually runs from deal to win.',
  path: '/learn',
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          courseListJsonLd(),
          breadcrumbJsonLd([{ name: 'Learn', path: '/learn' }]),
        ]}
      />
      <LearnClient />
    </>
  );
}
