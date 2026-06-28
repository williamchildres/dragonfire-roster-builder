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
  '3': { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
  '4': { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '8': { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
  multi: { 'left-flank': 'caraxes', vanguard: 'malachite', 'right-flank': 'seasmoke' },
  epic: { 'left-flank': 'daemoros', vanguard: 'vaeldra', 'right-flank': 'vermax' },
  eclipse: { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'kalspire' },
  '13': { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  '14': { 'left-flank': 'seasmoke', vanguard: 'sheepstealer', 'right-flank': 'malachite' },
  '15': { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'caraxes' },
  '16': { 'left-flank': 'malachite', vanguard: 'caraxes', 'right-flank': 'sheepstealer' },
  legacy: { 'left-flank': 'venator', vanguard: 'vhagar', 'right-flank': 'syrax' },
  commandAugments: { 'left-flank': 'sheepstealer', vanguard: 'crimson', 'right-flank': 'kalspire' },
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

function selectedRoster(dragonIds: string[], level = 26, starRank = 1) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of dragonIds) {
    const entry = roster[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = starRank;
    entry!.reignLevel = level;
  }
  return roster;
}

function interactionHeading(item: { sourceName: string; recipientName: string | null; targetLabel: string | null }) {
  return `${item.sourceName} → ${item.targetLabel ?? item.recipientName ?? 'Team'}`;
}

function legacyPresentation() {
  const formation = formations.legacy!;
  const roster = selectedRoster(['venator', 'vhagar', 'syrax'], 26, 10);
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { venator: 26, vhagar: 26, syrax: 26 },
  });
  return buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });
}

describe('formation card analysis presentation', () => {
  it('maps source dragons to Provides and recipient dragons to Receives without internal traces', () => {
    const result = presentation('1', true);
    const vermax = card(result, 'vermax');
    const malachite = card(result, 'malachite');

    expect(vermax.provides.some((item) => item.abilityName === 'Spreading Blaze')).toBe(true);
    expect(malachite.receives.some((item) => item.sourceDragonId === 'vermax' && item.abilityName === 'Spreading Blaze')).toBe(true);
    const selfCards = result.cards.flatMap((item) => [...item.receives, ...item.provides]).filter((item) => item.sourceDragonId === item.recipientDragonId);
    expect(selfCards.every((item) => item.summary.includes('Recovery support'))).toBe(true);
  });

  it('keeps target-selection candidates distinct from guaranteed recipients', () => {
    const result = presentation('8', true);
    const syrax = card(result, 'syrax');
    const caraxes = card(result, 'caraxes');
    const sheepstealer = card(result, 'sheepstealer');

    const providerGroups = syrax.provides.filter((item) => item.abilityName === 'Blazing Fury' || item.abilityName === 'Tactical Inferno');
    expect(providerGroups.filter((item) => item.candidateTotal === 2)).toHaveLength(1);
    expect(caraxes.receives.some((item) => item.isCandidate && item.candidateTotal === 2 && item.summary.includes('Fire Damage support'))).toBe(true);
    expect(sheepstealer.receives.some((item) => item.isCandidate && item.candidateTotal === 2 && item.summary.includes('Fire Damage support'))).toBe(true);
    expect(caraxes.receives.some((item) => item.abilityName === 'Tactical Inferno')).toBe(false);
    expect(sheepstealer.receives.some((item) => item.abilityName === 'Tactical Inferno')).toBe(false);
    expect(caraxes.receives.find((item) => item.abilityName === 'Blazing Fury')?.relationshipId).toBe(
      syrax.provides.find((item) => item.abilityName === 'Blazing Fury')?.relationshipId,
    );
  });

  it('keeps all-matching defensive support hidden in current mode when locked', () => {
    const roster = selectedRoster(['malachite', 'vermax', 'seasmoke']);
    const result = presentation('3', false, { roster });

    const vermax = card(result, 'vermax');
    const malachite = card(result, 'malachite');
    const seasmoke = card(result, 'seasmoke');

    expect(vermax.provides.some((item) => item.abilityName === 'Trial by Flame')).toBe(false);
    expect(malachite.receives.some((item) => item.abilityName === 'Trial by Flame')).toBe(false);
    expect(seasmoke.receives.some((item) => item.abilityName === 'Trial by Flame')).toBe(false);
  });

  it('presents all-matching defensive recipients without candidate-selection wording', () => {
    const roster = selectedRoster(['malachite', 'vermax', 'seasmoke']);
    const result = presentation('3', true, { roster });

    const vermax = card(result, 'vermax');
    const malachite = card(result, 'malachite');
    const seasmoke = card(result, 'seasmoke');
    const providerCards = vermax.provides.filter((item) => item.abilityName === 'Trial by Flame');
    const malachiteReceives = malachite.receives.filter((item) => item.abilityName === 'Trial by Flame');
    const seasmokeReceives = seasmoke.receives.filter((item) => item.abilityName === 'Trial by Flame');

    expect(providerCards).toHaveLength(1);
    expect(malachiteReceives).toHaveLength(1);
    expect(seasmokeReceives).toHaveLength(1);
    expect(vermax.receives.some((item) => item.abilityName === 'Trial by Flame')).toBe(false);

    const provider = providerCards[0]!;
    const providerText = [provider.summary, provider.detail, ...provider.summaryLines, ...provider.details, ...provider.effects].join(' ');
    const malachiteText = [malachiteReceives[0]?.summary, malachiteReceives[0]?.detail, ...(malachiteReceives[0]?.summaryLines ?? []), ...(malachiteReceives[0]?.details ?? []), ...(malachiteReceives[0]?.effects ?? [])].join(' ');
    const seasmokeText = [seasmokeReceives[0]?.summary, seasmokeReceives[0]?.detail, ...(seasmokeReceives[0]?.summaryLines ?? []), ...(seasmokeReceives[0]?.details ?? []), ...(seasmokeReceives[0]?.effects ?? [])].join(' ');
    expect(provider.state).toBe('preview');
    expect(provider.effectTitle).toBe('Trial by Flame');
    expect(provider.targetSummary).toContain('All matching allies: Malachite and Seasmoke.');
    expect(provider.targetSummary).toContain('Known recipient count: 2.');
    expect(provider.targetSummary).toContain('Each eligible recipient evaluates its own condition.');
    expect(providerText).toContain('Below 75% Troop Capacity');
    expect(providerText).toContain('Below 50% Troop Capacity');
    expect(providerText).toContain('Below 25% Troop Capacity');
    expect(providerText).toContain('Fire Damage Received -10%');
    expect(providerText).toContain('Resistance');
    expect(providerText).toContain('receive Resistance, reducing Damage Received by 20%');
    expect(providerText).toContain('Fire Damage Received -30%');
    expect(providerText).toContain('until end of the current round.');
    expect(providerText).not.toMatch(/one .*recipient is selected/i);
    expect(providerText).not.toContain('Target not guaranteed');
    expect(provider.detail).toContain('Threshold applicability depends on each recipient\'s current Troop Capacity');
    expect(provider.detail).toContain('exact interaction between overlapping threshold tiers is unresolved');
    expect(provider.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Vermax - Trial by Flame Habit unlock requirement', satisfied: false }),
      expect.objectContaining({ label: 'Vermax - Trial by Flame Selected Habit Level', satisfied: false }),
    ]));

    expect(malachiteText).toContain('Below 75% Troop Capacity');
    expect(malachiteText).toContain('Below 50% Troop Capacity');
    expect(malachiteText).toContain('Below 25% Troop Capacity');
    expect(seasmokeText).toContain('Below 75% Troop Capacity');
    expect(seasmokeText).toContain('Below 50% Troop Capacity');
    expect(seasmokeText).toContain('Below 25% Troop Capacity');
    expect(malachiteText).not.toContain('Target not guaranteed');
    expect(seasmokeText).not.toContain('Target not guaranteed');
    expect(malachiteReceives[0]?.traceIds).toEqual(provider.traceIds);
    expect(seasmokeReceives[0]?.traceIds).toEqual(provider.traceIds);
  });

  it('preserves Trial by Flame threshold details in visible card aggregation', () => {
    const roster = selectedRoster(['daemoros', 'vaeldra', 'vermax'], 26, 10);
    const result = presentation('epic', false, { roster });

    const vermax = card(result, 'vermax');
    const daemoros = card(result, 'daemoros');
    const vaeldra = card(result, 'vaeldra');
    const providerCards = vermax.provides.filter((item) => item.abilityName === 'Trial by Flame');
    const daemorosCards = daemoros.receives.filter((item) => item.abilityName === 'Trial by Flame');
    const vaeldraCards = vaeldra.receives.filter((item) => item.abilityName === 'Trial by Flame');

    expect(providerCards).toHaveLength(1);
    expect(daemorosCards).toHaveLength(1);
    expect(vaeldraCards).toHaveLength(1);
    expect(vermax.receives.some((item) => item.abilityName === 'Trial by Flame')).toBe(false);

    const provider = providerCards[0]!;
    const daemorosText = [daemorosCards[0]?.summary, daemorosCards[0]?.detail, ...(daemorosCards[0]?.summaryLines ?? []), ...(daemorosCards[0]?.details ?? []), ...(daemorosCards[0]?.effects ?? [])].join(' ');
    const vaeldraText = [vaeldraCards[0]?.summary, vaeldraCards[0]?.detail, ...(vaeldraCards[0]?.summaryLines ?? []), ...(vaeldraCards[0]?.details ?? []), ...(vaeldraCards[0]?.effects ?? [])].join(' ');
    const providerText = [provider.summary, provider.detail, ...provider.summaryLines, ...provider.details, ...provider.effects].join(' ');

    expect(provider.state).toBe('conditional');
    expect(provider.effectTitle).toBe('Trial by Flame');
    expect(provider.targetSummary).toContain('All matching allies: Daemoros and Vaeldra.');
    expect(provider.targetSummary).toContain('Known recipient count: 2.');
    expect(provider.targetSummary).toContain('Each eligible recipient evaluates its own condition.');

    for (const text of [providerText, daemorosText, vaeldraText]) {
      expect(text).toContain('Below 75% Troop Capacity');
      expect(text).toContain('Below 50% Troop Capacity');
      expect(text).toContain('Below 25% Troop Capacity');
      expect(text).toContain('Fire Damage Received -5%');
      expect(text).toContain('Resistance');
      expect(text).toContain('receive Resistance, reducing Damage Received by 10%');
      expect(text).toContain('Fire Damage Received -15%');
      expect(text).toContain('until end of the current round.');
      expect(text).not.toContain('one candidate is selected');
      expect(text).not.toContain('Target not guaranteed');
      expect(text).not.toContain('cumulative');
      expect(text).not.toContain('strongest');
    }
  });

  it('preserves exclusive, repeated, branch, stack, and linked-cleanse mechanics in the Epic regression formation', () => {
    const roster = selectedRoster(['daemoros', 'vaeldra', 'vermax'], 26, 10);
    const formation = formations.epic!;
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { daemoros: 26, vaeldra: 26, vermax: 26 },
    });
    const result = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const daemoros = card(result, 'daemoros');
    const vaeldra = card(result, 'vaeldra');
    const vermax = card(result, 'vermax');

    expect(daemoros.provides.some((item) => item.abilityName === "Phantom's Veil")).toBe(false);
    expect(daemoros.receives.some((item) => item.abilityName === "Phantom's Veil")).toBe(false);
    expect(traces.some((trace) =>
      trace.sourceAbilityId === 'daemoros-phantoms-veil' &&
      /Exclusive one-of choice/i.test([...trace.effects, ...trace.matchedFacts, trace.explanation].join(' '))
    )).toBe(true);

    expect(vaeldra.command?.summaryLines).toEqual([
      'Each Round: 25% chance to apply Taunt to 3 enemies in any lane for 2 rounds. Shared versus per-target roll scope is unresolved.',
      'Other odd-numbered rounds: deal Physical Damage at a 45% rate to 2 enemies within adjacency.',
    ]);

    const siren = vaeldra.provides.find((item) => item.abilityName === "Siren's Call" && /Enemy status branch/i.test([item.effectTitle, item.title, item.summary].join(' ')));
    const sirenText = siren ? [siren.summary, siren.detail, ...siren.summaryLines, ...siren.details, ...siren.effects].join(' ') : '';
    expect(siren).toBeDefined();
    expect(sirenText).toContain('40%');
    expect(sirenText).toContain('non-Taunted enemies');
    expect(sirenText).toContain('already-Taunted enemies');
    expect(sirenText).toContain('Exactly one branch applies per enemy');
    expect(sirenText).toContain('Roll scope is unresolved');

    expect(vermax.command?.summaryLines).toEqual([
      'After each Basic Attack: deal Physical Damage at a 50% rate to one enemy in the same lane.',
      'Then there is a 20% chance to grant one Spreading Blaze stack to one Ally that deals Tactical Damage. Each stack increases Tactical Damage Dealt by 2.5%, up to 10 stacks.',
      'If any enemy deals Fire Damage, repeat the stack chance once.',
    ]);

    const lure = vaeldra.provides.find((item) => item.abilityName === 'Lure');
    const lureText = lure ? [lure.summary, lure.detail, ...lure.summaryLines, ...lure.details, ...lure.effects].join(' ') : '';
    expect(lure).toBeDefined();
    expect(lure?.effectTitle).toContain('Conditional status enablement');
    expect(lureText).toContain('25% chance each round to Taunt 3 enemies in any lane, for 2 rounds.');
    expect(lureText).toContain('Whether this uses one shared roll or separate per-target rolls is unresolved.');

    const spreading = daemoros.receives.find((item) => item.sourceDragonId === 'vermax' && item.abilityName === 'Spreading Blaze');
    const spreadingText = spreading ? [spreading.summary, spreading.detail, ...spreading.summaryLines, ...spreading.details, ...spreading.effects].join(' ') : '';
    expect(spreading).toBeDefined();
    expect(spreading?.effectTitle).toContain('stack support');
    expect(spreadingText).toContain('20% chance to grant Daemoros one Spreading Blaze stack.');
    expect(spreadingText).toContain('Each stack increases Tactical Damage Dealt by 2.5%, up to 10 stacks, until the end of combat. Current stack count is unknown.');
    expect(spreadingText).toContain('If at least one enemy deals Fire Damage, the stack attempt repeats once. The repeated attempt remains chance-based.');
    expect(spreadingText).not.toContain('Shared stack pool: spreading-blaze');
    expect(spreadingText).not.toContain('spreading-blaze');

    const rallyingSelf = vermax.provides.find((item) => item.abilityName === 'Rallying Flame' && item.recipientDragonId === 'vermax');
    const rallyingAlly = daemoros.receives.find((item) => item.sourceDragonId === 'vermax' && item.abilityName === 'Rallying Flame');
    const rallyingText = [rallyingSelf, rallyingAlly]
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .flatMap((item) => [item.summary, item.detail, ...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');
    expect(rallyingSelf).toBeDefined();
    expect(rallyingAlly).toBeDefined();
    expect(rallyingSelf?.effectTitle).toContain('stack support');
    expect(rallyingAlly?.effectTitle).toContain('stack support');
    expect(rallyingText).toContain('50% chance at the start of combat to gain one Rallying Flame stack.');
    expect(rallyingText).toContain('On the same successful Rallying Flame activation, Daemoros gains one Spreading Blaze stack.');
    expect(rallyingText).toContain('Each stack increases Physical Damage Dealt by 5%, up to 4 stacks, until the end of combat. Current stack count is unknown.');
    expect(rallyingText).toContain('The activation repeats once for each enemy that deals Fire Damage. The number of matching enemies is unresolved, and every repeated attempt remains a 50% chance.');
    expect(rallyingText).toContain('Each stack increases Tactical Damage Dealt by 2.5%, up to 10 stacks, until the end of combat. Current stack count is unknown.');
    expect(rallyingText).not.toContain('Shared stack pool: rallying-flame');
    expect(rallyingText).not.toContain('Shared stack pool: spreading-blaze');

    const resolve = vermax.provides.find((item) => item.abilityName === 'Unyielding Resolve');
    const resolveText = resolve ? [resolve.summary, resolve.detail, ...resolve.summaryLines, ...resolve.details, ...resolve.effects].join(' ') : '';
    expect(resolve).toBeDefined();
    expect(resolve?.effectTitle).toContain('Control cleanse');
    expect(resolveText).toContain('20% chance to gain Advantage +15% for 2 rounds');
    expect(resolveText).toContain('While Weakened, the chance increases to 30%');
    expect(resolveText).toContain('Advantage and removal of Weakened share the same successful activation.');
    expect(resolveText).toContain('The cleanse does not receive an independent roll.');
    expect(resolveText).not.toContain('unyielding-resolve-start-round-shared-activation');
  });

  it('honors two-target ally cardinality without candidate wording', () => {
    const roster = selectedRoster(['caraxes', 'malachite', 'seasmoke'], 26, 10);
    const result = presentation('multi', false, { roster });
    const malachite = card(result, 'malachite');
    const caraxes = card(result, 'caraxes');
    const seasmoke = card(result, 'seasmoke');

    const forestTactical = malachite.provides.find((item) =>
      item.abilityName === "Forest's Instinct" &&
      /Tactical Damage Received support/i.test([item.effectTitle, item.title, item.summary].join(' ')),
    );
    const forestPhysical = malachite.provides.find((item) =>
      item.abilityName === "Forest's Instinct" &&
      /Physical Damage support/i.test([item.effectTitle, item.title, item.summary].join(' ')),
    );
    const loyalDamage = seasmoke.provides.find((item) =>
      item.abilityName === 'Loyal Bond' &&
      /Damage Dealt support/i.test([item.effectTitle, item.title, item.summary].join(' ')),
    );
    const loyalResistance = seasmoke.provides.find((item) =>
      item.abilityName === 'Loyal Bond' &&
      /Damage Received support/i.test([item.effectTitle, item.title, item.summary].join(' ')),
    );

    expect(forestTactical?.state).toBe('conditional');
    expect(forestTactical?.title).toContain('Tactical Damage Received');
    expect(forestTactical?.effectTitle).toBe("Forest's Instinct - Tactical Damage Received support");
    expect(forestTactical?.summary).toContain('Caraxes and Seasmoke');
    expect(forestTactical?.summary).toContain("Forest's Instinct reduces Tactical Damage Received for Caraxes and Seasmoke by 8%.");
    expect(forestTactical?.summary).toContain('Activation chance: 35%.');
    expect(forestTactical?.summary).toContain('Duration: 2 rounds.');
    expect(forestTactical?.summary).not.toContain('Target not guaranteed');
    expect(forestTactical?.summary).not.toContain('one candidate is selected');

    expect(forestPhysical?.state).toBe('conditional');
    expect(interactionHeading(forestPhysical!)).toBe('Malachite → Seasmoke');
    expect(forestPhysical?.summary).toContain('Seasmoke');
    expect(forestPhysical?.summary).not.toContain('Caraxes');
    expect(forestPhysical?.summary).not.toContain('Target not guaranteed');

    expect(loyalDamage?.state).toBe('conditional');
    expect(interactionHeading(loyalDamage!)).toBe('Seasmoke → Caraxes and Malachite');
    expect(loyalDamage?.summary).toContain('Caraxes and Malachite');
    expect(loyalDamage?.summary).toContain('Each recipient above 50% Troop Capacity may receive Advantage, increasing Damage Dealt by 20%.');
    expect(loyalDamage?.summary).toContain('Activation chance: 10%.');
    expect(loyalDamage?.summary).toContain('Duration: 2 rounds.');
    expect(loyalDamage?.summary).not.toContain('Target not guaranteed');
    expect(loyalDamage?.summary).not.toContain('one candidate is selected');

    expect(loyalResistance?.state).toBe('conditional');
    expect(interactionHeading(loyalResistance!)).toBe('Seasmoke → Caraxes and Malachite');
    expect(loyalResistance?.summary).toContain('Caraxes and Malachite');
    expect(loyalResistance?.summary).toContain('Each recipient below 50% Troop Capacity may receive Resistance, reducing Damage Received by 20%.');
    expect(loyalResistance?.summary).toContain('Activation chance: 10%.');
    expect(loyalResistance?.summary).toContain('Duration: 2 rounds.');
    expect(loyalResistance?.summary).not.toContain('Target not guaranteed');
    expect(loyalResistance?.summary).not.toContain('one candidate is selected');

    expect(seasmoke.provides.filter((item) => item.abilityName === 'Loyal Bond')).toHaveLength(2);
    expect(caraxes.receives.some((item) => item.abilityName === "Forest's Instinct" && /one candidate is selected|Target not guaranteed/i.test(item.summary))).toBe(false);
    expect(seasmoke.receives.some((item) => item.abilityName === "Forest's Instinct" && /one candidate is selected|Target not guaranteed/i.test(item.summary))).toBe(false);
  });

  it('keeps candidate-selection support wording for Eclipse Cover', () => {
    const roster = selectedRoster(['crimson', 'vhagar', 'kalspire']);
    const result = presentation('eclipse', true, { roster });
    const vhagar = card(result, 'vhagar');

    const eclipse = vhagar.provides.find((item) =>
      item.abilityName === 'Eclipse Cover' &&
      item.targetSelectionMode &&
      item.targetSelectionMode !== 'all-matching-condition'
    );

    expect(eclipse).toBeDefined();
    expect(eclipse?.targetSelectionMode).not.toBe('all-matching-condition');
    expect(eclipse?.summary).toContain('Eligible selected-target candidates: Crimson or Kalspire or Vhagar.');
    expect(eclipse?.summary).toContain('One candidate is selected when the activation succeeds; the selected target is unresolved.');
    expect(eclipse?.summary).toContain('Target not guaranteed');
    expect(eclipse?.targetSummary).toContain('highest-resource');
    expect(eclipse?.targetSummary).toContain('current-troops');
  });

  it('renders Strategic Revival least-troops effects as candidate groups, not exact Team cards', () => {
    const result = legacyPresentation();
    const syrax = card(result, 'syrax');
    const strategic = syrax.provides.filter((item) => item.abilityName === 'Strategic Revival');

    expect(strategic.length).toBeGreaterThanOrEqual(2);
    expect(strategic.some((item) => item.targetLabel?.includes('Venator') && item.targetLabel?.includes('Vhagar'))).toBe(true);
    expect(strategic.some((item) => interactionHeading(item) === 'Syrax → Team')).toBe(false);
    expect(strategic.some((item) =>
      item.summary.includes('Target not guaranteed') ||
      item.detail.includes('Target not guaranteed')
    )).toBe(true);
  });

  it('omits Battle Leader provider cards when the resolved target has no qualifying output', () => {
    const result = legacyPresentation();
    const vhagar = card(result, 'vhagar');
    const battleLeader = vhagar.provides.find((item) => item.abilityName === 'Battle Leader');
    expect(battleLeader).toBeUndefined();
    expect(vhagar.receives.some((item) => item.abilityName === 'Battle Leader')).toBe(false);
  });

  it('renders Syrax Strategic Revival command text with ally target wording and resistance details', () => {
    const formation = formations.legacy!;
    const roster = selectedRoster(['venator', 'vhagar', 'syrax'], 26, 10);
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const result = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const syrax = card(result, 'syrax');

    expect(syrax.command?.summaryLines).toEqual([
      'Each Round: 20% chance to increase Fire Damage Dealt by 10% and grant First-Strike to one Ally in any lane for 2 rounds, prioritizing Allies that deal Fire Damage.',
      'Rounds 1, 4, 6, and 9: deal Tactical Damage at a 110% rate to one enemy within adjacency.',
      'At 6+ Stars, Rounds 2, 5, and 8: apply Recovery at a 50% rate to the Ally with the least current troops, enhanced by Intelligence.',
      'Then apply Resistance at a 40% chance to the Ally with the least current troops for 2 rounds.',
    ]);
    expect(syrax.command?.detail).toContain('Rounds 2, 5, and 8: apply Recovery to the Ally with the least current troops at a 50% Recovery Rate, enhanced by Intelligence.');
    expect(syrax.command?.detail).toContain('Resistance applies to the same selected Ally.');
    expect(syrax.command?.detail).toContain('Resistance has a 40% activation chance at effective Habit Level 1 and lasts 2 rounds.');
  });

  it('renders the legacy command augmentations and rank-gates them', () => {
    const rank9Roster = selectedRoster(['crimson', 'sheepstealer', 'kalspire'], 26, 9);
    rank9Roster.kalspire!.starRank = 5;
    const rank10Roster = selectedRoster(['crimson', 'sheepstealer', 'kalspire'], 26, 10);
    rank10Roster.kalspire!.starRank = 6;
    const commandFormation = formations.commandAugments!;
    const rank9Traces = analyzeFormationTraces(commandFormation, dragons, { roster: rank9Roster });
    const rank10Traces = analyzeFormationTraces(commandFormation, dragons, { roster: rank10Roster });
    const rank9Result = buildFormationCardPresentation(commandFormation, dragons, rank9Traces, { previewEnabled: false, roster: rank9Roster });
    const rank10Result = buildFormationCardPresentation(commandFormation, dragons, rank10Traces, { previewEnabled: false, roster: rank10Roster });

    const crimsonRank9 = card(rank9Result, 'crimson').command;
    const crimsonRank10 = card(rank10Result, 'crimson').command;
    const sheepstealerRank9 = card(rank9Result, 'sheepstealer').command;
    const sheepstealerRank10 = card(rank10Result, 'sheepstealer').command;
    const kalspireRank9 = card(rank9Result, 'kalspire').command;
    const kalspireRank10 = card(rank10Result, 'kalspire').command;

    expect(crimsonRank9?.summaryLines).toEqual([
      'Other odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds.',
      'Rounds 2, 5, and 8: deal Fire Damage at a 140% rate to one enemy in any lane.',
    ]);
    expect(crimsonRank9?.summaryLines.join(' ')).not.toContain('At 10 Stars');

    expect(crimsonRank10?.summaryLines).toEqual([
      'Round 1: 40% chance to Stun one enemy in any lane for 2 rounds. At 10 Stars, this replaces the ordinary Round 1 Stun chance.',
      'Other odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds.',
      'Rounds 2, 5, and 8: deal Fire Damage at a 140% rate to one enemy in any lane.',
      "At 10 Stars, Even-numbered rounds: 50% chance to reduce the Instinct and Initiative of the highest-Instinct enemy by 12% for 2 rounds, enhanced by Crimson's Intelligence.",
    ]);
    expect(crimsonRank10?.detail).toContain('At 10 Stars');
    expect(crimsonRank10?.detail).toContain('one shared 50% activation roll');

    expect(sheepstealerRank9?.summaryLines).toEqual([
      'Each Round: if no enemy is currently marked as Prey, there is a 40% chance to apply Prey.',
      'Rounds 1, 4, 7, and 10: deal Fire Damage at a 100% rate to one enemy, prioritizing Prey. Damage is doubled against Prey.',
    ]);
    expect(sheepstealerRank9?.summaryLines.join(' ')).not.toContain('Savage Claim');

    expect(sheepstealerRank10?.summaryLines).toHaveLength(3);
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('At 10 Stars');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('40% chance to apply Prey');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('100% rate');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('prioritizing Prey');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('Damage is doubled against Prey');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('24% rate');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('10% rate');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('72% Fire Damage');
    expect(sheepstealerRank10?.summaryLines.join(' ')).toContain('30% Recovery');
    expect(sheepstealerRank10?.detail).toContain('At 10 Stars');
    expect(sheepstealerRank10?.detail).toContain('current Prey');

    expect(kalspireRank9?.summaryLines).toEqual([
      'After each Basic Attack: deal Tactical Damage at a 50% rate to the original Basic Attack target.',
      'Then independently attempt Bleed at a 30% chance on the original Basic Attack target and one other enemy within adjacency. Bleed deals periodic Physical Damage at a 20% rate each round for 2 rounds.',
    ]);
    expect(kalspireRank9?.summaryLines.join(' ')).not.toContain('At 6+ Stars');

    expect(kalspireRank10?.summaryLines).toEqual([
      'After each Basic Attack: deal Tactical Damage at a 50% rate to the original Basic Attack target.',
      'Then independently attempt Bleed at a 30% chance on the original Basic Attack target and one other enemy within adjacency. Bleed deals periodic Physical Damage at a 20% rate each round for 2 rounds.',
      'At 6+ Stars, After each Basic Attack: deal Physical Damage at a 25% rate to one enemy within adjacency that is distinct from the original Basic Attack target.',
      'Then independently attempt Panic at a 15% chance on the Physical Damage target and one other distinct enemy within adjacency. Panic deals periodic Tactical Damage at a 20% rate each round for 2 rounds.',
    ]);
    expect(kalspireRank10?.detail).toContain('At 6+ Stars');
    expect(kalspireRank10?.detail).toContain('independently attempt Panic at a 15% chance');
  });

  it('uses all-matching enemy wording for Unlikely Hero source cards', () => {
    const roster = selectedRoster(['sheepstealer', 'crimson', 'kalspire'], 26, 10);
    const formation = formations.commandAugments!;
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { sheepstealer: 26, crimson: 26, kalspire: 26 },
    });
    const result = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const crimson = card(result, 'crimson');
    const unlikelyHero = crimson.provides.filter((item) => item.abilityName === 'Unlikely Hero');
    const textByCard = unlikelyHero.map((item) => [
      item.effectTitle,
      item.title,
      item.summary,
      ...item.summaryLines,
      item.detail,
      ...item.effects,
    ].join(' '));
    const joined = textByCard.join(' ');

    const physical = textByCard.find((text) => /Enemy Physical Damage vulnerability/i.test(text));
    const fire = textByCard.find((text) => /Enemy Fire Damage vulnerability/i.test(text));
    const recovery = textByCard.find((text) => /Enemy Recovery Received reduction/i.test(text));

    expect(physical).toContain('all enemies currently above 75% maximum Troop Capacity');
    expect(physical).toContain('Applies to non-Basic Physical Damage only.');
    expect(fire).toContain('all enemies currently above 75% maximum Troop Capacity');
    expect(fire).toContain('Applies to all qualifying Fire Damage sources.');
    expect(recovery).toContain('all enemies currently below 25% maximum Troop Capacity');
    expect(recovery).toContain('Duration: until end of the current round.');
    expect(unlikelyHero.every((item) => item.state === 'conditional')).toBe(true);

    expect(joined).not.toMatch(/one enemy target|enemy candidate|one candidate is selected|selected enemy/i);
    expect(joined).not.toContain('Target not guaranteed');
    expect(card(result, 'kalspire').receives.some((item) => item.sourceDragonId === 'crimson' && /Physical Damage/i.test(item.summary))).toBe(true);
    expect(card(result, 'sheepstealer').receives.some((item) => item.sourceDragonId === 'crimson' && /Fire Damage/i.test(item.summary))).toBe(true);
    expect(fire).toContain('Crimson and Sheepstealer');
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
    expect(card(result, 'sheepstealer').command?.summaryLines).toEqual([
      'Each Round: if no enemy is currently marked as Prey, there is a 40% chance to apply Prey.',
      'Rounds 1, 4, 7, and 10: deal Fire Damage at a 100% rate to one enemy, prioritizing Prey. Damage is doubled against Prey.',
    ]);
    expect(card(result, 'syrax').receives.some((item) => item.abilityName === 'Blazing Fury')).toBe(false);
  });

  it('separates multi-schedule command summaries by timing and target', () => {
    const result = presentation('13', false);

    expect(card(result, 'malachite').command?.summaryLines).toEqual([
      'Rounds 2, 4, 7, and 9: Tactical Damage to one same-lane enemy.',
      'Rounds 3, 6, and 9: Recovery to three allies.',
    ]);
    expect(card(result, 'seasmoke').command?.summaryLines).toEqual([
      'Each round: three independent 20% attempts to cleanse a positive effect.',
      'Rounds 3, 6, and 9: Fire Damage to one enemy.',
    ]);
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
    const outsideVanguard = presentation('16', false);
    const sheepstealerOutside = card(outsideVanguard, 'sheepstealer');
    const malachiteOutside = card(outsideVanguard, 'malachite');
    const wardenReceives = sheepstealerOutside.receives.find((item) => item.abilityName === "Warden's Rally");
    const wardenProvides = malachiteOutside.provides.find((item) => item.abilityName === "Warden's Rally");

    expect(wardenReceives?.state).not.toBe('blocked');
    expect(wardenProvides?.state).not.toBe('blocked');
    expect(wardenReceives?.summary).toContain('Recovery support');
    expect(wardenReceives?.modifierLines).toContain(
      "Hunter's Cunning amplification unavailable: Sheepstealer must be Vanguard.",
    );
    expect(sheepstealerOutside.receives.some((item) => item.abilityName === "Hunter's Cunning")).toBe(false);
    expect(malachiteOutside.provides.some((item) => item.abilityName === "Hunter's Cunning")).toBe(false);

    const roster = createEmptyRoster(dragons);
    roster.sheepstealer!.owned = true;
    roster.sheepstealer!.collection.state = 'hatched';
    roster.sheepstealer!.reignLevel = 25;
    const inVanguard = presentation('15', false, { roster });
    const sheepstealerVanguard = card(inVanguard, 'sheepstealer');
    const malachiteVanguardCase = card(inVanguard, 'malachite');
    const activeWarden = sheepstealerVanguard.receives.find((item) => item.abilityName === "Warden's Rally");
    expect(activeWarden?.state).toBe('active');
    expect(activeWarden?.modifierLines).toContain(
      "Amplified by Sheepstealer's Hunter's Cunning: Recovery Received +20%.",
    );
    expect(sheepstealerVanguard.receives.some((item) => item.abilityName === "Hunter's Cunning")).toBe(false);
    expect(malachiteVanguardCase.provides.some((item) => item.abilityName === "Hunter's Cunning")).toBe(false);
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
    expect(caraxesBlazingFury).toHaveLength(2);
    expect(caraxesBlazingFury.map((item) => item.effectTitle)).toEqual(
      expect.arrayContaining([
        'Blazing Fury - Fire Damage support',
        'Blazing Fury - First-Strike support',
      ]),
    );
    expect(caraxesBlazingFury.find((item) => item.effectTitle === 'Blazing Fury - Fire Damage support')?.summaryLines).toEqual(
      expect.arrayContaining(['Fire Damage support; one of two eligible recipients.']),
    );
    expect(caraxesBlazingFury.find((item) => item.effectTitle === 'Blazing Fury - First-Strike support')?.summaryLines).toEqual(
      expect.arrayContaining(['May receive First-Strike; Infernal Burst deals 1.5× while active.']),
    );
    expect(caraxesBlazingFury.every((item) => item.traceIds.length === 1)).toBe(true);

    const sheepstealerBlazingFury = sheepstealer.receives.find((item) => item.abilityName === 'Blazing Fury');
    expect(sheepstealerBlazingFury?.summary).toContain('Fire Damage support');
    expect(sheepstealerBlazingFury?.summary).not.toContain('First-Strike');

    const syraxBlazingFury = syrax.provides.filter((item) => item.abilityName === 'Blazing Fury');
    expect(syraxBlazingFury).toHaveLength(2);
    expect(syraxBlazingFury.some((item) => item.summaryLines.some((line) => /Eligible selected-target candidates/i.test(line)))).toBe(true);
    expect(syraxBlazingFury.some((item) => item.summaryLines.some((line) => /May receive First-Strike/i.test(line)))).toBe(true);
    expect(syraxBlazingFury.find((item) => item.summaryLines.some((line) => /Eligible selected-target candidates/i.test(line)))?.candidateTotal).toBe(2);
    expect(syraxBlazingFury.find((item) => item.summaryLines.some((line) => /Eligible selected-target candidates/i.test(line)))?.summary).toContain('Target not guaranteed.');
    expect(syraxBlazingFury.reduce((count, item) => count + item.traceIds.length, 0)).toBe(2);
  });

  it('uses purposeful compact summaries for stat values and suppresses redundant blocked trait cards', () => {
    const result = presentation('8', false);
    const syrax = card(result, 'syrax');
    const sheepstealer = card(result, 'sheepstealer');

    expect(syrax.receives.find((item) => item.abilityName === "Hunter's Wrath")?.summaryLines.join(' ')).toMatch(
      /Strength and Initiative by \+20/,
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
    expect(sheepstealer.receives.some((item) => item.abilityName === 'Battle Dread')).toBe(true);
  });

  it('preserves current, preview, and unknown interaction states', () => {
    const result = presentation('8', true);
    const syrax = card(result, 'syrax');
    const caraxes = card(result, 'caraxes');

    expect(syrax.receives.some((item) => item.state === 'unknown' && item.abilityName === "Hunter's Wrath")).toBe(true);
    expect(caraxes.receives.some((item) => item.abilityName === 'Tactical Inferno')).toBe(false);
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
