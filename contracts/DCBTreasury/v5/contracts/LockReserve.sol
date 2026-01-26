// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                   ║
 * ║    ██╗      ██████╗  ██████╗██╗  ██╗    ██████╗ ███████╗███████╗███████╗██████╗ ██╗   ██╗███████╗ ║
 * ║    ██║     ██╔═══██╗██╔════╝██║ ██╔╝    ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝ ║
 * ║    ██║     ██║   ██║██║     █████╔╝     ██████╔╝█████╗  ███████╗█████╗  ██████╔╝██║   ██║█████╗   ║
 * ║    ██║     ██║   ██║██║     ██╔═██╗     ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝   ║
 * ║    ███████╗╚██████╔╝╚██████╗██║  ██╗    ██║  ██║███████╗███████║███████╗██║  ██║ ╚████╔╝ ███████╗ ║
 * ║    ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝ ║
 * ║                                                                                                   ║
 * ║─────────────────────────────────────────────────────────────────────────────────────────────────  ║
 * ║                                                                                                   ║
 * ║                          ┌─────────────────────────────────────┐                                  ║
 * ║                          │     DIGITAL COMMERCIAL BANK         │                                  ║
 * ║                          │        TREASURY SYSTEM              │                                  ║
 * ║                          │     ══════════════════════          │                                  ║
 * ║                          │        USD Lock Vault               │                                  ║
 * ║                          │       VUSD Backing Reserve          │                                  ║
 * ║                          └─────────────────────────────────────┘                                  ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Contract: LockReserve                        Network: LemonChain (1006)                          ║
 * ║  Version: 5.0.0                               License: MIT                                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║  SIGNATURE FLOW                               LINKED CONTRACTS                                    ║
 * ║  ──────────────                               ────────────────                                    ║
 * ║  ① USD Injection (First Signature)           VUSD: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b    ║
 * ║  ② Operator Accepts (Second Signature)       Minter: 0xaccA35529b2FC2041dFb124F83f52120E24377B2  ║
 * ║  ③ VUSDMinter Consumes (Third Signature)                                                         ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title LockReserve - USD Lock Vault for VUSD Backing
 * @author Digital Commercial Bank Ltd
 * @notice Manages USD locks that back VUSD minting
 * @dev Implements second signature in the three-signature flow
 * @custom:security-contact rwa@digcommbank.com
 * @custom:version 5.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSDTokenized {
    function acceptInjection(bytes32 injectionId) external returns (bool);
    function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) external returns (bool);
    function recordConsumptionForVUSD(bytes32 injectionId, bytes32 vusdTxHash) external returns (bool);
}

contract LockReserve is AccessControl, Pausable, ReentrancyGuard {

    // ========================================================================================================
    // CONSTANTS
    // ========================================================================================================

    string public constant VERSION = "5.0.0";
    uint256 public constant CHAIN_ID = 1006;
    
    address public constant VUSD_CONTRACT = 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b;
    address public constant VUSD_MINTER_WALLET = 0xaccA35529b2FC2041dFb124F83f52120E24377B2;

    // ========================================================================================================
    // ROLES
    // ========================================================================================================

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant VUSD_MINTING_ROLE = keccak256("VUSD_MINTING_ROLE");
    bytes32 public constant RESERVE_MANAGER_ROLE = keccak256("RESERVE_MANAGER_ROLE");

    // ========================================================================================================
    // ENUMS
    // ========================================================================================================

    enum LockStatus {
        PENDING,
        ACCEPTED,
        IN_RESERVE,
        PARTIALLY_CONSUMED,
        FULLY_CONSUMED,
        CANCELLED,
        EXPIRED
    }

    // ========================================================================================================
    // STRUCTS
    // ========================================================================================================

    struct Lock {
        bytes32 lockId;
        bytes32 usdInjectionId;
        uint256 originalAmount;
        uint256 availableAmount;
        uint256 consumedAmount;
        address beneficiary;
        address acceptedBy;
        LockStatus status;
        bytes32 firstSignature;
        bytes32 secondSignature;
        bytes32 thirdSignature;
        uint256 receivedAt;
        uint256 acceptedAt;
        uint256 lastConsumedAt;
        uint256 fullyConsumedAt;
        bytes32[] mintingIds;
        uint256[] mintedAmounts;
        uint256 expiresAt;
        string authorizationCode;
    }

    struct ConsumptionRecord {
        bytes32 consumptionId;
        bytes32 lockId;
        uint256 amount;
        bytes32 vusdMintingId;
        bytes32 vusdTxHash;
        address consumedBy;
        uint256 consumedAt;
    }

    // ========================================================================================================
    // STATE VARIABLES
    // ========================================================================================================

    address public usdContract;
    address public vusdMintingContract;
    
    uint256 public totalReserve;
    uint256 public totalConsumed;
    uint256 public totalLocks;
    uint256 public totalConsumptions;
    uint256 public defaultExpiryDuration = 30 days;

    // ========================================================================================================
    // MAPPINGS
    // ========================================================================================================

    mapping(bytes32 => Lock) public locks;
    bytes32[] public lockIds;
    mapping(bytes32 => ConsumptionRecord) public consumptions;
    bytes32[] public consumptionIds;
    mapping(bytes32 => bytes32) public injectionToLock;
    mapping(string => bytes32) public authCodeToLock;

    // ========================================================================================================
    // EVENTS
    // ========================================================================================================

    event LockReceived(bytes32 indexed lockId, bytes32 indexed usdInjectionId, uint256 amount, address indexed beneficiary, bytes32 firstSignature, uint256 timestamp);
    event LockAccepted(bytes32 indexed lockId, address indexed acceptedBy, bytes32 secondSignature, string authorizationCode, uint256 timestamp);
    event MovedToReserve(bytes32 indexed lockId, uint256 amount, uint256 timestamp);
    event ReserveConsumed(bytes32 indexed lockId, bytes32 indexed consumptionId, uint256 amount, bytes32 vusdMintingId, bytes32 thirdSignature, uint256 timestamp);
    event LockFullyConsumed(bytes32 indexed lockId, uint256 totalMinted, uint256 timestamp);
    event CompleteAuditTrail(bytes32 indexed lockId, bytes32 usdInjectionId, uint256 originalAmount, uint256 consumedAmount, bytes32 firstSignature, bytes32 secondSignature, bytes32 thirdSignature, uint256 timestamp);
    event ExpiryDurationChanged(uint256 oldDuration, uint256 newDuration);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);
    event VUSDMintingContractSet(address indexed oldContract, address indexed newContract);

    // ========================================================================================================
    // ERRORS
    // ========================================================================================================

    error InvalidAmount();
    error InvalidAddress();
    error LockNotFound();
    error LockNotPending();
    error LockNotAccepted();
    error LockNotInReserve();
    error LockExpired();
    error InsufficientReserve();
    error AuthCodeAlreadyUsed();
    error ContractNotSet();

    // ========================================================================================================
    // CONSTRUCTOR
    // ========================================================================================================

    constructor(address _admin, address _usdContract) {
        if (_admin == address(0)) revert InvalidAddress();
        if (_usdContract == address(0)) revert InvalidAddress();
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(RESERVE_MANAGER_ROLE, _admin);
        
        usdContract = _usdContract;
    }

    // ========================================================================================================
    // LOCK RECEIVING
    // ========================================================================================================

    function receiveLock(
        bytes32 usdInjectionId,
        uint256 amount,
        address beneficiary,
        bytes32 firstSignature
    ) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused returns (bytes32 lockId) {
        if (amount == 0) revert InvalidAmount();
        if (beneficiary == address(0)) revert InvalidAddress();
        if (injectionToLock[usdInjectionId] != bytes32(0)) revert AuthCodeAlreadyUsed();
        
        lockId = keccak256(abi.encodePacked(usdInjectionId, amount, beneficiary, block.timestamp, totalLocks));
        
        locks[lockId] = Lock({
            lockId: lockId,
            usdInjectionId: usdInjectionId,
            originalAmount: amount,
            availableAmount: amount,
            consumedAmount: 0,
            beneficiary: beneficiary,
            acceptedBy: address(0),
            status: LockStatus.PENDING,
            firstSignature: firstSignature,
            secondSignature: bytes32(0),
            thirdSignature: bytes32(0),
            receivedAt: block.timestamp,
            acceptedAt: 0,
            lastConsumedAt: 0,
            fullyConsumedAt: 0,
            mintingIds: new bytes32[](0),
            mintedAmounts: new uint256[](0),
            expiresAt: block.timestamp + defaultExpiryDuration,
            authorizationCode: ""
        });
        
        lockIds.push(lockId);
        injectionToLock[usdInjectionId] = lockId;
        totalLocks++;
        
        emit LockReceived(lockId, usdInjectionId, amount, beneficiary, firstSignature, block.timestamp);
        return lockId;
    }

    // ========================================================================================================
    // LOCK ACCEPTANCE (SECOND SIGNATURE)
    // ========================================================================================================

    function acceptLock(bytes32 lockId) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused returns (bytes32 secondSignature, string memory authCode) {
        Lock storage lock = locks[lockId];
        if (lock.receivedAt == 0) revert LockNotFound();
        if (lock.status != LockStatus.PENDING) revert LockNotPending();
        if (block.timestamp > lock.expiresAt) revert LockExpired();
        
        // SECOND SIGNATURE - Treasury Minting Acceptance
        secondSignature = keccak256(abi.encodePacked(
            lockId, lock.usdInjectionId, lock.originalAmount, lock.beneficiary, msg.sender, block.timestamp, "TREASURY_MINTING_SECOND_SIGNATURE_v5"
        ));
        
        authCode = _generateAuthCode(lockId, lock.originalAmount);
        
        lock.status = LockStatus.ACCEPTED;
        lock.acceptedBy = msg.sender;
        lock.secondSignature = secondSignature;
        lock.acceptedAt = block.timestamp;
        lock.authorizationCode = authCode;
        
        authCodeToLock[authCode] = lockId;
        
        IUSDTokenized(usdContract).acceptInjection(lock.usdInjectionId);
        
        emit LockAccepted(lockId, msg.sender, secondSignature, authCode, block.timestamp);
        return (secondSignature, authCode);
    }

    function moveToReserve(bytes32 lockId) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        Lock storage lock = locks[lockId];
        if (lock.receivedAt == 0) revert LockNotFound();
        if (lock.status != LockStatus.ACCEPTED) revert LockNotAccepted();
        
        uint256 usdBalance = IERC20(usdContract).balanceOf(address(this));
        require(usdBalance >= totalReserve + lock.originalAmount, "USD not received in contract");
        
        lock.status = LockStatus.IN_RESERVE;
        totalReserve += lock.originalAmount;
        
        IUSDTokenized(usdContract).moveToLockReserve(lock.usdInjectionId, lockId);
        
        emit MovedToReserve(lockId, lock.originalAmount, block.timestamp);
    }

    // ========================================================================================================
    // RESERVE CONSUMPTION (FOR VUSD MINTING)
    // ========================================================================================================

    function consumeForVUSD(bytes32 lockId, uint256 amount, bytes32 vusdTxHash) public onlyRole(VUSD_MINTING_ROLE) nonReentrant whenNotPaused returns (bytes32 consumptionId, bytes32 thirdSignature) {
        Lock storage lock = locks[lockId];
        if (lock.receivedAt == 0) revert LockNotFound();
        if (lock.status != LockStatus.IN_RESERVE && lock.status != LockStatus.PARTIALLY_CONSUMED) revert LockNotInReserve();
        if (amount == 0 || amount > lock.availableAmount) revert InsufficientReserve();
        
        // THIRD SIGNATURE - VUSD Minting
        thirdSignature = keccak256(abi.encodePacked(
            lockId, amount, vusdTxHash, msg.sender, block.timestamp, block.number, "VUSD_MINTING_THIRD_SIGNATURE_v5"
        ));
        
        consumptionId = keccak256(abi.encodePacked(lockId, amount, vusdTxHash, block.timestamp, totalConsumptions));
        
        // Effects before interactions
        lock.availableAmount -= amount;
        lock.consumedAmount += amount;
        lock.lastConsumedAt = block.timestamp;
        lock.thirdSignature = thirdSignature;
        lock.mintingIds.push(consumptionId);
        lock.mintedAmounts.push(amount);
        
        if (lock.availableAmount == 0) {
            lock.status = LockStatus.FULLY_CONSUMED;
            lock.fullyConsumedAt = block.timestamp;
        } else {
            lock.status = LockStatus.PARTIALLY_CONSUMED;
        }
        
        totalReserve -= amount;
        totalConsumed += amount;
        
        consumptions[consumptionId] = ConsumptionRecord({
            consumptionId: consumptionId,
            lockId: lockId,
            amount: amount,
            vusdMintingId: consumptionId,
            vusdTxHash: vusdTxHash,
            consumedBy: msg.sender,
            consumedAt: block.timestamp
        });
        
        consumptionIds.push(consumptionId);
        totalConsumptions++;
        
        // Interactions
        IUSDTokenized(usdContract).recordConsumptionForVUSD(lock.usdInjectionId, vusdTxHash);
        
        emit ReserveConsumed(lockId, consumptionId, amount, consumptionId, thirdSignature, block.timestamp);
        
        if (lock.availableAmount == 0) {
            emit LockFullyConsumed(lockId, lock.consumedAmount, block.timestamp);
            emit CompleteAuditTrail(lockId, lock.usdInjectionId, lock.originalAmount, lock.consumedAmount, lock.firstSignature, lock.secondSignature, thirdSignature, block.timestamp);
        }
        
        return (consumptionId, thirdSignature);
    }

    // ========================================================================================================
    // VIEW FUNCTIONS
    // ========================================================================================================

    function getLock(bytes32 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }

    function getLockByInjection(bytes32 usdInjectionId) external view returns (Lock memory) {
        return locks[injectionToLock[usdInjectionId]];
    }

    function getLockByAuthCode(string calldata authCode) external view returns (Lock memory) {
        return locks[authCodeToLock[authCode]];
    }

    function getAllLockIds() external view returns (bytes32[] memory) {
        return lockIds;
    }

    function getLocksByStatus(LockStatus status, uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        require(limit <= 100, "Limit too high");
        
        uint256 count = 0;
        uint256 matchedCount = 0;
        bytes32[] memory tempResults = new bytes32[](limit);
        
        for (uint256 i = 0; i < lockIds.length && matchedCount < limit; i++) {
            if (locks[lockIds[i]].status == status) {
                if (count >= offset) {
                    tempResults[matchedCount] = lockIds[i];
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

    function getStatistics() external view returns (uint256, uint256, uint256, uint256) {
        return (totalReserve, totalConsumed, totalLocks, totalConsumptions);
    }

    function getConsumption(bytes32 consumptionId) external view returns (ConsumptionRecord memory) {
        return consumptions[consumptionId];
    }

    function getLockConsumptions(bytes32 lockId, uint256 offset, uint256 limit) external view returns (bytes32[] memory, uint256[] memory) {
        require(limit <= 100, "Limit too high");
        Lock storage lock = locks[lockId];
        
        uint256 total = lock.mintingIds.length;
        uint256 start = offset < total ? offset : total;
        uint256 end = start + limit > total ? total : start + limit;
        uint256 length = end - start;
        
        bytes32[] memory ids = new bytes32[](length);
        uint256[] memory amounts = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            ids[i] = lock.mintingIds[start + i];
            amounts[i] = lock.mintedAmounts[start + i];
        }
        
        return (ids, amounts);
    }

    // ========================================================================================================
    // ADMIN FUNCTIONS
    // ========================================================================================================

    function setVUSDMintingContract(address _vusdMintingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_vusdMintingContract == address(0)) revert InvalidAddress();
        address oldContract = vusdMintingContract;
        vusdMintingContract = _vusdMintingContract;
        _grantRole(VUSD_MINTING_ROLE, _vusdMintingContract);
        emit VUSDMintingContractSet(oldContract, _vusdMintingContract);
    }

    function setDefaultExpiryDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_duration >= 1 days && _duration <= 365 days, "Invalid duration");
        uint256 oldDuration = defaultExpiryDuration;
        defaultExpiryDuration = _duration;
        emit ExpiryDurationChanged(oldDuration, _duration);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
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

    function _generateAuthCode(bytes32 lockId, uint256 amount) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(lockId, amount, block.timestamp, block.number));
        bytes memory code = new bytes(16);
        bytes memory hexChars = "0123456789ABCDEF";
        
        for (uint256 i = 0; i < 16; i++) {
            code[i] = hexChars[uint8(hash[i]) % 16];
        }
        
        return string(abi.encodePacked("VUSD-", string(code)));
    }
}
