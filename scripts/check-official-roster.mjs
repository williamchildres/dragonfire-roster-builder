#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OFFICIAL_URL = 'https://gotdragonfire.com/dragons/';
const USER_AGENT =
  'dragonfire-roster-builder/0.3.0 (+https://github.com/williamchildres/dragonfire-roster-builder)';

const localRoster = [
  ['Syrax', 'Legendary', 'Sentinel', 'official-website'],
  ['Vhagar', 'Legendary', 'Warrior', 'official-website'],
  ['Caraxes', 'Legendary', 'Hunter', 'official-website'],
  ['Seasmoke', 'Legendary', 'Champion', 'official-website'],
  ['Solstryker', 'Rare', 'Champion', 'official-website'],
  ['Crimson', 'Legendary', 'Hunter', 'official-website'],
  ['Kalspire', 'Legendary', 'Champion', 'official-website'],
  ['Malachite', 'Legendary', 'Sentinel', 'official-website'],
  ['Venator', 'Legendary', 'Warrior', 'official-website'],
  ['Daemoros', 'Epic', 'Warrior', 'official-website'],
  ['Feskar', 'Epic', 'Champion', 'official-website'],
  ['Rhysarion', 'Epic', 'Champion', 'official-website'],
  ['Shadowsong', 'Epic', 'Hunter', 'official-website'],
  ['Tashix', 'Epic', 'Hunter', 'official-website'],
  ['Vaeldra', 'Epic', 'Warrior', 'official-website'],
  ['Velar', 'Epic', 'Sentinel', 'official-website'],
  ['Zivern', 'Epic', 'Sentinel', 'official-website'],
  ['Antares', 'Rare', 'Hunter', 'official-website'],
  ['Shimmer', 'Rare', 'Sentinel', 'official-website'],
  ['Jagadrix', 'Rare', 'Hunter', 'official-website'],
  ['Bevlorin', 'Rare', 'Champion', 'official-website'],
  ['Shadowrend', 'Rare', 'Warrior', 'official-website'],
  ['Thunderstrike', 'Rare', 'Warrior', 'official-website'],
  ['Vesper', 'Rare', 'Sentinel', 'official-website'],
  ['Arulix', 'Rare', 'Champion', 'official-website'],
  ['Nyrena', 'Rare', 'Champion', 'official-website'],
  ['Dawnseeker', 'Rare', 'Sentinel', 'official-website'],
  ['Arrax', 'Rare', 'Warrior', 'official-website'],
  ['Sheepstealer', 'Legendary', 'Hunter', 'in-game-verified-pending-official-site'],
  ['Vermax', 'Epic', 'Warrior', 'in-game-verified-pending-official-site'],
].map(([name, rarity, breed, rosterSourceStatus]) => ({ name, rarity, breed, rosterSourceStatus }));

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
  const officialWebsiteLocal = local.filter((dragon) => dragon.rosterSourceStatus === 'official-website');
  const pendingLocal = local.filter(
    (dragon) => dragon.rosterSourceStatus === 'in-game-verified-pending-official-site',
  );
  const localByName = new Map(officialWebsiteLocal.map((dragon) => [dragon.name, dragon]));
  const officialByName = new Map(official.map((dragon) => [dragon.name, dragon]));
  const additions = official.filter(
    (dragon) => !localByName.has(dragon.name) && !pendingLocal.some((pending) => pending.name === dragon.name),
  );
  const removals = officialWebsiteLocal.filter((dragon) => !officialByName.has(dragon.name));
  const pendingNowOfficial = pendingLocal.filter((dragon) => officialByName.has(dragon.name));
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

  return {
    additions,
    removals,
    changes,
    pendingNowOfficial,
    counts: {
      knownInGame: local.length,
      officialWebsiteLocal: officialWebsiteLocal.length,
      pendingOfficialSite: pendingLocal.length,
      parsedOfficial: official.length,
    },
  };
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
  if (diff.additions.length || diff.removals.length || diff.changes.length || diff.pendingNowOfficial.length) {
    console.error('Official roster differences were found.');
    console.error(JSON.stringify(diff, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Official roster check passed for ${parsed.length} parsed official dragons. ` +
      `Known in-game: ${diff.counts.knownInGame}; official-site local: ${diff.counts.officialWebsiteLocal}; ` +
      `pending official site: ${diff.counts.pendingOfficialSite}.`,
  );
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
