#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OFFICIAL_URL = 'https://gotdragonfire.com/dragons/';
const USER_AGENT = 'dragonfire-roster-builder/0.1.0 (+https://github.com/USERNAME/dragonfire-roster-builder)';

const localRoster = [
  ['Syrax', 'Legendary', 'Sentinel'],
  ['Vhagar', 'Legendary', 'Warrior'],
  ['Caraxes', 'Legendary', 'Hunter'],
  ['Seasmoke', 'Legendary', 'Champion'],
  ['Solstryker', 'Rare', 'Champion'],
  ['Crimson', 'Legendary', 'Hunter'],
  ['Kalspire', 'Legendary', 'Champion'],
  ['Malachite', 'Legendary', 'Sentinel'],
  ['Venator', 'Legendary', 'Warrior'],
  ['Daemoros', 'Epic', 'Warrior'],
  ['Feskar', 'Epic', 'Champion'],
  ['Rhysarion', 'Epic', 'Champion'],
  ['Shadowsong', 'Epic', 'Hunter'],
  ['Tashix', 'Epic', 'Hunter'],
  ['Vaeldra', 'Epic', 'Warrior'],
  ['Velar', 'Epic', 'Sentinel'],
  ['Zivern', 'Epic', 'Sentinel'],
  ['Antares', 'Rare', 'Hunter'],
  ['Shimmer', 'Rare', 'Sentinel'],
  ['Jagadrix', 'Rare', 'Hunter'],
  ['Bevlorin', 'Rare', 'Champion'],
  ['Shadowrend', 'Rare', 'Warrior'],
  ['Thunderstrike', 'Rare', 'Warrior'],
  ['Vesper', 'Rare', 'Sentinel'],
  ['Arulix', 'Rare', 'Champion'],
  ['Nyrena', 'Rare', 'Champion'],
  ['Dawnseeker', 'Rare', 'Sentinel'],
  ['Arrax', 'Rare', 'Warrior'],
].map(([name, rarity, breed]) => ({ name, rarity, breed }));

export function parseOfficialRoster(html) {
  const names = [...html.matchAll(/\/dragons\/([a-z0-9-]+)\/["']/gi)].map((match) =>
    slugToName(match[1]),
  );
  const uniqueNames = [...new Set(names)].filter(Boolean);

  return uniqueNames.map((name) => {
    const windowStart = Math.max(0, html.toLowerCase().indexOf(slugify(name)) - 600);
    const nearby = html.slice(windowStart, windowStart + 1400);
    return {
      name,
      rarity: findToken(nearby, ['Legendary', 'Epic', 'Rare']),
      breed: findToken(nearby, ['Champion', 'Hunter', 'Sentinel', 'Warrior']),
    };
  });
}

export function compareRosters(local, official) {
  const localByName = new Map(local.map((dragon) => [dragon.name, dragon]));
  const officialByName = new Map(official.map((dragon) => [dragon.name, dragon]));
  const additions = official.filter((dragon) => !localByName.has(dragon.name));
  const removals = local.filter((dragon) => !officialByName.has(dragon.name));
  const changes = official
    .filter((dragon) => localByName.has(dragon.name))
    .filter((dragon) => {
      const localDragon = localByName.get(dragon.name);
      return (
        dragon.rarity &&
        dragon.breed &&
        localDragon &&
        (dragon.rarity !== localDragon.rarity || dragon.breed !== localDragon.breed)
      );
    });

  return { additions, removals, changes };
}

async function main() {
  const fixturePath = process.argv.includes('--fixture')
    ? process.argv[process.argv.indexOf('--fixture') + 1]
    : null;

  let html;
  try {
    html = fixturePath
      ? await readFile(fixturePath, 'utf8')
      : await fetchHtml();
  } catch (error) {
    console.error(`Could not read official roster page: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const parsed = parseOfficialRoster(html);
  if (parsed.length === 0) {
    console.error('The roster parser found no dragons. The official page selectors may need maintenance.');
    process.exitCode = 2;
    return;
  }

  const diff = compareRosters(localRoster, parsed);
  if (diff.additions.length || diff.removals.length || diff.changes.length) {
    console.error('Official roster differences were found.');
    console.error(JSON.stringify(diff, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(`Official roster check passed for ${parsed.length} parsed dragons.`);
}

async function fetchHtml() {
  const response = await fetch(OFFICIAL_URL, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

function findToken(text, tokens) {
  return tokens.find((token) => new RegExp(`\\b${token}\\b`, 'i').test(text)) ?? null;
}

function slugToName(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(name) {
  return name.toLowerCase().replaceAll(' ', '-');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
