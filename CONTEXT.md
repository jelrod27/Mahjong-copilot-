# 16 Bit Mahjong

A Hong Kong Mahjong learning and solo play platform, extending to private-room
online play. This glossary fixes the vocabulary shared by the engine, the
curriculum, and the UI.

## Language

### Structure of play

**Hand**:
One deal, from shuffle to a win or an exhaustive draw (局). The unit that a
dealer and a set of seat winds belong to.
_Avoid_: Game, Deal, Round

**Round**:
Four hands sharing one prevailing wind (圈). A full match has four — East,
South, West, North.
_Avoid_: Wind, Game

**Match**:
The whole contest: four rounds, or the East round alone in a quick match. Hong
Kong sources call this a "Game"; we do not, because that word is ambiguous here.
_Avoid_: Game, Session, Series

**Game**:
Banned as a domain term. It means the whole contest to a Hong Kong player, a
single hand in older parts of this codebase, and the product as a whole to
everyone else. Say Hand, Round, or Match.

### Online play

**Room**:
The private container that players join by code or link. A room outlives the
matches played inside it, so the same group can play again without re-sharing
the code.
_Avoid_: Table, Lobby, Game room

**Seat**:
One of four positions in a room. Carries the seat wind (門風), the score, the
melds, and the discards. A seat is continuous for the life of a match no matter
who is driving it.
_Avoid_: Position, Slot, Player

**Player**:
A human identity that can occupy a seat. Distinct from the seat itself.
_Avoid_: User, Account, Participant

**Occupant**:
Whoever is currently driving a seat — a player, or the AI that stands in when a
player disconnects. A seat's occupant may change mid-match; the seat does not.
_Avoid_: Controller, Owner, Driver

**Host**:
The player who created a room. Chooses the room's settings — match mode, faan
minimum, whether assists are on.
_Avoid_: Owner, Admin, Creator

**Online match**:
A match whose four seats were all occupied by players at the deal. Stays an
online match even if AI later stands in for a departed occupant. A table filled
with AI because nobody was available is not one.
_Avoid_: Real match, Human match, Ranked match

**Assists**:
The learning aids shown alongside play — suggested discards, danger colouring,
shanten heat, faan projection. A room-level setting, visible to everyone at the
table, so no seat has a hidden advantage.
_Avoid_: Hints, Tutor, Training mode

---

Tile, meld, and scoring vocabulary (Chow, Pung, Kong, Fan, Tenpai, …) lives in
`web/content/glossary.ts`, which is player-facing and consumed by both the
teaching surface and the live game. It is not duplicated here.
