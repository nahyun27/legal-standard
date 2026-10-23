import AuthLayout from '@/components/AuthLayout';
import SignupForm from '@/components/SignupForm';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '회원가입', robots: NOINDEX };

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const next = (await searchParams).next;
  return (
    <AuthLayout step={2}>
      <SignupForm next={Array.isArray(next) ? next[0] : next} />
    </AuthLayout>
  );
}
