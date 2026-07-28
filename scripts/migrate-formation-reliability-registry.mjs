import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = JSON.parse(
  await readFile(path.join(root, 'docs', 'formation-reliability-audit.json'), 'utf8'),
);
const outputDirectory = path.join(root, 'src', 'synergy', 'reliability', 'registry', 'dragons');

const scoringSignals = audit.signals.filter(
  (signal) => signal.classification !== 'not-applicable-to-activation-reliability',
);
const signalsById = new Map(scoringSignals.map((signal) => [signal.signalId, signal]));

const componentIdOverrides = new Map([
  ['arulix-hypnotic-helix-overwhelm', 'arulix-hypnotic-helix:overwhelm'],
  ['arulix-hypnotic-helix-stagger', 'arulix-hypnotic-helix:stagger'],
  ['bevlorin-bountiful-gifts-initiative', 'bevlorin-bountiful-gifts:initiative'],
  ['bevlorin-bountiful-gifts-instinct', 'bevlorin-bountiful-gifts:instinct'],
  ['bevlorin-bountiful-gifts-intelligence', 'bevlorin-bountiful-gifts:intelligence'],
  ['bevlorin-bountiful-gifts-strength', 'bevlorin-bountiful-gifts:strength'],
  ['caraxes-crippling-inferno-burn', 'caraxes-crippling-inferno:burn'],
  ['caraxes-crippling-inferno-fire', 'caraxes-crippling-inferno:burn'],
  ['caraxes-crippling-inferno-slow', 'caraxes-crippling-inferno:slow'],
  ['velar-gales-of-power-first-strike', 'velar-gales-of-power:first-strike'],
  ['velar-gales-of-power-slow', 'velar-gales-of-power:slow'],
  ['zivern-battle-mastery-physical', 'zivern-battle-mastery:deterministic-battle-mastery'],
]);

const habitSourceOverrides = new Map([
  ['crimson-bloodscale-terror-stun', 'crimson-vermins-bane'],
  ['tairax-burning-ward-stagger', 'tairax-gleamstrike'],
]);

const enhancedVariantOnly = new Map([
  ['arrax-sudden-strike-bleed-payoff', 'bleeding-target'],
  ['crimson-bloodscale-fury-taunt-payoff', 'taunted-target'],
  ['vhagar-fiery-bonds-burn-payoff', 'burn-afflicted-target'],
  ['zivern-cloak-of-terror-vulnerable-payoff', 'vulnerable-target'],
]);

const mixedSignalIds = new Set([
  'shadowsong-panic-payoff',
  'shimmer-unbreakable-loyalty-instinct-payoff',
  'zivern-battle-mastery-intelligence-payoff',
]);
const customSignalIds = new Set([...mixedSignalIds, 'vaeldra-tempting-distraction-vulnerability']);

await mkdir(outputDirectory, { recursive: true });

const dragonIds = [...new Set(scoringSignals.map((signal) => signal.dragonId))].sort();
for (const dragonId of dragonIds) {
  const signals = scoringSignals
    .filter((signal) => signal.dragonId === dragonId)
    .sort((left, right) => left.signalId.localeCompare(right.signalId));
  const componentsById = new Map();
  const bindings = [];

  for (const signal of signals) {
    if (customSignalIds.has(signal.signalId)) continue;
    const component = componentFromSignal(signal);
    mergeComponent(componentsById, component);
    bindings.push(defaultBinding(signal, component));
  }

  addCustomEntries(dragonId, componentsById, bindings);

  const registry = {
    dragonId,
    components: [...componentsById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    bindings: bindings.sort((left, right) => left.signalId.localeCompare(right.signalId)),
  };
  const source = `import { defineDragonReliabilityRegistry } from '../registryTypes';\n\nexport const ${camelCase(
    dragonId,
  )}ReliabilityRegistry = defineDragonReliabilityRegistry(${JSON.stringify(registry, null, 2)});\n`;
  await writeFile(path.join(outputDirectory, `${dragonId}.ts`), source, 'utf8');
}

const imports = dragonIds
  .map((dragonId) => `import { ${camelCase(dragonId)}ReliabilityRegistry } from './${dragonId}';`)
  .join('\n');
const entries = dragonIds
  .map((dragonId) => `  ${camelCase(dragonId)}ReliabilityRegistry,`)
  .join('\n');
await writeFile(
  path.join(outputDirectory, 'index.ts'),
  `${imports}\n\nexport const dragonReliabilityRegistries = [\n${entries}\n] as const;\n`,
  'utf8',
);

console.log(
  `Migrated ${scoringSignals.length} scoring signals into ${dragonIds.length} dragon registry modules.`,
);

function componentFromSignal(signal) {
  const id = componentIdOverrides.get(signal.signalId) ?? signal.reliabilityComponentIds[0];
  if (!id) throw new Error(`Signal ${signal.signalId} has no component ID.`);
  const probability = probabilityForSignal(signal);
  const targetFacts = {
    ...(signal.targetCount === null ? {} : { count: signal.targetCount }),
    ...(signal.separatePerTarget === null ? {} : { separatePerTarget: signal.separatePerTarget }),
    ...(signal.separatePerEffect === null ? {} : { separatePerEffect: signal.separatePerEffect }),
  };
  const reviewNote = [signal.probability.note, signal.opportunityCount.note]
    .filter(Boolean)
    .join(' ');
  return compact({
    id,
    sourceAbilityId: id.slice(0, id.indexOf(':')),
    sourceAbilityKind: signal.abilityKind,
    reliabilityClass: componentClass(signal.classification),
    probability,
    opportunityPresence: signal.opportunityPresence,
    timing: timingForSignal(signal),
    opportunityCount: opportunityCountForSignal(signal.opportunityCount),
    rollScope: rollScope(signal.rollScope),
    targetFacts: Object.keys(targetFacts).length === 0 ? undefined : targetFacts,
    independence: signal.independence,
    durationRounds: signal.durationRounds ?? undefined,
    unlock: unlockForSignal(signal),
    evidence: compact({
      verificationStatus: signal.currentConfidence === 'verified' ? 'verified' : 'provisional',
      evidenceIds: [...signal.canonicalEvidence.evidenceIds].sort(),
      unresolvedQuestions: [...signal.unresolvedQuestions],
      reviewNote: reviewNote || undefined,
    }),
  });
}

function probabilityForSignal(signal) {
  const probability = signal.probability;
  if (probability.kind === 'none') return undefined;
  if (probability.kind === 'fixed') return { kind: 'fixed', value: probability.fixed };
  const habitAbilityId = habitSourceOverrides.get(signal.signalId) ?? signal.sourceAbilityId;
  if (probability.kind === 'habit-level') {
    return habitLevelProbability(habitAbilityId, probability.byHabitLevel);
  }
  if (probability.kind === 'round-and-habit') {
    if (signal.signalId === 'tairax-burning-ward-stagger') {
      return {
        kind: 'round-specific',
        byRound: Object.fromEntries(
          [1, 3, 5, 7, 9].map((round) => [
            round,
            habitOverrideProbability(habitAbilityId, probability.fixed, probability.byHabitLevel),
          ]),
        ),
      };
    }
    if (signal.signalId === 'crimson-bloodscale-terror-stun') {
      return {
        kind: 'round-specific',
        byRound: {
          1: habitOverrideProbability(habitAbilityId, probability.fixed, probability.byHabitLevel),
          3: { kind: 'fixed', value: probability.fixed },
          5: { kind: 'fixed', value: probability.fixed },
          7: { kind: 'fixed', value: probability.fixed },
          9: { kind: 'fixed', value: probability.fixed },
        },
      };
    }
  }
  if (probability.kind === 'multiple' && probability.variants?.length) {
    return {
      kind: 'variants',
      variants: probability.variants.map((variant) => ({
        id: slug(variant.label),
        probability:
          variant.fixed === undefined
            ? habitLevelProbability(habitAbilityId, variant.byHabitLevel)
            : { kind: 'fixed', value: variant.fixed },
      })),
    };
  }
  throw new Error(`Signal ${signal.signalId} has unsupported probability ${probability.kind}.`);
}

function defaultBinding(signal, component) {
  const bindingClass = bindingClassForSignal(signal);
  if (component.probability?.kind !== 'variants') {
    return {
      status: 'resolved',
      signalId: signal.signalId,
      bindingClass,
      paths: [singleComponentPath('activation', component.id)],
    };
  }
  const selectedVariant = enhancedVariantOnly.get(signal.signalId);
  const variants = selectedVariant
    ? component.probability.variants.filter((variant) => variant.id === selectedVariant)
    : component.probability.variants;
  if (variants.length === 0) {
    throw new Error(`Signal ${signal.signalId} selected a missing probability variant.`);
  }
  return {
    status: 'resolved',
    signalId: signal.signalId,
    bindingClass,
    paths: variants.map((variant) => ({
      pathId: variant.id,
      appliesWhen: { kind: 'probability-context', id: variant.id },
      events: [
        {
          eventId: component.id,
          componentReferences: [{ componentId: component.id, probabilityVariantId: variant.id }],
        },
      ],
    })),
  };
}

function addCustomEntries(dragonId, componentsById, bindings) {
  if (dragonId === 'shadowsong') {
    const signal = requiredSignal('shadowsong-panic-payoff');
    const deterministic = deterministicComponent(
      signal,
      'shadowsong-breath-of-fire:panic-damage-payoff',
      'conditional-deterministic',
      { kind: 'conditional-event', condition: 'Target is afflicted with Panic.' },
    );
    mergeComponent(componentsById, deterministic);
    bindings.push({
      status: 'resolved',
      signalId: signal.signalId,
      bindingClass: 'resolved-mixed',
      paths: [
        selectedPath('breath-of-fire-damage', deterministic.id),
        selectedPath(
          'scorched-earth-application',
          'shadowsong-scorched-earth:vulnerable',
          'panic-afflicted-target',
        ),
      ],
    });
  }
  if (dragonId === 'shimmer') {
    const signal = requiredSignal('shimmer-unbreakable-loyalty-instinct-payoff');
    const recovery = deterministicComponent(
      signal,
      'shimmer-unbreakable-loyalty:scheduled-recovery',
      'guaranteed',
      { kind: 'scheduled-rounds', rounds: [2, 5, 8] },
    );
    mergeComponent(componentsById, recovery);
    bindings.push({
      status: 'resolved',
      signalId: signal.signalId,
      bindingClass: 'resolved-mixed',
      paths: [
        selectedPath('command-buffs', 'shimmer-unbreakable-loyalty:strength-and-initiative'),
        selectedPath(
          'tactical-damage',
          'shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical',
        ),
        selectedPath('recovery', recovery.id),
      ],
    });
  }
  if (dragonId === 'zivern') {
    const signal = requiredSignal('zivern-battle-mastery-intelligence-payoff');
    bindings.push({
      status: 'resolved',
      signalId: signal.signalId,
      bindingClass: 'resolved-mixed',
      paths: [
        selectedPath('battle-mastery', 'zivern-battle-mastery:deterministic-battle-mastery'),
        selectedPath('fearsome-reach', 'zivern-fearsome-reach:panic'),
      ],
    });
  }
  if (dragonId === 'vaeldra') {
    const signal = requiredSignal('vaeldra-tempting-distraction-vulnerability');
    const followOn = deterministicComponent(
      signal,
      'vaeldra-tempting-distraction:successful-taunt-follow-on',
      'conditional-deterministic',
      {
        kind: 'conditional-event',
        condition: 'Vaeldra successfully afflicts an Enemy with Taunt.',
      },
    );
    mergeComponent(componentsById, followOn);
    bindings.push({
      status: 'resolved',
      signalId: signal.signalId,
      bindingClass: 'chance',
      paths: [
        jointPath('lure-taunt', 'vaeldra-lure:taunt', followOn.id),
        jointPath('sirens-call-taunt', 'vaeldra-sirens-call:taunt-to-stagger', followOn.id),
      ],
    });
  }
}

function deterministicComponent(signal, id, reliabilityClass, timing) {
  return compact({
    id,
    sourceAbilityId: id.slice(0, id.indexOf(':')),
    sourceAbilityKind: signal.abilityKind,
    reliabilityClass,
    opportunityPresence: 'not-applicable',
    timing,
    opportunityCount: { kind: 'not-applicable' },
    rollScope: 'not-applicable',
    independence: 'not-applicable',
    unlock: unlockForSignal(signal),
    evidence: {
      verificationStatus: signal.currentConfidence === 'verified' ? 'verified' : 'provisional',
      evidenceIds: [...signal.canonicalEvidence.evidenceIds].sort(),
      unresolvedQuestions: [],
    },
  });
}

function singleComponentPath(pathId, componentId) {
  return {
    pathId,
    events: [{ eventId: componentId, componentReferences: [{ componentId }] }],
  };
}

function selectedPath(id, componentId, probabilityVariantId) {
  return {
    pathId: id,
    appliesWhen: { kind: 'relationship-use', id },
    events: [
      {
        eventId: componentId,
        componentReferences: [compact({ componentId, probabilityVariantId })],
      },
    ],
  };
}

function jointPath(id, setupComponentId, payoffComponentId) {
  return {
    pathId: id,
    appliesWhen: { kind: 'probability-context', id },
    events: [
      {
        eventId: setupComponentId,
        componentReferences: [{ componentId: setupComponentId }],
      },
      {
        eventId: payoffComponentId,
        componentReferences: [{ componentId: payoffComponentId }],
      },
    ],
  };
}

function componentClass(classification) {
  if (classification === 'guaranteed') return 'guaranteed';
  if (classification === 'conditional-deterministic') return 'conditional-deterministic';
  return 'chance';
}

function bindingClassForSignal(signal) {
  if (signal.classification === 'guaranteed') return 'guaranteed';
  if (signal.classification === 'conditional-deterministic') {
    return 'conditional-deterministic';
  }
  return 'chance';
}

function timingForSignal(signal) {
  const count = signal.opportunityCount;
  if (count.kind === 'scheduled-maximum' && count.schedule?.length) {
    return { kind: 'scheduled-rounds', rounds: count.schedule };
  }
  if (count.kind === 'battle-length-dependent' && /each round/i.test(signal.rollTiming)) {
    return { kind: 'each-round' };
  }
  if (count.kind === 'ability-activation-dependent') {
    return { kind: 'after-event', sourceEvent: count.note ?? signal.rollTiming };
  }
  if (count.kind === 'condition-count-dependent') {
    return { kind: 'conditional-event', condition: signal.rollTiming };
  }
  if (count.kind === 'exact' && /start of (round 1|combat)/i.test(signal.rollTiming)) {
    return { kind: 'start-of-combat' };
  }
  if (signal.classification === 'conditional-deterministic') {
    return { kind: 'conditional-event', condition: signal.rollTiming };
  }
  if (signal.classification === 'guaranteed') {
    return {
      kind: 'conditional-event',
      condition: 'Deterministic once unlocked and position-valid.',
    };
  }
  return { kind: 'unresolved', reason: signal.rollTiming };
}

function opportunityCountForSignal(count) {
  if (count.kind === 'exact') return { kind: 'exact', value: count.value };
  if (count.kind === 'scheduled-maximum') {
    return { kind: 'scheduled-maximum', maximum: count.value };
  }
  if (count.kind === 'ability-activation-dependent') {
    return { kind: count.kind, sourceEvent: count.note };
  }
  if (count.kind === 'condition-count-dependent') {
    return { kind: count.kind, condition: count.note };
  }
  if (count.kind === 'unresolved') {
    return { kind: count.kind, reason: count.note };
  }
  return { kind: count.kind };
}

function rollScope(scope) {
  return {
    'single-shared-roll': 'shared',
    'separate-per-target': 'per-target',
    'separate-per-effect': 'per-effect',
    'separate-per-target-and-effect': 'per-target-and-effect',
    'separate-stat-checks': 'separate-stat-checks',
    unresolved: 'unresolved',
    'not-applicable': 'not-applicable',
  }[scope];
}

function unlockForSignal(signal) {
  const unlock = compact({
    minimumStarRank: signal.unlockStarRank ?? undefined,
    minimumDragonLevel: signal.minimumDragonLevel ?? undefined,
  });
  return Object.keys(unlock).length === 0 ? undefined : unlock;
}

function habitLevelProbability(habitAbilityId, values) {
  return {
    kind: 'habit-level',
    habitAbilityId,
    byLevel: levels(values),
  };
}

function habitOverrideProbability(habitAbilityId, base, values) {
  return {
    kind: 'habit-override',
    habitAbilityId,
    base,
    byLevel: levels(values),
  };
}

function levels(values) {
  return { 1: values[0], 2: values[1], 3: values[2], 4: values[3], 5: values[4] };
}

function mergeComponent(componentsById, component) {
  const existing = componentsById.get(component.id);
  if (!existing) {
    componentsById.set(component.id, component);
    return;
  }
  const left = JSON.stringify({ ...existing, evidence: undefined });
  const right = JSON.stringify({ ...component, evidence: undefined });
  if (left !== right) {
    throw new Error(`Conflicting component facts for ${component.id}.`);
  }
  existing.evidence = {
    verificationStatus:
      existing.evidence.verificationStatus === 'verified' &&
      component.evidence.verificationStatus === 'verified'
        ? 'verified'
        : 'provisional',
    evidenceIds: [
      ...new Set([...existing.evidence.evidenceIds, ...component.evidence.evidenceIds]),
    ].sort(),
    unresolvedQuestions: [
      ...new Set([
        ...existing.evidence.unresolvedQuestions,
        ...component.evidence.unresolvedQuestions,
      ]),
    ],
    ...(existing.evidence.reviewNote || component.evidence.reviewNote
      ? {
          reviewNote: [existing.evidence.reviewNote, component.evidence.reviewNote]
            .filter(Boolean)
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(' '),
        }
      : {}),
  };
}

function requiredSignal(signalId) {
  const signal = signalsById.get(signalId);
  if (!signal) throw new Error(`Missing required signal ${signalId}.`);
  return signal;
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function camelCase(value) {
  return value.replace(/-([a-z0-9])/g, (_match, character) => character.toUpperCase());
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
