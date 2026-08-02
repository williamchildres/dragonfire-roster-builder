import path from 'node:path';

export const HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT = Object.freeze({
  auditVersion: '0.20.0',
  markdownFilename: 'full-roster-regression-0.20.0.md',
  diagnosticJsonFilename: 'full-roster-regression-0.20.0.json',
  deterministicFullResultHash:
    '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf',
  historicalProfileInput: Object.freeze({
    schemaVersion: 1,
    sourceCommit: '2832d64c75621ce2fcf57385d716df2f2de52aab',
    deterministicInputHash:
      'sha256:68343cd6bfa67e10f616cf8c3ee109f0d19026058cbf6ffb53776aa6cb758719',
    profileCount: 33,
    signalCount: 239,
  }),
  orderedFormationCount: 32_736,
  priorFormationCount: 26_970,
  newFormationCount: 5_766,
  failedCheckCount: 0,
});

export function resolveFullRosterAuditPaths(
  root,
  contract = HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT,
) {
  return {
    markdownPath: path.join(root, 'docs', 'audits', contract.markdownFilename),
    diagnosticJsonPath: path.join(root, 'Scratch', contract.diagnosticJsonFilename),
  };
}

export function validateFullRosterAuditReport(
  { report, comparison },
  contract = HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT,
) {
  const failures = [];
  if (
    report.formationSweep.deterministicFullResultHash !==
    contract.deterministicFullResultHash
  ) {
    failures.push('deterministic result hash');
  }
  if (
    JSON.stringify(report.formationSweep.historicalProfileInput) !==
    JSON.stringify(contract.historicalProfileInput)
  ) {
    failures.push('historical profile input');
  }
  if (report.formationSweep.actualCount !== contract.orderedFormationCount) {
    failures.push('ordered formation count');
  }
  if (comparison.formationMigrations.length !== contract.priorFormationCount) {
    failures.push('prior formation count');
  }
  if (comparison.newFormationCount !== contract.newFormationCount) {
    failures.push('new formation count');
  }
  if (report.totals.failedChecks !== contract.failedCheckCount) {
    failures.push('failed check count');
  }
  if (failures.length > 0) {
    throw new Error(
      `Full-roster audit contract ${contract.auditVersion} changed: ${failures.join(', ')}. ` +
      'Declare a new historical audit contract before writing new artifacts.',
    );
  }
}

export function validateCommittedFullRosterAudit(
  { report, comparison, committedMarkdown },
  contract = HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT,
) {
  validateFullRosterAuditReport({ report, comparison }, contract);
  if (
    !committedMarkdown.includes(`Current: ${contract.auditVersion}`) ||
    !committedMarkdown.includes(contract.deterministicFullResultHash)
  ) {
    throw new Error(
      `Committed Formation Rating v2 audit ${contract.markdownFilename} does not match ` +
      `historical contract ${contract.auditVersion}.`,
    );
  }
}
