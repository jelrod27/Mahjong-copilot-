/**
 * Hong Kong Mahjong glossary — single source of truth for term definitions
 * shared between the /reference page and in-game help affordances.
 *
 * `aliases` lets a tooltip lookup hit the same entry whether the in-game
 * label says "Wall", "Tile Wall", or "牌山" — the lookup helper normalises
 * case and whitespace before matching.
 */

export interface GlossaryEntry {
  term: string;
  chinese: string;
  definition: string;
  /** Other names / alternate casings the term is known by. */
  aliases?: string[];
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'Chow', chinese: '吃', definition: 'A meld of three consecutive tiles of the same suit (e.g. 3-4-5 Dots). Can only be claimed from the player to your left.', aliases: ['Sequence'] },
  { term: 'Pung', chinese: '碰', definition: 'A meld of three identical tiles (e.g. three 7-Bamboo). Can be claimed from any player.', aliases: ['Triplet'] },
  { term: 'Kong', chinese: '槓', definition: 'A meld of four identical tiles. Grants a replacement draw from the back of the wall.', aliases: ['Quad'] },
  { term: 'Pair / Eyes', chinese: '將 / 眼', definition: 'Two identical tiles. Every standard winning hand needs exactly one pair.', aliases: ['Pair', 'Eyes'] },
  { term: 'Meld', chinese: '面子', definition: 'A valid set of tiles: chow, pung, or kong.', aliases: ['Set'] },
  { term: 'Concealed', chinese: '暗', definition: 'A meld formed entirely from self-drawn tiles, not claimed from discards.' },
  { term: 'Exposed', chinese: '明', definition: "A meld formed by claiming a tile from another player's discard." },
  { term: 'Fan', chinese: '番', definition: 'A scoring multiplier. Payment = 8 x 2^fan. More fans = exponentially more points.', aliases: ['Faan'] },
  { term: 'Tenpai', chinese: '聽牌', definition: 'One tile away from a complete winning hand. Also called "ready" or "waiting".', aliases: ['Ready', 'Waiting'] },
  { term: 'Shanten', chinese: '向聴', definition: 'The number of tiles away from tenpai. 0-shanten = tenpai. 1-shanten = two tiles from winning.', aliases: ['Distance from winning'] },
  { term: 'Discard', chinese: '打牌', definition: 'The tile a player throws away at the end of their turn.' },
  { term: 'Wall', chinese: '牌山', definition: 'The face-down tiles arranged in a square from which players draw.', aliases: ['Tile Wall'] },
  { term: 'Draw', chinese: '摸牌', definition: 'Taking a tile from the wall at the start of your turn.' },
  { term: 'Self-Drawn Win', chinese: '自摸', definition: 'Winning by drawing your completing tile from the wall. All 3 opponents pay.', aliases: ['Self-Draw', 'Tsumo'] },
  { term: 'Seat Wind', chinese: '門風', definition: 'Your assigned wind for the current round (East, South, West, or North).' },
  { term: 'Prevailing Wind', chinese: '場風', definition: 'The round wind shared by all players (changes each round).' },
  { term: 'Dealer', chinese: '莊家', definition: 'The East player. Deals first, gets 14 tiles, goes first.' },
  { term: 'Terminal', chinese: '老頭牌', definition: 'Tiles numbered 1 or 9 in any suit. The "ends" of each suit.' },
  { term: 'Honor', chinese: '字牌', definition: 'Wind tiles (East/South/West/North) and Dragon tiles (Red/Green/White).', aliases: ['Honor Tile'] },
  { term: 'Bonus Tile', chinese: '花牌', definition: 'Flower and Season tiles. Set aside when drawn, replaced from the wall.', aliases: ['Flower', 'Season'] },
  { term: 'Limit Hand', chinese: '滿貫', definition: 'A hand worth maximum points (10+ fan, or a special pattern). Pays 256 per payer.' },
  { term: 'Chicken Hand', chinese: '雞糊', definition: 'A winning hand with 0 fan. The minimum payout of 8 points.' },
  { term: 'Exhaustive Draw', chinese: '流局', definition: 'The round ends with no winner when all wall tiles have been drawn.' },
  { term: 'Wind', chinese: '風', definition: 'East, South, West, or North. Each player gets a seat wind; the round has a prevailing wind. Pungs of seat or prevailing wind score fan.' },
  { term: 'Dragon', chinese: '龍', definition: 'Red (中), Green (發), or White (□) honor tiles. Pungs of any dragon score fan.' },
  { term: 'Claim', chinese: '吃碰槓', definition: 'Taking another player’s discard to complete a chow, pung, or kong (or to win).' },
];

/**
 * Look up a glossary entry by term name or alias. Case- and
 * whitespace-insensitive, so the same lookup works whether the caller passes
 * "Wall", "wall", or " WALL ".
 */
export function findGlossaryEntry(term: string): GlossaryEntry | null {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return null;
  for (const entry of GLOSSARY) {
    if (entry.term.toLowerCase() === normalized) return entry;
    if (entry.aliases?.some(a => a.toLowerCase() === normalized)) return entry;
  }
  return null;
}
