import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'viem'
import { monadTestnet } from './constants'

export const wagmiConfig = getDefaultConfig({
  appName: 'TabSplit',
  appDescription: 'Split bills onchain with Monad Testnet.',
  appUrl: 'https://wishrohitv.github.io/tabsplit/',
  appIcon: 'https://wishrohitv.github.io/tabsplit/favicon.ico',
  projectId: '3fbb6bba6f1de962d911bb5b5c3dba68',
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  walletConnectParameters: {
    isNewChainsStale: false,
  },
  ssr: false,
})
