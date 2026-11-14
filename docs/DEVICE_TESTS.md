# Phone and browser checks (v0.13, 14 Nov 2026)

## What was run

| Check | Result |
| --- | --- |
| 20 phone and tablet profiles × 3 languages (Bengali, Hindi, English) × 16 screens | All screens open, no script errors, no sideways scrolling, no text cut off |
| 7 tap-through flows on every profile (scan → card → rating, link check, WhatsApp reply, find filters, help, settings, bottom menu) | Pass |
| Live camera, camera refused, plain `http://` on Wi-Fi | One button works in all three cases (live camera, one-tap photo button, phone camera opens directly) |
| Photo scan without the built-in QR reader (as on iPhone, Firefox, older Android) | The app's own reader reads a tilted, slightly blurred badge photo |
| No internet | Home, help and badges already seen work offline; other screens say "No internet", offer "Try again" and a 112 call button |
| JavaScript level | All page scripts are ES5 (run on phones from about 2016 on); the offline helper (`sw.js`) uses ES2015 |
| Python tests | 46 pass |

Phone profiles: iPhone SE (1st gen, 320 px), iPhone SE (3rd gen), iPhone 13 mini, iPhone 15, iPhone 15 landscape, iPhone 16 Pro Max,
iPhone 17 Pro Max, Galaxy S8, Galaxy S9+, Galaxy S24, Galaxy S24 landscape, Galaxy A55, Galaxy Z Fold 6 (cover and open),
Galaxy Z Flip 6, Pixel 7, Nexus 5, Moto G4, iPad Mini, Galaxy Tab S9.

## Limits of this check

These runs use the Chromium engine with each phone's screen size, pixel density, touch input and browser identity.
That covers Chrome, Samsung Internet and most Android browsers, which use the same engine.
iPhone Safari uses a different engine (WebKit), which could not be run here, so the iPhone results show layout and taps,
not Safari itself. The code avoids features that older Safari lacks or adds fallbacks for them (see below),
but test once on a real iPhone before the jury round.

## Five-minute check on real phones

Do this on one iPhone (Safari) and one Android phone (Chrome or Samsung Internet), over **https** if possible:

1. Open the site. Change language with হি / বা / EN.
2. Tap **Scan the badge**, allow the camera, and hold a printed badge in the box. The provider card should open.
3. Deny the camera once (or use `http://`): a photo option should appear; take a photo of the badge.
4. On the card, tap **Talk**, **Help**, **Rate**; send a rating.
5. Turn on airplane mode, open the same badge again: the saved card shows with a "No internet" note; Help still shows 112.
6. Add to home screen (Safari: Share → Add to Home Screen; Chrome: menu → Install app). The DevBhumi icon should appear.

## What was added for older and different phones

- App icons as PNG (192, 512, maskable 512) for Android install, and `apple-touch-icon` for iPhone home screens.
- `color-scheme: only light` so Samsung Internet's forced dark mode does not invert the colours.
- Safe-area padding for notches and rounded corners, in portrait and landscape.
- Fallbacks when `aspect-ratio` is missing (Safari before 15, old Android WebView), so the scanner box and film poster still show.
- `NodeList.forEach` fallback for Android browsers before Chrome 51.
- Narrow-screen layout for 320–360 px (old iPhone SE, Galaxy Fold cover) and a slimmer menu in landscape.
- Every tap target at least 44 px, including the language buttons.
- No stuck "Loading…" without signal: each screen shows a clear message, "Try again" and 112.
- A badge is never shown as "do not use" just because the phone is offline.
- On a slow network, a late answer no longer draws the previous screen over the one the person has moved to.
