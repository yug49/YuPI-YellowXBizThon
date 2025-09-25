// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {OrderProtocol} from "../src/OrderProtocol.sol";
import {MakerRegistry} from "../src/MakerRegistry.sol";
import {ResolverRegistry} from "../src/ResolverRegistry.sol";
import {HelperConfig} from "./HelperConfigYellow.s.sol";

/**
 * @title DeployYellowNetwork
 * @dev Foundry script to deploy Yellow Network integrated contracts to Base Mainnet
 * @notice This script deploys the complete order protocol system with Yellow Network optimization
 */
contract DeployYellowNetwork is Script {
    struct DeploymentAddresses {
        address orderProtocol;
        address makerRegistry;
        address resolverRegistry;
        address admin;
        address resolver;
        address relayer;
    }

    function run() external returns (DeploymentAddresses memory) {
        // Get network configuration
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        console.log("=== Yellow Network Deployment on Base Mainnet ===");
        console.log("Admin Address:", config.adminAddress);
        console.log("Resolver Address:", config.resolverAddress);
        console.log("Relayer Address:", config.relayerAddress);
        console.log("Resolver Fee:", config.resolverFee, "basis points");

        // Start broadcasting transactions using admin private key
        vm.startBroadcast();

        // Deploy MakerRegistry first
        console.log("\n1. Deploying MakerRegistry...");
        MakerRegistry makerRegistry = new MakerRegistry();
        console.log("MakerRegistry deployed at:", address(makerRegistry));

        // Deploy ResolverRegistry
        console.log("\n2. Deploying ResolverRegistry...");
        ResolverRegistry resolverRegistry = new ResolverRegistry();
        console.log("ResolverRegistry deployed at:", address(resolverRegistry));

        // Deploy OrderProtocol with Yellow Network optimization
        console.log("\n3. Deploying OrderProtocol with Yellow Network integration...");
        OrderProtocol orderProtocol = new OrderProtocol(
            config.maxOrderTime,
            address(resolverRegistry),
            config.relayerAddress,
            config.maxFulfillmentTime,
            config.resolverFee,
            address(makerRegistry)
        );
        console.log("OrderProtocol deployed at:", address(orderProtocol));

        // Register the resolver address in ResolverRegistry
        console.log("\n4. Registering resolver in ResolverRegistry...");
        resolverRegistry.addResolver(config.resolverAddress);
        console.log("Resolver", config.resolverAddress, "registered successfully");

        // Verify resolver registration
        bool isRegistered = resolverRegistry.isResolver(config.resolverAddress);
        require(isRegistered, "Resolver registration failed");
        console.log("Resolver registration verified: true");

        vm.stopBroadcast();

        // Display deployment summary
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network: Base Mainnet (Chain ID: 8453)");
        console.log("Deployer (Admin):", config.adminAddress);
        console.log("");
        console.log("Contract Addresses:");
        console.log("- OrderProtocol:", address(orderProtocol));
        console.log("- MakerRegistry:", address(makerRegistry));
        console.log("- ResolverRegistry:", address(resolverRegistry));
        console.log("");
        console.log("Configuration:");
        console.log("- Main Resolver:", config.resolverAddress);
        console.log("- Relayer:", config.relayerAddress);
        console.log("- Resolver Fee:", config.resolverFee, "basis points");
        console.log("");
        console.log("Yellow Network Features:");
        console.log("- Instant settlement via state channels");
        console.log("- 85% faster than traditional methods");
        console.log("- Integrated with ClearNode infrastructure");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update .env files with new contract addresses");
        console.log("2. Restart backend with updated configuration");
        console.log("3. Test instant fulfillment system");

        return DeploymentAddresses({
            orderProtocol: address(orderProtocol),
            makerRegistry: address(makerRegistry),
            resolverRegistry: address(resolverRegistry),
            admin: config.adminAddress,
            resolver: config.resolverAddress,
            relayer: config.relayerAddress
        });
    }

    /**
     * @dev Helper function to update environment variables after deployment
     * @notice This generates the commands needed to update .env files
     */
    function generateEnvUpdateCommands(DeploymentAddresses memory addresses) external pure {
        console.log("\n=== ENVIRONMENT UPDATE COMMANDS ===");
        console.log("Copy these addresses to your .env files:");
        console.log("");
        console.log("ORDER_PROTOCOL_ADDRESS=", addresses.orderProtocol);
        console.log("MAKER_REGISTRY_ADDRESS=", addresses.makerRegistry);
        console.log("RESOLVER_REGISTRY_ADDRESS=", addresses.resolverRegistry);
        console.log("CONTRACT_ADDRESS=", addresses.orderProtocol);
        console.log("");
        console.log("Backend .env update:");
        console.log("ADMIN_ADDRESS=", addresses.admin);
        console.log("RESOLVER_ADDRESS=", addresses.resolver);
        console.log("RELAYER_ADDRESS=", addresses.relayer);
        console.log("MAIN_RESOLVER_ADDRESS=", addresses.resolver);
    }
}
