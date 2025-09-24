// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IResolverRegistry {
    /**
     * @notice Add a resolver address
     * @param resolver The address of the resolver to be added
     */
    function addResolver(address resolver) external;

    /**
     * @notice Remove a resolver address
     * @param resolver The address of the resolver to be removed
     */
    function removeResolver(address resolver) external;

    /**
     * @notice Check if an address is a valid resolver
     * @param resolver The address of the resolver to be checked
     * @return bool Whether the resolver is valid
     */
    function isResolver(address resolver) external view returns (bool);
}
