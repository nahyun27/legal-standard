import type { Journey } from './types';

/**
 * 여정 상품 (사업기획서 IV 차별화 1, VI 1단계 업무분야).
 * 서면 한 장이 아니라 분쟁의 끝까지의 가격을 처음부터 공개한다 — 각 단계의 다음 단계 가격과
 * 넘어가는 조건이 결제 전에 보인다. 성공보수 정률은 의뢰인 확정 전이라 비워 둔다.
 */
export const JOURNEYS: Journey[] = [
  {
    slug: 'money',
    name: '떼인 돈 받기 여정',
    summary: '대여금·물품대금·용역대금 등 금전채권 — 내용증명에서 집행까지.',
    who: '대여금·물품대금·용역대금 등 받을 돈이 있는데 상대가 지급하지 않는 분',
    steps: [
      { serviceSlug: 'certified-letter' },
      { serviceSlug: 'payment-order', trigger: '기한 내 지급하지 않으면' },
      { serviceSlug: 'small-claims', trigger: '채무자가 이의신청하면' },
      { serviceSlug: 'enforcement', trigger: '확정 후에도 지급하지 않으면' },
    ],
    baseCaseSteps: 2,
    baseCaseLabel: '이의 없이 확정 시',
    successFee: '소송 전환 시 성공보수 정률 사전 공개 (확정 필요)',
    stage: 'pilot',
  },
  {
    slug: 'criminal',
    name: '형사 고소 여정',
    summary: '사기·명예훼손·모욕 등 — 고소장에서 불송치 이의신청, 민사 연계까지.',
    who: '피해를 입었고 수사기관에 고소하려는 분',
    steps: [
      { serviceSlug: 'complaint-standard' },
      { serviceSlug: 'objection', trigger: '불송치 결정이 나오면' },
      { serviceSlug: 'civil-complaint', trigger: '관련 민사(손해배상)가 필요하면' },
    ],
    baseCaseSteps: 1,
    baseCaseLabel: '고소장 단계 (표준형 기준)',
    stage: 'pilot',
  },
  {
    slug: 'lease',
    name: '임대차 분쟁 패키지',
    summary: '보증금을 돌려받지 못했을 때 — 내용증명부터 소송·집행까지.',
    who: '계약이 끝났는데 보증금을 돌려받지 못한 임차인',
    steps: [
      { serviceSlug: 'deposit-return' },
      { serviceSlug: 'payment-order', trigger: '기한 내 반환하지 않으면' },
      { serviceSlug: 'small-claims', trigger: '이의신청 또는 다툼이 있으면' },
      { serviceSlug: 'enforcement', trigger: '확정 후에도 반환하지 않으면' },
    ],
    baseCaseSteps: 2,
    baseCaseLabel: '이의 없이 확정 시',
    successFee: '소송 전환 시 성공보수 정률 사전 공개 (확정 필요)',
    stage: 'launch',
  },
];

export function getJourney(slug: string) {
  return JOURNEYS.find((j) => j.slug === slug);
}
