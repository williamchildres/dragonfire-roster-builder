import { FORMATION_POSITIONS, TROOP_TYPES, type Dragon, type FormationPosition, type TroopType } from '../models/dragon';
import type { FormationAnalysisInput, RequirementTrace, SynergyTrace, TraceStatus } from '../models/synergy';
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
  title: string;
  summary: string;
  detail: string;
  state: FormationCardInteractionState;
  status: TraceStatus;
  isCandidate: boolean;
  candidateIndex: number | null;
  candidateTotal: number | null;
  targetLabel: string | null;
  isPreview: boolean;
  isEnemyFacing: boolean;
  traceId: string;
}

export interface FormationTraitStatus {
  dragonId: string;
  abilityName: string;
  state: FormationCardInteractionState;
  label: string;
  summary: string;
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
    byDragon.get(source.id)?.provides.push(item);
    if (recipient && recipient.id !== source.id && selectedIds.has(recipient.id) && !isEnemyFacing) {
      byDragon.get(recipient.id)?.receives.push(item);
    }
  }

  const cards = FORMATION_POSITIONS.map((position) => {
    const dragonId = formation[position];
    const dragon = dragonId ? dragonById.get(dragonId) ?? null : null;
    const mapped = dragon ? byDragon.get(dragon.id) : null;
    const receives = prioritizeInteractions(mapped?.receives ?? []);
    const provides = prioritizeInteractions(dedupeInteractions(mapped?.provides ?? []));
    return {
      position,
      dragonId: dragon?.id ?? null,
      receives,
      provides,
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
  const candidateText = isCandidate
    ? `One of ${candidateTotal ?? 0} eligible recipients; target not guaranteed.`
    : trace.targetSelectionGroup
      ? `One of ${candidateTotal ?? trace.targetSelectionGroup.eligibleRecipientDragonIds.length} eligible recipients is selected; target not guaranteed.`
      : null;
  const summary = candidateText ?? summarizeTrace(trace, source, recipient, detail);
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
    title: trace.title,
    summary,
    detail,
    state,
    status: trace.status,
    isCandidate,
    candidateIndex,
    candidateTotal,
    targetLabel,
    isPreview: state === 'preview',
    isEnemyFacing: isEnemyFacingTrace(trace),
    traceId: trace.id,
  };
}

function summarizeTrace(trace: SynergyTrace, source: Dragon, recipient: Dragon | null, detail: string): string {
  if (trace.matchKind === 'status-condition-enablement') {
    return detail.replace(`${source.name}'s `, '').replace(recipient ? `${recipient.name}'s ` : '', '');
  }
  if (trace.modifierRole === 'enemy-debuff' || trace.matchKind === 'enemy-mitigation-reduction') {
    return `${getAbilityName(source, trace.sourceAbilityId)} lowers enemy-facing mitigation for the team.`;
  }
  if (trace.channel === 'stat') {
    const statLine = detail.match(/increase .*?'s (.+)$/)?.[1];
    return statLine ? statLine.replace(/ by /g, ' ') : detail;
  }
  if (trace.channel) {
    const channel = formatToken(trace.damageScope ? `${trace.damageScope}-damage-received` : trace.channel);
    return `${channel} support${recipient ? ` for ${recipient.name}` : ''}.`;
  }
  return detail;
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

function dedupeInteractions(interactions: FormationCardInteraction[]): FormationCardInteraction[] {
  const byKey = new Map<string, FormationCardInteraction>();
  for (const interaction of interactions) {
    const key = [
      interaction.relationshipId,
      interaction.summary,
      interaction.state,
      interaction.isCandidate ? 'candidate' : 'direct',
    ].join('|');
    if (!byKey.has(key)) {
      byKey.set(key, interaction);
    }
  }
  return [...byKey.values()];
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
