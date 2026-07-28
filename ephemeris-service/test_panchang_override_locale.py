"""
Regression: Dubai DrikPanchang overrides must NOT apply to other cities.

On 2026-03-23 Swiss Ephemeris at Los Angeles sunrise yields Bharani /
Shukla Chaturthi. The Dubai override table forces Krittika / Shukla Panchami
(+ moon_house 12). Before the locale gate, LA (and every other city) inherited
Dubai's civil-day values and corrupted day_score / hourly guidance.
"""

from main import (
    DailyGridInput,
    generate_daily_grid,
    _is_dubai_panchang_locale,
    _panchang_override_for,
    PANCHANG_OVERRIDES,
)


def test_locale_gate_helpers():
    assert _is_dubai_panchang_locale(25.2048, 55.2708) is True
    assert _is_dubai_panchang_locale(25.3, 55.4) is True  # Sharjah-ish
    assert _is_dubai_panchang_locale(34.0522, -118.2437) is False  # LA
    assert _is_dubai_panchang_locale(28.6139, 77.2090) is False  # Delhi
    assert _panchang_override_for("2026-03-23", 34.0522, -118.2437) == {}
    assert _panchang_override_for("2026-03-23", 25.2048, 55.2708) == PANCHANG_OVERRIDES["2026-03-23"]


def test_la_keeps_swiss_panchang_on_override_date():
    out = generate_daily_grid(
        DailyGridInput(
            date="2026-03-23",
            current_lat=34.0522,
            current_lng=-118.2437,
            timezone_offset_minutes=-480,
            natal_lagna_sign_index=3,
        )
    )
    p = out["panchang"]
    # Swiss at LA sunrise — must NOT be Dubai's Krittika / Panchami override.
    assert p["nakshatra"] == "Bharani", p
    assert p["tithi"] == "Shukla Chaturthi", p


def test_dubai_still_receives_override():
    out = generate_daily_grid(
        DailyGridInput(
            date="2026-03-23",
            current_lat=25.2048,
            current_lng=55.2708,
            timezone_offset_minutes=240,
            natal_lagna_sign_index=3,
        )
    )
    p = out["panchang"]
    assert p["nakshatra"] == "Krittika", p
    assert p["tithi"] == "Shukla Panchami", p


if __name__ == "__main__":
    test_locale_gate_helpers()
    test_la_keeps_swiss_panchang_on_override_date()
    test_dubai_still_receives_override()
    print("ok")
