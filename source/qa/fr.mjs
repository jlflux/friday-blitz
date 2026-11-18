// Franchise QA: node qa/fr.mjs <html> [--cls=6A --w --h --shots]
import { createRequire } from "module"; import fs from "fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const args = Object.fromEntries(process.argv.slice(3).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "1"]; }));
const file = process.argv[2], W = +(args.w || 390), H = +(args.h || 844), shots = args.shots || "qa/fr", cls = args.cls || "6A";
fs.mkdirSync(shots, { recursive: true });
const b = await chromium.launch({ args: ["--use-gl=swiftshader"] }); const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on("pageerror", e => errs.push(e.message + " " + (e.stack || "").split("\n")[1])); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(`file://${file}?test&quarterMinutes=1${args.lang ? "&lang=" + args.lang : ""}`);
await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
const snap = async (n) => { await p.waitForTimeout(80); await p.screenshot({ path: `${shots}/${n}.png` }); };
await snap("00-title");
await p.click("#bFr"); await snap("01-classes");
await p.click(`#fr .clsgrid .btn:has-text("${cls}")`); await snap("02-schools");
await p.click("#fr button.frow >> nth=3"); await snap("03-hub");
for (const tab of ["stand", "poll", "roster", "depth", "stats", "prog"]) { await p.evaluate((t) => { FUI_TAB(t); }, tab).catch(() => {}); }
// click through tabs via DOM
const tabs = await p.$$("#fr .ftabs .tab"); for (let i = 1; i < tabs.length; i++) { const t = await p.$$("#fr .ftabs .tab"); await t[i].click(); await snap("04-tab" + i); }
await (await p.$$("#fr .ftabs .tab"))[0].click();
// sim two weeks
for (let i = 0; i < 2; i++) { const sim = await p.$("#fr .fnext .btn.sec"); if (sim) await sim.click(); else await p.click("#fr .fnext .btn"); }
await snap("05-after-sims");
// play week 3 with the bot steering the home team
await p.click("#fr .fnext .btn.pri");
await p.evaluate(() => { window.__game._g().bot = true; });
let info, guard = 0;
do { info = await p.evaluate(() => window.__game.step(30)); } while (info.st !== "end" && guard++ < 600);
await p.waitForTimeout(1300); await snap("06-endcard");
await p.click("#eNext"); await p.waitForTimeout(150); await snap("07-hub-after-game");
// sim out the season, playoffs and offseason
let loops = 0, seen = new Set();
while (loops++ < 80) {
  const ph = await p.evaluate(() => { const g = window.__game._g; return document.querySelector("#fr .fwk") ? document.querySelector("#fr .fwk").textContent : ""; });
  seen.add(ph);
  const off = await p.$("#fr .fbody + .btn.big.pri, #fr > .btn.big.pri");
  if (off) { const txt = await off.textContent(); if (/MOVE|WELCOME|RECIBIR|欢迎/.test(txt) === false && ph.includes("6/7")) {}
    if (ph.includes("OFFSEASON") || ph.includes("PRETEMPORADA") || ph.includes("休赛期")) {
      const step = ph.split("·")[1] ? ph.split("·")[1].trim() : ""; if (!seen.has("shot" + step)) { seen.add("shot" + step); await snap("08-off-" + step.replace("/", "of")); }
      if (step.startsWith("5/")) { const pl = await p.$$("#fr .frow .btn.xs"); if (pl.length) { await pl[0].click(); await (await p.$$("#fr .frow .btn.xs"))[1].click(); await snap("08-off-5-picked"); } }
      const off2 = await p.$("#fr > .btn.big.pri"); await off2.click(); if (step.startsWith("7/")) break; continue; } }
  const sim = await p.$("#fr .fnext .btn.sec"); const simw = await p.$("#fr .fnext .btn.sec2");
  if (sim) await sim.click(); else if (simw) await simw.click(); else break;
  if (ph.includes("CHAMPIONSHIP") && !seen.has("br")) { seen.add("br"); }
}
await snap("09-new-season");
const st = await p.evaluate(() => { const F = window.__game._fr(); return { year: F.year, phase: F.phase, week: F.week, roster: F.roster.length, hist: F.history, funds: F.funds, upg: F.upg }; });
console.log(JSON.stringify(st)); console.log("phases seen:", [...seen].slice(0, 40).join(" | "));
if (errs.length) console.log("ERRORS\n" + errs.slice(0, 6).join("\n"));
await b.close();
