import { MetadataRoute } from 'next';
import { AllLevels } from '@/content';

const BASE_URL = 'https://16bitmahjong.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/learn`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/play`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ];

  // Generate lesson pages from content
  const lessonPages: MetadataRoute.Sitemap = AllLevels.flatMap(level =>
    [
      { url: `${BASE_URL}/learn/${level.id}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
      ...level.lessons.map(lesson => ({
        url: `${BASE_URL}/learn/${level.id}/${lesson.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ]
  );

  return [...staticPages, ...lessonPages];
}
