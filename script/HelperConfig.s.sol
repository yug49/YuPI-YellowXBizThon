// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";

contract HelperConfig is Script {
    error HelperConfig__ChainIdNotSupported();

    struct NetworkConfig {
        address adminAddress;
        address resolverAddress;
        address relayerAddress;
        uint16 resolverFee;
        uint256 maxOrderTime;
        uint256 maxFulfillmentTime;
    }

    NetworkConfig public activeNetworkConfig;

    uint256 public DEFAULT_ANVIL_PRIVATE_KEY = 0xfad03220cff9cdcc7354696780022d15f273ea202ccd260422a6e2dc7a6afc7a;

    // Yellow Network Optimized Configuration
    uint256 public constant MAX_ORDER_TIME = 30 seconds; // Extended for Yellow Network processing
    address public constant RELAYER_ADDRESS = 0xD43f127F91a190CB956Ec25640081a80Df72b8dc; // From RELAYER_PRIVATE_KEY
    uint256 public constant MAX_FULLFILLMENT_TIME = 10 seconds; // Reduced due to Yellow Network speed
    uint16 public constant RESOLVER_FEE = 50; // 0.5% fee (reduced for instant swaps)

    constructor() {
        if (block.chainid == 31337) {
            activeNetworkConfig = getOrCreateAnvilNetworkConfig();
        } else if (block.chainid == 8453) {
            activeNetworkConfig = getBaseMainnetNetworkConfig();
        } else {
            revert HelperConfig__ChainIdNotSupported();
        }
    }

    function getOrCreateAnvilNetworkConfig() internal pure returns (NetworkConfig memory _anvilNetworkConfig) {
        _anvilNetworkConfig = NetworkConfig({
            adminAddress: RELAYER_ADDRESS, // Using relayer as admin for now
            resolverAddress: RELAYER_ADDRESS, // Using relayer as resolver for now
            relayerAddress: RELAYER_ADDRESS,
            resolverFee: RESOLVER_FEE,
            maxOrderTime: MAX_ORDER_TIME,
            maxFulfillmentTime: MAX_FULLFILLMENT_TIME
        });
    }

    function getBaseMainnetNetworkConfig() internal pure returns (NetworkConfig memory _baseMainnetNetworkConfig) {
        _baseMainnetNetworkConfig = NetworkConfig({
            adminAddress: RELAYER_ADDRESS, // Using relayer as admin for now
            resolverAddress: RELAYER_ADDRESS, // Using relayer as resolver for now
            relayerAddress: RELAYER_ADDRESS,
            resolverFee: RESOLVER_FEE,
            maxOrderTime: MAX_ORDER_TIME,
            maxFulfillmentTime: MAX_FULLFILLMENT_TIME
        });
    }
}
