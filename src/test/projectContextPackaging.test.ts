/// <reference types="node" />

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');
const scriptPath = join(repoRoot, 'scripts', 'package-project-context.ps1');
const powerShellCommand = findPowerShell();

describe('project context ZIP packaging', () => {
  (powerShellCommand ? it : it.skip)(
    'removes stale context files and packages only the freshly generated tree',
    () => {
      const output = execFileSync(
        powerShellCommand!,
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-SelfTest', '-NodePath', process.execPath],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          timeout: 120000,
        },
      );

      expect(output).toContain('ZIP path:');
      expect(output).toContain('ZIP bytes:');
      expect(output).toContain('ZIP entries:');
      expect(existsSync(join(repoRoot, 'project-context', 'formation-review-cases-stale.txt'))).toBe(false);
      expect(output).not.toMatch(/formation-review-cases|unresolved-mechanics|capability-framework|expected-interactions|formation-review-case\.schema|synergy-capability\.schema/);
    },
    130000,
  );
});

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
