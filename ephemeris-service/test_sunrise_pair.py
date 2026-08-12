"""Regression: legacy /hora-schedule path must use same-day sunrise→sunset pairs."""
from datetime import datetime

import swisseph as swe

import main as ephemeris


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
    test_dubai_hora_schedule_times_advance()
    print("all sunrise/hora regressions OK")
