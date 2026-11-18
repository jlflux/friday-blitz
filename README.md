# Friday Night Blitz

A 16-bit high school football game with 11 players a side, a Mode 7 behind-the-team camera, and an Alabama-style franchise mode. It's one self-contained HTML file with no external assets and no build step needed to play.

## Play / deploy
- **Vercel:** import this repo. Leave Framework Preset on "Other", with no build command and no output directory. Vercel serves `index.html` from the root.
- **Locally:** open `index.html` in any browser.

## Modes
- **Franchise:** take over one of Alabama's 95 real 5A and 6A programs, using the AHSAA 2026-28 alignment (there's no 7A anymore). The franchise is built to be enjoyable even if you never play a down yourself.
  - **League:** 6A has 32 schools in 4 regions; the top 6 per region make a 24-team bracket, and seeds 1-2 get first-round byes. 5A has 63 schools in 8 regions; the top 4 per region make a 32-team bracket. Weeks 1-3 are non-region games and weeks 4-10 are region games. Every school has a full roster of about 43 players, and every game in the state is simulated play by play with stats.
  - **Game day:** PLAY it yourself in the 16-bit engine, WATCH a live play-by-play broadcast (scorebug, field tracker, 1×/2×/4×/turbo, skip), or SIM it. You can also SIM AHEAD a week, to region play, to the playoffs or through the title game, and watch any game in 16-bit with the AI playing both sides. Every game has a box score.
  - **College offers:** colleges from Power 4 down to NAIA offer your juniors and seniors based on ratings, production and program exposure. You can send highlight film to help. Seniors commit and sign on Signing Day, and each signee pays a booster bonus by level. Signees also raise your exposure and prestige, which attracts more move-in families.
  - **Roster building:** scout your feeder program's 8th graders and host them on Fridays so they stay in your zone instead of leaving for private school. Bona fide move-in families choose a school based on your record, exposure, college placement and facilities, and you get family visits to sway them. You can also set the depth chart, change positions and pick a weekly practice focus.
  - **Program:** hire an OC, DC, strength coach and player development coach, each with ratings and traits; good ones get poached when you win. Upgrade five facilities (weight room, film room, stadium, practice fields, locker room) with booster money from gates, weekly giving, playoff runs and Signing Day.
  - **History:** news feed, weekly 5A and 6A top 10 polls, league leaders, a school record book, season-by-season history, coach career stats, and yearly awards (Mr. Football, Players and Linemen of the Year, Coaches of the Year, All-State and All-Region).
  - **Offseason:** awards, Signing Day, graduation, coaching staff, facilities, freshman class, move-ins, summer training, then the new season.
  - **Saves:** three save slots, stored in your browser.
- **Quick game:** an exhibition between any two of the 95 real schools, with editable rosters.

## Controls
- Drag anywhere (or use the arrow keys / WASD) to move the player you control. Up is always toward the top of your screen.
- **Play call:** the panel opens at the bottom while both teams huddle. Pick a formation tab (Shotgun, Trips, Bunch, Empty, Singleback, Ace, I-Form, Pistol, Goal Line), then a play card, or take the COACH'S PICK. FLIP mirrors the play, NO HUDDLE skips the huddle, and the play clock runs (a delay of game costs 5 yards). Keys 1–9 pick cards in order.
- **Before the snap (offense):** your receivers show numbered badges and their routes. SNAP (Space or Enter) starts the play. HOT ROUTE (H) changes one receiver's route. AUDIBLE (Y) switches to another play from the same formation or flips it. TIMEOUT (T): three per half, and it gets back the time the last play ran off.
- **Offense, live:** tap a numbered button 1–5 (green is open, yellow is tight, red is covered), tap the receiver on the field, or press 1–5 to throw. Hold SPRINT (E) for a burst. JUKE (Space) dodges when you carry the ball. On the read option, hold SPRINT through the mesh to keep it yourself.
- **Defense:** before the snap, tap any defender (or SWITCH) to control him; AUDIBLE switches to Cover 0 Blitz, Prevent, Man Press or Stack the Box. During the play, tap a defender or press SWITCH (Shift) to change players, and DIVE (Space) to dive at the ball carrier. You're switched to the best-placed defender automatically after a catch or a hand-off.
- **Playbook:** 37 plays across 9 formations, including inside zone, power, counter, toss, draws, QB runs, the read option, an RPO and play action. There are 10 defensive calls: Cover 2, 3, 1 and 0, Tampa 2, Fire Zone, Man Press, Prevent, Run Stop and Stack the Box.
- **Kick meter:** tap (or Space) when the needle is in the green.
- **Camera:** PRO (Mode 7, the default) or CLASSIC (overhead). Change it from the pregame screen or the pause menu.

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
- `aldata.js`: the real 5A/6A schools (names, mascots, colors, regions) and the college list
- `league.js`: the franchise league model, play-by-play sim, schedule, playoffs, offers, feeder, move-ins, staff, facilities, records and saves
- `fui.js`: the franchise dashboard UI
- `ui.js`: menus, team editor, HUD and end card
- `teams.js`: quick-play schools and rosters
- `gfx.js`: pixel font and sprites
- `audio.js`: synth sound
- `main.js`: game loop, input and test hook
- `config.js`: settings and en/es/zh text

School names, mascots, colors and regions follow the AHSAA 2026-28 football alignment; players and coaches are fictional, and there are no school logos (badges are monograms). Colors for Elberta, East Limestone and Columbia couldn't be confirmed and are best guesses.
