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

// Builds frames for one player: {up:[3], down:[3], side:[3], cheer, dive}
function buildPlayerSprites(pal, skin, num) {
  var out = { up: [], down: [], side: [] };
  ["up", "down", "side"].forEach(function (f) {
    for (var fr = 0; fr < 3; fr++) {
      var cv = makeCanvas(12, 16), cx = cv.getContext("2d");
      paintMap(cx, UPPER[f], pal, 0, 0, skin);
      paintMap(cx, (f === "side" ? LOWER.side : LOWER.vert)[fr], pal, 0, 11, skin);
      if (f === "up") paintDigits(cx, num, 0, 6, pal.num);
      if (f === "down") paintDigits(cx, num, 0, 6, pal.num);
      if (f === "side") { cx.fillStyle = pal.num; cx.fillRect(5, 7, 2, 2); }
      shadeSprite(cx, 12, 16);
      out[f].push(cv);
    }
  });
  var ch = makeCanvas(12, 16), chx = ch.getContext("2d");
  paintMap(chx, UPPER.cheer, pal, 0, 0, skin); paintMap(chx, LOWER.vert[0], pal, 0, 11, skin); paintDigits(chx, num, 0, 6, pal.num);
  out.cheer = ch;
  var dv = makeCanvas(16, 10), dvx = dv.getContext("2d"); paintMap(dvx, DIVE, pal, 0, 0, skin); out.dive = dv;
  return out;
}

// Ball sprite 5x3 (+ lace)
function drawBall(ctx, x, y) {
  ctx.fillStyle = "#3a1a08"; ctx.fillRect(x - 2, y - 1, 5, 3);
  ctx.fillStyle = "#8a4a1c"; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillRect(x - 2, y, 5, 1);
  ctx.fillStyle = "#f4f0e0"; ctx.fillRect(x, y, 1, 1);
}
