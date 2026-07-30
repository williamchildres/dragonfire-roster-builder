import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = path.join(root, 'docs', 'formation-reliability-registry-audit.json');
const write = process.argv.includes('--write');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'error',
});

try {
  const module = await server.ssrLoadModule('/src/audit/formationReliabilityRegistryAudit.ts');
  const report = module.runFormationReliabilityRegistryAudit();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (write) {
    await writeFile(artifactPath, serialized, 'utf8');
    console.log(`Wrote ${path.relative(root, artifactPath)}.`);
  } else {
    const committed = await readFile(artifactPath, 'utf8');
    if (committed.replaceAll('\r\n', '\n') !== serialized) {
      throw new Error(
        'Formation Reliability registry audit artifact is stale. Run pnpm run audit:reliability-registry:write and review the diff.',
      );
    }
  }
  if (report.counts.researchParityIssues !== 0) {
    throw new Error(
      `Formation Reliability registry has ${report.counts.researchParityIssues} research parity issue(s).`,
    );
  }
  console.log(
    `Formation Reliability registry verified: ${report.counts.dragonsCovered} dragons, ${report.counts.components} components, ${report.counts.bindings} bindings.`,
  );
  console.log(`Deterministic registry hash: ${report.deterministicRegistryHash}`);
} finally {
  await server.close();
}
