// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║    ██╗██╗     ██╗   ██╗███████╗██████╗      ██████╗ ███████╗███████╗██╗ ██████╗██╗ █████╗ ██╗                                ║
 * ║    ██║██║     ██║   ██║██╔════╝██╔══██╗    ██╔═══██╗██╔════╝██╔════╝██║██╔════╝██║██╔══██╗██║                               ║
 * ║    ██║██║     ██║   ██║███████╗██║  ██║    ██║   ██║█████╗  █████╗  ██║██║     ██║███████║██║                               ║
 * ║    ██║██║     ██║   ██║╚════██║██║  ██║    ██║   ██║██╔══╝  ██╔══╝  ██║██║     ██║██╔══██║██║                               ║
 * ║    ██║███████╗╚██████╔╝███████║██████╔╝    ╚██████╔╝██║     ██║     ██║╚██████╗██║██║  ██║███████╗                          ║
 * ║    ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚═════╝      ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝                          ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  ILUSD - Interface for Official LUSD Contract on LemonChain                                                                  ║
 * ║  Official Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Network: LemonChain Mainnet (Chain ID: 8866)                                                                                ║
 * ║  Symbol: LUSD                                                                                                                ║
 * ║  Decimals: 6                                                                                                                 ║
 * ║  Price: $1.00 USD (Pegged, backed 1:1 by tokenized USD)                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title ILUSD - Official LUSD Interface
 * @author Digital Commercial Bank Ltd
 * @notice Interface to interact with the official LUSD contract
 * @dev This interface defines all functions available on the deployed LUSD contract
 * @custom:address 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99
 * @custom:network LemonChain
 * @custom:version 4.0.0
 */
interface ILUSD {
    
    // ══════════════════════════════════════════════════════════════════════════════
    // ERC-20 STANDARD EVENTS
    // ══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when tokens are transferred
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /// @notice Emitted when allowance is set
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // ══════════════════════════════════════════════════════════════════════════════
    // ERC-20 STANDARD FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Returns the name of the token
    function name() external view returns (string memory);
    
    /// @notice Returns the symbol of the token
    function symbol() external view returns (string memory);
    
    /// @notice Returns the number of decimals (6 for LUSD)
    function decimals() external view returns (uint8);
    
    /// @notice Returns the total token supply
    function totalSupply() external view returns (uint256);
    
    /// @notice Returns the balance of an account
    function balanceOf(address account) external view returns (uint256);
    
    /// @notice Transfers tokens to a recipient
    function transfer(address to, uint256 amount) external returns (bool);
    
    /// @notice Returns the allowance for a spender
    function allowance(address owner, address spender) external view returns (uint256);
    
    /// @notice Approves a spender to use tokens
    function approve(address spender, uint256 amount) external returns (bool);
    
    /// @notice Transfers tokens from one address to another
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    // ══════════════════════════════════════════════════════════════════════════════
    // MINTING & BURNING
    // ══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Mints new tokens (requires MINTER_ROLE)
    function mint(address to, uint256 amount) external;
    
    /// @notice Burns tokens from caller
    function burn(uint256 amount) external;
    
    /// @notice Burns tokens from an address (requires allowance)
    function burnFrom(address from, uint256 amount) external;
}

/**
 * @title LUSDConstants
 * @notice Constants for LUSD contract interaction
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
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice LemonChain RPC URL
    string public constant RPC_URL = "https://rpc.lemonchain.io";
    
    /// @notice LemonChain Explorer URL
    string public constant EXPLORER_URL = "https://explorer.lemonchain.io";
}

/**
 * @title IUSD
 * @notice Interface for the USD tokenized contract
 */
interface IUSD {
    function acceptInjection(bytes32 injectionId) external returns (bool);
    function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) external returns (bool);
    function recordConsumptionForLUSD(bytes32 injectionId, bytes32 lusdTxHash) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function totalSupply() external view returns (uint256);
}

/**
 * @title ILockReserve
 * @notice Interface for the Lock Reserve contract
 */
interface ILockReserve {
    function receiveLock(
        bytes32 usdInjectionId,
        uint256 amount,
        address beneficiary,
        bytes32 firstSignature
    ) external returns (bytes32 lockId);
    
    function acceptLock(bytes32 lockId) external returns (bytes32 secondSignature, string memory authCode);
    
    function moveToReserve(bytes32 lockId) external;
    
    function consumeForLUSD(
        bytes32 lockId,
        uint256 amount,
        bytes32 lusdTxHash
    ) external returns (bytes32 consumptionId, bytes32 thirdSignature);
    
    function getAvailableReserve(bytes32 lockId) external view returns (uint256);
    
    function totalReserve() external view returns (uint256);
    function totalConsumed() external view returns (uint256);
}

/**
 * @title ILUSDMinter
 * @notice Interface for the LUSD Minter contract
 */
interface ILUSDMinter {
    function createMintRequest(
        bytes32 lockReserveId,
        uint256 amount,
        string calldata authorizationCode
    ) external returns (bytes32 requestId);
    
    function executeMint(
        bytes32 requestId,
        address beneficiary,
        string calldata bankName,
        string calldata bankBIC,
        bytes32 usdInjectionId,
        uint256 usdTokenizedAt,
        uint256 lockAcceptedAt,
        bytes32 firstSignature,
        bytes32 secondSignature
    ) external returns (bytes32 entryId, string memory publicationCode);
    
    function mintAndPublish(
        bytes32 lockReserveId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode,
        string calldata bankName,
        bytes32 firstSignature,
        bytes32 secondSignature
    ) external returns (bytes32 entryId, string memory publicationCode);
    
    function totalMinted() external view returns (uint256);
    function getBackingRatio() external view returns (uint256);
}
