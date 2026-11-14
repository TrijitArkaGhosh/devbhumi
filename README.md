# DevBhumi MVP · Bharosa QR

Visitor web app (PWA) + API for the Kalna pilot. **All providers, prices, ratings and amounts are fictional sample data.**

## Run the demo (no installs, any laptop with Python 3.10+)

```
cd backend
python dev_server.py
```
Open the printed links, for example `http://localhost:8000/b/KLN-0142.<signature>`, on a phone on the same Wi-Fi
(use the laptop's IP instead of localhost). Each link is what a printed Bharosa QR would hold.

Sample badges: KLN-0142 toto (verified) · KLN-0007 homestay (trusted, women-run) · KLN-0031 stall (needs re-check) ·
KLN-0090 boat (safety note) · KLN-0150 toto (inactive).
Demo tokens: Pathik Mitra `demo-mitra-riya` (Riya, Bardhaman) or `demo-mitra-token` (Arup, Kalna), admin `demo-admin-token`.

### What is in the app (v0.3)
| Screen | Address | DPR v9.4 |
|---|---|---|
| Visitor card, rate, complain, help, plan, find, verify before you pay | `/b/<token>`, `#/find`, `#/plan`, `#/help`, `#/verify` | §2 visitor journey, seven features |
| WhatsApp assistant (simulator of the real number) | `#/wa`, or **Open in WhatsApp** on any card | §2 steps 1–6, WhatsApp menu |
| Official booking sites card (printable) | `#/official` | §2 Official links card |
| Report a fake badge | `#/report-fake` | §2 Anti-fraud promise |
| Pathik Mitra app: queue, checklist, offline save and sync, link badge | `#/mitra` (code `demo-mitra-riya`) | §2 Pathik Mitra, §4 verification ladder |
| Printable Bharosa QR badges (district team, code `demo-admin-token`) | `#/badges` | §2 badge, §4 copy-proof design |
| Seva Ledger (public totals, no personal data) | `#/ledger`, open data at `/api/ledger?site=kalna` | §2 by-products, 48-hour fair resolution |

Every screen carries the line "Independent student initiative, not a government service" (DPR §13).

## Run the tests
```
cd backend && python -m pytest -q ../tests
```

## Production
```
pip install -r requirements.txt
export DEVBHUMI_BADGE_SECRET=<long random> ADMIN_TOKEN=<long random>
python seed.py devbhumi_v09.db        # demo data only; production loads real verified records
uvicorn app:app --host 0.0.0.0 --port 8000
```
`app.py` (FastAPI) exposes the same routes as `dev_server.py`; both call `core.py`, which holds every trust rule.
Move to PostgreSQL + PostGIS using the notes at the top of `schema.sql`.

## Connect the real WhatsApp number (DPR §4 Access layer)
The assistant in `backend/whatsapp.py` answers both the in-app simulator and the real number, so they never disagree.
1. In Meta for Developers, create a Business app, add **WhatsApp**, and note the *Phone number ID*, a permanent *access token* and the *App secret*.
2. Set these before starting `uvicorn`:
```
DEVBHUMI_WA_NUMBER=91XXXXXXXXXX        # shown as "Open in WhatsApp" on every card (wa.me link)
DEVBHUMI_BASE_URL=https://your-domain  # links in WhatsApp replies point here
WHATSAPP_VERIFY_TOKEN=<any long random text>
WHATSAPP_APP_SECRET=<App secret>       # every webhook call is checked against this signature
WHATSAPP_TOKEN=<access token>
WHATSAPP_PHONE_ID=<Phone number ID>
DEVBHUMI_WA_SIMULATOR=0                # switch off the in-app simulator in production
```
3. In the WhatsApp settings, set the webhook URL to `https://your-domain/webhook/whatsapp` with the same verify token, and subscribe to **messages**.
4. Print the badge QR as `https://wa.me/91XXXXXXXXXX?text=Bharosa%20KLN-0142.<signature>` or keep the web link `https://your-domain/b/KLN-0142.<signature>`; both open the same card.
The pilot sends only replies to visitors (service messages), never marketing, as the DPR cost note assumes.

## Before launch
- Replace the demo secrets; serve over HTTPS on your own domain only (the QR must never point elsewhere).
- Confirm hospital, police, temple and ferry locations and hours (seed rows are marked sample).
- Connect Bhashini for live speech translation (`talk` screen uses a fixed phrasebook today).
- Set the interpreter phone in `web/app.js` (`CONFIG.interpreterPhone`).
- Native Bengali and Hindi speakers proofread `web/i18n.js`.
- Add the official State homestay portal link to `official_links` once the District Tourism office confirms it.
- Connect Bhashini to `whatsapp.py` for voice notes (today a voice note gets a "coming at launch" reply).

## Files
- `backend/core.py` rules: signed badges, status (verified/trusted/needs re-check/inactive), far-scan flag, 48-hour complaints,
  verify-before-you-pay, offline-safe sync, badge linking, revocation, ledger, audit log
- `backend/schema.sql` tables · `backend/seed.py` Kalna sample data · `backend/app.py` FastAPI · `backend/dev_server.py` zero-install server
- `web/` the PWA (about 72 KB uncompressed, no framework, offline shell) · `tests/` 19 tests

License: MIT.

## Print the Bharosa QR badges
1. Start the server and open `http://localhost:8000/#/badges` on the PC (or **Home › More › Printable Bharosa QR badges**).
2. Enter the district team code (`demo-admin-token` in the demo).
3. Under **Address inside the QR**, keep the Wi-Fi address it found (for example `http://192.168.0.104:8000`), so a phone on the same Wi-Fi can open the card. After launch, choose **Other address** and enter your https website.
4. Press **Print badges**: an A4 sheet, three badges per row, each QR 45 mm. Inactive badges are never printed.
QR codes are drawn on the PC by `web/qr.js` (MIT-licensed QR encoder by Kazuhiko Arase), so this works offline.

## Scanning a badge inside the app
**Take a photo of the badge** works on every phone and on any address: tap it, take the photo, then tap ✓ (OK).
The badge nearest the middle of the photo is read, so other badges in the picture do not matter.

**Open camera** is the live scanner: a focus box, zoom (where the phone supports it), torch, and tap-to-focus.
Only the badge inside the box is read. Phones allow the live camera only on **https://** addresses.

### Test the live camera on your phone (https on your own Wi-Fi)
1. Once: `pip install cryptography`
2. Double-click `backend\start_https.bat` (or run `python make_cert.py`, then
   `python -m uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile dev_cert\key.pem --ssl-certfile dev_cert\cert.pem`).
3. On the phone, open `https://<your-PC-Wi-Fi-address>:8443` (for example `https://192.168.0.104:8443`).
   The first time the phone says the connection is not private: tap **Advanced**, then **Proceed**. This is expected for a test certificate.
4. On the PC, print badges from `https://localhost:8443/#/badges` and keep the `https://...:8443` address in the QR.
The test certificate is for your own testing only. A real launch uses a proper certificate on your domain, with no warning.
`start.bat` starts the normal http:// version. The zero-install server also supports `python dev_server.py --https`.

## Go live (free)

Render (free) runs `backend/dev_server.py` from `render.yaml`; a free ping to `/healthz` every 10 minutes keeps it awake.
Full steps in Bengali: [`docs/GO_LIVE_bn.md`](docs/GO_LIVE_bn.md). Never commit secrets: they live in Render's Environment settings.

## Changelog

**v0.15 (14 Nov 2026), short, easy sign-in codes**
- Pathik Mitra and district-team codes can now be short and easy to remember: after 8 wrong codes from one address in 15 minutes,
  that address waits 15 minutes (the screen says so in Bengali, Hindi and English). Codes are compared in constant time.
- To change a code: Render → devbhumi → Environment → edit `MITRA_TOKEN_BARDHAMAN`, `MITRA_TOKEN_KALNA` or `ADMIN_TOKEN` → Save, rebuild and deploy.

**v0.14.1 (14 Nov 2026), live on Render**
- Live at https://devbhumi-74mh.onrender.com (Render free plan, kept awake by a 10-minute ping to `/healthz`).
- Fix: links in WhatsApp replies now use the live https address (from `DEVBHUMI_BASE_URL`, or `X-Forwarded-Proto` behind the host's proxy) instead of `http://`.

**v0.14 (14 Nov 2026), ready to go live**
- `render.yaml`: one free Render web service running the zero-install server; Render generates every secret on first deploy.
- `/healthz` for the health check and a keep-awake ping (cron-job.org or UptimeRobot every 10 minutes), so the free site never sleeps.
- Live mode (`DEVBHUMI_DEMO_HINTS=0`): sign-in screens no longer show demo codes; Pathik Mitra codes come from `MITRA_TOKEN_KALNA` and `MITRA_TOKEN_BARDHAMAN`.
- The server takes its port from `PORT`; the interpreter call button turns on when `DEVBHUMI_INTERPRETER_PHONE` is set.
- `docs/GO_LIVE_bn.md`: step-by-step Bengali guide (Render, keep-awake, printing live badges, real WhatsApp, presentation-day checklist).
- `.gitignore` keeps databases, certificates and secrets out of GitHub.

**v0.13 (14 Nov 2026), every phone**
- Checked on 20 phone and tablet profiles (iPhone SE to iPhone 17 Pro Max, Galaxy S8 to S24, A55, Z Fold 6, Z Flip 6, Pixel 7, Moto G4, iPad Mini, Galaxy Tab S9),
  in three languages, portrait and landscape: see `docs/DEVICE_TESTS.md`, including a five-minute check for real phones.
- **No internet:** screens no longer stay on "Loading…". They say there is no connection and offer "Try again" and a 112 call button;
  Help still shows 112. A badge is never shown as "do not use" only because the phone is offline (a saved card is shown instead).
- PNG app icons for Android install and an iPhone home-screen icon; Samsung forced dark mode no longer inverts the colours.
- Fallbacks for older Safari and old Android browsers; layouts for 320 px screens, foldable cover screens, landscape and notches.
- Language buttons and all other tap targets are at least 44 px.
- Fix: on a slow network, an answer that arrived late could draw the previous screen over the one the person had moved to. Late answers are now dropped.

**v0.12 (14 Nov 2026), one scan button**
- The home screen now has **one** big button, "Scan the badge". It opens the live camera where the phone allows it.
  Where it cannot (plain http on Wi-Fi, an old browser), the same tap opens the phone's own camera for one photo instead.
  If camera permission is refused, a one-tap "Take a photo of the badge" button appears.
- The photo route stays available as a small link under the button: "Camera not working? Take a photo instead".

**v0.11 (14 Nov 2026), full check and a friendlier home**
- Every screen was opened in Bengali, Hindi and English on a phone and a laptop, and every button and link was pressed:
  no script errors, no broken links, no sideways scrolling. Ten end-to-end flows pass in all three languages
  (scan → rate, complaint → status, link check, fake-badge report, WhatsApp reply, Pathik Mitra check, badge printing, settings, filters, help).
- **New home screen:** a green welcome card with the two scan buttons and three promises (own price, checked in person, help in your language),
  then four large tiles with icons: find, plan, check before paying, help and 112. The film card follows.
- **Settings:** language choice, real on/off switches for large text and high contrast, and an About card with the version.
- **Clearer messages:** opening Rate or Complaint without a scanned badge now explains why, instead of jumping home;
  "Check before you pay" asks for a link, phone or UPI ID instead of failing silently; the greyed interpreter button says the number is added at launch.
- Opening hours now read naturally in each language (e.g. সকাল ৬টা – রাত ৮টা), and the fake-badge form label is translated.
- Touch targets of at least 44 px for WhatsApp chips, back buttons, official links and small text links.
- On laptops the top bar and bottom menu line up with the page instead of stretching across the screen.
- Sample data: Gopal Mihidana Stall is due for a re-check, so Riya's Pathik Mitra app has a visit to show.

**v0.10 (14 Nov 2026), watch the film**
- New **Our story** card on the home screen: the animated film "প্রতিশ্রুতি · The Promise" (6 min, Bengali, Hindi and English subtitles),
  with a poster from the film and a link that opens on Google Drive in a new tab. Text in Bengali, Hindi and English.
- The poster (`web/film.jpg`, 19 KB) is cached for offline use (`devbhumi-shell-v11`); the video itself streams from Drive.
- To change the link later, edit `FILM_URL` near the top of `web/app.js`.

**v0.9 (13 Nov 2026), the website tells the film's story**
- **Bardhaman is now the demo town** (website, WhatsApp bot and API defaults). Kalna stays as a second sample site.
- Bardhaman sample data matches the film "The Promise": toto driver **Bhola Das** (BDN-0108), **Mina Pal Homestay** (women-run, elder-friendly, BDN-0021),
  **Gopal Mihidana Stall** (mihidana and sitabhog, BDN-0031), and **Bablu Das**, whose old badge **BDN-0150** was revoked (copied stickers, overcharging)
  and who got a new badge **BDN-0151** after a fresh check.
- Pathik Mitra **Riya** works in Bardhaman (sign-in token `demo-mitra-riya`); Kalna's Pathik Mitra is Arup (`demo-mitra-token`).
- Fix: scanning a revoked badge always shows "do not use", even when the same person later got a new badge.
- Kalna sample names changed so each name belongs to one place: Lakshmi Das Homestay, Nitai Makha Sandesh Stall, Pintu Toto.
- Seva Ledger and Pathik Mitra screens no longer say "Kalna" everywhere.

**v0.8 (13 Nov 2026), Bhola Das of Bardhaman**
- New sample site **Bardhaman** with toto driver **Bhola Das** (Diya's father in the film "The Promise"), badge **BDN-0108**:
  station to Nawabhat 108 Shiva temples ₹80, to Bardhaman Rajbari ₹40, to Curzon Gate ₹30; UPI `bhola.das@upi` shows as a verified provider.
- Bardhaman help places (hospital, police, help desk at the junction) and the Nawabhat temple; coordinates are samples, confirm before launch.
- After scanning a badge, the Help screen shows that badge's own town.
- The Kalna sample toto is now called Shyamal Das (still KLN-0142), so the name Bhola belongs to the Bardhaman driver only.
- Badges page prints badges for all sites; WhatsApp demo buttons use BDN-0108 and `bhola.das@upi`.
- Demo database is now `devbhumi_v09.db`, so the new data loads by itself the first time you start.

**v0.7 (13 Nov 2026), real-phone scanning**
- Several badges in one photo or camera view: the one nearest the middle is read (tested on the photo sent from a real phone, and on 12 photos with six badges each: 12/12 middle badge).
- Live scanner: square focus box, only the badge inside it is read, zoom slider, torch, tap-to-focus, continuous autofocus, close button.
- Photo option: checks the middle of the photo first at higher detail; hint "Take the photo, then tap ✓ (OK)".
- `make_cert.py`, `start_https.bat`, `start.bat`, and `dev_server.py --https` to test the live camera on a phone over https on your Wi-Fi.
- Badges page uses https addresses in the QR when opened over https.

**v0.6 (13 Nov 2026), colours**
- Page background is now the warm beige `#EADFD2` on every screen (header, page and bottom bar); the selected tab is a shade darker (`#D6C3AD`) so it stays visible.
- Borders darkened slightly to stay visible on the new background; all text keeps at least 4.5:1 contrast. High contrast mode (Settings) still switches to white and black.
- "Take a photo of the badge" uses the same text size as the other buttons; no empty gap under the scan buttons.

**v0.5 (13 Nov 2026), scanning on every phone**
- `web/qrscan.js`: a QR reader that runs on the phone (finder patterns, perspective correction, Reed-Solomon error correction).
  Used when the browser has no built-in reader (iPhone Safari, Firefox).
- **Take a photo of the badge** button on the home screen; clearer messages for a photo with no badge or a QR from another website.
- QR maker now stores text as UTF-8 (Hindi and Bengali text in a QR come out correctly).
- `dev_server.py` security policy allows the photo preview (`blob:` images).
- Checked: error correction 3,000/3,000 exact and 0 wrong answers past the limit; 90/102 distorted test images read
  (OpenCV, for comparison, 88/102); 0 false reads on 120 images with no QR; live camera opens the card in under a second with the built-in reader removed (the iPhone path); a tilted phone photo opens the card in 0.1 s.

**v0.4 (13 Nov 2026), printable badges**
- New `#/badges` page for the district team: signed QR for every active badge, Wi-Fi address detected automatically (`/api/admin/badges`), A4 print layout, warning if `localhost` is chosen.
- `dev_server.py` prints the phone address and the badges link at start-up.
- Checked: 44 backend tests; every printed QR decoded by an independent reader (OpenCV) to the exact signed link, and each link opened the right provider card.

**v0.3 (13 Nov 2026), DPR features**
- WhatsApp assistant (`backend/whatsapp.py`, `bot_strings.json`): badge card, menu (find, plan, help, verify, official sites), Sakhi, Bhasha Setu phrases, rating, complaints with status, fake-badge reports, language detection (Hindi, Bengali, English). Meta Cloud API webhook with signature check; simulator at `#/wa`.
- "Open in WhatsApp" on every active card; Official booking sites card; fake-badge report (a forged sticker no longer needs a real provider to report it).
- Pathik Mitra screens: sign-in code, today's visits (copied-sticker checks first, then re-checks, then new sign-ups), checklist, offline outbox with automatic sync, badge linking.
- Rules added from the DPR: Homestay tag only with State portal registration; a copied-sticker check must confirm the sticker; a far-away scan stops being flagged once checked; a new signed price sheet replaces the old one; "Listed" providers stay hidden until a Mitra visit.
- Seva Ledger screen and richer `/api/ledger`: trusted, re-check, in-person checks, fake reports, open complaints and anonymous outcomes.
- Fixes: "Verify before you pay" now finds a UPI ID or phone inside a forwarded message, and never vouches for an inactive provider.
- Disclaimer on every screen. Older databases are upgraded automatically at start-up.
- Checked: 42 backend tests; FastAPI routes through a stand-in (23 routes); 263 browser checks on the MVP in 3 languages.

**v0.2 (13 Nov 2026), cross-check fixes**
- Rate and Complain now remember the last scanned badge, so a reload or reopened tab no longer sends the visitor back to Home.
- A rejected (forged) badge is no longer kept as the current badge.
- Crowd-forecast legend shows the real bar colours; removed the focus outline drawn around the whole screen after navigation.
- Offline cache bumped to `devbhumi-shell-v3` so installed phones pick up the new files.
- Checked: 19 backend tests, 31 FastAPI route checks (all 17 routes, with matching routes in `dev_server.py`), and 193 browser checks across every screen in Hindi, Bengali and English.

**v0.1**: first release.
