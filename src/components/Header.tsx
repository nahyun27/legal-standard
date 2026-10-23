'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { FIRM } from '@/lib/site';

const NAV = [
  { href: '/services', label: '서비스·가격' },
  { href: '/journeys', label: '단계별 총비용' },
  { href: '/process', label: '이용 방법' },
  { href: '/about', label: '소개' },
  { href: '/faq', label: 'FAQ' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, ready } = useAuth();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <div className="container header-inner">
        {/* 브랜드명은 항상 법무법인 명칭과 병기한다(주사무소 외 명칭 규제 대응, 사업기획서 XI) */}
        <Link href="/" className="logo" aria-label={`${FIRM.brand} 홈`}>
          <span className="dot" aria-hidden="true" />
          {FIRM.brand} <small>by {FIRM.name}</small>
        </Link>
        <nav className={`nav${open ? ' open' : ''}`}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-cta">
          {/* 로그인 확인 전에는 자리만 잡아 두어 버튼이 바뀌며 깜빡이지 않게 한다 */}
          {!ready ? (
            <span className="btn btn-ghost" aria-hidden="true" style={{ visibility: 'hidden' }}>내 사건</span>
          ) : user ? (
            <Link href="/my" className="btn btn-ghost">내 사건</Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-ghost">로그인</Link>
          )}
          <Link href="/services" className="btn btn-primary">사건 접수하기</Link>
          <button className="menu-toggle" aria-label="메뉴" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
