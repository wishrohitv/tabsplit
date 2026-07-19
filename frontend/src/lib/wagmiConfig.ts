import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { monadTestnet } from './constants'

const { chains, publicClient } = configureChains([monadTestnet], [publicProvider()])

const { connectors } = getDefaultWallets({
  appName: 'TabSplit',
  chains,
})

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

export { chains }
