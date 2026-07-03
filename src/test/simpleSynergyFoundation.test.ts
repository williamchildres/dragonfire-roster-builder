/// <reference types="node" />

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
      'Vaeldra',
      'Sheepstealer',
      'Vermax',
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
        [dragon?.command, dragon?.trait, ...(dragon?.habits ?? [])]
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
      [dragon.command, dragon.trait, ...dragon.habits]
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
        explanation: 'This relationship unlocks when Caraxes reaches Star Rank 6.',
      }),
    );

    const syraxLocked = evaluate(formation('caraxes', 'syrax', null), {
      ...unlockedProgression,
      syrax: { starRank: 5, dragonLevel: 16 },
    });
    expect(resultsOfKind('progression-locked', syraxLocked)).toContainEqual(
      expect.objectContaining({
        tag: 'status:slow',
        explanation: 'This relationship unlocks when Syrax reaches Star Rank 6.',
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
      expect.objectContaining({ id: 'setup-payoff:crimson:status:control:rhysarion' }),
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
      expect.objectContaining({ id: 'amplifier-output:vhagar:vhagar-battle-leader:damage:physical:venator:venator-feral-strike' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('syrax', 'kalspire', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:syrax:syrax-tactical-inferno:damage:tactical:kalspire:kalspire-tactical-strike' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('caraxes', 'malachite', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:malachite:malachite-sentinels-presence:damage:fire:caraxes:caraxes-infernal-burst' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('rhysarion', 'malachite', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:rhysarion:rhysarion-unbroken-devotion:effect:recovery:malachite:malachite-wardens-rally' }),
    );
    expect(resultsOfKind('amplifier-output', evaluate(formation('venator', 'vhagar', null)))).toContainEqual(
      expect.objectContaining({ id: 'amplifier-output:venator:venator-armor-break:damage:physical:vhagar:vhagar-fiery-bonds' }),
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
      expect.objectContaining({ id: 'amplifier-output:malachite:malachite-sentinels-presence:damage:fire:caraxes:caraxes-infernal-burst' }),
    );

    const wrongRecipient = evaluate(formation(null, 'malachite', 'caraxes'));
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

  it('keeps the new domain independent from legacy trace and capability modules', () => {
    const synergyRoot = join(__dirname, '..', 'synergy');
    const files = collectFiles(synergyRoot).filter((file) => file.endsWith('.ts'));
    const prohibited = [
      'effectCapabilities',
      'synergyTrace',
      'formationCardAnalysis',
      'normalUnmetRequirements',
      'SynergyTrace',
      'activationRoll',
      'perTarget',
      'targetSelectionGroup',
      'stackTransition',
      'durationRounds',
      'roundSelector',
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
