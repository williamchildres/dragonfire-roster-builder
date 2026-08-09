import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const previousPath = required('--previous');
const currentPath = required('--current');
const outputPath = required('--output');
const previous = JSON.parse(await readFile(previousPath, 'utf8'));
const current = JSON.parse(await readFile(currentPath, 'utf8'));
if (previous.placementCount !== 32_736 || current.placementCount !== 32_736) {
  throw new Error('Both snapshots must contain all 32,736 ordered placements.');
}
const previousByFormation = new Map(previous.rows.map((row) => [row.formation, row]));
const currentByFormation = new Map(current.rows.map((row) => [row.formation, row]));
const changed = [];
for (const formation of [...previousByFormation.keys()].sort()) {
  const before = previousByFormation.get(formation);
  const after = currentByFormation.get(formation);
  if (!after) throw new Error(`Current snapshot is missing ${formation}.`);
  if (stableStringify(before) === stableStringify(after)) continue;
  changed.push({
    formation,
    containsVhagar: after.containsVhagar,
    numericChanged: numericIdentity(before) !== numericIdentity(after),
    previous: releaseRow(before),
    current: releaseRow(after),
    reason: 'vhagar-burn-fiery-bonds-reliability-correction',
  });
}
if (currentByFormation.size !== previousByFormation.size) {
  throw new Error('Snapshot formation sets differ.');
}
const withoutIdentity = {
  contract: 'formation-rating-v3-release-delta-v1',
  release: '0.23.3-to-0.23.4',
  reason: 'vhagar-burn-fiery-bonds-reliability-correction',
  previousSnapshotIdentity: previous.snapshotIdentity,
  currentSnapshotIdentity: current.snapshotIdentity,
  placementCount: current.placementCount,
  changedPlacementCount: changed.length,
  numericChangedPlacementCount: changed.filter((entry) => entry.numericChanged).length,
  vhagarChangedPlacementCount: changed.filter((entry) => entry.containsVhagar).length,
  nonVhagarChangedPlacementCount: changed.filter((entry) => !entry.containsVhagar).length,
  changed,
};
const deterministicManifestHash = sha256(stableStringify(withoutIdentity));
await writeFile(
  path.resolve(outputPath),
  `${JSON.stringify({ ...withoutIdentity, deterministicManifestHash }, null, 2)}\n`,
  'utf8',
);
console.log(
  `${changed.length} changed placements (${withoutIdentity.numericChangedPlacementCount} numeric; ${withoutIdentity.nonVhagarChangedPlacementCount} non-Vhagar); ${deterministicManifestHash}`,
);

function numericIdentity(row) {
  return stableStringify({
    rating: row.rating,
    activeSynergy: row.activeSynergy,
    placement: row.placement,
    adjustedRelationshipValue: row.adjustedRelationshipValue,
    activeRelationshipCount: row.activeRelationshipCount,
    quantifiedRelationshipCount: row.quantifiedRelationshipCount,
    unquantifiedRelationshipCount: row.unquantifiedRelationshipCount,
    unquantifiedBasePotential: row.unquantifiedBasePotential,
  });
}

function releaseRow(row) {
  return {
    rating: row.rating,
    activeSynergy: row.activeSynergy,
    placement: row.placement,
    adjustedRelationshipValue: row.adjustedRelationshipValue,
    activeRelationshipCount: row.activeRelationshipCount,
    quantifiedRelationshipCount: row.quantifiedRelationshipCount,
    unquantifiedRelationshipCount: row.unquantifiedRelationshipCount,
    unquantifiedBasePotential: row.unquantifiedBasePotential,
    burnToVhagar: row.burnToVhagar,
  };
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

function required(name) {
  const index = process.argv.indexOf(name);
  const result = index >= 0 ? process.argv[index + 1] : undefined;
  if (!result) throw new Error(`Missing ${name}.`);
  return result;
}
