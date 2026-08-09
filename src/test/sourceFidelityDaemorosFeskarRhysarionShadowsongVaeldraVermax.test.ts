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
  daemoros: ['daemoros-shadowflame', 'daemoros-warriors-zeal', 'daemoros-instill-fear', 'daemoros-powerful-reflexes', 'daemoros-shroud-of-shadows', 'daemoros-darkening-fear', 'daemoros-phantoms-veil'],
  feskar: ['feskar-calculated-assault', 'feskar-champions-brilliance', 'feskar-resilient-bond', 'feskar-insightful-allies', 'feskar-emerald-inferno', 'feskar-quick-witted', 'feskar-unyielding-grasp'],
  rhysarion: ['rhysarion-dawnsong', 'rhysarion-champions-vigor', 'rhysarion-ebbing-fury', 'rhysarion-sharp-resolve', 'rhysarion-echoing-melody', 'rhysarion-unbroken-devotion', 'rhysarion-inspiring-melody'],
  shadowsong: ['shadowsong-breath-of-fire', 'shadowsong-hunters-wrath', 'shadowsong-ensnare', 'shadowsong-blazing-onslaught', 'shadowsong-scorched-earth', 'shadowsong-dragons-intellect', 'shadowsong-blazing-conductor'],
  vaeldra: ['vaeldra-lure', 'vaeldra-warriors-resilience', 'vaeldra-dragons-valor', 'vaeldra-ensnare', 'vaeldra-tempting-distraction', 'vaeldra-infernal-force', 'vaeldra-sirens-call'],
  vermax: ['vermax-spreading-blaze', 'vermax-warriors-zeal', 'vermax-trial-by-flame', 'vermax-reactive-instincts', 'vermax-rallying-flame', 'vermax-dragons-valor', 'vermax-unyielding-resolve'],
} as const;

describe('Daemoros, Feskar, Rhysarion, Shadowsong, Vaeldra, and Vermax screenshot-source fidelity', () => {
  it('keeps all 42 canonical descriptions readable and free of screenshot boilerplate', () => {
    for (const [dragonId, ids] of Object.entries(batch)) for (const id of ids) {
      const item = ability(dragonId, id);
      expect(item.rawDescription.length).toBeGreaterThan(40);
      expect(summarizeAbility(item).plainSummary.length).toBeGreaterThan(0);
      expect(item.rawDescription).not.toMatch(/Power|Earn more Stars|Hatchery|Breedmarks|Rarity Cores|Habit Upgrades/i);
    }
  });

  it('preserves every listed Habit Level progression', () => {
    const sequences = [
      ['daemoros', 'daemoros-instill-fear', '25%, 30%, 35%, 42.5%, 50%'], ['daemoros', 'daemoros-powerful-reflexes', '16%, 19.2%, 22.4%, 27.2%, 32%'], ['daemoros', 'daemoros-shroud-of-shadows', '15%, 18%, 21%, 25.5%, 30%'], ['daemoros', 'daemoros-darkening-fear', '25%, 30%, 35%, 42.5%, 50%'], ['daemoros', 'daemoros-phantoms-veil', '-15%, -19.5%, -24%, -30%, -37.5%'],
      ['feskar', 'feskar-resilient-bond', '-6.5%, -7.8%, -9.1%, -11.05%, -13%'], ['feskar', 'feskar-insightful-allies', '10%, 12%, 14%, 17%, 20%'], ['feskar', 'feskar-emerald-inferno', '40%, 48%, 56%, 68%, 80%'], ['feskar', 'feskar-quick-witted', '16%, 19.2%, 22.4%, 27.2%, 32%'], ['feskar', 'feskar-unyielding-grasp', '10%, 13%, 16%, 20%, 25%'],
      ['rhysarion', 'rhysarion-ebbing-fury', '-27.5%, -33%, -38.5%, -46.75%, -55%'], ['rhysarion', 'rhysarion-ebbing-fury', '25%, 30%, 35%, 42.5%, 50%'], ['rhysarion', 'rhysarion-sharp-resolve', '16%, 19.2%, 22.4%, 27.2%, 32%'], ['rhysarion', 'rhysarion-echoing-melody', '60%, 72%, 84%, 102%, 120%'], ['rhysarion', 'rhysarion-unbroken-devotion', '20%, 24%, 28%, 34%, 40%'], ['rhysarion', 'rhysarion-inspiring-melody', '20%, 26%, 32%, 40%, 50%'],
      ['shadowsong', 'shadowsong-ensnare', '-18%, -21.6%, -25.2%, -30.6%, -36%'], ['shadowsong', 'shadowsong-blazing-onslaught', '15%, 18%, 21%, 25.5%, 30%'], ['shadowsong', 'shadowsong-scorched-earth', '10%, 12%, 14%, 17%, 20%'], ['shadowsong', 'shadowsong-dragons-intellect', '-5%, -6%, -7%, -8.5%, -10%'], ['shadowsong', 'shadowsong-dragons-intellect', '8.5%, 10.2%, 11.9%, 14.45%, 17%'], ['shadowsong', 'shadowsong-blazing-conductor', '40%, 52%, 64%, 80%, 100%'], ['shadowsong', 'shadowsong-blazing-conductor', '20%, 26%, 32%, 40%, 50%'], ['shadowsong', 'shadowsong-blazing-conductor', '60%, 78%, 96%, 120%, 150%'], ['shadowsong', 'shadowsong-blazing-conductor', '30%, 39%, 48%, 60%, 75%'],
      ['vaeldra', 'vaeldra-dragons-valor', '-5%, -6%, -7%, -8.5%, -10%'], ['vaeldra', 'vaeldra-dragons-valor', '8.5%, 10.2%, 11.9%, 14.45%, 17%'], ['vaeldra', 'vaeldra-ensnare', '-18%, -21.6%, -25.2%, -30.6%, -36%'], ['vaeldra', 'vaeldra-tempting-distraction', '6%, 7.2%, 8.4%, 10.2%, 12%'], ['vaeldra', 'vaeldra-infernal-force', '12%, 14.4%, 16.8%, 20.4%, 24%'], ['vaeldra', 'vaeldra-sirens-call', '-10%, -13%, -16%, -20%, -25%'], ['vaeldra', 'vaeldra-sirens-call', '40%, 52%, 64%, 80%, 100%'],
      ['vermax', 'vermax-trial-by-flame', '-5%, -6%, -7%, -8.5%, -10%'], ['vermax', 'vermax-trial-by-flame', '-10%, -12%, -14%, -17%, -20%'], ['vermax', 'vermax-trial-by-flame', '-15%, -18%, -21%, -25.5%, -30%'], ['vermax', 'vermax-reactive-instincts', '18%, 21.6%, 25.2%, 30.6%, 36%'], ['vermax', 'vermax-reactive-instincts', '9%, 10.8%, 12.6%, 15.3%, 18%'], ['vermax', 'vermax-rallying-flame', '50%, 60%, 70%, 85%, 100%'], ['vermax', 'vermax-dragons-valor', '-5%, -6%, -7%, -8.5%, -10%'], ['vermax', 'vermax-dragons-valor', '8.5%, 10.2%, 11.9%, 14.45%, 17%'], ['vermax', 'vermax-unyielding-resolve', '20%, 26%, 32%, 40%, 50%'],
    ] as const;
    for (const [dragonId, abilityId, sequence] of sequences) expect(description(dragonId, abilityId)).toContain(sequence);
  });

  it('preserves source mechanics, uncertainty, and exact canonical tag corrections', () => {
    expect(description('daemoros', 'daemoros-shadowflame')).toMatch(/Physical Damage scales with Daemoros's Strength.*target Instinct/s);
    expect(description('daemoros', 'daemoros-phantoms-veil')).toContain('does not state how the damage type is selected');
    expect(description('feskar', 'feskar-resilient-bond')).toMatch(/prose displays -6%.*table displays -6.5%/s);
    expect(description('rhysarion', 'rhysarion-dawnsong')).toContain('Rounds 2, 5, and 8');
    expect(description('rhysarion', 'rhysarion-inspiring-melody')).toMatch(/one shared activation chance.*same target/s);
    expect(description('shadowsong', 'shadowsong-scorched-earth')).toContain('does not establish whether activation is one shared roll or a separate roll per target');
    expect(description('shadowsong', 'shadowsong-blazing-conductor')).toContain('different Enemy');
    expect(description('vaeldra', 'vaeldra-tempting-distraction')).toMatch(/same target's non-Basic Physical Damage Received and Fire Damage Received/);
    expect(description('vaeldra', 'vaeldra-sirens-call')).toContain('activation-roll scope remains unresolved');
    expect(description('vermax', 'vermax-spreading-blaze')).toContain('Repeat this chance once when any Enemy deals Fire Damage, not once per Fire-damage Enemy');
    expect(description('vermax', 'vermax-reactive-instincts')).toMatch(/deterministically select.*not an activation roll/s);
    expect(description('vermax', 'vermax-rallying-flame')).toContain('Two separate source clauses');
    expect(description('vermax', 'vermax-trial-by-flame')).toContain('not the named Resistance status');
    expect(ability('feskar', 'feskar-calculated-assault').tags).toEqual(['PHYSICAL_DAMAGE_DEALT_DOWN', 'TACTICAL_DAMAGE', 'FIRE_DAMAGE', 'EXCLUDES_BASIC_ATTACKS', 'MULTI_SCHEDULE_COMMAND']);
    expect(ability('rhysarion', 'rhysarion-ebbing-fury').tags).toEqual(['DAMAGE_DEALT_DOWN', 'RECOVERY']);
    expect(ability('shadowsong', 'shadowsong-blazing-onslaught').tags).toEqual(['FIRE_DAMAGE_RECEIVED_UP', 'PHYSICAL_DAMAGE_RECEIVED_UP', 'EXCLUDES_BASIC_ATTACKS']);
    expect(ability('vaeldra', 'vaeldra-tempting-distraction').tags).toEqual(['PHYSICAL_DAMAGE_RECEIVED_UP', 'FIRE_DAMAGE_RECEIVED_UP', 'EXCLUDES_BASIC_ATTACKS']);
    expect(ability('vermax', 'vermax-trial-by-flame').tags).toEqual(['FIRE_DAMAGE_RECEIVED_DOWN', 'DAMAGE_RECEIVED_DOWN']);
    expect(ability('vermax', 'vermax-spreading-blaze').tags).toEqual(['PHYSICAL_DAMAGE', 'SPREADING_BLAZE', 'TACTICAL_DAMAGE_UP']);
  });

  it('leaves six trait descriptions and curated profiles untouched', () => {
    expect(description('daemoros', 'daemoros-warriors-zeal')).toBe('At Level 16+ and deployed in Vanguard: Daemoros Physical Damage Dealt +16%; Left Flank ally Instinct and Initiative +20.');
    expect(description('feskar', 'feskar-champions-brilliance')).toBe('At Level 16+ and deployed in Vanguard: Strength, Intelligence, and Instinct +15 for Feskar; Right Flank ally Damage Received -8%.');
    expect(description('rhysarion', 'rhysarion-champions-vigor')).toBe('At Level 16+ and deployed in Vanguard: Rhysarion Recovery Dealt +15% and Initiative +25; Right Flank ally Damage Dealt +8%.');
    expect(description('shadowsong', 'shadowsong-hunters-wrath')).toBe('At Level 16+ and deployed in Vanguard: Shadowsong Fire Damage Dealt +16%; Right Flank ally Strength and Initiative +20.');
    expect(description('vaeldra', 'vaeldra-warriors-resilience')).toBe('At Level 16+ and deployed in Vanguard: Vaeldra Damage Received -8%; Left Flank ally Tactical Damage Dealt +16%.');
    expect(description('vermax', 'vermax-warriors-zeal')).toBe('At Level 16+ and deployed in Vanguard, increase Vermax Physical Damage Dealt by 16%. Increase Instinct and Initiative of Left Flank ally by +20.');
    expect(simpleSynergyProfiles).toHaveLength(34);
    expect(simpleSynergyProfiles.flatMap((entry) => [...entry.outputs, ...entry.supports, ...entry.benefitsFrom])).toHaveLength(254);
    expect(dragons.flatMap((entry) => [entry.command, entry.trait, ...entry.habits])).toHaveLength(238);
  });
});
