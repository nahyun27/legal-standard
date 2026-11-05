import type { Journey } from './types';

/**
 * 여정 상품 — 서면 한 장이 아니라 분쟁의 끝까지의 가격을 처음부터 공개한다.
 * 각 단계의 다음 단계 가격과 넘어가는 조건이 결제 전에 보인다. 단계별 가격은 고른 방식(직접 제출/변호사 명의)을 따른다.
 */
export const JOURNEYS: Journey[] = [
  {
    slug: 'money',
    name: '떼인 돈 받기',
    summary: '빌려준 돈, 물건값, 공사·용역 대금을 받지 못했을 때 내용증명부터 강제집행까지 이어지는 단계입니다.',
    who: '받을 돈이 있는데 상대가 주지 않고 연락도 피하는 경우',
    steps: [
      { serviceSlug: 'certified-letter' },
      { serviceSlug: 'payment-order', trigger: '기한 내 지급하지 않으면' },
      { serviceSlug: 'small-claims', trigger: '채무자가 이의신청하면' },
      { serviceSlug: 'seizure', trigger: '확정 후에도 지급하지 않으면' },
    ],
    baseCaseSteps: 2,
    baseCaseLabel: '이의 없이 확정 시',
    stage: 'pilot',
  },
  {
    slug: 'criminal',
    name: '형사 고소',
    summary: '사기, 명예훼손, 모욕 같은 피해를 고소할 때 고소장부터 불송치 이의신청, 재판 중 배상명령까지 이어지는 단계입니다.',
    who: '피해를 입었고 수사기관에 고소하려는 경우',
    steps: [
      { serviceSlug: 'complaint' },
      { serviceSlug: 'objection', trigger: '불송치 결정이 나오면' },
      { serviceSlug: 'restitution', trigger: '기소되어 형사재판이 열리면' },
    ],
    baseCaseSteps: 1,
    baseCaseLabel: '고소장 단계',
    stage: 'pilot',
  },
  {
    slug: 'lease',
    name: '보증금 돌려받기',
    summary: '전세·월세 계약이 끝났는데 보증금을 돌려받지 못했을 때 내용증명부터 임차권등기, 지급명령, 강제집행까지 이어지는 단계입니다.',
    who: '계약이 끝났는데 집주인이 보증금을 돌려주지 않는 경우',
    steps: [
      { serviceSlug: 'certified-letter' },
      { serviceSlug: 'lease-registration', trigger: '돌려받기 전에 이사해야 하면' },
      { serviceSlug: 'payment-order', trigger: '기한 내 반환하지 않으면' },
      { serviceSlug: 'seizure', trigger: '확정 후에도 반환하지 않으면' },
    ],
    baseCaseSteps: 1,
    baseCaseLabel: '내용증명으로 해결될 때',
    stage: 'launch',
  },
];

export function getJourney(slug: string) {
  return JOURNEYS.find((j) => j.slug === slug);
}
