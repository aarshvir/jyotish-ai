import json

import requests

# Get ephemeris data
eph = requests.post(
    "http://127.0.0.1:8001/generate-daily-grid",
    json={
        "date": "2026-03-10",
        "current_lat": 25.2048,
        "current_lng": 55.2708,
        "timezone_offset_minutes": 240,
        "natal_lagna_sign_index": 3,
    },
    timeout=15,
).json()

print("planet_positions in eph:", "planet_positions" in eph)
print(
    "Moon house:",
    eph.get("planet_positions", {}).get("planets", {}).get("Moon", {}).get("house"),
)

# Test daily-overviews route with ONE day
day = {
    "date": "2026-03-10",
    "panchang": eph.get("panchang", {}),
    "planet_positions": eph.get("planet_positions", {}),
    "slots": eph.get("slots", []),
    "day_score": eph.get("day_score", 71),
    "rahu_kaal": eph.get("rahu_kaal", {}),
    "peak_slots": [s for s in eph.get("slots", []) if s.get("score", 0) >= 75][:3],
}

resp = requests.post(
    "http://127.0.0.1:3000/api/commentary/daily-overviews",
    json={
        "lagnaSign": "Cancer",
        "mahadasha": "Rahu",
        "antardasha": "Mercury",
        "days": [day],
        "model_override": "gpt-5.4-nano",
    },
    timeout=120,
)

print("Status:", resp.status_code)
if resp.status_code == 200:
    data = resp.json()
    days = data.get("days", [])
    if days:
        overview = days[0].get("day_overview", "")
        print("Word count:", len(overview.split()))
        print("Has Harshana:", "Harshana" in overview)
        print("Has 11:00:", "11:00" in overview)
        print("Has Anuradha Yoga:", "Anuradha Yoga" in overview)
        print("Has planet_positions:", "Aquarius" in overview or "H8" in overview)
        print()
        print("FIRST 300 CHARS:")
        print(overview[:300])
    else:
        print("No days in response:", data)
else:
    print("ERROR:", resp.text[:500])
