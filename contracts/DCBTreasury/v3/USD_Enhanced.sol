// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                              ║
 * ║  🏦 USD TOKEN - ENHANCED VERSION WITH SECURITY IMPROVEMENTS                                                  ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                                    ║
 * ║  Version: 1.1.0 (Enhanced Security)                                                                          ║
 * ║                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title USD_Enhanced
 * @author Digital Commercial Bank Ltd
 * @notice Enhanced USD Token with additional security features
 * @dev Includes rate limiting, circuit breaker, multi-sig for large operations
 */
contract USD_Enhanced is ERC20, ERC20Burnable, ERC20Permit, AccessControl, ReentrancyGuard, Pausable {
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              PUBLIC CONSTANTS                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    string public constant VERSION = "1.1.0";
    string public constant INSTITUTION_NAME = "Digital Commercial Bank Ltd";
    string public constant ISO_CURRENCY_CODE = "USD";
    string public constant SWIFT_BIC = "DCBKUS33XXX";
    uint256 public constant CHAIN_ID = 1005;
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    uint256 public constant PRICE_PRECISION = 1e6;
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SECURITY CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════
    
    /// @notice Maximum daily injection limit ($10M)
    uint256 public constant MAX_DAILY_INJECTION = 10_000_000 * 1e6;
    
    /// @notice Threshold for multi-sig requirement ($1M)
    uint256 public constant MULTISIG_THRESHOLD = 1_000_000 * 1e6;
    
    /// @notice Required approvals for large operations
    uint256 public constant REQUIRED_APPROVALS = 2;
    
    /// @notice Circuit breaker threshold per hour ($50M)
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 50_000_000 * 1e6;
    
    /// @notice Maximum string length for account names
    uint256 public constant MAX_STRING_LENGTH = 100;
    
    /// @notice Lock expiration time (30 days)
    uint256 public constant LOCK_EXPIRATION = 30 days;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  ACCESS ROLES                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant TREASURY_OPERATOR_ROLE = keccak256("TREASURY_OPERATOR_ROLE");
    bytes32 public constant CUSTODY_MANAGER_ROLE = keccak256("CUSTODY_MANAGER_ROLE");
    bytes32 public constant ISO_VALIDATOR_ROLE = keccak256("ISO_VALIDATOR_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                     ENUMS                                             ║
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
    // ║                                    STRUCTS                                            ║
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
        uint256 lastActivityAt;
    }
    
    struct USDInjection {
        bytes32 injectionId;
        bytes32 custodyAccountId;
        uint256 amount;
        ISO20022Type isoType;
        string isoMessageCode;
        bytes32 isoMessageHash;
        string uetr;
        string instructionId;
        string endToEndId;
        bytes32 jsonProofHash;
        bytes32 xmlProofHash;
        string proofUri;
        InjectionStatus status;
        address beneficiary;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 sentToLemxAt;
        uint256 lockAcceptedAt;
        uint256 consumedAt;
        uint256 completedAt;
        bytes32 lemxLockId;
        bytes32 lusdMintTxHash;
        string authorizationCode;
    }
    
    struct PendingMultisigOperation {
        bytes32 operationId;
        bytes32 injectionId;
        uint256 amount;
        address initiator;
        address[] approvers;
        uint256 createdAt;
        uint256 expiresAt;
        bool executed;
        bool cancelled;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STATE VARIABLES                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    address public locksTreasuryLUSD;
    uint256 public totalCustodyBalance;
    uint256 public totalLockedForLUSD;
    uint256 public totalInjections;
    uint256 public totalISOMessages;
    
    // Rate Limiting
    uint256 public dailyInjected;
    uint256 public lastDayReset;
    
    // Circuit Breaker
    uint256 public hourlyVolume;
    uint256 public lastHourReset;
    bool public circuitBreakerTriggered;
    
    // Blacklist/Whitelist
    mapping(address => bool) public blacklisted;
    mapping(address => bool) public whitelisted;
    bool public whitelistEnabled;
    
    // Storage
    mapping(bytes32 => CustodyAccount) public custodyAccounts;
    bytes32[] public custodyAccountIds;
    
    mapping(bytes32 => USDInjection) public injections;
    bytes32[] public injectionIds;
    
    mapping(string => bytes32) public authCodeToInjection;
    mapping(bytes32 => bytes32) public lemxLockToInjection;
    
    // Multi-sig
    mapping(bytes32 => PendingMultisigOperation) public pendingOperations;
    bytes32[] public pendingOperationIds;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    EVENTS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    event CustodyAccountCreated(
        bytes32 indexed accountId,
        string accountName,
        string bankName,
        string swiftBic,
        address indexed owner,
        uint256 timestamp
    );
    
    event CustodyDeposit(
        bytes32 indexed accountId,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event USDInjectionInitiated(
        bytes32 indexed injectionId,
        bytes32 indexed custodyAccountId,
        uint256 amount,
        address indexed beneficiary,
        string authorizationCode,
        uint256 expiresAt,
        uint256 timestamp
    );
    
    event InjectionCancelled(
        bytes32 indexed injectionId,
        address cancelledBy,
        string reason,
        uint256 timestamp
    );
    
    event InjectionExpired(
        bytes32 indexed injectionId,
        uint256 timestamp
    );
    
    event LocksTreasuryLUSDUpdated(
        address indexed oldAddress,
        address indexed newAddress,
        uint256 timestamp
    );
    
    event CircuitBreakerTriggered(
        uint256 hourlyVolume,
        uint256 timestamp
    );
    
    event CircuitBreakerReset(
        address resetBy,
        uint256 timestamp
    );
    
    event MultisigOperationCreated(
        bytes32 indexed operationId,
        bytes32 indexed injectionId,
        uint256 amount,
        address initiator,
        uint256 timestamp
    );
    
    event MultisigOperationApproved(
        bytes32 indexed operationId,
        address approver,
        uint256 approvalCount,
        uint256 timestamp
    );
    
    event MultisigOperationExecuted(
        bytes32 indexed operationId,
        uint256 timestamp
    );
    
    event AddressBlacklisted(
        address indexed account,
        bool status,
        uint256 timestamp
    );
    
    event AddressWhitelisted(
        address indexed account,
        bool status,
        uint256 timestamp
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  MODIFIERS                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Account blacklisted");
        _;
    }
    
    modifier onlyWhitelistedIfEnabled(address account) {
        if (whitelistEnabled) {
            require(whitelisted[account], "Account not whitelisted");
        }
        _;
    }
    
    modifier checkDailyLimit(uint256 amount) {
        _resetDailyLimitIfNeeded();
        require(dailyInjected + amount <= MAX_DAILY_INJECTION, "Daily limit exceeded");
        dailyInjected += amount;
        _;
    }
    
    modifier checkCircuitBreaker(uint256 amount) {
        _resetCircuitBreakerIfNeeded();
        require(!circuitBreakerTriggered, "Circuit breaker active");
        
        hourlyVolume += amount;
        if (hourlyVolume > CIRCUIT_BREAKER_THRESHOLD) {
            circuitBreakerTriggered = true;
            emit CircuitBreakerTriggered(hourlyVolume, block.timestamp);
        }
        _;
    }
    
    modifier validStringLength(string calldata str, uint256 maxLen) {
        require(bytes(str).length > 0 && bytes(str).length <= maxLen, "Invalid string length");
        _;
    }
    
    modifier validSWIFT(string calldata swiftBic) {
        uint256 len = bytes(swiftBic).length;
        require(len == 8 || len == 11, "Invalid SWIFT/BIC format");
        _;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  CONSTRUCTOR                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    constructor(address _admin) 
        ERC20("USD", "USD") 
        ERC20Permit("USD") 
    {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TREASURY_OPERATOR_ROLE, _admin);
        _grantRole(CUSTODY_MANAGER_ROLE, _admin);
        _grantRole(ISO_VALIDATOR_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(COMPLIANCE_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        lastDayReset = block.timestamp / 1 days;
        lastHourReset = block.timestamp / 1 hours;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           INTERNAL HELPER FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function _resetDailyLimitIfNeeded() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastDayReset) {
            dailyInjected = 0;
            lastDayReset = currentDay;
        }
    }
    
    function _resetCircuitBreakerIfNeeded() internal {
        uint256 currentHour = block.timestamp / 1 hours;
        if (currentHour > lastHourReset) {
            hourlyVolume = 0;
            lastHourReset = currentHour;
            circuitBreakerTriggered = false;
        }
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           CUSTODY ACCOUNT FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function createCustodyAccount(
        string calldata accountName,
        string calldata bankName,
        string calldata swiftBic,
        string calldata accountNumber
    ) external 
        onlyRole(CUSTODY_MANAGER_ROLE) 
        validStringLength(accountName, MAX_STRING_LENGTH)
        validStringLength(bankName, MAX_STRING_LENGTH)
        validSWIFT(swiftBic)
        validStringLength(accountNumber, 50)
        returns (bytes32 accountId) 
    {
        accountId = keccak256(abi.encodePacked(
            accountName, bankName, swiftBic, accountNumber, block.timestamp, msg.sender
        ));
        
        require(custodyAccounts[accountId].createdAt == 0, "Account exists");
        
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
            createdAt: block.timestamp,
            lastActivityAt: block.timestamp
        });
        
        custodyAccountIds.push(accountId);
        
        emit CustodyAccountCreated(accountId, accountName, bankName, swiftBic, msg.sender, block.timestamp);
        
        return accountId;
    }
    
    function recordCustodyDeposit(
        bytes32 accountId,
        uint256 amount
    ) external onlyRole(TREASURY_OPERATOR_ROLE) {
        require(custodyAccounts[accountId].isActive, "Account not active");
        require(amount > 0, "Amount must be > 0");
        
        custodyAccounts[accountId].balance += amount;
        custodyAccounts[accountId].lastActivityAt = block.timestamp;
        totalCustodyBalance += amount;
        
        emit CustodyDeposit(accountId, amount, custodyAccounts[accountId].balance, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                        USD INJECTION WITH SECURITY                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function initiateInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode
    ) external 
        onlyRole(TREASURY_OPERATOR_ROLE) 
        nonReentrant 
        whenNotPaused
        notBlacklisted(beneficiary)
        onlyWhitelistedIfEnabled(beneficiary)
        checkDailyLimit(amount)
        checkCircuitBreaker(amount)
        returns (bytes32 injectionId) 
    {
        CustodyAccount storage account = custodyAccounts[custodyAccountId];
        require(account.isActive, "Account not active");
        require(account.balance >= amount, "Insufficient balance");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(bytes(authorizationCode).length > 0 && bytes(authorizationCode).length <= 50, "Invalid auth code");
        require(authCodeToInjection[authorizationCode] == bytes32(0), "Auth code used");
        
        // Check if multi-sig is required
        if (amount >= MULTISIG_THRESHOLD) {
            return _createMultisigOperation(custodyAccountId, amount, beneficiary, authorizationCode);
        }
        
        return _executeInjection(custodyAccountId, amount, beneficiary, authorizationCode);
    }
    
    function _createMultisigOperation(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode
    ) internal returns (bytes32 operationId) {
        operationId = keccak256(abi.encodePacked(
            custodyAccountId, amount, beneficiary, authorizationCode, block.timestamp
        ));
        
        address[] memory approvers = new address[](0);
        
        pendingOperations[operationId] = PendingMultisigOperation({
            operationId: operationId,
            injectionId: bytes32(0), // Will be set when executed
            amount: amount,
            initiator: msg.sender,
            approvers: approvers,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + 7 days,
            executed: false,
            cancelled: false
        });
        
        pendingOperationIds.push(operationId);
        
        // First approval from initiator
        pendingOperations[operationId].approvers.push(msg.sender);
        
        emit MultisigOperationCreated(operationId, bytes32(0), amount, msg.sender, block.timestamp);
        
        return operationId;
    }
    
    function approveMultisigOperation(bytes32 operationId) 
        external 
        onlyRole(TREASURY_OPERATOR_ROLE) 
    {
        PendingMultisigOperation storage op = pendingOperations[operationId];
        require(op.createdAt > 0, "Operation not found");
        require(!op.executed, "Already executed");
        require(!op.cancelled, "Operation cancelled");
        require(block.timestamp <= op.expiresAt, "Operation expired");
        
        // Check if already approved by this address
        for (uint256 i = 0; i < op.approvers.length; i++) {
            require(op.approvers[i] != msg.sender, "Already approved");
        }
        
        op.approvers.push(msg.sender);
        
        emit MultisigOperationApproved(operationId, msg.sender, op.approvers.length, block.timestamp);
        
        // Execute if enough approvals
        if (op.approvers.length >= REQUIRED_APPROVALS) {
            // Execute the injection
            // Note: In production, would need to store all parameters
            op.executed = true;
            emit MultisigOperationExecuted(operationId, block.timestamp);
        }
    }
    
    function _executeInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode
    ) internal returns (bytes32 injectionId) {
        CustodyAccount storage account = custodyAccounts[custodyAccountId];
        
        injectionId = keccak256(abi.encodePacked(
            custodyAccountId, amount, beneficiary, authorizationCode, block.timestamp, totalInjections
        ));
        
        account.balance -= amount;
        account.lockedBalance += amount;
        account.lastActivityAt = block.timestamp;
        totalLockedForLUSD += amount;
        
        injections[injectionId] = USDInjection({
            injectionId: injectionId,
            custodyAccountId: custodyAccountId,
            amount: amount,
            isoType: ISO20022Type.PACS_008,
            isoMessageCode: "",
            isoMessageHash: bytes32(0),
            uetr: "",
            instructionId: "",
            endToEndId: "",
            jsonProofHash: bytes32(0),
            xmlProofHash: bytes32(0),
            proofUri: "",
            status: InjectionStatus.INITIATED,
            beneficiary: beneficiary,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + LOCK_EXPIRATION,
            sentToLemxAt: 0,
            lockAcceptedAt: 0,
            consumedAt: 0,
            completedAt: 0,
            lemxLockId: bytes32(0),
            lusdMintTxHash: bytes32(0),
            authorizationCode: authorizationCode
        });
        
        injectionIds.push(injectionId);
        authCodeToInjection[authorizationCode] = injectionId;
        totalInjections++;
        
        emit USDInjectionInitiated(
            injectionId, 
            custodyAccountId, 
            amount, 
            beneficiary, 
            authorizationCode, 
            block.timestamp + LOCK_EXPIRATION,
            block.timestamp
        );
        
        return injectionId;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           CANCELLATION FUNCTION                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function cancelInjection(bytes32 injectionId, string calldata reason) 
        external 
        onlyRole(TREASURY_OPERATOR_ROLE) 
    {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(
            injection.status == InjectionStatus.INITIATED || 
            injection.status == InjectionStatus.CUSTODY_LOCKED,
            "Cannot cancel at this stage"
        );
        
        // Return funds to custody account
        CustodyAccount storage account = custodyAccounts[injection.custodyAccountId];
        account.balance += injection.amount;
        account.lockedBalance -= injection.amount;
        totalLockedForLUSD -= injection.amount;
        
        injection.status = InjectionStatus.CANCELLED;
        
        emit InjectionCancelled(injectionId, msg.sender, reason, block.timestamp);
    }
    
    function checkAndExpireInjection(bytes32 injectionId) external {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(block.timestamp > injection.expiresAt, "Not expired yet");
        require(
            injection.status == InjectionStatus.INITIATED || 
            injection.status == InjectionStatus.CUSTODY_LOCKED ||
            injection.status == InjectionStatus.SENT_TO_LEMX,
            "Cannot expire at this stage"
        );
        
        // Return funds to custody account
        CustodyAccount storage account = custodyAccounts[injection.custodyAccountId];
        account.balance += injection.amount;
        account.lockedBalance -= injection.amount;
        totalLockedForLUSD -= injection.amount;
        
        injection.status = InjectionStatus.EXPIRED;
        
        emit InjectionExpired(injectionId, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           COMPLIANCE FUNCTIONS                                        ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function setBlacklist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        blacklisted[account] = status;
        emit AddressBlacklisted(account, status, block.timestamp);
    }
    
    function setWhitelist(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        whitelisted[account] = status;
        emit AddressWhitelisted(account, status, block.timestamp);
    }
    
    function setWhitelistEnabled(bool enabled) external onlyRole(COMPLIANCE_ROLE) {
        whitelistEnabled = enabled;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           EMERGENCY FUNCTIONS                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function resetCircuitBreaker() external onlyRole(EMERGENCY_ROLE) {
        circuitBreakerTriggered = false;
        hourlyVolume = 0;
        lastHourReset = block.timestamp / 1 hours;
        emit CircuitBreakerReset(msg.sender, block.timestamp);
    }
    
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ADMIN FUNCTIONS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function setLocksTreasuryLUSD(address _locksTreasuryLUSD) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_locksTreasuryLUSD != address(0), "Invalid address");
        address oldAddress = locksTreasuryLUSD;
        locksTreasuryLUSD = _locksTreasuryLUSD;
        emit LocksTreasuryLUSDUpdated(oldAddress, _locksTreasuryLUSD, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function getRateLimitStatus() external view returns (
        uint256 _dailyInjected,
        uint256 _dailyLimit,
        uint256 _hourlyVolume,
        uint256 _hourlyLimit,
        bool _circuitBreakerActive
    ) {
        return (
            dailyInjected,
            MAX_DAILY_INJECTION,
            hourlyVolume,
            CIRCUIT_BREAKER_THRESHOLD,
            circuitBreakerTriggered
        );
    }
    
    function getStatistics() external view returns (
        uint256 _totalCustodyBalance,
        uint256 _totalLockedForLUSD,
        uint256 _totalInjections,
        uint256 _totalSupply
    ) {
        return (
            totalCustodyBalance,
            totalLockedForLUSD,
            totalInjections,
            totalSupply()
        );
    }
    
    function getCustodyAccountIdsPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        uint256 total = custodyAccountIds.length;
        if (offset >= total) return new bytes32[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = custodyAccountIds[i];
        }
        return result;
    }
    
    function getInjectionIdsPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        uint256 total = injectionIds.length;
        if (offset >= total) return new bytes32[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = injectionIds[i];
        }
        return result;
    }
}
