'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setTilePalette,
  setTableFelt,
  setNpcRoster,
  setNpcRosterMode,
} from '@/store/actions/settingsActions';
import {
  TILE_PALETTES,
  TABLE_FELTS,
  ROSTERS,
  TilePaletteId,
  TableFeltId,
  RosterId,
  TilePalette,
} from '@/lib/cosmetics';
import RetroTile from '@/components/game/RetroTile';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { NPCS, NpcId } from '@/content/npcs';
import { TileSuit, TileType } from '@/models/Tile';

/* ─────────────────────────────────────────
   Sample tiles for palette previews — three
   tiles per preview cover dot/bamboo/dragon.
   ───────────────────────────────────────── */
const PREVIEW_TILES = [
  { id: 'preview-dot', suit: TileSuit.DOT, type: TileType.SUIT, number: 5, nameEnglish: '5 Dot', nameChinese: '', nameJapanese: '', assetPath: '' },
  { id: 'preview-bam', suit: TileSuit.BAMBOO, type: TileType.SUIT, number: 3, nameEnglish: '3 Bamboo', nameChinese: '', nameJapanese: '', assetPath: '' },
  { id: 'preview-char', suit: TileSuit.CHARACTER, type: TileType.SUIT, number: 7, nameEnglish: '7 Character', nameChinese: '', nameJapanese: '', assetPath: '' },
];

export default function CosmeticsPage() {
  const dispatch = useAppDispatch();
  const tilePalette = useAppSelector(s => s.settings.tilePalette);
  const tableFelt = useAppSelector(s => s.settings.tableFelt);
  const npcRoster = useAppSelector(s => s.settings.npcRoster);
  const npcRosterMode = useAppSelector(s => s.settings.npcRosterMode);

  const onPickPalette = (id: TilePaletteId) => {
    void dispatch(setTilePalette(id));
  };
  const onPickFelt = (id: TableFeltId) => {
    void dispatch(setTableFelt(id));
  };
  const onPickRoster = (id: RosterId) => {
    void dispatch(setNpcRoster(id));
  };
  const onPickAutoRotate = () => {
    void dispatch(setNpcRosterMode('auto'));
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-gradient-to-b from-surface to-background px-6 pt-8 pb-6 rounded-b-2xl">
        <p className="font-display text-[10px] text-info tracking-[1.5px] mb-1">COSMETICS</p>
        <h1 className="font-display text-lg text-foreground mb-2">Style the table.</h1>
        <p className="text-base text-foreground/80 font-sans">
          Pick a tile palette, table felt, and opponent roster. All free, all stored locally.
        </p>
      </div>

      {/* NPC roster */}
      <section className="px-4 pt-6">
        <h2 className="font-display text-xs text-highlight tracking-wider mb-3">OPPONENT ROSTER</h2>
        <div className="grid grid-cols-1 gap-3">
          <CosmeticCard
            label="Auto rotate"
            description="Alternate Original Crew and Night Shift each new match."
            active={npcRosterMode === 'auto'}
            onClick={onPickAutoRotate}
            testId="roster-card-auto"
          >
            <div className="flex items-center justify-center gap-2 py-2">
              <RosterPreviewMember id="mei" />
              <span className="font-display text-[10px] text-muted-foreground" aria-hidden>↔</span>
              <RosterPreviewMember id="riko" />
            </div>
          </CosmeticCard>
          {Object.values(ROSTERS).map(roster => (
            <CosmeticCard
              key={roster.id}
              label={roster.label}
              description={roster.description}
              active={npcRosterMode === 'fixed' && roster.id === npcRoster}
              onClick={() => onPickRoster(roster.id)}
              testId={`roster-card-${roster.id}`}
            >
              <div className="flex items-center justify-center gap-3 py-2">
                <RosterPreviewMember id={roster.seats.left as NpcId} />
                <RosterPreviewMember id={roster.seats.top as NpcId} />
                <RosterPreviewMember id={roster.seats.right as NpcId} />
              </div>
            </CosmeticCard>
          ))}
        </div>
      </section>

      {/* Tile palettes */}
      <section className="px-4 pt-8">
        <h2 className="font-display text-xs text-highlight tracking-wider mb-3">TILE PALETTE</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(TILE_PALETTES).map(palette => (
            <CosmeticCard
              key={palette.id}
              label={palette.label}
              description={palette.description}
              active={palette.id === tilePalette}
              onClick={() => onPickPalette(palette.id)}
              testId={`palette-card-${palette.id}`}
            >
              <div
                className="flex items-center justify-center gap-1 p-3 rounded"
                style={{ backgroundColor: palette.faceBg === '#1a1226' ? '#0a0612' : '#1a1320' }}
              >
                {PREVIEW_TILES.map(tile => (
                  <PalettePreviewTile key={tile.id} tile={tile} palette={palette} />
                ))}
              </div>
            </CosmeticCard>
          ))}
        </div>
      </section>

      {/* Table felts */}
      <section className="px-4 pt-8">
        <h2 className="font-display text-xs text-highlight tracking-wider mb-3">TABLE FELT</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(TABLE_FELTS).map(felt => (
            <CosmeticCard
              key={felt.id}
              label={felt.label}
              description={felt.description}
              active={felt.id === tableFelt}
              onClick={() => onPickFelt(felt.id)}
              testId={`felt-card-${felt.id}`}
            >
              <div
                className={`game-table-felt ${felt.className} h-20 w-full rounded-md overflow-hidden`}
                aria-hidden
              />
            </CosmeticCard>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card primitive
   ───────────────────────────────────────── */

function CosmeticCard({
  label,
  description,
  active,
  onClick,
  testId,
  children,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={`text-left ds-card p-4 transition-all ${
        active
          ? 'border-info bg-info/10 shadow-[0_0_18px_rgba(69,183,209,0.35)]'
          : 'hover:border-info/50'
      }`}
    >
      <div className="mb-3">{children}</div>
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-base text-foreground">{label}</p>
        {active && (
          <span className="rounded bg-info/20 px-2 py-0.5 font-display text-[8px] text-info">
            ACTIVE
          </span>
        )}
      </div>
      <p className="text-sm font-sans text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

/* ─────────────────────────────────────────
   Preview tiles + portraits
   ───────────────────────────────────────── */

function PalettePreviewTile({ tile, palette }: { tile: typeof PREVIEW_TILES[number]; palette: TilePalette }) {
  return <RetroTile tile={tile} size="sm" paletteOverride={palette} />;
}

function RosterPreviewMember({ id }: { id: NpcId }) {
  const npc = NPCS[id];
  return (
    <div className="flex flex-col items-center">
      <CharacterPortrait character={id} emotion="idle" size="sm" showAura={false} />
      <span className="font-display text-[9px] text-foreground mt-1">{npc.name}</span>
    </div>
  );
}
