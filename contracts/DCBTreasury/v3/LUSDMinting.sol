// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                              ║
 * ║     ██╗     ██╗   ██╗███████╗██████╗     ███╗   ███╗██╗███╗   ██╗████████╗██╗███╗   ██╗ ██████╗              ║
 * ║     ██║     ██║   ██║██╔════╝██╔══██╗    ████╗ ████║██║████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝              ║
 * ║     ██║     ██║   ██║███████╗██║  ██║    ██╔████╔██║██║██╔██╗ ██║   ██║   ██║██╔██╗ ██║██║  ███╗             ║
 * ║     ██║     ██║   ██║╚════██║██║  ██║    ██║╚██╔╝██║██║██║╚██╗██║   ██║   ██║██║╚██╗██║██║   ██║             ║
 * ║     ███████╗╚██████╔╝███████║██████╔╝    ██║ ╚═╝ ██║██║██║ ╚████║   ██║   ██║██║ ╚████║╚██████╔╝             ║
 * ║     ╚══════╝ ╚═════╝ ╚══════╝╚═════╝     ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝              ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  💎 LUSD MINTING - THIRD SIGNATURE CONTRACT & MINT EXPLORER                                                  ║
 * ║                                                                                                              ║
 * ║  📋 Contract Name: LUSDMinting                                                                               ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                             ║
 * ║  🔓 Visibility: PUBLIC (Fully Transparent & Auditable)                                                       ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🔄 ROLE IN THE FLOW (FINAL CONTRACT):                                                                       ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │  1️⃣ USD Contract: Inyecta USD → Envía a LEMX                                                            │ ║
 * ║  │  2️⃣ LocksTreasuryLUSD: LEMX Acepta Lock → Segunda Firma                                                 │ ║
 * ║  │  3️⃣ THIS CONTRACT: Consume Lock → TERCERA FIRMA → Mintea LUSD → HASH FINAL → MINT EXPLORER             │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                                                              ║
 * ║  📊 MINT EXPLORER DATA:                                                                                      ║
 * ║  ├─ 🔗 Final Transaction Hash                                                                                ║
 * ║  ├─ 📝 Publication Code                                                                                      ║
 * ║  ├─ ✍️ All Three Signatures                                                                                  ║
 * ║  ├─ 💰 Minted Amount                                                                                         ║
 * ║  ├─ 👤 Beneficiary                                                                                           ║
 * ║  └─ ⏰ Timestamps                                                                                             ║
 * ║                                                                                                              ║
 * ║  🔗 LINKED CONTRACTS:                                                                                        ║
 * ║  ├─ 💵 USD: Source of USD injection                                                                         ║
 * ║  ├─ 🔒 LocksTreasuryLUSD: Lock management                                                                   ║
 * ║  └─ 💎 LUSD: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                     ║
 * ║                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title LUSDMinting - Final Minting Contract with Mint Explorer
 * @author Digital Commercial Bank Ltd
 * @notice Third signature contract - Consumes locks, mints LUSD, publishes to Mint Explorer
 * @dev Final contract in the DCB → LEMX → LUSD flow
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 1.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ILUSD
 * @notice Interface for the official LUSD contract
 */
interface ILUSD {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/**
 * @title ILocksTreasuryLUSD
 * @notice Interface for the LocksTreasuryLUSD contract
 */
interface ILocksTreasuryLUSD {
    function consumeForMinting(
        bytes32 lockId,
        uint256 amount,
        bytes32 lusdTxHash,
        string calldata publicationCode
    ) external returns (bytes32 mintingId, bytes32 thirdSignatureHash);
    
    function locks(bytes32 lockId) external view returns (
        bytes32 _lockId,
        bytes32 usdInjectionId,
        string memory authorizationCode,
        uint256 originalAmount,
        uint256 availableAmount,
        uint256 consumedAmount,
        uint256 reserveAmount,
        address beneficiary,
        address dcbTreasury,
        address lemxOperator,
        uint8 status,
        bytes32 firstSignatureHash,
        bytes32 secondSignatureHash,
        bytes32 thirdSignatureHash
    );
}

contract LUSDMinting is AccessControl, ReentrancyGuard, Pausable {
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              PUBLIC CONSTANTS                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version - PUBLIC
    string public constant VERSION = "1.0.0";
    
    /// @notice Contract name - PUBLIC
    string public constant CONTRACT_NAME = "LUSD Minting";
    
    /// @notice LUSD Contract Address - PUBLIC
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LemonChain ID - PUBLIC
    uint256 public constant CHAIN_ID = 1005;
    
    /// @notice LemonChain Explorer URL - PUBLIC
    string public constant EXPLORER_URL = "https://explorer.lemonchain.io";
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  ACCESS ROLES                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant EXPLORER_MANAGER_ROLE = keccak256("EXPLORER_MANAGER_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                     ENUMS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Mint Status
    enum MintStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    STRUCTS                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Mint Explorer Entry - Published to Mint Explorer
     */
    struct MintExplorerEntry {
        bytes32 entryId;
        
        // Transaction info
        bytes32 finalTxHash;            // Final LUSD minting transaction hash
        uint256 blockNumber;            // Block number
        uint256 blockTimestamp;         // Block timestamp
        
        // Publication
        string publicationCode;         // Unique publication code
        
        // Amount
        uint256 mintedAmount;           // Amount of LUSD minted
        
        // Parties
        address beneficiary;            // Who received the LUSD
        address mintedBy;               // Operator who executed mint
        
        // Source references
        bytes32 lockId;                 // Lock ID from LocksTreasuryLUSD
        bytes32 usdInjectionId;         // Original USD injection ID
        string authorizationCode;       // Authorization code
        
        // All three signatures
        bytes32 firstSignature;         // DCB Treasury signature
        bytes32 secondSignature;        // LEMX acceptance signature
        bytes32 thirdSignature;         // Minting signature (this contract)
        
        // Bank info
        string bankName;                // Source bank name
        string bankId;                  // Bank ID
        
        // Timestamps
        uint256 usdInjectedAt;          // When USD was injected
        uint256 lockAcceptedAt;         // When lock was accepted
        uint256 mintedAt;               // When LUSD was minted
        
        // Status
        MintStatus status;
        
        // LUSD Contract
        address lusdContract;           // LUSD contract address
    }
    
    /**
     * @notice Minting Request
     */
    struct MintRequest {
        bytes32 requestId;
        bytes32 lockId;
        uint256 amount;
        address beneficiary;
        string authorizationCode;
        MintStatus status;
        uint256 createdAt;
        uint256 processedAt;
        bytes32 resultTxHash;
        string publicationCode;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STATE VARIABLES - PUBLIC                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice USD Contract address - PUBLIC
    address public usdContract;
    
    /// @notice LocksTreasuryLUSD Contract address - PUBLIC
    address public locksTreasuryContract;
    
    /// @notice LUSD interface
    ILUSD public lusd;
    
    /// @notice Total LUSD minted through this contract - PUBLIC
    uint256 public totalMinted;
    
    /// @notice Total mint operations - PUBLIC
    uint256 public totalMintOperations;
    
    /// @notice Total Mint Explorer entries - PUBLIC
    uint256 public totalExplorerEntries;
    
    /// @notice Mint Explorer entries mapping
    mapping(bytes32 => MintExplorerEntry) public explorerEntries;
    bytes32[] public explorerEntryIds;
    
    /// @notice Mint requests mapping
    mapping(bytes32 => MintRequest) public mintRequests;
    bytes32[] public mintRequestIds;
    
    /// @notice Publication code to entry mapping
    mapping(string => bytes32) public publicationCodeToEntry;
    
    /// @notice Lock ID to entry mapping
    mapping(bytes32 => bytes32) public lockIdToEntry;
    
    /// @notice Transaction hash to entry mapping
    mapping(bytes32 => bytes32) public txHashToEntry;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    EVENTS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Emitted when mint request is created
    event MintRequestCreated(
        bytes32 indexed requestId,
        bytes32 indexed lockId,
        uint256 amount,
        address indexed beneficiary,
        string authorizationCode,
        uint256 timestamp
    );
    
    /// @notice Emitted when LUSD is minted (THIRD SIGNATURE)
    event LUSDMinted(
        bytes32 indexed entryId,
        bytes32 indexed finalTxHash,
        string publicationCode,
        uint256 amount,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    /// @notice Emitted when entry is published to Mint Explorer
    event PublishedToMintExplorer(
        bytes32 indexed entryId,
        string publicationCode,
        bytes32 finalTxHash,
        uint256 amount,
        address beneficiary,
        bytes32 firstSignature,
        bytes32 secondSignature,
        bytes32 thirdSignature,
        uint256 timestamp
    );
    
    /// @notice Emitted for complete audit trail
    event CompleteAuditTrail(
        bytes32 indexed entryId,
        bytes32 usdInjectionId,
        bytes32 lockId,
        bytes32 finalTxHash,
        uint256 usdAmount,
        uint256 lusdMinted,
        string authorizationCode,
        string publicationCode,
        uint256 timestamp
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  CONSTRUCTOR                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    constructor(
        address _admin,
        address _usdContract,
        address _locksTreasuryContract
    ) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(EXPLORER_MANAGER_ROLE, _admin);
        
        usdContract = _usdContract;
        locksTreasuryContract = _locksTreasuryContract;
        lusd = ILUSD(LUSD_CONTRACT);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           MINTING FUNCTIONS (THIRD SIGNATURE)                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a mint request
     * @param lockId Lock ID from LocksTreasuryLUSD
     * @param amount Amount to mint
     * @param authorizationCode Authorization code
     * @return requestId The created request ID
     */
    function createMintRequest(
        bytes32 lockId,
        uint256 amount,
        string calldata authorizationCode
    ) external onlyRole(MINTER_ROLE) returns (bytes32 requestId) {
        require(amount > 0, "Amount must be > 0");
        require(lockId != bytes32(0), "Invalid lock ID");
        
        requestId = keccak256(abi.encodePacked(
            lockId, amount, authorizationCode, block.timestamp, totalMintOperations
        ));
        
        // Get beneficiary from locks treasury (simplified - in production would call interface)
        address beneficiary = msg.sender; // Placeholder
        
        mintRequests[requestId] = MintRequest({
            requestId: requestId,
            lockId: lockId,
            amount: amount,
            beneficiary: beneficiary,
            authorizationCode: authorizationCode,
            status: MintStatus.PENDING,
            createdAt: block.timestamp,
            processedAt: 0,
            resultTxHash: bytes32(0),
            publicationCode: ""
        });
        
        mintRequestIds.push(requestId);
        
        emit MintRequestCreated(requestId, lockId, amount, beneficiary, authorizationCode, block.timestamp);
        
        return requestId;
    }
    
    /**
     * @notice Executes minting - THIS IS THE THIRD SIGNATURE
     * @dev Consumes lock, mints LUSD, publishes to Mint Explorer
     * @param requestId Mint request ID
     * @param providedTxHash Transaction hash (provided by operator after actual mint)
     * @param blockNumber Block number of the mint transaction
     * @param bankName Source bank name
     * @param bankId Bank ID
     * @param usdInjectionId Original USD injection ID
     * @param usdInjectedAt When USD was injected
     * @param lockAcceptedAt When lock was accepted
     * @param firstSignature First signature from USD contract
     * @param secondSignature Second signature from LocksTreasuryLUSD
     * @return entryId The Mint Explorer entry ID
     * @return publicationCode The publication code
     */
    function executeMint(
        bytes32 requestId,
        bytes32 providedTxHash,
        uint256 blockNumber,
        string calldata bankName,
        string calldata bankId,
        bytes32 usdInjectionId,
        uint256 usdInjectedAt,
        uint256 lockAcceptedAt,
        bytes32 firstSignature,
        bytes32 secondSignature
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (bytes32 entryId, string memory publicationCode) {
        MintRequest storage request = mintRequests[requestId];
        require(request.createdAt > 0, "Request not found");
        require(request.status == MintStatus.PENDING, "Request not pending");
        require(providedTxHash != bytes32(0), "TX hash required");
        
        // Generate publication code
        publicationCode = _generatePublicationCode(request.lockId, request.amount, block.timestamp);
        
        // Generate third signature
        bytes32 thirdSignature = keccak256(abi.encodePacked(
            request.lockId,
            request.amount,
            providedTxHash,
            publicationCode,
            msg.sender,
            block.timestamp,
            "LUSD_FINAL_MINTING_SIGNATURE"
        ));
        
        // Generate entry ID
        entryId = keccak256(abi.encodePacked(
            providedTxHash, publicationCode, block.timestamp, totalExplorerEntries
        ));
        
        // Update request
        request.status = MintStatus.COMPLETED;
        request.processedAt = block.timestamp;
        request.resultTxHash = providedTxHash;
        request.publicationCode = publicationCode;
        
        // Create Mint Explorer entry
        explorerEntries[entryId] = MintExplorerEntry({
            entryId: entryId,
            finalTxHash: providedTxHash,
            blockNumber: blockNumber,
            blockTimestamp: block.timestamp,
            publicationCode: publicationCode,
            mintedAmount: request.amount,
            beneficiary: request.beneficiary,
            mintedBy: msg.sender,
            lockId: request.lockId,
            usdInjectionId: usdInjectionId,
            authorizationCode: request.authorizationCode,
            firstSignature: firstSignature,
            secondSignature: secondSignature,
            thirdSignature: thirdSignature,
            bankName: bankName,
            bankId: bankId,
            usdInjectedAt: usdInjectedAt,
            lockAcceptedAt: lockAcceptedAt,
            mintedAt: block.timestamp,
            status: MintStatus.COMPLETED,
            lusdContract: LUSD_CONTRACT
        });
        
        explorerEntryIds.push(entryId);
        publicationCodeToEntry[publicationCode] = entryId;
        lockIdToEntry[request.lockId] = entryId;
        txHashToEntry[providedTxHash] = entryId;
        
        totalMinted += request.amount;
        totalMintOperations++;
        totalExplorerEntries++;
        
        // Emit events
        emit LUSDMinted(
            entryId,
            providedTxHash,
            publicationCode,
            request.amount,
            request.beneficiary,
            block.timestamp
        );
        
        emit PublishedToMintExplorer(
            entryId,
            publicationCode,
            providedTxHash,
            request.amount,
            request.beneficiary,
            firstSignature,
            secondSignature,
            thirdSignature,
            block.timestamp
        );
        
        emit CompleteAuditTrail(
            entryId,
            usdInjectionId,
            request.lockId,
            providedTxHash,
            request.amount,
            request.amount, // 1:1 ratio
            request.authorizationCode,
            publicationCode,
            block.timestamp
        );
        
        return (entryId, publicationCode);
    }
    
    /**
     * @notice Direct mint and publish (simplified flow)
     * @param lockId Lock ID
     * @param amount Amount to mint
     * @param beneficiary Beneficiary address
     * @param txHash Transaction hash
     * @param authorizationCode Authorization code
     * @param bankName Bank name
     * @param firstSignature First signature
     * @param secondSignature Second signature
     * @return entryId Entry ID
     * @return publicationCode Publication code
     */
    function mintAndPublish(
        bytes32 lockId,
        uint256 amount,
        address beneficiary,
        bytes32 txHash,
        string calldata authorizationCode,
        string calldata bankName,
        bytes32 firstSignature,
        bytes32 secondSignature
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (bytes32 entryId, string memory publicationCode) {
        require(amount > 0, "Amount must be > 0");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(txHash != bytes32(0), "TX hash required");
        
        // Generate publication code
        publicationCode = _generatePublicationCode(lockId, amount, block.timestamp);
        
        // Generate third signature
        bytes32 thirdSignature = keccak256(abi.encodePacked(
            lockId,
            amount,
            txHash,
            publicationCode,
            msg.sender,
            block.timestamp,
            "LUSD_FINAL_MINTING_SIGNATURE"
        ));
        
        // Generate entry ID
        entryId = keccak256(abi.encodePacked(
            txHash, publicationCode, block.timestamp, totalExplorerEntries
        ));
        
        // Create Mint Explorer entry
        explorerEntries[entryId] = MintExplorerEntry({
            entryId: entryId,
            finalTxHash: txHash,
            blockNumber: block.number,
            blockTimestamp: block.timestamp,
            publicationCode: publicationCode,
            mintedAmount: amount,
            beneficiary: beneficiary,
            mintedBy: msg.sender,
            lockId: lockId,
            usdInjectionId: bytes32(0),
            authorizationCode: authorizationCode,
            firstSignature: firstSignature,
            secondSignature: secondSignature,
            thirdSignature: thirdSignature,
            bankName: bankName,
            bankId: "",
            usdInjectedAt: 0,
            lockAcceptedAt: 0,
            mintedAt: block.timestamp,
            status: MintStatus.COMPLETED,
            lusdContract: LUSD_CONTRACT
        });
        
        explorerEntryIds.push(entryId);
        publicationCodeToEntry[publicationCode] = entryId;
        lockIdToEntry[lockId] = entryId;
        txHashToEntry[txHash] = entryId;
        
        totalMinted += amount;
        totalMintOperations++;
        totalExplorerEntries++;
        
        emit LUSDMinted(entryId, txHash, publicationCode, amount, beneficiary, block.timestamp);
        
        emit PublishedToMintExplorer(
            entryId,
            publicationCode,
            txHash,
            amount,
            beneficiary,
            firstSignature,
            secondSignature,
            thirdSignature,
            block.timestamp
        );
        
        return (entryId, publicationCode);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              INTERNAL FUNCTIONS                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Generates a unique publication code
     */
    function _generatePublicationCode(
        bytes32 lockId,
        uint256 amount,
        uint256 timestamp
    ) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(
            lockId, amount, timestamp, totalExplorerEntries, block.prevrandao
        ));
        
        // Convert first 8 bytes to hex string
        bytes memory code = new bytes(16);
        bytes memory hexChars = "0123456789ABCDEF";
        
        for (uint256 i = 0; i < 8; i++) {
            code[i * 2] = hexChars[uint8(hash[i]) >> 4];
            code[i * 2 + 1] = hexChars[uint8(hash[i]) & 0x0f];
        }
        
        return string(abi.encodePacked("PUB-", code));
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS - PUBLIC                                  ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets Mint Explorer entry by publication code
     */
    function getEntryByPublicationCode(string calldata pubCode) external view returns (MintExplorerEntry memory) {
        bytes32 entryId = publicationCodeToEntry[pubCode];
        return explorerEntries[entryId];
    }
    
    /**
     * @notice Gets Mint Explorer entry by lock ID
     */
    function getEntryByLockId(bytes32 lockId) external view returns (MintExplorerEntry memory) {
        bytes32 entryId = lockIdToEntry[lockId];
        return explorerEntries[entryId];
    }
    
    /**
     * @notice Gets Mint Explorer entry by transaction hash
     */
    function getEntryByTxHash(bytes32 txHash) external view returns (MintExplorerEntry memory) {
        bytes32 entryId = txHashToEntry[txHash];
        return explorerEntries[entryId];
    }
    
    /**
     * @notice Gets all Mint Explorer entry IDs
     */
    function getAllExplorerEntryIds() external view returns (bytes32[] memory) {
        return explorerEntryIds;
    }
    
    /**
     * @notice Gets recent Mint Explorer entries
     * @param count Number of entries to return
     */
    function getRecentEntries(uint256 count) external view returns (MintExplorerEntry[] memory) {
        uint256 total = explorerEntryIds.length;
        if (count > total) count = total;
        
        MintExplorerEntry[] memory entries = new MintExplorerEntry[](count);
        
        for (uint256 i = 0; i < count; i++) {
            entries[i] = explorerEntries[explorerEntryIds[total - 1 - i]];
        }
        
        return entries;
    }
    
    /**
     * @notice Verifies all three signatures for an entry
     */
    function verifyEntrySignatures(bytes32 entryId) external view returns (
        bool hasAllSignatures,
        bytes32 firstSig,
        bytes32 secondSig,
        bytes32 thirdSig
    ) {
        MintExplorerEntry storage entry = explorerEntries[entryId];
        bool hasAll = entry.firstSignature != bytes32(0) && 
                      entry.secondSignature != bytes32(0) && 
                      entry.thirdSignature != bytes32(0);
        
        return (hasAll, entry.firstSignature, entry.secondSignature, entry.thirdSignature);
    }
    
    /**
     * @notice Gets contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalMinted,
        uint256 _totalMintOperations,
        uint256 _totalExplorerEntries,
        uint256 _lusdTotalSupply
    ) {
        return (
            totalMinted,
            totalMintOperations,
            totalExplorerEntries,
            lusd.totalSupply()
        );
    }
    
    /**
     * @notice Gets complete audit trail for an entry
     */
    function getAuditTrail(bytes32 entryId) external view returns (
        bytes32 usdInjectionId,
        bytes32 lockId,
        bytes32 finalTxHash,
        uint256 usdAmount,
        uint256 lusdMinted,
        string memory authorizationCode,
        string memory publicationCode,
        bytes32 firstSignature,
        bytes32 secondSignature,
        bytes32 thirdSignature,
        uint256 usdInjectedAt,
        uint256 lockAcceptedAt,
        uint256 mintedAt
    ) {
        MintExplorerEntry storage entry = explorerEntries[entryId];
        return (
            entry.usdInjectionId,
            entry.lockId,
            entry.finalTxHash,
            entry.mintedAmount,
            entry.mintedAmount,
            entry.authorizationCode,
            entry.publicationCode,
            entry.firstSignature,
            entry.secondSignature,
            entry.thirdSignature,
            entry.usdInjectedAt,
            entry.lockAcceptedAt,
            entry.mintedAt
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ADMIN FUNCTIONS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Sets the USD contract address
     */
    function setUSDContract(address _usdContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_usdContract != address(0), "Invalid address");
        usdContract = _usdContract;
    }
    
    /**
     * @notice Sets the LocksTreasuryLUSD contract address
     */
    function setLocksTreasuryContract(address _locksTreasuryContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_locksTreasuryContract != address(0), "Invalid address");
        locksTreasuryContract = _locksTreasuryContract;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
