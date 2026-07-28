import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'error',
});

try {
  const registry = await server.ssrLoadModule('/src/synergy/reliability/registry/index.ts');
  const validation = await server.ssrLoadModule('/src/synergy/reliability/validation.ts');
  const issues = validation.validateReliabilityContract(
    registry.formationReliabilityContractInput,
    'full-migration',
  );
  if (issues.length > 0) {
    throw new Error(
      `Formation Reliability full-migration validation failed:\n${issues
        .map((issue) => `- [${issue.code}] ${issue.path}: ${issue.message}`)
        .join('\n')}`,
    );
  }
  console.log(
    `Formation Reliability full-migration validation passed: ${registry.formationReliabilityComponents.length} components and ${registry.formationReliabilityBindings.length} bindings.`,
  );
} finally {
  await server.close();
}
