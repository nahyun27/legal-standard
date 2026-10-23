from datetime import datetime, timedelta, timezone


def now() -> datetime:
    return datetime.now(timezone.utc)


def add_business_days(start: datetime, days: int) -> datetime:
    """주말을 건너뛴 영업일 더하기. TODO: 공휴일 달력 반영."""
    d = start
    added = 0
    while added < days:
        d += timedelta(days=1)
        if d.weekday() < 5:
            added += 1
    return d


def aware(dt: datetime) -> datetime:
    """DB 에서 읽은 시각을 UTC 로 맞춘다(PostgreSQL 은 tz 포함, SQLite 테스트는 tz 없이 돌려준다)."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
