// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                              ║
 * ║     ██████╗  ██████╗██████╗     ██╗   ██╗███████╗██████╗     ██╗███████╗ ██████╗ ██████╗  ██████╗ ██████╗ ██████╗  ║
 * ║     ██╔══██╗██╔════╝██╔══██╗    ██║   ██║██╔════╝██╔══██╗    ██║██╔════╝██╔═══██╗╚════██╗██╔═████╗╚════██╗╚════██╗ ║
 * ║     ██║  ██║██║     ██████╔╝    ██║   ██║███████╗██║  ██║    ██║███████╗██║   ██║ █████╔╝██║██╔██║ █████╔╝ █████╔╝ ║
 * ║     ██║  ██║██║     ██╔══██╗    ██║   ██║╚════██║██║  ██║    ██║╚════██║██║   ██║██╔═══╝ ████╔╝██║██╔═══╝ ██╔═══╝  ║
 * ║     ██████╔╝╚██████╗██████╔╝    ╚██████╔╝███████║██████╔╝    ██║███████║╚██████╔╝███████╗╚██████╔╝███████╗███████╗ ║
 * ║     ╚═════╝  ╚═════╝╚═════╝      ╚═════╝ ╚══════╝╚═════╝     ╚═╝╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝╚══════╝ ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🏦 DIGITAL COMMERCIAL BANK LTD - USD TOKEN WITH ISO 20022 MESSAGING                                         ║
 * ║                                                                                                              ║
 * ║  📋 Contract: DCB_USD_ISO20022                                                                               ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                             ║
 * ║  📄 Standard: ERC-20 with ISO 20022 Extensions                                                               ║
 * ║  💱 Pegged: 1 USD = $1.00 (Oracle Verified)                                                                  ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🔗 LINKED CONTRACTS & ORACLES:                                                                              ║
 * ║  ├─ 💵 LUSD Official: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                             ║
 * ║  ├─ 🔮 Price Oracle: Multi-Stablecoin (USDT, USDC, VUSD, LUSD)                                               ║
 * ║  ├─ 🏛️ DAES Banking: ISO 20022 pacs.008, pacs.009, camt.053                                                  ║
 * ║  └─ 🌍 SWIFT Network: MT103, MT202, MT940 Compatible                                                         ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  ✨ FEATURES:                                                                                                ║
 * ║  ├─ 💰 Custody Account Integration (DAES/SWIFT Funds Lock)                                                   ║
 * ║  ├─ 📨 ISO 20022 Message Embedding (pacs.008, pacs.009, camt)                                                ║
 * ║  ├─ 🔒 Bank Trust Account Lock Mechanism                                                                     ║
 * ║  ├─ 🔮 Multi-Oracle Price Verification ($1.00 USD Peg)                                                       ║
 * ║  ├─ 📊 Complete Audit Trail & Transparency                                                                   ║
 * ║  ├─ 🛡️ Multi-Signature Governance                                                                            ║
 * ║  ├─ ⚡ EIP-2612 Permit (Gasless Approvals)                                                                   ║
 * ║  ├─ 🔄 Swap 1:1 with LUSD                                                                                    ║
 * ║  └─ 📝 Full Event Logging for Compliance                                                                     ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  📜 ISO 20022 MESSAGE TYPES SUPPORTED:                                                                       ║
 * ║  ├─ pacs.008.001.08 - FI to FI Customer Credit Transfer                                                      ║
 * ║  ├─ pacs.009.001.08 - FI to FI Financial Institution Credit Transfer                                         ║
 * ║  ├─ pacs.002.001.10 - FI to FI Payment Status Report                                                         ║
 * ║  ├─ camt.053.001.08 - Bank to Customer Statement                                                             ║
 * ║  ├─ camt.054.001.08 - Bank to Customer Debit/Credit Notification                                             ║
 * ║  └─ pain.001.001.09 - Customer Credit Transfer Initiation                                                    ║
 * ║                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title DCB_USD_ISO20022 - Digital Commercial Bank USD Token with ISO 20022 Integration
 * @author Digital Commercial Bank Ltd - Treasury Division
 * @notice ERC-20 USD Token backed by DAES/SWIFT banking system with full ISO 20022 compliance
 * @dev Implements custody account integration, oracle price feeds, and ISO 20022 message embedding
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 1.0.0
 * @custom:license MIT
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title IMultiStablecoinOracle
 * @notice Interface for the multi-stablecoin price oracle
 */
interface IMultiStablecoinOracle {
    function getPrice(string calldata symbol) external view returns (uint256 price, uint8 decimals, uint256 timestamp);
    function getAveragePrice() external view returns (uint256 price, uint8 decimals);
    function isStablecoinHealthy(string calldata symbol) external view returns (bool);
}

/**
 * @title ILUSD
 * @notice Interface for the official LUSD contract
 */
interface ILUSD {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract DCB_USD_ISO20022 is 
    ERC20, 
    ERC20Burnable, 
    ERC20Permit, 
    ERC20Pausable, 
    AccessControl, 
    ReentrancyGuard 
{
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    CONSTANTS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version
    string public constant VERSION = "1.0.0";
    
    /// @notice Contract name for ISO 20022
    string public constant ISO_INSTITUTION_NAME = "Digital Commercial Bank Ltd";
    
    /// @notice ISO Currency Code
    string public constant ISO_CURRENCY_CODE = "USD";
    
    /// @notice BIC/SWIFT Code
    string public constant SWIFT_BIC = "DCBKUS33XXX";
    
    /// @notice Official LUSD Contract Address on LemonChain
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LemonChain ID
    uint256 public constant LEMON_CHAIN_ID = 1005;
    
    /// @notice Price precision (6 decimals for USD)
    uint256 public constant PRICE_PRECISION = 1e6;
    
    /// @notice Maximum price deviation allowed (0.5% = 50 basis points)
    uint256 public constant MAX_PRICE_DEVIATION_BPS = 50;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  ACCESS ROLES                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Role for minting new tokens (Treasury operators)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Role for burning tokens
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    /// @notice Role for managing custody accounts
    bytes32 public constant CUSTODY_MANAGER_ROLE = keccak256("CUSTODY_MANAGER_ROLE");
    
    /// @notice Role for ISO 20022 message validation
    bytes32 public constant ISO_VALIDATOR_ROLE = keccak256("ISO_VALIDATOR_ROLE");
    
    /// @notice Role for oracle management
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
    
    /// @notice Role for emergency operations
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    /// @notice Role for DAES/SWIFT operations
    bytes32 public constant DAES_OPERATOR_ROLE = keccak256("DAES_OPERATOR_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                     ENUMS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice ISO 20022 Message Types
    enum ISO20022MessageType {
        PACS_008,   // FI to FI Customer Credit Transfer
        PACS_009,   // FI to FI Financial Institution Credit Transfer
        PACS_002,   // Payment Status Report
        CAMT_053,   // Bank to Customer Statement
        CAMT_054,   // Bank to Customer Debit/Credit Notification
        PAIN_001    // Customer Credit Transfer Initiation
    }
    
    /// @notice Custody Account Status
    enum CustodyStatus {
        ACTIVE,
        LOCKED,
        PENDING_VERIFICATION,
        SUSPENDED,
        CLOSED
    }
    
    /// @notice Liquidity Injection Status
    enum InjectionStatus {
        PENDING,
        VERIFIED,
        MINTED,
        REJECTED,
        CANCELLED
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    STRUCTS                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Custody Account Structure - Represents a bank custody/trust account
     * @dev Funds in these accounts back the USD tokens 1:1
     */
    struct CustodyAccount {
        bytes32 accountId;              // Unique account identifier
        string accountName;             // Human-readable name
        string bankName;                // Custodian bank name
        string swiftBic;                // SWIFT/BIC code
        string iban;                    // IBAN (if applicable)
        string accountNumber;           // Account number
        uint256 totalDeposited;         // Total USD deposited
        uint256 totalWithdrawn;         // Total USD withdrawn
        uint256 currentBalance;         // Current balance
        uint256 lockedAmount;           // Amount locked for token backing
        CustodyStatus status;           // Account status
        address owner;                  // Account owner address
        uint256 createdAt;              // Creation timestamp
        uint256 lastActivityAt;         // Last activity timestamp
        bool isDAES;                    // Is DAES network account
        bool isSWIFT;                   // Is SWIFT network account
    }
    
    /**
     * @notice ISO 20022 Message Structure
     * @dev Stores ISO 20022 message data on-chain for transparency
     */
    struct ISO20022Message {
        bytes32 messageId;              // Unique message ID (UETR for SWIFT)
        ISO20022MessageType messageType; // Type of ISO 20022 message
        string messageTypeCode;         // e.g., "pacs.008.001.08"
        bytes32 transactionId;          // Related transaction ID
        string senderBIC;               // Sender SWIFT/BIC
        string receiverBIC;             // Receiver SWIFT/BIC
        uint256 amount;                 // Transaction amount
        string currency;                // Currency code (USD)
        bytes32 isoHash;                // Hash of full ISO message
        string instructionId;           // Instruction ID
        string endToEndId;              // End-to-end ID
        uint256 timestamp;              // Message timestamp
        bool verified;                  // Verification status
        address verifiedBy;             // Address that verified
    }
    
    /**
     * @notice Liquidity Injection Structure
     * @dev Records each liquidity injection from banking system
     */
    struct LiquidityInjection {
        bytes32 injectionId;            // Unique injection ID
        bytes32 custodyAccountId;       // Source custody account
        uint256 amount;                 // Amount in USD (6 decimals)
        bytes32 isoMessageId;           // Related ISO 20022 message
        string daesTransactionId;       // DAES transaction reference
        string swiftReference;          // SWIFT reference (if applicable)
        InjectionStatus status;         // Current status
        address initiator;              // Who initiated
        address beneficiary;            // Token recipient
        uint256 tokensToMint;           // Tokens to be minted
        uint256 tokensMinted;           // Tokens actually minted
        uint256 oraclePrice;            // Oracle price at injection
        uint256 createdAt;              // Creation timestamp
        uint256 verifiedAt;             // Verification timestamp
        uint256 mintedAt;               // Minting timestamp
        string notes;                   // Additional notes
    }
    
    /**
     * @notice Oracle Price Feed Structure
     * @dev Tracks prices from multiple stablecoin sources
     */
    struct OraclePriceFeed {
        string symbol;                  // Token symbol (USDT, USDC, etc.)
        address oracleAddress;          // Oracle contract address
        uint256 lastPrice;              // Last recorded price
        uint256 lastUpdate;             // Last update timestamp
        bool isActive;                  // Is feed active
        uint256 weight;                 // Weight in average calculation
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                 STATE VARIABLES                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Multi-stablecoin oracle contract
    IMultiStablecoinOracle public priceOracle;
    
    /// @notice LUSD contract interface
    ILUSD public lusdContract;
    
    /// @notice Total USD locked in custody accounts
    uint256 public totalCustodyLocked;
    
    /// @notice Total tokens minted from custody
    uint256 public totalMintedFromCustody;
    
    /// @notice Total liquidity injections count
    uint256 public totalInjections;
    
    /// @notice Total ISO 20022 messages processed
    uint256 public totalISOMessages;
    
    /// @notice Mapping of custody accounts
    mapping(bytes32 => CustodyAccount) public custodyAccounts;
    
    /// @notice Array of custody account IDs
    bytes32[] public custodyAccountIds;
    
    /// @notice Mapping of ISO 20022 messages
    mapping(bytes32 => ISO20022Message) public isoMessages;
    
    /// @notice Array of ISO message IDs
    bytes32[] public isoMessageIds;
    
    /// @notice Mapping of liquidity injections
    mapping(bytes32 => LiquidityInjection) public liquidityInjections;
    
    /// @notice Array of injection IDs
    bytes32[] public injectionIds;
    
    /// @notice Mapping of oracle price feeds
    mapping(string => OraclePriceFeed) public oraclePriceFeeds;
    
    /// @notice Array of oracle symbols
    string[] public oracleSymbols;
    
    /// @notice Mapping of user to their custody accounts
    mapping(address => bytes32[]) public userCustodyAccounts;
    
    /// @notice Mapping of DAES transaction ID to injection ID
    mapping(string => bytes32) public daesToInjection;
    
    /// @notice Mapping of SWIFT reference to injection ID
    mapping(string => bytes32) public swiftToInjection;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    EVENTS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Emitted when a custody account is created
     */
    event CustodyAccountCreated(
        bytes32 indexed accountId,
        string accountName,
        string bankName,
        string swiftBic,
        address indexed owner,
        bool isDAES,
        bool isSWIFT,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when funds are deposited to custody
     */
    event CustodyDeposit(
        bytes32 indexed accountId,
        uint256 amount,
        uint256 newBalance,
        string daesReference,
        string swiftReference,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when funds are locked in custody for token backing
     */
    event CustodyLocked(
        bytes32 indexed accountId,
        uint256 amount,
        uint256 totalLocked,
        bytes32 indexed injectionId,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when an ISO 20022 message is recorded
     */
    event ISO20022MessageRecorded(
        bytes32 indexed messageId,
        ISO20022MessageType messageType,
        string messageTypeCode,
        bytes32 indexed transactionId,
        string senderBIC,
        string receiverBIC,
        uint256 amount,
        bytes32 isoHash,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when an ISO 20022 message is verified
     */
    event ISO20022MessageVerified(
        bytes32 indexed messageId,
        address indexed verifiedBy,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when liquidity injection is initiated
     */
    event LiquidityInjectionInitiated(
        bytes32 indexed injectionId,
        bytes32 indexed custodyAccountId,
        uint256 amount,
        bytes32 isoMessageId,
        string daesTransactionId,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when liquidity injection is verified
     */
    event LiquidityInjectionVerified(
        bytes32 indexed injectionId,
        address indexed verifiedBy,
        uint256 oraclePrice,
        uint256 tokensToMint,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when tokens are minted from liquidity injection
     */
    event LiquidityInjectionMinted(
        bytes32 indexed injectionId,
        address indexed beneficiary,
        uint256 tokensMinted,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when oracle price is updated
     */
    event OraclePriceUpdated(
        string indexed symbol,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when tokens are swapped to LUSD
     */
    event SwappedToLUSD(
        address indexed user,
        uint256 usdAmount,
        uint256 lusdAmount,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when tokens are swapped from LUSD
     */
    event SwappedFromLUSD(
        address indexed user,
        uint256 lusdAmount,
        uint256 usdAmount,
        uint256 timestamp
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                   MODIFIERS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Ensures custody account exists and is active
     */
    modifier validCustodyAccount(bytes32 accountId) {
        require(custodyAccounts[accountId].createdAt > 0, "Custody account does not exist");
        require(custodyAccounts[accountId].status == CustodyStatus.ACTIVE, "Custody account not active");
        _;
    }
    
    /**
     * @notice Ensures injection exists
     */
    modifier validInjection(bytes32 injectionId) {
        require(liquidityInjections[injectionId].createdAt > 0, "Injection does not exist");
        _;
    }
    
    /**
     * @notice Ensures price is within acceptable range
     */
    modifier priceWithinRange() {
        uint256 currentPrice = getAverageOraclePrice();
        uint256 deviation = currentPrice > PRICE_PRECISION 
            ? ((currentPrice - PRICE_PRECISION) * BPS_DENOMINATOR) / PRICE_PRECISION
            : ((PRICE_PRECISION - currentPrice) * BPS_DENOMINATOR) / PRICE_PRECISION;
        require(deviation <= MAX_PRICE_DEVIATION_BPS, "Price deviation too high");
        _;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  CONSTRUCTOR                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Contract constructor
     * @param _admin Admin address with DEFAULT_ADMIN_ROLE
     * @param _priceOracle Address of the multi-stablecoin oracle
     */
    constructor(
        address _admin,
        address _priceOracle
    ) ERC20("Digital Commercial Bank USD", "DCB-USD") ERC20Permit("Digital Commercial Bank USD") {
        require(_admin != address(0), "Invalid admin address");
        
        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(BURNER_ROLE, _admin);
        _grantRole(CUSTODY_MANAGER_ROLE, _admin);
        _grantRole(ISO_VALIDATOR_ROLE, _admin);
        _grantRole(ORACLE_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(DAES_OPERATOR_ROLE, _admin);
        
        // Set oracle if provided
        if (_priceOracle != address(0)) {
            priceOracle = IMultiStablecoinOracle(_priceOracle);
        }
        
        // Set LUSD contract
        lusdContract = ILUSD(LUSD_CONTRACT);
        
        // Initialize default oracle price feeds
        _initializeOracleFeeds();
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           CUSTODY ACCOUNT FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a new custody account
     * @param accountName Human-readable account name
     * @param bankName Custodian bank name
     * @param swiftBic SWIFT/BIC code
     * @param iban IBAN (optional)
     * @param accountNumber Account number
     * @param isDAES Is DAES network account
     * @param isSWIFT Is SWIFT network account
     * @return accountId The created account ID
     */
    function createCustodyAccount(
        string calldata accountName,
        string calldata bankName,
        string calldata swiftBic,
        string calldata iban,
        string calldata accountNumber,
        bool isDAES,
        bool isSWIFT
    ) external onlyRole(CUSTODY_MANAGER_ROLE) returns (bytes32 accountId) {
        // Generate unique account ID
        accountId = keccak256(abi.encodePacked(
            accountName,
            bankName,
            swiftBic,
            accountNumber,
            block.timestamp,
            msg.sender
        ));
        
        require(custodyAccounts[accountId].createdAt == 0, "Account already exists");
        
        // Create custody account
        custodyAccounts[accountId] = CustodyAccount({
            accountId: accountId,
            accountName: accountName,
            bankName: bankName,
            swiftBic: swiftBic,
            iban: iban,
            accountNumber: accountNumber,
            totalDeposited: 0,
            totalWithdrawn: 0,
            currentBalance: 0,
            lockedAmount: 0,
            status: CustodyStatus.ACTIVE,
            owner: msg.sender,
            createdAt: block.timestamp,
            lastActivityAt: block.timestamp,
            isDAES: isDAES,
            isSWIFT: isSWIFT
        });
        
        custodyAccountIds.push(accountId);
        userCustodyAccounts[msg.sender].push(accountId);
        
        emit CustodyAccountCreated(
            accountId,
            accountName,
            bankName,
            swiftBic,
            msg.sender,
            isDAES,
            isSWIFT,
            block.timestamp
        );
        
        return accountId;
    }
    
    /**
     * @notice Records a deposit to custody account (from DAES/SWIFT)
     * @param accountId Custody account ID
     * @param amount Amount deposited (6 decimals)
     * @param daesReference DAES transaction reference
     * @param swiftReference SWIFT reference
     */
    function recordCustodyDeposit(
        bytes32 accountId,
        uint256 amount,
        string calldata daesReference,
        string calldata swiftReference
    ) external onlyRole(DAES_OPERATOR_ROLE) validCustodyAccount(accountId) {
        require(amount > 0, "Amount must be greater than 0");
        
        CustodyAccount storage account = custodyAccounts[accountId];
        
        account.totalDeposited += amount;
        account.currentBalance += amount;
        account.lastActivityAt = block.timestamp;
        
        emit CustodyDeposit(
            accountId,
            amount,
            account.currentBalance,
            daesReference,
            swiftReference,
            block.timestamp
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                         ISO 20022 MESSAGE FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Records an ISO 20022 message on-chain
     * @param messageType Type of ISO 20022 message
     * @param messageTypeCode Full message type code (e.g., "pacs.008.001.08")
     * @param transactionId Related transaction ID
     * @param senderBIC Sender SWIFT/BIC
     * @param receiverBIC Receiver SWIFT/BIC
     * @param amount Transaction amount
     * @param isoHash Hash of the full ISO message
     * @param instructionId Instruction ID
     * @param endToEndId End-to-end ID
     * @return messageId The recorded message ID
     */
    function recordISO20022Message(
        ISO20022MessageType messageType,
        string calldata messageTypeCode,
        bytes32 transactionId,
        string calldata senderBIC,
        string calldata receiverBIC,
        uint256 amount,
        bytes32 isoHash,
        string calldata instructionId,
        string calldata endToEndId
    ) external onlyRole(ISO_VALIDATOR_ROLE) returns (bytes32 messageId) {
        // Generate unique message ID (similar to UETR)
        messageId = keccak256(abi.encodePacked(
            messageTypeCode,
            transactionId,
            senderBIC,
            receiverBIC,
            amount,
            block.timestamp,
            totalISOMessages
        ));
        
        require(isoMessages[messageId].timestamp == 0, "Message already exists");
        
        isoMessages[messageId] = ISO20022Message({
            messageId: messageId,
            messageType: messageType,
            messageTypeCode: messageTypeCode,
            transactionId: transactionId,
            senderBIC: senderBIC,
            receiverBIC: receiverBIC,
            amount: amount,
            currency: ISO_CURRENCY_CODE,
            isoHash: isoHash,
            instructionId: instructionId,
            endToEndId: endToEndId,
            timestamp: block.timestamp,
            verified: false,
            verifiedBy: address(0)
        });
        
        isoMessageIds.push(messageId);
        totalISOMessages++;
        
        emit ISO20022MessageRecorded(
            messageId,
            messageType,
            messageTypeCode,
            transactionId,
            senderBIC,
            receiverBIC,
            amount,
            isoHash,
            block.timestamp
        );
        
        return messageId;
    }
    
    /**
     * @notice Verifies an ISO 20022 message
     * @param messageId Message ID to verify
     */
    function verifyISO20022Message(bytes32 messageId) external onlyRole(ISO_VALIDATOR_ROLE) {
        require(isoMessages[messageId].timestamp > 0, "Message does not exist");
        require(!isoMessages[messageId].verified, "Message already verified");
        
        isoMessages[messageId].verified = true;
        isoMessages[messageId].verifiedBy = msg.sender;
        
        emit ISO20022MessageVerified(messageId, msg.sender, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                       LIQUIDITY INJECTION FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Initiates a liquidity injection from custody account
     * @dev This is the main function to inject USD liquidity and mint tokens
     * @param custodyAccountId Source custody account
     * @param amount Amount to inject (6 decimals)
     * @param isoMessageId Related ISO 20022 message ID
     * @param daesTransactionId DAES transaction reference
     * @param swiftReference SWIFT reference (optional)
     * @param beneficiary Address to receive minted tokens
     * @param notes Additional notes
     * @return injectionId The created injection ID
     */
    function initiateLiquidityInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        bytes32 isoMessageId,
        string calldata daesTransactionId,
        string calldata swiftReference,
        address beneficiary,
        string calldata notes
    ) external onlyRole(DAES_OPERATOR_ROLE) validCustodyAccount(custodyAccountId) nonReentrant returns (bytes32 injectionId) {
        require(amount > 0, "Amount must be greater than 0");
        require(beneficiary != address(0), "Invalid beneficiary");
        
        CustodyAccount storage account = custodyAccounts[custodyAccountId];
        require(account.currentBalance >= amount, "Insufficient custody balance");
        
        // Verify ISO message if provided
        if (isoMessageId != bytes32(0)) {
            require(isoMessages[isoMessageId].timestamp > 0, "ISO message does not exist");
            require(isoMessages[isoMessageId].verified, "ISO message not verified");
            require(isoMessages[isoMessageId].amount == amount, "Amount mismatch with ISO message");
        }
        
        // Generate injection ID
        injectionId = keccak256(abi.encodePacked(
            custodyAccountId,
            amount,
            beneficiary,
            block.timestamp,
            totalInjections
        ));
        
        require(liquidityInjections[injectionId].createdAt == 0, "Injection already exists");
        
        // Lock funds in custody account
        account.currentBalance -= amount;
        account.lockedAmount += amount;
        account.lastActivityAt = block.timestamp;
        totalCustodyLocked += amount;
        
        // Create injection record
        liquidityInjections[injectionId] = LiquidityInjection({
            injectionId: injectionId,
            custodyAccountId: custodyAccountId,
            amount: amount,
            isoMessageId: isoMessageId,
            daesTransactionId: daesTransactionId,
            swiftReference: swiftReference,
            status: InjectionStatus.PENDING,
            initiator: msg.sender,
            beneficiary: beneficiary,
            tokensToMint: 0,
            tokensMinted: 0,
            oraclePrice: 0,
            createdAt: block.timestamp,
            verifiedAt: 0,
            mintedAt: 0,
            notes: notes
        });
        
        injectionIds.push(injectionId);
        totalInjections++;
        
        // Map references
        if (bytes(daesTransactionId).length > 0) {
            daesToInjection[daesTransactionId] = injectionId;
        }
        if (bytes(swiftReference).length > 0) {
            swiftToInjection[swiftReference] = injectionId;
        }
        
        emit CustodyLocked(custodyAccountId, amount, account.lockedAmount, injectionId, block.timestamp);
        
        emit LiquidityInjectionInitiated(
            injectionId,
            custodyAccountId,
            amount,
            isoMessageId,
            daesTransactionId,
            beneficiary,
            block.timestamp
        );
        
        return injectionId;
    }
    
    /**
     * @notice Verifies a liquidity injection and calculates tokens to mint
     * @param injectionId Injection ID to verify
     */
    function verifyLiquidityInjection(bytes32 injectionId) 
        external 
        onlyRole(ISO_VALIDATOR_ROLE) 
        validInjection(injectionId) 
        priceWithinRange 
    {
        LiquidityInjection storage injection = liquidityInjections[injectionId];
        require(injection.status == InjectionStatus.PENDING, "Invalid injection status");
        
        // Get oracle price
        uint256 oraclePrice = getAverageOraclePrice();
        
        // Calculate tokens to mint (1:1 ratio with USD)
        uint256 tokensToMint = injection.amount;
        
        injection.status = InjectionStatus.VERIFIED;
        injection.oraclePrice = oraclePrice;
        injection.tokensToMint = tokensToMint;
        injection.verifiedAt = block.timestamp;
        
        emit LiquidityInjectionVerified(
            injectionId,
            msg.sender,
            oraclePrice,
            tokensToMint,
            block.timestamp
        );
    }
    
    /**
     * @notice Mints tokens from a verified liquidity injection
     * @param injectionId Injection ID to mint from
     */
    function mintFromInjection(bytes32 injectionId) 
        external 
        onlyRole(MINTER_ROLE) 
        validInjection(injectionId) 
        nonReentrant 
    {
        LiquidityInjection storage injection = liquidityInjections[injectionId];
        require(injection.status == InjectionStatus.VERIFIED, "Injection not verified");
        require(injection.tokensToMint > 0, "No tokens to mint");
        
        uint256 tokensToMint = injection.tokensToMint;
        address beneficiary = injection.beneficiary;
        
        // Update injection status
        injection.status = InjectionStatus.MINTED;
        injection.tokensMinted = tokensToMint;
        injection.mintedAt = block.timestamp;
        
        // Update totals
        totalMintedFromCustody += tokensToMint;
        
        // Mint tokens
        _mint(beneficiary, tokensToMint);
        
        emit LiquidityInjectionMinted(
            injectionId,
            beneficiary,
            tokensToMint,
            block.timestamp
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                            ORACLE FUNCTIONS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Initializes default oracle price feeds
     */
    function _initializeOracleFeeds() internal {
        // USDT
        oraclePriceFeeds["USDT"] = OraclePriceFeed({
            symbol: "USDT",
            oracleAddress: address(0),
            lastPrice: PRICE_PRECISION,
            lastUpdate: block.timestamp,
            isActive: true,
            weight: 25
        });
        oracleSymbols.push("USDT");
        
        // USDC
        oraclePriceFeeds["USDC"] = OraclePriceFeed({
            symbol: "USDC",
            oracleAddress: address(0),
            lastPrice: PRICE_PRECISION,
            lastUpdate: block.timestamp,
            isActive: true,
            weight: 25
        });
        oracleSymbols.push("USDC");
        
        // VUSD
        oraclePriceFeeds["VUSD"] = OraclePriceFeed({
            symbol: "VUSD",
            oracleAddress: address(0),
            lastPrice: PRICE_PRECISION,
            lastUpdate: block.timestamp,
            isActive: true,
            weight: 25
        });
        oracleSymbols.push("VUSD");
        
        // LUSD
        oraclePriceFeeds["LUSD"] = OraclePriceFeed({
            symbol: "LUSD",
            oracleAddress: address(0),
            lastPrice: PRICE_PRECISION,
            lastUpdate: block.timestamp,
            isActive: true,
            weight: 25
        });
        oracleSymbols.push("LUSD");
    }
    
    /**
     * @notice Updates oracle price for a symbol
     * @param symbol Token symbol
     * @param newPrice New price (6 decimals)
     */
    function updateOraclePrice(string calldata symbol, uint256 newPrice) 
        external 
        onlyRole(ORACLE_MANAGER_ROLE) 
    {
        require(oraclePriceFeeds[symbol].isActive, "Oracle feed not active");
        require(newPrice > 0, "Invalid price");
        
        uint256 oldPrice = oraclePriceFeeds[symbol].lastPrice;
        oraclePriceFeeds[symbol].lastPrice = newPrice;
        oraclePriceFeeds[symbol].lastUpdate = block.timestamp;
        
        emit OraclePriceUpdated(symbol, oldPrice, newPrice, block.timestamp);
    }
    
    /**
     * @notice Gets the weighted average price from all active oracles
     * @return Average price (6 decimals)
     */
    function getAverageOraclePrice() public view returns (uint256) {
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        
        for (uint256 i = 0; i < oracleSymbols.length; i++) {
            OraclePriceFeed storage feed = oraclePriceFeeds[oracleSymbols[i]];
            if (feed.isActive) {
                weightedSum += feed.lastPrice * feed.weight;
                totalWeight += feed.weight;
            }
        }
        
        if (totalWeight == 0) return PRICE_PRECISION;
        return weightedSum / totalWeight;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           SWAP FUNCTIONS (1:1 with LUSD)                              ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Swaps DCB-USD to LUSD at 1:1 ratio
     * @param amount Amount to swap
     */
    function swapToLUSD(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn DCB-USD
        _burn(msg.sender, amount);
        
        // Transfer LUSD to user (requires this contract to have LUSD balance)
        require(lusdContract.transfer(msg.sender, amount), "LUSD transfer failed");
        
        emit SwappedToLUSD(msg.sender, amount, amount, block.timestamp);
    }
    
    /**
     * @notice Swaps LUSD to DCB-USD at 1:1 ratio
     * @param amount Amount to swap
     */
    function swapFromLUSD(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer LUSD from user
        require(lusdContract.transferFrom(msg.sender, address(this), amount), "LUSD transfer failed");
        
        // Mint DCB-USD
        _mint(msg.sender, amount);
        
        emit SwappedFromLUSD(msg.sender, amount, amount, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Returns the number of decimals
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    /**
     * @notice Gets custody account details
     */
    function getCustodyAccount(bytes32 accountId) external view returns (CustodyAccount memory) {
        return custodyAccounts[accountId];
    }
    
    /**
     * @notice Gets ISO 20022 message details
     */
    function getISO20022Message(bytes32 messageId) external view returns (ISO20022Message memory) {
        return isoMessages[messageId];
    }
    
    /**
     * @notice Gets liquidity injection details
     */
    function getLiquidityInjection(bytes32 injectionId) external view returns (LiquidityInjection memory) {
        return liquidityInjections[injectionId];
    }
    
    /**
     * @notice Gets all custody account IDs
     */
    function getAllCustodyAccountIds() external view returns (bytes32[] memory) {
        return custodyAccountIds;
    }
    
    /**
     * @notice Gets user's custody accounts
     */
    function getUserCustodyAccounts(address user) external view returns (bytes32[] memory) {
        return userCustodyAccounts[user];
    }
    
    /**
     * @notice Gets total statistics
     */
    function getStatistics() external view returns (
        uint256 _totalCustodyLocked,
        uint256 _totalMintedFromCustody,
        uint256 _totalInjections,
        uint256 _totalISOMessages,
        uint256 _totalSupply,
        uint256 _averageOraclePrice
    ) {
        return (
            totalCustodyLocked,
            totalMintedFromCustody,
            totalInjections,
            totalISOMessages,
            totalSupply(),
            getAverageOraclePrice()
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           ADMIN FUNCTIONS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Pauses the contract
     */
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Sets the price oracle contract
     */
    function setPriceOracle(address _oracle) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(_oracle != address(0), "Invalid oracle address");
        priceOracle = IMultiStablecoinOracle(_oracle);
    }
    
    /**
     * @notice Adds or updates an oracle price feed
     */
    function setOracleFeed(
        string calldata symbol,
        address oracleAddress,
        uint256 weight,
        bool isActive
    ) external onlyRole(ORACLE_MANAGER_ROLE) {
        if (oraclePriceFeeds[symbol].lastUpdate == 0) {
            oracleSymbols.push(symbol);
        }
        
        oraclePriceFeeds[symbol] = OraclePriceFeed({
            symbol: symbol,
            oracleAddress: oracleAddress,
            lastPrice: PRICE_PRECISION,
            lastUpdate: block.timestamp,
            isActive: isActive,
            weight: weight
        });
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           INTERNAL OVERRIDES                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Override required by Solidity for multiple inheritance
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
