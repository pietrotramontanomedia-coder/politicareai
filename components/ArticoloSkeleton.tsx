import Skeleton from './Skeleton';

export default function ArticoloSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-24 mb-3" />

      <Skeleton className="h-9 w-full mb-2" />
      <Skeleton className="h-9 w-3/4 mb-6" />

      <Skeleton className="w-full aspect-video rounded-2xl mb-8" />

      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
