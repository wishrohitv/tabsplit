import { formatEther } from 'viem'
import { useWaitForTransactionReceipt } from 'wagmi'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTab, usePayShare } from '../hooks/useTabSplit'
import ParticipantRow from './ParticipantRow'
import SkeletonCard from './SkeletonCard'

interface TabCardProps {
  tabId: bigint
  connectedAddress: `0x${string}` | undefined
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatMON(wei: bigint) {
  return parseFloat(formatEther(wei)).toFixed(4).replace(/\.?0+$/, '') || '0'
}

export default function TabCard({ tabId, connectedAddress }: TabCardProps) {
  const { data, isLoading, refetch } = useTab(tabId)
  const { payShare, isPending } = usePayShare()
  const [payTxHash, setPayTxHash] = useState<`0x${string}` | undefined>()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: payTxHash })

  if (isLoading || !data) {
    return <SkeletonCard />
  }

  // data is a tuple from getTab: [id, payer, description, totalAmount, shareAmount, participants, hasPaid, settled, createdAt]
  const [id, payer, description, totalAmount, shareAmount, participants, hasPaid, settled] = data as [
    bigint, `0x${string}`, string, bigint, bigint, `0x${string}`[], boolean[], boolean, bigint
  ]

  // Find if connected wallet is a participant (and which index)
  const participantIndex = connectedAddress
    ? participants.findIndex(p => p.toLowerCase() === connectedAddress.toLowerCase())
    : -1
  const isParticipant = participantIndex !== -1
  const mySharePaid = isParticipant ? hasPaid[participantIndex] : false
  const isPayer = connectedAddress?.toLowerCase() === payer.toLowerCase()
  const canPay = isParticipant && !mySharePaid && !isPayer

  const handlePayShare = async () => {
    let toastId: string | undefined
    try {
      toastId = toast.loading('Paying your share...')
      const hash = await payShare(id, shareAmount)
      setPayTxHash(hash as `0x${string}`)
      toast.dismiss(toastId)
      toast.success('Payment confirmed!')
      await refetch()
      setPayTxHash(undefined)
    } catch (err: unknown) {
      if (toastId) toast.dismiss(toastId)
      const msg = (err as { shortMessage?: string })?.shortMessage ?? 'Payment failed'
      toast.error(msg)
    }
  }

  const paidCount = hasPaid.filter(Boolean).length
  const totalCount = participants.length

  return (
    <div className="bg-card rounded-card shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-800 leading-tight">{description}</h3>
        {settled ? (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
            ✓ Settled
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
            {paidCount}/{totalCount} paid
          </span>
        )}
      </div>

      {/* Amount info */}
      <div className="flex gap-4 text-sm">
        <div>
          <div className="text-xs text-muted mb-0.5">Total</div>
          <div className="font-semibold text-gray-800">{formatMON(totalAmount)} MON</div>
        </div>
        <div className="w-px bg-gray-100" />
        <div>
          <div className="text-xs text-muted mb-0.5">Per person</div>
          <div className="font-semibold text-accent">{formatMON(shareAmount)} MON</div>
        </div>
        <div className="w-px bg-gray-100" />
        <div>
          <div className="text-xs text-muted mb-0.5">Payer</div>
          <div className="font-medium text-gray-600 text-xs font-mono">{truncateAddress(payer)}</div>
        </div>
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <div className="border-t border-gray-50 pt-3">
          <div className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Participants</div>
          <div className="divide-y divide-gray-50">
            {participants.map((addr, i) => (
              <ParticipantRow key={addr} address={addr} hasPaid={hasPaid[i]} />
            ))}
          </div>
        </div>
      )}

      {/* Pay button — only shown when participant hasn't paid */}
      {canPay && (
        <button
          onClick={handlePayShare}
          disabled={isPending || isConfirming}
          className="mt-1 w-full py-2.5 px-4 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isPending ? 'Confirm in wallet...' : 'Confirming...'}
            </>
          ) : (
            `Pay my share (${formatMON(shareAmount)} MON)`
          )}
        </button>
      )}

      {/* Payer badge */}
      {isPayer && (
        <div className="mt-1 text-center text-xs text-muted">
          You created this tab
        </div>
      )}
    </div>
  )
}
