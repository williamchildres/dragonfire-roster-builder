import { describe, expect, it } from 'vitest';

import {
  HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT,
  resolveFullRosterAuditPaths,
  validateCommittedFullRosterAudit,
  validateFullRosterAuditReport,
} from '../../scripts/full-roster-audit-contract.mjs';

function historicalResult(productVersion: string) {
  const report = {
    generatedFrom: { databaseVersion: productVersion },
    formationSweep: {
      deterministicFullResultHash:
        HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT.deterministicFullResultHash,
      actualCount: HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT.orderedFormationCount,
    },
    totals: {
      failedChecks: HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT.failedCheckCount,
    },
  };
  const comparison = {
    formationMigrations: Array.from(
      { length: HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT.priorFormationCount },
    ),
    newFormationCount: HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT.newFormationCount,
  };
  return { report, comparison };
}

describe('historical full-roster audit workflow', () => {
  it('resolves the historical v2 artifact independently of the product release', () => {
    const paths = resolveFullRosterAuditPaths('repo-root');

    expect(paths.markdownPath.replaceAll('\\', '/')).toBe(
      'repo-root/docs/audits/full-roster-regression-0.20.0.md',
    );
    expect(paths.diagnosticJsonPath.replaceAll('\\', '/')).toBe(
      'repo-root/Scratch/full-roster-regression-0.20.0.json',
    );
  });

  it.each(['0.20.0', '0.23.0', '99.0.0'])(
    'accepts the protected historical result when the product release is %s',
    (productVersion) => {
      const result = historicalResult(productVersion);
      expect(() => validateFullRosterAuditReport(result)).not.toThrow();
      expect(() => validateCommittedFullRosterAudit({
        ...result,
        committedMarkdown:
          `Current: 0.20.0; new hash ` +
          HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT.deterministicFullResultHash,
      })).not.toThrow();
    },
  );

  it('requires an intentional new contract before writing changed scoring output', () => {
    const result = historicalResult('0.23.0');
    result.report.formationSweep.deterministicFullResultHash = 'changed';

    expect(() => validateFullRosterAuditReport(result)).toThrow(
      /Declare a new historical audit contract before writing new artifacts/,
    );
  });
});
