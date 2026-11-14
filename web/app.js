/* Older Android browsers (before Chrome 51) and old Samsung Internet lack NodeList.forEach. */
if (window.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
/* DevBhumi visitor PWA. No framework, no build step: small enough for slow 3G and cheap phones. */
(function () {
  'use strict';
  var CONFIG = { site: 'bardhaman', interpreterPhone: '' /* set at launch: the on-duty Pathik Mitra line */, waNumber: '' /* filled from /api/config */, demoHints: false };
  var S = { lang: 'hi', badge: null, card: null, rating: 0, tags: {}, filters: { kind: '', women_run: false, elder: false, wheelchair: false } };
  var main = document.getElementById('main');

  // ---------- small helpers
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(k, vars) {
    var s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.replace('{' + v + '}', vars[v]); });
    return s;
  }
  function digits(n) { var s = String(n); return S.lang === 'bn' ? s.replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }) : s; }
  function api(path, opts) {
    opts = opts || {};
    var sep = path.indexOf('?') < 0 ? '?' : '&';
    var url = opts.method ? path : path + sep + 'lang=' + S.lang;
    var nav = S.navId;
    return fetch(url, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }, function () { return { ok: false, data: null }; }); },
            function () { return { ok: false, data: null, offline: true }; })   // no signal: never leave a screen stuck on "Loading…"
      .then(function (res) {
        // on a slow network the person may already be on another screen: drop the late answer instead of drawing over that screen
        if (nav !== S.navId) return new Promise(function () {});
        return res;
      });
  }
  function netFail(retry) {
    view('<div class="result r-unknown" style="margin-top:4px"><p class="big">' + esc(t('net_title')) + '</p><p style="margin:0">' + esc(t('net_body')) + '</p></div>' +
      '<div class="stack" style="margin-top:14px"><button class="btn green" id="retry">' + esc(t('retry')) + '</button><a class="btn red" href="tel:112">' + esc(t('help_112')) + '</a></div>');
    document.getElementById('retry').addEventListener('click', retry);
  }
  function sendFail(el) { if (el) el.insertAdjacentHTML('beforeend', '<p class="note warn" style="margin:12px 0 0">' + esc(t('send_failed')) + '</p>'); }
  function view(html) { main.innerHTML = html; main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  function loading() { view('<p class="spinner">' + esc(t('loading')) + '</p>'); }
  function chip(status) {
    var icon = { verified: '✓', trusted: '★', needs_recheck: '!', inactive: '–' }[status] || '?';
    return '<span class="chip st-' + esc(status) + '"><span class="dot" aria-hidden="true">' + icon + '</span>' + esc(t('status_' + status)) + '</span>';
  }
  function bell() {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var ctx = new A(), now = ctx.currentTime;
      [[880, .25], [1760, .12], [2429, .08]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = p[0];
        g.gain.setValueAtTime(p[1], now); g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 2.3);
      });
    } catch (e) { /* sound is optional */ }
  }

  // ---------- language, text size, contrast
  function applyPrefs() {
    document.documentElement.lang = S.lang;
    document.documentElement.classList.toggle('large', store('db_large') === '1');
    document.documentElement.classList.toggle('contrast', store('db_contrast') === '1');
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === S.lang)); });
  }
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { S.lang = b.getAttribute('data-lang'); store('db_lang', S.lang); applyPrefs(); route(); });
  });

  // ---------- screens
  // ---------- the film "The Promise": the same story the sample data tells
  var FILM_URL = 'https://drive.google.com/file/d/1L6sy-UMrUVmG5LD85pmkipReato3f57W/view?usp=sharing';
  function filmCard() {
    return '<h2>' + esc(t('film_head')) + '</h2>' +
      '<a class="card film" href="' + FILM_URL + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="film-poster"><img src="/film.jpg" alt="' + esc(t('film_alt')) + '" width="720" height="300" loading="lazy"><span class="film-play" aria-hidden="true">▶</span></span>' +
      '<span class="pad"><strong class="film-title" lang="bn">প্রতিশ্রুতি</strong> <span class="muted">· The Promise</span>' +
      '<span class="film-sub">' + esc(t('film_sub')) + '</span>' +
      '<span class="film-meta">' + esc(t('film_meta')) + '</span>' +
      '<span class="film-cta">' + esc(t('film_watch')) + ' <span aria-hidden="true">↗</span></span></span></a>';
  }
  var ICON = {
    find: '<path d="M10.5 4a6.5 6.5 0 1 0 4 11.6l4.4 4.4 1.4-1.4-4.4-4.4A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"/>',
    plan: '<path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9zM5 6v2h14V6H5zm2 6h4v4H7v-4z"/>',
    verify: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3zm-1.2 13.6-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z"/>',
    help: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
    camera: '<path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>',
    photo: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v9.6l4-4 3 3 5-5 4 4V6H4zm4.5 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>'
  };
  function icon(k, sz) { return '<svg class="ico" width="' + (sz || 26) + '" height="' + (sz || 26) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + ICON[k] + '</svg>'; }
  function home() {
    view('<section class="hero"><p class="hero-kicker">' + esc(t('hero_kicker')) + '</p><h1>' + esc(t('home_title')) + '</h1><p class="hero-sub">' + esc(t('home_sub')) + '</p>' +
      '<div class="hero-actions"><button class="btn hero-scan" id="scan">' + icon('camera', 24) + esc(t('scan_badge')) + '</button>' +
      '<input id="photo" type="file" accept="image/*" capture="environment" hidden></div>' +
      '<p class="hero-hint">' + esc(t('scan_alt_q')) + ' <label class="hero-alt" for="photo">' + icon('photo', 16) + esc(t('scan_alt')) + '</label></p>' +
      '<ul class="hero-points"><li>' + esc(t('hero_p1')) + '</li><li>' + esc(t('hero_p2')) + '</li><li>' + esc(t('hero_p3')) + '</li></ul></section>' +
      '<p class="muted small" id="scanmsg" aria-live="polite"></p>' +
      '<div class="scanner" id="scanner" hidden><video id="cam" playsinline muted></video><img class="shot" id="shot" alt="" hidden>' +
      '<div class="scan-box" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="scan-sweep"><span class="scan-line"></span></span>' +
      '<span class="scan-ok"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div><span class="focus-ring" id="ring" aria-hidden="true"></span>' +
      '<p class="scan-tip" id="scantip">' + esc(t('scan_box')) + '</p>' +
      '<div class="scan-tools"><button type="button" class="scan-btn" id="torch" hidden aria-pressed="false" aria-label="' + esc(t('scan_torch')) + '">🔦</button>' +
      '<label class="scan-zoom" id="zoomwrap" hidden><span aria-hidden="true">🔍</span><input id="zoom" type="range" aria-label="' + esc(t('scan_zoom')) + '"></label>' +
      '<button type="button" class="scan-btn" id="scanclose" aria-label="' + esc(t('scan_close')) + '">✕</button></div></div>' +
      '<div class="home-tiles">' +
      [['#/find', 'go_find', 'tile_find', 'find', ''], ['#/plan', 'go_plan', 'tile_plan', 'plan', ''], ['#/verify', 'go_verify', 'tile_verify', 'verify', ''], ['#/help', 'go_help', 'tile_help', 'help', ' sos-tile']].map(function (x) {
        return '<a class="htile' + x[4] + '" href="' + x[0] + '"><span class="htile-ico">' + icon(x[3]) + '</span><strong>' + esc(t(x[1])) + '</strong><span class="htile-sub">' + esc(t(x[2])) + '</span></a>'; }).join('') + '</div>' +
      filmCard() +
      '<h2>' + esc(t('more_title')) + '</h2><div class="list">' +
      [['/wa', 'go_wa', '💬'], ['/mitra', 'go_mitra', '🧭'], ['/ledger', 'go_ledger', '📊'], ['/official', 'go_official', '🔗'], ['/badges', 'go_badges', '🖨']].map(function (x) {
        return '<a class="item" href="#' + x[0] + '"><span><span aria-hidden="true">' + x[2] + '</span> <strong>' + esc(t(x[1])) + '</strong></span><span aria-hidden="true">›</span></a>'; }).join('') + '</div>' +
      '<p class="muted small" style="margin-top:16px">' + esc(t('no_otp')) + '</p>');
    document.getElementById('scan').addEventListener('click', startScan);
    var ph = document.getElementById('photo');
    ph.addEventListener('click', function () { photoAC = photoAC || newAudio(); });   // inside the tap, so the success sound may play later
    ph.addEventListener('change', function (e) { scanPhoto(e.target.files && e.target.files[0]); e.target.value = ''; });
  }
  var photoAC = null, liveStop = null, lastShot = null;
  function newAudio() { try { var AC = window.AudioContext || window.webkitAudioContext; return AC ? new AC() : null; } catch (e) { return null; } }
  function isPhone() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return 'ontouchstart' in window; } }

  // ---------- scanning: built-in BarcodeDetector where it exists (Android Chrome), our own reader elsewhere (iPhone, Firefox)
  function badgePath(text) {
    var m = /\/b\/([A-Z]{3}-\d{4}\.[0-9a-f]{12})$/.exec(String(text || '').trim());
    if (!m) return null;
    try { var u = new URL(text, location.href); return u.origin === location.origin ? u.pathname : null; } catch (e) { return null; }
  }
  function scanFeedback(ac) {   // a short buzz and a soft two-note chime, like payment apps
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
    if (!ac) return;
    try {
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      var now = ac.currentTime, g = ac.createGain();
      g.connect(ac.destination);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.09, now + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      [[880, 0], [1320, 0.09]].forEach(function (n) { var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = n[0]; o.connect(g); o.start(now + n[1]); o.stop(now + n[1] + 0.17); });
    } catch (e) {}
  }
  function openScanned(text, msg, stop) {
    var path = badgePath(text);
    if (path) { if (stop) stop(); history.pushState({}, '', path); route(); return true; }
    msg.textContent = t('scan_not_badge');
    return false;
  }
  function frameData(source, sw, sh, maxSide, canvas) {
    var k = Math.min(1, maxSide / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }
  function startScan() {
    var msg = document.getElementById('scanmsg'), video = document.getElementById('cam'), box = document.getElementById('scanner');
    // no live camera here (plain http, old browser): go straight to the phone's own camera, still inside this tap
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { msg.textContent = t('scan_photo_hint'); document.getElementById('photo').click(); return; }
    var det = null;
    try { if (typeof window.BarcodeDetector === 'function') det = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; }   // else our own reader
    var canvas = document.createElement('canvas'), frame = 0, lastBad = '', stopped = false, done = false, badTimer = 0;
    var ac = newAudio();   // made inside this tap, so phones (iPhone too) allow the short success sound later
    box.classList.remove('ok', 'bad', 'photo');
    document.getElementById('shot').hidden = true; video.hidden = false;
    document.getElementById('scantip').textContent = t('scan_box');
    msg.textContent = '';
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, advanced: [{ focusMode: 'continuous' }] } }).then(function (stream) {
      var track = stream.getVideoTracks()[0], caps = {};
      try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (e) { caps = {}; }
      box.hidden = false; video.srcObject = stream; video.play();
      box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      var stop = function () { if (stopped) return; stopped = true; liveStop = null; stream.getTracks().forEach(function (tr) { tr.stop(); }); box.hidden = true; };
      liveStop = stop;
      document.getElementById('scanclose').onclick = stop;
      // zoom (where the phone allows it): start a little zoomed in, because badges are small
      if (caps.zoom && caps.zoom.max > caps.zoom.min) {
        var z = document.getElementById('zoom'), start = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.5));
        z.min = caps.zoom.min; z.max = Math.min(caps.zoom.max, 8); z.step = caps.zoom.step || 0.1; z.value = start;
        document.getElementById('zoomwrap').hidden = false;
        track.applyConstraints({ advanced: [{ zoom: start }] }).catch(function () {});
        z.oninput = function () { track.applyConstraints({ advanced: [{ zoom: +z.value }] }).catch(function () {}); };
      }
      if (caps.torch) {
        var tb = document.getElementById('torch'); tb.hidden = false;
        tb.onclick = function () { var on = tb.getAttribute('aria-pressed') !== 'true'; tb.setAttribute('aria-pressed', String(on)); track.applyConstraints({ advanced: [{ torch: on }] }).catch(function () {}); };
      }
      // tap to focus at that point (Android Chrome supports it on many phones; elsewhere autofocus keeps running)
      video.onclick = function (e) {
        var r = video.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, ring = document.getElementById('ring');
        ring.style.left = (e.clientX - r.left) + 'px'; ring.style.top = (e.clientY - r.top) + 'px'; ring.classList.remove('on'); void ring.offsetWidth; ring.classList.add('on');
        var modes = caps.focusMode || [], adv = {};
        if (modes.indexOf('single-shot') >= 0) adv.focusMode = 'single-shot'; else if (modes.indexOf('continuous') >= 0) adv.focusMode = 'continuous';
        adv.pointsOfInterest = [{ x: x, y: y }];
        track.applyConstraints({ advanced: [adv] }).catch(function () { track.applyConstraints({ advanced: [{ focusMode: adv.focusMode || 'continuous' }] }).catch(function () {}); });
      };
      var found = function (text) {
        if (badgePath(text)) {
          if (done) return true;
          done = true;                                   // stop reading frames; show the success moment, then open the card
          box.classList.remove('bad'); box.classList.add('ok'); msg.textContent = t('scan_ok');
          scanFeedback(ac);
          setTimeout(function () { openScanned(text, msg, stop); }, 520);
          return true;
        }
        if (text !== lastBad) { lastBad = text; msg.textContent = t('scan_not_badge'); }
        box.classList.add('bad'); clearTimeout(badTimer); badTimer = setTimeout(function () { box.classList.remove('bad'); }, 900);
        return false;
      };
      // the part of the camera picture that sits inside the on-screen box (video uses object-fit: cover)
      var boxRegion = function () {
        var vw = video.videoWidth, vh = video.videoHeight, cw = video.clientWidth || 1, ch = video.clientHeight || 1;
        var k = Math.max(vw / cw, vh / ch), side = Math.min(cw, ch) * 0.72 * k * 1.15;
        side = Math.min(side, vw, vh);
        return { x: (vw - side) / 2, y: (vh - side) / 2, s: side };
      };
      var tick = function () {
        if (stopped || done) return;
        if (!document.body.contains(video)) return stop();
        if (video.readyState < 2) return setTimeout(tick, 120);
        if (det) {
          det.detect(video).then(function (codes) {
            var cx = video.videoWidth / 2, cy = video.videoHeight / 2;
            codes.sort(function (a, b) {   // several badges in view: the one nearest the middle wins
              var A = a.boundingBox, B = b.boundingBox;
              return Math.hypot(A.x + A.width / 2 - cx, A.y + A.height / 2 - cy) - Math.hypot(B.x + B.width / 2 - cx, B.y + B.height / 2 - cy);
            });
            if (!codes.length || !found(codes[0].rawValue)) setTimeout(tick, 60);
          }).catch(function () { det = null; setTimeout(tick, 60); });
          return;
        }
        frame++;
        var text = null, R = boxRegion();
        try {
          var side = Math.min(900, R.s); canvas.width = canvas.height = Math.round(side);
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, R.x, R.y, R.s, R.s, 0, 0, canvas.width, canvas.height);
          text = QRScan.decodeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), { thorough: frame % 4 === 0, budgetMs: 120 });
        } catch (e) { text = null; }
        if (!(text && found(text))) setTimeout(tick, 70);
      };
      tick();
    }).catch(function () {   // permission refused or camera busy: offer the photo route in one tap
      msg.innerHTML = '<span class="fallback-note">' + esc(t('scan_fallback')) + '</span><label class="btn green fallback-btn" for="photo">' + icon('photo', 22) + esc(t('scan_photo')) + '</label>';
    });
  }
  function scanPhoto(file) {
    var msg = document.getElementById('scanmsg');
    if (!file) return;
    if (liveStop) liveStop();
    msg.textContent = t('scan_reading');
    var img = new Image(), url = URL.createObjectURL(file), show = isPhone(), t0 = Date.now();
    var box = document.getElementById('scanner'), shot = document.getElementById('shot'), done = false;
    if (lastShot) { try { URL.revokeObjectURL(lastShot); } catch (e) {} } lastShot = url;   // the previous photo, if retaken
    var close = function () { done = true; box.hidden = true; box.classList.remove('photo', 'ok', 'bad'); shot.removeAttribute('src'); shot.hidden = true; URL.revokeObjectURL(url); lastShot = null; };
    img.onload = function () {
      if (show) {   // phones: the photo just taken, with the same moving scan line while it is read
        box.classList.remove('ok', 'bad'); box.classList.add('photo');
        document.getElementById('cam').hidden = true; ['torch', 'zoomwrap'].forEach(function (id) { document.getElementById(id).hidden = true; });
        document.getElementById('scantip').textContent = t('scan_reading');
        shot.src = url; shot.hidden = false; box.hidden = false;
        document.getElementById('scanclose').onclick = close;
        box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      var canvas = document.createElement('canvas'), text = null, W = img.naturalWidth, H = img.naturalHeight;
      var crop = function (f, side) {   // middle part of the photo, f = share of the shorter side
        var s = Math.min(W, H) * f, k = Math.min(1, side / s);
        canvas.width = canvas.height = Math.round(s * k);
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, (W - s) / 2, (H - s) / 2, s, s, 0, 0, canvas.width, canvas.height);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      var tries = [function () { return crop(0.5, 1100); }, function () { return crop(0.8, 1400); },
        function () { return frameData(img, W, H, 1600, canvas); }, function () { return frameData(img, W, H, 2400, canvas); }];
      var finish = function () {
        if (done) return;
        if (!show) { URL.revokeObjectURL(url); lastShot = null; if (!text) { msg.textContent = t('scan_none'); return; } openScanned(text, msg); return; }
        var retake = '<label class="btn green fallback-btn" for="photo">' + icon('photo', 22) + esc(t('scan_retake')) + '</label>';
        if (text && badgePath(text)) {
          box.classList.add('ok'); msg.textContent = t('scan_ok'); document.getElementById('scantip').textContent = t('scan_ok');
          scanFeedback(photoAC);
          setTimeout(function () { if (!done) openScanned(text, msg, close); }, 520);
          return;
        }
        box.classList.add('bad');
        var why = text ? t('scan_not_badge') : t('scan_none');
        document.getElementById('scantip').textContent = text ? t('scan_not_badge_short') : t('scan_none_short');
        msg.innerHTML = '<span class="fallback-note">' + esc(why) + '</span>' + retake;
      };
      var i = 0;
      var step = function () {   // one try at a time, so the screen can draw the line between tries
        if (done) return;
        if (i < tries.length && !text) {
          try { text = QRScan.decodeImageData(tries[i](), { budgetMs: 1500 }); } catch (e) { text = null; }
          i++; return setTimeout(step, 16);
        }
        setTimeout(finish, show ? Math.max(0, 850 - (Date.now() - t0)) : 0);   // let the line be seen for a moment
      };
      setTimeout(step, show ? 120 : 0);   // first let the photo and the line appear
    };
    img.onerror = function () { URL.revokeObjectURL(url); msg.textContent = t('scan_none'); };
    img.src = url;
  }


  function cardScreen(token) {
    loading();
    var fromCache = function () {
      var c = store('db_card_' + token);
      if (c) { S.badge = token; S.card = JSON.parse(c); renderCard(S.card, false); main.insertAdjacentHTML('afterbegin', '<p class="note">' + esc(t('error_net')) + '</p>'); }
      else netFail(function () { cardScreen(token); });
    };
    api('/api/b/' + encodeURIComponent(token)).then(function (r) {
      // no signal is not the same as a fake badge: never show "do not use" just because the phone is offline
      if (r.offline || !r.data || r.data.detail === 'offline' || (!r.ok && r.data && !r.data.detail)) return fromCache();
      if (r.ok) { S.badge = token; store('db_badge', token); }
      if (!r.ok) { S.fake = token; view('<div class="result r-bad"><p class="big">' + esc(t('error_badge')) + '</p></div><a class="btn ghost" href="#/find" style="margin-top:14px">' + esc(t('go_find')) + '</a>' +
        '<p style="text-align:center;margin-top:14px"><a class="textlink" href="#/report-fake">' + esc(t('report_fake')) + '</a></p>'); return; }
      S.fake = null;
      S.card = r.data; store('db_card_' + token, JSON.stringify(r.data)); renderCard(r.data, true);
    }).catch(fromCache);
  }

  function renderCard(c, fresh) {
    var p = c.provider, days = c.last_checked ? Math.max(0, Math.round((Date.now() - Date.parse(c.last_checked.at)) / 864e5)) : null;
    var seen = store('db_promise') === '1';
    var promise = seen ? '' : '<section class="promise" aria-labelledby="pt"><h2 id="pt" style="margin-top:0">' + esc(t('promise_title')) + '</h2><ul>' +
      ['promise_1', 'promise_2', 'promise_3', 'promise_4'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') +
      '</ul><button class="btn green" id="pok">' + esc(t('promise_ok')) + '</button></section>';
    var prices = c.prices.map(function (x) { return '<div class="row"><span>' + esc(x.item) + '</span><strong>₹' + esc(digits(x.amount_inr)) + '</strong></div>'; }).join('');
    var html = promise + '<article class="card" aria-label="' + esc(p.name) + '">' +
      '<div class="pad" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span id="status">' + chip(c.status) + '</span>' + (p.sample ? '<span class="sample">' + esc(t('sample_data')) + '</span>' : '') + '</div>' +
      '<div class="pad who" style="padding-top:0"><div class="avatar" role="img" aria-label="photo"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3E5F8A" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></div>' +
      '<div><div class="name">' + esc(p.name) + '</div><div class="muted">' + esc(t(p.kind)) + ' · ' + esc(p.site) + '</div>' +
      (p.registration_seen ? '<div style="color:var(--green);font-weight:600;font-size:.9em">' + esc(t('reg_seen')) + ' · ' + esc(p.registration_seen) + '</div>' : '') + '</div></div>' +
      (c.status === 'inactive' ? '<p class="note warn">' + esc(t('inactive_warn')) + '</p>' : '<p class="note">' + esc(t('match')) + '</p>') +
      (c.suspicious_scan ? '<p class="note warn">' + esc(t('suspicious_warn')) + '</p>' : '') +
      (c.safety_note ? '<p class="note warn">' + esc(t('boat_note')) + '</p>' : '') +
      (prices ? '<div class="row" style="border-top:0"><strong>' + esc(t('fares')) + '</strong><span class="small" style="color:var(--green)">' + esc(t('full_price')) + '</span></div>' + prices : '') +
      '<div class="split"><div><div class="muted small">' + esc(t('rating')) + '</div><div class="big">' + (c.rating.avg ? esc(digits(c.rating.avg)) + ' ★' : '–') + '</div><div class="muted small">' +
      esc(c.rating.count ? t('ratings_n', { n: digits(c.rating.count) }) : t('no_ratings')) + '</div></div>' +
      '<div><div class="muted small">' + esc(t('last_checked')) + '</div><div class="big">' + (days == null ? esc(t('never_checked')) : esc(t('days_ago', { n: digits(days) }))) + '</div>' +
      (c.last_checked ? '<div class="muted small">' + esc(t('by', { name: c.last_checked.by })) + '</div>' : '') + '</div></div></article>' +
      (c.status === 'inactive' ? '<a class="btn ghost" style="margin-top:14px" href="#/find">' + esc(t('go_find')) + '</a>' :
        '<div class="grid3"><a class="btn green" href="#/talk">' + esc(t('talk')) + '</a><a class="btn red" href="#/help">' + esc(t('help')) + '</a><a class="btn ghost" href="#/rate">' + esc(t('rate')) + '</a></div>') +
      (c.status === 'inactive' ? '' : '<a class="btn wa-btn" href="' + esc(waLink(S.badge)) + '"' + (CONFIG.waNumber ? ' target="_blank" rel="noopener"' : '') + '>' + WA_ICON + esc(t('wa_open')) + '</a>') +
      '<p class="muted small" style="text-align:center">' + esc(t('no_otp')) + '<br>' + esc(t('verified_means')) + '</p>' +
      '<p style="text-align:center"><a class="textlink" href="#/report-fake">' + esc(t('report_fake')) + '</a></p>';
    view(html);
    var ok = document.getElementById('pok'); if (ok) ok.addEventListener('click', function () { store('db_promise', '1'); renderCard(c, false); });
    if (fresh && c.status !== 'inactive') { document.getElementById('status').firstChild.classList.add('glow'); bell(); }
  }

  function talk() {
    var src = S.lang === 'bn' ? 'hi' : S.lang;
    view('<h1>' + esc(t('talk_title')) + '</h1><p class="muted">' + esc(t('talk_sub')) + '</p><div id="said"></div><div class="list">' +
      PHRASES.map(function (p, i) { return '<button class="item" data-i="' + i + '" style="text-align:left;cursor:pointer;font-weight:600">' + esc(p[src]) + '</button>'; }).join('') +
      '</div><p class="muted small" style="margin-top:12px">' + esc(t('mvp_note')) + '</p>' +
      (CONFIG.interpreterPhone ? '<a class="btn ghost" href="tel:' + esc(CONFIG.interpreterPhone) + '">' + esc(t('interp')) + '</a>' : '<button class="btn ghost" disabled aria-describedby="interp-note">' + esc(t('interp')) + '</button><p class="muted small" id="interp-note" style="text-align:center;margin-top:6px">' + esc(t('interp_soon')) + '</p>'));
    main.querySelectorAll('[data-i]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = PHRASES[+b.getAttribute('data-i')];
        document.getElementById('said').innerHTML = '<div class="bubble me">' + esc(p[src]) + '</div><div class="bubble them"><div class="bn-big" lang="bn">' + esc(p.bn) + '</div></div>';
        try { var u = new SpeechSynthesisUtterance(p.bn); u.lang = 'bn-IN'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* speech optional */ }
      });
    });
  }

  function help() {
    loading();
    var site = (S.card && S.card.provider && S.card.provider.site_id) || CONFIG.site;
    Promise.all([api('/api/help?site=' + site), api('/api/providers?site=' + site + '&women_run=1&kind=homestay')]).then(function (rs) {
      var h = (rs[0].ok && rs[0].data) || { places: [] }, w = (rs[1].ok && Array.isArray(rs[1].data)) ? rs[1].data : [];
      var off = !rs[0].ok;
      view('<h1>' + esc(t('help_title')) + '</h1><a class="btn red" href="tel:112" style="font-size:1.15em">' + esc(t('help_112')) + '</a>' +
        (off ? '<p class="note warn" style="margin:12px 0 0">' + esc(t('net_body')) + '</p>' : '') + '<div class="list" style="margin-top:12px">' +
        h.places.map(function (p) {
          return '<a class="item" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=' + p.lat + '&mlon=' + p.lon + '#map=17/' + p.lat + '/' + p.lon + '"><span><span class="muted small">' + esc(t('k_' + p.kind)) + '</span><br><strong>' + esc(p.name) + '</strong></span><span class="small">' + esc(t('open_map')) + '</span></a>';
        }).join('') + '</div>' +
        '<section class="card" style="margin-top:16px;background:#FBE9F0;border-color:#F0C7D7"><div class="pad"><h2 style="margin-top:0;color:#8A1F4D">' + esc(t('sakhi')) + '</h2><p>' + esc(t('sakhi_sub')) + '</p>' +
        '<button class="btn" style="background:#8A1F4D;color:#fff;width:100%" id="share">' + esc(t('sakhi_share')) + '</button>' +
        '<h2>' + esc(t('women_stays')) + '</h2><div class="list">' + w.map(provRow).join('') + '</div></div></section>' +
        '<p class="muted small" style="margin-top:10px">' + esc(t('sample_data')) + '</p>');
      document.getElementById('share').addEventListener('click', function () {
        var c = S.card, text = 'DevBhumi · ' + (c ? c.provider.name + ' (' + c.badge + ')' : '') + ' · ' + new Date().toLocaleString() + ' · ' + location.origin + location.pathname;
        if (navigator.share) navigator.share({ text: text }).catch(function () {}); else location.href = 'sms:?body=' + encodeURIComponent(text);
      });
    });
  }

  function provRow(p) {
    return '<a class="item" href="/b/' + esc(p.badge_token) + '" data-link><span><strong>' + esc(p.name) + '</strong><br><span class="muted small">' + esc(t(p.kind)) + (p.sample ? ' · ' + esc(t('sample_data')) : '') + '</span></span>' + chip(p.status) + '</a>';
  }

  function find() {
    var f = S.filters, q = '/api/providers?site=' + CONFIG.site + (f.kind ? '&kind=' + f.kind : '') + (f.women_run ? '&women_run=1' : '') + (f.elder ? '&elder=1' : '') + (f.wheelchair ? '&wheelchair=1' : '');
    loading();
    api(q).then(function (r) {
      if (!r.ok || !Array.isArray(r.data)) return netFail(find);
      var kinds = ['', 'toto', 'boat', 'homestay', 'stall'];
      view('<h1>' + esc(t('find_title')) + '</h1><div class="filters" role="group">' +
        kinds.map(function (k) { return '<button class="toggle" data-kind="' + k + '" aria-pressed="' + (f.kind === k) + '">' + esc(t(k || 'all')) + '</button>'; }).join('') + '</div>' +
        '<div class="filters" role="group">' + [['women_run', 'find_women'], ['elder', 'find_elder'], ['wheelchair', 'find_wheel']].map(function (x) {
          return '<button class="toggle" data-flag="' + x[0] + '" aria-pressed="' + f[x[0]] + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>' +
        '<div class="list">' + r.data.map(provRow).join('') + '</div>');
      main.querySelectorAll('[data-kind]').forEach(function (b) { b.addEventListener('click', function () { f.kind = b.getAttribute('data-kind'); find(); }); });
      main.querySelectorAll('[data-flag]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-flag'); f[k] = !f[k]; find(); }); });
    });
  }

  function fmtHours(h) {
    var m = /^(\d{1,2})\s*am\s*[–-]\s*(\d{1,2})\s*pm(\s*\(confirm\))?$/i.exec(String(h || '').trim());
    if (!m) return h;
    var a = +m[1], b = +m[2], c = m[3] ? ' (' + t('hours_confirm') + ')' : '';
    if (S.lang === 'bn') return 'সকাল ' + digits(a) + 'টা – ' + (b <= 7 ? 'সন্ধ্যা ' : 'রাত ') + digits(b) + 'টা' + c;
    if (S.lang === 'hi') return 'सुबह ' + a + ' – ' + (b <= 7 ? 'शाम ' : 'रात ') + b + ' बजे' + c;
    return a + ' am – ' + b + ' pm' + c;
  }
  function plan() {
    loading();
    api('/api/plan?site=' + CONFIG.site).then(function (r) {
      if (!r.ok || !r.data || !r.data.timings) return netFail(plan);
      var d = r.data;
      view('<h1>' + esc(t('plan_title')) + '</h1><h2>' + esc(t('plan_timings')) + '</h2><div class="list">' +
        d.timings.map(function (x) { return '<div class="item"><strong>' + esc(x.name) + '</strong><span class="small">' + esc(fmtHours(x.hours)) + '</span></div>'; }).join('') +
        '</div><h2>' + esc(t('plan_comfort')) + '</h2><div class="bars" role="img" aria-label="' + esc(t('plan_comfort')) + '">' +
        d.comfort.map(function (c) { return '<div class="lv-' + esc(c.level) + '" title="' + esc(c.day + ': ' + t('lv_' + c.level)) + '"></div>'; }).join('') + '</div>' +
        '<div class="bars" style="height:auto;align-items:start">' + d.comfort.map(function (c) { return '<div class="small muted" style="text-align:center">' + esc(digits(c.day.slice(8))) + '</div>'; }).join('') + '</div>' +
        '<div class="legend"><span><i class="sw lv-comfortable"></i>' + esc(t('lv_comfortable')) + '</span><span><i class="sw lv-busy"></i>' + esc(t('lv_busy')) + '</span><span><i class="sw lv-very_busy"></i>' + esc(t('lv_very_busy')) + '</span></div>' +
        '<p class="muted small" style="margin-top:12px">' + esc(t('not_confirmed')) + ' · ' + esc(t('sample_data')) + '</p>');
    });
  }

  function verify() {
    view('<h1>' + esc(t('verify_title')) + '</h1><p class="muted">' + esc(t('verify_sub')) + '</p><form id="vf"><label for="vq">' + esc(t('verify_label')) + '</label>' +
      '<input id="vq" type="text" autocomplete="off" autocapitalize="off" placeholder="' + esc(t('verify_placeholder')) + '"><button class="btn green" style="width:100%;margin-top:12px">' + esc(t('verify_btn')) + '</button></form><div id="vr" aria-live="polite"></div>' +
      '<p class="muted small" style="margin-top:14px">' + esc(t('no_otp')) + '</p>');
    document.getElementById('vf').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = document.getElementById('vq').value.trim(), out = document.getElementById('vr');
      if (q.length < 3) { out.innerHTML = '<p class="note warn" style="margin:12px 0 0">' + esc(t('verify_empty')) + '</p>'; document.getElementById('vq').focus(); return; }
      out.innerHTML = '<p class="spinner">' + esc(t('loading')) + '</p>';
      api('/api/verify-pay', { method: 'POST', body: { query: q } }).then(function (r) {
        if (!r.ok) { out.innerHTML = '<p class="note warn" style="margin:12px 0 0">' + esc(t(r.offline || !r.data || r.data.detail === 'offline' ? 'send_failed' : 'verify_empty')) + '</p>'; return; }
        var d = r.data, map = { official: ['r-ok', 'r_official', 'r_official_b', d.label], verified_provider: ['r-ok', 'r_match', 'r_match_b', d.provider], not_official: ['r-bad', 'r_not_official', 'r_not_official_b'], not_confirmed: ['r-unknown', 'r_unknown', 'r_unknown_b'] };
        if (d.result === 'badge') {   // a badge code typed by hand: show whose badge it is, and open the card
          var ok = d.status !== 'needs_recheck';
          out.innerHTML = '<div class="result ' + (ok ? 'r-ok' : 'r-unknown') + '"><p class="big">' + esc(t('r_badge', { code: d.code })) + '</p><p style="margin:0 0 12px">' +
            esc(t(ok ? 'r_badge_b' : 'r_badge_recheck', { name: d.provider })) + '</p><a class="btn green" href="/b/' + esc(d.badge_token) + '" data-link>' + esc(t('r_badge_open')) + '</a></div>' +
            '<p class="muted small" style="margin-top:10px">' + esc(t('r_badge_tip')) + '</p>';
          return;
        }
        if (d.result === 'badge_unknown' || d.result === 'badge_revoked') {
          out.innerHTML = '<div class="result r-bad"><p class="big">' + esc(t(d.result === 'badge_unknown' ? 'r_badge_unknown' : 'r_badge_revoked', { code: d.code })) + '</p><p style="margin:0">' + esc(t('r_badge_bad_b')) + '</p></div>' +
            '<a class="btn ghost" href="#/report-fake" style="margin-top:12px">' + esc(t('report_fake')) + '</a>';
          return;
        }
        var m = map[d.result]; if (!m) return;
        document.getElementById('vr').innerHTML = '<div class="result ' + m[0] + '"><p class="big">' + esc(t(m[1])) + '</p><p style="margin:0">' + esc(t(m[2], { name: m[3] || '' })) + '</p></div>';
      });
    });
  }

  function needBadge(titleKey) {
    view('<h1>' + esc(t(titleKey)) + '</h1><div class="result r-unknown"><p class="big">' + esc(t('need_badge')) + '</p><p style="margin:0">' + esc(t('need_badge_b')) + '</p></div>' +
      '<div class="stack" style="margin-top:14px"><a class="btn primary" href="#/">' + esc(t('scan_camera')) + '</a><a class="btn ghost" href="#/find">' + esc(t('go_find')) + '</a></div>');
  }
  function rate() {
    if (!S.badge) return needBadge('rate_title');
    var tagKeys = ['fair_price', 'polite', 'safe_driving', 'helpful'];
    view('<h1>' + esc(t('rate_title')) + '</h1><div class="stars" role="group">' + [1, 2, 3, 4, 5].map(function (k) {
      return '<button data-s="' + k + '" aria-label="' + k + ' ★" aria-pressed="' + (k <= S.rating) + '">★</button>'; }).join('') + '</div>' +
      '<div class="filters" style="justify-content:center">' + tagKeys.map(function (k) { return '<button class="toggle" data-t="' + k + '" aria-pressed="' + !!S.tags[k] + '">' + esc(t('tag_' + k)) + '</button>'; }).join('') + '</div>' +
      '<button class="btn primary" id="send" style="width:100%" ' + (S.rating ? '' : 'disabled') + '>' + esc(t('submit')) + '</button>' +
      '<p style="text-align:center;margin-top:14px"><a href="#/complain">' + esc(t('complain_link')) + '</a></p>');
    main.querySelectorAll('[data-s]').forEach(function (b) { b.addEventListener('click', function () { S.rating = +b.getAttribute('data-s'); rate(); }); });
    main.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-t'); S.tags[k] = !S.tags[k]; rate(); }); });
    document.getElementById('send').addEventListener('click', function () {
      api('/api/ratings', { method: 'POST', body: { badge: S.badge, stars: S.rating, tags: Object.keys(S.tags).filter(function (k) { return S.tags[k]; }) } }).then(function (r) {
        if (!r.ok) return sendFail(main);
        S.rating = 0; S.tags = {};
        view('<div style="text-align:center;padding-top:30px"><h1>' + esc(t('thanks')) + '</h1><p class="muted">' + esc(t('thanks_sub')) + '</p><a class="btn ghost" href="#/">' + esc(t('nav_home')) + '</a></div>');
      });
    });
  }

  function complain(cat) {
    if (!S.badge) return needBadge('complain_title');
    var cats = ['overcharge', 'rude', 'unsafe', 'fake_badge', 'other'];
    view('<h1>' + esc(t('complain_title')) + '</h1><form id="cf"><label for="cc">' + esc(t('complain_title')) + '</label><select id="cc">' +
      cats.map(function (c) { return '<option value="' + c + '"' + (c === cat ? ' selected' : '') + '>' + esc(t('cat_' + c)) + '</option>'; }).join('') + '</select>' +
      '<label for="ct">' + esc(t('details')) + '</label><textarea id="ct" rows="3" maxlength="1000"></textarea>' +
      '<button class="btn primary" style="width:100%;margin-top:12px">' + esc(t('send')) + '</button></form>');
    document.getElementById('cf').addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/complaints', { method: 'POST', body: { badge: S.badge, category: document.getElementById('cc').value, text: document.getElementById('ct').value } }).then(function (r) {
        if (!r.ok) return sendFail(document.getElementById('cf'));
        store('db_complaint', String(r.data.complaint_id));
        location.hash = '#/complaint/' + r.data.complaint_id;
      });
    });
  }

  function complaintStatus(id) {
    loading();
    api('/api/complaints/' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) return view('<p>' + esc(t('error_badge')) + '</p>');
      var d = r.data, due = new Date(d.due_at).toLocaleString(S.lang === 'en' ? 'en-IN' : S.lang + '-IN', { dateStyle: 'medium', timeStyle: 'short' });
      view('<div class="result r-ok"><p class="big">' + esc(t('complaint_sent', { id: digits(d.id) })) + '</p><p style="margin:0">' + esc(t('due', { time: due })) + '</p></div>' +
        '<h2>' + esc(t('track')) + '</h2><p class="big">' + esc(t('cstatus_' + d.status)) + '</p>' + (d.overdue ? '<p class="note warn" style="margin:0">' + esc(t('overdue')) + '</p>' : ''));
    });
  }

  function settings() {
    var large = store('db_large') === '1', con = store('db_contrast') === '1';
    var sw = function (id, on, key) { return '<button class="switch-row" id="' + id + '" role="switch" aria-checked="' + on + '"><span>' + esc(t(key)) + '</span><span class="switch" aria-hidden="true"><i></i></span></button>'; };
    view('<h1>' + esc(t('settings_title')) + '</h1>' +
      '<h2>' + esc(t('set_language')) + '</h2><div class="seg" role="group" aria-label="' + esc(t('set_language')) + '">' +
      [['bn', 'বাংলা'], ['hi', 'हिंदी'], ['en', 'English']].map(function (l) { return '<button data-setlang="' + l[0] + '" lang="' + l[0] + '" aria-pressed="' + (S.lang === l[0]) + '">' + l[1] + '</button>'; }).join('') + '</div>' +
      '<h2>' + esc(t('set_display')) + '</h2><div class="list">' + sw('lg', large, 'large_text') + sw('hc', con, 'high_contrast') + '</div>' +
      '<h2>' + esc(t('set_about')) + '</h2><div class="card"><div class="pad"><strong>DevBhumi · Bharosa QR</strong> <span class="sample">v0.17</span>' +
      '<p class="muted small" style="margin:8px 0 0">' + esc(t('about_sample')) + '</p></div></div>');
    document.getElementById('lg').addEventListener('click', function () { store('db_large', large ? '0' : '1'); applyPrefs(); settings(); });
    document.getElementById('hc').addEventListener('click', function () { store('db_contrast', con ? '0' : '1'); applyPrefs(); settings(); });
    main.querySelectorAll('[data-setlang]').forEach(function (b) { b.addEventListener('click', function () { S.lang = b.getAttribute('data-setlang'); store('db_lang', S.lang); applyPrefs(); settings(); }); });
  }

  // ======================= v0.3: WhatsApp, Official links, fake report, Pathik Mitra, Seva Ledger =======================
  var WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
  S.chat = [];
  function waLink(token) {
    return CONFIG.waNumber ? 'https://wa.me/' + encodeURIComponent(CONFIG.waNumber) + '?text=' + encodeURIComponent('Bharosa ' + token) : '#/wa?start=' + encodeURIComponent(token);
  }
  function waFormat(text) {
    var h = esc(text).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      return u.indexOf(location.origin + '/') === 0 ? '<a href="' + u.slice(location.origin.length) + '">' + u + '</a>' : '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
    return h.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,]|$)/gm, '$1<em>$2</em>').replace(/\n/g, '<br>');
  }
  function waTime() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function waSender() { var id = store('db_wa_id'); if (!id) { id = 'w' + Math.random().toString(36).slice(2, 12); store('db_wa_id', id); } return id; }
  function waSend(text, kind) {
    S.chat.push({ me: true, text: kind === 'audio' ? '🎙 0:04' : text, time: waTime() }, { typing: true });
    renderChat();
    api('/api/wa/simulate', { method: 'POST', body: { from: waSender(), text: text, kind: kind || 'text' } }).then(function (r) {
      S.chat = S.chat.filter(function (m) { return !m.typing; });
      (r.ok ? r.data.replies : [{ text: t('error_net'), buttons: [] }]).forEach(function (x) { S.chat.push({ me: false, text: x.text, buttons: x.buttons, time: waTime() }); });
      renderChat();
    }).catch(function () { S.chat = S.chat.filter(function (m) { return !m.typing; }); S.chat.push({ me: false, text: t('error_net'), time: waTime() }); renderChat(); });
  }
  function renderChat() {
    var log = document.getElementById('log'); if (!log) return;
    log.innerHTML = S.chat.map(function (m, i) {
      if (m.typing) return '<div class="wa-msg them typing" aria-label="…"><span></span><span></span><span></span></div>';
      var btns = (m.buttons || []).length && i === S.chat.length - 1 ? '<div class="wa-btns">' + m.buttons.map(function (b) {
        return '<button type="button" class="wa-qr" data-say="' + esc(b.id) + '">' + esc(b.title) + '</button>'; }).join('') + '</div>' : '';
      return '<div class="wa-msg ' + (m.me ? 'me' : 'them') + '"><div>' + waFormat(m.text) + '</div><span class="wa-time">' + m.time + (m.me ? ' ✓✓' : '') + '</span></div>' + btns;
    }).join('');
    log.scrollTop = log.scrollHeight;
    log.querySelectorAll('[data-say]').forEach(function (b) { b.addEventListener('click', function () { waSend(b.getAttribute('data-say')); }); });
  }
  function waScreen(start) {
    var chips = ['MENU', '1', '2', '3', '4', '5', 'BDN-0108', 'https://mayapur-rooms-cheap.xyz/offer', 'bhola.das@upi', 'SAKHI', 'BANGLA'];
    view('<section class="wa" aria-label="WhatsApp"><div class="wa-head"><a class="wa-back" href="#/" aria-label="' + esc(t('nav_home')) + '">‹</a><div class="wa-av" aria-hidden="true">ॐ</div>' +
      '<div class="wa-who"><strong>' + esc(t('wa_name')) + ' <span class="wa-tick">✓</span></strong><span>' + esc(t('wa_sub')) + '</span></div>' +
      '<button type="button" class="wa-reset" id="wareset" aria-label="' + esc(t('wa_reset')) + '">↻</button></div><div class="wa-log" id="log" aria-live="polite"></div>' +
      '<div class="wa-chips" role="group" aria-label="' + esc(t('wa_try')) + '">' + chips.map(function (c) { return '<button type="button" class="wa-chip" data-chip="' + esc(c) + '">' + esc(c.replace('https://', '')) + '</button>'; }).join('') + '</div>' +
      '<form class="wa-in" id="waf"><button type="button" class="wa-mic" id="wamic" aria-label="' + esc(t('wa_voice')) + '">🎙</button><input id="wat" type="text" autocomplete="off" placeholder="' + esc(t('wa_type')) + '" aria-label="' + esc(t('wa_type')) + '"><button class="wa-send" aria-label="' + esc(t('wa_send')) + '">➤</button></form></section>' +
      '<p class="muted small" style="margin-top:10px">' + esc(t(CONFIG.waNumber ? 'wa_note_live' : 'wa_note_mvp')) + '</p>');
    document.getElementById('waf').addEventListener('submit', function (e) { e.preventDefault(); var i = document.getElementById('wat'); if (i.value.trim()) { waSend(i.value); i.value = ''; } });
    document.getElementById('wamic').addEventListener('click', function () { waSend('', 'audio'); });
    document.getElementById('wareset').addEventListener('click', function () { S.chat = []; try { localStorage.removeItem('db_wa_id'); } catch (e) { /* ignore */ } waScreen(); });
    main.querySelectorAll('[data-chip]').forEach(function (b) { b.addEventListener('click', function () { waSend(b.getAttribute('data-chip')); }); });
    renderChat();
    if (start) waSend('Bharosa ' + start);
    else if (!S.chat.length) waSend({ hi: 'नमस्ते', bn: 'নমস্কার', en: 'Namaste' }[S.lang]);
  }

  function official() {
    loading();
    api('/api/official').then(function (r) {
      if (!r.ok) return netFail(official);
      view('<h1>' + esc(t('official_title')) + '</h1><section class="official"><p class="big" style="margin-top:0">' + esc(t('official_sub')) + '</p><ul class="olist">' +
        (r.data || []).map(function (o) { return '<li><a class="odomain" href="https://' + esc(o.domain) + '" target="_blank" rel="noopener">' + esc(o.domain) + '</a><span class="muted small">' + esc(o.label) + '</span></li>'; }).join('') + '</ul>' +
        '<p class="note warn" style="margin:12px 0 0">' + esc(t('official_never')) + '</p><p class="muted small" style="margin:10px 0 0">' + esc(t('official_portal')) + '</p>' +
        '<p class="muted small" style="margin:6px 0 0">' + esc(t('no_otp')) + ' ' + esc(t('disclaimer')) + '</p></section>' +
        '<div class="stack noprint" style="margin-top:14px"><button class="btn green" id="oprint">' + esc(t('official_print')) + '</button><a class="btn ghost" href="#/verify">' + esc(t('official_check')) + '</a></div>');
      document.getElementById('oprint').addEventListener('click', function () { window.print(); });
    }).catch(function () { view('<p class="note">' + esc(t('error_net')) + '</p>'); });
  }

  function reportFake() {
    var code = S.fake || S.badge || '';
    view('<h1>' + esc(t('report_title')) + '</h1><form id="rf"><label for="rc">' + esc(t('report_code')) + '</label><input id="rc" type="text" value="' + esc(code) + '" autocomplete="off">' +
      '<label for="rt">' + esc(t('report_where')) + '</label><textarea id="rt" rows="3" maxlength="1000"></textarea>' +
      '<button class="btn primary" style="width:100%;margin-top:12px">' + esc(t('report_btn')) + '</button></form><div id="rres" aria-live="polite"></div>');
    document.getElementById('rf').addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/fake-reports', { method: 'POST', body: { code_seen: document.getElementById('rc').value, text: document.getElementById('rt').value } }).then(function (r) {
        if (!r.ok) return sendFail(document.getElementById('rf'));
        S.fake = null; document.getElementById('rf').remove();
        document.getElementById('rres').innerHTML = '<div class="result r-ok"><p class="big" style="margin:0">' + esc(t('report_sent', { id: digits(r.data.report_id) })) + '</p></div><a class="btn ghost" href="#/find" style="margin-top:14px">' + esc(t('go_find')) + '</a>';
      });
    });
  }

  // ---------- Pathik Mitra: sign in with the issued token, offline-first checks, sync, link badge
  function mitraApi(path, opts) {
    opts = opts || {};
    return fetch(path, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (store('db_mitra_token') || '') },
      body: opts.body ? JSON.stringify(opts.body) : undefined }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); });
  }
  function outbox(v) { if (v !== undefined) store('db_outbox', JSON.stringify(v)); try { return JSON.parse(store('db_outbox') || '[]'); } catch (e) { return []; } }
  function mitraLogin(err) {
    view('<h1>' + esc(t('mitra_title')) + '</h1><p class="muted">' + esc(t('mitra_note')) + '</p><form id="ml"><label for="mt">' + esc(t('mitra_token')) + '</label>' +
      '<input id="mt" type="text" autocomplete="off" spellcheck="false"><p class="muted small">' + esc(t(CONFIG.demoHints ? 'mitra_token_hint' : 'mitra_token_hint_live')) + '</p>' + (err ? '<p class="note warn" style="margin:0 0 10px">' + esc(t(err === 'busy' ? 'too_many' : 'mitra_bad_token')) + '</p>' : '') +
      '<button class="btn green" style="width:100%">' + esc(t('mitra_signin')) + '</button></form>');
    document.getElementById('ml').addEventListener('submit', function (e) { e.preventDefault(); store('db_mitra_token', document.getElementById('mt').value.trim()); mitra(); });
  }
  function mitra() {
    if (!store('db_mitra_token')) return mitraLogin(false);
    loading();
    mitraApi('/api/mitra/queue').then(function (r) {
      if (r.status === 401 || r.status === 429) { store('db_mitra_token', ''); return mitraLogin(r.status === 429 ? 'busy' : true); }
      S.mq = r.data; store('db_mq', JSON.stringify(r.data)); drawQueue(false);
    }).catch(function () { try { S.mq = JSON.parse(store('db_mq') || '[]'); } catch (e) { S.mq = []; } drawQueue(true); });
  }
  function drawQueue(offline) {
    var ob = outbox(), waiting = ob.map(function (x) { return x.provider_id; });
    var reason = function (x) { return x.reason === 'far_scan' ? t('reason_far_scan_n', { n: digits(x.far_scans_7d || 1) }) : x.reason === 'recheck' ? t('reason_recheck', { n: digits(x.days_since_check) }) : t('reason_new_mvp'); };
    view('<div class="mitra-top"><p class="eyebrow">' + esc(t('mitra_title')) + '</p><h1 style="margin:0">' + esc(t('mitra_queue')) + '</h1></div>' +
      (offline ? '<p class="note" style="margin:0 0 10px">' + esc(t('error_net')) + '</p>' : '') +
      (ob.length ? '<div class="outbox"><span>' + esc(t('mitra_outbox', { n: digits(ob.length) })) + '</span><button class="btn green small-btn" id="sync">' + esc(t('mitra_sync')) + '</button></div>' : '') +
      '<div class="list" style="margin-top:10px">' + (S.mq.length ? S.mq.map(function (x) {
        return '<a class="item mitem" href="#/mitra/' + x.provider_id + '"><span><strong>' + esc(x.name) + '</strong><br><span class="muted small">' + esc(t(x.kind)) + '</span><br><span class="reason r-' + x.reason + '">' + esc(reason(x)) + '</span>' +
          (waiting.indexOf(x.provider_id) >= 0 ? '<br><span class="small" style="color:var(--green)">⏳ ' + esc(t('res_saved_offline')) + '</span>' : '') + '</span><span aria-hidden="true">›</span></a>';
      }).join('') : '<p class="muted">' + esc(t('mitra_empty')) + '</p>') + '</div>' +
      '<p class="muted small" style="margin-top:14px">' + esc(t('mitra_note')) + '</p><button class="btn ghost" id="mout" style="margin-top:8px">' + esc(t('mitra_signout')) + '</button>');
    var sb = document.getElementById('sync'); if (sb) sb.addEventListener('click', syncOutbox);
    document.getElementById('mout').addEventListener('click', function () { store('db_mitra_token', ''); mitraLogin(false); });
  }
  function syncOutbox() {
    var ob = outbox(); if (!ob.length) return mitra();
    mitraApi('/api/mitra/verifications', { method: 'POST', body: ob }).then(function (r) {
      if (!r.ok) return mitra();
      outbox([]); S.mres = S.mres || {};
      r.data.forEach(function (res, i) { S.mres[ob[i].provider_id] = res; });
      location.hash = '#/mitra/done/' + ob[0].provider_id;
    }).catch(function () { drawQueue(true); });
  }
  function mitraCheck(pid) {
    var x = (S.mq || []).filter(function (q) { return String(q.provider_id) === String(pid); })[0];
    if (!x) return mitra();
    var items = ['id_seen', 'reg_seen', 'photos', 'price_sheet_signed', 'consent_signed'];
    if (x.kind === 'homestay') items.push('state_portal');
    if (x.reason === 'far_scan') items.unshift('sticker_matches');
    view('<a class="back" href="#/mitra">‹ ' + esc(t('back_queue')) + '</a><h1>' + esc(x.name) + '</h1><p class="muted">' + esc(t(x.kind)) + '</p>' +
      '<h2>' + esc(t('check_title')) + '</h2><p class="muted small">' + esc(t('ck_intro')) + '</p><form id="ckf"><div class="checks">' +
      items.map(function (k) { return '<label class="check"><input type="checkbox" name="' + k + '"><span>' + esc(t('ck_' + k)) + '</span></label>'; }).join('') + '</div>' +
      '<label for="reg4">' + esc(t('ck_reg4')) + '</label><input id="reg4" type="text" maxlength="4" autocomplete="off">' +
      '<h2>' + esc(t('ck_prices')) + '</h2><p class="muted small">' + esc(t('ck_prices_hint')) + '</p>' + [0, 1, 2].map(function (i) {
        return '<div class="price-new"><input id="pi' + i + '" type="text" placeholder="' + esc(t('ck_item')) + '" aria-label="' + esc(t('ck_item')) + '"><span class="rupee">₹</span><input id="pa' + i + '" type="text" inputmode="numeric" aria-label="₹"></div>'; }).join('') +
      '<button class="btn primary" style="width:100%;margin-top:16px">' + esc(t('ck_save')) + '</button></form>');
    document.getElementById('ckf').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, rec = { client_uuid: 'm-' + pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), provider_id: +pid, checked_at: new Date().toISOString().slice(0, 19) + 'Z',
        reg_last4: document.getElementById('reg4').value || null, prices: [] };
      ['id_seen', 'reg_seen', 'photos', 'price_sheet_signed', 'consent_signed'].forEach(function (k) { var el = f.querySelector('[name="' + k + '"]'); rec[k] = !!(el && el.checked); });
      if (x.kind === 'homestay') rec.state_portal = f.querySelector('[name="state_portal"]').checked;
      if (x.reason === 'far_scan') rec.sticker_ok = f.querySelector('[name="sticker_matches"]').checked;
      [0, 1, 2].forEach(function (i) { var it = document.getElementById('pi' + i).value.trim(), a = parseInt(document.getElementById('pa' + i).value, 10);
        if (it && a > 0) { var p = { en: it, amount_inr: a }; p[S.lang] = it; rec.prices.push(p); } });
      var ob = outbox(); ob.push(rec); outbox(ob);   // saved on the phone first, so nothing is lost without signal
      if (!navigator.onLine) { location.hash = '#/mitra'; return; }
      syncOutbox();
    });
  }
  function mitraDone(pid) {
    var r = (S.mres || {})[pid], x = (S.mq || []).filter(function (q) { return String(q.provider_id) === String(pid); })[0];
    if (!r || !x) return mitra();
    var miss = { sticker_ok: 'sticker_matches' };
    var html = '<a class="back" href="#/mitra">‹ ' + esc(t('back_queue')) + '</a><h1>' + esc(x.name) + '</h1>';
    if (r.status === 'already_synced') html += '<div class="result r-ok"><p class="big" style="margin:0">' + esc(t('mitra_synced')) + '</p></div>';
    else if (!r.complete) html += '<div class="result r-unknown"><p class="big">' + esc(t('res_incomplete')) + '</p><ul>' + r.missing.map(function (k) { return '<li>' + esc(t('ck_' + (miss[k] || k))) + '</li>'; }).join('') + '</ul></div>';
    else {
      html += '<div class="result r-ok"><p class="big" style="margin:0">✓ ' + esc(t('res_complete')) + '</p></div>' + (r.audit ? '<p class="note" style="margin:12px 0 0">' + esc(t('res_audit')) + '</p>' : '');
      if (r.needs_badge) html += '<h2>' + esc(t('res_link')) + '</h2><form id="lk"><label for="code">' + esc(t('res_code')) + '</label><input id="code" type="text" placeholder="KLN-0000" autocomplete="off">' +
        '<div id="lkerr" class="small" style="color:var(--red)" aria-live="polite"></div><button class="btn primary" style="width:100%;margin-top:12px">' + esc(t('res_link_btn')) + '</button></form><div id="lkres"></div>';
    }
    view(html + '<a class="btn ghost" href="#/mitra" style="margin-top:12px">' + esc(t('back_queue')) + '</a>');
    var lk = document.getElementById('lk'); if (lk) lk.addEventListener('submit', function (e) {
      e.preventDefault();
      mitraApi('/api/mitra/badges', { method: 'POST', body: { provider_id: +pid, code: document.getElementById('code').value.trim().toUpperCase() } }).then(function (res) {
        if (!res.ok) { document.getElementById('lkerr').textContent = t(res.data.detail === 'code_in_use' ? 'err_code_in_use' : 'err_bad_code'); return; }
        lk.remove();
        document.getElementById('lkres').innerHTML = '<div class="result r-ok"><p class="big" style="margin:0">' + esc(t('res_linked', { code: res.data.badge, name: x.name })) + '</p></div>' +
          '<a class="btn green" style="margin-top:12px" href="/b/' + esc(res.data.url_token) + '">' + esc(t('res_open_card')) + '</a>';
      });
    });
  }

  // ---------- Seva Ledger (public, totals only)
  function ledger() {
    loading();
    api('/api/ledger?site=' + CONFIG.site).then(function (r) {
      if (!r.ok || !r.data) return netFail(ledger);
      var L = r.data, n = function (v) { return esc(digits(Number(v || 0).toLocaleString('en-IN'))); };
      var tile = function (v, k) { return '<div class="tile"><div class="tv">' + v + '</div><div class="tk">' + esc(t(k)) + '</div></div>'; };
      view('<h1>' + esc(t('ledger_title')) + '</h1><p class="muted">' + esc(t('ledger_sub')) + '</p><p class="eyebrow" style="margin-top:14px">' + esc(t('ledger_site')) + '</p>' +
        '<section class="hero-num"><div class="tv">₹' + n(L.provider_confirmed_rupees) + '</div><div class="tk">' + esc(t('l_rupees')) + '</div></section>' +
        '<h2>' + esc(t('ledger_trust')) + '</h2><div class="tiles">' + tile(n(L.verified_providers), 'l_verified') + tile(n(L.trusted_providers), 'l_trusted') + tile(n(L.women_run_providers), 'l_women') + tile(n(L.needs_recheck), 'l_recheck') + '</div>' +
        '<h2>' + esc(t('ledger_use')) + '</h2><div class="tiles">' + tile(n(L.enquiries), 'l_scans') + tile(n(L.in_person_checks), 'l_checks') + tile(n(L.fake_badge_reports), 'l_fake') + '</div>' +
        '<h2>' + esc(t('ledger_fair')) + '</h2><div class="tiles">' + tile(n(L.complaints), 'l_complaints') + tile(n(L.resolved_within_48h), 'l_resolved') + tile(n(L.complaints_open), 'l_open') + '</div>' +
        (L.outcomes && L.outcomes.length ? '<h2>' + esc(t('ledger_outcomes')) + '</h2><div class="list">' + L.outcomes.map(function (o) {
          return '<div class="item"><span><strong>' + esc(t('cat_' + o.category)) + '</strong><br><span class="muted small">' + esc(t('out_' + o.status)) + (o.hours != null ? ' · ' + esc(t('hours_n', { n: digits(o.hours) })) : '') + '</span></span><span class="dotx ' + (o.status === 'resolved' ? 'd-done' : 'd-open') + '" aria-hidden="true"></span></div>';
        }).join('') + '</div>' : '') +
        '<p class="muted small" style="margin-top:12px">' + esc(t('ledger_open_data')) + ' <a class="textlink" href="/api/ledger?site=' + CONFIG.site + '">JSON</a></p>');
    }).catch(function () { view('<p class="note">' + esc(t('error_net')) + '</p>'); });
  }

  // ---------- Printable Bharosa QR badges (district team only)
  function badgesPage(err) {
    if (!store('db_admin_token')) {
      view('<h1>' + esc(t('badges_title')) + '</h1><p class="muted">' + esc(t('badges_sub')) + '</p><form id="al"><label for="at">' + esc(t('admin_token')) + '</label>' +
        '<input id="at" type="text" autocomplete="off" spellcheck="false"><p class="muted small">' + esc(t(CONFIG.demoHints ? 'admin_hint' : 'admin_hint_live')) + '</p>' +
        (err ? '<p class="note warn" style="margin:0 0 10px">' + esc(t(err === 'busy' ? 'too_many' : 'mitra_bad_token')) + '</p>' : '') + '<button class="btn green" style="width:100%">' + esc(t('mitra_signin')) + '</button></form>');
      document.getElementById('al').addEventListener('submit', function (e) { e.preventDefault(); store('db_admin_token', document.getElementById('at').value.trim()); badgesPage(); });
      return;
    }
    loading();
    fetch('/api/admin/badges', { headers: { Authorization: 'Bearer ' + store('db_admin_token') } }).then(function (r) {
      if (r.status === 401 || r.status === 429) { store('db_admin_token', ''); return badgesPage(r.status === 429 ? 'busy' : true); }
      return r.json().then(drawBadges);
    }).catch(function () { view('<p class="note">' + esc(t('error_net')) + '</p>'); });
  }
  function isLocal(u) { return /^https?:\/\/(localhost|127\.|\[::1\])/.test(u); }
  function drawBadges(d) {
    var opts = [];
    if (!isLocal(location.origin)) opts.push(location.origin);
    d.lan.forEach(function (u) { if (opts.indexOf(u) < 0) opts.push(u); });
    if (opts.indexOf(location.origin) < 0) opts.push(location.origin);
    var base = store('db_qr_base') || opts[0];
    if (opts.indexOf(base) < 0) opts.unshift(base);
    var printable = d.badges.filter(function (b) { return b.status !== 'inactive'; });
    var kind = function (k) { return t(k); };
    view('<div class="noprint"><h1>' + esc(t('badges_title')) + '</h1><p class="muted">' + esc(t('badges_sub')) + '</p>' +
      '<label for="base">' + esc(t('badges_addr')) + '</label><select id="base">' + opts.map(function (u) { return '<option' + (u === base ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') +
      '<option value="__other">' + esc(t('badges_custom')) + '</option></select><p class="muted small">' + esc(t('badges_addr_hint')) + '</p>' +
      (isLocal(base) ? '<p class="note warn" style="margin:0 0 10px">' + esc(t('badges_local_warn')) + '</p>' : '') +
      '<div class="stack"><button class="btn green" id="bprint">' + esc(t('badges_print')) + ' (' + digits(printable.length) + ')</button></div>' +
      (d.badges.length > printable.length ? '<p class="muted small">' + esc(t('badges_skip_inactive')) + '</p>' : '') + '</div>' +
      '<div class="badge-grid">' + printable.map(function (b) {
        var url = base.replace(/\/$/, '') + '/b/' + b.url_token;
        return '<article class="badge-print"><div class="bp-head"><strong>DevBhumi</strong><span>Bharosa QR</span></div>' +
          '<div class="bp-qr">' + QR.svg(url, { label: 'Bharosa QR ' + b.code }) + '</div>' +
          '<div class="bp-code">' + esc(b.code) + '</div><div class="bp-scan">' + esc(t('badge_scan')) + '</div>' +
          '<div class="bp-who">' + esc(b.name) + ' · ' + esc(kind(b.kind)) + '</div>' +
          '<div class="bp-never">' + esc(t('badge_never')) + '</div><div class="bp-url noprint">' + esc(url) + '</div></article>';
      }).join('') + '</div>' +
      '<button class="btn ghost noprint" id="aout" style="margin-top:14px">' + esc(t('mitra_signout')) + '</button>');
    document.getElementById('base').addEventListener('change', function (e) {
      var v = e.target.value;
      if (v === '__other') { v = (window.prompt(t('badges_custom'), 'https://') || '').trim(); if (!/^https?:\/\/[^\s/]+/.test(v)) return drawBadges(d); }
      store('db_qr_base', v.replace(/\/$/, '')); drawBadges(d);
    });
    document.getElementById('bprint').addEventListener('click', function () { window.print(); });
    document.getElementById('aout').addEventListener('click', function () { store('db_admin_token', ''); badgesPage(); });
  }

  // ---------- router: /b/<token> is the scan entry; everything else is a hash route
  function route() {
    S.navId = (S.navId || 0) + 1;
    var h = location.hash.replace(/^#/, '') || '/', m;
    var nav = h.split('?')[0].split('/')[1] || 'home';
    document.querySelectorAll('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (h === '/' && (m = location.pathname.match(/^\/b\/([A-Za-z0-9.\-]+)$/))) return cardScreen(m[1]);
    if (h === '/card' && S.card) return renderCard(S.card, false);
    if (h === '/find') return find();
    if (h === '/plan') return plan();
    if (h === '/help') return help();
    if (h === '/verify') return verify();
    if (h === '/talk') return talk();
    if (h === '/rate') return rate();
    if (h.indexOf('/complain') === 0 && h.indexOf('/complaint/') !== 0) return complain((h.match(/c=([a-z_]+)/) || [])[1]);
    if ((m = h.match(/^\/complaint\/(\d+)$/))) return complaintStatus(m[1]);
    if (h === '/settings') return settings();
    if (h === '/wa' || h.indexOf('/wa?') === 0) return waScreen(decodeURIComponent((h.match(/start=([^&]+)/) || [])[1] || ''));
    if (h === '/official') return official();
    if (h === '/badges') return badgesPage();
    if (h === '/report-fake') return reportFake();
    if (h === '/ledger') return ledger();
    if (h === '/mitra') return mitra();
    if ((m = h.match(/^\/mitra\/done\/(\d+)$/))) return mitraDone(m[1]);
    if ((m = h.match(/^\/mitra\/(\d+)$/))) return mitraCheck(m[1]);
    return home();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-link]');
    if (a) { e.preventDefault(); history.pushState({}, '', a.getAttribute('href')); location.hash = ''; route(); }
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);

  S.lang = store('db_lang') || (navigator.language || '').slice(0, 2);
  if (!I18N[S.lang]) S.lang = 'hi';
  S.badge = store('db_badge');
  applyPrefs();
  route();
  fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) {
    CONFIG.waNumber = c.wa_number || ''; CONFIG.demoHints = !!c.demo_hints; CONFIG.interpreterPhone = c.interpreter_phone || CONFIG.interpreterPhone;
    if (/^#\/(mitra|badges)$/.test(location.hash)) route();   // redraw a sign-in screen once we know whether to show the demo code
  }).catch(function () {});
  window.addEventListener('online', function () { if (outbox().length && location.hash.indexOf('#/mitra') === 0) syncOutbox(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
})();
