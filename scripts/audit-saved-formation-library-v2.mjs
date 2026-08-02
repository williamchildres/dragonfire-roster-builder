const descriptor = JSON.stringify({
  format: 'dragonfire-lab-saved-formations',
  schemaVersion: 2,
  storageKey: 'dragonfire-roster-lab:saved-formations',
  maximumRecords: 50,
  maximumNameLength: 80,
  arrangementPositions: ['left-flank', 'vanguard', 'right-flank'],
  evaluationModes: ['current-roster', 'planning'],
  sources: ['formation-builder', 'optimizer'],
  reservationState: 'formation-record-boolean',
  reservationScope: 'all-three-arrangement-dragons',
  semanticOrder: true,
  derivedValuesPersisted: false,
});
const expected = 'fnv1a64:3253fbb091d67237';
const actual = fnv1a64(descriptor);
if (actual !== expected) throw new Error(`Saved Formation schema-2 audit identity changed: expected ${expected}, received ${actual}`);
console.log(`Saved Formation schema-2 contract: ${actual}`);

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
