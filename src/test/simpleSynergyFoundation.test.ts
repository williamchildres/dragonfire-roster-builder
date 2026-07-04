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
  return [...(signal.tags ?? [signal.tag]), ...(signal.scalesWith ?? [])];
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
    const signalIds = new Set<string>();

    for (const profile of simpleSynergyProfiles) {
      const dragon = dragonsById.get(profile.dragonId);
      expect(dragon, profile.dragonId).toBeDefined();

      const abilitiesById = new Map(
        ([dragon?.command, dragon?.trait, ...(dragon?.habits ?? [])] as Array<AbilityDefinition | null | undefined>)
          .filter((ability): ability is AbilityDefinition => ability !== null && ability !== undefined)
          .map((ability) => [ability.id, ability]),
      );

      for (const signal of allSignals(profile)) {
        expect(signalIds.has(signal.id), signal.id).toBe(false);
        signalIds.add(signal.id);

        const ability = abilitiesById.get(signal.abilityId);
        expect(ability, `${profile.dragonId}:${signal.abilityId}`).toBeDefined();
        expect(signal.abilityName, `${profile.dragonId}:${signal.id}`).toBe(ability?.name);
      }

      for (const positionClaim of profile.positionClaims) {
        expect(signalIds.has(positionClaim.id), positionClaim.id).toBe(false);
        signalIds.add(positionClaim.id);

        const ability = abilitiesById.get(positionClaim.abilityId);
        expect(ability, `${profile.dragonId}:${positionClaim.abilityId}`).toBeDefined();
        expect(positionClaim.abilityName, `${profile.dragonId}:${positionClaim.id}`).toBe(ability?.name);
      }
    }
  });

  it('keeps Flight Mastery and signal ownership attributed to the canonical dragon', () => {
    const flightMasterySignals = simpleSynergyProfiles.flatMap((profile) =>
      allSignals(profile)
        .filter((signal) => signal.abilityName === 'Flight Mastery' || signal.abilityId.includes('flight-mastery'))
        .map((signal) => `${profile.dragonId}:${signal.id}`),
    );
    const velarSignals = allSignals(simpleSynergyProfiles.find((profile) => profile.dragonId === 'velar')!);

    expect(flightMasterySignals).toEqual(['syrax:syrax-flight-mastery-initiative']);
    expect(velarSignals.map((signal) => signal.abilityName)).not.toContain('Flight Mastery');
    expect(velarSignals.map((signal) => signal.abilityId)).not.toContain('syrax-flight-mastery');
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

  it('keeps output scaling metadata separate from emitted output tags', () => {
    for (const profile of simpleSynergyProfiles) {
      for (const output of profile.outputs) {
        const providedTags = output.tags ?? [output.tag];
        expect(
          providedTags.filter((tag) => tag.startsWith('stat:')),
          `${profile.dragonId}:${output.id}`,
        ).toEqual([]);

        for (const tag of output.scalesWith ?? []) {
          expect(tag.startsWith('stat:'), `${profile.dragonId}:${output.id}:${tag}`).toBe(true);
        }
      }
    }
  });

  it('records verified output scaling tags on the intended profile signals', () => {
    const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));
    const signal = (dragonId: string, signalId: string) =>
      profilesById.get(dragonId)?.outputs.find((candidate) => candidate.id === signalId);

    expect(signal('syrax', 'syrax-strategic-revival-recovery')?.scalesWith).toEqual(['stat:intelligence']);
    expect(signal('malachite', 'malachite-wardens-rally-recovery')?.scalesWith).toEqual(['stat:instinct']);
    expect(signal('velar', 'velar-breath-of-renewal-recovery')?.scalesWith).toEqual(['stat:initiative']);
    expect(signal('tashix', 'tashix-shimmering-mirage-fire')?.scalesWith).toEqual(['stat:intelligence']);
    expect(signal('zivern', 'zivern-silent-shade-tactical')?.scalesWith).toEqual(['stat:instinct']);
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
        explanation: "Daemoros applies Panic, which improves Shadowsong's Breath of Fire.",
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
    expect(resultsOfKind('amplifier-output', evaluate(formation(null, 'caraxes', 'syrax')))).not.toContainEqual(
      expect.objectContaining({ tag: 'stat:initiative' }),
    );

    expect(
      resultsOfKind('amplifier-output', evaluate(formation('malachite', 'caraxes', null))).some(
        (result) => result.tag === 'stat:strength' && result.dragonIds.includes('caraxes'),
      ),
    ).toBe(false);
  });

  it('treats output scaling as inbound support rather than provided setup', () => {
    const profiles = directionalScalingProfiles();

    expect(resultsOfKind('amplifier-output', evaluate(formation('int-supporter', 'fire-producer', null), {}, profiles))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:int-supporter:stat:intelligence:fire-producer' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('fire-producer', 'int-beneficiary', null), {}, profiles))).toHaveLength(0);
    expect(resultsOfKind('missing-enabler', evaluate(formation('fire-producer', 'int-beneficiary', null), {}, profiles))).toContainEqual(
      expect.objectContaining({ id: 'missing-enabler:int-beneficiary:stat:intelligence' }),
    );

    expect(resultsOfKind('amplifier-output', evaluate(formation('instinct-supporter', 'tactical-producer', null), {}, profiles))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:instinct-supporter:stat:instinct:tactical-producer' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('tactical-producer', 'instinct-beneficiary', null), {}, profiles))).toHaveLength(0);

    expect(resultsOfKind('amplifier-output', evaluate(formation('strength-supporter', 'physical-producer', null), {}, profiles))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:strength-supporter:stat:strength:physical-producer' }),
    );
    expect(resultsOfKind('setup-payoff', evaluate(formation('physical-producer', 'strength-beneficiary', null), {}, profiles))).toHaveLength(0);
  });

  it('matches verified Recovery scaling without letting Recovery outputs provide scaling stats', () => {
    const malachiteWithInstinct = resultsOfKind('amplifier-output', evaluate(formation('feskar', 'malachite', null)));
    const malachiteInstinctResult = malachiteWithInstinct.find((result) => result.id === 'amplifier-output:feskar:stat:instinct:malachite');
    expect(malachiteInstinctResult).toBeDefined();
    expect(malachiteInstinctResult?.abilityIds).toEqual(expect.arrayContaining(['feskar-insightful-allies', 'malachite-wardens-rally']));

    const velarWithInitiative = resultsOfKind('amplifier-output', evaluate(formation('syrax', 'velar', null)));
    const velarInitiativeResult = velarWithInitiative.find((result) => result.id === 'amplifier-output:syrax:stat:initiative:velar');
    expect(velarInitiativeResult).toBeDefined();
    expect(velarInitiativeResult?.abilityIds).toEqual(expect.arrayContaining(['syrax-flight-mastery', 'velar-breath-of-renewal']));
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'malachite', null)))).not.toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:stat:initiative:malachite' }),
    );

    const profiles: DragonSynergyProfile[] = [
      simpleSynergyProfiles.find((profile) => profile.dragonId === 'malachite')!,
      simpleSynergyProfiles.find((profile) => profile.dragonId === 'velar')!,
      {
        dragonId: 'stat-beneficiary',
        dragonName: 'Stat Beneficiary',
        outputs: [],
        supports: [],
        benefitsFrom: [
          {
            id: 'stat-beneficiary-instinct',
            tag: 'stat:instinct',
            abilityId: 'stat-beneficiary-instinct',
            abilityName: 'Instinct Need',
            description: 'benefits from Instinct',
            confidence: 'verified',
          },
          {
            id: 'stat-beneficiary-initiative',
            tag: 'stat:initiative',
            abilityId: 'stat-beneficiary-initiative',
            abilityName: 'Initiative Need',
            description: 'benefits from Initiative',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ];

    expect(resultsOfKind('setup-payoff', evaluate(formation('malachite', 'stat-beneficiary', null), {}, profiles))).toHaveLength(0);
    expect(resultsOfKind('setup-payoff', evaluate(formation('velar', 'stat-beneficiary', null), {}, profiles))).not.toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:velar:stat:initiative:stat-beneficiary' }),
    );
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
    expect(resultsOfKind('setup-payoff', evaluate(formation('tashix', 'zivern', null)))).not.toContainEqual(
      expect.objectContaining({ id: 'setup-payoff:tashix:stat:intelligence:zivern' }),
    );
    expect(resultsOfKind('missing-enabler', evaluate(formation('tashix', 'zivern', null)))).toContainEqual(
      expect.objectContaining({ id: 'missing-enabler:zivern:stat:intelligence' }),
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
    expect(resultsOfKind('position-blocked', evaluate(formation('tashix', 'caraxes', 'velar')))).toContainEqual(
      expect.objectContaining({ explanation: "Velar must be deployed in Vanguard for Sentinel's Wit." }),
    );
    expect(resultsOfKind('position-blocked', evaluate(formation('caraxes', 'velar', 'tashix')))).toContainEqual(
      expect.objectContaining({ explanation: "Tashix must be deployed in Left Flank to receive Velar's Sentinel's Wit." }),
    );

    const velarTags = allSignals(simpleSynergyProfiles.find((profile) => profile.dragonId === 'velar')!).flatMap(signalTags);
    expect(velarTags).not.toEqual(expect.arrayContaining(['status:advantage', 'effect:cleanse']));
  });

  it('keeps Formation A directional relationships owned by the real provider signals', () => {
    const results = evaluate(formation('velar', 'caraxes', 'syrax'));
    const explanations = results.map((result) => result.explanation);

    expect(resultsOfKind('setup-payoff', results)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'setup-payoff:syrax:status:first-strike:caraxes' }),
        expect.objectContaining({ id: 'setup-payoff:velar:status:first-strike:caraxes' }),
        expect.objectContaining({ id: 'setup-payoff:velar:status:slow:syrax' }),
      ]),
    );
    expect(resultsOfKind('amplifier-output', results)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'amplifier-output:syrax:damage:fire:caraxes' }),
        expect.objectContaining({ id: 'amplifier-output:syrax:stat:intelligence:caraxes' }),
        expect.objectContaining({ id: 'amplifier-output:velar:damage:fire:caraxes' }),
        expect.objectContaining({ id: 'amplifier-output:velar:damage:tactical:syrax' }),
      ]),
    );

    const syraxInitiativeForVelar = results.find((result) => result.id === 'amplifier-output:syrax:stat:initiative:velar');
    expect(syraxInitiativeForVelar).toBeDefined();
    expect(syraxInitiativeForVelar?.abilityIds).toEqual(expect.arrayContaining(['syrax-flight-mastery', 'velar-fierce-unity']));
    expect(syraxInitiativeForVelar?.abilityIds).not.toContain('velar-whirlwind');

    expect(explanations.join('\n')).not.toContain("Velar's Flight Mastery");
    expect(explanations.join('\n')).not.toContain('Strategic Revival Initiative');
    expect(explanations.join('\n')).not.toContain("Caraxes's Hunter's Wrath Initiative support for Syrax's Strategic Revival");
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

  it('keeps Formation B scaling stats from becoming false Intelligence providers', () => {
    const results = evaluate(formation('zivern', 'rhysarion', 'shadowsong'));
    const explanations = results.map((result) => result.explanation).join('\n');

    expect(resultsOfKind('setup-payoff', results).map((result) => result.id).sort()).toEqual([
      'setup-payoff:shadowsong:status:vulnerable:zivern',
      'setup-payoff:zivern:status:control:rhysarion',
      'setup-payoff:zivern:status:panic:shadowsong',
    ]);
    expect(resultsOfKind('missing-enabler', results)).toContainEqual(
      expect.objectContaining({ id: 'missing-enabler:zivern:stat:intelligence' }),
    );
    expect(results.map((result) => result.id)).not.toEqual(
      expect.arrayContaining([
        'setup-payoff:rhysarion:stat:intelligence:zivern',
        'setup-payoff:shadowsong:stat:intelligence:zivern',
      ]),
    );
    expect(explanations).not.toContain('provides deals');
    expect(explanations).not.toContain("Rhysarion provides deals Fire Damage using Intelligence, which improves Zivern's Battle Mastery.");
    expect(explanations).not.toContain("Shadowsong provides deals Fire Damage using Intelligence, which improves Zivern's Battle Mastery.");
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

  it('does not emit relationship results for duplicated malformed formation entries of the same dragon', () => {
    const results = evaluate(formation('solo', 'solo', 'solo'), {}, [
      {
        dragonId: 'solo',
        dragonName: 'Solo',
        outputs: [
          {
            id: 'solo-panic',
            tag: 'status:panic',
            abilityId: 'solo-panic',
            abilityName: 'Solo Panic',
            description: 'applies Panic',
            confidence: 'verified',
            friendlyScope: 'formation',
          },
          {
            id: 'solo-fire',
            tag: 'damage:fire',
            scalesWith: ['stat:intelligence'],
            abilityId: 'solo-fire',
            abilityName: 'Solo Fire',
            description: 'deals Fire Damage using Intelligence',
            confidence: 'verified',
          },
        ],
        supports: [
          {
            id: 'solo-intelligence',
            tag: 'stat:intelligence',
            abilityId: 'solo-intelligence',
            abilityName: 'Solo Intelligence',
            description: 'improves Intelligence',
            confidence: 'verified',
            friendlyScope: 'formation',
          },
        ],
        benefitsFrom: [
          {
            id: 'solo-panic-payoff',
            tag: 'status:panic',
            abilityId: 'solo-panic-payoff',
            abilityName: 'Solo Panic Payoff',
            description: 'benefits from Panic',
            confidence: 'verified',
          },
        ],
        positionClaims: [],
      },
    ]);

    expect(results.filter((result) => result.kind === 'setup-payoff' || result.kind === 'amplifier-output')).toHaveLength(0);
    for (const result of results) {
      expect(new Set(result.dragonIds).size, result.id).toBe(result.dragonIds.length);
    }
  });

  it('keeps generated relationship explanations grammatical and ability-owned across profile pairings', () => {
    const forbidden = [
      'provides deals',
      'improves deals',
      'provides applies',
      'undefined',
      'Strategic Revival Initiative',
      "Velar's Flight Mastery",
      'Velar’s Flight Mastery',
      'Fire Damage using Intelligence, which improves Zivern',
    ];

    for (const provider of simpleSynergyProfiles) {
      for (const beneficiary of simpleSynergyProfiles) {
        if (provider.dragonId === beneficiary.dragonId) {
          continue;
        }

        const results = evaluate(formation(provider.dragonId, beneficiary.dragonId, null));
        for (const result of results) {
          for (const phrase of forbidden) {
            expect(result.explanation, `${provider.dragonId}:${beneficiary.dragonId}:${result.id}`).not.toContain(phrase);
          }
        }
      }
    }
  });

});

function directionalScalingProfiles(): DragonSynergyProfile[] {
  return [
    {
      dragonId: 'fire-producer',
      dragonName: 'Fire Producer',
      outputs: [
        {
          id: 'fire-producer-fire',
          tag: 'damage:fire',
          scalesWith: ['stat:intelligence'],
          abilityId: 'fire-producer-fire',
          abilityName: 'Fire Output',
          description: 'deals Fire Damage using Intelligence',
          confidence: 'verified',
        },
      ],
      supports: [],
      benefitsFrom: [],
      positionClaims: [],
    },
    {
      dragonId: 'tactical-producer',
      dragonName: 'Tactical Producer',
      outputs: [
        {
          id: 'tactical-producer-tactical',
          tag: 'damage:tactical',
          scalesWith: ['stat:instinct'],
          abilityId: 'tactical-producer-tactical',
          abilityName: 'Tactical Output',
          description: 'deals Tactical Damage using Instinct',
          confidence: 'verified',
        },
      ],
      supports: [],
      benefitsFrom: [],
      positionClaims: [],
    },
    {
      dragonId: 'physical-producer',
      dragonName: 'Physical Producer',
      outputs: [
        {
          id: 'physical-producer-physical',
          tag: 'damage:physical',
          scalesWith: ['stat:strength'],
          abilityId: 'physical-producer-physical',
          abilityName: 'Physical Output',
          description: 'deals Physical Damage using Strength',
          confidence: 'verified',
        },
      ],
      supports: [],
      benefitsFrom: [],
      positionClaims: [],
    },
    statSupporter('int-supporter', 'Int Supporter', 'stat:intelligence'),
    statSupporter('instinct-supporter', 'Instinct Supporter', 'stat:instinct'),
    statSupporter('strength-supporter', 'Strength Supporter', 'stat:strength'),
    statBeneficiary('int-beneficiary', 'Int Beneficiary', 'stat:intelligence'),
    statBeneficiary('instinct-beneficiary', 'Instinct Beneficiary', 'stat:instinct'),
    statBeneficiary('strength-beneficiary', 'Strength Beneficiary', 'stat:strength'),
  ];
}

function statSupporter(
  dragonId: string,
  dragonName: string,
  tag: 'stat:intelligence' | 'stat:instinct' | 'stat:strength',
): DragonSynergyProfile {
  return {
    dragonId,
    dragonName,
    outputs: [],
    supports: [
      {
        id: `${dragonId}-support`,
        tag,
        abilityId: `${dragonId}-support`,
        abilityName: `${dragonName} Support`,
        description: `improves ${SYNERGY_TAG_LABELS[tag]}`,
        confidence: 'verified',
        friendlyScope: 'formation',
      },
    ],
    benefitsFrom: [],
    positionClaims: [],
  };
}

function statBeneficiary(
  dragonId: string,
  dragonName: string,
  tag: 'stat:intelligence' | 'stat:instinct' | 'stat:strength',
): DragonSynergyProfile {
  return {
    dragonId,
    dragonName,
    outputs: [],
    supports: [],
    benefitsFrom: [
      {
        id: `${dragonId}-benefit`,
        tag,
        abilityId: `${dragonId}-benefit`,
        abilityName: `${dragonName} Benefit`,
        description: `benefits from ${SYNERGY_TAG_LABELS[tag]}`,
        confidence: 'verified',
      },
    ],
    positionClaims: [],
  };
}

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
