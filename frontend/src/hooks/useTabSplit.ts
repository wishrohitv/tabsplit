import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState } from 'react'
import TabSplitABI from '../abi/TabSplit.json'
import { TABSPLIT_ADDRESS } from '../lib/constants'

export function useCreateTab() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const createTab = async (
    description: string,
    participants: `0x${string}`[],
    totalAmount: bigint
  ) => {
    const hash = await writeContractAsync({
      address: TABSPLIT_ADDRESS,
      abi: TabSplitABI,
      functionName: 'createTab',
      args: [description, participants, totalAmount],
    })
    setTxHash(hash)
    return hash
  }

  return { createTab, isPending, isConfirming, txHash }
}

export function usePayShare() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const payShare = async (tabId: bigint, shareAmount: bigint) => {
    const hash = await writeContractAsync({
      address: TABSPLIT_ADDRESS,
      abi: TabSplitABI,
      functionName: 'payShare',
      args: [tabId],
      value: shareAmount,
    })
    setTxHash(hash)
    return hash
  }

  return { payShare, isPending, isConfirming, txHash }
}

export function useMyTabIds(userAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: TABSPLIT_ADDRESS,
    abi: TabSplitABI,
    functionName: 'getMyTabs',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  })
}

export function useTab(tabId: bigint | undefined) {
  return useReadContract({
    address: TABSPLIT_ADDRESS,
    abi: TabSplitABI,
    functionName: 'getTab',
    args: tabId !== undefined ? [tabId] : undefined,
    query: { enabled: tabId !== undefined },
  })
}
