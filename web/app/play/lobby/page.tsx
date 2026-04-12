'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useGameRoom from '@/hooks/useGameRoom';
import { GameMode } from '@/models/MatchState';

const WIND_LABELS = ['East', 'South', 'West', 'North'];

export default function LobbyPage() {
  const router = useRouter();
  const {
    room,
    players,
    isHost,
    error,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    fillWithAI,
  } = useGameRoom();

  // ── Local state ─────────────────────────────────────────────────────
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'room'>('menu');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [mode, setMode] = useState<GameMode>('quick');
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Transition to room view when room is set
  useEffect(() => {
    if (room) setView('room');
  }, [room]);

  // Navigate to multiplayer game when room status becomes "playing"
  useEffect(() => {
    if (room?.status === 'playing') {
      router.push(`/play/multiplayer?roomId=${room.id}`);
    }
  }, [room?.status, room?.id, router]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const code = await createRoom(difficulty, mode);
    if (code) setRoomCode(code);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    await joinRoom(joinCode, displayName || 'Player');
  };

  const handleLeave = async () => {
    await leaveRoom();
    setView('menu');
    setRoomCode('');
  };

  const handleStart = async () => {
    await startGame();
  };

  const handleFillAI = async () => {
    await fillWithAI();
  };

  const allReady = players.length > 0 && players.every(p => p.is_ready);
  const humanPlayers = players.filter(p => !p.user_id.startsWith('ai-'));
  const myPlayer = players.find(p => !p.user_id.startsWith('ai-') && p.seat_index >= 0);

  // ── Menu view ───────────────────────────────────────────────────────

  if (view === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="font-pixel text-xl text-retro-accent retro-glow-strong mb-2">
          MULTIPLAYER
        </h1>
        <h2 className="font-pixel text-sm text-retro-gold retro-glow mb-8">
          HONG KONG MAHJONG
        </h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setView('create')}
            className="retro-btn-green font-pixel text-sm px-6 py-3 w-full"
          >
            [ CREATE ROOM ]
          </button>
          <button
            onClick={() => setView('join')}
            className="retro-btn font-pixel text-sm px-6 py-3 w-full"
          >
            [ JOIN ROOM ]
          </button>
          <button
            onClick={() => router.push('/play')}
            className="retro-btn font-pixel text-xs px-6 py-2 w-full opacity-70"
          >
            BACK
          </button>
        </div>

        {error && (
          <div className="mt-4 retro-panel p-3 border-red-500 text-red-400 font-retro text-sm max-w-xs text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Create view ─────────────────────────────────────────────────────

  if (view === 'create') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="font-pixel text-lg text-retro-accent retro-glow-strong mb-6">
          CREATE ROOM
        </h1>

        {/* Game mode */}
        <div className="retro-panel p-4 mb-4 w-full max-w-xs">
          <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">GAME MODE</div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMode('quick')}
              className={`retro-btn text-center w-full ${
                mode === 'quick' ? 'bg-retro-accent text-white border-retro-gold' : 'bg-retro-bgLight'
              }`}
            >
              <div className="font-pixel text-xs">QUICK GAME</div>
              <div className="font-retro text-xs text-retro-textDim mt-0.5">East round only</div>
            </button>
            <button
              onClick={() => setMode('full')}
              className={`retro-btn text-center w-full ${
                mode === 'full' ? 'bg-retro-accent text-white border-retro-gold' : 'bg-retro-bgLight'
              }`}
            >
              <div className="font-pixel text-xs">FULL GAME</div>
              <div className="font-retro text-xs text-retro-textDim mt-0.5">All 4 rounds</div>
            </button>
          </div>
        </div>

        {/* Difficulty (for AI fill) */}
        <div className="retro-panel p-4 mb-6 w-full max-w-xs">
          <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">AI DIFFICULTY</div>
          <div className="flex flex-col gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`retro-btn text-center w-full font-pixel text-xs ${
                  difficulty === d ? 'bg-retro-accent text-white border-retro-gold' : 'bg-retro-bgLight'
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setView('menu')}
            className="retro-btn font-pixel text-xs px-4 py-2"
          >
            BACK
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="retro-btn-green font-pixel text-xs px-6 py-2"
          >
            {loading ? 'CREATING...' : '[ CREATE ]'}
          </button>
        </div>

        {error && (
          <div className="mt-4 retro-panel p-3 border-red-500 text-red-400 font-retro text-sm max-w-xs text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Join view ───────────────────────────────────────────────────────

  if (view === 'join') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="font-pixel text-lg text-retro-accent retro-glow-strong mb-6">
          JOIN ROOM
        </h1>

        <div className="retro-panel p-4 mb-4 w-full max-w-xs">
          <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">ROOM CODE</div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="XXXXXX"
            className="w-full bg-retro-bg border-2 border-retro-border text-retro-text font-pixel text-lg
                       text-center p-3 tracking-[0.3em] placeholder:text-retro-textDim/30
                       focus:outline-none focus:border-retro-gold"
          />
        </div>

        <div className="retro-panel p-4 mb-6 w-full max-w-xs">
          <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">DISPLAY NAME</div>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={16}
            placeholder="Your name"
            className="w-full bg-retro-bg border-2 border-retro-border text-retro-text font-retro text-sm
                       text-center p-2 placeholder:text-retro-textDim/30
                       focus:outline-none focus:border-retro-gold"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setView('menu')}
            className="retro-btn font-pixel text-xs px-4 py-2"
          >
            BACK
          </button>
          <button
            onClick={handleJoin}
            disabled={loading || joinCode.length < 6}
            className="retro-btn-green font-pixel text-xs px-6 py-2 disabled:opacity-40"
          >
            {loading ? 'JOINING...' : '[ JOIN ]'}
          </button>
        </div>

        {error && (
          <div className="mt-4 retro-panel p-3 border-red-500 text-red-400 font-retro text-sm max-w-xs text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Room view (waiting lobby) ───────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="font-pixel text-lg text-retro-accent retro-glow-strong mb-2">
        GAME ROOM
      </h1>

      {/* Room code */}
      <div className="retro-panel p-4 mb-4 w-full max-w-sm text-center">
        <div className="font-pixel text-xs text-retro-cyan mb-2">ROOM CODE</div>
        <div className="font-pixel text-2xl text-retro-gold retro-glow-strong tracking-[0.4em]">
          {roomCode || room?.code || '------'}
        </div>
        <div className="font-retro text-xs text-retro-textDim mt-2">
          Share this code with friends to join
        </div>
      </div>

      {/* Room settings */}
      <div className="retro-panel p-3 mb-4 w-full max-w-sm">
        <div className="flex justify-between font-retro text-sm text-retro-textDim">
          <span>Mode: <span className="text-retro-text">{room?.mode?.toUpperCase() || 'QUICK'}</span></span>
          <span>AI: <span className="text-retro-text">{room?.difficulty?.toUpperCase() || 'MEDIUM'}</span></span>
        </div>
      </div>

      {/* Player list */}
      <div className="retro-panel p-4 mb-4 w-full max-w-sm">
        <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">
          PLAYERS ({players.length}/{room?.max_players || 4})
        </div>
        <div className="space-y-2">
          {Array.from({ length: room?.max_players || 4 }, (_, i) => {
            const player = players.find(p => p.seat_index === i);
            const isAI = player?.user_id.startsWith('ai-');
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-2 border ${
                  player
                    ? 'border-retro-border/60 bg-retro-bgLight/30'
                    : 'border-retro-border/20 bg-retro-bg/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-xs text-retro-textDim w-8">
                    {WIND_LABELS[i]}
                  </span>
                  {player ? (
                    <span className={`font-retro text-sm ${isAI ? 'text-retro-cyan' : 'text-retro-text'}`}>
                      {player.display_name}
                      {isAI && ' [AI]'}
                    </span>
                  ) : (
                    <span className="font-retro text-sm text-retro-textDim/40">
                      Empty seat
                    </span>
                  )}
                </div>
                <div>
                  {player?.is_ready ? (
                    <span className="font-pixel text-xs text-retro-green">READY</span>
                  ) : player ? (
                    <span className="font-pixel text-xs text-retro-gold animate-pulse">WAITING</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {/* Ready toggle (non-host humans) */}
        {!isHost && myPlayer && (
          <button
            onClick={() => setReady(!myPlayer.is_ready)}
            className={`font-pixel text-xs px-6 py-2 w-full ${
              myPlayer.is_ready ? 'retro-btn' : 'retro-btn-green'
            }`}
          >
            {myPlayer.is_ready ? '[ NOT READY ]' : '[ READY UP ]'}
          </button>
        )}

        {/* Host controls */}
        {isHost && (
          <>
            {players.length < (room?.max_players || 4) && (
              <button
                onClick={handleFillAI}
                className="retro-btn font-pixel text-xs px-6 py-2 w-full"
              >
                [ FILL WITH AI ]
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={!allReady || players.length < 2}
              className="retro-btn-green font-pixel text-sm px-6 py-3 w-full disabled:opacity-40"
            >
              [ START GAME ]
            </button>
          </>
        )}

        <button
          onClick={handleLeave}
          className="retro-btn font-pixel text-xs px-6 py-2 w-full opacity-70"
        >
          LEAVE ROOM
        </button>
      </div>

      {error && (
        <div className="mt-4 retro-panel p-3 border-red-500 text-red-400 font-retro text-sm max-w-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
