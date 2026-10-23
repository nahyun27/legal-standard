import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// 히어로 하단 "어떤 상황이세요?" — 상황 말로 고르면 맞는 여정·상품으로 보낸다. 광고 영역이라 결과 약속 표현은 쓰지 않는다.
const SITUATIONS = [
  { label: '빌려준 돈을 못 받았어요', href: '/journeys/money' },
  { label: '사기·명예훼손으로 고소하고 싶어요', href: '/journeys/criminal' },
  { label: '보증금을 돌려받지 못했어요', href: '/journeys/lease' },
  { label: '직접 쓴 서면을 검토받고 싶어요', href: '/services/draft-review' },
];

export default function SituationChips() {
  return (
    <div className="chips">
      <span className="chips-label">어떤 상황이세요?</span>
      {SITUATIONS.map((s) => (
        <Link key={s.href} href={s.href} className="chip">
          {s.label}<ArrowUpRight size={14} />
        </Link>
      ))}
    </div>
  );
}
