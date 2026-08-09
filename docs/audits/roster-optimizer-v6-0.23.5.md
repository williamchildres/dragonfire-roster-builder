# Optimizer v6 audit — 0.23.5

- Generated: 2026-08-09T15:56:38.686Z
- Contract: 6 / formation-rating-v3 / best-overall-v1
- Execution records: 198
- Independent candidate-pool builds: 6
- Independent exact solver executions: 198
- Every solver execution independent: true
- Forward/reverse equality: true
- No duplicate dragons: true
- Exact reconstruction: true
- Current selections identical to historical optimizer-v5: false
- Current executions changed from historical optimizer-v5: 96
- Approved cumulative current-v5 deltas: 96
- Approved-delta manifest: `sha256:b09524e954e3cefad9787f2cb4d97f918139d339a6dea504c47929696865399c`
- Exact historical-delta contract valid: true
- Approved 0.23.4 → 0.23.5 release deltas: 198
- Release-delta manifest: `sha256:0a0a1ac9d1429cdf1f7b9c2f82e5d2ee81780e01080f1156ff1daff12c109f5b`
- Failed checks: 0
- Deterministic audit hash: `fnv1a64:4919638a23435778`

## Maximum Node telemetry

- Candidate generation: 8302.996 ms
- Solver: 159608.774 ms
- Total: 165590.863 ms
- Solver passes: 534
- Exact-search nodes: 19569
- Model builds: 1
- Variables: 5984
- Constraints: 6133
- Skipped phases: 4
- Certification passes: 299

## Semantic hashes

| Fixture | Mode | Count | Solution | Result |
|---|---|---:|---|---|
| mixed | best-overall-first | 1 | `fnv1a64:7f8189080873f9e2` | `fnv1a64:953059c73f336f04` |
| mixed | best-overall-first | 2 | `fnv1a64:d11b5281f02ec069` | `fnv1a64:411aff7c1d28704a` |
| mixed | best-overall-first | 3 | `fnv1a64:4759769ccb300d55` | `fnv1a64:d59e3567b6985930` |
| mixed | best-overall-first | 4 | `fnv1a64:1a6dee6cafbcba6a` | `fnv1a64:d35313d38dba122c` |
| mixed | best-overall-first | 5 | `fnv1a64:a807f19646157df6` | `fnv1a64:2d4fc1d49eaa7f86` |
| mixed | best-overall-first | 6 | `fnv1a64:6f1db3155e12ca82` | `fnv1a64:a8a95d472b1f87cc` |
| mixed | best-overall-first | 7 | `fnv1a64:6d5b557c2b6fc26f` | `fnv1a64:fadc4e589ccd85cc` |
| mixed | best-overall-first | 8 | `fnv1a64:16d1d02372b2b834` | `fnv1a64:f9380225b99e73b6` |
| mixed | best-overall-first | 9 | `fnv1a64:7edb8de0b501459e` | `fnv1a64:d2b62d195c1fdc9f` |
| mixed | best-overall-first | 10 | `fnv1a64:77111cc6141ef6af` | `fnv1a64:b722f287c2c2f570` |
| mixed | best-overall-first | 11 | `fnv1a64:974a0dae9e046f6f` | `fnv1a64:f8666a93f6cca45b` |
| mixed | strongest-first | 1 | `fnv1a64:814e8df025e3fa1d` | `fnv1a64:2a33af926f7c2a45` |
| mixed | strongest-first | 2 | `fnv1a64:5472b39db0508346` | `fnv1a64:26d4e1acc620b566` |
| mixed | strongest-first | 3 | `fnv1a64:b9fa1efa69f63ac1` | `fnv1a64:b466516da87fc76b` |
| mixed | strongest-first | 4 | `fnv1a64:2592337f40b6d3c3` | `fnv1a64:179ac92dfd27f222` |
| mixed | strongest-first | 5 | `fnv1a64:06cd9939874c56bc` | `fnv1a64:e8b7b83108d03fa6` |
| mixed | strongest-first | 6 | `fnv1a64:8f74aea8b5ac01e4` | `fnv1a64:6a98bbde65b932ad` |
| mixed | strongest-first | 7 | `fnv1a64:dfd77723d66625da` | `fnv1a64:dde6dedc78c1a075` |
| mixed | strongest-first | 8 | `fnv1a64:1e495f096246e53c` | `fnv1a64:1850d7c76b55b1af` |
| mixed | strongest-first | 9 | `fnv1a64:a68f6aa0147826d6` | `fnv1a64:ebde71d029a3b762` |
| mixed | strongest-first | 10 | `fnv1a64:f5a8057ea76cfcb8` | `fnv1a64:0de1fa5028fd6766` |
| mixed | strongest-first | 11 | `fnv1a64:57d38c65f2645a79` | `fnv1a64:179dcc6986ad5438` |
| mixed | balanced | 1 | `fnv1a64:05d24212d34db581` | `fnv1a64:145be5c34dda4a95` |
| mixed | balanced | 2 | `fnv1a64:4d39e338bc2c487a` | `fnv1a64:1e716306550c1166` |
| mixed | balanced | 3 | `fnv1a64:ed50e9563c4fa83d` | `fnv1a64:220f40058cce9d52` |
| mixed | balanced | 4 | `fnv1a64:8c0696d9f6bacb58` | `fnv1a64:cf04e5e0571db031` |
| mixed | balanced | 5 | `fnv1a64:6663cc26a9aba85d` | `fnv1a64:729fe7b4723d6311` |
| mixed | balanced | 6 | `fnv1a64:be71decdc3ff9956` | `fnv1a64:c49d4ab398f2bfec` |
| mixed | balanced | 7 | `fnv1a64:4e677cbdda4e36dc` | `fnv1a64:f4f6a51efbe0112b` |
| mixed | balanced | 8 | `fnv1a64:ac60100aa5521f84` | `fnv1a64:f375940c5cc78680` |
| mixed | balanced | 9 | `fnv1a64:02505f3ec35bdfd8` | `fnv1a64:fede084821637cf6` |
| mixed | balanced | 10 | `fnv1a64:c90be3266fe4b21e` | `fnv1a64:1d1a29f769e28b1b` |
| mixed | balanced | 11 | `fnv1a64:a8754f68faa20fa7` | `fnv1a64:2e7eada0f31c1352` |
| maxed | best-overall-first | 1 | `fnv1a64:3669c8df81f2f908` | `fnv1a64:2ab3ecbb9b06a93a` |
| maxed | best-overall-first | 2 | `fnv1a64:4865c167ef87c4f5` | `fnv1a64:502b49c8926f91d9` |
| maxed | best-overall-first | 3 | `fnv1a64:18062513f127d752` | `fnv1a64:f95e54d7ec85de1a` |
| maxed | best-overall-first | 4 | `fnv1a64:31a5cf5124c5f742` | `fnv1a64:7075c3fcb22fe835` |
| maxed | best-overall-first | 5 | `fnv1a64:8b17b3680b58d254` | `fnv1a64:17dc9845022182cf` |
| maxed | best-overall-first | 6 | `fnv1a64:ee62eb03848d40bd` | `fnv1a64:16716d0ce6b766d2` |
| maxed | best-overall-first | 7 | `fnv1a64:1cbb51a543ff714e` | `fnv1a64:2d4cdf1873f465b9` |
| maxed | best-overall-first | 8 | `fnv1a64:7fc76c0d19e05f3b` | `fnv1a64:622766f22b3cf10b` |
| maxed | best-overall-first | 9 | `fnv1a64:93941e82b6ac3497` | `fnv1a64:64d174c7f37ec15e` |
| maxed | best-overall-first | 10 | `fnv1a64:81b881ebf2b40458` | `fnv1a64:ea8417686ba99045` |
| maxed | best-overall-first | 11 | `fnv1a64:f99c13b0eadb9f4b` | `fnv1a64:f673a0109ea42afa` |
| maxed | strongest-first | 1 | `fnv1a64:99bc2ff8eba54969` | `fnv1a64:a3afec9db0cc8566` |
| maxed | strongest-first | 2 | `fnv1a64:66b97fadf2911807` | `fnv1a64:7e595898847fb919` |
| maxed | strongest-first | 3 | `fnv1a64:98a4abfe118382a0` | `fnv1a64:0c88359fc653ad94` |
| maxed | strongest-first | 4 | `fnv1a64:1626e242dbdf0301` | `fnv1a64:d3f06dec738a91c1` |
| maxed | strongest-first | 5 | `fnv1a64:38b6315983569df4` | `fnv1a64:132fba3a24a559de` |
| maxed | strongest-first | 6 | `fnv1a64:409e3c5ab2a0e746` | `fnv1a64:7c1863247e609662` |
| maxed | strongest-first | 7 | `fnv1a64:3536ddb60592566c` | `fnv1a64:1bc3f1404260ba8d` |
| maxed | strongest-first | 8 | `fnv1a64:3980523bac1a56f1` | `fnv1a64:65341a128839e41b` |
| maxed | strongest-first | 9 | `fnv1a64:b1926ac1b850a6d3` | `fnv1a64:21c3f4e4d8e2a0d3` |
| maxed | strongest-first | 10 | `fnv1a64:c16dc124ab43d1ec` | `fnv1a64:155be7f7208c37f0` |
| maxed | strongest-first | 11 | `fnv1a64:e4c27a239024378f` | `fnv1a64:bd107d118b7d2a80` |
| maxed | balanced | 1 | `fnv1a64:3051b253cd61b373` | `fnv1a64:f75bcae47526b8bf` |
| maxed | balanced | 2 | `fnv1a64:6b81e2e6b64b2701` | `fnv1a64:cb184b468c8fa60b` |
| maxed | balanced | 3 | `fnv1a64:418ab25e16905f1b` | `fnv1a64:daefe08db5ad02ec` |
| maxed | balanced | 4 | `fnv1a64:9e24a13115f7d182` | `fnv1a64:6b02ed7449c9ed78` |
| maxed | balanced | 5 | `fnv1a64:42dbfcfaf8b4c4c6` | `fnv1a64:59b944c56a23e1f6` |
| maxed | balanced | 6 | `fnv1a64:eb86d6099a290063` | `fnv1a64:e00c88aab0fb250d` |
| maxed | balanced | 7 | `fnv1a64:a0761cc3839c7fca` | `fnv1a64:8e87e2cf5ed03a24` |
| maxed | balanced | 8 | `fnv1a64:dfdb747aec49050d` | `fnv1a64:d601e35850ef50eb` |
| maxed | balanced | 9 | `fnv1a64:777981ac6c1c45de` | `fnv1a64:7a98ca7a1c87c215` |
| maxed | balanced | 10 | `fnv1a64:45a77bf050d307b3` | `fnv1a64:3d9208c620dfd0e5` |
| maxed | balanced | 11 | `fnv1a64:0c9f1459cf52aef6` | `fnv1a64:421cec1ce8556089` |
| all-one | best-overall-first | 1 | `fnv1a64:931df24090719b97` | `fnv1a64:5a7b0f49d2399f99` |
| all-one | best-overall-first | 2 | `fnv1a64:6416a808b23f9ac1` | `fnv1a64:416882a71297b0dd` |
| all-one | best-overall-first | 3 | `fnv1a64:0a75a04f2a4afcbb` | `fnv1a64:2f4c9bbe92e629dd` |
| all-one | best-overall-first | 4 | `fnv1a64:84e3535548d1500b` | `fnv1a64:3b751310da91c5b3` |
| all-one | best-overall-first | 5 | `fnv1a64:294c7a7c8c28aeea` | `fnv1a64:b60b65d3138c9c59` |
| all-one | best-overall-first | 6 | `fnv1a64:be9a6a5b8e02ee30` | `fnv1a64:f11381eecbac05fd` |
| all-one | best-overall-first | 7 | `fnv1a64:2f5a06bfe4707c0c` | `fnv1a64:ddb17388c4260cd1` |
| all-one | best-overall-first | 8 | `fnv1a64:785086c9950c54ad` | `fnv1a64:3ca1c51fa96879ed` |
| all-one | best-overall-first | 9 | `fnv1a64:0cb01d10ed9ef0ae` | `fnv1a64:f7962d6f353f7d87` |
| all-one | best-overall-first | 10 | `fnv1a64:cedf05c26dc427a6` | `fnv1a64:4e111c4537a42ed8` |
| all-one | best-overall-first | 11 | `fnv1a64:f629cf663d935735` | `fnv1a64:126e6a1391655f4d` |
| all-one | strongest-first | 1 | `fnv1a64:1b7e734ef74563fd` | `fnv1a64:1615c3efc28a6df3` |
| all-one | strongest-first | 2 | `fnv1a64:ef3c7ebdcc6eca48` | `fnv1a64:1a59c1c0b447813b` |
| all-one | strongest-first | 3 | `fnv1a64:fc0f9a42ca751775` | `fnv1a64:f5f578b0c5e82c8b` |
| all-one | strongest-first | 4 | `fnv1a64:f9800031587a449c` | `fnv1a64:2e3646586868d409` |
| all-one | strongest-first | 5 | `fnv1a64:878017e89c2aa1f1` | `fnv1a64:657968466b7f8cd7` |
| all-one | strongest-first | 6 | `fnv1a64:d588b4561faedf17` | `fnv1a64:b64918be4f6b4958` |
| all-one | strongest-first | 7 | `fnv1a64:cfefc895a36a7932` | `fnv1a64:485d2554be0df58e` |
| all-one | strongest-first | 8 | `fnv1a64:55c1cd919627276c` | `fnv1a64:a70ce7e004e5c0cf` |
| all-one | strongest-first | 9 | `fnv1a64:ce56efcc98c12b7c` | `fnv1a64:0e0f09f71a558487` |
| all-one | strongest-first | 10 | `fnv1a64:8909851a8ff2ee49` | `fnv1a64:2735f79e4a0b6826` |
| all-one | strongest-first | 11 | `fnv1a64:2ec25a4416401171` | `fnv1a64:72471308e3162550` |
| all-one | balanced | 1 | `fnv1a64:5e854f7904edd64f` | `fnv1a64:196a1380acb0b4c3` |
| all-one | balanced | 2 | `fnv1a64:e03b08b186be6862` | `fnv1a64:4f1633478b9e9160` |
| all-one | balanced | 3 | `fnv1a64:06c6b7d037c044f7` | `fnv1a64:b7c0044c8e49f0df` |
| all-one | balanced | 4 | `fnv1a64:50cf6636997c3374` | `fnv1a64:b7f8723fb6ab95cf` |
| all-one | balanced | 5 | `fnv1a64:461b4672ae10cd0d` | `fnv1a64:5837ae8925e5a2f3` |
| all-one | balanced | 6 | `fnv1a64:41d611187858e84d` | `fnv1a64:2612eb7723dc0605` |
| all-one | balanced | 7 | `fnv1a64:3707d596c7358158` | `fnv1a64:502be92ac4fa75d2` |
| all-one | balanced | 8 | `fnv1a64:d5130a09c0769f0f` | `fnv1a64:c69649e8496ce4eb` |
| all-one | balanced | 9 | `fnv1a64:9bdc975a192bf3e3` | `fnv1a64:0b23fc49d4ebc11f` |
| all-one | balanced | 10 | `fnv1a64:29768e57899a2402` | `fnv1a64:7a7b2e6a16f45a33` |
| all-one | balanced | 11 | `fnv1a64:1dd756a43cd16a1e` | `fnv1a64:54fa415839ce00c7` |

The historical optimizer-v5 artifact remains unchanged at `fnv1a64:e5ac2432442f5cb0`; current selection deltas are attributed to corrected Formation Rating candidate generation.
Operational telemetry and generation time are excluded from this deterministic audit identity.
