import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const write = process.argv.includes('--write');
const merge = process.argv.includes('--merge');
const fixture = value('--fixture');
const jsonPath = new URL('../docs/audits/roster-optimizer-v6-0.22.1.json', import.meta.url);
const markdownPath = new URL('../docs/audits/roster-optimizer-v6-0.22.1.md', import.meta.url);
const scratchDirectory = new URL('../Scratch/', import.meta.url);
const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const audit = await server.ssrLoadModule('/src/audit/rosterOptimizerV6Audit.ts');
  const report = merge
    ? audit.combineRosterOptimizerV6AuditReports(await Promise.all(
        ['mixed', 'maxed', 'all-one'].map(async (id) =>
          JSON.parse(await readFile(
            new URL(`optimizer-v6-audit-${id}.json`, scratchDirectory),
            'utf8',
          )),
        ),
      ))
    : await audit.runRosterOptimizerV6Audit((message) => {
        process.stdout.write(`[optimizer-v6-audit] ${message}\n`);
      }, fixture ? [fixture] : undefined);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  if (write && fixture && !merge) {
    await mkdir(scratchDirectory, { recursive: true });
    await writeFile(new URL(`optimizer-v6-audit-${fixture}.json`, scratchDirectory), json);
  } else if (write) {
    await writeFile(jsonPath, json);
    await writeFile(markdownPath, markdown);
  } else if (fixture) {
    const expected = JSON.parse(await readFile(jsonPath, 'utf8'));
    const expectedExecutions = expected.executions.filter(
      (execution) => execution.fixture === fixture,
    );
    if (
      report.executionCount !== 66 ||
      report.solverExecutions !== 66 ||
      report.candidatePoolBuilds !== 2 ||
      JSON.stringify(report.executions.map(semanticExecution)) !==
        JSON.stringify(expectedExecutions.map(semanticExecution))
    ) {
      throw new Error(`Optimizer v6 read-only ${fixture} audit changed.`);
    }
  } else {
    const [expectedJson, expectedMarkdown] = await Promise.all([
      readFile(jsonPath, 'utf8'),
      readFile(markdownPath, 'utf8'),
    ]);
    const expected = JSON.parse(expectedJson);
    if (expected.deterministicAuditHash !== report.deterministicAuditHash) {
      throw new Error(
        `Optimizer v6 audit hash changed: ` +
        `${expected.deterministicAuditHash} -> ${report.deterministicAuditHash}.`,
      );
    }
    if (stripOperational(expectedMarkdown) !== stripOperational(markdown)) {
      throw new Error('Optimizer v6 Markdown semantic summary changed.');
    }
  }
  console.log(JSON.stringify({
    executionCount: report.executionCount,
    solverExecutions: report.solverExecutions,
    candidatePoolBuilds: report.candidatePoolBuilds,
    failedChecks: report.failedChecks,
    forwardReverseEqual: report.forwardReverseEqual,
    noDuplicateDragons: report.noDuplicateDragons,
    historicalV5Compatible: report.historicalV5Compatible,
    deterministicAuditHash: report.deterministicAuditHash,
  }));
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const unique = report.executions.filter((execution) => execution.inputOrder === 'forward');
  const maximum = (field) => Math.max(...unique.map((execution) => execution.telemetry[field]));
  return `# Optimizer v6 audit — 0.22.1

- Generated: ${report.generatedAt}
- Contract: 6 / formation-rating-v3 / best-overall-v1
- Execution records: ${report.executionCount}
- Independent candidate-pool builds: ${report.candidatePoolBuilds}
- Independent exact solver executions: ${report.solverExecutions}
- Every solver execution independent: ${report.allSolversIndependent}
- Forward/reverse equality: ${report.forwardReverseEqual}
- No duplicate dragons: ${report.noDuplicateDragons}
- Exact reconstruction: ${report.exactReconstruction}
- Historical optimizer-v5 selections preserved: ${report.historicalV5Compatible}
- Failed checks: ${report.failedChecks}
- Deterministic audit hash: \`${report.deterministicAuditHash}\`

## Maximum Node telemetry

- Candidate generation: ${maximum('candidateGenerationMs')} ms
- Solver: ${maximum('solverMs')} ms
- Total: ${maximum('totalMs')} ms
- Solver passes: ${maximum('solverPasses')}
- Exact-search nodes: ${maximum('exactSearchNodes')}
- Model builds: ${maximum('modelBuilds')}
- Variables: ${maximum('maximumVariables')}
- Constraints: ${maximum('maximumConstraints')}
- Skipped phases: ${maximum('skippedPhases')}
- Certification passes: ${maximum('certificationPasses')}

## Semantic hashes

| Fixture | Mode | Count | Solution | Result |
|---|---|---:|---|---|
${unique.map((execution) =>
    `| ${execution.fixture} | ${execution.mode} | ${execution.count} | ` +
    `\`${execution.solutionHash}\` | \`${execution.resultHash}\` |`,
  ).join('\n')}

The historical optimizer-v5 artifact remains unchanged at \`fnv1a64:e5ac2432442f5cb0\`.
Operational telemetry and generation time are excluded from this deterministic audit identity.
`;
}

function stripOperational(markdown) {
  return markdown
    .replace(/^- Generated: .*$/m, '- Generated: <ignored>')
    .replace(/^- Candidate generation: .*$/m, '- Candidate generation: <operational>')
    .replace(/^- Solver: .*$/m, '- Solver: <operational>')
    .replace(/^- Total: .*$/m, '- Total: <operational>')
    .replace(/^- Solver passes: .*$/m, '- Solver passes: <operational>')
    .replace(/^- Exact-search nodes: .*$/m, '- Exact-search nodes: <operational>')
    .replace(/^- Model builds: .*$/m, '- Model builds: <operational>')
    .replace(/^- Variables: .*$/m, '- Variables: <operational>')
    .replace(/^- Constraints: .*$/m, '- Constraints: <operational>')
    .replace(/^- Skipped phases: .*$/m, '- Skipped phases: <operational>')
    .replace(/^- Certification passes: .*$/m, '- Certification passes: <operational>');
}

function semanticExecution(execution) {
  const { telemetry, ...semantic } = execution;
  void telemetry;
  return semantic;
}

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
