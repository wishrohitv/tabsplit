# Implementation Plan: TabSplit

## Overview

Build TabSplit end-to-end: a Solidity contract on Monad Testnet that manages onchain bill-splitting, and a React + Vite + TypeScript frontend that reads and writes to it via wagmi/viem/RainbowKit. No backend, no mock data — everything from the chain.

Work through tasks in order. Each task builds on the previous. Checkpoints ensure the stack is wired together incrementally.

---

## Tasks

- [x] 1. Set up Foundry project and write TabSplit.sol
  - [x] 1.1 Initialize Foundry project
    - Run `forge init contract` in the workspace root to scaffold the Foundry project
    - Delete the default `Counter.sol` and `Counter.t.sol` files
    - _Requirements: 4.1, 4.4_

  - [x] 1.2 Write `TabSplit.sol`
    - Create `contract/src/TabSplit.sol`
    - Define the `Tab` struct with all fields: `id`, `payer`, `description`, `totalAmount`, `shareAmount`, `participants`, `hasPaid` mapping, `settled`, `createdAt`
    - Add storage: `_tabCounter` (uint256), `mapping(uint256 => Tab) _tabs`, `mapping(address => uint256[]) _userTabs`, `uint256[] _allTabIds`
    - Implement all three events: `TabCreated`, `SharePaid`, `TabSettled` with NatSpec `@notice` and `@param` comments
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3_

  - [x] 1.3 Implement `createTab` function
    - Validate `participants.length > 0` and `totalAmount > 0`, revert with descriptive messages
    - Increment `_tabCounter`, compute `shareAmount = totalAmount / participants.length`
    - Initialize Tab struct, set `hasPaid` entries to false, set `settled = false`, set `createdAt = block.timestamp`
    - Push `tabId` to `_userTabs[msg.sender]`; for each participant, push `tabId` to `_userTabs[participant]` (skip if participant == msg.sender to avoid duplicate)
    - Push `tabId` to `_allTabIds`
    - Emit `TabCreated`
    - Include full NatSpec `@notice`, `@param` for all parameters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.4 Implement `payShare` function
    - Validate tab exists (tabId <= _tabCounter), caller is a participant (via `_isParticipant` internal helper), caller has not already paid, `msg.value == shareAmount`
    - Forward payment to payer using `.call{value: msg.value}("")`, check success flag and revert on failure
    - Set `hasPaid[msg.sender] = true`
    - Emit `SharePaid`
    - Check if all participants have paid; if settled, set `settled = true` and emit `TabSettled`
    - Include NatSpec
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.5 Implement view functions: `getTab`, `getMyTabs`, `getAllTabs`
    - `getTab(uint256 tabId)`: validate tab exists; return `id, payer, description, totalAmount, shareAmount, participants[], hasPaid[] (parallel bool array), settled, createdAt`
    - `getMyTabs(address user)`: return `_userTabs[user]`
    - `getAllTabs()`: return `_allTabIds`
    - Implement private `_isParticipant(uint256 tabId, address user)` helper that loops participants array
    - Include NatSpec on all view functions
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 1.6 Write Foundry unit tests for TabSplit.sol
    - Create `contract/test/TabSplit.t.sol`
    - Test `createTab` happy path: verify stored fields, emitted event, share calculation
    - Test `createTab` reverts: empty participants, zero totalAmount
    - Test `payShare` happy path: payment forwarded, `hasPaid` set, `SharePaid` emitted
    - Test `payShare` settlement: all participants pay, `settled == true`, `TabSettled` emitted
    - Test `payShare` reverts: non-participant, already-paid, wrong value, failed .call
    - Test `getTab`, `getMyTabs`, `getAllTabs` return correct data
    - _Requirements: 1.1–1.6, 2.1–2.7, 3.1–3.4_

  - [ ]* 1.7 Write property-based tests for TabSplit.sol (Foundry fuzzing)
    - **Property 1: Tab creation round-trip data integrity** — fuzz `description`, `totalAmount`, `participants`; call `createTab`, then `getTab`; assert all fields match inputs
    - **Property 2: Share amount arithmetic invariant** — fuzz `totalAmount` and `participants.length`; assert `shareAmount == totalAmount / participants.length`
    - **Property 3: Payment marks participant as paid** — fuzz valid tab and participant index; call `payShare`; assert `hasPaid[participant] == true` in `getTab` result
    - **Property 4: Full payment settles the tab** — fuzz N-participant tab; simulate all N payments; assert `settled == true`
    - **Property 5: Payment rejection invariants** — fuzz non-participant addresses and wrong values; assert all revert
    - **Property 6: getMyTabs completeness** — fuzz user and tab set; assert `getMyTabs` returns exactly the expected IDs
    - **Property 7: getAllTabs count invariant** — fuzz N createTab calls; assert `getAllTabs().length == N`
    - _Requirements: 1.1–1.6, 2.1–2.7, 3.1–3.3_

- [ ] 2. Deploy contract to Monad Testnet and save ABI
  - [x] 2.1 Write Foundry deploy script
    - Create `contract/script/Deploy.s.sol` with a `DeployTabSplit` script
    - Script deploys `TabSplit` contract and `console.log`s the deployed address
    - _Requirements: 4.1_

  - [ ] 2.2 Deploy to Monad Testnet
    - Run `forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast`
    - Record the deployed contract address
    - _Requirements: 4.1_

  - [x] 2.3 Export ABI to frontend
    - Run `forge inspect TabSplit abi > ../frontend/src/abi/TabSplit.json` (or copy from `out/TabSplit.sol/TabSplit.json`)
    - Ensure the ABI file is valid JSON and placed at `frontend/src/abi/TabSplit.json`
    - _Requirements: 4.2_

  - [ ] 2.4 Update contract address constant
    - Open `frontend/src/lib/constants.ts` (created in Task 4) and set `TABSPLIT_ADDRESS` to the deployed address
    - _Requirements: 4.1_

- [x] 3. Scaffold React + Vite + TypeScript frontend with TailwindCSS
  - [x] 3.1 Initialize Vite project
    - Run `npm create vite@latest frontend -- --template react-ts` from the workspace root
    - Navigate into `frontend/`, run `npm install`
    - _Requirements: 10.1_

  - [x] 3.2 Install all frontend dependencies
    - Install wagmi, viem, @rainbow-me/rainbowkit, @tanstack/react-query:
      `npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query`
    - Install react-hot-toast: `npm install react-hot-toast`
    - Install TailwindCSS: `npm install -D tailwindcss postcss autoprefixer` then `npx tailwindcss init -p`
    - _Requirements: 10.1, 10.2_

  - [x] 3.3 Configure TailwindCSS
    - Set `content` in `tailwind.config.ts` to `["./index.html", "./src/**/*.{ts,tsx}"]`
    - Add design tokens to `theme.extend.colors`: `background: '#FAF8F5'`, `card: '#FFFFFF'`, `accent: '#7C3AED'`, `accent-hover: '#6D28D9'`, `success: '#10B981'`, `error: '#EF4444'`, `muted: '#9CA3AF'`
    - Add `borderRadius.card: '1rem'`
    - Add `@tailwind base; @tailwind components; @tailwind utilities;` directives to `src/index.css`
    - Set `body` background to `bg-background` in `index.css`
    - _Requirements: 9.6, 10.2_

  - [x] 3.4 Create `src/abi/` directory placeholder
    - Create `frontend/src/abi/.gitkeep` so the directory exists before the ABI is copied in Task 2
    - _Requirements: 4.2_

- [x] 4. Configure wagmi + RainbowKit with Monad Testnet custom chain
  - [x] 4.1 Create `src/lib/constants.ts`
    - Define `monadTestnet` using `defineChain` from viem with: `id: 10143`, name, nativeCurrency `{ name: 'MON', symbol: 'MON', decimals: 18 }`, rpcUrls, blockExplorers
    - Export `TABSPLIT_ADDRESS` as a placeholder `0x${string}` (filled after deploy in Task 2.4)
    - _Requirements: 4.1, 5.3_

  - [x] 4.2 Create `src/lib/wagmiConfig.ts`
    - Use `getDefaultConfig` from RainbowKit
    - Set `appName: 'TabSplit'`, `projectId` (use a WalletConnect Cloud project ID or placeholder), `chains: [monadTestnet]`
    - Export `wagmiConfig`
    - _Requirements: 5.1, 5.3_

  - [x] 4.3 Define TypeScript `Tab` type
    - Create `src/types/tab.ts`
    - Export interface `Tab` with fields: `id: bigint`, `payer: \`0x${string}\``, `description: string`, `totalAmount: bigint`, `shareAmount: bigint`, `participants: \`0x${string}\`[]`, `hasPaid: boolean[]`, `settled: boolean`, `createdAt: bigint`
    - _Requirements: 3.1_

  - [x] 4.4 Wire providers in `src/main.tsx`
    - Wrap `<App />` with `<WagmiProvider config={wagmiConfig}>`, `<QueryClientProvider client={new QueryClient()}>`, `<RainbowKitProvider>`
    - Import RainbowKit CSS: `import '@rainbow-me/rainbowkit/styles.css'`
    - _Requirements: 5.1_

  - [x] 4.5 Create `src/App.tsx` with view routing and wrong-network guard
    - Import `useAccount`, `useChainId` from wagmi
    - Maintain `view` state: `'create' | 'my-tabs'`, defaulting to `'my-tabs'`
    - If connected and `chainId !== 10143`, render `<WrongNetwork />`
    - Otherwise render nav tabs + active view component
    - Mount `<Toaster />` from react-hot-toast at root
    - _Requirements: 5.3, 5.4, 9.4_

- [x] 5. Implement Create Tab form and contract interaction
  - [x] 5.1 Create `src/hooks/useTabSplit.ts`
    - Implement `useCreateTab()`: wraps `useWriteContract`, exposes async `createTab(description, participants, totalAmount)` function and `isPending`
    - Implement `usePayShare()`: wraps `useWriteContract`, exposes async `payShare(tabId, shareAmount)` with `value: shareAmount` and `isPending`
    - Implement `useMyTabIds(address)`: wraps `useReadContract` for `getMyTabs`, enabled only when address is defined
    - Implement `useTab(tabId)`: wraps `useReadContract` for `getTab`
    - _Requirements: 6.3, 8.1_

  - [x] 5.2 Create `src/hooks/useMonBalance.ts`
    - Wrap `useBalance` from wagmi for the connected address on Monad Testnet
    - Return formatted balance string with "MON" suffix
    - _Requirements: 5.2_

  - [x] 5.3 Create `src/components/Header.tsx`
    - Left side: "TabSplit" bold wordmark in accent color
    - Right side: `<ConnectButton />` from RainbowKit; when connected, show MON balance from `useMonBalance` next to the button
    - Apply sticky top layout with background color
    - _Requirements: 5.1, 5.2_

  - [x] 5.4 Create `src/components/CreateTabForm.tsx`
    - Local state: `description` (string), `totalAmountMON` (string), `participantInput` (string), `txHash` (string | null)
    - Parse `participantInput` on change: split by comma, trim, filter non-empty strings
    - Derived: `parsedParticipants` (Address[]), `shareAmountDisplay` = `formatEther(parseEther(totalAmountMON || '0') / BigInt(Math.max(parsedParticipants.length, 1)))` formatted with up to 6 decimals
    - Render: description `<input>`, total amount `<input>`, participant addresses `<textarea>` with helper text "Comma-separated wallet addresses"
    - Show live share calculation: "Each person pays: X MON" (hidden when no participants or amount)
    - Submit button "Create Tab" — disabled when `isPending`, `isConfirming`, or any field is empty/invalid
    - On submit: call `createTab`, `toast.loading("Submitting tab...")`, await receipt, `toast.success("Tab created!")`, clear form, trigger refetch of tab list
    - On error: `toast.error(err.shortMessage ?? "Transaction failed")`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6. Implement My Tabs view with contract reads
  - [x] 6.1 Create `src/components/SkeletonCard.tsx`
    - Animated pulse placeholder with same card dimensions as `TabCard`
    - Two skeleton lines for title/description, three shorter skeleton rows for participants
    - Use TailwindCSS `animate-pulse` and `bg-gray-200` rounded fills
    - _Requirements: 7.5_

  - [x] 6.2 Create `src/components/ParticipantRow.tsx`
    - Props: `address: Address`, `hasPaid: boolean`
    - Display truncated address (first 6 + last 4 chars)
    - Green checkmark icon when `hasPaid`, red X when not
    - _Requirements: 7.2_

  - [x] 6.3 Create `src/components/TabCard.tsx`
    - Props: `tabId: bigint`, `connectedAddress: Address | undefined`
    - Internally calls `useTab(tabId)` — renders `<SkeletonCard />` while loading
    - Display: description (bold), settled badge (green pill) when `tab.settled`, total `formatEther(tab.totalAmount)` MON, share `formatEther(tab.shareAmount)` MON/person
    - Render `<ParticipantRow>` for each participant
    - If `connectedAddress` matches a participant and `!hasPaid[index]`: render "Pay my share (X MON)" button
    - If `connectedAddress` is payer: no pay button, just read-only status
    - Apply card style: `bg-card rounded-card shadow-sm p-5 border border-gray-100`
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 6.4 Create `src/components/MyTabsList.tsx`
    - Call `useMyTabIds(connectedAddress)` to get array of Tab IDs
    - While loading: render 3× `<SkeletonCard />`
    - When data returns empty array: render empty state — centered illustration/icon + "No tabs yet. Create one to get started."
    - Otherwise: render `<TabCard>` for each Tab ID in a responsive grid (`grid grid-cols-1 md:grid-cols-2 gap-4`)
    - _Requirements: 7.1, 7.5, 7.6_

- [x] 7. Implement Pay Share functionality
  - [x] 7.1 Wire `payShare` into `TabCard.tsx`
    - Import `usePayShare` from `useTabSplit`
    - On "Pay my share" button click: call `payShare(tab.id, tab.shareAmount)`
    - While `isPending` or `isConfirming`: show spinner on button, disable button to prevent double-submission
    - On receipt: `toast.success("Payment confirmed!")`, call `refetch()` from `useTab` to update the card
    - On error: `toast.error(err.shortMessage ?? "Payment failed")`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Add `useWaitForTransactionReceipt` handling in hooks
    - In `useTabSplit.ts`, for both `useCreateTab` and `usePayShare`, export the `txHash` state so callers can pass it to `useWaitForTransactionReceipt`
    - Expose `isConfirming` (receipt is in-flight) from each hook
    - _Requirements: 8.2, 6.3_

- [x] 8. Polish UI (loading states, toasts, empty states, responsive design)
  - [x] 8.1 Create `src/components/WrongNetwork.tsx`
    - Detect wrong network via `useChainId()` — render when `chainId !== 10143`
    - Show a centered card with warning icon, "Please switch to Monad Testnet" message
    - Include a "Switch Network" button using `useSwitchChain` from wagmi, targeting `monadTestnet`
    - _Requirements: 5.3_

  - [x] 8.2 Ensure all transaction states show toasts
    - Audit `CreateTabForm` and `TabCard` pay button flows
    - Confirm `toast.loading` fires on tx submission, `toast.success` on receipt, `toast.error` on rejection or revert
    - `<Toaster position="bottom-right" />` should be mounted once in `App.tsx`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 8.3 Apply responsive layout
    - `App.tsx` root wrapper: `min-h-screen bg-background`
    - Main content: `max-w-4xl mx-auto px-4 py-8`
    - Nav tabs for Create / My Tabs: centered, styled with accent underline for active view
    - `MyTabsList` grid: single column on mobile, two columns on md+
    - `CreateTabForm`: max-width `max-w-lg mx-auto`
    - _Requirements: 9.5_

  - [x] 8.4 Disconnect / unauthenticated state
    - When no wallet connected, render a centered landing hero in the main content area: app name, one-line description, and the RainbowKit `<ConnectButton />`
    - Hide tab navigation when disconnected
    - _Requirements: 5.4_

  - [ ]* 8.5 Write property test for frontend share calculation
    - **Property 8: Frontend share calculation correctness**
    - Create `frontend/src/lib/__tests__/shareCalc.test.ts`
    - Use vitest + fast-check to generate arbitrary positive MON amounts (as strings) and participant counts (1–20)
    - For each, verify `parseEther(amount) / BigInt(count)` matches the helper function output
    - **Validates: Requirements 6.2**

- [ ] 9. Checkpoint — verify full stack integration
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm `npm run dev` starts in `frontend/` with no TypeScript errors
  - Confirm the contract address in `constants.ts` matches the deployed address from Task 2.2
  - Confirm `src/abi/TabSplit.json` is present and has correct function signatures

- [ ] 10. Write README.md
  - [ ] 10.1 Create `README.md` in the workspace root
    - **Project description**: one paragraph explaining TabSplit — what it does, why it's onchain
    - **Tech stack section**: list Solidity/Foundry, React/Vite/TypeScript, TailwindCSS, wagmi/viem, RainbowKit, Monad Testnet
    - **Deployed contract**: section showing `Contract Address: 0x...` on Monad Testnet with a link to `https://testnet.monadexplorer.com/address/0x...`
    - **Setup instructions** (numbered steps):
      1. Clone repo
      2. `cd frontend && npm install`
      3. `npm run dev` → opens at `http://localhost:5173`
    - **Contract development** section: `cd contract && forge build`, `forge test`, deploy command
    - _Requirements: 10.4_

- [ ] 11. Final integration verification
  - [ ] 11.1 Run contract tests
    - In `contract/` run `forge test -vv` and confirm all tests pass
    - _Requirements: 1.1–3.4_

  - [ ] 11.2 TypeScript type-check frontend
    - In `frontend/` run `npx tsc --noEmit` and resolve any type errors
    - _Requirements: 10.3_

  - [ ]* 11.3 Run frontend property tests
    - In `frontend/` run `npx vitest run` to execute the share calculation property test
    - _Requirements: 6.2_

  - [ ] 11.4 Verify no hardcoded/mock data in frontend
    - Search codebase for any hardcoded Tab arrays, mock addresses, or static payment statuses
    - Confirm all data flows from `useReadContract` calls to the deployed contract
    - _Requirements: 9.7_

---

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3"] },
    { "wave": 3, "tasks": ["4"] },
    { "wave": 4, "tasks": ["5"] },
    { "wave": 5, "tasks": ["6"] },
    { "wave": 6, "tasks": ["7"] },
    { "wave": 7, "tasks": ["8"] },
    { "wave": 8, "tasks": ["9"] },
    { "wave": 9, "tasks": ["10"] },
    { "wave": 10, "tasks": ["11"] }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All contract reads use wagmi's `useReadContract` — no polling needed (wagmi handles staleness)
- `shareAmount` must always come from the contract, never computed client-side for the actual tx value — prevents rounding mismatch
- Keep `TABSPLIT_ADDRESS` and `WalletConnect projectId` in `constants.ts` / `wagmiConfig.ts`, not scattered across components
- Foundry fuzz tests use `vm.assume()` to constrain inputs to valid ranges
- Property tests validate universal correctness; unit tests validate specific edge cases — both are needed
