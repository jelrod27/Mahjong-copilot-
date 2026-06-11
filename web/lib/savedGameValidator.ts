/**
 * Hand-rolled validator for saved-game snapshots.
 * Operates on raw parsed JSON (before *FromJson deserialisation).
 * Returns the first violation found; never throws.
 */

// GamePhase enum values from web/models/GameState.ts
const VALID_GAME_PHASES = new Set(['waiting', 'dealing', 'playing', 'paused', 'finished']);
// TurnPhase type from web/models/GameState.ts
const VALID_TURN_PHASES = new Set(['draw', 'discard', 'claim', 'endOfTurn']);

// Bonus suits — each unique bonus tile exists only once in the full set
const BONUS_SUITS = new Set(['flower', 'season']);

export interface ValidationFailure { ok: false; reason: string }
export interface ValidationOk { ok: true }
export type ValidationResult = ValidationOk | ValidationFailure;

function fail(reason: string): ValidationFailure {
  return { ok: false, reason };
}

const ok: ValidationOk = { ok: true };

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Confirm a value is a tile-shaped object with string id and string suit. */
function isTileShape(v: unknown): boolean {
  if (!isObject(v)) return false;
  return typeof v['id'] === 'string' && typeof v['suit'] === 'string';
}

/**
 * Build a kind-key from a raw tile JSON object.
 * Mirrors tileKey() in web/models/Tile.ts but operates on raw JSON.
 */
function rawTileKey(t: Record<string, unknown>): string {
  const suit = t['suit'] as string;
  if (typeof t['number'] === 'number') return `${suit}_${t['number']}`;
  if (typeof t['wind'] === 'string') return `wind_${t['wind']}`;
  if (typeof t['dragon'] === 'string') return `dragon_${t['dragon']}`;
  if (typeof t['flower'] === 'string') return `flower_${t['flower']}`;
  if (typeof t['season'] === 'string') return `season_${t['season']}`;
  return t['id'] as string;
}

function validateTiles(tiles: unknown[], label: string): ValidationFailure | null {
  for (let i = 0; i < tiles.length; i++) {
    if (!isTileShape(tiles[i])) {
      return fail(`${label}[${i}] is not a valid tile object`);
    }
  }
  return null;
}

function validateGamePayload(game: Record<string, unknown>): ValidationResult {
  // Players: exactly 4
  const players = game['players'];
  if (!Array.isArray(players) || players.length !== 4) {
    return fail(`players must be an array of exactly 4 (got ${Array.isArray(players) ? players.length : typeof players})`);
  }

  for (let i = 0; i < 4; i++) {
    const p = players[i];
    if (!isObject(p)) return fail(`players[${i}] is not an object`);
    if (typeof p['id'] !== 'string') return fail(`players[${i}].id is not a string`);
    if (!Array.isArray(p['hand'])) return fail(`players[${i}].hand is not an array`);
    if (!Array.isArray(p['melds'])) return fail(`players[${i}].melds is not an array`);
    if (!Array.isArray(p['flowers'])) return fail(`players[${i}].flowers is not an array`);
    if ((p['hand'] as unknown[]).length > 14) {
      return fail(`players[${i}].hand.length ${(p['hand'] as unknown[]).length} exceeds cap of 14`);
    }
  }

  // currentPlayerIndex: integer 0..3
  const cpi = game['currentPlayerIndex'];
  if (!Number.isInteger(cpi) || (cpi as number) < 0 || (cpi as number) > 3) {
    return fail(`currentPlayerIndex must be integer 0–3 (got ${cpi})`);
  }

  // phase: must be a valid GamePhase
  const phase = game['phase'];
  if (typeof phase !== 'string' || !VALID_GAME_PHASES.has(phase)) {
    return fail(`phase '${phase}' is not a valid GamePhase`);
  }

  // turnPhase: if present, must be a valid TurnPhase
  const turnPhase = game['turnPhase'];
  if (turnPhase !== undefined && (typeof turnPhase !== 'string' || !VALID_TURN_PHASES.has(turnPhase))) {
    return fail(`turnPhase '${turnPhase}' is not a valid TurnPhase`);
  }

  // Array length caps
  const wall = game['wall'];
  if (Array.isArray(wall) && wall.length > 144) {
    return fail(`wall.length ${wall.length} exceeds cap of 144`);
  }
  const deadWall = game['deadWall'];
  if (Array.isArray(deadWall) && deadWall.length > 144) {
    return fail(`deadWall.length ${deadWall.length} exceeds cap of 144`);
  }
  const discardPile = game['discardPile'];
  if (Array.isArray(discardPile) && discardPile.length > 144) {
    return fail(`discardPile.length ${discardPile.length} exceeds cap of 144`);
  }
  const turnHistory = game['turnHistory'];
  if (Array.isArray(turnHistory) && turnHistory.length > 2000) {
    return fail(`turnHistory.length ${turnHistory.length} exceeds cap of 2000`);
  }
  const playerDiscards = game['playerDiscards'];
  if (isObject(playerDiscards)) {
    for (const [k, v] of Object.entries(playerDiscards)) {
      if (Array.isArray(v) && v.length > 144) {
        return fail(`playerDiscards['${k}'].length ${v.length} exceeds cap of 144`);
      }
    }
  }

  // Collect all tiles for shape validation and multiset check
  const allTiles: Record<string, unknown>[] = [];

  const addArr = (arr: unknown, label: string): ValidationFailure | null => {
    if (!Array.isArray(arr)) return null;
    const err = validateTiles(arr, label);
    if (err) return err;
    for (const t of arr) allTiles.push(t as Record<string, unknown>);
    return null;
  };

  const addOptional = (t: unknown, label: string): ValidationFailure | null => {
    if (t === undefined || t === null) return null;
    if (!isTileShape(t)) return fail(`${label} is not a valid tile object`);
    allTiles.push(t as Record<string, unknown>);
    return null;
  };

  let err: ValidationFailure | null;

  err = addArr(wall, 'wall'); if (err) return err;
  err = addArr(deadWall, 'deadWall'); if (err) return err;
  err = addArr(discardPile, 'discardPile'); if (err) return err;
  err = addOptional(game['lastDrawnTile'], 'lastDrawnTile'); if (err) return err;
  err = addOptional(game['lastDiscardedTile'], 'lastDiscardedTile'); if (err) return err;
  err = addOptional(game['winningTile'], 'winningTile'); if (err) return err;

  if (isObject(playerDiscards)) {
    for (const [k, v] of Object.entries(playerDiscards)) {
      err = addArr(v, `playerDiscards['${k}']`); if (err) return err;
    }
  }

  for (let i = 0; i < 4; i++) {
    const p = players[i] as Record<string, unknown>;
    err = addArr(p['hand'], `players[${i}].hand`); if (err) return err;
    err = addArr(p['flowers'], `players[${i}].flowers`); if (err) return err;
    if (Array.isArray(p['melds'])) {
      for (let m = 0; m < (p['melds'] as unknown[]).length; m++) {
        const meld = (p['melds'] as unknown[])[m];
        if (isObject(meld) && Array.isArray(meld['tiles'])) {
          err = addArr(meld['tiles'], `players[${i}].melds[${m}].tiles`); if (err) return err;
        }
      }
    }
  }

  // Multiset legality
  const kindCounts = new Map<string, number>();
  let totalTiles = 0;
  for (const t of allTiles) {
    const key = rawTileKey(t);
    const suit = t['suit'] as string;
    const prev = kindCounts.get(key) ?? 0;
    const next = prev + 1;
    kindCounts.set(key, next);
    totalTiles++;

    const maxCopies = BONUS_SUITS.has(suit) ? 1 : 4;
    if (next > maxCopies) {
      return fail(`tile kind '${key}' appears ${next} times (max ${maxCopies})`);
    }
  }

  if (totalTiles > 144) {
    return fail(`total tile count ${totalTiles} exceeds 144`);
  }

  return ok;
}

function validateMatchPayload(match: Record<string, unknown>): ValidationResult {
  const playerScores = match['playerScores'];
  if (!Array.isArray(playerScores) || playerScores.length !== 4) {
    return fail(`playerScores must be an array of 4 (got ${Array.isArray(playerScores) ? playerScores.length : typeof playerScores})`);
  }
  for (let i = 0; i < 4; i++) {
    if (typeof playerScores[i] !== 'number' || !isFinite(playerScores[i] as number)) {
      return fail(`playerScores[${i}] is not a finite number (got ${playerScores[i]})`);
    }
  }

  const playerNames = match['playerNames'];
  if (!Array.isArray(playerNames) || playerNames.length !== 4) {
    return fail(`playerNames must be an array of 4`);
  }
  for (let i = 0; i < 4; i++) {
    if (typeof playerNames[i] !== 'string') {
      return fail(`playerNames[${i}] is not a string`);
    }
  }

  if (typeof match['phase'] !== 'string') {
    return fail(`match.phase is not a string`);
  }

  const handResults = match['handResults'];
  if (Array.isArray(handResults) && handResults.length > 200) {
    return fail(`handResults.length ${handResults.length} exceeds cap of 200`);
  }

  return ok;
}

/**
 * Validate a raw parsed JSON payload from localStorage before handing it to
 * gameStateFromJson / matchStateFromJson. Returns the first violation found.
 * Never throws.
 */
export function validateSavedGamePayload(parsed: unknown): ValidationResult {
  if (!isObject(parsed)) {
    return fail('payload is not an object');
  }

  if (parsed['version'] !== 1) {
    return fail(`version must be 1 (got ${parsed['version']})`);
  }

  const rawMatch = parsed['match'];
  const rawGame = parsed['game'];

  // Both null/absent is valid (loadGame handles that path)
  const gamePayload =
    (rawGame !== undefined && rawGame !== null) ? rawGame :
    (isObject(rawMatch) && rawMatch['currentHand'] !== undefined && rawMatch['currentHand'] !== null)
      ? rawMatch['currentHand']
      : null;

  if (gamePayload !== null) {
    if (!isObject(gamePayload)) {
      return fail('game payload is not an object');
    }
    const result = validateGamePayload(gamePayload);
    if (!result.ok) return result;
  }

  if (rawMatch !== undefined && rawMatch !== null) {
    if (!isObject(rawMatch)) {
      return fail('match payload is not an object');
    }
    const result = validateMatchPayload(rawMatch);
    if (!result.ok) return result;
  }

  return ok;
}
