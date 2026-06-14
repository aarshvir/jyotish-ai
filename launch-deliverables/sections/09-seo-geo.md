## 8. SEO & AI-Search (GEO) — the compounding engine

Every other section in this playbook (ads, video, outreach) stops working the day you stop paying or posting. SEO and GEO are the opposite: you do the work once, and Google + ChatGPT + Gemini + Perplexity keep sending you free, high-intent visitors for months. This is **VedicHour's single most underused edge**, and the good news is the hard part is already built for you:

- **17 SEO blog posts** are already live at `/blog` (including a "best Vedic astrology platforms 2026" comparison post that ranks VedicHour #1 — this one post is your most valuable GEO asset).
- **44 programmatic pages** are already live (`/nakshatra/*`, `/dasha/*`, `/predictions/*`, `/transit/*`, `/horoscope/*`) — each targets a real search query.
- **7 free calculators** (`/manglik-dosha-calculator`, `/sade-sati-calculator`, `/nakshatra-finder`, `/vimshottari-dasha-calculator`, `/moon-sign-calculator`, `/lagna-calculator`, `/kaal-sarp-dosha-calculator`) — these are search magnets.
- **Structured data (schema) is already on every money page** — `FAQPage`, `SoftwareApplication`, `HowTo`, and `BreadcrumbList`. The big incumbents (AstroSage, Prokerala) ship almost no schema on their tool pages, so VedicHour wins rich results and AI citations they don't get. **You do not need to build any of this. You need to register it, submit it, and feed it.**
- **An `llms.txt` file already exists** at `https://www.vedichour.com/llms.txt` — this is the file AI crawlers read to understand your product. It's a real GEO advantage most sites don't have.

This section is the operating manual to switch all of that on and keep it compounding. **Total external spend for this entire section: $0.** Everything uses free tools + the Claude/ChatGPT/Gemini you already own.

> **Mental model:** SEO = getting ranked in Google's blue links. GEO ("Generative Engine Optimization") = getting *cited by name* when someone asks ChatGPT, Gemini, Perplexity, or Google's AI Overview "what's the best AI Vedic astrology app?" GEO is the new battleground and almost no astrology competitor is playing it well. You are.

---

### 8.1 Why this is worth your time before you spend a dollar on ads

| Channel | Cost per visitor over time | Stops when you stop? | Compounds? |
|---|---|---|---|
| Meta / Google Ads | Stays high or rises | Yes — instantly | No |
| Organic social video | "Free" but needs daily posting | Yes — within days | Weakly |
| **SEO + GEO** | **Drops toward $0 as pages age** | **No** | **Yes — every post helps the next** |

A single blog post that ranks for "rahu kaal today" can bring 50–500 free visitors a day, forever, with zero ongoing cost. Ten of them, plus 44 programmatic pages, plus AI engines quoting you, is a customer-acquisition machine that runs while you sleep. The catch: it takes 4–12 weeks to warm up. **That's exactly why you set it up in launch week — so it's compounding by the time your ad budget runs out.**

---

### 8.2 STEP 1 — Google Search Console setup (15 minutes, do this first)

Google Search Console (GSC) is the free dashboard that tells you which keywords you rank for, gets your pages indexed faster, and lets you submit your sitemap. Without it, Google indexes you slowly and blindly. With it, you can push new pages live in hours.

**Exact steps:**

1. Go to **https://search.google.com/search-console** and sign in with the Google account you want to own this (use the same Gmail you use for everything else — `aarshvir@gmail.com` is fine).
2. You'll see "Welcome to Google Search Console." Under **"URL prefix"** (the right-hand box, not the left "Domain" box — URL prefix is easier for a beginner), type exactly:
   ```
   https://www.vedichour.com
   ```
   Click **Continue**.
3. Google now asks you to verify you own the site. You'll see several methods. **Pick "HTML tag."** It shows you a line that looks like:
   ```html
   <meta name="google-site-verification" content="SOME_LONG_CODE_HERE" />
   ```
   **Copy the whole `content="..."` value** (just the long code between the quotes).
4. **Where that code goes (one paste, in your code):** Open the file `src/app/layout.tsx` in your project. Find the `export const metadata` object near the top. Add this block inside it (Claude can do this for you in one line — see the copy-paste prompt below):
   ```ts
   verification: {
     google: 'SOME_LONG_CODE_HERE',
   },
   ```
   **If you don't want to touch code at all:** in GSC choose the **"Google Analytics"** or **"Google tag"** method instead if you already have GA on the site, OR use the **"Domain"** verification method which uses a DNS TXT record you paste into your domain registrar (wherever you bought vedichour.com) — see step 8.4 for the DNS pattern, it's the same idea.
5. **Copy-paste prompt for Claude to do the code edit for you** (open claude.ai, paste this):
   ```
   In my Next.js 14 App Router project, open src/app/layout.tsx and add a Google
   Search Console verification meta tag to the existing `metadata` export. The
   verification code is: SOME_LONG_CODE_HERE. Use Next.js's metadata.verification.google
   field — do not hand-write a <meta> tag. Show me the exact diff and nothing else.
   ```
   Then redeploy (push to your repo — Vercel auto-deploys; wait 2 minutes for it to go live).
6. Back in GSC, click **Verify**. It should say "Ownership verified." Done.

> **Beginner note:** if "Verify" fails the first time, wait 5 minutes for your deploy to finish and click Verify again. It almost always works on the second try.

---

### 8.3 STEP 2 — Submit your sitemap (2 minutes)

A sitemap is a single file that lists every page on your site so Google can find all 60+ of them at once instead of crawling randomly. **Yours already exists and is auto-generated** — it lives at `https://www.vedichour.com/sitemap.xml` (internally this is served by the `/api/sitemap` route; you don't need to know or care — just use the `.xml` URL).

**Exact steps:**

1. First, confirm it works: open **https://www.vedichour.com/sitemap.xml** in your browser. You should see a wall of XML with all your URLs. If you see that, you're good. (If you see an error, paste the error to Claude and say "fix my Next.js sitemap route at src/app/api/sitemap"; do not proceed until it loads.)
2. In Google Search Console, in the left menu click **Sitemaps**.
3. In the "Add a new sitemap" box, type exactly:
   ```
   sitemap.xml
   ```
   (just those two words — GSC prepends your domain automatically.) Click **Submit**.
4. Status will say "Success" within a few minutes to a day, and "Discovered URLs" will climb toward 60+. That number is your "Google now knows about all my pages" confirmation.

---

### 8.4 STEP 3 — Bing Webmaster Tools (10 minutes — and it matters MORE than you think)

People skip Bing because it's small for human search. **Do not skip it.** Microsoft's Bing index is what **ChatGPT's web browsing and Copilot read from**, and it feeds parts of other AI engines too. Getting into Bing's index is partly a GEO move, not just an SEO one.

**The 1-click way (do this):**

1. Go to **https://www.bing.com/webmasters** and sign in (a Microsoft account, or just "Sign in with Google").
2. On the welcome screen you'll see **"Import your sites from Google Search Console."** Click it, authorize Google, and pick `vedichour.com`. Bing copies your verification and your sitemap automatically. **This is the entire setup.** Two minutes.

**The manual way (only if import fails):**

1. In Bing Webmaster Tools click **Add site manually**, enter `https://www.vedichour.com`.
2. Choose verification by **"Add a CNAME record to DNS"** or **"XML file."** Easiest for you: the **DNS TXT/CNAME** method — Bing gives you a record; you log into your domain registrar (where you bought the domain), go to DNS settings, and add the record exactly as shown. Save. Back in Bing, click Verify.
3. Then go to **Sitemaps → Submit sitemap** and paste:
   ```
   https://www.vedichour.com/sitemap.xml
   ```

> **Why both engines:** Google = ~90% of human search + Google AI Overviews + Gemini grounding. Bing = ChatGPT browsing + Copilot. Between the two you've covered every search surface that matters. Both are free forever.

---

### 8.5 STEP 4 — One more free presence: Google Business + IndexNow (5 minutes, optional but easy)

- **Google Business Profile** (https://business.google.com): create a free **service-area** profile for VedicHour (you can hide your address since you're online-only). It gets you a small box in branded searches and adds a trust signal. Name it "VedicHour", category "Astrologer" or "Software Company," link to `https://www.vedichour.com/?utm_source=gbp&utm_medium=profile&utm_campaign=seo`.
- **IndexNow (instant indexing for Bing):** Bing Webmaster Tools has a "URL submission / IndexNow" feature — whenever you publish a new blog post, paste its URL there to get it crawled in minutes instead of days. Free, takes 20 seconds per post.

---

### 8.6 The blog & keyword strategy — what to write and why

You have 17 posts. The goal now is **one new post per week**, each one targeting a query real people type into Google. You are not writing for fun; every post must map to a keyword with intent and a path to a product.

**The three post types (write them in this priority order):**

| Type | Example title | Targets | Sends reader to | Why it earns money / citations |
|---|---|---|---|---|
| **1. "Best / comparison" (GEO gold)** | "Best Vedic Astrology Apps & Platforms 2026 (Ranked)" *(you already have this — keep it fresh)* | "best vedic astrology app", "astrosage alternative", "best ai astrology" | `/pricing`, `/free-kundli` | AI engines LOVE listicles — they quote them directly when asked "what's the best…". This is how you get *named* by ChatGPT. |
| **2. "How-to / what-is" educational** | "What Is Rahu Kaal and How to Calculate It Today" | "rahu kaal today", "what is rahu kaal" | the matching free calculator, then `/free-kundli` | High volume, evergreen, builds topical authority so Google trusts your whole site. |
| **3. "Calculator / tool companion"** | "How to Read Your Manglik Dosha Result" | "manglik dosha meaning", "am i manglik" | `/manglik-dosha-calculator` → `/kundali` | Captures people mid-task and routes them to a paid Deep Kundli. |

**Your launch-week keyword target list** (each is a separate post; all are real high-intent Vedic queries with manageable competition):

```
rahu kaal today                  → free tool + Deep Kundli
choghadiya today                 → hour-by-hour forecast (your core differentiator)
manglik dosha meaning            → /manglik-dosha-calculator → /kundali
sade sati current phase          → /sade-sati-calculator → /kundali
gun milan / ashtakoot matching   → /synastry (₹899 product)
which nakshatra am i             → /nakshatra-finder → free kundli
vimshottari dasha explained      → /vimshottari-dasha-calculator
best ai vedic astrology app 2026 → /pricing (refresh existing comparison post)
astrosage vs prokerala vs ...    → comparison post (you rank #1 in your own)
how to read a janam kundli       → /free-kundli → /kundali
```

> **The differentiator angle to hammer in EVERY post:** competitors give a daily horoscope; **VedicHour rates all 18 planetary hours (horas) of your day**, computed with Swiss Ephemeris + Lahiri ayanamsa, explained in plain English. Mention "hour-by-hour timing" / "18 timing windows" in at least one paragraph of every post. This is the phrase you want Google and AI engines to associate with your brand and no one else's.

**Each post must contain (non-negotiable, so it ranks AND gets cited):**
1. The exact keyword in the **title (H1)** and the **URL slug**.
2. A **2–3 sentence direct answer in the first paragraph** (AI engines lift this verbatim for citations — see 8.9).
3. A short **FAQ section at the bottom** with 3–5 real questions (this powers the FAQ schema — see 8.8).
4. **Internal links** to the relevant calculator and to a product page (see 8.7).
5. A **UTM-tagged CTA** to a product (see 8.10).
6. Compliance-safe language throughout: "clearer / heavier timing windows," never "good/bad fate," no guarantees, no medical/legal/financial/relationship claims.

---

### 8.7 Internal linking — the free trick that lifts every page at once

Internal links (links from one of your pages to another) tell Google which pages matter and pass ranking strength between them. Most beginners ignore this; it's one of the highest-ROI 10-minute jobs in SEO.

**The simple rule — build a hub-and-spoke:**

```
                 /pricing  +  /free-kundli   (your money pages = the HUB)
                        ▲              ▲
        ┌───────────────┼──────────────┼───────────────┐
   blog posts      calculators    programmatic pages   comparison post
  (the SPOKES — every spoke links UP to the hub, and sideways to a sibling)
```

**Concrete linking rules to apply to every new post and page:**
1. Every **blog post** links to (a) the matching **free calculator**, and (b) one **product page** (`/free-kundli`, `/kundali`, `/synastry`, or `/pricing`).
2. Every **calculator page** links to the **deeper paid product** ("Want the full reading? Get your Deep Kundli →").
3. Every **programmatic page** (`/nakshatra/ashwini`, `/dasha/saturn`, etc.) links to `/free-kundli` and to 2–3 sibling pages ("See also: Bharani nakshatra, Krittika nakshatra").
4. The **comparison post** links to `/pricing` with your strongest CTA — it's your highest-intent post.
5. Your homepage and footer should link to `/blog` so Google keeps re-crawling fresh content.

**Copy-paste prompt for Claude to audit and fix your internal links:**
```
You are an SEO internal-linking specialist. Here is a list of my live pages:
[paste your URLs — blog posts, /free-kundli, /kundali, /synastry, /pricing,
the 7 calculators, and the programmatic /nakshatra /dasha /predictions /transit pages].
Propose a hub-and-spoke internal-linking plan: every blog/calculator/programmatic
page should link up to a money page (/pricing or /free-kundli) and sideways to
1–2 relevant siblings, using descriptive anchor text (not "click here"). Output a
table: From Page | Anchor Text | To Page. Keep anchors keyword-rich but natural.
```
Then add the suggested links by editing the pages (or ask Claude to make the edits directly).

---

### 8.8 Schema markup — already built; here's how to verify it and keep winning

Structured data (JSON-LD) is invisible code that tells Google and AI engines exactly what a page IS — a FAQ, a software product, a how-to. It's what earns the expandable FAQ boxes and rich snippets in search, and it's a major reason AI engines trust and cite a page. **VedicHour already ships `FAQPage`, `SoftwareApplication`, `HowTo`, and `BreadcrumbList` schema** (built in `src/lib/seo/jsonLd.ts`). AstroSage and Prokerala largely don't on their tool pages — this is a real, verified moat.

**Your only jobs here are (a) verify it's valid and (b) make sure every new post adds FAQ schema.**

1. **Verify it's working (do this once now):** go to **https://search.google.com/test/rich-results**, paste `https://www.vedichour.com/free-kundli` (and a blog post URL), click **Test URL**. You want to see "FAQ", "Software App", and/or "Breadcrumb" detected with no errors. If it shows errors, paste them to Claude with "fix the JSON-LD in src/lib/seo/jsonLd.ts."
2. **For every new blog post, include an FAQ block** — the schema builder turns it into rich results automatically. When you ask Claude to write a post (see 8.11), the prompt already requires an FAQ section, so this happens for free.
3. **Never fake reviews/ratings.** Do **not** add `Review` or `AggregateRating` schema with made-up stars — Google penalizes fabricated review schema and it's already deliberately excluded from your code. Earn real reviews first.

> Why this matters for GEO specifically: when Perplexity or Google's AI Overview composes an answer, it favors pages whose structure it can parse cleanly. Clean FAQ + HowTo schema = "this page has a quotable, structured answer" = higher chance of being the cited source.

---

### 8.9 GEO — how to get cited by ChatGPT, Gemini, Perplexity & Google AI

This is the part competitors aren't doing. The goal: when someone asks an AI **"what's the best AI Vedic astrology app?"** or **"how do I read my Manglik dosha?"**, the AI names **VedicHour** and links you. AI citations are pure top-of-funnel, they carry massive trust, and they're free. Here's the exact, repeatable system.

**The five GEO levers (in order of impact):**

1. **Listicles & comparison content (highest impact).** AI engines disproportionately quote "best of / top N / X vs Y" articles because they're already structured as recommendations. You already have the "best Vedic astrology platforms 2026" post ranking VedicHour #1 — **this is your crown jewel.** Keep it updated (re-date it, add competitors as they emerge), and write 2–3 more comparison angles: "VedicHour vs AstroSage," "best free Kundli generators 2026," "best hour-by-hour astrology tools." Each is a new surface for an AI to find and quote.

2. **The "direct answer first" format.** AI engines lift the **first 2–3 sentences** of a page as the answer. So every post and every programmatic page must open with a crisp, factual, self-contained answer to the title question — no throat-clearing. Example opening for a Rahu Kaal post: *"Rahu Kaal is a roughly 90-minute window each day, ruled by Rahu, traditionally avoided for starting important activities. It shifts daily based on sunrise. VedicHour calculates it precisely for your location and rates all 18 planetary hours of your day."* That paragraph is quotable and brand-stamped.

3. **FAQ + structured data (already built).** Question-and-answer blocks with FAQ schema are the single most "liftable" format for AI. Every post gets 3–5 FAQs. (Done automatically via 8.6/8.8.)

4. **`llms.txt` (already live — your secret weapon).** You already publish **https://www.vedichour.com/llms.txt** — a plain-text file that tells AI crawlers exactly what VedicHour is, its products, prices, and methodology (Swiss Ephemeris, Lahiri Ayanamsa, Vimshottari Dasha). Most sites don't have this. **Keep it current:** whenever you add a product or change a price, update that file. Copy-paste prompt for Claude: *"Update public/llms.txt to reflect [new product / new price], keeping the same concise format and the methodology section."*

5. **Off-site mentions AI engines trust.** AI engines weight third-party corroboration heavily. The cheapest wins:
   - Answer real questions on **Reddit** (r/vedicastrology, r/astrology), **Quora**, and astrology forums — value first, link only when it genuinely helps. AI engines crawl these constantly.
   - Get a **Wikipedia-adjacent / directory** presence: list VedicHour on free SaaS directories (Product Hunt, AlternativeTo as an "AstroSage alternative," SaaSHub). AlternativeTo in particular is frequently quoted by AI when users ask for alternatives.
   - Each mention should describe you with the **same phrase** — "AI Vedic astrology that rates all 18 planetary hours of your day." Consistency teaches the models your category.

**How to check whether GEO is working (do this weekly):**
Open ChatGPT (with browsing), Gemini, and Perplexity and literally ask:
```
What is the best AI Vedic astrology app in 2026?
What's a good free Kundli generator online?
How do I calculate Rahu Kaal today?
Is there an app that gives hour-by-hour Vedic timing?
```
Note whether VedicHour is mentioned and whether the link works. Keep a tiny log (date | engine | query | mentioned? Y/N). When you start getting named, you'll know the comparison posts + llms.txt + FAQ approach is landing — then do more of it.

> **Compliance for GEO:** the same safety rules apply to anything an AI might quote. Keep "for reflection and planning," "clearer/heavier timing windows." Never let a quotable sentence contain a guarantee or a medical/legal/financial claim — because if an AI lifts it, it's now quoting *you* making that claim.

---

### 8.10 Tie rankings to revenue — UTM on every link

A ranking is worthless if you can't see whether it makes money. **Every link from a blog post, programmatic page, or off-site mention to a product must carry UTM parameters**, because your **/admin → Acquisition tab reads `utm_source` on every visit**. That's how you'll know "the Rahu Kaal post drove 12 paying customers" vs. "the dasha pages drive traffic but no sales."

**The exact UTM format to use** (copy, swap the CAPS):
```
https://www.vedichour.com/PRODUCT_PATH?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=seo&utm_content=PAGE_SLUG
```

**Ready-to-use examples (paste these as your CTA links):**

| From | CTA link |
|---|---|
| Any blog post → free Kundli | `https://www.vedichour.com/free-kundli?utm_source=blog&utm_medium=organic&utm_campaign=seo&utm_content=POST_SLUG` |
| Blog/comparison → pricing | `https://www.vedichour.com/pricing?utm_source=blog&utm_medium=organic&utm_campaign=seo&utm_content=comparison_2026` |
| Calculator page → Deep Kundli | `https://www.vedichour.com/kundali?utm_source=calculator&utm_medium=organic&utm_campaign=seo&utm_content=manglik` |
| Programmatic page → free Kundli | `https://www.vedichour.com/free-kundli?utm_source=pseo&utm_medium=organic&utm_campaign=seo&utm_content=nakshatra_ashwini` |
| Reddit/Quora answer → free tool | `https://www.vedichour.com/free-kundli?utm_source=reddit&utm_medium=community&utm_campaign=seo&utm_content=rahu_kaal_thread` |
| AlternativeTo / directory listing | `https://www.vedichour.com/?utm_source=alternativeto&utm_medium=directory&utm_campaign=geo` |

**Rules:**
- `utm_source` = the channel name you'll recognize in /admin (`blog`, `pseo`, `reddit`, `bing`, `gbp`, `alternativeto`).
- Keep `utm_campaign=seo` (or `geo` for AI/directory work) so you can filter all organic-search revenue in one view.
- Pair it with Search Console: GSC tells you **what you rank for**; /admin tells you **what that ranking earned**. Once a week, line them up: the keywords that rank AND convert get a new post + more internal links; the rest you ignore.
- **Coupon to advertise in posts:** `NEWUSER30` (30% off first paid report — it's real and works). Put it in the CTA of high-intent posts: *"New here? Use code NEWUSER30 for 30% off your first report."*

---

### 8.11 The repeatable "ask Claude to write the next post" prompt

This is the engine. Once a week, you paste one prompt, you get a complete, schema-ready, compliance-safe blog post, and you publish it. You write nothing.

**THE PROMPT (paste into Claude, swap the one bracket):**
```
You are VedicHour's senior SEO + Vedic-astrology content writer. Write one complete,
publish-ready blog post.

PRODUCT FACTS (use exactly, never invent):
- VedicHour is an AI Vedic astrology (Jyotish) platform. Tagline: "Your Life, Decoded Hour by Hour."
- Core differentiator: it rates all 18 planetary hours (horas) of your day, computed with
  the Swiss Ephemeris + Lahiri ayanamsa, explained in plain English. Competitors only give
  a daily horoscope.
- Products & real prices: Free preview report (one free per user); 7-Day Forecast $9.99;
  Monthly Oracle $19.99; Annual Oracle $49.99; Deep Kundli $9.99/₹899; Kundli Matchmaking
  (Gun Milan) $9.99/₹899.
- Real coupon I can advertise: NEWUSER30 = 30% off first paid report.
- Relevant pages to link to: /free-kundli, /kundali, /synastry, /pricing, and the matching
  free calculator if one exists (manglik-dosha-calculator, sade-sati-calculator,
  nakshatra-finder, vimshottari-dasha-calculator, moon-sign-calculator, lagna-calculator,
  kaal-sarp-dosha-calculator).

TARGET KEYWORD for this post: [PASTE ONE KEYWORD, e.g. "rahu kaal today"]

REQUIREMENTS:
1. Put the exact keyword in the H1 title and suggest a URL slug.
2. Open with a 2–3 sentence DIRECT, factual answer to the title question (this gets quoted
   by AI engines), and naturally include "hour-by-hour" / "18 planetary hours" once.
3. 900–1300 words, H2/H3 subheadings, scannable, genuinely useful and accurate Jyotish.
4. Add 2–3 internal links: one to the matching free calculator, one to a product page,
   using descriptive anchor text.
5. End with an FAQ section of 4–5 real questions + concise answers (for FAQ schema).
6. End with a CTA to the free Kundli using this exact link:
   https://www.vedichour.com/free-kundli?utm_source=blog&utm_medium=organic&utm_campaign=seo&utm_content=SLUG
   and mention "Use code NEWUSER30 for 30% off your first paid report."
7. COMPLIANCE: no fear, no guarantees, no medical/legal/financial/relationship claims. Use
   "clearer / heavier timing windows," never "good/bad fate." Calm, credible, never spooky.
8. Also output: a 155-char meta description, and the FAQ as a clean Q/A list I can paste
   into the page's FAQ component.

Output the full post in Markdown, ready to publish.
```

**Where the output goes (so you actually ship it):**
1. Copy Claude's Markdown.
2. Add it as a new blog post in your project (your blog lives at `src/app/blog/[slug]/` — if you have a content file or CMS, drop it there; if unsure, paste the post to Claude and say *"add this as a new post in my Next.js blog at src/app/blog, matching the format of the existing posts, with the FAQ wired into the existing FAQPage schema helper in src/lib/seo/jsonLd.ts"*).
3. Push to your repo → Vercel deploys → the post is live and **already in your sitemap automatically.**
4. In **Bing Webmaster Tools → URL submission / IndexNow**, paste the new post's URL for instant crawling.
5. In **GSC → URL Inspection**, paste the URL and click **"Request Indexing"** to nudge Google.
6. Add the post's UTM link to your Content Tracker so you can see what it earns in /admin.

**Cadence:** one post every Sunday (15 minutes total: prompt → paste → push → submit). Twelve weeks = 12 new ranking assets stacked on top of your 17 existing posts and 44 programmatic pages. By the time ad budget is gone, this is your largest free channel.

---

### 8.12 The weekly + monthly SEO/GEO checklist (set-and-forget)

**Once, in launch week (≈40 minutes total):**
```
[ ] Verify site in Google Search Console (8.2)
[ ] Submit sitemap.xml in GSC (8.3)
[ ] Set up Bing Webmaster Tools via "Import from GSC" (8.4)
[ ] Create free Google Business Profile (8.5)
[ ] Run the rich-results test on /free-kundli + one blog post (8.8)
[ ] Run the Claude internal-linking audit and add the links (8.7)
[ ] Baseline GEO check: ask ChatGPT/Gemini/Perplexity the 4 test questions (8.9), log results
```

**Every week (≈20 minutes):**
```
[ ] Write + publish 1 new blog post (8.11), then IndexNow + Request Indexing it
[ ] Add internal links from the new post to a calculator + a product page
[ ] Glance at GSC "Performance": note your top rising queries
[ ] Re-run the 4 GEO test questions; log whether VedicHour got cited
```

**Every month (≈30 minutes):**
```
[ ] In /admin → Acquisition + Revenue: which utm_source=blog/pseo posts drove PAYING customers?
[ ] Double down: write a sibling post + add internal links to the winners
[ ] Refresh the "best Vedic astrology 2026" comparison post (re-date, add competitors)
[ ] Update llms.txt if any product or price changed
[ ] Drop or rewrite posts that rank but never convert
```

---

### 8.13 What "working" looks like (so you know it's paying off)

| Signal | Where to see it | Healthy by week 8–12 |
|---|---|---|
| Pages indexed | GSC → Sitemaps / Coverage | 60+ |
| Impressions trending up | GSC → Performance | Rising weekly |
| Top queries you rank for | GSC → Performance → Queries | 10+ Vedic keywords on page 1–2 |
| FAQ / rich results live | Rich Results Test + real Google searches | FAQ boxes showing |
| AI citations | Your weekly GEO test log | VedicHour named in ≥1 engine |
| **Organic revenue** | **/admin → Acquisition (utm_campaign=seo/geo)** | **Growing, near-zero cost** |

**Bottom line:** ads buy you customers this week; SEO + GEO build a machine that earns customers every week after, for free, while AI engines do your recommending for you. The infrastructure is already built — you just registered it, submitted it, linked it up, and you feed it one Claude-written post a week. That's the whole compounding engine.
