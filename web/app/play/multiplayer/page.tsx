'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import useMultiplayerGame from '@/hooks/useMultiplayerGame';
import GameBoard from '@/components/game/GameBoard';

function MultiplayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('roomId') || '';
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Resolve user ID on mount
  useEffect(() => {
    async function resolveUser() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setPlayerId(user.id);
        } else {
          setAuthError('You must be signed in to play multiplayer.');
        }
      } catch {
        setAuthError('Failed to connect. Please try again.');
      }
    }
    resolveUser();
  }, []);

  if (!roomId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="font-pixel text-retro-accent text-sm">NO ROOM SPECIFIED</div>
        <button
          onClick={() => router.push('/play/lobby')}
          className="retro-btn font-pixel text-xs px-4 py-2"
        >
          GO TO LOBBY
        </button>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="font-pixel text-red-400 text-sm">{authError}</div>
        <button
          onClick={() => router.push('/play/lobby')}
          className="retro-btn font-pixel text-xs px-4 py-2"
        >
          BACK TO LOBBY
        </button>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          CONNECTING<span className="animate-blink">...</span>
        </div>
      </div>
    );
  }

  return <MultiplayerGame roomId={roomId} playerId={playerId} />;
}

// ── Inner component that uses the multiplayer hook ────────────────────

function MultiplayerGame({ roomId, playerId }: { roomId: string; playerId: string }) {
  const router = useRouter();
  const controller = useMultiplayerGame(roomId, playerId);

  // Connection status indicator
  const statusColor =
    controller.connectionStatus === 'connected'
      ? 'text-retro-green'
      : controller.connectionStatus === 'reconnecting'
      ? 'text-retro-gold animate-pulse'
      : controller.connectionStatus === 'connecting'
      ? 'text-retro-cyan animate-pulse'
      : 'text-red-400';

  if (!controller.game) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          WAITING FOR GAME<span className="animate-blink">...</span>
        </div>
        <div className={`font-retro text-xs ${statusColor}`}>
          {controller.connectionStatus.toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connection status badge */}
      <div className={`absolute top-2 right-2 z-40 font-retro text-xs ${statusColor}`}>
        {controller.connectionStatus !== 'connected' && controller.connectionStatus.toUpperCase()}
      </div>

      <GameBoard
        gameState={controller.game}
        match={controller.match}
        humanPlayerId={playerId}
        selectedTileId={controller.selectedTileId}
        suggestedTileId={controller.suggestedTileId}
        tutorAdvice={controller.tutorAdvice}
        tenpaiStatus={controller.tenpaiStatus}
        tileClassifications={controller.tileClassifications}
        onTileSelect={controller.selectTile}
        onDiscard={controller.discardSelected}
        onKong={controller.declareKong}
        onWin={controller.declareWin}
        onClaimBest={controller.claimBest}
        onSubmitChow={controller.submitChow}
        onPass={controller.pass}
        canDeclareKong={controller.canDeclareKong}
        canDeclareWin={controller.canDeclareWin}
        hasClaimOptions={controller.claimOptions.length > 0}
        claimOptions={controller.claimOptions}
        claimTimer={controller.claimTimer}
      />

      {/* Game over overlay */}
      {controller.isGameOver && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center gap-6">
          <div className="font-pixel text-xl text-retro-gold retro-glow-strong">
            GAME OVER
          </div>
          {controller.scoringResult && (
            <div className="retro-panel p-4 text-center">
              <div className="font-pixel text-sm text-retro-green mb-2">
                {controller.scoringResult.totalFan} FAN
              </div>
              <div className="font-retro text-xs text-retro-textDim">
                {controller.scoringResult.fans.map((f: { name: string }) => f.name).join(', ')}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/play/lobby')}
              className="retro-btn font-pixel text-xs px-4 py-2"
            >
              BACK TO LOBBY
            </button>
            <button
              onClick={() => router.push('/play')}
              className="retro-btn font-pixel text-xs px-4 py-2"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default export with Suspense boundary ─────────────────────────────

export default function MultiplayerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="font-pixel text-retro-cyan retro-glow text-sm">
            LOADING<span className="animate-blink">...</span>
          </div>
        </div>
      }
    >
      <MultiplayerContent />
    </Suspense>
  );
}
