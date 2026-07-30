import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface AuditExecution {
  fixture: string;
  mode: 'strongest-first' | 'balanced';
  count: number;
  inputOrder: 'forward' | 'reverse';
  solverReused: boolean;
  solutionHash: string;
  resultHash: string;
  noDuplicateDragons: boolean;
  exactReconstruction: boolean;
}

interface AuditReport {
  executionCount: number;
  candidatePoolBuilds: number;
  solverExecutions: number;
  candidatePoolsIndependent: boolean;
  allSolversIndependent: boolean;
  forwardReverseEqual: boolean;
  noDuplicateDragons: boolean;
  failedChecks: number;
  deterministicAuditHash: string;
  executions: AuditExecution[];
}

describe('optimizer v5 independent audit artifact', () => {
  it('records the complete independently solved forward/reverse matrix', () => {
    const report = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'docs/audits/roster-optimizer-v5-0.22.0.json',
    ), 'utf8')) as AuditReport;

    expect(report.executionCount).toBe(132);
    expect(report.solverExecutions).toBe(132);
    expect(report.candidatePoolBuilds).toBe(6);
    expect(report.candidatePoolsIndependent).toBe(true);
    expect(report.allSolversIndependent).toBe(true);
    expect(report.executions).toHaveLength(132);
    expect(report.executions.every((execution) => execution.solverReused === false)).toBe(true);
    expect(report.executions.every((execution) => execution.noDuplicateDragons)).toBe(true);
    expect(report.executions.every((execution) => execution.exactReconstruction)).toBe(true);
    expect(report.forwardReverseEqual).toBe(true);
    expect(report.noDuplicateDragons).toBe(true);
    expect(report.failedChecks).toBe(0);

    const pairs = new Map<string, AuditExecution[]>();
    for (const execution of report.executions) {
      const key = `${execution.fixture}/${execution.mode}/${execution.count}`;
      pairs.set(key, [...(pairs.get(key) ?? []), execution]);
    }
    expect(pairs.size).toBe(66);
    for (const pair of pairs.values()) {
      expect(pair).toHaveLength(2);
      const forward = pair.find((execution) => execution.inputOrder === 'forward');
      const reverse = pair.find((execution) => execution.inputOrder === 'reverse');
      expect(forward).toBeDefined();
      expect(reverse).toBeDefined();
      expect(reverse?.solutionHash).toBe(forward?.solutionHash);
      expect(reverse?.resultHash).toBe(forward?.resultHash);
    }

    expect(report.deterministicAuditHash).toBe('fnv1a64:e5ac2432442f5cb0');
  });
});
