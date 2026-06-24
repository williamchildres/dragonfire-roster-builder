import { databaseMetadata } from '../data/databaseMetadata';
import { evidenceSources } from '../data/evidence';
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
  CapabilityAvailabilityContext,
  CapabilityDependency,
  CapabilitySourceKind,
  CapabilitySourceScope,
  DragonEffectProfile,
  DragonStatId,
  EffectChannel,
  EffectCondition,
  FormationAnalysisInput,
  ModifierCapability,
  ModifierRole,
  OutputCapability,
  PeriodicDamageDefinition,
  RequirementDefinition,
  RequirementTrace,
  StatusOutputCapability,
  SynergyTrace,
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

const reviewedDragonIds = ['seasmoke', 'malachite', 'sheepstealer', 'vermax', 'syrax', 'caraxes'];

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
        dependencies: [
          {
            type: 'scales-with-stat',
            statId: 'strength',
            notes: ['Physical Damage scales with Strength when the damage source is a Physical Basic Attack.'],
          },
          {
            type: 'mitigated-by-target-stat',
            statId: 'instinct',
            notes: ['Physical Damage is reduced by the target Instinct.'],
          },
        ],
        currentlyAvailable: true,
        futureAvailable: false,
        availability: availabilityContext(dragon.id, null, null),
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
          dependencies: dependenciesForEffect(effect),
          currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
          futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
          availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
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

export function deriveStatusOutputCapabilities(dragons: Dragon[]): StatusOutputCapability[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) =>
      ability.schedules.flatMap((schedule) =>
        schedule.effects.flatMap((effect) => {
          const statusId = statusIdForEffect(effect);
          if (!statusId) {
            return [];
          }
          return [{
            id: `${ability.id}-${effect.id}-${statusId}-status-output`,
            dragonId: dragon.id,
            abilityId: ability.id,
            abilityName: ability.name,
            statusId,
            targetSide: targetSideForEffect(effect),
            targetSelector: targetForEffect(effect),
            unlockStarRank: ability.unlockStarRank,
            minimumDragonLevel: ability.minimumDragonLevel,
            requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
            chanceFixed: schedule.triggerChanceFixed,
            chanceByHabitLevel: schedule.triggerChanceByHabitLevel,
            durationRounds: effect.durationRounds,
            untilEndOfRound: effect.duration === 'Until end of current round',
            untilEndOfCombat: effect.duration === 'Until end of combat' || Boolean(effect.stack?.untilEndOfCombat),
            conditions: conditionsForEffect(effect),
            currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
            futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
            availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
            directlyVerified: effect.directlyVerified !== false,
            evidenceIds: ability.evidenceIds,
          }];
        }),
      ),
    ),
  );
}

export function derivePeriodicDamageDefinitions(dragons: Dragon[]): PeriodicDamageDefinition[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) =>
      ability.schedules.flatMap((schedule) =>
        schedule.effects.flatMap((effect) => {
          if (effect.type !== 'Burn') {
            return [];
          }
          return [{
            statusId: 'burn',
            dragonId: dragon.id,
            abilityId: ability.id,
            channel: 'fire-damage' as const,
            damageRateFixed: effect.magnitude,
            damageRateByHabitLevel: effect.rankedValues,
            ticksEachRound: true,
            durationRounds: effect.durationRounds,
            scalingStat: 'intelligence' as const,
            mitigationStat: 'initiative' as const,
            evidenceIds: ability.evidenceIds,
          }];
        }),
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
          dragonModifiers
            .filter((capability) => capability.role === 'ally-support' && capability.direction === 'dealt')
            .map((capability) => capability.channel),
        ).map((channel) => ({
          channel,
          modifierCapabilityIds: dragonModifiers
            .filter(
              (capability) =>
                capability.role === 'ally-support' &&
                capability.direction === 'dealt' &&
                capability.channel === channel,
            )
            .map((capability) => capability.id),
        })),
        incomingAmplifierChannels: uniqueChannels(
          dragonModifiers
            .filter((capability) => capability.role === 'recipient-side-amplification')
            .map((capability) => capability.channel),
        ).map((channel) => ({
          channel,
          modifierCapabilityIds: dragonModifiers
            .filter(
              (capability) =>
                capability.role === 'recipient-side-amplification' &&
                capability.channel === channel,
            )
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
): SynergyTrace[] {
  const outputs = deriveOutputCapabilities(dragons);
  const modifiers = deriveModifierCapabilities(dragons);
  const statusOutputs = deriveStatusOutputCapabilities(dragons);
  const periodicDamage = derivePeriodicDamageDefinitions(dragons);
  return [
    ...analyzeOutgoingAmplifications(formation, dragons, outputs, modifiers, options),
    ...analyzeIncomingAmplifications(formation, dragons, outputs, modifiers, options),
    ...analyzeStatusConditionEnablement(formation, dragons, outputs, statusOutputs, options),
    ...analyzeStatScalingSupport(formation, dragons, outputs, modifiers, options),
    ...analyzeEnemyMitigationReduction(formation, dragons, outputs, modifiers, options),
    ...analyzePeriodicDamageAmplification(formation, dragons, periodicDamage, modifiers, options),
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
      'Amplifies Ally Physical Damage': matrixModifierCell(modifiers, dragon.id, 'physical-damage', 'dealt', 'ally-support'),
      'Amplifies Ally Tactical Damage': matrixModifierCell(modifiers, dragon.id, 'tactical-damage', 'dealt', 'ally-support'),
      'Amplifies Ally Fire Damage': matrixModifierCell(modifiers, dragon.id, 'fire-damage', 'dealt', 'ally-support'),
      'Other Ally Support': matrixOtherSupportCell(modifiers, dragon.id),
      'Amplifies Own Physical Damage': matrixModifierCell(modifiers, dragon.id, 'physical-damage', 'dealt', 'self-amplification'),
      'Amplifies Own Tactical Damage': matrixModifierCell(modifiers, dragon.id, 'tactical-damage', 'dealt', 'self-amplification'),
      'Amplifies Own Fire Damage': matrixModifierCell(modifiers, dragon.id, 'fire-damage', 'dealt', 'self-amplification'),
      'Amplifies Own Recovery Received': matrixModifierCell(modifiers, dragon.id, 'recovery', 'received', 'recipient-side-amplification'),
      'Other Self Amplification': matrixOtherSelfCell(modifiers, dragon.id),
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

export function capabilityIntegrityReport(dragons: Dragon[]) {
  const outputs = deriveOutputCapabilities(dragons);
  const modifiers = deriveModifierCapabilities(dragons);
  const dragonIds = new Set(dragons.map((dragon) => dragon.id));
  const abilityIds = new Set(dragons.flatMap((dragon) => allAbilities(dragon).map((ability) => ability.id)));
  const evidenceIds = new Set(evidenceSources.map((source) => source.id));
  const allCapabilities = [...outputs, ...modifiers];
  const duplicateIds = duplicateWarnings(outputs, modifiers);
  const missingDragonReferences = allCapabilities
    .filter((capability) => !dragonIds.has(capability.dragonId))
    .map((capability) => capability.id);
  const missingAbilityReferences = allCapabilities
    .filter((capability) => capability.abilityId !== null && !abilityIds.has(capability.abilityId))
    .map((capability) => capability.id);
  const missingEvidenceReferences = allCapabilities
    .flatMap((capability) =>
      capability.evidenceIds
        .filter((evidenceId) => !evidenceIds.has(evidenceId))
        .map((evidenceId) => `${capability.id}:${evidenceId}`),
    );
  const incompatibleRoles = modifiers
    .filter(
      (capability) =>
        (capability.role === 'ally-support' && capability.targetSelector.selection === 'self') ||
        (capability.role === 'self-amplification' && capability.targetSelector.selection !== 'self') ||
        (capability.role === 'recipient-side-amplification' && capability.targetSelector.selection !== 'self'),
    )
    .map((capability) => capability.id);
  const tagOnlyCapabilities: string[] = [];

  return {
    duplicateIds,
    missingDragonReferences,
    missingAbilityReferences,
    missingEvidenceReferences,
    incompatibleRoles,
    tagOnlyCapabilities,
    passed:
      duplicateIds.length === 0 &&
      missingDragonReferences.length === 0 &&
      missingAbilityReferences.length === 0 &&
      missingEvidenceReferences.length === 0 &&
      incompatibleRoles.length === 0 &&
      tagOnlyCapabilities.length === 0,
  };
}

function analyzeOutgoingAmplifications(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): AmplificationSynergyTrace[] {
  const traces: AmplificationSynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'ally-support' &&
      capability.direction === 'dealt' &&
      capability.operation === 'increase' &&
      capability.targetSelector.selection !== 'self',
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || recipientId === modifier.dragonId) {
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
          modifier.role === 'recipient-side-amplification' &&
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

function analyzeStatusConditionEnablement(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const output of outputs) {
    const dependencies = output.dependencies.filter(isStatusConditionDependency);
    if (dependencies.length === 0) {
      continue;
    }
    const recipientPosition = positionOf(formation, output.dragonId);
    if (!recipientPosition) {
      continue;
    }
    for (const dependency of dependencies) {
      for (const statusOutput of statusOutputs.filter((status) => status.statusId === dependency.statusId)) {
        if (statusOutput.dragonId === output.dragonId && dependency.type !== 'requires-self-status') {
          continue;
        }
        const providerPosition = positionOf(formation, statusOutput.dragonId);
        if (!providerPosition) {
          continue;
        }
        const provider = dragonById(dragons, statusOutput.dragonId);
        const recipient = dragonById(dragons, output.dragonId);
        if (!provider || !recipient) {
          continue;
        }
        const requirements = [
          statusProviderRequirement(statusOutput, dependency.type, providerPosition, recipientPosition),
          ...availabilityRequirements({
            dragonId: statusOutput.dragonId,
            abilityId: statusOutput.abilityId,
            unlockStarRank: statusOutput.unlockStarRank,
            minimumDragonLevel: statusOutput.minimumDragonLevel,
            requiredHabitLevel: statusOutput.requiredHabitLevel,
            evidenceIds: statusOutput.evidenceIds,
            sourceKind: abilitySourceKind(dragons, statusOutput.dragonId, statusOutput.abilityId),
          }, options),
          ...outputRequirementTraces(output, options),
        ];
        traces.push(makeDependencyTrace({
          id: `status-condition-${statusOutput.id}-${output.id}`,
          matchKind: 'status-condition-enablement',
          ruleId: 'status-condition-enablement',
          source: provider,
          sourceAbilityId: statusOutput.abilityId,
          recipient,
          recipientAbilityId: output.abilityId,
          channel: output.channel,
          title: `${statusLabel(statusOutput.statusId)} enables ${output.abilityName}`,
          explanation: `${provider.name} can apply ${statusLabel(statusOutput.statusId)}. ${recipient.name}'s ${output.abilityName} has a verified condition depending on ${statusLabel(statusOutput.statusId)}.`,
          requirements,
          matchedFacts: dependency.notes,
          effects: [`Status condition: ${statusLabel(statusOutput.statusId)}`],
          sourceEvidenceIds: statusOutput.evidenceIds,
          recipientEvidenceIds: output.evidenceIds,
          assumptions: statusOutput.conditions.map((condition) => condition.description),
          unresolvedQuestions: ['Trigger timing, target selection, and exact uptime are not simulated.'],
        }));
      }
    }
  }
  return traces;
}

function analyzeStatScalingSupport(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) => capability.role === 'ally-support' && capability.channel === 'stat' && capability.operation === 'increase',
  )) {
    const statId = statIdFromText(modifier.label);
    if (!statId) {
      continue;
    }
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || recipientId === modifier.dragonId) {
        continue;
      }
      const matchedOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          output.dependencies.some((dependency) => dependency.type === 'scales-with-stat' && dependency.statId === statId),
      );
      if (matchedOutputs.length === 0) {
        continue;
      }
      const provider = dragonById(dragons, modifier.dragonId);
      const recipient = dragonById(dragons, recipientId);
      if (!provider || !recipient) {
        continue;
      }
      const requirements = [
        targetRequirement(modifier, providerPosition, recipientPosition),
        ...providerRequirementTraces(modifier, formation, dragons, options),
        ...matchedOutputs.flatMap((output) => outputRequirementTraces(output, options)),
      ];
      traces.push(makeDependencyTrace({
        id: `stat-scaling-${modifier.id}-${recipientId}-${statId}`,
        matchKind: 'stat-scaling-support',
        ruleId: 'stat-scaling-support',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: matchedOutputs[0]?.abilityId ?? null,
        channel: 'stat',
        title: `${statLabel(statId)} Scaling Support`,
        explanation: `${provider.name}'s ${modifier.abilityName} can increase ${recipient.name}'s ${statLabel(statId)}, which supports ${matchedOutputs.map((output) => output.abilityName).join(', ')}.`,
        requirements,
        matchedFacts: matchedOutputs.map((output) => `${output.abilityName} scales with ${statLabel(statId)}.`),
        effects: [`${statLabel(statId)} support for ${matchedOutputs.map((output) => output.label).join(', ')}`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
        assumptions: ['Exact stat-to-effect conversion formula is unknown.'],
        unresolvedQuestions: ['Final value and stacking order are not calculated.'],
      }));
    }
  }
  return traces;
}

function analyzeEnemyMitigationReduction(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) => capability.role === 'enemy-debuff' && capability.channel === 'stat' && capability.operation === 'decrease',
  )) {
    const statId = statIdFromText(modifier.label);
    if (!statId) {
      continue;
    }
    const providerPosition = positionOf(formation, modifier.dragonId);
    if (!providerPosition) {
      continue;
    }
    for (const recipientId of Object.values(formation).filter(Boolean) as string[]) {
      if (recipientId === modifier.dragonId) {
        continue;
      }
      const matchedOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          output.dependencies.some((dependency) => dependency.type === 'mitigated-by-target-stat' && dependency.statId === statId),
      );
      if (matchedOutputs.length === 0) {
        continue;
      }
      const provider = dragonById(dragons, modifier.dragonId);
      const recipient = dragonById(dragons, recipientId);
      if (!provider || !recipient) {
        continue;
      }
      const requirements = [
        ...providerRequirementTraces(modifier, formation, dragons, options),
        ...matchedOutputs.flatMap((output) => outputRequirementTraces(output, options)),
      ];
      traces.push(makeDependencyTrace({
        id: `enemy-mitigation-${modifier.id}-${recipientId}-${statId}`,
        matchKind: 'enemy-mitigation-reduction',
        ruleId: 'enemy-mitigation-reduction',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: matchedOutputs[0]?.abilityId ?? null,
        channel: 'stat',
        title: `${statLabel(statId)} Mitigation Reduction`,
        explanation: `${provider.name}'s ${modifier.abilityName} can reduce enemy ${statLabel(statId)}. ${recipient.name}'s matching outputs are mitigated by that stat.`,
        requirements,
        matchedFacts: matchedOutputs.map((output) => `${output.abilityName} is mitigated by target ${statLabel(statId)}.`),
        effects: [`Enemy ${statLabel(statId)} reduction may improve ${matchedOutputs.map((output) => output.label).join(', ')}.`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
        assumptions: ['Enemy target overlap is not simulated.'],
        unresolvedQuestions: ['Exact enemy-formation targeting and final mitigation formula are unknown.'],
      }));
    }
  }
  return traces;
}

function analyzePeriodicDamageAmplification(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  periodicDamage: PeriodicDamageDefinition[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) => capability.role === 'ally-support' && capability.direction === 'dealt' && capability.operation === 'increase',
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const periodic of periodicDamage.filter((item) => item.channel === modifier.channel)) {
      if (periodic.dragonId === modifier.dragonId) {
        continue;
      }
      const recipientPosition = positionOf(formation, periodic.dragonId);
      if (!recipientPosition) {
        continue;
      }
      const provider = dragonById(dragons, modifier.dragonId);
      const recipient = dragonById(dragons, periodic.dragonId);
      if (!provider || !recipient) {
        continue;
      }
      const requirements = [
        targetRequirement(modifier, providerPosition, recipientPosition),
        ...providerRequirementTraces(modifier, formation, dragons, options),
      ];
      traces.push(makeDependencyTrace({
        id: `periodic-damage-${modifier.id}-${periodic.abilityId}-${periodic.statusId}`,
        matchKind: 'periodic-damage-amplification',
        ruleId: 'periodic-damage-amplification',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: periodic.abilityId,
        channel: periodic.channel,
        title: `${channelLabel(periodic.channel)} Periodic Damage Support`,
        explanation: `${provider.name}'s ${modifier.abilityName} can amplify ${recipient.name}'s ${statusLabel(periodic.statusId)} periodic ${channelLabel(periodic.channel)}.`,
        requirements,
        matchedFacts: [`${statusLabel(periodic.statusId)} ticks each round for ${periodic.durationRounds ?? 'unknown'} rounds.`],
        effects: [`Periodic ${channelLabel(periodic.channel)} amplification`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: periodic.evidenceIds,
        assumptions: ['Periodic damage is treated as the same effect channel as its damage type.'],
        unresolvedQuestions: ['Burn stacking, refresh, and overlapping source behavior are unknown.'],
      }));
    }
  }
  return traces;
}

function makeDependencyTrace({
  id,
  matchKind,
  ruleId,
  source,
  sourceAbilityId,
  recipient,
  recipientAbilityId,
  channel,
  title,
  explanation,
  requirements,
  matchedFacts,
  effects,
  sourceEvidenceIds,
  recipientEvidenceIds,
  assumptions,
  unresolvedQuestions,
}: {
  id: string;
  matchKind: NonNullable<SynergyTrace['matchKind']>;
  ruleId: string;
  source: Dragon;
  sourceAbilityId: string | null;
  recipient: Dragon;
  recipientAbilityId: string | null;
  channel: SynergyTrace['channel'];
  title: string;
  explanation: string;
  requirements: RequirementTrace[];
  matchedFacts: string[];
  effects: string[];
  sourceEvidenceIds: string[];
  recipientEvidenceIds: string[];
  assumptions: string[];
  unresolvedQuestions: string[];
}): SynergyTrace {
  return {
    id,
    ruleId,
    status: statusFromRequirements(requirements, true),
    confidence: 'confirmed',
    sourceDragonId: source.id,
    sourceAbilityId,
    recipientDragonId: recipient.id,
    recipientAbilityId,
    title,
    explanation,
    requirements,
    matchedFacts,
    effects,
    conflicts: requirements
      .filter((requirement) => requirement.satisfied === false)
      .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
    assumptions,
    unresolvedQuestions,
    sourceEvidenceIds,
    recipientEvidenceIds,
    combatLogConfirmed: false,
    exactResultKnown: false,
    exactResultUnknownReason: 'Exact final value cannot be calculated because final combat formulas and stacking order are not fully verified.',
    matchKind,
    channel,
  };
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
    modifierRole: modifier.role,
    targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
    modifierSelfOnly: modifier.role === 'self-amplification' || modifier.targetSelector.selection === 'self',
    availabilityContext: modifier.availability.reportLabel,
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
    modifiers.push(
      baseModifier(
        dragon,
        ability,
        effect,
        damageChannel,
        effect.type.includes('Received') ? 'received' : 'dealt',
      ),
    );
  }
  if (effect.type === 'Stolen Flock' && effect.stack?.statusId === 'stolen-flock') {
    modifiers.push({
      ...baseModifier(dragon, ability, effect, 'fire-damage', 'dealt'),
      id: `${ability.id}-${effect.id}-fire-damage-stack-modifier`,
      label: `${ability.name}: Fire Damage Dealt per Stolen Flock stack`,
      role: 'self-amplification',
      value: effect.stack.valuePerStackFixed,
      unit: 'stack',
      sourceScope: 'all-qualifying-sources',
      stackMaximum: effect.stack.maximumStacks,
      valuePerStack: effect.stack.valuePerStackFixed,
      conditional: true,
    });
  }
  if (effect.type === 'Rallying Flame' && effect.stack?.statusId === 'rallying-flame') {
    modifiers.push({
      ...baseModifier(dragon, ability, effect, 'physical-damage', 'dealt'),
      id: `${ability.id}-${effect.id}-physical-damage-stack-modifier`,
      label: `${ability.name}: Physical Damage Dealt per Rallying Flame stack`,
      role: 'self-amplification',
      value: effect.stack.valuePerStackFixed,
      unit: 'stack',
      sourceScope: 'all-qualifying-sources',
      stackMaximum: effect.stack.maximumStacks,
      valuePerStack: effect.stack.valuePerStackFixed,
      conditional: true,
    });
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
    role: modifierRoleForEffect(effect, direction),
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
    availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
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
  if (effect.type === 'Burn') {
    return 'fire-damage';
  }
  return null;
}

function dependenciesForEffect(effect: AbilityEffect): CapabilityDependency[] {
  const dependencies: CapabilityDependency[] = [
    ...effect.scaling.flatMap((scaling) => {
      const statId = statIdFromText(scaling);
      return statId
        ? [{
            type: 'scales-with-stat' as const,
            statId,
            notes: [`Effect wording indicates scaling with ${statLabel(statId)}.`],
          }]
        : [];
    }),
    ...defaultDamageDependencies(effect),
    ...(effect.conditionalMultipliers ?? []).flatMap((multiplier) =>
      dependencyForCondition(multiplier.condition, multiplier.multiplier),
    ),
    ...(effect.conditions ?? []).flatMap((condition) => dependencyForCondition(condition)),
  ];
  return dedupeDependencies(dependencies);
}

function defaultDamageDependencies(effect: AbilityEffect): CapabilityDependency[] {
  if (effect.type === 'Physical Damage') {
    return [
      { type: 'scales-with-stat' as const, statId: 'strength' as const, notes: ['Physical Damage is increased by Strength.'] },
      { type: 'mitigated-by-target-stat' as const, statId: 'instinct' as const, notes: ['Physical Damage is reduced by target Instinct.'] },
    ];
  }
  if (effect.type === 'Tactical Damage') {
    return [
      { type: 'scales-with-stat' as const, statId: 'instinct' as const, notes: ['Tactical Damage is increased by Instinct.'] },
      { type: 'mitigated-by-target-stat' as const, statId: 'intelligence' as const, notes: ['Tactical Damage is reduced by target Intelligence.'] },
    ];
  }
  if (effect.type === 'Fire Damage' || effect.type === 'Burn') {
    return [
      { type: 'scales-with-stat' as const, statId: 'intelligence' as const, notes: ['Fire Damage is increased by Intelligence.'] },
      { type: 'mitigated-by-target-stat' as const, statId: 'initiative' as const, notes: ['Fire Damage is reduced by target Initiative.'] },
    ];
  }
  return [];
}

function dependencyForCondition(
  condition: { kind: string; statusId: string | null; description: string },
  multiplier?: number,
): CapabilityDependency[] {
  if (condition.kind === 'self-has-status' && condition.statusId) {
    return [{
      type: 'requires-self-status' as const,
      statusId: condition.statusId,
      multiplier,
      notes: [condition.description],
    }];
  }
  if (condition.kind === 'any-enemy-has-status' && condition.statusId) {
    return [{
      type: 'requires-any-enemy-status' as const,
      statusId: condition.statusId,
      multiplier,
      notes: [condition.description],
    }];
  }
  if (condition.kind === 'target-has-status' && condition.statusId) {
    return [{
      type: 'requires-target-status' as const,
      statusId: condition.statusId,
      multiplier,
      notes: [condition.description],
    }];
  }
  if (condition.kind === 'previous-round-event') {
    return [{
      type: 'previous-round-event' as const,
      eventId: condition.description,
      multiplier,
      notes: [condition.description],
    }];
  }
  return [];
}

function isStatusConditionDependency(
  dependency: CapabilityDependency,
): dependency is CapabilityDependency & {
  type: 'requires-self-status' | 'requires-any-enemy-status';
  statusId: string;
} {
  return (
    (dependency.type === 'requires-self-status' || dependency.type === 'requires-any-enemy-status') &&
    typeof dependency.statusId === 'string'
  );
}

function dedupeDependencies(dependencies: CapabilityDependency[]): CapabilityDependency[] {
  const seen = new Set<string>();
  return dependencies.filter((dependency) => {
    const key = `${dependency.type}:${dependency.statusId ?? ''}:${dependency.statId ?? ''}:${dependency.channel ?? ''}:${dependency.eventId ?? ''}:${dependency.multiplier ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function statIdFromText(text: string): DragonStatId | undefined {
  if (/strength/i.test(text)) {
    return 'strength';
  }
  if (/instinct/i.test(text)) {
    return 'instinct';
  }
  if (/intelligence/i.test(text)) {
    return 'intelligence';
  }
  if (/initiative/i.test(text)) {
    return 'initiative';
  }
  return undefined;
}

function statLabel(statId: DragonStatId): string {
  return statId[0]!.toUpperCase() + statId.slice(1);
}

function statusIdForEffect(effect: AbilityEffect): string | null {
  if (effect.type === 'First-Strike') {
    return 'first-strike';
  }
  if (effect.type === 'Slow') {
    return 'slow';
  }
  if (effect.type === 'Burn') {
    return 'burn';
  }
  if (effect.type === 'Resistance') {
    return 'resistance';
  }
  if (effect.type === 'Advantage') {
    return 'advantage';
  }
  return effect.stack?.statusId ?? null;
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
  if (effect.type === 'Physical Damage Dealt Down') {
    return 'physical-damage';
  }
  if (effect.type === 'Recovery Dealt Up' || effect.type === 'Recovery Received Up' || effect.type === 'Recovery Received Down') {
    return 'recovery';
  }
  if (
    effect.type === 'Strength Up' ||
    effect.type === 'Instinct Up' ||
    effect.type === 'Intelligence Up' ||
    effect.type === 'Initiative Up' ||
    effect.type === 'Strength Down' ||
    effect.type === 'Instinct Down' ||
    effect.type === 'Intelligence Down' ||
    effect.type === 'Initiative Down'
  ) {
    return 'stat';
  }
  return null;
}

function modifierRoleForEffect(effect: AbilityEffect, direction: 'dealt' | 'received'): ModifierRole {
  const target = targetForEffect(effect);
  if (target.side === 'enemy') {
    return 'enemy-debuff';
  }
  if (direction === 'received') {
    return 'recipient-side-amplification';
  }
  if (target.selection === 'self' || target.side === 'self') {
    return 'self-amplification';
  }
  if (target.side === 'ally') {
    return 'ally-support';
  }
  return 'enemy-debuff';
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

function statusProviderRequirement(
  statusOutput: StatusOutputCapability,
  dependencyType: 'requires-self-status' | 'requires-any-enemy-status',
  providerPosition: FormationPosition,
  recipientPosition: FormationPosition,
): RequirementTrace {
  let satisfied: boolean | null = true;
  let expected: string = statusOutput.targetSelector.scope;
  if (dependencyType === 'requires-self-status') {
    if (statusOutput.targetSide === 'self') {
      satisfied = providerPosition === recipientPosition;
      expected = 'self-status on recipient';
    } else if (statusOutput.targetSelector.selection === 'adjacent') {
      satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
      expected = `ally adjacent to ${providerPosition}`;
    } else if (statusOutput.targetSide === 'ally') {
      satisfied = true;
      expected = 'ally target can include recipient';
    } else {
      satisfied = false;
    }
  } else if (statusOutput.targetSide !== 'enemy') {
    satisfied = false;
    expected = 'enemy status application';
  }
  return {
    id: `${statusOutput.id}-status-targeting-${recipientPosition}`,
    label: 'Status targeting compatibility',
    expected,
    actual: `provider ${providerPosition}, recipient ${recipientPosition}`,
    satisfied,
    evidenceIds: statusOutput.evidenceIds,
    notes: statusOutput.targetSelector.selection === 'adjacent' ? ['A position is not adjacent to itself.'] : [],
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

function abilitySourceKind(
  dragons: Dragon[],
  dragonId: string,
  abilityId: string | null,
): CapabilitySourceKind {
  const dragon = dragonById(dragons, dragonId);
  if (!dragon) {
    return 'command';
  }
  const ability = allAbilities(dragon).find((item) => item.id === abilityId);
  return ability?.kind ?? 'command';
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

function availabilityContext(
  dragonId: string,
  unlockStarRank: number | null,
  minimumDragonLevel: number | null,
): CapabilityAvailabilityContext {
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragonId);
  const canonicalLocked = (unlockStarRank !== null && unlockStarRank > 1);
  const canonical = canonicalLocked ? 'canonical-locked' : 'canonical-base';
  const observedAccount = observation?.collection?.state === 'hatched'
    ? 'observed-available'
    : observation?.collection
      ? 'observed-unavailable'
      : 'unknown';
  const userRoster = 'unknown';
  const notes: string[] = [];
  if (unlockStarRank !== null && unlockStarRank > 1) {
    notes.push(`Future at Star Rank ${unlockStarRank}.`);
  }
  if (minimumDragonLevel !== null) {
    notes.push(`Requires Dragon Level ${minimumDragonLevel}+.`);
  }
  if (observation?.collection?.state === 'not-hatched') {
    notes.push('Not hatched in observed account.');
  } else if (observation?.collection?.state === 'not-collected') {
    notes.push('Not collected in observed account.');
  } else if (observation?.collection?.state === 'hatched') {
    notes.push('Unlocked in observed account collection state, subject to level and star requirements.');
  } else {
    notes.push('No observed account collection state is recorded.');
  }

  return {
    canonical,
    observedAccount,
    userRoster,
    reportLabel: availabilityReportLabel(unlockStarRank, minimumDragonLevel, observation?.collection?.state ?? null),
    notes,
  };
}

function availabilityReportLabel(
  unlockStarRank: number | null,
  minimumDragonLevel: number | null,
  observedState: string | null,
): string {
  const canonical = unlockStarRank !== null && unlockStarRank > 1
    ? `Future at Star Rank ${unlockStarRank}`
    : 'Base kit';
  const level = minimumDragonLevel !== null ? `; Level ${minimumDragonLevel}+` : '';
  const observed = observedState === 'not-hatched'
    ? '; not hatched in observed account'
    : observedState === 'not-collected'
      ? '; not collected in observed account'
      : observedState === 'hatched'
        ? '; observed account hatched'
        : '; observed account unknown';
  return `${canonical}${level}${observed}`;
}

function targetSelectorSummary(target: AbilityTarget): string {
  const count = target.count === null ? 'unknown count' : `${target.count} target${target.count === 1 ? '' : 's'}`;
  const caster = target.includesCaster === null
    ? 'caster eligibility unknown'
    : target.includesCaster
      ? 'caster eligible'
      : 'caster excluded';
  return `${target.side}; ${target.scope}; ${target.selection}; ${count}; ${caster}`;
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
    case 'stat':
      return 'Stat';
  }
}

function statusLabel(statusId: string): string {
  return statusId
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('-');
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
  return /\benemy\b|\benemies\b|\bprey\b/i.test(effect.target)
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
  if (dragonId === 'syrax') {
    return 'tactical-damage';
  }
  if (dragonId === 'caraxes') {
    return 'fire-damage';
  }
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
  if (dragonId === 'syrax' || dragonId === 'caraxes' || dragonId === 'malachite' || dragonId === 'sheepstealer') {
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
    .map((capability) => `${capability.availability.reportLabel}: ${capability.abilityName}`)
    .join('; ');
}

function matrixModifierCell(
  modifiers: ModifierCapability[],
  dragonId: string,
  channel: EffectChannel,
  direction: 'dealt' | 'received',
  role: ModifierRole,
): string {
  const matches = modifiers.filter(
    (capability) =>
      capability.dragonId === dragonId &&
      capability.channel === channel &&
      capability.direction === direction &&
      capability.role === role,
  );
  if (matches.length === 0) {
    return 'No verified capability';
  }
  return matches
    .map((capability) => `${capability.availability.reportLabel}: ${capability.abilityName}`)
    .join('; ');
}

function matrixOtherSupportCell(modifiers: ModifierCapability[], dragonId: string): string {
  const matches = modifiers.filter(
    (capability) => capability.dragonId === dragonId && capability.role === 'ally-support' && capability.channel === 'stat',
  );
  return matrixCapabilityNames(matches);
}

function matrixOtherSelfCell(modifiers: ModifierCapability[], dragonId: string): string {
  const matches = modifiers.filter(
    (capability) => capability.dragonId === dragonId && capability.role === 'self-amplification' && capability.channel === 'stat',
  );
  return matrixCapabilityNames(matches);
}

function matrixCapabilityNames(capabilities: ModifierCapability[]): string {
  if (capabilities.length === 0) {
    return 'No verified capability';
  }
  return capabilities
    .map((capability) => `${capability.availability.reportLabel}: ${capability.abilityName}`)
    .join('; ');
}

export function frameworkReportData(dragons: Dragon[]) {
  const outputs = deriveOutputCapabilities(dragons).filter((capability) => reviewedDragonIds.includes(capability.dragonId));
  const modifiers = deriveModifierCapabilities(dragons).filter((capability) => reviewedDragonIds.includes(capability.dragonId));
  const statusOutputs = deriveStatusOutputCapabilities(dragons).filter((capability) => reviewedDragonIds.includes(capability.dragonId));
  const periodicDamage = derivePeriodicDamageDefinitions(dragons).filter((definition) => reviewedDragonIds.includes(definition.dragonId));
  const integrity = capabilityIntegrityReport(dragons);
  const formations: Record<string, FormationAnalysisInput> = {
    A: { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
    B: { 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' },
    C: { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
    D: { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
    E: { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'vermax' },
    F: { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'malachite' },
    G: { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
    H: { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'seasmoke' },
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
    statusOutputs,
    periodicDamage,
    profiles: deriveDragonEffectProfiles(dragons, outputs, modifiers),
    formations,
    traces,
    excludedSelfModifiers: modifiers
      .filter((capability) => capability.role === 'self-amplification')
      .map((capability) => ({
        id: capability.id,
        dragonId: capability.dragonId,
        abilityName: capability.abilityName,
        channel: capability.channel,
        reason: 'Self-amplification is visible in capability review but excluded from cross-dragon outgoing support matching.',
      })),
    integrity,
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
