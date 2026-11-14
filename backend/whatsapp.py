"""DevBhumi WhatsApp assistant (DPR v9.4, Section 2: the visitor journey starts in WhatsApp).

handle() turns one incoming message into a list of replies. It answers only from the
verified database through core.py, so WhatsApp and the web app always agree.

Each reply is {"text": str, "buttons": [{"id": str, "title": str}]}. Buttons are optional
(WhatsApp allows at most 3, titles up to 20 characters); every option can also be typed,
so the flow works on any phone.
"""
import hashlib
import json
import os
import re
from datetime import timedelta

import core

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "bot_strings.json"), encoding="utf-8") as f:
    STR = json.load(f)
BASE_URL = os.environ.get("DEVBHUMI_BASE_URL", "http://localhost:8000").rstrip("/")
DEFAULT_SITE = "bardhaman"
ICON = {"verified": "✅", "trusted": "🌟", "needs_recheck": "🟠", "inactive": "⛔"}
LANG_WORDS = {"hindi": "hi", "हिंदी": "hi", "हिन्दी": "hi", "bangla": "bn", "bengali": "bn", "বাংলা": "bn", "english": "en"}
MENU_WORDS = {"hi", "hello", "menu", "start", "0", "namaste", "नमस्ते", "नमस्कार", "নমস্কার", "মেনু", "मेनू"}
TOKEN_RE = re.compile(r"\b([A-Za-z]{3}-\d{4})\.([0-9a-fA-F]{12})\b")
CODE_RE = re.compile(r"\b([A-Za-z]{3}-\d{4})\b")
LINKISH_RE = re.compile(r"(https?://|www\.|[a-z0-9-]+\.(com|in|org|net|xyz|info|co)\b|@[a-z]{2,}|\d{10})", re.I)


def t(lang, key, **kw):
    s = STR.get(lang, {}).get(key) or STR["en"][key]
    for k, v in kw.items():
        s = s.replace("{" + k + "}", str(v))
    return s


def msg(text, buttons=None):
    return {"text": text, "buttons": buttons or []}


def wa_hash(wa_id):
    return hashlib.sha256(("wa:" + str(wa_id)).encode()).hexdigest()


def _session(con, h):
    row = con.execute("SELECT * FROM wa_sessions WHERE wa_hash=?", (h,)).fetchone()
    if row:
        return dict(row), False
    return {"wa_hash": h, "lang": None, "badge_token": None, "step": None, "data": None}, True


def _save(con, s):
    con.execute("INSERT INTO wa_sessions(wa_hash, lang, badge_token, step, data, updated_at) VALUES (?,?,?,?,?,?) "
                "ON CONFLICT(wa_hash) DO UPDATE SET lang=excluded.lang, badge_token=excluded.badge_token, "
                "step=excluded.step, data=excluded.data, updated_at=excluded.updated_at",
                (s["wa_hash"], s["lang"] or "hi", s["badge_token"], s["step"], s["data"], core.iso(core.now())))
    con.commit()


def _guess_lang(text):
    if re.search(r"[ঀ-৿]", text):
        return "bn"
    if re.search(r"[ऀ-ॿ]", text):
        return "hi"
    return None


def _fmt_due(iso_ts):
    # Shown in India time; WhatsApp has no locale for us to use.
    d = core.parse(iso_ts) + timedelta(hours=5, minutes=30)
    return d.strftime("%d %b, %I:%M %p IST").lstrip("0")


# ---------------------------------------------------------------- replies
def menu(lang):
    return [msg("\n\n".join([t(lang, "menu_greet"), t(lang, "menu_items"), t(lang, "menu_lang"), "_" + t(lang, "footer") + "_"]))]


def card_reply(con, lang, token, base=None):
    c = core.provider_card(con, token, lang)
    if not c["ok"]:
        return [msg(t(lang, "fake"), [{"id": "complain", "title": "COMPLAIN"}, {"id": "1", "title": "1"}])]
    p, st = c["provider"], c["status"]
    lines = [f"{ICON[st]} *{t(lang, 'status_' + st)}* · Bharosa QR {c['badge']}",
             f"*{p['name']}* · {t(lang, p['kind'])} · {p['site']}"]
    if p["registration_seen"]:
        lines.append(f"{t(lang, 'reg_seen')}: {p['registration_seen']}")
    if st == "inactive":
        lines += ["", t(lang, "inactive_warn")]
        return [msg("\n".join(lines))]
    if c["prices"]:
        lines += ["", t(lang, "prices_head")] + [f"• {x['item']} · ₹{x['amount_inr']}" for x in c["prices"]]
    lines.append("")
    r = c["rating"]
    lines.append(t(lang, "rating_line", avg=r["avg"], n=r["count"]) if r["avg"] else t(lang, "no_rating"))
    if c["last_checked"]:
        days = max(0, (core.now() - core.parse(c["last_checked"]["at"])).days)
        lines.append(t(lang, "checked_line", days=days, name=c["last_checked"]["by"]))
    if st == "needs_recheck":
        lines.append(t(lang, "recheck_note"))
    if c.get("safety_note"):
        lines.append(t(lang, "boat_note"))
    lines += ["", t(lang, "photo_line", url=f"{(base or BASE_URL).rstrip('/')}/b/{core.badge_url_token(c['badge'])}"),
              t(lang, "no_otp"), "_" + t(lang, "verified_means") + "_", "", t(lang, "card_next")]
    buttons = [{"id": "talk", "title": t(lang, "btn_talk")}, {"id": "help", "title": t(lang, "btn_help")},
               {"id": "rate", "title": t(lang, "btn_rate")}]
    return [msg("\n".join(lines), buttons)]


def find_reply(con, lang, women_only=False):
    rows = core.find_providers(con, DEFAULT_SITE, kind="homestay" if women_only else None, women_run=women_only, lang=lang)
    site = core._name(con.execute("SELECT * FROM sites WHERE id=?", (DEFAULT_SITE,)).fetchone(), "name", lang)
    head = t(lang, "sakhi_head") if women_only else t(lang, "find_head", site=site)
    out = [head]
    for r in rows:
        code = core.check_token(r["badge_token"]) if r["badge_token"] else ""
        out.append(f"{ICON[r['status']]} {r['name']} · {t(lang, r['kind'])} · {t(lang, 'status_' + r['status'])} → {code}")
    if women_only:
        out += ["", t(lang, "sakhi_share")]
    return [msg("\n".join(out))]


def plan_reply(con, lang):
    d = core.plan_visit(con, DEFAULT_SITE, lang)
    site = core._name(con.execute("SELECT * FROM sites WHERE id=?", (DEFAULT_SITE,)).fetchone(), "name", lang)
    out = [t(lang, "plan_head", site=site), "", t(lang, "plan_timings")]
    out += [f"• {x['name']}: {x['hours']}" for x in d["timings"]]
    today = core.iso(core.now())[:10]
    upcoming = [c for c in d["comfort"] if c["day"] >= today][:3]
    if upcoming:
        out += ["", t(lang, "plan_comfort")] + [f"• {c['day'][8:]}/{c['day'][5:7]}: {t(lang, 'lv_' + c['level'])}" for c in upcoming]
    out += ["", "_" + t(lang, "plan_note") + "_"]
    return [msg("\n".join(out))]


def help_reply(con, lang):
    d = core.help_places(con, DEFAULT_SITE, lang)
    site = core._name(con.execute("SELECT * FROM sites WHERE id=?", (DEFAULT_SITE,)).fetchone(), "name", lang)
    out = [t(lang, "help_head", site=site)]
    for p in d["places"]:
        out.append(f"• {t(lang, 'k_' + p['kind'])}: {p['name']} · https://maps.google.com/?q={p['lat']},{p['lon']}")
    out += ["", t(lang, "sakhi_hint")]
    return [msg("\n".join(out))]


def verify_reply(con, lang, query):
    d = core.verify_before_pay(con, query)
    if not d.get("ok"):
        return [msg(t(lang, "verify_ask"))]
    if d["result"] == "badge":   # a badge code: answer with the provider card itself
        return card_reply(con, lang, d["badge_token"])
    if d["result"] in ("badge_unknown", "badge_revoked"):
        return [msg(t(lang, "r_not_official"))]
    key = {"official": "r_official", "verified_provider": "r_match", "not_official": "r_not_official"}.get(d["result"], "r_not_confirmed")
    return [msg(t(lang, key, label=d.get("label", ""), name=d.get("provider", "")))]


def official_reply(con, lang):
    rows = core.official_links(con)
    out = [t(lang, "official_head")] + [f"• {r['label']}: https://{r['domain']}" for r in rows] + ["", t(lang, "official_note")]
    return [msg("\n".join(out))]


def talk_reply(lang):
    return [msg("\n".join([t(lang, "talk_head")] + [f"{i + 1} · {p[lang]}" for i, p in enumerate(STR["phrases"])]))]


# ---------------------------------------------------------------- the conversation
def handle(con, wa_id, text, kind="text", base_url=None):
    """One incoming WhatsApp message in, a list of replies out."""
    h = wa_hash(wa_id)
    s, new = _session(con, h)
    raw = (text or "").strip()
    low = raw.lower()
    s["lang"] = _guess_lang(raw) or s["lang"] or ("en" if raw.isascii() and low not in ("namaste", "namaskar") else "hi")
    lang = s["lang"]
    step, s["step"] = s["step"], None
    data = json.loads(s["data"]) if s["data"] else {}
    out = None

    if kind in ("audio", "voice"):
        out = [msg(t(lang, "voice_note"))]
    elif low in LANG_WORDS:
        s["lang"] = lang = LANG_WORDS[low]
        out = [msg(t(lang, "lang_set"))] + menu(lang)
    elif TOKEN_RE.search(raw):
        m = TOKEN_RE.search(raw)
        token = f"{m.group(1).upper()}.{m.group(2).lower()}"
        out = card_reply(con, lang, token, base_url)
        if core.check_token(token) and con.execute("SELECT 1 FROM badges WHERE code=?", (core.check_token(token),)).fetchone():
            s["badge_token"], data = token, {}
        else:
            data = {"fake": token}
    elif step == "rate" and low in ("1", "2", "3", "4", "5"):
        core.add_rating(con, s["badge_token"], int(low))
        out = [msg(t(lang, "rate_done"))]
    elif step == "talk" and low in [str(i + 1) for i in range(len(STR["phrases"]))]:
        p = STR["phrases"][int(low) - 1]
        out = [msg(f"{t(lang, 'talk_out')}\n\n*{p['bn']}*\n_({p[lang]})_")]
        s["step"] = "talk"
    elif step == "complain_cat" and low in ("1", "2", "3", "4", "5"):
        s["step"], data["cat"] = "complain_text", STR["complaint_cats"][int(low) - 1]
        out = [msg(t(lang, "complain_text"))]
    elif step == "complain_text" and raw:
        cat = data.pop("cat", "other")
        if cat == "fake_badge" and (data.get("fake") or not s["badge_token"]):
            r = core.report_fake(con, data.pop("fake", None), raw, "whatsapp")
            out = [msg(t(lang, "fake_done", id=r["report_id"]))]
        elif s["badge_token"]:
            r = core.add_complaint(con, s["badge_token"], cat, raw[:1000], actor="whatsapp")
            out = [msg(t(lang, "complain_done", id=r["complaint_id"], due=_fmt_due(r["due_at"])))]
        else:
            out = [msg(t(lang, "need_badge"))]
    elif step == "verify" and raw:
        out = verify_reply(con, lang, raw)
    elif low in MENU_WORDS:
        out = menu(lang)
    elif low in ("1", "find"):
        out = find_reply(con, lang)
    elif low in ("2", "plan"):
        out = plan_reply(con, lang)
    elif low in ("3", "help", "sos", "मदद", "সাহায্য"):
        out = help_reply(con, lang)
    elif low in ("4", "verify", "check"):
        s["step"] = "verify"
        out = [msg(t(lang, "verify_ask"))]
    elif low in ("5", "official"):
        out = official_reply(con, lang)
    elif low == "sakhi":
        out = find_reply(con, lang, women_only=True)
    elif low == "talk":
        s["step"] = "talk"
        out = talk_reply(lang)
    elif low == "rate":
        if not s["badge_token"]:
            out = [msg(t(lang, "need_badge"))]
        else:
            c = core.provider_card(con, s["badge_token"], lang)
            s["step"] = "rate"
            out = [msg(t(lang, "rate_ask", name=c["provider"]["name"] if c.get("ok") else ""))]
    elif low in ("complain", "report"):
        s["step"] = "complain_cat"
        out = [msg(t(lang, "complain_ask"))]
    elif re.fullmatch(r"status\s+(\d+)", low):
        cid = int(re.fullmatch(r"status\s+(\d+)", low).group(1))
        d = core.complaint_status(con, cid)
        out = [msg(t(lang, "status_line", id=cid, status=t(lang, "cstatus_" + d["status"]), due=_fmt_due(d["due_at"])))] \
            if d.get("ok") else [msg(t(lang, "status_none"))]
    elif CODE_RE.fullmatch(raw.upper()):
        code = raw.upper()
        if con.execute("SELECT 1 FROM badges WHERE code=?", (code,)).fetchone():
            token = core.badge_url_token(code)
            s["badge_token"], data = token, {}
            out = card_reply(con, lang, token, base_url)
        else:
            data = {"fake": code}
            out = [msg(t(lang, "fake"))]
    elif LINKISH_RE.search(raw):
        out = verify_reply(con, lang, raw)  # a forwarded link, phone or UPI ID is checked straight away
    else:
        out = [msg(t(lang, "not_understood"))] if not new else menu(lang)

    s["data"] = json.dumps(data) if data else None
    _save(con, s)
    return out


# ---------------------------------------------------------------- Meta WhatsApp Cloud API glue
def parse_webhook(payload):
    """Yield (wa_id, text, kind) for each user message in a Cloud API webhook payload."""
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            for m in change.get("value", {}).get("messages", []) or []:
                kind = m.get("type")
                if kind == "text":
                    yield m["from"], m["text"]["body"], "text"
                elif kind == "interactive":
                    ia = m["interactive"]
                    rep = ia.get("button_reply") or ia.get("list_reply") or {}
                    yield m["from"], rep.get("id") or rep.get("title", ""), "text"
                elif kind == "button":
                    yield m["from"], m["button"].get("payload") or m["button"].get("text", ""), "text"
                elif kind in ("audio", "voice"):
                    yield m["from"], "", "audio"
                else:
                    yield m["from"], "", kind


def to_cloud_api(wa_id, reply):
    """Build the Graph API body for one reply: interactive buttons when present, plain text otherwise."""
    if reply["buttons"]:
        return {"messaging_product": "whatsapp", "to": wa_id, "type": "interactive", "interactive": {
            "type": "button", "body": {"text": reply["text"][:1024]},
            "action": {"buttons": [{"type": "reply", "reply": {"id": b["id"], "title": b["title"][:20]}} for b in reply["buttons"][:3]]}}}
    return {"messaging_product": "whatsapp", "to": wa_id, "type": "text", "text": {"body": reply["text"][:4096], "preview_url": False}}


def check_signature(app_secret, body_bytes, header):
    """Meta signs each webhook call with X-Hub-Signature-256 = sha256=HMAC(app_secret, body)."""
    if not app_secret:
        return True
    import hmac
    good = "sha256=" + hmac.new(app_secret.encode(), body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(good, header or "")


def send(reply_bodies):
    """Send replies through the Graph API when WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are set; otherwise do nothing."""
    token, phone_id = os.environ.get("WHATSAPP_TOKEN"), os.environ.get("WHATSAPP_PHONE_ID")
    if not (token and phone_id):
        return 0
    import urllib.request
    sent = 0
    for body in reply_bodies:
        req = urllib.request.Request(f"https://graph.facebook.com/v21.0/{phone_id}/messages", data=json.dumps(body).encode(),
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10):
            sent += 1
    return sent
