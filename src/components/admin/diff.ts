/** 줄 단위 비교(LCS). 서면 초안 버전 비교용 — 수천 줄 규모까지만 가정한다. */

export type DiffLine = { type: 'same' | 'add' | 'del'; text: string };

const MAX_CELLS = 4_000_000; // 2000줄 × 2000줄 정도. 넘으면 비교를 생략한다(브라우저가 멈추지 않게)

export function lineDiff(before: string, after: string): DiffLine[] | null {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > MAX_CELLS) return null;
  const n = a.length;
  const m = b.length;
  // dp[i][j] = a[i..], b[j..] 의 LCS 길이
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: 'same', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
    else { out.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] });
  while (j < m) out.push({ type: 'add', text: b[j++] });
  return out;
}
