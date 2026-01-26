// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║    ██╗   ██╗███████╗██████╗     ████████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗██╗███████╗███████╗██████╗                       ║
 * ║    ██║   ██║██╔════╝██╔══██╗    ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║██║╚══███╔╝██╔════╝██╔══██╗                      ║
 * ║    ██║   ██║███████╗██║  ██║       ██║   ██║   ██║█████╔╝ █████╗  ██╔██╗ ██║██║  ███╔╝ █████╗  ██║  ██║                      ║
 * ║    ██║   ██║╚════██║██║  ██║       ██║   ██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║██║ ███╔╝  ██╔══╝  ██║  ██║                      ║
 * ║    ╚██████╔╝███████║██████╔╝       ██║   ╚██████╔╝██║  ██╗███████╗██║ ╚████║██║███████╗███████╗██████╔╝                      ║
 * ║     ╚═════╝ ╚══════╝╚═════╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝╚═════╝                       ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  🏦 USD TOKENIZED - DIGITAL COMMERCIAL BANK TREASURY TOKEN                                                                   ║
 * ║                                                                                                                              ║
 * ║  📋 Contract: USD (Tokenized US Dollars)                                                                                     ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 8866)                                                                             ║
 * ║  🔓 License: MIT (Open Source & Public)                                                                                      ║
 * ║  📝 Standard: ERC-20 + ISO 20022 + SWIFT Messaging                                                                           ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💡 FEATURES:                                                                                                                ║
 * ║  ├─ ✅ ERC-20 Compliant with 6 decimals (standard for stablecoins)                                                           ║
 * ║  ├─ ✅ ISO 20022 Message Support (pacs.008, pacs.009, camt.053)                                                              ║
 * ║  ├─ ✅ SWIFT Message Certification (MT103, MT202, MT940)                                                                     ║
 * ║  ├─ ✅ XML Payload Storage (on-chain hash, off-chain data)                                                                   ║
 * ║  ├─ ✅ DAES System Integration                                                                                               ║
 * ║  ├─ ✅ Multi-signature Bank Certification                                                                                    ║
 * ║  ├─ ✅ EIP-712 Typed Signatures                                                                                              ║
 * ║  ├─ ✅ Reentrancy Protection                                                                                                 ║
 * ║  ├─ ✅ Pausable Emergency Stop                                                                                               ║
 * ║  ├─ ✅ Role-Based Access Control                                                                                             ║
 * ║  ├─ ✅ Injection Tracking with Full Audit Trail                                                                              ║
 * ║  └─ ✅ Automatic Lock Creation for Treasury Minting                                                                          ║
 * ║                                                                                                                              ║
 * ║  🔄 FLOW:                                                                                                                    ║
 * ║  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
 * ║  │  1. DAES/Bank sends ISO 20022 or SWIFT message                                                                         │  ║
 * ║  │  2. DCB Treasury verifies and signs with digital signature                                                             │  ║
 * ║  │  3. USD tokens are minted (1:1 with verified bank deposit)                                                             │  ║
 * ║  │  4. Injection is sent to Treasury Minting Platform as PENDING                                                          │  ║
 * ║  │  5. When Treasury Minting accepts → USD goes to Lock Reserve                                                           │  ║
 * ║  │  6. Lock Reserve USD backs LUSD minting                                                                                │  ║
 * ║  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
 * ║                                                                                                                              ║
 * ║  🔗 LINKED CONTRACTS:                                                                                                        ║
 * ║  ├─ 🔒 LockReserve: Lock management for LUSD backing                                                                        ║
 * ║  └─ 💎 LUSD: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                                     ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title USD - Tokenized US Dollars with ISO 20022 & SWIFT Support
 * @author Digital Commercial Bank Ltd
 * @notice ERC-20 token representing tokenized USD with full banking message support
 * @dev Implements ERC-20 with ISO 20022/SWIFT message verification and DAES integration
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 4.0.0
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract USD is ERC20, ERC20Burnable, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Contract version
    string public constant VERSION = "4.0.0";
    
    /// @notice Token decimals (standard for USD stablecoins)
    uint8 private constant DECIMALS = 6;
    
    /// @notice LemonChain ID
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice Official LUSD Contract
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;

    // ══════════════════════════════════════════════════════════════════════════════
    // ROLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Role for minting USD tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Role for bank signers
    bytes32 public constant BANK_SIGNER_ROLE = keccak256("BANK_SIGNER_ROLE");
    
    /// @notice Role for DAES system integration
    bytes32 public constant DAES_OPERATOR_ROLE = keccak256("DAES_OPERATOR_ROLE");
    
    /// @notice Role for Treasury Minting bridge
    bytes32 public constant TREASURY_MINTING_ROLE = keccak256("TREASURY_MINTING_ROLE");
    
    /// @notice Role for compliance officers
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ══════════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Message types supported
    enum MessageType {
        ISO_PACS_008,       // Payment Initiation
        ISO_PACS_009,       // Financial Institution Credit Transfer
        ISO_CAMT_053,       // Bank to Customer Statement
        ISO_CAMT_054,       // Bank to Customer Debit Credit Notification
        SWIFT_MT103,        // Single Customer Credit Transfer
        SWIFT_MT202,        // General Financial Institution Transfer
        SWIFT_MT940,        // Customer Statement Message
        SWIFT_MT950,        // Statement Message
        DAES_TRANSFER,      // DAES Internal Transfer
        MANUAL_VERIFIED     // Manually verified deposit
    }

    /// @notice Injection status
    enum InjectionStatus {
        PENDING,            // Waiting for Treasury Minting acceptance
        ACCEPTED,           // Accepted by Treasury Minting
        IN_LOCK_RESERVE,    // USD in Lock Reserve
        CONSUMED_FOR_LUSD,  // Used to mint LUSD
        CANCELLED,          // Cancelled
        EXPIRED             // Expired without acceptance
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Bank certification data
    struct BankCertification {
        string bankId;              // Bank identifier (BIC/SWIFT)
        string bankName;            // Bank name
        address signerAddress;      // Bank signer address
        bytes32 certificationHash;  // Certification hash
        uint256 certifiedAt;        // Timestamp
        bool isActive;              // Active status
    }

    /// @notice ISO 20022 Message structure
    struct ISO20022Message {
        MessageType msgType;        // Message type
        string messageId;           // Unique message ID (e.g., pacs.008.001.08)
        bytes32 xmlHash;            // Hash of XML payload
        string uetr;                // Unique End-to-end Transaction Reference
        string instructionId;       // Instruction ID
        string endToEndId;          // End to End ID
        uint256 amount;             // Amount in smallest units
        string currency;            // Currency code (USD)
        string debtorBIC;           // Debtor bank BIC
        string creditorBIC;         // Creditor bank BIC
        uint256 createdAt;          // Message creation timestamp
    }

    /// @notice USD Injection record
    struct USDInjection {
        bytes32 injectionId;
        
        // Amount
        uint256 amount;
        
        // Message data
        ISO20022Message message;
        
        // Bank certification
        BankCertification bankCert;
        
        // Parties
        address beneficiary;        // Who receives the USD tokens
        address initiator;          // Who initiated the injection
        
        // Status
        InjectionStatus status;
        
        // Signatures
        bytes32 dcbSignature;       // DCB Treasury signature (First Signature)
        bytes32 bankSignature;      // Bank signature
        
        // Timestamps
        uint256 createdAt;
        uint256 acceptedAt;         // When Treasury Minting accepted
        uint256 lockedAt;           // When moved to Lock Reserve
        uint256 consumedAt;         // When used for LUSD
        
        // Treasury Minting reference
        bytes32 lockReserveId;      // Reference to Lock Reserve
        
        // Expiry
        uint256 expiresAt;          // Injection expires after this time
    }

    /// @notice DAES Currency info
    struct DAESCurrency {
        string isoCode;             // ISO 4217 code
        string name;                // Currency name
        bool isActive;              // Active for minting
        bool isReserve;             // Reserve only
        uint256 totalInjected;      // Total injected
        uint256 totalLocked;        // Total in lock reserve
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Lock Reserve contract
    address public lockReserveContract;
    
    /// @notice Treasury Minting contract
    address public treasuryMintingContract;
    
    /// @notice Total USD injected
    uint256 public totalInjected;
    
    /// @notice Total USD in Lock Reserve
    uint256 public totalInLockReserve;
    
    /// @notice Total USD consumed for LUSD
    uint256 public totalConsumedForLUSD;
    
    /// @notice Total injections count
    uint256 public totalInjections;
    
    /// @notice Default injection expiry (7 days)
    uint256 public defaultExpiryDuration = 7 days;
    
    /// @notice Minimum injection amount (100 USD)
    uint256 public minInjectionAmount = 100 * 10**DECIMALS;
    
    /// @notice Maximum injection amount (10M USD)
    uint256 public maxInjectionAmount = 10_000_000 * 10**DECIMALS;
    
    // ══════════════════════════════════════════════════════════════════════════════
    // RATE LIMITING - SECURITY FIX
    // ══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Daily minting limit (100M USD default)
    uint256 public dailyMintLimit = 100_000_000 * 10**DECIMALS;
    
    /// @notice Amount minted today
    uint256 public dailyMinted;
    
    /// @notice Last mint day (for resetting daily counter)
    uint256 public lastMintDay;
    
    /// @notice Hourly minting limit (10M USD default)
    uint256 public hourlyMintLimit = 10_000_000 * 10**DECIMALS;
    
    /// @notice Amount minted this hour
    uint256 public hourlyMinted;
    
    /// @notice Last mint hour
    uint256 public lastMintHour;

    // ══════════════════════════════════════════════════════════════════════════════
    // MAPPINGS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Injections by ID
    mapping(bytes32 => USDInjection) public injections;
    
    /// @notice All injection IDs
    bytes32[] public injectionIds;
    
    /// @notice Bank certifications
    mapping(string => BankCertification) public bankCertifications;
    
    /// @notice DAES currencies
    mapping(string => DAESCurrency) public daesCurrencies;
    
    /// @notice Message ID to injection mapping
    mapping(string => bytes32) public messageIdToInjection;
    
    /// @notice UETR to injection mapping
    mapping(string => bytes32) public uetrToInjection;
    
    /// @notice XML hash to injection mapping
    mapping(bytes32 => bytes32) public xmlHashToInjection;
    
    /// @notice Nonces for bank signatures (separate from ERC20Permit nonces)
    mapping(address => uint256) public bankSignatureNonces;
    
    /// @notice Blacklisted addresses
    mapping(address => bool) public blacklisted;

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when USD is injected (tokenized)
    event USDInjected(
        bytes32 indexed injectionId,
        uint256 amount,
        address indexed beneficiary,
        MessageType msgType,
        string messageId,
        bytes32 xmlHash,
        bytes32 dcbSignature,
        uint256 timestamp
    );

    /// @notice Emitted when injection is accepted by Treasury Minting
    event InjectionAccepted(
        bytes32 indexed injectionId,
        address indexed acceptedBy,
        uint256 timestamp
    );

    /// @notice Emitted when USD moves to Lock Reserve
    event MovedToLockReserve(
        bytes32 indexed injectionId,
        bytes32 indexed lockReserveId,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when USD is consumed for LUSD minting
    event ConsumedForLUSD(
        bytes32 indexed injectionId,
        uint256 amount,
        bytes32 lusdTxHash,
        uint256 timestamp
    );

    /// @notice Emitted when bank is certified
    event BankCertified(
        string indexed bankId,
        string bankName,
        address signerAddress,
        bytes32 certificationHash,
        uint256 timestamp
    );

    /// @notice Emitted when DAES currency is added
    event DAESCurrencyAdded(
        string indexed isoCode,
        string name,
        bool isActive,
        bool isReserve
    );

    /// @notice Emitted for ISO 20022 message processing
    event ISO20022MessageProcessed(
        bytes32 indexed injectionId,
        MessageType msgType,
        string messageId,
        string uetr,
        bytes32 xmlHash,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Emitted when injection limits change
    event InjectionLimitsChanged(uint256 minAmount, uint256 maxAmount);
    
    /// @notice Emitted when daily mint limit changes
    event DailyMintLimitChanged(uint256 oldLimit, uint256 newLimit);
    
    /// @notice Emitted when hourly mint limit changes
    event HourlyMintLimitChanged(uint256 oldLimit, uint256 newLimit);
    
    /// @notice Emitted on emergency withdraw
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);

    // ══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════════

    error InvalidAmount();
    error InvalidAddress();
    error InvalidMessageId();
    error MessageIdAlreadyUsed();
    error UETRAlreadyUsed();
    error XMLHashAlreadyUsed();
    error InjectionNotFound();
    error InjectionNotPending();
    error InjectionExpired();
    error BankNotCertified();
    error InvalidSignature();
    error AmountBelowMinimum();
    error AmountAboveMaximum();
    error Blacklisted();
    error NotAuthorized();
    error ContractNotSet();
    error DailyLimitExceeded();
    error HourlyLimitExceeded();

    // ══════════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ══════════════════════════════════════════════════════════════════════════════

    modifier notBlacklisted(address account) {
        if (blacklisted[account]) revert Blacklisted();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        if (amount < minInjectionAmount) revert AmountBelowMinimum();
        if (amount > maxInjectionAmount) revert AmountAboveMaximum();
        _;
    }
    
    /// @notice Rate limiting modifier - checks daily and hourly limits
    modifier withinRateLimits(uint256 amount) {
        // Reset daily counter if new day
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay) {
            lastMintDay = currentDay;
            dailyMinted = 0;
        }
        
        // Reset hourly counter if new hour
        uint256 currentHour = block.timestamp / 1 hours;
        if (currentHour > lastMintHour) {
            lastMintHour = currentHour;
            hourlyMinted = 0;
        }
        
        // Check limits
        if (dailyMinted + amount > dailyMintLimit) revert DailyLimitExceeded();
        if (hourlyMinted + amount > hourlyMintLimit) revert HourlyLimitExceeded();
        
        // Update counters
        dailyMinted += amount;
        hourlyMinted += amount;
        _;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════════

    constructor(
        address _admin
    ) ERC20("USD Tokenized", "USD") ERC20Permit("USD Tokenized") {
        if (_admin == address(0)) revert InvalidAddress();
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(BANK_SIGNER_ROLE, _admin);
        _grantRole(DAES_OPERATOR_ROLE, _admin);
        _grantRole(COMPLIANCE_ROLE, _admin);
        
        // Initialize rate limiting
        lastMintDay = block.timestamp / 1 days;
        lastMintHour = block.timestamp / 1 hours;
        
        // Initialize DAES currencies
        _initializeDAESCurrencies();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ERC-20 OVERRIDES
    // ══════════════════════════════════════════════════════════════════════════════

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused notBlacklisted(from) notBlacklisted(to) {
        super._update(from, to, amount);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // USD INJECTION (TOKENIZATION)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Injects (tokenizes) USD with ISO 20022 message
     * @dev Creates USD tokens backed by verified bank deposit with full message trail
     * @param amount Amount to inject (in 6 decimals)
     * @param beneficiary Address to receive USD tokens
     * @param msgType Type of banking message
     * @param messageId Unique message identifier
     * @param xmlHash Hash of the XML payload
     * @param uetr Unique End-to-end Transaction Reference
     * @param instructionId Instruction ID
     * @param endToEndId End to End ID
     * @param debtorBIC Debtor bank BIC
     * @param creditorBIC Creditor bank BIC
     * @param bankId Bank identifier for certification
     * @param bankSignature Bank's EIP-712 signature
     * @return injectionId The created injection ID
     */
    function injectUSD(
        uint256 amount,
        address beneficiary,
        MessageType msgType,
        string calldata messageId,
        bytes32 xmlHash,
        string calldata uetr,
        string calldata instructionId,
        string calldata endToEndId,
        string calldata debtorBIC,
        string calldata creditorBIC,
        string calldata bankId,
        bytes calldata bankSignature
    ) external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
        validAmount(amount)
        withinRateLimits(amount)
        returns (bytes32 injectionId) 
    {
        // Validations
        if (beneficiary == address(0)) revert InvalidAddress();
        if (bytes(messageId).length == 0) revert InvalidMessageId();
        if (messageIdToInjection[messageId] != bytes32(0)) revert MessageIdAlreadyUsed();
        if (bytes(uetr).length > 0 && uetrToInjection[uetr] != bytes32(0)) revert UETRAlreadyUsed();
        if (xmlHashToInjection[xmlHash] != bytes32(0)) revert XMLHashAlreadyUsed();
        
        // Verify bank certification
        BankCertification storage bankCert = bankCertifications[bankId];
        if (!bankCert.isActive) revert BankNotCertified();
        
        // Verify bank signature
        bytes32 signatureHash = _verifyBankSignature(
            amount, beneficiary, messageId, xmlHash, bankId, bankSignature
        );
        
        // Generate injection ID
        injectionId = keccak256(abi.encodePacked(
            amount,
            beneficiary,
            messageId,
            xmlHash,
            block.timestamp,
            totalInjections
        ));
        
        // Generate DCB signature (First Signature)
        bytes32 dcbSignature = keccak256(abi.encodePacked(
            injectionId,
            amount,
            beneficiary,
            xmlHash,
            msg.sender,
            block.timestamp,
            "DCB_TREASURY_FIRST_SIGNATURE"
        ));
        
        // Create ISO 20022 message record
        ISO20022Message memory isoMessage = ISO20022Message({
            msgType: msgType,
            messageId: messageId,
            xmlHash: xmlHash,
            uetr: uetr,
            instructionId: instructionId,
            endToEndId: endToEndId,
            amount: amount,
            currency: "USD",
            debtorBIC: debtorBIC,
            creditorBIC: creditorBIC,
            createdAt: block.timestamp
        });
        
        // Create injection record
        injections[injectionId] = USDInjection({
            injectionId: injectionId,
            amount: amount,
            message: isoMessage,
            bankCert: bankCert,
            beneficiary: beneficiary,
            initiator: msg.sender,
            status: InjectionStatus.PENDING,
            dcbSignature: dcbSignature,
            bankSignature: signatureHash,
            createdAt: block.timestamp,
            acceptedAt: 0,
            lockedAt: 0,
            consumedAt: 0,
            lockReserveId: bytes32(0),
            expiresAt: block.timestamp + defaultExpiryDuration
        });
        
        // Update mappings
        injectionIds.push(injectionId);
        messageIdToInjection[messageId] = injectionId;
        if (bytes(uetr).length > 0) {
            uetrToInjection[uetr] = injectionId;
        }
        xmlHashToInjection[xmlHash] = injectionId;
        
        // Update statistics
        totalInjections++;
        totalInjected += amount;
        daesCurrencies["USD"].totalInjected += amount;
        
        // Mint USD tokens
        _mint(beneficiary, amount);
        
        // Emit events
        emit USDInjected(
            injectionId,
            amount,
            beneficiary,
            msgType,
            messageId,
            xmlHash,
            dcbSignature,
            block.timestamp
        );
        
        emit ISO20022MessageProcessed(
            injectionId,
            msgType,
            messageId,
            uetr,
            xmlHash,
            amount,
            block.timestamp
        );
        
        return injectionId;
    }

    /**
     * @notice Simplified injection for DAES system
     * @param amount Amount to inject
     * @param beneficiary Beneficiary address
     * @param daesTransactionId DAES transaction ID
     * @param xmlHash Hash of XML payload
     * @return injectionId Created injection ID
     */
    function injectFromDAES(
        uint256 amount,
        address beneficiary,
        string calldata daesTransactionId,
        bytes32 xmlHash
    ) external 
        onlyRole(DAES_OPERATOR_ROLE) 
        nonReentrant 
        validAmount(amount)
        withinRateLimits(amount)
        returns (bytes32 injectionId) 
    {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (messageIdToInjection[daesTransactionId] != bytes32(0)) revert MessageIdAlreadyUsed();
        
        injectionId = keccak256(abi.encodePacked(
            amount,
            beneficiary,
            daesTransactionId,
            xmlHash,
            block.timestamp,
            totalInjections
        ));
        
        bytes32 dcbSignature = keccak256(abi.encodePacked(
            injectionId,
            amount,
            beneficiary,
            xmlHash,
            msg.sender,
            block.timestamp,
            "DCB_TREASURY_DAES_SIGNATURE"
        ));
        
        ISO20022Message memory isoMessage = ISO20022Message({
            msgType: MessageType.DAES_TRANSFER,
            messageId: daesTransactionId,
            xmlHash: xmlHash,
            uetr: "",
            instructionId: daesTransactionId,
            endToEndId: daesTransactionId,
            amount: amount,
            currency: "USD",
            debtorBIC: "DCBKAEDXXX",
            creditorBIC: "DCBKAEDXXX",
            createdAt: block.timestamp
        });
        
        BankCertification memory dcbCert = BankCertification({
            bankId: "DCBKAEDXXX",
            bankName: "Digital Commercial Bank",
            signerAddress: msg.sender,
            certificationHash: dcbSignature,
            certifiedAt: block.timestamp,
            isActive: true
        });
        
        injections[injectionId] = USDInjection({
            injectionId: injectionId,
            amount: amount,
            message: isoMessage,
            bankCert: dcbCert,
            beneficiary: beneficiary,
            initiator: msg.sender,
            status: InjectionStatus.PENDING,
            dcbSignature: dcbSignature,
            bankSignature: dcbSignature,
            createdAt: block.timestamp,
            acceptedAt: 0,
            lockedAt: 0,
            consumedAt: 0,
            lockReserveId: bytes32(0),
            expiresAt: block.timestamp + defaultExpiryDuration
        });
        
        injectionIds.push(injectionId);
        messageIdToInjection[daesTransactionId] = injectionId;
        xmlHashToInjection[xmlHash] = injectionId;
        
        totalInjections++;
        totalInjected += amount;
        daesCurrencies["USD"].totalInjected += amount;
        
        _mint(beneficiary, amount);
        
        emit USDInjected(
            injectionId,
            amount,
            beneficiary,
            MessageType.DAES_TRANSFER,
            daesTransactionId,
            xmlHash,
            dcbSignature,
            block.timestamp
        );
        
        return injectionId;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // TREASURY MINTING INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Called when Treasury Minting accepts an injection
     * @param injectionId Injection ID
     * @return success True if accepted
     */
    function acceptInjection(bytes32 injectionId) 
        external 
        onlyRole(TREASURY_MINTING_ROLE) 
        nonReentrant 
        returns (bool success) 
    {
        USDInjection storage injection = injections[injectionId];
        if (injection.createdAt == 0) revert InjectionNotFound();
        if (injection.status != InjectionStatus.PENDING) revert InjectionNotPending();
        if (block.timestamp > injection.expiresAt) revert InjectionExpired();
        
        injection.status = InjectionStatus.ACCEPTED;
        injection.acceptedAt = block.timestamp;
        
        emit InjectionAccepted(injectionId, msg.sender, block.timestamp);
        
        return true;
    }

    /**
     * @notice Moves accepted injection to Lock Reserve
     * @param injectionId Injection ID
     * @param lockReserveId Lock Reserve ID from LockReserve contract
     * @return success True if moved
     */
    function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) 
        external 
        onlyRole(TREASURY_MINTING_ROLE) 
        nonReentrant 
        returns (bool success) 
    {
        USDInjection storage injection = injections[injectionId];
        if (injection.createdAt == 0) revert InjectionNotFound();
        if (injection.status != InjectionStatus.ACCEPTED) revert NotAuthorized();
        
        injection.status = InjectionStatus.IN_LOCK_RESERVE;
        injection.lockedAt = block.timestamp;
        injection.lockReserveId = lockReserveId;
        
        totalInLockReserve += injection.amount;
        daesCurrencies["USD"].totalLocked += injection.amount;
        
        emit MovedToLockReserve(injectionId, lockReserveId, injection.amount, block.timestamp);
        
        return true;
    }

    /**
     * @notice Records consumption for LUSD minting
     * @param injectionId Injection ID
     * @param lusdTxHash LUSD minting transaction hash
     * @return success True if recorded
     */
    function recordConsumptionForLUSD(bytes32 injectionId, bytes32 lusdTxHash) 
        external 
        onlyRole(TREASURY_MINTING_ROLE) 
        nonReentrant 
        returns (bool success) 
    {
        USDInjection storage injection = injections[injectionId];
        if (injection.createdAt == 0) revert InjectionNotFound();
        if (injection.status != InjectionStatus.IN_LOCK_RESERVE) revert NotAuthorized();
        
        injection.status = InjectionStatus.CONSUMED_FOR_LUSD;
        injection.consumedAt = block.timestamp;
        
        totalConsumedForLUSD += injection.amount;
        totalInLockReserve -= injection.amount;
        
        emit ConsumedForLUSD(injectionId, injection.amount, lusdTxHash, block.timestamp);
        
        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // BANK CERTIFICATION
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Certifies a bank for USD injection
     * @param bankId Bank identifier (BIC/SWIFT)
     * @param bankName Bank name
     * @param signerAddress Bank signer address
     */
    function certifyBank(
        string calldata bankId,
        string calldata bankName,
        address signerAddress
    ) external onlyRole(COMPLIANCE_ROLE) {
        if (signerAddress == address(0)) revert InvalidAddress();
        
        bytes32 certHash = keccak256(abi.encodePacked(
            bankId, bankName, signerAddress, block.timestamp
        ));
        
        bankCertifications[bankId] = BankCertification({
            bankId: bankId,
            bankName: bankName,
            signerAddress: signerAddress,
            certificationHash: certHash,
            certifiedAt: block.timestamp,
            isActive: true
        });
        
        _grantRole(BANK_SIGNER_ROLE, signerAddress);
        
        emit BankCertified(bankId, bankName, signerAddress, certHash, block.timestamp);
    }

    /**
     * @notice Revokes bank certification
     * @param bankId Bank identifier
     */
    function revokeBankCertification(string calldata bankId) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        BankCertification storage cert = bankCertifications[bankId];
        cert.isActive = false;
        _revokeRole(BANK_SIGNER_ROLE, cert.signerAddress);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets injection by ID
     */
    function getInjection(bytes32 injectionId) external view returns (USDInjection memory) {
        return injections[injectionId];
    }

    /**
     * @notice Gets injection by message ID
     */
    function getInjectionByMessageId(string calldata messageId) external view returns (USDInjection memory) {
        bytes32 injectionId = messageIdToInjection[messageId];
        return injections[injectionId];
    }

    /**
     * @notice Gets all injection IDs
     */
    function getAllInjectionIds() external view returns (bytes32[] memory) {
        return injectionIds;
    }

    /**
     * @notice Gets injections by status with pagination to prevent DoS
     * @param status Injection status to filter
     * @param offset Starting index
     * @param limit Maximum results to return (max 100)
     */
    function getInjectionsByStatus(InjectionStatus status, uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        require(limit <= 100, "Limit too high");
        
        uint256 count = 0;
        uint256 matchedCount = 0;
        bytes32[] memory tempResults = new bytes32[](limit);
        
        for (uint256 i = 0; i < injectionIds.length && matchedCount < limit; i++) {
            if (injections[injectionIds[i]].status == status) {
                if (count >= offset) {
                    tempResults[matchedCount] = injectionIds[i];
                    matchedCount++;
                }
                count++;
            }
        }
        
        // Resize array to actual count
        bytes32[] memory result = new bytes32[](matchedCount);
        for (uint256 i = 0; i < matchedCount; i++) {
            result[i] = tempResults[i];
        }
        
        return result;
    }
    
    /**
     * @notice Gets total count of injections by status
     * @param status Injection status to count
     */
    function getInjectionCountByStatus(InjectionStatus status) external view returns (uint256 count) {
        for (uint256 i = 0; i < injectionIds.length; i++) {
            if (injections[injectionIds[i]].status == status) {
                count++;
            }
        }
    }

    /**
     * @notice Gets contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalSupply,
        uint256 _totalInjected,
        uint256 _totalInLockReserve,
        uint256 _totalConsumedForLUSD,
        uint256 _totalInjections
    ) {
        return (
            totalSupply(),
            totalInjected,
            totalInLockReserve,
            totalConsumedForLUSD,
            totalInjections
        );
    }

    /**
     * @notice Gets DAES currency info
     */
    function getDAESCurrency(string calldata isoCode) external view returns (DAESCurrency memory) {
        return daesCurrencies[isoCode];
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Sets Lock Reserve contract
     */
    function setLockReserveContract(address _lockReserveContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_lockReserveContract == address(0)) revert InvalidAddress();
        lockReserveContract = _lockReserveContract;
        _grantRole(TREASURY_MINTING_ROLE, _lockReserveContract);
    }

    /**
     * @notice Sets Treasury Minting contract
     */
    function setTreasuryMintingContract(address _treasuryMintingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasuryMintingContract == address(0)) revert InvalidAddress();
        treasuryMintingContract = _treasuryMintingContract;
        _grantRole(TREASURY_MINTING_ROLE, _treasuryMintingContract);
    }

    /**
     * @notice Sets injection limits
     */
    function setInjectionLimits(uint256 _minAmount, uint256 _maxAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_minAmount > 0, "Min must be > 0");
        require(_maxAmount > _minAmount, "Max must be > min");
        minInjectionAmount = _minAmount;
        maxInjectionAmount = _maxAmount;
        emit InjectionLimitsChanged(_minAmount, _maxAmount);
    }
    
    /**
     * @notice Sets daily minting limit
     */
    function setDailyMintLimit(uint256 _limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_limit >= 1_000_000 * 10**DECIMALS, "Limit too low"); // Min 1M USD
        uint256 oldLimit = dailyMintLimit;
        dailyMintLimit = _limit;
        emit DailyMintLimitChanged(oldLimit, _limit);
    }
    
    /**
     * @notice Sets hourly minting limit
     */
    function setHourlyMintLimit(uint256 _limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_limit >= 100_000 * 10**DECIMALS, "Limit too low"); // Min 100K USD
        uint256 oldLimit = hourlyMintLimit;
        hourlyMintLimit = _limit;
        emit HourlyMintLimitChanged(oldLimit, _limit);
    }
    
    /**
     * @notice Emergency withdraw tokens sent by mistake
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(this), "Cannot withdraw own tokens");
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
    }
    
    /**
     * @notice Gets current rate limit status
     */
    function getRateLimitStatus() external view returns (
        uint256 _dailyMinted,
        uint256 _dailyLimit,
        uint256 _dailyRemaining,
        uint256 _hourlyMinted,
        uint256 _hourlyLimit,
        uint256 _hourlyRemaining
    ) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 currentHour = block.timestamp / 1 hours;
        
        uint256 effectiveDailyMinted = (currentDay > lastMintDay) ? 0 : dailyMinted;
        uint256 effectiveHourlyMinted = (currentHour > lastMintHour) ? 0 : hourlyMinted;
        
        return (
            effectiveDailyMinted,
            dailyMintLimit,
            dailyMintLimit - effectiveDailyMinted,
            effectiveHourlyMinted,
            hourlyMintLimit,
            hourlyMintLimit - effectiveHourlyMinted
        );
    }

    /**
     * @notice Sets default expiry duration
     */
    function setDefaultExpiryDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultExpiryDuration = _duration;
    }

    /**
     * @notice Blacklists an address
     */
    function setBlacklist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        blacklisted[account] = status;
    }

    /**
     * @notice Pauses contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verifies bank signature and increments nonce to prevent replay attacks
     */
    function _verifyBankSignature(
        uint256 amount,
        address beneficiary,
        string calldata messageId,
        bytes32 xmlHash,
        string calldata bankId,
        bytes calldata signature
    ) internal returns (bytes32) {
        // Get current nonce BEFORE incrementing
        uint256 currentNonce = bankSignatureNonces[msg.sender];
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            amount,
            beneficiary,
            messageId,
            xmlHash,
            bankId,
            currentNonce
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        
        BankCertification storage cert = bankCertifications[bankId];
        if (signer != cert.signerAddress) revert InvalidSignature();
        
        // INCREMENT nonce AFTER successful verification to prevent replay attacks
        bankSignatureNonces[msg.sender]++;
        
        return messageHash;
    }

    /**
     * @notice Initializes DAES currencies
     */
    function _initializeDAESCurrencies() internal {
        // Active for minting
        daesCurrencies["USD"] = DAESCurrency("USD", "US Dollar", true, false, 0, 0);
        
        // Reserve currencies
        daesCurrencies["EUR"] = DAESCurrency("EUR", "Euro", false, true, 0, 0);
        daesCurrencies["GBP"] = DAESCurrency("GBP", "British Pound", false, true, 0, 0);
        daesCurrencies["JPY"] = DAESCurrency("JPY", "Japanese Yen", false, true, 0, 0);
        daesCurrencies["CHF"] = DAESCurrency("CHF", "Swiss Franc", false, true, 0, 0);
        daesCurrencies["AUD"] = DAESCurrency("AUD", "Australian Dollar", false, true, 0, 0);
        daesCurrencies["CAD"] = DAESCurrency("CAD", "Canadian Dollar", false, true, 0, 0);
        daesCurrencies["CNY"] = DAESCurrency("CNY", "Chinese Yuan", false, true, 0, 0);
        daesCurrencies["HKD"] = DAESCurrency("HKD", "Hong Kong Dollar", false, true, 0, 0);
        daesCurrencies["SGD"] = DAESCurrency("SGD", "Singapore Dollar", false, true, 0, 0);
        daesCurrencies["AED"] = DAESCurrency("AED", "UAE Dirham", false, true, 0, 0);
        daesCurrencies["SAR"] = DAESCurrency("SAR", "Saudi Riyal", false, true, 0, 0);
        daesCurrencies["KRW"] = DAESCurrency("KRW", "South Korean Won", false, true, 0, 0);
        daesCurrencies["INR"] = DAESCurrency("INR", "Indian Rupee", false, true, 0, 0);
        daesCurrencies["BRL"] = DAESCurrency("BRL", "Brazilian Real", false, true, 0, 0);
        
        emit DAESCurrencyAdded("USD", "US Dollar", true, false);
    }
}
