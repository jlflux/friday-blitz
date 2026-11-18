import { createRequire } from "module"; const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const b = await chromium.launch({ args: ["--use-gl=swiftshader"] }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + process.argv[2] + "?test&seed=21&quarterMinutes=2");
await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await p.evaluate(() => window.__game.begin());
const out = { selects: 0, autoSwitch: 0, plays: 0, waitedOk: 0 };
for (let k = 0; k < 4000 && out.plays < 6; k++) {
  const s = await p.evaluate(() => { const g = window.__game, G = g._g(); if (G.phase === "playcall") { if (G.poss === "H") g._sim.userCall("off", "dive"); else g._sim.userCall("def", "cover2"); } if (G.phase === "pat") g._sim.userPAT("kick"); if (G.phase === "kick") g._sim.kickTap(); g.step(3); return { ph: G.phase, poss: G.poss, t: G.phaseT }; });
  if (s.ph === "presnap" && s.poss === "A") {
    // tap the free safety on screen
    const pt = await p.evaluate(() => { const G = window.__game._g(), fs = G.players.find(x => x.tm === "H" && x.role === "CB1" && x.onField); const q = window.__game.project(fs.x, 1.2, fs.y); return { x: q.x, y: q.y, on: q.on, role: fs.role }; });
    if (pt.on) { await p.mouse.click(pt.x, pt.y); const ctl = await p.evaluate(() => window.__game._g().ctl.role); if (ctl === "CB1") out.selects++; }
    const t0 = await p.evaluate(() => window.__game._g().phaseT);
    let ph = "presnap", tt = 0; while (ph === "presnap") { const r = await p.evaluate(() => { const G = window.__game._g(); window.__game.step(1); return [G.phase, G.phaseT]; }); ph = r[0]; if (ph === "presnap") tt = r[1]; }
    if (tt >= 0.9) out.waitedOk++;
    // run the play out, checking control after a catch/handoff
    let done = false;
    for (let j = 0; j < 400 && !done; j++) { const r = await p.evaluate(() => { const G = window.__game._g(); window.__game.step(1); const c = G.play && G.play.carrier; return { ph: G.phase, carrierA: c && c.tm === "A", ctl: G.ctl && G.ctl.role, d: c && G.ctl ? Math.hypot(c.x - G.ctl.x, c.y - G.ctl.y) : null }; });
      if (r.carrierA && r.d !== null && r.d < 9) { out.autoSwitch++; done = true; } if (r.ph !== "live" && j > 5) done = true; }
    out.plays++;
  }
}
out.errors = errs; console.log(JSON.stringify(out)); await b.close();
