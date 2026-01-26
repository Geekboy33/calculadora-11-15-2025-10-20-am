// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║    ██╗██╗   ██╗██╗   ██╗███████╗██████╗                                   ║
 * ║    ██║██║   ██║██║   ██║██╔════╝██╔══██╗                                  ║
 * ║    ██║██║   ██║██║   ██║███████╗██║  ██║                                  ║
 * ║    ██║╚██╗ ██╔╝██║   ██║╚════██║██║  ██║                                  ║
 * ║    ██║ ╚████╔╝ ╚██████╔╝███████║██████╔╝                                  ║
 * ║    ╚═╝  ╚═══╝   ╚═════╝ ╚══════╝╚═════╝                                   ║
 * ║                                                                           ║
 * ║───────────────────────────────────────────────────────────────────────────║
 * ║                                                                           ║
 * ║              DIGITAL COMMERCIAL BANK TREASURY SYSTEM                      ║
 * ║                   Official VUSD Interface                                 ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Contract: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b                     ║
 * ║  Network: LemonChain (1006)          Symbol: VUSD         Decimals: 6    ║
 * ║  Price: $1.00 USD                    Backed: 1:1 by Tokenized USD        ║
 * ║  Minter: 0xaccA35529b2FC2041dFb124F83f52120E24377B2                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * @title IVUSD - Official VUSD Interface
 * @author Digital Commercial Bank Ltd
 * @notice Interface to interact with the official VUSD contract
 * @dev This interface defines all functions available on the deployed VUSD contract
 * @custom:address 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b
 * @custom:network LemonChain
 * @custom:version 5.0.0
 */
interface IVUSD {
    
    // ========================================================================
    // ERC-20 STANDARD EVENTS
    // ========================================================================
    
    /// @notice Emitted when tokens are transferred
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /// @notice Emitted when allowance is set
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // ========================================================================
    // ERC-20 STANDARD FUNCTIONS
    // ========================================================================
    
    /// @notice Returns the name of the token
    function name() external view returns (string memory);
    
    /// @notice Returns the symbol of the token
    function symbol() external view returns (string memory);
    
    /// @notice Returns the number of decimals (6 for VUSD)
    function decimals() external view returns (uint8);
    
    /// @notice Returns the total supply of VUSD
    function totalSupply() external view returns (uint256);
    
    /// @notice Returns the balance of an account
    function balanceOf(address account) external view returns (uint256);
    
    /// @notice Transfers tokens to a recipient
    function transfer(address to, uint256 amount) external returns (bool);
    
    /// @notice Returns the allowance for a spender
    function allowance(address owner, address spender) external view returns (uint256);
    
    /// @notice Approves a spender to spend tokens
    function approve(address spender, uint256 amount) external returns (bool);
    
    /// @notice Transfers tokens from one account to another
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    // ========================================================================
    // MINTING FUNCTIONS (MINTER_ROLE required)
    // ========================================================================
    
    /// @notice Mints new VUSD tokens
    /// @dev Only callable by addresses with MINTER_ROLE
    /// @param to Address to receive the minted tokens
    /// @param amount Amount of VUSD to mint (6 decimals)
    function mint(address to, uint256 amount) external;
    
    // ========================================================================
    // BURNING FUNCTIONS
    // ========================================================================
    
    /// @notice Burns VUSD tokens from caller's balance
    /// @param amount Amount of VUSD to burn
    function burn(uint256 amount) external;
    
    /// @notice Burns VUSD tokens from a specific account (requires allowance)
    /// @param account Account to burn from
    /// @param amount Amount of VUSD to burn
    function burnFrom(address account, uint256 amount) external;
    
    // ========================================================================
    // ACCESS CONTROL
    // ========================================================================
    
    /// @notice Checks if an address has a specific role
    function hasRole(bytes32 role, address account) external view returns (bool);
    
    /// @notice Returns the admin role for a given role
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    
    /// @notice Grants a role to an account
    function grantRole(bytes32 role, address account) external;
    
    /// @notice Revokes a role from an account
    function revokeRole(bytes32 role, address account) external;
    
    /// @notice Renounces a role
    function renounceRole(bytes32 role, address callerConfirmation) external;
    
    // ========================================================================
    // ROLE CONSTANTS
    // ========================================================================
    
    /// @notice Returns the default admin role
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    
    /// @notice Returns the minter role
    function MINTER_ROLE() external view returns (bytes32);
    
    /// @notice Returns the pauser role
    function PAUSER_ROLE() external view returns (bytes32);
}

/**
 * @notice VUSD Contract Details
 * 
 * Contract Address: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b
 * Network: LemonChain Mainnet (Chain ID: 1006)
 * 
 * Authorized Minter Wallet: 0xaccA35529b2FC2041dFb124F83f52120E24377B2
 * This wallet has MINTER_ROLE and can call mint() function
 * 
 * VUSD is backed 1:1 by tokenized USD held in the DCB Treasury system.
 * Each VUSD minted requires equivalent USD locked in LockReserve.
 * 
 * Flow:
 * 1. USD Tokenized -> First Signature (DCB Treasury)
 * 2. Lock Accepted -> Second Signature (Treasury Minting)  
 * 3. VUSD Minted -> Third Signature (Backed Certificate)
 */
