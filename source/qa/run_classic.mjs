// QA: node qa/run.mjs <html> [--w=390 --h=844 --seed=1 --qmin=1 --shots=dir --bot]
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const args = Object.fromEntries(process.argv.slice(3).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "1"]; }));
const file = process.argv[2];
const W = +(args.w || 390), H = +(args.h || 844);
const shots = args.shots || "qa/shots";
import fs from "fs"; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await ctx.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : r.abort()));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 4).join("\n")));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const q = `?test&seed=${args.seed || 1}&quarterMinutes=${args.qmin || 1}&camera=classic${args.bot ? "&bot" : ""}${args.lang ? "&lang=" + args.lang : ""}`;
await page.goto("file://" + file + q);
await page.waitForFunction(() => window.__game && window.__game.info().st !== "boot", null, { timeout: 8000 });
await page.screenshot({ path: `${shots}/00-title.png` });
if (args.setup) {
  await page.click("#bPlay"); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/01-setup.png` });
  await page.click(".tnav .btn.sec"); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/02-editor-team.png` });
  await page.click("#tabRoster"); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/03-editor-roster.png` });
  await page.click("#bDone"); await page.waitForTimeout(200);
}
await page.evaluate(() => window.__game.begin());
let info = await page.evaluate(() => window.__game.info());
const t0 = Date.now(); let n = 0, lastPhase = "", shotsTaken = 0;
const want = (args.at || "").split(",").filter(Boolean).map(Number);
while (info.st !== "end" && Date.now() - t0 < 170000) {
  info = await page.evaluate(() => window.__game.step(30, 1 / 30));
  n++;
  if (want.length && n === want[0]) { want.shift(); await page.screenshot({ path: `${shots}/s${String(n).padStart(3, "0")}-${info.phase}.png` }); shotsTaken++; }
  if (args.trace && info.phase !== lastPhase) { lastPhase = info.phase; }
  if (errors.length) break;
}
await page.waitForTimeout(1500); await page.screenshot({ path: `${shots}/zz-end.png` });
if (args.dump) fs.writeFileSync(args.dump, JSON.stringify(await page.evaluate(() => window.__game._g().events)));
const ev = info.events.map((e) => e.type);
const counts = ev.reduce((a, t) => ((a[t] = (a[t] || 0) + 1), a), {});
console.log(JSON.stringify({ st: info.st, phase: info.phase, outcome: info.outcome, score: info.score, quarter: info.quarter, clock: info.clock, simT: info.t, steps: n, wall: Date.now() - t0, counts, fps: (await page.evaluate(() => window.__game.stats())) }, null, 0));
if (errors.length) console.log("ERRORS:\n" + errors.slice(0, 5).join("\n"));
await browser.close();
