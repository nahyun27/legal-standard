"""서버 명령어. 첫 관리자는 화면에서 만들 수 없게 하고(권한 상승 경로 차단) 여기서만 지정한다.

  venv/bin/python -m app.cli list-users
  venv/bin/python -m app.cli grant --user-id 3 --admin --lawyer --reason "초기 관리자 지정"
  venv/bin/python -m app.cli revoke --user-id 3 --admin --reason "퇴사"
"""

import argparse

from sqlalchemy import select

from app.core.audit import record
from app.core.database import SessionLocal
from app.models.user import User


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list-users")
    for name in ("grant", "revoke"):
        p = sub.add_parser(name)
        p.add_argument("--user-id", type=int, required=True)
        p.add_argument("--admin", action="store_true")
        p.add_argument("--lawyer", action="store_true")
        p.add_argument("--reason", required=True)
    args = ap.parse_args()

    with SessionLocal() as db:
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
