/// <reference types="node" />

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { SYNERGY_TAGS } from '../synergy/tags';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
  SimpleSynergyResultKind,
} from '../synergy/types';

const unlockedProgression: SimpleProgressionByDragonId = {
  caraxes: { starRank: 10, dragonLevel: 16 },
  daemoros: { starRank: 10, dragonLevel: 16 },
  malachite: { starRank: 10, dragonLevel: 16 },
  shadowsong: { starRank: 10, dragonLevel: 16 },
  sheepstealer: { starRank: 10, dragonLevel: 16 },
  syrax: { starRank: 10, dragonLevel: 16 },
};

const emptyFormation = (): SimpleFormation => ({
  'left-flank': null,
  vanguard: null,
  'right-flank': null,
});

const formation = (
  left: string | null,
  vanguard: string | null,
  right: string | null,
): SimpleFormation => ({
  'left-flank': left,
  vanguard,
  'right-flank': right,
});

function evaluate(
  selectedFormation: SimpleFormation,
  progression: SimpleProgressionByDragonId = unlockedProgression,
  profiles: DragonSynergyProfile[] = simpleSynergyProfiles,
) {
  return evaluateFormation({
    formation: selectedFormation,
    progression,
    profiles,
  }).results;
}

function resultOfKind(kind: SimpleSynergyResultKind, results = evaluate(emptyFormation())) {
  return results.filter((result) => result.kind === kind);
}

describe('simple synergy foundation', () => {
  it('matches Daemoros Panic output to Shadowsong Panic benefit', () => {
    const results = evaluate(formation('daemoros', 'shadowsong', null));

    expect(resultOfKind('setup-payoff', results)).toEqual([
      expect.objectContaining({
        id: 'setup-payoff:daemoros:daemoros-instill-fear:status:panic:shadowsong:shadowsong-breath-of-fire',
        explanation: "Daemoros applies Panic, which improves Shadowsong's Breath of Fire.",
      }),
    ]);
  });

  it('progression-locks the Daemoros and Shadowsong relationship before Instill Fear unlocks', () => {
    const results = evaluate(formation('daemoros', 'shadowsong', null), {
      ...unlockedProgression,
      daemoros: { starRank: 1, dragonLevel: 16 },
    });

    expect(resultOfKind('progression-locked', results)).toEqual([
      expect.objectContaining({
        explanation: 'This relationship unlocks when Daemoros reaches Star Rank 2.',
        unlock: { minimumStarRank: 2 },
      }),
    ]);
    expect(resultOfKind('missing-enabler', results)).toHaveLength(0);
  });

  it('reports Shadowsong missing a Panic enabler when no selected teammate provides Panic', () => {
    const results = evaluate(formation('shadowsong', 'caraxes', null));

    expect(resultOfKind('missing-enabler', results)).toContainEqual(
      expect.objectContaining({
        id: 'missing-enabler:shadowsong:shadowsong-breath-of-fire:status:panic',
        explanation: 'Shadowsong benefits from Panic, but this formation has no Panic provider.',
      }),
    );
  });

  it('reports Caraxes missing a First-Strike enabler with grammatical tag-label wording', () => {
    const results = evaluate(formation('caraxes', null, null));

    expect(resultOfKind('missing-enabler', results)).toContainEqual(
      expect.objectContaining({
        id: 'missing-enabler:caraxes:caraxes-infernal-burst:status:first-strike',
        explanation: 'Caraxes benefits from First-Strike, but this formation has no First-Strike provider.',
      }),
    );
  });

  it('matches Syrax First-Strike to Caraxes First-Strike benefit', () => {
    const results = evaluate(formation('syrax', 'caraxes', null));

    expect(resultOfKind('setup-payoff', results)).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:syrax:syrax-blazing-fury:status:first-strike:caraxes:caraxes-infernal-burst',
        explanation: "Syrax can grant First-Strike, which improves Caraxes's Infernal Burst.",
      }),
    );
  });

  it('matches Syrax Fire Damage support to Caraxes Fire Damage output', () => {
    const results = evaluate(formation('syrax', 'caraxes', null));

    expect(resultOfKind('amplifier-output', results)).toContainEqual(
      expect.objectContaining({
        id: 'amplifier-output:syrax:syrax-blazing-fury:damage:fire:caraxes:caraxes-infernal-burst',
        explanation: 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.',
      }),
    );
  });

  it("matches Malachite Recovery to Sheepstealer's Recovery benefit when Hunter's Cunning is unlocked and Vanguard", () => {
    const results = evaluate(formation('malachite', 'sheepstealer', null));

    expect(resultOfKind('setup-payoff', results)).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:malachite:malachite-wardens-rally:effect:recovery:sheepstealer:sheepstealer-hunters-cunning',
        explanation: "Malachite provides Recovery, which Sheepstealer benefits from through Hunter's Cunning.",
      }),
    );
  });

  it("progression-locks Sheepstealer's Recovery relationship below Dragon Level 16", () => {
    const results = evaluate(formation('malachite', 'sheepstealer', null), {
      ...unlockedProgression,
      sheepstealer: { starRank: 10, dragonLevel: 15 },
    });

    expect(resultOfKind('progression-locked', results)).toContainEqual(
      expect.objectContaining({
        explanation: 'This relationship unlocks when Sheepstealer reaches Dragon Level 16.',
        unlock: { minimumDragonLevel: 16 },
      }),
    );
  });

  it("position-blocks Sheepstealer's Recovery relationship outside Vanguard", () => {
    const results = evaluate(formation('sheepstealer', 'malachite', null));

    expect(resultOfKind('position-blocked', results)).toContainEqual(
      expect.objectContaining({
        id: 'position-blocked:setup-payoff:malachite:malachite-wardens-rally:effect:recovery:sheepstealer:sheepstealer-hunters-cunning',
        explanation: "Sheepstealer must be deployed in Vanguard for Hunter's Cunning.",
      }),
    );
    expect(resultOfKind('position-blocked', results).map((result) => result.explanation)).not.toContain(
      'Malachite and Sheepstealer are not adjacent in this formation.',
    );
  });

  it("reports Sheepstealer missing a Recovery provider when Hunter's Cunning is unlocked and Vanguard", () => {
    const results = evaluate(formation(null, 'sheepstealer', null));

    expect(resultOfKind('missing-enabler', results)).toContainEqual(
      expect.objectContaining({
        id: 'missing-enabler:sheepstealer:sheepstealer-hunters-cunning:effect:recovery',
        explanation: 'Sheepstealer benefits from Recovery, but this formation has no Recovery provider.',
      }),
    );
  });

  it('allows Malachite Lightning Strike to support an adjacent Caraxes', () => {
    const results = evaluate(formation('caraxes', 'malachite', null));

    expect(resultOfKind('setup-payoff', results)).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:malachite:malachite-lightning-strike:status:first-strike:caraxes:caraxes-infernal-burst',
      }),
    );
  });

  it('blocks Malachite Lightning Strike from supporting Caraxes on opposite flanks', () => {
    const results = evaluate(formation('malachite', null, 'caraxes'));

    expect(resultOfKind('position-blocked', results)).toContainEqual(
      expect.objectContaining({
        id: 'position-blocked:setup-payoff:malachite:malachite-lightning-strike:status:first-strike:caraxes:caraxes-infernal-burst',
        explanation: 'Malachite and Caraxes are not adjacent in this formation.',
      }),
    );
  });

  it("reports a Vanguard conflict when Caraxes and Sheepstealer's Level 16 traits are both unlocked", () => {
    const results = evaluate(formation('caraxes', 'sheepstealer', null));

    expect(resultOfKind('position-conflict', results)).toEqual([
      expect.objectContaining({
        explanation:
          "Caraxes's Hunter's Wrath and Sheepstealer's Hunter's Cunning both require Vanguard; only one dragon can receive that positional benefit.",
      }),
    ]);
  });

  it('identifies provider ability and required position for provider-position blocks', () => {
    const profiles: DragonSynergyProfile[] = [
      {
        dragonId: 'provider',
        dragonName: 'Provider',
        outputs: [
          {
            id: 'provider-output',
            tag: 'status:first-strike',
            abilityId: 'provider-vanguard-output',
            abilityName: 'Provider Vanguard Output',
            description: 'grants First-Strike',
            requiredSelfPosition: 'vanguard',
            confidence: 'verified',
          },
        ],
        supports: [],
        benefitsFrom: [],
        positionClaims: [],
      },
      {
        dragonId: 'beneficiary',
        dragonName: 'Beneficiary',
        outputs: [],
        supports: [],
        benefitsFrom: [
          {
            id: 'beneficiary-payoff',
            tag: 'status:first-strike',
            abilityId: 'beneficiary-payoff',
            abilityName: 'Beneficiary Payoff',
            description: 'benefits from First-Strike',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];

    const results = evaluate(formation('provider', 'beneficiary', null), {}, profiles);

    expect(resultOfKind('position-blocked', results)).toEqual([
      expect.objectContaining({
        explanation: 'Provider must be deployed in Vanguard for Provider Vanguard Output.',
      }),
    ]);
  });

  it('does not create teammate synergy with itself', () => {
    const selfProfile: DragonSynergyProfile = {
      dragonId: 'solo',
      dragonName: 'Solo',
      outputs: [
        {
          id: 'solo-first-strike',
          tag: 'status:first-strike',
          abilityId: 'solo-output',
          abilityName: 'Solo Output',
          description: 'grants First-Strike',
          confidence: 'verified',
        },
      ],
      supports: [],
      benefitsFrom: [
        {
          id: 'solo-first-strike-benefit',
          tag: 'status:first-strike',
          abilityId: 'solo-benefit',
          abilityName: 'Solo Benefit',
          description: 'benefits from First-Strike',
          confidence: 'verified',
        },
      ],
      positionClaims: [],
    };

    expect(evaluate(formation('solo', null, null), {}, [selfProfile])).toHaveLength(0);
  });

  it('does not let self-scoped signals enable or support another dragon', () => {
    const profiles: DragonSynergyProfile[] = [
      {
        dragonId: 'self-provider',
        dragonName: 'Self Provider',
        outputs: [
          {
            id: 'self-provider-first-strike',
            tag: 'status:first-strike',
            abilityId: 'self-provider-first-strike',
            abilityName: 'Self Provider First-Strike',
            description: 'grants First-Strike to self',
            friendlyScope: 'self',
            confidence: 'verified',
          },
        ],
        supports: [
          {
            id: 'self-provider-fire-support',
            tag: 'damage:fire',
            abilityId: 'self-provider-fire-support',
            abilityName: 'Self Provider Fire Support',
            description: 'improves own Fire Damage',
            friendlyScope: 'self',
            confidence: 'verified',
          },
        ],
        benefitsFrom: [],
        positionClaims: [],
      },
      {
        dragonId: 'teammate',
        dragonName: 'Teammate',
        outputs: [
          {
            id: 'teammate-fire',
            tag: 'damage:fire',
            abilityId: 'teammate-fire',
            abilityName: 'Teammate Fire',
            description: 'deals Fire Damage',
            confidence: 'verified',
          },
        ],
        supports: [],
        benefitsFrom: [
          {
            id: 'teammate-first-strike-payoff',
            tag: 'status:first-strike',
            abilityId: 'teammate-first-strike-payoff',
            abilityName: 'Teammate First-Strike Payoff',
            description: 'benefits from First-Strike',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];

    const results = evaluate(formation('self-provider', 'teammate', null), {}, profiles);

    expect(resultOfKind('setup-payoff', results)).toHaveLength(0);
    expect(resultOfKind('amplifier-output', results)).toHaveLength(0);
  });

  it('deduplicates semantically identical relationships', () => {
    const profiles: DragonSynergyProfile[] = [
      {
        dragonId: 'provider',
        dragonName: 'Provider',
        outputs: [
          {
            id: 'provider-one',
            tag: 'status:panic',
            abilityId: 'provider-panic',
            abilityName: 'Provider Panic',
            description: 'applies Panic',
            confidence: 'verified',
          },
          {
            id: 'provider-two',
            tag: 'status:panic',
            abilityId: 'provider-panic',
            abilityName: 'Provider Panic',
            description: 'applies Panic',
            confidence: 'verified',
          },
        ],
        supports: [],
        benefitsFrom: [],
        positionClaims: [],
      },
      {
        dragonId: 'beneficiary',
        dragonName: 'Beneficiary',
        outputs: [],
        supports: [],
        benefitsFrom: [
          {
            id: 'beneficiary-one',
            tag: 'status:panic',
            abilityId: 'beneficiary-payoff',
            abilityName: 'Beneficiary Payoff',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
          {
            id: 'beneficiary-two',
            tag: 'status:panic',
            abilityId: 'beneficiary-payoff',
            abilityName: 'Beneficiary Payoff',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];

    expect(resultOfKind('setup-payoff', evaluate(formation('provider', 'beneficiary', null), {}, profiles))).toHaveLength(1);
  });

  it('returns deterministic result ordering and IDs', () => {
    const selectedFormation = formation('syrax', 'caraxes', 'shadowsong');
    const first = evaluate(selectedFormation);
    const second = evaluate(selectedFormation);

    expect(second.map((result) => result.id)).toEqual(first.map((result) => result.id));
    expect(first.map((result) => result.kind)).toEqual([
      'setup-payoff',
      'amplifier-output',
      'missing-enabler',
    ]);
  });

  it('references existing dragon IDs and ability IDs from every simple profile', () => {
    const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));

    for (const profile of simpleSynergyProfiles) {
      const dragon = dragonsById.get(profile.dragonId);
      expect(dragon, profile.dragonId).toBeDefined();

      const abilityIds = new Set(
        [dragon?.command, dragon?.trait, ...(dragon?.habits ?? [])]
          .filter((ability): ability is AbilityDefinition => ability !== null && ability !== undefined)
          .map((ability) => ability.id),
      );

      for (const signal of [...profile.outputs, ...profile.supports, ...profile.benefitsFrom]) {
        expect(abilityIds.has(signal.abilityId), `${profile.dragonId}:${signal.abilityId}`).toBe(true);
      }

      for (const claim of profile.positionClaims) {
        expect(abilityIds.has(claim.abilityId), `${profile.dragonId}:${claim.abilityId}`).toBe(true);
      }
    }
  });

  it('uses only declared tags in every signal', () => {
    for (const profile of simpleSynergyProfiles) {
      for (const signal of [...profile.outputs, ...profile.supports, ...profile.benefitsFrom]) {
        expect(SYNERGY_TAGS).toContain(signal.tag);
      }
    }
  });

  it('keeps the new domain independent from legacy trace and capability modules', () => {
    const synergyRoot = join(__dirname, '..', 'synergy');
    const files = collectFiles(synergyRoot).filter((file) => file.endsWith('.ts'));
    const prohibited = [
      'effectCapabilities',
      'synergyTrace',
      'formationCardAnalysis',
      'normalUnmetRequirements',
      'SynergyTrace',
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const term of prohibited) {
        expect(source.includes(term), `${file} contains ${term}`).toBe(false);
      }
    }
  });
});

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}
