import { createRequire } from "module"; const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on("pageerror", e => console.log("ERR", e.message));
await p.goto("file:///home/claude/fb/dist/friday-night-blitz-v01.html?test&seed=8&quarterMinutes=1");
await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await p.evaluate(() => window.__game.begin());
// force a 4th-down FG by the user
const r = await p.evaluate(() => { const g = window.__game, G = g._g(); g.step(120); G.down = 4; G.los = 75; G.poss = "H"; g._sim.beginPlayCall(); g._sim.userCall("fg"); 
  var out = []; for (var i = 0; i < 200; i++) { g.step(1); out.push(G.phase + (G.kick ? ":" + (G.kick.flying ? "F" : "") + (G.kick.result || "") : "")); if (i === 30) g._sim.kickTap(); } return out.filter((x, i, a) => a[i - 1] !== x).join(" > "); });
console.log(r); await b.close();
