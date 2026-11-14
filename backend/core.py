"""DevBhumi core logic: one place for every trust rule, used by both servers.

Pure Python + sqlite3, so it runs anywhere. In production the same tables live in
PostgreSQL + PostGIS (see schema.sql); only the connection changes.
"""
import hashlib
import hmac
import json
import math
import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = os.path.join(HERE, "schema.sql")
SECRET = os.environ.get("DEVBHUMI_BADGE_SECRET", "dev-only-change-me").encode()
RECHECK_DAYS = 90
TRUSTED_MIN_RATINGS = 10
TRUSTED_MIN_AVG = 4.0
REVOKE_AFTER_VALID_COMPLAINTS = 2
COMPLAINT_SLA_HOURS = 48
FAR_SCAN_KM = 15.0
LANGS = ("bn", "hi", "en")


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse(ts):
    return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def connect(path=":memory:"):
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db(con):
    with open(SCHEMA, encoding="utf-8") as f:
        con.executescript(f.read())
    # upgrade a database made by an older version: add columns that newer versions use
    cols = {r[1] for r in con.execute("PRAGMA table_info(verifications)")}
    for col in ("state_portal", "sticker_ok"):
        if col not in cols:
            con.execute(f"ALTER TABLE verifications ADD COLUMN {col} INTEGER")
    con.commit()


def audit(con, actor, action, entity, entity_id, detail=None):
    con.execute(
        "INSERT INTO audit_log(actor, action, entity, entity_id, at, detail) VALUES (?,?,?,?,?,?)",
        (actor, action, entity, str(entity_id), iso(now()), json.dumps(detail or {}, ensure_ascii=False)),
    )


# ---------------------------------------------------------------- badges
def sign(code):
    """Unique signed suffix per badge. A copied sticker still carries a valid code,
    so copies are caught by the photo + plate match and by far-away scans."""
    return hmac.new(SECRET, code.encode(), hashlib.sha256).hexdigest()[:12]


def badge_url_token(code):
    return f"{code}.{sign(code)}"


def check_token(token):
    if not token or "." not in token:
        return None
    code, sig = token.rsplit(".", 1)
    if not re.fullmatch(r"[A-Z]{3}-\d{4}", code):
        return None
    return code if hmac.compare_digest(sig, sign(code)) else None


def km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def badge_status(con, provider_id, at=None):
    """green verified / gold trusted / amber needs re-check / grey inactive."""
    at = at or now()
    b = con.execute("SELECT status FROM badges WHERE provider_id=? ORDER BY issued_at DESC LIMIT 1", (provider_id,)).fetchone()
    if not b or b["status"] != "active":
        return "inactive"
    valid = con.execute(
        "SELECT COUNT(*) FROM complaints WHERE provider_id=? AND validated=1 AND status!='resolved'", (provider_id,)
    ).fetchone()[0]
    if valid >= REVOKE_AFTER_VALID_COMPLAINTS:
        return "inactive"
    v = con.execute(
        "SELECT checked_at FROM verifications WHERE provider_id=? AND complete=1 ORDER BY checked_at DESC LIMIT 1",
        (provider_id,),
    ).fetchone()
    if not v or (at - parse(v["checked_at"])).days > RECHECK_DAYS:
        return "needs_recheck"
    n, avg = con.execute("SELECT COUNT(*), AVG(stars) FROM ratings WHERE provider_id=?", (provider_id,)).fetchone()
    open_c = con.execute(
        "SELECT COUNT(*) FROM complaints WHERE provider_id=? AND status IN ('open','mediating')", (provider_id,)
    ).fetchone()[0]
    if n >= TRUSTED_MIN_RATINGS and (avg or 0) >= TRUSTED_MIN_AVG and open_c == 0:
        return "trusted"
    return "verified"


def _name(row, base, lang):
    return row[f"{base}_{lang}"] or row[f"{base}_en"]


def provider_card(con, token, lang="hi", lat=None, lon=None):
    """What a visitor sees after a scan. Never includes home address or personal phone."""
    lang = lang if lang in LANGS else "hi"
    code = check_token(token)
    if not code:
        return {"ok": False, "error": "invalid_badge"}
    b = con.execute("SELECT * FROM badges WHERE code=?", (code,)).fetchone()
    if not b:
        return {"ok": False, "error": "unknown_badge"}
    p = con.execute(
        "SELECT p.*, s.lat AS site_lat, s.lon AS site_lon, s.name_bn AS site_bn, s.name_hi AS site_hi, s.name_en AS site_en "
        "FROM providers p JOIN sites s ON s.id=p.site_id WHERE p.id=?",
        (b["provider_id"],),
    ).fetchone()
    suspicious = False
    if lat is not None and lon is not None:
        suspicious = km(lat, lon, p["site_lat"], p["site_lon"]) > FAR_SCAN_KM
    con.execute(
        "INSERT INTO scans(badge_code, site_id, at, lang, coarse_lat, coarse_lon, suspicious) VALUES (?,?,?,?,?,?,?)",
        (code, p["site_id"], iso(now()), lang,
         None if lat is None else round(lat, 2), None if lon is None else round(lon, 2), int(suspicious)),
    )
    con.commit()
    status = badge_status(con, p["id"]) if b["status"] == "active" else "inactive"
    v = con.execute(
        "SELECT v.checked_at, m.display_name FROM verifications v JOIN mitras m ON m.id=v.mitra_id "
        "WHERE v.provider_id=? AND v.complete=1 ORDER BY v.checked_at DESC LIMIT 1",
        (p["id"],),
    ).fetchone()
    n, avg = con.execute("SELECT COUNT(*), AVG(stars) FROM ratings WHERE provider_id=?", (p["id"],)).fetchone()
    prices = [
        {"item": _name(r, "item", lang), "amount_inr": r["amount_inr"]}
        for r in con.execute("SELECT * FROM prices WHERE provider_id=? ORDER BY amount_inr DESC", (p["id"],))
    ]
    card = {
        "ok": True,
        "badge": code,
        "status": status,
        "provider": {
            "id": p["id"],
            "name": p["display_name"],
            "kind": p["kind"],
            "site": _name(p, "site", lang),
            "site_id": p["site_id"],
            "photo_url": p["photo_url"],
            "registration_seen": f"••• {p['reg_last4']}" if p["reg_last4"] else None,
            "women_run": bool(p["women_run"]),
            "elder_friendly": bool(p["elder_friendly"]),
            "wheelchair": bool(p["wheelchair"]),
            "sample": bool(p["is_sample"]),
        },
        "prices": prices,
        "prices_note": "full_price_no_extras",
        "rating": {"count": n, "avg": round(avg, 1) if avg else None},
        "last_checked": {"at": v["checked_at"], "by": v["display_name"]} if v else None,
        "suspicious_scan": suspicious,
        "never_asks_payment": True,
        "verified_means": "seen_in_person_not_police_verification",
    }
    if p["kind"] == "boat":
        card["safety_note"] = "boats_never_certified_safe"
    if status == "inactive":
        card["prices"] = []
        card["warning"] = "do_not_use_this_badge"
    return card


# ---------------------------------------------------------------- visitor actions
def add_rating(con, token, stars, tags=None):
    code = check_token(token)
    if not code or not (1 <= int(stars) <= 5):
        return {"ok": False, "error": "invalid"}
    b = con.execute("SELECT provider_id FROM badges WHERE code=?", (code,)).fetchone()
    if not b:
        return {"ok": False, "error": "unknown_badge"}
    allowed = {"fair_price", "polite", "safe_driving", "helpful", "clean"}
    tags = [t for t in (tags or []) if t in allowed]
    con.execute("INSERT INTO ratings(provider_id, stars, tags, at) VALUES (?,?,?,?)",
                (b["provider_id"], int(stars), json.dumps(tags), iso(now())))
    con.commit()
    return {"ok": True}


def add_complaint(con, token, category, text, actor="visitor"):
    code = check_token(token)
    if not code:
        return {"ok": False, "error": "invalid_badge"}
    b = con.execute("SELECT provider_id FROM badges WHERE code=?", (code,)).fetchone()
    if not b:
        return {"ok": False, "error": "unknown_badge"}
    if category not in ("overcharge", "rude", "unsafe", "fake_badge", "other"):
        category = "other"
    t0 = now()
    cur = con.execute(
        "INSERT INTO complaints(provider_id, category, text, status, created_at, due_at, validated) VALUES (?,?,?,?,?,?,0)",
        (b["provider_id"], category, (text or "")[:1000], "open", iso(t0), iso(t0 + timedelta(hours=COMPLAINT_SLA_HOURS))),
    )
    audit(con, actor, "complaint_open", "complaint", cur.lastrowid, {"category": category})
    con.commit()
    return {"ok": True, "complaint_id": cur.lastrowid, "due_at": iso(t0 + timedelta(hours=COMPLAINT_SLA_HOURS))}


def report_fake(con, code_seen, text, channel="web", site_id="kalna"):
    """Log a copied or forged badge. A Pathik Mitra checks the sticker; no provider is penalised by this alone."""
    code_seen = re.sub(r"[^A-Za-z0-9.\-]", "", str(code_seen or ""))[:40] or None
    cur = con.execute("INSERT INTO fake_reports(site_id, code_seen, text, channel, created_at) VALUES (?,?,?,?,?)",
                      (site_id, code_seen, (text or "")[:1000], channel if channel in ("web", "whatsapp") else "web", iso(now())))
    audit(con, channel, "fake_report", "fake_report", cur.lastrowid, {"code_seen": code_seen})
    con.commit()
    return {"ok": True, "report_id": cur.lastrowid}


def official_links(con):
    return [{"domain": r["domain"], "label": r["label_en"], "source": r["source"]}
            for r in con.execute("SELECT * FROM official_links ORDER BY rowid")]


def complaint_status(con, cid):
    c = con.execute("SELECT id, status, created_at, due_at, resolved_at FROM complaints WHERE id=?", (cid,)).fetchone()
    if not c:
        return {"ok": False, "error": "not_found"}
    d = dict(c)
    d["overdue"] = d["status"] in ("open", "mediating") and now() > parse(d["due_at"])
    return {"ok": True, **d}


def verify_before_pay(con, query):
    """Check a link, phone or UPI ID against official portals and the verified register."""
    q = (query or "").strip().lower()
    if not q:
        return {"ok": False, "error": "empty"}
    upi = re.search(r"[a-z0-9._-]+@[a-z][a-z0-9]{1,}", q)   # people forward whole messages, so pull the UPI ID out
    if upi and not re.search(r"https?://", q):
        q = upi.group(0)
    m = re.search(r"([a-z0-9-]+\.)+[a-z]{2,}", q)
    if m and "@" not in q:
        domain = m.group(0)
        domain = domain[4:] if domain.startswith("www.") else domain
        for r in con.execute("SELECT domain, label_en FROM official_links"):
            if domain == r["domain"] or domain.endswith("." + r["domain"]):
                return {"ok": True, "result": "official", "label": r["label_en"]}
        if any(w in domain for w in ("mayapur", "iskcon", "kalna", "nabadwip", "homestay", "wbtdc", "irctc")):
            return {"ok": True, "result": "not_official", "advice": "do_not_pay"}
        return {"ok": True, "result": "not_confirmed"}
    digits = re.sub(r"\D", "", q)
    if "@" in q:
        h = hashlib.sha256(q.encode()).hexdigest()
        row = con.execute("SELECT id, display_name FROM providers WHERE upi_hash=?", (h,)).fetchone()
    elif len(digits) >= 10:
        h = hashlib.sha256(digits[-10:].encode()).hexdigest()
        row = con.execute("SELECT id, display_name FROM providers WHERE phone_hash=?", (h,)).fetchone()
    else:
        row = None
    if row and badge_status(con, row["id"]) != "inactive":   # a banned or not-yet-checked provider is never "verified"
        return {"ok": True, "result": "verified_provider", "provider": row["display_name"], "status": badge_status(con, row["id"])}
    return {"ok": True, "result": "not_confirmed"}


def help_places(con, site_id, lang="hi"):
    lang = lang if lang in LANGS else "hi"
    rows = con.execute("SELECT * FROM places WHERE site_id=? AND kind IN ('hospital','police','helpdesk')", (site_id,))
    return {"emergency": "112", "places": [
        {"kind": r["kind"], "name": _name(r, "name", lang), "lat": r["lat"], "lon": r["lon"],
         "phone": r["public_phone"], "source": r["source"], "sample": bool(r["is_sample"])} for r in rows]}


def find_providers(con, site_id, kind=None, women_run=False, elder=False, wheelchair=False, lang="hi"):
    sql = "SELECT * FROM providers WHERE site_id=?"
    args = [site_id]
    if kind:
        sql += " AND kind=?"; args.append(kind)
    if women_run:
        sql += " AND women_run=1"
    if elder:
        sql += " AND elder_friendly=1"
    if wheelchair:
        sql += " AND wheelchair=1"
    out = []
    for p in con.execute(sql, args).fetchall():
        st = badge_status(con, p["id"])
        if st == "inactive":
            continue
        b = con.execute("SELECT code FROM badges WHERE provider_id=? AND status='active'", (p["id"],)).fetchone()
        out.append({"name": p["display_name"], "kind": p["kind"], "status": st, "lat": p["lat"], "lon": p["lon"],
                    "badge_token": badge_url_token(b["code"]) if b else None, "sample": bool(p["is_sample"])})
    order = {"trusted": 0, "verified": 1, "needs_recheck": 2}
    return sorted(out, key=lambda r: order[r["status"]])


def plan_visit(con, site_id, lang="hi"):
    lang = lang if lang in LANGS else "hi"
    timings = [{"name": _name(r, "name", lang), "kind": r["kind"], "hours": r["hours"], "source": r["source"],
                "sample": bool(r["is_sample"])}
               for r in con.execute("SELECT * FROM places WHERE site_id=? AND kind IN ('temple','ferry')", (site_id,))]
    comfort = [dict(r) for r in con.execute(
        "SELECT day, level FROM comfort_forecast WHERE site_id=? ORDER BY day", (site_id,))]
    return {"timings": timings, "comfort": comfort,
            "note": "answers_only_from_verified_data; anything else is not_confirmed"}


# ---------------------------------------------------------------- Pathik Mitra
REQUIRED = ("id_seen", "reg_seen", "photos", "price_sheet_signed", "consent_signed")


def mitra_from_token(con, token):
    if not token:
        return None
    h = hashlib.sha256(token.encode()).hexdigest()
    return con.execute("SELECT * FROM mitras WHERE token_hash=? AND active=1", (h,)).fetchone()


def mitra_queue(con, mitra):
    out = []
    for p in con.execute("SELECT * FROM providers WHERE site_id=?", (mitra["site_id"],)):
        v = con.execute("SELECT checked_at FROM verifications WHERE provider_id=? AND complete=1 ORDER BY checked_at DESC LIMIT 1",
                        (p["id"],)).fetchone()
        days = None if not v else (now() - parse(v["checked_at"])).days
        since = max(iso(now() - timedelta(days=7)), v["checked_at"] if v else "")   # a check clears earlier flags
        far = con.execute("SELECT COUNT(*) FROM scans s JOIN badges b ON b.code=s.badge_code WHERE b.provider_id=? "
                          "AND s.suspicious=1 AND s.at>?", (p["id"], since)).fetchone()[0]
        if v is None or days > RECHECK_DAYS - 7 or far:
            reason = "new" if v is None else ("recheck" if days > RECHECK_DAYS - 7 else "far_scan")
            out.append({"provider_id": p["id"], "name": p["display_name"], "kind": p["kind"],
                        "reason": reason, "days_since_check": days, "far_scans_7d": far})
    order = {"far_scan": 0, "recheck": 1, "new": 2}
    return sorted(out, key=lambda r: order[r["reason"]])


def submit_verifications(con, mitra, records):
    """Offline sync: each record carries a client_uuid so a retried sync never duplicates."""
    saved = []
    for r in records:
        if con.execute("SELECT 1 FROM verifications WHERE client_uuid=?", (r["client_uuid"],)).fetchone():
            saved.append({"client_uuid": r["client_uuid"], "status": "already_synced"}); continue
        kind = (con.execute("SELECT kind FROM providers WHERE id=?", (r["provider_id"],)).fetchone() or {"kind": None})["kind"]
        missing = [k for k in REQUIRED if not r.get(k)]
        if kind == "homestay" and not r.get("state_portal"):
            missing.append("state_portal")     # only State-registered homestays may carry the Homestay tag
        if r.get("sticker_ok") is not None and not r["sticker_ok"]:
            missing.append("sticker_ok")       # a copied sticker was found: no refresh until it is sorted out
        complete = not missing
        audit_flag = int(hashlib.sha256(r["client_uuid"].encode()).hexdigest(), 16) % 10 == 0  # about 10%
        cur = con.execute(
            "INSERT INTO verifications(provider_id, mitra_id, client_uuid, id_seen, reg_seen, photos, price_sheet_signed, "
            "consent_signed, state_portal, sticker_ok, complete, lat, lon, checked_at, synced_at, audit_status) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (r["provider_id"], mitra["id"], r["client_uuid"], int(bool(r.get("id_seen"))), int(bool(r.get("reg_seen"))),
             int(bool(r.get("photos"))), int(bool(r.get("price_sheet_signed"))), int(bool(r.get("consent_signed"))),
             None if r.get("state_portal") is None else int(bool(r["state_portal"])),
             None if r.get("sticker_ok") is None else int(bool(r["sticker_ok"])), int(complete), r.get("lat"), r.get("lon"), r.get("checked_at") or iso(now()), iso(now()),
             "queued" if audit_flag else "none"))
        if r.get("reg_last4"):
            con.execute("UPDATE providers SET reg_last4=? WHERE id=?", (str(r["reg_last4"])[-4:], r["provider_id"]))
        if complete and r.get("prices"):
            con.execute("DELETE FROM prices WHERE provider_id=?", (r["provider_id"],))   # the new signed sheet replaces the old one
        for item in r.get("prices", []) if complete else []:
            con.execute("INSERT INTO prices(provider_id, item_bn, item_hi, item_en, amount_inr, verified_at) VALUES (?,?,?,?,?,?)",
                        (r["provider_id"], item.get("bn"), item.get("hi"), item.get("en"), int(item["amount_inr"]), iso(now())))
        audit(con, f"mitra:{mitra['id']}", "verification", "provider", r["provider_id"], {"complete": complete})
        has_badge = con.execute("SELECT 1 FROM badges WHERE provider_id=? AND status='active'", (r["provider_id"],)).fetchone()
        saved.append({"client_uuid": r["client_uuid"], "status": "saved", "complete": complete, "missing": missing,
                      "audit": audit_flag, "needs_badge": complete and not has_badge, "id": cur.lastrowid})
    con.commit()
    return saved


def link_badge(con, mitra, provider_id, code):
    if not re.fullmatch(r"[A-Z]{3}-\d{4}", code or ""):
        return {"ok": False, "error": "bad_code"}
    v = con.execute("SELECT 1 FROM verifications WHERE provider_id=? AND complete=1", (provider_id,)).fetchone()
    if not v:
        return {"ok": False, "error": "verification_incomplete"}
    if con.execute("SELECT 1 FROM badges WHERE code=?", (code,)).fetchone():
        return {"ok": False, "error": "code_in_use"}
    con.execute("UPDATE badges SET status='inactive', revoked_at=? WHERE provider_id=? AND status='active'", (iso(now()), provider_id))
    con.execute("INSERT INTO badges(code, provider_id, issued_at, status) VALUES (?,?,?, 'active')", (code, provider_id, iso(now())))
    audit(con, f"mitra:{mitra['id']}", "badge_link", "badge", code, {"provider_id": provider_id})
    con.commit()
    return {"ok": True, "badge": code, "url_token": badge_url_token(code)}


# ---------------------------------------------------------------- admin
def list_badges(con, site_id=None):
    """Badges to print: each with its signed link token. Admin only, so nobody can mass-print copies."""
    rows = con.execute("SELECT b.code, b.status AS badge_status, p.id, p.display_name, p.kind, p.site_id FROM badges b "
                       "JOIN providers p ON p.id=b.provider_id " + ("WHERE p.site_id=? " if site_id else "") + "ORDER BY b.code",
                       (site_id,) if site_id else ()).fetchall()
    return [{"code": r["code"], "name": r["display_name"], "kind": r["kind"], "site": r["site_id"],
             "status": badge_status(con, r["id"]) if r["badge_status"] == "active" else "inactive",
             "url_token": badge_url_token(r["code"])} for r in rows]


def lan_addresses():
    """This computer's addresses on the local network, so phones on the same Wi-Fi can open the badge links."""
    import socket
    found = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))   # no packet is sent; this only asks which interface would be used
        found.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            found.append(info[4][0])
    except OSError:
        pass
    seen, out = set(), []
    for ip in found:
        if ip not in seen and not ip.startswith("127.") and not ip.startswith("169.254."):
            seen.add(ip); out.append(ip)
    # private Wi-Fi ranges first (192.168.x.x, 10.x, 172.16-31.x)
    out.sort(key=lambda ip: 0 if ip.startswith("192.168.") else 1 if ip.startswith("10.") else 2)
    return out


def revoke_badge(con, actor, code, reason):
    r = con.execute("UPDATE badges SET status='inactive', revoked_at=?, revoke_reason=? WHERE code=? AND status='active'",
                    (iso(now()), reason, code))
    if r.rowcount == 0:
        return {"ok": False, "error": "not_active"}
    audit(con, actor, "badge_revoke", "badge", code, {"reason": reason})
    con.commit()
    return {"ok": True}


def set_complaint(con, actor, cid, status, validated=None):
    if status not in ("open", "mediating", "resolved", "rejected"):
        return {"ok": False, "error": "bad_status"}
    fields, args = ["status=?"], [status]
    if status in ("resolved", "rejected"):
        fields.append("resolved_at=?"); args.append(iso(now()))
    if validated is not None:
        fields.append("validated=?"); args.append(int(bool(validated)))
    args.append(cid)
    con.execute(f"UPDATE complaints SET {', '.join(fields)} WHERE id=?", args)
    audit(con, actor, "complaint_update", "complaint", cid, {"status": status, "validated": validated})
    con.commit()
    return {"ok": True}


def footfall(con, site_id, day):
    rows = con.execute(
        "SELECT substr(at, 12, 2) AS hour, COUNT(*) AS scans FROM scans WHERE site_id=? AND substr(at,1,10)=? GROUP BY hour ORDER BY hour",
        (site_id, day)).fetchall()
    return [dict(r) for r in rows]


def ledger(con, site_id=None):
    """Public Seva Ledger: aggregates only, never individual records."""
    where, args = ("WHERE p.site_id=?", [site_id]) if site_id else ("", [])
    rows = con.execute(f"SELECT p.id, p.women_run FROM providers p {where}", args).fetchall()
    statuses = [badge_status(con, p["id"]) for p in rows]
    verified = sum(1 for s in statuses if s in ("verified", "trusted"))
    women = sum(1 for p, s in zip(rows, statuses) if p["women_run"] and s in ("verified", "trusted"))
    scans = con.execute(f"SELECT COUNT(*) FROM scans s {'WHERE s.site_id=?' if site_id else ''}", args).fetchone()[0]
    rupees = con.execute(f"SELECT COALESCE(SUM(l.amount_inr),0) FROM local_spend l JOIN providers p ON p.id=l.provider_id {where}", args).fetchone()[0]
    c = con.execute(f"SELECT COUNT(*), SUM(CASE WHEN c.resolved_at IS NOT NULL AND c.resolved_at<=c.due_at THEN 1 ELSE 0 END), "
                    f"SUM(CASE WHEN c.status IN ('open','mediating') THEN 1 ELSE 0 END) "
                    f"FROM complaints c JOIN providers p ON p.id=c.provider_id {where}", args).fetchone()
    checks = con.execute(f"SELECT COUNT(*) FROM verifications v JOIN providers p ON p.id=v.provider_id {where} "
                         f"{'AND' if where else 'WHERE'} v.complete=1", args).fetchone()[0]
    fakes = con.execute(f"SELECT COUNT(*) FROM fake_reports {'WHERE site_id=?' if site_id else ''}", args).fetchone()[0]
    return {"verified_providers": verified, "trusted_providers": statuses.count("trusted"),
            "needs_recheck": statuses.count("needs_recheck"), "women_run_providers": women, "enquiries": scans,
            "provider_confirmed_rupees": rupees, "complaints": c[0], "resolved_within_48h": c[1] or 0,
            "complaints_open": c[2] or 0, "in_person_checks": checks, "fake_badge_reports": fakes,
            "outcomes": [{"category": r["category"], "status": r["status"],
                          "hours": None if not r["resolved_at"] else round((parse(r["resolved_at"]) - parse(r["created_at"])).total_seconds() / 3600)}
                         for r in con.execute(f"SELECT c.category, c.status, c.created_at, c.resolved_at FROM complaints c "
                                              f"JOIN providers p ON p.id=c.provider_id {where} ORDER BY c.id DESC LIMIT 8", args)]}


def audit_log(con, limit=100):
    return [dict(r) for r in con.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,))]
