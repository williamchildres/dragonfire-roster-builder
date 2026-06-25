import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import type { FormationAnalysisInput } from '../models/synergy';
import {
  buildFormationCardPresentation,
  canonicalCardText,
  getCompactInteractions,
} from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces } from '../services/synergyTrace';

const preview = { previewMaxRankInteractions: true };

const formations: Record<string, FormationAnalysisInput> = {
  '1': { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
  '4': { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '8': { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
  '13': { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  '14': { 'left-flank': 'seasmoke', vanguard: 'sheepstealer', 'right-flank': 'malachite' },
};

function presentation(
  formationId: string,
  previewEnabled = false,
  options: { roster?: Record<string, OwnedDragon> } = {},
) {
  const formation = formations[formationId]!;
  const traceOptions = { ...(previewEnabled ? preview : {}), ...options };
  const traces = analyzeFormationTraces(formation, dragons, traceOptions);
  return buildFormationCardPresentation(formation, dragons, traces, { previewEnabled });
}

function card(result: ReturnType<typeof presentation>, dragonId: string) {
  const match = result.cards.find((item) => item.dragonId === dragonId);
  expect(match).toBeDefined();
  return match!;
}

describe('formation card analysis presentation', () => {
  it('maps source dragons to Provides and recipient dragons to Receives without internal traces', () => {
    const result = presentation('1', true);
    const vermax = card(result, 'vermax');
    const malachite = card(result, 'malachite');

    expect(vermax.provides.some((item) => item.abilityName === 'Spreading Blaze')).toBe(true);
    expect(malachite.receives.some((item) => item.sourceDragonId === 'vermax' && item.abilityName === 'Spreading Blaze')).toBe(true);
    expect(result.cards.flatMap((item) => [...item.receives, ...item.provides]).some((item) => item.sourceDragonId === item.recipientDragonId)).toBe(false);
  });

  it('keeps target-selection candidates distinct from guaranteed recipients', () => {
    const result = presentation('8', true);
    const syrax = card(result, 'syrax');
    const caraxes = card(result, 'caraxes');
    const sheepstealer = card(result, 'sheepstealer');

    const providerGroups = syrax.provides.filter((item) => item.abilityName === 'Blazing Fury' || item.abilityName === 'Tactical Inferno');
    expect(providerGroups.filter((item) => item.candidateTotal === 2)).toHaveLength(2);
    expect(caraxes.receives.some((item) => item.isCandidate && item.candidateTotal === 2 && item.summary.includes('Fire Damage support'))).toBe(true);
    expect(sheepstealer.receives.some((item) => item.isCandidate && item.candidateTotal === 2 && item.summary.includes('Fire Damage support'))).toBe(true);
    expect(caraxes.receives.find((item) => item.abilityName === 'Blazing Fury')?.relationshipId).toBe(
      syrax.provides.find((item) => item.abilityName === 'Blazing Fury')?.relationshipId,
    );
  });

  it('adds command summaries without counting them as cross-dragon synergies', () => {
    const result = presentation('8', false);

    for (const dragonId of ['sheepstealer', 'caraxes', 'syrax']) {
      const dragonCard = card(result, dragonId);
      expect(dragonCard.command).toMatchObject({ label: 'Command' });
    }
    expect(card(result, 'sheepstealer').command?.abilityName).toBe('Wild Hunt');
    expect(card(result, 'caraxes').command?.abilityName).toBe('Infernal Burst');
    expect(card(result, 'syrax').command?.abilityName).toBe('Blazing Fury');
    expect(card(result, 'syrax').receives.some((item) => item.abilityName === 'Blazing Fury')).toBe(false);
  });

  it('names Cleansing Wrath in Sentinel Presence support summaries', () => {
    const result = presentation('13', false);
    const seasmoke = card(result, 'seasmoke');
    const malachite = card(result, 'malachite');

    const receives = seasmoke.receives.find((item) => item.abilityName === "Sentinel's Presence");
    const provides = malachite.provides.find((item) => item.abilityName === "Sentinel's Presence");
    expect(seasmoke.command?.abilityName).toBe('Cleansing Wrath');
    expect(receives?.summaryLines).toContain('Increases Cleansing Wrath Fire Damage.');
    expect(provides?.summaryLines).toContain('Increases Cleansing Wrath Fire Damage.');
  });

  it('separates Warden Rally Recovery support from Hunter Cunning amplification state', () => {
    const outsideVanguard = presentation('13', false);
    const sheepstealerOutside = card(outsideVanguard, 'sheepstealer');
    const malachiteOutside = card(outsideVanguard, 'malachite');
    const wardenReceives = sheepstealerOutside.receives.find((item) => item.abilityName === "Warden's Rally");
    const wardenProvides = malachiteOutside.provides.find((item) => item.abilityName === "Warden's Rally");
    const hunterBlocked = sheepstealerOutside.receives.find((item) => item.abilityName === "Hunter's Cunning");

    expect(wardenReceives?.state).not.toBe('blocked');
    expect(wardenProvides?.state).not.toBe('blocked');
    expect(wardenReceives?.summary).toContain('Recovery support');
    expect(hunterBlocked?.state).toBe('blocked');
    expect(hunterBlocked?.summary).toContain("Hunter's Cunning cannot amplify this Recovery because Sheepstealer is not Vanguard.");

    const roster = createEmptyRoster(dragons);
    roster.sheepstealer!.owned = true;
    roster.sheepstealer!.collection.state = 'hatched';
    roster.sheepstealer!.reignLevel = 25;
    const inVanguard = presentation('14', false, { roster });
    const sheepstealerVanguard = card(inVanguard, 'sheepstealer');
    const hunterActive = sheepstealerVanguard.receives.find((item) => item.abilityName === "Hunter's Cunning");
    expect(hunterActive?.state).toBe('active');
  });

  it('refreshes Champion Brilliance when roster Reign Level changes', () => {
    const roster = createEmptyRoster(dragons);
    roster.seasmoke!.owned = true;
    roster.seasmoke!.collection.state = 'hatched';
    roster.sheepstealer!.owned = true;
    roster.sheepstealer!.collection.state = 'hatched';
    roster.seasmoke!.reignLevel = 1;

    const blocked = presentation('4', false, { roster });
    expect(card(blocked, 'seasmoke').traitStatus).toMatchObject({ state: 'blocked' });

    roster.seasmoke!.reignLevel = 25;
    const refreshed = presentation('4', false, { roster });
    expect(card(refreshed, 'seasmoke').traitStatus?.state).not.toBe('blocked');
  });

  it('aggregates same-ability current interactions without losing child trace ids', () => {
    const result = presentation('8', false);
    const caraxes = card(result, 'caraxes');
    const sheepstealer = card(result, 'sheepstealer');
    const syrax = card(result, 'syrax');

    const caraxesBlazingFury = caraxes.receives.filter((item) => item.abilityName === 'Blazing Fury');
    expect(caraxesBlazingFury).toHaveLength(1);
    expect(caraxesBlazingFury[0]?.summaryLines).toEqual(
      expect.arrayContaining([
        'Fire Damage support; one of two eligible recipients.',
        'May receive First-Strike; Infernal Burst deals 1.5× while active.',
      ]),
    );
    expect(caraxesBlazingFury[0]?.traceIds).toHaveLength(2);

    const sheepstealerBlazingFury = sheepstealer.receives.find((item) => item.abilityName === 'Blazing Fury');
    expect(sheepstealerBlazingFury?.summary).toContain('Fire Damage support');
    expect(sheepstealerBlazingFury?.summary).not.toContain('First-Strike');

    const syraxBlazingFury = syrax.provides.find((item) => item.abilityName === 'Blazing Fury');
    expect(syraxBlazingFury?.summaryLines).toEqual(
      expect.arrayContaining([
        'One Fire recipient is selected: Caraxes or Sheepstealer.',
        'Caraxes may also receive First-Strike for Infernal Burst.',
      ]),
    );
    expect(syraxBlazingFury?.candidateTotal).toBe(2);
    expect(syraxBlazingFury?.summary).toContain('Target not guaranteed.');
    expect(syraxBlazingFury?.traceIds).toHaveLength(2);
  });

  it('uses purposeful compact summaries for stat values and suppresses redundant blocked trait cards', () => {
    const result = presentation('8', false);
    const syrax = card(result, 'syrax');
    const sheepstealer = card(result, 'sheepstealer');

    expect(syrax.receives.find((item) => item.abilityName === "Hunter's Wrath")?.summaryLines).toContain(
      'Strength +20 and Initiative +20.',
    );
    expect(sheepstealer.receives.some((item) => item.abilityName === "Sentinel's Wit")).toBe(false);
    expect(syrax.provides.some((item) => item.abilityName === "Sentinel's Wit")).toBe(false);
    expect(syrax.traitStatus).toMatchObject({
      abilityName: "Sentinel's Wit",
      state: 'blocked',
    });
  });

  it('keeps enemy-facing debuffs on the provider card', () => {
    const result = presentation('8', true);
    const caraxes = card(result, 'caraxes');
    const sheepstealer = card(result, 'sheepstealer');

    expect(caraxes.provides.some((item) => item.abilityName === 'Battle Dread' && item.isEnemyFacing)).toBe(true);
    expect(sheepstealer.receives.some((item) => item.abilityName === 'Battle Dread')).toBe(false);
  });

  it('preserves current, preview, and unknown interaction states', () => {
    const result = presentation('8', true);
    const syrax = card(result, 'syrax');
    const caraxes = card(result, 'caraxes');

    expect(syrax.receives.some((item) => item.state === 'unknown' && item.abilityName === "Hunter's Wrath")).toBe(true);
    expect(caraxes.receives.some((item) => item.state === 'preview' && item.abilityName === 'Tactical Inferno')).toBe(true);
    expect(caraxes.receives.some((item) => item.state === 'conditional' && item.abilityName === 'Blazing Fury')).toBe(true);
  });

  it('derives card and team affinity summaries from dragon affinity data', () => {
    const result = presentation('8', true);
    const syrax = card(result, 'syrax');

    expect(syrax.affinities.favorable).toEqual(expect.arrayContaining(['Archers', 'Spearmen']));
    expect(syrax.affinities.unfavorable).toContain('Siege');
    expect(result.teamAffinity.covered.some((item) => item.troopType === 'Cavalry' && item.dragonNames.includes('Caraxes'))).toBe(true);
    expect(result.teamAffinity.conflicts.some((item) => item.troopType === 'Siege' && item.dragonNames.includes('Syrax'))).toBe(true);
  });

  it('summarizes trait placement and progression failures on the owning card', () => {
    const result = presentation('4', true);
    const seasmoke = card(result, 'seasmoke');
    const malachite = card(result, 'malachite');

    expect(seasmoke.traitStatus).toMatchObject({
      abilityName: "Champion's Brilliance",
      label: 'Trait inactive',
      state: 'blocked',
    });
    expect(seasmoke.traitStatus?.summary).toContain('Requires Level 16+; current Level 1');
    expect(malachite.traitStatus?.summary).toContain('requires Vanguard');
  });

  it('limits compact interaction lists and reports overflow without discarding data', () => {
    const result = presentation('8', true);
    const caraxes = card(result, 'caraxes');

    expect(caraxes.receives.length).toBeGreaterThan(3);
    expect(getCompactInteractions(caraxes.receives, false)).toHaveLength(3);
    expect(getCompactInteractions(caraxes.receives, true)).toHaveLength(caraxes.receives.length);
    expect(caraxes.overflow.receives).toBe(caraxes.receives.length - 3);
  });

  it('formats normal card text with canonical names and player-facing flat values', () => {
    expect(canonicalCardText('caraxes - Crippling Inferno Habit unlock requirement', dragons)).toContain(
      'Caraxes — Crippling Inferno',
    );
    expect(canonicalCardText('sheepstealer - Savage Claim Selected Habit Level', dragons)).toContain(
      'Sheepstealer — Savage Claim',
    );
    expect(canonicalCardText('syrax - Strategic Revival Habit unlock requirement', dragons)).toContain(
      'Syrax — Strategic Revival',
    );
    expect(canonicalCardText("Caraxes's Hunter's Wrath can increase Syrax's Strength by 20 flat", dragons)).toContain(
      'Strength +20',
    );
  });
});
