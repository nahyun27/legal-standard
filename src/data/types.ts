export type Price =
  | { kind: 'fixed'; amount: number }
  | { kind: 'from'; amount: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'quote' }
  | { kind: 'tbd' };

/** 사업기획서 VII장 4티어. T0(접수 문진)은 광고하지 않는 내부 도구라 상품으로 두지 않는다. */
export type Tier = 'T1' | 'T1R' | 'T2' | 'T3';

export type Category = 'money' | 'criminal' | 'lease' | 'review' | 'litigation';

/** 오픈 단계(사업기획서 XIV 로드맵). pilot = 2026.11 베타 3종+초안검토, launch = 2027.2 정식 론칭. */
export type Stage = 'pilot' | 'launch' | 'later';

export interface Service {
  slug: string;
  tier: Tier;
  category: Category;
  name: string;
  /** 같은 상품의 변형(고소장 기본형/표준형 등) 구분 */
  variant?: string;
  summary: string;
  price: Price;
  /** 진열 카드 우상단의 크라프트 미니태그(프로토타입 .mini-tag) */
  tag?: string;
  /** 진열 카드의 ✓ 핵심 항목 3개. 없으면 includes 앞 3개 */
  highlights?: string[];
  /** 표준 업무범위(SOW). 결제 전에 고객에게 그대로 보여준다. */
  includes: string[];
  excludes: string[];
  /** 고객이 직접 부담하는 실비 항목(금액은 문진 후 총액 화면에서 계산) */
  costs?: string[];
  turnaround: string;
  /** 문진에서 청구 금액(소가)을 반드시 받는 상품 — 실비 계산에 필요(백엔드 catalog.needs_claim_amount 와 같게) */
  claimRequired?: boolean;
  /** 이 상품 다음에 이어질 수 있는 상품 slug — 여정 사전 확정의 근거 */
  next?: { slug: string; when: string }[];
  stage: Stage;
}

export interface JourneyStep {
  serviceSlug: string;
  /** 이 단계로 넘어가는 조건 (예: "상대방이 이의신청하면") */
  trigger?: string;
}

export interface Journey {
  slug: string;
  name: string;
  summary: string;
  who: string;
  steps: JourneyStep[];
  /** 다툼 없이 끝나는 기본 경로의 단계 수(앞에서부터). 프로토타입의 "이의 없이 확정 시 총 서비스 요금" */
  baseCaseSteps: number;
  baseCaseLabel: string;
  successFee?: string;
  stage: Stage;
}
