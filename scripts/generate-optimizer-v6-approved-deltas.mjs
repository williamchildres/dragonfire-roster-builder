import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const historicalPath = fileURLToPath(new URL(
  '../docs/audits/roster-optimizer-v5-0.22.0.json',
  import.meta.url,
));
const currentPath = fileURLToPath(new URL(
  '../docs/audits/roster-optimizer-v6-0.23.3.json',
  import.meta.url,
));
const outputPath = fileURLToPath(new URL(
  '../src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.3.json',
  import.meta.url,
));
const reasonCode = 'syrax-blazing-fury-recipient-correction';
const expectedChangedCount = 50;

const historical = JSON.parse(readFileSync(historicalPath, 'utf8'));
const current = JSON.parse(readFileSync(currentPath, 'utf8'));
const historicalByKey = new Map(historical.executions.map((execution) => [
  executionKey(execution),
  execution,
]));

const deltas = current.executions
  .filter((execution) => execution.mode !== 'best-overall-first')
  .map((execution) => {
    const previous = historicalByKey.get(executionKey(execution));
    if (!previous) throw new Error(`Missing historical execution ${executionKey(execution)}.`);
    return matches(previous, execution) ? null : {
      key: executionKey(execution),
      fixtureId: execution.fixture,
      allocationMode: execution.mode,
      formationCount: execution.count,
      inputOrder: execution.inputOrder,
      historicalStableSolutionKey: previous.stableSolutionKey,
      currentStableSolutionKey: execution.stableSolutionKey,
      historicalAscendingPowerVector: previous.ascendingPowerVector,
      currentAscendingPowerVector: execution.ascendingPowerVector,
      historicalAscendingRatingVector: previous.ascendingRatingVector,
      currentAscendingRatingVector: execution.ascendingRatingVector,
      historicalSolutionHash: previous.solutionHash,
      currentSolutionHash: execution.solutionHash,
      historicalResultHash: previous.resultHash,
      currentResultHash: execution.resultHash,
      reasonCode,
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.key.localeCompare(right.key));

if (deltas.length !== expectedChangedCount) {
  throw new Error(`Expected ${expectedChangedCount} approved deltas, received ${deltas.length}.`);
}

const identityInput = {
  schemaVersion: 1,
  release: '0.23.3',
  sourceBaseCommit: '2832d64c75621ce2fcf57385d716df2f2de52aab',
  historicalOptimizerContract: 5,
  historicalOptimizerArtifactIdentity: 'fnv1a64:e5ac2432442f5cb0',
  currentOptimizerContract: 6,
  currentFormationRatingContract: 'formation-rating-v3',
  reasonCode,
  approvedChangedExecutionCount: expectedChangedCount,
  deltas,
};
const deterministicManifestHash = `sha256:${createHash('sha256')
  .update(JSON.stringify(identityInput))
  .digest('hex')}`;
const manifest = { ...identityInput, deterministicManifestHash };

if (process.argv.includes('--write')) {
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${deltas.length} approved optimizer deltas to ${outputPath}`);
  console.log(`Identity: ${deterministicManifestHash}`);
} else {
  const committed = JSON.parse(readFileSync(outputPath, 'utf8'));
  if (JSON.stringify(committed) !== JSON.stringify(manifest)) {
    throw new Error('Committed optimizer-v6 approved-delta manifest is stale.');
  }
  console.log(`Approved optimizer delta manifest validated: ${deterministicManifestHash}`);
}

function executionKey(execution) {
  return `${execution.fixture}/${execution.mode}/${execution.count}/${execution.inputOrder}`;
}

function matches(previous, currentExecution) {
  return previous.stableSolutionKey === currentExecution.stableSolutionKey &&
    JSON.stringify(previous.ascendingPowerVector) ===
      JSON.stringify(currentExecution.ascendingPowerVector) &&
    JSON.stringify(previous.ascendingRatingVector) ===
      JSON.stringify(currentExecution.ascendingRatingVector);
}
