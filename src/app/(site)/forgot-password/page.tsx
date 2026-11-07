import AuthLayout from '@/components/AuthLayout';
import { ForgotPanel } from '@/components/PasswordForms';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: '비밀번호 찾기', robots: NOINDEX };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPanel />
    </AuthLayout>
  );
}
