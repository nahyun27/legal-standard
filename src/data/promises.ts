import { COPY } from '@/lib/copy';

/** "책임의 크기는 그대로" 약속 3가지 — 홈·소개 페이지에서 함께 쓴다(광고 영역: 트랙 문구를 따름). */
export const PROMISES = [
  { title: COPY.qualityTitle, body: COPY.qualityBody },
  { title: '인용한 법령·판례 확인', body: '서면에 적은 법령과 판례가 실제로 있는지, 취지가 맞는지 변호사가 다시 확인합니다. 잘못된 부분이 나오면 고쳐 드립니다.' },
  { title: '비밀 유지', body: '사건 자료는 암호화해서 보관하고, 사건 처리 외의 목적이나 외부 학습에 쓰지 않습니다. 변호사의 비밀유지의무는 접수부터 종결까지 똑같이 적용됩니다.' },
];
