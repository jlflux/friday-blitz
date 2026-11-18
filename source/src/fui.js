// ---------- FRANCHISE UI: modern dashboard ----------
function fx(s) { return esc(s == null ? "" : s); }
function fInit(t) { var w = t.name.replace(/\./g, " ").split(/[\s-]+/).filter(function (x) { return x && x !== "County" && x !== "City"; }); if (w.length === 1) return w[0][0]; return w.slice(0, 3).map(function (x) { return x[0]; }).join(""); }
function fFg(c) { return lum(c) > 150 ? "#0b0f17" : "#ffffff"; }
function fBadge(t, sz) {
  if (!t) return '<span class="bdg" style="--s:' + (sz || 28) + 'px">?</span>';
  var ink = colDist(t.c1, t.c2) > 120 ? t.c2 : fFg(t.c1), ini = fInit(t);
  return '<span class="bdg" style="--s:' + (sz || 28) + 'px;background:' + t.c1 + ';border-color:' + t.c2 + ';color:' + ink + ';font-size:' + Math.round((sz || 28) * (ini.length > 2 ? 0.3 : ini.length > 1 ? 0.38 : 0.5)) + 'px">' + fx(ini) + "</span>";
}
function fTeam(id, opt) { var t = tm(id); if (!t) return '<span class="dim">TBD</span>'; opt = opt || {}; var rk = rankOf(id);
  return '<span class="tl" data-a="team" data-v="' + id + '">' + fBadge(t, opt.sz || 24) + '<span class="tln">' + (rk && !opt.noRank ? '<i class="rk">' + rk + "</i>" : "") + fx(t.name) + (opt.mascot ? ' <em>' + fx(t.mascot) + "</em>" : "") + "</span></span>"; }
function fRec(t) { return t.w + "-" + t.l; }
function fOv(v) { return '<b class="ov ' + (v >= 82 ? "o5" : v >= 74 ? "o4" : v >= 66 ? "o3" : v >= 58 ? "o2" : "o1") + '">' + v + "</b>"; }
function fStars(n) { var s = ""; for (var i = 0; i < 5; i++) s += i < n ? "★" : "☆"; return '<span class="stars">' + s + "</span>"; }
function fPrest(p) { return fStars(Math.max(1, Math.min(5, Math.round(p / 20)))); }
function fTier(ci) { var c = COLLEGES[ci]; return '<span class="tier t' + c[1] + '">' + fx(c[0]) + "</span>"; }
function fWeekLbl() { if (FR.phase === "preseason") return "Preseason"; if (FR.phase === "regular") return "Week " + (FR.week + 1); if (FR.phase === "playoffs") return poRoundName(tm(FR.user).cls, FR.po.r); return "Offseason"; }
function fDev(p) { return ["Normal", "Quick learner", "Late bloomer"][p.dev] || "Normal"; }
function fCard(title, body, opt) { opt = opt || {}; if (/^<table/.test(body)) body = '<div class="tscroll">' + body + "</div>"; return '<section class="card ' + (opt.cls || "") + '">' + (title ? '<header><h3>' + title + "</h3>" + (opt.right || "") + "</header>" : "") + '<div class="cb">' + body + "</div></section>"; }
function fBtn(lbl, a, v, cls, dis) { return '<button class="fbt ' + (cls || "") + '" data-a="' + a + '"' + (v !== undefined ? ' data-v="' + fx(v) + '"' : "") + (dis ? " disabled" : "") + ">" + lbl + "</button>"; }
function fEmpty(x) { return '<div class="empty">' + x + "</div>"; }
function fPct(a, b) { return b ? Math.round(a / b * 100) : 0; }
function fAccent(t) { if (lum(t.c1) > 55 && lum(t.c1) < 215) return t.c1; if (lum(t.c2) > 55 && lum(t.c2) < 215) return t.c2; return "#3b82f6"; }

var FUI = {
  page: "home", cls: null, rosterPos: "ALL", sortK: "ov", sortD: -1, statTab: "leaders", toast: null, modal: null, nav: false, bound: false, newSt: null, delArm: -1, watch: null, wt: 0,
  bind: function () {
    if (FUI.bound) return; FUI.bound = true; var root = $("fr");
    root.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    root.addEventListener("click", function (e) { if (/^(INPUT|SELECT|LABEL|OPTION|TEXTAREA)$/.test(e.target.tagName)) return; var n = e.target.closest("[data-a]"); if (!n || n.disabled || !root.contains(n)) return; e.stopPropagation(); e.preventDefault(); audioInit(); FUI.act(n.getAttribute("data-a"), n.getAttribute("data-v"), n); });
    root.addEventListener("input", function (e) { var n = e.target, k = n.getAttribute("data-in");
      if (n.getAttribute("data-lg") && FUI.adm) { FUI.lgInput(n, true); return; }
      if (FUI.acct && k === "ae") FUI.acct.email = n.value; if (FUI.acct && k === "ap") FUI.acct.pw = n.value; if (k === "aq" && FUI.adm) { FUI.adm.q = n.value; FUI.admFilter(); } if (k === "coach" && FUI.newSt) FUI.newSt.coach = n.value.slice(0, 24); if (k === "rename" && FR) { FR.coach.name = n.value.slice(0, 24) || "Coach"; tm(FR.user).coach = FR.coach.name; frSave(); } });
    root.addEventListener("change", function (e) { var n = e.target, k = n.getAttribute("data-ch");
      if ((n.getAttribute("data-lg") || n.getAttribute("data-lgs")) && FUI.adm) { FUI.lgInput(n, false); return; } if (k === "posch") { positionChange(n.getAttribute("data-v"), n.value); FUI.render(); } if (k === "qmin") { FR.settings.qmin = +n.value; frSave(); } });
    root.addEventListener("keydown", function (e) { e.stopPropagation(); var k = e.target.getAttribute && e.target.getAttribute("data-in"); if (e.key === "Enter" && (k === "ae" || k === "ap") && FUI.acct && !FUI.acct.busy) FUI.acctGo(); });
  },
  open: function () {
    FUI.bind(); FUI.modal = null; FUI.watch = null;
    if (FR && FR.scope !== undefined && FR.scope !== Cloud.scope()) FR = null;
    if (!FR) { var a = frActiveSlot(); if (a >= 0) frLoadSlot(a); }
    if (FR && FR.user >= 0) { FUI.page = FR.phase === "offseason" ? "offseason" : "home"; } else { FR = null; FUI.page = "programs"; }
    FUI.render(); UI.showRaw("fr");
  },
  go: function (p) { FUI.page = p; FUI.nav = false; FUI.modal = null; FUI.render(); var m = $("frMain"); if (m) m.scrollTop = 0; },
  render: function () {
    var root = $("fr"); if (!root) return; var m = $("frMain"), sc = m ? m.scrollTop : 0;
    root.className = "scr fr2"; FUI.bind();
    if (!FR || FR.user < 0 || FUI.page === "programs" || FUI.page === "new" || FUI.page === "admin") { root.style.setProperty("--ac", "#3b82f6"); root.innerHTML = '<div class="fsolo' + (FUI.page === "admin" ? " wide" : "") + '" id="frMain">' + (FUI.page === "admin" ? FUI.pAdmin() : FUI.page === "new" ? FUI.pNew() : FUI.pPrograms()) + "</div>" + FUI.modalHtml(); FUI.paint(root); var m3 = $("frMain"); if (m3 && sc) m3.scrollTop = sc; if (FUI.page === "admin") FUI.admFilter(); return; }
    var t = tm(FR.user); root.style.setProperty("--ac", fAccent(t)); root.style.setProperty("--c1", t.c1); root.style.setProperty("--c2", t.c2);
    var body = (FUI["p_" + FUI.page] || FUI.p_home)();
    root.innerHTML = '<div class="fa' + (FUI.nav ? " navon" : "") + '">' + FUI.side() + '<div class="fmain">' + FUI.top() + '<div class="fscroll" id="frMain">' + FUI.toastHtml() + body + "</div></div>" + '<div class="fscrim" data-a="menu"></div></div>' + FUI.modalHtml() + FUI.watchHtml();
    FUI.paint(root); var m2 = $("frMain"); if (m2 && sc) m2.scrollTop = sc;
  },
  paint: function (root) {
    root.querySelectorAll("canvas[data-pv]").forEach(function (cv) {
      var v = cv.getAttribute("data-pv").split("|"), t = tm(+v[0]); if (!t) return; var p = v[1] ? PL(v[1]) : null, lu = p ? null : lineupOf(t.id), qb = p || (lu.QB[0] || { sk: 1, num: 7 });
      UI.paintPreview(cv, { primary: t.c1, secondary: t.c2, helmet: lum(t.c1) > 150 ? "secondary" : "primary", pants: "white", awayWhite: true, roster: [{ skin: qb.sk || 0, num: qb.num || 1 }] }, false);
    });
  },
  toastResult: function (g) { if (!g) return; var us = g.h === FR.user, my = us ? g.hs : g.as, th = us ? g.as : g.hs, opp = tm(us ? g.a : g.h);
    FUI.toast = { g: g, x: (my > th ? "WIN" : "LOSS") + " " + my + "-" + th + (us ? " vs " : " at ") + opp.name, win: my > th }; },
  toastHtml: function () { var cn = Cloud.on() && (Cloud.notice || (Cloud.signedIn() && Cloud.me.banned)) ? '<div class="ftoast2 l"><b>' + fx(Cloud.notice || "This account has been disabled.") + "</b><span>" + (Cloud.me.banned ? "Your programs are saved on this device only." : "") + "</span>" + (Cloud.notice ? fBtn("✕", "unnotice", "", "sm ghost") : "") + "</div>" : "";
    return cn + FUI.toastHtml2(); },
  toastHtml2: function () { var t = FUI.toast; if (!t) return ""; return '<div class="ftoast2 ' + (t.win ? "w" : t.g ? "l" : "") + '"><b>' + fx(t.x) + "</b>" + (t.sub ? "<span>" + fx(t.sub) + "</span>" : "") + (t.g ? fBtn("Box score", "box", "toast", "sm") : "") + fBtn("✕", "untoast", "", "sm ghost") + "</div>"; },

  // ---------- chrome ----------
  side: function () {
    var off = FR.phase === "offseason", P = FUI.page, it = function (k, ic, lbl, badge) { return '<button class="ni' + (P === k ? " on" : "") + '" data-a="nav" data-v="' + k + '"><i>' + ic + "</i>" + lbl + (badge ? '<b class="nb">' + badge + "</b>" : "") + "</button>"; };
    var t = tm(FR.user), todo = todoList().length, offc = 0; teamPlayers(FR.user).forEach(function (p) { offc += p.of.length; });
    return '<nav class="fside"><div class="brand"><span class="bl">FRIDAY NIGHT</span><span class="bb">BLITZ</span><small>Alabama 5A · 6A</small></div>' +
      (off ? '<div class="ng">Offseason</div>' + it("offseason", "◆", "Offseason", (FR.off.step + 1) + "/" + OFF_STEPS.length) : "") +
      '<div class="ng">Season</div>' + it("home", "⌂", "Home", todo || "") + it("schedule", "▦", "Schedule") + it("standings", "≡", "Standings") + it("playoffs", "⚑", "Playoffs") + it("poll", "#", "Top 10") + it("stats", "▤", "Stats & Leaders") +
      '<div class="ng">Team</div>' + it("roster", "☰", "Roster") + it("depth", "⇅", "Depth Chart") + it("practice", "⚙", "Practice") +
      '<div class="ng">Program</div>' + it("offers", "✉", "College Offers", offc || "") + it("feeder", "◎", "Feeder Scouting") + it("staff", "♟", "Coaching Staff") + it("facilities", "▣", "Facilities & Boosters") +
      '<div class="ng">History</div>' + it("news", "✎", "News") + it("records", "★", "Record Book") + it("history", "⌛", "History & Awards") +
      '<div class="ng">Game</div>' + it("settings", "⚙", "Settings") + it("programs", "⇄", "Programs") + (Cloud.on() ? '<button class="ni" data-a="acct"><i>☺</i>' + (Cloud.signedIn() ? "Account" : "Sign in") + "</button>" : "") + (Cloud.me.admin ? '<button class="ni" data-a="admin"><i>★</i>Admin</button>' : "") + '<button class="ni" data-a="exit"><i>⏻</i>Save & Exit</button></nav>';
  },
  top: function () {
    var t = tm(FR.user), rk = rankOf(FR.user), off = FR.phase === "offseason", adv = off ? "Next step ▸" : FR.phase === "preseason" ? "Kick off season ▸" : "Advance week ▸";
    return '<header class="ftop"><button class="fbt ghost burger" data-a="menu">☰</button><canvas class="pv" width="36" height="18" data-pv="' + t.id + '"></canvas>' +
      '<div class="tt"><div class="ttn">' + (rk ? '<i class="rk">' + rk + "</i>" : "") + fx(t.name) + ' <em>' + fx(t.mascot) + '</em></div><div class="tts">' + fRec(t) + " · " + t.rw + "-" + t.rl + " Region · " + t.cls + " Region " + t.reg + "</div></div>" +
      '<div class="tmeta"><div><small>Season</small><b>' + FR.year + " · " + fx(fWeekLbl()) + '</b></div><div><small>Booster fund</small><b class="money">' + money(FR.funds) + '</b></div><div class="hide-s"><small>Exposure</small><b>' + Math.round(FR.exposure) + '</b><span class="mtr"><span style="width:' + Math.round(FR.exposure) + '%"></span></span></div></div>' +
      fBtn(adv, off ? "offnext" : "simweek", "", "pri adv") + "</header>";
  },
  modalHtml: function () {
    var m = FUI.modal; if (!m) return ""; var h = "";
    if (m.k === "box") h = FUI.mBox(m.g); else if (m.k === "player") h = FUI.mPlayer(m.id); else if (m.k === "team") h = FUI.mTeam(m.id); else if (m.k === "ahead") h = FUI.mAhead(); else if (m.k === "confirm") h = m.html; else if (m.k === "acct") h = FUI.mAcct();
    return '<div class="fmod" data-a="close"><div class="fmb" data-a="noop">' + fBtn("✕", "close", "", "ghost mx") + h + "</div></div>";
  },

  // ---------- actions ----------
  act: function (a, v, n) {
    if (a === "noop") return;
    if (a === "nav" || a === "simto" || a === "slot") FUI.toast = null;
    if (a.indexOf("adm-") === 0) { FUI.admAct(a, v); return; }
    switch (a) {
      case "acct": FUI.acct = { mode: v || "in", email: (FUI.acct && FUI.acct.email) || "", pw: "" }; FUI.modal = { k: "acct" }; FUI.render(); return;
      case "acct-mode": FUI.acct.mode = v; FUI.acct.err = ""; FUI.acct.msg = ""; FUI.render(); return;
      case "acct-go": FUI.acctGo(); return;
      case "acct-out": Cloud.signOut().then(function () { FR = null; FUI.modal = null; FUI.page = "programs"; FUI.render(); }); return;
      case "acct-sync": FUI.acct.msg = ""; FUI.acct.err = ""; Cloud.flushSaves().then(function () { return Cloud.afterSignIn(); }).then(function () { FUI.acct.msg = Cloud.status; FUI.render(); }); return;
      case "admin": FUI.admOpen(); return;
      case "unnotice": Cloud.notice = ""; FUI.render(); return;
      case "nav": FUI.go(v); return;
      case "menu": FUI.nav = !FUI.nav; FUI.render(); return;
      case "close": FUI.modal = null; FUI.render(); return;
      case "untoast": FUI.toast = null; FUI.render(); return;
      case "exit": frSave(); FUI.modal = null; UI.show("title"); return;
      case "play": FUI.ensure(); App.startFranchiseGame(false); return;
      case "play16": FUI.ensure(); App.startFranchiseGame(true); return;
      case "watch": FUI.startWatch(); return;
      case "sim": FUI.simUser(); return;
      case "simweek": FUI.simWeek(); return;
      case "ahead": FUI.modal = { k: "ahead" }; FUI.render(); return;
      case "simto": FUI.modal = null; FUI.simTo(v); return;
      case "box": FUI.modal = { k: "box", g: v === "toast" ? FUI.toast.g : FUI.gref[+v] }; FUI.render(); return;
      case "player": FUI.modal = { k: "player", id: v }; FUI.render(); return;
      case "team": FUI.modal = { k: "team", id: +v }; FUI.render(); return;
      case "cls": FUI.cls = v; FUI.render(); return;
      case "rpos": FUI.rosterPos = v; FUI.render(); return;
      case "sort": if (FUI.sortK === v) FUI.sortD = -FUI.sortD; else { FUI.sortK = v; FUI.sortD = v === "name" || v === "num" ? 1 : -1; } FUI.render(); return;
      case "stab": FUI.statTab = v; FUI.render(); return;
      case "dup": case "ddn": var pr = v.split("|"); moveDepth(pr[0], pr[1], a === "dup" ? -1 : 1); refreshOvr(FR.user); frSave(); FUI.render(); return;
      case "autodepth": autoDepth(); refreshOvr(FR.user); frSave(); FUI.toast = { x: "Depth chart sorted by overall." }; FUI.render(); return;
      case "film": if (sendFilm(v)) FUI.toast = { x: "Highlight film sent for " + pnm(PL(v)) + ". College coaches will take a closer look." }; else FUI.toast = { x: FR.filmLeft <= 0 ? "No film packages left this week." : "Not enough booster money ($500)." }; FUI.render(); return;
      case "scout": if (!scoutFeeder(v, false)) FUI.toast = { x: "Not enough scouting points." }; FUI.render(); return;
      case "scoutall": if (!scoutFeeder(v, true)) FUI.toast = { x: "Not enough scouting points for a full report." }; FUI.render(); return;
      case "host": if (!hostFeeder(v)) FUI.toast = { x: "No hosting spots left this week." }; FUI.render(); return;
      case "hire": var hp = v.split("|"); hireStaff(hp[0], +hp[1]); FUI.render(); return;
      case "fac": if (!buyFac(v)) FUI.toast = { x: "The booster fund can't cover that yet." }; FUI.render(); return;
      case "practice": FR.practice = v; frSave(); FUI.toast = { x: "Practice focus set: " + PRACTICE.filter(function (p) { return p[0] === v; })[0][1] + "." }; FUI.render(); return;
      case "offnext": FUI.offNext(); return;
      case "pitch": if (!pitchMovein(v)) FUI.toast = { x: "No family visits left." }; FUI.render(); return;
      case "slot": FR = null; frLoadSlot(+v); FUI.page = FR && FR.phase === "offseason" ? "offseason" : "home"; FUI.toast = null; FUI.render(); return;
      case "newslot": FUI.newSt = { slot: +v, coach: "Coach " + COACH_LAST[Math.floor(Math.random() * COACH_LAST.length)], cls: "5A", reg: 0, pick: -1 }; FR = null; frCreate(+v, FUI.newSt.coach, (Date.now() ^ (Math.random() * 1e9)) >>> 0); FUI.page = "new"; FUI.render(); return;
      case "delslot": if (FUI.delArm === +v) { frDeleteSlot(+v); FUI.delArm = -1; if (FR && FR.slot === +v) FR = null; } else FUI.delArm = +v; FUI.render(); return;
      case "ncls": FUI.newSt.cls = v; FUI.newSt.reg = 0; FUI.newSt.pick = -1; FUI.render(); return;
      case "nreg": FUI.newSt.reg = +v; FUI.render(); return;
      case "npick": FUI.newSt.pick = +v; FUI.render(); return;
      case "ncreate": FR.coach.name = (FUI.newSt.coach || "Coach").trim() || "Coach"; frPick(FUI.newSt.pick); FUI.newSt = null; FUI.page = "home"; FUI.toast = { x: "Welcome to " + tm(FR.user).name + ", " + FR.coach.name + ".", sub: "Set your depth chart and practice plan, then kick off the season." }; FUI.render(); return;
      case "nback": FR = null; FUI.newSt = null; FUI.page = "programs"; FUI.render(); return;
      case "title": FR = null; UI.show("title"); return;
      case "w-sp": FUI.watch.sp = +v; FUI.wRender(); return;
      case "w-pause": FUI.watch.paused = !FUI.watch.paused; FUI.wRender(); if (!FUI.watch.paused) FUI.wTick(); return;
      case "w-skip": FUI.watch.i = FUI.watch.res.plays.length; FUI.wFinish(); return;
      case "w-done": FUI.wClose(); return;
    }
  },
  ensure: function () { if (FR.phase === "preseason") startSeason(); },
  simUser: function () {
    FUI.ensure(); var r = simUserNow(true);
    if (r) { FR.how = "sim"; recordGame(r.g, r.res, FR.week); advanceWeek(); FUI.toastResult(r.g); } else { advanceWeek(); FUI.toast = { x: "Week simulated." }; }
    if (FR.phase === "offseason") FUI.page = "offseason";
    FUI.render();
  },
  simWeek: function () { FUI.simUser(); },
  simTo: function (v) {
    FUI.ensure(); var t = tm(FR.user), w0 = t.w, l0 = t.l, last = null, guard = 0;
    var stop = function () { if (v === "1") return guard > 0; if (v === "region") return FR.phase !== "regular" || FR.week >= 3; if (v === "playoffs") return FR.phase !== "regular"; if (v === "out") return FR.phase === "offseason" || (FR.phase === "playoffs" && !userGameNow()); return FR.phase === "offseason"; };
    while (!stop() && guard++ < 40) { var g = userGameNow(); advanceWeek(); if (g && g.done) last = g; }
    var dw = t.w - w0, dl = t.l - l0;
    FUI.toast = { x: "Simulated ahead: " + dw + "-" + dl + " in that stretch.", sub: FR.phase === "offseason" ? "The season is over. Head to the offseason." : "Now: " + fWeekLbl() + ".", g: last, win: dw >= dl };
    if (FR.phase === "offseason") FUI.page = "offseason";
    FUI.render();
  },
  offNext: function () { var st = OFF_STEPS[FR.off.step]; offNext(); if (st === "ready") { FUI.page = "home"; FUI.toast = { x: "The " + FR.year + " season is here.", sub: "Check your depth chart: last year's seniors are gone." }; } else FUI.page = "offseason"; FUI.render(); var m = $("frMain"); if (m) m.scrollTop = 0; },

  // ---------- watch (text broadcast) ----------
  startWatch: function () { FUI.ensure(); var r = simUserNow(true); if (!r) return; FUI.watch = { g: r.g, res: r.res, i: 0, sp: 1, paused: false, done: false, rec: false }; FUI.render(); clearTimeout(FUI.wt); FUI.wt = setTimeout(FUI.wTick, 600); },
  wTick: function () {
    var w = FUI.watch; clearTimeout(FUI.wt); if (!w || w.paused || w.done) return;
    w.i++; if (w.i >= w.res.plays.length) { FUI.wFinish(); return; }
    var p = w.res.plays[w.i - 1], extra = p && (p.k === "td" || p.k === "to") ? 1.8 : p && (p.k === "q") ? 1.5 : 1;
    FUI.wRender(); FUI.wt = setTimeout(FUI.wTick, [0, 1150, 560, 220, 60][w.sp] * extra);
  },
  wFinish: function () { var w = FUI.watch; if (!w) return; w.done = true; w.i = w.res.plays.length; if (!w.rec) { w.rec = true; FR.how = "watch"; recordGame(w.g, w.res, FR.week); advanceWeek(); FUI.toastResult(w.g); } FUI.wRender(); },
  wClose: function () { var w = FUI.watch; if (!w) return; if (!w.done) FUI.wFinish(); clearTimeout(FUI.wt); FUI.watch = null; if (FR.phase === "offseason") FUI.page = "offseason"; FUI.modal = { k: "box", g: w.g }; FUI.render(); },
  wRender: function () { var o = $("frWatch"); if (!o) { FUI.render(); return; } o.outerHTML = FUI.watchHtml(); },
  watchHtml: function () {
    var w = FUI.watch; if (!w) return ""; var g = w.g, H = tm(g.h), A = tm(g.a), pl = w.res.plays, cur = pl[Math.max(0, w.i - 1)] || pl[0];
    var hs = w.done ? w.res.hs : cur.h, as = w.done ? w.res.as : cur.a, q = w.done ? "FINAL" : cur.q > 4 ? "OT" : "Q" + cur.q, clk = w.done ? "" : cur.c;
    var posT = cur.p === 0 ? H : A, dd = ["", "1st", "2nd", "3rd", "4th"][cur.d] || "", goal = cur.tg >= 100 - cur.yl, sit = w.done ? (w.res.hs > w.res.as ? H.name : A.name) + " wins" : dd + " & " + (goal ? "Goal" : cur.tg) + " · " + posT.abbr + " ball";
    var x = cur.p === 0 ? cur.yl : 100 - cur.yl, ballL = (10 + cl(x, 0, 100)) / 120 * 100;
    var feed = ""; for (var i = Math.min(w.i, pl.length) - 1, n = 0; i >= 0 && n < 60; i--, n++) { var p = pl[i], tt = p.p === 0 ? H : A;
      feed += '<div class="wp ' + p.k + '"><span class="wq">' + (p.q > 4 ? "OT" : "Q" + p.q) + " " + fx(p.c) + '</span><span class="wdot" style="background:' + tt.c1 + '"></span><span class="wx">' + fx(p.x) + "</span></div>"; }
    var sb = function (t, s, side) { return '<div class="wsbt ' + side + '" style="--tc:' + t.c1 + '">' + fBadge(t, 40) + '<div><b>' + fx(t.abbr) + "</b><small>" + fRec(t) + "</small></div><strong>" + s + "</strong>" + (cur.p === (side === "h" ? 0 : 1) && !w.done ? '<i class="poss">●</i>' : "") + "</div>"; };
    return '<div class="wv" id="frWatch"><div class="wbox"><div class="wtag">LIVE · ' + fx(fWeekLbl()) + " · " + (g.neutral ? "Neutral site" : fx(H.name) + " home") + '</div><div class="wsb">' + sb(A, as, "a") + '<div class="wmid"><b>' + q + "</b><span>" + fx(clk) + "</span></div>" + sb(H, hs, "h") + "</div>" +
      '<div class="wsit">' + fx(sit) + '</div><div class="wfield"><span class="ez l" style="background:' + H.c1 + '">' + fx(H.abbr) + '</span><span class="ez r" style="background:' + A.c1 + '">' + fx(A.abbr) + "</span>" + [20, 40, 50, 60, 80].map(function (y) { return '<span class="yd" style="left:' + ((10 + y) / 120 * 100) + '%"></span>'; }).join("") +
      (w.done ? "" : '<span class="ball" style="left:' + ballL + '%"></span>') + '</div><div class="wfeed">' + (feed || '<div class="wp">Kickoff coming up…</div>') + '</div><div class="wctl">' +
      (w.done ? fBtn("Box score & continue ▸", "w-done", "", "pri") : fBtn(w.paused ? "▶ Resume" : "❚❚ Pause", "w-pause", "", "") + [1, 2, 3, 4].map(function (s) { return fBtn(["", "1×", "2×", "4×", "Turbo"][s], "w-sp", s, w.sp === s ? "on" : ""); }).join("") + fBtn("Skip to final", "w-skip", "", "ghost")) + "</div></div></div>";
  },

  // ---------- pages ----------
  nextGame: function () { if (FR.phase === "preseason") return gameOf(FR.user, 0); if (FR.phase === "regular") return gameOf(FR.user, FR.week); if (FR.phase === "playoffs") return userGameNow(); return null; },
  lastGame: function () { var best = null; FR.sched.forEach(function (wk) { wk.forEach(function (g) { if (g.done && (g.h === FR.user || g.a === FR.user)) best = g; }); }); if (FR.po) ["5A", "6A"].forEach(function (c) { FR.po.b[c].rounds.forEach(function (r) { r.forEach(function (g) { if (g.done && (g.h === FR.user || g.a === FR.user)) best = g; }); }); }); return best; },
  gref: [],
  boxLink: function (g, lbl) { FUI.gref.push(g); return '<button class="lk" data-a="box" data-v="' + (FUI.gref.length - 1) + '">' + (lbl || "Box") + "</button>"; },
  hero: function () {
    var g = FUI.nextGame(), t = tm(FR.user);
    if (FR.phase === "offseason") return fCard("", '<div class="offhero"><div><small>Offseason · Step ' + (FR.off.step + 1) + " of " + OFF_STEPS.length + "</small><h2>" + OFF_NAME[OFF_STEPS[FR.off.step]] + "</h2><p>" + fx(FR.hist[0] ? FR.year + ": " + FR.hist[0].w + "-" + FR.hist[0].l + ", " + FR.hist[0].res : "") + "</p></div>" + fBtn("Open offseason ▸", "nav", "offseason", "pri big") + "</div>", { cls: "hero" });
    if (!g) {
      var over = FR.phase === "playoffs";
      return fCard("", '<div class="offhero"><div><small>' + fx(fWeekLbl()) + "</small><h2>" + (over ? (inPlayoffs(FR.user) ? "Your season is over" : "You missed the playoffs") : "Open date") + "</h2><p>" + (over ? "The rest of the bracket plays on. Sim ahead to finish the season and start the offseason." : "No game this Friday. Rest up and sim the week.") + "</p></div><div class='hbtns'>" +
        fBtn(over ? "Sim round" : "Sim week", "simweek", "", "pri") + (over ? fBtn("Sim to offseason", "simto", "end", "") : fBtn("Sim ahead…", "ahead", "", "")) + "</div></div>", { cls: "hero" });
    }
    var us = g.h === FR.user, oppId = us ? g.a : g.h, o = tm(oppId), uU = unitRatings(FR.user), uO = unitRatings(oppId);
    var tag = FR.phase === "playoffs" ? poRoundName(t.cls, FR.po.r) + (g.neutral ? " · Neutral site" : us ? " · Home" : " · Away") : "Week " + ((FR.phase === "preseason" ? 0 : FR.week) + 1) + " · " + (g.reg ? "Region game" : "Non-region") + " · " + (us ? "Home" : "Away");
    var side = function (id, u, lbl) { var x = tm(id), rk = rankOf(id); return '<div class="hs"><canvas class="pv big" width="36" height="18" data-pv="' + id + '"></canvas>' + fBadge(x, 64) + '<div class="hsn">' + (rk ? '<i class="rk">' + rk + "</i>" : "") + fx(x.name) + '</div><div class="hsm">' + fx(x.mascot) + " · " + fRec(x) + " (" + x.rw + "-" + x.rl + ")</div><div class=\"hsr\"><span>OVR " + fOv(x.ovr) + "</span><span>OFF " + fOv(Math.round(u.off)) + "</span><span>DEF " + fOv(Math.round(u.def)) + '</span></div><div class="hsl">' + lbl + "</div></div>"; };
    var edge = function (lbl, a, b) { var d = cl((a - b) * 4 + 50, 6, 94); return '<div class="edge"><span>' + lbl + '</span><div class="eb"><i style="width:' + d + '%;background:' + fAccent(t) + '"></i><i style="width:' + (100 - d) + '%;background:' + fAccent(o) + '"></i></div></div>'; };
    var html = '<div class="hgrad" style="background:linear-gradient(100deg,' + t.c1 + "cc 0%," + t.c1 + "55 38%,#0b0f17 50%," + o.c1 + "55 62%," + o.c1 + 'cc 100%)"></div><div class="htag">' + fx(tag) + "</div>" +
      '<div class="hrow">' + side(FR.user, uU, us ? "HOME" : g.neutral ? "NEUTRAL" : "AWAY") + '<div class="hvs">VS<small>Friday · 7:00 PM</small></div>' + side(oppId, uO, us ? "AWAY" : g.neutral ? "NEUTRAL" : "HOME") + "</div>" +
      '<div class="edges">' + edge("Your pass game vs their coverage", uU.pass, uO.cov) + edge("Your run game vs their front", uU.run, uO.rund) + edge("Your defense vs their offense", uU.def, uO.off) + "</div>" +
      '<div class="hbtns">' + fBtn("▶ Play", "play", "", "pri big") + fBtn("◉ Watch", "watch", "", "big") + fBtn("⏩ Sim", "sim", "", "big") + fBtn("Sim ahead…", "ahead", "", "big ghost") + '</div><div class="hnote">Play it yourself in the 16-bit engine, watch the broadcast, or let your staff coach it. ' + '<button class="lk" data-a="play16">Watch in 16-bit</button></div>';
    return fCard("", html, { cls: "hero game" });
  },
  p_home: function () {
    FUI.gref = []; var t = tm(FR.user), out = '<div class="fgrid">';
    out += '<div class="span2">' + FUI.hero() + "</div>";
    var td = todoList(); out += fCard("To-do", td.length ? td.map(function (x) { return '<button class="todo" data-a="nav" data-v="' + x.go + '"><b>' + fx(x.t) + "</b><span>" + fx(x.x) + "</span></button>"; }).join("") : fEmpty("All caught up. Advance when you're ready."), { right: '<span class="pill">' + td.length + "</span>" });
    // region standings
    var st = standings(t.cls, t.reg), cut = t.cls === "6A" ? 6 : 4;
    out += fCard(t.cls + " Region " + t.reg, '<table class="ft"><tr><th></th><th>Team</th><th>Reg</th><th>All</th></tr>' + st.map(function (x, i) { return '<tr class="' + (x.id === FR.user ? "me" : "") + (i === cut - 1 ? " cut" : "") + '"><td class="n">' + (i + 1) + "</td><td>" + fTeam(x.id, { sz: 20 }) + "</td><td>" + x.rw + "-" + x.rl + "</td><td>" + fRec(x) + "</td></tr>"; }).join("") + "</table>", { right: fBtn("Full", "nav", "standings", "sm ghost") });
    // key players
    var kp = teamPlayers(FR.user).slice().sort(function (a, b) { return b.ov - a.ov; }).slice(0, 6);
    out += fCard("Key players", kp.map(function (p) { return FUI.pRow(p); }).join(""), { right: fBtn("Roster", "nav", "roster", "sm ghost") });
    // team leaders
    var mine = teamPlayers(FR.user), lead = function (k, lbl, f) { var b = mine.filter(function (p) { return p.st[k] > 0; }).sort(function (a, c) { return c.st[k] - a.st[k]; })[0]; return '<div class="ld"><small>' + lbl + "</small>" + (b ? '<button class="lk" data-a="player" data-v="' + b.id + '">' + fx(pnm(b)) + "</button><b>" + f(b.st) + "</b>" : "<span class='dim'>—</span>") + "</div>"; };
    out += fCard("Team leaders", '<div class="lds">' + lead("py", "Passing", function (s) { return s.py + " yds · " + s.ptd + " TD"; }) + lead("ry", "Rushing", function (s) { return s.ry + " yds · " + s.rtd + " TD"; }) + lead("rcy", "Receiving", function (s) { return s.rcy + " yds · " + s.rec + " rec"; }) + lead("tk", "Tackles", function (s) { return s.tk + " tkl"; }) + lead("sk", "Sacks", function (s) { return s.sk + " sacks"; }) + lead("int", "Interceptions", function (s) { return s.int + " INT"; }) + "</div>");
    var lg = FUI.lastGame(); if (lg) { var us = lg.h === FR.user, my = us ? lg.hs : lg.as, th = us ? lg.as : lg.hs;
      out += fCard("Last game", '<div class="lgm"><b class="' + (my > th ? "w" : "l") + '">' + (my > th ? "W" : "L") + " " + my + "-" + th + "</b> " + (us ? "vs " : "at ") + fTeam(us ? lg.a : lg.h) + "</div>" + FUI.boxLink(lg, "Open box score")); }
    out += fCard("Top 10 · " + t.cls, FUI.pollList(t.cls, 10), { right: fBtn("Both", "nav", "poll", "sm ghost") });
    out += fCard("News", FUI.newsList(8), { cls: "span2", right: fBtn("All news", "nav", "news", "sm ghost") });
    return out + "</div>";
  },
  pRow: function (p) { var ln = FUI.statLine(p); return '<button class="prow" data-a="player" data-v="' + p.id + '"><span class="num">' + p.num + '</span><span class="pn"><b>' + fx(pnm(p)) + "</b><small>" + p.pos + " · " + yrLabel(p.yr) + (ln ? " · " + fx(ln) : "") + (p.inj ? ' · <i class="inj">OUT ' + p.inj + "w</i>" : "") + "</small></span>" + fOv(p.ov) + "</button>"; },
  statLine: function (p) { var s = p.st; if (!s.gp) return ""; if (p.pos === "QB") return s.pc + "/" + s.pa + ", " + s.py + " yds, " + s.ptd + " TD"; if (p.pos === "RB") return s.ry + " rush yds, " + s.rtd + " TD"; if (p.pos === "WR" || p.pos === "TE") return s.rec + " rec, " + s.rcy + " yds"; if (p.pos === "K") return s.fgm + "/" + s.fga + " FG";
    return s.tk + " tkl" + (s.sk ? ", " + s.sk + " sk" : "") + (s.int ? ", " + s.int + " INT" : ""); },
  pollList: function (cls, n) { var pl = FR.poll[cls] || []; if (!pl.length) return fEmpty("No poll yet."); return '<ol class="poll">' + pl.slice(0, n).map(function (id, i) { var x = tm(id); return '<li class="' + (id === FR.user ? "me" : "") + '"><span class="pr">' + (i + 1) + "</span>" + fTeam(id, { sz: 22, noRank: true }) + "<small>" + fRec(x) + "</small></li>"; }).join("") + "</ol>"; },
  newsList: function (n) { var ns = FR.news.slice(0, n); if (!ns.length) return fEmpty("No news yet."); return ns.map(function (x) { return '<div class="nw ' + x.tag + '"><span class="nt">' + x.y + " · " + (typeof x.w === "number" ? "Wk " + x.w : x.w) + '</span><span class="ntag">' + fx(x.tag) + "</span><span>" + fx(x.x) + "</span></div>"; }).join(""); },

  p_schedule: function () {
    FUI.gref = []; var t = tm(FR.user), rows = "";
    userSchedule().forEach(function (s) { var g = s.g;
      if (!g) { rows += '<tr class="dim"><td>' + (s.w + 1) + '</td><td colspan="4">Open date</td></tr>'; return; }
      var us = g.h === FR.user, opp = us ? g.a : g.h, cur = FR.phase === "regular" && s.w === FR.week || FR.phase === "preseason" && s.w === 0, res = "";
      if (g.done) { var my = us ? g.hs : g.as, th = us ? g.as : g.hs; res = '<b class="' + (my > th ? "w" : "l") + '">' + (my > th ? "W" : "L") + " " + my + "-" + th + "</b> " + FUI.boxLink(g); }
      else res = cur ? '<span class="pill ac">This week</span>' : "";
      rows += '<tr class="' + (cur ? "me" : "") + '"><td>' + (s.w + 1) + "</td><td>" + (us ? "vs" : "at") + "</td><td>" + fTeam(opp, { mascot: true }) + " <small class='dim'>" + fRec(tm(opp)) + "</small></td><td>" + (g.reg ? '<span class="pill">Region</span>' : '<span class="pill ghost">Non-region</span>') + "</td><td>" + res + "</td></tr>"; });
    if (FR.po) ["5A", "6A"].forEach(function (c) { if (c !== t.cls) return; FR.po.b[c].rounds.forEach(function (r, ri) { r.forEach(function (g) { if (g.h !== FR.user && g.a !== FR.user) return; var us = g.h === FR.user, opp = us ? g.a : g.h, res = "";
      if (g.done) { var my = us ? g.hs : g.as, th = us ? g.as : g.hs; res = '<b class="' + (my > th ? "w" : "l") + '">' + (my > th ? "W" : "L") + " " + my + "-" + th + "</b> " + FUI.boxLink(g); }
      rows += '<tr class="po"><td>P' + (ri + 1) + "</td><td>" + (g.neutral ? "vs" : us ? "vs" : "at") + "</td><td>" + fTeam(opp, { mascot: true }) + "</td><td><span class='pill gold'>" + fx(poRoundName(c, ri)) + "</span></td><td>" + res + "</td></tr>"; }); }); });
    return '<div class="ph2"><h1>' + FR.year + " Schedule</h1><p>" + fRec(t) + " overall · " + t.rw + "-" + t.rl + " in " + t.cls + " Region " + t.reg + ". Points: " + t.pf + " for, " + t.pa + " against.</p></div>" + fCard("", '<table class="ft big"><tr><th>Wk</th><th></th><th>Opponent</th><th>Type</th><th>Result</th></tr>' + rows + "</table>");
  },
  clsTabs: function () { var c = FUI.cls || tm(FR.user).cls; return '<div class="seg">' + ["6A", "5A"].map(function (x) { return fBtn("Class " + x, "cls", x, x === c ? "on" : ""); }).join("") + "</div>"; },
  p_standings: function () {
    var c = FUI.cls || tm(FR.user).cls, cut = c === "6A" ? 6 : 4, out = '<div class="ph2"><h1>Standings</h1><p>Top ' + cut + " in each " + c + " region make the playoffs" + (c === "6A" ? "; the top two seeds get a first-round bye." : ".") + "</p>" + FUI.clsTabs() + '</div><div class="fgrid g2">';
    for (var r = 1; r <= nRegions(c); r++) { var st = standings(c, r);
      out += fCard(c + " Region " + r, '<table class="ft"><tr><th></th><th>Team</th><th>Reg</th><th>All</th><th class="hide-s">PF</th><th class="hide-s">PA</th><th>Strk</th></tr>' + st.map(function (x, i) { return '<tr class="' + (x.id === FR.user ? "me" : "") + (i === cut - 1 ? " cut" : "") + '"><td class="n">' + (i + 1) + "</td><td>" + fTeam(x.id, { sz: 20 }) + "</td><td>" + x.rw + "-" + x.rl + "</td><td>" + fRec(x) + '</td><td class="hide-s">' + x.pf + '</td><td class="hide-s">' + x.pa + "</td><td>" + (x.strk ? (x.strk > 0 ? "W" + x.strk : "L" + (-x.strk)) : "—") + "</td></tr>"; }).join("") + "</table>"); }
    return out + "</div>";
  },
  p_poll: function () { return '<div class="ph2"><h1>Top 10</h1><p>Updated every week from record, margin and team strength.</p></div><div class="fgrid">' + fCard("Class 6A", FUI.pollList("6A", 10)) + fCard("Class 5A", FUI.pollList("5A", 10)) + "</div>"; },
  p_playoffs: function () {
    FUI.gref = []; var c = FUI.cls || tm(FR.user).cls, out = '<div class="ph2"><h1>' + c + " State Playoffs</h1><p>" + (c === "6A" ? "24 teams: top six from each of 4 regions. Seeds 1-2 get a bye." : "32 teams: top four from each of 8 regions.") + "</p>" + FUI.clsTabs() + "</div>";
    if (!FR.po) {
      var take = c === "6A" ? 6 : 4, body = '<div class="fgrid">';
      for (var r = 1; r <= nRegions(c); r++) body += fCard("Region " + r + " (projected)", standings(c, r).slice(0, take).map(function (x, i) { return '<div class="seedr ' + (x.id === FR.user ? "me" : "") + '"><span class="pr">' + (i + 1) + "</span>" + fTeam(x.id, { sz: 20 }) + "<small>" + fRec(x) + "</small></div>"; }).join(""));
      return out + fEmpty("The bracket is set after Week " + FR.sched.length + ". Here's the projected field.") + body + "</div>";
    }
    var b = FR.po.b[c], cols = "";
    var gm = function (g) { var w = g.done ? winnerOf(g) : -1, row = function (id, s) { return '<div class="bgt ' + (w === id ? "win" : w >= 0 ? "lose" : "") + (id === FR.user ? " me" : "") + '">' + fTeam(id, { sz: 18 }) + "<b>" + (g.done ? s : "") + "</b></div>"; };
      if (g.done) FUI.gref.push(g); return '<div class="bg' + (g.done ? ' click" data-a="box" data-v="' + (FUI.gref.length - 1) : "") + '">' + row(g.a, g.as) + row(g.h, g.hs) + "</div>"; };
    var maxR = 5;
    for (var ri = 0; ri < maxR; ri++) { var rd = b.rounds[ri]; cols += '<div class="bcol"><h4>' + fx(poRoundName(c, ri)) + '</h4><div class="bgs">' + (rd ? rd.map(gm).join("") : '<div class="bg tbd">TBD</div>') + "</div></div>"; }
    var champ = b.champ >= 0 ? '<div class="champ">' + fBadge(tm(b.champ), 48) + "<div><small>" + FR.year + " Class " + c + " State Champion</small><b>" + fx(tm(b.champ).name + " " + tm(b.champ).mascot) + "</b></div></div>" : "";
    var byes = c === "6A" ? '<div class="fnote">First-round byes: ' + FR.po.bye6.reduce(function (a, x) { return a.concat(x); }, []).map(function (id) { return fx(tm(id).name); }).join(", ") + "</div>" : "";
    return out + champ + '<div class="bracket">' + cols + "</div>" + byes;
  },
  p_stats: function () {
    var tab = FUI.statTab, out = '<div class="ph2"><h1>Stats & Leaders</h1><div class="seg">' + fBtn("League leaders", "stab", "leaders", tab === "leaders" ? "on" : "") + fBtn("My team", "stab", "team", tab === "team" ? "on" : "") + "</div></div>";
    if (tab === "team") {
      var mine = teamPlayers(FR.user), tbl = function (title, f, cols, row) { var ps = mine.filter(f); if (!ps.length) return ""; return fCard(title, '<table class="ft"><tr><th>Player</th>' + cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr>" + ps.map(function (p) { return '<tr><td><button class="lk" data-a="player" data-v="' + p.id + '">' + fx(pnm(p)) + "</button> <small class='dim'>" + p.pos + "</small></td>" + row(p.st).map(function (v) { return "<td>" + v + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>"); };
      var sortBy = function (k) { return function (a, b) { return b.st[k] - a.st[k]; }; }; mine.sort(sortBy("py"));
      var o = tbl("Passing", function (p) { return p.st.pa > 0; }, ["C/A", "Yds", "TD", "INT", "Pct"], function (s) { return [s.pc + "/" + s.pa, s.py, s.ptd, s.pint, fPct(s.pc, s.pa) + "%"]; });
      mine.sort(sortBy("ry")); o += tbl("Rushing", function (p) { return p.st.ra > 0; }, ["Att", "Yds", "Avg", "TD"], function (s) { return [s.ra, s.ry, (s.ry / Math.max(1, s.ra)).toFixed(1), s.rtd]; });
      mine.sort(sortBy("rcy")); o += tbl("Receiving", function (p) { return p.st.rec > 0; }, ["Rec", "Yds", "Avg", "TD"], function (s) { return [s.rec, s.rcy, (s.rcy / Math.max(1, s.rec)).toFixed(1), s.rctd]; });
      mine.sort(sortBy("tk")); o += tbl("Defense", function (p) { return p.st.tk > 0 || p.st.int > 0; }, ["Tkl", "Sacks", "INT"], function (s) { return [s.tk, s.sk, s.int]; });
      o += tbl("Kicking", function (p) { return p.st.fga > 0; }, ["FGM", "FGA", "Pct"], function (s) { return [s.fgm, s.fga, fPct(s.fgm, s.fga) + "%"]; });
      return out + (o ? '<div class="fgrid">' + o + "</div>" : fEmpty("No games played yet."));
    }
    var c = FUI.cls || "ALL", seg = '<div class="seg">' + ["ALL", "6A", "5A"].map(function (x) { return fBtn(x === "ALL" ? "All" : x, "cls", x, x === c ? "on" : ""); }).join("") + "</div>";
    var cats = [["py", "Passing yards"], ["ptd", "Passing TDs"], ["ry", "Rushing yards"], ["rtd", "Rushing TDs"], ["rcy", "Receiving yards"], ["rec", "Receptions"], ["tk", "Tackles"], ["sk", "Sacks"], ["int", "Interceptions"]];
    var o2 = '<div class="fgrid g3">' + cats.map(function (ct) { var ls = leaders(c === "ALL" ? "ALL" : c, ct[0], 6); return fCard(ct[1], ls.length ? ls.map(function (p, i) { return '<div class="ldr ' + (p.t === FR.user ? "me" : "") + '"><span class="pr">' + (i + 1) + "</span>" + fBadge(tm(p.t), 20) + '<button class="lk" data-a="player" data-v="' + p.id + '">' + fx(pnm(p)) + "</button><small>" + fx(tm(p.t).abbr) + " · " + yrLabel(p.yr) + "</small><b>" + p.st[ct[0]] + "</b></div>"; }).join("") : fEmpty("No stats yet.")); }).join("") + "</div>";
    return out.replace("</div></div>", "</div>" + seg + "</div>") + o2;
  },
  p_roster: function () {
    var all = teamPlayers(FR.user), f = FUI.rosterPos, groups = { ALL: null, OFF: ["QB", "RB", "WR", "TE", "OL"], DEF: ["DL", "LB", "CB", "S"] };
    var list = all.filter(function (p) { return f === "ALL" || (groups[f] ? groups[f].indexOf(p.pos) >= 0 : p.pos === f); });
    var k = FUI.sortK, d = FUI.sortD, val = function (p) { return k === "name" ? p.l + p.f : k === "pos" ? POSL.indexOf(p.pos) * 100 - p.ov : k === "yr" ? p.yr : k === "num" ? p.num : k === "pot" ? p.pot : k === "of" ? p.of.length : p.ov; };
    list.sort(function (a, b) { var x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * d || b.ov - a.ov; });
    var chips = ["ALL", "OFF", "DEF"].concat(POSL).map(function (x) { return fBtn(x, "rpos", x, x === f ? "on" : ""); }).join("");
    var th = function (key, lbl, cls) { return '<th class="srt ' + (cls || "") + (k === key ? " on" : "") + '" data-a="sort" data-v="' + key + '">' + lbl + (k === key ? (d > 0 ? " ▲" : " ▼") : "") + "</th>"; };
    var yrs = {}; all.forEach(function (p) { yrs[p.yr] = (yrs[p.yr] || 0) + 1; });
    var rows = list.map(function (p) { var ka = KEY_ATTRS[p.pos];
      return '<tr data-a="player" data-v="' + p.id + '" class="click"><td class="n">' + p.num + '</td><td><b>' + fx(pnm(p)) + "</b>" + (p.inj ? ' <i class="inj">OUT ' + p.inj + "w</i>" : "") + (p.cm >= 0 ? ' <span class="pill gold">' + fx(COLLEGES[p.cm][0]) + "</span>" : "") + "</td><td>" + p.pos + "</td><td>" + yrLabel(p.yr) + "</td><td>" + fOv(p.ov) + '</td><td class="hide-s">' + fOv(p.pot) + '</td><td class="hide-s attrs">' + ka.map(function (a) { return "<span><small>" + a.toUpperCase() + "</small>" + p.a[a] + "</span>"; }).join("") + "</td><td>" + (p.yr >= 10 ? fStars(stars(p)) : "<small class='dim'>—</small>") + "</td><td>" + (p.of.length || "") + "</td></tr>"; }).join("");
    return '<div class="ph2"><h1>Roster</h1><p>' + all.length + " players · " + [9, 10, 11, 12].map(function (y) { return (yrs[y] || 0) + " " + yrLabel(y); }).join(" · ") + " · Team OVR " + tm(FR.user).ovr + '</p><div class="chips">' + chips + "</div></div>" +
      fCard("", '<div class="tscroll"><table class="ft big"><tr>' + th("num", "#") + th("name", "Player") + th("pos", "Pos") + th("yr", "Yr") + th("ov", "OVR") + th("pot", "POT", "hide-s") + '<th class="hide-s">Key ratings</th><th>Recruit</th>' + th("of", "Offers") + "</tr>" + rows + "</table></div>");
  },
  p_depth: function () {
    fixDepth(); var out = '<div class="ph2"><h1>Depth Chart</h1><p>Starters are highlighted. Injured players drop out of the lineup automatically until they heal.</p>' + fBtn("Auto-sort by OVR", "autodepth", "", "pri") + '</div><div class="fgrid g3">';
    POSL.forEach(function (pos) { var ids = FR.depth[pos]; out += fCard(pos + ' <small class="dim">' + START[pos] + " starter" + (START[pos] > 1 ? "s" : "") + "</small>", ids.map(function (pid, i) { var p = PL(pid);
      return '<div class="dr ' + (i < START[pos] ? "st" : "") + '"><span class="pr">' + (i + 1) + '</span><button class="lk" data-a="player" data-v="' + pid + '">' + fx(pnm(p)) + "</button><small>" + yrLabel(p.yr) + (p.inj ? ' <i class="inj">OUT</i>' : "") + "</small>" + fOv(p.ov) + fBtn("▲", "dup", pos + "|" + pid, "xs", i === 0) + fBtn("▼", "ddn", pos + "|" + pid, "xs", i === ids.length - 1) + "</div>"; }).join("")); });
    return out + "</div>";
  },
  p_practice: function () {
    return '<div class="ph2"><h1>Practice</h1><p>Pick the week\'s focus. It carries over until you change it.</p></div><div class="fgrid g3">' + PRACTICE.map(function (p) { return '<button class="opt ' + (FR.practice === p[0] ? "on" : "") + '" data-a="practice" data-v="' + p[0] + '"><b>' + p[1] + "</b><span>" + p[2] + "</span>" + (FR.practice === p[0] ? '<i class="pill ac">Current</i>' : "") + "</button>"; }).join("") + "</div>" +
      fCard("How practice works", '<p class="fnote">Offense and defense focus give a bump for Friday. Fundamentals help freshmen and sophomores grow. Conditioning sharpens everything but wears players down. Light weeks heal injuries faster. Your Practice Fields level lowers injury risk on every plan.</p>');
  },
  p_offers: function () {
    var mine = teamPlayers(FR.user), with_ = mine.filter(function (p) { return p.of.length; }).sort(function (a, b) { return (b.of.length ? COLLEGES[bestOfferTier(b)][1] : 0) - (a.of.length ? COLLEGES[bestOfferTier(a)][1] : 0) || b.of.length - a.of.length; });
    var tc = offerTierCount(), proj = 0; mine.forEach(function (p) { if (p.yr === 12 && p.of.length) proj += TIER_BONUS[COLLEGES[p.cm >= 0 ? p.cm : bestOfferTier(p)][1]]; });
    FR.newOffers = 0;
    var sum = '<div class="kpis">' + [4, 3, 2, 1, 0].map(function (i) { return '<div class="kpi"><small>' + TIER_NAME[i] + "</small><b>" + tc[i] + "</b><span>" + money(TIER_BONUS[i]) + " each</span></div>"; }).join("") + '<div class="kpi ac"><small>Projected Signing Day bonus</small><b>' + money(proj) + "</b><span>seniors with offers</span></div></div>";
    var rows = with_.map(function (p) { var bt = COLLEGES[bestOfferTier(p)];
      return '<tr><td><button class="lk" data-a="player" data-v="' + p.id + '">' + fx(pnm(p)) + "</button><br><small class='dim'>" + p.pos + " · " + yrLabel(p.yr) + " · OVR " + p.ov + "</small></td><td>" + fStars(stars(p)) + "</td><td class='offs'>" + p.of.slice().sort(function (a, b) { return COLLEGES[b][1] - COLLEGES[a][1]; }).slice(0, 6).map(fTier).join("") + (p.of.length > 6 ? '<small class="dim">+' + (p.of.length - 6) + "</small>" : "") + "</td><td>" + (p.cm >= 0 ? '<span class="pill gold">Committed: ' + fx(COLLEGES[p.cm][0]) + "</span>" : p.yr === 12 ? "Deciding" : "Building a list") + "</td><td>" + (p.cm < 0 ? fBtn("Send film", "film", p.id, "sm", FR.filmLeft <= 0) : "") + "</td></tr>"; }).join("");
    var cands = mine.filter(function (p) { return p.yr >= 10 && !p.of.length && stars(p) >= 1; }).sort(function (a, b) { return b.ov - a.ov; }).slice(0, 10);
    var crow = cands.map(function (p) { return '<tr><td><button class="lk" data-a="player" data-v="' + p.id + '">' + fx(pnm(p)) + "</button></td><td>" + p.pos + "</td><td>" + yrLabel(p.yr) + "</td><td>" + fOv(p.ov) + "</td><td>" + fStars(stars(p)) + "</td><td>" + (p.fx ? '<span class="pill">Film out</span>' : "") + "</td><td>" + fBtn("Send film", "film", p.id, "sm", FR.filmLeft <= 0) + "</td></tr>"; }).join("");
    var hist = (FR.signHist || []).slice(0, 6).map(function (h) { return '<div class="sh"><b>' + h.y + "</b>" + (h.s.length ? h.s.map(function (s) { return fx(s.n) + " (" + s.pos + ") → " + fTier(s.c); }).join("") : '<span class="dim">No signees</span>') + "</div>"; }).join("");
    return '<div class="ph2"><h1>College Offers</h1><p>College coaches watch your players all season. Offers come from performance, ratings and how much exposure your program has. Every senior who signs earns a booster bonus, and a program that sends players to college draws more move-in families.</p></div>' + sum +
      fCard("Players with offers", with_.length ? '<div class="tscroll"><table class="ft big"><tr><th>Player</th><th>Grade</th><th>Offers</th><th>Status</th><th></th></tr>' + rows + "</table></div>" : fEmpty("No offers yet. Win games and send film to get your players noticed."), { right: '<span class="pill">' + FR.filmLeft + " film packages left · $500 each</span>" }) +
      fCard("Prospects waiting on a first offer", crow ? '<div class="tscroll"><table class="ft"><tr><th>Player</th><th>Pos</th><th>Yr</th><th>OVR</th><th>Grade</th><th></th><th></th></tr>' + crow + "</table></div>" : fEmpty("Nobody right now.")) +
      fCard("Signing Day history", hist || fEmpty("Your first Signing Day comes after the season."));
  },
  p_feeder: function () {
    var sc = FR.scout, b = sc.board.slice().sort(function (a, c) { return c.sc - a.sc || (projOvr(c.tal) - projOvr(a.tal)); });
    var rows = b.map(function (f) { var r = feederRange(f), known = f.sc >= 30, pctS = Math.round(f.sc / 30 * 100), lo = r[0], hi = r[1];
      return "<tr><td><b>" + fx(f.f + " " + f.l) + "</b><br><small class='dim'>8th grade · " + f.pos + "</small></td><td><div class='rng'><span style='left:" + (lo - 20) / 0.79 + "%;width:" + Math.max(2, (hi - lo) / 0.79) + "%'></span></div><small>" + (known ? "Projects " + Math.round((lo + hi) / 2) : lo + "–" + hi) + " as a senior</small></td><td><div class='mtr'><span style='width:" + pctS + "%'></span></div><small>" + pctS + "% scouted" + (f.sc >= 18 ? " · " + ["Normal growth", "Quick learner", "Late bloomer"][f.dev] : "") + "</small></td><td><b class='" + (f.stay >= 75 ? "w" : f.stay < 60 ? "l" : "") + "'>" + f.stay + "%</b><br><small class='dim'>likely to stay</small></td><td class='acts'>" +
        (known ? "" : fBtn("Scout (6)", "scout", f.id, "sm", sc.pts < Math.min(6, 30 - f.sc)) + fBtn("Full report", "scoutall", f.id, "sm ghost", sc.pts < 30 - f.sc)) + (f.hosted ? '<span class="pill gold">Hosted</span>' : fBtn("Host Friday", "host", f.id, "sm", (sc.host || 0) <= 0)) + "</td></tr>"; }).join("");
    return '<div class="ph2"><h1>Feeder Scouting</h1><p>These are the 8th graders in your zone. AHSAA rules mean you can\'t recruit them, but you can scout them and invite their families to a Friday night. Anyone who stays in your zone enrolls as a freshman this summer. The rest go to private schools or move away.</p></div>' +
      '<div class="kpis"><div class="kpi ac"><small>Scouting points</small><b>' + sc.pts + '</b><span>earned every week</span></div><div class="kpi"><small>Hosting spots</small><b>' + (sc.host || 0) + '</b><span>this week</span></div><div class="kpi"><small>Feeder class</small><b>' + sc.board.length + "</b><span>8th graders</span></div></div>" +
      fCard("Feeder board", '<div class="tscroll"><table class="ft big"><tr><th>Prospect</th><th>Projected OVR</th><th>Report</th><th>Stay</th><th></th></tr>' + rows + "</table></div>");
  },
  p_staff: function () {
    var off = FR.phase === "offseason" && OFF_STEPS[FR.off.step] === "staff", out = '<div class="ph2"><h1>Coaching Staff</h1><p>' + (off ? "Hiring window is open. Pick replacements or upgrades below." : "Staff changes happen in the offseason. Good coordinators get poached when you win.") + " Staff supplements: " + money(staffCost()) + " a year.</p></div><div class='fgrid" + (off ? " g2" : "") + "'>";
    var cur = function (s) { return s ? '<div class="stf"><b>' + fx(s.n) + "</b>" + fStars(s.r) + '<span class="pill">' + fx(s.tr) + "</span><p>" + fx(s.td) + "</p><small class='dim'>" + money(s.sal) + "/yr · " + Math.max(0, s.yrs) + " yr left</small></div>" : fEmpty("Vacant"); };
    STAFF_ROLES.forEach(function (r) { var s = FR.staff[r];
      if (off && FR.off.staffPool) out += fCard(STAFF_NAME[r], '<div class="srow"><div><h4>Current</h4>' + cur(s) + "</div><div><h4>Candidates</h4>" + (FR.off.staffPool[r].map(function (c, i) { return '<div class="cand"><div><b>' + fx(c.n) + "</b> " + fStars(c.r) + '<br><span class="pill">' + fx(c.tr) + "</span> <small class='dim'>" + fx(c.td) + " · " + money(c.sal) + "/yr</small></div>" + fBtn(s ? "Replace" : "Hire", "hire", r + "|" + i, "sm pri") + "</div>"; }).join("") || fEmpty("No candidates left.")) + "</div></div>", { cls: "span2" });
      else out += fCard(STAFF_NAME[r], cur(s));
    });
    return out + "</div>";
  },
  p_facilities: function () {
    var out = '<div class="ph2"><h1>Facilities & Boosters</h1><p>The booster fund grows from home gates, weekly booster giving, playoff runs and Signing Day bonuses. Spend it on upgrades that build the program.</p></div><div class="kpis"><div class="kpi ac"><small>Booster fund</small><b>' + money(FR.funds) + '</b><span>available</span></div><div class="kpi"><small>Program prestige</small><b>' + Math.round(tm(FR.user).prestige) + '</b><span>' + fPrest(tm(FR.user).prestige) + '</span></div><div class="kpi"><small>Exposure</small><b>' + Math.round(FR.exposure) + "</b><span>college visibility</span></div></div><div class='fgrid g3'>";
    FAC.forEach(function (k) { var lv = FR.fac[k], c = facCost(k);
      out += fCard(FAC_NAME[k], '<div class="pips">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= lv ? "on" : "") + '"></i>'; }).join("") + "</div><p class='fnote'>" + FAC_DESC[k] + "</p>" + (lv >= 5 ? '<span class="pill gold">Maxed</span>' : fBtn("Upgrade · " + money(c), "fac", k, FR.funds >= c ? "pri" : "", FR.funds < c))); });
    out += "</div>" + fCard("Ledger", FR.ledger.length ? '<table class="ft">' + FR.ledger.slice(0, 25).map(function (l) { return "<tr><td>" + l.y + "</td><td>" + fx(l.x) + '</td><td class="' + (l.v >= 0 ? "w" : "l") + '">' + (l.v >= 0 ? "+" : "") + money(l.v) + "</td></tr>"; }).join("") + "</table>" : fEmpty("No transactions yet."));
    return out;
  },
  p_news: function () { return '<div class="ph2"><h1>News</h1></div>' + fCard("", FUI.newsList(200)); },
  p_records: function () {
    var book = function (b, title) { return fCard(title, '<table class="ft">' + REC_KEYS.map(function (k) { var r = b[k[0]]; return "<tr><td>" + k[1] + "</td><td>" + (r ? "<b>" + r.v + "</b>" : "—") + "</td><td>" + (r ? fx(r.n) + " <small class='dim'>" + r.y + (r.x ? " · " + fx(r.x) : "") + "</small>" : "") + "</td></tr>"; }).join("") + "</table>"); };
    var tr = FR.rec.t, team = '<table class="ft"><tr><td>Most points in a game</td><td>' + (tr.pts ? "<b>" + tr.pts.v + "</b> <small class='dim'>" + tr.pts.y + " " + fx(tr.pts.x) + "</small>" : "—") + "</td></tr><tr><td>Most wins in a season</td><td>" + (tr.wins ? "<b>" + tr.wins.v + "</b> <small class='dim'>" + tr.wins.y + "</small>" : "—") + "</td></tr></table>";
    return '<div class="ph2"><h1>' + fx(tm(FR.user).name) + ' Record Book</h1><p>School records start the day you take over.</p></div><div class="fgrid g3">' + book(FR.rec.g, "Single game") + book(FR.rec.s, "Single season") + book(FR.rec.c, "Career") + fCard("Team", team) + "</div>";
  },
  p_history: function () {
    var c = FR.coach, hist = FR.hist.map(function (h) { return "<tr><td>" + h.y + "</td><td><b>" + h.w + "-" + h.l + "</b></td><td>" + h.rw + "-" + h.rl + " · " + ordinal(h.place) + "</td><td>" + fx(h.res) + "</td><td>" + (h.rank ? "#" + h.rank : "—") + "</td><td class='hide-s'>" + fx(tm(h.c6).name) + " / " + fx(tm(h.c5).name) + "</td></tr>"; }).join("");
    var aw = Object.keys(FR.awards).sort().reverse().map(function (y) { var a = FR.awards[y], nm = function (pid) { var o = a.names[pid]; return o ? fx(o.n) + " <small class='dim'>" + o.pos + ", " + fx(tm(o.t).name) + "</small>" : "—"; };
      var mineAS = []; ["5A", "6A"].forEach(function (cl2) { POSL.forEach(function (pos) { a.allstate[cl2][pos].forEach(function (pid) { var o = a.names[pid]; if (o && o.t === FR.user) mineAS.push(fx(o.n) + " (" + pos + ")"); }); }); });
      var mineAR = []; POSL.forEach(function (pos) { a.region[pos].forEach(function (pid) { var o = a.names[pid]; if (o && o.t === FR.user) mineAR.push(fx(o.n) + " (" + pos + ")"); }); });
      return fCard(y + " Awards", '<table class="ft"><tr><td>Mr. Football</td><td>' + nm(a.mrfb) + "</td></tr><tr><td>6A Player of the Year</td><td>" + nm(a.poy["6A"]) + "</td></tr><tr><td>5A Player of the Year</td><td>" + nm(a.poy["5A"]) + "</td></tr><tr><td>6A Lineman of the Year</td><td>" + nm(a.line["6A"]) + "</td></tr><tr><td>5A Lineman of the Year</td><td>" + nm(a.line["5A"]) + "</td></tr><tr><td>Coaches of the Year</td><td>" + fx(tm(a.coy["6A"]).coach) + " (" + fx(tm(a.coy["6A"]).name) + "), " + fx(tm(a.coy["5A"]).coach) + " (" + fx(tm(a.coy["5A"]).name) + ")</td></tr><tr><td>Your All-State</td><td>" + (mineAS.join(", ") || "—") + "</td></tr><tr><td>Your All-Region</td><td>" + (mineAR.join(", ") || "—") + "</td></tr></table>"); }).join("");
    return '<div class="ph2"><h1>History & Awards</h1></div><div class="kpis"><div class="kpi ac"><small>' + fx(c.name) + '</small><b>' + c.w + "-" + c.l + '</b><span>career record</span></div><div class="kpi"><small>State titles</small><b>' + c.tt + '</b><span>' + c.seasons + " seasons</span></div><div class='kpi'><small>Playoff record</small><b>" + c.pw + "-" + c.pl + "</b><span>postseason</span></div><div class='kpi'><small>Coach reputation</small><b>" + Math.round(c.rep) + "</b><span>out of 100</span></div></div>" +
      fCard("Season by season", hist ? '<table class="ft"><tr><th>Year</th><th>Record</th><th>Region</th><th>Postseason</th><th>Final rank</th><th class="hide-s">Champions (6A / 5A)</th></tr>' + hist + "</table>" : fEmpty("Finish your first season to start the history book.")) + '<div class="fgrid">' + aw + "</div>";
  },
  p_settings: function () {
    return '<div class="ph2"><h1>Settings</h1></div><div class="fgrid">' + fCard("Head coach", '<label class="fl">Your name<input data-in="rename" maxlength="24" value="' + fx(FR.coach.name) + '"></label>') +
      fCard("Played games", '<label class="fl">Quarter length when you hit Play<select data-ch="qmin">' + [1, 2, 3, 4, 5].map(function (q) { return '<option value="' + q + '"' + (FR.settings.qmin === q ? " selected" : "") + ">" + q + " minutes</option>"; }).join("") + "</select></label><p class='fnote'>Simmed and watched games always use full 12-minute quarters.</p>") +
      fCard("Save", "<p class='fnote'>Your program saves after every action. Save slot " + (FR.slot + 1) + (FR.saveErr ? " — <b class='l'>browser storage is full; progress may not save.</b>" : ".") + "</p>" + fBtn("Switch program", "nav", "programs", "") + fBtn("Save & exit to title", "exit", "", "ghost")) + "</div>";
  },
  p_offseason: function () {
    if (FR.phase !== "offseason") return FUI.p_home();
    var o = FR.off, st = OFF_STEPS[o.step], chips = '<div class="steps">' + OFF_STEPS.map(function (s, i) { return '<span class="stp ' + (i < o.step ? "done" : i === o.step ? "on" : "") + '"><i>' + (i < o.step ? "✓" : i + 1) + "</i>" + OFF_NAME[s] + "</span>"; }).join("") + "</div>";
    var next = { awards: "Continue to Signing Day ▸", signing: "Continue to Graduation ▸", graduation: "Continue to Coaching Staff ▸", staff: "Continue to Facilities ▸", facilities: "Continue to Freshman Class ▸", feeder: "Enroll freshmen ▸", moveins: "Finish move-ins & start summer training ▸", training: "Continue ▸", ready: "Start the " + (FR.year + 1) + " season ▸" }[st];
    var body = "", h = FR.hist[0], aw = FR.awards[FR.year], nm = function (pid) { var x = aw && aw.names[pid]; return x ? fx(x.n) + " <small class='dim'>" + x.pos + ", " + fx(tm(x.t).name) + "</small>" : "—"; };
    if (st === "awards") {
      var mine = []; ["5A", "6A"].forEach(function (c) { POSL.forEach(function (pos) { aw.allstate[c][pos].forEach(function (pid) { var x = aw.names[pid]; if (x && x.t === FR.user) mine.push("<li>" + fx(x.n) + " <small class='dim'>" + pos + ", " + yrLabel(x.yr) + "</small></li>"); }); }); });
      var reg = []; POSL.forEach(function (pos) { aw.region[pos].forEach(function (pid) { var x = aw.names[pid]; if (x) reg.push("<li class='" + (x.t === FR.user ? "me" : "") + "'>" + pos + " · " + fx(x.n) + " <small class='dim'>" + fx(tm(x.t).name) + "</small></li>"); }); });
      body = '<div class="fgrid">' + fCard("Your " + FR.year + " season", '<div class="big2">' + h.w + "-" + h.l + '</div><p>' + fx(h.res) + " · " + ordinal(h.place) + " in Region " + tm(FR.user).reg + (h.rank ? " · Final rank #" + h.rank : "") + "</p>") +
        fCard("State champions", '<div class="champ sm">' + fBadge(tm(h.c6), 40) + "<div><small>Class 6A</small><b>" + fx(tm(h.c6).name) + '</b></div></div><div class="champ sm">' + fBadge(tm(h.c5), 40) + "<div><small>Class 5A</small><b>" + fx(tm(h.c5).name) + "</b></div></div>") +
        fCard("Statewide awards", '<table class="ft"><tr><td>Mr. Football</td><td>' + nm(aw.mrfb) + "</td></tr><tr><td>6A Player of the Year</td><td>" + nm(aw.poy["6A"]) + "</td></tr><tr><td>5A Player of the Year</td><td>" + nm(aw.poy["5A"]) + "</td></tr><tr><td>6A Lineman</td><td>" + nm(aw.line["6A"]) + "</td></tr><tr><td>5A Lineman</td><td>" + nm(aw.line["5A"]) + "</td></tr></table>") +
        fCard("Your All-State players", mine.length ? "<ul class='ul'>" + mine.join("") + "</ul>" : fEmpty("None this year.")) + fCard("All-Region team", "<ul class='ul cols'>" + reg.join("") + "</ul>", { cls: "span2" }) + "</div>";
    } else if (st === "signing") {
      var tot = 0; o.signed.forEach(function (s) { tot += s.b; });
      body = fCard("Signing Day", o.signed.length ? '<table class="ft big"><tr><th>Player</th><th>Pos</th><th>College</th><th>Level</th><th>Booster bonus</th></tr>' + o.signed.map(function (s) { return "<tr><td><b>" + fx(s.n) + "</b></td><td>" + s.pos + "</td><td>" + fTier(s.c) + "</td><td>" + TIER_NAME[COLLEGES[s.c][1]] + '</td><td class="w">+' + money(s.b) + "</td></tr>"; }).join("") + '</table><div class="tot">Boosters added <b class="w">' + money(tot) + "</b> to the fund. Every signee also raises your exposure and prestige, which brings in more move-in families.</div>" : fEmpty("No seniors signed this year. Send highlight film and win games to get your players offers."));
    } else if (st === "graduation") {
      body = fCard(o.grads.length + " seniors graduate", '<table class="ft"><tr><th>Player</th><th>Pos</th><th>OVR</th><th>Next stop</th></tr>' + o.grads.sort(function (a, b) { return b.ov - a.ov; }).map(function (g) { return "<tr><td>" + fx(g.n) + "</td><td>" + g.pos + "</td><td>" + fOv(g.ov) + "</td><td>" + (g.c >= 0 ? fTier(g.c) : "<span class='dim'>—</span>") + "</td></tr>"; }).join("") + "</table>");
    } else if (st === "staff") body = FUI.p_staff().replace(/^<div class="ph2">.*?<\/div>/, "");
    else if (st === "facilities") body = FUI.p_facilities().replace(/^<div class="ph2">.*?<\/div>/, "");
    else if (st === "feeder") body = '<p class="fnote">Last chance to use your scouting points. When you continue, every prospect decides whether to enroll.</p>' + FUI.p_feeder().replace(/^<div class="ph2">.*?<\/div>/, "");
    else if (st === "moveins") {
      var fl = o.freshLog || [], stay = fl.filter(function (f) { return f.ok; });
      body = fCard("Freshman class: " + stay.length + " of " + fl.length + " feeder prospects enrolled", fl.map(function (f) { return '<span class="pill ' + (f.ok ? "ac" : "ghost") + '">' + fx(f.n) + " · " + f.pos + (f.ok ? " · " + f.ov : " · went elsewhere") + "</span>"; }).join(" ")) +
        fCard("Move-in families", '<p class="fnote">These families are relocating to the area and are deciding where to live. Players with good college offers, a winning record, exposure and a strong locker room all make your zone more attractive. You have <b>' + o.pitches + "</b> family visit" + (o.pitches === 1 ? "" : "s") + " left.</p>" + '<div class="tscroll"><table class="ft big"><tr><th>Player</th><th>Pos</th><th>Grade</th><th>OVR</th><th>From</th><th>Also considering</th><th>Your odds</th><th></th></tr>' +
          (o.moveins || []).map(function (m) { var od = moveinOdds(m); return "<tr><td><b>" + fx(m.f + " " + m.l) + "</b></td><td>" + m.pos + "</td><td>" + yrLabel(m.yr) + "</td><td>" + fOv(m.ov) + "</td><td>" + fx(m.from) + "</td><td>" + m.others.map(function (id) { return fBadge(tm(id), 18) + " " + fx(tm(id).abbr); }).join(" ") + '</td><td><b class="' + (od >= 50 ? "w" : "") + '">' + od + "%</b></td><td>" + (m.pitched ? '<span class="pill gold">Visited</span>' : fBtn("Family visit", "pitch", m.id, "sm", o.pitches <= 0)) + "</td></tr>"; }).join("") + "</table></div>");
    } else if (st === "training") {
      var res = (o.moveins || []).filter(function (m) { return m.res === FR.user; });
      body = '<div class="fgrid">' + fCard("Summer training: biggest jumps", o.trainLog.length ? o.trainLog.map(function (x) { var p = PL(x.id); return p ? '<div class="dr"><button class="lk" data-a="player" data-v="' + p.id + '">' + fx(pnm(p)) + "</button><small>" + p.pos + " · " + yrLabel(p.yr) + "</small>" + fOv(p.ov) + '<b class="w">+' + x.d + "</b></div>" : ""; }).join("") : fEmpty("Steady gains across the roster.")) +
        fCard("Move-ins who chose you", res.length ? res.map(function (m) { return '<div class="dr"><b>' + fx(m.f + " " + m.l) + "</b><small>" + m.pos + " · " + yrLabel(m.yr) + "</small>" + fOv(m.ov) + "</div>"; }).join("") : fEmpty("None this year.")) + "</div>";
    } else if (st === "ready") {
      body = fCard("Ready for " + (FR.year + 1), '<p>Your roster has ' + teamPlayers(FR.user).length + " players. Team OVR is now " + refreshOvr(FR.user) + ". The new schedule is built when you start the season. Set the depth chart and practice plan before the opener.</p>" + fBtn("Depth chart", "nav", "depth", "") + fBtn("Roster", "nav", "roster", "ghost"));
    }
    return '<div class="ph2"><h1>' + FR.year + " Offseason</h1>" + chips + "</div>" + body + '<div class="offnav">' + fBtn(next, "offnext", "", "pri big") + "</div>";
  },
  // ---------- programs / new ----------
  pPrograms: function () {
    var out = '<div class="solohead"><div class="brand"><span class="bl">FRIDAY NIGHT</span><span class="bb">BLITZ</span><small>Franchise · Alabama 5A & 6A</small></div><p>Take over a real Alabama high school program. Build it through the feeder system, move-ins, college offers, staff and facilities. Play the games yourself, watch them, or sim the whole season.</p></div>' + FUI.acctBar() + '<div class="slots">';
    for (var i = 0; i < FR_SLOTS; i++) { var s = frSlotInfo(i);
      if (s) out += '<div class="slot"><div class="slt">' + fBadge({ name: s.name, c1: s.c1, c2: s.c2 }, 54) + "<div><b>" + fx(s.name) + " " + fx(s.mascot) + "</b><small>" + fx(s.coach) + " · " + s.cls + " · " + s.year + " " + (s.phase === "offseason" ? "offseason" : s.phase === "preseason" ? "preseason" : s.phase === "playoffs" ? "playoffs" : "week " + (s.week + 1)) + "</small><small>Career " + s.cw + "-" + s.cl + " · " + s.tt + " state title" + (s.tt === 1 ? "" : "s") + "</small></div></div>" + fBtn("Continue", "slot", i, "pri") + fBtn(FUI.delArm === i ? "Tap again to delete" : "Delete", "delslot", i, "ghost" + (FUI.delArm === i ? " danger" : "")) + "</div>";
      else out += '<div class="slot empty2"><div><b>Slot ' + (i + 1) + "</b><small>Empty</small></div>" + fBtn("New program", "newslot", i, "pri") + "</div>"; }
    return out + '</div><div class="center">' + fBtn("◀ Back to title", "title", "", "ghost") + "</div>";
  },
  pNew: function () {
    var n = FUI.newSt, list = FR.teams.filter(function (t) { return t.cls === n.cls && (!n.reg || t.reg === n.reg); }).sort(function (a, b) { return a.reg - b.reg || a.name.localeCompare(b.name); });
    var regs = '<div class="chips">' + fBtn("All regions", "nreg", 0, !n.reg ? "on" : "") + AL_LEAGUE[n.cls].map(function (_, i) { return fBtn("Region " + (i + 1), "nreg", i + 1, n.reg === i + 1 ? "on" : ""); }).join("") + "</div>";
    var grid = '<div class="sgrid">' + list.map(function (t) { return '<button class="sch ' + (n.pick === t.id ? "on" : "") + '" data-a="npick" data-v="' + t.id + '" style="--c1:' + t.c1 + '">' + fBadge(t, 44) + '<div><b>' + fx(t.name) + "</b><small>" + fx(t.mascot) + " · Region " + t.reg + "</small><small>" + fPrest(t.prestige) + " · OVR " + t.ovr + "</small></div></button>"; }).join("") + "</div>";
    var pick = n.pick >= 0 ? tm(n.pick) : null, conf = "";
    if (pick) { var lu = lineupOf(pick.id), best = teamPlayers(pick.id).sort(function (a, b) { return b.ov - a.ov; }).slice(0, 3);
      conf = '<div class="confirm" style="--c1:' + pick.c1 + '">' + fBadge(pick, 64) + '<div class="cfi"><small>' + pick.cls + " Region " + pick.reg + "</small><h2>" + fx(pick.name + " " + pick.mascot) + "</h2><p>Prestige " + fPrest(pick.prestige) + " · Team OVR " + pick.ovr + " · OFF " + pick.off + " · DEF " + pick.def + "</p><p class='dim'>Best players: " + best.map(function (p) { return fx(pnm(p)) + " (" + p.pos + ", " + p.ov + ")"; }).join(", ") + "</p>" + (pick.unsure ? "<p class='fnote'>School colors for this program are our best guess.</p>" : "") + "</div>" + fBtn("Take the job ▸", "ncreate", "", "pri big") + "</div>"; }
    return '<div class="solohead"><h1>New program</h1><p>Players are fictional; schools, mascots, colors and regions follow the AHSAA 2026-28 alignment.</p></div>' +
      '<div class="newbar"><label class="fl">Coach name<input data-in="coach" maxlength="24" value="' + fx(n.coach) + '"></label><div class="seg">' + fBtn("Class 6A · 32 schools", "ncls", "6A", n.cls === "6A" ? "on" : "") + fBtn("Class 5A · 63 schools", "ncls", "5A", n.cls === "5A" ? "on" : "") + "</div></div>" + regs + conf + grid + '<div class="center">' + fBtn("◀ Back", "nback", "", "ghost") + "</div>";
  },

  // ---------- modals ----------
  mAhead: function () {
    var opts = FR.phase === "playoffs" ? [["1", "One round"], ["out", "Until my season ends"], ["end", "To the offseason"]] : [["1", "One week"], ["region", "To region play (Week 4)"], ["playoffs", "To the playoffs"], ["end", "Through the state championship"]];
    return "<h2>Sim ahead</h2><p class='fnote'>Your staff coaches every game in this stretch. Injuries, offers and news still happen.</p><div class='optl'>" + opts.map(function (o) { return fBtn(o[1], "simto", o[0], "big"); }).join("") + "</div>";
  },
  mBox: function (g) {
    if (!g) return ""; var H = tm(g.h), A = tm(g.a), lines = g.lines || {}, hasL = !!g.lines;
    var qs = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], prev = [0, 0], ot = false;
    (g.scoring || []).forEach(function (s) { var qi = Math.min(5, s.q) - 1; if (qi === 4) ot = true; qs[0][qi] += s.h - prev[0]; qs[1][qi] += s.a - prev[1]; prev = [s.h, s.a]; });
    var line = (g.scoring && g.scoring.length) ? '<table class="ft lsc"><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th>' + (ot ? "<th>OT</th>" : "") + "<th>T</th></tr>" + [[A, 1, g.as], [H, 0, g.hs]].map(function (r) { return "<tr><td>" + fBadge(r[0], 20) + " " + fx(r[0].abbr) + "</td>" + qs[r[1]].slice(0, ot ? 5 : 4).map(function (v) { return "<td>" + v + "</td>"; }).join("") + "<td><b>" + r[2] + "</b></td></tr>"; }).join("") + "</table>" : "";
    var tot = function (tid) { var t = { py: 0, pc: 0, pa: 0, ry: 0, ra: 0, pint: 0, sk: 0 }; for (var k in lines) { var l = lines[k]; if (l.t !== tid) continue; t.py += l.py; t.pc += l.pc; t.pa += l.pa; t.ry += l.ry; t.ra += l.ra; t.pint += l.pint; } for (var k2 in lines) { if (lines[k2].t !== tid) t.sk += 0; } return t; };
    var tH = tot(g.h), tA = tot(g.a);
    var team = hasL ? '<table class="ft"><tr><th></th><th>' + fx(A.abbr) + "</th><th>" + fx(H.abbr) + "</th></tr><tr><td>Total yards</td><td>" + (tA.py + tA.ry) + "</td><td>" + (tH.py + tH.ry) + "</td></tr><tr><td>Passing</td><td>" + tA.pc + "/" + tA.pa + ", " + tA.py + "</td><td>" + tH.pc + "/" + tH.pa + ", " + tH.py + "</td></tr><tr><td>Rushing</td><td>" + tA.ra + "-" + tA.ry + "</td><td>" + tH.ra + "-" + tH.ry + "</td></tr><tr><td>Interceptions thrown</td><td>" + tA.pint + "</td><td>" + tH.pint + "</td></tr>" + (g.ts && g.ts[0] && g.ts[0].fd ? "<tr><td>First downs</td><td>" + g.ts[1].fd + "</td><td>" + g.ts[0].fd + "</td></tr>" : "") + "</table>" : "";
    var ind = function (tid) { var ls = []; for (var k in lines) if (lines[k].t === tid) ls.push(Object.assign({ id: k }, lines[k])); var by = function (f) { return ls.filter(function (l) { return l[f] > 0; }).sort(function (a, b) { return b[f] - a[f]; }); };
      var lk = function (l) { return PL(l.id) ? '<button class="lk" data-a="player" data-v="' + l.id + '">' + fx(l.n) + "</button>" : fx(l.n); };
      return '<div class="bxs"><h4>' + fx(tm(tid).name) + "</h4>" +
        by("pa").slice(0, 1).map(function (l) { return "<div><small>PASS</small>" + lk(l) + " " + l.pc + "/" + l.pa + ", " + l.py + " yds, " + l.ptd + " TD" + (l.pint ? ", " + l.pint + " INT" : "") + "</div>"; }).join("") +
        by("ra").slice(0, 3).map(function (l) { return "<div><small>RUSH</small>" + lk(l) + " " + l.ra + " car, " + l.ry + " yds" + (l.rtd ? ", " + l.rtd + " TD" : "") + "</div>"; }).join("") +
        by("rec").slice(0, 3).map(function (l) { return "<div><small>REC</small>" + lk(l) + " " + l.rec + " rec, " + l.rcy + " yds" + (l.rctd ? ", " + l.rctd + " TD" : "") + "</div>"; }).join("") +
        by("tk").slice(0, 3).map(function (l) { return "<div><small>DEF</small>" + lk(l) + " " + l.tk + " tkl" + (l.sk ? ", " + l.sk + " sk" : "") + (l.int ? ", " + l.int + " INT" : "") + "</div>"; }).join("") + "</div>"; };
    var scor = (g.scoring || []).map(function (s) { return '<div class="scr2"><span>' + (s.q > 4 ? "OT" : "Q" + s.q) + " " + fx(s.c) + "</span>" + fBadge(tm(s.t), 18) + "<span>" + fx(s.x) + "</span><b>" + s.a + "-" + s.h + "</b></div>"; }).join("");
    var top = !hasL && g.top ? '<div class="fnote">Top performers: ' + g.top.map(function (id) { var p = PL(id); return p ? fx(pnm(p)) + " (" + fx(tm(p.t).abbr) + ")" : ""; }).filter(Boolean).join(", ") + "</div>" : "";
    return '<div class="bxh"><div>' + fBadge(A, 48) + "<b>" + fx(A.name) + "</b><strong>" + g.as + '</strong></div><span>FINAL' + (ot ? "/OT" : "") + "</span><div><strong>" + g.hs + "</strong><b>" + fx(H.name) + "</b>" + fBadge(H, 48) + "</div></div>" + line + (hasL ? '<div class="bxg">' + ind(g.a) + ind(g.h) + "</div>" + team : top) + (scor ? "<h4>Scoring</h4>" + scor : "");
  },
  mPlayer: function (id) {
    var p = PL(id); if (!p) return fEmpty("This player has graduated."); var t = tm(p.t), mine = p.t === FR.user, ka = KEY_ATTRS[p.pos];
    var bars = ATTRS.map(function (a) { return '<div class="ab ' + (ka.indexOf(a) >= 0 ? "key" : "") + '"><span>' + ATTR_NAME[a] + '</span><div><i style="width:' + p.a[a] + '%"></i></div><b>' + p.a[a] + "</b></div>"; }).join("");
    var stt = function (s, lbl) { return "<tr><td>" + lbl + "</td><td>" + (s.gp || 0) + "</td><td>" + (s.pa ? s.pc + "/" + s.pa + ", " + s.py + ", " + s.ptd + " TD" : "—") + "</td><td>" + (s.ra ? s.ra + "-" + s.ry + ", " + s.rtd + " TD" : "—") + "</td><td>" + (s.rec ? s.rec + "-" + s.rcy + ", " + s.rctd + " TD" : "—") + "</td><td>" + (s.tk || s.int ? s.tk + " tkl, " + s.sk + " sk, " + s.int + " INT" : "—") + "</td></tr>"; };
    var car = {}; SKEYS.forEach(function (k) { car[k] = (p.cs[k] || 0) + (p.st[k] || 0); });
    var acts = mine ? '<div class="pacts">' + (p.cm < 0 && p.yr >= 10 ? fBtn("Send highlight film · $500", "film", p.id, "pri", FR.filmLeft <= 0) : "") + '<label class="fl inl">Position<select data-ch="posch" data-v="' + p.id + '">' + POSL.map(function (x) { return '<option value="' + x + '"' + (x === p.pos ? " selected" : "") + ">" + x + " · " + ovrFor(p, x) + "</option>"; }).join("") + "</select></label></div>" : "";
    return '<div class="phd" style="--c1:' + t.c1 + '"><canvas class="pv big" width="36" height="18" data-pv="' + t.id + "|" + p.id + '"></canvas><div><small>#' + p.num + " · " + p.pos + " · " + yrLabel(p.yr) + " · " + fx(t.name) + '</small><h2>' + fx(pnm(p)) + "</h2><p>" + fDev(p) + (p.yr >= 10 ? " · " + fStars(stars(p)) : "") + (p.inj ? ' · <i class="inj">Injured, out ' + p.inj + " wk</i>" : "") + (p.cm >= 0 ? ' · <span class="pill gold">Committed to ' + fx(COLLEGES[p.cm][0]) + "</span>" : "") + '</p></div><div class="ovbig"><small>OVR</small>' + p.ov + "<small>POT " + p.pot + "</small></div></div>" +
      acts + '<div class="pgrid"><div>' + bars + "</div><div><h4>Stats</h4><div class='tscroll'><table class='ft'><tr><th></th><th>GP</th><th>Pass</th><th>Rush</th><th>Rec</th><th>Def</th></tr>" + stt(p.st, FR.year) + stt(car, "Career") + "</table></div><h4>College offers (" + p.of.length + ")</h4><div class='offs'>" + (p.of.length ? p.of.slice().sort(function (a, b) { return COLLEGES[b][1] - COLLEGES[a][1]; }).map(fTier).join("") : '<span class="dim">None yet</span>') + "</div></div></div>";
  },
  mTeam: function (id) {
    FUI.gref = FUI.gref || []; var t = tm(id), u = unitRatings(id), ps = teamPlayers(id).sort(function (a, b) { return POSL.indexOf(a.pos) - POSL.indexOf(b.pos) || b.ov - a.ov; });
    var sch = ""; for (var w = 0; w < FR.sched.length; w++) { var g = gameOf(id, w); if (!g) continue; var us = g.h === id, o = us ? g.a : g.h; sch += "<tr><td>" + (w + 1) + "</td><td>" + (us ? "vs " : "at ") + fx(tm(o).name) + "</td><td>" + (g.done ? '<b class="' + ((us ? g.hs > g.as : g.as > g.hs) ? "w" : "l") + '">' + (us ? g.hs + "-" + g.as : g.as + "-" + g.hs) + "</b> " + FUI.boxLink(g) : "") + "</td></tr>"; }
    return '<div class="phd" style="--c1:' + t.c1 + '"><canvas class="pv big" width="36" height="18" data-pv="' + id + '"></canvas>' + fBadge(t, 64) + "<div><small>" + t.cls + " Region " + t.reg + " · Coach " + fx(t.coach) + "</small><h2>" + fx(t.name + " " + t.mascot) + "</h2><p>" + fRec(t) + " (" + t.rw + "-" + t.rl + " region) · " + ordinal(regionPlace(id)) + " in region" + (rankOf(id) ? " · No. " + rankOf(id) + " " + t.cls : "") + " · Prestige " + fPrest(t.prestige) + '</p></div><div class="ovbig"><small>OVR</small>' + t.ovr + "<small>OFF " + Math.round(u.off) + " · DEF " + Math.round(u.def) + "</small></div></div>" +
      '<div class="pgrid"><div><h4>Roster</h4><div class="tscroll"><table class="ft"><tr><th>#</th><th>Player</th><th>Pos</th><th>Yr</th><th>OVR</th></tr>' + ps.map(function (p) { return '<tr class="click" data-a="player" data-v="' + p.id + '"><td>' + p.num + "</td><td>" + fx(pnm(p)) + "</td><td>" + p.pos + "</td><td>" + yrLabel(p.yr) + "</td><td>" + fOv(p.ov) + "</td></tr>"; }).join("") + "</table></div></div><div><h4>Schedule</h4><table class='ft'>" + sch + "</table>" + (t.hist.length ? "<h4>Recent seasons</h4><div class='fnote'>" + t.hist.slice(0, 6).map(function (h) { return h.y + ": " + h.w + "-" + h.l; }).join(" · ") + "</div>" : "") + "</div></div>";
  }
};
function bestOfferTier(p) { var b = p.of[0]; p.of.forEach(function (ci) { if (COLLEGES[ci][1] > COLLEGES[b][1]) b = ci; }); return b; }

// ---------- accounts & admin ----------
function fAgo(t) { if (!t) return "—"; var d = (Date.now() - new Date(t).getTime()) / 1000; if (d < 90) return "just now"; if (d < 3600) return Math.round(d / 60) + "m ago"; if (d < 86400) return Math.round(d / 3600) + "h ago"; if (d < 86400 * 30) return Math.round(d / 86400) + "d ago"; return new Date(t).toLocaleDateString(); }
function fDate(t) { return t ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"; }
Object.assign(FUI, {
  acct: null, adm: null,
  acctBar: function () {
    if (!Cloud.on()) return "";
    var note = Cloud.notice ? '<div class="ftoast2"><b>' + fx(Cloud.notice) + "</b>" + fBtn("✕", "unnotice", "", "sm ghost") + "</div>" : "";
    if (!Cloud.signedIn()) return note + '<div class="acctbar"><div><b>Playing as a guest</b><span>Sign in to keep your programs in the cloud and pick them up on any device.</span></div>' + fBtn("Sign in", "acct", "in", "pri") + fBtn("Create account", "acct", "up", "") + "</div>";
    return note + '<div class="acctbar in"><div><b>' + fx(Cloud.email()) + "</b><span>" + (Cloud.busy ? "Syncing…" : fx(Cloud.status || "Signed in")) + "</span></div>" + (Cloud.me.admin ? fBtn("Admin", "admin", "", "pri") : "") + fBtn("Account", "acct", "", "") + "</div>";
  },
  mAcct: function () {
    var a = FUI.acct || (FUI.acct = { mode: "in", email: "", pw: "", msg: "", err: "" });
    if (Cloud.signedIn() && a.mode !== "newpw") return "<h2>Account</h2><p>Signed in as <b>" + fx(Cloud.email()) + "</b>" + (Cloud.me.admin ? ' <span class="pill gold">Admin</span>' : "") + "</p><p class='fnote'>" + (Cloud.me.banned ? "This account has been disabled. Your programs are saved on this device only." : "Your franchise saves sync to the cloud a few seconds after each change. Open the game on another device and sign in to pick up where you left off.") + " Status: " + fx(Cloud.busy ? "Syncing…" : Cloud.status || "Signed in") + "</p>" +
      (a.msg ? '<div class="ok">' + fx(a.msg) + "</div>" : "") + (a.err ? '<div class="err">' + fx(a.err) + "</div>" : "") + '<div class="pacts">' + fBtn("Sync now", "acct-sync", "", "") + fBtn("Change password", "acct-mode", "newpw", "ghost") + (Cloud.me.admin ? fBtn("Admin area", "admin", "", "pri") : "") + fBtn("Sign out", "acct-out", "", "ghost danger") + "</div>";
    var tabs = a.mode === "newpw" ? "" : '<div class="seg">' + fBtn("Sign in", "acct-mode", "in", a.mode === "in" ? "on" : "") + fBtn("Create account", "acct-mode", "up", a.mode === "up" ? "on" : "") + fBtn("Forgot password", "acct-mode", "forgot", a.mode === "forgot" ? "on" : "") + "</div>";
    var em = a.mode === "newpw" ? "" : '<label class="fl">Email<input data-in="ae" type="email" autocomplete="email" value="' + fx(a.email) + '"></label>';
    var pw = a.mode === "forgot" ? "" : '<label class="fl">' + (a.mode === "newpw" ? "New password" : "Password") + '<input data-in="ap" type="password" autocomplete="' + (a.mode === "in" ? "current-password" : "new-password") + '" value="' + fx(a.pw) + '"></label>' + (a.mode !== "in" ? "<small class='dim'>At least 6 characters.</small>" : "");
    var go = { in: "Sign in", up: "Create account", forgot: "Email me a reset link", newpw: "Save new password" }[a.mode];
    return "<h2>" + (a.mode === "newpw" ? "Set a new password" : "Your account") + "</h2><p class='fnote'>Accounts are optional. Signing in saves your franchise programs to the cloud so you can play on any device. Programs you started as a guest on this device move into your account the first time you sign in.</p>" + tabs +
      '<div class="aform">' + em + pw + (a.err ? '<div class="err">' + fx(a.err) + "</div>" : "") + (a.msg ? '<div class="ok">' + fx(a.msg) + "</div>" : "") + fBtn(a.busy ? "Working…" : go, "acct-go", "", "pri big", a.busy) + "</div>";
  },
  acctGo: function () {
    var a = FUI.acct, em = (a.email || "").trim(), pw = a.pw || "", p;
    a.err = ""; a.msg = "";
    if (a.mode !== "newpw" && !/^\S+@\S+\.\S+$/.test(em)) { a.err = "Enter a valid email."; FUI.render(); return; }
    if (a.mode !== "forgot" && pw.length < 6) { a.err = "Passwords need at least 6 characters."; FUI.render(); return; }
    a.busy = true; FUI.render();
    if (a.mode === "in") p = Cloud.signIn(em, pw).then(function () { if (!Cloud.signedIn()) throw new Error(Cloud.status || "Couldn't sign in."); FUI.afterAuth(); });
    else if (a.mode === "up") p = Cloud.signUp(em, pw).then(function (r) { if (r === "confirm") { a.mode = "in"; a.msg = "Check " + em + " for a confirmation link. After you click it you'll come back here signed in."; } else FUI.afterAuth(); });
    else if (a.mode === "forgot") p = Cloud.recover(em).then(function () { a.msg = "If that email has an account, a reset link is on its way."; });
    else p = Cloud.setPassword(pw).then(function () { a.mode = "in"; a.pw = ""; a.msg = "Password updated."; Cloud.pendingType = ""; if (Cloud.signedIn()) FUI.modal = { k: "acct" }; });
    p.catch(function (e) { a.err = /invalid login|invalid_grant/i.test(e.message) ? "That email and password don't match." : /already registered|already been registered/i.test(e.message) ? "That email already has an account. Sign in instead." : e.message; })
      .finally(function () { a.busy = false; FUI.render(); });
  },
  afterAuth: function () { FR = null; FUI.acct = { mode: "in", email: "", pw: "" }; FUI.modal = null; FUI.page = "programs"; FUI.toast = null; },
  cloudChanged: function () { if (UI.screen === "fr" && !FUI.watch) { if (FR && FR.scope !== undefined && FR.scope !== Cloud.scope()) { FR = null; FUI.page = "programs"; } var ae = document.activeElement; if (ae && ae.tagName === "INPUT" && FUI.modal) return; FUI.render(); } },

  // ---- admin ----
  admOpen: function () {
    if (!Cloud.me.admin) return; FUI.adm = FUI.adm || { tab: "overview", lgCls: "6A", arm: "" }; FUI.page = "admin"; FUI.modal = null; FUI.nav = false; FUI.render(); FUI.admLoad();
  },
  admLoad: function () {
    var A = FUI.adm; A.loading = true; A.err = ""; FUI.render();
    Promise.all([Cloud.rpc("admin_totals"), Cloud.rpc("admin_daily", { p_days: 30 }), Cloud.rpc("admin_users")]).then(function (r) { A.totals = r[0]; A.daily = r[1] || []; A.users = r[2] || []; A.at = Date.now(); })
      .catch(function (e) { A.err = e.message; }).finally(function () { A.loading = false; FUI.render(); });
  },
  pAdmin: function () {
    var A = FUI.adm; if (!A || !Cloud.me.admin) return fEmpty("Admins only.");
    var tabs = '<div class="seg">' + [["overview", "Overview"], ["accounts", "Accounts"], ["league", "League editor"]].map(function (t) { return fBtn(t[1], "adm-tab", t[0], A.tab === t[0] ? "on" : ""); }).join("") + "</div>";
    var head = '<div class="solohead"><div class="admtop"><div><small class="dim">Friday Night Blitz</small><h1>Admin</h1></div><div class="pacts">' + fBtn(A.loading ? "Loading…" : "↻ Refresh", "adm-load", "", "", A.loading) + fBtn("◀ Back to game", "adm-back", "", "ghost") + "</div></div>" + tabs + (A.err ? '<div class="err">' + fx(A.err) + "</div>" : "") + "</div>";
    if (A.tab === "league") return head + FUI.admLeague();
    if (!A.totals) return head + fEmpty(A.loading ? "Loading…" : "No data yet.");
    return head + (A.tab === "accounts" ? FUI.admAccounts() : FUI.admOverview());
  },
  admOverview: function () {
    var A = FUI.adm, t = A.totals, d = A.daily, k = function (lbl, v, sub, ac) { return '<div class="kpi' + (ac ? " ac" : "") + '"><small>' + lbl + "</small><b>" + v + "</b><span>" + sub + "</span></div>"; };
    var kp = '<div class="kpis">' + k("Players today", t.players_today, "accounts + guests", 1) + k("Players, 7 days", t.players_7d, "distinct") + k("Players, 30 days", t.players_30d, t.guests_30d + " guests") + k("Accounts", t.accounts, t.new_7d + " new this week" + (t.banned ? " · " + t.banned + " disabled" : "")) +
      k("Games, 7 days", t.games_7d, t.games_all + " all time") + k("Seasons finished", t.seasons_all, "franchise") + k("Cloud saves", t.cloud_saves, "programs") + "</div>";
    var bars = function (title, key, col) { var mx = Math.max.apply(null, d.map(function (r) { return +r[key]; }).concat([1])); return fCard(title, '<div class="bars">' + d.map(function (r) { var v = +r[key]; return '<div class="bar" title="' + fx(r.day) + ": " + v + '"><i style="height:' + Math.max(v ? 3 : 0, v / mx * 100) + "%;background:" + col + '"></i></div>'; }).join("") + '</div><div class="barx"><span>' + fx(d.length ? fDate(String(d[0].day).slice(0, 10) + "T12:00:00") : "") + "</span><span>Today</span></div>", { right: '<span class="pill">max ' + mx + "/day</span>" }); };
    var sum = function (key) { var s = 0; d.forEach(function (r) { s += +r[key]; }); return s; };
    var g = sum("games") || 1, split = function (lbl, v) { return '<div class="split"><span>' + lbl + "</span><div class='mtr'><span style='width:" + fPct(v, g) + "%'></span></div><b>" + v + " · " + fPct(v, g) + "%</b></div>"; };
    var schools = {}; (A.users || []).forEach(function (u) { (u.saves || []).forEach(function (s) { if (s.summary && s.summary.name) schools[s.summary.name] = (schools[s.summary.name] || 0) + 1; }); });
    var top = Object.keys(schools).sort(function (a, b) { return schools[b] - schools[a]; }).slice(0, 10);
    return kp + '<div class="fgrid g2">' + bars("Players per day · last 30 days", "players", "var(--ac)") + bars("Games per day · last 30 days", "games", "#22c55e") + bars("New accounts per day", "signups", "#f5b301") +
      fCard("How games get played · last 30 days", split("Franchise", sum("franchise")) + split("Quick game", sum("quick")) + "<hr>" + split("Played in 16-bit", sum("played")) + split("Watched broadcast", sum("watched")) + split("Simmed", sum("simmed"))) +
      fCard("Most-picked schools (cloud saves)", top.length ? top.map(function (n, i) { return '<div class="seedr"><span class="pr">' + (i + 1) + "</span><b>" + fx(n) + "</b><small>" + schools[n] + " program" + (schools[n] > 1 ? "s" : "") + "</small></div>"; }).join("") : fEmpty("No cloud saves yet.")) + "</div>" +
      '<p class="fnote">Guests are counted by an anonymous browser ID. Times use Central time. Updated ' + fAgo(A.at) + ".</p>";
  },
  admAccounts: function () {
    var A = FUI.adm, us = A.users || [];
    var rows = us.map(function (u) {
      var progs = (u.saves || []).map(function (s) { var m = s.summary || {}; return '<span class="prog">' + (m.c1 ? fBadge({ name: m.name || "?", c1: m.c1, c2: m.c2 || "#fff" }, 18) : "") + fx(m.name || "?") + " <small>" + fx((m.year || "") + " · " + (m.w || 0) + "-" + (m.l || 0) + (m.tt ? " · " + m.tt + " title" + (m.tt > 1 ? "s" : "") : "")) + "</small></span>"; }).join("") || '<span class="dim">No cloud programs</span>';
      var arm = function (k) { return A.arm === k + u.id; };
      var open = A.sel === u.id, ev = A.ev && A.ev[u.id];
      var detail = open ? '<tr class="det"><td colspan="7">' + (ev ? (ev.length ? '<table class="ft"><tr><th>When</th><th>Event</th><th>Details</th></tr>' + ev.map(function (e) { var dd = e.detail || {}; return "<tr><td>" + fx(fAgo(e.created_at)) + "</td><td>" + fx(e.kind) + "</td><td>" + fx([dd.mode, dd.how, dd.school, dd.opp ? "vs " + dd.opp : "", dd.res, dd.year].filter(Boolean).join(" · ")) + "</td></tr>"; }).join("") + "</table>" : fEmpty("No activity recorded.")) : fEmpty("Loading…")) + "</td></tr>" : "";
      return '<tr class="arow" data-q="' + fx((u.email + " " + (u.coach_name || "")).toLowerCase()) + '"><td><b>' + fx(u.email) + "</b><br><small class='dim'>" + fx(u.coach_name || "") + "</small></td><td>" + fDate(u.created_at) + "</td><td>" + fAgo(u.last_seen) + "</td><td>" + u.games_7d + " <small class='dim'>/ " + u.games + "</small></td><td class='progs'>" + progs + "</td><td>" + (u.banned ? '<span class="pill l">Disabled</span>' : '<span class="pill ac">Active</span>') + "</td><td class='acts'>" +
        fBtn(open ? "Hide" : "Activity", "adm-sel", u.id, "sm ghost") + fBtn(arm("ban") ? "Confirm" : u.banned ? "Enable" : "Disable", "adm-ban", u.id, "sm" + (arm("ban") ? " danger" : "")) + fBtn(arm("reset") ? "Confirm wipe" : "Reset saves", "adm-reset", u.id, "sm ghost" + (arm("reset") ? " danger" : ""), !(u.saves || []).length) + "</td></tr>" + detail;
    }).join("");
    return '<div class="ph2"><p>' + us.length + ' accounts. "Disable" stops an account from saving to the cloud. "Reset saves" deletes its cloud programs and clears them from every device the next time the player opens the game.</p><input class="asearch" data-in="aq" placeholder="Search email or coach name" value="' + fx(A.q || "") + '"></div>' +
      fCard("", '<table class="ft big atbl"><tr><th>Account</th><th>Joined</th><th>Last seen</th><th>Games 7d / all</th><th>Programs</th><th>Status</th><th></th></tr>' + (rows || '<tr><td colspan="7">' + fEmpty("No accounts yet.") + "</td></tr>") + "</table>");
  },
  admFilter: function () { var q = (FUI.adm.q || "").toLowerCase(); document.querySelectorAll("#fr .arow").forEach(function (r) { r.style.display = !q || r.getAttribute("data-q").indexOf(q) >= 0 ? "" : "none"; }); },
  admLeague: function () {
    var A = FUI.adm; if (!A.lg) { A.lg = leagueList(); A.dirty = false; }
    var errs = leagueValidate(A.lg), c = A.lgCls, sh = LEAGUE_SHAPE[c], meta = AL_LEAGUE_META;
    var live = meta ? "Live league: edited by " + fx(meta.updated_by || "admin") + " on " + fDate(meta.updated_at) + "." : "Live league: the built-in AHSAA 2026-28 alignment.";
    var top = '<div class="ph2"><p>' + live + " Changes go live for new franchises and quick games when you publish. Existing programs keep the league they started with.</p>" +
      '<div class="pacts">' + '<div class="seg">' + ["6A", "5A"].map(function (x) { return fBtn("Class " + x + " · " + A.lg.filter(function (s) { return s.cls === x; }).length, "adm-lcls", x, x === c ? "on" : ""); }).join("") + "</div>" +
      fBtn(A.busy ? "Publishing…" : "Publish changes", "adm-pub", "", "pri", !!errs.length || !A.dirty || A.busy) + fBtn("Discard edits", "adm-disc", "", "ghost", !A.dirty) + fBtn(A.arm === "restore" ? "Confirm restore" : "Restore built-in league", "adm-restore", "", "ghost" + (A.arm === "restore" ? " danger" : ""), !meta && !A.dirty) + "</div>" +
      (A.lmsg ? '<div class="ok">' + fx(A.lmsg) + "</div>" : "") + (errs.length ? '<div class="err"><b>Fix these before publishing:</b><ul>' + errs.slice(0, 12).map(function (e) { return "<li>" + fx(e) + "</li>"; }).join("") + (errs.length > 12 ? "<li>…and " + (errs.length - 12) + " more</li>" : "") + "</ul></div>" : "") + "</div>";
    var regOpts = function (cls, r) { var o = ""; for (var i = 1; i <= LEAGUE_SHAPE[cls].regions; i++) o += '<option value="' + i + '"' + (i === r ? " selected" : "") + ">Region " + i + "</option>"; return o; };
    var out = top + '<div class="fgrid g2">';
    for (var r = 1; r <= sh.regions; r++) {
      var rows = ""; A.lg.forEach(function (s, i) { if (s.cls !== c || s.reg !== r) return;
        rows += '<tr><td>' + fBadge({ name: s.n || "?", c1: /^#[0-9a-f]{6}$/i.test(s.c1) ? s.c1 : "#333333", c2: /^#[0-9a-f]{6}$/i.test(s.c2) ? s.c2 : "#ffffff" }, 26) + '</td><td><input class="li ln1" data-lg="' + i + '|n" value="' + fx(s.n) + '"><input class="li ln2" data-lg="' + i + '|m" value="' + fx(s.m) + '"></td><td><input class="li ab" data-lg="' + i + '|a" value="' + fx(s.a) + '" maxlength="4"></td><td class="cols"><input type="color" data-lg="' + i + '|c1" value="' + fx(s.c1) + '"><input type="color" data-lg="' + i + '|c2" value="' + fx(s.c2) + '"></td><td><input class="li pn" type="number" min="0" max="99" data-lg="' + i + '|p" value="' + s.p + '"></td><td><select data-lgs="' + i + '|cls"><option' + (s.cls === "6A" ? " selected" : "") + ">6A</option><option" + (s.cls === "5A" ? " selected" : "") + '>5A</option></select><select data-lgs="' + i + '|reg">' + regOpts(s.cls, s.reg) + "</select></td><td>" + fBtn("✕", "adm-del", i, "xs ghost") + "</td></tr>"; });
      var n = A.lg.filter(function (s) { return s.cls === c && s.reg === r; }).length;
      out += fCard(c + " Region " + r + ' <small class="' + (n < sh.min ? "l" : "dim") + '">' + n + " schools</small>", '<div class="tscroll"><table class="ft lgt"><tr><th></th><th>School / mascot</th><th>Abbr</th><th>Colors</th><th>Prestige</th><th>Class / region</th><th></th></tr>' + rows + "</table></div>" + fBtn("+ Add school", "adm-add", c + "|" + r, "sm ghost"));
    }
    return out + "</div>";
  },
  admAct: function (a, v) {
    var A = FUI.adm, u = (A.users || []).filter(function (x) { return x.id === v; })[0];
    if (a === "adm-tab") { A.tab = v; A.arm = ""; FUI.render(); return; }
    if (a === "adm-load") { FUI.admLoad(); return; }
    if (a === "adm-back") { FUI.page = FR && FR.user >= 0 ? (FR.phase === "offseason" ? "offseason" : "home") : "programs"; FUI.render(); return; }
    if (a === "adm-sel") { A.sel = A.sel === v ? null : v; A.ev = A.ev || {}; FUI.render(); if (A.sel) Cloud.rpc("admin_user_events", { p_user: v, p_limit: 40 }).then(function (r) { A.ev[v] = r || []; FUI.render(); }).catch(function (e) { A.err = e.message; FUI.render(); }); return; }
    if (a === "adm-ban") { if (A.arm !== "ban" + v) { A.arm = "ban" + v; FUI.render(); return; } A.arm = ""; Cloud.rpc("admin_set_ban", { p_user: v, p_banned: !u.banned }).then(function () { u.banned = !u.banned; }).catch(function (e) { A.err = e.message; }).finally(function () { FUI.render(); }); return; }
    if (a === "adm-reset") { if (A.arm !== "reset" + v) { A.arm = "reset" + v; FUI.render(); return; } A.arm = ""; Cloud.rpc("admin_reset", { p_user: v }).then(function () { u.saves = []; }).catch(function (e) { A.err = e.message; }).finally(function () { FUI.render(); }); return; }
    if (a === "adm-lcls") { A.lgCls = v; FUI.render(); return; }
    if (a === "adm-add") { var pr = v.split("|"); A.lg.push({ n: "New School", m: "Mascots", a: "NEW", c1: "#1f4fd8", c2: "#ffffff", p: 40, cls: pr[0], reg: +pr[1] }); A.dirty = true; A.lmsg = ""; FUI.render(); return; }
    if (a === "adm-del") { A.lg.splice(+v, 1); A.dirty = true; A.lmsg = ""; FUI.render(); return; }
    if (a === "adm-disc") { A.lg = null; A.lmsg = ""; FUI.render(); return; }
    if (a === "adm-pub") { if (leagueValidate(A.lg).length) return; A.busy = true; FUI.render(); Cloud.publishLeague(A.lg.map(function (s) { return { n: s.n.trim(), m: s.m.trim(), a: s.a.trim().toUpperCase(), c1: s.c1.toLowerCase(), c2: s.c2.toLowerCase(), p: Math.round(+s.p), cls: s.cls, reg: +s.reg }; }))
      .then(function () { A.dirty = false; A.lg = null; A.lmsg = "Published. New franchises and quick games now use this league."; }).catch(function (e) { A.err = "Publish failed: " + e.message; }).finally(function () { A.busy = false; FUI.render(); }); return; }
    if (a === "adm-restore") { if (A.arm !== "restore") { A.arm = "restore"; FUI.render(); return; } A.arm = ""; A.busy = true; Cloud.resetLeague().then(function () { A.lg = null; A.dirty = false; A.lmsg = "Restored the built-in AHSAA 2026-28 league."; }).catch(function (e) { A.err = e.message; }).finally(function () { A.busy = false; FUI.render(); }); return; }
  },
  lgInput: function (n, live) {
    var A = FUI.adm, pr = (n.getAttribute("data-lg") || n.getAttribute("data-lgs")).split("|"), s = A.lg[+pr[0]], f = pr[1], v = n.value;
    if (!s) return; if (f === "p" || f === "reg") v = +v; if (f === "a") v = v.toUpperCase();
    if (f === "cls" && v !== s.cls) { s.cls = v; s.reg = Math.min(s.reg, LEAGUE_SHAPE[v].regions); } else s[f] = v;
    A.dirty = true; A.lmsg = ""; if (!live) FUI.render();
  }
});

Cloud.listeners.push(function () { FUI.cloudChanged(); });
