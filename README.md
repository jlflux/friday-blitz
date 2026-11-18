# Friday Night Blitz

A 16-bit high school football game: 11-on-11, play calling, passing, running, tackling, downs, field goals, punts, overtime, and fully customizable schools and rosters. One self-contained HTML file, with no external assets and no build step needed to play.

## Play / deploy
- **Vercel:** import this repo. Leave Framework Preset on "Other", with no build command and no output directory. Vercel serves `index.html` from the root.
- **Locally:** open `index.html` in any browser.

## Controls
- Drag anywhere (or use the arrow keys / WASD) to move the player you control
- Offense: tap a receiver's letter button (A–E), tap the receiver on the field, or press 1–5 to throw. JUKE (or Space) dodges when you carry the ball.
- Defense: DIVE (or Space / a tap) to dive-tackle, SWITCH (or Shift) to change defenders
- Play call: tap a card, or press 1–6. FLIP mirrors the play.
- Kick meter: tap (or Space) when the needle is in the green

## URL options
`?lang=en|es|zh` · `?diff=easy|normal|hard` · `?quarterMinutes=1..5` · `?tune` (live tuning panel) · `?test&bot` (self-playing demo)

## Rebuilding from source
```
cd source
npm install
node build.mjs          # writes source/dist/friday-night-blitz-v01.html
cp dist/friday-night-blitz-v01.html ../index.html
```
`source/src/` holds the game: `sim.js` (football engine), `render.js` (pixel renderer), `ui.js` (menus, editor, HUD), `teams.js` (schools and rosters), `gfx.js` (pixel font and sprites), `audio.js` (synth sound), `main.js` (loop, input, test hook), `config.js` (settings and en/es/zh text).
