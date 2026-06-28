import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const reviewFormation: FormationAnalysisInput = {
  'left-flank': 'caraxes',
  vanguard: 'vhagar',
  'right-flank': 'syrax',
};

function reviewRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['caraxes', 'vhagar', 'syrax']) {
    const entry = roster[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = 10;
    entry!.reignLevel = 26;
  }
  return roster;
}

function reviewTraces() {
  return analyzeFormationTraces(reviewFormation, dragons, {
    roster: reviewRoster(),
    dragonLevels: { caraxes: 26, vhagar: 26, syrax: 26 },
    previewMaxRankInteractions: false,
  });
}

function reviewPresentation() {
  const roster = reviewRoster();
  const traces = analyzeFormationTraces(reviewFormation, dragons, {
    roster,
    dragonLevels: { caraxes: 26, vhagar: 26, syrax: 26 },
    previewMaxRankInteractions: false,
  });
  return buildFormationCardPresentation(reviewFormation, dragons, traces, { previewEnabled: false, roster });
}

function traceCounts(traces: SynergyTrace[]) {
  return traces.reduce<Record<SynergyTrace['status'], number>>((counts, trace) => {
    counts[trace.status] += 1;
    return counts;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function card(result: ReturnType<typeof reviewPresentation>, dragonId: string) {
  const match = result.cards.find((item) => item.dragonId === dragonId);
  expect(match).toBeDefined();
  return match!;
}

function traceText(trace: SynergyTrace | undefined) {
  return trace
    ? [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions, ...trace.unresolvedQuestions].join(' ')
    : '';
}

function interactionText(item: {
  summary: string;
  detail: string;
  summaryLines: string[];
  details: string[];
  effects: string[];
}) {
  return [item.summary, item.detail, ...item.summaryLines, ...item.details, ...item.effects].join(' ');
}

describe('Caraxes, Vhagar, and Syrax review regression', () => {
  it('preserves the reviewed trace counts and exact trace identities', () => {
    const traces = reviewTraces();
    expect(traces).toHaveLength(56);
    expect(traceCounts(traces)).toMatchObject({ active: 22, potential: 23, inactive: 9, blocked: 1, unknown: 1 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });

  it('resolves preferred positional targets before checking output compatibility', () => {
    const traces = reviewTraces();

    const tacticalDamageTargeting = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-tactical-inferno' &&
      trace.ruleId === 'target-selection-no-qualified-output' &&
      trace.channel === 'tactical-damage'
    );
    const fireTargeting = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-tactical-inferno' &&
      trace.ruleId === 'target-selection-no-qualified-output' &&
      trace.channel === 'fire-damage'
    );
    const battleLeaderTargeting = traces.find((trace) =>
      trace.sourceAbilityId === 'vhagar-battle-leader' &&
      trace.ruleId === 'target-selection-no-qualified-output'
    );
    const blazingFury = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-blazing-fury' &&
      trace.recipientDragonId === 'caraxes' &&
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.channel === 'fire-damage'
    );

    expect(tacticalDamageTargeting?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['caraxes']);
    expect(traceText(tacticalDamageTargeting)).toContain('Selected recipient: caraxes.');
    expect(traceText(tacticalDamageTargeting)).toContain('No qualifying Tactical Damage outputs exist on the resolved target.');
    expect(traces.some((trace) =>
      trace.sourceAbilityId === 'syrax-tactical-inferno' &&
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.channel === 'tactical-damage'
    )).toBe(false);

    expect(fireTargeting?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['syrax']);
    expect(traceText(fireTargeting)).toContain('Selected recipient: syrax.');
    expect(traceText(fireTargeting)).toContain('No qualifying Fire Damage outputs exist on the resolved target.');
    expect(traces.some((trace) =>
      trace.sourceAbilityId === 'syrax-tactical-inferno' &&
      trace.recipientDragonId === 'caraxes' &&
      trace.channel === 'fire-damage'
    )).toBe(false);

    expect(battleLeaderTargeting?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['syrax']);
    expect(traceText(battleLeaderTargeting)).toContain('Target resolution does not redirect to another dragon solely to find a compatible output.');
    expect(traces.some((trace) =>
      trace.sourceAbilityId === 'vhagar-battle-leader' &&
      trace.matchKind === 'outgoing-effect-amplification'
    )).toBe(false);

    expect(blazingFury?.recipientDragonId).toBe('caraxes');
    expect(blazingFury?.matchedOutputCapabilityIds?.join(' ')).toContain('infernal-burst');
    expect(blazingFury?.matchedOutputCapabilityIds?.join(' ')).toContain('crippling-inferno-burn');
  });

  it('keeps Slow, Burn, and First-Strike source traces independently auditable', () => {
    const traces = reviewTraces();

    const slowSource = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Crippling Inferno - Slow attempt'
    );
    const burnSource = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Crippling Inferno - Burn attempt'
    );
    const burnPeriodic = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.ruleId === 'periodic-status-damage' &&
      trace.channel === 'fire-damage'
    );
    const firstStrikeSource = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-blazing-fury' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Blazing Fury - First-Strike source'
    );

    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    expect(slowSource).toBeDefined();
    expect(traceText(slowSource)).toContain('Source effect ID: crippling-inferno-slow.');
    expect(traceText(slowSource)).toContain('Independent per-target checks: 3.');
    expect(traceText(slowSource)).toContain('Status application chance: 10% at effective Habit Level 1.');

    expect(burnSource).toBeDefined();
    expect(traceText(burnSource)).toContain('Source effect ID: crippling-inferno-burn.');
    expect(traceText(burnSource)).toContain('Independent per-target checks: 3.');
    expect(burnPeriodic).toBeDefined();
    expect(traceText(burnPeriodic)).toContain('Burn deals periodic Fire Damage each round.');

    expect(firstStrikeSource).toBeDefined();
    expect(traceText(firstStrikeSource)).toContain('Source effect ID: blazing-fury-first-strike.');
    expect(traceText(firstStrikeSource)).toContain('Target: one ally.');
    expect(traceText(firstStrikeSource)).toContain('Resolved ally recipient: Caraxes.');
    expect(traceText(firstStrikeSource)).toContain('Recipient resolution basis: explicit Fire-output preference.');
    expect(traceText(firstStrikeSource)).toContain('Activation success is unresolved.');
    expect(traceText(firstStrikeSource)).toContain('Dependent recipient candidate: caraxes.');
    expect(traceText(firstStrikeSource)).toContain('First-Strike and Fire Damage support share the resolved ally recipient.');
    expect(traceText(firstStrikeSource)).not.toContain('Selected ally recipient is unresolved.');
    expect(traceText(firstStrikeSource)).toContain('Status application chance: 20%.');
    expect(traceText(firstStrikeSource)).toContain('Duration: 2 rounds.');
    expect(traceText(firstStrikeSource)).not.toMatch(/one enemy|Selected enemy|enemy identity/i);
    expect(firstStrikeSource!.exactResultUnknownReason).toBe('Caraxes is the resolved recipient if Blazing Fury activates; exact activation and uptime are not calculated.');
  });

  it('reports carryover, same-round overlap, and fixed conditional chance wording', () => {
    const traces = reviewTraces();

    const strategicRevival = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.recipientAbilityId === 'syrax-strategic-revival' &&
      trace.matchKind === 'status-condition-enablement'
    );
    const infernalBurst = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-blazing-fury' &&
      trace.recipientAbilityId === 'caraxes-infernal-burst' &&
      trace.matchKind === 'status-condition-enablement'
    );
    const fieryBonds = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.recipientAbilityId === 'vhagar-fiery-bonds' &&
      trace.matchKind === 'status-condition-enablement'
    );

    const strategicText = traceText(strategicRevival);
    expect(strategicText).toContain('Round 2 after a successful Round 1 application');
    expect(strategicText).toContain('Round 2 from a successful Round 2 application only if Crippling Inferno resolves before Strategic Revival that round');
    expect(strategicText).toContain('Round 5 after a successful Round 4 application');
    expect(strategicText).toContain('Round 8 from a successful Round 8 application only if Crippling Inferno resolves before Strategic Revival that round');
    expect(strategicText).toContain('At least one enemy must have active Slow.');
    expect(strategicText).toContain('Strategic Revival does not require the same enemy to be selected.');
    expect(strategicText).toContain("Strategic Revival's friendly recipient is selected independently.");
    expect(strategicText).toContain('Slow application success, whether any enemy remains affected, and conditional uptime are unresolved.');
    expect(strategicText).not.toContain('Slow application success, enemy identity, target overlap');

    const infernalText = traceText(infernalBurst);
    expect(infernalText).toContain('Round 3 after a successful Round 2 application');
    expect(infernalText).toContain('Round 3 from a successful Round 3 application only if Blazing Fury resolves before Infernal Burst that round');
    expect(infernalText).toContain('Round 6 after a successful Round 5 application');
    expect(infernalText).toContain('Round 9 from a successful Round 9 application only if Blazing Fury resolves before Infernal Burst that round');
    expect(infernalText).toContain('Resolved ally recipient: Caraxes.');
    expect(infernalText).toContain('Recipient resolution basis: explicit Fire-output preference.');
    expect(infernalText).toContain('Activation success is unresolved.');
    expect(infernalText).toContain('First-Strike and Fire Damage support share the resolved ally recipient.');
    expect(infernalText).toContain('Caraxes is the resolved recipient of First-Strike if the supplier activates.');
    expect(infernalText).toContain('Caraxes must own the dependent Infernal Burst output.');
    expect(infernalText).toContain('Infernal Burst benefits while Caraxes has First-Strike.');
    expect(infernalText).toContain('Exact First-Strike activation and final uptime are unresolved.');
    expect(infernalText).not.toMatch(/Selected ally recipient is unresolved|recipient selection|another eligible target|Exact First-Strike recipient/i);
    expect(infernalText).not.toMatch(/ineligible enemy|enemy identity|target overlap remains unresolved/i);

    const fieryText = traceText(fieryBonds);
    expect(fieryText).toContain('Crippling Inferno and Fiery Bonds both check each round.');
    expect(fieryText).toContain('Burn from the previous round can still enhance Fiery Bonds from Round 2 onward.');
    expect(fieryText).toContain('A Burn applied during the current round can enhance Fiery Bonds only if Crippling Inferno resolves first.');
    expect(fieryText).toContain('Recurring overlap pattern: previous-round carryover from Round 2 onward; same-round overlap requires Crippling Inferno before Fiery Bonds.');
    expect(fieryText).not.toContain('Round 10');
    expect(fieryText).not.toContain('Round 2 after a successful Round 1 application');
    expect(fieryText).toContain('Burn must be active on the same enemy that Fiery Bonds checks for Taunt application.');
    expect(fieryText).toContain('The supplied status and dependent Taunt application must involve the same enemy.');
    expect(fieryText).not.toContain('dependent damage');
    expect(fieryText).toContain('same-target overlap');
    expect(fieryText).toContain('The Taunt application chance is 25% for a normal target and 50% for that same target while it has Burn');
    expect(fieryText).not.toContain('effective Habit Level unknown');
  });

  it('consolidates normal provider cards while preserving the beneficiary details', () => {
    const result = reviewPresentation();
    const syrax = card(result, 'syrax');
    const vhagar = card(result, 'vhagar');
    const caraxes = card(result, 'caraxes');

    const fireVulnerability = vhagar.provides.filter((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle));
    const physicalVulnerability = vhagar.provides.filter((item) => /Blazing Onslaught - Enemy Physical Damage vulnerability/i.test(item.effectTitle));
    const strategicRecovery = syrax.provides.filter((item) =>
      item.abilityName === 'Strategic Revival' &&
      /Recovery support/i.test(item.effectTitle)
    );
    const blazingFuryFire = syrax.provides.find((item) => /Blazing Fury - Fire Damage support/i.test(item.effectTitle));
    const slowApplications = caraxes.provides.filter((item) => /Crippling Inferno - Slow application/i.test(item.effectTitle));
    const burnApplications = caraxes.provides.filter((item) => /Crippling Inferno - Burn application/i.test(item.effectTitle));
    const burnPeriodic = caraxes.provides.find((item) => /Crippling Inferno - Burn periodic damage/i.test(item.effectTitle));
    const eclipseProvider = vhagar.provides.find((item) =>
      item.abilityName === 'Eclipse Cover' &&
      item.targetSelectionMode &&
      /Damage Dealt support/i.test(item.effectTitle)
    );
    const eclipseCaraxes = caraxes.receives.find((item) => item.abilityName === 'Eclipse Cover' && /Damage Dealt support/i.test(item.effectTitle));
    const eclipseSyrax = syrax.receives.find((item) => item.abilityName === 'Eclipse Cover' && /Damage Dealt support/i.test(item.effectTitle));
    const fieryDependency = vhagar.receives.find((item) => /Burn enhances Fiery Bonds chance/i.test(item.effectTitle));

    expect(fireVulnerability).toHaveLength(1);
    expect([fireVulnerability[0]!.summary, fireVulnerability[0]!.detail, ...fireVulnerability[0]!.summaryLines, ...fireVulnerability[0]!.details].join(' ')).toContain('Caraxes');
    expect(fireVulnerability[0]!.summary).not.toContain('Increases Fire Damage Received for one enemy target.');

    expect(physicalVulnerability).toHaveLength(1);
    expect([physicalVulnerability[0]!.summary, physicalVulnerability[0]!.detail, ...physicalVulnerability[0]!.summaryLines, ...physicalVulnerability[0]!.details].join(' ')).toContain('Vhagar');
    expect(physicalVulnerability[0]!.summary).not.toContain('Increases Physical Damage Received for one enemy target.');

    expect(strategicRecovery).toHaveLength(1);
    expect(strategicRecovery[0]!.targetLabel).toBe('Caraxes or Vhagar or Syrax');
    expect(interactionText(strategicRecovery[0]!)).toContain('If Vhagar is selected, Ancestral Shield increases Recovery Received by 15%.');
    expect(vhagar.receives.some((item) =>
      item.abilityName === 'Strategic Revival' &&
      [...item.summaryLines, item.summary, item.detail, ...item.details, ...item.effects].join(' ').includes('Ancestral Shield')
    )).toBe(true);

    expect(blazingFuryFire).toBeDefined();
    const blazingText = interactionText(blazingFuryFire!);
    expect(blazingText).toContain('Infernal Burst');
    expect(blazingText).toContain('Crippling Inferno Burn');
    expect(caraxes.receives.some((item) => /Blazing Fury - Fire Damage support/i.test(item.effectTitle))).toBe(true);
    expect(slowApplications).toHaveLength(1);
    expect(burnApplications).toHaveLength(1);
    expect(burnPeriodic).toBeDefined();

    expect(eclipseProvider).toBeDefined();
    const eclipseProviderText = interactionText(eclipseProvider!);
    expect(eclipseProviderText).toContain('Candidate outputs: Caraxes: Crippling Inferno Burn, Infernal Burst Fire Damage, and Crippling Inferno Burn periodic Fire Damage');
    expect(eclipseProviderText).toContain('Syrax: Blazing Fury Tactical Damage');
    expect(eclipseProviderText).toContain('Vhagar: Fiery Bonds Physical Damage and Skyward Titan Physical Damage');
    expect(eclipseProviderText).not.toContain('Qualifying outputs: Crippling Inferno');
    expect(vhagar.receives.some((item) => item.abilityName === 'Eclipse Cover' && /Damage Dealt support/i.test(item.effectTitle))).toBe(false);

    expect(eclipseCaraxes).toBeDefined();
    const eclipseCaraxesText = interactionText(eclipseCaraxes!);
    expect(eclipseCaraxesText).toContain('Infernal Burst Fire Damage');
    expect(eclipseCaraxesText).toContain('Crippling Inferno Burn');
    expect(eclipseCaraxesText).not.toContain('Blazing Fury Tactical Damage');
    expect(eclipseCaraxesText).not.toContain('Fiery Bonds Physical Damage');
    expect(eclipseCaraxesText).not.toContain('Skyward Titan Physical Damage');

    expect(eclipseSyrax).toBeDefined();
    const eclipseSyraxText = interactionText(eclipseSyrax!);
    expect(eclipseSyraxText).toContain('Blazing Fury Tactical Damage');
    expect(eclipseSyraxText).not.toContain('Infernal Burst Fire Damage');
    expect(eclipseSyraxText).not.toContain('Crippling Inferno Burn');
    expect(eclipseSyraxText).not.toContain('Fiery Bonds Physical Damage');
    expect(eclipseSyraxText).not.toContain('Skyward Titan Physical Damage');

    expect(fieryDependency).toBeDefined();
    expect(fieryDependency!.summary).toContain("Burn can increase Fiery Bonds' Taunt chance from 25% to 50% against the same enemy.");
    expect(fieryDependency!.summary).toContain('Both effects check each round.');
    expect(fieryDependency!.summary).toContain('same-round Burn requires Crippling Inferno to resolve first.');
    expect(fieryDependency!.summary).toContain('Application, same-enemy overlap, action order, roll scope remain conditional.');
    expect((fieryDependency!.summary.match(/roll scope|shared roll|per-target/gi) ?? [])).toHaveLength(1);
    expect(fieryDependency!.summary).not.toContain('Whether this uses one shared roll or separate per-target rolls is unresolved.');
    expect(fieryDependency!.summary).not.toContain('Crippling Inferno has a 10% chance');
    expect(interactionText(fieryDependency!)).toContain('Crippling Inferno has a 10% chance each round');
    expect(interactionText(fieryDependency!)).toContain('Taunt lasts 2 rounds.');
  });
});
