import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * 홈 히어로 바로 아래 "이런 고민" — 서비스 설명보다 고객의 막막함을 먼저 꺼낸다.
 * 광고 영역: 불안을 키우거나 결과를 약속하는 표현은 쓰지 않는다(README 규범 원칙).
 */
const CONCERNS = [
  { text: '빌려준 돈, 언제까지 기다려야 할지 모르겠어요', go: '내용증명·지급명령', href: '/journeys/money' },
  { text: '고소장을 써야 하는데 어디서부터 시작할지 막막해요', go: '형사 고소장', href: '/services/complaint' },
  { text: '법원 양식은 받았는데 무엇을 적어야 할지 모르겠어요', go: '지급명령 신청', href: '/services/payment-order' },
  { text: '변호사 상담비가 얼마일지 몰라 망설여져요', go: '서비스·가격', href: '#price' },
  { text: '내 주소를 상대방에게 알리고 싶지 않아요', go: '내용증명 발송', href: '/services/certified-letter' },
  { text: '계약서에 불리한 조항이 없는지 걱정돼요', go: '계약서 검토', href: '/services/contract-review' },
];

export default function HomeConcerns() {
  return (
    <ul className="concerns">
      {CONCERNS.map((c) => (
        <li key={c.text}>
          <p>{c.text}</p>
          <Link href={c.href}>{c.go} <ArrowRight size={14} /></Link>
        </li>
      ))}
    </ul>
  );
}
