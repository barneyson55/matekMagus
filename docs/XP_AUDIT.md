# XP Audit

## Scope
- `xp_config.js` topic weights/base XP + `main.js` XP utilities (`calculateTestXp`, level curve, level names)
- Constitution references: `constitution/xp/xp_formula.md` + `constitution/xp/xp_roadmap.md`
- Audit date: 2026-01-31

## Findings
### Aligned
- Topic weights and base XP values in `xp_config.js` match the tables in `xp_formula.md` for all main topics, subtopics, and topics.
- Grade multipliers (1→0.0, 2→1.0, 3→1.1, 4→1.2, 5→1.3) and difficulty multipliers (konnyu 0.7, normal 1.0, nehez 1.4) match the constitution.
- Tier multipliers (fotema 1.5, altema 1.2, temakor 1.0) match the constitution.
- `calculateTestXp` applies the constitution formula: `round(baseXP * topicWeight * tierMult * gradeMult * diffMult)` and only applies difficulty for alt/temakor.
- Level curve parameters in `xp_config.js` (used by `main.js`) (`LEVEL_BASE_XP = 50`, `LEVEL_GROWTH = 1.07`, `MAX_LEVEL = 50`) match `xp_formula.md`/`xp_roadmap.md`.
- `LEVEL_NAMES` contains 50 names and matches the labels listed in `xp_roadmap.md`.
- Max-level behavior is explicit: total XP is clamped to the XP cap (20,325), and level stats are computed against the clamped value.
- XP header values (Lv, XP total, and “Következő szint” tooltip) are sourced from `calculateLevelStats` and match the `xp_roadmap.md` per-level XP table.

### Deltas / Gaps
- **Legacy fallback XP rewards:** `XP_REWARDS_FALLBACK = { konnyu: 120, normal: 200, nehez: 320 }` is used when a topic is missing or lacks base XP. These values are not defined in the constitution and can produce off-formula XP for unmapped topics.
- **TopicId aliasing:** Code treats `specialis_fuggvenyek` as the canonical ID and aliases `abszolut_ertek_fuggveny`. The constitution only lists `abszolut_ertek_fuggveny`. This is intentional for migration, but it is a schema delta.
- **Difficulty defaulting:** If difficulty is missing, code defaults to `normal` for alt/temakor. The constitution does not explicitly define this fallback.
- **Practice XP streams:** Practice XP (1/2/3 by difficulty) is recorded via `save-practice-xp` but is not specified in the constitution’s test XP formula.

## Rules (constitution vs implementation)
- **Test XP formula:** `round(baseXP(topicId) * topicWeight(topicId) * tierMult(levelType) * gradeMultiplier(grade) * diffMultiplier(if alt/temakor))`.
- **Award rule:** XP is granted on first successful completion (grade ≥ 2); grade improvements grant only the delta to the new best XP; no gain on regressions.
- **Level curve:** Exponential growth with base 50 and growth 1.07 across 50 levels, with roadmap names applied 1–50.

## Metrics
- Constitution total XP to max (1–50): **20,325 XP**.
- Code XP cap at max level: **20,325 XP**.
- Level 50 segment size (formula): **1,376 XP**.

## Scripted Metrics
<!-- xp_audit:begin -->
Generated: 2026-01-25

### Level curve (code)
- MAX_LEVEL: 50
- LEVEL_BASE_XP: 50
- LEVEL_GROWTH: 1.07
- Total XP to reach level 50 (code table end): 20,325
- Level 50 segment size (formula): 1,376
- Formula total XP (levels 1-50): 20,325
- XP cap (clamp at max level): 20,325

### Per-level XP deltas (code table)
| Level | XP to next | XP start | XP end |
| --- | --- | --- | --- |
| 1 | 50 | 0 | 50 |
| 2 | 54 | 50 | 104 |
| 3 | 57 | 104 | 161 |
| 4 | 61 | 161 | 222 |
| 5 | 66 | 222 | 288 |
| 6 | 70 | 288 | 358 |
| 7 | 75 | 358 | 433 |
| 8 | 80 | 433 | 513 |
| 9 | 86 | 513 | 599 |
| 10 | 92 | 599 | 691 |
| 11 | 98 | 691 | 789 |
| 12 | 105 | 789 | 894 |
| 13 | 113 | 894 | 1,007 |
| 14 | 120 | 1,007 | 1,127 |
| 15 | 129 | 1,127 | 1,256 |
| 16 | 138 | 1,256 | 1,394 |
| 17 | 148 | 1,394 | 1,542 |
| 18 | 158 | 1,542 | 1,700 |
| 19 | 169 | 1,700 | 1,869 |
| 20 | 181 | 1,869 | 2,050 |
| 21 | 193 | 2,050 | 2,243 |
| 22 | 207 | 2,243 | 2,450 |
| 23 | 222 | 2,450 | 2,672 |
| 24 | 237 | 2,672 | 2,909 |
| 25 | 254 | 2,909 | 3,163 |
| 26 | 271 | 3,163 | 3,434 |
| 27 | 290 | 3,434 | 3,724 |
| 28 | 311 | 3,724 | 4,035 |
| 29 | 332 | 4,035 | 4,367 |
| 30 | 356 | 4,367 | 4,723 |
| 31 | 381 | 4,723 | 5,104 |
| 32 | 407 | 5,104 | 5,511 |
| 33 | 436 | 5,511 | 5,947 |
| 34 | 466 | 5,947 | 6,413 |
| 35 | 499 | 6,413 | 6,912 |
| 36 | 534 | 6,912 | 7,446 |
| 37 | 571 | 7,446 | 8,017 |
| 38 | 611 | 8,017 | 8,628 |
| 39 | 654 | 8,628 | 9,282 |
| 40 | 700 | 9,282 | 9,982 |
| 41 | 749 | 9,982 | 10,731 |
| 42 | 801 | 10,731 | 11,532 |
| 43 | 857 | 11,532 | 12,389 |
| 44 | 917 | 12,389 | 13,306 |
| 45 | 981 | 13,306 | 14,287 |
| 46 | 1,050 | 14,287 | 15,337 |
| 47 | 1,124 | 15,337 | 16,461 |
| 48 | 1,202 | 16,461 | 17,663 |
| 49 | 1,286 | 17,663 | 18,949 |
| 50 | 0 | 18,949 | 20,325 |

### Reward source inventory (grade 5 assumptions)
- Topics counted: fotema 5, altema 20, temakor 70
- Alias excluded from totals: abszolut_ertek_fuggveny -> specialis_fuggvenyek
- Achievement XP total: 625 (7 of 9 achievements grant XP)
- Practice XP: per-question rewards recorded; global XP clamped at cap.

### Reachability (tests + achievements)
| Scenario | Test XP | Level (test) | Test+Ach XP | Level (test+ach) | >= code max | >= constitution max |
| --- | --- | --- | --- | --- | --- | --- |
| konnyu only (1 diff) | 12,634 | 44 | 13,259 | 44 | no/no | no/no |
| normal only (1 diff) | 16,512 | 48 | 17,137 | 48 | no/no | no/no |
| nehez only (1 diff) | 21,676 | 50 | 22,301 | 50 | yes/yes | yes/yes |
| all difficulties | 43,684 | 50 | 44,309 | 50 | yes/yes | yes/yes |

- Reachability columns show `test-only / test+ach` results for each scenario.

<!-- xp_audit:end -->
