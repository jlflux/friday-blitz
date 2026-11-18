// ---------- RENDER ----------
var R = { cv: null, ctx: null, lo: null, lx: null, iw: 200, ih: 400, ps: 2, dpr: 1, cssW: 390, cssH: 844,
  PX: 4.8, PY: 4.0, MX: 16, MY: 14, field: null, fieldKey: "", cam: { x: FW / 2, y: 35, dir: 1, D: 16 }, vign: null, t: 0, draws: 0, fps: 60,
  m7: null, tex: null, texR: null, pano: null };

function isM7() { return P("camera") !== "classic"; }
function renderInit(canvas) { R.cv = canvas; R.ctx = canvas.getContext("2d"); R.lo = makeCanvas(200, 400); R.lx = R.lo.getContext("2d"); }

function renderLayout(cssW, cssH) {
  R.cssW = Math.max(1, cssW); R.cssH = Math.max(1, cssH);
  R.dpr = Math.max(0.5, Math.min(2, 1000 / Math.min(R.cssW, R.cssH)));
  var ps = P("pixelSize") | 0;
  if (!ps) ps = isM7() ? clamp(Math.round(Math.min(R.cssW / 195, R.cssH / 250) * 2) / 2, 2, 6) : clamp(Math.round(Math.min(R.cssW / 150, R.cssH / 230) * 2) / 2, 2, 6);
  R.ps = ps; R.iw = Math.ceil(R.cssW / ps); R.ih = Math.ceil(R.cssH / ps);
  R.lo.width = R.iw; R.lo.height = R.ih;
  R.cv.width = Math.round(R.cssW * R.dpr); R.cv.height = Math.round(R.cssH * R.dpr);
  R.cv.style.width = R.cssW + "px"; R.cv.style.height = R.cssH + "px";
  R.vign = null; R.pano = null;
  var land = R.iw > R.ih;
  var hY = Math.round(R.ih * (land ? 0.24 : 0.19)), yL = Math.round(R.ih * (land ? 0.6 : 0.62));
  var visW = clamp(R.iw / 6, 30, 66), DB = 28;
  R.m7 = { hY: hY, fx: R.iw * DB / visW, k: (yL - hY) * DB, DB: DB };
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
function wx(x) { return Math.round((x - R.cam.x) * R.PX + R.iw / 2); }
function wy(y) { return Math.round(R.ih / 2 - (y - R.cam.y) * R.PY); }
function pickPlayerAt(cx, cy, tm, maxD) {
  var best = null, bd = maxD || 34;
  G.players.forEach(function (p) { if (!p.onField || p.tm !== tm) return; var q = projectCss(p.x, p.y, 1.2); if (!q.on) return;
    var d = Math.hypot(q.x - cx, q.y - cy); if (d < bd) { bd = d; best = p; } });
  return best;
}

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


function buildField() {
  var key = G.home.primary + G.home.secondary + G.away.primary + G.away.secondary + G.home.name + G.away.name + G.home.abbr + G.userAway + (isM7() ? "m7" : "c");
  if (R.fieldKey === key && (R.field || R.tex)) return; R.fieldKey = key;
  if (isM7()) {
    var t = buildFieldTex(5, 5, false, 40, 60); R.tex = t;
    var r = makeCanvas(t.W, t.H), rc = r.getContext("2d"); rc.translate(t.W, t.H); rc.rotate(Math.PI); rc.drawImage(t.cv, 0, 0); R.texR = r;
    R.field = null;
  } else { var f = buildFieldTex(R.PX, R.PY, true); R.field = f.cv; R.fieldW = f.W; R.fieldH = f.H; R.tex = null; }
}

function camTarget() {
  var b = G.ball, pl = G.play, T = { x: b.x, y: b.y }, dir = dirOf(G.poss), D = 28;
  if (G.phase === "kickoff" || G.phase === "punt" || (G.phase === "kick" && G.kick && G.kick.flying)) { dir = dirOf(G.kick ? G.kick.team : G.poss); D = 34; }
  else if (G.phase === "kick") { T = { x: b.x, y: b.y }; D = 38; }
  else if (pl && (G.phase === "live" || G.phase === "dead") && pl.carrier) { T = { x: pl.carrier.x, y: pl.carrier.y }; dir = dirOf(pl.carrier.tm); D = pl.carrier.tm === "H" ? 26 : 33; }
  else if (pl && G.phase === "live" && b.state === "air") { T = { x: b.x, y: b.y }; D = G.poss === "H" ? 30 : 35; }
  else if (pl && G.phase === "live") { T = { x: pl.qb.x, y: G.los }; D = G.poss === "H" ? 28 : 35; }
  else { T = { x: G.ballX, y: G.los }; D = G.poss === "H" ? 28 : 35; }
  return { x: T.x, y: T.y, dir: dir, D: D };
}

function camUpdate(dt, snap) {
  if (!G) return;
  if (isM7() && R.m7) {
    var t = camTarget(), visAtLos = R.iw / (R.m7.fx / t.D), wc = clamp((visAtLos - 34) / 30, 0, 0.85), tx = clamp(t.x * (1 - wc) + FW / 2 * wc, 9, FW - 9);
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

// facing relative to the camera
function faceOf(p) {
  var d = R.cam.dir, f = (p.hy || 0) * d, l = (p.hx || 0) * d;
  if (Math.abs(f) >= Math.abs(l) * 0.9) return { face: f >= 0 ? "up" : "down", flip: false };
  return { face: "side", flip: l < 0 };
}

function drawPlayer(c, p) {
  var q = project(p.x, p.y, 0); if (!q.vis || q.x < -30 || q.x > R.iw + 30 || q.y < -40 || q.y > R.ih + 40) return;
  var m7 = isM7(), k = m7 ? q.s * 3.4 / 16 : 1, sx = q.x, sy = q.y;
  if (m7 && k < 0.18) return;
  var spr = p.spr, img, flip = false, ox = 6, oy = 15, bob = 0, fo = faceOf(p);
  c.fillStyle = "rgba(0,0,0,0.35)"; var shw = Math.max(2, Math.round(9 * k)); c.fillRect(Math.round(sx - shw / 2), Math.round(sy - Math.max(1, k)), shw, Math.max(1, Math.round(2 * k)));
  if (p.diveT > 0 || p.downT > 0) { img = spr.dive; ox = 8; oy = p.downT > 0 ? 7 : 9; flip = (p.hx || 0) * R.cam.dir < 0; }
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

function hline(c, y, col) {
  var a = project(-0.5, y, 0), b = project(FW + 0.5, y, 0); if (!a.vis) return;
  var x0 = Math.max(0, Math.min(a.x, b.x)), x1 = Math.min(R.iw, Math.max(a.x, b.x)); c.fillStyle = col; c.fillRect(Math.round(x0), Math.round(a.y), Math.round(x1 - x0), 1);
}
function drawLines(c) {
  if (!G || !(G.phase === "playcall" || G.phase === "presnap" || G.phase === "live" || G.phase === "dead" || G.phase === "pat")) return;
  if (G.phase === "dead" && G.deadT > 0.6) return;
  hline(c, G.los, "#3d7bff");
  if (!G.twoPt && G.phase !== "pat") { var fd = G.los + dirOf(G.poss) * G.toGo; if (Math.abs(fd - goalY(G.poss)) > 0.3) hline(c, fd, "#ffd23f"); }
}

function drawGoalposts(c, y) {
  var base = project(FW / 2, y, 0); if (!base.vis) return;
  var bar = project(FW / 2, y, 3.3), lft = project(FW / 2 - 3.1, y, 3.3), rgt = project(FW / 2 + 3.1, y, 3.3), lt = project(FW / 2 - 3.1, y, 10), rt = project(FW / 2 + 3.1, y, 10);
  var t = Math.max(1, Math.round(base.s * 0.2));
  c.fillStyle = "#c9a500"; c.fillRect(Math.round(base.x), Math.round(bar.y), t, Math.max(1, Math.round(base.y - bar.y)));
  c.fillStyle = "#ffd23f"; c.fillRect(Math.round(Math.min(lft.x, rgt.x)), Math.round(bar.y), Math.round(Math.abs(rgt.x - lft.x)) + 1, t);
  c.fillRect(Math.round(lft.x), Math.round(lt.y), t, Math.round(lft.y - lt.y)); c.fillRect(Math.round(rgt.x), Math.round(rt.y), t, Math.round(rgt.y - rt.y));
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

function drawLabelsAndMarkers(c) {
  if (!G) return;
  var pl = G.play;
  if (G.ctl && G.ctl.onField && !G.bot && (G.phase === "live" || G.phase === "presnap")) {
    var p = G.ctl, q = project(p.x, p.y, 0), hd = project(p.x, p.y, 3.2); if (q.vis) {
      var w = Math.max(5, Math.round(q.s * 1.3)), pulse = Math.floor(R.t * 6) % 2;
      c.fillStyle = pulse ? "#ffe94a" : "#ffb21a"; c.fillRect(Math.round(q.x - w), Math.round(q.y), w * 2 + 1, 1); c.fillRect(Math.round(q.x - w + 1), Math.round(q.y + 1), w * 2 - 1, 1);
      c.fillStyle = "#ffe94a"; c.fillRect(Math.round(hd.x - 2), Math.round(hd.y - 4), 5, 1); c.fillRect(Math.round(hd.x - 1), Math.round(hd.y - 3), 3, 1); c.fillRect(Math.round(hd.x), Math.round(hd.y - 2), 1, 1);
    }
  }
  if (G.poss === "H" && !G.bot && pl && (G.phase === "live" || G.phase === "presnap") && pl.off.type === "pass" && !pl.thrown && !pl.crossed) {
    RECV_KEYS.forEach(function (k) { var r = byRole("H", k.role); if (!r || !r.onField) return;
      if (G.phase === "live" && r.assign !== "route") return; if (G.phase === "presnap" && !(pl.off.routes[k.role] && ROUTES[pl.off.routes[k.role]])) return;
      var o = G.phase === "live" ? openness(r, "A") : 3, col = o > 2.6 ? "#4dff6a" : o > 1.4 ? "#ffd23f" : "#ff4a3a";
      var q2 = project(r.x, r.y, 3.4); if (!q2.vis) return; var sx = Math.round(q2.x), sy = Math.round(q2.y) - 10;
      c.fillStyle = "#0c0c14"; c.fillRect(sx - 4, sy - 1, 9, 9); c.fillStyle = col; c.fillRect(sx - 3, sy, 7, 7);
      drawText3(c, k.key, sx - 1, sy + 1, "#0c0c14", 1); c.fillStyle = "#0c0c14"; c.fillRect(sx, sy + 8, 1, 2); });
  }
  if (G.ball.state === "air") { var lq = project(G.ball.x1, G.ball.y1, 0); if (lq.vis) { var lx = Math.round(lq.x), ly = Math.round(lq.y); c.fillStyle = Math.floor(R.t * 8) % 2 ? "#ffffff" : "#ffd23f";
    c.fillRect(lx - 3, ly, 7, 1); c.fillRect(lx, ly - 2, 1, 5); } }
}
var RECV_KEYS = [{ role: "WR1", key: "A" }, { role: "WR2", key: "B" }, { role: "WR3", key: "C" }, { role: "TE", key: "D" }, { role: "RB", key: "E" }];

function drawBallAll(c) {
  var b = G.ball, z = b.z || 0, g = project(b.x, b.y, 0); if (!g.vis) return;
  var zz = b.state === "held" ? z * 1.4 : z;
  if (b.state === "air" || b.state === "kick" || b.state === "loose") { c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(Math.round(g.x - 2), Math.round(g.y), 4, 1); }
  var q = project(b.x, b.y, zz); var k = isM7() ? clamp(q.s / 6, 0.6, 2.2) : 1;
  if (k > 1.4) { c.fillStyle = "#3a1a08"; c.fillRect(Math.round(q.x - 3), Math.round(q.y - 2), 7, 4); c.fillStyle = "#8a4a1c"; c.fillRect(Math.round(q.x - 2), Math.round(q.y - 2), 5, 4); c.fillStyle = "#f4f0e0"; c.fillRect(Math.round(q.x), Math.round(q.y - 1), 1, 2); }
  else drawBall(c, Math.round(q.x), Math.round(q.y));
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
function buildPano() {
  var W = R.iw * 3, H = R.m7.hY + 2, cv = makeCanvas(W, H), c = cv.getContext("2d"), rng = mulberry32(77);
  var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#04061a"); g.addColorStop(0.7, "#0d1440"); g.addColorStop(1, "#1b2160");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (var i = 0; i < W * H / 260; i++) { c.fillStyle = rng() < 0.7 ? "#9aa8ff" : "#ffffff"; c.fillRect(Math.floor(rng() * W), Math.floor(rng() * H * 0.55), 1, 1); }
  var sh = Math.max(10, Math.round(H * 0.42)), sy = H - sh;
  // stands
  c.fillStyle = "#23252f"; c.fillRect(0, sy, W, sh);
  var home = G.userAway ? G.away : G.home, away = G.userAway ? G.home : G.away;
  for (var x = 0; x < W; x += 2) for (var y = sy + 2; y < H - 2; y += 2) { if (rng() < 0.8) { var r = rng(), tm = x < W / 2 ? home : away;
    c.fillStyle = r < 0.32 ? tm.primary : r < 0.45 ? tm.secondary : r < 0.62 ? "#e8e0d0" : r < 0.78 ? SKINS[Math.floor(rng() * 4)] : "#15161d"; c.fillRect(x, y, 2, 1); } }
  c.fillStyle = "#3a3d4a"; for (var y2 = sy; y2 < H; y2 += 4) c.fillRect(0, y2, W, 1);
  c.fillStyle = "#9aa0aa"; c.fillRect(0, H - 2, W, 1);
  // press box + light towers
  var pbx = Math.round(W / 2 - 18); c.fillStyle = "#2c2f3a"; c.fillRect(pbx, sy - 9, 36, 9); c.fillStyle = "#ffe9a0"; for (var w = 0; w < 7; w++) c.fillRect(pbx + 2 + w * 5, sy - 7, 3, 3);
  for (var t = 0; t < 6; t++) { var lx = Math.round(W * (0.08 + t * 0.168)); c.fillStyle = "#4a4e58"; c.fillRect(lx, sy - 26, 2, 26);
    c.fillStyle = "rgba(255,245,200,0.12)"; c.fillRect(lx - 12, sy - 40, 26, 18); c.fillStyle = "#2a2c34"; c.fillRect(lx - 6, sy - 34, 14, 8);
    c.fillStyle = "#fffbe0"; for (var a = 0; a < 4; a++) for (var b = 0; b < 2; b++) c.fillRect(lx - 5 + a * 3, sy - 33 + b * 4, 2, 2); }
  R.pano = cv; R.panoKey = R.fieldKey + R.iw;
}
function renderM7(c) {
  var m = R.m7, d = R.cam.dir, tex = d > 0 ? R.tex.cv : R.texR, T = R.tex;
  if (!R.pano || R.panoKey !== R.fieldKey + R.iw) buildPano();
  var off = Math.round(((R.cam.x * d) * 3) % R.iw); c.drawImage(R.pano, -R.iw + off, 0); R.draws++;
  // flicker crowd in the backdrop
  var rng = mulberry32(Math.floor(R.t * 6)), shTop = Math.round(m.hY * 0.58);
  for (var i = 0; i < 40; i++) { c.fillStyle = rng() < 0.5 ? "#ffffff" : "#ffd23f"; c.fillRect(Math.floor(rng() * R.iw), shTop + Math.floor(rng() * (m.hY - shTop - 2)), 1, 1); }
  for (var sy = m.hY + 1; sy < R.ih; sy++) {
    var dz = m.k / (sy - m.hY + 0.5), wyRow = R.cam.y + d * dz, half = (R.iw / 2) * dz / m.fx, xl = R.cam.x - d * half;
    var colL = (xl + T.MX) * T.PX, rowY = T.H - (wyRow + T.MY) * T.PY;
    var sxT = d > 0 ? colL : T.W - colL, syT = d > 0 ? rowY : T.H - rowY;
    if (syT < 0 || syT >= T.H) { c.fillStyle = "#16171f"; c.fillRect(0, sy, R.iw, 1); continue; }
    c.drawImage(tex, sxT, Math.floor(syT), 2 * half * T.PX, 1, 0, sy, R.iw, 1);
  }
  R.draws += R.ih - m.hY;
  // horizon haze
  for (var h = 0; h < 10; h++) { c.fillStyle = "rgba(14,18,48," + (0.5 - h * 0.05).toFixed(2) + ")"; c.fillRect(0, m.hY + h * 2, R.iw, 2); }
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
  // far goalpost first, players by depth, near goalpost last
  var gpA = project(FW / 2, 0, 0), gpB = project(FW / 2, 120, 0);
  var farFirst = (gpA.dz || 0) > (gpB.dz || 0) ? [0, 120] : [120, 0];
  drawGoalposts(c, farFirst[0]);
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
    R.vign = makeCanvas(R.iw, R.ih); var vc = R.vign.getContext("2d"), gr = vc.createRadialGradient(R.iw / 2, R.ih / 2, Math.min(R.iw, R.ih) * 0.35, R.iw / 2, R.ih / 2, Math.max(R.iw, R.ih) * 0.75);
    gr.addColorStop(0, "rgba(5,8,25,0)"); gr.addColorStop(1, "rgba(5,8,25,0.5)"); vc.fillStyle = gr; vc.fillRect(0, 0, R.iw, R.ih);
  }
  c.drawImage(R.vign, 0, 0);
  if (P("scanlines")) { c.fillStyle = "rgba(0,0,0,0.12)"; for (var y = 1; y < R.ih; y += 2) c.fillRect(0, y, R.iw, 1); }
  blit();
}
function blit() {
  var x = R.ctx; x.imageSmoothingEnabled = false; x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(R.lo, 0, 0, R.iw, R.ih, 0, 0, Math.round(R.iw * R.ps * R.dpr), Math.round(R.ih * R.ps * R.dpr));
}
