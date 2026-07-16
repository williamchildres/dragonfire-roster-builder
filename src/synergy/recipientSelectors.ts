import type { FormationPosition } from '../models/dragon';
import type { DragonProgression, SynergySignal } from './types';

export interface RecipientCandidate {
  dragonId: string;
  position: FormationPosition;
}

export function signalTargetsRecipient({
  provider,
  signal,
  recipient,
  selected,
  progression,
}: {
  provider: RecipientCandidate;
  signal: SynergySignal;
  recipient: RecipientCandidate;
  selected: RecipientCandidate[];
  progression: Record<string, DragonProgression | undefined>;
}): boolean {
  const selector = signal.recipientSelector;
  if (!selector) {
    return true;
  }

  if (selector.kind === 'position-priority') {
    const preferred = selected.find((candidate) => candidate.position === selector.preferredPosition);
    if (!preferred) {
      return false;
    }
    if (!selector.allowSelf && preferred.dragonId === provider.dragonId) {
      return false;
    }
    return preferred.dragonId === recipient.dragonId;
  }

  if (selector.kind === 'unresolved-group') {
    return false;
  }

  const eligible = selected.filter(
    (candidate) => !selector.excludeSelf || candidate.dragonId !== provider.dragonId,
  );
  const ranked = eligible.map((candidate) => ({
    candidate,
    value: progression[candidate.dragonId]?.combatStats?.[selector.stat],
  }));
  if (ranked.length === 0 || ranked.some(({ value }) => value === null || value === undefined)) {
    return false;
  }

  const maximum = Math.max(...ranked.map(({ value }) => value as number));
  const leaders = ranked.filter(({ value }) => value === maximum);
  return leaders.length === 1 && leaders[0]?.candidate.dragonId === recipient.dragonId;
}
