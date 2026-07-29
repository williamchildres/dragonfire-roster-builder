# Optimizer v5 production-browser acceptance — 0.22.0

- Date: 2026-07-29
- Build: production Vite output
- Execution path: bundled Web Worker, `@bubblyworld/highs-ts`, and production `highs.wasm`
- Desktop viewport: 1440 × 1000
- Mobile viewport request: 390 × 844 (375 CSS px after browser chrome)
- Unexpected console errors or warnings: 0

The mixed fixture uses the same roster normalization applied by schema-v5 import and local persistence. Every run matched the corresponding Node solution and result hashes.

| Fixture | Mode | Armies | Candidate + solver total | Solver passes | Exact nodes | Model builds | Variables | Constraints | Skipped | Certifications | Solution hash | Result hash |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Mixed | Strongest First | 1 | 2.75s | 1 | 1 | 0 | 5,456 | 0 | 0 | 0 | `fnv1a64:e68b8426a5628ae8` | `fnv1a64:547fd93ba9c84ea7` |
| Mixed | Strongest First | 5 | 2.76s | 5 | 2,364 | 0 | 5,456 | 12 | 0 | 0 | `fnv1a64:5544755a78ee0937` | `fnv1a64:b8238fef6d839811` |
| Mixed | Strongest First | 10 | 2.78s | 10 | 5,427 | 0 | 5,456 | 27 | 0 | 0 | `fnv1a64:7dc9fe4fe77a4bde` | `fnv1a64:a6cf62c7d7bc67be` |
| Mixed | Strongest First | 11 | 2.79s | 11 | 5,456 | 0 | 5,456 | 30 | 0 | 0 | `fnv1a64:31bc652c5b5d8b56` | `fnv1a64:5e5383870b704a08` |
| Mixed | Balanced | 1 | 2.86s | 0 | 5,456 | 0 | 0 | 0 | 4 | 0 | `fnv1a64:35d8f8d53f8b7e78` | `fnv1a64:6ffd0e3fc22c2b54` |
| Mixed | Balanced | 5 | 65.20s | 333 | 140 | 1 | 5,456 | 3,644 | 0 | 173 | `fnv1a64:c262745b867514ec` | `fnv1a64:4335bf3c1bbeebb6` |
| Mixed | Balanced | 10 | 97.21s | 484 | 119 | 1 | 5,456 | 5,608 | 0 | 268 | `fnv1a64:f773cc3927992b2b` | `fnv1a64:99568871de105f17` |
| Mixed | Balanced | 11 | 110.41s | 504 | 113 | 1 | 5,456 | 5,701 | 0 | 272 | `fnv1a64:a97668d985497980` | `fnv1a64:d9ff4ecc90186c7a` |
| All-one | Strongest First | 11 | 2.24s | 11 | 5,455 | 0 | 5,456 | 30 | 0 | 0 | `fnv1a64:542c78d93d16b253` | `fnv1a64:078ea8d763f7dc70` |
| All-one | Balanced | 11 | 34.44s | 277 | 237 | 1 | 5,456 | 5,486 | 0 | 273 | `fnv1a64:a41fc28cc1290c63` | `fnv1a64:b32b5d1150bed977` |

## Interaction checks

- All ten runs completed without cancellation and stayed below their applicable ceiling.
- Every result generated the requested formation count and used exactly three unique dragons per formation.
- Count changes, allocation-mode changes, and a roster progression import marked the prior result stale.
- Cancellation during candidate generation terminated the Worker without returning a new partial result.
- Cancellation after the Balanced run entered “Proving the exact allocation…” terminated the Worker without returning a partial Balanced result.
- Strongest First and Balanced each handed the exact displayed arrangement to Formation Builder.
- Balanced displayed formation powers from strongest to weakest while retaining canonical hash identity independent of display order.
- The 390 × 844 mobile check had no horizontal document overflow; desktop also had no horizontal overflow.

