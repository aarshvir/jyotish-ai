#!/usr/bin/env python3
"""
Regression: paid hourly grids must use DST-aware civil midnight.

Onboard persists year-round city constants (New York=-300 EST, London=0 GMT).
Before the fix, generate_daily_grid trusted that offset over ZoneInfo, so during
DST every labeled slot (06:00–07:00 etc.) scored the adjacent hour's hora /
choghadiya / transit lagna — core paid timing product wrong for ~half the year
in US/UK (and other DST) markets.
"""

from main import DailyGridInput, generate_daily_grid, _dst_aware_offset_minutes
from zoneinfo import ZoneInfo
from datetime import datetime


def _slot_fingerprint(slot: dict) -> tuple:
    return (
        slot["start_iso"],
        slot["dominant_hora"],
        slot["dominant_choghadiya"],
        slot["score"],
        slot["is_rahu_kaal"],
        slot["transit_lagna_house"],
    )


def test_dst_aware_offset_helper_new_york():
    tz = ZoneInfo("America/New_York")
    winter = _dst_aware_offset_minutes(tz, datetime(2026, 1, 15), fallback=-999)
    summer = _dst_aware_offset_minutes(tz, datetime(2026, 7, 15), fallback=-999)
    assert winter == -300, winter
    assert summer == -240, summer


def test_dst_aware_offset_helper_london():
    tz = ZoneInfo("Europe/London")
    winter = _dst_aware_offset_minutes(tz, datetime(2026, 1, 15), fallback=-999)
    summer = _dst_aware_offset_minutes(tz, datetime(2026, 7, 15), fallback=-999)
    assert winter == 0, winter
    assert summer == 60, summer


def test_new_york_july_ignores_est_client_offset():
    """Concrete trigger: NY seeker in July with onboard's fixed -300 (EST)."""
    base = dict(
        date="2026-07-15",
        current_lat=40.7128,
        current_lng=-74.006,
        natal_lagna_sign_index=3,  # Cancer
    )
    # Wrong year-round EST constant from onboard knownTz map
    with_bad_client = generate_daily_grid(
        DailyGridInput(**base, timezone_offset_minutes=-300)
    )
    # Explicit EDT (what IANA should force)
    with_edt = generate_daily_grid(
        DailyGridInput(**base, timezone_offset_minutes=-240)
    )
    # Omit client offset — pure inference
    inferred = generate_daily_grid(DailyGridInput(**base, timezone_offset_minutes=None))

    bad_slots = with_bad_client["slots"]
    edt_slots = with_edt["slots"]
    inf_slots = inferred["slots"]

    assert len(bad_slots) == 18
    # Client EST must NOT win — grids must match true EDT
    mismatches_vs_edt = sum(
        1 for a, b in zip(bad_slots, edt_slots) if _slot_fingerprint(a) != _slot_fingerprint(b)
    )
    mismatches_vs_inf = sum(
        1 for a, b in zip(bad_slots, inf_slots) if _slot_fingerprint(a) != _slot_fingerprint(b)
    )
    assert mismatches_vs_edt == 0, f"EST client still shifted {mismatches_vs_edt}/18 slots"
    assert mismatches_vs_inf == 0, f"inferred mismatch {mismatches_vs_inf}/18"

    # EDT civil 06:00 = 10:00Z in July (UTC-4), not 11:00Z (UTC-5)
    assert bad_slots[0]["start_iso"] == "2026-07-15T10:00:00Z"
    assert bad_slots[0]["display_label"] == "06:00–07:00"


def test_london_july_ignores_gmt_client_offset():
    base = dict(
        date="2026-07-15",
        current_lat=51.5074,
        current_lng=-0.1278,
        natal_lagna_sign_index=0,
    )
    with_bad_client = generate_daily_grid(
        DailyGridInput(**base, timezone_offset_minutes=0)  # onboard GMT constant
    )
    inferred = generate_daily_grid(DailyGridInput(**base, timezone_offset_minutes=None))

    assert with_bad_client["slots"][0]["start_iso"] == inferred["slots"][0]["start_iso"]
    # BST civil 06:00 = 05:00Z (UTC+1)
    assert with_bad_client["slots"][0]["start_iso"] == "2026-07-15T05:00:00Z"


def test_dubai_non_dst_unchanged():
    """Non-DST cities must keep matching the classic +240 constant."""
    base = dict(
        date="2026-07-15",
        current_lat=25.2048,
        current_lng=55.2708,
        natal_lagna_sign_index=3,
    )
    with_client = generate_daily_grid(
        DailyGridInput(**base, timezone_offset_minutes=240)
    )
    inferred = generate_daily_grid(DailyGridInput(**base, timezone_offset_minutes=None))
    assert with_client["slots"][0]["start_iso"] == "2026-07-15T02:00:00Z"
    assert with_client["slots"][0]["start_iso"] == inferred["slots"][0]["start_iso"]


if __name__ == "__main__":
    test_dst_aware_offset_helper_new_york()
    test_dst_aware_offset_helper_london()
    test_new_york_july_ignores_est_client_offset()
    test_london_july_ignores_gmt_client_offset()
    test_dubai_non_dst_unchanged()
    print("OK — all DST grid offset regressions passed")
