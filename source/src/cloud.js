// ---------- CLOUD: Supabase accounts, cloud saves, activity tracking, league overrides ----------
// Fill these in from Supabase > Project Settings > API (Project URL and the anon / publishable key).
// The anon key is meant to be public; the database's row-level security rules protect the data.
var CLOUD_URL = "https://hflrzcpwehqaybnflron.supabase.co";
var CLOUD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmbHJ6Y3B3ZWhxYXlibmZscm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMTYyMTAsImV4cCI6MjExMDU5MjIxMH0.X3nKunOqB6XrHzlxylMsPtMOPKQnS0Ei1PAaXxK2PJU";

var Cloud = {
  url: "", key: "", sess: null, me: { banned: false, admin: false }, q: [], qt: 0, st: 0, dirty: {}, status: "", busy: false, ready: false, listeners: [],
  on: function () { return !!(Cloud.url && Cloud.key); },
  signedIn: function () { return !!(Cloud.sess && Cloud.sess.user); },
  uid: function () { return Cloud.signedIn() ? Cloud.sess.user.id : null; },
  email: function () { return Cloud.signedIn() ? Cloud.sess.user.email : ""; },
  scope: function () { return Cloud.signedIn() ? "u" + Cloud.uid().replace(/-/g, "").slice(0, 12) + "_" : ""; },
  anon: function () { var a = null; try { a = localStorage.getItem("fnb_anon"); if (!a) { a = "g" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem("fnb_anon", a); } } catch (e) { a = "g-nostore"; } return a; },
  changed: function () { Cloud.listeners.forEach(function (f) { try { f(); } catch (e) {} }); },

  init: function () {
    Cloud.url = (CLOUD_URL || "").replace(/\/+$/, ""); Cloud.key = CLOUD_KEY || "";
    if (typeof TEST !== "undefined" && TEST && QS.cloud) { var c = QS.cloud.split("|"); Cloud.url = c[0]; Cloud.key = c[1] || "test"; }
    if (!Cloud.on()) return;
    try { var s = localStorage.getItem("fnb_sess"); if (s) Cloud.sess = JSON.parse(s); } catch (e) {}
    Cloud.readHash();
    window.addEventListener("pagehide", function () { Cloud.flushEvents(true); });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") { Cloud.flushEvents(true); Cloud.flushSaves(); } });
    Cloud.track("open", { mobile: Math.min(screen.width, screen.height) < 600 });
    Cloud.fetchLeague();
    if (Cloud.signedIn()) Cloud.afterSignIn(); else Cloud.ready = true;
  },
  readHash: function () {
    var h = location.hash || ""; if (h.indexOf("access_token=") < 0 && h.indexOf("error_description=") < 0) return;
    var o = {}; h.replace(/^#/, "").split("&").forEach(function (kv) { var p = kv.split("="); o[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (o.error_description) { Cloud.notice = o.error_description; return; }
    Cloud.setSess({ access_token: o.access_token, refresh_token: o.refresh_token, expires_at: +o.expires_at || (Date.now() / 1000 + (+o.expires_in || 3600)), user: null });
    Cloud.pendingType = o.type || "";
  },
  setSess: function (s) {
    if (s && !s.expires_at && s.expires_in) s.expires_at = Date.now() / 1000 + s.expires_in;
    Cloud.sess = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: s.user ? { id: s.user.id, email: s.user.email } : (Cloud.sess && Cloud.sess.user) || null } : null;
    try { if (Cloud.sess) localStorage.setItem("fnb_sess", JSON.stringify(Cloud.sess)); else localStorage.removeItem("fnb_sess"); } catch (e) {}
  },

  // ---- http ----
  req: function (method, path, body, opt) {
    opt = opt || {};
    var go = function () {
      var h = { apikey: Cloud.key, "Content-Type": "application/json" };
      if (Cloud.sess && Cloud.sess.access_token && !opt.noAuth) h.Authorization = "Bearer " + Cloud.sess.access_token;
      if (opt.prefer) h.Prefer = opt.prefer;
      return fetch(Cloud.url + path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), keepalive: !!opt.keepalive }).then(function (r) {
        return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; } return { ok: r.ok, status: r.status, data: j }; });
      });
    };
    var fresh = !Cloud.sess || opt.noAuth || !Cloud.sess.refresh_token || Cloud.sess.expires_at - 60 > Date.now() / 1000;
    var p = fresh ? go() : Cloud.refresh().then(go);
    return p.then(function (r) {
      if (r.status === 401 && Cloud.sess && Cloud.sess.refresh_token && !opt.retried && !opt.noAuth) { opt.retried = true; return Cloud.refresh().then(function () { return Cloud.req(method, path, body, opt); }); }
      if (!r.ok) { var d = r.data || {}; var e = new Error(d.error_description || d.msg || d.message || d.error || ("HTTP " + r.status)); e.status = r.status; throw e; }
      return r.data;
    });
  },
  refresh: function () {
    if (Cloud._rf) return Cloud._rf;
    Cloud._rf = fetch(Cloud.url + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: Cloud.key, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: Cloud.sess.refresh_token }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.access_token) { if (r.status >= 400 && r.status < 500) { Cloud.setSess(null); Cloud.changed(); } throw new Error("Your session expired. Sign in again."); } Cloud.setSess(j); }); })
      .finally(function () { Cloud._rf = null; });
    return Cloud._rf;
  },
  rpc: function (fn, args) { return Cloud.req("POST", "/rest/v1/rpc/" + fn, args || {}); },

  // ---- auth ----
  redirect: function () { return location.origin + location.pathname; },
  signUp: function (email, pw) {
    return Cloud.req("POST", "/auth/v1/signup?redirect_to=" + encodeURIComponent(Cloud.redirect()), { email: email, password: pw }, { noAuth: true }).then(function (d) {
      if (d && d.access_token) { Cloud.setSess(d); return Cloud.afterSignIn().then(function () { return "in"; }); }
      return "confirm";
    });
  },
  signIn: function (email, pw) {
    return Cloud.req("POST", "/auth/v1/token?grant_type=password", { email: email, password: pw }, { noAuth: true }).then(function (d) { Cloud.setSess(d); return Cloud.afterSignIn(); });
  },
  recover: function (email) { return Cloud.req("POST", "/auth/v1/recover?redirect_to=" + encodeURIComponent(Cloud.redirect()), { email: email }, { noAuth: true }); },
  setPassword: function (pw) { return Cloud.req("PUT", "/auth/v1/user", { password: pw }); },
  signOut: function () {
    var p = Cloud.signedIn() ? Cloud.flushSaves().catch(function () {}).then(function () { return Cloud.req("POST", "/auth/v1/logout", {}).catch(function () {}); }) : Promise.resolve();
    return p.then(function () { Cloud.setSess(null); Cloud.me = { banned: false, admin: false }; Cloud.status = ""; Cloud.changed(); });
  },
  afterSignIn: function () {
    Cloud.busy = true; Cloud.changed();
    var getUser = Cloud.sess.user ? Promise.resolve() : Cloud.req("GET", "/auth/v1/user").then(function (u) { Cloud.sess.user = { id: u.id, email: u.email }; Cloud.setSess(Cloud.sess); });
    return getUser.then(function () { return Cloud.rpc("touch", { p_coach: null }); }).then(function (me) {
      Cloud.me = { banned: !!(me && me.banned), admin: !!(me && me.admin), reset_at: (me && me.reset_at) || 0 };
      return Cloud.me.banned ? null : Cloud.sync();
    }).then(function () { Cloud.status = Cloud.me.banned ? "This account has been disabled. Your programs stay on this device only." : "Synced"; })
      .catch(function (e) { Cloud.status = e.message; if (e.status === 401 || e.status === 403) { Cloud.setSess(null); } })
      .finally(function () { Cloud.busy = false; Cloud.ready = true; Cloud.changed(); });
  },

  // ---- cloud saves ----
  localTs: function (i) { var s = frSlotInfo(i); return s ? s.ts || 0 : -1; },
  sync: function () {
    var uid = Cloud.uid(); if (!uid) return Promise.resolve();
    // an admin reset wipes this account's copies on every device
    try { var seenK = "fnb_reset_" + uid, seen = +(localStorage.getItem(seenK) || 0); if (Cloud.me.reset_at && Cloud.me.reset_at > seen) { for (var i = 0; i < FR_SLOTS; i++) frDeleteSlot(i, true); localStorage.setItem(seenK, String(Cloud.me.reset_at)); if (FR && FR.scope === Cloud.scope()) FR = null; Cloud.notice = "An admin reset this account's saved programs."; } } catch (e) {}
    return Cloud.req("GET", "/rest/v1/saves?select=slot,ts,summary,updated_at&user_id=eq." + uid).then(function (rows) {
      rows = rows || []; var byS = {}; rows.forEach(function (r) { byS[r.slot] = r; });
      var anyLocal = false; for (var i = 0; i < FR_SLOTS; i++) if (frSlotInfo(i)) anyLocal = true;
      if (!rows.length && !anyLocal) Cloud.adoptGuest();
      var jobs = [];
      for (var s = 0; s < FR_SLOTS; s++) (function (s) {
        var lt = Cloud.localTs(s), c = byS[s];
        if (c && c.ts > lt) jobs.push(Cloud.req("GET", "/rest/v1/saves?select=data&user_id=eq." + uid + "&slot=eq." + s).then(function (d) { if (d && d[0]) { try { localStorage.setItem(frKey(s), d[0].data); } catch (e) {} } }));
        else if (lt >= 0 && (!c || lt > c.ts)) jobs.push(Cloud.pushSlot(s));
      })(s);
      return Promise.all(jobs);
    });
  },
  adoptGuest: function () { // first sign-in on this device: guest programs become the account's programs
    try { for (var i = 0; i < FR_SLOTS; i++) { var g = localStorage.getItem(FR_PREFIX + i); if (g && !localStorage.getItem(frKey(i))) localStorage.setItem(frKey(i), g); } } catch (e) {}
  },
  pushSlot: function (s) {
    var uid = Cloud.uid(); if (!uid || Cloud.me.banned) return Promise.resolve();
    var data = null; try { data = localStorage.getItem(frKey(s)); } catch (e) {} if (!data) return Promise.resolve();
    var info = frSlotInfo(s) || {};
    return Cloud.req("POST", "/rest/v1/saves", { user_id: uid, slot: s, data: data, ts: info.ts || Date.now(), updated_at: new Date().toISOString(),
      summary: { name: info.name, mascot: info.mascot, cls: info.cls, c1: info.c1, c2: info.c2, year: info.year, phase: info.phase, week: info.week, w: info.w, l: info.l, coach: info.coach, tt: info.tt, cw: info.cw, cl: info.cl } },
      { prefer: "resolution=merge-duplicates,return=minimal" }).then(function () { Cloud.status = "Synced"; }).catch(function (e) { Cloud.status = "Cloud save failed: " + e.message; });
  },
  queueSave: function (s) { if (!Cloud.on() || !Cloud.signedIn() || Cloud.me.banned) return; Cloud.dirty[s] = 1; Cloud.status = "Saving…"; clearTimeout(Cloud.st); Cloud.st = setTimeout(Cloud.flushSaves, 4000); },
  flushSaves: function () { clearTimeout(Cloud.st); var ks = Object.keys(Cloud.dirty); Cloud.dirty = {}; return Promise.all(ks.map(function (s) { return Cloud.pushSlot(+s); })); },
  deleteSlot: function (s) { if (!Cloud.signedIn() || Cloud.me.banned) return; delete Cloud.dirty[s]; Cloud.req("DELETE", "/rest/v1/saves?user_id=eq." + Cloud.uid() + "&slot=eq." + s, undefined, { prefer: "return=minimal" }).catch(function () {}); },

  // ---- activity tracking ----
  track: function (kind, detail) {
    if (!Cloud.on() || (typeof TEST !== "undefined" && TEST && !QS.cloud)) return;
    Cloud.q.push({ kind: kind, detail: detail || {}, anon_id: Cloud.anon(), user_id: Cloud.uid() });
    clearTimeout(Cloud.qt); Cloud.qt = setTimeout(function () { Cloud.flushEvents(false); }, Cloud.q.length >= 10 ? 0 : 8000);
  },
  flushEvents: function (keep) {
    clearTimeout(Cloud.qt); if (!Cloud.q.length) return;
    var batch = Cloud.q.splice(0, 50);
    var uid = Cloud.uid(); batch.forEach(function (e) { if (e.user_id && e.user_id !== uid) e.user_id = null; });
    Cloud.req("POST", "/rest/v1/events", batch, { prefer: "return=minimal", keepalive: !!keep }).catch(function () {});
  },

  // ---- league overrides (admin edits) ----
  fetchLeague: function () {
    return Cloud.req("GET", "/rest/v1/league?select=data,updated_at,updated_by&id=eq.1", undefined, { noAuth: true }).then(function (rows) {
      var row = rows && rows[0];
      if (!row) { if (AL_LEAGUE_META) { leagueApply(null); try { localStorage.removeItem("fnb_league"); } catch (e) {} } return; }
      if (AL_LEAGUE_META && AL_LEAGUE_META.updated_at === row.updated_at) return;
      if (leagueApply(row)) { try { localStorage.setItem("fnb_league", JSON.stringify(row)); } catch (e) {} }
    }).catch(function () {});
  },
  publishLeague: function (list) {
    var row = { id: 1, data: { v: 1, schools: list }, updated_at: new Date().toISOString(), updated_by: Cloud.email() };
    return Cloud.req("POST", "/rest/v1/league", row, { prefer: "resolution=merge-duplicates,return=minimal" }).then(function () { leagueApply(row); try { localStorage.setItem("fnb_league", JSON.stringify(row)); } catch (e) {} });
  },
  resetLeague: function () { return Cloud.req("DELETE", "/rest/v1/league?id=eq.1", undefined, { prefer: "return=minimal" }).then(function () { leagueApply(null); try { localStorage.removeItem("fnb_league"); } catch (e) {} }); }
};
