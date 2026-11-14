# Protect saved matches

Approved by the maintainer on 2026-11-14: starting a new game or Training
table should ask first when a match is in progress; Cancel preserves it.

## Intent and scope

Prevent accidental loss of a resumable match from the two replacement
buttons on `/play`. Resume continues to open the existing match directly.
Other game entry points and the save format are outside this change.

## Approaches

Use the existing shared Modal and Button primitives. A browser confirmation
would be smaller but offers less control over accessible copy and styling;
a new save-slot system would be a separate feature.

## Behaviour

- Recheck `canResume()` on each launch click, including saves written after
  the page opened. Only resumable matches need confirmation.
- Show a named, described dialog with Cancel first and an explicit replacement
  action. Cancel or Escape dismisses it without changing storage or navigating.
- Confirming clears the save and navigates to the originally requested URL,
  preserving the chosen difficulty, match length and minimum faan.
- With no resumable match, retain the current immediate launch behaviour.
- Use the shared modal's focus trap and dismissal behaviour; add no dependencies.
