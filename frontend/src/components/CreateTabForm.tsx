import { useState } from 'react'
import { parseEther, formatEther, isAddress } from 'viem'
import { useWaitForTransactionReceipt } from 'wagmi'
import toast from 'react-hot-toast'
import { useCreateTab } from '../hooks/useTabSplit'

interface CreateTabFormProps {
  onTabCreated?: () => void
}

export default function CreateTabForm({ onTabCreated }: CreateTabFormProps) {
  const [description, setDescription] = useState('')
  const [totalAmountMON, setTotalAmountMON] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { createTab, isPending } = useCreateTab()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  // Parse comma-separated addresses
  const parsedParticipants = participantInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && isAddress(s)) as `0x${string}`[]

  const invalidAddresses = participantInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !isAddress(s))

  // Live share calculation
  let shareAmountDisplay = ''
  try {
    if (totalAmountMON && parsedParticipants.length > 0) {
      const total = parseEther(totalAmountMON)
      const share = total / BigInt(parsedParticipants.length)
      shareAmountDisplay = parseFloat(formatEther(share)).toFixed(6).replace(/\.?0+$/, '')
    }
  } catch {
    // invalid input
  }

  const isValid =
    description.trim().length > 0 &&
    totalAmountMON.trim().length > 0 &&
    parsedParticipants.length > 0 &&
    invalidAddresses.length === 0 &&
    !isPending &&
    !isConfirming

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    let toastId: string | undefined
    try {
      const totalWei = parseEther(totalAmountMON)
      toastId = toast.loading('Submitting tab to blockchain...')
      const hash = await createTab(description.trim(), parsedParticipants, totalWei)
      setTxHash(hash as `0x${string}`)
      toast.dismiss(toastId)
      toast.success('Tab created successfully!')
      // Reset form
      setDescription('')
      setTotalAmountMON('')
      setParticipantInput('')
      setTxHash(undefined)
      onTabCreated?.()
    } catch (err: unknown) {
      if (toastId) toast.dismiss(toastId)
      const msg = (err as { shortMessage?: string })?.shortMessage ?? 'Transaction failed'
      toast.error(msg)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card rounded-card shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Create a new tab</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Dinner at Joe's"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Total amount (MON)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={totalAmountMON}
              onChange={e => setTotalAmountMON(e.target.value)}
              placeholder="0.1"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Participant addresses
            </label>
            <textarea
              value={participantInput}
              onChange={e => setParticipantInput(e.target.value)}
              placeholder="0xabc..., 0xdef..., 0x123..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none font-mono"
            />
            <p className="mt-1 text-xs text-muted">Comma-separated wallet addresses</p>
            {invalidAddresses.length > 0 && (
              <p className="mt-1 text-xs text-error">
                Invalid: {invalidAddresses.join(', ')}
              </p>
            )}
          </div>

          {/* Live share calculation */}
          {shareAmountDisplay && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Each person pays</span>
                <span className="text-sm font-semibold text-accent">{shareAmountDisplay} MON</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted">Participants</span>
                <span className="text-xs text-muted">{parsedParticipants.length} addresses</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 px-4 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isPending ? 'Confirm in wallet...' : 'Confirming...'}
              </>
            ) : (
              'Create Tab'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
