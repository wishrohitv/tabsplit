# Design Document: TabSplit

## Overview

TabSplit is a two-layer system: a single Solidity smart contract deployed on Monad Testnet that owns all state, and a React + Vite + TypeScript SPA that reads and writes to that contract via wagmi/viem. There is no backend, no database, and no off-chain state. Everything the UI displays is derived from onchain reads.

The architecture is intentionally minimal for a hackathon: one contract, one page (SPA with view switching), one source of truth.

---

## Detected Language

TypeScript (frontend) + Solidity (smart contract)

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  User Browser                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         React + Vite + TypeScript SPA        │   │
│  │                                              │   │
│  │  ┌─────────────┐  ┌───────────────────────┐  │   │
│  │  │  RainbowKit │  │   View Router (state) │  │   │
│  │  │  Wallet UI  │  │  CreateTab | MyTabs   │  │   │
│  │  └──────┬──────┘  └──────────┬────────────┘  │   │
│  │         │                    │               │   │
│  │  ┌──────▼────────────────────▼────────────┐  │   │
│  │  │         wagmi + viem hooks             │  │   │
│  │  │  useReadContract / useWriteContract    │  │   │
│  │  │  useWaitForTransactionReceipt          │  │   │
│  │  └──────────────────┬─────────────────────┘  │   │
│  └─────────────────────┼──────────────────────┘   │
│                        │ JSON-RPC / WS             │
└────────────────────────┼────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Monad Testnet     │
              │   Chain ID: 10143   │
              │                     │
              │  ┌───────────────┐  │
              │  │ TabSplit.sol  │  │
              │  │               │  │
              │  │ createTab()   │  │
              │  │ payShare()    │  │
              │  │ getTab()      │  │
              │  │ getMyTabs()   │  │
              │  │ getAllTabs()  │  │
              │  └───────────────┘  │
              └─────────────────────┘
```

---

## Smart Contract Design

### File: `contract/src/TabSplit.sol`

#### Data Structures

```solidity
struct Tab {
    uint256 id;
    address payer;
    string description;
    uint256 totalAmount;
    uint256 shareAmount;        // totalAmount / participants.length
    address[] participants;
    mapping(address => bool) hasPaid;
    bool settled;
    uint256 createdAt;
}
```

#### Storage

```solidity
uint256 private _tabCounter;                        // starts at 0, first ID = 1
mapping(uint256 => Tab) private _tabs;
mapping(address => uint256[]) private _userTabs;    // payer + participants
uint256[] private _allTabIds;
```

#### Events

```solidity
event TabCreated(uint256 indexed tabId, address indexed payer, string description, uint256 totalAmount, uint256 shareAmount);
event SharePaid(uint256 indexed tabId, address indexed payer_of_share, uint256 amount);
event TabSettled(uint256 indexed tabId);
```

#### Function Specifications

**`createTab(string memory description, address[] memory participants, uint256 totalAmount)`**
- Validates: `participants.length > 0`, `totalAmount > 0`
- Increments `_tabCounter`, assigns new `tabId`
- Calculates `shareAmount = totalAmount / participants.length`
- Writes all fields to `_tabs[tabId]`
- Pushes `tabId` to `_userTabs[msg.sender]`
- For each participant, pushes `tabId` to `_userTabs[participant]` (avoids duplicates if payer is also a participant)
- Pushes `tabId` to `_allTabIds`
- Emits `TabCreated`

**`payShare(uint256 tabId) external payable`**
- Validates: tab exists, `msg.sender` is a participant, `!hasPaid[msg.sender]`, `msg.value == shareAmount`
- Forwards `msg.value` to `_tabs[tabId].payer` via `.call{value: msg.value}("")`
- Validates call success, reverts on failure
- Sets `_tabs[tabId].hasPaid[msg.sender] = true`
- Emits `SharePaid`
- Checks if all participants have paid; if so, sets `settled = true`, emits `TabSettled`

**`getTab(uint256 tabId) external view`**
- Validates tab exists
- Returns: `id, payer, description, totalAmount, shareAmount, participants[], hasPaid[] (bool array parallel to participants), settled, createdAt`
- Note: because `mapping` can't be returned directly, return a parallel bool array for payment status

**`getMyTabs(address user) external view returns (uint256[] memory)`**
- Returns `_userTabs[user]`

**`getAllTabs() external view returns (uint256[] memory)`**
- Returns `_allTabIds`

#### Internal Helper

```solidity
function _isParticipant(uint256 tabId, address user) internal view returns (bool)
```

#### Deployment

- Toolchain: Foundry (`forge`)
- Network: Monad Testnet via `--rpc-url https://testnet-rpc.monad.xyz`
- ABI exported to `frontend/src/abi/TabSplit.json`

---

## Frontend Design

### Project Structure

```
frontend/
├── src/
│   ├── abi/
│   │   └── TabSplit.json          # Contract ABI
│   ├── components/
│   │   ├── Header.tsx             # Logo + wallet connect button + MON balance
│   │   ├── CreateTabForm.tsx      # Tab creation form
│   │   ├── MyTabsList.tsx         # List of user's tabs
│   │   ├── TabCard.tsx            # Individual tab display card
│   │   ├── ParticipantRow.tsx     # Single participant with paid/unpaid icon
│   │   ├── SkeletonCard.tsx       # Loading skeleton
│   │   └── WrongNetwork.tsx      # Wrong network state
│   ├── hooks/
│   │   ├── useTabSplit.ts         # Contract read/write hooks (createTab, payShare, getMyTabs, getTab)
│   │   └── useMonBalance.ts       # MON balance hook
│   ├── lib/
│   │   ├── wagmiConfig.ts         # wagmi config with Monad Testnet custom chain
│   │   └── constants.ts           # Contract address, chain config
│   ├── types/
│   │   └── tab.ts                 # TypeScript Tab type
│   ├── App.tsx                    # Root: providers + view routing
│   └── main.tsx                   # Entry point
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Custom Chain Definition

```typescript
// src/lib/constants.ts
import { defineChain } from 'viem'

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
})

export const TABSPLIT_ADDRESS = '0x...' as `0x${string}` // filled after deploy
```

### wagmi Configuration

```typescript
// src/lib/wagmiConfig.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { monadTestnet } from './constants'

export const wagmiConfig = getDefaultConfig({
  appName: 'TabSplit',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [monadTestnet],
})
```

### TypeScript Tab Type

```typescript
// src/types/tab.ts
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
```

### Key Hooks

#### `useTabSplit.ts`

```typescript
// Wraps wagmi hooks for contract interaction

export function useCreateTab() {
  const { writeContractAsync, isPending } = useWriteContract()
  const createTab = async (description: string, participants: `0x${string}`[], totalAmount: bigint) => {
    return writeContractAsync({
      address: TABSPLIT_ADDRESS,
      abi: TabSplitABI,
      functionName: 'createTab',
      args: [description, participants, totalAmount],
    })
  }
  return { createTab, isPending }
}

export function useMyTabs(userAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: TABSPLIT_ADDRESS,
    abi: TabSplitABI,
    functionName: 'getMyTabs',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  })
}

export function useTab(tabId: bigint) {
  return useReadContract({
    address: TABSPLIT_ADDRESS,
    abi: TabSplitABI,
    functionName: 'getTab',
    args: [tabId],
  })
}

export function usePayShare() {
  const { writeContractAsync, isPending } = useWriteContract()
  const payShare = async (tabId: bigint, shareAmount: bigint) => {
    return writeContractAsync({
      address: TABSPLIT_ADDRESS,
      abi: TabSplitABI,
      functionName: 'payShare',
      args: [tabId],
      value: shareAmount,
    })
  }
  return { payShare, isPending }
}
```

### Component Specifications

#### `Header.tsx`
- Left: "TabSplit" wordmark
- Right: `<ConnectButton />` from RainbowKit; when connected, also shows MON balance from `useBalance`

#### `CreateTabForm.tsx`
- Controlled form state: `description`, `totalAmountMON` (string), `participantInput` (string)
- Parses `participantInput` by splitting on commas, trimming whitespace, filtering valid addresses
- Derives `shareAmount = parseEther(totalAmountMON) / BigInt(participants.length)` displayed live
- On submit: calls `createTab`, shows pending, on receipt shows success toast and clears form
- Disable submit while `isPending` or while `waitForReceipt` is in-flight

#### `MyTabsList.tsx`
- Reads tab IDs from `useMyTabs(address)`
- For each ID, fetches full tab data via `useTab(id)` (or batched via `useReadContracts`)
- Renders `<TabCard>` per tab; shows `<SkeletonCard>` while loading

#### `TabCard.tsx`
- Props: `tab: Tab`, `connectedAddress: Address`
- Shows: description, `formatEther(totalAmount)` MON, `formatEther(shareAmount)` MON/person, settled badge
- Renders `<ParticipantRow>` per participant
- If `connectedAddress` is a participant and `!hasPaid[participantIndex]`: shows pay button
- If `connectedAddress` is the payer: shows read-only status

#### `ParticipantRow.tsx`
- Shows truncated address, green checkmark (paid) or red X (unpaid)

#### `SkeletonCard.tsx`
- Animated pulse placeholder matching TabCard dimensions

#### `WrongNetwork.tsx`
- Rendered when `chain?.id !== 10143`
- Prompt to switch to Monad Testnet with a switch button via wagmi's `useSwitchChain`

### View Routing (App.tsx)

Simple tab-switch (no React Router needed):

```typescript
type View = 'create' | 'my-tabs'
const [view, setView] = useState<View>('my-tabs')
```

Two nav buttons at top, conditionally renders `<CreateTabForm>` or `<MyTabsList>`.

### Design Tokens (TailwindCSS)

```javascript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      background: '#FAF8F5',     // warm off-white
      card: '#FFFFFF',
      accent: '#7C3AED',          // violet — primary action
      'accent-hover': '#6D28D9',
      success: '#10B981',
      error: '#EF4444',
      muted: '#9CA3AF',
    },
    borderRadius: {
      card: '1rem',
    },
  }
}
```

### Transaction Flow (Happy Path)

```
User fills form → clicks "Create Tab"
  → useCreateTab() calls writeContractAsync
  → toast.loading("Submitting...")
  → tx hash returned
  → useWaitForTransactionReceipt(hash)
  → on success: toast.success("Tab created!"), refetch getMyTabs
  → on error: toast.error(err.shortMessage)
```

---

## Error Handling

| Scenario | Contract Behavior | Frontend Behavior |
|---|---|---|
| Empty participants | `revert` | Form validation before tx |
| Zero amount | `revert` | Form validation before tx |
| Wrong msg.value | `revert` | shareAmount set from contract, not user input |
| Already paid | `revert` | Button hidden for paid participants |
| Not a participant | `revert` | Button not shown |
| Wrong network | N/A | `<WrongNetwork>` component |
| tx rejected by user | N/A | toast.error("Transaction rejected") |
| RPC failure | N/A | toast.error with error message |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tab creation round-trip data integrity

For any valid description, totalAmount > 0, and non-empty participants array, calling `createTab` and then `getTab` with the returned ID should return a Tab whose `payer`, `description`, `totalAmount`, `participants`, `settled`, and `createdAt` fields exactly match the inputs provided to `createTab`.

**Validates: Requirements 1.1, 1.3, 3.1**

---

### Property 2: Share amount arithmetic invariant

For any totalAmount > 0 and participants array of length N > 0, the `shareAmount` stored in the created Tab SHALL equal `totalAmount / N` (integer division).

**Validates: Requirements 1.2**

---

### Property 3: Payment marks participant as paid

For any Tab and any Participant in that Tab who has not yet paid, calling `payShare` with exactly `shareAmount` as msg.value SHALL result in `hasPaid[participant] == true` when the Tab is subsequently retrieved via `getTab`.

**Validates: Requirements 2.1, 3.1**

---

### Property 4: Full payment settles the tab

For any Tab with N participants, after exactly N successful `payShare` calls (one per participant), `getTab` SHALL return `settled == true`.

**Validates: Requirements 2.3**

---

### Property 5: Payment rejection invariants

For any Tab, calling `payShare` from a non-participant address SHALL revert; calling `payShare` a second time from an already-paid participant SHALL revert; calling `payShare` with any `msg.value != shareAmount` SHALL revert.

**Validates: Requirements 2.4, 2.5, 2.6**

---

### Property 6: getMyTabs completeness and soundness

For any address A and any set of created Tabs, `getMyTabs(A)` SHALL return exactly the set of Tab IDs in which A is either the payer or a participant — no Tab ID that does not involve A, and no omission of a Tab ID that does involve A.

**Validates: Requirements 3.2**

---

### Property 7: getAllTabs count equals createTab call count

For any sequence of N `createTab` calls, `getAllTabs()` SHALL return an array of exactly N distinct Tab IDs.

**Validates: Requirements 3.3**

---

### Property 8: Frontend share calculation correctness

For any total amount (as a string in MON) and any positive integer N representing participant count, the frontend's live share calculation SHALL produce a value equal to `parseEther(totalAmountMON) / BigInt(N)`.

**Validates: Requirements 6.2**
