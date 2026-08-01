const descriptor = JSON.stringify({
  format: 'dragonfire-lab-saved-formations',
  schemaVersion: 1,
  storageKey: 'dragonfire-roster-lab:saved-formations',
  maximumRecords: 50,
  maximumNameLength: 80,
  arrangementPositions: ['left-flank', 'vanguard', 'right-flank'],
  evaluationModes: ['current-roster', 'planning'],
  sources: ['formation-builder', 'optimizer'],
  semanticOrder: true,
  derivedValuesPersisted: false,
});
const expected = 'fnv1a64:1e1f6e4c02946489';
let hash = 0xcbf29ce484222325n;
for (const byte of new TextEncoder().encode(descriptor)) {
  hash ^= BigInt(byte);
  hash = BigInt.asUintN(64, hash * 0x100000001b3n);
}
const actual = `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
if (actual !== expected) throw new Error(`Saved Formation Library audit identity changed: expected ${expected}, received ${actual}`);
console.log(`Saved Formation Library contract: ${actual}`);
console.log('Schema 1 · 50 records · 80-character names · semantic collection order · no derived values persisted');
