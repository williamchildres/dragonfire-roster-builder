import { describe, expect, it } from 'vitest';

import { summarizeAbility } from '../app/dragonDetailPresentation';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import type { FormationPlacementComparison } from '../services/formationPlacementComparison';
import { rateFormation } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { buildSemanticRelationships, relationshipValue } from '../synergy/semanticRelationships';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';

type FormationArrangementFixture = {
  'left-flank': string;
  vanguard: string;
  'right-flank': string;
};

const dragon = (id: string) => dragons.find((candidate) => candidate.id === id)!;
const ability = (dragonId: string, abilityId: string): AbilityDefinition =>
  [dragon(dragonId).command, dragon(dragonId).trait, ...dragon(dragonId).habits].find(
    (candidate) => candidate?.id === abilityId,
  )!;
const description = (dragonId: string, abilityId: string) =>
  ability(dragonId, abilityId).rawDescription;
const profile = (id: string) =>
  simpleSynergyProfiles.find((candidate) => candidate.dragonId === id)!;

const batchAbilities = {
  seasmoke: [
    'seasmoke-cleansing-wrath',
    'seasmoke-champions-brilliance',
    'seasmoke-clever-maneuver',
    'seasmoke-winds-favor',
    'seasmoke-infectious-wrath',
    'seasmoke-cunning-ferocity',
    'seasmoke-loyal-bond',
  ],
  crimson: [
    'crimson-bloodscale-terror',
    'crimson-hunters-cunning',
    'crimson-enervate',
    'crimson-dragons-intellect',
    'crimson-bloodscale-fury',
    'crimson-unlikely-hero',
    'crimson-vermins-bane',
  ],
  kalspire: [
    'kalspire-tactical-strike',
    'kalspire-champions-brilliance',
    'kalspire-robust-insight',
    'kalspire-battle-cunning',
    'kalspire-tactical-assault',
    'kalspire-dragons-insight',
    'kalspire-radiant-conqueror',
  ],
} as const;

describe('Seasmoke, Crimson, and Kalspire screenshot-source fidelity', () => {
  it('preserves every controller-reviewed Habit Level progression in canonical source data', () => {
    expect(description('seasmoke', 'seasmoke-clever-maneuver')).toContain(
      '22%, 26.4%, 30.8%, 37.4%, 44%',
    );
    expect(description('seasmoke', 'seasmoke-clever-maneuver')).toContain(
      '12.5%, 15%, 17.5%, 21.25%, 25%',
    );
    expect(description('seasmoke', 'seasmoke-winds-favor')).toContain(
      '12.5%, 15%, 17.5%, 21.25%, 25%',
    );
    expect(description('seasmoke', 'seasmoke-infectious-wrath')).toContain(
      '-15%, -18%, -21%, -25.5%, -30%',
    );
    expect(description('seasmoke', 'seasmoke-infectious-wrath')).toContain(
      '30%, 36%, 42%, 51%, 60%',
    );
    expect(description('seasmoke', 'seasmoke-cunning-ferocity')).toContain(
      '7.5%, 9%, 10.5%, 12.75%, 15%',
    );
    expect(description('seasmoke', 'seasmoke-cunning-ferocity')).toContain(
      '5%, 6%, 7%, 8.5%, 10%',
    );
    expect(
      (description('seasmoke', 'seasmoke-loyal-bond') ?? '').match(
        /10%, 13%, 16%, 20%, 25%/g,
      ) ?? [],
    ).toHaveLength(2);

    expect(description('crimson', 'crimson-enervate')).toContain(
      '-13.5%, -16.2%, -18.9%, -22.95%, -27%',
    );
    expect(description('crimson', 'crimson-dragons-intellect')).toContain(
      '-6%, -7.2%, -8.4%, -10.2%, -12%',
    );
    expect(description('crimson', 'crimson-dragons-intellect')).toContain(
      '12%, 14.4%, 16.8%, 20.4%, 24%',
    );
    expect(description('crimson', 'crimson-bloodscale-fury')).toContain(
      '17.5%, 21%, 24.5%, 29.75%, 35%',
    );
    expect(description('crimson', 'crimson-unlikely-hero')).toContain(
      '10%, 12%, 14%, 17%, 20%',
    );
    expect(description('crimson', 'crimson-unlikely-hero')).toContain(
      '-20%, -24%, -28%, -34%, -40%',
    );
    expect(description('crimson', 'crimson-vermins-bane')).toContain(
      '40%, 52%, 64%, 80%, 100%',
    );
    expect(description('crimson', 'crimson-vermins-bane')).toContain(
      '-12%, -15.6%, -19.2%, -24%, -30%',
    );

    expect(
      (description('kalspire', 'kalspire-robust-insight') ?? '').match(
        /20%, 24%, 28%, 34%, 40%/g,
      ) ?? [],
    ).toHaveLength(2);
    expect(description('kalspire', 'kalspire-battle-cunning')).toContain(
      '-6.5%, -7.8%, -9.1%, -11.05%, -13%',
    );
    expect(description('kalspire', 'kalspire-tactical-assault')).toContain(
      '15%, 18%, 21%, 25.5%, 30%',
    );
    expect(description('kalspire', 'kalspire-tactical-assault')).toContain(
      '25%, 30%, 35%, 42.5%, 50%',
    );
    expect(description('kalspire', 'kalspire-dragons-insight')).toContain(
      '-6%, -7.2%, -8.4%, -10.2%, -12%',
    );
    expect(description('kalspire', 'kalspire-dragons-insight')).toContain(
      '12%, 14.4%, 16.8%, 20.4%, 24%',
    );
    expect(description('kalspire', 'kalspire-radiant-conqueror')).toContain(
      '-10%, -13%, -16%, -20%, -25%',
    );
  });

  it('keeps all four visible prose/table discrepancies explicit', () => {
    expect(description('crimson', 'crimson-enervate')).toMatch(
      /prose displays -13%.*Level 1 table displays -13\.5%/s,
    );
    expect(description('crimson', 'crimson-bloodscale-fury')).toMatch(
      /prose displays an 18% Level 1 chance.*table displays 17\.5%/s,
    );
    expect(description('crimson', 'crimson-bloodscale-fury')).toContain(
      "doubled display is 35%, matching twice the table value rather than twice the rounded prose value",
    );
    expect(description('crimson', 'crimson-unlikely-hero')).toMatch(
      /descriptive prose says Physical and Fire Damage Received.*progression-table row is visually labeled “Damage Dealt.”/s,
    );
    expect(description('kalspire', 'kalspire-battle-cunning')).toMatch(
      /prose displays -6%.*Level 1 table displays -6\.5%/s,
    );
  });

  it('covers all 21 abilities and keeps the three complete Trait transcriptions unchanged', () => {
    expect(Object.values(batchAbilities).flat()).toHaveLength(21);
    for (const [dragonId, abilityIds] of Object.entries(batchAbilities)) {
      for (const abilityId of abilityIds) {
        expect(description(dragonId, abilityId)?.length ?? 0).toBeGreaterThan(80);
      }
      expect(dragon(dragonId).habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);
      expect(dragon(dragonId).habits.every((habit) => habit.kind === 'habit')).toBe(true);
      expect(dragon(dragonId).habits.every((habit) => habit.verification.status === 'screenshot-verified')).toBe(true);
    }
    expect(description('seasmoke', 'seasmoke-champions-brilliance')).toBe(
      'At Level 16+ and deployed in the Vanguard, increase self Strength, Intelligence, and Instinct by +15. Reduce Damage Received of the Right Flank ally by 8%.',
    );
    expect(description('crimson', 'crimson-hunters-cunning')).toBe(
      'At Level 16+ and deployed in Vanguard, Crimson Recovery Received +20%, Crimson Intelligence +25, and Right Flank ally Physical Damage Dealt +10%.',
    );
    expect(description('kalspire', 'kalspire-champions-brilliance')).toBe(
      'At Level 16+ and deployed in Vanguard: Kalspire Strength, Intelligence, and Instinct +15; Right Flank ally Damage Received -8%.',
    );
  });

  it('preserves complete targeting, timing, duration, scaling, mitigation, and status meaning', () => {
    expect(description('seasmoke', 'seasmoke-cleansing-wrath')).toMatch(
      /up to three Cleanse attempts.*separate 20% chance.*do not have to select distinct Enemies/s,
    );
    expect(description('seasmoke', 'seasmoke-cleansing-wrath')).toMatch(
      /190% Damage Rate.*increased by Seasmoke's Intelligence.*mitigated by target Initiative/s,
    );
    expect(description('seasmoke', 'seasmoke-infectious-wrath')).toMatch(
      /maximum of three stacks.*lasts three rounds.*Recovery Received.*increased by Seasmoke's Strength.*mitigated by target Instinct/s,
    );
    expect(description('seasmoke', 'seasmoke-loyal-bond')).toMatch(
      /Advantage \(\+20%\).*two other Allies.*above 50%.*two rounds.*Resistance \(-20%\).*below 50%.*two rounds/s,
    );

    expect(description('crimson', 'crimson-bloodscale-terror')).toMatch(
      /Odd-numbered rounds: 20% chance.*Stun.*two rounds.*Rounds 2, 5, and 8.*140% Damage Rate/s,
    );
    expect(description('crimson', 'crimson-bloodscale-terror')).toMatch(
      /Round 1 Stun chance is increased to 40%.*replacing.*other odd-numbered rounds retain.*one shared 50% activation chance/s,
    );
    expect(description('crimson', 'crimson-bloodscale-fury')).toMatch(
      /Weakened \(-20%\).*prioritizing targets not already afflicted with Stun.*lasts two rounds/s,
    );
    expect(description('crimson', 'crimson-unlikely-hero')).toMatch(
      /strictly above 75%.*non-Basic Physical Damage and Fire Damage.*strictly below 25%.*Recovery Received/s,
    );

    expect(description('kalspire', 'kalspire-tactical-strike')).toMatch(
      /original Basic Attack target.*50% Damage Rate.*increased by Kalspire's Instinct.*mitigated by target Intelligence/s,
    );
    expect(description('kalspire', 'kalspire-tactical-strike')).toMatch(
      /independently check a 30% Bleed chance.*20% Damage Rate.*increased by Kalspire's Strength.*mitigated by target Instinct/s,
    );
    expect(description('kalspire', 'kalspire-tactical-strike')).toMatch(
      /15% Panic chance.*other distinct Enemy.*Panic targets must be distinct.*two rounds.*20% Damage Rate/s,
    );
    expect(description('kalspire', 'kalspire-radiant-conqueror')).toMatch(
      /Damage Received by 50% for one round.*Stun for one round.*Start of Round 2.*five rounds.*same or different/s,
    );
  });

  it('adds only the two confirmed Strength scaling fields without changing profile structure', () => {
    const seasmoke = profile('seasmoke');
    const seasmokePhysical = seasmoke.outputs.find(
      (signal) => signal.id === 'seasmoke-infectious-wrath-physical',
    )!;
    expect(seasmokePhysical).toMatchObject({
      tag: 'damage:physical',
      abilityId: 'seasmoke-infectious-wrath',
      scalesWith: ['stat:strength'],
      description: 'deals Physical Damage using Strength',
      unlock: { minimumStarRank: 6 },
    });
    expect(seasmoke.supports.find((signal) => signal.id === 'seasmoke-winds-favor-initiative')?.scalesWith).toBeUndefined();
    expect(seasmoke.supports.find((signal) => signal.id === 'seasmoke-cunning-ferocity-fire-intelligence')?.scalesWith).toBeUndefined();

    const kalspire = profile('kalspire');
    const kalspireBleed = kalspire.outputs.find(
      (signal) => signal.id === 'kalspire-tactical-strike-bleed',
    )!;
    expect(kalspireBleed).toMatchObject({
      tag: 'status:bleed',
      abilityId: 'kalspire-tactical-strike',
      scalesWith: ['stat:strength'],
      description: 'applies Bleed that deals Physical Damage using Strength',
      friendlyScope: 'formation',
    });
    expect(kalspire.outputs.find((signal) => signal.id === 'kalspire-tactical-assault-panic')?.scalesWith).toBeUndefined();

    expect(profile('crimson').outputs.map((signal) => signal.id)).toEqual([
      'crimson-bloodscale-terror-stun',
      'crimson-bloodscale-terror-fire',
    ]);
    expect(profile('crimson').supports.map((signal) => signal.id)).toEqual([
      'crimson-hunters-cunning-right-physical',
      'crimson-unlikely-hero-vulnerability',
    ]);
    expect(profile('crimson').benefitsFrom.map((signal) => signal.id)).toEqual([
      'crimson-bloodscale-fury-taunt-payoff',
    ]);
    expect(simpleSynergyProfiles.flatMap((entry) => [...entry.outputs, ...entry.supports, ...entry.benefitsFrom])).toHaveLength(224);
    expect(dragons.flatMap((entry) => [entry.command, entry.trait, ...entry.habits])).toHaveLength(217);
  });

  it('keeps presentation summaries readable and canonical descriptions free of excluded screenshot text', () => {
    for (const [dragonId, abilityIds] of Object.entries(batchAbilities)) {
      for (const abilityId of abilityIds) {
        const item = ability(dragonId, abilityId);
        const summary = summarizeAbility(item).plainSummary;
        expect(summary.length).toBeGreaterThan(0);
        expect(summary).not.toMatch(/Power|Earn more Stars|Hatchery|Breedmarks|Rarity Cores|Habit Upgrades/i);
        expect(item.rawDescription).not.toMatch(/Power|Earn more Stars|Hatchery|Breedmarks|Rarity Cores|Habit Upgrades/i);
      }
    }
  });

  it('reports the exhaustive rating delta caused only by the two corrected Strength relationships', () => {
    const withoutScaling = (signalIds: string[]): DragonSynergyProfile[] =>
      simpleSynergyProfiles.map((candidate) => ({
        ...candidate,
        outputs: candidate.outputs.map((signal) =>
          signalIds.includes(signal.id) ? { ...signal, scalesWith: undefined } : signal,
        ),
      }));
    const priorProfiles = withoutScaling([
      'seasmoke-infectious-wrath-physical',
      'kalspire-tactical-strike-bleed',
    ]);
    const seasmokeOnlyProfiles = withoutScaling(['kalspire-tactical-strike-bleed']);
    const kalspireOnlyProfiles = withoutScaling(['seasmoke-infectious-wrath-physical']);
    const rate = (formation: SimpleFormation, profiles: DragonSynergyProfile[]) => {
      const progression: SimpleProgressionByDragonId = {};
      for (const id of Object.values(formation)) {
        if (!id) continue;
        progression[id] = {
          starRank: 10,
          dragonLevel: 16,
          combatStats: dragons.find((candidate) => candidate.id === id)?.stats ?? {},
        };
      }
      const results = evaluateFormation({ formation, progression, profiles }).results;
      const relationships = buildSemanticRelationships(results, profiles);
      return {
        rating: rateFormation({
          formation,
          dragons,
          profiles,
          relationships,
          placementComparison: fixedBestPlacement(formation as FormationArrangementFixture, relationships),
        }),
        results,
      };
    };
    const rows: Array<{
      formation: [string, string, string];
      before: ReturnType<typeof rate>;
      seasmokeOnly: ReturnType<typeof rate>;
      kalspireOnly: ReturnType<typeof rate>;
      after: ReturnType<typeof rate>;
    }> = [];
    for (const left of dragons) {
      for (const vanguard of dragons) {
        if (vanguard.id === left.id) continue;
        for (const right of dragons) {
          if (right.id === left.id || right.id === vanguard.id) continue;
          const formation: SimpleFormation = {
            'left-flank': left.id,
            vanguard: vanguard.id,
            'right-flank': right.id,
          };
          rows.push({
            formation: [left.id, vanguard.id, right.id],
            before: rate(formation, priorProfiles),
            seasmokeOnly: rate(formation, seasmokeOnlyProfiles),
            kalspireOnly: rate(formation, kalspireOnlyProfiles),
            after: rate(formation, simpleSynergyProfiles),
          });
        }
      }
    }
    const changed = rows.filter((row) => row.before.rating.score !== row.after.rating.score);
    const relationships = (value: ReturnType<typeof rate>) =>
      value.results.filter(
        (result) => result.kind === 'setup-payoff' || result.kind === 'amplifier-output',
      );
    const relationshipIds = (value: ReturnType<typeof rate>) =>
      relationships(value).map((result) => result.id);
    const deltaDetails = changed.map((row) => {
      const before = new Set(relationshipIds(row.before));
      const after = new Set(relationshipIds(row.after));
      return {
        formation: row.formation.join('/'),
        before: row.before.rating.score,
        after: row.after.rating.score,
        gained: [...after].filter((id) => !before.has(id)),
        lost: [...before].filter((id) => !after.has(id)),
      };
    });
    const top = (key: 'before' | 'after') =>
      rows
        .slice()
        .sort(
          (left, right) =>
            (right[key].rating.score ?? 0) - (left[key].rating.score ?? 0) ||
            left.formation.join('/').localeCompare(right.formation.join('/')),
        )
        .slice(0, 50)
        .map((row) => row.formation.join('/'));
    const summary = {
      changed: changed.length,
      tierChanged: changed.filter((row) => row.before.rating.tier !== row.after.rating.tier).length,
      minimumDelta: Math.min(...changed.map((row) => (row.after.rating.score ?? 0) - (row.before.rating.score ?? 0))),
      maximumDelta: Math.max(...changed.map((row) => (row.after.rating.score ?? 0) - (row.before.rating.score ?? 0))),
      top50Changed: JSON.stringify(top('before')) !== JSON.stringify(top('after')),
      seasmokeExamples: deltaDetails
        .filter((row) => row.gained.some((id) => id.endsWith(':seasmoke')))
        .slice(0, 5),
      kalspireExamples: rows
        .flatMap((row) => {
          const before = relationships(row.before).find((result) =>
            result.id.endsWith(':stat:strength:kalspire'),
          );
          const after = relationships(row.kalspireOnly).find((result) => result.id === before?.id);
          return before &&
            after &&
            !before.abilityIds.includes('kalspire-tactical-strike') &&
            after.abilityIds.includes('kalspire-tactical-strike')
            ? [
                {
                  formation: row.formation.join('/'),
                  relationship: after.id,
                  beforeAbilityIds: before.abilityIds,
                  afterAbilityIds: after.abilityIds,
                },
              ]
            : [];
        })
        .slice(0, 5),
      formationsLosingRelationships: deltaDetails.filter((row) => row.lost.length > 0),
      perCorrection: {
        seasmoke: {
          changed: rows.filter((row) => row.before.rating.score !== row.seasmokeOnly.rating.score)
            .length,
          tierChanged: rows.filter(
            (row) => row.before.rating.tier !== row.seasmokeOnly.rating.tier,
          ).length,
        },
        kalspire: {
          changed: rows.filter((row) => row.before.rating.score !== row.kalspireOnly.rating.score)
            .length,
          tierChanged: rows.filter(
            (row) => row.before.rating.tier !== row.kalspireOnly.rating.tier,
          ).length,
        },
      },
      everyChangeTraced: rows.every(
        (row) =>
          row.after.rating.score === row.seasmokeOnly.rating.score &&
          row.after.rating.tier === row.seasmokeOnly.rating.tier &&
          row.before.rating.score === row.kalspireOnly.rating.score &&
          row.before.rating.tier === row.kalspireOnly.rating.tier,
      ),
    };
    expect(rows).toHaveLength(26_970);
    expect(summary).toMatchObject({
      changed: 351,
      tierChanged: 110,
      minimumDelta: 2,
      maximumDelta: 8,
      top50Changed: true,
      perCorrection: {
        seasmoke: { changed: 351, tierChanged: 110 },
        kalspire: { changed: 0, tierChanged: 0 },
      },
      formationsLosingRelationships: [],
      everyChangeTraced: true,
    });
    expect(summary.seasmokeExamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          formation: 'vhagar/caraxes/seasmoke',
          gained: ['amplifier-output:caraxes:stat:strength:seasmoke'],
        }),
      ]),
    );
    expect(summary.kalspireExamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          formation: 'syrax/caraxes/kalspire',
          relationship: 'amplifier-output:caraxes:stat:strength:kalspire',
          beforeAbilityIds: ['caraxes-hunters-wrath', 'kalspire-tactical-assault'],
          afterAbilityIds: [
            'caraxes-hunters-wrath',
            'kalspire-tactical-assault',
            'kalspire-tactical-strike',
          ],
        }),
      ]),
    );
    expect(summary.everyChangeTraced).toBe(true);
  }, 120_000);
});

function fixedBestPlacement(
  formation: FormationArrangementFixture,
  relationships: ReturnType<typeof buildSemanticRelationships>,
): FormationPlacementComparison {
  const value = relationshipValue(relationships);
  const candidate = { arrangement: formation, activeRelationshipValue: value, placementScore: 20, relationships };
  return { current: candidate, best: candidate, candidates: [candidate], tiedBestArrangements: [formation], valueDelta: 0, relativeDelta: 0, meaningfulImprovement: false, placementScore: 20, status: 'best' };
}
