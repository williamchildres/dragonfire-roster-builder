import { describe, expect, it } from 'vitest';

import { summarizeAbility } from '../app/dragonDetailPresentation';
import { dragons } from '../data/dragons';
import { simpleSynergyProfiles } from '../synergy/profiles';

const dragon = (id: string) => dragons.find((candidate) => candidate.id === id)!;
const ability = (dragonId: string, abilityId: string) =>
  [dragon(dragonId).command, dragon(dragonId).trait, ...dragon(dragonId).habits].find(
    (candidate) => candidate?.id === abilityId,
  )!;
const description = (dragonId: string, abilityId: string) => ability(dragonId, abilityId).rawDescription;

const batch = {
  malachite: ['malachite-wardens-rally', 'malachite-sentinels-presence', 'malachite-forests-instinct', 'malachite-wise-vigor', 'malachite-thunderous-roar', 'malachite-collective-might', 'malachite-lightning-strike'],
  venator: ['venator-feral-strike', 'venator-warriors-zeal', 'venator-hunters-bane', 'venator-dragons-might', 'venator-feral-precision', 'venator-armor-break', 'venator-desperate-ambush'],
  sheepstealer: ['sheepstealer-wild-hunt', 'sheepstealer-hunters-cunning', 'sheepstealer-stolen-flock', 'sheepstealer-dragons-cunning', 'sheepstealer-baited-kill', 'sheepstealer-wary-beast', 'sheepstealer-savage-claim'],
} as const;

describe('Malachite, Venator, and Sheepstealer screenshot-source fidelity', () => {
  it('keeps all 21 descriptions readable and free of excluded screenshot boilerplate', () => {
    for (const [dragonId, ids] of Object.entries(batch)) for (const id of ids) {
      const item = ability(dragonId, id);
      expect(item.rawDescription.length).toBeGreaterThan(40);
      expect(summarizeAbility(item).plainSummary.length).toBeGreaterThan(0);
      expect(item.rawDescription).not.toMatch(/Power|Earn more Stars|Hatchery|Breedmarks|Rarity Cores|Habit Upgrades/i);
    }
  });

  it('preserves every listed Habit Level progression', () => {
    const sequences = [
      ['malachite', 'malachite-forests-instinct', '8%, 9.6%, 11.2%, 13.6%, 16%'], ['malachite', 'malachite-forests-instinct', '-8%, -9.6%, -11.2%, -13.6%, -16%'], ['malachite', 'malachite-wise-vigor', '20%, 24%, 28%, 34%, 40%'], ['malachite', 'malachite-thunderous-roar', '10%, 12%, 14%, 17%, 20%'], ['malachite', 'malachite-collective-might', '12.5%, 15%, 17.5%, 21.25%, 25%'], ['malachite', 'malachite-lightning-strike', '40%, 52%, 64%, 80%, 100%'],
      ['venator', 'venator-hunters-bane', '-30%, -36%, -42%, -51%, -60%'], ['venator', 'venator-dragons-might', '12.5%, 15%, 17.5%, 21.25%, 25%'], ['venator', 'venator-feral-precision', '40%, 42%, 44%, 47%, 50%'], ['venator', 'venator-feral-precision', '20%, 24%, 28%, 34%, 40%'], ['venator', 'venator-armor-break', '8%, 9.6%, 11.2%, 13.6%, 16%'], ['venator', 'venator-desperate-ambush', '60%, 78%, 96%, 120%, 150%'], ['venator', 'venator-desperate-ambush', '12%, 15.6%, 19.2%, 24%, 30%'],
      ['sheepstealer', 'sheepstealer-stolen-flock', '10%, 12%, 14%, 17%, 20%'], ['sheepstealer', 'sheepstealer-stolen-flock', '3%, 3.6%, 4.2%, 5.1%, 6%'], ['sheepstealer', 'sheepstealer-dragons-cunning', '16%, 19.2%, 22.4%, 27.2%, 32%'], ['sheepstealer', 'sheepstealer-dragons-cunning', '-12%, -14.4%, -16.8%, -20.4%, -24%'], ['sheepstealer', 'sheepstealer-baited-kill', '25%, 30%, 35%, 42.5%, 50%'], ['sheepstealer', 'sheepstealer-baited-kill', '50%, 60%, 70%, 85%, 100%'], ['sheepstealer', 'sheepstealer-wary-beast', '10%, 12%, 14%, 17%, 20%'], ['sheepstealer', 'sheepstealer-wary-beast', '-10%, -12%, -14%, -17%, -20%'], ['sheepstealer', 'sheepstealer-savage-claim', '24%, 31.2%, 38.4%, 48%, 60%'], ['sheepstealer', 'sheepstealer-savage-claim', '10%, 13%, 16%, 20%, 25%'],
    ] as const;
    for (const [dragonId, abilityId, sequence] of sequences) expect(description(dragonId, abilityId)).toContain(sequence);
  });

  it('preserves source mechanics, uncertainty, and exact tag corrections', () => {
    expect(description('malachite', 'malachite-wardens-rally')).toMatch(/Instinct.*target's Intelligence.*Recovery.*scales with Dragon Level/s);
    expect(description('malachite', 'malachite-lightning-strike')).toMatch(/one shared activation chance.*all three effects/s);
    expect(description('venator', 'venator-feral-strike')).toMatch(/two Physical Damage instances.*each instance independently selects/s);
    expect(description('venator', 'venator-feral-precision')).toMatch(/Replace, rather than add another roll/s);
    expect(description('venator', 'venator-hunters-bane')).toContain('screenshot does not state a duration');
    expect(description('venator', 'venator-armor-break')).toContain('one opposing Enemy');
    expect(description('venator', 'venator-armor-break')).not.toMatch(/same lane/i);
    expect(description('venator', 'venator-desperate-ambush')).toMatch(/same selected target.*Overwhelm/s);
    expect(description('sheepstealer', 'sheepstealer-wild-hunt')).toMatch(/received Recovery within the previous round.*Prey lasts three rounds.*reduces Recovery Received by 30%.*At 10 Stars/s);
    expect(description('sheepstealer', 'sheepstealer-wild-hunt')).toMatch(/At 10 Stars, Each Round while Sheepstealer has a current Prey/);
    expect(description('sheepstealer', 'sheepstealer-baited-kill')).toContain('screenshot does not state a Vulnerable duration');
    expect(ability('malachite', 'malachite-thunderous-roar').tags).toContain('ADVANTAGE');
    expect(ability('venator', 'venator-feral-precision').tags).toContain('DOUBLE_STRIKE');
    expect(ability('venator', 'venator-armor-break').tags).toEqual(['PHYSICAL_DAMAGE_RECEIVED_UP']);
    expect(ability('sheepstealer', 'sheepstealer-hunters-cunning').tags).toEqual(['VANGUARD_REQUIRED', 'RECOVERY_RECEIVED_UP', 'INTELLIGENCE_UP', 'PHYSICAL_DAMAGE_UP', 'RIGHT_FLANK_TARGET']);
    expect(ability('sheepstealer', 'sheepstealer-baited-kill').tags).toContain('CLEANSE_NEGATIVE');
    expect(ability('sheepstealer', 'sheepstealer-baited-kill').tags).not.toContain('CLEANSE_POSITIVE');
  });

  it('leaves trait wording and curated-profile structure untouched', () => {
    expect(description('malachite', 'malachite-sentinels-presence')).toBe('At Level 16+ and deployed in the Vanguard Increase your Recovery Dealt by +15% and Instinct by +25. Increase Fire Damage Dealt by +16% of the Ally deployed in the Left Flank.');
    expect(description('venator', 'venator-warriors-zeal')).toBe('At Level 16+ and deployed in Vanguard: increase Venator Physical Damage from Commands and Habits by 16%; Left Flank ally Instinct and Initiative +20.');
    expect(description('sheepstealer', 'sheepstealer-hunters-cunning')).toBe('At Level 16+ and deployed in Vanguard, increase self Recovery Received +20%, self Intelligence +25, and Right Flank ally Physical Damage Dealt +10%.');
    expect(simpleSynergyProfiles).toHaveLength(33);
    expect(simpleSynergyProfiles.flatMap((entry) => [...entry.outputs, ...entry.supports, ...entry.benefitsFrom])).toHaveLength(239);
    expect(dragons.flatMap((entry) => [entry.command, entry.trait, ...entry.habits])).toHaveLength(231);
  });
});
