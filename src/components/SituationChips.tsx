import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// 히어로 하단 "어떤 도움이 필요하세요?" — 상황 말로 고르면 맞는 여정·상품으로 보낸다. 광고 영역이라 결과 약속 표현은 쓰지 않는다.
const SITUATIONS = [
  { label: '빌려준 돈을 돌려받고 싶어요', href: '/journeys/money' },
  { label: '사기·명예훼손 고소를 준비 중이에요', href: '/journeys/criminal' },
  { label: '보증금을 돌려받고 싶어요', href: '/journeys/lease' },
  { label: '계약서에 문제없는지 확인하고 싶어요', href: '/services/contract-review' },
];

export default function SituationChips() {
  return (
    <div className="chips">
      <span className="chips-label">어떤 도움이 필요하세요?</span>
      {SITUATIONS.map((s) => (
        <Link key={s.href} href={s.href} className="chip">
          {s.label}<ArrowUpRight size={14} />
        </Link>
      ))}
    </div>
  );
}
