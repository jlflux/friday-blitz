// ---------- TEAMS & ROSTERS ----------
var OFF_POS = ["QB", "RB", "WR", "WR", "WR", "TE", "LT", "LG", "C", "RG", "RT"];
var DEF_POS = ["DE", "DT", "DT", "DE", "LB", "LB", "LB", "CB", "CB", "FS", "SS"];
var FIRST = ["Jalen","Cody","Marcus","Tyler","Devin","Caleb","Brady","Isaiah","Jordan","Mason","Elijah","Trey","Luke","Andre","Nate","Hunter","Malik","Grant","Owen","Darius","Cole","Xavier","Logan","Tanner","Jace","Micah","Wyatt","Dante","Reggie","Evan","Kobe","Josiah","Carter","Bo","Ty","Deshawn","Riley","Gage","Rashad","Colt","Miles","Zeke","Jamal","Parker","Quinn","Seth","Beau","Terrell"];
var LAST = ["Walker","Hayes","Brooks","Carter","Jenkins","Price","Ward","Bennett","Coleman","Foster","Simmons","Reed","Patterson","Hughes","Barnes","Fisher","Henderson","Bryant","Russell","Griffin","Wallace","Mitchell","Turner","Parker","Cooper","Howard","Sanders","Long","Ross","Morgan","Bell","Murphy","Rivera","Ellis","Dawson","Holt","Pruitt","McCall","Boyd","Lane","Moss","Tate","Pope","Kirby","Shaw","Gaines","Lyles","Crenshaw"];

// quick-game schools come from the real 5A/6A list in aldata.js
var SCHOOLS = (function () { var out = [];
  ["6A", "5A"].forEach(function (cls) { AL_LEAGUE[cls].forEach(function (reg, ri) { reg.forEach(function (row) { var f = row.split("|");
    var light = lum(f[3]) > 150, ls = lum(f[4]) > 170;
    out.push({ name: f[0], mascot: f[1], abbr: f[2], primary: f[3], secondary: f[4], helmet: light ? "secondary" : "primary", pants: ls ? "secondary" : "white", cls: cls, reg: ri + 1, prestige: +f[5] }); }); }); });
  return out; })();
var SCHOOL_HOME = Math.max(0, SCHOOLS.map(function (s) { return s.name; }).indexOf("Homewood")), SCHOOL_AWAY = Math.max(0, SCHOOLS.map(function (s) { return s.name; }).indexOf("Mountain Brook"));
function schoolIdx(name) { for (var i = 0; i < SCHOOLS.length; i++) if (SCHOOLS[i].name === name) return i; return -1; }

var COLOR_SWATCHES = ["#c8102e","#e86a10","#ffc72c","#c9a227","#0f6b3a","#2fa84f","#00807a","#1e4fd8",
                      "#0b2a5b","#5b2a86","#d6337a","#6d1f2a","#14141c","#5a5f6a","#bfc3c9","#f2f2f2"];

function nameFrom(rng) { return FIRST[Math.floor(rng() * FIRST.length)] + " " + LAST[Math.floor(rng() * LAST.length)]; }
function clampR(v) { return Math.max(1, Math.min(10, Math.round(v))); }

function baseRatings(pos, rng, q) {
  // q = team quality offset (-1..+1)
  var r = function (m) { return clampR(m + q + (rng() * 3 - 1.5)); };
  switch (pos) {
    case "QB": return { spd: r(5), pwr: r(6.5), hnd: r(7) };
    case "RB": return { spd: r(7.5), pwr: r(6), hnd: r(5) };
    case "WR": return { spd: r(8), pwr: r(4), hnd: r(7) };
    case "TE": return { spd: r(5.5), pwr: r(6.5), hnd: r(6) };
    case "LT": case "LG": case "C": case "RG": case "RT": return { spd: r(3), pwr: r(7.5), hnd: r(2) };
    case "DE": return { spd: r(6), pwr: r(7), hnd: r(3) };
    case "DT": return { spd: r(4), pwr: r(8), hnd: r(2) };
    case "LB": return { spd: r(6), pwr: r(6.5), hnd: r(4) };
    case "CB": return { spd: r(8), pwr: r(4), hnd: r(6) };
    case "FS": case "SS": return { spd: r(7), pwr: r(5), hnd: r(5.5) };
    case "K": return { spd: r(3), pwr: r(6.5), hnd: r(6.5) };
  }
  return { spd: 5, pwr: 5, hnd: 5 };
}

function makeRoster(rng, q) {
  var used = {}, out = [], usedF = {}, usedL = {};
  function uname() { for (var k = 0; k < 40; k++) { var f = FIRST[Math.floor(rng() * FIRST.length)], l = LAST[Math.floor(rng() * LAST.length)]; if (!usedF[f] && !usedL[l]) { usedF[f] = usedL[l] = 1; return f + " " + l; } } return nameFrom(rng); }
  function num(pos) {
    var ranges = { QB: [1, 19], RB: [20, 49], WR: [1, 19], TE: [80, 89], LT: [50, 79], LG: [50, 79], C: [50, 79], RG: [50, 79], RT: [50, 79],
      DE: [90, 99], DT: [90, 99], LB: [40, 59], CB: [20, 39], FS: [20, 49], SS: [20, 49], K: [1, 19] };
    var rr = ranges[pos] || [1, 99];
    for (var t = 0; t < 50; t++) { var n = rr[0] + Math.floor(rng() * (rr[1] - rr[0] + 1)); if (!used[n]) { used[n] = 1; return n; } }
    for (var n2 = 1; n2 < 100; n2++) if (!used[n2]) { used[n2] = 1; return n2; }
    return 0;
  }
  OFF_POS.concat(DEF_POS).concat(["K"]).forEach(function (pos, i) {
    var r = baseRatings(pos, rng, q);
    out.push({ pos: pos, unit: i < 11 ? "O" : i < 22 ? "D" : "K", num: num(pos), name: uname(), spd: r.spd, pwr: r.pwr, hnd: r.hnd, skin: Math.floor(rng() * 4) });
  });
  return out;
}

function makeTeam(idx, seed) {
  var s = SCHOOLS[idx % SCHOOLS.length];
  var rng = mulberry32((Math.imul((seed || 77) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(idx + 1, 0xc2b2ae35)) >>> 0); rng(); rng();
  var q = ((s.prestige || 55) - 55) / 55 + (rng() * 0.6 - 0.3);
  return { id: "t" + idx + "_" + (seed || 0), school: idx, name: s.name, mascot: s.mascot, abbr: s.abbr, primary: s.primary, secondary: s.secondary,
           helmet: s.helmet, pants: s.pants, awayWhite: true, roster: makeRoster(rng, q) };
}

function teamOvr(t) {
  var sum = 0, n = 0;
  t.roster.forEach(function (p) { if (p.unit === "K") return;
    var w = p.pos === "QB" ? 2 : 1; var v = (p.pos.match(/^(LT|LG|C|RG|RT|DT)$/) ? (p.pwr * 0.7 + p.spd * 0.3) :
      p.pos.match(/^(WR|CB)$/) ? (p.spd * 0.5 + p.hnd * 0.4 + p.pwr * 0.1) : p.pos === "QB" ? (p.hnd * 0.5 + p.pwr * 0.35 + p.spd * 0.15) :
      (p.spd * 0.4 + p.pwr * 0.35 + p.hnd * 0.25));
    sum += v * w; n += w; });
  return Math.round(40 + (sum / n) * 6);
}

function cloneTeam(t) { return JSON.parse(JSON.stringify(t)); }

var STORE_KEY = "fnb_v1";
function loadSave() { try { var s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch (e) {} return null; }
function writeSave(o) { try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) {} }
