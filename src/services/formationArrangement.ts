export interface FormationArrangement {
  'left-flank': string;
  vanguard: string;
  'right-flank': string;
}

export function allFormationPermutations(
  dragonIds: readonly string[],
): FormationArrangement[] {
  if (dragonIds.length !== 3 || new Set(dragonIds).size !== 3) return [];
  const [first, second, third] = dragonIds as readonly [string, string, string];
  return [
    arrangementOf(first, second, third),
    arrangementOf(first, third, second),
    arrangementOf(second, first, third),
    arrangementOf(second, third, first),
    arrangementOf(third, first, second),
    arrangementOf(third, second, first),
  ];
}

function arrangementOf(
  left: string,
  vanguard: string,
  right: string,
): FormationArrangement {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}
