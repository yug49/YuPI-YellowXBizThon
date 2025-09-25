// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import "../src/YellowOrderProtocol.sol";
import "../src/YellowResolverRegistry.sol";

/**
 * @title YellowNetworkTest
 * @dev Foundry test suite for Yellow Network optimized contracts
 *
 * Tests cover:
 * - Contract deployment and initialization
 * - Order lifecycle (Create → Activate → Settle)
 * - Resolver management and authorization
 * - Error handling and edge cases
 * - Gas optimization verification
 * - Integration scenarios
 */
contract YellowNetworkTest is Test {
    // Contract instances
    YellowOrderProtocol public orderProtocol;
    YellowResolverRegistry public resolverRegistry;

    // Test accounts
    address public owner;
    address public relayer;
    address public resolver;
    address public maker;
    address public otherAccount;

    // Test constants
    bytes32 public constant TEST_ORDER_ID = keccak256("test_order_1");
    address public constant TEST_TOKEN_ADDRESS = 0x1234567890123456789012345678901234567890;
    uint256 public constant TEST_AMOUNT = 100 ether; // 100 tokens
    uint256 public constant TEST_UPI_AMOUNT = 750000; // ₹7500 in paise
    string public constant TEST_SESSION_ID = "yellow_session_test_123456789";
    string public constant TEST_ENDPOINT = "http://localhost:3001";

    // Events for testing
    event OrderCreated(bytes32 indexed orderId, address indexed maker, uint256 amount);
    event OrderActivated(bytes32 indexed orderId, string yellowSessionId);
    event OrderSettled(bytes32 indexed orderId, uint256 settlementTime);
    event OrderCancelled(bytes32 indexed orderId, string reason);
    event ResolverRegistered(address indexed resolver, string endpoint);
    event MainResolverSet(address indexed resolver);

    function setUp() public {
        // Set up test accounts
        owner = address(this);
        relayer = makeAddr("relayer");
        resolver = makeAddr("resolver");
        maker = makeAddr("maker");
        otherAccount = makeAddr("other");

        // Deploy contracts
        resolverRegistry = new YellowResolverRegistry(resolver);
        orderProtocol = new YellowOrderProtocol(relayer);

        // Initial setup - register the main resolver properly
        resolverRegistry.registerResolver(resolver, TEST_ENDPOINT);
        orderProtocol.addResolver(resolver);

        console.log("Test Setup Complete:");
        console.log("   OrderProtocol:", address(orderProtocol));
        console.log("   ResolverRegistry:", address(resolverRegistry));
        console.log("   Main Resolver:", resolver);
        console.log("   Relayer:", relayer);
    }

    // =====================================
    // YellowResolverRegistry Tests
    // =====================================

    function test_ResolverRegistry_Deployment() public view {
        address mainResolver = resolverRegistry.getMainResolver();
        assertEq(mainResolver, resolver, "Main resolver should be set correctly");

        assertTrue(resolverRegistry.isAuthorizedResolver(resolver), "Main resolver should be authorized");
    }

    function test_ResolverRegistry_RegisterResolver() public {
        vm.expectEmit(true, false, false, true);
        emit ResolverRegistered(otherAccount, TEST_ENDPOINT);

        resolverRegistry.registerResolver(otherAccount, TEST_ENDPOINT);

        YellowResolverRegistry.Resolver memory resolverData = resolverRegistry.getResolver(otherAccount);
        assertEq(resolverData.resolverAddress, otherAccount, "Resolver address should match");
        assertEq(resolverData.endpoint, TEST_ENDPOINT, "Endpoint should match");
        assertTrue(resolverData.isActive, "Resolver should be active");
        assertEq(resolverData.totalOrders, 0, "Initial orders should be zero");
    }

    function test_ResolverRegistry_RegisterResolverUnauthorized() public {
        vm.prank(otherAccount);
        vm.expectRevert(); // Should revert due to Ownable access control
        resolverRegistry.registerResolver(resolver, TEST_ENDPOINT);
    }

    function test_ResolverRegistry_SetMainResolver() public {
        // Register new resolver first
        resolverRegistry.registerResolver(otherAccount, TEST_ENDPOINT);

        vm.expectEmit(true, false, false, false);
        emit MainResolverSet(otherAccount);

        resolverRegistry.setMainResolver(otherAccount);

        address mainResolver = resolverRegistry.getMainResolver();
        assertEq(mainResolver, otherAccount, "Main resolver should be updated");
    }

    function test_ResolverRegistry_SystemMetrics() public view {
        (uint256 totalResolvers, uint256 activeResolvers, bool mainResolverSet, uint256 totalOrders) =
            resolverRegistry.getSystemMetrics();

        assertEq(totalResolvers, 1, "Should have 1 registered resolver");
        assertEq(activeResolvers, 1, "Should have 1 active resolver");
        assertTrue(mainResolverSet, "Main resolver should be set");
        assertEq(totalOrders, 0, "Should have 0 processed orders initially");
    }

    function test_ResolverRegistry_RecordOrderCompletion() public {
        resolverRegistry.recordOrderCompletion(resolver, true);

        YellowResolverRegistry.Resolver memory resolverData = resolverRegistry.getResolver(resolver);
        assertEq(resolverData.totalOrders, 1, "Total orders should increment");
        assertEq(resolverData.successfulOrders, 1, "Successful orders should increment");

        // Test failed order
        resolverRegistry.recordOrderCompletion(resolver, false);
        resolverData = resolverRegistry.getResolver(resolver);
        assertEq(resolverData.totalOrders, 2, "Total orders should be 2");
        assertEq(resolverData.successfulOrders, 1, "Successful orders should remain 1");
    }

    // =====================================
    // YellowOrderProtocol Tests
    // =====================================

    function test_OrderProtocol_Deployment() public view {
        address yellowRelayer = orderProtocol.yellowRelayer();
        assertEq(yellowRelayer, relayer, "Yellow relayer should be set correctly");

        assertTrue(orderProtocol.isAuthorizedResolver(resolver), "Resolver should be authorized");
    }

    function test_OrderProtocol_CreateOrder() public {
        vm.prank(maker);
        vm.expectEmit(true, true, false, true);
        emit OrderCreated(TEST_ORDER_ID, maker, TEST_AMOUNT);

        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        YellowOrderProtocol.Order memory order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(order.maker, maker, "Maker should match");
        assertEq(order.token, TEST_TOKEN_ADDRESS, "Token should match");
        assertEq(order.amount, TEST_AMOUNT, "Amount should match");
        assertEq(order.upiAmount, TEST_UPI_AMOUNT, "UPI amount should match");
        assertEq(uint256(order.status), 0, "Status should be Created");
        assertGt(order.createdAt, 0, "CreatedAt should be set");
    }

    function test_OrderProtocol_CreateOrderValidation() public {
        vm.prank(maker);

        // Test zero amount
        vm.expectRevert("Amount must be positive");
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, 0, TEST_UPI_AMOUNT);

        // Test zero UPI amount
        vm.expectRevert("UPI amount must be positive");
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, 0);

        // Test zero address token
        vm.expectRevert("Invalid token address");
        orderProtocol.createOrder(TEST_ORDER_ID, address(0), TEST_AMOUNT, TEST_UPI_AMOUNT);
    }

    function test_OrderProtocol_CreateOrderDuplicate() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        vm.prank(maker);
        vm.expectRevert("Order already exists");
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);
    }

    function test_OrderProtocol_ActivateOrder() public {
        // Create order first
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        // Activate order
        vm.prank(relayer);
        vm.expectEmit(true, false, false, true);
        emit OrderActivated(TEST_ORDER_ID, TEST_SESSION_ID);

        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);

        YellowOrderProtocol.Order memory order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(order.resolver, resolver, "Resolver should be set");
        assertEq(order.yellowSessionId, TEST_SESSION_ID, "Session ID should be set");
        assertEq(uint256(order.status), 1, "Status should be Active");
    }

    function test_OrderProtocol_ActivateOrderUnauthorized() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        vm.prank(otherAccount);
        vm.expectRevert("Not Yellow relayer");
        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);
    }

    function test_OrderProtocol_ActivateOrderUnauthorizedResolver() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        vm.prank(relayer);
        vm.expectRevert("Resolver not authorized");
        orderProtocol.activateOrder(TEST_ORDER_ID, otherAccount, TEST_SESSION_ID);
    }

    function test_OrderProtocol_SettleOrder() public {
        // Create and activate order
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        vm.prank(relayer);
        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);

        // Advance time to simulate settlement delay
        vm.warp(block.timestamp + 5); // Add 5 seconds

        // Settle order
        vm.prank(relayer);
        orderProtocol.settleOrder(TEST_ORDER_ID);

        YellowOrderProtocol.Order memory order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(uint256(order.status), 2, "Status should be Settled");
        assertGt(order.settledAt, 0, "SettledAt should be set");

        uint256 settlementTime = orderProtocol.getSettlementTime(TEST_ORDER_ID);
        assertGt(settlementTime, 0, "Settlement time should be positive");
        assertEq(settlementTime, 5, "Settlement time should be 5 seconds");
    }

    function test_OrderProtocol_SettleOrderInvalidState() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        vm.prank(relayer);
        vm.expectRevert("Order not active");
        orderProtocol.settleOrder(TEST_ORDER_ID);
    }

    function test_OrderProtocol_CancelOrder() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        string memory reason = "User requested cancellation";
        vm.prank(maker);
        vm.expectEmit(true, false, false, true);
        emit OrderCancelled(TEST_ORDER_ID, reason);

        orderProtocol.cancelOrder(TEST_ORDER_ID, reason);

        YellowOrderProtocol.Order memory order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(uint256(order.status), 3, "Status should be Cancelled");
    }

    function test_OrderProtocol_CancelOrderByRelayer() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        string memory reason = "System cancellation";
        vm.prank(relayer);
        orderProtocol.cancelOrder(TEST_ORDER_ID, reason);

        YellowOrderProtocol.Order memory order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(uint256(order.status), 3, "Status should be Cancelled");
    }

    function test_OrderProtocol_ResolverManagement() public {
        assertFalse(orderProtocol.isAuthorizedResolver(otherAccount), "Should not be authorized initially");

        orderProtocol.addResolver(otherAccount);
        assertTrue(orderProtocol.isAuthorizedResolver(otherAccount), "Should be authorized after adding");

        orderProtocol.removeResolver(otherAccount);
        assertFalse(orderProtocol.isAuthorizedResolver(otherAccount), "Should not be authorized after removal");
    }

    // =====================================
    // Integration Tests
    // =====================================

    function test_Integration_FullOrderFlow() public {
        console.log("Testing complete order flow...");

        // 1. Create order
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        YellowOrderProtocol.Order memory order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(uint256(order.status), 0, "Status should be Created");
        console.log("   Order created");

        // 2. Activate with Yellow session
        vm.prank(relayer);
        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);

        order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(uint256(order.status), 1, "Status should be Active");
        assertEq(order.yellowSessionId, TEST_SESSION_ID, "Session ID should match");
        console.log("   Order activated with Yellow session");

        // 3. Advance time and settle order
        vm.warp(block.timestamp + 3); // Add 3 seconds to simulate Yellow Network speed
        vm.prank(relayer);
        orderProtocol.settleOrder(TEST_ORDER_ID);

        order = orderProtocol.getOrder(TEST_ORDER_ID);
        assertEq(uint256(order.status), 2, "Status should be Settled");
        console.log("   Order settled");

        // 4. Verify settlement time
        uint256 settlementTime = orderProtocol.getSettlementTime(TEST_ORDER_ID);
        assertGt(settlementTime, 0, "Settlement time should be positive");
        console.log("   Settlement time:", settlementTime, "seconds");

        console.log("Full order flow completed successfully!");
    }

    function test_Integration_MultipleOrders() public {
        console.log("Testing multiple orders...");

        uint256 numOrders = 5;
        bytes32[] memory orderIds = new bytes32[](numOrders);

        // Create multiple orders
        for (uint256 i = 0; i < numOrders; i++) {
            orderIds[i] = keccak256(abi.encodePacked("test_order_", i));

            vm.prank(maker);
            orderProtocol.createOrder(orderIds[i], TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);
        }
        console.log("   Created", numOrders, "orders");

        // Activate all orders
        for (uint256 i = 0; i < numOrders; i++) {
            string memory sessionId = string(abi.encodePacked(TEST_SESSION_ID, "_", vm.toString(i)));

            vm.prank(relayer);
            orderProtocol.activateOrder(orderIds[i], resolver, sessionId);
        }
        console.log("   Activated all orders");

        // Settle all orders
        for (uint256 i = 0; i < numOrders; i++) {
            vm.prank(relayer);
            orderProtocol.settleOrder(orderIds[i]);

            YellowOrderProtocol.Order memory order = orderProtocol.getOrder(orderIds[i]);
            assertEq(uint256(order.status), 2, "Order should be settled");
        }
        console.log("   Settled all orders");

        console.log("Multiple orders test completed!");
    }

    function test_Integration_GasOptimization() public {
        console.log("Testing gas optimization...");

        // Measure gas for order creation
        uint256 gasBefore = gasleft();
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);
        uint256 createGas = gasBefore - gasleft();

        // Measure gas for order activation
        gasBefore = gasleft();
        vm.prank(relayer);
        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);
        uint256 activateGas = gasBefore - gasleft();

        // Measure gas for order settlement
        gasBefore = gasleft();
        vm.prank(relayer);
        orderProtocol.settleOrder(TEST_ORDER_ID);
        uint256 settleGas = gasBefore - gasleft();

        uint256 totalGas = createGas + activateGas + settleGas;

        console.log("   Gas Usage Breakdown:");
        console.log("     Create:", createGas);
        console.log("     Activate:", activateGas);
        console.log("     Settle:", settleGas);
        console.log("     Total:", totalGas);

        // Verify gas optimization - should be well under 500k gas total
        assertLt(totalGas, 500000, "Total gas should be optimized (< 500k)");
        assertLt(createGas, 200000, "Create gas should be optimized (< 200k)");
        assertLt(activateGas, 150000, "Activate gas should be optimized (< 150k)");
        assertLt(settleGas, 100000, "Settle gas should be optimized (< 100k)");

        console.log("   Gas optimization verified!");
    }

    // =====================================
    // Error Handling Tests
    // =====================================

    function test_ErrorHandling_NonExistentOrder() public {
        bytes32 nonExistentOrderId = keccak256("non_existent_order");

        vm.expectRevert("Order does not exist");
        orderProtocol.getOrder(nonExistentOrderId);

        vm.expectRevert("Order does not exist");
        orderProtocol.getOrderStatus(nonExistentOrderId);
    }

    function test_ErrorHandling_InvalidStateTransitions() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        // Cannot settle order that's not active
        vm.prank(relayer);
        vm.expectRevert("Order not active");
        orderProtocol.settleOrder(TEST_ORDER_ID);

        // Cannot activate order with invalid status after cancellation
        vm.prank(maker);
        orderProtocol.cancelOrder(TEST_ORDER_ID, "Test cancellation");

        vm.prank(relayer);
        vm.expectRevert("Invalid order status");
        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);
    }

    function test_ErrorHandling_UnauthorizedAccess() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        // Only maker or relayer can cancel
        vm.prank(otherAccount);
        vm.expectRevert("Not authorized to cancel");
        orderProtocol.cancelOrder(TEST_ORDER_ID, "Unauthorized cancellation");

        // Only owner can add/remove resolvers
        vm.prank(otherAccount);
        vm.expectRevert(); // Should revert due to Ownable
        orderProtocol.addResolver(otherAccount);
    }

    // =====================================
    // Utility Functions
    // =====================================

    function test_Utility_OrderStatusTracking() public {
        vm.prank(maker);
        orderProtocol.createOrder(TEST_ORDER_ID, TEST_TOKEN_ADDRESS, TEST_AMOUNT, TEST_UPI_AMOUNT);

        assertEq(uint256(orderProtocol.getOrderStatus(TEST_ORDER_ID)), 0, "Should be Created");

        vm.prank(relayer);
        orderProtocol.activateOrder(TEST_ORDER_ID, resolver, TEST_SESSION_ID);
        assertEq(uint256(orderProtocol.getOrderStatus(TEST_ORDER_ID)), 1, "Should be Active");

        vm.prank(relayer);
        orderProtocol.settleOrder(TEST_ORDER_ID);
        assertEq(uint256(orderProtocol.getOrderStatus(TEST_ORDER_ID)), 2, "Should be Settled");
    }

    function test_Utility_ResolverMetrics() public {
        // Test resolver performance tracking
        (uint256 totalOrders, uint256 successfulOrders, uint256 successRate) =
            resolverRegistry.getResolverMetrics(resolver);

        assertEq(totalOrders, 0, "Initial total should be 0");
        assertEq(successfulOrders, 0, "Initial successful should be 0");
        assertEq(successRate, 0, "Initial success rate should be 0");

        // Record some completions
        resolverRegistry.recordOrderCompletion(resolver, true);
        resolverRegistry.recordOrderCompletion(resolver, true);
        resolverRegistry.recordOrderCompletion(resolver, false);

        (totalOrders, successfulOrders, successRate) = resolverRegistry.getResolverMetrics(resolver);
        assertEq(totalOrders, 3, "Total should be 3");
        assertEq(successfulOrders, 2, "Successful should be 2");
        assertEq(successRate, 66, "Success rate should be 66%");
    }

    // Test helper functions
    receive() external payable {}
}
