// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {ResolverRegistry} from "../src/ResolverRegistry.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract ResolverRegistryTest is Test {
    ResolverRegistry public resolverRegistry;
    address public owner;
    address public user1;
    address public user2;
    address public resolver1;
    address public resolver2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        resolver1 = makeAddr("resolver1");
        resolver2 = makeAddr("resolver2");

        resolverRegistry = new ResolverRegistry();
    }

    //////////////////////////////////////////////
    //               Constructor Tests          //
    //////////////////////////////////////////////

    function test_Constructor_SetsOwnerCorrectly() public view {
        assertEq(resolverRegistry.owner(), owner);
    }

    function test_Constructor_InitialResolverStateFalse() public view {
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertFalse(resolverRegistry.isResolver(resolver2));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    //////////////////////////////////////////////
    //               addResolver Tests          //
    //////////////////////////////////////////////

    function test_AddResolver_Success() public {
        // Add resolver1
        resolverRegistry.addResolver(resolver1);

        // Verify resolver1 is now valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.s_resolvers(resolver1));
    }

    function test_AddResolver_MultipleResolvers() public {
        // Add multiple resolvers
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.addResolver(resolver2);

        // Verify both are valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));
    }

    function test_AddResolver_ZeroAddress() public {
        // Should be able to add zero address (contract doesn't explicitly prevent it)
        resolverRegistry.addResolver(address(0));
        assertTrue(resolverRegistry.isResolver(address(0)));
    }

    function test_AddResolver_SameResolverTwice() public {
        // Add same resolver twice
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.addResolver(resolver1);

        // Should still be valid
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_AddResolver_OnlyOwner() public {
        // Try to add resolver as non-owner
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.addResolver(resolver1);

        // Verify resolver was not added
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    //////////////////////////////////////////////
    //             removeResolver Tests         //
    //////////////////////////////////////////////

    function test_RemoveResolver_Success() public {
        // Add resolver first
        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.isResolver(resolver1));

        // Remove resolver
        resolverRegistry.removeResolver(resolver1);

        // Verify resolver is no longer valid
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertFalse(resolverRegistry.s_resolvers(resolver1));
    }

    function test_RemoveResolver_NonExistentResolver() public {
        // Try to remove a resolver that was never added
        resolverRegistry.removeResolver(resolver1);

        // Should not cause any issues
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    function test_RemoveResolver_ZeroAddress() public {
        // Add and then remove zero address
        resolverRegistry.addResolver(address(0));
        assertTrue(resolverRegistry.isResolver(address(0)));

        resolverRegistry.removeResolver(address(0));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    function test_RemoveResolver_OnlyOwner() public {
        // Add resolver as owner
        resolverRegistry.addResolver(resolver1);

        // Try to remove resolver as non-owner
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.removeResolver(resolver1);

        // Verify resolver is still valid
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_RemoveResolver_MultipleTimes() public {
        // Add resolver
        resolverRegistry.addResolver(resolver1);

        // Remove multiple times
        resolverRegistry.removeResolver(resolver1);
        resolverRegistry.removeResolver(resolver1);

        // Should still be false
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    //////////////////////////////////////////////
    //               isResolver Tests           //
    //////////////////////////////////////////////

    function test_IsResolver_DefaultFalse() public view {
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertFalse(resolverRegistry.isResolver(resolver2));
        assertFalse(resolverRegistry.isResolver(user1));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    function test_IsResolver_AfterAddition() public {
        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.isResolver(resolver1));

        // Other addresses should still be false
        assertFalse(resolverRegistry.isResolver(resolver2));
    }

    function test_IsResolver_AfterRemoval() public {
        // Add then remove
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.removeResolver(resolver1);

        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    function test_IsResolver_PublicMapping() public {
        // Test direct access to s_resolvers mapping
        assertFalse(resolverRegistry.s_resolvers(resolver1));

        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.s_resolvers(resolver1));

        resolverRegistry.removeResolver(resolver1);
        assertFalse(resolverRegistry.s_resolvers(resolver1));
    }

    //////////////////////////////////////////////
    //            Ownership Tests               //
    //////////////////////////////////////////////

    function test_Ownership_TransferOwnership() public {
        // Transfer ownership to user1
        resolverRegistry.transferOwnership(user1);

        // user1 should now be able to add resolvers
        vm.prank(user1);
        resolverRegistry.addResolver(resolver1);

        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_Ownership_RenounceOwnership() public {
        // Renounce ownership
        resolverRegistry.renounceOwnership();

        // No one should be able to add resolvers now
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        resolverRegistry.addResolver(resolver1);
    }

    function test_Ownership_OnlyOwnerCanTransfer() public {
        // Non-owner tries to transfer ownership
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.transferOwnership(user2);
    }

    //////////////////////////////////////////////
    //            Integration Tests             //
    //////////////////////////////////////////////

    function test_Integration_CompleteWorkflow() public {
        // Add multiple resolvers
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.addResolver(resolver2);

        // Verify both are valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));

        // Remove one resolver
        resolverRegistry.removeResolver(resolver1);

        // Verify states
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));

        // Re-add the removed resolver
        resolverRegistry.addResolver(resolver1);

        // Both should be valid again
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));
    }

    function test_Integration_OwnershipAndResolverManagement() public {
        // Add resolver as original owner
        resolverRegistry.addResolver(resolver1);

        // Transfer ownership
        resolverRegistry.transferOwnership(user1);

        // New owner adds another resolver
        vm.prank(user1);
        resolverRegistry.addResolver(resolver2);

        // Both resolvers should be valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));

        // Original owner can no longer add resolvers
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        resolverRegistry.addResolver(makeAddr("resolver3"));
    }

    //////////////////////////////////////////////
    //              Fuzz Tests                  //
    //////////////////////////////////////////////

    function testFuzz_AddAndRemoveResolver(address resolver) public {
        // Skip if resolver is the contract itself to avoid potential issues
        vm.assume(resolver != address(resolverRegistry));

        // Initially should be false
        assertFalse(resolverRegistry.isResolver(resolver));

        // Add resolver
        resolverRegistry.addResolver(resolver);
        assertTrue(resolverRegistry.isResolver(resolver));

        // Remove resolver
        resolverRegistry.removeResolver(resolver);
        assertFalse(resolverRegistry.isResolver(resolver));
    }

    function testFuzz_OnlyOwnerCanModify(address nonOwner, address resolver) public {
        vm.assume(nonOwner != owner && nonOwner != address(0));
        vm.assume(resolver != address(0));

        // Non-owner cannot add resolver
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        resolverRegistry.addResolver(resolver);

        // Non-owner cannot remove resolver
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        resolverRegistry.removeResolver(resolver);

        // Resolver should still be false
        assertFalse(resolverRegistry.isResolver(resolver));
    }

    //////////////////////////////////////////////
    //              Event Tests                 //
    //////////////////////////////////////////////

    // Note: The current ResolverRegistry contract doesn't emit events,
    // but if events were added, they would be tested here

    //////////////////////////////////////////////
    //              Gas Tests                   //
    //////////////////////////////////////////////

    function test_Gas_AddResolver() public {
        uint256 gasBefore = gasleft();
        resolverRegistry.addResolver(resolver1);
        uint256 gasUsed = gasBefore - gasleft();

        // Log gas usage for reference
        console.log("Gas used for addResolver:", gasUsed);

        // Verify the operation succeeded
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_Gas_RemoveResolver() public {
        // Setup: add resolver first
        resolverRegistry.addResolver(resolver1);

        uint256 gasBefore = gasleft();
        resolverRegistry.removeResolver(resolver1);
        uint256 gasUsed = gasBefore - gasleft();

        // Log gas usage for reference
        console.log("Gas used for removeResolver:", gasUsed);

        // Verify the operation succeeded
        assertFalse(resolverRegistry.isResolver(resolver1));
    }
}
