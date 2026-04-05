export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-gradient-to-br from-space via-cosmos to-space">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-horizon/60 pb-8">
          <div className="h-3 w-24 bg-horizon/40 animate-pulse rounded mb-4" />
          <div className="h-9 w-64 bg-horizon/40 animate-pulse rounded mb-3" />
          <div className="h-4 w-48 bg-horizon/30 animate-pulse rounded" />
        </header>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-5 rounded-xl border border-horizon/60 bg-nebula/20 p-5 sm:p-6"
            >
              <div className="h-16 w-16 shrink-0 rounded-xl bg-horizon/30 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 bg-horizon/40 animate-pulse rounded" />
                <div className="h-4 w-64 bg-horizon/30 animate-pulse rounded" />
                <div className="h-3 w-40 bg-horizon/20 animate-pulse rounded" />
              </div>
              <div className="h-10 w-28 shrink-0 rounded-lg bg-horizon/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
