import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { manualReviewRecords } from '../data/manualReviews';
import { defaultSynergyRules } from '../data/synergyRules';
import {
  canTargetCasterByLanguage,
  canTargetCasterWithScope,
  normalizeDamageSourceScope,
  resolveAllyTargets,
  sourceScopeIncludesBasicAttacks,
  sourceScopeIncludesCommandsAndHabits,
} from '../services/formationRules';
import { analyzeFormation } from '../services/synergyEngine';
import { analyzeFormationTraces } from '../services/synergyTrace';

function dragon(id: string) {
  const found = dragons.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Missing dragon ${id}`);
  }
  return found;
}

describe('Phase 3.6 combat-log confirmations', () => {
  it("confirms Warrior's Zeal source scope includes Basic Attacks and all verified Physical Damage sources", () => {
    const vermax = dragon('vermax');
    const physical = vermax.trait!.schedules[0]!.effects.find((effect) => effect.id === 'warriors-zeal-physical')!;

    expect(physical.sourceScope).toBe('all-sources');
    expect(sourceScopeIncludesBasicAttacks(physical.sourceScope!)).toBe(true);
    expect(sourceScopeIncludesCommandsAndHabits(physical.sourceScope!)).toBe(true);
    expect(vermax.trait!.unresolvedQuestions.join(' ')).not.toMatch(/Basic Attack|source-scope|source scope/i);
    expect(vermax.unresolvedQuestions.join(' ')).not.toMatch(/Command\/Habit icon source-scope/i);
  });

  it('keeps explicit Basic Attack exclusions stronger than the default source-scope rule', () => {
    const malachite = dragon('malachite');
    const forest = malachite.habits
      .find((habit) => habit.id === 'malachite-forests-instinct')!
      .schedules[0]!.effects.find((effect) => effect.id === 'forests-instinct-physical-damage')!;

    expect(forest.excludes).toContain('Basic Attacks');
    expect(forest.sourceScope).toBe('non-basic-attacks');
    expect(normalizeDamageSourceScope({
      effectType: forest.type,
      explicitSourceScope: 'unknown',
      excludes: forest.excludes,
    })).toBe('non-basic-attacks');
    expect(normalizeDamageSourceScope({
      effectType: "Warrior's Zeal Physical Damage Dealt Up",
      explicitSourceScope: 'unknown',
      excludes: [],
    })).toBe('all-sources');
  });

  it('confirms Wild Hunt previous-round Recovery target priority only for new Prey selection', () => {
    const sheepstealer = dragon('sheepstealer');
    const applyPrey = sheepstealer.command!.schedules.find((schedule) => schedule.id === 'wild-hunt-apply-prey')!;
    const fireDamage = sheepstealer.command!.schedules.find((schedule) => schedule.id === 'wild-hunt-fire-damage')!;

    expect(applyPrey.targetPriority).toBe('prefer-received-recovery-last-round');
    expect(applyPrey.conditions?.map((condition) => condition.kind)).toContain('no-enemy-has-mark');
    expect(applyPrey.effects[0]!.notes.join(' ')).toMatch(/received Recovery during the previous round/);
    expect(fireDamage.targetPriority).toBe('prefer-prey');
  });

  it('normalizes Ally versus Other Ally caster eligibility while preserving spatial limits', () => {
    const malachite = dragon('malachite');
    const seasmoke = dragon('seasmoke');
    const wardenRecovery = malachite.command!.schedules[1]!.effects[0]!;
    const forestPhysical = malachite.habits.find((habit) => habit.id === 'malachite-forests-instinct')!.schedules[0]!.effects[0]!;
    const clever = seasmoke.habits.find((habit) => habit.id === 'seasmoke-clever-maneuver')!.schedules[0]!.effects[0]!;
    const cunningAdjacent = seasmoke.habits.find((habit) => habit.id === 'seasmoke-cunning-ferocity')!.schedules[0]!.effects[0]!;

    expect(canTargetCasterByLanguage(wardenRecovery)).toBe(true);
    expect(canTargetCasterByLanguage(clever)).toBe(true);
    expect(canTargetCasterByLanguage(forestPhysical)).toBe(false);
    expect(canTargetCasterWithScope(cunningAdjacent)).toBe(false);
    expect(
      resolveAllyTargets(
        { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'vermax' },
        'left-flank',
        cunningAdjacent,
      ).map((target) => target.dragonId),
    ).toEqual(['malachite']);
  });

  it('traces Malachite Recovery provider and Sheepstealer Recovery Received amplification', () => {
    const formation = { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' };
    const traces = analyzeFormationTraces(formation, dragons);
    const recoveryTrace = traces.find((trace) => trace.ruleId === 'recipient-recovery-amplification')!;
    const malachiteTrait = traces.find((trace) => trace.id === 'vanguard-requirement-malachite')!;
    const result = analyzeFormation(formation, dragons, defaultSynergyRules);

    expect(result.score).toBeNull();
    expect(recoveryTrace).toMatchObject({
      status: 'active',
      confidence: 'confirmed',
      sourceDragonId: 'malachite',
      sourceAbilityId: 'malachite-wardens-rally',
      recipientDragonId: 'sheepstealer',
      recipientModifierAbilityId: 'sheepstealer-hunters-cunning',
      providedEffectType: 'Recovery',
      recipientModifierType: 'Recovery Received Up',
      recipientModifierValue: 20,
      combatLogConfirmed: true,
      exactResultKnown: false,
    });
    expect(recoveryTrace.exactResultUnknownReason).toMatch(/Level and Instinct Recovery formula is unknown/);
    expect(malachiteTrait.status).toBe('inactive');
  });

  it('updates Recovery amplification status for position and Level requirements', () => {
    expect(
      analyzeFormationTraces({ 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' }, dragons, {
        dragonLevels: { sheepstealer: null },
      }).find((trace) => trace.ruleId === 'recipient-recovery-amplification')?.status,
    ).toBe('unknown');
    expect(
      analyzeFormationTraces({ 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' }, dragons, {
        dragonLevels: { sheepstealer: 15 },
      }).find((trace) => trace.ruleId === 'recipient-recovery-amplification')?.status,
    ).toBe('inactive');
    expect(
      analyzeFormationTraces({ 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'sheepstealer' }, dragons)
        .find((trace) => trace.ruleId === 'recipient-recovery-amplification')?.status,
    ).toBe('inactive');
  });

  it('records confirmed reviews while preserving pending unresolved mechanics', () => {
    expect(manualReviewRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'vermax-warriors-zeal-normalization-review-2026-06-24', status: 'confirmed' }),
        expect.objectContaining({ id: 'sheepstealer-command-review-2026-06-24', status: 'confirmed' }),
        expect.objectContaining({ id: 'ally-targeting-language-review-2026-06-24', status: 'confirmed' }),
        expect.objectContaining({ id: 'sheepstealer-dragons-cunning-normalization-review-2026-06-24', status: 'provisional' }),
        expect.objectContaining({ id: 'seasmoke-infectious-wrath-normalization-review-2026-06-24', status: 'needs-follow-up' }),
      ]),
    );
  });
});
