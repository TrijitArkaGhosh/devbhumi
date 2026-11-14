import json
from datetime import timedelta
import pytest
import core, seed



def test_signed_token_required(db):
    con, toks = db
    assert core.provider_card(con, toks["KLN-0142"])["ok"]
    assert core.provider_card(con, "KLN-0142.000000000000")["error"] == "invalid_badge"   # forged signature
    assert core.provider_card(con, "KLN-9999." + core.sign("KLN-9999"))["error"] == "unknown_badge"
    assert core.check_token("not-a-token") is None


def test_card_has_no_private_fields(db):
    con, toks = db
    c = core.provider_card(con, toks["KLN-0142"], "en")
    text = json.dumps(c)
    for secret in ("phone", "upi", "address", "9800000021", "shyamal.das@upi", "hash"):
        assert secret not in text
    assert c["provider"]["registration_seen"] == "••• 1234"
    assert c["never_asks_payment"] is True
    assert c["verified_means"] == "seen_in_person_not_police_verification"
    assert c["prices_note"] == "full_price_no_extras"


def test_status_rules(db):
    con, toks = db
    st = lambda code: core.provider_card(con, toks[code])["status"]
    assert st("KLN-0142") == "verified"          # 6 ratings: not yet trusted
    assert st("KLN-0007") == "trusted"           # 12 ratings, avg 4.6, checked 30 days ago
    assert st("KLN-0031") == "needs_recheck"     # checked 97 days ago
    assert st("KLN-0150") == "inactive"          # revoked
    inactive = core.provider_card(con, toks["KLN-0150"])
    assert inactive["prices"] == [] and inactive["warning"] == "do_not_use_this_badge"


def test_boat_never_certified_safe(db):
    con, toks = db
    assert core.provider_card(con, toks["KLN-0090"])["safety_note"] == "boats_never_certified_safe"


def test_two_validated_complaints_make_badge_inactive(db):
    con, toks = db
    a = core.add_complaint(con, toks["KLN-0142"], "overcharge", "asked 100")
    b = core.add_complaint(con, toks["KLN-0142"], "rude", "")
    core.set_complaint(con, "admin", a["complaint_id"], "mediating", validated=True)
    assert core.provider_card(con, toks["KLN-0142"])["status"] == "verified"
    core.set_complaint(con, "admin", b["complaint_id"], "mediating", validated=True)
    assert core.provider_card(con, toks["KLN-0142"])["status"] == "inactive"


def test_complaint_due_in_48_hours(db):
    con, toks = db
    r = core.add_complaint(con, toks["KLN-0142"], "overcharge", "x")
    s = core.complaint_status(con, r["complaint_id"])
    assert (core.parse(s["due_at"]) - core.parse(s["created_at"])) == timedelta(hours=48)
    assert s["overdue"] is False


def test_far_scan_flagged_and_scans_anonymous(db):
    con, toks = db
    near = core.provider_card(con, toks["KLN-0142"], lat=23.22, lon=88.36)
    far = core.provider_card(con, toks["KLN-0142"], lat=22.57, lon=88.36)   # Kolkata, about 72 km away
    assert near["suspicious_scan"] is False and far["suspicious_scan"] is True
    cols = [r[1] for r in con.execute("PRAGMA table_info(scans)")]
    assert not any(c in cols for c in ("ip", "device", "phone", "user_id"))
    row = con.execute("SELECT coarse_lat FROM scans ORDER BY id DESC LIMIT 1").fetchone()
    assert row[0] == 22.57


def test_verify_before_pay(db):
    con, _ = db
    v = lambda q: core.verify_before_pay(con, q)["result"]
    assert v("https://www.visitmayapur.com/rooms") == "official"
    assert v("mayapur-rooms-cheap.xyz") == "not_official"
    assert v("shyamal.das@upi") == "verified_provider"
    assert v("+91 98000 00021") == "verified_provider"
    assert v("someone@okbank") == "not_confirmed"
    assert v("visitmayapur.com.evil.xyz") == "not_official"


def test_ratings_validated(db):
    con, toks = db
    assert core.add_rating(con, toks["KLN-0142"], 6)["ok"] is False
    assert core.add_rating(con, toks["KLN-0142"], 5, ["fair_price", "<script>"])["ok"]
    tags = json.loads(con.execute("SELECT tags FROM ratings ORDER BY id DESC LIMIT 1").fetchone()[0])
    assert tags == ["fair_price"]


def test_offline_sync_idempotent_and_badge_link(db):
    con, _ = db
    m = core.mitra_from_token(con, seed.MITRA_TOKEN)
    pid = con.execute("INSERT INTO providers(site_id, kind, display_name, is_sample, created_at) VALUES ('kalna','toto','New Toto',1,?)", (core.iso(core.now()),)).lastrowid
    assert core.link_badge(con, m, pid, "KLN-0200")["error"] == "verification_incomplete"
    rec = {"client_uuid": "u-1", "provider_id": pid, "id_seen": True, "reg_seen": True, "photos": True,
           "price_sheet_signed": True, "consent_signed": True, "reg_last4": "WB1234", "prices": [{"en": "Station", "amount_inr": 40}]}
    assert core.submit_verifications(con, m, [rec])[0]["status"] == "saved"
    assert core.submit_verifications(con, m, [rec])[0]["status"] == "already_synced"
    r = core.link_badge(con, m, pid, "KLN-0200")
    assert r["ok"] and core.check_token(r["url_token"]) == "KLN-0200"
    assert core.link_badge(con, m, pid, "KLN-0200")["error"] == "code_in_use"
    assert core.provider_card(con, r["url_token"], "en")["provider"]["registration_seen"] == "••• 1234"


def test_incomplete_checklist_cannot_issue(db):
    con, _ = db
    m = core.mitra_from_token(con, seed.MITRA_TOKEN)
    pid = con.execute("INSERT INTO providers(site_id, kind, display_name, is_sample, created_at) VALUES ('kalna','stall','X',1,?)", (core.iso(core.now()),)).lastrowid
    core.submit_verifications(con, m, [{"client_uuid": "u-2", "provider_id": pid, "id_seen": True, "reg_seen": True, "photos": True,
                                        "price_sheet_signed": True, "consent_signed": False}])
    assert core.link_badge(con, m, pid, "KLN-0201")["error"] == "verification_incomplete"


def test_revoke_and_audit(db):
    con, toks = db
    assert core.revoke_badge(con, "admin", "KLN-0142", "test")["ok"]
    assert core.provider_card(con, toks["KLN-0142"])["status"] == "inactive"
    assert core.audit_log(con)[0]["action"] == "badge_revoke"


def test_ledger_aggregates_only(db):
    con, toks = db
    core.provider_card(con, toks["KLN-0142"])
    led = core.ledger(con, "kalna")
    assert led["verified_providers"] == 3 and led["women_run_providers"] == 1 and led["enquiries"] == 2  # 1 + the seeded far scan
    assert led["trusted_providers"] == 1 and led["needs_recheck"] == 1 and led["in_person_checks"] == 5
    # aggregates only: every value is a number, never a list of people
    assert all(isinstance(v, int) for k, v in led.items() if k != "outcomes")
    assert all(set(o) == {"category", "status", "hours"} for o in led["outcomes"])   # no names, no complaint text


def test_find_hides_inactive_and_sorts_trusted_first(db):
    con, _ = db
    rows = core.find_providers(con, "kalna")
    assert all(r["status"] != "inactive" for r in rows) and rows[0]["status"] == "trusted"
    assert [r["name"] for r in core.find_providers(con, "kalna", women_run=True)] == ["Lakshmi Das Homestay"]


def test_mitra_queue_shows_far_scan_recheck_and_new(db):
    con, _ = db
    m = core.mitra_from_token(con, seed.MITRA_TOKEN)
    q = core.mitra_queue(con, m)
    assert [r["reason"] for r in q] == ["far_scan", "recheck", "new", "new"]
    assert q[0]["name"] == "Shyamal Das" and q[1]["name"] == "Nitai Makha Sandesh Stall"


def test_listed_providers_are_hidden_from_visitors(db):
    con, _ = db
    names = [r["name"] for r in core.find_providers(con, "kalna")]
    assert "Sunita Roy Homestay" not in names and "Ratan Majhi Boat 7" not in names


def test_fake_report_and_official_links(db):
    con, _ = db
    r = core.report_fake(con, "KLN-0142.000000000000<script>", "sticker on a different toto", "whatsapp")
    assert r["ok"] and core.ledger(con, "kalna")["fake_badge_reports"] == 1
    row = con.execute("SELECT code_seen FROM fake_reports").fetchone()
    assert "<" not in row["code_seen"]
    assert [x["domain"] for x in core.official_links(con)][0] == "visitmayapur.com"


def test_verify_never_vouches_for_inactive_provider(db):
    con, _ = db
    assert core.verify_before_pay(con, "9800000025")["result"] == "not_confirmed"   # Pintu Toto, badge inactive
    assert core.verify_before_pay(con, "pay 9800000021 now")["result"] == "verified_provider"


def test_mitra_rules_homestay_portal_sticker_and_flag_clearing(db):
    con, toks = db
    m = core.mitra_from_token(con, seed.MITRA_TOKEN)
    q = {r["name"]: r for r in core.mitra_queue(con, m)}
    base = dict(id_seen=True, reg_seen=True, photos=True, price_sheet_signed=True, consent_signed=True)
    sunita = q["Sunita Roy Homestay"]["provider_id"]
    r = core.submit_verifications(con, m, [dict(base, client_uuid="h1", provider_id=sunita)])[0]
    assert not r["complete"] and r["missing"] == ["state_portal"]
    r = core.submit_verifications(con, m, [dict(base, client_uuid="h2", provider_id=sunita, state_portal=True,
                                                prices=[{"en": "Room for two, one night", "amount_inr": 1000}])])[0]
    assert r["complete"] and r["needs_badge"]
    shyamal = q["Shyamal Das"]["provider_id"]
    r = core.submit_verifications(con, m, [dict(base, client_uuid="s1", provider_id=shyamal, sticker_ok=False)])[0]
    assert not r["complete"] and "sticker_ok" in r["missing"]
    assert core.mitra_queue(con, m)[0]["reason"] == "far_scan"          # still flagged
    r = core.submit_verifications(con, m, [dict(base, client_uuid="s2", provider_id=shyamal, sticker_ok=True)])[0]
    assert r["complete"] and not r["needs_badge"]
    assert "Shyamal Das" not in [x["name"] for x in core.mitra_queue(con, m)]   # flag cleared by the check
    assert core.provider_card(con, toks["KLN-0142"])["prices"][0]["amount_inr"] == 60   # no prices sent: old sheet kept


def test_init_db_upgrades_an_old_database(tmp_path):
    import sqlite3
    path = str(tmp_path / "old.db")
    old = sqlite3.connect(path)
    old.executescript("CREATE TABLE verifications (id INTEGER PRIMARY KEY, provider_id INTEGER, mitra_id INTEGER, client_uuid TEXT, "
                      "id_seen INTEGER, reg_seen INTEGER, photos INTEGER, price_sheet_signed INTEGER, consent_signed INTEGER, "
                      "complete INTEGER, lat REAL, lon REAL, checked_at TEXT, synced_at TEXT, audit_status TEXT);")
    old.close()
    con = core.connect(path)
    core.init_db(con)
    cols = {r[1] for r in con.execute("PRAGMA table_info(verifications)")}
    assert {"state_portal", "sticker_ok"} <= cols


def test_list_badges_for_printing(db):
    con, toks = db
    b = {x["code"]: x for x in core.list_badges(con, "kalna")}
    assert set(b) == {"KLN-0007", "KLN-0031", "KLN-0090", "KLN-0142", "KLN-0150"}
    assert b["KLN-0142"]["url_token"] == toks["KLN-0142"] and b["KLN-0150"]["status"] == "inactive"
    assert all(not ip.startswith("127.") for ip in core.lan_addresses())


def test_bhola_das_bardhaman_badge(db):
    """Bhola Das, the toto driver at Bardhaman Junction from the film, has his own badge BDN-0108."""
    con, toks = db
    c = core.provider_card(con, toks["BDN-0108"], "en")
    assert c["ok"] and c["status"] == "trusted"
    assert c["provider"]["name"] == "Bhola Das" and c["provider"]["kind"] == "toto"
    assert c["provider"]["site"] == "Bardhaman" and c["provider"]["site_id"] == "bardhaman"
    assert c["prices"][0]["amount_inr"] == 80 and "Nawabhat" in c["prices"][0]["item"]
    bn = core.provider_card(con, toks["BDN-0108"], "bn")
    assert bn["provider"]["site"] == "বর্ধমান" and "নবাবহাট" in bn["prices"][0]["item"]
    assert core.verify_before_pay(con, "bhola.das@upi")["result"] == "verified_provider"
    assert "BDN-0108" in {b["code"] for b in core.list_badges(con)}
    names = [r["name"] for r in core.find_providers(con, "bardhaman")]
    assert set(names) == {"Bhola Das", "Mina Pal Homestay", "Gopal Mihidana Stall", "Bablu Das"}
    assert {p["kind"] for p in core.help_places(con, "bardhaman")["places"]} == {"hospital", "police", "helpdesk"}
    near = core.provider_card(con, toks["BDN-0108"], lat=23.25, lon=87.87)
    assert near["suspicious_scan"] is False


def test_bardhaman_story_bablu_old_sticker_and_new_badge(db):
    """Bablu's copied old sticker (BDN-0150) says do not use; his new badge (BDN-0151) after a fresh check is verified."""
    con, toks = db
    old = core.provider_card(con, toks["BDN-0150"], "en")
    assert old["status"] == "inactive" and old["prices"] == [] and old["warning"] == "do_not_use_this_badge"
    new = core.provider_card(con, toks["BDN-0151"], "en")
    assert new["status"] == "verified" and new["provider"]["name"] == "Bablu Das"
    assert new["last_checked"]["by"] == "Riya"
    assert core.provider_card(con, toks["BDN-0108"])["last_checked"]["by"] == "Riya"
    assert core.provider_card(con, toks["KLN-0142"])["last_checked"]["by"] == "Arup"
    m = core.mitra_from_token(con, seed.MITRA_TOKEN_BARDHAMAN)
    assert m["display_name"] == "Riya" and m["site_id"] == "bardhaman"
    rows = core.find_providers(con, "bardhaman", women_run=True)
    assert [r["name"] for r in rows] == ["Mina Pal Homestay"]
    assert core.verify_before_pay(con, "mina.pal@upi")["result"] == "verified_provider"
