/* DevBhumi QR reader: reads a QR code from a camera frame or photo, entirely on the phone.
 * Used when the browser has no built-in BarcodeDetector (iPhone, Firefox).
 * Steps: adaptive black/white -> find the three corner squares -> perspective grid -> format info ->
 * Reed-Solomon error correction -> text. Code tables come from qr.js (Kazuhiko Arase, MIT).
 * Copyright DevBhumi team, MIT licence. */
(function () {
  var L = window.QR && window.QR._lib;
  if (!L) return;
  var QRCode = L.index, QRUtil = L.QRUtil, QRRSBlock = L.QRRSBlock;

  // ---------------------------------------------------------------- GF(256) and Reed-Solomon (generator roots a^0..a^(n-1))
  var EXP = new Array(512), LOG = new Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function div(a, b) { if (!b) throw new Error('div0'); return a ? EXP[(LOG[a] + 255 - LOG[b]) % 255] : 0; }
  function pow(x, p) { return EXP[(((LOG[x] * p) % 255) + 255) % 255]; }
  function inv(x) { return EXP[255 - LOG[x]]; }
  function pScale(p, x) { return p.map(function (c) { return mul(c, x); }); }
  function pAdd(p, q) {
    var n = Math.max(p.length, q.length), r = new Array(n).fill(0), i;
    for (i = 0; i < p.length; i++) r[i + n - p.length] = p[i];
    for (i = 0; i < q.length; i++) r[i + n - q.length] ^= q[i];
    return r;
  }
  function pMul(p, q) {
    var r = new Array(p.length + q.length - 1).fill(0);
    for (var j = 0; j < q.length; j++) for (var i = 0; i < p.length; i++) r[i + j] ^= mul(p[i], q[j]);
    return r;
  }
  function pEval(p, x) { var y = p[0]; for (var i = 1; i < p.length; i++) y = mul(y, x) ^ p[i]; return y; }
  function pDivRem(dividend, divisor) {
    var out = dividend.slice();
    for (var i = 0; i < dividend.length - (divisor.length - 1); i++) {
      var c = out[i];
      if (c) for (var j = 1; j < divisor.length; j++) if (divisor[j]) out[i + j] ^= mul(divisor[j], c);
    }
    return out.slice(out.length - (divisor.length - 1));
  }
  function rsCorrect(msg, nsym) {
    var synd = [0], i, j;
    for (i = 0; i < nsym; i++) synd.push(pEval(msg, pow(2, i)));
    if (Math.max.apply(null, synd) === 0) return msg;
    // Berlekamp-Massey
    var errLoc = [1], oldLoc = [1], shift = synd.length - nsym;
    for (i = 0; i < nsym; i++) {
      var K = i + shift, delta = synd[K];
      for (j = 1; j < errLoc.length; j++) delta ^= mul(errLoc[errLoc.length - 1 - j], synd[K - j]);
      oldLoc = oldLoc.concat([0]);
      if (delta) {
        if (oldLoc.length > errLoc.length) { var nl = pScale(oldLoc, delta); oldLoc = pScale(errLoc, inv(delta)); errLoc = nl; }
        errLoc = pAdd(errLoc, pScale(oldLoc, delta));
      }
    }
    while (errLoc.length && errLoc[0] === 0) errLoc.shift();
    var errs = errLoc.length - 1;
    if (errs * 2 > nsym) throw new Error('too many errors');
    // Chien search
    var rev = errLoc.slice().reverse(), pos = [];
    for (i = 0; i < msg.length; i++) if (pEval(rev, pow(2, i)) === 0) pos.push(msg.length - 1 - i);
    if (pos.length !== errs) throw new Error('locate failed');
    // Forney
    var coefPos = pos.map(function (p) { return msg.length - 1 - p; }), eLoc = [1];
    coefPos.forEach(function (c) { eLoc = pMul(eLoc, pAdd([1], [pow(2, c), 0])); });
    var mx = [1]; for (i = 0; i < eLoc.length; i++) mx.push(0);
    var eEval = pDivRem(pMul(synd.slice().reverse(), eLoc), mx).reverse();
    var X = coefPos.map(function (c) { return pow(2, c - 255); }), E = new Array(msg.length).fill(0);
    for (i = 0; i < X.length; i++) {
      var Xi = inv(X[i]), prime = 1;
      for (j = 0; j < X.length; j++) if (j !== i) prime = mul(prime, 1 ^ mul(Xi, X[j]));
      var y = mul(X[i], pEval(eEval.slice().reverse(), Xi));
      if (!prime) throw new Error('forney');
      E[pos[i]] = div(y, prime);
    }
    var out = pAdd(msg, E);
    for (i = 0; i < nsym; i++) if (pEval(out, pow(2, i)) !== 0) throw new Error('uncorrectable');
    return out;
  }

  // ---------------------------------------------------------------- black/white (adaptive mean, 15% below local average = dark)
  function binarize(gray, w, h) {
    var integ = new Float64Array((w + 1) * (h + 1)), x, y;
    for (y = 0; y < h; y++) {
      var row = 0;
      for (x = 0; x < w; x++) { row += gray[y * w + x]; integ[(y + 1) * (w + 1) + x + 1] = integ[y * (w + 1) + x + 1] + row; }
    }
    var s = Math.max(8, Math.round(Math.min(w, h) / 8)) | 1, r = s >> 1, out = new Uint8Array(w * h);
    for (y = 0; y < h; y++) {
      var y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
      for (x = 0; x < w; x++) {
        var x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r), cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
        var sum = integ[(y1 + 1) * (w + 1) + x1 + 1] - integ[y0 * (w + 1) + x1 + 1] - integ[(y1 + 1) * (w + 1) + x0] + integ[y0 * (w + 1) + x0];
        out[y * w + x] = gray[y * w + x] * cnt < sum * 0.85 ? 1 : 0;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- finder patterns (1:1:3:1:1)
  function ratioOk(c) {
    var total = c[0] + c[1] + c[2] + c[3] + c[4];
    if (total < 7) return false;
    var m = total / 7, v = m / 1.6;
    return Math.abs(m - c[0]) < v && Math.abs(m - c[1]) < v && Math.abs(3 * m - c[2]) < 3 * v && Math.abs(m - c[3]) < v && Math.abs(m - c[4]) < v;
  }
  function findFinders(bin, w, h) {
    var px = function (x, y) { return bin[y * w + x]; };
    function crossCheck(cx, cy, dx, dy, maxCount, origTotal) {
      // count runs from the centre outward along (dx,dy)
      var c = [0, 0, 0, 0, 0], x = cx, y = cy;
      var inb = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h; };
      while (inb(x, y) && px(x, y)) { c[2]++; x -= dx; y -= dy; }
      if (!inb(x, y)) return NaN;
      while (inb(x, y) && !px(x, y) && c[1] <= maxCount) { c[1]++; x -= dx; y -= dy; }
      if (!inb(x, y) || c[1] > maxCount) return NaN;
      while (inb(x, y) && px(x, y) && c[0] <= maxCount) { c[0]++; x -= dx; y -= dy; }
      if (c[0] > maxCount) return NaN;
      x = cx + dx; y = cy + dy;
      while (inb(x, y) && px(x, y)) { c[2]++; x += dx; y += dy; }
      if (!inb(x, y)) return NaN;
      while (inb(x, y) && !px(x, y) && c[3] < maxCount) { c[3]++; x += dx; y += dy; }
      if (!inb(x, y) || c[3] >= maxCount) return NaN;
      while (inb(x, y) && px(x, y) && c[4] < maxCount) { c[4]++; x += dx; y += dy; }
      if (c[4] >= maxCount) return NaN;
      var total = c[0] + c[1] + c[2] + c[3] + c[4];
      if (5 * Math.abs(total - origTotal) >= 2 * origTotal || !ratioOk(c)) return NaN;
      // centre offset along the line
      var end = (dx ? x - cx : y - cy);
      return { off: end - c[4] - c[3] - c[2] / 2, size: total / 7 };
    }
    var found = [];
    function add(x, y, m) {
      for (var i = 0; i < found.length; i++) {
        var f = found[i];
        if (Math.abs(f.x - x) <= Math.max(m, f.m) * 1.5 && Math.abs(f.y - y) <= Math.max(m, f.m) * 1.5 && Math.abs(f.m - m) <= Math.max(1, f.m * 0.6)) {
          f.x = (f.x * f.n + x) / (f.n + 1); f.y = (f.y * f.n + y) / (f.n + 1); f.m = (f.m * f.n + m) / (f.n + 1); f.n++; return;
        }
      }
      found.push({ x: x, y: y, m: m, n: 1 });
    }
    var step = Math.max(1, Math.floor(h / 240));
    for (var y = 0; y < h; y += step) {
      var c = [0, 0, 0, 0, 0], st = 0;
      for (var x = 0; x <= w; x++) {
        var dark = x < w ? px(x, y) : 0;
        if (dark) {
          if (st & 1) st++;
          c[st]++;
        } else {
          if (!(st & 1)) {
            if (st === 4) {
              if (ratioOk(c)) {
                var total = c[0] + c[1] + c[2] + c[3] + c[4], cx = Math.round(x - c[4] - c[3] - c[2] / 2);
                var v = crossCheck(cx, y, 0, 1, c[2], total);
                if (v) {
                  var cy = Math.round(y + v.off);
                  var hz = crossCheck(cx, cy, 1, 0, c[2], total);
                  if (hz) {
                    var fx = cx + hz.off, vv = crossCheck(Math.round(fx), cy, 0, 1, c[2], total);
                    if (vv) add(fx, cy + vv.off, (v.size + hz.size + vv.size) / 3);
                  }
                }
                c = [c[2], c[3], c[4], 1, 0]; st = 3; continue;
              }
              c = [c[2], c[3], c[4], 1, 0]; st = 3;
            } else { st++; c[st]++; }
          } else c[st]++;
        }
      }
    }
    return found;
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  // Length of the dark-light-dark run from a finder centre to its outer edge, walking towards (tx,ty): 3.5 modules.
  function runToEdge(bin, w, h, fx, fy, tx, ty) {
    var dx = tx - fx, dy = ty - fy, len = Math.hypot(dx, dy); if (!len) return NaN;
    dx /= len; dy /= len;
    var state = 0, x, y;
    for (var t = 0; t < len; t += 0.5) {
      x = Math.round(fx + dx * t); y = Math.round(fy + dy * t);
      if (x < 0 || y < 0 || x >= w || y >= h) return NaN;
      var dark = bin[y * w + x] === 1;
      if ((state === 0 && !dark) || (state === 1 && dark)) state++;
      else if (state === 2 && !dark) return t;
    }
    return NaN;
  }
  function moduleAlong(bin, w, h, a, b) {
    var r1 = runToEdge(bin, w, h, a.x, a.y, b.x, b.y), r2 = runToEdge(bin, w, h, a.x, a.y, 2 * a.x - b.x, 2 * a.y - b.y);
    if (isNaN(r1) || isNaN(r2)) return NaN;
    return (r1 + r2) / 7;
  }
  function estimateModule(bin, w, h, o) {
    var v = [moduleAlong(bin, w, h, o.tl, o.tr), moduleAlong(bin, w, h, o.tr, o.tl), moduleAlong(bin, w, h, o.tl, o.bl), moduleAlong(bin, w, h, o.bl, o.tl)]
      .filter(function (x) { return !isNaN(x); });
    if (!v.length) return (o.tl.m + o.tr.m + o.bl.m) / 3;
    return v.reduce(function (s, x) { return s + x; }, 0) / v.length;
  }
  function bestTriples(found, w, h) {
    var f = found.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 20), out = [];
    for (var i = 0; i < f.length; i++) for (var j = i + 1; j < f.length; j++) for (var k = j + 1; k < f.length; k++) {
      var p = [f[i], f[j], f[k]], ms = p.map(function (q) { return q.m; });
      var mMax = Math.max.apply(null, ms), mMin = Math.min.apply(null, ms);
      if (mMax > mMin * 1.6) continue;
      var d = [dist(p[0], p[1]), dist(p[1], p[2]), dist(p[0], p[2])].sort(function (a, b) { return a - b; });
      if (d[0] < 8 * mMin) continue;
      var right = Math.abs(d[2] * d[2] - d[0] * d[0] - d[1] * d[1]) / (d[2] * d[2]), iso = (d[1] - d[0]) / d[1];
      if (right > 0.35 || iso > 0.35) continue;
      var cx = (p[0].x + p[1].x + p[2].x) / 3 - w / 2, cy = (p[0].y + p[1].y + p[2].y) / 3 - h / 2;
      out.push({ p: p, score: right + iso + (mMax - mMin) / mMax - Math.min(p[0].n, p[1].n, p[2].n) * 0.02,
        centre: Math.hypot(cx, cy) / Math.hypot(w, h) });
    }
    // Several badges in view: keep the well-shaped triples, then try the one nearest the middle first.
    out.sort(function (a, b) { return a.score - b.score; });
    var good = out.filter(function (t) { return t.score < 0.25; }).slice(0, 12);
    var rest = out.filter(function (t) { return good.indexOf(t) < 0; }).slice(0, 4);
    good.sort(function (a, b) { return a.centre - b.centre; });
    return good.concat(rest).map(function (t) { return t.p; });
  }
  function order(p) {
    var d01 = dist(p[0], p[1]), d12 = dist(p[1], p[2]), d02 = dist(p[0], p[2]), A, B, C;
    if (d12 >= d01 && d12 >= d02) { B = p[0]; A = p[1]; C = p[2]; }
    else if (d02 >= d12 && d02 >= d01) { B = p[1]; A = p[0]; C = p[2]; }
    else { B = p[2]; A = p[0]; C = p[1]; }
    if ((C.x - B.x) * (A.y - B.y) - (C.y - B.y) * (A.x - B.x) < 0) { var t = A; A = C; C = t; }
    return { bl: A, tl: B, tr: C };
  }

  // ---------------------------------------------------------------- perspective (square <-> quadrilateral)
  function sq2quad(x0, y0, x1, y1, x2, y2, x3, y3) {
    var dx3 = x0 - x1 + x2 - x3, dy3 = y0 - y1 + y2 - y3;
    if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) return [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0, 1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, den = dx1 * dy2 - dx2 * dy1;
    var a13 = (dx3 * dy2 - dx2 * dy3) / den, a23 = (dx1 * dy3 - dx3 * dy1) / den;
    return [x1 - x0 + a13 * x1, x3 - x0 + a23 * x3, x0, y1 - y0 + a13 * y1, y3 - y0 + a23 * y3, y0, a13, a23, 1];
  }
  function adj(a) { // a = [a11,a21,a31,a12,a22,a32,a13,a23,a33]
    var a11 = a[0], a21 = a[1], a31 = a[2], a12 = a[3], a22 = a[4], a32 = a[5], a13 = a[6], a23 = a[7], a33 = a[8];
    return [a22 * a33 - a23 * a32, a23 * a31 - a21 * a33, a21 * a32 - a22 * a31, a13 * a32 - a12 * a33, a11 * a33 - a13 * a31, a12 * a31 - a11 * a32,
      a12 * a23 - a13 * a22, a13 * a21 - a11 * a23, a11 * a22 - a12 * a21];
  }
  function times(a, o) {
    return [a[0] * o[0] + a[1] * o[3] + a[2] * o[6], a[0] * o[1] + a[1] * o[4] + a[2] * o[7], a[0] * o[2] + a[1] * o[5] + a[2] * o[8],
      a[3] * o[0] + a[4] * o[3] + a[5] * o[6], a[3] * o[1] + a[4] * o[4] + a[5] * o[7], a[3] * o[2] + a[4] * o[5] + a[5] * o[8],
      a[6] * o[0] + a[7] * o[3] + a[8] * o[6], a[6] * o[1] + a[7] * o[4] + a[8] * o[7], a[6] * o[2] + a[7] * o[5] + a[8] * o[8]];
  }
  function apply(t, x, y) { var d = t[6] * x + t[7] * y + t[8]; return [(t[0] * x + t[1] * y + t[2]) / d, (t[3] * x + t[4] * y + t[5]) / d]; }

  function findAlignment(bin, w, h, ex, ey, m) {
    var best = null, R = Math.ceil(m * 8), k = Math.max(1, Math.round(m));
    var at = function (x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < w && y < h ? bin[y * w + x] : -1; };
    var sx = 0, sy = 0, n = 0, hits = [];
    for (var y = Math.round(ey - R); y <= ey + R; y++) for (var x = Math.round(ex - R); x <= ex + R; x++) {
      if (at(x, y) !== 1) continue;
      if (at(x - k, y) || at(x + k, y) || at(x, y - k) || at(x, y + k)) continue;
      if (at(x - 2 * k, y) !== 1 || at(x + 2 * k, y) !== 1 || at(x, y - 2 * k) !== 1 || at(x, y + 2 * k) !== 1) continue;
      if (at(x - k, y - k) || at(x + k, y + k) || at(x - k, y + k) || at(x + k, y - k)) continue;
      hits.push([x, y]);
    }
    if (!hits.length) return null;
    // group hits into blobs and take the blob closest to the estimate
    hits.sort(function (a, b) { return Math.hypot(a[0] - ex, a[1] - ey) - Math.hypot(b[0] - ex, b[1] - ey); });
    var c0 = hits[0];
    hits.forEach(function (q) { if (Math.hypot(q[0] - c0[0], q[1] - c0[1]) <= m) { sx += q[0]; sy += q[1]; n++; } });
    best = { x: sx / n, y: sy / n };
    return best;
  }

  // ---------------------------------------------------------------- read the grid
  var ECL_BY_BITS = [0, 1, 2, 3]; // Arase: M=0, L=1, H=2, Q=3
  function functionMap(version) {
    var q = new QRCode(version, 0);
    q.moduleCount = version * 4 + 17; q.modules = [];
    for (var r = 0; r < q.moduleCount; r++) { q.modules.push(new Array(q.moduleCount).fill(null)); }
    q.setupPositionProbePattern(0, 0); q.setupPositionProbePattern(q.moduleCount - 7, 0); q.setupPositionProbePattern(0, q.moduleCount - 7);
    q.setupPositionAdjustPattern(); q.setupTimingPattern(); q.setupTypeInfo(true, 0);
    if (version >= 7) q.setupTypeNumber(true);
    return q.modules;
  }
  var FMAPS = {};
  function readFormat(get, n) {
    var v = 0, hz = 0, i;
    for (i = 0; i < 15; i++) {
      var bv = i < 6 ? get(i, 8) : i < 8 ? get(i + 1, 8) : get(n - 15 + i, 8);
      var bh = i < 8 ? get(8, n - i - 1) : i < 9 ? get(8, 15 - i) : get(8, 15 - i - 1);
      v |= bv << i; hz |= bh << i;
    }
    var best = null, bd = 99;
    for (var e = 0; e < 4; e++) for (var mk = 0; mk < 8; mk++) {
      var bits = QRUtil.getBCHTypeInfo((e << 3) | mk);
      [v, hz].forEach(function (x) {
        var d = 0, z = bits ^ x; while (z) { d += z & 1; z >>= 1; }
        if (d < bd) { bd = d; best = { ecl: e, mask: mk }; }
      });
    }
    return bd <= 3 ? best : null;
  }
  function decodeMatrix(get, version) {
    var n = version * 4 + 17, fmt = readFormat(get, n);
    if (!fmt) throw new Error('format');
    var fm = FMAPS[version] || (FMAPS[version] = functionMap(version));
    var bytes = [], cur = 0, bit = 7, inc = -1, row = n - 1;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (var c = 0; c < 2; c++) {
          if (fm[row][col - c] === null) {
            var dark = get(row, col - c) ^ (QRUtil.getMask(fmt.mask, row, col - c) ? 1 : 0);
            if (dark) cur |= 1 << bit;
            if (--bit < 0) { bytes.push(cur); cur = 0; bit = 7; }
          }
        }
        row += inc;
        if (row < 0 || row >= n) { row -= inc; inc = -inc; break; }
      }
    }
    var blocks = QRRSBlock.getRSBlocks(version, fmt.ecl), maxD = 0, maxE = 0, k = 0, b, i;
    var dc = blocks.map(function (bl) { maxD = Math.max(maxD, bl.dataCount); maxE = Math.max(maxE, bl.totalCount - bl.dataCount); return []; });
    var ec = blocks.map(function () { return []; });
    for (i = 0; i < maxD; i++) for (b = 0; b < blocks.length; b++) if (i < blocks[b].dataCount) dc[b].push(bytes[k++]);
    for (i = 0; i < maxE; i++) for (b = 0; b < blocks.length; b++) if (i < blocks[b].totalCount - blocks[b].dataCount) ec[b].push(bytes[k++]);
    var data = [];
    for (b = 0; b < blocks.length; b++) {
      var fixed = rsCorrect(dc[b].concat(ec[b]), ec[b].length);
      data = data.concat(fixed.slice(0, blocks[b].dataCount));
    }
    return parseData(data, version);
  }
  function parseData(data, version) {
    var pos = 0;
    function read(nb) { var v = 0; for (var i = 0; i < nb; i++) { var by = data[pos >> 3]; v = (v << 1) | ((by >> (7 - (pos & 7))) & 1); pos++; } return v; }
    var out = [], text = '', AN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
    var big = version >= 27 ? 2 : version >= 10 ? 1 : 0;
    while (pos + 4 <= data.length * 8) {
      var mode = read(4);
      if (mode === 0) break;
      if (mode === 4) { var n = read([8, 16, 16][big]); for (var i = 0; i < n; i++) out.push(read(8)); }
      else if (mode === 2) {
        var na = read([9, 11, 13][big]);
        for (; na > 1; na -= 2) { var v = read(11); out.push(AN.charCodeAt(Math.floor(v / 45)), AN.charCodeAt(v % 45)); }
        if (na === 1) out.push(AN.charCodeAt(read(6)));
      } else if (mode === 1) {
        var nn = read([10, 12, 14][big]);
        for (; nn >= 3; nn -= 3) { var s3 = String(read(10)); while (s3.length < 3) s3 = '0' + s3; for (var j = 0; j < 3; j++) out.push(s3.charCodeAt(j)); }
        if (nn === 2) { var s2 = String(read(7)); while (s2.length < 2) s2 = '0' + s2; out.push(s2.charCodeAt(0), s2.charCodeAt(1)); }
        if (nn === 1) out.push(48 + read(4));
      } else if (mode === 7) { read(8); }
      else throw new Error('mode ' + mode);
    }
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(out)); }
    catch (e) { text = String.fromCharCode.apply(null, out); }
    return text;
  }

  function tryGrid(bin, w, h, o, dim, useAlign, corner) {
    var version = (dim - 17) / 4;
    if (version < 1 || version > 40 || version !== Math.floor(version)) throw new Error('dim');
    var brx = o.tr.x - o.tl.x + o.bl.x, bry = o.tr.y - o.tl.y + o.bl.y, sx, sy, p2;
    if (corner) { sx = dim - 3.5; sy = dim - 3.5; p2 = corner; }
    else if (useAlign && version >= 2) {
      var m = o.mod || (o.tl.m + o.tr.m + o.bl.m) / 3, corr = 1 - 3 / (dim - 7);
      var ex = o.tl.x + corr * (brx - o.tl.x), ey = o.tl.y + corr * (bry - o.tl.y);
      var al = findAlignment(bin, w, h, ex, ey, m);
      if (!al) throw new Error('align');
      sx = dim - 6.5; sy = dim - 6.5; p2 = al;
    } else { sx = dim - 3.5; sy = dim - 3.5; p2 = { x: brx, y: bry }; }
    var src = sq2quad(3.5, 3.5, dim - 3.5, 3.5, sx, sy, 3.5, dim - 3.5);
    var dst = sq2quad(o.tl.x, o.tl.y, o.tr.x, o.tr.y, p2.x, p2.y, o.bl.x, o.bl.y);
    var T = times(dst, adj(src));
    var cache = {}, OFF = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
    var get = function (r, c) {
      var key = r * 200 + c; if (key in cache) return cache[key];
      var votes = 0;
      for (var i = 0; i < 5; i++) {
        var p = apply(T, c + OFF[i][0], r + OFF[i][1]), x = Math.round(p[0]), y = Math.round(p[1]);
        if (x >= 0 && y >= 0 && x < w && y < h && bin[y * w + x]) votes += i === 0 ? 2 : 1;
      }
      return (cache[key] = votes >= 3 ? 1 : 0);
    };
    return decodeMatrix(get, version);
  }

  function dimGuesses(o) {
    var m = o.mod, d = Math.round((Math.round(dist(o.tl, o.tr) / m) + Math.round(dist(o.tl, o.bl) / m)) / 2) + 7, out = [];
    [d, d + 1, d - 1, d + 2, d - 2].forEach(function (x) { if ((x & 3) === 1 && out.indexOf(x) < 0) out.push(x); });
    [out[0] - 4, out[0] + 4].forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function decodeBin(bin, w, h, thorough, deadline) {
    var found = findFinders(bin, w, h);
    if (found.length < 3) return null;
    var triples = bestTriples(found, w, h), t, i, a;
    var os = triples.map(function (tr) { var o = order(tr); o.mod = estimateModule(bin, w, h, o); return o; });
    for (t = 0; t < os.length; t++) {
      var dims = dimGuesses(os[t]);
      for (i = 0; i < dims.length; i++) for (a = 0; a < 2; a++) {
        try { return tryGrid(bin, w, h, os[t], dims[i], a === 0); } catch (e) { /* next guess */ }
      }
    }
    if (!thorough) return null;
    // Strong camera tilt: search for the true bottom-right corner around the parallelogram guess.
    for (t = 0; t < Math.min(2, os.length); t++) {
      var o = os[t], ds = dimGuesses(o).slice(0, 2);
      for (i = 0; i < ds.length; i++) {
        var dim = ds[i], K = Math.max(2, Math.round(dim * 0.14));
        var ux = (o.tr.x - o.tl.x) / (dim - 7), uy = (o.tr.y - o.tl.y) / (dim - 7), vx = (o.bl.x - o.tl.x) / (dim - 7), vy = (o.bl.y - o.tl.y) / (dim - 7);
        var bx = o.tr.x - o.tl.x + o.bl.x, by = o.tr.y - o.tl.y + o.bl.y, offs = [];
        for (var p = -K; p <= K; p++) for (var q = -K; q <= K; q++) if (p || q) offs.push([p, q]);
        offs.sort(function (A, B) { return (A[0] * A[0] + A[1] * A[1]) - (B[0] * B[0] + B[1] * B[1]); });
        for (var k = 0; k < offs.length; k++) {
          if (deadline && Date.now() > deadline) return null;   // keep the camera smooth; the next frame tries again
          try { return tryGrid(bin, w, h, o, dim, false, { x: bx + offs[k][0] * ux + offs[k][1] * vx, y: by + offs[k][0] * uy + offs[k][1] * vy }); }
          catch (e) { /* next corner */ }
        }
      }
    }
    return null;
  }
  function smooth(gray, w, h) {
    var out = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var s = 0, n = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += gray[yy * w + xx]; n++; }
      }
      out[y * w + x] = s / n;
    }
    return out;
  }
  // opts.thorough: also try smoothing and the tilt search (photos, or every few video frames)
  // opts.budgetMs: stop the slow tilt search after this long (default 3000 ms for photos)
  function decodeGray(gray, w, h, opts) {
    opts = opts || {};
    var thorough = opts.thorough !== false, deadline = Date.now() + (opts.budgetMs || 3000);
    var bin = binarize(gray, w, h), r = decodeBin(bin, w, h, false);
    if (r !== null || !thorough) return r;
    var sm = smooth(gray, w, h), bin2 = binarize(sm, w, h);
    r = decodeBin(bin2, w, h, false);
    if (r !== null || Date.now() > deadline) return r;
    return decodeBin(bin, w, h, true, deadline) || decodeBin(bin2, w, h, true, deadline);
  }

  // RGBA ImageData -> text (or null). Large images are scaled down first for speed.
  function decodeImageData(img, opts) {
    var w = img.width, h = img.height, d = img.data, g = new Uint8Array(w * h);
    for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
    return decodeGray(g, w, h, opts);
  }
  window.QRScan = { decodeImageData: decodeImageData, decodeGray: decodeGray, _rs: rsCorrect };
})();
