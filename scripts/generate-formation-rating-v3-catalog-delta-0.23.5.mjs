import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const previousPath = required('--previous');
const currentPath = required('--current');
const outputPath = required('--output');
const previous = JSON.parse(await readFile(previousPath, 'utf8'));
const current = JSON.parse(await readFile(currentPath, 'utf8'));

if (previous.placementCount !== 32_736 || current.placementCount !== 35_904) {
  throw new Error('Expected the complete 0.23.4 (32,736) and 0.23.5 (35,904) placement snapshots.');
}

const indexed = (rows) => {
  const occurrences = new Map();
  return new Map(rows.map((row) => {
    const ordinal = occurrences.get(row.formation) ?? 0;
    occurrences.set(row.formation, ordinal + 1);
    return [`${row.formation}#${ordinal}`, row];
  }));
};
const previousRows = indexed(previous.rows);
const currentRows = indexed(current.rows);
const existingChanged = [];
for (const [key, before] of previousRows) {
  const after = currentRows.get(key);
  if (!after) throw new Error(`Current catalog is missing existing placement ${key}.`);
  if (stableStringify(before) !== stableStringify(after)) {
    existingChanged.push({ key, dragonIds: before.dragons, previous: numericRow(before), current: numericRow(after) });
  }
}
const introduced = [...currentRows]
  .filter(([key]) => !previousRows.has(key))
  .map(([key, row]) => ({ key, row }));
if (introduced.some(({ row }) => !row.dragons.includes('moondancer'))) {
  throw new Error('A newly introduced placement does not contain Moondancer.');
}
const newRowsIdentity = sha256(stableStringify(introduced.map(({ key, row }) => [key, numericRow(row)])));
const identityInput = {
  contract: 'formation-rating-v3-catalog-delta-v1',
  release: '0.23.4-to-0.23.5',
  reason: 'add-legendary-dragon-moondancer',
  previousPlacementCount: previous.placementCount,
  currentPlacementCount: current.placementCount,
  existingPlacementCount: previousRows.size,
  existingChangedPlacementCount: existingChanged.length,
  introducedMoondancerPlacementCount: introduced.length,
  previousSnapshotIdentity: previous.snapshotIdentity,
  currentSnapshotIdentity: current.snapshotIdentity,
  introducedRowsIdentity: newRowsIdentity,
  existingChanged,
};
const report = { ...identityInput, deterministicManifestHash: sha256(stableStringify(identityInput)) };
await writeFile(path.resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

function numericRow(row) {
  return {
    rating: row.rating,
    activeSynergy: row.activeSynergy,
    placement: row.placement,
    adjustedRelationshipValue: row.adjustedRelationshipValue,
    activeRelationshipCount: row.activeRelationshipCount,
    quantifiedRelationshipCount: row.quantifiedRelationshipCount,
    unquantifiedRelationshipCount: row.unquantifiedRelationshipCount,
    unquantifiedBasePotential: row.unquantifiedBasePotential,
    relationships: row.relationships,
  };
}
function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
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
