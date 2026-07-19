import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import Header from './components/Header'
import WrongNetwork from './components/WrongNetwork'
import CreateTabForm from './components/CreateTabForm'
import MyTabsList from './components/MyTabsList'
import { ConnectButton } from '@rainbow-me/rainbowkit'

type View = 'create' | 'my-tabs'

const MONAD_TESTNET_ID = 10143

export default function App() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [view, setView] = useState<View>('my-tabs')

  // --- Not connected: landing hero ---
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-white text-3xl font-bold mb-6 shadow-lg">
            ⚡
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Tab<span className="text-accent">Split</span>
          </h1>
          <p className="text-lg text-muted mb-8 leading-relaxed">
            Split bills onchain, no awkward chasing.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          <p className="mt-6 text-xs text-muted">
            Powered by Monad Testnet · No backend · Your keys, your tabs
          </p>
        </div>
      </div>
    )
  }

  // --- Connected but wrong network ---
  if (chainId !== MONAD_TESTNET_ID) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <WrongNetwork />
      </div>
    )
  }

  // --- Connected and on correct chain ---
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Nav tabs */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex justify-center gap-0">
          <button
            type="button"
            onClick={() => setView('my-tabs')}
            className={[
              'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'my-tabs'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-gray-700',
            ].join(' ')}
          >
            My Tabs
          </button>
          <button
            type="button"
            onClick={() => setView('create')}
            className={[
              'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'create'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-gray-700',
            ].join(' ')}
          >
            + Create Tab
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {view === 'create' ? <CreateTabForm onTabCreated={() => setView('my-tabs')} /> : <MyTabsList />}
      </main>
    </div>
  )
}
