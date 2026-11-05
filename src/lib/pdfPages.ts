/**
 * PDF 장수 세기(계약서 검토의 장수 구간을 고르는 데 쓴다) — 라이브러리 없이 문서 구조만 훑는다.
 * 페이지 트리 루트의 /Count 가 전체 장수다. 압축된 객체 스트림이라 못 찾으면 /Type /Page 개수로 대신한다.
 * 확실하지 않으면 null — 그때는 고객이 고른 구간을 쓰고, 담당 변호사가 수임 검토 때 확인한다.
 */
export async function countPdfPages(file: File): Promise<number | null> {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return null;
  if (file.size > 30 * 1024 * 1024) return null;
  const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)]
    .map((m) => Number(m[1] ?? m[2]))
    .filter((n) => n > 0 && n < 5000);
  if (counts.length) return Math.max(...counts);
  const pages = text.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
  return pages > 0 ? pages : null;
}
