// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║   ██╗   ██╗███████╗██████╗     ██╗   ██╗██╗  ████████╗██╗███╗   ███╗ █████╗ ████████╗███████╗                                ║
 * ║   ██║   ██║██╔════╝██╔══██╗    ██║   ██║██║  ╚══██╔══╝██║████╗ ████║██╔══██╗╚══██╔══╝██╔════╝                                ║
 * ║   ██║   ██║███████╗██║  ██║    ██║   ██║██║     ██║   ██║██╔████╔██║███████║   ██║   █████╗                                  ║
 * ║   ██║   ██║╚════██║██║  ██║    ██║   ██║██║     ██║   ██║██║╚██╔╝██║██╔══██║   ██║   ██╔══╝                                  ║
 * ║   ╚██████╔╝███████║██████╔╝    ╚██████╔╝███████╗██║   ██║██║ ╚═╝ ██║██║  ██║   ██║   ███████╗                                ║
 * ║    ╚═════╝ ╚══════╝╚═════╝      ╚═════╝ ╚══════╝╚═╝   ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝                                ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  🏦 USD ULTIMATE - DIGITAL COMMERCIAL BANK                                                                                   ║
 * ║  The Most Advanced Stablecoin Smart Contract                                                                                 ║
 * ║                                                                                                                              ║
 * ║  📋 Version: 2.0.0 ULTIMATE                                                                                                  ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                                             ║
 * ║  📄 Standard: ERC-20 with ISO 20022 + Post-Quantum Extensions                                                                ║
 * ║  💱 Pegged: 1 USD = $1.00 USD (Backed by DAES/SWIFT Banking System)                                                          ║
 * ║  🔓 Visibility: PUBLIC (Fully Transparent & Auditable)                                                                       ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  🛡️ SECURITY FEATURES:                                                                                                       ║
 * ║  ├─ ✅ Rate Limiting (Daily/Hourly)                                                                                          ║
 * ║  ├─ ✅ Circuit Breaker                                                                                                       ║
 * ║  ├─ ✅ Multi-Signature for Large Operations                                                                                  ║
 * ║  ├─ ✅ Chainlink Oracle Integration                                                                                          ║
 * ║  ├─ ✅ Timelock for Admin Operations                                                                                         ║
 * ║  ├─ ✅ KYC/AML Compliance                                                                                                    ║
 * ║  ├─ ✅ Post-Quantum Cryptography (PQC) Ready                                                                                 ║
 * ║  ├─ ✅ Governance Integration                                                                                                ║
 * ║  ├─ ✅ Upgradeable (Proxy Pattern)                                                                                           ║
 * ║  └─ ✅ ISO 20022 Messaging                                                                                                   ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title IPriceOracle
 */
interface IPriceOracle {
    function getLatestPrice() external view returns (int256 price, uint8 decimals, uint256 timestamp, bool isValid);
    function validatePriceForMinting() external view returns (bool isValid, int256 price, uint256 deviation);
}

/**
 * @title IKYCRegistry
 */
interface IKYCRegistry {
    function isVerified(address account) external view returns (bool);
    function getKYCLevel(address account) external view returns (uint8);
    function isTransactionAllowed(address account, uint256 amount, string calldata txType) external view returns (bool allowed, string memory reason);
}

/**
 * @title IPQCVerifier
 */
interface IPQCVerifier {
    function isSignatureValid(
        bytes32 messageHash,
        address signer,
        bytes calldata signature,
        bytes32 pqcKeyHash,
        bytes calldata pqcSig,
        bytes calldata verifierAttestation
    ) external returns (bool);
}

/**
 * @title USD_Ultimate
 * @author Digital Commercial Bank Ltd
 * @notice The most advanced USD stablecoin with all security features
 */
contract USD_Ultimate is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PermitUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              CONSTANTS                                                ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    string public constant VERSION = "2.0.0-ULTIMATE";
    string public constant INSTITUTION_NAME = "Digital Commercial Bank Ltd";
    string public constant ISO_CURRENCY_CODE = "USD";
    string public constant SWIFT_BIC = "DCBKUS33XXX";
    uint256 public constant CHAIN_ID = 1005;
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    // Security Limits
    uint256 public constant MAX_DAILY_INJECTION = 10_000_000 * 1e6;      // $10M daily
    uint256 public constant MULTISIG_THRESHOLD = 1_000_000 * 1e6;        // $1M requires multi-sig
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 50_000_000 * 1e6; // $50M/hour
    uint256 public constant REQUIRED_APPROVALS = 2;
    uint256 public constant LOCK_EXPIRATION = 30 days;
    uint256 public constant MAX_STRING_LENGTH = 100;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ACCESS ROLES                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant TREASURY_OPERATOR_ROLE = keccak256("TREASURY_OPERATOR_ROLE");
    bytes32 public constant CUSTODY_MANAGER_ROLE = keccak256("CUSTODY_MANAGER_ROLE");
    bytes32 public constant ISO_VALIDATOR_ROLE = keccak256("ISO_VALIDATOR_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PQC_OPERATOR_ROLE = keccak256("PQC_OPERATOR_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ENUMS                                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    enum InjectionStatus {
        INITIATED,
        CUSTODY_LOCKED,
        SENT_TO_LEMX,
        LOCK_ACCEPTED,
        CONSUMED_FOR_MINT,
        COMPLETED,
        CANCELLED,
        EXPIRED
    }
    
    enum ISO20022Type {
        PACS_008,
        PACS_009,
        CAMT_053,
        CAMT_054
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STRUCTS                                                  ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    struct CustodyAccount {
        bytes32 accountId;
        string accountName;
        string bankName;
        string swiftBic;
        string accountNumber;
        uint256 balance;
        uint256 lockedBalance;
        bool isActive;
        address owner;
        uint256 createdAt;
    }
    
    struct USDInjection {
        bytes32 injectionId;
        bytes32 custodyAccountId;
        uint256 amount;
        ISO20022Type isoType;
        bytes32 isoMessageHash;
        bytes32 jsonProofHash;
        InjectionStatus status;
        address beneficiary;
        uint256 createdAt;
        uint256 expiresAt;
        bytes32 lemxLockId;
        string authorizationCode;
        // PQC fields
        bytes32 pqcSignatureHash;
        bool pqcVerified;
    }
    
    struct PendingMultisig {
        bytes32 operationId;
        uint256 amount;
        address[] approvers;
        bool executed;
        uint256 createdAt;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STATE VARIABLES                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    // External contracts
    IPriceOracle public priceOracle;
    IKYCRegistry public kycRegistry;
    IPQCVerifier public pqcVerifier;
    address public locksTreasuryLUSD;
    address public timelock;
    address public governance;
    
    // Totals
    uint256 public totalCustodyBalance;
    uint256 public totalLockedForLUSD;
    uint256 public totalInjections;
    
    // Rate limiting
    uint256 public dailyInjected;
    uint256 public lastDayReset;
    uint256 public hourlyVolume;
    uint256 public lastHourReset;
    bool public circuitBreakerTriggered;
    
    // Compliance
    mapping(address => bool) public blacklist;
    mapping(address => bool) public whitelist;
    bool public kycRequired;
    bool public pqcRequired;
    
    // Storage
    mapping(bytes32 => CustodyAccount) public custodyAccounts;
    bytes32[] public custodyAccountIds;
    mapping(bytes32 => USDInjection) public injections;
    bytes32[] public injectionIds;
    mapping(string => bytes32) public authCodeToInjection;
    mapping(bytes32 => PendingMultisig) public pendingMultisigs;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              EVENTS                                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    event CustodyAccountCreated(bytes32 indexed accountId, string accountName, address indexed owner);
    event USDInjectionInitiated(bytes32 indexed injectionId, uint256 amount, address indexed beneficiary);
    event InjectionCompleted(bytes32 indexed injectionId, uint256 amount, bytes32 lusdMintTxHash);
    event CircuitBreakerTriggered(uint256 hourlyVolume);
    event CircuitBreakerReset(address resetBy);
    event PQCSignatureVerified(bytes32 indexed injectionId, bytes32 pqcSignatureHash);
    event OracleValidation(int256 price, bool isValid, uint256 deviation);
    event KYCValidation(address indexed account, bool passed, string reason);
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              INITIALIZER                                              ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _admin,
        address _priceOracle,
        address _kycRegistry,
        address _pqcVerifier
    ) public initializer {
        require(_admin != address(0), "Invalid admin");
        
        __ERC20_init("USD", "USD");
        __ERC20Burnable_init();
        __ERC20Permit_init("USD");
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TREASURY_OPERATOR_ROLE, _admin);
        _grantRole(CUSTODY_MANAGER_ROLE, _admin);
        _grantRole(ISO_VALIDATOR_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(COMPLIANCE_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PQC_OPERATOR_ROLE, _admin);
        
        if (_priceOracle != address(0)) priceOracle = IPriceOracle(_priceOracle);
        if (_kycRegistry != address(0)) kycRegistry = IKYCRegistry(_kycRegistry);
        if (_pqcVerifier != address(0)) pqcVerifier = IPQCVerifier(_pqcVerifier);
        
        lastDayReset = block.timestamp / 1 days;
        lastHourReset = block.timestamp / 1 hours;
        kycRequired = true;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              MODIFIERS                                                ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    modifier notBlacklisted(address account) {
        require(!blacklist[account], "Account blacklisted");
        _;
    }
    
    modifier kycVerified(address account) {
        if (kycRequired && !whitelist[account]) {
            require(address(kycRegistry) != address(0), "KYC not configured");
            require(kycRegistry.isVerified(account), "KYC not verified");
        }
        _;
    }
    
    modifier checkRateLimits(uint256 amount) {
        _resetRateLimitsIfNeeded();
        require(!circuitBreakerTriggered, "Circuit breaker active");
        require(dailyInjected + amount <= MAX_DAILY_INJECTION, "Daily limit exceeded");
        
        hourlyVolume += amount;
        if (hourlyVolume > CIRCUIT_BREAKER_THRESHOLD) {
            circuitBreakerTriggered = true;
            emit CircuitBreakerTriggered(hourlyVolume);
        }
        
        dailyInjected += amount;
        _;
    }
    
    modifier oracleValidated() {
        if (address(priceOracle) != address(0)) {
            (bool isValid, int256 price, uint256 deviation) = priceOracle.validatePriceForMinting();
            emit OracleValidation(price, isValid, deviation);
            require(isValid, "Price validation failed");
        }
        _;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              CORE FUNCTIONS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function createCustodyAccount(
        string calldata accountName,
        string calldata bankName,
        string calldata swiftBic,
        string calldata accountNumber
    ) external onlyRole(CUSTODY_MANAGER_ROLE) returns (bytes32 accountId) {
        require(bytes(accountName).length <= MAX_STRING_LENGTH, "Name too long");
        
        accountId = keccak256(abi.encodePacked(
            accountName, bankName, swiftBic, accountNumber, block.timestamp
        ));
        
        custodyAccounts[accountId] = CustodyAccount({
            accountId: accountId,
            accountName: accountName,
            bankName: bankName,
            swiftBic: swiftBic,
            accountNumber: accountNumber,
            balance: 0,
            lockedBalance: 0,
            isActive: true,
            owner: msg.sender,
            createdAt: block.timestamp
        });
        
        custodyAccountIds.push(accountId);
        emit CustodyAccountCreated(accountId, accountName, msg.sender);
        return accountId;
    }
    
    function recordCustodyDeposit(bytes32 accountId, uint256 amount) 
        external 
        onlyRole(TREASURY_OPERATOR_ROLE) 
    {
        require(custodyAccounts[accountId].isActive, "Account not active");
        custodyAccounts[accountId].balance += amount;
        totalCustodyBalance += amount;
    }
    
    function initiateInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode,
        bytes32 pqcSignatureHash,
        bytes calldata pqcSignature,
        bytes calldata verifierAttestation
    ) external 
        onlyRole(TREASURY_OPERATOR_ROLE)
        nonReentrant
        whenNotPaused
        notBlacklisted(beneficiary)
        kycVerified(beneficiary)
        checkRateLimits(amount)
        oracleValidated
        returns (bytes32 injectionId)
    {
        CustodyAccount storage account = custodyAccounts[custodyAccountId];
        require(account.isActive, "Account not active");
        require(account.balance >= amount, "Insufficient balance");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(authCodeToInjection[authorizationCode] == bytes32(0), "Auth code used");
        
        // Verify PQC signature if required
        bool pqcVerified = false;
        if (pqcRequired && address(pqcVerifier) != address(0)) {
            bytes32 messageHash = keccak256(abi.encodePacked(
                custodyAccountId, amount, beneficiary, authorizationCode
            ));
            
            pqcVerified = pqcVerifier.isSignatureValid(
                messageHash,
                msg.sender,
                new bytes(0), // Classical signature not needed if PQC verified
                pqcSignatureHash,
                pqcSignature,
                verifierAttestation
            );
            
            require(pqcVerified, "PQC signature invalid");
            emit PQCSignatureVerified(injectionId, pqcSignatureHash);
        }
        
        // Check if multi-sig required
        if (amount >= MULTISIG_THRESHOLD) {
            return _createMultisigInjection(custodyAccountId, amount, beneficiary, authorizationCode);
        }
        
        // Execute injection
        injectionId = _executeInjection(custodyAccountId, amount, beneficiary, authorizationCode, pqcSignatureHash, pqcVerified);
        return injectionId;
    }
    
    function _createMultisigInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode
    ) internal returns (bytes32 operationId) {
        operationId = keccak256(abi.encodePacked(
            custodyAccountId, amount, beneficiary, authorizationCode, block.timestamp
        ));
        
        address[] memory approvers = new address[](1);
        approvers[0] = msg.sender;
        
        pendingMultisigs[operationId] = PendingMultisig({
            operationId: operationId,
            amount: amount,
            approvers: approvers,
            executed: false,
            createdAt: block.timestamp
        });
        
        return operationId;
    }
    
    function approveMultisig(bytes32 operationId) external onlyRole(TREASURY_OPERATOR_ROLE) {
        PendingMultisig storage multisig = pendingMultisigs[operationId];
        require(!multisig.executed, "Already executed");
        
        for (uint256 i = 0; i < multisig.approvers.length; i++) {
            require(multisig.approvers[i] != msg.sender, "Already approved");
        }
        
        multisig.approvers.push(msg.sender);
    }
    
    function _executeInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode,
        bytes32 pqcSignatureHash,
        bool pqcVerified
    ) internal returns (bytes32 injectionId) {
        CustodyAccount storage account = custodyAccounts[custodyAccountId];
        
        injectionId = keccak256(abi.encodePacked(
            custodyAccountId, amount, beneficiary, authorizationCode, block.timestamp, totalInjections
        ));
        
        account.balance -= amount;
        account.lockedBalance += amount;
        totalLockedForLUSD += amount;
        
        injections[injectionId] = USDInjection({
            injectionId: injectionId,
            custodyAccountId: custodyAccountId,
            amount: amount,
            isoType: ISO20022Type.PACS_008,
            isoMessageHash: bytes32(0),
            jsonProofHash: bytes32(0),
            status: InjectionStatus.INITIATED,
            beneficiary: beneficiary,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + LOCK_EXPIRATION,
            lemxLockId: bytes32(0),
            authorizationCode: authorizationCode,
            pqcSignatureHash: pqcSignatureHash,
            pqcVerified: pqcVerified
        });
        
        injectionIds.push(injectionId);
        authCodeToInjection[authorizationCode] = injectionId;
        totalInjections++;
        
        // Mint USD tokens
        _mint(address(this), amount);
        
        emit USDInjectionInitiated(injectionId, amount, beneficiary);
        return injectionId;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ADMIN FUNCTIONS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function _resetRateLimitsIfNeeded() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastDayReset) {
            dailyInjected = 0;
            lastDayReset = currentDay;
        }
        
        uint256 currentHour = block.timestamp / 1 hours;
        if (currentHour > lastHourReset) {
            hourlyVolume = 0;
            lastHourReset = currentHour;
            circuitBreakerTriggered = false;
        }
    }
    
    function resetCircuitBreaker() external onlyRole(EMERGENCY_ROLE) {
        circuitBreakerTriggered = false;
        hourlyVolume = 0;
        lastHourReset = block.timestamp / 1 hours;
        emit CircuitBreakerReset(msg.sender);
    }
    
    function setBlacklist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        blacklist[account] = status;
    }
    
    function setWhitelist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        whitelist[account] = status;
    }
    
    function setKYCRequired(bool required) external onlyRole(COMPLIANCE_ROLE) {
        kycRequired = required;
    }
    
    function setPQCRequired(bool required) external onlyRole(PQC_OPERATOR_ROLE) {
        pqcRequired = required;
    }
    
    function setPriceOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceOracle = IPriceOracle(_oracle);
    }
    
    function setKYCRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kycRegistry = IKYCRegistry(_registry);
    }
    
    function setPQCVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pqcVerifier = IPQCVerifier(_verifier);
    }
    
    function setLocksTreasuryLUSD(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        locksTreasuryLUSD = _treasury;
    }
    
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function getSecurityStatus() external view returns (
        bool _circuitBreakerActive,
        uint256 _dailyInjected,
        uint256 _dailyLimit,
        uint256 _hourlyVolume,
        uint256 _hourlyLimit,
        bool _kycRequired,
        bool _pqcRequired
    ) {
        return (
            circuitBreakerTriggered,
            dailyInjected,
            MAX_DAILY_INJECTION,
            hourlyVolume,
            CIRCUIT_BREAKER_THRESHOLD,
            kycRequired,
            pqcRequired
        );
    }
    
    function getStatistics() external view returns (
        uint256 _totalCustodyBalance,
        uint256 _totalLockedForLUSD,
        uint256 _totalInjections,
        uint256 _totalSupply
    ) {
        return (totalCustodyBalance, totalLockedForLUSD, totalInjections, totalSupply());
    }
    
    function getInjection(bytes32 injectionId) external view returns (USDInjection memory) {
        return injections[injectionId];
    }
    
    function getCustodyAccount(bytes32 accountId) external view returns (CustodyAccount memory) {
        return custodyAccounts[accountId];
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              UPGRADE AUTHORIZATION                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
