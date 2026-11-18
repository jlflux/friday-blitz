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
      '<div class="tbtns"><button class="btn big pri" id="bPlay"></button><div class="rec" id="tRec"></div></div><div class="langs" id="langs"></div></div>',
      '<div id="setup" class="scr hidden"><div class="ph" id="sTitle"></div><div id="cards"></div>',
      '<div class="opt"><div class="ol" id="lDiff"></div><div class="seg" id="segDiff"></div></div>',
      '<div class="opt"><div class="ol" id="lQtr"></div><div class="stepper"><button class="btn sm" id="qMinus">-</button><span id="qVal"></span><button class="btn sm" id="qPlus">+</button></div></div>',
      '<div class="row2"><button class="btn sec" id="bBack"></button><button class="btn big pri" id="bKick"></button></div></div>',
      '<div id="editor" class="scr hidden"><div class="etabs"><button class="tab" id="tabTeam"></button><button class="tab" id="tabRoster"></button><button class="btn pri sm" id="bDone"></button></div><div id="ebody"></div></div>',
      '<div id="hud" class="hidden"><button class="btn icon" id="bPause" data-cover="1">II</button><div id="board"><div class="tm" id="hTm"><span class="ab" id="hAb"></span><span class="sc" data-hud="home" id="hSc">0</span></div>',
      '<div class="clk"><div id="qtr"></div><div id="clock" data-hud="clock"></div></div><div class="tm" id="aTm"><span class="sc" data-hud="away" id="aSc">0</span><span class="ab" id="aAb"></span></div></div>',
      '<button class="btn icon" id="bMute">&#9835;</button><div id="dd" data-goal="1"></div></div>',
      '<div id="banner" data-cover="1"></div><div id="hint" data-cover="1"></div><div id="ticker" data-cover="1"></div>',
      '<div id="dock" class="hidden"><div id="dockL"></div><div id="dockR"></div></div>',
      '<div id="joy" class="hidden"><div id="knob"></div></div>',
      '<div id="playcall" class="panel hidden"></div><div id="pat" class="panel hidden"></div>',
      '<div id="meter" class="hidden"><div class="mt" id="mTitle"></div><div id="mbar"><div id="mwin"></div><div id="mneedle"></div></div><div class="mh" id="mHint"></div></div>',
      '<div id="pause" class="scr dim hidden"><div class="ph" id="pTitle"></div><button class="btn big pri" id="pRes"></button><button class="btn sec" id="pRst"></button><button class="btn sec" id="pQuit"></button></div>',
      '<div id="end" class="hidden"><div class="dim2"></div><div class="rays"></div><div class="ecwrap"><div class="ec-copy-panel" data-end-copy-panel="1"><div class="eid" data-end-id="1"><img id="eIcon" alt=""><span id="eName"></span></div>',
      '<div class="et" id="eTitle"></div><div class="escore" id="eScore" data-hud="final"></div><div class="es" id="eSub"></div><div class="emvp" id="eMvp"></div><div class="erec" id="eRec"></div></div>',
      '<div class="eact"><button class="btn big" id="eNext"></button><button class="btn sec" id="eReplay"></button><button class="btn sm ghost" id="eTitleB"></button></div></div></div>',
      '<div id="tune" class="hidden"></div>'
    ].join("");
    onTap($("bPlay"), function () { musicStart(); UI.show("setup"); });
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
    onTap($("pQuit"), function () { App.pause(false); App.toTitle(); });
    onTap($("eNext"), function () { App.next(); });
    onTap($("eReplay"), function () { App.startGame(); });
    onTap($("eTitleB"), function () { App.toTitle(); });
    UI.drawLogo(); UI.applyLang();
  },
  applyLang: function () {
    document.documentElement.lang = LANG; document.body.classList.toggle("cjk", LANG === "zh");
    $("tTag").textContent = T("title.tag"); $("bPlay").textContent = T("ui.play");
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
  show: function (name) {
    ["title", "setup", "editor"].forEach(function (n) { $(n).classList.toggle("hidden", n !== name); });
    UI.screen = name; if (name === "setup") UI.renderSetup(); if (name === "title") UI.renderRecord();
  },
  hideScreens: function () { ["title", "setup", "editor"].forEach(function (n) { $(n).classList.add("hidden"); }); UI.screen = "game"; },

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
    var pal = teamColors(team, away), qb = team.roster[0], sp = buildPlayerSprites(pal, SKINS[qb.skin || 0], qb.num);
    c.drawImage(sp.down[0], 0, 1); c.drawImage(sp.up[0], 12, 1); c.drawImage(sp.side[1], 24, 1);
  },

  // ---- editor ----
  openEditor: function (which) { UI.edWhich = which; UI.edTab = UI.edTab || "team"; UI.edUnit = UI.edUnit || "O"; UI.show("editor"); UI.renderEditor(); },
  closeEditor: function () { App.saveTeams(); UI.show("setup"); },
  renderEditor: function () {
    var t = UI.edWhich === "home" ? App.home : App.away, away = UI.edWhich === "away", body = $("ebody");
    $("tabTeam").classList.toggle("on", UI.edTab === "team"); $("tabRoster").classList.toggle("on", UI.edTab === "roster");
    body.innerHTML = "";
    var head = el("div", "ehead"); var pv = makeCanvas(36, 18); pv.className = "pv big"; UI.paintPreview(pv, t, away); head.appendChild(pv);
    head.appendChild(el("div", "ehn", '<div class="tn">' + esc(t.name) + '</div><div class="tm2">' + esc(t.mascot) + " · " + esc(T("setup.ovr", { n: teamOvr(t) })) + "</div>"));
    body.appendChild(head);
    var refreshHead = function () { UI.paintPreview(pv, t, away); head.querySelector(".tn").textContent = t.name; head.querySelector(".tm2").textContent = t.mascot + " · " + T("setup.ovr", { n: teamOvr(t) }); };
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
      rr.appendChild(rs); body.appendChild(rr);
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
    $("qtr").textContent = G.ot ? T("qot") : T("q" + Math.min(4, G.quarter));
    var m = Math.floor(G.clock / 60), s = Math.floor(G.clock % 60); $("clock").textContent = G.ot ? "--:--" : m + ":" + (s < 10 ? "0" : "") + s;
    $("clock").classList.toggle("red", G.half === 2);
    var dd = "";
    if (G.phase === "playcall" || G.phase === "presnap" || G.phase === "live" || G.phase === "dead") {
      var goalToGo = (100 - ydFromOwn(G.poss, G.los)) <= G.toGo;
      if (G.twoPt) dd = T("pat.two"); else dd = T("hud.down", { d: T("d" + G.down), g: goalToGo ? T("hud.goal") : G.toGo }) + " · " + spotText();
    }
    $("dd").textContent = dd; $("dd").style.visibility = dd ? "visible" : "hidden";
  },
  onPhase: function (ph) {
    if (!G || G.attract) return;
    $("playcall").classList.add("hidden"); $("pat").classList.add("hidden"); $("meter").classList.add("hidden");
    if (ph === "playcall") {
      if (G.poss === "H" || !G.call || !G.call.special) UI.showPlaycall();
    }
    if (ph === "pat") UI.showPAT();
    if (ph === "kick" && G.kick && G.kick.team === "H" && !G.bot) { $("meter").classList.remove("hidden"); UI.hintOnce("kick"); }
    if (ph === "live") { var pl = G.play; if (G.poss === "H") UI.hintOnce(pl.off.type === "pass" ? "offense" : "run"); else UI.hintOnce("defense"); }
    if (ph === "final") setTimeout(function () {}, 0);
    UI.hud(); UI.dock();
  },
  hintOnce: function (k) { UI.hintSeen[k] = (UI.hintSeen[k] || 0) + 1; if (UI.hintSeen[k] <= 2) UI.hint(T("hint." + k)); },
  hint: function (txt) { if (UI.endShown) return; var h = $("hint"); h.textContent = txt; h.classList.add("show"); clearTimeout(UI.hintTO); UI.hintTO = setTimeout(function () { h.classList.remove("show"); }, 3600); },
  showPlaycall: function () {
    if (G.bot) return;
    var pc = $("playcall"); pc.innerHTML = ""; pc.classList.remove("hidden");
    var off = G.poss === "H";
    pc.appendChild(el("div", "pct", esc(T(off ? "pc.offense" : "pc.defense"))));
    var sit = el("div", "pcs", esc($("dd").textContent)); pc.appendChild(sit);
    var grid = el("div", "pcg" + (off ? "" : " def"));
    if (off) {
      var flip = !!UI.flip;
      PLAYS.forEach(function (p) {
        var b = el("button", "pcard"); var cv = makeCanvas(40, 26); cv.className = "pcv"; UI.drawPlayDiagram(cv, p, flip);
        b.appendChild(cv); b.appendChild(el("span", "", esc(T("play." + p.id)))); onTap(b, function () { userCall("off", p.id, UI.flip); UI.closePanels(); }); grid.appendChild(b); });
      pc.appendChild(grid);
      var row = el("div", "pcr"); var fb = el("button", "btn sm" + (flip ? " on" : ""), "⇄ " + esc(T("pc.flip")));
      onTap(fb, function () { UI.flip = !UI.flip; UI.showPlaycall(); }); row.appendChild(fb);
      if (G.down === 4 && !G.twoPt) {
        var distFG = Math.round(100 - ydFromOwn("H", G.los) + 17);
        if (!G.ot) { var pb = el("button", "btn sm sec", esc(T("pc.punt"))); onTap(pb, function () { userCall("punt"); UI.closePanels(); }); row.appendChild(pb); }
        if (distFG <= 60) { var fg = el("button", "btn sm sec", esc(T("pc.fg", { n: distFG }))); onTap(fg, function () { userCall("fg"); UI.closePanels(); }); row.appendChild(fg); }
      }
      pc.appendChild(row);
    } else {
      DEFS.forEach(function (d) { var b = el("button", "pcard"); var cv = makeCanvas(40, 26); cv.className = "pcv"; UI.drawDefDiagram(cv, d);
        b.appendChild(cv); b.appendChild(el("span", "", esc(T("def." + d.id)))); onTap(b, function () { userCall("def", d.id); UI.closePanels(); }); grid.appendChild(b); });
      pc.appendChild(grid);
    }
    UI.hintOnce("playcall");
    UI.dock();
  },
  closePanels: function () { $("playcall").classList.add("hidden"); $("pat").classList.add("hidden"); },
  drawPlayDiagram: function (cv, p, flip) {
    var c = cv.getContext("2d"); c.fillStyle = "#1d5c26"; c.fillRect(0, 0, 40, 26); c.fillStyle = "#3a8a44"; c.fillRect(0, 16, 40, 1);
    var f = FORMS[p.form], sx = function (x) { return Math.round(20 + x * (flip ? -1 : 1) * 1.1); }, sy = function (d) { return Math.round(16 + d * 1.4); };
    var pos = {}; ROLE_O.forEach(function (r) { var x = f[r][0]; if (r === "WR1") x = -15; if (r === "WR2") x = 14; if (r === "WR3" && p.form === "gun") x = -8; pos[r] = [x, f[r][1]]; });
    c.fillStyle = "#ffd23f";
    Object.keys(p.routes).forEach(function (r) { var rt = ROUTES[p.routes[r]]; if (!rt) return; var x0 = pos[r][0], y0 = pos[r][1];
      var inw = x0 < 0 ? 1 : -1; if (Math.abs(x0) < 0.5) inw = -1; var px = sx(x0), py = sy(y0);
      rt.forEach(function (w) { var nx = sx(x0 + inw * w[0] * 0.6), ny = sy(y0 - w[1] * 0.45); UI.line(c, px, py, nx, ny); px = nx; py = ny; }); });
    if (p.type === "run") { c.fillStyle = "#ff8a3a"; UI.line(c, sx(0), sy(pos.RB[1]), sx(p.aim), sy(-2)); UI.line(c, sx(p.aim), sy(-2), sx(p.aim), sy(-7)); }
    ROLE_O.forEach(function (r) { c.fillStyle = r === "QB" ? "#fff" : r === "RB" ? "#ff8a3a" : "#e8e8e8"; c.fillRect(sx(pos[r][0]) - 1, sy(pos[r][1]) - 1, 2, 2); });
  },
  drawDefDiagram: function (cv, d) {
    var c = cv.getContext("2d"); c.fillStyle = "#1d5c26"; c.fillRect(0, 0, 40, 26); c.fillStyle = "#3a8a44"; c.fillRect(0, 20, 40, 1);
    var pos = { DE1: [-5, 1], DT1: [-1.5, 1], DT2: [1.5, 1], DE2: [5, 1], LB1: [-6, 5], LB2: [0, 5], LB3: [6, 5], CB1: [-15, 6], CB2: [14, 6], FS: [-6, 12], SS: [6, 11] };
    var sx = function (x) { return Math.round(20 + x * 1.1); }, sy = function (y) { return Math.round(20 - y * 1.4); };
    Object.keys(d.a).forEach(function (r) { var a = d.a[r], p0 = pos[r];
      if (a === "rush") { c.fillStyle = "#ff4a3a"; UI.line(c, sx(p0[0]), sy(p0[1]), sx(p0[0] * 0.3), sy(-3)); }
      else if (a.indexOf("zone:") === 0) { var z = ZONES[a.slice(5)]; c.fillStyle = "rgba(90,170,255,0.8)"; c.fillRect(sx(z[0]) - 2, sy(z[1] * 0.7) - 1, 5, 3); c.fillStyle = "#8ac8ff"; UI.line(c, sx(p0[0]), sy(p0[1]), sx(z[0]), sy(z[1] * 0.7)); }
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
    var key = G.phase + "|" + G.poss + "|" + (G.play ? (G.play.thrown ? 1 : 0) + (G.play.carrier ? 1 : 0) + (G.play.crossed ? 1 : 0) + (G.play.carrier && G.play.carrier.tm) : "");
    if (UI.dockKey === key) return; UI.dockKey = key; L.innerHTML = ""; Rr.innerHTML = "";
    if (G.phase !== "live" || G.bot) return;
    var pl = G.play;
    var userHasBall = pl.carrier && pl.carrier.tm === "H";
    if (G.poss === "H" && pl.off.type === "pass" && !pl.thrown && !pl.crossed && !pl.possChanged) {
      RECV_KEYS.forEach(function (k) { var r = byRole("H", k.role); if (!r || r.assign !== "route") return;
        var b = el("button", "btn rk", k.key); b.id = "rk" + k.key; onTap(b, function () { App.inp.throwTo = k.role; }); L.appendChild(b); });
    } else if (userHasBall) {
      var j = el("button", "btn act", esc(T("btn.juke"))); onTap(j, function () { App.inp.juke = true; }); Rr.appendChild(j);
    } else if ((pl.carrier && pl.carrier.tm === "A") || (G.poss === "A" && !pl.possChanged)) {
      var s = el("button", "btn act sec", esc(T("btn.switch"))); onTap(s, function () { App.inp.sw = true; }); L.appendChild(s);
      var d = el("button", "btn act", esc(T("btn.dive"))); onTap(d, function () { App.inp.dive = true; }); Rr.appendChild(d);
    }
  },
  tick: function (dt) {
    if (!G || G.attract) return;
    UI.hud(); UI.dock();
    if (G.phase === "live" && G.poss === "H" && G.play && !G.play.thrown) {
      RECV_KEYS.forEach(function (k) { var b = $("rk" + k.key); if (!b) return; var r = byRole("H", k.role); var o = openness(r, "A");
        b.className = "btn rk " + (o > 2.6 ? "open" : o > 1.4 ? "mid" : "cov"); });
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
    if (P("endTitle")) title = P("endTitle"); if (P("endSub")) sub = P("endSub");
    $("eTitle").textContent = title; $("eSub").textContent = sub;
    $("eScore").innerHTML = '<span style="color:' + esc(h.primary) + '">■</span> ' + esc(h.abbr) + " " + G.score.H + "  –  " + G.score.A + " " + esc(a.abbr) + ' <span style="color:' + esc(a.primary) + '">■</span>';
    var mvp = App.mvp(); $("eMvp").textContent = mvp ? T("end.mvp", { num: mvp.r.num, name: mvp.r.name, yds: mvp.yds }) : "";
    var s = App.save; $("eRec").textContent = T("end.record", { w: s.w, l: s.l, t: s.t });
    $("eName").textContent = CONFIG.meta.title; var ic = document.querySelector('link[rel="icon"]'); if (ic) $("eIcon").src = ic.href;
    $("eNext").textContent = P("ctaText") || T("ui.next"); $("eReplay").textContent = o === "win" ? T("ui.playAgain") : T("ui.replay"); $("eTitleB").textContent = T("ui.title");
    $("eNext").className = "btn big " + (o === "win" ? "pri" : "sec2"); $("eReplay").className = "btn " + (o === "win" ? "sec" : "pri big");
    if (!refresh) { e.classList.remove("in"); void e.offsetWidth; e.classList.add("in"); UI.endLock = performance.now() + 900; }
  }
};
function spotText() {
  var yd = Math.round(ydFromOwn(G.poss, G.los));
  if (yd === 50) return T("hud.mid"); return yd < 50 ? T("hud.own", { n: yd }) : T("hud.opp", { n: 100 - yd });
}
