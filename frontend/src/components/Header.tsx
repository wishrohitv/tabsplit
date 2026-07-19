import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useMonBalance } from '../hooks/useMonBalance'

export default function Header() {
  const balance = useMonBalance()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">⚡</div>
          <span className="text-xl font-bold text-accent">TabSplit</span>
        </div>

        {/* Right side: balance + wallet button */}
        <div className="flex items-center gap-3">
          {balance && (
            <span className="hidden sm:block text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
              {balance}
            </span>
          )}
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
