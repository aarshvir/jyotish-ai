#!/usr/bin/env python3
"""Regression tests for special-event calendar tagging (Jupiter Rx window + Mercury station)."""

from main import get_special_events_for_date, SPECIAL_EVENT_MOD, compute_dq


def test_jupiter_rx_not_open_ended():
    assert "jupiter_retrograde" not in get_special_events_for_date("2026-10-09")
    assert "jupiter_retrograde" not in get_special_events_for_date("2026-12-12")
    assert "jupiter_retrograde" in get_special_events_for_date("2026-12-13")
    assert "jupiter_retrograde" in get_special_events_for_date("2027-04-13")
    assert "jupiter_retrograde" not in get_special_events_for_date("2027-04-14")
    assert "jupiter_retrograde" not in get_special_events_for_date("2028-01-01")


def test_mercury_station_direct_not_also_rx():
    for d in ("2026-03-20", "2026-07-12", "2026-11-03"):
        events = get_special_events_for_date(d)
        assert "mercury_direct" in events
        assert "mercury_retrograde" not in events


def test_mercury_mid_period_still_rx():
    events = get_special_events_for_date("2026-03-01")
    assert "mercury_retrograde" in events
    assert "mercury_direct" not in events


def test_jupiter_rx_mod_applied_only_inside_window():
    # Minimal compute_dq call — only special-event contribution differs.
    inside = compute_dq("Siddhi", "Rohini", "Shukla Pratipada", 1, "Thursday",
                        special_events=get_special_events_for_date("2026-12-13"))
    outside = compute_dq("Siddhi", "Rohini", "Shukla Pratipada", 1, "Thursday",
                         special_events=get_special_events_for_date("2027-04-14"))
    assert inside == outside + SPECIAL_EVENT_MOD["jupiter_retrograde"]


if __name__ == "__main__":
    test_jupiter_rx_not_open_ended()
    test_mercury_station_direct_not_also_rx()
    test_mercury_mid_period_still_rx()
    test_jupiter_rx_mod_applied_only_inside_window()
    print("OK: special-events calendar regressions passed")
