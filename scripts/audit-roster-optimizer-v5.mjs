import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const write = process.argv.includes('--write');
const merge = process.argv.includes('--merge');
const fixture = value('--fixture');
const jsonPath = new URL('../docs/audits/roster-optimizer-v5-0.22.0.json', import.meta.url);
const markdownPath = new URL('../docs/audits/roster-optimizer-v5-0.22.0.md', import.meta.url);
const scratchDirectory = new URL('../Scratch/', import.meta.url);
const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const audit = await server.ssrLoadModule('/src/audit/rosterOptimizerV5Audit.ts');
  const report = merge
    ? audit.combineRosterOptimizerV5AuditReports(await Promise.all(
        ['mixed', 'maxed', 'all-one'].map(async (id) =>
          JSON.parse(await readFile(new URL(`optimizer-v5-audit-${id}.json`, scratchDirectory), 'utf8')),
        ),
      ))
    : await audit.runRosterOptimizerV5Audit((message) => {
        process.stdout.write(`[optimizer-v5-audit] ${message}\n`);
      }, fixture ? [fixture] : undefined);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  if (write && fixture && !merge) {
    await mkdir(scratchDirectory, { recursive: true });
    await writeFile(new URL(`optimizer-v5-audit-${fixture}.json`, scratchDirectory), json);
  } else if (write) {
    await writeFile(jsonPath, json);
    await writeFile(markdownPath, markdown);
  } else {
    const [expectedJson, expectedMarkdown] = await Promise.all([
      readFile(jsonPath, 'utf8'),
      readFile(markdownPath, 'utf8'),
    ]);
    const expected = JSON.parse(expectedJson);
    if (expected.deterministicAuditHash !== report.deterministicAuditHash) {
      throw new Error(
        `Optimizer v5 audit hash changed: ${expected.deterministicAuditHash} -> ${report.deterministicAuditHash}.`,
      );
    }
    if (stripGeneratedAt(expectedMarkdown) !== stripGeneratedAt(markdown)) {
      throw new Error('Optimizer v5 Markdown semantic summary changed.');
    }
  }
  console.log(JSON.stringify({
    executionCount: report.executionCount,
    failedChecks: report.failedChecks,
    forwardReverseEqual: report.forwardReverseEqual,
    noDuplicateDragons: report.noDuplicateDragons,
    deterministicAuditHash: report.deterministicAuditHash,
  }));
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const unique = report.executions.filter((execution) => execution.inputOrder === 'forward');
  const maximum = (field) => Math.max(...unique.map((execution) => execution.telemetry[field]));
  return `# Optimizer v5 audit — 0.22.0

- Generated: ${report.generatedAt}
- Contract: 5 / formation-rating-v3
- Executions: ${report.executionCount}
- Independent candidate-pool builds: ${report.candidatePoolBuilds}
- Independent exact solver executions: ${report.solverExecutions}
- Every solver execution independent: ${report.allSolversIndependent}
- Forward/reverse equality: ${report.forwardReverseEqual}
- No duplicate dragons: ${report.noDuplicateDragons}
- Failed checks: ${report.failedChecks}
- Deterministic audit hash: \`${report.deterministicAuditHash}\`

## Maximum Node telemetry

- Candidate generation: ${maximum('candidateGenerationMs')} ms
- Solver: ${maximum('solverMs')} ms
- Total: ${maximum('totalMs')} ms
- Solver passes: ${maximum('solverPasses')}
- Exact-search nodes: ${maximum('exactSearchNodes')}
- Variables: ${maximum('maximumVariables')}
- Constraints: ${maximum('maximumConstraints')}

## Semantic hashes

| Fixture | Mode | Count | Solution | Result |
|---|---|---:|---|---|
${unique.map((execution) =>
    `| ${execution.fixture} | ${execution.mode} | ${execution.count} | \`${execution.solutionHash}\` | \`${execution.resultHash}\` |`,
  ).join('\n')}

Historical v0.21 audit artifacts are preserved unchanged. Operational telemetry and generation time are excluded from the deterministic audit hash.
`;
}

function stripGeneratedAt(markdown) {
  return markdown
    .replace(/^- Generated: .*$/m, '- Generated: <ignored>')
    .replace(/^- Candidate generation: .*$/m, '- Candidate generation: <operational>')
    .replace(/^- Solver: .*$/m, '- Solver: <operational>')
    .replace(/^- Total: .*$/m, '- Total: <operational>')
    .replace(/^- Solver passes: .*$/m, '- Solver passes: <operational>')
    .replace(/^- Exact-search nodes: .*$/m, '- Exact-search nodes: <operational>')
    .replace(/^- Variables: .*$/m, '- Variables: <operational>')
    .replace(/^- Constraints: .*$/m, '- Constraints: <operational>');
}

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
