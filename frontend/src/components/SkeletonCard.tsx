export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-card shadow-sm border border-gray-100 p-5 animate-pulse">
      {/* Title skeleton */}
      <div className="h-5 bg-gray-200 rounded-md w-3/4 mb-3" />
      {/* Amount row */}
      <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-4" />
      {/* Divider */}
      <div className="border-t border-gray-100 mb-4" />
      {/* Participant rows */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-40" />
          <div className="h-3.5 bg-gray-200 rounded-full w-5" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-36" />
          <div className="h-3.5 bg-gray-200 rounded-full w-5" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-44" />
          <div className="h-3.5 bg-gray-200 rounded-full w-5" />
        </div>
      </div>
      {/* Button skeleton */}
      <div className="mt-5 h-10 bg-gray-200 rounded-lg w-full" />
    </div>
  )
}
