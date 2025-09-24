// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IMakerRegistry {
    /**
     * @notice Register a maker
     * @param _identityProof The identity proof or UPI address of the maker
     * @param _maker The maker address
     * @param _isForiegner Whether the maker is a foreigner or not
     */
    function registerMaker(string memory _identityProof, address _maker, bool _isForiegner) external;

    /**
     * @notice Edit a maker's proof or deregister
     * @param _maker The address of the maker
     * @param _newProof The new proof or empty string to deregister
     */
    function editMaker(address _maker, string memory _newProof) external;

    /**
     * @notice Get a maker's proof and foreigner status
     * @param _maker The address of the maker
     * @return proof The proof string
     * @return isForiegner Whether the maker is a foreigner
     */
    function getProof(address _maker) external view returns (string memory proof, bool isForiegner);

    /**
     * @notice Check if an address is a registered maker
     * @param _maker The address to check
     * @return isRegistered Whether the address is registered
     */
    function isMaker(address _maker) external view returns (bool isRegistered);
}
