import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { createEmptyRoster } from '../services/rosterStorage';
import {
  defaultRosterWorkspaceFilters,
  clearConsumedSelectionRequest,
  filterAndSortRosterDragons,
  filtersRevealingDragon,
  hasAllProgression,
  nextSelectionAfterRemoval,
  unlockedHabitCount,
  type RosterWorkspaceFilters,
} from '../app/rosterWorkspaceState';
import { rosterEstimatedPowerPresentation } from '../app/rosterEstimatedPowerPresentation';
import type { Dragon } from '../models/dragon';

const byId = (id: string) => dragons.find((dragon) => dragon.id === id)!;

describe('roster workspace state', () => {
  it('shows only owned dragons and normalizes case and surrounding search whitespace', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.vhagar!.owned = true;

    expect(filterAndSortRosterDragons(dragons, roster, defaultRosterWorkspaceFilters, 'name').map((dragon) => dragon.id)).toEqual(['syrax', 'vhagar']);
    expect(filterAndSortRosterDragons(dragons, roster, { ...defaultRosterWorkspaceFilters, search: '  sYrAx  ' }, 'name').map((dragon) => dragon.id)).toEqual(['syrax']);
  });

  it('filters canonical rarity and breed values', () => {
    const roster = createEmptyRoster(dragons);
    for (const dragon of dragons) roster[dragon.id]!.owned = true;

    const legendarySentinels: RosterWorkspaceFilters = {
      ...defaultRosterWorkspaceFilters,
      rarity: 'Legendary',
      breed: 'Sentinel',
    };
    const result = filterAndSortRosterDragons(dragons, roster, legendarySentinels, 'name');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((dragon) => dragon.rarity === 'Legendary' && dragon.breed === 'Sentinel')).toBe(true);
  });

  it('counts unlocked habits and bases progression completeness only on Star Rank and Dragon Level', () => {
    const dragon = byId('syrax');
    const roster = createEmptyRoster(dragons);
    const entry = roster.syrax!;
    entry.owned = true;
    entry.starRank = 1;
    entry.reignLevel = 0;

    expect(unlockedHabitCount(dragon, entry)).toBe(0);
    expect(hasAllProgression(entry)).toBe(true);
    expect(filterAndSortRosterDragons(dragons, roster, { ...defaultRosterWorkspaceFilters, details: 'complete' }, 'name')).toEqual([dragon]);
    expect(filterAndSortRosterDragons(dragons, roster, { ...defaultRosterWorkspaceFilters, details: 'missing' }, 'name')).toEqual([]);

    entry.starRank = null;
    expect(hasAllProgression(entry)).toBe(false);
    expect(filterAndSortRosterDragons(dragons, roster, { ...defaultRosterWorkspaceFilters, details: 'missing' }, 'name')).toEqual([dragon]);
  });

  it('filters trimmed notes independently from progression', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.vhagar!.owned = true;
    roster.syrax!.notes = '  formation anchor  ';
    roster.vhagar!.notes = '   ';

    expect(filterAndSortRosterDragons(dragons, roster, { ...defaultRosterWorkspaceFilters, details: 'has-notes' }, 'name').map((dragon) => dragon.id)).toEqual(['syrax']);
    expect(filterAndSortRosterDragons(dragons, roster, { ...defaultRosterWorkspaceFilters, details: 'no-notes' }, 'name').map((dragon) => dragon.id)).toEqual(['vhagar']);
  });

  it('sorts rarity, Star Rank, and Dragon Level deterministically with nulls last and name tie-breaks', () => {
    const roster = createEmptyRoster(dragons);
    const selected = ['syrax', 'vhagar', 'caraxes', 'daemoros'];
    for (const id of selected) roster[id]!.owned = true;
    roster.syrax!.starRank = 8;
    roster.vhagar!.starRank = 8;
    roster.caraxes!.starRank = null;
    roster.daemoros!.starRank = 3;
    roster.syrax!.reignLevel = null;
    roster.vhagar!.reignLevel = 12;
    roster.caraxes!.reignLevel = 20;
    roster.daemoros!.reignLevel = 20;

    expect(filterAndSortRosterDragons(dragons, roster, defaultRosterWorkspaceFilters, 'rarity').map((dragon) => dragon.id)).toEqual(['caraxes', 'syrax', 'vhagar', 'daemoros']);
    expect(filterAndSortRosterDragons(dragons, roster, defaultRosterWorkspaceFilters, 'star-rank').map((dragon) => dragon.id)).toEqual(['syrax', 'vhagar', 'daemoros', 'caraxes']);
    expect(filterAndSortRosterDragons(dragons, roster, defaultRosterWorkspaceFilters, 'dragon-level').map((dragon) => dragon.id)).toEqual(['caraxes', 'daemoros', 'vhagar', 'syrax']);
  });

  it('sorts Estimated Power descending, with numeric power outranking confidence', () => {
    const lowConfidence = { ...byId('syrax'), id: 'low-confidence', name: 'Low Confidence' };
    const observed = { ...byId('antares'), id: 'observed', name: 'Observed' };
    const allDragons = [observed, lowConfidence];
    const roster = createEmptyRoster(allDragons);
    roster['low-confidence'] = { ...roster['low-confidence']!, owned: true, starRank: 10, reignLevel: 100 };
    roster.observed = { ...roster.observed!, owned: true, starRank: 4, reignLevel: 29 };

    const low = rosterEstimatedPowerPresentation(lowConfidence, roster['low-confidence']);
    const exact = rosterEstimatedPowerPresentation(observed, roster.observed);
    expect(low).toMatchObject({ status: 'available', confidence: 'low', basis: 'extrapolation' });
    expect(exact).toMatchObject({ status: 'available', power: 13000, confidence: 'observed', basis: 'exact-observation' });
    expect(low.power).toBeGreaterThan(exact.power!);
    expect(filterAndSortRosterDragons(allDragons, roster, defaultRosterWorkspaceFilters, 'estimated-power').map((dragon) => dragon.id)).toEqual(['low-confidence', 'observed']);
  });

  it('uses name and canonical ID for equal Estimated Power ties', () => {
    const source = byId('syrax');
    const tied: Dragon[] = [
      { ...source, id: 'b', name: 'Alpha' },
      { ...source, id: 'a', name: 'Alpha' },
      { ...source, id: 'c', name: 'Beta' },
    ];
    const roster = createEmptyRoster(tied);
    for (const dragon of tied) roster[dragon.id] = { ...roster[dragon.id]!, owned: true, starRank: 4, reignLevel: 35 };
    expect(filterAndSortRosterDragons(tied, roster, defaultRosterWorkspaceFilters, 'estimated-power').map((dragon) => dragon.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts missing Star Rank and Dragon Level after calculable entries and keeps unavailable rows deterministic', () => {
    const roster = createEmptyRoster(dragons);
    const selected = ['syrax', 'vhagar', 'caraxes', 'daemoros'];
    for (const id of selected) roster[id]!.owned = true;
    roster.syrax = { ...roster.syrax!, starRank: 4, reignLevel: 35 };
    roster.vhagar = { ...roster.vhagar!, starRank: null, reignLevel: 35 };
    roster.caraxes = { ...roster.caraxes!, starRank: 4, reignLevel: null };
    roster.daemoros = { ...roster.daemoros!, starRank: null, reignLevel: null };
    expect(filterAndSortRosterDragons(dragons, roster, defaultRosterWorkspaceFilters, 'estimated-power').map((dragon) => dragon.id)).toEqual(['syrax', 'caraxes', 'daemoros', 'vhagar']);
    expect(rosterEstimatedPowerPresentation(vhagarOrThrow(), roster.vhagar)).toEqual({ status: 'unavailable', power: null, confidence: null, basis: null });
  });

  it('chooses the next visible row, then previous, then no selection after removal', () => {
    expect(nextSelectionAfterRemoval(['a', 'b', 'c'], 'b')).toBe('c');
    expect(nextSelectionAfterRemoval(['a', 'b'], 'b')).toBe('a');
    expect(nextSelectionAfterRemoval(['a'], 'a')).toBeNull();
  });

  it('clears only filters that hide a newly selected dragon and preserves matching filters', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    const filters: RosterWorkspaceFilters = {
      search: 'Caraxes',
      rarity: 'Legendary',
      breed: 'Hunter',
      details: 'missing',
    };

    expect(filtersRevealingDragon(filters, byId('syrax'), roster.syrax)).toEqual({
      search: '',
      rarity: 'Legendary',
      breed: 'all',
      details: 'missing',
    });
  });

  it('does not let a stale acknowledgement clear a newer selection request', () => {
    const newerRequest = { dragonId: 'vhagar', requestId: 2 };
    expect(clearConsumedSelectionRequest(newerRequest, 1)).toBe(newerRequest);
    expect(clearConsumedSelectionRequest(newerRequest, 2)).toBeNull();
  });
});

function vhagarOrThrow() {
  return byId('vhagar');
}
