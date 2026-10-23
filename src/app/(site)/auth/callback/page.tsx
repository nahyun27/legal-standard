import AuthCallback from '@/components/AuthCallback';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '로그인 중', robots: NOINDEX };

export default async function CallbackPage({ searchParams }: PageProps<'/auth/callback'>) {
  const next = (await searchParams).next;
  return <AuthCallback next={Array.isArray(next) ? next[0] : next} />;
}
