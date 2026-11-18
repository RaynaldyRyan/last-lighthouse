// upgrades.js: the shop between nights and the relics creatures drop.
// Every choice costs gold and changes how the beam, the tower or the fleet
// behaves, so each run's build is different.

export const SHOP_ITEMS = [
  {
    id: 'lens', key: '1', name: 'Bright Lens', icon: '◉',
    desc: '+12 beam damage per tier. Burns fog creatures faster.',
    tiers: [30, 60, 110], maxTier: 3,
    apply(g) { g.beamDamage += 12; },
  },
  {
    id: 'prism', key: '2', name: 'Wide Prism', icon: '△',
    desc: '+8° beam width per tier. Lights more ships at once.',
    tiers: [25, 50, 90], maxTier: 3,
    apply(g) { g.beamWidth += 8 * Math.PI / 180; },
  },
  {
    id: 'tank', key: '3', name: 'Deep Tank', icon: '▣',
    desc: '+40 max fuel and +1 fuel regen per tier.',
    tiers: [25, 50, 90], maxTier: 3,
    apply(g) { g.fuelMax += 40; g.fuelRegen += 1; g.fuel = g.fuelMax; },
  },
  {
    id: 'tower', key: '4', name: 'Iron Tower', icon: '⬢',
    desc: '+30 max hull and repair 30 per tier.',
    tiers: [30, 60, 100], maxTier: 3,
    apply(g) { g.hpMax += 30; g.hp = Math.min(g.hpMax, g.hp + 30); },
  },
  {
    id: 'turret', key: '5', name: 'Storm Turret', icon: '✦',
    desc: 'A second beam that hunts creatures on its own. 15 damage/s.',
    tiers: [150], maxTier: 1,
    apply(g) { g.turret = true; },
  },
];

export const RELICS = {
  shard: { name: 'Prism Shard', icon: '◆', desc: 'Beam splits: a second cone at +30°.' },
  oil: { name: 'Storm Oil', icon: '●', desc: 'Fuel regenerates twice as fast.' },
  charm: { name: "Sailor's Charm", icon: '♥', desc: '+30% gold from every ship and kill.' },
  bane: { name: 'Krakensbane', icon: '†', desc: '+60% damage against the Kraken.' },
  current: { name: 'Swift Current', icon: '≈', desc: 'Ships sail 40% faster, lit or not.' },
};

export const RELIC_IDS = Object.keys(RELICS);

// Price of the next tier of an item, or null when maxed out.
export function nextPrice(item, tier) {
  return tier >= item.maxTier ? null : item.tiers[tier];
}

// Buy one tier of an item for the game state g. Returns true when bought.
export function buyItem(g, item) {
  const tier = g.upgrades[item.id] || 0;
  const price = nextPrice(item, tier);
  if (price === null || g.gold < price) return false;
  g.gold -= price;
  g.upgrades[item.id] = tier + 1;
  item.apply(g);
  return true;
}

// Gold value of a reward, with the Sailor's Charm bonus applied.
export function goldValue(g, base) {
  return Math.round(base * (g.relics.has('charm') ? 1.3 : 1));
}
