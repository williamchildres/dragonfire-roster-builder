import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const OFFICIAL_URL = 'https://gotdragonfire.com/dragons/';
const USER_AGENT =
  'dragonfire-roster-builder/0.23.5 (+https://github.com/williamchildres/dragonfire-roster-builder)';

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

  const localRoster = await loadCanonicalRoster();
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

async function loadCanonicalRoster() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = await createServer({
    root,
    appType: 'custom',
    server: { middlewareMode: true, hmr: false },
    logLevel: 'error',
  });
  try {
    const { dragons } = await server.ssrLoadModule('/src/data/dragons.ts');
    return dragons.map(({ name, rarity, breed, rosterSourceStatus }) => ({
      name,
      rarity,
      breed,
      rosterSourceStatus,
    }));
  } finally {
    await server.close();
  }
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
