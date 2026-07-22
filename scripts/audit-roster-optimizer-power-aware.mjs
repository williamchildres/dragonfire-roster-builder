import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureIndex = process.argv.indexOf('--fixture');
const fixture = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : undefined;
const allowed = new Set(['mixed', 'maxed', 'all-one']);
if (!fixture || !allowed.has(fixture)) {
  throw new Error('Use --fixture mixed, --fixture maxed, or --fixture all-one.');
}
const writeReport = process.argv.includes('--write');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

console.log(`[${fixture}] Starting forward-order Power-Aware production solve.`);
const startedAt = performance.now();
try {
  const module = await server.ssrLoadModule('/src/audit/rosterOptimizerAudit.ts');
  const report = await module.runPowerAwareRosterOptimizerAudit(fixture);
  const elapsedMs = performance.now() - startedAt;
  report.commandRuntimeMs = elapsedMs;
  const previousPath = path.join(root, 'docs', 'audits', `roster-optimizer-power-aware-0.16.0-${fixture}.json`);
  const previous = JSON.parse(await readFile(previousPath, 'utf8'));
  report.beforeV2 = summarizeResult(previous.result);
  report.comparison = compareResults(previous.result, report.result, report.estimatedPowerComparison);
  if (writeReport) {
    const base = path.join(root, 'docs', 'audits', `roster-optimizer-power-aware-0.18.0-${fixture}`);
    await mkdir(path.dirname(base), { recursive: true });
    await writeFile(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(`${base}.md`, renderMarkdown(report), 'utf8');
    console.log(`[${fixture}] Wrote ${path.relative(root, `${base}.json`)} and Markdown audit.`);
  }
  const result = report.result;
  console.log(JSON.stringify({
    fixture,
    commandRuntimeMs: elapsedMs,
    runtimeMs: result.diagnostics.totalMs,
    solverPasses: result.diagnostics.solverPasses,
    phaseTimings: result.diagnostics.phaseTimings,
    primaryDragons: result.primary.usedDragonIds,
    backupDragons: result.backup.usedDragonIds,
    unusedDragon: result.unusedDragonIds[0],
    primaryTotalEstimatedPower: result.primary.totalEstimatedPower,
    backupTotalEstimatedPower: result.backup.totalEstimatedPower,
    primaryFormationRatings: result.primary.formations.map((formation) => formation.rating),
    backupFormationRatings: result.backup.formations.map((formation) => formation.rating),
    primaryConfidenceCounts: result.primary.powerConfidenceCounts,
    backupConfidenceCounts: result.backup.powerConfidenceCounts,
    optimizerSolutionHash: result.optimizerSolutionHash,
    optimizerResultHash: result.optimizerResultHash,
    optimal: result.exactOptimality,
  }, null, 2));
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const result = report.result;
  const comparison = report.comparison;
  const wave = (label, value) => [
    `## ${label}`,
    '',
    `- Dragons: ${value.usedDragonIds.join(', ')}`,
    `- Total Estimated Power: ${value.totalEstimatedPower}`,
    `- Formation ratings: ${value.formations.map((formation) => formation.rating).join(', ')}`,
    `- Power confidence: ${JSON.stringify(value.powerConfidenceCounts)}`,
    '',
  ];
  return [
    `# Power-Aware optimizer audit · ${report.fixture}`,
    '',
    `- Audit version: ${report.auditVersion}`,
    `- Formation Rating v2 hash: \`${report.formationRatingV2Hash}\``,
    `- Command runtime: ${report.commandRuntimeMs.toFixed(1)} ms`,
    `- Solver passes: ${result.diagnostics.solverPasses}`,
    `- Phase timings: \`${JSON.stringify(result.diagnostics.phaseTimings)}\``,
    `- Unused dragon: ${result.unusedDragonIds[0]}`,
    `- Solution hash: \`${result.optimizerSolutionHash}\``,
    `- Result hash: \`${result.optimizerResultHash}\``,
    `- Optimal solver status: ${result.exactOptimality ? 'PASS' : 'FAIL'}`,
    '',
    '## Before v2 comparison',
    '',
    `- Primary added / removed: ${comparison.primaryAdded.join(', ') || 'none'} / ${comparison.primaryRemoved.join(', ') || 'none'}`,
    `- Backup added / removed: ${comparison.backupAdded.join(', ') || 'none'} / ${comparison.backupRemoved.join(', ') || 'none'}`,
    `- Unused dragon: ${comparison.unusedBefore} -> ${comparison.unusedAfter}`,
    `- Primary Power: ${comparison.primaryTotalPowerBefore} -> ${comparison.primaryTotalPowerAfter} (${signed(comparison.primaryTotalPowerDelta)})`,
    `- Backup Power: ${comparison.backupTotalPowerBefore} -> ${comparison.backupTotalPowerAfter} (${signed(comparison.backupTotalPowerDelta)})`,
    `- Solution hash: \`${comparison.solutionHashBefore}\` -> \`${comparison.solutionHashAfter}\``,
    `- Result hash: \`${comparison.resultHashBefore}\` -> \`${comparison.resultHashAfter}\``,
    '',
    '## Per-dragon Estimated Power',
    '',
    '| Dragon | Progression | v1 | v2 | Delta | Confidence |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    ...report.estimatedPowerComparison.map((row) => `| ${row.dragonId} | ${row.rarity} ${row.starRank}/${row.dragonLevel} | ${row.beforeV2.power} | ${row.afterV2.power} | ${signed(row.powerDelta)} | ${row.beforeV2.confidence} -> ${row.afterV2.confidence} |`),
    '',
    ...wave('Primary', result.primary),
    ...wave('Backup', result.backup),
  ].join('\n');
}

function summarizeResult(result) {
  return {
    primaryDragons: result.primary.usedDragonIds,
    backupDragons: result.backup.usedDragonIds,
    unusedDragon: result.unusedDragonIds[0],
    primaryTotalEstimatedPower: result.primary.totalEstimatedPower,
    backupTotalEstimatedPower: result.backup.totalEstimatedPower,
    primaryFormationRatings: result.primary.formations.map((formation) => formation.rating),
    backupFormationRatings: result.backup.formations.map((formation) => formation.rating),
    primaryConfidenceCounts: result.primary.powerConfidenceCounts,
    backupConfidenceCounts: result.backup.powerConfidenceCounts,
    optimizerSolutionHash: result.optimizerSolutionHash,
    optimizerResultHash: result.optimizerResultHash,
    runtimeMs: result.diagnostics.totalMs,
    solverPasses: result.diagnostics.solverPasses,
  };
}

function compareResults(before, after, estimates) {
  const primaryBefore = new Set(before.primary.usedDragonIds);
  const primaryAfter = new Set(after.primary.usedDragonIds);
  const backupBefore = new Set(before.backup.usedDragonIds);
  const backupAfter = new Set(after.backup.usedDragonIds);
  return {
    changedEstimateCount: estimates.filter((row) => row.powerDelta !== 0 || row.confidenceChanged).length,
    primaryAdded: [...primaryAfter].filter((dragonId) => !primaryBefore.has(dragonId)).sort(),
    primaryRemoved: [...primaryBefore].filter((dragonId) => !primaryAfter.has(dragonId)).sort(),
    backupAdded: [...backupAfter].filter((dragonId) => !backupBefore.has(dragonId)).sort(),
    backupRemoved: [...backupBefore].filter((dragonId) => !backupAfter.has(dragonId)).sort(),
    unusedBefore: before.unusedDragonIds[0],
    unusedAfter: after.unusedDragonIds[0],
    primaryTotalPowerBefore: before.primary.totalEstimatedPower,
    primaryTotalPowerAfter: after.primary.totalEstimatedPower,
    primaryTotalPowerDelta: after.primary.totalEstimatedPower - before.primary.totalEstimatedPower,
    backupTotalPowerBefore: before.backup.totalEstimatedPower,
    backupTotalPowerAfter: after.backup.totalEstimatedPower,
    backupTotalPowerDelta: after.backup.totalEstimatedPower - before.backup.totalEstimatedPower,
    primaryFormationRatingsBefore: before.primary.formations.map((formation) => formation.rating),
    primaryFormationRatingsAfter: after.primary.formations.map((formation) => formation.rating),
    backupFormationRatingsBefore: before.backup.formations.map((formation) => formation.rating),
    backupFormationRatingsAfter: after.backup.formations.map((formation) => formation.rating),
    solutionHashBefore: before.optimizerSolutionHash,
    solutionHashAfter: after.optimizerSolutionHash,
    resultHashBefore: before.optimizerResultHash,
    resultHashAfter: after.optimizerResultHash,
  };
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}
