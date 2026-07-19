import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'

export function useMonBalance() {
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  
  if (!balance) return null
  
  const formatted = parseFloat(formatEther(balance.value)).toFixed(4)
  return `${formatted} MON`
}
