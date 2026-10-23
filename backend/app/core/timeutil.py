from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")

# 관공서 공휴일(대체공휴일·임시공휴일 포함). 매년 관보·한국천문연구원 월력요항으로 확인해 갱신할 것.
# 2027년은 월력요항 발표 전 추정치라 표시해 둔다.
KR_HOLIDAYS: set[date] = {
    # 2026
    date(2026, 1, 1), date(2026, 2, 16), date(2026, 2, 17), date(2026, 2, 18), date(2026, 3, 2),  # 3·1절 대체
    date(2026, 5, 5), date(2026, 5, 25),  # 부처님오신날(5/24 일) 대체
    date(2026, 6, 3),  # 전국동시지방선거
    date(2026, 8, 17),  # 광복절(8/15 토) 대체
    date(2026, 9, 24), date(2026, 9, 25), date(2026, 9, 26), date(2026, 10, 5),  # 개천절(10/3 토) 대체
    date(2026, 10, 9), date(2026, 12, 25),
    # 2027 (추정 — 확인 필요)
    date(2027, 1, 1), date(2027, 2, 8), date(2027, 2, 9), date(2027, 3, 1), date(2027, 5, 5), date(2027, 5, 13),
    date(2027, 8, 16), date(2027, 9, 14), date(2027, 9, 15), date(2027, 9, 16), date(2027, 10, 4), date(2027, 10, 11),
    date(2027, 12, 27),
}


def now() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime) -> datetime:
    """DB 에서 읽은 시각을 UTC 로 맞춘다(PostgreSQL 은 tz 포함, SQLite 테스트는 tz 없이 돌려준다)."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def kst_day_start(days_ago: int = 0) -> datetime:
    """한국 시각 기준 오늘(또는 n일 전) 0시를 UTC 로. 대시보드 "오늘"은 한국 날짜여야 한다."""
    d = datetime.now(KST).date() - timedelta(days=days_ago)
    return datetime.combine(d, time.min, tzinfo=KST).astimezone(timezone.utc)


def is_business_day(d: date) -> bool:
    return d.weekday() < 5 and d not in KR_HOLIDAYS


def add_business_days(start: datetime, days: int) -> datetime:
    """주말·공휴일을 건너뛴 영업일 더하기(날짜 판단은 한국 시각 기준)."""
    d = aware(start)
    added = 0
    while added < days:
        d += timedelta(days=1)
        if is_business_day(d.astimezone(KST).date()):
            added += 1
    return d


def business_days_between(a: datetime, b: datetime) -> int:
    da, db_ = aware(a).astimezone(KST).date(), aware(b).astimezone(KST).date()
    n, d = 0, da
    while d < db_:
        d += timedelta(days=1)
        if is_business_day(d):
            n += 1
    return n
