import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput } from '../models/synergy';
import {
  buildFormationCardPresentation,
  canonicalCardText,
  getCompactInteractions,
} from '../services/formationCardAnalysis';
import { analyzeFormationTraces } from '../services/synergyTrace';

const preview = { previewMaxRankInteractions: true };

const formations: Record<string, FormationAnalysisInput> = {
  '1': { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
  '4': { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '8': { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
};

function presentation(formationId: string, previewEnabled = false) {
  const formation = formations[formationId]!;
  const traces = analyzeFormationTraces(formation, dragons, previewEnabled ? preview : {});
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
    expect(caraxes.receives.some((item) => item.isCandidate && item.summary.includes('target not guaranteed'))).toBe(true);
    expect(sheepstealer.receives.some((item) => item.isCandidate && item.summary.includes('target not guaranteed'))).toBe(true);
    expect(caraxes.receives.find((item) => item.abilityName === 'Blazing Fury')?.relationshipId).toBe(
      syrax.provides.find((item) => item.abilityName === 'Blazing Fury')?.relationshipId,
    );
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
