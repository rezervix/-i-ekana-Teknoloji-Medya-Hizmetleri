import {MetadataRoute} from 'next';
import {locales} from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl && process.env.NODE_ENV === 'production') console.warn('[i18n] NEXT_PUBLIC_SITE_URL is not set; sitemap URLs use localhost.');
  const resolvedBaseUrl = baseUrl || 'http://localhost:3000';
  const paths = ['/homepage', '/magaza', '/projects'];
  return paths.flatMap((pathname) => locales.map((locale) => ({
    url: `${resolvedBaseUrl}${locale === 'tr' ? '' : `/${locale}`}${pathname}`,
    lastModified: new Date(),
    changeFrequency: pathname === '/homepage' ? 'weekly' as const : 'monthly' as const,
    priority: pathname === '/homepage' ? 1.0 : 0.8,
  })));
}
