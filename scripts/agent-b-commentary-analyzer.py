"""
Agent B — Commentary Quality Analyzer
Calls all commentary routes. Measures word counts, structure, specificity.
Compares against benchmark structure metrics only (no text comparison).
"""
import requests
import json
import sys
import datetime
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, "benchmark.json")) as f:
    bm = json.load(f)

BASE = "http://localhost:3000"
EPH = "http://localhost:8001"
LAGNA, MD, AD = "Cancer", "Rahu", "Mercury"
GEO = {
    "current_lat": 25.2048,
    "current_lng": 55.2708,
    "timezone_offset_minutes": 240,
    "natal_lagna_sign_index": 3,
}
DATES = [
    "2026-03-09", "2026-03-10", "2026-03-11",
    "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15",
]

results = {
    "daily_overviews": [],
    "hourly": [],
    "monthly": [],
    "issues": [],
}

print("=== AGENT B: COMMENTARY QUALITY ANALYZER ===")

print("\n-- Daily Overviews --")
days_p = []
for dt in DATES:
    try:
        r = requests.post(
            f"{EPH}/generate-daily-grid",
            json={"date": dt, **GEO},
            timeout=600,
        ).json()
        days_p.append({
            "date": dt,
            "panchang": r.get("panchang", {}),
            "day_score": r.get("day_score", 55),
            "rahu_kaal": r.get("rahu_kaal", {}),
            "peak_slots": [
                s for s in r.get("slots", []) if s.get("score", 0) >= 75
            ][:3],
        })
    except Exception:
        pass

try:
    r = requests.post(
        f"{BASE}/api/commentary/daily-overviews",
        json={
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "days": days_p,
        },
        timeout=600,
    )
    r.raise_for_status()
    days_out = r.json().get("days", [])

    target_min = bm["target_overview_words"]["min"]
    target_max = bm["target_overview_words"]["max"]

    for d in days_out:
        ov = d.get("day_overview", "")
        wc = len(ov.split())
        has_strategy = "STRATEGY" in ov
        has_caps = any(
            w.isupper() and len(w) > 4 for w in ov.split()[:40]
        )
        has_houses = any(
            "H%d" % n in ov or "%dth house" % n in ov
            for n in range(1, 13)
        )
        has_nakshatra = any(
            x in ov for x in ["nakshatra", "Nakshatra", "Pada"]
        )
        no_generic = not any(
            p in ov
            for p in [
                "generally",
                "may bring",
                "could be",
                "might",
                "perhaps",
                "tends to",
            ]
        )

        score = sum([
            wc >= target_min,
            has_strategy,
            has_caps,
            has_houses,
            has_nakshatra,
            no_generic,
        ])

        status = "OK" if score >= 5 else "FAIL"
        results["daily_overviews"].append({
            "date": d.get("date", ""),
            "word_count": wc,
            "has_strategy": has_strategy,
            "has_caps_headline": has_caps,
            "has_houses": has_houses,
            "has_nakshatra": has_nakshatra,
            "no_generic_phrases": no_generic,
            "quality_score": "%d/6" % score,
            "status": status,
        })
        print(
            "  %s %dw strategy=%s caps=%s houses=%s quality=%d/6 [%s]"
            % (d.get("date", ""), wc, has_strategy, has_caps, has_houses, score, status)
        )

        if status == "FAIL":
            results["issues"].append(
                "daily-overview %s quality=%d/6 wc=%d" % (d.get("date", ""), score, wc)
            )
except Exception as e:
    print("  daily-overviews ERROR: %s" % e)
    results["issues"].append("daily-overviews FAILED: %s" % e)

print("\n-- Hourly Commentary (1 day sample) --")
try:
    r2 = requests.post(
        f"{EPH}/generate-daily-grid",
        json={"date": DATES[1], **GEO},
        timeout=15,
    ).json()
    all_slots = r2.get("slots", [])

    r = requests.post(
        f"{BASE}/api/commentary/hourly-day",
        json={
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "dayIndex": 0,
            "date": DATES[1],
            "slots": [
                {
                    "slot_index": s["slot_index"],
                    "display_label": s["display_label"],
                    "dominant_hora": s["dominant_hora"],
                    "dominant_choghadiya": s["dominant_choghadiya"],
                    "transit_lagna": s.get("transit_lagna", ""),
                    "transit_lagna_house": s.get("transit_lagna_house", 1),
                    "is_rahu_kaal": s.get("is_rahu_kaal", False),
                    "score": s["score"],
                }
                for s in all_slots
            ],
        },
        timeout=600,
    )
    r.raise_for_status()
    slots_out = r.json().get("slots", [])

    target_slot_min = bm["target_slot_words"]["min"]
    slot_issues = 0
    for s in slots_out:
        c = s.get("commentary", "")
        wc = len(c.split())
        has_houses = any(
            "H%d" % n in c or "%dth house" % n in c for n in range(1, 13)
        )
        no_generic = not any(
            p in c for p in ["generally", "may", "could", "might"]
        )

        ok = wc >= target_slot_min and has_houses and no_generic
        if not ok:
            slot_issues += 1

        results["hourly"].append({
            "slot": s.get("slot_index", 0),
            "wc": wc,
            "has_houses": has_houses,
            "no_generic": no_generic,
            "ok": ok,
        })

    slots_ok = len(slots_out) - slot_issues
    print("  %d/%d slots meet quality bar" % (slots_ok, len(slots_out)))
    if slot_issues > 0:
        results["issues"].append(
            "hourly: %d/%d slots below quality bar" % (slot_issues, len(slots_out))
        )
except Exception as e:
    print("  hourly ERROR: %s" % e)
    results["issues"].append("hourly FAILED: %s" % e)

print("\n-- Monthly Commentary --")
try:
    months6 = [
        {
            "month_label": (
                datetime.date(2026, 3, 1) + datetime.timedelta(days=i * 31)
            ).strftime("%B %Y"),
            "month_index": i,
            "key_transits_hint": "",
        }
        for i in range(6)
    ]
    r = requests.post(
        f"{BASE}/api/commentary/months-first",
        json={
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "startMonth": "2026-03",
            "months": months6,
        },
        timeout=600,
    )
    r.raise_for_status()
    months_out = r.json().get("months", [])
    scores = [m.get("overall_score", 65) for m in months_out]
    spread = max(scores) - min(scores) if scores else 0

    print("  Scores: %s spread=%d" % (scores, spread))

    for m in months_out:
        a = m.get("analysis", "")
        wc = len(a.split())
        has_h = any(
            "H%d" % n in a or "%dth house" % n in a for n in range(1, 13)
        )
        has_planet = any(
            p in a
            for p in [
                "Jupiter",
                "Saturn",
                "Mars",
                "Venus",
                "Mercury",
                "Moon",
                "Rahu",
                "Ketu",
            ]
        )
        results["monthly"].append({
            "month": m.get("month_label", ""),
            "score": m.get("overall_score"),
            "wc": wc,
            "has_houses": has_h,
            "has_planets": has_planet,
        })
        print(
            "  %s score=%s wc=%d"
            % (m.get("month_label", ""), m.get("overall_score"), wc)
        )

    if spread < 15:
        results["issues"].append(
            "monthly score spread too low: %d (need 15+)" % spread
        )
except Exception as e:
    print("  monthly ERROR: %s" % e)
    results["issues"].append("monthly FAILED: %s" % e)

total_issues = len(results["issues"])
daily_ok = sum(1 for d in results["daily_overviews"] if d["status"] == "OK")
results["summary"] = {
    "daily_overviews_ok": "%d/%d" % (daily_ok, len(results["daily_overviews"])),
    "total_issues": total_issues,
    "pass": total_issues == 0,
}

with open(os.path.join(script_dir, "agent-b-results.json"), "w") as f:
    json.dump(results, f, indent=2)

print("\n=== SUMMARY: %d issues found ===" % total_issues)
for issue in results["issues"]:
    print("  ISSUE: %s" % issue)
sys.exit(0 if results["summary"]["pass"] else 1)
