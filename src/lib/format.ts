import type { Price } from '@/data/types';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 가격 한 줄 표기. VAT 별도 여부는 호출하는 쪽에서 따로 표시한다(총액 화면에서 항목별로 보여주므로). */
export function priceLabel(p: Price): string {
  switch (p.kind) {
    case 'fixed':
      return won(p.amount);
    case 'from':
      return `${won(p.amount)}~`;
    case 'range':
      return `${won(p.min)}~${won(p.max)}`;
    case 'quote':
      return '개별 견적';
    case 'tbd':
      return '가격 확정 예정';
  }
}

/** 여정 총비용 계산에 쓰는 상한값. 범위형은 최댓값, 견적·미정은 계산에서 뺀다(null). */
export function priceUpper(p: Price): number | null {
  switch (p.kind) {
    case 'fixed':
    case 'from':
      return p.amount;
    case 'range':
      return p.max;
    default:
      return null;
  }
}

/** 여정 총비용의 하한값. 범위형은 최솟값, 견적·미정은 null. */
export function priceLower(p: Price): number | null {
  switch (p.kind) {
    case 'fixed':
    case 'from':
      return p.amount;
    case 'range':
      return p.min;
    default:
      return null;
  }
}
