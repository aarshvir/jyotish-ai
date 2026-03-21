"""
Extract grandmaster benchmark scores from a markdown file (e.g. from docx via pandoc).
If no gm.md: write benchmark from known_scores only (no placeholders).
Usage: python scripts/extract-benchmark.py
"""
import re
import json
import os

# Known grandmaster day scores (reference benchmark only — for validation, not reverse engineering)
KNOWN_SCORES = {
    "2026-02-17": 39.2,
    "2026-02-18": 53.2,
    "2026-02-19": 72.4,
    "2026-02-20": 69.3,
    "2026-02-21": 55.9,
    "2026-02-22": 62.6,
    "2026-02-23": 76.8,
    "2026-02-24": 66.2,
    "2026-02-25": 46.8,
    "2026-02-26": 53.0,
    "2026-02-27": 59.9,
    "2026-02-28": 79.6,
    "2026-03-01": 60.2,
    "2026-03-02": 38.1,
    "2026-03-03": 49.0,
    "2026-03-04": 61.2,
    "2026-03-05": 57.5,
    "2026-03-06": 47.9,
    "2026-03-07": 65.2,
    "2026-03-08": 66.9,
    "2026-03-09": 46.3,
    "2026-03-10": 76.2,
}


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    out_path = os.path.join(script_dir, "benchmark.json")

    day_scores = []
    hourly = {}
    commentary_wc = {}

    for path in [
        os.path.join(script_dir, "gm.md"),
        "/tmp/gm.md",
        os.path.join(root, "scripts", "gm.md"),
    ]:
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            day_blocks = re.findall(
                r"(Feb|Mar)\s+(\d+).*?Avg\s+([\d.]+)/100", text
            )
            for month, day, score in day_blocks:
                date_str = "2026-%s-%s" % (
                    "02" if month == "Feb" else "03",
                    day.zfill(2),
                )
                day_scores.append({"date": date_str, "score": float(score)})

            day_sections = re.split(
                r"(?=(?:Feb|Mar)\s+\d+,\s+2026)", text
            )
            for section in day_sections:
                date_match = re.search(
                    r"(Feb|Mar)\s+(\d+),\s+2026", section
                )
                if not date_match:
                    continue
                m, d = date_match.groups()
                date_str = "2026-%s-%s" % (
                    "02" if m == "Feb" else "03",
                    d.zfill(2),
                )
                slots = re.findall(
                    r"(\d{2}:\d{2}--\d{2}:\d{2})\s+\w+\s+\w+\s+\w+.*?\*\*(\d+)\*\*",
                    section,
                )
                if slots:
                    hourly[date_str] = [
                        {"time": t, "score": int(s)} for t, s in slots
                    ]
                overview_match = re.search(
                    r"Day Overview.*?(?=Hourly Breakdown)",
                    section,
                    re.DOTALL,
                )
                if overview_match:
                    commentary_wc[date_str] = len(
                        overview_match.group().split()
                    )
            break

    # Remove placeholder entries (no fake 55.0; 2026-02-18 is genuinely ~53 so keep it)
    day_scores = [
        d
        for d in day_scores
        if d["score"] != 55.0 or d["date"] in ("2026-02-18", "2026-02-19")
    ]
    # Merge: known_scores wins over pandoc extraction
    existing = {d["date"]: d["score"] for d in day_scores}
    existing.update(KNOWN_SCORES)
    day_scores = [
        {"date": k, "score": v} for k, v in sorted(existing.items())
    ]

    benchmark = {
        "day_scores": day_scores,
        "hourly_scores": hourly,
        "commentary_word_counts": commentary_wc,
        "target_day_spread": 41.5,
        "target_min_day_score": 38.1,
        "target_max_day_score": 79.6,
        "target_overview_words": {"min": 280, "max": 350},
        "target_slot_words": {"min": 120, "max": 250},
    }

    with open(out_path, "w") as f:
        json.dump(benchmark, f, indent=2)

    print("Final benchmark: %d days" % len(day_scores))
    for d in day_scores:
        print("  %s: %s" % (d["date"], d["score"]))


if __name__ == "__main__":
    main()
