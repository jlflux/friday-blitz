// ---------- GFX: pixel font, sprites, colours ----------
var FONT3 = (function () {
  // 3x5 glyphs, rows top->bottom, each row 3 bits
  var g = {
    "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
    "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001010010010",
    "8": "111101111101111", "9": "111101111001111",
    "A": "010101111101101", "B": "110101110101110", "C": "011100100100011", "D": "110101101101110",
    "E": "111100110100111", "F": "111100110100100", "G": "011100101101011", "H": "101101111101101",
    "I": "111010010010111", "J": "001001001101010", "K": "101101110101101", "L": "100100100100111",
    "M": "101111111101101", "N": "110101101101101", "O": "010101101101010", "P": "110101110100100",
    "Q": "010101101110011", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010",
    "U": "101101101101111", "V": "101101101101010", "W": "101101111111101", "X": "101101010101101",
    "Y": "101101010010010", "Z": "111001010100111", "+": "000010111010000", "-": "000000111000000",
    "!": "010010010000010", "?": "110001010000010", ".": "000000000000010", ":": "000010000010000",
    " ": "000000000000000", "&": "010101010101011", "'": "010010000000000", "#": "101111101111101"
  };
  return g;
})();

function drawText3(ctx, str, x, y, col, scale, shadow) {
  str = String(str).toUpperCase(); scale = scale || 1;
  var cx = x;
  for (var i = 0; i < str.length; i++) {
    var gl = FONT3[str[i]] || FONT3["?"];
    for (var r = 0; r < 5; r++) for (var c = 0; c < 3; c++) {
      if (gl[r * 3 + c] === "1") {
        if (shadow) { ctx.fillStyle = shadow; ctx.fillRect(cx + c * scale + scale, y + r * scale + scale, scale, scale); }
        ctx.fillStyle = col; ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
      }
    }
    cx += 4 * scale;
  }
  return cx - x;
}
function textW3(str, scale) { return String(str).length * 4 * (scale || 1) - (scale || 1); }

// tiny 3x4 digits for jerseys
var DIG34 = ["111101101111", "010110010111", "111011100111", "111011001111", "101111001001",
             "111110001111", "100111101111", "111001010010", "111111101111", "111101111001"];

function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return "#" + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
function shade(h, f) { var c = hexToRgb(h); if (f < 0) return rgbToHex(c[0]*(1+f), c[1]*(1+f), c[2]*(1+f));
  return rgbToHex(c[0]+(255-c[0])*f, c[1]+(255-c[1])*f, c[2]+(255-c[2])*f); }
function lum(h) { var c = hexToRgb(h); return 0.299*c[0] + 0.587*c[1] + 0.114*c[2]; }
function colDist(a, b) { var x = hexToRgb(a), y = hexToRgb(b); return Math.abs(x[0]-y[0]) + Math.abs(x[1]-y[1]) + Math.abs(x[2]-y[2]); }

// ---- sprite maps (12 x 16) ----
var UPPER = {
  up: [
    "....oooo....", "...ohhhho...", "..ohhHhhho..", "..ohhHhhho..", "...ohHhho...",
    ".oojjjjjjoo.", "ojjjjjjjjjjo", "ojjjjjjjjjjo", "osjjjjjjjjso", "osjjjjjjjjso", ".o.ojjjjo.o."],
  down: [
    "....oooo....", "...ohhhho...", "..ohhHhhho..", "..offffffo..", "...osssso...",
    ".oojjjjjjoo.", "ojjjjjjjjjjo", "ojjjjjjjjjjo", "osjjjjjjjjso", "osjjjjjjjjso", ".o.ojjjjo.o."],
  side: [
    "....oooo....", "...ohhhhho..", "..ohHHhhhho.", "..ohhhhhffo.", "...ohhhsso..",
    "...oojjjjo..", "..ojjjjjjjo.", "..ojjjjjjjo.", "..ojjjsjjjo.", "..ojjjsjjjo.", "...ojjjjo..."],
  cheer: [
    "s...oooo...s", "so.ohhhho.os", "sjohhHhhhojs", ".joffffffoj.", ".jjosssso jj".replace(" ", "j"),
    ".oojjjjjjoo.", "..ojjjjjjo..", "..ojjjjjjo..", "..ojjjjjjo..", "..ojjjjjjo..", "...ojjjjo..."]
};
var LOWER = {
  vert: [
    ["...oppppo...", "...opoopo...", "...okooko...", "...okooko...", "...bb..bb..."],
    ["...oppppo...", "...opoopo...", "...okooko...", "...bb..ko...", ".......bb..."],
    ["...oppppo...", "...opoopo...", "...okooko...", "...ok..bb...", "...bb......."]],
  side: [
    ["...oppppo...", "....oppo....", "....okko....", "....okko....", "....bbbb...."],
    ["...oppppo...", "..opo..opo..", ".oko....oko.", ".bb......bb.", "............"],
    ["...oppppo...", "....oppo....", "....okko....", "...okbbo....", "...bb......."]]
};
var DIVE = [
  "................", "..........oooo..", "oo.......ohhhho.", "bkko....ohhHhffo", "bkkoppojjjjhhsso",
  ".okopppjjjjjjo..", "..ooppojjjjjjso.", ".....oojjjjjo.s.", "........ooooo...", "................"];

var SKINS = ["#f1c7a0", "#d9a274", "#a86b3c", "#6e4423"];

function teamColors(team, isAway) {
  var P = team.primary, S = team.secondary;
  var jersey = P, trim = S, num = S;
  if (isAway && team.awayWhite) { jersey = "#f4f4f0"; trim = P; num = P; }
  if (!isAway || !team.awayWhite) { if (colDist(P, S) < 90) num = lum(P) > 128 ? "#101018" : "#ffffff"; }
  var helmet = team.helmet === "primary" ? P : team.helmet === "white" ? "#f0f0f0" : team.helmet === "black" ? "#202028" : S;
  var stripe = helmet === P ? S : P; if (colDist(stripe, helmet) < 60) stripe = lum(helmet) > 128 ? "#202028" : "#ffffff";
  var pants = team.pants === "primary" ? P : team.pants === "white" ? "#e8e8e4" : team.pants === "black" ? "#24242c" : S;
  return { o: "#0c0c14", h: helmet, H: stripe, f: "#b8b8c4", j: jersey, J: trim, p: pants, k: P, b: "#121216", num: num, numShadow: shade(jersey, -0.45) };
}

function makeCanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

function paintMap(ctx, rows, pal, ox, oy, skin) {
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    for (var c = 0; c < row.length; c++) {
      var k = row[c]; if (k === ".") continue;
      var col = k === "s" ? skin : pal[k]; if (!col) continue;
      ctx.fillStyle = col; ctx.fillRect(ox + c, oy + r, 1, 1);
    }
  }
}
function paintDigits(ctx, num, ox, oy, col, sh) {
  var s = String(num); var w = s.length === 1 ? 3 : 7; var x0 = ox + Math.floor((12 - w) / 2);
  for (var i = 0; i < s.length; i++) {
    var g = DIG34[+s[i]] || DIG34[0];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) if (g[r * 3 + c] === "1") {
      ctx.fillStyle = col; ctx.fillRect(x0 + i * 4 + c, oy + r, 1, 1);
    }
  }
}
function shadeSprite(ctx, w, h) {
  // simple top-left light: darken right column pixels of each run (cheap 16-bit feel)
  var id = ctx.getImageData(0, 0, w, h), d = id.data;
  for (var y = 0; y < h; y++) for (var x = w - 1; x > 0; x--) {
    var i = (y * w + x) * 4, j = (y * w + x + 1) * 4;
    if (d[i + 3] && (x === w - 1 || !d[j + 3] || (d[j] < 30 && d[j + 1] < 30))) {
      if (!(d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 40)) { d[i] *= 0.78; d[i + 1] *= 0.78; d[i + 2] *= 0.82; }
    }
  }
  ctx.putImageData(id, 0, 0);
}

// ---- 16-bit player sprites, 24 x 32 (feet at row 30), drawn procedurally ----
var SPR_W = 24, SPR_H = 32;
function spriteFrame(pal, skin, num, view, frame, extra) {
  var cv = makeCanvas(SPR_W, SPR_H), c = cv.getContext("2d");
  function r(x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  var stepL = view !== "side" ? (frame === 1 ? -2 : 0) : 0, stepR = view !== "side" ? (frame === 2 ? -2 : 0) : 0;
  if (view === "down" || view === "up") {
    var front = view === "down";
    // legs
    [[7, stepL], [13, stepR]].forEach(function (lg) { var x = lg[0], up = lg[1];
      r(x, 22 + up, 4, 4, pal.p); r(x, 26 + up, 4, 2, pal.k); r(x, 28 + up, 4, 1, pal.J); r(x - (front ? 0 : 0), 29 + up, 4, 2, pal.b); });
    // pants / belt
    r(7, 20, 10, 3, pal.p); r(7, 20, 10, 1, shade(pal.p, -0.25)); r(11, 22, 2, 2, shade(pal.p, -0.35));
    // torso + shoulder pads
    r(6, 14, 12, 6, pal.j); r(4, 11, 16, 4, pal.j); r(5, 10, 14, 1, pal.j);
    r(3, 13, 3, 2, pal.J); r(18, 13, 3, 2, pal.J);
    // arms (swing)
    var aL = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    if (!extra || extra !== "cheer") { r(3, 15 + aL, 2, 4, skin); r(19, 15 - aL, 2, 4, skin); r(3, 19 + aL, 2, 1, "#e8e8e8"); r(19, 19 - aL, 2, 1, "#e8e8e8"); }
    else { r(2, 3, 2, 9, skin); r(20, 3, 2, 9, skin); r(2, 2, 2, 1, "#e8e8e8"); r(20, 2, 2, 1, "#e8e8e8"); r(3, 11, 2, 2, pal.j); r(19, 11, 2, 2, pal.j); }
    // number
    var ns = String(num), wn = ns.length * 4 - 1, nx = 12 - Math.ceil(wn / 2);
    for (var i = 0; i < ns.length; i++) { var g = FONT3[ns[i]] || FONT3["0"];
      for (var yy = 0; yy < 5; yy++) for (var xx = 0; xx < 3; xx++) if (g[yy * 3 + xx] === "1") r(nx + i * 4 + xx, (front ? 14 : 13) + yy, 1, 1, pal.num); }
    // helmet
    var rows = [[9, 6], [8, 8], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [7, 10], [8, 8], [9, 6]];
    rows.forEach(function (rw, i) { r(rw[0], 1 + i, rw[1], 1, pal.h); });
    r(11, 1, 2, front ? 4 : 9, pal.H);
    r(9, 2, 1, 1, shade(pal.h, 0.45)); r(8, 3, 1, 2, shade(pal.h, 0.3));
    if (front) { r(9, 5, 6, 5, skin); r(10, 6, 1, 1, "#14141c"); r(13, 6, 1, 1, "#14141c"); r(8, 7, 8, 1, pal.f); r(8, 9, 8, 1, pal.f); r(11, 7, 2, 3, pal.f); r(10, 10, 4, 1, skin); }
    else { r(10, 10, 4, 1, shade(pal.j, -0.3)); r(7, 6, 1, 2, shade(pal.h, -0.3)); r(16, 6, 1, 2, shade(pal.h, -0.3)); }
  } else { // side, facing right
    // legs with stride
    if (frame === 0) { r(10, 22, 3, 4, pal.p); r(13, 22, 3, 4, shade(pal.p, -0.15)); r(10, 26, 3, 3, pal.k); r(13, 26, 3, 3, pal.k); r(10, 29, 4, 2, pal.b); r(13, 29, 4, 2, pal.b); }
    else { var f = frame === 1 ? 1 : -1;
      // front leg
      r(12 + f, 22, 3, 3, pal.p); r(13 + 2 * f, 25, 3, 2, pal.p); r(14 + 3 * f, 27, 3, 2, pal.k); r(15 + 3 * f, 29, 4, 2, pal.b);
      // back leg
      r(11 - f, 22, 3, 3, shade(pal.p, -0.15)); r(10 - 2 * f, 25, 3, 2, shade(pal.p, -0.15)); r(9 - 3 * f, 27, 3, 2, shade(pal.k, -0.15)); r(7 - 3 * f, 29, 4, 2, shade(pal.b, 0.1)); }
    r(10, 20, 6, 3, pal.p);
    // torso
    r(9, 11, 8, 10, pal.j); r(8, 11, 10, 3, pal.j); r(9, 14, 8, 1, pal.J);
    // arm
    var arm = frame === 1 ? [16, 15, 3, 2] : frame === 2 ? [8, 15, 2, 3] : [13, 14, 2, 5];
    r(arm[0], arm[1], arm[2], arm[3], skin); r(13, 13, 3, 2, pal.J);
    // helmet
    var rows2 = [[11, 6], [10, 8], [9, 10], [9, 10], [9, 10], [9, 10], [9, 10], [9, 9], [10, 7], [11, 5]];
    rows2.forEach(function (rw, i) { r(rw[0], 1 + i, rw[1], 1, pal.h); });
    r(10, 1, 7, 1, pal.H); r(10, 2, 1, 1, shade(pal.h, 0.45));
    r(15, 5, 3, 4, skin); r(18, 5, 1, 4, pal.f); r(16, 7, 3, 1, pal.f); r(16, 4, 1, 1, "#14141c");
    r(11, 5, 2, 2, shade(pal.h, -0.35));
    // side number on the shoulder
    var d0 = String(num).slice(-1), g0 = FONT3[d0] || FONT3["0"];
    for (var y2 = 0; y2 < 5; y2++) for (var x2 = 0; x2 < 3; x2++) if (g0[y2 * 3 + x2] === "1") r(11 + x2, 15 + y2, 1, 1, pal.num);
  }
  outlineAndShade(c);
  return cv;
}
function outlineAndShade(c) {
  var W = SPR_W, H = SPR_H, id = c.getImageData(0, 0, W, H), d = id.data, op = new Uint8Array(W * H);
  for (var i = 0; i < W * H; i++) op[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  // shading: light from top-left
  for (var y = 0; y < H; y++) { var minx = -1, maxx = -1;
    for (var x = 0; x < W; x++) if (op[y * W + x]) { if (minx < 0) minx = x; maxx = x; }
    if (minx < 0) continue;
    for (var x2 = minx; x2 <= maxx; x2++) { var k = (y * W + x2) * 4; if (!op[y * W + x2]) continue;
      if (x2 >= maxx - 1 && maxx - minx > 3) { d[k] *= 0.72; d[k + 1] *= 0.72; d[k + 2] *= 0.78; }
      else if (x2 <= minx && maxx - minx > 3) { d[k] = Math.min(255, d[k] * 1.12 + 10); d[k + 1] = Math.min(255, d[k + 1] * 1.12 + 10); d[k + 2] = Math.min(255, d[k + 2] * 1.12 + 10); } } }
  // outline
  for (var y3 = 0; y3 < H; y3++) for (var x3 = 0; x3 < W; x3++) { if (op[y3 * W + x3]) continue;
    var n = (x3 > 0 && op[y3 * W + x3 - 1]) || (x3 < W - 1 && op[y3 * W + x3 + 1]) || (y3 > 0 && op[(y3 - 1) * W + x3]) || (y3 < H - 1 && op[(y3 + 1) * W + x3]);
    if (n) { var k3 = (y3 * W + x3) * 4; d[k3] = 12; d[k3 + 1] = 12; d[k3 + 2] = 20; d[k3 + 3] = 255; } }
  c.putImageData(id, 0, 0);
}
function diveFrame(pal, skin) {
  var cv = makeCanvas(34, 20), c = cv.getContext("2d");
  function r(x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  r(1, 9, 3, 3, pal.b); r(4, 9, 3, 3, pal.k); r(1, 12, 3, 2, pal.b); r(4, 12, 3, 2, pal.k);
  r(7, 8, 6, 6, pal.p); r(13, 7, 11, 8, pal.j); r(14, 7, 9, 1, pal.J); r(13, 12, 3, 2, pal.J);
  r(24, 13, 7, 2, skin); r(31, 13, 2, 2, "#e8e8e8");
  var rows = [[24, 5], [23, 7], [22, 9], [22, 9], [22, 9], [22, 9], [23, 7], [24, 5]];
  rows.forEach(function (rw, i) { r(rw[0], 4 + i, rw[1], 1, pal.h); }); r(23, 4, 6, 1, pal.H);
  r(28, 7, 2, 3, skin); r(30, 6, 1, 5, pal.f);
  var tmpW = SPR_W, tmpH = SPR_H; SPR_W = 34; SPR_H = 20; outlineAndShade(c); SPR_W = tmpW; SPR_H = tmpH;
  return cv;
}
function buildPlayerSprites(pal, skin, num) {
  var out = { up: [], down: [], side: [] };
  ["up", "down", "side"].forEach(function (v) { for (var fr = 0; fr < 3; fr++) out[v].push(spriteFrame(pal, skin, num, v, fr)); });
  out.cheer = spriteFrame(pal, skin, num, "down", 0, "cheer");
  out.dive = diveFrame(pal, skin);
  return out;
}

// Ball sprite 5x3 (+ lace)
function drawBall(ctx, x, y) {
  ctx.fillStyle = "#3a1a08"; ctx.fillRect(x - 2, y - 1, 5, 3);
  ctx.fillStyle = "#8a4a1c"; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillRect(x - 2, y, 5, 1);
  ctx.fillStyle = "#f4f0e0"; ctx.fillRect(x, y, 1, 1);
}
