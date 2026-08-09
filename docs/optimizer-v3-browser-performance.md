# Formation Rating v3 optimizer performance

> Historical v0.21 / PR #211 artifact. The public optimizer strategies described here were retired in v0.22.

This audit covers the exact production optimizer in PR #211. Numeric objectives
remain HiGHS-proven with zero MIP gap. Primary/Backup stable ordering is then
solved on the fully fixed numeric-optimal face by an exact ordered search: it
reconstructs every fixed wave objective with integer values, enforces dragon
disjointness and Power-Aware cutoff membership, exhausts every earlier stable
prefix, and returns the first jointly feasible Primary/Backup allocation.
Bounded tests compare that result with both brute force and HiGHS.

## Profiling finding

Before the correction, stable-key refinement dominated tie-dense solves:
232–385 seconds and 206–217 stable-key solver passes for Primary/Backup.
Mixed rating-vector refinement was the next-largest phase (about 42 seconds).
Candidate generation was 6–9 seconds. Model reconstruction and scalar phases
were material but not dominant.

The correction:

- reuses the placement comparison and Formation Rating v3 result already
  produced during candidate generation;
- replaces one minimum-rating constraint per formation variable with exact
  indicator constraints per distinct rating;
- skips structurally constant scalar objectives;
- fixes exact Power-Aware and Primary/Backup exclusions before later work;
- caches certification only under an identical fixed-model identity; and
- replaces repeated Primary/Backup stable-key MILPs with the exact secondary
  optimal-face search described above.

No numeric phase, objective order, stable candidate order, coefficient scale,
allocation, or published hash changed.

## Node before/after

Seconds, one forward execution. The before column is the committed review
baseline; after values are the compact final phase profile.

| Fixture | Strategy | Before | After | Passes before | Passes after | Certifications before / after |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Mixed | Best Ten | 104 | 104.9 | 122 | 122 | 0 / 0 |
| Mixed | Primary/Backup | 368–377 | 102.3 | 241 | 22 | 13 / 0 |
| Mixed | Power-Aware | 56–58 | 13.8 | 135 | 19 | 0 / 0 |
| Maxed | Best Ten | 36–37 | 36.6 | 107 | 107 | — / 2 |
| Maxed | Primary/Backup | 122–123 | 101.2 | 28 | 24 | — / 0 |
| Maxed | Power-Aware | 33–34 | 20.4 | 25 | 21 | — / 0 |
| All-one | Best Ten | 89–90 | 89.5 | 118 | 118 | 0 / 0 |
| All-one | Primary/Backup | 466 | 77.2 | 243 | 14 | 12 / 0 |
| All-one | Power-Aware | 170–171 | 47.8 | 230 | 11 | 2 / 0 |

The final mixed Primary/Backup numeric phases were led by rating-vector work
(48.7s), followed by rarity (15.0s), relationship count (9.6s), relationship
value (9.0s), minimum rating (8.1s), and total rating (6.9s). Its exact
stable-face search took 0.3s over 17,876 search nodes. The all-one
Primary/Backup stable-face search was pathological but bounded: 28.8s over
2,270,044 nodes, still well below the release ceiling.

## Production-browser acceptance

Chrome 150 on Windows 10, AMD Ryzen 7 7800X3D (8 cores / 16 logical
processors), 32 GB RAM. These production-build runs used the emitted Web
Worker and HiGHS WASM assets with the raw audit fixtures.

| Fixture | Strategy | Candidate generation | Solver | Total | Wall | Solver passes | Certifications |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mixed | Best Ten | 3.54s | 93.36s | 96.90s | 96.92s | 122 | 0 |
| Mixed | Primary/Backup | 3.55s | 94.17s | 97.72s | 97.75s | 22 | 0 |
| Mixed | Power-Aware | 3.43s | 7.66s | 11.09s | 11.12s | 19 | 0 |
| All-one | Best Ten | 2.79s | 77.87s | 80.66s | 80.69s | 118 | 0 |
| All-one | Primary/Backup | 2.20s | 58.22s | 60.43s | 60.45s | 14 | 0 |
| All-one | Power-Aware | 2.21s | 32.62s | 34.84s | 34.86s | 11 | 0 |

All six completed without cancellation, met their release ceilings, and
returned the protected solution/result hashes.

## Fixed-point evidence

The current ordered power-of-ten audit over all 35,904 placements found 63 collisions
at scale 1, 139 at scale 10, and zero at scales 100 through 1,000,000. Scale
100 is therefore the smallest audited collision-free scale. The published
production scale remains 1,000,000; it is safe for ten-formation totals and
HiGHS coefficients, and retaining it preserves every optimizer identity.
