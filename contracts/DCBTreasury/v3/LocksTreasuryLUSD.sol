// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                              ║
 * ║     ██╗      ██████╗  ██████╗██╗  ██╗███████╗    ████████╗██████╗ ███████╗ █████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗ ║
 * ║     ██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔════╝    ╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝ ║
 * ║     ██║     ██║   ██║██║     █████╔╝ ███████╗       ██║   ██████╔╝█████╗  ███████║███████╗██║   ██║██████╔╝ ╚████╔╝  ║
 * ║     ██║     ██║   ██║██║     ██╔═██╗ ╚════██║       ██║   ██╔══██╗██╔══╝  ██╔══██║╚════██║██║   ██║██╔══██╗  ╚██╔╝   ║
 * ║     ███████╗╚██████╔╝╚██████╗██║  ██╗███████║       ██║   ██║  ██║███████╗██║  ██║███████║╚██████╔╝██║  ██║   ██║    ║
 * ║     ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝       ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ║
 * ║                                                                                                              ║
 * ║     ██╗     ██╗   ██╗███████╗██████╗                                                                         ║
 * ║     ██║     ██║   ██║██╔════╝██╔══██╗                                                                        ║
 * ║     ██║     ██║   ██║███████╗██║  ██║                                                                        ║
 * ║     ██║     ██║   ██║╚════██║██║  ██║                                                                        ║
 * ║     ███████╗╚██████╔╝███████║██████╔╝                                                                        ║
 * ║     ╚══════╝ ╚═════╝ ╚══════╝╚═════╝                                                                         ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🔒 LOCKS TREASURY LUSD - SECOND SIGNATURE CONTRACT                                                          ║
 * ║                                                                                                              ║
 * ║  📋 Contract Name: LocksTreasuryLUSD                                                                         ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                             ║
 * ║  🔓 Visibility: PUBLIC (Fully Transparent & Auditable)                                                       ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🔄 ROLE IN THE FLOW:                                                                                        ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │  1️⃣ USD Contract: Inyecta USD → Envía a LEMX                                                            │ ║
 * ║  │  2️⃣ THIS CONTRACT: LEMX Acepta Lock → SEGUNDA FIRMA → USD quedan en Lock en favor de LUSD             │ ║
 * ║  │  3️⃣ LUSD Minting: Consume Lock → TERCERA FIRMA → Mintea LUSD                                           │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                                                              ║
 * ║  📜 SIGNATURES:                                                                                              ║
 * ║  ├─ 1️⃣ FIRST: DCB Treasury inicia inyección USD                                                            ║
 * ║  ├─ 2️⃣ SECOND: LEMX Minting acepta Lock (THIS CONTRACT)                                                    ║
 * ║  └─ 3️⃣ THIRD: Consume Lock para mintear LUSD                                                               ║
 * ║                                                                                                              ║
 * ║  🔗 LINKED CONTRACTS:                                                                                        ║
 * ║  ├─ 💵 USD Contract: Source of USD injection                                                                ║
 * ║  ├─ 💎 LUSD: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                     ║
 * ║  └─ 🔮 LUSDMinting: Final minting contract                                                                   ║
 * ║                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title LocksTreasuryLUSD - USD Locks in Favor of LUSD
 * @author Digital Commercial Bank Ltd
 * @notice Second signature contract - Accepts locks from DCB Treasury, holds USD in favor of LUSD
 * @dev When LEMX Minting accepts a lock, this contract records the second signature
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 1.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LocksTreasuryLUSD is AccessControl, ReentrancyGuard, Pausable {
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              PUBLIC CONSTANTS                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version - PUBLIC
    string public constant VERSION = "1.0.0";
    
    /// @notice Contract name - PUBLIC
    string public constant CONTRACT_NAME = "Locks Treasury LUSD";
    
    /// @notice LUSD Contract Address - PUBLIC
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LemonChain ID - PUBLIC
    uint256 public constant CHAIN_ID = 1005;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  ACCESS ROLES                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant LEMX_OPERATOR_ROLE = keccak256("LEMX_OPERATOR_ROLE");
    bytes32 public constant LOCK_MANAGER_ROLE = keccak256("LOCK_MANAGER_ROLE");
    bytes32 public constant MINTING_ROLE = keccak256("MINTING_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                     ENUMS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Lock Status
    enum LockStatus {
        PENDING,            // Received from DCB, waiting for LEMX acceptance
        ACCEPTED,           // LEMX accepted - SECOND SIGNATURE
        IN_RESERVE,         // In Lock Reserve (partial minting available)
        PARTIALLY_CONSUMED, // Part of lock consumed for minting
        FULLY_CONSUMED,     // Entire lock consumed for LUSD minting
        CANCELLED           // Lock cancelled
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    STRUCTS                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Lock Record - USD locked in favor of LUSD
     */
    struct Lock {
        bytes32 lockId;
        
        // Source information
        bytes32 usdInjectionId;         // Reference to USD contract injection
        string authorizationCode;       // Authorization code from DCB
        
        // Amount tracking
        uint256 originalAmount;         // Original USD amount
        uint256 availableAmount;        // Amount available for minting
        uint256 consumedAmount;         // Amount already consumed for LUSD
        uint256 reserveAmount;          // Amount in reserve for partial minting
        
        // Parties
        address beneficiary;            // Who receives the LUSD
        address dcbTreasury;            // DCB Treasury that initiated
        address lemxOperator;           // LEMX operator who accepted
        
        // Status
        LockStatus status;
        
        // Signatures
        bytes32 firstSignatureHash;     // DCB Treasury signature (from USD contract)
        bytes32 secondSignatureHash;    // LEMX acceptance signature (this contract)
        bytes32 thirdSignatureHash;     // Minting signature (when consumed)
        
        // Timestamps
        uint256 receivedAt;             // When received from DCB
        uint256 acceptedAt;             // When LEMX accepted (second signature)
        uint256 lastConsumedAt;         // Last consumption timestamp
        uint256 fullyConsumedAt;        // When fully consumed
        
        // Minting references
        bytes32[] mintingTxHashes;      // All LUSD minting transaction hashes
        uint256[] mintedAmounts;        // Amounts minted in each transaction
    }
    
    /**
     * @notice Minting Record - Each time lock is consumed for LUSD
     */
    struct MintingRecord {
        bytes32 mintingId;
        bytes32 lockId;
        uint256 amount;
        bytes32 lusdTxHash;
        address mintedBy;
        uint256 mintedAt;
        string publicationCode;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STATE VARIABLES - PUBLIC                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice USD Contract address - PUBLIC
    address public usdContract;
    
    /// @notice LUSD Minting Contract address - PUBLIC
    address public lusdMintingContract;
    
    /// @notice Total USD locked - PUBLIC
    uint256 public totalLocked;
    
    /// @notice Total USD available for minting - PUBLIC
    uint256 public totalAvailableForMinting;
    
    /// @notice Total USD consumed for LUSD - PUBLIC
    uint256 public totalConsumedForLUSD;
    
    /// @notice Total locks count - PUBLIC
    uint256 public totalLocks;
    
    /// @notice Total minting records - PUBLIC
    uint256 public totalMintingRecords;
    
    /// @notice Locks mapping
    mapping(bytes32 => Lock) public locks;
    bytes32[] public lockIds;
    
    /// @notice Minting records mapping
    mapping(bytes32 => MintingRecord) public mintingRecords;
    bytes32[] public mintingRecordIds;
    
    /// @notice Authorization code to lock mapping
    mapping(string => bytes32) public authCodeToLock;
    
    /// @notice USD injection to lock mapping
    mapping(bytes32 => bytes32) public usdInjectionToLock;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    EVENTS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Emitted when lock is received from DCB Treasury
    event LockReceived(
        bytes32 indexed lockId,
        bytes32 indexed usdInjectionId,
        string authorizationCode,
        uint256 amount,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    /// @notice Emitted when LEMX accepts lock (SECOND SIGNATURE)
    event LockAccepted(
        bytes32 indexed lockId,
        address indexed lemxOperator,
        bytes32 secondSignatureHash,
        uint256 timestamp
    );
    
    /// @notice Emitted when lock is moved to reserve
    event LockMovedToReserve(
        bytes32 indexed lockId,
        uint256 reserveAmount,
        uint256 timestamp
    );
    
    /// @notice Emitted when partial amount is approved for minting
    event PartialAmountApproved(
        bytes32 indexed lockId,
        uint256 approvedAmount,
        uint256 remainingReserve,
        uint256 timestamp
    );
    
    /// @notice Emitted when lock is consumed for LUSD minting (THIRD SIGNATURE)
    event LockConsumedForMinting(
        bytes32 indexed lockId,
        bytes32 indexed mintingId,
        uint256 amount,
        bytes32 lusdTxHash,
        bytes32 thirdSignatureHash,
        address indexed mintedBy,
        string publicationCode,
        uint256 timestamp
    );
    
    /// @notice Emitted when lock is fully consumed
    event LockFullyConsumed(
        bytes32 indexed lockId,
        uint256 totalMinted,
        uint256 timestamp
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  CONSTRUCTOR                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    constructor(address _admin, address _usdContract) {
        require(_admin != address(0), "Invalid admin");
        require(_usdContract != address(0), "Invalid USD contract");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(LEMX_OPERATOR_ROLE, _admin);
        _grantRole(LOCK_MANAGER_ROLE, _admin);
        _grantRole(MINTING_ROLE, _admin);
        
        usdContract = _usdContract;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           LOCK RECEIVING FUNCTIONS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Receives a lock from DCB Treasury (USD Contract)
     * @dev Called when USD contract sends injection to LEMX
     * @param usdInjectionId Injection ID from USD contract
     * @param authorizationCode Authorization code
     * @param amount USD amount
     * @param beneficiary Address to receive LUSD
     * @param firstSignatureHash Signature from DCB Treasury
     * @return lockId The created lock ID
     */
    function receiveLock(
        bytes32 usdInjectionId,
        string calldata authorizationCode,
        uint256 amount,
        address beneficiary,
        bytes32 firstSignatureHash
    ) external onlyRole(LOCK_MANAGER_ROLE) nonReentrant returns (bytes32 lockId) {
        require(amount > 0, "Amount must be > 0");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(bytes(authorizationCode).length > 0, "Auth code required");
        require(authCodeToLock[authorizationCode] == bytes32(0), "Auth code already used");
        require(usdInjectionToLock[usdInjectionId] == bytes32(0), "Injection already received");
        
        // Generate lock ID
        lockId = keccak256(abi.encodePacked(
            usdInjectionId, authorizationCode, amount, beneficiary, block.timestamp, totalLocks
        ));
        
        // Create lock record
        locks[lockId] = Lock({
            lockId: lockId,
            usdInjectionId: usdInjectionId,
            authorizationCode: authorizationCode,
            originalAmount: amount,
            availableAmount: amount,
            consumedAmount: 0,
            reserveAmount: 0,
            beneficiary: beneficiary,
            dcbTreasury: msg.sender,
            lemxOperator: address(0),
            status: LockStatus.PENDING,
            firstSignatureHash: firstSignatureHash,
            secondSignatureHash: bytes32(0),
            thirdSignatureHash: bytes32(0),
            receivedAt: block.timestamp,
            acceptedAt: 0,
            lastConsumedAt: 0,
            fullyConsumedAt: 0,
            mintingTxHashes: new bytes32[](0),
            mintedAmounts: new uint256[](0)
        });
        
        lockIds.push(lockId);
        authCodeToLock[authorizationCode] = lockId;
        usdInjectionToLock[usdInjectionId] = lockId;
        totalLocks++;
        totalLocked += amount;
        
        emit LockReceived(lockId, usdInjectionId, authorizationCode, amount, beneficiary, block.timestamp);
        
        return lockId;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                      LOCK ACCEPTANCE FUNCTIONS (SECOND SIGNATURE)                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice LEMX Operator accepts lock - THIS IS THE SECOND SIGNATURE
     * @dev When LEMX Minting clicks "Accept", this function is called
     * @param lockId Lock ID to accept
     * @return secondSignatureHash The second signature hash
     */
    function acceptLock(bytes32 lockId) 
        external 
        onlyRole(LEMX_OPERATOR_ROLE) 
        nonReentrant 
        returns (bytes32 secondSignatureHash) 
    {
        Lock storage lock = locks[lockId];
        require(lock.receivedAt > 0, "Lock not found");
        require(lock.status == LockStatus.PENDING, "Lock not pending");
        
        // Generate second signature hash
        secondSignatureHash = keccak256(abi.encodePacked(
            lockId,
            lock.authorizationCode,
            lock.originalAmount,
            lock.beneficiary,
            msg.sender,
            block.timestamp,
            "LEMX_ACCEPTANCE_SIGNATURE"
        ));
        
        // Update lock with second signature
        lock.status = LockStatus.ACCEPTED;
        lock.lemxOperator = msg.sender;
        lock.secondSignatureHash = secondSignatureHash;
        lock.acceptedAt = block.timestamp;
        
        totalAvailableForMinting += lock.originalAmount;
        
        emit LockAccepted(lockId, msg.sender, secondSignatureHash, block.timestamp);
        
        return secondSignatureHash;
    }
    
    /**
     * @notice Moves accepted lock to reserve for partial minting
     * @param lockId Lock ID
     */
    function moveToReserve(bytes32 lockId) external onlyRole(LEMX_OPERATOR_ROLE) {
        Lock storage lock = locks[lockId];
        require(lock.status == LockStatus.ACCEPTED, "Lock not accepted");
        
        lock.status = LockStatus.IN_RESERVE;
        lock.reserveAmount = lock.availableAmount;
        
        emit LockMovedToReserve(lockId, lock.reserveAmount, block.timestamp);
    }
    
    /**
     * @notice Approves partial amount for minting from reserve
     * @param lockId Lock ID
     * @param amount Amount to approve for minting
     */
    function approvePartialAmount(bytes32 lockId, uint256 amount) 
        external 
        onlyRole(LEMX_OPERATOR_ROLE) 
    {
        Lock storage lock = locks[lockId];
        require(lock.status == LockStatus.IN_RESERVE || lock.status == LockStatus.PARTIALLY_CONSUMED, "Invalid status");
        require(amount > 0 && amount <= lock.availableAmount, "Invalid amount");
        
        // Amount is now ready to be consumed for minting
        // The actual consumption happens in consumeForMinting
        
        emit PartialAmountApproved(lockId, amount, lock.availableAmount - amount, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                    MINTING CONSUMPTION FUNCTIONS (THIRD SIGNATURE)                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Consumes lock for LUSD minting - THIS IS THE THIRD SIGNATURE
     * @dev When "Consumir y Mintear LUSD" is clicked and LUSD is minted
     * @param lockId Lock ID
     * @param amount Amount to consume
     * @param lusdTxHash Transaction hash of the LUSD minting
     * @param publicationCode Publication code for Mint Explorer
     * @return mintingId The minting record ID
     * @return thirdSignatureHash The third signature hash
     */
    function consumeForMinting(
        bytes32 lockId,
        uint256 amount,
        bytes32 lusdTxHash,
        string calldata publicationCode
    ) external onlyRole(MINTING_ROLE) nonReentrant returns (bytes32 mintingId, bytes32 thirdSignatureHash) {
        Lock storage lock = locks[lockId];
        require(lock.acceptedAt > 0, "Lock not accepted");
        require(lock.status == LockStatus.ACCEPTED || 
                lock.status == LockStatus.IN_RESERVE || 
                lock.status == LockStatus.PARTIALLY_CONSUMED, "Invalid status");
        require(amount > 0 && amount <= lock.availableAmount, "Invalid amount");
        require(lusdTxHash != bytes32(0), "TX hash required");
        
        // Generate third signature hash
        thirdSignatureHash = keccak256(abi.encodePacked(
            lockId,
            amount,
            lusdTxHash,
            publicationCode,
            msg.sender,
            block.timestamp,
            "LUSD_MINTING_SIGNATURE"
        ));
        
        // Generate minting record ID
        mintingId = keccak256(abi.encodePacked(
            lockId, amount, lusdTxHash, block.timestamp, totalMintingRecords
        ));
        
        // Update lock
        lock.availableAmount -= amount;
        lock.consumedAmount += amount;
        lock.reserveAmount = lock.availableAmount;
        lock.lastConsumedAt = block.timestamp;
        lock.thirdSignatureHash = thirdSignatureHash;
        lock.mintingTxHashes.push(lusdTxHash);
        lock.mintedAmounts.push(amount);
        
        // Update status
        if (lock.availableAmount == 0) {
            lock.status = LockStatus.FULLY_CONSUMED;
            lock.fullyConsumedAt = block.timestamp;
            totalAvailableForMinting -= lock.originalAmount;
        } else {
            lock.status = LockStatus.PARTIALLY_CONSUMED;
        }
        
        totalConsumedForLUSD += amount;
        
        // Create minting record
        mintingRecords[mintingId] = MintingRecord({
            mintingId: mintingId,
            lockId: lockId,
            amount: amount,
            lusdTxHash: lusdTxHash,
            mintedBy: msg.sender,
            mintedAt: block.timestamp,
            publicationCode: publicationCode
        });
        
        mintingRecordIds.push(mintingId);
        totalMintingRecords++;
        
        emit LockConsumedForMinting(
            lockId,
            mintingId,
            amount,
            lusdTxHash,
            thirdSignatureHash,
            msg.sender,
            publicationCode,
            block.timestamp
        );
        
        if (lock.status == LockStatus.FULLY_CONSUMED) {
            emit LockFullyConsumed(lockId, lock.consumedAmount, block.timestamp);
        }
        
        return (mintingId, thirdSignatureHash);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS - PUBLIC                                  ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets lock by authorization code
     */
    function getLockByAuthCode(string calldata authCode) external view returns (Lock memory) {
        bytes32 lockId = authCodeToLock[authCode];
        return locks[lockId];
    }
    
    /**
     * @notice Gets lock by USD injection ID
     */
    function getLockByUSDInjection(bytes32 usdInjectionId) external view returns (Lock memory) {
        bytes32 lockId = usdInjectionToLock[usdInjectionId];
        return locks[lockId];
    }
    
    /**
     * @notice Gets all lock IDs
     */
    function getAllLockIds() external view returns (bytes32[] memory) {
        return lockIds;
    }
    
    /**
     * @notice Gets all minting record IDs
     */
    function getAllMintingRecordIds() external view returns (bytes32[] memory) {
        return mintingRecordIds;
    }
    
    /**
     * @notice Gets locks by status
     */
    function getLocksByStatus(LockStatus status) external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < lockIds.length; i++) {
            if (locks[lockIds[i]].status == status) {
                count++;
            }
        }
        
        bytes32[] memory result = new bytes32[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < lockIds.length; i++) {
            if (locks[lockIds[i]].status == status) {
                result[idx] = lockIds[i];
                idx++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Gets minting records for a lock
     */
    function getMintingRecordsForLock(bytes32 lockId) external view returns (MintingRecord[] memory) {
        Lock storage lock = locks[lockId];
        uint256 count = lock.mintingTxHashes.length;
        
        MintingRecord[] memory records = new MintingRecord[](count);
        uint256 idx = 0;
        
        for (uint256 i = 0; i < mintingRecordIds.length; i++) {
            if (mintingRecords[mintingRecordIds[i]].lockId == lockId) {
                records[idx] = mintingRecords[mintingRecordIds[i]];
                idx++;
                if (idx >= count) break;
            }
        }
        
        return records;
    }
    
    /**
     * @notice Gets contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalLocked,
        uint256 _totalAvailableForMinting,
        uint256 _totalConsumedForLUSD,
        uint256 _totalLocks,
        uint256 _totalMintingRecords
    ) {
        return (
            totalLocked,
            totalAvailableForMinting,
            totalConsumedForLUSD,
            totalLocks,
            totalMintingRecords
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
            lock.firstSignatureHash != bytes32(0),
            lock.secondSignatureHash != bytes32(0),
            lock.thirdSignatureHash != bytes32(0),
            lock.firstSignatureHash,
            lock.secondSignatureHash,
            lock.thirdSignatureHash
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ADMIN FUNCTIONS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Sets the LUSD Minting contract address
     */
    function setLUSDMintingContract(address _lusdMintingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_lusdMintingContract != address(0), "Invalid address");
        lusdMintingContract = _lusdMintingContract;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
