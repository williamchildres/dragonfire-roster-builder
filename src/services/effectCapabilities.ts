import { databaseMetadata } from '../data/databaseMetadata';
import { dragonObservationSnapshots } from '../data/observations';
import {
  FORMATION_POSITIONS,
  type AbilityDefinition,
  type AbilityEffect,
  type Dragon,
  type EffectSourceScope,
  type FormationPosition,
  type OwnedDragon,
} from '../models/dragon';
import type {
  AbilityTarget,
  AmplificationSynergyTrace,
  CapabilityMatch,
  CapabilitySourceKind,
  CapabilitySourceScope,
  DragonEffectProfile,
  EffectChannel,
  EffectCondition,
  FormationAnalysisInput,
  ModifierCapability,
  OutputCapability,
  RequirementDefinition,
  RequirementTrace,
  TraceConfidence,
  TraceStatus,
} from '../models/synergy';
import {
  arePositionsAdjacent,
  normalizeDamageSourceScope,
} from './formationRules';

export interface CapabilityOptions {
  roster?: Record<string, OwnedDragon>;
  previewMaxRankInteractions?: boolean;
  dragonLevels?: Record<string, number | null>;
}

const reviewedDragonIds = ['malachite', 'seasmoke', 'sheepstealer', 'vermax'];

export function deriveOutputCapabilities(dragons: Dragon[]): OutputCapability[] {
  return dragons.flatMap((dragon) => {
    const capabilities: OutputCapability[] = [];
    if (dragon.id === 'vermax') {
      capabilities.push({
        id: 'vermax-basic-attack-physical',
        dragonId: dragon.id,
        abilityId: null,
        abilityName: 'Basic Attack',
        label: 'Physical Basic Attack',
        channel: 'physical-damage',
        sourceKind: 'basic-attack',
        sourceScope: 'basic-attacks',
        targetSide: 'enemy',
        targetCount: 1,
        targetScope: 'same-lane',
        unlockStarRank: null,
        minimumDragonLevel: null,
        requiredHabitLevel: null,
        conditional: false,
        conditions: [],
        currentlyAvailable: true,
        futureAvailable: false,
        directlyVerified: true,
        combatLogConfirmed: true,
        confidence: 'confirmed',
        evidenceIds: ['vermax-warriors-zeal-basic-attack-combat-log-2026-06-24'],
      });
    }
    for (const ability of allAbilities(dragon)) {
      for (const effect of ability.schedules.flatMap((schedule) => schedule.effects)) {
        const channel = outputChannelForEffect(effect);
        if (!channel) {
          continue;
        }
        capabilities.push({
          id: `${ability.id}-${effect.id}-output`,
          dragonId: dragon.id,
          abilityId: ability.id,
          abilityName: ability.name,
          label: `${ability.name}: ${effect.type}`,
          channel,
          sourceKind: ability.kind,
          sourceScope: sourceKindToScope(ability.kind),
          targetSide: targetSideForEffect(effect),
          targetCount: effect.targetCount ?? inferTargetCount(effect.target),
          targetScope: effect.targetScope,
          unlockStarRank: ability.unlockStarRank,
          minimumDragonLevel: ability.minimumDragonLevel,
          requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
          conditional: ability.kind === 'habit' || hasConditions(effect) || effect.stack !== null,
          conditions: conditionsForEffect(effect),
          currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
          futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
          directlyVerified: effect.directlyVerified !== false,
          combatLogConfirmed: ability.evidenceIds.some((id) => id.includes('combat-log')),
          confidence: confidenceForAbility(ability),
          evidenceIds: ability.evidenceIds,
        });
      }
    }
    return capabilities;
  });
}

export function deriveModifierCapabilities(dragons: Dragon[]): ModifierCapability[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) =>
      ability.schedules.flatMap((schedule) =>
        schedule.effects.flatMap((effect) => modifierCapabilitiesForEffect(dragon, ability, effect)),
      ),
    ),
  );
}

export function deriveDragonEffectProfiles(
  dragons: Dragon[],
  outputs = deriveOutputCapabilities(dragons),
  modifiers = deriveModifierCapabilities(dragons),
): DragonEffectProfile[] {
  return dragons
    .filter((dragon) => reviewedDragonIds.includes(dragon.id))
    .map((dragon) => {
      const dragonOutputs = outputs.filter((capability) => capability.dragonId === dragon.id);
      const dragonModifiers = modifiers.filter((capability) => capability.dragonId === dragon.id);
      const producedChannels = uniqueChannels(dragonOutputs.map((capability) => capability.channel)).map((channel) => {
        const channelCapabilities = dragonOutputs.filter((capability) => capability.channel === channel);
        return {
          channel,
          capabilityIds: channelCapabilities.map((capability) => capability.id),
          currentlyAvailable: channelCapabilities.some((capability) => capability.currentlyAvailable),
          futureAvailable: channelCapabilities.some((capability) => capability.futureAvailable),
          confidence: mergeConfidence(channelCapabilities.map((capability) => capability.confidence)),
        };
      });
      return {
        dragonId: dragon.id,
        producedChannels,
        outgoingBuffChannels: uniqueChannels(
          dragonModifiers.filter((capability) => capability.direction === 'dealt').map((capability) => capability.channel),
        ).map((channel) => ({
          channel,
          modifierCapabilityIds: dragonModifiers
            .filter((capability) => capability.direction === 'dealt' && capability.channel === channel)
            .map((capability) => capability.id),
        })),
        incomingAmplifierChannels: uniqueChannels(
          dragonModifiers.filter((capability) => capability.direction === 'received').map((capability) => capability.channel),
        ).map((channel) => ({
          channel,
          modifierCapabilityIds: dragonModifiers
            .filter((capability) => capability.direction === 'received' && capability.channel === channel)
            .map((capability) => capability.id),
        })),
        primaryDamageChannel: primaryDamageChannelForDragon(dragon.id),
        primaryDamageChannelBasis: primaryDamageBasisForDragon(dragon.id),
      };
    });
}

export function analyzeCapabilityAmplifications(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: CapabilityOptions = {},
): AmplificationSynergyTrace[] {
  const outputs = deriveOutputCapabilities(dragons);
  const modifiers = deriveModifierCapabilities(dragons);
  return [
    ...analyzeOutgoingAmplifications(formation, dragons, outputs, modifiers, options),
    ...analyzeIncomingAmplifications(formation, dragons, outputs, modifiers, options),
  ];
}

export function buildCapabilityMatrix(dragons: Dragon[]): Array<Record<string, string>> {
  const outputs = deriveOutputCapabilities(dragons);
  const modifiers = deriveModifierCapabilities(dragons);
  return dragons
    .filter((dragon) => reviewedDragonIds.includes(dragon.id))
    .map((dragon) => ({
      Dragon: dragon.name,
      'Deals Physical Damage': matrixCell(outputs, dragon.id, 'physical-damage'),
      'Deals Tactical Damage': matrixCell(outputs, dragon.id, 'tactical-damage'),
      'Deals Fire Damage': matrixCell(outputs, dragon.id, 'fire-damage'),
      'Provides Recovery': matrixCell(outputs, dragon.id, 'recovery'),
      'Buffs Physical Damage Dealt': matrixModifierCell(modifiers, dragon.id, 'physical-damage', 'dealt'),
      'Buffs Tactical Damage Dealt': matrixModifierCell(modifiers, dragon.id, 'tactical-damage', 'dealt'),
      'Buffs Fire Damage Dealt': matrixModifierCell(modifiers, dragon.id, 'fire-damage', 'dealt'),
      'Buffs Recovery Received': matrixModifierCell(modifiers, dragon.id, 'recovery', 'received'),
    }));
}

export function sourceScopesCompatible(
  modifierScope: CapabilitySourceScope,
  outputScope: CapabilitySourceScope,
): boolean {
  if (modifierScope === 'unknown' || outputScope === 'unknown') {
    return false;
  }
  if (modifierScope === 'all-qualifying-sources') {
    return true;
  }
  if (modifierScope === 'non-basic-attacks') {
    return outputScope !== 'basic-attacks';
  }
  if (modifierScope === 'commands-and-habits') {
    return outputScope === 'commands' || outputScope === 'habits' || outputScope === 'commands-and-habits';
  }
  return modifierScope === outputScope;
}

export function reviewedDragons(dragons: Dragon[]): Dragon[] {
  return dragons.filter((dragon) => reviewedDragonIds.includes(dragon.id));
}

function analyzeOutgoingAmplifications(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): AmplificationSynergyTrace[] {
  const traces: AmplificationSynergyTrace[] = [];
  for (const modifier of modifiers.filter((capability) => capability.direction === 'dealt' && capability.operation === 'increase')) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || recipientId === modifier.dragonId && modifier.targetSelector.side !== 'self') {
        continue;
      }
      const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
      const candidateOutputs = outputs.filter((output) => output.dragonId === recipientId && output.channel === modifier.channel);
      const matches = candidateOutputs.map((output) =>
        capabilityMatch(modifier, output, [
          targeting,
          ...providerRequirementTraces(modifier, formation, dragons, options),
          ...outputRequirementTraces(output, options),
          sourceScopeRequirement(modifier, output),
        ]),
      );
      const compatible = matches.filter((match) => match.sourceScopeCompatible);
      if (compatible.length === 0) {
        continue;
      }
      const recipient = dragonById(dragons, recipientId);
      const provider = dragonById(dragons, modifier.dragonId);
      if (!recipient || !provider) {
        continue;
      }
      traces.push(makeAmplificationTrace({
        matchKind: 'outgoing-effect-amplification',
        provider,
        providerAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: compatible[0]?.outputCapabilityId ?? null,
        modifier,
        matches: compatible,
        requirements: mergeRequirements(compatible),
        title: supportTitle(modifier.channel),
        explanation: outgoingExplanation(provider.name, modifier, recipient.name, compatible, outputs),
        assumptions: outgoingAssumptions(modifier, compatible),
        unresolvedQuestions: unresolvedForModifier(modifier),
      }));
    }
  }
  return traces;
}

function analyzeIncomingAmplifications(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): AmplificationSynergyTrace[] {
  const traces: AmplificationSynergyTrace[] = [];
  for (const output of outputs.filter((capability) => capability.targetSide === 'ally' || capability.targetSide === 'self')) {
    const providerPosition = positionOf(formation, output.dragonId);
    if (!providerPosition) {
      continue;
    }
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId) {
        continue;
      }
      const recipientModifiers = modifiers.filter(
        (modifier) =>
          modifier.dragonId === recipientId &&
          modifier.channel === output.channel &&
          modifier.direction === 'received' &&
          modifier.operation === 'increase',
      );
      for (const modifier of recipientModifiers) {
        const targeting = outputTargetsRecipient(output, providerPosition, recipientPosition);
        const match = capabilityMatch(modifier, output, [
          targeting,
          ...outputRequirementTraces(output, options),
          ...providerRequirementTraces(modifier, formation, dragons, options),
        ]);
        const provider = dragonById(dragons, output.dragonId);
        const recipient = dragonById(dragons, recipientId);
        if (!provider || !recipient) {
          continue;
        }
        traces.push(makeAmplificationTrace({
          matchKind: 'incoming-effect-amplification',
          provider,
          providerAbilityId: output.abilityId,
          recipient,
          recipientAbilityId: modifier.abilityId,
          modifier,
          matches: [match],
          requirements: match.requirements,
          title: `${recipient.name} amplifies ${provider.name} ${channelLabel(output.channel)}`,
          explanation:
            `${provider.name} provides ${channelLabel(output.channel)} through ${output.abilityName}. ${recipient.name}'s ${modifier.abilityName} increases ${channelLabel(output.channel)} Received by ${modifier.value ?? 'unknown'}${modifier.unit === 'percent' ? '%' : ''}.`,
          assumptions: [],
          unresolvedQuestions: ['Exact final Recovery amount is unknown because the full Level and Instinct Recovery formula is not known.'],
        }));
      }
    }
  }
  return traces;
}

function makeAmplificationTrace({
  matchKind,
  provider,
  providerAbilityId,
  recipient,
  recipientAbilityId,
  modifier,
  matches,
  requirements,
  title,
  explanation,
  assumptions,
  unresolvedQuestions,
}: {
  matchKind: 'outgoing-effect-amplification' | 'incoming-effect-amplification';
  provider: Dragon;
  providerAbilityId: string | null;
  recipient: Dragon;
  recipientAbilityId: string | null;
  modifier: ModifierCapability;
  matches: CapabilityMatch[];
  requirements: RequirementTrace[];
  title: string;
  explanation: string;
  assumptions: string[];
  unresolvedQuestions: string[];
}): AmplificationSynergyTrace {
  const status = aggregateStatus(matches.map((match) => match.status));
  const matchedOutputCapabilityIds = matches.map((match) => match.outputCapabilityId);
  return {
    id: `${matchKind}-${modifier.id}-${recipient.id}`,
    ruleId: matchKind,
    status,
    confidence: mergeConfidence([modifier.confidence, ...matches.map((match) => match.confidence)]),
    sourceDragonId: provider.id,
    sourceAbilityId: providerAbilityId,
    recipientDragonId: recipient.id,
    recipientAbilityId,
    title,
    explanation,
    requirements,
    matchedFacts: matches.map((match) => `Matched ${match.outputCapabilityId}.`),
    effects: [
      `${channelLabel(modifier.channel)} ${modifier.direction === 'dealt' ? 'Dealt' : 'Received'} ${modifier.operation} ${modifier.value ?? 'unknown'}${modifier.unit === 'percent' ? '%' : modifier.unit === 'stack' ? ' per stack' : ''}`,
    ],
    conflicts: requirements
      .filter((requirement) => requirement.satisfied === false)
      .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
    assumptions,
    unresolvedQuestions,
    sourceEvidenceIds: modifier.evidenceIds,
    recipientEvidenceIds: matches.flatMap((match) => match.requirements.flatMap((requirement) => requirement.evidenceIds)),
    providedEffectType: matchKind === 'incoming-effect-amplification' ? channelLabel(modifier.channel) : null,
    recipientModifierType: matchKind === 'incoming-effect-amplification' ? `${channelLabel(modifier.channel)} Received Up` : null,
    recipientModifierAbilityId: modifier.abilityId,
    recipientModifierValue: modifier.value,
    combatLogConfirmed: modifier.combatLogConfirmed || matches.some((match) => match.confidence === 'confirmed'),
    exactResultKnown: false,
    exactResultUnknownReason: exactUnknownReason(modifier.channel, matchKind),
    matchKind,
    channel: modifier.channel,
    modifierCapabilityId: modifier.id,
    matchedOutputCapabilityIds,
    sourceScopeResults: matches,
  };
}

function modifierCapabilitiesForEffect(
  dragon: Dragon,
  ability: AbilityDefinition,
  effect: AbilityEffect,
): ModifierCapability[] {
  const modifiers: ModifierCapability[] = [];
  const damageChannel = modifierChannelForEffect(effect);
  if (damageChannel) {
    modifiers.push(baseModifier(dragon, ability, effect, damageChannel, 'dealt'));
  }
  if (effect.type === 'Recovery Received Up') {
    modifiers.push(baseModifier(dragon, ability, effect, 'recovery', 'received'));
  }
  if (effect.type === 'Spreading Blaze' && effect.stack?.statusId === 'spreading-blaze') {
    modifiers.push({
      ...baseModifier(dragon, ability, effect, 'tactical-damage', 'dealt'),
      id: `${ability.id}-${effect.id}-tactical-damage-stack-modifier`,
      label: `${ability.name}: Tactical Damage Dealt per Spreading Blaze stack`,
      value: effect.stack.valuePerStackFixed,
      unit: 'stack',
      sourceScope: 'all-qualifying-sources',
      targetSelector: targetForEffect(effect),
      stackMaximum: effect.stack.maximumStacks,
      valuePerStack: effect.stack.valuePerStackFixed,
      conditional: true,
      conditions: [
        ...conditionsForEffect(effect),
        {
          id: 'chance-and-selection-dependent',
          label: 'Chance and selection dependent',
          description: 'Spreading Blaze stacks require the trigger chance and target selection to select this ally.',
          evidenceIds: ability.evidenceIds,
          unresolved: false,
        },
      ],
    });
  }
  return modifiers;
}

function baseModifier(
  dragon: Dragon,
  ability: AbilityDefinition,
  effect: AbilityEffect,
  channel: EffectChannel,
  direction: 'dealt' | 'received',
): ModifierCapability {
  return {
    id: `${ability.id}-${effect.id}-${channel}-${direction}-modifier`,
    dragonId: dragon.id,
    abilityId: ability.id,
    abilityName: ability.name,
    label: `${ability.name}: ${effect.type}`,
    channel,
    direction,
    operation: effect.type.includes('Down') || effect.type.includes('Reduction') ? 'decrease' : 'increase',
    value: effect.magnitude,
    unit: effect.unit === 'percent' ? 'percent' : effect.unit === 'flat' ? 'flat' : 'unknown',
    sourceScope: capabilitySourceScope(effect.sourceScope, effect),
    targetSelector: targetForEffect(effect),
    providerRequirements: requirementDefinitionsForAbility(ability),
    recipientRequirements: [],
    unlockStarRank: ability.unlockStarRank,
    minimumDragonLevel: ability.minimumDragonLevel,
    requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
    conditional: ability.kind === 'habit' || hasConditions(effect),
    conditions: conditionsForEffect(effect),
    stackMaximum: effect.stack?.maximumStacks ?? null,
    valuePerStack: effect.stack?.valuePerStackFixed ?? null,
    currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
    futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
    directlyVerified: effect.directlyVerified !== false,
    combatLogConfirmed: ability.evidenceIds.some((id) => id.includes('combat-log')),
    confidence: confidenceForAbility(ability),
    evidenceIds: ability.evidenceIds,
  };
}

function outputChannelForEffect(effect: AbilityEffect): EffectChannel | null {
  if (effect.type === 'Physical Damage') {
    return 'physical-damage';
  }
  if (effect.type === 'Tactical Damage') {
    return 'tactical-damage';
  }
  if (effect.type === 'Fire Damage') {
    return 'fire-damage';
  }
  if (effect.type === 'Recovery') {
    return 'recovery';
  }
  return null;
}

function modifierChannelForEffect(effect: AbilityEffect): EffectChannel | null {
  if (effect.type === 'Physical Damage Dealt Up') {
    return 'physical-damage';
  }
  if (effect.type === 'Tactical Damage Dealt Up') {
    return 'tactical-damage';
  }
  if (effect.type === 'Fire Damage Dealt Up') {
    return 'fire-damage';
  }
  return null;
}

function targetForEffect(effect: AbilityEffect): AbilityTarget {
  const position = effect.targetScope === 'left-flank' || effect.targetScope === 'right-flank'
    ? effect.targetScope
    : null;
  const selection = effect.targetScope === 'self'
    ? 'self'
    : position
      ? 'specific-position'
      : effect.targetScope === 'within-adjacency'
        ? 'adjacent'
        : effect.target.includes('deals')
          ? 'eligible'
          : effect.targetScope === 'any-lane'
            ? 'any'
            : 'unknown';
  return {
    side: targetSideForEffect(effect),
    scope: effect.targetScope,
    position,
    count: effect.targetCount ?? inferTargetCount(effect.target),
    includesCaster: effect.includesCaster ?? null,
    selection,
  };
}

function targetRequirement(
  modifier: ModifierCapability,
  providerPosition: FormationPosition | null,
  recipientPosition: FormationPosition,
): RequirementTrace {
  const selector = modifier.targetSelector;
  let satisfied: boolean | null;
  let expected: string = selector.scope;
  if (!providerPosition) {
    satisfied = false;
  } else if (selector.selection === 'self') {
    satisfied = providerPosition === recipientPosition;
    expected = 'self';
  } else if (selector.position) {
    satisfied = recipientPosition === selector.position;
    expected = selector.position;
  } else if (selector.selection === 'adjacent') {
    satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
    expected = `adjacent to ${providerPosition}`;
  } else if (selector.selection === 'any' || selector.selection === 'eligible') {
    satisfied = true;
  } else {
    satisfied = null;
  }
  return {
    id: `${modifier.id}-targeting-${recipientPosition}`,
    label: 'Position compatibility',
    expected,
    actual: providerPosition ? `provider ${providerPosition}, recipient ${recipientPosition}` : null,
    satisfied,
    evidenceIds: modifier.evidenceIds,
    notes: selector.selection === 'adjacent' ? ['Friendly adjacency is Left Flank - Vanguard - Right Flank.'] : [],
  };
}

function outputTargetsRecipient(
  output: OutputCapability,
  providerPosition: FormationPosition,
  recipientPosition: FormationPosition,
): RequirementTrace {
  let satisfied: boolean | null = null;
  if (output.targetSide === 'self') {
    satisfied = providerPosition === recipientPosition;
  } else if (output.targetScope === 'within-adjacency') {
    satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
  } else if (output.targetSide === 'ally') {
    satisfied = true;
  }
  return {
    id: `${output.id}-targets-${recipientPosition}`,
    label: 'Provider targeting includes recipient',
    expected: output.targetScope ?? 'ally target',
    actual: `provider ${providerPosition}, recipient ${recipientPosition}`,
    satisfied,
    evidenceIds: output.evidenceIds,
    notes: output.targetCount === 3 ? ['Exact 3 Allies includes all friendly dragons, including caster.'] : [],
  };
}

function sourceScopeRequirement(modifier: ModifierCapability, output: OutputCapability): RequirementTrace {
  const compatible = sourceScopesCompatible(modifier.sourceScope, output.sourceScope);
  return {
    id: `${modifier.id}-${output.id}-source-scope`,
    label: 'Source-scope compatibility',
    expected: modifier.sourceScope,
    actual: output.sourceScope,
    satisfied: compatible,
    evidenceIds: [...modifier.evidenceIds, ...output.evidenceIds],
    notes: [],
  };
}

function capabilityMatch(
  modifier: ModifierCapability,
  output: OutputCapability,
  requirements: RequirementTrace[],
): CapabilityMatch {
  const sourceScopeCompatible = sourceScopesCompatible(modifier.sourceScope, output.sourceScope);
  return {
    modifierCapabilityId: modifier.id,
    outputCapabilityId: output.id,
    channel: modifier.channel,
    sourceScopeCompatible,
    requirements,
    status: statusFromRequirements(requirements, output.futureAvailable || modifier.futureAvailable || modifier.conditional),
    confidence: mergeConfidence([modifier.confidence, output.confidence]),
  };
}

function providerRequirementTraces(
  modifier: ModifierCapability,
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: CapabilityOptions,
): RequirementTrace[] {
  const dragon = dragonById(dragons, modifier.dragonId);
  return [
    ...modifier.providerRequirements.map((requirement) => resolveRequirement(requirement, modifier.dragonId, formation, options)),
    ...availabilityRequirements({
      dragonId: modifier.dragonId,
      abilityId: modifier.abilityId,
      unlockStarRank: modifier.unlockStarRank,
      minimumDragonLevel: modifier.minimumDragonLevel,
      requiredHabitLevel: modifier.requiredHabitLevel,
      evidenceIds: modifier.evidenceIds,
      sourceKind: dragon?.trait?.id === modifier.abilityId ? 'trait' : 'habit',
    }, options),
  ];
}

function outputRequirementTraces(output: OutputCapability, options: CapabilityOptions): RequirementTrace[] {
  return availabilityRequirements({
    dragonId: output.dragonId,
    abilityId: output.abilityId,
    unlockStarRank: output.unlockStarRank,
    minimumDragonLevel: output.minimumDragonLevel,
    requiredHabitLevel: output.requiredHabitLevel,
    evidenceIds: output.evidenceIds,
    sourceKind: output.sourceKind,
  }, options);
}

function availabilityRequirements({
  dragonId,
  abilityId,
  unlockStarRank,
  minimumDragonLevel,
  requiredHabitLevel,
  evidenceIds,
  sourceKind,
}: {
  dragonId: string;
  abilityId: string | null;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  requiredHabitLevel: number | null;
  evidenceIds: string[];
  sourceKind: CapabilitySourceKind;
}, options: CapabilityOptions): RequirementTrace[] {
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragonId);
  const rosterEntry = options.roster?.[dragonId];
  const starRank = rosterEntry?.starRank ?? observation?.starRank ?? null;
  const dragonLevel = Object.hasOwn(options.dragonLevels ?? {}, dragonId)
    ? (options.dragonLevels?.[dragonId] ?? null)
    : (observation?.dragonLevel ?? null);
  const habitLevel = abilityId ? rosterEntry?.habitLevels[abilityId] ?? null : null;
  const requirements: RequirementTrace[] = [];
  if (minimumDragonLevel !== null) {
    requirements.push({
      id: `${dragonId}-${abilityId ?? 'basic'}-level`,
      label: 'Dragon Level requirement',
      expected: `Level ${minimumDragonLevel}+`,
      actual: dragonLevel === null ? null : `Level ${dragonLevel}`,
      satisfied: dragonLevel === null ? null : dragonLevel >= minimumDragonLevel,
      evidenceIds,
      notes: [],
    });
  }
  if (unlockStarRank !== null) {
    requirements.push({
      id: `${dragonId}-${abilityId ?? 'basic'}-star-rank`,
      label: sourceKind === 'habit' ? 'Habit unlock requirement' : 'Star Rank requirement',
      expected: `Star Rank ${unlockStarRank}+`,
      actual: starRank === null ? null : `Star Rank ${starRank}`,
      satisfied: starRank === null ? null : starRank >= unlockStarRank,
      evidenceIds,
      notes: [],
    });
  }
  if (requiredHabitLevel !== null && abilityId) {
    requirements.push({
      id: `${dragonId}-${abilityId}-habit-level`,
      label: 'Selected Habit Level',
      expected: `Habit Level ${requiredHabitLevel}+ or preview`,
      actual: habitLevel === null ? null : `Habit Level ${habitLevel}`,
      satisfied: habitLevel === null ? null : habitLevel >= requiredHabitLevel,
      evidenceIds,
      notes: ['Locked Habit capabilities are potential in preview mode, not active for current roster.'],
    });
  }
  return requirements;
}

function resolveRequirement(
  requirement: RequirementDefinition,
  dragonId: string,
  formation: FormationAnalysisInput,
  options: CapabilityOptions,
): RequirementTrace {
  const actualPosition = positionOf(formation, dragonId);
  if (requirement.kind === 'provider-position' || requirement.kind === 'recipient-position') {
    return {
      id: requirement.id,
      label: requirement.label,
      expected: requirement.expected,
      actual: actualPosition,
      satisfied: actualPosition === requirement.expected,
      evidenceIds: requirement.evidenceIds,
      notes: [],
    };
  }
  return {
    id: requirement.id,
    label: requirement.label,
    expected: requirement.expected,
    actual: options.previewMaxRankInteractions ? 'preview enabled' : null,
    satisfied: null,
    evidenceIds: requirement.evidenceIds,
    notes: [],
  };
}

function requirementDefinitionsForAbility(ability: AbilityDefinition): RequirementDefinition[] {
  const requirements: RequirementDefinition[] = [];
  if (ability.positionRequirement) {
    requirements.push({
      id: `${ability.id}-provider-position-${ability.positionRequirement}`,
      label: 'Provider position requirement',
      kind: 'provider-position',
      expected: ability.positionRequirement,
      evidenceIds: ability.evidenceIds,
    });
  }
  return requirements;
}

function mergeRequirements(matches: CapabilityMatch[]): RequirementTrace[] {
  const byId = new Map<string, RequirementTrace>();
  for (const match of matches) {
    for (const requirement of match.requirements) {
      byId.set(requirement.id, requirement);
    }
  }
  return [...byId.values()];
}

function statusFromRequirements(requirements: RequirementTrace[], futureOrConditional: boolean): TraceStatus {
  const failed = requirements.filter((requirement) => requirement.satisfied === false);
  if (failed.some((requirement) => /Position compatibility|Source-scope compatibility|Provider targeting/.test(requirement.label))) {
    return 'inactive';
  }
  if (requirements.some((requirement) => requirement.satisfied === null)) {
    return 'unknown';
  }
  if (requirements.every((requirement) => requirement.satisfied !== false)) {
    return futureOrConditional ? 'potential' : 'active';
  }
  if (futureOrConditional && failed.some((requirement) => /Star Rank|Habit Level|Dragon Level/.test(requirement.label))) {
    return 'potential';
  }
  return 'inactive';
}

function aggregateStatus(statuses: TraceStatus[]): TraceStatus {
  if (statuses.includes('active')) {
    return 'active';
  }
  if (statuses.includes('unknown')) {
    return 'unknown';
  }
  if (statuses.includes('potential')) {
    return 'potential';
  }
  if (statuses.includes('blocked')) {
    return 'blocked';
  }
  return 'inactive';
}

function capabilitySourceScope(sourceScope: EffectSourceScope | undefined, effect: AbilityEffect): CapabilitySourceScope {
  const normalized = normalizeDamageSourceScope({
    effectType: effect.type,
    explicitSourceScope: sourceScope,
    excludes: effect.excludes,
  });
  switch (normalized) {
    case 'all-sources':
      return 'all-qualifying-sources';
    case 'basic-attacks':
    case 'commands':
    case 'habits':
    case 'commands-and-habits':
    case 'unknown':
      return normalized;
    case 'non-basic-attacks':
      return 'non-basic-attacks';
  }
}

function sourceKindToScope(sourceKind: CapabilitySourceKind): CapabilitySourceScope {
  if (sourceKind === 'basic-attack') {
    return 'basic-attacks';
  }
  if (sourceKind === 'command') {
    return 'commands';
  }
  if (sourceKind === 'habit') {
    return 'habits';
  }
  return 'all-qualifying-sources';
}

function outputChannelNames(outputs: OutputCapability[], ids: string[]): string[] {
  return ids.map((id) => outputs.find((output) => output.id === id)?.label ?? id);
}

function outgoingExplanation(
  providerName: string,
  modifier: ModifierCapability,
  recipientName: string,
  matches: CapabilityMatch[],
  outputs: OutputCapability[],
): string {
  const labels = outputChannelNames(outputs, matches.map((match) => match.outputCapabilityId)).join(', ');
  if (modifier.dragonId === 'sheepstealer' && modifier.channel === 'physical-damage') {
    return `${providerName}'s ${modifier.abilityName} increases ${recipientName}'s Physical Damage Dealt by ${modifier.value ?? 'unknown'}%. Qualifying outputs: ${labels}.`;
  }
  if (modifier.dragonId === 'vermax' && modifier.channel === 'tactical-damage') {
    return `${recipientName} is eligible to receive Spreading Blaze because it has verified Tactical Damage output. Each granted stack increases Tactical Damage Dealt by ${modifier.valuePerStack ?? 'unknown'}%, up to ${modifier.stackMaximum ?? 'unknown'} stacks.`;
  }
  return `${providerName}'s ${modifier.abilityName} increases ${recipientName}'s ${channelLabel(modifier.channel)} Dealt. Qualifying outputs: ${labels}.`;
}

function outgoingAssumptions(modifier: ModifierCapability, matches: CapabilityMatch[]): string[] {
  const assumptions: string[] = [];
  if (modifier.stackMaximum !== null || modifier.conditional) {
    assumptions.push('Trigger chance and target selection may make this conditional rather than guaranteed.');
  }
  if (matches.length > 1) {
    assumptions.push('Multiple qualifying outputs are aggregated into one normal synergy trace.');
  }
  return assumptions;
}

function unresolvedForModifier(modifier: ModifierCapability): string[] {
  if (modifier.dragonId === 'sheepstealer' && modifier.channel === 'physical-damage') {
    return ["Exact stacking formula with Vermax's self buffs is unknown."];
  }
  if (modifier.dragonId === 'vermax' && modifier.channel === 'tactical-damage') {
    return ['Exact final number of Spreading Blaze stacks is unknown.', 'Target choice may not be guaranteed when multiple eligible allies exist.'];
  }
  return ['Exact final modified amount is unknown.'];
}

function exactUnknownReason(channel: EffectChannel, matchKind: string): string {
  if (channel === 'recovery') {
    return "Exact final Recovery cannot be calculated because the game's Level and Instinct Recovery formula is unknown.";
  }
  if (matchKind === 'outgoing-effect-amplification') {
    return 'Exact final amplified damage cannot be calculated because stacking and final combat formulas are not fully verified.';
  }
  return 'Exact final result is unknown.';
}

function supportTitle(channel: EffectChannel): string {
  return `${channelLabel(channel)} Support`;
}

function channelLabel(channel: EffectChannel): string {
  switch (channel) {
    case 'physical-damage':
      return 'Physical Damage';
    case 'tactical-damage':
      return 'Tactical Damage';
    case 'fire-damage':
      return 'Fire Damage';
    case 'recovery':
      return 'Recovery';
  }
}

function allAbilities(dragon: Dragon): AbilityDefinition[] {
  return [dragon.command, dragon.trait, ...dragon.habits]
    .filter((ability): ability is AbilityDefinition => Boolean(ability));
}

function dragonById(dragons: Dragon[], dragonId: string): Dragon | null {
  return dragons.find((dragon) => dragon.id === dragonId) ?? null;
}

function positionOf(formation: FormationAnalysisInput, dragonId: string): FormationPosition | null {
  return FORMATION_POSITIONS.find((position) => formation[position] === dragonId) ?? null;
}

function targetSideForEffect(effect: AbilityEffect): 'ally' | 'enemy' | 'self' {
  if (effect.targetScope === 'self' || effect.target === 'Self') {
    return 'self';
  }
  return effect.target.toLowerCase().includes('enemy') || effect.target.toLowerCase().includes('prey')
    ? 'enemy'
    : 'ally';
}

function inferTargetCount(target: string): number | null {
  const match = target.match(/\b(\d+)\b/);
  return match?.[1] ? Number(match[1]) : null;
}

function hasConditions(effect: AbilityEffect): boolean {
  return Boolean(effect.conditions?.length || effect.conditionalMultipliers?.length);
}

function conditionsForEffect(effect: AbilityEffect): EffectCondition[] {
  return [
    ...(effect.conditions ?? []).map((condition) => ({
      id: condition.id,
      label: condition.description,
      description: condition.description,
      evidenceIds: [],
      unresolved: condition.unresolved,
    })),
    ...(effect.conditionalMultipliers ?? []).map((condition) => ({
      id: condition.id,
      label: condition.description,
      description: condition.description,
      evidenceIds: [],
      unresolved: false,
    })),
  ];
}

function confidenceForAbility(ability: AbilityDefinition): TraceConfidence {
  if (ability.evidenceIds.some((id) => id.includes('combat-log'))) {
    return 'confirmed';
  }
  if (ability.verification.status === 'screenshot-verified') {
    return 'confirmed';
  }
  if (ability.verification.status === 'partially-screenshot-verified') {
    return 'medium';
  }
  return 'unresolved';
}

function mergeConfidence(confidences: TraceConfidence[]): TraceConfidence {
  if (confidences.includes('unresolved')) {
    return 'unresolved';
  }
  if (confidences.includes('low')) {
    return 'low';
  }
  if (confidences.includes('medium')) {
    return 'medium';
  }
  if (confidences.includes('high')) {
    return 'high';
  }
  return 'confirmed';
}

function uniqueChannels(channels: EffectChannel[]): EffectChannel[] {
  return [...new Set(channels)];
}

function primaryDamageChannelForDragon(dragonId: string): EffectChannel | null {
  if (dragonId === 'malachite') {
    return 'tactical-damage';
  }
  if (dragonId === 'sheepstealer') {
    return 'fire-damage';
  }
  if (dragonId === 'vermax') {
    return 'physical-damage';
  }
  return null;
}

function primaryDamageBasisForDragon(dragonId: string): DragonEffectProfile['primaryDamageChannelBasis'] {
  if (dragonId === 'vermax') {
    return 'verified-basic-attack-and-kit';
  }
  if (dragonId === 'malachite' || dragonId === 'sheepstealer') {
    return 'derived';
  }
  return 'unknown';
}

function matrixCell(outputs: OutputCapability[], dragonId: string, channel: EffectChannel): string {
  const matches = outputs.filter((capability) => capability.dragonId === dragonId && capability.channel === channel);
  if (matches.length === 0) {
    return 'No verified capability';
  }
  return matches
    .map((capability) => `${capability.currentlyAvailable ? 'Current' : capability.futureAvailable ? 'Future' : 'Conditional'}: ${capability.abilityName}`)
    .join('; ');
}

function matrixModifierCell(
  modifiers: ModifierCapability[],
  dragonId: string,
  channel: EffectChannel,
  direction: 'dealt' | 'received',
): string {
  const matches = modifiers.filter(
    (capability) => capability.dragonId === dragonId && capability.channel === channel && capability.direction === direction,
  );
  if (matches.length === 0) {
    return 'No verified capability';
  }
  return matches
    .map((capability) => `${capability.currentlyAvailable ? 'Current' : capability.futureAvailable ? 'Future' : 'Conditional'}: ${capability.abilityName}`)
    .join('; ');
}

export function frameworkReportData(dragons: Dragon[]) {
  const outputs = deriveOutputCapabilities(dragons).filter((capability) => reviewedDragonIds.includes(capability.dragonId));
  const modifiers = deriveModifierCapabilities(dragons).filter((capability) => reviewedDragonIds.includes(capability.dragonId));
  const formations: Record<string, FormationAnalysisInput> = {
    A: { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
    B: { 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' },
    C: { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
    D: { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  };
  const traces = Object.fromEntries(
    Object.entries(formations).map(([name, formation]) => [name, analyzeCapabilityAmplifications(formation, dragons, { previewMaxRankInteractions: true })]),
  );
  return {
    databaseVersion: databaseMetadata.databaseVersion,
    schemaVersion: databaseMetadata.schemaVersion,
    gameBuild: databaseMetadata.currentDocumentedGameBuild,
    matrix: buildCapabilityMatrix(dragons),
    outputs,
    modifiers,
    profiles: deriveDragonEffectProfiles(dragons, outputs, modifiers),
    formations,
    traces,
    warnings: {
      duplicateOrOverlappingCapabilities: duplicateWarnings(outputs, modifiers),
      missingSourceScope: modifiers.filter((capability) => capability.sourceScope === 'unknown').map((capability) => capability.id),
      missingPositionSemantics: modifiers.filter((capability) => capability.targetSelector.selection === 'unknown').map((capability) => capability.id),
      unresolvedAssumptions: [
        'Exact Recovery formula remains unknown.',
        'Exact final damage formulas and stacking order remain unknown.',
        'Spreading Blaze target choice is not guaranteed when multiple eligible Tactical Damage allies exist.',
        "Sheepstealer Dragon's Cunning scaling scope remains provisional.",
        'Stack refresh and expiration behavior remains unresolved.',
      ],
    },
  };
}

function duplicateWarnings(outputs: OutputCapability[], modifiers: ModifierCapability[]): string[] {
  const warnings: string[] = [];
  for (const collection of [outputs, modifiers]) {
    const seen = new Set<string>();
    for (const capability of collection) {
      if (seen.has(capability.id)) {
        warnings.push(`Duplicate capability id: ${capability.id}`);
      }
      seen.add(capability.id);
    }
  }
  return warnings;
}
