// ---------- UTIL ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function damp(cur, target, rate, dt) { return target + (cur - target) * Math.exp(-rate * dt); }
function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function len(x, y) { return Math.sqrt(x * x + y * y); }

// ---------- FIELD ----------
var FW = 53.33, FL = 120, HASH_L = 17.8, HASH_R = 35.5;
function dirOf(tm) { return tm === "H" ? 1 : -1; }
function goalY(tm) { return tm === "H" ? 110 : 10; }       // the goal line this team attacks
function ownGoalY(tm) { return tm === "H" ? 10 : 110; }
function other(tm) { return tm === "H" ? "A" : "H"; }
// yards from the attacking team's own goal line (0..100)
function ydFromOwn(tm, y) { return tm === "H" ? y - 10 : 110 - y; }
function yFromOwn(tm, yd) { return tm === "H" ? 10 + yd : 110 - yd; }

// ---------- PLAYBOOK ----------
var ROLE_O = ["QB", "RB", "WR1", "WR2", "WR3", "TE", "LT", "LG", "C", "RG", "RT"];
var ROLE_D = ["DE1", "DT1", "DT2", "DE2", "LB1", "LB2", "LB3", "CB1", "CB2", "FS", "SS"];
var FORMS = {
  gun:   { QB: [0, 5], RB: [2, 5.2], WR1: [-16, 0.7], WR2: [15, 0.7], WR3: [-9, 1.3], TE: [5.6, 1.2],
           LT: [-4, 1.2], LG: [-2, 1], C: [0, 0.9], RG: [2, 1], RT: [4, 1.2] },
  iform: { QB: [0, 1.7], RB: [0, 7], WR1: [-16, 0.7], WR2: [15, 0.7], WR3: [0, 4.4], TE: [5.6, 1.2],
           LT: [-4, 1.2], LG: [-2, 1], C: [0, 0.9], RG: [2, 1], RT: [4, 1.2] }
};
var ROUTES = {
  go: [[0, 45]], slant: [[0, 2.5], [8, 11], [15, 18]], out: [[0, 6], [-7, 6.3], [-14, 6.6]], curl: [[0, 11], [1.2, 9.4]],
  flat: [[0, 1.5], [-7, 3.5], [-13, 4.5]], drag: [[0, 3], [13, 5], [26, 6]], post: [[0, 11], [8, 26], [13, 40]],
  seam: [[0, 35]], swing: [[-3.5, -0.8], [-8, 1], [-11, 5]], check: [[1.5, 3]], screen: [[-4.5, -1.6], [-7.5, -1.2]],
  wheel: [[-5, 0], [-9, 4], [-10, 25]]
};
var STOP_ROUTES = { curl: 1, check: 1, screen: 1 };
var PLAYS = [
  { id: "dive",   type: "run",  form: "iform", aim: 1.4, hand: 0.4, routes: { WR1: "go", WR2: "go", WR3: "lead", TE: "block" } },
  { id: "sweep",  type: "run",  form: "iform", aim: 11, hand: 0.25, routes: { WR1: "go", WR2: "block", WR3: "lead", TE: "block" } },
  { id: "slants", type: "pass", form: "gun", routes: { WR1: "slant", WR2: "slant", WR3: "out", TE: "flat", RB: "swing" } },
  { id: "curl",   type: "pass", form: "gun", routes: { WR1: "curl", WR2: "curl", WR3: "flat", TE: "drag", RB: "check" } },
  { id: "deep",   type: "pass", form: "gun", routes: { WR1: "go", WR2: "post", WR3: "curl", TE: "seam", RB: "block" } },
  { id: "screen", type: "pass", form: "gun", routes: { WR1: "go", WR2: "go", WR3: "go", TE: "block", RB: "screen" } }
];
var ZONES = { hookL: [-7, 7], mid: [0, 8], hookR: [7, 7], flatL: [-15, 5], flatR: [15, 5], deepL: [-12, 19],
  deepR: [12, 19], deepmid: [0, 21], deepOL: [-17, 24], deepOR: [17, 24], short: [0, 4] };
var DEFS = [
  { id: "run", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "read", LB2: "read", LB3: "read", CB1: "man:WR1", CB2: "man:WR2", FS: "zone:deepmid", SS: "read" } },
  { id: "cover2", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "zone:hookL", LB2: "zone:mid", LB3: "zone:hookR", CB1: "zone:flatL", CB2: "zone:flatR", FS: "zone:deepL", SS: "zone:deepR" } },
  { id: "blitz", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "rush", LB2: "man:RB", LB3: "rush", CB1: "man:WR1", CB2: "man:WR2", FS: "man:TE", SS: "man:WR3" } },
  { id: "prevent", a: { DE1: "rush", DT1: "rush", DT2: "zone:short", DE2: "rush", LB1: "zone:hookL", LB2: "zone:mid", LB3: "zone:hookR", CB1: "zone:deepOL", CB2: "zone:deepOR", FS: "zone:deepmid", SS: "zone:deepR" } }
];
function playById(id) { for (var i = 0; i < PLAYS.length; i++) if (PLAYS[i].id === id) return PLAYS[i]; return PLAYS[0]; }
function defById(id) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].id === id) return DEFS[i]; return DEFS[1]; }

// ---------- GAME STATE ----------
var G = null;
function P(id) { return PARAMS[id]; }

function newGame(home, away, opts) {
  opts = opts || {};
  var seed = opts.seed >>> 0;
  G = { attract: !!opts.attract,
    home: home, away: away, rng: mulberry32(seed), seed: seed, t: 0, bot: !!opts.bot,
    score: { H: 0, A: 0 }, quarter: 1, qlen: P("quarterMinutes") * 60, clock: P("quarterMinutes") * 60, half: 1,
    ot: 0, otLeft: 0, poss: "H", los: 35, ballX: FW / 2, down: 1, toGo: 10, phase: "kickoff", phaseT: 0,
    players: [], ball: { x: FW / 2, y: 40, z: 0, state: "dead" }, play: null, events: [], fx: [], banners: [],
    stats: {}, maxDanger: 0, maxDangerByStage: {}, lastResult: null, targetCount: {}, firstPlay: true, kick: null,
    pendingKickoff: { kicker: "A" }, twoPt: false, ended: false, outcome: null, won: false,
    userDef: null, ctl: null, lastInputT: -9, drives: 0, userPlays: 0, cam: { x: FW / 2, y: 35 }, celebrate: 0,
    playClockStopped: false, pat: null, doubleRole: null
  };
  buildFieldPlayers();
  startKickoff("A");
  return G;
}

function teamOf(tm) { return tm === "H" ? G.home : G.away; }
function rosterUnit(team, unit) { return team.roster.filter(function (p) { return p.unit === unit; }); }

function buildFieldPlayers() {
  G.players = [];
  ["H", "A"].forEach(function (tm) {
    var team = teamOf(tm), pal = teamColors(team, tm === "A");
    team.roster.forEach(function (r, i) {
      if (r.unit === "K") return;
      var fp = { tm: tm, r: r, ridx: i, unit: r.unit, role: r.unit === "O" ? ROLE_O[i] : ROLE_D[i - 11], x: FW / 2, y: 60, vx: 0, vy: 0,
        face: "down", anim: 0, state: "stand", stun: 0, eng: null, engT: 0, shedCd: 0, tackleCd: 0, assign: null, route: null, ri: 0,
        diveT: 0, downT: 0, jukeT: 0, jukeCd: 0, slowT: 0, target: null, onField: false, react: 0, gx: 0, gy: 0, cheer: 0 };
      fp.spr = buildPlayerSprites(pal, SKINS[r.skin || 0], r.num);
      G.players.push(fp);
    });
  });
}
function rebuildSprites() {
  if (!G) return;
  G.players.forEach(function (fp) { var team = teamOf(fp.tm); fp.spr = buildPlayerSprites(teamColors(team, fp.tm === "A"), SKINS[fp.r.skin || 0], fp.r.num); });
}
function kicker(tm) { var k = teamOf(tm).roster.filter(function (p) { return p.unit === "K"; })[0]; return k || { pwr: 6, hnd: 6, num: 3, name: "Kicker" }; }

function stat(tm, ridx) { var k = tm + ridx; if (!G.stats[k]) G.stats[k] = { rush: 0, rec: 0, pass: 0, td: 0, tkl: 0, int: 0 }; return G.stats[k]; }
function ev(type, extra) { var e = { t: +G.t.toFixed(2), type: type }; if (extra) for (var k in extra) e[k] = extra[k]; G.events.push(e); if (G.events.length > 400) G.events.shift(); }
function banner(key, vars, big, col) { G.banners.push({ key: key, vars: vars || {}, t: 0, big: !!big, col: col || null }); if (typeof UI !== "undefined") UI.banner(key, vars, big, col); }

function speedOf(fp) {
  var s = (5.0 + 0.34 * fp.r.spd);
  s *= (fp.tm === "H" ? P("playerSpeed") : P("cpuSpeed"));
  if (G.play && G.play.carrier === fp) s *= 0.93;
  if (fp.slowT > 0) s *= 0.55;
  return s;
}

// ---------- PHASES ----------
function setPhase(ph) { G.phase = ph; G.phaseT = 0; if (typeof UI !== "undefined") UI.onPhase(ph); }

function startKickoff(kickTeam) {
  var recv = other(kickTeam); G.kick = { kind: "kickoff", team: kickTeam, t: 0 };
  // line up: kicking team on its 40, receivers on their 40/deep
  var ky = yFromOwn(kickTeam, 40), rd = dirOf(kickTeam);
  var ks = G.players.filter(function (p) { return p.tm === kickTeam && p.unit === "D"; });
  var rs = G.players.filter(function (p) { return p.tm === recv && p.unit === "O"; });
  G.players.forEach(function (p) { p.onField = false; p.state = "stand"; p.stun = 0; p.eng = null; p.downT = 0; p.diveT = 0; p.cheer = 0; });
  ks.forEach(function (p, i) { p.onField = true; p.x = 3 + i * (FW - 6) / 10; p.y = ky - rd * 1; p.face = rd > 0 ? "up" : "down"; });
  rs.forEach(function (p, i) { p.onField = true; p.x = 4 + i * (FW - 8) / 10; p.y = yFromOwn(recv, i === 1 ? 2 : 40 - (i % 3) * 8); p.face = rd > 0 ? "down" : "up"; });
  G.ball = { x: FW / 2, y: ky, z: 0, state: "kick", x0: FW / 2, y0: ky, x1: FW / 2 + (G.rng() - 0.5) * 10, y1: yFromOwn(recv, -6), t: 0, dur: 2.3, h: 22 };
  G.play = null; G.ctl = null;
  setPhase("kickoff"); banner("b.kickoff"); ev("kickoff", { team: kickTeam }); sfx("kick");
}

function setDrive(tm, ydOwn) {
  G.poss = tm; G.los = yFromOwn(tm, ydOwn); G.ballX = FW / 2; G.down = 1;
  G.toGo = Math.min(10, 100 - ydOwn); G.drives++;
  if (G.ot && G.otLeft > 0) G.otCur = tm;
}

function beginPlayCall() {
  G.play = null; G.ctl = null; G.kick = null;
  G.players.forEach(function (p) { p.cheer = 0; });
  G.call = { off: null, def: null, flip: false, special: null };
  layoutFormation(null, null, false);
  // CPU picks immediately; user picks via UI (or bot)
  if (G.poss === "A") { var c = cpuOffenseCall(); G.call.off = c.play; G.call.flip = c.flip; G.call.special = c.special; }
  else G.call.def = cpuDefenseCall();
  setPhase("playcall");
}

function userCall(kind, id, flip) {
  if (G.phase !== "playcall") return;
  if (kind === "off") { G.call.off = id; G.call.flip = !!flip; G.call.special = null; }
  else if (kind === "def") G.call.def = id;
  else if (kind === "punt" || kind === "fg") { G.call.special = kind; }
  G.userPlays++;
  sfx("tap");
  launchCall();
}

function launchCall() {
  var c = G.call;
  if (c.special === "punt") return startPunt();
  if (c.special === "fg") return startFieldGoal(false);
  if (!c.off) c.off = "dive";
  if (!c.def) c.def = "cover2";
  startPresnap();
}

function cpuOffenseCall() {
  var r = G.rng, dist = 100 - ydFromOwn("A", G.los);
  var fgDist = dist + 17, k = kicker("A"), range = 30 + k.pwr * 2.6;
  if (G.twoPt) return { play: r() < 0.5 ? "slants" : "dive", flip: r() < 0.5 };
  if (G.down === 4) {
    var trailing = G.score.A < G.score.H, late = G.quarter >= 4 && G.clock < 120;
    if (fgDist <= range - 4 && !(trailing && G.score.H - G.score.A > 3 && late)) return { special: "fg" };
    if (G.ot || (late && trailing) || (G.toGo <= 1 && ydFromOwn("A", G.los) > 45)) { /* go */ }
    else if (!G.ot) return { special: "punt" };
  }
  var passW = G.toGo >= 8 ? 0.72 : G.toGo <= 2 ? 0.25 : 0.48;
  if (G.score.A < G.score.H && G.quarter >= 4) passW += 0.2;
  var play;
  if (r() < passW) { var x = r(); play = x < 0.35 ? "slants" : x < 0.65 ? "curl" : x < 0.88 ? "deep" : "screen"; }
  else play = r() < 0.55 ? "dive" : "sweep";
  return { play: play, flip: r() < 0.5 };
}
function cpuDefenseCall() {
  var r = G.rng(), w;
  if (G.toGo <= 2) w = { run: 0.6, cover2: 0.15, blitz: 0.2, prevent: 0.05 };
  else if (G.down === 3 && G.toGo >= 7) w = { run: 0.05, cover2: 0.4, blitz: 0.3, prevent: 0.25 };
  else w = { run: 0.3, cover2: 0.4, blitz: 0.2, prevent: 0.1 };
  if (G.half === 2) { w.blitz *= P("stageScale") * P("stageScale") * 1.4; }
  var tot = 0; for (var k in w) tot += w[k]; r *= tot;
  for (var k2 in w) { r -= w[k2]; if (r <= 0) return k2; }
  return "cover2";
}

function onField(tm, unit) { return G.players.filter(function (p) { return p.tm === tm && p.unit === unit; }); }
function byRole(tm, role) { for (var i = 0; i < G.players.length; i++) { var p = G.players[i]; if (p.tm === tm && p.role === role && p.onField) return p; } return null; }

function layoutFormation(playDef, defDef, snapTo) {
  var off = G.poss, def = other(off), d = dirOf(off), bx = G.ballX;
  var form = FORMS[(playDef && playDef.form) || "gun"], flip = G.call && G.call.flip ? -1 : 1;
  G.players.forEach(function (p) { p.onField = (p.tm === off && p.unit === "O") || (p.tm === def && p.unit === "D");
    p.state = "stand"; p.eng = null; p.stun = 0; p.diveT = 0; p.downT = 0; p.vx = 0; p.vy = 0; p.assign = null; p.route = null; p.target = null; p.shedCd = 0; p.jukeT = 0; p.slowT = 0; });
  var pos = {};
  ROLE_O.forEach(function (role) {
    var p = byRole(off, role), f = form[role]; var x = bx + f[0] * flip;
    if (role === "WR1") x = bx - 15 * flip; if (role === "WR2") x = bx + 14 * flip;
    if (role === "WR3" && (playDef ? playDef.form : "gun") === "gun") x = bx - 8 * flip;
    x = clamp(x, 2, FW - 2);
    pos[role] = [x, G.los - d * f[1]];
    p.gx = pos[role][0]; p.gy = pos[role][1];
  });
  var wr1 = pos.WR1[0], wr2 = pos.WR2[0], wr3 = pos.WR3[0];
  var dp = { DE1: [bx - 5 * flip, 1.2], DT1: [bx - 1.6 * flip, 1.2], DT2: [bx + 1.6 * flip, 1.2], DE2: [bx + 5 * flip, 1.2],
    LB1: [(bx - 5.5 * flip) * 0.5 + wr3 * 0.5, 5], LB2: [bx, 5.2], LB3: [bx + 6 * flip, 5], CB1: [wr1, 6.5], CB2: [wr2, 6.5], FS: [bx - 6, 13], SS: [bx + 6, 11] };
  ROLE_D.forEach(function (role) { var p = byRole(def, role); p.gx = clamp(dp[role][0], 1.5, FW - 1.5); p.gy = G.los + d * dp[role][1]; });
  G.players.forEach(function (p) { if (!p.onField) return; p.face = p.tm === off ? (d > 0 ? "up" : "down") : (d > 0 ? "down" : "up");
    if (snapTo) { p.x = p.gx; p.y = p.gy; } });
  if (!snapTo) {
    // first time (or after kickoff): place immediately if far away
    G.players.forEach(function (p) { if (!p.onField) return; if (Math.abs(p.x - p.gx) > 30 || Math.abs(p.y - p.gy) > 30 || G.firstLayout) { p.x = p.gx; p.y = p.gy; } });
  }
  G.ball = { x: bx, y: G.los, z: 0, state: "spot" };
}

function startPresnap() {
  var pd = playById(G.call.off), dd = defById(G.call.def);
  layoutFormation(pd, dd, false);
  G.play = { off: pd, def: dd, t: 0, carrier: null, qb: byRole(G.poss, "QB"), thrown: false, handed: false, result: null,
    startLos: G.los, startPoss: G.poss, possChanged: false, sackable: pd.type === "pass", scramble: false, crossed: false, intended: null, deadT: 0 };
  // user defender default
  if (G.poss === "A") {
    var role = dd.id === "prevent" ? "FS" : "LB2";
    G.userDef = byRole("H", role);
  }
  setPhase("presnap");
}

function snap() {
  var pl = G.play, off = G.poss, def = other(off), d = dirOf(off), flip = G.call.flip ? -1 : 1;
  pl.t = 0; G.players.forEach(function (p) { if (p.onField) { p.x = p.gx; p.y = p.gy; } });
  // offense assignments
  ROLE_O.forEach(function (role) {
    var p = byRole(off, role); var rt = pl.off.routes[role];
    if (role === "QB") { p.assign = pl.off.type === "pass" ? "drop" : "hand"; return; }
    if (role === "RB") { if (pl.off.type === "run") { p.assign = "carry"; return; } }
    if (rt && ROUTES[rt]) {
      var inward = p.x < G.ballX ? 1 : -1; if (Math.abs(p.x - G.ballX) < 0.5) inward = -flip;
      p.assign = "route"; p.routeName = rt;
      p.route = ROUTES[rt].map(function (w) { return { x: clamp(p.x + inward * w[0], 1, FW - 1), y: p.y + d * w[1] }; });
      p.ri = 0; p.routeStop = !!STOP_ROUTES[rt];
      if (rt === "check" || rt === "screen") p.delay = rt === "screen" ? 0.9 : 0.8; else p.delay = 0;
    } else if (rt === "lead") p.assign = "lead";
    else p.assign = "block";
  });
  // defense assignments
  ROLE_D.forEach(function (role) {
    var p = byRole(def, role), a = pl.def.a[role];
    if (def === "A" && G.half === 2 && a.indexOf("zone:hook") === 0 && G.rng() < (P("stageScale") - 1) * 1.3) a = "rush";
    if (def === "A" && G.half === 2 && G.lastCatchRole && role === "FS" && pl.def.id !== "blitz") { a = "man:" + G.lastCatchRole; if (!G.doubleShown) { G.doubleShown = true; G.doubleRole = G.lastCatchRole; if (typeof UI !== "undefined" && !G.attract) UI.hint(T("hint.double", { n: byRole("H", G.lastCatchRole).r.num })); } }
    p.assign = a; p.react = 0.12 + G.rng() * 0.25 / (def === "A" ? P("coverage") : 1);
  });
  // blocking pairs
  var rushers = G.players.filter(function (p) { return p.tm === def && p.onField && p.assign === "rush"; });
  var ol = ["LT", "LG", "C", "RG", "RT"].map(function (r) { return byRole(off, r); });
  if (pl.off.type === "pass") {
    var used = [];
    ol.forEach(function (b) { var best = null, bd = 1e9;
      rushers.forEach(function (r) { if (used.indexOf(r) >= 0) return; var dd2 = Math.abs(r.x - b.x); if (dd2 < bd) { bd = dd2; best = r; } });
      if (best) { used.push(best); b.target = best; } else b.target = null; });
  } else {
    var dl = G.players.filter(function (p) { return p.tm === def && p.onField; });
    var used2 = [];
    ol.forEach(function (b) { var best = null, bd = 1e9;
      dl.forEach(function (r) { if (used2.indexOf(r) >= 0) return; var dd3 = Math.abs(r.x - b.x) + Math.abs(r.y - b.y) * 0.6; if (dd3 < bd) { bd = dd3; best = r; } });
      if (best) { used2.push(best); b.target = best; } });
  }
  G.ball = { x: G.ballX, y: G.los, z: 0, state: "held", holder: pl.qb };
  pl.carrier = null; pl.holder = pl.qb;
  if (G.poss === "H") G.ctl = pl.qb;
  else G.ctl = G.userDef;
  setPhase("live"); sfx("snap"); ev("snap", { play: pl.off.id, def: pl.def.id, poss: G.poss });
}

// ---------- LIVE PLAY ----------
function isUserCtl(p) { return p && p === G.ctl && !G.bot; }

function updateLive(dt, inp) {
  var pl = G.play; pl.t += dt;
  if (!G.ot && !G.clockStopped) { G.clock = Math.max(0, G.clock - dt); }
  var off = pl.carrier ? pl.carrier.tm : G.poss, d = dirOf(G.poss);
  // user control switching
  if (inp && inp.sw && G.poss === "A" && !G.bot) switchDefender();
  // QB logic
  var qb = pl.qb;
  if (!pl.handed && !pl.thrown && !pl.carrier) {
    if (pl.off.type === "run") {
      if (pl.t >= pl.off.hand) { var rb = byRole(G.poss, "RB"); handoff(rb); }
    } else {
      // pass play: QB holds
      var userQB = G.poss === "H" && !G.bot;
      if (userQB && inp && inp.throwTo) { var tr = byRole("H", inp.throwTo); if (tr && tr.assign === "route" && !pl.crossed) throwTo(tr); }
      else if (!userQB) cpuQBThink(dt);
      // crossing the LOS turns the QB into a runner
      if (!pl.thrown && (qb.y - G.los) * d > 0.6) { pl.crossed = true; pl.carrier = qb; pl.scramble = true; ev("scramble"); }
    }
  }
  // ball
  updateBall(dt);
  if (G.phase !== "live") return;
  // move everyone
  for (var i = 0; i < G.players.length; i++) { var p = G.players[i]; if (!p.onField) continue; movePlayer(p, dt, inp); }
  resolveBlocks(dt);
  separate(dt);
  // carrier checks
  var c = pl.carrier;
  if (c && G.phase === "live") {
    var gy = goalY(c.tm);
    if ((c.y - gy) * dirOf(c.tm) >= 0) return endPlay("td", c);
    if (c.x < 0 || c.x > FW) return endPlay("oob", c);
    if ((c.y - (dirOf(c.tm) > 0 ? 0 : 120)) * dirOf(c.tm) < 0) return endPlay("tackle", c); // out the back
    tackleChecks(dt, c);
  } else if (!pl.thrown && qb && G.phase === "live" && !pl.handed) {
    if (qb.x < 0 || qb.x > FW) return endPlay("oob", qb);
    tackleChecks(dt, qb);
  }
  if (pl.t > 25) endPlay("tackle", pl.carrier || qb);
}

function handoff(rb) {
  var pl = G.play; pl.handed = true; pl.carrier = rb; G.ball.holder = rb; G.ball.state = "held";
  if (G.poss === "H") G.ctl = rb; ev("handoff"); sfx("tap");
}

function cpuQBThink(dt) {
  var pl = G.play, qb = pl.qb; pl.think = (pl.think || 0) - dt;
  if (pl.t < 0.9 || pl.think > 0) return; pl.think = 0.18;
  var d = dirOf(G.poss), opp = other(G.poss);
  var press = nearestOpp(qb, opp), pressD = press ? dist(press, qb) : 99;
  var best = null, bs = -1e9;
  ["WR1", "WR2", "WR3", "TE", "RB"].forEach(function (role) {
    var r = byRole(G.poss, role); if (!r || r.assign !== "route" || r.delay > 0.3 && pl.t < r.delay) return;
    var o = openness(r, opp); var depth = (r.y - G.los) * d;
    var s = o * 1.4 + Math.min(depth, 25) * 0.08 + (depth >= G.toGo ? 1.2 : 0) - (dist(r, qb) > 42 ? 9 : 0);
    if (depth < -2) s -= 1;
    if (s > bs) { bs = s; best = { r: r, o: o, s: s }; }
  });
  var holdMax = 3.4 - (G.bot ? 0 : 0);
  if (best && ((best.o > 2.6 && pl.t > 1.2) || (pressD < 2.2 && best.o > 1.4) || (pl.t > holdMax && best.o > 0.9))) { throwTo(best.r); return; }
  if (pl.t > holdMax + 0.8 || (pressD < 1.6 && pl.t > 2)) {
    // scramble: run
    pl.qbRun = true;
  }
}
function openness(r, opp) {
  var m = 99; for (var i = 0; i < G.players.length; i++) { var p = G.players[i];
    if (!p.onField || p.tm !== opp || p.downT > 0) continue; var dd = dist(p, { x: r.x + r.vx * 0.5, y: r.y + r.vy * 0.5 }); if (dd < m) m = dd; }
  return m;
}
function nearestOpp(p, opp, ignoreEng) {
  var best = null, bd = 1e9; for (var i = 0; i < G.players.length; i++) { var q = G.players[i];
    if (!q.onField || q.tm !== opp || q.downT > 0 || (ignoreEng && q.eng)) continue; var dd = dist(q, p); if (dd < bd) { bd = dd; best = q; } }
  return best;
}

function throwTo(r) {
  var pl = G.play, qb = pl.qb; if (pl.thrown) return;
  var spd = 19 + qb.r.pwr * 0.9;
  var tx = r.x, ty = r.y, T = 0;
  for (var k = 0; k < 3; k++) { T = len(tx - qb.x, ty - qb.y) / spd; var vx = r.vx, vy = r.vy;
    if (r.route && r.ri < r.route.length) { var w = r.route[r.ri]; var dx = w.x - r.x, dy = w.y - r.y, l = len(dx, dy) || 1, s = speedOf(r); vx = dx / l * s; vy = dy / l * s; }
    if (r.routeStop && r.ri >= r.route.length) { vx = 0; vy = 0; }
    tx = r.x + vx * T; ty = r.y + vy * T; }
  var range = 32 + qb.r.pwr * 2.2; var dd = len(tx - qb.x, ty - qb.y);
  var opp = other(qb.tm), press = nearestOpp(qb, opp), pressD = press ? dist(press, qb) : 99;
  var err = (0.5 + (10 - qb.r.hnd) * 0.1) * (dd / 18) * (pressD < 2 ? 1.7 : 1) * (dd > range ? 2.2 : 1);
  var g1 = (G.rng() + G.rng() + G.rng() - 1.5), g2 = (G.rng() + G.rng() + G.rng() - 1.5);
  tx += g1 * err; ty += g2 * err * 0.8;
  tx = clamp(tx, -2, FW + 2);
  G.ball = { state: "air", x0: qb.x, y0: qb.y, x1: tx, y1: ty, t: 0, dur: Math.max(0.35, T), h: 1.5 + dd * 0.11, x: qb.x, y: qb.y, z: 1.5, target: r, thrower: qb };
  pl.thrown = true; pl.intended = r; pl.sackable = false; pl.throwSpot = { x: tx, y: ty };
  G.targetCount[r.role] = (G.targetCount[r.role] || 0) + 1;
  r.assign = "catch"; r.catchT = 0;
  // defenders react
  G.players.forEach(function (p) { if (p.onField && p.tm !== qb.tm && p.unit === "D") p.breakT = p.react + 0.1; });
  if (qb.tm === "H" && !G.bot) G.ctl = r;
  ev("pass", { to: r.role }); sfx("throw");
}

function updateBall(dt) {
  var b = G.ball, pl = G.play;
  if (b.state === "held" && b.holder) { var h = b.holder; b.x = h.x + (h.face === "side" ? (h.flipX ? -0.4 : 0.4) : 0.35); b.y = h.y; b.z = 1.2; return; }
  if (b.state === "air") {
    b.t += dt; var u = Math.min(1, b.t / b.dur);
    b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u; b.z = 1.5 * (1 - u) + 4 * b.h * u * (1 - u) + 0.6 * u;
    if (u >= 1) resolveCatch();
    return;
  }
  if (b.state === "loose") { b.t += dt; b.z = Math.max(0, b.z - dt * 6); }
}

function resolveCatch() {
  var b = G.ball, pl = G.play, r = b.target, opp = other(r.tm);
  var spot = { x: b.x1, y: b.y1 };
  var dr = dist(r, spot);
  var dd = 99, dfn = null;
  G.players.forEach(function (p) { if (!p.onField || p.tm !== opp || p.downT > 0 || p.eng) return; var q = dist(p, spot); if (q < dd) { dd = q; dfn = p; } });
  var rnd = G.rng();
  if (spot.x < 0 || spot.x > FW || (spot.y - goalY(r.tm)) * dirOf(r.tm) > 10) { return incomplete(); }
  if (dfn && dd < 1.05 && dd < dr - 0.15) {
    var pInt = 0.2 + 0.045 * (dfn.r.hnd - 5) + (isUserCtl(dfn) ? 0.12 : 0);
    if (rnd < pInt) return intercept(dfn);
    ev("breakup"); return incomplete();
  }
  if (dr < 1.55) {
    var cs = r.tm === "H" ? P("catchSkill") : 1;
    var pc = (0.84 + 0.035 * (r.r.hnd - 5)) * (0.8 + 0.2 * cs) + (cs - 1) * 0.12 - (dd < 1.2 ? 0.17 : dd < 1.8 ? 0.07 : 0) - Math.max(0, dr - 0.9) * 0.2;
    pc = clamp(pc, 0.08, 0.97);
    if (rnd < pc) return complete(r);
    ev("drop"); return incomplete();
  }
  if (dfn && dd < 1.4 && rnd < 0.12) return intercept(dfn);
  return incomplete();
}
function complete(r) {
  var pl = G.play; pl.carrier = r; G.ball = { state: "held", holder: r, x: r.x, y: r.y, z: 1 };
  r.assign = "carry"; pl.catchY = r.y; pl.completion = true;
  if (r.tm === "H" && !G.bot) G.ctl = r;
  if (r.tm === "A" && !G.bot) { var near = nearestOpp(r, "H"); if (G.userDef && dist(G.userDef, r) > 12 && near) G.userDef = near; G.ctl = G.userDef; }
  if (r.tm === "H") G.lastCatchRole = r.role;
  ev("pass_complete", { to: r.role }); sfx("catch");
}
function incomplete() {
  var b = G.ball; b.state = "loose"; b.t = 0; b.z = 0.8;
  endPlay("inc", null);
}
function intercept(dfn) {
  var pl = G.play; pl.carrier = dfn; pl.possChanged = true; pl.intBy = dfn.tm;
  G.ball = { state: "held", holder: dfn, x: dfn.x, y: dfn.y, z: 1 };
  dfn.assign = "carry"; stat(dfn.tm, dfn.ridx).int++;
  if (dfn.tm === "H") G.ctl = dfn; else { var near = nearestOpp(dfn, "H"); G.ctl = near; G.userDef = near; }
  banner("b.int", null, true, "#ff5a3c"); ev("interception", { by: dfn.tm }); sfx("int");
  // everyone flips roles
  G.players.forEach(function (p) { if (!p.onField) return; p.eng = null; p.target = null; if (p !== dfn) p.assign = p.tm === dfn.tm ? "escort" : "pursue"; });
}

function switchDefender() {
  var b = G.play && G.play.carrier ? G.play.carrier : G.ball;
  var best = null, bd = 1e9;
  G.players.forEach(function (p) { if (p.onField && p.tm === "H" && p !== G.ctl && p.downT <= 0) { var dd = dist(p, b); if (dd < bd) { bd = dd; best = p; } } });
  if (best) { G.ctl = best; G.userDef = best; sfx("tap"); ev("switch"); }
}

function steerTo(p, tx, ty, s, dt, rate) {
  var dx = tx - p.x, dy = ty - p.y, l = len(dx, dy);
  var vx = 0, vy = 0; if (l > 0.15) { var sp = Math.min(s, l * 4); vx = dx / l * sp; vy = dy / l * sp; }
  p.vx = damp(p.vx, vx, rate || 9, dt); p.vy = damp(p.vy, vy, rate || 9, dt);
}

function movePlayer(p, dt, inp) {
  var pl = G.play, s = speedOf(p), d = dirOf(G.poss), b = G.ball;
  p.tackleCd = Math.max(0, p.tackleCd - dt); p.shedCd = Math.max(0, p.shedCd - dt); p.slowT = Math.max(0, p.slowT - dt);
  p.jukeT = Math.max(0, p.jukeT - dt); p.jukeCd = Math.max(0, p.jukeCd - dt);
  if (p.breakT > 0) p.breakT -= dt;
  if (p.downT > 0) { p.downT -= dt; p.vx = damp(p.vx, 0, 10, dt); p.vy = damp(p.vy, 0, 10, dt); integ(p, dt); return; }
  if (p.diveT > 0) { p.diveT -= dt; integ(p, dt); if (p.diveT <= 0) { p.downT = 0.75; p.state = "down"; } return; }
  if (p.stun > 0) { p.stun -= dt; p.vx = damp(p.vx, 0, 8, dt); p.vy = damp(p.vy, 0, 8, dt); integ(p, dt); return; }
  if (p.eng) { integ(p, dt); return; } // handled in resolveBlocks
  var carrier = pl.carrier;
  // ---- user control ----
  var stickOn = inp && (Math.abs(inp.mx) + Math.abs(inp.my) > 0.05);
  if (isUserCtl(p)) {
    if (inp && inp.juke && carrier === p && p.jukeCd <= 0) { juke(p, inp.mx); }
    if (inp && inp.dive && carrier !== p && p.tm !== (carrier ? carrier.tm : G.poss)) { dive(p, inp); return; }
    if (stickOn) {
      var l = Math.min(1, len(inp.mx, inp.my)) || 1, nx = inp.mx / (len(inp.mx, inp.my) || 1), ny = inp.my / (len(inp.mx, inp.my) || 1);
      p.vx = damp(p.vx, nx * s, 14, dt); p.vy = damp(p.vy, ny * s, 14, dt);
      G.lastInputT = G.t; integ(p, dt); return;
    }
    if (p === pl.qb && !pl.thrown && !pl.crossed && G.poss === "H" && pl.off.type === "pass") {
      // idle user QB: drop back, then hold the pocket
      steerTo(p, p.gx, G.los - d * 7, s * 0.8, dt, 14); integ(p, dt); return;
    }
    // idle: fall through to AI assist
  }
  // ---- AI ----
  if (carrier === p) { aiRunner(p, dt, s); integ(p, dt); return; }
  if (carrier) {
    if (p.tm !== carrier.tm) { // pursue
      var lead = Math.min(1.2, dist(p, carrier) / s) * 0.8;
      var tx = carrier.x + carrier.vx * lead, ty = carrier.y + carrier.vy * lead;
      steerTo(p, tx, ty, s * (p.tm === "A" ? 1 : 0.95), dt, 9);
      if (!isUserCtl(p) && dist(p, carrier) < 2.3 && dist(p, carrier) > 1.0 && p.tackleCd <= 0 && G.rng() < dt * 1.6) { dive(p, null, carrier); return; }
      integ(p, dt); return;
    }
    // teammates of the carrier: block
    if (p.unit === "O" && /^(LT|LG|C|RG|RT)$/.test(p.role) && p.target && !p.target.downT && !pl.possChanged) { steerBlock(p, dt, s); integ(p, dt); return; }
    var tgt = p.target && p.target.onField && p.target.downT <= 0 && !p.target.eng ? p.target : null;
    if (!tgt || G.rng() < dt * 0.6) { tgt = nearestThreat(p, carrier); p.target = tgt; }
    if (tgt && dist(tgt, carrier) < 14) { steerBlock(p, dt, s); }
    else steerTo(p, carrier.x + (p.x > carrier.x ? 3 : -3), carrier.y + dirOf(carrier.tm) * 4, s * 0.9, dt, 8);
    integ(p, dt); return;
  }
  // ---- pre-catch / pre-handoff ----
  if (p.tm === G.poss) offenseAI(p, dt, s, d);
  else defenseAI(p, dt, s, d);
  integ(p, dt);
}

function integ(p, dt) {
  p.x += p.vx * dt; p.y += p.vy * dt;
  var sp = len(p.vx, p.vy);
  if (sp > 0.6) { p.anim += dt * sp * 1.3; if (Math.abs(p.vy) > Math.abs(p.vx) * 0.9) { p.face = p.vy > 0 ? "up" : "down"; } else { p.face = "side"; p.flipX = p.vx < 0; } }
  else p.anim = 0;
}

function juke(p, mx) {
  var side = Math.abs(mx) > 0.2 ? Math.sign(mx) : (G.rng() < 0.5 ? -1 : 1);
  p.vx += side * 6.5; p.jukeT = 0.32; p.jukeCd = 1.1; ev("juke"); sfx("juke");
}
function dive(p, inp, target) {
  var dx, dy;
  if (inp && (Math.abs(inp.mx) + Math.abs(inp.my) > 0.05)) { dx = inp.mx; dy = inp.my; }
  else { var c = target || (G.play && G.play.carrier) || G.ball; dx = c.x - p.x; dy = c.y - p.y; }
  var l = len(dx, dy) || 1; p.vx = dx / l * 10.5; p.vy = dy / l * 10.5; p.diveT = 0.3; p.state = "dive"; p.face = "side"; p.flipX = dx < 0;
  p.diving = true; ev("dive"); if (isUserCtl(p)) sfx("juke");
}

function aiRunner(p, dt, s) {
  var pl = G.play, d = dirOf(p.tm), opp = other(p.tm);
  var tx = 0, ty = d * 1.6;
  if (pl.off && pl.off.type === "run" && !pl.possChanged && pl.t < 1.6 && p.role === "RB") {
    var aimX = G.ballX + pl.off.aim * (G.call.flip ? -1 : 1); tx += clamp(aimX - p.x, -1, 1) * 1.4;
  }
  if (pl.qbRun && p === pl.qb && !pl.crossed) { tx += (p.x < FW / 2 ? 1 : -1) * 0.8; }
  for (var i = 0; i < G.players.length; i++) { var q = G.players[i];
    if (!q.onField || q.tm !== opp || q.downT > 0) continue;
    var dx = p.x - q.x, dy = p.y - q.y, dd = len(dx, dy); if (dd > 7) continue;
    var ahead = (q.y - p.y) * d > -1.5 ? 1 : 0.35; var w = (q.eng ? 0.25 : 1) * ahead / Math.max(0.6, dd * dd) * 2.0;
    tx += dx / (dd || 1) * w; ty += dy / (dd || 1) * w * 0.55;
  }
  // sideline avoidance
  if (p.x < 3) tx += (3 - p.x) * 0.8; if (p.x > FW - 3) tx -= (p.x - (FW - 3)) * 0.8;
  if (ty * d < 0.4) ty = d * 0.4;
  var l = len(tx, ty) || 1; p.vx = damp(p.vx, tx / l * s, 9, dt); p.vy = damp(p.vy, ty / l * s, 9, dt);
  if (p.tm === "A" || G.bot) { var n = nearestOpp(p, opp, true); if (n && dist(n, p) < 1.7 && p.jukeCd <= 0 && G.rng() < dt * 2.2) juke(p, p.x - n.x > 0 ? 1 : -1); }
}

function offenseAI(p, dt, s, d) {
  var pl = G.play;
  if (p === pl.qb) {
    if (pl.off.type === "run") { steerTo(p, p.x - (G.call.flip ? -1 : 1) * 0.5, G.los - d * 2.4, s * 0.6, dt); return; }
    if (pl.qbRun) { aiRunner(p, dt, s); return; }
    var dropY = G.los - d * 7, threat = nearestOpp(p, other(p.tm), true);
    var tx = p.gx, ty = dropY;
    if (pl.t > 1.2 && threat && dist(threat, p) < 3) { tx = p.x + (p.x - threat.x) * 0.8; ty = p.y + (p.y - threat.y) * 0.3; }
    steerTo(p, tx, ty, s * 0.8, dt); return;
  }
  if (p.assign === "carry" && !pl.handed) { // RB before handoff: approach the mesh point
    var flip = G.call.flip ? -1 : 1; steerTo(p, G.ballX + pl.off.aim * flip * 0.35, G.los - d * 3.2, s * 0.8, dt); return; }
  if (p.assign === "route" || p.assign === "catch") {
    if (p.assign === "catch" && G.ball.state === "air") { // run to the landing spot
      steerTo(p, G.ball.x1, G.ball.y1, s, dt, 10); return; }
    if (p.delay > 0 && pl.t < p.delay) { steerBlockNear(p, dt, s); return; }
    if (p.route && p.ri < p.route.length) {
      var w = p.route[p.ri]; if (len(w.x - p.x, w.y - p.y) < 0.9) p.ri++;
      if (p.ri < p.route.length) { w = p.route[p.ri]; steerTo(p, w.x, w.y, s, dt, 10); return; }
    }
    if (p.routeStop) { // settle and face QB
      p.vx = damp(p.vx, 0, 8, dt); p.vy = damp(p.vy, 0, 8, dt); return; }
    var last = p.route[p.route.length - 1], prev = p.route.length > 1 ? p.route[p.route.length - 2] : { x: last.x, y: last.y - d };
    var dx = last.x - prev.x, dy = last.y - prev.y, l = len(dx, dy) || 1;
    var vx = dx / l * s, vy = dy / l * s; if (p.x < 1.5 && vx < 0 || p.x > FW - 1.5 && vx > 0) { vx = 0; vy = d * s; }
    p.vx = damp(p.vx, vx, 8, dt); p.vy = damp(p.vy, vy, 8, dt); return;
  }
  if (p.assign === "lead") {
    var flip2 = G.call.flip ? -1 : 1, hx = G.ballX + pl.off.aim * flip2;
    if (!p.target || p.target.downT > 0) p.target = nearestOppTo({ x: hx, y: G.los + d * 2 }, other(p.tm), p);
    if (p.target) steerBlock(p, dt, s); return;
  }
  // linemen / blockers
  if (/^(LT|LG|C|RG|RT)$/.test(p.role)) {
    if (p.target && p.target.onField && p.target.downT <= 0) steerBlock(p, dt, s * 0.9);
    else { var t = nearestOppTo({ x: p.x, y: p.y + d * 1 }, other(p.tm), p, 6); if (t) { p.target = t; } else steerTo(p, p.x, G.los - d * (pl.off.type === "pass" ? 2.5 : -2), s * 0.5, dt); }
    return;
  }
  steerBlockNear(p, dt, s);
}
function steerBlockNear(p, dt, s) {
  var pl = G.play, d = dirOf(p.tm);
  if (!p.target || p.target.downT > 0 || !p.target.onField) p.target = nearestOppTo(pl.qb, other(p.tm), p, 9);
  if (p.target) steerBlock(p, dt, s); else steerTo(p, p.gx, G.los - d * 3, s * 0.6, dt);
}
function nearestOppTo(pt, opp, self, maxD) {
  var best = null, bd = maxD || 1e9; G.players.forEach(function (q) { if (!q.onField || q.tm !== opp || q.downT > 0) return;
    var dd = dist(q, pt); if (dd < bd) { bd = dd; best = q; } }); return best;
}
function nearestThreat(p, c) {
  var best = null, bd = 1e9; G.players.forEach(function (q) { if (!q.onField || q.tm === c.tm || q.downT > 0 || q.eng) return;
    var dd = dist(q, c) + dist(q, p) * 0.6; if (dd < bd) { bd = dd; best = q; } }); return best;
}
function protectPoint(p) {
  var pl = G.play; var c = pl.carrier || pl.qb; return c;
}
function steerBlock(p, dt, s) {
  var t = p.target, c = protectPoint(p); if (!t) return;
  var dx = t.x - c.x, dy = t.y - c.y, l = len(dx, dy) || 1;
  var gx = t.x - dx / l * 0.9, gy = t.y - dy / l * 0.9;
  steerTo(p, gx, gy, s, dt, 10);
  if (!t.eng && t.shedCd <= 0 && dist(p, t) < 1.15 && !t.diveT && t !== G.play.carrier) engage(p, t);
}
function engage(b, t) {
  var pl = G.play, f = Math.pow((b.r.pwr + 1) / (t.r.pwr + 1), 1.25);
  var rushF = t.tm === "A" ? P("passRush") : 1;
  var base = (pl.off && pl.off.type === "run" && !pl.thrown) ? 0.45 : 1.05;
  if (pl.carrier) base = 0.45;
  t.eng = b; b.eng = t; t.engT = (base + G.rng() * (base > 0.5 ? 1.4 : 0.9)) * f / rushF; b.engT = t.engT;
  if (isUserCtl(t)) t.engT *= 0.6;
  if (pl.off && pl.off.type === "pass" && !pl.thrown && G.rng() < 0.09 * rushF) t.engT = 0.3; // swim move
}
function resolveBlocks(dt) {
  var pl = G.play;
  G.players.forEach(function (t) {
    if (!t.eng) return; var b = t.eng;
    if (!t.onField || !b.onField || t.downT > 0 || b.downT > 0) { t.eng = null; b.eng = null; return; }
    t.engT -= dt * (isUserCtl(t) && G.lastInputT > G.t - 0.2 ? 1.6 : 1);
    if (t.engT <= 0) { t.eng = null; b.eng = null; t.shedCd = 0.9; b.target = null; b.stun = 0.25; return; }
    // defender pushes toward its goal at reduced speed, blocker mirrors in front
    var c = pl.carrier || pl.qb; var gx = c.x, gy = c.y;
    var dx = gx - t.x, dy = gy - t.y, l = len(dx, dy) || 1, push = speedOf(t) * 0.16;
    t.vx = damp(t.vx, dx / l * push, 8, dt); t.vy = damp(t.vy, dy / l * push, 8, dt);
    t.x += t.vx * dt; t.y += t.vy * dt;
    var nx = b.x - t.x, ny = b.y - t.y, nl = len(nx, ny) || 1;
    var wantX = t.x - dx / l * 0.85, wantY = t.y - dy / l * 0.85;
    b.vx = (wantX - b.x) * 6; b.vy = (wantY - b.y) * 6; b.x += b.vx * dt; b.y += b.vy * dt;
    b.face = t.face === "up" ? "down" : t.face === "down" ? "up" : "side";
    b.anim += dt * 3; t.anim += dt * 3;
  });
}
function separate(dt) {
  var ps = G.players;
  for (var i = 0; i < ps.length; i++) { var a = ps[i]; if (!a.onField || a.downT > 0) continue;
    for (var j = i + 1; j < ps.length; j++) { var b = ps[j]; if (!b.onField || b.downT > 0 || a.eng === b) continue;
      var dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy; if (dd > 0.5 || dd === 0) continue;
      var d = Math.sqrt(dd), push = (0.71 - d) * 0.5, nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; } }
}

function defenseAI(p, dt, s, d) {
  var pl = G.play, qb = pl.qb, a = p.assign || "zone:mid", ball = G.ball;
  if (p.tm === "A") s *= 1; // cpuSpeed already in speedOf
  // break on a thrown ball
  if (ball.state === "air" && p.breakT !== undefined && p.breakT <= 0) {
    var land = { x: ball.x1, y: ball.y1 }, dl = dist(p, land);
    if (dl < 11 || (a.indexOf("man:") === 0 && pl.intended && a.slice(4) === pl.intended.role)) { steerTo(p, land.x, land.y, s, dt, 10); return; }
  }
  if (a === "rush") {
    var tgt = pl.handed ? pl.carrier : qb;
    var lead = 0.25; steerTo(p, tgt.x + tgt.vx * lead, tgt.y + tgt.vy * lead, s * (p.tm === "A" ? (0.85 + 0.15 * P("passRush")) : 1), dt, 8);
    return;
  }
  if (a === "read") {
    if (pl.handed || pl.qbRun || pl.scramble) { var c = pl.carrier || qb; steerTo(p, c.x + c.vx * 0.4, c.y + c.vy * 0.4, s, dt, 8); return; }
    if (pl.t < 0.45) { steerTo(p, p.gx + (G.ballX - p.gx) * 0.25, G.los + d * 2.6, s * 0.8, dt); return; }
    a = p.role === "SS" ? "zone:deepR" : p.role === "LB1" ? "zone:hookL" : p.role === "LB3" ? "zone:hookR" : "zone:mid";
  }
  if (a.indexOf("man:") === 0) {
    var r = byRole(G.poss, a.slice(4));
    if (!r || r.assign !== "route" && r.assign !== "catch") {
      // receiver blocks or is the runner: read the ball
      if (pl.handed) { var c2 = pl.carrier; steerTo(p, c2.x, c2.y, s, dt, 8); return; }
      steerTo(p, p.gx, G.los + d * 5, s * 0.7, dt); return;
    }
    var cov = p.tm === "A" ? P("coverage") : 1;
    var lead2 = 0.15 + 0.35 * clamp(cov, 0.5, 1.5);
    var cushion = 1.1 + (p.role === "FS" || p.role === "SS" ? 1 : 0);
    steerTo(p, r.x + r.vx * lead2, r.y + r.vy * lead2 + d * cushion * 0.6, s * (0.88 + 0.12 * cov), dt, 6 + 4 * cov);
    return;
  }
  if (a.indexOf("zone:") === 0) {
    var z = ZONES[a.slice(5)] || ZONES.mid, zx = clamp(G.ballX + z[0], 2, FW - 2), zy = G.los + d * z[1];
    // shade toward the nearest receiver in the zone
    var best = null, bd = 8 + (p.tm === "A" ? 2 * (P("coverage") - 1) : 0);
    ["WR1", "WR2", "WR3", "TE", "RB"].forEach(function (role) { var r2 = byRole(G.poss, role); if (!r2 || r2.assign !== "route") return;
      var dz = len(r2.x - zx, r2.y - zy); if (dz < bd) { bd = dz; best = r2; } });
    var tx = zx, ty = zy;
    if (best) { tx = zx * 0.35 + best.x * 0.65; ty = zy * 0.35 + (best.y + d * 1.2) * 0.65; }
    if (pl.handed && pl.t > 0.5) { var c3 = pl.carrier; tx = c3.x; ty = c3.y; }
    steerTo(p, tx, ty, s * 0.92, dt, 7);
  }
}

function tackleChecks(dt, c) {
  var opp = other(c.tm);
  for (var i = 0; i < G.players.length; i++) { var q = G.players[i];
    if (!q.onField || q.tm !== opp || q.downT > 0 || q.eng || q.tackleCd > 0 || q.stun > 0) continue;
    var reach = 0.95 * (q.tm === "A" ? P("tackleRadius") : 1) + (q.diveT > 0 ? 0.35 : 0);
    if (dist(q, c) > reach) continue;
    var pT = 0.71 + 0.06 * (q.r.pwr - c.r.pwr) + (q.diveT > 0 ? 0.28 : 0) - (c.jukeT > 0 ? 0.45 : 0) + (isUserCtl(q) ? 0.08 : 0);
    if (c.tm === "H" && !G.bot) pT -= 0.04;
    pT = clamp(pT, 0.12, 0.96);
    if (G.rng() < pT) { stat(q.tm, q.ridx).tkl++; G.play.tackler = q;
      var behind = (c.y - G.play.startLos) * dirOf(G.play.startPoss) < 0;
      var isSack = G.play.off.type === "pass" && !G.play.thrown && c === G.play.qb && !G.play.possChanged && behind;
      if (q.diveT > 0) { q.diveT = 0; q.downT = 0.8; }
      c.downT = 1.2; c.state = "down"; c.vx *= 0.3; c.vy *= 0.3;
      return endPlay(isSack ? "sack" : "tackle", c);
    } else { q.stun = 0.45; q.tackleCd = 0.6; c.slowT = 0.3; if (q.diveT > 0) { q.diveT = 0; q.downT = 0.8; } ev("broken_tackle"); sfx("hit");
      if (c.tm === "H") popup(c.x, c.y, "b.broken"); }
  }
}

// ---------- END OF PLAY ----------
function endPlay(kind, c) {
  var pl = G.play; if (!pl || pl.result) return;
  pl.result = kind; pl.endSpot = c ? { x: c.x, y: c.y } : null; pl.endCarrier = c;
  setPhase("dead"); G.deadT = 0;
  if (kind === "td") { sfx("td"); } else if (kind === "inc") sfx("inc"); else if (kind === "oob") sfx("whistle"); else sfx("hit");
  // stats: yards
  if (c && pl.carrier === c && kind !== "inc") {
    var team = c.tm, d = dirOf(team);
    var gain;
    if (pl.possChanged) gain = 0;
    else gain = (Math.min((c.y - pl.startLos) * d, (goalY(team) - pl.startLos) * d));
    var st = stat(team, c.ridx);
    if (pl.completion) { var qbS = stat(team, pl.qb.ridx); qbS.pass += Math.round(gain); st.rec += Math.round(gain); }
    else if (!pl.possChanged && !(kind === "sack")) st.rush += Math.round(gain);
    if (kind === "td") st.td++;
  }
  G.celebrate = 0;
  if (kind === "td" && c) { G.players.forEach(function (p) { if (p.onField && p.tm === c.tm) p.cheer = 1; }); }
  ev(kind === "td" ? "touchdown" : kind, { poss: G.poss });
}

function afterDead() {
  var pl = G.play, kind = pl.result, c = pl.endCarrier, startPoss = pl.startPoss;
  if (typeof UI !== "undefined" && !G.attract) UI.ticker(pl);
  ev("result", { kind: kind, poss: startPoss, play: pl.off.id, def: pl.def.id, gain: c && kind !== "inc" ? Math.round((c.y - pl.startLos) * dirOf(startPoss)) : 0, cmp: !!pl.completion, catchGain: pl.completion && pl.catchY !== undefined ? Math.round((pl.catchY - pl.startLos) * dirOf(startPoss)) : null, t: +pl.t.toFixed(1) });
  var stopClock = kind === "inc" || kind === "oob" || kind === "td" || pl.possChanged;
  var newPoss = pl.possChanged ? pl.carrier.tm : G.poss;
  G.lastResult = null;
  if (G.twoPt) {
    G.twoPt = false;
    if (kind === "td") { G.score[startPoss === pl.carrier.tm ? startPoss : pl.carrier.tm] += 2; banner("b.two", null, true, "#ffd23f"); sfx("first"); }
    else banner("b.twono");
    return afterScore(startPoss);
  }
  if (kind === "td") {
    var scorer = c.tm; G.score[scorer] += 6; ev("score", { team: scorer, pts: 6 });
    banner("b.td", null, true, "#ffd23f");
    G.patTeam = scorer; return startPAT(scorer);
  }
  var spotY = c ? c.y : G.los;
  if (kind === "inc") spotY = G.los;
  // safety / touchback
  if (c && kind !== "inc") {
    var ct = c.tm, ogy = ownGoalY(ct);
    if ((c.y - ogy) * dirOf(ct) < 0) {
      if (pl.possChanged && !pl.crossedOut) { G.poss = ct; setDrive(ct, 20); banner("b.touchback"); return nextSnapOrClock(true); }
      G.score[other(ct)] += 2; banner("b.safety", null, true, "#ff5a3c"); ev("safety"); sfx("whistle");
      return afterScore(ct, true);
    }
  }
  if (pl.possChanged) {
    G.poss = newPoss; G.los = clamp(spotY, 1, 119); G.ballX = clamp(c.x, HASH_L, HASH_R); G.down = 1;
    G.toGo = Math.min(10, Math.round(100 - ydFromOwn(newPoss, G.los)));
    otPossessionOver(startPoss);
    return nextSnapOrClock(true);
  }
  var d = dirOf(G.poss);
  var gain = (spotY - G.los) * d;
  if (kind === "sack") banner("b.sack", null, false, "#ff5a3c");
  else if (kind === "oob") popupYds(gain, true);
  else if (kind === "inc") banner("b.inc");
  else popupYds(gain, false);
  G.lastGain = Math.round(gain);
  if (startPoss === "H") { if (kind === "sack" || kind === "inc") G.passFail = (G.passFail || 0) + 1; else if (pl.off.type === "run" && gain < 2) G.runFail = (G.runFail || 0) + 1; }
  G.los = clamp(spotY, 1, 119);
  if (c && kind !== "inc") G.ballX = clamp(c.x, HASH_L, HASH_R);
  var toGoal = 100 - ydFromOwn(G.poss, G.los);
  if (gain >= G.toGo - 0.05) {
    G.down = 1; G.toGo = Math.min(10, Math.ceil(toGoal)); banner("b.first", null, false, "#7cff6a"); sfx("first"); ev("first_down", { poss: G.poss });
  } else {
    G.down++; G.toGo = Math.max(1, Math.ceil(G.toGo - gain));
    if (G.toGo > toGoal) G.toGo = Math.ceil(toGoal);
    if (G.down > 4) {
      banner("b.downs", null, true, "#ff5a3c"); ev("turnover_downs");
      var was = G.poss; G.poss = other(G.poss); G.down = 1; G.toGo = Math.min(10, Math.ceil(100 - ydFromOwn(G.poss, G.los)));
      otPossessionOver(was);
      return nextSnapOrClock(true);
    }
  }
  nextSnapOrClock(stopClock);
}

function popupYds(gain, oob) {
  var n = Math.round(Math.abs(gain));
  if (oob) banner("b.oob");
  var c = G.play.endSpot || { x: G.ballX, y: G.los };
  popup(c.x, c.y, n === 0 ? "b.nogain" : gain > 0 ? "b.gain" : "b.loss", { n: n });
}
function popup(x, y, key, vars) { G.fx.push({ kind: "pop", x: x, y: y, key: key, vars: vars || {}, t: 0 }); }

function nextSnapOrClock(stopped) {
  if (!stopped && !G.ot) G.clock = Math.max(0, G.clock - 7);
  if (G.clock <= 0 && !G.ot) return endQuarter();
  if (G.ot && checkOTDone()) return;
  beginPlayCall();
}

function startPAT(team) {
  G.los = yFromOwn(team, 97); G.ballX = FW / 2; G.poss = team;
  if (team === "A" || G.bot) { // CPU kicks the extra point
    return startFieldGoal(true);
  }
  setPhase("pat");
}
function userPAT(choice) {
  if (G.phase !== "pat") return; sfx("tap");
  if (choice === "kick") return startFieldGoal(true);
  G.twoPt = true; G.down = 1; G.toGo = 3; G.ballX = FW / 2; beginPlayCall();
}

function startFieldGoal(isPat) {
  var team = G.poss, d = dirOf(team);
  layoutFormation(playById("dive"), defById("run"), true);
  var spotY = G.los - d * 7, dist2 = Math.round(Math.abs(goalY(team) + d * 10 - spotY));
  var k = kicker(team);
  G.kick = { kind: isPat ? "pat" : "fg", team: team, t: 0, spotY: spotY, dist: dist2, range: 30 + k.pwr * 2.6, k: k, meter: 0, stopped: false, result: null,
    win: clamp(0.17 * (0.6 + k.hnd * 0.07) * (1 - Math.max(0, dist2 - 20) / 70), 0.05, 0.25), needle: 0, dirn: 1 };
  var holder = byRole(team, "QB"); if (holder) { holder.x = G.ballX; holder.y = spotY; }
  G.ball = { x: G.ballX, y: spotY, z: 0, state: "spot" };
  setPhase("kick");
  if (team === "A" || G.bot) { var p = clamp(0.99 - Math.max(0, dist2 - 20) * 0.017 + (k.hnd - 6) * 0.02, 0.15, 0.99); if (dist2 > G.kick.range) p *= 0.3;
    G.kick.autoGood = G.rng() < p; G.kick.autoT = 0.9 + G.rng() * 0.5; }
}
function kickTap() { var k = G.kick; if (!k || G.phase !== "kick" || k.stopped || k.team !== "H" || G.bot) return; k.stopped = true; launchKick(); }
function launchKick() {
  var k = G.kick, team = k.team, d = dirOf(team);
  var good;
  if (k.autoGood !== undefined) good = k.autoGood;
  else { var off = Math.abs(k.needle - 0.5); good = off <= k.win && k.dist <= k.range; k.err = (k.needle - 0.5); }
  k.good = good;
  var postY = team === "H" ? 120 : 0, aimX = FW / 2 + (good ? (G.rng() - 0.5) * 2 : (k.err !== undefined ? k.err * 30 : (G.rng() < 0.5 ? -1 : 1) * (4 + G.rng() * 3)));
  var short = !good && k.dist > k.range;
  G.ball = { state: "kick", x0: G.ballX, y0: k.spotY, x1: aimX, y1: short ? k.spotY + d * k.range * 0.95 : postY + d * 3, t: 0, dur: 1.4, h: 7, x: G.ballX, y: k.spotY, z: 0 };
  k.flying = true; sfx("kick"); ev(k.kind === "pat" ? "pat_kick" : "fg_kick");
}
function updateKick(dt) {
  var k = G.kick; k.t += dt;
  if (!k.flying) {
    if (k.autoT !== undefined) { if (k.t > k.autoT) launchKick(); return; }
    k.needle += k.dirn * dt * (0.9 + k.dist / 45); if (k.needle > 1) { k.needle = 1; k.dirn = -1; } if (k.needle < 0) { k.needle = 0; k.dirn = 1; }
    return;
  }
  var b = G.ball; b.t += dt; var u = Math.min(1, b.t / b.dur);
  b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u; b.z = 4 * b.h * u * (1 - u) + u * (k.good ? 4 : 1.5);
  if (u >= 1 && !k.result) {
    k.result = k.good ? "good" : "no"; k.endT = 0;
    if (k.good) { G.score[k.team] += k.kind === "pat" ? 1 : 3; banner("b.fggood", null, true, "#7cff6a"); sfx("horn"); ev("score", { team: k.team, pts: k.kind === "pat" ? 1 : 3 }); }
    else { banner("b.fgno", null, false, "#ff5a3c"); sfx("inc"); }
  }
  if (k.result) { k.endT += dt; if (k.endT > 1.4) {
    if (k.kind === "pat") return afterScore(k.team);
    if (k.good) return afterScore(k.team);
    // missed FG: other team takes over at the spot of the kick (or their 20)
    var opp = other(k.team), yd = Math.max(20, ydFromOwn(opp, k.spotY));
    otPossessionOver(k.team); G.poss = opp; setDrive(opp, yd); G.clock = Math.max(0, G.clock - (G.ot ? 0 : 5));
    if (G.clock <= 0 && !G.ot) return endQuarter();
    if (G.ot && checkOTDone()) return;
    return beginPlayCall();
  } }
}

function afterScore(scoringTeam, safety) {
  G.clock = Math.max(0, G.clock - (G.ot ? 0 : 4));
  if (G.ot) { otPossessionOver(G.otCur || scoringTeam); if (!checkOTDone()) beginPlayCall(); return; }
  if (G.clock <= 0) { G.pendingKickoff = { kicker: safety ? scoringTeam : scoringTeam }; return endQuarter(true); }
  // scoring team kicks off (after a safety the team that gave it up kicks)
  startKickoff(safety ? scoringTeam : scoringTeam);
}

function startPunt() {
  var team = G.poss, d = dirOf(team), k = kicker(team);
  layoutFormation(playById("dive"), defById("run"), true);
  var from = G.los - d * 12, dist2 = 34 + k.pwr * 1.4 + (G.rng() - 0.5) * 12;
  var land = from + d * dist2;
  G.kick = { kind: "punt", team: team, t: 0 };
  G.ball = { state: "kick", x0: G.ballX, y0: from, x1: clamp(G.ballX + (G.rng() - 0.5) * 16, 4, FW - 4), y1: land, t: 0, dur: 2.0, h: 14, x: G.ballX, y: from, z: 0 };
  setPhase("punt"); banner("b.punt"); sfx("kick"); ev("punt");
}
function updatePunt(dt) {
  var b = G.ball, k = G.kick; b.t += dt; var u = Math.min(1, b.t / b.dur);
  b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u; b.z = 4 * b.h * u * (1 - u);
  if (u >= 1) { k.t += dt; if (k.t > 0.6 + b.dur) {
    var recv = other(k.team), yd = ydFromOwn(recv, b.y1);
    if (yd <= 0) { yd = 20; banner("b.touchback"); }
    otPossessionOver(k.team);
    G.poss = recv; setDrive(recv, clamp(Math.round(yd), 1, 99)); G.ballX = clamp(b.x1, HASH_L, HASH_R);
    G.clock = Math.max(0, G.clock - 6);
    if (G.clock <= 0) return endQuarter();
    beginPlayCall();
  } }
}

function updateKickoff(dt) {
  var b = G.ball; b.t += dt; var u = Math.min(1, b.t / b.dur);
  b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u; b.z = 4 * b.h * u * (1 - u);
  // coverage team runs downfield
  var kt = G.kick.team, d = dirOf(kt);
  G.players.forEach(function (p) { if (!p.onField) return; if (p.tm === kt) { p.vy = damp(p.vy, d * 6.5, 4, dt); p.vx = damp(p.vx, 0, 4, dt); integ(p, dt); }
    else { var tx = p.x, ty = p.y; if (u > 0.6) { tx = b.x1 + (p.x - b.x1) * 0.98; } p.vx = damp(p.vx, 0, 6, dt); p.vy = damp(p.vy, 0, 6, dt); integ(p, dt); } });
  if (u >= 1) { G.kick.t += dt; if (G.kick.t > 0.5 + b.dur) {
    var recv = other(kt); banner("b.touchback"); G.firstLayout = true;
    setDrive(recv, 25); beginPlayCall(); G.firstLayout = false;
  } }
}

// ---------- QUARTERS / OT ----------
function endQuarter(pendingKick) {
  var q = G.quarter;
  if (q === 2 && P("stageCount") >= 2) {
    G.quarter = 3; G.half = 2; G.clock = G.qlen; setPhase("halftime"); G.halfT = 0;
    banner("b.half", null, true, "#ffd23f"); sfx("horn"); ev("stage_complete", { stage: 1 }); return;
  }
  if (q >= 4 || (P("stageCount") < 2 && q >= 2)) {
    if (G.score.H === G.score.A) return startOT();
    return finalWhistle();
  }
  banner("b.endq", { q: T("q" + q) }, true); sfx("whistle"); ev("quarter_end", { q: q });
  G.quarter++; G.clock = G.qlen;
  if (pendingKick) return startKickoff(G.pendingKickoff.kicker);
  beginPlayCall();
}
function updateHalftime(dt) {
  G.halfT += dt;
  if (G.halfT > 3.2 && !G.half2Shown) { G.half2Shown = true; banner("b.half2", null, true, "#ff6b1a"); }
  if (G.halfT > 6.2) { startKickoff("H"); }
}
function startOT() {
  G.ot = 1; G.otLeft = 2; G.otRoundStart = { H: G.score.H, A: G.score.A };
  banner("b.ot", null, true, "#ffd23f"); sfx("horn"); ev("overtime");
  G.poss = "H"; setDrive("H", 75); G.otCur = "H"; G.quarter = 5;
  beginPlayCall();
}
function otPossessionOver(team) {
  if (!G.ot) return;
  if (G.otCur !== team) return;
  G.otLeft--; G.otCur = null;
  if (G.otLeft === 1) { G.otPending = "A"; }
}
function checkOTDone() {
  if (!G.ot) return false;
  if (G.otLeft <= 0) {
    if (G.score.H !== G.score.A || G.ot >= 3) { finalWhistle(); return true; }
    G.ot++; G.otLeft = 2; G.poss = "H"; setDrive("H", 75); G.otCur = "H"; banner("b.ot", null, true, "#ffd23f"); beginPlayCall(); return true;
  }
  if (G.otPending) { var tm = G.otPending; G.otPending = null; G.poss = tm; setDrive(tm, 75); G.otCur = tm; beginPlayCall(); return true; }
  return false;
}

function finalWhistle() {
  G.ended = true; setPhase("final"); G.finalT = 0;
  G.outcome = G.score.H > G.score.A ? "win" : G.score.H < G.score.A ? "lose" : "tie";
  G.won = G.outcome === "win";
  banner("b.final", null, true, "#ffffff"); sfx("horn");
  if (G.won) G.players.forEach(function (p) { if (p.tm === "H") p.cheer = 1; });
  ev(G.won ? "win" : G.outcome === "lose" ? "lose" : "tie");
}

// ---------- MAIN SIM STEP ----------
function simStep(dt, inp) {
  if (!G) return;
  G.t += dt; G.phaseT += dt;
  // fx
  for (var i = G.fx.length - 1; i >= 0; i--) { G.fx[i].t += dt; if (G.fx[i].t > 1.4) G.fx.splice(i, 1); }
  switch (G.phase) {
    case "kickoff": updateKickoff(dt); break;
    case "playcall": idleDrift(dt); if (G.bot && G.phaseT > 0.4 && !G.call.launched) botPlayCall();
      if (G.poss === "A" && G.call && G.call.special && !G.call.launched && G.phaseT > 1.0) { G.call.launched = true; launchCall(); } break;
    case "presnap": presnapMove(dt); if (G.phaseT > 2.2 || (G.phaseT > 0.7 && presnapSet())) snap(); break;
    case "live": updateLive(dt, inp); break;
    case "dead": idleDead(dt); G.deadT += dt; if (G.deadT > 1.5) afterDead(); break;
    case "pat": idleDrift(dt); if (G.bot) userPAT("kick"); break;
    case "kick": updateKick(dt); break;
    case "punt": updatePunt(dt); break;
    case "halftime": updateHalftime(dt); break;
    case "final": G.finalT += dt; idleDead(dt); break;
  }
  // danger
  var deficit = (G.score.A - G.score.H) / 14; var dg = clamp(deficit, 0, 1) + (G.poss === "H" && G.down >= 3 ? 0.3 : 0);
  G.danger = clamp(dg, 0, 1); G.maxDanger = Math.max(G.maxDanger, G.danger);
  G.maxDangerByStage[G.half] = Math.max(G.maxDangerByStage[G.half] || 0, G.danger);
}
function presnapSet() { for (var i = 0; i < G.players.length; i++) { var p = G.players[i]; if (p.onField && (Math.abs(p.x - p.gx) > 0.6 || Math.abs(p.y - p.gy) > 0.6)) return false; } return true; }
function presnapMove(dt) {
  G.players.forEach(function (p) { if (!p.onField) return; steerTo(p, p.gx, p.gy, 9, dt, 10); integ(p, dt);
    var d = dirOf(G.poss); p.face = p.tm === G.poss ? (d > 0 ? "up" : "down") : (d > 0 ? "down" : "up"); });
}
function idleDrift(dt) {
  G.players.forEach(function (p) { if (!p.onField) return; steerTo(p, p.gx, p.gy, 5, dt, 6); integ(p, dt);
    if (len(p.vx, p.vy) < 0.6) { var d = dirOf(G.poss); p.face = p.tm === G.poss ? (d > 0 ? "up" : "down") : (d > 0 ? "down" : "up"); } });
}
function idleDead(dt) {
  G.players.forEach(function (p) { if (!p.onField) return; if (p.downT > 0) p.downT = Math.max(0.05, p.downT - dt * 0.4);
    p.vx = damp(p.vx, 0, 3, dt); p.vy = damp(p.vy, 0, 3, dt); integ(p, dt); if (p.cheer) p.cheer += dt; });
  if (G.ball.state === "loose") { G.ball.t += dt; G.ball.z = Math.max(0, G.ball.z - dt * 5); }
}

function botPlayCall() {
  if (!G.call || G.call.launched) return;
  if (G.phase !== "playcall") return;
  G.call.launched = true;
  if (G.poss === "H") {
    // the bot drives the home team with the CPU playbook logic mirrored
    var saveA = G.poss; var c = cpuOffenseCallFor("H");
    if (c.special) { G.call.special = c.special; }
    else { G.call.off = c.play; G.call.flip = c.flip; }
  } else G.call.def = ["run", "cover2", "blitz", "prevent"][Math.floor(G.rng() * 3)];
  launchCall();
}
function cpuOffenseCallFor(tm) {
  var r = G.rng, dist2 = 100 - ydFromOwn(tm, G.los), k = kicker(tm), range = 30 + k.pwr * 2.6;
  if (G.twoPt) return { play: "slants", flip: r() < 0.5 };
  if (G.down === 4) {
    if (dist2 + 17 <= range - 4) return { special: "fg" };
    if (!(G.ot || G.toGo <= 1)) return { special: "punt" };
  }
  var passW = G.toGo >= 8 ? 0.7 : G.toGo <= 2 ? 0.25 : 0.5, play;
  if (r() < passW) { var x = r(); play = x < 0.35 ? "slants" : x < 0.65 ? "curl" : x < 0.85 ? "deep" : "screen"; }
  else play = r() < 0.5 ? "dive" : "sweep";
  return { play: play, flip: r() < 0.5 };
}
