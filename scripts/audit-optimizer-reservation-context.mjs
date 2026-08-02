const descriptor = JSON.stringify({
  version: 'optimizer-reservation-context-v1',
  inputs: ['exclusion-enabled', 'sorted-resolved-excluded-dragon-ids', 'effective-eligible-roster-fingerprint', 'allocation-mode', 'formation-count', 'optimizer-v6-request-identity'],
  excludes: ['formation-names', 'formation-order', 'unreserved-formations', 'ui-state', 'sync-state'],
  coreOptimizerContract: 6,
});
const expected = 'fnv1a64:1eeea8e535b98658';
const actual = fnv1a64(descriptor);
if (actual !== expected) throw new Error(`Optimizer reservation-context audit identity changed: expected ${expected}, received ${actual}`);
console.log(`Optimizer reservation context: ${actual}`);

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
