'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClaimType } from '@/models/GameState';
import { AvailableClaim } from '@/engine/types';
import { createClient } from '@/lib/supabase/client';
import { getRoomPlayers, leaveRoom, RoomPlayer } from '@/lib/multiplayer/roomService';
import useMultiplayerGame from '@/hooks/useMultiplayerGame';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import ClaimChoiceModal from '@/components/game/ClaimChoiceModal';
import ConnectionStatus from '@/components/multiplayer/ConnectionStatus';
import WaitingRoom from '@/components/multiplayer/WaitingRoom';

export default function MultiplayerGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Poll room state before game starts
  useEffect(() => {
    if (gameStarted || !userId) return;

    const fetchRoom = async () => {
      const supabase = createClient();
      const { data: room } = await supabase
        .from('rooms')
        .select('code, host_id, status')
        .eq('id', roomId)
        .single();

      if (room) {
        setRoomCode(room.code);
        setIsHost(room.host_id === userId);
        if (room.status === 'playing') {
          setGameStarted(true);
        }
      }

      const roomPlayers = await getRoomPlayers(roomId);
      setPlayers(roomPlayers);
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [roomId, userId, gameStarted]);

  const handleLeave = async () => {
    await leaveRoom(roomId);
    router.push('/multiplayer/lobby');
  };

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="font-retro text-retro-textDim">Loading...</p>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <WaitingRoom
        roomCode={roomCode}
        players={players}
        maxPlayers={4}
        isHost={isHost}
        onLeave={handleLeave}
      />
    );
  }

  return <ActiveGame roomId={roomId} playerId={userId} />;
}

function ActiveGame({ roomId, playerId }: { roomId: string; playerId: string }) {
  const router = useRouter();
  const controller = useMultiplayerGame(roomId, playerId);
  const [pendingClaim, setPendingClaim] = useState<AvailableClaim | null>(null);

  if (!controller.game) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ConnectionStatus status={controller.connectionStatus} />
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          LOADING GAME<span className="animate-blink">...</span>
        </div>
      </div>
    );
  }

  const handleClaim = (claimType: string) => {
    const claim = controller.claimOptions.find(c => c.claimType === claimType);
    if (!claim) return;
    if (claim.tilesFromHand.length > 1) {
      setPendingClaim(claim);
      return;
    }
    controller.submitClaim(claimType as ClaimType, claim.tilesFromHand[0] || []);
  };

  const handleClaimSelect = (claimType: ClaimType, tilesFromHand: any) => {
    controller.submitClaim(claimType, tilesFromHand);
    setPendingClaim(null);
  };

  return (
    <>
      <ConnectionStatus status={controller.connectionStatus} />

      <GameBoard
        gameState={controller.game}
        humanPlayerId={playerId}
        selectedTileId={controller.selectedTileId}
        onTileSelect={controller.selectTile}
        onDiscard={controller.discardSelected}
        onKong={controller.declareKong}
        onWin={controller.declareWin}
        onClaim={handleClaim}
        onPass={controller.pass}
        canDeclareKong={controller.canDeclareKong}
        canDeclareWin={controller.canDeclareWin}
        hasClaimOptions={controller.claimOptions.length > 0}
        claimTimer={controller.claimTimer}
      />

      {pendingClaim && controller.game.lastDiscardedTile && (
        <ClaimChoiceModal
          claim={pendingClaim}
          discardedTile={controller.game.lastDiscardedTile}
          onSelect={handleClaimSelect}
          onCancel={() => { setPendingClaim(null); controller.pass(); }}
        />
      )}

      {controller.isGameOver && (
        <GameOverScreen
          gameState={controller.game}
          scoringResult={controller.scoringResult}
          onPlayAgain={() => router.push('/multiplayer/lobby')}
          onBackToMenu={() => router.push('/multiplayer/lobby')}
        />
      )}
    </>
  );
}
