import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl && process.env.NODE_ENV === 'production') console.warn('[i18n] NEXT_PUBLIC_SITE_URL is not set; robots sitemap URL uses localhost.');
  const resolvedBaseUrl = baseUrl || 'http://localhost:3000';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/admin/'],
    },
    sitemap: `${resolvedBaseUrl}/sitemap.xml`,
  };
}
