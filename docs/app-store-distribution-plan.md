# App Store Distribution Plan (future — not started)

Archived for whenever the POC phase is done and App Store distribution
actually makes sense. Nothing here has been built yet.

## Why this isn't step one

- Apple Developer Program costs $99/year, due before you submit anything.
- This is a plain Next.js web app today — no offline support, no native
  APIs. Apple's App Store Review Guideline 4.2 rejects "a website
  wrapped in a native app shell" with no meaningfully native behavior.
  Passing review means adding real native touches, not just wrapping
  what exists now.
- The PWA "Add to Home Screen" setup already gets most of the "feels
  like an app" experience for $0. Worth staying there until there's
  real demand to justify the cost and review overhead below.

## Recommended approach when the time comes: Capacitor wrapper

Keeps this exact Next.js codebase — wraps it in a thin native shell
rather than a full rewrite. Considered and rejected: a full React
Native / native Swift rewrite (much larger effort, only worth it if
this app needs deep native functionality Capacitor can't reach).

### 1. Prerequisites
- Apple Developer Program enrollment ($99/yr) — needed before any
  TestFlight or App Store submission step below.
- A Mac with Xcode installed (already true for this project).
- Decide on a bundle identifier (e.g. `re.nearfutu.cardnukes` or
  similar reverse-domain string) and register it in the Apple
  Developer portal.

### 2. Add native-feeling functionality (do this BEFORE wrapping)
Needed to survive App Store review, not just nice-to-haves:
- Push notifications (e.g. "your card's price moved") — real native
  hook, addresses Guideline 4.2 directly.
- Offline support / local caching so the app does something useful
  without network (service worker or Capacitor's local storage).
- Native share sheet integration for sharing a card's valuation.
- Consider a native camera capture flow for the scan feature instead
  of the web file-input, since that's the app's core interaction.

### 3. Wrap with Capacitor
- `npm install @capacitor/core @capacitor/cli @capacitor/ios`
- `npx cap init` (uses the bundle id from step 1)
- Point Capacitor at the deployed Vercel URL (server.url in
  capacitor.config) rather than bundling a static export, so the app
  keeps hitting the same live Neon/R2-backed API — no separate mobile
  backend needed.
- `npx cap add ios` generates the Xcode project.
- Add whatever native plugins the step-2 features need
  (`@capacitor/push-notifications`, `@capacitor/share`, `@capacitor/camera`).

### 4. Build, sign, test
- Open the generated Xcode project, configure signing with the Apple
  Developer team.
- Build and upload a build to TestFlight; test on a real device before
  submitting for review.

### 5. App Store Connect submission
- Create the app listing (name, screenshots, description, privacy
  policy — required even for a free app since it touches camera/photos).
- If charging for the app or adding in-app purchases: must use
  StoreKit/Apple's IAP system for any digital good or subscription:
  Apple takes 15-30% of the transaction. A one-time paid app avoids
  the IAP integration but still pays the same cut.
- Submit for review. Budget for at least one rejection-and-resubmit
  cycle — common even for well-prepared apps.

## Rough cost/timeline (order-of-magnitude, not a quote)
- $99/year Apple Developer fee, due up front.
- Step 2 (native-feeling features) is the real engineering work here —
  likely more effort than the Capacitor wrapping itself.
- Review turnaround is typically 1-3 days per submission once uploaded.

## Open questions to revisit before starting
- Is there real user demand yet to justify this, or is the PWA still
  serving the need?
- Free app, one-time paid, or subscription? Changes the IAP/StoreKit
  scope in step 5.
- Android (Google Play) in scope too, or iOS-only for a first pass?
  Capacitor supports both with the same wrapper, but Play Store review
  and a separate $25 one-time developer fee are their own process.
