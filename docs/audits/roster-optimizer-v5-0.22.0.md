# Optimizer v5 audit — 0.22.0

- Generated: 2026-07-29T23:17:43.159Z
- Contract: 5 / formation-rating-v3
- Executions: 132
- Independent candidate-pool builds: 6
- Independent exact solver executions: 132
- Every solver execution independent: true
- Forward/reverse equality: true
- No duplicate dragons: true
- Failed checks: 0
- Deterministic audit hash: `fnv1a64:e5ac2432442f5cb0`

## Maximum Node telemetry

- Candidate generation: 6399.082 ms
- Solver: 121870.828 ms
- Total: 125643.707 ms
- Solver passes: 504
- Exact-search nodes: 5456
- Variables: 5456
- Constraints: 5701

## Semantic hashes

| Fixture | Mode | Count | Solution | Result |
|---|---|---:|---|---|
| mixed | strongest-first | 1 | `fnv1a64:e68b8426a5628ae8` | `fnv1a64:547fd93ba9c84ea7` |
| mixed | strongest-first | 2 | `fnv1a64:239cae5af0fcdc25` | `fnv1a64:f405eacd3c15a731` |
| mixed | strongest-first | 3 | `fnv1a64:2a80c627bfc8d402` | `fnv1a64:bccb93b76e530b1b` |
| mixed | strongest-first | 4 | `fnv1a64:b892a77a40fa0578` | `fnv1a64:f5a40539e9b3cd2f` |
| mixed | strongest-first | 5 | `fnv1a64:5544755a78ee0937` | `fnv1a64:b8238fef6d839811` |
| mixed | strongest-first | 6 | `fnv1a64:f31b6779b74cc8b7` | `fnv1a64:fc9525e081a3244a` |
| mixed | strongest-first | 7 | `fnv1a64:58bcf65b10952fe5` | `fnv1a64:7199d771ff42d48e` |
| mixed | strongest-first | 8 | `fnv1a64:7cc7bca6471ca505` | `fnv1a64:f1b8df7a85bb9942` |
| mixed | strongest-first | 9 | `fnv1a64:ea020146b82edfdf` | `fnv1a64:3f43bdad62a60295` |
| mixed | strongest-first | 10 | `fnv1a64:7dc9fe4fe77a4bde` | `fnv1a64:a6cf62c7d7bc67be` |
| mixed | strongest-first | 11 | `fnv1a64:31bc652c5b5d8b56` | `fnv1a64:5e5383870b704a08` |
| mixed | balanced | 1 | `fnv1a64:35d8f8d53f8b7e78` | `fnv1a64:6ffd0e3fc22c2b54` |
| mixed | balanced | 2 | `fnv1a64:3d1244eb66b32fed` | `fnv1a64:d15df71d0d86061f` |
| mixed | balanced | 3 | `fnv1a64:8a0bc5868a263922` | `fnv1a64:6b0f9b8f9f4c16e3` |
| mixed | balanced | 4 | `fnv1a64:262b3d832c1c59f5` | `fnv1a64:edb9f50464beb1ee` |
| mixed | balanced | 5 | `fnv1a64:c262745b867514ec` | `fnv1a64:4335bf3c1bbeebb6` |
| mixed | balanced | 6 | `fnv1a64:8029ccdeade9f883` | `fnv1a64:5b6744851515b71c` |
| mixed | balanced | 7 | `fnv1a64:33cabade11dc955d` | `fnv1a64:da3cb0bb378ee8b9` |
| mixed | balanced | 8 | `fnv1a64:e5848038c9eb610d` | `fnv1a64:3bb591c2f40f4aa1` |
| mixed | balanced | 9 | `fnv1a64:3782cce919dbf6c9` | `fnv1a64:d65f105d568c025c` |
| mixed | balanced | 10 | `fnv1a64:f773cc3927992b2b` | `fnv1a64:99568871de105f17` |
| mixed | balanced | 11 | `fnv1a64:a97668d985497980` | `fnv1a64:d9ff4ecc90186c7a` |
| maxed | strongest-first | 1 | `fnv1a64:a5c1b84ac0979340` | `fnv1a64:3a5b8a0c0cf94a76` |
| maxed | strongest-first | 2 | `fnv1a64:2052688133bdf5d4` | `fnv1a64:34b8e198303883cf` |
| maxed | strongest-first | 3 | `fnv1a64:5730efd52b89d248` | `fnv1a64:70ffdbb18bfb9132` |
| maxed | strongest-first | 4 | `fnv1a64:7802b5d747a17ddb` | `fnv1a64:7dd017468fd0f472` |
| maxed | strongest-first | 5 | `fnv1a64:3c947b0af1fb553e` | `fnv1a64:6bf67f77ec9bb436` |
| maxed | strongest-first | 6 | `fnv1a64:3079fd6ef63e2eb3` | `fnv1a64:ee3ffb08f7a8cb12` |
| maxed | strongest-first | 7 | `fnv1a64:a6d268d5b4bcab52` | `fnv1a64:aa0d1885168b0964` |
| maxed | strongest-first | 8 | `fnv1a64:67267cda4384aa8c` | `fnv1a64:9931cccf98febcdb` |
| maxed | strongest-first | 9 | `fnv1a64:473dd485b2fc7bb2` | `fnv1a64:b65722c6e4bf6c90` |
| maxed | strongest-first | 10 | `fnv1a64:67d8c113c34b18c1` | `fnv1a64:3474ce83a46c79c4` |
| maxed | strongest-first | 11 | `fnv1a64:e4a0b6727b69c973` | `fnv1a64:b14394ce0f7bbc8b` |
| maxed | balanced | 1 | `fnv1a64:6f8e9212f40b03b2` | `fnv1a64:ebf1cb48104ed0e1` |
| maxed | balanced | 2 | `fnv1a64:c48f522e3ca641ac` | `fnv1a64:12617f1c9bacd5ef` |
| maxed | balanced | 3 | `fnv1a64:e668d0e3b478190e` | `fnv1a64:0bccbe7e40161a5c` |
| maxed | balanced | 4 | `fnv1a64:8c3195a6e667ad8e` | `fnv1a64:67fc93b3cc884052` |
| maxed | balanced | 5 | `fnv1a64:9e43c0d884198c92` | `fnv1a64:853f1bd83650ec3d` |
| maxed | balanced | 6 | `fnv1a64:ecdcd4f7a36c85c6` | `fnv1a64:226bcca9103e0a71` |
| maxed | balanced | 7 | `fnv1a64:cc82e12bd52826e1` | `fnv1a64:de78568794a5211f` |
| maxed | balanced | 8 | `fnv1a64:40fa6c2c1daedd7b` | `fnv1a64:3e23145684083b4a` |
| maxed | balanced | 9 | `fnv1a64:0961c63a9b8f4094` | `fnv1a64:1e93735a4b07dd42` |
| maxed | balanced | 10 | `fnv1a64:64f50ac2007d43a2` | `fnv1a64:9f179be56b53f985` |
| maxed | balanced | 11 | `fnv1a64:7f9cb23b5dbef6c4` | `fnv1a64:8f07c52892eba02a` |
| all-one | strongest-first | 1 | `fnv1a64:a5b19654a45aaea1` | `fnv1a64:2299661a8f8bcecf` |
| all-one | strongest-first | 2 | `fnv1a64:32a5935ab6ba2906` | `fnv1a64:c9cf289d023e5b04` |
| all-one | strongest-first | 3 | `fnv1a64:4da77abcd7963ee5` | `fnv1a64:627e8ae9a575b0f5` |
| all-one | strongest-first | 4 | `fnv1a64:b09d9b74488aeb64` | `fnv1a64:a18e2e6cd0e1c20c` |
| all-one | strongest-first | 5 | `fnv1a64:faef7fee1ea95590` | `fnv1a64:4f822c757a0d2f5a` |
| all-one | strongest-first | 6 | `fnv1a64:68d5fa6792d93cfd` | `fnv1a64:33461757c581eb7e` |
| all-one | strongest-first | 7 | `fnv1a64:c2e185b1a23d3efa` | `fnv1a64:e73c9e6c6fc2788b` |
| all-one | strongest-first | 8 | `fnv1a64:73183ea59865d386` | `fnv1a64:527ee5c94a4ce1b6` |
| all-one | strongest-first | 9 | `fnv1a64:84ff75f5732139d2` | `fnv1a64:916d4eea8a3cf714` |
| all-one | strongest-first | 10 | `fnv1a64:0cc01c24a64a5f55` | `fnv1a64:c922eca75a91b0ca` |
| all-one | strongest-first | 11 | `fnv1a64:542c78d93d16b253` | `fnv1a64:078ea8d763f7dc70` |
| all-one | balanced | 1 | `fnv1a64:f671fff3305a0bbb` | `fnv1a64:14b1eb06cb92d09a` |
| all-one | balanced | 2 | `fnv1a64:2406b2b1ace2600c` | `fnv1a64:a625cce628561913` |
| all-one | balanced | 3 | `fnv1a64:13e5e18375e426d7` | `fnv1a64:083810d343cea4a5` |
| all-one | balanced | 4 | `fnv1a64:574783d4c59735ff` | `fnv1a64:33b64dc5ca187188` |
| all-one | balanced | 5 | `fnv1a64:4f4bdd80137bf39e` | `fnv1a64:39f71a2a2773fbba` |
| all-one | balanced | 6 | `fnv1a64:8e4faf7207b3e349` | `fnv1a64:873c56b5aef7bbaa` |
| all-one | balanced | 7 | `fnv1a64:e8dbd561a1f7e09e` | `fnv1a64:7125e88992459f1b` |
| all-one | balanced | 8 | `fnv1a64:75fbb29a75309db3` | `fnv1a64:2839cb9aeff0517c` |
| all-one | balanced | 9 | `fnv1a64:e2b24e05b7ba4f18` | `fnv1a64:d2d3dbf4b5b326ba` |
| all-one | balanced | 10 | `fnv1a64:451f7ac1ef166f1a` | `fnv1a64:46296e741e1bcf79` |
| all-one | balanced | 11 | `fnv1a64:a41fc28cc1290c63` | `fnv1a64:b32b5d1150bed977` |

Historical v0.21 audit artifacts are preserved unchanged. Operational telemetry and generation time are excluded from the deterministic audit hash.
