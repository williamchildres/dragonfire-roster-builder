# Formation Rating v3 tier calibration

Formation Rating v3 uses separate production thresholds derived from all 32,736 ordered formations in the current 33-dragon roster at maximum progression, with every unlocked Habit explicitly set to Level 5. Numeric scoring, relationship weights, redundancy, caps, participation, and placement were not retuned.

The historical v2 distribution supplied the target: 421 Excellent, 3,481 Strong, 13,366 Solid, 13,404 Developing, and 2,064 Weak. The deterministic exhaustive search minimizes cumulative upper-tier deviation, largest cumulative deviation, then individual-tier deviation, followed by the documented conservative threshold tie-break.

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
| Excellent | 421 | 381 | -40 | -9.50% |
| Strong | 3,481 | 3,266 | -215 | -6.18% |
| Solid | 13,366 | 14,116 | +750 | +5.61% |
| Developing | 13,404 | 12,822 | -582 | -4.34% |
| Weak | 2,064 | 2,151 | +87 | +4.22% |

The resulting cumulative counts are 381 Excellent-or-higher, 3,647 Strong-or-higher, 17,763 Solid-or-higher, and 30,585 Developing-or-higher. The ordered calibration objective is 877 total cumulative absolute deviation, 495 largest cumulative deviation, and 1,674 total individual-tier absolute deviation.

V2 thresholds and its deterministic hash remain historical and unchanged. V3 thresholds are committed constants rather than browser-time calculations; the audit independently derives and verifies them.
