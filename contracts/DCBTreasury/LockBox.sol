// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LockBox - DCB Treasury Certification Platform
 * @notice Secure USD locking mechanism with multi-signature release
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 * @author DCB Treasury Team
 * 
 * This contract implements:
 * - Time-locked USD deposits
 * - Multi-signature release authorization
 * - Emergency withdrawal with delay
 * - Lock status tracking and auditing
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LockBox {
    // ─────────────────────────────────────────────────────────────────────────────
    // DATA STRUCTURES
    // ─────────────────────────────────────────────────────────────────────────────
    
    struct Lock {
        bytes32 lockId;
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 lockTime;
        uint256 unlockTime;
        bool isActive;
        bool isReleased;
        string lockReference;
        uint256 approvalsCount;
        mapping(address => bool) approvals;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    IERC20 public usdToken;
    address public admin;
    
    // Lock storage
    mapping(bytes32 => Lock) public locks;
    bytes32[] public lockIds;
    
    // Signers for multi-sig release
    mapping(address => bool) public signers;
    address[] public signerList;
    uint256 public requiredSignatures;
    
    // Emergency withdrawal
    uint256 public emergencyDelay = 7 days;
    mapping(bytes32 => uint256) public emergencyRequests;
    
    // Statistics
    uint256 public totalLocked;
    uint256 public totalReleased;
    uint256 public lockCount;
    
    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────
    
    event USDLocked(
        bytes32 indexed lockId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint256 unlockTime,
        string lockReference
    );
    
    event LockApproved(
        bytes32 indexed lockId,
        address indexed signer,
        uint256 currentApprovals
    );
    
    event USDReleased(
        bytes32 indexed lockId,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );
    
    event EmergencyRequested(
        bytes32 indexed lockId,
        address indexed requester,
        uint256 availableAt
    );
    
    event EmergencyExecuted(
        bytes32 indexed lockId,
        address indexed to,
        uint256 amount
    );
    
    event EmergencyCancelled(bytes32 indexed lockId);
    
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event RequiredSignaturesChanged(uint256 oldValue, uint256 newValue);
    event EmergencyDelayChanged(uint256 oldValue, uint256 newValue);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "LockBox: caller is not admin");
        _;
    }
    
    modifier onlySigner() {
        require(signers[msg.sender], "LockBox: caller is not signer");
        _;
    }
    
    modifier onlyAdminOrSigner() {
        require(
            msg.sender == admin || signers[msg.sender],
            "LockBox: caller is not admin or signer"
        );
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _usdToken) {
        require(_usdToken != address(0), "LockBox: invalid token address");
        
        usdToken = IERC20(_usdToken);
        admin = msg.sender;
        signers[msg.sender] = true;
        signerList.push(msg.sender);
        requiredSignatures = 1;
        
        emit AdminTransferred(address(0), msg.sender);
        emit SignerAdded(msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // LOCKING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Lock USD tokens with a time-based unlock
     * @param _beneficiary Address that will receive the tokens
     * @param _amount Amount to lock
     * @param _unlockTime Timestamp when tokens can be released
     * @param _lockReference External reference (e.g., transaction ID)
     * @return lockId The unique identifier for this lock
     */
    function lockUSD(
        address _beneficiary,
        uint256 _amount,
        uint256 _unlockTime,
        string memory _lockReference
    ) external returns (bytes32 lockId) {
        require(_beneficiary != address(0), "LockBox: invalid beneficiary");
        require(_amount > 0, "LockBox: amount must be positive");
        require(_unlockTime > block.timestamp, "LockBox: unlock time must be future");
        
        // Generate unique lock ID
        lockId = keccak256(abi.encodePacked(
            msg.sender,
            _beneficiary,
            _amount,
            _unlockTime,
            block.timestamp,
            lockCount
        ));
        
        require(!locks[lockId].isActive, "LockBox: lock ID collision");
        
        // Transfer tokens to this contract
        require(
            usdToken.transferFrom(msg.sender, address(this), _amount),
            "LockBox: transfer failed"
        );
        
        // Create lock
        Lock storage newLock = locks[lockId];
        newLock.lockId = lockId;
        newLock.depositor = msg.sender;
        newLock.beneficiary = _beneficiary;
        newLock.amount = _amount;
        newLock.lockTime = block.timestamp;
        newLock.unlockTime = _unlockTime;
        newLock.isActive = true;
        newLock.isReleased = false;
        newLock.lockReference = _lockReference;
        newLock.approvalsCount = 0;
        
        lockIds.push(lockId);
        lockCount++;
        totalLocked += _amount;
        
        emit USDLocked(lockId, msg.sender, _beneficiary, _amount, _unlockTime, _lockReference);
        
        return lockId;
    }
    
    /**
     * @notice Lock USD directly (admin only, for internal operations)
     * @param _depositor Original depositor address
     * @param _beneficiary Address that will receive the tokens
     * @param _amount Amount to lock
     * @param _unlockTime Timestamp when tokens can be released
     * @param _lockReference External reference
     * @return lockId The unique identifier for this lock
     */
    function lockUSDDirect(
        address _depositor,
        address _beneficiary,
        uint256 _amount,
        uint256 _unlockTime,
        string memory _lockReference
    ) external onlyAdmin returns (bytes32 lockId) {
        require(_beneficiary != address(0), "LockBox: invalid beneficiary");
        require(_amount > 0, "LockBox: amount must be positive");
        require(_unlockTime > block.timestamp, "LockBox: unlock time must be future");
        
        // Generate unique lock ID
        lockId = keccak256(abi.encodePacked(
            _depositor,
            _beneficiary,
            _amount,
            _unlockTime,
            block.timestamp,
            lockCount
        ));
        
        require(!locks[lockId].isActive, "LockBox: lock ID collision");
        
        // Transfer tokens from depositor to this contract
        require(
            usdToken.transferFrom(_depositor, address(this), _amount),
            "LockBox: transfer failed"
        );
        
        // Create lock
        Lock storage newLock = locks[lockId];
        newLock.lockId = lockId;
        newLock.depositor = _depositor;
        newLock.beneficiary = _beneficiary;
        newLock.amount = _amount;
        newLock.lockTime = block.timestamp;
        newLock.unlockTime = _unlockTime;
        newLock.isActive = true;
        newLock.isReleased = false;
        newLock.lockReference = _lockReference;
        newLock.approvalsCount = 0;
        
        lockIds.push(lockId);
        lockCount++;
        totalLocked += _amount;
        
        emit USDLocked(lockId, _depositor, _beneficiary, _amount, _unlockTime, _lockReference);
        
        return lockId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // RELEASE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Approve a lock for release (multi-sig)
     * @param _lockId ID of the lock to approve
     */
    function approveLockRelease(bytes32 _lockId) external onlySigner {
        Lock storage lockData = locks[_lockId];
        
        require(lockData.isActive, "LockBox: lock not active");
        require(!lockData.isReleased, "LockBox: already released");
        require(!lockData.approvals[msg.sender], "LockBox: already approved");
        require(block.timestamp >= lockData.unlockTime, "LockBox: still locked");
        
        lockData.approvals[msg.sender] = true;
        lockData.approvalsCount++;
        
        emit LockApproved(_lockId, msg.sender, lockData.approvalsCount);
        
        // Auto-release if enough approvals
        if (lockData.approvalsCount >= requiredSignatures) {
            _releaseLock(_lockId);
        }
    }
    
    /**
     * @notice Execute release after sufficient approvals
     * @param _lockId ID of the lock to release
     */
    function executeRelease(bytes32 _lockId) external onlyAdminOrSigner {
        Lock storage lockData = locks[_lockId];
        
        require(lockData.isActive, "LockBox: lock not active");
        require(!lockData.isReleased, "LockBox: already released");
        require(block.timestamp >= lockData.unlockTime, "LockBox: still locked");
        require(
            lockData.approvalsCount >= requiredSignatures,
            "LockBox: insufficient approvals"
        );
        
        _releaseLock(_lockId);
    }
    
    function _releaseLock(bytes32 _lockId) internal {
        Lock storage lockData = locks[_lockId];
        
        lockData.isActive = false;
        lockData.isReleased = true;
        
        require(
            usdToken.transfer(lockData.beneficiary, lockData.amount),
            "LockBox: transfer failed"
        );
        
        totalReleased += lockData.amount;
        
        emit USDReleased(_lockId, lockData.beneficiary, lockData.amount, block.timestamp);
    }
    
    /**
     * @notice Release lock directly (admin only, bypasses multi-sig)
     * @param _lockId ID of the lock to release
     */
    function releaseLockDirect(bytes32 _lockId) external onlyAdmin {
        Lock storage lockData = locks[_lockId];
        
        require(lockData.isActive, "LockBox: lock not active");
        require(!lockData.isReleased, "LockBox: already released");
        require(block.timestamp >= lockData.unlockTime, "LockBox: still locked");
        
        _releaseLock(_lockId);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Request emergency withdrawal (with delay)
     * @param _lockId ID of the lock
     */
    function requestEmergencyWithdrawal(bytes32 _lockId) external onlyAdmin {
        Lock storage lockData = locks[_lockId];
        
        require(lockData.isActive, "LockBox: lock not active");
        require(!lockData.isReleased, "LockBox: already released");
        require(emergencyRequests[_lockId] == 0, "LockBox: emergency already requested");
        
        uint256 availableAt = block.timestamp + emergencyDelay;
        emergencyRequests[_lockId] = availableAt;
        
        emit EmergencyRequested(_lockId, msg.sender, availableAt);
    }
    
    /**
     * @notice Execute emergency withdrawal after delay
     * @param _lockId ID of the lock
     * @param _to Address to send funds (can be different from beneficiary)
     */
    function executeEmergencyWithdrawal(bytes32 _lockId, address _to) external onlyAdmin {
        Lock storage lockData = locks[_lockId];
        
        require(lockData.isActive, "LockBox: lock not active");
        require(!lockData.isReleased, "LockBox: already released");
        require(emergencyRequests[_lockId] > 0, "LockBox: emergency not requested");
        require(block.timestamp >= emergencyRequests[_lockId], "LockBox: delay not passed");
        require(_to != address(0), "LockBox: invalid recipient");
        
        lockData.isActive = false;
        lockData.isReleased = true;
        emergencyRequests[_lockId] = 0;
        
        require(
            usdToken.transfer(_to, lockData.amount),
            "LockBox: transfer failed"
        );
        
        totalReleased += lockData.amount;
        
        emit EmergencyExecuted(_lockId, _to, lockData.amount);
    }
    
    /**
     * @notice Cancel emergency withdrawal request
     * @param _lockId ID of the lock
     */
    function cancelEmergencyRequest(bytes32 _lockId) external onlyAdmin {
        require(emergencyRequests[_lockId] > 0, "LockBox: no emergency request");
        
        emergencyRequests[_lockId] = 0;
        
        emit EmergencyCancelled(_lockId);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SIGNER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add a new signer
     * @param _signer Address of the new signer
     */
    function addSigner(address _signer) external onlyAdmin {
        require(_signer != address(0), "LockBox: invalid address");
        require(!signers[_signer], "LockBox: already a signer");
        
        signers[_signer] = true;
        signerList.push(_signer);
        
        emit SignerAdded(_signer);
    }
    
    /**
     * @notice Remove a signer
     * @param _signer Address of the signer to remove
     */
    function removeSigner(address _signer) external onlyAdmin {
        require(signers[_signer], "LockBox: not a signer");
        require(signerList.length > requiredSignatures, "LockBox: cannot remove, would break quorum");
        
        signers[_signer] = false;
        
        // Remove from array
        for (uint256 i = 0; i < signerList.length; i++) {
            if (signerList[i] == _signer) {
                signerList[i] = signerList[signerList.length - 1];
                signerList.pop();
                break;
            }
        }
        
        emit SignerRemoved(_signer);
    }
    
    /**
     * @notice Set required number of signatures
     * @param _required New required signatures count
     */
    function setRequiredSignatures(uint256 _required) external onlyAdmin {
        require(_required > 0, "LockBox: must require at least 1 signature");
        require(_required <= signerList.length, "LockBox: cannot exceed signer count");
        
        uint256 oldValue = requiredSignatures;
        requiredSignatures = _required;
        
        emit RequiredSignaturesChanged(oldValue, _required);
    }
    
    /**
     * @notice Set emergency delay period
     * @param _delay New delay in seconds
     */
    function setEmergencyDelay(uint256 _delay) external onlyAdmin {
        require(_delay >= 1 days, "LockBox: delay must be at least 1 day");
        
        uint256 oldValue = emergencyDelay;
        emergencyDelay = _delay;
        
        emit EmergencyDelayChanged(oldValue, _delay);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get lock details
     * @param _lockId ID of the lock
     * @return depositor Original depositor
     * @return beneficiary Recipient address
     * @return amount Locked amount
     * @return unlockTime When it can be released
     * @return isActive Whether still active
     * @return approvalsCount Current approvals
     */
    function getLockDetails(bytes32 _lockId) external view returns (
        address depositor,
        address beneficiary,
        uint256 amount,
        uint256 unlockTime,
        bool isActive,
        uint256 approvalsCount
    ) {
        Lock storage lockData = locks[_lockId];
        return (
            lockData.depositor,
            lockData.beneficiary,
            lockData.amount,
            lockData.unlockTime,
            lockData.isActive,
            lockData.approvalsCount
        );
    }
    
    /**
     * @notice Check if lock is releasable
     * @param _lockId ID of the lock
     * @return True if can be released
     */
    function isReleasable(bytes32 _lockId) external view returns (bool) {
        Lock storage lockData = locks[_lockId];
        return lockData.isActive && 
               !lockData.isReleased && 
               block.timestamp >= lockData.unlockTime &&
               lockData.approvalsCount >= requiredSignatures;
    }
    
    /**
     * @notice Check if signer has approved a lock
     * @param _lockId ID of the lock
     * @param _signer Signer address
     * @return True if approved
     */
    function hasApproved(bytes32 _lockId, address _signer) external view returns (bool) {
        return locks[_lockId].approvals[_signer];
    }
    
    /**
     * @notice Get total locked balance
     * @return Current locked amount
     */
    function getLockedBalance() external view returns (uint256) {
        return usdToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get all lock IDs
     * @return Array of lock IDs
     */
    function getAllLockIds() external view returns (bytes32[] memory) {
        return lockIds;
    }
    
    /**
     * @notice Get signer count
     * @return Number of signers
     */
    function getSignerCount() external view returns (uint256) {
        return signerList.length;
    }
    
    /**
     * @notice Get all signers
     * @return Array of signer addresses
     */
    function getAllSigners() external view returns (address[] memory) {
        return signerList;
    }
    
    /**
     * @notice Get statistics
     * @return _totalLocked Total ever locked
     * @return _totalReleased Total ever released
     * @return _lockCount Total locks created
     * @return _currentBalance Current contract balance
     */
    function getStats() external view returns (
        uint256 _totalLocked,
        uint256 _totalReleased,
        uint256 _lockCount,
        uint256 _currentBalance
    ) {
        return (
            totalLocked,
            totalReleased,
            lockCount,
            usdToken.balanceOf(address(this))
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfer admin role to new address
     * @param newAdmin Address of new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "LockBox: new admin is zero address");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
    
    /**
     * @notice Update the USD token address (emergency only)
     * @param _newToken New token address
     */
    function updateUSDToken(address _newToken) external onlyAdmin {
        require(_newToken != address(0), "LockBox: invalid token address");
        require(usdToken.balanceOf(address(this)) == 0, "LockBox: has active balance");
        
        usdToken = IERC20(_newToken);
    }
}
