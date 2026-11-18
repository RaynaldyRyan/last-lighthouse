// entities.js: everything that moves on the sea — ships to guide, fog
// creatures to burn, the Kraken boss, particles and floating pickups.
// Positions are in canvas pixels (960 x 640); the lighthouse stands at
// (480, 560) and the harbour mouth at (480, 520).

export const W = 960;
export const H = 640;
export const LIGHTHOUSE = { x: 480, y: 560 };
export const HARBOUR = { x: 480, y: 516 };

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Smallest signed difference between two angles.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Ships: sail toward the harbour; the beam speeds them up and keeps
// them on course. Too long unlit and they turn away and are lost.
export class Ship {
  constructor(x, y, night) {
    this.x = x; this.y = y;
    this.night = night;
    this.speed = rand(22, 28);
    this.lit = false;
    this.fog = 0;           // seconds spent unlit
    this.leaving = false;
    this.hue = pick([18, 38, 200, 150]); // sail colour accent
    this.bob = Math.random() * Math.PI * 2;
    this.arrived = false;
    this.lost = false;
  }

  update(dt, game) {
    this.bob += dt * 2;
    const target = this.leaving ? { x: this.x < W / 2 ? -60 : W + 60, y: this.y } : HARBOUR;
    const a = angleTo(this.x, this.y, target.x, target.y);
    let sp = this.speed * (this.lit ? 2.2 : 1) * (game.relics.has('current') ? 1.4 : 1);
    if (this.leaving) sp = this.speed * 1.4;
    this.x += Math.cos(a) * sp * dt;
    this.y += Math.sin(a) * sp * dt;
    if (!this.leaving) {
      if (this.lit) this.fog = Math.max(0, this.fog - dt * 2);
      else this.fog += dt;
      if (this.fog > 9) this.leaving = true;
    }
    if (!this.leaving && dist(this.x, this.y, HARBOUR.x, HARBOUR.y) < 34) this.arrived = true;
    if (this.leaving && (this.x < -50 || this.x > W + 50)) this.lost = true;
  }
}

// ---- Fog creatures: drift toward the lighthouse and chew its hull.
export const CREATURE_KINDS = {
  wisp: { hp: 20, speed: 34, dmg: 5, gold: 3, score: 25, radius: 13, color: '#c65dd7' },
  fiend: { hp: 55, speed: 22, dmg: 10, gold: 6, score: 50, radius: 18, color: '#8b5cf6' },
  breaker: { hp: 150, speed: 13, dmg: 25, gold: 10, score: 120, radius: 26, color: '#e5484d' },
};

export class Creature {
  constructor(kind, x, y) {
    const k = CREATURE_KINDS[kind];
    this.kind = kind;
    this.x = x; this.y = y;
    this.hp = k.hp; this.maxHp = k.hp;
    this.speed = k.speed * rand(0.9, 1.1);
    this.dmg = k.dmg; this.gold = k.gold; this.score = k.score;
    this.radius = k.radius; this.color = k.color;
    this.wobble = Math.random() * Math.PI * 2;
    this.flash = 0;   // hit flash timer
    this.dead = false;
  }

  update(dt) {
    this.wobble += dt * 3;
    const a = angleTo(this.x, this.y, LIGHTHOUSE.x, LIGHTHOUSE.y - 30);
    const wob = Math.sin(this.wobble) * 0.4;
    this.x += Math.cos(a + wob * 0.3) * this.speed * dt;
    this.y += Math.sin(a + wob * 0.3) * this.speed * dt;
    if (this.flash > 0) this.flash -= dt;
  }

  hit(dmg) {
    this.hp -= dmg;
    this.flash = 0.08;
    if (this.hp <= 0) this.dead = true;
  }
}

// ---- The Kraken: night 5's boss. Four tentacles rise from the sea; the
// body surfaces at the top of the screen once two tentacles fall.
export class Kraken {
  constructor() {
    this.x = 480; this.y = 175; // below the boss bar so its label stays clear
    this.hp = 1200; this.maxHp = 1200;
    this.surfaced = false;
    this.dead = false;
    this.tentacles = [];
    for (let i = 0; i < 4; i++) {
      this.tentacles.push({
        x: 180 + i * 200, y: 300 + (i % 2) * 60,
        hp: 80, maxHp: 80, slam: rand(4, 8), telegraph: 0, dead: false, sway: Math.random() * 6,
      });
    }
    this.spawnTimer = 6;
    this.roarTimer = 2;
  }

  get aliveTentacles() {
    return this.tentacles.filter((t) => !t.dead).length;
  }

  update(dt, game) {
    if (this.dead) return;
    for (const t of this.tentacles) {
      if (t.dead) continue;
      t.sway += dt * 1.5;
      if (t.telegraph > 0) {
        t.telegraph -= dt;
        if (t.telegraph <= 0) {
          game.damageTower(15, t.x, t.y);
          t.slam = rand(5, 9);
        }
      } else {
        t.slam -= dt;
        if (t.slam <= 0) t.telegraph = 1.1;
      }
    }
    if (!this.surfaced && this.aliveTentacles <= 2) this.surfaced = true;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = rand(5, 8);
      game.spawnCreature('wisp');
    }
    this.roarTimer -= dt;
    if (this.roarTimer <= 0) {
      this.roarTimer = rand(9, 14);
      game.onKrakenRoar();
    }
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.dead = true;
  }

  hitTentacle(t, dmg) {
    t.hp -= dmg;
    if (t.hp <= 0) t.dead = true;
  }
}

// ---- Particles: sparks, splashes and embers, pooled by the game.
export class Particle {
  constructor(x, y, vx, vy, life, size, color, gravity = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size; this.color = color;
    this.gravity = gravity;
  }
  update(dt) {
    this.life -= dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  get alive() { return this.life > 0; }
}

export function burst(particles, x, y, n, color, speed = 120, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(speed * 0.3, speed);
    particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, rand(0.3, 0.8), rand(size * 0.6, size * 1.4), color, 160));
  }
}

// ---- Pickups: fuel barrels and relics drift toward the island and are
// collected on arrival.
export class Pickup {
  constructor(kind, x, y) {
    this.kind = kind; // 'fuel' | relic id
    this.x = x; this.y = y;
    this.bob = Math.random() * 6;
    this.collected = false;
  }
  update(dt) {
    this.bob += dt * 2;
    const a = angleTo(this.x, this.y, LIGHTHOUSE.x, LIGHTHOUSE.y - 20);
    this.x += Math.cos(a) * 26 * dt;
    this.y += Math.sin(a) * 26 * dt;
    if (dist(this.x, this.y, LIGHTHOUSE.x, LIGHTHOUSE.y - 20) < 40) this.collected = true;
  }
}

// Spawn a ship at a random sea edge, away from the harbour.
export function spawnEdgePoint(margin = 40) {
  const side = Math.floor(Math.random() * 3);
  if (side === 0) return { x: rand(margin, W - margin), y: margin };
  if (side === 1) return { x: margin, y: rand(60, H - 120) };
  return { x: W - margin, y: rand(60, H - 120) };
}
