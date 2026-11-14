import json, threading, urllib.request, urllib.error
from http.server import ThreadingHTTPServer
import pytest
import dev_server, seed


@pytest.fixture(scope="module")
def srv():
    con, toks = dev_server.build()
    s = ThreadingHTTPServer(("127.0.0.1", 0), dev_server.make_app(con))
    threading.Thread(target=s.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{s.server_address[1]}", toks
    s.shutdown()


def call(url, method="GET", body=None, token=None):
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def test_card_and_shell(srv):
    base, toks = srv
    code, body, _ = call(f"{base}/api/b/{toks['KLN-0142']}?lang=hi")
    d = json.loads(body)
    assert code == 200 and d["status"] == "verified" and d["prices"][0]["item"] == "108 शिव मंदिर"
    code, body, h = call(f"{base}/b/{toks['KLN-0142']}")
    assert code == 200 and b"DevBhumi" in body and "frame-ancestors 'none'" in h["Content-Security-Policy"]
    assert call(f"{base}/api/b/KLN-0142.ffffffffffff")[0] == 404


def test_path_traversal_blocked(srv):
    base, _ = srv
    assert call(f"{base}/../backend/core.py")[0] == 404
    assert call(f"{base}/%2e%2e/backend/seed.py")[0] == 404


def test_auth(srv):
    base, _ = srv
    assert call(f"{base}/api/mitra/queue")[0] == 401
    assert call(f"{base}/api/mitra/queue", token=seed.MITRA_TOKEN)[0] == 200
    assert call(f"{base}/api/admin/audit")[0] == 401
    assert call(f"{base}/api/admin/badges/KLN-0031/revoke", "POST", {"reason": "x"})[0] == 401
    assert call(f"{base}/api/admin/badges/KLN-0031/revoke", "POST", {"reason": "x"}, token="demo-admin-token")[0] == 200


def test_post_flows(srv):
    base, toks = srv
    assert call(f"{base}/api/ratings", "POST", {"badge": toks["KLN-0007"], "stars": 5, "tags": ["polite"]})[0] == 200
    code, body, _ = call(f"{base}/api/complaints", "POST", {"badge": toks["KLN-0007"], "category": "overcharge", "text": "x"})
    cid = json.loads(body)["complaint_id"]
    assert json.loads(call(f"{base}/api/complaints/{cid}")[1])["status"] == "open"
    assert json.loads(call(f"{base}/api/verify-pay", "POST", {"query": "visitmayapur.com"})[1])["result"] == "official"
    assert call(f"{base}/api/ratings", "POST", {"badge": "bad", "stars": 5})[0] == 400


def test_public_endpoints(srv):
    base, _ = srv
    for p in ("/api/help?site=kalna", "/api/plan?site=kalna", "/api/providers?site=kalna", "/api/ledger?site=kalna"):
        assert call(base + p)[0] == 200


def test_whatsapp_simulator_and_new_public_routes(srv):
    base, toks = srv
    code, body, _ = call(f"{base}/api/wa/simulate", "POST", {"from": "t1", "text": toks["KLN-0007"]})
    r = json.loads(body)["replies"]
    assert code == 200 and "Lakshmi Das Homestay" in r[0]["text"] and len(r[0]["buttons"]) == 3
    assert json.loads(call(f"{base}/api/official")[1])[0]["domain"] == "visitmayapur.com"
    assert json.loads(call(f"{base}/api/config")[1])["version"] == "0.14.1"
    code, body, _ = call(f"{base}/api/fake-reports", "POST", {"code_seen": "KLN-0142.000000000000", "text": "x"})
    assert code == 200 and json.loads(body)["report_id"] >= 1
    led = json.loads(call(f"{base}/api/ledger?site=kalna")[1])
    assert led["fake_badge_reports"] >= 1 and "in_person_checks" in led


def test_whatsapp_webhook_verify_and_signature(srv, monkeypatch):
    import hashlib, hmac
    base, _ = srv
    monkeypatch.setenv("WHATSAPP_VERIFY_TOKEN", "vt")
    monkeypatch.setenv("WHATSAPP_APP_SECRET", "s3")
    assert call(f"{base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42")[1] == b"42"
    assert call(f"{base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=no&hub.challenge=42")[0] == 403
    payload = {"entry": [{"changes": [{"value": {"messages": [{"from": "9199", "type": "text", "text": {"body": "hi"}}]}}]}]}
    raw = json.dumps(payload).encode()
    assert call(f"{base}/webhook/whatsapp", "POST", payload)[0] == 401  # unsigned
    req = urllib.request.Request(f"{base}/webhook/whatsapp", data=raw, method="POST", headers={
        "Content-Type": "application/json", "X-Hub-Signature-256": "sha256=" + hmac.new(b"s3", raw, hashlib.sha256).hexdigest()})
    with urllib.request.urlopen(req) as r:
        assert json.loads(r.read()) == {"ok": True, "replies": 1}


def test_admin_badge_list_needs_token(srv):
    base, toks = srv
    assert call(f"{base}/api/admin/badges")[0] == 401
    req = urllib.request.Request(f"{base}/api/admin/badges", headers={"Authorization": "Bearer demo-admin-token"})
    with urllib.request.urlopen(req) as r:
        d = json.loads(r.read())
    assert len(d["badges"]) == 10 and all(u.startswith("http://") for u in d["lan"])


def test_health_and_live_settings(srv):
    base, _ = srv
    code, body, _ = call(f"{base}/healthz")
    assert code == 200 and json.loads(body)["ok"] is True
    cfg = json.loads(call(f"{base}/api/config")[1])
    assert "demo_hints" in cfg and "interpreter_phone" in cfg


def test_simulator_links_use_https_behind_proxy(srv):
    import urllib.request
    base, _ = srv
    req = urllib.request.Request(f"{base}/api/wa/simulate", data=json.dumps({"from": "px", "text": "KLN-0007"}).encode(),
                                 headers={"Content-Type": "application/json", "X-Forwarded-Proto": "https"}, method="POST")
    text = json.loads(urllib.request.urlopen(req).read())["replies"][0]["text"]
    assert "https://" in text and "http://" not in text
