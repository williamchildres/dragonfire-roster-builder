import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import {
  buildFormationCardPresentation,
  dedupeSemanticCardBulletCandidates,
  type FormationCardPresentation,
} from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const reactiveFormation = {
  'left-flank': 'syrax',
  vanguard: 'vermax',
  'right-flank': 'caraxes',
} as const satisfies FormationAnalysisInput;

const reactiveBaseBullet = "Vermax's Reactive Instincts increases Vermax's Instinct by +18% and Initiative by +9%. Timing: Start of Combat. Enhanced by Strength. Scaling stat: Strength. Duration: until end of combat.";
const reactiveRelationshipBullet = "Dragon's Valor Strength support for Reactive Instincts' Instinct and Initiative increases.";

const regressionCases: Array<{
  label: string;
  formation: FormationAnalysisInput;
  dragonLevels: Record<string, number>;
  expectedCounts: Record<TraceStatus | 'total', number>;
  expectedCards: string[];
  savedHabitLevel?: 0 | 1 | 2 | 3 | 4 | 5;
}> = [
  { label: 'Syrax / Vermax / Caraxes', formation: reactiveFormation, dragonLevels: { syrax: 26, vermax: 26, caraxes: 26 }, expectedCounts: { active: 33, potential: 18, inactive: 11, blocked: 1, unknown: 1, 'not-applicable': 0, total: 64 }, expectedCards: ['syrax:7/9', 'vermax:5/5', 'caraxes:9/8'] },
  { label: 'Malachite / Venator / Vermax', formation: { 'left-flank': 'malachite', vanguard: 'venator', 'right-flank': 'vermax' }, dragonLevels: { malachite: 26, venator: 26, vermax: 26 }, expectedCounts: { active: 24, potential: 31, inactive: 9, blocked: 1, unknown: 1, 'not-applicable': 1, total: 67 }, expectedCards: ['malachite:8/9', 'venator:10/4', 'vermax:6/5'] },
  { label: 'Kalspire / Vhagar / Vermax', formation: { 'left-flank': 'kalspire', vanguard: 'vhagar', 'right-flank': 'vermax' }, dragonLevels: { kalspire: 26, vhagar: 26, vermax: 26 }, expectedCounts: { active: 26, potential: 23, inactive: 11, blocked: 1, unknown: 1, 'not-applicable': 0, total: 62 }, expectedCards: ['kalspire:6/9', 'vhagar:1/8', 'vermax:4/4'] },
  { label: 'Seasmoke / Malachite / Sheepstealer', formation: { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' }, dragonLevels: { seasmoke: 27, malachite: 26, sheepstealer: 26 }, expectedCounts: { active: 24, potential: 23, inactive: 15, blocked: 1, unknown: 3, 'not-applicable': 1, total: 67 }, expectedCards: ['seasmoke:11/7', 'malachite:5/9', 'sheepstealer:11/4'] },
  { label: 'Daemoros / Rhysarion / Shadowsong', formation: { 'left-flank': 'daemoros', vanguard: 'rhysarion', 'right-flank': 'shadowsong' }, dragonLevels: { daemoros: 26, rhysarion: 26, shadowsong: 26 }, expectedCounts: { active: 31, potential: 40, inactive: 9, blocked: 1, unknown: 0, 'not-applicable': 0, total: 81 }, expectedCards: ['daemoros:10/16', 'rhysarion:6/9', 'shadowsong:12/8'], savedHabitLevel: 0 },
  { label: 'Shadowsong / Feskar / Vaeldra', formation: { 'left-flank': 'shadowsong', vanguard: 'feskar', 'right-flank': 'vaeldra' }, dragonLevels: { shadowsong: 26, feskar: 26, vaeldra: 26 }, expectedCounts: { active: 28, potential: 21, inactive: 7, blocked: 1, unknown: 0, 'not-applicable': 0, total: 57 }, expectedCards: ['shadowsong:4/9', 'feskar:6/6', 'vaeldra:5/9'] },
  { label: 'Shadowsong / Feskar / Daemoros', formation: { 'left-flank': 'shadowsong', vanguard: 'feskar', 'right-flank': 'daemoros' }, dragonLevels: { shadowsong: 26, feskar: 26, daemoros: 26 }, expectedCounts: { active: 25, potential: 38, inactive: 9, blocked: 1, unknown: 0, 'not-applicable': 0, total: 73 }, expectedCards: ['shadowsong:6/9', 'feskar:6/6', 'daemoros:6/16'] },
  { label: 'Feskar / Rhysarion / Daemoros', formation: { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'daemoros' }, dragonLevels: { feskar: 26, rhysarion: 26, daemoros: 26 }, expectedCounts: { active: 33, potential: 29, inactive: 13, blocked: 1, unknown: 0, 'not-applicable': 0, total: 76 }, expectedCards: ['feskar:11/5', 'rhysarion:5/9', 'daemoros:9/13'] },
  { label: 'Daemoros / Rhysarion / Vaeldra', formation: { 'left-flank': 'daemoros', vanguard: 'rhysarion', 'right-flank': 'vaeldra' }, dragonLevels: { daemoros: 26, rhysarion: 26, vaeldra: 26 }, expectedCounts: { active: 31, potential: 36, inactive: 9, blocked: 1, unknown: 0, 'not-applicable': 0, total: 77 }, expectedCards: ['daemoros:9/12', 'rhysarion:4/9', 'vaeldra:10/10'] },
  { label: 'Crimson / Seasmoke / Daemoros', formation: { 'left-flank': 'crimson', vanguard: 'seasmoke', 'right-flank': 'daemoros' }, dragonLevels: { crimson: 26, seasmoke: 27, daemoros: 26 }, expectedCounts: { active: 23, potential: 44, inactive: 10, blocked: 1, unknown: 1, 'not-applicable': 0, total: 79 }, expectedCards: ['crimson:5/9', 'seasmoke:7/8', 'daemoros:10/12'] },
  { label: 'Malachite / Rhysarion / Vaeldra', formation: { 'left-flank': 'malachite', vanguard: 'rhysarion', 'right-flank': 'vaeldra' }, dragonLevels: { malachite: 26, rhysarion: 26, vaeldra: 26 }, expectedCounts: { active: 40, potential: 24, inactive: 10, blocked: 1, unknown: 0, 'not-applicable': 1, total: 76 }, expectedCards: ['malachite:8/8', 'rhysarion:10/9', 'vaeldra:13/10'] },
  { label: 'Seasmoke / Vhagar / Sheepstealer', formation: { 'left-flank': 'seasmoke', vanguard: 'vhagar', 'right-flank': 'sheepstealer' }, dragonLevels: { seasmoke: 27, vhagar: 26, sheepstealer: 26 }, expectedCounts: { active: 19, potential: 25, inactive: 14, blocked: 1, unknown: 3, 'not-applicable': 0, total: 62 }, expectedCards: ['seasmoke:5/7', 'vhagar:5/6', 'sheepstealer:7/4'] },
];

function buildAnalysis(
  formation: FormationAnalysisInput,
  dragonLevels: Record<string, number>,
  savedHabitLevel?: 0 | 1 | 2 | 3 | 4 | 5,
) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of Object.values(formation)) {
    if (!dragonId) {
      continue;
    }
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = dragonLevels[dragonId] ?? 26;
    if (savedHabitLevel !== undefined) {
      for (const habitId of Object.keys(entry.habitLevels)) {
        entry.habitLevels[habitId] = savedHabitLevel;
      }
    }
  }
  const traces = analyzeFormationTraces(formation, dragons, { roster, dragonLevels });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { traces, presentation };
}

function counts(traces: SynergyTrace[]) {
  return traces.reduce<Record<TraceStatus | 'total', number>>((acc, trace) => {
    acc[trace.status] += 1;
    acc.total += 1;
    return acc;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0, total: 0 });
}

function duplicateBulletCount(presentation: FormationCardPresentation) {
  return presentation.cards.flatMap((card) => [...card.receives, ...card.provides]).reduce((total, item) => {
    const lines = [...item.summaryLines, ...item.modifierLines];
    return total + lines.length - new Set(lines).size;
  }, 0);
}

function allCardText(presentation: FormationCardPresentation) {
  return presentation.cards
    .flatMap((card) => [...card.receives, ...card.provides])
    .flatMap((item) => [item.abilityName, item.effectTitle, item.title, item.summary, item.detail, ...item.summaryLines, ...item.modifierLines, ...item.details, ...item.effects])
    .join(' ');
}

describe('semantic card bullet dedup pass 20C', () => {
  it('keeps Reactive Instincts counts stable and canonicalizes Dragon Valor dependency bullets', () => {
    const { traces, presentation } = buildAnalysis(reactiveFormation, { syrax: 26, vermax: 26, caraxes: 26 });
    expect(counts(traces)).toEqual({ active: 33, potential: 18, inactive: 11, blocked: 1, unknown: 1, 'not-applicable': 0, total: 64 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    expect(presentation.cards.map((card) => ({ dragonId: card.dragonId, receives: card.receives.length, provides: card.provides.length }))).toEqual([
      { dragonId: 'syrax', receives: 7, provides: 9 },
      { dragonId: 'vermax', receives: 5, provides: 5 },
      { dragonId: 'caraxes', receives: 9, provides: 8 },
    ]);

    const vermax = presentation.cards.find((card) => card.dragonId === 'vermax')!;
    for (const direction of ['receives', 'provides'] as const) {
      const cards = vermax[direction].filter((item) => item.abilityName === 'Reactive Instincts');
      expect(cards).toHaveLength(1);
      const card = cards[0]!;
      expect(card.summaryLines).toContain(reactiveBaseBullet);
      expect(card.modifierLines).toEqual([reactiveRelationshipBullet]);
      expect([...card.summaryLines, ...card.modifierLines].filter((line) => /Dragon's Valor/.test(line))).toHaveLength(1);
      expect([...card.summaryLines, ...card.modifierLines].join(' ')).not.toContain("Strength support for Reactive Instincts' allied Instinct increase");
      expect([...card.summaryLines, ...card.modifierLines].join(' ')).not.toContain("Reactive Instincts' Instincts");
    }
    expect(duplicateBulletCount(presentation)).toBe(0);
  });

  it('dedupes semantic candidates by relationship identity without requiring exact text', () => {
    const candidates = dedupeSemanticCardBulletCandidates([
      { text: "Strength support for Reactive Instincts' allied Instinct increase.", relationshipIdentity: 'receives|trace-a' },
      { text: reactiveRelationshipBullet, relationshipIdentity: 'receives|trace-a', canonical: true },
      { text: "Dragon's Valor Strength support for Other Ability's Strength increase.", relationshipIdentity: 'receives|trace-b', canonical: true },
      { text: reactiveRelationshipBullet, relationshipIdentity: 'provides|trace-a', canonical: true },
    ]);

    expect(candidates.map((candidate) => candidate.text)).toEqual([
      reactiveRelationshipBullet,
      "Dragon's Valor Strength support for Other Ability's Strength increase.",
      reactiveRelationshipBullet,
    ]);
  });

  it('preserves distinct support bullets in the Syrax Vermax Caraxes formation', () => {
    const { traces, presentation } = buildAnalysis(reactiveFormation, { syrax: 26, vermax: 26, caraxes: 26 });
    const text = allCardText(presentation);

    expect(traces.filter((trace) => trace.sourceAbilityId === 'syrax-flight-mastery' && trace.recipientAbilityId === 'syrax-mindful-synergy')).toHaveLength(1);
    expect(traces.some((trace) => trace.sourceAbilityId === 'syrax-flight-mastery' && trace.recipientAbilityId === 'vhagar-strategic-revival')).toBe(false);
    expect(text).toContain("Flight Mastery's allied Initiative increase");
    expect(text).toContain("Mindful Synergy's allied Intelligence increase");
    expect(text).toContain("Mindful Synergy's allied Instinct increase");
    expect(text).toContain("Flight Mastery's Enemy Initiative reduction");
    expect(text).toContain("Blazing Fury");
    expect(text).toContain("Infernal Burst");
    expect(text).toContain("Crippling Inferno");
    expect(text).toContain("Battle Dread");
    expect(text).toContain("Warrior's Zeal");
    expect(text).toContain("Strategic Revival");
    expect(text).toContain("Blood Wyrm");
  });

  it.each(regressionCases)('$label preserves Pass 20B trace and card counts without duplicate bullets', ({ formation, dragonLevels, expectedCounts, expectedCards, savedHabitLevel }) => {
    const { traces, presentation } = buildAnalysis(formation, dragonLevels, savedHabitLevel);
    expect(counts(traces)).toEqual(expectedCounts);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
    expect(presentation.cards.map((card) => `${card.dragonId}:${card.receives.length}/${card.provides.length}`)).toEqual(expectedCards);
    expect(duplicateBulletCount(presentation)).toBe(0);
    expect(allCardText(presentation)).not.toMatch(/Reactive Instincts' Instincts|Battle Cunning's Strengths|Mindful Synergy's Intelligences/);
  });
});
