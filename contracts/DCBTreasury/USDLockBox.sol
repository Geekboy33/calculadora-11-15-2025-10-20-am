// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title USDLockBox - DCB Treasury Certification Platform
 * @notice Lock system with EIP-712 signatures for bank attestation
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract USDLockBox is AccessControl, EIP712 {
    using ECDSA for bytes32;
    
    bytes32 public constant BANK_SIGNER_ROLE = keccak256("BANK_SIGNER_ROLE");
    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    
    bytes32 public constant LOCK_TYPEHASH = keccak256(
        "LockRequest(bytes32 lockId,bytes32 bankId,address custodyVault,uint256 amount,uint256 deadline,string isoReference)"
    );
    
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
    
    mapping(bytes32 => Lock) public locks;
    bytes32[] public lockIds;
    
    uint256 public totalLocked;
    uint256 public totalConsumed;
    
    event LockRequested(bytes32 indexed lockId, bytes32 indexed bankId, uint256 amount);
    event LockApproved(bytes32 indexed lockId, address bankSigner);
    event LockConsumed(bytes32 indexed lockId, uint256 lusdMinted);
    event LockCanceled(bytes32 indexed lockId);
    
    constructor() EIP712("DCB Treasury LockBox", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BANK_SIGNER_ROLE, msg.sender);
        _grantRole(DAES_SIGNER_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(APPROVER_ROLE, msg.sender);
    }
    
    function requestLock(
        bytes32 bankId,
        address custodyVault,
        uint256 amount,
        string calldata isoReference
    ) external onlyRole(BANK_SIGNER_ROLE) returns (bytes32) {
        bytes32 lockId = keccak256(abi.encodePacked(
            bankId,
            custodyVault,
            amount,
            block.timestamp,
            isoReference
        ));
        
        require(locks[lockId].lockId == bytes32(0), "LockBox: lock already exists");
        
        locks[lockId] = Lock({
            lockId: lockId,
            bankId: bankId,
            custodyVault: custodyVault,
            amount: amount,
            requestedAt: block.timestamp,
            lockedAt: 0,
            consumedAt: 0,
            isoReference: isoReference,
            status: LockStatus.REQUESTED,
            bankSigner: msg.sender,
            daesSigner: address(0),
            approvedLUSD: 0
        });
        
        lockIds.push(lockId);
        
        emit LockRequested(lockId, bankId, amount);
        return lockId;
    }
    
    function approveLock(
        bytes32 lockId,
        bytes calldata bankSignature,
        uint256 deadline
    ) external onlyRole(DAES_SIGNER_ROLE) {
        Lock storage lock = locks[lockId];
        require(lock.lockId != bytes32(0), "LockBox: lock not found");
        require(lock.status == LockStatus.REQUESTED, "LockBox: invalid lock status");
        require(block.timestamp <= deadline, "LockBox: signature expired");
        
        // Verify EIP-712 signature from bank signer
        bytes32 structHash = keccak256(abi.encode(
            LOCK_TYPEHASH,
            lockId,
            lock.bankId,
            lock.custodyVault,
            lock.amount,
            deadline,
            keccak256(bytes(lock.isoReference))
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(bankSignature);
        
        require(hasRole(BANK_SIGNER_ROLE, signer), "LockBox: invalid bank signature");
        
        lock.status = LockStatus.LOCKED;
        lock.lockedAt = block.timestamp;
        lock.daesSigner = msg.sender;
        
        totalLocked += lock.amount;
        
        emit LockApproved(lockId, signer);
    }
    
    function consumeLock(bytes32 lockId, uint256 lusdAmount) external onlyRole(ISSUER_ROLE) {
        Lock storage lock = locks[lockId];
        require(lock.lockId != bytes32(0), "LockBox: lock not found");
        require(lock.status == LockStatus.LOCKED, "LockBox: lock not approved");
        
        lock.status = LockStatus.CONSUMED;
        lock.consumedAt = block.timestamp;
        lock.approvedLUSD = lusdAmount;
        
        totalConsumed += lock.amount;
        
        emit LockConsumed(lockId, lusdAmount);
    }
    
    function cancelLock(bytes32 lockId) external onlyRole(APPROVER_ROLE) {
        Lock storage lock = locks[lockId];
        require(lock.lockId != bytes32(0), "LockBox: lock not found");
        require(lock.status == LockStatus.REQUESTED || lock.status == LockStatus.LOCKED, "LockBox: cannot cancel");
        
        if (lock.status == LockStatus.LOCKED) {
            totalLocked -= lock.amount;
        }
        
        lock.status = LockStatus.CANCELED;
        
        emit LockCanceled(lockId);
    }
    
    function getLock(bytes32 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }
    
    function getAllLocks() external view returns (Lock[] memory) {
        Lock[] memory allLocks = new Lock[](lockIds.length);
        for (uint i = 0; i < lockIds.length; i++) {
            allLocks[i] = locks[lockIds[i]];
        }
        return allLocks;
    }
    
    function getLockCount() external view returns (uint256) {
        return lockIds.length;
    }
    
    function getLocksByStatus(LockStatus status) external view returns (Lock[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < lockIds.length; i++) {
            if (locks[lockIds[i]].status == status) count++;
        }
        
        Lock[] memory result = new Lock[](count);
        uint256 index = 0;
        for (uint i = 0; i < lockIds.length; i++) {
            if (locks[lockIds[i]].status == status) {
                result[index] = locks[lockIds[i]];
                index++;
            }
        }
        return result;
    }
    
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
