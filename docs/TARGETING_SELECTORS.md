# Recipient targeting selectors

Recipient selectors determine whether a verified provider signal can create a relationship to a particular formation recipient. They run before reliability and relationship values. A selector can remove a candidate; it never changes class weights, caps, activation probability, or optimizer objectives.

## Existing selectors

- `highest-stat` resolves only one unique leader when all relevant combat-stat values are known. Ties (`highest-stat-tie`) or missing values (`missing-stat-data`) remain unresolved. Signals that describe sibling effects share a `selectionGroupId`, so both effects use the same resolved recipient.
- `breed-one` selects one verified eligible ally of a named breed, honors `includeSelf`, and never invents a tie-break. One candidate resolves; multiple candidates remain unresolved as `multiple-eligible-breed-candidates`; no candidates produce `no-eligible-breed-candidates`.
- `position-priority` follows a verified lane preference and its established self rule.
- `adjacent-group` resolves only when the eligible adjacent set does not exceed the verified recipient count.
- `unresolved-group` deliberately creates no recipient-specific relationship when the group membership rule is unknown.

Release 0.23.5 generalizes `highest-stat` and adds `breed-one` for Moondancer without changing the established capability-priority contract.

## Moondancer selectors

`moondancer-crescent-blade-recipient` and `moondancer-new-moon-recipient` are separate `breed-one` groups for one other Sentinel. Their selections are deliberately independent because the source never says the two abilities share a target. Crescent Blade's Tactical Damage and Recovery trigger branches share the Crescent Blade group, preventing sibling branches from selecting different Sentinels.

`moondancer-reactive-instincts-recipient` is a grouped `highest-stat` selector for Instinct. A unique highest-Instinct ally receives both Instinct and Initiative support. A tie stays unresolved and formation order, position, ID, and power do not break it.

## Capability-priority one

```ts
interface CapabilityPriorityRecipientSelector {
  kind: 'capability-priority-one';
  priorityTag: SynergyTag;
  recipientCount: 1;
  includeSelf: boolean;
  selectionGroupId: string;
}
```

The evaluator builds the complete eligible formation pool before considering an individual provider-beneficiary relationship. It then inspects only each dragon's active `outputs` signals for the exact priority tag. An output is active only when its Star Rank, Dragon Level, and provider-position requirements are met. `supports` signals never establish that the dragon deals a damage type.

- One priority candidate resolves as the selected recipient.
- Multiple priority candidates remain unresolved with reason `multiple-priority-candidates`.
- With no priority candidates, one eligible fallback resolves.
- Multiple fallback candidates remain unresolved with reason `multiple-fallback-candidates`.
- Missing profile capability data remains unresolved with reason `missing-capability-data` whenever it could change the selected priority set.

Unresolved selection creates no recipient-specific numeric relationship. It retains structured evidence: selector kind, group ID, status, selected ID if resolved, all eligible IDs, priority IDs, fallback IDs, recipient count, unresolved reason, ability IDs, and sibling signal IDs.

## Blazing Fury

`syrax-blazing-fury-first-strike` and `syrax-blazing-fury-fire-support` both use:

- priority tag `damage:fire`;
- recipient count 1;
- established self-eligible `Ally` semantics;
- selection group `syrax-blazing-fury-recipient`.

The group is resolved once for the formation/progression evaluation and reused by both signals. Self eligibility may affect the candidate pool, but the relationship layer still prohibits Syrax-to-Syrax scoring.

Caraxes alone as the active Fire producer receives both applicable Blazing Fury relationships. Seasmoke alone receives Fire support but has no fabricated First-Strike payoff. Caraxes and Seasmoke together remain an unresolved priority tie: neither is treated as guaranteed, while unrelated relationships such as Seasmoke Intelligence support to Caraxes remain active.
