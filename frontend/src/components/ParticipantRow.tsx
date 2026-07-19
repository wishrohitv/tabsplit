interface ParticipantRowProps {
  address: `0x${string}`
  hasPaid: boolean
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ParticipantRow({ address, hasPaid }: ParticipantRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-mono text-gray-600">
        {truncateAddress(address)}
      </span>
      {hasPaid ? (
        <span className="flex items-center gap-1 text-xs font-medium text-success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Paid
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-muted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pending
        </span>
      )}
    </div>
  )
}
