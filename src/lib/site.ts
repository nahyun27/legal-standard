/**
 * 운영 주체 정보. 변협 광고규정상 모든 광고물에 법무법인 명칭 병기·광고책임변호사 표시가 필요하므로
 * (사업기획서 X-3, XI) 헤더·푸터·상품 페이지가 전부 여기 값을 쓴다.
 * TODO: 사업자등록번호·통신판매업 신고번호·책임변호사 성명은 의뢰인 확인 후 채운다.
 */
export const FIRM = {
  brand: '리걸스탠다드',
  brandEn: 'LEGAL STANDARD',
  name: '법무법인(유한) 에스제이파트너스',
  representative: '대표변호사 (확인 필요)',
  adResponsibleLawyer: '광고책임변호사 (확인 필요)',
  // 방안 A(인증 후)에서만 노출 — 변협 광고규정 §6 검토변호사 성명 표시
  aiReviewLawyer: '○○○ 변호사',
  aiSystemRegNo: '등록번호 기재란',
  address: '서울특별시 (주사무소 주소 확인 필요)',
  bizNo: '000-00-00000',
  mailOrderNo: '제0000-서울○○-0000호',
  tel: '02-0000-0000',
  email: 'help@legalstandard.example',
  hours: '평일 09:00–18:00 (온라인 접수는 상시)',
} as const;

export const TAGLINE = '가장 싼 곳이 아니라, 기준이 되는 곳.';
