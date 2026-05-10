export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-background text-foreground">
      <p className="font-display text-info ds-text-glow text-sm" role="status" aria-live="polite">
        LOADING<span className="animate-blink">...</span>
      </p>
    </div>
  );
}
