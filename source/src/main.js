// ---------- PARAMS ----------
var PARAMS = {}, BASE = {};
var QS = (function () { var o = {}; try { (location.search || "").replace(/^\?/, "").split("&").forEach(function (kv) { if (!kv) return; var p = kv.split("="); o[decodeURIComponent(p[0])] = p.length > 1 ? decodeURIComponent(p[1]) : "1"; }); } catch (e) {} return o; })();
var HOST = window.playable && typeof window.playable === "object" ? window.playable : null;
var TEST = "test" in QS;

function coerce(id, v) {
  var d = CONFIG.params[id]; if (!d) return v;
  if (d.type === "int") { v = Math.round(+v); if (isNaN(v)) v = d.def; return clamp(v, d.min, d.max); }
  if (d.type === "float") { v = +v; if (isNaN(v)) v = d.def; return clamp(v, d.min, d.max); }
  if (d.type === "bool") return v === true || v === "1" || v === "true" || v === "on";
  if (d.type === "text") return String(v == null ? "" : v).slice(0, d.max || 64);
  if (d.type === "enum") return d.options.indexOf(v) >= 0 ? v : d.def;
  return v;
}
function recomputeParams() {
  var pre = CONFIG.difficulty[App.diff] || {};
  for (var id in CONFIG.params) { var d = CONFIG.params[id], b = BASE[id];
    if (pre[id] !== undefined && (d.type === "float" || d.type === "int")) PARAMS[id] = clamp(pre[id] * (b / (d.def || 1)), d.min, d.max);
    else PARAMS[id] = b; }
}
function setParam(id, v) { if (!CONFIG.params[id]) return; BASE[id] = coerce(id, v); recomputeParams(); onParamChange(id); }
function onParamChange(id) {
  if (id === "pixelSize" || id === "camera") { R.fieldKey = ""; App.layout(); if (G) camUpdate(0, true); }
  if (id === "sfxVolume" || id === "musicVolume") audioVolumes();
  if (id === "quarterMinutes" && G && !G.attract && G.quarter === 1 && G.clock === G.qlen) { G.qlen = P("quarterMinutes") * 60; G.clock = G.qlen; }
  if (UI.endShown && (id === "endTitle" || id === "endSub" || id === "ctaText")) UI.showEnd(true);
}
function snake(s) { return s.replace(/[A-Z]/g, function (m) { return "_" + m.toLowerCase(); }); }

// ---------- APP ----------
var App = {
  diff: "normal", paused: false, hostPaused: false, hidden: false, inp: { mx: 0, my: 0, juke: false, dive: false, sw: false, throwTo: null }, keys: {},
  st: "boot", save: { w: 0, l: 0, t: 0 }, seeds: { home: 11, away: 23 }, endT: 0, lastTime: 0,
  seedFor: function (which) { return App.seeds[which]; },
  boot: function () {
    for (var id in CONFIG.params) BASE[id] = CONFIG.params[id].def;
    var sv = loadSave();
    if (sv) { App.save = { w: sv.w || 0, l: sv.l || 0, t: sv.t || 0 }; if (sv.diff) App.diff = sv.diff; if (sv.qmin) BASE.quarterMinutes = coerce("quarterMinutes", sv.qmin); if (sv.cam) BASE.camera = sv.cam === "classic" ? "classic" : "pro"; if (sv.lang) App.lang = sv.lang; }
    if (window.__DIFF) App.diff = window.__DIFF;
    if (QS.diff && CONFIG.difficulty[QS.diff]) App.diff = QS.diff;
    if (window.__PARAMS) for (var k in window.__PARAMS) if (CONFIG.params[k]) BASE[k] = coerce(k, window.__PARAMS[k]);
    for (var q in QS) if (CONFIG.params[q]) BASE[q] = coerce(q, QS[q]);
    if (HOST) {
      var s = HOST.settings || {}, hp = HOST.params || {};
      if (s.difficulty && CONFIG.difficulty[s.difficulty]) App.diff = s.difficulty;
      if (s.max_play_time) BASE.maxPlayTime = coerce("maxPlayTime", s.max_play_time);
      if (s.hint_delay) BASE.hintDelay = coerce("hintDelay", s.hint_delay);
      if (s.cta_text !== undefined) BASE.ctaText = coerce("ctaText", s.cta_text);
      for (var id2 in CONFIG.params) { var sk = snake(id2); if (hp[sk] !== undefined) BASE[id2] = coerce(id2, hp[sk] === "on" ? true : hp[sk] === "off" ? false : hp[sk]); }
    }
    recomputeParams();
    App.pickLang();
    // teams
    if (sv && sv.home && sv.home.roster) { App.home = sv.home; App.away = sv.away; App.awayIdx = sv.awayIdx || 1; }
    else { App.home = makeTeam(0, App.seeds.home); App.awayIdx = 1; App.away = makeTeam(1, App.seeds.away); }
    renderInit($("cv"));
    UI.init();
    App.bindInput();
    var game = $("game");
    if (window.ResizeObserver) new ResizeObserver(function () { App.layout(); }).observe(game);
    window.addEventListener("resize", function () { App.layout(); });
    window.addEventListener("orientationchange", function () { setTimeout(App.layout, 200); });
    document.addEventListener("visibilitychange", function () { App.hidden = document.hidden; audioSuspend(App.hidden || App.paused || App.hostPaused); });
    setInterval(function () { if (App.hidden !== document.hidden) { App.hidden = document.hidden; audioSuspend(App.hidden); } }, 500);
    App.layout();
    if (TEST) { CONFIG.meta.seed = +QS.seed || CONFIG.meta.seed; }
    App.toTitle(true);
    $("loader").classList.add("gone");
    if (HOST) { HOST.onUpdate = App.onHostUpdate; HOST.onCommand = App.onHostCommand; }
    if ("tune" in QS) App.buildTune();
    window.__game = GAME_API;
    requestAnimationFrame(App.frame);
    if (HOST && typeof HOST.ready === "function") { try { HOST.ready(); } catch (e) {} }
  },
  pickLang: function () {
    var l = (HOST && HOST.settings && HOST.settings.locale && HOST.settings.locale !== "auto") ? HOST.settings.locale : (window.__LANG || QS.lang || App.lang || (navigator.language || "en"));
    l = String(l).toLowerCase().slice(0, 2); LANG = STRINGS[l] ? l : "en";
  },
  setLang: function (l) { LANG = STRINGS[l] ? l : "en"; App.lang = LANG; App.persist(); UI.applyLang(); },
  layout: function () { var g = $("game"), r = g.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; renderLayout(r.width, r.height); if (G) { camUpdate(0, true); } document.documentElement.style.setProperty("--u", Math.min(r.width / 390, r.height / 640) + ""); },
  persist: function () { writeSave({ cam: BASE.camera, w: App.save.w, l: App.save.l, t: App.save.t, diff: App.diff, qmin: BASE.quarterMinutes, lang: App.lang, home: App.home, away: App.away, awayIdx: App.awayIdx }); },
  saveTeams: function () { App.persist(); },
  setDiff: function (d) { App.diff = d; recomputeParams(); App.persist(); },
  cycleTeam: function (which, dir) {
    var cur = which === "home" ? App.home : App.away, other2 = which === "home" ? App.away : App.home;
    var idx = cur.school; for (var i = 0; i < SCHOOLS.length; i++) { idx = (idx + dir + SCHOOLS.length) % SCHOOLS.length; if (idx !== other2.school) break; }
    App.seeds[which] += 7; var t = makeTeam(idx, App.seeds[which]);
    if (which === "home") App.home = t; else { App.away = t; App.awayIdx = idx; }
    App.persist(); UI.renderSetup();
  },
  peekNext: function () { var idx = App.away.school; for (var i = 0; i < SCHOOLS.length; i++) { idx = (idx + 1) % SCHOOLS.length; if (idx !== App.home.school) break; } return { idx: idx, name: SCHOOLS[idx].name + " " + SCHOOLS[idx].mascot }; },
  toTitle: function (first) {
    App.st = "intro"; UI.endShown = false; $("end").classList.add("hidden"); $("hud").classList.add("hidden"); $("dock").classList.add("hidden");
    $("playcall").classList.add("hidden"); $("pat").classList.add("hidden"); $("meter").classList.add("hidden");
    crowdStop();
    // attract-mode demo game behind the title
    newGame(cloneTeam(App.home), cloneTeam(App.away), { seed: (Date.now() & 0xffff), bot: true, attract: true }); R.fieldKey = "";
    camUpdate(0, true);
    UI.show("title");
    if (!first) musicStart();
  },
  startGame: function () {
    audioInit(); musicStop(); crowdStart();
    var seed = TEST ? (CONFIG.meta.seed >>> 0) : ((QS.seed ? +QS.seed : (Date.now() ^ (Math.random() * 4294967296))) >>> 0);
    newGame(App.home, App.away, { seed: seed, bot: "bot" in QS }); R.fieldKey = ""; App.recorded = false;
    App.st = "play"; App.playT = 0; UI.bannerQ = []; UI.bannerT = 0; UI.dockKey = ""; UI.flip = false;
    UI.startGameUI(); camUpdate(0, true); ev("begin");
  },
  next: function () {
    var n = App.peekNext(); App.seeds.away += 13; App.away = makeTeam(n.idx, App.seeds.away); App.awayIdx = n.idx; App.persist(); App.startGame();
  },
  startFranchiseGame: function () {
    var g = currentUserGame(); if (!g) return;
    audioInit(); musicStop(); crowdStart();
    var u = userEngineTeam(), oppId = g.h === FR.user ? g.a : g.h, opp = cpuEngineTeam(oppId), userHome = g.h === FR.user;
    if (FR.phase === "playoffs" && FR.playoffs.cur === FR.playoffs.rounds.length - 1) userHome = true;
    var mods = { off: FR.upg.staff * 0.4 + FR.upg.film * 0.2, def: FR.upg.staff * 0.4 + FR.upg.film * 0.3 };
    App.frCtx = { g: g, ids: u.ids, userHome: g.h === FR.user };
    var seed = ((Date.now() ^ (Math.random() * 4294967296)) >>> 0);
    newGame(u.team, opp, { seed: seed, userAway: !userHome, mods: mods, franchise: true }); R.fieldKey = "";
    App.st = "play"; App.playT = 0; App.recorded = false; UI.bannerQ = []; UI.bannerT = 0; UI.dockKey = ""; UI.flip = false;
    UI.startGameUI(); camUpdate(0, true); ev("begin");
  },
  frFinish: function () {
    var ctx = App.frCtx; if (!ctx || !G) return; App.frCtx = null;
    var us = G.score.H, them = G.score.A, rows = engineStatsToRows(G.stats, ctx.ids);
    var hs = ctx.userHome ? us : them, as = ctx.userHome ? them : us;
    finishUserGame(ctx.g, hs, as, rows); FUI.toastResult(ctx.g);
    App.toFranchise();
  },
  toFranchise: function () {
    App.st = "intro"; UI.endShown = false; App.frCtx = null; $("end").classList.add("hidden"); $("hud").classList.add("hidden"); $("dock").classList.add("hidden");
    $("playcall").classList.add("hidden"); $("pat").classList.add("hidden"); $("meter").classList.add("hidden"); crowdStop();
    newGame(cloneTeam(App.home), cloneTeam(App.away), { seed: (Date.now() & 0xffff), bot: true, attract: true }); R.fieldKey = ""; camUpdate(0, true);
    FUI.render(); UI.showRaw("fr"); musicStart();
  },
  pause: function (on) { App.paused = on; $("pause").classList.toggle("hidden", !on); audioSuspend(on); },
  showEnd: function () {
    if (!App.recorded) { App.recorded = true; if (!App.frCtx) { if (G.outcome === "win") App.save.w++; else if (G.outcome === "lose") App.save.l++; else App.save.t++; } App.persist();
      sfx(G.outcome === "win" ? "win" : "lose"); notifyGameEnd(G.outcome === "win" ? "win" : G.outcome === "tie" ? "lose" : G.outcome); }
    App.st = "end"; crowdStop(); UI.showEnd();
  },
  mvp: function () {
    var best = null, bs = -1;
    for (var k in G.stats) { if (k[0] !== "H") continue; var s = G.stats[k], ridx = +k.slice(1), r = G.home.roster[ridx];
      var sc = s.rush + s.rec + s.pass * 0.5 + s.td * 20 + s.tkl * 6 + s.int * 25; if (sc > bs) { bs = sc; best = { r: r, yds: s.rush + s.rec + s.pass }; } }
    return best;
  },
  onHostUpdate: function (u) {
    if (!u) return; var s = u.settings || {}, hp = u.params || {}, restart = false;
    if (s.locale !== undefined) { var l = s.locale === "auto" ? (QS.lang || navigator.language || "en") : s.locale; l = String(l).slice(0, 2); if (STRINGS[l] && l !== LANG) { LANG = l; UI.applyLang(); } }
    if (s.difficulty && s.difficulty !== App.diff && CONFIG.difficulty[s.difficulty]) { App.diff = s.difficulty; recomputeParams(); restart = true; }
    if (s.hint_delay !== undefined) BASE.hintDelay = coerce("hintDelay", s.hint_delay);
    if (s.cta_text !== undefined) setParam("ctaText", s.cta_text);
    for (var id in CONFIG.params) { var sk = snake(id); if (hp[sk] === undefined) continue; var v = coerce(id, hp[sk] === "on" ? true : hp[sk] === "off" ? false : hp[sk]);
      if (v !== BASE[id]) { BASE[id] = v; recomputeParams(); onParamChange(id); if (CONFIG.params[id].apply === "restart") restart = true; } }
    recomputeParams();
    if (restart && App.st === "play") { App.restartQueued = true; }
    if (App.paused || App.st === "end") renderFrame(0);
  },
  onHostCommand: function (cmd) {
    var c = typeof cmd === "string" ? cmd : cmd && (cmd.type || cmd.command);
    if (c === "pause") { App.hostPaused = true; audioSuspend(true); } else if (c === "resume") { App.hostPaused = false; audioSuspend(App.paused); }
    else if (c === "mute") { AU.muted = true; audioVolumes(); } else if (c === "unmute") { AU.muted = false; audioVolumes(); }
  },
  bindInput: function () {
    var g = $("game"), joy = $("joy"), knob = $("knob"), J = App.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, t: 0, moved: 0 };
    g.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    g.addEventListener("pointerdown", function (e) {
      audioInit();
      if (App.st !== "play" || App.paused) return;
      if (G.phase === "kick") { kickTap(); return; }
      var r = g.getBoundingClientRect(); J.id = e.pointerId; J.ox = e.clientX - r.left; J.oy = e.clientY - r.top; J.x = 0; J.y = 0; J.t = performance.now(); J.moved = 0;
      try { g.setPointerCapture(e.pointerId); } catch (er) {}
      if (G.phase === "presnap" && G.poss === "A") { var pk = pickPlayerAt(J.ox, J.oy, "H", 40); if (pk) selectDefender(pk); J.id = null; return; }
      if (G.phase === "live") { joy.style.left = J.ox + "px"; joy.style.top = J.oy + "px"; joy.classList.remove("hidden"); knob.style.transform = "translate(-50%,-50%)"; }
      e.preventDefault();
    });
    g.addEventListener("pointermove", function (e) {
      if (J.id !== e.pointerId) return; var r = g.getBoundingClientRect(); var dx = e.clientX - r.left - J.ox, dy = e.clientY - r.top - J.oy, l = Math.sqrt(dx * dx + dy * dy);
      J.moved = Math.max(J.moved, l); var R2 = 54; if (l > R2) { dx = dx / l * R2; dy = dy / l * R2; }
      if (l < 8) { J.x = 0; J.y = 0; } else { J.x = dx / R2; J.y = dy / R2; }
      knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    });
    var up = function (e) {
      if (J.id !== e.pointerId) return; J.id = null; joy.classList.add("hidden");
      var tap = J.moved < 10 && performance.now() - J.t < 280; J.x = 0; J.y = 0;
      if (tap && App.st === "play" && G.phase === "live") App.tapAt(J.ox, J.oy);
    };
    g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
    window.addEventListener("keydown", function (e) {
      var k = e.key.toLowerCase(); App.keys[k] = true; audioInit();
      if (App.st !== "play") return;
      if (k === "escape" || k === "p") { App.pause(!App.paused); return; }
      if (k === " " || k === "j") { if (G.phase === "kick") kickTap(); else if (G.play && G.play.carrier && G.play.carrier.tm === "H") App.inp.juke = true; else App.inp.dive = true; e.preventDefault(); }
      if (k === "shift" || k === "q") App.inp.sw = true;
      var map = { "1": "WR1", "2": "WR2", "3": "WR3", "4": "TE", "5": "RB", z: "WR1", x: "WR2", c: "WR3", v: "TE", b: "RB" };
      if (G.phase === "live" && map[k]) App.inp.throwTo = map[k];
      if (G.phase === "playcall" && /^[1-6]$/.test(k)) { var i = +k - 1; if (G.poss === "H" && PLAYS[i]) { userCall("off", PLAYS[i].id, UI.flip); UI.closePanels(); } else if (G.poss === "A" && DEFS[i]) { userCall("def", DEFS[i].id); UI.closePanels(); } }
      if (G.phase === "pat" && (k === "1" || k === "2")) { UI.closePanels(); userPAT(k === "1" ? "kick" : "two"); }
      if (k.indexOf("arrow") === 0) e.preventDefault();
    });
    window.addEventListener("keyup", function (e) { App.keys[e.key.toLowerCase()] = false; });
  },
  tapAt: function (cx, cy) {
    var pl = G.play; if (!pl) return;
    if (G.poss === "H" && pl.off.type === "pass" && !pl.thrown && !pl.crossed) {
      var best = null, bd = 40; RECV_KEYS.forEach(function (k) { var r = byRole("H", k.role); if (!r || r.assign !== "route") return; var p = projectCss(r.x, r.y, 1.6); if (!p.on) return; var d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = k.role; } });
      if (best) App.inp.throwTo = best; return;
    }
    if (pl.carrier && pl.carrier.tm === "H") { App.inp.juke = true; return; }
    var pk = pickPlayerAt(cx, cy, "H", 30); if (pk && pk !== G.ctl) { selectDefender(pk); return; }
    App.inp.dive = true;
  },
  readInput: function () {
    var J = App.joy, k = App.keys, mx = J.x, my = J.y;
    var kx = (k["arrowright"] || k["d"] ? 1 : 0) - (k["arrowleft"] || k["a"] ? 1 : 0), ky = (k["arrowdown"] || k["s"] ? 1 : 0) - (k["arrowup"] || k["w"] ? 1 : 0);
    if (kx || ky) { var l = Math.sqrt(kx * kx + ky * ky); mx = kx / l; my = ky / l; }
    // screen -> world: screen up = +y
    var i = App.inp, cd = R.cam.dir || 1; return { mx: mx * cd, my: -my * cd, juke: i.juke, dive: i.dive, sw: i.sw, throwTo: i.throwTo };
  },
  clearEdges: function () { var i = App.inp; i.juke = false; i.dive = false; i.sw = false; i.throwTo = null; },
  advance: function (dt, inp) {
    var n = Math.max(1, Math.ceil(dt / (1 / 60) - 1e-6)), h = dt / n;
    for (var s = 0; s < n; s++) { simStep(h, inp); if (s === 0 && inp) { inp = { mx: inp.mx, my: inp.my }; } }
    if (G && !G.attract && App.st === "play") { App.playT += dt; if (App.playT > P("maxPlayTime") && !G.ended) { G.ended = true; G.outcome = "timeout"; G.won = false; setPhase("final"); G.finalT = 3; ev("timeout"); } }
    if (App.restartQueued) { App.restartQueued = false; App.startGame(); }
  },
  frame: function (ts) {
    requestAnimationFrame(App.frame);
    var raw = App.lastTime ? (ts - App.lastTime) / 1000 : 1 / 60; App.lastTime = ts;
    if (raw > 0) R.fps = R.fps * 0.95 + (1 / raw) * 0.05;
    var dt = clamp(raw, 0, 0.05);
    if (App.hidden || App.hostPaused) return;
    if (App.stepping) return;
    if (!App.paused && !(App.st === "end")) {
      var inp = App.readInput(); App.advance(dt, App.st === "play" ? inp : null); App.clearEdges();
    }
    if (G) camUpdate(dt);
    renderFrame(dt); UI.tick(dt);
  },
  buildTune: function () {
    var t = $("tune"); t.classList.remove("hidden"); t.innerHTML = "<b>TUNE</b>";
    Object.keys(CONFIG.params).forEach(function (id) { var d = CONFIG.params[id]; if (d.hidden) return;
      var row = el("label", "", "<span>" + esc(d.label) + "</span>"), inp = el("input"); inp.setAttribute("data-ui", "1");
      if (d.type === "bool") { inp.type = "checkbox"; inp.checked = !!BASE[id]; inp.addEventListener("change", function () { setParam(id, inp.checked); }); }
      else if (d.type === "text") { inp.type = "text"; inp.value = BASE[id]; inp.addEventListener("input", function () { setParam(id, inp.value); }); }
      else { inp.type = "number"; inp.min = d.min; inp.max = d.max; inp.step = d.step || 1; inp.value = BASE[id]; inp.addEventListener("change", function () { setParam(id, inp.value); }); }
      inp.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); inp.addEventListener("keydown", function (e) { e.stopPropagation(); });
      row.appendChild(inp); t.appendChild(row); });
  }
};

function notifyGameEnd(outcome) {
  try { if (typeof window.gameEnd === "function") window.gameEnd(); } catch (e) {}
  try { if (window.playableSDK && playableSDK.reportGameEnd) playableSDK.reportGameEnd(); } catch (e) {}
  try { if (HOST && typeof HOST.gameEnd === "function") HOST.gameEnd(outcome); } catch (e) {}
}

// ---------- TEST HOOK ----------
function objBox(x, y, h) { var a = projectCss(x - 1.1, y, 0), b = projectCss(x + 1.1, y, h || 3.4); return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) }; }
function objEntry(o, h) { if (!o) return { exists: false, drawn: false, onScreen: false, box: null };
  var bx = objBox(o.x, o.y, h), on = bx.x1 > 0 && bx.y1 > 0 && bx.x0 < R.cssW && bx.y0 < R.cssH;
  return { exists: true, drawn: true, onScreen: on, box: bx, pos: [+o.x.toFixed(2), 0, +o.y.toFixed(2)], x: +o.x.toFixed(2), y: +o.y.toFixed(2) }; }
var GAME_API = {
  step: function (n, dt, input) {
    dt = dt || 1 / 30; App.stepping = true;
    for (var i = 0; i < (n || 1); i++) {
      var inp = typeof input === "function" ? input(GAME_API) : input;
      if (App.st === "end" || App.paused) continue;
      App.advance(dt, App.st === "play" ? (inp || App.readInput()) : null); App.clearEdges();
      if (G) camUpdate(dt); UI.tick(dt);
    }
    renderFrame(0); App.stepping = false; return GAME_API.info();
  },
  render: function () { renderFrame(0); },
  begin: function () { if (App.st !== "play") App.startGame(); },
  bot: function () { return { mx: 0, my: 0 }; },
  info: function () {
    var st = App.st === "boot" ? "boot" : App.st === "end" ? "end" : App.st === "play" ? (G && G.ended && UI.endShown ? "end" : "play") : "intro";
    var g = G && !G.attract ? G : null;
    var o = {};
    if (g) { var pl = g.play; o.player = objEntry(g.ctl); o.ball = objEntry(g.ball, 1); o.ballCarrier = objEntry(pl && pl.carrier);
      o.firstDownLine = objEntry({ x: FW / 2, y: g.los + dirOf(g.poss) * g.toGo }, 0.2); o.goal = o.firstDownLine;
      o.defenders = { exists: true, drawn: true, onScreen: true, count: g.players.filter(function (p) { return p.onField && p.tm !== g.poss; }).length };
      o.scoreboard = { exists: true, drawn: !$("hud").classList.contains("hidden"), onScreen: true }; }
    return {
      t: g ? +g.t.toFixed(2) : 0, st: st, stage: g ? g.half : 0, phase: g ? g.phase : UI.screen, won: g ? g.won : false, gated: false,
      outcome: g && g.ended ? g.outcome : null, progress: g ? clamp(((g.quarter - 1) * g.qlen + (g.qlen - g.clock)) / (4 * g.qlen), 0, 1) : 0,
      danger: g ? g.danger : 0, maxDanger: g ? g.maxDanger : 0, maxDangerByStage: g ? g.maxDangerByStage : {}, seed: g ? g.seed : 0, lockedFor: 0, scenario: 0,
      score: g ? { home: g.score.H, away: g.score.A } : null, quarter: g ? g.quarter : 0, clock: g ? +g.clock.toFixed(1) : 0, poss: g ? g.poss : null,
      down: g ? g.down : 0, toGo: g ? g.toGo : 0, los: g ? +ydFromOwn(g.poss, g.los).toFixed(1) : 0,
      counters: g ? { home: { real: g.score.H, shown: { hud: +$("hSc").textContent, goal: null, card: null } }, away: { real: g.score.A, shown: { hud: +$("aSc").textContent, goal: null, card: null } } } : {},
      hud: g ? { home: g.score.H, away: g.score.A } : {}, events: g ? g.events.slice(-200) : [], rewards: ["touchdown", "first_down", "pass_complete", "score"],
      objects: o, labels: [], textures: { total: 0, loaded: 0 }, assets: { loaded: [], fallback: [] }, nogl: false,
      visible: { count: 11, pace: P("cpuSpeed"), layout: 4 },
      layout: { design: "390x844", min: "320x480", critical: "390x600", pixel: R.ps, internal: R.iw + "x" + R.ih },
      lang: LANG, diff: App.diff, audio: AU.log
    };
  },
  stats: function () { return { draws: R.draws, fps: +R.fps.toFixed(1) }; },
  params: function () { var o = {}; for (var id in CONFIG.params) { var d = CONFIG.params[id]; o[id] = { label: d.label, group: d.group, type: d.type, def: d.def, min: d.min, max: d.max, step: d.step, apply: d.apply, value: BASE[id] }; } return o; },
  paramsSchema: function () {
    var cat = { Difficulty: "Game", Timing: "Game", Player: "Game", Enemies: "Game", Sound: "Game", Look: "Style", "End card": "End card", Branding: "End card" };
    var out = []; ["Game", "Style", "End card"].forEach(function (c) {
      Object.keys(CONFIG.params).forEach(function (id) { var d = CONFIG.params[id]; if (!d.marketer || d.shared || cat[d.group] !== c) return;
        var e = { id: snake(id), label: d.label, category: c, group: d.group, default: d.def };
        if (d.type === "int" || d.type === "float") { e.type = "range"; e.min = d.min; e.max = d.max; e.step = d.type === "int" ? 1 : (d.step || 0.05); if (d.unit) e.unit = d.unit; }
        else if (d.type === "bool") { e.type = "choice"; e.options = ["on", "off"]; e.default = d.def ? "on" : "off"; }
        else if (d.type === "text") { e.type = "text"; e.max_length = d.max; }
        out.push(e); }); });
    return out;
  },
  paramsValues: function () { var o = {}; GAME_API.paramsSchema().forEach(function (e) { var id = e.id.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }); var v = BASE[id]; o[e.id] = typeof v === "boolean" ? (v ? "on" : "off") : v; }); return o; },
  settingsValues: function () { return { cta_text: BASE.ctaText || "", locale: App.lang || "auto", difficulty: App.diff, max_play_time: BASE.maxPlayTime, hint_delay: BASE.hintDelay }; },
  setParam: function (id, v) { setParam(id, v); },
  probe: function () { var c = G && G.ctl; return { hero: c ? { x: c.x, y: 0, z: c.y, yaw: 0, scale: 1 } : null, camera: { x: R.cam.x, y: 0, z: R.cam.y }, threats: G ? G.players.filter(function (p) { return p.onField && p.tm !== G.poss; }).length : 0 }; },
  project: function (x, y, z) { return projectCss(x, z !== undefined ? z : y, 0); },
  // QA helpers
  _g: function () { return G; }, _fr: function () { return FR; }, _sim: { beginPlayCall: function () { beginPlayCall(); }, userCall: function (a, b, c) { userCall(a, b, c); }, kickTap: function () { kickTap(); }, userPAT: function (c) { userPAT(c); } }, _app: function () { return App; }, _ui: function () { return UI; }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", App.boot); else App.boot();
