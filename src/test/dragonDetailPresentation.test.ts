import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { buildDragonDetailPresentation, summarizeAbility } from '../app/dragonDetailPresentation';

describe('dragon detail presentation helpers', () => {
  it('summarizes Daemoros with player-facing highlights and placement notes', () => {
    const daemoros = dragons.find((dragon) => dragon.id === 'daemoros')!;
    const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === 'daemoros');
    const presentation = buildDragonDetailPresentation(profile);

    expect(presentation.headerLine).toContain('Panic');
    expect(presentation.headerLine).toContain('Burn');
    expect(presentation.headerLine).toContain('Physical Damage');
    expect(presentation.headerLine).toContain('Vanguard trait');
    expect(presentation.provides).toEqual(
      expect.arrayContaining(['Panic', 'Burn', 'Physical Damage', 'Confusion', 'Instinct support', 'Initiative support']),
    );
    expect(presentation.placementNotes).toEqual(expect.arrayContaining(['Requires Vanguard', 'Supports Left Flank ally']));
    expect(presentation.benefitsFrom).toHaveLength(0);

    expect(summarizeAbility(daemoros.command!).plainSummary).toContain('Deals Physical Damage');
    expect(summarizeAbility(daemoros.command!).plainSummary).toContain('Applies Burn');
    expect(summarizeAbility(daemoros.trait!).plainSummary).toContain('Boosts Physical Damage');
    expect(summarizeAbility(daemoros.trait!).plainSummary).toContain('Boosts Instinct');
    expect(summarizeAbility(daemoros.habits[4]!).plainSummary).toBe('Reduces Damage Received.');
  });

  it('summarizes Tessarion without generating awkward wording', () => {
    const tessarion = dragons.find((dragon) => dragon.id === 'tessarion')!;
    const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === 'tessarion');
    const presentation = buildDragonDetailPresentation(profile);

    expect(presentation.headerLine).toContain('Fire Damage');
    expect(presentation.headerLine).toContain('Physical Damage');
    expect(presentation.headerLine).toContain('Fire Damage support');
    expect(presentation.headerLine).toContain('Intelligence support');
    expect(presentation.headerLine).toContain('Vanguard trait');
    expect(presentation.provides).toEqual(
      expect.arrayContaining([
        'Fire Damage',
        'Physical Damage',
        'Fire Damage support',
        'Intelligence support',
        'Initiative support',
      ]),
    );
    expect(presentation.placementNotes).toEqual(['Requires Vanguard']);

    expect(summarizeAbility(tessarion.command!).plainSummary).toContain('Deals Fire Damage');
    expect(summarizeAbility(tessarion.command!).plainSummary).toContain('Deals Physical Damage');
    expect(summarizeAbility(tessarion.trait!).plainSummary).toContain('Boosts Strength');
    expect(summarizeAbility(tessarion.trait!).plainSummary).toContain('Boosts Intelligence');
    expect(summarizeAbility(tessarion.command!).plainSummary).not.toMatch(/provides deals|improves deals|applies Damage Received Down|undefined/i);
    expect(presentation.provides).not.toContain('undefined');
  });

  it('returns the metadata-only fallback cleanly', () => {
    const presentation = buildDragonDetailPresentation(undefined);

    expect(presentation.metadataNotice).toBe('Metadata-only record. Ability details not yet verified.');
    expect(presentation.headerLine).toBe('Metadata-only record. Ability details not yet verified.');
    expect(presentation.provides).toEqual([]);
    expect(presentation.benefitsFrom).toEqual([]);
    expect(presentation.placementNotes).toEqual([]);
  });
});
