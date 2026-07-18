import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { CONTROL_ALIAS_TAGS, SYNERGY_TAG_LABELS, type SynergyTag } from '../synergy/tags';
import { buildDragonDetailPresentation, summarizeAbility } from '../app/dragonDetailPresentation';

describe('dragon detail presentation helpers', () => {
  const profileById = (dragonId: string) => simpleSynergyProfiles.find((candidate) => candidate.dragonId === dragonId)!;
  const dragonById = (dragonId: string) => dragons.find((dragon) => dragon.id === dragonId)!;

  it('summarizes Daemoros with player-facing highlights and placement notes', () => {
    const daemoros = dragons.find((dragon) => dragon.id === 'daemoros')!;
    const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === 'daemoros');
    const presentation = buildDragonDetailPresentation(profile);

    expect(presentation.headerLine).toContain('Panic');
    expect(presentation.headerLine).toContain('Burn');
    expect(presentation.headerLine).toContain('Physical Damage');
    expect(presentation.headerLine).toContain('Vanguard trait');
    expect(presentation.provides).toEqual(
      expect.arrayContaining(['Applies Panic', 'Burn', 'Physical Damage', 'Confusion', 'Instinct support', 'Initiative support']),
    );
    expect(presentation.placementNotes).toEqual(expect.arrayContaining(['Requires Vanguard', 'Supports Left Flank ally']));
    expect(presentation.benefitsFrom).toHaveLength(0);

    expect(summarizeAbility(daemoros.command).plainSummary).toContain('Deals Physical Damage');
    expect(summarizeAbility(daemoros.command).plainSummary).toContain('Applies Burn');
    expect(summarizeAbility(daemoros.trait).plainSummary).toContain('Boosts Physical Damage');
    expect(summarizeAbility(daemoros.trait).plainSummary).toContain('Boosts Instinct');
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

    expect(summarizeAbility(tessarion.command).plainSummary).toContain('Deals Fire Damage');
    expect(summarizeAbility(tessarion.command).plainSummary).toContain('Deals Physical Damage');
    expect(summarizeAbility(tessarion.trait).plainSummary).toContain('Boosts Strength');
    expect(summarizeAbility(tessarion.trait).plainSummary).toContain('Boosts Intelligence');
    expect(summarizeAbility(tessarion.command).plainSummary).not.toMatch(/provides deals|improves deals|applies Damage Received Down|undefined/i);
    expect(presentation.provides).not.toContain('undefined');
  });

  it('returns the metadata-only fallback cleanly', () => {
    const presentation = buildDragonDetailPresentation(undefined);

    expect(presentation.metadataNotice).toBe('Metadata-only record. Ability details not verified.');
    expect(presentation.headerLine).toBe('Metadata-only record. Ability details not verified.');
    expect(presentation.provides).toEqual([]);
    expect(presentation.benefitsFrom).toEqual([]);
    expect(presentation.placementNotes).toEqual([]);
  });

  it('shows Vhagar mapped incoming Burn synergy instead of the empty incoming fallback', () => {
    const presentation = buildDragonDetailPresentation(profileById('vhagar'));

    expect(presentation.benefitsFrom).toContain('Burn');
    expect(presentation.benefitsFrom).not.toHaveLength(0);
    expect(presentation.benefitsFrom.join(' ')).not.toContain('No mapped incoming synergy yet');
  });

  it('keeps real incoming signals visible while allowing genuinely empty incoming profiles', () => {
    for (const profile of simpleSynergyProfiles.filter((candidate) => candidate.benefitsFrom.length > 0)) {
      expect(buildDragonDetailPresentation(profile).benefitsFrom.length, profile.dragonId).toBeGreaterThan(0);
    }

    expect(buildDragonDetailPresentation(profileById('kalspire')).benefitsFrom).toEqual([]);
  });

  it('preserves Feskar Stagger in ability summaries while retaining the Control family chip', () => {
    const feskar = dragonById('feskar');
    const unyieldingGrasp = feskar.habits.find((habit) => habit.id === 'feskar-unyielding-grasp')!;
    const summary = summarizeAbility(unyieldingGrasp);

    expect(summary.plainSummary).toBe('Applies Stagger.');
    expect(summary.plainSummary).not.toBe('Applies Control.');
    expect(summary.chips).toEqual(expect.arrayContaining(['Applies Stagger', 'Control']));
  });

  it('shows Feskar Stagger as a specific provided signal and Control as a category rollup', () => {
    const presentation = buildDragonDetailPresentation(profileById('feskar'));

    expect(presentation.provides).toEqual(expect.arrayContaining(['Stagger', 'Control']));
  });

  it('preserves known specific status labels in Dragon Details when those signals are present', () => {
    const usedStatusTags = new Set(
      simpleSynergyProfiles.flatMap((profile) =>
        [...profile.outputs, ...profile.supports, ...profile.benefitsFrom].flatMap((signal) => signal.tags ?? [signal.tag]),
      ),
    );
    const expectedSpecificStatuses = [
      'status:burn',
      'status:slow',
      'status:stun',
      'status:stagger',
      'status:panic',
      'status:vulnerable',
    ] as const satisfies readonly SynergyTag[];

    for (const tag of expectedSpecificStatuses.filter((candidate) => usedStatusTags.has(candidate))) {
      const label = SYNERGY_TAG_LABELS[tag];
      const preservingProfiles = simpleSynergyProfiles.filter((profile) =>
        buildDragonDetailPresentation(profile).provides.includes(label) ||
        buildDragonDetailPresentation(profile).benefitsFrom.includes(label),
      );

      expect(preservingProfiles.map((profile) => profile.dragonId), tag).not.toEqual([]);
    }
  });

  it('keeps broad Control rollups from erasing specific provider labels', () => {
    for (const tag of CONTROL_ALIAS_TAGS) {
      const label = SYNERGY_TAG_LABELS[tag];
      const profilesWithTag = simpleSynergyProfiles.filter((profile) =>
        profile.outputs.some((signal) => (signal.tags ?? [signal.tag]).includes(tag)),
      );

      for (const profile of profilesWithTag) {
        const presentation = buildDragonDetailPresentation(profile);
        const signal = profile.outputs.find((candidate) => (candidate.tags ?? [candidate.tag]).includes(tag));
        expect(presentation.provides, `${profile.dragonId}:${tag}`).toContain(signal?.publicLabel ?? label);
        expect(presentation.provides, `${profile.dragonId}:${tag}`).toContain('Control');
      }
    }
  });

  it('qualifies Dawnseeker First Light at 9 Stars and activates it once 10 Stars is selected', () => {
    const atNine = buildDragonDetailPresentation(profileById('dawnseeker'), {
      starRank: 9,
      dragonLevel: 16,
    });
    const atTen = buildDragonDetailPresentation(profileById('dawnseeker'), {
      starRank: 10,
      dragonLevel: 16,
    });

    expect(atNine.provides).not.toContain('Grants First-Strike to both teammates (rounds 1-3)');
    expect(atNine.lockedProvides).toContain(
      'Grants First-Strike to both teammates (rounds 1-3) — inactive until 10★',
    );
    expect(atTen.provides).toContain('Grants First-Strike to both teammates (rounds 1-3)');
    expect(atTen.lockedProvides.join(' ')).not.toContain('First-Strike');
  });

  it('qualifies Vesper Confusion and its Control rollup at 9 Stars without duplicating the active 10-Star labels', () => {
    const atNine = buildDragonDetailPresentation(profileById('vesper'), {
      starRank: 9,
      dragonLevel: 16,
    });
    const atTen = buildDragonDetailPresentation(profileById('vesper'), {
      starRank: 10,
      dragonLevel: 16,
    });

    expect(atNine.provides).not.toEqual(expect.arrayContaining(['Applies Confusion', 'Control']));
    expect(atNine.lockedProvides).toEqual(
      expect.arrayContaining([
        'Applies Confusion — inactive until 10★',
        'Control — inactive until 10★',
      ]),
    );
    expect(atTen.provides).toEqual(expect.arrayContaining(['Applies Confusion', 'Control']));
    expect(atTen.lockedProvides.join(' ')).not.toMatch(/Confusion|Control/);
  });

  it('qualifies a Level 16 Vanguard Trait signal at Level 15 and preserves existing active signals', () => {
    const atFifteen = buildDragonDetailPresentation(profileById('dawnseeker'), {
      starRank: 10,
      dragonLevel: 15,
    });
    const atSixteen = buildDragonDetailPresentation(profileById('dawnseeker'), {
      starRank: 10,
      dragonLevel: 16,
    });

    expect(atFifteen.provides).toContain('Tactical Damage');
    expect(atFifteen.lockedProvides.join(' ')).toMatch(/Fire Damage support.*(Star Rank 1|1★).*Dragon Level 16/);
    expect(atSixteen.provides).toContain('Fire Damage support');
    expect(atSixteen.lockedProvides.join(' ')).not.toMatch(/Fire Damage support.*Dragon Level 16/);
    if (atFifteen.lockedProvides.some((entry) => entry.includes('inactive until Dragon Level 16'))) {
    expect(atFifteen.lockedProvides).toContain(
      'Fire Damage support — inactive until Dragon Level 16',
    );
    expect(atSixteen.provides).toContain('Fire Damage support');
    expect(atSixteen.lockedProvides).not.toContain(
      'Fire Damage support — inactive until Dragon Level 16',
    );
    }
  });
});
