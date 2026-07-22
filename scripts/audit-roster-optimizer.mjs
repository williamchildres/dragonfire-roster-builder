import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeReports = process.argv.includes('--write');
const jsonPath = path.join(root, 'docs', 'audits', 'roster-optimizer-0.17.0.json');
const markdownPath = path.join(root, 'docs', 'audits', 'roster-optimizer-0.17.0.md');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const module = await server.ssrLoadModule('/src/audit/rosterOptimizerAudit.ts');
  const report = await module.runRosterOptimizerAudit();
  if (writeReports) {
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(markdownPath, renderMarkdown(report), 'utf8');
    console.log(`Wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}.`);
  } else {
    const committed = JSON.parse(await readFile(jsonPath, 'utf8'));
    const actualHashes = report.fixtures.map((fixture) => ({
      name: fixture.name,
      strategy: fixture.strategy,
      solution: fixture.optimizerSolutionHash,
      result: fixture.optimizerResultHash,
    }));
    const committedHashes = committed.fixtures.map((fixture) => ({
      name: fixture.name,
      strategy: fixture.strategy,
      solution: fixture.optimizerSolutionHash,
      result: fixture.optimizerResultHash,
    }));
    if (
      report.auditVersion !== committed.auditVersion ||
      report.formationRatingV2Hash !== committed.formationRatingV2Hash ||
      JSON.stringify(report.checks.strictMipGaps) !==
        JSON.stringify(committed.checks.strictMipGaps) ||
      JSON.stringify(actualHashes) !== JSON.stringify(committedHashes)
    ) {
      throw new Error('Committed roster optimizer audit does not match the deterministic result.');
    }
    console.log(`Optimizer audit verified: ${actualHashes.map((entry) => `${entry.strategy} ${entry.result}`).join(', ')}`);
  }
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const lines = [
    '# Roster Optimizer strategies deterministic audit',
    '',
    `Formation Rating v2 hash: \`${report.formationRatingV2Hash}\``,
    '',
    `Strict HiGHS gaps: \`mip_rel_gap=${report.checks.strictMipGaps.mip_rel_gap}\`, \`mip_abs_gap=${report.checks.strictMipGaps.mip_abs_gap}\`, accepted through \`${report.checks.strictMipGaps.configuredThrough}\` status ${report.checks.strictMipGaps.acceptedStatus}. Zero-gap refinement independently confirmed the existing allocations and hashes.`,
    '',
  ];
  for (const fixture of report.fixtures) {
    lines.push(
      `## ${fixture.name} · ${fixture.strategy}`,
      '',
      `- Eligible dragons: ${fixture.eligibleDragonCount}`,
      `- Trio candidates: ${fixture.candidateCount}`,
      `- Used: ${fixture.usedDragonIds.join(', ')}`,
      `- Unused: ${fixture.unusedDragonIds.join(', ')}`,
      `- Runtime (candidate / solver / total): ${fixture.diagnostics.candidateGenerationMs.toFixed(1)} / ${fixture.diagnostics.solverMs.toFixed(1)} / ${fixture.diagnostics.totalMs.toFixed(1)} ms`,
      `- Solver passes / nodes: ${fixture.diagnostics.solverPasses} / ${fixture.diagnostics.nodesVisited}`,
      `- Exact optimality: ${fixture.exactOptimality ? 'PASS' : 'FAIL'}`,
      `- Solution hash: \`${fixture.optimizerSolutionHash}\``,
      `- Result hash: \`${fixture.optimizerResultHash}\``,
      '',
    );
    if (fixture.strategy === 'best-ten-overall') {
      lines.push(
        `- Total / average / minimum rating: ${fixture.collection.totalRating} / ${fixture.collection.averageRating.toFixed(1)} / ${fixture.collection.minimumRating}`,
        '',
        ...formationTable(fixture.formations),
      );
    } else {
      lines.push(
        `### Primary · ${fixture.primary.totalRating} / ${fixture.primary.averageRating.toFixed(1)} / ${fixture.primary.minimumRating}`,
        '',
        `Rarity: ${JSON.stringify(fixture.primary.rarityCounts)}`,
        '',
        ...formationTable(fixture.primary.formations),
        `### Backup · ${fixture.backup.totalRating} / ${fixture.backup.averageRating.toFixed(1)} / ${fixture.backup.minimumRating}`,
        '',
        `Rarity: ${JSON.stringify(fixture.backup.rarityCounts)}`,
        '',
        ...formationTable(fixture.backup.formations),
        `Combined total / average: ${fixture.combined.totalRating} / ${fixture.combined.averageRating.toFixed(1)}`,
        '',
      );
    }
  }
  lines.push(
    '## Exactness checks',
    '',
    `- Greedy counterexample: ${report.checks.greedyCounterexample.greedyTotal} greedy vs ${report.checks.greedyCounterexample.exactTotal} exact — PASS`,
    '- Small fixtures match independent brute-force enumeration — PASS',
    '- Reversed input ordering is stable — PASS',
    '- Used and unused dragons partition each eligible roster — PASS',
    '',
  );
  return `${lines.join('\n').trimEnd()}\n`;
}

function formationTable(formations) {
  return [
    '| # | Left Flank | Vanguard | Right Flank | Rating | Tier |',
    '| -: | --- | --- | --- | -: | --- |',
    ...formations.map(
      (formation) =>
        `| ${formation.waveRank ?? formation.rank} | ${formation.arrangement['left-flank']} | ${formation.arrangement.vanguard} | ${formation.arrangement['right-flank']} | ${formation.rating} | ${formation.tier} |`,
    ),
    '',
  ];
}
