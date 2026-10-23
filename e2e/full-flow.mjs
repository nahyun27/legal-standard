#!/usr/bin/env node
/**
 * 전체 흐름 E2E — 실제 백엔드·DB·프론트를 띄운 상태에서 브라우저(설치된 Chrome)로 돌린다. CI 에는 넣지 않았다.
 *
 *   docker compose up -d
 *   (cd backend && venv/bin/uvicorn app.main:app --port 8002)   # DEV_LOGIN_ENABLED=true, TOSS 키 없음(시뮬레이션)
 *   npm run build && npm run start                             # :3000
 *   npm run e2e
 *
 * 고객: 문진(상품별 문항) → 증거 첨부 → 결제 전 동의 → 결제 → 사건 페이지
 * 직원: 서버 명령어로 권한 지정 → 수임 확정 → 서면 → 검수(인용 확인·체크리스트) → 발송
 * 고객: 완성 서면 다운로드 → 다음 단계를 이전 정보로 이어서 신청(?from=)
 * 테스트 계정·사건이 DB 에 남는다 — 개발 DB 에서만 돌릴 것.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const BACKEND = new URL('../backend', import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), 'ls-e2e-'));
writeFileSync(join(tmp, 'evidence.pdf'), '%PDF-1.4 evidence');
writeFileSync(join(tmp, 'final.pdf'), '%PDF-1.4 FINAL DOCUMENT');

const stamp = Date.now() % 100000;
const errors = [];
let step = 0;
const ok = (msg) => console.log(`✓ ${++step}. ${msg}`);
const expect = (cond, msg) => { if (!cond) throw new Error(`실패: ${msg}`); ok(msg); };

const browser = await chromium.launch({ channel: 'chrome' });
const watch = (page, tag) => {
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => {
    // 직원이 아닌 사용자의 /admin/me 404 는 의도된 응답이라 제외
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(`${tag}: ${m.text()}`);
  });
};

async function signup(page, devName, name, phone, next) {
  await page.goto(`${B}/login?next=${encodeURIComponent(next)}`, { waitUntil: 'networkidle' });
  await page.fill('.dev-login input', devName);
  await page.click('.dev-login button');
  await page.waitForURL(/\/signup/);
  await page.fill('#name', name);
  await page.fill('#phone', phone);
  await page.click('.consent-all input');
  await page.click('button:has-text("가입 완료")');
}

try {
  // ── 고객 ──
  const customer = await (await browser.newContext()).newPage();
  watch(customer, 'customer');
  await signup(customer, `e2e고객${stamp}`, '박고객', '01055556666', '/intake/payment-order');
  await customer.waitForURL(/\/intake\/payment-order/);
  await customer.waitForSelector('#cn');
  expect((await customer.inputValue('#cn')) === '박고객', '가입 정보로 의뢰인 이름이 채워진다');
  await customer.fill('#op', `(주)상대상사${stamp}`);
  await customer.click('button:has-text("다음")');
  await customer.fill('#am', '5000000');
  await customer.fill('#fa', '2026년 3월 2일 물품대금 500만원을 지급하기로 했으나 지급하지 않음');
  expect(await customer.locator('button:has-text("다음")').isDisabled(), '필수 상품별 문항이 비면 다음으로 못 간다');
  await customer.selectOption('#q-cause', '물품대금');
  await customer.fill('#q-arose_on', '2026-03-02');
  await customer.fill('#q-opponent_address', '서울특별시 중구 세종대로 110');
  await customer.click('button:has-text("다음")');
  await customer.setInputFiles('input[type=file]', join(tmp, 'evidence.pdf'));
  expect((await customer.locator('.file-list li span').innerText()) === 'evidence.pdf', '증거 파일이 목록에 담긴다');
  await customer.click('button:has-text("다음")');
  await customer.waitForSelector('.total-row');
  const payBtn = customer.locator('.form-actions button.btn-primary');
  expect(await payBtn.isDisabled(), '결제 전 동의 없이는 결제 버튼이 잠긴다');
  await customer.click('.pay-methods button:has-text("카카오페이")');
  await customer.click('.pay-box .consent-all input');
  expect((await payBtn.innerText()).includes('277,200원'), '결제 금액 = 서버 견적(수임료+VAT+인지대+송달료)');
  await payBtn.click();
  await customer.waitForURL(/\/my\/cases\/\d+\?paid=1/);
  const caseId = customer.url().match(/cases\/(\d+)/)[1];
  await customer.waitForSelector('.page-hero .status-pill');
  expect((await customer.locator('.page-hero .status-pill').innerText()) === '수임 검토 중', '결제 후 수임 검토로 넘어간다');

  // ── 직원 ──
  const staff = await (await browser.newContext()).newPage();
  watch(staff, 'staff');
  await signup(staff, `e2e변호사${stamp}`, '김변호', '01077778888', '/admin');
  await staff.waitForURL(/\/admin/);
  await staff.waitForSelector('h1');
  expect((await staff.locator('h1').first().innerText()) === '페이지를 찾을 수 없습니다', '권한 없는 계정에는 관리자 화면이 숨겨진다');
  const id = execSync('venv/bin/python -m app.cli list-users', { cwd: BACKEND }).toString()
    .split('\n').reverse().find((l) => l.includes('김변호')).trim().split(/\s+/)[0];
  execSync(`venv/bin/python -m app.cli grant --user-id ${id} --admin --lawyer --reason "E2E"`, { cwd: BACKEND });
  await staff.reload({ waitUntil: 'networkidle' });
  await staff.waitForSelector('.kpis');
  ok('서버 명령어로 권한을 받은 뒤 대시보드가 열린다');

  await staff.goto(`${B}/admin/cases/${caseId}`, { waitUntil: 'networkidle' });
  await staff.waitForSelector('.action-card');
  expect(await staff.locator('button:has-text("수임 확정")').isDisabled(), '이해충돌 확인 체크 전에는 수임 확정 불가');
  await staff.check('.action-card .consent input');
  await staff.click('button:has-text("수임 확정")');
  await staff.waitForSelector('button:has-text("서면 올리기")');
  await staff.setInputFiles('.action-card input[type=file]', join(tmp, 'final.pdf'));
  await staff.waitForSelector('button:has-text("검수 요청"):not([disabled])');
  await staff.click('button:has-text("검수 요청")');
  await staff.waitForSelector('.checklist');
  await staff.fill('.cite-box textarea', '대법원 2019다12345 판결, 민법 제750조');
  await staff.click('.cite-box button');
  await staff.waitForSelector('.cite-list li .cite-badge');
  expect((await staff.locator('.cite-list .cite-badge').count()) === 2, '인용 확인이 판례·법령 2건을 찾는다');
  const n = await staff.locator('.checklist input').count();
  for (let i = 0; i < n; i++) await staff.locator('.checklist input').nth(i).check();
  await staff.click('button:has-text("검수 완료")');
  await staff.waitForSelector('text=발송·제출 내역');
  await staff.fill('.action-card input', '전자소송 접수번호 2026차전12345');
  await staff.click('button:has-text("발송·제출 완료")');
  await staff.waitForSelector('.admin-head .status-pill:has-text("완료")');
  ok(`검수 체크리스트 ${n}개 확인 후 발송까지 완료`);

  await staff.goto(`${B}/admin/settings`, { waitUntil: 'networkidle' });
  await staff.waitForSelector('text=이해충돌 명단');
  ok('설정 화면(2단계 인증·이해충돌 명단·정기 작업)이 열린다');

  // ── 고객: 완성 서면 · 다음 단계 ──
  await customer.goto(`${B}/my/cases/${caseId}`, { waitUntil: 'networkidle' });
  await customer.waitForSelector('text=완성된 서면');
  const href = await customer.locator('.card:has-text("완성된 서면") a.file-row').getAttribute('href');
  const body = await customer.evaluate(async (u) => (await fetch(u, { credentials: 'include' })).text(), href);
  expect(body === '%PDF-1.4 FINAL DOCUMENT', '고객이 검수 승인본을 내려받는다');
  // 지급명령의 다음 단계(소송 전환·강제집행)는 아직 오픈 전이라 상품 안내로 연결된다
  expect((await customer.locator('.next-row .next-cta').allInnerTexts()).every((t) => t.includes('오픈 예정')), '오픈 전 다음 단계는 "오픈 예정"으로 안내된다')
  // 접수 가능한 상품은 이전 사건 정보로 이어서 신청 — 주소로 직접 확인
  await customer.goto(`${B}/intake/certified-letter?from=${caseId}`, { waitUntil: 'networkidle' });
  await customer.waitForSelector('.notice:has-text("사건의 정보로 채웠습니다")');
  expect((await customer.inputValue('#op')).startsWith('(주)상대상사'), '다음 단계 문진이 이전 사건 정보로 채워진다');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto(B, { waitUntil: 'networkidle' });
  expect((await mobile.evaluate(() => document.documentElement.scrollWidth)) <= 390, '모바일에서 가로로 넘치지 않는다');

  if (errors.length) throw new Error(`브라우저 오류:\n${errors.join('\n')}`);
  console.log(`\n전체 통과 (${step}단계)`);
} catch (e) {
  console.error(`\n${e.message}`);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
