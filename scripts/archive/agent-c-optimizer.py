import json, sys, os, re, ast
from datetime import datetime


def log(msg: str) -> None:
    print(msg)
    ts = datetime.now().strftime("%H:%M:%S")
    with open("scripts/agent-log.txt", "a", encoding="utf-8") as f:
        f.write(f"[{ts}][AGENT-C] {msg}\n")


def read_file(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def write_file(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def apply_regex_fix(path: str, pattern: str, replacement: str, label: str, flags: int = re.DOTALL) -> bool:
    content = read_file(path)
    if not re.search(pattern, content, flags):
        log(f"  SKIP {label}: pattern not found in {path}")
        return False
    new_content = re.sub(pattern, replacement, content, count=1, flags=flags)
    if new_content == content:
        log(f"  SKIP {label}: replacement produced no change")
        return False
    write_file(path, new_content)
    log(f"  APPLIED {label}")
    return True


fixes_applied: list[str] = []
loop_n = int(open("scripts/loop-count.txt").read().strip())
log(f"=== AGENT C LOOP {loop_n} ===")

with open("scripts/agent-a-results.json") as f:
    a = json.load(f)
with open("scripts/agent-b-results.json") as f:
    b = json.load(f)

# ── FIX 1: SCORE FORMULA ─────────────────────────

real_days = [d for d in a.get("day_variance", []) if d.get("benchmark", 55) != 55.0]
high_var = [d for d in real_days if d.get("pct", 0) > 10]
live_higher = [d for d in high_var if d.get("live", 0) > d.get("benchmark", 0)]

log(f"High variance days: {len(high_var)}/{len(real_days) or '0'}")
log(f"Live too high: {len(live_higher)}")

# Formula calibration disabled - modifiers set by calibration sweep
# (h1=6, saubhagya=8, atiganda=-18)
# Agent C only fixes commentary issues now.
log("Formula reduction disabled - using calibrated values")

# ── FIX 2: COMMENTARY WORD COUNT (DAILY) ─────────

b_issues = b.get("issues", [])
overview_issues = [i for i in b_issues if "daily-overview" in i and "wc=" in i]

if overview_issues:
    try:
        sample_wc = int(overview_issues[0].split("wc=")[-1].strip())
    except Exception:
        sample_wc = 0

    log(f"Overview issues: {len(overview_issues)}, sample wc={sample_wc}")

    if sample_wc < 250:
        path = "src/app/api/commentary/daily-overviews/route.ts"

        # Increase max_tokens
        if apply_regex_fix(path, r"max_tokens:\s*\d+", "max_tokens: 8000", "daily_overviews_max_tokens_8000"):
            fixes_applied.append("daily_overviews_max_tokens_8000")

        # Normalize word-count instruction block
        if apply_regex_fix(
            path,
            r"day_overview:.*?(?=day_theme:)",
            'day_overview: Write 280-320 words. First line ALL CAPS headline. Then STRATEGY: section with 4 specific directives. '
            'Name specific house numbers, planets, nakshatras. Never use: generally, may, could, might, perhaps.\\n\\n',
            "daily_overview_word_count_block",
        ):
            fixes_applied.append("daily_overview_word_count_block")

# ── FIX 3: HOURLY WORD COUNT ─────────────────────

hourly_issues = [i for i in b_issues if "hourly" in i.lower() and "below quality" in i]

if hourly_issues:
    path = "src/app/api/commentary/hourly-day/route.ts"

    # Never push hourly-day beyond 6000; higher values increase model timeouts.
    if apply_regex_fix(path, r"max_tokens:\s*\d+", "max_tokens: 6000", "hourly_max_tokens_6000"):
        fixes_applied.append("hourly_max_tokens_6000")

    if apply_regex_fix(
        path,
        r"For each of the 18 time slots.*?Every sentence is definitive\.",
        "For each of the 18 time slots write commentary of 140-170 words. Name house numbers. Explain choghadiya meaning in parentheses. "
        "End with CAPS directive. No generic language.",
        "hourly_prompt_rewrite",
    ):
        fixes_applied.append("hourly_prompt_rewrite")

# ── FIX 4: MONTHLY SCORE SPREAD ──────────────────

monthly_issues = [i for i in b_issues if "monthly score spread" in i]

if monthly_issues:
    for p in [
        "src/app/api/commentary/months-first/route.ts",
        "src/app/api/commentary/months-second/route.ts",
    ]:
        if apply_regex_fix(p, r"max_tokens:\s*\d+", "max_tokens: 8000", f"monthly_max_tokens_8000_{os.path.basename(p)}"):
            fixes_applied.append(f"monthly_max_tokens_8000_{os.path.basename(p)}")

# ── FIX 5: 500 ERRORS ────────────────────────────

server_errors = [i for i in b_issues if "500 Server Error" in i]
if server_errors:
    log(f"Server errors detected in Agent B issues: {len(server_errors)}")
    with open("scripts/500-error-detected.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(server_errors))
    log("  Wrote scripts/500-error-detected.txt for main loop investigation")
    fixes_applied.append("500_error_flagged_for_investigation")

# ── SUMMARY ──────────────────────────────────────

summary = {
    "loop": loop_n,
    "fixes_applied": fixes_applied,
    "fixes_count": len(fixes_applied),
    "high_variance_days": len(high_var),
    "commentary_issues": len(b_issues),
    "action_required": len(fixes_applied) > 0,
}

with open("scripts/agent-c-instructions.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)

log(f"Total fixes applied: {len(fixes_applied)}")
for fix in fixes_applied:
    log(f"  - {fix}")

sys.exit(0)
