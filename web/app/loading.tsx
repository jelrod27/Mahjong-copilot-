export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-retro-bg text-retro-text">
      <p className="font-pixel text-retro-cyan retro-glow text-sm" role="status" aria-live="polite">
        LOADING<span className="animate-blink">...</span>
      </p>
    </div>
  );
}
