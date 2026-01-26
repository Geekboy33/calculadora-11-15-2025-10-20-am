// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleLockBox - DCB Treasury Certification Platform
 * @notice Simplified Lock system for LemonChain
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract SimpleLockBox {
    enum LockStatus { NONE, REQUESTED, LOCKED, CONSUMED, CANCELED }
    
    struct Lock {
        bytes32 lockId;
        bytes32 bankId;
        address custodyVault;
        uint256 amount;
        uint256 requestedAt;
        uint256 lockedAt;
        uint256 consumedAt;
        string isoReference;
        LockStatus status;
        address bankSigner;
        address daesSigner;
        uint256 approvedLUSD;
    }
    
    address public admin;
    mapping(address => bool) public bankSigners;
    mapping(address => bool) public daesSigners;
    mapping(address => bool) public issuers;
    mapping(address => bool) public approvers;
    
    mapping(bytes32 => Lock) public locks;
    bytes32[] public lockIds;
    
    uint256 public totalLocked;
    uint256 public totalConsumed;
    
    event LockRequested(bytes32 indexed lockId, bytes32 indexed bankId, uint256 amount);
    event LockApproved(bytes32 indexed lockId, address daesSigner);
    event LockConsumed(bytes32 indexed lockId, uint256 lusdMinted);
    event LockCanceled(bytes32 indexed lockId);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "LockBox: not admin");
        _;
    }
    
    modifier onlyBankSigner() {
        require(bankSigners[msg.sender] || msg.sender == admin, "LockBox: not bank signer");
        _;
    }
    
    modifier onlyDaesSigner() {
        require(daesSigners[msg.sender] || msg.sender == admin, "LockBox: not DAES signer");
        _;
    }
    
    modifier onlyIssuer() {
        require(issuers[msg.sender] || msg.sender == admin, "LockBox: not issuer");
        _;
    }
    
    modifier onlyApprover() {
        require(approvers[msg.sender] || msg.sender == admin, "LockBox: not approver");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        bankSigners[msg.sender] = true;
        daesSigners[msg.sender] = true;
        issuers[msg.sender] = true;
        approvers[msg.sender] = true;
    }
    
    function setBankSigner(address signer, bool status) external onlyAdmin {
        bankSigners[signer] = status;
    }
    
    function setDaesSigner(address signer, bool status) external onlyAdmin {
        daesSigners[signer] = status;
    }
    
    function setIssuer(address issuer, bool status) external onlyAdmin {
        issuers[issuer] = status;
    }
    
    function setApprover(address approver, bool status) external onlyAdmin {
        approvers[approver] = status;
    }
    
    function requestLock(
        bytes32 _bankId,
        address _custodyVault,
        uint256 _amount,
        string calldata _isoReference
    ) external onlyBankSigner returns (bytes32) {
        bytes32 lockId = keccak256(abi.encodePacked(
            _bankId,
            _custodyVault,
            _amount,
            block.timestamp,
            _isoReference
        ));
        
        require(locks[lockId].lockId == bytes32(0), "LockBox: lock already exists");
        
        locks[lockId] = Lock({
            lockId: lockId,
            bankId: _bankId,
            custodyVault: _custodyVault,
            amount: _amount,
            requestedAt: block.timestamp,
            lockedAt: 0,
            consumedAt: 0,
            isoReference: _isoReference,
            status: LockStatus.REQUESTED,
            bankSigner: msg.sender,
            daesSigner: address(0),
            approvedLUSD: 0
        });
        
        lockIds.push(lockId);
        
        emit LockRequested(lockId, _bankId, _amount);
        return lockId;
    }
    
    function approveLock(bytes32 _lockId) external onlyDaesSigner {
        Lock storage lock = locks[_lockId];
        require(lock.lockId != bytes32(0), "LockBox: lock not found");
        require(lock.status == LockStatus.REQUESTED, "LockBox: invalid lock status");
        
        lock.status = LockStatus.LOCKED;
        lock.lockedAt = block.timestamp;
        lock.daesSigner = msg.sender;
        
        totalLocked += lock.amount;
        
        emit LockApproved(_lockId, msg.sender);
    }
    
    function consumeLock(bytes32 _lockId, uint256 _lusdAmount) external onlyIssuer {
        Lock storage lock = locks[_lockId];
        require(lock.lockId != bytes32(0), "LockBox: lock not found");
        require(lock.status == LockStatus.LOCKED, "LockBox: lock not approved");
        
        lock.status = LockStatus.CONSUMED;
        lock.consumedAt = block.timestamp;
        lock.approvedLUSD = _lusdAmount;
        
        totalConsumed += lock.amount;
        
        emit LockConsumed(_lockId, _lusdAmount);
    }
    
    function cancelLock(bytes32 _lockId) external onlyApprover {
        Lock storage lock = locks[_lockId];
        require(lock.lockId != bytes32(0), "LockBox: lock not found");
        require(lock.status == LockStatus.REQUESTED || lock.status == LockStatus.LOCKED, "LockBox: cannot cancel");
        
        if (lock.status == LockStatus.LOCKED) {
            totalLocked -= lock.amount;
        }
        
        lock.status = LockStatus.CANCELED;
        
        emit LockCanceled(_lockId);
    }
    
    function getLock(bytes32 _lockId) external view returns (Lock memory) {
        return locks[_lockId];
    }
    
    function getLockCount() external view returns (uint256) {
        return lockIds.length;
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
