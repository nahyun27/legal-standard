import Link from 'next/link';
import { AUTOMATION_NOTICE } from '@/data/faq';
import { COPY_TRACK } from '@/lib/copy';
import { FIRM, TAGLINE } from '@/lib/site';

const SERVICE_LINKS = [
  { href: '/services', label: '서비스·가격' },
  { href: '/journeys', label: '단계별 총비용' },
  { href: '/process', label: '이용 방법' },
  { href: '/faq', label: '자주 묻는 질문' },
];

const INFO_LINKS = [
  { href: '/about', label: '리걸스탠다드 소개' },
  { href: '/notice', label: '서비스 운영 고지' },
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침', strong: true },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="logo"><span className="dot" aria-hidden="true" />{FIRM.brand}</Link>
            <p className="footer-tagline">{TAGLINE}</p>
            <p>{FIRM.name}가 직접 운영하는 정찰제 법률서비스입니다. 상담·수임·서면·소송대리는 모두 법인 소속 변호사가 수행합니다.</p>
          </div>
          <nav aria-label="서비스">
            <h4>서비스</h4>
            <ul>{SERVICE_LINKS.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </nav>
          <nav aria-label="법인 정보">
            <h4>법인 정보</h4>
            <ul>{INFO_LINKS.map((l) => <li key={l.href}><Link href={l.href}>{l.strong ? <b>{l.label}</b> : l.label}</Link></li>)}</ul>
          </nav>
          {/* 광고책임변호사는 광고마다 표시해야 한다(변협 광고규정 2025.2 개정) — 푸터는 전 페이지 공통이라 여기에 둔다 */}
          <div>
            <h4>법적 고지</h4>
            <p>
              {FIRM.adResponsibleLawyer}<br />
              {COPY_TRACK === 'A' && <>AI 결과물 검토변호사: {FIRM.aiReviewLawyer} · 대한변협 등록 AI 시스템 ({FIRM.aiSystemRegNo})<br /></>}
              표시 가격은 부가세 별도이며, 인지대·송달료 등 실비는 결제 전 총액 화면에서 항목별로 안내합니다.
            </p>
          </div>
        </div>
        <div className="footer-legal">
          <p>
            운영 {FIRM.name} · {FIRM.representative} · {FIRM.address}<br />
            사업자등록번호 {FIRM.bizNo} · 통신판매업 신고 {FIRM.mailOrderNo} · 대표전화 {FIRM.tel} · {FIRM.email}
          </p>
          <p>{AUTOMATION_NOTICE} 사건의 결과는 사실관계와 증거에 따라 달라질 수 있습니다.</p>
          <p>© 2026 {FIRM.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
