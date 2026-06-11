/**
 * NPC roster — opponents the human plays against. Each character has visual
 * traits the SVG portrait renders, plus voice lines surfaced as in-game
 * reaction toasts. Voice lines map to emotion states the game emits.
 *
 * Three characters, one per AI difficulty:
 * - Mei (easy) — cheerful beginner, encouraging energy
 * - Hana (medium) — studious analyst, calm and methodical
 * - Yuki (hard) — cocky genius, laser-focused with attitude
 */

export type NpcId =
  | 'mei' | 'hana' | 'yuki' | 'riko' | 'aki' | 'sora'
  | 'gam' | 'bo' | 'pearl' | 'jin';

export type NpcEmotion =
  | 'idle'
  | 'thinking'
  | 'smug'
  | 'surprised'
  | 'frustrated'
  | 'triumphant';

export interface NpcVisualTraits {
  faceShape: 'round' | 'oval' | 'angular';
  hairStyle: 'short-bob' | 'long-straight' | 'long-sleek';
  hairColor: string;
  skinColor: string;
  eyeColor: string;
  blushColor: string;
  accessory: 'earrings' | 'glasses' | 'choker';
  /** Background gradient stops — gives each character a signature aura. */
  auraStops: [string, string];
}

/** Pre/post-match dialogue for Parlour floor encounters. Rotating lines. */
export interface NpcDialogue {
  preMatch: string[];
  /** Spoken when the HUMAN wins the match. */
  winMatch: string[];
  /** Spoken when the NPC keeps the floor. */
  loseMatch: string[];
}

/** Mid-match barks tied to real game events. One line, punchy. */
export interface NpcBarks {
  /** You claim their discard. */
  claimedAgainst: string[];
  /** They reach tenpai (one tile from winning). */
  tenpai: string[];
  /** They win off your discard. */
  youDealIn: string[];
}

export interface NpcCharacter {
  id: NpcId;
  name: string;
  archetype: string;
  /** Short blurb shown on opponent seat / character sheet. */
  blurb: string;
  visualTraits: NpcVisualTraits;
  voiceLines: Record<NpcEmotion, string[]>;
  dialogue?: NpcDialogue;
  barks?: NpcBarks;
  /** AI personality multipliers (see docs/design/ai.md). Mentor has none. */
  personality?: import('@/models/GameState').AIPersonalityParams;
  /**
   * Optional image overrides per emotion. When provided, CharacterPortrait
   * renders an `<img>` for that emotion instead of the SVG rig. Lets real
   * commissioned / curated portrait art slot in without changing call sites.
   * Missing emotions fall back to SVG.
   */
  portraitImageSet?: Partial<Record<NpcEmotion, string>>;
}

export const NPCS: Record<NpcId, NpcCharacter> = {
  mei: {
    id: 'mei',
    // Parlour data
    personality: { claimAppetite: 0.8, fanGreed: 0.8, defenseBias: 0.6, speedBias: 1.0 },
    dialogue: {
      preMatch: [
        "Uncle Gam said you're new! Me too. Well. Newer than him.",
        'First floor rules: have fun, lose gracefully, snack often.',
        'I learned from the stairs. You get a whole chair!',
      ],
      winMatch: [
        'You WON! Okay teach me that discard later.',
        'The lights came on! Did you see? Go on up!',
        'Whoa. Floor two is going to eat you alive. Good luck!',
      ],
      loseMatch: [
        'Heehee, the table likes me today. Rematch?',
        'Even I win sometimes! Mostly here. Only here.',
        "Don't pout — Uncle Gam has tips at the desk.",
      ],
    },
    barks: {
      claimedAgainst: ['Hey! I was using that!', 'Rude! Effective, but rude!'],
      tenpai: ["Don't look at my face. I have NO tells. None.", 'Hmm hm hmm, nothing going on here.'],
      youDealIn: ['Oh! Oh no. Thank you?', 'I will remember this kindness.'],
    },
    name: 'Mei',
    archetype: 'Cheerful beginner',
    blurb: 'Plays for fun. Quick to celebrate, quick to cheer you on.',
    visualTraits: {
      faceShape: 'round',
      hairStyle: 'short-bob',
      hairColor: '#7be0a8', // mint
      skinColor: '#fcd9b6',
      eyeColor: '#a26b35',
      blushColor: '#ff9aa9',
      accessory: 'earrings',
      auraStops: ['#a8f0c8', '#5cc88a'],
    },
    voiceLines: {
      idle: [
        'Hmm, what to play?',
        'Let me see what I have…',
        'This is fun!',
        'Lots of choices today.',
        'Take your time, no rush!',
      ],
      thinking: [
        'Counting my tiles…',
        'Uhhh… one second.',
        'Almost have a plan.',
        'Hmm hmm hmm.',
        'I think I see it.',
      ],
      smug: [
        'Yes! That worked!',
        'I love when that happens!',
        'Lucky me!',
        'I needed that one!',
        'Whoo, nice claim!',
      ],
      surprised: [
        'Oh — wait, what?',
        'I did not see that coming!',
        'Eh?! Really?',
        'You sneaky one!',
        'How did you do that??',
      ],
      frustrated: [
        'Oh no…',
        'Aw, beans.',
        'Hmph. Next time!',
        'That stung a little.',
        'Okay okay, regrouping.',
      ],
      triumphant: [
        'I won! Did I really win?',
        'YES YES YES!',
        'Beginner mode for the win!',
        'Heehee! Lucky!',
        'High five!',
      ],
    },
  },

  hana: {
    id: 'hana',
    // Parlour data
    personality: { claimAppetite: 1.0, fanGreed: 1.0, defenseBias: 1.0, speedBias: 1.0 },
    dialogue: {
      preMatch: [
        'I have already counted the wall. Shall we?',
        'The Counting House runs on precision. Welcome.',
        'I will be tracking every discard. Politely.',
      ],
      winMatch: [
        'Recounting... no, you earned it. Noted.',
        'Your efficiency has improved. The ledger agrees.',
        'Fifth floor. Mind Auntie Pearl. She sees everything.',
      ],
      loseMatch: [
        'The numbers were kind to me. They usually are.',
        'Your hand was two tiles less efficient. I counted.',
        'A respectful margin. Try again.',
      ],
    },
    barks: {
      claimedAgainst: ['Noted. With a small frown.', 'Adjusting projections.'],
      tenpai: ['My ledger balances in one tile.', 'The account is nearly settled.'],
      youDealIn: ['That tile was a rounding error. Mine now.', 'Receipt issued. Thank you.'],
    },
    name: 'Hana',
    archetype: 'Studious analyst',
    blurb: 'Counts every tile. Polite, methodical, never rushed.',
    visualTraits: {
      faceShape: 'oval',
      hairStyle: 'long-straight',
      hairColor: '#5b3a26', // auburn
      skinColor: '#f4dcb8',
      eyeColor: '#3a2818',
      blushColor: '#e98a92',
      accessory: 'glasses',
      auraStops: ['#cfe1ff', '#5b87d8'],
    },
    voiceLines: {
      idle: [
        'Reading the table…',
        'Patience.',
        'Many possibilities here.',
        'I see your strategy.',
        'An interesting board.',
      ],
      thinking: [
        'Calculating shanten…',
        'If I keep these two…',
        'One moment.',
        'Weighing the probabilities.',
        'Just a brief recount.',
      ],
      smug: [
        'As expected.',
        'Exactly what I needed.',
        'You discarded it. I claim it.',
        'Thank you for that.',
        'A clean meld.',
      ],
      surprised: [
        'Oh — that is unusual.',
        'I did not anticipate that.',
        'Curious.',
        'An unexpected discard.',
        'Interesting choice on your part.',
      ],
      frustrated: [
        'I miscounted.',
        'I should have seen it.',
        'A tactical error.',
        'Recalculating.',
        'I owe myself a review.',
      ],
      triumphant: [
        'A satisfying hand.',
        'The math holds.',
        'Clean victory.',
        'All according to plan.',
        'Well played — by me.',
      ],
    },
  },

  yuki: {
    id: 'yuki',
    // Parlour data
    personality: { claimAppetite: 1.1, fanGreed: 1.3, defenseBias: 1.3, speedBias: 1.2 },
    dialogue: {
      preMatch: [
        'The Master would not even stand up for you. Make me.',
        "Almost. That is what he called me. Let's see your word.",
        'Last door. Last warning.',
      ],
      winMatch: [
        "...Take the stairs. Tell him 'almost' sends her regards.",
        'Good. GOOD. Now ruin his evening like you ruined mine.',
        'I have waited years for someone to walk past me. Go.',
      ],
      loseMatch: [
        'Come back when you can hurt me.',
        'The door stays shut. Sharpen up.',
        'Not even close to almost.',
      ],
    },
    barks: {
      claimedAgainst: ['Cute. Do it twice.', 'Bold. Wrong, but bold.'],
      tenpai: ["Door's closing.", 'Hear that? Hinges.'],
      youDealIn: ['Pay the toll.', 'Toll booth. No refunds.'],
    },
    name: 'Yuki',
    archetype: 'Cocky genius',
    blurb: 'Played a thousand hands. She has already read yours.',
    visualTraits: {
      faceShape: 'angular',
      hairStyle: 'long-sleek',
      hairColor: '#dfe4ee', // platinum
      skinColor: '#f6e2d5',
      eyeColor: '#7e6cc1',
      blushColor: '#e96cd0',
      accessory: 'choker',
      auraStops: ['#e9c2ff', '#a85cdc'],
    },
    voiceLines: {
      idle: [
        'I am waiting.',
        'You are stalling.',
        'Move along.',
        'Time, please.',
        'Predictable.',
      ],
      thinking: [
        'Do not insult my time.',
        'Reading you. Simple.',
        'Decided.',
        '…',
        'Counted, weighed, done.',
      ],
      smug: [
        'Of course.',
        'Hand it over.',
        'Mine now.',
        'You walked into that one.',
        'Hahaha. Really?',
      ],
      surprised: [
        '…You? Really?',
        'Tch.',
        'Lucky.',
        'Hmph. Once.',
        'Do not get used to it.',
      ],
      frustrated: [
        'An anomaly.',
        'Statistical noise.',
        'Annoying.',
        'I will correct this.',
        '…',
      ],
      triumphant: [
        'Predictable.',
        'As scripted.',
        'I would say good game, but it was not.',
        'Limit hand. Pay up.',
        'Do not blink.',
      ],
    },
  },

  /* ─────────────────────────────────────────
     Alternate roster (Night Shift) — selectable via cosmetics.
     ───────────────────────────────────────── */

  riko: {
    id: 'riko',
    // Parlour data
    personality: { claimAppetite: 1.6, fanGreed: 0.5, defenseBias: 0.4, speedBias: 1.8 },
    dialogue: {
      preMatch: [
        'Rules are simple: I win before you finish sorting.',
        'Sprint Room. No slow hands past this point.',
        'Stretch first. I mean it.',
      ],
      winMatch: [
        'You... out-paced me? Run it BACK.',
        'Fine. FINE. The stairs are that way, speedster.',
        'Lost on time. Never thought I would say that.',
      ],
      loseMatch: [
        'Speed wins. Stretch next time.',
        'Photo finish! Except I won by a mile.',
        'Hydrate and try again.',
      ],
    },
    barks: {
      claimedAgainst: ['Stealing MY tempo? Bold.', 'Hey, I was sprinting with that!'],
      tenpai: ['Last lap. Try and catch me.', 'Final stretch, baby!'],
      youDealIn: ['And THAT is the finish line!', 'Tape. Broken. Done.'],
    },
    name: 'Riko',
    archetype: 'Athletic challenger',
    blurb: 'Treats every hand like a sprint. Loud, fast, fun.',
    visualTraits: {
      faceShape: 'round',
      hairStyle: 'short-bob',
      hairColor: '#ff8db1', // bubblegum pink
      skinColor: '#fcd9b6',
      eyeColor: '#3a2818',
      blushColor: '#ff6a8c',
      accessory: 'earrings',
      auraStops: ['#ffd0b0', '#ff7a4a'],
    },
    voiceLines: {
      idle: [
        'Bring it!',
        'Lemme see what you got.',
        'My turn already?',
        'Wide open table — let us go.',
        'I love this part.',
      ],
      thinking: [
        'Plotting…',
        'One sec, scanning.',
        'Speed-running this hand.',
        'Working it out.',
        'Almost there!',
      ],
      smug: [
        'Boom!',
        'Called it.',
        'That is mine, thanks.',
        'Speed wins.',
        'Take notes.',
      ],
      surprised: [
        'Whoa, hold up.',
        'You did NOT.',
        'Where did that come from??',
        'Okay, okay, respect.',
        'Did not see that one!',
      ],
      frustrated: [
        'Ughhh.',
        'Run it back.',
        'I had it!',
        'Next round, watch out.',
        'Hmph. My bad.',
      ],
      triumphant: [
        'CHAMPION!',
        'Let us GO!',
        'High five — yourself, I am claiming the chair.',
        'Speed RUN.',
        'Easy.',
      ],
    },
  },

  aki: {
    id: 'aki',
    // Parlour data
    personality: { claimAppetite: 0.9, fanGreed: 2.0, defenseBias: 0.9, speedBias: 0.5 },
    dialogue: {
      preMatch: [
        'Show me something worth hanging. Cheap wins bore me.',
        'The Collection accepts one currency: beautiful hands.',
        'Mixed suits are forgeries. Remember that here.',
      ],
      winMatch: [
        '...I am adding your hand to the collection.',
        'Acceptable. More than acceptable. Go up.',
        'You have taste after all. The seventh floor awaits.',
      ],
      loseMatch: [
        'One suit. One vision. Do you see it now?',
        'Your hand lacked a theme. Mine was an exhibition.',
        'Come back with something worth framing.',
      ],
    },
    barks: {
      claimedAgainst: ['You would deface the set?', 'Vandal.'],
      tenpai: ['The exhibit is nearly complete.', 'One piece remains.'],
      youDealIn: ['A donation. How generous.', 'I will catalogue this victory.'],
    },
    name: 'Aki',
    archetype: 'Gothic strategist',
    blurb: 'All elegance, no patience for sloppy play.',
    visualTraits: {
      faceShape: 'oval',
      hairStyle: 'long-straight',
      hairColor: '#1f1828', // jet black
      skinColor: '#efdfd0',
      eyeColor: '#2e1f3e',
      blushColor: '#a8408a',
      accessory: 'glasses',
      auraStops: ['#cfa6e8', '#5c2b80'],
    },
    voiceLines: {
      idle: [
        'Let us begin.',
        'I am observing.',
        'Mm.',
        'Show me your shape.',
        'Take your turn.',
      ],
      thinking: [
        'Considering.',
        'Counting outs.',
        'A moment of geometry.',
        'Evaluating risk.',
        'Soon.',
      ],
      smug: [
        'Elegant.',
        'You served it to me.',
        'I will accept that.',
        'Beautiful.',
        'A tidy little claim.',
      ],
      surprised: [
        'Oh — clever.',
        'Bold of you.',
        'I admit, that was good.',
        'A genuine misread on my part.',
        'You have my attention now.',
      ],
      frustrated: [
        'I suppose I owe you that one.',
        'A black mark on the page.',
        'Acceptable losses.',
        'Refining the model.',
        'Hmph.',
      ],
      triumphant: [
        'Concluded.',
        'A neat ending.',
        'Final note.',
        'I bow, briefly.',
        'You played beautifully — I played better.',
      ],
    },
  },

  sora: {
    id: 'sora',
    // Parlour data
    personality: { claimAppetite: 0.8, fanGreed: 1.1, defenseBias: 1.4, speedBias: 0.9 },
    dialogue: {
      preMatch: [
        'Your discards talk. I will be listening.',
        'The Reading Room. Quiet, please.',
        'Sit. Show me your patterns.',
      ],
      winMatch: [
        '...I misread one line. Only one.',
        'You learned to be quiet. Good. Yuki is loud.',
        'The eighth floor door is open. It was always open.',
      ],
      loseMatch: [
        'Fourth discard. That is where I knew.',
        'You telegraph. We can fix that. Again.',
        'Read more. Throw less.',
      ],
    },
    barks: {
      claimedAgainst: ['Predicted. Still rude.', 'As written.'],
      tenpai: ['The poem needs one word.', 'Almost legible.'],
      youDealIn: ['You told me you would throw that.', 'I heard it three turns ago.'],
    },
    name: 'Sora',
    archetype: 'Cool prodigy',
    blurb: 'Reads the table like a poem. Says less, sees more.',
    visualTraits: {
      faceShape: 'angular',
      hairStyle: 'long-sleek',
      hairColor: '#d9c4ff', // lavender
      skinColor: '#f3e0e6',
      eyeColor: '#3aa1c9',
      blushColor: '#74c8ff',
      accessory: 'choker',
      auraStops: ['#bce6ff', '#4a8ed8'],
    },
    voiceLines: {
      idle: [
        'Quiet hand.',
        'I see lines.',
        'Patterns.',
        'Your move shapes mine.',
        'Mm.',
      ],
      thinking: [
        'Listening to the wall.',
        'Mapping the suits.',
        'Almost.',
        'A small revision.',
        'There.',
      ],
      smug: [
        'Yes.',
        'Mine.',
        'Knew you would.',
        'A clean fit.',
        'I drew that line.',
      ],
      surprised: [
        'Oh.',
        'That is new.',
        'You read me — interesting.',
        'A wrinkle.',
        'Curious.',
      ],
      frustrated: [
        'Off-tempo.',
        'I will rewrite that.',
        'Static.',
        'Note taken.',
        '…',
      ],
      triumphant: [
        'The shape closes.',
        'Pattern complete.',
        'A clean line.',
        'Sing it back.',
        'Quiet victory.',
      ],
    },
  },

  /* ─────────────────────────────────────────
     The Jade Parlour cast (story mode) — see docs/design/npcs.md
     ───────────────────────────────────────── */

  gam: {
    id: 'gam',
    name: 'Uncle Gam',
    archetype: 'The mentor',
    blurb: 'Front desk, forty years. Knows every habit in the building.',
    visualTraits: {
      faceShape: 'round',
      hairStyle: 'short-bob',
      hairColor: '#cfc6b8', // grey
      skinColor: '#e8c39a',
      eyeColor: '#4a3a28',
      blushColor: '#d99a7a',
      accessory: 'glasses',
      auraStops: ['#f0e0b8', '#b08c4a'],
    },
    voiceLines: {
      idle: ['Take your time, kid.', 'The table waits.', 'Watch the discards.'],
      thinking: ['Mm.', 'In my day...', 'Patience.'],
      smug: ['Heh.', 'Seen that trick before.', 'The old ways work.'],
      surprised: ['Ho! Now THAT is new.', 'Well now.', 'Did not teach you that one.'],
      frustrated: ['Mm. Sloppy.', 'We will talk after.', 'Tsk.'],
      triumphant: ['Still got it.', 'The desk wins again.', 'Heh heh.'],
    },
    dialogue: {
      preMatch: [
        'Watch her discards, not her face.',
        'Win or lose, come tell me about it.',
        'The Parlour only sleeps. Wake it up.',
      ],
      winMatch: ['Heh. The lights look good, do they not?'],
      loseMatch: ['Sit. What did the last discard tell you? Nothing? That was the lesson.'],
    },
  },

  bo: {
    id: 'bo',
    name: 'Bo',
    archetype: 'The builder',
    blurb: 'Builds hands like roof beams: triplets, no gaps, nothing fancy.',
    visualTraits: {
      faceShape: 'angular',
      hairStyle: 'short-bob',
      hairColor: '#8a8378', // workshop grey
      skinColor: '#e0b088',
      eyeColor: '#3a2e1e',
      blushColor: '#c98a6a',
      accessory: 'earrings',
      auraStops: ['#e0c8a0', '#8a6238'],
    },
    voiceLines: {
      idle: ['Measure twice.', 'Good lumber today.', 'Steady now.', 'Frame first. Roof later.'],
      thinking: ['Checking the joints.', 'Hm. Load-bearing?', 'Level it.', 'One more nail.'],
      smug: ['That holds.', 'Built to last.', 'Good beam.', 'Solid.'],
      surprised: ['That should not stand.', 'Huh. Clever joinery.', 'Inspect that later.'],
      frustrated: ['Warped.', 'Crooked work.', 'Tear-down job.', 'Hm.'],
      triumphant: ['Roof is ON.', 'Built it straight.', 'Inspection passed.', 'Sturdy as anything.'],
    },
    personality: { claimAppetite: 1.5, fanGreed: 1.2, defenseBias: 0.7, speedBias: 0.7 },
    dialogue: {
      preMatch: [
        "Chows bend. Pungs hold. Sit down, I'll show you.",
        'Third floor. Bring tiles, not toothpicks.',
        'A good hand is a good house. Foundations first.',
      ],
      winMatch: [
        'Hm. Good joints. Solid hand.',
        'Passed inspection. Fourth floor is upstairs.',
        'You build straight, kid. Go on up.',
      ],
      loseMatch: [
        'Built mine straight. Yours had gaps.',
        'Your frame wobbled on the third beam.',
        'Back to the workbench. Again.',
      ],
    },
    barks: {
      claimedAgainst: ['Oi — that was a load-bearing tile.', 'My lumber!'],
      tenpai: ["Frame's up. Just needs the roof.", 'One nail left.'],
      youDealIn: ['Right onto the nail. Thanks.', 'Delivered to the worksite.'],
    },
  },

  pearl: {
    id: 'pearl',
    name: 'Auntie Pearl',
    archetype: 'The wall',
    blurb: 'Never deals in. Has folded winning hands on principle.',
    visualTraits: {
      faceShape: 'round',
      hairStyle: 'short-bob',
      hairColor: '#dcd6cc', // silver
      skinColor: '#ecc9a4',
      eyeColor: '#4a342a',
      blushColor: '#e09a8a',
      accessory: 'earrings',
      auraStops: ['#bfe8e0', '#4a9a8c'],
    },
    voiceLines: {
      idle: ['Soup is on the side table.', 'Mind what you throw.', 'Mm-hm.', 'I see you, dear.'],
      thinking: ['Stirring.', 'Let it simmer.', 'Not that one. Not yet.', 'Careful, careful.'],
      smug: ['Safe as houses.', 'I never feed the table.', 'That one was free, dear.'],
      surprised: ['Oh my.', 'Bold child.', 'Goodness.', 'Well I never.'],
      frustrated: ['Hmph. Lukewarm.', 'The kettle disagrees.', 'Tsk tsk tsk.'],
      triumphant: ['Dinner is served.', 'Sweet as red bean soup.', 'Auntie keeps the floor.'],
    },
    personality: { claimAppetite: 0.7, fanGreed: 0.8, defenseBias: 2.0, speedBias: 0.8 },
    dialogue: {
      preMatch: [
        "Sit. Soup's on the side table. Mind what you throw.",
        'Fifth floor rule, dear: the quiet hand keeps its points.',
        'I have not dealt in since before you were born.',
      ],
      winMatch: [
        'You watched the discards. Good. Have a bun.',
        'Careful AND lucky. Up you go, dear.',
        'The sixth floor is colder. Wear the win warmly.',
      ],
      loseMatch: [
        'You fed the table all night, dear.',
        'Every dangerous tile, straight into the pot. Tsk.',
        'Watch what I throw next time. Or rather — what I do not.',
      ],
    },
    barks: {
      claimedAgainst: ['Tch. Greedy hands.', 'That was for the soup.'],
      tenpai: ["Kettle's about to whistle, loves.", 'Almost suppertime.'],
      youDealIn: ['You threw THAT? Oh, sweetheart.', 'Straight into the pot, dear.'],
    },
  },

  jin: {
    id: 'jin',
    name: 'Master Jin',
    archetype: 'The Parlour Master',
    blurb: 'Thirty years undefeated. Plays four seats alone at night.',
    visualTraits: {
      faceShape: 'angular',
      hairStyle: 'long-straight',
      hairColor: '#e8e4dc', // white
      skinColor: '#e4bd96',
      eyeColor: '#23402e',
      blushColor: '#b08a72',
      accessory: 'choker',
      auraStops: ['#3a7a5c', '#10241a'],
    },
    voiceLines: {
      idle: ['The room is listening.', 'Play.', 'The seat remembers.', 'Mm.'],
      thinking: ['...', 'The wall speaks softly.', 'Thirty years of this.', 'Yes. There.'],
      smug: ['The house heard that coming.', 'Naturally.', 'An old line, well worn.'],
      surprised: ['...Good.', 'The room just woke a little.', 'Again. Do that again.'],
      frustrated: ['Good.', 'It should hurt.', 'The seat shifts.'],
      triumphant: ['The seat stays warm.', 'Not yet. But closer.', 'The house wins. It always did.'],
    },
    personality: { claimAppetite: 1.2, fanGreed: 1.6, defenseBias: 1.6, speedBias: 1.0 },
    dialogue: {
      preMatch: [
        'Thirty years this seat stayed warm for nobody. Sit.',
        'Show me what the lower floors taught you.',
        'Show me the house is alive.',
      ],
      winMatch: [
        '...There it is. THERE it is. The Parlour is yours tonight, champion.',
        'A win. The Jade Room remembers big hands — come show me one.',
      ],
      loseMatch: [
        'Good. It should be hard. Again, whenever you are ready.',
        'I am not going anywhere. Not anymore. Again.',
      ],
    },
    barks: {
      claimedAgainst: ['Good. Take. TAKE.', 'Yes. Fight me for it.'],
      tenpai: ['Listen. The room holds its breath.', 'The wall goes quiet.'],
      youDealIn: ['The house always heard everything.', 'An old door, an old key.'],
    },
  },
};

/**
 * Map AI difficulty to NPC. Easy → Mei, Medium → Hana, Hard → Yuki.
 */
export function npcForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): NpcCharacter {
  switch (difficulty) {
    case 'easy':
      return NPCS.mei;
    case 'medium':
      return NPCS.hana;
    case 'hard':
      return NPCS.yuki;
  }
}

/**
 * Pick a random voice line for the given character + emotion. Falls back
 * to the first line if the array is empty (defensive — should never happen
 * with the curated roster).
 */
export function pickVoiceLine(
  npc: NpcId,
  emotion: NpcEmotion,
  rng: () => number = Math.random,
): string {
  const lines = NPCS[npc].voiceLines[emotion];
  if (lines.length === 0) return '';
  const i = Math.floor(rng() * lines.length);
  return lines[i];
}
