// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   ██╗      ██████╗  ██████╗██╗  ██╗    ██████╗  ██████╗ ██╗  ██╗             ║
 * ║   ██║     ██╔═══██╗██╔════╝██║ ██╔╝    ██╔══██╗██╔═══██╗╚██╗██╔╝             ║
 * ║   ██║     ██║   ██║██║     █████╔╝     ██████╔╝██║   ██║ ╚███╔╝              ║
 * ║   ██║     ██║   ██║██║     ██╔═██╗     ██╔══██╗██║   ██║ ██╔██╗              ║
 * ║   ███████╗╚██████╔╝╚██████╗██║  ██╗    ██████╔╝╚██████╔╝██╔╝ ██╗             ║
 * ║   ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝             ║
 * ║                                                                               ║
 * ║   LOCKBOX - Digital Commercial Bank Ltd                                       ║
 * ║   Secure USD Custody • Time-Locked Deposits • Multi-Sig Release              ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * @title LockBox - Secure USD Custody Contract
 * @author Digital Commercial Bank Ltd - Treasury Division
 * @notice Production-grade time-locked custody contract with multi-signature
 *         release authorization, emergency controls, and full audit trail.
 * @dev Implements secure token locking with multi-sig governance.
 * 
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 2.0.0
 * @custom:chain LemonChain (ID: 1006)
 * @custom:audit Pending - Q1 2026
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FEATURES:
 * ═══════════════════════════════════════════════════════════════════════════════
 * • Time-Locked USD Deposits
 * • Multi-Signature Release Authorization
 * • Emergency Withdrawal with Delay
 * • Lock Status Tracking
 * • Full Audit Trail with References
 * • Reentrancy Protection
 * • Pausable Operations
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract LockBox {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract version
    string public constant VERSION = "2.0.0";
    
    /// @notice Contract name
    string public constant NAME = "DCB LockBox";
    
    /// @notice Issuer name
    string public constant ISSUER = "Digital Commercial Bank Ltd";
    
    /// @notice Minimum lock duration (1 hour)
    uint256 public constant MIN_LOCK_DURATION = 1 hours;
    
    /// @notice Maximum lock duration (10 years)
    uint256 public constant MAX_LOCK_DURATION = 3650 days;

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Lock status enumeration
    enum LockStatus {
        NONE,           // Not created
        ACTIVE,         // Locked and active
        PENDING_RELEASE,// Approved, pending release
        RELEASED,       // Successfully released
        EMERGENCY,      // Emergency withdrawal executed
        CANCELLED       // Cancelled before unlock
    }
    
    /// @notice Lock information structure
    struct Lock {
        // Identification
        bytes32 lockId;
        uint256 lockIndex;
        
        // Parties
        address depositor;
        address beneficiary;
        
        // Amounts
        uint256 amount;
        uint256 originalAmount;
        
        // Timing
        uint256 lockTime;
        uint256 unlockTime;
        uint256 releasedTime;
        
        // Status
        LockStatus status;
        
        // Multi-sig
        uint256 approvalsCount;
        
        // Metadata
        string refId;
        string releaseNote;
        
        // Emergency
        uint256 emergencyRequestTime;
        address emergencyRequester;
    }
    
    /// @notice Lock approval tracking
    struct LockApprovals {
        mapping(address => bool) hasApproved;
        address[] approvers;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice USD token contract
    IERC20 public immutable usdToken;
    
    /// @notice Contract admin
    address public admin;
    
    /// @notice Locks mapping
    mapping(bytes32 => Lock) private _locks;
    
    /// @notice Lock approvals mapping
    mapping(bytes32 => LockApprovals) private _lockApprovals;
    
    /// @notice All lock IDs
    bytes32[] public lockIds;
    
    /// @notice Locks by depositor
    mapping(address => bytes32[]) public depositorLocks;
    
    /// @notice Locks by beneficiary
    mapping(address => bytes32[]) public beneficiaryLocks;
    
    /// @notice Signers mapping
    mapping(address => bool) public isSigner;
    
    /// @notice Signers list
    address[] public signers;
    
    /// @notice Required signatures for release
    uint256 public requiredSignatures;
    
    /// @notice Emergency withdrawal delay
    uint256 public emergencyDelay = 7 days;
    
    /// @notice Whether contract is paused
    bool public paused;
    
    /// @notice Reentrancy guard
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Total amount ever locked
    uint256 public totalLocked;
    
    /// @notice Total amount ever released
    uint256 public totalReleased;
    
    /// @notice Current locked balance
    uint256 public currentLocked;
    
    /// @notice Total locks created
    uint256 public lockCount;
    
    /// @notice Active locks count
    uint256 public activeLockCount;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when USD is locked
    event USDLocked(
        bytes32 indexed lockId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint256 unlockTime,
        string refId
    );
    
    /// @notice Emitted when lock is approved
    event LockApproved(
        bytes32 indexed lockId,
        address indexed signer,
        uint256 approvalsCount,
        uint256 requiredSignatures
    );
    
    /// @notice Emitted when USD is released
    event USDReleased(
        bytes32 indexed lockId,
        address indexed beneficiary,
        uint256 amount,
        string releaseNote,
        uint256 timestamp
    );
    
    /// @notice Emitted when lock is extended
    event LockExtended(
        bytes32 indexed lockId,
        uint256 oldUnlockTime,
        uint256 newUnlockTime
    );
    
    /// @notice Emitted when emergency is requested
    event EmergencyRequested(
        bytes32 indexed lockId,
        address indexed requester,
        uint256 availableAt
    );
    
    /// @notice Emitted when emergency is executed
    event EmergencyExecuted(
        bytes32 indexed lockId,
        address indexed recipient,
        uint256 amount
    );
    
    /// @notice Emitted when emergency is cancelled
    event EmergencyCancelled(bytes32 indexed lockId);
    
    /// @notice Emitted when signer is added
    event SignerAdded(address indexed signer);
    
    /// @notice Emitted when signer is removed
    event SignerRemoved(address indexed signer);
    
    /// @notice Emitted when required signatures change
    event RequiredSignaturesChanged(uint256 oldValue, uint256 newValue);
    
    /// @notice Emitted when contract is paused
    event Paused(address indexed account);
    
    /// @notice Emitted when contract is unpaused
    event Unpaused(address indexed account);
    
    /// @notice Emitted when admin is transferred
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error ZeroAddress();
    error ZeroAmount();
    error InvalidUnlockTime();
    error LockNotFound();
    error LockNotActive();
    error LockStillLocked();
    error AlreadyApproved();
    error InsufficientApprovals();
    error NotSigner();
    error NotAdmin();
    error ContractPaused();
    error TransferFailed();
    error EmergencyNotRequested();
    error EmergencyDelayNotPassed();
    error EmergencyAlreadyRequested();
    error CannotRemoveSigner();
    error InvalidRequiredSignatures();
    error ReentrancyGuard();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert NotSigner();
        _;
    }
    
    modifier onlyAdminOrSigner() {
        if (msg.sender != admin && !isSigner[msg.sender]) revert NotSigner();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuard();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initializes the LockBox
     * @param _usdToken Address of the USD token
     * @param _admin Initial admin address
     * @param _initialSigners Initial signers array
     * @param _requiredSignatures Number of required signatures
     */
    constructor(
        address _usdToken,
        address _admin,
        address[] memory _initialSigners,
        uint256 _requiredSignatures
    ) {
        if (_usdToken == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();
        if (_requiredSignatures == 0) revert InvalidRequiredSignatures();
        
        usdToken = IERC20(_usdToken);
        admin = _admin;
        
        // Add admin as signer
        isSigner[_admin] = true;
        signers.push(_admin);
        emit SignerAdded(_admin);
        
        // Add initial signers
        for (uint256 i = 0; i < _initialSigners.length; i++) {
            if (_initialSigners[i] != address(0) && !isSigner[_initialSigners[i]]) {
                isSigner[_initialSigners[i]] = true;
                signers.push(_initialSigners[i]);
                emit SignerAdded(_initialSigners[i]);
            }
        }
        
        if (_requiredSignatures > signers.length) revert InvalidRequiredSignatures();
        requiredSignatures = _requiredSignatures;
        
        _reentrancyStatus = _NOT_ENTERED;
        
        emit AdminTransferred(address(0), _admin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOCKING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Locks USD tokens with a time-based unlock
     * @param beneficiary Address that will receive the tokens
     * @param amount Amount to lock
     * @param unlockTime Timestamp when tokens can be released
     * @param refId External refId for audit trail
     * @return lockId The unique identifier for this lock
     */
    function lockUSD(
        address beneficiary,
        uint256 amount,
        uint256 unlockTime,
        string calldata refId
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (bytes32 lockId) 
    {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp + MIN_LOCK_DURATION) revert InvalidUnlockTime();
        if (unlockTime > block.timestamp + MAX_LOCK_DURATION) revert InvalidUnlockTime();
        
        // Generate unique lock ID
        lockId = _generateLockId(msg.sender, beneficiary, amount, unlockTime);
        
        // Transfer tokens
        if (!usdToken.transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }
        
        // Create lock
        uint256 lockIndex = lockIds.length;
        _locks[lockId] = Lock({
            lockId: lockId,
            lockIndex: lockIndex,
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            originalAmount: amount,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            releasedTime: 0,
            status: LockStatus.ACTIVE,
            approvalsCount: 0,
            refId: refId,
            releaseNote: "",
            emergencyRequestTime: 0,
            emergencyRequester: address(0)
        });
        
        lockIds.push(lockId);
        depositorLocks[msg.sender].push(lockId);
        beneficiaryLocks[beneficiary].push(lockId);
        
        totalLocked += amount;
        currentLocked += amount;
        lockCount++;
        activeLockCount++;
        
        emit USDLocked(lockId, msg.sender, beneficiary, amount, unlockTime, refId);
        
        return lockId;
    }
    
    /**
     * @notice Locks USD directly (admin only)
     * @param depositor Original depositor address
     * @param beneficiary Address that will receive the tokens
     * @param amount Amount to lock
     * @param unlockTime Timestamp when tokens can be released
     * @param refId External refId
     * @return lockId The unique identifier for this lock
     */
    function lockUSDDirect(
        address depositor,
        address beneficiary,
        uint256 amount,
        uint256 unlockTime,
        string calldata refId
    ) 
        external 
        onlyAdmin 
        whenNotPaused 
        nonReentrant 
        returns (bytes32 lockId) 
    {
        if (depositor == address(0)) revert ZeroAddress();
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert InvalidUnlockTime();
        
        lockId = _generateLockId(depositor, beneficiary, amount, unlockTime);
        
        if (!usdToken.transferFrom(depositor, address(this), amount)) {
            revert TransferFailed();
        }
        
        uint256 lockIndex = lockIds.length;
        _locks[lockId] = Lock({
            lockId: lockId,
            lockIndex: lockIndex,
            depositor: depositor,
            beneficiary: beneficiary,
            amount: amount,
            originalAmount: amount,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            releasedTime: 0,
            status: LockStatus.ACTIVE,
            approvalsCount: 0,
            refId: refId,
            releaseNote: "",
            emergencyRequestTime: 0,
            emergencyRequester: address(0)
        });
        
        lockIds.push(lockId);
        depositorLocks[depositor].push(lockId);
        beneficiaryLocks[beneficiary].push(lockId);
        
        totalLocked += amount;
        currentLocked += amount;
        lockCount++;
        activeLockCount++;
        
        emit USDLocked(lockId, depositor, beneficiary, amount, unlockTime, refId);
        
        return lockId;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RELEASE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Approves a lock for release (multi-sig)
     * @param lockId ID of the lock to approve
     */
    function approveLockRelease(bytes32 lockId) external onlySigner {
        Lock storage lock = _locks[lockId];
        LockApprovals storage approvals = _lockApprovals[lockId];
        
        if (lock.status == LockStatus.NONE) revert LockNotFound();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockStillLocked();
        if (approvals.hasApproved[msg.sender]) revert AlreadyApproved();
        
        approvals.hasApproved[msg.sender] = true;
        approvals.approvers.push(msg.sender);
        lock.approvalsCount++;
        
        emit LockApproved(lockId, msg.sender, lock.approvalsCount, requiredSignatures);
        
        // Auto-release if enough approvals
        if (lock.approvalsCount >= requiredSignatures) {
            _releaseLock(lockId, "Auto-released after sufficient approvals");
        }
    }
    
    /**
     * @notice Executes release after sufficient approvals
     * @param lockId ID of the lock to release
     * @param releaseNote Note for the release
     */
    function executeRelease(bytes32 lockId, string calldata releaseNote) 
        external 
        onlyAdminOrSigner 
        nonReentrant 
    {
        Lock storage lock = _locks[lockId];
        
        if (lock.status == LockStatus.NONE) revert LockNotFound();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockStillLocked();
        if (lock.approvalsCount < requiredSignatures) revert InsufficientApprovals();
        
        _releaseLock(lockId, releaseNote);
    }
    
    /**
     * @notice Releases lock directly (admin only, bypasses multi-sig)
     * @param lockId ID of the lock to release
     * @param releaseNote Note for the release
     */
    function releaseLockDirect(bytes32 lockId, string calldata releaseNote) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        Lock storage lock = _locks[lockId];
        
        if (lock.status == LockStatus.NONE) revert LockNotFound();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockStillLocked();
        
        _releaseLock(lockId, releaseNote);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOCK MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Extends lock unlock time
     * @param lockId ID of the lock
     * @param newUnlockTime New unlock timestamp
     */
    function extendLock(bytes32 lockId, uint256 newUnlockTime) external {
        Lock storage lock = _locks[lockId];
        
        if (lock.status == LockStatus.NONE) revert LockNotFound();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (msg.sender != lock.depositor && msg.sender != admin) revert NotAdmin();
        if (newUnlockTime <= lock.unlockTime) revert InvalidUnlockTime();
        if (newUnlockTime > block.timestamp + MAX_LOCK_DURATION) revert InvalidUnlockTime();
        
        uint256 oldUnlockTime = lock.unlockTime;
        lock.unlockTime = newUnlockTime;
        
        emit LockExtended(lockId, oldUnlockTime, newUnlockTime);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Requests emergency withdrawal
     * @param lockId ID of the lock
     */
    function requestEmergencyWithdrawal(bytes32 lockId) external onlyAdmin {
        Lock storage lock = _locks[lockId];
        
        if (lock.status == LockStatus.NONE) revert LockNotFound();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (lock.emergencyRequestTime > 0) revert EmergencyAlreadyRequested();
        
        lock.emergencyRequestTime = block.timestamp + emergencyDelay;
        lock.emergencyRequester = msg.sender;
        
        emit EmergencyRequested(lockId, msg.sender, lock.emergencyRequestTime);
    }
    
    /**
     * @notice Executes emergency withdrawal
     * @param lockId ID of the lock
     * @param recipient Address to receive funds
     */
    function executeEmergencyWithdrawal(bytes32 lockId, address recipient) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        if (recipient == address(0)) revert ZeroAddress();
        
        Lock storage lock = _locks[lockId];
        
        if (lock.status == LockStatus.NONE) revert LockNotFound();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (lock.emergencyRequestTime == 0) revert EmergencyNotRequested();
        if (block.timestamp < lock.emergencyRequestTime) revert EmergencyDelayNotPassed();
        
        uint256 amount = lock.amount;
        lock.amount = 0;
        lock.status = LockStatus.EMERGENCY;
        lock.releasedTime = block.timestamp;
        lock.releaseNote = "Emergency withdrawal";
        
        currentLocked -= amount;
        totalReleased += amount;
        activeLockCount--;
        
        if (!usdToken.transfer(recipient, amount)) {
            revert TransferFailed();
        }
        
        emit EmergencyExecuted(lockId, recipient, amount);
    }
    
    /**
     * @notice Cancels emergency withdrawal request
     * @param lockId ID of the lock
     */
    function cancelEmergencyRequest(bytes32 lockId) external onlyAdmin {
        Lock storage lock = _locks[lockId];
        
        if (lock.emergencyRequestTime == 0) revert EmergencyNotRequested();
        
        lock.emergencyRequestTime = 0;
        lock.emergencyRequester = address(0);
        
        emit EmergencyCancelled(lockId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Adds a new signer
     * @param signer Address of the new signer
     */
    function addSigner(address signer) external onlyAdmin {
        if (signer == address(0)) revert ZeroAddress();
        if (isSigner[signer]) return;
        
        isSigner[signer] = true;
        signers.push(signer);
        
        emit SignerAdded(signer);
    }
    
    /**
     * @notice Removes a signer
     * @param signer Address of the signer to remove
     */
    function removeSigner(address signer) external onlyAdmin {
        if (!isSigner[signer]) revert NotSigner();
        if (signers.length <= requiredSignatures) revert CannotRemoveSigner();
        
        isSigner[signer] = false;
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer);
    }
    
    /**
     * @notice Sets required signatures count
     * @param required New required count
     */
    function setRequiredSignatures(uint256 required) external onlyAdmin {
        if (required == 0) revert InvalidRequiredSignatures();
        if (required > signers.length) revert InvalidRequiredSignatures();
        
        uint256 oldValue = requiredSignatures;
        requiredSignatures = required;
        
        emit RequiredSignaturesChanged(oldValue, required);
    }
    
    /**
     * @notice Sets emergency delay
     * @param delay New delay in seconds
     */
    function setEmergencyDelay(uint256 delay) external onlyAdmin {
        if (delay < 1 days) revert InvalidRequiredSignatures();
        emergencyDelay = delay;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAUSE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pauses the contract
     */
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Gets lock details
     * @param lockId ID of the lock
     */
    function getLock(bytes32 lockId) external view returns (
        address depositor,
        address beneficiary,
        uint256 amount,
        uint256 originalAmount,
        uint256 lockTime,
        uint256 unlockTime,
        LockStatus status,
        uint256 approvalsCount,
        string memory refId
    ) {
        Lock storage lock = _locks[lockId];
        return (
            lock.depositor,
            lock.beneficiary,
            lock.amount,
            lock.originalAmount,
            lock.lockTime,
            lock.unlockTime,
            lock.status,
            lock.approvalsCount,
            lock.refId
        );
    }
    
    /**
     * @notice Checks if lock is releasable
     * @param lockId ID of the lock
     * @return True if can be released
     */
    function isReleasable(bytes32 lockId) external view returns (bool) {
        Lock storage lock = _locks[lockId];
        return lock.status == LockStatus.ACTIVE && 
               block.timestamp >= lock.unlockTime &&
               lock.approvalsCount >= requiredSignatures;
    }
    
    /**
     * @notice Checks if signer has approved
     * @param lockId ID of the lock
     * @param signer Signer address
     * @return True if approved
     */
    function hasApproved(bytes32 lockId, address signer) external view returns (bool) {
        return _lockApprovals[lockId].hasApproved[signer];
    }
    
    /**
     * @notice Gets all lock IDs
     * @return Array of lock IDs
     */
    function getAllLockIds() external view returns (bytes32[] memory) {
        return lockIds;
    }
    
    /**
     * @notice Gets all signers
     * @return Array of signer addresses
     */
    function getAllSigners() external view returns (address[] memory) {
        return signers;
    }
    
    /**
     * @notice Gets contract balance
     * @return Current USD balance
     */
    function getBalance() external view returns (uint256) {
        return usdToken.balanceOf(address(this));
    }
    
    /**
     * @notice Gets statistics
     */
    function getStats() external view returns (
        uint256 _totalLocked,
        uint256 _totalReleased,
        uint256 _currentLocked,
        uint256 _lockCount,
        uint256 _activeLockCount,
        uint256 _signersCount,
        uint256 _requiredSignatures
    ) {
        return (
            totalLocked,
            totalReleased,
            currentLocked,
            lockCount,
            activeLockCount,
            signers.length,
            requiredSignatures
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfers admin role
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _releaseLock(bytes32 lockId, string memory releaseNote) internal {
        Lock storage lock = _locks[lockId];
        
        uint256 amount = lock.amount;
        lock.amount = 0;
        lock.status = LockStatus.RELEASED;
        lock.releasedTime = block.timestamp;
        lock.releaseNote = releaseNote;
        
        currentLocked -= amount;
        totalReleased += amount;
        activeLockCount--;
        
        if (!usdToken.transfer(lock.beneficiary, amount)) {
            revert TransferFailed();
        }
        
        emit USDReleased(lockId, lock.beneficiary, amount, releaseNote, block.timestamp);
    }
    
    function _generateLockId(
        address depositor,
        address beneficiary,
        uint256 amount,
        uint256 unlockTime
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            depositor,
            beneficiary,
            amount,
            unlockTime,
            block.timestamp,
            block.chainid,
            lockCount
        ));
    }
}
