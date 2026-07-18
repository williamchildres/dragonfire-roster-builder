import { describe, expect, it } from 'vitest';

import { summarizeAbility } from '../app/dragonDetailPresentation';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { rateFormation } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { buildSimpleFormationPresentation } from '../synergy/formationPresentation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { DragonSynergyProfile } from '../synergy/types';

const dragon = (id: string) => dragons.find((candidate) => candidate.id === id)!;
const ability = (dragonId: string, abilityId: string): AbilityDefinition =>
  [dragon(dragonId).command, dragon(dragonId).trait, ...dragon(dragonId).habits].find(
    (candidate) => candidate?.id === abilityId,
  )!;
const description = (dragonId: string, abilityId: string) => ability(dragonId, abilityId).rawDescription;

describe('Syrax, Vhagar, and Caraxes screenshot-source fidelity', () => {
  it('preserves every controller-reviewed Habit Level progression in canonical source data', () => {
    expect(description('syrax', 'syrax-mindful-synergy')).toContain('6.5%, 7.8%, 9.1%, 11.05%, 13%');
    expect(description('syrax', 'syrax-flight-mastery')).toContain('+6%, +7.2%, +8.4%, +10.2%, +12%');
    expect(description('syrax', 'syrax-flight-mastery')).toContain('-6%, -7.2%, -8.4%, -10.2%, -12%');
    expect(description('syrax', 'syrax-strategic-revival')).toContain('40%, 52%, 64%, 80%, 100%');
    expect(description('syrax', 'syrax-strategic-revival')).toContain('50%, 60%, 70%, 85%, 100%');
    expect(description('syrax', 'syrax-tactical-inferno')).toContain('18%, 21.6%, 25.2%, 30.6%, 36%');
    expect(description('syrax', 'syrax-mothers-mercy')).toContain('14%, 18.2%, 22.4%, 28%, 35%');

    expect(description('vhagar', 'vhagar-ancestral-shield')).toContain('-12%, -14.4%, -16.8%, -20.4%, -24%');
    expect(description('vhagar', 'vhagar-ancestral-shield')).toContain('+15%, +18%, +21%, +25.5%, +30%');
    expect(description('vhagar', 'vhagar-battle-leader')).toContain('12.5%, 15%, 17.5%, 21.25%, 25%');
    expect(description('vhagar', 'vhagar-eclipse-cover')).toContain('17.5%, 21%, 24.5%, 29.8%, 35%');
    expect(description('vhagar', 'vhagar-blazing-onslaught')).toContain('18%, 21.6%, 25.2%, 30.6%, 36%');
    expect(description('vhagar', 'vhagar-skyward-titan')).toContain('5%, 6.5%, 8%, 10%, 12.5%');
    expect(description('vhagar', 'vhagar-skyward-titan')).toContain('-2.5%, -3.25%, -4%, -5%, -6.25%');
    expect(description('vhagar', 'vhagar-skyward-titan')).toContain('100%, 130%, 160%, 200%, 250%');

    expect(description('caraxes', 'caraxes-battle-dread')).toContain('-6.5%, -7.8%, -9.1%, -11.05%, -13%');
    expect(description('caraxes', 'caraxes-dragons-flair')).toContain('12.5%, 15%, 17.5%, 21.25%, 25%');
    expect(description('caraxes', 'caraxes-crippling-inferno')).toContain('10%, 12%, 14%, 17%, 20%');
    expect(description('caraxes', 'caraxes-mass-enfeeble')).toContain('-5.5%, -6.6%, -7.7%, -9.35%, -11%');
    expect(description('caraxes', 'caraxes-blood-wyrm')).toContain('40%, 52%, 64%, 80%, 100%');
    expect(description('caraxes', 'caraxes-blood-wyrm')).toContain('8%, 10.4%, 12.8%, 16%, 20%');
  });

  it('keeps the visible prose/table discrepancies explicit', () => {
    expect(description('caraxes', 'caraxes-battle-dread')).toMatch(/prose displays -6%;.*Level 1 table displays -6\.5%/s);
    expect(description('caraxes', 'caraxes-mass-enfeeble')).toMatch(/prose displays -5%;.*Level 1 table displays -5\.5%/s);
    expect(description('vhagar', 'vhagar-eclipse-cover')).toMatch(/prose displays an 18% Level 1 activation chance;.*table displays 17\.5%/s);
    expect(description('vhagar', 'vhagar-eclipse-cover')).toContain('one shared activation chance to grant Advantage');
    expect(description('vhagar', 'vhagar-skyward-titan')).toMatch(/prose states -2% Damage Received.*Level 1 table value is -2\.5%/s);
  });

  it('corrects Syrax Recovery to Initiative in both source and curated profile data', () => {
    for (const abilityId of ['syrax-blazing-fury', 'syrax-strategic-revival']) {
      expect(description('syrax', abilityId)).toContain('Recovery is enhanced by Initiative');
      expect(description('syrax', abilityId)).not.toMatch(/Recovery is enhanced by Intelligence/i);
    }
    const recovery = simpleSynergyProfiles
      .find((profile) => profile.dragonId === 'syrax')!
      .outputs.find((signal) => signal.id === 'syrax-strategic-revival-recovery')!;
    expect(recovery.scalesWith).toEqual(['stat:initiative']);
    expect(recovery.description).toContain('Initiative');
    expect(recovery.description).not.toContain('Intelligence');
  });

  it('covers every batch ability while retaining complete traits and source mechanics', () => {
    const expected = {
      syrax: ['syrax-blazing-fury', 'syrax-sentinels-wit', 'syrax-mindful-synergy', 'syrax-flight-mastery', 'syrax-strategic-revival', 'syrax-tactical-inferno', 'syrax-mothers-mercy'],
      vhagar: ['vhagar-fiery-bonds', 'vhagar-warriors-resilience', 'vhagar-ancestral-shield', 'vhagar-battle-leader', 'vhagar-eclipse-cover', 'vhagar-blazing-onslaught', 'vhagar-skyward-titan'],
      caraxes: ['caraxes-infernal-burst', 'caraxes-hunters-wrath', 'caraxes-battle-dread', 'caraxes-dragons-flair', 'caraxes-crippling-inferno', 'caraxes-mass-enfeeble', 'caraxes-blood-wyrm'],
    } as const;
    for (const [dragonId, abilityIds] of Object.entries(expected)) {
      for (const abilityId of abilityIds) expect(description(dragonId, abilityId)?.length ?? 0).toBeGreaterThan(80);
    }
    expect(description('syrax', 'syrax-sentinels-wit')).toBe('At Level 16+ and deployed in Vanguard, increase Syrax Tactical Damage Dealt by 16%. Increase Instinct and Initiative of Left Flank ally by +20.');
    expect(description('vhagar', 'vhagar-warriors-resilience')).toBe('At Level 16+ and deployed in Vanguard: Vhagar Damage Received -8%; Left Flank ally Tactical Damage Dealt +16%.');
    expect(description('caraxes', 'caraxes-hunters-wrath')).toBe('At Level 16+ and deployed in Vanguard, increase Caraxes Fire Damage Dealt by 16%. Increase Strength and Initiative of Right Flank ally by +20.');
    expect(description('vhagar', 'vhagar-fiery-bonds')).toContain('Taunt roll scope is not stated');
    expect(description('vhagar', 'vhagar-blazing-onslaught')).toContain('Selections are independent; distinct targets are not required');
    expect(description('caraxes', 'caraxes-crippling-inferno')).toContain('independently check Slow and Burn');
  });

  it('keeps Vhagar and Caraxes profile structures unchanged and counts stable', () => {
    const profile = (id: string) => simpleSynergyProfiles.find((candidate) => candidate.dragonId === id)!;
    expect(profile('vhagar').outputs.map((signal) => signal.id)).toEqual(['vhagar-fiery-bonds-taunt', 'vhagar-fiery-bonds-physical', 'vhagar-skyward-titan-physical']);
    expect(profile('caraxes').outputs.map((signal) => signal.id)).toEqual(['caraxes-infernal-burst-fire', 'caraxes-crippling-inferno-slow', 'caraxes-crippling-inferno-burn', 'caraxes-crippling-inferno-fire']);
    expect(simpleSynergyProfiles.flatMap((entry) => [...entry.outputs, ...entry.supports, ...entry.benefitsFrom])).toHaveLength(224);
    expect(dragons.flatMap((entry) => [entry.command, entry.trait, ...entry.habits])).toHaveLength(217);
  });

  it('keeps summaries readable and excludes Power and generic upgrade boilerplate', () => {
    for (const dragonId of ['syrax', 'vhagar', 'caraxes']) {
      for (const item of [dragon(dragonId).command, dragon(dragonId).trait, ...dragon(dragonId).habits]) {
        if (!item) continue;
        const summary = summarizeAbility(item).plainSummary;
        expect(summary.length).toBeGreaterThan(0);
        expect(summary).not.toMatch(/Power|Earn more Stars|Hatchery|Breedmarks|Rarity Cores|Habit Upgrades/i);
      }
    }
  });

  it('reports the exhaustive rating delta caused only by the corrected Syrax scaling tag', () => {
    const priorProfiles: DragonSynergyProfile[] = simpleSynergyProfiles.map((profile) =>
      profile.dragonId !== 'syrax'
        ? profile
        : {
            ...profile,
            outputs: profile.outputs.map((signal) =>
              signal.id === 'syrax-strategic-revival-recovery'
                ? { ...signal, scalesWith: ['stat:intelligence'] }
                : signal,
            ),
          },
    );
    const rating = (formation: { 'left-flank': string; vanguard: string; 'right-flank': string }, profiles: DragonSynergyProfile[]) => {
      const progression = Object.fromEntries(Object.values(formation).map((id) => [id, { starRank: 10, dragonLevel: 16, combatStats: dragons.find((candidate) => candidate.id === id)?.stats ?? {} }]));
      const results = evaluateFormation({ formation, progression, profiles }).results;
      const presentation = buildSimpleFormationPresentation({ formation, dragons, mappedProfileIds: new Set(profiles.map((profile) => profile.dragonId)), results });
      const signalChipsByDragonId = Object.fromEntries(
        Object.entries(formation).map(([position, dragonId]) => [dragonId, buildFormationSignalChips({ profile: profiles.find((profile) => profile.dragonId === dragonId), position: position as 'left-flank' | 'vanguard' | 'right-flank', formation, profiles, progression })]),
      );
      return { rating: rateFormation({ formation, dragons, profiles, presentation, signalChipsByDragonId }), results };
    };
    const rows: Array<{ formation: string[]; before: ReturnType<typeof rating>; after: ReturnType<typeof rating> }> = [];
    for (const left of dragons) for (const vanguard of dragons) if (vanguard.id !== left.id) for (const right of dragons) if (right.id !== left.id && right.id !== vanguard.id) {
      const formation = { 'left-flank': left.id, vanguard: vanguard.id, 'right-flank': right.id };
      const before = rating(formation, priorProfiles);
      const after = rating(formation, simpleSynergyProfiles);
      rows.push({ formation: [left.id, vanguard.id, right.id], before, after });
    }
    const changed = rows.filter((row) => row.before.rating.score !== row.after.rating.score || row.before.rating.tier !== row.after.rating.tier);
    const top = (key: 'before' | 'after') => rows.slice().sort((left, right) => right[key].rating.score - left[key].rating.score || left.formation.join('/').localeCompare(right.formation.join('/'))).slice(0, 50).map((row) => row.formation.join('/'));
    const beforeTop50 = top('before');
    const afterTop50 = top('after');
    const representative = changed.filter((row) => {
      const ids = (value: typeof row.before) => value.results.filter((result) => result.kind === 'setup-payoff' || result.kind === 'amplifier-output').map((result) => result.id).sort().join('|');
      return ids(row.before) !== ids(row.after);
    }).slice(0, 6).map((row) => ({ formation: row.formation, before: row.before.rating.score, after: row.after.rating.score, lost: row.before.results.filter((result) => !row.after.results.some((candidate) => candidate.id === result.id)).map((result) => result.id), gained: row.after.results.filter((result) => !row.before.results.some((candidate) => candidate.id === result.id)).map((result) => result.id) }));
    const summary = { changed: changed.length, tierChanged: changed.filter((row) => row.before.rating.tier !== row.after.rating.tier).length, min: Math.min(...changed.map((row) => row.after.rating.score - row.before.rating.score)), max: Math.max(...changed.map((row) => row.after.rating.score - row.before.rating.score)), top50Changed: JSON.stringify(beforeTop50) !== JSON.stringify(afterTop50), beforeTop50, afterTop50, representative };
    expect(summary.changed).toBe(1_255);
    expect(summary.tierChanged).toBe(218);
    expect([summary.min, summary.max]).toEqual([-6, 7]);
    expect(summary.top50Changed).toBe(true);
    expect(summary.representative).toEqual(expect.arrayContaining([
      expect.objectContaining({ formation: ['syrax', 'vhagar', 'nyrena'], lost: ['amplifier-output:nyrena:stat:intelligence:syrax'] }),
      expect.objectContaining({ formation: ['syrax', 'vhagar', 'vermax'], gained: ['amplifier-output:vermax:stat:initiative:syrax'] }),
    ]));
  }, 120_000);
});
