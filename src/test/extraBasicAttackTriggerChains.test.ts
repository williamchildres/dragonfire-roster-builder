import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import {
  deriveExtraActionCapabilities,
  deriveStatusOutputCapabilities,
  deriveTriggeredAbilityCapabilities,
} from '../services/effectCapabilities';
import { buildProjectContextFiles } from '../services/projectContextExport';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';

const currentLevels = {
  malachite: 16,
  venator: 16,
  syrax: 16,
  vermax: 16,
};

function currentRoster() {
  const roster = createEmptyRoster(dragons);
  for (const [dragonId, level] of Object.entries(currentLevels)) {
    const entry = roster[dragonId];
    if (!entry) {
      continue;
    }
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 1;
    entry.reignLevel = level;
  }
  return roster;
}

function traces(formation: FormationAnalysisInput, preview = true): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, {
    roster: currentRoster(),
    dragonLevels: currentLevels,
    previewMaxRankInteractions: preview,
  });
}

function triggerTrace(allTraces: SynergyTrace[], recipientDragonId: string, recipientAbilityId: string): SynergyTrace | undefined {
  return allTraces.find((trace) =>
    trace.matchKind === 'extra-basic-attack-trigger' &&
    trace.sourceDragonId === 'malachite' &&
    trace.sourceAbilityId === 'malachite-lightning-strike' &&
    trace.recipientDragonId === recipientDragonId &&
    trace.recipientAbilityId === recipientAbilityId
  );
}

describe('extra Basic Attack trigger-chain derivation', () => {
  it('derives a potential Lightning Strike to Venator Feral Strike chain for adjacent recipients', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'malachite', vanguard: 'venator', 'right-flank': 'syrax' };
    const allTraces = traces(formation, true);
    const normalTraces = allTraces.filter(isNormalSynergyTrace);

    expect(normalTraces.some((trace) =>
      trace.sourceAbilityId === 'malachite-lightning-strike' &&
      trace.recipientDragonId === 'venator' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.effects.join(' ').includes('Strength')
    )).toBe(true);

    const trace = triggerTrace(normalTraces, 'venator', 'venator-feral-strike');
    expect(trace).toMatchObject({
      status: 'potential',
      channel: 'status',
      title: 'Lightning Strike - Extra Basic Attack trigger',
      interactionScope: 'cross-dragon',
    });
    expect(trace?.matchedFacts).toEqual(expect.arrayContaining([
      expect.stringMatching(/Double-Strike.*second Basic Attack/i),
      'Extra action type: basic-attack.',
      'Trigger event: after-basic-attack.',
      'Extra action recipient and triggered ability owner: venator.',
      'Feral Strike triggers after each Basic Attack.',
      'Source effect ID: lightning-strike-double-strike.',
    ]));
    expect(trace?.effects).toEqual(['Potential extra Basic Attack can trigger Feral Strike again.']);
    expect(trace?.assumptions.join(' ')).toMatch(/uptime, total attacks, final damage/i);
    expect(trace?.explanation).not.toMatch(/deals \d|uptime/i);

    const presentation = buildFormationCardPresentation(formation, dragons, normalTraces, { previewEnabled: true });
    const malachite = presentation.cards.find((card) => card.dragonId === 'malachite');
    expect(malachite?.provides.some((item) =>
      item.abilityName === 'Lightning Strike' &&
      /Extra Basic Attack trigger/i.test(item.title) &&
      /Feral Strike/i.test(item.summary)
    )).toBe(true);
  });

  it('does not connect non-adjacent Malachite Double-Strike to Venator Feral Strike', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'venator' };
    const allTraces = traces(formation, true);

    expect(triggerTrace(allTraces, 'venator', 'venator-feral-strike')).toBeUndefined();
    expect(allTraces.some((trace) =>
      trace.matchKind === 'extra-basic-attack-trigger' &&
      trace.sourceDragonId === 'malachite' &&
      trace.recipientAbilityId === 'venator-feral-strike'
    )).toBe(false);
  });

  it('does not create an active locked Lightning Strike trigger chain in current mode', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'malachite', vanguard: 'venator', 'right-flank': 'syrax' };
    const current = traces(formation, false);

    expect(current.some((trace) =>
      trace.matchKind === 'extra-basic-attack-trigger' &&
      trace.sourceAbilityId === 'malachite-lightning-strike'
    )).toBe(false);
  });

  it('preserves the existing Vermax after-Basic-Attack interaction through the generalized path', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'syrax' };
    const trace = triggerTrace(traces(formation, true), 'vermax', 'vermax-spreading-blaze');

    expect(trace).toMatchObject({
      status: 'potential',
      matchKind: 'extra-basic-attack-trigger',
      recipientDragonId: 'vermax',
      recipientAbilityId: 'vermax-spreading-blaze',
    });
    expect(trace?.matchedFacts).toEqual(expect.arrayContaining([
      'Extra action recipient and triggered ability owner: vermax.',
      'Spreading Blaze triggers after each Basic Attack.',
    ]));
  });

  it('derives extra Basic Attack providers from verified status semantics only', () => {
    const statusOutputs = deriveStatusOutputCapabilities(dragons);
    const extraActions = deriveExtraActionCapabilities(dragons);
    const triggeredAbilities = deriveTriggeredAbilityCapabilities(dragons);

    expect(statusOutputs.some((status) =>
      status.statusId === 'double-strike' &&
      status.abilityId === 'malachite-lightning-strike' &&
      status.sourceEffectId === 'lightning-strike-double-strike'
    )).toBe(true);
    expect(extraActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        statusId: 'double-strike',
        abilityId: 'malachite-lightning-strike',
        sourceEffectId: 'lightning-strike-double-strike',
        actionType: 'basic-attack',
        triggerEvent: 'after-basic-attack',
      }),
    ]));
    expect(extraActions.some((capability) => capability.statusId === 'first-strike')).toBe(false);
    expect(triggeredAbilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dragonId: 'venator',
        abilityId: 'venator-feral-strike',
        triggerEvent: 'after-basic-attack',
      }),
      expect.objectContaining({
        dragonId: 'vermax',
        abilityId: 'vermax-spreading-blaze',
        triggerEvent: 'after-basic-attack',
      }),
    ]));
  });

  it('exports extra-action and triggered-ability capability metadata', () => {
    const exportSet = buildProjectContextFiles({
      generatedAt: '2026-06-25T00:00:00.000Z',
      branch: 'fix/double-strike-trigger-chains',
      commit: '0123456789abcdef0123456789abcdef01234567',
    });
    const malachite = JSON.parse(exportSet.files['project-context/dragons/malachite.json']!) as {
      extraActionCapabilities: Array<{ statusId: string; actionType: string; triggerEvent: string; sourceEffectId?: string }>;
    };
    const venator = JSON.parse(exportSet.files['project-context/dragons/venator.json']!) as {
      triggeredAbilityCapabilities: Array<{ abilityId: string; triggerEvent: string }>;
    };
    const framework = JSON.parse(exportSet.files['project-context/synergy/capability-framework.json']!) as {
      matchKinds: string[];
      derivedCapabilities: {
        extraActions: unknown[];
        triggeredAbilities: unknown[];
      };
    };

    expect(malachite.extraActionCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        statusId: 'double-strike',
        actionType: 'basic-attack',
        triggerEvent: 'after-basic-attack',
        sourceEffectId: 'lightning-strike-double-strike',
      }),
    ]));
    expect(venator.triggeredAbilityCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ abilityId: 'venator-feral-strike', triggerEvent: 'after-basic-attack' }),
    ]));
    expect(framework.matchKinds).toContain('extra-basic-attack-trigger');
    expect(framework.derivedCapabilities.extraActions.length).toBeGreaterThan(0);
    expect(framework.derivedCapabilities.triggeredAbilities.length).toBeGreaterThan(0);
  });
});
