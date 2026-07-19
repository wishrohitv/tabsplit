import { useSwitchChain } from 'wagmi'
import { monadTestnet } from '../lib/constants'

export default function WrongNetwork() {
  const { switchChain, isPending } = useSwitchChain()

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="bg-card rounded-card shadow-sm border border-amber-100 p-8 max-w-sm w-full text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl mx-auto mb-5">
          ⚠️
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">Wrong Network</h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          TabSplit runs on{' '}
          <span className="font-medium text-gray-700">Monad Testnet</span>.
          Please switch networks to continue.
        </p>

        <button
          onClick={() => switchChain({ chainId: monadTestnet.id })}
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Switching...
            </>
          ) : (
            'Switch to Monad Testnet'
          )}
        </button>
      </div>
    </div>
  )
}
