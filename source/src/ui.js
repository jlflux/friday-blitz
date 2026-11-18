// ---------- UI (DOM) ----------
var LANG = "en";
function T(key, vars) {
  var s = (STRINGS[LANG] && STRINGS[LANG][key]) || STRINGS.en[key] || key;
  if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
  return s;
}
function $(id) { return document.getElementById(id); }
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

var lastPtrAct = 0;
function onTap(node, fn) {
  node.setAttribute("data-ui", "1");
  node.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  node.addEventListener("pointerup", function (e) { e.stopPropagation(); if (node.disabled) return; lastPtrAct = performance.now(); audioInit(); fn(e); });
  node.addEventListener("click", function (e) { e.stopPropagation(); if (performance.now() - lastPtrAct < 600) return; if (node.disabled) return; audioInit(); fn(e); });
}

var UI = {
  screen: "boot", hintSeen: {}, bannerQ: [], bannerT: 0,
  init: function () {
    var ui = $("ui");
    ui.innerHTML = [
      '<div id="title" class="scr hidden"><div class="tlogo"><canvas id="logo" width="80" height="44"></canvas><div class="tag" id="tTag"></div></div>',
      '<div class="tbtns"><button class="btn big pri" id="bFr"></button><button class="btn big sec2" id="bPlay"></button><div class="rec" id="tRec"></div></div><div class="langs" id="langs"></div></div>',
      '<div id="fr" class="scr hidden"></div>',
      '<div id="setup" class="scr hidden"><div class="ph" id="sTitle"></div><div id="cards"></div>',
      '<div class="opt"><div class="ol" id="lDiff"></div><div class="seg" id="segDiff"></div></div>',
      '<div class="opt"><button class="btn sm sec" id="bCam"></button></div>',
      '<div class="opt"><div class="ol" id="lQtr"></div><div class="stepper"><button class="btn sm" id="qMinus">-</button><span id="qVal"></span><button class="btn sm" id="qPlus">+</button></div></div>',
      '<div class="row2"><button class="btn sec" id="bBack"></button><button class="btn big pri" id="bKick"></button></div></div>',
      '<div id="editor" class="scr hidden"><div class="etabs"><button class="tab" id="tabTeam"></button><button class="tab" id="tabRoster"></button><button class="btn pri sm" id="bDone"></button></div><div id="ebody"></div></div>',
      '<div id="hud" class="hidden"><div id="tag"><canvas id="tagCv" width="24" height="32"></canvas><div class="tgt"><div id="tagN"></div><div id="tagP"></div></div></div>',
      '<div id="board"><div class="tm" id="hTm"><span class="ab" id="hAb"></span><span class="tos" id="hTo"></span><span class="sc" data-hud="home" id="hSc">0</span></div>',
      '<div class="tm" id="aTm"><span class="ab" id="aAb"></span><span class="tos" id="aTo"></span><span class="sc" data-hud="away" id="aSc">0</span></div>',
      '<div class="clk"><span id="qtr"></span><span id="clock" data-hud="clock"></span></div><div id="dd" data-goal="1"></div><div id="pclk"></div></div>',
      '<div class="tr"><button class="btn icon" id="bMute">&#9835;</button><button class="btn icon" id="bPause" data-cover="1">II</button></div></div>',
      '<div id="banner" data-cover="1"></div><div id="hint" data-cover="1"></div><div id="ticker" data-cover="1"></div>',
      '<div id="dock" class="hidden"><div id="dockL"></div><div id="dockR"></div></div>',
      '<div id="joy" class="hidden"><div id="knob"></div></div>',
      '<div id="playcall" class="panel hidden"></div><div id="pat" class="panel hidden"></div><div id="menu" class="panel mini hidden"></div>',
      '<div id="meter" class="hidden"><div class="mt" id="mTitle"></div><div id="mbar"><div id="mwin"></div><div id="mneedle"></div></div><div class="mh" id="mHint"></div></div>',
      '<div id="pause" class="scr dim hidden"><div class="ph" id="pTitle"></div><button class="btn big pri" id="pRes"></button><button class="btn sec" id="pCam"></button><button class="btn sec" id="pRst"></button><button class="btn sec" id="pQuit"></button></div>',
      '<div id="end" class="hidden"><div class="dim2"></div><div class="rays"></div><div class="ecwrap"><div class="ec-copy-panel" data-end-copy-panel="1"><div class="eid" data-end-id="1"><img id="eIcon" alt=""><span id="eName"></span></div>',
      '<div class="et" id="eTitle"></div><div class="escore" id="eScore" data-hud="final"></div><div class="es" id="eSub"></div><div class="emvp" id="eMvp"></div><div class="erec" id="eRec"></div></div>',
      '<div class="eact"><button class="btn big" id="eNext"></button><button class="btn sec" id="eReplay"></button><button class="btn sm ghost" id="eTitleB"></button></div></div></div>',
      '<div id="tune" class="hidden"></div>'
    ].join("");
    onTap($("bPlay"), function () { musicStart(); UI.show("setup"); });
    onTap($("bFr"), function () { musicStart(); FUI.open(); });
    onTap($("bCam"), function () { setParam("camera", P("camera") === "pro" ? "classic" : "pro"); App.persist(); UI.applyLang(); });
    onTap($("pCam"), function () { setParam("camera", P("camera") === "pro" ? "classic" : "pro"); App.persist(); UI.applyLang(); });
    onTap($("bBack"), function () { UI.show("title"); });
    onTap($("bKick"), function () { App.startGame(); });
    onTap($("qMinus"), function () { setParam("quarterMinutes", P("quarterMinutes") - 1); UI.renderSetup(); });
    onTap($("qPlus"), function () { setParam("quarterMinutes", P("quarterMinutes") + 1); UI.renderSetup(); });
    onTap($("bDone"), function () { UI.closeEditor(); });
    onTap($("tabTeam"), function () { UI.edTab = "team"; UI.renderEditor(); });
    onTap($("tabRoster"), function () { UI.edTab = "roster"; UI.renderEditor(); });
    onTap($("bPause"), function () { App.pause(true); });
    onTap($("bMute"), function () { AU.muted = !AU.muted; audioVolumes(); $("bMute").classList.toggle("off", AU.muted); });
    onTap($("pRes"), function () { App.pause(false); });
    onTap($("pRst"), function () { App.pause(false); App.startGame(); });
    onTap($("pQuit"), function () { App.pause(false); if (App.frCtx) { App.frCtx = null; App.toFranchise(); } else App.toTitle(); });
    onTap($("eNext"), function () { if (performance.now() < (UI.endLock || 0)) return; if (App.frCtx) App.frFinish(); else App.next(); });
    onTap($("eReplay"), function () { App.startGame(); });
    onTap($("eTitleB"), function () { if (App.frCtx) App.frFinish(); else App.toTitle(); });
    UI.drawLogo(); UI.applyLang();
  },
  applyLang: function () {
    document.documentElement.lang = LANG; document.body.classList.toggle("cjk", LANG === "zh");
    $("tTag").textContent = T("title.tag"); $("bPlay").textContent = T("menu.quick"); $("bFr").textContent = T("menu.fr");
    $("bCam").textContent = T("set.camera") + ": " + T("cam." + P("camera")); $("pCam").textContent = T("pause.camera", { c: T("cam." + P("camera")) });
    $("sTitle").textContent = T("setup.title"); $("lDiff").textContent = T("setup.diff"); $("lQtr").textContent = T("setup.qtr");
    $("bBack").textContent = "◀"; $("bKick").textContent = T("setup.start");
    $("tabTeam").textContent = T("edit.team"); $("tabRoster").textContent = T("edit.roster"); $("bDone").textContent = T("edit.done");
    $("pTitle").textContent = T("pause.title"); $("pRes").textContent = T("pause.resume"); $("pRst").textContent = T("pause.restart"); $("pQuit").textContent = T("pause.quit");
    $("mTitle").textContent = T("kick.tap"); $("mHint").textContent = T("hint.kick");
    var langs = $("langs"); langs.innerHTML = "";
    [["en", "EN"], ["es", "ES"], ["zh", "中文"]].forEach(function (l) { var b = el("button", "btn sm" + (LANG === l[0] ? " on" : ""), l[1]);
      onTap(b, function () { App.setLang(l[0]); }); langs.appendChild(b); });
    UI.renderRecord();
    if (UI.screen === "setup") UI.renderSetup();
    if (UI.screen === "editor") UI.renderEditor();
    if (UI.screen === "fr") FUI.render();
    if (G && !G.attract) { UI.hud(); if (G.phase === "playcall") UI.showPlaycall(); }
    if (UI.endShown) UI.showEnd(true);
  },
  drawLogo: function () {
    var cv = $("logo"), c = cv.getContext("2d"); c.clearRect(0, 0, 80, 44);
    function grad(txt, x, y, s, cols) {
      // outline + shadow
      [[2, 2, "#000"], [-1, 0, "#1a0a2a"], [1, 0, "#1a0a2a"], [0, -1, "#1a0a2a"], [0, 1, "#1a0a2a"], [1, 1, "#1a0a2a"]].forEach(function (o) { drawText3(c, txt, x + o[0], y + o[1], o[2], s); });
      var tmp = makeCanvas(80, 44), tc = tmp.getContext("2d"); drawText3(tc, txt, x, y, "#fff", s);
      var id = tc.getImageData(0, 0, 80, 44), d = id.data;
      for (var yy = 0; yy < 44; yy++) { var k = Math.min(cols.length - 1, Math.floor((yy - y) / (5 * s) * cols.length)); var cc = hexToRgb(cols[Math.max(0, k)]);
        for (var xx = 0; xx < 80; xx++) { var i = (yy * 80 + xx) * 4; if (d[i + 3]) { d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; } } }
      tc.putImageData(id, 0, 0); c.drawImage(tmp, 0, 0);
    }
    grad("FRIDAY NIGHT", 16, 2, 1, ["#ffffff", "#c9d6ff"]);
    grad("BLITZ", 4, 10, 3, ["#fff6a0", "#ffd23f", "#ffa51a", "#ff6b1a", "#e8331c"]);
    c.fillStyle = "#ffd23f"; c.fillRect(4, 29, 72, 1); c.fillStyle = "#e8331c"; c.fillRect(4, 30, 72, 1);
  },
  renderRecord: function () { var s = App.save; $("tRec").textContent = s && (s.w + s.l + s.t) ? T("ui.record", { w: s.w, l: s.l, t: s.t }) : ""; },
  showRaw: function (name) { ["title", "setup", "editor", "fr"].forEach(function (n) { $(n).classList.toggle("hidden", n !== name); }); UI.screen = name; },
  show: function (name) {
    ["title", "setup", "editor", "fr"].forEach(function (n) { $(n).classList.toggle("hidden", n !== name); });
    UI.screen = name; if (name === "setup") UI.renderSetup(); if (name === "title") UI.renderRecord();
  },
  hideScreens: function () { ["title", "setup", "editor", "fr"].forEach(function (n) { $(n).classList.add("hidden"); }); UI.screen = "game"; },

  // ---- setup ----
  renderSetup: function () {
    var cards = $("cards"); cards.innerHTML = "";
    [["home", App.home, T("setup.home")], ["away", App.away, T("setup.away")]].forEach(function (pair, i) {
      var t = pair[1], card = el("div", "tcard");
      card.style.setProperty("--p", t.primary); card.style.setProperty("--s", t.secondary);
      var pv = makeCanvas(36, 18); UI.paintPreview(pv, t, i === 1);
      pv.className = "pv";
      var info = el("div", "tinfo", '<div class="side">' + esc(pair[2]) + '</div><div class="tn">' + esc(t.name) + '</div><div class="tm2">' + esc(t.mascot) + ' · ' + esc(T("setup.ovr", { n: teamOvr(t) })) + '</div>');
      var nav = el("div", "tnav"); var prev = el("button", "btn sm", "◀"), nxt = el("button", "btn sm", "▶"), ed = el("button", "btn sm sec", esc(T("setup.edit")));
      onTap(prev, function () { App.cycleTeam(pair[0], -1); }); onTap(nxt, function () { App.cycleTeam(pair[0], 1); });
      onTap(ed, function () { UI.openEditor(pair[0]); });
      nav.appendChild(prev); nav.appendChild(ed); nav.appendChild(nxt);
      card.appendChild(pv); card.appendChild(info); card.appendChild(nav); cards.appendChild(card);
      if (i === 0) cards.appendChild(el("div", "vs", "VS"));
    });
    var seg = $("segDiff"); seg.innerHTML = "";
    ["easy", "normal", "hard"].forEach(function (d) { var b = el("button", "btn sm" + (App.diff === d ? " on" : ""), esc(T("diff." + d)));
      onTap(b, function () { App.setDiff(d); UI.renderSetup(); }); seg.appendChild(b); });
    $("qVal").textContent = T("setup.min", { n: P("quarterMinutes") });
  },
  paintPreview: function (cv, team, away) {
    var c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height);
    var pal = teamColors(team, away), qb = (team.roster && team.roster[0]) || { skin: 1, num: 7 }, sp = buildPlayerSprites(pal, SKINS[qb.skin || 0], qb.num);
    c.drawImage(sp.down[0], 0, 1); c.drawImage(sp.up[0], 12, 1); c.drawImage(sp.side[1], 24, 1);
  },

  // ---- editor ----
  openEditor: function (which) { UI.edWhich = which; UI.edTab = UI.edTab || "team"; UI.edUnit = UI.edUnit || "O"; UI.show("editor"); UI.renderEditor(); },
  closeEditor: function () { if (UI.edWhich === "fr") { frSave(); R.fieldKey = ""; FUI.render(); UI.showRaw("fr"); return; } App.saveTeams(); UI.show("setup"); },
  renderEditor: function () {
    var isFr = UI.edWhich === "fr"; if (isFr) UI.edTab = "team"; $("tabRoster").style.display = isFr ? "none" : "";
    var t = isFr ? FR.teams[FR.user] : UI.edWhich === "home" ? App.home : App.away, away = UI.edWhich === "away", body = $("ebody");
    $("tabTeam").classList.toggle("on", UI.edTab === "team"); $("tabRoster").classList.toggle("on", UI.edTab === "roster");
    body.innerHTML = "";
    var head = el("div", "ehead"); var pv = makeCanvas(36, 18); pv.className = "pv big"; UI.paintPreview(pv, t, away); head.appendChild(pv);
    head.appendChild(el("div", "ehn", '<div class="tn">' + esc(t.name) + '</div><div class="tm2">' + esc(t.mascot) + (isFr ? "" : " · " + esc(T("setup.ovr", { n: teamOvr(t) }))) + "</div>"));
    body.appendChild(head);
    var refreshHead = function () { UI.paintPreview(pv, t, away); head.querySelector(".tn").textContent = t.name; head.querySelector(".tm2").textContent = t.mascot + (isFr ? "" : " · " + T("setup.ovr", { n: teamOvr(t) })); };
    if (UI.edTab === "team") {
      function field(label, key, max, upper) {
        var w = el("label", "fld", "<span>" + esc(label) + "</span>"), inp = el("input"); inp.type = "text"; inp.maxLength = max; inp.value = t[key];
        inp.setAttribute("data-ui", "1"); inp.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        inp.addEventListener("input", function () { var v = inp.value; if (upper) { v = v.toUpperCase().replace(/[^A-Z0-9]/g, ""); inp.value = v; } t[key] = v || t[key]; refreshHead(); });
        inp.addEventListener("keydown", function (e) { e.stopPropagation(); });
        w.appendChild(inp); body.appendChild(w);
      }
      field(T("edit.school"), "name", 16); field(T("edit.mascot"), "mascot", 14); field(T("edit.abbr"), "abbr", 4, true);
      function colorRow(label, key) {
        var w = el("div", "fld", "<span>" + esc(label) + "</span>"), sw = el("div", "swatches");
        COLOR_SWATCHES.forEach(function (hx) { var b = el("button", "sw" + (t[key].toLowerCase() === hx ? " on" : "")); b.style.background = hx;
          onTap(b, function () { t[key] = hx; UI.renderEditor(); }); sw.appendChild(b); });
        var ci = el("input"); ci.type = "color"; ci.value = t[key]; ci.className = "cpick"; ci.setAttribute("data-ui", "1");
        ci.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        ci.addEventListener("input", function () { t[key] = ci.value; refreshHead(); });
        ci.addEventListener("change", function () { UI.renderEditor(); });
        sw.appendChild(ci); w.appendChild(sw); body.appendChild(w);
      }
      colorRow(T("edit.primary"), "primary"); colorRow(T("edit.secondary"), "secondary");
      function choice(label, key, opts) {
        var w = el("div", "fld", "<span>" + esc(label) + "</span>"), sg = el("div", "seg");
        opts.forEach(function (o) { var b = el("button", "btn sm" + (t[key] === o[0] ? " on" : ""), esc(T(o[1]))); onTap(b, function () { t[key] = o[0]; UI.renderEditor(); }); sg.appendChild(b); });
        w.appendChild(sg); body.appendChild(w);
      }
      choice(T("edit.helmet"), "helmet", [["primary", "opt.primary"], ["secondary", "opt.secondary"], ["white", "opt.white"], ["black", "opt.black"]]);
      choice(T("edit.pants"), "pants", [["primary", "opt.primary"], ["secondary", "opt.secondary"], ["white", "opt.white"], ["black", "opt.black"]]);
      choice(T("edit.away"), "awayWhite", [[true, "opt.on"], [false, "opt.off"]]);
      var rr = el("div", "row2"); var rs = el("button", "btn sec", esc(T("edit.reset")));
      onTap(rs, function () { var fresh = makeTeam(t.school, App.seedFor(UI.edWhich)); for (var k in fresh) if (k !== "roster") t[k] = fresh[k]; UI.renderEditor(); });
      if (!isFr) { rr.appendChild(rs); body.appendChild(rr); }
    } else {
      var sub = el("div", "seg units");
      [["O", "edit.off"], ["D", "edit.def"], ["K", "edit.st"]].forEach(function (u) { var b = el("button", "btn sm" + (UI.edUnit === u[0] ? " on" : ""), esc(T(u[1])));
        onTap(b, function () { UI.edUnit = u[0]; UI.renderEditor(); }); sub.appendChild(b); });
      body.appendChild(sub);
      var list = el("div", "roster");
      t.roster.forEach(function (p, idx) {
        if (p.unit !== UI.edUnit) return;
        var row = el("div", "rrow");
        var top = el("div", "rtop"); top.appendChild(el("span", "rpos", esc(p.pos)));
        var num = el("input", "rnum"); num.type = "text"; num.inputMode = "numeric"; num.maxLength = 2; num.value = p.num; num.setAttribute("data-ui", "1");
        num.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); num.addEventListener("keydown", function (e) { e.stopPropagation(); });
        num.addEventListener("input", function () { num.value = num.value.replace(/[^0-9]/g, ""); if (num.value !== "") { p.num = Math.min(99, +num.value); refreshHead(); } });
        var nm = el("input", "rname"); nm.type = "text"; nm.maxLength = 18; nm.value = p.name; nm.setAttribute("data-ui", "1");
        nm.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); nm.addEventListener("keydown", function (e) { e.stopPropagation(); });
        nm.addEventListener("input", function () { p.name = nm.value || p.name; });
        top.appendChild(el("span", "hash", "#")); top.appendChild(num); top.appendChild(nm); row.appendChild(top);
        var bot = el("div", "rbot");
        var keys = p.unit === "K" ? [["pwr", "r.leg"], ["hnd", "r.acc"]] : [["spd", "r.spd"], ["pwr", "r.pwr"], ["hnd", "r.hnd"]];
        keys.forEach(function (k) { var st = el("div", "rst"); st.appendChild(el("span", "rl", esc(T(k[1]))));
          var mi = el("button", "btn xs", "−"), v = el("span", "rv", String(p[k[0]])), pl = el("button", "btn xs", "+");
          var bar = el("span", "rbar"); bar.style.setProperty("--v", p[k[0]] * 10 + "%");
          onTap(mi, function () { p[k[0]] = clampR(p[k[0]] - 1); v.textContent = p[k[0]]; bar.style.setProperty("--v", p[k[0]] * 10 + "%"); refreshHead(); });
          onTap(pl, function () { p[k[0]] = clampR(p[k[0]] + 1); v.textContent = p[k[0]]; bar.style.setProperty("--v", p[k[0]] * 10 + "%"); refreshHead(); });
          st.appendChild(mi); st.appendChild(v); st.appendChild(pl); st.appendChild(bar); bot.appendChild(st); });
        row.appendChild(bot); list.appendChild(row);
      });
      body.appendChild(list);
      var rr2 = el("div", "row2"); var rn = el("button", "btn sec", esc(T("edit.random")));
      onTap(rn, function () { var rng = mulberry32((Date.now() ^ 0x5bd1e995) >>> 0); t.roster.forEach(function (p) { p.name = nameFrom(rng); }); UI.renderEditor(); });
      rr2.appendChild(rn); body.appendChild(rr2);
    }
  },

  // ---- in-game ----
  startGameUI: function () { UI.hideScreens(); $("hud").classList.remove("hidden"); $("dock").classList.remove("hidden"); UI.endShown = false; $("end").classList.add("hidden"); UI.hud(); },
  hud: function () {
    if (!G) return;
    var h = G.home, a = G.away;
    $("hTm").style.background = h.primary; $("aTm").style.background = a.primary;
    $("hTm").style.color = lum(h.primary) > 150 ? "#101018" : "#fff"; $("aTm").style.color = lum(a.primary) > 150 ? "#101018" : "#fff";
    $("hAb").textContent = h.abbr; $("aAb").textContent = a.abbr; $("hSc").textContent = G.score.H; $("aSc").textContent = G.score.A;
    $("hTm").classList.toggle("poss", G.poss === "H"); $("aTm").classList.toggle("poss", G.poss === "A");
    var tos = G.tos || { H: 3, A: 3 }, tk = tos.H + "|" + tos.A;
    if (UI.toKey !== tk) { UI.toKey = tk; ["H", "A"].forEach(function (t) { $(t === "H" ? "hTo" : "aTo").innerHTML = [0, 1, 2].map(function (i) { return '<i class="' + (i < tos[t] ? "on" : "") + '"></i>'; }).join(""); }); }
    $("qtr").textContent = G.ot ? T("qot") : T("q" + Math.min(4, G.quarter));
    var m = Math.floor(G.clock / 60), sec = Math.floor(G.clock % 60); $("clock").textContent = G.ot ? "--:--" : m + ":" + (sec < 10 ? "0" : "") + sec;
    $("clock").classList.toggle("red", G.clock < 60 && !G.ot);
    var dd = "";
    if (G.phase === "playcall" || G.phase === "presnap" || G.phase === "lineup" || G.phase === "live" || G.phase === "dead") {
      var goalToGo = (100 - ydFromOwn(G.poss, G.los)) <= G.toGo;
      if (G.twoPt) dd = T("pat.two"); else dd = T("hud.down", { d: T("d" + G.down), g: goalToGo ? T("hud.goal") : G.toGo });
    }
    $("dd").textContent = dd; $("dd").style.display = dd ? "" : "none";
    var showPc = !G.bot && (G.phase === "playcall" || G.phase === "presnap" || G.phase === "lineup");
    var pc = Math.ceil(G.pclock || 0); $("pclk").textContent = showPc ? pc : ""; $("pclk").style.display = showPc ? "" : "none"; $("pclk").classList.toggle("low", pc <= 5);
    // controlled player name tag
    var c = (!G.bot && (G.phase === "presnap" || G.phase === "lineup" || G.phase === "live")) ? G.ctl : null, tag = $("tag");
    if (c && c.tm === "H") {
      if (UI.tagP !== c) { UI.tagP = c; var cv = $("tagCv"), cx = cv.getContext("2d"); cx.clearRect(0, 0, 24, 32); if (c.spr && c.spr.down) cx.drawImage(c.spr.down[0], 0, 0);
        $("tagN").textContent = "#" + c.r.num + " " + roleLabel(c.role); $("tagP").textContent = String(c.r.name || "").toUpperCase(); }
      tag.style.visibility = "visible";
    } else { tag.style.visibility = "hidden"; UI.tagP = null; }
  },
  onPhase: function (ph) {
    if (!G || G.attract) return;
    $("playcall").classList.add("hidden"); $("pat").classList.add("hidden"); $("meter").classList.add("hidden");
    if (ph === "playcall") {
      if (G.poss === "H" || !G.call || !G.call.special) UI.showPlaycall();
    }
    if (ph === "pat") UI.showPAT();
    if (ph === "kick" && G.kick && G.kick.team === "H" && !G.bot) { $("meter").classList.remove("hidden"); UI.hintOnce("kick"); }
    if (ph !== "presnap" && ph !== "lineup") UI.closeMenu();
    if (ph === "presnap" && G.poss === "A" && !G.bot) UI.hintOnce("pick", 3);
    if (ph === "presnap" && G.poss === "H" && !G.bot) UI.hintOnce("snap", 3);
    if (ph === "live") { var pl = G.play; if (G.poss === "H") UI.hintOnce(pl.off.type === "pass" ? "offense" : "run"); else UI.hintOnce("defense"); }
    if (ph === "final") setTimeout(function () {}, 0);
    UI.hud(); UI.dock();
  },
  hintOnce: function (k, n) { UI.hintSeen[k] = (UI.hintSeen[k] || 0) + 1; if (UI.hintSeen[k] <= (n || 2)) UI.hint(T("hint." + k)); },
  hint: function (txt) { if (UI.endShown) return; var h = $("hint"); h.textContent = txt; h.classList.add("show"); clearTimeout(UI.hintTO); UI.hintTO = setTimeout(function () { h.classList.remove("show"); }, 3600); },
  showPlaycall: function () {
    if (G.bot) return;
    var pc = $("playcall"); pc.innerHTML = ""; pc.classList.remove("hidden"); pc.classList.add("pcall");
    var off = G.poss === "H"; UI.pcIds = [];
    var top = el("div", "pctop");
    top.appendChild(el("span", "ptag " + (off ? "o" : "d"), esc(T(off ? "pc.offense" : "pc.defense"))));
    var goalTG = (100 - ydFromOwn(G.poss, G.los)) <= G.toGo; top.appendChild(el("span", "psit", esc((G.twoPt ? T("pat.two") : T("hud.down", { d: T("d" + G.down), g: goalTG ? T("hud.goal") : G.toGo })) + " · " + spotText())));
    var sp = el("span", "pspacer"); top.appendChild(sp);
    var to = el("button", "btn xs2 tob", esc(T("btn.to")) + " " + ((G.tos && G.tos.H) || 0)); if (!G.tos || G.tos.H <= 0) to.disabled = true;
    onTap(to, function () { if (callTimeout("H")) UI.showPlaycall(); }); top.appendChild(to);
    if (off) {
      var nh = el("button", "btn xs2" + (G.noHuddle ? " on" : ""), esc(T("pc.nohud"))); onTap(nh, function () { G.noHuddle = !G.noHuddle; UI.showPlaycall(); }); top.appendChild(nh);
      var fb = el("button", "btn xs2" + (UI.flip ? " on" : ""), "⇄ " + esc(T("pc.flip"))); onTap(fb, function () { UI.flip = !UI.flip; UI.showPlaycall(); }); top.appendChild(fb);
      var lateHalf = (G.quarter === 2 || G.quarter === 4) && G.clock < 40;
      if ((G.down === 4 || lateHalf) && !G.twoPt) {
        var distFG = Math.round(100 - ydFromOwn("H", G.los) + 17);
        if (!G.ot && G.down === 4) { var pb = el("button", "btn xs2 sec", esc(T("pc.punt"))); onTap(pb, function () { userCall("punt"); UI.closePanels(); }); top.appendChild(pb); }
        if (distFG <= 60) { var fg = el("button", "btn xs2 sec", esc(T("pc.fg", { n: distFG }))); onTap(fg, function () { userCall("fg"); UI.closePanels(); }); top.appendChild(fg); }
      }
    }
    pc.appendChild(top);
    var grid = el("div", "pcg" + (off ? "" : " def"));
    if (off) {
      var coach = coachPick(), cp = playById(coach);
      UI.form = UI.form || "gun";
      var tabs = el("div", "ftabs");
      FORM_ORDER.forEach(function (f) { var t = el("button", "ftab" + (UI.form === f ? " on" : ""), esc(FORM_NAMES[f])); onTap(t, function () { UI.form = f; UI.showPlaycall(); }); tabs.appendChild(t); });
      pc.appendChild(tabs);
      var add = function (p, isCoach) {
        var b = el("button", "pcard" + (isCoach ? " coach" : "")); var cv = makeCanvas(48, 30); cv.className = "pcv"; UI.drawPlayDiagram(cv, p, !!UI.flip);
        if (isCoach) b.appendChild(el("span", "ctag", esc(T("pc.coach"))));
        b.appendChild(cv); b.appendChild(el("span", "pn", esc(p.name))); if (isCoach) b.appendChild(el("span", "pf", esc(FORM_NAMES[p.form])));
        onTap(b, function () { userCall("off", p.id, UI.flip); UI.closePanels(); }); grid.appendChild(b); UI.pcIds.push(p.id);
      };
      add(cp, true);
      PLAYS.forEach(function (p) { if (p.form === UI.form) add(p, false); });
    } else {
      var saveR = G.rng; G.rng = mulberry32((G.drives * 97 + G.down * 13 + Math.round(G.los)) >>> 0); var cd = cpuDefenseCall(); G.rng = saveR;
      var addD = function (d, isCoach) { var b = el("button", "pcard" + (isCoach ? " coach" : "")); var cv = makeCanvas(48, 30); cv.className = "pcv"; UI.drawDefDiagram(cv, d);
        if (isCoach) b.appendChild(el("span", "ctag", esc(T("pc.coach"))));
        b.appendChild(cv); b.appendChild(el("span", "pn", esc(d.name))); onTap(b, function () { userCall("def", d.id); UI.closePanels(); }); grid.appendChild(b); UI.pcIds.push(d.id); };
      addD(defById(cd), true);
      DEFS.forEach(function (d) { addD(d, false); });
    }
    pc.appendChild(grid);
    UI.hintOnce("playcall");
    UI.dock();
  },
  closePanels: function () { $("playcall").classList.add("hidden"); $("pat").classList.add("hidden"); UI.closeMenu(); },
  closeMenu: function () { var m = $("menu"); if (m) { m.classList.add("hidden"); m.innerHTML = ""; } UI.menuOpen = false; },
  openMenu: function (title, build) { var m = $("menu"); m.innerHTML = ""; m.classList.remove("hidden"); UI.menuOpen = true;
    var hd = el("div", "mtop"); hd.appendChild(el("span", "mtt", esc(title))); var x = el("button", "btn xs2 sec", esc(T("pc.close"))); onTap(x, function () { UI.closeMenu(); }); hd.appendChild(x); m.appendChild(hd);
    var body = el("div", "mbody"); m.appendChild(body); build(body); },
  hotMenu: function () {
    UI.openMenu(T("pc.hotPick"), function (body) {
      RECV_KEYS.forEach(function (k) { var r = byRole("H", k.role); if (!r) return;
        var b = el("button", "btn mk", '<b class="rnum">' + k.key + '</b> ' + esc(roleLabel(k.role)) + " · " + esc((routeName(k.role) || "block").toUpperCase()));
        onTap(b, function () { UI.openMenu(T("pc.hotRoute") + " " + k.key, function (b2) {
          HOT_ROUTES.forEach(function (rt) { var x = el("button", "btn mk" + (routeName(k.role) === rt ? " on" : ""), esc(rt.toUpperCase())); onTap(x, function () { setHot(k.role, rt); UI.closeMenu(); }); b2.appendChild(x); }); }); });
        body.appendChild(b); });
    });
  },
  audMenu: function () {
    if (G.poss === "H") {
      var cur = G.play && G.play.off; if (!cur) return;
      UI.openMenu(T("btn.aud") + " · " + FORM_NAMES[cur.form], function (body) {
        PLAYS.forEach(function (p) { if (p.form !== cur.form || p.id === cur.id) return;
          var b = el("button", "pcard sm"); var cv = makeCanvas(48, 30); cv.className = "pcv"; UI.drawPlayDiagram(cv, p, !!G.call.flip); b.appendChild(cv); b.appendChild(el("span", "pn", esc(p.name)));
          onTap(b, function () { UI.closeMenu(); userAudible(p.id); }); body.appendChild(b); });
        var f = el("button", "btn mk", "⇄ " + esc(T("pc.flip"))); onTap(f, function () { G.call.flip = !G.call.flip; UI.closeMenu(); userAudible(cur.id); }); body.appendChild(f);
      });
    } else {
      UI.openMenu(T("btn.aud"), function (body) {
        DEF_AUDIBLES.forEach(function (id) { var d = defById(id); var b = el("button", "btn mk" + (G.call.def === id ? " on" : ""), esc(d.name)); onTap(b, function () { UI.closeMenu(); userDefAudible(id); }); body.appendChild(b); });
      });
    }
  },
  drawPlayDiagram: function (cv, p, flip) {
    var W = cv.width, H = cv.height, c = cv.getContext("2d"); c.fillStyle = "#1d5c26"; c.fillRect(0, 0, W, H); c.fillStyle = "#3a8a44"; c.fillRect(0, H - 11, W, 1);
    var f = FORMS[p.form], fl = flip ? -1 : 1, sx = function (x) { return Math.round(W / 2 + x * fl * 1.25); }, sy = function (d) { return Math.round(H - 11 + d * 1.3); };
    var pos = {}; ROLE_O.forEach(function (r) { var q = f[r] || OL_X[r]; pos[r] = [q[0], q[1]]; });
    var carrier = p.run ? (p.run.carrier === "QB" ? "QB" : "RB") : null;
    Object.keys(p.routes).forEach(function (r) { var rt = ROUTES[p.routes[r]]; if (!rt || !pos[r]) return; var x0 = pos[r][0], y0 = pos[r][1];
      if (p.type === "run" && !p.pa && r === carrier) return;
      c.fillStyle = p.type === "run" ? "#c9b45a" : "#ffd23f";
      var inw = x0 < 0 ? 1 : -1; if (Math.abs(x0) < 0.5) inw = -1; var px = sx(x0), py = sy(y0);
      rt.forEach(function (w) { var nx = sx(x0 + inw * w[0] * 0.7), ny = Math.max(1, sy(y0 - w[1] * 0.5)); UI.line(c, px, py, nx, ny); px = nx; py = ny; }); });
    if (p.run && !p.pa) { c.fillStyle = "#ff8a3a"; var cx0 = pos[carrier][0], cy0 = pos[carrier][1], ax = p.run.aim;
      if (p.run.counter) { UI.line(c, sx(cx0), sy(cy0), sx(-ax * 0.6), sy(cy0 - 0.5)); cx0 = -ax * 0.6; cy0 -= 0.5; }
      UI.line(c, sx(cx0), sy(cy0), sx(ax), sy(-1)); UI.line(c, sx(ax), sy(-1), sx(ax + (ax > 6 ? 2 : 0)), sy(-8)); }
    if (p.pa) { c.fillStyle = "#ff8a3a"; c.fillRect(sx(p.run.aim * 0.4), sy(2.4), 2, 1); }
    ROLE_O.forEach(function (r) { c.fillStyle = r === "QB" ? "#fff" : r === carrier ? "#ff8a3a" : /^(LT|LG|C|RG|RT)$/.test(r) ? "#9aa4c8" : "#e8e8e8"; c.fillRect(sx(pos[r][0]) - 1, sy(pos[r][1]) - 1, 2, 2); });
  },
  drawDefDiagram: function (cv, d) {
    var W = cv.width, H = cv.height, c = cv.getContext("2d"); c.fillStyle = "#1d5c26"; c.fillRect(0, 0, W, H); c.fillStyle = "#3a8a44"; c.fillRect(0, H - 6, W, 1);
    var pos = { DE1: [-5, 1], DT1: [-1.5, 1], DT2: [1.5, 1], DE2: [5, 1], LB1: [-6, 5], LB2: [0, 5], LB3: [6, 5], CB1: [-15, 6], CB2: [15, 6], FS: [-6, 12], SS: [6, 11] };
    if (d.box) { pos.LB1[1] = 3; pos.LB3[1] = 3; pos.SS = [3, 4.5]; pos.FS = [-3, 7]; } if (d.press) { pos.CB1[1] = 2; pos.CB2[1] = 2; }
    var sx = function (x) { return Math.round(W / 2 + x * 1.35); }, sy = function (y) { return Math.round(H - 6 - y * 1.55); };
    Object.keys(d.a).forEach(function (r) { var a = d.a[r], p0 = pos[r];
      if (a === "rush") { c.fillStyle = "#ff4a3a"; UI.line(c, sx(p0[0]), sy(p0[1]), sx(p0[0] * 0.3), Math.min(H - 1, sy(-3))); }
      else if (a.indexOf("zone:") === 0) { var z = ZONES[a.slice(5)]; var zy = Math.max(2, sy(z[1] * 0.62)); c.fillStyle = /deep|d3/.test(a) ? "rgba(90,140,255,0.85)" : "rgba(255,220,90,0.8)"; c.fillRect(sx(z[0]) - 2, zy - 1, 5, 3); c.fillStyle = "#8ac8ff"; UI.line(c, sx(p0[0]), sy(p0[1]), sx(z[0]), zy); }
      else if (a.indexOf("man:") === 0) { c.fillStyle = "#c58aff"; c.fillRect(sx(p0[0]) - 1, sy(p0[1]) + 2, 3, 1); }
      else if (a === "read") { c.fillStyle = "#ffd23f"; UI.line(c, sx(p0[0]), sy(p0[1]), sx(p0[0]), sy(1.5)); } });
    Object.keys(pos).forEach(function (r) { c.fillStyle = "#e8e8e8"; c.fillRect(sx(pos[r][0]) - 1, sy(pos[r][1]) - 1, 2, 2); });
  },
  line: function (c, x0, y0, x1, y1) { var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, n = 0;
    while (n++ < 200) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } } },
  showPAT: function () {
    if (G.bot) return;
    var p = $("pat"); p.innerHTML = ""; p.classList.remove("hidden");
    p.appendChild(el("div", "pct", esc(T("pat.title"))));
    var row = el("div", "pcr"); var k = el("button", "btn big pri", esc(T("pat.kick"))), two = el("button", "btn big sec", esc(T("pat.two")));
    onTap(k, function () { UI.closePanels(); userPAT("kick"); }); onTap(two, function () { UI.closePanels(); userPAT("two"); });
    row.appendChild(k); row.appendChild(two); p.appendChild(row);
  },
  dock: function () {
    var L = $("dockL"), Rr = $("dockR"); if (!G || G.attract) return;
    var key = (G.phase === "lineup" ? "presnap" : G.phase) + "|" + G.poss + "|" + (G.tos ? G.tos.H : 0) + "|" + (G.play ? (G.play.thrown ? 1 : 0) + (G.play.carrier ? 1 : 0) + (G.play.crossed ? 1 : 0) + (G.play.carrier && G.play.carrier.tm) + (G.play.off && G.play.off.type) : "");
    if (UI.dockKey === key) return; UI.dockKey = key; L.innerHTML = ""; Rr.innerHTML = ""; App.inp.sprintHeld = false;
    if (G.bot) return;
    var rb = function (cls, txt, fn, parent) { var b = el("button", "rb " + cls, txt); onTap(b, fn); (parent || Rr).appendChild(b); return b; };
    var sprint = function (parent) { var b = el("button", "rb blue", esc(T("btn.sprint")));
      var on = function (e) { e.preventDefault(); e.stopPropagation(); App.inp.sprintHeld = true; b.classList.add("down"); }, off = function () { App.inp.sprintHeld = false; b.classList.remove("down"); };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off); (parent || Rr).appendChild(b); };
    var toBtn = function () { var b = rb("yel sm", esc(T("btn.to")) + "<small>" + ((G.tos && G.tos.H) || 0) + "</small>", function () { callTimeout("H"); UI.dockKey = ""; }); if (!G.tos || G.tos.H <= 0) b.disabled = true; };
    if ((G.phase === "presnap" || G.phase === "lineup") && G.play) {
      if (G.poss === "H") {
        var col = el("div", "rcol"); Rr.appendChild(col);
        toBtn(); rb("red sm", esc(T("btn.aud")), function () { UI.audMenu(); }); rb("blue sm", esc(T("btn.hot")), function () { UI.hotMenu(); });
        rb("green big", esc(T("btn.snap")), function () { UI.closeMenu(); requestSnap(); });
      } else {
        toBtn(); rb("red sm", esc(T("btn.aud")), function () { UI.audMenu(); }); rb("gray", esc(T("btn.switch")), function () { cycleDefender(); });
      }
      return;
    }
    if (G.phase !== "live") return;
    var pl = G.play;
    var userHasBall = pl.carrier && pl.carrier.tm === "H";
    if (G.poss === "H" && pl.off.type === "pass" && !pl.thrown && !pl.crossed && !pl.possChanged) {
      var grid = el("div", "rgrid"); Rr.appendChild(grid);
      RECV_KEYS.forEach(function (k) { var r = byRole("H", k.role); if (!r || r.assign !== "route") return;
        var b = el("button", "rb rk", k.key); b.id = "rk" + k.key; onTap(b, function () { App.inp.throwTo = k.role; }); grid.appendChild(b); });
      sprint(L);
    } else if (userHasBall) {
      sprint(L); rb("red", esc(T("btn.juke")), function () { App.inp.juke = true; });
    } else if ((pl.carrier && pl.carrier.tm === "A") || (G.poss === "A" && !pl.possChanged)) {
      sprint(L); rb("gray", esc(T("btn.switch")), function () { App.inp.sw = true; }); rb("red", esc(T("btn.dive")), function () { App.inp.dive = true; });
    }
  },
  tick: function (dt) {
    if (!G || G.attract) return;
    UI.hud(); UI.dock();
    if (G.phase === "live" && G.poss === "H" && G.play && !G.play.thrown) {
      RECV_KEYS.forEach(function (k) { var b = $("rk" + k.key); if (!b) return; var r = byRole("H", k.role); var o = openness(r, "A");
        b.className = "rb rk " + (o > 2.6 ? "open" : o > 1.4 ? "mid" : "cov"); });
    }
    if (G.phase === "kick" && G.kick && !G.kick.flying && G.kick.team === "H") {
      var k = G.kick; $("mwin").style.left = (50 - k.win * 100) + "%"; $("mwin").style.width = (k.win * 200) + "%";
      $("mneedle").style.left = (k.needle * 100) + "%"; $("mbar").classList.toggle("far", k.dist > k.range);
    } else if (!$("meter").classList.contains("hidden") && G.kick && G.kick.flying) $("meter").classList.add("hidden");
    // banners
    if (UI.bannerT > 0) { UI.bannerT -= dt; if (UI.bannerT <= 0) { $("banner").classList.remove("show"); UI.nextBanner(); } }
    if (G.phase === "final" && G.finalT > 2.6 && !UI.endShown) App.showEnd();
  },
  banner: function (key, vars, big, col) { if (!G || G.attract) return; UI.bannerQ.push({ txt: T(key, vars), big: big, col: col }); if (UI.bannerT <= 0) UI.nextBanner(); },
  nextBanner: function () { var b = UI.bannerQ.shift(); if (!b) return; var e = $("banner"); e.textContent = b.txt; e.className = (b.big ? "big " : "") + "show"; e.style.color = b.col || "#fff"; UI.bannerT = b.big ? 1.5 : 1.0;
    void e.offsetWidth; },
  ticker: function (pl) {
    var c = pl.endCarrier, k = pl.result, t = $("ticker"); if (!t) return;
    var nm = function (p) { return "#" + p.r.num + " " + String(p.r.name).toUpperCase(); };
    var gain = c && k !== "inc" ? Math.round((c.y - pl.startLos) * dirOf(pl.startPoss)) : 0, txt = "";
    if (k === "inc" && pl.intended) txt = nm(pl.qb) + " → " + nm(pl.intended) + " · " + T("b.inc");
    else if (k === "sack") txt = (pl.tackler ? nm(pl.tackler) + " · " : "") + T("b.sack");
    else if (c && pl.possChanged) txt = nm(c) + " · " + T("b.int");
    else if (c) { txt = (pl.completion ? nm(pl.qb) + " → " : "") + nm(c) + " · " + (k === "td" ? T("b.td") : (gain >= 0 ? "+" : "") + gain);
      if (pl.tackler && k !== "td") txt += "  ✕ " + nm(pl.tackler); }
    t.textContent = txt; t.style.borderColor = (pl.startPoss === "H" ? G.home : G.away).primary; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
    clearTimeout(UI.tickTO); UI.tickTO = setTimeout(function () { t.classList.remove("show"); }, 3800);
  },
  showEnd: function (refresh) {
    UI.endShown = true; var e = $("end"); e.classList.remove("hidden"); $("hud").classList.add("hidden"); $("dock").classList.add("hidden");
    $("playcall").classList.add("hidden"); $("hint").classList.remove("show"); $("banner").classList.remove("show"); $("ticker").classList.remove("show");
    var o = G.outcome, h = G.home, a = G.away;
    var title = o === "win" ? T("end.win.title") : o === "tie" ? T("end.tie.title") : o === "timeout" ? T("end.timeout.title") : (G.score.A - G.score.H <= 8 ? T("end.lose.title") : T("end.lose.titleFar"));
    var nextT = App.peekNext();
    var sub = o === "win" ? T("end.win.sub", { team: h.name, score: G.score.H + "–" + G.score.A, next: nextT.name }) : o === "tie" ? T("end.tie.sub") : o === "timeout" ? T("end.timeout.sub") :
      (G.passFail > G.runFail ? T("end.lose.sub") : T("end.lose.sub.run"));
    if (App.frCtx) sub = o === "win" ? T("end.fr.win", { team: h.name, score: G.score.H + "–" + G.score.A }) : T("end.fr.lose", { opp: a.name, score: G.score.A + "–" + G.score.H });
    if (P("endTitle")) title = P("endTitle"); if (P("endSub")) sub = P("endSub");
    $("eTitle").textContent = title; $("eSub").textContent = sub;
    $("eScore").innerHTML = '<span style="color:' + esc(h.primary) + '">■</span> ' + esc(h.abbr) + " " + G.score.H + "  –  " + G.score.A + " " + esc(a.abbr) + ' <span style="color:' + esc(a.primary) + '">■</span>';
    var mvp = App.mvp(); $("eMvp").textContent = mvp ? T("end.mvp", { num: mvp.r.num, name: mvp.r.name, yds: mvp.yds }) : "";
    var s = App.save; $("eRec").textContent = App.frCtx ? "" : T("end.record", { w: s.w, l: s.l, t: s.t });
    $("eName").textContent = CONFIG.meta.title; var ic = document.querySelector('link[rel="icon"]'); if (ic) $("eIcon").src = ic.href;
    $("eNext").textContent = P("ctaText") || T("ui.next"); $("eReplay").textContent = o === "win" ? T("ui.playAgain") : T("ui.replay"); $("eTitleB").textContent = T("ui.title");
    $("eNext").className = "btn big " + (o === "win" ? "pri" : "sec2"); $("eReplay").className = "btn " + (o === "win" ? "sec" : "pri big");
    if (App.frCtx) { $("eNext").textContent = T("fr.continue"); $("eNext").className = "btn big pri"; $("eReplay").classList.add("hidden"); $("eTitleB").classList.add("hidden"); }
    else { $("eReplay").classList.remove("hidden"); $("eTitleB").classList.remove("hidden"); }
    if (!refresh) { e.classList.remove("in"); void e.offsetWidth; e.classList.add("in"); UI.endLock = performance.now() + 900; }
  }
};
function roleLabel(role) { if (/^(LT|LG|C|RG|RT)$/.test(role)) return role; return role.replace(/[0-9]/g, ""); }
function cycleDefender() { var order = ["LB2", "LB1", "LB3", "SS", "FS", "CB1", "CB2", "DE1", "DT1", "DT2", "DE2"], i = G.ctl ? order.indexOf(G.ctl.role) : -1;
  selectDefender(byRole("H", order[(i + 1) % order.length])); }
function spotText() {
  var yd = Math.round(ydFromOwn(G.poss, G.los));
  if (yd === 50) return T("hud.mid"); return yd < 50 ? T("hud.own", { n: yd }) : T("hud.opp", { n: 100 - yd });
}
