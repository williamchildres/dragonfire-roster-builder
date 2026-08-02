# Saved Formation reservations 0.23.1 audit

Dragonfire Lab 0.23.1 adds three independent deterministic identities:

- Saved Formation schema 2: `fnv1a64:3253fbb091d67237`
- reservation invariant: `fnv1a64:0afe66181d1e7fe3`
- optimizer reservation context: `fnv1a64:1eeea8e535b98658`

The historical schema-1 artifact remains `fnv1a64:1e1f6e4c02946489` and is still validated by the unchanged historical audit script.

Schema 2 adds only the semantic `reserved` boolean to each saved record. The reservation invariant restricts reservation to complete current-roster formations, all three exact arrangement identities, and one reserved owner per dragon. Duplicates, Save as New, and optimizer-saved records begin unreserved.

`optimizer-reservation-context-v1` covers exclusion enabled/disabled, sorted actually excluded IDs, effective eligible-roster identity, allocation mode, formation count, and the optimizer-v6 request identity. Formation names/order and unrelated unreserved records are excluded. The projection runs before the unchanged optimizer-v6 request and does not alter scoring, candidates, comparators, solution hashes, or result hashes.
