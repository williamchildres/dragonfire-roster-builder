import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve('.');

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function resolveSourceBranch() {
  const supplied = readArg('--source-branch');
  if (hasArg('--source-branch')) {
    if (!supplied || supplied.startsWith('--')) {
      fail('--source-branch requires a non-empty branch name.');
    }
    return supplied;
  }

  return git(['rev-parse', '--abbrev-ref', 'HEAD']);
}

function resolveSourceCommit() {
  const supplied = readArg('--source-commit');
  if (hasArg('--source-commit')) {
    if (!supplied || supplied.startsWith('--')) {
      fail('--source-commit requires a full 40-character commit SHA.');
    }
    if (!/^[a-f0-9]{40}$/i.test(supplied)) {
      fail(`--source-commit must be a full 40-character hexadecimal Git SHA: ${supplied}`);
    }
    try {
      git(['cat-file', '-e', `${supplied}^{commit}`]);
    } catch {
      fail(`--source-commit does not name a known commit: ${supplied}`);
    }
    return supplied;
  }

  return git(['rev-parse', 'HEAD']);
}

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

function countTests() {
  function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolutePath = join(directory, entry.name);
      return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
    });
  }

  const files = walk(resolve(root, 'src/test'))
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/.test(file));
  let testCaseCount = 0;
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    testCaseCount += (content.match(/\b(?:it|test)\s*\(/g) ?? []).length;
  }
  return {
    runner: 'vitest',
    testFileCount: files.length,
    testCaseCount,
    lastRunStatus: 'not-run-by-exporter',
    countingMethod: 'static working-tree test declaration scan; runtime pass/fail is reported by npm run test',
  };
}

const generatedAt = readArg('--generated-at') ?? new Date().toISOString();
const branch = resolveSourceBranch();
const commit = resolveSourceCommit();
const exporter = await loadExporter();
const { buildProjectContextFiles } = exporter.module;
const exportSet = buildProjectContextFiles({
  generatedAt,
  branch,
  commit,
  testTotals: countTests(),
});

rmSync(resolve(root, 'project-context'), { recursive: true, force: true });
for (const [filePath, content] of Object.entries(exportSet.files)) {
  const absolutePath = resolve(root, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
}

console.log(`Project context exported at ${generatedAt}`);
console.log(`Dragon files: ${exportSet.summary.dragonFileCount}`);
console.log(`Detailed dragons: ${exportSet.summary.detailedDragonCount}`);
console.log(`Metadata-only dragons: ${exportSet.summary.metadataOnlyDragonCount}`);
console.log(`Simple profiles: ${exportSet.summary.simpleProfileCount}`);
console.log(`Profile-audit reviews: ${exportSet.summary.profileAuditReviewCount}`);
console.log(`Project context bytes: ${exportSet.summary.totalBytes}`);
await exporter.close();
