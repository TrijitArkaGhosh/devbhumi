"""Kalna and Bardhaman sample data. Every provider, price, rating and amount here is FICTIONAL and marked is_sample=1.
Public places use real institution names, but coordinates, hours and phone numbers must be confirmed before launch."""
import os
import hashlib
import json
from datetime import timedelta

import core

MITRA_TOKEN = os.environ.get("MITRA_TOKEN_KALNA", "demo-mitra-token")              # Kalna Pathik Mitra (Arup)
MITRA_TOKEN_BARDHAMAN = os.environ.get("MITRA_TOKEN_BARDHAMAN", "demo-mitra-riya")  # Bardhaman Pathik Mitra (Riya, from the film)


def h(s):
    return hashlib.sha256(s.encode()).hexdigest()


def seed(con):
    t = core.now()
    ago = lambda d: core.iso(t - timedelta(days=d))
    con.executemany("INSERT INTO sites VALUES (?,?,?,?,?,?)", [
        ("kalna", "কালনা", "कालना", "Kalna", 23.2195, 88.3655),
        ("nabadwip", "নবদ্বীপ", "नवद्वीप", "Nabadwip", 23.4067, 88.3676),
        ("bardhaman", "বর্ধমান", "बर्धमान", "Bardhaman", 23.2490, 87.8690),
    ])
    SITE = {"kalna": (23.2195, 88.3655), "bardhaman": (23.2490, 87.8690)}
    con.execute("INSERT INTO mitras(site_id, display_name, token_hash, certified_at) VALUES ('kalna','Arup',?,?)",
                (h(MITRA_TOKEN), ago(60)))
    con.execute("INSERT INTO mitras(site_id, display_name, token_hash, certified_at) VALUES ('bardhaman','Riya',?,?)",
                (h(MITRA_TOKEN_BARDHAMAN), ago(90)))
    MITRA_ID = {"kalna": 1, "bardhaman": 2}
    providers = [
        # site, name, kind, women, elder, wheel, reg4, phone, upi, verified_days_ago, ratings[(stars)], badge, badge_status, local spend (Rs, last month)
        ("kalna", "Shyamal Das", "toto", 0, 1, 0, "1234", "9800000021", "shyamal.das@upi", 12, [5, 5, 4, 5, 4, 4], "KLN-0142", "active", 6200),
        ("kalna", "Lakshmi Das Homestay", "homestay", 1, 1, 1, "H077", "9800000022", "lakshmi.das@upi", 30, [5, 5, 4, 5, 5, 4, 5, 4, 5, 5, 4, 5], "KLN-0007", "active", 15600),
        ("kalna", "Nitai Makha Sandesh Stall", "stall", 0, 0, 1, "T310", "9800000023", None, 97, [4, 5, 4], "KLN-0031", "active", 8300),
        ("kalna", "Ghat Boat 3", "boat", 0, 0, 0, "B003", "9800000024", None, 20, [4, 4, 5], "KLN-0090", "active", 4300),
        ("kalna", "Pintu Toto", "toto", 0, 0, 0, "5678", "9800000025", None, 40, [2, 1], "KLN-0150", "inactive", 0),
        # Bardhaman: the people of the film "The Promise". Bhola Das is Diya's father.
        ("bardhaman", "Bhola Das", "toto", 0, 1, 0, "4108", "9800000026", "bhola.das@upi", 15, [5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5], "BDN-0108", "active", 7400),
        ("bardhaman", "Mina Pal Homestay", "homestay", 1, 1, 1, "H021", "9800000028", "mina.pal@upi", 20, [5, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5], "BDN-0021", "active", 18400),
        ("bardhaman", "Gopal Mihidana Stall", "stall", 0, 0, 1, "T108", "9800000029", "gopal.mihidana@upi", 86, [5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4], "BDN-0031", "active", 9100),
        # Bablu Das: his old badge BDN-0150 was revoked (copied stickers, overcharging); he was re-checked and got BDN-0151
        ("bardhaman", "Bablu Das", "toto", 0, 0, 0, "5108", "9800000027", "bablu.das@upi", 5, [5, 4, 5], "BDN-0151", "active", 2100),
    ]
    prices = {
        "Shyamal Das": [("১০৮ শিব মন্দির", "108 शिव मंदिर", "108 Shiva temples", 60), ("কালনা স্টেশন", "कालना स्टेशन", "Kalna station", 40),
                     ("ঘাট থেকে রাজবাড়ি", "घाट से राजबाड़ी", "Ghat to Rajbari", 30)],
        "Lakshmi Das Homestay": [("দুজনের ঘর, এক রাত", "दो लोगों का कमरा, एक रात", "Room for two, one night", 1100), ("সকালের খাবার", "नाश्ता", "Breakfast", 70)],
        "Nitai Makha Sandesh Stall": [("মাখা সন্দেশ, ২৫০ গ্রাম", "माखा संदेश, 250 ग्राम", "Makha sandesh, 250 g", 100), ("রসগোল্লা, ৪টি", "रसगुल्ला, 4", "Rasgulla, 4", 40)],
        "Mina Pal Homestay": [("দুজনের ঘর, এক রাত", "दो लोगों का कमरा, एक रात", "Room for two, one night", 1200), ("সকালের খাবার", "नाश्ता", "Breakfast", 80)],
        "Gopal Mihidana Stall": [("মিহিদানা, ২৫০ গ্রাম", "मिहिदाना, 250 ग्राम", "Mihidana, 250 g", 90), ("সীতাভোগ, ২৫০ গ্রাম", "सीताभोग, 250 ग्राम", "Sitabhog, 250 g", 90)],
        "Bablu Das": [("স্টেশন থেকে নবাবহাট ১০৮ শিব মন্দির", "स्टेशन से नवाबहाट 108 शिव मंदिर", "Station to Nawabhat 108 Shiva temples", 80),
                      ("স্টেশন থেকে বর্ধমান রাজবাড়ি", "स्टेशन से बर्धमान राजबाड़ी", "Station to Bardhaman Rajbari", 40)],
        "Ghat Boat 3": [("নদী ভ্রমণ, জনপ্রতি", "नदी सैर, प्रति व्यक्ति", "River ride, per person", 30)],
        "Pintu Toto": [("১০৮ শিব মন্দির", "108 शिव मंदिर", "108 Shiva temples", 60)],
        "Bhola Das": [("স্টেশন থেকে নবাবহাট ১০৮ শিব মন্দির", "स्टेशन से नवाबहाट 108 शिव मंदिर", "Station to Nawabhat 108 Shiva temples", 80),
                      ("স্টেশন থেকে বর্ধমান রাজবাড়ি", "स्टेशन से बर्धमान राजबाड़ी", "Station to Bardhaman Rajbari", 40),
                      ("স্টেশন থেকে কার্জন গেট", "स्टेशन से कर्ज़न गेट", "Station to Curzon Gate", 30)],
    }
    pids = {}
    for i, (site, name, kind, w, e, wc, reg, phone, upi, vdays, rts, code, bst, spend) in enumerate(providers):
        cur = con.execute(
            "INSERT INTO providers(site_id, kind, display_name, photo_url, reg_type, reg_last4, phone_hash, upi_hash, lat, lon, "
            "women_run, elder_friendly, wheelchair, is_sample, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)",
            (site, kind, name, None, "sample registration", reg, h(phone), h(upi) if upi else None,
             SITE[site][0] + 0.002 * i, SITE[site][1] + 0.002 * i, w, e, wc, ago(120)))
        pid = cur.lastrowid
        pids[name] = pid
        for bn, hi, en, amt in prices[name]:
            con.execute("INSERT INTO prices(provider_id, item_bn, item_hi, item_en, amount_inr, verified_at) VALUES (?,?,?,?,?,?)",
                        (pid, bn, hi, en, amt, ago(vdays)))
        con.execute("INSERT INTO verifications(provider_id, mitra_id, client_uuid, id_seen, reg_seen, photos, price_sheet_signed, "
                    "consent_signed, complete, checked_at, synced_at) VALUES (?,?,?,1,1,1,1,1,1,?,?)",
                    (pid, MITRA_ID[site], f"seed-{pid}", ago(vdays), ago(vdays)))
        con.execute("INSERT INTO consents(provider_id, version, fields_shown, signed_at) VALUES (?,?,?,?)",
                    (pid, "v1", json.dumps(["name", "photo", "registration_last4", "prices", "rating"]), ago(vdays)))
        con.execute("INSERT INTO badges(code, provider_id, issued_at, status, revoked_at, revoke_reason) VALUES (?,?,?,?,?,?)",
                    (code, pid, ago(vdays), bst, ago(3) if bst == "inactive" else None,
                     "two validated complaints (sample)" if bst == "inactive" else None))
        for k, s in enumerate(rts):
            con.execute("INSERT INTO ratings(provider_id, stars, tags, at) VALUES (?,?,?,?)", (pid, s, "[]", ago(k + 1)))
        con.execute("INSERT INTO local_spend(provider_id, month, amount_inr, confirmed_at) VALUES (?,?,?,?)",
                    (pid, "2026-10", spend, ago(10)))
    # Bablu's old badge: revoked, so a copied sticker of it shows "do not use" even though his new badge is active
    con.execute("INSERT INTO badges(code, provider_id, issued_at, status, revoked_at, revoke_reason) VALUES (?,?,?,?,?,?)",
                ("BDN-0150", pids["Bablu Das"], ago(200), "inactive", ago(30), "copied stickers and overcharging (sample)"))
    places = [
        ("kalna", "hospital", "কালনা মহকুমা হাসপাতাল", "कालना अनुमंडल अस्पताल", "Kalna Sub-Divisional Hospital", 23.2236, 88.3593, None, None),
        ("kalna", "police", "কালনা থানা", "कालना पुलिस थाना", "Kalna Police Station", 23.2208, 88.3622, None, None),
        ("kalna", "helpdesk", "দেবভূমি সহায়তা ডেস্ক, ঘাট ২", "देवभूमि हेल्प डेस्क, घाट 2", "DevBhumi help desk, Ghat 2", 23.2190, 88.3668, None, "9 am–6 pm"),
        ("kalna", "temple", "১০৮ শিব মন্দির (নব কৈলাস)", "108 शिव मंदिर (नव कैलाश)", "108 Shiva temples (Nava Kailash)", 23.2229, 88.3604, None, "6 am–7 pm (confirm)"),
        ("kalna", "ferry", "কালনা–শান্তিপুর ফেরি", "कालना–शांतिपुर फेरी", "Kalna–Shantipur ferry", 23.2181, 88.3677, None, "6 am–9 pm (confirm)"),
        ("bardhaman", "hospital", "বর্ধমান মেডিকেল কলেজ ও হাসপাতাল", "बर्धमान मेडिकल कॉलेज और अस्पताल", "Burdwan Medical College & Hospital", 23.2425, 87.8590, None, None),
        ("bardhaman", "police", "বর্ধমান থানা", "बर्धमान पुलिस थाना", "Bardhaman Police Station", 23.2400, 87.8640, None, None),
        ("bardhaman", "helpdesk", "দেবভূমি সহায়তা ডেস্ক, বর্ধমান জংশন", "देवभूमि हेल्प डेस्क, बर्धमान जंक्शन", "DevBhumi help desk, Bardhaman Junction", 23.2490, 87.8690, None, "9 am–6 pm"),
        ("bardhaman", "temple", "১০৮ শিব মন্দির, নবাবহাট", "108 शिव मंदिर, नवाबहाट", "108 Shiva temples, Nawabhat", 23.2700, 87.8330, None, "6 am–8 pm (confirm)"),
    ]
    for site, kind, bn, hi, en, lat, lon, phone, hours in places:
        con.execute("INSERT INTO places(site_id, kind, name_bn, name_hi, name_en, lat, lon, public_phone, hours, source, verified_at, is_sample) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
                    (site, kind, bn, hi, en, lat, lon, phone, hours, "sample: confirm location and hours before launch", ago(5)))
    con.executemany("INSERT INTO official_links VALUES (?,?,?)", [
        ("visitmayapur.com", "ISKCON Mayapur accommodation", "DPR v9.4 official links list"),
        ("wbtdcl.wb.gov.in", "West Bengal Tourism Development Corporation (WBTDCL)", "official WBTDCL booking portal, checked 14 Nov 2026"),
        ("wbtourism.gov.in", "West Bengal Tourism", "DPR v9.4 official links list"),
        ("irctc.co.in", "IRCTC", "DPR v9.4 official links list"),
    ])
    for d, lvl in enumerate(["comfortable", "busy", "very_busy", "very_busy", "busy", "comfortable", "comfortable"]):
        for site in ("kalna", "bardhaman"):
            con.execute("INSERT INTO comfort_forecast VALUES (?,?,?)", (site, core.iso(t + timedelta(days=d))[:10], lvl))
    con.commit()
    # "Listed" providers: signed up, not yet visited, so no badge and not shown to visitors (DPR verification ladder)
    for name, kind, w in (("Sunita Roy Homestay", "homestay", 1), ("Ratan Majhi Boat 7", "boat", 0)):
        con.execute("INSERT INTO providers(site_id, kind, display_name, reg_type, women_run, is_sample, created_at) "
                    "VALUES ('kalna',?,?,'pending',?,1,?)", (kind, name, w, ago(2)))
    # one scan of Shyamal's badge from 40 km away, so the Mitra queue shows a copied-sticker check
    con.execute("INSERT INTO scans(badge_code, site_id, at, lang, coarse_lat, coarse_lon, suspicious) VALUES ('KLN-0142','kalna',?,'hi',23.55,88.25,1)",
                (ago(1),))
    con.commit()
    codes = [p[11] for p in providers] + ["BDN-0150"]
    return {code: core.badge_url_token(code) for code in codes}


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "devbhumi_v09.db"
    con = core.connect(path)
    core.init_db(con)
    for code, tok in seed(con).items():
        print(code, "->", f"/b/{tok}")
