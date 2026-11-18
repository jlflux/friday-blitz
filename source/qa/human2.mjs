// Human-input QA: plays through DOM clicks + keyboard (no bot). node qa/human.mjs <html> [--w --h --qmin --lang --shots]
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const args = Object.fromEntries(process.argv.slice(3).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "1"]; }));
const file = process.argv[2], W = +(args.w || 390), H = +(args.h || 844), shots = args.shots || "qa/human";
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: !!args.touch });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message + " " + (e.stack || "").split("\n")[1]));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto(`file://${file}?test&seed=${args.seed || 5}&quarterMinutes=${args.qmin || 1}${args.lang ? "&lang=" + args.lang : ""}`);
await page.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await page.click("#bPlay"); await page.waitForTimeout(150); await page.click("#bKick"); await page.waitForTimeout(100);
const step = (n) => page.evaluate((n) => window.__game.step(n, 1 / 30), n);
let info = await step(1), guard = 0, shot = 0, plays = 0, lastPhase = "";
const log = [];
while (info.st !== "end" && guard++ < 4000 && !errors.length) {
  const ph = info.phase;
  if (ph !== lastPhase) { log.push(ph); lastPhase = ph; }
  if (ph === "playcall") {
    const vis = await page.isVisible("#playcall");
    if (vis) {
      if (shot < 2) { await page.screenshot({ path: `${shots}/pc${shot++}.png` }); }
      if (info.poss === "H" && plays % 4 === 1) { const tabs = await page.$$("#playcall .ftab"); if (tabs.length) { await tabs[(plays * 3) % tabs.length].click(); await page.waitForTimeout(30); } }
      const cards = await page.$$("#playcall .pcard"); const pick = cards[(plays * 7 + 3) % cards.length];
      // on 4th down prefer a kick when shown
      const kick = await page.$$("#playcall .pctop .btn.sec");
      if (info.down === 4 && kick.length) await kick[kick.length - 1].click(); else await pick.click();
      plays++;
    }
    info = await step(3); continue;
  }
  if (ph === "presnap" || ph === "lineup") {
    const poss = await page.evaluate(() => window.__game._g().poss);
    if (poss === "H") {
      if (plays % 5 === 2 && ph === "presnap") { const hb = await page.$("#dockR .rb.blue"); if (hb) { await hb.click(); const r = await page.$$("#menu .btn.mk"); if (r.length) { await r[plays % r.length].click(); const rr = await page.$$("#menu .btn.mk"); if (rr.length) { if (shot < 8) await page.screenshot({ path: `${shots}/hot${shot++}.png` }); await rr[1].click(); } } } }
      if (plays % 7 === 3 && ph === "presnap") { const ab = await page.$("#dockR .rb.red"); if (ab) { await ab.click(); const r = await page.$$("#menu .pcard"); if (shot < 8) await page.screenshot({ path: `${shots}/aud${shot++}.png` }); if (r.length) await r[0].click(); else await page.click("#menu .btn.sec"); } }
      try { if (ph === "presnap") { if (shot < 9) await page.screenshot({ path: `${shots}/pre${shot++}.png` }); const sb = await page.$("#dockR .rb.green"); if (sb) await sb.click({timeout:500}); } } catch (e) {}
    } else if (plays % 6 === 4 && ph === "presnap") { try { const ab = await page.$("#dockR .rb.red"); if (ab) { await ab.click({timeout:500}); const r = await page.$$("#menu .btn.mk"); if (r.length) await r[plays % r.length].click({timeout:500}); } } catch (e) {} plays++; }
    info = await step(3); continue;
  }
  if (ph === "pat") { await page.click("#pat .btn.pri"); info = await step(3); continue; }
  if (ph === "kick") {
    const g = await page.evaluate(() => { const k = window.__game._g().kick; return k && { n: k.needle, team: k.team, fl: k.flying }; });
    if (g && g.team === "H" && !g.fl && Math.abs(g.n - 0.5) < 0.06) { await page.mouse.click(W / 2, H / 2); }
    info = await step(1); continue;
  }
  if (ph === "live") {
    const st = await page.evaluate(() => { const G = window.__game._g(), pl = G.play; return { poss: G.poss, type: pl.off.type, thrown: pl.thrown, t: pl.t, carrier: pl.carrier ? pl.carrier.tm : null }; });
    if (st.poss === "H" && st.type === "pass" && !st.thrown && st.t > 1.6) {
      const btns = await page.$$("#dockR .rb.rk"); if (btns.length) { if (shot < 6) await page.screenshot({ path: `${shots}/live${shot++}.png` }); await btns[plays % btns.length].click(); }
    }
    if (st.carrier === "H") { await page.keyboard.down("ArrowUp"); if (plays % 3 === 0) await page.keyboard.down("ArrowRight"); }
    else if (st.poss === "A") { await page.keyboard.down("ArrowDown"); if (st.carrier === "A" && Math.random() < 0.15) await page.keyboard.press("Space"); }
    info = await step(4);
    await page.keyboard.up("ArrowUp"); await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowDown");
    continue;
  }
  info = await step(6);
}
await page.waitForTimeout(1600);
await page.screenshot({ path: `${shots}/end.png` });
const ev = info.events.map((e) => e.type), counts = ev.reduce((a, t) => ((a[t] = (a[t] || 0) + 1), a), {});
console.log('guard', guard, 'phases', log.slice(-12).join('>'), JSON.stringify(await page.evaluate(() => { const G = window.__game._g(); return { ph: G.phase, kick: G.kick && { team: G.kick.team, kind: G.kick.kind, n: G.kick.needle, fl: G.kick.flying }, pat: document.getElementById('pat').className, pc: document.getElementById('playcall').className }; })));
console.log(JSON.stringify({ st: info.st, outcome: info.outcome, score: info.score, q: info.quarter, plays, counts, audio: info.audio }));
if (errors.length) console.log("ERRORS\n" + errors.join("\n"));
await browser.close();
