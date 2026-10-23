"""서버 명령어. 첫 관리자는 화면에서 만들 수 없게 하고(권한 상승 경로 차단) 여기서만 지정한다.

  venv/bin/python -m app.cli list-users
  venv/bin/python -m app.cli grant --user-id 3 --admin --lawyer --reason "초기 관리자 지정"
  venv/bin/python -m app.cli revoke --user-id 3 --admin --reason "퇴사"
  venv/bin/python -m app.cli reset-mfa --user-id 3 --reason "휴대폰 분실"
  venv/bin/python -m app.cli reconcile-payments   # 결제됐는데 반영 안 된 건 대조(매시간 cron 권장)
  venv/bin/python -m app.cli housekeeping         # 결제 대기 리마인드·자동 취소(매일 cron 권장)
"""

import argparse
from datetime import timedelta

from sqlalchemy import select

from app.core.audit import record
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.notify import notify
from app.core.timeutil import aware, now
from app.models.case import Case, CaseStatus, Payment
from app.models.user import User


def reconcile_payments(db) -> dict:
    """결제 시도(ready) 중 10분~7일 된 것을 토스에 조회해 실제 결제된 건을 반영한다."""
    from app.api.cases import sync_payment

    if settings.payment_simulated:
        return {"skipped": "시뮬레이션 모드"}
    t = now()
    result: dict[str, int] = {}
    for p in db.scalars(select(Payment).where(Payment.status == "ready")):
        age = t - aware(p.created_at)
        if timedelta(minutes=10) <= age <= timedelta(days=7):
            r = sync_payment(db, p, via="reconcile")
            result[r] = result.get(r, 0) + 1
    return result


def housekeeping(db) -> dict:
    """결제 대기 사건: PENDING_REMIND_HOURS 지나면 한 번 안내, PENDING_EXPIRE_DAYS 지나면 자동 취소."""
    t = now()
    reminded = expired = 0
    for c in db.scalars(select(Case).where(Case.status == CaseStatus.PENDING_PAYMENT)):
        age = t - aware(c.updated_at or c.created_at)
        if age >= timedelta(days=settings.PENDING_EXPIRE_DAYS):
            c.status = CaseStatus.CANCELED
            record(db, "case.expire", actor_id=None, target_type="case", target_id=c.id, reason=f"결제 대기 {settings.PENDING_EXPIRE_DAYS}일 경과")
            expired += 1
        elif age >= timedelta(hours=settings.PENDING_REMIND_HOURS) and c.reminded_at is None:
            c.reminded_at = t
            db.commit()
            notify(db, db.get(User, c.user_id), "reminder", c)
            reminded += 1
    db.commit()
    return {"reminded": reminded, "expired": expired}


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list-users")
    sub.add_parser("reconcile-payments")
    sub.add_parser("housekeeping")
    rm = sub.add_parser("reset-mfa")
    rm.add_argument("--user-id", type=int, required=True)
    rm.add_argument("--reason", required=True)
    for name in ("grant", "revoke"):
        p = sub.add_parser(name)
        p.add_argument("--user-id", type=int, required=True)
        p.add_argument("--admin", action="store_true")
        p.add_argument("--lawyer", action="store_true")
        p.add_argument("--reason", required=True)
    args = ap.parse_args()

    with SessionLocal() as db:
        if args.cmd == "reconcile-payments":
            print(reconcile_payments(db))
            return
        if args.cmd == "housekeeping":
            print(housekeeping(db))
            return
        if args.cmd == "reset-mfa":
            u = db.get(User, args.user_id)
            if u is None:
                raise SystemExit("회원을 찾을 수 없습니다.")
            u.totp_secret, u.totp_enabled_at = None, None
            u.token_version += 1  # 기존 2단계 인증 쿠키·세션도 끊는다
            record(db, "mfa.reset", actor_id=None, target_type="user", target_id=u.id, reason=f"[서버 명령어] {args.reason}")
            db.commit()
            print(f"완료: {u.name} 2단계 인증 초기화")
            return
        if args.cmd == "list-users":
            for u in db.scalars(select(User).order_by(User.id)):
                roles = ",".join(r for r, on in (("admin", u.is_admin), ("lawyer", u.is_lawyer)) if on) or "-"
                print(f"{u.id:>5}  {u.social_provider:<6} {u.name or '(가입 미완료)':<12} {u.status:<9} {roles}")
            return
        u = db.get(User, args.user_id)
        if u is None:
            raise SystemExit("회원을 찾을 수 없습니다.")
        if not (args.admin or args.lawyer):
            raise SystemExit("--admin 또는 --lawyer 중 하나 이상을 지정하세요.")
        if args.cmd == "grant" and not u.is_onboarded:
            raise SystemExit("가입을 마친(실명 확인된) 회원에게만 권한을 줄 수 있습니다.")
        value = args.cmd == "grant"
        before = {"is_admin": u.is_admin, "is_lawyer": u.is_lawyer}
        if args.admin:
            u.is_admin = value
        if args.lawyer:
            u.is_lawyer = value
        record(db, "user.roles", actor_id=None, target_type="user", target_id=u.id, reason=f"[서버 명령어] {args.reason}",
               detail={"before": before, "after": {"is_admin": u.is_admin, "is_lawyer": u.is_lawyer}})
        db.commit()
        print(f"완료: {u.name} admin={u.is_admin} lawyer={u.is_lawyer}")


if __name__ == "__main__":
    main()
