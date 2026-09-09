import Skeleton from './Skeleton';

export default function FeedSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-52 sm:h-10 sm:w-64" />
        <Skeleton className="mt-3 h-5 w-72" />
      </div>

      {/* Carousel skeleton */}
      <div className="mb-12">
        <Skeleton
          className="w-full rounded-2xl sm:rounded-3xl"
          style={{ height: 'clamp(280px, 45vw, 480px)' }}
        />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl sm:rounded-2xl border overflow-hidden flex flex-col"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
          >
            <Skeleton className="h-40 sm:h-48 w-full rounded-none" />
            <div className="p-4 sm:p-5 flex flex-col gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
