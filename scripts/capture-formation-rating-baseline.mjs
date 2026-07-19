import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'docs', 'audits', 'full-roster-rating-baseline-0.10.5.json');
const server = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const [{ dragons }, { simpleSynergyProfiles }, { evaluateFormation }, { buildSimpleFormationPresentation }, { buildFormationSignalChips }, { rateFormation }] =
    await Promise.all([
      server.ssrLoadModule('/src/data/dragons.ts'),
      server.ssrLoadModule('/src/synergy/profiles.ts'),
      server.ssrLoadModule('/src/synergy/evaluateFormation.ts'),
      server.ssrLoadModule('/src/synergy/formationPresentation.ts'),
      server.ssrLoadModule('/src/app/formationCardPresentation.ts'),
      server.ssrLoadModule('/src/services/formationRating.ts'),
    ]);
  const mappedProfileIds = new Set(simpleSynergyProfiles.map((profile) => profile.dragonId));
  const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));
  const rows = [];

  for (const left of dragons) {
    for (const vanguard of dragons) {
      if (vanguard.id === left.id) continue;
      for (const right of dragons) {
        if (right.id === left.id || right.id === vanguard.id) continue;
        const formation = {
          'left-flank': left.id,
          vanguard: vanguard.id,
          'right-flank': right.id,
        };
        const progression = Object.fromEntries(
          Object.values(formation).map((dragonId) => [dragonId, { starRank: 10, dragonLevel: 16 }]),
        );
        const results = evaluateFormation({ formation, progression, profiles: simpleSynergyProfiles }).results;
        const presentation = buildSimpleFormationPresentation({
          formation,
          dragons,
          mappedProfileIds,
          results,
        });
        const signalChipsByDragonId = Object.fromEntries(
          Object.entries(formation).map(([position, dragonId]) => [
            dragonId,
            buildFormationSignalChips({
              profile: profilesById.get(dragonId),
              position,
              formation,
              profiles: simpleSynergyProfiles,
              progression,
            }),
          ]),
        );
        const rating = rateFormation({
          formation,
          dragons,
          profiles: simpleSynergyProfiles,
          presentation,
          signalChipsByDragonId,
        });
        rows.push({
          formation: [left.id, vanguard.id, right.id],
          score: rating.score,
          tier: rating.tier,
        });
      }
    }
  }

  await writeFile(
    outputPath,
    `${JSON.stringify({
      version: '0.10.5',
      sourceCommit: 'a5c4bc2c05850210a64652921021bba1783e6eb1',
      deterministicHash: 'ca8d09e060d7b28faa44115f65d2cfe52b1cce2ecc1a9a5fc9439714e22afc48',
      progression: { starRank: 10, dragonLevel: 16 },
      rowCount: rows.length,
      rows,
    }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Captured ${rows.length} baseline rating rows at ${outputPath}.`);
} finally {
  await server.close();
}
