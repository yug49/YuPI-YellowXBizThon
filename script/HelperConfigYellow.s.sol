// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";

/**
 * @title HelperConfig
 * @dev Configuration helper for Yellow Network contract deployment
 */
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

    // Yellow Network Optimized Configuration
    uint256 public constant MAX_ORDER_TIME = 30 seconds; // Extended for Yellow Network processing
    uint256 public constant MAX_FULFILLMENT_TIME = 5 seconds; // Optimized for Yellow Network speed
    uint16 public constant RESOLVER_FEE = 100; // 1% in basis points

    // New entities for Yellow Network deployment
    address public constant ADMIN_ADDRESS = 0x52920d90d6014e2C66CeaF860F53b27c60B03e8B;
    address public constant RESOLVER_ADDRESS = 0x1FCf56c6097a4fFc5668A0cEDC24787BAd563c24;
    address public constant RELAYER_ADDRESS = 0xD3E3B2eB9ba10bF4EF93Dd94AB00BC6eF7FE9C94;

    /**
     * @dev Get network configuration based on chain ID
     */
    function getConfig() external view returns (NetworkConfig memory) {
        if (block.chainid == 8453) {
            return getBaseMainnetConfig();
        } else if (block.chainid == 31337) {
            return getAnvilConfig();
        } else {
            revert HelperConfig__ChainIdNotSupported();
        }
    }

    /**
     * @dev Base Mainnet configuration for Yellow Network
     */
    function getBaseMainnetConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            adminAddress: ADMIN_ADDRESS,
            resolverAddress: RESOLVER_ADDRESS,
            relayerAddress: RELAYER_ADDRESS,
            resolverFee: RESOLVER_FEE,
            maxOrderTime: MAX_ORDER_TIME,
            maxFulfillmentTime: MAX_FULFILLMENT_TIME
        });
    }

    /**
     * @dev Local Anvil configuration for testing
     */
    function getAnvilConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            adminAddress: ADMIN_ADDRESS,
            resolverAddress: RESOLVER_ADDRESS,
            relayerAddress: RELAYER_ADDRESS,
            resolverFee: RESOLVER_FEE,
            maxOrderTime: MAX_ORDER_TIME,
            maxFulfillmentTime: MAX_FULFILLMENT_TIME
        });
    }
}
