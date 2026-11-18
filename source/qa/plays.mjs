import { createRequire } from "module"; const require = createRequire(import.meta.url);
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const b = await chromium.launch({ args: ["--use-gl=swiftshader"] }); const p = await b.newPage({ viewport: { width: 844, height: 390 } });
const errs = []; p.on("pageerror", e => errs.push(e.message + (e.stack||"").split("\n").slice(1,3).join("|")));
await p.goto("file://" + process.argv[2] + "?test&seed=3&quarterMinutes=12&bot");
await p.waitForFunction(() => window.__game && window.__game.info().st === "intro");
await p.evaluate(() => window.__game.begin());
const ids = await p.evaluate(() => { const G = window.__game._g(); return null; });
const res = {};
const plays = ["slants","curl","deep","screen","izone","draw","flood","smash","bubble","tzone","mesh","bcorner","bdive","verts","qouts","qbdraw","dive","counter","padeep","ycross","power","stretch","paseam","idive","sweep","powero","papost","readopt","pcounter","pycross","qbpower","rposlant","qbcounter","sneak","gdive","paflat","fade"];
for (const id of plays) for (let rep = 0; rep < 3; rep++) {
  const r = await p.evaluate((id) => { const g = window.__game, G = g._g();
    for (let k = 0; k < 3000; k++) { if (G.phase === "playcall") break; if (G.phase === "pat") g._sim.userPAT("kick"); if (G.phase === "kick") g._sim.kickTap();
      if (G.phase === "playcall" && G.poss === "A") g._sim.userCall("def", "cover2"); if ((G.phase === "presnap"||G.phase==="lineup") && G.poss === "H") g._sim.requestSnap(); g.step(1); if (G.phase === "playcall" && G.poss === "A") g._sim.userCall("def", "cover2"); }
    // force home possession at own 40
    G.poss = "H"; G.los = 40; G.down = 1; G.toGo = 10; G.ballX = 26.66; g._sim.beginPlayCall(); g._sim.userCall("off", id, false);
    for (let k = 0; k < 60 && G.phase !== "live"; k++) { if (G.phase === "presnap"||G.phase==="lineup") g._sim.requestSnap(); g.step(1); }
    let maxT = 0; const start = G.los; let type = G.play && G.play.off.type, carrier = null;
    for (let k = 0; k < 600 && G.phase === "live"; k++) { g.step(1); if (G.play.carrier) carrier = G.play.carrier.role; }
    const res0 = G.play && G.play.result, car = carrier; for (let k = 0; k < 400 && G.phase !== "playcall"; k++) { if (G.phase === "pat") break; g.step(1); }
    return { ph: G.phase, gain: Math.round((G.los - start) * 10) / 10, type, carrier: car, res: res0 };
    return { ph: G.phase, gain: Math.round((G.los - start) * 10) / 10, type, carrier, res: G.play && G.play.result };
  }, id);
  (res[id] = res[id] || []).push(r.gain + ":" + (r.carrier||"-") + ":" + (r.res||""));
}
for (const k in res) console.log(k.padEnd(10), res[k].join("  "));
console.log("errors", errs.slice(0,5));
await b.close();
