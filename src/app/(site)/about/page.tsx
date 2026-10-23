import { PageHead } from '@/components/ui';
import { pageMeta } from '@/lib/seo';
import { FIRM } from '@/lib/site';

export const metadata = pageMeta({
  title: '법인 소개',
  description: `${FIRM.brand}는 ${FIRM.name}가 운영하는 정찰제 법률서비스입니다.`,
  path: '/about',
});

// TODO: 검토 변호사 소개(성명·소속) — 방안 A 전환 시 "검토변호사 성명 표시" 요건과도 연결된다.
export default function AboutPage() {
  return (
    <>
      <PageHead
        eyebrow="About"
        title="법무법인이 직접 운영합니다"
        lead={`${FIRM.brand}는 ${FIRM.name}의 브랜드 사업부입니다. 상담·수임·서면·소송대리의 주체는 처음부터 끝까지 법무법인입니다.`}
      />
      <div className="container prose">
        <h2>왜 정찰제인가</h2>
        <p>
          청구 금액보다 수임료가 더 클까 봐 변호사를 찾지 못하는 분쟁이 많습니다. 리걸스탠다드는 정형화된 사건을 표준 업무범위·표준 가격의
          상품으로 만들어, 시작하기 전에 끝까지의 비용을 알 수 있게 합니다.
        </p>
        <h2>취급하지 않는 사건</h2>
        <p>
          표준 업무범위로 처리하기 어려운 사건은 정찰제 상품으로 받지 않고, 처음부터 법무법인 본체의 담당 변호사가 개별 상담합니다.
        </p>
        <h2>검토 변호사</h2>
        <p className="sub">검토 변호사 소개는 준비 중입니다.</p>
      </div>
    </>
  );
}
