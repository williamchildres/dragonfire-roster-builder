import type {
  SignalReliabilityBinding,
  SignalReliabilityPath,
  SignalReliabilityUse,
} from './types';

export interface ReliabilityBindingPathVisit {
  path: SignalReliabilityPath;
  useId?: string;
}

/**
 * Returns every path with its mixed-use identity preserved for read-only
 * validation, coverage, auditing, and hashing traversals.
 */
export function reliabilityBindingPathVisits(
  binding: SignalReliabilityBinding,
): readonly ReliabilityBindingPathVisit[] {
  if (binding.status === 'unresolved-mixed') {
    return binding.candidatePaths.map((path) => ({ path }));
  }
  if (binding.bindingClass === 'resolved-mixed') {
    const uses: readonly SignalReliabilityUse[] = Array.isArray(binding.uses)
      ? binding.uses
      : [];
    return uses.flatMap((use) =>
      use.paths.map((path) => ({ path, useId: use.useId })),
    );
  }
  return binding.paths.map((path) => ({ path }));
}

export function reliabilityBindingUses(
  binding: Extract<SignalReliabilityBinding, { bindingClass: 'resolved-mixed' }>,
): readonly SignalReliabilityUse[] {
  return binding.uses;
}
