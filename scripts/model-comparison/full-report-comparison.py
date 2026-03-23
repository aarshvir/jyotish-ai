"""
Full 7-day-style commentary comparison across models (via Next.js routes).

Requires:
  - Ephemeris: py -m uvicorn main:app --port 8001 (in ephemeris-service)
  - Next.js: npm run dev (default http://localhost:3000)

Optional env:
  JYOTISH_BASE_URL   - if dev bound to another port (e.g. http://127.0.0.1:3001)
  JYOTISH_EPH_URL    - override ephemeris base URL
  GROK_API_KEY       - for grok-* model_override (xAI); required for Grok rows in comparison

MODELS_TO_RUN (top of file): non-empty = only those display names; merges prior
scripts/model-comparison/full-results.json so the MD/JSON still list all models.
Empty MODELS_TO_RUN = run every model in ALL_MODEL_DEFINITIONS (no merge).

RUN_SOLO_MODELS: False = skip solo API calls; load solo rows from full-results.json.
RUN_HYBRID_COMBOS: run hybrid stacks (needs GROK + OPENAI + ANTHROPIC keys).

Vedic judge: pip install anthropic (uses ANTHROPIC_API_KEY, Sonnet 4.6).
"""
import json
import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
    except Exception:
        pass
import re
import datetime
import requests
from pathlib import Path

OUTPUT_DIR = Path("scripts/model-comparison")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Map old full-results.json display names → current ALL_MODEL_DEFINITIONS names
LEGACY_MODEL_REPORT_NAMES = {
    "Claude Haiku 3.5": "Claude Haiku 4.5",
}

# Non-empty: only run these display names (merge with previous full-results.json).
# Empty list: run every model in ALL_MODEL_DEFINITIONS.
# Solo filter (only when RUN_SOLO_MODELS True). [] = all definitions.
MODELS_TO_RUN = []

# When False, solo models are loaded from full-results.json (no solo API re-run).
RUN_SOLO_MODELS = False

# Run 3 hybrid combos (Part 4).
RUN_HYBRID_COMBOS = True

EPH_URL = os.environ.get("JYOTISH_EPH_URL", "http://localhost:8001")
BASE_URL = os.environ.get("JYOTISH_BASE_URL", "http://localhost:3000")
GEO = {
    "current_lat": 25.2048,
    "current_lng": 55.2708,
    "timezone_offset_minutes": 240,
    "natal_lagna_sign_index": 3,
}
LAGNA, MD, AD = "Cancer", "Rahu", "Mercury"

TEST_DATES = [
    "2026-03-08",
    "2026-03-09",
    "2026-03-10",
    "2026-03-11",
    "2026-03-12",
    "2026-03-13",
    "2026-03-14",
]

GRANDMASTER_SCORES = {
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

GRANDMASTER_STANDARDS = {
    "overview_words_min": 280,
    "overview_words_max": 350,
    "slot_words_min": 150,
    "slot_words_max": 250,
    "monthly_words_min": 150,
    "synthesis_words_min": 200,
    "day_score_variance_max_pct": 10.0,
}

PRICING = {
    "claude-haiku-4-5-20251001": {"input": 1.00, "output": 5.00},
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
    "gpt-5.4-nano": {"input": 0.20, "output": 1.25},
    "gpt-5.4-mini": {"input": 0.75, "output": 4.50},
    "gpt-5.4": {"input": 2.50, "output": 10.00},
    # Alias: same gpt-5.4 model + high reasoning (extra reasoning output tokens).
    "gpt-5.4-high-reasoning": {"input": 2.50, "output": 15.00},
    "gemini-2.5-flash-preview-04-17": {"input": 0.30, "output": 2.50},
    "gemini-2.0-flash": {"input": 0.30, "output": 2.50},
    "gemini-3.1-pro": {"input": 2.00, "output": 12.00},
    "gemini-1.5-pro": {"input": 2.00, "output": 12.00},
    "deepseek-chat": {"input": 0.28, "output": 0.42},
    "deepseek-reasoner": {"input": 0.55, "output": 2.19},
    "grok-4": {"input": 3.00, "output": 15.00},
    "grok-4-1-fast-reasoning": {"input": 0.20, "output": 0.50},
    "grok-4-fast": {"input": 0.20, "output": 0.50},
    "grok-4.20-multi-agent": {"input": 2.00, "output": 6.00},
    "grok-4.20-beta-0309-reasoning": {"input": 2.00, "output": 6.00},
}

# Rough input/output token estimates per section (for hybrid $/report).
SECTION_TOKEN_WEIGHTS = {
    "daily_overviews": (12000, 14000),
    "hourly": (9000, 11000),
    "monthly": (8000, 10000),
    "synthesis": (10000, 12000),
    "nativity": (4500, 5500),
}

# Focused re-run (3 combos only) — planetary positions + prompt anchors in app.
HYBRID_COMBOS = [
    {
        "name": "Smart Hybrid",
        "sections": {
            "daily_overviews": "grok-4.20-multi-agent",
            "hourly": "gpt-5.4-mini",
            "monthly": "gpt-5.4-nano",
            "synthesis": "claude-haiku-4-5-20251001",
            "nativity": "gpt-5.4-nano",
        },
    },
    {
        "name": "GPT Thinking Stack",
        "sections": {
            "daily_overviews": "gpt-5.4-high-reasoning",
            "hourly": "gpt-5.4-mini",
            "monthly": "gpt-5.4-nano",
            "synthesis": "gpt-5.4-high-reasoning",
            "nativity": "gpt-5.4-nano",
        },
    },
    {
        "name": "Ultra Budget",
        "sections": {
            "daily_overviews": "gpt-5.4-nano",
            "hourly": "gpt-5.4-nano",
            "monthly": "gpt-5.4-nano",
            "synthesis": "gpt-5.4-nano",
            "nativity": "gpt-5.4-nano",
        },
    },
]


def evaluate_vedic_accuracy(section_name, text, context, anthropic_key):
    """
    Claude Sonnet 4.6 as judge: 5 Vedic accuracy dimensions (0–10 each).
    """
    try:
        import anthropic as ant
    except ImportError:
        return {
            "lagna_accuracy": 0,
            "yoga_interpretation": 0,
            "dasha_coherence": 0,
            "choghadiya_alignment": 0,
            "internal_consistency": 0,
            "avg_accuracy": 0.0,
            "judge_notes": "pip install anthropic required for judge",
            "critical_errors": [],
            "error": "no anthropic package",
        }

    if not anthropic_key or len((text or "").strip()) < 50:
        return {
            "lagna_accuracy": 0,
            "yoga_interpretation": 0,
            "dasha_coherence": 0,
            "choghadiya_alignment": 0,
            "internal_consistency": 0,
            "avg_accuracy": 0.0,
            "judge_notes": "insufficient text",
            "critical_errors": [],
            "error": "skipped",
        }

    cancer_houses = {
        "H1": "Cancer",
        "H2": "Leo",
        "H3": "Virgo",
        "H4": "Libra",
        "H5": "Scorpio",
        "H6": "Sagittarius",
        "H7": "Capricorn",
        "H8": "Aquarius",
        "H9": "Pisces",
        "H10": "Aries",
        "H11": "Taurus",
        "H12": "Gemini",
    }
    cancer_rulerships = {
        "Mercury": "rules H3 (Virgo) and H12 (Gemini)",
        "Rahu": "amplifies the house it occupies",
        "Moon": "rules H1 (Cancer lagna lord)",
        "Mars": "rules H5 (Scorpio) and H10 (Aries)",
        "Jupiter": "rules H6 (Sagittarius) and H9 (Pisces)",
        "Saturn": "rules H7 (Capricorn) and H8 (Aquarius)",
        "Venus": "rules H4 (Libra) and H11 (Taurus)",
        "Sun": "rules H2 (Leo)",
    }

    bs = context["best_slot"]
    judge_prompt = f"""You are an expert Vedic astrology reviewer.
Score this {section_name} commentary on 5 accuracy dimensions.
Each score is 0-10. Be strict. Hallucinations score 0.

═══ GROUND TRUTH ═══
Date: {context['date']} | Section: {section_name}
Yoga: {context['yoga']} — correct meaning: {context['yoga_meaning']}
Lagna: Cancer (H1)
Moon in: {context['moon_sign']} → House {context['moon_house']} for Cancer lagna
Best action window: {bs['time']}
  (score={bs['score']},
   choghadiya={bs['choghadiya']})
Day score: {context['day_score']} (benchmark ~{context.get('benchmark_score', 70)})
Rahu Kaal active: {context['rahu_kaal']}
Dasha: {context['md']}-{context['ad']}

Cancer Lagna House Map:
{json.dumps(cancer_houses, indent=2)}

Mercury (active antardasha lord): {cancer_rulerships['Mercury']}
Mars: {cancer_rulerships['Mars']}
Moon (lagna lord): {cancer_rulerships['Moon']}

═══ COMMENTARY TO EVALUATE ═══
{(text or '')[:8000]}

═══ SCORING INSTRUCTIONS ═══
Return ONLY valid JSON. No other text.

Score each dimension 0-10:

1. lagna_accuracy (0-10):
   - Do house numbers match Cancer lagna map?
     (H5=Scorpio✓, H7=Capricorn✓, H10=Aries✓, H11=Taurus✓)
   - Penalize wrong sign-house assignments heavily (-3 each)
   - Score 10 = all house refs match Cancer map exactly

2. yoga_interpretation (0-10):
   - Is {context['yoga']} yoga interpreted correctly?
   - Correct meaning: {context['yoga_meaning']}
   - Score 10 = meaning correct + applied to chart logically
   - Score 0 = wrong meaning stated (e.g. calling Harshana
     "obstacle" or Atiganda "joyful")

3. dasha_coherence (0-10):
   - Is Mercury (antardasha) correctly identified as ruling
     H3 and H12 for Cancer lagna?
   - Is Rahu correctly described as amplifying rather than
     ruling a sign?
   - Does Rahu-Mercury dasha logic flow consistently?
   - Score 10 = all dasha references technically correct

4. choghadiya_alignment (0-10):
   - Does the recommended action window include or
     reference {bs['time']}?
   - Is {bs['choghadiya']} choghadiya
     correctly characterized as auspicious?
   - Are bad choghadiya periods (Udveg, Rog, Kaal) correctly flagged?
   - Score 10 = recommendations match slot scores exactly

5. internal_consistency (0-10):
   - No contradictions within the text
   - Tone matches day score ({context['day_score']})
     (score>70 = positive, score<45 = cautious)
   - Planet descriptions consistent throughout
   - Score 10 = perfectly consistent throughout

Also provide:
- judge_notes: 1-2 sentence summary of main accuracy issues
- critical_errors: list of specific factual errors found

JSON format:
{{
  "lagna_accuracy": 0,
  "yoga_interpretation": 0,
  "dasha_coherence": 0,
  "choghadiya_alignment": 0,
  "internal_consistency": 0,
  "judge_notes": "string",
  "critical_errors": ["error1", "error2"]
}}"""

    try:
        client = ant.Anthropic(api_key=anthropic_key)
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": judge_prompt}],
        )
        raw = r.content[0].text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        raw = raw.strip()
        _judge_parse_fallback = {
            "lagna_accuracy": 0,
            "yoga_interpretation": 0,
            "dasha_coherence": 0,
            "choghadiya_alignment": 0,
            "internal_consistency": 0,
            "judge_notes": f"Parse failed: {raw[:200]}",
            "critical_errors": ["Judge response could not be parsed"],
        }
        try:
            scores = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    scores = json.loads(match.group())
                except json.JSONDecodeError:
                    scores = dict(_judge_parse_fallback)
            else:
                scores = dict(_judge_parse_fallback)
        dims = [
            "lagna_accuracy",
            "yoga_interpretation",
            "dasha_coherence",
            "choghadiya_alignment",
            "internal_consistency",
        ]
        for d in dims:
            try:
                v = scores.get(d, 0)
                scores[d] = max(0, min(10, int(float(v))))
            except (TypeError, ValueError):
                scores[d] = 0
        avg = round(sum(scores.get(d, 0) for d in dims) / len(dims), 1)
        scores["avg_accuracy"] = avg
        if not isinstance(scores.get("critical_errors"), list):
            scores["critical_errors"] = []
        scores.setdefault("judge_notes", "")
        return scores
    except Exception as e:
        return {
            "lagna_accuracy": 0,
            "yoga_interpretation": 0,
            "dasha_coherence": 0,
            "choghadiya_alignment": 0,
            "internal_consistency": 0,
            "avg_accuracy": 0.0,
            "judge_notes": f"Judge error: {str(e)[:100]}",
            "critical_errors": [],
        }


def build_accuracy_context(eph_days, grandmaster_scores):
    """Ground truth for the Vedic accuracy judge (middle day of test week)."""
    sample = eph_days[2] if len(eph_days) > 2 else eph_days[0]
    panchang = sample.get("panchang", {})
    slots = sample.get("slots", [])

    best_slot = {"time": "11:00-12:00", "score": 70, "choghadiya": "Labh"}
    if slots:
        best = max(slots, key=lambda s: s.get("score", 0))
        best_slot = {
            "time": best.get("display_label", "11:00-12:00"),
            "score": best.get("score", 70),
            "choghadiya": best.get("dominant_choghadiya", ""),
        }

    date_str = sample.get("date", TEST_DATES[2] if len(TEST_DATES) > 2 else TEST_DATES[0])
    benchmark = grandmaster_scores.get(date_str, 65)

    yoga_meanings = {
        "Harshana": "joy, delight, happiness — auspicious for celebrations",
        "Brahma": "creative power, divine knowledge — excellent for learning",
        "Indra": "victory, power, authority — good for leadership actions",
        "Siddha": "success, accomplishment — favorable for completing tasks",
        "Saubhagya": "good fortune, prosperity — auspicious generally",
        "Sukarma": "virtuous action, good deeds — moderate positive",
        "Atiganda": "great obstacle, danger — highly inauspicious",
        "Parigha": "barrier, obstruction — avoid new starts",
        "Vyatipata": "calamity, disaster — highly inauspicious",
        "Vishkambha": "obstacle at foundation — avoid important work",
        "Dhruva": "fixed, stable — good for permanent works",
        "Shula": "pain, trouble — mixed, proceed carefully",
    }
    yoga_name = panchang.get("yoga") or sample.get("yoga") or "Harshana"
    yoga_meaning = yoga_meanings.get(
        yoga_name, "moderately auspicious — proceed with awareness"
    )

    rk = sample.get("rahu_kaal") or {}
    rahu_active = rk.get("is_active")
    if rahu_active is None:
        rahu_active = any(s.get("is_rahu_kaal") for s in slots)

    moon_house = sample.get("moon_house")
    if moon_house is None:
        moon_house = panchang.get("moon_house", 5)

    return {
        "date": date_str,
        "yoga": yoga_name,
        "yoga_meaning": yoga_meaning,
        "lagna": "Cancer",
        "day_score": sample.get("day_score", 65),
        "benchmark_score": benchmark,
        "best_slot": best_slot,
        "moon_sign": panchang.get("moon_sign", "Scorpio"),
        "moon_house": moon_house,
        "rahu_kaal": rahu_active,
        "md": "Rahu",
        "ad": "Mercury",
    }


def build_nativity_payload(eph_days):
    """Body for POST /api/commentary/nativity-text."""
    d0 = eph_days[0] if eph_days else {}
    p = d0.get("panchang", {})
    mh = d0.get("moon_house", 5)
    moon_sign = p.get("moon_sign", "Scorpio")
    return {
        "lagnaSign": LAGNA,
        "lagnaDegreee": 15.0,
        "moonSign": moon_sign,
        "moonNakshatra": p.get("nakshatra", "Anuradha"),
        "mahadasha": MD,
        "antardasha": AD,
        "planets": {
            "Sun": {"sign": "Pisces", "house": 9},
            "Moon": {"sign": moon_sign, "house": mh},
            "Mars": {"sign": "Aquarius", "house": 8},
            "Mercury": {"sign": "Pisces", "house": 9},
            "Jupiter": {"sign": "Cancer", "house": 1},
            "Venus": {"sign": "Capricorn", "house": 7},
            "Saturn": {"sign": "Pisces", "house": 9},
            "Rahu": {"sign": "Aries", "house": 10},
            "Ketu": {"sign": "Libra", "house": 4},
        },
    }


def eval_nativity(nat_json):
    """Lightweight structure score for nativity JSON."""
    if not nat_json or nat_json.get("error"):
        return {
            "quality_score": 0,
            "error": nat_json.get("error", "no nativity") if nat_json else "no nativity",
        }
    la = (nat_json.get("lagna_analysis") or "").strip()
    di = (nat_json.get("dasha_interpretation") or "").strip()
    w1, w2 = len(la.split()), len(di.split())
    if w1 < 40 or w2 < 30:
        q = 4
    elif w1 < 100 or w2 < 60:
        q = 6
    else:
        q = 8
    house_refs = len(re.findall(r"H\d+|\d+th house", la + di))
    if house_refs >= 5:
        q = min(10, q + 1)
    return {
        "quality_score": min(10, q),
        "lagna_words": w1,
        "dasha_words": w2,
        "total_house_refs": house_refs,
    }


def estimate_hybrid_cost(section_model_ids):
    """$/report estimate from PRICING × SECTION_TOKEN_WEIGHTS."""
    t = 0.0
    for sec, mid in section_model_ids.items():
        ti, to = SECTION_TOKEN_WEIGHTS.get(sec, (5000, 5000))
        p = PRICING.get(mid, {"input": 1.0, "output": 5.0})
        t += ti * p["input"] / 1e6 + to * p["output"] / 1e6
    return round(t, 4)


def run_grok_chat(model_id, prompt, api_key):
    """For Grok 4 and Grok 4.1 Fast — xAI chat completions API (direct; not used by test_model)."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    start = time.time()
    try:
        r = client.chat.completions.create(
            model=model_id,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = r.choices[0].message.content or ""
        in_tok = r.usage.prompt_tokens
        out_tok = r.usage.completion_tokens
    except Exception as e:
        raise Exception(f"Grok chat API error: {e}") from e
    return text, in_tok, out_tok, time.time() - start


def run_grok_responses(model_id, prompt, api_key, reasoning_effort="medium"):
    """For Grok 4.20 models — xAI Responses API (direct; not used by test_model)."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    start = time.time()

    def _from_sdk():
        if not (hasattr(client, "responses") and hasattr(client.responses, "create")):
            raise AttributeError("responses.create not available")
        r = client.responses.create(
            model=model_id,
            reasoning={"effort": reasoning_effort},
            input=[{"role": "user", "content": prompt}],
        )
        text = ""
        if hasattr(r, "output_text"):
            text = r.output_text or ""
        elif hasattr(r, "output"):
            for block in r.output:
                if hasattr(block, "content"):
                    for c in block.content:
                        if hasattr(c, "text"):
                            text += c.text
        usage = getattr(r, "usage", None)
        if usage is not None:
            in_tok = getattr(
                usage, "input_tokens", getattr(usage, "prompt_tokens", 800)
            )
            out_tok = getattr(
                usage, "output_tokens", getattr(usage, "completion_tokens", 500)
            )
        else:
            in_tok, out_tok = 800, 500
        return text, in_tok, out_tok

    try:
        text, in_tok, out_tok = _from_sdk()
        return text, in_tok, out_tok, time.time() - start
    except Exception:
        import requests as req

        try:
            resp = req.post(
                "https://api.x.ai/v1/responses",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_id,
                    "reasoning": {"effort": reasoning_effort},
                    "input": [{"role": "user", "content": prompt}],
                },
                timeout=180,
            )
            resp.raise_for_status()
            data = resp.json()
            text = ""
            for item in data.get("output", []):
                for c in item.get("content", []):
                    if c.get("type") == "text":
                        text += c.get("text", "")
            u = data.get("usage", {})
            in_tok = u.get("input_tokens", 800)
            out_tok = u.get("output_tokens", 500)
            return text, in_tok, out_tok, time.time() - start
        except Exception as e:
            raise Exception(f"Grok responses API error: {e}") from e


def load_merged_model_reports():
    """Previous model_reports keyed by display name (for MODELS_TO_RUN incremental runs)."""
    path = OUTPUT_DIR / "full-results.json"
    merged = {}
    if not path.exists():
        return merged
    try:
        with open(path, encoding="utf-8") as f:
            prev = json.load(f)
        for r in prev.get("model_reports", []):
            if isinstance(r, dict) and r.get("model"):
                mname = LEGACY_MODEL_REPORT_NAMES.get(r["model"], r["model"])
                entry = {**r, "model": mname}
                merged[mname] = entry
    except Exception as e:
        print(f"  Note: could not load previous full-results.json: {e}")
    return merged


def error_report(name, model_id, errmsg):
    """Single-model failure record for the comparison JSON/MD."""
    p = PRICING.get(model_id, {"input": 1.0, "output": 5.0})
    status = f"ERROR: {errmsg}"
    return {
        "model": name,
        "model_id": model_id,
        "started": datetime.datetime.now().isoformat(),
        "sections": {
            "daily_overviews": {"quality_score": 0, "error": status},
            "hourly": {"quality_score": 0, "error": status},
            "monthly": {"quality_score": 0, "error": status},
            "synthesis": {"quality_score": 0, "error": status},
        },
        "costs": {"input_tokens": 0, "output_tokens": 0},
        "errors": [status],
        "is_hybrid": False,
        "overall_quality_score": 0.0,
        "overall_accuracy_score": 0.0,
        "vedic_accuracy": {
            "daily": {},
            "hourly": {},
            "monthly": {},
            "synthesis": {},
        },
        "cost_full_report": round(
            20000 * p["input"] / 1e6 + 41000 * p["output"] / 1e6, 4
        ),
    }


def compute_score_variance():
    print("\n--- Computing day score variance vs grandmaster ---")
    variance_results = {}
    for dt, bm in GRANDMASTER_SCORES.items():
        try:
            r = requests.post(
                f"{EPH_URL}/generate-daily-grid",
                json={"date": dt, **GEO},
                timeout=15,
            )
            live = r.json().get("day_score", 0)
            pct = abs(live - bm) / bm * 100
            variance_results[dt] = {
                "benchmark": bm,
                "live": live,
                "variance_pct": round(pct, 1),
                "within_10pct": pct <= 10,
            }
            status = "OK" if pct <= 10 else "FAIL"
            print(f"  {dt}: bm={bm} live={live} var={pct:.1f}% [{status}]")
        except Exception as e:
            print(f"  {dt}: ERROR {e}")

    n = len(variance_results)
    if n == 0:
        return {
            "per_date": {},
            "days_within_10pct": 0,
            "days_total": 0,
            "avg_variance_pct": 0.0,
            "pass": False,
        }

    days_ok = sum(1 for v in variance_results.values() if v["within_10pct"])
    avg_var = sum(v["variance_pct"] for v in variance_results.values()) / n

    print(
        f"\n  Score variance summary: {days_ok}/{n} within 10% | avg variance: {avg_var:.1f}%"
    )

    return {
        "per_date": variance_results,
        "days_within_10pct": days_ok,
        "days_total": n,
        "avg_variance_pct": round(avg_var, 1),
        "pass": days_ok >= int(n * 0.8),
    }


def get_ephemeris_for_week():
    days = []
    for dt in TEST_DATES:
        try:
            r = requests.post(
                f"{EPH_URL}/generate-daily-grid",
                json={"date": dt, **GEO},
                timeout=15,
            )
            r.raise_for_status()
            payload = r.json()
            payload["date"] = dt
            days.append(payload)
        except Exception as e:
            print(f"  Ephemeris error for {dt}: {e}")
    return days


def call_commentary_route(route, payload, model_override=None, timeout=180):
    headers = {"Content-Type": "application/json"}
    if model_override:
        payload["model_override"] = model_override
    try:
        r = requests.post(
            f"{BASE_URL}/api/commentary/{route}",
            json=payload,
            headers=headers,
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict) and data.get("error"):
            has_payload = bool(
                data.get("days")
                or data.get("slots")
                or data.get("months")
                or data.get("lagna_analysis")
                or data.get("dasha_interpretation")
            )
            if not has_payload:
                return {"error": data["error"]}
        return data
    except Exception as e:
        return {"error": str(e)}


def eval_daily_overviews(days_out):
    all_words = []
    strategy_count = 0
    caps_count = 0
    house_count = 0
    generic_total = 0
    planet_total = 0
    nakshatra_total = 0

    nakshatras = [
        "Ashwini",
        "Bharani",
        "Krittika",
        "Rohini",
        "Mrigashira",
        "Ardra",
        "Punarvasu",
        "Pushya",
        "Ashlesha",
        "Magha",
        "Purva Phalguni",
        "Uttara Phalguni",
        "Hasta",
        "Chitra",
        "Swati",
        "Vishakha",
        "Anuradha",
        "Jyeshtha",
        "Mula",
        "Purva Ashadha",
        "Uttara Ashadha",
        "Shravana",
        "Dhanishtha",
        "Shatabhisha",
        "Purva Bhadrapada",
        "Uttara Bhadrapada",
        "Revati",
    ]

    for d in days_out:
        ov = d.get("day_overview", "")
        if not ov:
            continue
        wc = len(ov.split())
        all_words.append(wc)

        if "STRATEGY" in ov:
            strategy_count += 1
        lines = ov.split("\n")
        if any(
            l.strip().isupper() and len(l.strip().split()) >= 4
            for l in lines
            if l.strip()
        ):
            caps_count += 1

        house_refs = len(
            re.findall(r"H\d+|\d+th house|\d+rd house|\d+st house", ov)
        )
        house_count += house_refs

        generic = sum(
            ov.lower().count(p)
            for p in ["may ", "could ", "might ", "perhaps ", "generally "]
        )
        generic_total += generic

        planets = sum(
            1
            for p in [
                "Jupiter",
                "Saturn",
                "Mars",
                "Venus",
                "Mercury",
                "Moon",
                "Sun",
                "Rahu",
                "Ketu",
            ]
            if p in ov
        )
        planet_total += planets

        if any(n in ov for n in nakshatras):
            nakshatra_total += 1

    n = len(days_out) or 1
    avg_wc = sum(all_words) / len(all_words) if all_words else 0
    gm_min = GRANDMASTER_STANDARDS["overview_words_min"]
    gm_max = GRANDMASTER_STANDARDS["overview_words_max"]

    return {
        "days_evaluated": n,
        "avg_word_count": round(avg_wc),
        "grandmaster_target": f"{gm_min}-{gm_max}w",
        "word_count_score": min(10, round(avg_wc / gm_min * 8)) if avg_wc else 0,
        "strategy_sections": strategy_count,
        "caps_headlines": caps_count,
        "total_house_refs": house_count,
        "total_generic_phrases": generic_total,
        "avg_planets_per_overview": round(planet_total / n, 1),
        "overviews_with_nakshatra": nakshatra_total,
        "quality_score": min(
            10,
            sum(
                [
                    min(3, round(avg_wc / gm_min * 3)) if avg_wc else 0,
                    min(2, round(strategy_count / n * 2)),
                    min(2, round(caps_count / n * 2)),
                    1 if house_count / n >= 3 else 0,
                    1 if generic_total == 0 else 0,
                    1 if nakshatra_total / n >= 0.5 else 0,
                ]
            ),
        ),
    }


def eval_hourly(slots_out):
    if not slots_out:
        return {"quality_score": 0, "error": "no slots"}
    all_wc = []
    house_refs_total = 0
    generic_total = 0
    chog_explained = 0
    directive_caps = 0

    for s in slots_out:
        c = s.get("commentary", "")
        if not c:
            continue
        wc = len(c.split())
        all_wc.append(wc)
        house_refs_total += len(
            re.findall(r"H\d+|\d+th house|\d+rd house|\d+st house", c)
        )
        generic_total += sum(
            c.lower().count(p) for p in ["may ", "could ", "might ", "perhaps "]
        )
        if any(
            x in c
            for x in ["Amrit", "Nectar", "Shubh", "Labh", "Kaal", "Udveg", "Rog", "Char"]
        ):
            chog_explained += 1
        lines = c.split("\n")
        if any(
            l.strip().isupper() and len(l.strip().split()) >= 3
            for l in lines
            if l.strip()
        ):
            directive_caps += 1

    n = len(all_wc) or 1
    avg_wc = sum(all_wc) / n if all_wc else 0
    gm_min = GRANDMASTER_STANDARDS["slot_words_min"]
    nslots = len(slots_out)

    return {
        "slots_evaluated": nslots,
        "avg_word_count": round(avg_wc),
        "grandmaster_target": f"{gm_min}-{GRANDMASTER_STANDARDS['slot_words_max']}w",
        "slots_meeting_min_wc": sum(1 for w in all_wc if w >= gm_min),
        "total_house_refs": house_refs_total,
        "choghadiya_explained": chog_explained,
        "directive_caps_lines": directive_caps,
        "generic_phrases": generic_total,
        "quality_score": min(
            10,
            sum(
                [
                    min(4, round(avg_wc / gm_min * 4)) if avg_wc else 0,
                    min(2, round(house_refs_total / n)),
                    1 if chog_explained / nslots >= 0.5 else 0,
                    1 if directive_caps / nslots >= 0.3 else 0,
                    1 if generic_total == 0 else 0,
                    1 if nslots == 18 else 0,
                ]
            ),
        ),
    }


def eval_monthly(months_out):
    if not months_out:
        return {"quality_score": 0, "error": "no months"}
    scores = [m.get("overall_score", 0) for m in months_out]
    analyses = [m.get("analysis", "") for m in months_out]
    wcs = [len(a.split()) for a in analyses if a]
    avg_wc = sum(wcs) / len(wcs) if wcs else 0
    score_spread = max(scores) - min(scores) if scores else 0

    house_total = sum(len(re.findall(r"H\d+|\d+th house", a)) for a in analyses)
    planet_total = sum(
        sum(
            1
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
            if p in a
        )
        for a in analyses
    )

    nm = len(months_out)
    gm_min = GRANDMASTER_STANDARDS["monthly_words_min"]
    smin = min(scores) if scores else 0
    smax = max(scores) if scores else 0
    return {
        "months_evaluated": nm,
        "avg_word_count": round(avg_wc),
        "grandmaster_target": f"{gm_min}+ words",
        "score_spread": score_spread,
        "score_range": f"{smin}-{smax}",
        "total_house_refs": house_total,
        "avg_planets_per_month": round(planet_total / nm, 1),
        "quality_score": min(
            10,
            sum(
                [
                    min(3, round(avg_wc / gm_min * 3)) if avg_wc else 0,
                    min(3, round(score_spread / 25 * 3)),
                    min(2, round(house_total / nm / 2)) if nm else 0,
                    1 if nm == 12 else 0,
                    1 if avg_wc >= gm_min else 0,
                ]
            ),
        ),
    }


def eval_synthesis(synth):
    if not synth:
        return {"quality_score": 0, "error": "no synthesis"}
    op = synth.get("opening_paragraph", "")
    sw = synth.get("strategic_windows", [])
    dp = synth.get("domain_priorities", {})
    cp = synth.get("closing_paragraph", "")

    op_wc = len(op.split())
    has_caps = any(
        l.strip().isupper() and len(l.strip().split()) >= 5
        for l in op.split("\n")
        if l.strip()
    )
    domains_ok = all(
        len(dp.get(k, "").split()) >= 40
        for k in ["career", "money", "health", "relationships"]
    )
    windows_with_dates = sum(
        1 for w in sw if w.get("date") and w.get("score", 0) >= 70
    )

    gm_min = GRANDMASTER_STANDARDS["synthesis_words_min"]
    return {
        "opening_words": op_wc,
        "grandmaster_target": f"{gm_min}+ words",
        "has_caps_headline": has_caps,
        "strategic_windows": len(sw),
        "windows_with_high_score": windows_with_dates,
        "domain_priorities_complete": domains_ok,
        "closing_paragraph_words": len(cp.split()),
        "quality_score": min(
            10,
            sum(
                [
                    min(3, round(op_wc / gm_min * 3)) if op_wc else 0,
                    2 if has_caps else 0,
                    min(2, len(sw)),
                    2 if domains_ok else 0,
                    1 if len(cp.split()) >= 50 else 0,
                ]
            ),
        ),
    }


def test_model(
    model_name,
    model_id,
    api_key,
    provider,
    eph_days,
    accuracy_context=None,
    anthropic_key_for_judge=None,
):
    # Commentary always goes through Next.js /api/commentary/* with model_override.
    _ = (api_key, provider)
    print(f"\n{'='*50}")
    print(f"Testing: {model_name}")
    print(f"{'='*50}")

    report = {
        "model": model_name,
        "model_id": model_id,
        "started": datetime.datetime.now().isoformat(),
        "sections": {},
        "costs": {"input_tokens": 0, "output_tokens": 0},
        "errors": [],
        "is_hybrid": False,
    }

    if not eph_days:
        report["errors"].append(
            "No ephemeris data — start: cd ephemeris-service && py -m uvicorn main:app --port 8001"
        )
        report["sections"] = {
            "daily_overviews": {"quality_score": 0, "error": "no ephemeris"},
            "hourly": {"quality_score": 0, "error": "no ephemeris"},
            "monthly": {"quality_score": 0, "error": "no ephemeris"},
            "synthesis": {"quality_score": 0, "error": "no ephemeris"},
        }
        report["overall_quality_score"] = 0.0
        report["overall_accuracy_score"] = 0.0
        report["vedic_accuracy"] = {
            "daily": {},
            "hourly": {},
            "monthly": {},
            "synthesis": {},
        }
        p = PRICING.get(model_id, {"input": 1.0, "output": 5.0})
        report["cost_full_report"] = round(
            20000 * p["input"] / 1e6 + 41000 * p["output"] / 1e6, 4
        )
        print("  SKIP all sections: no ephemeris week data")
        return report

    days_payload = []
    for d in eph_days:
        days_payload.append(
            {
                "date": d.get("date", TEST_DATES[0]),
                "panchang": d.get("panchang", {}),
                "day_score": d.get("day_score", 55),
                "rahu_kaal": d.get("rahu_kaal", {}),
                "peak_slots": [
                    s
                    for s in d.get("slots", [])
                    if s.get("score", 0) >= 75
                ][:3],
            }
        )

    print("  [1/4] Daily overviews (7 days)...")
    t0 = time.time()
    resp = call_commentary_route(
        "daily-overviews",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "days": days_payload,
            "model_override": model_id,
        },
        timeout=300,
    )
    t1 = time.time()

    if "error" in resp:
        report["errors"].append(f"daily-overviews: {resp['error']}")
        report["sections"]["daily_overviews"] = {
            "quality_score": 0,
            "error": resp["error"],
        }
    else:
        days_out = resp.get("days", [])
        eval_result = eval_daily_overviews(days_out)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["daily_overviews"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Avg words: {eval_result['avg_word_count']} | "
            f"Strategy: {eval_result['strategy_sections']}/7 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            sample_text = ""
            if len(days_out) > 2:
                sample_text = days_out[2].get("day_overview", "") or ""
            elif days_out:
                sample_text = days_out[0].get("day_overview", "") or ""
            acc = evaluate_vedic_accuracy(
                "daily_overview", sample_text, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["daily_overviews"] = eval_result
            print(
                f"     Accuracy: {acc.get('avg_accuracy', 0)}/10 | "
                f"L:{acc.get('lagna_accuracy')} Y:{acc.get('yoga_interpretation')} "
                f"D:{acc.get('dasha_coherence')} C:{acc.get('choghadiya_alignment')}"
            )
            if acc.get("critical_errors"):
                print(f"     ERRORS: {acc['critical_errors']}")

    time.sleep(3)

    print("  [2/4] Hourly commentary (1 day)...")
    sample_day = eph_days[1] if len(eph_days) > 1 else eph_days[0]
    slots_payload = [
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
        for s in sample_day.get("slots", [])
    ]

    t0 = time.time()
    resp = call_commentary_route(
        "hourly-day",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "dayIndex": 0,
            "date": TEST_DATES[1],
            "slots": slots_payload,
            "model_override": model_id,
        },
        timeout=300,
    )
    t1 = time.time()

    if "error" in resp:
        report["errors"].append(f"hourly: {resp['error']}")
        report["sections"]["hourly"] = {"quality_score": 0, "error": resp["error"]}
    else:
        slots_out = resp.get("slots", [])
        eval_result = eval_hourly(slots_out)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["hourly"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Avg words: {eval_result['avg_word_count']} | "
            f"Slots: {eval_result['slots_evaluated']}/18 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            slot_text = ""
            for s in slots_out:
                if s.get("slot_index") == 9:
                    slot_text = s.get("commentary", "") or ""
                    break
            if not slot_text and len(slots_out) > 9:
                slot_text = slots_out[9].get("commentary", "") or ""
            acc = evaluate_vedic_accuracy(
                "hourly_slot_9", slot_text, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["hourly"] = eval_result
            print(
                f"     Accuracy: {acc.get('avg_accuracy', 0)}/10 | "
                f"L:{acc.get('lagna_accuracy')} Y:{acc.get('yoga_interpretation')} "
                f"D:{acc.get('dasha_coherence')} C:{acc.get('choghadiya_alignment')}"
            )
            if acc.get("critical_errors"):
                print(f"     ERRORS: {acc['critical_errors']}")

    time.sleep(3)

    print("  [3/4] Monthly commentary (6 months)...")
    months6 = []
    start = datetime.date(2026, 3, 1)
    for i in range(6):
        y = start.year + (start.month + i - 1) // 12
        mo = (start.month + i - 1) % 12 + 1
        d = datetime.date(y, mo, 1)
        months6.append(
            {
                "month_label": d.strftime("%B %Y"),
                "month_index": i,
                "key_transits_hint": "",
            }
        )

    t0 = time.time()
    resp = call_commentary_route(
        "months-first",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "startMonth": "2026-03",
            "months": months6,
            "model_override": model_id,
        },
        timeout=300,
    )
    t1 = time.time()

    if "error" in resp:
        report["errors"].append(f"monthly: {resp['error']}")
        report["sections"]["monthly"] = {"quality_score": 0, "error": resp["error"]}
    else:
        months_out = resp.get("months", [])
        eval_result = eval_monthly(months_out)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["monthly"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Avg words: {eval_result['avg_word_count']} | "
            f"Score spread: {eval_result['score_spread']} | "
            f"Range: {eval_result['score_range']} | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge and months_out:
            midx = 2 if len(months_out) > 2 else 0
            mtext = months_out[midx].get("analysis", "") or ""
            acc = evaluate_vedic_accuracy(
                "monthly_analysis", mtext, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["monthly"] = eval_result
            print(
                f"     Accuracy: {acc.get('avg_accuracy', 0)}/10 | "
                f"L:{acc.get('lagna_accuracy')} Y:{acc.get('yoga_interpretation')} "
                f"D:{acc.get('dasha_coherence')} C:{acc.get('choghadiya_alignment')}"
            )
            if acc.get("critical_errors"):
                print(f"     ERRORS: {acc['critical_errors']}")

    time.sleep(3)

    print("  [4/4] Synthesis...")
    base = datetime.date(2026, 3, 8)
    weeks_p = []
    for i in range(6):
        ws = base + datetime.timedelta(weeks=i)
        we = base + datetime.timedelta(weeks=i + 1) - datetime.timedelta(days=1)
        chunk = eph_days[i * 7 : (i + 1) * 7]
        daily_scores = [d.get("day_score", 55) for d in chunk] or [
            59,
            52,
            74,
            70,
            59,
            34,
            42,
        ]
        weeks_p.append(
            {
                "week_index": i,
                "week_label": f"Week {i+1}",
                "start_date": str(ws),
                "end_date": str(we),
                "daily_scores": daily_scores,
            }
        )

    t0 = time.time()
    resp = call_commentary_route(
        "weeks-synthesis",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "reportStartDate": "2026-03-08",
            "weeks": weeks_p,
            "synthesis_context": {
                "total_days": 7,
                "best_date": "2026-03-10",
                "best_score": 76,
                "worst_date": "2026-03-13",
                "worst_score": 34,
                "avg_score": 58,
            },
            "model_override": model_id,
        },
        timeout=300,
    )
    t1 = time.time()

    if "error" in resp:
        report["errors"].append(f"synthesis: {resp['error']}")
        report["sections"]["synthesis"] = {"quality_score": 0, "error": resp["error"]}
    else:
        synth = resp.get("period_synthesis", {})
        eval_result = eval_synthesis(synth)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["synthesis"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Opening: {eval_result['opening_words']}w | "
            f"Windows: {eval_result['strategic_windows']} | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            op = synth.get("opening_paragraph", "") or ""
            acc = evaluate_vedic_accuracy(
                "synthesis_opening", op, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["synthesis"] = eval_result
            print(
                f"     Accuracy: {acc.get('avg_accuracy', 0)}/10 | "
                f"L:{acc.get('lagna_accuracy')} Y:{acc.get('yoga_interpretation')} "
                f"D:{acc.get('dasha_coherence')} C:{acc.get('choghadiya_alignment')}"
            )
            if acc.get("critical_errors"):
                print(f"     ERRORS: {acc['critical_errors']}")

    section_scores = [
        s.get("quality_score", 0) for s in report["sections"].values()
    ]
    report["overall_quality_score"] = (
        round(sum(section_scores) / len(section_scores), 1) if section_scores else 0
    )

    report["vedic_accuracy"] = {
        "daily": report["sections"].get("daily_overviews", {}).get("vedic_accuracy", {}),
        "hourly": report["sections"].get("hourly", {}).get("vedic_accuracy", {}),
        "monthly": report["sections"].get("monthly", {}).get("vedic_accuracy", {}),
        "synthesis": report["sections"].get("synthesis", {}).get("vedic_accuracy", {}),
    }
    acc_scores = [
        v.get("avg_accuracy", 0)
        for v in report["vedic_accuracy"].values()
        if isinstance(v, dict) and v.get("avg_accuracy", 0) > 0
    ]
    report["overall_accuracy_score"] = (
        round(sum(acc_scores) / len(acc_scores), 1) if acc_scores else 0.0
    )

    total_in = 20000
    total_out = 41000
    p = PRICING.get(model_id, {"input": 1.0, "output": 5.0})
    report["cost_full_report"] = round(
        total_in * p["input"] / 1e6 + total_out * p["output"] / 1e6, 4
    )

    print(f"\n  OVERALL QUALITY: {report['overall_quality_score']}/10")
    print(f"  ACCURACY: {report.get('overall_accuracy_score', 0)}/10")
    print(f"  COST/REPORT: ${report['cost_full_report']}")
    if report["errors"]:
        print(f"  ERRORS: {report['errors']}")

    return report


def test_hybrid(
    combo_name,
    section_models,
    eph_days,
    accuracy_context=None,
    anthropic_key_for_judge=None,
):
    """
    Per-section model_override. section_models keys:
    daily_overviews, hourly, monthly, synthesis, nativity -> model_id
    """
    print(f"\n{'#' * 50}\nHYBRID COMBO: {combo_name}\n{'#' * 50}")

    report = {
        "model": f"Combo: {combo_name}",
        "model_id": "hybrid",
        "is_hybrid": True,
        "hybrid_sections": dict(section_models),
        "started": datetime.datetime.now().isoformat(),
        "sections": {},
        "errors": [],
        "costs": {"input_tokens": 0, "output_tokens": 0},
        "cost_full_report": estimate_hybrid_cost(section_models),
    }

    if not eph_days:
        report["errors"].append("No ephemeris data")
        report["sections"] = {
            k: {"quality_score": 0, "error": "no ephemeris"}
            for k in (
                "daily_overviews",
                "hourly",
                "monthly",
                "synthesis",
                "nativity",
            )
        }
        report["overall_quality_score"] = 0.0
        report["overall_accuracy_score"] = 0.0
        report["vedic_accuracy"] = {
            "daily": {},
            "hourly": {},
            "monthly": {},
            "synthesis": {},
            "nativity": {},
        }
        return report

    days_payload = []
    for d in eph_days:
        days_payload.append(
            {
                "date": d.get("date", TEST_DATES[0]),
                "panchang": d.get("panchang", {}),
                "day_score": d.get("day_score", 55),
                "rahu_kaal": d.get("rahu_kaal", {}),
                "peak_slots": [
                    s for s in d.get("slots", []) if s.get("score", 0) >= 75
                ][:3],
            }
        )

    mid = section_models["daily_overviews"]
    print("  [1/5] Daily overviews...")
    t0 = time.time()
    resp = call_commentary_route(
        "daily-overviews",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "days": days_payload,
        },
        model_override=mid,
        timeout=300,
    )
    t1 = time.time()
    if "error" in resp:
        report["errors"].append(f"daily: {resp['error']}")
        report["sections"]["daily_overviews"] = {
            "quality_score": 0,
            "error": resp["error"],
        }
    else:
        days_out = resp.get("days", [])
        eval_result = eval_daily_overviews(days_out)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["daily_overviews"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            sample_text = (
                (days_out[2].get("day_overview", "") if len(days_out) > 2 else "")
                or (days_out[0].get("day_overview", "") if days_out else "")
            )
            acc = evaluate_vedic_accuracy(
                "daily_overview", sample_text, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["daily_overviews"] = eval_result
            print(f"     Accuracy: {acc.get('avg_accuracy', 0)}/10")
    time.sleep(2)

    sample_day = eph_days[1] if len(eph_days) > 1 else eph_days[0]
    slots_payload = [
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
        for s in sample_day.get("slots", [])
    ]
    mid = section_models["hourly"]
    print("  [2/5] Hourly...")
    t0 = time.time()
    resp = call_commentary_route(
        "hourly-day",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "dayIndex": 0,
            "date": TEST_DATES[1],
            "slots": slots_payload,
        },
        model_override=mid,
        timeout=300,
    )
    t1 = time.time()
    if "error" in resp:
        report["errors"].append(f"hourly: {resp['error']}")
        report["sections"]["hourly"] = {"quality_score": 0, "error": resp["error"]}
    else:
        slots_out = resp.get("slots", [])
        eval_result = eval_hourly(slots_out)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["hourly"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            slot_text = ""
            for s in slots_out:
                if s.get("slot_index") == 9:
                    slot_text = s.get("commentary", "") or ""
                    break
            if not slot_text and len(slots_out) > 9:
                slot_text = slots_out[9].get("commentary", "") or ""
            acc = evaluate_vedic_accuracy(
                "hourly_slot_9", slot_text, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["hourly"] = eval_result
            print(f"     Accuracy: {acc.get('avg_accuracy', 0)}/10")
    time.sleep(2)

    months6 = []
    start = datetime.date(2026, 3, 1)
    for i in range(6):
        y = start.year + (start.month + i - 1) // 12
        mo = (start.month + i - 1) % 12 + 1
        d = datetime.date(y, mo, 1)
        months6.append(
            {
                "month_label": d.strftime("%B %Y"),
                "month_index": i,
                "key_transits_hint": "",
            }
        )
    mid = section_models["monthly"]
    print("  [3/5] Monthly...")
    t0 = time.time()
    resp = call_commentary_route(
        "months-first",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "startMonth": "2026-03",
            "months": months6,
        },
        model_override=mid,
        timeout=300,
    )
    t1 = time.time()
    if "error" in resp:
        report["errors"].append(f"monthly: {resp['error']}")
        report["sections"]["monthly"] = {"quality_score": 0, "error": resp["error"]}
    else:
        months_out = resp.get("months", [])
        eval_result = eval_monthly(months_out)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["monthly"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge and months_out:
            midx = 2 if len(months_out) > 2 else 0
            mtext = months_out[midx].get("analysis", "") or ""
            acc = evaluate_vedic_accuracy(
                "monthly_analysis", mtext, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["monthly"] = eval_result
            print(f"     Accuracy: {acc.get('avg_accuracy', 0)}/10")
    time.sleep(2)

    base = datetime.date(2026, 3, 8)
    weeks_p = []
    for i in range(6):
        ws = base + datetime.timedelta(weeks=i)
        we = base + datetime.timedelta(weeks=i + 1) - datetime.timedelta(days=1)
        chunk = eph_days[i * 7 : (i + 1) * 7]
        daily_scores = [d.get("day_score", 55) for d in chunk] or [
            59,
            52,
            74,
            70,
            59,
            34,
            42,
        ]
        weeks_p.append(
            {
                "week_index": i,
                "week_label": f"Week {i+1}",
                "start_date": str(ws),
                "end_date": str(we),
                "daily_scores": daily_scores,
            }
        )
    mid = section_models["synthesis"]
    print("  [4/5] Synthesis...")
    t0 = time.time()
    resp = call_commentary_route(
        "weeks-synthesis",
        {
            "lagnaSign": LAGNA,
            "mahadasha": MD,
            "antardasha": AD,
            "reportStartDate": "2026-03-08",
            "weeks": weeks_p,
            "synthesis_context": {
                "total_days": 7,
                "best_date": "2026-03-10",
                "best_score": 76,
                "worst_date": "2026-03-13",
                "worst_score": 34,
                "avg_score": 58,
            },
        },
        model_override=mid,
        timeout=300,
    )
    t1 = time.time()
    if "error" in resp:
        report["errors"].append(f"synthesis: {resp['error']}")
        report["sections"]["synthesis"] = {"quality_score": 0, "error": resp["error"]}
    else:
        synth = resp.get("period_synthesis", {})
        eval_result = eval_synthesis(synth)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["synthesis"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            op = synth.get("opening_paragraph", "") or ""
            acc = evaluate_vedic_accuracy(
                "synthesis_opening", op, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["synthesis"] = eval_result
            print(f"     Accuracy: {acc.get('avg_accuracy', 0)}/10")
    time.sleep(2)

    nat_body = build_nativity_payload(eph_days)
    mid = section_models["nativity"]
    print("  [5/5] Nativity...")
    t0 = time.time()
    resp = call_commentary_route(
        "nativity-text", nat_body, model_override=mid, timeout=300
    )
    t1 = time.time()
    if "error" in resp:
        report["errors"].append(f"nativity: {resp['error']}")
        report["sections"]["nativity"] = {"quality_score": 0, "error": resp["error"]}
    else:
        eval_result = eval_nativity(resp)
        eval_result["time_seconds"] = round(t1 - t0, 1)
        report["sections"]["nativity"] = eval_result
        print(
            f"     Quality: {eval_result['quality_score']}/10 | "
            f"Time: {eval_result['time_seconds']}s"
        )
        if accuracy_context and anthropic_key_for_judge:
            ntxt = (
                (resp.get("lagna_analysis") or "")
                + "\n\n"
                + (resp.get("dasha_interpretation") or "")
            )
            acc = evaluate_vedic_accuracy(
                "nativity", ntxt, accuracy_context, anthropic_key_for_judge
            )
            eval_result["vedic_accuracy"] = acc
            report["sections"]["nativity"] = eval_result
            print(f"     Accuracy: {acc.get('avg_accuracy', 0)}/10")

    section_scores = [
        s.get("quality_score", 0)
        for s in report["sections"].values()
        if isinstance(s, dict) and "quality_score" in s
    ]
    report["overall_quality_score"] = (
        round(sum(section_scores) / len(section_scores), 1) if section_scores else 0.0
    )
    report["vedic_accuracy"] = {
        "daily": report["sections"].get("daily_overviews", {}).get("vedic_accuracy", {}),
        "hourly": report["sections"].get("hourly", {}).get("vedic_accuracy", {}),
        "monthly": report["sections"].get("monthly", {}).get("vedic_accuracy", {}),
        "synthesis": report["sections"].get("synthesis", {}).get("vedic_accuracy", {}),
        "nativity": report["sections"].get("nativity", {}).get("vedic_accuracy", {}),
    }
    acc_scores = [
        v.get("avg_accuracy", 0)
        for v in report["vedic_accuracy"].values()
        if isinstance(v, dict) and v.get("avg_accuracy", 0) > 0
    ]
    report["overall_accuracy_score"] = (
        round(sum(acc_scores) / len(acc_scores), 1) if acc_scores else 0.0
    )

    print(
        f"\n  COMBO QUALITY: {report['overall_quality_score']}/10 | "
        f"ACCURACY: {report['overall_accuracy_score']}/10 | "
        f"EST COST: ${report['cost_full_report']}"
    )
    return report


def avg_vedic_dim(vedic_acc, dkey, include_nativity=False):
    """Mean of a judge dimension across section-level scores."""
    vals = []
    if not isinstance(vedic_acc, dict):
        return "--"
    secs = ["daily", "hourly", "monthly", "synthesis"]
    if include_nativity:
        secs.append("nativity")
    for sec in secs:
        b = vedic_acc.get(sec)
        if isinstance(b, dict):
            v = b.get(dkey)
            if isinstance(v, (int, float)):
                vals.append(float(v))
    if not vals:
        return "--"
    return str(round(sum(vals) / len(vals), 1))


def combined_quality_accuracy(quality, accuracy):
    return round(float(quality or 0) * 0.4 + float(accuracy or 0) * 0.6, 2)


def collect_all_critical_errors(reports):
    out = []
    for r in reports:
        m = r.get("model", "?")
        va = r.get("vedic_accuracy") or {}
        if isinstance(va, dict):
            for sec, block in va.items():
                if not isinstance(block, dict):
                    continue
                for err in block.get("critical_errors") or []:
                    if err:
                        out.append((m, sec, str(err)))
    return out


def main():
    print("=== JYOTISH AI FULL REPORT MODEL COMPARISON ===")
    print("Evaluates complete report quality across all sections")
    print("plus day score variance against grandmaster benchmark\n")

    env = {}
    try:
        with open(".env.local") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    except OSError:
        pass

    anthropic_key = env.get("ANTHROPIC_API_KEY", "")
    openai_key = env.get("OPENAI_API_KEY", "")
    gemini_key = env.get("GEMINI_API_KEY", "")
    deepseek_key = env.get("DEEPSEEK_API_KEY", "")
    grok_key = env.get("GROK_API_KEY", "")

    print("STEP 1: Computing day score variance vs grandmaster")
    score_variance = compute_score_variance()

    print("\nSTEP 2: Fetching ephemeris for test week")
    eph_days = get_ephemeris_for_week()
    print(f"  Got {len(eph_days)} days of ephemeris data")
    if len(eph_days) < 7:
        print("  WARNING: need 7 days of ephemeris; commentary may be thin.")

    accuracy_context = build_accuracy_context(eph_days, GRANDMASTER_SCORES)
    print(
        f"  Accuracy context: {accuracy_context['date']} | "
        f"Yoga: {accuracy_context['yoga']} | "
        f"Best slot: {accuracy_context['best_slot']['time']} "
        f"(score={accuracy_context['best_slot']['score']})"
    )
    judge_key = (
        anthropic_key
        if anthropic_key and str(anthropic_key).strip() and not str(anthropic_key).startswith("your_")
        else None
    )
    if not judge_key:
        print(
            "  WARNING: ANTHROPIC_API_KEY missing or placeholder — "
            "Vedic accuracy judge will skip (scores stay 0)."
        )

    ALL_MODEL_DEFINITIONS = [
        ("Claude Haiku 4.5", "claude-haiku-4-5-20251001", "anthropic", anthropic_key),
        ("Claude Sonnet 4.6", "claude-sonnet-4-6", "anthropic", anthropic_key),
        ("DeepSeek V3.2", "deepseek-chat", "deepseek", deepseek_key),
        ("DeepSeek R1", "deepseek-reasoner", "deepseek", deepseek_key),
        ("GPT-5.4 nano", "gpt-5.4-nano", "openai", openai_key),
        ("GPT-5.4 mini", "gpt-5.4-mini", "openai", openai_key),
        (
            "GPT-5.4 Reasoning-High",
            "gpt-5.4-high-reasoning",
            "openai",
            openai_key,
        ),
        # Use live Gemini API model IDs (preview names often 404).
        ("Gemini 2.5 Flash", "gemini-2.0-flash", "gemini", gemini_key),
        ("Gemini 3.1 Pro", "gemini-1.5-pro", "gemini", gemini_key),
        ("Grok 4", "grok-4", "grok_chat", grok_key),
        ("Grok 4.1 Fast Reasoning", "grok-4-1-fast-reasoning", "grok_chat", grok_key),
        ("Grok 4.20 Multi-Agent", "grok-4.20-multi-agent", "grok_responses", grok_key),
        (
            "Grok 4.20 Reasoning",
            "grok-4.20-beta-0309-reasoning",
            "grok_responses",
            grok_key,
        ),
    ]

    allowed_names = {m[0] for m in ALL_MODEL_DEFINITIONS}
    grok_display_names = {
        m[0] for m in ALL_MODEL_DEFINITIONS if m[2] in ("grok_chat", "grok_responses")
    }
    need_grok_this_run = RUN_HYBRID_COMBOS or (
        RUN_SOLO_MODELS
        and ((not MODELS_TO_RUN) or any(n in grok_display_names for n in MODELS_TO_RUN))
    )
    if need_grok_this_run and (
        not grok_key or not str(grok_key).strip() or str(grok_key).startswith("your_")
    ):
        print(
            "\nGROK_API_KEY not found in .env.local (needed for Grok comparison rows).\n"
            "  Get a key at: https://console.x.ai\n"
            "  Add: GROK_API_KEY=xai-...\n"
            "  Then re-run the comparison.\n"
        )

    combo_reports = []

    if RUN_SOLO_MODELS:
        if MODELS_TO_RUN:
            merged_by_name = {
                k: v
                for k, v in load_merged_model_reports().items()
                if k in allowed_names and not str(k).startswith("Combo:")
            }
            run_set = set(MODELS_TO_RUN)
            models = [m for m in ALL_MODEL_DEFINITIONS if m[0] in run_set]
            print(
                f"\nMODELS_TO_RUN: {len(models)} model(s) this run "
                f"(merge with {len(merged_by_name)} from full-results.json)\n"
            )
        else:
            models = ALL_MODEL_DEFINITIONS
            merged_by_name = {}

        for name, model_id, provider, api_key in models:
            if not api_key or api_key.startswith("your_") or not api_key.strip():
                key_hint = (
                    "GROK" if provider in ("grok_chat", "grok_responses") else provider.upper()
                )
                print(f"\nSKIP {name} -- add {key_hint}_API_KEY to .env.local")
                continue
            try:
                report = test_model(
                    name,
                    model_id,
                    api_key,
                    provider,
                    eph_days,
                    accuracy_context=accuracy_context,
                    anthropic_key_for_judge=judge_key,
                )
            except Exception as e:
                err = str(e)
                print(f"\nERROR {name}: {err}")
                report = error_report(name, model_id, err)
            merged_by_name[name] = report
            time.sleep(5)
    else:
        merged_by_name = {
            k: v
            for k, v in load_merged_model_reports().items()
            if k in allowed_names and not str(k).startswith("Combo:")
        }
        print(
            f"\nRUN_SOLO_MODELS=False — using {len(merged_by_name)} solo row(s) "
            f"from full-results.json (no solo API re-run).\n"
        )
        if not merged_by_name:
            print(
                "  WARNING: no solo data in full-results.json — "
                "Part 2 will be empty until you run with RUN_SOLO_MODELS=True.\n"
            )

    if RUN_HYBRID_COMBOS:
        print("\n--- Hybrid combo runs ---\n")
        for combo in HYBRID_COMBOS:
            try:
                cr = test_hybrid(
                    combo["name"],
                    combo["sections"],
                    eph_days,
                    accuracy_context=accuracy_context,
                    anthropic_key_for_judge=judge_key,
                )
            except Exception as e:
                print(f"\nERROR Combo {combo['name']}: {e}")
                cr = {
                    "model": f"Combo: {combo['name']}",
                    "model_id": "hybrid",
                    "is_hybrid": True,
                    "hybrid_sections": dict(combo["sections"]),
                    "started": datetime.datetime.now().isoformat(),
                    "sections": {},
                    "errors": [str(e)],
                    "overall_quality_score": 0.0,
                    "overall_accuracy_score": 0.0,
                    "vedic_accuracy": {},
                    "cost_full_report": estimate_hybrid_cost(combo["sections"]),
                }
            combo_reports.append(cr)
            time.sleep(3)

    order_index = {name: i for i, (name, *_rest) in enumerate(ALL_MODEL_DEFINITIONS)}
    all_reports = sorted(
        merged_by_name.values(),
        key=lambda r: (order_index.get(r.get("model", ""), 999), r.get("model", "")),
    )

    print("\n\nGenerating comparison report...")

    output = {
        "generated": datetime.datetime.now().isoformat(),
        "score_variance": score_variance,
        "accuracy_context": accuracy_context,
        "model_reports": all_reports,
        "combo_reports": combo_reports,
    }
    with open(OUTPUT_DIR / "full-results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    sonnet = next((r for r in all_reports if "Sonnet" in r["model"]), None)
    baseline = sonnet or (all_reports[0] if all_reports else None)

    var_pass = "PASS" if score_variance["pass"] else "FAIL"
    md = f"""# Jyotish AI -- Full Report Model Comparison
Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}

---

## Part 1: Day Score Variance vs Grandmaster Benchmark

The scoring engine is model-independent (Python ephemeris).
This measures formula accuracy, not AI quality.

| Metric | Value | Target |
|--------|-------|--------|
| Days within 10% variance | {score_variance['days_within_10pct']}/{score_variance['days_total']} | 18/22 (80%) |
| Average variance | {score_variance['avg_variance_pct']}% | <10% |
| Status | {var_pass} | -- |

### Per-Date Breakdown
| Date | Benchmark | Live | Variance | Status |
|------|-----------|------|----------|--------|
"""
    for dt, v in sorted(score_variance["per_date"].items()):
        st = "OK" if v["within_10pct"] else "FAIL"
        md += (
            f"| {dt} | {v['benchmark']} | {v['live']} | "
            f"{v['variance_pct']}% | {st} |\n"
        )

    md += f"""
---

## Part 2: Commentary Quality by Model

Sections evaluated:
- **Daily Overviews** (7 days): word count, STRATEGY sections,
  ALL-CAPS headlines, house references, no generic language
- **Hourly Commentary** (18 slots x 1 day): word count per slot,
  house refs, choghadiya explained, directive CAPS lines
- **Monthly Analysis** (6 months): word count, score spread,
  house refs, planet references
- **Synthesis**: opening paragraph length, CAPS headline,
  strategic windows, domain priorities completeness

Grandmaster standards:
- Daily overview: {GRANDMASTER_STANDARDS['overview_words_min']}-{GRANDMASTER_STANDARDS['overview_words_max']} words
- Hourly slot: {GRANDMASTER_STANDARDS['slot_words_min']}-{GRANDMASTER_STANDARDS['slot_words_max']} words
- Monthly: {GRANDMASTER_STANDARDS['monthly_words_min']}+ words
- Synthesis opening: {GRANDMASTER_STANDARDS['synthesis_words_min']}+ words

### Overall Quality Scores

Structural quality + **Vedic accuracy** (Claude Sonnet judge on lagna/yoga/dasha/choghadiya/consistency).

| Model | Quality /10 | Accuracy /10 | Lagna | Yoga | Dasha | Chog | Cost | vs baseline |
|-------|------------|--------------|-------|------|-------|------|------|-------------|
"""
    for r in sorted(
        all_reports, key=lambda x: x["overall_quality_score"], reverse=True
    ):
        s = r["sections"]
        savings = ""
        if baseline and r["model"] != baseline["model"]:
            den = baseline["cost_full_report"] or 1
            pct = round((1 - r["cost_full_report"] / den) * 100)
            savings = f"{pct}% cheaper"
        elif baseline:
            savings = "baseline"
        va = r.get("vedic_accuracy") or {}
        acc = r.get("overall_accuracy_score", 0) or 0

        md += (
            f"| **{r['model']}** | "
            f"**{r['overall_quality_score']}/10** | "
            f"**{acc}/10** | "
            f"{avg_vedic_dim(va, 'lagna_accuracy')} | "
            f"{avg_vedic_dim(va, 'yoga_interpretation')} | "
            f"{avg_vedic_dim(va, 'dasha_coherence')} | "
            f"{avg_vedic_dim(va, 'choghadiya_alignment')} | "
            f"**${r['cost_full_report']:.4f}** | "
            f"{savings} |\n"
        )
    md += (
        "\n*Lagna / Yoga / Dasha / Choghadiya columns = mean of Sonnet judge scores "
        "across daily, hourly, monthly, and synthesis samples.*\n\n"
    )

    md += "\n### Detailed Section Analysis\n\n"

    for r in all_reports:
        s = r["sections"]
        md += f"#### {r['model']}\n\n"

        do = s.get("daily_overviews", {})
        if do.get("quality_score") is not None and "error" not in do:
            md += f"**Daily Overviews** (Quality: {do.get('quality_score')}/10)\n"
            md += (
                f"- Avg word count: {do.get('avg_word_count')} "
                f"(target: {do.get('grandmaster_target')})\n"
                f"- STRATEGY sections: {do.get('strategy_sections')}/7\n"
                f"- ALL-CAPS headlines: {do.get('caps_headlines')}/7\n"
                f"- Total house references: {do.get('total_house_refs')}\n"
                f"- Generic phrases: {do.get('total_generic_phrases')} "
                f"(target: 0)\n"
                f"- Overviews with nakshatra: "
                f"{do.get('overviews_with_nakshatra')}/7\n\n"
            )
        elif do.get("error"):
            md += f"**Daily Overviews**: ERROR {do.get('error')}\n\n"

        ho = s.get("hourly", {})
        if ho.get("quality_score") is not None and "error" not in ho:
            md += f"**Hourly Commentary** (Quality: {ho.get('quality_score')}/10)\n"
            md += (
                f"- Slots evaluated: {ho.get('slots_evaluated')}/18\n"
                f"- Avg word count: {ho.get('avg_word_count')} "
                f"(target: {ho.get('grandmaster_target')})\n"
                f"- Slots meeting min word count: "
                f"{ho.get('slots_meeting_min_wc')}/18\n"
                f"- Total house refs: {ho.get('total_house_refs')}\n"
                f"- Choghadiya explained: "
                f"{ho.get('choghadiya_explained')}/18\n"
                f"- Directive CAPS lines: "
                f"{ho.get('directive_caps_lines')}/18\n\n"
            )
        elif ho.get("error"):
            md += f"**Hourly**: ERROR {ho.get('error')}\n\n"

        mo = s.get("monthly", {})
        if mo.get("quality_score") is not None and "error" not in mo:
            md += f"**Monthly Commentary** (Quality: {mo.get('quality_score')}/10)\n"
            md += (
                f"- Avg word count: {mo.get('avg_word_count')} "
                f"(target: {mo.get('grandmaster_target')})\n"
                f"- Score spread: {mo.get('score_spread')} "
                f"(range: {mo.get('score_range')})\n"
                f"- Total house refs: {mo.get('total_house_refs')}\n"
                f"- Avg planets/month: "
                f"{mo.get('avg_planets_per_month')}\n\n"
            )
        elif mo.get("error"):
            md += f"**Monthly**: ERROR {mo.get('error')}\n\n"

        sy = s.get("synthesis", {})
        if sy.get("quality_score") is not None and "error" not in sy:
            md += f"**Synthesis** (Quality: {sy.get('quality_score')}/10)\n"
            md += (
                f"- Opening paragraph: {sy.get('opening_words')}w "
                f"(target: {sy.get('grandmaster_target')})\n"
                f"- ALL-CAPS headline: {sy.get('has_caps_headline')}\n"
                f"- Strategic windows: {sy.get('strategic_windows')}\n"
                f"- Windows with high score (70+): "
                f"{sy.get('windows_with_high_score')}\n"
                f"- Domain priorities complete: "
                f"{sy.get('domain_priorities_complete')}\n\n"
            )
        elif sy.get("error"):
            md += f"**Synthesis**: ERROR {sy.get('error')}\n\n"

        if r.get("errors"):
            md += f"**Errors:** {', '.join(r['errors'])}\n\n"

        md += "---\n\n"

    if all_reports and baseline:
        cheapest = min(all_reports, key=lambda x: x["cost_full_report"])
        best_quality = max(all_reports, key=lambda x: x["overall_quality_score"])

        md += "## Part 3: Cost at Scale\n\n"
        md += f"**Best quality:** {best_quality['model']} ({best_quality['overall_quality_score']}/10)\n"
        md += f"**Cheapest:** {cheapest['model']} (${cheapest['cost_full_report']:.4f}/report)\n"
        bl = "Claude Sonnet 4.6" if sonnet else baseline["model"]
        md += f"**Baseline ({bl}):** ${baseline['cost_full_report']:.4f}/report\n\n"
        md += "| Reports/month | "
        for r in all_reports:
            md += f"{r['model']} | "
        md += "\n|---|"
        for _ in all_reports:
            md += "---|"
        md += "\n"

        for vol in [100, 500, 1000, 5000]:
            md += f"| {vol:,} |"
            for r in all_reports:
                cost = r["cost_full_report"] * vol
                md += f" ${cost:.2f} |"
            md += "\n"

    crit_lines = collect_all_critical_errors(all_reports + combo_reports)
    unified_rank = all_reports + combo_reports
    best_combo = None
    if combo_reports:
        best_combo = max(
            combo_reports,
            key=lambda x: combined_quality_accuracy(
                x.get("overall_quality_score", 0),
                x.get("overall_accuracy_score", 0),
            ),
        )

    part4 = "\n---\n\n## Part 4: Hybrid Combo Results\n\n"
    if combo_reports:
        part4 += "### Combo Summary\n\n"
        part4 += (
            "| Combo | Quality | Accuracy | Lagna | Yoga | Dasha | Chog | "
            "Est. $/report | vs Sonnet |\n"
            "|-------|---------|----------|-------|------|-------|------|---------------|-------------|\n"
        )
        bl_cost = baseline["cost_full_report"] if baseline else 1
        for cr in combo_reports:
            va = cr.get("vedic_accuracy") or {}
            vs = (
                round((1 - cr.get("cost_full_report", 0) / bl_cost) * 100)
                if bl_cost
                else 0
            )
            part4 += (
                f"| **{cr['model']}** | "
                f"{cr.get('overall_quality_score', 0)}/10 | "
                f"{cr.get('overall_accuracy_score', 0)}/10 | "
                f"{avg_vedic_dim(va, 'lagna_accuracy', True)} | "
                f"{avg_vedic_dim(va, 'yoga_interpretation', True)} | "
                f"{avg_vedic_dim(va, 'dasha_coherence', True)} | "
                f"{avg_vedic_dim(va, 'choghadiya_alignment', True)} | "
                f"${cr.get('cost_full_report', 0):.4f} | "
                f"{vs}% cheaper |\n"
            )
        part4 += "\n**Per-section models:**\n\n"
        for cr in combo_reports:
            hs = cr.get("hybrid_sections") or {}
            part4 += f"- **{cr['model']}**:\n\n```json\n{json.dumps(hs, indent=2)}\n```\n\n"
    else:
        part4 += "_No combo runs (`RUN_HYBRID_COMBOS=False`)._\n\n"

    part4 += "### Critical Errors Found\n\n"
    if crit_lines:
        for m, sec, e in crit_lines:
            part4 += f"- **{m}** ({sec}): {e}\n"
    else:
        part4 += "_None recorded._\n"
    part4 += "\n### Quality × Accuracy Matrix\n\n"
    part4 += (
        "Combined = **quality × 0.4 + accuracy × 0.6** "
        "(Vedic correctness weighted higher).\n\n"
        "| Model | Quality | Accuracy | Combined | Type |\n"
        "|-------|---------|----------|----------|------|\n"
    )
    for r in sorted(
        unified_rank,
        key=lambda x: combined_quality_accuracy(
            x.get("overall_quality_score", 0),
            x.get("overall_accuracy_score", 0),
        ),
        reverse=True,
    ):
        part4 += (
            f"| **{r['model']}** | {r.get('overall_quality_score', 0)} | "
            f"{r.get('overall_accuracy_score', 0)} | "
            f"**{combined_quality_accuracy(r.get('overall_quality_score'), r.get('overall_accuracy_score'))}** | "
            f"{'Combo' if r.get('is_hybrid') else 'Solo'} |\n"
        )

    part4 += "\n### Final Recommendation (auto)\n\n"
    if best_combo:
        bn = best_combo["model"]
        bq = best_combo.get("overall_quality_score", 0)
        ba = best_combo.get("overall_accuracy_score", 0)
        bcost = best_combo.get("cost_full_report", 0)
        bl_cost = baseline["cost_full_report"] if baseline else 1
        pct_ch = round((1 - bcost / bl_cost) * 100) if bl_cost else 0
        combo_crits = [t for t in crit_lines if t[0] == bn]
        switch = "YES" if ba >= 6 and not combo_crits else "NO"
        reason = (
            "Highest combined score among hybrid stacks with acceptable judge accuracy."
            if switch == "YES"
            else "Low judge accuracy and/or critical factual errors — do not ship without review."
        )
        err_txt = "; ".join(c[2] for c in combo_crits) if combo_crits else "none"
        part4 += (
            f"**PRODUCTION RECOMMENDATION:** *{bn}* scores **{bq}/10** structural quality "
            f"and **{ba}/10** Vedic accuracy at **${bcost:.4f}/report** "
            f"(**~{pct_ch}%** vs Sonnet solo baseline on est. cost).\n\n"
            f"- **Critical errors (this combo):** {err_txt}\n"
            f"- **Switch immediately:** **{switch}**\n"
            f"- **Reason:** {reason}\n"
        )
    else:
        part4 += "_No hybrid combos evaluated — use solo matrix and accuracy columns in Part 2._\n"

    md += part4

    md += f"""

## Recommendation

Based on this evaluation:

**If quality is paramount:** Choose the model with highest
overall score -- likely Claude Sonnet or GPT-5.4.

**If Vedic correctness matters:** Prefer high **Accuracy /10** and zero **Critical Errors**
even if word-count quality is slightly lower.

**If cost/quality balance matters:** See Part 4 hybrid combos and the Quality × Accuracy matrix.

Score variance ({score_variance['days_within_10pct']}/{score_variance['days_total']} days within 10%) is
independent of the AI model -- it is a formula problem,
not a model problem. Fix the formula in main.py separately.
"""

    with open(OUTPUT_DIR / "full-report.md", "w", encoding="utf-8") as f:
        f.write(md)

    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(
        f"\nScore variance: {score_variance['days_within_10pct']}"
        f"/{score_variance['days_total']} days within 10% "
        f"(avg {score_variance['avg_variance_pct']}%)"
    )
    print("\nModel quality ranking (structural):")
    for r in sorted(
        all_reports, key=lambda x: x["overall_quality_score"], reverse=True
    ):
        q = int(r["overall_quality_score"])
        bar = "#" * q + "-" * (10 - q)
        print(
            f"  {r['model']:25} {bar} "
            f"{r['overall_quality_score']}/10  "
            f"${r['cost_full_report']:.4f}/report"
        )

    if combo_reports:
        print("\nHybrid combos (combined = 0.4×quality + 0.6×accuracy):")
        for cr in sorted(
            combo_reports,
            key=lambda x: combined_quality_accuracy(
                x.get("overall_quality_score", 0),
                x.get("overall_accuracy_score", 0),
            ),
            reverse=True,
        ):
            cc = combined_quality_accuracy(
                cr.get("overall_quality_score", 0),
                cr.get("overall_accuracy_score", 0),
            )
            print(
                f"  {cr['model']:32} Q={cr.get('overall_quality_score', 0)}/10 "
                f"A={cr.get('overall_accuracy_score', 0)}/10 "
                f"C={cc}  ${cr.get('cost_full_report', 0):.4f}/report"
            )

    print("\nFull report: scripts/model-comparison/full-report.md")


if __name__ == "__main__":
    main()
