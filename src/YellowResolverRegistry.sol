// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YellowResolverRegistry
 * @dev Simplified resolver registry optimized for Yellow Network integration
 *
 * Key features:
 * - Lightweight resolver management
 * - Primary resolver configuration for Yellow Network
 * - Performance tracking for hackathon metrics
 * - Simple authorization model
 */
contract YellowResolverRegistry is Ownable {
    struct Resolver {
        address resolverAddress; // Resolver wallet address
        string endpoint; // API endpoint for callbacks
        bool isActive; // Whether resolver is active
        uint256 totalOrders; // Total orders processed
        uint256 successfulOrders; // Successfully completed orders
        uint256 registeredAt; // Registration timestamp
        uint256 lastActiveAt; // Last activity timestamp
    }

    // Core mappings
    mapping(address => Resolver) public resolvers;
    address[] private resolverList; // For enumeration

    // Yellow Network integration
    address public mainResolver; // Primary resolver for Yellow integration
    uint256 public totalResolvers; // Count of registered resolvers

    // Events
    event ResolverRegistered(address indexed resolver, string endpoint);
    event ResolverUpdated(address indexed resolver, string endpoint);
    event ResolverDeactivated(address indexed resolver);
    event ResolverActivated(address indexed resolver);
    event MainResolverSet(address indexed resolver);
    event OrderCompleted(address indexed resolver, bool successful);

    constructor(address _mainResolver) Ownable(msg.sender) {
        if (_mainResolver != address(0)) {
            mainResolver = _mainResolver;
        }
    }

    /**
     * @dev Register a new resolver
     * @param resolverAddress Resolver wallet address
     * @param endpoint API endpoint for callbacks
     */
    function registerResolver(address resolverAddress, string calldata endpoint) external onlyOwner {
        require(resolverAddress != address(0), "Invalid resolver address");
        require(bytes(endpoint).length > 0, "Invalid endpoint");
        require(resolvers[resolverAddress].resolverAddress == address(0), "Resolver already registered");

        resolvers[resolverAddress] = Resolver({
            resolverAddress: resolverAddress,
            endpoint: endpoint,
            isActive: true,
            totalOrders: 0,
            successfulOrders: 0,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp
        });

        resolverList.push(resolverAddress);
        totalResolvers++;

        // Set as main resolver if none exists
        if (mainResolver == address(0)) {
            mainResolver = resolverAddress;
            emit MainResolverSet(resolverAddress);
        }

        emit ResolverRegistered(resolverAddress, endpoint);
    }

    /**
     * @dev Update resolver endpoint
     * @param resolverAddress Resolver to update
     * @param endpoint New endpoint
     */
    function updateResolverEndpoint(address resolverAddress, string calldata endpoint) external onlyOwner {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");
        require(bytes(endpoint).length > 0, "Invalid endpoint");

        resolvers[resolverAddress].endpoint = endpoint;
        resolvers[resolverAddress].lastActiveAt = block.timestamp;

        emit ResolverUpdated(resolverAddress, endpoint);
    }

    /**
     * @dev Set main resolver for Yellow Network
     * @param _mainResolver New main resolver address
     */
    function setMainResolver(address _mainResolver) external onlyOwner {
        require(_mainResolver != address(0), "Invalid resolver address");
        require(resolvers[_mainResolver].isActive, "Resolver not active");

        mainResolver = _mainResolver;
        resolvers[_mainResolver].lastActiveAt = block.timestamp;

        emit MainResolverSet(_mainResolver);
    }

    /**
     * @dev Activate resolver
     * @param resolverAddress Resolver to activate
     */
    function activateResolver(address resolverAddress) external onlyOwner {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");
        require(!resolvers[resolverAddress].isActive, "Resolver already active");

        resolvers[resolverAddress].isActive = true;
        resolvers[resolverAddress].lastActiveAt = block.timestamp;

        emit ResolverActivated(resolverAddress);
    }

    /**
     * @dev Deactivate resolver
     * @param resolverAddress Resolver to deactivate
     */
    function deactivateResolver(address resolverAddress) external onlyOwner {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");
        require(resolvers[resolverAddress].isActive, "Resolver already inactive");
        require(resolverAddress != mainResolver, "Cannot deactivate main resolver");

        resolvers[resolverAddress].isActive = false;

        emit ResolverDeactivated(resolverAddress);
    }

    /**
     * @dev Record order completion (for performance tracking)
     * @param resolverAddress Resolver that completed the order
     * @param successful Whether the order was successful
     */
    function recordOrderCompletion(address resolverAddress, bool successful) external onlyOwner {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");

        resolvers[resolverAddress].totalOrders++;
        if (successful) {
            resolvers[resolverAddress].successfulOrders++;
        }
        resolvers[resolverAddress].lastActiveAt = block.timestamp;

        emit OrderCompleted(resolverAddress, successful);
    }

    /**
     * @dev Get main resolver for Yellow integration
     * @return Main resolver address
     */
    function getMainResolver() external view returns (address) {
        return mainResolver;
    }

    /**
     * @dev Check if resolver is authorized
     * @param resolver Resolver address to check
     * @return True if resolver is active and authorized
     */
    function isAuthorizedResolver(address resolver) external view returns (bool) {
        return resolvers[resolver].isActive;
    }

    /**
     * @dev Get resolver details
     * @param resolverAddress Resolver to query
     * @return Resolver struct
     */
    function getResolver(address resolverAddress) external view returns (Resolver memory) {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");
        return resolvers[resolverAddress];
    }

    /**
     * @dev Get resolver endpoint
     * @param resolverAddress Resolver to query
     * @return Endpoint string
     */
    function getResolverEndpoint(address resolverAddress) external view returns (string memory) {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");
        return resolvers[resolverAddress].endpoint;
    }

    /**
     * @dev Get resolver performance metrics
     * @param resolverAddress Resolver to query
     * @return totalOrders Total orders processed
     * @return successfulOrders Successfully completed orders
     * @return successRate Success rate percentage (scaled by 100)
     */
    function getResolverMetrics(address resolverAddress)
        external
        view
        returns (uint256 totalOrders, uint256 successfulOrders, uint256 successRate)
    {
        require(resolvers[resolverAddress].resolverAddress != address(0), "Resolver not registered");

        Resolver memory resolver = resolvers[resolverAddress];
        totalOrders = resolver.totalOrders;
        successfulOrders = resolver.successfulOrders;

        if (totalOrders > 0) {
            successRate = (successfulOrders * 100) / totalOrders;
        } else {
            successRate = 0;
        }
    }

    /**
     * @dev Get all active resolvers
     * @return Array of active resolver addresses
     */
    function getActiveResolvers() external view returns (address[] memory) {
        uint256 activeCount = 0;

        // Count active resolvers
        for (uint256 i = 0; i < resolverList.length; i++) {
            if (resolvers[resolverList[i]].isActive) {
                activeCount++;
            }
        }

        // Create array of active resolvers
        address[] memory activeResolvers = new address[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < resolverList.length; i++) {
            if (resolvers[resolverList[i]].isActive) {
                activeResolvers[index] = resolverList[i];
                index++;
            }
        }

        return activeResolvers;
    }

    /**
     * @dev Get total number of registered resolvers
     * @return Total resolver count
     */
    function getTotalResolvers() external view returns (uint256) {
        return totalResolvers;
    }

    /**
     * @dev Get resolver list (for enumeration)
     * @return Array of all resolver addresses
     */
    function getAllResolvers() external view returns (address[] memory) {
        return resolverList;
    }

    /**
     * @dev Check if main resolver is set and active
     * @return True if main resolver is available
     */
    function isMainResolverAvailable() external view returns (bool) {
        return mainResolver != address(0) && resolvers[mainResolver].isActive;
    }

    /**
     * @dev Get system health metrics for hackathon demo
     * @return totalResolversCount Total registered resolvers
     * @return activeResolversCount Active resolvers
     * @return mainResolverSet Whether main resolver is configured
     * @return totalOrdersProcessed Total orders across all resolvers
     */
    function getSystemMetrics()
        external
        view
        returns (
            uint256 totalResolversCount,
            uint256 activeResolversCount,
            bool mainResolverSet,
            uint256 totalOrdersProcessed
        )
    {
        totalResolversCount = totalResolvers;
        mainResolverSet = (mainResolver != address(0) && resolvers[mainResolver].isActive);

        uint256 activeCount = 0;
        uint256 totalOrders = 0;

        for (uint256 i = 0; i < resolverList.length; i++) {
            if (resolvers[resolverList[i]].isActive) {
                activeCount++;
            }
            totalOrders += resolvers[resolverList[i]].totalOrders;
        }

        activeResolversCount = activeCount;
        totalOrdersProcessed = totalOrders;
    }
}
