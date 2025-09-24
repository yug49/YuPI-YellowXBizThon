// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {MakerRegistry} from "../src/MakerRegistry.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract MakerRegistryTest is Test {
    MakerRegistry public makerRegistry;
    address public owner;
    address public user1;
    address public user2;
    address public maker1;
    address public maker2;
    address public foreignMaker;
    address public domesticMaker;

    string public constant UPI_ADDRESS = "user@paytm";
    string public constant IDENTITY_PROOF = "passport123456";
    string public constant NEW_UPI = "newuser@gpay";
    string public constant NEW_PROOF = "newpassport789";

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        maker1 = makeAddr("maker1");
        maker2 = makeAddr("maker2");
        foreignMaker = makeAddr("foreignMaker");
        domesticMaker = makeAddr("domesticMaker");

        makerRegistry = new MakerRegistry();
    }

    //////////////////////////////////////////////
    //               Constructor Tests          //
    //////////////////////////////////////////////

    function test_Constructor_SetsOwnerCorrectly() public view {
        assertEq(makerRegistry.owner(), owner);
    }

    function test_Constructor_InitialState() public view {
        // All makers should be unregistered initially
        assertFalse(makerRegistry.isMaker(maker1));
        assertFalse(makerRegistry.isMaker(maker2));
        assertFalse(makerRegistry.s_isRegistered(maker1));
        assertFalse(makerRegistry.s_isForiegner(maker1));
        assertEq(makerRegistry.s_upiAddress(maker1), "");
        assertEq(makerRegistry.s_proof(maker1), "");
    }

    //////////////////////////////////////////////
    //             registerMaker Tests          //
    //////////////////////////////////////////////

    function test_RegisterMaker_DomesticMaker_Success() public {
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        // The contract is now fixed - s_isRegistered should be set to true
        assertTrue(makerRegistry.isMaker(domesticMaker)); // Fixed: now returns true
        assertTrue(makerRegistry.s_isRegistered(domesticMaker)); // Fixed: now returns true
        assertFalse(makerRegistry.s_isForiegner(domesticMaker));
        assertEq(makerRegistry.s_upiAddress(domesticMaker), UPI_ADDRESS);
        assertEq(makerRegistry.s_proof(domesticMaker), "");
    }

    function test_RegisterMaker_ForeignMaker_Success() public {
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        // The contract is now fixed - s_isRegistered should be set to true
        assertTrue(makerRegistry.isMaker(foreignMaker)); // Fixed: now returns true
        assertTrue(makerRegistry.s_isRegistered(foreignMaker)); // Fixed: now returns true
        assertTrue(makerRegistry.s_isForiegner(foreignMaker));
        assertEq(makerRegistry.s_proof(foreignMaker), IDENTITY_PROOF);
        assertEq(makerRegistry.s_upiAddress(foreignMaker), "");
    }

    function test_RegisterMaker_InvalidProof_EmptyString() public {
        vm.expectRevert(MakerRegistry.MakerRegistry__InvalidProof.selector);
        makerRegistry.registerMaker("", maker1, false);
    }

    function test_RegisterMaker_InvalidAddress_ZeroAddress() public {
        vm.expectRevert(MakerRegistry.MakerRegistry__InvalidAddress.selector);
        makerRegistry.registerMaker(UPI_ADDRESS, address(0), false);
    }

    function test_RegisterMaker_AlreadyRegistered_Domestic() public {
        // The contract is now fixed - AlreadyRegistered check works properly
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // This should now revert because s_isRegistered is properly set
        vm.expectRevert(MakerRegistry.MakerRegistry__AlreadyRegistered.selector);
        makerRegistry.registerMaker(NEW_UPI, maker1, false);
    }

    function test_RegisterMaker_AlreadyRegistered_Foreign() public {
        // The contract is now fixed - AlreadyRegistered check works properly
        makerRegistry.registerMaker(IDENTITY_PROOF, maker1, true);

        // This should now revert because s_isRegistered is properly set
        vm.expectRevert(MakerRegistry.MakerRegistry__AlreadyRegistered.selector);
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);
    }

    function test_RegisterMaker_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // Verify maker was not registered (would be false anyway due to bug)
        assertFalse(makerRegistry.isMaker(maker1));
    }

    function test_RegisterMaker_MultipleMakers() public {
        // Register domestic maker
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        // Register foreign maker
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        // Verify both registrations (storage is set correctly)
        assertFalse(makerRegistry.s_isForiegner(domesticMaker));
        assertTrue(makerRegistry.s_isForiegner(foreignMaker));
        assertEq(makerRegistry.s_upiAddress(domesticMaker), UPI_ADDRESS);
        assertEq(makerRegistry.s_proof(foreignMaker), IDENTITY_PROOF);
    }

    // Test what happens when we try to register an already "registered" maker
    function test_RegisterMaker_AlreadyRegistered_WithHelperRegistration() public {
        // Register maker normally (contract is now fixed)
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // Now the AlreadyRegistered check should work
        vm.expectRevert(MakerRegistry.MakerRegistry__AlreadyRegistered.selector);
        makerRegistry.registerMaker(NEW_UPI, maker1, false);
    }

    //////////////////////////////////////////////
    //               editMaker Tests            //
    //////////////////////////////////////////////

    function test_EditMaker_UpdateDomesticMaker() public {
        // Register domestic maker normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        // Edit the maker's UPI
        makerRegistry.editMaker(domesticMaker, NEW_UPI);

        // Verify update
        assertTrue(makerRegistry.isMaker(domesticMaker));
        assertEq(makerRegistry.s_upiAddress(domesticMaker), NEW_UPI);
        assertFalse(makerRegistry.s_isForiegner(domesticMaker));
    }

    function test_EditMaker_UpdateForeignMaker() public {
        // Register foreign maker normally
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        // Edit the maker's proof
        makerRegistry.editMaker(foreignMaker, NEW_PROOF);

        // Verify update
        assertTrue(makerRegistry.isMaker(foreignMaker));
        assertEq(makerRegistry.s_proof(foreignMaker), NEW_PROOF);
        assertTrue(makerRegistry.s_isForiegner(foreignMaker));
    }

    function test_EditMaker_DeregisterMaker_EmptyString() public {
        // Register maker normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        // Deregister by passing empty string
        makerRegistry.editMaker(domesticMaker, "");

        // Verify deregistration
        assertFalse(makerRegistry.isMaker(domesticMaker));
        assertFalse(makerRegistry.s_isRegistered(domesticMaker));
        assertFalse(makerRegistry.s_isForiegner(domesticMaker));
        assertEq(makerRegistry.s_upiAddress(domesticMaker), "");
        assertEq(makerRegistry.s_proof(domesticMaker), "");
    }

    function test_EditMaker_DeregisterForeignMaker() public {
        // Register foreign maker normally
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        // Deregister
        makerRegistry.editMaker(foreignMaker, "");

        // Verify deregistration
        assertFalse(makerRegistry.isMaker(foreignMaker));
        assertFalse(makerRegistry.s_isRegistered(foreignMaker));
        assertFalse(makerRegistry.s_isForiegner(foreignMaker));
        assertEq(makerRegistry.s_upiAddress(foreignMaker), "");
        assertEq(makerRegistry.s_proof(foreignMaker), "");
    }

    function test_EditMaker_InvalidAddress_ZeroAddress() public {
        vm.expectRevert(MakerRegistry.MakerRegistry__InvalidAddress.selector);
        makerRegistry.editMaker(address(0), NEW_UPI);
    }

    function test_EditMaker_MakerNotRegistered() public {
        vm.expectRevert(MakerRegistry.MakerRegistry__MakerNotRegisteredYet.selector);
        makerRegistry.editMaker(maker1, NEW_UPI);
    }

    function test_EditMaker_OnlyOwner() public {
        // Register maker first normally
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // Try to edit as non-owner
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        makerRegistry.editMaker(maker1, NEW_UPI);

        // Verify no changes
        assertEq(makerRegistry.s_upiAddress(maker1), UPI_ADDRESS);
    }

    //////////////////////////////////////////////
    //               getProof Tests             //
    //////////////////////////////////////////////

    function test_GetProof_DomesticMaker() public {
        // Register domestic maker normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        (string memory proof, bool isForeigner) = makerRegistry.getProof(domesticMaker);

        assertEq(proof, UPI_ADDRESS);
        assertFalse(isForeigner);
    }

    function test_GetProof_ForeignMaker() public {
        // Register foreign maker normally
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        (string memory proof, bool isForeigner) = makerRegistry.getProof(foreignMaker);

        assertEq(proof, IDENTITY_PROOF);
        assertTrue(isForeigner);
    }

    function test_GetProof_MakerNotRegistered() public {
        vm.expectRevert(MakerRegistry.MakerRegistry__MakerNotRegisteredYet.selector);
        makerRegistry.getProof(maker1);
    }

    function test_GetProof_AfterEdit() public {
        // Register and edit domestic maker normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);
        makerRegistry.editMaker(domesticMaker, NEW_UPI);

        (string memory proof, bool isForeigner) = makerRegistry.getProof(domesticMaker);

        assertEq(proof, NEW_UPI);
        assertFalse(isForeigner);
    }

    //////////////////////////////////////////////
    //                isMaker Tests             //
    //////////////////////////////////////////////

    function test_IsMaker_UnregisteredMaker() public view {
        assertFalse(makerRegistry.isMaker(maker1));
        assertFalse(makerRegistry.isMaker(maker2));
        assertFalse(makerRegistry.isMaker(address(0)));
    }

    function test_IsMaker_RegisteredMakers() public {
        // Register both types normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        assertTrue(makerRegistry.isMaker(domesticMaker));
        assertTrue(makerRegistry.isMaker(foreignMaker));
        assertFalse(makerRegistry.isMaker(maker1)); // unregistered
    }

    function test_IsMaker_AfterDeregistration() public {
        // Register then deregister normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);
        assertTrue(makerRegistry.isMaker(domesticMaker));

        makerRegistry.editMaker(domesticMaker, "");
        assertFalse(makerRegistry.isMaker(domesticMaker));
    }

    //////////////////////////////////////////////
    //            Ownership Tests               //
    //////////////////////////////////////////////

    function test_Ownership_TransferOwnership() public {
        // Transfer ownership to user1
        makerRegistry.transferOwnership(user1);

        // user1 should now be able to register makers
        vm.prank(user1);
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // Verify the registration data was stored (even though s_isRegistered won't be set due to bug)
        assertEq(makerRegistry.s_upiAddress(maker1), UPI_ADDRESS);
    }

    function test_Ownership_RenounceOwnership() public {
        // Renounce ownership
        makerRegistry.renounceOwnership();

        // No one should be able to register makers now
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);
    }

    //////////////////////////////////////////////
    //            Integration Tests             //
    //////////////////////////////////////////////

    function test_Integration_CompleteWorkflow() public {
        // Register domestic maker normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        // Register foreign maker normally
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);

        // Verify both registrations
        assertTrue(makerRegistry.isMaker(domesticMaker));
        assertTrue(makerRegistry.isMaker(foreignMaker));

        // Get proofs
        (string memory domesticProof, bool domesticIsForeign) = makerRegistry.getProof(domesticMaker);
        (string memory foreignProof, bool foreignIsForeign) = makerRegistry.getProof(foreignMaker);

        assertEq(domesticProof, UPI_ADDRESS);
        assertFalse(domesticIsForeign);
        assertEq(foreignProof, IDENTITY_PROOF);
        assertTrue(foreignIsForeign);

        // Edit domestic maker
        makerRegistry.editMaker(domesticMaker, NEW_UPI);
        (string memory updatedProof,) = makerRegistry.getProof(domesticMaker);
        assertEq(updatedProof, NEW_UPI);

        // Deregister foreign maker
        makerRegistry.editMaker(foreignMaker, "");
        assertFalse(makerRegistry.isMaker(foreignMaker));
    }

    function test_Integration_TypeSwitching_NotPossible() public {
        // Register as domestic maker normally
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);
        assertFalse(makerRegistry.s_isForiegner(maker1));

        // Try to switch to foreign type by editing - should not change type
        makerRegistry.editMaker(maker1, IDENTITY_PROOF);

        // Should still be domestic type with new proof in UPI field
        assertFalse(makerRegistry.s_isForiegner(maker1));
        assertEq(makerRegistry.s_upiAddress(maker1), IDENTITY_PROOF);
        assertEq(makerRegistry.s_proof(maker1), "");
    }

    function test_Integration_OwnershipTransferWithMakers() public {
        // Register makers as original owner normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        // Transfer ownership
        makerRegistry.transferOwnership(user1);

        // New owner can edit existing makers
        vm.prank(user1);
        makerRegistry.editMaker(domesticMaker, NEW_UPI);

        (string memory proof,) = makerRegistry.getProof(domesticMaker);
        assertEq(proof, NEW_UPI);

        // Original owner cannot edit
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        makerRegistry.editMaker(domesticMaker, UPI_ADDRESS);
    }

    //////////////////////////////////////////////
    //              Fuzz Tests                  //
    //////////////////////////////////////////////

    function testFuzz_RegisterMaker_ValidInputs(address maker, string memory proof, bool isForeigner) public {
        // Skip invalid inputs
        vm.assume(maker != address(0));
        vm.assume(bytes(proof).length > 0);
        vm.assume(bytes(proof).length < 1000); // reasonable length limit

        // Register maker
        makerRegistry.registerMaker(proof, maker, isForeigner);

        // Verify registration (note: s_isRegistered won't be set due to bug)
        assertEq(makerRegistry.s_isForiegner(maker), isForeigner);

        if (isForeigner) {
            assertEq(makerRegistry.s_proof(maker), proof);
            assertEq(makerRegistry.s_upiAddress(maker), "");
        } else {
            assertEq(makerRegistry.s_upiAddress(maker), proof);
            assertEq(makerRegistry.s_proof(maker), "");
        }
    }

    function testFuzz_EditMaker_ValidInputs(
        address maker,
        string memory initialProof,
        string memory newProof,
        bool isForeigner
    ) public {
        // Skip invalid inputs
        vm.assume(maker != address(0));
        vm.assume(bytes(initialProof).length > 0);
        vm.assume(bytes(initialProof).length < 1000);
        vm.assume(bytes(newProof).length < 1000);

        // Register maker first normally
        makerRegistry.registerMaker(initialProof, maker, isForeigner);

        // Edit maker
        makerRegistry.editMaker(maker, newProof);

        if (bytes(newProof).length == 0) {
            // Should be deregistered
            assertFalse(makerRegistry.isMaker(maker));
        } else {
            // Should be updated
            assertTrue(makerRegistry.isMaker(maker));
            (string memory proof,) = makerRegistry.getProof(maker);
            assertEq(proof, newProof);
        }
    }

    function testFuzz_OnlyOwnerCanModify(address nonOwner, address maker) public {
        vm.assume(nonOwner != owner && nonOwner != address(0));
        vm.assume(maker != address(0));

        // Non-owner cannot register maker
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        makerRegistry.registerMaker(UPI_ADDRESS, maker, false);

        // Register maker as owner first normally
        makerRegistry.registerMaker(UPI_ADDRESS, maker, false);

        // Non-owner cannot edit maker
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        makerRegistry.editMaker(maker, NEW_UPI);

        // Maker should still have original proof
        (string memory proof,) = makerRegistry.getProof(maker);
        assertEq(proof, UPI_ADDRESS);
    }

    //////////////////////////////////////////////
    //              Gas Tests                   //
    //////////////////////////////////////////////

    function test_Gas_RegisterDomesticMaker() public {
        uint256 gasBefore = gasleft();
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for registering domestic maker:", gasUsed);
        // Verify data was stored even though s_isRegistered bug exists
        assertEq(makerRegistry.s_upiAddress(domesticMaker), UPI_ADDRESS);
    }

    function test_Gas_RegisterForeignMaker() public {
        uint256 gasBefore = gasleft();
        makerRegistry.registerMaker(IDENTITY_PROOF, foreignMaker, true);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for registering foreign maker:", gasUsed);
        // Verify data was stored even though s_isRegistered bug exists
        assertEq(makerRegistry.s_proof(foreignMaker), IDENTITY_PROOF);
    }

    function test_Gas_EditMaker() public {
        // Setup normally
        makerRegistry.registerMaker(UPI_ADDRESS, domesticMaker, false);

        uint256 gasBefore = gasleft();
        makerRegistry.editMaker(domesticMaker, NEW_UPI);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for editing maker:", gasUsed);
        (string memory proof,) = makerRegistry.getProof(domesticMaker);
        assertEq(proof, NEW_UPI);
    }

    //////////////////////////////////////////////
    //            Edge Case Tests              //
    //////////////////////////////////////////////

    function test_EdgeCase_LongProofStrings() public {
        // Test with very long strings
        string memory longProof = "a";
        for (uint256 i = 0; i < 10; i++) {
            longProof = string.concat(longProof, longProof);
        }

        makerRegistry.registerMaker(longProof, maker1, false);
        (string memory retrievedProof,) = makerRegistry.getProof(maker1);
        assertEq(retrievedProof, longProof);
    }

    function test_EdgeCase_SpecialCharacters() public {
        string memory specialProof = "user@bank!@#$%^&*()_+-=[]{}|;:,.<>?";

        makerRegistry.registerMaker(specialProof, maker1, false);
        (string memory retrievedProof,) = makerRegistry.getProof(maker1);
        assertEq(retrievedProof, specialProof);
    }

    function test_EdgeCase_UnicodeCharacters() public {
        string memory unicodeProof = unicode"用户@银行";

        makerRegistry.registerMaker(unicodeProof, maker1, false);
        (string memory retrievedProof,) = makerRegistry.getProof(maker1);
        assertEq(retrievedProof, unicodeProof);
    }

    //////////////////////////////////////////////
    //            Bug Documentation Tests       //
    //////////////////////////////////////////////

    function test_BugDocumentation_RegisterMakerDoesNotSetIsRegistered() public {
        // This test previously documented a bug that has now been fixed
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // The bug has been fixed: s_isRegistered is now set to true
        assertTrue(makerRegistry.s_isRegistered(maker1)); // Fixed: now returns true
        assertTrue(makerRegistry.isMaker(maker1)); // Fixed: now returns true

        // And the data is still stored correctly
        assertEq(makerRegistry.s_upiAddress(maker1), UPI_ADDRESS);
        assertFalse(makerRegistry.s_isForiegner(maker1));
    }

    function test_BugDocumentation_CannotUseOtherFunctionsWithoutManualFix() public {
        // This test previously documented a bug that has now been fixed
        // Register a maker normally (bug is now fixed)
        makerRegistry.registerMaker(UPI_ADDRESS, maker1, false);

        // Can now get proof because s_isRegistered is properly set
        (string memory proof, bool isForeigner) = makerRegistry.getProof(maker1);
        assertEq(proof, UPI_ADDRESS);
        assertFalse(isForeigner);

        // Can now edit because s_isRegistered is properly set
        makerRegistry.editMaker(maker1, NEW_UPI);
        (string memory updatedProof,) = makerRegistry.getProof(maker1);
        assertEq(updatedProof, NEW_UPI);
    }
}
