import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  evaluateApprovedHistoricalDeltas,
  OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_COUNT,
  OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY,
  type OptimizerV6AuditExecution,
} from '../audit/rosterOptimizerV6Audit';

interface AuditExecution {
  fixture: string;
  mode: 'best-overall-first' | 'strongest-first' | 'balanced';
  count: number;
  inputOrder: 'forward' | 'reverse';
  solverReused: boolean;
  bestOverallScoreUnits: number[];
  ascendingPowerVector: number[];
  ascendingRatingVector: number[];
  stableSolutionKey: string;
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
  historicalV5ChangedExecutionCount: number;
  approvedHistoricalDeltaManifestIdentity: string;
  approvedHistoricalDeltaCount: number;
  historicalV5DeltaContractValid: boolean;
  failedChecks: number;
  deterministicAuditHash: string;
  executions: AuditExecution[];
}

describe('optimizer v6 independent audit artifact', () => {
  it('preserves the immutable 0.23.3 optimizer and approved-delta evidence', () => {
    const previousReport = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'docs/audits/roster-optimizer-v6-0.23.3.json',
    ), 'utf8')) as AuditReport;
    const previousManifest = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.3.json',
    ), 'utf8')) as ApprovedDeltaManifest;
    expect(previousReport.deterministicAuditHash).toBe('fnv1a64:2de5527469a511c0');
    expect(previousManifest.deterministicManifestHash).toBe(
      'sha256:7630e354700b908f4e3c86379552a2c13b9e6d1034a0fdaa011772cd4eaff69a',
    );
    const v0234Report = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'docs/audits/roster-optimizer-v6-0.23.4.json',
    ), 'utf8')) as AuditReport;
    const v0234Manifest = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.4.json',
    ), 'utf8')) as ApprovedDeltaManifest;
    expect(v0234Report.deterministicAuditHash).toBe('fnv1a64:1acd71772d85f8a8');
    expect(v0234Manifest.deterministicManifestHash).toBe(
      'sha256:4f315d86257e481b9b8e6f582a904380158c6ca012f8edf967183a9ab4810b7c',
    );
  });

  it('records all 198 independent solves and the three-mode matrix', () => {
    const report = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'docs/audits/roster-optimizer-v6-0.23.5.json',
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
    expect(report.forwardReverseEqual).toBe(true);
    expect(report.noDuplicateDragons).toBe(true);
    expect(report.exactReconstruction).toBe(true);
    expect(report.historicalV5Compatible).toBe(false);
    expect(report.historicalV5ChangedExecutionCount).toBe(96);
    expect(report.approvedHistoricalDeltaCount).toBe(96);
    expect(report.approvedHistoricalDeltaManifestIdentity).toBe(
      OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY,
    );
    expect(report.historicalV5DeltaContractValid).toBe(true);
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

    expect(report.deterministicAuditHash).toBe('fnv1a64:701d3db5f5e41ffe');
  });

  it('matches the exact committed 0.23.5 cumulative historical delta manifest', () => {
    const report = committedAudit();
    const manifest = committedManifest();
    const validation = evaluateApprovedHistoricalDeltas(
      report.executions as OptimizerV6AuditExecution[],
    );
    expect(validation.exactMatch).toBe(true);
    expect(validation.actualChangedExecutionCount).toBe(
      OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_COUNT,
    );
    expect(validation.actualDeltas.map(({ key }) => key)).toEqual(
      manifest.deltas.map((delta) => delta.key),
    );
    expect(validation.actualDeltas).toEqual(manifest.deltas);
    const changedKeys = new Set(validation.actualDeltas.map(({ key }) => key));
    expect(report.executions
      .filter(({ mode }) => mode !== 'best-overall-first')
      .every((execution) => execution.historicalV5Compatible === !changedKeys.has(
        `${execution.fixture}/${execution.mode}/${execution.count}/${execution.inputOrder}`,
      ))).toBe(true);
    expect(manifest.deltas.some((delta) => delta.allocationMode === 'best-overall-first'))
      .toBe(false);
    const { deterministicManifestHash: _ignored, ...identityInput } = manifest;
    void _ignored;
    expect(`sha256:${createHash('sha256')
      .update(JSON.stringify(identityInput))
      .digest('hex')}`).toBe(OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY);
  });

  it('locks only the 62 Vhagar correction execution deltas from 0.23.3', () => {
    const manifest = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'src/audit/fixtures/optimizerV6ReleaseDeltas.0.23.3-to-0.23.4.json',
    ), 'utf8')) as ApprovedDeltaManifest & {
      changedExecutionCount: number;
      reasonCode: string;
    };
    expect(manifest.changedExecutionCount).toBe(62);
    expect(manifest.reasonCode).toBe('vhagar-burn-fiery-bonds-reliability-correction');
    expect(manifest.deltas.every((delta) =>
      delta.reason === 'vhagar-burn-fiery-bonds-reliability-correction'
    )).toBe(true);
    const { deterministicManifestHash: _ignored, ...identityInput } = manifest;
    void _ignored;
    expect(`sha256:${createHash('sha256')
      .update(JSON.stringify(identityInput))
      .digest('hex')}`).toBe(
      'sha256:c4a28f699030bbe3d7af4d4ae90717012ae239279b0220b567eb4fb689cc24cb',
    );
  });

  it('locks the 198 catalog-expansion execution deltas from 0.23.4', () => {
    const manifest = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'src/audit/fixtures/optimizerV6ReleaseDeltas.0.23.4-to-0.23.5.json',
    ), 'utf8')) as ApprovedDeltaManifest & {
      changedExecutionCount: number;
      reasonCode: string;
    };
    expect(manifest.changedExecutionCount).toBe(198);
    expect(manifest.reasonCode).toBe('add-legendary-dragon-moondancer');
    expect(manifest.deltas.every((delta) =>
      delta.reason === 'add-legendary-dragon-moondancer'
    )).toBe(true);
    const { deterministicManifestHash: _ignored, ...identityInput } = manifest;
    void _ignored;
    expect(`sha256:${createHash('sha256')
      .update(JSON.stringify(identityInput))
      .digest('hex')}`).toBe(
      'sha256:ec76aba971390ed6f8b603b112987067d63886c158fb561a79ba617281da897d',
    );
  });

  it('rejects one unexpected changed execution', () => {
    const report = committedAudit();
    const changed = structuredClone(report.executions) as OptimizerV6AuditExecution[];
    const unchanged = changed.find((execution) =>
      execution.mode !== 'best-overall-first' && execution.historicalV5Compatible
    )!;
    unchanged.stableSolutionKey = `${unchanged.stableSolutionKey}::unexpected`;
    const validation = evaluateApprovedHistoricalDeltas(changed);
    expect(validation.exactMatch).toBe(false);
    expect(validation.failedChecks).toContain(
      `unexpected historical delta: ` +
      `${unchanged.fixture}/${unchanged.mode}/${unchanged.count}/${unchanged.inputOrder}`,
    );
  });

  it('rejects one missing expected changed execution', () => {
    const report = committedAudit();
    const expectedKey = committedManifest().deltas[0]!.key;
    const executions = (report.executions as OptimizerV6AuditExecution[]).filter((execution) =>
      `${execution.fixture}/${execution.mode}/${execution.count}/${execution.inputOrder}` !== expectedKey
    );
    const validation = evaluateApprovedHistoricalDeltas(executions);
    expect(validation.exactMatch).toBe(false);
    expect(validation.failedChecks).toContain(`expected historical delta missing: ${expectedKey}`);
  });

  it('rejects an approved execution whose current vector changes differently', () => {
    const report = committedAudit();
    const changed = structuredClone(report.executions) as OptimizerV6AuditExecution[];
    const expectedKey = committedManifest().deltas[0]!.key;
    const execution = changed.find((candidate) =>
      `${candidate.fixture}/${candidate.mode}/${candidate.count}/${candidate.inputOrder}` ===
        expectedKey
    )!;
    execution.ascendingRatingVector = [...execution.ascendingRatingVector];
    execution.ascendingRatingVector[0] = (execution.ascendingRatingVector[0] ?? 0) + 1;
    const validation = evaluateApprovedHistoricalDeltas(changed);
    expect(validation.exactMatch).toBe(false);
    expect(validation.failedChecks).toContain(
      `approved historical delta changed differently: ${expectedKey}`,
    );
  });

  it('rejects an approved execution whose current hash changes differently', () => {
    const report = committedAudit();
    const changed = structuredClone(report.executions) as OptimizerV6AuditExecution[];
    const expectedKey = committedManifest().deltas[0]!.key;
    const execution = changed.find((candidate) =>
      `${candidate.fixture}/${candidate.mode}/${candidate.count}/${candidate.inputOrder}` ===
        expectedKey
    )!;
    execution.solutionHash = 'fnv1a64:unexpected-approved-hash';
    const validation = evaluateApprovedHistoricalDeltas(changed);
    expect(validation.exactMatch).toBe(false);
    expect(validation.failedChecks).toContain(
      `approved historical delta changed differently: ${expectedKey}`,
    );
  });

  it('rejects a duplicated fixture/mode/count/order execution identity', () => {
    const report = committedAudit();
    const executions = structuredClone(report.executions) as OptimizerV6AuditExecution[];
    executions.push(structuredClone(executions[0]!));
    const validation = evaluateApprovedHistoricalDeltas(executions);
    expect(validation.exactMatch).toBe(false);
    expect(validation.failedChecks.some((check) => check.startsWith('duplicate execution keys:')))
      .toBe(true);
  });
});

function committedAudit(): AuditReport {
  return JSON.parse(readFileSync(resolve(
    process.cwd(),
    'docs/audits/roster-optimizer-v6-0.23.5.json',
  ), 'utf8')) as AuditReport;
}

interface ApprovedDeltaManifest {
  deterministicManifestHash: string;
  deltas: Array<{
    key: string;
    allocationMode: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

function committedManifest(): ApprovedDeltaManifest {
  return JSON.parse(readFileSync(resolve(
    process.cwd(),
    'src/audit/fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.5.json',
  ), 'utf8')) as ApprovedDeltaManifest;
}
