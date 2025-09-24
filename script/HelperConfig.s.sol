// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";

contract HelperConfig is Script {
    error HelperConfig__ChainIdNotSupported();

    struct NetworkConfig {
        uint256 _maxOrderTime;
        address _relayerAddress;
        uint256 _maxFullfillmentTime;
        uint16 _resolverFee;
    }

    NetworkConfig public activeNetworkConfig;

    uint256 public DEFAULT_ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 public constant MAX_ORDER_TIME = 15 seconds;
    address public constant RELAYER_ADDRESS = 0xD43f127F91a190CB956Ec25640081a80Df72b8dc;
    uint256 public constant MAX_FULLFILLMENT_TIME = 1 minutes;
    uint16 public constant RESOLVER_FEE = 100; // 1% fee

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
            _maxOrderTime: MAX_ORDER_TIME,
            _relayerAddress: RELAYER_ADDRESS,
            _maxFullfillmentTime: MAX_FULLFILLMENT_TIME,
            _resolverFee: RESOLVER_FEE
        });
    }

    function getBaseMainnetNetworkConfig() internal pure returns (NetworkConfig memory _baseMainnetNetworkConfig) {
        _baseMainnetNetworkConfig = NetworkConfig({
            _maxOrderTime: MAX_ORDER_TIME,
            _relayerAddress: RELAYER_ADDRESS,
            _maxFullfillmentTime: MAX_FULLFILLMENT_TIME,
            _resolverFee: RESOLVER_FEE
        });
    }
}
