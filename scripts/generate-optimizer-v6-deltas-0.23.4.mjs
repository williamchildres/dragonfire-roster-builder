import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const historicalPath = fileURLToPath(new URL(
  '../docs/audits/roster-optimizer-v5-0.22.0.json',
  import.meta.url,
));
const previousPath = fileURLToPath(new URL(
  '../docs/audits/roster-optimizer-v6-0.23.3.json',
  import.meta.url,
));
const currentPath = fileURLToPath(new URL(
  '../docs/audits/roster-optimizer-v6-0.23.4.json',
  import.meta.url,
));
const cumulativeOutputPath = fileURLToPath(new URL(
  '../src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.4.json',
  import.meta.url,
));
const releaseOutputPath = fileURLToPath(new URL(
  '../src/audit/fixtures/optimizerV6ReleaseDeltas.0.23.3-to-0.23.4.json',
  import.meta.url,
));

const historical = JSON.parse(readFileSync(historicalPath, 'utf8'));
const previous = JSON.parse(readFileSync(previousPath, 'utf8'));
const current = JSON.parse(readFileSync(currentPath, 'utf8'));
const historicalByKey = new Map(historical.executions.map((entry) => [key(entry), entry]));
const previousByKey = new Map(previous.executions.map((entry) => [key(entry), entry]));

const releaseDeltas = current.executions
  .map((entry) => releaseDelta(previousByKey.get(key(entry)), entry))
  .filter(Boolean)
  .sort((left, right) => left.key.localeCompare(right.key));
const releaseChangedKeys = new Set(releaseDeltas.map((entry) => entry.key));

const cumulativeDeltas = current.executions
  .filter((entry) => entry.mode !== 'best-overall-first')
  .map((entry) => historicalDelta(
    historicalByKey.get(key(entry)),
    entry,
    releaseChangedKeys.has(key(entry))
      ? 'vhagar-burn-fiery-bonds-reliability-correction'
      : 'syrax-blazing-fury-recipient-correction',
  ))
  .filter(Boolean)
  .sort((left, right) => left.key.localeCompare(right.key));

const cumulativeIdentityInput = {
  schemaVersion: 2,
  release: '0.23.4',
  sourceBaseCommit: '8b1a5f17cee491e471ca423c10da7d0e7eeb73ce',
  historicalOptimizerContract: 5,
  historicalOptimizerArtifactIdentity: 'fnv1a64:e5ac2432442f5cb0',
  currentOptimizerContract: 6,
  currentFormationRatingContract: 'formation-rating-v3',
  reasonCode: 'cumulative-formation-rating-v3-corrections-through-0.23.4',
  approvedChangedExecutionCount: cumulativeDeltas.length,
  deltas: cumulativeDeltas,
};
const cumulativeManifest = withHash(cumulativeIdentityInput);

const releaseIdentityInput = {
  schemaVersion: 1,
  release: '0.23.3-to-0.23.4',
  sourceBaseCommit: '8b1a5f17cee491e471ca423c10da7d0e7eeb73ce',
  previousOptimizerContract: 6,
  currentOptimizerContract: 6,
  formationRatingContract: 'formation-rating-v3',
  previousOptimizerArtifactIdentity: previous.deterministicAuditHash,
  currentOptimizerArtifactIdentity: current.deterministicAuditHash,
  reasonCode: 'vhagar-burn-fiery-bonds-reliability-correction',
  changedExecutionCount: releaseDeltas.length,
  deltas: releaseDeltas,
};
const releaseManifest = withHash(releaseIdentityInput);

if (process.argv.includes('--write')) {
  writeFileSync(cumulativeOutputPath, `${JSON.stringify(cumulativeManifest, null, 2)}\n`);
  writeFileSync(releaseOutputPath, `${JSON.stringify(releaseManifest, null, 2)}\n`);
  console.log(`Wrote ${cumulativeDeltas.length} cumulative v5 deltas.`);
  console.log(`Cumulative identity: ${cumulativeManifest.deterministicManifestHash}`);
  console.log(`Wrote ${releaseDeltas.length} release deltas.`);
  console.log(`Release identity: ${releaseManifest.deterministicManifestHash}`);
} else {
  validate(cumulativeOutputPath, cumulativeManifest, 'cumulative');
  validate(releaseOutputPath, releaseManifest, 'release');
  console.log(`Validated cumulative identity: ${cumulativeManifest.deterministicManifestHash}`);
  console.log(`Validated release identity: ${releaseManifest.deterministicManifestHash}`);
}

function historicalDelta(oldEntry, newEntry, reasonCode) {
  if (!oldEntry) throw new Error(`Missing historical execution ${key(newEntry)}.`);
  if (sameSelection(oldEntry, newEntry)) return null;
  return {
    key: key(newEntry),
    fixtureId: newEntry.fixture,
    allocationMode: newEntry.mode,
    formationCount: newEntry.count,
    inputOrder: newEntry.inputOrder,
    historicalStableSolutionKey: oldEntry.stableSolutionKey,
    currentStableSolutionKey: newEntry.stableSolutionKey,
    historicalAscendingPowerVector: oldEntry.ascendingPowerVector,
    currentAscendingPowerVector: newEntry.ascendingPowerVector,
    historicalAscendingRatingVector: oldEntry.ascendingRatingVector,
    currentAscendingRatingVector: newEntry.ascendingRatingVector,
    historicalSolutionHash: oldEntry.solutionHash,
    currentSolutionHash: newEntry.solutionHash,
    historicalResultHash: oldEntry.resultHash,
    currentResultHash: newEntry.resultHash,
    reasonCode,
  };
}

function releaseDelta(oldEntry, newEntry) {
  if (!oldEntry) throw new Error(`Missing 0.23.3 execution ${key(newEntry)}.`);
  if (sameReleaseEntry(oldEntry, newEntry)) return null;
  return {
    key: key(newEntry),
    fixture: newEntry.fixture,
    mode: newEntry.mode,
    count: newEntry.count,
    inputOrder: newEntry.inputOrder,
    previousStableSolutionKey: oldEntry.stableSolutionKey,
    currentStableSolutionKey: newEntry.stableSolutionKey,
    previousAscendingPowerVector: oldEntry.ascendingPowerVector,
    currentAscendingPowerVector: newEntry.ascendingPowerVector,
    previousAscendingRatingVector: oldEntry.ascendingRatingVector,
    currentAscendingRatingVector: newEntry.ascendingRatingVector,
    previousBestOverallScoreUnits: oldEntry.bestOverallScoreUnits,
    currentBestOverallScoreUnits: newEntry.bestOverallScoreUnits,
    previousSolutionHash: oldEntry.solutionHash,
    currentSolutionHash: newEntry.solutionHash,
    previousResultHash: oldEntry.resultHash,
    currentResultHash: newEntry.resultHash,
    reason: 'vhagar-burn-fiery-bonds-reliability-correction',
  };
}

function sameSelection(left, right) {
  return left.stableSolutionKey === right.stableSolutionKey &&
    JSON.stringify(left.ascendingPowerVector) === JSON.stringify(right.ascendingPowerVector) &&
    JSON.stringify(left.ascendingRatingVector) === JSON.stringify(right.ascendingRatingVector);
}

function sameReleaseEntry(left, right) {
  return sameSelection(left, right) &&
    JSON.stringify(left.bestOverallScoreUnits) === JSON.stringify(right.bestOverallScoreUnits) &&
    left.solutionHash === right.solutionHash &&
    left.resultHash === right.resultHash;
}

function key(entry) {
  return `${entry.fixture}/${entry.mode}/${entry.count}/${entry.inputOrder}`;
}

function withHash(identityInput) {
  return {
    ...identityInput,
    deterministicManifestHash: `sha256:${createHash('sha256')
      .update(JSON.stringify(identityInput))
      .digest('hex')}`,
  };
}

function validate(path, expected, label) {
  const actual = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Committed ${label} optimizer delta manifest is stale.`);
  }
}
