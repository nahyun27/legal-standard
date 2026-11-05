import type { Service, TrackKind } from '@/data/types';
import { lowestAmount, trackOf } from '@/data/services';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/**
 * 상품 가격 한 줄 표기(VAT 별도 표시는 호출하는 쪽에서). 방식을 주면 그 방식 가격,
 * 안 주면 두 방식을 "직접 55,000원 / 변호사 명의 450,000원"처럼 함께 보여 준다.
 */
export function priceText(s: Service, kind?: TrackKind): string {
  if (s.tracks?.length) {
    const one = trackOf(s, kind) ?? (s.tracks.length === 1 ? s.tracks[0] : undefined);
    if (one) return `${won(one.amount)}${one.per ? `/${one.per}` : ''}`;
    return s.tracks.map((t) => `${t.kind === 'self' ? '직접' : '변호사 명의'} ${won(t.amount)}`).join(' / ');
  }
  const low = lowestAmount(s);
  if (low !== null) return `${won(low)}~`;
  return s.price?.kind === 'quote' ? '개별 견적' : '가격 확정 예정';
}
