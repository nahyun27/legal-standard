import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/intake/', '/my', '/login', '/signup', '/auth/', '/payments/', '/admin'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
