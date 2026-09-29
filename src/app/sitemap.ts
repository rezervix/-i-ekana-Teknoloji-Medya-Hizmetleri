import {MetadataRoute} from 'next';
import {locales} from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const paths = ['/homepage', '/magaza', '/projects'];
  return paths.flatMap((pathname) => locales.map((locale) => ({
    url: `${baseUrl}${locale === 'tr' ? '' : `/${locale}`}${pathname}`,
    lastModified: new Date(),
    changeFrequency: pathname === '/homepage' ? 'weekly' as const : 'monthly' as const,
    priority: pathname === '/homepage' ? 1.0 : 0.8,
  })));
}
