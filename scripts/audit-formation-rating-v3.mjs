import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = path.join(root, 'docs', 'formation-rating-v3-audit.json');
const write = process.argv.includes('--write');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'error',
});

try {
  const module = await server.ssrLoadModule('/src/audit/formationRatingV3Audit.ts');
  const report = module.runFormationRatingV3Audit();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (write) {
    await writeFile(artifactPath, serialized, 'utf8');
    console.log(`Wrote ${path.relative(root, artifactPath)}.`);
  } else {
    const committed = await readFile(artifactPath, 'utf8');
    if (committed !== serialized) {
      throw new Error(
        'Formation Rating v3 audit artifact is stale. Run pnpm run audit:formation-rating-v3:write and review the diff.',
      );
    }
  }
  if (report.coverage.failedChecks !== 0) {
    throw new Error(`Formation Rating v3 audit has ${report.coverage.failedChecks} failed checks.`);
  }
  if (report.sourceHashes.v3 !== module.EXPECTED_FORMATION_RATING_V3_HASH) {
    throw new Error(
      `Formation Rating v3 hash changed: ${report.sourceHashes.v3}. Review and update only for an intentional v3 contract change.`,
    );
  }
  if (report.deterministicAuditHash !== module.EXPECTED_FORMATION_RATING_V3_AUDIT_HASH) {
    throw new Error(
      `Formation Rating v3 audit hash changed: ${report.deterministicAuditHash}. Review and update only for an intentional audit change.`,
    );
  }
  console.log(
    `Formation Rating v3 verified: ${report.coverage.orderedFormations} ordered formations, ${report.coverage.unorderedTrios} trios.`,
  );
  console.log(`Formation Rating v3 hash: ${report.sourceHashes.v3}`);
  console.log(`Formation Rating v3 audit hash: ${report.deterministicAuditHash}`);
} finally {
  await server.close();
}
