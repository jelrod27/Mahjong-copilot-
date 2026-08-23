# The claim window is simultaneous, and prompts only eligible players

After a discard, every player who has a legal claim is prompted at once and may
claim or pass in any order. The window resolves when all eligible players have
acted, or when the deadline expires. Players with no legal claim are not
prompted at all and are not waited for.

Previously the window was a sequential poll: `handleClaim` and `handlePass`
rejected any player who was not `currentPlayerIndex`, and every non-discarder
had to act even with no legal claim. Against instant AI this is invisible.
Against three humans it is up to three consecutive decision windows per discard,
and it forces two people with nothing to do to tap "pass" to unblock the game.
`resolveClaimRequests` already resolves priority over a set with no notion of
arrival order and the correct Hong Kong turn-order tie-break, so nothing about
network jitter can change an outcome.

## Consequences

**The timing of the window leaks information, and this is accepted.** A discard
nobody can claim resumes immediately; a discard someone could claim but declines
takes a beat. An attentive opponent learns which of their discards were live,
which is real information about hands.

The alternative — a uniform window on every discard so timing carries no signal
— was rejected on arithmetic. A uniform window cannot close early (closing early
when nobody is eligible *is* the leak), so it is a fixed cost on all ~60 discards
in a hand. At the current 10-second window that is ten minutes per hand; staying
playable would mean cutting the window to about two seconds, which is five times
less thinking time than beginners get today. Eligible-only keeps the full 10s
(and the 20s training preset) exactly when it matters and costs nothing when it
does not.

Online play mitigates the leak with a short uniform floor before the next draw,
so the rhythm never snaps from zero to ten seconds. That floor is deliberately
**not** applied in solo play, where there is no opponent to leak to and it would
add roughly 45 seconds per hand for no benefit.

**Do not "fix" the leak without re-reading this.** Reintroducing a uniform
window would cost minutes per hand. If ranked play against strangers is ever
built, revisit — the trade-off inverts when opponents are not friends.
