import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createServer } from 'vite';

const root = path.resolve(value('--root') ?? process.cwd());
const outputPath = value('--output');
if (!outputPath) {
  throw new Error('Usage: pnpm node scripts/snapshot-formation-rating-v3-placements.mjs --root <checkout> --output <snapshot.json>');
}

const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  logLevel: 'error',
});

try {
  const [data, profilesModule, placementModule, ratingModule, reliabilityModule] =
    await Promise.all([
      server.ssrLoadModule('/src/data/dragons.ts'),
      server.ssrLoadModule('/src/synergy/profiles.ts'),
      server.ssrLoadModule('/src/services/formationPlacementComparisonV3.ts'),
      server.ssrLoadModule('/src/services/formationRatingV3.ts'),
      server.ssrLoadModule('/src/synergy/reliability/index.ts'),
    ]);
  const { dragons } = data;
  const { simpleSynergyProfiles } = profilesModule;
  const rows = [];
  for (let left = 0; left < dragons.length; left += 1) {
    for (let vanguard = left + 1; vanguard < dragons.length; vanguard += 1) {
      for (let right = vanguard + 1; right < dragons.length; right += 1) {
        const ids = [dragons[left].id, dragons[vanguard].id, dragons[right].id];
        const progression = Object.fromEntries(
          ids.map((dragonId) => [dragonId, { starRank: 10, dragonLevel: 16 }]),
        );
        const reliabilityProgression = Object.fromEntries(
          ids.map((dragonId) => {
            const dragon = dragons.find((candidate) => candidate.id === dragonId);
            const activeHabitLevels = Object.fromEntries(
              (dragon?.habits ?? [])
                .filter((habit) => habit.unlockStarRank <= 10)
                .map((habit) => [habit.id, 5]),
            );
            return [
              dragonId,
              { starRank: 10, dragonLevel: 16, activeHabitLevels },
            ];
          }),
        );
        const comparison = placementModule.compareFormationPlacementsV3({
          formation: {
            'left-flank': ids[0],
            vanguard: ids[1],
            'right-flank': ids[2],
          },
          progression,
          reliabilityProgression,
          profiles: simpleSynergyProfiles,
        });
        if (!comparison) throw new Error(`Missing comparison for ${ids.join('/')}.`);
        for (const candidate of comparison.candidates) {
          const active = ratingModule.scoreActiveSynergyV3(candidate.relationships);
          rows.push({
            formation: arrangementKey(candidate.arrangement),
            dragons: [...ids].sort(),
            containsVhagar: ids.includes('vhagar'),
            rating: active.score + candidate.placementScore,
            activeSynergy: active.score,
            placement: candidate.placementScore,
            adjustedRelationshipValue: round(candidate.adjustedUncappedRelationshipValue),
            activeRelationshipCount: candidate.relationships.filter(
              (relationship) => relationship.adjustedMarginalValue > 0,
            ).length,
            quantifiedRelationshipCount: candidate.relationships.filter(
              (relationship) => relationship.quantification.status === 'quantified',
            ).length,
            unquantifiedRelationshipCount: candidate.relationships.filter(
              (relationship) => relationship.quantification.status === 'unquantified',
            ).length,
            unquantifiedBasePotential: candidate.unquantifiedBasePotential,
            burnToVhagar: candidate.relationships
              .filter(
                (relationship) =>
                  relationship.beneficiaryDragonId === 'vhagar' &&
                  relationship.semanticTag === 'status:burn',
              )
              .map(compactRelationship),
            relationships: candidate.relationships.map(compactRelationship),
          });
        }
      }
    }
  }
  rows.sort((left, right) => left.formation.localeCompare(right.formation));
  const reportWithoutIdentity = {
    contract: 'formation-rating-v3-placement-snapshot-v1',
    ratingContract: reliabilityModule.FORMATION_RATING_V3_CONTRACT,
    root,
    placementCount: rows.length,
    rows,
  };
  const snapshotIdentity = sha256(stableStringify({
    contract: reportWithoutIdentity.contract,
    ratingContract: reportWithoutIdentity.ratingContract,
    placementCount: rows.length,
    rows,
  }));
  await writeFile(
    path.resolve(outputPath),
    `${JSON.stringify({ ...reportWithoutIdentity, snapshotIdentity }, null, 2)}\n`,
    'utf8',
  );
  console.log(`${rows.length} placements; ${snapshotIdentity}`);
} finally {
  await server.close();
}

function compactRelationship(relationship) {
  return {
    id: relationship.id,
    providerSignalId: relationship.selectedProviderSignalId,
    beneficiarySignalId: relationship.selectedBeneficiarySignalId,
    componentIds: relationship.componentIds,
    probabilityVariantIds: relationship.probabilityVariantIds,
    baseValue: relationship.baseValue,
    adjustedMarginalValue: round(relationship.adjustedMarginalValue),
    quantification:
      relationship.quantification.status === 'quantified'
        ? {
            status: 'quantified',
            reliability: relationship.quantification.reliability,
            method: relationship.quantification.method,
          }
        : {
            status: 'unquantified',
            reason: relationship.quantification.reason,
            conditionalProbabilities:
              relationship.quantification.conditionalProbabilities ?? [],
          },
  };
}

function arrangementKey(arrangement) {
  return [arrangement['left-flank'], arrangement.vanguard, arrangement['right-flank']].join('/');
}

function round(value) {
  return Math.round(value * 1e12) / 1e12;
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
