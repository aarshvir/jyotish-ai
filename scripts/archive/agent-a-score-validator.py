"""
Agent A — Score Validator
Calls ephemeris for every date in benchmark. Computes variance vs benchmark.
Produces scripts/agent-a-results.json and diagnostics.
"""
import requests
import json
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, "benchmark.json")) as f:
    bm = json.load(f)

EPH = "http://localhost:8001"
GEO = {
    "current_lat": 25.2048,
    "current_lng": 55.2708,
    "timezone_offset_minutes": 240,
    "natal_lagna_sign_index": 3,
}

results = {
    "day_variance": [],
    "hourly_variance": [],
    "formula_diagnosis": [],
}
total_day_var = []
total_slot_var = []

print("=== AGENT A: SCORE VALIDATOR ===")

for bm_day in bm["day_scores"]:
    dt = bm_day["date"]
    bm_score = bm_day["score"]

    try:
        r = requests.post(
            f"{EPH}/generate-daily-grid",
            json={"date": dt, **GEO},
            timeout=600,
        )
        r.raise_for_status()
        d = r.json()
        live_score = d.get("day_score", 0)
        variance = abs(live_score - bm_score)
        pct = (variance / bm_score) * 100 if bm_score else 0

        status = "OK" if pct <= 10 else "FAIL"
        results["day_variance"].append({
            "date": dt,
            "benchmark": bm_score,
            "live": live_score,
            "variance": round(variance, 1),
            "pct": round(pct, 1),
            "status": status,
        })
        total_day_var.append(pct)

        print(
            "  %s: benchmark=%s live=%s var=%.1f (%.1f%%) [%s]"
            % (dt, bm_score, live_score, variance, pct, status)
        )

        if pct > 10:
            yoga = d.get("yoga", "unknown")
            moon_house = d.get("moon_house", 0)
            weekday = d.get("weekday", 0)
            slots = d.get("slots", [])
            slot_scores = [s["score"] for s in slots] if slots else []
            print(
                "    DIAGNOSIS: yoga=%s moon_house=%s weekday=%s slot_range=%s"
                % (
                    yoga,
                    moon_house,
                    weekday,
                    "%s-%s" % (min(slot_scores), max(slot_scores)) if slot_scores else "n/a",
                )
            )
            results["formula_diagnosis"].append({
                "date": dt,
                "yoga": yoga,
                "moon_house": moon_house,
                "live_slots_range": (
                    "%s-%s" % (min(slot_scores), max(slot_scores)) if slot_scores else "n/a"
                ),
                "issue": "day_score_variance_exceeded_10pct",
            })

        if dt in bm.get("hourly_scores", {}):
            bm_slots = bm["hourly_scores"][dt]
            live_slots = d.get("slots", [])
            if len(live_slots) >= len(bm_slots):
                for i, bm_slot in enumerate(bm_slots[:18]):
                    if i < len(live_slots):
                        ls = live_slots[i]["score"]
                        bs = bm_slot["score"]
                        sv = abs(ls - bs)
                        spct = (sv / max(bs, 1)) * 100
                        total_slot_var.append(spct)
                        results["hourly_variance"].append({
                            "date": dt,
                            "time": bm_slot["time"],
                            "benchmark": bs,
                            "live": ls,
                            "variance_pct": round(spct, 1),
                        })
    except Exception as e:
        print("  %s: ERROR %s" % (dt, e))

days_ok = sum(1 for d in results["day_variance"] if d["status"] == "OK")
days_total = len(results["day_variance"])
avg_day_var = sum(total_day_var) / len(total_day_var) if total_day_var else 0
avg_slot_var = sum(total_slot_var) / len(total_slot_var) if total_slot_var else 0

print("\n=== SUMMARY ===")
print("Day scores within 10%%: %d/%d" % (days_ok, days_total))
print("Avg day variance: %.1f%%" % avg_day_var)
print("Avg slot variance: %.1f%%" % avg_slot_var)

results["summary"] = {
    "days_within_10pct": days_ok,
    "days_total": days_total,
    "avg_day_variance_pct": round(avg_day_var, 1),
    "avg_slot_variance_pct": round(avg_slot_var, 1),
    "pass": days_ok == days_total and avg_day_var <= 10,
}

with open(os.path.join(script_dir, "agent-a-results.json"), "w") as f:
    json.dump(results, f, indent=2)

print("\nResults saved to scripts/agent-a-results.json")
sys.exit(0 if results["summary"]["pass"] else 1)
