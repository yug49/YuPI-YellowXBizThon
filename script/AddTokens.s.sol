// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {OrderProtocol} from "../src/OrderProtocol.sol";

contract AddTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address orderProtocolAddress = vm.envAddress("ORDER_PROTOCOL_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        OrderProtocol orderProtocol = OrderProtocol(orderProtocolAddress);

        // Add USDC on Base Mainnet
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        console.log("Adding USDC token:", usdc);
        orderProtocol.addToken(usdc);

        // Add WETH on Base Mainnet
        address weth = 0x4200000000000000000000000000000000000006;
        console.log("Adding WETH token:", weth);
        orderProtocol.addToken(weth);

        vm.stopBroadcast();

        console.log("Tokens added successfully!");
    }
}
