import { COPY } from '@/lib/copy';

/** "책임의 크기는 그대로" 약속 3가지 — 홈·소개 페이지에서 함께 쓴다(광고 영역: 트랙 문구를 따름). */
export const PROMISES = [
  { title: COPY.qualityTitle, body: COPY.qualityBody },
  { title: '인용 검증 시스템', body: '서면에 인용되는 법령·판례는 실존 여부를 확인한 뒤 변호사가 재검토합니다. 오류가 발견되면 보완해 드립니다.' },
  { title: '비밀 유지', body: '사건 자료는 암호화하여 보관하며, 고객의 사건 정보를 외부 시스템의 학습에 사용하지 않습니다. 변호사법상 비밀유지의무가 전 과정에 적용됩니다.' },
];
