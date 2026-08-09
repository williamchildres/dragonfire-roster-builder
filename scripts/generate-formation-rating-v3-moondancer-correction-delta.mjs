import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const previousPath = required('--previous');
const currentPath = required('--current');
const outputPath = required('--output');
const previous = JSON.parse(await readFile(previousPath, 'utf8'));
const current = JSON.parse(await readFile(currentPath, 'utf8'));

if (previous.placementCount !== 35_904 || current.placementCount !== 35_904) {
  throw new Error('Expected two complete 0.23.5 placement snapshots (35,904 rows each).');
}

const previousRows = new Map(previous.rows.map((row) => [row.formation, row]));
let changedPlacementCount = 0;
let moondancerChangedPlacementCount = 0;
let existing33ChangedPlacementCount = 0;
let numericChangedPlacementCount = 0;
let relationshipChangedPlacementCount = 0;

for (const row of current.rows) {
  const before = previousRows.get(row.formation);
  if (!before) throw new Error(`Previous snapshot is missing ${row.formation}.`);
  if (JSON.stringify(before) === JSON.stringify(row)) continue;

  changedPlacementCount += 1;
  if (row.dragons.includes('moondancer')) moondancerChangedPlacementCount += 1;
  else existing33ChangedPlacementCount += 1;
  if (before.rating !== row.rating || before.activeSynergy !== row.activeSynergy ||
      before.placement !== row.placement ||
      before.adjustedRelationshipValue !== row.adjustedRelationshipValue) {
    numericChangedPlacementCount += 1;
  }
  if (JSON.stringify(before.relationships) !== JSON.stringify(row.relationships)) {
    relationshipChangedPlacementCount += 1;
  }
}

if (existing33ChangedPlacementCount !== 0) {
  throw new Error(`${existing33ChangedPlacementCount} existing 33-dragon placements changed.`);
}

const identityInput = {
  contract: 'formation-rating-v3-moondancer-correction-delta-v1',
  release: '0.23.5-pr-head-correction',
  reason: 'moondancer-initiative-and-progression-aware-uplift-correction',
  placementCount: current.placementCount,
  previousSnapshotIdentity: previous.snapshotIdentity,
  currentSnapshotIdentity: current.snapshotIdentity,
  changedPlacementCount,
  moondancerChangedPlacementCount,
  existing33ChangedPlacementCount,
  numericChangedPlacementCount,
  relationshipChangedPlacementCount,
};
const report = {
  ...identityInput,
  deterministicManifestHash: `sha256:${createHash('sha256').update(stableStringify(identityInput)).digest('hex')}`,
};

await writeFile(path.resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function required(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}
