/**
 * 운영 주체 정보. 변협 광고규정상 모든 광고물에 법무법인 명칭 병기·광고책임변호사 표시가 필요하므로
 * (사업기획서 X-3, XI) 헤더·푸터·상품 페이지가 전부 여기 값을 쓴다.
 * 값이 null 인 항목은 화면에 나오지 않는다(통신판매업 신고 전·대표번호 개통 전).
 * TODO: 2026-12-01 주사무소 이전 — 새 주소를 받으면 address 를 바꾼다.
 * TODO: 1577 대표번호를 받으면 tel 에 넣는다.
 */
export const FIRM = {
  brand: '리걸스탠다드',
  brandEn: 'LEGAL STANDARD',
  name: '법무법인(유한) 에스제이파트너스',
  representative: '대표변호사 옥준원',
  adResponsibleLawyer: '광고책임변호사 윤승진',
  // 방안 A(인증 후)에서만 노출 — 변협 광고규정 §6 검토변호사 성명 표시
  aiReviewLawyer: '○○○ 변호사',
  aiSystemRegNo: '등록번호 기재란',
  address: '서울특별시 중구 퇴계로 100, 7층',
  bizNo: '397-86-02911',
  mailOrderNo: null as string | null,
  tel: null as string | null,
  email: 'admin@legalstandard.co.kr',
  hours: '평일 09:00–18:00 (온라인 접수는 상시)',
  // 개인정보 보호책임자(개인정보보호법 제31조)
  privacyOfficer: '개인정보 보호책임자 윤승진 (담당변호사)',
} as const;

export const TAGLINE = '수임료를 먼저 보여드리는 법률서비스';
