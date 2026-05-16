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

export type NpcId = 'mei' | 'hana' | 'yuki' | 'riko' | 'aki' | 'sora';

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

export interface NpcCharacter {
  id: NpcId;
  name: string;
  archetype: string;
  /** Short blurb shown on opponent seat / character sheet. */
  blurb: string;
  visualTraits: NpcVisualTraits;
  voiceLines: Record<NpcEmotion, string[]>;
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
