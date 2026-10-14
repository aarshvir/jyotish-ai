export function DashboardLoading() {
  return <div className="min-h-[calc(100vh-var(--nav-height))] bg-space font-body text-star">
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
      <p role="status" aria-live="polite" className="mb-6 text-sm text-dust">Loading your saved reports...</p>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="flex items-center gap-3 border-b border-horizon pb-6"><div className="h-12 w-12 shrink-0 rounded-full bg-horizon/30" /><div className="min-w-0 flex-1 space-y-3"><div className="h-5 w-40 max-w-full rounded bg-horizon/30" /><div className="h-4 w-60 max-w-full rounded bg-horizon/20" /></div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map(key => <div key={key} className="h-11 rounded-md bg-horizon/20" />)}</div>
        {[0, 1, 2].map(key => <div key={key} className="space-y-3 border-b border-horizon py-5"><div className="h-5 w-48 max-w-full rounded bg-horizon/30" /><div className="h-4 w-72 max-w-full rounded bg-horizon/20" /></div>)}
      </div>
    </div>
  </div>;
}
