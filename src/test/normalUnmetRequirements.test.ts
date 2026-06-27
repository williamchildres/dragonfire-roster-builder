import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { defaultSynergyRules } from '../data/synergyRules';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildNormalUnmetRequirements, normalRequirementSemanticIds } from '../services/normalUnmetRequirements';
import { analyzeFormation } from '../services/synergyEngine';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';

const preview = { previewMaxRankInteractions: true };

const formations: Record<string, FormationAnalysisInput> = {
  '1': { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
  '2': { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  '3': { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
  '4': { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '5': { 'left-flank': 'caraxes', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '6': { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
  '7': { 'left-flank': 'syrax', vanguard: 'vermax', 'right-flank': 'caraxes' },
  '8': { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
};

const expectedSummaries: Record<string, string[]> = {
  '1': [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Warrior's Zeal position requirement: Vermax does not meet Warrior's Zeal's Vanguard requirement.",
  ],
  '2': [
    "Champion's Brilliance position requirement: Seasmoke does not meet Champion's Brilliance's Vanguard requirement.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  '3': [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Champion's Brilliance position requirement: Seasmoke does not meet Champion's Brilliance's Vanguard requirement.",
  ],
  '4': [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Champion's Brilliance Dragon Level requirement: Seasmoke is Level 1 and requires Level 16.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  '5': [
    "Hunter's Wrath position requirement: Caraxes does not meet Hunter's Wrath's Vanguard requirement.",
    "Champion's Brilliance Dragon Level requirement: Seasmoke is Level 1 and requires Level 16.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  '6': [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  '7': [
    "Sentinel's Wit position requirement: Syrax does not meet Sentinel's Wit's Vanguard requirement.",
    "Hunter's Wrath position requirement: Caraxes does not meet Hunter's Wrath's Vanguard requirement.",
  ],
  '8': [
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
    "Sentinel's Wit position requirement: Syrax does not meet Sentinel's Wit's Vanguard requirement.",
  ],
};

function summaryText(formationId: string, options = {}): string[] {
  return analyzeFormation(formations[formationId]!, dragons, defaultSynergyRules, options)
    .unmetRequirements
    .map((item) => `${item.title}: ${item.description}`);
}

function normalTraces(formationId: string, options = {}): SynergyTrace[] {
  return analyzeFormationTraces(formations[formationId]!, dragons, options).filter(isNormalSynergyTrace);
}

function pureInput(formationId: string, options: { previewMaxRankInteractions?: boolean } = {}) {
  const formation = formations[formationId]!;
  const traces = analyzeFormationTraces(formation, dragons, options);
  const selectedDragons = Object.values(formation)
    .map((dragonId) => dragons.find((dragon) => dragon.id === dragonId))
    .filter((dragon): dragon is (typeof dragons)[number] => Boolean(dragon));
  const selectedTraitIds = new Set(selectedDragons.map((dragon) => dragon.trait?.id).filter(Boolean));
  return {
    formation,
    previewEnabled: options.previewMaxRankInteractions === true,
    normalActiveTraces: traces.filter((trace) => trace.status === 'active' && isNormalSynergyTrace(trace)),
    normalPotentialTraces: traces.filter((trace) => ['potential', 'unknown'].includes(trace.status) && isNormalSynergyTrace(trace)),
    selectedInactiveTraitTraces: traces.filter((trace) =>
      trace.status === 'inactive' &&
      trace.sourceAbilityId !== null &&
      selectedTraitIds.has(trace.sourceAbilityId),
    ),
    selectedDragons,
  };
}

describe('normal unmet requirement summaries', () => {
  it.each(Object.keys(formations))('matches exact expected Formation %s summaries in current mode', (formationId) => {
    expect(summaryText(formationId)).toEqual(expectedSummaries[formationId]);
  });

  it.each(Object.keys(formations))('matches exact expected Formation %s summaries in preview mode', (formationId) => {
    expect(summaryText(formationId, preview)).toEqual(expectedSummaries[formationId]);
  });

  it('is pure, deterministic, order-independent, and does not mutate inputs', () => {
    const input = pureInput('4', preview);
    const before = JSON.stringify(input);
    const first = buildNormalUnmetRequirements(input);
    const second = buildNormalUnmetRequirements(input);
    const after = JSON.stringify(input);

    expect(second).toEqual(first);
    expect(after).toBe(before);
    expect(normalRequirementSemanticIds(first)).toHaveLength(new Set(normalRequirementSemanticIds(first)).size);
    expect(summaryText('2')).toEqual(expectedSummaries['2']);
    expect(summaryText('4')).toEqual(expectedSummaries['4']);
    expect(summaryText('2')).toEqual(expectedSummaries['2']);
  });

  it('isolates selected formation boundary and preview mode', () => {
    for (const formationId of ['3', '7']) {
      for (const options of [{}, preview]) {
        const text = summaryText(formationId, options).join(' ');
        expect(text).not.toMatch(/Sheepstealer|Savage Claim|Hunter's Cunning|Dragon's Cunning/);
        const selectedIds = new Set(Object.values(formations[formationId]!));
        expect(analyzeFormation(formations[formationId]!, dragons, defaultSynergyRules, options).unmetRequirements.every((item) =>
          item.dragonIds.every((dragonId) => selectedIds.has(dragonId)),
        )).toBe(true);
      }
    }

    const offInitial = summaryText('2');
    const onInitial = summaryText('2', preview);
    expect(summaryText('2')).toEqual(offInitial);
    expect(summaryText('2', preview)).toEqual(onInitial);
    expect(summaryText('2').join(' ')).not.toContain('preview enabled');
  });

  it('uses visible-card ownership, hard-failure precedence, and semantic deduplication', () => {
    const formation2 = summaryText('2', preview).join(' ');
    const formation4 = summaryText('4', preview);

    expect(formation2).not.toContain("Champion's Brilliance Dragon Level requirement");
    expect(formation4.filter((item) => item.includes("Champion's Brilliance Dragon Level requirement"))).toHaveLength(1);
    expect(formation4.join(' ')).not.toMatch(/Habit unlock|Selected Habit Level|preview enabled/);
    expect(new Set(formation4).size).toBe(formation4.length);
  });

  it('uses canonical names and handles empty summaries with None identified rendering data', () => {
    const allText = Object.keys(formations).flatMap((formationId) => [
      ...summaryText(formationId),
      ...summaryText(formationId, preview),
    ]).join(' ');

    expect(allText).not.toMatch(/\b(sheepstealer|seasmoke|malachite|vermax|syrax|caraxes)\b/);
    expect(allText).not.toMatch(/Claim Habit unlock requirement|Wrath Habit unlock requirement|Trial by Flame by Flame|Brilliance Brilliance/);
    expect(summaryText('3')).not.toEqual([]);
  });

  it('groups Trial by Flame normal presentation without indistinguishable recipient cards', () => {
    const trial = normalTraces('3', preview).filter((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame');

    expect(trial).toHaveLength(3);
    expect(trial.every((trace) => trace.recipientDragonId === null)).toBe(true);
    expect(trial.every((trace) => trace.targetSelectionGroup?.eligibleRecipientDragonIds.join(',') === 'malachite,seasmoke')).toBe(true);
    expect(trial.map((trace) => trace.modifierCapabilityIds?.[0]).sort()).toEqual([
      'vermax-trial-by-flame-trial-below-25-fire-reduction-damage-received-received-modifier',
      'vermax-trial-by-flame-trial-below-50-resistance-damage-received-received-modifier',
      'vermax-trial-by-flame-trial-below-75-fire-reduction-damage-received-received-modifier',
    ]);
    expect(trial.every((trace) => trace.explanation.includes('Malachite and Seasmoke'))).toBe(true);
    expect(trial.every((trace) => trace.explanation.includes('Threshold applicability depends on each recipient\'s current Troop Capacity'))).toBe(true);
    expect(trial.map((trace) => trace.explanation).join(' ')).not.toMatch(/stack/i);
  });

  it('formats grouped sibling stat values without collapsing known values to unknown', () => {
    const reactive = analyzeFormationTraces(formations['7']!, dragons, preview).find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'direct-stat-support'
    );
    const clever = normalTraces('4', preview).find((trace) =>
      trace.sourceAbilityId === 'seasmoke-clever-maneuver' &&
      trace.ruleId === 'direct-stat-support'
    );
    const warrior = normalTraces('7').find((trace) =>
      trace.sourceAbilityId === 'vermax-warriors-zeal' &&
      trace.ruleId === 'direct-stat-support'
    );
    const sentinel = normalTraces('6').find((trace) =>
      trace.sourceAbilityId === 'syrax-sentinels-wit' &&
      trace.ruleId === 'direct-stat-support'
    );
    const hunter = normalTraces('8').find((trace) =>
      trace.sourceAbilityId === 'caraxes-hunters-wrath' &&
      trace.ruleId === 'direct-stat-support'
    );

    expect(reactive?.explanation).toContain("Vermax's Reactive Instincts can increase Vermax's Instinct by +36% and Initiative by +18%.");
    expect(reactive?.explanation).not.toContain('unknown%');
    expect(reactive?.modifierCapabilityIds).toEqual(expect.arrayContaining([
      'vermax-reactive-instincts-reactive-instincts-instinct-stat-dealt-modifier',
      'vermax-reactive-instincts-reactive-instincts-initiative-stat-dealt-modifier',
    ]));
    expect(clever?.explanation).toContain('Intelligence by +44% and Initiative by +25%');
    expect(warrior?.explanation).toContain('Instinct and Initiative by +20');
    expect(sentinel?.explanation).toContain('Instinct and Initiative by +20');
    expect(hunter?.explanation).toContain('Strength and Initiative by +20');
  });
});
