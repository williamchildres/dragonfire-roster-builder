export interface HistoricalFullRosterAuditContract {
  readonly auditVersion: string;
  readonly markdownFilename: string;
  readonly diagnosticJsonFilename: string;
  readonly deterministicFullResultHash: string;
  readonly historicalProfileInput: Readonly<{
    schemaVersion: number;
    sourceCommit: string;
    deterministicInputHash: string;
    profileCount: number;
    signalCount: number;
  }>;
  readonly orderedFormationCount: number;
  readonly priorFormationCount: number;
  readonly newFormationCount: number;
  readonly failedCheckCount: number;
}

export interface FullRosterAuditValidationInput {
  report: {
    generatedFrom?: { databaseVersion: string };
    formationSweep: {
      deterministicFullResultHash: string;
      historicalProfileInput: HistoricalFullRosterAuditContract['historicalProfileInput'];
      actualCount: number;
    };
    totals: { failedChecks: number };
  };
  comparison: {
    formationMigrations: unknown[];
    newFormationCount: number;
  };
}

export const HISTORICAL_FULL_ROSTER_AUDIT_CONTRACT: HistoricalFullRosterAuditContract;

export function resolveFullRosterAuditPaths(
  root: string,
  contract?: HistoricalFullRosterAuditContract,
): {
  markdownPath: string;
  diagnosticJsonPath: string;
};

export function validateFullRosterAuditReport(
  input: FullRosterAuditValidationInput,
  contract?: HistoricalFullRosterAuditContract,
): void;

export function validateCommittedFullRosterAudit(
  input: FullRosterAuditValidationInput & { committedMarkdown: string },
  contract?: HistoricalFullRosterAuditContract,
): void;
