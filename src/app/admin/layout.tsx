import AdminShell from '@/components/admin/AdminShell';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: { default: '관리자', template: '%s | 리걸스탠다드 관리자' }, robots: NOINDEX };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
