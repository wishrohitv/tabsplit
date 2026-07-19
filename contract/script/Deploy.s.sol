// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TabSplit} from "../src/TabSplit.sol";

contract DeployTabSplit is Script {
    function run() external {
        vm.startBroadcast();

        TabSplit tabSplit = new TabSplit();

        vm.stopBroadcast();

        console.log("TabSplit deployed at:", address(tabSplit));
    }
}
