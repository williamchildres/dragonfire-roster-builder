import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'docs', 'formation-reliability-audit.json');
const writeReport = process.argv.includes('--write');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const module = await server.ssrLoadModule('/src/audit/formationReliabilityAudit.ts');
  const report = module.runFormationReliabilityAudit();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;

  if (writeReport) {
    await writeFile(reportPath, serialized, 'utf8');
    console.log(`Wrote ${path.relative(root, reportPath)}.`);
  } else {
    const committed = await readFile(reportPath, 'utf8');
    if (committed !== serialized) {
      throw new Error(
        'Committed Formation Reliability audit is stale. Run pnpm run audit:reliability:write and review the diff.',
      );
    }
    console.log(
      `Formation Reliability audit verified: ${report.totals.dragons} dragons, ` +
        `${report.totals.scoringSignals} scoring signals, ` +
        `${report.totals.chanceBearingSignals} chance-bearing signals, ` +
        `${report.totals.mixedSignals} mixed signals.`,
    );
    console.log(`Deterministic audit hash: ${report.deterministicHash}`);
  }
} finally {
  await server.close();
}
