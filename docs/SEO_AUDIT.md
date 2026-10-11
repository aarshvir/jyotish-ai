# SEO audit: vedichour.com

Date of audit: 11 October 2026. Owner of this work: the SEO session. Branches and PRs are listed in section 11.

## 1. Summary in plain English

- **The site is technically clean but about two thirds of what it asks Google to index was filler.** All 328 sitemap URLs returned 200, with no duplicate titles, no missing descriptions and no canonical errors. But 216 of them (66%) were templated pages: 108 "daily horoscope" pages whose text was picked by a hash of the sign and date (not from the sky), and 108 "planet in sign" pages with the same three paragraphs and no dates. That is the pattern Google's scaled-content policy targets, and it sat next to 41 real articles and 8 real calculators.
- **Titles and snippets were cut off in search.** 120 of 328 titles were over 60 characters (39 of 41 blog posts; all 27 nakshatra pages), and 24 descriptions were over 160 (one was 320).
- **The articles were long, repetitive and sounded machine-written.** 41 posts averaged 1,800 words, about 260 em dashes across 14 of them, and stock phrases such as "delve" and "tapestry" in 6 of them, plus filler such as "profound" and "intricate" in more. Several carried errors (see 6).
- **A real factual bug:** nine nakshatra pages showed the wrong Nadi (Bharani, Krittika, Ardra, Magha, Uttara Phalguni, Vishakha, Jyeshtha, Shravana, Shatabhisha), contradicting the matching engine.
- **We will not win the big head terms** (free kundli, kundli matching, today's muhurat, rahu kaal today, lagna calculator). Those belong to AstroSage, Prokerala, Drik Panchang, mPanchang, Astrotalk and Astroyogi, who have years of authority and live daily data. The realistic plan is long-tail questions where the top 10 is forums and small sites, plus time-sensitive transits we can compute exactly, plus being the clearest source for ChatGPT to quote.
- **What I did:** seven pull requests (section 11): fix titles, remove the filler pages and rebuild the slow-planet transit pages with real dates, add an About/method page and a better article template, rewrite 27 articles and add 7 new ones, a Hindi pilot, and this document. Nothing has been merged or submitted to any external service.

## 2. What I could and could not see

**Could:** the live site (a read-only crawl of all sitemap URLs plus about 50 probe URLs), the code, Lighthouse mobile runs on eight pages, a search sample of 15 queries through a third-party search index (not Google itself), robots.txt behaviour for AI crawlers, and the Vercel domain settings (read only).

**Could not:** Google Search Console, Bing Webmaster Tools, GA4/PostHog, Ahrefs or Semrush. So I have **no real impression, click, ranking, index-coverage or keyword-volume data**. Everything about "demand" below is from the shape of the search results (who ranks, in what format), not from numbers. Section 10 lists exactly what to check in Search Console.

## 3. Technical audit

### Crawl facts (before)

| Check | Result |
|---|---|
| Sitemap URLs | 328, all HTTP 200 |
| Duplicate titles / descriptions | 0 |
| Pages with no H1 or more than one | 0 |
| Canonical not equal to the page | 0 (the homepage differs only by a trailing slash) |
| hreflang | None (fine for a single-language site) |
| Titles over 60 chars | 120 of 328 (blog 39 of 41, nakshatra 27 of 27, transit 32, compare 6) |
| Descriptions over 160 chars | 24 (kundali 320, compare 8 of 8, calculators 8) |
| Templated pages | 216 (horoscope 108, transit 108), 66% of the sitemap |
| Pages with zero or one internal link in | /muhurat 0, /hora 1, /sample-report 1, all 108 transit pages 0 |
| Private routes | noindex or auth-redirected correctly (/account, /dashboard, /report, /kundali/{id}, /q/*) |
| AI crawlers | GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Bingbot, Googlebot all receive 200 |
| Redirects | `http://vedichour.com` goes 308 to `https://vedichour.com`, then **307** to `https://www.vedichour.com` |

### Findings and status

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | 108 horoscope pages are hash-generated filler ("Lunar mood trends toward waning discipline"; the page says it is "algorithmically generated for discovery") | High | PR #240: noindex, out of sitemap, footer link moved |
| 2 | 108 transit pages are the same text, no dates, "will dramatically alter your career, relationships, and health"; zero internal links | High | PR #240: 48 slow-planet pages rebuilt with real dates; 60 fast-planet pages noindex; new `/transit` hub |
| 3 | Global JSON-LD advertised $9.99 / $19.99 / $49.99 one-time plans on every page | High | Fixed on main by 70cf75e (another session) while I was working; I rebased onto it |
| 4 | Titles and descriptions cut off in search | Medium | PR #238 (calculators, hubs, compare, nakshatra) and PR #239 (blog `seoTitle`), enforced by tests |
| 5 | Root layout set `canonical: '/'` and hreflang to `/`, inherited by any page without its own | Medium (latent) | PR #238 |
| 6 | Nine nakshatra pages show the wrong Nadi | Medium (factual) | PR #244, with a test |
| 7 | Blog posts: whole article embedded as `articleBody` in JSON-LD, no `dateModified`, generic calculator links, a banner repeating the H1 pushing the answer below the fold on a phone, skip-link target missing | Medium | PR #239 |
| 8 | Wide tables would be clipped on a phone (found while testing) | Medium | PR #239 |
| 9 | No About / methodology / editorial page (E-E-A-T gap) | Medium | PR #239 (`/about`) |
| 10 | Apex domain redirect is a 307 and a two-hop chain | Low | **Owner or whoever has Vercel access:** Project > Domains > vedichour.com > redirect to www with 308 |
| 11 | Pricing page Product JSON-LD has `"url":"https://www.vedichour.com\r\n/pricing"` (a newline). Cause: trailing CRLF in the `NEXT_PUBLIC_URL` Vercel env var and no `.trim()` in `src/app/pricing/page.tsx` | Low | Not touched (pricing code is out of scope); fix the env var and add `.trim()` |
| 12 | Homepage copy and FAQ still mention "7 days or 30 days" and a "7-day, Monthly, Annual" tag (`FinalCTA.tsx`, `Products.tsx`, `faq-data.ts`) | Low | Not touched; flagged to the pricing/home owner |
| 13 | `/start` is `index, follow` with 324 internal links pointing at it | Low | Not touched (quiz owner). Recommend noindex unless it has real content |
| 14 | `/auth/consent` is `index, follow` but robots-blocked | Trivial | Not touched |
| 15 | Two pages on "Vedic vs Western astrology" now exist (`/blog/vedic-vs-western-astrology` and `/compare/vedic-vs-western-astrology`, added by 70cf75e) | Low | PR #244 splits their targets and cross-links; the coordinator should pick one canonical for the broad query |
| 16 | `marketing-agent/output/blog/best-planetary-hours-for-decisions.ts` still exists; promoting it would break the blog registry test (by design) | Low | Remove from the engine queue |

### Performance (Lighthouse, mobile, lab, 11 October 2026)

| Page | Performance | Accessibility | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| Home | 84 to 90 | 93 | 79 | 100 | 3.7 to 4.6 s |
| /free-kundli | 91 | 96 | 79 | 100 | 3.4 s |
| /sade-sati-calculator | 84 | 96 | 79 | 100 | 4.6 s |
| A blog post | 91 | 98 | 79 | 100 | 3.5 s |
| A nakshatra page | 98 | 100 | 79 | 100 | 2.4 s |
| A daily horoscope page | 98 | 94 | 79 | 100 | 2.5 s |
| /sample-report | 95 | 96 | 79 | 100 | 3.0 s |

CLS is 0 everywhere and blocking time is 30 to 60 ms. LCP is a text block on every page and 74 to 86% of it is "render delay", not network, so it is main-thread and CSS work (about 500 KB of scripts including Meta Pixel and PostHog loaded on every page). Not a ranking blocker at these scores, but the calculators at 4.6 s lab LCP are the first place to look in the field data (Search Console > Core Web Vitals). Best practices 79 is one item: the Meta Pixel's third-party cookie. Both belong to the analytics owner.

### Structured data: what is truthful

- Kept: Organization, WebSite, BlogPosting, BreadcrumbList, SoftwareApplication for free tools only, Product on /pricing only.
- Note for expectations: Google limits FAQ rich results to government and health sites, and removed HowTo rich results in 2023. The FAQPage and HowTo markup here will not earn extra search features. It is harmless and is still read by AI answer engines, so I left it.
- No Review or AggregateRating anywhere, correctly.

## 4. Search reality

Sampled through a search index, India location, on 11 October 2026. This is **not** Google's own ranking, and ordering will differ by user.

| Query | Who ranks (top 10) | Format that wins | Winnable? |
|---|---|---|---|
| free kundli | AstroSage, Astrotalk, Prokerala, Astroyogi, MyKundali, VedicRishi, Drik Panchang | Tool page, long, hundreds of internal links | No |
| kundli in hindi | AstroSage Hindi, Prokerala Hindi, Astrotalk /hi, OnlineJyotish, VedicRishi, Play Store | Hindi tool pages, app listings | No, not yet |
| kundli kaise dekhe | AstroSage Hindi, Astrotalk Hindi, YouTube, Facebook | Video and tool pages | Hard |
| aaj ka shubh samay | Drik Panchang, mPanchang, Astroyogi, AstroSage, Prokerala, Shubh Panchang | Live daily choghadiya tables | No; needs live data |
| shubh muhurat today | Same set plus InstaAstro, AnytimeAstro | Live tables by city | No; needs live data |
| lagna calculator | Drik Panchang, Prokerala, Astroved, OnlineJyotish, AstroSage, VedicMarga, steer.coach | Tool + short explainer | Hard, long-tail only |
| sade sati calculator | Prokerala, Astro-Seek, Drik Panchang, AstroSage, small astrologer sites | Tool | Hard |
| kundli matching | AstroSage, Prokerala, Astroyogi, Astrotalk, AskGanesha, Shaadi.com | Tool | No |
| **sade sati 2026 which moon signs** | Kerala astrologer blog, YouTube, AstroSage, Economic Times, Prokerala, Instagram, Indastro, small blogs, Hindustan Times | Article with a table of signs and dates | **Yes.** One result still lists Capricorn as in Sade Sati (it ended 29 March 2025) |
| **how many gunas should match for marriage** | YouTube Shorts, Quora, Reddit, Times of India, small sites, Facebook, Instagram, matrimony site | Quick answer plus score bands | **Yes.** Mostly forums and social |
| **kundli without birth time** | AnytimeAstro, mPanchang, Reddit, Quora, YouTube, Facebook, Instagram | Q&A threads | **Yes** |
| **manglik dosha cancellation rules** | Scribd, IndiaDivine forum, small astrologer sites, Quora, Facebook, YouTube | Lists in forum posts | **Yes** |
| **guru chandal yoga** | Honest Astrologer, AskGanesha, pujayagna, Quora, Reddit, Instagram, YouTube, Scribd | Mixed; much is fear-based | **Yes**, with a balanced page |
| abhijit muhurat today | Drik Panchang, Astroyogi, mPanchang, VedicRishi, Nepal Jyotish | Daily-updated pages | No (evergreen explainers lose) |

The pattern: **live-data pages win the "today" queries, tool pages from big brands win the head terms, and forums, Quora, Reddit, Scribd and social posts fill the top 10 for specific questions.** A precise, dated, well-structured answer page can beat that last group. A second observation: several top results carry plain errors (a Capricorn Sade Sati listed as active), so being correct, and saying when it was checked, is a real edge.

## 5. Winnable keywords (26) and the page that targets each

Difficulty is my estimate from the SERP shape above, not a tool score. Volume is unknown; check Search Console and, if available, Ahrefs.

| # | Keyword | Intent | Difficulty | Page |
|---|---|---|---|---|
| 1 | sade sati 2026 / which rashi has sade sati | Informational, timely | Low to medium | `/blog/sade-sati-2026-2027-moon-signs` (new) |
| 2 | sade sati ending / starting dates (Taurus 2027) | Informational | Low | same |
| 3 | saturn retrograde 2026 dates | Informational | Low | same |
| 4 | shani dhaiya 2026 / kantak shani / ashtama shani | Informational | Low to medium | `/blog/shani-dhaiya-explained` (rewritten) |
| 5 | saturn return vs sade sati | Informational | Low | `/blog/saturn-return-vs-sade-sati` (rewritten) |
| 6 | guru gochar 2026 / jupiter transit leo | Informational, timely | Medium (Hindi news heavy) | `/blog/jupiter-transit-leo-2026` (new) |
| 7 | rahu ketu transit 2026 / rahu in capricorn | Informational, timely | Medium | `/blog/rahu-ketu-transit-december-2026` (new) |
| 8 | saturn in pisces / jupiter in cancer (planet in sign dates) | Informational | Low | `/transit/[planet]/[sign]` (rebuilt) and `/transit` |
| 9 | how many gunas should match for marriage | Informational | Low | `/blog/gun-milan-score-marriage` (rewritten) |
| 10 | is 18 / 24 / 28 gunas good | Informational | Low | same (FAQ) |
| 11 | nadi dosha nakshatra list / nadi dosha cancellation | Informational | Low to medium | `/blog/nadi-dosha-kundli-matching` (rewritten, with table) |
| 12 | bhakoot dosha 6/8 cancellation | Informational | Low to medium | `/blog/bhakoot-dosha-explained` (rewritten) |
| 13 | manglik dosha cancellation rules | Informational | Low | `/blog/manglik-dosha-cancellation-rules` (new) |
| 14 | manglik dosha after 28 age | Informational | Low | `/blog/manglik-dosha-marriage` (FAQ) |
| 15 | kundli without birth time | Informational | Low | `/blog/kundli-without-birth-time` (new) |
| 16 | moon sign without birth time | Informational | Low | same |
| 17 | guru chandal yoga effects | Informational | Medium | `/blog/guru-chandal-yoga-explained` (new) |
| 18 | gajakesari yoga in kundli, how to check | Informational | Low to medium | `/blog/gajakesari-yoga-explained` (new) |
| 19 | kaal sarp dosha types / how common | Informational | Medium | `/blog/kaal-sarp-dosha-explained` (rewritten) |
| 20 | rahu kaal calculation formula / table by weekday | Informational | Medium | `/blog/rahu-kaal-explained` (rewritten) |
| 21 | choghadiya table by weekday | Informational | Medium | `/blog/choghadiya-guide` (rewritten) |
| 22 | hora table by weekday / planetary hours calculation | Informational | Low to medium | `/blog/hora-planetary-hours-guide` (rewritten) |
| 23 | brahma muhurat time calculation | Informational | Medium | `/blog/brahma-muhurat-guide` (rewritten) |
| 24 | nakshatra list with degrees and lords | Informational | Low to medium | `/blog/nakshatra-birth-star-guide` (rewritten, 27-row table) |
| 25 | vimshottari dasha years order / calculate mahadasha balance | Informational | Low to medium | `/blog/vimshottari-dasha-current-period` (rewritten, worked example) |
| 26 | why is my vedic sign different / vedic sun sign dates | Informational | Medium | `/blog/vedic-vs-western-astrology` (rewritten) |

Not on this list on purpose: the head terms. Keep the calculators well linked, and let the articles above feed them.

**Hindi pilot (PR #245):** साढ़ेसाती 2026, मांगलिक दोष कब कटता है. Medium to high difficulty. The point is to measure, not to win.

## 6. Content audit: what I changed and why

- **Rewrote 27 articles**, shorter (average 1,800 words down to about 1,030 across the set, including new ones), with a direct answer first, tables, worked examples, a visible "Updated" date and a short sources line. Details in PR #244.
- **Accuracy fixes found along the way:** nine wrong Nadi values on nakshatra pages; an overstated claim that a few minutes of birth-time error "changes your entire life blueprint" (the Lagna changes about every two hours; the navamsa about every 13 minutes; a ten-minute error mostly matters for divisional charts and dasha dates); unverifiable claims such as "many successful people have Kaal Sarp".
- **Original, checkable data instead of generic prose.** Planetary dates (Sade Sati phases, Saturn, Jupiter, Rahu and Ketu transits, retrograde stations) and frequencies (about 1 in 13 charts has Kaal Sarp; 7 in 10 have a retrograde planet; about 1 in 3 have Gajakesari; the Moon sign is certain from the date alone on 56% of dates) were computed from the Swiss Ephemeris, and labelled in each article as our count and not a survey. This is what makes a page quotable.
- **Voice:** removed stock phrases and em-dash overuse (about 260 down to 0); tests now fail the build if they come back. No death, illness, divorce, curse or child-sex statements; gemstone and remedy selling is explicitly warned against.
- **Merged near-duplicates** with 301 redirects: `best-planetary-hours-for-decisions` into the hora guide, `science-of-timing-vedic-muhurta` into `what-is-muhurat`.
- **Still to review:** five lightly edited articles (is-astrology-real, why-daily-horoscopes, abhijit-muhurat, gandanta, timing-a-job-change), atmakaraka, ayanamsa, lagna guide, moon-sign vs sun-sign, vivah muhurat, yamaganda and choghadiya-vs-hora keep their original, longer text. They have no stock phrases but are 1,400 to 2,000 words each and would benefit from the same treatment.
- **Thin reference pages:** the nine `/dasha/[planet]` pages are 200 to 520 words and the five `/predictions/[area]` pages are 320 to 730. Expand them (see plan).

## 7. AI-search readiness

ChatGPT referrals are about 56% of traffic. What matters for being cited:

- **Crawlable:** verified. No bot blocking; robots on main now names AI crawlers explicitly (70cf75e).
- **Quotable facts near the top:** every refreshed article opens with a bold, self-contained answer and then a table. That is the shape answer engines lift.
- **Dated and attributed:** visible "Updated" date, JSON-LD `dateModified`, an `/about` page that states method and limits, and a "sources" line per article.
- **Correct and current:** the prices in structured data and `llms.txt` now come from the price book (70cf75e). Transit pages compute "in the sign today" daily.
- **`llms.txt`:** exists and is generated; no major engine has confirmed it uses it (Google has said it does not). Cheap and harmless, not a lever.
- **One test run on main (70cf75e's message) found vedichour.com in 0 of 116 Claude web-search answers.** The winners were Wikipedia, AstroYogi, Indastro, AstroSage, AstroTalk and Prokerala. So brand-and-citation work is as important as on-page work, and cannot be solved by this audit alone.
- **Check before merging the rewrites:** in GA4 or PostHog, list the landing pages for `chatgpt.com` referrals. If `best-vedic-astrology-platforms-2026` or `best-ai-vedic-astrology-app-2026` are the top ones, they are probably what ChatGPT is citing, and my rewrites changed their wording (not their URLs). If so, merge PR #244 without those two files and compare first.
- **Bing:** ChatGPT search draws on several web indexes, including Bing's. Verify the site in Bing Webmaster Tools and submit the sitemap (owner action).

## 8. Before and after

| Measure | Before | After (all PRs merged) |
|---|---|---|
| Sitemap URLs | 328 | 174 (blog 48, transit 49, compare 13) |
| Templated / filler share of sitemap | 66% (216) | 0% filler; 28% (49) are data-driven transit pages |
| Titles over 60 chars | 120 | 0 for blog (test-enforced) and for fixed families; transit titles at most 61 |
| Descriptions over 160 | 24 | 0 for blog (test-enforced) and fixed families |
| Blog posts | 41 (about 1,800 words each) | 48 (7 new, 2 merged, 2 Hindi); about 1,030 words average |
| Em dashes in articles | about 260 | 0 (test caps it at 4 per article) |
| Wrong Nadi values on nakshatra pages | 9 | 0 (test) |
| Pages with internal links to /hora and /muhurat | 1 and 0 | footer on every page |
| Dated data on transit pages | none | exact ingress dates 1990 to 2060 for Saturn, Jupiter, Rahu, Ketu |
| About / method page | none | yes |

I have **no before and after for traffic**, because I cannot see it. Compare these in Search Console after 4 to 6 weeks: impressions and clicks for `/blog/*`, `/transit/*`, the eight calculators, and CTR on pages whose titles changed.

## 9. 30-day plan (12 October to 10 November 2026)

Order of work is by expected return per hour. "Compute first" means the facts must come from the ephemeris before writing, never from memory.

| Week | Action | Notes |
|---|---|---|
| 1 (12 to 18 Oct) | Merge #238, #239, #240, then #244 (see merge order in 11). In Search Console submit `/sitemap.xml`, and run URL Inspection on the new article URLs (a handful, not all). | Owner. Do not request indexing for more than a handful. |
| 1 | Check chatgpt.com landing pages in GA4/PostHog before merging #244 | See 7 |
| 1 | Native Hindi read of #245 | Needs a Hindi speaker |
| 1 | Fix Vercel apex redirect to 308; trim `NEXT_PUBLIC_URL` | Owner |
| 2 (19 to 25 Oct) | New: **Shukra and Guru asta (combust) dates 2026 to 2028, and why weddings pause** | Compute first. Ties to vivah muhurat demand |
| 2 | New: **Dev Uthani Ekadashi to Vivah season: how to read a wedding date** | Compute tithis first; no date lists copied from other sites |
| 2 | Refresh the 5 lightly edited articles with the same template | Same method as #244 |
| 3 (26 Oct to 1 Nov) | Jupiter enters Leo (31 Oct) is live: watch impressions. Post a short update to the article on 31 Oct ("it has now entered Leo"). | Updating dated pages is the freshness signal |
| 3 | New: **Navamsa (D9) chart: what it shows and how to read it** | The marketing engine has D10 and festival drafts in `marketing-agent/output/blog`; review them with the voice tests before promoting |
| 3 | Expand the nine `/dasha/[planet]` pages to 800+ words with tables | They are 200 to 520 words now |
| 4 (2 to 10 Nov) | Diwali and Lakshmi puja muhurat: leave to the marketing engine (festival content already drafted) but run its drafts through the `seoMetadata` tests | Do not publish any date not computed |
| 4 | Review Search Console: queries with average position 8 to 30 become the next refresh list | Owner/analyst |
| 4 | If the Hindi pilot shows impressions: Hindi versions of Nadi dosha, Kaal Sarp and "kundli kaise dekhe" | Else stop at two |
| Ongoing | Add Rahu Kaal, choghadiya and Abhijit "today in [city]" pages for the top 50 cities, computed daily from the ephemeris | **Engineering project, not content.** This is the only credible route into the "aaj ka shubh samay" and "rahu kaal today" queries, and the product already has the data. Needs an owner. |

## 10. Search Console checklist for the owner

1. **Pages > Indexing:** counts for "Indexed", "Crawled, currently not indexed" and "Discovered, currently not indexed", split by `/horoscope/`, `/transit/`, `/blog/`, `/nakshatra/`. If the `/horoscope/` and fast-planet `/transit/` pages show "Crawled, currently not indexed", Google had already decided they are thin, and PR #240 only confirms it. **If any of them have real clicks, tell me before merging #240.**
2. **Performance > Search results:** last 3 months, filter country India and device mobile. Sort by impressions for pages `/blog/*`, `/free-kundli` and the calculators. Note queries with position 8 to 30 and over 100 impressions: those are the cheapest wins.
3. **Brand versus non-brand:** how many clicks come from queries containing "vedichour" or "vedic hour".
4. **Core Web Vitals:** mobile field data for the calculators (LCP, INP).
5. **Sitemaps:** after merge, confirm "Discovered URLs" is about 174 and there are no errors.
6. **Manual actions and Security issues:** confirm both are empty.
7. **Links:** top linking sites. If there are few, off-page work (mentions, directories, partnerships with temple and panchang sites) is the next lever.
8. **Compare** the 28 days before and after the merge for the pages whose titles changed.
9. **Bing Webmaster Tools:** verify and submit the sitemap.
10. **GA4 or PostHog:** landing pages and conversion for `chatgpt.com`, `google` and `bing` sources.

## 11. PRs and merge order

| PR | Branch | What | Depends on |
|---|---|---|---|
| #238 | `seo/technical` | Search-length titles and descriptions; remove an inheritable homepage canonical | none |
| #239 | `seo/blog-template` | Article template (`seoTitle`, `updated`, calculator links, table scroll), `/about`, footer links | none |
| #240 | `seo/thin-pages` | Noindex 216 filler pages; rebuild 48 transit pages with real dates; `/transit` hub | none |
| #244 | `seo/content-refresh` | 7 new articles, 27 rewritten, 2 merged, Nadi fix, voice and link tests | #239, #240 |
| #245 | `seo/hindi-pilot` | Two Hindi articles with hreflang | #244, native read |
| (this) | `docs/seo-audit` | This document | none |

Merge in the order #238, #239, #240, #244, #245. #244 and #245 contain the earlier commits until those land, so their diffs shrink after the earlier merges.

Risks to watch after merge: (1) rankings for `/horoscope/*` and fast-planet `/transit/*` pages will fall to zero, which is intended; if any of them were earning clicks, reverse #240 for those URLs; (2) rewritten articles are shorter, so if any had a long-tail ranking from a phrase I removed, it may wobble for a few weeks; (3) the 301 redirects send two old URLs to their replacements.

## 12. Method (for the next audit)

- Crawl: fetch `/sitemap.xml`, then each URL with redirects followed manually; record status, title, description, canonical, robots meta, H1 count, JSON-LD types, word count, internal links.
- Lighthouse: `npx lighthouse <url> --form-factor=mobile` with local Chrome.
- Dates and frequencies: Swiss Ephemeris via `pyswisseph`, sidereal Lahiri; `scripts/gen_transits.py` regenerates the transit table.
- Guardrails (run in `npm run test:regression`): `seoMetadata.test.ts`, `transits.test.ts`, `nakshatraData.test.ts`, `blogIndex.test.ts`.
