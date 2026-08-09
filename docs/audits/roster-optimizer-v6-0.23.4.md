# Optimizer v6 audit — 0.23.4

- Generated: 2026-08-08T23:51:16.342Z
- Contract: 6 / formation-rating-v3 / best-overall-v1
- Execution records: 198
- Independent candidate-pool builds: 6
- Independent exact solver executions: 198
- Every solver execution independent: true
- Forward/reverse equality: true
- No duplicate dragons: true
- Exact reconstruction: true
- Current selections identical to historical optimizer-v5: false
- Current executions changed from historical optimizer-v5: 78
- Approved cumulative current-v5 deltas: 78
- Approved-delta manifest: `sha256:4f315d86257e481b9b8e6f582a904380158c6ca012f8edf967183a9ab4810b7c`
- Exact historical-delta contract valid: true
- Approved 0.23.3 → 0.23.4 release deltas: 62
- Release-delta manifest: `sha256:c4a28f699030bbe3d7af4d4ae90717012ae239279b0220b567eb4fb689cc24cb`
- Failed checks: 0
- Deterministic audit hash: `fnv1a64:1acd71772d85f8a8`

## Maximum Node telemetry

- Candidate generation: 6787.461 ms
- Solver: 105192.123 ms
- Total: 109652.597 ms
- Solver passes: 504
- Exact-search nodes: 17391
- Model builds: 1
- Variables: 5456
- Constraints: 5701
- Skipped phases: 4
- Certification passes: 272

## Semantic hashes

| Fixture | Mode | Count | Solution | Result |
|---|---|---:|---|---|
| mixed | best-overall-first | 1 | `fnv1a64:7f8189080873f9e2` | `fnv1a64:85fa83113c4a0593` |
| mixed | best-overall-first | 2 | `fnv1a64:d11b5281f02ec069` | `fnv1a64:9cbffc82dc118d07` |
| mixed | best-overall-first | 3 | `fnv1a64:4759769ccb300d55` | `fnv1a64:4683410fc4bbbdaf` |
| mixed | best-overall-first | 4 | `fnv1a64:1a6dee6cafbcba6a` | `fnv1a64:ac17d52df2df3ee3` |
| mixed | best-overall-first | 5 | `fnv1a64:a807f19646157df6` | `fnv1a64:24a3ba4f74ed6224` |
| mixed | best-overall-first | 6 | `fnv1a64:6f1db3155e12ca82` | `fnv1a64:c5b2ef84764d1864` |
| mixed | best-overall-first | 7 | `fnv1a64:6d5b557c2b6fc26f` | `fnv1a64:76b258776499b30d` |
| mixed | best-overall-first | 8 | `fnv1a64:16d1d02372b2b834` | `fnv1a64:7efb71fc007f94bc` |
| mixed | best-overall-first | 9 | `fnv1a64:8890547800ade305` | `fnv1a64:1c4b8b49ea7a9e7e` |
| mixed | best-overall-first | 10 | `fnv1a64:302cba077095b01f` | `fnv1a64:a1a6ff9b4f42e4eb` |
| mixed | best-overall-first | 11 | `fnv1a64:602bc961b92bf43a` | `fnv1a64:1d5575ae4ae6aa96` |
| mixed | strongest-first | 1 | `fnv1a64:814e8df025e3fa1d` | `fnv1a64:2cb4a393819bc780` |
| mixed | strongest-first | 2 | `fnv1a64:5472b39db0508346` | `fnv1a64:e5167781e8ad3509` |
| mixed | strongest-first | 3 | `fnv1a64:b9fa1efa69f63ac1` | `fnv1a64:df974bb0e33a6f38` |
| mixed | strongest-first | 4 | `fnv1a64:2592337f40b6d3c3` | `fnv1a64:89f004b2654b03be` |
| mixed | strongest-first | 5 | `fnv1a64:06cd9939874c56bc` | `fnv1a64:a60b7aefedf98bae` |
| mixed | strongest-first | 6 | `fnv1a64:8f74aea8b5ac01e4` | `fnv1a64:0e889eca94fa9531` |
| mixed | strongest-first | 7 | `fnv1a64:dfd77723d66625da` | `fnv1a64:e2c99c657f96ac07` |
| mixed | strongest-first | 8 | `fnv1a64:1e495f096246e53c` | `fnv1a64:449898d255d4103b` |
| mixed | strongest-first | 9 | `fnv1a64:b4c11caff17aa476` | `fnv1a64:3b7844461a2ac620` |
| mixed | strongest-first | 10 | `fnv1a64:395d1156c826a883` | `fnv1a64:72e4e76adbca7589` |
| mixed | strongest-first | 11 | `fnv1a64:c0def0bd47c76395` | `fnv1a64:17b09975599846c9` |
| mixed | balanced | 1 | `fnv1a64:05d24212d34db581` | `fnv1a64:627ac109c6c43b74` |
| mixed | balanced | 2 | `fnv1a64:4d39e338bc2c487a` | `fnv1a64:ee5a8cb354cf5924` |
| mixed | balanced | 3 | `fnv1a64:ed50e9563c4fa83d` | `fnv1a64:b1f39a814b21d126` |
| mixed | balanced | 4 | `fnv1a64:8c0696d9f6bacb58` | `fnv1a64:21ba9a71d2ba453e` |
| mixed | balanced | 5 | `fnv1a64:6663cc26a9aba85d` | `fnv1a64:f6207e626880dcfb` |
| mixed | balanced | 6 | `fnv1a64:be71decdc3ff9956` | `fnv1a64:cbfc314226872423` |
| mixed | balanced | 7 | `fnv1a64:4e677cbdda4e36dc` | `fnv1a64:832e4acd84e119c9` |
| mixed | balanced | 8 | `fnv1a64:ac60100aa5521f84` | `fnv1a64:4f84c07d92c19e09` |
| mixed | balanced | 9 | `fnv1a64:f677b0bf1581f334` | `fnv1a64:31f70546ddf5cc89` |
| mixed | balanced | 10 | `fnv1a64:22e255ceb4e1456a` | `fnv1a64:df88005d7c5da38c` |
| mixed | balanced | 11 | `fnv1a64:fa722b2c75de9c2c` | `fnv1a64:b8d410d8a766d822` |
| maxed | best-overall-first | 1 | `fnv1a64:3669c8df81f2f908` | `fnv1a64:d1a3bd9eedabe195` |
| maxed | best-overall-first | 2 | `fnv1a64:d521101748a53f5a` | `fnv1a64:e59c2518181a163d` |
| maxed | best-overall-first | 3 | `fnv1a64:9fe1d3203403415e` | `fnv1a64:1d620485833b088c` |
| maxed | best-overall-first | 4 | `fnv1a64:e27196dbf4ffdd61` | `fnv1a64:65c5c8f5a9b3d2b5` |
| maxed | best-overall-first | 5 | `fnv1a64:d9dd3d15dca3396a` | `fnv1a64:b121700379800428` |
| maxed | best-overall-first | 6 | `fnv1a64:21e8feefa8d776b4` | `fnv1a64:5c2dfae27fd23fde` |
| maxed | best-overall-first | 7 | `fnv1a64:b7bf8dc858288371` | `fnv1a64:bb94b346236ffd81` |
| maxed | best-overall-first | 8 | `fnv1a64:4e65dea2e364efee` | `fnv1a64:b3ff3260b3e3ee68` |
| maxed | best-overall-first | 9 | `fnv1a64:cb5cc81663e9cd6b` | `fnv1a64:aa57ee02a5ca9766` |
| maxed | best-overall-first | 10 | `fnv1a64:81b8e5c1c57ac1c8` | `fnv1a64:841bfc982667a756` |
| maxed | best-overall-first | 11 | `fnv1a64:27355070ed6c97dd` | `fnv1a64:04bd145d01419949` |
| maxed | strongest-first | 1 | `fnv1a64:99bc2ff8eba54969` | `fnv1a64:d8b4c8484f13fe8d` |
| maxed | strongest-first | 2 | `fnv1a64:8171f7cc5d4be29f` | `fnv1a64:c866a2511c486644` |
| maxed | strongest-first | 3 | `fnv1a64:2d8e370f5a7fc371` | `fnv1a64:9d4fd01e3532c4ab` |
| maxed | strongest-first | 4 | `fnv1a64:4b957f44d717a5f4` | `fnv1a64:cba27d720d5aab47` |
| maxed | strongest-first | 5 | `fnv1a64:f7021baea14159b8` | `fnv1a64:532f9a20d8641ee4` |
| maxed | strongest-first | 6 | `fnv1a64:42c77754f5e3d7b7` | `fnv1a64:fd29889868b6234b` |
| maxed | strongest-first | 7 | `fnv1a64:2ef8f5df7e378df7` | `fnv1a64:34290f15ecfacc52` |
| maxed | strongest-first | 8 | `fnv1a64:cd82440927eb3b49` | `fnv1a64:15f20602115b63ad` |
| maxed | strongest-first | 9 | `fnv1a64:55e9dfd2e3e670f3` | `fnv1a64:6e7ee3cf81f8609b` |
| maxed | strongest-first | 10 | `fnv1a64:95e448328e18770f` | `fnv1a64:baeb7a861cd3bf3f` |
| maxed | strongest-first | 11 | `fnv1a64:20ff99839f6687aa` | `fnv1a64:57e43997f55cecf3` |
| maxed | balanced | 1 | `fnv1a64:3051b253cd61b373` | `fnv1a64:2604d5cd46439a02` |
| maxed | balanced | 2 | `fnv1a64:05f3ec8a83fc853d` | `fnv1a64:b022929123b679df` |
| maxed | balanced | 3 | `fnv1a64:a6e3230d4d7d2ad7` | `fnv1a64:827c48b6b0a1a19d` |
| maxed | balanced | 4 | `fnv1a64:8e90d5e9478dccf5` | `fnv1a64:d170abd4d01d67f4` |
| maxed | balanced | 5 | `fnv1a64:6e4be80e4069d771` | `fnv1a64:e30cfecdfea5e14a` |
| maxed | balanced | 6 | `fnv1a64:c19fa0d566e355f0` | `fnv1a64:e10d3f3831c19c44` |
| maxed | balanced | 7 | `fnv1a64:b8622740fa4482c2` | `fnv1a64:cdede9bd895e1203` |
| maxed | balanced | 8 | `fnv1a64:f42b11ac6a501940` | `fnv1a64:1e332037e5e193ac` |
| maxed | balanced | 9 | `fnv1a64:830469e339cdb3b5` | `fnv1a64:b01f57429f3ffdf7` |
| maxed | balanced | 10 | `fnv1a64:5f03505313f927b7` | `fnv1a64:252d92517387e325` |
| maxed | balanced | 11 | `fnv1a64:afc779639a73b4f3` | `fnv1a64:f6e5ab71e4a37182` |
| all-one | best-overall-first | 1 | `fnv1a64:931df24090719b97` | `fnv1a64:f91d66a84fb82636` |
| all-one | best-overall-first | 2 | `fnv1a64:cb9f49e887dce4ed` | `fnv1a64:38f7146e559e040c` |
| all-one | best-overall-first | 3 | `fnv1a64:152b8065c0a90919` | `fnv1a64:dfb4b3840d06d7b2` |
| all-one | best-overall-first | 4 | `fnv1a64:92d191c20bcd31b2` | `fnv1a64:60eeba262cf7f2f7` |
| all-one | best-overall-first | 5 | `fnv1a64:730696f23d7f394f` | `fnv1a64:b7a1514cec7eb60c` |
| all-one | best-overall-first | 6 | `fnv1a64:a1cf57e4989ac98b` | `fnv1a64:8e50f6f1ca719ae0` |
| all-one | best-overall-first | 7 | `fnv1a64:d10373152482af49` | `fnv1a64:1f722e7b5b9c2f57` |
| all-one | best-overall-first | 8 | `fnv1a64:05ec5e8b319220a2` | `fnv1a64:eaa04c087922f174` |
| all-one | best-overall-first | 9 | `fnv1a64:3ca63592bfabaa21` | `fnv1a64:e6d0785f2eda11db` |
| all-one | best-overall-first | 10 | `fnv1a64:b763a81f8fcc3c2d` | `fnv1a64:494603e50fe75597` |
| all-one | best-overall-first | 11 | `fnv1a64:88b6dd68b0aeed48` | `fnv1a64:1bcf013208bdc1b3` |
| all-one | strongest-first | 1 | `fnv1a64:1b7e734ef74563fd` | `fnv1a64:161d9571ba0f2cb3` |
| all-one | strongest-first | 2 | `fnv1a64:38d6371b0e884ab4` | `fnv1a64:c6bec2d4ce42a9f9` |
| all-one | strongest-first | 3 | `fnv1a64:31a890684b3d6ad3` | `fnv1a64:b146436756da327f` |
| all-one | strongest-first | 4 | `fnv1a64:5203456963e3ef44` | `fnv1a64:c40a632a69675fc6` |
| all-one | strongest-first | 5 | `fnv1a64:a2557f99acd12f71` | `fnv1a64:0f526debad573fbc` |
| all-one | strongest-first | 6 | `fnv1a64:5af85bb95bfa0e1a` | `fnv1a64:3df358f384233b6a` |
| all-one | strongest-first | 7 | `fnv1a64:c0a6979ed0f875d7` | `fnv1a64:9c0693dd6960318c` |
| all-one | strongest-first | 8 | `fnv1a64:436b60411d55b469` | `fnv1a64:3b6b46127ecb6c9b` |
| all-one | strongest-first | 9 | `fnv1a64:394eec9914b4bc75` | `fnv1a64:e71ce22d5052f52d` |
| all-one | strongest-first | 10 | `fnv1a64:23331403d68bcf60` | `fnv1a64:4c387fd4e31cfa19` |
| all-one | strongest-first | 11 | `fnv1a64:eedaf3c13130e956` | `fnv1a64:72d4292686d19f44` |
| all-one | balanced | 1 | `fnv1a64:5e854f7904edd64f` | `fnv1a64:b75b0f083432c081` |
| all-one | balanced | 2 | `fnv1a64:2ece5ef8cf44c096` | `fnv1a64:4b8e531b3608a574` |
| all-one | balanced | 3 | `fnv1a64:7b51beabe40dc339` | `fnv1a64:8f2debae7e1ba97f` |
| all-one | balanced | 4 | `fnv1a64:a20495aeea13a3a4` | `fnv1a64:54bb6156ce9b3678` |
| all-one | balanced | 5 | `fnv1a64:508a43ba9aa2ab11` | `fnv1a64:480449cf8b83efcc` |
| all-one | balanced | 6 | `fnv1a64:120deee97f94cc70` | `fnv1a64:19c4f51b8267d605` |
| all-one | balanced | 7 | `fnv1a64:6b174e4ba59d98bf` | `fnv1a64:9ee5d7a5320e307a` |
| all-one | balanced | 8 | `fnv1a64:df3fa6288a5bc58c` | `fnv1a64:56b87b659805725b` |
| all-one | balanced | 9 | `fnv1a64:d37210f514b750ad` | `fnv1a64:ce809e7882f48a30` |
| all-one | balanced | 10 | `fnv1a64:d31a235b56057221` | `fnv1a64:2cb09752281c6906` |
| all-one | balanced | 11 | `fnv1a64:47332df5c52c61fa` | `fnv1a64:1a1d1c3f67d67a59` |

The historical optimizer-v5 artifact remains unchanged at `fnv1a64:e5ac2432442f5cb0`; current selection deltas are attributed to corrected Formation Rating candidate generation.
Operational telemetry and generation time are excluded from this deterministic audit identity.
