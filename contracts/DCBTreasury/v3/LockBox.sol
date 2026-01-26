// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║     ██╗      ██████╗  ██████╗██╗  ██╗██████╗  ██████╗ ██╗  ██╗                                   ║
 * ║     ██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔══██╗██╔═══██╗╚██╗██╔╝                                   ║
 * ║     ██║     ██║   ██║██║     █████╔╝ ██████╔╝██║   ██║ ╚███╔╝                                    ║
 * ║     ██║     ██║   ██║██║     ██╔═██╗ ██╔══██╗██║   ██║ ██╔██╗                                    ║
 * ║     ███████╗╚██████╔╝╚██████╗██║  ██╗██████╔╝╚██████╔╝██╔╝ ██╗                                   ║
 * ║     ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝                                   ║
 * ║                                                                                                  ║
 * ║     ████████╗██████╗ ███████╗ █████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗                          ║
 * ║     ╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝                          ║
 * ║        ██║   ██████╔╝█████╗  ███████║███████╗██║   ██║██████╔╝ ╚████╔╝                           ║
 * ║        ██║   ██╔══██╗██╔══╝  ██╔══██║╚════██║██║   ██║██╔══██╗  ╚██╔╝                            ║
 * ║        ██║   ██║  ██║███████╗██║  ██║███████║╚██████╔╝██║  ██║   ██║                             ║
 * ║        ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝                             ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  LockBox v3.0 - DCB Treasury Custody & Timelock System                                           ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  🔗 LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                 ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  FEATURES:                                                                                       ║
 * ║  ├─ 🔒 Time-locked LUSD Deposits                                                                 ║
 * ║  ├─ 📅 Vesting Schedule Support                                                                  ║
 * ║  ├─ ✅ Multi-signature Release                                                                   ║
 * ║  ├─ ⚡ Emergency Withdrawal (with penalty)                                                        ║
 * ║  ├─ 📊 Partial Release Support                                                                   ║
 * ║  ├─ 🔐 Beneficiary Management                                                                    ║
 * ║  ├─ 📈 Lock Statistics Tracking                                                                  ║
 * ║  └─ 📝 Comprehensive Audit Trail                                                                 ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 * 
 * @title LockBox - DCB Treasury Custody v3.0
 * @author DCB Treasury Team
 * @notice Professional custody contract with timelock and multi-signature
 * @dev Interacts with official LUSD contract for token custody
 * @custom:security-contact security@dcbtreasury.com
 * @custom:version 3.0.0
 */

import "./interfaces/ILUSD.sol";

contract LockBox {
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              CONSTANTS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version
    string public constant VERSION = "3.0.0";
    
    /// @notice Official LUSD contract address
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice Minimum lock duration (1 day)
    uint256 public constant MIN_LOCK_DURATION = 1 days;
    
    /// @notice Maximum lock duration (10 years)
    uint256 public constant MAX_LOCK_DURATION = 365 days * 10;
    
    /// @notice Emergency withdrawal penalty (10% = 1000 basis points)
    uint256 public constant EMERGENCY_PENALTY_BPS = 1000;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    /// @notice Minimum approvals for multi-sig locks
    uint256 public constant MIN_MULTISIG_APPROVALS = 2;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               ENUMS                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Lock status enumeration
    enum LockStatus {
        ACTIVE,
        RELEASED,
        PARTIALLY_RELEASED,
        EMERGENCY_WITHDRAWN,
        CANCELLED
    }
    
    /// @notice Lock type enumeration
    enum LockType {
        STANDARD,       // Simple timelock
        VESTING,        // Vesting schedule
        MULTISIG        // Multi-signature release
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               STRUCTS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Lock structure
    struct Lock {
        uint256 id;
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 originalAmount;
        uint256 lockTime;
        uint256 unlockTime;
        LockStatus status;
        LockType lockType;
        string refId;
        bytes32 txHash;
    }
    
    /// @notice Vesting schedule structure
    struct VestingSchedule {
        uint256 lockId;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 slicePeriod;
        bool revocable;
        bool revoked;
    }
    
    /// @notice Multi-sig configuration
    struct MultiSigConfig {
        uint256 lockId;
        uint256 requiredApprovals;
        uint256 currentApprovals;
        address[] signers;
    }
    
    /// @notice Release record
    struct ReleaseRecord {
        uint256 lockId;
        uint256 amount;
        address releasedTo;
        address releasedBy;
        uint256 timestamp;
        string reason;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                            STATE VARIABLES                                ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract admin
    address public admin;
    
    /// @notice Pending admin for 2-step transfer
    address public pendingAdmin;
    
    /// @notice Contract paused state
    bool public paused;
    
    /// @notice Emergency mode
    bool public emergencyMode;
    
    /// @notice Total locks created
    uint256 public lockCount;
    
    /// @notice Total LUSD locked
    uint256 public totalLocked;
    
    /// @notice Total LUSD released
    uint256 public totalReleased;
    
    /// @notice Total emergency withdrawals
    uint256 public totalEmergencyWithdrawals;
    
    /// @notice Total penalties collected
    uint256 public totalPenaltiesCollected;
    
    /// @notice Deployment timestamp
    uint256 public immutable deployedAt;
    
    /// @notice Treasury address for penalties
    address public treasury;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              MAPPINGS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Operators mapping
    mapping(address => bool) public operators;
    
    /// @notice Locks by ID
    mapping(uint256 => Lock) public locks;
    
    /// @notice Vesting schedules by lock ID
    mapping(uint256 => VestingSchedule) public vestingSchedules;
    
    /// @notice Multi-sig configs by lock ID
    mapping(uint256 => MultiSigConfig) public multiSigConfigs;
    
    /// @notice Multi-sig approvals
    mapping(uint256 => mapping(address => bool)) public multiSigApprovals;
    
    /// @notice User locks
    mapping(address => uint256[]) public userLocks;
    
    /// @notice Beneficiary locks
    mapping(address => uint256[]) public beneficiaryLocks;
    
    /// @notice Release history
    mapping(uint256 => ReleaseRecord[]) public releaseHistory;
    
    /// @notice Operators list
    address[] public operatorsList;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               EVENTS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice LUSD locked event
    event LUSDLocked(
        uint256 indexed lockId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint256 unlockTime,
        LockType lockType,
        string refId
    );
    
    /// @notice LUSD released event
    event LUSDReleased(
        uint256 indexed lockId,
        address indexed beneficiary,
        uint256 amount,
        address indexed releasedBy,
        uint256 timestamp
    );
    
    /// @notice Partial release event
    event PartialRelease(
        uint256 indexed lockId,
        address indexed beneficiary,
        uint256 amount,
        uint256 remaining,
        uint256 timestamp
    );
    
    /// @notice Emergency withdrawal event
    event EmergencyWithdrawal(
        uint256 indexed lockId,
        address indexed depositor,
        uint256 amountReturned,
        uint256 penaltyAmount,
        uint256 timestamp
    );
    
    /// @notice Vesting created event
    event VestingCreated(
        uint256 indexed lockId,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    
    /// @notice Vesting claimed event
    event VestingClaimed(
        uint256 indexed lockId,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Multi-sig approval event
    event MultiSigApproval(
        uint256 indexed lockId,
        address indexed signer,
        uint256 currentApprovals,
        uint256 requiredApprovals
    );
    
    /// @notice Beneficiary changed event
    event BeneficiaryChanged(
        uint256 indexed lockId,
        address indexed oldBeneficiary,
        address indexed newBeneficiary,
        uint256 timestamp
    );
    
    /// @notice Operator events
    event OperatorAdded(address indexed operator, address indexed addedBy, uint256 timestamp);
    event OperatorRemoved(address indexed operator, address indexed removedBy, uint256 timestamp);
    
    /// @notice Admin events
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed previousAdmin, address indexed newAdmin);
    
    /// @notice State events
    event Paused(address indexed pausedBy, uint256 timestamp);
    event Unpaused(address indexed unpausedBy, uint256 timestamp);
    event EmergencyModeActivated(address indexed activatedBy, uint256 timestamp);
    event EmergencyModeDeactivated(address indexed deactivatedBy, uint256 timestamp);
    
    /// @notice Treasury updated event
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               ERRORS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidDuration();
    error LockNotFound();
    error LockNotActive();
    error LockNotUnlocked();
    error NotBeneficiary();
    error NotDepositor();
    error InsufficientBalance();
    error ContractPaused();
    error EmergencyModeActive();
    error AlreadyApproved();
    error InsufficientApprovals();
    error VestingNotStarted();
    error CliffNotReached();
    error NothingToRelease();
    error VestingRevoked();
    error NotRevocable();
    error NoPendingAdmin();
    error NotPendingAdmin();
    error AlreadyOperator();
    error NotOperator();
    error InvalidSigners();
    error TransferFailed();
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              MODIFIERS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }
    
    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != admin) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier notEmergency() {
        if (emergencyMode) revert EmergencyModeActive();
        _;
    }
    
    modifier lockExists(uint256 lockId) {
        if (lockId == 0 || lockId > lockCount) revert LockNotFound();
        _;
    }
    
    /// @notice Reentrancy guard
    uint256 private _reentrancyStatus;
    modifier nonReentrant() {
        require(_reentrancyStatus != 2, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                             CONSTRUCTOR                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Deploys the LockBox contract
     * @param _treasury Treasury address for penalties
     */
    constructor(address _treasury) {
        if (_treasury == address(0)) revert ZeroAddress();
        
        admin = msg.sender;
        treasury = _treasury;
        operators[msg.sender] = true;
        operatorsList.push(msg.sender);
        
        deployedAt = block.timestamp;
        _reentrancyStatus = 1;
        
        emit AdminTransferCompleted(address(0), msg.sender);
        emit OperatorAdded(msg.sender, address(0), block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         STANDARD LOCK FUNCTIONS                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a standard timelock
     * @param beneficiary Beneficiary address
     * @param amount Amount to lock
     * @param duration Lock duration in seconds
     * @param refId Reference ID for audit trail
     * @return lockId New lock ID
     */
    function lockLUSD(
        address beneficiary,
        uint256 amount,
        uint256 duration,
        string calldata refId
    ) external nonReentrant whenNotPaused notEmergency returns (uint256 lockId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (duration < MIN_LOCK_DURATION || duration > MAX_LOCK_DURATION) revert InvalidDuration();
        
        // Transfer LUSD from depositor
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        
        lockCount++;
        lockId = lockCount;
        uint256 unlockTime = block.timestamp + duration;
        
        locks[lockId] = Lock({
            id: lockId,
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            originalAmount: amount,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            status: LockStatus.ACTIVE,
            lockType: LockType.STANDARD,
            refId: refId,
            txHash: bytes32(0)
        });
        
        userLocks[msg.sender].push(lockId);
        beneficiaryLocks[beneficiary].push(lockId);
        totalLocked += amount;
        
        emit LUSDLocked(lockId, msg.sender, beneficiary, amount, unlockTime, LockType.STANDARD, refId);
        
        return lockId;
    }
    
    /**
     * @notice Releases LUSD from a standard lock
     * @param lockId Lock ID
     */
    function releaseLUSD(uint256 lockId) 
        external 
        nonReentrant 
        whenNotPaused 
        lockExists(lockId) 
    {
        Lock storage lock = locks[lockId];
        
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockNotUnlocked();
        if (msg.sender != lock.beneficiary && msg.sender != lock.depositor && !operators[msg.sender]) {
            revert Unauthorized();
        }
        
        uint256 amount = lock.amount;
        lock.amount = 0;
        lock.status = LockStatus.RELEASED;
        
        totalLocked -= amount;
        totalReleased += amount;
        
        // Transfer LUSD to beneficiary
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transfer(lock.beneficiary, amount)) revert TransferFailed();
        
        releaseHistory[lockId].push(ReleaseRecord({
            lockId: lockId,
            amount: amount,
            releasedTo: lock.beneficiary,
            releasedBy: msg.sender,
            timestamp: block.timestamp,
            reason: "Standard release"
        }));
        
        emit LUSDReleased(lockId, lock.beneficiary, amount, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Partial release from a lock
     * @param lockId Lock ID
     * @param amount Amount to release
     */
    function partialRelease(uint256 lockId, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        lockExists(lockId)
    {
        Lock storage lock = locks[lockId];
        
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockNotUnlocked();
        if (msg.sender != lock.beneficiary && !operators[msg.sender]) revert Unauthorized();
        if (amount == 0 || amount > lock.amount) revert InsufficientBalance();
        
        lock.amount -= amount;
        
        if (lock.amount == 0) {
            lock.status = LockStatus.RELEASED;
        } else {
            lock.status = LockStatus.PARTIALLY_RELEASED;
        }
        
        totalLocked -= amount;
        totalReleased += amount;
        
        // Transfer LUSD
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transfer(lock.beneficiary, amount)) revert TransferFailed();
        
        releaseHistory[lockId].push(ReleaseRecord({
            lockId: lockId,
            amount: amount,
            releasedTo: lock.beneficiary,
            releasedBy: msg.sender,
            timestamp: block.timestamp,
            reason: "Partial release"
        }));
        
        emit PartialRelease(lockId, lock.beneficiary, amount, lock.amount, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         VESTING FUNCTIONS                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a vesting schedule lock
     * @param beneficiary Beneficiary address
     * @param amount Total amount to vest
     * @param startTime Vesting start time
     * @param cliffDuration Cliff duration in seconds
     * @param vestingDuration Total vesting duration in seconds
     * @param slicePeriod Release slice period in seconds
     * @param revocable Whether vesting is revocable
     * @param refId Reference ID
     * @return lockId New lock ID
     */
    function createVestingLock(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 slicePeriod,
        bool revocable,
        string calldata refId
    ) external nonReentrant whenNotPaused notEmergency returns (uint256 lockId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (vestingDuration == 0 || vestingDuration > MAX_LOCK_DURATION) revert InvalidDuration();
        if (slicePeriod == 0 || slicePeriod > vestingDuration) revert InvalidDuration();
        if (startTime < block.timestamp) startTime = block.timestamp;
        
        // Transfer LUSD
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        
        lockCount++;
        lockId = lockCount;
        
        locks[lockId] = Lock({
            id: lockId,
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            originalAmount: amount,
            lockTime: block.timestamp,
            unlockTime: startTime + vestingDuration,
            status: LockStatus.ACTIVE,
            lockType: LockType.VESTING,
            refId: refId,
            txHash: bytes32(0)
        });
        
        vestingSchedules[lockId] = VestingSchedule({
            lockId: lockId,
            totalAmount: amount,
            releasedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            slicePeriod: slicePeriod,
            revocable: revocable,
            revoked: false
        });
        
        userLocks[msg.sender].push(lockId);
        beneficiaryLocks[beneficiary].push(lockId);
        totalLocked += amount;
        
        emit LUSDLocked(lockId, msg.sender, beneficiary, amount, startTime + vestingDuration, LockType.VESTING, refId);
        emit VestingCreated(lockId, amount, startTime, cliffDuration, vestingDuration);
        
        return lockId;
    }
    
    /**
     * @notice Claims vested tokens
     * @param lockId Lock ID
     */
    function claimVested(uint256 lockId) 
        external 
        nonReentrant 
        whenNotPaused 
        lockExists(lockId) 
    {
        Lock storage lock = locks[lockId];
        VestingSchedule storage vesting = vestingSchedules[lockId];
        
        if (lock.lockType != LockType.VESTING) revert Unauthorized();
        if (lock.status != LockStatus.ACTIVE && lock.status != LockStatus.PARTIALLY_RELEASED) revert LockNotActive();
        if (msg.sender != lock.beneficiary) revert NotBeneficiary();
        if (vesting.revoked) revert VestingRevoked();
        
        uint256 vestedAmount = _computeVestedAmount(vesting);
        uint256 releasable = vestedAmount - vesting.releasedAmount;
        
        if (releasable == 0) revert NothingToRelease();
        
        vesting.releasedAmount += releasable;
        lock.amount -= releasable;
        
        if (lock.amount == 0) {
            lock.status = LockStatus.RELEASED;
        } else {
            lock.status = LockStatus.PARTIALLY_RELEASED;
        }
        
        totalLocked -= releasable;
        totalReleased += releasable;
        
        // Transfer LUSD
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transfer(lock.beneficiary, releasable)) revert TransferFailed();
        
        emit VestingClaimed(lockId, lock.beneficiary, releasable, block.timestamp);
    }
    
    /**
     * @notice Gets releasable vested amount
     * @param lockId Lock ID
     * @return Releasable amount
     */
    function getReleasableAmount(uint256 lockId) external view lockExists(lockId) returns (uint256) {
        VestingSchedule storage vesting = vestingSchedules[lockId];
        if (vesting.lockId == 0) return 0;
        if (vesting.revoked) return 0;
        
        uint256 vestedAmount = _computeVestedAmount(vesting);
        return vestedAmount - vesting.releasedAmount;
    }
    
    /**
     * @notice Revokes a vesting schedule (depositor only)
     * @param lockId Lock ID
     */
    function revokeVesting(uint256 lockId) 
        external 
        nonReentrant 
        whenNotPaused 
        lockExists(lockId) 
    {
        Lock storage lock = locks[lockId];
        VestingSchedule storage vesting = vestingSchedules[lockId];
        
        if (lock.lockType != LockType.VESTING) revert Unauthorized();
        if (msg.sender != lock.depositor && msg.sender != admin) revert NotDepositor();
        if (!vesting.revocable) revert NotRevocable();
        if (vesting.revoked) revert VestingRevoked();
        
        vesting.revoked = true;
        
        // Calculate unvested amount to return to depositor
        uint256 vestedAmount = _computeVestedAmount(vesting);
        uint256 unvested = vesting.totalAmount - vestedAmount;
        
        if (unvested > 0) {
            lock.amount -= unvested;
            totalLocked -= unvested;
            
            // Return unvested to depositor
            ILUSD lusd = ILUSD(LUSD_CONTRACT);
            if (!lusd.transfer(lock.depositor, unvested)) revert TransferFailed();
        }
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        MULTI-SIG FUNCTIONS                                ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a multi-sig lock
     * @param beneficiary Beneficiary address
     * @param amount Amount to lock
     * @param duration Lock duration
     * @param signers Array of signer addresses
     * @param requiredApprovals Required approvals count
     * @param refId Reference ID
     * @return lockId New lock ID
     */
    function createMultiSigLock(
        address beneficiary,
        uint256 amount,
        uint256 duration,
        address[] calldata signers,
        uint256 requiredApprovals,
        string calldata refId
    ) external nonReentrant whenNotPaused notEmergency returns (uint256 lockId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (duration < MIN_LOCK_DURATION || duration > MAX_LOCK_DURATION) revert InvalidDuration();
        if (signers.length < MIN_MULTISIG_APPROVALS) revert InvalidSigners();
        if (requiredApprovals < MIN_MULTISIG_APPROVALS || requiredApprovals > signers.length) {
            revert InvalidSigners();
        }
        
        // Transfer LUSD
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        
        lockCount++;
        lockId = lockCount;
        uint256 unlockTime = block.timestamp + duration;
        
        locks[lockId] = Lock({
            id: lockId,
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            originalAmount: amount,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            status: LockStatus.ACTIVE,
            lockType: LockType.MULTISIG,
            refId: refId,
            txHash: bytes32(0)
        });
        
        multiSigConfigs[lockId] = MultiSigConfig({
            lockId: lockId,
            requiredApprovals: requiredApprovals,
            currentApprovals: 0,
            signers: signers
        });
        
        userLocks[msg.sender].push(lockId);
        beneficiaryLocks[beneficiary].push(lockId);
        totalLocked += amount;
        
        emit LUSDLocked(lockId, msg.sender, beneficiary, amount, unlockTime, LockType.MULTISIG, refId);
        
        return lockId;
    }
    
    /**
     * @notice Approves a multi-sig release
     * @param lockId Lock ID
     */
    function approveMultiSigRelease(uint256 lockId) 
        external 
        whenNotPaused 
        lockExists(lockId) 
    {
        Lock storage lock = locks[lockId];
        MultiSigConfig storage config = multiSigConfigs[lockId];
        
        if (lock.lockType != LockType.MULTISIG) revert Unauthorized();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockNotUnlocked();
        if (multiSigApprovals[lockId][msg.sender]) revert AlreadyApproved();
        
        // Check if caller is a signer
        bool isSigner = false;
        for (uint256 i = 0; i < config.signers.length; i++) {
            if (config.signers[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        if (!isSigner) revert Unauthorized();
        
        multiSigApprovals[lockId][msg.sender] = true;
        config.currentApprovals++;
        
        emit MultiSigApproval(lockId, msg.sender, config.currentApprovals, config.requiredApprovals);
        
        // Auto-release if enough approvals
        if (config.currentApprovals >= config.requiredApprovals) {
            _executeMultiSigRelease(lockId);
        }
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                      EMERGENCY FUNCTIONS                                  ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Emergency withdrawal with penalty
     * @param lockId Lock ID
     */
    function emergencyWithdraw(uint256 lockId) 
        external 
        nonReentrant 
        lockExists(lockId) 
    {
        Lock storage lock = locks[lockId];
        
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        if (msg.sender != lock.depositor) revert NotDepositor();
        
        uint256 amount = lock.amount;
        uint256 penalty = (amount * EMERGENCY_PENALTY_BPS) / BPS_DENOMINATOR;
        uint256 returned = amount - penalty;
        
        lock.amount = 0;
        lock.status = LockStatus.EMERGENCY_WITHDRAWN;
        
        totalLocked -= amount;
        totalEmergencyWithdrawals++;
        totalPenaltiesCollected += penalty;
        
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        
        // Return amount minus penalty to depositor
        if (returned > 0) {
            if (!lusd.transfer(lock.depositor, returned)) revert TransferFailed();
        }
        
        // Send penalty to treasury
        if (penalty > 0) {
            if (!lusd.transfer(treasury, penalty)) revert TransferFailed();
        }
        
        emit EmergencyWithdrawal(lockId, lock.depositor, returned, penalty, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         ADMIN FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Initiates admin transfer
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }
    
    /**
     * @notice Accepts admin transfer
     */
    function acceptAdmin() external {
        if (pendingAdmin == address(0)) revert NoPendingAdmin();
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        
        address previousAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        
        emit AdminTransferCompleted(previousAdmin, admin);
    }
    
    /**
     * @notice Adds an operator
     * @param operator Operator address
     */
    function addOperator(address operator) external onlyAdmin {
        if (operator == address(0)) revert ZeroAddress();
        if (operators[operator]) revert AlreadyOperator();
        
        operators[operator] = true;
        operatorsList.push(operator);
        
        emit OperatorAdded(operator, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Removes an operator
     * @param operator Operator address
     */
    function removeOperator(address operator) external onlyAdmin {
        if (!operators[operator]) revert NotOperator();
        
        operators[operator] = false;
        
        for (uint256 i = 0; i < operatorsList.length; i++) {
            if (operatorsList[i] == operator) {
                operatorsList[i] = operatorsList[operatorsList.length - 1];
                operatorsList.pop();
                break;
            }
        }
        
        emit OperatorRemoved(operator, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Updates treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyAdmin {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @notice Changes beneficiary (depositor only)
     * @param lockId Lock ID
     * @param newBeneficiary New beneficiary address
     */
    function changeBeneficiary(uint256 lockId, address newBeneficiary)
        external
        lockExists(lockId)
    {
        if (newBeneficiary == address(0)) revert ZeroAddress();
        
        Lock storage lock = locks[lockId];
        if (msg.sender != lock.depositor && msg.sender != admin) revert NotDepositor();
        if (lock.status != LockStatus.ACTIVE) revert LockNotActive();
        
        address oldBeneficiary = lock.beneficiary;
        lock.beneficiary = newBeneficiary;
        
        beneficiaryLocks[newBeneficiary].push(lockId);
        
        emit BeneficiaryChanged(lockId, oldBeneficiary, newBeneficiary, block.timestamp);
    }
    
    /**
     * @notice Pauses the contract
     */
    function pause() external onlyOperator {
        paused = true;
        emit Paused(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Activates emergency mode
     */
    function activateEmergencyMode() external onlyAdmin {
        emergencyMode = true;
        paused = true;
        emit EmergencyModeActivated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Deactivates emergency mode
     */
    function deactivateEmergencyMode() external onlyAdmin {
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                          VIEW FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets lock details
     * @param lockId Lock ID
     * @return Lock struct data
     */
    function getLock(uint256 lockId) external view lockExists(lockId) returns (Lock memory) {
        return locks[lockId];
    }
    
    /**
     * @notice Gets vesting schedule
     * @param lockId Lock ID
     * @return VestingSchedule struct data
     */
    function getVestingSchedule(uint256 lockId) 
        external 
        view 
        lockExists(lockId) 
        returns (VestingSchedule memory) 
    {
        return vestingSchedules[lockId];
    }
    
    /**
     * @notice Gets multi-sig config
     * @param lockId Lock ID
     * @return MultiSigConfig struct data
     */
    function getMultiSigConfig(uint256 lockId) 
        external 
        view 
        lockExists(lockId) 
        returns (MultiSigConfig memory) 
    {
        return multiSigConfigs[lockId];
    }
    
    /**
     * @notice Gets user's locks
     * @param user User address
     * @return Array of lock IDs
     */
    function getUserLocks(address user) external view returns (uint256[] memory) {
        return userLocks[user];
    }
    
    /**
     * @notice Gets beneficiary's locks
     * @param beneficiary Beneficiary address
     * @return Array of lock IDs
     */
    function getBeneficiaryLocks(address beneficiary) external view returns (uint256[] memory) {
        return beneficiaryLocks[beneficiary];
    }
    
    /**
     * @notice Gets release history
     * @param lockId Lock ID
     * @return Array of release records
     */
    function getReleaseHistory(uint256 lockId) 
        external 
        view 
        lockExists(lockId) 
        returns (ReleaseRecord[] memory) 
    {
        return releaseHistory[lockId];
    }
    
    /**
     * @notice Gets all operators
     * @return Array of operator addresses
     */
    function getOperators() external view returns (address[] memory) {
        return operatorsList;
    }
    
    /**
     * @notice Checks if address is operator
     * @param account Address to check
     * @return True if operator
     */
    function isOperator(address account) external view returns (bool) {
        return operators[account];
    }
    
    /**
     * @notice Gets contract statistics
     * @return _lockCount Total locks
     * @return _totalLocked Total LUSD locked
     * @return _totalReleased Total LUSD released
     * @return _totalEmergencyWithdrawals Emergency withdrawal count
     * @return _totalPenaltiesCollected Total penalties
     */
    function getStatistics() external view returns (
        uint256 _lockCount,
        uint256 _totalLocked,
        uint256 _totalReleased,
        uint256 _totalEmergencyWithdrawals,
        uint256 _totalPenaltiesCollected
    ) {
        return (lockCount, totalLocked, totalReleased, totalEmergencyWithdrawals, totalPenaltiesCollected);
    }
    
    /**
     * @notice Gets LUSD balance in contract
     * @return Current LUSD balance
     */
    function getLUSDBalance() external view returns (uint256) {
        return ILUSD(LUSD_CONTRACT).balanceOf(address(this));
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        INTERNAL FUNCTIONS                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Computes vested amount
     */
    function _computeVestedAmount(VestingSchedule storage vesting) internal view returns (uint256) {
        if (block.timestamp < vesting.startTime) {
            return 0;
        }
        
        uint256 cliffEnd = vesting.startTime + vesting.cliffDuration;
        if (block.timestamp < cliffEnd) {
            return 0;
        }
        
        uint256 vestingEnd = vesting.startTime + vesting.vestingDuration;
        if (block.timestamp >= vestingEnd) {
            return vesting.totalAmount;
        }
        
        uint256 timeFromStart = block.timestamp - vesting.startTime;
        uint256 vestedSlices = timeFromStart / vesting.slicePeriod;
        uint256 totalSlices = vesting.vestingDuration / vesting.slicePeriod;
        
        return (vesting.totalAmount * vestedSlices) / totalSlices;
    }
    
    /**
     * @notice Executes multi-sig release
     */
    function _executeMultiSigRelease(uint256 lockId) internal {
        Lock storage lock = locks[lockId];
        
        uint256 amount = lock.amount;
        lock.amount = 0;
        lock.status = LockStatus.RELEASED;
        
        totalLocked -= amount;
        totalReleased += amount;
        
        ILUSD lusd = ILUSD(LUSD_CONTRACT);
        if (!lusd.transfer(lock.beneficiary, amount)) revert TransferFailed();
        
        releaseHistory[lockId].push(ReleaseRecord({
            lockId: lockId,
            amount: amount,
            releasedTo: lock.beneficiary,
            releasedBy: msg.sender,
            timestamp: block.timestamp,
            reason: "Multi-sig release"
        }));
        
        emit LUSDReleased(lockId, lock.beneficiary, amount, msg.sender, block.timestamp);
    }
}
