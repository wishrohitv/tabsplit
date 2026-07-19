# TabSplit

Split bills onchain with friends — no awkward chasing required.

## What it does

TabSplit is a decentralized app on Monad Testnet that lets one person (the payer) create an onchain "tab" for a shared bill, split it evenly among participants, and collect each person's exact share directly to their wallet. Every action is onchain — no backend, no database, no trust required. The payer can see in real time who has paid and who hasn't.

## Problem / Solution

When a group goes out and one person covers the bill, tracking repayments is awkward. Reminders get ignored, Venmo requests get forgotten, and it's socially uncomfortable to chase people. TabSplit puts the obligation onchain: participants pay their exact share directly to the payer's wallet with a single click. The payer never needs to ask — the ledger speaks for itself.

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24, Foundry |
| Network | Monad Testnet (Chain ID: 10143) |
| Frontend | React 19, Vite, TypeScript |
| Styling | TailwindCSS v3 |
| Wallet | wagmi v3, viem v2, RainbowKit v2 |
| State | @tanstack/react-query |
| Notifications | react-hot-toast |

## Deployed Contract

**Contract Address:** `0x5ce44D94f38F5C08D46eb69f6edd9bb5D7EBdbEb`

Explorer: [https://testnet.monadexplorer.com/address/0x5ce44D94f38F5C08D46eb69f6edd9bb5D7EBdbEb](https://testnet.monadexplorer.com/address/0x5ce44D94f38F5C08D46eb69f6edd9bb5D7EBdbEb)

## Setup Instructions

### Frontend (run locally)

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start dev server
npm run dev
# Opens at http://localhost:5173
```

### Smart Contract Development

```bash
cd contract

# Build
forge build

# Test
forge test -vv

# Deploy to Monad Testnet
# First, fund your deployer wallet from https://faucet.monad.xyz
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --private-key YOUR_PRIVATE_KEY

# After deployment, update TABSPLIT_ADDRESS in:
# frontend/src/lib/constants.ts
```

### After Deploying

1. Copy the deployed contract address from the forge output
2. Open `frontend/src/lib/constants.ts`
3. Replace the placeholder in `TABSPLIT_ADDRESS`
4. Run `npm run dev` in `frontend/` — the app now reads/writes to your live contract

## Network Config (Monad Testnet)

- **Chain ID:** 10143
- **RPC:** https://testnet-rpc.monad.xyz
- **Explorer:** https://testnet.monadexplorer.com
- **Faucet:** https://faucet.monad.xyz
- **Native currency:** MON (18 decimals)

## How it works

1. Connect your wallet (MetaMask or any WalletConnect wallet)
2. **Create a tab:** Enter a description, total amount in MON, and participant addresses. The per-person share is calculated live.
3. **Pay a share:** Participants see a "Pay my share (X MON)" button on tabs they owe. One click sends the exact amount directly to the payer's wallet onchain.
4. **Track status:** Each tab card shows who has paid (✓) and who hasn't (pending). When everyone pays, the tab is marked Settled automatically.

## Project Structure

```
├── contract/               # Foundry smart contract project
│   ├── src/TabSplit.sol    # Main contract
│   └── script/Deploy.s.sol # Deployment script
│
└── frontend/               # React + Vite frontend
    └── src/
        ├── abi/TabSplit.json        # Contract ABI
        ├── components/              # UI components
        ├── hooks/                   # wagmi contract hooks
        ├── lib/                     # wagmi config + constants
        └── types/                   # TypeScript types
```
