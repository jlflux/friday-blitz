import { createRequire } from "module"; const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + process.argv[2] + "?test&seed=4&quarterMinutes=1");
await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
const out = {};
// edit home team: name + colour, verify on field
await p.click("#bPlay"); await p.click(".tnav .btn.sec");
await p.fill("#ebody input[type=text] >> nth=0", "Homewood");
await p.click("#ebody .swatches >> nth=0 >> .sw >> nth=7");
await p.click("#tabRoster"); await p.fill(".rname >> nth=0", "Test Qb"); await p.click("#bDone");
out.setupName = await p.textContent("#cards .tn");
await p.click("#bKick"); await p.waitForTimeout(100);
out.st1 = await p.evaluate(() => { const G = window.__game._g(); return { st: window.__game.info().st, name: G.home.name, prim: G.home.primary, qb: G.home.roster[0].name }; });
// mouse-drag joystick during a live play
await p.evaluate(() => window.__game.step(150));
await p.evaluate(() => { const g = window.__game, G = g._g(); if (G.phase === "playcall" && G.poss === "H") g._sim.userCall("off", "dive"); else if (G.phase === "playcall") g._sim.userCall("def", "cover2"); });
let ph = ""; for (let i = 0; i < 80 && ph !== "live"; i++) ph = (await p.evaluate(() => { const g = window.__game, G = g._g(); if ((G.phase === "presnap" || G.phase === "lineup") && G.poss === "H") g._sim.requestSnap(); return g.step(1); })).phase;
const before = await p.evaluate(() => { const c = window.__game._g().ctl; return c && { x: c.x, y: c.y }; });
await p.mouse.move(195, 600); await p.mouse.down(); await p.mouse.move(260, 600, { steps: 4 });
await p.evaluate(() => window.__game.step(20));
out.joyVisible = await p.isVisible("#joy");
const after = await p.evaluate(() => { const c = window.__game._g().ctl; return c && { x: c.x, y: c.y }; });
await p.mouse.up();
out.joyMovedX = before && after ? +(after.x - before.x).toFixed(2) : null;
// pause
await p.click("#bPause"); out.pauseShown = await p.isVisible("#pause"); await p.click("#pRes"); out.pauseHidden = !(await p.isVisible("#pause"));
// force an end and test buttons
await p.evaluate(() => { const G = window.__game._g(); G.score.H = 21; G.score.A = 3; G.quarter = 4; G.clock = 0.5; });
for (let i = 0; i < 400; i++) { const inf = await p.evaluate(() => { const g = window.__game, G = g._g(); if (G.phase === "playcall") { if (G.poss === "H") g._sim.userCall("off", "dive"); else g._sim.userCall("def", "run"); } if (G.phase === "pat") g._sim.userPAT("kick"); if ((G.phase === "presnap" || G.phase === "lineup") && G.poss === "H") g._sim.requestSnap(); if (G.phase === "kick") g._sim.kickTap(); return g.step(10); }); if (inf.st === "end") { out.end = inf.outcome; break; } }
await p.waitForTimeout(1200);
out.endVisible = await p.isVisible("#end"); out.nextLabel = await p.textContent("#eNext");
const oppBefore = await p.evaluate(() => window.__game._g().away.name);
await p.click("#eNext"); out.afterNext = await p.evaluate(() => ({ st: window.__game.info().st, away: window.__game._g().away.name }));
out.oppChanged = oppBefore !== out.afterNext.away;
out.season = await p.evaluate(() => window.__game._app().save);
await p.click("#bPause"); await p.click("#pQuit"); out.backToTitle = await p.isVisible("#title");
out.errors = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
