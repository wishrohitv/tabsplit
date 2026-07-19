// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TabSplit} from "../src/TabSplit.sol";

contract TabSplitTest is Test {
    TabSplit public tabSplit;

    address payer = address(0x1);
    address participant1 = address(0x2);
    address participant2 = address(0x3);
    address stranger = address(0x4);

    function setUp() public {
        tabSplit = new TabSplit();
        vm.deal(payer, 100 ether);
        vm.deal(participant1, 100 ether);
        vm.deal(participant2, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    // -------------------------------------------------------------------------
    // createTab — happy path
    // -------------------------------------------------------------------------

    function test_createTab_storesFields() public {
        address[] memory participants = new address[](2);
        participants[0] = participant1;
        participants[1] = participant2;

        vm.prank(payer);
        tabSplit.createTab("Dinner at Joe's", participants, 1 ether);

        (
            uint256 id,
            address storedPayer,
            string memory description,
            uint256 totalAmount,
            uint256 shareAmount,
            address[] memory storedParticipants,
            bool[] memory hasPaid,
            bool settled,
            uint256 createdAt
        ) = tabSplit.getTab(1);

        assertEq(id, 1);
        assertEq(storedPayer, payer);
        assertEq(description, "Dinner at Joe's");
        assertEq(totalAmount, 1 ether);
        assertEq(shareAmount, 0.5 ether); // 1 ether / 2 participants
        assertEq(storedParticipants.length, 2);
        assertFalse(hasPaid[0]);
        assertFalse(hasPaid[1]);
        assertFalse(settled);
        assertGt(createdAt, 0);
    }

    function test_createTab_emitsEvent() public {
        address[] memory participants = new address[](1);
        participants[0] = participant1;

        vm.expectEmit(true, true, false, true);
        emit TabSplit.TabCreated(1, payer, "Lunch", 1 ether, 1 ether);

        vm.prank(payer);
        tabSplit.createTab("Lunch", participants, 1 ether);
    }

    function test_createTab_incrementsCounter() public {
        address[] memory participants = new address[](1);
        participants[0] = participant1;

        vm.startPrank(payer);
        tabSplit.createTab("Tab 1", participants, 1 ether);
        tabSplit.createTab("Tab 2", participants, 2 ether);
        vm.stopPrank();

        uint256[] memory allTabs = tabSplit.getAllTabs();
        assertEq(allTabs.length, 2);
        assertEq(allTabs[0], 1);
        assertEq(allTabs[1], 2);
    }

    function test_createTab_indexesPayerAndParticipants() public {
        address[] memory participants = new address[](2);
        participants[0] = participant1;
        participants[1] = participant2;

        vm.prank(payer);
        tabSplit.createTab("Dinner", participants, 1 ether);

        uint256[] memory payerTabs = tabSplit.getMyTabs(payer);
        uint256[] memory p1Tabs = tabSplit.getMyTabs(participant1);
        uint256[] memory p2Tabs = tabSplit.getMyTabs(participant2);

        assertEq(payerTabs.length, 1);
        assertEq(p1Tabs.length, 1);
        assertEq(p2Tabs.length, 1);
    }

    function test_createTab_payerAsParticipant_noDuplicate() public {
        // If payer is also in the participants array, they should only appear once in getMyTabs
        address[] memory participants = new address[](2);
        participants[0] = payer; // payer is a participant too
        participants[1] = participant1;

        vm.prank(payer);
        tabSplit.createTab("Dinner", participants, 1 ether);

        uint256[] memory payerTabs = tabSplit.getMyTabs(payer);
        assertEq(payerTabs.length, 1, "Payer should appear only once in getMyTabs");
    }

    // -------------------------------------------------------------------------
    // createTab — reverts
    // -------------------------------------------------------------------------

    function test_createTab_revert_emptyParticipants() public {
        address[] memory participants = new address[](0);

        vm.prank(payer);
        vm.expectRevert("TabSplit: participants array must not be empty");
        tabSplit.createTab("Dinner", participants, 1 ether);
    }

    function test_createTab_revert_zeroAmount() public {
        address[] memory participants = new address[](1);
        participants[0] = participant1;

        vm.prank(payer);
        vm.expectRevert("TabSplit: totalAmount must be greater than zero");
        tabSplit.createTab("Dinner", participants, 0);
    }

    // -------------------------------------------------------------------------
    // payShare — happy path
    // -------------------------------------------------------------------------

    function _createTab() internal returns (uint256 tabId, uint256 shareAmount) {
        address[] memory participants = new address[](2);
        participants[0] = participant1;
        participants[1] = participant2;

        vm.prank(payer);
        tabSplit.createTab("Dinner", participants, 1 ether);
        tabId = 1;
        shareAmount = 0.5 ether;
    }

    function test_payShare_forwardsPaymentToPayer() public {
        (, uint256 shareAmount) = _createTab();

        uint256 payerBefore = payer.balance;

        vm.prank(participant1);
        tabSplit.payShare{value: shareAmount}(1);

        assertEq(payer.balance, payerBefore + shareAmount);
    }

    function test_payShare_marksPaid() public {
        (, uint256 shareAmount) = _createTab();

        vm.prank(participant1);
        tabSplit.payShare{value: shareAmount}(1);

        (,,,,, address[] memory participants, bool[] memory hasPaid,,) = tabSplit.getTab(1);
        // participant1 is at index 0
        assertEq(participants[0], participant1);
        assertTrue(hasPaid[0]);
        assertFalse(hasPaid[1]);
    }

    function test_payShare_emitsSharePaid() public {
        (, uint256 shareAmount) = _createTab();

        vm.expectEmit(true, true, false, true);
        emit TabSplit.SharePaid(1, participant1, shareAmount);

        vm.prank(participant1);
        tabSplit.payShare{value: shareAmount}(1);
    }

    function test_payShare_settlesWhenAllPaid() public {
        (, uint256 shareAmount) = _createTab();

        vm.prank(participant1);
        tabSplit.payShare{value: shareAmount}(1);

        vm.expectEmit(true, false, false, false);
        emit TabSplit.TabSettled(1);

        vm.prank(participant2);
        tabSplit.payShare{value: shareAmount}(1);

        (,,,,,,,bool settled,) = tabSplit.getTab(1);
        assertTrue(settled);
    }

    function test_payShare_notSettledUntilAll() public {
        (, uint256 shareAmount) = _createTab();

        vm.prank(participant1);
        tabSplit.payShare{value: shareAmount}(1);

        (,,,,,,,bool settled,) = tabSplit.getTab(1);
        assertFalse(settled, "Should not be settled until all participants pay");
    }

    // -------------------------------------------------------------------------
    // payShare — reverts
    // -------------------------------------------------------------------------

    function test_payShare_revert_notParticipant() public {
        (, uint256 shareAmount) = _createTab();

        vm.prank(stranger);
        vm.expectRevert("TabSplit: not a participant");
        tabSplit.payShare{value: shareAmount}(1);
    }

    function test_payShare_revert_alreadyPaid() public {
        (, uint256 shareAmount) = _createTab();

        vm.prank(participant1);
        tabSplit.payShare{value: shareAmount}(1);

        vm.prank(participant1);
        vm.expectRevert("TabSplit: already paid");
        tabSplit.payShare{value: shareAmount}(1);
    }

    function test_payShare_revert_wrongValue() public {
        _createTab();

        vm.prank(participant1);
        vm.expectRevert("TabSplit: incorrect payment amount");
        tabSplit.payShare{value: 0.1 ether}(1); // wrong amount
    }

    function test_payShare_revert_tabDoesNotExist() public {
        vm.prank(participant1);
        vm.expectRevert("TabSplit: tab does not exist");
        tabSplit.payShare{value: 1 ether}(999);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    function test_getTab_revert_nonexistentId() public {
        vm.expectRevert("TabSplit: tab does not exist");
        tabSplit.getTab(1);
    }

    function test_getAllTabs_empty() public view {
        uint256[] memory all = tabSplit.getAllTabs();
        assertEq(all.length, 0);
    }

    function test_getMyTabs_empty() public view {
        uint256[] memory myTabs = tabSplit.getMyTabs(payer);
        assertEq(myTabs.length, 0);
    }

    function test_getMyTabs_returnsCorrectIds() public {
        address[] memory participants = new address[](1);
        participants[0] = participant1;

        vm.startPrank(payer);
        tabSplit.createTab("Tab A", participants, 1 ether);
        tabSplit.createTab("Tab B", participants, 2 ether);
        vm.stopPrank();

        uint256[] memory payerTabs = tabSplit.getMyTabs(payer);
        assertEq(payerTabs.length, 2);
        assertEq(payerTabs[0], 1);
        assertEq(payerTabs[1], 2);

        uint256[] memory p1Tabs = tabSplit.getMyTabs(participant1);
        assertEq(p1Tabs.length, 2);
    }

    // -------------------------------------------------------------------------
    // Fuzz / property tests
    // -------------------------------------------------------------------------

    /// @dev Property 2: shareAmount == totalAmount / participants.length
    function testFuzz_shareAmountArithmetic(uint256 totalAmount, uint8 numParticipants) public {
        vm.assume(numParticipants > 0 && numParticipants <= 20);
        vm.assume(totalAmount > 0 && totalAmount <= 1000 ether);

        address[] memory participants = new address[](numParticipants);
        for (uint8 i = 0; i < numParticipants; i++) {
            participants[i] = address(uint160(100 + i));
        }

        vm.prank(payer);
        tabSplit.createTab("Fuzz tab", participants, totalAmount);

        (,,,,uint256 shareAmount,,,, ) = tabSplit.getTab(1);
        assertEq(shareAmount, totalAmount / numParticipants);
    }

    /// @dev Property 7: getAllTabs().length == number of createTab calls
    function testFuzz_getAllTabsCount(uint8 n) public {
        vm.assume(n > 0 && n <= 10);

        address[] memory participants = new address[](1);
        participants[0] = participant1;

        vm.startPrank(payer);
        for (uint8 i = 0; i < n; i++) {
            tabSplit.createTab("Tab", participants, 1 ether);
        }
        vm.stopPrank();

        uint256[] memory all = tabSplit.getAllTabs();
        assertEq(all.length, n);
    }
}
