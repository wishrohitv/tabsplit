export interface Tab {
  id: bigint
  payer: `0x${string}`
  description: string
  totalAmount: bigint
  shareAmount: bigint
  participants: `0x${string}`[]
  hasPaid: boolean[]
  settled: boolean
  createdAt: bigint
}
