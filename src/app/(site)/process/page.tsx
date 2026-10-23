import { PageHead } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '진행 방식',
  description: '상품 선택부터 문진, 총액 확인, 변호사 검토·서명, 진행 조회까지.',
  path: '/process',
});

const STEPS = [
  { title: '상품 선택', body: '사건 유형별 정찰가와 표준 업무범위, 다음 단계의 비용을 확인합니다.' },
  { title: '온라인 문진', body: '안내에 따라 사실관계를 입력하고 증거를 올립니다. 상담 예약 없이 바로 시작할 수 있습니다.' },
  { title: '수임 검토', body: '변호사가 이해충돌과 표준 업무범위 적합 여부를 확인합니다. 맞지 않으면 결제 전에 안내합니다.' },
  { title: '총액 확인·결제', body: '수임료·부가세·실비(인지대·송달료)를 항목별로 확인한 뒤 결제합니다.' },
  { title: '변호사 검토·서명', body: COPY.qualityBody },
  { title: '제출·발송과 진행 조회', body: '제출·발송 후 결과까지 내 사건 페이지에서 확인하고, 필요하면 다음 단계를 이어서 신청합니다.' },
];

export default function ProcessPage() {
  return (
    <>
      <PageHead eyebrow="Process" title="진행 방식" lead="방문 없이 온라인으로 접수부터 결과 확인까지 진행합니다." />
      <div className="container grid grid-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card">
            <span className="step-num">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
