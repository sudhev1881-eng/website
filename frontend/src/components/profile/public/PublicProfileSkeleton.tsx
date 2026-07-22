import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";

export function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading profile">
      <div className="h-28 animate-pulse bg-surface sm:h-36" />
      <div className="mx-auto -mt-10 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-8 rounded-3xl border border-border/70 bg-surface/50 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row">
              <Skeleton className="h-36 w-36 rounded-2xl sm:h-44 sm:w-44" />
              <div className="flex-1 space-y-3 pt-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <SkeletonText lines={2} className="max-w-md" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-12 w-40 rounded-xl" />
                  <Skeleton className="h-12 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          <div className="hidden space-y-4 rounded-2xl border border-border/70 p-5 lg:block">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="flex gap-2">
              <SkeletonCircle className="h-8 w-8" />
              <Skeleton className="h-8 flex-1" />
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-4">
          <Skeleton className="h-6 w-48" />
          <SkeletonText lines={4} />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
