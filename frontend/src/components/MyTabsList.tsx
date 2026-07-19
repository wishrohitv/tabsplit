import { useAccount } from 'wagmi'
import { useMyTabIds } from '../hooks/useTabSplit'
import TabCard from './TabCard'
import SkeletonCard from './SkeletonCard'

export default function MyTabsList() {
  const { address } = useAccount()
  const { data: rawTabIds, isLoading, refetch } = useMyTabIds(address)
  const tabIds = rawTabIds as readonly bigint[] | undefined

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  // Empty state
  if (!tabIds || tabIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-3xl mb-5">
          🧾
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No tabs yet</h3>
        <p className="text-sm text-muted max-w-xs">
          Create a tab to split a bill with friends, or ask someone to add you as a participant.
        </p>
      </div>
    )
  }

  // Sort by most recent first (highest ID = most recent)
  const sortedIds = [...tabIds].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
          {tabIds.length} tab{tabIds.length === 1 ? '' : 's'}
        </h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedIds.map(id => (
          <TabCard key={id.toString()} tabId={id} connectedAddress={address} />
        ))}
      </div>
    </div>
  )
}
