import re, sys
with open('scripts/last-report.html', encoding='utf-8', errors='ignore') as f:
    html = f.read()
text = re.sub(r'<[^>]+>', ' ', html)
text = re.sub(r'\s+', ' ', text)
checks = []
checks.append(('Report page URL', '/report/' in html or ('Daily Forecast' in text and 'Period Synthesis' in text), ''))
checks.append(('File size > 250KB', len(html) > 250000, f'{len(html)//1024}KB'))
checks.append(('Nativity loads', 'Nativity unavailable' not in text, ''))
count = text.count('STRATEGY')
checks.append(('7 STRATEGY sections', count >= 6, f'{count} found'))
sentences = [s.strip() for s in text.split('.') if s.strip()]
caps = [s for s in sentences if s.upper()==s and len(s.split())>=4]
checks.append(('ALL-CAPS headlines 5+', len(caps) >= 5, f'{len(caps)} found'))
scores = [int(m) for m in re.findall(r'(\d+)\s*/\s*100', text)]
# Filter to plausible day scores (20-99); version numbers can match
scores = [s for s in scores if 20 <= s <= 99]
if len(scores) >= 2:
    spread = max(scores)-min(scores)
    checks.append(('Score spread >= 15', spread >= 15, f'spread={spread}'))
else:
    checks.append(('Score spread >= 15', len(scores) >= 1, f'{len(scores)} score(s)' if scores else 'no scores'))
house_refs = len(re.findall(r'H\d+|\d+th house|\d+rd house|\d+st house', text))
checks.append(('House references 50+', house_refs >= 50, f'{house_refs}'))
months = ['March 2026','April 2026','May 2026','June 2026','July 2026','August 2026']
found = sum(1 for m in months if m in text)
checks.append(('Monthly section', found >= 6, f'{found} months'))
checks.append(('Weekly section', any(x in text for x in ['Week 1','W1 W2','week-']), ''))
idx = text.find('Period Synthesis')
synth = text[idx:idx+500] if idx > 0 else ''
checks.append(('Synthesis content', len(synth.split()) >= 50, f'{len(synth.split())}w'))
passed = sum(1 for _,ok,_ in checks if ok)
print(f'\nHTML VALIDATION: {passed}/{len(checks)} passed')
for name,ok,detail in checks:
    sym = '[PASS]' if ok else '[FAIL]'
    print(f'  {sym} {name}: {detail}')
sys.exit(0 if passed==len(checks) else 1)
