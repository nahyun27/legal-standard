import type { MetadataRoute } from 'next';
import { JOURNEYS } from '@/data/journeys';
import { SERVICES } from '@/data/services';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '', '/services', '/journeys', '/why', '/process', '/about', '/faq', '/notice', '/terms', '/privacy',
    ...SERVICES.map((s) => `/services/${s.slug}`),
    ...JOURNEYS.map((j) => `/journeys/${j.slug}`),
  ];
  return paths.map((p) => ({ url: `${SITE_URL}${p}` }));
}
