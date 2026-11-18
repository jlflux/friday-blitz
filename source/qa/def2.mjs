import { createRequire } from "module"; const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const b = await chromium.launch({ args: ["--use-gl=swiftshader"] }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("file://" + process.argv[2] + "?test&seed=21&quarterMinutes=2");
await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await p.evaluate(() => window.__game.begin());
for (let k = 0; k < 4000; k++) {
  const s = await p.evaluate(() => { const g = window.__game, G = g._g(); if (G.phase === "playcall") { if (G.poss === "H") g._sim.userCall("off", "dive"); else g._sim.userCall("def", "cover2"); } if (G.phase === "pat") g._sim.userPAT("kick"); if (G.phase === "kick") g._sim.kickTap(); g.step(1); return { ph: G.phase, poss: G.poss }; });
  if (s.ph === "presnap" && s.poss === "A") break;
}
const info = await p.evaluate(() => { const G = window.__game._g(); return G.players.filter(x => x.tm === "H" && x.onField).map(x => { const q = window.__game.project(x.x, x.y, 1.2); return [x.role, Math.round(q.x), Math.round(q.y), q.on]; }); });
console.log(JSON.stringify(info));
const cb = info.find(x => x[0] === "CB1");
const el = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e.id || e.className || e.tagName; }, [cb[1], cb[2]]);
console.log("element at CB1:", el);
await p.screenshot({ path: "/tmp/presnap.png" });
await p.mouse.click(cb[1], cb[2]);
console.log("ctl after:", await p.evaluate(() => window.__game._g().ctl.role), await p.evaluate(() => window.__game._app().st));
await b.close();
