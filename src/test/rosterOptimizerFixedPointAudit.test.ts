import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  deterministicRosterOptimizerV3AuditHash,
  runOptimizerV3FixedPointAudit,
} from '../audit/rosterOptimizerV3Audit';

describe('optimizer v3 fixed-point scale evidence', () => {
  it('audits every ordered power of ten and retains the published production scale', () => {
    const audit = runOptimizerV3FixedPointAudit();
    expect(audit.failedChecks).toEqual([]);
    expect(audit.report.powerOfTenScaleAudit.map((entry) => ({
      scale: entry.scale,
      collisions: entry.collisionCount,
    }))).toEqual([
      { scale: 1, collisions: 63 },
      { scale: 10, collisions: 133 },
      { scale: 100, collisions: 0 },
      { scale: 1_000, collisions: 0 },
      { scale: 10_000, collisions: 0 },
      { scale: 100_000, collisions: 0 },
      { scale: 1_000_000, collisions: 0 },
    ]);
    expect(audit.report.smallestAuditedCollisionFreeScale).toBe(100);
    expect(audit.report.selectedProductionScale).toBe(1_000_000);
    expect(audit.report.powerOfTenScaleAudit.every(
      (entry) => entry.safeTenFormationTotal && entry.highsCoefficientSafe,
    )).toBe(true);
  }, 60_000);

  it('keeps operational pass reductions outside the protected adoption identity', () => {
    const artifact = JSON.parse(readFileSync(
      resolve(process.cwd(), 'docs/audits/roster-optimizer-v3-adoption.json'),
      'utf8',
    )) as Parameters<typeof deterministicRosterOptimizerV3AuditHash>[0];
    expect(deterministicRosterOptimizerV3AuditHash(artifact)).toBe(
      '9f411cf378233b3d1681087d6944486ea2118a5b9d1ee48175f607bd587d8e97',
    );
  });
});
