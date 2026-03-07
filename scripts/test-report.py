"""
Automated Jyotish AI report quality tester.
Run: python scripts/test-report.py
Requires: ephemeris on :8001, Next.js on :3000
"""
import requests, json, sys, time

BASE = "http://localhost:3000"
EPH  = "http://localhost:8001"

BIRTH = {
    "date": "1991-01-05",
    "time": "19:45",
    "lat": 26.8467,
    "lng": 80.9462,
    "tz": 330,
    "lagna_sign_index": 3  # Cancer
}
CURRENT = {"lat": 25.2048, "lng": 55.2708, "tz": 240}
TODAY = "2026-03-08"
LAGNA = "Cancer"
MD, AD = "Rahu", "Mercury"

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []

def check(label, condition, got=""):
    sym = PASS if condition else FAIL
    results.append((sym, label, str(got)[:120]))
    print(f"{sym} {label}" + (f" -> {str(got)[:80]}" if got else ""))

def fail(label, err):
    results.append((FAIL, label, str(err)[:120]))
    print(f"{FAIL} {label} -> ERROR: {str(err)[:80]}")

# ── TEST 1: Ephemeris service ──────────────────────
print("\n--- TEST 1: Ephemeris service ---")
try:
    r = requests.post(f"{EPH}/generate-daily-grid", json={
        "date": TODAY,
        "current_lat": CURRENT["lat"],
        "current_lng": CURRENT["lng"],
        "timezone_offset_minutes": CURRENT["tz"],
        "natal_lagna_sign_index": BIRTH["lagna_sign_index"]
    }, timeout=10)
    r.raise_for_status()
    d = r.json()
    slots = d.get("slots", [])
    day_score = d.get("day_score", 0)
    check("Ephemeris returns 18 slots", len(slots) == 18, len(slots))
    check("day_score is set", day_score > 0, day_score)
    check("Slot 0 has display_label",
          slots[0].get("display_label","").startswith("06:00"),
          slots[0].get("display_label",""))
    scores = [s["score"] for s in slots]
    spread = max(scores) - min(scores)
    check("Slot score spread >= 30", spread >= 30,
          f"min={min(scores)} max={max(scores)} spread={spread}")
    check("At least one slot >= 75", max(scores) >= 75, max(scores))
    check("At least one slot <= 45", min(scores) <= 45, min(scores))
    yoga = d.get("yoga", "")
    moon_house = d.get("moon_house", 0)
    check("yoga is non-empty", bool(yoga), yoga)
    check("moon_house is 1-12", 1 <= moon_house <= 12, moon_house)
except Exception as e:
    fail("Ephemeris service reachable", e)
    print("FATAL: Cannot continue without ephemeris. Exiting.")
    sys.exit(1)

# ── TEST 2: Score variance across 7 days ──────────
print("\n--- TEST 2: Score variance (7 days) ---")
day_scores = []
dates = ["2026-03-08","2026-03-09","2026-03-10","2026-03-11",
         "2026-03-12","2026-03-13","2026-03-14"]
for dt in dates:
    try:
        r = requests.post(f"{EPH}/generate-daily-grid", json={
            "date": dt,
            "current_lat": CURRENT["lat"],
            "current_lng": CURRENT["lng"],
            "timezone_offset_minutes": CURRENT["tz"],
            "natal_lagna_sign_index": BIRTH["lagna_sign_index"]
        }, timeout=10)
        ds = r.json().get("day_score", 55)
        day_scores.append(ds)
        print(f"   {dt}: {ds}/100")
    except Exception as e:
        day_scores.append(55)
        print(f"   {dt}: ERROR {e}")

spread7 = max(day_scores) - min(day_scores)
check("7-day score spread >= 20", spread7 >= 20,
      f"scores={day_scores} spread={spread7}")
check("At least 1 day below 50", min(day_scores) < 50, min(day_scores))
check("At least 1 day above 65", max(day_scores) > 65, max(day_scores))

# ── TEST 3: Daily overviews ────────────────────────
print("\n--- TEST 3: Daily overviews commentary ---")
try:
    # Build minimal day objects for the API
    days_payload = []
    for i, dt in enumerate(dates[:3]):  # test 3 days only
        r2 = requests.post(f"{EPH}/generate-daily-grid", json={
            "date": dt, "current_lat": CURRENT["lat"],
            "current_lng": CURRENT["lng"],
            "timezone_offset_minutes": CURRENT["tz"],
            "natal_lagna_sign_index": BIRTH["lagna_sign_index"]
        }, timeout=10).json()
        days_payload.append({
            "date": dt,
            "panchang": r2.get("panchang", {}),
            "day_score": r2.get("day_score", 55),
            "rahu_kaal": r2.get("rahu_kaal", {}),
            "peak_slots": [s for s in r2.get("slots",[])
                          if s.get("score",0) >= 75][:3]
        })

    r = requests.post(f"{BASE}/api/commentary/daily-overviews", json={
        "lagnaSign": LAGNA,
        "mahadasha": MD,
        "antardasha": AD,
        "days": days_payload
    }, timeout=120)
    r.raise_for_status()
    data = r.json()
    days_out = data.get("days", [])
    check("daily-overviews returns 3 days", len(days_out) == 3, len(days_out))
    if days_out:
        d0 = days_out[0]
        ov = d0.get("day_overview","")
        words = len(ov.split())
        check("day_overview >= 200 words", words >= 200, f"{words} words")
        check("day_overview has STRATEGY:", "STRATEGY" in ov, ov[:100])
        check("day_overview has ALL-CAPS headline",
              any(line.isupper() and len(line.split()) >= 4
                  for line in ov.split('\n')),
              ov[:80])
        check("day_theme is non-empty", len(d0.get("day_theme","")) > 10,
              d0.get("day_theme","")[:60])
        print(f"\n   Sample overview (first 300 chars):\n   {ov[:300]}\n")
except Exception as e:
    fail("daily-overviews route", e)

# ── TEST 4: Hourly commentary ──────────────────────
print("\n--- TEST 4: Hourly day commentary ---")
try:
    r_grid = requests.post(f"{EPH}/generate-daily-grid", json={
        "date": TODAY, "current_lat": CURRENT["lat"],
        "current_lng": CURRENT["lng"],
        "timezone_offset_minutes": CURRENT["tz"],
        "natal_lagna_sign_index": BIRTH["lagna_sign_index"]
    }, timeout=10).json()

    r = requests.post(f"{BASE}/api/commentary/hourly-day", json={
        "lagnaSign": LAGNA,
        "mahadasha": MD,
        "antardasha": AD,
        "dayIndex": 0,
        "date": TODAY,
        "slots": [{
            "slot_index": s["slot_index"],
            "display_label": s["display_label"],
            "dominant_hora": s["dominant_hora"],
            "dominant_choghadiya": s["dominant_choghadiya"],
            "transit_lagna": s["transit_lagna"],
            "transit_lagna_house": s["transit_lagna_house"],
            "is_rahu_kaal": s["is_rahu_kaal"],
            "score": s["score"]
        } for s in r_grid.get("slots", [])]
    }, timeout=120)
    r.raise_for_status()
    data = r.json()
    slots_out = data.get("slots", [])
    check("hourly-day returns 18 slots", len(slots_out) == 18, len(slots_out))
    if slots_out:
        s0 = slots_out[0]
        comm = s0.get("commentary","")
        words = len(comm.split())
        check("slot commentary >= 60 words", words >= 60, f"{words} words")
        check("commentary names house numbers",
              any(f"H{n}" in comm or f"{n}th house" in comm or
                  f"{n}rd house" in comm or f"{n}st house" in comm
                  for n in range(1,13)),
              comm[:100])
        check("commentary has no generic phrases",
              not any(p in comm for p in
                     ["generally","may bring","could be","might"]),
              comm[:100])
        print(f"\n   Sample slot 0 commentary:\n   {comm}\n")
    check("no truncation (partial=false)",
          not data.get("partial", False), data.get("partial"))
except Exception as e:
    fail("hourly-day route", e)

# ── TEST 5: Monthly commentary ─────────────────────
print("\n--- TEST 5: Monthly commentary ---")
try:
    import datetime
    start = datetime.date(2026, 3, 1)
    months6 = []
    for i in range(6):
        d = datetime.date(start.year + (start.month + i - 1) // 12,
                         (start.month + i - 1) % 12 + 1, 1)
        months6.append({
            "month_label": d.strftime("%B %Y"),
            "month_index": i,
            "key_transits_hint": ""
        })

    r = requests.post(f"{BASE}/api/commentary/months-first", json={
        "lagnaSign": LAGNA,
        "mahadasha": MD,
        "antardasha": AD,
        "startMonth": "2026-03",
        "months": months6
    }, timeout=120)
    r.raise_for_status()
    data = r.json()
    months_out = data.get("months", [])
    check("months-first returns 6 months", len(months_out) == 6, len(months_out))
    if months_out:
        scores = [m.get("overall_score", 65) for m in months_out]
        spread = max(scores) - min(scores)
        print(f"   Monthly scores: {scores}")
        check("Monthly score spread >= 15", spread >= 15,
              f"scores={scores} spread={spread}")
        check("Not all scores == 65",
              not all(s == 65 for s in scores), scores)
        m0 = months_out[0]
        analysis = m0.get("analysis","")
        words = len(analysis.split())
        check("Monthly analysis >= 120 words", words >= 120, f"{words} words")
        check("Analysis names house numbers",
              any(f"H{n}" in analysis or f"{n}th house" in analysis
                  for n in range(1,13)), analysis[:80])
except Exception as e:
    fail("months-first route", e)

# ── TEST 6: Synthesis ──────────────────────────────
print("\n--- TEST 6: Weeks + synthesis ---")
try:
    import datetime
    weeks = []
    for i in range(6):
        wstart = datetime.date(2026,3,8) + datetime.timedelta(weeks=i)
        weeks.append({
            "week_index": i,
            "week_label": f"Week {i+1}",
            "start_date": str(wstart),
            "end_date": str(wstart + datetime.timedelta(days=6)),
            "daily_scores": day_scores[i*7:(i+1)*7] if day_scores else [55,58,62,55,60,57,63]
        })

    r = requests.post(f"{BASE}/api/commentary/weeks-synthesis", json={
        "lagnaSign": LAGNA,
        "mahadasha": MD,
        "antardasha": AD,
        "reportStartDate": "2026-03-08",
        "weeks": weeks,
        "synthesis_context": {
            "total_days": 7,
            "best_date": "2026-03-10",
            "best_score": max(day_scores) if day_scores else 70,
            "worst_date": "2026-03-14",
            "worst_score": min(day_scores) if day_scores else 40,
            "avg_score": int(sum(day_scores)/len(day_scores)) if day_scores else 58
        }
    }, timeout=150)
    r.raise_for_status()
    data = r.json()
    weeks_out = data.get("weeks", [])
    synth = data.get("period_synthesis", {})
    check("weeks-synthesis returns 6 weeks", len(weeks_out) == 6, len(weeks_out))
    check("period_synthesis exists", bool(synth), type(synth))
    if synth:
        op = synth.get("opening_paragraph","")
        words = len(op.split())
        check("Synthesis opening >= 180 words", words >= 180, f"{words} words")
        check("Strategic windows present",
              len(synth.get("strategic_windows",[])) >= 2,
              len(synth.get("strategic_windows",[])))
        check("Domain priorities have content",
              len(synth.get("domain_priorities",{}).get("career","")) > 30,
              synth.get("domain_priorities",{}).get("career","")[:60])
        print(f"\n   Synthesis opening (first 200 chars):\n   {op[:200]}\n")
except Exception as e:
    fail("weeks-synthesis route", e)

# ── SUMMARY ───────────────────────────────────────
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
passed = sum(1 for r in results if r[0] == PASS)
total = len(results)
print(f"{PASS} {passed}/{total} checks passed")
print()
failed = [(l,g) for s,l,g in results if s == FAIL]
if failed:
    print("FAILED CHECKS:")
    for label, got in failed:
        print(f"  {FAIL} {label}: {got}")
else:
    print("ALL CHECKS PASSED - report quality is grandmaster level")

sys.exit(0 if passed == total else 1)
