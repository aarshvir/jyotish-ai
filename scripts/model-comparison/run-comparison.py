import os, json, time, re, datetime, requests
from pathlib import Path

OUTPUT_DIR = Path("scripts/model-comparison")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

EPH_URL = "http://localhost:8001"
GEO = {
    "current_lat": 25.2048, "current_lng": 55.2708,
    "timezone_offset_minutes": 240, "natal_lagna_sign_index": 3
}
TEST_DATE = "2026-03-10"

# ── MARCH 2026 PRICING (per million tokens) ───────
PRICING = {
    "claude-haiku-4-5-20251001":    {"input": 0.80,  "output": 4.00},
    "claude-sonnet-4-6":            {"input": 3.00,  "output": 15.00},
    "gpt-5.4-nano":                 {"input": 0.20,  "output": 1.25},
    "gpt-5.4-mini":                 {"input": 0.75,  "output": 4.50},
    "gpt-5.4":                      {"input": 2.50,  "output": 10.00},
    "gemini-2.5-flash":             {"input": 0.30,  "output": 2.50},
    "gemini-2.0-flash":             {"input": 0.30,  "output": 2.50},
    "gemini-3.1-pro":               {"input": 2.00,  "output": 12.00},
    "gemini-1.5-pro":               {"input": 2.00,  "output": 12.00},
    "deepseek-chat":                {"input": 0.28,  "output": 0.42},
    "deepseek-reasoner":            {"input": 0.55,  "output": 2.19},
}

def build_prompt(slots, panchang):
    yoga = panchang.get("yoga", "")
    tithi = panchang.get("tithi", "")
    moon_sign = panchang.get("moon_sign", "")
    slot_summary = "\n".join([
        f"  {s['display_label']}: {s['dominant_hora']} hora, "
        f"{s['dominant_choghadiya']} choghadiya, "
        f"H{s['transit_lagna_house']} transit, score={s['score']}, "
        f"rahu_kaal={s['is_rahu_kaal']}"
        for s in slots[:6]
    ])
    return f"""You are a Vedic astrology AI generating a daily forecast 
for a Cancer Lagna native (Aarsh Vir Gupta, Rahu-Mercury dasha).
Date: {TEST_DATE} | Yoga: {yoga} | Tithi: {tithi} | Moon: {moon_sign}

Hourly slots (first 6):
{slot_summary}

Write a day overview of exactly 250-280 words:
1. First line: ALL CAPS headline naming dominant energy
2. SITUATION (150-180w): name house numbers H1-H12, explain 
   yoga meaning, connect dasha to day energy, name planets
3. STRATEGY: section (80-100w): best hora window with exact 
   time, specific activity, what to avoid, Rahu Kaal warning

Rules: Never say 'may', 'could', 'might'. Be definitive.
Name specific house numbers. Every sentence must reference
a planet, house, yoga, or nakshatra."""

def run_anthropic(model_id, prompt, api_key):
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    start = time.time()
    r = client.messages.create(
        model=model_id, max_tokens=1500,
        messages=[{"role":"user","content":prompt}])
    return (r.content[0].text, r.usage.input_tokens,
            r.usage.output_tokens, time.time()-start)

def run_openai(model_id, prompt, api_key):
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    start = time.time()
    r = client.chat.completions.create(
        model=model_id, max_completion_tokens=1500,
        messages=[{"role":"user","content":prompt}])
    return (r.choices[0].message.content,
            r.usage.prompt_tokens, r.usage.completion_tokens,
            time.time()-start)

def run_gemini(model_id, prompt, api_key):
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_id)
    start = time.time()
    r = model.generate_content(prompt,
        generation_config={"max_output_tokens":1500})
    elapsed = time.time()-start
    in_tok = getattr(r.usage_metadata,'prompt_token_count',500) or 500
    out_tok = getattr(r.usage_metadata,'candidates_token_count',300) or 300
    text = getattr(r, "text", None) or ""
    return text, in_tok, out_tok, elapsed

def run_deepseek(model_id, prompt, api_key):
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    start = time.time()
    r = client.chat.completions.create(
        model=model_id, max_tokens=1500,
        messages=[{"role":"user","content":prompt}])
    return (r.choices[0].message.content,
            r.usage.prompt_tokens, r.usage.completion_tokens,
            time.time()-start)

def evaluate(text):
    words = len(text.split())
    lines = text.split('\n')
    has_caps = any(
        l.strip().isupper() and len(l.strip().split())>=4
        for l in lines if l.strip())
    house_refs = len(re.findall(
        r'H\d+|\d+th house|\d+rd house|\d+st house|\d+nd house', text))
    generic = sum(text.lower().count(p) for p in
        ["may ","could ","might ","perhaps ","generally "])
    planets = sum(1 for p in
        ["Jupiter","Saturn","Mars","Venus","Mercury",
         "Moon","Sun","Rahu","Ketu"] if p in text)
    quality = 0
    if has_caps: quality += 2
    if "STRATEGY" in text: quality += 2
    if house_refs >= 3: quality += 2
    if generic == 0: quality += 1
    if planets >= 4: quality += 1
    if any(y in text for y in ["Yoga","yoga","yoga"]): quality += 1
    if words >= 220: quality += 1
    return {
        "quality_score": quality,
        "word_count": words,
        "has_caps_headline": has_caps,
        "has_strategy": "STRATEGY" in text,
        "house_references": house_refs,
        "planets_named": planets,
        "generic_phrases": generic,
    }

def calc_cost(model_id, in_tok, out_tok):
    p = PRICING.get(model_id, {"input":1.0,"output":5.0})
    return round(in_tok*p["input"]/1e6 + out_tok*p["output"]/1e6, 6)

def main():
    print("=== JYOTISH AI MODEL COMPARISON — MARCH 2026 ===\n")

    # Get ephemeris
    try:
        r = requests.post(f"{EPH_URL}/generate-daily-grid",
            json={"date":TEST_DATE,**GEO}, timeout=15)
        r.raise_for_status()
        eph = r.json()
        slots = eph.get("slots",[])
        panchang = eph.get("panchang",{})
        print(f"Day: {TEST_DATE} | Score: {eph.get('day_score')} | "
              f"Yoga: {eph.get('yoga')}")
    except Exception as e:
        print(f"Ephemeris error: {e}")
        print("Start: cd ephemeris-service && py -m uvicorn main:app --port 8001")
        return

    prompt = build_prompt(slots, panchang)
    print(f"Prompt: {len(prompt.split())} words\n")

    # Read API keys
    env = {}
    try:
        with open(".env.local") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k,v = line.split("=",1)
                    env[k.strip()] = v.strip()
    except: pass

    anthropic_key = env.get("ANTHROPIC_API_KEY","")
    openai_key    = env.get("OPENAI_API_KEY","")
    gemini_key    = env.get("GEMINI_API_KEY","")
    deepseek_key  = env.get("DEEPSEEK_API_KEY","")

    # Models to test — March 2026 lineup
    models = [
        # name, model_id, provider, key
        ("Claude Haiku 3.5",   "claude-haiku-4-5-20251001", "anthropic", anthropic_key),
        ("Claude Sonnet 4.6",  "claude-sonnet-4-6",         "anthropic", anthropic_key),
        ("GPT-5.4 nano",       "gpt-5.4-nano",              "openai",    openai_key),
        ("GPT-5.4 mini",       "gpt-5.4-mini",              "openai",    openai_key),
        ("GPT-5.4",            "gpt-5.4",                   "openai",    openai_key),
        # API IDs (Gemini): use currently served model names (preview IDs often 404).
        ("Gemini 2.5 Flash",   "gemini-2.0-flash",         "gemini", gemini_key),
        ("Gemini 3.1 Pro",     "gemini-1.5-pro",           "gemini",    gemini_key),
        ("DeepSeek V3.2",      "deepseek-chat",             "deepseek",  deepseek_key),
        ("DeepSeek R1",        "deepseek-reasoner",         "deepseek",  deepseek_key),
    ]

    results = []

    for name, model_id, provider, api_key in models:
        if not api_key or api_key.startswith("your_") or not api_key.strip():
            print(f"SKIP {name} — add {provider.upper()}_API_KEY to .env.local")
            results.append({"model":name,"model_id":model_id,"status":"NO_KEY"})
            continue

        print(f"Testing {name}...")
        try:
            if provider == "anthropic":
                text,in_tok,out_tok,elapsed = run_anthropic(model_id,prompt,api_key)
            elif provider == "openai":
                text,in_tok,out_tok,elapsed = run_openai(model_id,prompt,api_key)
            elif provider == "gemini":
                text,in_tok,out_tok,elapsed = run_gemini(model_id,prompt,api_key)
            elif provider == "deepseek":
                text,in_tok,out_tok,elapsed = run_deepseek(model_id,prompt,api_key)

            text = text or ""
            q = evaluate(text)
            cost = calc_cost(model_id, in_tok, out_tok)
            full = round(cost * 16, 4)  # 16 calls per full report

            r = {
                "model": name, "model_id": model_id, "status": "OK",
                **q,
                "input_tokens": in_tok, "output_tokens": out_tok,
                "time_seconds": round(elapsed,2),
                "cost_single_call": cost,
                "cost_full_report": full,
                "sample": text[:400],
                "full_text": text,
            }
            results.append(r)

            print(f"  Quality:{q['quality_score']}/10 | "
                  f"Words:{q['word_count']} | "
                  f"Cost/report:${full:.4f} | "
                  f"Time:{elapsed:.1f}s")
            print(f"  CAPS:{q['has_caps_headline']} | "
                  f"Strategy:{q['has_strategy']} | "
                  f"Houses:{q['house_references']} | "
                  f"Generic:{q['generic_phrases']}")
            print()
            time.sleep(2)

        except Exception as e:
            print(f"  ERROR: {e}\n")
            results.append({"model":name,"status":f"ERROR:{str(e)[:80]}"})

    # Save JSON
    out = {
        "test_date": TEST_DATE,
        "generated": datetime.datetime.now().isoformat(),
        "day_score": eph.get("day_score"),
        "yoga": eph.get("yoga"),
        "results": results
    }
    with open(OUTPUT_DIR/"results.json","w", encoding="utf-8") as f:
        json.dump(out,f,indent=2)

    # Generate markdown table
    ok = [r for r in results if r.get("status")=="OK"]
    current = next((r for r in ok if "Sonnet" in r["model"]),None)

    md = f"""# Jyotish AI — Model Comparison (March 2026)
**Date:** {TEST_DATE} | **Yoga:** {eph.get('yoga')} | **Score:** {eph.get('day_score')}

## Cost & Quality Comparison

| Model | Quality /10 | Words | Caps | Strategy | Houses | Generic | Cost/Report | vs Sonnet | Time |
|-------|-------------|-------|------|----------|--------|---------|-------------|-----------|------|
"""
    for r in sorted(ok, key=lambda x: x["quality_score"], reverse=True):
        savings = ""
        if current and r["model"] != current["model"]:
            pct = round((1 - r["cost_full_report"]/current["cost_full_report"])*100)
            savings = f"{pct}% cheaper"
        elif current:
            savings = "baseline"
        md += (f"| **{r['model']}** | {r['quality_score']}/10 | "
               f"{r['word_count']} | "
               f"{'Y' if r['has_caps_headline'] else 'N'} | "
               f"{'Y' if r['has_strategy'] else 'N'} | "
               f"{r['house_references']} | "
               f"{r['generic_phrases']} | "
               f"**${r['cost_full_report']:.4f}** | "
               f"{savings} | "
               f"{r['time_seconds']}s |\n")

    # Volume cost table
    if current and ok:
        cheapest = min(ok, key=lambda x: x["cost_full_report"])
        md += f"""
## Cost at Scale

Current: **{current['model']}** @ ${current['cost_full_report']:.4f}/report
Cheapest: **{cheapest['model']}** @ ${cheapest['cost_full_report']:.4f}/report

| Reports/month | {current['model']} | {cheapest['model']} | Monthly savings |
|---------------|{'—'*len(current['model'])}|{'—'*len(cheapest['model'])}|----------------|
"""
        for vol in [100, 500, 1000, 5000, 10000]:
            c1 = current["cost_full_report"] * vol
            c2 = cheapest["cost_full_report"] * vol
            md += f"| {vol:,} | ${c1:.2f} | ${c2:.2f} | ${c1-c2:.2f} |\n"

    md += "\n## Sample Outputs\n\n"
    for r in ok:
        md += f"### {r['model']}\n```\n{r['sample']}...\n```\n\n"

    with open(OUTPUT_DIR/"report.md","w", encoding="utf-8") as f:
        f.write(md)

    # Print summary
    print("="*60)
    print("SUMMARY — sorted by quality score")
    print("="*60)
    for r in sorted(ok, key=lambda x: x["quality_score"], reverse=True):
        bar = "#" * r["quality_score"] + "-" * (10 - r["quality_score"])
        print(f"  {r['model']:25} {bar} "
              f"Q:{r['quality_score']}/10  "
              f"${r['cost_full_report']:.4f}/report  "
              f"{r['time_seconds']}s")

    print(f"\nFull report: scripts/model-comparison/report.md")
    print(f"Raw data:    scripts/model-comparison/results.json")

if __name__ == "__main__":
    main()
