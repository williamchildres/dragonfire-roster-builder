export function constantSelectionExpressionValue(
  coefficients: readonly number[],
  selectedCount: number,
): number | null {
  if (
    !Number.isInteger(selectedCount) ||
    selectedCount < 0 ||
    coefficients.some((coefficient) => !Number.isSafeInteger(coefficient))
  ) {
    throw new RangeError('Exact phase coefficients must be safe integers.');
  }
  if (coefficients.length === 0) return selectedCount === 0 ? 0 : null;
  const coefficient = coefficients[0]!;
  if (coefficients.some((candidate) => candidate !== coefficient)) return null;
  const value = coefficient * selectedCount;
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Exact constant phase value exceeds safe-integer bounds.');
  }
  return value;
}
