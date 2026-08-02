# Optimizer v6 audit — 0.23.3

- Generated: 2026-08-02T06:58:42.201Z
- Contract: 6 / formation-rating-v3 / best-overall-v1
- Execution records: 198
- Independent candidate-pool builds: 6
- Independent exact solver executions: 198
- Every solver execution independent: true
- Forward/reverse equality: true
- No duplicate dragons: true
- Exact reconstruction: true
- Current selections identical to historical optimizer-v5: false
- Current executions changed from historical optimizer-v5: 50
- Failed checks: 0
- Deterministic audit hash: `fnv1a64:0f61190ace8f1e22`

## Maximum Node telemetry

- Candidate generation: 7010.734 ms
- Solver: 114416.261 ms
- Total: 119125.145 ms
- Solver passes: 504
- Exact-search nodes: 17391
- Model builds: 1
- Variables: 5456
- Constraints: 5701
- Skipped phases: 4
- Certification passes: 273

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
| maxed | best-overall-first | 3 | `fnv1a64:ca88e033baa9d41c` | `fnv1a64:19c8cc752df254e4` |
| maxed | best-overall-first | 4 | `fnv1a64:20609d5e44d3853f` | `fnv1a64:3c7412e18b5a0689` |
| maxed | best-overall-first | 5 | `fnv1a64:7a14d65072ead1a0` | `fnv1a64:d161a24c87a4ee25` |
| maxed | best-overall-first | 6 | `fnv1a64:68e89852bcbfc264` | `fnv1a64:fe1d321db5faf0b0` |
| maxed | best-overall-first | 7 | `fnv1a64:d6714f49891a5e51` | `fnv1a64:f6e08f9608e13a5f` |
| maxed | best-overall-first | 8 | `fnv1a64:ff11b8b21b250c50` | `fnv1a64:995d1cc648ef091a` |
| maxed | best-overall-first | 9 | `fnv1a64:3524ae0716ec38a7` | `fnv1a64:980949f4335f6e16` |
| maxed | best-overall-first | 10 | `fnv1a64:2e7da706587da750` | `fnv1a64:13d57ca37ac1a2eb` |
| maxed | best-overall-first | 11 | `fnv1a64:2426c6d883687105` | `fnv1a64:9e99678e609856a2` |
| maxed | strongest-first | 1 | `fnv1a64:99bc2ff8eba54969` | `fnv1a64:d8b4c8484f13fe8d` |
| maxed | strongest-first | 2 | `fnv1a64:500d0004652386f5` | `fnv1a64:c853871b98405fbe` |
| maxed | strongest-first | 3 | `fnv1a64:c1aa80617980c631` | `fnv1a64:c5803e2db73ace02` |
| maxed | strongest-first | 4 | `fnv1a64:7f8f248f09322c70` | `fnv1a64:376c11ccfc9f81b1` |
| maxed | strongest-first | 5 | `fnv1a64:2de2f217e037982b` | `fnv1a64:62aebf63586d7209` |
| maxed | strongest-first | 6 | `fnv1a64:7654f712bb4e65f4` | `fnv1a64:f3e426953190e38f` |
| maxed | strongest-first | 7 | `fnv1a64:2811fd7a392dfd2d` | `fnv1a64:676cab36685766af` |
| maxed | strongest-first | 8 | `fnv1a64:a691c9e263d8c9ef` | `fnv1a64:a82e4eb573b764a5` |
| maxed | strongest-first | 9 | `fnv1a64:97aaaefbe1c084ff` | `fnv1a64:1a802c705a759d91` |
| maxed | strongest-first | 10 | `fnv1a64:9f974ee69f81f5b8` | `fnv1a64:f64f30cf7ae3b608` |
| maxed | strongest-first | 11 | `fnv1a64:32161dde049d112e` | `fnv1a64:f5e1451bad742928` |
| maxed | balanced | 1 | `fnv1a64:3051b253cd61b373` | `fnv1a64:2604d5cd46439a02` |
| maxed | balanced | 2 | `fnv1a64:aae746a4f4e9f647` | `fnv1a64:e1926ea5c16f14df` |
| maxed | balanced | 3 | `fnv1a64:a6e3230d4d7d2ad7` | `fnv1a64:827c48b6b0a1a19d` |
| maxed | balanced | 4 | `fnv1a64:8e90d5e9478dccf5` | `fnv1a64:d170abd4d01d67f4` |
| maxed | balanced | 5 | `fnv1a64:6c4390197ac4f389` | `fnv1a64:c27831b2261c5c07` |
| maxed | balanced | 6 | `fnv1a64:c19fa0d566e355f0` | `fnv1a64:e10d3f3831c19c44` |
| maxed | balanced | 7 | `fnv1a64:9c71d617d9feedf2` | `fnv1a64:5c81c5430fb260aa` |
| maxed | balanced | 8 | `fnv1a64:f42b11ac6a501940` | `fnv1a64:1e332037e5e193ac` |
| maxed | balanced | 9 | `fnv1a64:830469e339cdb3b5` | `fnv1a64:b01f57429f3ffdf7` |
| maxed | balanced | 10 | `fnv1a64:5f03505313f927b7` | `fnv1a64:252d92517387e325` |
| maxed | balanced | 11 | `fnv1a64:3d350bc3184b437f` | `fnv1a64:c6f2e57707a43835` |
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
| all-one | balanced | 4 | `fnv1a64:5253d3befce2ad40` | `fnv1a64:b0549b3c31c57bd4` |
| all-one | balanced | 5 | `fnv1a64:cd6c4fd65c5603b5` | `fnv1a64:08e016c8c5d166b1` |
| all-one | balanced | 6 | `fnv1a64:a1cc3d1b26758ecc` | `fnv1a64:4a604cfc8d8bb984` |
| all-one | balanced | 7 | `fnv1a64:8b59aa6a0566a59f` | `fnv1a64:d949539495a06314` |
| all-one | balanced | 8 | `fnv1a64:ee5a674d051bb76a` | `fnv1a64:5163f2980bada024` |
| all-one | balanced | 9 | `fnv1a64:bfb29ec3c15909c5` | `fnv1a64:c56c29e68fdd5315` |
| all-one | balanced | 10 | `fnv1a64:35b0e865b5bdf8e3` | `fnv1a64:bf1908efee11761c` |
| all-one | balanced | 11 | `fnv1a64:2848c91b47bd2036` | `fnv1a64:a1831387e0cf2a29` |

The historical optimizer-v5 artifact remains unchanged at `fnv1a64:e5ac2432442f5cb0`; current selection deltas are attributed to corrected Formation Rating candidate generation.
Operational telemetry and generation time are excluded from this deterministic audit identity.
