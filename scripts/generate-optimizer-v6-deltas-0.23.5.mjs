import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const historical = JSON.parse(readFileSync(at('../docs/audits/roster-optimizer-v5-0.22.0.json'), 'utf8'));
const previous = JSON.parse(readFileSync(at('../docs/audits/roster-optimizer-v6-0.23.4.json'), 'utf8'));
const current = JSON.parse(readFileSync(at('../docs/audits/roster-optimizer-v6-0.23.5.json'), 'utf8'));
const previousCumulative = JSON.parse(readFileSync(at('../src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.4.json'), 'utf8'));
const cumulativeOutput = at('../src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.5.json');
const releaseOutput = at('../src/audit/fixtures/optimizerV6ReleaseDeltas.0.23.4-to-0.23.5.json');

const historicalByKey = new Map(historical.executions.map((entry) => [key(entry), entry]));
const previousByKey = new Map(previous.executions.map((entry) => [key(entry), entry]));
const previousReasonByKey = new Map(previousCumulative.deltas.map((entry) => [entry.key, entry.reasonCode]));
const releaseDeltas = current.executions.map((entry) => releaseDelta(previousByKey.get(key(entry)), entry)).filter(Boolean).sort(byKey);
const releaseChangedKeys = new Set(releaseDeltas.map((entry) => entry.key));
const cumulativeDeltas = current.executions
  .filter((entry) => entry.mode !== 'best-overall-first')
  .map((entry) => historicalDelta(
    historicalByKey.get(key(entry)), entry,
    releaseChangedKeys.has(key(entry))
      ? 'add-legendary-dragon-moondancer'
      : previousReasonByKey.get(key(entry)) ?? 'syrax-blazing-fury-recipient-correction',
  ))
  .filter(Boolean)
  .sort(byKey);

const cumulative = withHash({
  schemaVersion: 2,
  release: '0.23.5',
  sourceBaseCommit: '810cedf19b86767d3aaafe00e2454d6f12730745',
  historicalOptimizerContract: 5,
  historicalOptimizerArtifactIdentity: 'fnv1a64:e5ac2432442f5cb0',
  currentOptimizerContract: 6,
  currentFormationRatingContract: 'formation-rating-v3',
  reasonCode: 'cumulative-formation-rating-v3-corrections-through-0.23.5',
  approvedChangedExecutionCount: cumulativeDeltas.length,
  deltas: cumulativeDeltas,
});
const release = withHash({
  schemaVersion: 1,
  release: '0.23.4-to-0.23.5',
  sourceBaseCommit: '810cedf19b86767d3aaafe00e2454d6f12730745',
  previousOptimizerContract: 6,
  currentOptimizerContract: 6,
  formationRatingContract: 'formation-rating-v3',
  previousOptimizerArtifactIdentity: previous.deterministicAuditHash,
  currentOptimizerArtifactIdentity: current.deterministicAuditHash,
  reasonCode: 'add-legendary-dragon-moondancer',
  changedExecutionCount: releaseDeltas.length,
  deltas: releaseDeltas,
});

writeFileSync(cumulativeOutput, `${JSON.stringify(cumulative, null, 2)}\n`);
writeFileSync(releaseOutput, `${JSON.stringify(release, null, 2)}\n`);
console.log(JSON.stringify({
  cumulativeCount: cumulativeDeltas.length,
  cumulativeIdentity: cumulative.deterministicManifestHash,
  releaseCount: releaseDeltas.length,
  releaseIdentity: release.deterministicManifestHash,
}, null, 2));

function historicalDelta(oldEntry, newEntry, reasonCode) {
  if (!oldEntry) throw new Error(`Missing historical execution ${key(newEntry)}.`);
  if (sameSelection(oldEntry, newEntry)) return null;
  return {
    key: key(newEntry), fixtureId: newEntry.fixture, allocationMode: newEntry.mode,
    formationCount: newEntry.count, inputOrder: newEntry.inputOrder,
    historicalStableSolutionKey: oldEntry.stableSolutionKey, currentStableSolutionKey: newEntry.stableSolutionKey,
    historicalAscendingPowerVector: oldEntry.ascendingPowerVector, currentAscendingPowerVector: newEntry.ascendingPowerVector,
    historicalAscendingRatingVector: oldEntry.ascendingRatingVector, currentAscendingRatingVector: newEntry.ascendingRatingVector,
    historicalSolutionHash: oldEntry.solutionHash, currentSolutionHash: newEntry.solutionHash,
    historicalResultHash: oldEntry.resultHash, currentResultHash: newEntry.resultHash, reasonCode,
  };
}
function releaseDelta(oldEntry, newEntry) {
  if (!oldEntry) throw new Error(`Missing 0.23.4 execution ${key(newEntry)}.`);
  if (sameReleaseEntry(oldEntry, newEntry)) return null;
  return {
    key: key(newEntry), fixture: newEntry.fixture, mode: newEntry.mode, count: newEntry.count,
    inputOrder: newEntry.inputOrder, previousStableSolutionKey: oldEntry.stableSolutionKey,
    currentStableSolutionKey: newEntry.stableSolutionKey,
    previousAscendingPowerVector: oldEntry.ascendingPowerVector, currentAscendingPowerVector: newEntry.ascendingPowerVector,
    previousAscendingRatingVector: oldEntry.ascendingRatingVector, currentAscendingRatingVector: newEntry.ascendingRatingVector,
    previousBestOverallScoreUnits: oldEntry.bestOverallScoreUnits, currentBestOverallScoreUnits: newEntry.bestOverallScoreUnits,
    previousSolutionHash: oldEntry.solutionHash, currentSolutionHash: newEntry.solutionHash,
    previousResultHash: oldEntry.resultHash, currentResultHash: newEntry.resultHash,
    reason: 'add-legendary-dragon-moondancer',
  };
}
function sameSelection(left, right) {
  return left.stableSolutionKey === right.stableSolutionKey &&
    JSON.stringify(left.ascendingPowerVector) === JSON.stringify(right.ascendingPowerVector) &&
    JSON.stringify(left.ascendingRatingVector) === JSON.stringify(right.ascendingRatingVector);
}
function sameReleaseEntry(left, right) {
  return sameSelection(left, right) && JSON.stringify(left.bestOverallScoreUnits) === JSON.stringify(right.bestOverallScoreUnits) &&
    left.solutionHash === right.solutionHash && left.resultHash === right.resultHash;
}
function key(entry) { return `${entry.fixture}/${entry.mode}/${entry.count}/${entry.inputOrder}`; }
function byKey(left, right) { return left.key.localeCompare(right.key); }
function withHash(value) {
  return { ...value, deterministicManifestHash: `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}` };
}
