"""Production API (FastAPI). Thin wrappers around core.py, which holds every rule.

    pip install -r requirements.txt
    DEVBHUMI_BADGE_SECRET=... ADMIN_TOKEN=... uvicorn app:app --host 0.0.0.0 --port 8000

WhatsApp (DPR v9.4, Section 2): point the Meta WhatsApp Cloud API webhook at /webhook/whatsapp and set
    WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, DEVBHUMI_WA_NUMBER, DEVBHUMI_BASE_URL.
Set DEVBHUMI_WA_SIMULATOR=0 in production to switch off the in-browser WhatsApp simulator.
"""
import os
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import core
import whatsapp

DB = os.environ.get("DEVBHUMI_DB", "devbhumi_v09.db")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "demo-admin-token")
WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")

WA_NUMBER = os.environ.get("DEVBHUMI_WA_NUMBER", "")
WA_SIMULATOR = os.environ.get("DEVBHUMI_WA_SIMULATOR", "1") != "0"

con = core.connect(DB)
core.init_db(con)  # creates any tables a newer version added; existing data is kept
app = FastAPI(title="DevBhumi API", version="0.15.2")


class Rating(BaseModel):
    badge: str
    stars: int = Field(ge=1, le=5)
    tags: List[str] = []


class Complaint(BaseModel):
    badge: str
    category: str
    text: str = ""


class Query(BaseModel):
    query: str


class VerificationIn(BaseModel):
    client_uuid: str
    provider_id: int
    id_seen: bool
    reg_seen: bool
    photos: bool
    price_sheet_signed: bool
    consent_signed: bool
    state_portal: Optional[bool] = None
    sticker_ok: Optional[bool] = None
    reg_last4: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    checked_at: Optional[str] = None
    prices: list = []


class LinkIn(BaseModel):
    provider_id: int
    code: str


class FakeReport(BaseModel):
    code_seen: str = ""
    text: str = ""


class WaMessage(BaseModel):
    sender: str = Field("web-simulator", alias="from")
    text: str = ""
    kind: str = "text"


class Revoke(BaseModel):
    reason: str


class ComplaintUpdate(BaseModel):
    status: str
    validated: Optional[bool] = None


def mitra(authorization: str = Header("")):
    m = core.mitra_from_token(con, authorization.removeprefix("Bearer ").strip())
    if not m:
        raise HTTPException(401, "mitra_token_required")
    return m


def admin(authorization: str = Header("")):
    if authorization.removeprefix("Bearer ").strip() != ADMIN_TOKEN:
        raise HTTPException(401, "admin_token_required")
    return "admin"


def ok(d, code=400):
    if isinstance(d, dict) and d.get("ok") is False:
        raise HTTPException(code, d.get("error"))
    return d


# visitor (public)
@app.get("/api/b/{token}")
def card(token: str, lang: str = "hi", lat: Optional[float] = None, lon: Optional[float] = None):
    return ok(core.provider_card(con, token, lang, lat, lon), 404)


@app.get("/api/providers")
def providers(site: str = "bardhaman", kind: Optional[str] = None, women_run: bool = False, elder: bool = False, wheelchair: bool = False, lang: str = "hi"):
    return core.find_providers(con, site, kind, women_run, elder, wheelchair, lang)


@app.get("/api/help")
def help_(site: str = "bardhaman", lang: str = "hi"):
    return core.help_places(con, site, lang)


@app.get("/api/plan")
def plan(site: str = "bardhaman", lang: str = "hi"):
    return core.plan_visit(con, site, lang)


@app.post("/api/verify-pay")
def verify_pay(q: Query):
    return ok(core.verify_before_pay(con, q.query))


@app.post("/api/ratings")
def rate(r: Rating):
    return ok(core.add_rating(con, r.badge, r.stars, r.tags))


@app.post("/api/complaints")
def complain(c: Complaint):
    return ok(core.add_complaint(con, c.badge, c.category, c.text))


@app.get("/api/complaints/{cid}")
def complaint(cid: int):
    return ok(core.complaint_status(con, cid), 404)


@app.get("/api/ledger")
def ledger(site: Optional[str] = None):
    return core.ledger(con, site)


@app.get("/api/official")
def official():
    return core.official_links(con)


@app.post("/api/fake-reports")
def fake_report(r: FakeReport):
    return core.report_fake(con, r.code_seen, r.text, "web")


@app.get("/api/config")
def config():
    return {"wa_number": WA_NUMBER, "wa_simulator": WA_SIMULATOR, "version": "0.15.2",
            "demo_hints": os.environ.get("DEVBHUMI_DEMO_HINTS", "1") != "0",
            "interpreter_phone": os.environ.get("DEVBHUMI_INTERPRETER_PHONE", "")}


@app.get("/healthz")
def healthz():
    return {"ok": True, "version": "0.15.2"}


# WhatsApp
@app.post("/api/wa/simulate")
def wa_simulate(m: WaMessage, request: Request):
    if not WA_SIMULATOR:
        raise HTTPException(404, "not_found")
    base = str(request.base_url)   # links point back to the address the visitor used (PC or phone on Wi-Fi)
    return {"replies": whatsapp.handle(con, "sim:" + m.sender[:64], m.text[:2000], m.kind, base)}


@app.get("/webhook/whatsapp")
def wa_verify(request: Request):
    q = request.query_params
    if q.get("hub.mode") == "subscribe" and q.get("hub.verify_token") == os.environ.get("WHATSAPP_VERIFY_TOKEN", "\0"):
        return PlainTextResponse(q.get("hub.challenge", ""))
    raise HTTPException(403, "forbidden")


@app.post("/webhook/whatsapp")
async def wa_webhook(request: Request):
    raw = await request.body()
    if not whatsapp.check_signature(os.environ.get("WHATSAPP_APP_SECRET", ""), raw, request.headers.get("X-Hub-Signature-256")):
        raise HTTPException(401, "bad_signature")
    import json
    bodies = []
    for wa_id, text, kind in whatsapp.parse_webhook(json.loads(raw or b"{}")):
        bodies += [whatsapp.to_cloud_api(wa_id, r) for r in whatsapp.handle(con, wa_id, text, kind)]
    whatsapp.send(bodies)
    return {"ok": True, "replies": len(bodies)}


# Pathik Mitra
@app.get("/api/mitra/queue")
def queue(m=Depends(mitra)):
    return core.mitra_queue(con, m)


@app.post("/api/mitra/verifications")
def sync(records: List[VerificationIn], m=Depends(mitra)):
    return core.submit_verifications(con, m, [r.model_dump() for r in records])


@app.post("/api/mitra/badges")
def link(b: LinkIn, m=Depends(mitra)):
    return ok(core.link_badge(con, m, b.provider_id, b.code))


# admin / district
@app.post("/api/admin/badges/{code}/revoke")
def revoke(code: str, r: Revoke, a=Depends(admin)):
    return ok(core.revoke_badge(con, a, code, r.reason), 404)


@app.patch("/api/admin/complaints/{cid}")
def update_complaint(cid: int, u: ComplaintUpdate, a=Depends(admin)):
    return ok(core.set_complaint(con, a, cid, u.status, u.validated))


@app.get("/api/admin/badges")
def admin_badges(request: Request, site: Optional[str] = None, a=Depends(admin)):
    scheme = request.url.scheme or "http"
    port = request.url.port or (443 if scheme == "https" else 80)
    return {"badges": core.list_badges(con, site), "lan": [f"{scheme}://{ip}:{port}" for ip in core.lan_addresses()]}


@app.get("/api/admin/footfall")
def footfall(site: str, day: str, a=Depends(admin)):
    return core.footfall(con, site, day)


@app.get("/api/admin/audit")
def audit(limit: int = 100, a=Depends(admin)):
    return core.audit_log(con, limit)


# the visitor PWA: /b/<token> opens the app shell, which reads the token from the URL
@app.get("/b/{token}")
def badge_page(token: str):
    return FileResponse(os.path.join(WEB, "index.html"))


app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
