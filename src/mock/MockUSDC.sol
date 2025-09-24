// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes
 * Mints a huge initial supply to the deployer
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("Mock USD Coin", "USDC") Ownable(msg.sender) {
        _decimals = 6; // USDC has 6 decimals

        // Mint 1 billion USDC to the deployer (1,000,000,000 * 10^6)
        uint256 initialSupply = 1_000_000_000 * 10 ** _decimals;
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * USDC uses 6 decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint additional tokens to any address (only owner)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from any address (only owner)
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /**
     * @dev Allows anyone to mint tokens to themselves for testing purposes
     * @param amount The amount of tokens to mint
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
