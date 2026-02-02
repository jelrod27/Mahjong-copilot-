import {GameState, GamePhase, PlayerAction, Player, Tile} from '../../models/GameState';
import {TileFactory} from '../../models/Tile';
import FirebaseService from '../../services/firebaseService';
import StorageService from '../../services/storageService';
import {gameStateToJson, gameStateFromJson} from '../../models/GameState';

export interface GameReduxState {
  currentGame: GameState | null;
  isLoading: boolean;
  errorMessage: string | null;
  isPaused: boolean;
}

export const GAME_CREATE_START = 'GAME_CREATE_START';
export const GAME_CREATE_SUCCESS = 'GAME_CREATE_SUCCESS';
export const GAME_CREATE_FAILURE = 'GAME_CREATE_FAILURE';
export const GAME_LOAD_START = 'GAME_LOAD_START';
export const GAME_LOAD_SUCCESS = 'GAME_LOAD_SUCCESS';
export const GAME_LOAD_FAILURE = 'GAME_LOAD_FAILURE';
export const GAME_MAKE_MOVE = 'GAME_MAKE_MOVE';
export const GAME_PAUSE = 'GAME_PAUSE';
export const GAME_RESUME = 'GAME_RESUME';
export const GAME_CLEAR = 'GAME_CLEAR';
export const GAME_CLEAR_ERROR = 'GAME_CLEAR_ERROR';

export const createNewGame = (userId: string, variant: string, aiDifficulty: number) => async (dispatch: any) => {
  dispatch({type: GAME_CREATE_START});
  try {
    const gameId = FirebaseService.getFirestore().collection('games').doc().id;
    const tiles = TileFactory.getAllTiles();
    
    // Shuffle tiles
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const players: Player[] = [
      {id: userId, name: 'You', isAI: false, hand: [], melds: [], score: 0},
      {id: 'ai1', name: 'AI Player 1', isAI: true, hand: [], melds: [], score: 0},
      {id: 'ai2', name: 'AI Player 2', isAI: true, hand: [], melds: [], score: 0},
      {id: 'ai3', name: 'AI Player 3', isAI: true, hand: [], melds: [], score: 0},
    ];

    // Deal tiles (13 tiles per player, 1 tile to start)
    const hands: Tile[][] = [];
    let tileIndex = 0;

    for (let i = 0; i < 4; i++) {
      hands.push(tiles.slice(tileIndex, tileIndex + 13));
      tileIndex += 13;
    }

    // Update players with their hands
    const updatedPlayers: Player[] = players.map((player, i) => ({
      ...player,
      hand: hands[i],
    }));

    // Draw first tile for player
    const firstTile = tiles[tileIndex];
    updatedPlayers[0].hand.push(firstTile);

    const wall = tiles.slice(tileIndex + 1);

    const gameState: GameState = {
      id: gameId,
      variant,
      phase: GamePhase.PLAYING,
      players: updatedPlayers,
      currentPlayerIndex: 0,
      wall,
      discardPile: [],
      createdAt: new Date(),
      turnHistory: [],
    };

    await saveGame(gameState)(dispatch);
    dispatch({type: GAME_CREATE_SUCCESS, payload: gameState});
    await FirebaseService.logEvent('game_started', {variant, difficulty: aiDifficulty});
  } catch (error: any) {
    dispatch({type: GAME_CREATE_FAILURE, payload: error.message});
  }
};

export const loadGame = (gameId: string) => async (dispatch: any) => {
  dispatch({type: GAME_LOAD_START});
  try {
    const doc = await FirebaseService.getFirestore().collection('games').doc(gameId).get();

    if (doc.exists) {
      const gameState = gameStateFromJson(doc.data()!);
      dispatch({type: GAME_LOAD_SUCCESS, payload: gameState});
    } else {
      dispatch({type: GAME_LOAD_FAILURE, payload: 'Game not found'});
    }
  } catch (error: any) {
    dispatch({type: GAME_LOAD_FAILURE, payload: error.message});
  }
};

export const makeMove = (action: PlayerAction, tile?: Tile) => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.game.currentGame || state.game.currentGame.phase === GamePhase.FINISHED) return;

  try {
    let updatedGame: GameState = {...state.game.currentGame};

    switch (action) {
      case PlayerAction.DRAW:
        if (updatedGame.wall.length > 0) {
          const drawnTile = updatedGame.wall[0];
          updatedGame = {
            ...updatedGame,
            wall: updatedGame.wall.slice(1),
            players: updatedGame.players.map((p, i) =>
              i === updatedGame.currentPlayerIndex
                ? {...p, hand: [...p.hand, drawnTile]}
                : p
            ),
            lastDrawnTile: drawnTile,
          };
        }
        break;

      case PlayerAction.DISCARD:
        if (tile) {
          const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
          const updatedHand = currentPlayer.hand.filter(t => t.id !== tile.id);
          const nextPlayerIndex = (updatedGame.currentPlayerIndex + 1) % 4;

          updatedGame = {
            ...updatedGame,
            players: updatedGame.players.map((p, i) =>
              i === updatedGame.currentPlayerIndex
                ? {...p, hand: updatedHand}
                : p
            ),
            discardPile: [...updatedGame.discardPile, tile],
            lastDiscardedTile: tile,
            lastAction: action,
            currentPlayerIndex: nextPlayerIndex,
            turnHistory: [
              ...updatedGame.turnHistory,
              {
                turnNumber: updatedGame.turnHistory.length + 1,
                playerId: currentPlayer.id,
                action,
                tile,
                timestamp: new Date(),
              },
            ],
          };

          // Simple AI turn
          if (updatedGame.players[nextPlayerIndex].isAI) {
            setTimeout(() => {
              makeAIMove(nextPlayerIndex)(dispatch, getState);
            }, 500);
          }
        }
        break;

      case PlayerAction.WIN:
        updatedGame = {
          ...updatedGame,
          phase: GamePhase.FINISHED,
          winnerId: updatedGame.players[updatedGame.currentPlayerIndex].id,
          finishedAt: new Date(),
        };
        await FirebaseService.logEvent('game_won', {variant: updatedGame.variant});
        break;

      default:
        break;
    }

    await saveGame(updatedGame)(dispatch);
    dispatch({type: GAME_MAKE_MOVE, payload: updatedGame});
  } catch (error: any) {
    dispatch({type: GAME_CLEAR_ERROR, payload: error.message});
  }
};

export const makeAIMove = (playerIndex: number) => async (dispatch: any, getState: any) => {
  const state = getState();
  const aiPlayer = state.game.currentGame?.players[playerIndex];
  if (!aiPlayer || aiPlayer.hand.length === 0) return;

  const randomTile = aiPlayer.hand[Math.floor(Math.random() * aiPlayer.hand.length)];
  await makeMove(PlayerAction.DISCARD, randomTile)(dispatch, getState);
};

export const pauseGame = () => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.game.currentGame) return;

  const updatedGame: GameState = {
    ...state.game.currentGame,
    phase: GamePhase.PAUSED,
  };

  await saveGame(updatedGame)(dispatch);
  dispatch({type: GAME_PAUSE, payload: updatedGame});
};

export const resumeGame = () => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.game.currentGame) return;

  const updatedGame: GameState = {
    ...state.game.currentGame,
    phase: GamePhase.PLAYING,
  };

  await saveGame(updatedGame)(dispatch);
  dispatch({type: GAME_RESUME, payload: updatedGame});
};

export const clearGame = () => ({
  type: GAME_CLEAR,
});

export const clearGameError = () => ({
  type: GAME_CLEAR_ERROR,
});

const saveGame = (gameState: GameState) => async (dispatch: any) => {
  try {
    await FirebaseService.getFirestore()
      .collection('games')
      .doc(gameState.id)
      .set(gameStateToJson(gameState), {merge: true});
    await StorageService.saveGame(gameState);
  } catch (error) {
    console.error('Error saving game:', error);
  }
};

