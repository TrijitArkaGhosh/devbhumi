"""Zero-install demo server: same routes as app.py, Python standard library only.

    python dev_server.py            # seeds Kalna sample data in memory, serves http://localhost:8000
    python dev_server.py --port 9000

Use it for the jury demo on any laptop. Use app.py (FastAPI) in production.
"""
import argparse
import json
import mimetypes
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import core
import seed
import whatsapp

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "demo-admin-token")
WA_NUMBER = os.environ.get("DEVBHUMI_WA_NUMBER", "")
# Live site: set DEVBHUMI_DEMO_HINTS=0 so the sign-in screens stop showing the demo codes.
DEMO_HINTS = os.environ.get("DEVBHUMI_DEMO_HINTS", "1") != "0"
INTERPRETER_PHONE = os.environ.get("DEVBHUMI_INTERPRETER_PHONE", "")
VERSION = "0.14.1"


def make_app(con):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _public_base(self):
            """Address for links in replies: the configured live address, else the one the visitor used (https behind a proxy)."""
            if os.environ.get("DEVBHUMI_BASE_URL"):
                return os.environ["DEVBHUMI_BASE_URL"].rstrip("/")
            host = re.sub(r"[^A-Za-z0-9.:\-\[\]]", "", self.headers.get("Host") or "")
            if not host:
                return None
            proto = (self.headers.get("X-Forwarded-Proto") or "").split(",")[0].strip().lower()
            if proto not in ("http", "https"):
                proto = "https" if getattr(self.server, "is_https", False) else "http"
            return f"{proto}://{host}"

        def _send(self, code, body, ctype="application/json; charset=utf-8"):
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            if ctype.startswith("text/html"):
                self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; "
                                 "font-src 'self'; connect-src 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(data)

        def _json(self, d, err=400):
            if isinstance(d, dict) and d.get("ok") is False:
                return self._send(err, {"detail": d.get("error")})
            return self._send(200, d)

        def _body(self):
            n = int(self.headers.get("Content-Length") or 0)
            if n > 100_000:
                return None
            self._raw = self.rfile.read(n)
            try:
                return json.loads(self._raw or b"{}")
            except ValueError:
                return None

        def _bearer(self):
            return (self.headers.get("Authorization") or "").removeprefix("Bearer ").strip()

        def _static(self, path):
            if path in ("/", "") or path.startswith("/b/"):
                path = "/index.html"
            full = os.path.normpath(os.path.join(WEB, path.lstrip("/")))
            if not full.startswith(os.path.normpath(WEB)) or not os.path.isfile(full):
                return self._send(404, {"detail": "not_found"})
            ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
            if full.endswith(".webmanifest"):
                ctype = "application/manifest+json"
            with open(full, "rb") as f:
                return self._send(200, f.read(), ctype + ("; charset=utf-8" if ctype.startswith("text") or "javascript" in ctype else ""))

        def do_GET(self):
            u = urlparse(self.path)
            q = {k: v[0] for k, v in parse_qs(u.query).items()}
            p = u.path
            lang = q.get("lang", "hi")
            m = re.fullmatch(r"/api/b/([A-Za-z0-9.\-]+)", p)
            if m:
                lat = float(q["lat"]) if "lat" in q else None
                lon = float(q["lon"]) if "lon" in q else None
                return self._json(core.provider_card(con, m.group(1), lang, lat, lon), 404)
            if p == "/api/providers":
                t = lambda k: q.get(k) in ("1", "true")
                return self._json(core.find_providers(con, q.get("site", "bardhaman"), q.get("kind"), t("women_run"), t("elder"), t("wheelchair"), lang))
            if p == "/api/help":
                return self._json(core.help_places(con, q.get("site", "bardhaman"), lang))
            if p == "/api/plan":
                return self._json(core.plan_visit(con, q.get("site", "bardhaman"), lang))
            if p == "/api/ledger":
                return self._json(core.ledger(con, q.get("site")))
            if p == "/api/official":
                return self._json(core.official_links(con))
            if p == "/api/config":
                return self._json({"wa_number": WA_NUMBER, "wa_simulator": True, "version": VERSION,
                                   "demo_hints": DEMO_HINTS, "interpreter_phone": INTERPRETER_PHONE})
            if p == "/healthz":   # for the hosting health check and the keep-awake ping
                return self._json({"ok": True, "version": VERSION})
            if p == "/webhook/whatsapp":
                if q.get("hub.mode") == "subscribe" and q.get("hub.verify_token") == os.environ.get("WHATSAPP_VERIFY_TOKEN", "\0"):
                    return self._send(200, q.get("hub.challenge", "").encode(), "text/plain; charset=utf-8")
                return self._send(403, {"detail": "forbidden"})
            m = re.fullmatch(r"/api/complaints/(\d+)", p)
            if m:
                return self._json(core.complaint_status(con, int(m.group(1))), 404)
            if p == "/api/mitra/queue":
                mi = core.mitra_from_token(con, self._bearer())
                return self._json(core.mitra_queue(con, mi)) if mi else self._send(401, {"detail": "mitra_token_required"})
            if p.startswith("/api/admin/"):
                if self._bearer() != ADMIN_TOKEN:
                    return self._send(401, {"detail": "admin_token_required"})
                if p == "/api/admin/footfall":
                    return self._json(core.footfall(con, q.get("site", "bardhaman"), q.get("day", core.iso(core.now())[:10])))
                if p == "/api/admin/badges":
                    port = self.server.server_address[1]
                    scheme = "https" if getattr(self.server, "is_https", False) else "http"
                    return self._json({"badges": core.list_badges(con, q.get("site")),
                                       "lan": [f"{scheme}://{ip}:{port}" for ip in core.lan_addresses()]})
                if p == "/api/admin/audit":
                    return self._json(core.audit_log(con, int(q.get("limit", 100))))
            if p.startswith("/api/"):
                return self._send(404, {"detail": "not_found"})
            return self._static(p)

        def do_POST(self):
            p = urlparse(self.path).path
            b = self._body()
            if b is None:
                return self._send(400, {"detail": "bad_json"})
            if p == "/api/verify-pay":
                return self._json(core.verify_before_pay(con, b.get("query", "")))
            if p == "/api/ratings":
                return self._json(core.add_rating(con, b.get("badge"), b.get("stars", 0), b.get("tags")))
            if p == "/api/complaints":
                return self._json(core.add_complaint(con, b.get("badge"), b.get("category", "other"), b.get("text", "")))
            if p == "/api/fake-reports":
                return self._json(core.report_fake(con, b.get("code_seen", ""), b.get("text", ""), "web"))
            if p == "/api/wa/simulate":
                sender = str(b.get("from") or "web-simulator")[:64]
                return self._json({"replies": whatsapp.handle(con, "sim:" + sender, str(b.get("text", ""))[:2000], b.get("kind", "text"),
                                                              self._public_base())})
            if p == "/webhook/whatsapp":
                if not whatsapp.check_signature(os.environ.get("WHATSAPP_APP_SECRET", ""), self._raw, self.headers.get("X-Hub-Signature-256")):
                    return self._send(401, {"detail": "bad_signature"})
                bodies = []
                for wa_id, text, kind in whatsapp.parse_webhook(b):
                    bodies += [whatsapp.to_cloud_api(wa_id, r) for r in whatsapp.handle(con, wa_id, text, kind)]
                whatsapp.send(bodies)
                return self._json({"ok": True, "replies": len(bodies)})
            if p.startswith("/api/mitra/"):
                mi = core.mitra_from_token(con, self._bearer())
                if not mi:
                    return self._send(401, {"detail": "mitra_token_required"})
                if p == "/api/mitra/verifications" and isinstance(b, list):
                    return self._json(core.submit_verifications(con, mi, b))
                if p == "/api/mitra/badges":
                    return self._json(core.link_badge(con, mi, b.get("provider_id"), b.get("code")))
            m = re.fullmatch(r"/api/admin/badges/([A-Z]{3}-\d{4})/revoke", p)
            if m:
                if self._bearer() != ADMIN_TOKEN:
                    return self._send(401, {"detail": "admin_token_required"})
                return self._json(core.revoke_badge(con, "admin", m.group(1), b.get("reason", "")), 404)
            return self._send(404, {"detail": "not_found"})

        def do_PATCH(self):
            p = urlparse(self.path).path
            b = self._body() or {}
            m = re.fullmatch(r"/api/admin/complaints/(\d+)", p)
            if m and self._bearer() == ADMIN_TOKEN:
                return self._json(core.set_complaint(con, "admin", int(m.group(1)), b.get("status"), b.get("validated")))
            return self._send(401 if m else 404, {"detail": "admin_token_required" if m else "not_found"})

    return H


def build(db=":memory:"):
    con = core.connect(db)
    core.init_db(con)
    tokens = seed.seed(con)
    return con, tokens


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=None)
    ap.add_argument("--https", action="store_true", help="serve https:// with the test certificate from make_cert.py (live camera on phones)")
    a = ap.parse_args()
    scheme = "https" if a.https else "http"
    port = a.port or int(os.environ.get("PORT", "0")) or (8443 if a.https else 8000)   # hosting services pass PORT
    con, tokens = build()
    httpd = ThreadingHTTPServer(("0.0.0.0", port), make_app(con))
    if a.https:
        import ssl
        import make_cert
        make_cert.main()
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(make_cert.CERT, make_cert.KEY)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
        httpd.is_https = True
    print(f"DevBhumi demo on {scheme}://localhost:{port}  (sample data)")
    for code, tok in tokens.items():
        print(f"  {code}: {scheme}://localhost:{port}/b/{tok}")
    lan = core.lan_addresses()
    if lan:
        print(f"  On your phone (same Wi-Fi): {scheme}://{lan[0]}:{port}/")
    if not DEMO_HINTS:
        print("  Live mode: sign-in codes come from ADMIN_TOKEN, MITRA_TOKEN_KALNA and MITRA_TOKEN_BARDHAMAN.")
        httpd.serve_forever()
    for name, path in (("Printable Bharosa QR badges (code demo-admin-token)", "#/badges"), ("WhatsApp assistant", "#/wa"), ("Pathik Mitra app (code demo-mitra-token)", "#/mitra"),
                       ("Seva Ledger", "#/ledger"), ("Official booking sites", "#/official")):
        print(f"  {name}: {scheme}://localhost:{port}/{path}")
    httpd.serve_forever()
