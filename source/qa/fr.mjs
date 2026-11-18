// Franchise dashboard QA: node qa/fr.mjs <html> [--w=1440 --h=900 --shots=qa/fr]
import { createRequire } from "module"; import fs from "fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const args = Object.fromEntries(process.argv.slice(3).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "1"]; }));
const file = process.argv[2], W = +(args.w || 1440), H = +(args.h || 900), shots = args.shots || "qa/fr";
fs.rmSync(shots, { recursive: true, force: true }); fs.mkdirSync(shots, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=swiftshader"] }); const ctx = await b.newContext({ viewport: { width: W, height: H } }); const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message + " " + (e.stack || "").split("\n")[1])); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const url = `file://${file}?test&quarterMinutes=1`;
await p.goto(url); await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
let n = 0; const snap = async (name, full) => { await p.waitForTimeout(90); await p.screenshot({ path: `${shots}/${String(n++).padStart(2, "0")}-${name}.png`, fullPage: !!full }); };
const nav = async (k) => { if (W < 860) { await p.click("#fr .burger"); await p.waitForTimeout(250); } await p.click(`#fr .ni[data-v="${k}"]`); };
const overflow = async (tag) => { const o = await p.evaluate(() => { const r = []; document.querySelectorAll("#fr .card, #fr .ftop, #fr .kpi").forEach(e => { if (e.scrollWidth > e.clientWidth + 2 && !e.querySelector(".tscroll,.bracket")) r.push(e.className + ":" + (e.querySelector("h3") || {}).textContent); }); return r; }); if (o.length) errs.push("overflow on " + tag + ": " + o.slice(0, 3).join(" | ")); };
await p.click("#bFr"); await snap("programs");
await p.click('#fr [data-a="newslot"][data-v="0"]'); await snap("new-6A");
await p.click('#fr [data-a="ncls"][data-v="5A"]'); await p.click('#fr [data-a="nreg"][data-v="4"]');
await p.click('#fr .sch:has-text("Homewood")'); await snap("new-pick");
await p.click('#fr [data-a="ncreate"]'); await snap("home-pre"); await overflow("home");
for (const k of ["schedule", "standings", "playoffs", "poll", "stats", "roster", "depth", "practice", "offers", "feeder", "staff", "facilities", "news", "records", "history", "settings"]) { await nav(k); await snap("pg-" + k); await overflow(k); }
await nav("home");
await p.click('#fr .hbtns [data-a="sim"]'); await snap("home-after-sim");
await p.click('#fr .ftoast2 [data-a="box"]'); await snap("box-sim"); await p.click('#fr .fmb [data-a="close"]');
// watch week 2
await p.click('#fr .hbtns [data-a="watch"]'); await p.waitForTimeout(3500); await snap("watch-live");
await p.click('#fr .wctl [data-a="w-sp"][data-v="4"]'); await p.waitForFunction(() => document.querySelector('#fr [data-a="w-done"]'), null, { timeout: 60000 }); await snap("watch-final");
await p.click('#fr [data-a="w-done"]'); await snap("box-watch"); await p.click('#fr .fmb [data-a="close"]');
// play week 3 in the 16-bit engine, bot steering
await p.click('#fr .hbtns [data-a="play"]'); await p.waitForTimeout(300);
await p.evaluate(() => { window.__game._g().bot = true; });
let info, guard = 0; do { info = await p.evaluate(() => window.__game.step(30)); } while (info.st !== "end" && guard++ < 900);
await p.waitForTimeout(1300); await snap("engine-end");
await p.click("#eNext"); await p.waitForTimeout(200); await snap("home-after-engine");
const wk = await p.evaluate(() => { const F = window.__fr, FR = F.FR; return [FR.week, FR.phase, F.tm(FR.user).w + "-" + F.tm(FR.user).l]; }); console.log("after engine game", wk);
await p.click("#fr .prow >> nth=0"); await snap("player-modal"); await p.click('#fr .fmb [data-a="close"]');
await p.click('#fr .tl >> nth=1'); await snap("team-modal"); await p.click('#fr .fmb [data-a="close"]');
await nav("offers"); await snap("offers-midseason");
await nav("home"); await p.click('#fr .hbtns [data-a="ahead"]'); await snap("ahead"); await p.click('#fr [data-a="simto"][data-v="end"]'); await snap("offseason-awards");
await nav("playoffs"); await snap("bracket"); await nav("stats"); await snap("leaders"); await nav("offseason");
for (let i = 0; i < 9; i++) {
  const st = await p.evaluate(() => { const F = window.__fr, FR = F.FR; return FR.phase === "offseason" ? F.OFF_STEPS[FR.off.step] : "done"; }); if (st === "done") break;
  if (st === "moveins") { const v = await p.$('#fr [data-a="pitch"]'); if (v) await v.click(); }
  if (st === "staff") { const h = await p.$('#fr [data-a="hire"]'); if (h) await h.click(); }
  if (st === "facilities") { const f = await p.$('#fr [data-a="fac"]:not([disabled])'); if (f) await f.click(); }
  if (st === "feeder") { const s = await p.$('#fr [data-a="scout"]:not([disabled])'); if (s) await s.click(); }
  await snap("off-" + st, true); await overflow("off-" + st); await p.click('#fr .offnav [data-a="offnext"]');
}
await snap("home-year2");
console.log("year2", await p.evaluate(() => { const F = window.__fr, FR = F.FR; return [FR.year, FR.phase, F.teamPlayers(FR.user).length, F.tm(FR.user).ovr, F.money(FR.funds), FR.hist.length]; }));
// reload, resume from saved slot
await p.goto(url); await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await p.click("#bFr"); await snap("resume-home");
const kb = await p.evaluate(() => Object.keys(localStorage).map(k => k + ":" + Math.round(localStorage.getItem(k).length / 1024) + "KB").join(" "));
console.log("storage", kb);
// quick game uses real schools
await p.click('#fr [data-a="exit"]').catch(async () => { await p.click("#fr .burger"); await p.click('#fr [data-a="exit"]'); });
const qg = await p.evaluate(() => [window.__fr.App.home.name, window.__fr.App.away.name]); console.log("quick game", qg);
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no errors");
await b.close();
