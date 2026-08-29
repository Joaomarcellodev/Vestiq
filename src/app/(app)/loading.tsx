/** Fallback shown while an authenticated route segment streams in. */
export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-lg" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-surface-container-high" />
        <div className="h-4 w-64 rounded bg-surface-container" />
      </div>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-outline-variant bg-surface-container-lowest"
          />
        ))}
      </div>

      <div className="space-y-md">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-outline-variant bg-surface-container-lowest"
          />
        ))}
      </div>
    </div>
  );
}
