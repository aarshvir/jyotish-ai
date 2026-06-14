## 4. Visual Identity & AI Design (copy-paste prompts)

This is your entire brand-design department in one section. You will not open Photoshop. You will not hire a designer. You copy a prompt, paste it into an AI tool you already own (Gemini / ChatGPT), download the image, and drop it where the instructions tell you. Every prompt below is locked to the real VedicHour look so everything you make matches the live site.

> **The one rule that keeps it premium:** navy + gold, lots of empty space, never crowd the frame. If an image ever looks busy, cartoonish, or has gods/temples/zodiac wheels/faces in it, throw it away and regenerate — that look cheapens the brand and trips ad reviewers.

---

### 4.0 Before you start — open these once

| Tool | What you use it for | URL | Cost |
|---|---|---|---|
| **Google Gemini (Advanced)** | Your #1 image generator (Nano Banana / Imagen) | https://gemini.google.com | Already own |
| **ChatGPT (Plus)** | Backup image generator + text-on-image when Gemini misbehaves | https://chatgpt.com | Already own |
| **Canva (free is fine)** | Assembling images + text into posts, carousels, resizing | https://www.canva.com | Free; Pro ~$13/mo optional |
| **Figma (free)** | Optional. Only if you want reusable templates with "First Draft" AI | https://www.figma.com | Free |

Make one Google Drive folder called **`VedicHour Brand`** with three sub-folders: `01 Logos`, `02 Backgrounds`, `03 Post Creatives`. Every download in this section goes into one of those three. That is the whole filing system.

---

### 4.1 The Brand Kit (the single source of truth)

These are the **real** values from the live VedicHour site and the brand SVG files already in the repo. Paste this block into any AI tool before asking it to design, and paste it into Canva's Brand Kit (Canva → "Brand" in the left menu → add these colors and fonts) so every template auto-uses them.

**Colors (hex — copy exactly):**

```text
Navy (primary background)   #0A0A1A
Deep navy (gradient bottom) #06060F
Indigo (gradient top)       #1A2140
Gold (primary accent)       #D4AF37
Soft cream (light text)     #F5EFE0
Soft gold (tint)            #F7F0DF
Slate (muted text)          #475069
White                       #FFFFFF
```

**The signature gradient:** radial, indigo `#1A2140` in the top-right corner → navy `#0A0A1A` in the middle → near-black `#06060F` at the bottom, with a soft gold glow in the top-right. This is *the* VedicHour background. Every banner and post background uses it.

**Fonts:**

```text
Display / headlines : Cormorant Garamond  (fallback: Playfair Display, Georgia)
Body                : DM Sans             (fallback: Inter)
Mono / labels/code  : JetBrains Mono      (fallback: Courier New)  — UPPERCASE, wide letter-spacing
```

In Canva: search these exact names in the font picker. Cormorant Garamond, DM Sans, and JetBrains Mono are all available free.

**The logo mark (so AI matches it):** concentric gold rings forming a subtle sun/mandala, with a solid bright gold dot in the dead center and short gold rays pointing out (top, bottom, left, right, plus four diagonals). Thin elegant strokes, not thick. It reads as both a sun and a clock face — which is the whole "hour by hour" idea.

**Tagline (use exactly, never reword):**

```text
Your Life, Decoded Hour by Hour.
```

**Ad-safe positioning line (use in paid ads / hero spots):**

```text
Not another horoscope — a personal Vedic timing grid.
```

**Safe disclaimer (put on any image that gives "guidance"):**

```text
For reflection and planning only.
```

---

### 4.2 You already have ready-made brand assets — use these FIRST

Before generating anything, know that three production-ready SVG assets already ship inside the project. They are *exactly* on-brand because the developers built them. Find them in your project folder at:

```text
public/brand/logo-square.svg        → the full logo + tagline, 1080×1080
public/brand/social-bg-square.svg   → blank navy/gold post background, 1080×1080 (1:1)
public/brand/social-bg-story.svg    → blank navy/gold story background, 1080×1920 (9:16)
```

They are also live on the website, so you can grab them in a browser without touching code:

```text
https://www.vedichour.com/brand/logo-square.svg
https://www.vedichour.com/brand/social-bg-square.svg
https://www.vedichour.com/brand/social-bg-story.svg
```

**How to use them (foolproof):**
1. Open each URL above in Chrome.
2. Right-click the image → "Save image as…" → save into your Drive `VedicHour Brand` folder. (SVG is a vector file — it stays razor-sharp at any size.)
3. To turn an SVG into a PNG/JPG you can upload anywhere: go to https://cloudconvert.com/svg-to-png → upload the SVG → set width to 1080 (or 1920 for the story) → Convert → Download.
4. The two `social-bg-*` files have a faint placeholder note ("— add your headline here —") baked in. In Canva, upload the PNG, then **cover that note with your own text box** (it sits center, so just place your headline over it).

> **Decision rule:** for your profile picture and the blank post/story backgrounds, the ready-made SVGs are better than anything AI will give you — use them. Use the AI prompts below when you need *variety* (different banners, ad creatives, carousel art) so your feed doesn't look like the same image 30 times.

---

### 4.3 The 14 copy-paste image prompts

**How to run any prompt:** open Gemini → paste the whole prompt → wait → download the image into your Drive folder. If it's not perfect, reply in the same chat with a fix like *"more minimal, move the glow to the top-right, remove all text, darker background"* and it edits the same image. Try ChatGPT's image generator with the identical prompt if Gemini's result is weak.

> Every prompt already contains the safety guardrail line ("no gods, no temples, no zodiac wheels, no faces, no hands"). **Do not delete that line** — it keeps the brand premium and keeps ads compliant.

---

#### Prompt 1 — Logo / app icon (1:1)

*Use for: Instagram/TikTok/YouTube/X profile pictures, app icon, favicon. (Or just use the ready-made `logo-square.svg`.)*

```text
Create a premium minimalist app logo icon for a brand called VedicHour.
- Three thin concentric gold (#D4AF37) circles forming a subtle sun/mandala that also reads like a clock face.
- A single solid bright gold dot in the exact center.
- Eight short thin gold rays pointing outward (top, bottom, left, right, and four diagonals).
- Background: deep navy #0A0A1A with a very faint warm gold glow behind the rings.
- Flat, elegant, high contrast, perfectly centered, generous empty margin.
- No text, no letters. No gods, no temples, no zodiac wheels, no faces, no hands, no religious icons.
- Square, 1080x1080.
```
→ Goes to: `01 Logos`. Set as every social profile photo.

---

#### Prompt 2 — Cover banner (16:9, text-safe left side)

*Use for: YouTube channel banner, Facebook/X/LinkedIn cover, website OG share image.*

```text
Create a luxurious minimal cosmic banner for VedicHour, an AI Vedic astrology brand.
- Radial night-sky gradient: indigo #1A2140 top-right, fading to navy #0A0A1A, to near-black #06060F bottom-left.
- A soft warm gold (#D4AF37) glow in the top-right corner.
- A few faint thin gold constellation lines connecting tiny stars in the upper-right third only.
- The entire LEFT HALF must be clean, dark, and empty — reserved for a text headline overlay.
- Calm, premium, modern, mystical. Fintech-meets-Jyotish, not clip-art.
- No text in the image. No gods, temples, zodiac wheels, faces, hands, or religious icons.
- 1600x900.
```
→ Goes to: `02 Backgrounds`. In Canva, add the tagline "Your Life, Decoded Hour by Hour." over the empty left half in Cormorant Garamond, cream `#F5EFE0`.

---

#### Prompt 3 — Square post background (1:1, center kept empty)

*Use for: reusable Instagram/Facebook feed posts, quote cards. (Or use `social-bg-square.svg`.)*

```text
Create a premium square social background for VedicHour.
- Deep navy #0A0A1A base with a radial gradient lifting to indigo #1A2140 in the top-right.
- A soft gold #D4AF37 glow in the top-right; a scatter of faint cream stars; one or two thin gold constellation lines near the edges only.
- The CENTER must stay dark and empty for a text overlay.
- Optional: a single very faint thin gold circular ring arc in a corner, like a partial timing dial.
- Minimal, uncluttered, calm, premium.
- No text. No gods, temples, zodiac wheels, faces, hands, or religious symbols.
- 1080x1080.
```
→ Goes to: `02 Backgrounds`.

---

#### Prompt 4 — Vertical story / Reel background (9:16, center empty)

*Use for: Instagram/TikTok/YouTube Shorts backgrounds, story slides. (Or use `social-bg-story.svg`.)*

```text
Create a vertical 9:16 premium background for VedicHour short videos and stories.
- Deep navy near-black #0A0A1A to #06060F, with a faint indigo #1A2140 lift and a soft gold glow near the top.
- A thin elegant gold circular "timing dial" arc, partially visible, low-opacity, in the upper area.
- A subtle scatter of faint cream stars.
- The vertical center band must stay dark and empty for large text captions.
- Minimal, premium, calm, modern AI-Jyotish aesthetic.
- No text, no people, no gods, no temples, no zodiac clip-art, no faces, no hands.
- 1080x1920.
```
→ Goes to: `02 Backgrounds`. This is your faceless-video base.

---

#### Prompt 5 — Hero product graphic: the timing grid (the differentiator)

*Use for: the "what makes us different" post, ad creative, website hero. This visualizes the 18-hora grid.*

```text
Create a premium abstract data-visualization graphic for VedicHour, an AI Vedic timing app.
- On a deep navy #0A0A1A background, show an elegant vertical stack of about 18 thin horizontal bars, like a daily timeline, glowing in gradients of gold #D4AF37 — some bars brighter, some dimmer, suggesting "clearer" and "heavier" timing windows.
- Tiny faint cream time-label ticks beside the bars (no readable text).
- A soft gold glow behind the brightest bars.
- Clean, minimal, high-end fintech dashboard feel, lots of dark negative space.
- No words, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`. Caption it: "Most apps give one daily horoscope. We rate all 18 planetary hours of your day."

---

#### Prompt 6 — Carousel slide background (cohesive set)

*Use for: educational Instagram/LinkedIn carousels (the highest-save content).*

```text
Create a set background for a premium Instagram carousel for VedicHour.
- Deep navy #0A0A1A with a subtle indigo #1A2140 corner gradient and a faint gold glow.
- A single thin gold accent line along the bottom edge and a small gold dot in the top-left corner as a consistent slide marker.
- Most of the frame dark and empty for headline + body text.
- Calm, premium, editorial, consistent so multiple slides look like a set.
- No text, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1350 (portrait).
```
→ Goes to: `03 Post Creatives`. Reuse the same exported image on every slide so the carousel feels designed.

---

#### Prompt 7 — Ad creative A (clean, ad-policy-safe)

*Use for: Meta/Instagram and Google Display ads. Extra-safe per the compliance rules.*

```text
Create a calm, premium ad background for VedicHour, an AI Vedic astrology app.
- Deep navy #0A0A1A to #06060F gradient, a soft gold #D4AF37 glow top-right, a single faint thin gold circular dial arc in a corner.
- Top third clean for a short headline; bottom third clean for a CTA button area.
- Looks trustworthy, modern, and editorial — NOT spooky, NOT fortune-teller, NOT fear-based.
- No text, no people, no gods, temples, zodiac wheels, faces, hands, or crystal balls.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`. Overlay in Canva: headline "Not another horoscope." + sub "A personal Vedic timing grid." + button "Free Kundli →". Add small footer text "For reflection and planning only."

---

#### Prompt 8 — Ad creative B (the free-Kundli lead magnet)

*Use for: top-of-funnel ads pointing at /free-kundli.*

```text
Create a premium ad background for VedicHour's free Kundli tool.
- Deep navy #0A0A1A, soft gold glow, a faint elegant gold birth-chart-style square grid outline (north-Indian kundli style) rendered as thin minimal gold lines, low opacity, off to one side, abstract and clean — NOT a detailed astrology chart.
- Large clean empty area for a headline and CTA.
- Premium, modern, inviting, calm.
- No text, no gods, temples, zodiac wheels, faces, hands, or deities.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`. Overlay: "Free Kundli in 60 seconds." + "Swiss Ephemeris precision, explained in plain English." + "Start free →".

---

#### Prompt 9 — Vertical ad / Reel cover (9:16)

*Use for: Reels ads, TikTok ads, Shorts thumbnails.*

```text
Create a vertical 9:16 premium ad background for VedicHour.
- Deep navy to near-black gradient, soft gold glow near the top, faint stars, one thin gold dial arc.
- Top 40% clean for a bold headline; bottom 25% clean for a CTA.
- Calm, premium, modern. Not spooky, not fear-based.
- No text, no people, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1920.
```
→ Goes to: `03 Post Creatives`.

---

#### Prompt 10 — Coupon / launch-offer card

*Use for: the NEWUSER30 promo post and story. (This coupon is REAL and works — safe to advertise.)*

```text
Create a premium square promo card background for VedicHour.
- Deep navy #0A0A1A with a brighter gold #D4AF37 glow and a thin elegant gold double-border frame inset from the edges, like a luxury invitation.
- Center kept dark and empty for a big offer headline.
- Elegant, celebratory but restrained, premium.
- No text, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`. Overlay: "30% off your first report" + "Code: NEWUSER30" in JetBrains Mono gold + "Deep Kundli · Matchmaking · Forecasts".

---

#### Prompt 11 — Product comparison graphic (us vs. generic horoscope)

*Use for: the "best Vedic platforms 2026" / comparison angle that ranks VedicHour #1.*

```text
Create a premium minimal split graphic for VedicHour on a deep navy #0A0A1A background.
- Left side: a single dim flat gray circle (representing a generic "one daily horoscope").
- Right side: an elegant glowing gold #D4AF37 vertical stack of many thin bars (representing "18 hourly timing windows").
- A thin gold vertical divider line between them. Lots of dark negative space, room for a label above each side.
- Clean, premium, infographic style.
- No text, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`. Label left "Most apps", right "VedicHour".

---

#### Prompt 12 — Free-tool calculator promo (sade sati / nakshatra / dasha etc.)

*Use for: posts that push your free calculator lead magnets.*

```text
Create a premium square background for a VedicHour free astrology calculator promo.
- Deep navy #0A0A1A, soft gold glow, and a single elegant thin gold circular dial/gauge arc with faint tick marks (abstract, like an instrument), low opacity, off-center.
- Large clean dark area for a tool name and CTA.
- Modern, premium, tool-like, trustworthy.
- No text, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`. Reuse for each free tool by changing only the overlay text (Free Manglik Check, Free Sade Sati, Free Nakshatra Finder, Free Dasha Calculator, etc.).

---

#### Prompt 13 — Testimonial / quote card

*Use for: when real buyers send feedback (only post with their permission, no personal birth data).*

```text
Create a premium square quote-card background for VedicHour.
- Deep navy #0A0A1A with a soft gold glow and a single oversized faint gold quotation-mark glyph in the top-left corner, low opacity.
- A thin gold underline accent near the bottom for an attribution line.
- Center-left kept clean for the quote text.
- Elegant, editorial, premium, calm.
- No text body, no gods, temples, zodiac wheels, faces, or hands.
- 1080x1080.
```
→ Goes to: `03 Post Creatives`.

---

#### Prompt 14 — Email / blog header strip

*Use for: header banner inside the Resend lifecycle emails and at the top of blog posts.*

```text
Create a wide premium header strip for VedicHour emails and blog posts.
- Deep navy #0A0A1A to #06060F gradient, a soft gold glow on the right, a few faint stars, one thin gold constellation line.
- Far left kept clean and dark for a small logo + the tagline.
- Slim, elegant, premium, calm.
- No text, no gods, temples, zodiac wheels, faces, or hands.
- 1600x500.
```
→ Goes to: `03 Post Creatives`. In Canva add the small logo + "Your Life, Decoded Hour by Hour." on the left.

---

### 4.4 Fixing a bad image (the only 6 follow-up prompts you'll ever need)

When a generated image is close but wrong, reply in the *same* chat with one of these (Gemini and ChatGPT both edit the previous image):

```text
1. "Make it darker and more minimal — more empty space, fewer elements."
2. "Move the gold glow to the top-right and remove everything from the center."
3. "Remove all text, letters, and numbers from the image."
4. "Remove anything resembling gods, temples, faces, hands, or a zodiac wheel."
5. "Use exactly these colors: navy #0A0A1A and gold #D4AF37 only."
6. "Make the gold thinner and more elegant — it looks too thick and cheap."
```

---

### 4.5 Figma AI prompts (OPTIONAL — only if you want reusable templates)

You do **not** need Figma to launch. Skip this unless you specifically want one editable template you reuse forever. If you do: go to https://www.figma.com → sign up free → create a new design file → in the toolbar open **"First Draft"** (Figma's built-in AI) → paste a prompt below → it generates an editable layout you just swap text into.

**Figma First Draft — Instagram post template:**
```text
Design a 1080x1080 Instagram post template for a premium Vedic astrology brand called VedicHour.
Background deep navy #0A0A1A. A large headline in a serif font (Cormorant Garamond) in cream #F5EFE0, top-aligned. A short 2-line subheading in DM Sans below it. A small gold #D4AF37 pill-shaped CTA button at the bottom reading "Free Kundli". A tiny gold logo dot + "VedicHour" wordmark in the bottom-left corner. Lots of dark empty space. Minimal, premium, editorial.
```

**Figma First Draft — carousel template (multi-frame):**
```text
Design a set of 6 Instagram carousel slides, each 1080x1350, for VedicHour.
Consistent deep navy #0A0A1A background with a thin gold #D4AF37 bottom accent line and a small gold dot top-left on every slide. Slide 1 is a bold serif title slide. Slides 2-5 each have a short serif headline and 2-3 lines of DM Sans body text. Slide 6 is a CTA slide with a gold button "Start free at VedicHour.com". Premium, editorial, lots of negative space.
```

**Figma First Draft — story/Reel cover:**
```text
Design a 1080x1920 vertical story template for VedicHour. Deep navy to near-black gradient background, a faint gold dial arc near the top, a large serif headline centered in the upper third in cream #F5EFE0, a gold CTA pill near the bottom, small VedicHour wordmark at the very bottom. Minimal and premium.
```
→ In Figma: select the frame → "Export" → PNG → save to Drive. Reuse the file forever; just edit the text.

---

### 4.6 Canva Magic prompts (the FASTER path — recommended over Figma)

Canva is the easier, founder-proof route and where you'll spend most assembly time. Two AI features:

**A) Canva "Magic Design" (generates whole templates from a prompt):**
Go to https://www.canva.com → click **"Magic Design"** (or the purple star "Magic" button) → paste a prompt:

```text
Create an Instagram post for "VedicHour", a premium AI Vedic astrology brand. Dark navy #0A0A1A background, gold #D4AF37 accents, serif headline font, minimal and luxurious. Headline: "Your Life, Decoded Hour by Hour." Subtext: "Free Kundli + an hour-by-hour Vedic timing grid." Small gold CTA button: "Start free".
```
```text
Create a 6-slide Instagram carousel for "VedicHour" explaining "Why hourly timing beats a daily horoscope." Navy and gold premium theme, serif headlines, minimal. Last slide CTA: "Free Kundli at VedicHour.com".
```
```text
Create a 9:16 Instagram Story for "VedicHour" promoting code NEWUSER30 for 30% off the first report. Navy background, gold double-border frame, elegant serif headline, JetBrains Mono code text. Calm and premium.
```

**B) Canva "Magic Media" (Text-to-Image, inside any design):**
Inside a Canva design → left menu **"Apps" → "Magic Media" → "Image"** → paste any of the 14 prompts from section 4.3 → generate → drag onto your canvas. This keeps you inside Canva so you never switch tabs.

**Why Canva over Figma for you:** Magic Resize turns one 1:1 post into 9:16, 16:9, and Pinterest sizes in one click; the built-in scheduler posts to Instagram/Facebook directly; and you set the Brand Kit (4.1) once so every template is auto-on-brand. *Cost: free works; Canva Pro (~$13/mo) adds Magic Resize + scheduler + background remover. Worth it once you're posting daily; not required to launch.*

---

### 4.7 Where every output ends up (the routing table)

| Asset | Made with | Saved to | Then used in |
|---|---|---|---|
| Profile picture | `logo-square.svg` or Prompt 1 | `01 Logos` | All social profiles, /admin |
| Cover banners | Prompt 2 | `02 Backgrounds` | YouTube / FB / X / LinkedIn covers |
| Square post bg | `social-bg-square.svg` or Prompt 3 | `02 Backgrounds` | IG/FB feed posts |
| Story/Reel bg | `social-bg-story.svg` or Prompt 4 | `02 Backgrounds` | Reels/Shorts/TikTok/Stories |
| Timing-grid hero | Prompt 5, 11 | `03 Post Creatives` | Differentiator posts + website |
| Carousel art | Prompt 6 + Canva/Figma | `03 Post Creatives` | IG + LinkedIn carousels |
| Ad creatives | Prompt 7, 8, 9 | `03 Post Creatives` | Meta + Google ads (see ads section) |
| Coupon card | Prompt 10 | `03 Post Creatives` | NEWUSER30 promo posts |
| Free-tool promos | Prompt 12 | `03 Post Creatives` | /free-kundli + calculator posts |
| Testimonial card | Prompt 13 | `03 Post Creatives` | Social proof posts |
| Email/blog header | Prompt 14 | `03 Post Creatives` | Resend emails + /blog |

---

### 4.8 The 60-second brand checklist (run before you post ANY image)

```text
[ ] Background is navy #0A0A1A (not black, not blue, not purple).
[ ] Accents are gold #D4AF37 (thin and elegant, never thick/neon).
[ ] There is generous empty dark space — it does not look crowded.
[ ] NO gods, temples, deities, zodiac wheels, faces, hands, crystal balls.
[ ] Headline font is a serif (Cormorant Garamond); body is DM Sans.
[ ] Tagline, if shown, reads exactly: "Your Life, Decoded Hour by Hour."
[ ] If it gives guidance, the footer says "For reflection and planning only."
[ ] The link/CTA carries a UTM tag so /admin Acquisition can track it.
```

If all eight boxes are checked, it's on-brand and safe to publish.
