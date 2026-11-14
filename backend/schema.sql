-- DevBhumi schema. Runs as-is on SQLite (demo). For production PostgreSQL + PostGIS:
--   INTEGER PRIMARY KEY AUTOINCREMENT -> BIGSERIAL PRIMARY KEY; TEXT timestamps -> TIMESTAMPTZ;
--   lat/lon pairs -> GEOGRAPHY(POINT, 4326) with a GIST index; tags/detail -> JSONB.
-- Every public fact carries a source and a verified date. No home address or personal phone is stored in clear text.

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,                 -- 'kalna', 'nabadwip'
  name_bn TEXT, name_hi TEXT, name_en TEXT NOT NULL,
  lat REAL NOT NULL, lon REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id),
  kind TEXT NOT NULL CHECK (kind IN ('toto','boat','homestay','stall','guide')),
  display_name TEXT NOT NULL,
  photo_url TEXT,
  reg_type TEXT,                       -- 'TTEN/VAHAN or successor', 'homestay portal', 'trade licence'
  reg_last4 TEXT,                      -- only the last 4 characters are kept
  phone_hash TEXT,                     -- sha256 of last 10 digits, for "verify before you pay"; never shown
  upi_hash TEXT,                       -- sha256 of the UPI ID; never shown
  lat REAL, lon REAL,                  -- stand or premises, not a home
  women_run INTEGER NOT NULL DEFAULT 0,
  elder_friendly INTEGER NOT NULL DEFAULT 0,
  wheelchair INTEGER NOT NULL DEFAULT 0,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  item_bn TEXT, item_hi TEXT, item_en TEXT NOT NULL,
  amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),   -- the full price; no hidden fees
  verified_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mitras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id),
  display_name TEXT NOT NULL,          -- first name only is shown to visitors
  token_hash TEXT UNIQUE,              -- sha256 of the device token issued after OTP login
  certified_at TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  mitra_id INTEGER NOT NULL REFERENCES mitras(id),
  client_uuid TEXT UNIQUE NOT NULL,    -- makes offline re-sync idempotent
  id_seen INTEGER NOT NULL, reg_seen INTEGER NOT NULL, photos INTEGER NOT NULL,
  price_sheet_signed INTEGER NOT NULL, consent_signed INTEGER NOT NULL,
  state_portal INTEGER,                -- homestays only: registered on the State homestay portal (DPR: Homestay tag rule)
  sticker_ok INTEGER,                  -- copied-sticker checks only: sticker on the right vehicle, face and plate match
  complete INTEGER NOT NULL,
  lat REAL, lon REAL,
  checked_at TEXT NOT NULL, synced_at TEXT,
  audit_status TEXT NOT NULL DEFAULT 'none' CHECK (audit_status IN ('none','queued','passed','failed'))
);

CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  version TEXT NOT NULL,
  fields_shown TEXT NOT NULL,          -- JSON list of what the provider agreed to show
  signed_at TEXT NOT NULL,
  file_ref TEXT                        -- scanned form, private storage
);

CREATE TABLE IF NOT EXISTS badges (
  code TEXT PRIMARY KEY,               -- 'KLN-0142'; the QR holds https://<domain>/b/<code>.<hmac>
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  issued_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','inactive')),
  revoked_at TEXT,
  revoke_reason TEXT                   -- private; never published
);

CREATE TABLE IF NOT EXISTS scans (      -- anonymous: no device id, no account
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_code TEXT NOT NULL,
  site_id TEXT NOT NULL,
  at TEXT NOT NULL,
  lang TEXT,
  coarse_lat REAL, coarse_lon REAL,    -- rounded to about 1 km, only with the visitor's permission
  suspicious INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags TEXT,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  category TEXT NOT NULL,
  text TEXT,
  status TEXT NOT NULL CHECK (status IN ('open','mediating','resolved','rejected')),
  created_at TEXT NOT NULL,
  due_at TEXT NOT NULL,                -- created_at + 48 hours
  resolved_at TEXT,
  validated INTEGER NOT NULL DEFAULT 0 -- two validated open complaints make the badge inactive
);

CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id),
  kind TEXT NOT NULL CHECK (kind IN ('hospital','police','helpdesk','temple','ferry')),
  name_bn TEXT, name_hi TEXT, name_en TEXT NOT NULL,
  lat REAL, lon REAL,
  public_phone TEXT,                   -- institutional numbers only
  hours TEXT,
  source TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS official_links (
  domain TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comfort_forecast (
  site_id TEXT NOT NULL REFERENCES sites(id),
  day TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('comfortable','busy','very_busy')),
  PRIMARY KEY (site_id, day)
);

CREATE TABLE IF NOT EXISTS local_spend (  -- provider-confirmed income, for the Seva Ledger
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  month TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  confirmed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  at TEXT NOT NULL, detail TEXT
);

CREATE TABLE IF NOT EXISTS fake_reports (   -- a copied or forged sticker has no real provider, so it is logged here
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  code_seen TEXT,                     -- whatever the visitor saw on the sticker
  text TEXT,
  channel TEXT NOT NULL,              -- web or whatsapp
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','checked','closed')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wa_sessions (    -- WhatsApp chat state; the phone number is stored only as a hash
  wa_hash TEXT PRIMARY KEY,
  lang TEXT NOT NULL DEFAULT 'hi',
  badge_token TEXT,                   -- last badge this visitor scanned
  step TEXT,                          -- what the next reply answers: verify, rate, talk, complain_cat, complain_text
  data TEXT,                          -- small JSON scratchpad for the current step
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scans_site_at ON scans(site_id, at);
CREATE INDEX IF NOT EXISTS idx_ver_provider ON verifications(provider_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_complaints_provider ON complaints(provider_id, status);
