// main.js: the game itself — state machine, loop, input, beam physics,
// nights, the shop, the Kraken fight and the ?shot= demo scenes the
// screenshots are taken from. The game runs on one canvas at 960 x 640.

import { W, H, LIGHTHOUSE, HARBOUR, Ship, Creature, Kraken, Particle, Pickup, burst, spawnEdgePoint, dist, angleTo, angleDiff, rand, pick } from './entities.js';
import { SHOP_ITEMS, RELIC_IDS, buyItem, goldValue } from './upgrades.js';
import { SoundFX } from './audio.js';
import { drawPlay, drawTitle, drawShop, drawPause, drawGameOver, drawWin } from './render.js';

const NIGHTS = 5;
const NIGHT_LENGTH = 75; // seconds a night lasts at most
const BEST_KEY = 'last-lighthouse-best';

function quotaFor(night) { return 4 + night; }
function spawnInterval(night) { return Math.max(1.6, 4.2 - night * 0.5); }

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'title'; // title | play | shop | pause | over | win
    this.time = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.muted = false;
    this.reset();
    this.fog = [];
    for (let i = 0; i < 7; i++) {
      this.fog.push({ x: rand(0, W), y: rand(60, 420), r: rand(90, 190), a: rand(0.05, 0.12), vx: rand(-8, 8) });
    }
    this.bindInput();
  }

  reset() {
    this.night = 1;
    this.score = 0;
    this.gold = 0;
    this.hp = 100; this.hpMax = 100;
    this.fuel = 100; this.fuelMax = 100; this.fuelRegen = 2;
    this.beamDamage = 30;
    this.beamWidth = 0.42;
    this.beamAngle = -Math.PI / 2;
    this.focus = false;
    this.turret = false;
    this.turretAngle = -Math.PI / 2;
    this.turretTarget = null;
    this.upgrades = {};
    this.relics = new Set();
    this.ships = [];
    this.creatures = [];
    this.particles = [];
    this.pickups = [];
    this.floaters = [];
    this.kraken = null;
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.shipsGuidedTotal = 0;
    this.shipsGuided = 0;
    this.nightQuota = quotaFor(1);
    this.nightTime = NIGHT_LENGTH;
    this.shipTimer = 1.5;
    this.creatureTimer = 3;
    this.banner = null;
    this.shake = { x: 0, y: 0 };
    this.shakeTime = 0;
    this.paused = false;
    this.startNight(1);
  }

  startNight(n) {
    this.night = n;
    this.shipsGuided = 0;
    this.nightQuota = quotaFor(n);
    this.nightTime = NIGHT_LENGTH;
    this.ships = [];
    this.creatures = [];
    this.shipTimer = 1.2;
    this.creatureTimer = 2.5;
    if (n === NIGHTS) {
      this.kraken = new Kraken();
      SoundFX.roar();
      this.showBanner('NIGHT 5 — THE KRAKEN', 'Burn two tentacles to surface it, then burn it down.');
    } else {
      this.kraken = null;
      SoundFX.nightStart();
      this.showBanner(`NIGHT ${n} OF 5`, `Guide ${this.nightQuota} ships home before the fog wins.`);
    }
  }

  showBanner(title, sub) {
    this.banner = { title, sub, life: 3.2 };
  }

  addScore(base, x, y) {
    const pts = base * this.combo;
    this.score += pts;
    this.floaters.push({ str: `+${pts}`, x, y, life: 1.2, color: '#ffd97a' });
  }

  bumpCombo() {
    this.combo = Math.min(8, this.combo + 1);
    this.comboTimer = 4;
  }

  // ---- Spawning.
  spawnShip() {
    const p = spawnEdgePoint();
    this.ships.push(new Ship(p.x, p.y, this.night));
  }

  spawnCreature(kind) {
    const p = spawnEdgePoint(30);
    this.creatures.push(new Creature(kind || this.pickKind(), p.x, p.y));
  }

  pickKind() {
    const r = Math.random();
    const n = this.night;
    if (r < 0.5 - n * 0.03) return 'wisp';
    if (r < 0.86 - n * 0.02) return 'fiend';
    return 'breaker';
  }

  // ---- Damage and death.
  damageTower(amount, x, y) {
    this.hp -= amount;
    this.shakeTime = 0.35;
    SoundFX.hit();
    burst(this.particles, LIGHTHOUSE.x, LIGHTHOUSE.y - 40, 18, '#ff9d5c', 160, 4);
    this.floaters.push({ str: `-${amount}`, x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 130, life: 1.2, color: '#ff5a5a' });
    if (this.hp <= 0) this.gameOver();
  }

  killCreature(c) {
    this.kills++;
    this.bumpCombo();
    const gold = goldValue(this, c.gold);
    this.gold += gold;
    this.addScore(c.score, c.x, c.y);
    SoundFX.kill();
    burst(this.particles, c.x, c.y, 16, c.color, 150, 4);
    burst(this.particles, c.x, c.y, 8, '#ffd97a', 90, 3);
    const roll = Math.random();
    if (roll < 0.1 && this.relics.size < RELIC_IDS.length) {
      const missing = RELIC_IDS.filter((id) => !this.relics.has(id));
      this.pickups.push(new Pickup(pick(missing), c.x, c.y));
    } else if (roll < 0.24) {
      this.pickups.push(new Pickup('fuel', c.x, c.y));
    }
  }

  gameOver() {
    this.hp = 0;
    this.state = 'over';
    this.best = Math.max(this.best, this.score);
    localStorage.setItem(BEST_KEY, String(this.best));
    SoundFX.stopBeamHum();
    SoundFX.lose();
  }

  winGame() {
    this.state = 'win';
    this.best = Math.max(this.best, this.score);
    localStorage.setItem(BEST_KEY, String(this.best));
    SoundFX.stopBeamHum();
    SoundFX.win();
  }

  onKrakenRoar() {
    SoundFX.roar();
    this.shakeTime = 0.3;
  }

  // ---- Beam: which cones are live, and what they burn.
  beamCones() {
    const cones = [{ angle: this.beamAngle, width: this.focus ? this.beamWidth * 0.55 : this.beamWidth, dmg: this.beamDamage * (this.focus ? 3 : 1) }];
    if (this.relics.has('shard')) {
      cones.push({ angle: this.beamAngle + 0.52, width: this.beamWidth * 0.8, dmg: this.beamDamage * 0.7 });
    }
    return cones;
  }

  inCone(x, y, cone) {
    const lamp = { x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 86 };
    const d = dist(lamp.x, lamp.y, x, y);
    if (d > 620) return false;
    return Math.abs(angleDiff(angleTo(lamp.x, lamp.y, x, y), cone.angle)) < cone.width / 2 + 0.06;
  }

  // ---- Per-frame update.
  update(dt) {
    this.time += dt;
    for (const f of this.fog) {
      f.x += f.vx * dt;
      if (f.x < -f.r) f.x = W + f.r;
      if (f.x > W + f.r) f.x = -f.r;
    }
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.shake = { x: rand(-5, 5), y: rand(-4, 4) };
    } else {
      this.shake = { x: 0, y: 0 };
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }
    for (const pt of this.particles) pt.update(dt);
    this.particles = this.particles.filter((p) => p.alive);
    for (const f of this.floaters) { f.life -= dt; f.y -= 22 * dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.state !== 'play') return;

    // Fuel: the generator refills it; the focused beam burns it fast.
    const regen = this.fuelRegen * (this.relics.has('oil') ? 2 : 1);
    this.fuel = Math.min(this.fuelMax, this.fuel + regen * dt - (this.focus ? 10 : 1.5) * dt);
    if (this.fuel <= 0) { this.fuel = 0; this.focus = false; }

    // Night clock.
    this.nightTime -= dt;
    this.shipTimer -= dt;
    if (this.shipTimer <= 0) {
      this.shipTimer = rand(3.2, 6.5);
      if (this.ships.length < 8) this.spawnShip();
    }
    this.creatureTimer -= dt;
    if (this.creatureTimer <= 0) {
      this.creatureTimer = spawnInterval(this.night) * rand(0.8, 1.3);
      if (this.creatures.length < 10) this.spawnCreature();
    }

    // Beam burns creatures and lights ships.
    const cones = this.beamCones();
    for (const c of this.creatures) {
      for (const cone of cones) {
        if (this.inCone(c.x, c.y, cone)) {
          c.hit(cone.dmg * dt);
          if (Math.random() < dt * 12) {
            this.particles.push(new Particle(c.x + rand(-8, 8), c.y + rand(-8, 8), rand(-30, 30), rand(-60, -10), 0.4, 2.5, '#ffe9a8'));
          }
          break;
        }
      }
    }
    for (const s of this.ships) {
      s.lit = cones.some((cone) => this.inCone(s.x, s.y, cone));
    }
    // Turret: its own small beam hunts the nearest creature.
    if (this.turret) {
      let nearest = null;
      let nd = 480;
      for (const c of this.creatures) {
        const d = dist(LIGHTHOUSE.x, LIGHTHOUSE.y, c.x, c.y);
        if (d < nd) { nd = d; nearest = c; }
      }
      this.turretTarget = nearest;
      if (nearest) {
        this.turretAngle = angleTo(LIGHTHOUSE.x, LIGHTHOUSE.y - 86, nearest.x, nearest.y);
        nearest.hit(15 * dt);
      }
    }
    // Beam burns the Kraken and its tentacles.
    if (this.kraken && !this.kraken.dead) {
      const bane = this.relics.has('bane') ? 1.6 : 1;
      for (const cone of cones) {
        if (this.kraken.surfaced && this.inCone(this.kraken.x, this.kraken.y, cone)) {
          this.kraken.hit(cone.dmg * dt * bane);
        }
        for (const t of this.kraken.tentacles) {
          if (!t.dead && this.inCone(t.x + Math.sin(t.sway) * 14, t.y, cone)) {
            this.kraken.hitTentacle(t, cone.dmg * dt);
          }
        }
      }
      this.kraken.update(dt, this);
      if (this.kraken.dead) {
        burst(this.particles, this.kraken.x, this.kraken.y, 60, '#c65dd7', 220, 5);
        burst(this.particles, this.kraken.x, this.kraken.y, 40, '#ffd97a', 160, 4);
        this.addScore(2000, this.kraken.x, this.kraken.y);
        this.winGame();
        return;
      }
    }

    // Ships.
    for (const s of this.ships) s.update(dt, this);
    for (const s of this.ships) {
      if (s.arrived) {
        this.shipsGuided++;
        this.shipsGuidedTotal++;
        this.bumpCombo();
        const gold = goldValue(this, 10 + this.night * 2);
        this.gold += gold;
        this.fuel = Math.min(this.fuelMax, this.fuel + 10);
        this.addScore(100, HARBOUR.x, HARBOUR.y - 30);
        SoundFX.horn();
        burst(this.particles, HARBOUR.x, HARBOUR.y, 14, '#ffd97a', 100, 3);
        if (Math.random() < 0.3) this.pickups.push(new Pickup('fuel', HARBOUR.x + rand(-40, 40), HARBOUR.y - 30));
      } else if (s.lost) {
        this.combo = 1;
        this.score = Math.max(0, this.score - 50);
        SoundFX.lost();
        this.floaters.push({ str: 'SHIP LOST IN THE FOG', x: W / 2, y: 90, life: 1.4, color: '#ff9d5c' });
      }
    }
    this.ships = this.ships.filter((s) => !s.arrived && !s.lost);

    // Creatures.
    for (const c of this.creatures) c.update(dt);
    for (const c of this.creatures) {
      if (c.dead) this.killCreature(c);
      else if (dist(c.x, c.y, LIGHTHOUSE.x, LIGHTHOUSE.y - 30) < 72) {
        this.damageTower(c.dmg, c.x, c.y);
        c.dead = true;
      }
    }
    this.creatures = this.creatures.filter((c) => !c.dead);

    // Pickups drift home.
    for (const p of this.pickups) p.update(dt);
    for (const p of this.pickups) {
      if (p.collected) {
        if (p.kind === 'fuel') {
          this.fuel = Math.min(this.fuelMax, this.fuel + 20);
          this.floaters.push({ str: '+20 FUEL', x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 130, life: 1.2, color: '#ffb347' });
        } else {
          this.relics.add(p.kind);
          this.floaters.push({ str: `RELIC: ${p.kind.toUpperCase()}`, x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 130, life: 1.6, color: '#ffd97a' });
        }
        SoundFX.coin();
      }
    }
    this.pickups = this.pickups.filter((p) => !p.collected);

    // Night ends: quota met, or the clock runs out.
    if (this.shipsGuided >= this.nightQuota) {
      const bonus = Math.ceil(this.nightTime) * 5;
      this.score += bonus;
      this.floaters.push({ str: `NIGHT BONUS +${bonus}`, x: W / 2, y: 130, life: 1.6, color: '#7fd08a' });
      this.endNight(true);
    } else if (this.nightTime <= 0) {
      this.endNight(false);
    }
  }

  endNight(quotaMet) {
    if (!quotaMet) {
      this.hp -= 20;
      this.floaters.push({ str: 'THE FLEET SCATTERED — HULL -20', x: W / 2, y: 130, life: 1.8, color: '#ff5a5a' });
      if (this.hp <= 0) { this.gameOver(); return; }
    }
    if (this.night >= NIGHTS) {
      // Survived night 5 without killing the Kraken: the fog wins.
      this.gameOver();
      return;
    }
    this.state = 'shop';
    SoundFX.stopBeamHum();
  }

  nextNight() {
    this.startNight(this.night + 1);
    this.state = 'play';
  }

  // ---- Input.
  bindInput() {
    const c = this.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };
    c.addEventListener('mousemove', (e) => {
      const p = pos(e);
      this.beamAngle = angleTo(LIGHTHOUSE.x, LIGHTHOUSE.y - 86, p.x, p.y);
    });
    c.addEventListener('mousedown', (e) => {
      SoundFX.unlock();
      const p = pos(e);
      if (this.state === 'title') { this.state = 'play'; SoundFX.click(); return; }
      if (this.state === 'pause') { this.state = 'play'; this.paused = false; return; }
      if (this.state === 'over' || this.state === 'win') { this.reset(); this.state = 'play'; return; }
      if (this.state === 'shop') { this.shopClick(p); return; }
      if (this.state === 'play') {
        // Pause / mute buttons in the HUD's top-right corner.
        if (p.x > 912 && p.y < 56) {
          if (p.y < 30) this.togglePause();
          else this.toggleMute();
          return;
        }
        this.focus = true;
        SoundFX.startBeamHum();
      }
    });
    window.addEventListener('mouseup', () => {
      this.focus = false;
      SoundFX.stopBeamHum();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      SoundFX.unlock();
      const k = e.key.toLowerCase();
      if (k === 'm') { this.toggleMute(); return; }
      if (k === 'r') { this.reset(); this.state = 'play'; return; }
      if (k === 'p' || k === 'escape') {
        if (this.state === 'play') this.togglePause();
        else if (this.state === 'pause') { this.state = 'play'; this.paused = false; }
        return;
      }
      if (k === ' ' && this.state === 'play') { this.focus = true; SoundFX.startBeamHum(); e.preventDefault(); return; }
      if (k === 'arrowleft') { this.beamAngle -= 0.22; return; }
      if (k === 'arrowright') { this.beamAngle += 0.22; return; }
      if (this.state === 'title' && (k === 'enter' || k === ' ')) { this.state = 'play'; return; }
      if ((this.state === 'over' || this.state === 'win') && k === 'enter') { this.reset(); this.state = 'play'; return; }
      if (this.state === 'shop') {
        if (k === 'enter') { this.nextNight(); return; }
        const idx = Number(k) - 1;
        if (idx >= 0 && idx < SHOP_ITEMS.length) {
          const item = SHOP_ITEMS[idx];
          if (buyItem(this, item)) SoundFX.buy(); else SoundFX.denied();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === ' ') { this.focus = false; SoundFX.stopBeamHum(); }
    });
  }

  shopClick(p) {
    // Continue button.
    if (p.x > W / 2 - 130 && p.x < W / 2 + 130 && p.y > 516 && p.y < 556) {
      SoundFX.click();
      this.nextNight();
      return;
    }
    // Item rows.
    let y = 178;
    for (const item of SHOP_ITEMS) {
      if (p.x > 140 && p.x < 820 && p.y > y && p.y < y + 56) {
        if (buyItem(this, item)) SoundFX.buy(); else SoundFX.denied();
        return;
      }
      y += 66;
    }
  }

  togglePause() {
    if (this.state === 'play') { this.state = 'pause'; this.paused = true; SoundFX.stopBeamHum(); }
  }

  toggleMute() {
    this.muted = SoundFX.toggleMute();
  }

  // ---- Frame.
  draw() {
    const ctx = this.ctx;
    if (this.state === 'title') drawTitle(ctx, this, this.time);
    else if (this.state === 'play' || this.state === 'pause') {
      drawPlay(ctx, this, this.time);
      if (this.state === 'pause') drawPause(ctx, this);
    } else if (this.state === 'shop') drawShop(ctx, this);
    else if (this.state === 'over') drawGameOver(ctx, this);
    else if (this.state === 'win') drawWin(ctx, this);
  }
}

// ---- Demo scenes for screenshots: ?shot=title|play|boss|win sets the game
// up deterministically, so each screenshot is a real render of real state.
function setupShot(game, scene) {
  if (scene === 'title') {
    game.state = 'title';
    return;
  }
  if (scene === 'win') {
    game.state = 'win';
    game.score = 12480;
    game.shipsGuidedTotal = 34;
    game.kills = 96;
    game.night = 5;
    game.hp = 82;
    game.relics.add('shard');
    game.relics.add('charm');
    game.relics.add('bane');
    game.best = 12480;
    return;
  }
  game.state = 'play';
  game.banner = null; // setupShot overrides the night-1 banner from reset()
  game.score = scene === 'boss' ? 8930 : 4210;
  game.gold = scene === 'boss' ? 210 : 86;
  game.best = 12480;
  game.hp = scene === 'boss' ? 58 : 84;
  game.fuel = scene === 'boss' ? 64 : 88;
  game.combo = scene === 'boss' ? 5 : 3;
  game.night = scene === 'boss' ? 5 : 3;
  game.nightQuota = quotaFor(game.night);
  game.shipsGuided = scene === 'boss' ? 6 : 4;
  game.nightTime = scene === 'boss' ? 31 : 47;
  game.shipsGuidedTotal = scene === 'boss' ? 28 : 15;
  game.kills = scene === 'boss' ? 74 : 31;
  game.beamDamage = 54;
  game.beamWidth = 0.56;
  game.upgrades = { lens: 2, prism: 2, tank: 1 };
  game.relics.add('shard');
  game.relics.add('charm');
  if (scene === 'boss') game.relics.add('bane');
  game.beamAngle = -1.1;
  // Ships mid-voyage, creatures closing in, one pickup drifting.
  const shipSpots = [[150, 180], [700, 150], [820, 300], [240, 320], [560, 220]];
  for (const [x, y] of shipSpots) {
    const s = new Ship(x, y, game.night);
    s.fog = Math.random() * 4;
    game.ships.push(s);
  }
  const kindSpots = [['wisp', 300, 200], ['fiend', 640, 260], ['breaker', 420, 380], ['wisp', 760, 420], ['fiend', 180, 430]];
  for (const [kind, x, y] of kindSpots) {
    const c = new Creature(kind, x, y);
    c.hp = Math.ceil(c.maxHp * 0.6);
    game.creatures.push(c);
  }
  game.pickups.push(new Pickup('fuel', 620, 420));
  burst(game.particles, 420, 380, 10, '#c65dd7', 120, 3);
  if (scene === 'boss') {
    game.kraken = new Kraken();
    game.kraken.hp = 720;
    game.kraken.surfaced = true;
    game.kraken.tentacles[0].dead = true;
    game.kraken.tentacles[1].dead = true;
    game.kraken.tentacles[2].telegraph = 0.9;
    game.kraken.tentacles[3].hp = 40;
  }
}

function start() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) setupShot(game, shot);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.state === 'play' || game.state === 'title') game.update(dt);
    else game.update(0);
    game.draw();
    if (shot && !window.__shotReady) window.__shotReady = true;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__game = game;
}

start();
