// ---------- RENDER ----------
var R = { cv: null, ctx: null, lo: null, lx: null, iw: 200, ih: 400, ps: 2, dpr: 1, cssW: 390, cssH: 844,
  PX: 4.8, PY: 4.0, MX: 16, MY: 14, field: null, fieldKey: "", cam: { x: FW / 2, y: 35, dir: 1, D: 20 }, vign: null, t: 0, draws: 0, fps: 60,
  m7: null, tex: null, texR: null, walls: null };
var WALL_X = 7.5, WALL_H = 13, END_Y = 12;

function isM7() { return P("camera") !== "classic"; }
function renderInit(canvas) { R.cv = canvas; R.ctx = canvas.getContext("2d"); R.lo = makeCanvas(200, 400); R.lx = R.lo.getContext("2d"); }

function renderLayout(cssW, cssH) {
  R.cssW = Math.max(1, cssW); R.cssH = Math.max(1, cssH);
  R.dpr = Math.max(0.5, Math.min(2, 1000 / Math.min(R.cssW, R.cssH)));
  var land = R.cssW > R.cssH;
  var ps = P("pixelSize") | 0;
  if (!ps) ps = isM7() ? (land ? clamp(Math.round(R.cssH / 250 * 2) / 2, 2, 6) : clamp(Math.round(Math.min(R.cssW / 195, R.cssH / 300) * 2) / 2, 2, 6))
                       : clamp(Math.round(Math.min(R.cssW / 150, R.cssH / 230) * 2) / 2, 2, 6);
  R.ps = ps; R.iw = Math.ceil(R.cssW / ps); R.ih = Math.ceil(R.cssH / ps);
  R.lo.width = R.iw; R.lo.height = R.ih;
  R.cv.width = Math.round(R.cssW * R.dpr); R.cv.height = Math.round(R.cssH * R.dpr);
  R.cv.style.width = R.cssW + "px"; R.cv.style.height = R.cssH + "px";
  R.vign = null;
  var hY = Math.round(R.ih * (land ? 0.04 : 0.12)), yL = Math.round(R.ih * (land ? 0.56 : 0.6)), visW = land ? 34 : 24, DB = 20;
  R.m7 = { hY: hY, fx: R.iw * DB / visW, k: (yL - hY) * DB, DB: DB, tpx: R.ih * (land ? 0.15 : 0.085), land: land };
}

// ---- projection: world (x, y, height z in yards) -> low-res pixels ----
function project(x, y, z) {
  if (isM7() && R.m7) {
    var d = R.cam.dir, lx = (x - R.cam.x) * d, dz = (y - R.cam.y) * d;
    if (dz < 0.8) return { x: 0, y: 0, s: 0, dz: dz, vis: false };
    var s = R.m7.fx / dz;
    return { x: R.iw / 2 + lx * s, y: R.m7.hY + R.m7.k / dz - (z || 0) * s, s: s, dz: dz, vis: true };
  }
  return { x: (x - R.cam.x) * R.PX + R.iw / 2, y: R.ih / 2 - (y - R.cam.y) * R.PY - (z || 0) * R.PY, s: R.PX, dz: -y, vis: true };
}
function projectCss(x, y, z) { var p = project(x, y, z); return { x: p.x * R.ps, y: p.y * R.ps, on: p.vis && p.x >= 0 && p.y >= 0 && p.x <= R.iw && p.y <= R.ih }; }
function spriteK(q) { return isM7() ? (q.s / (R.m7.fx / R.m7.DB)) * R.m7.tpx / 30 : 0.55; }
function pickPlayerAt(cx, cy, tm, maxD) {
  var best = null, bd = maxD || 34;
  G.players.forEach(function (p) { if (!p.onField || p.tm !== tm) return; var q = project(p.x, p.y, 0); if (!q.vis) return; var k = spriteK(q);
    var px = q.x * R.ps, py = (q.y - 14 * k) * R.ps; var d = Math.hypot(px - cx, py - cy); if (d < Math.max(bd, 16 * k * R.ps)) { if (!best || d < best.d) best = { p: p, d: d }; } });
  return best ? best.p : null;
}
function lineLo(c, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); c.fillStyle = col;
  var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, n = 0;
  while (n++ < 1200) { if (x0 >= -2 && y0 >= -2 && x0 <= R.iw + 2 && y0 <= R.ih + 2) c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
}

function wx(x) { return Math.round((x - R.cam.x) * R.PX + R.iw / 2); }
function wy(y) { return Math.round(R.ih / 2 - (y - R.cam.y) * R.PY); }
function asciiOnly(s) { return String(s || "").toUpperCase().replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E").replace(/[ÍÌÏÎ]/g, "I").replace(/[ÓÒÖÔ]/g, "O").replace(/[ÚÙÜÛ]/g, "U").replace(/Ñ/g, "N").replace(/[^A-Z0-9 &'!?.\-+#:]/g, ""); }

function buildFieldTex(PX, PY, withStands, MX, MY) {
  MX = MX || R.MX; MY = MY || R.MY;
  var W = Math.ceil((FW + MX * 2) * PX), H = Math.ceil((FL + MY * 2) * PY);
  var cv = makeCanvas(W, H), c = cv.getContext("2d"), rng = mulberry32(1234);
  function fx(x) { return Math.round((x + MX) * PX); } function fy(y) { return Math.round(H - (y + MY) * PY); }
  // surroundings: crowd (Mode 7 texture) and track
  if (!withStands && MX > 20) { var fh = G.userAway ? G.away : G.home, fa = G.userAway ? G.home : G.away;
    c.fillStyle = "#1c1e28"; c.fillRect(0, 0, W, H);
    for (var yy3 = 0; yy3 < H; yy3 += 2) for (var xx3 = 0; xx3 < W; xx3 += 2) { if (rng() > 0.72) continue; var r3 = rng(), tm3 = xx3 < W / 2 ? fh : fa;
      c.fillStyle = r3 < 0.3 ? tm3.primary : r3 < 0.42 ? tm3.secondary : r3 < 0.6 ? "#e8e0d0" : r3 < 0.75 ? SKINS[Math.floor(rng() * 4)] : "#2c2e38"; c.fillRect(xx3, yy3, 2, 2); }
    c.fillStyle = "#9aa0aa"; c.fillRect(fx(-7), fy(FL + 10), fx(FW + 7) - fx(-7), fy(-10) - fy(FL + 10));
    c.fillStyle = "#4a1f1a"; c.fillRect(fx(-6.5), fy(FL + 9.5), fx(FW + 6.5) - fx(-6.5), fy(-9.5) - fy(FL + 9.5)); }
  else { c.fillStyle = "#4a1f1a"; c.fillRect(0, 0, W, H); }
  for (var i = 0; i < 2500; i++) { var tx3 = Math.floor(rng() * W), ty3 = Math.floor(rng() * H); if (!withStands && MX > 20 && (tx3 < fx(-6.5) || tx3 > fx(FW + 6.5) || ty3 < fy(FL + 9.5) || ty3 > fy(-9.5))) continue; c.fillStyle = rng() < 0.5 ? "#55261f" : "#401a15"; c.fillRect(tx3, ty3, 1, 1); }
  // grass apron
  c.fillStyle = "#236e2c"; c.fillRect(fx(-4), fy(FL + 4), fx(FW + 4) - fx(-4), fy(-4) - fy(FL + 4));
  // field stripes
  for (var s = 0; s < 24; s++) {
    var y0 = s * 5, col = s % 2 ? "#2f8f3a" : "#2a8235";
    c.fillStyle = col; c.fillRect(fx(0), fy(y0 + 5), fx(FW) - fx(0), fy(y0) - fy(y0 + 5) + 1);
  }
  // grass texture dither
  for (var g = 0; g < 9000; g++) { var gx = fx(0) + Math.floor(rng() * (fx(FW) - fx(0))), gy = fy(FL + 4) + Math.floor(rng() * (fy(-4) - fy(FL + 4)));
    c.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"; c.fillRect(gx, gy, 1, 1); }
  // end zones
  function endzone(y0, team, isAway) {
    var p = team.primary; c.fillStyle = shade(p, -0.15); c.fillRect(fx(0), fy(y0 + 10), fx(FW) - fx(0), fy(y0) - fy(y0 + 10));
    for (var d = 0; d < 1600; d++) { c.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
      c.fillRect(fx(0) + Math.floor(rng() * (fx(FW) - fx(0))), fy(y0 + 10) + Math.floor(rng() * (fy(y0) - fy(y0 + 10))), 1, 1); }
    var txt = asciiOnly(team.name).slice(0, 12) || "HOME", sc = 3, tw = textW3(txt, sc);
    while (tw > fx(FW) - fx(0) - 8 && sc > 1) { sc--; tw = textW3(txt, sc); }
    var tc = colDist(team.secondary, p) < 90 ? (lum(p) > 128 ? "#101018" : "#ffffff") : team.secondary;
    drawText3(c, txt, Math.round((fx(0) + fx(FW) - tw) / 2), Math.round((fy(y0 + 10) + fy(y0)) / 2 - sc * 2.5), tc, sc, "#0c0c14");
  }
  endzone(0, G.home, false); endzone(110, G.away, true);
  // lines
  c.fillStyle = "#f4f4ec";
  for (var yl = 10; yl <= 110; yl += 5) { c.fillRect(fx(0), fy(yl), fx(FW) - fx(0), yl % 10 === 0 ? 1 : 1); }
  for (var yd = 11; yd < 110; yd++) { if (yd % 5 === 0) continue;
    [0.4, HASH_L, HASH_R, FW - 0.9].forEach(function (hx) { c.fillRect(fx(hx), fy(yd), 2, 1); }); }
  // sidelines + end lines (thick)
  c.fillRect(fx(0) - 2, fy(FL), 2, fy(0) - fy(FL) + 1); c.fillRect(fx(FW), fy(FL), 2, fy(0) - fy(FL) + 1);
  c.fillRect(fx(0) - 2, fy(0), fx(FW) - fx(0) + 4, 2); c.fillRect(fx(0) - 2, fy(FL) - 1, fx(FW) - fx(0) + 4, 2);
  // numbers
  for (var n = 10; n <= 90; n += 10) { var lab = String(n <= 50 ? n : 100 - n), yy = fy(10 + n);
    [7.5, FW - 7.5].forEach(function (nx) { var tw2 = textW3(lab, 2); drawText3(c, lab, fx(nx) - tw2 / 2, yy - 5, "#f4f4ec", 2); }); }
  // midfield logo
  var FH = G.userAway ? G.away : G.home, ab = asciiOnly(FH.abbr).slice(0, 4) || "HOME", aw = textW3(ab, 4);
  c.globalAlpha = 0.85; drawText3(c, ab, fx(FW / 2) - aw / 2, fy(60) - 10, colDist(FH.secondary, "#2f8f3a") < 120 ? "#f4f4ec" : FH.secondary, 4, shade(FH.primary, -0.4)); c.globalAlpha = 1;
  // bleachers on both sides
  function stands(x0, x1, team) {
    var y0 = fy(FL - 5), y1 = fy(5);
    for (var row = 0; row < Math.floor((fx(x1) - fx(x0)) / 3); row++) {
      var px = fx(x0) + row * 3; c.fillStyle = row % 2 ? "#3a3d4a" : "#2c2e38"; c.fillRect(px, y0, 3, y1 - y0);
      for (var yy2 = y0; yy2 < y1; yy2 += 2) { if (rng() < 0.82) { var r = rng();
        c.fillStyle = r < 0.3 ? team.primary : r < 0.45 ? team.secondary : r < 0.6 ? "#e8e0d0" : r < 0.75 ? SKINS[Math.floor(rng() * 4)] : "#1a1a22";
        c.fillRect(px + (rng() < 0.5 ? 0 : 1), yy2, 2, 2); } }
    }
  }
  if (withStands) { stands(-MX + 0.5, -5.2, G.home); stands(FW + 5.2, FW + MX - 0.5, G.away); }
  else if (MX <= 20) { c.fillStyle = "#1c1e28"; c.fillRect(0, 0, fx(-6.5), H); c.fillRect(fx(FW + 6.5), 0, W - fx(FW + 6.5), H); c.fillStyle = "#3a1712"; c.fillRect(0, 0, W, fy(FL + 9)); c.fillRect(0, fy(-9), W, H - fy(-9)); }
  // rails
  c.fillStyle = "#9aa0aa"; c.fillRect(fx(-5), fy(FL - 5), 1, fy(5) - fy(FL - 5)); c.fillRect(fx(FW + 5), fy(FL - 5), 1, fy(5) - fy(FL - 5));
  // team benches
  c.fillStyle = "#6b6f78"; c.fillRect(fx(-3.6), fy(75), 3, fy(45) - fy(75)); c.fillRect(fx(FW + 2.6), fy(75), 3, fy(45) - fy(75));
  return { cv: cv, W: W, H: H, fx: fx, fy: fy, PX: PX, PY: PY, MX: MX, MY: MY };
}



// ---- Mode 7 field texture (8 px per yard, big numbers facing the sidelines) ----
function rotText(c, txt, cx, cy, sc, col, sh, rot) {
  var w = textW3(txt, sc), h = 5 * sc, t = makeCanvas(w + sc, h + sc), tc = t.getContext("2d"); drawText3(tc, txt, 0, 0, col, sc, sh);
  c.save(); c.translate(cx, cy); c.rotate(rot); c.drawImage(t, -w / 2, -h / 2); c.restore();
}
function buildFieldM7() {
  var PX = 8, MX = 10, MY = 16, W = Math.ceil((FW + MX * 2) * PX), H = Math.ceil((FL + MY * 2) * PX);
  var cv = makeCanvas(W, H), c = cv.getContext("2d"), rng = mulberry32(4321);
  function fx(x) { return Math.round((x + MX) * PX); } function fy(y) { return Math.round(H - (y + MY) * PX); }
  c.fillStyle = "#3b1d16"; c.fillRect(0, 0, W, H);
  for (var i = 0; i < 6000; i++) { c.fillStyle = rng() < 0.5 ? "#47241b" : "#301712"; c.fillRect(Math.floor(rng() * W), Math.floor(rng() * H), 2, 1); }
  c.fillStyle = "#1f6b2a"; c.fillRect(fx(-4.5), fy(FL + 5), fx(FW + 4.5) - fx(-4.5), fy(-5) - fy(FL + 5));
  for (var s = 0; s < 24; s++) { c.fillStyle = s % 2 ? "#33a043" : "#2c9139"; c.fillRect(fx(0), fy(s * 5 + 5), fx(FW) - fx(0), fy(s * 5) - fy(s * 5 + 5)); }
  for (var g = 0; g < 26000; g++) { var gx = fx(-4.5) + Math.floor(rng() * (fx(FW + 4.5) - fx(-4.5))), gy = fy(FL + 5) + Math.floor(rng() * (fy(-5) - fy(FL + 5)));
    c.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)"; c.fillRect(gx, gy, 1, 2); }
  function endzone(y0, team) {
    var p = team.primary; c.fillStyle = shade(p, -0.1); c.fillRect(fx(0), fy(y0 + 10), fx(FW) - fx(0), fy(y0) - fy(y0 + 10));
    for (var d = 0; d < 5000; d++) { c.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)"; c.fillRect(fx(0) + Math.floor(rng() * (fx(FW) - fx(0))), fy(y0 + 10) + Math.floor(rng() * (fy(y0) - fy(y0 + 10))), 1, 2); }
    var txt = asciiOnly(team.name).slice(0, 14) || "HOME", sc = 8; while (textW3(txt, sc) > fx(FW) - fx(0) - 20 && sc > 2) sc--;
    var tc = colDist(team.secondary, p) < 90 ? (lum(p) > 128 ? "#101018" : "#ffffff") : team.secondary;
    rotText(c, txt, (fx(0) + fx(FW)) / 2, (fy(y0 + 10) + fy(y0)) / 2, sc, tc, "#0c0c14", y0 > 50 ? Math.PI : 0);
  }
  var fh = G.userAway ? G.away : G.home;
  endzone(0, G.home); endzone(110, G.away);
  c.fillStyle = "#f4f4ec";
  for (var yl = 10; yl <= 110; yl += 5) c.fillRect(fx(0), fy(yl) - 1, fx(FW) - fx(0), 2);
  for (var yd = 11; yd < 110; yd++) { if (yd % 5 === 0) continue; [0.6, HASH_L, HASH_R, FW - 0.6].forEach(function (hx) { c.fillRect(fx(hx) - 3, fy(yd), 6, 1); }); }
  c.fillRect(fx(0) - 4, fy(FL), 4, fy(0) - fy(FL)); c.fillRect(fx(FW), fy(FL), 4, fy(0) - fy(FL));
  c.fillRect(fx(0) - 4, fy(0), fx(FW) - fx(0) + 8, 3); c.fillRect(fx(0) - 4, fy(FL) - 3, fx(FW) - fx(0) + 8, 3);
  for (var n = 10; n <= 90; n += 10) { var lab = String(n <= 50 ? n : 100 - n), yy = fy(10 + n);
    rotText(c, lab, fx(8.5), yy, 4, "#f4f4ec", null, Math.PI / 2); rotText(c, lab, fx(FW - 8.5), yy, 4, "#f4f4ec", null, -Math.PI / 2); }
  var ab = asciiOnly(fh.abbr).slice(0, 4) || "HOME";
  c.globalAlpha = 0.9; rotText(c, ab, fx(FW / 2), fy(60), 7, colDist(fh.secondary, "#33a043") < 120 ? "#f4f4ec" : fh.secondary, shade(fh.primary, -0.4), 0); c.globalAlpha = 1;
  c.fillStyle = "#e8e8e0"; c.fillRect(fx(-2.5), fy(75), 2, fy(35) - fy(75)); c.fillRect(fx(FW + 2.5) - 2, fy(75), 2, fy(35) - fy(75));
  return { cv: cv, W: W, H: H, PX: PX, PY: PX, MX: MX, MY: MY };
}
// ---- stadium walls with crowd and banners ----
function buildWall(team, other, seed, endWall) {
  var PXW = 6, W = endWall ? 420 : 960, H = WALL_H * PXW, frames = [], rng0 = mulberry32(seed);
  var heads = []; for (var y = 16; y < H - 12; y += 6) for (var x = 1; x < W - 2; x += 3) if (rng0() < 0.86 && (x % 64) > 4) heads.push([x, y, rng0(), rng0(), rng0()]);
  var banners = [asciiOnly(team.name), "GO " + asciiOnly(team.mascot), "FRIDAY NIGHT BLITZ", asciiOnly(other.name) + " FANS", "FAN ZONE", "ALL-STATE"];
  for (var f = 0; f < 2; f++) {
    var cv = makeCanvas(W, H), c = cv.getContext("2d");
    c.fillStyle = "#151726"; c.fillRect(0, 0, W, H);
    for (var r = 14; r < H - 12; r += 6) { c.fillStyle = "#2a2d3c"; c.fillRect(0, r + 5, W, 1); }
    for (var a = 0; a < W; a += 64) { c.fillStyle = "#3a3e52"; c.fillRect(a, 12, 4, H - 22); }
    heads.forEach(function (h) { var bodyC = h[2] < 0.38 ? team.primary : h[2] < 0.55 ? team.secondary : h[2] < 0.66 ? other.primary : h[2] < 0.8 ? "#e8e4d8" : "#3a3a4a";
      var up = f === 1 && h[4] < 0.25 ? 1 : 0; c.fillStyle = bodyC; c.fillRect(h[0], h[1] + 2 - up, 2, 3);
      c.fillStyle = SKINS[Math.floor(h[3] * 4)]; c.fillRect(h[0], h[1] - up, 2, 2);
      if (up) { c.fillStyle = bodyC; c.fillRect(h[0] - 1, h[1] - 2, 1, 2); } });
    c.fillStyle = "#8a90a0"; c.fillRect(0, 10, W, 2); c.fillStyle = "#0b0d18"; c.fillRect(0, 0, W, 10);
    for (var lp = 30; lp < W; lp += endWall ? 140 : 240) { c.fillStyle = "#fffbe0"; c.fillRect(lp, 2, 12, 5); c.fillStyle = "rgba(255,250,210,0.25)"; c.fillRect(lp - 4, 0, 20, 10); }
    c.fillStyle = shade(team.primary, -0.45); c.fillRect(0, H - 11, W, 11); c.fillStyle = "#e8e8e8"; c.fillRect(0, H - 12, W, 1);
    var bx = 6, bi = 0; while (bx < W) { var txt = banners[bi++ % banners.length].slice(0, 22), tw = textW3(txt, 1) + 8, bc = bi % 2 ? team.primary : shade(team.secondary, -0.2);
      c.fillStyle = bc; c.fillRect(bx, H - 10, tw, 8);
      drawText3(c, txt, bx + 4, H - 8, lum(bc) > 150 ? "#14141c" : "#ffffff", 1); bx += tw + 10; }
    if (endWall) { c.fillStyle = "#0b0d18"; c.fillRect(W / 2 - 62, 0, 124, 28); c.fillStyle = "#ffd23f"; c.fillRect(W / 2 - 60, 2, 120, 1);
      var t1 = "FRIDAY NIGHT BLITZ", t2 = asciiOnly(team.abbr) + "  VS  " + asciiOnly(other.abbr);
      drawText3(c, t1, Math.round(W / 2 - textW3(t1, 1) / 2), 7, "#ffd23f", 1); drawText3(c, t2, Math.round(W / 2 - textW3(t2, 1) / 2), 16, "#ffffff", 1); }
    frames.push(cv);
  }
  return { f: frames, W: W, H: H, PX: PXW };
}

function buildField() {
  var key = G.home.primary + G.home.secondary + G.away.primary + G.away.secondary + G.home.name + G.away.name + G.home.abbr + G.away.abbr + G.userAway + (isM7() ? "m7" : "c");
  if (R.fieldKey === key && (R.field || R.tex)) return; R.fieldKey = key;
  if (isM7()) {
    var t = buildFieldM7(); R.tex = t;
    var r = makeCanvas(t.W, t.H), rc = r.getContext("2d"); rc.translate(t.W, t.H); rc.rotate(Math.PI); rc.drawImage(t.cv, 0, 0); R.texR = r;
    var fh = G.userAway ? G.away : G.home, fa = G.userAway ? G.home : G.away;
    R.walls = { home: buildWall(fh, fa, 11, false), away: buildWall(fa, fh, 22, false), endH: buildWall(fh, fa, 33, true), endA: buildWall(fa, fh, 44, true) };
    R.field = null;
  } else { var f = buildFieldTex(R.PX, R.PY, true); R.field = f.cv; R.fieldW = f.W; R.fieldH = f.H; R.tex = null; }
}

function camTarget() {
  var b = G.ball, pl = G.play, T = { x: b.x, y: b.y }, dir = dirOf(G.poss), D = 20, userOff = G.poss === "H";
  if (G.phase === "kickoff" || G.phase === "punt" || (G.phase === "kick" && G.kick && G.kick.flying)) { dir = dirOf(G.kick ? G.kick.team : G.poss); D = 24; }
  else if (G.phase === "kick") { T = { x: b.x, y: b.y }; D = 24; }
  else if (pl && (G.phase === "live" || G.phase === "dead") && pl.carrier) { T = { x: pl.carrier.x, y: pl.carrier.y }; dir = dirOf(pl.carrier.tm); D = pl.carrier.tm === "H" ? 17 : 22; }
  else if (pl && G.phase === "live" && b.state === "air") { T = { x: b.x, y: b.y }; D = 22; }
  else if (pl && G.phase === "live") { T = { x: pl.qb.x, y: G.los }; D = userOff ? 20 : 25; }
  else if (G.phase === "playcall" || G.phase === "pat") { T = { x: G.ballX, y: G.los + dirOf(G.poss) * 2 }; D = 30; }
  else { T = { x: G.ballX, y: G.los }; D = userOff ? 20 : 25; }
  return { x: T.x, y: T.y, dir: dir, D: D };
}

function camUpdate(dt, snap) {
  if (!G) return;
  if (isM7() && R.m7) {
    var t = camTarget(), tx = clamp(t.x * 0.75 + FW / 2 * 0.25, 10, FW - 10);
    if (t.dir !== R.cam.dir) { snap = true; R.cam.dir = t.dir; }
    R.cam.D = snap ? t.D : damp(R.cam.D, t.D, 3, dt);
    var ty = t.y - t.dir * R.cam.D;
    if (snap) { R.cam.x = tx; R.cam.y = ty; return; }
    R.cam.x = damp(R.cam.x, tx, 4, dt); R.cam.y = damp(R.cam.y, ty, 5, dt); return;
  }
  R.cam.dir = 1;
  var b = G.ball, d = dirOf(G.poss), tx2 = b.x, ty2 = b.y;
  var lead = (G.phase === "live" || G.phase === "presnap" || G.phase === "playcall" || G.phase === "dead") ? d * (R.ih * 0.17) / R.PY : 0;
  if (G.play && G.play.carrier && G.phase === "live") lead = dirOf(G.play.carrier.tm) * (R.ih * 0.12) / R.PY;
  if (G.ball.state === "air") lead = 0;
  if (G.phase === "kick" || G.phase === "punt" || G.phase === "kickoff") lead = 0;
  ty2 += lead;
  var halfW = R.iw / 2 / R.PX, halfH = R.ih / 2 / R.PY;
  var minX = -R.MX + halfW, maxX = FW + R.MX - halfW; tx2 = minX > maxX ? FW / 2 : clamp(tx2, minX, maxX);
  var minY = -R.MY + halfH, maxY = FL + R.MY - halfH; ty2 = minY > maxY ? FL / 2 : clamp(ty2, minY, maxY);
  if (snap) { R.cam.x = tx2; R.cam.y = ty2; return; }
  R.cam.x = damp(R.cam.x, tx2, 4.5, dt); R.cam.y = damp(R.cam.y, ty2, 4, dt);
}

function faceOf(p) {
  var d = R.cam.dir, f = (p.hy || 0) * d, l = (p.hx || 0) * d;
  if (Math.abs(f) >= Math.abs(l) * 0.9) return { face: f >= 0 ? "up" : "down", flip: false };
  return { face: "side", flip: l < 0 };
}

function ellipse(c, cx, cy, rx, ry, col, ring) {
  rx = Math.max(2, rx); ry = Math.max(1, Math.round(ry)); c.fillStyle = col;
  for (var y = -ry; y <= ry; y++) { var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    if (ring) { c.fillRect(Math.round(cx - w), Math.round(cy + y), 1, 1); c.fillRect(Math.round(cx + w), Math.round(cy + y), 1, 1); if (Math.abs(y) === ry) c.fillRect(Math.round(cx - w), Math.round(cy + y), 2 * w + 1, 1); }
    else c.fillRect(Math.round(cx - w), Math.round(cy + y), 2 * w + 1, 1); }
}

function drawPlayer(c, p) {
  var q = project(p.x, p.y, 0); if (!q.vis || q.x < -40 || q.x > R.iw + 40 || q.y < -60 || q.y > R.ih + 60) return;
  var k = spriteK(q), sx = q.x, sy = q.y; if (k < 0.12) return;
  var spr = p.spr, img, flip = false, ox = 12, oy = 30, bob = 0, fo = faceOf(p);
  ellipse(c, sx, sy, 8 * k, 2.6 * k, "rgba(0,0,0,0.38)");
  if (p.tm === "H" && isM7() && !G.attract) ellipse(c, sx, sy, 8 * k, 2.6 * k, G.ctl === p && !G.bot ? "#ffe94a" : shade((G.home && G.home.primary) || "#3d7bff", 0.25), true);
  if (p.diveT > 0 || p.downT > 0) { img = spr.dive; ox = 17; oy = p.downT > 0 ? 13 : 15; flip = (p.hx || 0) * R.cam.dir < 0; }
  else if (p.cheer) { img = spr.cheer; bob = (Math.floor(p.cheer * 6) % 2) ? -2 : 0; }
  else {
    var fr = p.anim > 0 ? 1 + (Math.floor(p.anim) % 2) : 0; if (p.eng) fr = (Math.floor(G.t * 8) % 2) ? 1 : 0;
    img = spr[fo.face][fr]; flip = fo.face === "side" && fo.flip; if (p.anim > 0 && (Math.floor(p.anim) % 2)) bob = -1;
  }
  var w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  var dx = Math.round(sx - ox * k), dy = Math.round(sy - oy * k + bob * k);
  if (flip) { c.save(); c.translate(Math.round(sx + ox * k), 0); c.scale(-1, 1); c.drawImage(img, 0, dy, w, h); c.restore(); }
  else c.drawImage(img, dx, dy, w, h);
  R.draws++;
}

function hline(c, y, col, th) {
  var a = project(-0.2, y, 0), b = project(FW + 0.2, y, 0); if (!a.vis) return;
  var x0 = Math.max(0, Math.min(a.x, b.x)), x1 = Math.min(R.iw, Math.max(a.x, b.x)); c.fillStyle = col; c.fillRect(Math.round(x0), Math.round(a.y), Math.round(x1 - x0), th || 1);
}
function drawLines(c) {
  if (!G || !(G.phase === "playcall" || G.phase === "presnap" || G.phase === "lineup" || G.phase === "live" || G.phase === "dead" || G.phase === "pat")) return;
  if (G.phase === "dead" && G.deadT > 0.6) return;
  var q0 = project(FW / 2, G.los, 0), th = isM7() && q0.vis ? Math.max(1, Math.round(q0.s * 0.12)) : 1;
  hline(c, G.los, "#3d8bff", th);
  if (!G.twoPt && G.phase !== "pat") { var fd = G.los + dirOf(G.poss) * G.toGo; if (Math.abs(fd - goalY(G.poss)) > 0.3) { var q = project(FW / 2, fd, 0); hline(c, fd, "#ffd23f", isM7() && q.vis ? Math.max(1, Math.round(q.s * 0.12)) : 1); } }
}
function drawChains(c) {
  if (!G || !isM7() || !(G.phase === "playcall" || G.phase === "presnap" || G.phase === "lineup" || G.phase === "live" || G.phase === "dead")) return;
  var xs = FW + 3.2;
  function pole(y, label) { var b = project(xs, y, 0), t = project(xs, y, 2.6); if (!b.vis) return; var w = Math.max(1, Math.round(b.s * 0.15));
    c.fillStyle = "#ff8a1a"; c.fillRect(Math.round(b.x), Math.round(t.y), w, Math.round(b.y - t.y));
    if (label) { var bs = Math.max(7, Math.round(b.s * 0.9)); c.fillStyle = "#14141c"; c.fillRect(Math.round(t.x - bs / 2) - 1, Math.round(t.y - bs) - 1, bs + 2, bs + 2); c.fillStyle = "#ff8a1a"; c.fillRect(Math.round(t.x - bs / 2), Math.round(t.y - bs), bs, bs);
      drawText3(c, label, Math.round(t.x - 1), Math.round(t.y - bs / 2 - 2), "#14141c", 1); }
    else { c.fillStyle = "#ff8a1a"; c.fillRect(Math.round(t.x - 2), Math.round(t.y - 1), 5, 2); } }
  pole(G.los, String(G.down));
  var fd = G.los + dirOf(G.poss) * G.toGo; if (Math.abs(fd - goalY(G.poss)) > 0.3) pole(fd, null);
}

function drawGoalposts(c, y) {
  var base = project(FW / 2, y, 0); if (!base.vis) return;
  var bar = project(FW / 2, y, 3.3), lft = project(FW / 2 - 3.1, y, 3.3), rgt = project(FW / 2 + 3.1, y, 3.3), lt = project(FW / 2 - 3.1, y, 10), rt = project(FW / 2 + 3.1, y, 10);
  var t = Math.max(1, Math.round(base.s * 0.2));
  c.fillStyle = "#c9a500"; c.fillRect(Math.round(base.x), Math.round(bar.y), t, Math.max(1, Math.round(base.y - bar.y)));
  c.fillStyle = "#ffd23f"; c.fillRect(Math.round(Math.min(lft.x, rgt.x)), Math.round(bar.y), Math.round(Math.abs(rgt.x - lft.x)) + 1, t);
  c.fillRect(Math.round(lft.x), Math.round(lt.y), t, Math.round(lft.y - lt.y)); c.fillRect(Math.round(rgt.x), Math.round(rt.y), t, Math.round(rgt.y - rt.y));
}

function numBadge(c, x, y, n, col) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = "#0c0c14"; c.fillRect(x - 4, y - 3, 9, 9); c.fillRect(x - 3, y - 4, 7, 11);
  c.fillStyle = col; c.fillRect(x - 3, y - 2, 7, 7); c.fillRect(x - 2, y - 3, 5, 9);
  drawText3(c, String(n), x - 1, y - 1, "#0c0c14", 1);
}
function drawRoutePreview(c) {
  if (!G || G.bot || G.poss !== "H" || !(G.phase === "presnap" || G.phase === "lineup")) return;
  var prev = previewRoutes(); if (!prev) return;
  prev.forEach(function (rt) {
    var pts = rt.pts.map(function (w) { return project(w.x, w.y, 0); }); var col = rt.run ? "#ffd23f" : rt.hot ? "#4dd2ff" : "#ffffff";
    for (var i = 1; i < pts.length; i++) { if (!pts[i - 1].vis || !pts[i].vis) continue; lineLo(c, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, col); }
    var a = pts[pts.length - 1], b = pts[pts.length - 2]; if (a && b && a.vis && b.vis) { var ang = Math.atan2(a.y - b.y, a.x - b.x);
      lineLo(c, a.x, a.y, a.x - Math.cos(ang - 0.5) * 5, a.y - Math.sin(ang - 0.5) * 5, col); lineLo(c, a.x, a.y, a.x - Math.cos(ang + 0.5) * 5, a.y - Math.sin(ang + 0.5) * 5, col); }
  });
}
function drawLabelsAndMarkers(c) {
  if (!G) return;
  var pl = G.play;
  if (G.ctl && G.ctl.onField && !G.bot && (G.phase === "live" || G.phase === "presnap" || G.phase === "lineup")) {
    var p = G.ctl, q0 = project(p.x, p.y, 0), k = spriteK(q0);
    if (q0.vis) { var pulse = Math.floor(R.t * 6) % 2; c.fillStyle = pulse ? "#ffe94a" : "#ffb21a";
      var tx = Math.round(q0.x), ty = Math.round(q0.y - 33 * k - 2); c.fillRect(tx - 3, ty - 4, 7, 1); c.fillRect(tx - 2, ty - 3, 5, 1); c.fillRect(tx - 1, ty - 2, 3, 1); c.fillRect(tx, ty - 1, 1, 1); }
  }
  var showNums = G.poss === "H" && !G.bot && pl && pl.off.type === "pass" && !pl.thrown && !pl.crossed && (G.phase === "live" || G.phase === "presnap" || G.phase === "lineup");
  if (showNums) {
    RECV_KEYS.forEach(function (kk) { var r = byRole("H", kk.role); if (!r || !r.onField) return;
      if (G.phase === "live" && r.assign !== "route") return;
      if (G.phase !== "live" && !isEligibleRoute(kk.role)) return;
      var o = G.phase === "live" ? openness(r, "A") : 3, col = G.phase !== "live" ? "#ffd23f" : o > 2.6 ? "#4dff6a" : o > 1.4 ? "#ffd23f" : "#ff4a3a";
      var q = project(r.x, r.y, 0); if (!q.vis) return; var kq = spriteK(q);
      numBadge(c, q.x + (G.phase === "live" ? 0 : -13 * kq), q.y - (G.phase === "live" ? 40 * kq : 16 * kq), kk.key, col); });
  }
  if (G.ball.state === "air") { var lq = project(G.ball.x1, G.ball.y1, 0); if (lq.vis) { var kk2 = spriteK(lq); ellipse(c, lq.x, lq.y, 6 * kk2, 2 * kk2, Math.floor(R.t * 8) % 2 ? "#ffffff" : "#ffd23f", true); } }
}
var RECV_KEYS = [{ role: "WR1", key: "1" }, { role: "WR2", key: "2" }, { role: "WR3", key: "3" }, { role: "TE", key: "4" }, { role: "RB", key: "5" }];

function drawBallAll(c) {
  var b = G.ball, z = b.z || 0, g = project(b.x, b.y, 0); if (!g.vis) return;
  if (b.state === "air" || b.state === "kick" || b.state === "loose") { var kk = spriteK(g); ellipse(c, g.x, g.y, 2.5 * kk, 1 * kk, "rgba(0,0,0,0.35)"); }
  var q = project(b.x, b.y, z), k = isM7() ? clamp(spriteK(q) * 1.1, 0.5, 2.5) : 1;
  var w = Math.max(3, Math.round(6 * k)), h = Math.max(2, Math.round(4 * k)), x = Math.round(q.x - w / 2), y = Math.round(q.y - h / 2);
  c.fillStyle = "#2a1206"; c.fillRect(x - 1, y, w + 2, h); c.fillRect(x, y - 1, w, h + 2);
  c.fillStyle = "#8a4a1c"; c.fillRect(x, y, w, h); c.fillStyle = "#b0652c"; c.fillRect(x + 1, y, Math.max(1, w - 3), 1);
  c.fillStyle = "#f4f0e0"; c.fillRect(x + Math.floor(w / 2) - 1, y + Math.floor(h / 2), Math.max(2, Math.round(w / 3)), 1);
}

function drawLights(c) {
  [[-9, -6], [FW + 9, -6], [-9, FL + 6], [FW + 9, FL + 6], [-9, 60], [FW + 9, 60]].forEach(function (q) {
    var sx = wx(q[0]), sy = wy(q[1]); if (sx < -40 || sx > R.iw + 40 || sy < -60 || sy > R.ih + 40) return;
    c.fillStyle = "#5a5e68"; c.fillRect(sx, sy - 34, 2, 34);
    c.fillStyle = "#2a2c34"; c.fillRect(sx - 6, sy - 44, 14, 9);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 2; j++) { c.fillStyle = (Math.floor(R.t * 3 + i + j) % 7) ? "#fffbe0" : "#fff3a8"; c.fillRect(sx - 5 + i * 3, sy - 43 + j * 4, 2, 3); }
    c.fillStyle = "rgba(255,248,210,0.10)"; c.fillRect(sx - 14, sy - 52, 30, 25); c.fillStyle = "rgba(255,248,210,0.07)"; c.fillRect(sx - 22, sy - 58, 46, 37);
  });
}

function drawCrowdFlicker(c) {
  var rng = mulberry32(Math.floor(R.t * 6)); var hype = G && G.celebrateT > 0 ? 3 : 1;
  for (var i = 0; i < 70 * hype; i++) {
    var side = rng() < 0.5, xw = side ? -R.MX + 0.6 + rng() * (R.MX - 6) : FW + 5.4 + rng() * (R.MX - 6), yw = 6 + rng() * (FL - 12);
    var sx = wx(xw), sy = wy(yw); if (sx < 0 || sx > R.iw || sy < 0 || sy > R.ih) continue;
    var team = side ? G.home : G.away; c.fillStyle = rng() < 0.4 ? "#ffffff" : rng() < 0.5 ? team.primary : team.secondary;
    c.fillRect(sx, sy - (hype > 1 && rng() < 0.5 ? 1 : 0), 2, 2);
  }
}

function drawFog(c) {
  if (!G || G.half < 2) return;
  var t = R.t;
  for (var i = 0; i < 6; i++) { var y = ((i * 97 + t * 6) % (R.ih + 60)) - 30, x = Math.round(((i * 53 + t * 9) % (R.iw + 120)) - 60);
    if (isM7() && y < R.m7.hY) continue;
    c.fillStyle = "rgba(210,220,235,0.07)"; c.fillRect(x, y, 90, 10); c.fillRect(x + 10, y - 4, 60, 4); c.fillRect(x - 12, y + 10, 70, 5); }
}

function drawFx(c) {
  G.fx.forEach(function (f) { if (f.kind !== "pop") return; var q = project(f.x, f.y, 3.2); if (!q.vis) return; var sx = q.x, sy = q.y - 6 - Math.round(f.t * 14);
    var n = f.vars.n, txt = f.key === "b.gain" ? "+" + n : f.key === "b.loss" ? "-" + n : f.key === "b.nogain" ? "0" : "!";
    var col = f.key === "b.loss" ? "#ff5a3c" : "#ffffff"; var tw = textW3(txt, 2);
    if (f.t < 1.2 || Math.floor(f.t * 10) % 2) drawText3(c, txt, Math.round(sx - tw / 2), Math.round(sy), col, 2, "#0c0c14"); });
}

// ---- Mode 7 ----

// ---- Mode 7 world ----
function renderM7(c) {
  var m = R.m7, d = R.cam.dir, tex = d > 0 ? R.tex.cv : R.texR, T = R.tex, cx = R.iw / 2;
  var gr = c.createLinearGradient(0, 0, 0, Math.max(10, m.hY + R.ih * 0.25)); gr.addColorStop(0, "#03040e"); gr.addColorStop(1, "#141a48");
  c.fillStyle = gr; c.fillRect(0, 0, R.iw, R.ih);
  for (var sy = m.hY + 1; sy < R.ih; sy++) {
    var dz = m.k / (sy - m.hY + 0.5), wyRow = R.cam.y + d * dz, half = (R.iw / 2) * dz / m.fx, xl = R.cam.x - d * half;
    var colL = (xl + T.MX) * T.PX, rowY = T.H - (wyRow + T.MY) * T.PY;
    var sxT = d > 0 ? colL : T.W - colL, syT = d > 0 ? rowY : T.H - rowY;
    if (syT < 0 || syT >= T.H) continue;
    c.drawImage(tex, sxT, Math.floor(syT), 2 * half * T.PX, 1, 0, sy, R.iw, 1);
  }
  R.draws += R.ih - m.hY;
  var fr = Math.floor(R.t * 3) % 2;
  var leftX = d > 0 ? -WALL_X : FW + WALL_X, rightX = d > 0 ? FW + WALL_X : -WALL_X;
  var Ll = (leftX - R.cam.x) * d, Lr = (rightX - R.cam.x) * d;
  var endY = d > 0 ? FL + END_Y : -END_Y, dzE = (endY - R.cam.y) * d;
  var leftW = d > 0 ? R.walls.home : R.walls.away, rightW = d > 0 ? R.walls.away : R.walls.home, endW = d > 0 ? R.walls.endA : R.walls.endH;
  if (dzE > 1) { var sl = cx + m.fx * Ll / dzE, sr = cx + m.fx * Lr / dzE, base = m.hY + m.k / dzE, top = base - WALL_H * m.fx / dzE;
    c.drawImage(endW.f[fr], 0, 0, endW.W, endW.H, Math.round(sl), Math.round(top), Math.round(sr - sl), Math.round(base - top)); }
  function wallCol(sx, L, wall) {
    var dz2 = m.fx * L / (sx + 0.5 - cx); if (dz2 < 1 || (dzE > 1 && dz2 > dzE)) return;
    var base2 = m.hY + m.k / dz2, top2 = base2 - WALL_H * m.fx / dz2; if (top2 > R.ih) return;
    var u = ((R.cam.y + d * dz2) * wall.PX) % wall.W; if (u < 0) u += wall.W;
    c.drawImage(wall.f[fr], Math.floor(u), 0, 1, wall.H, sx, Math.round(top2), 1, Math.round(base2 - top2) + 1);
  }
  for (var x = 0; x < cx; x++) wallCol(x, Ll, leftW);
  for (var x2 = Math.ceil(cx); x2 < R.iw; x2++) wallCol(x2, Lr, rightW);
  R.draws += R.iw;
}

function renderFrame(dt) {
  R.t += dt; R.draws = 0;
  var c = R.lx; c.imageSmoothingEnabled = false;
  if (!G) { c.fillStyle = "#0b1020"; c.fillRect(0, 0, R.iw, R.ih); blit(); return; }
  buildField();
  c.fillStyle = "#0b1020"; c.fillRect(0, 0, R.iw, R.ih);
  var m7 = isM7() && R.m7;
  if (m7) renderM7(c);
  else {
    var ox = Math.round(-((R.cam.x + R.MX) * R.PX) + R.iw / 2), oy = Math.round(R.ih / 2 - (R.fieldH - (R.cam.y + R.MY) * R.PY));
    c.drawImage(R.field, ox, oy); R.draws++;
    drawCrowdFlicker(c);
  }
  drawLines(c);
  drawRoutePreview(c);
  var gpA = project(FW / 2, 0, 0), gpB = project(FW / 2, 120, 0);
  var farFirst = (gpA.dz || 0) > (gpB.dz || 0) ? [0, 120] : [120, 0];
  drawGoalposts(c, farFirst[0]);
  drawChains(c);
  var list = G.players.filter(function (p) { return p.onField; });
  list.forEach(function (p) { p._dz = m7 ? (p.y - R.cam.y) * R.cam.dir : -p.y; });
  list.sort(function (a, b) { return b._dz - a._dz; });
  for (var i = 0; i < list.length; i++) drawPlayer(c, list[i]);
  drawGoalposts(c, farFirst[1]);
  drawBallAll(c);
  drawLabelsAndMarkers(c);
  drawFx(c);
  drawFog(c);
  if (!m7) drawLights(c);
  if (!R.vign || R.vign.width !== R.iw || R.vign.height !== R.ih) {
    R.vign = makeCanvas(R.iw, R.ih); var vc = R.vign.getContext("2d"), gr = vc.createRadialGradient(R.iw / 2, R.ih / 2, Math.min(R.iw, R.ih) * 0.4, R.iw / 2, R.ih / 2, Math.max(R.iw, R.ih) * 0.8);
    gr.addColorStop(0, "rgba(5,8,25,0)"); gr.addColorStop(1, "rgba(5,8,25,0.4)"); vc.fillStyle = gr; vc.fillRect(0, 0, R.iw, R.ih);
  }
  c.drawImage(R.vign, 0, 0);
  if (P("scanlines")) { c.fillStyle = "rgba(0,0,0,0.10)"; for (var y = 1; y < R.ih; y += 2) c.fillRect(0, y, R.iw, 1); }
  blit();
}
function blit() {
  var x = R.ctx; x.imageSmoothingEnabled = false; x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(R.lo, 0, 0, R.iw, R.ih, 0, 0, Math.round(R.iw * R.ps * R.dpr), Math.round(R.ih * R.ps * R.dpr));
}

