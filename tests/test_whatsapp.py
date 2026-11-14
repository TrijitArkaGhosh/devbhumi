"""WhatsApp assistant: full conversations, as a visitor would type them."""
import hashlib
import hmac
import json

import core
import seed
import whatsapp as wa


def say(con, text, who="919800000099", kind="text"):
    return wa.handle(con, who, text, kind)


def all_text(replies):
    return "\n".join(r["text"] for r in replies)


def test_first_hello_shows_menu_with_disclaimer(db):
    con, _ = db
    r = all_text(say(con, "hi"))
    assert "1 · Find a verified provider" in r and "not a government service" in r


def test_scan_link_opens_card_then_rate_and_complain(db):
    con, toks = db
    r = say(con, f"Bharosa {toks['KLN-0142']}")
    assert "Shyamal Das" in r[0]["text"] and "₹60" in r[0]["text"] and "never asks for money" in r[0]["text"]
    assert [b["id"] for b in r[0]["buttons"]] == ["talk", "help", "rate"]
    assert all(len(b["title"]) <= 20 for b in r[0]["buttons"])
    assert "Rate" in all_text(say(con, "rate")) or "How was" in all_text(say(con, "rate"))
    assert "Thank you" in all_text(say(con, "5"))
    n = con.execute("SELECT COUNT(*) FROM ratings r JOIN badges b ON b.provider_id=r.provider_id WHERE b.code='KLN-0142'").fetchone()[0]
    assert n == 7
    assert "What happened" in all_text(say(con, "complain"))
    assert "one message" in all_text(say(con, "1"))
    done = all_text(say(con, "He asked 200 instead of 60"))
    cid = int(done.split("Complaint number ")[1].split(" ")[0])
    assert "STATUS" in done
    assert "registered" in all_text(say(con, f"status {cid}"))
    assert con.execute("SELECT category FROM complaints WHERE id=?", (cid,)).fetchone()[0] == "overcharge"


def test_forged_link_warns_and_fake_report_is_logged(db):
    con, _ = db
    r = all_text(say(con, "KLN-0142.000000000000", who="1"))
    assert "could not be verified" in r
    say(con, "complain", who="1"); say(con, "4", who="1")
    done = all_text(say(con, "Sticker on a different toto near the station", who="1"))
    assert "F-1" in done
    assert con.execute("SELECT code_seen, channel FROM fake_reports").fetchone()[:] == ("KLN-0142.000000000000", "whatsapp")


def test_typed_badge_number_and_unknown_number(db):
    con, _ = db
    assert "Lakshmi Das Homestay" in all_text(say(con, "kln-0007", who="2"))
    assert "Bhola Das" in all_text(say(con, "bdn-0108", who="2"))
    assert "could not be verified" in all_text(say(con, "KLN-9999", who="2"))


def test_inactive_badge_hides_prices(db):
    con, toks = db
    r = all_text(say(con, toks["KLN-0150"], who="3"))
    assert "Do not use this badge" in r and "₹" not in r


def test_boat_is_never_called_safe(db):
    con, toks = db
    assert "never certified as safe" in all_text(say(con, toks["KLN-0090"], who="4"))


def test_menu_options(db):
    con, _ = db
    w = "5"
    found = all_text(say(con, "1", who=w))
    assert "Bardhaman" in found and "Bhola Das" in found and "Mina Pal Homestay" in found
    assert "BDN-0150" not in found and "Pintu" not in found     # revoked badge and inactive provider stay hidden
    assert "Crowd forecast" in all_text(say(con, "2", who=w))
    help_ = all_text(say(con, "3", who=w))
    assert "112" in help_ and "Burdwan Medical College" in help_
    assert "Send or forward" in all_text(say(con, "4", who=w))
    assert "Official site" in all_text(say(con, "visitmayapur.com", who=w))
    assert "https://wbtdcl.wb.gov.in" in all_text(say(con, "5", who=w))
    assert "women-run" in all_text(say(con, "sakhi", who=w)).lower()


def test_forwarded_links_are_checked_without_a_menu(db):
    con, _ = db
    assert "Not an official site" in all_text(say(con, "Book here: https://mayapur-rooms-cheap.xyz/offer", who="6"))
    assert "Matches a verified provider" in all_text(say(con, "pay to shyamal.das@upi", who="6"))
    assert "Not confirmed" in all_text(say(con, "someone@okbank", who="6"))


def test_language_detection_and_switch(db):
    con, toks = db
    assert "यात्रा" in all_text(say(con, "नमस्ते", who="7"))
    assert "নমস্কার" in all_text(say(con, "নমস্কার", who="8"))
    r = all_text(say(con, "BANGLA", who="7"))
    assert "বাংলা" in r
    assert "নিজে যাচাই করা" in all_text(say(con, toks["KLN-0142"], who="7"))


def test_talk_phrases_show_bengali(db):
    con, _ = db
    say(con, "talk", who="9")
    assert "১০৮ শিব মন্দির পর্যন্ত কত লাগবে?" in all_text(say(con, "1", who="9"))


def test_voice_note_reply(db):
    con, _ = db
    assert "Bhashini" in all_text(say(con, "", who="10", kind="audio"))


def test_rate_without_badge_asks_for_scan(db):
    con, _ = db
    assert "KLN-0142" in all_text(say(con, "rate", who="11"))


def test_unknown_text(db):
    con, _ = db
    say(con, "hi", who="12")
    assert "did not understand" in all_text(say(con, "what is the weather", who="12"))


def test_phone_number_never_stored_in_plain(db):
    con, _ = db
    say(con, "hi", who="919812345678")
    rows = con.execute("SELECT wa_hash FROM wa_sessions").fetchall()
    assert all("919812345678" not in r[0] for r in rows)


def test_cloud_api_parsing_building_and_signature():
    payload = {"entry": [{"changes": [{"value": {"messages": [
        {"from": "9199", "type": "text", "text": {"body": "hi"}},
        {"from": "9199", "type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "rate", "title": "Rate"}}},
        {"from": "9199", "type": "audio", "audio": {"id": "x"}}]}}]}]}
    assert list(wa.parse_webhook(payload)) == [("9199", "hi", "text"), ("9199", "rate", "text"), ("9199", "", "audio")]
    body = wa.to_cloud_api("9199", {"text": "x", "buttons": [{"id": "a", "title": "A" * 30}]})
    assert body["type"] == "interactive" and len(body["interactive"]["action"]["buttons"][0]["reply"]["title"]) == 20
    assert wa.to_cloud_api("9199", {"text": "x", "buttons": []})["type"] == "text"
    raw = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(b"s3cret", raw, hashlib.sha256).hexdigest()
    assert wa.check_signature("s3cret", raw, sig) and not wa.check_signature("s3cret", raw, "sha256=bad")
