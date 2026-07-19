import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'viem'
import { monadTestnet } from './constants'

export const wagmiConfig = getDefaultConfig({
  appName: 'TabSplit',
  projectId: '3fbb6bba6f1de962d911bb5b5c3dba68',
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: false,
})
