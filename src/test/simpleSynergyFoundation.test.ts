import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { metadataOnlyDragonIds, simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { CONTROL_ALIAS_TAGS, SYNERGY_TAG_LABELS, SYNERGY_TAGS } from '../synergy/tags';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
  SimpleSynergyResultKind,
  SynergySignal,
} from '../synergy/types';

const detailedDragons = dragons.filter((dragon) => dragon.command || dragon.trait || dragon.habits.length > 0);
const metadataOnlyDragons = dragons.filter((dragon) => !dragon.command && !dragon.trait && dragon.habits.length === 0);

const unlockedProgression: SimpleProgressionByDragonId = Object.fromEntries(
  detailedDragons.map((dragon) => [dragon.id, { starRank: 10, dragonLevel: 16 }]),
);

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

function resultsOfKind(kind: SimpleSynergyResultKind, results = evaluate(formation(null, null, null))) {
  return results.filter((result) => result.kind === kind);
}

function allSignals(profile: DragonSynergyProfile) {
  return [...profile.outputs, ...profile.supports, ...profile.benefitsFrom];
}

function signalTags(signal: SynergySignal) {
  return signal.tags ?? [signal.tag];
}

describe('simple synergy foundation', () => {
  it('covers every detailed dragon and excludes metadata-only dragons', () => {
    expect(dragons).toHaveLength(30);
    expect(detailedDragons.map((dragon) => dragon.name)).toEqual([
      'Syrax',
      'Vhagar',
      'Caraxes',
      'Seasmoke',
      'Crimson',
      'Kalspire',
      'Malachite',
      'Venator',
      'Daemoros',
      'Feskar',
      'Rhysarion',
      'Shadowsong',
      'Tashix',
      'Vaeldra',
      'Velar',
      'Zivern',
      'Sheepstealer',
      'Vermax',
    ]);
    expect(metadataOnlyDragons.map((dragon) => dragon.name)).toEqual([
      'Solstryker',
      'Antares',
      'Shimmer',
      'Jagadrix',
      'Bevlorin',
      'Shadowrend',
      'Thunderstrike',
      'Vesper',
      'Arulix',
      'Nyrena',
      'Dawnseeker',
      'Arrax',
    ]);
    expect(metadataOnlyDragons.map((dragon) => dragon.id).sort()).toEqual([...metadataOnlyDragonIds].sort());
    expect(simpleSynergyProfiles.map((profile) => profile.dragonId).sort()).toEqual(
      detailedDragons.map((dragon) => dragon.id).sort(),
    );
    expect(new Set(simpleSynergyProfiles.map((profile) => profile.dragonId)).size).toBe(simpleSynergyProfiles.length);
  });

  it('references existing dragon IDs and ability IDs from every simple profile', () => {
    const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));

    for (const profile of simpleSynergyProfiles) {
      const dragon = dragonsById.get(profile.dragonId);
      expect(dragon, profile.dragonId).toBeDefined();

      const abilityIds = new Set(
        ([dragon?.command, dragon?.trait, ...(dragon?.habits ?? [])] as Array<AbilityDefinition | null | undefined>)
          .filter((ability): ability is AbilityDefinition => ability !== null && ability !== undefined)
          .map((ability) => ability.id),
      );

      for (const signal of allSignals(profile)) {
        expect(abilityIds.has(signal.abilityId), `${profile.dragonId}:${signal.abilityId}`).toBe(true);
      }

      for (const positionClaim of profile.positionClaims) {
        expect(abilityIds.has(positionClaim.abilityId), `${profile.dragonId}:${positionClaim.abilityId}`).toBe(true);
      }
    }
  });

  it('reviewed every detailed ability exactly once and ties represented entries to profile signals', () => {
    const canonicalAbilityIds = detailedDragons.flatMap((dragon) =>
      ([dragon.command, dragon.trait, ...dragon.habits] as Array<AbilityDefinition | null>)
        .filter((ability): ability is AbilityDefinition => ability !== null && ability !== undefined)
        .map((ability) => ability.id),
    );
    const reviewedAbilityIds = simpleSynergyAbilityReviews.map((review) => review.abilityId);
    const profileSignalIds = new Set(
      simpleSynergyProfiles.flatMap((profile) => [
        ...allSignals(profile).map((signal) => signal.id),
        ...profile.positionClaims.map((claim) => claim.id),
      ]),
    );
    const referencedSignalIds = new Set<string>();

    expect(reviewedAbilityIds.sort()).toEqual(canonicalAbilityIds.sort());
    expect(new Set(reviewedAbilityIds).size).toBe(reviewedAbilityIds.length);

    for (const review of simpleSynergyAbilityReviews) {
      const disposition = review.disposition;
      expect(disposition.rationale.length).toBeGreaterThan(0);
      if (disposition.kind === 'represented' || disposition.kind === 'reinforces-existing') {
        for (const signalId of disposition.signalIds) {
          expect(profileSignalIds.has(signalId), `${review.abilityId}:${signalId}`).toBe(true);
          referencedSignalIds.add(signalId);
        }
      }
    }

    expect([...profileSignalIds].filter((signalId) => !referencedSignalIds.has(signalId))).toEqual([]);
  });

  it('keeps the controlled vocabulary declared, labeled, and used', () => {
    const usedTags = new Set(
      simpleSynergyProfiles.flatMap((profile) => allSignals(profile).flatMap((signal) => signalTags(signal))),
    );

    for (const tag of usedTags) {
      expect(SYNERGY_TAGS).toContain(tag);
      expect(SYNERGY_TAG_LABELS[tag]).toBeTruthy();
    }
    for (const tag of SYNERGY_TAGS) {
      expect(SYNERGY_TAG_LABELS[tag]).toBeTruthy();
      expect(usedTags.has(tag), `${tag} is unused`).toBe(true);
    }
    expect(CONTROL_ALIAS_TAGS).toEqual(['status:stun', 'status:stagger', 'status:overwhelm', 'status:confusion']);
  });

  it('stores complete screenshot-verified records for the final three Epic dragons', () => {
    for (const id of ['tashix', 'velar', 'zivern']) {
      const dragon = dragons.find((candidate) => candidate.id === id)!;
      const abilities = ([dragon.command, dragon.trait, ...dragon.habits] as Array<AbilityDefinition | null>).filter(
        (ability): ability is AbilityDefinition => Boolean(ability),
      );

      expect(dragon.command, id).toBeTruthy();
      expect(dragon.trait, id).toBeTruthy();
      expect(dragon.habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);
      expect(abilities).toHaveLength(7);
      expect(abilities.every((ability) => ability.id && ability.rawDescription?.trim())).toBe(true);
      expect(abilities.every((ability) => ability.verification.status === 'screenshot-verified')).toBe(true);
      expect(abilities.every((ability) => ability.evidenceIds.length > 0)).toBe(true);
      expect(Object.values(dragon.stats).every((value) => value === null)).toBe(true);
      expect(JSON.stringify(dragon)).not.toMatch(/activationRoll|targetSelectionGroup|effectOptions|stackTransition|durationRounds/);
    }

    expect(dragons.find((dragon) => dragon.id === 'tashix')!.affinities).toMatchObject({
      Archers: 'positive',
      Siege: 'negative',
      Cavalry: 'unknown',
      Shieldbearers: 'unknown',
      Spearmen: 'unknown',
    });
    expect(dragons.find((dragon) => dragon.id === 'velar')!.affinities).toMatchObject({
      Shieldbearers: 'positive',
      Cavalry: 'unknown',
      Archers: 'unknown',
      Spearmen: 'unknown',
      Siege: 'unknown',
    });
    expect(dragons.find((dragon) => dragon.id === 'zivern')!.affinities).toMatchObject({
      Archers: 'positive',
      Siege: 'positive',
      Cavalry: 'unknown',
      Shieldbearers: 'unknown',
      Spearmen: 'unknown',
    });
  });

  it('matches the required Caraxes Slow to Syrax Strategic Revival relationship and progression-locks each side', () => {
    const active = evaluate(formation('caraxes', 'syrax', null));
    expect(resultsOfKind('setup-payoff', active)).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:caraxes:status:slow:syrax',
        explanation: "Caraxes can apply Slow, which improves Syrax's Strategic Revival Recovery.",
      }),
    );

    const caraxesLocked = evaluate(formation('caraxes', 'syrax', null), {
      ...unlockedProgression,
      caraxes: { starRank: 5, dragonLevel: 16 },
    });
    expect(resultsOfKind('progression-locked', caraxesLocked)).toContainEqual(
      expect.objectContaining({
        tag: 'status:slow',
        explanation:
          "Caraxes's Crippling Inferno Slow setup for Syrax's Strategic Revival unlocks when Caraxes reaches Star Rank 6.",
      }),
    );

    const syraxLocked = evaluate(formation('caraxes', 'syrax', null), {
      ...unlockedProgression,
      syrax: { starRank: 5, dragonLevel: 16 },
    });
    expect(resultsOfKind('progression-locked', syraxLocked)).toContainEqual(
      expect.objectContaining({
        tag: 'status:slow',
        explanation:
          "Caraxes's Crippling Inferno Slow setup for Syrax's Strategic Revival unlocks when Syrax reaches Star Rank 6.",
      }),
    );
  });

  it('models representative explicit condition families without source-bound false positives', () => {
    expect(resultsOfKind('setup-payoff', evaluate(formation('daemoros', 'shadowsong', null)))).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:daemoros:status:panic:shadowsong',
        explanation: "Daemoros applies Panic, which improves Shadowsong's Breath of Fire and Scorched Earth.",
      }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('daemoros', 'feskar', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:daemoros:status:burn:feskar' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('syrax', 'caraxes', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:syrax:status:first-strike:caraxes' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('vhagar', 'crimson', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:vhagar:status:taunt:crimson' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('crimson', 'rhysarion', null)))).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:crimson:status:control:rhysarion',
        explanation:
          "Crimson's Bloodscale Terror can apply Stun, which counts as Control and improves Rhysarion's Dawnsong.",
      }),
    );

    expect(evaluate(formation('vhagar', 'vaeldra', null)).map((result) => result.id)).not.toContain(
      'setup-payoff:vhagar:status:taunt:vaeldra',
    );
    expect(evaluate(formation('crimson', 'vermax', null)).map((result) => result.id)).not.toContain(
      'setup-payoff:crimson:status:weakened:vermax',
    );
    expect(evaluate(formation('rhysarion', 'sheepstealer', null)).map((result) => result.id)).not.toContain(
      'setup-payoff:rhysarion:effect:recovery:sheepstealer-prey',
    );
  });

  it('matches representative damage, vulnerability, Recovery, and stat support channels', () => {
    expect(resultsOfKind('amplifier-output', evaluate(formation('vhagar', 'venator', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:vhagar:damage:physical:venator' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'kalspire', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:damage:tactical:kalspire' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('caraxes', 'malachite', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:malachite:damage:fire:caraxes' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('rhysarion', 'malachite', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:rhysarion:effect:recovery:malachite' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('venator', 'vhagar', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:venator:damage:physical:vhagar' }),
    );

    expect(resultsOfKind('amplifier-output', evaluate(formation('malachite', 'venator', null)))).toContainEqual(
      expect.objectContaining({ tag: 'stat:strength' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('feskar', 'syrax', null)))).toContainEqual(
      expect.objectContaining({ tag: 'stat:instinct' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'caraxes', null)))).toContainEqual(
      expect.objectContaining({ tag: 'stat:intelligence' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation(null, 'caraxes', 'syrax')))).toContainEqual(
      expect.objectContaining({ tag: 'stat:initiative' }),
    );

    expect(
      resultsOfKind('amplifier-output', evaluate(formation('malachite', 'caraxes', null))).some(
        (result) => result.tag === 'stat:strength' && result.dragonIds.includes('caraxes'),
      ),
    ).toBe(false);
  });

  it('enforces hard recipient positions while leaving preferred flank supports flexible', () => {
    const leftSupported = resultsOfKind('amplifier-output', evaluate(formation('caraxes', 'malachite', null)));
    expect(leftSupported).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:malachite:damage:fire:caraxes' }),
    );

    const wrongRecipient = evaluate(formation(null, 'malachite', 'caraxes'), {
      ...unlockedProgression,
      malachite: { starRank: 5, dragonLevel: 16 },
    });
    expect(resultsOfKind('position-blocked', wrongRecipient)).toContainEqual(
      expect.objectContaining({
        explanation: "Caraxes must be deployed in Left Flank to receive Malachite's Sentinel's Presence.",
      }),
    );

    const rightSupported = resultsOfKind('amplifier-output', evaluate(formation(null, 'caraxes', 'vhagar')));
    expect(rightSupported).toContainEqual(expect.objectContaining({ tag: 'stat:strength' }));

    const preferredFlankFallback = evaluate(formation('syrax', 'kalspire', null));
    expect(resultsOfKind('position-blocked', preferredFlankFallback).map((result) => result.abilityIds)).not.toContainEqual(
      expect.arrayContaining(['syrax-tactical-inferno', 'kalspire-tactical-strike']),
    );
  });

  it('preserves adjacency placement checks', () => {
    expect(resultsOfKind('setup-payoff', evaluate(formation('caraxes', 'malachite', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:malachite:status:first-strike:caraxes' }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('malachite', null, 'caraxes')))).toContainEqual(
      expect.objectContaining({ explanation: 'Malachite and Caraxes are not adjacent in this formation.' }),
    );
  });

  it('groups position conflicts and missing enablers deterministically', () => {
    const conflict = resultsOfKind('position-conflict', evaluate(formation('daemoros', 'syrax', 'caraxes')));
    expect(conflict).toEqual([
      expect.objectContaining({
        dragonIds: ['daemoros', 'syrax', 'caraxes'],
        explanation:
          "Daemoros's Warrior's Zeal, Syrax's Sentinel's Wit, and Caraxes's Hunter's Wrath require Vanguard; only one dragon can receive that positional benefit.",
      }),
    ]);

    const duplicateMissingProfiles: DragonSynergyProfile[] = [
      {
        dragonId: 'beneficiary',
        dragonName: 'Beneficiary',
        outputs: [],
        supports: [],
        benefitsFrom: [
          {
            id: 'beneficiary-panic-one',
            tag: 'status:panic',
            abilityId: 'beneficiary-one',
            abilityName: 'One',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
          {
            id: 'beneficiary-panic-two',
            tag: 'status:panic',
            abilityId: 'beneficiary-two',
            abilityName: 'Two',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];

    expect(resultsOfKind('missing-enabler', evaluate(formation('beneficiary', null, null), {}, duplicateMissingProfiles))).toHaveLength(1);
  });

  it('deduplicates repeated setup/payoff providers and beneficiary abilities', () => {
    const profiles: DragonSynergyProfile[] = [
      {
        dragonId: 'provider',
        dragonName: 'Provider',
        outputs: [
          {
            id: 'provider-one',
            tag: 'status:panic',
            abilityId: 'provider-one',
            abilityName: 'Provider One',
            description: 'applies Panic',
            confidence: 'verified',
          },
          {
            id: 'provider-two',
            tag: 'status:panic',
            abilityId: 'provider-two',
            abilityName: 'Provider Two',
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
            abilityId: 'beneficiary-one',
            abilityName: 'Beneficiary One',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
          {
            id: 'beneficiary-two',
            tag: 'status:panic',
            abilityId: 'beneficiary-two',
            abilityName: 'Beneficiary Two',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];

    expect(resultsOfKind('setup-payoff', evaluate(formation('provider', 'beneficiary', null), {}, profiles))).toHaveLength(1);
  });

  it('aggregates repeated Syrax and Caraxes Fire paths while keeping other tags separate at full progression', () => {
    const results = evaluate(formation('syrax', 'caraxes', null));
    const fireResults = results.filter(
      (result) =>
        result.kind === 'amplifier-output' &&
        result.tag === 'damage:fire' &&
        result.dragonIds[0] === 'syrax' &&
        result.dragonIds[1] === 'caraxes',
    );

    expect(fireResults).toEqual([
      expect.objectContaining({
        id: 'amplifier-output:syrax:damage:fire:caraxes',
        explanation: 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.',
        abilityIds: ['caraxes-crippling-inferno', 'caraxes-infernal-burst', 'syrax-blazing-fury', 'syrax-tactical-inferno'],
      }),
    ]);
    expect(results.filter((result) => result.explanation === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(resultsOfKind('setup-payoff', results)).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:syrax:status:first-strike:caraxes' }),
    );
    expect(resultsOfKind('amplifier-output', results)).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:stat:intelligence:caraxes' }),
    );
  });

  it('models the representative Tashix relationships without unsupported Mirage or Weakened paths', () => {
    const fire = resultsOfKind('amplifier-output', evaluate(formation('syrax', 'tashix', null)));
    expect(fire).toContainEqual(expect.objectContaining({ id: 'amplifier-output:syrax:damage:fire:tashix' }));
    expect(fire).toContainEqual(expect.objectContaining({ id: 'amplifier-output:syrax:stat:intelligence:tashix' }));

    expect(resultsOfKind('setup-payoff', evaluate(formation('malachite', 'tashix', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:malachite:effect:recovery:tashix' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('caraxes', 'tashix', 'venator')))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:tashix:damage:physical:venator' }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('tashix', 'caraxes', 'venator'), {
      ...unlockedProgression,
      tashix: { starRank: 3, dragonLevel: 16 },
    }))).toContainEqual(
      expect.objectContaining({ explanation: "Tashix must be deployed in Vanguard for Hunter's Cunning." }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('venator', 'tashix', 'syrax'), {
      ...unlockedProgression,
      tashix: { starRank: 3, dragonLevel: 16 },
    }))).toContainEqual(
      expect.objectContaining({ explanation: "Venator must be deployed in Right Flank to receive Tashix's Hunter's Cunning." }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('tashix', 'venator', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:tashix:damage:physical:venator' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('tashix', 'caraxes', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:tashix:damage:fire:caraxes' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'tashix', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:stat:initiative:tashix' }),
    );

    const tashixSignals = simpleSynergyProfiles.find((profile) => profile.dragonId === 'tashix')!;
    expect(allSignals(tashixSignals).map((signal) => signal.id)).not.toEqual(
      expect.arrayContaining(['tashix-cunning-ruse-weakened', 'tashix-mirage']),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('tashix', 'caraxes', null))).filter((result) => result.tag === 'damage:fire')).toHaveLength(1);
  });

  it('models the representative Velar relationships and keeps Advantage and Cleanse implicit', () => {
    expect(resultsOfKind('amplifier-output', evaluate(formation('velar', 'kalspire', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:velar:damage:tactical:kalspire' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('velar', 'caraxes', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:velar:status:first-strike:caraxes' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('velar', 'syrax', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:velar:status:slow:syrax' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('velar', 'sheepstealer', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:velar:effect:recovery:sheepstealer' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('velar', 'venator', null)))).toContainEqual(
      expect.objectContaining({ tag: 'stat:strength' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'velar', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:stat:initiative:velar' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('kalspire', 'velar', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:velar:damage:tactical:kalspire' }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('velar', 'caraxes', 'syrax')))).toContainEqual(
      expect.objectContaining({ explanation: "Velar must be deployed in Vanguard for Sentinel's Wit." }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('caraxes', 'velar', 'syrax')))).toContainEqual(
      expect.objectContaining({ explanation: "Syrax must be deployed in Left Flank to receive Velar's Sentinel's Wit." }),
    );

    const velarTags = allSignals(simpleSynergyProfiles.find((profile) => profile.dragonId === 'velar')!).flatMap(signalTags);
    expect(velarTags).not.toEqual(expect.arrayContaining(['status:advantage', 'effect:cleanse']));
  });

  it('models the representative Zivern relationships including Overwhelm-as-Control and Vulnerable payoff', () => {
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'zivern', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:stat:instinct:zivern' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('zivern', 'kalspire', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:zivern:damage:tactical:kalspire' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('zivern', 'venator', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:zivern:damage:physical:venator' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('zivern', 'shadowsong', null)))).toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:zivern:status:panic:shadowsong' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('zivern', 'rhysarion', null)))).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:zivern:status:control:rhysarion',
        explanation:
          "Zivern's Cloak of Terror can apply Overwhelm, which counts as Control and improves Rhysarion's Dawnsong.",
      }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('shadowsong', 'zivern', null)))).toContainEqual(
      expect.objectContaining({
        id: 'setup-payoff:shadowsong:status:vulnerable:zivern',
        explanation: "Shadowsong can apply Vulnerable, which improves Zivern's Cloak of Terror.",
      }),
    );
    expect(resultsOfKind('progression-locked', evaluate(formation('shadowsong', 'zivern', null), {
      ...unlockedProgression,
      shadowsong: { starRank: 5, dragonLevel: 16 },
    }))).toContainEqual(expect.objectContaining({ tag: 'status:vulnerable', unlock: { minimumStarRank: 6 } }));
    expect(resultsOfKind('progression-locked', evaluate(formation('shadowsong', 'zivern', null), {
      ...unlockedProgression,
      zivern: { starRank: 9, dragonLevel: 16 },
    }))).toContainEqual(expect.objectContaining({ tag: 'status:vulnerable', unlock: { minimumStarRank: 10 } }));
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'zivern', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:stat:intelligence:zivern' }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('caraxes', 'zivern', 'syrax')))).toContainEqual(
      expect.objectContaining({ explanation: "Syrax must be deployed in Left Flank to receive Zivern's Sentinel's Wit." }),
    );

    const zivernSignals = allSignals(simpleSynergyProfiles.find((profile) => profile.dragonId === 'zivern')!).map((signal) => signal.id);
    expect(zivernSignals).not.toContain('zivern-steel-shroud-defense');
    expect(zivernSignals).not.toContain('zivern-keen-instinct-self');
  });

  it('keeps base Syrax and Caraxes Fire active without emitting Fire future unlocks for reinforcing paths', () => {
    const results = evaluate(formation('syrax', 'caraxes', null), {
      ...unlockedProgression,
      syrax: { starRank: 1, dragonLevel: 1 },
      caraxes: { starRank: 1, dragonLevel: 1 },
    });
    const fireExplanation = 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.';

    expect(results.filter((result) => result.explanation === fireExplanation)).toHaveLength(1);
    expect(results).toContainEqual(
      expect.objectContaining({
        id: 'amplifier-output:syrax:damage:fire:caraxes',
        abilityIds: ['caraxes-infernal-burst', 'syrax-blazing-fury'],
      }),
    );
    expect(resultsOfKind('progression-locked', results).filter((result) => result.tag === 'damage:fire')).toHaveLength(0);
    expect(resultsOfKind('progression-locked', results).map((result) => result.tag)).toEqual([
      'stat:initiative',
      'stat:intelligence',
      'status:slow',
    ]);
  });

  it('prefers an active candidate over blocked and locked alternate paths for the same amplifier relationship', () => {
    const profiles = pathPrecedenceProfiles();
    const results = evaluate(formation('supporter', 'producer', null), {}, profiles);

    expect(results).toEqual([
      expect.objectContaining({
        id: 'amplifier-output:supporter:damage:fire:producer',
        kind: 'amplifier-output',
        abilityIds: ['producer-fire', 'supporter-active-fire'],
      }),
    ]);
  });

  it('emits one placement issue when every unlocked candidate path is blocked', () => {
    const profiles = pathPrecedenceProfiles({ includeActive: false });
    const results = evaluate(formation('supporter', null, 'producer'), {}, profiles);

    expect(resultsOfKind('position-blocked', results)).toEqual([
      expect.objectContaining({
        id: 'position-blocked:amplifier-output:supporter:damage:fire:producer',
        explanation: "Producer must be deployed in Left Flank to receive Supporter's Blocked Fire.",
      }),
    ]);
    expect(resultsOfKind('progression-locked', results)).toHaveLength(0);
  });

  it('emits one deterministic future unlock when every candidate path is locked', () => {
    const profiles = pathPrecedenceProfiles({ includeActive: false, includeBlocked: false });
    const results = evaluate(formation('supporter', 'producer', null), {}, profiles);

    expect(resultsOfKind('progression-locked', results)).toEqual([
      expect.objectContaining({
        id: 'progression-locked:amplifier-output:supporter:damage:fire:producer',
        explanation: "Supporter's Early Fire Fire Damage support for Producer's Producer Fire unlocks when Supporter reaches Star Rank 4.",
        unlock: { minimumStarRank: 4 },
      }),
    ]);
  });

  it('uses relationship-specific future unlock explanations without duplicate visible wording', () => {
    const results = evaluate(formation('crimson', 'rhysarion', 'venator'), {
      ...unlockedProgression,
      crimson: { starRank: 7, dragonLevel: 16 },
    });
    const futureUnlocks = resultsOfKind('progression-locked', results);

    expect(futureUnlocks).toContainEqual(
      expect.objectContaining({
        id: 'progression-locked:amplifier-output:crimson:damage:fire:rhysarion',
        explanation:
          "Crimson's Unlikely Hero Fire Damage support for Rhysarion's Dawnsong unlocks when Crimson reaches Star Rank 8.",
      }),
    );
    expect(new Set(futureUnlocks.map((result) => result.explanation)).size).toBe(futureUnlocks.length);
    expect(futureUnlocks.map((result) => result.explanation)).not.toContain(
      'This relationship unlocks when Crimson reaches Star Rank 8.',
    );
  });

  it('uses active setup/payoff paths to suppress locked alternate setup/payoff paths', () => {
    const profiles: DragonSynergyProfile[] = [
      {
        dragonId: 'provider',
        dragonName: 'Provider',
        outputs: [
          {
            id: 'provider-base-panic',
            tag: 'status:panic',
            abilityId: 'provider-base-panic',
            abilityName: 'Base Panic',
            description: 'applies Panic',
            confidence: 'verified',
          },
          {
            id: 'provider-later-panic',
            tag: 'status:panic',
            abilityId: 'provider-later-panic',
            abilityName: 'Later Panic',
            description: 'applies Panic later',
            unlock: { minimumStarRank: 8 },
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
            id: 'beneficiary-base-payoff',
            tag: 'status:panic',
            abilityId: 'beneficiary-base-payoff',
            abilityName: 'Base Payoff',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
          {
            id: 'beneficiary-later-payoff',
            tag: 'status:panic',
            abilityId: 'beneficiary-later-payoff',
            abilityName: 'Later Payoff',
            description: 'also benefits from Panic',
            unlock: { minimumStarRank: 10 },
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];
    const results = evaluate(formation('provider', 'beneficiary', null), {
      provider: { starRank: 1 },
      beneficiary: { starRank: 1 },
    }, profiles);

    expect(resultsOfKind('setup-payoff', results)).toHaveLength(1);
    expect(resultsOfKind('progression-locked', results)).toHaveLength(0);
    expect(resultsOfKind('missing-enabler', evaluate(formation('beneficiary', null, null), {}, profiles))).toHaveLength(1);
  });

  it('does not emit duplicate visible semantic relationships within one evaluator result set', () => {
    const results = evaluate(formation('syrax', 'caraxes', 'malachite'));
    const seen = new Set<string>();

    for (const result of results.filter((candidate) => candidate.kind !== 'position-conflict')) {
      const key = [result.kind, result.dragonIds.join('>'), result.tag ?? 'none'].join('|');
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

});

function pathPrecedenceProfiles({
  includeActive = true,
  includeBlocked = true,
}: {
  includeActive?: boolean;
  includeBlocked?: boolean;
} = {}): DragonSynergyProfile[] {
  return [
    {
      dragonId: 'supporter',
      dragonName: 'Supporter',
      outputs: [],
      supports: [
        ...(includeActive
          ? [
              {
                id: 'supporter-active-fire',
                tag: 'damage:fire' as const,
                abilityId: 'supporter-active-fire',
                abilityName: 'Active Fire',
                description: 'improves Fire Damage',
                confidence: 'verified' as const,
              },
            ]
          : []),
        ...(includeBlocked
          ? [
              {
                id: 'supporter-blocked-fire',
                tag: 'damage:fire' as const,
                abilityId: 'supporter-blocked-fire',
                abilityName: 'Blocked Fire',
                description: 'improves Left Flank Fire Damage',
                requiredRecipientPosition: 'left-flank' as const,
                confidence: 'verified' as const,
              },
            ]
          : []),
        {
          id: 'supporter-locked-fire-late',
          tag: 'damage:fire' as const,
          abilityId: 'supporter-locked-fire-late',
          abilityName: 'Late Fire',
          description: 'improves Fire Damage later',
          unlock: { minimumStarRank: 8 },
          confidence: 'verified',
        },
        {
          id: 'supporter-locked-fire-early',
          tag: 'damage:fire' as const,
          abilityId: 'supporter-locked-fire-early',
          abilityName: 'Early Fire',
          description: 'improves Fire Damage earlier',
          unlock: { minimumStarRank: 4 },
          confidence: 'verified',
        },
      ],
      benefitsFrom: [],
      positionClaims: [],
    },
    {
      dragonId: 'producer',
      dragonName: 'Producer',
      outputs: [
        {
          id: 'producer-fire',
          tag: 'damage:fire',
          abilityId: 'producer-fire',
          abilityName: 'Producer Fire',
          description: 'deals Fire Damage',
          confidence: 'verified',
        },
      ],
      supports: [],
      benefitsFrom: [],
      positionClaims: [],
    },
  ];
}
