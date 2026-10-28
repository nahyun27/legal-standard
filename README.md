# 리걸스탠다드 (Legal Standard)

수임료를 먼저 보여드리는 정찰가 법률서비스 웹사이트.

내용증명 → 지급명령 → 소송 → 강제집행처럼 이어지는 사건을 "여정"으로 묶고, 각 단계의 가격과 업무 범위를
결제 전에 공개한다. 의뢰인은 온라인 문진으로 접수하고 결제하며, 변호사가 검토·서명한 서면을 받는다.

## 주요 기능

- **상품·여정 안내**: 상품별 정찰가, 포함·불포함 업무, 다음 단계 가격. 여정 시뮬레이터에서 조건부 단계를 켜고 끄면
  총액이 하한~상한으로 다시 계산된다.
- **온라인 문진·결제**: 비로그인으로 문진을 쓰고 결제 직전에 로그인. 결제는 토스페이먼츠.
- **내 사건**: 진행 단계, 결제·영수증, 자료 추가, 검수가 끝난 서면 내려받기.
- **관리자**: 사건 단계별 처리, 변호사 검수 체크리스트, 이해충돌 확인, 인용 법령·판례 확인, 회원·감사 로그.
- **법률 용어 풀이**: 화면 문장 속 법률 용어에 올리거나 누르면 뜻을 보여준다.

## 기술 스택

- 프론트: Next.js 16 (App Router) · React 19 · TypeScript · 순수 CSS 디자인 시스템(`src/app/globals.css`) · lucide-react
- 백엔드: FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL (`backend/`)
- 로그인: 카카오·네이버 소셜 로그인(비밀번호 저장 안 함), httpOnly 쿠키 세션
- CI: GitHub Actions — 푸시·PR 마다 백엔드 테스트, 타입체크, 빌드, 광고 문구 검사

## 실행

```bash
# 1) DB (Docker)
docker compose up -d

# 2) 백엔드 (:8002)
cd backend
python3.11 -m venv venv && venv/bin/pip install -r requirements.txt
cp .env.example .env            # JWT_SECRET_KEY 는 랜덤값으로 바꿀 것
venv/bin/alembic upgrade head
venv/bin/uvicorn app.main:app --reload --port 8002
venv/bin/python -m pytest -q    # 테스트(메모리 SQLite)

# 3) 프론트 (:3000)
npm install
cp .env.example .env.local
npm run dev
npm run typecheck   # next typegen 후 tsc
npm run check:copy  # (build 후) 광고 영역 금칙어 검사
npm run e2e         # 백엔드·프론트를 띄운 상태에서 브라우저 전체 흐름 검사(로컬 Chrome 필요)
```

개발 환경에서는 소셜 키 없이 이름만으로 로그인할 수 있다(`DEV_LOGIN_ENABLED=true`, 운영 환경에서는 항상 꺼짐).
운영 배포는 [deploy/README.md](deploy/README.md) 참고.

## 사건 처리 흐름

`결제 대기 → 수임 검토 → 서면 준비 → 변호사 검수 → 발송 준비 → 완료` (수임하지 않으면 전액 환불)

- 상태 전이는 서버에서만 일어나고 모두 감사 로그에 남는다.
- 금액은 서버 카탈로그(`backend/app/core/catalog.py`)로만 계산하고, 결제 승인 때 클라이언트 금액과 대조한다.
  프론트 `src/data/services.ts` 와 가격이 어긋나면 테스트가 실패한다.
- 수임 확정·검수 완료는 변호사 권한이 있어야 하고, 검수 완료는 상품별 체크리스트를 모두 확인해야 한다.
- 고객은 발송이 끝난 사건의 검수 승인본만 내려받을 수 있다. 파일은 항상 권한 확인 API 를 거친다.
- 결제창을 닫아 승인이 누락돼도 토스 웹훅과 정기 대조 작업으로 반영한다.

## 구조

```
src/
  app/                 라우트 — (site) 공개 화면, admin 관리자
  components/          공용 UI, JourneyTimeline(여정 시뮬레이터), IntakeForm(문진), Term(용어 풀이)
  data/services.ts     상품·정찰가·업무 범위·다음 단계 — 가격은 여기 한곳에서만 바꾼다
  data/journeys.ts     여정(단계와 넘어가는 조건)
  data/glossary.ts     법률 용어 풀이
  data/faq.ts          FAQ
  lib/copy.ts          대외 문구 트랙·광고 금칙어
  lib/seo.ts           색인 정책(기본 noindex)
backend/
  app/                 FastAPI 앱 — 인증, 사건·결제·파일, 관리자 API, CLI
  alembic/             DB 마이그레이션
  tests/
deploy/                Nginx·systemd 설정, 배포 절차
```

## 라우트

| 경로 | 화면 |
| --- | --- |
| `/` | 홈 |
| `/services` `/services/:slug` | 상품 목록 · 상품 상세 |
| `/journeys` `/journeys/:slug` | 여정 목록 · 단계별 가격 |
| `/intake/:slug` | 온라인 문진 |
| `/login` `/signup` `/auth/callback` | 로그인 · 가입 마무리 · 소셜 로그인 복귀 |
| `/my` `/my/cases/:id` | 내 사건 목록 · 사건 상세 |
| `/payments/success` `/payments/fail` | 결제창 복귀 |
| `/admin/*` | 관리자(직원 전용) |
| `/why` `/process` `/about` `/faq` | 가격 설명 · 진행 방식 · 소개 · FAQ |
| `/notice` `/terms` `/privacy` | 서비스 운영 고지 · 약관 · 개인정보처리방침 |

## 규범 원칙

변호사 광고 규정을 화면 설계 단계부터 지킨다. 광고 영역 문구를 바꿀 땐 먼저 확인할 것.

- **문구 트랙**: 기본 B("변호사 검토·서명·책임"). 광고 영역의 문구는 `lib/copy.ts` 의 `COPY` 를 거친다.
- **자동화 도구 활용 고지**는 비광고 영역(`/notice`, FAQ, 약관)에만, 트랙과 무관하게 항상 노출.
- **염가 표방 금지**: 무료·최저가·비교·결과 보장 같은 표현을 쓰지 않는다(`BANNED_AD_WORDS`). `npm run check:copy` 가
  빌드된 광고 페이지에서 금칙어를 찾는다.
- **명칭 병기**: 브랜드명은 법무법인 명칭과 함께 표시하고, 광고책임변호사는 모든 페이지 푸터에 표시.
- **가격 투명성**: 정찰가는 VAT 별도를 명시하고, 실비는 결제 전 화면에 항목별로 보여준다.
- **색인 차단 기본값**: 정식 오픈 전까지 `NEXT_PUBLIC_ALLOW_INDEXING=false`.

## 디자인

- 폰트: 제목 **함렛**(Hahmlet, next/font/google), 본문 **프리텐다드**(npm `pretendard`). 둘 다 같은 주소에서 직접 제공한다.
- 서브페이지는 `PageHero`(위치·제목·요약) + `TrustSeal`(변호사 검토·서명 인장)로 통일.
- 모션: 스윙택 등장, 강조어 밑줄, 스크롤 등장(`Reveal` — JS 가 없으면 숨기지 않음). `prefers-reduced-motion` 이면 끈다.
