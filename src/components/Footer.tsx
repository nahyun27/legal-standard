import Link from 'next/link';
import { AUTOMATION_NOTICE } from '@/data/faq';
import { COPY_TRACK } from '@/lib/copy';
import { FIRM } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-links">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy"><b>개인정보처리방침</b></Link>
          <Link href="/notice">서비스 운영 고지</Link>
          <Link href="/about">법인 소개</Link>
          <Link href="/faq">자주 묻는 질문</Link>
        </div>
        <div className="footer-cols">
          <div>
            <h4>{FIRM.brand}</h4>
            <p>
              운영: {FIRM.name} · {FIRM.representative}<br />
              주소: {FIRM.address}<br />
              대표전화: {FIRM.tel} · 이메일: {FIRM.email}<br />
              사업자등록번호 {FIRM.bizNo} · 통신판매업 신고 {FIRM.mailOrderNo}
            </p>
          </div>
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
          <p>{AUTOMATION_NOTICE} (상세: <Link href="/notice">서비스 운영 고지</Link>)</p>
          <p>사건의 결과는 사실관계와 증거에 따라 달라질 수 있습니다.</p>
          <p>© 2026 {FIRM.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
