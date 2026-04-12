'use client';

import { useState } from 'react';

type TabKey = 'tiles' | 'scoring' | 'hands' | 'glossary';

export default function ReferencePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('tiles');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tiles', label: 'Tiles' },
    { key: 'scoring', label: 'Scoring' },
    { key: 'hands', label: 'Hands' },
    { key: 'glossary', label: 'Glossary' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-6 rounded-b-2xl">
        <p className="font-pixel text-[10px] text-retro-cyan tracking-[1.5px] mb-1">
          REFERENCE
        </p>
        <h1 className="font-pixel text-lg text-retro-white mb-2">Quick Reference</h1>
        <p className="text-base text-retro-text/80 font-retro">
          Everything you need at a glance.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-retro-border/20 bg-retro-bgLight sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-retro transition-colors ${
              activeTab === tab.key
                ? 'text-retro-cyan border-b-2 border-retro-cyan'
                : 'text-retro-textDim hover:text-retro-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'tiles' && <TilesTab />}
        {activeTab === 'scoring' && <ScoringTab />}
        {activeTab === 'hands' && <HandsTab />}
        {activeTab === 'glossary' && <GlossaryTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Tiles Tab
   ───────────────────────────────────────── */

interface TileInfo {
  id: string;
  name: string;
  chinese: string;
}

const SUIT_TILES: { suit: string; color: string; tiles: TileInfo[] }[] = [
  {
    suit: 'Dots (筒子)',
    color: 'text-blue-400',
    tiles: Array.from({ length: 9 }, (_, i) => ({
      id: `dot-${i + 1}`,
      name: `${i + 1} Dot`,
      chinese: `${['一', '二', '三', '四', '五', '六', '七', '八', '九'][i]}筒`,
    })),
  },
  {
    suit: 'Bamboo (索子)',
    color: 'text-green-400',
    tiles: Array.from({ length: 9 }, (_, i) => ({
      id: `bamboo-${i + 1}`,
      name: i === 0 ? '1 Bamboo (Bird)' : `${i + 1} Bamboo`,
      chinese: `${['一', '二', '三', '四', '五', '六', '七', '八', '九'][i]}索`,
    })),
  },
  {
    suit: 'Characters (萬子)',
    color: 'text-red-400',
    tiles: Array.from({ length: 9 }, (_, i) => ({
      id: `char-${i + 1}`,
      name: `${i + 1} Character`,
      chinese: `${['一', '二', '三', '四', '五', '六', '七', '八', '九'][i]}萬`,
    })),
  },
];

const HONOR_TILES: TileInfo[] = [
  { id: 'wind-e', name: 'East Wind', chinese: '東' },
  { id: 'wind-s', name: 'South Wind', chinese: '南' },
  { id: 'wind-w', name: 'West Wind', chinese: '西' },
  { id: 'wind-n', name: 'North Wind', chinese: '北' },
  { id: 'dragon-r', name: 'Red Dragon', chinese: '中' },
  { id: 'dragon-g', name: 'Green Dragon', chinese: '發' },
  { id: 'dragon-w', name: 'White Dragon', chinese: '白' },
];

const BONUS_TILES: TileInfo[] = [
  { id: 'flower-1', name: 'Plum', chinese: '梅' },
  { id: 'flower-2', name: 'Orchid', chinese: '蘭' },
  { id: 'flower-3', name: 'Chrysanthemum', chinese: '菊' },
  { id: 'flower-4', name: 'Bamboo', chinese: '竹' },
  { id: 'season-1', name: 'Spring', chinese: '春' },
  { id: 'season-2', name: 'Summer', chinese: '夏' },
  { id: 'season-3', name: 'Autumn', chinese: '秋' },
  { id: 'season-4', name: 'Winter', chinese: '冬' },
];

function TileChip({ tile, color }: { tile: TileInfo; color?: string }) {
  return (
    <div className="retro-card p-2 text-center min-w-[70px]">
      <p className={`text-lg font-bold font-retro ${color || 'text-retro-text'}`}>
        {tile.chinese}
      </p>
      <p className="text-[10px] text-retro-textDim font-retro mt-0.5 leading-tight">
        {tile.name}
      </p>
    </div>
  );
}

function TilesTab() {
  return (
    <div className="space-y-6">
      {/* Suit overview */}
      <div className="retro-card p-4">
        <p className="font-pixel text-[10px] text-retro-gold tracking-wider mb-2">TILE COUNT</p>
        <p className="text-sm font-retro text-retro-text leading-relaxed">
          3 suits x 9 tiles x 4 copies = <span className="text-retro-gold">108</span> suit tiles
          <br />
          4 winds x 4 copies = <span className="text-retro-gold">16</span> honor tiles
          <br />
          3 dragons x 4 copies = <span className="text-retro-gold">12</span> honor tiles
          <br />
          4 flowers + 4 seasons = <span className="text-retro-gold">8</span> bonus tiles
          <br />
          <span className="text-retro-cyan font-bold">Total: 144 tiles</span>
        </p>
      </div>

      {/* Suit tiles */}
      {SUIT_TILES.map(group => (
        <div key={group.suit}>
          <h3 className="font-pixel text-xs text-retro-cyan mb-3">{group.suit.toUpperCase()}</h3>
          <p className="text-xs text-retro-textDim font-retro mb-2">9 tiles, 4 copies each (36 total)</p>
          <div className="flex flex-wrap gap-2">
            {group.tiles.map(tile => (
              <TileChip key={tile.id} tile={tile} color={group.color} />
            ))}
          </div>
        </div>
      ))}

      {/* Honor tiles */}
      <div>
        <h3 className="font-pixel text-xs text-retro-cyan mb-3">HONOR TILES</h3>
        <p className="text-xs text-retro-textDim font-retro mb-2">7 types, 4 copies each (28 total)</p>
        <div className="flex flex-wrap gap-2">
          {HONOR_TILES.map(tile => (
            <TileChip
              key={tile.id}
              tile={tile}
              color={tile.id.startsWith('dragon') ? 'text-retro-gold' : 'text-purple-400'}
            />
          ))}
        </div>
      </div>

      {/* Bonus tiles */}
      <div>
        <h3 className="font-pixel text-xs text-retro-cyan mb-3">BONUS TILES</h3>
        <p className="text-xs text-retro-textDim font-retro mb-2">8 unique tiles (1 copy each)</p>
        <div className="flex flex-wrap gap-2">
          {BONUS_TILES.map(tile => (
            <TileChip key={tile.id} tile={tile} color="text-retro-green" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Scoring Tab
   ───────────────────────────────────────── */

interface FanEntry {
  name: string;
  fan: string;
  description: string;
}

const FAN_TABLE: FanEntry[] = [
  { name: 'Chicken Hand', fan: '0', description: 'A winning hand with no scoring elements.' },
  { name: 'Self-Drawn Win', fan: '1', description: 'Win by drawing the tile yourself, not from a discard.' },
  { name: 'Concealed Hand', fan: '1', description: 'Win without exposing any melds (no claims from discards).' },
  { name: 'No Flowers', fan: '1', description: 'Win without having drawn any flower or season tiles.' },
  { name: 'Dragon Pung', fan: '1 each', description: 'A pung (or kong) of any dragon tile (Red, Green, or White).' },
  { name: 'Seat Wind Pung', fan: '1', description: 'A pung of your assigned seat wind.' },
  { name: 'Prevailing Wind Pung', fan: '1', description: 'A pung of the round\'s prevailing wind.' },
  { name: 'Flower/Season', fan: '1 each', description: 'Each flower or season tile drawn adds 1 fan.' },
  { name: 'All Chows', fan: '1', description: 'All 4 melds are chows (sequences), no pungs.' },
  { name: 'All Pungs', fan: '3', description: 'All 4 melds are pungs or kongs, no chows.' },
  { name: 'Mixed One Suit', fan: '3', description: 'All tiles from one numbered suit plus honor tiles.' },
  { name: 'Seven Pairs', fan: '4', description: 'Hand of 7 distinct pairs instead of 4 melds + 1 pair.' },
  { name: 'Pure One Suit', fan: '7', description: 'All tiles from a single numbered suit, no honors.' },
];

const PAYMENT_TABLE = [
  { fan: '0', payment: '8', label: 'Chicken Hand' },
  { fan: '1', payment: '16', label: '' },
  { fan: '2', payment: '32', label: '' },
  { fan: '3', payment: '64', label: 'All Pungs / Mixed' },
  { fan: '4', payment: '128', label: 'Seven Pairs' },
  { fan: '5+', payment: '256', label: 'Limit (cap)' },
];

function ScoringTab() {
  return (
    <div className="space-y-6">
      {/* Formula */}
      <div className="retro-card p-4 border-l-4 border-retro-gold">
        <p className="font-pixel text-[10px] text-retro-gold tracking-wider mb-2">PAYMENT FORMULA</p>
        <p className="text-lg font-retro text-retro-cyan font-bold">
          Payment = 8 x 2<sup>fan</sup>
        </p>
        <p className="text-sm font-retro text-retro-textDim mt-1">
          Capped at 256 points per payer (limit hand).
        </p>
      </div>

      {/* Fan Table */}
      <div>
        <h3 className="font-pixel text-xs text-retro-cyan mb-3">FAN TABLE</h3>
        <div className="space-y-1">
          {FAN_TABLE.map(entry => (
            <div key={entry.name} className="retro-card p-3 flex items-start gap-3">
              <span className="shrink-0 bg-retro-gold/20 text-retro-gold px-2 py-0.5 rounded text-sm font-retro font-bold min-w-[55px] text-center">
                {entry.fan}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-retro text-retro-text font-bold">{entry.name}</p>
                <p className="text-xs font-retro text-retro-textDim leading-relaxed">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Table */}
      <div>
        <h3 className="font-pixel text-xs text-retro-cyan mb-3">PAYMENT TABLE (PER PAYER)</h3>
        <div className="retro-card overflow-hidden">
          <table className="w-full text-sm font-retro">
            <thead>
              <tr className="bg-retro-bgLight text-retro-textDim">
                <th className="text-left p-2">Fan</th>
                <th className="text-right p-2">Points</th>
                <th className="text-right p-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENT_TABLE.map(row => (
                <tr key={row.fan} className="border-t border-retro-border/10">
                  <td className="p-2 text-retro-gold font-bold">{row.fan}</td>
                  <td className="p-2 text-right text-retro-text">{row.payment}</td>
                  <td className="p-2 text-right text-retro-textDim text-xs">{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs font-retro text-retro-textDim mt-2">
          Win by discard: 1 player pays. Self-draw: all 3 opponents pay.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Hands Tab
   ───────────────────────────────────────── */

interface LimitHand {
  name: string;
  chinese: string;
  description: string;
  example: string;
}

const LIMIT_HANDS: LimitHand[] = [
  {
    name: 'Thirteen Orphans',
    chinese: '十三幺',
    description: 'One of each terminal (1 and 9 of each suit), one of each wind, one of each dragon, plus a pair of any of those 13 types.',
    example: '1D 9D 1B 9B 1C 9C E S W N Red Grn Wht + pair',
  },
  {
    name: 'Nine Gates',
    chinese: '九蓮寶燈',
    description: 'In a single suit: 1-1-1-2-3-4-5-6-7-8-9-9-9 plus any tile of that suit. Any of the 9 tiles completes the hand.',
    example: '1-1-1-2-3-4-5-6-7-8-9-9-9 + any (one suit)',
  },
  {
    name: 'Big Three Dragons',
    chinese: '大三元',
    description: 'Pungs (or kongs) of all three dragons: Red, Green, and White. The remaining set and pair can be anything.',
    example: 'Red x3 + Grn x3 + Wht x3 + any set + pair',
  },
  {
    name: 'Big Four Winds',
    chinese: '大四喜',
    description: 'Pungs (or kongs) of all four winds: East, South, West, and North. The pair can be anything.',
    example: 'E x3 + S x3 + W x3 + N x3 + any pair',
  },
  {
    name: 'All Honors',
    chinese: '字一色',
    description: 'Every tile in the hand is an honor tile (winds and/or dragons). No suit tiles at all.',
    example: '4 honor pungs/kongs + honor pair',
  },
  {
    name: 'All Terminals',
    chinese: '清老頭',
    description: 'Every tile is a 1 or 9 (terminal). No middle numbers, no honors.',
    example: '1D x3 + 9D x3 + 1B x3 + 9C x3 + 9B pair',
  },
  {
    name: 'Four Concealed Pungs',
    chinese: '四暗刻',
    description: 'Four pungs all self-drawn (none claimed from discards). The pair may be completed from a discard.',
    example: '4 self-drawn pungs + pair',
  },
  {
    name: 'All Kongs',
    chinese: '十八羅漢',
    description: 'Four kongs plus a pair. Extremely rare since it requires 18 tiles.',
    example: '4 kongs (16 tiles) + pair (2 tiles)',
  },
];

function HandsTab() {
  return (
    <div className="space-y-4">
      <div className="retro-card p-4 border-l-4 border-retro-accent">
        <p className="font-pixel text-[10px] text-retro-accent tracking-wider mb-1">LIMIT HANDS</p>
        <p className="text-sm font-retro text-retro-textDim">
          Worth maximum points (256 per payer). These are 10+ fan or special patterns.
        </p>
      </div>

      {LIMIT_HANDS.map(hand => (
        <div key={hand.name} className="retro-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-retro text-retro-text font-bold">{hand.name}</h4>
            <span className="text-sm text-retro-gold font-retro">{hand.chinese}</span>
          </div>
          <p className="text-sm font-retro text-retro-textDim leading-relaxed mb-2">
            {hand.description}
          </p>
          <div className="bg-retro-bgLight rounded px-3 py-1.5">
            <p className="text-xs font-retro text-retro-cyan">{hand.example}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Glossary Tab
   ───────────────────────────────────────── */

interface GlossaryEntry {
  term: string;
  chinese: string;
  definition: string;
}

const GLOSSARY: GlossaryEntry[] = [
  { term: 'Chow', chinese: '吃', definition: 'A meld of three consecutive tiles of the same suit (e.g. 3-4-5 Dots). Can only be claimed from the player to your left.' },
  { term: 'Pung', chinese: '碰', definition: 'A meld of three identical tiles (e.g. three 7-Bamboo). Can be claimed from any player.' },
  { term: 'Kong', chinese: '槓', definition: 'A meld of four identical tiles. Grants a replacement draw from the back of the wall.' },
  { term: 'Pair / Eyes', chinese: '將 / 眼', definition: 'Two identical tiles. Every standard winning hand needs exactly one pair.' },
  { term: 'Meld', chinese: '面子', definition: 'A valid set of tiles: chow, pung, or kong.' },
  { term: 'Concealed', chinese: '暗', definition: 'A meld formed entirely from self-drawn tiles, not claimed from discards.' },
  { term: 'Exposed', chinese: '明', definition: 'A meld formed by claiming a tile from another player\'s discard.' },
  { term: 'Fan', chinese: '番', definition: 'A scoring multiplier. Payment = 8 x 2^fan. More fans = exponentially more points.' },
  { term: 'Tenpai', chinese: '聽牌', definition: 'One tile away from a complete winning hand. Also called "ready" or "waiting".' },
  { term: 'Shanten', chinese: '向聴', definition: 'The number of tiles away from tenpai. 0-shanten = tenpai. 1-shanten = two tiles from winning.' },
  { term: 'Discard', chinese: '打牌', definition: 'The tile a player throws away at the end of their turn.' },
  { term: 'Wall', chinese: '牌山', definition: 'The face-down tiles arranged in a square from which players draw.' },
  { term: 'Draw', chinese: '摸牌', definition: 'Taking a tile from the wall at the start of your turn.' },
  { term: 'Self-Drawn Win', chinese: '自摸', definition: 'Winning by drawing your completing tile from the wall. All 3 opponents pay.' },
  { term: 'Seat Wind', chinese: '門風', definition: 'Your assigned wind for the current round (East, South, West, or North).' },
  { term: 'Prevailing Wind', chinese: '場風', definition: 'The round wind shared by all players (changes each round).' },
  { term: 'Dealer', chinese: '莊家', definition: 'The East player. Deals first, gets 14 tiles, goes first.' },
  { term: 'Terminal', chinese: '老頭牌', definition: 'Tiles numbered 1 or 9 in any suit. The "ends" of each suit.' },
  { term: 'Honor', chinese: '字牌', definition: 'Wind tiles (East/South/West/North) and Dragon tiles (Red/Green/White).' },
  { term: 'Bonus Tile', chinese: '花牌', definition: 'Flower and Season tiles. Set aside when drawn, replaced from the wall.' },
  { term: 'Limit Hand', chinese: '滿貫', definition: 'A hand worth maximum points (10+ fan, or a special pattern). Pays 256 per payer.' },
  { term: 'Chicken Hand', chinese: '雞糊', definition: 'A winning hand with 0 fan. The minimum payout of 8 points.' },
  { term: 'Exhaustive Draw', chinese: '流局', definition: 'The round ends with no winner when all wall tiles have been drawn.' },
];

function GlossaryTab() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-retro text-retro-textDim mb-4">
        {GLOSSARY.length} terms — common Hong Kong Mahjong vocabulary.
      </p>
      {GLOSSARY.map(entry => (
        <div key={entry.term} className="retro-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-retro text-retro-cyan font-bold">{entry.term}</span>
            <span className="text-sm text-retro-gold font-retro">{entry.chinese}</span>
          </div>
          <p className="text-sm font-retro text-retro-textDim leading-relaxed">
            {entry.definition}
          </p>
        </div>
      ))}
    </div>
  );
}
