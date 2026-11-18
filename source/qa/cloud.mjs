// Cloud/admin end-to-end against the mock Supabase (qa: /tmp/mock/server.mjs on :54400 over local Postgres)
import { createRequire } from "module"; import fs from "fs"; import { execSync } from "child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const file = process.argv[2], shots = process.argv[3] || "/tmp/cloudshots"; fs.rmSync(shots, { recursive: true, force: true }); fs.mkdirSync(shots, { recursive: true });
const url = `file://${file}?test&quarterMinutes=1&cloud=${encodeURIComponent("http://localhost:54400|testkey")}`;
const sql = (q) => execSync(`psql -h /tmp/pg -p 54329 -U postgres -d fnb -tA -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const b = await chromium.launch(); const errs = [];
const dev = async (name, w = 1440, h = 900) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(name + ": " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(name + " console: " + m.text()); }); await p.goto(url); await p.waitForFunction(() => window.__game && window.__game.info().st === "intro"); return p; };
let n = 0; const snap = async (p, nm, full) => { await p.waitForTimeout(150); await p.screenshot({ path: `${shots}/${String(n++).padStart(2, "0")}-${nm}.png`, fullPage: !!full }); };
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) errs.push("FAIL " + msg); };

// device A: guest starts a program
const A = await dev("A");
await A.click("#bFr"); await snap(A, "guest-programs");
await A.click('#fr [data-a="newslot"][data-v="0"]'); await A.click('#fr [data-a="ncls"][data-v="5A"]'); await A.click('#fr .sch:has-text("Homewood")'); await A.click('#fr [data-a="ncreate"]');
await A.click('#fr .hbtns [data-a="sim"]'); await A.waitForTimeout(9000);
ok(+sql("select count(*) from events where anon_id is not null and user_id is null") >= 3, "guest events recorded (open, franchise_new, game)");
// sign up
await A.click('#fr .ni[data-v="programs"]'); await A.click('#fr .acctbar [data-a="acct"][data-v="up"]'); await snap(A, "signup-modal");
await A.fill('#fr input[data-in="ae"]', "alice@example.com"); await A.fill('#fr input[data-in="ap"]', "secret123"); await A.click('#fr [data-a="acct-go"]');
await A.waitForFunction(() => window.__fr.Cloud.signedIn() && !window.__fr.Cloud.busy, null, { timeout: 10000 }); await A.waitForTimeout(500); await snap(A, "signed-in-programs");
ok(sql("select count(*) from saves s join auth.users u on u.id=s.user_id where u.email='alice@example.com'") === "1", "guest program adopted and uploaded to alice's cloud saves");
ok(sql("select coalesce(coach_name,'') from profiles where email='alice@example.com'") !== null, "profile row created on sign-up");
const ts1 = sql("select ts from saves");
await A.click('#fr [data-a="slot"][data-v="0"]'); await A.click('#fr .hbtns [data-a="sim"]'); await A.waitForTimeout(5500);
  await A.evaluate(() => window.__fr.Cloud.flushEvents()); await A.waitForTimeout(800);
ok(sql("select ts from saves") !== ts1, "cloud save updates a few seconds after playing");
ok(+sql("select count(*) from events e join auth.users u on u.id=e.user_id where u.email='alice@example.com' and kind='game'") >= 1, "signed-in game event has user id");
const recA = await A.evaluate(() => { const F = window.__fr; return F.tm(F.FR.user).w + "-" + F.tm(F.FR.user).l + " wk" + F.FR.week; });

// device B: same account picks it up
const B = await dev("B", 390, 844);
await B.click("#bFr"); await B.click('#fr .acctbar [data-a="acct"][data-v="in"]'); await B.fill('#fr input[data-in="ae"]', "alice@example.com"); await B.fill('#fr input[data-in="ap"]', "wrongpass"); await B.click('#fr [data-a="acct-go"]'); await B.waitForTimeout(800); await snap(B, "bad-password");
ok(await B.$('#fr .err') !== null, "wrong password shows an error");
await B.fill('#fr input[data-in="ap"]', "secret123"); await B.press('#fr input[data-in="ap"]', "Enter");
await B.waitForFunction(() => window.__fr.Cloud.signedIn() && !window.__fr.Cloud.busy, null, { timeout: 10000 }); await B.waitForTimeout(400); await snap(B, "device-b-programs");
await B.click('#fr [data-a="slot"][data-v="0"]'); await B.waitForTimeout(300);
const recB = await B.evaluate(() => { const F = window.__fr; return F.FR ? F.tm(F.FR.user).w + "-" + F.tm(F.FR.user).l + " wk" + F.FR.week : "none"; });
ok(recA === recB, "second device loads the same program (" + recA + " vs " + recB + ")");

// admin
const C = await dev("admin");
sql("insert into admins values ('coach@admin.test') on conflict do nothing");
await C.click("#bFr"); await C.click('#fr .acctbar [data-a="acct"][data-v="up"]'); await C.fill('#fr input[data-in="ae"]', "coach@admin.test"); await C.fill('#fr input[data-in="ap"]', "adminpass1"); await C.click('#fr [data-a="acct-go"]');
await C.waitForFunction(() => window.__fr.Cloud.me.admin && !window.__fr.Cloud.busy, null, { timeout: 10000 });
await C.click('#fr .acctbar [data-a="admin"]'); await C.waitForFunction(() => window.__fr.FUI.adm && window.__fr.FUI.adm.totals, null, { timeout: 10000 }); await snap(C, "admin-overview", true);
await C.click('#fr [data-a="adm-tab"][data-v="accounts"]'); await snap(C, "admin-accounts");
const aliceId = sql("select id from auth.users where email='alice@example.com'");
await C.click(`#fr [data-a="adm-sel"][data-v="${aliceId}"]`); await C.waitForTimeout(800); await snap(C, "admin-activity");
await C.fill('#fr input[data-in="aq"]', "zzz"); const vis = await C.$$eval("#fr .arow", (r) => r.filter((x) => x.style.display !== "none").length); ok(vis === 0, "account search filters rows"); await C.fill('#fr input[data-in="aq"]', "");
await C.click(`#fr [data-a="adm-ban"][data-v="${aliceId}"]`); await C.click(`#fr [data-a="adm-ban"][data-v="${aliceId}"]`); await C.waitForTimeout(600);
ok(sql("select banned from profiles where email='alice@example.com'") === "t", "admin can disable an account");
// league editor: move Homewood to 5A Region 5, rename Calera mascot
await C.click('#fr [data-a="adm-tab"][data-v="league"]'); await C.click('#fr [data-a="adm-lcls"][data-v="5A"]'); await snap(C, "admin-league");
const hi = await C.evaluate(() => window.__fr.FUI.adm.lg.findIndex((s) => s.n === "Homewood"));
await C.selectOption(`#fr select[data-lgs="${hi}|reg"]`, "5"); await C.waitForTimeout(200);
const ci = await C.evaluate(() => window.__fr.FUI.adm.lg.findIndex((s) => s.n === "Calera"));
await C.fill(`#fr input[data-lg="${ci}|m"]`, "Fighting Eagles"); await C.locator(`#fr input[data-lg="${ci}|m"]`).blur();
// break a region on purpose to see validation
const ri = await C.evaluate(() => window.__fr.FUI.adm.lg.findIndex((s) => s.n === "Ramsay"));
await C.click(`#fr [data-a="adm-del"][data-v="${ri}"]`); for (let k = 0; k < 3; k++) { const j = await C.evaluate(() => window.__fr.FUI.adm.lg.findIndex((s) => s.cls === "5A" && s.reg === 4)); await C.click(`#fr [data-a="adm-del"][data-v="${j}"]`); }
await snap(C, "admin-league-errors");
ok(await C.$('#fr [data-a="adm-pub"][disabled]') !== null, "publish blocked while a region is too small");
await C.click('#fr [data-a="adm-disc"]');
const hi2 = await C.evaluate(() => window.__fr.FUI.adm.lg.findIndex((s) => s.n === "Homewood"));
await C.selectOption(`#fr select[data-lgs="${hi2}|reg"]`, "5"); await C.fill(`#fr input[data-lg="${ci}|m"]`, "Fighting Eagles"); await C.locator(`#fr input[data-lg="${ci}|m"]`).blur(); await C.waitForTimeout(200);
await C.click('#fr [data-a="adm-pub"]'); await C.waitForTimeout(1000); await snap(C, "admin-league-published");
ok(sql("select count(*) from league") === "1", "league published to database");
// a brand-new guest sees the edited league
const D = await dev("D");
await D.waitForTimeout(1200); await D.reload(); await D.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await D.click("#bFr"); await D.click('#fr [data-a="newslot"][data-v="0"]'); await D.click('#fr [data-a="ncls"][data-v="5A"]'); await D.click('#fr [data-a="nreg"][data-v="5"]'); await snap(D, "guest-sees-edited-league");
ok(await D.$('#fr .sch:has-text("Homewood")') !== null, "new franchise uses the published league (Homewood in 5A Region 5)");
ok(await D.evaluate(() => window.__fr.App && true), "page alive");
// disabled alice: cloud saves blocked, status shown
await A.reload(); await A.waitForFunction(() => window.__game && window.__game.info().st === "intro"); await A.click("#bFr"); await A.waitForFunction(() => !window.__fr.Cloud.busy && window.__fr.Cloud.ready, null, { timeout: 10000 }); await A.waitForTimeout(300); await snap(A, "alice-disabled");
ok(await A.evaluate(() => window.__fr.Cloud.me.banned), "disabled account is told on next open");
// admin re-enables, then resets alice: her local copy is wiped on next open
await C.click('#fr [data-a="adm-tab"][data-v="accounts"]'); await C.click(`#fr [data-a="adm-ban"][data-v="${aliceId}"]`); await C.click(`#fr [data-a="adm-ban"][data-v="${aliceId}"]`); await C.waitForTimeout(500);
await C.click(`#fr [data-a="adm-reset"][data-v="${aliceId}"]`); await C.click(`#fr [data-a="adm-reset"][data-v="${aliceId}"]`); await C.waitForTimeout(600);
ok(sql("select count(*) from saves s join auth.users u on u.id=s.user_id where u.email='alice@example.com'") === "0", "reset deletes cloud saves");
await B.reload(); await B.waitForFunction(() => window.__game && window.__game.info().st === "intro"); await B.click("#bFr"); await B.waitForFunction(() => !window.__fr.Cloud.busy && window.__fr.Cloud.ready, null, { timeout: 10000 }); await B.waitForTimeout(300); await snap(B, "after-reset");
ok(await B.$('#fr [data-a="slot"]') === null, "reset clears the program from the other device too");
// restore league, sign out
await C.click('#fr [data-a="adm-tab"][data-v="league"]'); await C.click('#fr [data-a="adm-restore"]'); await C.click('#fr [data-a="adm-restore"]'); await C.waitForTimeout(600);
ok(sql("select count(*) from league") === "0", "restore built-in league");
await B.click('#fr .acctbar [data-a="acct"]'); await B.click('#fr [data-a="acct-out"]'); await B.waitForTimeout(500);
ok(!(await B.evaluate(() => window.__fr.Cloud.signedIn())), "sign out");
console.log("events by kind:", sql("select string_agg(kind||'='||c, ' ') from (select kind, count(*) c from events group by kind) x"));
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no errors");
await b.close();
