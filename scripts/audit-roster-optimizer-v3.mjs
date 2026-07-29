import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = path.join(
  root,
  'docs',
  'audits',
  'roster-optimizer-v3-adoption.json',
);
const write = process.argv.includes('--write');
const fixedPointOnly = process.argv.includes('--fixed-point-only');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const module = await server.ssrLoadModule('/src/audit/rosterOptimizerV3Audit.ts');
  if (fixedPointOnly) {
    const fixedPointAudit = module.runOptimizerV3FixedPointAudit();
    console.log(JSON.stringify({
      failedChecks: fixedPointAudit.failedChecks,
      report: fixedPointAudit.report,
    }, null, 2));
    process.exitCode = fixedPointAudit.failedChecks.length > 0 ? 1 : 0;
  } else {
  const report = await module.runRosterOptimizerV3Audit();
  if (report.failedChecks.length > 0) {
    throw new Error(
      `Formation Rating v3 optimizer audit failed: ${report.failedChecks.join(', ')}`,
    );
  }
  if (report.matrix.executionCount !== report.matrix.expectedExecutionCount) {
    throw new Error(
      `Expected ${report.matrix.expectedExecutionCount} executions; received ${report.matrix.executionCount}.`,
    );
  }
  if (write) {
    await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(root, artifactPath)}.`);
  } else {
    const committed = JSON.parse(await readFile(artifactPath, 'utf8'));
    if (
      JSON.stringify(withoutRuntime(committed)) !==
      JSON.stringify(withoutRuntime(report))
    ) {
      throw new Error(
        'Formation Rating v3 optimizer audit artifact is stale. Run pnpm run audit:optimizer:v3:write and review the semantic diff.',
      );
    }
  }
  console.log(
    `Optimizer v3 verified: ${report.matrix.executionCount} executions, ${report.failedChecks.length} failed checks.`,
  );
  console.log(`Fixed-point scale: ${report.contracts.relationshipFixedPointScale}`);
  console.log(`Audit hash: ${report.deterministicAuditHash}`);
  }
} finally {
  await server.close();
}

function withoutRuntime(report) {
  const copy = structuredClone(report);
  delete copy.runtimeTelemetry;
  copy.executions.forEach((execution) => delete execution.runtimeTelemetry);
  return copy;
}
