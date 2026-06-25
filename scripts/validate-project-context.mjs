import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { createServer } from 'vite';

const root = resolve('.');
const contextRoot = resolve(root, 'project-context');

async function loadExporter() {
  const server = await createServer({
    configFile: resolve(root, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    return {
      module: await server.ssrLoadModule('/src/services/projectContextExport.ts'),
      close: () => server.close(),
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}

function readFiles(directory) {
  const files = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, readFiles(absolutePath));
    } else {
      const normalized = relative(root, absolutePath).replaceAll('\\', '/');
      files[normalized] = readFileSync(absolutePath, 'utf8');
    }
  }
  return files;
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

if (!existsSync(contextRoot)) {
  console.error('project-context directory is missing. Run npm run export:context first.');
  process.exit(1);
}

const files = readFiles(contextRoot);
const consolidated = JSON.parse(files['project-context/dragonfire-project-context.json']);
const exporter = await loadExporter();
const { validateProjectContextFiles } = exporter.module;
const result = validateProjectContextFiles(files, {
  generatedAt: consolidated.generatedAt,
  branch: consolidated.source?.branch ?? git(['rev-parse', '--abbrev-ref', 'HEAD']),
  commit: consolidated.source?.commit ?? git(['rev-parse', 'HEAD']),
  testTotals: JSON.parse(files['project-context/project-state.json']).testTotals,
});

for (const warning of result.warnings) {
  console.warn(`Warning: ${warning}`);
}
for (const error of result.errors) {
  console.error(`Error: ${error}`);
}

console.log(`Schema-validated files: ${result.summary.schemaValidatedFiles}`);
console.log(`Dragon files: ${result.summary.dragonFileCount}`);
console.log(`Formation review cases: ${result.summary.formationReviewCaseCount}`);
console.log(`Unresolved mechanics: ${result.summary.unresolvedMechanicsCount}`);
console.log(`Validation: ${result.passed ? 'passed' : 'failed'}`);

if (!result.passed) {
  await exporter.close();
  process.exit(1);
}

await exporter.close();
