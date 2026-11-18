// ---------- AUDIO (synth) ----------
var AU = { ctx: null, master: null, sfxG: null, musG: null, ambG: null, muted: false, music: null, crowd: null, noiseBuf: null, log: {}, lastAt: {} };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === "suspended") AU.ctx.resume(); return; }
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { AU.ctx = new AC(); } catch (e) { return; }
  var c = AU.ctx; AU.master = c.createGain(); AU.master.connect(c.destination);
  AU.sfxG = c.createGain(); AU.sfxG.connect(AU.master); AU.musG = c.createGain(); AU.musG.connect(AU.master);
  AU.ambG = c.createGain(); AU.ambG.connect(AU.master);
  var len = c.sampleRate * 1.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.noiseBuf = buf;
  // iOS unlock
  var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); try { s.start(0); } catch (e) {}
  audioVolumes();
}
function audioVolumes() {
  if (!AU.ctx) return; var m = AU.muted ? 0 : 1;
  AU.sfxG.gain.value = 0.32 * (P("sfxVolume") / 100) / 0.7 * m;
  AU.musG.gain.value = 0.2 * (P("musicVolume") / 100) / 0.5 * m;
  AU.ambG.gain.value = 0.18 * (P("sfxVolume") / 100) / 0.7 * m;
}
function tone(type, f0, f1, dur, vol, when, dest) {
  var c = AU.ctx; if (!c) return; var t = c.currentTime + (when || 0);
  var o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || AU.sfxG); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, fType, f0, f1, when, dest, q) {
  var c = AU.ctx; if (!c) return; var t = c.currentTime + (when || 0);
  var s = c.createBufferSource(); s.buffer = AU.noiseBuf; var f = c.createBiquadFilter(); f.type = fType || "lowpass";
  f.frequency.setValueAtTime(f0 || 1000, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 0.8;
  var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || AU.sfxG); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
var SFX_GAP = { tap: 0.05, snap: 0.2, throw: 0.15, catch: 0.1, hit: 0.09, first: 0.5, td: 1, whistle: 0.3, inc: 0.2, kick: 0.2, horn: 0.6, juke: 0.12, int: 0.5, win: 1, lose: 1, cheer: 0.8 };
function sfx(name) {
  if (typeof G !== "undefined" && G && G.attract) return;
  AU.log[name] = (AU.log[name] || 0) + 1;
  if (!AU.ctx || AU.muted) return;
  var now = AU.ctx.currentTime; if (AU.lastAt[name] && now - AU.lastAt[name] < (SFX_GAP[name] || 0.05)) return; AU.lastAt[name] = now;
  switch (name) {
    case "tap": tone("square", 880, 1320, 0.06, 0.25); break;
    case "snap": noise(0.08, 0.6, "lowpass", 400, 120); tone("square", 2600, 2500, 0.12, 0.12, 0.02); tone("square", 2900, 2800, 0.1, 0.1, 0.16); break;
    case "whistle": tone("square", 2700, 2650, 0.28, 0.14); tone("sine", 2720, 2700, 0.28, 0.12); break;
    case "throw": noise(0.3, 0.35, "bandpass", 600, 2400, 0, null, 2); break;
    case "catch": tone("square", 330, 220, 0.07, 0.35); noise(0.05, 0.4, "lowpass", 900); break;
    case "hit": noise(0.18, 0.9, "lowpass", 900, 90); tone("triangle", 110, 50, 0.15, 0.6); crowdSwell(0.25, 0.6); break;
    case "juke": noise(0.12, 0.3, "highpass", 2000, 4000); break;
    case "inc": tone("triangle", 220, 110, 0.18, 0.4); noise(0.12, 0.3, "lowpass", 500); sfx("whistle"); break;
    case "kick": noise(0.06, 0.9, "lowpass", 600, 100); tone("triangle", 140, 60, 0.12, 0.7); break;
    case "first": [523, 659, 784, 1047].forEach(function (f, i) { tone("square", f, f, 0.11, 0.18, i * 0.08); }); crowdSwell(0.6, 1.2); break;
    case "td": [392, 523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone("square", f, f, i === 6 ? 0.5 : 0.13, 0.2, i * 0.11); tone("sawtooth", f / 2, f / 2, 0.13, 0.08, i * 0.11); });
      crowdSwell(1, 2.5); break;
    case "horn": tone("sawtooth", 196, 196, 0.9, 0.22); tone("sawtooth", 247, 247, 0.9, 0.16); tone("sawtooth", 294, 294, 0.9, 0.12); break;
    case "int": [440, 415, 392, 330].forEach(function (f, i) { tone("square", f, f, 0.12, 0.2, i * 0.1); }); crowdSwell(0.9, 1.4); break;
    case "win": [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone("square", f, f, 0.16, 0.2, i * 0.13); }); break;
    case "lose": [392, 349, 311, 262].forEach(function (f, i) { tone("triangle", f, f, 0.25, 0.25, i * 0.2); }); break;
    case "cheer": crowdSwell(0.8, 1.6); break;
  }
}
function crowdSwell(vol, dur) { if (!AU.ctx) return; noise(dur, vol * 0.5, "bandpass", 900, 1400, 0, AU.ambG, 0.6); noise(dur * 0.8, vol * 0.3, "bandpass", 1800, 2200, 0.05, AU.ambG, 0.8); }
function crowdStart() {
  if (!AU.ctx || AU.crowd) return; var c = AU.ctx;
  var s = c.createBufferSource(); s.buffer = AU.noiseBuf; s.loop = true;
  var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1000; f.Q.value = 0.5;
  var g = c.createGain(); g.gain.value = 0.12; var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain);
  s.connect(f); f.connect(g); g.connect(AU.ambG); s.start(); lfo.start(); AU.crowd = { s: s, g: g };
}
function crowdStop() { if (AU.crowd) { try { AU.crowd.s.stop(); } catch (e) {} AU.crowd = null; } }

// chiptune marching band loop
var SONG = { bpm: 132,
  lead: [72, 0, 72, 74, 76, 0, 72, 0, 79, 0, 77, 76, 74, 0, 0, 0, 72, 0, 72, 74, 76, 0, 79, 0, 81, 79, 77, 76, 74, 76, 72, 0],
  bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 55, 0, 50, 0, 48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 55, 0, 43, 0, 48, 0] };
function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function musicStart() {
  if (!AU.ctx || AU.music) return; var c = AU.ctx, step = 60 / SONG.bpm / 2, next = c.currentTime + 0.1, i = 0;
  AU.music = setInterval(function () {
    if (!AU.ctx) return;
    while (next < AU.ctx.currentTime + 0.25) {
      var w = next - AU.ctx.currentTime, k = i % 32;
      if (SONG.lead[k]) tone("square", mtof(SONG.lead[k]), mtof(SONG.lead[k]), step * 0.9, 0.16, w, AU.musG);
      if (SONG.bass[k]) tone("triangle", mtof(SONG.bass[k]), mtof(SONG.bass[k]), step * 1.6, 0.35, w, AU.musG);
      if (k % 4 === 0) noise(0.06, 0.35, "lowpass", 300, 80, w, AU.musG); if (k % 4 === 2) noise(0.09, 0.25, "highpass", 1800, 3000, w, AU.musG);
      if (k % 2 === 1) noise(0.03, 0.08, "highpass", 6000, 7000, w, AU.musG);
      next += step; i++;
    }
  }, 60);
}
function musicStop() { if (AU.music) { clearInterval(AU.music); AU.music = null; } }
function audioSuspend(on) { if (!AU.ctx) return; try { if (on) AU.ctx.suspend(); else AU.ctx.resume(); } catch (e) {} }
