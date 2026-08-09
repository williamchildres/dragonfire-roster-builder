# Optimizer v6 audit — 0.23.5

- Generated: 2026-08-09T18:43:01.681Z
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
- Approved-delta manifest: `sha256:0e3a22029d39195b28b662222aa4f32a9dea807ecd2fabdd166dc32e87dbfc91`
- Exact historical-delta contract valid: true
- Approved 0.23.4 → 0.23.5 release deltas: 198
- Release-delta manifest: `sha256:d233f49e09484e10cc724d2601ae74597ee98c2a9ea409996f7728f171c9f14c`
- Failed checks: 0
- Deterministic audit hash: `fnv1a64:38b92faea349b548`

## Maximum Node telemetry

- Candidate generation: 8184.03 ms
- Solver: 151662.444 ms
- Total: 157410.426 ms
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
| mixed | balanced | 9 | `fnv1a64:467f50c6bd1c6d28` | `fnv1a64:f9ef0deaeab91363` |
| mixed | balanced | 10 | `fnv1a64:c90be3266fe4b21e` | `fnv1a64:1d1a29f769e28b1b` |
| mixed | balanced | 11 | `fnv1a64:a8754f68faa20fa7` | `fnv1a64:2e7eada0f31c1352` |
| maxed | best-overall-first | 1 | `fnv1a64:3669c8df81f2f908` | `fnv1a64:2ab3ecbb9b06a93a` |
| maxed | best-overall-first | 2 | `fnv1a64:b43e70fa21ff8660` | `fnv1a64:cef8ac2cc46edf6f` |
| maxed | best-overall-first | 3 | `fnv1a64:2dca27adee7e6fcb` | `fnv1a64:21043a330c431228` |
| maxed | best-overall-first | 4 | `fnv1a64:b8d6961c5bf28853` | `fnv1a64:09a2e502ae7a203a` |
| maxed | best-overall-first | 5 | `fnv1a64:2b7e09073d0f6aac` | `fnv1a64:6a8fb83fa12597b2` |
| maxed | best-overall-first | 6 | `fnv1a64:3de1480ad87f4650` | `fnv1a64:1cdfc6b5025dfc79` |
| maxed | best-overall-first | 7 | `fnv1a64:1e602f711f2224d5` | `fnv1a64:6810ddfb746d9c6e` |
| maxed | best-overall-first | 8 | `fnv1a64:bdbaecba2e5afb6e` | `fnv1a64:0423b5607b0a7e0d` |
| maxed | best-overall-first | 9 | `fnv1a64:fd7b41124b9cfdac` | `fnv1a64:7876df0fb4d162ec` |
| maxed | best-overall-first | 10 | `fnv1a64:9444d06ca7ba3621` | `fnv1a64:e989019a86fb08e9` |
| maxed | best-overall-first | 11 | `fnv1a64:274b57d765582925` | `fnv1a64:2b7b36b645537bbe` |
| maxed | strongest-first | 1 | `fnv1a64:99bc2ff8eba54969` | `fnv1a64:a3afec9db0cc8566` |
| maxed | strongest-first | 2 | `fnv1a64:5653a79f8aff4e18` | `fnv1a64:ccbb9bdceea11ef0` |
| maxed | strongest-first | 3 | `fnv1a64:78d8910022b725e4` | `fnv1a64:e59dd8bf202de6c4` |
| maxed | strongest-first | 4 | `fnv1a64:7183b004758647a2` | `fnv1a64:cfd0d509062682d1` |
| maxed | strongest-first | 5 | `fnv1a64:118b55cd45b41b7f` | `fnv1a64:3d65ce6be775651b` |
| maxed | strongest-first | 6 | `fnv1a64:d1d4e473187ea70c` | `fnv1a64:7b076b60f87f12df` |
| maxed | strongest-first | 7 | `fnv1a64:e96b1bc1729a1f6d` | `fnv1a64:e2b3f7ff29eb2640` |
| maxed | strongest-first | 8 | `fnv1a64:502c68c2825f0315` | `fnv1a64:5021796af8fac55d` |
| maxed | strongest-first | 9 | `fnv1a64:45baf2e43fbcc6b7` | `fnv1a64:560685ae638bdd9f` |
| maxed | strongest-first | 10 | `fnv1a64:36540608b4bc2751` | `fnv1a64:74bbf97562446515` |
| maxed | strongest-first | 11 | `fnv1a64:da61f4dfde030efe` | `fnv1a64:6c56e75e00e34d92` |
| maxed | balanced | 1 | `fnv1a64:3051b253cd61b373` | `fnv1a64:f75bcae47526b8bf` |
| maxed | balanced | 2 | `fnv1a64:78693f7e3083f13c` | `fnv1a64:d8ea2c2911f276a1` |
| maxed | balanced | 3 | `fnv1a64:bab94071d89890ec` | `fnv1a64:6434fd107db6ebcb` |
| maxed | balanced | 4 | `fnv1a64:be25110d4a710ee9` | `fnv1a64:a4e436cd64b70b59` |
| maxed | balanced | 5 | `fnv1a64:f92d0bcc1a4283b6` | `fnv1a64:602372c3bde9a6b3` |
| maxed | balanced | 6 | `fnv1a64:eb86d6099a290063` | `fnv1a64:e00c88aab0fb250d` |
| maxed | balanced | 7 | `fnv1a64:68e91847f4ba1476` | `fnv1a64:4bf2f1248c5aa0ae` |
| maxed | balanced | 8 | `fnv1a64:dfdb747aec49050d` | `fnv1a64:d601e35850ef50eb` |
| maxed | balanced | 9 | `fnv1a64:777981ac6c1c45de` | `fnv1a64:7a98ca7a1c87c215` |
| maxed | balanced | 10 | `fnv1a64:3740533824ab64f8` | `fnv1a64:3a8acbf07e070c65` |
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
