import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cicekanatechmedia.com').replace(/\/$/, '');

  const standardDisallow = [
    '/api/',
    '/_next/',
    '/admin/',
    '/profile/',
    '/magaza/restricted',
    '/auth/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/services', '/services/ai-automation', '/magaza', '/blog'],
        disallow: standardDisallow,
      },
      {
        userAgent: ['Googlebot', 'AdsBot-Google', 'bingbot'],
        allow: ['/', '/services', '/services/ai-automation', '/magaza', '/blog'],
        disallow: standardDisallow,
      },
      // AI & Generative Search Crawlers (ChatGPT, Perplexity, Claude, Apple Intelligence)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'OAI-SearchBot',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Applebot',
          'Applebot-Extended',
          'meta-externalagent',
          'cohere-ai',
        ],
        allow: ['/', '/services', '/services/ai-automation', '/blog'],
        disallow: standardDisallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}