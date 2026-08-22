# Guest identity now, with claimable player tokens

Online play uses guest identity: a server-issued opaque player token persisted
on the device, plus a seat-claim token carried in the room's invite/rejoin link.
No accounts, no login wall — consistent with the standing constraint in
`docs/design/online.md` that nothing in the game requires an account.

Accounts are wanted later, which is why the token is **server-issued and
opaque** rather than derived from the device: a future account can claim
existing player tokens and inherit their history. A device-derived id would
orphan every player's record on the day accounts ship, and that is the part of
this decision that is expensive to reverse.

## Consequences

- Anyone holding a seat-claim link can take that seat. Acceptable for a private
  room of four friends — the same trust model as the room code — and a further
  reason ranked play stays deferred.
- Cross-device rejoin works by opening the rejoin link, so a dead phone does not
  cost a player their seat mid-match.
