// ---------- RENDER ----------
var R = { cv: null, ctx: null, lo: null, lx: null, iw: 200, ih: 400, ps: 2, dpr: 1, cssW: 390, cssH: 844,
  PX: 4.8, PY: 4.0, MX: 16, MY: 14, field: null, fieldKey: "", cam: { x: FW / 2, y: 35 }, vign: null, t: 0, draws: 0, fps: 60 };

function renderInit(canvas) { R.cv = canvas; R.ctx = canvas.getContext("2d"); R.lo = makeCanvas(200, 400); R.lx = R.lo.getContext("2d"); }

function renderLayout(cssW, cssH) {
  R.cssW = Math.max(1, cssW); R.cssH = Math.max(1, cssH);
  R.dpr = Math.max(0.5, Math.min(2, 1000 / Math.min(R.cssW, R.cssH)));
  var ps = P("pixelSize") | 0;
  if (!ps) ps = clamp(Math.round(Math.min(R.cssW / 150, R.cssH / 230) * 2) / 2, 2, 6);
  R.ps = ps; R.iw = Math.ceil(R.cssW / ps); R.ih = Math.ceil(R.cssH / ps);
  R.lo.width = R.iw; R.lo.height = R.ih;
  R.cv.width = Math.round(R.cssW * R.dpr); R.cv.height = Math.round(R.cssH * R.dpr);
  R.cv.style.width = R.cssW + "px"; R.cv.style.height = R.cssH + "px";
  R.vign = null;
}

// world -> low-res pixel
function wx(x) { return Math.round((x - R.cam.x) * R.PX + R.iw / 2); }
function wy(y) { return Math.round(R.ih / 2 - (y - R.cam.y) * R.PY); }
function projectCss(x, y, z) { var sx = ((x - R.cam.x) * R.PX + R.iw / 2) * R.ps, sy = (R.ih / 2 - (y - R.cam.y) * R.PY - (z || 0) * R.PY) * R.ps;
  return { x: sx, y: sy, on: sx >= 0 && sy >= 0 && sx <= R.cssW && sy <= R.cssH }; }
function screenToWorld(cx, cy) { return { x: (cx / R.ps - R.iw / 2) / R.PX + R.cam.x, y: (R.ih / 2 - cy / R.ps) / R.PY + R.cam.y }; }

function asciiOnly(s) { return String(s || "").toUpperCase().replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E").replace(/[ÍÌÏÎ]/g, "I").replace(/[ÓÒÖÔ]/g, "O").replace(/[ÚÙÜÛ]/g, "U").replace(/Ñ/g, "N").replace(/[^A-Z0-9 &'!?.\-+#:]/g, ""); }

function buildField() {
  var key = G.home.primary + G.home.secondary + G.away.primary + G.away.secondary + G.home.name + G.away.name + G.home.abbr;
  if (R.field && R.fieldKey === key) return; R.fieldKey = key;
  var PX = R.PX, PY = R.PY, MX = R.MX, MY = R.MY;
  var W = Math.ceil((FW + MX * 2) * PX), H = Math.ceil((FL + MY * 2) * PY);
  var cv = makeCanvas(W, H), c = cv.getContext("2d"), rng = mulberry32(1234);
  function fx(x) { return Math.round((x + MX) * PX); } function fy(y) { return Math.round(H - (y + MY) * PY); }
  // surroundings: track
  c.fillStyle = "#4a1f1a"; c.fillRect(0, 0, W, H);
  for (var i = 0; i < 2500; i++) { c.fillStyle = rng() < 0.5 ? "#55261f" : "#401a15"; c.fillRect(Math.floor(rng() * W), Math.floor(rng() * H), 1, 1); }
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
  var ab = asciiOnly(G.home.abbr).slice(0, 4) || "HOME", aw = textW3(ab, 4);
  c.globalAlpha = 0.85; drawText3(c, ab, fx(FW / 2) - aw / 2, fy(60) - 10, G.home.secondary === "#f2f2f2" ? "#f4f4ec" : G.home.secondary, 4, shade(G.home.primary, -0.4)); c.globalAlpha = 1;
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
  stands(-MX + 0.5, -5.2, G.home); stands(FW + 5.2, FW + MX - 0.5, G.away);
  // rails
  c.fillStyle = "#9aa0aa"; c.fillRect(fx(-5), fy(FL - 5), 1, fy(5) - fy(FL - 5)); c.fillRect(fx(FW + 5), fy(FL - 5), 1, fy(5) - fy(FL - 5));
  // team benches
  c.fillStyle = "#6b6f78"; c.fillRect(fx(-3.6), fy(75), 3, fy(45) - fy(75)); c.fillRect(fx(FW + 2.6), fy(75), 3, fy(45) - fy(75));
  R.field = cv; R.fieldW = W; R.fieldH = H; R.fx = fx; R.fy = fy;
}

function camUpdate(dt, snap) {
  if (!G) return;
  var b = G.ball, d = dirOf(G.poss), tx = b.x, ty = b.y;
  var lead = (G.phase === "live" || G.phase === "presnap" || G.phase === "playcall" || G.phase === "dead") ? d * (R.ih * 0.17) / R.PY : 0;
  if (G.play && G.play.carrier && G.phase === "live") lead = dirOf(G.play.carrier.tm) * (R.ih * 0.12) / R.PY;
  if (G.ball.state === "air") lead = 0;
  if (G.phase === "kick" || G.phase === "punt" || G.phase === "kickoff") lead = 0;
  ty += lead;
  var halfW = R.iw / 2 / R.PX, halfH = R.ih / 2 / R.PY;
  var minX = -R.MX + halfW, maxX = FW + R.MX - halfW; tx = minX > maxX ? FW / 2 : clamp(tx, minX, maxX);
  var minY = -R.MY + halfH, maxY = FL + R.MY - halfH; ty = minY > maxY ? FL / 2 : clamp(ty, minY, maxY);
  if (snap) { R.cam.x = tx; R.cam.y = ty; return; }
  R.cam.x = damp(R.cam.x, tx, 4.5, dt); R.cam.y = damp(R.cam.y, ty, 4, dt);
}

function drawPlayer(c, p) {
  var sx = wx(p.x), sy = wy(p.y); if (sx < -20 || sx > R.iw + 20 || sy < -24 || sy > R.ih + 24) return;
  var spr = p.spr, img, flip = false, ox = 6, oy = 15, bob = 0;
  // shadow
  c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(sx - 4, sy - 1, 9, 2); c.fillRect(sx - 3, sy - 2, 7, 1);
  if (p.diveT > 0 || p.downT > 0) { img = spr.dive; ox = 8; oy = p.downT > 0 ? 7 : 9; flip = p.flipX; }
  else if (p.cheer) { img = spr.cheer; bob = (Math.floor(p.cheer * 6) % 2) ? -2 : 0; }
  else {
    var fr = p.anim > 0 ? 1 + (Math.floor(p.anim) % 2) : 0; if (p.eng) fr = (Math.floor(G.t * 8) % 2) ? 1 : 0;
    img = spr[p.face][fr]; flip = p.face === "side" && p.flipX; if (p.anim > 0 && (Math.floor(p.anim) % 2)) bob = -1;
  }
  if (flip) { c.save(); c.translate(sx + ox, 0); c.scale(-1, 1); c.drawImage(img, 0, sy - oy + bob); c.restore(); }
  else c.drawImage(img, sx - ox, sy - oy + bob);
  R.draws++;
}

function drawLines(c) {
  if (!G || !(G.phase === "playcall" || G.phase === "presnap" || G.phase === "live" || G.phase === "dead" || G.phase === "pat")) return;
  if (G.phase === "dead" && G.deadT > 0.6) return;
  var x0 = wx(0), x1 = wx(FW), ly = wy(G.los);
  c.fillStyle = "#3d7bff"; c.fillRect(x0, ly, x1 - x0, 1);
  if (!G.twoPt && G.phase !== "pat") { var fd = G.los + dirOf(G.poss) * G.toGo; if (Math.abs(fd - goalY(G.poss)) > 0.3) { var fyy = wy(fd); c.fillStyle = "#ffd23f"; c.fillRect(x0, fyy, x1 - x0, 1); } }
}

function drawGoalposts(c, y, d) {
  var cx = wx(FW / 2), by = wy(y), w = Math.round(3.1 * R.PX);
  c.fillStyle = "#c9a500"; c.fillRect(cx, by - 8, 1, 8);
  c.fillStyle = "#ffd23f"; c.fillRect(cx - w, by - 9, w * 2 + 1, 1); c.fillRect(cx - w, by - 22, 1, 13); c.fillRect(cx + w, by - 22, 1, 13);
  c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(cx - w, by - 1, w * 2 + 1, 1);
}

function drawLights(c) {
  // four light towers outside the corners, drawn with glow
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
  // controlled player marker
  if (G.ctl && G.ctl.onField && !G.bot && (G.phase === "live" || G.phase === "presnap")) {
    var p = G.ctl, sx = wx(p.x), sy = wy(p.y), pulse = Math.floor(R.t * 6) % 2;
    c.fillStyle = pulse ? "#ffe94a" : "#ffb21a"; c.fillRect(sx - 5, sy, 11, 1); c.fillRect(sx - 4, sy + 1, 9, 1);
    c.fillStyle = "#ffe94a"; c.fillRect(sx - 1, sy - 22, 3, 1); c.fillRect(sx, sy - 21, 1, 1);
  }
  // receiver letters for the user QB
  if (G.poss === "H" && !G.bot && pl && (G.phase === "live" || G.phase === "presnap") && pl.off.type === "pass" && !pl.thrown && !pl.crossed) {
    RECV_KEYS.forEach(function (k) { var r = byRole("H", k.role); if (!r || !r.onField) return;
      if (G.phase === "live" && r.assign !== "route") return; if (G.phase === "presnap" && !(pl.off.routes[k.role] && ROUTES[pl.off.routes[k.role]])) return;
      var o = G.phase === "live" ? openness(r, "A") : 3, col = o > 2.6 ? "#4dff6a" : o > 1.4 ? "#ffd23f" : "#ff4a3a";
      var sx = wx(r.x), sy = wy(r.y) - 26; c.fillStyle = "#0c0c14"; c.fillRect(sx - 4, sy - 1, 9, 9); c.fillStyle = col; c.fillRect(sx - 3, sy, 7, 7);
      drawText3(c, k.key, sx - 1, sy + 1, "#0c0c14", 1); c.fillStyle = "#0c0c14"; c.fillRect(sx, sy + 8, 1, 2); });
  }
  // pass target ring
  if (G.ball.state === "air") { var lx = wx(G.ball.x1), ly = wy(G.ball.y1); c.fillStyle = Math.floor(R.t * 8) % 2 ? "#ffffff" : "#ffd23f";
    c.fillRect(lx - 3, ly, 7, 1); c.fillRect(lx, ly - 2, 1, 5); }
}
var RECV_KEYS = [{ role: "WR1", key: "A" }, { role: "WR2", key: "B" }, { role: "WR3", key: "C" }, { role: "TE", key: "D" }, { role: "RB", key: "E" }];

function drawBallAll(c) {
  var b = G.ball; if (!b || b.state === "held" && b.holder && (b.holder.downT > 0 && G.phase !== "dead")) {}
  var sx = wx(b.x), sy = wy(b.y), z = b.z || 0;
  if (b.state === "air" || b.state === "kick" || b.state === "loose") { c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(sx - 2, sy, 4, 1); }
  var by = sy - Math.round(z * R.PY * (b.state === "held" ? 1.6 : 1.2));
  drawBall(c, sx, by);
}

function drawFog(c) {
  if (!G || G.half < 2) return;
  var t = R.t;
  for (var i = 0; i < 6; i++) { var y = ((i * 97 + t * 6) % (R.ih + 60)) - 30, x = Math.round(((i * 53 + t * 9) % (R.iw + 120)) - 60);
    c.fillStyle = "rgba(210,220,235,0.07)"; c.fillRect(x, y, 90, 10); c.fillRect(x + 10, y - 4, 60, 4); c.fillRect(x - 12, y + 10, 70, 5); }
}

function drawFx(c) {
  G.fx.forEach(function (f) { if (f.kind !== "pop") return; var sx = wx(f.x), sy = wy(f.y) - 24 - Math.round(f.t * 14);
    var n = f.vars.n, txt = f.key === "b.gain" ? "+" + n : f.key === "b.loss" ? "-" + n : f.key === "b.nogain" ? "0" : "!";
    var col = f.key === "b.loss" ? "#ff5a3c" : "#ffffff"; var tw = textW3(txt, 2);
    if (f.t < 1.2 || Math.floor(f.t * 10) % 2) drawText3(c, txt, sx - tw / 2, sy, col, 2, "#0c0c14"); });
}

function drawKickMeter(c) {
  // drawn in DOM instead
}

function renderFrame(dt) {
  R.t += dt; R.draws = 0;
  var c = R.lx; c.imageSmoothingEnabled = false;
  if (!G) { c.fillStyle = "#0b1020"; c.fillRect(0, 0, R.iw, R.ih); blit(); return; }
  buildField();
  c.fillStyle = "#0b1020"; c.fillRect(0, 0, R.iw, R.ih);
  var ox = Math.round(-((R.cam.x + R.MX) * R.PX) + R.iw / 2), oy = Math.round(R.ih / 2 - (R.fieldH - (R.cam.y + R.MY) * R.PY));
  c.drawImage(R.field, ox, oy); R.draws++;
  drawCrowdFlicker(c);
  drawLines(c);
  drawGoalposts(c, 0, 1);
  // sort players by y descending (top of screen first)
  var list = G.players.filter(function (p) { return p.onField; }).sort(function (a, b) { return b.y - a.y; });
  for (var i = 0; i < list.length; i++) drawPlayer(c, list[i]);
  drawGoalposts(c, 120, -1);
  drawBallAll(c);
  drawLabelsAndMarkers(c);
  drawFx(c);
  drawFog(c);
  drawLights(c);
  // night vignette
  if (!R.vign || R.vign.width !== R.iw || R.vign.height !== R.ih) {
    R.vign = makeCanvas(R.iw, R.ih); var vc = R.vign.getContext("2d"), gr = vc.createRadialGradient(R.iw / 2, R.ih / 2, Math.min(R.iw, R.ih) * 0.35, R.iw / 2, R.ih / 2, Math.max(R.iw, R.ih) * 0.75);
    gr.addColorStop(0, "rgba(5,8,25,0)"); gr.addColorStop(1, "rgba(5,8,25,0.55)"); vc.fillStyle = gr; vc.fillRect(0, 0, R.iw, R.ih);
  }
  c.drawImage(R.vign, 0, 0);
  if (P("scanlines")) { c.fillStyle = "rgba(0,0,0,0.12)"; for (var y = 1; y < R.ih; y += 2) c.fillRect(0, y, R.iw, 1); }
  blit();
}
function blit() {
  var x = R.ctx; x.imageSmoothingEnabled = false; x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(R.lo, 0, 0, R.iw, R.ih, 0, 0, Math.round(R.iw * R.ps * R.dpr), Math.round(R.ih * R.ps * R.dpr));
}
