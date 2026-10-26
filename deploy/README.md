# 운영 배포

대표 주소: **https://legalstandard.co.kr**. 나머지 도메인 7개(legalstandard.kr, legalstandards.co.kr·kr, lawstandard.co.kr·kr, lawstandards.co.kr·kr)와 www 는 모두 대표 주소로 301 이동한다.

구성은 KCPEC 과 같다. EC2 한 대 + Nginx(SSL·리다이렉트) + systemd 서비스 두 개.

```
브라우저 → Nginx :443 → Next :3002 ─(/api/v1)→ FastAPI :8002 → PostgreSQL
```

KCPEC 과 같은 서버에 올려도 포트가 겹치지 않게 3002·8002 를 쓴다.

## 1. DNS (가비아)

도메인 8개 모두 DNS 관리에서 레코드 두 개를 서버의 고정 IP(Elastic IP)로 지정한다.

| 호스트 | 타입 | 값 |
| --- | --- | --- |
| `@` | A | 서버 IP |
| `www` | A | 서버 IP |

가비아 도메인은 **자동 연장**을 켜 둘 것. 7개가 2027-09-28 에 한꺼번에 만료된다.

## 2. 서버 준비

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
cp .env.example .env.production   # 아래 표대로 채운다
npm run build && npm run check:copy
```

## 3. 인증서와 Nginx

인증서는 두 장이다. 대표 주소 한 장, 리다이렉트용 도메인 묶음 한 장.

```bash
sudo mkdir -p /var/www/certbot
# 처음 발급할 때는 http(80) 블록만 있으면 된다 — 443 블록을 잠시 빼고 nginx 를 띄운 뒤 발급
sudo certbot certonly --webroot -w /var/www/certbot -d legalstandard.co.kr
sudo certbot certonly --webroot -w /var/www/certbot --cert-name legalstandard-redirects \
  -d www.legalstandard.co.kr \
  -d legalstandard.kr -d www.legalstandard.kr \
  -d legalstandards.co.kr -d www.legalstandards.co.kr -d legalstandards.kr -d www.legalstandards.kr \
  -d lawstandard.co.kr -d www.lawstandard.co.kr -d lawstandard.kr -d www.lawstandard.kr \
  -d lawstandards.co.kr -d www.lawstandards.co.kr -d lawstandards.kr -d www.lawstandards.kr

sudo cp deploy/nginx/legalstandard.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/legalstandard.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. 서비스 등록

```bash
sudo cp deploy/systemd/legalstandard-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now legalstandard-backend legalstandard-frontend
```

첫 관리자 지정: 대표 주소에서 로그인·가입한 뒤

```bash
cd ~/legal-standard/backend
venv/bin/python -m app.cli list-users
venv/bin/python -m app.cli grant --user-id <번호> --admin --lawyer --reason "초기 관리자 지정"
```

운영 환경에서는 관리자 2단계 인증이 필수다. 처음 /admin 에 들어갈 때 등록 화면이 나온다.

## 5. 정기 작업 (crontab -e)

```cron
0 * * * *  cd /home/ubuntu/legal-standard/backend && venv/bin/python -m app.cli reconcile-payments >> /var/log/legalstandard-cron.log 2>&1
30 9 * * * cd /home/ubuntu/legal-standard/backend && venv/bin/python -m app.cli housekeeping >> /var/log/legalstandard-cron.log 2>&1
```

## 환경변수

### 프론트 `.env.production`

| 키 | 값 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://legalstandard.co.kr` |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `false` — 광고심사위 회신 후 정식 오픈할 때 `true` 로 바꾸고 다시 빌드 |
| `NEXT_PUBLIC_COPY_TRACK` | `B` |
| `API_PROXY_TARGET` | `http://127.0.0.1:8002` |

### 백엔드 `backend/.env`

| 키 | 값 |
| --- | --- |
| `ENV` | `production` |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` 로 만든 값 |
| `COOKIE_SECURE` | `true` |
| `CORS_ORIGINS` | `["https://legalstandard.co.kr"]` |
| `FRONTEND_BASE_URL` | `https://legalstandard.co.kr` |
| `BACKEND_BASE_URL` | `https://legalstandard.co.kr` |
| `DATABASE_URL` | 운영 DB 주소 |
| 카카오·네이버·토스·솔라피·SMTP·`LAW_API_OC` | 각 콘솔에서 발급 |

## 외부 콘솔에 등록할 주소

모두 대표 주소 하나만 등록한다.

| 어디 | 등록할 값 |
| --- | --- |
| 카카오 개발자 — Redirect URI | `https://legalstandard.co.kr/api/v1/auth/social/kakao/callback` |
| 네이버 개발자 — Callback URL | `https://legalstandard.co.kr/api/v1/auth/social/naver/callback` |
| 토스페이먼츠 — 웹훅 | `https://legalstandard.co.kr/api/v1/payments/webhook` |
| 카카오·네이버 — 서비스 URL | `https://legalstandard.co.kr` |

## 업데이트 배포

```bash
cd ~/legal-standard && git pull --ff-only
cd backend && venv/bin/pip install -r requirements.txt && venv/bin/alembic upgrade head && cd ..
sudo systemctl restart legalstandard-backend
npm ci && npm run build && npm run check:copy && sudo systemctl restart legalstandard-frontend
```
