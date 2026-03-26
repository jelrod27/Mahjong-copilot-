'use client';

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (status === 'connected') return null;

  const config = {
    connecting: { label: 'Connecting...', color: 'text-retro-cyan', bg: 'bg-retro-cyan/10' },
    reconnecting: { label: 'Reconnecting...', color: 'text-retro-gold', bg: 'bg-retro-gold/10' },
    disconnected: { label: 'Disconnected', color: 'text-retro-accent', bg: 'bg-retro-accent/10' },
  }[status];

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${config.bg} border border-current rounded-lg px-4 py-2 ${config.color}`}>
      <p className="font-retro text-sm flex items-center gap-2">
        <span className="animate-pulse">&#9679;</span>
        {config.label}
      </p>
    </div>
  );
}
