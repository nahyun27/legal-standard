import { PageHead } from '@/components/ui';
import { AUTOMATION_NOTICE } from '@/data/faq';
import { pageMeta } from '@/lib/seo';
import { FIRM } from '@/lib/site';

export const metadata = pageMeta({
  title: '서비스 운영 고지',
  description: '서면 준비 방식, 변호사 검수, 사건 정보 처리에 관한 고지.',
  path: '/notice',
});

/**
 * 비광고 영역의 사실 고지 (사업기획서 VIII 권고 시퀀싱 ①, X-4 데이터·비밀유지, 인공지능 기본법 투명성 의무).
 * 카피 트랙(A/B)과 무관하게 항상 같은 내용을 보여준다. 문구 변경 시 FAQ·약관과 함께 맞추고 광고심사위 질의 결과를 반영할 것.
 */
export default function NoticePage() {
  return (
    <>
      <PageHead title="서비스 운영 고지" />
      <div className="container prose">
        <div className="notice">{AUTOMATION_NOTICE}</div>
        <h2>법률사무의 주체</h2>
        <p>법률상담·수임·서면 확정·명의·소송대리는 모두 {FIRM.name} 소속 변호사가 수행합니다.</p>
        <h2>검수 기준</h2>
        <ul>
          <li>변호사 검수를 거치지 않은 산출물은 고객에게 전달되지 않습니다.</li>
          <li>사건 유형별 검수 체크리스트와 인용 법령·판례 실존 확인을 거칩니다.</li>
          <li>고위험 서면은 변호사 2인이 검수합니다.</li>
          <li>서면 오류가 확인되면 보완해 드립니다.</li>
        </ul>
        <h2>사건 정보의 처리</h2>
        <p>
          사건 정보는 해당 사건 처리에만 사용하며, 외부 학습용으로 제공하거나 재사용하지 않습니다. 민감정보는 별도 동의를 받아 처리합니다.
        </p>
      </div>
    </>
  );
}
