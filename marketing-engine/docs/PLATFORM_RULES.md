# Platform rules this engine follows

Checked 2026-10-10 against the public docs. This is not legal advice.

## Meta ads

[Privacy Violations and Personal Attributes](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/) forbids ads that assert or imply a person's health, finances, religion, age, or similar traits. "You/your" is allowed only without a personal attribute. Health-outcome and "you will get the job" lines are how astrology accounts get rejected.

This engine refuses ad drafts that match those patterns, and it does not generate ads for the quiz's health branch. Landing URL is `/start` with UTMs only. No birth data in the payload. Analytics allowlist drops every other field.

## Google ads

[Personalized advertising](https://support.google.com/adspolicy/answer/143465) restricts advertiser-curated audiences for sensitive interests (health, negative financial status). [Made-for-kids](https://support.google.com/adspolicy/answer/9683742) lists astrology with occult and paranormal as content that must not run on Made-for-kids inventory. Campaign export sets negative keywords for cure, job guarantees, marriage, and pregnancy. Do not upload customer lists built from birth data or quiz free-text.

## Instagram and Threads

[Instagram Terms](https://help.instagram.com/581066165581870) prohibit creating accounts or collecting information in an automated way without permission. Scraping gets accounts restricted.

Official publishing is the [Content Publishing API](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing): professional account, `instagram_content_publish`, container then `media_publish`, about 100 API posts per rolling day. An app posting for a business needs [App Review](https://developers.facebook.com/docs/instagram-platform/app-review/).

**Allowed later, after you finish App Review:** API publish of a Reel or carousel.
**Needs you:** the tap, until that app exists. `ready-to-post/instagram.md` is that tap.
**Ban risk, not built:** browser bots, unofficial schedulers that log in as you, scrapers.

## YouTube

[`videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert) is the permitted upload. OAuth, not an API key. Unverified projects since 28 July 2020 upload as private until YouTube's audit. Quota is small (insert is expensive against the default daily bucket, on the order of a handful of videos). Brand channels need the OAuth user to have access to that channel. This engine writes `ready-to-post/youtube.md` and does not upload.

## Email, blog, RSS

First-party. The blog file is committed into the Next.js blog index. Sending email still needs the existing provider and a real list. The files in `out/email/` are the sequence, not a send.

## Analytics

When CAPI or GA4 Measurement Protocol is connected, send only `event_name`, UTMs, value, currency. Never name, birth date, birth time, birth place, or the quiz's free-text answer.
