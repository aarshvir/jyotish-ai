## 10. Lifecycle, Email & WhatsApp

**The most important thing to understand before you read this section:** the hard part is already built and live. VedicHour already sends four automated lifecycle messages by itself — you do not write or trigger them. Your job here is three small things: (a) flip the switches on (paste a few keys into Vercel), (b) run a tiny **manual layer** on top — a handful of copy-paste emails, WhatsApp follow-ups, and one buyer-feedback message — and (c) work the **/admin Call list** to make founder phone calls. That's it. Everything below is copy-paste.

---

### 10.1 What's already automated (do NOT rebuild this — just confirm it's ON)

These four flows already exist in the codebase and fire on their own. You never touch them once the keys are in. They are designed to silently no-op (do nothing, break nothing) until the keys are present — so the *only* difference between "off" and "on" is whether you've pasted the keys into Vercel.

| # | Automated message | When it fires | Channels | What it says (already written) |
|---|---|---|---|---|
| 1 | **Welcome** | The first time a new user signs in | Email | "Welcome, [name]" + 3 ways to start (free Kundli, hour-by-hour forecast, Gun Milan) |
| 2 | **Report ready** | The moment a report finishes generating | Email + WhatsApp | "[name], your reading is ready" + a button to open it + one soft upsell line |
| 3 | **Abandoned-checkout recovery** | Once, ~20–44h after someone starts checkout but doesn't pay | Email + WhatsApp | "[name], your reading is one step away" + **NEWUSER30** (30% off) + 24h money-back line |
| 4 | **Founder daily digest** | Once a day (folded into the daily cron) | Email to you | Signups, reports started/completed, paid orders, revenue, failed reports + a button to /admin |

All four are sent through **Resend** (email) and **Twilio** (WhatsApp). The email domain is already verified, the copy is already encoding-safe and premium, and the abandoned-checkout email already uses the real **NEWUSER30** coupon. Do not re-propose building any of this.

#### Turn email ON (Resend) — 3 minutes, one time

You said the Resend domain is already verified. You just need the API key in Vercel.

1. Go to **https://resend.com/api-keys** → sign in → click **Create API Key** → name it `vedichour-prod` → Permission: **Full access** → **Add**.
2. **Copy the key** (it starts with `re_…`). You only see it once — copy it now.
3. Go to **https://vercel.com** → your VedicHour project → **Settings** → **Environment Variables**.
4. Add these three (click **Add New** for each; set Environment to **Production**, **Preview**, and **Development** — tick all three boxes):

   | Name | Value to paste |
   |---|---|
   | `RESEND_API_KEY` | the `re_…` key you just copied |
   | `EMAIL_FROM` | `VedicHour <hello@vedichour.com>` |
   | `FOUNDER_EMAIL` | `aarshvir@gmail.com` |

5. Click **Save**. Then go to the **Deployments** tab → on the latest deployment click the **⋯** menu → **Redeploy** → confirm. (Env vars only take effect on the next deploy.)
6. **Test it:** sign up with a throwaway email (or have a friend sign up). Within a minute you should get the **Welcome** email. If it lands, email is live for all four flows.

> If a Welcome email does NOT arrive: open Vercel → your project → **Logs**, search for `[notify/email]`. If you see `RESEND_API_KEY not set — skipped`, the key didn't save or you didn't redeploy. If you see `Resend error 403`, the from-domain isn't verified yet — go to **https://resend.com/domains** and finish the DNS verification for `vedichour.com`.

#### Turn WhatsApp ON (Twilio) — optional, do it in week 2

WhatsApp dramatically lifts open rates in India/UAE, but Twilio WhatsApp needs a one-time sender approval, so don't let it block launch. Email alone covers all four flows. When you're ready:

1. Go to **https://www.twilio.com/try-twilio** → create a free account.
2. To test fast, use the **WhatsApp Sandbox**: Twilio Console → **Messaging** → **Try it out** → **Send a WhatsApp message**. It shows a sandbox number like `+1 415 523 8886` and a join code. Send that join code from your own WhatsApp to test.
3. Twilio Console homepage shows your **Account SID** and **Auth Token** — copy both.
4. Back in **Vercel → Settings → Environment Variables**, add three more (all three environments ticked):

   | Name | Value to paste |
   |---|---|
   | `TWILIO_ACCOUNT_SID` | your Account SID (starts `AC…`) |
   | `TWILIO_AUTH_TOKEN` | your Auth Token |
   | `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (sandbox) — later your approved number |

5. **Save → Redeploy** (same as above).
6. **Test:** generate a report on an account whose phone is joined to the sandbox; you should get the "your reading is ready" WhatsApp.

> **Production note (not now):** the sandbox only messages people who joined it, and free-form text only reaches users inside a 24-hour window. For cold business-initiated WhatsApp at scale you'll later request an approved Twilio WhatsApp number + a message template. That's a week-3+ task; the sandbox is plenty for launch testing. Cost: Twilio WhatsApp is roughly **$0.005–$0.08 per message** depending on country — trivial at launch volume. Worth it.

#### One-screen checklist — "is lifecycle ON?"

```
[ ] RESEND_API_KEY pasted in Vercel (all 3 environments)
[ ] EMAIL_FROM = VedicHour <hello@vedichour.com>
[ ] FOUNDER_EMAIL = aarshvir@gmail.com
[ ] Redeployed after adding keys
[ ] Test signup → Welcome email arrived
[ ] (week 2) TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM pasted
[ ] (week 2) Test report → WhatsApp arrived
```

---

### 10.2 Your manual lifecycle layer (the part you actually run)

The automation handles the *transactional* moments (you signed up; your report is ready; you abandoned checkout; here's your digest). The **manual layer** is the warm, human, founder-led follow-up that turns a free user into a paying one — and a buyer into a repeat buyer and a reviewer. This is where launch revenue is won.

**Where you run it:** open **/admin → Call list** (your CRM tab). It lists every user who gave a phone number, with their name, email, phone (click-to-call), plan, report count, total spend, and last-seen date. There's a **"Paid customers only"** toggle. This one screen powers both your WhatsApp follow-ups *and* your phone calls (Section 10.4).

**The golden rule for everything below:** calm, never fear-based, no guarantees, no medical/legal/financial/relationship claims. Use "clearer / heavier timing windows," never "good/bad fate" or "fix your life." Every link carries a UTM so it shows up in **/admin → Acquisition**.

#### Your two UTM links (use these exact ones in all manual messages)

```
Free-user nudge to upgrade:
https://www.vedichour.com/pricing?promo=NEWUSER30&utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup

Soft "try the free Kundli" share:
https://www.vedichour.com/free-kundli?utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup
```

---

#### A. Free-user → paid: the 3-message manual sequence (email or WhatsApp)

Send these to people who got the **free preview** but haven't bought. The automated welcome/report-ready already went out; this is *your* layer on top. Space them ~2 days apart. Pull the list from **/admin → Call list** (leave the "Paid only" toggle OFF — you want free users).

> **Don't have time to send these one by one?** That's fine — these three are exactly what you'd schedule in a tool later. For launch, send them manually from your own Gmail/WhatsApp to your warmest 30–50 free users. Personal beats automated for the first 100 customers.

**Message 1 — "did it land?" (send ~Day 1–2 after their free preview)**

```
Subject: Quick question about your VedicHour reading

Hi [first name],

You generated your free VedicHour preview the other day — I'm the founder, and I read every early reply personally.

One quick question: did the timing windows make sense to you?

If it felt useful, your full hour-by-hour forecast goes a lot deeper — it rates all 18 planetary hours of your day, not just one daily summary. Code NEWUSER30 takes 30% off your first paid report:

https://www.vedichour.com/pricing?promo=NEWUSER30&utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup

No pressure at all — even a one-line reply on what was clear or confusing genuinely helps me improve it.

— Aarsh, VedicHour
```

**Message 2 — the "one mood vs. many windows" angle (send ~Day 3–4)**

```
Subject: Your day isn't one mood

Hi [first name],

Most horoscopes give you one verdict for the whole day. Real life doesn't work like that — some hours are clearer, some are heavier.

That's the whole idea behind the full VedicHour forecast: a personal timing grid for the day, computed with Swiss Ephemeris precision and explained in plain English.

If you want to try it, NEWUSER30 = 30% off, and there's a 24-hour money-back guarantee either way:

https://www.vedichour.com/pricing?promo=NEWUSER30&utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup

— Aarsh
```

**Message 3 — last soft nudge (send ~Day 6–7)**

```
Subject: Last note from me

Hi [first name],

Last note from me on this — no follow-ups after today.

Your free Kundli is the starting point; the deeper reports (hour-by-hour forecast, deep Kundli, or Gun Milan matchmaking) are where it gets genuinely personal. If now's the time:

https://www.vedichour.com/pricing?promo=NEWUSER30&utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup

And if it's just not for you, no worries at all — thanks for trying it.

— Aarsh
```

---

#### B. WhatsApp follow-ups (short, warm, India/UAE-friendly)

WhatsApp messages must be shorter and softer than email. Send these from your own WhatsApp using the phone numbers in **/admin → Call list** (tap the click-to-call number to copy it). Only message people who gave you their number — they opted in.

**WhatsApp 1 — free user, gentle nudge**

```
Namaste [first name] 🙏 This is Aarsh, founder of VedicHour. You tried your free reading recently — did the timing windows make sense? If you'd like the full hour-by-hour forecast, NEWUSER30 gives 30% off: https://www.vedichour.com/pricing?promo=NEWUSER30&utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup
```

**WhatsApp 2 — answer-a-question opener (best reply rate)**

```
Hi [first name] 🙏 Quick one — is there a specific area you wanted your VedicHour reading to cover (career, relationship, timing for a decision)? Happy to point you to the right report. No pressure either way.
```

**WhatsApp 3 — paid buyer, day-after check-in (this builds loyalty + reviews)**

```
Namaste [first name] 🙏 Thank you for your VedicHour report — I hope the timing windows are useful. I'm the founder and I read every reply. If anything was unclear, just tell me and I'll help. 🌙
```

> **WhatsApp safety:** don't blast identical messages to dozens of numbers in one minute — space them out (a few per minute), or WhatsApp may restrict your number. Never message someone who didn't give you their number. Never imply you know their personal hardship.

---

#### C. Buyer-feedback request (send to every paying customer)

This is the single highest-leverage manual message you'll send. It does three jobs at once: gives you product feedback, surfaces testimonials, and makes the buyer feel cared-for (which drives repeat purchases). Send it 1–2 days after purchase, by email or WhatsApp. Pull buyers from **/admin → Call list** with the **"Paid customers only"** toggle ON.

**Buyer feedback — email**

```
Subject: Two minutes? (founder asking)

Hi [first name],

Thank you for buying a VedicHour report — it genuinely means a lot this early.

I'm the founder, and I'm using early feedback to improve the product before I scale it. Could you send me 1–2 honest lines?

1. What felt useful?
2. What was confusing or missing?
3. Would you recommend it to a friend?

That's it — even one line helps.

— Aarsh, VedicHour
```

**If they reply positively, send this follow-up (gets you a usable testimonial, compliantly):**

```
Thank you — that's so good to hear. Would you be comfortable if I shared that as anonymous feedback on the website and socials? No name or personal details unless you explicitly say it's OK. 🙏
```

> Save every positive reply into a note called "VedicHour Testimonials." These become social proof for your landing page and ads — and because you got explicit permission, they're compliant.

#### D. Let AI personalize any of the above (so it never sounds copy-pasted)

When you have a specific person's profile (you can see their plan, report count, and spend in /admin), paste this into **ChatGPT** or **Claude** to make the message feel one-to-one:

```
You are writing a short, warm follow-up message for VedicHour, an AI Vedic astrology
platform (free Kundli + hour-by-hour timing forecast, Swiss Ephemeris precision).
The founder, Aarsh, is sending it personally.

Here is the person:
[paste: name, what they bought or that they're a free user, anything you know]

Goal: [pick one — get honest feedback / nudge a free user to the paid forecast / thank a buyer]

Rules:
- Under 80 words. Sound human and specific, like a founder, not marketing.
- Calm and credible. NO fear, NO guarantees, NO medical/legal/financial/relationship claims.
- Say "clearer / heavier timing windows," never "good/bad fate."
- If nudging to paid, mention NEWUSER30 = 30% off and a 24-hour money-back guarantee.
- End with a soft question, not a hard ask.
- Use this link if relevant:
  https://www.vedichour.com/pricing?promo=NEWUSER30&utm_source=founder&utm_medium=manual&utm_campaign=lifecycle_followup

Write: (1) an email version, (2) a WhatsApp version (shorter).
```

---

### 10.3 The lifecycle daily rhythm (10 minutes)

Fold this into your daily routine. It's tiny, and it compounds.

```
[ ] Open the founder daily-digest email → glance at signups, paid orders, revenue
[ ] Open /admin → Call list (Paid OFF) → send Message 1 to yesterday's new free users (5–10)
[ ] Send the right follow-up (Msg 2 / Msg 3) to anyone due (~2 days since last touch)
[ ] Open /admin → Call list (Paid ON) → send the buyer-feedback message to yesterday's buyers
[ ] Reply to every email/WhatsApp reply within a few hours (this is where sales happen)
[ ] Make 2–3 founder phone calls (Section 10.4)
```

Weekly: open **/admin → Acquisition** and confirm `utm_source=founder` is showing up — that's proof your manual layer is being measured. Open **/admin → Retention** to see who's coming back.

---

### 10.4 Founder phone calls (your unfair advantage)

You're 20, the founder, and calling personally — almost no competitor does this. For your first 100 customers it's the highest-converting channel you have, and the infrastructure is already built: **/admin → Call list**.

**How the captured phone powers it:** at onboarding the app captures the user's phone number. The **Call list** tab shows everyone who gave one, with a **click-to-call** link (on a phone or with click-to-call set up, tapping the number dials it), plus their plan, number of reports, total spend, and last-seen date so you know who's worth a call. The **"Paid customers only"** toggle splits your two call motions:

- **Toggle ON (paid customers):** these are warm thank-you + feedback + repeat-purchase calls. Highest priority.
- **Toggle OFF (free users with a phone):** these are gentle "did your reading make sense?" calls — only call free users who actively engaged (multiple reports, recent activity). Don't cold-call someone who bounced.

**Who to call first, in order:**
1. Anyone who **paid in the last 48h** (thank-you call — builds loyalty, surfaces a testimonial, opens a repeat sale).
2. Free users with **2+ reports** and **recent activity** (high intent — they're using it but haven't bought).
3. Abandoned-checkout users from the last few days (the automation already emailed/WhatsApped them with NEWUSER30 — your call is the human follow-up).

> **Etiquette:** call at a reasonable local hour for their country (the Call list doesn't show timezone, so use judgment — daytime in India/UAE/US as relevant). Keep it under 3 minutes. You're a helpful founder, not a telemarketer. If they don't pick up, do NOT spam-call — send the WhatsApp follow-up instead. Never make any guarantee or claim about outcomes on a call.

**Call script — paid customer (thank-you + feedback + soft repeat)**

```
"Hi [name], this is Aarsh — I'm the founder of VedicHour. I'm not selling anything,
I just personally call early customers to say thank you and ask how your report felt.

[listen]

Did the timing windows make sense to you? ... Was anything confusing?

[listen — take notes for the product]

That's really helpful, thank you. If you ever want to go deeper — there's also the
deep Kundli and the matchmaking reading — but honestly, no pressure. I mainly wanted
to say thanks for being one of the first. Have a good one."
```

**Call script — engaged free user (curiosity, not a pitch)**

```
"Hi [name], this is Aarsh, founder of VedicHour — you tried a free reading recently
and I personally check in with early users. Did the free Kundli make sense to you?

[listen]

Got it. The reason I ask — the full forecast rates all 18 planetary hours of your day,
which is the part most people find genuinely useful. If you ever want to try it, there's
a 30% code (NEWUSER30) and a 24-hour money-back guarantee, so there's no risk in looking.
Either way, thanks for trying it — really appreciate the early support."
```

**After every call:** jot one line in your tracker (or the user's /admin profile notes) — what they said, whether to follow up, and any feedback. Calls + the buyer-feedback message together build the testimonial bank that powers your landing page and ads.

---

### 10.5 Compliance guardrails for the whole lifecycle layer

Everything you send manually must pass these — the automated flows already do:

- **Safe words:** reflection, planning, timing awareness, clearer windows, heavier windows, personal Vedic dashboard.
- **Banned words:** guaranteed, bad luck, fix your life, avoid disaster, become rich, save your marriage, cure, predict exactly.
- **Never imply you know their pain.** Not "struggling in your relationship?" — instead "explore compatibility themes privately."
- **Always honest about the offer:** NEWUSER30 = real 30% off first paid report; 24-hour money-back guarantee is real — say both freely.
- **Always include a UTM** so /admin → Acquisition credits your manual work.
- **One free preview per user** — don't promise more free reports than exist.

**Bottom line:** the machine handles welcome, report-ready, abandoned-checkout, and your daily digest the moment the keys are in. You add the warm human layer — three follow-up messages, WhatsApp check-ins, a buyer-feedback ask, and a few founder phone calls a day off the /admin Call list. That human layer, on top of working automation, is what converts your first hundred customers.
