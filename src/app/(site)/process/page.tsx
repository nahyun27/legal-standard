import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProcessTimeline, { type ProcessStep } from '@/components/ProcessTimeline';
import { PageHero, StatChips, TrustSeal } from '@/components/ui';
import { COPY } from '@/lib/copy';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: '이용 방법',
  description: '상품 선택부터 문진, 총액 확인, 변호사 검토·서명, 진행 조회까지.',
  path: '/process',
});

const STEPS: ProcessStep[] = [
  { title: '상품 선택', time: '바로', body: '사건 유형별 정찰가와 표준 업무범위, 다음 단계의 비용을 확인합니다.', client: '상황에 맞는 서비스·여정 고르기', firm: '정찰가·업무범위 공개' },
  { title: '온라인 문진', time: '15분 안팎', body: '안내에 따라 사실관계를 입력하고 증거를 올립니다. 상담 예약 없이 바로 시작할 수 있습니다.', client: '사실관계 입력·자료 올리기', firm: '요건사실 기준 문항 제공' },
  { title: '총액 확인·결제', time: '바로', body: '수임료·부가세·실비(인지대·송달료)를 항목별로 확인한 뒤 결제합니다.', client: '총액 확인·결제', firm: '실비를 항목별로 계산해 안내' },
  { title: '수임 검토', time: '24시간 이내', body: '변호사가 이해충돌과 표준 업무범위 적합 여부를 확인합니다. 맞지 않으면 전액 환불합니다.', client: '알림 확인', firm: '이해충돌 확인·수임 확정' },
  { title: '변호사 검토·서명', time: '표준 납기 2~5영업일', body: COPY.qualityBody, client: '추가 요청이 오면 답변', firm: '체크리스트 검수·서명' },
  { title: '발송·제출과 진행 조회', time: '완료 후', body: '제출·발송 후 결과까지 내 사건 페이지에서 확인하고, 필요하면 다음 단계를 이어서 신청합니다.', client: '서면 받기·다음 단계 결정', firm: '발송·제출 내역 안내' },
];

export default function ProcessPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: '이용 방법' }]}
        eyebrow="Process"
        title="방문 없이, 처음부터 끝까지 온라인으로"
        lead="접수부터 결과 확인까지 여섯 단계입니다. 단계마다 고객이 할 일과 법인이 할 일이 정해져 있습니다."
        aside={<StatChips items={[{ label: '문진', value: '15분 안팎' }, { label: '수임 검토', value: '24시간 이내' }, { label: '표준 납기', value: '2~5영업일' }]} />}
      >
        <div style={{ marginTop: 22 }}><TrustSeal /></div>
      </PageHero>
      <section className="band" style={{ paddingTop: 56 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <ProcessTimeline steps={STEPS} />
          <div className="final" style={{ marginTop: 56 }}>
            <h2>지금 필요한 서비스부터 확인해 보세요</h2>
            <p>정찰가와 다음 단계 비용을 먼저 보고 결정하시면 됩니다.</p>
            <Link href="/services" className="btn btn-primary btn-lg">서비스·가격 보기 <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
