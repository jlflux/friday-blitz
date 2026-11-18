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
  gun:    { QB: [0, 5], RB: [2, 5.2], WR1: [-16, 0.7], WR2: [15, 0.7], WR3: [-9, 1.3], TE: [5.6, 1.2] },
  trips:  { QB: [0, 5], RB: [-2, 5.2], WR1: [-16, 0.7], WR2: [17, 0.7], WR3: [12, 1.4], TE: [6, 1.2] },
  bunch:  { QB: [0, 5], RB: [-2, 5.2], WR1: [-16, 0.7], WR2: [9, 0.7], WR3: [11, 1.8], TE: [9.8, 3.0] },
  empty:  { QB: [0, 5], RB: [11, 1.3], WR1: [-16, 0.7], WR2: [16, 0.7], WR3: [-10, 1.3], TE: [7.5, 1.2] },
  single: { QB: [0, 1.7], RB: [0, 6.6], WR1: [-16, 0.7], WR2: [15, 0.7], WR3: [-9, 1.3], TE: [5.6, 1.2] },
  ace:    { QB: [0, 1.7], RB: [0, 6.6], WR1: [-15, 0.7], WR2: [15, 0.7], WR3: [-5.6, 1.2], TE: [5.6, 1.2] },
  iform:  { QB: [0, 1.7], RB: [0, 7], WR1: [-16, 0.7], WR2: [15, 0.7], WR3: [0, 4.4], TE: [5.6, 1.2] },
  pistol: { QB: [0, 3.6], RB: [0, 6.8], WR1: [-16, 0.7], WR2: [15, 0.7], WR3: [-9, 1.3], TE: [5.6, 1.2] },
  goal:   { QB: [0, 1.7], RB: [0, 6], WR1: [-5.6, 1.2], WR2: [9, 0.7], WR3: [0, 4], TE: [5.6, 1.2] }
};
var OL_X = { LT: [-4, 1.2], LG: [-2, 1], C: [0, 0.9], RG: [2, 1], RT: [4, 1.2] };
var FORM_ORDER = ["gun", "trips", "bunch", "empty", "single", "ace", "iform", "pistol", "goal"];
var FORM_NAMES = { gun: "SHOTGUN", trips: "TRIPS", bunch: "BUNCH", empty: "EMPTY", single: "SINGLEBACK", ace: "ACE", iform: "I-FORM", pistol: "PISTOL", goal: "GOAL LINE" };
var ROUTES = {
  go: [[0, 45]], slant: [[0, 2.5], [8, 11], [15, 18]], out: [[0, 6], [-7, 6.3], [-14, 6.6]], curl: [[0, 11], [1.2, 9.4]],
  flat: [[0, 1.5], [-7, 3.5], [-13, 4.5]], drag: [[0, 3], [13, 5], [26, 6]], post: [[0, 11], [8, 26], [13, 40]],
  seam: [[0, 35]], swing: [[-3.5, -0.8], [-8, 1], [-11, 5]], check: [[1.5, 3]], screen: [[-4.5, -1.6], [-7.5, -1.2]],
  wheel: [[-5, 0], [-9, 4], [-10, 25]], dig: [[0, 10], [8, 10.5], [18, 11]], corner: [[0, 10], [-7, 19], [-11, 26]],
  fade: [[-1, 3], [-3, 26]], bubble: [[-3, -1], [-6, 0]], qout: [[0, 4], [-6, 4.5], [-11, 4.8]], hitch: [[0, 6], [0.5, 5]],
  cross: [[0, 7], [12, 14], [24, 17]], mesh: [[0, 2], [12, 4], [26, 5]], sit: [[0, 7], [0.5, 6]]
};
var STOP_ROUTES = { curl: 1, check: 1, screen: 1, hitch: 1, sit: 1 };
var HOT_ROUTES = ["go", "slant", "out", "dig", "curl", "flat", "corner", "block"];
function RUN(carrier, aim, hand, extra) { var r = { carrier: carrier, aim: aim, hand: hand }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
var PLAYS = [
  { id: "slants", name: "SLANTS", form: "gun", type: "pass", cat: "short", routes: { WR1: "slant", WR2: "slant", WR3: "out", TE: "flat", RB: "swing" } },
  { id: "curl", name: "CURL FLAT", form: "gun", type: "pass", cat: "short", routes: { WR1: "curl", WR2: "curl", WR3: "flat", TE: "drag", RB: "check" } },
  { id: "deep", name: "DEEP POST", form: "gun", type: "pass", cat: "deep", routes: { WR1: "go", WR2: "post", WR3: "curl", TE: "seam", RB: "block" } },
  { id: "screen", name: "HB SCREEN", form: "gun", type: "pass", cat: "screen", routes: { WR1: "go", WR2: "go", WR3: "go", TE: "block", RB: "screen" } },
  { id: "izone", name: "INSIDE ZONE", form: "gun", type: "run", cat: "run", run: RUN("RB", 1.5, 0.45), routes: { WR1: "go", WR2: "go", WR3: "hitch" } },
  { id: "draw", name: "HB DRAW", form: "gun", type: "run", cat: "run", run: RUN("RB", 0, 1.0, { draw: true }), routes: { WR1: "go", WR2: "go", WR3: "go" } },
  { id: "flood", name: "TRIPS FLOOD", form: "trips", type: "pass", cat: "mid", routes: { WR1: "slant", WR2: "go", WR3: "corner", TE: "flat", RB: "check" } },
  { id: "smash", name: "SMASH", form: "trips", type: "pass", cat: "mid", routes: { WR1: "dig", WR2: "hitch", WR3: "corner", TE: "sit", RB: "swing" } },
  { id: "bubble", name: "BUBBLE SCREEN", form: "trips", type: "pass", cat: "screen", routes: { WR1: "go", WR2: "block", WR3: "bubble", TE: "block", RB: "block" } },
  { id: "tzone", name: "TRIPS ZONE", form: "trips", type: "run", cat: "run", run: RUN("RB", -2.5, 0.45), routes: { WR1: "go", WR2: "go", WR3: "hitch" } },
  { id: "mesh", name: "MESH", form: "bunch", type: "pass", cat: "short", routes: { WR1: "dig", WR2: "mesh", WR3: "corner", TE: "drag", RB: "check" } },
  { id: "bcorner", name: "BUNCH CORNER", form: "bunch", type: "pass", cat: "mid", routes: { WR1: "go", WR2: "flat", WR3: "corner", TE: "curl", RB: "check" } },
  { id: "bdive", name: "BUNCH DIVE", form: "bunch", type: "run", cat: "run", run: RUN("RB", 1.5, 0.45), routes: { WR1: "go", WR2: "hitch" } },
  { id: "verts", name: "FOUR VERTS", form: "empty", type: "pass", cat: "deep", routes: { WR1: "go", WR2: "go", WR3: "seam", TE: "seam", RB: "out" } },
  { id: "qouts", name: "QUICK OUTS", form: "empty", type: "pass", cat: "short", routes: { WR1: "qout", WR2: "qout", WR3: "hitch", TE: "hitch", RB: "qout" } },
  { id: "qbdraw", name: "QB DRAW", form: "empty", type: "run", cat: "run", run: RUN("QB", 0.5, 0.9, { draw: true }), routes: { WR1: "go", WR2: "go", WR3: "go", TE: "go", RB: "go" } },
  { id: "dive", name: "HB DIVE", form: "single", type: "run", cat: "run", run: RUN("RB", 1.4, 0.4), routes: { WR1: "go", WR2: "go", WR3: "hitch" } },
  { id: "counter", name: "COUNTER", form: "single", type: "run", cat: "run", run: RUN("RB", 3.5, 0.55, { counter: true }), routes: { WR1: "go", WR2: "go" } },
  { id: "padeep", name: "PA DEEP", form: "single", type: "pass", cat: "deep", pa: true, run: RUN("RB", 1.4, 0.6), routes: { WR1: "go", WR2: "post", WR3: "dig", TE: "seam", RB: "check" } },
  { id: "ycross", name: "Y-CROSS", form: "single", type: "pass", cat: "mid", routes: { WR1: "go", WR2: "curl", WR3: "dig", TE: "cross", RB: "check" } },
  { id: "power", name: "POWER", form: "ace", type: "run", cat: "run", run: RUN("RB", 2.5, 0.45), routes: { WR1: "go", WR2: "go" } },
  { id: "stretch", name: "STRETCH", form: "ace", type: "run", cat: "run", run: RUN("RB", 10, 0.3), routes: { WR1: "go", WR2: "go" } },
  { id: "paseam", name: "PA TE SEAM", form: "ace", type: "pass", cat: "deep", pa: true, run: RUN("RB", 1.5, 0.6), routes: { WR1: "go", WR2: "dig", WR3: "flat", TE: "seam", RB: "check" } },
  { id: "idive", name: "HB DIVE", form: "iform", type: "run", cat: "run", run: RUN("RB", 1.4, 0.4), routes: { WR1: "go", WR2: "go", WR3: "lead" } },
  { id: "sweep", name: "TOSS SWEEP", form: "iform", type: "run", cat: "run", run: RUN("RB", 11, 0.25), routes: { WR1: "go", WR3: "lead" } },
  { id: "powero", name: "POWER O", form: "iform", type: "run", cat: "run", run: RUN("RB", 2.5, 0.45), routes: { WR1: "go", WR2: "go", WR3: "lead" } },
  { id: "papost", name: "PA POST", form: "iform", type: "pass", cat: "deep", pa: true, run: RUN("RB", 1.4, 0.6), routes: { WR1: "go", WR2: "post", WR3: "flat", TE: "dig", RB: "check" } },
  { id: "readopt", name: "READ OPTION", form: "pistol", type: "run", cat: "run", run: RUN("RB", -2.5, 0.55, { option: true }), routes: { WR1: "go", WR2: "go", WR3: "hitch" } },
  { id: "pcounter", name: "COUNTER", form: "pistol", type: "run", cat: "run", run: RUN("RB", 3.5, 0.55, { counter: true }), routes: { WR1: "go", WR2: "go" } },
  { id: "pycross", name: "Y-CROSS", form: "pistol", type: "pass", cat: "mid", routes: { WR1: "go", WR2: "curl", WR3: "dig", TE: "cross", RB: "check" } },
  { id: "qbpower", name: "QB POWER", form: "pistol", type: "run", cat: "run", run: RUN("QB", 1.8, 0.25), routes: { WR1: "go", WR2: "go", RB: "lead" } },
  { id: "rposlant", name: "RPO SLANT", form: "pistol", type: "run", cat: "run", run: RUN("RB", 1.5, 0.6, { rpo: "WR3" }), routes: { WR1: "go", WR2: "go", WR3: "slant" } },
  { id: "qbcounter", name: "QB COUNTER", form: "pistol", type: "run", cat: "run", run: RUN("QB", 3, 0.3, { counter: true }), routes: { WR1: "go", WR2: "go", RB: "lead" } },
  { id: "sneak", name: "QB SNEAK", form: "goal", type: "run", cat: "short_yd", run: RUN("QB", 0.3, 0.08), routes: { RB: "lead", WR3: "lead" } },
  { id: "gdive", name: "HB DIVE", form: "goal", type: "run", cat: "short_yd", run: RUN("RB", 1, 0.4), routes: { WR3: "lead" } },
  { id: "paflat", name: "PA FLAT", form: "goal", type: "pass", cat: "short", pa: true, run: RUN("RB", 1, 0.6), routes: { WR1: "flat", WR2: "corner", WR3: "flat", TE: "sit", RB: "check" } },
  { id: "fade", name: "FADE", form: "goal", type: "pass", cat: "short", routes: { WR1: "flat", WR2: "fade", WR3: "block", TE: "corner", RB: "block" } }
];
PLAYS.forEach(function (p) { if (p.run) { p.aim = p.run.aim; p.hand = p.run.hand; } else { p.aim = 1; p.hand = 99; } });
var ZONES = { hookL: [-7, 7], mid: [0, 8], hookR: [7, 7], flatL: [-15, 5], flatR: [15, 5], deepL: [-12, 19], deepR: [12, 19], deepmid: [0, 21],
  deepOL: [-17, 24], deepOR: [17, 24], short: [0, 4], d3L: [-16, 20], d3M: [0, 22], d3R: [16, 20], curlL: [-11, 8], curlR: [11, 8], tampa: [0, 15] };
var DEFS = [
  { id: "cover2", name: "COVER 2", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "zone:hookL", LB2: "zone:mid", LB3: "zone:hookR", CB1: "zone:flatL", CB2: "zone:flatR", FS: "zone:deepL", SS: "zone:deepR" } },
  { id: "cover3", name: "COVER 3", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "zone:curlL", LB2: "zone:mid", LB3: "zone:curlR", CB1: "zone:d3L", CB2: "zone:d3R", FS: "zone:d3M", SS: "zone:flatR" } },
  { id: "cover1", name: "COVER 1", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "man:RB", LB2: "zone:mid", LB3: "man:TE", CB1: "man:WR1", CB2: "man:WR2", FS: "zone:deepmid", SS: "man:WR3" } },
  { id: "blitz", name: "COVER 0 BLITZ", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "rush", LB2: "man:RB", LB3: "rush", CB1: "man:WR1", CB2: "man:WR2", FS: "man:TE", SS: "man:WR3" } },
  { id: "tampa", name: "TAMPA 2", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "zone:hookL", LB2: "zone:tampa", LB3: "zone:hookR", CB1: "zone:flatL", CB2: "zone:flatR", FS: "zone:deepL", SS: "zone:deepR" } },
  { id: "fire", name: "FIRE ZONE", a: { DE1: "zone:flatL", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "rush", LB2: "zone:mid", LB3: "rush", CB1: "zone:d3L", CB2: "zone:d3R", FS: "zone:d3M", SS: "zone:flatR" } },
  { id: "press", name: "MAN PRESS", press: true, a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "man:RB", LB2: "zone:mid", LB3: "man:TE", CB1: "man:WR1", CB2: "man:WR2", FS: "zone:deepmid", SS: "man:WR3" } },
  { id: "prevent", name: "PREVENT", a: { DE1: "rush", DT1: "rush", DT2: "zone:short", DE2: "rush", LB1: "zone:hookL", LB2: "zone:mid", LB3: "zone:hookR", CB1: "zone:deepOL", CB2: "zone:deepOR", FS: "zone:deepmid", SS: "zone:deepR" } },
  { id: "run", name: "RUN STOP", a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "read", LB2: "read", LB3: "read", CB1: "man:WR1", CB2: "man:WR2", FS: "zone:deepmid", SS: "read" } },
  { id: "bear", name: "STACK THE BOX", box: true, a: { DE1: "rush", DT1: "rush", DT2: "rush", DE2: "rush", LB1: "rush", LB2: "read", LB3: "read", CB1: "man:WR1", CB2: "man:WR2", FS: "read", SS: "read" } }
];
var DEF_AUDIBLES = ["blitz", "prevent", "press", "bear"];
function playById(id) { for (var i = 0; i < PLAYS.length; i++) if (PLAYS[i].id === id) return PLAYS[i]; return PLAYS[0]; }
function defById(id) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].id === id) return DEFS[i]; return DEFS[1]; }

// ---------- GAME STATE ----------
var G = null;
function P(id) { return PARAMS[id]; }

function newGame(home, away, opts) {
  opts = opts || {};
  var seed = opts.seed >>> 0;
  G = { tos: { H: 3, A: 3 }, pclock: 40, noHuddle: false, hot: {}, attract: !!opts.attract, franchise: !!opts.franchise, userAway: !!opts.userAway, mods: opts.mods || { off: 0, def: 0 }, homeAdv: opts.homeAdv || 0,
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

function isAwayTm(tm) { return G && G.userAway ? tm === "H" : tm === "A"; }
function teamOf(tm) { return tm === "H" ? G.home : G.away; }
function rosterUnit(team, unit) { return team.roster.filter(function (p) { return p.unit === unit; }); }

function buildFieldPlayers() {
  G.players = [];
  ["H", "A"].forEach(function (tm) {
    var team = teamOf(tm), pal = teamColors(team, isAwayTm(tm));
    team.roster.forEach(function (r, i) {
      if (r.unit === "K") return;
      var fp = { tm: tm, r: r, ridx: i, unit: r.unit, role: r.unit === "O" ? ROLE_O[i] : ROLE_D[i - 11], x: FW / 2, y: 60, vx: 0, vy: 0,
        face: "down", hx: 0, hy: 1, anim: 0, state: "stand", stun: 0, eng: null, engT: 0, shedCd: 0, tackleCd: 0, assign: null, route: null, ri: 0,
        diveT: 0, downT: 0, jukeT: 0, jukeCd: 0, slowT: 0, target: null, onField: false, react: 0, gx: 0, gy: 0, cheer: 0 };
      fp.spr = buildPlayerSprites(pal, SKINS[r.skin || 0], r.num);
      G.players.push(fp);
    });
  });
}
function rebuildSprites() {
  if (!G) return;
  G.players.forEach(function (fp) { var team = teamOf(fp.tm); fp.spr = buildPlayerSprites(teamColors(team, isAwayTm(fp.tm)), SKINS[fp.r.skin || 0], fp.r.num); });
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
  if (G.sprint && G.ctl === fp && !G.bot) s *= 1.12;
  if (fp.jam > 0 && G.play && G.play.t < fp.jam) s *= 0.3;
  if (G.ctl === fp && !G.bot && fp.tm !== (G.play && G.play.carrier ? G.play.carrier.tm : G.poss)) s *= 1.05;
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
  ks.forEach(function (p, i) { p.onField = true; p.x = 3 + i * (FW - 6) / 10; p.y = ky - rd * 1; p.hx = 0; p.hy = rd; });
  rs.forEach(function (p, i) { p.onField = true; p.x = 4 + i * (FW - 8) / 10; p.y = yFromOwn(recv, i === 1 ? 2 : 40 - (i % 3) * 8); p.hx = 0; p.hy = -rd; });
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
  G.call = { off: null, def: null, flip: false, special: null }; G.hot = {}; G.wantSnap = false;
  if (G.pclock === undefined || !G.keepClock) G.pclock = 40; G.keepClock = false;
  layoutFormation(null, null, false);
  if (!G.noHuddle) layoutHuddle();
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

function cpuOffenseCall() { return cpuOffenseCallFor("A"); }
function pickPlay(cat) { var list = PLAYS.filter(function (p) { return p.cat === cat; }); return list[Math.floor(G.rng() * list.length)].id; }
function situationPlay(tm) {
  var r = G.rng(), toGoal = 100 - ydFromOwn(tm, G.los);
  if (G.toGo <= 1 && toGoal <= 3) return r < 0.5 ? "sneak" : "gdive";
  if (G.toGo <= 2) return r < 0.7 ? pickPlay("run") : pickPlay("short");
  var passW = G.toGo >= 8 ? 0.72 : 0.48; if (G.score[tm] < G.score[other(tm)] && G.quarter >= 4) passW += 0.2;
  if (r < passW) { var x = G.rng(); return pickPlay(G.toGo >= 12 ? (x < 0.5 ? "deep" : "mid") : x < 0.45 ? "short" : x < 0.75 ? "mid" : x < 0.9 ? "deep" : "screen"); }
  return pickPlay("run");
}
function coachPick() { var saveR = G.rng; G.rng = mulberry32((G.drives * 131 + G.down * 17 + Math.round(G.los)) >>> 0); var id = situationPlay("H"); G.rng = saveR; return id; }
function cpuDefenseCall() {
  var r = G.rng(), w;
  if (G.toGo <= 2) w = { run: 0.3, bear: 0.3, cover1: 0.15, blitz: 0.15, cover3: 0.1 };
  else if (G.down >= 3 && G.toGo >= 7) w = { cover2: 0.18, cover3: 0.18, tampa: 0.14, fire: 0.14, blitz: 0.14, press: 0.1, prevent: 0.12 };
  else w = { cover2: 0.2, cover3: 0.2, cover1: 0.15, run: 0.12, fire: 0.1, tampa: 0.1, press: 0.08, blitz: 0.05 };
  if (G.half === 2) { w.blitz = (w.blitz || 0) * P("stageScale") * 2; w.fire = (w.fire || 0) * P("stageScale") * 1.5; }
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
    var p = byRole(off, role), f = form[role] || OL_X[role]; var x = bx + f[0] * flip;
    x = clamp(x, 2, FW - 2);
    pos[role] = [x, G.los - d * f[1]];
    p.gx = pos[role][0]; p.gy = pos[role][1];
  });
  var wr1 = pos.WR1[0], wr2 = pos.WR2[0], wr3 = pos.WR3[0];
  var dp = { DE1: [bx - 5 * flip, 1.2], DT1: [bx - 1.6 * flip, 1.2], DT2: [bx + 1.6 * flip, 1.2], DE2: [bx + 5 * flip, 1.2],
    LB1: [(bx - 5.5 * flip) * 0.5 + wr3 * 0.5, 5], LB2: [bx, 5.2], LB3: [bx + 6 * flip, 5], CB1: [wr1, 6.5], CB2: [wr2, 6.5], FS: [bx - 6, 13], SS: [bx + 6, 11] };
  if (defDef && defDef.box) { dp.LB1[1] = 3.2; dp.LB2[1] = 3.6; dp.LB3[1] = 3.2; dp.SS = [bx + 3 * flip, 4.5]; dp.FS = [bx - 3 * flip, 7]; }
  if (defDef && defDef.press) { dp.CB1[1] = 1.6; dp.CB2[1] = 1.6; }
  ROLE_D.forEach(function (role) { var p = byRole(def, role); p.gx = clamp(dp[role][0], 1.5, FW - 1.5); p.gy = G.los + d * dp[role][1]; });
  G.players.forEach(function (p) { if (!p.onField) return; p.hx = 0; p.hy = p.tm === off ? d : -d;
    if (snapTo) { p.x = p.gx; p.y = p.gy; } });
  if (!snapTo) {
    // first time (or after kickoff): place immediately if far away
    G.players.forEach(function (p) { if (!p.onField) return; if (Math.abs(p.x - p.gx) > 30 || Math.abs(p.y - p.gy) > 30 || G.firstLayout) { p.x = p.gx; p.y = p.gy; } });
  }
  G.ball = { x: bx, y: G.los, z: 0, state: "spot" };
}

function layoutHuddle() {
  var off = G.poss, d = dirOf(off), bx = clamp(G.ballX, 8, FW - 8);
  [[off, G.los - d * 8.5, 2.3], [other(off), G.los + d * 7.5, 2.6]].forEach(function (h) {
    var list = G.players.filter(function (p) { return p.onField && p.tm === h[0]; });
    list.forEach(function (p, i) { var a = (i / list.length) * Math.PI * 2 + (h[0] === off ? 0.3 : 0); p.gx = bx + Math.cos(a) * h[2]; p.gy = h[1] + Math.sin(a) * h[2] * 0.8; p.hc = { x: bx, y: h[1] };
      if (G.firstLayout) { p.x = p.gx; p.y = p.gy; } });
  });
}
function startPresnap() {
  var pd = playById(G.call.off), dd = defById(G.call.def);
  layoutFormation(pd, dd, false);
  G.play = { off: pd, def: dd, t: 0, carrier: null, qb: byRole(G.poss, "QB"), thrown: false, handed: false, result: null,
    startLos: G.los, startPoss: G.poss, possChanged: false, sackable: pd.type === "pass", scramble: false, crossed: false, intended: null, deadT: 0 };
  G.picked = false; G.wantSnap = false; G.players.forEach(function (p) { p.hc = null; });
  // user defender default
  if (G.poss === "A") {
    var role = dd.id === "prevent" ? "FS" : "LB2";
    G.userDef = byRole("H", role); G.ctl = G.userDef;
  } else if (!G.bot) G.ctl = G.play.qb;
  setPhase("lineup");
}

function snap() {
  var pl = G.play, off = G.poss, def = other(off), d = dirOf(off), flip = G.call.flip ? -1 : 1;
  pl.t = 0; G.players.forEach(function (p) { if (p.onField) { p.x = p.gx; p.y = p.gy; } });
  // offense assignments
  ROLE_O.forEach(function (role) {
    var p = byRole(off, role); var rt = (G.hot && G.hot[role] !== undefined) ? G.hot[role] : pl.off.routes[role];
    if (role === "QB") { p.assign = pl.off.type === "pass" ? "drop" : "hand"; return; }
    if (role === "RB") { if (pl.off.type === "run" && pl.off.run.carrier === "RB") { p.assign = "carry"; return; } if (pl.off.pa) { p.assign = "pafake"; p.routeAfter = rt; return; } }
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
    p.assign = a; p.react = 0.08 + G.rng() * 0.2 / (def === "A" ? P("coverage") : 1);
    if (pl.def.press && a.indexOf("man:") === 0) { var wr = byRole(off, a.slice(4)); if (wr && (wr.role === "WR1" || wr.role === "WR2" || wr.role === "WR3")) wr.jam = clamp(0.35 + (p.r.pwr - wr.r.pwr) * 0.05, 0.1, 0.6); }
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
  pl.carrier = null; pl.holder = pl.qb; G.wantSnap = false;
  if (G.poss === "H") G.ctl = pl.qb;
  else G.ctl = G.userDef || byRole("H", "LB2");
  setPhase("live"); sfx("snap"); ev("snap", { play: pl.off.id, def: pl.def.id, poss: G.poss });
}

// ---------- LIVE PLAY ----------
function isUserCtl(p) { return p && p === G.ctl && !G.bot; }

function updateLive(dt, inp) {
  var pl = G.play; pl.t += dt; G.sprint = !!(inp && inp.sprint);
  if (!G.ot && !G.clockStopped) { G.clock = Math.max(0, G.clock - dt); }
  var off = pl.carrier ? pl.carrier.tm : G.poss, d = dirOf(G.poss);
  // user control switching
  if (inp && inp.sw && G.poss === "A" && !G.bot) switchDefender();
  // QB logic
  var qb = pl.qb;
  if (!pl.handed && !pl.thrown && !pl.carrier) {
    if (pl.off.type === "run") {
      var run = pl.off.run, rb = byRole(G.poss, "RB"), userQB0 = G.poss === "H" && !G.bot;
      if (run.rpo && !pl.rpoDone) { var tgt = byRole(G.poss, run.rpo);
        if (userQB0 && inp && inp.throwTo && pl.t < run.hand + 0.1) { var tr0 = byRole("H", inp.throwTo); if (tr0 && tr0.assign === "route") { pl.rpoDone = true; pl.off = Object.assign({}, pl.off, { type: "pass" }); throwTo(tr0); } }
        else if (!userQB0 && pl.t >= run.hand - 0.05) { pl.rpoDone = true; if (tgt && openness(tgt, other(G.poss)) > 2.4) { pl.off = Object.assign({}, pl.off, { type: "pass" }); throwTo(tgt); } } }
      if (!pl.thrown && !pl.handed && pl.t >= run.hand) {
        if (run.carrier === "QB") { pl.handed = true; pl.carrier = qb; pl.qbKeep = true; if (G.poss === "H") G.ctl = qb; ev("qb_run"); }
        else if (run.option) { var flipO = G.call.flip ? -1 : 1, readSide = -Math.sign(run.aim * flipO) || 1;
          var de = G.players.filter(function (x) { return x.onField && x.tm !== G.poss && (x.role === "DE1" || x.role === "DE2"); }).sort(function (a, b) { return (b.x - G.ballX) * readSide - (a.x - G.ballX) * readSide; })[0];
          var keep = (userQB0 && inp && inp.sprint) || (de && !de.eng && dist(de, rb) < 3.6);
          if (keep) { pl.handed = true; pl.carrier = qb; pl.qbKeep = true; pl.optKeep = readSide; if (G.poss === "H") G.ctl = qb; ev("option_keep"); }
          else handoff(rb); }
        else handoff(rb);
      }
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
  if (G.play.off.pa && rb.assign === "pafake") return;
  var pl = G.play; pl.handed = true; pl.carrier = rb; G.ball.holder = rb; G.ball.state = "held";
  if (G.poss === "H") G.ctl = rb; else autoSwitch(rb); ev("handoff"); sfx("tap");
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
  var err = (0.55 + (10 - qb.r.hnd) * 0.1) * (dd / 17) * (pressD < 2.2 ? 1.9 : 1) * (dd > range ? 2.2 : 1) * (qb.tm === "H" ? 1 - G.mods.off * 0.05 : 1);
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
  if (b.state === "held" && b.holder) { var h = b.holder; b.x = h.x + (h.hx || 0) * 0.35 + 0.15; b.y = h.y; b.z = 1.2; return; }
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
  if (dfn && dd < 1.25 && dd < dr + 0.1) {
    var pInt = 0.17 + 0.04 * (dfn.r.hnd - 5) + (isUserCtl(dfn) ? 0.15 : 0); if (dd > dr) pInt *= 0.5;
    if (rnd < pInt) return intercept(dfn);
    ev("breakup"); return incomplete();
  }
  if (dr < 1.55) {
    var cs = r.tm === "H" ? P("catchSkill") : 1;
    var pc = (0.84 + 0.035 * (r.r.hnd - 5)) * (0.8 + 0.2 * cs) + (cs - 1) * 0.12 - (dd < 1.2 ? 0.22 : dd < 1.9 ? 0.1 : 0) - Math.max(0, dr - 0.9) * 0.2;
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
  if (r.tm === "A" && !G.bot) { G.ctl = G.userDef; autoSwitch(r); }
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

function bestDefender(c) {
  var best = null, bt = 1e9;
  G.players.forEach(function (p) { if (!p.onField || p.tm !== "H" || p.downT > 0 || p.diveT > 0) return;
    var t = dist(p, c) / speedOf(p) + (p.eng ? 0.8 : 0) - ((p.y - c.y) * dirOf(c.tm) > 0 ? 0.25 : 0); if (t < bt) { bt = t; best = p; } });
  return best;
}
function autoSwitch(c) { if (G.bot || c.tm !== "A" || !P("autoSwitch")) return; var b = bestDefender(c); if (b && b !== G.ctl) { G.ctl = b; G.userDef = b; } }
function selectDefender(p) { if (!p || p.tm !== "H" || !p.onField || G.bot) return; if (!(G.phase === "presnap" || G.phase === "lineup" || G.phase === "live" || G.phase === "playcall")) return;
  if (G.poss !== "A" && !(G.play && G.play.carrier && G.play.carrier.tm === "A")) return; G.ctl = p; G.userDef = p; G.picked = true; sfx("tap"); ev("select_defender"); }
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
      var lead = Math.min(1.4, dist(p, carrier) / s) * 0.95;
      var tx = carrier.x + carrier.vx * lead, ty = carrier.y + carrier.vy * lead;
      steerTo(p, clamp(tx, -1, FW + 1), ty, s, dt, 10);
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
  if (sp > 0.6) { p.anim += dt * sp * 1.3; p.hx = p.vx / sp; p.hy = p.vy / sp; }
  else p.anim = 0;
}

function juke(p, mx) {
  var side = Math.abs(mx) > 0.2 ? Math.sign(mx) : (G.rng() < 0.5 ? -1 : 1);
  p.vx += side * 6.5; p.jukeT = 0.32; p.jukeCd = 1.1; ev("juke"); sfx("juke");
}
function dive(p, inp, target) {
  var dx, dy, c = target || (G.play && G.play.carrier) || G.ball;
  if (inp && (Math.abs(inp.mx) + Math.abs(inp.my) > 0.05)) { dx = inp.mx; dy = inp.my; }
  else { dx = c.x - p.x; dy = c.y - p.y; }
  if (c && dist(p, c) < 5.5) { var lt = Math.min(0.35, dist(p, c) / 10.5); var ax = c.x + (c.vx || 0) * lt - p.x, ay = c.y + (c.vy || 0) * lt - p.y, al = len(ax, ay) || 1, il = len(dx, dy) || 1;
    dx = dx / il * 0.25 + ax / al * 0.75; dy = dy / il * 0.25 + ay / al * 0.75; }
  var l = len(dx, dy) || 1; p.vx = dx / l * 10.5; p.vy = dy / l * 10.5; p.diveT = 0.3; p.state = "dive"; p.hx = dx / l; p.hy = dy / l;
  p.diving = true; ev("dive"); if (isUserCtl(p)) sfx("juke");
}

function aiRunner(p, dt, s) {
  var pl = G.play, d = dirOf(p.tm), opp = other(p.tm);
  var tx = 0, ty = d * 1.6;
  if (pl.off && pl.off.type === "run" && !pl.possChanged && pl.t < 1.8 && (p.role === "RB" || pl.qbKeep)) {
    var fl2 = G.call.flip ? -1 : 1, aim = pl.off.aim;
    if (pl.optKeep) aim = pl.optKeep * fl2 * 9;
    if (pl.off.run && pl.off.run.counter && pl.t < 0.85) aim = -aim * 0.6;
    var aimX = G.ballX + aim * fl2; tx += clamp(aimX - p.x, -1, 1) * 1.6;
  }
  if (pl.qbRun && p === pl.qb && !pl.crossed) { tx += (p.x < FW / 2 ? 1 : -1) * 0.8; }
  for (var i = 0; i < G.players.length; i++) { var q = G.players[i];
    if (!q.onField || q.tm !== opp || q.downT > 0) continue;
    var dx = p.x - q.x, dy = p.y - q.y, dd = len(dx, dy); if (dd > 7) continue;
    var ahead = (q.y - p.y) * d > -1.5 ? 1 : 0.35; var w = (q.eng ? 0.25 : 1) * ahead / Math.max(0.7, dd * dd) * 1.7;
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
    if (pl.off.type === "run" && pl.off.run.draw && pl.t < pl.off.run.hand) { steerTo(p, p.gx, G.los - d * (pl.off.run.carrier === "QB" ? 6.5 : 4.5), s * 0.6, dt); return; }
    if (pl.off.type === "run") { steerTo(p, p.x - (G.call.flip ? -1 : 1) * 0.5, G.los - d * 2.4, s * 0.6, dt); return; }
    if (pl.off.pa && pl.t < 0.6) { var rb2 = byRole(p.tm, "RB"); steerTo(p, (p.x + rb2.x) / 2, G.los - d * 3, s * 0.6, dt); return; }
    if (pl.qbRun) { aiRunner(p, dt, s); return; }
    var dropY = G.los - d * 7, threat = nearestOpp(p, other(p.tm), true);
    var tx = p.gx, ty = dropY;
    if (pl.t > 1.2 && threat && dist(threat, p) < 3) { tx = p.x + (p.x - threat.x) * 0.8; ty = p.y + (p.y - threat.y) * 0.3; }
    steerTo(p, tx, ty, s * 0.8, dt); return;
  }
  if (p.assign === "carry" && !pl.handed) { // RB before handoff: approach the mesh point
    var flip = G.call.flip ? -1 : 1, ax = pl.off.aim * flip * (pl.off.run && pl.off.run.counter && pl.t < 0.35 ? -0.6 : 0.35);
    steerTo(p, G.ballX + ax, G.los - d * (pl.off.run && pl.off.run.draw ? 4.5 : 3.2), s * 0.8, dt); return; }
  if (p.assign === "pafake") { var fl = G.call.flip ? -1 : 1;
    if (pl.t < 0.7) { steerTo(p, G.ballX + pl.off.aim * fl * 0.4, G.los - d * 2.4, s * 0.75, dt); return; }
    var rta = p.routeAfter; if (rta && ROUTES[rta] && rta !== "check") { p.assign = "route"; p.gx = p.x; p.gy = p.y; p.route = routePts(p, rta, fl, d); p.ri = 0; p.routeStop = !!STOP_ROUTES[rta]; p.delay = 0; }
    else if (rta === "check") { p.assign = "route"; p.gx = p.x; p.gy = p.y; p.route = routePts(p, "check", fl, d); p.ri = 0; p.routeStop = true; p.delay = 0; }
    else p.assign = "block"; return; }
  if (p.assign === "route" || p.assign === "catch") {
    if (p.assign === "catch" && G.ball.state === "air") { // run to the landing spot
      steerTo(p, G.ball.x1, G.ball.y1, s, dt, 10); return; }
    if (p.delay > 0 && pl.t < p.delay) { steerBlockNear(p, dt, s); return; }
    if (p.jam > 0 && pl.t < p.jam) { p.vx = damp(p.vx, 0, 8, dt); p.vy = damp(p.vy, d * s * 0.3, 8, dt); return; }
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
    var hl = len(t.x - b.x, t.y - b.y) || 1; b.hx = (t.x - b.x) / hl; b.hy = (t.y - b.y) / hl; t.hx = -b.hx; t.hy = -b.hy;
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
  if (pl.off.pa && pl.t < 0.75 && !pl.thrown && a !== "rush" && p.role.indexOf("CB") < 0 && G.rng() < 0.9) { steerTo(p, p.x, G.los + d * 2.5, s * 0.55, dt); return; }
  if (a === "rush") {
    var tgt = pl.handed ? pl.carrier : qb;
    var lead = 0.25; steerTo(p, tgt.x + tgt.vx * lead, tgt.y + tgt.vy * lead, s * (p.tm === "A" ? (0.85 + 0.15 * P("passRush")) : 1), dt, 8);
    return;
  }
  if (a === "read") {
    if (pl.handed || pl.qbRun || pl.scramble) { var c = pl.carrier || qb; steerTo(p, c.x + c.vx * 0.6, c.y + c.vy * 0.6, s, dt, 10); return; }
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
    steerTo(p, r.x + r.vx * lead2, r.y + r.vy * lead2 + d * cushion * 0.5, s * (0.97 + 0.06 * cov), dt, 7 + 4 * cov);
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
    var reach = 1.0 * (q.tm === "A" ? P("tackleRadius") : 1) + (q.diveT > 0 ? 0.45 : 0) + (isUserCtl(q) ? 0.25 : 0);
    if (dist(q, c) > reach) continue;
    var gang = 0; for (var g2 = 0; g2 < G.players.length; g2++) { var o2 = G.players[g2]; if (o2 !== q && o2.onField && o2.tm === opp && o2.downT <= 0 && !o2.eng && dist(o2, c) < 2.2) gang++; }
    var pT = 0.8 + 0.05 * (q.r.pwr - c.r.pwr) + gang * 0.09 + (q.diveT > 0 ? 0.25 : 0) - (c.jukeT > 0 ? 0.38 : 0) + (isUserCtl(q) ? 0.08 : 0);
    pT += (q.tm === "H" ? G.mods.def : G.mods.off ? 0 : 0) * 0.04 - (c.tm === "H" ? G.mods.off : 0) * 0.03;
    pT = clamp(pT, 0.12, 0.96);
    if (G.rng() < pT) { stat(q.tm, q.ridx).tkl++; G.play.tackler = q;
      var behind = (c.y - G.play.startLos) * dirOf(G.play.startPoss) < 0;
      var isSack = G.play.off.type === "pass" && !G.play.thrown && c === G.play.qb && !G.play.possChanged && behind;
      if (q.diveT > 0) { q.diveT = 0; q.downT = 0.8; }
      c.downT = 1.2; c.state = "down"; c.vx *= 0.3; c.vy *= 0.3;
      return endPlay(isSack ? "sack" : "tackle", c);
    } else { q.stun = 0.4; q.tackleCd = 0.5; c.slowT = 0.3; if (q.diveT > 0) { q.diveT = 0; q.downT = 0.8; } ev("broken_tackle"); sfx("hit");
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
  G.lastRunoff = 0; if (!stopped && !G.ot) { var ro = Math.min(G.clock, 7); G.clock -= ro; G.lastRunoff = ro; }
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
    G.quarter = 3; G.half = 2; G.clock = G.qlen; G.tos = { H: 3, A: 3 }; setPhase("halftime"); G.halfT = 0;
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
    if (G.score.H !== G.score.A || (G.ot >= 3 && !G.franchise) || G.ot >= 12) { if (G.score.H === G.score.A && G.franchise) G.score[G.rng() < 0.5 ? "H" : "A"] += 3; finalWhistle(); return true; }
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
    case "playcall": idleDrift(dt); tickPlayClock(dt); if (G.bot && G.phaseT > 0.4 && !G.call.launched) botPlayCall();
      if (G.poss === "A" && G.call && G.call.special && !G.call.launched && G.phaseT > 1.0) { G.call.launched = true; launchCall(); } break;
    case "lineup": presnapMove(dt); tickPlayClock(dt); if (G.phaseT > 2.6 || (G.phaseT > 0.6 && presnapSet())) setPhase("presnap"); break;
    case "presnap": presnapMove(dt); tickPlayClock(dt);
      if (G.poss === "H" && !G.bot && !G.attract) { if (G.wantSnap) snap(); }
      else { var wait = (G.poss === "A" && !G.bot && !G.attract) ? (G.picked ? 1.6 : 4.0) : 0.5; if (UI.menuOpen && G.poss === "A" && G.phaseT < 7) wait = 99; if (G.phaseT > wait) snap(); }
      break;
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
function tickPlayClock(dt) {
  if (G.attract || G.bot) return; G.pclock = Math.max(0, G.pclock - dt);
  if (G.pclock <= 0 && G.poss === "H" && (G.phase === "presnap" || G.phase === "lineup" || G.phase === "playcall")) delayOfGame();
  if (G.pclock <= 0 && G.poss === "A") G.pclock = 0.01;
}
function delayOfGame() {
  var d = dirOf(G.poss), toOwn = ydFromOwn(G.poss, G.los), back = Math.min(5, toOwn / 2);
  G.los -= d * back; if (100 - ydFromOwn(G.poss, G.los) > G.toGo) G.toGo = Math.round((G.toGo + back) * 10) / 10;
  G.toGo = Math.ceil(G.toGo); banner("b.delay", null, false, "#ffd23f"); sfx("whistle"); ev("penalty", { kind: "delay" }); G.pclock = 25;
  if (G.phase === "playcall") { layoutFormation(null, null, true); if (!G.noHuddle) layoutHuddle(); } else startPresnap();
}
function requestSnap() { if ((G.phase === "presnap" || G.phase === "lineup") && G.poss === "H") { if (G.phase === "lineup") setPhase("presnap"); G.wantSnap = true; } }
function callTimeout(tm) {
  if (!G.tos || G.tos[tm] <= 0 || G.ended) return false;
  if (!(G.phase === "playcall" || G.phase === "presnap" || G.phase === "lineup")) return false;
  G.tos[tm]--; if (!G.ot && G.lastRunoff) { G.clock = Math.min(G.qlen, G.clock + G.lastRunoff); G.lastRunoff = 0; }
  G.pclock = 40; banner("b.timeout", { t: teamOf(tm).abbr }, false, "#ffd23f"); sfx("whistle"); ev("timeout_called", { tm: tm }); return true;
}
function setHot(role, rt) { if (!G.play || G.poss !== "H") return; G.hot[role] = rt; sfx("tap"); ev("hot_route", { role: role, route: rt }); }
function userAudible(id) { if (G.poss !== "H" || !(G.phase === "presnap" || G.phase === "lineup")) return; G.call.off = id; G.hot = {}; sfx("tap"); ev("audible", { play: id }); startPresnap(); }
function userDefAudible(id) { if (G.poss !== "A" || !G.play || !(G.phase === "presnap" || G.phase === "lineup")) return; G.call.def = id; G.play.def = defById(id); layoutFormation(G.play.off, G.play.def, false); sfx("tap"); ev("def_audible", { def: id }); }
function routeName(role) { var pl = G.play; if (!pl) return null; if (G.hot && G.hot[role] !== undefined) return G.hot[role]; return pl.off.routes[role]; }
function isEligibleRoute(role) { var rt = routeName(role); return !!(rt && ROUTES[rt]); }
function routePts(p, rt, flip, d) {
  var inward = p.gx < G.ballX ? 1 : -1; if (Math.abs(p.gx - G.ballX) < 0.5) inward = -flip;
  return ROUTES[rt].map(function (w) { return { x: clamp(p.gx + inward * w[0], 1, FW - 1), y: p.gy + d * w[1] }; });
}
function previewRoutes() {
  var pl = G.play; if (!pl) return null; var d = dirOf(G.poss), flip = G.call.flip ? -1 : 1, out = [];
  ["WR1", "WR2", "WR3", "TE", "RB"].forEach(function (role) { var p = byRole(G.poss, role); if (!p) return; var rt = routeName(role);
    if (pl.off.run && pl.off.run.carrier === role.slice(0, 2) && role === "RB" && !pl.off.pa) return;
    if (!rt || !ROUTES[rt]) return; var pts = [{ x: p.gx, y: p.gy }].concat(routePts(p, rt, flip, d));
    if (!STOP_ROUTES[rt]) { var a = pts[pts.length - 1], b = pts[pts.length - 2], l = len(a.x - b.x, a.y - b.y) || 1; if (rt !== "go" && rt !== "seam" && rt !== "fade") pts.push({ x: clamp(a.x + (a.x - b.x) / l * 4, 1, FW - 1), y: a.y + (a.y - b.y) / l * 4 }); }
    if (rt === "go" || rt === "seam") pts[pts.length - 1] = { x: pts[pts.length - 1].x, y: p.gy + d * 22 };
    out.push({ pts: pts, hot: G.hot && G.hot[role] !== undefined }); });
  if (pl.off.run && !pl.off.pa) { var cr = byRole(G.poss, pl.off.run.carrier === "QB" ? "QB" : "RB"), aim = G.ballX + pl.off.run.aim * flip;
    var pts2 = [{ x: cr.gx, y: cr.gy }]; if (pl.off.run.counter) pts2.push({ x: cr.gx - pl.off.run.aim * flip * 0.5, y: G.los - d * 3 });
    pts2.push({ x: aim, y: G.los }, { x: aim + (pl.off.run.aim > 6 ? flip * 2 : 0), y: G.los + d * 5 }); out.push({ pts: pts2, run: true }); }
  return out;
}
function presnapSet() { for (var i = 0; i < G.players.length; i++) { var p = G.players[i]; if (p.onField && (Math.abs(p.x - p.gx) > 0.6 || Math.abs(p.y - p.gy) > 0.6)) return false; } return true; }
function presnapMove(dt) {
  G.players.forEach(function (p) { if (!p.onField) return; steerTo(p, p.gx, p.gy, 9, dt, 10); integ(p, dt);
    var d = dirOf(G.poss); p.hx = 0; p.hy = p.tm === G.poss ? d : -d; });
}
function idleDrift(dt) {
  G.players.forEach(function (p) { if (!p.onField) return; steerTo(p, p.gx, p.gy, 6, dt, 6); integ(p, dt);
    if (len(p.vx, p.vy) < 0.6) { if (p.hc) { var hx = p.hc.x - p.x, hy = p.hc.y - p.y, hl = len(hx, hy) || 1; p.hx = hx / hl; p.hy = hy / hl; } else { var d = dirOf(G.poss); p.hx = 0; p.hy = p.tm === G.poss ? d : -d; } } });
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
  } else G.call.def = cpuDefenseCall();
  launchCall();
}
function cpuOffenseCallFor(tm) {
  var dist2 = 100 - ydFromOwn(tm, G.los), k = kicker(tm), range = 30 + k.pwr * 2.6;
  if (G.twoPt) return { play: G.rng() < 0.5 ? "slants" : "gdive", flip: G.rng() < 0.5 };
  if (G.down === 4) {
    var trailing = G.score[tm] < G.score[other(tm)], late = G.quarter >= 4 && G.clock < 120;
    if (dist2 + 17 <= range - 4 && !(trailing && Math.abs(G.score.H - G.score.A) > 3 && late)) return { special: "fg" };
    if (!(G.ot || (late && trailing) || (G.toGo <= 1 && ydFromOwn(tm, G.los) > 45))) return { special: "punt" };
  }
  return { play: situationPlay(tm), flip: G.rng() < 0.5 };
}
