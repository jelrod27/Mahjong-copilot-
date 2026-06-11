# Story Bible: The Jade Parlour

## Premise

The Jade Parlour was the most famous mahjong house in the city — nine floors
of clacking tiles, each floor harder than the last, crowned by the Jade Room
where the Parlour Master held the top seat for thirty years undefeated.

Then, quietly, it went dark. The regulars drifted away. The Master stopped
taking challengers. Dust settled on the felt.

You are a newcomer who walks in on a rainy evening because the door was
unlocked and the lights on the ground floor were still on. Uncle Gam — the
front-desk man, ex-champion, the only soul still tending the place — looks
you over and slides a tray of tiles across the counter.

"The Parlour only sleeps," he says. "Wake it up. One floor at a time."

Every floor you win re-lights that floor of the building. The climb IS the
learning journey: each rival's obsession is the skill that floor teaches.
When the top floor lights up, the Parlour Master takes the seat across from
you — one last match to bring the house all the way back.

## Tone

SNES-era JRPG warmth: punchy, character-forward, a little funny, never
cynical. Dialogue is short — three lines max on screen, always skippable.
The Parlour itself is a character: warm lamplight, worn felt, the sound of
tiles. No tragedy backstory dumps; melancholy is allowed only as texture
(a quiet building waking up).

Teaching voice belongs to ONE character: Uncle Gam. Rivals never explain
rules; they embody them. Gam's tips read like an old player talking, not a
tooltip ("That west wind is doing nothing for you, kid. In my day we called
those 'rent-free tiles'.").

## The Building

| Floor | Name | Rival | Tier | Obsession / what it teaches |
|---|---|---|---|---|
| G | The Front Desk | Uncle Gam (mentor) | — | Home base: tutorials, daily hand, review |
| 1 | The Open Table | Mei | Novice | Basic play, melds, first wins |
| 2 | The Sprint Room | Riko | Novice+ | Chows and tempo: cheap hands, fast |
| 3 | The Builder's Den | Bo | Novice+ | Pungs, kongs, claiming with purpose |
| 4 | The Counting House | Hana | Adept | Efficiency: shanten, tile counting |
| 5 | The Quiet Table | Auntie Pearl | Adept+ | Defense: safe tiles, reading discards |
| 6 | The Collection | Aki | Adept+ | Faan building: one-suit hands, value |
| 7 | The Reading Room | Sora | Master- | Waits, opponent reading, patience |
| 8 | The Last Door | Yuki | Master | Everything, sharpened to a point |
| 9 | The Jade Room | Master Jin | Master+ | The final exam |

Floors 1-3 are the Novice wing (engine tier: easy with personality
parameters). Floors 4-6 are the Adept wing (medium tier). Floors 7-9 are
the Master wing (hard tier). Personality parameters (docs/design/ai.md)
differentiate rivals within a tier.

## Progression rules

- Beat a floor's rival in a match to light the floor and unlock the next.
- The rival sits as one opponent; the other two seats are filled by
  already-beaten NPCs (the Parlour fills back up as you climb — visible
  progress in who is hanging around).
- The Jade Room unlocks after Floor 8. Beating Master Jin at all ends the
  game's main arc; beating him with a 6+ faan hand unlocks the epilogue:
  the Parlour fully lit at night, the whole cast at the tables, and Gam
  hanging a new champion plaque — yours — under his own faded one.
- Losing a floor match never loses progress. The rival gets a win bark,
  Gam gets a tip, you go again.

## Why the Parlour went quiet (the slow reveal)

Drip-fed through pre-match lines as you climb, never a cutscene:
- Floors 1-3: nobody talks about it. "Place used to be packed."
- Floors 4-6: hints. Pearl: "After the Master's last match, he stopped
  coming downstairs." Aki: "He plays alone now. Sets up four seats and
  plays all of them."
- Floors 7-8: the truth. Sora: "He never lost. That was the problem. Who
  climbs a mountain with no top?" Yuki: "He's not waiting for a winner.
  He's waiting for an opponent."
- Floor 9: Jin's pre-match: "Thirty years I held this seat. The house went
  quiet because I forgot a table needs four players. Show me what the
  lower floors taught you — show me the house is alive."

The theme, played quietly under the JRPG energy: mahjong is a social game;
mastery without a table is nothing. The player doesn't save the Parlour by
beating it — they save it by filling it.

## Epilogue (6+ faan victory)

One screen, full cast at tables, lights on every floor. Jin deals the next
hand at YOUR table. Gam, from the desk: "Told you. It only sleeps."
Unlocks: Jin joins the roster rotation, "Champion" rank, gold table felt.

## Writing rules (enforced in data and review)

- Max 3 lines of dialogue on screen; every dialogue box skippable on tap.
- Barks are one line, under 60 characters, tied to a real game event.
- Gam is the only character who ever explains a rule or names a mechanic.
- Rivals speak in character about the GAME STATE, never about the UI.
- No emojis anywhere. Tile names and HK terms (faan, pung, sik wu) are
  flavor, used correctly.
