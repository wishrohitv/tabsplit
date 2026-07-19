// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TabSplit
 * @notice Onchain bill-splitting contract deployed on Monad Testnet.
 *         A Payer creates a Tab with a total amount split evenly among
 *         Participants. Each Participant pays their exact share directly
 *         onchain; funds are forwarded immediately to the Payer.
 */
contract TabSplit {
    // -------------------------------------------------------------------------
    // Data Structures
    // -------------------------------------------------------------------------

    /**
     * @notice Represents a single shared bill (tab).
     * @dev    The `hasPaid` mapping must live inside the struct in storage;
     *         it cannot be returned directly — callers use the parallel bool
     *         array emitted by `getTab`.
     */
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

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @dev Auto-incrementing counter; first Tab ID is 1.
    uint256 private _tabCounter;

    /// @dev Primary store: tabId => Tab.
    mapping(uint256 => Tab) private _tabs;

    /// @dev Index of Tab IDs per address (payer + participants).
    mapping(address => uint256[]) private _userTabs;

    /// @dev Ordered list of every Tab ID ever created.
    uint256[] private _allTabIds;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * @notice Emitted when a new Tab is successfully created.
     * @param tabId       The unique identifier assigned to the new Tab.
     * @param payer       The address that created the Tab and will receive payments.
     * @param description A human-readable label for the shared bill.
     * @param totalAmount The total bill amount in wei (MON).
     * @param shareAmount The per-participant payment amount (totalAmount / participants.length).
     */
    event TabCreated(
        uint256 indexed tabId,
        address indexed payer,
        string description,
        uint256 totalAmount,
        uint256 shareAmount
    );

    /**
     * @notice Emitted when a Participant successfully pays their share.
     * @param tabId         The identifier of the Tab that was paid into.
     * @param payer_of_share The Participant address that submitted the payment.
     * @param amount        The exact share amount forwarded to the Payer (in wei).
     */
    event SharePaid(
        uint256 indexed tabId,
        address indexed payer_of_share,
        uint256 amount
    );

    /**
     * @notice Emitted when every Participant in a Tab has paid their share.
     * @param tabId The identifier of the Tab that is now fully settled.
     */
    event TabSettled(uint256 indexed tabId);

    // -------------------------------------------------------------------------
    // External Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Create a new Tab to split a bill evenly among participants.
     * @param description  A human-readable label for the shared bill.
     * @param participants Array of participant addresses who owe a share.
     *                     Must be non-empty. The payer (msg.sender) may or
     *                     may not be included; duplicates in the index are
     *                     avoided automatically.
     * @param totalAmount  The total bill amount in wei (MON). Must be > 0.
     */
    function createTab(
        string memory description,
        address[] memory participants,
        uint256 totalAmount
    ) external {
        require(participants.length > 0, "TabSplit: participants array must not be empty");
        require(totalAmount > 0, "TabSplit: totalAmount must be greater than zero");

        // Increment counter; first Tab ID is 1
        _tabCounter++;
        uint256 tabId = _tabCounter;

        uint256 shareAmount = totalAmount / participants.length;

        // Initialise the Tab fields
        Tab storage t = _tabs[tabId];
        t.id = tabId;
        t.payer = msg.sender;
        t.description = description;
        t.totalAmount = totalAmount;
        t.shareAmount = shareAmount;
        t.settled = false;
        t.createdAt = block.timestamp;

        // Copy participants into storage and set hasPaid to false
        for (uint256 i = 0; i < participants.length; i++) {
            t.participants.push(participants[i]);
            t.hasPaid[participants[i]] = false;
        }

        // Index the tab for the payer
        _userTabs[msg.sender].push(tabId);

        // Index the tab for each participant (skip if same as payer to avoid duplicate)
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] != msg.sender) {
                _userTabs[participants[i]].push(tabId);
            }
        }

        // Append to the global list
        _allTabIds.push(tabId);

        emit TabCreated(tabId, msg.sender, description, totalAmount, shareAmount);
    }

    /**
     * @notice Pay your share of an existing Tab. The exact share amount must be
     *         sent as `msg.value`; it is forwarded immediately to the Tab's payer.
     * @param tabId The identifier of the Tab to pay into.
     */
    function payShare(uint256 tabId) external payable {
        // Validate tab exists
        require(tabId > 0 && tabId <= _tabCounter, "TabSplit: tab does not exist");

        // Validate caller is a participant
        require(_isParticipant(tabId, msg.sender), "TabSplit: not a participant");

        // Validate caller has not already paid
        require(!_tabs[tabId].hasPaid[msg.sender], "TabSplit: already paid");

        // Validate correct payment amount
        require(msg.value == _tabs[tabId].shareAmount, "TabSplit: incorrect payment amount");

        // Forward payment to the payer
        (bool success, ) = _tabs[tabId].payer.call{value: msg.value}("");
        require(success, "TabSplit: payment transfer failed");

        // Mark the caller as having paid
        _tabs[tabId].hasPaid[msg.sender] = true;

        emit SharePaid(tabId, msg.sender, msg.value);

        // Check if all participants have paid; if so, settle the tab
        bool allPaid = true;
        address[] storage participants = _tabs[tabId].participants;
        for (uint256 i = 0; i < participants.length; i++) {
            if (!_tabs[tabId].hasPaid[participants[i]]) {
                allPaid = false;
                break;
            }
        }
        if (allPaid) {
            _tabs[tabId].settled = true;
            emit TabSettled(tabId);
        }
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieve all details of a Tab by its ID.
     * @dev    Because the `hasPaid` mapping cannot be returned directly, a
     *         parallel bool array is built by iterating the participants array.
     * @param tabId The unique identifier of the Tab to query.
     * @return id           The Tab's ID.
     * @return payer        The address that created the Tab and receives payments.
     * @return description  The human-readable label for the shared bill.
     * @return totalAmount  The total bill amount in wei.
     * @return shareAmount  The per-participant amount in wei.
     * @return participants The array of participant addresses.
     * @return hasPaid      Parallel bool array — `hasPaid[i]` is true when
     *                      `participants[i]` has already paid their share.
     * @return settled      True when every participant has paid.
     * @return createdAt    The block timestamp at which the Tab was created.
     */
    function getTab(uint256 tabId)
        external
        view
        returns (
            uint256 id,
            address payer,
            string memory description,
            uint256 totalAmount,
            uint256 shareAmount,
            address[] memory participants,
            bool[] memory hasPaid,
            bool settled,
            uint256 createdAt
        )
    {
        require(tabId > 0 && tabId <= _tabCounter, "TabSplit: tab does not exist");

        Tab storage t = _tabs[tabId];

        // Build a parallel hasPaid bool array from the mapping
        uint256 len = t.participants.length;
        bool[] memory paid = new bool[](len);
        for (uint256 i = 0; i < len; i++) {
            paid[i] = t.hasPaid[t.participants[i]];
        }

        return (
            t.id,
            t.payer,
            t.description,
            t.totalAmount,
            t.shareAmount,
            t.participants,
            paid,
            t.settled,
            t.createdAt
        );
    }

    /**
     * @notice Return all Tab IDs associated with a given address.
     * @dev    An address is associated with a Tab if it is the payer or a
     *         participant. Populated during `createTab`.
     * @param user The address to query.
     * @return An array of Tab IDs in creation order.
     */
    function getMyTabs(address user) external view returns (uint256[] memory) {
        return _userTabs[user];
    }

    /**
     * @notice Return the IDs of every Tab ever created, in creation order.
     * @return An array containing all Tab IDs.
     */
    function getAllTabs() external view returns (uint256[] memory) {
        return _allTabIds;
    }

    // -------------------------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------------------------

    /**
     * @dev Returns true if `user` is in the participants array of the given tab.
     * @param tabId The tab to check.
     * @param user  The address to look for.
     */
    function _isParticipant(uint256 tabId, address user) internal view returns (bool) {
        address[] storage participants = _tabs[tabId].participants;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == user) {
                return true;
            }
        }
        return false;
    }
}
