// ---------- FRANCHISE (Alabama-style high school dynasty) ----------
var FR = null; // the loaded franchise
var FR_KEY = "fnb_fr_v1";
var CLASSES = ["1A", "2A", "3A", "4A", "5A", "6A"];
var POS_GROUPS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K"];
var ROSTER_MIX = { QB: 3, RB: 3, WR: 6, TE: 2, OL: 8, DL: 6, LB: 5, CB: 4, S: 3, K: 1 };
var STARTERS = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 2, S: 2, K: 1 };
var UPGRADES = ["weight", "staff", "film", "stadium"];
var SCH_PRE = ["Cedar", "Magnolia", "Red Clay", "Iron Ridge", "Coosa", "Cahaba", "Warrior", "Tombigbee", "Sipsey", "Locust", "Shoal", "Hickory",
  "Willow", "Cypress", "Sand", "Piney", "Dogwood", "Pecan", "Sweetwater", "Clearwater", "Copper", "Lone Pine", "Big Creek", "Mill",
  "Stone", "Briar", "Fox", "Cotton", "Eagle", "Hawk", "Turkey", "Bear", "Pebble", "Rock", "Chestnut", "Elm", "Cane", "Blue", "Hollow",
  "Jasper", "Silver", "Ridge", "Holly", "Wolf", "Persimmon", "Muscadine", "Hatchet", "Crooked", "Sugar", "Flint", "Spring", "Bay"];
var SCH_SUF = [" Valley", " Ridge", " Creek", " County", " Springs", " Hills", " Central", " Bend", " Grove", " Point", " Heights", " Crossing", " Lake", " Mountain"];
var MASCOTS = ["Panthers", "Rams", "Owls", "Comets", "Mustangs", "Lions", "Grizzlies", "Gators", "Tigers", "Bulldogs", "Eagles", "Wildcats",
  "Warriors", "Hornets", "Raiders", "Jaguars", "Pirates", "Trojans", "Bears", "Hawks", "Cougars", "Knights", "Vikings", "Bobcats",
  "Patriots", "Spartans", "Falcons", "Wolves", "Yellow Jackets", "Blue Devils", "Golden Bears", "Chargers", "Titans", "Rockets",
  "Stallions", "Cardinals", "Blazers", "Longhorns", "Wolverines", "Hurricanes", "Bulldogs", "Red Devils", "Mavericks", "Indians".replace("Indians", "Thunder")];
var COLOR_PAIRS = [["#c8102e", "#f2f2f2"], ["#1e4fd8", "#ffc72c"], ["#0f6b3a", "#f2c230"], ["#5b2a86", "#e8e8e8"], ["#e86a10", "#14141c"],
  ["#0b2a5b", "#c9a227"], ["#6d1f2a", "#bfc3c9"], ["#00807a", "#f28c28"], ["#14141c", "#c9a227"], ["#c8102e", "#14141c"], ["#1e4fd8", "#f2f2f2"],
  ["#0f6b3a", "#f2f2f2"], ["#7a1f2b", "#f2c230"], ["#2a4a8a", "#c8102e"], ["#e86a10", "#1e4fd8"], ["#5a5f6a", "#c8102e"], ["#d6337a", "#14141c"],
  ["#0b2a5b", "#e86a10"], ["#2fa84f", "#14141c"], ["#5b2a86", "#ffc72c"]];

function frRng() { FR.rngState = (FR.rngState + 0x6D2B79F5) | 0; var t = FR.rngState; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function rnorm() { return (frRng() + frRng() + frRng() + frRng() - 2) * 1.73; }
function pick(arr) { return arr[Math.floor(frRng() * arr.length)]; }
function r99(v) { return Math.max(20, Math.min(99, Math.round(v))); }

// ---- player model (99 scale) ----
var POS_BASE = { QB: [52, 64, 70], RB: [72, 60, 52], WR: [76, 42, 68], TE: [56, 64, 58], OL: [34, 74, 22], DL: [52, 72, 26],
  LB: [60, 64, 42], CB: [76, 42, 60], S: [68, 52, 54], K: [32, 66, 66] };
function posOvr(p) {
  var s = p.spd, w = p.pwr, h = p.hnd;
  switch (p.pos) {
    case "QB": return Math.round(h * 0.5 + w * 0.35 + s * 0.15);
    case "RB": return Math.round(s * 0.55 + w * 0.3 + h * 0.15);
    case "WR": return Math.round(s * 0.5 + h * 0.42 + w * 0.08);
    case "TE": return Math.round(w * 0.45 + h * 0.35 + s * 0.2);
    case "OL": return Math.round(w * 0.8 + s * 0.2);
    case "DL": return Math.round(w * 0.65 + s * 0.35);
    case "LB": return Math.round(s * 0.4 + w * 0.42 + h * 0.18);
    case "CB": return Math.round(s * 0.58 + h * 0.34 + w * 0.08);
    case "S": return Math.round(s * 0.48 + w * 0.27 + h * 0.25);
    case "K": return Math.round(w * 0.5 + h * 0.5);
  }
  return 50;
}
function classLabel(c) { return ["FR", "SO", "JR", "SR"][c - 9] || "SR"; }
function newPlayer(pos, cls, quality) {
  var b = POS_BASE[pos], age = (cls - 9) * 5.5 - 8, q = quality || 0;
  var p = { id: "p" + (FR.nextId++), pos: pos, cls: cls, first: pick(FIRST), last: pick(LAST), num: 0, skin: Math.floor(frRng() * 4),
    spd: r99(b[0] + age + q + rnorm() * 7), pwr: r99(b[1] + age + q + rnorm() * 7), hnd: r99(b[2] + age + q + rnorm() * 7),
    pot: r99(62 + rnorm() * 14 + q * 0.5), inj: 0, st: blankStats(), car: blankStats() };
  return p;
}
function blankStats() { return { gp: 0, pass: 0, ptd: 0, rush: 0, rtd: 0, rec: 0, ctd: 0, tkl: 0, int: 0, sck: 0 }; }
function pname(p) { return p.first + " " + p.last; }
function assignNumbers(roster) {
  var used = {}, ranges = { QB: [1, 19], RB: [20, 49], WR: [1, 19], TE: [80, 89], OL: [50, 79], DL: [90, 99], LB: [40, 59], CB: [20, 39], S: [20, 49], K: [1, 19] };
  roster.forEach(function (p) { if (p.num && !used[p.num]) used[p.num] = 1; });
  roster.forEach(function (p) { if (p.num && used[p.num] === 1) { used[p.num] = 2; return; } var r = ranges[p.pos];
    for (var t = 0; t < 60; t++) { var n = r[0] + Math.floor(frRng() * (r[1] - r[0] + 1)); if (!used[n]) { used[n] = 2; p.num = n; return; } }
    for (var n2 = 1; n2 < 100; n2++) if (!used[n2]) { used[n2] = 2; p.num = n2; return; } });
}

// ---- league creation ----
function frNew(cls, seed) {
  FR = { v: 1, cls: cls, year: 2026, week: 0, phase: "regular", rngState: (seed || Date.now()) | 0, nextId: 1, teams: [], schedule: [], playoffs: null,
    roster: [], depth: {}, funds: 20000, upg: { weight: 0, staff: 0, film: 0, stadium: 0 }, history: [], coach: { w: 0, l: 0, titles: 0 }, log: [], user: -1, awards: null, off: null };
  var big = cls === "6A", nReg = big ? 4 : 8, per = big ? 8 : 6, n = nReg * per, used = {};
  for (var i = 0; i < n; i++) {
    var nm; for (var t = 0; t < 80; t++) { nm = pick(SCH_PRE) + pick(SCH_SUF); if (!used[nm]) break; } used[nm] = 1;
    var cp = pick(COLOR_PAIRS), prest = Math.max(1, Math.min(5, Math.round(3 + rnorm() * 1.1)));
    var ab = nm.replace(/[^A-Z]/g, ""); ab = (ab.length >= 2 ? ab : nm.slice(0, 3).toUpperCase()).slice(0, 3) + (frRng() < 0.5 ? "HS" : ""); ab = ab.slice(0, 4);
    FR.teams.push({ id: i, name: nm, mascot: pick(MASCOTS), abbr: ab, primary: cp[0], secondary: cp[1], helmet: frRng() < 0.5 ? "secondary" : "primary",
      pants: frRng() < 0.5 ? "white" : "secondary", awayWhite: true, region: Math.floor(i / per) + 1, prestige: prest,
      ovr: Math.round(58 + prest * 4.5 + rnorm() * 4), seed: Math.floor(frRng() * 1e9), w: 0, l: 0, rw: 0, rl: 0, pf: 0, pa: 0, lastRank: 0 });
  }
  FR.nReg = nReg; FR.per = per;
  return FR;
}
function frChooseTeam(id) {
  FR.user = id; var t = FR.teams[id];
  // build the user's roster around the school's prestige
  var q = (t.prestige - 3) * 3;
  FR.roster = [];
  POS_GROUPS.forEach(function (pos) { for (var i = 0; i < ROSTER_MIX[pos]; i++) { var cls = 9 + ((i + Math.floor(frRng() * 4)) % 4); if (pos === "K") cls = 11; FR.roster.push(newPlayer(pos, cls, q)); } });
  assignNumbers(FR.roster); autoDepth();
  makeSchedule(); frUpdateUserOvr();
}
function frUpdateUserOvr() { var t = FR.teams[FR.user]; t.ovr = userStrength(); }
function userStrength() {
  var lu = lineup(), sum = 0, n = 0; Object.keys(lu).forEach(function (k) { lu[k].forEach(function (p) { if (p) { sum += posOvr(p) * (k === "QB" ? 2 : 1); n += (k === "QB" ? 2 : 1); } }); });
  return Math.round((n ? sum / n : 50) + FR.upg.staff * 0.8 + FR.upg.film * 0.5);
}

// ---- depth chart ----
function autoDepth() {
  FR.depth = {};
  POS_GROUPS.forEach(function (pos) { FR.depth[pos] = FR.roster.filter(function (p) { return p.pos === pos; }).sort(function (a, b) { return posOvr(b) - posOvr(a); }).map(function (p) { return p.id; }); });
}
function fixDepth() {
  POS_GROUPS.forEach(function (pos) { var ids = FR.roster.filter(function (p) { return p.pos === pos; }).map(function (p) { return p.id; });
    var d = (FR.depth[pos] || []).filter(function (id) { return ids.indexOf(id) >= 0; }); ids.forEach(function (id) { if (d.indexOf(id) < 0) d.push(id); }); FR.depth[pos] = d; });
}
function byId(id) { for (var i = 0; i < FR.roster.length; i++) if (FR.roster[i].id === id) return FR.roster[i]; return null; }
function lineup() {
  fixDepth(); var out = {};
  POS_GROUPS.forEach(function (pos) {
    var list = FR.depth[pos].map(byId).filter(function (p) { return p && !p.inj; });
    // borrow from neighbours if a group is short (injuries)
    var need = STARTERS[pos], borrow = { QB: "RB", RB: "WR", WR: "CB", TE: "OL", OL: "DL", DL: "OL", LB: "S", CB: "S", S: "CB", K: "QB" };
    if (list.length < need) { var extra = FR.roster.filter(function (p) { return p.pos === borrow[pos] && !p.inj && list.indexOf(p) < 0; }); list = list.concat(extra); }
    out[pos] = list.slice(0, need);
  });
  return out;
}
function moveDepth(pos, id, delta) {
  var d = FR.depth[pos], i = d.indexOf(id), j = i + delta; if (i < 0 || j < 0 || j >= d.length) return; d[i] = d[j]; d[j] = id; frSave();
}

// ---- schedule ----
function makeSchedule() {
  var weeks = []; for (var w = 0; w < 10; w++) weeks.push([]);
  var regWeeks = FR.per - 1, nonReg = 10 - regWeeks, played = {};
  var key = function (a, b) { return a < b ? a + "-" + b : b + "-" + a; };
  // region round robin (circle method) in the last weeks
  for (var r = 1; r <= FR.nReg; r++) {
    var ids = FR.teams.filter(function (t) { return t.region === r; }).map(function (t) { return t.id; });
    var n = ids.length, arr = ids.slice();
    for (var rd = 0; rd < n - 1; rd++) {
      for (var k = 0; k < n / 2; k++) { var a = arr[k], b = arr[n - 1 - k]; var home = (rd + k) % 2 ? a : b, away = home === a ? b : a;
        weeks[nonReg + rd].push({ h: home, a: away, reg: true }); played[key(a, b)] = 1; }
      arr.splice(1, 0, arr.pop());
    }
  }
  // non-region weeks: random cross-region pairings
  for (var w2 = 0; w2 < nonReg; w2++) {
    for (var tries = 0; tries < 60; tries++) {
      var pool = FR.teams.map(function (t) { return t.id; }), games = [], ok = true;
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(frRng() * (i + 1)); var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      while (pool.length) { var a2 = pool.shift(), found = -1;
        for (var q = 0; q < pool.length; q++) { var b2 = pool[q]; if (FR.teams[a2].region !== FR.teams[b2].region && !played[key(a2, b2)]) { found = q; break; } }
        if (found < 0) { ok = false; break; } var b3 = pool.splice(found, 1)[0]; games.push(frRng() < 0.5 ? { h: a2, a: b3 } : { h: b3, a: a2 }); }
      if (ok) { games.forEach(function (g) { played[key(g.h, g.a)] = 1; weeks[w2].push(g); }); break; }
    }
  }
  FR.schedule = weeks;
}
function userGame(week) { var g = (FR.schedule[week] || []).filter(function (x) { return x.h === FR.user || x.a === FR.user; }); return g[0] || null; }

// ---- simulating games ----
function teamStrength(id) { return id === FR.user ? userStrength() : FR.teams[id].ovr; }
function simScore(h, a) {
  var diff = teamStrength(h) - teamStrength(a) + 2.5 + (h === FR.user ? FR.upg.stadium * 0.8 : 0);
  function pts(adv) { var e = 22 + adv * 0.75, td = Math.max(0, Math.round(e / 8 + rnorm() * 1.25)), fg = frRng() < 0.45 ? 1 : 0, pt = td * 7 - (frRng() < 0.12 && td ? 1 : 0) + fg * 3; return Math.max(0, pt); }
  var hs = pts(diff / 2), as = pts(-diff / 2);
  if (hs === as) { if (frRng() < 0.5 + diff * 0.02) hs += frRng() < 0.6 ? 7 : 3; else as += frRng() < 0.6 ? 7 : 3; }
  return [hs, as];
}
function applyResult(g, hs, as) {
  g.hs = hs; g.as = as; g.played = true;
  var H = FR.teams[g.h], A = FR.teams[g.a];
  if (g.po) return;
  H.pf += hs; H.pa += as; A.pf += as; A.pa += hs;
  if (hs > as) { H.w++; A.l++; if (g.reg) { H.rw++; A.rl++; } } else { A.w++; H.l++; if (g.reg) { A.rw++; H.rl++; } }
}
function simUserStats(g, us, them) {
  // spread a simulated stat line over the user's starters
  var lu = lineup(), td = Math.floor(us / 7), passTd = Math.round(td * 0.45), rushTd = td - passTd;
  var qb = lu.QB[0], rb = lu.RB[0], wrs = lu.WR.concat(lu.TE);
  if (qb) { qb.st.gp++; var py = Math.max(40, Math.round(140 + (posOvr(qb) - 60) * 3 + rnorm() * 50)); qb.st.pass += py; qb.st.ptd += passTd;
    var shares = wrs.map(function () { return 0.5 + frRng(); }), tot = shares.reduce(function (a, b) { return a + b; }, 0);
    wrs.forEach(function (w, i) { if (!w) return; w.st.gp++; w.st.rec += Math.round(py * shares[i] / tot); }); for (var k = 0; k < passTd; k++) { var w2 = pick(wrs); if (w2) w2.st.ctd++; } }
  if (rb) { rb.st.gp++; rb.st.rush += Math.max(10, Math.round(70 + (posOvr(rb) - 60) * 2.5 + rnorm() * 35)); rb.st.rtd += rushTd; }
  var defs = lu.DL.concat(lu.LB, lu.CB, lu.S);
  defs.forEach(function (d) { if (!d) return; d.st.gp++; d.st.tkl += Math.max(0, Math.round((d.pos === "LB" ? 6 : d.pos === "S" ? 4.5 : 3) + rnorm() * 2)); });
  if (frRng() < 0.5) { var ib = pick(lu.CB.concat(lu.S)); if (ib) ib.st.int++; }
  if (frRng() < 0.7) { var sk = pick(lu.DL.concat(lu.LB)); if (sk) sk.st.sck++; }
  injuries();
}
function injuries() { FR.roster.forEach(function (p) { if (p.inj > 0) p.inj--; else if (frRng() < 0.012) { p.inj = 1 + Math.floor(frRng() * 3); FR.log.push({ t: "inj", id: p.id, w: p.inj }); } }); }

function simWeekOthers(week) {
  (FR.schedule[week] || []).forEach(function (g) { if (g.played || g.h === FR.user || g.a === FR.user) return; var s = simScore(g.h, g.a); applyResult(g, s[0], s[1]); });
}
function frSimUserGame() {
  var g = currentUserGame(); if (!g) return null;
  var s = simScore(g.h, g.a); finishUserGame(g, s[0], s[1], null); return g;
}
// played game: map sim stats onto roster
function finishUserGame(g, hs, as, simStats) {
  var userHome = g.h === FR.user, us = userHome ? hs : as, them = userHome ? as : hs;
  if (simStats) {
    simStats.forEach(function (row) { var p = byId(row.id); if (!p) return; p.st.gp++; p.st.pass += row.pass; p.st.rush += row.rush; p.st.rec += row.rec;
      p.st.rtd += row.rtd; p.st.ctd += row.ctd; p.st.ptd += row.ptd; p.st.tkl += row.tkl; p.st.int += row.int; });
    injuries();
  } else simUserStats(g, us, them);
  applyResult(g, hs, as);
  var won = us > them;
  FR.coach.w += won ? 1 : 0; FR.coach.l += won ? 0 : 1;
  FR.funds += won ? 3000 : 1000; if (userHome) FR.funds += 2000 + FR.upg.stadium * 800;
  if (g.po && won) FR.funds += 5000;
  if (!g.po) simWeekOthers(FR.week); else simPlayoffRound();
  advanceWeek();
  frSave();
}
function currentUserGame() {
  if (FR.phase === "regular") return userGame(FR.week);
  if (FR.phase === "playoffs") { var rd = FR.playoffs.rounds[FR.playoffs.cur]; if (!rd) return null;
    for (var i = 0; i < rd.length; i++) { var g = rd[i]; resolveSlots(g); if (g.h === FR.user || g.a === FR.user) return g; } }
  return null;
}
function advanceWeek() {
  if (FR.phase === "regular") {
    FR.week++; updatePoll();
    if (FR.week >= 10) startPlayoffs();
  } else if (FR.phase === "playoffs") {
    FR.playoffs.cur++;
    if (FR.playoffs.cur >= FR.playoffs.rounds.length) endSeason();
  }
}
function frSimWeek() { // user has no game this week (playoffs, eliminated) or chose sim
  if (FR.phase === "regular") { var g = userGame(FR.week); if (g && !g.played) return frSimUserGame(); simWeekOthers(FR.week); advanceWeek(); frSave(); return null; }
  if (FR.phase === "playoffs") { var ug = currentUserGame(); if (ug) return frSimUserGame(); simPlayoffRound(); advanceWeek(); frSave(); }
  return null;
}

// ---- standings / poll ----
function standings(region) {
  return FR.teams.filter(function (t) { return t.region === region; }).sort(function (a, b) {
    return (b.rw - b.rl) - (a.rw - a.rl) || (b.w - b.l) - (a.w - a.l) || h2h(b.id, a.id) || (b.pf - b.pa) - (a.pf - a.pa) || b.ovr - a.ovr; });
}
function h2h(a, b) { var r = 0; FR.schedule.forEach(function (wk) { wk.forEach(function (g) { if (!g.played) return;
  if (g.h === a && g.a === b) r += g.hs > g.as ? 1 : -1; if (g.h === b && g.a === a) r += g.as > g.hs ? 1 : -1; }); }); return r; }
function power(t) { var gp = t.w + t.l; return (gp ? (t.w / gp) * 30 + (t.pf - t.pa) / gp * 0.4 : 0) + teamStrength(t.id) * 0.7; }
function updatePoll() {
  var list = FR.teams.slice().sort(function (a, b) { return power(b) - power(a); });
  FR.teams.forEach(function (t) { t.lastRank = t.rank || 0; t.rank = 0; }); list.slice(0, 10).forEach(function (t, i) { t.rank = i + 1; });
  FR.poll = list.slice(0, 10).map(function (t) { return t.id; });
}

// ---- AHSAA-style playoffs ----
function startPlayoffs() {
  FR.phase = "playoffs"; var seeds = {}, rounds = [];
  for (var r = 1; r <= FR.nReg; r++) seeds[r] = standings(r).map(function (t) { return t.id; });
  function S(r, n) { return { team: seeds[r][n - 1], seed: n, reg: r }; }
  function W(rd, gi) { return { win: [rd, gi] }; }
  if (FR.cls === "6A") {
    // 24 teams: top 6 per region; seeds 1-2 get a bye. Regions pair 1-2 and 3-4.
    var r1 = [], r2 = [];
    [[1, 2], [3, 4]].forEach(function (pr) { var A = pr[0], B = pr[1], base = r1.length;
      r1.push({ a: S(B, 4), b: S(A, 5) }, { a: S(A, 3), b: S(B, 6) }, { a: S(B, 3), b: S(A, 6) }, { a: S(A, 4), b: S(B, 5) });
      r2.push({ a: S(A, 1), b: W(0, base) }, { a: S(B, 2), b: W(0, base + 1) }, { a: S(B, 1), b: W(0, base + 3) }, { a: S(A, 2), b: W(0, base + 2) }); });
    rounds.push(r1, r2);
  } else {
    // 32 teams: top 4 per region, regions pair (1,2) (3,4) (5,6) (7,8); 1-4 North, 5-8 South
    var r1b = [];
    [[1, 2], [3, 4], [5, 6], [7, 8]].forEach(function (pr) { var A = pr[0], B = pr[1];
      r1b.push({ a: S(A, 1), b: S(B, 4) }, { a: S(B, 2), b: S(A, 3) }, { a: S(B, 1), b: S(A, 4) }, { a: S(A, 2), b: S(B, 3) }); });
    rounds.push(r1b);
  }
  // remaining rounds pair adjacent winners until one game is left
  while (rounds[rounds.length - 1].length > 1) { var prev = rounds[rounds.length - 1], ri = rounds.length - 1, nx = [];
    for (var i = 0; i < prev.length; i += 2) nx.push({ a: W(ri, i), b: W(ri, i + 1) }); rounds.push(nx); }
  rounds.forEach(function (rd) { rd.forEach(function (g) { g.po = true; }); });
  FR.playoffs = { rounds: rounds, cur: 0, qualified: [] };
  rounds[0].concat(rounds[1] || []).forEach(function (g) { [g.a, g.b].forEach(function (s) { if (s.team !== undefined) FR.playoffs.qualified.push(s.team); }); });
  FR.funds += FR.playoffs.qualified.indexOf(FR.user) >= 0 ? 4000 : 0;
}
function slotTeam(s) { if (s.team !== undefined) return s.team; var g = FR.playoffs.rounds[s.win[0]][s.win[1]]; if (!g.played) return null; return g.hs > g.as ? g.h : g.a; }
function slotSeed(s) { if (s.team !== undefined) return s; var g = FR.playoffs.rounds[s.win[0]][s.win[1]]; if (!g.played) return null; return g.hs > g.as ? g.hSeed : g.aSeed; }
function resolveSlots(g) {
  if (g.h !== undefined && g.h !== null) return;
  var ta = slotTeam(g.a), tb = slotTeam(g.b); if (ta === null || tb === null) return;
  var sa = slotSeed(g.a), sb = slotSeed(g.b);
  // better seed hosts until the final (neutral: listed as the first team)
  var aHome = (sa.seed < sb.seed) || (sa.seed === sb.seed && FR.teams[ta].ovr >= FR.teams[tb].ovr);
  g.h = aHome ? ta : tb; g.a = aHome ? tb : ta; g.hSeed = aHome ? sa : sb; g.aSeed = aHome ? sb : sa;
}
function simPlayoffRound() {
  var rd = FR.playoffs.rounds[FR.playoffs.cur]; if (!rd) return;
  rd.forEach(function (g) { resolveSlots(g); if (g.played || g.h === FR.user || g.a === FR.user) return; var s = simScore(g.h, g.a); applyResult(g, s[0], s[1]); });
}
function userAlive() {
  if (FR.phase !== "playoffs") return false;
  for (var r = FR.playoffs.cur; r < FR.playoffs.rounds.length; r++) { var ok = false;
    FR.playoffs.rounds[r].forEach(function (g) { resolveSlots(g); if (g.h === FR.user || g.a === FR.user) ok = true; [g.a, g.b].forEach(function (s) { if (s.team === FR.user) ok = true; }); });
    if (ok) return true; if (r === FR.playoffs.cur) {
      // could still appear in a later round via a pending slot
      var pending = FR.playoffs.rounds[r].some(function (g) { return !g.played && (g.h === undefined || g.h === null); }); if (!pending) return false; }
  }
  return false;
}
function roundName(i, total) {
  var fromEnd = total - 1 - i;
  return fromEnd === 0 ? "rd.final" : fromEnd === 1 ? "rd.semi" : fromEnd === 2 ? "rd.quarter" : i === 0 ? "rd.first" : "rd.second";
}
function champion() { var f = FR.playoffs && FR.playoffs.rounds[FR.playoffs.rounds.length - 1][0]; return f && f.played ? (f.hs > f.as ? f.h : f.a) : null; }

// ---- end of season / offseason ----
function endSeason() {
  FR.phase = "offseason"; var t = FR.teams[FR.user], ch = champion(), made = FR.playoffs.qualified.indexOf(FR.user) >= 0;
  var best = "—"; if (made) { best = "rd.first"; FR.playoffs.rounds.forEach(function (rd, i) { rd.forEach(function (g) { if (g.played && (g.h === FR.user || g.a === FR.user)) best = roundName(i, FR.playoffs.rounds.length); }); }); }
  if (ch === FR.user) { FR.coach.titles++; FR.funds += 15000; best = "champ"; }
  var regionRank = standings(t.region).map(function (x) { return x.id; }).indexOf(FR.user) + 1;
  FR.history.push({ year: FR.year, w: t.w, l: t.l, rw: t.rw, rl: t.rl, reg: regionRank, po: best, champ: ch !== null ? FR.teams[ch].name : "" });
  FR.awards = makeAwards(regionRank, ch === FR.user);
  // career stats roll-up
  FR.roster.forEach(function (p) { for (var k in p.st) p.car[k] += p.st[k]; });
  FR.off = { step: 0 };
}
function makeAwards(regionRank, champ) {
  var out = [], ranked = FR.roster.slice().sort(function (a, b) { return posOvr(b) + statScore(b) * 0.05 - (posOvr(a) + statScore(a) * 0.05); });
  ranked.forEach(function (p) { var o = posOvr(p);
    if (o >= 82 && (regionRank <= 2 || champ)) out.push({ id: p.id, a: "aw.allstate" });
    else if (o >= 72 && statScore(p) > 120) out.push({ id: p.id, a: "aw.allregion" }); });
  if (champ && ranked[0]) out.unshift({ id: ranked[0].id, a: "aw.poy" });
  if (regionRank === 1) out.push({ id: null, a: "aw.coach" });
  return out.slice(0, 12);
}
function statScore(p) { var s = p.st; return s.pass * 0.05 + s.rush * 0.12 + s.rec * 0.12 + (s.ptd + s.rtd + s.ctd) * 6 + s.tkl * 1.5 + s.int * 10 + s.sck * 6; }

function offseasonGraduate() {
  var seniors = FR.roster.filter(function (p) { return p.cls >= 12; });
  FR.off.grads = seniors.map(function (p) { return { name: pname(p), pos: p.pos, ovr: posOvr(p), num: p.num }; });
  FR.roster = FR.roster.filter(function (p) { return p.cls < 12; });
}
function offseasonProgress() {
  var bonus = 1 + FR.upg.weight * 0.12, changes = [];
  FR.roster.forEach(function (p) {
    var before = posOvr(p), base = [5.5, 4.5, 3.5][p.cls - 9] || 3, potF = 0.6 + (p.pot - 40) / 60;
    ["spd", "pwr", "hnd"].forEach(function (k) { p[k] = r99(p[k] + Math.max(-1, base * potF * bonus + rnorm() * 2.2)); });
    p.cls++; p.inj = 0; p.st = blankStats();
    changes.push({ id: p.id, d: posOvr(p) - before });
  });
  FR.off.prog = changes.sort(function (a, b) { return b.d - a.d; });
}
function offseasonFreshmen() {
  var t = FR.teams[FR.user], q = (t.prestige - 3) * 2.5, need = {}, fresh = [];
  POS_GROUPS.forEach(function (pos) { var have = FR.roster.filter(function (p) { return p.pos === pos; }).length; need[pos] = Math.max(0, ROSTER_MIX[pos] - have); });
  POS_GROUPS.forEach(function (pos) { var n = Math.max(need[pos] > 0 ? need[pos] : 0, pos === "K" ? 0 : (frRng() < 0.5 ? 1 : 0)); n = Math.min(n, 3);
    for (var i = 0; i < n; i++) { var p = newPlayer(pos, 9, q); FR.roster.push(p); fresh.push(p.id); } });
  assignNumbers(FR.roster); FR.off.fresh = fresh;
  // move-in candidates
  FR.off.moveins = [];
  for (var m = 0; m < 6; m++) { var pos2 = pick(["QB", "RB", "WR", "WR", "OL", "DL", "LB", "CB", "S", "TE"]), c = 10 + Math.floor(frRng() * 2), mp = newPlayer(pos2, c, q + 4);
    FR.off.moveins.push({ p: mp, interest: Math.round(Math.min(95, 30 + t.prestige * 10 + FR.upg.stadium * 3 + FR.upg.staff * 3 + rnorm() * 12)), picked: false, res: null }); }
}
function offseasonResolveMoveins() {
  var picks = FR.off.moveins.filter(function (m) { return m.picked; }).slice(0, 3);
  picks.forEach(function (m) { m.res = frRng() * 100 < m.interest; if (m.res) FR.roster.push(m.p); });
  assignNumbers(FR.roster);
}
function offseasonLeague() {
  var ch = champion();
  FR.teams.forEach(function (t) {
    var winp = (t.w + t.l) ? t.w / (t.w + t.l) : 0.5;
    if (t.id !== FR.user) { t.prestige = Math.max(1, Math.min(5, t.prestige + (winp > 0.75 ? 0.4 : winp < 0.3 ? -0.4 : 0) + (t.id === ch ? 0.5 : 0) + rnorm() * 0.25));
      t.ovr = Math.round(t.ovr * 0.55 + (58 + t.prestige * 4.5) * 0.45 + rnorm() * 3.5); }
    else t.prestige = Math.max(1, Math.min(5, t.prestige + (winp > 0.75 ? 0.4 : winp < 0.3 ? -0.3 : 0) + (t.id === ch ? 0.6 : 0)));
    t.prestige = Math.round(t.prestige * 10) / 10;
    t.w = t.l = t.rw = t.rl = t.pf = t.pa = 0; t.rank = t.lastRank = 0;
  });
}
function startNewSeason() {
  FR.year++; FR.week = 0; FR.phase = "regular"; FR.playoffs = null; FR.awards = null; FR.off = null; FR.log = [];
  autoDepthKeepOrder(); makeSchedule(); frUpdateUserOvr(); updatePoll(); frSave();
}
function autoDepthKeepOrder() { fixDepth(); }
var UPG_COST = function (lvl) { return (lvl + 1) * 10000; };
function buyUpgrade(k) { var lvl = FR.upg[k]; if (lvl >= 5) return false; var c = UPG_COST(lvl); if (FR.funds < c) return false; FR.funds -= c; FR.upg[k]++; frUpdateUserOvr(); frSave(); return true; }

// ---- turn the franchise roster into the 23-man team the game engine plays ----
var ROLE_SRC = [["QB", 0], ["RB", 0], ["WR", 0], ["WR", 1], ["WR", 2], ["TE", 0], ["OL", 0], ["OL", 1], ["OL", 2], ["OL", 3], ["OL", 4],
  ["DL", 0], ["DL", 1], ["DL", 2], ["DL", 3], ["LB", 0], ["LB", 1], ["LB", 2], ["CB", 0], ["CB", 1], ["S", 0], ["S", 1], ["K", 0]];
var ENGINE_POS = OFF_POS.concat(DEF_POS).concat(["K"]);
function userEngineTeam() {
  var t = FR.teams[FR.user], lu = lineup(), roster = [], ids = [];
  ROLE_SRC.forEach(function (rs, i) { var p = lu[rs[0]][rs[1]] || lu[rs[0]][0];
    ids.push(p ? p.id : null);
    roster.push({ pos: ENGINE_POS[i], unit: i < 11 ? "O" : i < 22 ? "D" : "K", num: p ? p.num : 0, name: p ? pname(p) : "Walk-on",
      spd: p ? p.spd / 10 : 5, pwr: p ? p.pwr / 10 : 5, hnd: p ? p.hnd / 10 : 5, skin: p ? p.skin : 0 }); });
  return { team: { id: "u", school: -1, name: t.name, mascot: t.mascot, abbr: t.abbr, primary: t.primary, secondary: t.secondary, helmet: t.helmet, pants: t.pants, awayWhite: t.awayWhite, roster: roster }, ids: ids };
}
function cpuEngineTeam(id) {
  var t = FR.teams[id], rng = mulberry32((t.seed ^ (FR.year * 7919)) >>> 0), q = (t.ovr - 68) / 6;
  var roster = makeRoster(rng, q);
  return { id: "c" + id, school: -1, name: t.name, mascot: t.mascot, abbr: t.abbr, primary: t.primary, secondary: t.secondary, helmet: t.helmet, pants: t.pants, awayWhite: true, roster: roster };
}
function engineStatsToRows(stats, ids) {
  var rows = [];
  for (var k in stats) { if (k[0] !== "H") continue; var ri = +k.slice(1), id = ids[ri]; if (!id) continue; var s = stats[k];
    var role = ENGINE_POS[ri], isPass = ri === 0;
    rows.push({ id: id, pass: isPass ? s.pass : 0, rush: s.rush, rec: s.rec, ptd: 0, rtd: 0, ctd: 0, tkl: s.tkl, int: s.int, td: s.td, role: role }); }
  // touchdowns: rushing for the runner, receiving for the catcher, passing credit to the QB
  rows.forEach(function (r) { if (!r.td) return; if (r.rec > 0 && r.rush <= 0) { r.ctd += r.td; var qb = rows.filter(function (x) { return x.pass > 0 || x.role === "QB"; })[0]; if (qb) qb.ptd += r.td; } else r.rtd += r.td; });
  return rows;
}

// ---- save ----
function frSave() { if (!FR) return; try { localStorage.setItem(FR_KEY, JSON.stringify(FR)); } catch (e) {} }
function frLoad() { try { var s = localStorage.getItem(FR_KEY); if (s) { FR = JSON.parse(s); return FR; } } catch (e) {} return null; }
function frDelete() { try { localStorage.removeItem(FR_KEY); } catch (e) {} FR = null; }
