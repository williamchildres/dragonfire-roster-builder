# Formation Rating v3 tier calibration

Formation Rating v3 keeps the production thresholds while auditing all 35,904 ordered formations in the current 34-dragon roster at maximum progression, with every unlocked Habit explicitly set to Level 5. Numeric scoring, relationship weights, redundancy, caps, participation, and placement were not retuned for Moondancer.

The 0.23.5 exhaustive audit derives the same thresholds. Its resulting distribution is used as the current 34-dragon lock, while historical 33-dragon v2 and v3 distributions remain immutable evidence.

Selected v3 thresholds:

| Tier | Minimum score |
| --- | ---: |
| Excellent | 66 |
| Strong | 53 |
| Solid | 34 |
| Developing | 5 |

Resulting distribution:

| Tier | Target | V3 count | Count deviation | Percentage deviation |
| --- | ---: | ---: | ---: | ---: |
| Excellent | 385 | 385 | 0 | 0% |
| Strong | 3,451 | 3,451 | 0 | 0% |
| Solid | 15,805 | 15,805 | 0 | 0% |
| Developing | 13,875 | 13,875 | 0 | 0% |
| Weak | 2,388 | 2,388 | 0 | 0% |

The resulting cumulative counts are 385 Excellent-or-higher, 3,836 Strong-or-higher, 19,641 Solid-or-higher, and 33,516 Developing-or-higher. The derived thresholds remain exactly 66 / 53 / 34 / 5.

V2 thresholds and its deterministic hash remain historical and unchanged. V3 thresholds are committed constants rather than browser-time calculations; the audit independently derives and verifies them.
