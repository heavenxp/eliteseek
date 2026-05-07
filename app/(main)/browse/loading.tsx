export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="space-y-6">
            <div className="h-5 w-16 animate-pulse rounded-md bg-[rgba(255,255,255,0.05)]" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
            <div className="gold-divider" />
            <div className="h-9 animate-pulse rounded-lg bg-[rgba(255,255,255,0.04)]" />
            <div className="gold-divider" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
          </div>
        </aside>

        {/* Grid skeleton */}
        <main className="min-w-0 flex-1">
          <div className="mb-6 h-10 animate-pulse rounded-xl bg-[rgba(255,255,255,0.04)]" />
          <div className="mb-5 h-4 w-40 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.08)] bg-[rgba(255,255,255,0.02)]">
      <div className="h-64 animate-pulse bg-[rgba(255,255,255,0.04)]" />
      <div className="space-y-2.5 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-[rgba(255,255,255,0.05)]" />
        <div className="h-3 w-full animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
        <div className="flex gap-1.5 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-5 w-14 animate-pulse rounded-full bg-[rgba(255,255,255,0.04)]" />
          ))}
        </div>
        <div className="flex justify-between pt-2">
          <div className="h-3 w-20 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
        </div>
      </div>
    </div>
  );
}
