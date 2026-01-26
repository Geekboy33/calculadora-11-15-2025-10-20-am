// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║    ██╗      ██████╗  ██████╗██╗  ██╗    ██████╗ ███████╗███████╗███████╗██████╗ ██╗   ██╗███████╗                            ║
 * ║    ██║     ██╔═══██╗██╔════╝██║ ██╔╝    ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝                            ║
 * ║    ██║     ██║   ██║██║     █████╔╝     ██████╔╝█████╗  ███████╗█████╗  ██████╔╝██║   ██║█████╗                              ║
 * ║    ██║     ██║   ██║██║     ██╔═██╗     ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝                              ║
 * ║    ███████╗╚██████╔╝╚██████╗██║  ██╗    ██║  ██║███████╗███████║███████╗██║  ██║ ╚████╔╝ ███████╗                            ║
 * ║    ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝                            ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  🔒 LOCK RESERVE - USD BACKING FOR LUSD MINTING                                                                              ║
 * ║                                                                                                                              ║
 * ║  📋 Contract: LockReserve                                                                                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 8866)                                                                             ║
 * ║  🔓 License: MIT (Open Source & Public)                                                                                      ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💡 FEATURES:                                                                                                                ║
 * ║  ├─ ✅ Receives accepted USD injections from Treasury Minting                                                                ║
 * ║  ├─ ✅ Holds USD in reserve as backing for LUSD                                                                              ║
 * ║  ├─ ✅ Second Signature generation (Treasury Minting acceptance)                                                             ║
 * ║  ├─ ✅ Partial lock consumption support                                                                                      ║
 * ║  ├─ ✅ Full audit trail with three signatures                                                                                ║
 * ║  ├─ ✅ Reserve ratio tracking (USD:LUSD backing)                                                                             ║
 * ║  └─ ✅ Integration with LUSD Minting contract                                                                                ║
 * ║                                                                                                                              ║
 * ║  🔄 FLOW:                                                                                                                    ║
 * ║  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
 * ║  │  1. USD Contract sends injection → Status: PENDING in Treasury Minting                                                 │  ║
 * ║  │  2. Treasury Minting operator clicks "Accept" → THIS CONTRACT receives lock                                            │  ║
 * ║  │  3. Lock enters reserve → SECOND SIGNATURE generated                                                                   │  ║
 * ║  │  4. Operator selects amount for "Mint with Code" → Partial or full consumption                                         │  ║
 * ║  │  5. LUSD Minting contract consumes reserve → THIRD SIGNATURE → LUSD minted                                             │  ║
 * ║  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
 * ║                                                                                                                              ║
 * ║  🔗 LINKED CONTRACTS:                                                                                                        ║
 * ║  ├─ 💵 USD: Source of tokenized USD                                                                                         ║
 * ║  ├─ 💎 LUSD: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                                     ║
 * ║  └─ 🔮 LUSDMinting: Final minting contract                                                                                   ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title LockReserve - USD Reserve for LUSD Backing
 * @author Digital Commercial Bank Ltd
 * @notice Holds USD in reserve to back LUSD minting with full audit trail
 * @dev Second signature contract in the DCB → Treasury Minting → LUSD flow
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 4.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUSD {
    function acceptInjection(bytes32 injectionId) external returns (bool);
    function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) external returns (bool);
    function recordConsumptionForLUSD(bytes32 injectionId, bytes32 lusdTxHash) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ILUSDMinting {
    function consumeReserveAndMint(
        bytes32 lockReserveId,
        uint256 amount,
        address beneficiary,
        bytes32 secondSignature
    ) external returns (bytes32 mintingId, bytes32 thirdSignature);
}

contract LockReserve is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Contract version
    string public constant VERSION = "4.0.0";
    
    /// @notice Contract name
    string public constant CONTRACT_NAME = "Lock Reserve";
    
    /// @notice LemonChain ID
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice Official LUSD Contract
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;

    // ══════════════════════════════════════════════════════════════════════════════
    // ROLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Role for Treasury Minting operators
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    /// @notice Role for LUSD Minting contract
    bytes32 public constant LUSD_MINTING_ROLE = keccak256("LUSD_MINTING_ROLE");
    
    /// @notice Role for reserve managers
    bytes32 public constant RESERVE_MANAGER_ROLE = keccak256("RESERVE_MANAGER_ROLE");

    // ══════════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Lock Reserve status
    enum LockStatus {
        PENDING,            // Received from USD contract, waiting acceptance
        ACCEPTED,           // Accepted by operator (Second Signature)
        IN_RESERVE,         // In reserve, available for minting
        PARTIALLY_CONSUMED, // Part consumed for LUSD
        FULLY_CONSUMED,     // Fully consumed for LUSD
        CANCELLED,          // Cancelled
        EXPIRED             // Expired
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Lock Reserve record
    struct Lock {
        bytes32 lockId;
        
        // Source reference
        bytes32 usdInjectionId;         // Reference to USD contract injection
        
        // Amounts
        uint256 originalAmount;         // Original USD amount
        uint256 availableAmount;        // Available for LUSD minting
        uint256 consumedAmount;         // Consumed for LUSD
        
        // Parties
        address beneficiary;            // Who will receive LUSD
        address acceptedBy;             // Operator who accepted
        
        // Status
        LockStatus status;
        
        // Signatures
        bytes32 firstSignature;         // From USD contract (DCB Treasury)
        bytes32 secondSignature;        // From this contract (Treasury Minting acceptance)
        bytes32 thirdSignature;         // From LUSD Minting (final)
        
        // Timestamps
        uint256 receivedAt;
        uint256 acceptedAt;
        uint256 lastConsumedAt;
        uint256 fullyConsumedAt;
        
        // Minting records
        bytes32[] mintingIds;           // All LUSD minting IDs
        uint256[] mintedAmounts;        // Amounts minted in each operation
        
        // Expiry
        uint256 expiresAt;
        
        // Authorization code for Mint with Code
        string authorizationCode;
    }

    /// @notice Consumption record
    struct ConsumptionRecord {
        bytes32 consumptionId;
        bytes32 lockId;
        uint256 amount;
        bytes32 lusdMintingId;
        bytes32 lusdTxHash;
        address consumedBy;
        uint256 consumedAt;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice USD Token contract
    address public usdContract;
    
    /// @notice LUSD Minting contract
    address public lusdMintingContract;
    
    /// @notice Total USD in reserve
    uint256 public totalReserve;
    
    /// @notice Total USD consumed for LUSD
    uint256 public totalConsumed;
    
    /// @notice Total locks
    uint256 public totalLocks;
    
    /// @notice Total consumptions
    uint256 public totalConsumptions;
    
    /// @notice Default lock expiry (30 days)
    uint256 public defaultExpiryDuration = 30 days;

    // ══════════════════════════════════════════════════════════════════════════════
    // MAPPINGS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Locks by ID
    mapping(bytes32 => Lock) public locks;
    
    /// @notice All lock IDs
    bytes32[] public lockIds;
    
    /// @notice Consumption records by ID
    mapping(bytes32 => ConsumptionRecord) public consumptions;
    
    /// @notice All consumption IDs
    bytes32[] public consumptionIds;
    
    /// @notice USD injection to lock mapping
    mapping(bytes32 => bytes32) public injectionToLock;
    
    /// @notice Authorization code to lock mapping
    mapping(string => bytes32) public authCodeToLock;

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when lock is received
    event LockReceived(
        bytes32 indexed lockId,
        bytes32 indexed usdInjectionId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 firstSignature,
        uint256 timestamp
    );

    /// @notice Emitted when lock is accepted (SECOND SIGNATURE)
    event LockAccepted(
        bytes32 indexed lockId,
        address indexed acceptedBy,
        bytes32 secondSignature,
        string authorizationCode,
        uint256 timestamp
    );

    /// @notice Emitted when lock moves to reserve
    event MovedToReserve(
        bytes32 indexed lockId,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when reserve is consumed for LUSD
    event ReserveConsumed(
        bytes32 indexed lockId,
        bytes32 indexed consumptionId,
        uint256 amount,
        bytes32 lusdMintingId,
        bytes32 thirdSignature,
        uint256 timestamp
    );

    /// @notice Emitted when lock is fully consumed
    event LockFullyConsumed(
        bytes32 indexed lockId,
        uint256 totalMinted,
        uint256 timestamp
    );

    /// @notice Emitted for complete audit trail
    event CompleteAuditTrail(
        bytes32 indexed lockId,
        bytes32 usdInjectionId,
        uint256 originalAmount,
        uint256 consumedAmount,
        bytes32 firstSignature,
        bytes32 secondSignature,
        bytes32 thirdSignature,
        uint256 timestamp
    );
    
    /// @notice Emitted when expiry duration changes
    event ExpiryDurationChanged(uint256 oldDuration, uint256 newDuration);
    
    /// @notice Emitted on emergency withdraw
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);
    
    /// @notice Emitted when LUSD minting contract is set
    event LUSDMintingContractSet(address indexed oldContract, address indexed newContract);

    // ══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════════

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

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════════

    constructor(address _admin, address _usdContract) {
        if (_admin == address(0)) revert InvalidAddress();
        if (_usdContract == address(0)) revert InvalidAddress();
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(RESERVE_MANAGER_ROLE, _admin);
        
        usdContract = _usdContract;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // LOCK RECEIVING
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Receives a lock from USD contract
     * @dev Called when DCB Treasury sends USD injection to Treasury Minting
     * @param usdInjectionId USD injection ID
     * @param amount Amount of USD
     * @param beneficiary Who will receive LUSD
     * @param firstSignature DCB Treasury signature
     * @return lockId Created lock ID
     */
    function receiveLock(
        bytes32 usdInjectionId,
        uint256 amount,
        address beneficiary,
        bytes32 firstSignature
    ) external onlyRole(OPERATOR_ROLE) nonReentrant returns (bytes32 lockId) {
        if (amount == 0) revert InvalidAmount();
        if (beneficiary == address(0)) revert InvalidAddress();
        if (injectionToLock[usdInjectionId] != bytes32(0)) revert AuthCodeAlreadyUsed();
        
        // Generate lock ID
        lockId = keccak256(abi.encodePacked(
            usdInjectionId,
            amount,
            beneficiary,
            block.timestamp,
            totalLocks
        ));
        
        // Create lock record
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

    // ══════════════════════════════════════════════════════════════════════════════
    // LOCK ACCEPTANCE (SECOND SIGNATURE)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Accepts a pending lock - THIS IS THE SECOND SIGNATURE
     * @dev Called when Treasury Minting operator clicks "Accept"
     * @param lockId Lock ID to accept
     * @return secondSignature The generated second signature
     * @return authCode Generated authorization code for Mint with Code
     */
    function acceptLock(bytes32 lockId) 
        external 
        onlyRole(OPERATOR_ROLE) 
        nonReentrant 
        returns (bytes32 secondSignature, string memory authCode) 
    {
        Lock storage lock = locks[lockId];
        if (lock.receivedAt == 0) revert LockNotFound();
        if (lock.status != LockStatus.PENDING) revert LockNotPending();
        if (block.timestamp > lock.expiresAt) revert LockExpired();
        
        // Generate second signature (Treasury Minting acceptance)
        secondSignature = keccak256(abi.encodePacked(
            lockId,
            lock.usdInjectionId,
            lock.originalAmount,
            lock.beneficiary,
            msg.sender,
            block.timestamp,
            "TREASURY_MINTING_SECOND_SIGNATURE"
        ));
        
        // Generate authorization code for Mint with Code
        authCode = _generateAuthCode(lockId, lock.originalAmount);
        
        // Update lock
        lock.status = LockStatus.ACCEPTED;
        lock.acceptedBy = msg.sender;
        lock.secondSignature = secondSignature;
        lock.acceptedAt = block.timestamp;
        lock.authorizationCode = authCode;
        
        authCodeToLock[authCode] = lockId;
        
        // Notify USD contract
        IUSD(usdContract).acceptInjection(lock.usdInjectionId);
        
        emit LockAccepted(lockId, msg.sender, secondSignature, authCode, block.timestamp);
        
        return (secondSignature, authCode);
    }

    /**
     * @notice Moves accepted lock to reserve
     * @dev SECURITY: Verifies USD tokens are actually held before updating reserve
     * @param lockId Lock ID
     */
    function moveToReserve(bytes32 lockId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Lock storage lock = locks[lockId];
        if (lock.receivedAt == 0) revert LockNotFound();
        if (lock.status != LockStatus.ACCEPTED) revert LockNotAccepted();
        
        // SECURITY FIX: Verify this contract actually holds the USD tokens
        uint256 usdBalance = IERC20(usdContract).balanceOf(address(this));
        require(usdBalance >= totalReserve + lock.originalAmount, "USD not received in contract");
        
        lock.status = LockStatus.IN_RESERVE;
        totalReserve += lock.originalAmount;
        
        // Notify USD contract
        IUSD(usdContract).moveToLockReserve(lock.usdInjectionId, lockId);
        
        emit MovedToReserve(lockId, lock.originalAmount, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // RESERVE CONSUMPTION (FOR LUSD MINTING)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Consumes reserve for LUSD minting
     * @dev Called when user clicks "Mint" in Mint with Code
     * @param lockId Lock ID
     * @param amount Amount to consume
     * @param lusdTxHash LUSD minting transaction hash
     * @return consumptionId Consumption record ID
     * @return thirdSignature Third signature for LUSD minting
     */
    function consumeForLUSD(
        bytes32 lockId,
        uint256 amount,
        bytes32 lusdTxHash
    ) public onlyRole(LUSD_MINTING_ROLE) nonReentrant returns (bytes32 consumptionId, bytes32 thirdSignature) {
        Lock storage lock = locks[lockId];
        if (lock.receivedAt == 0) revert LockNotFound();
        if (lock.status != LockStatus.IN_RESERVE && lock.status != LockStatus.PARTIALLY_CONSUMED) {
            revert LockNotInReserve();
        }
        if (amount == 0 || amount > lock.availableAmount) revert InsufficientReserve();
        
        // Generate third signature
        thirdSignature = keccak256(abi.encodePacked(
            lockId,
            amount,
            lusdTxHash,
            msg.sender,
            block.timestamp,
            "LUSD_MINTING_THIRD_SIGNATURE"
        ));
        
        // Generate consumption ID
        consumptionId = keccak256(abi.encodePacked(
            lockId,
            amount,
            lusdTxHash,
            block.timestamp,
            totalConsumptions
        ));
        
        // Update lock
        lock.availableAmount -= amount;
        lock.consumedAmount += amount;
        lock.lastConsumedAt = block.timestamp;
        lock.thirdSignature = thirdSignature;
        lock.mintingIds.push(consumptionId);
        lock.mintedAmounts.push(amount);
        
        // Update status
        if (lock.availableAmount == 0) {
            lock.status = LockStatus.FULLY_CONSUMED;
            lock.fullyConsumedAt = block.timestamp;
        } else {
            lock.status = LockStatus.PARTIALLY_CONSUMED;
        }
        
        // Update totals
        totalReserve -= amount;
        totalConsumed += amount;
        totalConsumptions++;
        
        // Create consumption record
        consumptions[consumptionId] = ConsumptionRecord({
            consumptionId: consumptionId,
            lockId: lockId,
            amount: amount,
            lusdMintingId: consumptionId,
            lusdTxHash: lusdTxHash,
            consumedBy: msg.sender,
            consumedAt: block.timestamp
        });
        
        consumptionIds.push(consumptionId);
        
        // Notify USD contract
        IUSD(usdContract).recordConsumptionForLUSD(lock.usdInjectionId, lusdTxHash);
        
        emit ReserveConsumed(lockId, consumptionId, amount, consumptionId, thirdSignature, block.timestamp);
        
        if (lock.status == LockStatus.FULLY_CONSUMED) {
            emit LockFullyConsumed(lockId, lock.consumedAmount, block.timestamp);
        }
        
        emit CompleteAuditTrail(
            lockId,
            lock.usdInjectionId,
            lock.originalAmount,
            lock.consumedAmount,
            lock.firstSignature,
            lock.secondSignature,
            thirdSignature,
            block.timestamp
        );
        
        return (consumptionId, thirdSignature);
    }

    /**
     * @notice Consumes reserve by authorization code (Mint with Code)
     * @param authCode Authorization code
     * @param amount Amount to consume
     * @param lusdTxHash LUSD transaction hash
     * @return consumptionId Consumption ID
     * @return thirdSignature Third signature
     */
    function consumeByAuthCode(
        string calldata authCode,
        uint256 amount,
        bytes32 lusdTxHash
    ) external onlyRole(LUSD_MINTING_ROLE) returns (bytes32 consumptionId, bytes32 thirdSignature) {
        bytes32 lockId = authCodeToLock[authCode];
        if (lockId == bytes32(0)) revert LockNotFound();
        
        return consumeForLUSD(lockId, amount, lusdTxHash);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets lock by ID
     */
    function getLock(bytes32 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }

    /**
     * @notice Gets lock by authorization code
     */
    function getLockByAuthCode(string calldata authCode) external view returns (Lock memory) {
        bytes32 lockId = authCodeToLock[authCode];
        return locks[lockId];
    }

    /**
     * @notice Gets all lock IDs
     */
    function getAllLockIds() external view returns (bytes32[] memory) {
        return lockIds;
    }

    /**
     * @notice Gets locks by status with pagination to prevent DoS
     * @param status Lock status to filter
     * @param offset Starting index
     * @param limit Maximum results to return (max 100)
     */
    function getLocksByStatus(LockStatus status, uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        require(limit <= 100, "Limit too high");
        
        // First pass: count matching locks up to offset + limit
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
        
        // Resize array to actual count
        bytes32[] memory result = new bytes32[](matchedCount);
        for (uint256 i = 0; i < matchedCount; i++) {
            result[i] = tempResults[i];
        }
        
        return result;
    }
    
    /**
     * @notice Gets total count of locks by status
     * @param status Lock status to count
     */
    function getLockCountByStatus(LockStatus status) external view returns (uint256 count) {
        for (uint256 i = 0; i < lockIds.length; i++) {
            if (locks[lockIds[i]].status == status) {
                count++;
            }
        }
    }

    /**
     * @notice Gets consumption record
     */
    function getConsumption(bytes32 consumptionId) external view returns (ConsumptionRecord memory) {
        return consumptions[consumptionId];
    }

    /**
     * @notice Gets all consumption IDs for a lock
     */
    function getConsumptionsForLock(bytes32 lockId) external view returns (bytes32[] memory) {
        return locks[lockId].mintingIds;
    }

    /**
     * @notice Gets contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalReserve,
        uint256 _totalConsumed,
        uint256 _totalLocks,
        uint256 _totalConsumptions,
        uint256 _reserveRatio
    ) {
        uint256 ratio = totalConsumed > 0 ? (totalReserve * 10000) / (totalReserve + totalConsumed) : 10000;
        return (
            totalReserve,
            totalConsumed,
            totalLocks,
            totalConsumptions,
            ratio
        );
    }

    /**
     * @notice Verifies all three signatures for a lock
     */
    function verifySignatures(bytes32 lockId) external view returns (
        bool hasFirstSignature,
        bool hasSecondSignature,
        bool hasThirdSignature,
        bytes32 firstSig,
        bytes32 secondSig,
        bytes32 thirdSig
    ) {
        Lock storage lock = locks[lockId];
        return (
            lock.firstSignature != bytes32(0),
            lock.secondSignature != bytes32(0),
            lock.thirdSignature != bytes32(0),
            lock.firstSignature,
            lock.secondSignature,
            lock.thirdSignature
        );
    }

    /**
     * @notice Gets available reserve for a lock
     */
    function getAvailableReserve(bytes32 lockId) external view returns (uint256) {
        return locks[lockId].availableAmount;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Sets LUSD Minting contract
     */
    function setLUSDMintingContract(address _lusdMintingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_lusdMintingContract == address(0)) revert InvalidAddress();
        address oldContract = lusdMintingContract;
        
        // Revoke role from old contract if exists
        if (oldContract != address(0)) {
            _revokeRole(LUSD_MINTING_ROLE, oldContract);
        }
        
        lusdMintingContract = _lusdMintingContract;
        _grantRole(LUSD_MINTING_ROLE, _lusdMintingContract);
        
        emit LUSDMintingContractSet(oldContract, _lusdMintingContract);
    }

    /**
     * @notice Sets default expiry duration
     */
    function setDefaultExpiryDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_duration >= 1 days && _duration <= 365 days, "Invalid duration");
        uint256 oldDuration = defaultExpiryDuration;
        defaultExpiryDuration = _duration;
        emit ExpiryDurationChanged(oldDuration, _duration);
    }
    
    /**
     * @notice Emergency withdraw tokens sent by mistake
     * @dev Cannot withdraw USD that is part of the reserve
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == usdContract) {
            // For USD, can only withdraw excess beyond totalReserve
            uint256 usdBalance = IERC20(token).balanceOf(address(this));
            require(usdBalance - amount >= totalReserve, "Cannot withdraw reserve USD");
        }
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
    }

    /**
     * @notice Pauses contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Generates authorization code for Mint with Code
     */
    function _generateAuthCode(bytes32 lockId, uint256 amount) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(
            lockId,
            amount,
            block.timestamp,
            block.prevrandao,
            totalLocks
        ));
        
        // Convert to readable format: MINT-XXXX-XXXX
        bytes memory code = new bytes(14);
        bytes memory hexChars = "0123456789ABCDEF";
        
        code[0] = 'M';
        code[1] = 'I';
        code[2] = 'N';
        code[3] = 'T';
        code[4] = '-';
        
        for (uint256 i = 0; i < 4; i++) {
            code[5 + i] = hexChars[uint8(hash[i]) % 16];
        }
        
        code[9] = '-';
        
        for (uint256 i = 0; i < 4; i++) {
            code[10 + i] = hexChars[uint8(hash[4 + i]) % 16];
        }
        
        return string(code);
    }
}
