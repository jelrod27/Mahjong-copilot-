'use client';

interface TurnTimerProps {
  timeRemaining: number; // ms remaining
  totalTime: number;     // ms total
}

export default function TurnTimer({ timeRemaining, totalTime }: TurnTimerProps) {
  if (totalTime <= 0) return null;

  const pct = Math.max(0, (timeRemaining / totalTime) * 100);
  const seconds = Math.ceil(timeRemaining / 1000);
  const isLow = pct < 30;
  const isCritical = pct < 15;

  const barColor = isCritical
    ? 'bg-retro-accent'
    : isLow
    ? 'bg-retro-gold'
    : 'bg-retro-cyan';

  return (
    <div className="flex items-center gap-2 px-4">
      <div className="flex-1 h-2 bg-retro-bgLight rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${barColor} ${
            isCritical ? 'animate-pulse' : ''
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-retro text-sm w-6 text-right ${
        isCritical ? 'text-retro-accent animate-blink' : isLow ? 'text-retro-gold' : 'text-retro-cyan'
      }`}>
        {seconds}
      </span>
    </div>
  );
}
