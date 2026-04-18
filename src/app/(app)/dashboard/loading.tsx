export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-space">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Hero card skeleton */}
        <div className="card mb-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 shrink-0 rounded-full bg-horizon/30 animate-pulse" />
              <div className="space-y-2.5">
                <div className="h-5 w-40 bg-horizon/40 animate-pulse rounded" />
                <div className="h-3 w-52 bg-horizon/30 animate-pulse rounded" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 w-20 bg-horizon/30 animate-pulse rounded-full" />
                  <div className="h-5 w-20 bg-horizon/30 animate-pulse rounded-full" />
                </div>
              </div>
            </div>
            <div className="h-10 w-32 bg-horizon/30 animate-pulse rounded-button" />
          </div>
          {/* Stats row skeleton */}
          <div className="mt-6 pt-5 border-t border-horizon/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-horizon/30 animate-pulse rounded" />
                <div className="h-6 w-12 bg-horizon/40 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 bg-horizon/30 animate-pulse rounded-button shrink-0" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5 sm:p-6 flex items-center gap-5">
              <div className="h-16 w-16 shrink-0 rounded-xl bg-horizon/30 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 bg-horizon/40 animate-pulse rounded" />
                <div className="h-4 w-64 bg-horizon/30 animate-pulse rounded" />
                <div className="h-3 w-40 bg-horizon/20 animate-pulse rounded" />
              </div>
              <div className="h-10 w-28 shrink-0 rounded-button bg-horizon/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
