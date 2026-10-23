#!/usr/bin/env node
/**
 * 광고 영역 금칙어 검사 — `next build` 뒤에 실행한다. 금칙어가 나오면 실패(종료 코드 1)해서 배포를 막는다.
 *
 * - 대상: 광고 영역 페이지(홈·서비스·여정·왜 이 가격인가·진행 방식·법인 소개)의 화면 텍스트.
 *   FAQ·운영 고지·약관·개인정보처리방침은 비광고 영역이라 제외(AI 활용 사실 고지가 있어야 하는 곳).
 * - 금칙어: src/lib/copy.ts 의 BANNED_AD_WORDS. B 트랙(기본)이면 "AI" 도 금지(변협 광고규칙 §5).
 * - ALLOWED: 금칙어를 포함하지만 의미가 다른 표현(예: 고객이 "직접 작성해 보신" 초안).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const appDir = join(root, '.next/server/app');
if (!existsSync(appDir)) {
  console.error('먼저 `npm run build` 를 실행하세요.');
  process.exit(2);
}

const copySrc = readFileSync(join(root, 'src/lib/copy.ts'), 'utf8');
const list = copySrc.match(/BANNED_AD_WORDS = \[([\s\S]*?)\]/)[1];
const banned = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const track = process.env.NEXT_PUBLIC_COPY_TRACK === 'A' ? 'A' : 'B';

const ALLOWED = ['직접 작성해 보신', '직접 작성하신', '전문 보기', '담당변호사 직접 수행'];

const pages = ['index', 'why', 'process', 'about', 'services', 'journeys'];
for (const dir of ['services', 'journeys']) {
  for (const f of readdirSync(join(appDir, dir))) if (f.endsWith('.html')) pages.push(`${dir}/${f.slice(0, -5)}`);
}

const visibleText = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

let failed = 0;
for (const page of pages) {
  const file = join(appDir, `${page}.html`);
  if (!existsSync(file)) continue;
  let text = visibleText(readFileSync(file, 'utf8'));
  for (const ok of ALLOWED) text = text.split(ok).join(' ');
  const hits = banned.filter((w) => text.includes(w));
  if (track === 'B' && /(^|[^A-Za-z])AI([^A-Za-z]|$)/.test(text)) hits.push('AI (B 트랙 광고 영역)');
  for (const w of hits) {
    const i = text.indexOf(w.split(' ')[0]);
    console.error(`✗ /${page === 'index' ? '' : page}: "${w}" — …${text.slice(Math.max(0, i - 30), i + 40)}…`);
    failed++;
  }
}
if (failed) {
  console.error(`\n광고 금칙어 ${failed}건. 문구를 고치거나, 의미가 다른 표현이면 scripts/check-copy.mjs 의 ALLOWED 에 추가하세요.`);
  process.exit(1);
}
console.log(`✓ 광고 영역 ${pages.length}개 페이지 금칙어 없음 (트랙 ${track})`);
