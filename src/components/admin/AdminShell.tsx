'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { ClipboardList, ExternalLink, LayoutDashboard, LogOut, ScrollText, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export interface Staff {
  id: number;
  name: string;
  is_admin: boolean;
  is_lawyer: boolean;
}

const StaffContext = createContext<Staff | null>(null);
export const useStaff = () => useContext(StaffContext)!;

const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/cases', label: '사건', icon: ClipboardList },
  { href: '/admin/users', label: '회원', icon: Users, adminOnly: true },
  { href: '/admin/audit', label: '감사 로그', icon: ScrollText, adminOnly: true },
];

/** 관리자 화면 틀. 직원(관리자·변호사)이 아니면 존재를 드러내지 않고 404 화면만 보여준다(서버도 404). */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [staff, setStaff] = useState<Staff | null | 'denied'>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(pathname)}`); return; }
    api<Staff>('/admin/me').then(setStaff).catch(() => setStaff('denied'));
  }, [ready, user, pathname, router]);

  if (staff === 'denied') {
    return (
      <main className="container section" style={{ textAlign: 'center', paddingTop: 120 }}>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="lead" style={{ margin: '14px auto 24px' }}>주소를 다시 확인해 주세요.</p>
        <Link href="/" className="btn btn-primary">홈으로</Link>
      </main>
    );
  }
  if (!staff) return <main className="admin-loading"><div className="spinner" /></main>;

  const roles = [staff.is_admin && '관리자', staff.is_lawyer && '변호사'].filter(Boolean).join(' · ');

  return (
    <StaffContext.Provider value={staff}>
      <div className="admin">
        <aside className="admin-side">
          <Link href="/admin" className="admin-brand"><span className="dot" aria-hidden="true" />리걸스탠다드<small>관리자</small></Link>
          <nav>
            {NAV.filter((n) => !n.adminOnly || staff.is_admin).map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                  <Icon size={17} />{label}
                </Link>
              );
            })}
          </nav>
          <div className="admin-me">
            <b>{staff.name}</b><small>{roles}</small>
            <div className="admin-me-actions">
              <Link href="/" target="_blank"><ExternalLink size={14} /> 사이트</Link>
              <button onClick={async () => { await logout(); router.replace('/'); }}><LogOut size={14} /> 로그아웃</button>
            </div>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </StaffContext.Provider>
  );
}
