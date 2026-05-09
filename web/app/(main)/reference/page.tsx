'use client';

import { useState } from 'react';
import { GLOSSARY, type GlossaryEntry } from '@/content/glossary';

type TabKey = 'tiles' | 'scoring' | 'hands' | 'glossary';

export default function ReferencePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('tiles');
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = getReferenceSearchResults(searchQuery);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tiles', label: 'Tiles' },
    { key: 'scoring', label: 'Scoring' },
    { key: 'hands', label: 'Hands' },
    { key: 'glossary', label: 'Glossary' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-surface to-background px-6 pt-8 pb-6 rounded-b-2xl">
        <p className="font-display text-[10px] text-info tracking-[1.5px] mb-1">
          REFERENCE
        </p>
        <h1 className="font-display text-lg text-foreground mb-2">Quick Reference</h1>
        <p className="text-base text-foreground/80 font-sans mb-4">
          Everything you need at a glance.
        </p>
        <label className="sr-only" htmlFor="reference-search">Search reference</label>
        <input
          id="reference-search"
          type="search"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search tiles, scoring, hands, glossary..."
          className="w-full rounded-lg border-2 border-border/30 bg-elevated px-3 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none"
        />
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border/20 bg-elevated sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-sans transition-colors ${
              activeTab === tab.key
                ? 'text-info border-b-2 border-info'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {searchQuery.trim() ? (
          <SearchResults query={searchQuery} results={searchResults} />
        ) : (
          <>
            {activeTab === 'tiles' && <TilesTab />}
            {activeTab === 'scoring' && <ScoringTab />}
            {activeTab === 'hands' && <HandsTab />}
            {activeTab === 'glossary' && <GlossaryTab />}
          </>
        )}
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
    <div className="ds-card p-2 text-center min-w-[70px]">
      <p className={`text-lg font-bold font-sans ${color || 'text-foreground'}`}>
        {tile.chinese}
      </p>
      <p className="text-[10px] text-muted-foreground font-sans mt-0.5 leading-tight">
        {tile.name}
      </p>
    </div>
  );
}

function TilesTab() {
  return (
    <div className="space-y-6">
      {/* Suit overview */}
      <div className="ds-card p-4">
        <p className="font-display text-[10px] text-highlight tracking-wider mb-2">TILE COUNT</p>
        <p className="text-sm font-sans text-foreground leading-relaxed">
          3 suits x 9 tiles x 4 copies = <span className="text-highlight">108</span> suit tiles
          <br />
          4 winds x 4 copies = <span className="text-highlight">16</span> honor tiles
          <br />
          3 dragons x 4 copies = <span className="text-highlight">12</span> honor tiles
          <br />
          4 flowers + 4 seasons = <span className="text-highlight">8</span> bonus tiles
          <br />
          <span className="text-info font-bold">Total: 144 tiles</span>
        </p>
      </div>

      {/* Suit tiles */}
      {SUIT_TILES.map(group => (
        <div key={group.suit}>
          <h3 className="font-display text-xs text-info mb-3">{group.suit.toUpperCase()}</h3>
          <p className="text-xs text-muted-foreground font-sans mb-2">9 tiles, 4 copies each (36 total)</p>
          <div className="flex flex-wrap gap-2">
            {group.tiles.map(tile => (
              <TileChip key={tile.id} tile={tile} color={group.color} />
            ))}
          </div>
        </div>
      ))}

      {/* Honor tiles */}
      <div>
        <h3 className="font-display text-xs text-info mb-3">HONOR TILES</h3>
        <p className="text-xs text-muted-foreground font-sans mb-2">7 types, 4 copies each (28 total)</p>
        <div className="flex flex-wrap gap-2">
          {HONOR_TILES.map(tile => (
            <TileChip
              key={tile.id}
              tile={tile}
              color={tile.id.startsWith('dragon') ? 'text-highlight' : 'text-purple-400'}
            />
          ))}
        </div>
      </div>

      {/* Bonus tiles */}
      <div>
        <h3 className="font-display text-xs text-info mb-3">BONUS TILES</h3>
        <p className="text-xs text-muted-foreground font-sans mb-2">8 unique tiles (1 copy each)</p>
        <div className="flex flex-wrap gap-2">
          {BONUS_TILES.map(tile => (
            <TileChip key={tile.id} tile={tile} color="text-success" />
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
      <div className="ds-card p-4 border-l-4 border-highlight">
        <p className="font-display text-[10px] text-highlight tracking-wider mb-2">PAYMENT FORMULA</p>
        <p className="text-lg font-sans text-info font-bold">
          Payment = 8 x 2<sup>fan</sup>
        </p>
        <p className="text-sm font-sans text-muted-foreground mt-1">
          Capped at 256 points per payer (limit hand).
        </p>
      </div>

      {/* Fan Table */}
      <div>
        <h3 className="font-display text-xs text-info mb-3">FAN TABLE</h3>
        <div className="space-y-1">
          {FAN_TABLE.map(entry => (
            <div key={entry.name} className="ds-card p-3 flex items-start gap-3">
              <span className="shrink-0 bg-highlight/20 text-highlight px-2 py-0.5 rounded text-sm font-sans font-bold min-w-[55px] text-center">
                {entry.fan}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans text-foreground font-bold">{entry.name}</p>
                <p className="text-xs font-sans text-muted-foreground leading-relaxed">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Table */}
      <div>
        <h3 className="font-display text-xs text-info mb-3">PAYMENT TABLE (PER PAYER)</h3>
        <div className="ds-card overflow-hidden">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="bg-elevated text-muted-foreground">
                <th className="text-left p-2">Fan</th>
                <th className="text-right p-2">Points</th>
                <th className="text-right p-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENT_TABLE.map(row => (
                <tr key={row.fan} className="border-t border-border/10">
                  <td className="p-2 text-highlight font-bold">{row.fan}</td>
                  <td className="p-2 text-right text-foreground">{row.payment}</td>
                  <td className="p-2 text-right text-muted-foreground text-xs">{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs font-sans text-muted-foreground mt-2">
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
      <div className="ds-card p-4 border-l-4 border-accent">
        <p className="font-display text-[10px] text-accent tracking-wider mb-1">LIMIT HANDS</p>
        <p className="text-sm font-sans text-muted-foreground">
          Worth maximum points (256 per payer). These are 10+ fan or special patterns.
        </p>
      </div>

      {LIMIT_HANDS.map(hand => (
        <div key={hand.name} className="ds-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-sans text-foreground font-bold">{hand.name}</h4>
            <span className="text-sm text-highlight font-sans">{hand.chinese}</span>
          </div>
          <p className="text-sm font-sans text-muted-foreground leading-relaxed mb-2">
            {hand.description}
          </p>
          <div className="bg-elevated rounded px-3 py-1.5">
            <p className="text-xs font-sans text-info">{hand.example}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Glossary Tab
   ───────────────────────────────────────── */

function GlossaryTab() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-sans text-muted-foreground mb-4">
        {GLOSSARY.length} terms — common Hong Kong Mahjong vocabulary.
      </p>
      {GLOSSARY.map(entry => (
        <div key={entry.term} className="ds-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-sans text-info font-bold">{entry.term}</span>
            <span className="text-sm text-highlight font-sans">{entry.chinese}</span>
          </div>
          <p className="text-sm font-sans text-muted-foreground leading-relaxed">
            {entry.definition}
          </p>
        </div>
      ))}
    </div>
  );
}

interface ReferenceSearchResult {
  title: string;
  category: string;
  description: string;
}

function getReferenceSearchResults(query: string): ReferenceSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const tileResults = [
    ...SUIT_TILES.flatMap(group => group.tiles.map(tile => ({
      title: tile.name,
      category: group.suit,
      description: `${tile.chinese} — ${group.suit} tile.`,
    }))),
    ...HONOR_TILES.map(tile => ({
      title: tile.name,
      category: 'Honor Tiles',
      description: `${tile.chinese} — wind or dragon honor tile.`,
    })),
    ...BONUS_TILES.map(tile => ({
      title: tile.name,
      category: 'Bonus Tiles',
      description: `${tile.chinese} — flower or season bonus tile.`,
    })),
  ];

  const scoringResults = FAN_TABLE.map(entry => ({
    title: entry.name,
    category: 'Scoring',
    description: `${entry.fan} fan — ${entry.description}`,
  }));

  const handResults = LIMIT_HANDS.map(hand => ({
    title: hand.name,
    category: 'Limit Hands',
    description: `${hand.chinese} — ${hand.description}`,
  }));

  const glossaryResults = GLOSSARY.map(entry => ({
    title: entry.term,
    category: 'Glossary',
    description: `${entry.chinese} — ${entry.definition}`,
  }));

  return [...tileResults, ...scoringResults, ...handResults, ...glossaryResults]
    .filter(item => `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(normalized))
    .slice(0, 12);
}

function SearchResults({ query, results }: { query: string; results: ReferenceSearchResult[] }) {
  return (
    <div className="space-y-3">
      <p className="font-display text-[10px] text-info tracking-wider">
        Search results for &quot;{query.trim()}&quot;
      </p>
      {results.length === 0 ? (
        <div className="ds-card p-4">
          <p className="font-sans text-sm text-muted-foreground">No reference entries found. Try “dragon”, “fan”, “kong”, or “wall”.</p>
        </div>
      ) : (
        results.map(result => (
          <div key={`${result.category}-${result.title}`} className="ds-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-sans text-base text-foreground font-bold">{result.title}</h3>
              <span className="rounded bg-info/10 px-2 py-0.5 font-display text-[8px] text-info">
                {result.category}
              </span>
            </div>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">{result.description}</p>
          </div>
        ))
      )}
    </div>
  );
}
