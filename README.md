# DRAKEN — Skärgårdsstrid

Vertical bullet-hell shmup. Fly a Saab 35 Draken north along the Swedish archipelago
and fight off the Russian air force and navy. Retro pixel look, WebGL2 post-processing
(bloom, CRT scanlines, barrel, chromatic aberration, screen shake), procedural coastline,
synthesized audio. Zero dependencies, no build step.

## Run

    python3 -m http.server 8000     # or: make start
    open http://localhost:8000

Needs a browser with WebGL2 (any current Chrome/Firefox/Safari).

## Controls

| Action | Keys |
|---|---|
| Move | Arrows / WASD / gamepad stick |
| Fire | Z / Space / J / gamepad A |
| Bomb | X / K / gamepad B |
| Focus (slow, show hitbox) | Shift / gamepad triggers |
| Start | Z / Enter |

Graze bullets for points. Yellow **P** raises firepower (3 levels), green **B** adds a bomb.
Bombs clear the screen and hurt everything. Clear the boss to loop with higher difficulty.

## Debug URL flags

- `?debug` — fps / entity counters
- `?auto` — autopilot (smoke test), `&god` — invulnerable, `&skip=N` — pre-run N frames

## Layout

    index.html       canvas + DOM HUD
    src/main.js      loop, states, rendering order
    src/renderer.js  instanced sprite batcher + bloom/CRT pipeline
    src/shaders.js   GLSL
    src/atlas.js     procedural atlas: vector aircraft/ships at 4× (mipmapped), pixel decos
    src/terrain.js   noise heightfield → ring texture; shaded by terrain shader
    src/entities.js  bullets, particles, pickups, player
    src/patterns.js  bullet pattern helpers
    src/enemies.js   enemy types + boss
    src/level.js     wave timeline
    src/game.js      collisions
    src/audio.js     WebAudio SFX
