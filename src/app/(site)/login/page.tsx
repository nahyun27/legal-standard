import AuthLayout from '@/components/AuthLayout';
import LoginPanel from '@/components/LoginPanel';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '로그인', robots: NOINDEX };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <AuthLayout step={1}>
      <LoginPanel next={one(q.next)} error={one(q.error)} provider={one(q.provider)} message={one(q.message)} />
    </AuthLayout>
  );
}
