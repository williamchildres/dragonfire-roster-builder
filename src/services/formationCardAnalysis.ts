import { FORMATION_POSITIONS, TROOP_TYPES, type AbilityDefinition, type AbilityEffect, type AbilitySchedule, type Dragon, type FormationPosition, type OwnedDragon, type RankedValue, type TroopType } from '../models/dragon';
import type { FormationAnalysisInput, RequirementTrace, SynergyTrace, TraceConfidence, TraceStatus } from '../models/synergy';
import { rankedValueForHabitLevel, resolveEffectiveHabitLevelForAbility } from './habitLevels';
import { isNormalSynergyTrace } from './synergyTrace';

export type FormationCardInteractionState = 'active' | 'conditional' | 'preview' | 'unknown' | 'blocked';

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
  traceId: string;
  traceIds: string[];
  isRecipientModifier: boolean;
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
  const normalTraces = traces.filter(
    (trace) =>
      (isNormalSynergyTrace(trace) || isVisibleInternalProvidesTrace(trace)) &&
      !(trace.status === 'inactive' && trace.matchKind === 'defensive-ally-support'),
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
      const allMatching = isAllMatchingTargetSelection(trace);
      if (eligible.length === 0) {
        continue;
      }
      if (!trace.targetSelectionGroup.selectionUncertain && !allMatching) {
        continue;
      }
      const providerItem = toCardInteraction({
        trace,
        source,
        recipient: null,
        allDragons,
        previewEnabled: options.previewEnabled === true,
        targetLabel: joinTargetNames(eligible.map((dragonId) => dragonById.get(dragonId)?.name ?? dragonId), allMatching),
        isCandidate: false,
        candidateIndex: null,
        candidateTotal: allMatching ? null : eligible.length,
      });
      byDragon.get(source.id)?.provides.push(providerItem);

      eligible.forEach((dragonId, index) => {
        const recipient = dragonById.get(dragonId);
        if (!recipient || (!allMatching && recipient.id === source.id)) {
          return;
        }
        byDragon.get(recipient.id)?.receives.push(
          toCardInteraction({
            trace,
            source,
            recipient,
            allDragons,
            previewEnabled: options.previewEnabled === true,
            targetLabel: allMatching ? null : `Candidate ${index + 1} of ${eligible.length}`,
            isCandidate: !allMatching,
            candidateIndex: index + 1,
            candidateTotal: allMatching ? null : eligible.length,
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
      previewEnabled: options.previewEnabled === true,
      targetLabel: null,
      isCandidate: false,
      candidateIndex: null,
      candidateTotal: null,
    });
    if (trace.matchKind === 'incoming-effect-amplification' && trace.recipientModifierType) {
      if (recipient && recipient.id !== source.id && selectedIds.has(recipient.id)) {
        byDragon.get(recipient.id)?.receives.push(item);
      }
      continue;
    }
    byDragon.get(source.id)?.provides.push(item);
    if (recipient && recipient.id !== source.id && selectedIds.has(recipient.id) && !isEnemyFacing) {
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

function isVisibleInternalProvidesTrace(trace: SynergyTrace): boolean {
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
  previewEnabled: boolean;
  targetLabel: string | null;
  isCandidate: boolean;
  candidateIndex: number | null;
  candidateTotal: number | null;
}): FormationCardInteraction {
  const abilityName = getAbilityName(source, trace.sourceAbilityId);
  const state = traceState(trace, previewEnabled);
  const detail = canonicalCardText(trace.explanation, allDragons);
  const summaryLines = summarizeTrace(trace, source, recipient, detail, {
    isCandidate,
    candidateTotal,
    targetLabel,
  }).map(sanitizeNormalCardText).filter((line): line is string => Boolean(line));
  const summary = compactSummaryText(summaryLines, candidateTotal);
  const detailText = omitNormalCardSummarySentences(sanitizeNormalCardText(detail), summaryLines);
  const effects = sanitizeNormalCardEffects(trace.effects, summaryLines);
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
    effectTitle: interactionEffectTitle(abilityName, trace),
    title: trace.title,
    summary,
    summaryLines,
    detail: detailText,
    details: detailText ? [detailText] : [],
    effects,
    requirements: trace.requirements,
    confidence: trace.confidence,
    modifierLines: modifierLinesForTrace(trace, recipient),
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
    traceId: trace.id,
    traceIds: [trace.id],
    isRecipientModifier: trace.matchKind === 'incoming-effect-amplification' && Boolean(trace.recipientModifierType),
  };
}

function modifierLinesForTrace(trace: SynergyTrace, recipient: Dragon | null): string[] {
  if (trace.matchKind !== 'incoming-effect-amplification' || !trace.recipientModifierType || !recipient) {
    return [];
  }
  const abilityName = trace.recipientModifierAbilityId ? getAbilityName(recipient, trace.recipientModifierAbilityId) : 'Recipient modifier';
  const positionBlocked = trace.status === 'inactive' &&
    trace.requirements.some((requirement) => requirement.satisfied === false && /position/i.test(requirement.label));
  if (positionBlocked) {
    return [`${abilityName} amplification unavailable: ${recipient.name} must be Vanguard.`];
  }
  const value = trace.recipientModifierValue === null || trace.recipientModifierValue === undefined
    ? 'unknown'
    : `+${trace.recipientModifierValue}%`;
  return [`Amplified by ${recipient.name}'s ${abilityName}: ${trace.recipientModifierType.replace(/ Up$/i, '')} ${value}.`];
}

function sanitizeNormalCardEffects(effects: string[], summaryLines: string[]): string[] {
  const summaryText = normalizeText(summaryLines.join(' '));
  return uniqueBy(
    effects
      .map(sanitizeNormalCardText)
      .filter((effect): effect is string => Boolean(effect))
      .filter((effect) => !isRedundantCurrentValueLine(effect, summaryText))
      .filter((effect) => !isValueAlreadyExplained(effect, summaryText))
      .filter((effect) => !summaryText.includes(normalizeText(effect))),
    semanticEffectDetailKey,
  );
}

function sanitizeNormalCardText(value: string): string {
  return value
    .replace(/\s*Ranked progression:\s.*?L5\s[-+]?\d+(?:\.\d+)?%?\./g, '')
    .replace(/\s*(Damage Dealt|Damage Received|Physical Damage Received|Tactical Damage Received|Fire Damage Received|Recovery Rate) reduction at current effective level:\s[-+]?\d+(?:\.\d+)?%?\./gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function semanticEffectDetailKey(value: string): string {
  const normalized = normalizeText(value).replace(/\.$/, '');
  const damageReceived = normalized.match(/\b(physical|tactical|fire)?\s*damage received\s+(?:increase|\+)\s*([-+]?\d+(?:\.\d+)?%?)/i);
  if (damageReceived) {
    const channel = damageReceived[1] ?? 'all';
    const scope = /non-basic/i.test(normalized)
      ? 'non-basic'
      : /all qualifying/i.test(normalized)
        ? 'all-qualifying'
        : 'unspecified';
    return `damage-received|increase|${channel}|${damageReceived[2]}|${scope}`;
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

function omitNormalCardSummarySentences(value: string, summaryLines: string[]): string {
  if (!value) {
    return '';
  }
  const summarySentences = new Set(summaryLines.flatMap(splitSentences).map(normalizeText));
  return splitSentences(value)
    .filter((sentence) => !summarySentences.has(normalizeText(sentence)))
    .join(' ');
}

function splitSentences(value: string): string[] {
  return value.split(/(?<=\.)\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isAllMatchingTargetSelection(trace: SynergyTrace): boolean {
  return trace.targetSelectionGroup?.selection === 'all-matching-condition';
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

function targetSummaryForCard(trace: SynergyTrace, allDragons: Dragon[]): string | null {
  if (!isAllMatchingTargetSelection(trace) || !trace.targetSelectionGroup) {
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
  target: { isCandidate: boolean; candidateTotal: number | null; targetLabel: string | null },
): string[] {
  if (target.isCandidate && trace.channel) {
    return [
      `${formatToken(trace.channel)} support; one of ${numberWord(target.candidateTotal ?? 0)} eligible recipients.`,
      ...targetSelectionEffectLines(trace),
    ];
  }
  if (isAllMatchingTargetSelection(trace) && trace.channel) {
    const channel = supportChannelLabel(trace);
    if (recipient) {
      return [`${channel} support when ${recipient.name} meets the condition.`];
    }
    const targetNames = target.targetLabel ? `${target.targetLabel} can each receive ` : '';
    return [`${targetNames}${channel} support when their condition is met.`];
  }
  if (trace.targetSelectionGroup && trace.channel) {
    const eligibleNames = target.targetLabel ?? 'the eligible candidates';
    if (trace.targetSelectionGroup.eligibleRecipientDragonIds.length > 1) {
      return [
        `Eligible selected-target candidates: ${eligibleNames}.`,
        'One candidate is selected when the activation succeeds; the selected target is unresolved.',
        ...targetSelectionEffectLines(trace),
      ];
    }
    if (trace.targetSelectionGroup.selectionUncertain && trace.targetSelectionGroup.eligibleRecipientDragonIds.length === 1) {
      return [
        `Resolved selected target in this formation: ${eligibleNames}.`,
        ...targetSelectionEffectLines(trace),
      ];
    }
    const targetNames = target.targetLabel ? `: ${target.targetLabel}` : '';
    return [
      `Resolved selected target in this formation${targetNames}.`,
      ...targetSelectionEffectLines(trace),
    ];
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
    return ['Potential Control cleanse; timing, selection, and activation are uncertain.'];
  }
  if (trace.matchKind === 'enemy-damage-received-increase' && recipient) {
    return [enemyVulnerabilityBenefitSummary(trace, recipient)];
  }
  if (trace.matchKind === 'friendly-impairment') {
    return [trace.explanation.replace(`${source.name}'s `, '').replace(recipient ? `${recipient.name}` : 'the ally', recipient?.name ?? 'the ally')];
  }
  if (trace.modifierRole === 'enemy-debuff' || trace.matchKind === 'enemy-mitigation-reduction' || trace.matchKind === 'enemy-damage-dealt-reduction') {
    return [enemyFacingSummary(trace)];
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
  if (trace.channel) {
    const recipientCommand = recipient?.command;
    if (recipientCommand && trace.recipientAbilityId?.includes(recipientCommand.id)) {
      return [`Increases ${recipientCommand.name} ${formatToken(trace.channel)}.`];
    }
    const channel = formatToken(trace.damageScope ? `${trace.damageScope}-damage-received` : trace.channel);
    return [`${channel} support${recipient ? ` for ${recipient.name}` : ''}.`];
  }
  return [detail.replaceAll('1.5x', '1.5×')];
}

function targetSelectionEffectLines(trace: SynergyTrace): string[] {
  return unique([
    trace.effects.find((effect) => /Activation chance:/i.test(effect)),
    trace.effects.find((effect) => /Timing:/i.test(effect)),
    trace.effects.find((effect) => /Enhanced by/i.test(effect)),
    trace.effects.find((effect) => /Duration:/i.test(effect)),
  ].filter((line): line is string => Boolean(line)));
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
  const raw = dragon.command?.rawDescription ?? summaryLines.join(' ');
  const augmentationLines = commandAugmentationSummaryLines(dragon, options);
  if (augmentationLines.length === 0) {
    return raw;
  }
  return summaryLines.join('\n\n');
}

function commandSummaryLines(
  dragon: Dragon | AbilityDefinition,
  options: { previewEnabled?: boolean; roster?: Record<string, OwnedDragon> } = {},
): string[] {
  const command = 'command' in dragon ? dragon.command : dragon;
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
  if (command.id === 'sheepstealer-wild-hunt') {
    return [
      'When no enemy has Prey: attempts to apply Prey.',
      'Rounds 1, 4, 7, and 10: Fire Damage to one enemy.',
    ];
  }
  const firstSchedule = command.schedules[0];
  const effects = command.schedules.flatMap((schedule) => schedule.effects);
  const primary = effects[0];
  if (!primary) {
    return [command.rawDescription?.split(/\n\n|(?<=\.)\s+/)[0] ?? `${command.name} command details are not yet verified.`];
  }
  const timing = firstSchedule ? scheduleTiming(firstSchedule.timing, firstSchedule.rounds) : 'Command';
  const effectNames = unique(effects.map((effect) => effect.type));
  const target = primary.target ? ` to ${primary.target}` : '';
  return [
    `${timing}: ${joinEnglishList(effectNames)}${target}.`,
    ...('command' in dragon ? commandAugmentationSummaryLines(dragon, options) : []),
  ];
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
      return augmentation.schedulesAdded.flatMap((schedule) =>
        schedule.effects.flatMap((effect) => commandEffectSummaryLine(schedule, effect, level)),
      );
    });
}

function commandEffectSummaryLine(
  schedule: AbilitySchedule,
  effect: AbilityEffect,
  level: 1 | 2 | 3 | 4 | 5 | null,
): string[] {
  const base = rankedValueForHabitLevel(effect.rankedValues, level);
  const multiplier = effect.conditionalMultipliers?.[0] ?? null;
  const enhanced = multiplier?.directlyVerifiedValues.find((value) => value.level === level);
  if (!base) {
    return [];
  }
  const target = effect.conditions?.some((condition) => condition.kind === 'target-has-output-capability')
    ? 'all enemies capable of dealing non-Basic Physical Damage'
    : effect.target;
  if (!multiplier || !enhanced) {
    return [
      `${scheduleTiming(schedule.timing, schedule.rounds)}: ${effectActionVerb(effect.type)} ${formatToken(effect.type)} at a ${formatRankedValue(base, effect.unit)} rate to ${target}.`,
    ];
  }
  const status = multiplier.condition.statusId ? formatToken(multiplier.condition.statusId) : 'the condition';
  return [
    `${scheduleTiming(schedule.timing, schedule.rounds)}: deal ${formatToken(effect.type)} at a ${formatRankedValue(base, effect.unit)} rate to ${target}. Against an eligible target afflicted with ${status}, the rate is increased ${multiplier.multiplier}x to ${formatRankedValue(enhanced, effect.unit)}.`,
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

function scheduleTiming(timing: string, rounds: number[]): string {
  if (rounds.length > 0) {
    return `Rounds ${joinEnglishList(rounds.map(String))}`;
  }
  return formatToken(timing);
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
    return {
      dragonId: dragon.id,
      abilityName: dragon.trait.name,
      state: 'blocked',
      label: 'Trait inactive',
      summary: `${dragon.trait.name} requires Vanguard.`,
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
  return prioritizeInteractions(aggregateInteractions(dedupeInteractions(attachRecipientModifiers(interactions, direction)), direction, selectedIds));
}

function attachRecipientModifiers(
  interactions: FormationCardInteraction[],
  direction: 'receives' | 'provides',
): FormationCardInteraction[] {
  if (direction === 'provides') {
    return interactions.filter((interaction) => !interaction.isRecipientModifier);
  }
  const baseItems = interactions.filter((interaction) => !interaction.isRecipientModifier);
  const modifierItems = interactions.filter((interaction) => interaction.isRecipientModifier);
  const fallbackModifiers: FormationCardInteraction[] = [];

  for (const modifier of modifierItems) {
    const target = baseItems.find(
      (item) =>
        item.relationshipId === modifier.relationshipId &&
        item.sourceDragonId === modifier.sourceDragonId &&
        item.recipientDragonId === modifier.recipientDragonId &&
        item.abilityName === modifier.abilityName,
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
        ? [
            interaction.sourceDragonId,
            interaction.abilityName,
            interaction.recipientDragonId ?? interaction.targetLabel ?? 'team',
            receivesInteractionMechanicKey(interaction),
            interaction.state,
          ].join('|')
        : [interaction.sourceDragonId, interaction.abilityName, interactionMechanicKey(interaction), interaction.state].join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), interaction]);
  }

  return [...grouped.values()].flatMap((items) => {
    if (items.length <= 1) {
      return items;
    }
    if (direction === 'receives') {
      return [mergeInteractions(items, direction, selectedIds)];
    }
    if (items.some((item) => item.candidateTotal !== null || item.targetLabel !== null || item.isCandidate)) {
      return [mergeInteractions(items, direction, selectedIds)];
    }
    return aggregateExactProvidesSubgroups(items, selectedIds);
  });
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
      providesAggregationMode(item),
    ].join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return [...grouped.values()].flatMap((group) =>
    group.length > 1 && canAggregateExactRecipientSet(group)
      ? [mergeInteractions(group, 'provides', selectedIds, { exactRecipientSet: true })]
      : group,
  );
}

function mergeInteractions(
  items: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  selectedIds: ReadonlySet<string>,
  options: { exactRecipientSet?: boolean } = {},
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
  const uniqueTitles = unique(items.map((item) => item.title));
  const uniqueEffectTitles = unique(items.map((item) => item.effectTitle));
  const summaryLines = mergedSummaryLines(items, direction, targetNames, options);
  const details = options.exactRecipientSet
    ? []
    : unique(items.flatMap((item) => item.details)
      .map((detail) => omitNormalCardSummarySentences(detail, summaryLines))
      .filter((detail): detail is string => Boolean(detail)));
  const effects = options.exactRecipientSet
    ? []
    : sanitizeNormalCardEffects(items.flatMap((item) => item.effects), summaryLines);
  const mergedCandidateTotal =
    Math.max(...items.map((item) => item.candidateTotal ?? 0)) ||
    (!options.exactRecipientSet && direction === 'provides' && targetNames.length > 1 ? targetNames.length : first.candidateTotal);
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
    recipientDragonId: options.exactRecipientSet ? null : first.recipientDragonId,
    recipientName: options.exactRecipientSet ? targetLabel : first.recipientName,
    targetLabel: direction === 'provides' && targetNames.length > 0 ? targetLabel : first.targetLabel,
    effectTitle: options.exactRecipientSet && uniqueEffectTitles.length === 1 ? uniqueEffectTitles[0]! : first.abilityName,
    title: options.exactRecipientSet && uniqueTitles.length > 1 ? first.abilityName : uniqueTitles.join(' + '),
    summaryLines,
    summary: compactSummaryText(summaryLines, mergedCandidateTotal),
    detail: options.exactRecipientSet ? '' : items.map((item) => item.detail).join('\n\n'),
    details,
    effects,
    requirements,
    confidence: confidences.length === 1 ? confidences[0]! : 'mixed',
    modifierLines: unique(items.flatMap((item) => item.modifierLines)),
    isCandidate: items.some((item) => item.isCandidate),
    candidateIndex: first.candidateIndex,
    candidateTotal: mergedCandidateTotal,
    targetSummary: unique(items.map((item) => item.targetSummary).filter((value): value is string => Boolean(value))).join(' | ') || null,
    isEnemyFacing: items.some((item) => item.isEnemyFacing),
    traceIds: unique(items.flatMap((item) => item.traceIds)),
    isRecipientModifier: items.every((item) => item.isRecipientModifier),
  };
}

function mergedSummaryLines(
  items: FormationCardInteraction[],
  direction: 'receives' | 'provides',
  targetNames: string[],
  options: { exactRecipientSet?: boolean } = {},
): string[] {
  const lines = unique(items.flatMap((item) => item.summaryLines));
  if (options.exactRecipientSet && direction === 'provides') {
    return [
      `Applies to ${joinEnglishList(targetNames)}.`,
      ...synthesizedExactRecipientEffectLines(items, targetNames),
    ];
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

function synthesizedExactRecipientEffectLines(
  items: FormationCardInteraction[],
  targetNames: string[],
): string[] {
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
      return [impairment];
    }
    const defensiveStack = synthesizeDefensiveStackLine(first, text, targetNames);
    if (defensiveStack) {
      return [defensiveStack];
    }
    const damageReceivedSupport = synthesizeDamageReceivedSupportLine(first, text, targetNames);
    if (damageReceivedSupport) {
      return [damageReceivedSupport];
    }
    const enemyVulnerability = synthesizeEnemyVulnerabilityBenefitLine(first, text, targetNames);
    if (enemyVulnerability) {
      return [enemyVulnerability];
    }
    const summaryLines = unique(group.flatMap((item) => item.summaryLines));
    return summaryLines.map((line) => normalizeGroupedRecipientLine(line, targetNames));
  }));
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
  const value = text.match(/Damage Received decrease ([-+]?\d+(?:\.\d+)?%?)/i)?.[1] ??
    text.match(/Damage Received reduction: ([-+]?\d+(?:\.\d+)?%?)/i)?.[1];
  if (!value) {
    return null;
  }
  const timing = text.match(/Timing: [^.]+\./i)?.[0] ?? null;
  const duration = text.match(/Duration: [^.]+\./i)?.[0] ?? null;
  return [
    `${item.abilityName} reduces Damage Received for ${joinEnglishList(targetNames)} by ${value}.`,
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
  const value = text.match(/(Physical|Tactical|Fire)?\s*Damage Received reduction: ([-+]?\d+(?:\.\d+)?%?(?: at effective Habit Level \d+)?)/i);
  const scope = text.match(/(Physical|Tactical|Fire)?\s*Damage Received reduction applies to non-Basic Attacks only\./i);
  const timing = text.match(/Timing: Start of combat\./i)?.[0] ?? null;
  const duration = text.match(/Duration: until end of combat\./i)?.[0] ?? null;
  const maximum = /Maximum stack count is not verified\./i.test(text)
    ? 'Maximum stack count is unknown.'
    : null;
  if (!value) {
    return null;
  }
  const damageType = value[1] ? `${value[1]} Damage Received` : 'Damage Received';
  return [
    timing,
    `${joinEnglishList(targetNames)} each gain 1 ${stackName}.`,
    `Each stack reduces ${damageType} from ${scope ? 'non-Basic Attacks' : 'qualifying sources'} by ${value[2]}.`,
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
    text.match(/\+([-+]?\d+(?:\.\d+)?%?)\s+(Physical|Tactical|Fire) Damage Received/i);
  if (!value) {
    return null;
  }
  const channel = /^[A-Za-z]+$/.test(value[1]!) ? value[1]! : value[2]!;
  const amount = /^[A-Za-z]+$/.test(value[1]!) ? value[2]! : value[1]!;
  const scope = /non-Basic/i.test(text)
    ? `qualifying non-Basic ${channel} Damage outputs`
    : `the formation's qualifying ${channel} Damage outputs`;
  const duration = text.match(/Duration: \d+ rounds\./i)?.[0] ?? null;
  const basicExclusion = /non-Basic/i.test(text) ? 'Basic Attacks do not qualify.' : null;
  const recipientPrefix = targetNames.length > 0 ? `${joinEnglishList(targetNames)}: ` : '';
  return [
    `${recipientPrefix}${scope} can benefit from +${amount} ${channel} Damage Received on the selected enemy.`,
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
      interaction.effectTitle,
      interaction.title,
      interaction.effects.join('|'),
      interaction.state,
    ].join('::');
  }
  return 'default';
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
      item.targetSelectionMode !== null ||
      item.isEnemyFacing ||
      !item.recipientDragonId
    )
  ) {
    return false;
  }
  const titles = unique(items.map((item) => item.title));
  if (
    titles.length > 1 &&
    !isCompatibleFriendlyImpairmentRecoveryGroup(items) &&
    !isCompatibleEnemyMitigationReductionGroup(items) &&
    !isCompatibleSharedSelectedTargetGroup(items)
  ) {
    return false;
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
  if (/Enemy mitigation reduction/i.test(item.effectTitle)) {
    return [
      item.effectTitle,
      item.title,
      item.summaryLines.join('|'),
      item.status,
    ].join('::');
  }
  if (/Enemy .* vulnerability/i.test(item.effectTitle)) {
    return [
      item.effectTitle,
      item.title,
      item.effects
        .filter((effect) => !/^\w+'s qualifying/i.test(effect))
        .map(semanticEffectDetailKey)
        .join('|'),
      item.status,
      item.isPreview ? 'preview' : 'current',
    ].join('::');
  }
  return [
    item.effectTitle,
    item.title,
    item.effects.filter((effect) => !/^Targets /i.test(effect)).join('|'),
    item.modifierLines.join('|'),
    item.status,
  ].join('::');
}

function groupedRecipientLabel(
  targetNames: string[],
  targetIds: string[],
  selectedIds: ReadonlySet<string>,
): string {
  if (targetIds.length > 0 && targetIds.every((id) => selectedIds.has(id)) && targetIds.length === selectedIds.size) {
    return 'Team';
  }
  return joinEnglishList(targetNames);
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
  return [
    ...summaryLines,
    candidateTotal && candidateTotal > 1 ? 'Target not guaranteed.' : null,
  ].filter(Boolean).join(' ');
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

function interactionEffectTitle(abilityName: string, trace: SynergyTrace): string {
  const purpose = interactionPurpose(trace);
  return purpose ? `${abilityName} - ${purpose}` : abilityName;
}

function interactionPurpose(trace: SynergyTrace): string | null {
  if (isAllMatchingTargetSelection(trace) && trace.channel) {
    return `${supportChannelLabel(trace)} support`;
  }
  if (trace.targetSelectionGroup && trace.channel) {
    return `${formatToken(trace.channel)} support`;
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
    return 'Enemy Damage Dealt reduction';
  }
  if (trace.matchKind === 'enemy-damage-received-increase') {
    return `Enemy ${formatToken(trace.channel ?? 'damage-dealt')} vulnerability`;
  }
  if (trace.matchKind === 'periodic-status-damage') {
    return 'Periodic status damage';
  }
  if (trace.matchKind === 'extra-basic-attack-trigger') {
    return 'Extra Basic Attack trigger';
  }
  if (trace.matchKind === 'status-condition-enablement') {
    const match = trace.title.match(/^(.+?) enables (.+)$/i);
    if (match) {
      const status = match[1]!;
      const ability = match[2]!;
      const isChance = trace.effects.some((effect) => /application chance|target-specific conditional chance/i.test(effect)) || trace.channel === 'status';
      return `${status} enhances ${ability}${isChance ? ' chance' : ''}`;
    }
    return 'Conditional status enablement';
  }
  if (trace.matchKind === 'status-removal') {
    return 'Control cleanse';
  }
  if (trace.matchKind === 'friendly-impairment') {
    return `${formatToken(trace.channel ?? 'damage-dealt')} friendly impairment`;
  }
  if (/Recovery Received Support/i.test(trace.title)) {
    return 'Recovery Received support';
  }
  if (trace.matchKind === 'incoming-effect-amplification' && trace.recipientModifierType) {
    return `${formatToken(trace.channel ?? 'recovery')} amplification`;
  }
  if (trace.channel === 'stat') {
    return 'Stat support';
  }
  if (trace.channel) {
    return `${formatToken(trace.channel)} support`;
  }
  return trace.title === 'Stat Support' ? 'Stat support' : trace.title || null;
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

function enemyFacingSummary(trace: SynergyTrace): string {
  if (trace.matchKind === 'enemy-damage-dealt-reduction') {
    const stat = trace.effects.join(' ').match(/Enemy (Strength|Intelligence|Instinct|Initiative) decrease/i)?.[1];
    return `${stat ? `${stat} reduction` : `${formatToken(trace.channel ?? 'damage-dealt')} reduction`} on an enemy candidate; target selection and uptime are uncertain.`;
  }
  if (trace.matchKind === 'enemy-damage-received-increase') {
    return `Increases ${formatToken(trace.channel ?? 'damage-dealt')} Received for one enemy target.`;
  }
  if (trace.matchKind === 'periodic-status-damage') {
    const status = trace.title.match(/^(.+?)\s+periodic/i)?.[1] ?? 'Status';
    return `${status} deals periodic ${formatToken(trace.channel ?? 'damage-dealt')} each round; target selection and uptime are uncertain.`;
  }
  const lowered = trace.effects.join(' ').match(/(Strength|Intelligence|Instinct|Initiative)/i)?.[1];
  const channel = trace.sourceAbilityId?.includes('battle-dread') ? 'Fire Damage' : trace.channel ? formatToken(trace.channel) : 'team damage';
  return lowered ? `Lowers enemy ${lowered}, supporting allied ${channel}.` : 'Lowers enemy mitigation for the team.';
}

function enemyVulnerabilityBenefitSummary(trace: SynergyTrace, recipient: Dragon): string {
  const text = interactionText({
    title: trace.title,
    summary: trace.explanation,
    summaryLines: trace.matchedFacts,
    detail: trace.explanation,
    details: trace.matchedFacts,
    effects: trace.effects,
  } as FormationCardInteraction);
  const value = text.match(/\b(Physical|Tactical|Fire) Damage Received \+([-+]?\d+(?:\.\d+)?%?)/i);
  const channel = formatToken(trace.channel ?? 'damage-dealt');
  const scope = /non-Basic/i.test(text) ? 'non-Basic ' : '';
  const amount = value ? `+${value[2]} ${value[1]} Damage Received` : `${channel} Damage Received vulnerability`;
  return `${recipient.name}'s qualifying ${scope}${channel} can benefit from ${amount} on the selected enemy; target overlap is not guaranteed.`;
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
  if (trace.matchKind === 'enemy-mitigation-reduction' && trace.recipientDragonId && /ensnare/i.test(trace.sourceAbilityId ?? '')) {
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
