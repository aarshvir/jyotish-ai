"""
Jyotish AI automated quality tester.
Run: python scripts/test-report.py
Requires: ephemeris on :8001, Next.js on :3000
"""
import requests, sys, datetime

BASE = "http://localhost:3000"
EPH  = "http://localhost:8001"
LAGNA = "Cancer"
MD, AD = "Rahu", "Mercury"
DATES = ["2026-03-08","2026-03-09","2026-03-10",
         "2026-03-11","2026-03-12","2026-03-13","2026-03-14"]
GEO = {"current_lat":25.2048,"current_lng":55.2708,
       "timezone_offset_minutes":240,"natal_lagna_sign_index":3}

results = []
def check(label, ok, got=""):
    sym = "[PASS]" if ok else "[FAIL]"
    results.append((ok, label, str(got)[:100]))
    print(f"{sym} {label}" + (f" -> {str(got)[:80]}" if got else ""))
def fail(label, err):
    results.append((False, label, str(err)[:100]))
    print(f"[FAIL] {label} -> ERROR: {str(err)[:80]}")

# TEST 1: Ephemeris + score variance
print("\n--- TEST 1: Ephemeris + Score Variance ---")
day_scores = []
all_slots = []
try:
    for dt in DATES:
        r = requests.post(f"{EPH}/generate-daily-grid",
            json={"date":dt,**GEO}, timeout=600)
        r.raise_for_status()
        d = r.json()
        day_scores.append(d.get("day_score",55))
        if dt == DATES[0]:
            all_slots = d.get("slots",[])
            check("18 slots returned", len(all_slots)==18, len(all_slots))
            check("yoga field present", bool(d.get("yoga","")), d.get("yoga",""))
            check("moon_house 1-12", 1<=d.get("moon_house",0)<=12, d.get("moon_house"))
            ss = [s["score"] for s in all_slots]
            sp = max(ss)-min(ss)
            check("Slot spread >= 40", sp>=40, f"min={min(ss)} max={max(ss)} spread={sp}")
            check("Has slot >= 75", max(ss)>=75, max(ss))
            check("Has slot <= 45", min(ss)<=45, min(ss))
    print(f"   7-day scores: {day_scores}")
    sp7 = max(day_scores)-min(day_scores)
    check("7-day spread >= 20", sp7>=20, f"spread={sp7}")
    check("Has day below 50", min(day_scores)<50, min(day_scores))
    check("Has day above 65", max(day_scores)>65, max(day_scores))
except Exception as e:
    fail("Ephemeris service", e)
    print("FATAL: Cannot continue. Exiting.")
    sys.exit(1)

# TEST 2: Daily overviews
print("\n--- TEST 2: Daily Overviews ---")
try:
    days_p = []
    for dt in DATES[:3]:
        r = requests.post(f"{EPH}/generate-daily-grid",
            json={"date":dt,**GEO}, timeout=600).json()
        days_p.append({"date":dt,"panchang":r.get("panchang",{}),
            "day_score":r.get("day_score",55),
            "rahu_kaal":r.get("rahu_kaal",{}),
            "peak_slots":[s for s in r.get("slots",[]) if s.get("score",0)>=75][:3]})
    r = requests.post(f"{BASE}/api/commentary/daily-overviews",
        json={"lagnaSign":LAGNA,"mahadasha":MD,"antardasha":AD,"days":days_p},
        timeout=600)
    r.raise_for_status()
    days_out = r.json().get("days",[])
    check("Returns 3 days", len(days_out)==3, len(days_out))
    if days_out:
        ov = days_out[0].get("day_overview","")
        wc = len(ov.split())
        check("Overview >= 200 words", wc>=200, f"{wc}w")
        check("Has STRATEGY section", "STRATEGY" in ov)
        caps = any(w.isupper() and len(w)>3 for w in ov.split()[:40])
        check("Has ALL-CAPS headline", caps, ov[:60])
        has_avoid = ("Avoid" in ov or "AVOID" in ov or "avoid" in ov or
                     "Do NOT" in ov or "Do not" in ov or "do not" in ov or "don't" in ov)
        check("Daily has avoid/AVOID directive", has_avoid)
        has_rahu = "Rahu" in ov or "rahu" in ov
        check("Daily mentions Rahu/directive", has_rahu)
        gen = any(p in ov for p in ["generally","may bring","could be","use hora wisely"])
        check("No generic phrases", not gen)
        print(f"   Sample: {ov[:200]}")
except Exception as e:
    fail("daily-overviews", e)

# TEST 3: Hourly commentary
print("\n--- TEST 3: Hourly Commentary ---")
try:
    r = requests.post(f"{BASE}/api/commentary/hourly-day",
        json={"lagnaSign":LAGNA,"mahadasha":MD,"antardasha":AD,
              "dayIndex":0,"date":DATES[0],
              "slots":[{"slot_index":s["slot_index"],
                  "display_label":s["display_label"],
                  "dominant_hora":s["dominant_hora"],
                  "dominant_choghadiya":s["dominant_choghadiya"],
                  "transit_lagna":s.get("transit_lagna",""),
                  "transit_lagna_house":s.get("transit_lagna_house",1),
                  "is_rahu_kaal":s.get("is_rahu_kaal",False),
                  "score":s["score"]} for s in all_slots]},
        timeout=600)
    r.raise_for_status()
    data = r.json()
    slots_out = data.get("slots",[])
    check("18 slots returned", len(slots_out)==18, len(slots_out))
    check("No truncation", not data.get("partial",False))
    if slots_out:
        c = slots_out[0].get("commentary","")
        wc = len(c.split())
        check("Commentary >= 60 words", wc>=60, f"{wc}w")
        has_h = any(f"H{n}" in c or f"{n}th house" in c or
                    f"{n}rd house" in c or f"{n}st house" in c or
                    f"{n}nd house" in c for n in range(1,13))
        check("Names specific houses", has_h, c[:100])
        no_gen = not any(p in c for p in ["generally","may","could","might","perhaps"])
        check("No generic language", no_gen)
        print(f"   Sample: {c[:200]}")
except Exception as e:
    fail("hourly-day", e)

# TEST 4: Monthly quality
print("\n--- TEST 4: Monthly Commentary ---")
try:
    months6 = [{"month_label":(datetime.date(2026,3,1)+
        datetime.timedelta(days=i*31)).strftime("%B %Y"),
        "month_index":i,"key_transits_hint":""} for i in range(6)]
    r = requests.post(f"{BASE}/api/commentary/months-first",
        json={"lagnaSign":LAGNA,"mahadasha":MD,"antardasha":AD,
              "startMonth":"2026-03","months":months6}, timeout=600)
    r.raise_for_status()
    months_out = r.json().get("months",[])
    check("Returns 6 months", len(months_out)==6, len(months_out))
    if months_out:
        scores = [m.get("overall_score",65) for m in months_out]
        sp = max(scores)-min(scores)
        print(f"   Scores: {scores}")
        check("Score spread >= 15", sp>=15, f"spread={sp}")
        check("Not all 65", not all(s==65 for s in scores))
        check("Has score below 55", min(scores)<55, min(scores))
        check("Has score above 65", max(scores)>65, max(scores))
        a = months_out[0].get("analysis","")
        wc = len(a.split())
        check("Analysis >= 120 words", wc>=120, f"{wc}w")
        has_h = any(f"H{n}" in a or f"{n}th house" in a for n in range(1,13))
        check("Analysis names houses", has_h)
        has_best_worst = ("BEST" in a or "Best" in a) and ("WORST" in a or "Worst" in a)
        check("Monthly has BEST/WORST or best/worst days", has_best_worst)
        has_rating = "/100" in a or "Rating" in a or "rating" in a
        check("Monthly has rating or /100", has_rating)
        print(f"   Sample: {a[:200]}")
except Exception as e:
    fail("months-first", e)

# TEST 5: Synthesis
print("\n--- TEST 5: Synthesis ---")
try:
    weeks_p = [{"week_index":i,"week_label":f"Week {i+1}",
        "start_date":str(datetime.date(2026,3,8)+datetime.timedelta(weeks=i)),
        "end_date":str(datetime.date(2026,3,14)+datetime.timedelta(weeks=i)),
        "daily_scores":day_scores[i*7:(i+1)*7] or [59,52,74,70,59,34,42]}
        for i in range(6)]
    r = requests.post(f"{BASE}/api/commentary/weeks-synthesis",
        json={"lagnaSign":LAGNA,"mahadasha":MD,"antardasha":AD,
              "reportStartDate":"2026-03-08","weeks":weeks_p,
              "synthesis_context":{
                  "total_days":7,
                  "best_date":"2026-03-10",
                  "best_score":max(day_scores) if day_scores else 74,
                  "worst_date":"2026-03-13",
                  "worst_score":min(day_scores) if day_scores else 34,
                  "avg_score":int(sum(day_scores)/max(len(day_scores),1))}},
        timeout=600)
    r.raise_for_status()
    data = r.json()
    weeks_out = data.get("weeks",[])
    synth = data.get("period_synthesis",{})
    check("Returns 6 weeks", len(weeks_out)==6, len(weeks_out))
    check("Synthesis exists", bool(synth))
    if synth:
        op = synth.get("opening_paragraph","") if isinstance(synth, dict) else ""
        wc = len(op.split())
        check("Opening >= 180 words", wc>=180, f"{wc}w")
        sw = synth.get("strategic_windows",[]) if isinstance(synth, dict) else []
        sw = sw if isinstance(sw, list) else []
        check("Has strategic windows", len(sw)>=2, len(sw))
        dp = synth.get("domain_priorities",{}) if isinstance(synth, dict) else {}
        dp = dp if isinstance(dp, dict) else {}
        career = dp.get("career","") if isinstance(dp, dict) else ""
        check("Career domain >= 40 words", len((career or "").split())>=40)
        first_part = (op.split("\n")[0] or op)[:200]
        alpha = [c for c in first_part if c.isalpha()]
        caps_ratio = sum(1 for c in alpha if c.isupper()) / (len(alpha) or 1)
        caps_line = (caps_ratio >= 0.7 and len(alpha) >= 20) or any(
            line.strip().upper() == line.strip() and len(line.split()) >= 4
            for line in op.split("\n") if line.strip()
        )
        check("Opening has ALL-CAPS line", caps_line)
        print(f"   Opening sample: {op[:200]}")
    if weeks_out:
        w0 = weeks_out[0]
        analysis = (w0.get("analysis") or w0.get("commentary") or "")
        theme = (w0.get("theme") or "")
        combined = analysis + " " + theme
        has_week_best = "BEST" in combined or "Best" in combined
        has_week_worst = "WORST" in combined or "Worst" in combined
        check("Weekly has BEST/WORST in text", has_week_best or has_week_worst)
        check("Weekly analysis/theme not empty", len((analysis + theme).strip()) >= 50)
except Exception as e:
    fail("weeks-synthesis", e)

# SUMMARY
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
passed = sum(1 for ok,_,_ in results if ok)
total = len(results)
print(f"[{'PASS' if passed==total else 'FAIL'}] {passed}/{total} checks passed")
failed = [(l,g) for ok,l,g in results if not ok]
if failed:
    print("\nFAILED CHECKS:")
    for l,g in failed: print(f"  [FAIL] {l}: {g}")
else:
    print("ALL CHECKS PASSED - grandmaster quality confirmed")
sys.exit(0 if passed==total else 1)
