// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🛡️ KYC COMPLIANCE REGISTRY                                                                      ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                                       ║
 * ║  ├─ Multi-level KYC verification                                                                 ║
 * ║  ├─ AML/CFT compliance tracking                                                                  ║
 * ║  ├─ Jurisdiction-based restrictions                                                              ║
 * ║  ├─ Accredited investor verification                                                             ║
 * ║  ├─ Sanctions list integration                                                                   ║
 * ║  └─ Expiration and renewal system                                                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title KYCComplianceRegistry
 * @author Digital Commercial Bank Ltd
 * @notice Manages KYC/AML compliance for all DCB Treasury operations
 */
contract KYCComplianceRegistry is AccessControl, Pausable {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    string public constant VERSION = "1.0.0";
    
    /// @notice KYC validity period (1 year)
    uint256 public constant KYC_VALIDITY_PERIOD = 365 days;
    
    /// @notice Enhanced due diligence validity (6 months)
    uint256 public constant EDD_VALIDITY_PERIOD = 180 days;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    bytes32 public constant KYC_OFFICER_ROLE = keccak256("KYC_OFFICER_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant SANCTIONS_OFFICER_ROLE = keccak256("SANCTIONS_OFFICER_ROLE");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice KYC verification levels
    enum KYCLevel {
        NONE,           // 0 - Not verified
        BASIC,          // 1 - Basic verification (ID + Address)
        STANDARD,       // 2 - Standard KYC (+ Source of funds)
        ENHANCED,       // 3 - Enhanced due diligence
        INSTITUTIONAL   // 4 - Institutional/Corporate
    }
    
    /// @notice Account status
    enum AccountStatus {
        PENDING,
        ACTIVE,
        SUSPENDED,
        BLOCKED,
        EXPIRED
    }
    
    /// @notice Risk level
    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        PROHIBITED
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct KYCRecord {
        address account;
        KYCLevel level;
        AccountStatus status;
        RiskLevel riskLevel;
        
        // Verification details
        bytes32 identityHash;           // Hash of identity documents
        bytes32 addressHash;            // Hash of address proof
        bytes32 sourceOfFundsHash;      // Hash of source of funds documentation
        
        // Jurisdiction
        bytes2 countryCode;             // ISO 3166-1 alpha-2
        bool isUSPerson;
        bool isAccreditedInvestor;
        bool isPEP;                     // Politically Exposed Person
        
        // Limits
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 singleTransactionLimit;
        
        // Timestamps
        uint256 verifiedAt;
        uint256 expiresAt;
        uint256 lastReviewAt;
        uint256 nextReviewAt;
        
        // Metadata
        address verifiedBy;
        string notes;
    }
    
    struct TransactionRecord {
        bytes32 txId;
        address account;
        uint256 amount;
        string txType;
        uint256 timestamp;
        bool flagged;
        string flagReason;
    }
    
    struct Jurisdiction {
        bytes2 countryCode;
        string countryName;
        bool isRestricted;
        bool isSanctioned;
        KYCLevel minRequiredLevel;
        uint256 maxDailyLimit;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice KYC records
    mapping(address => KYCRecord) public kycRecords;
    address[] public verifiedAccounts;
    
    /// @notice Blacklisted addresses
    mapping(address => bool) public blacklist;
    
    /// @notice Whitelist (bypass some checks)
    mapping(address => bool) public whitelist;
    
    /// @notice Jurisdictions
    mapping(bytes2 => Jurisdiction) public jurisdictions;
    bytes2[] public jurisdictionCodes;
    
    /// @notice Sanctions list
    mapping(address => bool) public sanctionsList;
    
    /// @notice Transaction history for AML
    mapping(address => TransactionRecord[]) public transactionHistory;
    
    /// @notice Daily transaction totals
    mapping(address => mapping(uint256 => uint256)) public dailyTotals;
    
    /// @notice Monthly transaction totals
    mapping(address => mapping(uint256 => uint256)) public monthlyTotals;
    
    /// @notice Total verified accounts
    uint256 public totalVerified;
    
    /// @notice Total blocked accounts
    uint256 public totalBlocked;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event KYCVerified(
        address indexed account,
        KYCLevel level,
        bytes2 countryCode,
        address indexed verifiedBy,
        uint256 expiresAt
    );
    
    event KYCUpdated(
        address indexed account,
        KYCLevel oldLevel,
        KYCLevel newLevel,
        address indexed updatedBy
    );
    
    event KYCExpired(
        address indexed account,
        uint256 expiredAt
    );
    
    event AccountStatusChanged(
        address indexed account,
        AccountStatus oldStatus,
        AccountStatus newStatus,
        string reason
    );
    
    event RiskLevelChanged(
        address indexed account,
        RiskLevel oldLevel,
        RiskLevel newLevel,
        string reason
    );
    
    event AddressBlacklisted(
        address indexed account,
        string reason,
        address indexed blockedBy
    );
    
    event AddressRemovedFromBlacklist(
        address indexed account,
        address indexed removedBy
    );
    
    event SuspiciousActivity(
        address indexed account,
        bytes32 indexed txId,
        string reason,
        uint256 amount
    );
    
    event JurisdictionAdded(
        bytes2 indexed countryCode,
        string countryName,
        bool isRestricted
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(KYC_OFFICER_ROLE, _admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, _admin);
        _grantRole(SANCTIONS_OFFICER_ROLE, _admin);
        
        // Initialize common jurisdictions
        _initializeJurisdictions();
    }
    
    function _initializeJurisdictions() internal {
        // USA - Special handling for accredited investors
        _addJurisdiction("US", "United States", false, false, KYCLevel.ENHANCED, 1000000 * 1e6);
        
        // EU Countries
        _addJurisdiction("DE", "Germany", false, false, KYCLevel.STANDARD, 10000000 * 1e6);
        _addJurisdiction("FR", "France", false, false, KYCLevel.STANDARD, 10000000 * 1e6);
        _addJurisdiction("GB", "United Kingdom", false, false, KYCLevel.STANDARD, 10000000 * 1e6);
        _addJurisdiction("CH", "Switzerland", false, false, KYCLevel.STANDARD, 50000000 * 1e6);
        
        // Restricted jurisdictions
        _addJurisdiction("CN", "China", true, false, KYCLevel.ENHANCED, 100000 * 1e6);
        
        // Sanctioned jurisdictions
        _addJurisdiction("KP", "North Korea", true, true, KYCLevel.INSTITUTIONAL, 0);
        _addJurisdiction("IR", "Iran", true, true, KYCLevel.INSTITUTIONAL, 0);
    }
    
    function _addJurisdiction(
        bytes2 code,
        string memory name,
        bool restricted,
        bool sanctioned,
        KYCLevel minLevel,
        uint256 maxDaily
    ) internal {
        jurisdictions[code] = Jurisdiction({
            countryCode: code,
            countryName: name,
            isRestricted: restricted,
            isSanctioned: sanctioned,
            minRequiredLevel: minLevel,
            maxDailyLimit: maxDaily
        });
        jurisdictionCodes.push(code);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // KYC VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Verifies a new account
     */
    function verifyAccount(
        address account,
        KYCLevel level,
        bytes2 countryCode,
        bytes32 identityHash,
        bytes32 addressHash,
        bytes32 sourceOfFundsHash,
        bool isUSPerson,
        bool isAccreditedInvestor,
        bool isPEP,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        uint256 singleTxLimit
    ) external onlyRole(KYC_OFFICER_ROLE) whenNotPaused {
        require(account != address(0), "Invalid account");
        require(!blacklist[account], "Account blacklisted");
        require(!sanctionsList[account], "Account sanctioned");
        require(level != KYCLevel.NONE, "Invalid KYC level");
        
        Jurisdiction storage jurisdiction = jurisdictions[countryCode];
        require(!jurisdiction.isSanctioned, "Sanctioned jurisdiction");
        require(uint8(level) >= uint8(jurisdiction.minRequiredLevel), "Insufficient KYC level");
        
        // US person restrictions
        if (isUSPerson) {
            require(level >= KYCLevel.ENHANCED, "US persons require enhanced KYC");
            require(isAccreditedInvestor, "US persons must be accredited investors");
        }
        
        // PEP enhanced scrutiny
        RiskLevel riskLevel = RiskLevel.LOW;
        if (isPEP) {
            require(level >= KYCLevel.ENHANCED, "PEP requires enhanced KYC");
            riskLevel = RiskLevel.HIGH;
        }
        
        uint256 expiresAt = block.timestamp + (level >= KYCLevel.ENHANCED ? EDD_VALIDITY_PERIOD : KYC_VALIDITY_PERIOD);
        
        kycRecords[account] = KYCRecord({
            account: account,
            level: level,
            status: AccountStatus.ACTIVE,
            riskLevel: riskLevel,
            identityHash: identityHash,
            addressHash: addressHash,
            sourceOfFundsHash: sourceOfFundsHash,
            countryCode: countryCode,
            isUSPerson: isUSPerson,
            isAccreditedInvestor: isAccreditedInvestor,
            isPEP: isPEP,
            dailyLimit: dailyLimit,
            monthlyLimit: monthlyLimit,
            singleTransactionLimit: singleTxLimit,
            verifiedAt: block.timestamp,
            expiresAt: expiresAt,
            lastReviewAt: block.timestamp,
            nextReviewAt: block.timestamp + 90 days,
            verifiedBy: msg.sender,
            notes: ""
        });
        
        if (kycRecords[account].verifiedAt == 0) {
            verifiedAccounts.push(account);
            totalVerified++;
        }
        
        emit KYCVerified(account, level, countryCode, msg.sender, expiresAt);
    }
    
    /**
     * @notice Updates KYC level
     */
    function updateKYCLevel(
        address account,
        KYCLevel newLevel,
        string calldata reason
    ) external onlyRole(KYC_OFFICER_ROLE) {
        KYCRecord storage record = kycRecords[account];
        require(record.verifiedAt > 0, "Account not verified");
        
        KYCLevel oldLevel = record.level;
        record.level = newLevel;
        record.lastReviewAt = block.timestamp;
        
        // Extend expiry if upgrading
        if (uint8(newLevel) > uint8(oldLevel)) {
            record.expiresAt = block.timestamp + KYC_VALIDITY_PERIOD;
        }
        
        emit KYCUpdated(account, oldLevel, newLevel, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // COMPLIANCE CHECKS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Checks if account is verified and active
     */
    function isVerified(address account) external view returns (bool) {
        if (whitelist[account]) return true;
        if (blacklist[account] || sanctionsList[account]) return false;
        
        KYCRecord storage record = kycRecords[account];
        return record.status == AccountStatus.ACTIVE && 
               record.expiresAt > block.timestamp &&
               record.level != KYCLevel.NONE;
    }
    
    /**
     * @notice Gets KYC level for account
     */
    function getKYCLevel(address account) external view returns (uint8) {
        if (whitelist[account]) return uint8(KYCLevel.INSTITUTIONAL);
        return uint8(kycRecords[account].level);
    }
    
    /**
     * @notice Checks if transaction is allowed
     */
    function isTransactionAllowed(
        address account,
        uint256 amount,
        string calldata txType
    ) external view returns (bool allowed, string memory reason) {
        // Whitelist bypass
        if (whitelist[account]) {
            return (true, "Whitelisted");
        }
        
        // Blacklist/Sanctions check
        if (blacklist[account]) {
            return (false, "Account blacklisted");
        }
        if (sanctionsList[account]) {
            return (false, "Account sanctioned");
        }
        
        KYCRecord storage record = kycRecords[account];
        
        // Not verified
        if (record.verifiedAt == 0) {
            return (false, "Account not verified");
        }
        
        // Expired
        if (record.expiresAt <= block.timestamp) {
            return (false, "KYC expired");
        }
        
        // Suspended/Blocked
        if (record.status != AccountStatus.ACTIVE) {
            return (false, "Account not active");
        }
        
        // Single transaction limit
        if (amount > record.singleTransactionLimit) {
            return (false, "Exceeds single transaction limit");
        }
        
        // Daily limit
        uint256 today = block.timestamp / 1 days;
        if (dailyTotals[account][today] + amount > record.dailyLimit) {
            return (false, "Exceeds daily limit");
        }
        
        // Monthly limit
        uint256 month = block.timestamp / 30 days;
        if (monthlyTotals[account][month] + amount > record.monthlyLimit) {
            return (false, "Exceeds monthly limit");
        }
        
        // Jurisdiction check
        Jurisdiction storage jurisdiction = jurisdictions[record.countryCode];
        if (jurisdiction.isSanctioned) {
            return (false, "Sanctioned jurisdiction");
        }
        
        return (true, "Allowed");
    }
    
    /**
     * @notice Records a transaction for AML monitoring
     */
    function recordTransaction(
        address account,
        uint256 amount,
        string calldata txType
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) returns (bytes32 txId) {
        txId = keccak256(abi.encodePacked(account, amount, txType, block.timestamp));
        
        TransactionRecord memory record = TransactionRecord({
            txId: txId,
            account: account,
            amount: amount,
            txType: txType,
            timestamp: block.timestamp,
            flagged: false,
            flagReason: ""
        });
        
        transactionHistory[account].push(record);
        
        // Update totals
        uint256 today = block.timestamp / 1 days;
        uint256 month = block.timestamp / 30 days;
        dailyTotals[account][today] += amount;
        monthlyTotals[account][month] += amount;
        
        return txId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BLACKLIST/SANCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function addToBlacklist(address account, string calldata reason) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        blacklist[account] = true;
        
        if (kycRecords[account].verifiedAt > 0) {
            kycRecords[account].status = AccountStatus.BLOCKED;
            totalBlocked++;
        }
        
        emit AddressBlacklisted(account, reason, msg.sender);
    }
    
    function removeFromBlacklist(address account) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        blacklist[account] = false;
        
        if (kycRecords[account].verifiedAt > 0) {
            kycRecords[account].status = AccountStatus.ACTIVE;
            totalBlocked--;
        }
        
        emit AddressRemovedFromBlacklist(account, msg.sender);
    }
    
    function addToSanctionsList(address account) 
        external 
        onlyRole(SANCTIONS_OFFICER_ROLE) 
    {
        sanctionsList[account] = true;
        blacklist[account] = true;
        
        if (kycRecords[account].verifiedAt > 0) {
            kycRecords[account].status = AccountStatus.BLOCKED;
            kycRecords[account].riskLevel = RiskLevel.PROHIBITED;
        }
    }
    
    function addToWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelist[account] = true;
    }
    
    function removeFromWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelist[account] = false;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // JURISDICTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    function addJurisdiction(
        bytes2 countryCode,
        string calldata countryName,
        bool isRestricted,
        bool isSanctioned,
        KYCLevel minLevel,
        uint256 maxDaily
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _addJurisdiction(countryCode, countryName, isRestricted, isSanctioned, minLevel, maxDaily);
        emit JurisdictionAdded(countryCode, countryName, isRestricted);
    }
    
    function updateJurisdiction(
        bytes2 countryCode,
        bool isRestricted,
        bool isSanctioned,
        KYCLevel minLevel,
        uint256 maxDaily
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        Jurisdiction storage jurisdiction = jurisdictions[countryCode];
        require(bytes(jurisdiction.countryName).length > 0, "Jurisdiction not found");
        
        jurisdiction.isRestricted = isRestricted;
        jurisdiction.isSanctioned = isSanctioned;
        jurisdiction.minRequiredLevel = minLevel;
        jurisdiction.maxDailyLimit = maxDaily;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getKYCRecord(address account) external view returns (KYCRecord memory) {
        return kycRecords[account];
    }
    
    function getAccountLimits(address account) external view returns (
        uint256 daily,
        uint256 monthly,
        uint256 singleTx,
        uint256 dailyUsed,
        uint256 monthlyUsed
    ) {
        KYCRecord storage record = kycRecords[account];
        uint256 today = block.timestamp / 1 days;
        uint256 month = block.timestamp / 30 days;
        
        return (
            record.dailyLimit,
            record.monthlyLimit,
            record.singleTransactionLimit,
            dailyTotals[account][today],
            monthlyTotals[account][month]
        );
    }
    
    function getAllJurisdictionCodes() external view returns (bytes2[] memory) {
        return jurisdictionCodes;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
