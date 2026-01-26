// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                   ║
 * ║    ██╗   ██╗███████╗██████╗     ████████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗██╗███████╗███████╗██████╗  ║
 * ║    ██║   ██║██╔════╝██╔══██╗    ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║██║╚══███╔╝██╔════╝██╔══██╗ ║
 * ║    ██║   ██║███████╗██║  ██║       ██║   ██║   ██║█████╔╝ █████╗  ██╔██╗ ██║██║  ███╔╝ █████╗  ██║  ██║ ║
 * ║    ██║   ██║╚════██║██║  ██║       ██║   ██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║██║ ███╔╝  ██╔══╝  ██║  ██║ ║
 * ║    ╚██████╔╝███████║██████╔╝       ██║   ╚██████╔╝██║  ██╗███████╗██║ ╚████║██║███████╗███████╗██████╔╝ ║
 * ║     ╚═════╝ ╚══════╝╚═════╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝╚═════╝  ║
 * ║                                                                                                   ║
 * ║─────────────────────────────────────────────────────────────────────────────────────────────────  ║
 * ║                                                                                                   ║
 * ║                  ╔══════════════════════════════════════════════════════════╗                     ║
 * ║                  ║          DIGITAL COMMERCIAL BANK TREASURY                ║                     ║
 * ║                  ║               ═══════════════════════                    ║                     ║
 * ║                  ║                                                          ║                     ║
 * ║                  ║        ┌──────────────────────────────────┐              ║                     ║
 * ║                  ║        │           $1.00 USD              │              ║                     ║
 * ║                  ║        │      BACKED BY BANK DEPOSITS     │              ║                     ║
 * ║                  ║        └──────────────────────────────────┘              ║                     ║
 * ║                  ║                                                          ║                     ║
 * ║                  ╚══════════════════════════════════════════════════════════╝                     ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Contract: USD (Tokenized US Dollars)         Network: LemonChain (1006)                          ║
 * ║  Version: 5.0.0                               License: MIT                                        ║
 * ║  Standard: ERC-20 + ISO 20022 + SWIFT                                                             ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║  FEATURES                                     SIGNATURE FLOW                                      ║
 * ║  ────────                                     ──────────────                                      ║
 * ║  • ERC-20 (6 decimals)                       ① DAES/Bank → Treasury (First)                      ║
 * ║  • ISO 20022 (pacs.008/009, camt.053)        ② Treasury Minting (Second)                         ║
 * ║  • SWIFT (MT103, MT202, MT940)               ③ Lock Reserve → VUSD (Third)                       ║
 * ║  • Role-Based Access Control                                                                      ║
 * ║  • Rate Limiting & Reentrancy Guard          LINKED CONTRACTS                                     ║
 * ║                                              ────────────────                                     ║
 * ║                                              VUSD: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b     ║
 * ║                                              Minter: 0xaccA35529b2FC2041dFb124F83f52120E24377B2   ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title USDTokenized - Tokenized US Dollars with ISO 20022 & SWIFT Support
 * @author Digital Commercial Bank Ltd
 * @notice ERC-20 token representing tokenized USD with full banking message support
 * @dev Implements ERC-20 with ISO 20022/SWIFT verification and DAES integration
 * @custom:security-contact rwa@digcommbank.com
 * @custom:version 5.0.0
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

contract USDTokenized is ERC20, ERC20Burnable, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ========================================================================================================
    // CONSTANTS
    // ========================================================================================================

    string public constant VERSION = "5.0.0";
    uint8 private constant DECIMALS = 6;
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice Official VUSD Contract (Virtual USD)
    address public constant VUSD_CONTRACT = 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b;
    
    /// @notice Authorized Minter Wallet for VUSD
    address public constant VUSD_MINTER_WALLET = 0xaccA35529b2FC2041dFb124F83f52120E24377B2;

    // ========================================================================================================
    // ROLES
    // ========================================================================================================

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BANK_SIGNER_ROLE = keccak256("BANK_SIGNER_ROLE");
    bytes32 public constant DAES_OPERATOR_ROLE = keccak256("DAES_OPERATOR_ROLE");
    bytes32 public constant TREASURY_MINTING_ROLE = keccak256("TREASURY_MINTING_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ========================================================================================================
    // ENUMS
    // ========================================================================================================

    enum MessageType {
        ISO_PACS_008,
        ISO_PACS_009,
        ISO_CAMT_053,
        ISO_CAMT_054,
        SWIFT_MT103,
        SWIFT_MT202,
        SWIFT_MT940,
        SWIFT_MT950,
        DAES_TRANSFER,
        MANUAL_VERIFIED
    }

    enum InjectionStatus {
        PENDING,
        ACCEPTED,
        IN_LOCK_RESERVE,
        CONSUMED_FOR_VUSD,
        CANCELLED,
        EXPIRED
    }

    // ========================================================================================================
    // STRUCTS
    // ========================================================================================================

    struct BankCertification {
        string bankId;
        string bankName;
        address signerAddress;
        bytes32 certificationHash;
        uint256 certifiedAt;
        bool isActive;
    }

    struct ISO20022Message {
        MessageType msgType;
        string messageId;
        bytes32 xmlHash;
        string uetr;
        string instructionId;
        string endToEndId;
        uint256 amount;
        string currency;
        uint256 createdAt;
    }

    struct USDInjection {
        bytes32 injectionId;
        uint256 amount;
        ISO20022Message message;
        BankCertification bankCert;
        address beneficiary;
        address initiator;
        InjectionStatus status;
        bytes32 dcbSignature;
        bytes32 bankSignature;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 lockedAt;
        uint256 consumedAt;
        bytes32 lockReserveId;
        uint256 expiresAt;
    }

    struct DAESCurrency {
        string isoCode;
        string name;
        bool isActive;
        bool isReserve;
        uint256 totalInjected;
        uint256 totalLocked;
    }

    // ========================================================================================================
    // STATE VARIABLES
    // ========================================================================================================

    address public lockReserveContract;
    address public treasuryMintingContract;
    
    uint256 public totalInjected;
    uint256 public totalInLockReserve;
    uint256 public totalConsumedForVUSD;
    uint256 public totalInjections;
    
    uint256 public defaultExpiryDuration = 7 days;
    uint256 public minInjectionAmount = 100 * 10**DECIMALS;
    uint256 public maxInjectionAmount = 10_000_000 * 10**DECIMALS;
    
    // Rate Limiting
    uint256 public dailyMintLimit = 100_000_000 * 10**DECIMALS;
    uint256 public dailyMinted;
    uint256 public lastMintDay;
    uint256 public hourlyMintLimit = 10_000_000 * 10**DECIMALS;
    uint256 public hourlyMinted;
    uint256 public lastMintHour;

    // ========================================================================================================
    // MAPPINGS
    // ========================================================================================================

    mapping(bytes32 => USDInjection) public injections;
    bytes32[] public injectionIds;
    mapping(string => BankCertification) public bankCertifications;
    mapping(string => DAESCurrency) public daesCurrencies;
    mapping(string => bytes32) public messageIdToInjection;
    mapping(string => bytes32) public uetrToInjection;
    mapping(bytes32 => bytes32) public xmlHashToInjection;
    mapping(address => uint256) public bankSignatureNonces;
    mapping(address => bool) public blacklisted;

    // ========================================================================================================
    // EVENTS
    // ========================================================================================================

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

    event InjectionAccepted(bytes32 indexed injectionId, address indexed acceptedBy, uint256 timestamp);
    event MovedToLockReserve(bytes32 indexed injectionId, bytes32 indexed lockReserveId, uint256 amount, uint256 timestamp);
    event ConsumedForVUSD(bytes32 indexed injectionId, uint256 amount, bytes32 vusdTxHash, uint256 timestamp);
    event BankCertified(string indexed bankId, string bankName, address signerAddress, bytes32 certificationHash, uint256 timestamp);
    event DAESCurrencyAdded(string indexed isoCode, string name, bool isActive, bool isReserve);
    event ISO20022MessageProcessed(bytes32 indexed injectionId, MessageType msgType, string messageId, string uetr, bytes32 xmlHash, uint256 amount, uint256 timestamp);
    event InjectionLimitsChanged(uint256 minAmount, uint256 maxAmount);
    event DailyMintLimitChanged(uint256 oldLimit, uint256 newLimit);
    event HourlyMintLimitChanged(uint256 oldLimit, uint256 newLimit);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);

    // ========================================================================================================
    // ERRORS
    // ========================================================================================================

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

    // ========================================================================================================
    // MODIFIERS
    // ========================================================================================================

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
    
    modifier withinRateLimits(uint256 amount) {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastMintDay) {
            lastMintDay = currentDay;
            dailyMinted = 0;
        }
        
        uint256 currentHour = block.timestamp / 1 hours;
        if (currentHour > lastMintHour) {
            lastMintHour = currentHour;
            hourlyMinted = 0;
        }
        
        if (dailyMinted + amount > dailyMintLimit) revert DailyLimitExceeded();
        if (hourlyMinted + amount > hourlyMintLimit) revert HourlyLimitExceeded();
        
        dailyMinted += amount;
        hourlyMinted += amount;
        _;
    }

    // ========================================================================================================
    // CONSTRUCTOR
    // ========================================================================================================

    constructor(address _admin) ERC20("USD Tokenized", "USD") ERC20Permit("USD Tokenized") {
        if (_admin == address(0)) revert InvalidAddress();
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(BANK_SIGNER_ROLE, _admin);
        _grantRole(DAES_OPERATOR_ROLE, _admin);
        _grantRole(COMPLIANCE_ROLE, _admin);
        
        lastMintDay = block.timestamp / 1 days;
        lastMintHour = block.timestamp / 1 hours;
        
        _initializeDAESCurrencies();
    }

    // ========================================================================================================
    // ERC-20 OVERRIDES
    // ========================================================================================================

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    function _update(address from, address to, uint256 amount) internal override whenNotPaused notBlacklisted(from) notBlacklisted(to) {
        super._update(from, to, amount);
    }

    // ========================================================================================================
    // USD INJECTION (TOKENIZATION) - FIRST SIGNATURE
    // ========================================================================================================

    function injectUSD(
        uint256 amount,
        address beneficiary,
        MessageType msgType,
        string calldata messageId,
        bytes32 xmlHash,
        string calldata uetr,
        string calldata instructionId,
        string calldata endToEndId,
        string calldata bankId,
        bytes calldata bankSignature
    ) external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
        validAmount(amount)
        withinRateLimits(amount)
        returns (bytes32 injectionId) 
    {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (bytes(messageId).length == 0) revert InvalidMessageId();
        if (messageIdToInjection[messageId] != bytes32(0)) revert MessageIdAlreadyUsed();
        if (bytes(uetr).length > 0 && uetrToInjection[uetr] != bytes32(0)) revert UETRAlreadyUsed();
        if (xmlHashToInjection[xmlHash] != bytes32(0)) revert XMLHashAlreadyUsed();
        
        BankCertification storage bankCert = bankCertifications[bankId];
        if (!bankCert.isActive) revert BankNotCertified();
        
        bytes32 signatureHash = _verifyBankSignature(amount, beneficiary, messageId, xmlHash, bankId, bankSignature);
        
        injectionId = keccak256(abi.encodePacked(amount, beneficiary, messageId, xmlHash, block.timestamp, totalInjections));
        
        // FIRST SIGNATURE - DCB Treasury
        bytes32 dcbSignature = keccak256(abi.encodePacked(
            injectionId, amount, beneficiary, xmlHash, msg.sender, block.timestamp, "DCB_TREASURY_FIRST_SIGNATURE_v5"
        ));
        
        ISO20022Message memory isoMessage = ISO20022Message({
            msgType: msgType,
            messageId: messageId,
            xmlHash: xmlHash,
            uetr: uetr,
            instructionId: instructionId,
            endToEndId: endToEndId,
            amount: amount,
            currency: "USD",
            createdAt: block.timestamp
        });
        
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
        
        injectionIds.push(injectionId);
        messageIdToInjection[messageId] = injectionId;
        if (bytes(uetr).length > 0) {
            uetrToInjection[uetr] = injectionId;
        }
        xmlHashToInjection[xmlHash] = injectionId;
        
        totalInjections++;
        totalInjected += amount;
        daesCurrencies["USD"].totalInjected += amount;
        
        _mint(beneficiary, amount);
        
        emit USDInjected(injectionId, amount, beneficiary, msgType, messageId, xmlHash, dcbSignature, block.timestamp);
        emit ISO20022MessageProcessed(injectionId, msgType, messageId, uetr, xmlHash, amount, block.timestamp);
        
        return injectionId;
    }

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
        
        injectionId = keccak256(abi.encodePacked(amount, beneficiary, daesTransactionId, xmlHash, block.timestamp, totalInjections));
        
        bytes32 dcbSignature = keccak256(abi.encodePacked(
            injectionId, amount, beneficiary, xmlHash, msg.sender, block.timestamp, "DCB_TREASURY_DAES_SIGNATURE_v5"
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
            createdAt: block.timestamp
        });
        
        BankCertification memory dcbCert = BankCertification({
            bankId: "DCB",
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
        
        emit USDInjected(injectionId, amount, beneficiary, MessageType.DAES_TRANSFER, daesTransactionId, xmlHash, dcbSignature, block.timestamp);
        
        return injectionId;
    }

    // ========================================================================================================
    // TREASURY MINTING INTEGRATION
    // ========================================================================================================

    function acceptInjection(bytes32 injectionId) external onlyRole(TREASURY_MINTING_ROLE) nonReentrant returns (bool) {
        USDInjection storage injection = injections[injectionId];
        if (injection.createdAt == 0) revert InjectionNotFound();
        if (injection.status != InjectionStatus.PENDING) revert InjectionNotPending();
        if (block.timestamp > injection.expiresAt) revert InjectionExpired();
        
        injection.status = InjectionStatus.ACCEPTED;
        injection.acceptedAt = block.timestamp;
        
        emit InjectionAccepted(injectionId, msg.sender, block.timestamp);
        return true;
    }

    function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) external onlyRole(TREASURY_MINTING_ROLE) nonReentrant returns (bool) {
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

    function recordConsumptionForVUSD(bytes32 injectionId, bytes32 vusdTxHash) external onlyRole(TREASURY_MINTING_ROLE) nonReentrant returns (bool) {
        USDInjection storage injection = injections[injectionId];
        if (injection.createdAt == 0) revert InjectionNotFound();
        if (injection.status != InjectionStatus.IN_LOCK_RESERVE) revert NotAuthorized();
        
        injection.status = InjectionStatus.CONSUMED_FOR_VUSD;
        injection.consumedAt = block.timestamp;
        
        totalConsumedForVUSD += injection.amount;
        totalInLockReserve -= injection.amount;
        
        emit ConsumedForVUSD(injectionId, injection.amount, vusdTxHash, block.timestamp);
        return true;
    }

    // ========================================================================================================
    // BANK CERTIFICATION
    // ========================================================================================================

    function certifyBank(string calldata bankId, string calldata bankName, address signerAddress) external onlyRole(COMPLIANCE_ROLE) {
        if (signerAddress == address(0)) revert InvalidAddress();
        
        bytes32 certHash = keccak256(abi.encodePacked(bankId, bankName, signerAddress, block.timestamp));
        
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

    function revokeBankCertification(string calldata bankId) external onlyRole(COMPLIANCE_ROLE) {
        BankCertification storage cert = bankCertifications[bankId];
        cert.isActive = false;
        _revokeRole(BANK_SIGNER_ROLE, cert.signerAddress);
    }

    // ========================================================================================================
    // VIEW FUNCTIONS
    // ========================================================================================================

    function getInjection(bytes32 injectionId) external view returns (USDInjection memory) {
        return injections[injectionId];
    }

    function getInjectionByMessageId(string calldata messageId) external view returns (USDInjection memory) {
        return injections[messageIdToInjection[messageId]];
    }

    function getAllInjectionIds() external view returns (bytes32[] memory) {
        return injectionIds;
    }

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
        
        bytes32[] memory result = new bytes32[](matchedCount);
        for (uint256 i = 0; i < matchedCount; i++) {
            result[i] = tempResults[i];
        }
        
        return result;
    }
    
    function getInjectionCountByStatus(InjectionStatus status) external view returns (uint256 count) {
        for (uint256 i = 0; i < injectionIds.length; i++) {
            if (injections[injectionIds[i]].status == status) {
                count++;
            }
        }
    }

    function getStatistics() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (totalSupply(), totalInjected, totalInLockReserve, totalConsumedForVUSD, totalInjections);
    }

    function getDAESCurrency(string calldata isoCode) external view returns (DAESCurrency memory) {
        return daesCurrencies[isoCode];
    }
    
    function getRateLimitStatus() external view returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 currentHour = block.timestamp / 1 hours;
        
        uint256 effectiveDailyMinted = (currentDay > lastMintDay) ? 0 : dailyMinted;
        uint256 effectiveHourlyMinted = (currentHour > lastMintHour) ? 0 : hourlyMinted;
        
        return (effectiveDailyMinted, dailyMintLimit, dailyMintLimit - effectiveDailyMinted, effectiveHourlyMinted, hourlyMintLimit, hourlyMintLimit - effectiveHourlyMinted);
    }

    // ========================================================================================================
    // ADMIN FUNCTIONS
    // ========================================================================================================

    function setLockReserveContract(address _lockReserveContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_lockReserveContract == address(0)) revert InvalidAddress();
        lockReserveContract = _lockReserveContract;
        _grantRole(TREASURY_MINTING_ROLE, _lockReserveContract);
    }

    function setTreasuryMintingContract(address _treasuryMintingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasuryMintingContract == address(0)) revert InvalidAddress();
        treasuryMintingContract = _treasuryMintingContract;
        _grantRole(TREASURY_MINTING_ROLE, _treasuryMintingContract);
    }

    function setInjectionLimits(uint256 _minAmount, uint256 _maxAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_minAmount > 0 && _maxAmount > _minAmount, "Invalid limits");
        minInjectionAmount = _minAmount;
        maxInjectionAmount = _maxAmount;
        emit InjectionLimitsChanged(_minAmount, _maxAmount);
    }
    
    function setDailyMintLimit(uint256 _limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_limit >= 1_000_000 * 10**DECIMALS, "Limit too low");
        uint256 oldLimit = dailyMintLimit;
        dailyMintLimit = _limit;
        emit DailyMintLimitChanged(oldLimit, _limit);
    }
    
    function setHourlyMintLimit(uint256 _limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_limit >= 100_000 * 10**DECIMALS, "Limit too low");
        uint256 oldLimit = hourlyMintLimit;
        hourlyMintLimit = _limit;
        emit HourlyMintLimitChanged(oldLimit, _limit);
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(this), "Cannot withdraw own tokens");
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
    }

    function setDefaultExpiryDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_duration >= 1 days && _duration <= 365 days, "Invalid duration");
        defaultExpiryDuration = _duration;
    }

    function setBlacklist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        blacklisted[account] = status;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ========================================================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================================================

    function _verifyBankSignature(
        uint256 amount,
        address beneficiary,
        string calldata messageId,
        bytes32 xmlHash,
        string calldata bankId,
        bytes calldata signature
    ) internal returns (bytes32) {
        uint256 currentNonce = bankSignatureNonces[msg.sender];
        
        bytes32 messageHash = keccak256(abi.encodePacked(amount, beneficiary, messageId, xmlHash, bankId, currentNonce));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        
        BankCertification storage cert = bankCertifications[bankId];
        if (signer != cert.signerAddress) revert InvalidSignature();
        
        bankSignatureNonces[msg.sender]++;
        return messageHash;
    }

    function _initializeDAESCurrencies() internal {
        daesCurrencies["USD"] = DAESCurrency("USD", "US Dollar", true, false, 0, 0);
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
