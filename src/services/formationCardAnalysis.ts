import { FORMATION_POSITIONS, TROOP_TYPES, type AbilityDefinition, type Dragon, type FormationPosition, type TroopType } from '../models/dragon';
import type { FormationAnalysisInput, RequirementTrace, SynergyTrace, TraceConfidence, TraceStatus } from '../models/synergy';
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
  options: { previewEnabled?: boolean } = {},
): FormationCardPresentation {
  const selectedIds = new Set(Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId)));
  const dragonById = new Map(allDragons.map((dragon) => [dragon.id, dragon]));
  const normalTraces = traces.filter((trace) => isNormalSynergyTrace(trace));
  const byDragon = new Map<string, { receives: FormationCardInteraction[]; provides: FormationCardInteraction[] }>();
  for (const dragonId of selectedIds) {
    byDragon.set(dragonId, { receives: [], provides: [] });
  }

  for (const trace of normalTraces) {
    const source = dragonById.get(trace.sourceDragonId);
    if (!source || !selectedIds.has(trace.sourceDragonId) || trace.interactionScope === 'internal') {
      continue;
    }
    if (isRedundantBlockedTraitTrace(trace, source, options.previewEnabled === true)) {
      continue;
    }

    if (trace.targetSelectionGroup && trace.targetSelectionGroup.selectionUncertain) {
      const eligible = trace.targetSelectionGroup.eligibleRecipientDragonIds.filter((dragonId) => selectedIds.has(dragonId));
      if (eligible.length === 0) {
        continue;
      }
      const providerItem = toCardInteraction({
        trace,
        source,
        recipient: null,
        allDragons,
        previewEnabled: options.previewEnabled === true,
        targetLabel: eligible.map((dragonId) => dragonById.get(dragonId)?.name ?? dragonId).join(' or '),
        isCandidate: false,
        candidateIndex: null,
        candidateTotal: eligible.length,
      });
      byDragon.get(source.id)?.provides.push(providerItem);

      eligible.forEach((dragonId, index) => {
        const recipient = dragonById.get(dragonId);
        if (!recipient || recipient.id === source.id) {
          return;
        }
        byDragon.get(recipient.id)?.receives.push(
          toCardInteraction({
            trace,
            source,
            recipient,
            allDragons,
            previewEnabled: options.previewEnabled === true,
            targetLabel: `Candidate ${index + 1} of ${eligible.length}`,
            isCandidate: true,
            candidateIndex: index + 1,
            candidateTotal: eligible.length,
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
    const receives = prepareInteractions(mapped?.receives ?? [], 'receives');
    const provides = prepareInteractions(mapped?.provides ?? [], 'provides');
    return {
      position,
      dragonId: dragon?.id ?? null,
      receives,
      provides,
      command: dragon ? deriveCommandSummary(dragon) : null,
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
  });
  const summary = compactSummaryText(summaryLines, candidateTotal);
  const relationshipId = [
    trace.sourceDragonId,
    trace.sourceAbilityId ?? trace.ruleId,
    trace.targetSelectionGroup
      ? `target-selection-${trace.id}`
      : recipient?.id ?? 'team',
  ].join('__');

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
    detail,
    details: [detail],
    effects: trace.effects,
    requirements: trace.requirements,
    confidence: trace.confidence,
    modifierLines: modifierLinesForTrace(trace, recipient),
    state,
    status: trace.status,
    isCandidate,
    candidateIndex,
    candidateTotal,
    targetLabel,
    targetSummary: trace.targetSelectorSummary ?? null,
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
    ];
  }
  if (trace.targetSelectionGroup && trace.channel) {
    const targetNames = target.targetLabel ? `: ${target.targetLabel}` : '';
    return [`One ${formatToken(trace.channel).replace(' Damage', '')} recipient is selected${targetNames}.`];
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
  if (trace.matchKind === 'status-removal') {
    return ['Potential Control cleanse; timing, selection, and activation are uncertain.'];
  }
  if (trace.modifierRole === 'enemy-debuff' || trace.matchKind === 'enemy-mitigation-reduction') {
    return [enemyFacingSummary(trace)];
  }
  if (trace.channel === 'stat') {
    return [formatStatEffects(trace.effects) ?? formatStatDetail(detail) ?? detail];
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

function deriveCommandSummary(dragon: Dragon): FormationCommandSummary | null {
  if (!dragon.command) {
    return null;
  }
  return {
    dragonId: dragon.id,
    abilityName: dragon.command.name,
    label: 'Command',
    summary: commandSummaryLines(dragon.command).join(' '),
    summaryLines: commandSummaryLines(dragon.command),
    detail: dragon.command.rawDescription ?? commandSummary(dragon.command),
  };
}

function commandSummary(command: AbilityDefinition): string {
  return commandSummaryLines(command).join(' ');
}

function commandSummaryLines(command: AbilityDefinition): string[] {
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
  return [`${timing}: ${joinEnglishList(effectNames)}${target}.`];
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
): FormationCardInteraction[] {
  return prioritizeInteractions(aggregateInteractions(dedupeInteractions(attachRecipientModifiers(interactions, direction)), direction));
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
): FormationCardInteraction[] {
  const grouped = new Map<string, FormationCardInteraction[]>();
  for (const interaction of interactions) {
    const key =
      direction === 'receives'
        ? [
            interaction.sourceDragonId,
            interaction.abilityName,
            interaction.recipientDragonId ?? interaction.targetLabel ?? 'team',
            interaction.state,
          ].join('|')
        : [interaction.sourceDragonId, interaction.abilityName, interaction.state].join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), interaction]);
  }

  return [...grouped.values()].flatMap((items) => {
    const shouldAggregate =
      items.length > 1 &&
      (direction === 'receives' ||
        items.some((item) => item.candidateTotal !== null || item.targetLabel !== null || item.isCandidate));
    return shouldAggregate ? [mergeInteractions(items, direction)] : items;
  });
}

function mergeInteractions(
  items: FormationCardInteraction[],
  direction: 'receives' | 'provides',
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
  const summaryLines = mergedSummaryLines(items, direction, targetNames);
  const mergedCandidateTotal =
    Math.max(...items.map((item) => item.candidateTotal ?? 0)) ||
    (direction === 'provides' && targetNames.length > 1 ? targetNames.length : first.candidateTotal);
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
    relationshipId: first.relationshipId,
    targetLabel: direction === 'provides' && targetNames.length > 0 ? targetNames.join(' or ') : first.targetLabel,
    effectTitle: first.abilityName,
    title: unique(items.map((item) => item.title)).join(' + '),
    summaryLines,
    summary: compactSummaryText(summaryLines, mergedCandidateTotal),
    detail: items.map((item) => item.detail).join('\n\n'),
    details: unique(items.flatMap((item) => item.details)),
    effects: unique(items.flatMap((item) => item.effects)),
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
): string[] {
  const lines = unique(items.flatMap((item) => item.summaryLines));
  if (direction === 'provides' && targetNames.length > 0) {
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
  if (trace.matchKind === 'status-condition-enablement') {
    return 'Conditional status enablement';
  }
  if (trace.matchKind === 'status-removal') {
    return 'Control cleanse';
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

function formatStatEffects(effects: string[]): string | null {
  const parsed = effects.flatMap((effect) => {
    const match = effect.match(/^(.+?)\s+(\d+)\s+(flat|percent)$/i);
    if (!match) {
      return [];
    }
    return [{
      stat: match[1]!,
      value: `${match[3]!.toLowerCase() === 'flat' ? '+' : '+'}${match[2]}${match[3]!.toLowerCase() === 'percent' ? '%' : ''}`,
    }];
  });
  if (parsed.length === 0) {
    return null;
  }
  const order = ['Strength', 'Intelligence', 'Instinct', 'Initiative'];
  const sorted = parsed.sort((left, right) => order.indexOf(left.stat) - order.indexOf(right.stat));
  return `${joinEnglishList(sorted.map((item) => `${item.stat} ${item.value}`))}.`;
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
  const lowered = trace.effects.join(' ').match(/(Strength|Intelligence|Instinct|Initiative)/i)?.[1];
  const channel = trace.sourceAbilityId?.includes('battle-dread') ? 'Fire Damage' : trace.channel ? formatToken(trace.channel) : 'team damage';
  return lowered ? `Lowers enemy ${lowered}, supporting allied ${channel}.` : 'Lowers enemy mitigation for the team.';
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
