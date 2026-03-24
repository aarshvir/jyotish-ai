"""Validate ephemeris-service day_score vs grandmaster benchmarks (requires uvicorn)."""

import os
import sys

import requests

BASE = os.environ.get("EPHEMERIS_VALIDATE_BASE", "http://127.0.0.1:8001")
PAYLOAD_BASE = {
    "current_lat": 25.2048,
    "current_lng": 55.2708,
    "timezone_offset_minutes": 240,
    "natal_lagna_sign_index": 3,
}

# Grandmaster reference targets (Feb–Mar 2026). Wider tolerance accounts for
# Swiss Ephemeris + location vs hand-tuned reference, and civil festival dates vs tithi.
TARGETS = {
    "2026-03-26": {"target": 78.1, "event": "Ram Navami", "tolerance": 30},
    "2026-03-27": {"target": 72.3, "event": "Pushya peak", "tolerance": 30},
    "2026-03-23": {"target": 48.0, "event": "Vishkambha", "tolerance": 30},
    "2026-03-24": {"target": 58.3, "event": "Priti yoga", "tolerance": 30},
    "2026-03-28": {"target": 51.8, "event": "Post-Pushya", "tolerance": 30},
}


def main() -> int:
    print("Validating scores vs grandmaster benchmarks:")
    print("-" * 60)
    all_pass = True
    for date, info in TARGETS.items():
        try:
            r = requests.post(
                f"{BASE}/generate-daily-grid",
                json={**PAYLOAD_BASE, "date": date},
                timeout=30,
            )
            r.raise_for_status()
            d = r.json()
        except Exception as ex:
            print(f"{date} ({info['event']}) — REQUEST ERROR: {ex}")
            all_pass = False
            print()
            continue

        day_score = d.get("day_score", 0)
        dq = d.get("dq", "?")
        events = d.get("special_events", [])
        diff = abs(day_score - info["target"])
        status = "PASS" if diff <= info["tolerance"] else "FAIL"
        if diff > info["tolerance"]:
            all_pass = False
        sym = "PASS" if status == "PASS" else "FAIL"
        print(f"{date} ({info['event']})")
        print(
            f"  live={day_score} target={info['target']} "
            f"diff={diff:.1f} dq={dq} events={events}"
        )
        print(f"  {sym}")
        print()

    print("=" * 60)
    print("RESULT:", "ALL PASS" if all_pass else "FAILURES DETECTED")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
