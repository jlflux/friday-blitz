# Friday Night Blitz

A 16-bit high school football game with 11 players a side, a Mode 7 behind-the-team camera, and an Alabama-style franchise mode. It's one self-contained HTML file with no external assets and no build step needed to play.

## Play / deploy
- **Vercel:** import this repo. Leave Framework Preset on "Other", with no build command and no output directory. Vercel serves `index.html` from the root.
- **Locally:** open `index.html` in any browser.

## Modes
- **Franchise:** pick a classification (1A–6A) and a school.
  - **Structure:** 6A has 32 schools in 4 regions of 8, and the top 6 per region make a 24-team bracket with first-round byes for the top 2. 1A–5A have 48 schools in 8 regions of 6, and the top 4 per region make a 32-team North/South bracket. The season is 10 weeks with region and non-region games, followed by the state playoffs.
  - **Your program:** standings, a weekly class top 10, and a 40-plus-man roster with class years, ratings and potential. You set the depth chart, player stats are tracked, and players can get injured.
  - **Offseason:** recap and honors, seniors graduate, players progress, freshmen arrive, you choose move-in families to welcome, and you spend booster money on the weight room, coaching staff, film room and stadium.
  - Play any game yourself or sim it.
- **Quick game:** an exhibition between any two editable schools and rosters.

## Controls
- Drag anywhere (or use the arrow keys / WASD) to move the player you control. Up is always toward the top of your screen.
- **Play call:** the panel opens at the bottom while both teams huddle. Pick a formation tab (Shotgun, Trips, Bunch, Empty, Singleback, Ace, I-Form, Pistol, Goal Line), then a play card, or take the COACH'S PICK. FLIP mirrors the play, NO HUDDLE skips the huddle, and the play clock runs (a delay of game costs 5 yards). Keys 1–9 pick cards in order.
- **Before the snap (offense):** your receivers show numbered badges and their routes. SNAP (Space or Enter) starts the play. HOT ROUTE (H) changes one receiver's route. AUDIBLE (Y) switches to another play from the same formation or flips it. TIMEOUT (T): three per half, and it gets back the time the last play ran off.
- **Offense, live:** tap a numbered button 1–5 (green is open, yellow is tight, red is covered), tap the receiver on the field, or press 1–5 to throw. Hold SPRINT (E) for a burst. JUKE (Space) dodges when you carry the ball. On the read option, hold SPRINT through the mesh to keep it yourself.
- **Defense:** before the snap, tap any defender (or SWITCH) to control him; AUDIBLE switches to Cover 0 Blitz, Prevent, Man Press or Stack the Box. During the play, tap a defender or press SWITCH (Shift) to change players, and DIVE (Space) to dive at the ball carrier. You're switched to the best-placed defender automatically after a catch or a hand-off.
- **Playbook:** 37 plays across 9 formations, including inside zone, power, counter, toss, draws, QB runs, the read option, an RPO and play action. There are 10 defensive calls: Cover 2, 3, 1 and 0, Tampa 2, Fire Zone, Man Press, Prevent, Run Stop and Stack the Box.
- **Kick meter:** tap (or Space) when the needle is in the green.
- **Camera:** PRO (Mode 7, the default) or CLASSIC (overhead). Change it from the pregame screen, the pause menu, or the franchise Program tab.

## URL options
`?lang=en|es|zh` · `?diff=easy|normal|hard` · `?quarterMinutes=1..5` · `?camera=pro|classic` · `?tune` (live tuning panel) · `?test&bot` (self-playing demo)

## Rebuilding from source
```
cd source
npm install
node build.mjs          # writes source/dist/friday-night-blitz-v01.html
cp dist/friday-night-blitz-v01.html ../index.html
```
`source/src/` holds the game:
- `sim.js`: the football engine (formations, routes, blocking, AI, rules)
- `render.js`: the Mode 7 and overhead pixel renderers
- `franchise.js`: the league, schedule, playoffs and offseason logic
- `fui.js`: the franchise screens
- `ui.js`: menus, team editor, HUD and end card
- `teams.js`: quick-play schools and rosters
- `gfx.js`: pixel font and sprites
- `audio.js`: synth sound
- `main.js`: game loop, input and test hook
- `config.js`: settings and en/es/zh text

Schools and players are fictional. The league format is modeled on the AHSAA's 2026 alignment.
