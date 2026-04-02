import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/learn', '/play', '/leaderboard'],
        disallow: [
          '/login',
          '/signup',
          '/auth/',
          '/profile',
          '/settings',
          '/multiplayer/',
          '/play/game/',
          '/progress',
          '/reference',
        ],
      },
    ],
    sitemap: 'https://16bitmahjong.co/sitemap.xml',
  };
}
