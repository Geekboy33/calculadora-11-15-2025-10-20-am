// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                              ║
 * ║    ██╗██╗     ██╗   ██╗███████╗██████╗      ██████╗ ███████╗███████╗██╗ ██████╗██╗ █████╗ ██╗     ║
 * ║    ██║██║     ██║   ██║██╔════╝██╔══██╗    ██╔═══██╗██╔════╝██╔════╝██║██╔════╝██║██╔══██╗██║     ║
 * ║    ██║██║     ██║   ██║███████╗██║  ██║    ██║   ██║█████╗  █████╗  ██║██║     ██║███████║██║     ║
 * ║    ██║██║     ██║   ██║╚════██║██║  ██║    ██║   ██║██╔══╝  ██╔══╝  ██║██║     ██║██╔══██║██║     ║
 * ║    ██║███████╗╚██████╔╝███████║██████╔╝    ╚██████╔╝██║     ██║     ██║╚██████╗██║██║  ██║███████╗║
 * ║    ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚═════╝      ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  ILUSD - Interface for Official LUSD Contract on LemonChain                  ║
 * ║  Official Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Network: LemonChain Mainnet                                                 ║
 * ║  Chain ID: 1005                                                              ║
 * ║  Symbol: LUSD                                                                ║
 * ║  Decimals: 6                                                                 ║
 * ║  Price: $1.00 USD (Pegged)                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * @title ILUSD - Official LUSD Interface
 * @author DCB Treasury Team
 * @notice Interface to interact with the official LUSD contract
 * @dev This interface defines all functions available on the deployed LUSD contract
 * @custom:address 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99
 * @custom:network LemonChain
 * @custom:version 1.0.0
 */
interface ILUSD {
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                           ERC-20 STANDARD EVENTS                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Emitted when tokens are transferred
    /// @param from Source address (address(0) for minting)
    /// @param to Destination address (address(0) for burning)
    /// @param value Amount of tokens transferred
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /// @notice Emitted when allowance is set
    /// @param owner Token owner
    /// @param spender Approved spender
    /// @param value Approved amount
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        ERC-20 STANDARD FUNCTIONS                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Returns the name of the token
    /// @return Token name (e.g., "Lemon USD")
    function name() external view returns (string memory);
    
    /// @notice Returns the symbol of the token
    /// @return Token symbol (e.g., "LUSD")
    function symbol() external view returns (string memory);
    
    /// @notice Returns the number of decimals
    /// @return Number of decimals (6 for LUSD)
    function decimals() external view returns (uint8);
    
    /// @notice Returns the total token supply
    /// @return Total supply in smallest units
    function totalSupply() external view returns (uint256);
    
    /// @notice Returns the balance of an account
    /// @param account Address to query
    /// @return Balance in smallest units
    function balanceOf(address account) external view returns (uint256);
    
    /// @notice Transfers tokens to a recipient
    /// @param to Recipient address
    /// @param amount Amount to transfer
    /// @return success True if transfer succeeded
    function transfer(address to, uint256 amount) external returns (bool success);
    
    /// @notice Returns the allowance for a spender
    /// @param owner Token owner
    /// @param spender Approved spender
    /// @return Remaining allowance
    function allowance(address owner, address spender) external view returns (uint256);
    
    /// @notice Approves a spender to use tokens
    /// @param spender Address to approve
    /// @param amount Amount to approve
    /// @return success True if approval succeeded
    function approve(address spender, uint256 amount) external returns (bool success);
    
    /// @notice Transfers tokens from one address to another
    /// @param from Source address
    /// @param to Destination address
    /// @param amount Amount to transfer
    /// @return success True if transfer succeeded
    function transferFrom(address from, address to, uint256 amount) external returns (bool success);
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         MINTING & BURNING                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Mints new tokens (requires MINTER_ROLE)
    /// @param to Recipient address
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external;
    
    /// @notice Burns tokens from caller
    /// @param amount Amount to burn
    function burn(uint256 amount) external;
    
    /// @notice Burns tokens from an address (requires allowance)
    /// @param from Address to burn from
    /// @param amount Amount to burn
    function burnFrom(address from, uint256 amount) external;
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    LUSD CONTRACT CONSTANTS                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Use these constants when interacting with LUSD                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
library LUSDConstants {
    /// @notice Official LUSD contract address on LemonChain
    address public constant LUSD_ADDRESS = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LUSD decimals
    uint8 public constant DECIMALS = 6;
    
    /// @notice 1 LUSD in smallest units (1e6)
    uint256 public constant ONE_LUSD = 1_000_000;
    
    /// @notice LUSD price in USD (with 8 decimals for oracle compatibility)
    int256 public constant LUSD_PRICE_USD = 1_00000000; // $1.00
    
    /// @notice LemonChain Chain ID
    uint256 public constant CHAIN_ID = 1005;
}
