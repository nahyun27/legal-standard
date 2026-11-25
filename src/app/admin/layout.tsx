import AdminShell from '@/components/admin/AdminShell';
import { NOINDEX } from '@/lib/seo';

export const metadata = { title: { default: '관리자', template: '%s | 모두의 변호사 관리자' }, robots: NOINDEX };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
