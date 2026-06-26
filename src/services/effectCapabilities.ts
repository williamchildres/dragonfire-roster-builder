import { databaseMetadata } from '../data/databaseMetadata';
import { evidenceSources } from '../data/evidence';
import { dragonObservationSnapshots } from '../data/observations';
import { statusGlossary } from '../data/statusGlossary';
import {
  FORMATION_POSITIONS,
  type AbilityDefinition,
  type AbilityEffect,
  type AbilitySchedule,
  type Dragon,
  type EffectSourceScope,
  type FormationPosition,
  type OwnedDragon,
  type RankedValue,
} from '../models/dragon';
import type {
  AbilityTarget,
  AmplificationSynergyTrace,
  CapabilityMatch,
  CapabilityAvailabilityContext,
  CapabilityDependency,
  CapabilitySourceKind,
  CapabilitySourceScope,
  DefensiveDamageScope,
  DragonEffectProfile,
  DragonStatId,
  EffectChannel,
  EffectCondition,
  ExtraActionCapability,
  FormationAnalysisInput,
  ModifierCapability,
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
  normalizeDamageSourceScope,
} from './formationRules';

export interface CapabilityOptions {
  roster?: Record<string, OwnedDragon>;
  previewMaxRankInteractions?: boolean;
  dragonLevels?: Record<string, number | null>;
}

const reviewedDragonIds = ['syrax', 'vhagar', 'caraxes', 'seasmoke', 'crimson', 'kalspire', 'malachite', 'venator', 'daemoros', 'vaeldra', 'sheepstealer', 'vermax'];

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
      for (const schedule of ability.schedules) {
        for (const effect of schedule.effects.flatMap(derivableEffects)) {
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
          conditional: ability.kind === 'habit' || hasConditions(effect) || effect.stack !== null || isChanceBasedSchedule(schedule) || Boolean(effect.activationRoll),
          conditions: conditionsForEffect(effect, schedule),
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
    }
    return capabilities;
  });
}

export function effectiveAbilitySchedules(
  ability: AbilityDefinition,
  starRank: number | null,
): AbilitySchedule[] {
  let schedules = ability.schedules;
  for (const augmentation of ability.augmentations) {
    if (starRank === null || starRank < augmentation.minimumDragonStarRank) {
      continue;
    }
    for (const override of augmentation.scheduleOverrides ?? []) {
      schedules = schedules.map((schedule) => {
        if (schedule.id !== override.targetScheduleId) {
          return schedule;
        }
        if (override.operation === 'replace-schedule' && override.replacementSchedule) {
          return override.replacementSchedule;
        }
        if (override.operation === 'replace-effect-roll' && override.targetEffectId && override.replacementEffect) {
          return {
            ...schedule,
            effects: schedule.effects.map((effect) =>
              effect.id === override.targetEffectId ? override.replacementEffect! : effect,
            ),
          };
        }
        if (override.operation === 'replace-effect' && override.targetEffectId && override.replacementEffect) {
          return {
            ...schedule,
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
      ability.schedules.flatMap((schedule) =>
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
      ability.schedules.flatMap((schedule) =>
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
      const hasAfterBasicAttackTrigger = ability.schedules.some(
        (schedule) => schedule.timing === 'after-basic-attack' || schedule.roundSelector?.kind === 'after-basic-attack',
      );
      if (!hasAfterBasicAttackTrigger) {
        return [];
      }
      return [{
        id: `${ability.id}-after-basic-attack-trigger`,
        dragonId: dragon.id,
        abilityId: ability.id,
        abilityName: ability.name,
        triggerEvent: 'after-basic-attack' as const,
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
      ability.schedules.flatMap((schedule) =>
        schedule.effects.flatMap((effect) => derivableEffects(effect).flatMap((derivedEffect) => {
          const periodic = periodicDamageForEffect(derivedEffect);
          if (!periodic) {
            return [];
          }
          return [{
            statusId: periodic.statusId,
            dragonId: dragon.id,
            abilityId: ability.id,
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
  return [
    ...analyzeOutgoingAmplifications(formation, dragons, outputs, modifiers, options),
    ...analyzeIncomingAmplifications(formation, dragons, outputs, modifiers, options),
    ...analyzeAllyOutputSupport(formation, dragons, outputs, options),
    ...analyzeExtraActionTriggerChains(formation, dragons, extraActions, triggeredAbilities, options),
    ...analyzeStatusConditionEnablement(formation, dragons, outputs, statusOutputs, options),
    ...analyzeStatusEffectConditionEnablement(formation, dragons, statusOutputs, options),
    ...analyzeDefensiveAllySupport(formation, dragons, modifiers, options),
    ...analyzeDirectStatSupport(formation, dragons, modifiers, options),
    ...analyzeStatScalingSupport(formation, dragons, outputs, modifiers, options),
    ...analyzeEnemyMitigationReduction(formation, dragons, outputs, modifiers, options),
    ...analyzeEnemyDamageDealtReductions(formation, dragons, modifiers, options),
    ...analyzeEnemyDamageReceivedIncreases(formation, dragons, outputs, modifiers, options),
    ...analyzePeriodicDamageAmplification(formation, dragons, periodicDamage, modifiers, options),
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
      capability.targetCount !== 1 &&
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
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId) {
        continue;
      }
      const recipient = dragonById(dragons, recipientId);
      if (!recipient) {
        continue;
      }
      const targeting = outputTargetsRecipient(output, providerPosition, recipientPosition);
      const sourceAbility = allAbilities(provider).find((ability) => ability.id === output.abilityId);
      const requirements = dedupeRequirements([
        targeting,
        ...(sourceAbility
          ? requirementDefinitionsForAbility(sourceAbility).map((requirement) =>
              resolveRequirement(requirement, output.dragonId, formation, options),
            )
          : []),
        ...outputRequirementTraces(output, options),
      ]);
      traces.push(makeDependencyTrace({
        id: `ally-output-support-${output.id}-${recipientId}`,
        matchKind: 'outgoing-effect-amplification',
        ruleId: 'ally-output-support',
        source: provider,
        sourceAbilityId: output.abilityId,
        recipient,
        recipientAbilityId: output.id,
        channel: output.channel,
        title: `${output.abilityName} ${channelLabel(output.channel)} support`,
        explanation: `${provider.name}'s ${output.abilityName} can provide ${channelLabel(output.channel)} to ${recipient.name}.`,
        requirements,
        matchedFacts: [`${output.abilityName} targets ${output.targetCount ?? 'unknown'} ally target(s).`],
        effects: [`${channelLabel(output.channel)} support`],
        sourceEvidenceIds: output.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: [],
        unresolvedQuestions: output.channel === 'recovery' ? ['Exact final Recovery amount is unknown because the full Level and Instinct Recovery formula is not known.'] : [],
        futureOrConditional: output.futureAvailable || output.conditional,
      }));
    }
  }
  return traces;
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
      if (!recipientId || (recipientId === extraAction.dragonId && extraAction.targetSelector.includesCaster !== true)) {
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
            `${statusLabel(extraAction.statusId)} may grant ${recipient.name} a second Basic Attack, which can trigger ${triggeredAbility.abilityName} again.`,
          requirements,
          matchedFacts: [
            `Status semantic: ${statusLabel(extraAction.statusId)} - ${extraAction.statusDefinition}`,
            `Extra action type: ${extraAction.actionType}.`,
            `Trigger event: ${extraAction.triggerEvent}.`,
            `Extra action recipient and triggered ability owner: ${recipient.id}.`,
            `${triggeredAbility.abilityName} triggers after each Basic Attack.`,
            `${extraAction.abilityName} targets ${targetSelectorSummary(extraAction.targetSelector)}.`,
            ...(extraAction.sourceEffectId ? [`Source effect ID: ${extraAction.sourceEffectId}.`] : []),
            ...(extraAction.activationGroupId ? [`Shared activation group: ${extraAction.activationGroupId}.`] : []),
            ...extraActionActivationChanceFacts(extraAction),
            ...(extraAction.durationRounds !== null ? [`Duration: ${extraAction.durationRounds} rounds.`] : []),
          ],
          effects: [`Potential extra Basic Attack can trigger ${triggeredAbility.abilityName} again.`],
          sourceEvidenceIds: extraAction.evidenceIds,
          recipientEvidenceIds: triggeredAbility.evidenceIds,
          assumptions: [
            'Provider activation is not guaranteed.',
            'Target selection may choose another eligible recipient.',
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
): AmplificationSynergyTrace[] {
  const traces: AmplificationSynergyTrace[] = [];
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
      if (!recipientId || (recipientId === modifier.dragonId && modifier.targetSelector.includesCaster !== true)) {
        continue;
      }
      const targeting = targetRequirement(modifier, providerPosition, recipientPosition);
      const candidateOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          modifierMatchesOutputChannel(modifier.channel, output.channel) &&
          outputCapabilityVisible(output, options),
      );
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
        explanation: outgoingExplanation(provider.name, modifier, recipient.name, compatible, outputs),
        assumptions: outgoingAssumptions(modifier, compatible),
        unresolvedQuestions: unresolvedForModifier(modifier),
      }));
    }
    traces.push(...groupSingleTargetOutgoingTraces(modifier, modifierTraces, outputs, dragons));
  }
  return traces;
}

function groupDefensiveAllySupportTraces(traces: SynergyTrace[], dragons: Dragon[]): SynergyTrace[] {
  const trialByFlame = traces.filter((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame');
  const otherTraces = traces.filter((trace) => trace.sourceAbilityId !== 'vermax-trial-by-flame');
  const grouped: SynergyTrace[] = [];
  if (trialByFlame.length > 0) {
    grouped.push(groupTrialByFlameTrace(trialByFlame, dragons));
  }

  const byAbilityRecipient = new Map<string, SynergyTrace[]>();
  for (const trace of otherTraces) {
    const key = [
      trace.sourceDragonId,
      trace.sourceAbilityId ?? '',
      trace.recipientDragonId ?? '',
      trace.damageScope ?? '',
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

function groupTrialByFlameTrace(items: SynergyTrace[], dragons: Dragon[]): SynergyTrace {
  const first = items[0]!;
  const recipientIds = uniqueSorted(
    items.map((trace) => trace.recipientDragonId).filter((dragonId): dragonId is string => Boolean(dragonId)),
  );
  const recipientNames = recipientIds.map((dragonId) => dragonById(dragons, dragonId)?.name ?? dragonId);
  const thresholdRows = uniqueOrdered(
    items.flatMap((trace) => {
      const threshold = trace.matchedFacts
        .join(' ')
        .match(/below (\d+)%/i)?.[1];
      const effect = trace.effects[0]?.match(/Fire Damage Received decrease (.+)$/)?.[1];
      return threshold && effect ? [`Below ${threshold}% Troop Capacity: Fire Damage Received -${effect.replace(/^-/, '')}`] : [];
    }),
  );
  return {
    ...first,
    id: 'defensive-ally-support-vermax-trial-by-flame-grouped',
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
    explanation: `Trial by Flame can reduce Fire Damage Received for ${joinEnglishList(recipientNames)} when each satisfies a Troop Capacity threshold. ${thresholdRows.join('; ')}. Threshold applicability depends on each recipient's current Troop Capacity; exact interaction between overlapping threshold tiers is unresolved.`,
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
      capability.role === 'ally-support' &&
      capability.direction === 'received' &&
      capability.channel === 'damage-received' &&
      capability.operation === 'decrease' &&
      capability.targetSelector.selection !== 'self' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    if (!providerPosition) {
      continue;
    }
    for (const recipientPosition of FORMATION_POSITIONS) {
      const recipientId = formation[recipientPosition];
      if (!recipientId || recipientId === modifier.dragonId) {
        continue;
      }
      const provider = dragonById(dragons, modifier.dragonId);
      const recipient = dragonById(dragons, recipientId);
      if (!provider || !recipient) {
        continue;
      }
      const requirements = dedupeRequirements([
        targetRequirement(modifier, providerPosition, recipientPosition),
        ...providerRequirementTraces(modifier, formation, dragons, options),
      ]);
      const damageLabel = damageReceivedLabel(modifier.damageScope);
      const displayValue = modifierDisplayValue(modifier, options);
      traces.push(makeDependencyTrace({
        id: `defensive-ally-support-${modifier.id}-${recipientId}`,
        matchKind: 'defensive-ally-support',
        ruleId: 'defensive-ally-support',
        source: provider,
        sourceAbilityId: modifier.abilityId,
        recipient,
        recipientAbilityId: null,
        channel: 'damage-received',
        title: `${damageLabel} Support`,
        explanation: `${provider.name}'s ${modifier.abilityName} can reduce ${recipient.name}'s ${damageLabel} by ${displayValue}.`,
        requirements,
        matchedFacts: [
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          ...modifier.conditions.map((condition) => condition.description),
        ],
        effects: [`${damageLabel} ${modifier.operation} ${displayValue}`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: [],
        unresolvedQuestions: [],
        futureOrConditional: modifier.futureAvailable || modifier.conditional,
        modifier,
        damageScope: modifier.damageScope,
      }));
    }
  }
  return groupDefensiveAllySupportTraces(traces, dragons);
}

function groupSingleTargetOutgoingTraces(
  modifier: ModifierCapability,
  traces: AmplificationSynergyTrace[],
  outputs: OutputCapability[],
  dragons: Dragon[],
): AmplificationSynergyTrace[] {
  const eligible = traces.filter((trace) => !['inactive', 'blocked', 'not-applicable'].includes(trace.status));
  if (
    modifier.targetSelector.count !== 1 ||
    eligible.length <= 1 ||
    modifier.targetSelector.selection === 'specific-position' ||
    modifier.targetSelector.selection === 'one-eligible-adjacent' ||
    modifier.targetSelector.selection === 'adjacent'
  ) {
    return traces;
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
          modifier.operation === 'increase' &&
          modifierCapabilityVisible(modifier, options),
      );
      for (const modifier of recipientModifiers) {
        const targeting = outputTargetsRecipient(output, providerPosition, recipientPosition);
        if (targeting.satisfied === false) {
          continue;
        }
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
                status.statusId === dependency.statusId &&
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
              traces.push(makeDependencyTrace({
                id: `status-effect-condition-${statusOutput.id}-${ability.id}-${effect.id}-${dependency.type}-${dependency.statusId}`,
                matchKind: 'status-condition-enablement',
                ruleId: 'status-condition-enablement',
                source: provider,
                sourceAbilityId: statusOutput.abilityId,
                recipient: dependentDragon,
                recipientAbilityId: ability.id,
                channel: 'status',
                title: `${statusLabel(statusOutput.statusId)} enables ${ability.name}`,
                explanation: `${provider.name}'s ${statusOutput.abilityName} can apply ${statusLabel(statusOutput.statusId)}. ${dependentDragon.name}'s ${ability.name} has a verified ${effect.type} condition that depends on the target having ${statusLabel(statusOutput.statusId)}. Target overlap and uptime are not guaranteed.`,
                requirements,
                matchedFacts: [
                  ...dependency.notes,
                  ...conditionalChanceFacts(effect, dependency.statusId, schedule),
                ],
                effects: [`Conditional ${effect.type}: ${statusLabel(statusOutput.statusId)}`],
                sourceEvidenceIds: statusOutput.evidenceIds,
                recipientEvidenceIds: ability.evidenceIds,
                assumptions: [
                  'The status provider and dependent effect must select the same enemy target.',
                  'Target overlap, trigger timing, and exact uptime are not simulated.',
                ],
                unresolvedQuestions: ['Exact target overlap and final conditional uptime are unresolved.'],
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
        (status) => status.statusId === dependency.statusId && statusCapabilityVisible(status, options),
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
        const explanation = statusConditionExplanation(provider, statusOutput, recipient, output);
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
          matchedFacts: dependency.notes,
          effects: [`Status condition: ${statusLabel(statusOutput.statusId)}`],
          sourceEvidenceIds: statusOutput.evidenceIds,
          recipientEvidenceIds: output.evidenceIds,
          assumptions: [
            ...statusOutput.conditions.map((condition) => condition.description),
            ...statusConditionAssumptions(statusOutput, output),
          ],
          unresolvedQuestions: ['Trigger timing, target selection, and exact uptime are not simulated.'],
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
      if (!recipientId || recipientId === modifier.dragonId) {
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
        explanation: `${provider.name}'s ${modifier.abilityName} can increase ${recipient.name}'s ${statLabel(statId)}.`,
        requirements,
        matchedFacts: [
          `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
          ...targetSelectionFacts(formation, dragons, modifier),
        ],
        effects: [`${statLabel(statId)} ${modifierDisplayValue(modifier, options)}`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: [],
        assumptions: [],
        unresolvedQuestions: [],
        futureOrConditional: modifier.futureAvailable || modifier.conditional,
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
      if (!recipientId || recipientId === modifier.dragonId) {
        continue;
      }
      const matchedOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          outputCapabilityVisible(output, options) &&
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
        explanation: `${provider.name}'s ${modifier.abilityName} can increase ${recipient.name}'s ${statLabel(statId)}, which supports ${abilityOutputSummary(matchedOutputs)}.`,
        requirements,
        matchedFacts: matchedOutputs.map((output) => `${output.abilityName} scales with ${statLabel(statId)}.`),
        effects: [`${statLabel(statId)} support for ${abilityOutputSummary(matchedOutputs)}`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
        assumptions: ['Exact stat-to-effect conversion formula is unknown.'],
        unresolvedQuestions: ['Final value and stacking order are not calculated.'],
        futureOrConditional: modifier.futureAvailable || modifier.conditional || matchedOutputs.some((output) => output.futureAvailable || output.conditional),
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
  const eligible = FORMATION_POSITIONS.filter((position) => {
    const dragonId = formation[position];
    if (!dragonId || (dragonId === modifier.dragonId && modifier.targetSelector.includesCaster !== true)) {
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
  return uniqueOrdered(
    traces.flatMap((trace) => trace.effects.map((effect) => effect.match(/^(Strength|Instinct|Intelligence|Initiative)\b/)?.[1] ?? '').filter(Boolean)),
  );
}

function groupedStatValueText(traces: SynergyTrace[]): { stats: string[]; text: string } {
  const entries = traces.flatMap((trace) =>
    trace.effects.flatMap((effect) => {
      const match = effect.match(/^(Strength|Instinct|Intelligence|Initiative)\s+(.+)$/);
      return match?.[1] && match[2] ? [{ stat: match[1], value: match[2] }] : [];
    }),
  );
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
  return FORMATION_POSITIONS
    .map((position) => formation[position])
    .filter((dragonId): dragonId is string => Boolean(dragonId && dragonId !== modifier.dragonId))
    .map((dragonId) => `${dragonById(dragons, dragonId)?.name ?? dragonId} ${statLabel(statId)}: ${observedStatValue(dragons, dragonId, statId) ?? 'unknown'}.`);
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
      if (recipientId === modifier.dragonId) {
        continue;
      }
      const matchedOutputs = outputs.filter(
        (output) =>
          output.dragonId === recipientId &&
          output.channel === mitigationChannel &&
          outputCapabilityVisible(output, options) &&
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
        channel: mitigationChannel,
        title: `${channelLabel(mitigationChannel)} Mitigation Reduction`,
        explanation: `${provider.name}'s ${modifier.abilityName} can reduce enemy ${statLabel(statId)}. ${recipient.name}'s ${channelLabel(mitigationChannel)} outputs are mitigated by that stat.`,
        requirements,
        matchedFacts: matchedOutputs.map((output) => `${output.abilityName} is mitigated by target ${statLabel(statId)}.`),
        effects: [`Enemy ${statLabel(statId)} reduction may improve ${channelLabel(mitigationChannel)} outputs: ${matchedOutputs.map((output) => output.label).join(', ')}.`],
        sourceEvidenceIds: modifier.evidenceIds,
        recipientEvidenceIds: matchedOutputs.flatMap((output) => output.evidenceIds),
        assumptions: ['Enemy target overlap is not simulated.'],
        unresolvedQuestions: ['Exact enemy-formation targeting and final mitigation formula are unknown.'],
        futureOrConditional: true,
      }));
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
    const providerPosition = positionOf(formation, modifier.dragonId);
    const provider = dragonById(dragons, modifier.dragonId);
    if (!providerPosition || !provider) {
      continue;
    }
    const requirements = providerRequirementTraces(modifier, formation, dragons, options);
    traces.push({
      id: `enemy-damage-dealt-reduction-${modifier.id}`,
      ruleId: 'enemy-damage-dealt-reduction',
      status: statusFromRequirements(requirements, modifier.futureAvailable || modifier.conditional),
      confidence: modifier.confidence,
      sourceDragonId: provider.id,
      sourceAbilityId: modifier.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: `${channelLabel(modifier.channel)} Enemy Reduction`,
      explanation: `${provider.name}'s ${modifier.abilityName} can reduce enemy ${channelLabel(modifier.channel)}. Enemy target selection is tracked as an enemy-side candidate group, not a named friendly recipient.`,
      requirements,
      matchedFacts: [
        `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
        ...modifier.conditions.map((condition) => condition.description),
        ...(modifier.activationGroupId ? [`Shared activation group: ${modifier.activationGroupId}.`] : []),
        ...activationChanceFacts(modifier),
      ],
      effects: [`Enemy ${channelLabel(modifier.channel)} ${modifier.operation} ${modifierDisplayValue(modifier, options)}`],
      conflicts: requirements
        .filter((requirement) => requirement.satisfied === false)
        .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      assumptions: [
        'Enemy target selection is not resolved because enemy formation members and current troop values are unavailable.',
        'Activation chance and uptime are not treated as guaranteed.',
      ],
      unresolvedQuestions: ['Enemy-side current-troop tie-breaking, final uptime, and stacking/refresh behavior remain unresolved.'],
      sourceEvidenceIds: modifier.evidenceIds,
      recipientEvidenceIds: [],
      combatLogConfirmed: modifier.combatLogConfirmed,
      exactResultKnown: false,
      exactResultUnknownReason: 'Exact final reduced enemy damage cannot be calculated because target selection, uptime, stacking, and final formulas are unresolved.',
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

function analyzeEnemyDamageReceivedIncreases(
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
        modifierMatchesOutputChannel(modifier.channel, output.channel) &&
        sourceScopesCompatible(modifier.sourceScope, output.sourceScope),
    );
    const requirements = providerRequirementTraces(modifier, formation, dragons, options);
    const outputLabels = outputChannelNames(outputs, matchedOutputs.map((output) => output.id));
    const channel = channelLabel(modifier.channel);
    const displayValue = modifierDisplayValue(modifier, options);
    traces.push({
      id: `enemy-damage-received-increase-${modifier.id}`,
      ruleId: 'enemy-damage-received-increase',
      status: statusFromRequirements(requirements, modifier.futureAvailable || modifier.conditional),
      confidence: modifier.confidence,
      sourceDragonId: provider.id,
      sourceAbilityId: modifier.abilityId,
      recipientDragonId: null,
      recipientAbilityId: null,
      title: `Enemy ${channel} vulnerability`,
      explanation: `${provider.name}'s ${modifier.abilityName} increases ${channel} Received for one enemy target. Allied ${channel} can benefit when its target overlaps with that enemy.`,
      requirements,
      matchedFacts: [
        `${modifier.abilityName} targets ${targetSelectorSummary(modifier.targetSelector)}.`,
        `Modifier capability ID: ${modifier.id}.`,
        `Source scope: ${modifier.sourceScope}.`,
        ...(modifier.sourceEffectId ? [`Source effect ID: ${modifier.sourceEffectId}.`] : []),
        ...(outputLabels.length > 0 ? [`Qualifying allied outputs: ${outputLabels.join(', ')}.`] : []),
        ...modifier.conditions.map((condition) => condition.description),
        ...activationChanceFacts(modifier),
      ],
      effects: [`${channel} Received increase ${displayValue}`],
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
      recipientModifierValue: modifier.value,
      combatLogConfirmed: modifier.combatLogConfirmed,
      exactResultKnown: false,
      exactResultUnknownReason: 'Exact final damage gain cannot be calculated because target overlap, uptime, stacking, and final formulas are unresolved.',
      matchKind: 'enemy-damage-received-increase',
      channel: modifier.channel,
      modifierRole: modifier.role,
      targetSelectorSummary: targetSelectorSummary(modifier.targetSelector),
      modifierSelfOnly: false,
      availabilityContext: modifier.availability.reportLabel,
      modifierCapabilityId: modifier.id,
      modifierCapabilityIds: [modifier.id],
      matchedOutputCapabilityIds: matchedOutputs.map((output) => output.id),
      interactionScope: 'enemy-side',
      damageScope: modifier.damageScope,
    });
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
    (capability) =>
      capability.role === 'ally-support' &&
      capability.direction === 'dealt' &&
      capability.operation === 'increase' &&
      modifierCapabilityVisible(capability, options),
  )) {
    const providerPosition = positionOf(formation, modifier.dragonId);
    for (const periodic of periodicDamage.filter(
      (item) => item.channel === modifier.channel && periodicDamageVisible(item, dragons, options),
    )) {
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
        futureOrConditional: true,
      }));
    }
  }
  return traces;
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
    matchedFacts,
    effects,
    conflicts: dedupedRequirements
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

function statusConditionExplanation(
  provider: Dragon,
  statusOutput: StatusOutputCapability,
  recipient: Dragon,
  output: OutputCapability,
): string {
  if (statusOutput.statusId === 'first-strike' && output.abilityId === 'caraxes-infernal-burst') {
    return `${provider.name} can grant ${recipient.name} First-Strike. While First-Strike is active, Infernal Burst deals 1.5x damage. Activation and timing are conditional.`;
  }
  if (statusOutput.statusId === 'slow' && output.abilityId === 'syrax-strategic-revival') {
    return `${provider.name} can apply Slow. ${recipient.name}'s Strategic Revival multiplies Recovery by 1.5x if any enemy has Slow. Activation, unlock state, and timing are conditional.`;
  }
  return `${provider.name} can apply ${statusLabel(statusOutput.statusId)}. ${recipient.name}'s ${output.abilityName} has a verified condition depending on ${statusLabel(statusOutput.statusId)}.`;
}

function statusConditionAssumptions(statusOutput: StatusOutputCapability, output: OutputCapability): string[] {
  const assumptions: string[] = [];
  if (statusOutput.chanceFixed !== null) {
    assumptions.push(`Status application has a ${statusOutput.chanceFixed}% trigger chance.`);
  }
  if (statusOutput.chanceByHabitLevel.length > 0) {
    assumptions.push('Status application chance depends on Habit Level.');
  }
  if (statusOutput.targetSelector.selection === 'any' || statusOutput.targetSelector.selection === 'eligible') {
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
  const dedupedRequirements = dedupeRequirements(requirements);
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
      ...activationChanceFacts(modifier),
      ...matches.map((match) => `Matched ${match.outputCapabilityId}.`),
    ],
    effects: [
      `${channelLabel(modifier.channel)} ${modifier.direction === 'dealt' ? 'Dealt' : 'Received'} ${modifier.operation} ${modifier.value ?? 'unknown'}${modifier.unit === 'percent' ? '%' : modifier.unit === 'stack' ? ' per stack' : ''}`,
    ],
    conflicts: dedupedRequirements
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
    modifierCapabilityIds: [modifier.id],
    matchedOutputCapabilityIds,
    sourceScopeResults: matches,
    interactionScope: interactionScopeForTrace(provider.id, recipient.id, matchKind),
    damageScope: modifier.damageScope,
  };
}

function modifierCapabilitiesForEffect(
  dragon: Dragon,
  ability: AbilityDefinition,
  schedule: AbilitySchedule,
  effect: AbilityEffect,
): ModifierCapability[] {
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
        effect.type.includes('Received') ? 'received' : 'dealt',
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
      ...baseModifier(dragon, ability, schedule, effect, 'physical-damage', 'dealt'),
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
      ...baseModifier(dragon, ability, schedule, effect, 'tactical-damage', 'dealt'),
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
    rankedValues: effect.rankedValues,
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
    operation: effect.type.includes('Down') || effect.type.includes('Reduction') ? 'decrease' : 'increase',
    value: effect.magnitude,
    rankedValues: effect.rankedValues,
    unit: effect.unit === 'percent' ? 'percent' : effect.unit === 'flat' ? 'flat' : 'unknown',
    damageScope: defensiveDamageScopeForEffect(effect),
    sourceScope: capabilitySourceScope(effect.sourceScope, effect),
    targetSelector: targetForEffect(effect),
    providerRequirements: requirementDefinitionsForAbility(ability),
    recipientRequirements: [],
    unlockStarRank: ability.unlockStarRank,
    minimumDragonLevel: ability.minimumDragonLevel,
    requiredHabitLevel: ability.kind === 'habit' ? 1 : null,
    conditional: ability.kind === 'habit' || hasConditions(effect) || isChanceBasedSchedule(schedule) || Boolean(effect.activationRoll),
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

function activationGroupId(schedule: AbilitySchedule, effect: AbilityEffect): string | null {
  return effect.targetSelection?.sharedSelectionGroupId ??
    (schedule.activationRoll?.scope === 'schedule-shared' ? `${schedule.id}-shared-activation` : null);
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
      type: 'requires-target-status' as const,
      statusId: condition.statusId,
      multiplier: condition.multiplier ?? undefined,
      notes: [condition.description],
    })),
  ];
  return dedupeDependencies(dependencies);
}

function statusDependenciesForEffect(effect: AbilityEffect, schedule: AbilitySchedule): Array<CapabilityDependency & {
  type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status';
  statusId: string;
}> {
  return dedupeDependencies([
    ...(effect.conditionalMultipliers ?? []).flatMap((multiplier) =>
      dependencyForCondition(multiplier.condition, multiplier.multiplier),
    ),
    ...(effect.conditions ?? []).flatMap((condition) => dependencyForCondition(condition)),
    ...(effect.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({
      type: 'requires-target-status' as const,
      statusId: condition.statusId,
      multiplier: condition.multiplier ?? undefined,
      notes: [condition.description],
    })),
    ...(schedule.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({
      type: 'requires-target-status' as const,
      statusId: condition.statusId,
      multiplier: condition.multiplier ?? undefined,
      notes: [condition.description],
    })),
  ]).filter(isStatusConditionDependency);
}

function conditionalChanceFacts(effect: AbilityEffect, statusId: string, schedule: AbilitySchedule): string[] {
  const rollFacts = [
    ...(effect.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({ condition, baseChance: effect.activationRoll?.chanceFixed ?? null })),
    ...(schedule.activationRoll?.targetStatusConditionalChances ?? []).map((condition) => ({ condition, baseChance: schedule.activationRoll?.chanceFixed ?? null })),
  ];
  return [
    ...rollFacts
      .filter(({ condition }) => condition.statusId === statusId)
      .map(({ condition, baseChance }) => {
        const base = baseChance !== null && baseChance !== undefined
          ? `${baseChance}%`
          : 'base chance';
        const enhanced = condition.chanceFixed !== null && condition.chanceFixed !== undefined
          ? `${condition.chanceFixed}%`
          : 'conditional chance';
        const multiplier = condition.multiplier !== null && condition.multiplier !== undefined
          ? ` (${condition.multiplier}x)`
          : '';
        return `Conditional activation chance: ${base} -> ${enhanced}${multiplier}.`;
      }),
    ...(effect.conditionalMultipliers ?? [])
      .filter((multiplier) => multiplier.condition.statusId === statusId)
      .map((multiplier) => `Conditional multiplier: ${multiplier.multiplier}x.`),
  ];
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
  type: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status';
  statusId: string;
} {
  return (
    (
      dependency.type === 'requires-self-status' ||
      dependency.type === 'requires-any-enemy-status' ||
      dependency.type === 'requires-target-status'
    ) &&
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
    effect.type === 'Physical Damage Received Reduction'
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

function modifierRoleForEffect(effect: AbilityEffect, direction: 'dealt' | 'received'): ModifierRole {
  const target = targetForEffect(effect);
  if (target.side === 'enemy') {
    return 'enemy-debuff';
  }
  if (direction === 'received' && /Damage Received/i.test(effect.type) && target.side === 'ally') {
    return 'ally-support';
  }
  if (direction === 'received' && /Damage Received/i.test(effect.type) && (target.selection === 'self' || target.side === 'self')) {
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
  const position = effect.targetScope === 'left-flank' || effect.targetScope === 'right-flank'
    ? effect.targetScope
    : null;
  const selectionStat = selectionStatForEffect(effect);
  const selectionResource = selectionResourceForEffect(effect);
  const selection = effect.targetScope === 'self'
    ? 'self'
    : position
      ? 'specific-position'
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
            ? 'one-eligible-adjacent'
            : effect.target.includes('deals')
              ? 'eligible'
              : effect.targetScope === 'any-lane'
                ? 'any'
                : 'unknown';
  const count = selection === 'all-matching-condition'
    ? null
    : selection === 'highest-stat' || selection === 'highest-resource' || selection === 'lowest-resource' || selection === 'one-eligible-adjacent'
      ? 1
      : effect.targetCount ?? inferTargetCount(effect.target);
  return {
    side: targetSideForEffect(effect),
    scope: effect.targetScope === 'opposing-position' ? 'same-lane' : effect.targetScope,
    position,
    count,
    includesCaster: effect.includesCaster ?? (effect.casterEligibility === 'excluded' ? false : effect.casterEligibility === 'eligible-if-targeting-allows' ? true : null),
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
  dependencyType: 'requires-self-status' | 'requires-any-enemy-status' | 'requires-target-status',
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
  } else if (dependencyType === 'requires-target-status') {
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
  const habitLevel = abilityId ? rosterEntry?.habitLevels[abilityId] ?? null : null;
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
      notes: ['Locked Habit capabilities are potential in preview mode, not active for current roster.'],
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
  if (requiredHabitLevel !== null && abilityId && (rosterEntry.habitLevels[abilityId] ?? 0) < requiredHabitLevel) {
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
  const stat = target.selectionStat ? `; selection stat ${target.selectionStat}` : '';
  const resource = target.selectionResource ? `; selection resource ${target.selectionResource}` : '';
  const direction = target.comparisonDirection ? `; comparison ${target.comparisonDirection}` : '';
  const pool = target.comparisonPool ? `; comparison pool ${target.comparisonPool}` : '';
  const tie = target.tieBehavior ? `; tie behavior ${target.tieBehavior}` : '';
  const group = target.sharedSelectionGroupId ? `; shared group ${target.sharedSelectionGroupId}` : '';
  return `${target.side}; ${target.scope}; ${target.selection}; ${count}; ${caster}${stat}${resource}${direction}${pool}${tie}${group}`;
}

function defensiveDamageScopeForEffect(effect: AbilityEffect): DefensiveDamageScope | null {
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
    : undefined;
  const value = rankedValue?.value ?? modifier.value;
  if (value === null) {
    return 'unknown';
  }
  const unit = rankedValue?.unit ?? modifier.unit;
  return `${value}${unit === 'percent' ? '%' : unit === 'flat' ? ' flat' : ''}`;
}

function activationChanceFacts(modifier: ModifierCapability): string[] {
  if (modifier.activationChanceFixed !== null && modifier.activationChanceFixed !== undefined) {
    return [`Activation chance: ${modifier.activationChanceFixed}%.`];
  }
  if (modifier.activationChanceByHabitLevel?.length) {
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
  if (matchKind === 'enemy-mitigation-reduction') {
    return 'enemy-side';
  }
  if (!recipientDragonId) {
    return 'targeting-fact';
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
): string {
  const labels = outputChannelNames(outputs, matches.map((match) => match.outputCapabilityId)).join(', ');
  if (modifier.dragonId === 'sheepstealer' && modifier.channel === 'physical-damage') {
    return `${providerName}'s ${modifier.abilityName} increases ${recipientName}'s Physical Damage Dealt by ${modifier.value ?? 'unknown'}%. Qualifying outputs: ${labels}.`;
  }
  if (modifier.dragonId === 'vermax' && modifier.abilityId === 'vermax-rallying-flame' && modifier.channel === 'tactical-damage') {
    return `${modifier.abilityName} may grant additional Spreading Blaze stacks to ${recipientName}. Each granted stack increases Tactical Damage Dealt by ${modifier.valuePerStack ?? 'unknown'}%, up to ${modifier.stackMaximum ?? 'unknown'} stacks. Qualifying outputs: ${labels}.`;
  }
  if (modifier.dragonId === 'vermax' && modifier.abilityId === 'vermax-spreading-blaze' && modifier.channel === 'tactical-damage') {
    return `${recipientName} is eligible to receive Spreading Blaze because it has verified Tactical Damage output. Each granted stack increases Tactical Damage Dealt by ${modifier.valuePerStack ?? 'unknown'}%, up to ${modifier.stackMaximum ?? 'unknown'} stacks.`;
  }
  if (modifier.dragonId === 'syrax' && modifier.abilityId === 'syrax-blazing-fury' && modifier.channel === 'fire-damage') {
    return `${recipientName} is eligible for Syrax's Blazing Fury Fire Damage support. Qualifying outputs: ${labels}. Activation is a 20% each-round chance, lasts two rounds, and prioritizes Fire Damage allies.`;
  }
  if (modifier.dragonId === 'syrax' && modifier.abilityId === 'syrax-tactical-inferno') {
    return `${recipientName} is eligible for Syrax's Tactical Inferno ${channelLabel(modifier.channel)} support. Qualifying outputs: ${labels}. Target selection follows the verified flank preference and remains selection-dependent.`;
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
  if (modifier.activationGroupId) {
    assumptions.push(`Effects with shared activation group ${modifier.activationGroupId} use one activation roll; uptime is not calculated.`);
  }
  if (modifier.targetSelector.selectionResource === 'current-troops') {
    assumptions.push('Current troop values and tie-breaking are not resolved; eligible recipients remain candidates.');
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

function conditionsForEffect(effect: AbilityEffect, schedule?: AbilitySchedule): EffectCondition[] {
  return [
    ...(schedule && isChanceBasedSchedule(schedule)
      ? [{
          id: `${schedule.id}-activation-chance`,
          label: activationChanceLabel(schedule),
          description: activationChanceLabel(schedule),
          evidenceIds: [],
          unresolved: false,
        }]
      : []),
    ...(effect.conditions ?? []).map((condition) => ({
      id: condition.id,
      label: condition.description,
      description: condition.description,
      evidenceIds: [],
      unresolved: condition.unresolved,
      kind: condition.kind,
      subject: condition.subject,
      comparison: condition.comparison,
      thresholdPercent: condition.thresholdPercent,
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
