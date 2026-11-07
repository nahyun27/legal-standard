#!/bin/bash
# 운영 비밀값을 AWS SSM Parameter Store(암호화)에 넣는다 — 값은 화면에 보이지 않게 입력받고, 어디에도 출력하지 않는다.
# 서버는 /legalstandard/<이름> 을 읽어 backend/.env 를 만든다(값은 저장소·대화·로그에 남기지 않는다).
#
#   deploy/put-secret.sh TOSS_SECRET_KEY
#   deploy/put-secret.sh TOSS_CLIENT_KEY
set -euo pipefail
NAME="${1:?사용법: deploy/put-secret.sh <이름>  예) TOSS_SECRET_KEY}"
PROFILE="${AWS_PROFILE:-legalstandard}"
printf '%s 값을 붙여넣고 Enter (화면에 보이지 않습니다): ' "$NAME"
IFS= read -rs VALUE; echo
[ -n "$VALUE" ] || { echo "값이 비어 있어 취소합니다."; exit 1; }
aws ssm put-parameter --profile "$PROFILE" --region ap-northeast-2 \
  --name "/legalstandard/$NAME" --type SecureString --overwrite --value "$VALUE" >/dev/null
unset VALUE
echo "저장했습니다: /legalstandard/$NAME"
