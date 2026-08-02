const descriptor = JSON.stringify({
  version: 'saved-formation-reservations-v1',
  reservableEvaluationMode: 'current-roster',
  reservedDragonScope: 'all-three-exact-arrangement-identities',
  maximumReservedOwnersPerDragon: 1,
  reservationSurvivesOwnershipLoss: true,
  duplicateDefaultsReserved: false,
  optimizerSavedDefaultsReserved: false,
  canonicalDragonIdOrder: true,
});
const expected = 'fnv1a64:0afe66181d1e7fe3';
const actual = fnv1a64(descriptor);
if (actual !== expected) throw new Error(`Saved Formation reservation audit identity changed: expected ${expected}, received ${actual}`);
console.log(`Saved Formation reservation invariant: ${actual}`);

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
