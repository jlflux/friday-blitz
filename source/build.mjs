// Build: node build.mjs [--no-minify]  ->  dist/friday-night-blitz-v01.html
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const esbuild = require("esbuild");
let sharp; try { sharp = require("sharp"); } catch (e) { try { sharp = require("/opt/npm-tools/node_modules/sharp"); } catch (e2) { sharp = null; } }

const root = path.dirname(new URL(import.meta.url).pathname);
const src = (f) => fs.readFileSync(path.join(root, "src", f), "utf8");
const minify = !process.argv.includes("--no-minify");
const version = (process.argv.find((a) => a.startsWith("--v=")) || "--v=01").slice(4);

const cfg = src("config.js");
const cut = cfg.indexOf("// ---------- STRINGS ----------");
const configBlock = cfg.slice(0, cut).replace('version: "v01"', `version: "v${version}"`);
const stringsBlock = cfg.slice(cut);
const code = ["gfx.js", "aldata.js", "teams.js", "sim.js", "league.js", "audio.js", "render.js", "ui.js", "fui.js", "main.js"].map(src).join("\n");
const wrapped = "(function(){\n" + code + "\n})();";
let out = wrapped;
if (minify) out = (await esbuild.transform(wrapped, { minify: true, target: "es2017" })).code;

// favicon: 16x16 pixel football scaled to 64
async function favicon() {
  const art = [
    "................",
    ".YYYYYYYYYYYYYY.",
    ".YNNNNNNNNNNNNY.",
    ".YNNNNOOOONNNNY.",
    ".YNNNOBBBBONNNY.",
    ".YNNOBBBBBBONNY.",
    ".YNOBBWWWWBBONY.",
    ".YNOBWBWBWBBONY.",
    ".YNOBBWWWWBBONY.",
    ".YNNOBBBBBBONNY.",
    ".YNNNOBBBBONNNY.",
    ".YNNNNOOOONNNNY.",
    ".YNNRRRRRRRRNNY.",
    ".YNNNNNNNNNNNNY.",
    ".YYYYYYYYYYYYYY.",
    "................"];
  const pal = { ".": [0, 0, 0, 0], Y: [255, 210, 63, 255], N: [11, 16, 40, 255], O: [26, 10, 4, 255], B: [138, 74, 28, 255], W: [244, 240, 224, 255], R: [232, 51, 28, 255] };
  const S = 4, W = 16 * S, buf = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const c = pal[art[Math.floor(y / S)][Math.floor(x / S)]]; buf.set(c, (y * W + x) * 4); }
  if (!sharp) return "data:image/png;base64,";
  const png = await sharp(buf, { raw: { width: W, height: W, channels: 4 } }).png().toBuffer();
  fs.writeFileSync(path.join(root, "dist", "favicon.png"), png);
  return "data:image/png;base64," + png.toString("base64");
}
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const fav = await favicon();
let html = src("template.html");
html = html.replace("%%FAVICON%%", fav).replace("%%CONFIG%%", () => configBlock).replace("%%STRINGS%%", () => stringsBlock).replace("%%CODE%%", () => out);
const file = path.join(root, "dist", `friday-night-blitz-v${version}.html`);
fs.writeFileSync(file, html);
console.log("built", file, html.length, "bytes");
