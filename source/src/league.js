// ---------- FRANCHISE: Alabama 5A/6A league model ----------
var FR = null;
var FR_SLOTS = 3, FR_PREFIX = "fnb_al_slot_", FR_ACTIVE = "fnb_al_active";
var POSL = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K"];
var MIX = { QB: 3, RB: 3, WR: 6, TE: 2, OL: 9, DL: 7, LB: 5, CB: 4, S: 3, K: 1 };
var START = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 2, S: 2, K: 1 };
var ATTRS = ["spd", "str", "agi", "awr", "thr", "hnd", "blk", "tkl", "cov", "kck"];
var ATTR_NAME = { spd: "Speed", str: "Strength", agi: "Agility", awr: "Awareness", thr: "Throwing", hnd: "Hands", blk: "Blocking", tkl: "Tackling", cov: "Coverage", kck: "Kicking" };
var WEIGHTS = {
  QB: { thr: .38, awr: .27, spd: .1, agi: .1, str: .05, hnd: .1 }, RB: { spd: .3, agi: .25, str: .2, hnd: .1, awr: .15 },
  WR: { spd: .3, hnd: .3, agi: .2, awr: .15, str: .05 }, TE: { hnd: .25, blk: .25, str: .2, spd: .15, awr: .15 },
  OL: { blk: .45, str: .35, awr: .15, agi: .05 }, DL: { str: .35, tkl: .25, spd: .15, agi: .15, awr: .1 },
  LB: { tkl: .3, spd: .2, awr: .2, str: .15, cov: .15 }, CB: { cov: .35, spd: .3, agi: .2, hnd: .05, awr: .1 },
  S: { cov: .3, tkl: .2, spd: .25, awr: .2, agi: .05 }, K: { kck: .8, awr: .2 }
};
var KEY_ATTRS = { QB: ["thr", "awr", "spd"], RB: ["spd", "agi", "str"], WR: ["spd", "hnd", "agi"], TE: ["hnd", "blk", "str"], OL: ["blk", "str", "awr"],
  DL: ["str", "tkl", "spd"], LB: ["tkl", "spd", "awr"], CB: ["cov", "spd", "agi"], S: ["cov", "spd", "tkl"], K: ["kck", "awr", "str"] };
var NUM_RANGE = { QB: [1, 19], RB: [20, 49], WR: [1, 19], TE: [80, 89], OL: [50, 79], DL: [90, 99], LB: [40, 59], CB: [20, 39], S: [20, 49], K: [1, 19] };
var FAC = ["weight", "film", "stadium", "practice", "locker"];
var FAC_NAME = { weight: "Weight Room", film: "Film Room", stadium: "Stadium", practice: "Practice Fields", locker: "Locker Room" };
var FAC_DESC = { weight: "Faster strength and speed gains in the offseason", film: "More college exposure, scouting points and game prep",
  stadium: "Bigger gate on home Fridays and a stronger home crowd", practice: "Fewer injuries and better practice weeks", locker: "Move-in families like what they see" };
var STAFF_ROLES = ["OC", "DC", "SC", "PD"];
var STAFF_NAME = { OC: "Offensive Coordinator", DC: "Defensive Coordinator", SC: "Strength & Conditioning", PD: "Player Development" };
var STAFF_TRAITS = {
  OC: [["Air Raid", "Passing game +"], ["Ground & Pound", "Running game +"], ["QB Whisperer", "QBs develop faster"], ["Balanced", "Small boost to everything on offense"]],
  DC: [["Blitz Happy", "More sacks, more big plays allowed"], ["No-Fly Zone", "Pass defense +"], ["Run Stopper", "Run defense +"], ["Fundamentals", "Better tackling"]],
  SC: [["Speed Coach", "Speed gains +"], ["Iron Program", "Strength gains +"], ["Injury Prevention", "Fewer injuries"], ["Old School", "Toughness, small gains everywhere"]],
  PD: [["Talent Evaluator", "More scouting points"], ["Feeder Builder", "Freshmen arrive better"], ["College Connection", "More college offers"], ["Position Guru", "Young players develop faster"]]
};
var PRACTICE = [["balanced", "Balanced", "Normal week"], ["offense", "Offense", "+3 offense this Friday"], ["defense", "Defense", "+3 defense this Friday"],
  ["fundamentals", "Fundamentals", "Underclassmen develop a little"], ["conditioning", "Conditioning", "+1 everything, slightly more injuries"], ["light", "Light", "Injured players heal faster, -1 Friday"]];

function frRng() { FR.rs = (FR.rs + 0x6D2B79F5) | 0; var t = FR.rs; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function rn() { return (frRng() + frRng() + frRng() + frRng() - 2) * 1.73; }
function pk(a) { return a[Math.floor(frRng() * a.length)]; }
function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
function r99(v) { return Math.round(cl(v, 20, 99)); }
function shuffleR(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(frRng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function money(v) { v = Math.round(v); return (v < 0 ? "-$" : "$") + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(Math.abs(v) >= 100000 ? 0 : 1).replace(/\.0$/, "") + "K" : Math.abs(v)); }
function yrLabel(y) { return { 9: "FR", 10: "SO", 11: "JR", 12: "SR" }[y] || "SR"; }
function pnm(p) { return p.f + " " + p.l; }
function tm(id) { return FR.teams[id]; }
function PL(id) { return FR.pl[id]; }
function isUser(id) { return id === FR.user; }

// ---- players ----
var POS_ATTR_MEAN = {
  QB: { spd: 55, str: 55, agi: 58, awr: 60, thr: 66, hnd: 50, blk: 25, tkl: 25, cov: 25, kck: 25 }, RB: { spd: 70, str: 60, agi: 68, awr: 55, thr: 30, hnd: 55, blk: 40, tkl: 30, cov: 25, kck: 20 },
  WR: { spd: 72, str: 48, agi: 68, awr: 55, thr: 30, hnd: 66, blk: 35, tkl: 25, cov: 35, kck: 20 }, TE: { spd: 58, str: 64, agi: 55, awr: 55, thr: 25, hnd: 60, blk: 60, tkl: 30, cov: 25, kck: 20 },
  OL: { spd: 40, str: 70, agi: 45, awr: 55, thr: 20, hnd: 30, blk: 68, tkl: 30, cov: 20, kck: 20 }, DL: { spd: 55, str: 70, agi: 55, awr: 52, thr: 20, hnd: 30, blk: 40, tkl: 64, cov: 25, kck: 20 },
  LB: { spd: 62, str: 62, agi: 58, awr: 56, thr: 20, hnd: 40, blk: 35, tkl: 66, cov: 52, kck: 20 }, CB: { spd: 72, str: 45, agi: 70, awr: 54, thr: 20, hnd: 50, blk: 25, tkl: 46, cov: 66, kck: 20 },
  S: { spd: 66, str: 54, agi: 62, awr: 58, thr: 20, hnd: 50, blk: 25, tkl: 58, cov: 62, kck: 20 }, K: { spd: 45, str: 45, agi: 45, awr: 55, thr: 30, hnd: 30, blk: 20, tkl: 20, cov: 20, kck: 66 }
};
function ovrFor(p, pos) { var w = WEIGHTS[pos || p.pos], s = 0, n = 0; for (var k in w) { s += p.a[k] * w[k]; n += w[k]; } return r99((s / n - 50) * 1.15 + 58); }
function calcOvr(p) { p.ov = ovrFor(p); return p.ov; }
// talent ~ projected senior-year level (40-99)
function newPlayer(pos, yr, talent, teamId) {
  var id = "p" + (FR.nid++), a = {}, mean = POS_ATTR_MEAN[pos], grow = (12 - yr) * 6.5;
  ATTRS.forEach(function (k) { a[k] = r99(mean[k] + (talent - 62) * 0.9 - grow * (WEIGHTS[pos][k] ? 1 : 0.5) + rn() * 6); });
  var p = { id: id, t: teamId, f: pk(FIRST), l: pk(LAST), pos: pos, yr: yr, a: a, ov: 0, pot: 0, dev: frRng() < 0.12 ? 2 : frRng() < 0.3 ? 1 : 0,
    num: 0, sk: Math.floor(frRng() * 4), inj: 0, st: blankSt(), cs: blankSt(), of: [], cm: -1, fx: 0, hn: 0 };
  calcOvr(p);
  p.pot = r99(talent + (p.dev * 3) + rn() * 3);
  if (p.pot < p.ov) p.pot = p.ov;
  FR.pl[id] = p; return p;
}
function blankSt() { return { gp: 0, pa: 0, pc: 0, py: 0, ptd: 0, pint: 0, ra: 0, ry: 0, rtd: 0, rec: 0, rcy: 0, rctd: 0, tk: 0, sk: 0, int: 0, fgm: 0, fga: 0 }; }
function stars(p) { // recruiting stars for juniors/seniors (and elite sophomores)
  var v = p.ov * 0.7 + p.pot * 0.3;
  return v >= 90 ? 5 : v >= 85 ? 4 : v >= 81 ? 3 : v >= 77 ? 2 : v >= 72 ? 1 : 0;
}
function teamPlayers(id) { var out = [], r = FR.tm[id] || []; for (var i = 0; i < r.length; i++) { var p = FR.pl[r[i]]; if (p) out.push(p); } return out; }
function assignNum(p, used) {
  var rr = NUM_RANGE[p.pos];
  for (var t = 0; t < 60; t++) { var n = rr[0] + Math.floor(frRng() * (rr[1] - rr[0] + 1)); if (!used[n]) { used[n] = 1; p.num = n; return; } }
  for (var n2 = 1; n2 < 100; n2++) if (!used[n2]) { used[n2] = 1; p.num = n2; return; }
}
function renumber(id) { var used = {}; teamPlayers(id).forEach(function (p) { if (p.num && !used[p.num]) used[p.num] = 1; else p.num = 0; }); teamPlayers(id).forEach(function (p) { if (!p.num) assignNum(p, used); }); }
function teamTalent(t) { return 50 + t.prestige * 0.26; }
function genRoster(id) {
  var t = tm(id); FR.tm[id] = [];
  POSL.forEach(function (pos) { for (var i = 0; i < MIX[pos]; i++) { var yr = 9 + ((i + Math.floor(frRng() * 4)) % 4); if (MIX[pos] > 3 && i < 2) yr = 11 + Math.floor(frRng() * 2);
    var p = newPlayer(pos, yr, teamTalent(t) + rn() * 7 - (i > START[pos] ? 4 : 0), id); FR.tm[id].push(p.id); } });
  renumber(id);
}

// ---- lineup / depth ----
function sortedAt(id, pos) {
  return teamPlayers(id).filter(function (p) { return p.pos === pos; }).sort(function (a, b) { return (a.inj ? 1 : 0) - (b.inj ? 1 : 0) || b.ov - a.ov; });
}
function lineupOf(id) {
  var lu = {};
  POSL.forEach(function (pos) {
    if (isUser(id) && FR.depth[pos]) {
      var arr = FR.depth[pos].map(PL).filter(function (p) { return p && p.t === id && p.pos === pos; });
      teamPlayers(id).forEach(function (p) { if (p.pos === pos && arr.indexOf(p) < 0) arr.push(p); });
      var healthy = arr.filter(function (p) { return !p.inj; }), hurt = arr.filter(function (p) { return p.inj; });
      lu[pos] = healthy.concat(hurt);
    } else lu[pos] = sortedAt(id, pos);
  });
  return lu;
}
function fixDepth() {
  POSL.forEach(function (pos) {
    var cur = (FR.depth[pos] || []).filter(function (pid) { var p = PL(pid); return p && p.t === FR.user && p.pos === pos; });
    sortedAt(FR.user, pos).forEach(function (p) { if (cur.indexOf(p.id) < 0) cur.push(p.id); });
    FR.depth[pos] = cur;
  });
}
function autoDepth() { FR.depth = {}; POSL.forEach(function (pos) { FR.depth[pos] = sortedAt(FR.user, pos).map(function (p) { return p.id; }); }); }
function moveDepth(pos, pid, d) { var a = FR.depth[pos], i = a.indexOf(pid), j = i + d; if (i < 0 || j < 0 || j >= a.length) return; a[i] = a[j]; a[j] = pid; }
function starters(id) { var lu = lineupOf(id), out = []; POSL.forEach(function (pos) { for (var i = 0; i < START[pos]; i++) if (lu[pos][i]) out.push(lu[pos][i]); }); return out; }
function unitRatings(id) {
  var lu = lineupOf(id), avg = function (pos, n, f) { var a = lu[pos].filter(function (p) { return !p.inj; }).slice(0, n); if (!a.length) return 35; var s = 0; a.forEach(function (p) { s += f(p); }); return s / a.length; };
  var qb = avg("QB", 1, function (p) { return p.ov; }), rb = avg("RB", 1, function (p) { return p.ov; }), wr = avg("WR", 3, function (p) { return p.ov; }), te = avg("TE", 1, function (p) { return p.ov; }),
    ol = avg("OL", 5, function (p) { return p.ov; }), dl = avg("DL", 4, function (p) { return p.ov; }), lb = avg("LB", 3, function (p) { return p.ov; }), cb = avg("CB", 2, function (p) { return p.ov; }),
    s = avg("S", 2, function (p) { return p.ov; }), k = avg("K", 1, function (p) { return p.a.kck; });
  var u = { pass: qb * 0.45 + wr * 0.3 + te * 0.08 + ol * 0.17, run: rb * 0.4 + ol * 0.45 + qb * 0.05 + te * 0.1, rush: dl * 0.7 + lb * 0.3, cov: cb * 0.45 + s * 0.35 + lb * 0.2, rund: dl * 0.45 + lb * 0.4 + s * 0.15, kick: k };
  if (!isUser(id)) { var cb = 1.2 + tm(id).prestige * 0.025; u.pass += cb; u.run += cb; u.rush += cb; u.cov += cb; u.rund += cb; }
  if (isUser(id)) {
    var bo = staffBonus();
    u.pass += bo.pass; u.run += bo.run; u.rush += bo.rush; u.cov += bo.cov; u.rund += bo.rund;
    var pf = FR.practice; if (pf === "offense") { u.pass += 3; u.run += 3; } if (pf === "defense") { u.rush += 3; u.cov += 3; u.rund += 3; }
    if (pf === "conditioning") { u.pass++; u.run++; u.rush++; u.cov++; u.rund++; } if (pf === "light") { u.pass--; u.run--; u.rush--; u.cov--; u.rund--; }
    var fl = FR.fac.film * 0.4; u.pass += fl; u.cov += fl;
  }
  u.off = u.pass * 0.55 + u.run * 0.45; u.def = u.rush * 0.3 + u.cov * 0.35 + u.rund * 0.35;
  u.ovr = Math.round(u.off * 0.5 + u.def * 0.5);
  return u;
}
function refreshOvr(id) { var t = tm(id); var u = unitRatings(id); t.ovr = u.ovr; t.off = Math.round(u.off); t.def = Math.round(u.def); return t.ovr; }
function staffBonus() {
  var b = { pass: 0, run: 0, rush: 0, cov: 0, rund: 0 }, s = FR.staff;
  if (s.OC) { var o = s.OC.r * 0.8; b.pass += o; b.run += o; if (s.OC.tr === "Air Raid") b.pass += 2.5; if (s.OC.tr === "Ground & Pound") b.run += 2.5; if (s.OC.tr === "Balanced") { b.pass += 1; b.run += 1; } }
  if (s.DC) { var d = s.DC.r * 0.8; b.rush += d; b.cov += d; b.rund += d; if (s.DC.tr === "Blitz Happy") { b.rush += 3; b.cov -= 1; } if (s.DC.tr === "No-Fly Zone") b.cov += 2.5; if (s.DC.tr === "Run Stopper") b.rund += 2.5; if (s.DC.tr === "Fundamentals") { b.rund += 1; b.cov += 1; } }
  return b;
}

// ---- new franchise ----
function frCreate(slot, coachName, seed) {
  FR = { v: 2, slot: slot, rs: seed | 0, nid: 1, year: 2026, week: 0, phase: "preseason", user: -1, teams: [], pl: {}, tm: {}, sched: [], po: null, poll: { "5A": [], "6A": [] },
    news: [], hist: [], awards: {}, rec: { g: {}, s: {}, c: {}, t: {} }, depth: {}, staff: {}, fac: { weight: 0, film: 0, stadium: 0, practice: 0, locker: 0 },
    funds: 25000, exposure: 0, practice: "balanced", scout: { pts: 0, board: [] }, off: null, coach: { name: coachName || "Coach", w: 0, l: 0, tt: 0, pw: 0, pl: 0, seasons: 0, rep: 40 },
    watched: {}, filmLeft: 3, settings: { qmin: 4, diff: "normal" }, ledger: [] };
  ["6A", "5A"].forEach(function (cls) {
    AL_LEAGUE[cls].forEach(function (reg, ri) {
      reg.forEach(function (row) {
        var f = row.split("|"), id = FR.teams.length;
        FR.teams.push({ id: id, cls: cls, reg: ri + 1, name: f[0], mascot: f[1], abbr: f[2], c1: f[3], c2: f[4], prestige: +f[5], unsure: f[6] === "?",
          coach: pk(COACH_FIRST) + " " + pk(COACH_LAST), w: 0, l: 0, rw: 0, rl: 0, pf: 0, pa: 0, strk: 0, ovr: 0, off: 0, def: 0, hist: [] });
      });
    });
  });
  FR.teams.forEach(function (t) { genRoster(t.id); refreshOvr(t.id); });
  seedOffers();
  return FR;
}
function frPick(teamId) {
  FR.user = teamId; var t = tm(teamId); t.coach = FR.coach.name;
  FR.exposure = Math.round(t.prestige * 0.5);
  FR.funds = 12000 + t.prestige * 120;
  STAFF_ROLES.forEach(function (r) { FR.staff[r] = makeStaff(r, 2 + (t.prestige > 60 ? 1 : 0)); });
  autoDepth(); refreshOvr(teamId);
  makeSchedule(); updatePoll(); genFeeder();
  news("program", "Welcome to " + t.name + ". " + FR.coach.name + " takes over the " + t.mascot + " for the " + FR.year + " season.");
  frSave();
}
function makeStaff(role, stars) {
  var tr = pk(STAFF_TRAITS[role]);
  return { n: pk(COACH_FIRST) + " " + pk(COACH_LAST), r: cl(Math.round(stars), 1, 5), tr: tr[0], td: tr[1], sal: cl(Math.round(stars), 1, 5) * 1200, yrs: 1 + Math.floor(frRng() * 3) };
}

// ---- schedule: 3 non-region weeks, then 7 region weeks ----
var ZONE = { "6A": [0, 1, 2, 3], "5A": [0, 1, 2, 2, 2, 2, 3, 3] };
function zoneOf(t) { return ZONE[t.cls][t.reg - 1]; }
function makeSchedule() {
  FR.sched = []; for (var w = 0; w < 10; w++) FR.sched.push([]);
  var played = {}; var key = function (a, b) { return a < b ? a + "-" + b : b + "-" + a; };
  // region round robin -> weeks 3..9
  var regs = {}; FR.teams.forEach(function (t) { var k = t.cls + t.reg; (regs[k] = regs[k] || []).push(t.id); });
  for (var k in regs) {
    var ids = shuffleR(regs[k].slice()); if (ids.length % 2) ids.push(-1);
    var n = ids.length, rounds = n - 1;
    for (var r = 0; r < rounds; r++) {
      for (var i = 0; i < n / 2; i++) { var a = ids[i], b = ids[n - 1 - i]; if (a < 0 || b < 0) continue;
        var home = (r + i) % 2 ? a : b, away = home === a ? b : a;
        FR.sched[3 + r].push({ h: home, a: away, reg: true, hs: 0, as: 0, done: false }); played[key(a, b)] = 1; }
      ids.splice(1, 0, ids.pop());
    }
  }
  // non-region weeks 0..2: greedy pairing, prefer same zone, never a region-mate
  for (var w2 = 0; w2 < 3; w2++) {
    var free = shuffleR(FR.teams.map(function (t) { return t.id; })), used = {};
    free.forEach(function (a) {
      if (used[a]) return; var ta = tm(a), best = -1, bs = -1e9;
      free.forEach(function (b) { if (b === a || used[b] || played[key(a, b)]) return; var tb = tm(b); if (tb.cls === ta.cls && tb.reg === ta.reg) return;
        var sc = (zoneOf(ta) === zoneOf(tb) ? 10 : 0) + (ta.cls === tb.cls ? 3 : 0) + frRng() * 4; if (sc > bs) { bs = sc; best = b; } });
      if (best >= 0) { used[a] = used[best] = 1; played[key(a, best)] = 1; var hm = frRng() < 0.5; FR.sched[w2].push({ h: hm ? a : best, a: hm ? best : a, reg: false, hs: 0, as: 0, done: false }); }
    });
  }
}
function gameOf(id, w) { var g = (FR.sched[w] || []).filter(function (x) { return x.h === id || x.a === id; }); return g[0] || null; }
function userSchedule() { var out = []; for (var w = 0; w < FR.sched.length; w++) out.push({ w: w, g: gameOf(FR.user, w) }); return out; }

// ---- standings ----
function resetRecords() { FR.teams.forEach(function (t) { t.w = t.l = t.rw = t.rl = t.pf = t.pa = t.strk = 0; }); }
function applyGame(g) {
  var h = tm(g.h), a = tm(g.a), hw = g.hs > g.as;
  h.pf += g.hs; h.pa += g.as; a.pf += g.as; a.pa += g.hs;
  if (!g.po) { if (hw) { h.w++; a.l++; } else { a.w++; h.l++; } if (g.reg) { if (hw) { h.rw++; a.rl++; } else { a.rw++; h.rl++; } } }
  h.strk = hw ? (h.strk > 0 ? h.strk + 1 : 1) : (h.strk < 0 ? h.strk - 1 : -1);
  a.strk = !hw ? (a.strk > 0 ? a.strk + 1 : 1) : (a.strk < 0 ? a.strk - 1 : -1);
}
function regionTeams(cls, reg) { return FR.teams.filter(function (t) { return t.cls === cls && t.reg === reg; }); }
function h2hWin(a, b) { var r = 0; FR.sched.forEach(function (wk) { wk.forEach(function (g) { if (!g.done || !g.reg) return;
  if (g.h === a && g.a === b) r += g.hs > g.as ? 1 : -1; if (g.h === b && g.a === a) r += g.as > g.hs ? 1 : -1; }); }); return r; }
function standings(cls, reg) {
  return regionTeams(cls, reg).sort(function (x, y) { return (y.rw - y.rl) - (x.rw - x.rl) || -h2hWin(x.id, y.id) || (y.w - y.l) - (x.w - x.l) || (y.pf - y.pa) - (x.pf - x.pa) || y.ovr - x.ovr; });
}
function nRegions(cls) { return AL_LEAGUE[cls].length; }
function power(t) { var gp = t.w + t.l; return (gp ? (t.w / gp) * 34 + cl((t.pf - t.pa) / gp, -30, 30) * 0.5 : 0) + t.ovr * 0.6 + t.prestige * 0.05; }
function updatePoll() { ["5A", "6A"].forEach(function (cls) { FR.poll[cls] = FR.teams.filter(function (t) { return t.cls === cls; }).sort(function (a, b) { return power(b) - power(a); }).slice(0, 10).map(function (t) { return t.id; }); }); }
function rankOf(id) { var t = tm(id), i = FR.poll[t.cls].indexOf(id); return i < 0 ? 0 : i + 1; }
function regionPlace(id) { var t = tm(id), s = standings(t.cls, t.reg); return s.indexOf(t) + 1; }
function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

// ---- game simulation (play by play) ----
function simGame(hId, aId, opt) {
  opt = opt || {};
  var T = [hId, aId], U = [unitRatings(hId), unitRatings(aId)], LU = [lineupOf(hId), lineupOf(aId)];
  var home = opt.neutral ? 0 : 1.5; U[0].pass += home; U[0].run += home; U[0].rush += home * 0.6; U[0].cov += home * 0.6;
  var lines = {}, plays = [], scoring = [], sc = [0, 0], ts = [teamBox(), teamBox()];
  function L(p) { return lines[p.id] || (lines[p.id] = { t: p.t, n: pnm(p), pos: p.pos, num: p.num, pa: 0, pc: 0, py: 0, ptd: 0, pint: 0, ra: 0, ry: 0, rtd: 0, rec: 0, rcy: 0, rctd: 0, tk: 0, sk: 0, int: 0, fgm: 0, fga: 0 }); }
  function st(side, pos, i) { var arr = LU[side][pos].filter(function (p) { return !p.inj; }); return arr[Math.min(i || 0, arr.length - 1)] || LU[side][pos][0]; }
  function wpick(list) { var tot = 0; list.forEach(function (x) { tot += x[1]; }); var r = frRng() * tot; for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; } return list[0][0]; }
  function tackler(side, kind) {
    var d = 1 - side, pool = [];
    LU[d].LB.slice(0, 3).forEach(function (p) { pool.push([p, kind === "run" ? 4 : 2.5]); });
    LU[d].DL.slice(0, 4).forEach(function (p) { pool.push([p, kind === "run" ? 1.8 : 0.6]); });
    LU[d].S.slice(0, 2).forEach(function (p) { pool.push([p, kind === "run" ? 1.6 : 2.6]); });
    LU[d].CB.slice(0, 2).forEach(function (p) { pool.push([p, kind === "run" ? 0.9 : 3]); });
    return wpick(pool.filter(function (x) { return x[0] && !x[0].inj; }));
  }
  var q = 1, clock = 720, poss = frRng() < 0.5 ? 0 : 1, firstRecv = poss, yl = 25, down = 1, togo = 10, ot = false, otPoss = 0, otStart = 0, ended = false, drive = 0;
  function fmtClock() { var m = Math.floor(clock / 60), s = Math.floor(clock % 60); return m + ":" + (s < 10 ? "0" : "") + s; }
  function spot() { var t = tm(T[poss]), o = tm(T[1 - poss]); return yl === 50 ? "the 50" : yl < 50 ? t.abbr + " " + yl : o.abbr + " " + (100 - yl); }
  function log(txt, kind) { if (!opt.pbp) return; plays.push({ q: ot ? 5 : q, c: ot ? "" : fmtClock(), p: poss, yl: yl, d: down, tg: togo, x: txt, k: kind || "", h: sc[0], a: sc[1], dr: drive }); }
  function score(pts, txt, kind) { sc[poss] += pts; scoring.push({ q: ot ? 5 : q, c: ot ? "" : fmtClock(), t: T[poss], x: txt, h: sc[0], a: sc[1] }); log(txt, kind || "score"); }
  function kickoff(toSide) { poss = toSide; drive++; var ret = 22 + Math.floor(frRng() * 14); if (frRng() < 0.004) { var rr = st(poss, "WR", 2) || st(poss, "RB", 0); yl = 100; score(6, rr ? pnm(rr) + " returns the kickoff for a touchdown!" : "Kickoff return touchdown!", "td"); pat(); kickoff(1 - poss); return; }
    if (frRng() < 0.18) ret = 20; yl = ret; down = 1; togo = 10; log(tm(T[poss]).abbr + " starts at " + spot() + " after the kickoff.", "ko"); }
  function pat() {
    var k = st(poss, "K", 0), trailing = sc[poss] - sc[1 - poss];
    var go2 = (q === 4 && clock < 300 && (trailing === -1 || trailing === -2 || trailing === 5)) || ot && otPoss > 2;
    if (go2) { var ok = frRng() < 0.45 + (U[poss].off - U[1 - poss].def) / 200; if (ok) score(2, "Two-point try is good.", "pat"); else log("Two-point try fails.", "pat"); return; }
    var mk = frRng() < 0.86 + (k ? (k.a.kck - 60) / 300 : 0); if (mk) { sc[poss] += 1; scoring[scoring.length - 1].h = sc[0]; scoring[scoring.length - 1].a = sc[1]; log("PAT is good.", "pat"); } else log("PAT is no good.", "pat");
  }
  function changePoss(newYl) { poss = 1 - poss; yl = cl(newYl, 1, 99); down = 1; togo = Math.min(10, 100 - yl); drive++; }
  function useClock(s) { if (ot) return; clock -= s; }
  function endQuarterCheck() {
    if (ot || clock > 0) return;
    if (q === 2) { q = 3; clock = 720; log("Halftime.", "q"); kickoff(1 - firstRecv); return; }
    if (q === 4) { if (sc[0] !== sc[1]) { ended = true; return; } startOT(); return; }
    q++; clock = 720; log("End of quarter " + (q - 1) + ".", "q");
  }
  function startOT() { ot = true; otPoss = 0; otStart = frRng() < 0.5 ? 0 : 1; log("Overtime. Each team starts at the 10.", "q"); otSeries(); }
  function otSeries() { poss = (otStart + otPoss) % 2; yl = 90; down = 1; togo = 10; drive++; }
  function otAfter() { otPoss++; if (otPoss % 2 === 0 && sc[0] !== sc[1]) { ended = true; return; } if (otPoss > 12) { if (sc[0] === sc[1]) sc[frRng() < 0.5 ? 0 : 1] += 3; ended = true; return; } otSeries(); }
  function driveOver(newYlForOther) { if (ot) { otAfter(); return; } changePoss(newYlForOther); }
  log(tm(T[firstRecv]).abbr + " receives the opening kickoff.", "ko"); kickoff(firstRecv);
  var guard = 0;
  while (!ended && guard++ < 400) {
    var off = poss, def = 1 - poss, uo = U[off], ud = U[def], lead = sc[off] - sc[def], late = q === 4 && clock < 360;
    // fourth down
    if (down === 4) {
      var k = st(off, "K", 0), dist = 100 - yl + 17, rng = 30 + (k ? k.a.kck * 0.18 : 10);
      var goFor = (togo <= 2 && yl >= 45) || (late && lead < 0) || (ot) || (togo <= 1 && yl >= 30 && frRng() < 0.3);
      if (ot && dist <= rng && !(lead < -3)) goFor = false;
      if (!goFor) {
        if (dist <= rng && yl >= 55) {
          var pm = cl(0.95 - (dist - 20) * 0.022 + (k ? (k.a.kck - 60) / 250 : 0), 0.15, 0.97);
          useClock(5); if (k) L(k).fga++; ts[off].fga++;
          if (frRng() < pm) { if (k) L(k).fgm++; ts[off].fgm++; score(3, (k ? pnm(k) : "Kicker") + " hits a " + dist + "-yard field goal.", "fg"); if (ot) { otAfter(); } else kickoff(def); }
          else { log((k ? pnm(k) : "Kicker") + " misses from " + dist + " yards.", "miss"); driveOver(100 - Math.max(yl, 20)); }
          endQuarterCheck(); continue;
        }
        var net = 30 + Math.floor(frRng() * 14) + (k ? Math.round((k.a.kck - 55) / 6) : 0); var land = yl + net; useClock(8);
        if (land >= 100) { log("Punt into the end zone. Touchback.", "punt"); driveOver(20); } else { log("Punt, " + net + " yards.", "punt"); driveOver(100 - land); }
        endQuarterCheck(); continue;
      }
    }
    var passP = 0.42 + (uo.pass - uo.run) / 160 + (down === 3 && togo >= 6 ? 0.32 : 0) + (togo <= 2 ? -0.2 : 0) + (late && lead < 0 ? 0.25 : 0) + (late && lead > 0 ? -0.25 : 0);
    var desc = "", gain = 0, kind = "", rcv = null, car = null, isPass = false;
    if (frRng() < cl(passP, 0.1, 0.92)) {
      var qb = st(off, "QB", 0);
      var sackP = cl(0.055 + (ud.rush - uo.pass) / 380, 0.02, 0.16);
      if (frRng() < sackP) {
        var sk = wpick(LU[def].DL.slice(0, 4).map(function (p) { return [p, 3]; }).concat(LU[def].LB.slice(0, 3).map(function (p) { return [p, 1.2]; })).filter(function (x) { return x[0]; }));
        gain = -(3 + Math.floor(frRng() * 7)); L(qb).ra++; L(qb).ry += gain; ts[off].ry += gain; if (sk) { L(sk).sk++; L(sk).tk++; }
        desc = pnm(qb) + " is sacked by " + (sk ? pnm(sk) : "the defense") + " for a loss of " + (-gain) + "."; kind = "sack"; useClock(30);
      } else {
        var tgts = [[st(off, "WR", 0), 3.2], [st(off, "WR", 1), 2.5], [st(off, "WR", 2), 1.6], [st(off, "TE", 0), 1.4], [st(off, "RB", 0), 1.1]].filter(function (x) { return x[0]; });
        tgts.forEach(function (x) { x[1] *= 0.6 + x[0].ov / 120; });
        var tg = wpick(tgts); rcv = tg; L(qb).pa++; ts[off].pa++;
        var compP = cl(0.585 + (uo.pass - ud.cov) / 220 + (qb.a.thr - 60) / 400 + (tg.a.hnd - 60) / 500 - (togo > 12 ? 0.06 : 0), 0.32, 0.82);
        if (frRng() < compP) {
          var base = 4 + Math.floor(frRng() * 9) + (togo > 8 ? Math.floor(frRng() * 6) : 0);
          var big = frRng() < cl(0.1 + (uo.pass - ud.cov) / 300 + (tg.a.spd - 65) / 400, 0.03, 0.2); if (big) base += 12 + Math.floor(frRng() * 35);
          isPass = true; gain = Math.min(base, 100 - yl); L(qb).pc++; L(qb).py += gain; L(tg).rec++; L(tg).rcy += gain; ts[off].pc++; ts[off].py += gain;
          var tk = gain < 100 - yl ? tackler(off, "pass") : null; if (tk) L(tk).tk++;
          desc = pnm(qb) + " pass complete to " + pnm(tg) + " for " + gain + " yard" + (gain === 1 ? "" : "s") + (tk ? " (" + pnm(tk) + ")" : "") + "."; useClock(32); kind = big ? "big" : "";
        } else {
          var intP = cl(0.035 + (ud.cov - uo.pass) / 500 - (qb.a.awr - 60) / 600 + (late && lead < 0 ? 0.03 : 0), 0.01, 0.09);
          if (frRng() < intP / (1 - compP + 0.01) * 0.9) {
            var pkr = wpick([[st(def, "CB", 0), 3], [st(def, "CB", 1), 2.5], [st(def, "S", 0), 2.5], [st(def, "S", 1), 2], [st(def, "LB", 0), 1]].filter(function (x) { return x[0]; }));
            L(qb).pint++; ts[off].int++; if (pkr) L(pkr).int++;
            var at = yl + 8 + Math.floor(frRng() * 12); desc = pnm(qb) + " pass intended for " + pnm(tg) + " is INTERCEPTED by " + (pkr ? pnm(pkr) : "the defense") + "!"; kind = "to";
            useClock(14); log(desc, kind);
            if (!ot && frRng() < 0.06) { changePoss(100); score(6, (pkr ? pnm(pkr) : "Defender") + " returns the interception for a touchdown!", "td"); pat(); kickoff(1 - poss); endQuarterCheck(); continue; }
            driveOver(100 - Math.min(at, 99)); endQuarterCheck(); continue;
          }
          desc = pnm(qb) + " pass incomplete, intended for " + pnm(tg) + "."; useClock(7);
        }
      }
    } else {
      var rb1 = st(off, "RB", 0), rb2 = st(off, "RB", 1), qb2 = st(off, "QB", 0);
      car = wpick([[rb1, 7], [rb2, 1.4], [qb2, 0.7 + (qb2 ? qb2.a.spd - 50 : 0) / 18]].filter(function (x) { return x[0]; }));
      var mean = 4.2 + (uo.run - ud.rund) / 14 + (car.a.spd - 65) / 40 + (togo <= 2 ? -0.6 : 0);
      gain = Math.round(mean + rn() * 3.2);
      if (frRng() < cl(0.035 + (uo.run - ud.rund) / 400 + (car.a.spd - 65) / 500, 0.01, 0.1)) gain += 10 + Math.floor(frRng() * 45);
      gain = cl(gain, -5, 100 - yl);
      L(car).ra++; L(car).ry += gain; ts[off].ra++; ts[off].ry += gain;
      if (frRng() < 0.012) { var ftk = tackler(off, "run"); if (ftk) L(ftk).tk++; desc = pnm(car) + " runs for " + gain + " and FUMBLES! Recovered by " + tm(T[def]).abbr + "."; kind = "to"; useClock(30); yl += gain; log(desc, kind); driveOver(100 - cl(yl, 1, 99)); endQuarterCheck(); continue; }
      var rtk = gain < 100 - yl ? tackler(off, "run") : null; if (rtk) L(rtk).tk++;
      var dir = pk(["up the middle", "off left tackle", "off right tackle", "around left end", "around right end"]);
      desc = pnm(car) + " runs " + dir + " for " + (gain < 0 ? "a loss of " + (-gain) : gain === 0 ? "no gain" : gain + " yard" + (gain === 1 ? "" : "s")) + (rtk ? " (" + pnm(rtk) + ")" : "") + "."; useClock(36);
      kind = gain >= 15 ? "big" : "";
    }
    yl += gain;
    if (yl >= 100) {
      if (isPass) { L(st(off, "QB", 0)).ptd++; if (rcv) L(rcv).rctd++; } else if (car) L(car).rtd++;
      log(desc, kind); score(6, "TOUCHDOWN " + tm(T[off]).name + "! " + desc.replace(/ \([^)]*\)\./, "."), "td");
      pat(); if (ot) otAfter(); else kickoff(def); endQuarterCheck(); continue;
    }
    if (yl <= 0) { log(desc, kind); poss = def; score(2, "Safety! " + tm(T[def]).name + " scores two.", "score"); poss = off; if (ot) otAfter(); else kickoff(def); endQuarterCheck(); continue; }
    togo -= gain;
    if (togo <= 0) { down = 1; togo = Math.min(10, 100 - yl); desc += " First down."; ts[off].fd++; } else down++;
    log(desc, kind);
    if (down > 4) { log("Turnover on downs.", "to"); driveOver(100 - yl); }
    endQuarterCheck();
  }
  // injuries for this game
  var injured = [];
  [0, 1].forEach(function (side) { starters(T[side]).forEach(function (p) {
    var ch = 0.011 * (isUser(p.t) ? (1 - FR.fac.practice * 0.08 - (FR.staff.SC && FR.staff.SC.tr === "Injury Prevention" ? 0.25 : 0) + (FR.practice === "conditioning" ? 0.15 : 0)) : 1);
    if (!opt.noInj && frRng() < ch) { p.inj = 1 + Math.floor(frRng() * 4); injured.push(p.id); } }); });
  return { hs: sc[0], as: sc[1], lines: lines, plays: plays, scoring: scoring, ts: ts, inj: injured };
}
function teamBox() { return { pa: 0, pc: 0, py: 0, ra: 0, ry: 0, int: 0, fd: 0, fgm: 0, fga: 0 }; }

// apply a finished game result to players/teams/records
function recordGame(g, res, w) {
  g.hs = res.hs; g.as = res.as; g.done = true;
  var tops = [];
  for (var pid in res.lines) {
    var ln = res.lines[pid], p = PL(pid); if (!p) continue;
    var s = p.st; s.gp++; ["pa", "pc", "py", "ptd", "pint", "ra", "ry", "rtd", "rec", "rcy", "rctd", "tk", "sk", "int", "fgm", "fga"].forEach(function (k) { s[k] += ln[k] || 0; });
    tops.push([pid, ln.py + ln.ry + ln.rcy + (ln.ptd + ln.rtd + ln.rctd) * 20 + ln.tk * 4 + ln.sk * 15 + ln.int * 25]);
  }
  tops.sort(function (a, b) { return b[1] - a[1]; });
  g.top = tops.slice(0, 3).map(function (x) { return x[0]; });
  g.ts = res.ts;
  var userIn = g.h === FR.user || g.a === FR.user;
  if (userIn) { g.lines = res.lines; g.scoring = res.scoring; if (res.plays && res.plays.length) { FR.sched.forEach(function (wk) { wk.forEach(function (x) { delete x.plays; }); }); if (FR.po) poGames().forEach(function (x) { delete x.plays; }); g.plays = res.plays; } updateRecords(g); }
  applyGame(g);
  if (res.inj) res.inj.forEach(function (pid) { var p = PL(pid); if (p && p.t === FR.user) news("injury", pnm(p) + " (" + p.pos + ") was hurt against " + tm(g.h === FR.user ? g.a : g.h).name + " and will miss " + p.inj + " week" + (p.inj > 1 ? "s" : "") + "."); });
  if (userIn) gameNews(g, w);
}
function gameNews(g, w) {
  var us = g.h === FR.user, my = us ? g.hs : g.as, th = us ? g.as : g.hs, opp = tm(us ? g.a : g.h), me = tm(FR.user);
  var top = g.top && g.top[0] ? PL(g.top[0]) : null, ln = top && g.lines ? g.lines[top.id] : null, line = "";
  if (ln) { if (ln.py > 120) line = pnm(top) + " threw for " + ln.py + " yards and " + ln.ptd + " TD."; else if (ln.ry > 80) line = pnm(top) + " ran for " + ln.ry + " yards."; else if (ln.rcy > 70) line = pnm(top) + " caught " + ln.rec + " passes for " + ln.rcy + " yards."; else if (ln.tk) line = pnm(top) + " had " + ln.tk + " tackles."; }
  var rk = rankOf(opp.id);
  var hl = (my > th ? (rk && rk <= 5 ? "Upset alert: " : "") + me.name + " beats " + (rk ? "No. " + rk + " " : "") + opp.name + " " + my + "-" + th : me.name + " falls to " + (rk ? "No. " + rk + " " : "") + opp.name + " " + th + "-" + my) + ". " + line;
  news(my > th ? "win" : "loss", hl);
}

// ---- weekly loop ----
function curGames() { if (FR.phase === "regular") return FR.sched[FR.week] || []; if (FR.phase === "playoffs") return poGames(); return []; }
function userGameNow() { var gs = curGames(); for (var i = 0; i < gs.length; i++) if (gs[i].h === FR.user || gs[i].a === FR.user) return gs[i]; return null; }
function simUserNow(pbp) { var g = userGameNow(); if (!g || g.done) return null; var res = simGame(g.h, g.a, { pbp: pbp, neutral: g.neutral }); return { g: g, res: res }; }
function advanceWeek() {
  if (FR.phase !== "regular" && FR.phase !== "playoffs") return;
  var w = FR.week, gs = curGames();
  gs.forEach(function (g) { if (!g.done && g.h >= 0 && g.a >= 0) { var res = simGame(g.h, g.a, { pbp: g.h === FR.user || g.a === FR.user, neutral: g.neutral }); recordGame(g, res, w); } });
  weeklyUpkeep(gs);
  if (FR.phase === "regular") {
    FR.week++;
    if (FR.week >= FR.sched.length) startPlayoffs();
  } else {
    poAdvance();
  }
  frSave();
}
function weeklyUpkeep(gs) {
  FR.teams.forEach(function (t) { teamPlayers(t.id).forEach(function (p) { if (p.inj > 0 && !(p.t === FR.user && FR.practice === "light" && frRng() < 0.5)) p.inj--; else if (p.inj > 0) p.inj = Math.max(0, p.inj - 2); if (p.fx > 0) p.fx = Math.max(0, p.fx - 1); }); });
  FR.teams.forEach(function (t) { refreshOvr(t.id); });
  // user money: gate + boosters - weekly staff share
  var ug = null; gs.forEach(function (g) { if (g.h === FR.user || g.a === FR.user) ug = g; });
  var t = tm(FR.user);
  if (ug) {
    if (ug.h === FR.user) { var hype = cl(0.55 + t.w * 0.04 + (rankOf(ug.a) ? 0.12 : 0) + (FR.phase === "playoffs" ? 0.2 : 0), 0.4, 1); var gate = Math.round((2600 + t.prestige * 20 + FR.fac.stadium * 700) * hype * (FR.phase === "playoffs" ? 1.3 : 1));
      FR.funds += gate; ledger("Gate vs " + tm(ug.a).abbr, gate); }
    var won = (ug.h === FR.user && ug.hs > ug.as) || (ug.a === FR.user && ug.as > ug.hs);
    var bo = Math.round(500 + t.prestige * 10 + (won ? 600 : 0) + Math.max(0, t.strk) * 120); FR.funds += bo; ledger("Booster club", bo);
    FR.coach.w += won ? 1 : 0; FR.coach.l += won ? 0 : 1; if (FR.phase === "playoffs") { if (won) FR.coach.pw++; else FR.coach.pl++; }
  }
  updatePoll();
  weeklyOffers();
  FR.scout.pts += 6 + (FR.staff.PD ? FR.staff.PD.r * 2 + (FR.staff.PD.tr === "Talent Evaluator" ? 4 : 0) : 0) + FR.fac.film;
  FR.filmLeft = 3 + Math.floor(FR.fac.film / 2);
  FR.scout.host = 2;
}
function ledger(txt, v) { FR.ledger.unshift({ y: FR.year, w: FR.week, x: txt, v: v }); if (FR.ledger.length > 60) FR.ledger.length = 60; }
function news(tag, txt) { FR.news.unshift({ y: FR.year, w: FR.phase === "playoffs" ? "P" + (FR.po ? FR.po.r + 1 : "") : FR.phase === "regular" ? FR.week + 1 : FR.phase === "offseason" ? "OFF" : "PRE", tag: tag, x: txt }); if (FR.news.length > 220) FR.news.length = 220; }
function startSeason() { FR.phase = "regular"; FR.week = 0; FR.practice = FR.practice || "balanced"; news("program", "Week 1 is here. " + tm(FR.user).name + " opens the " + FR.year + " season."); frSave(); }

// ---- playoffs (5A: top 4 per region, 32 teams; 6A: top 6 per region, 24 teams with byes) ----
function startPlayoffs() {
  FR.phase = "playoffs"; FR.po = { r: 0, b: {} };
  ["5A", "6A"].forEach(function (cls) {
    var nr = nRegions(cls), take = cls === "6A" ? 6 : 4, seeds = {};
    for (var r = 1; r <= nr; r++) seeds[r] = standings(cls, r).slice(0, take).map(function (t) { return t.id; });
    var rounds = [];
    if (cls === "5A") { // pairs of regions: (1,2) (3,4) (5,6) (7,8): 1v4, 2v3 cross
      var r1 = []; [[1, 2], [3, 4], [5, 6], [7, 8]].forEach(function (pr) { var A = seeds[pr[0]], B = seeds[pr[1]];
        r1.push(mk(A[0], B[3]), mk(B[1], A[2]), mk(B[0], A[3]), mk(A[1], B[2])); });
      rounds.push(r1);
    } else { // 6A: 1-2 seeds bye; 3v6, 4v5 cross-region (1v2, 3v4)
      var r1b = []; [[1, 2], [3, 4]].forEach(function (pr) { var A = seeds[pr[0]], B = seeds[pr[1]];
        r1b.push(mk(A[2], B[5]), mk(B[3], A[4]), mk(B[2], A[5]), mk(A[3], B[4])); });
      rounds.push(r1b);
      FR.po.bye6 = [[1, 2], [3, 4]].map(function (pr) { return [seeds[pr[1]][1], seeds[pr[0]][0], seeds[pr[0]][1], seeds[pr[1]][0]]; });
    }
    FR.po.b[cls] = { rounds: rounds, seeds: seeds, champ: -1 };
  });
  news("playoffs", "The AHSAA state playoffs are set. " + (inPlayoffs(FR.user) ? tm(FR.user).name + " is in the field." : tm(FR.user).name + " missed the playoffs."));
  frSave();
  function mk(h, a) { return { h: h, a: a, hs: 0, as: 0, done: false, po: true }; }
}
function inPlayoffs(id) { if (!FR.po) return false; var cls = tm(id).cls, b = FR.po.b[cls]; for (var r in b.seeds) if (b.seeds[r].indexOf(id) >= 0) return true; return false; }
function poGames() { var out = []; if (!FR.po) return out; ["5A", "6A"].forEach(function (cls) { var b = FR.po.b[cls]; if (b.rounds[FR.po.r]) out = out.concat(b.rounds[FR.po.r]); }); return out; }
function winnerOf(g) { return g.hs > g.as ? g.h : g.a; }
function poAdvance() {
  ["5A", "6A"].forEach(function (cls) {
    var b = FR.po.b[cls], cur = b.rounds[FR.po.r]; if (!cur) return;
    var ws = cur.map(winnerOf);
    if (cls === "6A" && FR.po.r === 0) { // second round: byes host first-round winners
      var nx = [], byes = FR.po.bye6;
      for (var h = 0; h < 2; h++) { var by = byes[h], w4 = ws.slice(h * 4, h * 4 + 4); for (var i = 0; i < 4; i++) nx.push(mkG(by[i], w4[i])); }
      b.rounds.push(nx);
    } else if (ws.length > 1) { var nx2 = []; for (var j = 0; j < ws.length; j += 2) { var a = ws[j], c = ws[j + 1]; var hi = power(tm(a)) >= power(tm(c)) ? a : c; nx2.push(mkG(hi, hi === a ? c : a, ws.length === 2)); } b.rounds.push(nx2); }
    else if (ws.length === 1) { b.champ = ws[0]; }
  });
  FR.po.r++;
  var done = FR.po.b["5A"].champ >= 0 && FR.po.b["6A"].champ >= 0;
  if (done) endSeason();
  function mkG(h, a, fin) { return { h: h, a: a, hs: 0, as: 0, done: false, po: true, neutral: !!fin }; }
}
function poRoundName(cls, r) { var n = FR.po.b[cls].rounds.length, names = cls === "6A" ? ["First Round", "Second Round", "Quarterfinals", "Semifinals", "State Championship"] : ["First Round", "Second Round", "Quarterfinals", "Semifinals", "State Championship"]; return names[r] || "Round " + (r + 1); }
function userAlive() { if (FR.phase !== "playoffs") return false; return !!userGameNow(); }

// ---- college offers ----
function playerScore(p) { var s = p.st; return s.py * 0.04 + s.ry * 0.09 + s.rcy * 0.09 + (s.ptd + s.rtd + s.rctd) * 4 + s.tk * 0.9 + s.sk * 4 + s.int * 6 + s.fgm * 2; }
function exposureOf(id) { return isUser(id) ? FR.exposure : tm(id).prestige * 0.55; }
function weeklyOffers() {
  var all = FR.pl;
  for (var pid in all) {
    var p = all[pid]; if (p.yr < 10 || p.pos === "K" && p.ov < 75) continue;
    if (p.yr === 12 && p.cm >= 0) continue;
    var ex = exposureOf(p.t), perf = cl(playerScore(p) / Math.max(1, p.st.gp) * 0.35, 0, 12);
    var val = p.ov * 0.7 + p.pot * 0.3 + perf + ex * 0.06 + p.fx + (p.yr === 10 ? -6 : 0) + (isUser(p.t) && FR.staff.PD && FR.staff.PD.tr === "College Connection" ? 3 : 0);
    var TH = [80, 84, 87, 90, 93], tier = val >= TH[4] ? 4 : val >= TH[3] ? 3 : val >= TH[2] ? 2 : val >= TH[1] ? 1 : val >= TH[0] ? 0 : -1; if (tier < 0) continue;
    var chance = 0.04 + (val - TH[tier]) * 0.008; if (p.of.length > 10) chance *= 0.3;
    if (frRng() < cl(chance, 0.015, 0.16)) { var t2 = tier - (frRng() < 0.45 ? 1 : 0); if (t2 < 0) t2 = 0; giveOffer(p, t2); }
    if (p.yr === 12 && p.of.length && p.cm < 0 && FR.phase === "regular" && FR.week >= 3 && frRng() < 0.09 + p.of.length * 0.01) commitPlayer(p);
  }
}
function seedOffers() { FR.quiet = true; for (var i = 0; i < 6; i++) weeklyOffers(); FR.quiet = false; }
function giveOffer(p, tier) {
  var opts = []; COLLEGES.forEach(function (c, i) { if (c[1] === tier && p.of.indexOf(i) < 0) opts.push(i); });
  if (!opts.length) return; var ci = pk(opts); p.of.push(ci);
  if (p.t === FR.user && !FR.quiet) { news("offer", pnm(p) + " (" + yrLabel(p.yr) + " " + p.pos + ") received an offer from " + COLLEGES[ci][0] + "."); FR.exposure = cl(FR.exposure + 0.1 + tier * 0.12, 0, 100); FR.newOffers = (FR.newOffers || 0) + 1; }
}
function bestOffer(p) { var b = -1; p.of.forEach(function (ci) { if (b < 0 || COLLEGES[ci][1] > COLLEGES[b][1] || (COLLEGES[ci][1] === COLLEGES[b][1] && frRng() < 0.3)) b = ci; }); return b; }
function commitPlayer(p) { p.cm = bestOffer(p); if (p.cm >= 0 && p.t === FR.user) news("commit", pnm(p) + " committed to " + COLLEGES[p.cm][0] + "!"); }
function sendFilm(pid) { var p = PL(pid); if (!p || FR.filmLeft <= 0 || FR.funds < 500) return false; FR.filmLeft--; FR.funds -= 500; ledger("Highlight film: " + pnm(p), -500); p.fx = Math.min(12, p.fx + 5); frSave(); return true; }
function offerTierCount() { var c = [0, 0, 0, 0, 0]; teamPlayers(FR.user).forEach(function (p) { p.of.forEach(function (ci) { c[COLLEGES[ci][1]]++; }); }); return c; }

// ---- feeder (8th graders) scouting ----
function genFeeder() {
  var t = tm(FR.user), n = 12 + Math.floor(frRng() * 5), board = [];
  var bonus = (FR.staff.PD && FR.staff.PD.tr === "Feeder Builder" ? 4 : 0) + FR.fac.locker * 0.4;
  for (var i = 0; i < n; i++) {
    var pos = pk(["QB", "RB", "WR", "WR", "TE", "OL", "OL", "OL", "DL", "DL", "LB", "LB", "CB", "CB", "S", "K"]);
    var tal = teamTalent(t) + rn() * 9 + bonus;
    board.push({ id: "f" + (FR.nid++), f: pk(FIRST), l: pk(LAST), pos: pos, tal: Math.round(tal), dev: frRng() < 0.15 ? 2 : frRng() < 0.3 ? 1 : 0, sc: 0, stay: Math.round(cl(72 + rn() * 12, 45, 99)), hosted: false, camp: false });
  }
  FR.scout = { pts: 12, board: board, host: 2 };
}
function feederRange(f) { var w = Math.round(15 * (1 - f.sc / 30)), proj = projOvr(f.tal); var lo = cl(proj - w, 20, 99), hi = cl(proj + w, 20, 99); return [lo, hi]; }
function projOvr(tal) { return r99((tal - 62) * 1.05 + 58); }
function scoutFeeder(id, full) { var f = FR.scout.board.filter(function (x) { return x.id === id; })[0]; if (!f) return; var need = full ? 30 - f.sc : Math.min(6, 30 - f.sc); if (need <= 0 || FR.scout.pts < need) return false; FR.scout.pts -= need; f.sc += need; frSave(); return true; }
function hostFeeder(id) { var f = FR.scout.board.filter(function (x) { return x.id === id; })[0]; if (!f || f.hosted || (FR.scout.host || 0) <= 0) return false; FR.scout.host--; f.hosted = true; f.stay = Math.min(99, f.stay + 8 + Math.floor(frRng() * 9)); frSave(); return true; }

// ---- end of season & offseason ----
var OFF_STEPS = ["awards", "signing", "graduation", "staff", "facilities", "feeder", "moveins", "training", "ready"];
var OFF_NAME = { awards: "Awards", signing: "Signing Day", graduation: "Graduation", staff: "Coaching Staff", facilities: "Facilities", feeder: "Freshman Class", moveins: "Move-ins", training: "Summer Training", ready: "Ready" };
function endSeason() {
  FR.phase = "offseason";
  var u = tm(FR.user), champ5 = FR.po.b["5A"].champ, champ6 = FR.po.b["6A"].champ, res = playoffResult(FR.user);
  FR.awards[FR.year] = makeAwards();
  if ((u.cls === "5A" ? champ5 : champ6) === FR.user) { FR.coach.tt++; u.prestige = cl(u.prestige + 6, 0, 100); news("title", tm(FR.user).name + " wins the " + FR.year + " Class " + u.cls + " state championship!"); }
  FR.hist.unshift({ y: FR.year, w: u.w, l: u.l, rw: u.rw, rl: u.rl, place: regionPlace(FR.user), res: res, c5: champ5, c6: champ6, rank: rankOf(FR.user) });
  FR.coach.seasons++;
  FR.teams.forEach(function (t) { var d = (t.w - t.l) * 0.5 + (inPlayoffs(t.id) ? 1 : -1); t.prestige = Math.round(cl(t.prestige + d * 0.8 + (t.prestige < 45 ? 0.6 : t.prestige > 80 ? -0.6 : 0), 5, 99));
    t.hist.unshift({ y: FR.year, w: t.w, l: t.l }); if (t.hist.length > 12) t.hist.length = 12; });
  FR.coach.rep = cl(FR.coach.rep + (u.w - u.l) * 0.8 + (res.indexOf("Champ") >= 0 ? 10 : 0), 0, 100);
  seasonRecords();
  news("champions", "State champions: " + tm(champ6).name + " (6A) and " + tm(champ5).name + " (5A).");
  FR.off = { step: 0, signed: [], grads: [], moveins: null, pitches: 3, trainLog: [], staffPool: null, freshLog: [] };
  frSave();
}
function playoffResult(id) {
  if (!inPlayoffs(id)) return "Missed playoffs";
  var cls = tm(id).cls, b = FR.po.b[cls]; if (b.champ === id) return "State Champions";
  for (var r = 0; r < b.rounds.length; r++) for (var i = 0; i < b.rounds[r].length; i++) { var g = b.rounds[r][i]; if ((g.h === id || g.a === id) && g.done && winnerOf(g) !== id) return "Lost in " + poRoundName(cls, r); }
  return "Playoffs";
}
function makeAwards() {
  var out = { poy: {}, line: {}, coy: {}, allstate: {}, mrfb: null, region: [] };
  ["5A", "6A"].forEach(function (cls) {
    var ps = []; for (var id in FR.pl) { var p = FR.pl[id]; if (tm(p.t).cls === cls && p.st.gp) ps.push(p); }
    var val = function (p) { return playerScore(p) + p.ov * 1.5; };
    ps.sort(function (a, b) { return val(b) - val(a); });
    out.poy[cls] = ps[0] ? ps[0].id : null;
    var linemen = ps.filter(function (p) { return p.pos === "OL" || p.pos === "DL"; }); out.line[cls] = linemen[0] ? linemen[0].id : null;
    var teams = FR.teams.filter(function (t) { return t.cls === cls; }).sort(function (a, b) { return (b.w - b.l - b.prestige / 20) - (a.w - a.l - a.prestige / 20); }); out.coy[cls] = teams[0].id;
    var team = {}; POSL.forEach(function (pos) { team[pos] = ps.filter(function (p) { return p.pos === pos; }).slice(0, START[pos]).map(function (p) { return p.id; }); });
    out.allstate[cls] = team;
  });
  var srs = []; for (var id2 in FR.pl) { var q = FR.pl[id2]; if (q.yr === 12 && q.st.gp) srs.push(q); }
  srs.sort(function (a, b) { return playerScore(b) + b.ov * 1.5 - playerScore(a) - a.ov * 1.5; }); out.mrfb = srs[0] ? srs[0].id : null;
  var u = tm(FR.user), rp = []; regionTeams(u.cls, u.reg).forEach(function (t) { teamPlayers(t.id).forEach(function (p) { if (p.st.gp) rp.push(p); }); });
  rp.sort(function (a, b) { return playerScore(b) + b.ov - playerScore(a) - a.ov; });
  var rt = {}; POSL.forEach(function (pos) { rt[pos] = rp.filter(function (p) { return p.pos === pos; }).slice(0, START[pos]).map(function (p) { return p.id; }); }); out.region = rt;
  // store award names (players graduate later)
  out.names = {}; var add = function (pid) { if (pid && PL(pid)) out.names[pid] = { n: pnm(PL(pid)), t: PL(pid).t, pos: PL(pid).pos, yr: PL(pid).yr }; };
  ["5A", "6A"].forEach(function (c) { add(out.poy[c]); add(out.line[c]); POSL.forEach(function (pos) { out.allstate[c][pos].forEach(add); }); }); add(out.mrfb); POSL.forEach(function (pos) { rt[pos].forEach(add); });
  var mine = 0; POSL.forEach(function (pos) { ["5A", "6A"].forEach(function (c) { out.allstate[c][pos].forEach(function (pid) { if (PL(pid) && PL(pid).t === FR.user) mine++; }); }); });
  if (mine) { FR.exposure = cl(FR.exposure + mine * 1.5, 0, 100); news("awards", mine + " " + tm(FR.user).mascot + " made the All-State team."); }
  return out;
}
function offNext() {
  var step = OFF_STEPS[FR.off.step];
  if (step === "awards") doSigningPrep();
  if (step === "signing") doGraduation();
  if (step === "graduation") prepStaff();
  if (step === "feeder") doFeederEnroll(), prepMoveins();
  if (step === "moveins") { resolveMoveins(); doTraining(); }
  if (step === "ready") { startNewYear(); return; }
  FR.off.step++;
  frSave();
}
function doSigningPrep() { // seniors sign
  var signed = [], bonus = 0;
  for (var id in FR.pl) { var p = FR.pl[id]; if (p.yr !== 12) continue; if (p.cm < 0 && p.of.length) commitPlayer(p);
    if (p.cm >= 0 && p.t === FR.user) { var tier = COLLEGES[p.cm][1]; signed.push({ id: p.id, n: pnm(p), pos: p.pos, c: p.cm, b: TIER_BONUS[tier] }); bonus += TIER_BONUS[tier]; } }
  FR.off.signed = signed;
  FR.signHist = FR.signHist || []; FR.signHist.unshift({ y: FR.year, s: signed }); if (FR.signHist.length > 30) FR.signHist.length = 30;
  if (bonus) { FR.funds += bonus; ledger("Signing Day booster bonus", bonus); }
  var t = tm(FR.user), p4 = signed.filter(function (s) { return COLLEGES[s.c][1] >= 3; }).length;
  t.prestige = cl(t.prestige + signed.length * 0.4 + p4 * 0.8, 0, 99); FR.exposure = cl(FR.exposure + signed.length * 0.8 + p4 * 1.5, 0, 100);
  if (signed.length) news("signing", signed.length + " " + t.mascot + " signed college scholarships on Signing Day. Boosters chipped in " + money(bonus) + ".");
}
function doGraduation() {
  var grads = [];
  FR.teams.forEach(function (t) {
    FR.tm[t.id] = FR.tm[t.id].filter(function (pid) { var p = PL(pid); if (p.yr >= 12) { if (t.id === FR.user) { grads.push({ n: pnm(p), pos: p.pos, ov: p.ov, c: p.cm }); careerRecords(p); } delete FR.pl[pid]; return false; } return true; });
  });
  FR.off.grads = grads;
}
function prepStaff() {
  STAFF_ROLES.forEach(function (r) { var s = FR.staff[r]; if (s) s.yrs--; });
  // poaching: good coordinators can leave
  STAFF_ROLES.forEach(function (r) { var s = FR.staff[r], t = tm(FR.user); if (s && s.r >= 4 && t.w >= 9 && frRng() < 0.3) { news("staff", s.n + " (" + STAFF_NAME[r] + ") left to become a head coach."); FR.staff[r] = null; } });
  var pool = {}; STAFF_ROLES.forEach(function (r) { pool[r] = [0, 1, 2].map(function () { return makeStaff(r, 1 + frRng() * 4.5); }); }); FR.off.staffPool = pool;
}
function hireStaff(role, i) { var c = FR.off.staffPool[role][i]; if (!c) return false; FR.staff[role] = c; FR.off.staffPool[role].splice(i, 1); news("staff", c.n + " hired as " + STAFF_NAME[role] + "."); frSave(); return true; }
function staffCost() { var s = 0; STAFF_ROLES.forEach(function (r) { if (FR.staff[r]) s += FR.staff[r].sal; }); return s; }
function facCost(k) { return (FR.fac[k] + 1) * 9000; }
function buyFac(k) { if (FR.fac[k] >= 5) return false; var c = facCost(k); if (FR.funds < c) return false; FR.funds -= c; FR.fac[k]++; ledger(FAC_NAME[k] + " upgrade", -c); news("program", FAC_NAME[k] + " upgraded to level " + FR.fac[k] + "."); frSave(); return true; }
function doFeederEnroll() {
  var log = [];
  FR.scout.board.forEach(function (f) { var stays = frRng() * 100 < f.stay; if (stays) { var p = newPlayer(f.pos, 9, f.tal, FR.user); p.f = f.f; p.l = f.l; p.dev = f.dev; p.nw = 1; FR.tm[FR.user].push(p.id); log.push({ n: pnm(p), pos: p.pos, ov: p.ov, ok: true }); } else log.push({ n: f.f + " " + f.l, pos: f.pos, ok: false }); });
  FR.off.freshLog = log;
  FR.teams.forEach(function (t) { // fill everyone to roster size with freshmen
    POSL.forEach(function (pos) { var have = teamPlayers(t.id).filter(function (p) { return p.pos === pos; }).length; for (var i = have; i < MIX[pos]; i++) { var p = newPlayer(pos, 9, teamTalent(t) + rn() * 7 - 3, t.id); p.nw = 1; FR.tm[t.id].push(p.id); } });
  });
}
function prepMoveins() {
  var t = tm(FR.user), n = 3 + Math.round(FR.exposure / 18 + t.prestige / 25 + FR.fac.locker * 0.6), list = [];
  var rivals = FR.teams.filter(function (x) { return x.id !== FR.user && zoneOf(x) === zoneOf(t); });
  for (var i = 0; i < n; i++) {
    var pos = pk(POSL.slice(0, 9)), yr = pk([10, 10, 11, 11, 11, 12]), tal = 64 + rn() * 8 + FR.exposure * 0.1 + t.prestige * 0.04;
    var others = shuffleR(rivals.slice()).slice(0, 2 + Math.floor(frRng() * 2)).map(function (x) { return x.id; });
    var p = newPlayer(pos, yr - 1, tal, -1); delete FR.pl[p.id]; // rated as of last season; summer training happens after they arrive
    list.push({ id: "m" + (FR.nid++), pd: p, f: p.f, l: p.l, pos: pos, yr: yr, tal: Math.round(tal), ov: p.ov, from: pk(["Georgia", "Mississippi", "Tennessee", "Florida", "Texas", "Out of state", "Across town", "Louisiana", "North Carolina"]), others: others, pitched: false, res: null });
  }
  FR.off.moveins = list; FR.off.pitches = 3;
}
function projNow(tal, yr) { return r99((tal - 62) * 1.05 + 58 - (12 - yr) * 6.5 * 1.05); }
function moveinOdds(m) {
  var me = appeal(FR.user) * (m.pitched ? 1.7 : 1), tot = me;
  m.others.forEach(function (id) { tot += appeal(id); });
  return Math.round(me / tot * 100);
}
function appeal(id) { var t = tm(id), base = 10 + t.prestige * 0.6 + (t.w - t.l) * 1.5; if (isUser(id)) { base += FR.exposure * 0.5 + FR.fac.locker * 4 + FR.coach.rep * 0.1; var c = offerTierCount(); base += c[4] * 2 + c[3]; } else base += t.prestige * 0.3; return Math.max(4, base); }
function pitchMovein(id) { var m = FR.off.moveins.filter(function (x) { return x.id === id; })[0]; if (!m || m.pitched || FR.off.pitches <= 0) return false; FR.off.pitches--; m.pitched = true; frSave(); return true; }
function resolveMoveins() {
  (FR.off.moveins || []).forEach(function (m) {
    var r = frRng() * 100, odds = moveinOdds(m), dest = r < odds ? FR.user : pk(m.others), p = m.pd;
    p.t = dest; FR.pl[p.id] = p; FR.tm[dest].push(p.id); m.res = dest; m.pd = null; m.pid = p.id;
    if (dest === FR.user) news("movein", pnm(p) + " (" + yrLabel(m.yr) + " " + m.pos + ") moved into the " + tm(FR.user).name + " zone.");
  });
  FR.teams.forEach(function (t) { if (t.id !== FR.user && frRng() < 0.35) { var pos = pk(POSL.slice(0, 9)); var p = newPlayer(pos, pk([9, 10]), teamTalent(t) + rn() * 8, t.id); FR.tm[t.id].push(p.id); } });
  var mine = teamPlayers(FR.user);
  if (mine.length > 62) { var keep = {}; POSL.forEach(function (pos) { sortedAt(FR.user, pos).slice(0, START[pos] * 2).forEach(function (p) { keep[p.id] = 1; }); });
    var cut = mine.filter(function (p) { return !keep[p.id] && p.yr < 12; }).sort(function (a, b) { return (a.pot + a.ov) - (b.pot + b.ov); }).slice(0, mine.length - 62);
    cut.forEach(function (p) { FR.tm[FR.user].splice(FR.tm[FR.user].indexOf(p.id), 1); delete FR.pl[p.id]; });
    if (cut.length) news("program", cut.length + " deep reserves decided to focus on other sports. The roster is set at 62."); }
}
function doTraining() {
  var log = [];
  for (var id in FR.pl) {
    var p = FR.pl[id], user = p.t === FR.user, before = p.ov;
    if (p.nw) { delete p.nw; continue; }
    var gap = Math.max(0, p.pot - p.ov), base = gap * (p.yr <= 10 ? 0.42 : 0.5) + 1 + p.dev;
    if (user) { base += FR.fac.weight * 0.4 + (FR.staff.SC ? FR.staff.SC.r * 0.35 : 0) + (FR.staff.PD && FR.staff.PD.tr === "Position Guru" && p.yr <= 10 ? 1.5 : 0) + (FR.staff.OC && FR.staff.OC.tr === "QB Whisperer" && p.pos === "QB" ? 2 : 0); }
    ATTRS.forEach(function (k) { var w = WEIGHTS[p.pos][k] ? 1 : 0.5, g = base * w * (0.6 + frRng() * 0.8);
      if (user && FR.staff.SC) { if (k === "spd" && FR.staff.SC.tr === "Speed Coach") g += 1.5; if (k === "str" && FR.staff.SC.tr === "Iron Program") g += 1.5; }
      p.a[k] = r99(p.a[k] + g); });
    p.yr++; calcOvr(p); if (p.pot < p.ov) p.pot = p.ov; p.st = blankSt(); p.inj = 0; p.fx = 0; if (p.yr === 12) { /* senior offers carry */ }
    if (user && p.ov - before >= 6) log.push({ id: p.id, d: p.ov - before });
  }
  log.sort(function (a, b) { return b.d - a.d; }); FR.off.trainLog = log.slice(0, 12);
  FR.teams.forEach(function (t) { renumber(t.id); refreshOvr(t.id); });
}
function startNewYear() {
  FR.exposure = Math.round(FR.exposure * 0.82 + tm(FR.user).prestige * 0.08);
  FR.year++; FR.week = 0; FR.phase = "preseason"; FR.po = null; FR.off = null; FR.newOffers = 0;
  resetRecords(); fixDepth(); seedOffers(); makeSchedule(); FR.teams.forEach(function (t) { refreshOvr(t.id); }); updatePoll(); genFeeder();
  var cost = staffCost(); FR.funds -= cost; if (cost) ledger("Staff supplements", -cost);
  FR.sched.forEach(function (wk) { wk.forEach(function (g) { delete g.plays; }); });
  news("program", "The " + FR.year + " season is up next. Set your depth chart and practice plan.");
  frSave();
}
function positionChange(pid, pos) { var p = PL(pid); if (!p || p.t !== FR.user || POSL.indexOf(pos) < 0) return; p.pos = pos; calcOvr(p); fixDepth(); refreshOvr(FR.user); frSave(); }

// ---- records (user school) ----
var REC_KEYS = [["py", "Passing yards"], ["ptd", "Passing TDs"], ["ry", "Rushing yards"], ["rtd", "Rushing TDs"], ["rcy", "Receiving yards"], ["rec", "Receptions"], ["tk", "Tackles"], ["sk", "Sacks"], ["int", "Interceptions"]];
function setRec(book, k, v, n, extra) { if (!v) return; var cur = book[k]; if (!cur || v > cur.v) { book[k] = { v: v, n: n, y: FR.year, x: extra || "" }; return true; } }
function updateRecords(g) {
  var opp = tm(g.h === FR.user ? g.a : g.h).name;
  for (var pid in g.lines) { var ln = g.lines[pid]; if (ln.t !== FR.user) continue; REC_KEYS.forEach(function (rk) { if (setRec(FR.rec.g, rk[0], ln[rk[0]], ln.n, "vs " + opp) && FR.year > 2026) news("record", ln.n + " set a school single-game record: " + ln[rk[0]] + " " + rk[1].toLowerCase() + "."); }); }
  var pts = g.h === FR.user ? g.hs : g.as; setRec(FR.rec.t, "pts", pts, tm(FR.user).name, "vs " + opp);
}
function seasonRecords() { teamPlayers(FR.user).forEach(function (p) { REC_KEYS.forEach(function (rk) { setRec(FR.rec.s, rk[0], p.st[rk[0]], pnm(p)); }); ["py", "ptd", "ry", "rtd", "rcy", "rec", "tk", "sk", "int", "pa", "pc", "pint", "ra", "rctd", "fgm", "fga", "gp"].forEach(function (k) { p.cs[k] = (p.cs[k] || 0) + (p.st[k] || 0); }); });
  var u = tm(FR.user); setRec(FR.rec.t, "wins", u.w, u.name); }
function careerRecords(p) { REC_KEYS.forEach(function (rk) { setRec(FR.rec.c, rk[0], p.cs[rk[0]] || 0, pnm(p), (p.cs.gp || 0) + " games"); }); }

// ---- engine bridge (16-bit game) ----
var ENGINE_SLOTS = [["QB", 0, "QB"], ["RB", 0, "RB"], ["WR", 0, "WR"], ["WR", 1, "WR"], ["WR", 2, "WR"], ["TE", 0, "TE"], ["OL", 0, "LT"], ["OL", 1, "LG"], ["OL", 2, "C"], ["OL", 3, "RG"], ["OL", 4, "RT"],
  ["DL", 0, "DE"], ["DL", 1, "DT"], ["DL", 2, "DT"], ["DL", 3, "DE"], ["LB", 0, "LB"], ["LB", 1, "LB"], ["LB", 2, "LB"], ["CB", 0, "CB"], ["CB", 1, "CB"], ["S", 0, "FS"], ["S", 1, "SS"], ["K", 0, "K"]];
function engineTeam(id, isAway) {
  var t = tm(id), lu = lineupOf(id), roster = [], ids = [];
  var pw = function (p) { return p.pos === "OL" ? p.a.str * 0.5 + p.a.blk * 0.5 : p.pos === "DL" ? p.a.str * 0.6 + p.a.tkl * 0.4 : p.a.str; };
  var hd = function (p) { return p.pos === "QB" ? p.a.thr : p.pos === "CB" || p.pos === "S" ? p.a.cov * 0.6 + p.a.hnd * 0.4 : p.pos === "K" ? p.a.kck : p.pos === "LB" || p.pos === "DL" ? p.a.tkl : p.a.hnd; };
  ENGINE_SLOTS.forEach(function (s, i) {
    var healthy = lu[s[0]].filter(function (p) { return !p.inj; }), p = healthy[s[1]] || healthy[0] || lu[s[0]][0];
    ids.push(p ? p.id : null);
    roster.push({ pos: s[2], unit: i < 11 ? "O" : i < 22 ? "D" : "K", num: p ? p.num : 0, name: p ? pnm(p) : "Walk-on",
      spd: p ? cl((p.a.spd - 20) / 7.5, 1, 10) : 4, pwr: p ? cl((pw(p) - 20) / 7.5, 1, 10) : 4, hnd: p ? cl((hd(p) - 20) / 7.5, 1, 10) : 4, skin: p ? p.sk : 0 });
  });
  var light = lum(t.c1) > 150;
  return { team: { id: "fr" + id, school: -1, name: t.name, mascot: t.mascot, abbr: t.abbr, primary: t.c1, secondary: t.c2, helmet: light ? "secondary" : "primary", pants: "white", awayWhite: true, roster: roster }, ids: ids };
}
function engineResult(g, stats, idsH, idsA, scoreH, scoreA) {
  // stats keyed "H<i>" / "A<i>" in engine slot order; engine "H" is the user side
  var lines = {}, mk = function (p) { return lines[p.id] || (lines[p.id] = { t: p.t, n: pnm(p), pos: p.pos, num: p.num, pa: 0, pc: 0, py: 0, ptd: 0, pint: 0, ra: 0, ry: 0, rtd: 0, rec: 0, rcy: 0, rctd: 0, tk: 0, sk: 0, int: 0, fgm: 0, fga: 0 }); };
  [["H", idsH], ["A", idsA]].forEach(function (side) {
    var qbId = side[1][0];
    for (var k in stats) { if (k[0] !== side[0]) continue; var ri = +k.slice(1), pid = side[1][ri], p = PL(pid); if (!p) continue; var s = stats[k], ln = mk(p);
      ln.ra += s.rush ? 1 : 0; ln.ry += s.rush || 0; ln.rec += s.rec ? Math.max(1, Math.round(s.rec / 12)) : 0; ln.rcy += s.rec || 0; ln.py += s.pass || 0; ln.tk += s.tkl || 0; ln.int += s.int || 0;
      if (s.pass) { ln.pa += Math.max(1, Math.round(s.pass / 7)); ln.pc += Math.max(1, Math.round(s.pass / 11)); }
      if (s.td) { if ((s.rec || 0) > (s.rush || 0)) { ln.rctd += s.td; var q = PL(qbId); if (q) mk(q).ptd += s.td; } else ln.rtd += s.td; } }
  });
  return { hs: scoreH, as: scoreA, lines: lines, plays: [], scoring: [], ts: [teamBox(), teamBox()], inj: [] };
}

// ---- leaders ----
function leaders(cls, key, n) {
  var out = []; for (var id in FR.pl) { var p = FR.pl[id]; if (cls !== "ALL" && tm(p.t).cls !== cls) continue; if (p.st[key] > 0) out.push(p); }
  return out.sort(function (a, b) { return b.st[key] - a.st[key]; }).slice(0, n || 10);
}

// ---- to-do list ----
function todoList() {
  var out = [], u = FR.user;
  if (FR.phase === "offseason") return [{ k: "off", t: "Offseason", x: "Step " + (FR.off.step + 1) + " of " + OFF_STEPS.length + ": " + OFF_NAME[OFF_STEPS[FR.off.step]], go: "offseason" }];
  var lu = lineupOf(u);
  POSL.forEach(function (pos) { (FR.depth[pos] || []).slice(0, START[pos]).forEach(function (pid) { var p = PL(pid); if (p && p.inj) out.push({ k: "depth", t: "Injured starter", x: pnm(p) + " (" + pos + ") is out " + p.inj + " wk. Your next man up starts automatically; check the depth chart.", go: "depth" }); }); });
  if (FR.newOffers) out.push({ k: "offers", t: FR.newOffers + " new college offer" + (FR.newOffers > 1 ? "s" : ""), x: "Your players picked up new offers. See who is getting looks.", go: "offers" });
  if (FR.scout.pts >= 12) out.push({ k: "scout", t: FR.scout.pts + " scouting points", x: "Scout your incoming 8th graders before they enroll.", go: "feeder" });
  if ((FR.scout.host || 0) > 0 && FR.phase === "regular") out.push({ k: "host", t: "Host 8th graders this Friday", x: FR.scout.host + " hosting spot" + (FR.scout.host > 1 ? "s" : "") + " left. Hosting makes a prospect more likely to stay in your zone.", go: "feeder" });
  if (FR.filmLeft > 0 && FR.phase !== "preseason") { var cands = teamPlayers(u).filter(function (p) { return p.yr >= 11 && stars(p) >= 2 && p.cm < 0; }); if (cands.length) out.push({ k: "film", t: "Send highlight film", x: FR.filmLeft + " film package" + (FR.filmLeft > 1 ? "s" : "") + " left this week. " + cands.length + " upperclassmen could use the exposure.", go: "offers" }); }
  STAFF_ROLES.forEach(function (r) { if (!FR.staff[r]) out.push({ k: "staff", t: "Open job: " + STAFF_NAME[r], x: "You have no " + STAFF_NAME[r] + ". Hire one in the offseason.", go: "staff" }); });
  if (FR.phase === "preseason") out.unshift({ k: "pre", t: "Set your practice plan", x: "Choose this week's practice focus before the opener.", go: "practice" });
  var ready = FAC.filter(function (k) { return FR.fac[k] < 5 && FR.funds >= facCost(k); }); if (ready.length) out.push({ k: "fac", t: "Boosters can fund an upgrade", x: "You can afford: " + ready.map(function (k) { return FAC_NAME[k]; }).join(", ") + ".", go: "facilities" });
  return out;
}

// ---- save slots (players packed to keep localStorage small) ----
var SKEYS = ["gp", "pa", "pc", "py", "ptd", "pint", "ra", "ry", "rtd", "rec", "rcy", "rctd", "tk", "sk", "int", "fgm", "fga"];
function packSt(s) { var a = SKEYS.map(function (k) { return s[k] || 0; }); for (var i = 0; i < a.length; i++) if (a[i]) return a; return 0; }
function unpackSt(a) { var s = blankSt(); if (a) SKEYS.forEach(function (k, i) { s[k] = a[i] || 0; }); return s; }
function packP(p) { var fi = FIRST.indexOf(p.f), li = LAST.indexOf(p.l);
  return [+p.id.slice(1), p.t, fi >= 0 ? fi : p.f, li >= 0 ? li : p.l, POSL.indexOf(p.pos), p.yr, ATTRS.map(function (k) { var v = p.a[k].toString(36); return v.length < 2 ? "0" + v : v; }).join(""),
    p.pot, p.dev, p.num, p.sk, p.inj, packSt(p.st), packSt(p.cs), p.of, p.cm, p.fx, p.nw ? 1 : 0]; }
function unpackP(r) { var a = {}; ATTRS.forEach(function (k, i) { a[k] = parseInt(r[6].substr(i * 2, 2), 36); });
  var p = { id: "p" + r[0], t: r[1], f: typeof r[2] === "number" ? FIRST[r[2]] : r[2], l: typeof r[3] === "number" ? LAST[r[3]] : r[3], pos: POSL[r[4]], yr: r[5], a: a, ov: 0, pot: r[7], dev: r[8], num: r[9], sk: r[10], inj: r[11],
    st: unpackSt(r[12]), cs: unpackSt(r[13]), of: r[14] || [], cm: r[15], fx: r[16] }; if (r[17]) p.nw = 1; calcOvr(p); return p; }
function frPack() { var o = {}; for (var k in FR) if (k !== "pl") o[k] = FR[k]; var arr = []; for (var id in FR.pl) arr.push(packP(FR.pl[id])); o.plp = arr; return JSON.stringify(o); }
function frUnpack(str) { var o = JSON.parse(str), pl = {}; (o.plp || []).forEach(function (r) { var p = unpackP(r); pl[p.id] = p; }); delete o.plp; o.pl = pl; return o; }
function frSave() { if (!FR) return; try { localStorage.setItem(FR_PREFIX + FR.slot, frPack()); localStorage.setItem(FR_ACTIVE, String(FR.slot)); FR.saveErr = false; } catch (e) { FR.saveErr = true; } }
function frLoadSlot(i) { try { var s = localStorage.getItem(FR_PREFIX + i); if (s) { FR = frUnpack(s); FR.slot = i; FR.teams.forEach(function (t) { refreshOvr(t.id); }); return FR; } } catch (e) {} return null; }
function frSlotInfo(i) { try { var s = localStorage.getItem(FR_PREFIX + i); if (!s) return null; var o = JSON.parse(s); var t = o.teams[o.user]; return t ? { name: t.name, mascot: t.mascot, abbr: t.abbr, c1: t.c1, c2: t.c2, cls: t.cls, year: o.year, w: t.w, l: t.l, phase: o.phase, week: o.week, coach: o.coach.name, tt: o.coach.tt, cw: o.coach.w, cl: o.coach.l, kb: Math.round(s.length / 1024) } : null; } catch (e) { return null; } }
function frDeleteSlot(i) { try { localStorage.removeItem(FR_PREFIX + i); if (frActiveSlot() === i) localStorage.removeItem(FR_ACTIVE); } catch (e) {} }
function frActiveSlot() { try { var v = localStorage.getItem(FR_ACTIVE); return v === null ? -1 : +v; } catch (e) { return -1; } }
