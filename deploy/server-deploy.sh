#!/bin/bash
# 운영 서버에서 root 로 실행하는 배포 스크립트. GitHub Actions(.github/workflows/ci.yml 의 deploy)가 SSM 으로 부른다.
# 호출 쪽이 먼저 git pull 을 하고 이 파일을 실행하므로, 이 스크립트를 고친 내용도 그 배포부터 바로 적용된다.
#
# 하는 일: 비밀값(SSM Parameter Store /legalstandard/*)으로 backend/.env 재생성 → 의존성·DB 마이그레이션
#          → 프런트 빌드·광고 금칙어 검사 → 서비스 재시작 → 응답 확인. 어느 단계든 실패하면 멈춘다.
# 비밀값은 화면·로그에 찍지 않는다(이름과 "있음/없음"만).
set -euo pipefail
export AWS_DEFAULT_REGION=ap-northeast-2
APP=/home/ubuntu/legal-standard
ENVF=$APP/backend/.env

getp() { aws ssm get-parameter --name "/legalstandard/$1" --with-decryption --query Parameter.Value --output text 2>/dev/null || true; }

# ---- 1. backend/.env ---------------------------------------------------------
TOSS_SK=$(getp TOSS_SECRET_KEY)
TOSS_CK=$(getp TOSS_CLIENT_KEY)
case "$TOSS_SK" in test_sk_*|live_sk_*) ;; *) echo "TOSS_SECRET_KEY 없음/형식 오류"; exit 1;; esac
case "$TOSS_CK" in test_ck_*|live_ck_*) ;; *) echo "TOSS_CLIENT_KEY 없음/형식 오류"; exit 1;; esac
DBPW=$(cat /home/ubuntu/.legal_db_pw)
# JWT 서명키는 처음 한 번만 만든다(바꾸면 모든 로그인이 풀린다)
JWT=$(grep -s '^JWT_SECRET_KEY=' "$ENVF" | cut -d= -f2- || true)
[ ${#JWT} -ge 32 ] || JWT=$(openssl rand -hex 32)
# 구글 앱 비밀번호는 "abcd efgh ijkl mnop" 처럼 띄어 보여 준다 — 공백 제거
SMTP_PW=$(getp SMTP_PASSWORD | tr -d '[:space:]')
KAKAO_ID=$(getp KAKAO_CLIENT_ID)
KAKAO_SECRET=$(getp KAKAO_CLIENT_SECRET)

umask 077
{
  cat <<EOF
ENV=production
DATABASE_URL=postgresql+psycopg2://legal:${DBPW}@127.0.0.1:5432/legal_standard
JWT_SECRET_KEY=${JWT}
COOKIE_SECURE=true
CORS_ORIGINS=["https://legalstandard.co.kr"]
FRONTEND_BASE_URL=https://legalstandard.co.kr
BACKEND_BASE_URL=https://legalstandard.co.kr
DEV_LOGIN_ENABLED=false
TOSS_SECRET_KEY=${TOSS_SK}
TOSS_CLIENT_KEY=${TOSS_CK}
STORAGE_DIR=${APP}/backend/storage
MAX_UPLOAD_MB=20
EOF
  # 메일(비밀번호 재설정·관리자 이메일 인증) — Google Workspace admin@ 계정의 앱 비밀번호
  if [ -n "$SMTP_PW" ]; then
    cat <<EOF
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@legalstandard.co.kr
SMTP_PASSWORD=${SMTP_PW}
SMTP_FROM=리걸스탠다드 <admin@legalstandard.co.kr>
EOF
  fi
  if [ -n "$KAKAO_ID" ] && [ -n "$KAKAO_SECRET" ]; then
    printf 'KAKAO_CLIENT_ID=%s\nKAKAO_CLIENT_SECRET=%s\n' "$KAKAO_ID" "$KAKAO_SECRET"
  fi
} > "$ENVF.tmp"
chown ubuntu:ubuntu "$ENVF.tmp" && mv "$ENVF.tmp" "$ENVF" && chmod 600 "$ENVF"
echo ".env: toss ${TOSS_SK%%_sk_*} · smtp $([ -n "$SMTP_PW" ] && echo 있음 || echo 없음) · kakao $([ -n "$KAKAO_ID" ] && echo 있음 || echo 없음)"
unset TOSS_SK TOSS_CK DBPW JWT SMTP_PW KAKAO_ID KAKAO_SECRET

# ---- 2. 빌드 ------------------------------------------------------------------
sudo -u ubuntu bash -lc '
set -euo pipefail
cd ~/legal-standard && git log --oneline -1
cd backend && venv/bin/pip install -q -r requirements.txt && venv/bin/alembic upgrade head 2>&1 | tail -1 && cd ..
npm ci --no-audit --no-fund --loglevel=error
NODE_OPTIONS=--max-old-space-size=1536 npm run build > /tmp/legalstandard-build.log 2>&1 || { tail -30 /tmp/legalstandard-build.log; exit 1; }
grep -E "Compiled" /tmp/legalstandard-build.log | head -1
npm run check:copy 2>&1 | tail -1
'

# ---- 3. 재시작·확인 -------------------------------------------------------------
systemctl restart legalstandard-backend legalstandard-frontend
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/v1/auth/providers || true)
  [ "$code" = 200 ] && break
  sleep 3
done
systemctl is-active legalstandard-backend legalstandard-frontend
[ "$code" = 200 ] || { echo "API 응답 없음($code)"; journalctl -u legalstandard-backend -n 20 --no-pager; exit 1; }
curl -s -o /dev/null -w "home %{http_code}\n" http://127.0.0.1:3002/
echo "배포 완료"
