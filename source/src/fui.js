// ---------- FRANCHISE UI ----------
var FUI = {
  tab: "sched", regView: 0, depthPos: "QB", rosterPos: "ALL", newCls: null, delArm: 0,
  open: function () { if (!FR) frLoad(); if (FR && FR.user >= 0) FUI.view = "hub"; else { FR = null; FUI.view = "new"; FUI.newCls = null; } FUI.render(); UI.showRaw("fr"); },
  render: function () {
    var root = $("fr"); root.innerHTML = ""; root.scrollTop = 0;
    if (FUI.view === "new") return FUI.renderNew(root);
    if (FR.phase === "offseason") return FUI.renderOff(root);
    FUI.renderHub(root);
  },
  // ---- new franchise ----
  renderNew: function (root) {
    root.appendChild(el("div", "ph", esc(T("fr.title"))));
    if (!FUI.newCls) {
      root.appendChild(el("div", "fsub", esc(T("fr.pickClass"))));
      var g = el("div", "clsgrid");
      CLASSES.forEach(function (c) { var b = el("button", "btn big " + (c === "6A" ? "pri" : "sec2"), c); b.appendChild(el("small", "", esc(T(c === "6A" ? "fr.cls6" : "fr.clsN"))));
        onTap(b, function () { FUI.newCls = c; frNew(c, (Date.now() ^ (Math.random() * 1e9)) >>> 0); FUI.render(); }); g.appendChild(b); });
      root.appendChild(g);
      var bk = el("button", "btn sec", "◀"); onTap(bk, function () { FR = null; UI.show("title"); }); root.appendChild(bk);
      return;
    }
    root.appendChild(el("div", "fsub", esc(T("fr.pickSchool")) + " · " + esc(FR.cls)));
    var list = el("div", "flist");
    for (var r = 1; r <= FR.nReg; r++) {
      list.appendChild(el("div", "fhead", esc(T("fr.region", { n: r }))));
      FR.teams.filter(function (t) { return t.region === r; }).forEach(function (t) {
        var row = el("button", "frow team"); row.style.setProperty("--p", t.primary); row.style.setProperty("--s", t.secondary);
        row.innerHTML = '<span class="chip"></span><span class="tn2">' + esc(t.name) + ' <em>' + esc(t.mascot) + '</em></span><span class="stars">' + stars(t.prestige) + "</span>";
        onTap(row, function () { frChooseTeam(t.id); updatePoll(); frSave(); FUI.view = "hub"; FUI.tab = "sched"; FUI.render(); });
        list.appendChild(row); });
    }
    root.appendChild(list);
    var bk2 = el("button", "btn sec", "◀"); onTap(bk2, function () { FUI.newCls = null; FR = null; FUI.render(); }); root.appendChild(bk2);
  },
  header: function (root) {
    var t = FR.teams[FR.user], h = el("div", "fhdr"); h.style.setProperty("--p", t.primary); h.style.setProperty("--s", t.secondary);
    var pv = makeCanvas(36, 18); pv.className = "pv"; UI.paintPreview(pv, { primary: t.primary, secondary: t.secondary, helmet: t.helmet, pants: t.pants, awayWhite: t.awayWhite,
      roster: [{ skin: 1, num: (lineup().QB[0] || { num: 7 }).num }] }, false);
    h.appendChild(pv);
    var rk = t.rank ? " · #" + t.rank : "";
    h.appendChild(el("div", "fhi", '<div class="tn">' + esc(t.name) + '</div><div class="tm2">' + esc(t.mascot) + " · " + esc(FR.cls) + " " + esc(T("fr.region", { n: t.region })) + " · " + FR.year + "</div>" +
      '<div class="frec">' + esc(T("fr.record", { w: t.w, l: t.l, rw: t.rw, rl: t.rl })) + esc(rk) + "</div>"));
    root.appendChild(h);
  },
  renderHub: function (root) {
    FUI.header(root);
    // next-game card
    var card = el("div", "fnext"), g = currentUserGame();
    if (FR.phase === "regular" || FR.phase === "playoffs") {
      var label = FR.phase === "regular" ? T("fr.week", { n: FR.week + 1 }) : T(roundName(FR.playoffs.cur, FR.playoffs.rounds.length));
      card.appendChild(el("div", "fwk", esc(label)));
      if (g) {
        var oppId = g.h === FR.user ? g.a : g.h, o = FR.teams[oppId], home = g.h === FR.user;
        if (FR.phase === "playoffs" && FR.playoffs.cur === FR.playoffs.rounds.length - 1) home = null;
        card.appendChild(el("div", "fopp", '<span class="chip" style="--p:' + esc(o.primary) + ";--s:" + esc(o.secondary) + '"></span>' + esc(home === null ? T("fr.neutral") : home ? T("fr.vs") : T("fr.at")) + " " +
          (o.rank ? "#" + o.rank + " " : "") + esc(o.name) + " " + esc(o.mascot) + ' <em>(' + o.w + "-" + o.l + ")</em>"));
        var row = el("div", "row2"), pb = el("button", "btn big pri", esc(T("fr.play"))), sb = el("button", "btn sec", esc(T("fr.sim")));
        onTap(pb, function () { App.startFranchiseGame(); }); onTap(sb, function () { var gg = frSimUserGame(); FUI.toastResult(gg); FUI.render(); });
        row.appendChild(pb); row.appendChild(sb); card.appendChild(row);
      } else {
        card.appendChild(el("div", "fopp", esc(FR.phase === "playoffs" ? (FR.playoffs.qualified.indexOf(FR.user) < 0 ? T("po.missed") : T("po.out")) : T("fr.bye"))));
        var sw = el("button", "btn big sec2", esc(T("fr.simWeek"))); onTap(sw, function () { frSimWeek(); FUI.render(); }); card.appendChild(sw);
      }
    }
    root.appendChild(card);
    if (FUI.lastToast) { root.appendChild(el("div", "ftoast", esc(FUI.lastToast))); FUI.lastToast = null; }
    // tabs
    var tabs = el("div", "ftabs"), list = ["sched", "stand", "poll", "roster", "depth", "stats", "prog"]; if (FR.playoffs) list.splice(3, 0, "bracket");
    list.forEach(function (k) { var b = el("button", "tab" + (FUI.tab === k ? " on" : ""), esc(T("tab." + k))); onTap(b, function () { FUI.tab = k; FUI.render(); }); tabs.appendChild(b); });
    root.appendChild(tabs);
    var body = el("div", "fbody"); root.appendChild(body);
    FUI["tab_" + FUI.tab](body);
    var foot = el("div", "row2"), ex = el("button", "btn sec", esc(T("fr.exit"))); onTap(ex, function () { frSave(); App.toTitle(); }); foot.appendChild(ex); root.appendChild(foot);
  },
  toastResult: function (g) {
    if (!g) return; var us = g.h === FR.user ? g.hs : g.as, them = g.h === FR.user ? g.as : g.hs, o = FR.teams[g.h === FR.user ? g.a : g.h];
    FUI.lastToast = (us > them ? "W " : "L ") + us + "-" + them + " · " + o.name;
  },
  gameRow: function (g, label) {
    var home = g.h === FR.user, oid = home ? g.a : g.h, o = FR.teams[oid], res = "";
    if (g.played) { var us = home ? g.hs : g.as, them = home ? g.as : g.hs; res = '<b class="' + (us > them ? "w" : "l") + '">' + (us > them ? "W" : "L") + " " + us + "-" + them + "</b>"; }
    return '<div class="frow"><span class="wk">' + esc(label) + '</span><span class="chip" style="--p:' + esc(o.primary) + ";--s:" + esc(o.secondary) + '"></span><span class="tn2">' + esc(home ? T("fr.vs") : T("fr.at")) + " " + esc(o.name) + (g.reg ? " *" : "") + "</span>" + res + "</div>";
  },
  tab_sched: function (b) {
    var h = ""; FR.schedule.forEach(function (wk, i) { var g = userGame(i); if (g) h += FUI.gameRow(g, "W" + (i + 1)); });
    if (FR.playoffs) FR.playoffs.rounds.forEach(function (rd, i) { rd.forEach(function (g) { resolveSlots(g); if (g.h === FR.user || g.a === FR.user) h += FUI.gameRow(g, T(roundName(i, FR.playoffs.rounds.length) + ".s")); }); });
    b.innerHTML = h + '<div class="fnote">* ' + esc(T("fr.regionGame")) + "</div>";
  },
  tab_stand: function (b) {
    var r = FUI.regView || FR.teams[FR.user].region, cut = FR.cls === "6A" ? 6 : 4;
    var nav = el("div", "fnav"), pv = el("button", "btn sm", "◀"), nx = el("button", "btn sm", "▶");
    onTap(pv, function () { FUI.regView = ((r - 2 + FR.nReg) % FR.nReg) + 1; FUI.render(); }); onTap(nx, function () { FUI.regView = (r % FR.nReg) + 1; FUI.render(); });
    nav.appendChild(pv); nav.appendChild(el("span", "", esc(FR.cls + " · " + T("fr.region", { n: r })))); nav.appendChild(nx); b.appendChild(nav);
    var h = '<div class="ftbl"><div class="th"><span>#</span><span>' + esc(T("fr.team")) + "</span><span>" + esc(T("fr.reg")) + "</span><span>" + esc(T("fr.all")) + "</span><span>PF-PA</span></div>";
    standings(r).forEach(function (t, i) { h += '<div class="tr' + (t.id === FR.user ? " me" : "") + (i === cut - 1 ? " cut" : "") + '"><span>' + (i + 1) + '</span><span class="tn2"><span class="chip" style="--p:' + esc(t.primary) + ";--s:" + esc(t.secondary) + '"></span>' + esc(t.name) + "</span><span>" + t.rw + "-" + t.rl + "</span><span>" + t.w + "-" + t.l + "</span><span>" + t.pf + "-" + t.pa + "</span></div>"; });
    b.innerHTML += h + '</div><div class="fnote">' + esc(T("fr.cutline", { n: cut })) + "</div>";
  },
  tab_poll: function (b) {
    var h = '<div class="ftbl">'; (FR.poll || []).forEach(function (id, i) { var t = FR.teams[id], mv = t.lastRank ? t.lastRank - (i + 1) : 0;
      h += '<div class="tr' + (id === FR.user ? " me" : "") + '"><span>' + (i + 1) + '</span><span class="tn2"><span class="chip" style="--p:' + esc(t.primary) + ";--s:" + esc(t.secondary) + '"></span>' + esc(t.name) + "</span><span>" + t.w + "-" + t.l + "</span><span>" + (mv > 0 ? "▲" + mv : mv < 0 ? "▼" + (-mv) : "–") + "</span></div>"; });
    b.innerHTML = h + "</div>" + (FR.poll && FR.poll.length ? "" : '<div class="fnote">' + esc(T("fr.pollSoon")) + "</div>");
  },
  tab_bracket: function (b) {
    var h = "", n = FR.playoffs.rounds.length;
    FR.playoffs.rounds.forEach(function (rd, i) { h += '<div class="fhead">' + esc(T(roundName(i, n))) + "</div>";
      rd.forEach(function (g) { resolveSlots(g); if (g.h === undefined || g.h === null) { h += '<div class="frow dim">' + esc(T("fr.tbd")) + "</div>"; return; }
        var H = FR.teams[g.h], A = FR.teams[g.a], me = g.h === FR.user || g.a === FR.user;
        h += '<div class="frow' + (me ? " me" : "") + '"><span class="tn2">' + (g.hSeed ? "<em>R" + g.hSeed.reg + "#" + g.hSeed.seed + "</em> " : "") + esc(H.name) + "</span><b>" + (g.played ? g.hs : "") + "</b><span class=\"tn2\">" +
          (g.aSeed ? "<em>R" + g.aSeed.reg + "#" + g.aSeed.seed + "</em> " : "") + esc(A.name) + "</span><b>" + (g.played ? g.as : "") + "</b></div>"; }); });
    var ch = champion(); if (ch !== null) h = '<div class="fchamp">🏆 ' + esc(FR.teams[ch].name) + "</div>" + h;
    b.innerHTML = h;
  },
  tab_roster: function (b) {
    var chips = el("div", "seg units"); ["ALL"].concat(POS_GROUPS).forEach(function (pos) { var c = el("button", "btn xs2" + (FUI.rosterPos === pos ? " on" : ""), pos); onTap(c, function () { FUI.rosterPos = pos; FUI.render(); }); chips.appendChild(c); });
    b.appendChild(chips);
    var list = el("div", "roster");
    FR.roster.slice().sort(function (a, c) { return POS_GROUPS.indexOf(a.pos) - POS_GROUPS.indexOf(c.pos) || posOvr(c) - posOvr(a); }).forEach(function (p) {
      if (FUI.rosterPos !== "ALL" && p.pos !== FUI.rosterPos) return;
      var row = el("div", "rrow"), top = el("div", "rtop");
      top.appendChild(el("span", "rpos", esc(p.pos)));
      var num = el("input", "rnum"); num.type = "text"; num.inputMode = "numeric"; num.maxLength = 2; num.value = p.num; num.setAttribute("data-ui", "1");
      num.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); num.addEventListener("keydown", function (e) { e.stopPropagation(); });
      num.addEventListener("change", function () { var v = num.value.replace(/[^0-9]/g, ""); if (v !== "") { p.num = Math.min(99, +v); frSave(); } });
      var nm = el("input", "rname"); nm.type = "text"; nm.maxLength = 18; nm.value = pname(p); nm.setAttribute("data-ui", "1");
      nm.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); nm.addEventListener("keydown", function (e) { e.stopPropagation(); });
      nm.addEventListener("change", function () { var parts = nm.value.trim().split(/\s+/); if (parts[0]) { p.first = parts.shift(); p.last = parts.join(" ") || ""; frSave(); } });
      top.appendChild(num); top.appendChild(nm); row.appendChild(top);
      row.appendChild(el("div", "rinfo", '<b>' + esc(classLabel(p.cls)) + '</b><span>OVR <b>' + posOvr(p) + '</b></span><span>' + esc(T("r.spd")) + " " + p.spd + "</span><span>" + esc(T("r.pwr")) + " " + p.pwr + "</span><span>" + esc(T("r.hnd")) + " " + p.hnd + '</span><span class="pot">POT ' + potGrade(p.pot) + "</span>" + (p.inj ? '<span class="inj">' + esc(T("fr.injured", { n: p.inj })) + "</span>" : "")));
      list.appendChild(row);
    });
    b.appendChild(list);
  },
  tab_depth: function (b) {
    var chips = el("div", "seg units"); POS_GROUPS.forEach(function (pos) { var c = el("button", "btn xs2" + (FUI.depthPos === pos ? " on" : ""), pos); onTap(c, function () { FUI.depthPos = pos; FUI.render(); }); chips.appendChild(c); });
    b.appendChild(chips); fixDepth();
    var pos = FUI.depthPos, need = STARTERS[pos], list = el("div", "flist");
    FR.depth[pos].forEach(function (id, i) { var p = byId(id); if (!p) return;
      var row = el("div", "frow" + (i < need ? " me" : "")); row.innerHTML = '<span class="wk">' + (i < need ? "1ST" : "2ND") + '</span><span class="tn2">#' + p.num + " " + esc(pname(p)) + " <em>" + classLabel(p.cls) + "</em>" + (p.inj ? ' <em class="inj">' + esc(T("fr.injured", { n: p.inj })) + "</em>" : "") + "</span><b>" + posOvr(p) + "</b>";
      var up = el("button", "btn xs", "▲"), dn = el("button", "btn xs", "▼");
      onTap(up, function () { moveDepth(pos, id, -1); frUpdateUserOvr(); FUI.render(); }); onTap(dn, function () { moveDepth(pos, id, 1); frUpdateUserOvr(); FUI.render(); });
      row.appendChild(up); row.appendChild(dn); list.appendChild(row); });
    b.appendChild(list);
    var ab = el("button", "btn sec", esc(T("fr.autoDepth"))); onTap(ab, function () { autoDepth(); frUpdateUserOvr(); frSave(); FUI.render(); }); b.appendChild(ab);
  },
  tab_stats: function (b) {
    var cats = [["pass", "st.pass"], ["rush", "st.rush"], ["rec", "st.rec"], ["tkl", "st.tkl"], ["int", "st.int"], ["sck", "st.sck"]], h = "";
    cats.forEach(function (c) { var top = FR.roster.filter(function (p) { return p.st[c[0]] > 0; }).sort(function (a, d) { return d.st[c[0]] - a.st[c[0]]; }).slice(0, 3);
      h += '<div class="fhead">' + esc(T(c[1])) + "</div>";
      if (!top.length) h += '<div class="frow dim">—</div>';
      top.forEach(function (p) { var td = c[0] === "pass" ? p.st.ptd : c[0] === "rush" ? p.st.rtd : c[0] === "rec" ? p.st.ctd : null;
        h += '<div class="frow"><span class="tn2">#' + p.num + " " + esc(pname(p)) + " <em>" + p.pos + "</em></span><b>" + p.st[c[0]] + (td !== null ? " · " + td + " TD" : "") + "</b></div>"; }); });
    b.innerHTML = h;
  },
  tab_prog: function (b) {
    b.appendChild(el("div", "ffunds", esc(T("fr.funds")) + ": <b>$" + FR.funds.toLocaleString("en-US") + "</b>"));
    UPGRADES.forEach(function (k) { var lvl = FR.upg[k], row = el("div", "fupg");
      row.innerHTML = '<div><b>' + esc(T("up." + k)) + '</b> <span class="lvl">' + "■".repeat(lvl) + "□".repeat(5 - lvl) + '</span><div class="fnote">' + esc(T("up." + k + ".d")) + "</div></div>";
      var bt = el("button", "btn sm " + (lvl >= 5 ? "sec" : FR.funds >= UPG_COST(lvl) ? "pri" : "sec"), lvl >= 5 ? esc(T("up.max")) : "$" + (UPG_COST(lvl) / 1000) + "K");
      if (lvl >= 5 || FR.funds < UPG_COST(lvl)) bt.disabled = true;
      onTap(bt, function () { if (buyUpgrade(k)) { sfx("first"); FUI.render(); } }); row.appendChild(bt); b.appendChild(row); });
    b.appendChild(el("div", "fnote", esc(T("fr.coach", { w: FR.coach.w, l: FR.coach.l, t: FR.coach.titles }))));
    if (FR.history.length) { var h = '<div class="fhead">' + esc(T("fr.history")) + "</div>";
      FR.history.slice().reverse().forEach(function (x) { h += '<div class="frow"><span class="wk">' + x.year + '</span><span class="tn2">' + x.w + "-" + x.l + " (" + x.rw + "-" + x.rl + ") · " + esc(T("fr.regFinish", { n: x.reg })) + "</span><b>" + esc(x.po === "champ" ? T("po.champShort") : x.po === "—" ? "—" : T(x.po + ".s")) + "</b></div>"; });
      b.appendChild(el("div", "", h)); }
    // settings
    var st = el("div", "fset"); st.appendChild(el("div", "fhead", esc(T("fr.settings"))));
    var seg = el("div", "seg"); ["easy", "normal", "hard"].forEach(function (d) { var x = el("button", "btn sm" + (App.diff === d ? " on" : ""), esc(T("diff." + d))); onTap(x, function () { App.setDiff(d); FUI.render(); }); seg.appendChild(x); });
    st.appendChild(seg);
    var q = el("div", "stepper"), qm = el("button", "btn sm", "-"), qp = el("button", "btn sm", "+");
    onTap(qm, function () { setParam("quarterMinutes", P("quarterMinutes") - 1); App.persist(); FUI.render(); }); onTap(qp, function () { setParam("quarterMinutes", P("quarterMinutes") + 1); App.persist(); FUI.render(); });
    q.appendChild(el("span", "ol", esc(T("setup.qtr")))); q.appendChild(qm); q.appendChild(el("span", "", esc(T("setup.min", { n: P("quarterMinutes") })))); q.appendChild(qp); st.appendChild(q);
    var cam = el("button", "btn sm sec", esc(T("set.camera")) + ": " + esc(T("cam." + P("camera")))); onTap(cam, function () { setParam("camera", P("camera") === "pro" ? "classic" : "pro"); App.persist(); FUI.render(); }); st.appendChild(cam);
    var ed = el("button", "btn sm sec", esc(T("fr.edit"))); onTap(ed, function () { UI.openEditor("fr"); }); st.appendChild(ed);
    var del = el("button", "btn sm ghost", esc(FUI.delArm ? T("fr.confirmDel") : T("fr.del"))); onTap(del, function () { if (FUI.delArm) { frDelete(); FUI.delArm = 0; App.toTitle(); } else { FUI.delArm = 1; FUI.render(); } }); st.appendChild(del);
    b.appendChild(st);
  },
  // ---- offseason ----
  renderOff: function (root) {
    FUI.header(root); var o = FR.off, card = el("div", "fnext"), steps = ["off.recap", "off.grad", "off.prog", "off.fresh", "off.move", "off.boost", "off.depth"];
    card.appendChild(el("div", "fwk", esc(T("off.title", { y: FR.year })) + " · " + (o.step + 1) + "/" + steps.length));
    card.appendChild(el("div", "fopp", esc(T(steps[o.step]))));
    root.appendChild(card);
    var b = el("div", "fbody"); root.appendChild(b);
    var next = el("button", "btn big pri", esc(o.step === steps.length - 1 ? T("off.start", { y: FR.year + 1 }) : T("off.next")));
    var go = function () { o.step++; frSave(); FUI.render(); };
    if (o.step === 0) {
      var hst = FR.history[FR.history.length - 1], ch = champion();
      b.innerHTML = '<div class="fbig">' + hst.w + "-" + hst.l + "</div>" + '<div class="fnote">' + esc(T("fr.regFinish", { n: hst.reg })) + " · " + esc(hst.po === "champ" ? T("po.champ") : hst.po === "—" ? T("po.missed") : T(hst.po)) + "</div>" +
        (ch !== null ? '<div class="fchamp">🏆 ' + esc(FR.cls) + " " + esc(T("rd.final")) + ": " + esc(FR.teams[ch].name) + "</div>" : "");
      var aw = '<div class="fhead">' + esc(T("off.awards")) + "</div>";
      (FR.awards || []).forEach(function (a) { var p = a.id ? byId(a.id) : null; aw += '<div class="frow"><span class="tn2">' + (p ? "#" + p.num + " " + esc(pname(p)) + " <em>" + p.pos + "</em>" : esc(T("fr.you"))) + "</span><b>" + esc(T(a.a, { cls: FR.cls })) + "</b></div>"; });
      if (!(FR.awards || []).length) aw += '<div class="frow dim">—</div>';
      b.innerHTML += aw;
      onTap(next, function () { offseasonGraduate(); go(); });
    } else if (o.step === 1) {
      var h = ""; (o.grads || []).forEach(function (g) { h += '<div class="frow"><span class="tn2">#' + g.num + " " + esc(g.name) + " <em>" + g.pos + "</em></span><b>" + g.ovr + "</b></div>"; });
      b.innerHTML = '<div class="fnote">' + esc(T("off.gradNote", { n: (o.grads || []).length })) + "</div>" + h;
      onTap(next, function () { offseasonProgress(); go(); });
    } else if (o.step === 2) {
      var h2 = ""; (o.prog || []).slice(0, 14).forEach(function (c) { var p = byId(c.id); if (!p) return; h2 += '<div class="frow"><span class="tn2">#' + p.num + " " + esc(pname(p)) + " <em>" + p.pos + " · " + classLabel(p.cls) + "</em></span><b class=\"" + (c.d >= 0 ? "w" : "l") + "\">" + (c.d >= 0 ? "+" : "") + c.d + " → " + posOvr(p) + "</b></div>"; });
      b.innerHTML = '<div class="fnote">' + esc(T("off.progNote", { n: FR.upg.weight })) + "</div>" + h2;
      onTap(next, function () { offseasonFreshmen(); go(); });
    } else if (o.step === 3) {
      var h3 = ""; (o.fresh || []).forEach(function (id) { var p = byId(id); if (!p) return; h3 += '<div class="frow"><span class="tn2">#' + p.num + " " + esc(pname(p)) + " <em>" + p.pos + "</em></span><b>" + posOvr(p) + ' <em>POT ' + potGrade(p.pot) + "</em></b></div>"; });
      b.innerHTML = h3 || '<div class="frow dim">—</div>';
      onTap(next, go);
    } else if (o.step === 4) {
      var done = o.moveins.some(function (m) { return m.res !== null; });
      b.appendChild(el("div", "fnote", esc(T("off.moveHint"))));
      o.moveins.forEach(function (m) { var p = m.p, row = el("div", "frow" + (m.picked ? " me" : ""));
        row.innerHTML = '<span class="wk">' + p.pos + '</span><span class="tn2">' + esc(pname(p)) + " <em>" + classLabel(p.cls) + " · " + esc(T("off.interest", { n: m.interest })) + "</em></span><b>" + posOvr(p) + "</b>" +
          (m.res === true ? '<b class="w">' + esc(T("off.joined")) + "</b>" : m.res === false ? '<b class="l">' + esc(T("off.declined")) + "</b>" : "");
        if (!done) { var bt = el("button", "btn xs " + (m.picked ? "on" : ""), m.picked ? "✓" : "+");
          onTap(bt, function () { var n = o.moveins.filter(function (x) { return x.picked; }).length; if (!m.picked && n >= 3) return; m.picked = !m.picked; FUI.render(); }); row.appendChild(bt); }
        b.appendChild(row); });
      if (!done) { next.textContent = T("off.welcome"); onTap(next, function () { offseasonResolveMoveins(); frSave(); FUI.render(); }); }
      else onTap(next, function () { offseasonLeague(); go(); });
    } else if (o.step === 5) {
      FUI.tab_prog(b); onTap(next, go);
    } else {
      autoDepth(); FUI.depthPos = FUI.depthPos || "QB"; FUI.tab_depth(b);
      onTap(next, function () { startNewSeason(); FUI.tab = "sched"; FUI.render(); });
    }
    root.appendChild(next);
  }
};
function stars(n) { var r = Math.round(n); return "★".repeat(r) + "☆".repeat(5 - r); }
function potGrade(v) { return v >= 85 ? "A" : v >= 72 ? "B" : v >= 60 ? "C" : v >= 48 ? "D" : "F"; }
