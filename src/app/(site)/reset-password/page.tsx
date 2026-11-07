import AuthLayout from '@/components/AuthLayout';
import { ResetPanel } from '@/components/PasswordForms';
import { NOINDEX } from '@/lib/seo';

// 재설정 토큰이 주소에 있다 — 다른 사이트로 Referer 가 새지 않게 한다
export const metadata = { title: '새 비밀번호 정하기', robots: NOINDEX, referrer: 'no-referrer' as const };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const q = await searchParams;
  const token = Array.isArray(q.token) ? q.token[0] : q.token;
  return (
    <AuthLayout>
      <ResetPanel token={token} />
    </AuthLayout>
  );
}
