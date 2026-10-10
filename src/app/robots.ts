import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cicekanatechmedia.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/magaza/restricted'],
      },
      {
        userAgent: ['Googlebot', 'AdsBot-Google'],
        allow: ['/', '/magaza'],
        disallow: ['/api/', '/_next/', '/admin/', '/magaza/restricted'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}