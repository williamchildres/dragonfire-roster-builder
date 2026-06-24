import { describe, expect, it } from 'vitest';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { manualReviewRecords } from '../data/manualReviews';
import { dragonObservationSnapshots } from '../data/observations';
import {
  THRESHOLD_BOUNDARY_NOTE,
  arePositionsAdjacent,
  getAdjacentPositions,
  isAboveThreshold,
  isBelowThreshold,
  resolveOtherAllyTargets,
  resolveThreeAllyTargets,
  validateFormationAdjacencySymmetry,
} from '../services/formationRules';
import {
  analyzeFormationTraces,
  createSynergyAuditExport,
  generateFormationAudit,
} from '../services/synergyTrace';
import { analyzeFormation } from '../services/synergyEngine';
import { defaultSynergyRules } from '../data/synergyRules';
import { createEmptyRoster } from '../services/rosterStorage';

const build = '26.6.53509';

describe('Phase 3.5 evidence and review metadata', () => {
  it('uses game build 26.6.53509 for current screenshot evidence and observations', () => {
    const screenshotEvidence = evidenceSources.filter((source) => source.type === 'in-game-screenshot');

    expect(databaseMetadata.databaseVersion).toBe('0.4.2');
    expect(databaseMetadata.schemaVersion).toBe(5);
    expect(databaseMetadata.currentDocumentedGameBuild).toBe(build);
    expect(screenshotEvidence.length).toBeGreaterThan(0);
    expect(screenshotEvidence.every((source) => source.gameVersion === build)).toBe(true);
    expect(dragonObservationSnapshots.every((snapshot) => snapshot.gameVersion === build)).toBe(true);
  });

  it('records manual review states for the four reviewed dragons', () => {
    expect(manualReviewRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dragonId: 'malachite', scope: 'command', status: 'confirmed' }),
        expect.objectContaining({
          dragonId: 'seasmoke',
          id: 'seasmoke-infectious-wrath-normalization-review-2026-06-24',
          status: 'needs-follow-up',
        }),
        expect.objectContaining({ dragonId: 'sheepstealer', scope: 'command', status: 'confirmed' }),
        expect.objectContaining({
          dragonId: 'vermax',
          id: 'vermax-warriors-zeal-normalization-review-2026-06-24',
          status: 'confirmed',
        }),
      ]),
    );
    expect(manualReviewRecords.every((review) => review.reviewedAgainstGameBuild === build)).toBe(true);
  });
});

describe('confirmed formation rules and target normalization', () => {
  it('models confirmed symmetric linear adjacency', () => {
    expect(getAdjacentPositions('left-flank')).toEqual(['vanguard']);
    expect(getAdjacentPositions('right-flank')).toEqual(['vanguard']);
    expect(getAdjacentPositions('vanguard')).toEqual(['left-flank', 'right-flank']);
    expect(arePositionsAdjacent('left-flank', 'vanguard')).toBe(true);
    expect(arePositionsAdjacent('right-flank', 'vanguard')).toBe(true);
    expect(arePositionsAdjacent('left-flank', 'right-flank')).toBe(false);
    expect(validateFormationAdjacencySymmetry()).toBe(true);
  });

  it('normalizes exact three-Allies targeting without changing other Allies', () => {
    const formation = { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'vermax' };
    const malachite = dragons.find((dragon) => dragon.id === 'malachite')!;
    const recovery = malachite.command!.schedules[1]!.effects[0]!;

    expect(recovery.target).toBe('3 Allies');
    expect(recovery.targetCount).toBe(3);
    expect(recovery.includesCaster).toBe(true);
    expect(resolveThreeAllyTargets(formation).map((target) => target.dragonId).sort()).toEqual([
      'malachite',
      'seasmoke',
      'vermax',
    ]);
    expect(resolveOtherAllyTargets(formation, 'vanguard').map((target) => target.dragonId).sort()).toEqual([
      'seasmoke',
      'vermax',
    ]);
  });

  it('uses strict textual threshold operators and documents the boundary uncertainty', () => {
    expect(isAboveThreshold(51, 50)).toBe(true);
    expect(isAboveThreshold(50, 50)).toBe(false);
    expect(isBelowThreshold(49, 50)).toBe(true);
    expect(isBelowThreshold(50, 50)).toBe(false);
    expect(THRESHOLD_BOUNDARY_NOTE).toContain('Exactly 50%');
  });
});

describe('synergy trace and audit behavior', () => {
  it('returns active, inactive, potential, and unknown traces without numerical scores', () => {
    const roster = createEmptyRoster(dragons);
    roster.malachite!.collection.state = 'hatched';
    roster.malachite!.owned = true;
    roster.malachite!.starRank = 1;
    roster.sheepstealer!.collection.state = 'hatched';
    roster.sheepstealer!.owned = true;
    roster.sheepstealer!.starRank = 1;
    roster.vermax!.collection.state = 'hatched';
    roster.vermax!.owned = true;
    roster.vermax!.starRank = 1;

    const formation = { 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' };
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      previewMaxRankInteractions: true,
    });
    const result = analyzeFormation(formation, dragons, defaultSynergyRules);

    expect(result.score).toBeNull();
    expect(traces.find((trace) =>
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.sourceDragonId === 'malachite' &&
      trace.recipientDragonId === 'sheepstealer' &&
      trace.channel === 'fire-damage',
    )).toMatchObject({
      status: 'active',
      confidence: 'confirmed',
    });
    expect(traces.find((trace) => trace.id === 'malachite-lightning-strike-vermax')).toMatchObject({
      status: 'potential',
    });
    expect(traces.find((trace) => trace.ruleId === 'verified-vanguard-position-conflict')).toBeDefined();
    expect(traces.flatMap((trace) => trace.sourceEvidenceIds).length).toBeGreaterThan(0);
  });

  it('marks unknown level requirements as unknown when no level evidence exists', () => {
    const traces = analyzeFormationTraces(
      { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': null },
      dragons,
      { dragonLevels: { vermax: null } },
    );

    const unknownLevelTrace = traces.find((trace) => trace.id === 'vanguard-requirement-vermax');
    expect(
      unknownLevelTrace?.requirements.find((requirement) => requirement.label === 'Dragon Level requirement')
        ?.satisfied,
    ).toBeNull();
  });

  it('generates the 24 ordered audit formations and validates audit export', () => {
    const audit = generateFormationAudit(dragons);
    const uniqueKeys = new Set(
      audit.map((entry) => ['left-flank', 'vanguard', 'right-flank'].map((position) => entry.formation[position as keyof typeof entry.formation]).join('|')),
    );
    const exportPayload = createSynergyAuditExport(audit[0]!.formation, audit[0]!.traces);

    expect(audit).toHaveLength(24);
    expect(uniqueKeys.size).toBe(24);
    expect(
      audit.every((entry) => new Set(Object.values(entry.formation).filter(Boolean)).size === 3),
    ).toBe(true);
    expect(exportPayload).toMatchObject({
      format: 'dragonfire-synergy-audit',
      schemaVersion: 1,
      databaseVersion: '0.4.2',
      gameBuild: build,
    });
  });

  it('covers required known interactions', () => {
    expect(
      analyzeFormationTraces({ 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' }, dragons).find(
        (trace) =>
          trace.matchKind === 'outgoing-effect-amplification' &&
          trace.sourceDragonId === 'malachite' &&
          trace.recipientDragonId === 'sheepstealer' &&
          trace.channel === 'fire-damage',
      )?.status,
    ).toBe('active');
    expect(
      analyzeFormationTraces({ 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'vermax' }, dragons).find(
        (trace) =>
          trace.matchKind === 'outgoing-effect-amplification' &&
          trace.sourceDragonId === 'malachite' &&
          trace.recipientDragonId === 'seasmoke' &&
          trace.channel === 'fire-damage',
      )?.status,
    ).toBe('active');
    expect(
      analyzeFormationTraces({ 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' }, dragons).find(
        (trace) =>
          trace.matchKind === 'outgoing-effect-amplification' &&
          trace.sourceDragonId === 'sheepstealer' &&
          trace.recipientDragonId === 'vermax' &&
          trace.channel === 'physical-damage',
      )?.status,
    ).toBe('active');
    expect(
      analyzeFormationTraces({ 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'sheepstealer' }, dragons).find(
        (trace) => trace.ruleId === 'vermax-vanguard-left-flank-trait',
      )?.recipientDragonId,
    ).toBe('malachite');
    expect(
      analyzeFormationTraces({ 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'sheepstealer' }, dragons).find(
        (trace) => trace.ruleId === 'pve-contextual-effect',
      )?.status,
    ).toBe('unknown');
  });
});
