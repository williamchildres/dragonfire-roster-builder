import { describe, expect, it } from 'vitest';

import {
  EXPECTED_FORMATION_RATING_V2_HASH,
  EXPECTED_FORMATION_RATING_V3_AUDIT_HASH,
  EXPECTED_FORMATION_RATING_V3_HASH,
  EXPECTED_FORMATION_RATING_V3_NUMERIC_HASH,
  EXPECTED_FORMATION_RELIABILITY_REGISTRY_HASH,
  EXPECTED_FORMATION_RELIABILITY_RESEARCH_HASH,
  runFormationRatingV3Audit,
} from '../audit/formationRatingV3Audit';

describe('Formation Rating v3 exhaustive audit', () => {
  it(
    'is deterministic across every ordered current formation',
    () => {
      const report = runFormationRatingV3Audit();
      expect(report.coverage).toMatchObject({
        dragons: 33,
        unorderedTrios: 5456,
        orderedFormations: 32736,
        failedChecks: 0,
      });
      expect(report.sourceHashes).toEqual({
        registry: EXPECTED_FORMATION_RELIABILITY_REGISTRY_HASH,
        research: EXPECTED_FORMATION_RELIABILITY_RESEARCH_HASH,
        v2: EXPECTED_FORMATION_RATING_V2_HASH,
        v3: EXPECTED_FORMATION_RATING_V3_HASH,
        v3Numeric: EXPECTED_FORMATION_RATING_V3_NUMERIC_HASH,
      });
      expect(report.deterministicAuditHash).toBe(
        EXPECTED_FORMATION_RATING_V3_AUDIT_HASH,
      );
      expect(report.reliabilitySummary.quantifiedRelationshipCount).toBeGreaterThan(0);
      expect(report.reliabilitySummary.unquantifiedRelationshipCount).toBeGreaterThan(0);
      expect(report.representativeVelarCases).toHaveLength(3);
      expect(report.tierCalibration).toMatchObject({
        selectedThresholds: {
          Excellent: 66,
          Strong: 53,
          Solid: 34,
          Developing: 5,
        },
        postCalibrationCounts: {
          Excellent: 381,
          Strong: 3271,
          Solid: 13131,
          Developing: 13802,
          Weak: 2151,
        },
      });
      expect(report.tierCalibration.derivedThresholds).toEqual({
        Excellent: 66,
        Strong: 53,
        Solid: 35,
        Developing: 5,
      });
      expect(report.tierCalibration.selectedThresholds.Solid).toBe(34);
      expect(
        report.representativeVelarCases.every((entry) => entry.placements.length === 6),
      ).toBe(true);
    },
    60_000,
  );
});
