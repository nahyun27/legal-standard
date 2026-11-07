/** 개별 견적·가격 미정 상품의 표기. 정찰가 상품은 tracks·bands·ladder 중 하나로 가격을 둔다. */
export type Price = { kind: 'quote' } | { kind: 'tbd' };

/** 서비스 영역(시안 v5 탭). consult 는 정해진 상품으로 맡기기 어려운 사건의 개별 상담 — 탭에는 넣지 않는다. */
export type Area = 'civil' | 'criminal' | 'advisory' | 'consult';

/**
 * 진행 방식. self = 변호사가 작성·검토한 서면을 의뢰인 본인 명의로 직접 제출·발송,
 * atty = 수임약정 후 변호사 명의로 제출·발송하고 절차에 대응(자문 상품은 변호사가 직접 자문).
 * 백엔드 catalog.py 의 fees 키와 같다.
 */
export type TrackKind = 'self' | 'atty';

export interface Track {
  kind: TrackKind;
  /** 카드에 보이는 방식 이름("서면만 받기" / "변호사에게 맡기기") */
  label: string;
  amount: number;
  /** 방식별 업무 한 줄(예: "신청서 + 전자소송 안내") */
  note?: string;
  /** 전자 수임약정을 맺어야 하는 방식 */
  retainer?: boolean;
  /** 가격 단위가 "건"이 아닐 때(예: "주", "이슈") */
  per?: string;
}

/** 기일 출석처럼 횟수만큼 더해지는 추가 요금 */
export interface Addon {
  label: string;
  per: string;
  options: { label: string; amount: number }[];
}

/** 장수 구간 가격(계약서 검토). key 는 백엔드 catalog 의 선택지 키, max 는 구간의 마지막 장(없으면 그 이상 전부) */
export interface Band { key: string; label: string; amount: number; max?: number }

/** 단계별 가격(피의사건 정찰 변호). key 는 백엔드 catalog 의 선택지 키 */
export interface Rung { key: string; label: string; note?: string; amount: number }

/** 정찰가로 맡는 조건 한 문항 — 문진에서 묻고, 답이 required 와 다르면 개별 상담으로 안내(백엔드 catalog.Screen 과 같게) */
export interface ScreenQuestion { key: string; question: string; required: string; options: string[] }

/** 상품 상세 "준비하면 좋은 자료" 묶음 */
export type PrepKey = 'money' | 'lease' | 'litigation' | 'enforcement' | 'settlement' | 'criminal' | 'defense' | 'contract' | 'advisory';

/** 오픈 단계. pilot = 지금 접수 가능, launch = 정식 오픈 때 접수 시작. */
export type Stage = 'pilot' | 'launch' | 'later';

export interface Service {
  slug: string;
  area: Area;
  name: string;
  /** 이름 옆 작은 설명(예: "고소사실 1개당") */
  unit?: string;
  summary: string;
  /** 두 방식(또는 한 방식) 정찰가 */
  tracks?: Track[];
  bands?: Band[];
  ladder?: Rung[];
  /** tracks·bands·ladder 가 없는 상품의 표기 */
  price?: Price;
  addons?: Addon[];
  /** 정찰가로 맡는 조건(피의사건 등) — 설명 한 줄과 문진 문항 */
  screening?: string;
  screenQuestions?: ScreenQuestion[];
  /** 개수 단위(고소사실 등) — 수임료 = 단가 × 개수(백엔드 catalog.unit_label·max_units 와 같게) */
  unitCount?: { label: string; max: number };
  /** 진열 카드 우상단의 크라프트 미니태그 */
  tag?: string;
  /** 진열 카드 아래 칩(납기·연계 등) */
  chips?: string[];
  /** 상품 고유의 포함 업무. 방식별 차이는 상세 페이지의 방식 비교표가 보여준다 */
  includes?: string[];
  excludes?: string[];
  /** 고객이 부담하는 실비 항목(금액은 문진 후 총액 화면에서 계산) */
  costs?: string[];
  turnaround?: string;
  /** 문진에서 청구 금액(소가)을 반드시 받는 상품(백엔드 catalog.needs_claim_amount 와 같게) */
  claimRequired?: boolean;
  /** 이 상품 다음에 이어질 수 있는 상품 slug — 여정 사전 확정의 근거 */
  next?: { slug: string; when: string }[];
  prep: PrepKey;
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
  /** 다툼 없이 끝나는 기본 경로의 단계 수(앞에서부터) */
  baseCaseSteps: number;
  baseCaseLabel: string;
  stage: Stage;
}
