# NPC Sheets: The Jade Parlour Cast

Ten characters: one mentor, eight floor rivals, one final boss. Six already
exist in `web/content/npcs.ts` (Mei, Hana, Yuki, Riko, Aki, Sora) with portraits
and voice lines; this document recasts them into the Parlour and specs the
four new ones (Gam, Bo, Pearl, Jin).

Personality parameters reference the engine contract in
`docs/design/ai.md`: `claimAppetite`, `fanGreed`, `defenseBias`, `speedBias`
(each a multiplier, 1.0 = tier default).

Bark triggers (wired through `useNpcEmotion`): `claimedAgainst` (you claim
their discard), `tenpai` (they reach one-from-winning), `youDealIn` (they
win off your discard).

---

## Uncle Gam — The Front Desk (Mentor)

- **Backstory**: City champion forty years ago; retired into the front desk
  job and never left. Keeps every floor's keys on one ring and every
  player's habits in his head. He has watched a thousand beginners walk in;
  he thinks you might be the one who reaches the top, and he would rather
  die than say so out loud.
- **Visual one-liner**: Wiry old man, sleeve garters, reading glasses pushed
  up on his forehead, a jade tile on a cord around his neck; warm lamplight
  palette.
- **Play style**: Does not play matches. He is the teaching voice: tutorial
  text, post-match review framing, daily-hand greetings, rank-up ceremonies.
- **Pre-match (every floor, rotating)**: "Watch her discards, not her face."
  / "Third floor's lights flicker. Like its tenant." / "Win or lose, come
  tell me about it."
- **Post-match win**: "Heh. The lights look good, don't they?"
- **Post-match loss**: "Sit. What did the last discard tell you? Nothing?
  That was the lesson."

## Floor 1 — Mei, "The Open Table" (exists)

- **Backstory**: A regular's granddaughter who learned by watching from the
  stairs. First to come back when the lights flickered on. Plays for the
  joy of it and genuinely wants you to do well — she just wants to win
  slightly more.
- **Visual one-liner**: Mint bob, round face, bright eyes, sun-shower aura.
- **AI**: Novice tier. `claimAppetite 0.8, fanGreed 0.8, defenseBias 0.6,
  speedBias 1.0` — loose, friendly, leaks safe tiles.
- **Pre-match**: "Uncle Gam said you're new! Me too. Well. Newer than him."
- **Post-match (you win)**: "You WON! Okay teach me that discard later."
- **Post-match (you lose)**: "Heehee, the table likes me today. Rematch?"
- **Barks**: claimedAgainst: "Hey! I was using that!" / tenpai: "Don't look
  at my face. I have NO tells. None." / youDealIn: "Oh! Oh no. Thank you?"

## Floor 2 — Riko, "The Sprint Room" (exists)

- **Backstory**: Track athlete who discovered mahjong during an injury
  summer and refuses to accept it is not a race. Holds the Parlour record
  for fastest win (and the record for fastest deal-in, which she does not
  mention).
- **Visual one-liner**: Pink bob, athletic tape on two fingers, sweatband,
  sunset-orange aura.
- **AI**: Novice tier. `claimAppetite 1.6, fanGreed 0.5, defenseBias 0.4,
  speedBias 1.8` — Kid Tornado pattern: claims everything, races chicken
  hands, never defends. Teaches the player to punish recklessness.
- **Pre-match**: "Rules are simple: I win before you finish sorting."
- **Post-match (you win)**: "You... out-paced me? Run it BACK."
- **Post-match (you lose)**: "Speed wins. Stretch next time."
- **Barks**: claimedAgainst: "Stealing MY tempo? Bold." / tenpai: "Last
  lap. Try and catch me." / youDealIn: "And THAT is the finish line!"

## Floor 3 — Bo, "The Builder's Den" (new)

- **Backstory**: A carpenter who started playing during lunch breaks at the
  Parlour renovation job, decades ago. The renovation ended; Bo never left.
  Believes a hand should be built like a roof beam: triplets, no gaps,
  nothing fancy. Distrusts chows on principle.
- **Visual one-liner**: Broad shoulders, short grey crop, pencil behind ear,
  rolled sleeves; sawdust-and-tea palette, oak-brown aura.
- **AI**: Novice tier. `claimAppetite 1.5, fanGreed 1.2, defenseBias 0.7,
  speedBias 0.7` — pung-hungry: claims every pung and kong, slow heavy
  hands. Teaches claiming with purpose and the All Pungs pattern.
- **Pre-match**: "Chows bend. Pungs hold. Sit down, I'll show you."
- **Post-match (you win)**: "Hm. Good joints. Solid hand."
- **Post-match (you lose)**: "Built mine straight. Yours had gaps."
- **Barks**: claimedAgainst: "Oi — that was a load-bearing tile." /
  tenpai: "Frame's up. Just needs the roof." / youDealIn: "Right onto the
  nail. Thanks."

## Floor 4 — Hana, "The Counting House" (exists)

- **Backstory**: An accountant who came for the after-work tables and
  stayed for the arithmetic. Keeps a small notebook of every hand she has
  ever lost; the notebook is nearly empty. Polite to a fault — apologizing,
  softly, while she takes your points.
- **Visual one-liner**: Auburn long hair, glasses, cardigan, ledger-blue
  aura.
- **AI**: Adept tier. `claimAppetite 1.0, fanGreed 1.0, defenseBias 1.0,
  speedBias 1.0` — the clean baseline: pure efficiency. Teaches shanten
  thinking by example.
- **Pre-match**: "I have already counted the wall. Shall we?"
- **Post-match (you win)**: "Recounting... no, you earned it. Noted."
- **Post-match (you lose)**: "The numbers were kind to me. They usually are."
- **Barks**: claimedAgainst: "Noted. With a small frown." / tenpai: "My
  ledger balances in one tile." / youDealIn: "That tile was a rounding
  error. Mine now."

## Floor 5 — Auntie Pearl, "The Quiet Table" (new)

- **Backstory**: Ran the Parlour's kitchen for thirty years and learned the
  game by carrying soup to the tables and noticing who lost and WHY. Never
  deals in. Has folded hands that would have won, on principle. The wall
  could fall on Auntie Pearl before a dangerous tile leaves her hand.
- **Visual one-liner**: Silver bun, apron over a brocade vest, one raised
  eyebrow; porcelain-teal aura, steam curling.
- **AI**: Adept tier. `claimAppetite 0.7, fanGreed 0.8, defenseBias 2.0,
  speedBias 0.8` — the punisher of loose discards: defensive heuristics
  always on, feeds nothing. Teaches safe tiles by starving careless players.
- **Pre-match**: "Sit. Soup's on the side table. Mind what you throw."
- **Post-match (you win)**: "You watched the discards. Good. Have a bun."
- **Post-match (you lose)**: "You fed the table all night, dear."
- **Barks**: claimedAgainst: "Tch. Greedy hands." / tenpai: "Kettle's
  about to whistle, loves." / youDealIn: "You threw THAT? Oh, sweetheart."

## Floor 6 — Aki, "The Collection" (exists)

- **Backstory**: A gallery curator who treats winning hands as acquisitions.
  A mixed-suit win is, to Aki, a forgery — technically points, spiritually
  worthless. Her record book lists only hands of one suit, annotated like
  exhibit cards.
- **Visual one-liner**: Jet-black hair, dark lipstick, museum-white gloves,
  amethyst aura.
- **AI**: Adept tier. `claimAppetite 0.9, fanGreed 2.0, defenseBias 0.9,
  speedBias 0.5` — the Collector: refuses cheap hands, always builds
  one-suit or honor value. Teaches faan-building and value patience.
- **Pre-match**: "Show me something worth hanging. Cheap wins bore me."
- **Post-match (you win)**: "...I am adding your hand to the collection."
- **Post-match (you lose)**: "One suit. One vision. Do you see it now?"
- **Barks**: claimedAgainst: "You would deface the set?" / tenpai: "The
  exhibit is nearly complete." / youDealIn: "A donation. How generous."

## Floor 7 — Sora, "The Reading Room" (exists)

- **Backstory**: Nobody knows where Sora came from; one evening the corner
  table was simply occupied. Speaks little, wins quietly, and once named an
  opponent's full hand after six discards — then folded anyway, out of
  respect.
- **Visual one-liner**: Lavender sleek hair, half-closed eyes, long coat,
  rain-window blue aura.
- **AI**: Master tier (softened). `claimAppetite 0.8, fanGreed 1.1,
  defenseBias 1.4, speedBias 0.9` — the reader: punishes predictable
  discard patterns, switches to iron defense the moment you are tenpai.
  Teaches wait-reading by being readable only to the careful.
- **Pre-match**: "Your discards talk. I will be listening."
- **Post-match (you win)**: "...I misread one line. Only one."
- **Post-match (you lose)**: "Fourth discard. That is where I knew."
- **Barks**: claimedAgainst: "Predicted. Still rude." / tenpai: "The poem
  needs one word." / youDealIn: "You told me you would throw that."

## Floor 8 — Yuki, "The Last Door" (exists)

- **Backstory**: The Parlour's last prodigy before the quiet years — the
  only player Master Jin ever called "almost". She has been playing the
  empty eighth floor alone, keeping sharp for a rematch that never came.
  You are either a warm-up or the real thing; she intends to find out fast.
- **Visual one-liner**: Platinum sleek hair, choker, arms folded,
  neon-violet aura.
- **AI**: Master tier. `claimAppetite 1.1, fanGreed 1.3, defenseBias 1.3,
  speedBias 1.2` — everything turned up. The exam before the exam.
- **Pre-match**: "The Master would not even stand up for you. Make me."
- **Post-match (you win)**: "...Take the stairs. Tell him 'almost' sends
  her regards."
- **Post-match (you lose)**: "Come back when you can hurt me."
- **Barks**: claimedAgainst: "Cute. Do it twice." / tenpai: "Door's
  closing." / youDealIn: "Pay the toll."

## Floor 9 — Master Jin, "The Jade Room" (new, final boss)

- **Backstory**: Held the Parlour's top seat for thirty years without a
  loss, and the wins stopped meaning anything. He let the house go quiet
  rather than keep beating people who could not reach him. Plays all four
  seats alone at night to remember what a full table sounded like. He does
  not want to lose to you. He wants to finally be PLAYED.
- **Visual one-liner**: Old, straight-backed, jade-green changshan, white
  hair in a tight queue, the original Jade Room tile set before him;
  deep-jade aura, almost black at the edges.
- **AI**: Master tier, all quirks. `claimAppetite 1.2, fanGreed 1.6,
  defenseBias 1.6, speedBias 1.0` — reads, defends, and builds value
  simultaneously. The final exam: beating him requires everything floors
  1-8 taught. A 6+ faan winning hand vs Jin unlocks the epilogue.
- **Pre-match**: "Thirty years this seat stayed warm for nobody. Sit.
  Show me the house is alive."
- **Post-match (you win, <6 faan)**: "A win. A small one. The Jade Room
  remembers big hands — come show me one."
- **Post-match (you win, 6+ faan)**: "...There it is. THERE it is. The
  Parlour is yours tonight, champion."
- **Post-match (you lose)**: "Good. It should be hard. Again, whenever
  you are ready — I am not going anywhere. Not anymore."
- **Barks**: claimedAgainst: "Good. Take. TAKE." / tenpai: "Listen. The
  room holds its breath." / youDealIn: "The house always heard everything."

---

## Implementation notes

- New `NpcId`s: `gam`, `bo`, `pearl`, `jin`. Gam needs no AI (mentor only);
  Bo, Pearl, Jin need visual traits for the SVG rig until commissioned art
  arrives via `portraitImageSet`.
- `AIPersonality` lives in the engine (`web/engine/ai/personality.ts`) and is
  resolved from the NPC id at the controller boundary; the engine stays
  ignorant of characters, receiving only parameter multipliers.
- Dialogue (pre/post-match) lives in NPC data as `dialogue: { preMatch:
  string[], winMatch: string[], loseMatch: string[] }` (rotating).
  Barks live as `barks: { claimedAgainst: string[], tenpai: string[],
  youDealIn: string[] }` and surface through the existing speech-bubble
  system.
- Floor definitions (`web/lib/parlour.ts`): floor number, npcId, AI tier,
  personality, table rules (minFaan ramps: floors 1-3 play at 1 faan,
  4-6 at 3, 7-9 at 3), unlock state in localStorage.
