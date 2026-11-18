// render.js: every pixel the game draws — the night sea, the lighthouse and
// its beam, ships, fog creatures, the Kraken, the HUD and all five screens.
// All art is drawn in code on one canvas; nothing is loaded from a file.

import { W, H, LIGHTHOUSE, HARBOUR } from './entities.js';
import { SHOP_ITEMS, RELICS, nextPrice } from './upgrades.js';

const CREAM = '#f2ead8';
const GOLD = '#ffd97a';
const INK = '#0a1628';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fill;
  if (frac > 0.01) {
    roundRect(ctx, x + 1, y + 1, Math.max(4, (w - 2) * Math.min(1, frac)), h - 2, (h - 2) / 2);
    ctx.fill();
  }
}

function panel(ctx, x, y, w, h, alpha = 0.88) {
  ctx.fillStyle = `rgba(8, 20, 38, ${alpha})`;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 122, 0.45)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// ---- The sea: layered waves, drifting fog banks and a star field.
export function drawSea(ctx, t, fog) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(0.55, '#0d2242');
  grad.addColorStop(1, '#10294d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stars above the horizon.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 173) % W;
    const sy = (i * 97) % 150;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i));
    ctx.globalAlpha = tw * 0.8;
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;

  // Moon.
  ctx.fillStyle = '#f5ecd7';
  ctx.beginPath();
  ctx.arc(856, 64, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10, 22, 40, 0.25)';
  ctx.beginPath();
  ctx.arc(848, 58, 6, 0, Math.PI * 2);
  ctx.arc(864, 72, 4, 0, Math.PI * 2);
  ctx.fill();

  // Wave lines.
  ctx.strokeStyle = 'rgba(120, 180, 220, 0.16)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 9; row++) {
    const y = 170 + row * 52;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const yy = y + Math.sin(x * 0.02 + t * 0.8 + row * 1.7) * 4;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // Drifting fog banks.
  for (const f of fog) {
    const gx = ctx.createRadialGradient(f.x, f.y, 10, f.x, f.y, f.r);
    gx.addColorStop(0, `rgba(150, 180, 190, ${f.a})`);
    gx.addColorStop(1, 'rgba(150, 180, 190, 0)');
    ctx.fillStyle = gx;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- The rocky island, the lighthouse tower and its rotating lamp.
export function drawIsland(ctx, t, shake) {
  const { x, y } = LIGHTHOUSE;
  ctx.save();
  ctx.translate(shake.x, shake.y);
  // Rock.
  ctx.fillStyle = '#2a3340';
  ctx.beginPath();
  ctx.ellipse(x, y + 34, 120, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#39465a';
  ctx.beginPath();
  ctx.ellipse(x, y + 28, 96, 20, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Tower: red and cream stripes.
  ctx.fillStyle = '#e8ddc4';
  ctx.beginPath();
  ctx.moveTo(x - 22, y + 26);
  ctx.lineTo(x - 14, y - 78);
  ctx.lineTo(x + 14, y - 78);
  ctx.lineTo(x + 22, y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(x - 19, y - 6);
  ctx.lineTo(x - 16, y - 34);
  ctx.lineTo(x + 16, y - 34);
  ctx.lineTo(x + 19, y - 6);
  ctx.closePath();
  ctx.fill();
  // Lamp room.
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(x - 17, y - 96, 34, 20);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(x, y - 86, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
  ctx.beginPath();
  ctx.arc(x, y - 86, 20 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
  ctx.fill();
  // Roof.
  ctx.fillStyle = '#8b1e1e';
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 96);
  ctx.lineTo(x, y - 112);
  ctx.lineTo(x + 20, y - 96);
  ctx.closePath();
  ctx.fill();
  // Harbour dock.
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(x + 44, y - 8, 74, 10);
  ctx.fillStyle = '#7a6248';
  ctx.fillRect(x + 44, y - 8, 74, 4);
  ctx.restore();
}

// ---- The light beam: a warm cone from the lamp toward the aim angle.
export function drawBeam(ctx, origin, angle, width, range, focus, alpha) {
  const g = ctx.createRadialGradient(origin.x, origin.y, 10, origin.x, origin.y, range);
  g.addColorStop(0, `rgba(255, 230, 150, ${0.5 * alpha})`);
  g.addColorStop(1, 'rgba(255, 230, 150, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.arc(origin.x, origin.y, range, angle - width / 2, angle + width / 2);
  ctx.closePath();
  ctx.fill();
  // Bright core.
  ctx.strokeStyle = `rgba(255, 244, 200, ${0.55 * alpha})`;
  ctx.lineWidth = focus ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + Math.cos(angle) * range * 0.96, origin.y + Math.sin(angle) * range * 0.96);
  ctx.stroke();
}

function drawShip(ctx, s, t) {
  const a = Math.atan2(HARBOUR.y - s.y, HARBOUR.x - s.x);
  ctx.save();
  ctx.translate(s.x, s.y + Math.sin(s.bob) * 2);
  ctx.rotate(a);
  // Hull.
  ctx.fillStyle = '#6b4a2f';
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.lineTo(16, -6);
  ctx.lineTo(11, 7);
  ctx.lineTo(-11, 7);
  ctx.closePath();
  ctx.fill();
  // Sail.
  ctx.fillStyle = s.lit ? '#fff6d8' : '#c9bfa8';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(0, -26);
  ctx.lineTo(13, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `hsl(${s.hue}, 60%, 55%)`;
  ctx.fillRect(-2, -30, 5, 5);
  ctx.restore();
  // Fog meter: the ship is lost when it fills.
  if (!s.leaving) {
    const f = s.fog / 9;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(s.x - 14, s.y - 40, 28, 4);
    ctx.fillStyle = f > 0.6 ? '#ff5a5a' : GOLD;
    ctx.fillRect(s.x - 14, s.y - 40, 28 * Math.min(1, f), 4);
  }
  if (s.lit) {
    ctx.strokeStyle = 'rgba(255, 230, 150, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCreature(ctx, c, t) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const pulse = 1 + Math.sin(t * 5 + c.wobble) * 0.08;
  ctx.scale(pulse, pulse);
  ctx.fillStyle = c.flash > 0 ? '#ffffff' : c.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, c.radius * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Eyes.
  ctx.fillStyle = '#ffe9a8';
  const ex = c.radius * 0.35;
  ctx.beginPath();
  ctx.arc(-ex, -3, 3.2, 0, Math.PI * 2);
  ctx.arc(ex, -3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a1628';
  ctx.beginPath();
  ctx.arc(-ex, -3, 1.5, 0, Math.PI * 2);
  ctx.arc(ex, -3, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Tentacle wisps.
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8, c.radius * 0.7);
    ctx.quadraticCurveTo(i * 10 + Math.sin(t * 4 + i) * 5, c.radius + 10, i * 6, c.radius + 18);
    ctx.stroke();
  }
  ctx.restore();
  // HP bar.
  if (c.hp < c.maxHp) {
    bar(ctx, c.x - 16, c.y - c.radius - 14, 32, 5, c.hp / c.maxHp, '#ff5a5a');
  }
}

function drawKraken(ctx, k, t) {
  // Body: only visible once surfaced.
  if (k.surfaced && !k.dead) {
    ctx.save();
    ctx.translate(k.x, k.y + Math.sin(t * 1.2) * 4);
    ctx.fillStyle = '#5b2a6e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 74, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a3a8e';
    ctx.beginPath();
    ctx.ellipse(0, -10, 52, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(-24, -6, 8, 0, Math.PI * 2);
    ctx.arc(24, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a1628';
    ctx.beginPath();
    ctx.arc(-24, -6, 4, 0, Math.PI * 2);
    ctx.arc(24, -6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Tentacles.
  for (const tn of k.tentacles) {
    if (tn.dead) continue;
    const sway = Math.sin(tn.sway) * 14;
    const col = tn.telegraph > 0 ? '#ff5a5a' : '#6e3480';
    ctx.strokeStyle = col;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tn.x, H + 10);
    ctx.quadraticCurveTo(tn.x + sway, tn.y + 90, tn.x + sway * 1.6, tn.y);
    ctx.stroke();
    ctx.strokeStyle = '#8e4a9e';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(tn.x, H + 10);
    ctx.quadraticCurveTo(tn.x + sway, tn.y + 90, tn.x + sway * 1.6, tn.y);
    ctx.stroke();
    // Suckers.
    ctx.fillStyle = '#c9a0d8';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(tn.x + sway * (0.5 + i * 0.35), tn.y + 24 + i * 26, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (tn.telegraph > 0) {
      text(ctx, '!', tn.x + sway * 1.6, tn.y - 24, 26, '#ff5a5a', 'center');
      bar(ctx, tn.x - 24, tn.y - 40, 48, 6, tn.hp / tn.maxHp, '#ff5a5a');
    } else if (tn.hp < tn.maxHp) {
      bar(ctx, tn.x - 24, tn.y - 40, 48, 6, tn.hp / tn.maxHp, '#ff5a5a');
    }
  }
}

function drawPickup(ctx, p, t) {
  const y = p.y + Math.sin(p.bob) * 3;
  if (p.kind === 'fuel') {
    ctx.fillStyle = '#b3541e';
    roundRect(ctx, p.x - 9, y - 11, 18, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    text(ctx, 'F', p.x, y, 13, '#ffd97a', 'center');
  } else {
    ctx.fillStyle = 'rgba(255, 217, 122, 0.25)';
    ctx.beginPath();
    ctx.arc(p.x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, RELICS[p.kind].icon, p.x, y, 22, GOLD, 'center');
  }
}

// ---- The HUD: night track, score, gold, fuel, hull, combo, relics.
export function drawHUD(ctx, g) {
  // Top bar.
  ctx.fillStyle = 'rgba(6, 14, 28, 0.82)';
  ctx.fillRect(0, 0, W, 56);
  ctx.strokeStyle = 'rgba(255, 217, 122, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(W, 56);
  ctx.stroke();

  text(ctx, `NIGHT ${g.night}/5`, 16, 20, 17, GOLD);
  text(ctx, `Ships ${g.shipsGuided}/${g.nightQuota}`, 16, 42, 13, CREAM);
  bar(ctx, 130, 34, 110, 10, g.shipsGuided / g.nightQuota, '#7fd08a');
  text(ctx, `${Math.ceil(g.nightTime)}s`, 250, 40, 13, '#9fb6c8');

  text(ctx, `SCORE ${g.score}`, 330, 20, 17, CREAM);
  text(ctx, `BEST ${g.best}`, 330, 42, 12, '#9fb6c8');
  text(ctx, `◉ ${g.gold}`, 470, 20, 17, GOLD);
  if (g.combo > 1) text(ctx, `COMBO x${g.combo}`, 470, 42, 13, '#ff9d5c');

  // Fuel and hull bars.
  text(ctx, 'FUEL', 600, 20, 12, '#9fb6c8');
  bar(ctx, 600, 30, 130, 12, g.fuel / g.fuelMax, '#ffb347');
  text(ctx, 'HULL', 748, 20, 12, '#9fb6c8');
  bar(ctx, 748, 30, 110, 12, g.hp / g.hpMax, g.hp < 30 ? '#ff5a5a' : '#7fd08a');

  // Relic icons.
  let rx = 880;
  for (const id of g.relics) {
    text(ctx, RELICS[id].icon, rx, 28, 20, GOLD, 'center');
    rx += 22;
  }

  // Pause + mute buttons (top right corner).
  text(ctx, g.paused ? '▶' : '❚❚', 934, 20, 15, CREAM, 'center');
  text(ctx, g.muted ? '✕' : '♪', 934, 44, 14, CREAM, 'center');

  // Boss bar.
  if (g.kraken && !g.kraken.dead) {
    text(ctx, 'THE KRAKEN', W / 2, 74, 15, '#e08bd8', 'center');
    bar(ctx, W / 2 - 180, 86, 360, 12, g.kraken.hp / g.kraken.maxHp, '#c65dd7');
    text(ctx, g.kraken.surfaced ? 'It has surfaced — burn it down!' : `Tentacles ${g.kraken.aliveTentacles}/4 — burn two to surface it`, W / 2, 106, 12, '#c9a0d8', 'center');
  }

  // Bottom controls legend.
  ctx.fillStyle = 'rgba(6, 14, 28, 0.72)';
  ctx.fillRect(0, H - 26, W, 26);
  text(ctx, 'MOUSE aim beam   •   HOLD CLICK focus (3x damage)   •   1-5 shop   •   P pause   •   M sound   •   R restart', W / 2, H - 13, 12, '#9fb6c8', 'center');
}

// ---- Full play-field render (sea, beam, entities, particles, HUD).
export function drawPlay(ctx, g, t) {
  drawSea(ctx, t, g.fog);
  // Beam (under entities so ships and creatures read on top of it).
  const lamp = { x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 86 };
  drawBeam(ctx, lamp, g.beamAngle, g.focus ? g.beamWidth * 0.55 : g.beamWidth, 620, g.focus, 1);
  if (g.relics.has('shard')) {
    drawBeam(ctx, lamp, g.beamAngle + 0.52, g.beamWidth * 0.8, 520, false, 0.6);
  }
  if (g.turret && g.turretTarget) {
    drawBeam(ctx, lamp, g.turretAngle, 0.14, 480, false, 0.5);
  }
  for (const s of g.ships) drawShip(ctx, s, t);
  for (const c of g.creatures) drawCreature(ctx, c, t);
  if (g.kraken) drawKraken(ctx, g.kraken, t);
  for (const p of g.pickups) drawPickup(ctx, p, t);
  for (const pt of g.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawIsland(ctx, t, g.shake);
  // Floating score text.
  for (const f of g.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 1.2);
    text(ctx, f.str, f.x, f.y, 16, f.color, 'center');
  }
  ctx.globalAlpha = 1;
  drawHUD(ctx, g);
  // Night banner.
  if (g.banner) {
    ctx.globalAlpha = Math.min(1, g.banner.life);
    panel(ctx, W / 2 - 220, 150, 440, 74, 0.85);
    text(ctx, g.banner.title, W / 2, 176, 26, GOLD, 'center');
    text(ctx, g.banner.sub, W / 2, 204, 14, CREAM, 'center');
    ctx.globalAlpha = 1;
  }
}

// ---- Screens.
export function drawTitle(ctx, g, t) {
  drawSea(ctx, t, g.fog);
  const lamp = { x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 86 };
  drawBeam(ctx, lamp, -Math.PI / 2 + Math.sin(t * 0.4) * 0.7, 0.5, 620, false, 0.9);
  drawIsland(ctx, t, { x: 0, y: 0 });
  panel(ctx, W / 2 - 300, 60, 600, 330, 0.9);
  text(ctx, 'THE LAST', W / 2, 112, 30, '#9fb6c8', 'center');
  text(ctx, 'LIGHTHOUSE', W / 2, 156, 58, GOLD, 'center');
  text(ctx, 'You are the lighthouse. Guide the fleet home through the fog —', W / 2, 202, 15, CREAM, 'center');
  text(ctx, 'and burn what hunts in it.', W / 2, 224, 15, CREAM, 'center');
  text(ctx, 'MOUSE — aim the beam      HOLD CLICK — focus (3x damage)', W / 2, 258, 14, '#c9d6e2', 'center');
  text(ctx, 'Guide ships to the harbour. Burn fog creatures before they reach you.', W / 2, 282, 14, '#c9d6e2', 'center');
  text(ctx, '5 nights. A shop between each. The Kraken waits on night 5.', W / 2, 306, 14, '#c9d6e2', 'center');
  const pulse = 0.7 + Math.sin(t * 3) * 0.3;
  ctx.globalAlpha = pulse;
  text(ctx, '— CLICK TO BEGIN —', W / 2, 348, 22, GOLD, 'center');
  ctx.globalAlpha = 1;
  text(ctx, `BEST SCORE  ${g.best}`, W / 2, 420, 15, '#9fb6c8', 'center');
  text(ctx, 'P pause   •   M sound   •   R restart', W / 2, 446, 12, '#7d93a6', 'center');
}

export function drawShop(ctx, g) {
  drawPlay(ctx, g, g.time);
  ctx.fillStyle = 'rgba(4, 10, 20, 0.72)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 110, 52, 740, 520, 0.96);
  text(ctx, `NIGHT ${g.night} CLEARED`, W / 2, 92, 30, GOLD, 'center');
  text(ctx, `Gold: ${g.gold}   •   Score: ${g.score}   •   Ships guided: ${g.shipsGuidedTotal}`, W / 2, 122, 15, CREAM, 'center');
  text(ctx, 'Spend gold, then sail into the next night. Keys 1–5 or click.', W / 2, 146, 13, '#9fb6c8', 'center');
  let y = 178;
  for (const item of SHOP_ITEMS) {
    const tier = g.upgrades[item.id] || 0;
    const price = nextPrice(item, tier);
    const afford = price !== null && g.gold >= price;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    roundRect(ctx, 140, y, 680, 56, 8);
    ctx.fill();
    ctx.strokeStyle = afford ? 'rgba(255, 217, 122, 0.5)' : 'rgba(255, 255, 255, 0.12)';
    roundRect(ctx, 140, y, 680, 56, 8);
    ctx.stroke();
    text(ctx, item.icon, 164, y + 28, 24, GOLD, 'center');
    text(ctx, `${item.key}. ${item.name}`, 192, y + 18, 17, CREAM);
    text(ctx, item.desc, 192, y + 40, 12, '#9fb6c8');
    text(ctx, '●'.repeat(tier) + '○'.repeat(item.maxTier - tier), 660, y + 18, 13, GOLD, 'center');
    text(ctx, price === null ? 'MAXED' : `${price} gold`, 740, y + 28, 15, afford ? GOLD : '#7d93a6', 'center');
    y += 66;
  }
  // Continue button.
  ctx.fillStyle = '#c9973f';
  roundRect(ctx, W / 2 - 130, 516, 260, 40, 10);
  ctx.fill();
  text(ctx, `CONTINUE — NIGHT ${g.night + 1}`, W / 2, 536, 17, '#0a1628', 'center');
}

export function drawPause(ctx, g) {
  drawPlay(ctx, g, g.time);
  ctx.fillStyle = 'rgba(4, 10, 20, 0.7)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, W / 2 - 220, 220, 440, 190, 0.95);
  text(ctx, 'PAUSED', W / 2, 262, 34, GOLD, 'center');
  text(ctx, 'The fog waits for no keeper — but it waits for you.', W / 2, 300, 14, CREAM, 'center');
  text(ctx, 'P or CLICK — resume      R — restart      M — sound', W / 2, 344, 14, '#9fb6c8', 'center');
  text(ctx, `Night ${g.night}/5   •   Score ${g.score}   •   Gold ${g.gold}`, W / 2, 378, 14, CREAM, 'center');
}

function statsBlock(ctx, g, y) {
  const rows = [
    ['Score', g.score],
    ['Ships guided home', g.shipsGuidedTotal],
    ['Creatures burned', g.kills],
    ['Nights survived', g.night - (g.state === 'win' ? 0 : 1)],
    ['Relics found', g.relics.size],
    ['Best score', g.best],
  ];
  for (const [label, value] of rows) {
    text(ctx, label, 330, y, 15, '#9fb6c8');
    text(ctx, String(value), 630, y, 15, CREAM, 'right');
    y += 30;
  }
  return y;
}

export function drawGameOver(ctx, g) {
  drawSea(ctx, g.time, g.fog);
  ctx.fillStyle = 'rgba(4, 10, 20, 0.6)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 180, 84, 600, 460, 0.95);
  text(ctx, 'THE LIGHT GOES OUT', W / 2, 132, 32, '#ff5a5a', 'center');
  text(ctx, `The fog took the lighthouse on night ${g.night}. The fleet sails on alone.`, W / 2, 168, 14, CREAM, 'center');
  statsBlock(ctx, g, 214);
  text(ctx, '— CLICK OR PRESS R TO TRY AGAIN —', W / 2, 480, 18, GOLD, 'center');
  text(ctx, `Best score ${g.best}`, W / 2, 512, 13, '#9fb6c8', 'center');
}

export function drawWin(ctx, g) {
  drawSea(ctx, g.time, g.fog);
  const lamp = { x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 86 };
  drawBeam(ctx, lamp, -Math.PI / 2 + Math.sin(g.time * 0.5) * 0.5, 0.5, 620, false, 0.9);
  drawIsland(ctx, g.time, { x: 0, y: 0 });
  panel(ctx, 180, 60, 600, 500, 0.94);
  text(ctx, 'THE FLEET IS HOME', W / 2, 108, 34, GOLD, 'center');
  text(ctx, 'Five nights. The Kraken is beaten. Every harbour light burns again.', W / 2, 142, 14, CREAM, 'center');
  const stars = g.hp >= 70 ? 3 : g.hp >= 35 ? 2 : 1;
  text(ctx, '★'.repeat(stars) + '☆'.repeat(3 - stars), W / 2, 182, 34, GOLD, 'center');
  statsBlock(ctx, g, 230);
  text(ctx, '— CLICK OR PRESS R TO PLAY AGAIN —', W / 2, 480, 18, GOLD, 'center');
  text(ctx, `Best score ${g.best}`, W / 2, 512, 13, '#9fb6c8', 'center');
}
