import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface AuditExecution {
  fixture: string;
  mode: 'best-overall-first' | 'strongest-first' | 'balanced';
  count: number;
  inputOrder: 'forward' | 'reverse';
  solverReused: boolean;
  bestOverallScoreUnits: number[];
  solutionHash: string;
  resultHash: string;
  noDuplicateDragons: boolean;
  exactReconstruction: boolean;
  historicalV5Compatible: boolean;
}

interface AuditReport {
  executionCount: number;
  candidatePoolBuilds: number;
  solverExecutions: number;
  candidatePoolsIndependent: boolean;
  allSolversIndependent: boolean;
  forwardReverseEqual: boolean;
  noDuplicateDragons: boolean;
  exactReconstruction: boolean;
  historicalV5Compatible: boolean;
  failedChecks: number;
  deterministicAuditHash: string;
  executions: AuditExecution[];
}

describe('optimizer v6 independent audit artifact', () => {
  it('records all 198 independent solves and the three-mode matrix', () => {
    const report = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'docs/audits/roster-optimizer-v6-0.22.1.json',
    ), 'utf8')) as AuditReport;

    expect(report.executionCount).toBe(198);
    expect(report.solverExecutions).toBe(198);
    expect(report.candidatePoolBuilds).toBe(6);
    expect(report.candidatePoolsIndependent).toBe(true);
    expect(report.allSolversIndependent).toBe(true);
    expect(report.executions).toHaveLength(198);
    expect(report.executions.every((execution) => execution.solverReused === false))
      .toBe(true);
    expect(report.executions.every((execution) => execution.noDuplicateDragons))
      .toBe(true);
    expect(report.executions.every((execution) => execution.exactReconstruction))
      .toBe(true);
    expect(report.executions.every((execution) => execution.historicalV5Compatible))
      .toBe(true);
    expect(report.forwardReverseEqual).toBe(true);
    expect(report.noDuplicateDragons).toBe(true);
    expect(report.exactReconstruction).toBe(true);
    expect(report.historicalV5Compatible).toBe(true);
    expect(report.failedChecks).toBe(0);

    const pairs = new Map<string, AuditExecution[]>();
    for (const execution of report.executions) {
      const key = `${execution.fixture}/${execution.mode}/${execution.count}`;
      pairs.set(key, [...(pairs.get(key) ?? []), execution]);
      if (execution.mode === 'best-overall-first') {
        expect(execution.bestOverallScoreUnits).toHaveLength(execution.count);
      } else {
        expect(execution.bestOverallScoreUnits).toEqual([]);
      }
    }
    expect(pairs.size).toBe(99);
    for (const pair of pairs.values()) {
      expect(pair).toHaveLength(2);
      const forward = pair.find((execution) => execution.inputOrder === 'forward');
      const reverse = pair.find((execution) => execution.inputOrder === 'reverse');
      expect(reverse?.solutionHash).toBe(forward?.solutionHash);
      expect(reverse?.resultHash).toBe(forward?.resultHash);
    }

    expect(report.deterministicAuditHash).toBe('fnv1a64:ffb3095cf43ea1f6');
  });
});
