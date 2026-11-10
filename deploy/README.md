# 운영 배포

서버 한 대에 Nginx(SSL·리다이렉트)와 systemd 서비스 두 개를 둔다.

```
브라우저 → Nginx :443 → Next :3002 ─(/api/v1)→ FastAPI :8002 → PostgreSQL
```

대표 주소 하나만 서비스하고, 나머지 도메인과 www 는 Nginx 에서 대표 주소로 301 이동한다([nginx/legalstandard.conf](nginx/legalstandard.conf)).

## 1. 서버 준비

```bash
git clone https://github.com/nahyun27/legal-standard.git ~/legal-standard
cd ~/legal-standard

# 백엔드
cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt
cp .env.example .env   # 아래 "환경변수" 표대로 채운다
venv/bin/alembic upgrade head
cd ..

# 프론트
npm ci
cp .env.example .env.production
npm run build && npm run check:copy
```

## 2. 인증서와 Nginx

certbot(webroot `/var/www/certbot`)으로 대표 주소용 인증서와 리다이렉트 도메인용 인증서(`legalstandard-redirects`)를 발급한 뒤:

```bash
sudo cp deploy/nginx/legalstandard.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/legalstandard.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 3. 서비스 등록

```bash
sudo cp deploy/systemd/legalstandard-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now legalstandard-backend legalstandard-frontend
```

운영 환경에서는 관리자 2단계 인증이 필수다.

## 4. 정기 작업

`app.cli reconcile-payments`(결제 대조)를 매시간, `app.cli housekeeping`(결제 대기 안내·자동 취소)을 매일 cron 으로 돌린다.

## 환경변수

### 프론트 `.env.production`

| 키 | 값 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 대표 주소 |
| `NEXT_PUBLIC_ALLOW_INDEXING` | 정식 오픈 전까지 `false` (바꾸면 다시 빌드) |
| `NEXT_PUBLIC_COPY_TRACK` | `B` |
| `API_PROXY_TARGET` | `http://127.0.0.1:8002` |

### 백엔드 `backend/.env`

| 키 | 값 |
| --- | --- |
| `ENV` | `production` |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` 로 만든 값 |
| `COOKIE_SECURE` | `true` |
| `CORS_ORIGINS` · `FRONTEND_BASE_URL` · `BACKEND_BASE_URL` | 대표 주소 |
| `DATABASE_URL` | 운영 DB 주소 |
| 소셜 로그인·결제·문자·메일·법령 API 키 | 각 콘솔에서 발급 |

외부 콘솔(카카오·네이버 Redirect URI, 토스 웹훅)에는 대표 주소 기준의 `/api/v1/auth/social/{kakao|naver}/callback`,
`/api/v1/payments/webhook` 을 등록한다.

## 업데이트 배포

```bash
cd ~/legal-standard && git pull --ff-only
cd backend && venv/bin/pip install -r requirements.txt && venv/bin/alembic upgrade head && cd ..
sudo systemctl restart legalstandard-backend
npm ci && npm run build && npm run check:copy && sudo systemctl restart legalstandard-frontend
```

## 자동 배포 (GitHub Actions)

`main` 에 푸시하면 `.github/workflows/ci.yml` 이 테스트·빌드를 돌리고, 통과하면 `deploy` 작업이 운영 서버에 배포한다.

- AWS 키를 저장소·GitHub 비밀값에 두지 않는다. GitHub OIDC 로 IAM 역할 `legalstandard-github-deploy` 를 잠깐 받는다.
  이 역할은 `repo:nahyun27/legal-standard:ref:refs/heads/main` 만 받을 수 있고, 운영 서버 한 대에 SSM 명령을 보내는 것만 허용된다.
- 서버에서는 `git pull` 후 `deploy/server-deploy.sh` 를 root 로 실행한다(.env 재생성 → 마이그레이션 → 빌드 → 재시작 → 응답 확인).
- 비밀값은 `deploy/put-secret.sh <이름>` 으로 SSM Parameter Store 에 넣고, 다음 배포 때 .env 에 반영된다.
  읽는 이름: `TOSS_SECRET_KEY`, `TOSS_CLIENT_KEY`(필수), `SMTP_PASSWORD`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`(선택).
- 비밀값만 바꾸고 코드 변경 없이 다시 배포하려면 GitHub → Actions → CI → Run workflow 가 아니라, 빈 커밋을 푸시한다
  (`git commit --allow-empty -m "재배포" && git push`).
