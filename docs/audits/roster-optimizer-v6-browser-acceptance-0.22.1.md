# Optimizer v6 production-browser acceptance — 0.22.1

- Date: 2026-07-29
- Build: production Vite output
- Execution path: bundled module Worker, `@bubblyworld/highs-ts`, and production `highs.wasm`
- Desktop viewport: 1280 × 720
- Desktop horizontal overflow: none (`scrollWidth` 1265, `clientWidth` 1265)
- Unexpected console errors or warnings: 0

The real-world fixture is the user-supplied 33-dragon export. The mixed fixture uses the same schema-v5 normalization as local import and persistence. Every browser solution/result hash matched an independent Node execution.

| Fixture | Mode | Armies | Browser wall | Reported total | Solver passes | Exact nodes | Model builds | Certifications | Solution hash | Result hash |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Real world | Best Overall First | 1 | 3.46s | 3.38s | 1 | 5,456 | 0 | 0 | `fnv1a64:0bc19a7b1e68ea47` | `fnv1a64:1fc1abd6a514fddf` |
| Real world | Best Overall First | 5 | 3.55s | 3.47s | 5 | 15,795 | 0 | 0 | `fnv1a64:cb8cdd9d84e03503` | `fnv1a64:d877bc2d461b2fbc` |
| Real world | Best Overall First | 11 | 3.59s | 3.50s | 11 | 17,391 | 0 | 0 | `fnv1a64:9f1e9ac8897508c7` | `fnv1a64:2067bb497b1a2df6` |
| Real world | Highest Raw Power First | 11 | 3.65s | 3.45s | 11 | 5,456 | 0 | 0 | `fnv1a64:e52f8e3190f8554a` | `fnv1a64:3bbeddea890b2159` |
| Real world | Balance Raw Power Across Armies | 11 | 60.13s | 59.96s | 313 | 69 | 1 | 240 | `fnv1a64:0e5b11180746ca77` | `fnv1a64:391d922f7c2041d7` |
| Mixed | Best Overall First | 11 | 2.86s | 2.69s | 11 | 17,391 | 0 | 0 | `fnv1a64:602bc961b92bf43a` | `fnv1a64:1d5575ae4ae6aa96` |

## Interaction checks

- A fresh production page selected Best Overall First and defaulted to 10 armies for 33 eligible dragons.
- Best Overall completed below 15 seconds for 1, 5, and 11 armies.
- Requested/generated counts matched, and the 11-army real and mixed results each displayed 33 unique dragons.
- Count, mode, and roster-progression changes marked the prior result stale and disabled Formation Builder handoff.
- Cancellation during candidate generation terminated the Worker without a new partial result.
- Cancellation after Balanced entered exact solving terminated the Worker without a new partial result.
- Best Overall and Balanced each handed the exact displayed arrangement to Formation Builder.
- The expandable Best Overall explanation displayed the committed relative-power index, Formation Rating, 60% power weight, and 40% rating weight.

## Mobile status

The automated 390 × 844 component acceptance passed, including the compact count control. The in-app production-browser surface available for this run was fixed at 1280 × 720; its security policy rejected creation of a 390-pixel iframe browsing context, and the browser API exposed no viewport emulation. Therefore the production-browser 390 × 844 visual/overflow check remains open. No policy workaround or alternate browser surface was used.
