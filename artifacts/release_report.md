# VedicHour Android TWA Release Report

**Date:** 2026-04-05  
**Status:** ✅ WEB LIVE | ⏳ ANDROID PENDING  
**Go Live:** NO (blockers below)

---

## Summary

| Phase | Status | Result |
|-------|--------|--------|
| **A) Preflight** | ✅ PASS | Node v22, npm 10.9.3, Next.js 14.2.35 ready |
| **A) Build** | ✅ PASS | `npx next build` succeeded |
| **B) Deploy Web** | ✅ PASS | Vercel prod → https://www.vedichour.com |
| **B) Endpoints** | ✅ PASS | `/manifest.webmanifest` & `/.well-known/assetlinks.json` reachable |
| **C) TWA Init** | ⏹️ BLOCKED | Bubblewrap init interactive (JDK/SDK prompts) |
| **D) Play Upload** | ⏹️ BLOCKED | Awaiting .aab + service account |
| **E) Asset Links** | ⏹️ PENDING | Awaiting Play signing fingerprint |

---

## ✅ COMPLETED: Web & PWA

### Deployment
```bash
Vercel production: https://www.vedichour.com
Deployment ID: dpl_77tdw1JeZr1Pj1R5cieGvpmdTa1B
Status: READY
```

### Endpoints Verified
- **Manifest:** https://www.vedichour.com/manifest.webmanifest (200 application/manifest+json)
- **Asset Links:** https://www.vedichour.com/.well-known/assetlinks.json (200 application/json)
  - Currently returns `[]` (env vars not set — expected until Play signing fingerprint is available)

### Web Build Summary
```
✓ Compiled successfully
✓ All routes prerendered or configured for dynamic rendering
✓ No breaking errors; ESLint warnings only (pre-existing)
```

---

## ⏹️ BLOCKERS: Android TWA Release

### Blocker C.1: Bubblewrap Interactive Setup
**Severity:** MANDATORY  
**Why:** Bubblewrap CLI prompts for JDK/SDK installation in interactive mode. Cannot automate without UI.

**Resolution:**
```bash
# On your local machine (with display/terminal):
bubblewrap init --manifest=https://www.vedichour.com/manifest.webmanifest

# Follow prompts:
# 1. "Install JDK?" → Yes (or provide your JDK 17 path)
# 2. "Install Android SDK?" → Yes (or provide your Android SDK path)
# 3. Confirm app name: VedicHour
# 4. Confirm package: com.vedichour.app

# Expected output: twa-manifest.json + android/ directory
```

### Blocker D.1: AAB Not Generated
**Severity:** DEPENDS_ON_C.1  
**Why:** `bubblewrap build` cannot run until init completes.

**Resolution:**
```bash
# After Blocker C.1 resolved:
bubblewrap build

# Expected output: app-release-bundle.aab
ls -la app-release-bundle.aab
```

### Blocker D.2: Play Service Account Missing
**Severity:** DEPENDS_ON_USER_GCP_SETUP  
**Why:** Fastlane upload requires Google Cloud service account with Play API permissions.

**Resolution (Google Cloud Console):**
1. Go to https://console.cloud.google.com
2. Create Service Account → Name: `vedichour-play-upload`
3. Grant Role: `Play API User`
4. Create JSON Key → Download
5. Save securely: `~/secure/play-service-account.json`

**Then set environment:**
```bash
export PLAY_SERVICE_ACCOUNT_JSON_PATH=~/secure/play-service-account.json
```

### Blocker D.3: Play Console App Not Listed
**Severity:** DEPENDS_ON_USER_PLAY_SETUP  
**Why:** App must exist in Play Console before upload; store listing required for public release.

**Resolution (Play Console):**
1. Go to https://play.google.com/console
2. Create App → Name: `VedicHour`, Package: `com.vedichour.app`
3. Add Store Listing:
   - Description (copy from web marketing)
   - Privacy policy URL: https://www.vedichour.com/privacy
   - Screenshots (can be placeholder for internal testing)
   - Content rating (complete questionnaire)
4. Link Google Cloud service account (settings > API access)

### Blocker E.1: Play Signing Fingerprint Unknown
**Severity:** DEPENDS_ON_D_SUCCESS  
**Why:** Digital Asset Links requires exact SHA-256 cert fingerprint from Play App Signing.

**Resolution (after D.1–D.3):**
1. Upload .aab to Play Console internal testing track
2. Navigate to: App > App integrity > App signing
3. Copy **SHA-256 certificate fingerprint**
4. Set Vercel environment variable:
   ```bash
   vercel env add ANDROID_TWA_SHA256_FINGERPRINTS
   # Paste: AB:CD:EF:... (colon-separated hex)
   ```
5. Redeploy:
   ```bash
   vercel --prod --yes
   ```
6. Verify assetlinks endpoint:
   ```bash
   curl https://www.vedichour.com/.well-known/assetlinks.json | jq .
   # Should return non-empty JSON with your package + fingerprint
   ```

---

## 📋 Remaining Steps (In Order)

### Phase 1: Local Android Build (User interaction required)
```bash
# 1. Resolve JDK/SDK
bubblewrap init --manifest=https://www.vedichour.com/manifest.webmanifest

# 2. Build AAB
bubblewrap build

# 3. Verify artifact
ls -la app-release-bundle.aab
```

### Phase 2: Google Cloud Setup (User interaction required)
```bash
# 1. Create service account in Google Cloud Console
# 2. Download JSON key to ~/secure/play-service-account.json
# 3. Set env
export PLAY_SERVICE_ACCOUNT_JSON_PATH=~/secure/play-service-account.json

# 4. Upload to Play (fastlane)
fastlane supply \
  --aab ./app-release-bundle.aab \
  --package_name com.vedichour.app \
  --track internal \
  --json_key "$PLAY_SERVICE_ACCOUNT_JSON_PATH" \
  --skip_upload_images \
  --skip_upload_screenshots \
  --skip_upload_metadata
```

### Phase 3: Play Console Setup (User interaction required)
```bash
# 1. Create app listing in Play Console
# 2. Complete store listing (description, privacy policy, ratings)
# 3. Link service account (API access)
# 4. Monitor internal testing track upload status
```

### Phase 4: Asset Links Finalization (Automated once fingerprint available)
```bash
# 1. Get SHA-256 fingerprint from Play Console
# 2. Add Vercel env var: ANDROID_TWA_SHA256_FINGERPRINTS=<fingerprint>
# 3. Redeploy
vercel --prod --yes

# 4. Verify
curl https://www.vedichour.com/.well-known/assetlinks.json | jq .
```

---

## 📊 Final Status

### ✅ GO LIVE: NO
**Reason:** Android TWA release has mandatory external blockers (Bubblewrap interactive setup, Play Console + GCP service account configuration).

### Web Site Status: ✅ LIVE
- Production deployed and verified
- PWA manifest available
- Asset Links endpoint ready
- No impact to existing users; Android app is separate surface

### Android App Status: ⏳ PENDING USER ACTION
- Web infrastructure complete
- Awaiting user-driven blocker resolution (see phases above)
- Once blockers resolved, Play internal testing release is <5 min away

---

## Artifacts Generated
- `artifacts/release_report.json` — Machine-readable full report
- `artifacts/release_report.md` — This file
- `twa-manifest.json` — Reference TWA config (user must generate via Bubblewrap init)
- `scripts/release/twa-init.sh` — Automation template for future runs

---

**Next Step for User:** Follow **Phase 1** above. Return .aab path for continuation.
