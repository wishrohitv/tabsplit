# Requirements Document

## Introduction

TabSplit is a full-stack decentralized application (dApp) deployed on Monad Testnet that enables a group payer to create an onchain "tab", split the total cost evenly among participants, and collect each participant's exact share directly onchain. The payer can monitor payment status in real time. All state lives onchain — there is no backend database.

## Glossary

- **Tab**: An onchain record representing a shared bill, owned by a Payer, containing a total amount split evenly among Participants.
- **Payer**: The wallet address that creates a Tab and is the ultimate recipient of all share payments.
- **Participant**: A wallet address listed in a Tab who owes exactly one share of the total amount.
- **Share**: The per-person payment amount, calculated as `totalAmount / participants.length`.
- **TabSplit Contract**: The single Solidity smart contract deployed on Monad Testnet that manages all Tabs.
- **TabSplit Frontend**: The React + Vite + TypeScript single-page application that interacts with the TabSplit Contract.
- **MON**: The native currency of Monad Testnet (18 decimals).
- **Tab ID**: A unique, auto-incrementing integer identifier for each Tab, starting at 1.
- **Settled**: The state of a Tab in which all Participants have paid their share.
- **RainbowKit**: The wallet connection UI library used for wallet management.
- **wagmi / viem**: Libraries used for Ethereum-compatible contract reads, writes, and wallet interactions.

---

## Requirements

### Requirement 1: Tab Creation (Contract)

**User Story:** As a Payer, I want to create an onchain Tab with a description, total amount, and participant list, so that all bill-splitting data is recorded transparently on the blockchain.

#### Acceptance Criteria

1. WHEN `createTab` is called with a non-empty description, a non-zero totalAmount, and a non-empty participants array, THE TabSplit Contract SHALL create a new Tab with a unique incrementing Tab ID starting at 1.
2. WHEN a Tab is created, THE TabSplit Contract SHALL calculate and store the share amount as `totalAmount / participants.length`.
3. WHEN a Tab is created, THE TabSplit Contract SHALL store the payer as `msg.sender`, the description, totalAmount, shareAmount, participants array, a mapping of `address => bool` for payment status, a `settled` flag initialized to `false`, and a `createdAt` timestamp.
4. WHEN a Tab is created, THE TabSplit Contract SHALL emit a `TabCreated` event containing `tabId`, `payer`, `description`, `totalAmount`, and `shareAmount`.
5. IF `createTab` is called with an empty participants array, THEN THE TabSplit Contract SHALL revert the transaction.
6. IF `createTab` is called with a zero totalAmount, THEN THE TabSplit Contract SHALL revert the transaction.

---

### Requirement 2: Share Payment (Contract)

**User Story:** As a Participant, I want to pay my exact share of a Tab onchain, so that my payment is recorded immutably and the Payer receives funds immediately.

#### Acceptance Criteria

1. WHEN `payShare` is called by a Participant with `msg.value` exactly equal to the Tab's shareAmount, THE TabSplit Contract SHALL forward the full payment to the Payer address using a low-level `.call` and mark `hasPaid[msg.sender] = true`.
2. WHEN a Participant's payment is successfully forwarded, THE TabSplit Contract SHALL emit a `SharePaid` event containing `tabId`, `payer_of_share`, and `amount`.
3. WHEN all Participants in a Tab have paid their share, THE TabSplit Contract SHALL set `settled = true` and emit a `TabSettled` event containing `tabId`.
4. IF `payShare` is called by an address that is not a Participant in the Tab, THEN THE TabSplit Contract SHALL revert the transaction.
5. IF `payShare` is called by a Participant who has already paid, THEN THE TabSplit Contract SHALL revert the transaction.
6. IF `payShare` is called with `msg.value` not equal to the Tab's shareAmount, THEN THE TabSplit Contract SHALL revert the transaction.
7. IF the low-level `.call` to forward payment to the Payer fails, THEN THE TabSplit Contract SHALL revert the transaction.

---

### Requirement 3: Tab Data Retrieval (Contract)

**User Story:** As a user, I want to read Tab data from the contract, so that the frontend can display accurate, real-time payment status without a backend.

#### Acceptance Criteria

1. WHEN `getTab(tabId)` is called, THE TabSplit Contract SHALL return all Tab fields: `id`, `payer`, `description`, `totalAmount`, `shareAmount`, `participants` array, payment status for each participant, `settled` flag, and `createdAt` timestamp.
2. WHEN `getMyTabs(address)` is called, THE TabSplit Contract SHALL return an array of all Tab IDs where the given address is either the Payer or a Participant.
3. WHEN `getAllTabs()` is called, THE TabSplit Contract SHALL return an array of all Tab IDs that have been created.
4. IF `getTab` is called with a Tab ID that does not exist, THEN THE TabSplit Contract SHALL revert the transaction.

---

### Requirement 4: Contract Deployment

**User Story:** As a developer, I want the TabSplit Contract deployed and verified on Monad Testnet, so that the frontend can interact with a live contract.

#### Acceptance Criteria

1. THE TabSplit Contract SHALL be deployed to Monad Testnet (Chain ID: 10143, RPC: https://testnet-rpc.monad.xyz).
2. WHEN the contract is deployed, THE deployment process SHALL save the contract ABI as `src/abi/TabSplit.json` in the frontend project.
3. THE TabSplit Contract SHALL include NatSpec comments on all public functions and events.
4. THE TabSplit Contract SHALL have no external dependencies and use only Solidity built-ins.

---

### Requirement 5: Wallet Connection (Frontend)

**User Story:** As a user, I want to connect my wallet to the TabSplit Frontend, so that I can create Tabs and pay shares with my onchain identity.

#### Acceptance Criteria

1. THE TabSplit Frontend SHALL display a RainbowKit connect wallet button in the top-right area of the page at all times.
2. WHEN a wallet is connected, THE TabSplit Frontend SHALL display the connected wallet address and the wallet's MON balance.
3. WHEN the connected wallet is on a network other than Monad Testnet (Chain ID: 10143), THE TabSplit Frontend SHALL display a wrong-network state prompting the user to switch networks.
4. WHILE no wallet is connected, THE TabSplit Frontend SHALL display the connect wallet button and restrict access to tab creation and payment actions.

---

### Requirement 6: Create Tab Form (Frontend)

**User Story:** As a Payer, I want a form to create a new Tab from the frontend, so that I can initiate a bill split without writing contract calls manually.

#### Acceptance Criteria

1. THE TabSplit Frontend SHALL provide a form with a description text input, a total amount input in MON, and a participant address input field.
2. WHEN the user enters a total amount and participant addresses, THE TabSplit Frontend SHALL display a live-calculated per-person share amount.
3. WHEN the user submits the Create Tab form, THE TabSplit Frontend SHALL call `createTab` on the TabSplit Contract and display a pending transaction state.
4. WHEN the `createTab` transaction is confirmed onchain, THE TabSplit Frontend SHALL display a success state and refresh the tab list.
5. IF the `createTab` transaction fails, THEN THE TabSplit Frontend SHALL display an error toast notification.
6. THE TabSplit Frontend SHALL allow participants to be entered as comma-separated addresses or added one at a time.

---

### Requirement 7: My Tabs View (Frontend)

**User Story:** As a user, I want to view all Tabs I am involved in, so that I can monitor payment status and take action on unpaid shares.

#### Acceptance Criteria

1. WHEN a wallet is connected, THE TabSplit Frontend SHALL display a list of all Tabs where the connected wallet is a Payer or Participant, fetched from `getMyTabs`.
2. WHEN displaying a Tab card, THE TabSplit Frontend SHALL show the description, total amount, share amount, a list of participants with paid/unpaid visual indicators, and a settled badge when applicable.
3. WHILE a connected wallet is a Participant with an unpaid share in a Tab, THE TabSplit Frontend SHALL display a "Pay my share (X MON)" button on that Tab card.
4. WHILE a connected wallet is the Payer of a Tab, THE TabSplit Frontend SHALL display payment status for all Participants but SHALL NOT display a pay button.
5. WHEN tab data is loading from the contract, THE TabSplit Frontend SHALL display loading skeleton components in place of tab cards.
6. WHEN a connected wallet has no associated Tabs, THE TabSplit Frontend SHALL display an empty state message.

---

### Requirement 8: Pay Share Functionality (Frontend)

**User Story:** As a Participant, I want to pay my share of a Tab directly from the frontend, so that my payment is submitted onchain with the correct amount automatically.

#### Acceptance Criteria

1. WHEN a Participant clicks "Pay my share", THE TabSplit Frontend SHALL call `payShare` on the TabSplit Contract with `msg.value` set to exactly the Tab's shareAmount.
2. WHEN the `payShare` transaction is pending, THE TabSplit Frontend SHALL display a pending state on the pay button and prevent duplicate submissions.
3. WHEN the `payShare` transaction is confirmed onchain, THE TabSplit Frontend SHALL display a success toast notification and refresh the Tab's payment status.
4. IF the `payShare` transaction fails, THEN THE TabSplit Frontend SHALL display an error toast notification with a human-readable message.

---

### Requirement 9: UI Feedback and States (Frontend)

**User Story:** As a user, I want clear visual feedback for all onchain actions and loading states, so that I always know the current status of my transactions and data.

#### Acceptance Criteria

1. WHEN a transaction is submitted to the network, THE TabSplit Frontend SHALL display a toast notification indicating the transaction is pending.
2. WHEN a transaction is confirmed onchain, THE TabSplit Frontend SHALL display a success toast notification.
3. IF a transaction fails or is rejected, THEN THE TabSplit Frontend SHALL display an error toast notification.
4. THE TabSplit Frontend SHALL use react-hot-toast for all toast notifications.
5. THE TabSplit Frontend SHALL be responsive and usable on mobile screen widths.
6. THE TabSplit Frontend SHALL use a warm off-white background with a bold accent color for primary actions and consistent rounded-corner card styling.
7. THE TabSplit Frontend SHALL NOT use hardcoded or mock data — all displayed data SHALL come from onchain contract reads.

---

### Requirement 10: Project Setup and Documentation

**User Story:** As a developer, I want a complete project setup with documentation, so that the project can be run and understood immediately.

#### Acceptance Criteria

1. THE TabSplit Frontend SHALL be scaffolded with React, Vite, and TypeScript.
2. THE TabSplit Frontend SHALL use TailwindCSS for styling.
3. WHEN `npm run dev` is executed in the frontend project directory, THE TabSplit Frontend SHALL start with no errors.
4. THE project root SHALL contain a `README.md` file with a project description, setup instructions, deployed contract address, and tech stack summary.
