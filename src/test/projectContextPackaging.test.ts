/// <reference types="node" />

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');
const contextRoot = join(repoRoot, 'project-context');
const zipPath = join(repoRoot, 'project-context.zip');
const exportScriptPath = join(repoRoot, 'scripts', 'export-project-context.mjs');
const validateScriptPath = join(repoRoot, 'scripts', 'validate-project-context.mjs');
const packageScriptPath = join(repoRoot, 'scripts', 'package-project-context.ps1');
const powerShellCommand = findPowerShell();

interface FileFingerprint {
  bytes: number;
  sha256: string;
}

describe('project context provenance and ZIP packaging', () => {
  (powerShellCommand ? it : it.skip)(
    'removes stale context files and restores generated files and an existing ZIP byte-for-byte',
    () =>
      withPreservedContextAndZip(() => {
        writeFileSync(zipPath, 'original zip sentinel', 'utf8');
        const snapshot = createContextAndZipSnapshot();

        try {
          const output = runPackage(['-SelfTest']);

          expect(output).toContain('Source branch:');
          expect(output).toContain('Source commit:');
          expect(output).toContain('Context files:');
          expect(output).toContain('Context bytes:');
          expect(output).toContain('ZIP bytes:');
          expect(output).toContain('ZIP entries:');
          expect(existsSync(join(contextRoot, 'formation-review-cases-stale.txt'))).toBe(false);
          expect(output).not.toMatch(/formation-review-cases|unresolved-mechanics|capability-framework|expected-interactions|formation-review-case\.schema|synergy-capability\.schema/);
        } finally {
          restoreContextAndZipSnapshot(snapshot);
        }
      }),
    130000,
  );

  (powerShellCommand ? it : it.skip)(
    'leaves project-context.zip absent when it was absent before packaging',
    () =>
      withPreservedContextAndZip(() => {
        rmSync(zipPath, { force: true });
        const snapshot = createContextAndZipSnapshot();

        try {
          runPackage(['-SelfTest']);
        } finally {
          restoreContextAndZipSnapshot(snapshot);
        }
      }),
    130000,
  );

  it('honors explicit exporter source provenance in all generated files', () =>
    withPreservedContextAndZip(() => {
      const sourceBranch = 'provenance-test-branch';
      const sourceCommit = git(['rev-parse', 'HEAD']);

      execFileSync(
        process.execPath,
        [
          exportScriptPath,
          '--generated-at',
          '2026-07-03T00:00:00.000Z',
          '--source-branch',
          sourceBranch,
          '--source-commit',
          sourceCommit,
        ],
        { cwd: repoRoot, encoding: 'utf8', timeout: 120000 },
      );
      execFileSync(process.execPath, [validateScriptPath], { cwd: repoRoot, encoding: 'utf8', timeout: 120000 });

      const markdown = readFileSync(join(contextRoot, 'PROJECT_CONTEXT.md'), 'utf8');
      const context = JSON.parse(readFileSync(join(contextRoot, 'dragonfire-project-context.json'), 'utf8')) as {
        source: { branch: string; commit: string };
      };
      const state = JSON.parse(readFileSync(join(contextRoot, 'project-state.json'), 'utf8')) as {
        source: { branch: string; commit: string };
      };

      expect(markdown).toContain(`Branch: ${sourceBranch}`);
      expect(markdown).toContain(`Commit: ${sourceCommit}`);
      expect(context.source).toMatchObject({ branch: sourceBranch, commit: sourceCommit });
      expect(state.source).toMatchObject({ branch: sourceBranch, commit: sourceCommit });
    }));

  it('rejects invalid explicit exporter source commits before generation', () =>
    withPreservedContextAndZip(() => {
      const head = git(['rev-parse', 'HEAD']);

      expectExportFailure(['--source-branch', 'test', '--source-commit', head.slice(0, 7)], /full 40-character/i);
      expectExportFailure(['--source-branch', 'test', '--source-commit', 'not-a-sha'], /full 40-character/i);
      expectExportFailure(
        ['--source-branch', 'test', '--source-commit', '0000000000000000000000000000000000000000'],
        /does not name a known commit/i,
      );
    }));

  it('defaults exporter source provenance to the current branch and HEAD', () =>
    withPreservedContextAndZip(() => {
      const sourceBranch = git(['branch', '--show-current']);
      const sourceCommit = git(['rev-parse', 'HEAD']);

      execFileSync(process.execPath, [exportScriptPath, '--generated-at', '2026-07-03T00:00:00.000Z'], {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 120000,
      });

      const context = JSON.parse(readFileSync(join(contextRoot, 'dragonfire-project-context.json'), 'utf8')) as {
        source: { branch: string; commit: string };
      };

      expect(context.source).toMatchObject({ branch: sourceBranch, commit: sourceCommit });
    }));

  (powerShellCommand ? it : it.skip)('clean-source guard accepts only clean source plus generated artifacts', () => {
    withTemporaryGitRepo((repositoryRoot) => {
      runGuard(repositoryRoot);

      writeFileSync(join(repositoryRoot, 'project-context', 'stale.json'), '{}\n', 'utf8');
      writeFileSync(join(repositoryRoot, 'project-context.zip'), 'zip is ignored by guard', 'utf8');
      runGuard(repositoryRoot);
    });
  });

  (powerShellCommand ? it : it.skip)('clean-source guard rejects modified tracked source files', () => {
    withTemporaryGitRepo((repositoryRoot) => {
      writeFileSync(join(repositoryRoot, 'src.txt'), 'modified\n', 'utf8');
      const result = runGuard(repositoryRoot, false);
      const output = processOutput(result);

      expect(result.status).not.toBe(0);
      expect(output).toContain('src.txt');
      expect(output).toContain('Commit or discard source changes before packaging project context');
    });
  });

  (powerShellCommand ? it : it.skip)('clean-source guard rejects staged source files', () => {
    withTemporaryGitRepo((repositoryRoot) => {
      writeFileSync(join(repositoryRoot, 'src.txt'), 'staged\n', 'utf8');
      execFileSync('git', ['add', 'src.txt'], { cwd: repositoryRoot });
      const result = runGuard(repositoryRoot, false);
      const output = processOutput(result);

      expect(result.status).not.toBe(0);
      expect(output).toContain('src.txt');
      expect(output).toContain('staged');
    });
  });

  (powerShellCommand ? it : it.skip)('clean-source guard rejects untracked source files', () => {
    withTemporaryGitRepo((repositoryRoot) => {
      writeFileSync(join(repositoryRoot, 'new-source.txt'), 'untracked\n', 'utf8');
      const result = runGuard(repositoryRoot, false);
      const output = processOutput(result);

      expect(result.status).not.toBe(0);
      expect(output).toContain('new-source.txt');
      expect(output).toContain('untracked');
    });
  });
});

function withPreservedContextAndZip(run: () => void): void {
  const backupRoot = mkdtempSync(join(tmpdir(), 'dragonfire-context-backup-'));
  const backupContext = join(backupRoot, 'project-context');
  const backupZip = join(backupRoot, 'project-context.zip');
  const beforeContext = fingerprintTree(contextRoot);
  const beforeZip = fingerprintOptionalFile(zipPath);
  let thrown: unknown;

  if (existsSync(contextRoot)) {
    cpSync(contextRoot, backupContext, { recursive: true });
  }
  if (existsSync(zipPath)) {
    cpSync(zipPath, backupZip);
  }

  try {
    run();
  } catch (error) {
    thrown = error;
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
    if (existsSync(backupContext)) {
      cpSync(backupContext, contextRoot, { recursive: true });
    }

    rmSync(zipPath, { force: true });
    if (existsSync(backupZip)) {
      cpSync(backupZip, zipPath);
    }

    rmSync(backupRoot, { recursive: true, force: true });

    expect(fingerprintTree(contextRoot)).toEqual(beforeContext);
    expect(fingerprintOptionalFile(zipPath)).toEqual(beforeZip);
  }

  if (thrown) {
    if (thrown instanceof Error) {
      throw thrown;
    }
    throw new Error(typeof thrown === 'string' ? thrown : JSON.stringify(thrown));
  }
}

interface ContextAndZipSnapshot {
  backupRoot: string;
  backupContext: string;
  backupZip: string;
  context: Record<string, FileFingerprint>;
  zip: FileFingerprint | null;
}

function createContextAndZipSnapshot(): ContextAndZipSnapshot {
  const backupRoot = mkdtempSync(join(tmpdir(), 'dragonfire-context-inner-backup-'));
  const backupContext = join(backupRoot, 'project-context');
  const backupZip = join(backupRoot, 'project-context.zip');

  if (existsSync(contextRoot)) {
    cpSync(contextRoot, backupContext, { recursive: true });
  }
  if (existsSync(zipPath)) {
    cpSync(zipPath, backupZip);
  }

  return {
    backupRoot,
    backupContext,
    backupZip,
    context: fingerprintTree(contextRoot),
    zip: fingerprintOptionalFile(zipPath),
  };
}

function restoreContextAndZipSnapshot(snapshot: ContextAndZipSnapshot): void {
  rmSync(contextRoot, { recursive: true, force: true });
  if (existsSync(snapshot.backupContext)) {
    cpSync(snapshot.backupContext, contextRoot, { recursive: true });
  }

  rmSync(zipPath, { force: true });
  if (existsSync(snapshot.backupZip)) {
    cpSync(snapshot.backupZip, zipPath);
  }

  expect(fingerprintTree(contextRoot)).toEqual(snapshot.context);
  expect(fingerprintOptionalFile(zipPath)).toEqual(snapshot.zip);
  rmSync(snapshot.backupRoot, { recursive: true, force: true });
}

function fingerprintTree(root: string): Record<string, FileFingerprint> {
  const files: Record<string, FileFingerprint> = {};
  for (const file of collectFiles(root)) {
    files[relative(root, file).replaceAll('\\', '/')] = fingerprintFile(file);
  }
  return files;
}

function fingerprintOptionalFile(path: string): FileFingerprint | null {
  return existsSync(path) ? fingerprintFile(path) : null;
}

function fingerprintFile(path: string): FileFingerprint {
  const content = readFileSync(path);
  return {
    bytes: statSync(path).size,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

function collectFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function runPackage(args: string[]): string {
  return execFileSync(
    powerShellCommand!,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', packageScriptPath, '-NodePath', process.execPath, ...args],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 120000,
    },
  );
}

function runGuard(repositoryRoot: string, expectSuccess = true): ReturnType<typeof spawnSync> {
  const result = spawnSync(
    powerShellCommand!,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', packageScriptPath, '-RepositoryRoot', repositoryRoot, '-GuardOnly'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (expectSuccess) {
    expect(result.status, processOutput(result)).toBe(0);
    expect(result.stdout).toContain('Clean-source guard: passed');
  }
  return result;
}

function processOutput(result: ReturnType<typeof spawnSync>): string {
  return `${String(result.stderr ?? '')}${String(result.stdout ?? '')}`;
}

function expectExportFailure(args: string[], pattern: RegExp): void {
  const result = spawnSync(process.execPath, [exportScriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr + result.stdout).toMatch(pattern);
}

function withTemporaryGitRepo(run: (repositoryRoot: string) => void): void {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'dragonfire-guard-repo-'));
  try {
    mkdirSync(join(repositoryRoot, 'project-context'), { recursive: true });
    writeFileSync(join(repositoryRoot, 'src.txt'), 'clean\n', 'utf8');
    execFileSync('git', ['init'], { cwd: repositoryRoot });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repositoryRoot });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repositoryRoot });
    execFileSync('git', ['add', '.'], { cwd: repositoryRoot });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: repositoryRoot });

    run(repositoryRoot);
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function findPowerShell(): string | null {
  for (const command of ['powershell', 'pwsh']) {
    const result = spawnSync(command, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
      encoding: 'utf8',
    });
    if (result.status === 0) {
      return command;
    }
  }

  return null;
}
