import { FORMATION_POSITIONS, TROOP_TYPES, type AbilityDefinition, type AbilityEffect, type AbilitySchedule, type AbilityScheduleOverride, type ActivationRoll, type Dragon, type FormationPosition, type OwnedDragon, type RankedValue, type TroopType } from '../models/dragon';
import type { FormationAnalysisInput, RequirementTrace, SynergyTrace, TraceConfidence, TraceStatus } from '../models/synergy';
import type { OutputCapability } from '../models/synergy';
import { deriveOutputCapabilities, derivePeriodicDamageDefinitions, deriveStatusOutputCapabilities, periodicDamageOutputCapabilities } from './effectCapabilities';
import { formatTypedModifierValue } from './effectCapabilities';
import { rankedValueForHabitLevel, resolveEffectiveHabitLevelForAbility } from './habitLevels';
import { isNormalSynergyTrace } from './synergyTrace';

export type FormationCardInteractionState = 'active' | 'conditional' | 'preview' | 'unknown' | 'blocked' | 'inactive';

export interface FormationCardInteraction {
  id: string;
  relationshipId: string;
  sourceDragonId: string;
  recipientDragonId: string | null;
  sourceName: string;
  recipientName: string | null;
  abilityName: string;
  effectTitle: string;
  title: string;
  summary: string;
  summaryLines: string[];
  detail: string;
  details: string[];
  effects: string[];
  requirements: RequirementTrace[];
  confidence: TraceConfidence | 'mixed';
  modifierLines: string[];
  state: FormationCardInteractionState;
  status: TraceStatus;
  isCandidate: boolean;
  candidateIndex: number | null;
  candidateTotal: number | null;
  targetLabel: string | null;
  targetSummary: string | null;
  targetSelectionMode: NonNullable<SynergyTrace['targetSelectionGroup']>['selection'] | null;
  isPreview: boolean;
  isEnemyFacing: boolean;
  damageScope: string | null;
  traceId: string;
  traceIds: string[];
  isRecipientModifier: boolean;
  presentationFamily: string;
}

export interface FormationTraitStatus {
  dragonId: string;
  abilityName: string;
  state: FormationCardInteractionState;
  label: string;
  summary: string;
  detail: string;
}

export interface FormationCommandSummary {
  dragonId: string;
  abilityName: string;
  label: 'Command';
  summary: string;
  summaryLines: string[];
  detail: string;
}

export interface FormationCardAffinitySummary {
  favorable: TroopType[];
  unfavorable: TroopType[];
  unknown: TroopType[];
}

export interface FormationCardAnalysis {
  position: FormationPosition;
  dragonId: string | null;
  receives: FormationCardInteraction[];
  provides: FormationCardInteraction[];
  command: FormationCommandSummary | null;
  traitStatus: FormationTraitStatus | null;
  affinities: FormationCardAffinitySummary;
  overflow: {
    receives: number;
    provides: number;
  };
}

export interface FormationAffinityTeamSummary {
  covered: Array<{ troopType: TroopType; dragonNames: string[] }>;
  weakOrMissing: Array<{ troopType: TroopType; dragonNames: string[] }>;
  conflicts: Array<{ troopType: TroopType; dragonNames: string[] }>;
}

export interface FormationCardPresentation {
  cards: FormationCardAnalysis[];
  teamAffinity: FormationAffinityTeamSummary;
  teamInteractionCount: number;
  technicalTraceCount: number;
}

const compactLimit = 3;

export function buildFormationCardPresentation(
  formation: FormationAnalysisInput,
  allDragons: Dragon[],
  traces: SynergyTrace[],
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> } = {},
): FormationCardPresentation {
  const selectedIds = new Set(Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId)));
  const dragonById = new Map(allDragons.map((dragon) => [dragon.id, dragon]));
  const statusOutputCapabilities = deriveStatusOutputCapabilities(allDragons);
  const periodicOutputCapabilities = periodicDamageOutputCapabilities(
    allDragons,
    derivePeriodicDamageDefinitions(allDragons),
    statusOutputCapabilities,
  );
  const outputCapabilities = [...deriveOutputCapabilities(allDragons), ...periodicOutputCapabilities];
  const normalTraces = traces.filter(
      (trace) =>
        (isNormalSynergyTrace(trace) || isVisibleInternalProvidesTrace(trace)) &&
        !(trace.status === 'inactive' && trace.matchKind === 'defensive-ally-support') &&
      (trace.ruleId !== 'status-source-output' || !trace.recipientDragonId || isEnemyFacingTrace(trace) || isVisibleSharedActivationStatusSourceTrace(trace, traces)) &&
      !isUnresolvedCandidateSpecificConsequence(trace) &&
      !isGenericEnemyProviderWithBeneficiaryTrace(trace, traces),
  );
  const byDragon = new Map<string, { receives: FormationCardInteraction[]; provides: FormationCardInteraction[] }>();
  for (const dragonId of selectedIds) {
    byDragon.set(dragonId, { receives: [], provides: [] });
  }

  for (const trace of normalTraces) {
    const source = dragonById.get(trace.sourceDragonId);
    if (!source || !selectedIds.has(trace.sourceDragonId) || (trace.interactionScope === 'internal' && !isVisibleInternalProvidesTrace(trace))) {
      continue;
    }
    if (isRedundantBlockedTraitTrace(trace, source, options.previewEnabled === true)) {
      continue;
    }

    if (trace.targetSelectionGroup) {
      const eligible = trace.targetSelectionGroup.eligibleRecipientDragonIds.filter((dragonId) => selectedIds.has(dragonId));
      const targetCount = trace.targetSelectionGroup.targetCount;
      const allMatching = isAllMatchingTargetSelection(trace);
      const exactMultiTarget = targetCount > 1;
      if (eligible.length === 0) {
        continue;
      }
      if (!trace.targetSelectionGroup.selectionUncertain && !allMatching) {
        continue;
      }
      const targetLabel = exactMultiTarget
        ? joinEnglishList(eligible.map((dragonId) => dragonById.get(dragonId)?.name ?? dragonId))
        : joinTargetNames(eligible.map((dragonId) => dragonById.get(dragonId)?.name ?? dragonId), allMatching);
      const providerItem = toCardInteraction({
        trace,
        source,
        recipient: null,
        allDragons,
        outputCapabilities,
        previewEnabled: options.previewEnabled === true,
        targetLabel,
        isCandidate: false,
        candidateIndex: null,
        candidateTotal: exactMultiTarget || allMatching ? null : eligible.length,
      });
      byDragon.get(source.id)?.provides.push(providerItem);

      eligible.forEach((dragonId, index) => {
        const recipient = dragonById.get(dragonId);
        if (!recipient || (!allMatching && recipient.id === source.id && !(exactMultiTarget && isCasterEligibleTrace(trace)))) {
          return;
        }
        byDragon.get(recipient.id)?.receives.push(
          toCardInteraction({
            trace,
            source,
            recipient,
            allDragons,
            outputCapabilities,
            previewEnabled: options.previewEnabled === true,
            targetLabel: exactMultiTarget || allMatching ? null : `Candidate ${index + 1} of ${eligible.length}`,
            isCandidate: !exactMultiTarget && !allMatching,
            candidateIndex: index + 1,
            candidateTotal: exactMultiTarget || allMatching ? null : eligible.length,
          }),
        );
      });
      continue;
    }

    const recipient = trace.recipientDragonId ? dragonById.get(trace.recipientDragonId) ?? null : null;
    const isEnemyFacing = isEnemyFacingTrace(trace);
    const item = toCardInteraction({
      trace,
      source,
      recipient,
      allDragons,
      outputCapabilities,
      previewEnabled: options.previewEnabled === true,
      targetLabel: null,
      isCandidate: false,
      candidateIndex: null,
      candidateTotal: null,
    });
    if (trace.matchKind === 'incoming-effect-amplification' && trace.recipientModifierType) {
      const targetSelectionGroup = trace.targetSelectionGroup
        ? (trace.targetSelectionGroup as NonNullable<SynergyTrace['targetSelectionGroup']>)
        : null;
      const providerTargetLabel = targetSelectionGroup
        ? groupedRecipientLabel(
            targetSelectionGroup.eligibleRecipientDragonIds.map((dragonId) => dragonById.get(dragonId)?.name ?? dragonId),
            targetSelectionGroup.eligibleRecipientDragonIds,
            selectedIds,
          )
        : recipient?.name ?? null;
      const providerItem = toCardInteraction({
        trace,
        source,
        recipient: null,
        allDragons,
        outputCapabilities,
        previewEnabled: options.previewEnabled === true,
        targetLabel: providerTargetLabel,
        isCandidate: false,
        candidateIndex: null,
        candidateTotal: null,
      });
      byDragon.get(source.id)?.provides.push({
        ...providerItem,
        isRecipientModifier: true,
      });
      if (recipient && recipient.id !== source.id && selectedIds.has(recipient.id)) {
        byDragon.get(recipient.id)?.receives.push(item);
      }
      continue;
    }
    byDragon.get(source.id)?.provides.push(item);
    if (recipient && selectedIds.has(recipient.id) && !isEnemyFacing && (recipient.id !== source.id || isSelfInclusiveAllySupportTrace(trace))) {
      byDragon.get(recipient.id)?.receives.push(item);
    }
  }

  const cards = FORMATION_POSITIONS.map((position) => {
    const dragonId = formation[position];
    const dragon = dragonId ? dragonById.get(dragonId) ?? null : null;
    const mapped = dragon ? byDragon.get(dragon.id) : null;
    const receives = prepareInteractions(mapped?.receives ?? [], 'receives', selectedIds);
    const provides = prepareInteractions(mapped?.provides ?? [], 'provides', selectedIds);
    return {
      position,
      dragonId: dragon?.id ?? null,
      receives,
      provides,
      command: dragon ? deriveCommandSummary(dragon, options) : null,
      traitStatus: dragon ? deriveTraitStatus(dragon, position, traces) : null,
      affinities: dragon ? deriveCardAffinities(dragon) : emptyAffinities(),
      overflow: {
        receives: Math.max(0, receives.length - compactLimit),
        provides: Math.max(0, provides.length - compactLimit),
      },
    };
  });

  return {
    cards,
    teamAffinity: deriveTeamAffinitySummary(
      FORMATION_POSITIONS.map((position) => formation[position])
        .map((dragonId) => (dragonId ? dragonById.get(dragonId) : null))
        .filter((dragon): dragon is Dragon => Boolean(dragon)),
    ),
    teamInteractionCount: normalTraces.length,
    technicalTraceCount: traces.length,
  };
}

function isGenericEnemyProviderWithBeneficiaryTrace(trace: SynergyTrace, traces: SynergyTrace[]): boolean {
  return (
    trace.recipientDragonId === null &&
    (trace.matchKind === 'enemy-damage-received-increase' || trace.matchKind === 'enemy-mitigation-reduction') &&
    traces.some((candidate) =>
      candidate !== trace &&
      candidate.matchKind === trace.matchKind &&
      candidate.sourceDragonId === trace.sourceDragonId &&
      candidate.sourceAbilityId === trace.sourceAbilityId &&
      candidate.modifierCapabilityId === trace.modifierCapabilityId &&
      candidate.recipientDragonId !== null
    )
  );
}

function isVisibleInternalProvidesTrace(trace: SynergyTrace): boolean {
  if (isFormationRelevantEnemyProviderBenefit(trace)) {
    return true;
  }
  if (trace.matchKind === 'friendly-impairment' && trace.sourceDragonId === trace.recipientDragonId) {
    return trace.status !== 'inactive';
  }
  if (
    trace.matchKind === 'outgoing-effect-amplification' &&
    trace.sourceDragonId === trace.recipientDragonId &&
    trace.channel === 'recovery' &&
    [...trace.matchedFacts, ...trace.effects, trace.explanation].some((line) => /targets 3 ally|3 Allies includes all friendly/i.test(line))
  ) {
    return trace.status !== 'inactive';
  }
  if (trace.ruleId === 'internal-self-modifier') {
    if (trace.modifierSelfOnly === true) {
      return false;
    }
    const text = [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ');
    if (/Exclusive one-of choice/i.test(text)) {
      return false;
    }
    if (/Shared stack pool:/i.test(text) && !trace.requirements.some((requirement) => requirement.actual === 'preview enabled')) {
      return trace.status !== 'inactive';
    }
  }
  if (trace.ruleId === 'self-status-removal') {
    return false;
  }
  if (trace.matchKind === 'defensive-ally-support') {
    return trace.modifierSelfOnly === true &&
      trace.status !== 'inactive' &&
      [...trace.effects, ...trace.matchedFacts, trace.explanation].some((line) => /Grants 1 .+ stack/i.test(line));
  }
  if (trace.matchKind === 'stat-scaling-support' && trace.sourceDragonId === trace.recipientDragonId) {
    const text = [trace.targetSelectorSummary ?? '', trace.explanation, ...trace.matchedFacts].join(' ');
    return trace.status !== 'inactive' &&
      /caster eligible/i.test(text) &&
      !/;\s*self\s*;/.test(trace.targetSelectorSummary ?? '');
  }
  return false;
}

function isFormationRelevantEnemyProviderBenefit(trace: SynergyTrace): boolean {
  return trace.sourceDragonId === trace.recipientDragonId &&
    trace.recipientDragonId !== null &&
    (trace.matchKind === 'enemy-mitigation-reduction' || trace.matchKind === 'enemy-damage-received-increase');
}

export function getCompactInteractions(
  interactions: FormationCardInteraction[],
  expanded: boolean,
): FormationCardInteraction[] {
  return expanded ? interactions : interactions.slice(0, compactLimit);
}

export function interactionStatePriority(state: FormationCardInteractionState): number {
  switch (state) {
    case 'active':
      return 0;
    case 'conditional':
      return 1;
    case 'unknown':
      return 2;
    case 'preview':
      return 3;
    case 'blocked':
      return 4;
    case 'inactive':
      return 5;
  }
}

export function canonicalCardText(value: string, allDragons: Dragon[]): string {
  let next = value;
  for (const dragon of allDragons) {
    const abilities = [dragon.command, dragon.trait, ...dragon.habits].filter(
      (ability): ability is NonNullable<typeof ability> => Boolean(ability),
    );
    for (const ability of abilities) {
      next = next.replaceAll(`${dragon.id} - ${ability.name}`, `${dragon.name} — ${ability.name}`);
      next = next.replaceAll(`${dragon.id} - ${ability.name}`.replace('-', ' '), `${dragon.name} — ${ability.name}`);
    }
  }
  return next
    .replace(/\b([A-Z][A-Za-z ]+?)'s ([A-Za-z][A-Za-z ]+) can increase ([A-Z][A-Za-z]+)'s ([A-Za-z]+) by (\d+) flat/g, "$1's $2 can increase $3's $4 +$5")
    .replace(/\b([A-Za-z]+) by (\d+) flat/g, '$1 +$2')
    .replace(/\b(\d+) flat\b/g, '+$1')
    .replace(/ - /g, ' — ');
}

function toCardInteraction({
  trace,
  source,
  recipient,
  allDragons,
  outputCapabilities,
  previewEnabled,
  targetLabel,
  isCandidate,
  candidateIndex,
  candidateTotal,
}: {
  trace: SynergyTrace;
  source: Dragon;
  recipient: Dragon | null;
  allDragons: Dragon[];
  outputCapabilities: OutputCapability[];
  previewEnabled: boolean;
  targetLabel: string | null;
  isCandidate: boolean;
  candidateIndex: number | null;
  candidateTotal: number | null;
}): FormationCardInteraction {
  const abilityName = getAbilityName(source, trace.sourceAbilityId);
  const projectedState = projectedInteractionState(trace, previewEnabled);
  const state = isCandidate && trace.status === 'active' ? 'conditional' : projectedState;
  const baseDetail = canonicalCardText(trace.explanation, allDragons);
  const detail = projectRecipientOutputDetail(baseDetail, trace, recipient, outputCapabilities, allDragons);
  const baseSummaryLines = summarizeTrace(trace, source, recipient, detail, {
    isCandidate,
    candidateTotal,
    targetLabel,
    outputCapabilities,
    allDragons,
  }).map(sanitizeNormalCardText).filter((line): line is string => Boolean(line));
  const summaryLines = normalizeFormationCardSummaryLines(trace, source, recipient, detail, baseSummaryLines);
  const summary = compactSummaryText(summaryLines, candidateTotal);
  const detailText = omitNormalCardSummarySentences(sanitizeNormalCardText(detail), summaryLines);
  const effects = sanitizeNormalCardEffects(trace.effects, summaryLines);
  const presentationFamily = interactionPresentationFamily(trace);
  const aggregateFallback = projectRecipientOutputDetail(
    sanitizeNormalCardText([trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ')),
    trace,
    recipient,
    outputCapabilities,
    allDragons,
  );
  const fullExplanation = detailText || aggregateFallback || summaryLines.join(' ');
  const relationshipId = [
    trace.sourceDragonId,
    trace.sourceAbilityId ?? trace.ruleId,
    trace.matchKind === 'status-condition-enablement'
      ? `${trace.recipientAbilityId ?? ''}:${trace.channel ?? ''}:${trace.title}:${trace.id}`
      : null,
    trace.targetSelectionGroup
      ? `target-selection-${trace.id}`
      : recipient?.id ?? 'team',
  ].filter(Boolean).join('__');

  return {
    id: `${trace.id}__${recipient?.id ?? 'provider'}__${isCandidate ? 'candidate' : 'direct'}`,
    relationshipId,
    sourceDragonId: source.id,
    recipientDragonId: recipient?.id ?? null,
    sourceName: source.name,
    recipientName: recipient?.name ?? null,
    abilityName,
    effectTitle: interactionEffectTitle(abilityName, trace, summaryLines),
    title: trace.title,
    summary,
    summaryLines,
    detail: fullExplanation,
    details: [fullExplanation],
    effects,
    requirements: trace.requirements,
    confidence: trace.confidence,
    modifierLines: modifierLinesForTrace(trace, recipient, allDragons),
    state,
    status: trace.status,
    isCandidate,
    candidateIndex,
    candidateTotal,
    targetLabel,
    targetSummary: targetSummaryForCard(trace, allDragons),
    targetSelectionMode: trace.targetSelectionGroup?.selection ?? null,
    isPreview: state === 'preview',
    isEnemyFacing: isEnemyFacingTrace(trace),
    damageScope: trace.damageScope ?? null,
    traceId: trace.id,
    traceIds: [trace.id],
    isRecipientModifier: trace.matchKind === 'incoming-effect-amplification' && Boolean(trace.recipientModifierType),
    presentationFamily,
  };
}

function interactionPresentationFamily(trace: SynergyTrace): string {
  const sharedActivationGroup = sharedActivationGroupForTrace(trace);
  if (sharedActivationGroup && trace.recipientDragonId && !isEnemyFacingTrace(trace) && isSharedActivationPresentationTrace(trace)) {
    return `shared-activation:${sharedActivationGroup}`;
  }
  if (trace.matchKind === 'friendly-impairment') {
    return 'friendly-impairment';
  }
  if (trace.matchKind === 'incoming-effect-amplification') {
    return `incoming-${trace.recipientModifierType ?? trace.channel ?? 'modifier'}`;
  }
  if (trace.matchKind === 'enemy-damage-received-increase') {
    return 'enemy-damage-received-increase';
  }
  if (trace.matchKind === 'periodic-status-damage') {
    return `periodic-status-damage:${trace.channel ?? 'status'}`;
  }
  if (trace.matchKind === 'enemy-mitigation-reduction' || trace.matchKind === 'enemy-damage-dealt-reduction') {
    return trace.matchKind;
  }
  if (trace.matchKind === 'status-condition-enablement') {
    return `status-condition-enablement:${trace.channel ?? 'status'}`;
  }
  if (trace.matchKind === 'status-removal') {
    return 'status-removal';
  }
  if (trace.targetSelectionGroup && trace.channel) {
    return `target-selection:${trace.channel}`;
  }
  if (trace.channel === 'recovery') {
    return 'recovery-support';
  }
  if (trace.channel === 'damage-received') {
    return 'damage-received-support';
  }
  if (trace.channel === 'stat') {
    return 'stat-support';
  }
  if (trace.channel) {
    return `${trace.channel}-support`;
  }
  return trace.matchKind ?? trace.title;
}

function projectRecipientOutputDetail(
  detail: string,
  trace: SynergyTrace,
  recipient: Dragon | null,
  outputCapabilities: OutputCapability[],
  allDragons: Dragon[],
): string {
  if (!trace.targetSelectionGroup || !(trace.matchedOutputCapabilityIds?.length)) {
    return detail;
  }
  const outputs = matchedOutputsForPresentation(trace, recipient, outputCapabilities);
  if (!recipient) {
    const grouped = groupedOutputLabelsByDragon(outputs, allDragons);
    return detail.replace(
      /Qualifying outputs:\s*[^.]+\./i,
      grouped.length > 0 ? `Candidate outputs: ${grouped.join('; ')}.` : '',
    ).replace(/\s+/g, ' ').trim();
  }
  const labels = unique(outputs.map((output) => formatOutputCapabilityLabel(output)));
  return detail.replace(
    /Qualifying outputs:\s*[^.]+\./i,
    labels.length > 0 ? `Qualifying outputs for ${recipient.name}: ${joinEnglishList(labels)}.` : '',
  ).replace(/\s+/g, ' ').trim();
}

function normalizeFormationCardSummaryLines(
  trace: SynergyTrace,
  source: Dragon,
  recipient: Dragon | null,
  detail: string,
  summaryLines: string[],
): string[] {
  if (isStackSupportTrace(trace)) {
    return stackSupportSummaryLines(trace, source, recipient, detail);
  }
  const lines = [...summaryLines];
  if (trace.matchKind === 'status-condition-enablement' &&
    trace.effects.some((effect) => /Activation scope is unresolved between one shared roll and independent per-target rolls\./i.test(effect)) &&
    !lines.some((line) => /roll scope/i.test(line))) {
    lines.push('Whether this uses one shared roll or separate per-target rolls is unresolved.');
  }
  if (trace.matchKind === 'status-removal' && /same successful activation/i.test(detail)) {
    lines.push('Advantage and removal of Weakened share the same successful activation. The cleanse does not receive an independent roll.');
  }
  return lines;
}

function isStackSupportTrace(trace: SynergyTrace): boolean {
  return trace.effects.some((effect) => /Shared stack pool:/i.test(effect) || /Value per stack at effective Habit Level/i.test(effect) || /Grants 1 .+ stack/i.test(effect));
}

function stackSupportSummaryLines(trace: SynergyTrace, source: Dragon, recipient: Dragon | null, detail: string): string[] {
  const compact = compactStackSupportSummaryLines(trace, source, recipient, detail);
  if (compact.length > 0) {
    return compact;
  }
  const ability = getAbilityById(source, trace.sourceAbilityId);
  const abilityName = ability?.name ?? getAbilityName(source, trace.sourceAbilityId);
  const stackName = stackGrantName(trace, source, recipient) ?? abilityName;
  const lines: string[] = [];

  if (recipient && recipient.id !== source.id) {
    if (/same successful activation/i.test(detail) || trace.effects.some((effect) => /shared .*activation roll grants both stack effects/i.test(effect))) {
      lines.push(`On the same successful ${abilityName} activation, ${recipient.name} gains one ${stackName} stack.`);
    } else {
      const chanceText = stackChanceText(trace);
      lines.push(`${chanceText ?? 'Activation'} chance to grant ${recipient.name} one ${stackName} stack.`);
    }
  } else {
    const chanceText = stackChanceText(trace);
    const timing = abilityTimingPhrase(ability);
    if (chanceText && timing === 'at the start of combat') {
      lines.push(`${chanceText} chance at the start of combat to gain one ${stackName} stack.`);
    } else if (chanceText && (timing === 'each round' || timing === 'at the start of each round')) {
      lines.push(`Each round, ${chanceText} chance to gain one ${stackName} stack.`);
    } else if (chanceText && timing === 'after each Basic Attack') {
      lines.push(`After each Basic Attack, ${chanceText} chance to gain one ${stackName} stack.`);
    } else if (chanceText) {
      lines.push(`${chanceText} chance to gain one ${stackName} stack.`);
    } else {
      lines.push(`Gain one ${stackName} stack.`);
    }
  }

  const valueLine = stackValueSentence(trace);
  if (valueLine) {
    lines.push(valueLine);
  }

  const repeatLine = stackRepeatSentence(trace);
  if (repeatLine) {
    lines.push(repeatLine);
  }

  return lines;
}

function compactStackSupportSummaryLines(trace: SynergyTrace, source: Dragon, recipient: Dragon | null, detail: string): string[] {
  const text = [trace.title, trace.explanation, detail, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions, ...trace.unresolvedQuestions].join(' ');
  const stack = (text.match(/Grants 1 ([A-Za-z' -]+?) stack\./i)?.[1]?.trim() ?? getAbilityName(source, trace.sourceAbilityId)).replace(/^additional\s+/i, '');
  const amount = text.match(/Physical Damage Received decrease ([\d.]+%)/i)?.[1] ?? text.match(/Damage Received decrease ([\d.]+%)/i)?.[1] ?? null;
  if (!amount || !/Grants 1 .+ stack/i.test(text)) {
    return [];
  }
  const damageScope = /non-Basic/i.test(text) ? 'non-Basic Physical Damage Received' : 'Physical Damage Received';
  const duration = /Duration:\s*until end of combat/i.test(text) ? 'until end of combat' : null;
  const unresolved = 'Maximum stack count and final mitigation formula remain unresolved.';
  const isRetreat = /retreated during the previous round|retreated in the previous round/i.test(text);
  const isStart = /Timing:\s*Start of combat/i.test(text);
  const isSelectedAdjacent = trace.targetSelectionGroup?.selection === 'one-eligible-adjacent' || /one selected ally|selected adjacent ally|eligible recipients/i.test(text);
  const eligiblePhrase = text.match(/Eligible recipients:\s*([^.]+)\./i)?.[1]?.trim() ?? null;

  if (isRetreat) {
    return [
      `If the ally selected at Start of Combat retreated during the previous round, ${source.name} gains 1 additional ${stack} stack.`,
      `The resulting stack lasts ${duration ?? 'until end of combat'}; tracked ally identity, retreat occurrence, maximum stack count, and final mitigation formula remain unresolved.`,
    ];
  }
  if (isSelectedAdjacent && !recipient) {
    const candidates = eligiblePhrase ?? 'one eligible adjacent ally';
    return [
      `At Start of Combat, one of ${candidates} is selected and gains 1 ${stack} stack.`,
      `The selected ally identity, maximum stack count, and final mitigation formula remain unresolved.`,
    ];
  }
  if (isSelectedAdjacent && recipient && recipient.id !== source.id) {
    const candidates = eligiblePhrase ?? 'the eligible adjacent allies';
    return [
      `At Start of Combat, one of ${candidates} is selected to gain 1 ${stack} stack.`,
      `${stack} reduces ${damageScope} by ${amount} ${duration ?? 'until end of combat'}; selected identity is unresolved and no activation roll occurs.`,
    ];
  }
  if (recipient?.id === source.id || /Resolved self recipient/i.test(text) || trace.modifierSelfOnly) {
    return [
      `At Start of Combat, ${source.name} gains 1 ${stack} stack, reducing ${damageScope} by ${amount} ${duration ?? 'until end of combat'}.`,
      unresolved,
    ];
  }
  if (isStart) {
    return [
      `At Start of Combat, ${recipient?.name ?? source.name} gains 1 ${stack} stack, reducing ${damageScope} by ${amount} ${duration ?? 'until end of combat'}.`,
      unresolved,
    ];
  }
  return [];
}

function stackValueSentence(trace: SynergyTrace): string | null {
  const valueLine = trace.effects.find((effect) => /Value per stack at effective Habit Level 1:/i.test(effect)) ??
    trace.effects.find((effect) => /Value per stack at effective Habit Level/i.test(effect));
  const maximumLine = trace.effects.find((effect) => /Maximum stacks:/i.test(effect));
  if (!valueLine || !maximumLine) {
    return null;
  }
  const valueMatch = valueLine.match(/Value per stack at effective Habit Level \d+:\s*([0-9.]+)%\s+(.+?)\./i);
  const maximumMatch = maximumLine.match(/Maximum stacks:\s*(\d+)\./i);
  if (!valueMatch || !maximumMatch) {
    return null;
  }
  const durationLine = trace.effects.find((effect) => /Duration:/i.test(effect));
  let duration = durationLine ? durationLine.replace(/^Duration:\s*/i, '').replace(/\.$/, '') : null;
  if (/^until end of combat$/i.test(duration ?? '')) {
    duration = 'until the end of combat';
  }
  if (!duration && isStackSupportTrace(trace)) {
    duration = 'until the end of combat';
  }
  const theoretical = Number(valueMatch[1]) * Number(maximumMatch[1]);
  const theoreticalText = Number.isFinite(theoretical) ? `, theoretical +${theoretical}%` : '';
  const durationSuffix = duration ? `, ${duration}` : '';
  return `Each stack increases ${valueMatch[2]} by ${valueMatch[1]}%, up to ${maximumMatch[1]} stacks${durationSuffix}. Current stack count is unknown. ${valueMatch[2]} +${valueMatch[1]}% per stack, up to ${maximumMatch[1]} stacks${theoreticalText}${durationSuffix}.`;
}

function stackRepeatSentence(trace: SynergyTrace): string | null {
  if (trace.effects.some((effect) => /Repeat mode: once-if-any-match/i.test(effect))) {
    return 'If at least one enemy deals Fire Damage, the stack attempt repeats once. The repeated attempt remains chance-based.';
  }
  if (trace.effects.some((effect) => /Repeat mode: once-per-match/i.test(effect))) {
    const chanceText = stackChanceText(trace);
    return `The activation repeats once for each enemy that deals Fire Damage. The number of matching enemies is unresolved, and every repeated attempt remains ${chanceText ? `a ${chanceText} chance` : 'chance-based'}.`;
  }
  return null;
}

function stackChanceText(trace: SynergyTrace): string | null {
  const byHabitLevel = trace.effects.find((effect) => /Activation chance by Habit Level:/i.test(effect));
  if (byHabitLevel) {
    const match = byHabitLevel.match(/Activation chance by Habit Level:\s*([0-9.]+)%/i);
    if (match?.[1]) {
      return `${match[1]}%`;
    }
  }
  const activationChance = trace.effects.find((effect) => /Activation chance:/i.test(effect));
  if (activationChance) {
    const match = activationChance.match(/Activation chance:\s*([0-9.]+%)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  const statusChance = trace.effects.find((effect) => /Status application chance:/i.test(effect));
  if (statusChance) {
    const match = statusChance.match(/Status application chance:\s*([0-9.]+%)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function stackGrantName(trace: SynergyTrace, source: Dragon, recipient: Dragon | null): string | null {
  const text = [trace.explanation, ...trace.effects].join(' ');
  const mayGrant = text.match(/may grant additional ([A-Za-z' ]+?) stacks?/i);
  if (mayGrant?.[1]) {
    return displayStackName(mayGrant[1].replace(/^additional\s+/i, ''));
  }
  const eligible = text.match(/eligible to receive ([A-Za-z' ]+?) because/i);
  if (eligible?.[1]) {
    return displayStackName(eligible[1]);
  }
  if (recipient && recipient.id === source.id) {
    return getAbilityName(source, trace.sourceAbilityId);
  }
  return getAbilityName(source, trace.sourceAbilityId);
}

function displayStackName(name: string): string {
  return name.trim().replace(/\s+support$/i, '');
}

function getAbilityById(source: Dragon, abilityId: string | null): AbilityDefinition | null {
  if (!abilityId) {
    return null;
  }
  return [source.command, source.trait, ...source.habits].find((ability): ability is AbilityDefinition => ability?.id === abilityId) ?? null;
}

function abilityOwnerForId(dragons: Dragon[], abilityId: string): { dragon: Dragon; ability: AbilityDefinition } | null {
  for (const dragon of dragons) {
    const ability = getAbilityById(dragon, abilityId);
    if (ability) {
      return { dragon, ability };
    }
  }
  return null;
}

function abilityTimingPhrase(ability: AbilityDefinition | null): string | null {
  const schedule = ability?.schedules[0];
  if (!schedule) {
    return null;
  }
  if (schedule.roundSelector?.kind === 'start-of-combat' || schedule.timing === 'start-of-combat') {
    return 'at the start of combat';
  }
  if (schedule.roundSelector?.kind === 'each-round' || schedule.timing === 'each-round') {
    return 'each round';
  }
  if (schedule.timing === 'start-of-each-round') {
    return 'at the start of each round';
  }
  if (schedule.roundSelector?.kind === 'after-basic-attack') {
    return 'after each Basic Attack';
  }
  return null;
}

function modifierLinesForTrace(trace: SynergyTrace, recipient: Dragon | null, allDragons: Dragon[]): string[] {
  if (trace.matchKind !== 'incoming-effect-amplification' || !trace.recipientModifierType || !recipient) {
    return [];
  }
  const modifierSource = trace.recipientModifierAbilityId
    ? abilityOwnerForId(allDragons, trace.recipientModifierAbilityId)
    : null;
  const abilityName = modifierSource?.ability.name ??
    (trace.recipientModifierAbilityId ? getAbilityName(recipient, trace.recipientModifierAbilityId) : 'Recipient modifier');
  const ownerName = modifierSource?.dragon.name ?? recipient.name;
  const positionBlocked = trace.status === 'inactive' &&
    trace.requirements.some((requirement) => requirement.satisfied === false && /position/i.test(requirement.label));
  if (positionBlocked) {
    return [`${abilityName} amplification unavailable: ${ownerName} must be Vanguard.`];
  }
  const value = trace.recipientModifierValue === null || trace.recipientModifierValue === undefined
    ? 'unknown'
    : `+${trace.recipientModifierValue}%`;
  return [`Amplified by ${ownerName}'s ${abilityName}: ${trace.recipientModifierType.replace(/ Up$/i, '')} ${value}.`];
}

function sanitizeNormalCardEffects(effects: string[], summaryLines: string[]): string[] {
  const summaryText = normalizeText(summaryLines.join(' '));
  return uniqueBy(
    effects
      .map(sanitizeNormalCardText)
      .filter((effect): effect is string => Boolean(effect))
      .filter((effect) => !/Shared activation group:/i.test(effect))
      .filter((effect) => !/Shared stack pool:/i.test(effect))
      .filter((effect) => !isRedundantCurrentValueLine(effect, summaryText) || isValueBearingEffectLine(effect))
      .filter((effect) => !isValueAlreadyExplained(effect, summaryText) || isValueBearingEffectLine(effect))
      .filter((effect) => {
        if (/^(Timing|Duration):/i.test(effect)) {
          return true;
        }
        return !summaryText.includes(normalizeText(effect)) || isValueBearingEffectLine(effect);
      }),
    semanticEffectDetailKey,
  );
}

export function formatPresentationText(value: string): string {
  return value
    .replace(/Target reference [^:]+:\s*/gi, '')
    .replace(/\bRounds 1\b/g, 'Round 1')
    .replace(/References source effect [^.]+\./gi, '')
    .replace(/Source effect ID:\s*[A-Za-z0-9-]+\./gi, '')
    .replace(/Shared selected-target group:\s*[A-Za-z0-9-]+\./gi, 'These effects share the same selected target.')
    .replace(/Selected-target group:\s*[A-Za-z0-9-]+\./gi, 'These effects share the same selected target.')
    .replace(/Shared activation group:\s*[A-Za-z0-9-]+\./gi, '')
    .replace(/Shared stack pool:\s*[A-Za-z0-9-]+\./gi, '')
    .replace(/Target selector:\s*[^.]+\./gi, '')
    .replace(/First Burn attempt uses the first Fire Damage target\./gi, 'The first Burn attempt applies to the same first added target that receives the first added Fire Damage.')
    .replace(/Second Burn attempt uses the second Fire Damage target\./gi, 'The second Burn attempt applies to the same second added target that receives the second added Fire Damage.')
    .replace(/Initiative reduction uses the enemies selected for Instinct reduction\./gi, 'The same selected pair of adjacent enemies receives both the Instinct and Initiative reductions.')
    .replace(/later-round retreat checks/i, 'later retreat checks')
    .replace(/\bEach Round\b/g, 'Each round')
    .replace(/\b1 Enemies\b/g, '1 Enemy')
    .replace(/\b1 Allies\b/g, '1 Ally')
    .replace(/([.!?]){2,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeNormalCardText(value: string): string {
  return formatPresentationText(value)
    .replace(/\s*Ranked progression:\s.*?L5\s[-+]?\d+(?:\.\d+)?%?\./g, '')
    .replace(/\s*(Damage Dealt|Damage Received|Physical Damage Received|Tactical Damage Received|Fire Damage Received|Recovery Rate) reduction at current effective level:\s[-+]?\d+(?:\.\d+)?%?\./gi, '')
    .replace(/Activation scope is unresolved between one shared roll and independent per-target rolls\./gi, 'Whether this uses one shared roll or separate per-target rolls is unresolved.')
    .replace(/\b[A-Z][A-Za-z' -]+ provides Recovery through [A-Z][A-Za-z' -]+\. ([A-Z][A-Za-z' -]+) has \1's ([A-Z][A-Za-z' -]+) Recovery Received modifier, increasing received Recovery by (\d+(?:\.\d+)?)%\./g, 'If $1 is selected, $2 increases Recovery Received by $3%.')
    .trim();
}

function semanticEffectDetailKey(value: string): string {
  const normalized = normalizeText(value).replace(/\.$/, '');
  const damageReceived = normalized.match(/\b(physical|tactical|fire)?\s*damage received\s+(?:increase|decrease|reduction:|\+|-)\s*([-+]?\d+(?:\.\d+)?%?)/i);
  if (damageReceived) {
    const channel = damageReceived[1] ?? 'all';
    const scope = /non-basic/i.test(normalized)
      ? 'non-basic'
      : /all qualifying/i.test(normalized)
        ? 'all-qualifying'
        : 'unspecified';
    const direction = /decrease|reduction:|-/.test(normalized) ? 'decrease' : 'increase';
    return `damage-received|${direction}|${channel}|${damageReceived[2]}|${scope}`;
  }
  const activationChance = normalized.match(/\b(?:status application chance|activation chance)\s*:?\s*([-+]?\d+(?:\.\d+)?%?)/i);
  if (activationChance) {
    return `activation-chance|${activationChance[1]}`;
  }
  const statValue = normalized.match(/\b(Strength|Intelligence|Instinct|Initiative)\s+[+-]([-+]?\d+(?:\.\d+)?%?)/i);
  if (statValue?.[1] && statValue[2]) {
    return `stat|${statValue[1].toLowerCase()}|${statValue[2]}`;
  }
  return normalized;
}

function isRedundantCurrentValueLine(value: string, normalizedSummaryText: string): boolean {
  const match = value.match(/current effective level:\s([-+]?\d+(?:\.\d+)?%?)/i);
  return Boolean(match?.[1] && normalizedSummaryText.includes(match[1].toLowerCase()));
}

function isValueAlreadyExplained(value: string, normalizedSummaryText: string): boolean {
  const damageReceived = value.match(/\b(Physical|Tactical|Fire) Damage Received \+([-+]?\d+(?:\.\d+)?%?)/i);
  if (damageReceived) {
    const channel = damageReceived[1]!.toLowerCase();
    const amount = damageReceived[2]!.toLowerCase();
    return normalizedSummaryText.includes(`+${amount} ${channel} damage received`) ||
      normalizedSummaryText.includes(`${channel} damage received +${amount}`);
  }
  const recoveryReceived = value.match(/\bRecovery Received \+([-+]?\d+(?:\.\d+)?%?)/i);
  if (recoveryReceived) {
    const amount = recoveryReceived[1]!.toLowerCase();
    return normalizedSummaryText.includes(`recovery received by ${amount}`) ||
      normalizedSummaryText.includes(`recovery received +${amount}`);
  }
  return false;
}

function isValueBearingEffectLine(value: string): boolean {
  return /(?:\b(?:physical|tactical|fire)?\s*damage received\b|\bdamage dealt\b|\brecovery received\b|\brecovery rate\b|\bstrength\b|\bintelligence\b|\binstinct\b|\binitiative\b)/i.test(value) &&
    /[-+]?\d/.test(value);
}

function omitNormalCardSummarySentences(value: string, summaryLines: string[]): string {
  if (!value) {
    return '';
  }
  const summarySentences = new Set(summaryLines.flatMap(splitSentences).map(normalizeText));
  return splitSentences(value)
    .filter((sentence) => {
      if (/^(Timing|Duration):/i.test(sentence)) {
        return true;
      }
      return !summarySentences.has(normalizeText(sentence));
    })
    .join(' ');
}

function splitSentences(value: string): string[] {
  return value.split(/(?<=\.)\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\.(?:\s*\.)+$/g, '.').trim().toLowerCase();
}

function isAllMatchingTargetSelection(trace: SynergyTrace): boolean {
  return trace.targetSelectionGroup?.selection === 'all-matching-condition';
}

function isSelfInclusiveAllySupportTrace(trace: SynergyTrace): boolean {
  return trace.sourceDragonId === trace.recipientDragonId &&
    trace.matchKind === 'stat-scaling-support' &&
    isCasterEligibleTrace(trace);
}

function isCasterEligibleTrace(trace: SynergyTrace): boolean {
  return [
    trace.targetSelectorSummary ?? '',
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
  ].some((line) => /caster is eligible/i.test(line) && !/caster is not eligible|caster excluded/i.test(line));
}

function joinTargetNames(names: string[], allMatching: boolean): string {
  return allMatching ? joinEnglishList(names) : names.join(' or ');
}

function supportChannelLabel(trace: SynergyTrace): string {
  if (trace.channel === 'damage-received' && trace.damageScope && trace.damageScope !== 'all') {
    return formatToken(`${trace.damageScope}-damage-received`);
  }
  return formatToken(trace.channel ?? 'damage-received');
}

function allMatchingSupportBranchSummary(trace: SynergyTrace): string[] {
  const text = [trace.title, trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
  const supportEffect = trace.effects.find((effect) =>
    /(?:Fire |Physical |Tactical )?Damage Received decrease/i.test(effect) ||
    /Damage Dealt increase/i.test(effect) ||
    /Damage Received reduction:/i.test(effect) ||
    /reduce(?:s|d)? .*?Damage Received by/i.test(effect),
  ) ?? null;
  const thresholdMatch = text.match(/\b(above|below) (\d+(?:\.\d+)?)% Troop Capacity\b/i);
  const duration = trace.effects.find((effect) => /Duration:/i.test(effect)) ?? null;
  const amount = supportEffect?.match(/(?:decrease|increase|reduction:)\s+([-+]?\d+(?:\.\d+)?%?)(?:\s+at effective Habit Level \d+)?/i)?.[1]
    ?? supportEffect?.match(/reduce(?:s|d)? .*?by ([-+]?\d+(?:\.\d+)?%?)(?:\s+at effective Habit Level \d+)?/i)?.[1]
    ?? text.match(/(?:Damage Received|Damage Dealt|Fire Damage Received|Physical Damage Received|Tactical Damage Received)\s+(?:decrease|increase|reduction:)\s+([-+]?\d+(?:\.\d+)?%?)(?:\s+at effective Habit Level \d+)?/i)?.[1]
    ?? text.match(/reduce(?:s|d)? .*?by ([-+]?\d+(?:\.\d+)?%?)(?:\s+at effective Habit Level \d+)?/i)?.[1]
    ?? text.match(/([-+]?\d+(?:\.\d+)?%)/)?.[1]
    ?? 'an unresolved amount';
  if (!thresholdMatch) {
    const channel = supportChannelLabel(trace);
    return [`${channel} support when the condition is met.`];
  }
  const thresholdText = `${thresholdMatch[2]}% Troop Capacity`;
  const durationText = duration ? ` ${duration.replace(/^Duration:\s*/i, '').replace(/\.$/, '.')}` : '';
  if (/Resistance/i.test(text)) {
    return [`Below ${thresholdText}: receive Resistance, reducing ${supportChannelLabel(trace)} by ${amount}${durationText}`];
  }
  const signedAmount = amount.startsWith('-') ? amount : `-${amount.replace(/^\+/, '')}`;
  return [`Below ${thresholdText}: ${supportChannelLabel(trace)} ${signedAmount}${durationText}`];
}

function targetSummaryForCard(trace: SynergyTrace, allDragons: Dragon[]): string | null {
  if (!isAllMatchingTargetSelection(trace) || !trace.targetSelectionGroup) {
    if (/enemy;\s*any-lane;\s*all-matching-condition/i.test(trace.targetSelectorSummary ?? '')) {
      return enemyAllMatchingTargetSummary(trace.targetSelectorSummary ?? '', [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' '));
    }
    return trace.targetSelectorSummary ?? null;
  }
  const dragonById = new Map(allDragons.map((dragon) => [dragon.id, dragon.name]));
  const names = trace.targetSelectionGroup.eligibleRecipientDragonIds.map((dragonId) => dragonById.get(dragonId) ?? dragonId);
  const count = trace.targetSelectionGroup.targetCount;
  return [
    `All matching allies: ${joinEnglishList(names)}.`,
    `Known recipient count: ${count}.`,
    'Each eligible recipient evaluates its own condition.',
  ].join(' ');
}

function summarizeTrace(
  trace: SynergyTrace,
  source: Dragon,
  recipient: Dragon | null,
  detail: string,
  target: {
    isCandidate: boolean;
    candidateTotal: number | null;
    targetLabel: string | null;
    outputCapabilities: OutputCapability[];
    allDragons: Dragon[];
  },
): string[] {
  if (target.isCandidate && trace.channel) {
    return [
      `${formatToken(trace.channel)} support; one of ${numberWord(target.candidateTotal ?? 0)} eligible recipients.`,
      ...targetSelectionEffectLines(trace, recipient, target.outputCapabilities, target.allDragons),
    ];
  }
  if (isAllMatchingTargetSelection(trace) && trace.channel) {
    const branchSummary = allMatchingSupportBranchSummary(trace);
    if (recipient) {
      return branchSummary.map((line) => `${recipient.name}: ${line}`);
    }
    return branchSummary;
  }
  const perTargetStatusSummary = independentPerTargetStatusSummary(trace);
  if (perTargetStatusSummary.length > 0) {
    return perTargetStatusSummary;
  }
  if (trace.targetSelectionGroup && trace.channel) {
    const eligibleNames = target.targetLabel ?? 'the eligible candidates';
    if (trace.targetSelectionGroup.targetCount > 1) {
      return [
        `Eligible recipients: ${eligibleNames}.`,
        ...targetSelectionEffectLines(trace, recipient, target.outputCapabilities, target.allDragons),
      ];
    }
    if (trace.targetSelectionGroup.eligibleRecipientDragonIds.length > 1) {
      return [
        `Eligible selected-target candidates: ${eligibleNames}.`,
        'One candidate is selected when the activation succeeds; the selected target is unresolved.',
        ...targetSelectionEffectLines(trace, recipient, target.outputCapabilities, target.allDragons),
      ];
    }
    if (trace.targetSelectionGroup.selectionUncertain && trace.targetSelectionGroup.eligibleRecipientDragonIds.length === 1) {
      return [
        `Resolved selected target in this formation: ${eligibleNames}.`,
        ...targetSelectionEffectLines(trace, recipient, target.outputCapabilities, target.allDragons),
      ];
    }
    const targetNames = target.targetLabel ? `: ${target.targetLabel}` : '';
    return [
      `Resolved selected target in this formation${targetNames}.`,
      ...targetSelectionEffectLines(trace, recipient, target.outputCapabilities, target.allDragons),
    ];
  }
  if (trace.matchKind === 'status-condition-enablement') {
    const compactDependency = compactStatusDependencySummary(trace, source);
    if (compactDependency.length > 0) {
      return compactDependency;
    }
  }
  if (/First-Strike enables Infernal Burst/i.test(trace.title) || /First-Strike.*Infernal Burst/i.test(detail)) {
    return ['May receive First-Strike; Infernal Burst deals 1.5× while active.'];
  }
  if (/Slow enables Strategic Revival/i.test(trace.title) || /Slow.*Strategic Revival/i.test(detail)) {
    return ['Slow can increase Strategic Revival Recovery to 1.5×.'];
  }
  if (trace.matchKind === 'status-condition-enablement') {
    return [detail.replace(`${source.name}'s `, '').replace(recipient ? `${recipient.name}'s ` : '', '').replaceAll('1.5x', '1.5×')];
  }
  if (trace.matchKind === 'extra-basic-attack-trigger') {
    return [detail.replace(`${source.name}'s `, '').replace(recipient ? `${recipient.name}'s ` : '', '')];
  }
  if (trace.matchKind === 'status-removal') {
    if (/Advantage|Weakened|same successful activation/i.test(detail)) {
      return [detail.replace(`${source.name}'s `, '').replace(recipient ? `${recipient.name}'s ` : '', '').replaceAll('1.5x', '1.5Ã—')];
    }
    return ['Potential Control cleanse; timing, selection, and activation are uncertain.'];
  }
  if (trace.matchKind === 'enemy-damage-received-increase' && recipient) {
    return [enemyVulnerabilityBenefitSummary(trace, recipient)];
  }
  if (trace.matchKind === 'friendly-impairment') {
    const text = [detail, ...trace.matchedFacts, ...trace.effects].join(' ');
    const channelLabel = trace.channel === 'damage-dealt'
      ? 'Damage Dealt'
      : trace.channel === 'damage-received'
        ? 'Damage Received'
        : formatToken(trace.channel ?? 'damage-dealt');
    const amount = text.match(/Damage Dealt decrease ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? text.match(/Damage Dealt reduction: ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? text.match(/reduce(?:s|d)? .*?Damage Dealt by ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? text.match(/([-+]?\d+(?:\.\d+)?%?)/)?.[1]
      ?? null;
    if (amount && recipient) {
      return [`${getAbilityName(source, trace.sourceAbilityId)} reduces ${channelLabel} for ${recipient.name} by ${amount}.`];
    }
    return [formatPresentationText(trace.explanation)];
  }
  if (trace.modifierRole === 'enemy-debuff' || trace.matchKind === 'enemy-mitigation-reduction' || trace.matchKind === 'enemy-damage-dealt-reduction') {
    return [enemyFacingSummary(trace, source)];
  }
  if (trace.channel === 'stat') {
    return [[
      formatStatDetail(detail) ?? detail,
      trace.effects.find((effect) => /Timing:/i.test(effect)),
      trace.effects.find((effect) => /Enhanced by/i.test(effect)),
      trace.effects.find((effect) => /Duration:/i.test(effect)),
    ].filter(Boolean).join(' ')];
  }
  if (trace.channel === 'recovery') {
    const recoveryRate = trace.effects.find((effect) => /Recovery Rate:/i.test(effect));
    const recoveryReceived = trace.effects.find((effect) => /Recovery Received \+/i.test(effect));
    const timing = trace.effects.find((effect) => /Timing:/i.test(effect));
    const enhancement = trace.effects.find((effect) => /Enhanced by/i.test(effect));
    const targeting = trace.effects.find((effect) => /^Targets /i.test(effect));
    const duration = trace.effects.find((effect) => /Duration:/i.test(effect));
    return [
      [
        recoveryReceived ? `Recovery Received support${recipient ? ` for ${recipient.name}` : ''}.` : `Recovery support${recipient ? ` for ${recipient.name}` : ''}.`,
        timing,
        recoveryReceived ?? recoveryRate,
        enhancement,
        duration,
      targeting,
    ].filter(Boolean).join(' '),
    ];
  }
  if (trace.channel === 'damage-received') {
    const text = [detail, ...trace.matchedFacts, ...trace.effects].join(' ');
    const amount = text.match(/Damage Received decrease ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? text.match(/Damage Received reduction: ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? text.match(/reduce(?:s|d)? .*?Damage Received by ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? text.match(/([-+]?\d+(?:\.\d+)?%?)/)?.[1]
      ?? null;
    if (amount && recipient) {
      return [`${getAbilityName(source, trace.sourceAbilityId)} reduces Damage Received for ${recipient.name} by ${amount}.`];
    }
  }
  if (trace.channel) {
    const exclusiveChoice = trace.effects.find((effect) => /Exclusive one-of choice/i.test(effect));
    if (exclusiveChoice) {
      return [exclusiveChoice.replace(/^Exclusive one-of choice:\s*/i, '')];
    }
    const outputSummary = qualifyingOutputSummaryLines(trace, recipient, target.outputCapabilities, target.allDragons);
    if (outputSummary.length > 0) {
      return outputSummary;
    }
    const recipientCommand = recipient?.command;
    if (recipientCommand && trace.recipientAbilityId?.includes(recipientCommand.id)) {
      return [`Increases ${recipientCommand.name} ${formatToken(trace.channel)}.`];
    }
    const channel = formatToken(trace.damageScope ? `${trace.damageScope}-damage-received` : trace.channel);
    return [`${channel} support${recipient ? ` for ${recipient.name}` : ''}.`];
  }
  return [detail.replaceAll('1.5x', '1.5×')];
}

function compactStatusDependencySummary(trace: SynergyTrace, source: Dragon): string[] {
  const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions].join(' ');
  const titleMatch = trace.title.match(/^(.+?) enables (.+)$/i);
  const suppliedStatus = titleMatch?.[1]?.trim() ?? text.match(/Required status condition:\s*([^.]+)\./i)?.[1]?.trim();
  const dependentAbility = titleMatch?.[2]?.trim() ?? trace.recipientAbilityId?.split('-').slice(1).join(' ');
  if (!suppliedStatus || !dependentAbility) {
    return [];
  }
  if (/First-Strike/i.test(suppliedStatus) && /Infernal Burst/i.test(dependentAbility)) {
    return [];
  }
  const supplier = compactStatusSupplierLine(text, suppliedStatus, source.name);
  const dependent = compactStatusDependentLine(text, suppliedStatus, dependentAbility);
  if (!supplier || !dependent) {
    return [];
  }
  const timing = compactDependencyTiming(text, suppliedStatus, dependentAbility);
  const uncertainty = compactDependencyUncertainty(text);
  return [supplier, dependent, timing, uncertainty].filter((line): line is string => Boolean(line));
}

function compactStatusSupplierLine(text: string, suppliedStatus: string, sourceName: string): string | null {
  const statusPattern = escapeRegExp(suppliedStatus);
  const summaryMatch = text.match(new RegExp(`(?:At effective [^,]+,\\s*)?(.+?) has a ([\\d.]+%) chance ([^.]+?) to apply ${statusPattern} to (.+?)\\. ${statusPattern} lasts (\\d+ rounds|until end of current round)\\.`, 'i'));
  if (summaryMatch) {
    const cadence = summaryMatch[3]!.trim();
    const target = summaryMatch[4]!.trim();
    const duration = summaryMatch[5]!.replace(/^until/, 'until').trim();
    return `${summaryMatch[2]} chance ${cadence} to apply ${suppliedStatus} to ${target} for ${duration}.`;
  }
  const pairedTargetsMatch = text.match(/([\d.]+%)(?: chance)? on the first added target and ([\d.]+%)(?: chance)? on (?:a different|the) second added target/i);
  const roundsMatch = text.match(/Rounds?\s+([\d,\sand]+?)(?=[:.])/i) ?? text.match(/Rounds?\s+([\d,\sand]+)\./i);
  const durationMatch = text.match(/Burn lasts (\d+ rounds|until end of current round)\./i);
  const sourceMatch = text.match(/\b([A-Z][A-Za-z' -]*Conductor)\b/);
  if (pairedTargetsMatch && roundsMatch && durationMatch) {
    const source = sourceMatch?.[1] ?? 'The source ability';
    return `${source} attempts ${suppliedStatus} on Rounds ${roundsMatch[1]!.trim()}: ${pairedTargetsMatch[1]} on the first added target and ${pairedTargetsMatch[2]} on a different second target; ${suppliedStatus} lasts ${durationMatch[1]}.`;
  }
  const chance = text.match(/Status application chance:\s*([\d.]+%)/i)?.[1] ?? null;
  const schedule = text.match(/Supplier schedule:\s*([^.]+)\./i)?.[1]?.trim() ?? null;
  const duration = text.match(new RegExp(`${statusPattern} duration:\\s*(\\d+ rounds|until end of current round)\\.`, 'i'))?.[1] ?? null;
  const target = text.match(/Target:\s*([^.]+)\./i)?.[1]?.trim() ?? 'one enemy';
  if (!chance || !duration) {
    return null;
  }
  const cadence = schedule?.includes('each round')
    ? 'each round'
    : schedule?.includes('odd-numbered')
      ? 'on odd-numbered rounds'
      : schedule ? `on ${schedule}` : 'on its schedule';
  return `${chance} chance ${cadence} to apply ${suppliedStatus} to ${target} for ${duration}.`.replace(sourceName, '').trim();
}

function compactStatusDependentLine(text: string, suppliedStatus: string, dependentAbility: string): string | null {
  const rateMatch = text.match(/Base(?: current)? ([A-Za-z ]+) Rate: ([\d.]+%)\. Enhanced(?: current)? \1 Rate: ([\d.]+%)\./i);
  if (rateMatch) {
    const channel = rateMatch[1]!.trim();
    const required = text.match(/Required status (?:category|condition):\s*([^.]+)\./i)?.[1]?.trim() ?? suppliedStatus;
    const qualifyingEnemyPhrase = /burn/i.test(required)
      ? 'the same eligible Burned enemy'
      : `the same eligible enemy with ${required}`;
    return `Against ${qualifyingEnemyPhrase}, ${dependentAbility} ${channel} increases from ${rateMatch[2]} to ${rateMatch[3]}.`;
  }
  const chanceMatch = text.match(/Base current application chance:\s*([\d.]+%)\. ([A-Za-z-]+)-target application chance:\s*([\d.]+%)\./i);
  if (chanceMatch) {
    const applied = text.match(/Applied effect:\s*([A-Za-z-]+)\.?/i)?.[1] ?? 'application';
    const multiplier = text.match(/Conditional multiplier:\s*([\d.]+)x/i)?.[1] ?? null;
    const multiplierPhrase = multiplier ? `${multiplier}x ` : '';
    return `Against that same enemy, ${suppliedStatus} ${multiplierPhrase}increases ${possessive(dependentAbility)} ${applied} chance from ${chanceMatch[1]} to ${chanceMatch[3]}.`;
  }
  return null;
}

function compactDependencyTiming(text: string, suppliedStatus: string, dependentAbility: string): string {
  const sameRoundSupplier = text.match(/same-round [^,.;]+ requires ([A-Za-z' -]+) to resolve first/i)?.[1]?.trim()
    ?? text.match(/only if ([A-Za-z' -]+) resolves before/i)?.[1]?.trim()
    ?? null;
  if (/(prior|previous)-round|carry into/i.test(text) && sameRoundSupplier) {
    return `Prior-round ${suppliedStatus} can carry into ${dependentAbility}; same-round overlap requires ${sameRoundSupplier} to resolve first.`;
  }
  const recurring = text.match(/([A-Za-z' -]+) and ([A-Za-z' -]+) both check each round\./i);
  const sameRound = text.match(/A [A-Za-z-]+ applied during the current round can enhance [A-Za-z' -]+ only if ([A-Za-z' -]+) resolves first\./i);
  if (recurring) {
    if (/application chance|Vulnerable chance/i.test(text)) {
      return `Previous-round ${suppliedStatus} can carry into later checks${sameRound ? `; same-round ${suppliedStatus} requires ${sameRound[1]!.trim()} to resolve first.` : '.'}`;
    }
    return `Prior-round ${suppliedStatus} can carry into scheduled ${dependentAbility} rounds${sameRound ? `; same-round ${suppliedStatus} requires ${sameRound[1]!.trim()} to resolve first.` : '.'}`;
  }
  const windows = text.match(/can overlap .*? in these windows: ([^.]+)\./i) ?? text.match(/Known possible overlap windows:\s*([^.]+)\./i);
  if (windows) {
    const supplierSchedule = text.match(/Supplier schedule:\s*([^.]+)\./i)?.[1] ?? '';
    const dependentSchedule = text.match(/Dependent schedule:\s*([^.]+)\./i)?.[1] ?? '';
    if (/each round/i.test(supplierSchedule) && /Rounds/i.test(dependentSchedule)) {
      return `Prior-round ${suppliedStatus} can carry into scheduled ${dependentAbility} rounds; same-round ${suppliedStatus} requires ${windows[1]!.match(/only if ([A-Za-z' -]+) resolves before/i)?.[1]?.trim() ?? 'the supplier'} to resolve first.`;
    }
    const sameRoundWindow = windows[1]!.match(/Round (\d+) from a successful Round \1 application only if ([A-Za-z' -]+) resolves before/i);
    if (sameRoundWindow) {
      const hasPriorRoundCarry = /after a successful Round \d+ application/i.test(windows[1]!);
      return hasPriorRoundCarry && /Burn/i.test(suppliedStatus)
        ? `Prior-round ${suppliedStatus} can carry into ${dependentAbility}; same-round overlap requires ${sameRoundWindow[2]!.trim()} to resolve first.`
        : `The status can carry into later ${dependentAbility} rounds; the shared Round ${sameRoundWindow[1]} window requires ${sameRoundWindow[2]!.trim()} to resolve first.`;
    }
    return `Previous-round ${suppliedStatus} can carry into scheduled ${dependentAbility} rounds.`;
  }
  return '';
}

function compactDependencyUncertainty(text: string): string {
  const hasEnemyIdentity = /enemy identity|selected enemy|Target: one enemy|target selection/i.test(text);
  const hasRollScope = /shared roll|per-target rolls|roll scope|roll sharing/i.test(text);
  const pieces = [
    'Application success',
    hasEnemyIdentity && !hasRollScope ? (/eligible|qualifying/i.test(text) ? 'eligible enemy identity' : 'enemy identity') : null,
    /same enemy|same-target|same-enemy/i.test(text) ? 'same-target overlap' : 'status uptime',
    /action order|resolves first/i.test(text) ? 'action order' : null,
    hasRollScope ? 'roll scope' : null,
  ].filter((piece): piece is string => Boolean(piece));
  return `${pieces.join(', ')} remain unresolved.`;
}

function possessive(value: string): string {
  return value.endsWith('s') ? `${value}'` : `${value}'s`;
}

function targetSelectionEffectLines(
  trace: SynergyTrace,
  recipient: Dragon | null,
  outputCapabilities: OutputCapability[],
  allDragons: Dragon[],
): string[] {
  return unique([
    ...qualifyingOutputSummaryLines(trace, recipient, outputCapabilities, allDragons),
    ...statValueEffectLines(trace),
    trace.effects.find((effect) => /Activation chance:/i.test(effect)),
    trace.effects.find((effect) => /Timing:/i.test(effect)),
    trace.effects.find((effect) => /Enhanced by/i.test(effect)),
    trace.effects.find((effect) => /Duration:/i.test(effect)),
  ].filter((line): line is string => Boolean(line)));
}

function statValueEffectLines(trace: SynergyTrace): string[] {
  if (trace.channel !== 'stat') {
    return [];
  }
  return trace.effects.filter((effect) =>
    /\b(?:Strength|Instinct|Intelligence|Initiative)\s+[+-]\d+(?:\.\d+)?%?(?:\s+at effective Habit Level \d+)?\./i.test(effect),
  );
}

function qualifyingOutputSummaryLines(
  trace: SynergyTrace,
  recipient: Dragon | null = null,
  outputCapabilities: OutputCapability[] = [],
  allDragons: Dragon[] = [],
): string[] {
  const outputs = matchedOutputsForPresentation(trace, recipient, outputCapabilities);
  if (outputs.length > 0) {
    if (!recipient && trace.targetSelectionGroup && allDragons.length > 0) {
      const grouped = groupedOutputLabelsByDragon(outputs, allDragons);
      return grouped.length > 0
        ? [
            `One selected candidate can receive ${formatToken(trace.channel ?? 'damage-dealt')} support.`,
            `Candidate outputs: ${grouped.join('; ')}.`,
          ]
        : [];
    }
    const labels = unique(outputs.map((output) => formatOutputCapabilityLabel(output)));
    const labelText = joinEnglishList(labels);
    if (recipient && labels.length === 1) {
      return [`Increases ${labelText}.`, `${formatToken(trace.channel ?? 'damage-dealt')} support for ${recipient.name}.`];
    }
    return [recipient ? `Increases ${recipient.name}'s ${labelText}.` : `Increases ${labelText}.`];
  }
  const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
  const match = text.match(/Qualifying outputs:\s*([^.]+)\./i);
  if (!match) {
    return [];
  }
  const labels = unique(match[1]!
    .split(/,\s*/)
    .map((label) => label.replace(/:\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean));
  if (labels.length === 0) {
    return [];
  }
  const labelText = joinEnglishList(labels);
  if (recipient && labels.length === 1) {
    return [`Increases ${labelText}.`, `${formatToken(trace.channel ?? 'damage-dealt')} support for ${recipient.name}.`];
  }
  return [recipient ? `Increases ${recipient.name}'s ${labelText}.` : `Increases ${labelText}.`];
}

function matchedOutputsForPresentation(
  trace: SynergyTrace,
  recipient: Dragon | null,
  outputCapabilities: OutputCapability[],
): OutputCapability[] {
  const ids = trace.matchedOutputCapabilityIds ?? [];
  if (ids.length === 0 || outputCapabilities.length === 0) {
    return [];
  }
  const outputs = ids
    .map((id) => outputCapabilities.find((output) => output.id === id))
    .filter((output): output is OutputCapability => Boolean(output));
  return recipient
    ? outputs.filter((output) => output.dragonId === recipient.id)
    : outputs;
}

function groupedOutputLabelsByDragon(outputs: OutputCapability[], allDragons: Dragon[]): string[] {
  const dragonNames = new Map(allDragons.map((dragon) => [dragon.id, dragon.name]));
  const grouped = new Map<string, string[]>();
  for (const output of outputs) {
    grouped.set(output.dragonId, unique([...(grouped.get(output.dragonId) ?? []), formatOutputCapabilityLabel(output)]));
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dragonId, labels]) => `${dragonNames.get(dragonId) ?? dragonId}: ${joinEnglishList(labels)}`);
}

function formatOutputCapabilityLabel(output: OutputCapability): string {
  return output.label.replace(/:\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function deriveCommandSummary(
  dragon: Dragon,
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> } = {},
): FormationCommandSummary | null {
  if (!dragon.command) {
    return null;
  }
  const summaryLines = commandSummaryLines(dragon, options);
  return {
    dragonId: dragon.id,
    abilityName: dragon.command.name,
    label: 'Command',
    summary: summaryLines.join(' '),
    summaryLines,
    detail: commandDetail(dragon, options, summaryLines),
  };
}

function commandDetail(
  dragon: Dragon,
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> },
  summaryLines: string[],
): string {
  return dragon.command?.rawDescription ?? summaryLines.join('\n\n');
}

function commandSummaryLines(
  dragon: Dragon,
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> } = {},
): string[] {
  const command = dragon.command;
  if (!command) {
    return ['Command data not yet verified.'];
  }
  if (command.id === 'malachite-wardens-rally') {
    return [
      'Rounds 2, 4, 7, and 9: Tactical Damage to one same-lane enemy.',
      'Rounds 3, 6, and 9: Recovery to three allies.',
    ];
  }
  if (command.id === 'seasmoke-cleansing-wrath') {
    return [
      'Each round: three independent 20% attempts to cleanse a positive effect.',
      'Rounds 3, 6, and 9: Fire Damage to one enemy.',
    ];
  }
  const summaryLines = commandPresentationSchedules(dragon, options).flatMap(({ schedule, prefix, timingOverride, suffix, level }) =>
    commandScheduleSummaryLines(schedule, level ?? undefined, prefix, dragon.name, timingOverride, suffix),
  );
  const augmentationLines = commandAugmentationSummaryLines(dragon, options);
  const mergedLines = [...summaryLines, ...augmentationLines];
  if (mergedLines.length === 0) {
    return [command.rawDescription?.split(/\n\n|(?<=\.)\s+/)[0] ?? `${command.name} command details are not yet verified.`];
  }
  return mergedLines;
}

interface CommandPresentationSchedule {
  schedule: AbilitySchedule;
  prefix?: string;
  timingOverride?: string;
  suffix?: string;
  level?: 1 | 2 | 3 | 4 | 5 | null;
}

function commandPresentationSchedules(
  dragon: Dragon,
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> } = {},
): CommandPresentationSchedule[] {
  const command = dragon.command;
  if (!command) {
    return [];
  }
  const starRank = options.previewEnabled ? 10 : options.roster?.[dragon.id]?.starRank ?? null;
  const activeAugmentations = command.augmentations.filter((augmentation) => starRank !== null && starRank >= augmentation.minimumDragonStarRank);
  const overridesByScheduleId = new Map<string, Array<{ override: AbilityScheduleOverride; level: 1 | 2 | 3 | 4 | 5 | null }>>();
  for (const augmentation of activeAugmentations) {
    const sourceAbility = dragon.habits.find((habit) => habit.id === augmentation.sourceAbilityId);
    const level = options.previewEnabled
      ? 5
      : resolveEffectiveHabitLevelForAbility(sourceAbility ?? command, options.roster?.[dragon.id]);
    for (const override of augmentation.scheduleOverrides ?? []) {
      const overrides = overridesByScheduleId.get(override.targetScheduleId) ?? [];
      overrides.push({ override, level });
      overridesByScheduleId.set(override.targetScheduleId, overrides);
    }
  }

  const presentedSchedules: CommandPresentationSchedule[] = [];
  for (const schedule of command.schedules) {
    const overrides = overridesByScheduleId.get(schedule.id) ?? [];
    const replacement = overrides.find((entry) => entry.override.operation === 'replace-effect-roll' && entry.override.replacementSchedule);
    if (replacement?.override.replacementSchedule) {
      if (schedule.roundSelector?.kind === 'odd') {
        presentedSchedules.push({
          schedule: replacement.override.replacementSchedule,
          timingOverride: 'Round 1',
          suffix: replacement.override.description,
          level: replacement.level,
        });
        presentedSchedules.push({ schedule });
        continue;
      }
      if (schedule.roundSelector?.kind === 'even') {
        presentedSchedules.push({
          schedule: replacement.override.replacementSchedule,
          timingOverride: 'Even-numbered rounds',
          suffix: replacement.override.description,
          level: replacement.level,
        });
        continue;
      }
      presentedSchedules.push({
        schedule: replacement.override.replacementSchedule,
        suffix: replacement.override.description,
        level: replacement.level,
      });
      continue;
    }
    presentedSchedules.push({ schedule });
  }
  return presentedSchedules;
}

function commandAugmentationSummaryLines(
  dragon: Dragon,
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> } = {},
): string[] {
  const command = dragon.command;
  if (!command) {
    return [];
  }
  const starRank = options.previewEnabled ? 10 : options.roster?.[dragon.id]?.starRank ?? null;
  return command.augmentations
    .filter((augmentation) => starRank !== null && starRank >= augmentation.minimumDragonStarRank)
    .flatMap((augmentation) => {
      const sourceAbility = dragon.habits.find((habit) => habit.id === augmentation.sourceAbilityId);
      const level = options.previewEnabled
        ? 5
        : resolveEffectiveHabitLevelForAbility(sourceAbility ?? command, options.roster?.[dragon.id]);
      const prefix = augmentation.minimumDragonStarRank === 10
        ? 'At 10 Stars, '
        : augmentation.minimumDragonStarRank === 6
          ? 'At 6+ Stars, '
          : `At ${augmentation.minimumDragonStarRank} Stars, `;
      return augmentation.schedulesAdded.flatMap((schedule) => commandScheduleSummaryLines(schedule, level, prefix, dragon.name));
    });
}

function commandScheduleSummaryLines(
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null = null,
  prefix = '',
  sourceName = '',
  timingOverride?: string,
  suffix?: string,
): string[] {
  const lines = commandScheduleEffectSummaries(schedule, level, sourceName);
  if (lines.length === 0) {
    return [];
  }
  const timing = timingOverride ?? scheduleTiming(schedule);
  return lines.map((line, index) => {
    const linePrefix = index === 0
      ? `${prefix}${timing}: `
      : /^If\b/i.test(line)
        ? ''
        : 'Then ';
    return `${linePrefix}${line}${index === 0 && suffix ? ` ${suffix}` : ''}`;
  });
}

function commandScheduleEffectSummaries(
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null,
  sourceName = '',
): string[] {
  const savageClaimSummary = commandSavageClaimSummary(schedule, level, sourceName);
  if (savageClaimSummary) {
    return [savageClaimSummary];
  }
  const pairedStatReductionSummary = commandPairedStatReductionSummary(schedule, level, sourceName);
  if (pairedStatReductionSummary) {
    return [pairedStatReductionSummary];
  }
  const lines: string[] = [];
  const used = new Set<string>();
  for (const effect of schedule.effects) {
    if (used.has(effect.id) || effect.type === 'Burn') {
      continue;
    }
    const linkedBurn = schedule.effects.find((candidate) =>
      candidate.type === 'Burn' &&
      candidate.targetSelection?.references?.some((reference) => reference.referencedEffectId === effect.id),
    );
    if (linkedBurn) {
      lines.push(commandOrderedAttackSummary(effect, linkedBurn, level));
      used.add(effect.id);
      used.add(linkedBurn.id);
      continue;
    }
    const linkedFirstStrike = schedule.effects.find((candidate) =>
      candidate.id !== effect.id &&
      candidate.type === 'First-Strike' &&
      (candidate.durationRounds ?? null) === (effect.durationRounds ?? null) &&
      candidate.targetSelection?.sharedSelectionGroupId === effect.targetSelection?.sharedSelectionGroupId,
    );
    if (effect.type === 'Fire Damage Dealt Up' && linkedFirstStrike) {
      lines.push(commandChanceTriggeredSupportSummary(schedule, effect, linkedFirstStrike, level));
      used.add(effect.id);
      used.add(linkedFirstStrike.id);
      continue;
    }
    lines.push(commandSingleEffectSummary(effect, schedule, level));
    used.add(effect.id);
  }
  const repeat = commandRepeatSummary(schedule);
  if (repeat) {
    lines.push(repeat);
  }
  return lines;
}

function commandSavageClaimSummary(
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null,
  sourceName = '',
): string | null {
  const fireDamage = schedule.effects.find((effect) => effect.type === 'Fire Damage');
  const recovery = schedule.effects.find((effect) => effect.type === 'Recovery');
  if (!fireDamage || !recovery || !/Prey/i.test(fireDamage.target) || !/Self/i.test(recovery.target)) {
    return null;
  }
  const fireRate = commandRateValue(fireDamage, level);
  const recoveryRate = commandRateValue(recovery, level);
  const enhancedFire = commandEnhancedRateValue(fireDamage, level);
  const enhancedRecovery = commandEnhancedRateValue(recovery, level);
  return [
    `while ${sourceName || 'Sheepstealer'} has a current Prey: deal Fire Damage to Prey at a ${fireRate} rate and apply Recovery to ${sourceName || 'Sheepstealer'} at a ${recoveryRate} rate, enhanced by Dragon Level and Intelligence.`,
    `If the current Prey received Recovery during the previous round, both rates are tripled to ${enhancedFire} Fire Damage and ${enhancedRecovery} Recovery.`,
  ].join(' ');
}

function commandPairedStatReductionSummary(
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null,
  sourceName = '',
): string | null {
  const instinctDown = schedule.effects.find((effect) => effect.type === 'Instinct Down');
  const initiativeDown = schedule.effects.find((effect) => effect.type === 'Initiative Down');
  if (!instinctDown || !initiativeDown) {
    return null;
  }
  const reduction = commandRateValue(instinctDown, level);
  const chance = commandChanceValue(schedule.activationRoll ?? instinctDown.activationRoll ?? initiativeDown.activationRoll, level);
  const target = commandTargetPhrase(instinctDown);
  return `${chance} chance to reduce the Instinct and Initiative of ${target} by ${reduction} for ${instinctDown.durationRounds ?? initiativeDown.durationRounds ?? 0} rounds, enhanced by ${sourceName || 'Crimson'}'s Intelligence.`;
}

function commandChanceTriggeredSupportSummary(
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  bonusEffect: AbilityEffect,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string {
  const chance = commandScheduleChanceValue(schedule, level);
  const rate = commandRateValue(effect, level);
  const target = commandTargetPhrase(effect);
  const duration = effect.durationRounds ?? bonusEffect.durationRounds ?? 0;
  const priority = effect.targetPriority === 'prefer-fire-damage-ally'
    ? ', prioritizing Allies that deal Fire Damage'
    : '';
  return `${chance} chance to increase Fire Damage Dealt by ${rate} and grant First-Strike to ${target} for ${duration} rounds${priority}.`;
}

function commandOrderedAttackSummary(
  attack: AbilityEffect,
  burn: AbilityEffect,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string {
  const attackRate = commandRateValue(attack, level);
  const burnChance = commandChanceValue(burn.activationRoll, level);
  const target = commandOrderedTargetPhrase(attack);
  const burnDuration = burn.durationRounds ?? 2;
  return `deal Fire Damage at a ${attackRate} rate to ${target}, with a ${burnChance} chance to apply Burn for ${burnDuration} rounds.`;
}

function commandScheduleChanceValue(
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string {
  const chance = schedule.triggerChanceFixed !== null && schedule.triggerChanceFixed !== undefined
    ? { level: 1 as const, value: schedule.triggerChanceFixed, unit: 'percent' as const }
    : schedule.triggerChanceByHabitLevel?.length
      ? rankedValueForHabitLevel(schedule.triggerChanceByHabitLevel, level)
      : null;
  return chance ? formatRankedValue(chance, 'percent') : 'unknown';
}

function commandSingleEffectSummary(
  effect: AbilityEffect,
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string {
  const conditionalMultipliers = effect.conditionalMultipliers ?? [];
  if (effect.type === 'Prey') {
    const chance = commandScheduleChanceValue(schedule, level);
    return `if no enemy is currently marked as Prey, there is a ${chance} chance to apply Prey.`;
  }
  if (effect.type === 'Bleed') {
    const chance = commandChanceValue(effect.activationRoll, level);
    const target = /original basic attack target and one other enemy within adjacency/i.test(effect.target)
      ? 'the original Basic Attack target and one other enemy within adjacency'
      : commandTargetPhrase(effect);
    return `independently attempt Bleed at a ${chance} chance on ${target}. Bleed deals periodic Physical Damage at a ${commandRateValue(effect, level)} rate each round for ${effect.durationRounds ?? 2} rounds.`;
  }
  if (effect.type === 'Stun') {
    const chance = commandChanceValue(schedule.activationRoll ?? effect.activationRoll, level);
    return `${chance} chance to Stun ${commandTargetPhrase(effect)} for ${effect.durationRounds ?? 0} rounds.`;
  }
  if (effect.type === 'Taunt') {
    const chance = commandChanceValue(effect.activationRoll ?? schedule.activationRoll, level);
    const duration = effect.durationRounds ? ` for ${effect.durationRounds} rounds` : '';
    const unresolvedScope = (effect.activationRoll ?? schedule.activationRoll)?.unresolved
      ? ' Shared versus per-target roll scope is unresolved.'
      : '';
    return `${chance} chance to apply Taunt to ${commandTargetPhrase(effect)}${duration}.${unresolvedScope}`;
  }
  if (effect.type === 'Physical Damage Dealt Down' && (schedule.activationRoll?.chanceFixed ?? effect.activationRoll?.chanceFixed ?? null) !== null) {
    const target = effect.conditions?.some((condition) => condition.kind === 'target-has-output-capability')
      ? 'all qualifying enemies in any lane, up to 3, that possess non-Basic Physical Damage outputs'
      : 'the highest-Strength enemy';
    const reduction = formatRankedValue({ level: 1, value: effect.magnitude ?? 12, unit: 'percent' }, 'percent');
    return `${commandChanceValue(schedule.activationRoll ?? effect.activationRoll, level)} chance to reduce ${target}'s non-Basic Physical Damage Dealt by ${reduction} for ${effect.durationRounds ?? 2} rounds.`;
  }
  if (effect.type === 'Tactical Damage') {
    return `deal Tactical Damage at a ${commandRateValue(effect, level)} rate to ${commandTargetPhrase(effect)}.`;
  }
  if (effect.type === 'Physical Damage') {
    return `deal Physical Damage at a ${commandRateValue(effect, level)} rate to ${commandTargetPhrase(effect)}.`;
  }
  if (effect.type === 'Recovery') {
    const target = commandTargetPhrase(effect);
    const rate = commandRateValue(effect, level);
    return `apply Recovery at a ${rate} rate to ${target}, enhanced by Intelligence.`;
  }
  if (effect.stack) {
    return commandStackSummary(effect, schedule, level);
  }
  if (effect.type === 'Panic') {
    const chance = commandChanceValue(effect.activationRoll, level);
    const target = /physical damage target and one other distinct enemy within adjacency/i.test(effect.target)
      ? 'the Physical Damage target and one other distinct enemy within adjacency'
      : commandTargetPhrase(effect);
    return `independently attempt Panic at a ${chance} chance on ${target}. Panic deals periodic Tactical Damage at a ${commandRateValue(effect, level)} rate each round for ${effect.durationRounds ?? 2} rounds.`;
  }
  if (effect.type === 'Fire Damage' && conditionalMultipliers.length > 0) {
    const multiplier = conditionalMultipliers[0]!;
    const target = schedule.targetPriority === 'prefer-prey'
      ? 'one enemy, prioritizing Prey'
      : /all enemies that deal Physical Damage, excluding Basic Attacks/i.test(effect.target)
        ? 'all qualifying enemies in any lane, up to 3, that possess non-Basic Physical Damage outputs'
        : commandTargetPhrase(effect);
    const base = commandRateValue(effect, level);
    const required = multiplier.condition.statusCategoryId
      ? formatToken(multiplier.condition.statusCategoryId)
      : formatToken(multiplier.condition.statusId ?? 'status');
    if (multiplier.multiplier === 2 && /prey/i.test(required)) {
      return `deal Fire Damage at a ${base} rate to ${target}. Damage is doubled against Prey.`;
    }
    const enhanced = commandEnhancedRateValue(effect, level);
    const targetLabel = /Burn/i.test(required) ? 'same eligible target' : 'same target';
    return `deal Fire Damage at a ${base} rate to ${target}. Against the ${targetLabel} while it has ${required}, the rate increases ${multiplier.multiplier}x to ${enhanced}.`;
  }
  if (effect.type === 'Fire Damage') {
    const target = schedule.targetPriority === 'prefer-prey'
      ? 'one enemy, prioritizing Prey'
      : commandTargetPhrase(effect);
    return `deal Fire Damage at a ${commandRateValue(effect, level)} rate to ${target}.`;
  }
  return commandEffectSummaryLine(schedule, effect, level)[0] ?? `${effect.type}.`;
}

function commandStackSummary(
  effect: AbilityEffect,
  schedule: AbilitySchedule,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string {
  const chance = commandChanceValue(effect.activationRoll ?? schedule.activationRoll, level);
  const target = commandTargetPhrase(effect);
  const stackName = formatToken(effect.stack?.statusId ?? effect.type);
  const value = effect.stack?.valuePerStackFixed ?? rankedValueForHabitLevel(effect.stack?.valuePerStackByHabitLevel ?? [], level)?.value ?? null;
  const maximum = effect.stack?.maximumStacks ?? null;
  const channel = /spreading-blaze/i.test(effect.stack?.statusId ?? effect.type)
    ? 'Tactical Damage Dealt'
    : /rallying-flame/i.test(effect.stack?.statusId ?? effect.type)
      ? 'Physical Damage Dealt'
      : 'the linked output';
  const valueLine = value !== null && maximum !== null
    ? ` Each stack increases ${channel} by ${formatRankedValue({ level: 1, value, unit: 'percent' }, 'percent')}, up to ${maximum} stacks.`
    : '';
  return `there is a ${chance} chance to grant one ${stackName} stack to ${target}.${valueLine}`;
}

function commandRepeatSummary(schedule: AbilitySchedule): string | null {
  if (!schedule.repeat?.condition) {
    return null;
  }
  const condition = schedule.repeat.condition.description.replace(/\.$/, '');
  if (schedule.repeat.mode === 'once-if-any-match') {
    const normalized = condition.replace(/^At least one/i, 'any');
    return `If ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}, repeat the stack chance once.`;
  }
  if (schedule.repeat.mode === 'once-per-match') {
    return `If ${condition.charAt(0).toLowerCase()}${condition.slice(1)}, repeat once per match; the match count is unresolved.`;
  }
  return null;
}

function commandTargetPhrase(effect: AbilityEffect): string {
  const outputCondition = effect.conditions?.find((condition) => condition.kind === 'target-has-output-capability');
  const qualifyingOutput = outputCondition?.qualifyingOutput;
  if (qualifyingOutput?.channel === 'physical-damage' && qualifyingOutput.sourceScope === 'non-basic-attacks') {
    return 'all qualifying enemies in any lane, up to 3, that possess non-Basic Physical Damage outputs';
  }
  if (
    effect.targetScope === 'any-lane' &&
    /Physical Damage/i.test(effect.target) &&
    /Basic Attacks?/i.test(effect.target)
  ) {
    return 'all qualifying enemies in any lane, up to 3, that possess non-Basic Physical Damage outputs';
  }
  if (
    effect.targetPriority === 'least-current-troops-ally' ||
    (
      effect.targetSelection?.comparisonStat === 'current-troops' &&
      effect.targetSelection?.comparisonDirection === 'lowest' &&
      effect.targetSelection?.comparisonPool === 'ally-side'
    )
  ) {
    return 'the Ally with the least current troops';
  }
  if (effect.targetPriority === 'prefer-prey') {
    return 'one enemy, prioritizing Prey';
  }
  if (effect.targetPriority === 'highest-stat-enemy' && effect.targetSelection?.comparisonStat === 'strength') {
    return 'the highest-Strength enemy';
  }
  if (effect.targetPriority === 'highest-stat-enemy' && effect.targetSelection?.comparisonStat === 'instinct') {
    return 'the highest-Instinct enemy';
  }
  if (effect.targetPriority === 'highest-stat-enemy' && effect.targetSelection?.comparisonStat === 'intelligence') {
    return 'the highest-Intelligence enemy';
  }
  if (/was not the original Basic Attack target/i.test(effect.target)) {
    return 'one enemy within adjacency that is distinct from the original Basic Attack target';
  }
  if (
    effect.targetPriority === 'original-basic-attack-target' ||
    effect.targetSelection?.references?.some((reference) => reference.kind === 'original-basic-attack-target')
  ) {
    return 'the original Basic Attack target';
  }
  if (
    effect.targetPriority === 'least-current-troops-enemy' ||
    (
      effect.targetSelection?.comparisonStat === 'current-troops' &&
      effect.targetSelection?.comparisonDirection === 'lowest' &&
      effect.targetSelection?.comparisonPool === 'enemy-side'
    )
  ) {
    return 'the enemy with the least troops';
  }
  if (effect.targetCount === 1 && /Ally/i.test(effect.target) && !/least current troops/i.test(effect.target)) {
    if (effect.conditions?.some((condition) => condition.qualifyingOutput?.channel === 'tactical-damage') || /deals Tactical Damage/i.test(effect.target)) {
      return 'one Ally that deals Tactical Damage';
    }
    return 'one Ally in any lane';
  }
  if (/First added enemy/i.test(effect.target)) {
    return 'a first enemy in any lane';
  }
  if (/Second added enemy/i.test(effect.target)) {
    return 'a different enemy in any lane';
  }
  if (effect.targetCount === 2 && effect.targetScope === 'within-adjacency') {
    return '2 enemies within adjacency';
  }
  if (effect.targetCount === 3 && effect.targetScope === 'any-lane') {
    if (effect.conditions?.some((condition) => condition.kind === 'target-has-output-capability')) {
      return 'all qualifying enemies in any lane, up to 3, that possess non-Basic Physical Damage outputs';
    }
    return '3 enemies in any lane';
  }
  if (effect.targetCount === 2 && effect.targetScope === 'any-lane' && /other Allies/i.test(effect.target)) {
    return '2 other Allies in any lane';
  }
  if (/1 Ally/i.test(effect.target)) {
    if (effect.conditions?.some((condition) => condition.qualifyingOutput?.channel === 'tactical-damage') || /deals Tactical Damage/i.test(effect.target)) {
      return 'one Ally that deals Tactical Damage';
    }
    return effect.targetScope === 'within-adjacency' ? 'one Ally within adjacency' : 'one Ally in any lane';
  }
  if (/1 Enemy/i.test(effect.target)) {
    if (effect.targetScope === 'within-adjacency') {
      return 'one enemy within adjacency';
    }
    if (effect.targetScope === 'same-lane') {
      return 'one enemy in the same lane';
    }
    return 'one enemy in any lane';
  }
  if (effect.targetScope === 'any-lane' && effect.targetCount === 1) {
    return 'one enemy in any lane';
  }
  return effect.target;
}

function commandOrderedTargetPhrase(effect: AbilityEffect): string {
  if (/First added enemy/i.test(effect.target)) {
    return 'a first enemy in any lane';
  }
  if (/Second added enemy/i.test(effect.target)) {
    return 'a different enemy in any lane';
  }
  return commandTargetPhrase(effect);
}

function commandRateValue(effect: AbilityEffect, level: 1 | 2 | 3 | 4 | 5 | null): string {
  const ranked = effect.rankedValues.length > 0 ? rankedValueForHabitLevel(effect.rankedValues, level) : null;
  const magnitude = effect.magnitude !== null && effect.magnitude !== undefined
    ? { level: 1 as const, value: effect.magnitude, unit: effect.unit === 'flat' ? 'flat' as const : 'percent' as const }
    : null;
  const value = ranked ?? magnitude;
  return value ? formatRankedValue(value, effect.unit) : 'unknown';
}

function commandEnhancedRateValue(effect: AbilityEffect, level: 1 | 2 | 3 | 4 | 5 | null): string {
  const multiplier = effect.conditionalMultipliers?.[0];
  if (!multiplier) {
    return commandRateValue(effect, level);
  }
  const enhanced = multiplier.directlyVerifiedValues.find((value) => value.level === (level ?? 1));
  return enhanced ? formatRankedValue(enhanced, effect.unit) : commandRateValue(effect, level);
}

function commandChanceValue(activationRoll: ActivationRoll | null | undefined, level: 1 | 2 | 3 | 4 | 5 | null): string {
  const chance = activationRoll?.chanceFixed !== null && activationRoll?.chanceFixed !== undefined
    ? { level: 1 as const, value: activationRoll.chanceFixed, unit: 'percent' as const }
    : activationRoll?.chanceByHabitLevel?.length
      ? rankedValueForHabitLevel(activationRoll.chanceByHabitLevel, level)
      : null;
  return chance ? formatRankedValue(chance, 'percent') : 'unknown';
}

function commandEffectSummaryLine(
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string[] {
  if (effect.type === 'Resistance') {
    const activationChance = commandChanceValue(effect.activationRoll, level);
    if (activationChance !== 'unknown') {
      const duration = effect.durationRounds ? ` for ${effect.durationRounds} rounds` : '';
      return [
        `apply Resistance at a ${activationChance} chance to ${commandTargetPhrase(effect)}${duration}.`,
      ];
    }
  }
  const base = rankedValueForHabitLevel(effect.rankedValues, level);
  const multiplier = effect.conditionalMultipliers?.[0] ?? null;
  const enhanced = multiplier?.directlyVerifiedValues.find((value) => value.level === level);
  if (!base) {
    return [];
  }
  const target = effect.conditions?.some((condition) => condition.kind === 'target-has-output-capability')
    ? 'all qualifying enemies in any lane, up to 3, that possess non-Basic Physical Damage outputs'
    : effect.target;
  if (!multiplier || !enhanced) {
    return [
      `${scheduleTiming(schedule)}: ${effectActionVerb(effect.type)} ${formatToken(effect.type)} at a ${formatRankedValue(base, effect.unit)} rate to ${target}.`,
    ];
  }
  const status = multiplier.condition.statusId ? formatToken(multiplier.condition.statusId) : 'the condition';
  return [
    `${scheduleTiming(schedule)}: deal ${formatToken(effect.type)} at a ${formatRankedValue(base, effect.unit)} rate to ${target}. Against an eligible target afflicted with ${status}, the rate is increased ${multiplier.multiplier}x to ${formatRankedValue(enhanced, effect.unit)}.`,
  ];
}

function effectActionVerb(effectType: string): string {
  if (/recovery/i.test(effectType)) {
    return 'apply';
  }
  if (/damage/i.test(effectType)) {
    return 'deal';
  }
  return 'apply';
}

function scheduleTiming(schedule: AbilitySchedule): string {
  const rounds = schedule.rounds;
  if (schedule.timing === 'after-basic-attack') {
    return 'After each Basic Attack';
  }
  if (schedule.roundSelector?.kind === 'start-of-round' && rounds.length === 1) {
    return `Round ${rounds[0]}`;
  }
  if (schedule.roundSelector?.kind === 'even') {
    return 'Even-numbered rounds';
  }
  if (schedule.roundSelector?.kind === 'odd') {
    return rounds.includes(1) ? 'Odd-numbered rounds' : 'Other odd-numbered rounds';
  }
  if (rounds.length === 1) {
    return `Round ${rounds[0]}`;
  }
  if (rounds.length > 0) {
    return `Rounds ${joinEnglishList(rounds.map(String))}`;
  }
  return formatToken(schedule.timing);
}

function traceState(trace: SynergyTrace, previewEnabled = false): FormationCardInteractionState {
  if (trace.status === 'active') {
    return 'active';
  }
  if (trace.status === 'unknown') {
    return 'unknown';
  }
  if (trace.status === 'potential') {
    return previewEnabled && hasFailedProgression(trace.requirements) ? 'preview' : 'conditional';
  }
  return 'blocked';
}

function projectedInteractionState(trace: SynergyTrace, previewEnabled = false): FormationCardInteractionState {
  const state = traceState(trace, previewEnabled);
  if (state !== 'active') {
    return state;
  }
  if (
    (trace.matchKind === 'enemy-damage-dealt-reduction' || trace.matchKind === 'enemy-mitigation-reduction') &&
    /all three enemy slots are covered/i.test([trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' '))
  ) {
    return state;
  }
  if (trace.targetSelectionGroup?.selectionUncertain) {
    if (
      trace.targetSelectionGroup.selection === 'one-eligible-adjacent' &&
      trace.status === 'active' &&
      [trace.explanation, ...trace.matchedFacts, ...trace.effects].some((line) => /Timing:\s*Start of combat|Start of Combat/i.test(line)) &&
      ![trace.explanation, ...trace.matchedFacts, ...trace.effects].some((line) => /Activation chance:/i.test(line))
    ) {
      return state;
    }
    if (trace.targetSelectionGroup.selection === 'highest-stat' && highestStatSelectionResolved(trace.targetSelectionGroup)) {
      return state;
    }
    return 'conditional';
  }
  if (trace.matchKind === 'stat-scaling-support') {
    const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
    if (/fallback|preferred|selected recipient is unresolved|recipient selection/i.test(text)) {
      return 'conditional';
    }
  }
  if (trace.matchKind === 'enemy-damage-dealt-reduction' || trace.matchKind === 'enemy-mitigation-reduction') {
    const selector = trace.modifier?.targetSelector;
    const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
    if (/highest-(?:Strength|Intelligence)|enemy with highest/i.test(text) && /unresolved/i.test(text)) {
      return 'conditional';
    }
    if (
      selector?.selection === 'highest-stat' ||
      selector?.selectionResource === 'current-troops' ||
      selector?.scope === 'within-adjacency' ||
      selector?.selection === 'adjacent'
    ) {
      return 'conditional';
    }
  }
  return state;
}

function highestStatSelectionResolved(group: NonNullable<SynergyTrace['targetSelectionGroup']>): boolean {
  if (group.selection !== 'highest-stat' || !group.candidateStats || group.candidateStats.length === 0) {
    return false;
  }
  const values = group.candidateStats.map((candidate) => candidate.value);
  if (values.some((value) => value === null)) {
    return false;
  }
  const numericValues = values.filter((value): value is number => value !== null);
  if (numericValues.length === 0) {
    return false;
  }
  const highest = Math.max(...numericValues);
  return numericValues.filter((value) => value === highest).length === 1;
}

function hasFailedProgression(requirements: RequirementTrace[]): boolean {
  return requirements.some(
    (requirement) =>
      requirement.satisfied === false &&
      /Dragon Level|Star Rank|Habit unlock|Selected Habit Level|Collection state/i.test(requirement.label),
  );
}

function deriveTraitStatus(dragon: Dragon, position: FormationPosition, traces: SynergyTrace[]): FormationTraitStatus | null {
  if (!dragon.trait) {
    return null;
  }
  const trace = traces.find(
    (item) => item.ruleId === 'vanguard-trait-requirement' && item.sourceDragonId === dragon.id,
  );
  if (!trace) {
    return {
      dragonId: dragon.id,
      abilityName: dragon.trait.name,
      state: 'unknown',
      label: 'Trait reviewed',
      summary: dragon.trait.positionRequirement
        ? `${dragon.trait.name} requires ${formatPosition(dragon.trait.positionRequirement)}.`
        : `${dragon.trait.name} has no verified formation placement requirement.`,
      detail: dragon.trait.rawDescription ?? dragon.trait.name,
    };
  }

  const placement = trace.requirements.find((requirement) => /position/i.test(requirement.label));
  const failedProgression = trace.requirements.find(
    (requirement) =>
      requirement.satisfied === false && /Dragon Level|Star Rank|Habit unlock|Selected Habit Level/i.test(requirement.label),
  );
  const unknownProgression = trace.requirements.find(
    (requirement) =>
      requirement.satisfied === null && /Dragon Level|Star Rank|Habit unlock|Selected Habit Level/i.test(requirement.label),
  );
  if (placement?.satisfied === false) {
    const blockedForProgression = Boolean(failedProgression);
    return {
      dragonId: dragon.id,
      abilityName: dragon.trait.name,
      state: blockedForProgression ? 'blocked' : 'inactive',
      label: 'Trait inactive',
      summary: blockedForProgression
        ? `${dragon.trait.name} requires Vanguard.`
        : `${dragon.trait.name} requires Vanguard.`,
      detail: trace.explanation,
    };
  }
  if (failedProgression) {
    return {
      dragonId: dragon.id,
      abilityName: dragon.trait.name,
      state: 'blocked',
      label: 'Trait inactive',
      summary: `${dragon.trait.name} placement valid. ${formatRequirementFailure(failedProgression)}.`,
      detail: trace.explanation,
    };
  }
  if (unknownProgression) {
    return {
      dragonId: dragon.id,
      abilityName: dragon.trait.name,
      state: 'unknown',
      label: 'Trait placement valid',
      summary: 'Dragon Level and Star Rank unknown.',
      detail: trace.explanation,
    };
  }
  return {
    dragonId: dragon.id,
    abilityName: dragon.trait.name,
    state: position === 'vanguard' ? 'active' : traceState(trace),
    label: position === 'vanguard' ? 'Trait active' : 'Trait placement valid',
    summary: trace.effects[0] ?? trace.explanation,
    detail: trace.explanation,
  };
}

function deriveCardAffinities(dragon: Dragon): FormationCardAffinitySummary {
  return {
    favorable: TROOP_TYPES.filter((troopType) => dragon.affinities[troopType] === 'positive'),
    unfavorable: TROOP_TYPES.filter((troopType) => dragon.affinities[troopType] === 'negative'),
    unknown: TROOP_TYPES.filter((troopType) => dragon.affinities[troopType] === 'unknown'),
  };
}

function emptyAffinities(): FormationCardAffinitySummary {
  return { favorable: [], unfavorable: [], unknown: [] };
}

function deriveTeamAffinitySummary(team: Dragon[]): FormationAffinityTeamSummary {
  return {
    covered: TROOP_TYPES.flatMap((troopType) => {
      const dragonNames = team.filter((dragon) => dragon.affinities[troopType] === 'positive').map((dragon) => dragon.name);
      return dragonNames.length > 0 ? [{ troopType, dragonNames }] : [];
    }),
    weakOrMissing: TROOP_TYPES.flatMap((troopType) => {
      const dragonNames = team.filter((dragon) => dragon.affinities[troopType] === 'unknown').map((dragon) => dragon.name);
      const positive = team.some((dragon) => dragon.affinities[troopType] === 'positive');
      return !positive ? [{ troopType, dragonNames }] : [];
    }),
    conflicts: TROOP_TYPES.flatMap((troopType) => {
      const dragonNames = team.filter((dragon) => dragon.affinities[troopType] === 'negative').map((dragon) => dragon.name);
      return dragonNames.length > 0 ? [{ troopType, dragonNames }] : [];
    }),
  };
}

function prepareInteractions(
  interactions: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  selectedIds: ReadonlySet<string>,
): FormationCardInteraction[] {
  const attached = attachRecipientModifiers(interactions, direction);
  const statMerged = mergeExactRecipientStatSupportInteractions(attached, direction, selectedIds);
  const aggregated = aggregateInteractions(dedupeInteractions(statMerged), direction, selectedIds);
  const pruned = direction === 'provides'
    ? pruneSubsumedProviderInteractions(aggregated)
    : aggregated;
  return prioritizeInteractions(pruned);
}

function attachRecipientModifiers(
  interactions: FormationCardInteraction[],
  direction: 'receives' | 'provides',
): FormationCardInteraction[] {
  const baseItems = interactions.filter((interaction) => !interaction.isRecipientModifier);
  const modifierItems = interactions.filter((interaction) => interaction.isRecipientModifier);
  const fallbackModifiers: FormationCardInteraction[] = [];

  for (const modifier of modifierItems) {
    const target = baseItems.find(
      (item) => direction === 'provides'
        ? providerModifierMatchesBase(item, modifier)
        : recipientModifierMatchesBase(item, modifier),
    );
    if (!target) {
      fallbackModifiers.push(modifier);
      continue;
    }
    target.modifierLines = unique([...target.modifierLines, ...modifier.modifierLines]);
    target.details = unique([...target.details, ...modifier.details]);
    target.effects = unique([...target.effects, ...modifier.effects]);
    target.requirements = uniqueBy(
      [...target.requirements, ...modifier.requirements],
      (requirement) => [
        requirement.id,
        requirement.label,
        requirement.expected,
        requirement.actual ?? 'unknown',
        String(requirement.satisfied),
      ].join('|'),
    );
    target.traceIds = unique([...target.traceIds, ...modifier.traceIds]);
    target.summary = compactSummaryText([...target.summaryLines, ...target.modifierLines], target.candidateTotal);
  }

  return [...baseItems, ...fallbackModifiers];
}

function providerModifierMatchesBase(base: FormationCardInteraction, modifier: FormationCardInteraction): boolean {
  if (
    base.sourceDragonId !== modifier.sourceDragonId ||
    base.abilityName !== modifier.abilityName
  ) {
    return false;
  }
  const modifierText = normalizeText([
    modifier.effectTitle,
    modifier.summary,
    ...modifier.summaryLines,
    ...modifier.details,
    ...modifier.effects,
    ...modifier.modifierLines,
  ].join(' '));
  const baseText = normalizeText([
    base.effectTitle,
    base.summary,
    ...base.summaryLines,
    ...base.details,
    ...base.effects,
  ].join(' '));
  if (/recovery received|recovery support|recovery amplification/.test(modifierText)) {
    return /recovery rate|recovery support|recovery received/.test(baseText);
  }
  if (/damage received|damage dealt|physical damage|tactical damage|fire damage/.test(modifierText)) {
    return /damage received|damage dealt|physical damage|tactical damage|fire damage/.test(baseText);
  }
  if (/\bstrength\b|\bintelligence\b|\binstinct\b|\binitiative\b/.test(modifierText)) {
    return /\bstrength\b|\bintelligence\b|\binstinct\b|\binitiative\b/.test(baseText);
  }
  return false;
}

function recipientModifierMatchesBase(base: FormationCardInteraction, modifier: FormationCardInteraction): boolean {
  if (
    base.sourceDragonId !== modifier.sourceDragonId ||
    base.recipientDragonId !== modifier.recipientDragonId ||
    base.abilityName !== modifier.abilityName
  ) {
    return false;
  }
  if (base.relationshipId === modifier.relationshipId) {
    return true;
  }
  const modifierText = normalizeText([
    modifier.effectTitle,
    modifier.summary,
    ...modifier.summaryLines,
    ...modifier.details,
    ...modifier.effects,
    ...modifier.modifierLines,
  ].join(' '));
  const baseText = normalizeText([
    base.effectTitle,
    base.summary,
    ...base.summaryLines,
    ...base.details,
    ...base.effects,
  ].join(' '));
  if (/recovery received|recovery support|recovery amplification/.test(modifierText)) {
    return /recovery rate|recovery support|recovery received/.test(baseText);
  }
  if (/damage received|damage dealt|physical damage|tactical damage|fire damage/.test(modifierText)) {
    return /damage received|damage dealt|physical damage|tactical damage|fire damage/.test(baseText);
  }
  if (/\bstrength\b|\bintelligence\b|\binstinct\b|\binitiative\b/.test(modifierText)) {
    return /\bstrength\b|\bintelligence\b|\binstinct\b|\binitiative\b/.test(baseText);
  }
  return false;
}

function prioritizeInteractions(interactions: FormationCardInteraction[]): FormationCardInteraction[] {
  return dedupeInteractions(interactions).sort((left, right) => {
    const state = interactionStatePriority(left.state) - interactionStatePriority(right.state);
    if (state !== 0) {
      return state;
    }
    return `${left.abilityName}${left.recipientName ?? ''}${left.summary}`.localeCompare(
      `${right.abilityName}${right.recipientName ?? ''}${right.summary}`,
    );
  });
}

function aggregateInteractions(
  interactions: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  selectedIds: ReadonlySet<string>,
): FormationCardInteraction[] {
  const grouped = new Map<string, FormationCardInteraction[]>();
  for (const interaction of interactions) {
    const key =
      direction === 'receives'
        ? receivesAggregationKey(interaction)
        : [interaction.sourceDragonId, interaction.abilityName, interaction.presentationFamily, interactionMechanicKey(interaction), interaction.state].join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), interaction]);
  }

  return [...grouped.values()].flatMap((items) => {
    if (items.length <= 1) {
      return items;
    }
    if (direction === 'receives') {
      if (!canAggregateReceivesGroup(items)) {
        return items;
      }
      return [mergeInteractions(items, direction, selectedIds)];
    }
    if (items.some((item) => item.candidateTotal !== null || item.targetLabel !== null || item.isCandidate)) {
      return [mergeInteractions(items, direction, selectedIds)];
    }
    if (items.every((item) => item.presentationFamily.startsWith('periodic-status-damage:'))) {
      return [mergeInteractions(items, direction, selectedIds)];
    }
    return aggregateExactProvidesSubgroups(items, selectedIds);
  });
}

function receivesAggregationKey(interaction: FormationCardInteraction): string {
  const sharedBenefitKey = sharedStatusRecipientBenefitKey(interaction);
  if (sharedBenefitKey) {
    return [
      interaction.recipientDragonId ?? interaction.targetLabel ?? 'team',
      'shared-status-recipient-benefit',
      sharedBenefitKey,
      interaction.state,
    ].join('|');
  }
  return [
    interaction.sourceDragonId,
    interaction.abilityName,
    interaction.recipientDragonId ?? interaction.targetLabel ?? 'team',
    interaction.presentationFamily,
    receivesInteractionMechanicKey(interaction),
    interaction.state,
  ].join('|');
}

function sharedStatusRecipientBenefitKey(interaction: FormationCardInteraction): string | null {
  if (!/\benhances .+ (?:damage rate|Physical Damage|Tactical Damage|Fire Damage)\b/i.test(interaction.effectTitle)) {
    return null;
  }
  const text = interactionText(interaction);
  const requiredStatus = interaction.title.match(/^(.+?) enables /i)?.[1]?.trim() ?? interaction.effectTitle.match(/(?:^|-\s*)(.+?) enhances /i)?.[1]?.trim();
  const dependentAbility = interaction.title.match(/ enables (.+)$/i)?.[1]?.trim() ?? interaction.effectTitle.match(/ enhances (.+?)(?: damage rate| chance| Fire Damage| Tactical Damage| Physical Damage)?$/i)?.[1]?.trim();
  const sharedTitle = sharedEnhancementTitleSuffix(interaction.effectTitle);
  const rateIncrease = text.match(/\bincreases from ([\d.]+%) to ([\d.]+%)/i);
  const baseRate = text.match(/\bBase(?: current)? [A-Za-z ]+ Damage Rate: ([^.]+)\./i)?.[1]?.trim() ?? rateIncrease?.[1] ?? '';
  const enhancedRate = text.match(/\bEnhanced(?: current)? [A-Za-z ]+ Damage Rate: ([^.]+)\./i)?.[1]?.trim() ?? rateIncrease?.[2] ?? '';
  if (!requiredStatus || !dependentAbility || !baseRate || !enhancedRate) {
    return null;
  }
  return [
    requiredStatus,
    dependentAbility,
    sharedTitle,
    baseRate,
    enhancedRate,
    interaction.presentationFamily,
  ].join('|');
}

function sharedEnhancementTitleSuffix(title: string): string {
  const parts = title.split(/\s+-\s+/);
  const suffix = parts[parts.length - 1]?.trim() ?? title;
  return /\benhances\b/i.test(suffix) ? suffix : title;
}

function canAggregateReceivesGroup(items: FormationCardInteraction[]): boolean {
  if (items.length <= 1) {
    return true;
  }
  if (items.every((item) => sharedStatusRecipientBenefitKey(item) !== null)) {
    return unique(items.map((item) => item.sourceDragonId)).length > 1;
  }
  return true;
}

function aggregateExactProvidesSubgroups(
  items: FormationCardInteraction[],
  selectedIds: ReadonlySet<string>,
): FormationCardInteraction[] {
  const grouped = new Map<string, FormationCardInteraction[]>();
  for (const item of items) {
    const key = [
      item.status,
      item.isPreview ? 'preview' : 'current',
      item.isEnemyFacing ? 'enemy' : 'friendly',
      item.presentationFamily,
      providesAggregationMode(item),
      exactRecipientEffectKey(item),
    ].join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const mergedGroups: FormationCardInteraction[][] = [];
  for (const group of grouped.values()) {
    const existing = mergedGroups.find((candidate) => canAggregateExactRecipientSet([...candidate, ...group]));
    if (existing) {
      existing.push(...group);
      continue;
    }
    mergedGroups.push([...group]);
  }
  return mergedGroups.flatMap((group) =>
    group.length > 1 && canAggregateExactRecipientSet(group)
      ? [mergeInteractions(group, 'provides', selectedIds, { exactRecipientSet: true })]
      : group,
  );
}

function mergeInteractions(
  items: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  selectedIds: ReadonlySet<string>,
  options: { exactRecipientSet?: boolean; preserveProviderExactRecipient?: boolean } = {},
): FormationCardInteraction {
  const first = items[0]!;
  const targetNames = unique(
    items.flatMap((item) =>
      item.targetLabel
        ? item.targetLabel.split(/\s+or\s+/)
        : item.recipientName
          ? [item.recipientName]
          : [],
    ),
  );
  const targetIds = unique(items.map((item) => item.recipientDragonId).filter((value): value is string => Boolean(value)));
  const targetLabel = options.exactRecipientSet
    ? groupedRecipientLabel(targetNames, targetIds, selectedIds)
    : targetNames.join(' or ');
  const selectedOrder = [...selectedIds];
  const providerNames = uniqueBy(
    items.map((item) => ({ id: item.sourceDragonId, name: item.sourceName })),
    (item) => item.id,
  )
    .sort((left, right) => selectedOrder.indexOf(left.id) - selectedOrder.indexOf(right.id))
    .map((item) => item.name);
  const providerLabel = direction === 'receives' && providerNames.length > 1
    ? groupedProviderLabel(providerNames)
    : first.sourceName;
  const uniqueTitles = unique(items.map((item) => item.title));
  const uniqueEffectTitles = unique(items.map((item) => item.effectTitle));
  const summaryLines = mergedSummaryLines(items, direction, targetNames, options);
  const exactRecipientText = options.exactRecipientSet && direction === 'provides'
    ? items.map(interactionText).join(' ')
    : null;
  const partialRecipientModifierLine = exactRecipientText
    ? synthesizePartialRecipientModifierLine(exactRecipientText, targetNames)
    : null;
  const exactRecipientScopeDetails = options.exactRecipientSet && direction === 'provides'
    ? synthesizedExactRecipientScopeDetailLines(items, targetNames, partialRecipientModifierLine)
    : [];
  const mergedDetailLines = unique([
    ...exactRecipientScopeDetails,
    ...items.flatMap((item) => (item.details.length > 0 ? item.details : [item.detail]))
      .flatMap(splitSentences),
    ...summaryLines.flatMap(splitSentences),
  ]
    .map((detail) => omitNormalCardSummarySentences(detail, summaryLines))
    .map(sanitizeNormalCardText)
    .filter((detail): detail is string => Boolean(detail)));
  const details = mergedDetailLines;
  const effects = sanitizeNormalCardEffects(items.flatMap((item) => item.effects), summaryLines);
  const mergedCandidateTotal =
    items.some((item) => item.isCandidate || item.candidateTotal !== null)
      ? (Math.max(...items.map((item) => item.candidateTotal ?? 0)) || first.candidateTotal)
      : null;
  const requirements = uniqueBy(
    items.flatMap((item) => item.requirements),
    (requirement) => [
      requirement.id,
      requirement.label,
      requirement.expected,
      requirement.actual ?? 'unknown',
      String(requirement.satisfied),
    ].join('|'),
  );
  const confidences = unique(items.map((item) => item.confidence));

  return {
    ...first,
    id: `aggregate__${items.map((item) => item.id).join('__')}`,
    relationshipId: options.exactRecipientSet
      ? `${first.sourceDragonId}__${first.abilityName}__${targetIds.join('_') || 'team'}`
      : first.relationshipId,
    sourceName: providerLabel,
    recipientDragonId: options.exactRecipientSet ? null : first.recipientDragonId,
    recipientName: options.exactRecipientSet ? targetLabel : first.recipientName,
    targetLabel: direction === 'provides' && targetNames.length > 0 && !options.preserveProviderExactRecipient ? targetLabel : first.targetLabel,
    effectTitle: mergedEffectTitle(first, uniqueEffectTitles, options),
    title: options.exactRecipientSet && uniqueTitles.length > 1 ? first.abilityName : uniqueTitles.join(' + '),
    summaryLines,
    summary: compactSummaryText(summaryLines, mergedCandidateTotal),
    detail: mergedDetailLines.join('\n\n'),
    details,
    effects,
    requirements,
    confidence: confidences.length === 1 ? confidences[0]! : 'mixed',
    modifierLines: unique(items.flatMap((item) => item.modifierLines)).filter((line) =>
      !shouldSuppressExactRecipientModifierLine(line, partialRecipientModifierLine),
    ),
    isCandidate: items.some((item) => item.isCandidate),
    candidateIndex: first.candidateIndex,
    candidateTotal: mergedCandidateTotal,
    targetSummary: unique(items.map((item) => item.targetSummary).filter((value): value is string => Boolean(value))).join(' | ') || null,
    isEnemyFacing: items.some((item) => item.isEnemyFacing),
    traceIds: unique(items.flatMap((item) => item.traceIds)),
    isRecipientModifier: items.every((item) => item.isRecipientModifier),
  };
}

function pruneSubsumedProviderInteractions(interactions: FormationCardInteraction[]): FormationCardInteraction[] {
  const buckets = new Map<string, FormationCardInteraction[]>();
  for (const interaction of interactions) {
    const key = [
      interaction.sourceDragonId,
      interaction.abilityName,
      interaction.effectTitle,
      interaction.state,
      interaction.isPreview ? 'preview' : 'current',
      interactionMechanicKey(interaction),
    ].join('|');
    buckets.set(key, [...(buckets.get(key) ?? []), interaction]);
  }

  const pruned = [...buckets.values()].flatMap((bucket) => {
    if (bucket.some((interaction) => /Enemy mitigation reduction/i.test(interaction.effectTitle))) {
      return bucket;
    }
    const signatures = bucket.map((interaction) => ({
      interaction,
      signature: providerRecipientSignature(interaction),
    }));
    return bucket.filter((interaction) => {
      const current = signatures.find((entry) => entry.interaction === interaction)?.signature;
      if (!current) {
        return true;
      }
      const keep = !signatures.some((entry) =>
        entry.interaction !== interaction &&
        entry.signature !== null &&
        providerSignatureSubsumes(entry.signature, current)
      );
      return keep;
    });
  });
  return pruneRedundantEnemyProviderCards(pruned);
}

function pruneRedundantEnemyProviderCards(interactions: FormationCardInteraction[]): FormationCardInteraction[] {
  return interactions.filter((interaction) => {
    if (!interaction.isEnemyFacing || interaction.targetLabel || interaction.recipientName) {
      return true;
    }
    return !interactions.some((candidate) =>
      candidate !== interaction &&
      candidate.sourceDragonId === interaction.sourceDragonId &&
      candidate.abilityName === interaction.abilityName &&
      candidate.state === interaction.state &&
      !candidate.isEnemyFacing &&
      recipientAwareCardExplainsEnemyProvider(interaction, candidate)
    );
  });
}

function recipientAwareCardExplainsEnemyProvider(
  provider: FormationCardInteraction,
  recipientAware: FormationCardInteraction,
): boolean {
  if (provider.effectTitle === recipientAware.effectTitle) {
    if (
      provider.presentationFamily === 'enemy-damage-received-increase' &&
      recipientAware.recipientDragonId !== null
    ) {
      return true;
    }
    return interactionMechanicKey(provider) === interactionMechanicKey(recipientAware);
  }
  const stat = enemyReductionStatFromTitle(provider.effectTitle);
  if (!stat || !/Enemy mitigation reduction/i.test(recipientAware.effectTitle)) {
    return false;
  }
  const expectedChannel = mitigationChannelLabelForStat(stat);
  return expectedChannel ? interactionText(recipientAware).includes(`supporting allied ${expectedChannel}`) : false;
}

function enemyReductionStatFromTitle(title: string): string | null {
  return title.match(/Enemy (Strength|Intelligence|Instinct|Initiative) reduction/i)?.[1] ?? null;
}

function mitigationChannelLabelForStat(stat: string): string | null {
  switch (stat.toLowerCase()) {
    case 'instinct':
      return 'Physical Damage';
    case 'intelligence':
      return 'Tactical Damage';
    case 'initiative':
      return 'Fire Damage';
    default:
      return null;
  }
}

function providerRecipientSignature(interaction: FormationCardInteraction): string | null {
  const label = interaction.targetLabel ?? interaction.recipientName ?? null;
  if (!label) {
    return null;
  }
  if (/^Team$/i.test(label)) {
    return 'team';
  }
  if (/candidate|unresolved/i.test(label)) {
    return null;
  }
  const names = label
    .split(/\s*(?:,|\band\b|\bor\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) {
    return null;
  }
  return [...new Set(names)].sort().join('|');
}

function providerSignatureSubsumes(left: string, right: string): boolean {
  if (left === right) {
    return false;
  }
  if (left === 'team') {
    return true;
  }
  if (right === 'team') {
    return false;
  }
  const leftNames = left.split('|');
  const rightNames = right.split('|');
  return leftNames.length > rightNames.length && rightNames.every((name) => leftNames.includes(name));
}

function mergedSummaryLines(
  items: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  targetNames: string[],
  options: { exactRecipientSet?: boolean; preserveProviderExactRecipient?: boolean } = {},
): string[] {
  const periodicStatusLines = compactPeriodicStatusDamageSummaryLines(items);
  if (periodicStatusLines.length > 0) {
    return periodicStatusLines;
  }
  const sharedStatusBenefitLines = compactSharedStatusRecipientBenefitSummaryLines(items);
  if (sharedStatusBenefitLines.length > 0) {
    return sharedStatusBenefitLines;
  }
  const lines = unique(items.flatMap((item) => item.summaryLines));
  if (options.exactRecipientSet && direction === 'provides') {
    return [
      `Applies to ${joinEnglishList(targetNames)}.`,
      ...synthesizedExactRecipientEffectLines(items, targetNames),
    ];
  }
  if (options.preserveProviderExactRecipient && direction === 'provides') {
    return lines;
  }
  if (direction === 'provides' && targetNames.length > 0) {
    if (items.some((item) => item.targetSelectionMode === 'all-matching-condition')) {
      return lines;
    }
    const sourceSelection = lines.find((line) => /recipient is selected/i.test(line));
    const rest = lines.filter((line) => line !== sourceSelection);
    return [
      sourceSelection ?? `One recipient is selected: ${targetNames.join(' or ')}.`,
      ...rest.map((line) =>
        /First-Strike.*Infernal Burst/i.test(line) && targetNames.includes('Caraxes')
          ? 'Caraxes may also receive First-Strike for Infernal Burst.'
          : line,
      ),
    ];
  }
  return lines;
}

function compactSharedStatusRecipientBenefitSummaryLines(items: FormationCardInteraction[]): string[] {
  if (items.length <= 1 || items.some((item) => sharedStatusRecipientBenefitKey(item) === null)) {
    return [];
  }
  const text = items.map(interactionText).join(' ');
  const status = items[0]!.title.match(/^(.+?) enables /i)?.[1]?.trim() ?? 'Status';
  const dependent = items[0]!.title.match(/ enables (.+)$/i)?.[1]?.trim() ?? 'dependent effect';
  const multiTargetSupplier = items.find((item) => /first added target|different second target/i.test(interactionText(item)));
  const singleTargetSupplier = items.find((item) => /odd-numbered rounds|one enemy within adjacency/i.test(interactionText(item)));
  const rateIncrease = text.match(/\bincreases from ([\d.]+%) to ([\d.]+%)/i);
  const base = text.match(/\bBase(?: current)? [A-Za-z ]+ Damage Rate: ([^.]+)\./i)?.[1]?.trim() ?? rateIncrease?.[1] ?? null;
  const enhanced = text.match(/\bEnhanced(?: current)? [A-Za-z ]+ Damage Rate: ([^.]+)\./i)?.[1]?.trim() ?? rateIncrease?.[2] ?? null;
  if (!multiTargetSupplier || !singleTargetSupplier || !base || !enhanced) {
    return [];
  }
  return [
    `${multiTargetSupplier.abilityName} attempts ${status} on Rounds 2, 5, and 8: 40% on the first added target and 20% on a different second target; ${status} lasts 2 rounds.`,
    `${singleTargetSupplier.abilityName} attempts ${status} on odd-numbered rounds: 20% chance on one enemy within adjacency; ${status} lasts 2 rounds.`,
    `Against the same otherwise-eligible ${status}ed enemy, ${dependent} Damage Rate increases from ${base} to ${enhanced}; prior-round ${status} may carry over, and same-round overlap requires the supplier to resolve before ${dependent}.`,
    'Supplier application success, eligible enemy identity, same-target overlap, and same-round action order remain unresolved.',
  ];
}

function enemyAllMatchingTargetSummary(summary: string, text: string): string {
  const capability = /non-Basic Physical Damage output/i.test(text)
    ? ' Requires non-Basic Physical Damage output capability.'
    : '';
  const count = summary.match(/up to \d+/i)?.[0] ?? 'up to 3';
  return `Targets all qualifying enemies in any lane, ${count}.${capability} Actual qualifying count and enemy identities remain unresolved.`;
}

function compactPeriodicStatusDamageSummaryLines(items: FormationCardInteraction[]): string[] {
  if (items.length === 0 || items.some((item) => !/periodic damage/i.test(item.effectTitle))) {
    return [];
  }
  const text = items.map(interactionText).join(' ');
  const status = items[0]!.effectTitle.match(/-\s*(.+?) periodic damage/i)?.[1]?.trim() ??
    items[0]!.title.match(/^(.+?) periodic/i)?.[1]?.trim() ??
    'Status';
  const ability = items[0]!.abilityName;
  const schedule = text.match(/Activation timing:\s*(Rounds? [^.]+)\./i)?.[1] ??
    text.match(/Timing:\s*(Rounds? [^.]+)\./i)?.[1] ??
    null;
  const duration = text.match(/Duration:\s*(\d+ rounds)\./i)?.[1] ?? null;
  const channel = text.match(new RegExp(`${escapeRegExp(status)} deals periodic ([A-Za-z ]+?) each round`, 'i'))?.[1]?.trim() ??
    text.match(/\bdeals periodic ([A-Za-z ]+?) each round/i)?.[1]?.trim() ??
    'damage';
  const chances = unique(items.flatMap((item) => interactionText(item).match(/Application chance for this status attempt:\s*[\d.]+%/gi) ?? [])
    .map((line) => line.match(/([\d.]+%)/)?.[1])
    .filter((value): value is string => Boolean(value)));
  const firstChance = chances[0] ?? text.match(/([\d.]+%) on the first added target/i)?.[1] ?? null;
  const secondChance = chances[1] ?? text.match(/([\d.]+%) on (?:a different|the) second added target/i)?.[1] ?? null;
  if (!schedule || !duration || !firstChance || !secondChance) {
    return [];
  }
  return [
    `On ${schedule}, ${ability} can apply ${status} to two added targets: ${firstChance} on the first and ${secondChance} on a different second target.`,
    `${status} deals periodic ${channel} each round for ${duration}; its Damage Rate is not stated.`,
    'Application success, first-tick timing, refresh or stack behavior, mitigation, and final damage remain unresolved.',
  ];
}

function synthesizedExactRecipientEffectLines(
  items: FormationCardInteraction[],
  targetNames: string[],
): string[] {
  const first = items[0]!;
  const text = items.map(interactionText).join(' ');
  const partialModifier = synthesizePartialRecipientModifierLine(text, targetNames);
  const withPartialModifier = (lines: string[]): string[] =>
    partialModifier ? [...lines, partialModifier] : lines;
  const enemyVulnerability = synthesizeEnemyVulnerabilityBenefitLine(first, text, targetNames);
  if (enemyVulnerability) {
    return withPartialModifier([enemyVulnerability]);
  }
  if (/Enemy .* vulnerability/i.test(first.effectTitle)) {
    const amount = text.match(/([-+]?\d+(?:\.\d+)?%)/)?.[1];
    if (amount) {
      const channel = /Physical/i.test(first.effectTitle)
        ? 'Physical Damage'
        : /Tactical/i.test(first.effectTitle)
          ? 'Tactical Damage'
          : 'Fire Damage';
      const scope = /non-Basic/i.test(text)
        ? `qualifying non-Basic ${channel} outputs`
        : `the formation's qualifying ${channel} outputs`;
      const recipientPrefix = targetNames.length > 1 ? '' : (targetNames.length > 0 ? `${joinEnglishList(targetNames)}: ` : '');
      return withPartialModifier([`${recipientPrefix}${scope} can benefit from +${amount} ${channel} Received on the selected enemy.`]);
    }
  }
  const defensiveStack = synthesizeDefensiveStackLine(first, text, targetNames);
  if (defensiveStack) {
    return withPartialModifier([defensiveStack]);
  }
  if (/Resilient Bond/i.test(text)) {
    const amount = text.match(/([-+]?\d+(?:\.\d+)?%)/)?.[1];
    if (amount) {
      const timing = text.match(/Timing: Start of combat\./i)?.[0] ?? 'Timing: Start of combat.';
      const duration = text.match(/Duration: until end of combat\./i)?.[0] ?? 'Duration: until end of combat.';
      const valueLine = /Physical/i.test(text)
        ? `Each stack reduces Physical Damage Received from non-Basic Attacks by ${amount}.`
        : `Each stack reduces Damage Received by ${amount}.`;
      return withPartialModifier([
        timing,
        `${joinEnglishList(targetNames)} each gain 1 Resilient Bond stack.`,
        valueLine,
        duration,
        'Maximum stack count is unknown.',
      ]);
    }
  }
  const damageReceivedSupport = synthesizeDamageReceivedSupportLine(first, text, targetNames);
  if (damageReceivedSupport) {
    return withPartialModifier([damageReceivedSupport]);
  }
  const grouped = new Map<string, FormationCardInteraction[]>();
  for (const item of items) {
    const key = exactRecipientEffectKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return unique([...grouped.values()].flatMap((group) => {
    const first = group[0]!;
    const text = group.map(interactionText).join(' ');
    const impairment = synthesizeFriendlyImpairmentLine(first, text, targetNames);
    if (impairment) {
      return withPartialModifier([impairment]);
    }
    const defensiveStack = synthesizeDefensiveStackLine(first, text, targetNames);
    if (defensiveStack) {
      return withPartialModifier([defensiveStack]);
    }
    const damageReceivedSupport = synthesizeDamageReceivedSupportLine(first, text, targetNames);
    if (damageReceivedSupport) {
      return withPartialModifier([damageReceivedSupport]);
    }
    const damageDealtSupport = synthesizeDamageDealtSupportLine(first, text, targetNames);
    if (damageDealtSupport) {
      return withPartialModifier([damageDealtSupport]);
    }
    const enemyVulnerability = synthesizeEnemyVulnerabilityBenefitLine(first, text, targetNames);
    if (enemyVulnerability) {
      return withPartialModifier([enemyVulnerability]);
    }
    const summaryLines = unique(group.flatMap((item) => item.summaryLines));
    return withPartialModifier(summaryLines.map((line) => normalizeGroupedRecipientLine(line, targetNames)));
  }));
}

function synthesizePartialRecipientModifierLine(
  text: string,
  targetNames: string[],
): string | null {
  const modifierMatch = text.match(
    /Amplified by ([^']+)'s ([^:]+):\s*([A-Za-z ]+?)\s+\+([-+]?\d+(?:\.\d+)?%?)\./i,
  );
  if (!modifierMatch) {
    return null;
  }
  const sourceName = modifierMatch[1]!.trim();
  const abilityName = modifierMatch[2]!.trim();
  const modifierLabel = modifierMatch[3]!.trim();
  const amount = modifierMatch[4]!.trim();
  const affectedTargets = targetNames.filter((name) => name !== sourceName);
  if (affectedTargets.length === 0 || affectedTargets.length === targetNames.length) {
    return null;
  }
  return `${joinEnglishList(affectedTargets)} receive +${amount} ${modifierLabel} from ${abilityName}; ${sourceName} does not receive this modifier.`;
}

function synthesizedExactRecipientScopeDetailLines(
  items: FormationCardInteraction[],
  targetNames: string[],
  partialRecipientModifierLine: string | null,
): string[] {
  const first = items[0]!;
  const lines = [`${first.sourceName}'s ${first.abilityName} provides Recovery to ${joinEnglishList(targetNames)}.`];
  if (!partialRecipientModifierLine) {
    return lines;
  }
  const match = partialRecipientModifierLine.match(
    /^(.+?) receive \+([-+]?\d+(?:\.\d+)?%?) ([^;]+?) from ([^;]+); (.+) does not receive this modifier\.$/i,
  );
  if (!match) {
    return lines;
  }
  const recipients = match[1]!.trim();
  const amount = match[2]!.trim();
  const modifierLabel = match[3]!.trim();
  const abilityName = match[4]!.trim();
  const excludedRecipient = match[5]!.trim();
  lines.push(`${recipients} each receive +${amount} ${modifierLabel} from ${abilityName}.`);
  lines.push(`${excludedRecipient} does not receive this modifier because the caster is excluded.`);
  return lines;
}

function shouldSuppressExactRecipientModifierLine(
  line: string,
  partialRecipientModifierLine: string | null,
): boolean {
  if (!partialRecipientModifierLine) {
    return false;
  }
  const genericMatch = line.match(
    /^Amplified by ([^']+)'s ([^:]+):\s*([A-Za-z ]+?)\s+\+([-+]?\d+(?:\.\d+)?%?)\./i,
  );
  if (!genericMatch) {
    return false;
  }
  const scopedMatch = partialRecipientModifierLine.match(
    /^(.+?) receive \+([-+]?\d+(?:\.\d+)?%?) ([^;]+?) from ([^;]+); (.+) does not receive this modifier\.$/i,
  );
  if (!scopedMatch) {
    return false;
  }
  const scopedAmount = scopedMatch[2]!.trim();
  const scopedLabel = scopedMatch[3]!.trim();
  const scopedAbility = scopedMatch[4]!.trim();
  return genericMatch[2]!.trim() === scopedAbility &&
    genericMatch[3]!.trim() === scopedLabel &&
    genericMatch[4]!.trim() === scopedAmount;
}

function receivesInteractionMechanicKey(interaction: FormationCardInteraction): string {
  if (
    interaction.abilityName === 'Blazing Fury' &&
    (interaction.targetSelectionMode !== null || /First-Strike enables Infernal Burst/i.test(interaction.title))
  ) {
    return 'blazing-fury-recipient-combo';
  }
  return interactionMechanicKey(interaction);
}

function synthesizeDamageReceivedSupportLine(
  item: FormationCardInteraction,
  text: string,
  targetNames: string[],
): string | null {
  if (!/Damage Received support|Damage Received reduction/i.test(text) || /Grants 1 .+ stack/i.test(text)) {
    return null;
  }
  const damageLabel = item.damageScope && item.damageScope !== 'all'
    ? `${formatToken(item.damageScope)} Damage Received`
    : 'Damage Received';
  const value = text.match(/Damage Received decrease ([-+]?\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/Damage Received reduction: ([-+]?\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/reduce(?:s|d)? .*?Damage Received by ([-+]?\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/([-+]?\d+(?:\.\d+)?%?)/)?.[1];
  if (!value) {
    return null;
  }
  const evidence = [text, ...item.details, ...item.effects].join(' ');
  const timing = text.match(/Timing: [^.]+\./i)?.[0] ?? null;
  const statLine = evidence.match(/\b(Strength|Intelligence|Instinct|Initiative)\s+\+([-+]?\d+(?:\.\d+)?%?)/i);
  const activationChance = evidence.match(/\b(?:status application chance|activation chance)\s*:?\s*([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
    ?? evidence.match(/\b([-+]?\d+(?:\.\d+)?%?) chance\b/i)?.[1]
    ?? null;
  const threshold = evidence.match(/\b(above|below) 50% Troop Capacity\b/i)?.[1]?.toLowerCase() ?? null;
  const branchLine = threshold
    ? `Each recipient ${threshold} 50% Troop Capacity may receive Resistance, reducing ${damageLabel} by ${value}.`
    : `${item.abilityName} reduces ${damageLabel} for ${joinEnglishList(targetNames)} by ${value}.`;
  const duration = text.match(/Duration: [^.]+\./i)?.[0] ?? null;
  return [
    branchLine,
    statLine ? `${statLine[1]} +${statLine[2]}.` : null,
    activationChance ? `Activation chance: ${activationChance}.` : null,
    timing,
    duration,
  ].filter(Boolean).join(' ');
}

function synthesizeDamageDealtSupportLine(
  item: FormationCardInteraction,
  text: string,
  targetNames: string[],
): string | null {
  if (!/Damage Dealt support|Damage Dealt increase/i.test(text) || /Grants 1 .+ stack/i.test(text)) {
    return null;
  }
  const value = text.match(/Damage Dealt increase ([-+]?\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/increase .*?Damage Dealt by ([-+]?\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/([-+]?\d+(?:\.\d+)?%?)/)?.[1];
  if (!value) {
    return null;
  }
  const evidence = [text, ...item.details, ...item.effects].join(' ');
  const timing = text.match(/Timing: [^.]+\./i)?.[0] ?? null;
  const activationChance = evidence.match(/\b(?:status application chance|activation chance)\s*:?\s*([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
    ?? evidence.match(/\b([-+]?\d+(?:\.\d+)?%?) chance\b/i)?.[1]
    ?? null;
  const threshold = evidence.match(/\b(above|below) 50% Troop Capacity\b/i)?.[1]?.toLowerCase() ?? null;
  const branchLine = threshold
    ? `Each recipient ${threshold} 50% Troop Capacity may receive Advantage, increasing Damage Dealt by ${value}.`
    : `${item.abilityName} increases Damage Dealt for ${joinEnglishList(targetNames)} by ${value}.`;
  const duration = text.match(/Duration: [^.]+\./i)?.[0] ?? null;
  return [
    branchLine,
    activationChance ? `Activation chance: ${activationChance}.` : null,
    timing,
    duration,
  ].filter(Boolean).join(' ');
}

function synthesizeDefensiveStackLine(
  item: FormationCardInteraction,
  text: string,
  targetNames: string[],
): string | null {
  if (!/Damage Received support|Damage Received reduction/i.test(text) || !/Grants 1 .+ stack/i.test(text)) {
    return null;
  }
  const stackName = text.match(/Grants 1 ([^.]+ stack)\./i)?.[1] ?? 'stack';
  const value = text.match(/(Physical|Tactical|Fire)?\s*Damage Received reduction: ([-+]?\d+(?:\.\d+)?%?(?: at effective Habit Level \d+)?)/i) ??
    text.match(/(Physical|Tactical|Fire)?\s*Damage Received decrease ([-+]?\d+(?:\.\d+)?%?(?: at effective Habit Level \d+)?)/i);
  const fallbackPercent = text.match(/([-+]?\d+(?:\.\d+)?%?)/)?.[1] ?? null;
  const fallbackValue = value ?? (fallbackPercent ? [null, null, fallbackPercent] as unknown as RegExpMatchArray : null);
  const scope = text.match(/(Physical|Tactical|Fire)?\s*Damage Received reduction applies to non-Basic Attacks only\./i);
  const timing = text.match(/Timing: Start of combat\./i)?.[0] ?? null;
  const duration = text.match(/Duration: until end of combat\./i)?.[0] ?? null;
  const maximum = /Maximum stack count is not verified\./i.test(text)
    ? 'Maximum stack count is unknown.'
    : null;
  if (!fallbackValue) {
    return null;
  }
  const matched = fallbackValue;
  const damageType = matched[1] ? `${matched[1]} Damage Received` : 'Damage Received';
  return [
    timing,
    `${joinEnglishList(targetNames)} each gain 1 ${stackName}.`,
    `Each stack reduces ${damageType} from ${scope ? 'non-Basic Attacks' : 'qualifying sources'} by ${matched[2]}.`,
    duration,
    maximum,
  ].filter(Boolean).join(' ');
}

function synthesizeFriendlyImpairmentLine(
  item: FormationCardInteraction,
  text: string,
  targetNames: string[],
): string | null {
  if (!/allied impairment|friendly impairment|can harm/i.test(text)) {
    return null;
  }
  const value =
    text.match(/reducing Damage Dealt by ([-+]?\d+(?:\.\d+)?%?)\./i)?.[1] ??
    text.match(/Damage Dealt reduction at current effective level: ([-+]?\d+(?:\.\d+)?%?)\./i)?.[1];
  if (!value) {
    return null;
  }
  const timing = text.match(/Timing: Start of Round \d+\./i)?.[0] ?? null;
  const duration = text.match(/Duration: \d+ rounds\./i)?.[0] ?? null;
  return [
    `${item.abilityName} can harm ${joinEnglishList(targetNames)} by reducing Damage Dealt by ${value}.`,
    'This is an allied impairment, not support.',
    timing,
    duration,
  ].filter(Boolean).join(' ');
}

function synthesizeEnemyVulnerabilityBenefitLine(
  item: FormationCardInteraction,
  text: string,
  targetNames: string[],
): string | null {
  if (!/Enemy .* vulnerability/i.test(item.effectTitle) || !/can benefit/i.test(text)) {
    return null;
  }
  const value = text.match(/\b(Physical|Tactical|Fire) Damage Received \+([-+]?\d+(?:\.\d+)?%?)/i) ??
    text.match(/\b([-+]?\d+(?:\.\d+)?%?)\s+(Physical|Tactical|Fire) Damage Received\b/i) ??
    text.match(/\+([-+]?\d+(?:\.\d+)?%?)\s+(Physical|Tactical|Fire) Damage Received/i) ??
    text.match(/\b(Physical|Tactical|Fire) Damage Received increase ([-+]?\d+(?:\.\d+)?%?)/i) ??
    text.match(/\b(Physical|Tactical|Fire) Damage Received decrease ([-+]?\d+(?:\.\d+)?%?)/i) ??
    text.match(/\b(?:increases?|reduces?) .*?Damage Received by ([-+]?\d+(?:\.\d+)?%?)/i) ??
    text.match(/([-+]?\d+(?:\.\d+)?%?)/i);
  if (!value) {
    return null;
  }
  const channel = /^[A-Za-z]+$/.test(value[1]!) ? `${value[1]!} Damage` : `${value[2]!} Damage`;
  const amount = /^[A-Za-z]+$/.test(value[1]!) ? value[2]! : value[1]!;
  const scope = /non-Basic/i.test(text)
    ? `qualifying non-Basic ${channel} outputs`
    : `the formation's qualifying ${channel} outputs`;
  const duration = text.match(/Duration: \d+ rounds\./i)?.[0] ?? null;
  const basicExclusion = /non-Basic/i.test(text) ? 'Basic Attacks do not qualify.' : null;
  const recipientPrefix = targetNames.length > 1 ? '' : (targetNames.length > 0 ? `${joinEnglishList(targetNames)}: ` : '');
  const allMatchingThreshold = text.match(/Applies to all enemies currently (?:above|below) \d+(?:\.\d+)?% maximum Troop Capacity\./i)?.[0] ?? null;
  const sourceScope = /non-Basic/i.test(text)
    ? `Applies to non-Basic ${channel} only.`
    : `Applies to all qualifying ${channel} sources.`;
  if (/all-matching-condition|all matching enemies|all enemies currently/i.test(text)) {
    return [
      `${recipientPrefix}${scope} can benefit from +${amount} ${channel} Received on an affected enemy.`,
      basicExclusion,
      sourceScope,
      allMatchingThreshold,
      'The allied attack must hit one of the affected enemies.',
      'Enemy threshold membership and allied target overlap are not guaranteed.',
      duration,
    ].filter(Boolean).join(' ');
  }
  return [
    `${recipientPrefix}${scope} can benefit from +${amount} ${channel} Received on the selected enemy.`,
    basicExclusion,
    'The allied attack must hit that same vulnerable enemy.',
    'Enemy target selection and target overlap are not guaranteed.',
    duration,
  ].filter(Boolean).join(' ');
}

function interactionText(item: FormationCardInteraction): string {
  return [
    item.title,
    item.summary,
    ...item.summaryLines,
    item.detail,
    ...item.details,
    ...item.effects,
  ].join(' ');
}

function interactionMechanicKey(interaction: FormationCardInteraction): string {
  const text = interactionText(interaction);
  const sharedActivationGroup = text.match(/Shared activation group:\s*([A-Za-z0-9-]+)/i)?.[1] ?? null;
  if (sharedActivationGroup && !interaction.isEnemyFacing && isSharedActivationPresentationInteraction(interaction)) {
    return [
      'shared-activation',
      sharedActivationGroup,
      interaction.state,
      text.match(/Timing:\s*[^.]+\./i)?.[0] ?? '',
      text.match(/Duration:\s*[^.]+\./i)?.[0] ?? '',
    ].join('::');
  }
  if (
    interaction.abilityName === 'Blazing Fury' &&
    (interaction.targetSelectionMode !== null || /First-Strike enables Infernal Burst/i.test(interaction.title))
  ) {
    return 'blazing-fury-recipient-combo';
  }
  if (interaction.targetSelectionMode && (interaction.targetLabel || interaction.candidateTotal !== null || interaction.isCandidate)) {
    return [
      'target-selection',
      interaction.targetSelectionMode,
      interaction.targetLabel ?? '',
      interaction.targetSummary ?? '',
      interaction.state,
    ].join('::');
  }
  if (interaction.targetSummary?.includes('shared group ') && !/Grants 1 .+ stack/i.test(text)) {
    return [
      'shared-target',
      interaction.targetSummary,
      interaction.state,
    ].join('::');
  }
  if (/Enemy .* vulnerability/i.test(interaction.effectTitle) || /vulnerability/i.test(interaction.title)) {
    return [
      interaction.effectTitle,
      interaction.title,
      interaction.effects
        .filter((effect) => !/^\w+'s qualifying/i.test(effect))
        .filter((effect) => /source scope|non-basic|all qualifying|Damage Received|\+|Duration/i.test(effect))
        .map(semanticEffectDetailKey)
        .join('|'),
    ].join('::');
  }
  if (/Enemy mitigation reduction/i.test(interaction.effectTitle)) {
    const lowered = text.match(/Lowers enemy (Instinct|Initiative|Intelligence|Strength), supporting allied ([A-Za-z ]+)\./i);
    return [
      interaction.effectTitle,
      lowered?.[1] ?? interaction.title,
      lowered?.[2] ?? '',
      interaction.state,
    ].join('::');
  }
  const hasDistinctStatusMechanic = /Base .* Rate|Enhanced .* Rate|application chance|target-specific conditional chance|same target/i.test(text);
  if (
    hasDistinctStatusMechanic &&
    (/enables/i.test(interaction.title) || /conditional status enablement/i.test(interaction.effectTitle))
  ) {
    return [
      interaction.title,
      interaction.effectTitle,
      interaction.summary,
      interaction.effects.join('|'),
    ].join('::');
  }
  if (interaction.effectTitle.includes('Stat support')) {
    return [
      'stat-support',
      text.match(/Timing:\s*[^.]+\./i)?.[0] ?? '',
      text.match(/Duration:\s*[^.]+\./i)?.[0] ?? '',
      interaction.state,
    ].join('::');
  }
  return 'default';
}

function mergeExactRecipientStatSupportInteractions(
  interactions: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  selectedIds: ReadonlySet<string>,
): FormationCardInteraction[] {
  const grouped = new Map<string, FormationCardInteraction[]>();
  const passthrough: FormationCardInteraction[] = [];
  for (const interaction of interactions) {
    if (
      !/Stat support/i.test(interaction.effectTitle) ||
      interaction.isCandidate ||
      interaction.candidateTotal !== null ||
      interaction.targetLabel !== null ||
      (!interaction.recipientDragonId && !interaction.recipientName)
    ) {
      passthrough.push(interaction);
      continue;
    }
    const recipientKey = interaction.recipientDragonId ?? interaction.recipientName ?? 'team';
    const key = [
      interaction.sourceDragonId,
      interaction.abilityName,
      recipientKey,
      interaction.isPreview ? 'preview' : 'current',
      direction,
    ].join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), interaction]);
  }
  return [
    ...passthrough,
    ...[...grouped.values()].map((items) =>
      items.length > 1 ? mergeInteractions(items, direction, selectedIds, { preserveProviderExactRecipient: true }) : items[0]!,
    ),
  ];
}

function mergedEffectTitle(
  first: FormationCardInteraction,
  uniqueEffectTitles: string[],
  options: { exactRecipientSet?: boolean; preserveProviderExactRecipient?: boolean },
): string {
  if (uniqueEffectTitles.length === 1) {
    return uniqueEffectTitles[0]!;
  }
  if (uniqueEffectTitles.every((title) => /Stat support/i.test(title))) {
    return `${first.abilityName} - Stat support`;
  }
  if (uniqueEffectTitles.every((title) => /\benhances .+ (?:damage rate|Physical Damage|Tactical Damage|Fire Damage)\b/i.test(title))) {
    const suffixes = uniqueEffectTitles
      .map(sharedEnhancementTitleSuffix)
      .filter((value): value is string => Boolean(value));
    if (suffixes.length === uniqueEffectTitles.length && suffixes.every((suffix) => suffix === suffixes[0])) {
      return suffixes[0]!;
    }
  }
  if (options.exactRecipientSet || options.preserveProviderExactRecipient) {
    const sharedPrefix = commonAbilityEffectPrefix(first.abilityName, uniqueEffectTitles);
    if (sharedPrefix) {
      return sharedPrefix;
    }
  }
  return first.abilityName;
}

function commonAbilityEffectPrefix(abilityName: string, titles: string[]): string | null {
  const matching = titles.filter((title) => title.startsWith(`${abilityName} - `));
  if (matching.length !== titles.length) {
    return null;
  }
  const suffixes = matching.map((title) => title.slice(abilityName.length + 3));
  return suffixes.every((suffix) => suffix === suffixes[0]) ? `${abilityName} - ${suffixes[0]}` : null;
}

function isUnresolvedCandidateSpecificConsequence(trace: SynergyTrace): boolean {
  return trace.ruleId === 'stat-scaling-support' &&
    trace.assumptions.some((assumption) => /Recipient selection is unresolved/i.test(assumption));
}

function isVisibleSharedActivationStatusSourceTrace(trace: SynergyTrace, traces: SynergyTrace[]): boolean {
  const group = sharedActivationGroupForTrace(trace);
  return Boolean(group && trace.recipientDragonId && traces.some((candidate) =>
    candidate !== trace &&
    candidate.sourceDragonId === trace.sourceDragonId &&
    candidate.sourceAbilityId === trace.sourceAbilityId &&
    candidate.recipientDragonId === trace.recipientDragonId &&
    candidate.ruleId === 'direct-stat-support' &&
    sharedActivationGroupForTrace(candidate) === group
  ));
}

function isSharedActivationPresentationTrace(trace: SynergyTrace): boolean {
  return trace.ruleId === 'direct-stat-support' ||
    trace.ruleId === 'status-source-output' ||
    trace.ruleId === 'status-condition-enablement';
}

function sharedActivationGroupForTrace(trace: SynergyTrace): string | null {
  return [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions]
    .join(' ')
    .match(/Shared activation group:\s*([A-Za-z0-9-]+)/i)?.[1] ?? null;
}

function isSharedActivationPresentationInteraction(interaction: FormationCardInteraction): boolean {
  return /Stat support|source|enables|condition/i.test(interaction.effectTitle);
}


function providesAggregationMode(interaction: FormationCardInteraction): string {
  if (interaction.targetLabel || interaction.candidateTotal !== null || interaction.isCandidate) {
    return 'target-selection';
  }
  if (interaction.recipientDragonId && !interaction.isEnemyFacing) {
    return 'exact-recipient';
  }
  return 'single';
}

function canAggregateExactRecipientSet(items: FormationCardInteraction[]): boolean {
  if (
    items.some((item) =>
      item.isCandidate ||
      item.candidateTotal !== null ||
      item.targetLabel !== null ||
      item.isEnemyFacing ||
      !item.recipientDragonId
    )
  ) {
    return false;
  }
  const titles = unique(items.map((item) => item.title));
  const families = unique(items.map((item) => item.presentationFamily));
  if (families.length > 1) {
    return false;
  }
  if (
    titles.length > 1 &&
    !isCompatibleFriendlyImpairmentRecoveryGroup(items) &&
    !isCompatibleEnemyMitigationReductionGroup(items) &&
    !isCompatibleStatSupportGroup(items) &&
    !isCompatibleSharedSelectedTargetGroup(items)
  ) {
    return false;
  }
  if (isCompatibleStatSupportGroup(items)) {
    return unique(items.map((item) => item.sourceDragonId)).length === 1 &&
      unique(items.map((item) => item.abilityName)).length === 1;
  }

  const recipientsByEffect = new Map<string, Set<string>>();
  for (const item of items) {
    const recipientId = item.recipientDragonId;
    if (!recipientId) {
      return false;
    }
    const key = exactRecipientEffectKey(item);
    const recipients = recipientsByEffect.get(key) ?? new Set<string>();
    recipients.add(recipientId);
    recipientsByEffect.set(key, recipients);
  }
  const recipientSets = [...recipientsByEffect.values()].map((recipients) => [...recipients].sort().join('|'));
  return recipientSets.length > 0 && recipientSets.every((set) => set === recipientSets[0]);
}

function isCompatibleStatSupportGroup(items: FormationCardInteraction[]): boolean {
  return items.every((item) => /Stat support/i.test(item.effectTitle));
}

function isCompatibleEnemyMitigationReductionGroup(items: FormationCardInteraction[]): boolean {
  return items.every((item) =>
    /Enemy mitigation reduction/i.test(item.effectTitle) &&
    /Lowers enemy (Instinct|Initiative|Intelligence|Strength), supporting allied/i.test(interactionText(item)),
  );
}

function isCompatibleFriendlyImpairmentRecoveryGroup(items: FormationCardInteraction[]): boolean {
  const textByItem = items.map((item) => [
    item.title,
    item.summary,
    ...item.summaryLines,
    ...item.effects,
    ...item.details,
  ].join(' '));
  return (
    textByItem.some((text) => /Recovery Rate|Recovery support/i.test(text)) &&
    textByItem.some((text) => /friendly impairment|Damage Dealt reduction|harm/i.test(text))
  );
}

function isCompatibleSharedSelectedTargetGroup(items: FormationCardInteraction[]): boolean {
  const summaries = unique(items.map((item) => item.targetSummary).filter((value): value is string => Boolean(value)));
  return summaries.length === 1 && /shared group /i.test(summaries[0] ?? '');
}

function exactRecipientEffectKey(item: FormationCardInteraction): string {
  if (/Stat support/i.test(item.effectTitle)) {
    return [
      item.presentationFamily,
      item.effectTitle,
      item.status,
      item.isPreview ? 'preview' : 'current',
      item.isEnemyFacing ? 'enemy' : 'friendly',
    ].join('::');
  }
  return [
    item.presentationFamily,
    item.effectTitle,
    item.title,
    item.status,
    item.isPreview ? 'preview' : 'current',
    item.isEnemyFacing ? 'enemy' : 'friendly',
  ].join('::');
}

function groupedRecipientLabel(
  targetNames: string[],
  targetIds: string[],
  selectedIds: ReadonlySet<string>,
): string {
  const uniqueTargetIds = unique(targetIds);
  const uniqueTargetNames = unique(targetNames);
  if (
    uniqueTargetIds.length > 0 &&
    uniqueTargetIds.every((id) => selectedIds.has(id)) &&
    uniqueTargetIds.length === selectedIds.size &&
    uniqueTargetNames.length === selectedIds.size
  ) {
    return 'Team';
  }
  return joinEnglishList(uniqueTargetNames);
}

function groupedProviderLabel(names: string[]): string {
  const uniqueNames = unique(names);
  if (uniqueNames.length >= 3) {
    return 'Team';
  }
  return joinEnglishList(uniqueNames);
}

function normalizeGroupedRecipientLine(line: string, targetNames: string[]): string {
  let normalized = line;
  for (const name of targetNames) {
    normalized = normalized
      .replace(new RegExp(`\\s+for ${escapeRegExp(name)}\\.`, 'g'), '.');
  }
  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactSummaryText(summaryLines: string[], candidateTotal: number | null): string {
  const dedupedLines = dedupeRepeatedTargetFactSummaryLines(summaryLines);
  const text = [
    ...dedupedLines,
    candidateTotal && candidateTotal > 1 ? 'Target not guaranteed.' : null,
  ].filter(Boolean).join(' ');
  return stripRedundantTargetFactSuffix(text);
}

function dedupeRepeatedTargetFactSummaryLines(summaryLines: string[]): string[] {
  const lines: string[] = [];
  const seenTargetFacts = new Set<string>();
  for (const line of summaryLines) {
    const targetFact = targetFactSignature(line);
    if (targetFact) {
      if (seenTargetFacts.has(targetFact)) {
        continue;
      }
      seenTargetFacts.add(targetFact);
    }
    lines.push(line);
  }
  return lines;
}

function targetFactSignature(line: string): string | null {
  const normalized = normalizeText(line);
  const countMatch = normalized.match(/(?:target count:\s*|targets?\s+)(\d+)\b/i) ?? normalized.match(/(\d+)\s+(?:adjacent\s+)?enemy targets?\b/i);
  if (!countMatch) {
    return null;
  }
  const count = countMatch[1];
  const isEnemy = /enemy/.test(normalized);
  const isAlly = /ally|allies|team/.test(normalized);
  const scope = /adjacent|within adjacency/.test(normalized) ? 'adjacent' : 'generic';
  if (!isEnemy && !isAlly) {
    return null;
  }
  return `${isEnemy ? 'enemy' : 'ally'}:${count}:${scope}`;
}

function stripRedundantTargetFactSuffix(text: string): string {
  const match = text.match(/\s+(Targets?\s+\d+(?:\s+(?:adjacent\s+)?)?(?:enemy|ally|allies|team)\s+targets?\.)$/i);
  if (!match) {
    return text;
  }
  const suffix = match[1]!;
  const prefix = text.slice(0, -match[0].length);
  const suffixText = normalizeText(suffix.replace(/^Targets?\s+/i, '').replace(/\.$/, ''));
  if (normalizeText(prefix).includes(suffixText)) {
    return prefix;
  }
  return text;
}

function dedupeInteractions(interactions: FormationCardInteraction[]): FormationCardInteraction[] {
  const byKey = new Map<string, FormationCardInteraction>();
  for (const interaction of interactions) {
    const key = [
      interaction.relationshipId,
      interaction.abilityName,
      interaction.summary,
      interaction.modifierLines.join('|'),
      interaction.state,
      interaction.isCandidate ? 'candidate' : 'direct',
      interaction.presentationFamily.includes('periodic') ? interaction.traceId : '',
    ].join('|');
    if (!byKey.has(key)) {
      byKey.set(key, interaction);
    }
  }
  return [...byKey.values()];
}

function isRedundantBlockedTraitTrace(trace: SynergyTrace, source: Dragon, previewEnabled: boolean): boolean {
  if (source.trait?.id !== trace.sourceAbilityId || traceState(trace, previewEnabled) !== 'blocked') {
    return false;
  }
  if (trace.recipientModifierType) {
    return false;
  }
  return trace.requirements.some(
    (requirement) =>
      requirement.satisfied === false &&
      /position requirement|provider position requirement|position compatibility/i.test(requirement.label),
  );
}

function interactionEffectTitle(abilityName: string, trace: SynergyTrace, summaryLines: string[] = []): string {
  const purpose = interactionPurpose(trace, summaryLines);
  return purpose ? `${abilityName} - ${purpose}` : abilityName;
}

function interactionPurpose(trace: SynergyTrace, summaryLines: string[] = []): string | null {
  const statusSourcePurpose = statusSourceInteractionPurpose(trace);
  if (statusSourcePurpose) {
    return statusSourcePurpose;
  }
  if (isStackSupportTrace(trace) && trace.channel) {
    const hasStackScaling = trace.effects.some((effect) => /Shared stack pool:|Value per stack at effective Habit Level/i.test(effect));
    return `${supportChannelLabel(trace)}${hasStackScaling ? ' stack' : ''} support`;
  }
  if (isAllMatchingTargetSelection(trace) && trace.channel) {
    return `${supportChannelLabel(trace)} support`;
  }
  if (trace.targetSelectionGroup && trace.channel) {
    return `${supportChannelLabel(trace)} support`;
  }
  if (/First-Strike enables Infernal Burst/i.test(trace.title)) {
    return 'First-Strike support';
  }
  if (/Slow enables Strategic Revival/i.test(trace.title)) {
    return 'Slow support';
  }
  if (trace.matchKind === 'enemy-mitigation-reduction') {
    return 'Enemy mitigation reduction';
  }
  if (trace.matchKind === 'enemy-damage-dealt-reduction') {
    return enemyReductionPurpose(trace);
  }
  if (trace.matchKind === 'enemy-damage-received-increase') {
    return `Enemy ${formatToken(trace.channel ?? 'damage-dealt')} vulnerability`;
  }
  if (trace.matchKind === 'periodic-status-damage') {
    const status = trace.title.match(/^(.+?) periodic/i)?.[1]?.trim() ??
      trace.matchedFacts.find((fact) => /Status identity:/i.test(fact))?.replace(/Status identity:\s*/i, '').replace(/\.$/, '');
    return `${status ? `${formatStatusName(status)} ` : ''}periodic damage`;
  }
  if (trace.matchKind === 'extra-basic-attack-trigger') {
    return 'Extra Basic Attack trigger';
  }
  if (trace.matchKind === 'status-condition-enablement') {
    const match = trace.title.match(/^(.+?) enables (.+)$/i);
    if (match) {
      const status = match[1]!;
      const ability = match[2]!;
      const metric = dependentMetricTitleNoun(trace, summaryLines);
      return `${status} enhances ${ability}${metric ? ` ${metric}` : ''}`;
    }
    return 'Conditional status enablement';
  }
  if (trace.matchKind === 'status-removal') {
    return 'Control cleanse';
  }
  if (trace.matchKind === 'friendly-impairment') {
    return `Allied ${formatToken(trace.channel ?? 'damage-dealt')} reduction`;
  }
  if (/Recovery Received Support/i.test(trace.title)) {
    return 'Recovery Received support';
  }
  if (trace.matchKind === 'incoming-effect-amplification' && trace.recipientModifierType) {
    if (trace.channel === 'recovery' || /recovery/i.test(trace.recipientModifierType)) {
      return 'Recovery support';
    }
    if (trace.channel === 'damage-dealt' || /damage dealt/i.test(trace.recipientModifierType)) {
      return 'Allied Damage Dealt reduction';
    }
    return `${formatToken(trace.channel ?? 'recovery')} support`;
  }
  if (trace.channel === 'stat') {
    return 'Stat support';
  }
  if (trace.channel === 'damage-received') {
    return `${supportChannelLabel(trace)} support`;
  }
  if (trace.channel) {
    return `${formatToken(trace.channel)} support`;
  }
  return trace.title === 'Stat Support' ? 'Stat support' : trace.title || null;
}

function dependentMetricTitleNoun(trace: SynergyTrace, summaryLines: string[] = []): string | null {
  const dependentText = [
    trace.explanation,
    ...trace.matchedFacts,
    ...trace.effects,
    ...summaryLines,
  ].join(' ');
  if (/\b(?:Base current|Enhanced current|Base|Enhanced)\s+(?:Physical|Tactical|Fire) Damage Rate\b|Damage Rate/i.test(dependentText)) {
    return 'damage rate';
  }
  if (trace.matchKind === 'status-condition-enablement' && trace.channel && trace.channel !== 'status') {
    return 'damage rate';
  }
  if (/application chance|target-specific conditional chance|Current application chance/i.test(dependentText)) {
    return 'chance';
  }
  if (/\b(?:Physical|Tactical|Fire) Damage\b/i.test(dependentText) && trace.channel && trace.channel !== 'status') {
    return formatToken(trace.channel);
  }
  if (/duration/i.test(dependentText)) {
    return 'duration';
  }
  return null;
}

function statusSourceInteractionPurpose(trace: SynergyTrace): string | null {
  if (trace.ruleId !== 'status-source-output' && trace.ruleId !== 'self-status-output') {
    return null;
  }
  const titleStatus = trace.title.match(/-\s*(?:Self\s+)?(.+?)\s+(?:attempt|source)?$/i)?.[1]?.trim();
  const status = titleStatus || trace.matchedFacts.find((fact) => /Status identity:/i.test(fact))?.replace(/Status identity:\s*/i, '').replace(/\.$/, '');
  if (!status) {
    return null;
  }
  const targetSide = trace.targetSelectorSummary?.split(';')[0]?.trim() ?? (trace.ruleId === 'self-status-output' ? 'self' : '');
  if (targetSide === 'ally') {
    return `${formatStatusName(status)} support`;
  }
  return `${formatStatusName(status)} application`;
}

function formatStatusName(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function formatStatDetail(detail: string): string | null {
  const valueMatch = detail.match(/increase .*?'s (.+?) by (\d+)(%| flat)/i);
  if (valueMatch) {
    const stats = valueMatch[1]!
      .split(/\s+and\s+|,\s*/)
      .map((stat) => stat.trim())
      .filter(Boolean);
    const suffix = valueMatch[3] === '%' ? '%' : '';
    return `${joinEnglishList(stats.map((stat) => `${stat} +${valueMatch[2]}${suffix}`))}.`;
  }
  const supportMatch = detail.match(/increase .*?'s ([A-Za-z]+)(?:, which supports (.+))?\./i);
  if (supportMatch?.[2]) {
    return `${supportMatch[1]} support for ${supportMatch[2].replace(/: /g, ' ')}.`;
  }
  if (supportMatch?.[1]) {
    return `${supportMatch[1]} support.`;
  }
  return null;
}

function enemyFacingSummary(trace: SynergyTrace, source: Dragon | null = null): string {
  if (trace.matchKind === 'enemy-damage-dealt-reduction') {
    if (isAllMatchingEnemyCondition(trace)) {
      const amount = modifierAmountFromTrace(trace) ?? 'an unresolved amount';
      const threshold = allMatchingThresholdFact(trace);
      const targetPhrase = threshold ? threshold.replace(/^Applies to /i, '').replace(/\.$/, '') : 'all enemies';
      const duration = trace.effects.find((effect) => /Duration:/i.test(effect)) ?? null;
      if (trace.channel === 'recovery') {
        return [
          `Reduces Recovery Received by ${amount} for ${targetPhrase}.`,
          duration,
          threshold ? 'Enemy threshold membership is unresolved.' : null,
        ].filter(Boolean).join(' ');
      }
      return [
        `Reduces ${formatToken(trace.channel ?? 'damage-dealt')} by ${amount} for ${targetPhrase}.`,
        duration,
        threshold ? 'Enemy threshold membership is unresolved.' : null,
      ].filter(Boolean).join(' ');
    }
    const amount = modifierAmountFromTrace(trace);
    const stat = enemyReductionStat(trace);
    const baseReduction = stat ? enemyReductionIsBase(trace, stat) : false;
    const targetPhrase = enemyReductionTargetPhrase(trace);
    const duration = trace.effects.find((effect) => /Duration:/i.test(effect)) ?? null;
    const uncertainty = enemyFacingUncertainty(trace);
    const text = [trace.targetSelectorSummary ?? '', trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
    if (trace.channel === 'stat' && stat) {
      const signedAmount = amount ? `-${amount}` : 'reduction';
      const scalingStat = enemyReductionScalingStat(trace);
      const scalingSource = source?.name ?? 'the source dragon';
      return [
        `${baseReduction ? 'Base ' : ''}Enemy ${stat} ${signedAmount} on ${targetPhrase}; final reduction scales with ${scalingSource}'s ${scalingStat} and remains unresolved.`,
        uncertainty,
      ].filter(Boolean).join(' ');
    }
    const sourceValue = stat && amount ? `${baseReduction ? 'Base ' : ''}Enemy ${stat} -${amount}` : null;
    const channelValue = !stat && amount ? `${formatToken(trace.channel ?? 'damage-dealt')} -${amount}` : null;
    const highestStat = text.match(/selection stat (strength|intelligence|instinct|initiative)/i)?.[1] ??
      text.match(/highest-(Strength|Intelligence|Instinct|Initiative)/i)?.[1] ??
      null;
    const activationChance = text.match(/Activation chance:\s*([\d.]+%)/i)?.[1] ?? null;
    const timing = text.match(/Timing:\s*Each round\./i) ? 'Each round' : null;
    if (!stat && amount && highestStat && activationChance && timing) {
      const statLabelText = `${highestStat.charAt(0).toUpperCase()}${highestStat.slice(1).toLowerCase()}`;
      const durationText = duration?.match(/Duration:\s*([^.]+)\./i)?.[1] ?? '2 rounds';
      const scope = /non-Basic/i.test(text) ? 'non-Basic ' : '';
      return [
        `${timing}, ${activationChance} chance to reduce the highest-${statLabelText} enemy's ${scope}${formatToken(trace.channel ?? 'damage-dealt')} Dealt by ${amount} for ${durationText}.`,
        'Enemy identity and highest-Strength tie resolution remain unresolved.',
      ].join(' ');
    }
    if (sourceValue && baseReduction) {
      const scalingStat = enemyReductionScalingStat(trace);
      const scalingSource = source?.name ?? 'the source dragon';
      return [
        `${sourceValue} on ${targetPhrase}; final reduction scales with ${scalingSource}'s ${scalingStat} and remains unresolved.`,
        duration,
        uncertainty,
      ].filter(Boolean).join(' ');
    }
    return [
      `${sourceValue ?? channelValue ?? `${formatToken(trace.channel ?? 'damage-dealt')} reduction`} on ${targetPhrase}.`,
      duration,
      uncertainty,
    ].filter(Boolean).join(' ');
  }
  if (trace.matchKind === 'enemy-damage-received-increase') {
    if (isAllMatchingEnemyCondition(trace)) {
      const channel = formatToken(trace.channel ?? 'damage-dealt');
      const amount = modifierAmountFromTrace(trace) ?? 'an unresolved amount';
      const threshold = allMatchingThresholdFact(trace);
      const targetPhrase = threshold ? threshold.replace(/^Applies to /i, '').replace(/\.$/, '') : 'all enemies';
      const scope = trace.effects.find((effect) => /Applies to .*qualifying|Applies to non-Basic/i.test(effect)) ??
        trace.matchedFacts.find((fact) => /Applies to .*qualifying|Applies to non-Basic/i.test(fact)) ??
        null;
      return [
        `Increases ${channel} Received by ${amount} for ${targetPhrase}.`,
        scope,
        threshold ? 'Enemy threshold membership and allied target overlap are not guaranteed.' : 'All affected-enemy overlap with allied outputs is not guaranteed.',
      ].filter(Boolean).join(' ');
    }
    const triggerSummary = successfulStatusVulnerabilitySummary(trace);
    if (triggerSummary) {
      return triggerSummary;
    }
    return `Increases ${formatToken(trace.channel ?? 'damage-dealt')} Received for one enemy target.`;
  }
  if (trace.matchKind === 'periodic-status-damage') {
    const status = trace.title.match(/^(.+?)\s+periodic/i)?.[1] ?? 'Status';
    const uncertainty = periodicStatusUncertainty(trace);
    return [`${status} deals periodic ${formatToken(trace.channel ?? 'damage-dealt')} each round.`, uncertainty].filter(Boolean).join(' ');
  }
  const channel = trace.sourceAbilityId?.includes('battle-dread') ? 'Fire Damage' : trace.channel ? formatToken(trace.channel) : 'team damage';
  if (trace.modifier && trace.matchKind === 'enemy-mitigation-reduction') {
    const amount = trace.modifier.operation === 'decrease' ? `-${formatTypedModifierValue(trace.modifier)}` : formatTypedModifierValue(trace.modifier);
    const stat = enemyReductionStat(trace) ?? 'mitigation';
    const targetPhrase = enemyReductionTargetPhrase(trace);
    const text = [trace.title, trace.explanation, ...trace.matchedFacts, ...trace.effects, trace.exactResultUnknownReason ?? ''].join(' ');
    const scalingStat = enemyReductionScalingStat(trace);
    const hasTypedBaseScaling = /Base Enemy [A-Za-z]+ reduction/i.test(text) && /(?:Scaling stat:|Enhanced by)/i.test(text);
    const baseValue = `Base Enemy ${stat} ${amount}`;
    const finalValue = source ? `final reduction scales with ${source.name}'s ${scalingStat} and remains unresolved` : 'final reduction remains unresolved';
    if (!hasTypedBaseScaling) {
      return `Lowers enemy ${stat}, supporting allied ${channel}. Enemy ${stat} reduction is ${amount}.`;
    }
    return `${baseValue} on ${targetPhrase}; ${finalValue}.`;
  }
  const lowered = trace.effects.join(' ').match(/(Strength|Intelligence|Instinct|Initiative)/i)?.[1];
  return lowered ? `Lowers enemy ${lowered}, supporting allied ${channel}.` : 'Lowers enemy mitigation for the team.';
}

function enemyReductionScalingStat(trace: SynergyTrace): string {
  const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects, trace.exactResultUnknownReason ?? ''].join(' ');
  return text.match(/Scaling stat:\s*(Strength|Intelligence|Instinct|Initiative)\./i)?.[1]
    ?? text.match(/Enhanced by\s+(?:[A-Za-z]+(?:'s)?\s+)?(Strength|Intelligence|Instinct|Initiative)\./i)?.[1]
    ?? 'Initiative';
}

function enemyFacingUncertainty(trace: SynergyTrace): string | null {
  if (trace.status === 'active') {
    return null;
  }
  if (trace.targetSelectionGroup?.selectionUncertain) {
    if (trace.targetSelectionGroup.selection === 'highest-stat') {
      return 'Selected enemy identity and tie resolution are uncertain.';
    }
    if (trace.targetSelectionGroup.selectionResource === 'current-troops') {
      return 'Selected enemy identity and current troop values are uncertain.';
    }
    if (trace.targetSelectionGroup.targetCount > 1) {
      return 'Selected enemy identities are uncertain.';
    }
    return 'Selected enemy identity is uncertain.';
  }
  if (trace.matchKind === 'periodic-status-damage') {
    return periodicStatusUncertainty(trace);
  }
  if (trace.matchKind === 'enemy-damage-received-increase') {
    return 'Threshold eligibility and overlapping tiers are uncertain.';
  }
  return null;
}

function periodicStatusUncertainty(trace: SynergyTrace): string | null {
  if (trace.status === 'active') {
    return null;
  }
  return 'Application success on each independently checked enemy, successful-application uptime, first-tick timing, refresh behavior, stacking, mitigation, and final periodic damage are uncertain.';
}

function successfulStatusVulnerabilitySummary(trace: SynergyTrace): string | null {
  const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
  if (!/Trigger cardinality: once per successful/i.test(text) && !/For each enemy .*successfully/i.test(text)) {
    return null;
  }
  const channel = formatToken(trace.channel ?? 'damage-dealt');
  const amount = modifierAmountFromTrace(trace) ?? 'an unresolved amount';
  const sourceMatch = text.match(/each successful ([A-Za-z-]+) application by ([A-Za-z]+)/i);
  const status = sourceMatch?.[1] ?? 'status';
  const source = sourceMatch?.[2] ?? 'the source dragon';
  const scope = /non-Basic/i.test(text)
    ? `Applies to non-Basic ${channel} only.`
    : /all qualifying/i.test(text)
      ? `Applies to all qualifying ${channel} sources.`
      : null;
  const duration = trace.effects.find((effect) => /Duration:/i.test(effect)) ?? null;
  return [
    `For each enemy ${source} successfully ${status.toLowerCase() === 'taunt' ? 'Taunts' : `applies ${status} to`}, increases ${channel} Received by ${amount} on that same enemy.`,
    scope,
    duration,
    'Target overlap with allied damage remains unresolved.',
  ].filter(Boolean).join(' ');
}

function enemyReductionPurpose(trace: SynergyTrace): string {
  if (trace.channel === 'recovery') {
    return 'Enemy Recovery Received reduction';
  }
  const stat = enemyReductionStat(trace);
  if (trace.matchKind === 'enemy-damage-dealt-reduction') {
    if (trace.channel === 'stat' && stat) {
      return `Enemy ${stat} reduction`;
    }
    const scope = /non-Basic/i.test([trace.title, trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ')) ? 'non-Basic ' : '';
    if (trace.channel === 'damage-dealt') {
      return `Enemy ${scope}Damage Dealt reduction`;
    }
    return `Enemy ${scope}${formatToken(trace.channel ?? 'damage-dealt')} Dealt reduction`;
  }
  return stat ? `Enemy ${stat} reduction` : 'Enemy Damage Dealt reduction';
}

function enemyReductionStat(trace: SynergyTrace): string | null {
  const text = [trace.title, trace.explanation, ...trace.effects, ...trace.matchedFacts].join(' ');
  return text.match(/\bEnemy (Strength|Intelligence|Instinct|Initiative)\s+(?:decrease|reduction|-)/i)?.[1] ?? null;
}

function enemyReductionTargetPhrase(trace: SynergyTrace): string {
  const summary = trace.targetSelectorSummary ?? trace.matchedFacts.find((fact) => /targets enemy;/i.test(fact)) ?? '';
  const countMatch = summary.match(/;\s*(\d+)\s+targets?\b/i);
  if (!countMatch) {
    return 'an enemy candidate';
  }
  const count = Number(countMatch[1]);
  const adjacency = /adjacent|within-adjacency/i.test(summary) ? 'adjacent ' : '';
  return `${count} ${adjacency}enemy target${count === 1 ? '' : 's'}`;
}

function enemyReductionIsBase(trace: SynergyTrace, stat: string): boolean {
  const text = [trace.explanation, ...trace.effects, ...trace.matchedFacts].join(' ');
  return new RegExp(`\\bBase Enemy ${stat} reduction\\b`, 'i').test(text);
}

function independentPerTargetStatusSummary(trace: SynergyTrace): string[] {
  if (trace.ruleId !== 'status-source-output') {
    return [];
  }
  const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
  const checks = text.match(/Independent per-target checks:\s*(\d+)\./i)?.[1];
  const chance = text.match(/Per-target check chance:\s*([0-9.]+%)(?:\s+at effective Habit Level \d+)?\./i)?.[1];
  if (!checks || !chance) {
    return [];
  }
  const status = trace.effects.find((effect) => /Status identity:/i.test(effect))?.replace(/Status identity:\s*/i, '').replace(/\.$/, '') ??
    trace.matchedFacts.find((fact) => /Supplied status:/i.test(fact))?.replace(/Supplied status:\s*/i, '').replace(/\.$/, '') ??
    trace.title.match(/-\s*(.+?)\s+(?:application|attempt|source)$/i)?.[1] ??
    'status';
  const timing = trace.effects.find((effect) => /Timing:/i.test(effect))?.replace(/^(?:Activation\s+)?Timing:\s*/i, '').replace(/\.$/, '') ??
    trace.matchedFacts.find((fact) => /Activation timing:/i.test(fact))?.replace(/^Activation timing:\s*/i, '').replace(/\.$/, '') ??
    null;
  const duration = trace.effects.find((effect) => /Duration:/i.test(effect)) ?? null;
  const prefix = timing ? `${capitalizeFirst(timing)}, ` : '';
  return [[
    `${prefix}independently checks ${checks} eligible enemy target${checks === '1' ? '' : 's'} at ${chance} each to apply ${formatStatusName(status)}.`,
    duration,
  ].filter(Boolean).join(' ')];
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function enemyVulnerabilityBenefitSummary(trace: SynergyTrace, recipient: Dragon): string {
  const channel = formatToken(trace.channel ?? 'damage-dealt');
  const scope = /non-Basic/i.test(trace.explanation) || trace.matchedFacts.some((fact) => /non-Basic/i.test(fact))
    ? 'qualifying non-Basic '
    : 'the formation\'s qualifying ';
  const amountValue = trace.recipientModifierValue !== null && trace.recipientModifierValue !== undefined
    ? `${trace.recipientModifierValue}%`
    : (trace.explanation.match(/\+([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? trace.explanation.match(/increase(?:d)? ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? trace.explanation.match(/decrease(?:d)? ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? trace.explanation.match(/by ([-+]?\d+(?:\.\d+)?%?)/i)?.[1]
      ?? null);
  const amount = amountValue ? `+${amountValue} ${channel} Received` : `${channel} Damage Received vulnerability`;
  if (isAllMatchingEnemyCondition(trace)) {
    return `${recipient.name}'s ${scope}${channel} outputs can benefit from ${amount} on an affected enemy; threshold membership and target overlap are not guaranteed.`;
  }
  return `${recipient.name}'s ${scope}${channel} outputs can benefit from ${amount} on the selected enemy; target overlap is not guaranteed.`;
}

function isAllMatchingEnemyCondition(trace: SynergyTrace): boolean {
  const text = [trace.targetSelectorSummary ?? '', trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
  return trace.targetSelectionGroup?.selection === 'all-matching-condition' ||
    /all-matching-condition|all matching enemies|all enemies currently/i.test(text);
}

function allMatchingThresholdFact(trace: SynergyTrace): string | null {
  const text = [trace.explanation, ...trace.matchedFacts, ...trace.effects].join(' ');
  return text.match(/Applies to all enemies currently (?:above|below) \d+(?:\.\d+)?% maximum Troop Capacity\./i)?.[0] ?? null;
}

function modifierAmountFromTrace(trace: SynergyTrace): string | null {
  const text = [trace.explanation, ...trace.effects, ...trace.matchedFacts].join(' ');
  return text.match(/\bBase Enemy (?:Strength|Intelligence|Instinct|Initiative) reduction\s+-(\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/\bEnemy (?:Strength|Intelligence|Instinct|Initiative)\s+-(\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/\b(?:Received|increase|decrease|by)\s+\+?([-+]?\d+(?:\.\d+)?(?:%|(?:\s+flat)|(?:\s*[x×]))?(?:\s+per stack)?)/i)?.[1] ??
    text.match(/\+([-+]?\d+(?:\.\d+)?(?:%|(?:\s+flat)|(?:\s*[x×]))?(?:\s+per stack)?)\b/i)?.[1] ??
    null;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function joinEnglishList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function numberWord(value: number): string {
  switch (value) {
    case 1:
      return 'one';
    case 2:
      return 'two';
    case 3:
      return 'three';
    default:
      return String(value);
  }
}

function getAbilityName(source: Dragon, abilityId: string | null): string {
  return (
    [source.command, source.trait, ...source.habits].find((ability) => ability?.id === abilityId)?.name ??
    source.command?.name ??
    'Formation effect'
  );
}

function isEnemyFacingTrace(trace: SynergyTrace): boolean {
  if (trace.matchKind === 'enemy-damage-received-increase' && trace.recipientDragonId) {
    return false;
  }
  if (trace.matchKind === 'enemy-mitigation-reduction' && trace.recipientDragonId) {
    return false;
  }
  return trace.modifierRole === 'enemy-debuff' || trace.matchKind === 'enemy-mitigation-reduction' || trace.interactionScope === 'enemy-side';
}

function formatRequirementFailure(requirement: RequirementTrace): string {
  if (/Dragon Level/i.test(requirement.label)) {
    return `Requires ${requirement.expected}; current ${requirement.actual ?? 'unknown'}`;
  }
  return `${requirement.label}: requires ${requirement.expected}; current ${requirement.actual ?? 'unknown'}`;
}

function formatPosition(position: FormationPosition): string {
  return position
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatToken(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRankedValue(value: RankedValue, fallbackUnit: AbilityEffect['unit']): string {
  const unit = value.unit === 'percent' ? 'percent' : fallbackUnit;
  if (unit === 'percent' || unit === 'rate') {
    return `${value.value}%`;
  }
  if (unit === 'flat') {
    return `${value.value} flat`;
  }
  return String(value.value);
}
