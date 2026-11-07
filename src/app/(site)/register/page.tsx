import AuthLayout from '@/components/AuthLayout';
import { RegisterPanel } from '@/components/PasswordForms';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '이메일로 가입', robots: NOINDEX };

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
  const q = await searchParams;
  const next = Array.isArray(q.next) ? q.next[0] : q.next;
  return (
    <AuthLayout step={1}>
      <RegisterPanel next={next} />
    </AuthLayout>
  );
}
