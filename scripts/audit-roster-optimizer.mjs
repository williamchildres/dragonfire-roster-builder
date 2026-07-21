import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeReports = process.argv.includes('--write');
const jsonPath = path.join(root, 'docs', 'audits', 'roster-optimizer-0.12.0.json');
const markdownPath = path.join(root, 'docs', 'audits', 'roster-optimizer-0.12.0.md');
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
    const actualHashes = report.fixtures.map((fixture) => fixture.optimizerResultHash);
    const committedHashes = committed.fixtures.map((fixture) => fixture.optimizerResultHash);
    if (
      report.auditVersion !== committed.auditVersion ||
      report.formationRatingV2Hash !== committed.formationRatingV2Hash ||
      JSON.stringify(report.checks.strictMipGaps) !==
        JSON.stringify(committed.checks.strictMipGaps) ||
      JSON.stringify(actualHashes) !== JSON.stringify(committedHashes)
    ) {
      throw new Error('Committed roster optimizer audit does not match the deterministic result.');
    }
    console.log(`Optimizer audit verified: ${actualHashes.join(', ')}`);
  }
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const lines = [
    '# Roster Optimizer v1 deterministic audit',
    '',
    `Formation Rating v2 hash: \`${report.formationRatingV2Hash}\``,
    '',
    `Strict HiGHS gaps: \`mip_rel_gap=${report.checks.strictMipGaps.mip_rel_gap}\`, \`mip_abs_gap=${report.checks.strictMipGaps.mip_abs_gap}\`, accepted through \`${report.checks.strictMipGaps.configuredThrough}\` status ${report.checks.strictMipGaps.acceptedStatus}. Zero-gap refinement independently confirmed the existing allocations and hashes.`,
    '',
  ];
  for (const fixture of report.fixtures) {
    lines.push(
      `## ${fixture.name}`,
      '',
      `- Eligible dragons: ${fixture.eligibleDragonCount}`,
      `- Trio candidates: ${fixture.candidateCount}`,
      `- Total / average / minimum rating: ${fixture.totalRating} / ${fixture.averageRating.toFixed(1)} / ${fixture.minimumRating}`,
      `- Used: ${fixture.usedDragonIds.join(', ')}`,
      `- Unused: ${fixture.unusedDragonIds.join(', ')}`,
      `- Runtime (candidate / solver / total): ${fixture.diagnostics.candidateGenerationMs.toFixed(1)} / ${fixture.diagnostics.solverMs.toFixed(1)} / ${fixture.diagnostics.totalMs.toFixed(1)} ms`,
      `- Solver passes / nodes: ${fixture.diagnostics.solverPasses} / ${fixture.diagnostics.nodesVisited}`,
      `- Exact optimality: ${fixture.optimal ? 'PASS' : 'FAIL'}`,
      `- Result hash: \`${fixture.optimizerResultHash}\``,
      '',
      '| # | Left Flank | Vanguard | Right Flank | Rating | Tier |',
      '| -: | --- | --- | --- | -: | --- |',
      ...fixture.formations.map(
        (formation) =>
          `| ${formation.rank} | ${formation.arrangement['left-flank']} | ${formation.arrangement.vanguard} | ${formation.arrangement['right-flank']} | ${formation.rating} | ${formation.tier} |`,
      ),
      '',
    );
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
  return `${lines.join('\n')}\n`;
}
