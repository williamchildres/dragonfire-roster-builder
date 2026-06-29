import { databaseMetadata } from '../data/databaseMetadata';
import { evidenceSources } from '../data/evidence';
import { dragonObservationSnapshots } from '../data/observations';
import { statusGlossary } from '../data/statusGlossary';
import {
  FORMATION_POSITIONS,
  type AbilityDefinition,
  type AbilityEffect,
  type AbilitySchedule,
  type BattleContext,
  type Dragon,
  type EffectSourceScope,
  type FormationPosition,
  type OwnedDragon,
  type RankedValue,
  type StackConfiguration,
} from '../models/dragon';
import type {
  AbilityTarget,
  AmplificationSynergyTrace,
  CapabilityMatch,
  CapabilityAvailabilityContext,
  CapabilityDependency,
  CapabilitySourceKind,
  CapabilitySourceScope,
  CapabilityTargetSide,
  DefensiveDamageScope,
  DragonEffectProfile,
  DragonStatId,
  EffectChannel,
  EffectCondition,
  ExtraActionCapability,
  FormationAnalysisInput,
  ModifierCapability,
  ModifierDirection,
  ModifierRole,
  OutputCapability,
  PeriodicDamageDefinition,
  RequirementDefinition,
  RequirementTrace,
  StatusOutputCapability,
  SynergyTrace,
  TriggeredAbilityCapability,
  TraceConfidence,
  TraceStatus,
} from '../models/synergy';
import {
  arePositionsAdjacent,
  inferCasterEligibility,
  normalizeDamageSourceScope,
} from './formationRules';
import { rankedValueForHabitLevel, resolveEffectiveHabitLevel } from './habitLevels';

export interface CapabilityOptions {
  roster?: Record<string, OwnedDragon>;
  previewMaxRankInteractions?: boolean;
  dragonLevels?: Record<string, number | null>;
  battleContext?: BattleContext;
}

const reviewedDragonIds = ['syrax', 'vhagar', 'caraxes', 'seasmoke', 'crimson', 'kalspire', 'malachite', 'venator', 'daemoros', 'vaeldra', 'sheepstealer', 'vermax', 'feskar', 'rhysarion', 'shadowsong'];
const statusCategoryMembers: Record<string, string[]> = {
  control: ['stun', 'stagger', 'overwhelm', 'confusion'],
};

type AllyStatusRecipientResolution =
  | {
    state: 'resolved';
    recipientId: string;
    recipientName: string;
    candidateIds: string[];
    candidateNames: string[];
    resolutionBasis: string | null;
    activationUnresolved: boolean;
    sharedAllyFact: string | null;
  }
  | {
    state: 'candidate-set';
    candidateIds: string[];
    candidateNames: string[];
    resolutionBasis: string | null;
    activationUnresolved: boolean;
    sharedAllyFact: string | null;
  }
  | {
    state: 'none';
    candidateIds: string[];
    candidateNames: string[];
    resolutionBasis: string | null;
    activationUnresolved: boolean;
    sharedAllyFact: string | null;
  };

export function deriveOutputCapabilities(dragons: Dragon[]): OutputCapability[] {
  return dragons.flatMap((dragon) => {
    const capabilities: OutputCapability[] = [];
    if (dragon.id === 'vermax') {
      capabilities.push({
        id: 'vermax-basic-attack-physical',
        outputKind: 'direct-damage',
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
      for (const schedule of abilitySchedulesForDerivation(ability, dragon)) {
        for (const effect of schedule.effects.flatMap(derivableEffects)) {
          const channel = outputChannelForEffect(effect);
          if (!channel) {
            continue;
          }
          capabilities.push({
            id: `${ability.id}-${effect.id}-output`,
            outputKind: outputKindForEffect(effect, channel),
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
            conditional: effectIsConditional(schedule, effect),
            conditions: conditionsForEffect(effect, schedule),
            dependencies: dependenciesForEffect(effect),
            currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
            futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
            availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
            directlyVerified: effect.directlyVerified !== false,
            combatLogConfirmed: ability.evidenceIds.some((id) => id.includes('combat-log')),
            confidence: confidenceForAbility(ability),
            evidenceIds: ability.evidenceIds,
            sourceEffectId: effect.id,
            statusId: statusIdForEffect(effect),
          });
        }
      }
    }
    return capabilities;
  });
}

export function effectiveAbilitySchedules(
  ability: AbilityDefinition,
  starRank: number | null,
  sourceAbilities: AbilityDefinition[] = [],
): AbilitySchedule[] {
  let schedules = ability.schedules;
  for (const augmentation of ability.augmentations) {
    if (starRank === null || starRank < augmentation.minimumDragonStarRank) {
      continue;
    }
    for (const override of augmentation.scheduleOverrides ?? []) {
      const sourceAbility = sourceAbilities.find((item) => item.id === augmentation.sourceAbilityId);
      const provenance = {
        id: override.id,
        operation: override.operation,
        sourceAbilityId: augmentation.sourceAbilityId,
        sourceAbilityName: sourceAbility?.name ?? augmentation.sourceAbilityId,
        targetScheduleId: override.targetScheduleId,
        targetEffectId: override.targetEffectId,
        description: override.description,
        evidenceIds: override.evidenceIds,
      };
      schedules = schedules.map((schedule) => {
        if (schedule.id !== override.targetScheduleId) {
          return schedule;
        }
        if (override.operation === 'replace-schedule' && override.replacementSchedule) {
          return { ...override.replacementSchedule, effectiveOverride: provenance };
        }
        if (override.operation === 'replace-effect-roll' && override.targetEffectId && override.replacementEffect) {
          if (override.replacementSchedule) {
            return {
              ...override.replacementSchedule,
              id: schedule.id,
              effectiveOverride: provenance,
              effects: schedule.effects.map((effect) =>
                effect.id === override.targetEffectId ? override.replacementEffect! : effect,
              ),
            };
          }
          return {
            ...schedule,
            effectiveOverride: provenance,
            effects: schedule.effects.map((effect) =>
              effect.id === override.targetEffectId ? override.replacementEffect! : effect,
            ),
          };
        }
        if (override.operation === 'replace-effect' && override.targetEffectId && override.replacementEffect) {
          return {
            ...schedule,
            effectiveOverride: provenance,
            effects: schedule.effects.map((effect) =>
              effect.id === override.targetEffectId ? override.replacementEffect! : effect,
            ),
          };
        }
        if (override.operation === 'patch-schedule' && override.replacementSchedule) {
          return {
            ...schedule,
            ...override.replacementSchedule,
            id: schedule.id,
            effectiveOverride: provenance,
            effects: override.replacementSchedule.effects.length > 0
              ? override.replacementSchedule.effects
              : schedule.effects,
          };
        }
        return schedule;
      });
    }
  }
  return schedules;
}

export function deriveModifierCapabilities(dragons: Dragon[]): ModifierCapability[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) =>
      abilitySchedulesForDerivation(ability, dragon).flatMap((schedule) =>
        schedule.effects.flatMap((effect) =>
          derivableEffects(effect).flatMap((derivedEffect) =>
            modifierCapabilitiesForEffect(dragon, ability, schedule, derivedEffect),
          ),
        ),
      ),
    ),
  );
}

export function deriveStatusOutputCapabilities(dragons: Dragon[]): StatusOutputCapability[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) =>
      abilitySchedulesForDerivation(ability, dragon).flatMap((schedule) =>
        schedule.effects.flatMap((effect) => derivableEffects(effect).flatMap((derivedEffect) => {
          const statusId = statusIdForEffect(derivedEffect);
          if (!statusId) {
            return [];
          }
          return [{
            id: `${ability.id}-${derivedEffect.id}-${statusId}-status-output`,
            dragonId: dragon.id,
            abilityId: ability.id,
            abilityName: ability.name,
            statusId,
            targetSide: targetSideForEffect(derivedEffect),
            targetSelector: targetForEffect(derivedEffect),
            unlockStarRank: ability.unlockStarRank,
            minimumDragonLevel: ability.minimumDragonLevel,
            requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
            chanceFixed: derivedEffect.activationRoll?.chanceFixed ?? schedule.activationRoll?.chanceFixed ?? schedule.triggerChanceFixed,
            chanceByHabitLevel: derivedEffect.activationRoll?.chanceByHabitLevel.length
              ? derivedEffect.activationRoll.chanceByHabitLevel
              : schedule.activationRoll?.chanceByHabitLevel.length
                ? schedule.activationRoll.chanceByHabitLevel
                : schedule.triggerChanceByHabitLevel,
            durationRounds: derivedEffect.durationRounds,
            untilEndOfRound: derivedEffect.duration === 'Until end of current round',
            untilEndOfCombat: derivedEffect.duration === 'Until end of combat' || Boolean(derivedEffect.stack?.untilEndOfCombat),
            conditions: conditionsForEffect(derivedEffect, schedule),
            currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
            futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
            availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
            directlyVerified: derivedEffect.directlyVerified !== false,
            evidenceIds: ability.evidenceIds,
            sourceEffectId: derivedEffect.id,
            activationGroupId: activationGroupId(schedule, derivedEffect),
            activationChanceFixed: derivedEffect.activationRoll?.chanceFixed ?? schedule.activationRoll?.chanceFixed ?? schedule.triggerChanceFixed,
            activationChanceByHabitLevel: activationChanceByHabitLevel(schedule, derivedEffect),
            effectiveOverrideSourceAbilityId: schedule.effectiveOverride?.sourceAbilityId ?? null,
            effectiveOverrideSourceAbilityName: schedule.effectiveOverride?.sourceAbilityName ?? null,
            effectiveOverrideDescription: schedule.effectiveOverride?.description ?? null,
          }];
        })),
      ),
    ),
  );
}

export function deriveExtraActionCapabilities(dragons: Dragon[]): ExtraActionCapability[] {
  return deriveStatusOutputCapabilities(dragons).flatMap((statusOutput) => {
    const semantic = extraActionSemanticForStatus(statusOutput.statusId);
    if (!semantic) {
      return [];
    }
    return [{
      id: `${statusOutput.id}-${semantic.actionType}-extra-action`,
      dragonId: statusOutput.dragonId,
      abilityId: statusOutput.abilityId,
      abilityName: statusOutput.abilityName,
      sourceEffectId: statusOutput.sourceEffectId ?? null,
      statusId: statusOutput.statusId,
      statusDefinition: semantic.definition,
      actionType: semantic.actionType,
      triggerEvent: semantic.triggerEvent,
      targetSide: statusOutput.targetSide,
      targetSelector: statusOutput.targetSelector,
      unlockStarRank: statusOutput.unlockStarRank,
      minimumDragonLevel: statusOutput.minimumDragonLevel,
      requiredHabitLevel: statusOutput.requiredHabitLevel,
      chanceFixed: statusOutput.chanceFixed,
      chanceByHabitLevel: statusOutput.chanceByHabitLevel,
      durationRounds: statusOutput.durationRounds,
      conditions: statusOutput.conditions,
      currentlyAvailable: statusOutput.currentlyAvailable,
      futureAvailable: statusOutput.futureAvailable,
      availability: statusOutput.availability,
      evidenceIds: statusOutput.evidenceIds,
      activationGroupId: statusOutput.activationGroupId,
      activationChanceFixed: statusOutput.activationChanceFixed,
      activationChanceByHabitLevel: statusOutput.activationChanceByHabitLevel,
    }];
  });
}

export function deriveTriggeredAbilityCapabilities(dragons: Dragon[]): TriggeredAbilityCapability[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) => {
      const schedules = abilitySchedulesForDerivation(ability, dragon);
      const afterBasicSchedules = schedules.filter(
        (schedule) => schedule.timing === 'after-basic-attack' || schedule.roundSelector?.kind === 'after-basic-attack',
      );
      if (afterBasicSchedules.length === 0) {
        return [];
      }
      const triggeredEffects = afterBasicSchedules.flatMap((schedule) => schedule.effects.flatMap(derivableEffects));
      const excludedEffects = schedules
        .filter((schedule) => !afterBasicSchedules.includes(schedule))
        .flatMap((schedule) => schedule.effects.flatMap(derivableEffects));
      return [{
        id: `${ability.id}-after-basic-attack-trigger`,
        dragonId: dragon.id,
        abilityId: ability.id,
        abilityName: ability.name,
        triggerEvent: 'after-basic-attack' as const,
        triggeredEffectIds: triggeredEffects.map((effect) => effect.id),
        triggeredEffectLabels: triggeredEffects.map((effect) => effect.type),
        excludedEffectIds: excludedEffects.map((effect) => effect.id),
        sourceKind: ability.kind,
        unlockStarRank: ability.unlockStarRank,
        minimumDragonLevel: ability.minimumDragonLevel,
        requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
        currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
        futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
        availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
        confidence: confidenceForAbility(ability),
        evidenceIds: ability.evidenceIds,
      }];
    }),
  );
}

export function derivePeriodicDamageDefinitions(dragons: Dragon[]): PeriodicDamageDefinition[] {
  return dragons.flatMap((dragon) =>
    allAbilities(dragon).flatMap((ability) =>
      abilitySchedulesForDerivation(ability, dragon).flatMap((schedule) =>
        schedule.effects.flatMap((effect) => derivableEffects(effect).flatMap((derivedEffect) => {
          const periodic = periodicDamageForEffect(derivedEffect);
          if (!periodic) {
            return [];
          }
          return [{
            statusId: periodic.statusId,
            dragonId: dragon.id,
            abilityId: ability.id,
            sourceEffectId: derivedEffect.id,
            activationGroupId: activationGroupId(schedule, derivedEffect),
            channel: periodic.channel,
            damageRateFixed: derivedEffect.magnitude,
            damageRateByHabitLevel: derivedEffect.rankedValues,
            ticksEachRound: true,
            durationRounds: derivedEffect.durationRounds,
            scalingStat: periodic.scalingStat,
            mitigationStat: periodic.mitigationStat,
            evidenceIds: ability.evidenceIds,
          }];
        })),
      ),
    ),
  );
}

export function periodicDamageOutputCapabilities(
  dragons: Dragon[],
  periodicDamage: PeriodicDamageDefinition[],
  statusOutputs: StatusOutputCapability[],
): OutputCapability[] {
  return periodicDamage.flatMap((periodic) => {
    const dragon = dragonById(dragons, periodic.dragonId);
    const ability = dragon ? allAbilities(dragon).find((item) => item.id === periodic.abilityId) : null;
    const statusOutput = statusOutputs.find((output) =>
      output.dragonId === periodic.dragonId &&
      output.abilityId === periodic.abilityId &&
      output.statusId === periodic.statusId &&
      (periodic.sourceEffectId ? output.sourceEffectId === periodic.sourceEffectId : true)
    );
    if (!dragon || !ability || !statusOutput) {
      return [];
    }
    const dependencies: CapabilityDependency[] = [];
    if (periodic.scalingStat) {
      dependencies.push({
        type: 'scales-with-stat',
        statId: periodic.scalingStat,
        notes: [`${statusLabel(periodic.statusId)} periodic ${channelLabel(periodic.channel)} scales with ${statLabel(periodic.scalingStat)}.`],
      });
    }
    if (periodic.mitigationStat) {
      dependencies.push({
        type: 'mitigated-by-target-stat',
        statId: periodic.mitigationStat,
        notes: [`${statusLabel(periodic.statusId)} periodic ${channelLabel(periodic.channel)} is mitigated by target ${statLabel(periodic.mitigationStat)}.`],
      });
    }
    return [{
      id: `periodic-${periodic.abilityId}-${periodic.sourceEffectId ?? periodic.statusId}-${periodic.statusId}-output`,
      outputKind: 'periodic-status-damage',
      dragonId: periodic.dragonId,
      abilityId: periodic.abilityId,
      abilityName: ability.name,
      label: `${ability.name}: ${statusLabel(periodic.statusId)} periodic ${channelLabel(periodic.channel)}`,
      channel: periodic.channel,
      sourceKind: ability.kind,
      sourceScope: sourceKindToScope(ability.kind),
      targetSide: 'enemy' as const,
      targetCount: statusOutput.targetSelector.count,
      targetScope: statusOutput.targetSelector.scope,
      unlockStarRank: ability.unlockStarRank,
      minimumDragonLevel: ability.minimumDragonLevel,
      requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
      conditional: true,
      conditions: statusOutput.conditions,
      dependencies,
      currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
      futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
      availability: availabilityContext(periodic.dragonId, ability.unlockStarRank, ability.minimumDragonLevel),
      directlyVerified: true,
      combatLogConfirmed: false,
      confidence: 'confirmed',
      evidenceIds: periodic.evidenceIds,
      sourceEffectId: periodic.sourceEffectId,
      statusId: periodic.statusId,
      activationGroupId: periodic.activationGroupId,
      activationChanceFixed: statusOutput.activationChanceFixed,
      activationChanceByHabitLevel: statusOutput.activationChanceByHabitLevel,
      durationRounds: periodic.durationRounds,
    }];
  });
}

function isPeriodicOutputCapability(output: OutputCapability): boolean {
  return output.outputKind === 'periodic-status-damage' || output.id.startsWith('periodic-');
}

function isDamageOutputCapability(output: OutputCapability): boolean {
  return isDamageChannel(output.channel) &&
    (output.outputKind === 'direct-damage' || output.outputKind === 'periodic-status-damage');
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
  const selectedDragonIds = selectedFormationDragonIds(formation);
  const outputs = deriveOutputCapabilities(dragons).filter((capability) => selectedDragonIds.has(capability.dragonId));
  const modifiers = deriveModifierCapabilities(dragons).filter((capability) => selectedDragonIds.has(capability.dragonId));
  const statusOutputs = deriveStatusOutputCapabilities(dragons).filter((capability) => selectedDragonIds.has(capability.dragonId));
  const extraActions = deriveExtraActionCapabilities(dragons).filter((capability) => selectedDragonIds.has(capability.dragonId));
  const triggeredAbilities = deriveTriggeredAbilityCapabilities(dragons).filter((capability) => selectedDragonIds.has(capability.dragonId));
  const periodicDamage = derivePeriodicDamageDefinitions(dragons).filter((definition) => selectedDragonIds.has(definition.dragonId));
  const periodicOutputs = periodicDamageOutputCapabilities(dragons, periodicDamage, statusOutputs);
  const outputsWithPeriodic = [...outputs, ...periodicOutputs];
  return [
    ...analyzeOutgoingAmplifications(formation, dragons, outputsWithPeriodic, modifiers, options),
    ...analyzeIncomingAmplifications(formation, dragons, outputs, modifiers, options),
    ...analyzeAllyOutputSupport(formation, dragons, outputs, options),
    ...analyzeExtraActionTriggerChains(formation, dragons, extraActions, triggeredAbilities, options),
    ...analyzeEnemyStatusSourceOutputs(formation, dragons, statusOutputs, options),
    ...analyzeFriendlyStatusSourceOutputs(formation, dragons, outputs, statusOutputs, options),
    ...analyzeConditionalBranchStatusOutputs(formation, dragons, options),
    ...analyzeStatusConditionEnablement(formation, dragons, outputs, statusOutputs, options),
    ...analyzeStatusEffectConditionEnablement(formation, dragons, statusOutputs, options),
    ...analyzePersistentMarkedTargets(formation, dragons, statusOutputs, options),
    ...analyzeScheduleOverrideTraces(formation, dragons, options),
    ...analyzeSelfStatusOutputs(formation, dragons, statusOutputs, options),
    ...analyzeInternalSelfModifiers(formation, dragons, modifiers, options),
    ...analyzeDefensiveAllySupport(formation, dragons, modifiers, options),
    ...analyzeRecipientSideAllySupport(formation, dragons, modifiers, options),
    ...analyzeFriendlyImpairments(formation, dragons, modifiers, options),
    ...analyzeDirectStatSupport(formation, dragons, modifiers, options),
    ...analyzeStatScalingSupport(formation, dragons, outputs, modifiers, options),
    ...analyzeEnemyMitigationReduction(formation, dragons, outputsWithPeriodic, modifiers, options),
    ...analyzeEnemyDamageDealtReductions(formation, dragons, modifiers, options),
    ...analyzeEnemyReceivedReductions(formation, dragons, modifiers, options),
    ...analyzeEnemyDamageReceivedIncreases(formation, dragons, outputsWithPeriodic, modifiers, statusOutputs, options),
    ...analyzePeriodicStatusDamage(formation, dragons, periodicDamage, statusOutputs, options),
    ...analyzePeriodicDamageAmplification(formation, dragons, periodicDamage, outputsWithPeriodic, modifiers, options),
    ...analyzeSelfStatusRemoval(formation, dragons, options),
    ...analyzeStatusRemovalSupport(formation, dragons, statusOutputs, options),
  ];
}

function analyzeAllyOutputSupport(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const output of outputs.filter(
    (capability) =>
      capability.targetSide === 'ally' &&
      !isDamageChannel(capability.channel) &&
      outputCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, output.dragonId);
    if (!providerPosition) {
      continue;
    }
    const provider = dragonById(dragons, output.dragonId);
    if (!provider) {
      continue;
    }
    const outputTraces: SynergyTrace[] = [];
    const context = sourceEffectContext(provider, output.abilityId, output.sourceEffectId);
    const outputTargetSelector = context ? targetForEffect(context.effect) : null;
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId) {
        continue;
      }
      const recipient = dragonById(dragons, recipientId);
      if (!recipient) {
        continue;
      }
      const targeting = outputTargetsRecipient(
        output,
        providerPosition,
        recipientPosition,
        outputTargetSelector,
      );
      if (targeting.satisfied === false) {
        continue;
      }
      const sourceAbility = allAbilities(provider).find((ability) => ability.id === output.abilityId);
      const outputDetails = outputDetailLines(output, context, options);
      const requirements = dedupeRequirements([
        targeting,
        ...(sourceAbility
          ? requirementDefinitionsForAbility(sourceAbility).map((requirement) =>
              resolveRequirement(requirement, output.dragonId, formation, options),
            )
          : []),
        ...outputRequirementTraces(output, options),
      ]);
      const trace = makeDependencyTrace({
        id: `ally-output-support-${output.id}-${recipientId}`,
        matchKind: 'outgoing-effect-amplification',
        ruleId: 'ally-output-support',
        source: provider,
        sourceAbilityId: output.abilityId,
        recipient,
        recipientAbilityId: output.id,
        channel: output.channel,
        title: `${output.abilityName} ${channelLabel(output.channel)} support`,
        explanation: `${provider.name}'s ${output.abilityName} can provide ${channelLabel(output.channel)} to ${recipient.name}.${outputDetails.length > 0 ? ` ${outputDetails.join(' ')}` : ''}`,
        requirements,
        matchedFacts: [
          `${output.abilityName} targets ${output.targetCount ?? 'unknown'} ally target(s).`,
          ...outputDetails,
        ],
        effects: [`${channelLabel(output.channel)} support`, ...outputDetails],
        sourceEvidenceIds: output.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: [],
        unresolvedQuestions: output.channel === 'recovery' ? ['Exact final Recovery amount is unknown because the full Level and Instinct Recovery formula is not known.'] : [],
        futureOrConditional: capabilityFutureOrConditional(output, options) || output.conditional,
      });
      outputTraces.push(shouldExposeSelfOutputTrace(output, recipient.id === provider.id) ? { ...trace, interactionScope: 'cross-dragon' } : trace);
    }
    traces.push(...groupSingleTargetAllyOutputTraces(formation, output, outputTargetSelector, outputTraces, dragons));
  }
  return traces;
}

function groupSingleTargetAllyOutputTraces(
  formation: FormationAnalysisInput,
  output: OutputCapability,
  targetSelector: AbilityTarget | null,
  traces: SynergyTrace[],
  dragons: Dragon[],
): SynergyTrace[] {
  const eligible = traces.filter((trace) => !['inactive', 'blocked', 'not-applicable'].includes(trace.status));
  const selector = targetSelector ?? null;
  if (
    output.targetCount !== 1 ||
    !selector ||
    eligible.length <= 1 ||
    selector.selection === 'specific-position' ||
    selector.selection === 'one-eligible-adjacent' ||
    selector.selection === 'adjacent'
  ) {
    return traces.filter((trace) =>
      trace.recipientDragonId !== output.dragonId ||
      shouldExposeSelfOutputTrace(output, true),
    );
  }

  const first = eligible[0]!;
  const eligibleRecipientDragonIds = FORMATION_POSITIONS
    .map((position) => formation[position])
    .filter((dragonId): dragonId is string => Boolean(dragonId))
    .filter((dragonId) => eligible.some((trace) => trace.recipientDragonId === dragonId));
  const fallbackRecipientDragonIds = eligible
    .map((trace) => trace.recipientDragonId)
    .filter((dragonId): dragonId is string => Boolean(dragonId));
  const orderedRecipientDragonIds = eligibleRecipientDragonIds.length === fallbackRecipientDragonIds.length
    ? eligibleRecipientDragonIds
    : fallbackRecipientDragonIds;
  const recipientNames = orderedRecipientDragonIds
    .map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId)
    .join(' or ');
  const providerName = dragonById(dragons, first.sourceDragonId)?.name ?? first.sourceDragonId;

  return [
    {
      ...first,
      id: `target-selection-${output.id}-${output.channel}`,
      recipientDragonId: null,
      recipientAbilityId: output.id,
      status: aggregateStatus(eligible.map((trace) => trace.status)),
      title: `${output.abilityName} ${channelLabel(output.channel)} target selection`,
      explanation:
        `${providerName}'s ${output.abilityName} can target one ${channelLabel(output.channel)} ally. Eligible recipients are ${recipientNames}. The selected recipient is not guaranteed.`,
      requirements: dedupeRequirements(eligible.flatMap((trace) => trace.requirements)),
      matchedFacts: uniqueSorted([
        ...eligible.flatMap((trace) => trace.matchedFacts),
        ...orderedRecipientDragonIds.map((dragonId) => `Eligible recipient: ${dragonId}.`),
      ]),
      effects: uniqueSorted(eligible.flatMap((trace) => trace.effects)),
      conflicts: [],
      assumptions: uniqueSorted([
        ...eligible.flatMap((trace) => trace.assumptions),
        'Target count is one, so eligible recipients compete for the same activation.',
      ]),
      recipientEvidenceIds: uniqueSorted(eligible.flatMap((trace) => trace.recipientEvidenceIds)),
      interactionScope: 'targeting-fact',
      targetSelectionGroup: {
        targetCount: 1,
        eligibleRecipientDragonIds: orderedRecipientDragonIds,
        selectionUncertain: true,
        selection: selector.selection,
        selectionStat: selector.selectionStat ?? null,
        selectionResource: selector.selectionResource ?? selector.selectionStat ?? null,
        comparisonDirection: selector.comparisonDirection ?? null,
        comparisonPool: selector.comparisonPool ?? null,
      },
    },
    ...traces.filter((trace) => !eligible.includes(trace)),
  ];
}

function shouldExposeSelfOutputTrace(output: OutputCapability, isSelfRecipient: boolean): boolean {
  return isSelfRecipient &&
    output.channel === 'recovery' &&
    output.targetSide === 'ally' &&
    output.targetCount !== 1;
}

function sourceEffectContext(
  dragon: Dragon,
  abilityId: string | null | undefined,
  sourceEffectId: string | null | undefined,
): { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null {
  if (!abilityId || !sourceEffectId) {
    return null;
  }
  const ability = allAbilities(dragon).find((item) => item.id === abilityId);
  if (!ability) {
    return null;
  }
  for (const schedule of abilitySchedulesForDerivation(ability, dragon)) {
    const effect = schedule.effects.flatMap(effectsForContextLookup).find((item) => item.id === sourceEffectId);
    if (effect) {
      return { ability, schedule, effect };
    }
  }
  return null;
}

function effectsForContextLookup(effect: AbilityEffect): AbilityEffect[] {
  return [
    ...derivableEffects(effect),
    ...(effect.effectOptions?.options.map((option) => option.effect) ?? []),
  ];
}

function abilitySchedulesForDerivation(ability: AbilityDefinition, dragon: Dragon): AbilitySchedule[] {
  if (ability.kind !== 'command' || ability.augmentations.length === 0) {
    return ability.schedules;
  }
  const maximumKnownStarRank = Math.max(
    1,
    ...ability.augmentations.map((augmentation) => augmentation.minimumDragonStarRank),
    ...dragon.habits.map((habit) => habit.unlockStarRank ?? 1),
  );
  return effectiveAbilitySchedules(ability, maximumKnownStarRank, dragon.habits);
}

function outputDetailLines(
  output: OutputCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect } | null,
  options: CapabilityOptions,
): string[] {
  if (!context) {
    return [];
  }
  const details = [
    scheduleTimingDetail(context.schedule),
    outputValueDetail(output, context.effect, options),
    rankedProgressionDetail(context.effect),
    enhancementDetail(context.effect),
    outputTargetingDetail(output, context.effect),
    output.channel === 'recovery' ? 'Final Recovery amount remains unknown.' : null,
  ];
  return details.filter((detail): detail is string => Boolean(detail));
}

function modifierDetailLines(
  modifier: ModifierCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect } | null,
): string[] {
  if (!context) {
    return [];
  }
  return [
    scheduleTimingDetail(context.schedule),
    modifier.durationRounds ? `Duration: ${modifier.durationRounds} rounds.` : null,
    rankedProgressionDetail(context.effect),
  ].filter((detail): detail is string => Boolean(detail));
}

export function formatScheduleDescription(
  schedule: AbilitySchedule,
  options: { style?: 'inline' | 'sentence' | 'timing-detail'; fallback?: string | null } = {},
): string | null {
  const style = options.style ?? 'sentence';
  const lower = style === 'inline';
  const explicitRounds = (rounds: number[]) =>
    `Rounds ${rounds.length > 2 ? `${rounds.slice(0, -1).join(', ')}, and ${rounds.at(-1)}` : joinEnglishList(rounds.map(String))}`;

  switch (schedule.roundSelector?.kind) {
    case 'each-round':
      return lower ? 'each round' : 'Each round';
    case 'explicit':
      return schedule.rounds.length > 0 ? explicitRounds(schedule.rounds) : (options.fallback ?? null);
    case 'odd':
      return lower ? 'odd-numbered rounds' : 'Odd-numbered rounds';
    case 'even':
      return lower ? 'even-numbered rounds' : 'Even-numbered rounds';
    case 'start-of-round':
      return `${lower ? 'start' : 'Start'} of Round ${schedule.roundSelector.round}`;
    case 'start-of-combat':
      return lower ? 'start of combat' : 'Start of combat';
    case 'after-basic-attack':
      return lower ? 'after each Basic Attack' : 'After each Basic Attack';
    case 'range':
      return `${lower ? 'rounds' : 'Rounds'} ${schedule.roundSelector.startRound} through ${schedule.roundSelector.endRound}`;
    case undefined:
      break;
  }

  if (schedule.rounds.length > 0) {
    return explicitRounds(schedule.rounds);
  }
  return options.fallback ?? null;
}

function scheduleTimingDetail(schedule: AbilitySchedule): string | null {
  const structured = formatScheduleDescription(schedule, { style: 'timing-detail' });
  if (structured) {
    return normalizeSentencePunctuation(`Timing: ${structured}.`);
  }
  if (schedule.timing === 'start-of-each-round') {
    return 'Timing: Start of each round.';
  }
  if (schedule.timing === 'start-of-combat') {
    return 'Timing: Start of Combat.';
  }
  if (schedule.timing === 'when-marked-target-receives-recovery') {
    return 'Timing: when the marked target receives Recovery.';
  }
  return null;
}

function schedulePhrase(schedule: AbilitySchedule | null | undefined): string | null {
  const phrase = schedule ? formatScheduleDescription(schedule, { style: 'sentence' }) : null;
  return phrase ? stripTerminalPunctuation(phrase) : null;
}

function stripTerminalPunctuation(value: string): string {
  return value.replace(/[.;\s]+$/g, '').trim();
}

function normalizeSentencePunctuation(value: string): string {
  return value
    .replace(/\s+([.;,])/g, '$1')
    .replace(/([.;])([.;])+/g, '$1')
    .replace(/;\./g, ';')
    .trim();
}

function outputValueDetail(output: OutputCapability, effect: AbilityEffect, options: CapabilityOptions): string | null {
  const resolved = outputResolvedRankedValue(output, effect, options);
  const value = resolved?.rankedValue?.value ?? effect.magnitude;
  if (value === null || value === undefined) {
    return null;
  }
  const level = resolved?.level;
  const unit = resolved?.rankedValue?.unit ?? effect.unit;
  const label = output.channel === 'recovery' ? 'Recovery Rate' : channelLabel(output.channel);
  return `${label}: ${formatValue(value, unit)}${level ? ` at effective Habit Level ${level}` : ''}.`;
}

function durationDetail(effect: AbilityEffect): string | null {
  if (effect.durationRounds) {
    return `Duration: ${effect.durationRounds} ${effect.durationRounds === 1 ? 'round' : 'rounds'}.`;
  }
  if (effect.duration === 'Until end of combat' || effect.stack?.untilEndOfCombat) {
    return 'Duration: until end of combat.';
  }
  if (effect.duration === 'Until end of current round') {
    return 'Duration: until end of the current round.';
  }
  return null;
}

function outputResolvedRankedValue(
  output: OutputCapability,
  effect: AbilityEffect,
  options: CapabilityOptions,
): { rankedValue: RankedValue | undefined; level: number | null } | null {
  if (effect.rankedValues.length === 0) {
    return null;
  }
  if (options.previewMaxRankInteractions) {
    return { rankedValue: effect.rankedValues.find((value) => value.level === 5), level: 5 };
  }
  const level = effectiveHabitLevelForCapability(output, options);
  return { rankedValue: rankedValueForHabitLevel(effect.rankedValues, level), level };
}

function rankedProgressionDetail(effect: AbilityEffect): string | null {
  if (effect.rankedValues.length === 0) {
    return null;
  }
  return `Ranked progression: ${effect.rankedValues.map((value) => `L${value.level} ${formatValue(value.value, value.unit)}`).join(', ')}.`;
}

function enhancementDetail(effect: AbilityEffect): string | null {
  const enhancement = effect.scaling.find((item) => /enhanced by/i.test(item));
  if (enhancement) {
    return `Enhanced by ${enhancement.replace(/^enhanced by\s+/i, '')}.`;
  }
  const statScaling = effect.scaling
    .map((item) => statIdFromText(item))
    .filter((stat): stat is DragonStatId => Boolean(stat));
  return statScaling.length > 0 ? `Scaling stat: ${joinEnglishList(uniqueOrdered(statScaling.map(statLabel)))}.` : null;
}

function outputTargetingDetail(output: OutputCapability, effect: AbilityEffect): string | null {
  if (output.targetSide !== 'ally') {
    return null;
  }
  const target = targetForEffect(effect);
  const caster = target.includesCaster === true
    ? 'caster is eligible'
    : target.includesCaster === false
      ? 'caster is excluded'
      : 'caster eligibility unknown';
  if (output.targetCount === 3) {
    return `Targets exactly 3 Allies; ${caster}.`;
  }
  if (!output.targetCount) {
    return null;
  }
  const other = target.includesCaster === false ? 'other ' : '';
  const noun = output.targetCount === 1 ? 'Ally' : 'Allies';
  return `Targets ${output.targetCount} ${other}${noun}; ${caster}.`;
}

function formatValue(value: number, unit: RankedValue['unit'] | OutputCapability['channel'] | AbilityEffect['unit']): string {
  if (unit === 'percent' || unit === 'rate') {
    return `${value}%`;
  }
  if (unit === 'flat') {
    return `${value} flat`;
  }
  return String(value);
}

function analyzeExtraActionTriggerChains(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  extraActions: ExtraActionCapability[],
  triggeredAbilities: TriggeredAbilityCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const extraAction of extraActions.filter((capability) => extraActionCapabilityVisible(capability, options))) {
    const providerPosition = positionOf(formation, extraAction.dragonId);
    const provider = dragonById(dragons, extraAction.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || (recipientId === extraAction.dragonId && extraAction.targetSelector.includesCaster === false)) {
        continue;
      }
      const targeting = extraActionTargetRequirement(extraAction, providerPosition, recipientPosition);
      if (targeting.satisfied === false) {
        continue;
      }
      const recipient = dragonById(dragons, recipientId);
      if (!recipient) {
        continue;
      }
      for (const triggeredAbility of triggeredAbilities.filter(
        (capability) =>
          capability.dragonId === recipientId &&
          capability.triggerEvent === extraAction.triggerEvent &&
          triggeredAbilityCapabilityVisible(capability, options),
      )) {
        const triggeredEffectSummary = extraActionTriggeredEffectSummary(triggeredAbility);
        const recipientResolved = extraAction.targetSelector.selection === 'self' || targeting.satisfied === true;
        const recipientFacts = recipientResolved
          ? [`Resolved extra-action recipient: ${recipient.name}.`]
          : ['Extra-action recipient remains unresolved.'];
        const requirements = dedupeRequirements([
          targeting,
          ...availabilityRequirements({
            dragonId: extraAction.dragonId,
            abilityId: extraAction.abilityId,
            dragonName: provider.name,
            abilityName: extraAction.abilityName,
            unlockStarRank: extraAction.unlockStarRank,
            minimumDragonLevel: extraAction.minimumDragonLevel,
            requiredHabitLevel: extraAction.requiredHabitLevel,
            evidenceIds: extraAction.evidenceIds,
            sourceKind: abilitySourceKind(dragons, extraAction.dragonId, extraAction.abilityId),
          }, options),
          ...availabilityRequirements({
            dragonId: triggeredAbility.dragonId,
            abilityId: triggeredAbility.abilityId,
            dragonName: recipient.name,
            abilityName: triggeredAbility.abilityName,
            unlockStarRank: triggeredAbility.unlockStarRank,
            minimumDragonLevel: triggeredAbility.minimumDragonLevel,
            requiredHabitLevel: triggeredAbility.requiredHabitLevel,
            evidenceIds: triggeredAbility.evidenceIds,
            sourceKind: triggeredAbility.sourceKind,
          }, options),
        ]);
        traces.push(makeDependencyTrace({
          id: `extra-basic-attack-trigger-${extraAction.id}-${triggeredAbility.id}-${recipientId}`,
          matchKind: 'extra-basic-attack-trigger',
          ruleId: 'extra-basic-attack-trigger',
          source: provider,
          sourceAbilityId: extraAction.abilityId,
          recipient,
          recipientAbilityId: triggeredAbility.abilityId,
          channel: 'status',
          title: `${extraAction.abilityName} - Extra Basic Attack trigger`,
          explanation:
            `${statusLabel(extraAction.statusId)} may grant ${recipient.name} a second Basic Attack. ${triggeredEffectSummary}`,
          requirements,
          matchedFacts: [
            `Status semantic: ${statusLabel(extraAction.statusId)} - ${extraAction.statusDefinition}`,
            `Extra action type: ${extraAction.actionType}.`,
            `Trigger event: ${extraAction.triggerEvent}.`,
            `Extra action recipient and triggered ability owner: ${recipient.id}.`,
            ...recipientFacts,
            `${triggeredAbility.abilityName} triggers after each Basic Attack.`,
            `${triggeredAbility.abilityName} has after-Basic-Attack triggered effects.`,
            `${statusLabel(extraAction.statusId)} grants a second Basic Attack.`,
            `Eligible triggered effect IDs: ${triggeredAbility.triggeredEffectIds.join(', ') || 'none'}.`,
            `Excluded scheduled or non-event effect IDs: ${triggeredAbility.excludedEffectIds.join(', ') || 'none'}.`,
            'Recursion policy: the second Basic Attack emits an after-Basic-Attack event only; scheduled round checks and whole-ability recursion are not re-run without explicit evidence.',
            `${extraAction.abilityName} targets ${targetSelectorSummary(extraAction.targetSelector)}.`,
            ...(extraAction.sourceEffectId ? [`Source effect ID: ${extraAction.sourceEffectId}.`] : []),
            ...(extraAction.activationGroupId ? [`Shared activation group: ${extraAction.activationGroupId}.`] : []),
            ...extraActionActivationChanceFacts(extraAction),
            ...(extraAction.durationRounds !== null ? [`Duration: ${extraAction.durationRounds} rounds.`] : []),
          ],
          effects: [
            triggeredEffectSummary,
            'Scheduled grant rolls do not repeat from the extra Basic Attack event.',
          ],
          sourceEvidenceIds: extraAction.evidenceIds,
          recipientEvidenceIds: triggeredAbility.evidenceIds,
          assumptions: [
            'Provider activation is not guaranteed.',
            ...(recipientResolved ? [] : ['Target selection may choose another eligible recipient.']),
            'Exact uptime, total attacks, final damage, and successful attack effects are not calculated.',
            'Only the verified after-each-Basic-Attack dependency is represented; broader trigger ordering is unresolved.',
          ],
          unresolvedQuestions: ['Exact timing and final combat result from the extra Basic Attack are unresolved.'],
          futureOrConditional: extraAction.futureAvailable || triggeredAbility.futureAvailable || extraAction.conditions.length > 0 || extraActionChanceConditional(extraAction),
          modifier: null,
        }));
      }
    }
  }
  return traces;
}

function extraActionTriggeredEffectSummary(triggeredAbility: TriggeredAbilityCapability): string {
  const labels = uniqueOrdered(triggeredAbility.triggeredEffectLabels);
  const hasPhysical = labels.some((label) => /Physical Damage/i.test(label));
  if (triggeredAbility.abilityName === 'Feral Precision' && hasPhysical) {
    return `A second Basic Attack can trigger ${triggeredAbility.abilityName}'s added after-Basic-Attack Physical Damage again.`;
  }
  if (hasPhysical) {
    return `A second Basic Attack can trigger ${triggeredAbility.abilityName}'s after-Basic-Attack Physical Damage effects again.`;
  }
  const effectText = labels.length > 0 ? joinEnglishList(labels) : 'eligible after-Basic-Attack effects';
  return `A second Basic Attack can trigger ${triggeredAbility.abilityName}'s after-Basic-Attack ${effectText} again.`;
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

function modifierMatchesOutputChannel(modifierChannel: EffectChannel, outputChannel: EffectChannel): boolean {
  return modifierChannel === 'damage-dealt'
    ? isDamageChannel(outputChannel)
    : modifierChannel === outputChannel;
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
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'ally-support' &&
      capability.direction === 'dealt' &&
      capability.operation === 'increase' &&
      capability.targetSelector.selection !== 'self' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    if (!providerPosition) {
      continue;
    }
    const modifierTraces: AmplificationSynergyTrace[] = [];
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || (recipientId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
        continue;
      }
      const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
      const candidateOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          modifierMatchesOutputChannel(modifier.channel, output.channel) &&
          isDamageOutputCapability(output) &&
          outputCapabilityVisible(output, options),
      );
      const matches = candidateOutputs.map((output) =>
        capabilityMatch(modifier, output, [
          targeting,
          ...providerRequirementTraces(modifier, formation, dragons, options),
          ...outputRequirementTraces(output, options),
          sourceScopeRequirement(modifier, output),
        ], options),
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
      modifierTraces.push(makeAmplificationTrace({
        matchKind: 'outgoing-effect-amplification',
        provider,
        providerAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: compatible[0]?.outputCapabilityId ?? null,
        modifier,
        matches: compatible,
        requirements: mergeRequirements(compatible),
        title: modifier.abilityId === 'vermax-spreading-blaze' || modifier.abilityId === 'vermax-rallying-flame'
          ? `${modifier.abilityName} Support`
          : supportTitle(modifier.channel),
        explanation: outgoingExplanation(provider.name, modifier, recipient.name, compatible, outputs, options),
        assumptions: outgoingAssumptions(modifier, compatible),
        unresolvedQuestions: unresolvedForModifier(modifier),
        options,
      }));
    }
    traces.push(...groupSingleTargetOutgoingTraces(formation, dragons, modifier, modifierTraces, outputs, options));
  }
  return traces;
}

function groupDefensiveAllySupportTraces(traces: SynergyTrace[], dragons: Dragon[]): SynergyTrace[] {
  const allMatchingGroups = new Map<string, SynergyTrace[]>();
  const otherTraces: SynergyTrace[] = [];
  for (const trace of traces) {
    if (trace.targetSelectorSummary?.includes('; all-matching-condition;') && trace.modifierCapabilityIds?.length === 1) {
      const modifierId = trace.modifierCapabilityIds[0]!;
      allMatchingGroups.set(modifierId, [...(allMatchingGroups.get(modifierId) ?? []), trace]);
    } else {
      otherTraces.push(trace);
    }
  }
  const grouped: SynergyTrace[] = [];
  grouped.push(...[...allMatchingGroups.values()].map((items) => groupAllMatchingDefensiveTrace(items, dragons)));

  const byAbilityRecipient = new Map<string, SynergyTrace[]>();
  for (const trace of otherTraces) {
    const key = [
      trace.sourceDragonId,
      trace.sourceAbilityId ?? '',
      trace.recipientDragonId ?? '',
      trace.damageScope ?? '',
      trace.modifierCapabilityId ?? '',
    ].join('|');
    byAbilityRecipient.set(key, [...(byAbilityRecipient.get(key) ?? []), trace]);
  }
  grouped.push(...[...byAbilityRecipient.values()].map((items) => {
    if (items.length === 1) {
      return items[0]!;
    }
    const first = items[0]!;
    const reductions = uniqueOrdered(items.flatMap((trace) => trace.effects));
    return {
      ...first,
      status: aggregateStatus(items.map((trace) => trace.status)),
      requirements: dedupeRequirements(items.flatMap((trace) => trace.requirements)),
      matchedFacts: uniqueSorted(items.flatMap((trace) => trace.matchedFacts)),
      effects: reductions,
      conflicts: uniqueSorted(items.flatMap((trace) => trace.conflicts)),
      assumptions: uniqueSorted([
        ...items.flatMap((trace) => trace.assumptions),
        'Threshold tiers are alternatives based on current Troop Capacity and selected Habit Level; cumulative stacking is not assumed.',
      ]),
      modifierCapabilityId: null,
      modifierCapabilityIds: uniqueSorted(items.flatMap((trace) => trace.modifierCapabilityIds ?? [])),
    };
  }));
  return grouped;
}

function groupAllMatchingDefensiveTrace(items: SynergyTrace[], dragons: Dragon[]): SynergyTrace {
  const first = items[0]!;
  const recipientIds = uniqueSorted(
    items.map((trace) => trace.recipientDragonId).filter((dragonId): dragonId is string => Boolean(dragonId)),
  );
  const recipientNames = recipientIds.map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId);
  return {
    ...first,
    id: `defensive-all-matching-${first.modifierCapabilityIds?.[0] ?? first.id}`,
    recipientDragonId: null,
    recipientAbilityId: null,
    status: aggregateStatus(items.map((trace) => trace.status)),
    requirements: dedupeRequirements(items.flatMap((trace) => trace.requirements)),
    matchedFacts: uniqueSorted(items.flatMap((trace) => trace.matchedFacts)),
    effects: uniqueSorted(items.flatMap((trace) => trace.effects)),
    conflicts: uniqueSorted(items.flatMap((trace) => trace.conflicts)),
    assumptions: uniqueSorted([
      ...items.flatMap((trace) => trace.assumptions),
      'Threshold applicability depends on each recipient current Troop Capacity.',
      'Exact interaction between overlapping threshold tiers is unresolved.',
      'Cumulative stacking is not assumed.',
    ]),
    unresolvedQuestions: uniqueSorted([
      ...items.flatMap((trace) => trace.unresolvedQuestions),
      'Exact interaction between overlapping Trial by Flame threshold tiers is unresolved.',
    ]),
    recipientEvidenceIds: uniqueSorted(items.flatMap((trace) => trace.recipientEvidenceIds)),
    modifierCapabilityId: null,
    modifierCapabilityIds: uniqueSorted(items.flatMap((trace) => trace.modifierCapabilityIds ?? [])),
    explanation: `${abilityNameForTrace(dragons, first) ?? 'Ability'} can affect ${joinEnglishList(recipientNames)} when each recipient satisfies the matching condition. Threshold applicability depends on each recipient's current Troop Capacity; exact interaction between overlapping threshold tiers is unresolved.`,
    interactionScope: 'targeting-fact',
    targetSelectionGroup: {
      targetCount: recipientIds.length,
      eligibleRecipientDragonIds: recipientIds,
      selectionUncertain: false,
      selection: 'all-matching-condition',
    },
  };
}

function analyzeDefensiveAllySupport(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      (capability.role === 'ally-support' || isVisibleSelfDefensiveModifier(capability)) &&
      capability.direction === 'received' &&
      capability.channel === 'damage-received' &&
      capability.operation === 'decrease' &&
      (capability.targetSelector.selection !== 'self' || isVisibleSelfDefensiveModifier(capability)) &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    if (!providerPosition) {
      continue;
    }
    for (const recipientPosition of recipientPositionsForModifier(formation, dragons, modifier, providerPosition)) {
      const recipientId = formation[recipientPosition];
      if (
        !recipientId ||
        (
          recipientId === modifier.dragonId &&
          modifier.targetSelector.includesCaster === false &&
          !isVisibleSelfDefensiveModifier(modifier)
        )
      ) {
        continue;
      }
      const provider = dragonById(dragons, modifier.dragonId);
      const recipient = dragonById(dragons, recipientId);
      if (!provider || !recipient) {
        continue;
      }
      const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
      const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
      const requirements = dedupeRequirements([
        targeting,
        ...providerRequirementTraces(modifier, formation, dragons, options),
      ]);
      const damageLabel = damageReceivedLabel(modifier.damageScope);
      const displayValue = modifierDisplayValue(modifier, options);
      const modifierDetails = compactSemanticFacts(defensiveModifierDetailLines(modifier, displayValue, options, context));
      const effectDetails = compactSemanticFacts([...modifierDetails, ...activationChanceFacts(modifier, options)]);
      const trace = makeDependencyTrace({
        id: `defensive-ally-support-${modifier.id}-${recipientId}`,
        matchKind: 'defensive-ally-support',
        ruleId: 'defensive-ally-support',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: null,
        channel: 'damage-received',
        title: `${damageLabel} Support`,
        explanation: /below 50% Troop Capacity/i.test([...modifier.conditions, ...(context?.effect.conditions ?? []), ...(context?.schedule.conditions ?? [])].map((condition) => condition.description).join(' '))
          ? `${provider.name}'s ${modifier.abilityName} can reduce ${recipient.name}'s ${damageLabel}.`
          : `${provider.name}'s ${modifier.abilityName} can reduce ${recipient.name}'s ${damageLabel} by ${displayValue}.`,
        requirements,
        matchedFacts: [
          ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          ...defensiveModifierTargetFacts(modifier, context, formation, providerPosition, recipientPosition, dragons, recipient.name),
          ...modifier.conditions.map((condition) => condition.description),
        ],
        effects: effectDetails,
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: defensiveModifierAssumptions(modifier, context),
        unresolvedQuestions: [],
        futureOrConditional: defensiveModifierTraceIsConditional(modifier) || (modifier.futureAvailable && options.previewMaxRankInteractions === true),
        modifier,
        damageScope: modifier.damageScope,
        exactResultUnknownReason: 'Exact final mitigated damage cannot be calculated because activation success, modifier or support uptime, refresh or combination behavior, and final mitigation formula are unresolved.',
      });
      traces.push(trace);
    }
  }
  return groupDefensiveAllySupportTraces(groupSingleTargetDefensiveTraces(traces, dragons), dragons);
}

function analyzeInternalSelfModifiers(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      (capability.role === 'self-amplification' || capability.targetSelector.selection === 'self') &&
      !isVisibleSelfDefensiveModifier(capability) &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    const requirements = dedupeRequirements([
      targetRequirement(modifier, providerPosition, providerPosition),
      ...providerRequirementTraces(modifier, formation, dragons, options),
    ]);
    const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
    const details = internalModifierDetailLines(modifier, context, options);
    traces.push(makeDependencyTrace({
      id: `internal-self-modifier-${modifier.id}`,
      matchKind: 'outgoing-effect-amplification',
      ruleId: 'internal-self-modifier',
      source: provider,
      sourceAbilityId: modifier.abilityId,
      recipient: provider,
      recipientAbilityId: null,
      channel: modifier.channel,
      title: `Internal ${internalModifierTitle(modifier)}`,
      explanation: `${provider.name}'s ${modifier.abilityName} affects ${provider.name}. ${details.join(' ')}`,
      requirements,
      matchedFacts: [
        ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
        `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
        ...details,
        ...activationChanceFacts(modifier, options),
      ],
      effects: details,
      sourceEvidenceIds: modifier.evidenceIds,
      recipientEvidenceIds: [],
      assumptions: [],
      unresolvedQuestions: [],
      futureOrConditional: capabilityFutureOrConditional(modifier, options) || defensiveModifierTraceIsConditional(modifier) || stackModifierTraceIsConditional(context),
      modifier,
      damageScope: modifier.damageScope,
    }));
  }
  return traces;
}

function stackModifierTraceIsConditional(context: { schedule: AbilitySchedule; effect: AbilityEffect } | null): boolean {
  return Boolean(context?.effect.stack) &&
    context?.schedule.timing !== 'start-of-combat' &&
    context?.schedule.timing !== 'passive';
}

function internalModifierTitle(modifier: ModifierCapability): string {
  if (modifier.channel === 'stat') {
    const stat = statIdFromText(modifier.label);
    return stat ? `${statLabel(stat)} modifier` : 'Stat modifier';
  }
  return `${directedChannelLabel(modifier.channel, modifier.direction)} modifier`;
}

function internalModifierDetailLines(
  modifier: ModifierCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect } | null,
  options: CapabilityOptions,
): string[] {
  if (context?.effect.effectOptions?.mode === 'one-of') {
    return exclusiveChoiceDetailLines(modifier, context.schedule, context.effect, options);
  }
  const rawValue = modifierDisplayValue(modifier, options).replace(/^-/, '');
  const effectiveLevel = modifier.rankedValues.length > 0
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options))
    : null;
  const stat = modifier.channel === 'stat' ? statIdFromText(modifier.label) : null;
  const value = stat ? rawValue.replace(/\s+flat$/i, '') : rawValue;
  const stackDetails = context?.effect.stack
    ? stackModifierDetailLines(modifier, context.schedule, context.effect, options)
    : [];
  const contextDetails = contextualModifierDetailLines(modifier, options);
  const mainLine = modifier.valuePerStack !== null
    ? modifierEffectValueLine(modifier, options)
    : stat
      ? `${statLabel(stat)} ${modifier.operation === 'decrease' ? '-' : '+'}${value}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`
      : `${directedChannelLabel(modifier.channel, modifier.direction)} ${modifier.operation} ${value}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`;
  return [
    context ? scheduleTimingDetail(context.schedule) : null,
    mainLine,
    ...contextDetails,
    ...stackDetails,
    context ? enhancementDetail(context.effect) : null,
    context ? durationDetail(context.effect) : modifier.durationRounds ? `Duration: ${modifier.durationRounds} rounds.` : null,
    context ? rankedProgressionDetail(context.effect) : null,
  ].filter((detail): detail is string => Boolean(detail));
}

function exclusiveChoiceDetailLines(
  modifier: ModifierCapability,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  options: CapabilityOptions,
): string[] {
  const level = options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options);
  const value = modifierDisplayValue(modifier, options).replace(/^-/, '');
  const optionLabels = effect.effectOptions?.options.map((option) => option.label) ?? [];
  return [
    scheduleTimingDetail(schedule),
    `Exclusive one-of choice: exactly one of ${exclusiveChoiceOptionPhrase(optionLabels)} is reduced by ${value}${level ? ` at effective Habit Level ${level}` : ''}.`,
    durationDetail(effect),
    effect.effectOptions?.selectorMethod === 'unknown' ? 'Selection method is unresolved.' : null,
    effect.effectOptions?.description ? `Exclusive-choice rule: ${effect.effectOptions.description}` : null,
    rankedProgressionDetail(effect),
  ].filter((detail): detail is string => Boolean(detail));
}

function exclusiveChoiceOptionPhrase(optionLabels: string[]): string {
  const suffix = ' Damage Received';
  if (optionLabels.length > 1 && optionLabels.every((label) => label.endsWith(suffix))) {
    return `${joinExclusiveList(optionLabels.map((label) => label.slice(0, -suffix.length)))}${suffix}`;
  }
  return joinExclusiveList(optionLabels);
}

function joinExclusiveList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} or ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, or ${items.at(-1)}`;
}

function contextualModifierDetailLines(
  modifier: ModifierCapability,
  options: CapabilityOptions,
): string[] {
  return modifier.conditions.flatMap((condition) => {
    if (condition.kind !== 'battle-context') {
      return [];
    }
    if ((options.battleContext ?? 'unspecified') === 'unspecified') {
      return ['PvE-only bonus is contextual and is not treated as active.'];
    }
    return [];
  });
}

function stackModifierDetailLines(
  modifier: ModifierCapability,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  options: CapabilityOptions,
): string[] {
  if (!effect.stack) {
    return [];
  }
  const level = options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options);
  const levelOneValue = rankedValueForHabitLevel(effect.stack.valuePerStackByHabitLevel, 1)?.value ?? effect.stack.valuePerStackFixed;
  const currentLevelValue = rankedValueForHabitLevel(effect.stack.valuePerStackByHabitLevel, level)?.value ?? effect.stack.valuePerStackFixed;
  const levelOneMaximum = levelOneValue !== null && effect.stack.maximumStacks !== null
    ? levelOneValue * effect.stack.maximumStacks
    : null;
  return [
    `Shared stack pool: ${effect.stack.statusId}.`,
    effect.stack.maximumStacks !== null ? `Maximum stacks: ${effect.stack.maximumStacks}.` : 'Maximum stacks: unknown.',
    levelOneValue !== null ? `Value per stack at effective Habit Level 1: ${formatValue(levelOneValue, 'percent')} ${directedChannelLabel(modifier.channel, modifier.direction)}.` : null,
    currentLevelValue !== null && level && level !== 1 ? `Value per stack at effective Habit Level ${level}: ${formatValue(currentLevelValue, 'percent')} ${directedChannelLabel(modifier.channel, modifier.direction)}.` : null,
    levelOneMaximum !== null ? `Maximum theoretical modifier at effective Habit Level 1: ${formatValue(levelOneMaximum, 'percent')} ${directedChannelLabel(modifier.channel, modifier.direction)}.` : null,
    'Current stack count is unknown.',
    ...stackActivationDetailLines(modifier, schedule, effect, options),
    ...repeatDetailLines(schedule),
    schedule.timing === 'when-marked-target-receives-recovery' ? 'Prey-Recovery trigger is event-dependent and not guaranteed Active while the event is unresolved.' : null,
    schedule.timing === 'each-round' && schedule.triggerChanceFixed !== null ? 'Each-round stack trigger is chance-based and not guaranteed Active.' : null,
  ].filter((line): line is string => Boolean(line));
}

function stackActivationDetailLines(
  modifier: ModifierCapability,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  options: CapabilityOptions,
): string[] {
  if (!effect.activationRoll && !schedule.activationRoll && schedule.triggerChanceFixed !== null) {
    return [`Trigger chance: ${schedule.triggerChanceFixed}%.`];
  }
  return activationChanceFacts(modifier, options);
}

function repeatDetailLines(schedule: AbilitySchedule): string[] {
  if (!schedule.repeat) {
    return [];
  }
  const condition = schedule.repeat.condition?.description ?? 'the repeat condition matches';
  if (schedule.repeat.mode === 'once-if-any-match') {
    return [
      'Repeat mode: once-if-any-match.',
      `If ${condition.charAt(0).toLowerCase()}${condition.slice(1).replace(/\.$/, '')}, create at most one additional activation attempt.`,
      'The repeat remains chance-based and is not a guaranteed extra stack.',
    ];
  }
  if (schedule.repeat.mode === 'once-per-match') {
    return [
      'Repeat mode: once-per-match.',
      `Additional activation attempts occur once per matching entity: ${condition.replace(/\.$/, '')}.`,
      'Enemy match count is unresolved.',
      'Each repeated attempt remains chance-based and is not a guaranteed stack.',
    ];
  }
  return [];
}

function analyzeRecipientSideAllySupport(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'ally-support' &&
      capability.direction === 'received' &&
      capability.channel === 'recovery' &&
      capability.operation === 'increase' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    for (const recipientPosition of targetCandidatePositions(formation, dragons, modifier, providerPosition)) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || (recipientId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
        continue;
      }
      const recipient = dragonById(dragons, recipientId);
      if (!recipient) {
        continue;
      }
      const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
      if (targeting.satisfied === false) {
        continue;
      }
      const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
      const value = modifierDisplayValue(modifier, options);
      const details = recipientSideModifierDetailLines(modifier, context, value, options);
      traces.push(makeDependencyTrace({
        id: `recipient-side-ally-support-${modifier.id}-${recipientId}`,
        matchKind: 'outgoing-effect-amplification',
        ruleId: 'recipient-side-ally-support',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: null,
        channel: modifier.channel,
        title: `${channelLabel(modifier.channel)} Received Support`,
        explanation: `${provider.name}'s ${modifier.abilityName} can increase ${recipient.name}'s ${channelLabel(modifier.channel)} Received by ${value}.${details.length > 0 ? ` ${details.join(' ')}` : ''}`,
        requirements: dedupeRequirements([
          targeting,
          ...providerRequirementTraces(modifier, formation, dragons, options),
        ]),
        matchedFacts: [
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          ...details,
        ],
        effects: [...details],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: ['Final Recovery amount remains unknown.'],
        unresolvedQuestions: ['Exact final Recovery amount and stacking order are not calculated.'],
        futureOrConditional: (modifier.futureAvailable && options.previewMaxRankInteractions === true) || modifier.conditional,
        modifier,
      }));
    }
  }
  return traces;
}

function recipientSideModifierDetailLines(
  modifier: ModifierCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect } | null,
  displayValue: string,
  options: CapabilityOptions,
): string[] {
  if (!context) {
    const effectiveLevel = modifier.rankedValues.length > 0
      ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options))
      : null;
    return [
      modifier.channel === 'damage-received'
        ? `${damageReceivedLabel(modifier.damageScope)} decrease ${displayValue}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`
        : `${channelLabel(modifier.channel)} Received +${displayValue}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`,
      modifier.durationRounds ? `Duration: ${modifier.durationRounds} rounds.` : null,
    ].filter((detail): detail is string => Boolean(detail));
  }
  const effectiveLevel = modifier.rankedValues.length > 0
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options))
    : null;
  return [
    scheduleTimingDetail(context.schedule),
    `${channelLabel(modifier.channel)} Received +${displayValue}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`,
    durationDetail(context.effect),
    rankedProgressionDetail(context.effect),
    outputTargetingDetail({
      channel: modifier.channel,
      targetSide: modifier.targetSelector.side,
      targetCount: modifier.targetSelector.count,
    } as OutputCapability, context.effect),
  ].filter((detail): detail is string => Boolean(detail));
}

function isVisibleSelfDefensiveModifier(modifier: ModifierCapability): boolean {
  return (modifier.role === 'ally-support' || modifier.role === 'self-amplification') &&
    modifier.direction === 'received' &&
    modifier.channel === 'damage-received' &&
    modifier.targetSelector.selection === 'self' &&
    Boolean(modifier.statusId);
}

function defensiveModifierTraceIsConditional(modifier: ModifierCapability): boolean {
  return modifier.conditions.some((condition) => condition.kind !== 'battle-context') ||
    modifier.activationChanceFixed !== null ||
    (modifier.activationChanceByHabitLevel?.length ?? 0) > 0;
}

function defensiveModifierDetailLines(
  modifier: ModifierCapability,
  displayValue: string,
  options: CapabilityOptions,
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
): string[] {
  const effectiveLevel = modifier.rankedValues.length > 0
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options))
    : null;
  const thresholdConditions = [
    ...modifier.conditions,
    ...(context?.effect.conditions ?? []),
    ...(context?.schedule.conditions ?? []),
  ];
  const resistanceBranch = thresholdConditions.some((condition) =>
    /below 50% Troop Capacity/i.test(condition.description) &&
    modifier.channel === 'damage-received' &&
    modifier.statusId === 'resistance' &&
    modifier.abilityId === 'seasmoke-loyal-bond',
  );
  const thresholdDetails = thresholdConditions.flatMap((condition) => {
    if (!/Troop Capacity/i.test(condition.description)) {
      return [];
    }
    if (/above 50% Troop Capacity/i.test(condition.description) && modifier.channel === 'damage-dealt') {
      return [`Each recipient above 50% Troop Capacity may receive Advantage, increasing Damage Dealt by ${displayValue}.`];
    }
    if (/below 50% Troop Capacity/i.test(condition.description) && modifier.channel === 'damage-received') {
      return modifier.abilityId === 'seasmoke-loyal-bond'
        ? [`Below 50% Troop Capacity branch applies.`]
        : [`Each recipient below 50% Troop Capacity may receive Resistance, reducing Damage Received by ${displayValue}.`];
    }
    return [condition.description];
  });
  const reductionLine = resistanceBranch
    ? `${statusLabel(modifier.statusId ?? 'resistance')} reduces Damage Received by ${displayValue}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`
    : `${damageReceivedLabel(modifier.damageScope)} decrease ${displayValue}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.`;
  if (!context) {
    return [
      reductionLine,
      modifier.sourceScope === 'non-basic-attacks' ? `${damageReceivedLabel(modifier.damageScope)} reduction applies to non-Basic Attacks only.` : null,
      ...thresholdDetails,
      modifier.durationRounds ? `Duration: ${modifier.durationRounds} rounds.` : null,
    ].filter((detail): detail is string => Boolean(detail));
  }
  return [
    context ? scheduleTimingDetail(context.schedule) : null,
    modifier.statusId && context?.effect.stack ? `Grants 1 ${formatCapabilityToken(modifier.statusId)} stack.` : null,
    reductionLine,
    modifier.sourceScope === 'non-basic-attacks' ? `${damageReceivedLabel(modifier.damageScope)} reduction applies to non-Basic Attacks only.` : null,
    ...thresholdDetails,
    ...activationChanceFacts(modifier, options),
    context ? durationDetail(context.effect) : modifier.durationRounds ? `Duration: ${modifier.durationRounds} rounds.` : null,
    context ? rankedProgressionDetail(context.effect) : null,
    modifier.statusId && context?.effect.stack && modifier.stackMaximum === null ? 'Maximum stack count is not verified.' : null,
  ].filter((detail): detail is string => Boolean(detail));
}

function defensiveModifierAssumptions(
  modifier: ModifierCapability,
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
): string[] {
  const thresholdCondition =
    modifier.conditions.some((condition) => /Troop Capacity|threshold/i.test(condition.description)) ||
    Boolean(context?.effect.conditions?.some((condition) => /Troop Capacity|threshold/i.test(condition.description))) ||
    Boolean(context?.schedule.conditions?.some((condition) => /Troop Capacity|threshold/i.test(condition.description)));
  const chanceBased = Boolean(context && isChanceBasedSchedule(context.schedule));
  if (!chanceBased && !thresholdCondition) {
    return [];
  }
  if (chanceBased && thresholdCondition) {
    return ['Trigger chance and threshold eligibility may make this conditional rather than guaranteed.'];
  }
  if (chanceBased) {
    return ['Trigger chance may make this conditional rather than guaranteed.'];
  }
  return ['Threshold eligibility may make this conditional rather than guaranteed.'];
}

function defensiveModifierTargetFacts(
  modifier: ModifierCapability,
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
  formation: FormationAnalysisInput,
  providerPosition: FormationPosition,
  recipientPosition: FormationPosition,
  dragons: Dragon[],
  recipientName: string,
): string[] {
  const effect = context?.effect;
  if (!effect) {
    return [];
  }
  const eligiblePositions = targetCandidatePositions(formation, dragons, modifier, providerPosition);
  const eligibleNames = eligiblePositions
    .map((position) => formation[position])
    .filter((dragonId): dragonId is string => Boolean(dragonId))
    .map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId);
  const targetCount = effect.targetCount ?? modifier.targetSelector.count ?? null;
  const allMatching = modifier.targetSelector.selection === 'all-matching-condition';
  return [
    effect.casterEligibility === 'excluded' || effect.includesCaster === false
      ? 'Caster excluded from this target selection.'
      : null,
    effect.targetSelection?.sharedSelectionGroupId
      ? `Shared selected-target group: ${effect.targetSelection.sharedSelectionGroupId}.`
      : null,
    allMatching
      ? `All matching allies: ${joinEnglishList(eligibleNames)}.`
      : targetCount !== null && targetCount > 1
      ? `Eligible recipients: ${joinEnglishList(eligibleNames)}.`
      : eligiblePositions.length > 1
        ? `Eligible selected-target candidates: ${joinEnglishList(eligibleNames)}.`
        : null,
    allMatching
      ? 'Each eligible recipient evaluates its own condition; no one ally is selected from the qualifying set.'
      : targetCount !== null && targetCount > 1
      ? `Target count is ${targetCount}, so these allies occupy separate target slots.`
      : eligiblePositions.length > 1
        ? 'One candidate is selected when the activation succeeds; the selected target is unresolved.'
        : null,
    ...((effect.targetSelection?.references ?? []).map((reference) =>
      `Target reference ${reference.id}: ${reference.description}${reference.referencedEffectId ? ` References source effect ${reference.referencedEffectId}.` : ''}`,
    )),
    ...trackedTargetFacts(context, formation, providerPosition, dragons),
    modifier.targetSelector.sharedSelectionGroupId &&
    modifier.targetSelector.selection === 'one-eligible-adjacent' &&
    eligiblePositions.length === 1 &&
    eligiblePositions[0] === recipientPosition
      ? `Resolved selected target in this formation: ${recipientName}.`
      : null,
  ].filter((fact): fact is string => Boolean(fact));
}

function trackedTargetFacts(
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect },
  formation: FormationAnalysisInput,
  providerPosition: FormationPosition,
  dragons: Dragon[],
): string[] {
  return (context.effect.targetSelection?.references ?? []).flatMap((reference) => {
    if (reference.kind !== 'persistent-selected-target' || !reference.referencedEffectId) {
      return [];
    }
    const referencedEffect = context.ability.schedules
      .flatMap((schedule) => schedule.effects.flatMap(derivableEffects))
      .find((effect) => effect.id === reference.referencedEffectId);
    if (!referencedEffect) {
      return [];
    }
    const referencedTarget = targetForEffect(referencedEffect);
    if (referencedTarget.selection !== 'one-eligible-adjacent') {
      return [];
    }
    const adjacentIds = FORMATION_POSITIONS
      .filter((position) => arePositionsAdjacent(providerPosition, position))
      .map((position) => formation[position])
      .filter((dragonId): dragonId is string => Boolean(dragonId));
    if (referencedTarget.includesCaster === false) {
      const casterId = formation[providerPosition];
      const filtered = adjacentIds.filter((dragonId) => dragonId !== casterId);
      adjacentIds.splice(0, adjacentIds.length, ...filtered);
    }
    if (adjacentIds.length !== 1) {
      return [];
    }
    const name = dragonById(dragons, adjacentIds[0]!)?.name ?? adjacentIds[0]!;
    return [`Tracked selected ally in this formation: ${name}.`];
  });
}

function formatCapabilityToken(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function analyzeFriendlyImpairments(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'ally-impairment' &&
      capability.operation === 'decrease' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || (recipientId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
        continue;
      }
      const recipient = dragonById(dragons, recipientId);
      if (!recipient) {
        continue;
      }
      const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
      if (targeting.satisfied === false) {
        continue;
      }
      const requirements = dedupeRequirements([
        targeting,
        ...providerRequirementTraces(modifier, formation, dragons, options),
      ]);
      const value = modifierDisplayValue(modifier, options);
      const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
      const impairmentDetails = modifierDetailLines(modifier, context);
      traces.push(makeDependencyTrace({
        id: `friendly-impairment-${modifier.id}-${recipientId}`,
        matchKind: 'friendly-impairment',
        ruleId: 'friendly-impairment',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: null,
        channel: modifier.channel,
        title: `${channelLabel(modifier.channel)} Friendly Impairment`,
        explanation: `${provider.name}'s ${modifier.abilityName} can harm ${recipient.name} by reducing ${channelLabel(modifier.channel)} by ${value}. This is an allied impairment, not support.${impairmentDetails.length > 0 ? ` ${impairmentDetails.join(' ')}` : ''}`,
        requirements,
        matchedFacts: [
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          ...modifier.conditions.map((condition) => condition.description),
          ...impairmentDetails,
        ],
        effects: [`Friendly ${channelLabel(modifier.channel)} decrease ${value}`, ...impairmentDetails],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: [
          'The effect is intentionally represented as harmful to friendly formation members.',
          'Uptime and final combat impact are not calculated.',
        ],
        unresolvedQuestions: ['Exact final damage impact, stacking, and refresh behavior remain unresolved.'],
        futureOrConditional: (modifier.futureAvailable && options.previewMaxRankInteractions === true) || modifier.conditional,
        modifier,
      }));
    }
  }
  return traces;
}

function groupSingleTargetOutgoingTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifier: ModifierCapability,
  traces: AmplificationSynergyTrace[],
  outputs: OutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const eligible = traces.filter((trace) => !['inactive', 'blocked', 'not-applicable'].includes(trace.status));
  const resolvedSingleQualifiedRecipient = modifier.targetSelector.count === 1 && eligible.length === 1;
  const preferredPosition = preferredPositionForModifier(modifier, dragons);
  const providerPosition = positionOf(formation, modifier.dragonId);
  const eligiblePositions = providerPosition
    ? allEligibleTargetCandidatePositions(formation, modifier, providerPosition)
    : [];
  const preferredRecipientId = preferredPosition && eligiblePositions.includes(preferredPosition)
    ? formation[preferredPosition]
    : null;
  if (
    modifier.targetSelector.count !== 1 ||
    modifier.targetSelector.selection === 'specific-position' ||
    modifier.targetSelector.selection === 'one-eligible-adjacent' ||
    modifier.targetSelector.selection === 'adjacent'
  ) {
    const mapped = preferredPosition
      ? traces.map((trace) =>
          eligible.includes(trace)
            ? withPreferredPositionFacts(
                trace,
                modifier,
                preferredPosition,
                trace.recipientDragonId !== null && formationPositionForDragonId(trace.recipientDragonId, traces) === preferredPosition,
              )
            : trace,
        )
      : traces;
    return resolvedSingleQualifiedRecipient ? mapped.map((trace) =>
      eligible.includes(trace) ? withResolvedSingleQualifiedRecipientFacts(trace, modifier, dragons) : trace,
    ) : mapped;
  }

  if (preferredPosition && preferredRecipientId) {
    const preferredTrace = eligible.find((trace) => trace.recipientDragonId === preferredRecipientId);
    if (preferredTrace) {
      return [
        withPreferredPositionFacts(preferredTrace, modifier, preferredPosition, true),
        ...traces.filter((trace) => !eligible.includes(trace)),
      ];
    }
    if (!preferredPositionUsesQualifyingOutputEligibility(modifier, dragons) && (preferredRecipientId !== modifier.dragonId || !explicitSelfTargetingAllowed(modifier, dragons))) {
      const noOutputTrace = noQualifiedOutputTargetSelectionTrace(
        formation,
        dragons,
        modifier,
        preferredRecipientId,
        preferredPosition,
        options,
      );
      return noOutputTrace ? [noOutputTrace] : [];
    }
  }

  if (eligible.length <= 1) {
    return resolvedSingleQualifiedRecipient ? traces.map((trace) =>
      eligible.includes(trace) ? withResolvedSingleQualifiedRecipientFacts(trace, modifier, dragons) : trace,
    ) : traces;
  }

  const first = eligible[0]!;
  const eligibleRecipientDragonIds = eligible
    .map((trace) => trace.recipientDragonId)
    .filter((dragonId): dragonId is string => Boolean(dragonId))
    .sort();
  const matchedOutputCapabilityIds = uniqueSorted(
    eligible.flatMap((trace) => trace.matchedOutputCapabilityIds ?? []),
  );
  const sourceScopeResults = eligible.flatMap((trace) => trace.sourceScopeResults ?? []);
  const recipientNames = eligibleRecipientDragonIds
    .map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId)
    .join(' and ');
  const outputLabels = outputChannelNames(outputs, matchedOutputCapabilityIds);
  const providerName = dragonById(dragons, first.sourceDragonId)?.name ?? first.sourceDragonId;

  return [
    {
      ...first,
      id: `target-selection-${modifier.id}-${modifier.channel}`,
      recipientDragonId: null,
      recipientAbilityId: null,
      status: aggregateStatus(eligible.map((trace) => trace.status)),
      title: `${channelLabel(modifier.channel)} Target Selection`,
      explanation:
        `${providerName}'s ${modifier.abilityName} can target one ${channelLabel(modifier.channel)} ally. Eligible recipients are ${recipientNames}. The selected recipient is not guaranteed. Qualifying outputs: ${outputLabels.join(', ')}.`,
      requirements: dedupeRequirements(eligible.flatMap((trace) => trace.requirements)),
      matchedFacts: uniqueSorted([
        ...eligible.flatMap((trace) => trace.matchedFacts),
        ...(preferredPosition ? preferredSelectionFacts(modifier, preferredPosition, false) : []),
        ...eligibleRecipientDragonIds.map((dragonId) => `Eligible recipient: ${dragonId}.`),
      ]),
      effects: uniqueSorted(eligible.flatMap((trace) => trace.effects)),
      conflicts: [],
      assumptions: uniqueSorted([
        ...eligible.flatMap((trace) => trace.assumptions),
        'Target count is one, so eligible recipients compete for the same activation.',
      ]),
      recipientEvidenceIds: uniqueSorted(eligible.flatMap((trace) => trace.recipientEvidenceIds)),
      matchedOutputCapabilityIds,
      sourceScopeResults,
      modifierCapabilityIds: uniqueSorted(eligible.flatMap((trace) => trace.modifierCapabilityIds ?? [trace.modifierCapabilityId ?? '']).filter(Boolean)),
      interactionScope: 'targeting-fact',
      targetSelectionGroup: {
        targetCount: 1,
        eligibleRecipientDragonIds,
        selectionUncertain: true,
        selection: modifier.targetSelector.selection,
        selectionStat: modifier.targetSelector.selectionStat ?? null,
        selectionResource: modifier.targetSelector.selectionResource ?? modifier.targetSelector.selectionStat ?? null,
        comparisonDirection: modifier.targetSelector.comparisonDirection ?? null,
        comparisonPool: modifier.targetSelector.comparisonPool ?? null,
      },
    },
    ...traces.filter((trace) => !eligible.includes(trace)),
  ];
}

function noQualifiedOutputTargetSelectionTrace(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifier: ModifierCapability,
  recipientId: string,
  preferredPosition: FormationPosition,
  options: CapabilityOptions,
): SynergyTrace | null {
  const provider = dragonById(dragons, modifier.dragonId);
  const recipient = dragonById(dragons, recipientId);
  const providerPosition = positionOf(formation, modifier.dragonId);
  const recipientPosition = positionOf(formation, recipientId);
  if (!provider || !providerPosition || !recipient || !recipientPosition) {
    return null;
  }

  const requirements = dedupeRequirements([
    targetRequirement(modifier, providerPosition, recipientPosition),
    ...providerRequirementTraces(modifier, formation, dragons, options),
  ]);
  const providerName = provider.name;
  const recipientName = recipient.name;
  const channel = channelLabel(modifier.channel);

  return {
    id: `target-selection-no-output-${modifier.id}-${recipientId}`,
    ruleId: 'target-selection-no-qualified-output',
    status: statusFromRequirements(requirements, capabilityFutureOrConditional(modifier, options) || modifier.conditional),
    confidence: modifier.confidence,
    sourceDragonId: provider.id,
    sourceAbilityId: modifier.abilityId,
    recipientDragonId: null,
    recipientAbilityId: null,
    title: `${channel} Target Selection`,
    explanation:
      `${providerName}'s ${modifier.abilityName} resolves to ${recipientName} from the preferred ${formatPosition(preferredPosition)} position, but ${recipientName} has no qualifying ${channel} output in this formation. Target resolution does not redirect to another dragon solely to find a compatible output.`,
    requirements,
    matchedFacts: uniqueSorted([
      `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
      ...preferredSelectionFacts(modifier, preferredPosition, true),
      `Selected recipient: ${recipientId}.`,
      `Selected recipient position: ${preferredPosition}.`,
      `No qualifying ${channel} outputs exist on the resolved target.`,
    ]),
    effects: [
      `Resolved target: ${recipientName}.`,
      `No qualifying ${channel} outputs exist on the resolved target.`,
      'Target resolution remains independent from output compatibility.',
    ],
    conflicts: requirements
      .filter((requirement) => requirement.satisfied === false)
      .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
    assumptions: ['No current analyzable benefit is created when the resolved target lacks a qualifying output.'],
    unresolvedQuestions: [],
    sourceEvidenceIds: modifier.evidenceIds,
    recipientEvidenceIds: [],
    combatLogConfirmed: modifier.combatLogConfirmed,
    exactResultKnown: false,
    exactResultUnknownReason: 'No compatible output exists on the resolved target in the current formation.',
    channel: modifier.channel,
    modifierRole: modifier.role,
    targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
    modifierSelfOnly: modifier.role === 'self-amplification' || modifier.targetSelector.selection === 'self',
    availabilityContext: modifier.availability.reportLabel,
    modifierCapabilityId: modifier.id,
    modifierCapabilityIds: [modifier.id],
    interactionScope: 'targeting-fact',
    targetSelectionGroup: {
      targetCount: 1,
      eligibleRecipientDragonIds: [recipientId],
      selectionUncertain: false,
      selection: modifier.targetSelector.selection,
      selectionStat: modifier.targetSelector.selectionStat ?? null,
      selectionResource: modifier.targetSelector.selectionResource ?? modifier.targetSelector.selectionStat ?? null,
      comparisonDirection: modifier.targetSelector.comparisonDirection ?? null,
      comparisonPool: modifier.targetSelector.comparisonPool ?? null,
    },
  };
}

function formationPositionForDragonId(dragonId: string, traces: SynergyTrace[]): FormationPosition | null {
  for (const trace of traces) {
    const requirement = trace.requirements.find((item) => item.label === 'Position compatibility' && item.actual?.includes(`recipient `));
    const position = requirement?.actual?.match(/recipient ([a-z-]+)/i)?.[1] as FormationPosition | undefined;
    if (trace.recipientDragonId === dragonId && position && FORMATION_POSITIONS.includes(position)) {
      return position;
    }
  }
  return null;
}

function preferredPositionForModifier(modifier: ModifierCapability, dragons: Dragon[]): FormationPosition | null {
  const provider = dragonById(dragons, modifier.dragonId);
  const context = provider ? sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId) : null;
  const preference = context?.effect.targetSelection?.preference ?? null;
  const priority = context?.effect.targetPriority ?? null;
  if (priority === 'prefer-left-flank' || /left flank/i.test(preference ?? '')) {
    return 'left-flank';
  }
  if (priority === 'prefer-right-flank' || /right flank/i.test(preference ?? '')) {
    return 'right-flank';
  }
  return null;
}

function explicitSelfTargetingAllowed(modifier: ModifierCapability, dragons: Dragon[]): boolean {
  const provider = dragonById(dragons, modifier.dragonId);
  const context = provider ? sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId) : null;
  return context?.effect.includesCaster === true ||
    context?.effect.casterEligibility === 'included' ||
    context?.effect.casterEligibility === 'eligible-if-targeting-allows';
}

function preferredPositionUsesQualifyingOutputEligibility(modifier: ModifierCapability, dragons: Dragon[]): boolean {
  const provider = dragonById(dragons, modifier.dragonId);
  const context = provider ? sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId) : null;
  return context?.effect.targetSelection?.qualifyingOutputAffectsEligibility === true;
}

function preferredSelectionFacts(
  modifier: ModifierCapability,
  preferredPosition: FormationPosition,
  resolved: boolean,
): string[] {
  const label = preferredPosition === 'left-flank' ? 'Left Flank' : preferredPosition === 'right-flank' ? 'Right Flank' : 'Vanguard';
  const provider = resolved
    ? `Preferred position resolved: ${label}.`
    : `Preferred position ${label} has no eligible qualifying recipient in this formation; fallback candidates remain eligible.`;
  return [
    `Preferred position: ${label}.`,
    provider,
    modifier.targetSelector.sharedSelectionGroupId ? `Shared selected-target group: ${modifier.targetSelector.sharedSelectionGroupId}.` : null,
  ].filter((fact): fact is string => Boolean(fact));
}

function withPreferredPositionFacts<T extends SynergyTrace>(
  trace: T,
  modifier: ModifierCapability,
  preferredPosition: FormationPosition,
  resolved: boolean,
): T {
  const facts = preferredSelectionFacts(modifier, preferredPosition, resolved);
  return {
    ...trace,
    matchedFacts: uniqueSorted([...trace.matchedFacts, ...facts]),
  };
}

function groupSingleTargetDefensiveTraces(
  traces: SynergyTrace[],
  dragons: Dragon[],
): SynergyTrace[] {
  const grouped: SynergyTrace[] = [];
  const consumed = new Set<SynergyTrace>();
  for (const trace of traces) {
    if (consumed.has(trace) || trace.modifierCapabilityIds?.length !== 1) {
      continue;
    }
    const modifierId = trace.modifierCapabilityIds[0]!;
    const peers = traces.filter((candidate) =>
      candidate.modifierCapabilityIds?.includes(modifierId) &&
      candidate.status !== 'inactive' &&
      candidate.targetSelectorSummary?.includes('; 1 target;') &&
      candidate.targetSelectorSummary.includes('; shared group ')
    );
    if (peers.length <= 1) {
      continue;
    }
    peers.forEach((peer) => consumed.add(peer));
    const first = peers[0]!;
    const recipientIds = uniqueOrdered(
      peers.map((peer) => peer.recipientDragonId).filter((dragonId): dragonId is string => Boolean(dragonId)),
    );
    const recipientNames = recipientIds.map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId);
    const selectorSummary = first.targetSelectorSummary ?? '';
    const selection = selectorSummary.includes('; lowest-resource;')
      ? 'lowest-resource'
      : selectorSummary.includes('; highest-resource;')
        ? 'highest-resource'
        : selectorSummary.includes('; highest-stat;')
          ? 'highest-stat'
          : 'one-eligible-adjacent';
    grouped.push({
      ...first,
      id: `defensive-target-selection-${modifierId}`,
      recipientDragonId: null,
      recipientAbilityId: null,
      status: aggregateStatus(peers.map((peer) => peer.status)),
      title: 'Damage Received Target Selection',
      explanation: `${abilityNameForTrace(dragons, first) ?? 'Ability'} can reduce Damage Received for one selected ally. Eligible recipients: ${joinEnglishList(recipientNames)}. The selected recipient is not guaranteed.`,
      requirements: dedupeRequirements(peers.flatMap((peer) => peer.requirements)),
      matchedFacts: uniqueSorted(peers.flatMap((peer) => peer.matchedFacts)),
      effects: uniqueSorted(peers.flatMap((peer) => peer.effects)),
      conflicts: [],
      assumptions: uniqueSorted([
        ...peers.flatMap((peer) => peer.assumptions),
        'Target count is one, so eligible recipients compete for the same activation.',
      ]),
      unresolvedQuestions: uniqueSorted(peers.flatMap((peer) => peer.unresolvedQuestions)),
      recipientEvidenceIds: uniqueSorted(peers.flatMap((peer) => peer.recipientEvidenceIds)),
      modifierCapabilityId: null,
      modifierCapabilityIds: [modifierId],
      interactionScope: 'targeting-fact',
      targetSelectionGroup: {
        targetCount: 1,
        eligibleRecipientDragonIds: recipientIds,
        selectionUncertain: true,
        selection,
        selectionResource: selectorSummary.includes('selection resource current-troops') ? 'current-troops' : null,
        selectionStat: selectorSummary.includes('selection stat strength')
          ? 'strength'
          : selectorSummary.includes('selection stat intelligence')
            ? 'intelligence'
            : selectorSummary.includes('selection stat instinct')
              ? 'instinct'
              : selectorSummary.includes('selection stat initiative')
                ? 'initiative'
                : null,
        comparisonDirection: selectorSummary.includes('comparison lowest')
          ? 'lowest'
          : selectorSummary.includes('comparison highest')
            ? 'highest'
            : null,
        comparisonPool: selectorSummary.includes('comparison pool ally-side')
          ? 'ally-side'
          : selectorSummary.includes('comparison pool enemy-side')
            ? 'enemy-side'
            : null,
      },
    });
  }
  return [
    ...grouped,
    ...traces.filter((trace) => !consumed.has(trace)),
  ];
}

function analyzeIncomingAmplifications(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): AmplificationSynergyTrace[] {
  const traces: AmplificationSynergyTrace[] = [];
  for (const output of outputs.filter(
    (capability) =>
      (capability.targetSide === 'ally' || capability.targetSide === 'self') &&
      outputCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, output.dragonId);
    if (!providerPosition) {
      continue;
    }
    const provider = dragonById(dragons, output.dragonId);
    const outputContext = provider ? sourceEffectContext(provider, output.abilityId, output.sourceEffectId) : null;
    const outputSelector = outputContext ? targetForEffect(outputContext.effect) : null;
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId) {
        continue;
      }
      const recipientModifiers = modifiers.filter((modifier) => {
        if (
          modifier.channel !== output.channel ||
          modifier.direction !== 'received' ||
          modifier.operation !== 'increase' ||
          !modifierCapabilityVisible(modifier, options)
        ) {
          return false;
        }
        if (modifier.role === 'recipient-side-amplification' && modifier.dragonId === recipientId) {
          return true;
        }
        return modifier.channel === 'recovery' && modifier.role === 'ally-support';
      });
      for (const modifier of recipientModifiers) {
        const targeting = outputTargetsRecipient(output, providerPosition, recipientPosition, outputSelector);
        if (targeting.satisfied === false) {
          continue;
        }
        const modifierProviderPosition = positionOf(formation, modifier.dragonId);
        const modifierTargeting = targetRequirement(modifier, modifierProviderPosition, recipientPosition);
        if (modifierTargeting.satisfied === false) {
          continue;
        }
        const match = capabilityMatch(modifier, output, [
          targeting,
          modifierTargeting,
          ...outputRequirementTraces(output, options),
          ...providerRequirementTraces(modifier, formation, dragons, options),
        ], options, { applySourceScope: false, includeOutputConditional: true });
        const recipient = dragonById(dragons, recipientId);
        const modifierProvider = dragonById(dragons, modifier.dragonId);
        if (!provider || !recipient || !modifierProvider) {
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
            `${provider.name} provides ${channelLabel(output.channel)} through ${output.abilityName}. ${recipient.name} has ${modifierProvider.name}'s ${modifier.abilityName} ${channelLabel(output.channel)} Received modifier, increasing received ${channelLabel(output.channel)} by ${modifierDisplayValue(modifier, options)}.`,
          assumptions: [],
          unresolvedQuestions: ['Exact final Recovery amount is unknown because the full Level and Instinct Recovery formula is not known.'],
          options,
        }));
      }
    }
  }
  return traces;
}

function analyzeStatusEffectConditionEnablement(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  const selectedDragonIds = selectedFormationDragonIds(formation);
  for (const dependentDragon of dragons.filter((dragon) => selectedDragonIds.has(dragon.id))) {
    const dependentPosition = positionOf(formation, dependentDragon.id);
    if (!dependentPosition) {
      continue;
    }
    for (const ability of allAbilities(dependentDragon)) {
      if (!capabilityVisible({
        dragonId: dependentDragon.id,
        abilityId: ability.id,
        unlockStarRank: ability.unlockStarRank,
        minimumDragonLevel: ability.minimumDragonLevel,
        requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
        futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
      }, options)) {
        continue;
      }
      for (const schedule of ability.schedules) {
        for (const effect of schedule.effects.flatMap(derivableEffects)) {
          if (outputChannelForEffect(effect)) {
            continue;
          }
          const dependencies = statusDependenciesForEffect(effect, schedule);
          if (dependencies.length === 0) {
            continue;
          }
            for (const dependency of dependencies) {
              for (const statusOutput of statusOutputs.filter(
                (status) =>
                statusMatchesDependency(status.statusId, dependency) &&
                status.dragonId !== dependentDragon.id &&
                statusCapabilityVisible(status, options),
            )) {
              const providerPosition = positionOf(formation, statusOutput.dragonId);
              const provider = dragonById(dragons, statusOutput.dragonId);
              if (!providerPosition || !provider) {
                continue;
              }
              const targetCompatibility = statusProviderRequirement(statusOutput, dependency.type, providerPosition, dependentPosition);
              if (targetCompatibility.satisfied === false) {
                continue;
              }
              const requirements = [
                targetCompatibility,
                ...availabilityRequirements({
                  dragonId: statusOutput.dragonId,
                  abilityId: statusOutput.abilityId,
                  dragonName: provider.name,
                  abilityName: statusOutput.abilityName,
                  unlockStarRank: statusOutput.unlockStarRank,
                  minimumDragonLevel: statusOutput.minimumDragonLevel,
                  requiredHabitLevel: statusOutput.requiredHabitLevel,
                  evidenceIds: statusOutput.evidenceIds,
                  sourceKind: abilitySourceKind(dragons, statusOutput.dragonId, statusOutput.abilityId),
                }, options),
                ...availabilityRequirements({
                  dragonId: dependentDragon.id,
                  abilityId: ability.id,
                  dragonName: dependentDragon.name,
                  abilityName: ability.name,
                  unlockStarRank: ability.unlockStarRank,
                  minimumDragonLevel: ability.minimumDragonLevel,
                  requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
                  evidenceIds: ability.evidenceIds,
                  sourceKind: ability.kind,
                }, options),
              ];
              const dependencyLabel = statusDependencyLabel(dependency);
              const supplierContext = sourceEffectContext(provider, statusOutput.abilityId, statusOutput.sourceEffectId);
              const recipientResolution = allyStatusRecipientResolution(
                formation,
                dragons,
                statusOutput,
                supplierContext,
                statusEffectRecipientCandidatesForStatusDependency(formation, dragons, statusOutput, dependency, options),
              );
              const conditionalFacts = conditionalChanceValueFacts(ability, schedule, effect, statusOutput.statusId, dependency, options, dependentDragon.id, dependentDragon.name, recipientResolution);
              const categoryFacts = statusCategoryFacts(statusOutput.statusId, dependency);
              const siblingStatusOutputs = statusOutputs.filter((candidate) =>
                candidate.dragonId === statusOutput.dragonId &&
                candidate.abilityId === statusOutput.abilityId &&
                candidate.statusId === statusOutput.statusId &&
                statusCapabilityVisible(candidate, options),
              );
              const supplierFacts = supplierFactsForRecipientResolution(
                statusSupplierFacts(statusOutput, supplierContext, options, siblingStatusOutputs),
                recipientResolution,
              );
              const scheduleFacts = statusConditionScheduleOverlapFacts(
                statusOutput,
                supplierContext,
                {
                  abilityId: ability.id,
                  abilityName: ability.name,
                  channel: 'status',
                },
                { ability, schedule, effect },
                dependency,
                dependentDragon.name,
                recipientResolution,
              );
              traces.push(makeDependencyTrace({
                id: `status-effect-condition-${statusOutput.id}-${ability.id}-${effect.id}-${dependency.type}-${dependency.statusId ?? dependency.statusCategoryId}`,
                matchKind: 'status-condition-enablement',
                ruleId: 'status-condition-enablement',
                source: provider,
                sourceAbilityId: statusOutput.abilityId,
                recipient: dependentDragon,
                recipientAbilityId: ability.id,
                channel: 'status',
                title: `${statusLabel(statusOutput.statusId)} enables ${ability.name}`,
                explanation: statusConditionExplanation(provider, statusOutput, dependentDragon, {
                  abilityId: ability.id,
                  abilityName: ability.name,
                  channel: 'status',
                }, dependencyLabel, conditionalFacts, categoryFacts, supplierFacts, scheduleFacts),
                requirements,
                matchedFacts: [
                  `Receiving source effect ID: ${effect.id}.`,
                  ...dependency.notes,
                  ...categoryFacts.facts,
                  ...conditionalFacts.facts,
                  ...supplierFacts.facts,
                  ...recipientResolutionFacts(recipientResolution),
                  ...scheduleFacts.facts,
                ],
                effects: [`Conditional ${effect.type}: ${dependencyLabel}`, ...categoryFacts.effects, ...conditionalFacts.effects, ...supplierFacts.effects, ...scheduleFacts.effects],
                sourceEvidenceIds: statusOutput.evidenceIds,
                recipientEvidenceIds: ability.evidenceIds,
                assumptions: [
                  ...scheduleFacts.assumptions,
                  statusDependencyUnresolvedAssumption(dependency, statusLabel(statusOutput.statusId), recipientResolution),
                ],
                unresolvedQuestions: uniqueSorted([
                  statusDependencyUnresolvedQuestion(dependency, statusLabel(statusOutput.statusId), recipientResolution),
                  ...(effect.activationRoll?.unresolved && effect.activationRoll.description ? [effect.activationRoll.description] : []),
                  ...(schedule.activationRoll?.unresolved && schedule.activationRoll.description ? [schedule.activationRoll.description] : []),
                  'Exact roll sharing, target evaluation order, status check timing, refresh, and stacking remain unresolved.',
                ]),
                futureOrConditional: true,
              }));
            }
          }
        }
      }
    }
  }
  return traces;
}

function analyzeEnemyStatusSourceOutputs(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const output of statusOutputs.filter((capability) =>
    capability.targetSide === 'enemy' &&
    statusCapabilityVisible(capability, options) &&
    !statusOutputComesFromConditionalBranch(dragons, capability),
  )) {
    const provider = dragonById(dragons, output.dragonId);
    const providerPosition = positionOf(formation, output.dragonId);
    if (!provider || !providerPosition) {
      continue;
    }
    const context = sourceEffectContext(provider, output.abilityId, output.sourceEffectId);
    if (!context) {
      continue;
    }
    if (!shouldAuditEnemyStatusSourceOutput(output, context, statusOutputs)) {
      continue;
    }
    const requirements = statusOutputRequirementTraces(output, provider, dragons, options);
    const supplier = statusSupplierFacts(output, context, options);
    const rollScope = context?.effect.activationRoll?.unresolved || context?.schedule.activationRoll?.unresolved
      ? 'Activation scope is unresolved between one shared roll and independent per-target rolls.'
      : null;
    const persistentTargetReference = (context.effect.targetSelection?.references ?? []).some((reference) => reference.kind === 'persistent-selected-target');
    const conditionalChance = (context.effect.conditionalMultipliers ?? []).find((multiplier) => /chance/i.test(multiplier.description) || /chance/i.test(multiplier.condition.description));
    const preyDependency = persistentTargetReference ||
      output.conditions.some((condition) => /prey/i.test(condition.description) || condition.statusId === 'prey') ||
      /prey/i.test(conditionalChance?.condition.description ?? '');
    const persistentTargetReason = preyDependency
      ? `${statusLabel(output.statusId)} application remains conditional because current Prey existence and identity, whether the Prey received Recovery during the previous round, which known activation-chance branch applies, application success, and ${statusLabel(output.statusId)} uptime or refresh behavior remain unresolved.`
      : null;
    const selectorSummary = persistentTargetSelectorSummary(output.targetSelector, context.effect);
    traces.push({
      id: `enemy-status-output-${output.id}`,
      ruleId: 'status-source-output',
      status: statusFromRequirements(requirements, capabilityFutureOrConditional(output, options) || output.conditions.length > 0 || statusChanceConditional(output)),
      confidence: 'confirmed',
      sourceDragonId: provider.id,
      sourceAbilityId: output.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: `${output.abilityName} - ${statusLabel(output.statusId)} attempt`,
      explanation: supplier.summary ?? `${provider.name}'s ${output.abilityName} can apply ${statusLabel(output.statusId)} to enemy targets.`,
      requirements,
      matchedFacts: [
        `Status identity: ${output.statusId}.`,
        output.sourceEffectId ? `Source effect ID: ${output.sourceEffectId}.` : null,
        ...supplier.facts,
        rollScope,
      ].filter((fact): fact is string => Boolean(fact)),
      effects: [
        ...supplier.effects,
        rollScope,
      ].filter((effect): effect is string => Boolean(effect)),
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: ['Status application remains chance-based or conditional when activation or uptime is unresolved.'],
      unresolvedQuestions: [
        ...(context?.effect.activationRoll?.unresolved && context.effect.activationRoll.description ? [context.effect.activationRoll.description] : []),
        ...(context?.schedule.activationRoll?.unresolved && context.schedule.activationRoll.description ? [context.schedule.activationRoll.description] : []),
      ],
      sourceEvidenceIds: output.evidenceIds,
      recipientEvidenceIds: [],
      combatLogConfirmed: false,
      exactResultKnown: false,
      exactResultUnknownReason: persistentTargetReason ?? 'Exact status application cannot be calculated because application success, uptime, and refresh behavior are unresolved.',
      matchKind: 'status-condition-enablement',
      channel: 'status',
      targetSelectorSummary: selectorSummary,
      modifierSelfOnly: false,
      availabilityContext: output.availability.reportLabel,
      modifierCapabilityId: output.id,
      modifierCapabilityIds: [output.id],
      interactionScope: 'enemy-side',
    });
  }
  return traces;
}

function analyzeFriendlyStatusSourceOutputs(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const statusOutput of statusOutputs.filter((capability) =>
    capability.targetSide === 'ally' &&
    statusCapabilityVisible(capability, options) &&
    !statusOutputComesFromConditionalBranch(dragons, capability),
  )) {
    const provider = dragonById(dragons, statusOutput.dragonId);
    const providerPosition = positionOf(formation, statusOutput.dragonId);
    if (!provider || !providerPosition) {
      continue;
    }
    const context = sourceEffectContext(provider, statusOutput.abilityId, statusOutput.sourceEffectId);
    if (!context) {
      continue;
    }
    const dependentRecipients = uniqueOrdered(outputs
      .filter((output) =>
        selectedFormationDragonIds(formation).has(output.dragonId) &&
        outputCapabilityVisible(output, options) &&
        output.dependencies.some((dependency) =>
          isStatusConditionDependency(dependency) &&
          dependency.type === 'requires-self-status' &&
          statusMatchesDependency(statusOutput.statusId, dependency),
        ),
      )
      .map((output) => output.dragonId));
    if (dependentRecipients.length === 0 && !shouldAuditStandaloneFriendlyStatusSource(context)) {
      continue;
    }
    const supplier = statusSupplierFacts(statusOutput, context, options);
    const requirements = statusOutputRequirementTraces(statusOutput, provider, dragons, options);
    const eligibleRecipients = friendlyStatusCandidateRecipients(
      formation,
      dragons,
      outputs,
      statusOutput,
      context.effect,
      providerPosition,
      dependentRecipients,
    );
    if (eligibleRecipients.length === 0) {
      continue;
    }
    const rollScope = context.effect.activationRoll?.unresolved || context.schedule.activationRoll?.unresolved
      ? 'Activation scope is unresolved between one shared roll and independent per-target rolls.'
      : null;
    const selectionUncertain = eligibleRecipients.length > 1;
    const recipient = eligibleRecipients.length === 1 ? dragonById(dragons, eligibleRecipients[0]!) : null;
    const sharedAllyFact = sharedAllyStatusSiblingFact(statusOutput, context, Boolean(recipient));
    const supplierFacts = recipient
      ? supplier.facts.filter((fact) => fact !== 'Selected ally recipient is unresolved.')
      : supplier.facts;
    const resolutionBasis = recipient ? allyRecipientResolutionBasis(context.effect) : null;
    traces.push({
      id: `friendly-status-output-${statusOutput.id}-${eligibleRecipients.join('-')}`,
      ruleId: 'status-source-output',
      status: statusFromRequirements(requirements, capabilityFutureOrConditional(statusOutput, options) || statusOutput.conditions.length > 0 || statusChanceConditional(statusOutput)),
      confidence: 'confirmed',
      sourceDragonId: provider.id,
      sourceAbilityId: statusOutput.abilityId,
      recipientDragonId: recipient?.id ?? null,
      recipientAbilityId: null,
      title: `${statusOutput.abilityName} - ${statusLabel(statusOutput.statusId)} source`,
      explanation: selectionUncertain
        ? `${provider.name}'s ${statusOutput.abilityName} can grant ${statusLabel(statusOutput.statusId)} to one eligible ally. ${supplier.summary ?? ''}`.trim()
        : `${provider.name}'s ${statusOutput.abilityName} can grant ${statusLabel(statusOutput.statusId)} to ${recipient?.name ?? 'the selected ally'}. ${supplier.summary ?? ''}`.trim(),
      requirements,
      matchedFacts: [
        `Status identity: ${statusOutput.statusId}.`,
        statusOutput.sourceEffectId ? `Source effect ID: ${statusOutput.sourceEffectId}.` : null,
        ...supplierFacts,
        recipient ? `Resolved ally recipient: ${recipient.name}.` : null,
        resolutionBasis,
        recipient && statusChanceConditional(statusOutput) ? 'Activation success is unresolved.' : null,
        selectionUncertain ? `Eligible ally recipients: ${eligibleRecipients.map((recipientId) => dragonById(dragons, recipientId)?.name ?? recipientId).join(', ')}.` : null,
        ...eligibleRecipients.map((recipientId) => dependentRecipients.includes(recipientId)
          ? `Dependent recipient candidate: ${recipientId}.`
          : `Eligible recipient candidate: ${recipientId}.`),
        sharedAllyFact,
        rollScope,
      ].filter((fact): fact is string => Boolean(fact)),
      effects: [
        ...supplier.effects,
        sharedAllyFact,
        rollScope,
      ].filter((effect): effect is string => Boolean(effect)),
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: selectionUncertain
        ? ['The same selected ally must both receive the status and own the dependent output.']
        : ['The dependent output must belong to the ally that receives the status.'],
      unresolvedQuestions: [
        ...(context.effect.activationRoll?.unresolved && context.effect.activationRoll.description ? [context.effect.activationRoll.description] : []),
        ...(context.schedule.activationRoll?.unresolved && context.schedule.activationRoll.description ? [context.schedule.activationRoll.description] : []),
      ],
      sourceEvidenceIds: statusOutput.evidenceIds,
      recipientEvidenceIds: [],
      combatLogConfirmed: false,
      exactResultKnown: false,
      exactResultUnknownReason: recipient
        ? `${recipient.name} is the resolved recipient if ${statusOutput.abilityName} activates; exact activation and resulting uptime are not calculated.`
        : 'Exact status application cannot be calculated because application success and resulting uptime are unresolved.',
      matchKind: 'status-condition-enablement',
      channel: 'status',
      targetSelectorSummary: targetSelectorSummary(statusOutput.targetSelector),
      modifierSelfOnly: false,
      availabilityContext: statusOutput.availability.reportLabel,
      modifierCapabilityId: statusOutput.id,
      modifierCapabilityIds: [statusOutput.id],
      interactionScope: recipient ? 'cross-dragon' : 'targeting-fact',
      targetSelectionGroup: selectionUncertain
        ? {
            targetCount: 1,
            eligibleRecipientDragonIds: eligibleRecipients,
            selectionUncertain: true,
            selection: statusOutput.targetSelector.selection,
            selectionStat: statusOutput.targetSelector.selectionStat ?? null,
            selectionResource: statusOutput.targetSelector.selectionResource ?? statusOutput.targetSelector.selectionStat ?? null,
            comparisonDirection: statusOutput.targetSelector.comparisonDirection ?? null,
            comparisonPool: statusOutput.targetSelector.comparisonPool ?? null,
          }
        : undefined,
    });
  }
  return traces;
}

function shouldAuditStandaloneFriendlyStatusSource(
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect },
): boolean {
  if (!scheduleHasSharedActivation(context.schedule)) {
    return false;
  }
  const friendlySharedEffects = context.schedule.effects
    .flatMap(derivableEffects)
    .filter((effect) => targetSideForEffect(effect) === 'ally' && activationGroupId(context.schedule, effect) === activationGroupId(context.schedule, context.effect));
  return friendlySharedEffects.length > 1;
}

function friendlyStatusCandidateRecipients(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  statusOutput: StatusOutputCapability,
  effect: AbilityEffect,
  providerPosition: FormationPosition,
  dependentRecipients: string[],
): string[] {
  const selected = Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId));
  const baseCandidates = (dependentRecipients.length > 0 ? dependentRecipients : selected)
    .filter((recipientId) => {
      const recipientPosition = positionOf(formation, recipientId);
      return Boolean(recipientPosition) &&
        statusOutputTargetsFriendlyRecipient(statusOutput, effect, providerPosition, recipientPosition!);
    });
  const qualifyingConditions = [
    ...(effect.conditions ?? []),
    ...(effect.conditionalMultipliers ?? []).map((multiplier) => multiplier.condition),
  ].filter((condition) => condition.kind === 'target-has-output-capability' && condition.qualifyingOutput);
  if (qualifyingConditions.length === 0) {
    return uniqueOrdered(baseCandidates);
  }
  return uniqueOrdered(baseCandidates.filter((recipientId) =>
    qualifyingConditions.every((condition) => {
      const qualifying = condition.qualifyingOutput;
      if (!qualifying) {
        return true;
      }
      const channel = qualifying.channel as EffectChannel;
      const sourceScope = capabilitySourceScope(qualifying.sourceScope);
      return outputs.some((output) =>
        output.dragonId === recipientId &&
        output.channel === channel &&
        sourceScopesCompatible(sourceScope, output.sourceScope)
      );
    })
  ));
}

function shouldAuditEnemyStatusSourceOutput(
  statusOutput: StatusOutputCapability,
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect },
  allStatusOutputs: StatusOutputCapability[],
): boolean {
  if (context.effect.stack?.maximumStacks === 1 && hasPersistentTargetReference(context.effect)) {
    return false;
  }
  if (hasPersistentTargetReference(context.effect)) {
    return true;
  }
  if (context.effect.activationRoll?.unresolved || context.schedule.activationRoll?.unresolved) {
    return true;
  }
  if (context.effect.perTargetEffectCheck || context.effect.activationRoll?.scope === 'independent-per-target') {
    return true;
  }
  return allStatusOutputs.some((candidate) =>
    candidate !== statusOutput &&
    candidate.dragonId === statusOutput.dragonId &&
    candidate.abilityId === statusOutput.abilityId &&
    candidate.statusId !== statusOutput.statusId,
  );
}

function hasPersistentTargetReference(effect: AbilityEffect): boolean {
  return effect.targetSelection?.references.some((reference) => reference.kind === 'persistent-selected-target') === true;
}

function analyzeConditionalBranchStatusOutputs(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const provider of dragons.filter((dragon) => positionOf(formation, dragon.id))) {
    for (const ability of allAbilities(provider)) {
      for (const schedule of ability.schedules) {
        for (const effect of schedule.effects.filter((item) => item.effectOptions?.mode === 'conditional-branch')) {
          const requirements = availabilityRequirements({
            dragonId: provider.id,
            abilityId: ability.id,
            dragonName: provider.name,
            abilityName: ability.name,
            unlockStarRank: ability.unlockStarRank,
            minimumDragonLevel: ability.minimumDragonLevel,
            requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
            evidenceIds: ability.evidenceIds,
            sourceKind: ability.kind,
          }, options);
          const level = ability.kind === 'habit'
            ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForAbility(provider.id, ability, options))
            : null;
          const chance = schedule.activationRoll?.chanceFixed !== null && schedule.activationRoll?.chanceFixed !== undefined
            ? `${schedule.activationRoll.chanceFixed}%`
            : rankedValueForHabitLevel(schedule.activationRoll?.chanceByHabitLevel ?? schedule.triggerChanceByHabitLevel, level)?.value;
          const chanceText = typeof chance === 'number' ? `${chance}% at effective Habit Level ${level ?? 'unknown'}` : chance;
          const optionLines = effect.effectOptions?.options.map((option) =>
            `${branchConditionLabel(option.condition?.description ?? option.label)} -> ${statusLabel(statusIdForEffect(option.effect) ?? option.effect.type)}.`,
          ) ?? [];
          const details = [
            scheduleTimingDetail(schedule),
            chanceText ? `Chance: ${chanceText}.` : null,
            `Targets: ${effect.target}.`,
            ...optionLines,
            'Exactly one branch applies per enemy.',
            schedule.activationRoll?.unresolved ? 'Roll scope is unresolved.' : null,
            durationDetail(effect),
          ].filter((line): line is string => Boolean(line));
          traces.push({
            id: `conditional-branch-status-output-${ability.id}-${effect.id}`,
            ruleId: 'conditional-branch-status-output',
            status: statusFromRequirements(requirements, true),
            confidence: confidenceForAbility(ability),
            sourceDragonId: provider.id,
            sourceAbilityId: ability.id,
            recipientDragonId: null,
            recipientAbilityId: null,
            title: `${ability.name} - Enemy status branch`,
            explanation: `${provider.name}'s ${ability.name} evaluates mutually exclusive status branches. ${details.join(' ')}`,
            requirements,
            matchedFacts: [
              `Source effect ID: ${effect.id}.`,
              effect.effectOptions?.description ?? null,
              ...details,
            ].filter((fact): fact is string => Boolean(fact)),
            effects: details,
            conflicts: requirements
              .filter((requirement) => requirement.satisfied === false)
              .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
            assumptions: ['Branch choice is evaluated per enemy; branches are not simultaneous on the same target.'],
            unresolvedQuestions: schedule.activationRoll?.unresolved && schedule.activationRoll.description ? [schedule.activationRoll.description] : [],
            sourceEvidenceIds: ability.evidenceIds,
            recipientEvidenceIds: [],
            combatLogConfirmed: false,
            exactResultKnown: false,
            exactResultUnknownReason: 'Exact branch outcomes cannot be calculated because enemy status state and roll scope are unresolved.',
            matchKind: 'status-condition-enablement',
            channel: 'status',
            targetSelectorSummary: targetSelectorSummary(targetForEffect(effect)),
            modifierSelfOnly: false,
            availabilityContext: availabilityContext(provider.id, ability.unlockStarRank, ability.minimumDragonLevel).reportLabel,
            modifierCapabilityId: `${ability.id}-${effect.id}-conditional-branch-status-output`,
            modifierCapabilityIds: effect.effectOptions?.options.map((option) => `${ability.id}-${option.effect.id}-${statusIdForEffect(option.effect) ?? option.effect.type}-status-output`) ?? [],
            interactionScope: 'enemy-side',
          });
        }
      }
    }
  }
  return traces;
}

function statusOutputComesFromConditionalBranch(dragons: Dragon[], output: StatusOutputCapability): boolean {
  const provider = dragonById(dragons, output.dragonId);
  const ability = provider ? allAbilities(provider).find((item) => item.id === output.abilityId) : null;
  return Boolean(ability?.schedules.some((schedule) =>
    schedule.effects.some((effect) =>
      effect.effectOptions?.mode === 'conditional-branch' &&
      effect.effectOptions.options.some((option) => option.effect.id === output.sourceEffectId),
    ),
  ));
}

function branchConditionLabel(description: string): string {
  if (/not already Taunted/i.test(description)) {
    return 'non-Taunted enemies';
  }
  if (/already Taunted/i.test(description)) {
    return 'already-Taunted enemies';
  }
  return description;
}

function analyzeStatusConditionEnablement(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const output of outputs.filter((capability) => outputCapabilityVisible(capability, options))) {
    const dependencies = output.dependencies.filter(isStatusConditionDependency);
    if (dependencies.length === 0) {
      continue;
    }
    const recipientPosition = positionOf(formation, output.dragonId);
    if (!recipientPosition) {
      continue;
    }
      for (const dependency of dependencies) {
      for (const statusOutput of statusOutputs.filter(
        (status) => statusMatchesDependency(status.statusId, dependency) && statusCapabilityVisible(status, options),
      )) {
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
        const context = sourceEffectContext(recipient, output.abilityId, output.sourceEffectId);
        const supplierContext = sourceEffectContext(provider, statusOutput.abilityId, statusOutput.sourceEffectId);
        const recipientResolution = allyStatusRecipientResolution(
          formation,
          dragons,
          statusOutput,
          supplierContext,
          outputRecipientCandidatesForStatusDependency(formation, outputs, statusOutput, dependency, options),
        );
        const enrichStatusTrace = true;
        const conditionalFacts = enrichStatusTrace && context
          ? conditionalMultiplierValueFacts(output, context, statusOutput.statusId, dependency, options, recipient.name, recipientResolution)
          : { facts: [], effects: [], summary: null };
        const categoryFacts = enrichStatusTrace
          ? statusCategoryFacts(statusOutput.statusId, dependency)
          : { facts: [], effects: [], summary: null };
        const siblingStatusOutputs = enrichStatusTrace
          ? statusOutputs.filter((candidate) =>
              candidate.dragonId === statusOutput.dragonId &&
              candidate.abilityId === statusOutput.abilityId &&
              candidate.statusId === statusOutput.statusId &&
              statusCapabilityVisible(candidate, options),
            )
          : [];
        const supplierFacts = enrichStatusTrace
          ? supplierFactsForRecipientResolution(statusSupplierFacts(statusOutput, supplierContext, options, siblingStatusOutputs), recipientResolution)
          : { facts: [], effects: [], summary: null };
        const scheduleFacts = enrichStatusTrace
          ? statusConditionScheduleOverlapFacts(statusOutput, supplierContext, output, context, dependency, recipient.name, recipientResolution)
          : { facts: [], effects: [], summary: null, assumptions: [] };
        const requirements = [
          statusProviderRequirement(statusOutput, dependency.type, providerPosition, recipientPosition),
          ...availabilityRequirements({
            dragonId: statusOutput.dragonId,
            abilityId: statusOutput.abilityId,
            dragonName: provider.name,
            abilityName: statusOutput.abilityName,
            unlockStarRank: statusOutput.unlockStarRank,
            minimumDragonLevel: statusOutput.minimumDragonLevel,
            requiredHabitLevel: statusOutput.requiredHabitLevel,
            evidenceIds: statusOutput.evidenceIds,
            sourceKind: abilitySourceKind(dragons, statusOutput.dragonId, statusOutput.abilityId),
          }, options),
          ...outputRequirementTraces(output, options),
        ];
        const dependencyLabel = statusDependencyLabel(dependency);
        const explanation = statusConditionExplanation(provider, statusOutput, recipient, output, dependencyLabel, conditionalFacts, categoryFacts, supplierFacts, scheduleFacts);
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
          explanation,
          requirements,
          matchedFacts: [
            ...(output.sourceEffectId ? [`Receiving source effect ID: ${output.sourceEffectId}.`] : []),
            ...dependency.notes,
            ...categoryFacts.facts,
            ...conditionalFacts.facts,
            ...supplierFacts.facts,
            ...recipientResolutionFacts(recipientResolution),
            ...scheduleFacts.facts,
          ],
          effects: [`Status condition: ${dependencyLabel}`, ...categoryFacts.effects, ...conditionalFacts.effects, ...supplierFacts.effects, ...scheduleFacts.effects],
          sourceEvidenceIds: statusOutput.evidenceIds,
          recipientEvidenceIds: output.evidenceIds,
          assumptions: [
            ...statusOutput.conditions.map((condition) => condition.description),
            ...statusConditionAssumptions(statusOutput, output, recipientResolution),
            ...scheduleFacts.assumptions,
            ...(conditionalFacts.summary ? [statusDependencyUnresolvedAssumption(dependency, statusLabel(statusOutput.statusId), recipientResolution)] : []),
          ],
          unresolvedQuestions: [statusDependencyUnresolvedQuestion(dependency, statusLabel(statusOutput.statusId), recipientResolution)],
          futureOrConditional: true,
        }));
      }
    }
  }
  return traces;
}

function analyzeDirectStatSupport(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'ally-support' &&
      capability.channel === 'stat' &&
      capability.operation === 'increase' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const statId = statIdFromText(modifier.label);
    if (!statId) {
      continue;
    }
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const recipientPosition of targetCandidatePositions(formation, dragons, modifier, providerPosition)) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || (recipientId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
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
      ];
      const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
      const details = statModifierDetailLines(modifier, context, options);
      traces.push(makeDependencyTrace({
        id: `direct-stat-support-${modifier.id}-${recipientId}-${statId}`,
        matchKind: 'stat-scaling-support',
        ruleId: 'direct-stat-support',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: null,
        channel: 'stat',
        title: `${statLabel(statId)} Stat Support`,
        explanation: `${provider.name}'s ${modifier.abilityName} can increase ${recipient.name}'s ${statLabel(statId)}.${details.length > 0 ? ` ${details.join(' ')}` : ''}`,
        requirements,
        matchedFacts: [
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          ...targetSelectionFacts(formation, dragons, modifier),
          ...details,
          ...activationChanceFacts(modifier, options),
        ],
        effects: [...details, ...activationChanceFacts(modifier, options)],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: [],
        unresolvedQuestions: [],
        futureOrConditional: (modifier.futureAvailable && options.previewMaxRankInteractions === true) || modifier.conditional,
        modifier,
      }));
    }
  }
  return groupDirectStatSupportTraces(traces, dragons);
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
    (capability) =>
      capability.role === 'ally-support' &&
      capability.channel === 'stat' &&
      capability.operation === 'increase' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const statId = statIdFromText(modifier.label);
    if (!statId) {
      continue;
    }
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const recipientPosition of targetCandidatePositions(formation, dragons, modifier, providerPosition)) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || (recipientId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
        continue;
      }
      const matchedOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          outputCapabilityVisible(output, options) &&
          output.outputKind !== 'status-application' &&
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
      const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
      const modifierDetails = statModifierDetailLines(modifier, context, options);
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
        explanation: `${provider.name}'s ${modifier.abilityName} can increase ${recipient.name}'s ${statLabel(statId)}, which supports ${abilityOutputSummary(matchedOutputs)}.`,
        requirements,
        matchedFacts: [
          ...modifierDetails,
          ...matchedOutputs.map((output) => `${output.abilityName} scales with ${statLabel(statId)}.`),
        ],
        effects: [`${statLabel(statId)} support for ${abilityOutputSummary(matchedOutputs)}`, ...modifierDetails],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
        assumptions: [
          'Exact stat-to-effect conversion formula is unknown.',
        ],
        unresolvedQuestions: [
          'Final value and stacking order are not calculated.',
        ],
        futureOrConditional: capabilityFutureOrConditional(modifier, options) || modifier.conditional,
      }));
    }
  }
  return traces;
}

function targetCandidatePositions(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifier: ModifierCapability,
  providerPosition: FormationPosition | null,
): FormationPosition[] {
  if (modifier.targetSelector.selection === 'self') {
    return providerPosition ? [providerPosition] : [];
  }
  const eligible = FORMATION_POSITIONS.filter((position) => {
    const dragonId = formation[position];
    if (!dragonId || (dragonId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
      return false;
    }
    return targetRequirement(modifier, providerPosition, position).satisfied !== false;
  });
  if (modifier.targetSelector.selectionResource === 'current-troops') {
    return eligible;
  }
  if (modifier.targetSelector.selection !== 'highest-stat' || !modifier.targetSelector.selectionStat) {
    return eligible;
  }

  const statId = modifier.targetSelector.selectionStat;
  const candidateValues = eligible.map((position) => ({
    position,
    value: observedStatValue(dragons, formation[position]!, statId),
  }));
  if (candidateValues.some((candidate) => candidate.value === null)) {
    return eligible;
  }
  const max = Math.max(...candidateValues.map((candidate) => candidate.value ?? Number.NEGATIVE_INFINITY));
  return candidateValues.filter((candidate) => candidate.value === max).map((candidate) => candidate.position);
}

function allEligibleTargetCandidatePositions(
  formation: FormationAnalysisInput,
  modifier: ModifierCapability,
  providerPosition: FormationPosition | null,
): FormationPosition[] {
  if (modifier.targetSelector.selection === 'self') {
    return providerPosition ? [providerPosition] : [];
  }
  return FORMATION_POSITIONS.filter((position) => {
    const dragonId = formation[position];
    if (!dragonId || (dragonId === modifier.dragonId && modifier.targetSelector.includesCaster === false)) {
      return false;
    }
    return targetRequirement(modifier, providerPosition, position).satisfied !== false;
  });
}

function recipientPositionsForModifier(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifier: ModifierCapability,
  providerPosition: FormationPosition | null,
): FormationPosition[] {
  return targetCandidatePositions(formation, dragons, modifier, providerPosition);
}

function statModifierDetailLines(
  modifier: ModifierCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect } | null,
  options: CapabilityOptions,
): string[] {
  if (!context) {
    return [];
  }
  const effectiveLevel = modifier.rankedValues.length > 0
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options))
    : null;
  const stat = statIdFromText(modifier.label);
  return [
    scheduleTimingDetail(context.schedule),
    stat ? `${statLabel(stat)} +${modifierDisplayValue(modifier, options)}${effectiveLevel ? ` at effective Habit Level ${effectiveLevel}` : ''}.` : null,
    enhancementDetail(context.effect),
    durationDetail(context.effect),
    rankedProgressionDetail(context.effect),
    outputTargetingDetail({
      channel: modifier.channel,
      targetSide: modifier.targetSelector.side,
      targetCount: modifier.targetSelector.count,
    } as OutputCapability, context.effect),
  ].filter((detail): detail is string => Boolean(detail));
}

function groupDirectStatSupportTraces(traces: SynergyTrace[], dragons: Dragon[]): SynergyTrace[] {
  const byAbility = new Map<string, SynergyTrace[]>();
  for (const trace of traces) {
    const key = [
      trace.sourceDragonId,
      trace.sourceAbilityId ?? '',
      trace.targetSelectorSummary ?? '',
    ].join('|');
    byAbility.set(key, [...(byAbility.get(key) ?? []), trace]);
  }

  const grouped: SynergyTrace[] = [];
  for (const abilityTraces of byAbility.values()) {
    const recipientIds = uniqueSorted(
      abilityTraces.map((trace) => trace.recipientDragonId).filter((dragonId): dragonId is string => Boolean(dragonId)),
    );
    const isOneTarget = abilityTraces.some((trace) => /; 1 target;/.test(trace.targetSelectorSummary ?? ''));
    if (isOneTarget && recipientIds.length > 1) {
      grouped.push(groupDirectStatTargetSelection(abilityTraces, recipientIds, dragons));
      continue;
    }

    const byRecipient = new Map<string, SynergyTrace[]>();
    for (const trace of abilityTraces) {
      const key = trace.recipientDragonId ?? trace.id;
      byRecipient.set(key, [...(byRecipient.get(key) ?? []), trace]);
    }
    for (const recipientTraces of byRecipient.values()) {
      grouped.push(groupDirectStatRecipientTraces(recipientTraces, dragons));
    }
  }
  return grouped;
}

function groupDirectStatTargetSelection(
  traces: SynergyTrace[],
  recipientIds: string[],
  dragons: Dragon[],
): SynergyTrace {
  const first = traces[0]!;
  const sourceName = dragonById(dragons, first.sourceDragonId)?.name ?? first.sourceDragonId;
  const abilityName = abilityNameForTrace(dragons, first) ?? 'Ability';
  const recipientNames = recipientIds.map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId);
  const statNames = groupedStatNames(traces);
  const isLightning = first.sourceAbilityId === 'malachite-lightning-strike';
  const selectionStat = selectionStatFromTrace(first);
  const explanation = isLightning
    ? `Lightning Strike can target one adjacent ally. Eligible recipients: ${joinEnglishList(recipientNames)}. The selected recipient is not guaranteed.`
    : selectionStat
      ? `${sourceName}'s ${abilityName} can increase ${joinEnglishList(statNames)} for one ally selected by highest ${statLabel(selectionStat)}. Eligible recipients: ${joinEnglishList(recipientNames)}. The selected recipient is not guaranteed.`
      : `${sourceName}'s ${abilityName} can increase ${joinEnglishList(statNames)} for one eligible ally. Eligible recipients: ${joinEnglishList(recipientNames)}. The selected recipient is not guaranteed.`;
  return {
    ...first,
    id: `direct-stat-target-selection-${first.sourceAbilityId ?? first.sourceDragonId}`,
    recipientDragonId: null,
    recipientAbilityId: null,
    status: aggregateStatus(traces.map((trace) => trace.status)),
    title: 'Stat Target Selection',
    explanation,
    requirements: dedupeRequirements(traces.flatMap((trace) => trace.requirements)),
    matchedFacts: uniqueSorted(traces.flatMap((trace) => trace.matchedFacts)),
    effects: uniqueSorted(traces.flatMap((trace) => trace.effects)),
    conflicts: [],
    assumptions: uniqueSorted([
      ...traces.flatMap((trace) => trace.assumptions),
      'Target count is one, so eligible recipients compete for the same activation.',
    ]),
    unresolvedQuestions: uniqueSorted(traces.flatMap((trace) => trace.unresolvedQuestions)),
    recipientEvidenceIds: uniqueSorted(traces.flatMap((trace) => trace.recipientEvidenceIds)),
    modifierCapabilityId: null,
    modifierCapabilityIds: uniqueSorted(traces.flatMap((trace) => trace.modifierCapabilityIds ?? [])),
    interactionScope: 'targeting-fact',
    targetSelectionGroup: {
      targetCount: 1,
      eligibleRecipientDragonIds: recipientIds,
      selectionUncertain: true,
      selection: selectionStat ? 'highest-stat' : 'one-eligible-adjacent',
      selectionStat,
      candidateStats: selectionStat
        ? recipientIds.map((dragonId) => ({
            dragonId,
            statId: selectionStat,
            value: observedStatValue(dragons, dragonId, selectionStat),
          }))
        : undefined,
    },
  };
}

function groupDirectStatRecipientTraces(traces: SynergyTrace[], dragons: Dragon[]): SynergyTrace {
  if (traces.length === 1) {
    return traces[0]!;
  }
  const first = traces[0]!;
  const source = dragonById(dragons, first.sourceDragonId);
  const recipient = first.recipientDragonId ? dragonById(dragons, first.recipientDragonId) : null;
  const abilityName = abilityNameForTrace(dragons, first) ?? 'Ability';
  const valueText = groupedStatValueText(traces);
  return {
    ...first,
    id: `direct-stat-support-${first.sourceAbilityId ?? first.sourceDragonId}-${first.recipientDragonId ?? 'target'}-${valueText.stats.join('-').toLowerCase()}`,
    title: 'Stat Support',
    explanation: `${source?.name ?? first.sourceDragonId}'s ${abilityName} ${first.status === 'active' ? 'increases' : 'can increase'} ${recipient?.name ?? first.recipientDragonId ?? 'the selected ally'}'s ${valueText.text}.`,
    requirements: dedupeRequirements(traces.flatMap((trace) => trace.requirements)),
    matchedFacts: uniqueSorted(traces.flatMap((trace) => trace.matchedFacts)),
    effects: uniqueSorted(traces.flatMap((trace) => trace.effects)),
    conflicts: uniqueSorted(traces.flatMap((trace) => trace.conflicts)),
    assumptions: uniqueSorted(traces.flatMap((trace) => trace.assumptions)),
    unresolvedQuestions: uniqueSorted(traces.flatMap((trace) => trace.unresolvedQuestions)),
    modifierCapabilityId: null,
    modifierCapabilityIds: uniqueSorted(traces.flatMap((trace) => trace.modifierCapabilityIds ?? [])),
  };
}

function groupedStatNames(traces: SynergyTrace[]): string[] {
  const stats = new Set<string>();
  for (const trace of traces) {
    for (const effect of [...trace.effects, ...trace.matchedFacts, trace.explanation]) {
      const entry = rawStatEffectEntry(effect);
      if (entry) {
        stats.add(entry.stat);
      }
    }
  }
  return uniqueOrdered([...stats]);
}

function groupedStatValueText(traces: SynergyTrace[]): { stats: string[]; text: string } {
  const entriesByKey = new Map<string, { stat: string; value: string }>();
  for (const trace of traces) {
    for (const effect of [...trace.effects, ...trace.matchedFacts, trace.explanation]) {
      const entry = rawStatEffectEntry(effect);
      if (entry) {
        entriesByKey.set(`${entry.stat}|${entry.value}`, entry);
      }
    }
  }
  const entries = [...entriesByKey.values()];
  const stats = uniqueOrdered(entries.map((entry) => entry.stat));
  const values = uniqueOrdered(entries.map((entry) => entry.value));
  if (entries.length === 0) {
    return { stats, text: joinEnglishList(stats) };
  }
  if (values.length === 1) {
    return { stats, text: `${joinEnglishList(stats)} by ${values[0]}` };
  }
  return {
    stats,
    text: joinEnglishList(entries.map((entry) => `${entry.stat} by ${entry.value}`)),
  };
}

function abilityNameForTrace(dragons: Dragon[], trace: SynergyTrace): string | null {
  const source = dragonById(dragons, trace.sourceDragonId);
  return source ? allAbilities(source).find((ability) => ability.id === trace.sourceAbilityId)?.name ?? null : null;
}

function selectionStatFromTrace(trace: SynergyTrace): DragonStatId | null {
  const summary = trace.targetSelectorSummary ?? '';
  if (/highest-stat.*selection stat strength|highest Strength/i.test(summary)) {
    return 'strength';
  }
  if (/highest-stat.*selection stat intelligence|highest Intelligence/i.test(summary)) {
    return 'intelligence';
  }
  if (/highest-stat.*selection stat instinct|highest Instinct/i.test(summary)) {
    return 'instinct';
  }
  if (/highest-stat.*selection stat initiative|highest Initiative/i.test(summary)) {
    return 'initiative';
  }
  return null;
}

function observedStatValue(dragons: Dragon[], dragonId: string, statId: DragonStatId): number | null {
  const dragon = dragonById(dragons, dragonId);
  const canonical = dragon?.stats[statId] ?? null;
  if (canonical !== null) {
    return canonical;
  }
  return dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragonId)?.combatStats[statId] ?? null;
}

function targetSelectionFacts(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifier: ModifierCapability,
): string[] {
  if (modifier.targetSelector.selection !== 'highest-stat' || !modifier.targetSelector.selectionStat) {
    return [];
  }
  const statId = modifier.targetSelector.selectionStat;
  const providerPosition = positionOf(formation, modifier.dragonId);
  const eligiblePositions = allEligibleTargetCandidatePositions(formation, modifier, providerPosition);
  const facts = eligiblePositions
    .map((position) => formation[position])
    .filter((dragonId): dragonId is string => Boolean(dragonId && dragonId !== modifier.dragonId))
    .map((dragonId) => `${dragonById(dragons, dragonId)?.name ?? dragonId} ${statLabel(statId)}: ${observedStatValue(dragons, dragonId, statId) ?? 'unknown'}.`);
  const casterId = providerPosition ? formation[providerPosition] : null;
  if (casterId && eligiblePositions.includes(providerPosition!)) {
    facts.push(`${dragonById(dragons, casterId)?.name ?? casterId} ${statLabel(statId)}: ${observedStatValue(dragons, casterId, statId) ?? 'unknown'}.`);
  }
  return uniqueOrdered(facts);
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
    (capability) =>
      capability.role === 'enemy-debuff' &&
      capability.channel === 'stat' &&
      capability.operation === 'decrease' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const statId = statIdFromText(modifier.label);
    if (!statId) {
      continue;
    }
    const mitigationChannel = mitigationChannelForStat(statId);
    if (!mitigationChannel) {
      continue;
    }
    const providerPosition = positionOf(formation, modifier.dragonId);
    if (!providerPosition) {
      continue;
    }
    for (const recipientId of Object.values(formation).filter(Boolean) as string[]) {
      const directlyMatchedOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          !isPeriodicOutputCapability(output) &&
          output.channel === mitigationChannel &&
          outputCapabilityVisible(output, options) &&
          isDamageOutputCapability(output) &&
          mitigationSourceScopeCompatible(modifier.sourceScope, output.sourceScope) &&
          output.dependencies.some((dependency) => dependency.type === 'mitigated-by-target-stat' && dependency.statId === statId),
      );
      const matchedOutputs = [
        ...directlyMatchedOutputs,
        ...outputs.filter(
          (output) =>
            output.dragonId === recipientId &&
            isPeriodicOutputCapability(output) &&
            directlyMatchedOutputs.length > 0 &&
            output.channel === mitigationChannel &&
            outputCapabilityVisible(output, options) &&
            mitigationSourceScopeCompatible(modifier.sourceScope, output.sourceScope) &&
            output.dependencies.some((dependency) => dependency.type === 'mitigated-by-target-stat' && dependency.statId === statId),
        ),
      ];
      if (matchedOutputs.length === 0) {
        continue;
      }
    const provider = dragonById(dragons, modifier.dragonId);
    const recipient = dragonById(dragons, recipientId);
    if (!provider || !recipient) {
      continue;
    }
    const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
    const sourceTimingFacts = context
      ? uniqueOrdered([
        scheduleTimingDetail(context.schedule),
        enhancementDetail(context.effect),
        durationDetail(context.effect),
        durationLine(modifier),
      ].filter((fact): fact is string => Boolean(fact)))
      : [];
      const hasUnverifiedScaling = hasUnverifiedStructuredStatScaling(context?.effect ?? null);
      const completeCoverage = enemyCoverageIsComplete(modifier);
      const selectionUncertain = enemyTargetSelectionIsUncertain(modifier);
      const requirements = [
        ...providerRequirementTraces(modifier, formation, dragons, options),
        ...matchedOutputs.flatMap((output) => outputRequirementTraces(output, options)),
      ];
      const sourceScopeResults = matchedOutputs.map((output) =>
        capabilityMatch(
          modifier,
          output,
          [mitigationSourceScopeRequirement(modifier, output)],
          options,
          { applySourceScope: modifier.sourceScope !== 'unknown' },
        ),
      );
      const trace = makeDependencyTrace({
        id: `enemy-mitigation-${modifier.id}-${recipientId}-${statId}`,
        matchKind: 'enemy-mitigation-reduction',
        ruleId: 'enemy-mitigation-reduction',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: matchedOutputs[0]?.abilityId ?? null,
        channel: mitigationChannel,
        title: `${channelLabel(mitigationChannel)} Mitigation Reduction`,
        explanation: `${provider.name}'s ${modifier.abilityName} can reduce enemy ${statLabel(statId)}. Enemy ${statLabel(statId)} reduction is -${formatTypedModifierValue(modifier)}. ${recipient.name}'s ${channelLabel(mitigationChannel)} outputs are mitigated by that stat.${sourceTimingFacts.length > 0 ? ` ${sourceTimingFacts.join(' ')}` : ''}`,
        requirements,
        matchedFacts: [
          ...sourceTimingFacts,
          ...enemySelectorFacts(provider, modifier, completeCoverage),
          ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
          `Source scope: ${modifier.sourceScope}.`,
          ...matchedOutputs.map((output) => `${output.abilityName} is mitigated by target ${statLabel(statId)}.`),
          ...sourceScopeResults.map((match) => `Source-scope compatibility: ${match.sourceScopeCompatible ? 'compatible' : 'not compatible'} for ${match.outputCapabilityId}.`),
        ],
        effects: [
          ...sourceTimingFacts,
          ...enemySelectorFacts(provider, modifier, completeCoverage),
          `Enemy ${statLabel(statId)} reduction may improve ${channelLabel(mitigationChannel)} outputs: ${matchedOutputs.map((output) => output.label).join(', ')}. ${scaledReductionValueSentence(context, statLabel(statId), `-${formatTypedModifierValue(modifier)}`)}`,
          ...verifiedReductionTargetValueLines(context, modifier, statLabel(statId), `-${formatTypedModifierValue(modifier)}`),
          ...scaledReductionUnresolvedLines(context, statLabel(statId)),
          modifier.sourceScope === 'non-basic-attacks' ? `Applies to non-Basic ${channelLabel(mitigationChannel)} only.` : `Applies to all qualifying ${channelLabel(mitigationChannel)} sources.`,
        ].filter((effect): effect is string => Boolean(effect)),
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
        assumptions: enemyMitigationAssumptions(modifier, completeCoverage, selectionUncertain),
        unresolvedQuestions: enemyMitigationUnresolvedQuestions(modifier, completeCoverage, selectionUncertain),
        futureOrConditional: selectionUncertain || !completeCoverage,
        modifier,
        exactResultUnknownReason: hasUnverifiedScaling
          ? `Exact final ${channelLabel(mitigationChannel)} mitigation interaction cannot be calculated because affected-enemy overlap with the ${channelLabel(mitigationChannel)} target and the final ${structuredScalingStatLabel(context?.effect ?? null)} scaling or mitigation formula are unresolved.`
          : `Exact final ${channelLabel(mitigationChannel)} mitigation interaction cannot be calculated because affected-enemy overlap with the ${channelLabel(mitigationChannel)} target and the final mitigation formula are unresolved.`,
      });
      traces.push({
        ...trace,
        modifierRole: null,
        matchedOutputCapabilityIds: matchedOutputs.map((output) => output.id),
        sourceScopeResults,
      });
    }
  }
  return traces;
}

function mitigationChannelForStat(statId: DragonStatId): EffectChannel | null {
  switch (statId) {
    case 'instinct':
      return 'physical-damage';
    case 'intelligence':
      return 'tactical-damage';
    case 'initiative':
      return 'fire-damage';
    case 'strength':
      return null;
  }
}

function analyzeEnemyDamageDealtReductions(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'enemy-debuff' &&
      capability.direction === 'dealt' &&
      capability.operation === 'decrease' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const statId = statIdFromText(modifier.label);
    const reductionChannel = enemyDamageDealtChannelForModifier(modifier, statId);
    if (!reductionChannel) {
      continue;
    }
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
    const sourceTimingFacts = context
      ? uniqueOrdered([
        scheduleTimingDetail(context.schedule),
        enhancementDetail(context.effect),
        durationDetail(context.effect),
        durationLine(modifier),
      ].filter((fact): fact is string => Boolean(fact)))
      : [];
    const completeCoverage = enemyCoverageIsComplete(modifier);
    const selectionUncertain = enemyTargetSelectionIsUncertain(modifier);
    const requirements = providerRequirementTraces(modifier, formation, dragons, options);
    traces.push({
      id: `enemy-damage-dealt-reduction-${modifier.id}`,
      ruleId: 'enemy-damage-dealt-reduction',
      status: statusFromRequirements(requirements, capabilityFutureOrConditional(modifier, options) || modifier.conditional),
      confidence: modifier.confidence,
      sourceDragonId: provider.id,
      sourceAbilityId: modifier.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: enemyDamageDealtReductionTitle(reductionChannel, modifier, statId),
      explanation: `${enemyDamageDealtReductionExplanation(provider, modifier, statId, reductionChannel, completeCoverage, options)}${sourceTimingFacts.length > 0 ? ` ${sourceTimingFacts.join(' ')}` : ''}`,
      requirements,
      matchedFacts: [
        ...sourceTimingFacts,
        ...enemySelectorFacts(provider, modifier, completeCoverage),
        `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
        ...(modifier.targetSelector.sharedSelectionGroupId ? [`Shared selected-target group: ${modifier.targetSelector.sharedSelectionGroupId}.`] : []),
        ...independentHighestStatSelectorFacts(provider, modifier),
        ...enemyDamageDealtReductionDetailFacts(modifier, reductionChannel),
        ...modifier.conditions.map((condition) => condition.description),
        ...(modifier.activationGroupId ? [`Shared activation group: ${modifier.activationGroupId}.`] : []),
        ...activationChanceFacts(modifier, options),
      ].filter((fact): fact is string => Boolean(fact)),
      effects: [
        ...sourceTimingFacts,
        ...enemySelectorFacts(provider, modifier, completeCoverage),
        statId ? scaledReductionValueSentence(
          context,
          statLabel(statId),
          `${modifier.operation === 'decrease' ? '-' : '+'}${modifierDisplayValue(modifier, options)}${modifier.rankedValues.length > 0 ? ` at effective Habit Level ${options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options)}` : ''}`,
        ) : modifierEffectValueLine(modifier, options),
        ...(statId ? verifiedReductionTargetValueLines(
          context,
          modifier,
          statLabel(statId),
          `${modifier.operation === 'decrease' ? '-' : '+'}${modifierDisplayValue(modifier, options)}`,
        ) : []),
        ...(statId ? scaledReductionUnresolvedLines(context, statLabel(statId)) : []),
        statId && reductionChannel !== 'stat' ? `Enemy ${channelLabel(reductionChannel)} Dealt reduction follows from enemy ${statLabel(statId)} reduction.` : null,
        ...enemyDamageDealtReductionDetailFacts(modifier, reductionChannel),
      ].filter((effect): effect is string => Boolean(effect)),
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: enemyDamageDealtAssumptions(modifier, completeCoverage, selectionUncertain),
      unresolvedQuestions: enemyDamageDealtUnresolvedQuestions(modifier, completeCoverage, selectionUncertain),
      sourceEvidenceIds: modifier.evidenceIds,
      recipientEvidenceIds: [],
      combatLogConfirmed: modifier.combatLogConfirmed,
      exactResultKnown: false,
      exactResultUnknownReason: enemyDamageDealtExactUnknownReason(modifier, completeCoverage, context),
      matchKind: 'enemy-damage-dealt-reduction',
      channel: reductionChannel,
      modifierRole: modifier.role,
      targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
      modifierSelfOnly: false,
      availabilityContext: modifier.availability.reportLabel,
      modifierCapabilityId: modifier.id,
      modifierCapabilityIds: [modifier.id],
      interactionScope: 'enemy-side',
    });
  }
  return traces;
}

function enemyDamageDealtChannelForModifier(modifier: ModifierCapability, statId: DragonStatId | null | undefined): EffectChannel | null {
  if (modifier.channel !== 'stat') {
    return modifier.channel;
  }
  if (!statId) {
    return null;
  }
  switch (statId) {
    case 'strength':
      return 'physical-damage';
    case 'instinct':
      return 'tactical-damage';
    case 'intelligence':
      return 'fire-damage';
    case 'initiative':
      return 'stat';
  }
}

function enemyDamageDealtReductionTitle(channel: EffectChannel, modifier: ModifierCapability, statId: DragonStatId | null | undefined): string {
  if (channel === 'stat' && statId) {
    return `Enemy ${statLabel(statId)} reduction`;
  }
  const scope = modifier.sourceScope === 'non-basic-attacks' ? 'non-Basic ' : '';
  if (channel === 'recovery') {
    return 'Enemy Recovery Received reduction';
  }
  if (channel === 'damage-dealt') {
    return `${scope}Damage Dealt Enemy Reduction`;
  }
  return `Enemy ${scope}${channelLabel(channel)} Dealt reduction`;
}

function enemyDamageDealtReductionExplanation(
  provider: Dragon,
  modifier: ModifierCapability,
  statId: DragonStatId | null | undefined,
  reductionChannel: EffectChannel,
  completeCoverage: boolean,
  options: CapabilityOptions,
): string {
  const stat = statId
    ? reductionChannel === 'stat'
      ? statLabel(statId)
      : `${statLabel(statId)}, which reduces ${channelLabel(reductionChannel)} Dealt`
      : reductionChannel === 'damage-dealt'
      ? channelLabel(reductionChannel)
      : `${channelLabel(reductionChannel)} Dealt`;
  const baseValue = `-${modifierDisplayValue(modifier, options)}`;
  const reductionSentence = statId
    ? `Base Enemy ${statLabel(statId)} reduction ${baseValue}. Final scaled Enemy ${statLabel(statId)} reduction remains unresolved.`
    : `Enemy ${stat} reduction is ${baseValue}.`;
  const targetSentence = completeCoverage
    ? `All three enemy slots are covered by ${provider.name}'s ${modifier.abilityName}.`
    : modifier.targetSelector.selection === 'all-matching-condition'
      ? 'All matching enemies are affected as enemy-side metadata rather than named friendly recipients.'
      : 'Enemy target selection is tracked as an enemy-side candidate group, not a named friendly recipient.';
  return `${provider.name}'s ${modifier.abilityName} can reduce enemy ${stat}. ${reductionSentence} ${targetSentence}`;
}

function analyzePersistentMarkedTargets(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  const selectedIds = selectedFormationDragonIds(formation);
  for (const marker of statusOutputs.filter((capability) =>
    capability.targetSide === 'enemy' &&
    statusCapabilityVisible(capability, options),
  )) {
    const provider = dragonById(dragons, marker.dragonId);
    const providerPosition = positionOf(formation, marker.dragonId);
    if (!provider || !providerPosition || !selectedIds.has(marker.dragonId)) {
      continue;
    }
    const context = sourceEffectContext(provider, marker.abilityId, marker.sourceEffectId);
    if (
      !context?.effect.targetSelection?.references.some((reference) => reference.kind === 'persistent-selected-target') ||
      context.effect.stack?.maximumStacks !== 1
    ) {
      continue;
    }
    const relatedAbilityNames = persistentStatusReferencingAbilityNames(provider, marker.statusId, marker.abilityName);
    if (relatedAbilityNames.length === 0) {
      continue;
    }
    const requirements = statusOutputRequirementTraces(marker, provider, dragons, options);
    const statusName = statusLabel(marker.statusId);
    const relatedList = joinEnglishList(relatedAbilityNames);
    const establishmentFacts = persistentStatusEstablishmentFacts(context.schedule, marker, statusName, options);
    traces.push(makeDependencyTrace({
      id: `persistent-marked-target-${marker.dragonId}-${marker.statusId}`,
      matchKind: 'status-condition-enablement',
      ruleId: 'persistent-marked-target-reference',
      source: provider,
      sourceAbilityId: marker.abilityId,
      recipient: provider,
      recipientAbilityId: marker.abilityId,
      channel: 'status',
      title: `${statusName} persistent target reference`,
      explanation: `Persistent marked target: ${provider.name}'s current ${statusName}. ${marker.abilityName} checks ${scheduleTimingAdverb(context.schedule)} and establishes ${statusName} only when none currently exists. ${relatedList} refer to that same marked enemy. Current reference identity and lifecycle behavior are unresolved.`,
      requirements,
      matchedFacts: [
        `Persistent marked target: ${provider.name}'s current ${statusName}.`,
        ...establishmentFacts,
        `${relatedList} refer to that same marked enemy.`,
        'Current referenced enemy identity is unresolved.',
        ...targetReferenceFacts(context.effect),
      ],
      effects: [
        `Status identity: ${marker.statusId}.`,
        `Target reference ID: ${context.effect.targetSelection?.sharedSelectionGroupId ?? marker.targetSelector.sharedSelectionGroupId ?? 'unknown'}.`,
        'Actual enemy identity: unresolved.',
      ],
      sourceEvidenceIds: marker.evidenceIds,
      recipientEvidenceIds: [],
      assumptions: ['Downstream current-target conditions are tracked on dependent mechanics and are not assumed satisfied by the persistent reference itself.'],
      unresolvedQuestions: [
        `Whether a current ${statusName} already exists is unresolved.`,
        `${statusName} establishment success is unresolved.`,
        'Marked enemy identity is unresolved.',
        'Marked-target duration, removal, transfer, and replacement behavior remain unresolved unless explicitly verified by source data.',
      ],
      exactResultUnknownReason: `Exact current ${statusName} reference cannot be calculated because current marked-target existence, establishment success, marked enemy identity, duration, removal, transfer, and replacement behavior are unresolved.`,
      futureOrConditional: true,
    }));
  }
  return traces;
}

function scaledReductionValueSentence(
  context: { effect: AbilityEffect } | null,
  statLabelText: string,
  valueText: string,
): string {
  return hasUnverifiedStructuredStatScaling(context?.effect ?? null)
    ? `Base Enemy ${statLabelText} reduction ${valueText}.`
    : `Enemy ${statLabelText} ${valueText}.`;
}

function scaledReductionUnresolvedLines(
  context: { effect: AbilityEffect } | null,
  statLabelText: string,
): string[] {
  if (!hasUnverifiedStructuredStatScaling(context?.effect ?? null)) {
    return [];
  }
  return [
    `Final scaled Enemy ${statLabelText} reduction is unresolved.`,
  ];
}

function verifiedReductionTargetValueLines(
  context: { effect: AbilityEffect } | null,
  modifier: ModifierCapability,
  statLabelText: string,
  valueText: string,
): string[] {
  const targetCount = modifier.targetSelector.count ?? (enemyCoverageIsComplete(modifier) ? 3 : null);
  if (hasUnverifiedStructuredStatScaling(context?.effect ?? null) || targetCount === null) {
    return [];
  }
  return [`Enemy ${statLabelText} ${valueText} on ${targetCount} enemy targets.`];
}

function hasUnverifiedStructuredStatScaling(effect: AbilityEffect | null): boolean {
  return effect?.scaling.some((item) => !/enhanced by/i.test(item) && Boolean(statIdFromText(item))) === true;
}

function structuredScalingStatLabel(effect: AbilityEffect | null): string {
  const labels = uniqueOrdered((effect?.scaling ?? [])
    .filter((item) => !/enhanced by/i.test(item))
    .map((item) => statIdFromText(item))
    .filter((stat): stat is DragonStatId => Boolean(stat))
    .map(statLabel));
  return labels.length > 0 ? joinEnglishList(labels) : 'stat';
}

function persistentStatusEstablishmentFacts(
  schedule: AbilitySchedule,
  marker: StatusOutputCapability,
  statusName: string,
  options: CapabilityOptions,
): string[] {
  const level = marker.requiredHabitLevel !== null
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(marker, options))
    : null;
  const chance = marker.chanceFixed !== null && marker.chanceFixed !== undefined
    ? { value: marker.chanceFixed, unit: 'percent' as const }
    : rankedValueForHabitLevel(marker.chanceByHabitLevel, level);
  return [
    scheduleTimingDetail(schedule),
    `${marker.abilityName} establishes ${statusName} only when none currently exists.`,
    ...marker.conditions.map((condition) => `Establishment condition: ${condition.description}`),
    chance ? `Establishment chance: ${formatValue(chance.value, chance.unit)}${level ? ` at effective Habit Level ${level}` : ''}.` : null,
  ].filter((fact): fact is string => Boolean(fact));
}

function analyzeScheduleOverrideTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const dragon of dragons.filter((candidate) => candidate.command && positionOf(formation, candidate.id))) {
    const command = dragon.command!;
    for (const augmentation of command.augmentations) {
      const sourceAbility = dragon.habits.find((habit) => habit.id === augmentation.sourceAbilityId);
      const starRank = options.roster?.[dragon.id]?.starRank ?? null;
      if (starRank === null || starRank < augmentation.minimumDragonStarRank || !sourceAbility) {
        continue;
      }
      for (const override of augmentation.scheduleOverrides ?? []) {
        const targetSchedule = command.schedules.find((schedule) => schedule.id === override.targetScheduleId);
        const targetEffect = targetSchedule?.effects.flatMap(derivableEffects).find((effect) => effect.id === override.targetEffectId);
        const replacementSchedule = override.replacementSchedule;
        const replacementEffect = override.replacementEffect ?? targetEffect ?? null;
        const baseChance = targetSchedule?.activationRoll?.chanceFixed ?? targetSchedule?.triggerChanceFixed ?? null;
        const replacementChance =
          replacementSchedule?.activationRoll?.chanceFixed ??
          rankedValueForHabitLevel(replacementSchedule?.activationRoll?.chanceByHabitLevel ?? [], 1)?.value ??
          replacementSchedule?.triggerChanceFixed ??
          rankedValueForHabitLevel(replacementSchedule?.triggerChanceByHabitLevel ?? [], 1)?.value ??
          null;
        const baseScheduleText = schedulePhrase(targetSchedule) ?? 'unknown schedule';
        const replacementScheduleText = schedulePhrase(replacementSchedule) ?? baseScheduleText;
        const baseStatus = effectStatusLabel(targetEffect, 'base effect');
        const replacementStatus = effectStatusLabel(replacementEffect, baseStatus);
        const retained = [
          replacementEffect?.durationRounds ? `duration ${replacementEffect.durationRounds} rounds` : null,
          replacementEffect?.target ? `target ${replacementEffect.target}` : null,
        ].filter((value): value is string => Boolean(value));
        const retainedSummary = replacementEffect?.durationRounds || replacementEffect?.target
          ? `${replacementStatus} still targets ${replacementEffect?.target ?? 'the original target'}${replacementEffect?.durationRounds ? ` and lasts ${replacementEffect.durationRounds} rounds` : ''}.`
          : null;
        const requirements = availabilityRequirements({
          dragonId: dragon.id,
          abilityId: sourceAbility.id,
          dragonName: dragon.name,
          abilityName: sourceAbility.name,
          unlockStarRank: sourceAbility.unlockStarRank,
          minimumDragonLevel: sourceAbility.minimumDragonLevel,
          requiredHabitLevel: 1,
          evidenceIds: sourceAbility.evidenceIds,
          sourceKind: abilitySourceKind(dragons, dragon.id, sourceAbility.id),
        }, options);
        traces.push(makeDependencyTrace({
          id: `schedule-override-${dragon.id}-${override.id}`,
          matchKind: 'status-condition-enablement',
          ruleId: 'schedule-override',
          source: dragon,
          sourceAbilityId: command.id,
          recipient: dragon,
          recipientAbilityId: command.id,
          channel: 'status',
          title: `${sourceAbility.name} schedule override`,
          explanation: normalizeSentencePunctuation(`${sourceAbility.name} replaces ${command.name}'s ${replacementStatus} roll on ${replacementScheduleText}. At effective ${sourceAbility.name} Habit Level 1, the replacement chance is ${replacementChance ?? 'unknown'}%; the original ${baseChance ?? 'unknown'}% roll is suppressed. ${retainedSummary ?? ''}`),
          requirements,
          matchedFacts: [
            `Base source ability: ${command.name}.`,
            `Override source ability: ${sourceAbility.name}.`,
            `Override operation: ${override.operation}.`,
            `Effective status identity: ${replacementStatus}.`,
            `Effective schedule: ${replacementScheduleText}.`,
            `Effective chance at Habit Level 1: ${replacementChance ?? 'unknown'}%.`,
            `Base chance: ${baseChance ?? 'unknown'}%.`,
            `The original ${baseChance ?? 'unknown'}% ${baseStatus} roll is suppressed.`,
            targetSchedule?.roundSelector?.kind === 'odd' && replacementSchedule?.rounds.length === 1
              ? `Other odd-numbered rounds retain the base ${baseChance ?? 'unknown'}% chance.`
              : null,
            retained.length > 0 ? `Retained properties: ${retained.join(', ')}.` : null,
            `Schedule override ID: ${override.id}.`,
            override.description,
          ].filter((fact): fact is string => Boolean(fact)),
          effects: [
            `Effective capability: ${replacementStatus} on ${replacementScheduleText} at ${replacementChance ?? 'unknown'}% chance.`,
            `Original ${baseStatus} roll is not emitted as an additional attempt.`,
          ],
          sourceEvidenceIds: override.evidenceIds,
          recipientEvidenceIds: [],
          assumptions: [`The override relationship is deterministic once ${sourceAbility.name} is active; activation of the resulting ${replacementStatus} attempt remains chance-based.`],
          unresolvedQuestions: [],
          futureOrConditional: false,
        }));
      }
    }
  }
  return traces;
}

function persistentStatusReferencingAbilityNames(
  dragon: Dragon,
  statusId: string,
  establishingAbilityName: string,
): string[] {
  return uniqueOrdered(allAbilities(dragon)
    .filter((ability) => ability.name !== establishingAbilityName)
    .filter((ability) =>
      ability.schedules.some((schedule) =>
        schedule.conditions?.some((condition) => condition.statusId === statusId) ||
        schedule.effects.flatMap(derivableEffects).some((effect) =>
          effect.conditions?.some((condition) => condition.statusId === statusId) ||
          effect.conditionalMultipliers?.some((multiplier) => multiplier.condition.statusId === statusId) ||
          effect.targetSelection?.references.some((reference) => reference.kind === 'persistent-selected-target'),
        ),
      ),
    )
    .map((ability) => ability.name));
}

function analyzeSelfStatusOutputs(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const output of statusOutputs.filter((capability) =>
    capability.targetSide === 'self' &&
    (
      statusMatchesCategory(capability.statusId, 'control') ||
      Boolean(extraActionSemanticForStatus(capability.statusId)) ||
      capability.conditions.some((condition) => condition.statusId || condition.kind === 'target-above-troop-capacity-threshold')
    ) &&
    statusCapabilityVisible(capability, options),
  )) {
    const provider = dragonById(dragons, output.dragonId);
    const providerPosition = positionOf(formation, output.dragonId);
    if (!provider || !providerPosition) {
      continue;
    }
    const requirements = statusOutputRequirementTraces(output, provider, dragons, options);
    const context = sourceEffectContext(provider, output.abilityId, output.sourceEffectId);
    const statusName = statusLabel(output.statusId);
    const isControlStatus = statusMatchesCategory(output.statusId, 'control');
    const isExtraActionStatus = Boolean(extraActionSemanticForStatus(output.statusId));
    if (
      context?.effect.stack &&
      !isControlStatus &&
      !isExtraActionStatus
    ) {
      continue;
    }
    const supplier = statusSupplierFacts(output, context, options);
    const timing = context ? scheduleTimingDetail(context.schedule) : null;
    const duration = context ? durationDetail(context.effect) : output.durationRounds ? `Duration: ${output.durationRounds} rounds.` : null;
    const currentPreyCondition = output.conditions.find((condition) =>
      condition.kind === 'target-is-prey' ||
      (condition.statusId === 'prey' && /Troop Capacity/i.test(condition.description)),
    );
    const supplierFacts = output.targetSide === 'self'
      ? supplier.facts.filter((fact) => !/^Duration:/i.test(fact))
      : supplier.facts;
    const supplierEffects = output.targetSide === 'self'
      ? supplier.effects.filter((effect) => !/^Duration:/i.test(effect))
      : supplier.effects;
    const details = compactSemanticFacts([
      `Target: ${provider.name}.`,
      timing,
      duration,
      isControlStatus ? `Real Control status: ${statusName}.` : `Status source: ${statusName}.`,
      context?.effect.notes.find((note) => /Control status/i.test(note)) ?? null,
      ...supplierEffects,
    ].filter((line): line is string => Boolean(line)));
    const timingPhrase = timing?.replace(/^Timing:\s*/i, '').replace(/\.$/, '') ?? null;
    const durationPhrase = duration?.replace(/^Duration:\s*/i, '').replace(/\.$/, '').toLowerCase() ?? null;
    const deterministicSelfControlSummary = isControlStatus && supplier.effects.some((effect) => /application is deterministic/i.test(effect))
      ? `${timingPhrase ? `At ${timingPhrase}, ` : ''}${output.abilityName} deterministically applies ${statusName} to ${provider.name}${durationPhrase ? ` for ${durationPhrase}` : ''}.`
      : null;
    traces.push(makeDependencyTrace({
      id: `self-status-output-${output.id}`,
      matchKind: 'status-condition-enablement',
      ruleId: 'self-status-output',
      source: provider,
      sourceAbilityId: output.abilityId,
      recipient: provider,
      recipientAbilityId: output.abilityId,
      channel: isControlStatus ? 'control' : 'status',
      title: `${output.abilityName} - Self ${statusName}${isControlStatus ? '' : ' source'}`,
      explanation: deterministicSelfControlSummary ?? `${provider.name}'s ${output.abilityName} causes ${provider.name} to gain ${statusName}.`,
      requirements,
      matchedFacts: [
        `Status identity: ${output.statusId}.`,
        output.sourceEffectId ? `Source effect ID: ${output.sourceEffectId}.` : null,
        `Resolved self recipient: ${provider.name}.`,
        ...supplierFacts,
      ].filter((fact): fact is string => Boolean(fact)),
      effects: details,
      sourceEvidenceIds: output.evidenceIds,
      recipientEvidenceIds: [],
      assumptions: isControlStatus
        ? ['Verified negative self-effects are represented even when they are not beneficial.']
        : currentPreyCondition
          ? ['The self recipient is resolved separately from the persistent enemy condition reference.']
          : ['Self-targeting resolves the recipient separately from activation success and uptime.'],
      unresolvedQuestions: isControlStatus
        ? ['Cleanse timing and outcome are not invented.']
        : [],
      exactResultUnknownReason: currentPreyCondition
        ? `Exact ${statusName} result cannot be calculated because current Prey existence, marked enemy identity, above-50% threshold applicability, and current-round applicability are unresolved.`
        : `Exact ${statusName} result cannot be calculated because activation success, runtime condition state, and status uptime are unresolved.`,
      futureOrConditional: capabilityFutureOrConditional(output, options) || output.conditions.length > 0 || statusChanceConditional(output),
    }));
  }
  return traces;
}

function analyzeEnemyReceivedReductions(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'enemy-debuff' &&
      capability.direction === 'received' &&
      capability.operation === 'decrease' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    const requirements = providerRequirementTraces(modifier, formation, dragons, options);
    const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
    const value = modifierDisplayValue(modifier, options);
    const completeCoverage = enemyCoverageIsComplete(modifier);
    const details = [
      ...(context ? [scheduleTimingDetail(context.schedule), durationDetail(context.effect)] : []),
      ...enemyAllMatchingSelectorFacts(modifier),
      ...enemySelectorFacts(provider, modifier),
      ...modifier.conditions.map((condition) => condition.description),
    ].filter((line): line is string => Boolean(line));
    traces.push({
      id: `enemy-received-reduction-${modifier.id}`,
      ruleId: 'enemy-received-reduction',
      status: statusFromRequirements(requirements, capabilityFutureOrConditional(modifier, options) || modifier.conditional),
      confidence: modifier.confidence,
      sourceDragonId: provider.id,
      sourceAbilityId: modifier.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: `${channelLabel(modifier.channel)} Enemy Reduction`,
      explanation: `${provider.name}'s ${modifier.abilityName} can reduce enemy ${directedChannelLabel(modifier.channel, 'received')} by ${value}. ${details.join(' ')}`,
      requirements,
      matchedFacts: [
        `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
        ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
        ...details,
      ],
      effects: [
        `${directedChannelLabel(modifier.channel, 'received')} decrease ${value}${effectiveHabitLevelForCapability(modifier, options) ? ` at effective Habit Level ${effectiveHabitLevelForCapability(modifier, options)}` : ''}.`,
        ...details,
      ],
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: completeCoverage ? ['Enemy names are unavailable because the enemy formation is not modeled.'] : enemySelectorAssumption(modifier),
      unresolvedQuestions: completeCoverage
        ? ['Enemy names are unavailable because the enemy formation is not modeled.', 'Exact final Recovery calculation or modifier-combination formula remains unresolved.']
        : enemySelectorUnresolvedQuestions(modifier),
      sourceEvidenceIds: modifier.evidenceIds,
      recipientEvidenceIds: [],
      combatLogConfirmed: modifier.combatLogConfirmed,
      exactResultKnown: false,
      exactResultUnknownReason: completeCoverage
        ? 'Exact final received-effect reduction cannot be calculated because enemy names and final Recovery calculation or modifier-combination formula are unresolved.'
        : 'Exact final received-effect reduction cannot be calculated because target identity and final received-effect formulas are unresolved.',
      matchKind: 'enemy-damage-dealt-reduction',
      channel: modifier.channel,
      modifierRole: modifier.role,
      targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
      modifierSelfOnly: false,
      availabilityContext: modifier.availability.reportLabel,
      modifierCapabilityId: modifier.id,
      modifierCapabilityIds: [modifier.id],
      interactionScope: 'enemy-side',
    });
  }
  return traces;
}

function independentHighestStatSelectorFacts(provider: Dragon, modifier: ModifierCapability): string[] {
  const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
  if (!context || modifier.targetSelector.selection !== 'highest-stat') {
    return [];
  }
  const comparisonStats = context.schedule.effects
    .map((effect) => effect.targetSelection?.comparisonStat)
    .filter((stat): stat is DragonStatId => stat === 'strength' || stat === 'instinct' || stat === 'intelligence' || stat === 'initiative');
  const stats = [...new Set(comparisonStats)];
  const hasSharedGroup = context.schedule.effects.some((effect) => Boolean(effect.targetSelection?.sharedSelectionGroupId));
  if (stats.length < 2 || hasSharedGroup) {
    return [];
  }
  return [
    `The ${stats.map((stat) => `highest-${statLabel(stat)}`).join(' and ')} selectors are resolved independently. They may select the same enemy or different enemies.`,
  ];
}

function enemyDamageDealtReductionDetailFacts(modifier: ModifierCapability, reductionChannel: EffectChannel = modifier.channel): string[] {
  if (modifier.sourceScope !== 'non-basic-attacks') {
    return [];
  }
  const dealt = reductionChannel === 'damage-dealt' || reductionChannel === 'physical-damage' ? '' : ' Dealt';
  return [`${channelLabel(reductionChannel)}${dealt} reduction applies to non-Basic Attacks only.`];
}

function analyzeEnemyDamageReceivedIncreases(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'enemy-debuff' &&
      capability.direction === 'received' &&
      capability.operation === 'increase' &&
      capability.targetSelector.side === 'enemy' &&
      isDamageChannel(capability.channel) &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    const matchedOutputs = outputs.filter(
      (output) =>
        outputCapabilityVisible(output, options) &&
        isDamageOutputCapability(output) &&
        modifierMatchesOutputChannel(modifier.channel, output.channel) &&
        sourceScopesCompatible(modifier.sourceScope, output.sourceScope),
    );
    const sourceScopeResults = matchedOutputs.map((output) =>
      capabilityMatch(modifier, output, [sourceScopeRequirement(modifier, output)], options),
    );
    const requirements = providerRequirementTraces(modifier, formation, dragons, options);
    const outputLabels = outputChannelNames(outputs, matchedOutputs.map((output) => output.id));
    const channel = channelLabel(modifier.channel);
    const displayValue = modifierDisplayValue(modifier, options);
    const triggerContext = successfulStatusTriggerContext(modifier);
    const triggerSupplierDetails = triggerContext
      ? successfulStatusTriggerSupplierDetails(modifier, provider, statusOutputs, options, triggerContext)
      : { facts: [], effects: [] };
    const enemyVulnerabilityDetails = enemyVulnerabilityDetailLines(modifier, provider.name, channel, displayValue);
    const enemyTargetDetails = triggerContext
      ? successfulStatusTriggerTargetFacts(provider.name, triggerContext)
      : enemySelectorFacts(provider, modifier);
    const modifierStatus = statusFromRequirements(requirements, capabilityFutureOrConditional(modifier, options) || modifier.conditional);
    traces.push({
      id: `enemy-damage-received-increase-${modifier.id}`,
      ruleId: 'enemy-damage-received-increase',
      status: modifierStatus,
      confidence: modifier.confidence,
      sourceDragonId: provider.id,
      sourceAbilityId: modifier.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: `Enemy ${channel} vulnerability`,
      explanation: enemyVulnerabilityExplanation(modifier, provider.name, channel, displayValue),
      requirements,
      matchedFacts: [
        `${modifier.abilityName} targets ${triggerContext ? successfulStatusTargetSelectorSummary(triggerContext) : targetSelectorSummary(modifier.targetSelector)}.`,
        `Modifier capability ID: ${modifier.id}.`,
        `Source scope: ${modifier.sourceScope}.`,
        ...enemyTargetDetails,
        ...enemyVulnerabilityDetails,
        ...triggerSupplierDetails.facts,
        ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
        ...(outputLabels.length > 0 ? [`Qualifying allied outputs: ${outputLabels.join(', ')}.`] : []),
        ...modifier.conditions.map((condition) => condition.description),
        ...activationChanceFacts(modifier, options),
      ],
      effects: [
        `${channel} Received +${displayValue}.`,
        ...enemyVulnerabilityDetails,
        ...triggerSupplierDetails.effects,
      ],
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: [
        'Enemy target overlap is not simulated or guaranteed.',
        'Enemy formation members and lane occupants are not invented.',
        'The target selector is preserved as enemy-side metadata rather than assigning a friendly recipient.',
      ],
      unresolvedQuestions: [
        'Opposing-position selection remains provisional when the source data uses that target wording.',
        'Exact final damage increase cannot be calculated because target overlap, uptime, stacking, and final formulas are unresolved.',
      ],
      sourceEvidenceIds: modifier.evidenceIds,
      recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
      providedEffectType: `${channel} Received increase`,
      recipientModifierType: null,
      recipientModifierAbilityId: null,
      recipientModifierValue: modifierResolvedValue(modifier, options),
      combatLogConfirmed: modifier.combatLogConfirmed,
      exactResultKnown: false,
      exactResultUnknownReason: 'Exact final damage gain cannot be calculated because target overlap, uptime, stacking, and final formulas are unresolved.',
      matchKind: 'enemy-damage-received-increase',
      channel: modifier.channel,
      modifierRole: modifier.role,
      targetSelectorSummary: triggerContext
        ? successfulStatusTargetSelectorSummary(triggerContext)
        : targetSelectorSummary(modifier.targetSelector),
      modifierSelfOnly: false,
      availabilityContext: modifier.availability.reportLabel,
      modifierCapabilityId: modifier.id,
      modifierCapabilityIds: [modifier.id],
      matchedOutputCapabilityIds: matchedOutputs.map((output) => output.id),
      sourceScopeResults,
      interactionScope: 'enemy-side',
      damageScope: modifier.damageScope,
    });
    if (
      requirements.some((requirement) => requirement.satisfied === false) ||
      modifier.conditions.some((condition) => condition.kind === 'successful-status-application')
    ) {
      continue;
    }
    const matchedOutputsByDragon = new Map<string, OutputCapability[]>();
    for (const output of matchedOutputs) {
      matchedOutputsByDragon.set(output.dragonId, [...(matchedOutputsByDragon.get(output.dragonId) ?? []), output]);
    }
    for (const [recipientId, recipientOutputs] of matchedOutputsByDragon) {
      const recipient = dragonById(dragons, recipientId);
      if (!recipient) {
        continue;
      }
      const outputRequirements = recipientOutputs.flatMap((output) => outputRequirementTraces(output, options));
      const projectionRequirements = [...requirements, ...outputRequirements];
      const projectionScopeResults = recipientOutputs.map((output) =>
        capabilityMatch(modifier, output, [sourceScopeRequirement(modifier, output)], options),
      );
      const projectionStatus = statusFromRequirements(projectionRequirements, true);
      const outputNames = outputChannelNames(outputs, recipientOutputs.map((output) => output.id));
      const allMatching = modifier.targetSelector.selection === 'all-matching-condition';
      traces.push({
        id: `enemy-damage-received-benefit-${modifier.id}-${recipientId}`,
        ruleId: 'enemy-damage-received-benefit',
        status: projectionStatus,
        confidence: mergeConfidence([modifier.confidence, ...recipientOutputs.map((output) => output.confidence)]),
        sourceDragonId: provider.id,
        sourceAbilityId: modifier.abilityId,
        recipientDragonId: recipient.id,
        recipientAbilityId: recipientOutputs[0]?.abilityId ?? null,
        title: `Enemy ${channel} vulnerability`,
        explanation: allMatching
          ? `${recipient.name}'s qualifying ${sourceScopeQualifiedChannel(modifier, channel)} can benefit from ${displayValue} ${channel} Received on enemies affected by ${provider.name}'s ${modifier.abilityName}. The allied attack must hit one of those affected enemies; threshold membership and target overlap are not guaranteed.`
          : `${recipient.name}'s qualifying ${sourceScopeQualifiedChannel(modifier, channel)} can benefit from ${displayValue} ${channel} Received on the selected enemy from ${provider.name}'s ${modifier.abilityName}. The vulnerable enemy and allied attack target must overlap; enemy target selection and overlap are not guaranteed.`,
        requirements: projectionRequirements,
        matchedFacts: [
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          `Modifier capability ID: ${modifier.id}.`,
          `Source effect ID: ${modifier.sourceEffectId ?? 'unknown'}.`,
          `Source scope: ${modifier.sourceScope}.`,
          `Matched output capability IDs: ${recipientOutputs.map((output) => output.id).join(', ')}.`,
          ...(outputNames.length > 0 ? [`Matched qualifying outputs: ${outputNames.join(', ')}.`] : []),
          ...enemyTargetDetails,
          ...enemyVulnerabilityDetails,
          ...projectionScopeResults.map((match) => `Source-scope compatibility: ${match.sourceScopeCompatible ? 'compatible' : 'not compatible'} for ${match.outputCapabilityId}.`),
        ],
        effects: [
          allMatching
            ? `${recipient.name}'s qualifying ${sourceScopeQualifiedChannel(modifier, channel)} can benefit from ${displayValue} ${channel} Received on an affected enemy.`
            : `${recipient.name}'s qualifying ${sourceScopeQualifiedChannel(modifier, channel)} can benefit from ${displayValue} ${channel} Received on the selected enemy.`,
          ...enemyVulnerabilityDetails,
          allMatching ? 'The allied attack must hit one of the affected enemies.' : 'The vulnerable enemy and allied attack target must overlap.',
        ],
        conflicts: projectionRequirements
          .filter((requirement) => requirement.satisfied === false)
          .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
        assumptions: [
          allMatching ? 'Threshold membership and allied target overlap are not guaranteed.' : 'Enemy target selection and allied target overlap are not guaranteed.',
          'The vulnerability is applied to an enemy, not to the friendly recipient.',
          'Final damage is not calculated.',
        ],
        unresolvedQuestions: [
          'Enemy identity, target overlap, uptime, refresh, stacking, and final formulas remain unresolved.',
        ],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: recipientOutputs.flatMap((output) => output.evidenceIds),
        providedEffectType: `${channel} Received vulnerability benefit`,
        recipientModifierType: null,
        recipientModifierAbilityId: null,
        recipientModifierValue: modifierResolvedValue(modifier, options),
        combatLogConfirmed: modifier.combatLogConfirmed,
        exactResultKnown: false,
        exactResultUnknownReason: 'Exact final damage gain cannot be calculated because target overlap, uptime, stacking, and final formulas are unresolved.',
        matchKind: 'enemy-damage-received-increase',
        channel: modifier.channel,
        modifierRole: null,
        targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
        modifierSelfOnly: false,
        availabilityContext: modifier.availability.reportLabel,
        modifierCapabilityId: modifier.id,
        modifierCapabilityIds: [modifier.id],
        matchedOutputCapabilityIds: recipientOutputs.map((output) => output.id),
        sourceScopeResults: projectionScopeResults,
        interactionScope: interactionScopeForTrace(provider.id, recipient.id, 'enemy-damage-received-increase'),
        damageScope: modifier.damageScope,
      });
    }
  }
  return traces;
}

function analyzePeriodicStatusDamage(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  periodicDamage: PeriodicDamageDefinition[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const periodic of periodicDamage) {
    const providerPosition = positionOf(formation, periodic.dragonId);
    const provider = dragonById(dragons, periodic.dragonId);
    const matchingStatusOutputs = statusOutputs.filter((output) =>
      output.dragonId === periodic.dragonId &&
      output.abilityId === periodic.abilityId &&
      output.statusId === periodic.statusId &&
      (periodic.sourceEffectId ? output.sourceEffectId === periodic.sourceEffectId : true) &&
      statusCapabilityVisible(output, options),
    );
    const statusOutput = matchingStatusOutputs[0] ?? null;
    if (!providerPosition || !provider || !statusOutput) {
      continue;
    }
    const abilityName = statusOutput.abilityName;
    const status = statusLabel(periodic.statusId);
    const channel = channelLabel(periodic.channel);
    const displayValue = periodicDamageDisplayValue(periodic, statusOutput, options);
    const requirements = availabilityRequirements({
      dragonId: statusOutput.dragonId,
      abilityId: statusOutput.abilityId,
      dragonName: provider.name,
      abilityName,
      unlockStarRank: statusOutput.unlockStarRank,
      minimumDragonLevel: statusOutput.minimumDragonLevel,
      requiredHabitLevel: statusOutput.requiredHabitLevel,
      evidenceIds: statusOutput.evidenceIds,
      sourceKind: abilitySourceKind(dragons, statusOutput.dragonId, statusOutput.abilityId),
    }, options);
    const statusOutputContexts = matchingStatusOutputs
      .map((output) => sourceEffectContext(provider, output.abilityId, output.sourceEffectId))
      .filter((context): context is { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } => Boolean(context));
    const detailLines = periodicDamageDetailLines(periodic, matchingStatusOutputs, displayValue, statusOutputContexts, options);
    traces.push({
      id: `periodic-status-damage-${statusOutput.id}`,
      ruleId: 'periodic-status-damage',
      status: statusFromRequirements(requirements, statusOutput.futureAvailable || statusOutput.conditions.length > 0 || statusChanceConditional(statusOutput)),
      confidence: 'confirmed',
      sourceDragonId: provider.id,
      sourceAbilityId: statusOutput.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: `${status} periodic ${channel}`,
      explanation: `${provider.name}'s ${abilityName} can apply ${status}. ${status} deals periodic ${channel} each round${displayValue === null ? ' at an unknown Damage Rate' : ` at Damage Rate ${displayValue}`}${periodic.durationRounds ? ` for ${periodic.durationRounds} rounds` : ''}. Application success on each independently checked enemy, successful-application uptime, first-tick timing, refresh behavior, stacking, mitigation, and final damage are not calculated.`,
      requirements,
      matchedFacts: [
        ...matchingStatusOutputs.map((output) => `${abilityName} ${output.sourceEffectId ?? output.id} targets ${targetSelectorSummary(output.targetSelector)}.`),
        ...matchingStatusOutputs.flatMap((output) => enemySelectorFacts(provider, output)),
        `Status identity: ${periodic.statusId}.`,
        periodic.sourceEffectId ? `Source effect ID: ${periodic.sourceEffectId}.` : null,
        periodic.activationGroupId ? `Activation group: ${periodic.activationGroupId}.` : null,
        `Periodic damage channel: ${periodic.channel}.`,
        ...detailLines,
        ...statusOutput.conditions.map((condition) => condition.description),
      ].filter((fact): fact is string => Boolean(fact)),
      effects: detailLines,
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: [
        'Periodic status application is conditional on activation and per-enemy application success.',
        'Enemy identities that successfully receive the status are not individually enumerated.',
        'Uptime is not treated as guaranteed.',
        'The target selector is preserved as enemy-side metadata rather than assigning a friendly recipient.',
      ],
      unresolvedQuestions: [
        `${status} first-tick timing, refresh behavior, stacking, and overlapping-source behavior remain unresolved.`,
        'Exact final damage cannot be calculated because application success, uptime, stacking, mitigation, and final formulas are unresolved.',
      ],
      sourceEvidenceIds: statusOutput.evidenceIds,
      recipientEvidenceIds: [],
      providedEffectType: `${status} periodic ${channel}`,
      recipientModifierType: null,
      recipientModifierAbilityId: null,
      recipientModifierValue: periodicDamageResolvedValue(periodic, statusOutput, options),
      combatLogConfirmed: false,
      exactResultKnown: false,
      exactResultUnknownReason: 'Exact final periodic damage cannot be calculated because application success on each independently checked enemy, successful-application uptime, first-tick timing, refresh behavior, stacking, mitigation, and final formulas are unresolved.',
      matchKind: 'periodic-status-damage',
      channel: periodic.channel,
      modifierRole: 'enemy-debuff',
      targetSelectorSummary: targetSelectorSummary(statusOutput.targetSelector),
      modifierSelfOnly: false,
      availabilityContext: statusOutput.availability.reportLabel,
      modifierCapabilityId: statusOutput.id,
      modifierCapabilityIds: matchingStatusOutputs.map((output) => output.id),
      interactionScope: 'enemy-side',
    });
  }
  return traces;
}

function periodicDamageDetailLines(
  periodic: PeriodicDamageDefinition,
  statusOutputs: StatusOutputCapability[],
  displayValue: string | null,
  contexts: Array<{ ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect }>,
  options: CapabilityOptions,
): string[] {
  const status = statusLabel(periodic.statusId);
  const channel = channelLabel(periodic.channel);
  return [
    `${status} deals periodic ${channel} each round.`,
    displayValue === null ? 'Periodic damage rate: unknown/not stated.' : `Damage Rate ${displayValue}.`,
    periodic.durationRounds ? `Duration: ${periodic.durationRounds} rounds.` : null,
    periodic.scalingStat ? `Scales with ${formatStatName(periodic.scalingStat)}.` : null,
    periodic.mitigationStat ? `Mitigated by target ${formatStatName(periodic.mitigationStat)}.` : null,
    ...statusOutputs.flatMap((output) => [
      output.sourceEffectId ? `Status supplier effect: ${output.sourceEffectId}.` : null,
      output.activationGroupId ? `Activation group: ${output.activationGroupId}.` : null,
      output.targetSelector.sharedSelectionGroupId ? `Selected-target group: ${output.targetSelector.sharedSelectionGroupId}.` : null,
    ]),
    ...contexts.flatMap((context) => [
      ...targetReferenceFacts(context.effect),
      ...referencedEffectTargetReferenceFacts(context.schedule, context.effect),
      ...perTargetCheckFacts(context.effect, context.schedule, options),
      context.effect.activationRoll?.description && !context.effect.activationRoll.unresolved
        ? context.effect.activationRoll.description
        : context.schedule.activationRoll?.description && !context.schedule.activationRoll.unresolved
          ? context.schedule.activationRoll.description
          : null,
      sharedTargetFact(context.ability, context.effect),
    ].filter((line): line is string => Boolean(line))),
    'Application success on each independently checked enemy, successful-application uptime, first-tick timing, refresh behavior, stacking, mitigation, and final periodic damage are unresolved.',
    'Final periodic damage is not calculated.',
  ].filter((line): line is string => Boolean(line));
}

function periodicDamageDisplayValue(
  periodic: PeriodicDamageDefinition,
  statusOutput: StatusOutputCapability,
  options: CapabilityOptions,
): string | null {
  const value = periodicDamageResolvedValue(periodic, statusOutput, options);
  return value === null ? null : `${value}%`;
}

function periodicDamageResolvedValue(
  periodic: PeriodicDamageDefinition,
  statusOutput: StatusOutputCapability,
  options: CapabilityOptions,
): number | null {
  const rankedValue = options.previewMaxRankInteractions
    ? periodic.damageRateByHabitLevel.find((value) => value.level === 5)
    : rankedValueForHabitLevel(periodic.damageRateByHabitLevel, effectiveHabitLevelForCapability(statusOutput, options));
  return rankedValue?.value ?? periodic.damageRateFixed;
}

function statusChanceConditional(statusOutput: StatusOutputCapability): boolean {
  return statusOutput.chanceFixed !== null ||
    statusOutput.chanceByHabitLevel.length > 0 ||
    statusOutput.activationChanceFixed !== null ||
    (statusOutput.activationChanceByHabitLevel?.length ?? 0) > 0;
}

function formatStatName(stat: DragonStatId): string {
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}

function enemyVulnerabilityExplanation(
  modifier: ModifierCapability,
  providerName: string,
  channel: string,
  displayValue: string,
): string {
  const trigger = successfulStatusTriggerLine(modifier, providerName);
  const triggerContext = successfulStatusTriggerContext(modifier);
  const allMatchingFacts = enemyAllMatchingSelectorFacts(modifier);
  const targetLine = allMatchingFacts.length > 0
    ? allMatchingFacts.join(' ')
    : triggerContext
      ? `${providerName}'s ${modifier.abilityName} increases ${channel} Received by ${displayValue}. For each enemy ${providerName} successfully ${statusApplicationVerb(triggerContext.statusId)}, the vulnerability applies to that same enemy.`
      : `${providerName}'s ${modifier.abilityName} increases ${channel} Received by ${displayValue} for one enemy target.`;
  return [
    allMatchingFacts.length > 0 ? `${providerName}'s ${modifier.abilityName} increases ${channel} Received by ${displayValue}. ${targetLine}` : targetLine,
    trigger,
    sameEnemyLine(modifier),
    sourceScopeLine(modifier, channel),
    durationLine(modifier),
    staggerExclusionLine(modifier),
    allMatchingFacts.length > 0
      ? `Allied ${channel} can benefit only when its target overlaps with an affected enemy; enemy target overlap remains conditional and is not guaranteed.`
      : `Allied ${channel} can benefit only when its target overlaps with that enemy; enemy target overlap remains conditional and is not guaranteed.`,
  ].filter(Boolean).join(' ');
}

function enemyVulnerabilityDetailLines(modifier: ModifierCapability, providerName: string, channel: string, displayValue: string): string[] {
  void displayValue;
  const triggerContext = successfulStatusTriggerContext(modifier);
  return [
    successfulStatusTriggerLine(modifier, providerName),
    ...(triggerContext ? successfulStatusTriggerTargetFacts(providerName, triggerContext) : []),
    sameEnemyLine(modifier),
    sourceScopeLine(modifier, channel),
    durationLine(modifier),
    staggerExclusionLine(modifier),
    ...enemyAllMatchingSelectorFacts(modifier),
    'Enemy target overlap remains conditional and is not guaranteed.',
  ].filter((line): line is string => Boolean(line));
}

function enemyAllMatchingSelectorFacts(modifier: ModifierCapability): string[] {
  if (modifier.targetSelector.selection !== 'all-matching-condition' || modifier.targetSelector.side !== 'enemy') {
    return [];
  }
  const threshold = modifier.conditions.find((condition) => condition.thresholdPercent !== null && condition.thresholdPercent !== undefined);
  const comparison = threshold?.comparison === 'above'
    ? 'above'
    : threshold?.comparison === 'below'
      ? 'below'
      : null;
  const thresholdLine = comparison && threshold?.thresholdPercent !== null && threshold?.thresholdPercent !== undefined
    ? `Applies to all enemies currently ${comparison} ${threshold.thresholdPercent}% maximum Troop Capacity.`
    : 'Applies to all enemies matching the source condition.';
  return [
    thresholdLine,
    'All matching enemies are affected; no one enemy is selected from the qualifying set.',
    'Zero, one, two, or three enemies may qualify; enemy identities remain unknown.',
  ];
}

function enemySelectorFacts(
  provider: Dragon,
  capability: Pick<ModifierCapability | StatusOutputCapability, 'abilityId' | 'sourceEffectId' | 'targetSelector'>,
  completeCoverage = false,
): string[] {
  if (capability.targetSelector.side !== 'enemy') {
    return [];
  }
  const context = sourceEffectContext(provider, capability.abilityId, capability.sourceEffectId);
  const effect = context?.effect;
  const count = capability.targetSelector.count;
  const scope = capability.targetSelector.scope;
  const priority = effect ? targetPriorityFact(effect) : null;
  const fallback = effect ? targetFallbackFact(effect) : null;
  const references = effect ? targetReferenceFacts(effect) : [];
  const sharedGroup = capability.targetSelector.sharedSelectionGroupId
    ? `Selected-target group: ${capability.targetSelector.sharedSelectionGroupId}.`
    : null;
  if (completeCoverage) {
    return [
      'Enemy selector: all enemies.',
      count !== null ? `Enemy target count: ${count}.` : 'Enemy target count: all enemy slots.',
      'All three enemy slots are covered.',
      ...references,
      'Enemy identities remain unresolved because the enemy formation is unavailable.',
    ].filter((fact): fact is string => Boolean(fact));
  }
  if (capability.targetSelector.selection === 'all-matching-condition') {
    return [
      'Enemy selector: all enemies.',
      'All matching enemies are affected as enemy-side metadata rather than named friendly recipients.',
      'Enemy target count: all matching enemies.',
      scope === 'within-adjacency' ? 'Target scope: enemies within adjacency.' : null,
      priority,
      fallback,
      sharedGroup,
      ...references,
      'Enemy identities remain unresolved because the enemy formation is unavailable.',
    ].filter((fact): fact is string => Boolean(fact));
  }
  return [
    count !== null ? `Enemy target count: ${count}.` : 'Enemy target count: unknown.',
    scope === 'within-adjacency' ? 'Target scope: enemies within adjacency.' : null,
    priority,
    fallback,
    sharedGroup,
    ...references,
    count !== null ? 'Enemy identities remain unresolved because the enemy formation is unavailable.' : null,
  ].filter((fact): fact is string => Boolean(fact));
}

function successfulStatusTriggerLine(modifier: ModifierCapability, providerName: string): string | null {
  const condition = modifier.conditions.find((item) =>
    item.kind === 'successful-status-application' || /successfully applied/i.test(item.description),
  );
  if (!condition) {
    return null;
  }
  const status = condition.description.match(/\b(Taunt|Stagger|Burn|Panic|Confusion|Overwhelm)\b/i)?.[1];
  return status
    ? `${providerName} must successfully apply ${status} to trigger this effect.`
    : `${condition.description}`;
}

function sameEnemyLine(modifier: ModifierCapability): string | null {
  if (modifier.targetSelector.side !== 'enemy') {
    return null;
  }
  const condition = modifier.conditions.find((item) => item.kind === 'successful-status-application');
  if (condition || /same enemy|same target/i.test(modifier.targetSelector.scope)) {
    return 'The vulnerability applies to that same enemy target.';
  }
  return null;
}

function sourceScopeLine(modifier: ModifierCapability, channel: string): string {
  if (modifier.sourceScope === 'non-basic-attacks') {
    return `Applies to non-Basic ${channel} only.`;
  }
  if (modifier.sourceScope === 'all-qualifying-sources') {
    return `Applies to all qualifying ${channel} sources.`;
  }
  if (modifier.sourceScope === 'commands-and-habits') {
    return `Applies to ${channel} from Commands and Habits.`;
  }
  if (modifier.sourceScope === 'commands') {
    return `Applies to Command ${channel} only.`;
  }
  if (modifier.sourceScope === 'habits') {
    return `Applies to Habit ${channel} only.`;
  }
  if (modifier.sourceScope === 'basic-attacks') {
    return `Applies to Basic Attack ${channel} only.`;
  }
  return 'Applicable source scope is not yet verified.';
}

function modifierSourceScopeFact(modifier: ModifierCapability): string | null {
  if (modifier.sourceScope === 'unknown') {
    return null;
  }
  return sourceScopeLine(modifier, channelLabel(modifier.channel));
}

function modifierEffectValueLine(modifier: ModifierCapability, options: CapabilityOptions): string {
  const level = modifier.rankedValues.length > 0
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options))
    : null;
  if (modifier.valuePerStack !== null) {
    const sign = modifier.operation === 'increase' ? '+' : '-';
    return `${directedChannelLabel(modifier.channel, modifier.direction)} ${sign}${modifier.valuePerStack}% per stack${level ? ` at effective Habit Level ${level}` : ''}.`;
  }
  return `${directedChannelLabel(modifier.channel, modifier.direction)} ${modifier.operation} ${modifierDisplayValue(modifier, options)}${level ? ` at effective Habit Level ${level}` : ''}.`;
}

function sourceScopeQualifiedChannel(modifier: ModifierCapability, channel: string): string {
  if (modifier.sourceScope === 'non-basic-attacks') {
    return `non-Basic ${channel}`;
  }
  if (modifier.sourceScope === 'commands-and-habits') {
    return `Command or Habit ${channel}`;
  }
  if (modifier.sourceScope === 'commands') {
    return `Command ${channel}`;
  }
  if (modifier.sourceScope === 'habits') {
    return `Habit ${channel}`;
  }
  if (modifier.sourceScope === 'basic-attacks') {
    return `Basic Attack ${channel}`;
  }
  return channel;
}

function durationLine(modifier: ModifierCapability): string | null {
  return modifier.durationRounds ? `Duration: ${modifier.durationRounds} rounds.` : null;
}

function staggerExclusionLine(modifier: ModifierCapability): string | null {
  return modifier.conditions.some((item) => item.kind === 'successful-status-application' && /taunt/i.test(item.description))
    ? 'Stagger does not trigger this effect.'
    : null;
}

function analyzePeriodicDamageAmplification(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  periodicDamage: PeriodicDamageDefinition[],
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const modifier of modifiers.filter(
    (capability) =>
      capability.role === 'ally-support' &&
      capability.direction === 'dealt' &&
      capability.operation === 'increase' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    const preferredPosition = preferredPositionForModifier(modifier, dragons);
    const eligiblePositions = providerPosition
      ? allEligibleTargetCandidatePositions(formation, modifier, providerPosition)
      : [];
    const preferredRecipientId = preferredPosition && eligiblePositions.includes(preferredPosition)
      ? formation[preferredPosition]
      : null;
    for (const periodic of periodicDamage.filter(
      (item) => item.channel === modifier.channel && periodicDamageVisible(item, dragons, options),
    )) {
      if (periodic.dragonId === modifier.dragonId) {
        continue;
      }
      if (
        preferredRecipientId &&
        !preferredPositionUsesQualifyingOutputEligibility(modifier, dragons) &&
        (preferredRecipientId !== modifier.dragonId || !explicitSelfTargetingAllowed(modifier, dragons)) &&
        periodic.dragonId !== preferredRecipientId
      ) {
        continue;
      }
      const recipientPosition = positionOf(formation, periodic.dragonId);
      if (!recipientPosition) {
        continue;
      }
      if (canonicalOutgoingPeriodicMatchExists(formation, dragons, outputs, modifier, periodic, providerPosition, recipientPosition, options)) {
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
        unresolvedQuestions: [`${statusLabel(periodic.statusId)} stacking, refresh, and overlapping-source behavior remain unresolved.`],
        futureOrConditional: true,
      }));
    }
  }
  return traces;
}

function withResolvedSingleQualifiedRecipientFacts(
  trace: AmplificationSynergyTrace,
  modifier: ModifierCapability,
  dragons: Dragon[],
): AmplificationSynergyTrace {
  const recipientName = trace.recipientDragonId
    ? dragonById(dragons, trace.recipientDragonId)?.name ?? trace.recipientDragonId
    : 'the selected ally';
  const resolvedFact = `Resolved output-qualified recipient: ${recipientName}.`;
  return {
    ...trace,
    matchedFacts: uniqueOrdered([
      ...trace.matchedFacts.filter((fact) => !/selected recipient is unresolved|eligible recipients compete/i.test(fact)),
      resolvedFact,
      `Only one ally has qualifying ${channelLabel(modifier.channel)} output for this selector.`,
    ]),
    assumptions: uniqueOrdered(trace.assumptions
      .map((assumption) =>
        assumption === 'Trigger chance and target selection may make this conditional rather than guaranteed.'
          ? 'Trigger chance may make this conditional rather than guaranteed.'
          : assumption,
      )
      .filter((assumption) => !/target selection may|target choice may|eligible recipients compete/i.test(assumption))),
    unresolvedQuestions: uniqueOrdered(trace.unresolvedQuestions
      .filter((question) => !/Target choice may not be guaranteed/i.test(question))),
  };
}

function canonicalOutgoingPeriodicMatchExists(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  outputs: OutputCapability[],
  modifier: ModifierCapability,
  periodic: PeriodicDamageDefinition,
  providerPosition: FormationPosition | null,
  recipientPosition: FormationPosition,
  options: CapabilityOptions,
): boolean {
  const output = outputs.find((candidate) =>
    isPeriodicOutputCapability(candidate) &&
    candidate.dragonId === periodic.dragonId &&
    candidate.abilityId === periodic.abilityId &&
    candidate.statusId === periodic.statusId &&
    candidate.channel === periodic.channel &&
    (periodic.sourceEffectId ? candidate.sourceEffectId === periodic.sourceEffectId : true)
  );
  if (!output || !outputCapabilityVisible(output, options) || !modifierMatchesOutputChannel(modifier.channel, output.channel)) {
    return false;
  }
  const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
  const match = capabilityMatch(modifier, output, [
    targeting,
    ...providerRequirementTraces(modifier, formation, dragons, options),
    ...outputRequirementTraces(output, options),
    sourceScopeRequirement(modifier, output),
  ], options);
  return match.sourceScopeCompatible && match.status !== 'inactive' && match.status !== 'blocked' && match.status !== 'not-applicable';
}

function analyzeStatusRemovalSupport(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  const controlStatuses = new Set(['stun', 'overwhelm']);
  for (const cleanser of dragons) {
    const cleanserPosition = positionOf(formation, cleanser.id);
    if (!cleanserPosition) {
      continue;
    }
    for (const ability of allAbilities(cleanser)) {
      for (const schedule of ability.schedules) {
        for (const effect of schedule.effects.filter((item) => item.type === 'Cleanse Control' || item.type === 'Cleanse Negative')) {
          if (targetSideForEffect(effect) !== 'ally') {
            continue;
          }
          for (const statusOutput of statusOutputs.filter(
            (status) =>
              controlStatuses.has(status.statusId) &&
              status.targetSide === 'self' &&
              statusCapabilityVisible(status, options),
          )) {
            if (statusOutput.dragonId === cleanser.id) {
              continue;
            }
            const afflictedPosition = positionOf(formation, statusOutput.dragonId);
            if (!afflictedPosition) {
              continue;
            }
            const afflicted = dragonById(dragons, statusOutput.dragonId);
            if (!afflicted) {
              continue;
            }
            const requirements = [
              cleanseTargetRequirement(effect, cleanserPosition, afflictedPosition, ability.evidenceIds),
              ...availabilityRequirements({
                dragonId: cleanser.id,
                abilityId: ability.id,
                dragonName: cleanser.name,
                abilityName: ability.name,
                unlockStarRank: ability.unlockStarRank,
                minimumDragonLevel: ability.minimumDragonLevel,
                requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
                evidenceIds: ability.evidenceIds,
                sourceKind: ability.kind,
              }, options),
              ...availabilityRequirements({
                dragonId: statusOutput.dragonId,
                abilityId: statusOutput.abilityId,
                dragonName: afflicted.name,
                abilityName: statusOutput.abilityName,
                unlockStarRank: statusOutput.unlockStarRank,
                minimumDragonLevel: statusOutput.minimumDragonLevel,
                requiredHabitLevel: statusOutput.requiredHabitLevel,
                evidenceIds: statusOutput.evidenceIds,
                sourceKind: abilitySourceKind(dragons, statusOutput.dragonId, statusOutput.abilityId),
              }, options),
            ];
            traces.push(makeDependencyTrace({
              id: `status-removal-${ability.id}-${effect.id}-${statusOutput.id}`,
              matchKind: 'status-removal',
              ruleId: 'status-removal',
              source: cleanser,
              sourceAbilityId: ability.id,
              recipient: afflicted,
              recipientAbilityId: statusOutput.abilityId,
              channel: 'control',
              title: 'Control Cleanse',
              explanation: `${cleanser.name}'s ${ability.name} can remove Control-compatible effects from an ally. ${afflicted.name} can be afflicted with ${statusLabel(statusOutput.statusId)}, but timing and target selection are not guaranteed.`,
              requirements,
              matchedFacts: [
                `${ability.name} includes ${effect.type}.`,
                `${statusOutput.abilityName} can apply ${statusLabel(statusOutput.statusId)} to ${afflicted.name}.`,
              ],
              effects: [`Potential ${statusLabel(statusOutput.statusId)} removal`],
              sourceEvidenceIds: ability.evidenceIds,
              recipientEvidenceIds: statusOutput.evidenceIds,
              assumptions: ['Cleanse timing, target selection, and whether removal occurs before the afflicted dragon acts are not simulated.'],
              unresolvedQuestions: ['Control-removal timing and target selection remain unresolved.'],
              futureOrConditional: true,
            }));
          }
        }
      }
    }
  }
  return traces;
}

function analyzeSelfStatusRemoval(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: CapabilityOptions,
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  for (const provider of dragons.filter((dragon) => positionOf(formation, dragon.id))) {
    for (const ability of allAbilities(provider)) {
      for (const schedule of ability.schedules) {
        for (const effect of schedule.effects.filter((item) =>
          (item.type === 'Cleanse Control' || item.type === 'Cleanse Negative') &&
          targetSideForEffect(item) === 'self',
        )) {
          const removedStatus = effect.conditions?.find((condition) => condition.statusId)?.statusId ?? null;
          const conditionPool = [...(schedule.conditions ?? []), ...(effect.conditions ?? [])];
          const qualifyingNegativeCondition = conditionPool.find((condition) =>
            condition.kind === 'negative-effect-reduces-damage-dealt' ||
            condition.kind === 'effect-applied-by-enemy' ||
            /negative effect/i.test(condition.description),
          );
          if (!removedStatus && !qualifyingNegativeCondition) {
            continue;
          }
          const pairedStatus = schedule.effects.find((candidate) => candidate.id !== effect.id && statusIdForEffect(candidate));
          const requirements = availabilityRequirements({
            dragonId: provider.id,
            abilityId: ability.id,
            dragonName: provider.name,
            abilityName: ability.name,
            unlockStarRank: ability.unlockStarRank,
            minimumDragonLevel: ability.minimumDragonLevel,
            requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
            evidenceIds: ability.evidenceIds,
            sourceKind: ability.kind,
          }, options);
          const level = ability.kind === 'habit'
            ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForAbility(provider.id, ability, options))
            : null;
          const baseChance = rankedValueForHabitLevel(schedule.activationRoll?.chanceByHabitLevel ?? schedule.triggerChanceByHabitLevel, level);
          const conditionalChance = pairedStatus?.conditionalMultipliers
            ?.flatMap((multiplier) => multiplier.directlyVerifiedValues)
            .find((value) => value.level === 1);
          const removedStatusLabel = removedStatus ? statusLabel(removedStatus) : 'qualifying enemy-applied negative effect';
          const details = compactSemanticFacts([
            scheduleTimingDetail(schedule),
            baseChance ? `Activation chance: ${formatValue(baseChance.value, baseChance.unit)} at effective Habit Level ${level ?? 'unknown'}.` : null,
            conditionalChance && removedStatus ? `While ${statusLabel(removedStatus)}, the chance increases to ${formatValue(conditionalChance.value, conditionalChance.unit)}.` : null,
            ...statusRuntimeConditionFacts({ conditions: conditionPool } as unknown as StatusOutputCapability, effect),
            `On successful activation, remove the applicable ${removedStatusLabel} from ${provider.name}.`,
            removedStatus ? 'The cleanse does not receive an independent roll.' : 'Which qualifying negative effect is removed is unresolved.',
            schedule.activationRoll?.scope === 'schedule-shared' ? `Shared activation group: ${activationGroupId(schedule, effect)}.` : null,
          ].filter((line): line is string => Boolean(line)));
          traces.push(makeDependencyTrace({
            id: `self-status-removal-${ability.id}-${effect.id}`,
            matchKind: 'status-removal',
            ruleId: 'self-status-removal',
            source: provider,
            sourceAbilityId: ability.id,
            recipient: provider,
            recipientAbilityId: ability.id,
            channel: 'status',
            title: `${ability.name} - self status removal`,
            explanation: `${provider.name}'s ${ability.name} can remove a qualifying negative effect from ${provider.name}.`,
            requirements,
            matchedFacts: [
              `${ability.name} includes ${effect.type}.`,
              removedStatus ? `Removed status: ${removedStatus}.` : 'Removed status: qualifying enemy-applied negative effect.',
            ],
            effects: details,
            sourceEvidenceIds: ability.evidenceIds,
            recipientEvidenceIds: [],
            assumptions: ['Current self negative-effect state is unresolved; the conditional cleanse is not assumed to occur.'],
            unresolvedQuestions: [
              removedStatus
                ? `Current ${statusLabel(removedStatus)} state and removal timing are unresolved.`
                : 'Whether the recipient currently has a qualifying enemy-applied negative effect is unresolved.',
              'Activation success is unresolved.',
              removedStatus ? null : 'Which qualifying negative effect is removed is unresolved.',
            ].filter((question): question is string => Boolean(question)),
            exactResultUnknownReason: `Exact self status removal cannot be calculated because current Prey existence and identity, above-50% threshold applicability, qualifying self negative-effect state, and activation success at the known 50% chance are unresolved; removed-effect identity remains unresolved.`,
            futureOrConditional: true,
          }));
        }
      }
    }
  }
  return traces;
}

function cleanseTargetRequirement(
  effect: AbilityEffect,
  cleanserPosition: FormationPosition,
  afflictedPosition: FormationPosition,
  evidenceIds: string[],
): RequirementTrace {
  let satisfied: boolean | null = true;
  let expected: string = effect.targetScope;
  if (effect.targetScope === 'left-flank' || effect.targetScope === 'right-flank') {
    satisfied = afflictedPosition === effect.targetScope;
    expected = effect.targetScope;
  } else if (effect.targetScope === 'within-adjacency') {
    satisfied = arePositionsAdjacent(cleanserPosition, afflictedPosition);
    expected = `adjacent to ${cleanserPosition}`;
  } else if (effect.targetScope === 'self') {
    satisfied = cleanserPosition === afflictedPosition;
    expected = 'self';
  } else if (effect.targetScope === 'unknown') {
    satisfied = null;
  }
  return {
    id: `${effect.id}-cleanse-targeting-${afflictedPosition}`,
    label: 'Cleanse target compatibility',
    expected,
    actual: `cleanser ${cleanserPosition}, afflicted ${afflictedPosition}`,
    satisfied,
    evidenceIds,
    notes: ['Potential cleanse interactions remain conditional until timing and target selection are combat-log verified.'],
  };
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
  futureOrConditional = true,
  modifier = null,
  targetSelectionGroup,
  damageScope = null,
  exactResultUnknownReason,
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
  futureOrConditional?: boolean;
  modifier?: ModifierCapability | null;
  targetSelectionGroup?: SynergyTrace['targetSelectionGroup'];
  damageScope?: DefensiveDamageScope | null;
  exactResultUnknownReason?: string;
}): SynergyTrace {
  const dedupedRequirements = dedupeRequirements(requirements);
  return {
    id,
    ruleId,
    status: statusFromRequirements(dedupedRequirements, futureOrConditional),
    confidence: 'confirmed',
    sourceDragonId: source.id,
    sourceAbilityId,
    recipientDragonId: recipient.id,
    recipientAbilityId,
    title,
    explanation,
    requirements: dedupedRequirements,
    matchedFacts: compactSemanticFacts([
      ...matchedFacts,
      ...(modifier?.activationGroupId ? [`Shared activation group: ${modifier.activationGroupId}.`] : []),
    ]),
    effects,
    conflicts: dedupedRequirements
      .filter((requirement) => requirement.satisfied === false)
      .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
    assumptions,
    unresolvedQuestions,
    sourceEvidenceIds,
    recipientEvidenceIds,
    modifier,
    combatLogConfirmed: false,
    exactResultKnown: false,
    exactResultUnknownReason: exactResultUnknownReason ?? 'Exact final value cannot be calculated because final combat formulas and stacking order are not fully verified.',
    matchKind,
    channel,
    modifierRole: modifier?.role,
    targetSelectorSummary: modifier ? targetSelectorSummary(modifier.targetSelector) : undefined,
    modifierSelfOnly: modifier ? modifier.role === 'self-amplification' || modifier.targetSelector.selection === 'self' : undefined,
    availabilityContext: modifier?.availability.reportLabel,
    modifierCapabilityId: modifier?.id ?? undefined,
    modifierCapabilityIds: modifier ? [modifier.id] : undefined,
    interactionScope: interactionScopeForTrace(source.id, recipient.id, matchKind),
    damageScope,
    targetSelectionGroup,
  };
}

function compactSemanticFacts(facts: string[]): string[] {
  const seen = new Set<string>();
  const compacted: string[] = [];
  for (const fact of uniqueOrdered(facts)) {
    const key = semanticFactKey(fact);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    compacted.push(fact);
  }
  return compacted;
}

function semanticFactKey(fact: string): string {
  const normalized = fact.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^effective schedule:/.test(normalized) || /effective .* schedule:/.test(normalized)) {
    return `effective-schedule:${normalized.match(/rounds? [^.]+|start of [^.]+|each round|after each basic attack/)?.[0] ?? normalized}`;
  }
  if (/effective .*chance at habit level/.test(normalized) || /^effective chance at habit level/.test(normalized)) {
    return `effective-chance:${normalized.match(/\d+(?:\.\d+)?%/)?.[0] ?? normalized}`;
  }
  if (/^base chance:/.test(normalized)) {
    return 'base-chance';
  }
  if (/base .* roll .*does not also occur|replaced base roll is suppressed|original .* roll is suppressed/.test(normalized)) {
    return 'base-roll-suppression';
  }
  if (/original .* roll is not emitted|replaced base roll is not emitted|base .* roll is suppressed/.test(normalized)) {
    return 'base-roll-suppression';
  }
  if (/^duration:/.test(normalized) || / lasts \d+ rounds?\./.test(normalized)) {
    return `duration:${normalized.match(/\d+ rounds?|until end of combat|until end of current round/)?.[0] ?? normalized}`;
  }
  if (/lasts until end of current round/.test(normalized) || /duration: until end of current round/.test(normalized)) {
    return 'duration:until end of current round';
  }
  if (/lasts until end of combat/.test(normalized) || /duration: until end of combat/.test(normalized)) {
    return 'duration:until end of combat';
  }
  if (/^target:/.test(normalized) || /^resolved self recipient:/.test(normalized)) {
    return 'target';
  }
  if (
    /damage received decrease/.test(normalized) ||
    /reducing damage received by/.test(normalized) ||
    /can reduce .* damage received/.test(normalized) ||
    /resistance.*damage received/.test(normalized)
  ) {
    return `damage-received:${normalized.match(/\d+(?:\.\d+)?%/)?.[0] ?? normalized}`;
  }
  if (/application is deterministic/.test(normalized)) {
    return 'deterministic-application';
  }
  return normalized;
}

function statusConditionExplanation(
  provider: Dragon,
  statusOutput: StatusOutputCapability,
  recipient: Dragon,
  output: Pick<OutputCapability, 'abilityId' | 'abilityName' | 'channel'>,
  dependencyLabel = statusLabel(statusOutput.statusId),
  conditionalFacts: { summary: string | null } = { summary: null },
  categoryFacts: { summary: string | null } = { summary: null },
  supplierFacts: { summary: string | null } = { summary: null },
  scheduleFacts: { summary: string | null } = { summary: null },
): string {
  if (conditionalFacts.summary || supplierFacts.summary || scheduleFacts.summary) {
    return composeSummarySentences(
      categoryFacts.summary ? `${provider.name} can apply ${statusLabel(statusOutput.statusId)}, ${categoryFacts.summary}.` : null,
      supplierFacts.summary,
      conditionalFacts.summary,
      scheduleFacts.summary,
    );
  }
  return `${provider.name} can apply ${statusLabel(statusOutput.statusId)}. ${recipient.name}'s ${output.abilityName} has a verified condition depending on ${dependencyLabel}.`;
}

function composeSummarySentences(...segments: Array<string | null | undefined>): string {
  const sentences: string[] = [];
  for (const segment of segments) {
    if (!segment) {
      continue;
    }
    for (const sentence of splitSummarySentences(segment)) {
      const normalized = normalizeSummarySentence(sentence);
      if (!normalized) {
        continue;
      }
      const previous = sentences[sentences.length - 1];
      if (previous && normalizeSummarySentence(previous) === normalized) {
        continue;
      }
      sentences.push(cleanSummarySentence(sentence));
    }
  }
  return sentences.join(' ');
}

function splitSummarySentences(value: string): string[] {
  return value.split(/(?<=\.)\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

function normalizeSummarySentence(value: string): string {
  return cleanSummarySentence(value).toLowerCase();
}

function cleanSummarySentence(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\.(?:\s*\.)+$/g, '.').trim();
}

function successfulStatusTriggerContext(
  modifier: ModifierCapability,
): { statusId: string; statusLabel: string; eventLabel: string } | null {
  const condition = modifier.conditions.find((item) => item.kind === 'successful-status-application');
  if (!condition) {
    return null;
  }
  const parsedStatus = condition.statusId ?? condition.description.match(/\b(Taunt|Stagger|Burn|Panic|Confusion|Overwhelm)\b/i)?.[1]?.toLowerCase() ?? null;
  if (!parsedStatus) {
    return null;
  }
  const label = statusLabel(parsedStatus);
  return {
    statusId: parsedStatus,
    statusLabel: label,
    eventLabel: `successful ${label} application`,
  };
}

function successfulStatusTriggerTargetFacts(
  providerName: string,
  trigger: { statusId: string; statusLabel: string },
): string[] {
  return [
    `Trigger event: each successful ${trigger.statusLabel} application by ${providerName}.`,
    `Trigger cardinality: once per successful ${trigger.statusLabel} application.`,
    `Affected target count: dynamic; derived from successful ${trigger.statusLabel} applications.`,
    `Result target: same enemy that received the successful ${trigger.statusLabel} application.`,
    `Multiple successful ${trigger.statusLabel} applications can affect multiple enemies.`,
  ];
}

function successfulStatusTargetSelectorSummary(trigger: { statusLabel: string }): string {
  return `enemy; same target as triggering ${trigger.statusLabel} application; dynamic target count derived from successful applications`;
}

function statusApplicationVerb(statusId: string): string {
  if (statusId === 'taunt') {
    return 'Taunts';
  }
  return `applies ${statusLabel(statusId)} to`;
}

function successfulStatusTriggerSupplierDetails(
  modifier: ModifierCapability,
  provider: Dragon,
  statusOutputs: StatusOutputCapability[],
  options: CapabilityOptions,
  trigger: { statusId: string; statusLabel: string },
): { facts: string[]; effects: string[] } {
  const qualifying = statusOutputs
    .filter((output) =>
      output.dragonId === modifier.dragonId &&
      output.statusId === trigger.statusId &&
      output.targetSide === 'enemy' &&
      statusCapabilityVisible(output, options),
    )
    .sort((left, right) => (left.sourceEffectId ?? left.id).localeCompare(right.sourceEffectId ?? right.id));
  const siblingExclusions = statusOutputs
    .filter((output) =>
      output.dragonId === modifier.dragonId &&
      output.abilityId !== null &&
      qualifying.some((qualified) => qualified.abilityId === output.abilityId) &&
      output.statusId !== trigger.statusId &&
      output.targetSide === 'enemy' &&
      statusCapabilityVisible(output, options),
    )
    .sort((left, right) => (left.sourceEffectId ?? left.id).localeCompare(right.sourceEffectId ?? right.id));
  const otherDragonMatchingStatus = statusOutputs.some((output) =>
    output.dragonId !== modifier.dragonId &&
    output.statusId === trigger.statusId &&
    output.targetSide === 'enemy' &&
    statusCapabilityVisible(output, options),
  );
  const supplierFacts = qualifying.flatMap((output) => {
    const context = sourceEffectContext(provider, output.abilityId, output.sourceEffectId);
    return [
      `Qualifying ${trigger.statusLabel} supplier: ${output.abilityName} - ${output.sourceEffectId ?? output.id}.`,
      ...statusTriggerSupplierPathFacts(output, context, options),
    ];
  });
  const exclusionFacts = siblingExclusions.map((output) =>
    `Excluded trigger branch: ${output.abilityName} - ${output.sourceEffectId ?? output.id} supplies ${statusLabel(output.statusId)}, not ${trigger.statusLabel}.`,
  );
  const effects = [
    ...qualifying.map((output) => `Qualifying trigger supplier: ${output.abilityName} - ${output.sourceEffectId ?? output.id}.`),
    ...exclusionFacts,
    otherDragonMatchingStatus ? `Non-${provider.name} ${trigger.statusLabel} suppliers do not qualify for ${modifier.abilityName}.` : null,
  ].filter((line): line is string => Boolean(line));
  return {
    facts: [
      ...supplierFacts,
      ...exclusionFacts,
      otherDragonMatchingStatus ? `Supplier source dragon restriction: only ${provider.name} ${trigger.statusLabel} applications qualify.` : null,
    ].filter((line): line is string => Boolean(line)),
    effects,
  };
}

function statusTriggerSupplierPathFacts(
  output: StatusOutputCapability,
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
  options: CapabilityOptions,
): string[] {
  if (!context) {
    return [];
  }
  const { ability, schedule, effect } = context;
  const level = output.requiredHabitLevel !== null
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(output, options))
    : null;
  const chance = output.chanceFixed !== null && output.chanceFixed !== undefined
    ? { value: output.chanceFixed, unit: 'percent' as const }
    : rankedValueForHabitLevel(output.chanceByHabitLevel, level);
  const chanceText = chance ? formatValue(chance.value, chance.unit) : null;
  const branchCondition = branchConditionFact(output);
  const target = branchCondition
    ? branchTargetPhrase(output)
    : targetCountPhrase(effect.targetCount ?? output.targetSelector.count, effect.target);
  const duration = output.untilEndOfRound
    ? 'Duration: until end of current round.'
    : durationDetail(effect);
  return [
    scheduleTimingDetail(schedule),
    chanceText ? `Trigger supplier chance: ${chanceText}${level ? ` at effective Habit Level ${level}` : ''}.` : null,
    `Trigger supplier target: ${target}.`,
    branchCondition,
    branchCondition ? 'Branch evaluation is target-level and mutually exclusive with sibling branches.' : null,
    duration,
    (effect.activationRoll?.unresolved || schedule.activationRoll?.unresolved) ? 'Trigger supplier roll scope is unresolved.' : null,
    `Trigger supplier ability kind: ${ability.kind}.`,
  ].filter((fact): fact is string => Boolean(fact));
}

function targetCountPhrase(count: number | null | undefined, fallback: string): string {
  if (count === 1) {
    return 'one enemy';
  }
  if (count !== null && count !== undefined) {
    return `${count} enemies`;
  }
  return fallback;
}

function targetSideNoun(side: CapabilityTargetSide, count: number | null | undefined): string {
  if (side === 'self') {
    return 'self';
  }
  const singular = side === 'ally' ? 'ally' : 'enemy';
  const plural = side === 'ally' ? 'allies' : 'enemies';
  if (count === 1) {
    return `one ${singular}`;
  }
  if (count !== null && count !== undefined) {
    return `${count} ${plural}`;
  }
  return `eligible ${plural}`;
}

function statusApplicationPhrase(status: string, side: CapabilityTargetSide, targetPhrase: string): string {
  if (side === 'self') {
    return `gain ${status}`;
  }
  const verb = side === 'ally' ? 'grant' : 'apply';
  return `${verb} ${status} to ${targetPhrase}`;
}

function selectedTargetUnresolvedFact(statusOutput: StatusOutputCapability): string | null {
  if (statusOutput.targetSide === 'enemy') {
    return 'Selected enemy identity is unresolved.';
  }
  if (statusOutput.targetSide === 'ally') {
    return 'Selected ally recipient is unresolved.';
  }
  return null;
}

function sharedAllyStatusSiblingFact(
  statusOutput: StatusOutputCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect },
  recipientResolved = false,
): string | null {
  if (statusOutput.targetSide !== 'ally') {
    return null;
  }
  const statusTarget = targetForEffect(context.effect);
  const sibling = context.schedule.effects.find((candidate) =>
    candidate !== context.effect &&
    targetSideForEffect(candidate) === 'ally' &&
    equivalentSelectedTarget(targetForEffect(candidate), statusTarget) &&
    equivalentSelectionDetails(candidate, context.effect),
  );
  if (!sibling) {
    return null;
  }
  return `${statusLabel(statusOutput.statusId)} and ${supportLabelForEffect(sibling)} share the ${recipientResolved ? 'resolved ally recipient' : 'selected ally'}.`;
}

function equivalentSelectedTarget(left: AbilityTarget, right: AbilityTarget): boolean {
  return left.side === right.side &&
    left.scope === right.scope &&
    left.selection === right.selection &&
    left.count === right.count &&
    left.includesCaster === right.includesCaster;
}

function equivalentSelectionDetails(left: AbilityEffect, right: AbilityEffect): boolean {
  return (left.targetPriority ?? null) === (right.targetPriority ?? null) &&
    (left.targetSelection?.preference ?? null) === (right.targetSelection?.preference ?? null) &&
    (left.targetSelection?.comparisonStat ?? null) === (right.targetSelection?.comparisonStat ?? null) &&
    (left.targetSelection?.comparisonDirection ?? null) === (right.targetSelection?.comparisonDirection ?? null) &&
    (left.targetSelection?.comparisonPool ?? null) === (right.targetSelection?.comparisonPool ?? null);
}

function supportLabelForEffect(effect: AbilityEffect): string {
  const damage = effect.type.match(/^(Fire|Physical|Tactical|Damage) Damage Dealt Up$/i)?.[1];
  if (damage) {
    return damage.toLowerCase() === 'damage' ? 'Damage support' : `${damage} Damage support`;
  }
  return `${formatEffectType(effect.type)} support`;
}

function allyRecipientResolutionBasis(effect: AbilityEffect): string | null {
  if (effect.targetPriority === 'prefer-fire-damage-ally') {
    return 'Recipient resolution basis: explicit Fire-output preference.';
  }
  if (effect.targetPriority) {
    return `Recipient resolution basis: ${formatEffectType(effect.targetPriority)}.`;
  }
  if (effect.targetSelection?.preference) {
    return `Recipient resolution basis: ${effect.targetSelection.preference}.`;
  }
  return null;
}

function allyStatusRecipientResolution(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutput: StatusOutputCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect } | null,
  candidateRecipientIds: string[],
): AllyStatusRecipientResolution | null {
  if (statusOutput.targetSide !== 'ally' || !context) {
    return null;
  }
  const providerPosition = positionOf(formation, statusOutput.dragonId);
  if (!providerPosition) {
    return {
      state: 'none',
      candidateIds: [],
      candidateNames: [],
      resolutionBasis: allyRecipientResolutionBasis(context.effect),
      activationUnresolved: statusChanceConditional(statusOutput),
      sharedAllyFact: sharedAllyStatusSiblingFact(statusOutput, context, false),
    };
  }
  const eligibleIds = uniqueOrdered(candidateRecipientIds).filter((recipientId) => {
    const recipientPosition = positionOf(formation, recipientId);
    return recipientPosition
      ? statusOutputTargetsFriendlyRecipient(statusOutput, context.effect, providerPosition, recipientPosition)
      : false;
  });
  const eligibleNames = eligibleIds.map((recipientId) => dragonById(dragons, recipientId)?.name ?? recipientId);
  const resolved = eligibleIds.length === 1 ? dragonById(dragons, eligibleIds[0]!) : null;
  const sharedAllyFact = sharedAllyStatusSiblingFact(statusOutput, context, Boolean(resolved));
  const base = {
    candidateIds: eligibleIds,
    candidateNames: eligibleNames,
    resolutionBasis: allyRecipientResolutionBasis(context.effect),
    activationUnresolved: statusChanceConditional(statusOutput),
    sharedAllyFact,
  };
  if (resolved) {
    return {
      state: 'resolved',
      recipientId: resolved.id,
      recipientName: resolved.name,
      ...base,
    };
  }
  if (eligibleIds.length > 1) {
    return {
      state: 'candidate-set',
      ...base,
    };
  }
  return {
    state: 'none',
    ...base,
  };
}

function sameDependencyForRecipientResolution(
  left: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  right: CapabilityDependency,
  statusId: string,
): boolean {
  return isStatusConditionDependency(right) &&
    right.type === left.type &&
    (right.statusId ?? null) === (left.statusId ?? null) &&
    (right.statusCategoryId ?? null) === (left.statusCategoryId ?? null) &&
    statusMatchesDependency(statusId, right);
}

function outputRecipientCandidatesForStatusDependency(
  formation: FormationAnalysisInput,
  outputs: OutputCapability[],
  statusOutput: StatusOutputCapability,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  options: CapabilityOptions,
): string[] {
  const selectedIds = selectedFormationDragonIds(formation);
  return uniqueOrdered(outputs
    .filter((candidate) =>
      selectedIds.has(candidate.dragonId) &&
      outputCapabilityVisible(candidate, options) &&
      candidate.dependencies.some((candidateDependency) =>
        sameDependencyForRecipientResolution(dependency, candidateDependency, statusOutput.statusId),
      ),
    )
    .map((candidate) => candidate.dragonId));
}

function statusEffectRecipientCandidatesForStatusDependency(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  statusOutput: StatusOutputCapability,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  options: CapabilityOptions,
): string[] {
  const selectedIds = selectedFormationDragonIds(formation);
  const recipientIds: string[] = [];
  for (const dragon of dragons.filter((candidate) => selectedIds.has(candidate.id))) {
    for (const ability of allAbilities(dragon)) {
      if (!capabilityVisible({
        dragonId: dragon.id,
        abilityId: ability.id,
        unlockStarRank: ability.unlockStarRank,
        minimumDragonLevel: ability.minimumDragonLevel,
        requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
        futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
      }, options)) {
        continue;
      }
      const hasMatchingDependency = ability.schedules.some((schedule) =>
        schedule.effects.flatMap(derivableEffects).some((effect) =>
          !outputChannelForEffect(effect) &&
          statusDependenciesForEffect(effect, schedule).some((candidateDependency) =>
            sameDependencyForRecipientResolution(dependency, candidateDependency, statusOutput.statusId),
          ),
        ),
      );
      if (hasMatchingDependency) {
        recipientIds.push(dragon.id);
      }
    }
  }
  return uniqueOrdered(recipientIds);
}

function recipientResolutionFacts(resolution: AllyStatusRecipientResolution | null): string[] {
  if (!resolution) {
    return [];
  }
  if (resolution.state === 'resolved') {
    return [
      `Resolved ally recipient: ${resolution.recipientName}.`,
      resolution.resolutionBasis,
      resolution.activationUnresolved ? 'Activation success is unresolved.' : null,
      resolution.sharedAllyFact,
    ].filter((fact): fact is string => Boolean(fact));
  }
  if (resolution.state === 'candidate-set') {
    return [
      `Eligible ally recipients: ${resolution.candidateNames.join(', ')}.`,
      resolution.activationUnresolved ? 'Activation success is unresolved.' : null,
      'Selected ally recipient is unresolved.',
      resolution.sharedAllyFact,
    ].filter((fact): fact is string => Boolean(fact));
  }
  return ['No eligible ally recipient is resolved for the supplied status.'];
}

function supplierFactsForRecipientResolution<T extends { facts: string[]; effects: string[]; summary: string | null }>(
  supplierFacts: T,
  resolution: AllyStatusRecipientResolution | null,
): T {
  if (!resolution || resolution.state !== 'resolved') {
    return supplierFacts;
  }
  return {
    ...supplierFacts,
    facts: supplierFacts.facts.filter((fact) => fact !== 'Selected ally recipient is unresolved.'),
  };
}

function formatEffectType(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function conditionalMultiplierValueFacts(
  output: OutputCapability,
  context: { schedule: AbilitySchedule; effect: AbilityEffect },
  statusId: string,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  options: CapabilityOptions,
  dependentRecipientName: string,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): { facts: string[]; effects: string[]; summary: string | null } {
  const { effect, schedule } = context;
  const multiplier = (effect.conditionalMultipliers ?? []).find((item) =>
    item.condition.statusId === statusId ||
    (item.condition.statusCategoryId ? statusMatchesCategory(statusId, item.condition.statusCategoryId) : false),
  );
  if (!multiplier) {
    return { facts: [], effects: [], summary: null };
  }
  const isHabitRankedOutput = output.requiredHabitLevel !== null;
  const level = isHabitRankedOutput
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(output, options))
    : null;
  const base = isHabitRankedOutput
    ? rankedValueForHabitLevel(effect.rankedValues, level)
    : effect.magnitude !== null
      ? { level: 0, value: effect.magnitude, unit: effect.unit === 'rate' ? 'percent' as const : effect.unit === 'percent' ? 'percent' as const : 'flat' as const }
      : undefined;
  const enhanced = isHabitRankedOutput
    ? multiplier.directlyVerifiedValues.find((value) => value.level === level)
    : multiplier.directlyVerifiedValues.length === 1
      ? multiplier.directlyVerifiedValues[0]
      : undefined;
  if (!base || !enhanced || (isHabitRankedOutput && level === null)) {
    return {
      facts: [`Conditional multiplier: ${multiplier.multiplier}x.`],
      effects: [`Conditional multiplier: ${multiplier.multiplier}x`],
      summary: null,
    };
  }
  const baseValue = formatValue(base.value, base.unit);
  const enhancedValue = formatValue(enhanced.value, enhanced.unit);
  const channel = channelLabel(output.channel);
  const eligibility = effect.conditions?.find((condition) => condition.kind === 'target-has-output-capability');
  const targetFact = receivingTargetFact(effect);
  const targetPhrase = receivingTargetPhrase(effect);
  const requiredLabel = dependency.statusCategoryId ? statusLabel(dependency.statusCategoryId) : statusLabel(statusId);
  const overlapRequirement = statusOverlapRequirementFacts(
    dependency,
    requiredLabel,
    output.abilityName,
    dependentRecipientName,
    dependentEffectDescription(output.channel, null),
    recipientResolution,
  );
  const basePrefix = isHabitRankedOutput ? 'Base current' : 'Base';
  const enhancedPrefix = isHabitRankedOutput ? 'Enhanced current' : 'Enhanced';
  const facts = [
    ...(level ? [`Current effective Habit Level: ${level}.`] : []),
    scheduleTimingDetail(schedule),
    `${basePrefix} ${channel} Rate: ${baseValue}.`,
    `${enhancedPrefix} ${channel} Rate: ${enhancedValue}.`,
    `Conditional multiplier: ${multiplier.multiplier}x.`,
    targetFact,
    `Required status ${dependency.statusCategoryId ? 'category' : 'condition'}: ${requiredLabel}.`,
    ...overlapRequirement.facts,
    ...(eligibility?.qualifyingOutput ? [
      `Qualifying enemy capability: ${eligibility.qualifyingOutput.description}.`,
    ] : []),
    ...(dependency.type === 'requires-target-status' || dependency.type === 'requires-target-status-category'
      ? [
          `${requiredLabel} does not alter normal ${output.abilityName} target eligibility.`,
          'Target eligibility remains independently required; the status condition does not make an ineligible enemy eligible.',
        ]
      : []),
  ].filter((fact): fact is string => Boolean(fact));
  const summaryLead = dependency.type === 'requires-any-enemy-status'
    ? `While at least one enemy has ${requiredLabel},`
    : dependency.type === 'requires-self-status'
      ? `When ${dependentRecipientName} has ${requiredLabel},`
      : `Against the same target while it has ${requiredLabel},`;
  return {
    facts,
    effects: [
      `${basePrefix} ${channel} Rate: ${baseValue}`,
      `${enhancedPrefix} ${channel} Rate: ${enhancedValue}`,
      `Conditional multiplier: ${multiplier.multiplier}x`,
    ],
    summary: `On ${scheduleTimingPhrase(schedule)}, ${output.abilityName} deals ${channel} at a ${baseValue} rate${targetPhrase ? ` to ${targetPhrase}` : ''}. ${summaryLead} the rate increases ${multiplier.multiplier}x to ${enhancedValue}.`,
  };
}

function conditionalChanceValueFacts(
  ability: AbilityDefinition,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  statusId: string,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  options: CapabilityOptions,
  dragonId: string,
  dependentRecipientName: string,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): { facts: string[]; effects: string[]; summary: string | null } {
  const condition = [
    ...(effect.activationRoll?.targetStatusConditionalChances ?? []),
    ...(schedule.activationRoll?.targetStatusConditionalChances ?? []),
  ].find((item) =>
    item.statusId === statusId ||
    (item.statusCategoryId ? statusMatchesCategory(statusId, item.statusCategoryId) : false),
  );
  if (!condition) {
    return { facts: [], effects: [], summary: null };
  }
  const level = ability.kind === 'habit'
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForAbility(dragonId, ability, options))
    : null;
  const base = fixedOrRankedChance(
    effect.activationRoll?.chanceFixed ?? schedule.activationRoll?.chanceFixed ?? schedule.triggerChanceFixed,
    effect.activationRoll?.chanceByHabitLevel.length
      ? effect.activationRoll.chanceByHabitLevel
      : schedule.activationRoll?.chanceByHabitLevel.length
        ? schedule.activationRoll.chanceByHabitLevel
        : schedule.triggerChanceByHabitLevel,
    level,
  );
  const enhanced = fixedOrRankedChance(condition.chanceFixed, condition.chanceByHabitLevel, level);
  if (!base || !enhanced) {
    return {
      facts: [`Conditional multiplier: ${condition.multiplier ?? dependency.multiplier ?? 'unknown'}x.`],
      effects: [`Conditional multiplier: ${condition.multiplier ?? dependency.multiplier ?? 'unknown'}x`],
      summary: null,
    };
  }
  const requiredLabel = dependency.statusCategoryId ? statusLabel(dependency.statusCategoryId) : statusLabel(statusId);
  const baseText = formatValue(base.value, base.unit);
  const enhancedText = formatValue(enhanced.value, enhanced.unit);
  const multiplier = condition.multiplier ?? dependency.multiplier ?? null;
  const baseChanceWording = chanceSummaryPrefix(base, level);
  const chanceLead = baseChanceWording ? `${baseChanceWording} ` : '';
  const targetFact = receivingTargetFact(effect);
  const targetPhrase = receivingTargetPhrase(effect);
  const vulnerableValue = effect.type === 'Vulnerable' && effect.magnitude !== null
    ? `Vulnerable value: generic Damage Received +${formatValue(effect.magnitude, effect.unit)}.`
    : null;
  const duration = durationDetail(effect);
  const durationSummary = effect.durationRounds ? `${effect.type} lasts ${effect.durationRounds} rounds.` : null;
  const unresolvedRollScope = (effect.activationRoll?.unresolved || schedule.activationRoll?.unresolved)
    ? 'Activation scope is unresolved between one shared roll and independent per-target rolls.'
    : null;
  const overlapRequirement = statusOverlapRequirementFacts(
    dependency,
    requiredLabel,
    ability.name,
    dependentRecipientName,
    dependentEffectDescription(null, effect.type),
    recipientResolution,
  );
  const facts = [
    ...(level ? [`Current effective ${ability.name} Habit Level: ${level}.`] : []),
    scheduleTimingDetail(schedule),
    targetFact,
    `Base current application chance: ${baseText}.`,
    `${statusLabel(statusId)}-target application chance: ${enhancedText}.`,
    `Current application chance: ${baseText} -> ${enhancedText}.`,
    multiplier ? `Conditional multiplier: ${multiplier}x.` : null,
    ...overlapRequirement.facts,
    ...(dependency.type === 'requires-target-status' || dependency.type === 'requires-target-status-category'
      ? [
          'The conditional chance modifier is target-specific.',
          `${requiredLabel} on one enemy does not change the chance for another enemy.`,
          `${requiredLabel} does not alter normal ${ability.name} target eligibility.`,
        ]
      : []),
    `Applied effect: ${effect.type}.`,
    vulnerableValue,
    duration,
    unresolvedRollScope,
  ].filter((fact): fact is string => Boolean(fact));
  const summaryLead = dependency.type === 'requires-any-enemy-status'
    ? `while at least one enemy has ${requiredLabel}`
    : dependency.type === 'requires-self-status'
      ? `while ${dependentRecipientName} has ${requiredLabel}`
      : `for that same target while it has ${requiredLabel}`;
  const chanceSubject = chanceLead ? `${chanceLead}the` : 'The';
  return {
    facts,
    effects: [
      `Base current application chance: ${baseText}`,
      `${statusLabel(statusId)}-target application chance: ${enhancedText}`,
      ...(multiplier ? [`Conditional multiplier: ${multiplier}x`] : []),
      `Applied effect: ${effect.type}`,
      ...(vulnerableValue ? [vulnerableValue] : []),
      ...(duration ? [duration] : []),
      ...(unresolvedRollScope ? [unresolvedRollScope] : []),
      ...(dependency.type === 'requires-target-status' || dependency.type === 'requires-target-status-category'
        ? ['Target-specific conditional chance']
        : []),
    ],
    summary: `Each round, ${ability.name} checks ${targetPhrase || effect.target}. ${chanceSubject} ${effect.type} application chance is ${baseText} for a normal target and ${enhancedText} ${summaryLead}${multiplier ? `, a ${dependency.type === 'requires-target-status' || dependency.type === 'requires-target-status-category' ? 'target-specific ' : ''}${multiplier}x increase` : ''}. ${effect.type === 'Vulnerable' && effect.magnitude !== null ? `Vulnerable increases generic Damage Received by ${formatValue(effect.magnitude, effect.unit)}. ` : ''}${durationSummary ?? ''}`.trim(),
  };
}

function fixedOrRankedChance(
  fixed: number | null | undefined,
  ranked: RankedValue[],
  level: 1 | 2 | 3 | 4 | 5 | null,
): { value: number; unit: RankedValue['unit']; isFixed: boolean } | null {
  if (fixed !== null && fixed !== undefined) {
    return { value: fixed, unit: 'percent', isFixed: true };
  }
  const rankedValue = rankedValueForHabitLevel(ranked, level);
  return rankedValue ? { value: rankedValue.value, unit: rankedValue.unit, isFixed: false } : null;
}

function chanceSummaryPrefix(
  chance: { isFixed: boolean },
  level: 1 | 2 | 3 | 4 | 5 | null,
): string {
  if (chance.isFixed) {
    return '';
  }
  return level ? `At effective Habit Level ${level},` : 'At the current effective Habit Level,';
}

function statusCategoryFacts(
  statusId: string,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
): { facts: string[]; effects: string[]; summary: string | null } {
  if (!dependency.statusCategoryId) {
    return { facts: [`Supplied status: ${statusLabel(statusId)}.`], effects: [`Supplied status: ${statusLabel(statusId)}`], summary: null };
  }
  const members = statusCategoryMembers[dependency.statusCategoryId] ?? [];
  const memberLabels = members.map(statusLabel);
  const category = statusLabel(dependency.statusCategoryId);
  const supplied = statusLabel(statusId);
  const isMember = statusMatchesCategory(statusId, dependency.statusCategoryId);
  return {
    facts: [
      `Supplied status: ${supplied}.`,
      `Required status category: ${category}.`,
      `Control category members: ${joinEnglishList(memberLabels)}.`,
      ...(isMember ? [`${supplied} is a verified member of ${category}.`] : []),
    ],
    effects: [
      `Supplied status: ${supplied}`,
      `Required status category: ${category}`,
      `${category} members: ${joinEnglishList(memberLabels)}`,
    ],
    summary: isMember ? `which belongs to the ${category} category` : null,
  };
}

function branchConditionFact(statusOutput: StatusOutputCapability): string | null {
  if (statusOutput.targetSide === 'self') {
    return null;
  }
  const condition = statusOutput.conditions.find((item) =>
    item.kind === 'target-has-status' || item.kind === 'target-lacks-status',
  );
  return condition ? `Branch condition: ${condition.description}` : null;
}

function branchTargetPhrase(statusOutput: StatusOutputCapability): string {
  const condition = statusOutput.conditions.find((item) =>
    item.kind === 'target-has-status' || item.kind === 'target-lacks-status',
  );
  if (condition?.kind === 'target-has-status' && condition.statusId) {
    return `enemies already afflicted with ${statusLabel(condition.statusId)}`;
  }
  if (condition?.kind === 'target-lacks-status' && condition.statusId) {
    return `enemies not already afflicted with ${statusLabel(condition.statusId)}`;
  }
  return statusOutput.targetSelector.count === 1
    ? 'one enemy'
    : statusOutput.targetSelector.count
      ? `${statusOutput.targetSelector.count} enemies`
      : 'eligible enemies';
}

function branchExclusionSummary(statusOutput: StatusOutputCapability): string | null {
  if (statusOutput.targetSide === 'self') {
    return null;
  }
  const condition = statusOutput.conditions.find((item) =>
    item.kind === 'target-has-status' || item.kind === 'target-lacks-status',
  );
  if (condition?.kind === 'target-has-status' && condition.statusId) {
    return `Enemies without ${statusLabel(condition.statusId)} take the alternate branch instead.`;
  }
  if (condition?.kind === 'target-lacks-status' && condition.statusId) {
    return `Enemies already afflicted with ${statusLabel(condition.statusId)} take the alternate branch instead.`;
  }
  return null;
}

function persistentTargetReferenceId(effect: AbilityEffect | null | undefined): string | null {
  return effect?.targetSelection?.references.find((reference) => reference.kind === 'persistent-selected-target')?.id ?? null;
}

function statusRuntimeConditionFacts(statusOutput: StatusOutputCapability, effect: AbilityEffect | null): string[] {
  const persistentReferenceId = persistentTargetReferenceId(effect);
  let persistentReferenceEmitted = false;
  return statusOutput.conditions.flatMap((condition) => {
    const isCurrentPreyCondition =
      condition.kind === 'target-is-prey' ||
      condition.statusId === 'prey' ||
      /\bprey\b/i.test(condition.description);
    if (!isCurrentPreyCondition) {
      return [`Runtime condition: ${condition.description}`];
    }
    const facts: string[] = [];
    const referenceId = persistentReferenceId ?? 'sheepstealer-current-prey';
    if (!persistentReferenceEmitted) {
      facts.push(`Persistent condition reference: ${referenceId}.`);
      persistentReferenceEmitted = true;
    }
    if (/above 50% Troop Capacity/i.test(condition.description)) {
      facts.push('Runtime condition: Current Prey is above 50% Troop Capacity.');
    }
    return facts;
  });
}

function statusSupplierFacts(
  statusOutput: StatusOutputCapability,
  context: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
  options: CapabilityOptions,
  relatedStatusOutputs: StatusOutputCapability[] = [statusOutput],
  recipientResolved = false,
): { facts: string[]; effects: string[]; summary: string | null } {
  if (!context) {
    return { facts: [], effects: [], summary: null };
  }
  const { ability, schedule, effect } = context;
  const conditionalChance = [
    ...(effect.activationRoll?.targetStatusConditionalChances ?? []),
    ...(schedule.activationRoll?.targetStatusConditionalChances ?? []),
  ][0] ?? null;
  if (conditionalChance) {
    const conditionalFacts = conditionalChanceValueFacts(
      ability,
      schedule,
      effect,
      conditionalChance.statusId ?? conditionalChance.statusCategoryId ?? statusOutput.statusId,
      {
        type: conditionalChance.statusCategoryId ? 'requires-target-status-category' : 'requires-target-status',
        statusId: conditionalChance.statusId ?? undefined,
        statusCategoryId: conditionalChance.statusCategoryId ?? undefined,
        multiplier: conditionalChance.multiplier ?? undefined,
        notes: [conditionalChance.description],
      },
      options,
      statusOutput.dragonId,
      ability.name,
    );
    return {
      facts: [`Supplied status: ${statusLabel(statusOutput.statusId)}.`, ...conditionalFacts.facts],
      effects: [`Supplied status: ${statusLabel(statusOutput.statusId)}`, ...conditionalFacts.effects],
      summary: conditionalFacts.summary,
    };
  }
  const targetEffect = primarySupplierTargetEffect(schedule, effect);
  const level = statusOutput.requiredHabitLevel !== null
    ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(statusOutput, options))
    : statusOutput.chanceByHabitLevel.length > 0
      ? (options.previewMaxRankInteractions ? 5 : 1)
      : null;
  const chance = statusOutput.chanceFixed !== null && statusOutput.chanceFixed !== undefined
    ? { value: statusOutput.chanceFixed, unit: 'percent' as const }
    : rankedValueForHabitLevel(statusOutput.chanceByHabitLevel, level);
  const chanceText = chance ? formatValue(chance.value, chance.unit) : null;
  const timing = scheduleTimingDetail(schedule);
  const persistentReferenceId = persistentTargetReferenceId(effect);
  const hasPersistentTargetReference = persistentReferenceId !== null;
  const branchCondition = hasPersistentTargetReference ? null : branchConditionFact(statusOutput);
  const branchExclusion = hasPersistentTargetReference ? null : branchExclusionSummary(statusOutput);
  const targetCount = hasPersistentTargetReference ? 1 : branchCondition ? null : targetEffect.targetCount ?? statusOutput.targetSelector.count;
  const targetText = branchCondition
    ? hasPersistentTargetReference
      ? 'the current marked target'
      : branchTargetPhrase(statusOutput)
    : hasPersistentTargetReference
      ? 'the current marked target'
      : targetSideNoun(statusOutput.targetSide, targetCount);
  const lane = targetEffect.targetScope ? `Lane scope: ${formatTargetScope(targetEffect.targetScope)}.` : null;
  const priority = targetEffect.targetPriority === 'prefer-warrior' ? 'Priority: Warriors are prioritized, not guaranteed.' : null;
  const duration = statusOutput.untilEndOfRound ? 'Duration: until end of current round.' : durationDetail(effect);
  const unresolvedRollScope = (effect.activationRoll?.unresolved || schedule.activationRoll?.unresolved)
    ? 'Activation scope is unresolved between one shared roll and independent per-target rolls.'
    : null;
  const confirmedRollDescription = effect.activationRoll?.description && !effect.activationRoll.unresolved
    ? effect.activationRoll.description
    : schedule.activationRoll?.description && !schedule.activationRoll.unresolved
      ? schedule.activationRoll.description
      : null;
  const perTargetFacts = perTargetCheckFacts(targetEffect, schedule, options);
  const sharedActivationGroup = activationGroupId(schedule, effect);
  const applicationFacts = statusApplicationResultFacts(statusOutput, recipientResolved, effect);
  const targetGraphFacts = [
    ...targetReferenceFacts(targetEffect),
    ...referencedEffectTargetReferenceFacts(schedule, targetEffect),
  ];
  const levelFacts = effectiveLevelFactsForStatusOutput(statusOutput, ability, level);
  const conditionalChanceFacts = statusConditionalChanceFacts(effect, chanceText, levelFacts.summaryPrefix);
  const facts = [
    `Supplied status: ${statusLabel(statusOutput.statusId)}.`,
    timing ? timing.replace(/^Timing:/, 'Activation timing:') : null,
    ...levelFacts.facts,
    `Target: ${targetText}.`,
    ...(hasPersistentTargetReference && statusOutput.targetSide === 'enemy' ? ['Target count: 1.'] : []),
    ...(hasPersistentTargetReference && persistentReferenceId ? [`Persistent target reference: ${persistentReferenceId}.`] : []),
    ...(statusOutput.targetSide === 'self' ? statusRuntimeConditionFacts(statusOutput, effect) : []),
    branchCondition,
    branchCondition ? `Branch target count: dynamic; only ${targetText} receive ${statusLabel(statusOutput.statusId)}.` : null,
    branchCondition ? 'Exactly one conditional branch applies per enemy.' : null,
    branchExclusion,
    lane,
    priority ?? targetPriorityFact(targetEffect),
    targetFallbackFact(targetEffect),
    duration,
    confirmedRollDescription,
    ...conditionalChanceFacts.facts,
    unresolvedRollScope,
    ...perTargetFacts,
    sharedActivationGroup ? `Shared activation group: ${sharedActivationGroup}.` : null,
    targetEffect.targetSelection?.sharedSelectionGroupId ? `Selected-target group: ${targetEffect.targetSelection.sharedSelectionGroupId}.` : null,
    ...targetGraphFacts,
    sharedTargetFact(ability, effect),
    ...applicationFacts.facts,
  ].filter((fact): fact is string => Boolean(fact));
  const lanePhrase = targetEffect.targetScope ? formatTargetScope(targetEffect.targetScope) : null;
  const targetWithLane = lanePhrase && !targetText.toLowerCase().includes(lanePhrase.toLowerCase())
    ? `${targetText}${/^within\b/i.test(lanePhrase) ? ` ${lanePhrase}` : ` in ${lanePhrase}`}`
    : targetText;
  const sortedRelatedStatusOutputs = relatedStatusOutputs
    .filter((candidate) =>
      candidate.dragonId === statusOutput.dragonId &&
      candidate.abilityId === statusOutput.abilityId &&
      candidate.statusId === statusOutput.statusId,
    )
    .slice()
    .sort((left, right) => (left.sourceEffectId ?? left.id).localeCompare(right.sourceEffectId ?? right.id));
  const relatedSummaries = sortedRelatedStatusOutputs.length > 1
    ? sortedRelatedStatusOutputs.map((output, index) => {
      const relatedLevel = output.requiredHabitLevel !== null
        ? (options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(output, options))
        : null;
      const relatedChance = output.chanceFixed !== null && output.chanceFixed !== undefined
        ? { value: output.chanceFixed, unit: 'percent' as const }
        : rankedValueForHabitLevel(output.chanceByHabitLevel, relatedLevel);
      const relatedChanceText = relatedChance ? formatValue(relatedChance.value, relatedChance.unit) : chanceText ?? 'unknown';
      const ordinal = index === 0 ? 'first' : index === 1 ? 'second' : `${index + 1}th`;
      return `${relatedChanceText} chance on the ${ordinal} added target${index === 1 ? ', which must differ from the first' : ''}`;
    })
    : [];
  const includeChanceFacts = relatedSummaries.length <= 1;
  const levelPrefix = level ? `At ${levelFacts.summaryPrefix}, ` : '';
  const branchSuffix = branchCondition
    ? ` ${branchExclusion ?? 'Sibling conditional branches are mutually exclusive.'}`
    : '';
  const statusDurationSummary = effect.durationRounds
    ? `${statusLabel(statusOutput.statusId)} lasts ${effect.durationRounds} rounds.`
    : statusOutput.untilEndOfRound
      ? `${statusLabel(statusOutput.statusId)} lasts until end of current round.`
      : '';
  const summary = chanceText
    ? (relatedSummaries.length > 1
      ? `${levelPrefix}${ability.name} can apply ${statusLabel(statusOutput.statusId)} ${scheduleTimingAdverb(schedule)}: ${relatedSummaries.join(' and ')}. ${statusLabel(statusOutput.statusId)} lasts ${effect.durationRounds ?? 'unknown'} rounds. ${statusLabel(statusOutput.statusId)} application and target overlap are not guaranteed.`
      : `${levelPrefix}${ability.name} has a ${chanceText} chance ${scheduleTimingAdverb(schedule)} to ${statusApplicationPhrase(statusLabel(statusOutput.statusId), statusOutput.targetSide, targetWithLane)}${targetEffect.targetPriority === 'prefer-warrior' ? ', prioritizing Warriors' : ''}. ${statusDurationSummary}${branchSuffix}`)
    : null;
  return {
    facts,
    effects: [
      ...levelFacts.effects,
      ...(hasPersistentTargetReference && statusOutput.targetSide === 'enemy' ? ['Target count: 1.'] : []),
      ...(hasPersistentTargetReference && persistentReferenceId ? [`Persistent target reference: ${persistentReferenceId}.`] : []),
      ...(includeChanceFacts && chanceText ? [`Status application chance: ${chanceText}${level ? ` at ${levelFacts.summaryPrefix}` : ''}.`] : []),
      ...conditionalChanceFacts.effects,
      ...(duration ? [duration] : []),
      ...(statusOutput.targetSide === 'self' ? statusRuntimeConditionFacts(statusOutput, effect) : []),
      ...(confirmedRollDescription ? [confirmedRollDescription] : []),
      ...(branchCondition ? [branchCondition, `Branch target count: dynamic; only ${targetText} receive ${statusLabel(statusOutput.statusId)}.`, 'Exactly one conditional branch applies per enemy.'] : []),
      ...(branchExclusion ? [branchExclusion] : []),
      ...(unresolvedRollScope ? [unresolvedRollScope] : []),
      ...perTargetFacts,
      ...(sharedActivationGroup ? [`Shared activation group: ${sharedActivationGroup}.`] : []),
      ...(priority ? [priority] : []),
      ...(targetPriorityFact(targetEffect) ? [targetPriorityFact(targetEffect)!] : []),
      ...(targetFallbackFact(targetEffect) ? [targetFallbackFact(targetEffect)!] : []),
      ...(targetEffect.targetSelection?.sharedSelectionGroupId ? [`Selected-target group: ${targetEffect.targetSelection.sharedSelectionGroupId}.`] : []),
      ...targetGraphFacts,
      ...(sharedTargetFact(ability, effect) ? [sharedTargetFact(ability, effect)!] : []),
      ...applicationFacts.effects,
    ],
    summary,
  };
}

function statusConditionalChanceFacts(
  effect: AbilityEffect,
  baseChanceText: string | null,
  levelPrefix: string,
): { facts: string[]; effects: string[] } {
  const chanceMultipliers = (effect.conditionalMultipliers ?? []).filter((multiplier) =>
    multiplier.condition.kind === 'previous-round-event' ||
    /chance/i.test(multiplier.description) ||
    /chance/i.test(multiplier.condition.description),
  );
  if (chanceMultipliers.length === 0) {
    return { facts: [], effects: [] };
  }
  const facts = chanceMultipliers.flatMap((multiplier) => {
    const enhancedChance = baseChanceText && Number.isFinite(multiplier.multiplier)
      ? `${formatValue(Number.parseFloat(baseChanceText) * multiplier.multiplier, 'percent')}`
      : null;
    return [
      `Conditional chance multiplier: ${multiplier.multiplier}x when ${lowercaseFirst(multiplier.condition.description.replace(/\.$/, ''))}.`,
      enhancedChance ? `Resulting activation chance under that condition: ${enhancedChance} at ${levelPrefix}.` : null,
    ].filter((fact): fact is string => Boolean(fact));
  });
  return {
    facts,
    effects: facts,
  };
}

function lowercaseFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function effectiveLevelFactsForStatusOutput(
  statusOutput: StatusOutputCapability,
  ability: AbilityDefinition,
  level: number | null,
): { facts: string[]; effects: string[]; summaryPrefix: string } {
  if (!level) {
    return { facts: [], effects: [], summaryPrefix: 'effective Habit Level unknown' };
  }
  if (statusOutput.effectiveOverrideSourceAbilityName) {
    return {
      facts: [
        `Base source ability: ${ability.name}.`,
        `Override source ability: ${statusOutput.effectiveOverrideSourceAbilityName}.`,
        `Effective ${statusOutput.effectiveOverrideSourceAbilityName} Habit Level: ${level}.`,
        statusOutput.effectiveOverrideDescription ? `Override rule: ${statusOutput.effectiveOverrideDescription}` : null,
      ].filter((fact): fact is string => Boolean(fact)),
      effects: [`Effective ${statusOutput.effectiveOverrideSourceAbilityName} Habit Level: ${level}`],
      summaryPrefix: `effective ${statusOutput.effectiveOverrideSourceAbilityName} Habit Level ${level}`,
    };
  }
  const facts = ability.kind === 'habit'
    ? [`Current effective ${ability.name} Habit Level: ${level}.`, `Supplier effective Habit Level: ${level}.`]
    : [`Supplier effective Habit Level: ${level}.`];
  return {
    facts,
    effects: [`Supplier effective Habit Level: ${level}`],
    summaryPrefix: `effective Habit Level ${level}`,
  };
}

function statusApplicationResultFacts(
  statusOutput: StatusOutputCapability,
  recipientResolved = false,
  effect: AbilityEffect | null = null,
): { facts: string[]; effects: string[] } {
  const status = statusLabel(statusOutput.statusId);
  const persistentTargetReference = (effect?.targetSelection?.references ?? []).some((reference) => reference.kind === 'persistent-selected-target');
  if (statusChanceConditional(statusOutput)) {
    if (statusOutput.targetSide === 'enemy') {
      if ((statusOutput.targetSelector.count ?? 1) > 1) {
        return {
          facts: [`${status} application success is unresolved.`],
          effects: [],
        };
      }
      return {
        facts: [
          `${status} application success is unresolved.`,
          persistentTargetReference ? 'Current marked-target identity is unresolved.' : selectedTargetUnresolvedFact(statusOutput),
        ].filter((fact): fact is string => Boolean(fact)),
        effects: [],
      };
    }
    if (statusOutput.targetSide === 'ally') {
      return {
        facts: [
          `${status} application success is unresolved.`,
          recipientResolved ? null : selectedTargetUnresolvedFact(statusOutput),
        ].filter((fact): fact is string => Boolean(fact)),
        effects: [],
      };
    }
    return {
      facts: [`${status} application success is unresolved.`],
      effects: [],
    };
  }
  if (statusOutput.conditions.length > 0) {
    return {
      facts: [`${status} application depends on conditional target state.`],
      effects: [`${status} application is conditional.`],
    };
  }
  if (statusOutput.targetSide === 'self') {
    return {
      facts: [`${status} application is deterministic once requirements are met.`],
      effects: [`${status} application is deterministic.`],
    };
  }
  return {
    facts: [persistentTargetReference ? 'Current marked-target identity is unresolved.' : selectedTargetUnresolvedFact(statusOutput)].filter((fact): fact is string => Boolean(fact)),
    effects: [],
  };
}

function statusConditionScheduleOverlapFacts(
  statusOutput: StatusOutputCapability,
  supplierContext: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
  dependentOutput: Pick<OutputCapability, 'abilityId' | 'abilityName' | 'channel' | 'statusId'>,
  dependentContext: { ability: AbilityDefinition; schedule: AbilitySchedule; effect: AbilityEffect } | null,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  dependentRecipientName: string,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): { facts: string[]; effects: string[]; summary: string | null; assumptions: string[] } {
  if (!supplierContext || !dependentContext || (!statusOutput.untilEndOfRound && !statusOutput.durationRounds)) {
    return { facts: [], effects: [], summary: null, assumptions: [] };
  }
  const dependentRounds = scheduleRoundsForOverlap(dependentContext.schedule);
  const maxDependentRound = dependentRounds ? Math.max(...dependentRounds) : null;
  const supplierRounds = scheduleRoundsForOverlap(supplierContext.schedule, maxDependentRound);
  if (!supplierRounds || !dependentRounds) {
    return { facts: [], effects: [], summary: null, assumptions: [] };
  }
  const status = statusLabel(statusOutput.statusId);
  const durationRounds = statusOutput.untilEndOfRound ? 1 : (statusOutput.durationRounds ?? 0);
  const overlapRequirement = statusOverlapRequirementFacts(
    dependency,
    status,
    dependentOutput.abilityName,
    dependentRecipientName,
    dependentOutput.statusId ? `${statusLabel(dependentOutput.statusId)} application` : dependentEffectDescription(dependentOutput.channel, null),
    recipientResolution,
  );
  if (isRecurringSchedule(supplierContext.schedule) && isRecurringSchedule(dependentContext.schedule)) {
    const recurringSummary = recurringScheduleOverlapSummary(
      status,
      supplierContext.ability.name,
      dependentOutput.abilityName,
      durationRounds,
    );
    return {
      facts: [
        `Supplier schedule: ${scheduleOverlapDescription(supplierContext.schedule, supplierRounds)}.`,
        `Dependent schedule: ${scheduleOverlapDescription(dependentContext.schedule, dependentRounds)}.`,
        `Recurring overlap pattern: ${recurringSummary.pattern}.`,
        `${status} duration: ${durationRounds > 1 ? `${durationRounds} rounds` : 'until end of current round'}.`,
        ...overlapRequirement.facts,
      ],
      effects: [
        `Supplier schedule: ${scheduleOverlapDescription(supplierContext.schedule, supplierRounds)}.`,
        `Dependent schedule: ${scheduleOverlapDescription(dependentContext.schedule, dependentRounds)}.`,
        recurringSummary.effect,
        `${status} duration: ${durationRounds > 1 ? `${durationRounds} rounds` : 'until end of current round'}.`,
        ...overlapRequirement.effects,
        'Action order within same-round overlap is unresolved.',
      ],
      summary: `${recurringSummary.summary} ${overlapRequirement.summary} Same-round action order is unresolved.`,
      assumptions: [
        'Within-round action order is not assumed.',
        ...overlapRequirement.assumptions,
      ],
    };
  }
  const overlapWindows = durationRounds > 1
    ? scheduleDurationOverlapWindows(supplierRounds, dependentRounds, durationRounds)
    : [];
  if (durationRounds > 1) {
    const windowsText = overlapWindows.length > 0 ? formatOverlapWindows(overlapWindows, supplierContext.ability.name, dependentOutput.abilityName) : 'none';
    return {
      facts: [
        `Supplier schedule: ${scheduleRoundDescription(supplierContext.schedule, supplierRounds)}.`,
        `Dependent schedule: ${scheduleRoundDescription(dependentContext.schedule, dependentRounds)}.`,
        `Known possible overlap windows: ${windowsText}.`,
        `${status} duration: ${durationRounds} rounds.`,
        ...overlapRequirement.facts,
      ],
      effects: [
        `Supplier schedule: ${scheduleRoundDescription(supplierContext.schedule, supplierRounds)}.`,
        `Dependent schedule: ${scheduleRoundDescription(dependentContext.schedule, dependentRounds)}.`,
        `Known possible overlap windows: ${windowsText}.`,
        `${status} duration: ${durationRounds} rounds.`,
        ...overlapRequirement.effects,
        ...(overlapWindows.some((window) => window.sameRound)
          ? ['Action order within same-round overlap is unresolved.']
          : []),
      ],
      summary: overlapWindows.length > 0
        ? `${supplierContext.ability.name}'s ${status} can overlap ${dependentOutput.abilityName} in these windows: ${windowsText}. ${overlapRequirement.summary} ${overlapWindows.some((window) => window.sameRound) ? 'Same-round action order is unresolved.' : ''}`.trim()
        : `${supplierContext.ability.name}'s ${status} duration has no known overlap with ${dependentOutput.abilityName}.`,
      assumptions: overlapWindows.length > 0
        ? [
            ...(overlapWindows.some((window) => window.sameRound) ? ['Within-round action order is not assumed.'] : []),
            ...overlapRequirement.assumptions,
          ]
        : [],
    };
  }
  const overlap = supplierRounds.filter((round) => dependentRounds.includes(round));
  const overlapText = overlap.length > 0 ? formatRounds(overlap) : 'none';
  return {
    facts: [
      `Supplier schedule: ${scheduleRoundDescription(supplierContext.schedule, supplierRounds)}.`,
      `Dependent schedule: ${scheduleRoundDescription(dependentContext.schedule, dependentRounds)}.`,
      `Schedule overlap: ${overlapText}${overlap.length === 1 ? ' only' : ''}.`,
      `${status} duration: until end of current round.`,
      ...overlapRequirement.facts,
      overlap.length > 0
        ? `${status} does not carry this interaction to ${formatRounds(dependentRounds.filter((round) => !overlap.includes(round)))}.`
        : `${status} duration does not overlap ${dependentOutput.abilityName}.`,
    ],
    effects: [
      `Supplier schedule: ${scheduleRoundDescription(supplierContext.schedule, supplierRounds)}.`,
      `Dependent schedule: ${scheduleRoundDescription(dependentContext.schedule, dependentRounds)}.`,
      `Schedule overlap: ${overlapText}${overlap.length === 1 ? ' only' : ''}.`,
      `${status} duration: until end of current round.`,
      ...overlapRequirement.effects,
      'Action order within the overlapping round is unresolved.',
    ],
    summary: overlap.length > 0
      ? `${supplierContext.ability.name}'s ${status} branch overlaps ${dependentOutput.abilityName} only on ${formatRounds(overlap)}; it must resolve before ${dependentOutput.abilityName}. ${overlapRequirement.summary} Action order within the overlapping round is unresolved.`
      : `${supplierContext.ability.name}'s ${status} branch has no same-round overlap with ${dependentOutput.abilityName}.`,
    assumptions: overlap.length > 0
      ? [
        'Within-round action order is not assumed.',
        ...overlapRequirement.assumptions,
      ]
      : [],
  };
}

function isRecurringSchedule(schedule: AbilitySchedule): boolean {
  return schedule.roundSelector?.kind === 'each-round' ||
    schedule.timing === 'each-round' ||
    schedule.timing === 'start-of-each-round';
}

function recurringScheduleOverlapSummary(
  status: string,
  supplierAbilityName: string,
  dependentAbilityName: string,
  durationRounds: number,
): { pattern: string; effect: string; summary: string } {
  if (durationRounds > 1) {
    const summary = `${supplierAbilityName} and ${dependentAbilityName} both check each round. ${status} from the previous round can still enhance ${dependentAbilityName} from Round 2 onward. A ${status} applied during the current round can enhance ${dependentAbilityName} only if ${supplierAbilityName} resolves first.`;
    return {
      pattern: `previous-round carryover from Round 2 onward; same-round overlap requires ${supplierAbilityName} before ${dependentAbilityName}`,
      effect: summary,
      summary,
    };
  }
  const summary = `${supplierAbilityName} and ${dependentAbilityName} both check each round. ${status} can enhance ${dependentAbilityName} during the current round only if ${supplierAbilityName} resolves first.`;
  return {
    pattern: `same-round overlap requires ${supplierAbilityName} before ${dependentAbilityName}`,
    effect: summary,
    summary,
  };
}

function statusOverlapRequirementFacts(
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  status: string,
  dependentAbilityName: string,
  dependentRecipientName: string,
  dependentEffect: string,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): { facts: string[]; effects: string[]; summary: string; assumptions: string[] } {
  if (dependency.type === 'requires-any-enemy-status') {
    return {
      facts: [
        `At least one enemy must have active ${status}.`,
        `${dependentAbilityName}'s friendly recipient is selected independently.`,
        `${dependentAbilityName} does not need to affect the same enemy that has ${status}.`,
      ],
      effects: [
        `At least one enemy must have active ${status}.`,
        `${dependentAbilityName}'s friendly recipient is selected independently.`,
        `${dependentAbilityName} does not require the same enemy to be selected.`,
      ],
      summary: `At least one enemy must still have active ${status}; application success, whether any enemy remains affected, and battlefield uptime remain unresolved.`,
      assumptions: ['Any-enemy battlefield status checks do not require a same-target match.'],
    };
  }
  if (dependency.type === 'requires-self-status') {
    if (recipientResolution?.state === 'resolved') {
      return {
        facts: [
          `${recipientResolution.recipientName} is the resolved recipient of ${status} if the supplier activates.`,
          `${recipientResolution.recipientName} must own the dependent ${dependentAbilityName} output.`,
          `${dependentAbilityName} benefits while ${recipientResolution.recipientName} has ${status}.`,
          `${status} and ${dependentAbilityName} share the resolved ally recipient when the interaction occurs.`,
        ],
        effects: [
          `${recipientResolution.recipientName} is the resolved recipient of ${status} if the supplier activates.`,
          `${dependentAbilityName} benefits while ${recipientResolution.recipientName} has ${status}.`,
        ],
        summary: `${recipientResolution.recipientName} is the resolved recipient of ${status} if the supplier activates; ${dependentAbilityName} benefits while ${recipientResolution.recipientName} has ${status}. Activation and uptime remain unresolved.`,
        assumptions: ['The ally status supplier and dependent output must share the resolved recipient.'],
      };
    }
    return {
      facts: [
        `${dependentRecipientName} must be the ally that received ${status}.`,
        `${status} and ${dependentAbilityName} share the same ally recipient when the interaction occurs.`,
      ],
      effects: [
        `${dependentRecipientName} must be the ally that received ${status}.`,
      ],
      summary: `${dependentRecipientName} must be the ally that received ${status}; activation, recipient selection, and uptime remain unresolved.`,
      assumptions: ['The ally status supplier and dependent output must share the same recipient.'],
    };
  }
  return {
    facts: [
      `${status} must be active on the same enemy that ${dependentAbilityName} checks for ${dependentEffect}.`,
      `${status} on one enemy does not enable ${dependentAbilityName} against a different enemy.`,
      `The supplied status and dependent ${dependentEffect} must involve the same enemy.`,
    ],
    effects: [
      `The supplied status and dependent ${dependentEffect} must involve the same enemy.`,
    ],
    summary: `${status} must remain active on the same enemy that ${dependentAbilityName} checks for ${dependentEffect}; application, enemy identity, same-enemy overlap, and uptime remain unresolved.`,
    assumptions: ['The status supplier and dependent effect must involve the same enemy.'],
  };
}

function dependentEffectDescription(channel: EffectChannel | null, effectType: string | null): string {
  if (effectType) {
    if (/Damage$/i.test(effectType)) {
      return 'damage output';
    }
    if (/Recovery/i.test(effectType)) {
      return 'Recovery effect';
    }
    if (statusIdForEffect({ type: effectType } as AbilityEffect)) {
      return `${effectType} application`;
    }
    if (/Damage Received|Damage Dealt|Received Down|Received Up|Dealt Down|Dealt Up/i.test(effectType)) {
      return 'defensive effect';
    }
    return `${effectType} effect`;
  }
  if (channel === 'recovery') {
    return 'Recovery effect';
  }
  if (channel === 'status') {
    return 'status application';
  }
  if (channel && /damage/i.test(channel)) {
    return 'damage output';
  }
  return 'effect';
}

function statusDependencyUnresolvedAssumption(
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  status: string,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): string {
  if (dependency.type === 'requires-any-enemy-status') {
    return `${status} application success, whether any enemy remains affected, and conditional uptime are unresolved.`;
  }
  if (dependency.type === 'requires-self-status') {
    if (recipientResolution?.state === 'resolved') {
      return `${status} activation and uptime are unresolved.`;
    }
    return `${status} activation, recipient selection, and uptime are unresolved.`;
  }
  return `${status} application success, enemy identity, same-target overlap, and conditional uptime are unresolved.`;
}

function statusDependencyUnresolvedQuestion(
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
  status: string,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): string {
  if (dependency.type === 'requires-any-enemy-status') {
    return `Exact ${status} battlefield uptime is unresolved.`;
  }
  if (dependency.type === 'requires-self-status') {
    if (recipientResolution?.state === 'resolved') {
      return `Exact ${status} activation and final uptime are unresolved.`;
    }
    return `Exact ${status} recipient and final uptime are unresolved.`;
  }
  return `Exact same-enemy ${status} overlap and final conditional uptime are unresolved.`;
}

function mitigationSourceScopeCompatible(
  modifierScope: CapabilitySourceScope,
  outputScope: CapabilitySourceScope,
): boolean {
  return modifierScope === 'unknown' || sourceScopesCompatible(modifierScope, outputScope);
}

function mitigationSourceScopeRequirement(modifier: ModifierCapability, output: OutputCapability): RequirementTrace {
  if (modifier.sourceScope === 'unknown') {
    return {
      id: `${modifier.id}-${output.id}-source-scope`,
      label: 'Source-scope compatibility',
      expected: 'No explicit source-scope restriction',
      actual: output.sourceScope,
      satisfied: true,
      evidenceIds: [...modifier.evidenceIds, ...output.evidenceIds],
      notes: ['Enemy mitigation stat reductions without explicit Basic/non-Basic wording apply to qualifying mitigated outputs.'],
    };
  }
  return sourceScopeRequirement(modifier, output);
}

export function scheduleRoundsForOverlap(schedule: AbilitySchedule, maxRoundHint: number | null = null): number[] | null {
  if (schedule.roundSelector?.kind === 'explicit' && schedule.rounds.length > 0) {
    return schedule.rounds;
  }
  if (schedule.roundSelector?.kind === 'start-of-round') {
    return [schedule.roundSelector.round];
  }
  if (schedule.roundSelector?.kind === 'range') {
    return range(schedule.roundSelector.startRound, schedule.roundSelector.endRound);
  }
  if (schedule.roundSelector?.kind === 'odd') {
    const maxRound = maxRoundHint ?? 10;
    return range(1, maxRound).filter((round) => round % 2 === 1);
  }
  if (schedule.roundSelector?.kind === 'even') {
    const maxRound = maxRoundHint ?? 10;
    return range(1, maxRound).filter((round) => round % 2 === 0);
  }
  if (schedule.roundSelector?.kind === 'each-round') {
    return range(1, maxRoundHint ?? 10);
  }
  if (schedule.timing === 'each-round' || schedule.timing === 'start-of-each-round') {
    return range(1, maxRoundHint ?? 10);
  }
  if (schedule.rounds.length > 0) {
    return schedule.rounds;
  }
  return null;
}

export function scheduleRoundDescription(schedule: AbilitySchedule, rounds: number[]): string {
  return formatScheduleDescription(schedule, { style: 'sentence' }) ?? formatRounds(rounds);
}

function scheduleOverlapDescription(schedule: AbilitySchedule, rounds: number[]): string {
  if (isRecurringSchedule(schedule)) {
    return 'Each round';
  }
  return scheduleRoundDescription(schedule, rounds);
}

export interface ScheduleOverlapWindow {
  dependentRound: number;
  supplierRound: number;
  sameRound: boolean;
  kind: 'carryover' | 'same-round-order-dependent';
}

export function scheduleDurationOverlapWindows(
  supplierRounds: number[],
  dependentRounds: number[],
  durationRounds: number,
): ScheduleOverlapWindow[] {
  return dependentRounds.flatMap((dependentRound) => {
    const carryover = supplierRounds
      .filter((supplierRound) => supplierRound < dependentRound && dependentRound < supplierRound + durationRounds)
      .at(-1);
    const sameRound = supplierRounds.includes(dependentRound) ? dependentRound : null;
    return [
      carryover === undefined
        ? null
        : { dependentRound, supplierRound: carryover, sameRound: false, kind: 'carryover' as const },
      sameRound === null
        ? null
        : { dependentRound, supplierRound: sameRound, sameRound: true, kind: 'same-round-order-dependent' as const },
    ].filter((window): window is ScheduleOverlapWindow => Boolean(window));
  });
}

function formatOverlapWindows(
  windows: ScheduleOverlapWindow[],
  supplierAbilityName: string,
  dependentAbilityName: string,
): string {
  return windows
    .map((window) =>
      window.sameRound
        ? `Round ${window.dependentRound} from a successful Round ${window.supplierRound} application only if ${supplierAbilityName} resolves before ${dependentAbilityName} that round`
        : `Round ${window.dependentRound} after a successful Round ${window.supplierRound} application`,
    )
    .join('; ');
}

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function formatRounds(rounds: number[]): string {
  if (rounds.length === 0) {
    return 'no rounds';
  }
  return `${rounds.length === 1 ? 'Round' : 'Rounds'} ${joinEnglishList(rounds.map(String))}`;
}

function primarySupplierTargetEffect(schedule: AbilitySchedule, effect: AbilityEffect): AbilityEffect {
  const sharedGroup = effect.targetSelection?.sharedSelectionGroupId;
  if (sharedGroup) {
    const grouped = schedule.effects.find((candidate) =>
      candidate !== effect &&
      candidate.targetSelection?.sharedSelectionGroupId === sharedGroup &&
      (candidate.targetPriority || candidate.targetCount || candidate.targetScope)
    );
    if (grouped) {
      return grouped;
    }
  }
  const references = effect.targetSelection?.references ?? [];
  const referenced = references.length === 1 && references[0]?.kind === 'same-target-as-effect'
    ? references[0].referencedEffectId
    : null;
  if (referenced) {
    return schedule.effects.find((candidate) => candidate.id === referenced) ?? effect;
  }
  return effect;
}

function effectiveHabitLevelForAbility(
  dragonId: string,
  ability: AbilityDefinition,
  options: CapabilityOptions,
) {
  if (ability.kind !== 'habit') {
    return null;
  }
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragonId);
  const rosterEntry = options.roster?.[dragonId];
  return resolveEffectiveHabitLevel({
    unlockStarRank: ability.unlockStarRank,
    starRank: rosterEntry?.starRank ?? observation?.starRank ?? null,
    savedLevel: rosterEntry?.habitLevels[ability.id],
  });
}

function receivingTargetFact(effect: AbilityEffect): string | null {
  const phrase = receivingTargetPhrase(effect);
  return phrase ? `Target scope: ${phrase}.` : null;
}

function receivingTargetPhrase(effect: AbilityEffect): string | null {
  const count = effect.targetCount ?? null;
  const explicitTarget = effect.target ?? null;
  if (explicitTarget && /ally|allies|self/i.test(explicitTarget)) {
    return explicitTarget;
  }
  if (effect.targetScope === 'within-adjacency' && count === 2) {
    return effect.type === 'Vulnerable' ? 'up to 2 adjacent enemies' : '2 adjacent enemies';
  }
  if (effect.targetScope === 'any-lane' && count === 3) {
    return '3 enemies in any lane';
  }
  if (effect.targetScope === 'any-lane' && count === 1) {
    return 'one enemy in any lane';
  }
  return explicitTarget;
}

function targetPriorityFact(effect: AbilityEffect): string | null {
  if (effect.targetPriority === 'prefer-right-flank') {
    return 'Priority: enemy Right Flank is preferred, not guaranteed.';
  }
  if (effect.targetPriority === 'prefer-left-flank') {
    return 'Priority: enemy Left Flank is preferred, not guaranteed.';
  }
  if (effect.targetPriority === 'prefer-warrior') {
    return 'Priority: Warriors are prioritized, not guaranteed.';
  }
  return null;
}

function targetFallbackFact(effect: AbilityEffect): string | null {
  const fallback = effect.targetSelection?.fallback;
  return fallback ? `Fallback target: ${fallback}; fallback selection is not guaranteed.` : null;
}

function targetReferenceFacts(effect: AbilityEffect): string[] {
  return (effect.targetSelection?.references ?? []).map((reference) =>
    `Target reference ${reference.id}: ${reference.description}${reference.referencedEffectId ? ` References source effect ${reference.referencedEffectId}.` : ''}`,
  );
}

function referencedEffectTargetReferenceFacts(schedule: AbilitySchedule, effect: AbilityEffect): string[] {
  const referencedIds = uniqueOrdered((effect.targetSelection?.references ?? [])
    .map((reference) => reference.referencedEffectId)
    .filter((id): id is string => Boolean(id)));
  return referencedIds.flatMap((referencedId) => {
    const referencedEffect = schedule.effects.flatMap(derivableEffects).find((candidate) => candidate.id === referencedId);
    return referencedEffect ? targetReferenceFacts(referencedEffect) : [];
  });
}

function perTargetCheckFacts(
  effect: AbilityEffect,
  schedule: AbilitySchedule,
  options: CapabilityOptions,
): string[] {
  if (!effect.perTargetEffectCheck && effect.activationRoll?.scope !== 'independent-per-target') {
    return [];
  }
  const referenceCount = effect.targetSelection?.references.length ?? 0;
  const targetCount = effect.perTargetEffectCheck?.targetCount ??
    (effect.activationRoll?.scope === 'independent-per-target' && referenceCount > 1 ? referenceCount : targetForEffect(effect).count);
  const level = options.previewMaxRankInteractions ? 5 : null;
  const chance = effect.activationRoll?.chanceFixed ??
    rankedValueForHabitLevel(effect.activationRoll?.chanceByHabitLevel ?? [], level ?? 1)?.value ??
    schedule.activationRoll?.chanceFixed ??
    rankedValueForHabitLevel(schedule.activationRoll?.chanceByHabitLevel ?? [], level ?? 1)?.value ??
    schedule.triggerChanceFixed ??
    null;
  const chanceLevel = effect.activationRoll?.chanceByHabitLevel.length ? (level ?? 1) : null;
  return [
    targetCount !== null ? `Independent per-target checks: ${targetCount}.` : 'Independent per-target checks: target count unresolved.',
    chance !== null ? `Per-target check chance: ${chance}%${chanceLevel ? ` at effective Habit Level ${chanceLevel}` : ''}.` : null,
    effect.activationRoll?.scope === 'independent-per-target' ? 'Checks are independent; chances are not combined into one roll.' : null,
  ].filter((fact): fact is string => Boolean(fact));
}

function sharedTargetFact(ability: AbilityDefinition, effect: AbilityEffect): string | null {
  const references = effect.targetSelection?.references ?? [];
  const targetCount = effect.perTargetEffectCheck?.targetCount ?? targetForEffect(effect).count;
  const occupiedReferenceCount = targetCount ?? references.length;
  const sameTargetReferences = references.filter((reference) => reference.kind === 'same-target-as-effect' && reference.referencedEffectId);
  if (
    references.length > 0 &&
    sameTargetReferences.length === references.length &&
    sameTargetReferences.length === occupiedReferenceCount &&
    uniqueOrdered(sameTargetReferences.map((reference) => reference.referencedEffectId).filter((id): id is string => Boolean(id))).length === 1
  ) {
    return `${ability.name} effect ${effect.id} uses the same selected target as ${sameTargetReferences[0]!.referencedEffectId}.`;
  }
  const distinctReferences = references.filter((reference) => reference.kind === 'distinct-from-effect-target' && reference.referencedEffectId);
  if (
    references.length > 0 &&
    distinctReferences.length === references.length &&
    distinctReferences.length === occupiedReferenceCount &&
    uniqueOrdered(distinctReferences.map((reference) => reference.referencedEffectId).filter((id): id is string => Boolean(id))).length === 1
  ) {
    return `${ability.name} effect ${effect.id} must target a different enemy than ${distinctReferences[0]!.referencedEffectId}.`;
  }
  if (effect.targetSelection?.sharedSelectionGroupId) {
    return `${ability.name} effect ${effect.id} uses selected-target group ${effect.targetSelection.sharedSelectionGroupId}.`;
  }
  return null;
}

function scheduleTimingPhrase(schedule: AbilitySchedule): string {
  return formatScheduleDescription(schedule, { style: 'inline' }) ?? schedule.timing.replaceAll('-', ' ');
}

function scheduleTimingAdverb(schedule: AbilitySchedule): string {
  if (schedule.roundSelector?.kind === 'each-round') {
    return 'each round';
  }
  const phrase = scheduleTimingPhrase(schedule);
  return /^rounds|^start|^odd|^even/i.test(phrase) ? `on ${phrase}` : phrase;
}

function formatTargetScope(scope: AbilityEffect['targetScope']): string {
  if (scope === 'any-lane') {
    return 'any lane';
  }
  if (scope === 'within-adjacency') {
    return 'within adjacency';
  }
  if (scope === 'same-lane') {
    return 'same lane';
  }
  return scope.replaceAll('-', ' ');
}

function formatPosition(position: FormationPosition): string {
  return position
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusConditionAssumptions(
  statusOutput: StatusOutputCapability,
  output: OutputCapability,
  recipientResolution: AllyStatusRecipientResolution | null = null,
): string[] {
  const assumptions: string[] = [];
  if (statusOutput.chanceFixed !== null) {
    assumptions.push(`Status application has a ${statusOutput.chanceFixed}% trigger chance.`);
  }
  if (statusOutput.chanceByHabitLevel.length > 0) {
    assumptions.push('Status application chance depends on Habit Level.');
  }
  if (
    recipientResolution?.state !== 'resolved' &&
    (statusOutput.targetSelector.selection === 'any' || statusOutput.targetSelector.selection === 'eligible')
  ) {
    assumptions.push('Target selection may choose another eligible target.');
  }
  if (output.conditions.length > 0) {
    assumptions.push(...output.conditions.map((condition) => condition.description));
  }
  return assumptions;
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
  options,
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
  options: CapabilityOptions;
}): AmplificationSynergyTrace {
  const status = aggregateStatus(matches.map((match) => match.status));
  const matchedOutputCapabilityIds = matches.map((match) => match.outputCapabilityId);
  const dedupedRequirements = dedupeRequirements(requirements);
  const context = sourceEffectContext(provider, modifier.abilityId, modifier.sourceEffectId);
  const stackDetails = context?.effect.stack
    ? stackModifierDetailLines(modifier, context.schedule, context.effect, options)
    : [];
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
    requirements: dedupedRequirements,
    matchedFacts: [
      `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
      ...(modifier.statusId ? [`Status semantic: ${statusLabel(modifier.statusId)}.`] : []),
      ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
      ...(modifier.activationGroupId ? [`Shared activation group: ${modifier.activationGroupId}.`] : []),
      ...(modifierSourceScopeFact(modifier) ? [modifierSourceScopeFact(modifier)!] : []),
      ...modifier.conditions.map((condition) => condition.description),
      ...activationChanceFacts(modifier, options),
      ...stackDetails,
      ...matches.map((match) => `Matched ${match.outputCapabilityId}.`),
    ],
    effects: [
      modifierEffectValueLine(modifier, options),
      ...(modifierSourceScopeFact(modifier) ? [modifierSourceScopeFact(modifier)!] : []),
      ...modifier.conditions.map((condition) => condition.description),
      ...activationChanceFacts(modifier, options),
      ...stackDetails,
      ...(modifier.durationRounds ? [`Duration: ${modifier.durationRounds} rounds.`] : []),
    ],
    conflicts: dedupedRequirements
      .filter((requirement) => requirement.satisfied === false)
      .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
    assumptions,
    unresolvedQuestions,
    sourceEvidenceIds: modifier.evidenceIds,
    recipientEvidenceIds: matches.flatMap((match) => match.requirements.flatMap((requirement) => requirement.evidenceIds)),
    providedEffectType: matchKind === 'incoming-effect-amplification' ? channelLabel(modifier.channel) : null,
    recipientModifierType: matchKind === 'incoming-effect-amplification' ? `${directedChannelLabel(modifier.channel, 'received')} Up` : null,
    recipientModifierAbilityId: modifier.abilityId,
    recipientModifierValue: modifierResolvedValue(modifier, options),
    combatLogConfirmed: modifier.combatLogConfirmed || matches.some((match) => match.confidence === 'confirmed'),
    exactResultKnown: false,
    exactResultUnknownReason: exactUnknownReason(modifier, matchKind),
    matchKind,
    channel: modifier.channel,
    modifierRole: modifier.role,
    targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
    modifierSelfOnly: modifier.role === 'self-amplification' || modifier.targetSelector.selection === 'self',
    availabilityContext: modifier.availability.reportLabel,
    modifierCapabilityId: modifier.id,
    modifierCapabilityIds: [modifier.id],
    matchedOutputCapabilityIds,
    sourceScopeResults: matches,
    interactionScope: interactionScopeForTrace(provider.id, recipient.id, matchKind),
    damageScope: modifier.damageScope,
    modifier,
  };
}

function modifierCapabilitiesForEffect(
  dragon: Dragon,
  ability: AbilityDefinition,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
): ModifierCapability[] {
  if (effect.effectOptions?.mode === 'one-of') {
    return exclusiveOptionModifierCapabilities(dragon, ability, schedule, effect);
  }
  const modifiers: ModifierCapability[] = [];
  const damageChannel = modifierChannelForEffect(effect);
  if (damageChannel) {
    modifiers.push(
      baseModifier(
        dragon,
        ability,
        schedule,
        effect,
        damageChannel,
        modifierDirectionForEffect(effect),
      ),
    );
  }
  modifiers.push(...statusSemanticModifiersForEffect(dragon, ability, schedule, effect));
  if (effect.type === 'Stolen Flock' && effect.stack?.statusId === 'stolen-flock') {
    modifiers.push({
      ...baseModifier(dragon, ability, schedule, effect, 'fire-damage', 'dealt'),
      id: `${ability.id}-${effect.id}-fire-damage-stack-modifier`,
      label: `${ability.name}: Fire Damage Dealt per Stolen Flock stack`,
      role: 'self-amplification',
      value: stackValuePerStack(effect.stack),
      rankedValues: effect.stack.valuePerStackByHabitLevel,
      unit: 'stack',
      sourceScope: 'all-qualifying-sources',
      stackMaximum: effect.stack.maximumStacks,
      valuePerStack: stackValuePerStack(effect.stack),
      conditional: true,
    });
  }
  if (effect.type === 'Rallying Flame' && effect.stack?.statusId === 'rallying-flame') {
    modifiers.push({
      ...baseModifier(dragon, ability, schedule, effect, 'physical-damage', 'dealt'),
      id: `${ability.id}-${effect.id}-physical-damage-stack-modifier`,
      label: `${ability.name}: Physical Damage Dealt per Rallying Flame stack`,
      role: 'self-amplification',
      value: stackValuePerStack(effect.stack),
      rankedValues: effect.stack.valuePerStackByHabitLevel,
      unit: 'stack',
      sourceScope: 'all-qualifying-sources',
      stackMaximum: effect.stack.maximumStacks,
      valuePerStack: stackValuePerStack(effect.stack),
      conditional: true,
    });
  }
  if (effect.type === 'Spreading Blaze' && effect.stack?.statusId === 'spreading-blaze') {
    modifiers.push({
      ...baseModifier(dragon, ability, schedule, effect, 'tactical-damage', 'dealt'),
      id: `${ability.id}-${effect.id}-tactical-damage-stack-modifier`,
      label: `${ability.name}: Tactical Damage Dealt per Spreading Blaze stack`,
      value: effect.stack.valuePerStackFixed,
      rankedValues: effect.stack.valuePerStackByHabitLevel,
      unit: 'stack',
      sourceScope: 'all-qualifying-sources',
      targetSelector: targetForEffect(effect),
      stackMaximum: effect.stack.maximumStacks,
      valuePerStack: stackValuePerStack(effect.stack),
      conditional: true,
      conditions: [
        ...conditionsForEffect(effect, schedule),
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

function exclusiveOptionModifierCapabilities(
  dragon: Dragon,
  ability: AbilityDefinition,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
): ModifierCapability[] {
  const effectOptions = effect.effectOptions;
  if (!effectOptions) {
    return [];
  }
  const channel = modifierChannelForEffect(effect);
  if (!channel) {
    return [];
  }
  const parent = {
    ...baseModifier(dragon, ability, schedule, effect, channel, modifierDirectionForEffect(effect)),
    id: `${ability.id}-${effect.id}-${channel}-${modifierDirectionForEffect(effect)}-exclusive-choice-modifier`,
    damageScope: null,
    conditional: false,
    conditions: conditionsForEffect(effect, schedule).filter((condition) => !/-activation-chance$/.test(condition.id)),
  };
  const optionModifiers = effectOptions.options.flatMap((option) => {
    const optionChannel = modifierChannelForEffect(option.effect);
    if (!optionChannel) {
      return [];
    }
    return [{
      ...baseModifier(dragon, ability, schedule, option.effect, optionChannel, modifierDirectionForEffect(option.effect)),
      id: `${ability.id}-${option.effect.id}-${optionChannel}-${modifierDirectionForEffect(option.effect)}-exclusive-option-modifier`,
      conditional: true,
      conditions: uniqueConditions([
        ...conditionsForEffect(option.effect, schedule),
        {
          id: `${effect.id}-${option.id}-exclusive-one-of-selection`,
          label: 'Exclusive one-of selection',
          description: `${option.label} depends on the exclusive one-of selection from ${ability.name}.`,
          evidenceIds: ability.evidenceIds,
          unresolved: effectOptions.selectorMethod === 'unknown',
        },
      ]),
    }];
  });
  return [parent, ...optionModifiers];
}

function statusSemanticModifiersForEffect(
  dragon: Dragon,
  ability: AbilityDefinition,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
): ModifierCapability[] {
  const semantic = statusModifierSemantic(effect);
  if (!semantic) {
    return [];
  }
  return [baseModifier(dragon, ability, schedule, effect, 'damage-dealt', 'dealt')].map((modifier) => ({
    ...modifier,
    id: `${ability.id}-${effect.id}-${semantic.statusId}-damage-dealt-status-modifier`,
    label: `${ability.name}: ${statusLabel(semantic.statusId)} ${semantic.operation === 'increase' ? 'Damage Dealt increase' : 'Damage Dealt reduction'}`,
    operation: semantic.operation,
    sourceScope: 'all-qualifying-sources',
    value: effect.magnitude,
    rankedValues: effect.rankedValues.length > 0 ? effect.rankedValues : commonEffectOptionRankedValues(effect),
    unit: effect.unit === 'percent' ? 'percent' : 'unknown',
    statusId: semantic.statusId,
    conditions: [
      ...conditionsForEffect(effect, schedule),
      {
        id: `${effect.id}-${semantic.statusId}-semantic-status-modifier`,
        label: `${statusLabel(semantic.statusId)} status semantics`,
        description: `${statusLabel(semantic.statusId)} ${semantic.operation === 'increase' ? 'increases' : 'reduces'} Damage Dealt according to the verified status glossary.`,
        evidenceIds: ability.evidenceIds,
        unresolved: false,
      },
    ],
  }));
}

function statusModifierSemantic(effect: AbilityEffect): { statusId: string; operation: 'increase' | 'decrease' } | null {
  const statusId = statusIdForEffect(effect);
  if (!statusId) {
    return null;
  }
  const entry = statusGlossary.find((item) => item.id === statusId);
  if (!entry || entry.verification === 'unresolved') {
    return null;
  }
  if (/increases?\s+damage dealt/i.test(entry.definition)) {
    return { statusId, operation: 'increase' };
  }
  if (/reduces?\s+damage dealt/i.test(entry.definition)) {
    return { statusId, operation: 'decrease' };
  }
  return null;
}

function extraActionSemanticForStatus(statusId: string): {
  actionType: ExtraActionCapability['actionType'];
  triggerEvent: ExtraActionCapability['triggerEvent'];
  definition: string;
} | null {
  const entry = statusGlossary.find((item) => item.id === statusId);
  if (!entry || entry.verification === 'unresolved') {
    return null;
  }
  if (/\b(second|additional|extra)\s+Basic Attack\b/i.test(entry.definition)) {
    return {
      actionType: 'basic-attack',
      triggerEvent: 'after-basic-attack',
      definition: entry.definition,
    };
  }
  return null;
}

function baseModifier(
  dragon: Dragon,
  ability: AbilityDefinition,
  schedule: AbilitySchedule,
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
    operation: modifierOperationForEffect(effect),
    value: effect.magnitude,
    rankedValues: effect.rankedValues.length > 0 ? effect.rankedValues : commonEffectOptionRankedValues(effect),
    unit: effect.unit === 'percent' ? 'percent' : effect.unit === 'flat' ? 'flat' : 'unknown',
    damageScope: defensiveDamageScopeForEffect(effect),
    sourceScope: capabilitySourceScope(effect.sourceScope, effect),
    targetSelector: targetForEffect(effect),
    providerRequirements: requirementDefinitionsForAbility(ability),
    recipientRequirements: [],
    unlockStarRank: ability.unlockStarRank,
    minimumDragonLevel: ability.minimumDragonLevel,
    requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
    conditional: effectIsConditional(schedule, effect),
    conditions: conditionsForEffect(effect, schedule),
    stackMaximum: effect.stack?.maximumStacks ?? null,
    valuePerStack: effect.stack?.valuePerStackFixed ?? null,
    currentlyAvailable: ability.unlockStarRank === null || ability.unlockStarRank <= 1,
    futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
    availability: availabilityContext(dragon.id, ability.unlockStarRank, ability.minimumDragonLevel),
    directlyVerified: effect.directlyVerified !== false,
    combatLogConfirmed: ability.evidenceIds.some((id) => id.includes('combat-log')),
    confidence: confidenceForAbility(ability),
    evidenceIds: ability.evidenceIds,
    sourceEffectId: effect.id,
    statusId: statusIdForEffect(effect),
    activationGroupId: activationGroupId(schedule, effect),
    activationChanceFixed: effect.activationRoll?.chanceFixed ?? schedule.activationRoll?.chanceFixed ?? schedule.triggerChanceFixed,
    activationChanceByHabitLevel: activationChanceByHabitLevel(schedule, effect),
    durationRounds: effect.durationRounds,
  };
}

function stackValuePerStack(stack: StackConfiguration): number | null {
  return stack.valuePerStackFixed ?? rankedValueForHabitLevel(stack.valuePerStackByHabitLevel, 1)?.value ?? null;
}

function activationGroupId(schedule: AbilitySchedule, effect: AbilityEffect): string | null {
  if (scheduleHasSharedActivation(schedule)) {
    return effect.targetSelection?.sharedSelectionGroupId?.includes('shared-roll') === true
      ? effect.targetSelection.sharedSelectionGroupId
      : `${schedule.id}-shared-activation`;
  }
  return effect.targetSelection?.sharedSelectionGroupId ?? null;
}

function scheduleHasSharedActivation(schedule: AbilitySchedule): boolean {
  return schedule.activationRoll?.scope === 'schedule-shared' ||
    (!schedule.activationRoll && Boolean(schedule.triggerChanceFixed !== null || schedule.triggerChanceByHabitLevel.length > 0));
}

function activationChanceByHabitLevel(schedule: AbilitySchedule, effect: AbilityEffect): RankedValue[] {
  if (effect.activationRoll?.chanceByHabitLevel.length) {
    return effect.activationRoll.chanceByHabitLevel;
  }
  if (schedule.activationRoll?.chanceByHabitLevel.length) {
    return schedule.activationRoll.chanceByHabitLevel;
  }
  return schedule.triggerChanceByHabitLevel;
}

function commonEffectOptionRankedValues(effect: AbilityEffect): RankedValue[] {
  const optionValues = effect.effectOptions?.options.map((option) => option.effect.rankedValues) ?? [];
  if (optionValues.length === 0 || optionValues.some((values) => values.length === 0)) {
    return [];
  }
  const [first, ...rest] = optionValues;
  return rest.every((values) => JSON.stringify(values) === JSON.stringify(first)) ? first! : [];
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
  if (effect.type === 'Burn') {
    return 'fire-damage';
  }
  if (effect.type === 'Panic') {
    return 'tactical-damage';
  }
  if (effect.type === 'Recovery') {
    return 'recovery';
  }
  return null;
}

function outputKindForEffect(effect: AbilityEffect, channel: EffectChannel): OutputCapability['outputKind'] {
  if (statusIdForEffect(effect)) {
    return 'status-application';
  }
  if (channel === 'recovery') {
    return 'recovery';
  }
  if (isDamageChannel(channel)) {
    return 'direct-damage';
  }
  return 'other';
}

function isDamageChannel(channel: EffectChannel): boolean {
  return channel === 'physical-damage' || channel === 'tactical-damage' || channel === 'fire-damage';
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
    ...(effect.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({
      type: condition.statusCategoryId ? 'requires-target-status-category' as const : 'requires-target-status' as const,
      statusId: condition.statusId ?? undefined,
      statusCategoryId: condition.statusCategoryId ?? undefined,
      multiplier: condition.multiplier ?? undefined,
      notes: [condition.description],
    })),
  ];
  return dedupeDependencies(dependencies);
}

function statusDependenciesForEffect(effect: AbilityEffect, schedule: AbilitySchedule): Array<CapabilityDependency & {
  type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category';
}> {
  return dedupeDependencies([
    ...(effect.conditionalMultipliers ?? []).flatMap((multiplier) =>
      dependencyForCondition(multiplier.condition, multiplier.multiplier),
    ),
    ...(effect.conditions ?? []).flatMap((condition) => dependencyForCondition(condition)),
    ...(effect.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({
      type: condition.statusCategoryId ? 'requires-target-status-category' as const : 'requires-target-status' as const,
      statusId: condition.statusId ?? undefined,
      statusCategoryId: condition.statusCategoryId ?? undefined,
      multiplier: condition.multiplier ?? undefined,
      notes: [condition.description],
    })),
    ...(schedule.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({
      type: condition.statusCategoryId ? 'requires-target-status-category' as const : 'requires-target-status' as const,
      statusId: condition.statusId ?? undefined,
      statusCategoryId: condition.statusCategoryId ?? undefined,
      multiplier: condition.multiplier ?? undefined,
      notes: [condition.description],
    })),
  ]).filter(isStatusConditionDependency);
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
  condition: {
    kind: string;
    statusId: string | null;
    statusCategoryId?: string | null;
    qualifyingOutput?: { channel: string; sourceScope: EffectSourceScope; description: string } | null;
    description: string;
  },
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
  if (condition.kind === 'target-has-status-category' && condition.statusCategoryId) {
    return [{
      type: 'requires-target-status-category' as const,
      statusCategoryId: condition.statusCategoryId,
      multiplier,
      notes: [condition.description],
    }];
  }
  if (condition.kind === 'target-has-output-capability' && condition.qualifyingOutput) {
    return [{
      type: 'requires-target-output-capability' as const,
      channel: condition.qualifyingOutput.channel as EffectChannel,
      sourceScope: capabilitySourceScope(condition.qualifyingOutput.sourceScope),
      multiplier,
      notes: [condition.description, condition.qualifyingOutput.description],
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
  type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category';
} {
  return (
    (
      dependency.type === 'requires-self-status' ||
      dependency.type === 'requires-any-enemy-status' ||
      dependency.type === 'requires-target-status' ||
      dependency.type === 'requires-target-status-category'
    ) &&
    (typeof dependency.statusId === 'string' || typeof dependency.statusCategoryId === 'string')
  );
}

function dedupeDependencies(dependencies: CapabilityDependency[]): CapabilityDependency[] {
  const seen = new Set<string>();
  return dependencies.filter((dependency) => {
    const key = `${dependency.type}:${dependency.statusId ?? ''}:${dependency.statusCategoryId ?? ''}:${dependency.statId ?? ''}:${dependency.channel ?? ''}:${dependency.sourceScope ?? ''}:${dependency.eventId ?? ''}:${dependency.multiplier ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function statIdFromText(text: string): DragonStatId | undefined {
  const statText = text.includes(':') ? text.split(':').slice(1).join(':') : text;
  if (/strength/i.test(statText)) {
    return 'strength';
  }
  if (/instinct/i.test(statText)) {
    return 'instinct';
  }
  if (/intelligence/i.test(statText)) {
    return 'intelligence';
  }
  if (/initiative/i.test(statText)) {
    return 'initiative';
  }
  return undefined;
}

function statLabel(statId: DragonStatId): string {
  return statId[0]!.toUpperCase() + statId.slice(1);
}

function statusIdForEffect(effect: AbilityEffect): string | null {
  if (effect.type === 'Stun') {
    return 'stun';
  }
  if (effect.type === 'Taunt') {
    return 'taunt';
  }
  if (effect.type === 'Stagger') {
    return 'stagger';
  }
  if (effect.type === 'Confusion') {
    return 'confusion';
  }
  if (effect.type === 'Weakened') {
    return 'weakened';
  }
  if (effect.type === 'First-Strike') {
    return 'first-strike';
  }
  if (effect.type === 'Double-Strike') {
    return 'double-strike';
  }
  if (effect.type === 'Slow') {
    return 'slow';
  }
  if (effect.type === 'Burn') {
    return 'burn';
  }
  if (effect.type === 'Bleed') {
    return 'bleed';
  }
  if (effect.type === 'Panic') {
    return 'panic';
  }
  if (effect.type === 'Vulnerable') {
    return 'vulnerable';
  }
  if (effect.type === 'Evade') {
    return 'evade';
  }
  if (effect.type === 'Overwhelm') {
    return 'overwhelm';
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
  if (effect.type === 'Damage Dealt Up' || effect.type === 'Damage Dealt Down') {
    return 'damage-dealt';
  }
  if (effect.type === 'Physical Damage Dealt Up') {
    return 'physical-damage';
  }
  if (effect.type === 'Physical Damage Received Up') {
    return 'physical-damage';
  }
  if (effect.type === 'Tactical Damage Dealt Up') {
    return 'tactical-damage';
  }
  if (effect.type === 'Tactical Damage Dealt Down') {
    return 'tactical-damage';
  }
  if (effect.type === 'Fire Damage Dealt Up') {
    return 'fire-damage';
  }
  if (effect.type === 'Fire Damage Dealt Down') {
    return 'fire-damage';
  }
  if (effect.type === 'Fire Damage Received Up') {
    return 'fire-damage';
  }
  if (effect.type === 'Physical Damage Dealt Down') {
    return 'physical-damage';
  }
  if (effect.type === 'Recovery Dealt Up' || effect.type === 'Recovery Received Up' || effect.type === 'Recovery Received Down') {
    return 'recovery';
  }
  if (
    effect.type === 'Damage Received Down' ||
    effect.type === 'Damage Received Reduction' ||
    effect.type === 'Tactical Damage Received Reduction' ||
    effect.type === 'Tactical Damage Received Down' ||
    effect.type === 'Fire Damage Received Down' ||
    effect.type === 'Physical Damage Received Down' ||
    effect.type === 'Physical Damage Received Reduction' ||
    effect.type === 'Exclusive Damage Received Reduction' ||
    effect.type === 'Resistance'
  ) {
    return 'damage-received';
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

function modifierDirectionForEffect(effect: AbilityEffect): ModifierDirection {
  return effect.type.includes('Received') || effect.type === 'Resistance' ? 'received' : 'dealt';
}

function modifierOperationForEffect(effect: AbilityEffect): ModifierCapability['operation'] {
  return effect.type.includes('Down') || effect.type.includes('Reduction') || effect.type === 'Resistance'
    ? 'decrease'
    : 'increase';
}

function modifierRoleForEffect(effect: AbilityEffect, direction: 'dealt' | 'received'): ModifierRole {
  const target = targetForEffect(effect);
  if (target.side === 'enemy') {
    return 'enemy-debuff';
  }
  if (target.side === 'ally' && effect.type.includes('Down') && !/Damage Received/i.test(effect.type)) {
    return 'ally-impairment';
  }
  if (direction === 'received' && (/Damage Received/i.test(effect.type) || effect.type === 'Resistance') && target.side === 'ally') {
    return 'ally-support';
  }
  if (direction === 'received' && target.side === 'ally') {
    return 'ally-support';
  }
  if (direction === 'received' && (/Damage Received/i.test(effect.type) || effect.type === 'Resistance') && (target.selection === 'self' || target.side === 'self')) {
    return 'self-amplification';
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
  const inferredCasterEligibility = inferCasterEligibility(effect.target);
  const casterEligibility = effect.casterEligibility ?? inferredCasterEligibility;
  const position = effect.targetScope === 'left-flank' || effect.targetScope === 'right-flank'
    ? effect.targetScope
    : null;
  const selectionStat = selectionStatForEffect(effect);
  const selectionResource = selectionResourceForEffect(effect);
  const inferredTargetCount = effect.targetCount ?? inferTargetCount(effect.target);
  const targetsAllEnemies = /^all enemies\b/i.test(effect.target.trim());
  const selection = effect.targetScope === 'self'
    ? 'self'
    : position
      ? 'specific-position'
      : targetsAllEnemies
        ? 'all-matching-condition'
      : effect.targetPriority === 'highest-stat-ally'
        || effect.targetPriority === 'highest-stat-enemy'
        ? 'highest-stat'
        : effect.targetPriority === 'highest-current-troops-ally'
          || effect.targetPriority === 'highest-current-troops-enemy'
          ? 'highest-resource'
          : effect.targetPriority === 'least-current-troops-ally'
            || effect.targetPriority === 'least-current-troops-enemy'
            ? 'lowest-resource'
        : effect.targetPriority === 'all-allies-matching-threshold'
          ? 'all-matching-condition'
        : effect.targetScope === 'opposing-position' || effect.targetPriority === 'opposing-position'
          ? 'specific-position'
          : effect.targetScope === 'within-adjacency'
            ? inferredTargetCount !== null && inferredTargetCount !== undefined && inferredTargetCount > 1
              ? 'adjacent'
              : 'one-eligible-adjacent'
            : effect.target.includes('deals')
              ? 'eligible'
              : effect.targetScope === 'any-lane'
                ? 'any'
                : 'unknown';
  const referenceCount = effect.targetSelection?.references.length ?? 0;
  const count = effect.perTargetEffectCheck?.targetCount ??
    (effect.activationRoll?.scope === 'independent-per-target' && referenceCount > 1 ? referenceCount : null) ??
    (selection === 'all-matching-condition'
    ? null
    : inferredTargetCount ?? (selection === 'highest-stat' || selection === 'highest-resource' || selection === 'lowest-resource' || selection === 'one-eligible-adjacent'
      ? 1
      : null));
  return {
    side: targetSideForEffect(effect),
    scope: effect.targetScope === 'opposing-position' ? 'same-lane' : effect.targetScope,
    position,
    count,
    includesCaster: effect.includesCaster ??
      (casterEligibility === 'excluded'
        ? false
        : casterEligibility === 'included' || casterEligibility === 'eligible-if-targeting-allows'
          ? true
          : null),
    selection,
    selectionStat,
    selectionResource,
    comparisonDirection: effect.targetSelection?.comparisonDirection ?? (selection === 'highest-resource' ? 'highest' : selection === 'lowest-resource' ? 'lowest' : null),
    comparisonPool: effect.targetSelection?.comparisonPool ?? null,
    tieBehavior: effect.targetSelection?.tieBehavior ?? null,
    sharedSelectionGroupId: effect.targetSelection?.sharedSelectionGroupId ?? null,
  };
}

function selectionStatForEffect(effect: AbilityEffect): DragonStatId | null {
  if (
    effect.targetPriority !== 'highest-stat-ally' &&
    effect.targetPriority !== 'highest-stat-enemy'
  ) {
    return null;
  }
  if (/highest Strength/i.test(effect.target)) {
    return 'strength';
  }
  if (/highest Intelligence/i.test(effect.target)) {
    return 'intelligence';
  }
  if (/highest Instinct/i.test(effect.target)) {
    return 'instinct';
  }
  if (/highest Initiative/i.test(effect.target)) {
    return 'initiative';
  }
  return null;
}

function selectionResourceForEffect(effect: AbilityEffect): 'current-troops' | DragonStatId | null {
  if (
    effect.targetPriority === 'highest-current-troops-ally' ||
    effect.targetPriority === 'highest-current-troops-enemy' ||
    effect.targetPriority === 'least-current-troops-ally' ||
    effect.targetPriority === 'least-current-troops-enemy'
  ) {
    return 'current-troops';
  }
  return selectionStatForEffect(effect);
}

function periodicDamageForEffect(effect: AbilityEffect): {
  statusId: string;
  channel: EffectChannel;
  scalingStat: DragonStatId | null;
  mitigationStat: DragonStatId | null;
} | null {
  if (effect.type === 'Burn') {
    return { statusId: 'burn', channel: 'fire-damage', scalingStat: 'intelligence', mitigationStat: 'initiative' };
  }
  if (effect.type === 'Bleed') {
    return { statusId: 'bleed', channel: 'physical-damage', scalingStat: 'strength', mitigationStat: 'instinct' };
  }
  if (effect.type === 'Panic') {
    return { statusId: 'panic', channel: 'tactical-damage', scalingStat: 'instinct', mitigationStat: 'intelligence' };
  }
  return null;
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
  } else if (selector.includesCaster === false && providerPosition === recipientPosition) {
    satisfied = false;
    expected = 'other ally';
  } else if (selector.selection === 'self') {
    satisfied = providerPosition === recipientPosition;
    expected = 'self';
  } else if (selector.position) {
    satisfied = recipientPosition === selector.position;
    expected = selector.position;
  } else if (selector.selection === 'adjacent' || selector.selection === 'one-eligible-adjacent') {
    satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
    expected = `adjacent to ${providerPosition}`;
  } else if (selector.selection === 'highest-stat' || selector.selection === 'highest-resource' || selector.selection === 'lowest-resource' || selector.selection === 'all-matching-condition') {
    satisfied = true;
    expected = selector.selection === 'all-matching-condition'
      ? 'all allies matching threshold condition'
      : `${selector.comparisonDirection ?? (selector.selection === 'lowest-resource' ? 'lowest' : 'highest')} ${selector.selectionResource ?? selector.selectionStat ?? 'resource'} ${selector.side}`;
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
    notes: selector.selection === 'adjacent' || selector.selection === 'one-eligible-adjacent'
      ? ['Friendly adjacency is Left Flank - Vanguard - Right Flank.']
      : [],
  };
}

function extraActionTargetRequirement(
  extraAction: ExtraActionCapability,
  providerPosition: FormationPosition | null,
  recipientPosition: FormationPosition,
): RequirementTrace {
  const selector = extraAction.targetSelector;
  let satisfied: boolean | null;
  let expected: string = selector.scope;
  if (!providerPosition) {
    satisfied = false;
  } else if (selector.includesCaster === false && providerPosition === recipientPosition) {
    satisfied = false;
    expected = 'other ally';
  } else if (selector.selection === 'self') {
    satisfied = providerPosition === recipientPosition;
    expected = 'self';
  } else if (selector.position) {
    satisfied = recipientPosition === selector.position;
    expected = selector.position;
  } else if (selector.selection === 'adjacent' || selector.selection === 'one-eligible-adjacent') {
    satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
    expected = `adjacent to ${providerPosition}`;
  } else if (selector.selection === 'highest-stat' || selector.selection === 'highest-resource' || selector.selection === 'lowest-resource' || selector.selection === 'all-matching-condition') {
    satisfied = true;
    expected = selector.selection === 'all-matching-condition'
      ? 'all allies matching threshold condition'
      : `${selector.comparisonDirection ?? (selector.selection === 'lowest-resource' ? 'lowest' : 'highest')} ${selector.selectionResource ?? selector.selectionStat ?? 'resource'} ${selector.side}`;
  } else if (selector.selection === 'any' || selector.selection === 'eligible') {
    satisfied = true;
  } else {
    satisfied = null;
  }
  return {
    id: `${extraAction.id}-targeting-${recipientPosition}`,
    label: 'Extra action recipient compatibility',
    expected,
    actual: providerPosition ? `provider ${providerPosition}, recipient ${recipientPosition}` : null,
    satisfied,
    evidenceIds: extraAction.evidenceIds,
    notes: selector.selection === 'adjacent' || selector.selection === 'one-eligible-adjacent'
      ? ['Friendly adjacency is Left Flank - Vanguard - Right Flank.', 'A position is not adjacent to itself.']
      : [],
  };
}

function outputTargetsRecipient(
  output: OutputCapability,
  providerPosition: FormationPosition,
  recipientPosition: FormationPosition,
  selector: AbilityTarget | null = null,
): RequirementTrace {
  let satisfied: boolean | null = null;
  if (selector?.includesCaster === false && providerPosition === recipientPosition) {
    satisfied = false;
  } else if (output.targetSide === 'self') {
    satisfied = providerPosition === recipientPosition;
  } else if (output.targetScope === 'within-adjacency') {
    satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
  } else if (output.targetSide === 'ally') {
    satisfied = true;
  }
  return {
    id: `${output.id}-targets-${recipientPosition}`,
    label: 'Provider targeting includes recipient',
    expected: selector?.includesCaster === false && providerPosition === recipientPosition
      ? 'other ally'
      : (output.targetScope ?? 'ally target'),
    actual: `provider ${providerPosition}, recipient ${recipientPosition}`,
    satisfied,
    evidenceIds: output.evidenceIds,
    notes: [
      output.targetCount === 3 && selector?.includesCaster !== false
        ? 'Exact 3 Allies includes all friendly dragons, including caster.'
        : null,
      selector?.includesCaster === false ? 'The source explicitly targets other Allies, excluding the caster.' : null,
    ].filter((note): note is string => Boolean(note)),
  };
}

function rawStatEffectEntry(effect: string): { stat: string; value: string } | null {
  const normalized = effect.trim();
  const match = normalized.match(/^(Strength|Instinct|Intelligence|Initiative)\s+([+-]?\d+(?:\.\d+)?%?|[+-]?\d+(?:\.\d+)?\s+flat)(?:\s+at effective Habit Level \d+)?\.?$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const rawValue = match[2];
  const value = /flat$/i.test(rawValue)
    ? (() => {
        const flatValue = rawValue.replace(/\s+flat$/i, '');
        return flatValue.startsWith('-') || flatValue.startsWith('+') ? flatValue : `+${flatValue}`;
      })()
    : rawValue.startsWith('-') || rawValue.startsWith('+')
      ? rawValue
      : `+${rawValue}`;
  return { stat: match[1], value };
}

function statusProviderRequirement(
  statusOutput: StatusOutputCapability,
  dependencyType: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category',
  providerPosition: FormationPosition,
  recipientPosition: FormationPosition,
): RequirementTrace {
  let satisfied: boolean | null = true;
  let expected: string = statusOutput.targetSelector.scope;
  if (dependencyType === 'requires-self-status') {
    if (statusOutput.targetSide === 'self') {
      satisfied = providerPosition === recipientPosition;
      expected = 'self-status on recipient';
    } else if (statusOutput.targetSelector.selection === 'adjacent' || statusOutput.targetSelector.selection === 'one-eligible-adjacent') {
      satisfied = arePositionsAdjacent(providerPosition, recipientPosition);
      expected = `ally adjacent to ${providerPosition}`;
    } else if (statusOutput.targetSide === 'ally') {
      satisfied = true;
      expected = 'ally target can include recipient';
    } else {
      satisfied = false;
    }
  } else if (dependencyType === 'requires-target-status' || dependencyType === 'requires-target-status-category') {
    satisfied = statusOutput.targetSide === 'enemy';
    expected = 'enemy status application that can overlap the dependent target';
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
    notes: statusOutput.targetSelector.selection === 'adjacent' || statusOutput.targetSelector.selection === 'one-eligible-adjacent'
      ? ['A position is not adjacent to itself.']
      : [],
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
  options?: CapabilityOptions,
  matchOptions: { applySourceScope?: boolean; includeOutputConditional?: boolean } = {},
): CapabilityMatch {
  const applySourceScope = matchOptions.applySourceScope ?? true;
  const includeOutputConditional = matchOptions.includeOutputConditional ?? false;
  const sourceScopeCompatible = applySourceScope
    ? sourceScopesCompatible(modifier.sourceScope, output.sourceScope)
    : true;
  return {
    modifierCapabilityId: modifier.id,
    outputCapabilityId: output.id,
    channel: modifier.channel,
    sourceScopeCompatible,
    requirements,
    status: statusFromRequirements(
      requirements,
      capabilityFutureOrConditional(output, options) ||
        (includeOutputConditional && output.conditional) ||
        capabilityFutureOrConditional(modifier, options) ||
        modifier.conditional,
    ),
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
    ...conditionRequirementTraces(modifier.conditions, options),
    ...availabilityRequirements({
      dragonId: modifier.dragonId,
      abilityId: modifier.abilityId,
      dragonName: dragon?.name ?? modifier.dragonId,
      abilityName: modifier.abilityName,
      unlockStarRank: modifier.unlockStarRank,
      minimumDragonLevel: modifier.minimumDragonLevel,
      requiredHabitLevel: modifier.requiredHabitLevel,
      evidenceIds: modifier.evidenceIds,
      sourceKind: abilitySourceKind(dragons, modifier.dragonId, modifier.abilityId),
    }, options),
  ];
}

function conditionRequirementTraces(
  conditions: EffectCondition[],
  options: CapabilityOptions,
): RequirementTrace[] {
  return conditions.flatMap((condition) => {
    if (condition.kind !== 'battle-context') {
      return [];
    }
    const actual = options.battleContext ?? 'unspecified';
    const supported = supportedBattleContexts(condition);
    const satisfied = actual === 'unspecified'
      ? null
      : supported.includes(actual);
    return [{
      id: condition.id,
      label: 'Battle context requirement',
      expected: battleContextExpectedLabel(condition, supported),
      actual: battleContextActualLabel(actual),
      satisfied,
      evidenceIds: condition.evidenceIds,
      notes: [condition.description],
    }];
  });
}

function supportedBattleContexts(condition: EffectCondition): BattleContext[] {
  const contexts = new Set<BattleContext>();
  if (condition.battleContext && condition.battleContext !== 'unspecified') {
    contexts.add(condition.battleContext);
  }
  if (/beast/i.test(condition.description)) {
    contexts.add('beast-encounter');
  }
  return [...contexts];
}

function battleContextExpectedLabel(condition: EffectCondition, supported: BattleContext[]): string {
  if (supported.includes('non-player-food-tile') && supported.includes('beast-encounter')) {
    return 'non-player Food Tile or Beast encounter';
  }
  if (supported.length > 0) {
    return supported.map(battleContextActualLabel).join(' or ');
  }
  return condition.description;
}

function battleContextActualLabel(context: BattleContext): string {
  switch (context) {
    case 'non-player-food-tile':
      return 'non-player food tile';
    case 'beast-encounter':
      return 'Beast encounter';
    case 'pvp':
      return 'PvP';
    case 'unspecified':
      return 'unspecified';
  }
}

function statusOutputRequirementTraces(
  output: StatusOutputCapability,
  dragon: Dragon,
  dragons: Dragon[],
  options: CapabilityOptions,
): RequirementTrace[] {
  return availabilityRequirements({
    dragonId: output.dragonId,
    abilityId: output.abilityId,
    dragonName: dragon.name,
    abilityName: output.abilityName,
    unlockStarRank: output.unlockStarRank,
    minimumDragonLevel: output.minimumDragonLevel,
    requiredHabitLevel: output.requiredHabitLevel,
    evidenceIds: output.evidenceIds,
    sourceKind: abilitySourceKind(dragons, output.dragonId, output.abilityId),
  }, options);
}

function outputRequirementTraces(output: OutputCapability, options: CapabilityOptions): RequirementTrace[] {
  return availabilityRequirements({
    dragonId: output.dragonId,
    abilityId: output.abilityId,
    dragonName: output.dragonId,
    abilityName: output.abilityName,
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
  dragonName,
  abilityName,
  unlockStarRank,
  minimumDragonLevel,
  requiredHabitLevel,
  evidenceIds,
  sourceKind,
}: {
  dragonId: string;
  abilityId: string | null;
  dragonName?: string;
  abilityName?: string;
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
    : (rosterEntry?.reignLevel ?? observation?.dragonLevel ?? null);
  const habitLevel = abilityId
    ? resolveEffectiveHabitLevel({
        unlockStarRank,
        starRank,
        savedLevel: rosterEntry?.habitLevels[abilityId],
      })
    : null;
  const requirements: RequirementTrace[] = [];
  const owner = abilityName ? `${dragonName ?? dragonId} - ${abilityName}` : (dragonName ?? dragonId);
  if (minimumDragonLevel !== null) {
    const satisfied = dragonLevel === null
      ? null
      : dragonLevel >= minimumDragonLevel;
    requirements.push({
      id: `${dragonId}-${abilityId ?? 'basic'}-level`,
      label: `${owner} Dragon Level requirement`,
      expected: `Level ${minimumDragonLevel}+`,
      actual: dragonLevel === null ? null : `Level ${dragonLevel}`,
      satisfied,
      evidenceIds,
      notes: [],
    });
  }
  if (unlockStarRank !== null) {
    const satisfied = starRank === null
      ? (options.previewMaxRankInteractions ? false : null)
      : starRank >= unlockStarRank;
    requirements.push({
      id: `${dragonId}-${abilityId ?? 'basic'}-star-rank`,
      label: sourceKind === 'habit' ? `${owner} Habit unlock requirement` : `${owner} Star Rank requirement`,
      expected: `Star Rank ${unlockStarRank}+`,
      actual: starRank === null ? (options.previewMaxRankInteractions ? 'preview enabled' : null) : `Star Rank ${starRank}`,
      satisfied,
      evidenceIds,
      notes: [],
    });
  }
  if (requiredHabitLevel !== null && abilityId) {
    const satisfied = habitLevel === null
      ? (options.previewMaxRankInteractions ? false : null)
      : habitLevel >= requiredHabitLevel;
    requirements.push({
      id: `${dragonId}-${abilityId}-habit-level`,
      label: `${owner} Selected Habit Level`,
      expected: `Habit Level ${requiredHabitLevel}+ or preview`,
      actual: habitLevel === null ? (options.previewMaxRankInteractions ? 'preview enabled' : null) : `Habit Level ${habitLevel}`,
      satisfied,
      evidenceIds,
      notes: ['Unlocked Habits without an explicit saved Habit Level default to effective Habit Level 1. Locked Habit capabilities are potential in preview mode, not active for current roster.'],
    });
  }
  return requirements;
}

function outputCapabilityVisible(output: OutputCapability, options: CapabilityOptions): boolean {
  return capabilityVisible({
    dragonId: output.dragonId,
    abilityId: output.abilityId,
    unlockStarRank: output.unlockStarRank,
    minimumDragonLevel: output.minimumDragonLevel,
    requiredHabitLevel: output.requiredHabitLevel,
    futureAvailable: output.futureAvailable,
  }, options);
}

function modifierCapabilityVisible(modifier: ModifierCapability, options: CapabilityOptions): boolean {
  return capabilityVisible({
    dragonId: modifier.dragonId,
    abilityId: modifier.abilityId,
    unlockStarRank: modifier.unlockStarRank,
    minimumDragonLevel: modifier.minimumDragonLevel,
    requiredHabitLevel: modifier.requiredHabitLevel,
    futureAvailable: modifier.futureAvailable,
  }, options);
}

function statusCapabilityVisible(statusOutput: StatusOutputCapability, options: CapabilityOptions): boolean {
  return capabilityVisible({
    dragonId: statusOutput.dragonId,
    abilityId: statusOutput.abilityId,
    unlockStarRank: statusOutput.unlockStarRank,
    minimumDragonLevel: statusOutput.minimumDragonLevel,
    requiredHabitLevel: statusOutput.requiredHabitLevel,
    futureAvailable: statusOutput.futureAvailable,
  }, options);
}

function extraActionCapabilityVisible(extraAction: ExtraActionCapability, options: CapabilityOptions): boolean {
  return capabilityVisible({
    dragonId: extraAction.dragonId,
    abilityId: extraAction.abilityId,
    unlockStarRank: extraAction.unlockStarRank,
    minimumDragonLevel: extraAction.minimumDragonLevel,
    requiredHabitLevel: extraAction.requiredHabitLevel,
    futureAvailable: extraAction.futureAvailable,
  }, options);
}

function triggeredAbilityCapabilityVisible(triggeredAbility: TriggeredAbilityCapability, options: CapabilityOptions): boolean {
  return capabilityVisible({
    dragonId: triggeredAbility.dragonId,
    abilityId: triggeredAbility.abilityId,
    unlockStarRank: triggeredAbility.unlockStarRank,
    minimumDragonLevel: triggeredAbility.minimumDragonLevel,
    requiredHabitLevel: triggeredAbility.requiredHabitLevel,
    futureAvailable: triggeredAbility.futureAvailable,
  }, options);
}

function periodicDamageVisible(
  periodic: PeriodicDamageDefinition,
  dragons: Dragon[],
  options: CapabilityOptions,
): boolean {
  const dragon = dragonById(dragons, periodic.dragonId);
  const ability = dragon ? allAbilities(dragon).find((item) => item.id === periodic.abilityId) : null;
  if (!ability) {
    return false;
  }
  return capabilityVisible({
    dragonId: periodic.dragonId,
    abilityId: periodic.abilityId,
    unlockStarRank: ability.unlockStarRank,
    minimumDragonLevel: ability.minimumDragonLevel,
    requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
    futureAvailable: ability.unlockStarRank !== null && ability.unlockStarRank > 1,
  }, options);
}

function capabilityVisible({
  dragonId,
  abilityId,
  unlockStarRank,
  minimumDragonLevel,
  requiredHabitLevel,
  futureAvailable,
}: {
  dragonId: string;
  abilityId: string | null;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  requiredHabitLevel: number | null;
  futureAvailable: boolean;
}, options: CapabilityOptions): boolean {
  if (options.previewMaxRankInteractions || !futureAvailable) {
    return true;
  }
  const rosterEntry = options.roster?.[dragonId];
  if (!rosterEntry) {
    return false;
  }
  if (unlockStarRank !== null && (rosterEntry.starRank ?? 0) < unlockStarRank) {
    return false;
  }
  if (
    requiredHabitLevel !== null &&
    abilityId &&
    (resolveEffectiveHabitLevel({
      unlockStarRank,
      starRank: rosterEntry.starRank,
      savedLevel: rosterEntry.habitLevels[abilityId],
    }) ?? 0) < requiredHabitLevel
  ) {
    return false;
  }
  if (minimumDragonLevel !== null) {
    const dragonLevel = options.dragonLevels?.[dragonId] ?? null;
    if (dragonLevel === null || dragonLevel < minimumDragonLevel) {
      return false;
    }
  }
  return true;
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
  return dedupeRequirements(matches.flatMap((match) => match.requirements));
}

function statusFromRequirements(requirements: RequirementTrace[], futureOrConditional: boolean): TraceStatus {
  const failed = requirements.filter((requirement) => requirement.satisfied === false);
  if (failed.some(isHardRequirement)) {
    return 'inactive';
  }
  if (failed.some((requirement) => /Dragon Level/.test(requirement.label) && requirement.actual !== 'preview enabled')) {
    return 'inactive';
  }
  if (failed.length > 0 && !futureOrConditional) {
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

function capabilityFutureOrConditional(
  capability: Pick<OutputCapability | ModifierCapability | StatusOutputCapability, 'futureAvailable'>,
  options: CapabilityOptions | undefined,
): boolean {
  return capability.futureAvailable && options?.previewMaxRankInteractions === true;
}

function enemyCoverageIsComplete(modifier: Pick<ModifierCapability, 'targetSelector'>): boolean {
  if (modifier.targetSelector.side !== 'enemy') {
    return false;
  }
  if (modifier.targetSelector.count === null || modifier.targetSelector.count < FORMATION_POSITIONS.length) {
    return false;
  }
  if (
    modifier.targetSelector.position !== null ||
    modifier.targetSelector.scope === 'within-adjacency' ||
    modifier.targetSelector.selectionStat !== null ||
    modifier.targetSelector.selectionResource !== null ||
    modifier.targetSelector.comparisonDirection !== null ||
    modifier.targetSelector.comparisonPool !== null
  ) {
    return false;
  }
  return modifier.targetSelector.selection === 'any' || modifier.targetSelector.selection === 'eligible';
}

function enemyTargetSelectionIsUncertain(modifier: ModifierCapability): boolean {
  if (enemyCoverageIsComplete(modifier)) {
    return false;
  }
  if (modifier.targetSelector.count === 1) {
    return true;
  }
  if (modifier.targetSelector.selection === 'highest-stat' || modifier.targetSelector.selectionResource === 'current-troops') {
    return true;
  }
  return modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent';
}

function isHardRequirement(requirement: RequirementTrace): boolean {
  return /selected in formation|\b[a-z0-9-]+-selected\b|provider position|required source position|required target position|position compatibility|source-scope compatibility|provider targeting|status targeting|adjacency|explicit caster|battlefield/i.test(
    `${requirement.id} ${requirement.label}`,
  );
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

function capabilitySourceScope(sourceScope: EffectSourceScope | undefined, effect?: AbilityEffect): CapabilitySourceScope {
  const normalized = effect
    ? normalizeDamageSourceScope({
        effectType: effect.type,
        explicitSourceScope: sourceScope,
        excludes: effect.excludes,
      })
    : (sourceScope ?? 'unknown');
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
  const count = target.selection === 'all-matching-condition'
    ? `all matching ${target.side === 'enemy' ? 'enemies' : 'targets'}`
    : target.count === null ? 'unknown count' : `${target.count} target${target.count === 1 ? '' : 's'}`;
  const caster = target.includesCaster === null
    ? 'caster eligibility unknown'
    : target.includesCaster
      ? 'caster eligible'
      : 'caster excluded';
  const stat = target.selectionStat ? `; selection stat ${target.selectionStat}` : '';
  const resource = target.selectionResource ? `; selection resource ${target.selectionResource}` : '';
  const direction = target.comparisonDirection ? `; comparison ${target.comparisonDirection}` : '';
  const pool = target.comparisonPool ? `; comparison pool ${target.comparisonPool}` : '';
  const tie = target.tieBehavior ? `; tie behavior ${target.tieBehavior}` : '';
  const group = target.sharedSelectionGroupId ? `; shared group ${target.sharedSelectionGroupId}` : '';
  return `${target.side}; ${target.scope}; ${target.selection}; ${count}; ${caster}${stat}${resource}${direction}${pool}${tie}${group}`;
}

function persistentTargetSelectorSummary(target: AbilityTarget, effect: AbilityEffect | null | undefined): string {
  const persistentReferenceId = persistentTargetReferenceId(effect);
  if (!persistentReferenceId) {
    return targetSelectorSummary(target);
  }
  const count = target.count ?? 1;
  const countText = `${count} target${count === 1 ? '' : 's'}`;
  return `${target.side}; persistent-target-reference; current marked target; ${countText}; current marked target identity unresolved; reference ${persistentReferenceId}`;
}

function defensiveDamageScopeForEffect(effect: AbilityEffect): DefensiveDamageScope | null {
  if (effect.type === 'Resistance') {
    return 'all';
  }
  if (!/Damage Received/i.test(effect.type)) {
    return null;
  }
  if (/Tactical Damage Received/i.test(effect.type)) {
    return 'tactical';
  }
  if (/Fire Damage Received/i.test(effect.type)) {
    return 'fire';
  }
  if (/Physical Damage Received/i.test(effect.type)) {
    return 'physical';
  }
  return 'all';
}

function damageReceivedLabel(scope: DefensiveDamageScope | null): string {
  switch (scope) {
    case 'physical':
      return 'Physical Damage Received';
    case 'tactical':
      return 'Tactical Damage Received';
    case 'fire':
      return 'Fire Damage Received';
    case 'all':
    case null:
      return 'Damage Received';
  }
}

function modifierDisplayValue(modifier: ModifierCapability, options: CapabilityOptions): string {
  const rankedValue = options.previewMaxRankInteractions
    ? modifier.rankedValues.find((value) => value.level === 5)
    : rankedValueForHabitLevel(modifier.rankedValues, effectiveHabitLevelForCapability(modifier, options));
  const value = rankedValue?.value ?? modifier.value;
  if (value === null) {
    return 'unknown';
  }
  const displayValue = modifier.operation === 'decrease' ? Math.abs(value) : value;
  const unit = rankedValue?.unit ?? modifier.unit;
  if (unit === 'stack') {
    return `${displayValue}%`;
  }
  return `${displayValue}${unit === 'percent' ? '%' : unit === 'flat' ? ' flat' : ''}`;
}

export function formatTypedModifierValue(modifier: Pick<ModifierCapability, 'value' | 'rankedValues' | 'unit' | 'operation'>): string {
  const value = modifier.value ?? modifier.rankedValues[0]?.value ?? null;
  if (value === null) {
    return 'unknown';
  }
  const displayValue = modifier.operation === 'decrease' ? Math.abs(value) : value;
  if (modifier.unit === 'stack') {
    return `${displayValue}%`;
  }
  return `${displayValue}${modifier.unit === 'percent' ? '%' : modifier.unit === 'flat' ? ' flat' : ''}`;
}

function modifierResolvedValue(modifier: ModifierCapability, options: CapabilityOptions): number | null {
  const rankedValue = options.previewMaxRankInteractions
    ? modifier.rankedValues.find((value) => value.level === 5)
    : rankedValueForHabitLevel(modifier.rankedValues, effectiveHabitLevelForCapability(modifier, options));
  return rankedValue?.value ?? modifier.value;
}

function effectiveHabitLevelForCapability(
  capability: Pick<ModifierCapability, 'dragonId' | 'unlockStarRank' | 'requiredHabitLevel'> & { abilityId: string | null },
  options: CapabilityOptions,
) {
  if (capability.requiredHabitLevel === null) {
    return null;
  }
  if (!capability.abilityId) {
    return null;
  }
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === capability.dragonId);
  const rosterEntry = options.roster?.[capability.dragonId];
  return resolveEffectiveHabitLevel({
    unlockStarRank: capability.unlockStarRank,
    starRank: rosterEntry?.starRank ?? observation?.starRank ?? null,
    savedLevel: rosterEntry?.habitLevels[capability.abilityId],
  });
}

function activationChanceFacts(modifier: ModifierCapability, options?: CapabilityOptions): string[] {
  if (modifier.activationChanceFixed !== null && modifier.activationChanceFixed !== undefined) {
    return [`Activation chance: ${modifier.activationChanceFixed}%.`];
  }
  if (modifier.activationChanceByHabitLevel?.length) {
    if (options) {
      const level = options.previewMaxRankInteractions ? 5 : effectiveHabitLevelForCapability(modifier, options);
      const chance = rankedValueForHabitLevel(modifier.activationChanceByHabitLevel, level);
      if (chance) {
        return [
          `Activation chance: ${formatValue(chance.value, chance.unit)} at effective Habit Level ${level}.`,
          `Activation chance by Habit Level: ${modifier.activationChanceByHabitLevel.map((value) => `${value.value}%`).join(', ')}.`,
        ];
      }
    }
    return [`Activation chance by Habit Level: ${modifier.activationChanceByHabitLevel.map((value) => `${value.value}%`).join(', ')}.`];
  }
  return [];
}

function extraActionActivationChanceFacts(extraAction: ExtraActionCapability): string[] {
  const fixedChance = extraAction.activationChanceFixed ?? extraAction.chanceFixed;
  if (fixedChance !== null && fixedChance !== undefined) {
    return [`Activation chance: ${fixedChance}%.`];
  }
  const rankedChance = extraAction.activationChanceByHabitLevel?.length
    ? extraAction.activationChanceByHabitLevel
    : extraAction.chanceByHabitLevel;
  if (rankedChance.length) {
    return [`Activation chance by Habit Level: ${rankedChance.map((value) => `${value.value}%`).join(', ')}.`];
  }
  return [];
}

function extraActionChanceConditional(extraAction: ExtraActionCapability): boolean {
  return extraAction.chanceFixed !== null ||
    extraAction.chanceByHabitLevel.length > 0 ||
    extraAction.activationChanceFixed !== null ||
    Boolean(extraAction.activationChanceByHabitLevel?.length);
}

function interactionScopeForTrace(
  sourceDragonId: string,
  recipientDragonId: string | null,
  matchKind: SynergyTrace['matchKind'],
): SynergyTrace['interactionScope'] {
  if (!recipientDragonId) {
    return matchKind === 'enemy-mitigation-reduction' ||
      matchKind === 'enemy-damage-received-increase' ||
      matchKind === 'enemy-damage-dealt-reduction'
      ? 'enemy-side'
      : 'targeting-fact';
  }
  return sourceDragonId === recipientDragonId ? 'internal' : 'cross-dragon';
}

function outputChannelNames(outputs: OutputCapability[], ids: string[]): string[] {
  return ids.map((id) => outputs.find((output) => output.id === id)?.label ?? id);
}

function abilityOutputSummary(outputs: OutputCapability[]): string {
  const byAbility = new Map<string, Set<string>>();
  for (const output of outputs) {
    const channels = byAbility.get(output.abilityName) ?? new Set<string>();
    channels.add(channelLabel(output.channel));
    byAbility.set(output.abilityName, channels);
  }
  return [...byAbility.entries()]
    .map(([abilityName, channels]) => `${abilityName}: ${joinEnglishList([...channels])}`)
    .join('; ');
}

function joinEnglishList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function outgoingExplanation(
  providerName: string,
  modifier: ModifierCapability,
  recipientName: string,
  matches: CapabilityMatch[],
  outputs: OutputCapability[],
  options: CapabilityOptions,
): string {
  const labels = outputChannelNames(outputs, matches.map((match) => match.outputCapabilityId)).join(', ');
  if (modifier.dragonId === 'sheepstealer' && modifier.channel === 'physical-damage') {
    return `${providerName}'s ${modifier.abilityName} increases ${recipientName}'s Physical Damage Dealt by ${modifierDisplayValue(modifier, options)}. Qualifying outputs: ${labels}.`;
  }
  if (modifierHasStackMetadata(modifier)) {
    const status = modifier.statusId ? statusDisplayName(modifier.statusId) : 'stack';
    const value = modifier.valuePerStack !== null
      ? `${modifier.valuePerStack}%`
      : modifierDisplayValue(modifier, options);
    const maximum = modifier.stackMaximum !== null ? `, up to ${modifier.stackMaximum} stacks` : '';
    return `${recipientName} is eligible to receive ${status} support because it has verified ${channelLabel(modifier.channel)} output. Each granted stack increases ${directedChannelLabel(modifier.channel, 'dealt')} by ${value}${maximum}. Qualifying outputs: ${labels}.`;
  }
  if (modifier.dragonId === 'syrax' && modifier.abilityId === 'syrax-blazing-fury' && modifier.channel === 'fire-damage') {
    return `${recipientName} is eligible for Syrax's Blazing Fury Fire Damage support. Qualifying outputs: ${labels}. Activation is a 20% each-round chance, lasts two rounds, and prioritizes Fire Damage allies.`;
  }
  if (modifier.dragonId === 'syrax' && modifier.abilityId === 'syrax-tactical-inferno') {
    return `${recipientName} is resolved by the verified flank preference for Syrax's Tactical Inferno ${channelLabel(modifier.channel)} support. Qualifying outputs: ${labels}.`;
  }
  return `${providerName}'s ${modifier.abilityName} increases ${recipientName}'s ${directedChannelLabel(modifier.channel, 'dealt')}. Qualifying outputs: ${labels}.`;
}

function outgoingAssumptions(modifier: ModifierCapability, matches: CapabilityMatch[]): string[] {
  const assumptions: string[] = [];
  const hasTriggerChance =
    modifierHasStackMetadata(modifier) ||
    modifier.conditional ||
    modifier.activationChanceFixed !== null ||
    (modifier.activationChanceByHabitLevel?.length ?? 0) > 0;
  const hasThresholdEligibility = modifier.conditions.some((condition) => /Troop Capacity|threshold/i.test(condition.description));
  const hasSelectionUncertainty =
    modifier.targetSelector.count === 1 &&
    (
      modifier.targetSelector.sharedSelectionGroupId !== undefined ||
      modifier.targetSelector.selectionResource === 'current-troops' ||
      modifier.targetSelector.selectionStat !== null ||
      modifier.targetSelector.selection === 'one-eligible-adjacent' ||
      modifier.targetSelector.selection === 'adjacent'
    );
  if (hasTriggerChance) {
    if (hasSelectionUncertainty) {
      assumptions.push('Trigger chance and target selection may make this conditional rather than guaranteed.');
    } else if (hasThresholdEligibility) {
      assumptions.push('Trigger chance and threshold eligibility may make this conditional rather than guaranteed.');
    } else {
      assumptions.push('Trigger chance may make this conditional rather than guaranteed.');
    }
  }
  if (matches.length > 1) {
    assumptions.push('Multiple qualifying outputs are aggregated into one normal synergy trace.');
  }
  if (modifier.activationGroupId) {
    assumptions.push(`Effects with shared activation group ${modifier.activationGroupId} use one activation roll; uptime is not calculated.`);
  }
  if (modifier.targetSelector.selectionResource === 'current-troops' && modifier.targetSelector.count === 1) {
    assumptions.push('Current troop values and tie-breaking are not resolved; eligible recipients remain candidates.');
  }
  return assumptions;
}

function unresolvedForModifier(modifier: ModifierCapability): string[] {
  if (modifier.dragonId === 'sheepstealer' && modifier.channel === 'physical-damage') {
    return ["Exact stacking formula with Vermax's self buffs is unknown."];
  }
  if (modifierHasStackMetadata(modifier)) {
    const status = modifier.statusId ? statusDisplayName(modifier.statusId) : 'stack';
    return [`Exact final number of ${status} stacks is unknown.`];
  }
  return ['Exact final modified amount is unknown.'];
}

function enemyDamageDealtAssumptions(modifier: ModifierCapability, completeCoverage: boolean, selectionUncertain: boolean): string[] {
  if (completeCoverage) {
    return [];
  }
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return [`Enemy target selection is not resolved because enemy ${statLabel(modifier.targetSelector.selectionStat)} values and tie resolution are unavailable.`];
  }
  if (modifier.targetSelector.selectionResource === 'current-troops') {
    return ['Enemy target selection is not resolved because enemy formation members and current troop values are unavailable.'];
  }
  if (modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent') {
    return ['Adjacent enemy identities and enemy-formation overlap are unresolved.'];
  }
  return selectionUncertain ? ['Enemy identities are unresolved because the enemy formation is unavailable.'] : [];
}

function enemySelectorAssumption(modifier: ModifierCapability): string[] {
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return [`Enemy target selection is not resolved because enemy ${statLabel(modifier.targetSelector.selectionStat)} values and tie resolution are unavailable.`];
  }
  if (modifier.targetSelector.selectionResource === 'current-troops') {
    return ['Enemy target selection is not resolved because enemy formation members and current troop values are unavailable.'];
  }
  if (modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent') {
    return ['Adjacent enemy identities and enemy-formation overlap are unresolved.'];
  }
  return ['Enemy identities and combat availability are unresolved.'];
}

function enemySelectorUnresolvedQuestions(modifier: ModifierCapability): string[] {
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return [`Highest-${statLabel(modifier.targetSelector.selectionStat)} enemy identity, tie resolution, and final combat formula remain unresolved.`];
  }
  if (modifier.targetSelector.selectionResource === 'current-troops') {
    return ['Enemy-side current-troop values and tie resolution remain unresolved.'];
  }
  if (modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent') {
    return ['Adjacent enemy identity and enemy-formation overlap remain unresolved.'];
  }
  return ['Enemy identities and final combat formula remain unresolved.'];
}

function enemyDamageDealtUnresolvedQuestions(modifier: ModifierCapability, completeCoverage: boolean, selectionUncertain: boolean): string[] {
  if (completeCoverage) {
    return ['Enemy identities remain unnamed because the enemy formation is unavailable.'];
  }
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return [`Highest-${statLabel(modifier.targetSelector.selectionStat)} enemy identity, tie resolution, and final combat formula remain unresolved.`];
  }
  if (modifier.targetSelector.selectionResource === 'current-troops') {
    return ['Enemy-side current-troop values and tie resolution remain unresolved.'];
  }
  if (modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent') {
    return ['Adjacent enemy identity and enemy-formation overlap remain unresolved.'];
  }
  return selectionUncertain ? ['Enemy identities and final combat formula remain unresolved.'] : [];
}

function enemyMitigationAssumptions(modifier: ModifierCapability, completeCoverage: boolean, selectionUncertain: boolean): string[] {
  if (completeCoverage) {
    return [];
  }
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return [`Enemy target selection is not resolved because enemy ${statLabel(modifier.targetSelector.selectionStat)} values and tie resolution are unavailable.`];
  }
  if (modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent') {
    return ['Adjacent enemy identities and enemy-formation overlap are unresolved.'];
  }
  return selectionUncertain ? ['Enemy identity and overlap with qualifying outputs are unresolved.'] : [];
}

function enemyMitigationUnresolvedQuestions(modifier: ModifierCapability, completeCoverage: boolean, selectionUncertain: boolean): string[] {
  if (completeCoverage) {
    return ['Enemy identities remain unnamed because the enemy formation is unavailable.'];
  }
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return [`Highest-${statLabel(modifier.targetSelector.selectionStat)} enemy identity, tie resolution, and final mitigation formula remain unresolved.`];
  }
  if (modifier.targetSelector.scope === 'within-adjacency' || modifier.targetSelector.selection === 'adjacent') {
    return ['Adjacent enemy identity, enemy-formation overlap, and final mitigation formula remain unresolved.'];
  }
  return selectionUncertain ? ['Selected enemy identity, overlap with qualifying outputs, and final mitigation formula remain unresolved.'] : [];
}

function enemyDamageDealtExactUnknownReason(
  modifier: ModifierCapability,
  completeCoverage: boolean,
  context: { effect: AbilityEffect } | null,
): string {
  if (hasUnverifiedStructuredStatScaling(context?.effect ?? null)) {
    return 'Exact final reduced enemy damage cannot be calculated because the final stat reduction depends on unresolved scaling and final combat formulas.';
  }
  if (completeCoverage) {
    return 'Exact final reduced enemy damage cannot be calculated because the final combat formula is not fully verified.';
  }
  if (modifier.targetSelector.selection === 'highest-stat' && modifier.targetSelector.selectionStat) {
    return `Exact final reduced enemy damage cannot be calculated because enemy ${statLabel(modifier.targetSelector.selectionStat)} tie resolution and final combat formula are unresolved.`;
  }
  return 'Exact final reduced enemy damage cannot be calculated because target identity, overlap, and final combat formulas are unresolved.';
}

function exactUnknownReason(modifier: ModifierCapability, matchKind: string): string {
  if (modifierHasStackMetadata(modifier)) {
    return 'Exact final stack benefit cannot be calculated because activation, repeat count, final stack count, uptime, and final formulas are unresolved.';
  }
  if (matchKind === 'periodic-status-damage') {
    return 'Exact final periodic damage cannot be calculated because application success on each independently checked enemy, successful-application uptime, first-tick timing, refresh behavior, stacking, mitigation, and final formulas are unresolved.';
  }
  if (matchKind === 'extra-basic-attack-trigger') {
    return 'Exact final repeat-trigger result cannot be calculated because repeat count and final formulas are unresolved.';
  }
  if (modifier.channel === 'recovery') {
    return "Exact final Recovery cannot be calculated because the game's Level and Instinct Recovery formula is unknown.";
  }
  if (matchKind === 'outgoing-effect-amplification') {
    return 'Exact final amplified damage cannot be calculated because modifier-combination behavior and final combat formulas are not fully verified.';
  }
  return 'Exact final result is unknown.';
}

function modifierHasStackMetadata(modifier: Pick<ModifierCapability, 'stackMaximum' | 'valuePerStack' | 'unit'>): boolean {
  return modifier.stackMaximum !== null || modifier.valuePerStack !== null || modifier.unit === 'stack';
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
    case 'damage-dealt':
      return 'Damage Dealt';
    case 'recovery':
      return 'Recovery';
    case 'stat':
      return 'Stat';
    case 'damage-received':
      return 'Damage Received';
    case 'status':
      return 'Status';
    case 'control':
      return 'Control';
  }
}

function directedChannelLabel(channel: EffectChannel, direction: ModifierDirection): string {
  const label = channelLabel(channel);
  if (/\b(?:Dealt|Received)$/i.test(label)) {
    return label;
  }
  return `${label} ${direction === 'dealt' ? 'Dealt' : 'Received'}`;
}

function statusLabel(statusId: string): string {
  return statusId
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('-');
}

function statusDisplayName(statusId: string): string {
  return statusLabel(statusId).replace(/-Support$/i, '').replace(/-/g, ' ');
}

function effectStatusLabel(effect: AbilityEffect | null | undefined, fallback: string): string {
  return effect ? statusLabel(statusIdForEffect(effect) ?? effect.type) : fallback;
}

function statusMatchesCategory(statusId: string, categoryId: string): boolean {
  return statusCategoryMembers[categoryId]?.includes(statusId) ?? false;
}

function statusMatchesDependency(
  statusId: string,
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
): boolean {
  if (dependency.statusId) {
    return statusId === dependency.statusId;
  }
  return dependency.statusCategoryId ? statusMatchesCategory(statusId, dependency.statusCategoryId) : false;
}

function statusDependencyLabel(
  dependency: CapabilityDependency & { type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status' | 'requires-target-status-category' },
): string {
  if (dependency.statusId) {
    return statusLabel(dependency.statusId);
  }
  return dependency.statusCategoryId ? `${statusLabel(dependency.statusCategoryId)} status` : 'required status';
}

function statusOutputTargetsFriendlyRecipient(
  statusOutput: StatusOutputCapability,
  effect: AbilityEffect,
  providerPosition: FormationPosition,
  recipientPosition: FormationPosition,
): boolean {
  const syntheticOutput: OutputCapability = {
    id: statusOutput.id,
    outputKind: 'status-application',
    dragonId: statusOutput.dragonId,
    abilityId: statusOutput.abilityId,
    abilityName: statusOutput.abilityName,
    label: statusOutput.abilityName,
    channel: 'status',
    sourceKind: 'habit',
    sourceScope: 'all-qualifying-sources',
    targetSide: statusOutput.targetSide,
    targetCount: effect.targetCount ?? statusOutput.targetSelector.count,
    targetScope: effect.targetScope,
    unlockStarRank: statusOutput.unlockStarRank,
    minimumDragonLevel: statusOutput.minimumDragonLevel,
    requiredHabitLevel: statusOutput.requiredHabitLevel,
    conditional: false,
    conditions: [],
    dependencies: [],
    currentlyAvailable: statusOutput.currentlyAvailable,
    futureAvailable: statusOutput.futureAvailable,
    availability: statusOutput.availability,
    directlyVerified: statusOutput.directlyVerified,
    combatLogConfirmed: false,
    confidence: 'confirmed',
    evidenceIds: statusOutput.evidenceIds,
    sourceEffectId: statusOutput.sourceEffectId,
  };
  return outputTargetsRecipient(
    syntheticOutput,
    providerPosition,
    recipientPosition,
    statusOutput.targetSelector,
  ).satisfied !== false;
}

function allAbilities(dragon: Dragon): AbilityDefinition[] {
  return [dragon.command, dragon.trait, ...dragon.habits]
    .filter((ability): ability is AbilityDefinition => Boolean(ability));
}

function derivableEffects(effect: AbilityEffect): AbilityEffect[] {
  if (!effect.effectOptions) {
    return [effect];
  }
  if (effect.effectOptions.mode === 'one-of') {
    return [effect];
  }
  return effect.effectOptions.options.map((option) => option.effect);
}

function dragonById(dragons: Dragon[], dragonId: string): Dragon | null {
  return dragons.find((dragon) => dragon.id === dragonId) ?? null;
}

function positionOf(formation: FormationAnalysisInput, dragonId: string): FormationPosition | null {
  return FORMATION_POSITIONS.find((position) => formation[position] === dragonId) ?? null;
}

function targetSideForEffect(effect: AbilityEffect): 'ally' | 'enemy' | 'self' {
  if (effect.targetScope === 'self' || /^Self$/i.test(effect.target)) {
    return 'self';
  }
  if (/\bally\b|\ballies\b/i.test(effect.target)) {
    return 'ally';
  }
  if (/\benemy\b|\benemies\b|\bprey\b|\btarget\b/i.test(effect.target)) {
    return 'enemy';
  }
  const channel = outputChannelForEffect(effect);
  if (channel && isDamageChannel(channel)) {
    return 'enemy';
  }
  if (['Bleed', 'Panic', 'Stun', 'Taunt', 'Weakened', 'Overwhelm'].includes(effect.type)) {
    return 'enemy';
  }
  return 'ally';
}

function inferTargetCount(target: string): number | null {
  const match = target.match(/\b(\d+)\b/);
  return match?.[1] ? Number(match[1]) : null;
}

function hasConditions(effect: AbilityEffect): boolean {
  return Boolean(effect.conditions?.length || effect.conditionalMultipliers?.length);
}

function effectIsConditional(schedule: AbilitySchedule, effect: AbilityEffect): boolean {
  if (hasConditions(effect) || isChanceBasedSchedule(schedule) || Boolean(effect.activationRoll)) {
    return true;
  }
  return false;
}

function conditionsForEffect(effect: AbilityEffect, schedule?: AbilitySchedule): EffectCondition[] {
  return uniqueConditions([
    ...(schedule && isChanceBasedSchedule(schedule)
      ? [{
          id: `${schedule.id}-activation-chance`,
          label: activationChanceLabel(schedule),
          description: activationChanceLabel(schedule),
          evidenceIds: [],
          unresolved: false,
        }]
      : []),
    ...(schedule?.conditions ?? []).map((condition) => ({
      id: condition.id,
      label: condition.description,
      description: condition.description,
      evidenceIds: [],
      unresolved: condition.unresolved,
      kind: condition.kind,
      subject: condition.subject,
      statusId: condition.statusId,
      statusCategoryId: condition.statusCategoryId,
      comparison: condition.comparison,
      thresholdPercent: condition.thresholdPercent,
      battleContext: condition.battleContext,
    })),
    ...(effect.conditions ?? []).map((condition) => ({
      id: condition.id,
      label: condition.description,
      description: condition.description,
      evidenceIds: [],
      unresolved: condition.unresolved,
      kind: condition.kind,
      subject: condition.subject,
      statusId: condition.statusId,
      statusCategoryId: condition.statusCategoryId,
      comparison: condition.comparison,
      thresholdPercent: condition.thresholdPercent,
      battleContext: condition.battleContext,
    })),
    ...(effect.conditionalMultipliers ?? []).map((condition) => ({
      id: condition.id,
      label: condition.description,
      description: condition.description,
      evidenceIds: [],
      unresolved: false,
    })),
  ]);
}

function uniqueConditions(conditions: EffectCondition[]): EffectCondition[] {
  const byId = new Map<string, EffectCondition>();
  for (const condition of conditions) {
    if (!byId.has(condition.id)) {
      byId.set(condition.id, condition);
    }
  }
  return [...byId.values()];
}

function isChanceBasedSchedule(schedule: AbilitySchedule): boolean {
  return schedule.triggerChanceFixed !== null || schedule.triggerChanceByHabitLevel.length > 0 || Boolean(schedule.activationRoll);
}

function activationChanceLabel(schedule: AbilitySchedule): string {
  if (schedule.activationRoll) {
    return schedule.activationRoll.description;
  }
  if (schedule.triggerChanceFixed !== null) {
    return `Activation chance ${schedule.triggerChanceFixed}% per ${schedule.timing.replaceAll('-', ' ')}.`;
  }
  return `Activation chance depends on Habit Level for ${schedule.timing.replaceAll('-', ' ')}.`;
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

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      ordered.push(value);
    }
  }
  return ordered;
}

function selectedFormationDragonIds(formation: FormationAnalysisInput): Set<string> {
  return new Set(Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId)));
}

function dedupeRequirements(requirements: RequirementTrace[]): RequirementTrace[] {
  const byKey = new Map<string, RequirementTrace>();
  for (const requirement of requirements) {
    const key = [
      requirement.id,
      requirement.label,
      requirement.expected,
      requirement.actual ?? '',
      String(requirement.satisfied),
    ].join('|');
    if (!byKey.has(key)) {
      byKey.set(key, requirement);
    }
  }
  return [...byKey.values()];
}

function primaryDamageChannelForDragon(dragonId: string): EffectChannel | null {
  if (dragonId === 'syrax') {
    return 'tactical-damage';
  }
  if (dragonId === 'caraxes') {
    return 'fire-damage';
  }
  if (dragonId === 'crimson') {
    return 'fire-damage';
  }
  if (dragonId === 'kalspire') {
    return 'tactical-damage';
  }
  if (dragonId === 'vhagar' || dragonId === 'venator') {
    return 'physical-damage';
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
  if (dragonId === 'syrax' || dragonId === 'caraxes' || dragonId === 'crimson' || dragonId === 'kalspire' || dragonId === 'vhagar' || dragonId === 'venator' || dragonId === 'malachite' || dragonId === 'sheepstealer') {
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
