interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = 'h-4 w-full', count = 1 }: SkeletonProps) {
  if (count > 1) {
    return (
      <div className="space-y-2 w-full" aria-busy="true" aria-label="Loading content">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className={`rounded bg-paper-3 motion-safe:animate-pulse ${className}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`rounded bg-paper-3 motion-safe:animate-pulse ${className}`}
      aria-busy="true"
      aria-label="Loading content"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-3.5 rounded-lg border border-rule bg-paper-2 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-7 w-36" />
      <div className="flex justify-between pt-2 border-t border-rule">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default Skeleton;
