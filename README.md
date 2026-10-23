# 리걸스탠다드 (Legal Standard)

법무법인(유한) 에스제이파트너스의 전 구간 정찰제 법률서비스. 내용증명 → 지급명령 → 소송 전환 → 집행까지
다음 단계의 가격·업무범위를 결제 전에 공개하는 "여정 상품"이 핵심이다. 근거 문서는 `사업기획서_최종안_리걸스탠다드.docx`
(Ver 4.2, 대외비 — 저장소에 올리지 않음).
화면 구성·카피는 의뢰인 프로토타입 `홈페이지_최종_AB비교_리걸스탠다드.html`(4.1, A/B 표기 비교본)을 따른다.
`홈페이지_프로토타입_리걸스탠다드.html` 은 이전 버전(지급명령 22만 원 등 구가격)이라 참고하지 않는다.

> ⚠ 개발 중인 뼈대입니다. 가격은 기획서 안(VAT 별도)이며, 법인 정보·성공보수율·집행 가격 등 "(확정 필요)" 항목은 의뢰인 확인이 필요합니다.

## 실행

```bash
# 1) DB (Docker, 5434 포트 — KCPEC 5432·폴리스맵 5433 과 안 겹치게)
docker compose up -d

# 2) 백엔드 (FastAPI, :8002)
cd backend
python3.11 -m venv venv && venv/bin/pip install -r requirements.txt
cp .env.example .env            # JWT_SECRET_KEY 는 랜덤값으로 바꿀 것
venv/bin/alembic upgrade head
venv/bin/uvicorn app.main:app --reload --port 8002
venv/bin/python -m pytest -q    # 테스트(메모리 SQLite, 실제 DB 안 건드림)

# 3) 프론트 (:3000)
npm install
cp .env.example .env.local
npm run dev
npm run typecheck   # next typegen(PageProps 등 라우트 타입 생성) 후 tsc
npm run check:copy  # (build 후) 광고 영역 금칙어 검사 — CI 에서도 돈다
npm run e2e         # 백엔드·프론트를 띄운 상태에서 브라우저 전체 흐름 검사(로컬 Chrome 필요)
```

CI(GitHub Actions): 푸시·PR 마다 백엔드 테스트, 타입체크, 빌드, 광고 금칙어 검사.

## 사건 처리 흐름 (P0)

`결제 대기 → 수임 검토 → 서면 준비 → 변호사 검수 → 발송 준비 → 완료` (불성립 시 전액 환불). 상태 전이는 서버에서만 일어나고
모두 `audit_logs` 에 남는다. 서버가 강제하는 규칙:

- **금액은 서버 카탈로그(`backend/app/core/catalog.py`)로만 계산**한다. 결제 승인 때 클라이언트 금액을 서버 금액과 대조.
  프론트 `src/data/services.ts` 와 가격이 어긋나면 `tests/test_catalog.py` 가 실패한다.
- 실비: 인지대는 민사소송 등 인지법 산식(전자소송 감액·지급명령 1/10), 송달료·우편료 단가는 `backend/.env` 설정값 —
  **오픈 전 법원 고시·우체국 요금으로 확인할 것.**
- 결제: 토스페이먼츠. `TOSS_SECRET_KEY` 가 없으면 시뮬레이션(바로 결제완료). 시뮬레이션 여부는 서버 설정으로만 정하고,
  운영 환경(`ENV=production`)은 키 없이 기동하지 않는다.
- **수임 확정·불성립·검수 완료는 변호사(`is_lawyer`)만.** 검수 완료는 상품별 체크리스트 전 항목 확인 필수.
- **고객은 발송 완료된 사건의 "검수 승인본"만 내려받을 수 있다.** 검수 요청 이후에는 서면 파일을 바꿀 수 없다.
- 사건 파일은 `backend/storage/`(git 제외)에 무작위 이름으로 저장하고, 다운로드는 항상 권한 확인 API 를 거친다.
- 알림은 아직 서버 로그만(`app/core/notify.py`). 알림톡·SMS 연결 예정.

### 결제·운영 안전장치

- **결제 누락 방지**: 결제창에서 결제 후 창을 닫으면 승인 API 가 호출되지 않는다. 토스 웹훅
  (`POST /api/v1/payments/webhook`, 본문은 믿지 않고 orderId 로 토스에 재조회)과 대조 작업으로 반영한다.
- **결제 전 동의**: 수임 조건 + 청약철회 제한 고지(전자상거래법 제17조 제2항) 동의 없이는 결제가 시작되지 않는다.
  동의 문안 버전(`CONSENT_VERSION`)·시각·IP 를 사건에 남긴다. **문안은 초안 — 법무법인 확정 필요.**
- 결제수단: 카드·카카오페이·네이버페이·토스페이·계좌이체(현금영수증 정보는 토스 결제창에서 받음). 영수증 링크 표시.
- 진행 중 사건이 있으면 회원 탈퇴 불가. 납기는 주말·공휴일 제외(`app/core/timeutil.py` — **2027년 공휴일은 추정치, 확인 필요**).
- 알림: SMS(솔라피) → 이메일, 채널이 없거나 실패해도 `notifications` 에 기록. 관리자 사건 상세에서 발송 이력 확인.

정기 작업(cron):

```bash
venv/bin/python -m app.cli reconcile-payments   # 매시간 — 결제됐는데 반영 안 된 건 대조
venv/bin/python -m app.cli housekeeping         # 매일 — 결제 대기 안내(1회)·7일 경과 자동 취소
```

## 관리자 (`/admin`)

대시보드(처리 대기·납기 초과·매출·핵심 관리지표: 실제 검수시간·납기 준수율·다음 단계 전환율), 사건(단계별 조치·
이해충돌 후보·인용 법령·판례 확인·심화 사건 견적·알림 이력·내부 메모·처리 기록), 회원(검색·연락처 마스킹·정지·권한),
감사 로그, 설정(2단계 인증·이해충돌 명단 CSV). 직원이 아니면 화면도 API 도 404 다.

- **2단계 인증(TOTP)**: 운영 환경에서는 필수(개발은 `ADMIN_MFA_REQUIRED=true` 로 켤 수 있음). 분실 시 `app.cli reset-mfa`.
- 변호사 1인당 진행 사건 상한(`MAX_OPEN_CASES_PER_LAWYER`) 초과 시 배정 불가.
- 이해충돌 대조는 "(주)·주식회사·띄어쓰기"를 정규화하고, 법인 본체 명단(CSV)과도 대조한다.
- 인용 확인은 국가법령정보센터 API(`LAW_API_OC`)를 쓴다. 키가 없거나 실패하면 "미확인"으로만 표시한다.

첫 관리자는 화면에서 만들 수 없다 — 해당 계정으로 가입을 마친 뒤 서버 명령어로 지정한다.

```bash
cd backend
venv/bin/python -m app.cli list-users
venv/bin/python -m app.cli grant --user-id 1 --admin --lawyer --reason "초기 관리자 지정"
```

## 로그인·회원가입

- **로그인 = 가입.** 카카오·네이버 소셜 로그인만 받는다(비밀번호 저장 안 함). 처음 로그인하면 계정이 생기고
  `/signup` 에서 필수 약관 동의 + 실명·연락처를 받아야 가입이 끝난다(`onboarded_at`). 수임계약·위임장·이해충돌
  확인에 실명이 필요해서다.
- **문진은 비로그인으로 작성**, 결제 직전에 로그인·가입 마무리를 요구한다. 입력 내용은 sessionStorage 에 남아
  로그인하고 돌아와도 유지된다(탭을 닫으면 삭제 — 사건 내용이 민감정보라 오래 남기지 않음).
- **세션**: httpOnly 쿠키(access 30분 / refresh 14일, refresh 는 `/api/v1/auth` 경로에만). 페이지 진입 시
  `GET /auth/session` 이 비로그인도 200 으로 답하고, access 가 만료됐으면 그 자리에서 재발급한다.
  로그아웃·탈퇴 시 `token_version` 을 올려 이미 발급된 토큰을 전부 무효화한다.
- **개발용 로그인**: 소셜 키 없이 이름만으로 로그인(`DEV_LOGIN_ENABLED=true`). `ENV=production` 이면
  설정과 무관하게 꺼지고, 운영 환경은 약한 JWT 시크릿·`COOKIE_SECURE=false` 로는 기동 자체를 거부한다.
- **소셜 키 등록**: 카카오·네이버 개발자 콘솔에 Redirect URI 로
  `{BACKEND_BASE_URL}/api/v1/auth/social/{kakao|naver}/callback` 을 등록하고 `backend/.env` 에 키를 넣는다.
  키가 없는 provider 는 로그인 화면에 "준비 중"으로 표시된다.
- KCPEC 과 다른 점: 같은 이메일이라도 다른 소셜 계정을 자동으로 합치지 않는다(카카오 이메일은 선택 동의·미인증일
  수 있어 계정 탈취 경로가 될 수 있음).
- 아직 없는 것: 휴대폰 본인인증(PASS, 업체 계약 필요 — `phone_verified_at` 자리만 있음), 관리자 화면.

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · 순수 CSS 디자인 시스템(`src/app/globals.css`) · lucide-react.
백엔드는 `backend/`(FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL): 회원 인증, 사건 접수·결제·파일, 관리자 API.

## 구조

```
src/
  app/                 라우트
  components/          Header/Footer, 공용 UI(ui.tsx), JourneyTimeline, IntakeForm(문진, client)
  data/services.ts     상품·정찰가·표준 업무범위(SOW)·다음 단계 — 가격은 여기 한곳에서만 바꾼다
  data/journeys.ts     여정 상품(단계와 넘어가는 조건)
  data/faq.ts          FAQ + 자동화 도구 활용 고지 문구(비광고 영역)
  lib/copy.ts          대외 카피 트랙(A/B)·광고 금칙어
  lib/site.ts          법인 정보(명칭 병기·광고책임변호사)
  lib/seo.ts           색인 정책(기본 noindex)
```

## 라우트

| 경로 | 화면 |
| --- | --- |
| `/` | 히어로, 베타 상품, 여정 예시, 기준(4대 원칙), 진행 방식 |
| `/services` `/services/:slug` | 티어별 가격표 · 상품 상세(포함/불포함 업무, 다음 단계 가격) |
| `/journeys` `/journeys/:slug` | 여정 상품 · 단계별 가격과 전 단계 상한 합계 |
| `/intake/:slug` | 온라인 문진(베타 상품만, 4단계 뼈대) |
| `/login` `/signup` `/auth/callback` | 로그인(=가입 시작) · 가입 마무리(약관·실명·연락처) · 소셜 로그인 복귀 |
| `/my` `/my/cases/:id` | 내 사건 목록 · 사건 상세(진행 단계·결제·서면 받기·자료 추가·다음 단계 가격) |
| `/payments/success` `/payments/fail` | 토스 결제창 복귀 |
| `/admin/*` | 관리자(직원 전용) — 대시보드·사건·회원·감사 로그 |
| `/why` `/process` `/about` `/faq` | 왜 이 가격인가 · 진행 방식 · 법인 소개 · FAQ |
| `/notice` `/terms` `/privacy` | 서비스 운영 고지(비광고 영역) · 약관 · 개인정보처리방침 |

## 규범 원칙 (코드에 반영된 것)

사업기획서 VII·VIII·X 장의 광고규범을 화면 설계 단계부터 지킨다.

- **카피 트랙**: 기본 B("변호사 검토·서명·책임"). 광고 영역에서 AI 언급 금지, "직접 작성·수작업"도 금지.
  변협 AI 인증 취득 후에만 `NEXT_PUBLIC_COPY_TRACK=A`. 광고 문구는 `lib/copy.ts` 의 `COPY` 를 거친다.
- **AI 활용 사실 고지**는 비광고 영역(`/notice`, FAQ, 약관)에만, 트랙과 무관하게 항상 노출.
- **염가 표방 금지**: 무료·최저가·1/10·절약액·비교·결과 보장 표현 금지(`BANNED_AD_WORDS`).
  "문진 무료" 대신 "수임 불성립 시 전액 반환"을 쓴다.
- **명칭 병기**: 브랜드명은 항상 법무법인 명칭과 함께(헤더·푸터). 광고책임변호사는 전 페이지 푸터에 표시.
- **가격 투명성**: 정찰가는 VAT 별도 명시, 실비는 결제 전 총액 화면에 항목별 표시.
- **색인 차단 기본값**: 광고심사위원회 사전 질의 회신 전까지 `NEXT_PUBLIC_ALLOW_INDEXING=false`.

## 오픈 단계

`Service.stage` 로 관리한다. `pilot`(2026.11 베타: 내용증명·지급명령·고소장 2종·초안 검토·심화 상담)만 문진이 열리고,
`launch`(2027.2 정식 론칭) 상품은 가격만 공개하고 "오픈 예정"으로 표시한다.

## 디자인

의뢰인 프로토타입(4.1)의 디자인 시스템을 그대로 옮겼다(`globals.css` 상단 토큰). 콘셉트는 "법률서비스의 SPA" —
크라프트지 스윙택, 정찰 레드(`--tag`)는 가격·강조·CTA 에만.

- 폰트: 제목(h1·h2) **마루 부리**(`src/app/fonts`, next/font/local), 본문 **프리텐다드**(npm `pretendard`).
  둘 다 OFL 이라 같은 주소에서 직접 제공한다 — 외부 CDN 스타일시트가 화면 그리기를 막아 느린 망에서 첫 화면이 수 초 멈췄다.
- 서브페이지는 `PageHero`(위치 표시·제목·요약) + `TrustSeal`(변호사 검토·서명 인장)로 통일.
- 스크롤 등장(`Reveal`)은 React 가 붙은 뒤에만 숨김을 켠다(`RevealBoot`) — JS 가 늦어도 첫 화면 내용이 비지 않게.

프로토타입 위에 더한 것:

- **여정 시뮬레이터**(`JourneyTimeline`): 조건부 단계를 스위치로 켜면 총액이 하한~상한으로 다시 계산된다(카운트업).
- **모션**: 스윙택 진자 등장, 강조어 밑줄, 스크롤 등장(`Reveal` — JS 없으면 숨기지 않음), 헤더 스크롤 그림자,
  카드 호버 시 미니태그 흔들림. `prefers-reduced-motion` 이면 전부 끈다.
- **상황 선택 칩**(`SituationChips`): 히어로에서 상황으로 여정을 고른다.

### 프로토타입과 문구가 다른 점 (의뢰인 확인 필요)

광고규범(염가 표방·최상급 금지, 실명 브랜드 비교)과 충돌 소지가 있어 바꿨다.

| 프로토타입 | 현재 | 사유 |
| --- | --- | --- |
| 미니태그 "시장 유일" | "새 서비스" | 최상급·비교 표현 |
| "싸게 하되, 허투루 하지 않습니다" | "가격은 정찰제로, 책임은 끝까지" | 염가 표방 |
| "싼 이유는 대충 하기 때문이 아니라…" | 삭제 | 염가 표방 |
| "유니클로가 …" | "SPA 브랜드처럼" | 타사 실명 |
| "왜 기존 수임료보다 저렴한가요?" | "…낮은가요?" | 염가 표방(완화) |
| "오류가 발견되면 무상으로 보완" | "보완해 드립니다" | 무료 표방 |
