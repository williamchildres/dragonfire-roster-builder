import { readFile } from 'node:fs/promises';

const fixture = value('--fixture');
if (process.argv.includes('--write') || process.argv.includes('--merge') || fixture) {
  throw new Error(
    'Optimizer v5 is a historical contract. Validate its committed artifact without regeneration.',
  );
}

const jsonPath = new URL('../docs/audits/roster-optimizer-v5-0.22.0.json', import.meta.url);
const markdownPath = new URL('../docs/audits/roster-optimizer-v5-0.22.0.md', import.meta.url);
const [json, markdown] = await Promise.all([
  readFile(jsonPath, 'utf8'),
  readFile(markdownPath, 'utf8'),
]);
const report = JSON.parse(json);

if (
  report.deterministicAuditHash !== 'fnv1a64:e5ac2432442f5cb0' ||
  report.contractVersion !== 5 ||
  report.executionCount !== 132 ||
  report.solverExecutions !== 132 ||
  report.candidatePoolBuilds !== 6 ||
  report.failedChecks !== 0 ||
  report.forwardReverseEqual !== true ||
  report.noDuplicateDragons !== true ||
  report.executions.some((execution) => execution.solverReused)
) {
  throw new Error('Historical optimizer-v5 audit artifact validation failed.');
}
if (!markdown.includes('fnv1a64:e5ac2432442f5cb0')) {
  throw new Error('Historical optimizer-v5 Markdown identity is missing.');
}

console.log(JSON.stringify({
  executionCount: report.executionCount,
  solverExecutions: report.solverExecutions,
  candidatePoolBuilds: report.candidatePoolBuilds,
  failedChecks: report.failedChecks,
  forwardReverseEqual: report.forwardReverseEqual,
  noDuplicateDragons: report.noDuplicateDragons,
  deterministicAuditHash: report.deterministicAuditHash,
}));

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
