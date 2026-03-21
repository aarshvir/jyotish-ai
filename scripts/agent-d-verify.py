"""
Agent D — Build and Render Verifier
Runs TypeScript check, build, and HTML validation.
Produces scripts/agent-d-results.json.
"""
import subprocess
import sys
import os
import re
import json

script_dir = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(script_dir)

results = {}
print("=== AGENT D: BUILD AND RENDER VERIFIER ===")


def run(cmd, timeout=900):
    try:
        r = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=root,
            encoding="utf-8",
            errors="replace",
        )
        return r.returncode, (r.stdout or "") + (r.stderr or "")
    except subprocess.TimeoutExpired:
        return 1, "TIMEOUT"
    except Exception as e:
        return 1, str(e)


print("\n-- TypeScript --")
code, out = run("npx tsc --noEmit 2>&1")
ts_errors = out.count("error TS")
results["typescript"] = {"errors": ts_errors, "pass": ts_errors == 0}
print("  TS errors: %d %s" % (ts_errors, "[PASS]" if ts_errors == 0 else "[FAIL]"))
if ts_errors > 0:
    print("  %s" % out[:500])

print("\n-- Build --")
code, out = run("npm run build 2>&1", timeout=900)
build_pass = code == 0
results["build"] = {"pass": build_pass}
print("  Build: %s" % ("[PASS]" if build_pass else "[FAIL]"))
if not build_pass:
    print("  %s" % out[-500:])

print("\n-- HTML Validation --")
html_path = os.path.join(script_dir, "last-report.html")
if os.path.exists(html_path):
    with open(html_path, encoding="utf-8", errors="ignore") as f:
        html = f.read()
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)

    html_checks = {
        "is_report_page": "/report/" in html,
        "size_gt_250kb": len(html) > 250000,
        "nativity_ok": "Nativity unavailable" not in text,
        "has_7_strategy": text.count("STRATEGY") >= 6,
        "has_caps_headlines": len([
            s for s in text.split(".")
            if s.strip().upper() == s.strip() and len(s.strip().split()) >= 5
        ]) >= 5,
        "has_house_refs": len(re.findall(r"H\d+|\d+th house", text)) >= 50,
        "has_monthly": sum(
            1
            for m in [
                "March 2026",
                "April 2026",
                "May 2026",
                "June 2026",
                "July 2026",
                "August 2026",
            ]
            if m in text
        ) >= 6,
        "has_weekly": any(
            x in text for x in ["Week 1", "W1 W2", "week-"]
        ),
        "has_synthesis": "Period Synthesis" in text,
    }
    html_pass = sum(html_checks.values())
    html_total = len(html_checks)
    results["html"] = {
        "checks": html_checks,
        "pass": html_pass == html_total,
    }
    print("  HTML: %d/%d checks" % (html_pass, html_total))
    for k, v in html_checks.items():
        sym = "[PASS]" if v else "[FAIL]"
        print("    %s %s" % (sym, k))
else:
    results["html"] = {"pass": False, "error": "file missing"}
    print("  [FAIL] last-report.html not found")

all_pass = (
    results.get("typescript", {}).get("pass", False)
    and results.get("build", {}).get("pass", False)
    and results.get("html", {}).get("pass", False)
)

results["overall_pass"] = all_pass

with open(os.path.join(script_dir, "agent-d-results.json"), "w") as f:
    json.dump(results, f, indent=2)

print("\n=== OVERALL: %s ===" % ("PASS" if all_pass else "FAIL"))
sys.exit(0 if all_pass else 1)
