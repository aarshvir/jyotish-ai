"""Regression: sunrise/sunset must be the requested civil day, and a real pair."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import swisseph as swe

import main as ephemeris


def _utc_from_jd(jd: float) -> datetime:
    year, month, day, hours = swe.revjul(jd)
    return datetime(int(year), int(month), int(day), tzinfo=ZoneInfo("UTC")) + timedelta(hours=hours)


def _day_length_hours(lat: float, lng: float, date: datetime) -> float:
    jd = ephemeris.get_julian_day(date)
    sr, ss = ephemeris.get_sunrise_sunset(jd, lat, lng)
    return (ss - sr) * 24.0


def test_dubai_mumbai_delhi_day_length_positive():
    # Previously inverted for essentially every sample day east of the Americas.
    cities = [
        ("Dubai", 25.2048, 55.2708),
        ("Mumbai", 19.076, 72.8777),
        ("Delhi", 28.6139, 77.209),
        ("London", 51.5074, -0.1278),
        ("New York", 40.7128, -74.006),
    ]
    for name, lat, lng in cities:
        for month in (1, 3, 6, 7, 10, 12):
            dur = _day_length_hours(lat, lng, datetime(2026, month, 15))
            assert dur > 0, f"{name} 2026-{month:02d}-15 inverted day length {dur:.2f}h"
            assert 6.0 < dur < 18.5, f"{name} 2026-{month:02d}-15 implausible day length {dur:.2f}h"


def test_monday_first_hora_is_moon_not_venus():
    """Chaldean order: Monday's first daytime hora is Moon (not Venus)."""
    day_ruler_idx = 1  # Monday in DAY_RULERS / (weekday+1)%7
    hora_base = ephemeris.HORA_RULERS.index(ephemeris.DAY_RULERS[day_ruler_idx])
    assert ephemeris.HORA_RULERS[hora_base] == "Moon"
    # Buggy legacy used day_ruler_idx as a HORA_RULERS subscript → Venus.
    assert ephemeris.HORA_RULERS[day_ruler_idx] == "Venus"


def test_sunrise_is_the_requested_civil_day():
    """jd-0.5 search returned the previous local morning in the western Americas.

    A positive day length is not enough: yesterday is also about twelve hours.
    The paid grid then scores today against yesterday's spans.
    """
    cities = [
        ("Los Angeles", 34.0522, -118.2437, "America/Los_Angeles"),
        ("Denver", 39.7392, -104.9903, "America/Denver"),
        ("Phoenix", 33.4484, -112.0740, "America/Phoenix"),
        ("Chicago", 41.8781, -87.6298, "America/Chicago"),
        ("Honolulu", 21.3069, -157.8583, "Pacific/Honolulu"),
        ("New York", 40.7128, -74.0060, "America/New_York"),
        ("Dubai", 25.2048, 55.2708, "Asia/Dubai"),
        ("Delhi", 28.6139, 77.2090, "Asia/Kolkata"),
    ]
    for name, lat, lng, tz in cities:
        for month in (1, 6, 10):
            date = datetime(2026, month, 15)
            jd = ephemeris.get_julian_day(date)
            sunrise_jd, sunset_jd = ephemeris.get_sunrise_sunset(jd, lat, lng)
            sunrise_local = _utc_from_jd(sunrise_jd).astimezone(ZoneInfo(tz))
            sunset_local = _utc_from_jd(sunset_jd).astimezone(ZoneInfo(tz))
            assert sunrise_local.date() == date.date(), (
                f"{name} 2026-{month:02d}-15 sunrise landed on {sunrise_local.date()}"
            )
            assert sunset_local.date() == date.date(), (
                f"{name} 2026-{month:02d}-15 sunset landed on {sunset_local.date()}"
            )
            assert sunset_jd > sunrise_jd


def test_los_angeles_day_does_not_collapse_to_one_hora():
    """Yesterday's spans miss today's slots, so _pick_dominant kept span[0] all day."""
    grid = ephemeris.generate_daily_grid(
        ephemeris.DailyGridInput(
            date="2026-10-04",
            current_lat=34.0522,
            current_lng=-118.2437,
            natal_lagna_sign_index=0,
            timezone_offset_minutes=-420,
        )
    )
    horas = {slot["dominant_hora"] for slot in grid["slots"]}
    chogs = {slot["dominant_choghadiya"] for slot in grid["slots"]}
    assert len(grid["slots"]) == 18
    assert len(horas) > 1, f"every LA hour inherited {horas}"
    assert len(chogs) > 1, f"every LA hour inherited {chogs}"


def test_dubai_hora_schedule_times_advance():
    """After sunrise-pair fix, each day hora end is after its start (Dubai)."""
    from datetime import datetime as dt

    date = dt(2026, 7, 13)  # Monday
    jd = ephemeris.get_julian_day(date)
    sunrise_jd, sunset_jd = ephemeris.get_sunrise_sunset(jd, 25.2048, 55.2708)
    assert sunset_jd > sunrise_jd
    day_duration = (sunset_jd - sunrise_jd) * 24
    hora_duration = day_duration / 12
    assert hora_duration > 0
    # First hora window must advance forward in UT.
    start0 = sunrise_jd
    end0 = sunrise_jd + (hora_duration / 24)
    assert end0 > start0
    start_s = ephemeris.jd_to_time_string(start0, 4)
    end_s = ephemeris.jd_to_time_string(end0, 4)
    assert start_s != end_s


if __name__ == "__main__":
    import swisseph as swe
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    test_dubai_mumbai_delhi_day_length_positive()
    test_monday_first_hora_is_moon_not_venus()
    test_sunrise_is_the_requested_civil_day()
    test_los_angeles_day_does_not_collapse_to_one_hora()
    test_dubai_hora_schedule_times_advance()
    print("all sunrise/hora regressions OK")
