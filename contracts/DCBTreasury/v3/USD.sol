// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                              ║
 * ║     ██╗   ██╗███████╗██████╗      ████████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗                               ║
 * ║     ██║   ██║██╔════╝██╔══██╗     ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║                               ║
 * ║     ██║   ██║███████╗██║  ██║        ██║   ██║   ██║█████╔╝ █████╗  ██╔██╗ ██║                               ║
 * ║     ██║   ██║╚════██║██║  ██║        ██║   ██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║                               ║
 * ║     ╚██████╔╝███████║██████╔╝        ██║   ╚██████╔╝██║  ██╗███████╗██║ ╚████║                               ║
 * ║      ╚═════╝ ╚══════╝╚═════╝         ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝                               ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🏦 USD TOKEN - DIGITAL COMMERCIAL BANK                                                                      ║
 * ║                                                                                                              ║
 * ║  📋 Contract Name: USD                                                                                       ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                             ║
 * ║  📄 Standard: ERC-20 with ISO 20022 Extensions                                                               ║
 * ║  💱 Pegged: 1 USD = $1.00 USD (Backed by DAES/SWIFT Banking System)                                          ║
 * ║  🔓 Visibility: PUBLIC (Fully Transparent & Auditable)                                                       ║
 * ║                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                              ║
 * ║  🔄 FLOW INTEGRATION:                                                                                        ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │  1️⃣ DCB TREASURY: Selecciona Custody Account → Inyecta USD → Genera JSON/XML Comprobante               │ ║
 * ║  │  2️⃣ LEMX MINTING: Recibe Lock → Acepta → Firma en LocksTreasuryLUSD                                    │ ║
 * ║  │  3️⃣ MINT LUSD: Consume Lock → Firma Final → Mintea LUSD → Hash Final → Mint Explorer                   │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                                                              ║
 * ║  🔗 LINKED CONTRACTS:                                                                                        ║
 * ║  ├─ 📦 LocksTreasuryLUSD: Locks en favor de LUSD                                                            ║
 * ║  ├─ 💎 LUSD: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                     ║
 * ║  └─ 🔮 MultiStablecoinOracle: Verificación de precio $1.00                                                   ║
 * ║                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title USD - Digital Commercial Bank USD Token
 * @author Digital Commercial Bank Ltd
 * @notice ERC-20 USD Token backed by DAES/SWIFT banking system with ISO 20022 messaging
 * @dev First contract in the DCB → LEMX → LUSD minting flow
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 1.0.0
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract USD is ERC20, ERC20Burnable, ERC20Permit, AccessControl, ReentrancyGuard, Pausable {
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              PUBLIC CONSTANTS                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version - PUBLIC
    string public constant VERSION = "1.0.0";
    
    /// @notice Institution name - PUBLIC
    string public constant INSTITUTION_NAME = "Digital Commercial Bank Ltd";
    
    /// @notice ISO Currency Code - PUBLIC
    string public constant ISO_CURRENCY_CODE = "USD";
    
    /// @notice SWIFT/BIC Code - PUBLIC
    string public constant SWIFT_BIC = "DCBKUS33XXX";
    
    /// @notice LemonChain ID - PUBLIC
    uint256 public constant CHAIN_ID = 1005;
    
    /// @notice LUSD Contract Address - PUBLIC
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice Price precision (6 decimals) - PUBLIC
    uint256 public constant PRICE_PRECISION = 1e6;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  ACCESS ROLES                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant TREASURY_OPERATOR_ROLE = keccak256("TREASURY_OPERATOR_ROLE");
    bytes32 public constant CUSTODY_MANAGER_ROLE = keccak256("CUSTODY_MANAGER_ROLE");
    bytes32 public constant ISO_VALIDATOR_ROLE = keccak256("ISO_VALIDATOR_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                     ENUMS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Status of USD injection
    enum InjectionStatus {
        INITIATED,          // Injection started
        CUSTODY_LOCKED,     // Funds locked in custody account
        SENT_TO_LEMX,       // Sent to LEMX Minting for approval
        LOCK_ACCEPTED,      // Lock accepted by LEMX (signed in LocksTreasuryLUSD)
        CONSUMED_FOR_MINT,  // Lock consumed for LUSD minting
        COMPLETED,          // Full cycle complete
        CANCELLED           // Cancelled
    }
    
    /// @notice ISO 20022 Message Types
    enum ISO20022Type {
        PACS_008,   // Customer Credit Transfer
        PACS_009,   // Financial Institution Credit Transfer
        CAMT_053,   // Bank Statement
        CAMT_054    // Debit/Credit Notification
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    STRUCTS                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Custody Account - Bank account that holds USD backing
     */
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
    }
    
    /**
     * @notice USD Injection Record - Complete record of USD injection with JSON/XML proof
     */
    struct USDInjection {
        bytes32 injectionId;
        bytes32 custodyAccountId;
        uint256 amount;
        
        // ISO 20022 Message Data
        ISO20022Type isoType;
        string isoMessageCode;      // e.g., "pacs.008.001.08"
        bytes32 isoMessageHash;     // Hash of full ISO message
        string uetr;                // Unique End-to-End Transaction Reference
        string instructionId;
        string endToEndId;
        
        // JSON/XML Proof
        bytes32 jsonProofHash;      // Hash of JSON comprobante
        bytes32 xmlProofHash;       // Hash of XML comprobante
        string proofUri;            // IPFS or storage URI for full proof
        
        // Flow tracking
        InjectionStatus status;
        address beneficiary;
        
        // Timestamps
        uint256 createdAt;
        uint256 sentToLemxAt;
        uint256 lockAcceptedAt;
        uint256 consumedAt;
        uint256 completedAt;
        
        // Cross-contract references
        bytes32 lemxLockId;         // Lock ID in LocksTreasuryLUSD
        bytes32 lusdMintTxHash;     // Final LUSD mint transaction hash
        string authorizationCode;   // Authorization code for LEMX
    }
    
    /**
     * @notice ISO 20022 Message Record
     */
    struct ISO20022Message {
        bytes32 messageId;
        ISO20022Type messageType;
        string messageCode;
        bytes32 injectionId;
        string senderBic;
        string receiverBic;
        uint256 amount;
        bytes32 messageHash;
        uint256 timestamp;
        bool verified;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STATE VARIABLES - PUBLIC                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice LocksTreasuryLUSD contract address - PUBLIC
    address public locksTreasuryLUSD;
    
    /// @notice Total USD in custody - PUBLIC
    uint256 public totalCustodyBalance;
    
    /// @notice Total USD locked for LUSD backing - PUBLIC
    uint256 public totalLockedForLUSD;
    
    /// @notice Total injections count - PUBLIC
    uint256 public totalInjections;
    
    /// @notice Total ISO messages processed - PUBLIC
    uint256 public totalISOMessages;
    
    /// @notice Custody accounts mapping
    mapping(bytes32 => CustodyAccount) public custodyAccounts;
    bytes32[] public custodyAccountIds;
    
    /// @notice USD Injections mapping
    mapping(bytes32 => USDInjection) public injections;
    bytes32[] public injectionIds;
    
    /// @notice ISO Messages mapping
    mapping(bytes32 => ISO20022Message) public isoMessages;
    bytes32[] public isoMessageIds;
    
    /// @notice Authorization code to injection mapping
    mapping(string => bytes32) public authCodeToInjection;
    
    /// @notice LEMX Lock ID to injection mapping
    mapping(bytes32 => bytes32) public lemxLockToInjection;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    EVENTS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Emitted when custody account is created
    event CustodyAccountCreated(
        bytes32 indexed accountId,
        string accountName,
        string bankName,
        string swiftBic,
        address indexed owner,
        uint256 timestamp
    );
    
    /// @notice Emitted when USD is deposited to custody
    event CustodyDeposit(
        bytes32 indexed accountId,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    /// @notice Emitted when USD injection is initiated
    event USDInjectionInitiated(
        bytes32 indexed injectionId,
        bytes32 indexed custodyAccountId,
        uint256 amount,
        address indexed beneficiary,
        string authorizationCode,
        uint256 timestamp
    );
    
    /// @notice Emitted when ISO 20022 message is recorded
    event ISO20022MessageRecorded(
        bytes32 indexed messageId,
        bytes32 indexed injectionId,
        ISO20022Type messageType,
        string messageCode,
        uint256 amount,
        bytes32 messageHash,
        uint256 timestamp
    );
    
    /// @notice Emitted when JSON/XML proof is attached
    event ProofAttached(
        bytes32 indexed injectionId,
        bytes32 jsonProofHash,
        bytes32 xmlProofHash,
        string proofUri,
        uint256 timestamp
    );
    
    /// @notice Emitted when injection is sent to LEMX
    event SentToLEMX(
        bytes32 indexed injectionId,
        string authorizationCode,
        uint256 amount,
        address beneficiary,
        uint256 timestamp
    );
    
    /// @notice Emitted when LEMX accepts the lock
    event LockAcceptedByLEMX(
        bytes32 indexed injectionId,
        bytes32 indexed lemxLockId,
        uint256 timestamp
    );
    
    /// @notice Emitted when lock is consumed for LUSD minting
    event LockConsumedForMint(
        bytes32 indexed injectionId,
        bytes32 indexed lemxLockId,
        bytes32 lusdMintTxHash,
        uint256 mintedAmount,
        uint256 timestamp
    );
    
    /// @notice Emitted when full cycle is complete
    event InjectionCompleted(
        bytes32 indexed injectionId,
        uint256 usdAmount,
        uint256 lusdMinted,
        bytes32 finalTxHash,
        uint256 timestamp
    );
    
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
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           CUSTODY ACCOUNT FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a new custody account
     * @param accountName Human-readable name
     * @param bankName Bank name
     * @param swiftBic SWIFT/BIC code
     * @param accountNumber Account number
     * @return accountId The created account ID
     */
    function createCustodyAccount(
        string calldata accountName,
        string calldata bankName,
        string calldata swiftBic,
        string calldata accountNumber
    ) external onlyRole(CUSTODY_MANAGER_ROLE) returns (bytes32 accountId) {
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
            createdAt: block.timestamp
        });
        
        custodyAccountIds.push(accountId);
        
        emit CustodyAccountCreated(accountId, accountName, bankName, swiftBic, msg.sender, block.timestamp);
        
        return accountId;
    }
    
    /**
     * @notice Records deposit to custody account (from DAES/SWIFT)
     * @param accountId Custody account ID
     * @param amount Amount deposited
     */
    function recordCustodyDeposit(
        bytes32 accountId,
        uint256 amount
    ) external onlyRole(TREASURY_OPERATOR_ROLE) {
        require(custodyAccounts[accountId].isActive, "Account not active");
        require(amount > 0, "Amount must be > 0");
        
        custodyAccounts[accountId].balance += amount;
        totalCustodyBalance += amount;
        
        emit CustodyDeposit(accountId, amount, custodyAccounts[accountId].balance, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                        USD INJECTION FUNCTIONS (MAIN FLOW)                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Initiates USD injection from custody account
     * @dev STEP 1: DCB Treasury selects custody account and amount
     * @param custodyAccountId Source custody account
     * @param amount Amount to inject
     * @param beneficiary Address to receive LUSD
     * @param authorizationCode Authorization code for LEMX
     * @return injectionId The created injection ID
     */
    function initiateInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        address beneficiary,
        string calldata authorizationCode
    ) external onlyRole(TREASURY_OPERATOR_ROLE) nonReentrant returns (bytes32 injectionId) {
        CustodyAccount storage account = custodyAccounts[custodyAccountId];
        require(account.isActive, "Account not active");
        require(account.balance >= amount, "Insufficient balance");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(bytes(authorizationCode).length > 0, "Auth code required");
        require(authCodeToInjection[authorizationCode] == bytes32(0), "Auth code used");
        
        // Generate injection ID
        injectionId = keccak256(abi.encodePacked(
            custodyAccountId, amount, beneficiary, authorizationCode, block.timestamp, totalInjections
        ));
        
        // Lock funds in custody
        account.balance -= amount;
        account.lockedBalance += amount;
        totalLockedForLUSD += amount;
        
        // Create injection record
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
            injectionId, custodyAccountId, amount, beneficiary, authorizationCode, block.timestamp
        );
        
        return injectionId;
    }
    
    /**
     * @notice Attaches ISO 20022 message to injection
     * @dev Records the ISO message that accompanies the USD transfer
     * @param injectionId Injection ID
     * @param messageType Type of ISO message
     * @param messageCode Full message code (e.g., "pacs.008.001.08")
     * @param messageHash Hash of full ISO message
     * @param uetr Unique End-to-End Transaction Reference
     * @param instructionId Instruction ID
     * @param endToEndId End-to-end ID
     */
    function attachISOMessage(
        bytes32 injectionId,
        ISO20022Type messageType,
        string calldata messageCode,
        bytes32 messageHash,
        string calldata uetr,
        string calldata instructionId,
        string calldata endToEndId
    ) external onlyRole(ISO_VALIDATOR_ROLE) {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(injection.status == InjectionStatus.INITIATED, "Invalid status");
        
        // Update injection with ISO data
        injection.isoType = messageType;
        injection.isoMessageCode = messageCode;
        injection.isoMessageHash = messageHash;
        injection.uetr = uetr;
        injection.instructionId = instructionId;
        injection.endToEndId = endToEndId;
        injection.status = InjectionStatus.CUSTODY_LOCKED;
        
        // Create ISO message record
        bytes32 messageId = keccak256(abi.encodePacked(
            injectionId, messageCode, messageHash, block.timestamp
        ));
        
        isoMessages[messageId] = ISO20022Message({
            messageId: messageId,
            messageType: messageType,
            messageCode: messageCode,
            injectionId: injectionId,
            senderBic: SWIFT_BIC,
            receiverBic: "",
            amount: injection.amount,
            messageHash: messageHash,
            timestamp: block.timestamp,
            verified: true
        });
        
        isoMessageIds.push(messageId);
        totalISOMessages++;
        
        emit ISO20022MessageRecorded(
            messageId, injectionId, messageType, messageCode, injection.amount, messageHash, block.timestamp
        );
    }
    
    /**
     * @notice Attaches JSON/XML proof to injection
     * @dev Creates the comprobante that will be stored
     * @param injectionId Injection ID
     * @param jsonProofHash Hash of JSON comprobante
     * @param xmlProofHash Hash of XML comprobante
     * @param proofUri URI where full proof is stored (IPFS, etc.)
     */
    function attachProof(
        bytes32 injectionId,
        bytes32 jsonProofHash,
        bytes32 xmlProofHash,
        string calldata proofUri
    ) external onlyRole(TREASURY_OPERATOR_ROLE) {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(injection.status == InjectionStatus.CUSTODY_LOCKED, "Invalid status");
        
        injection.jsonProofHash = jsonProofHash;
        injection.xmlProofHash = xmlProofHash;
        injection.proofUri = proofUri;
        
        emit ProofAttached(injectionId, jsonProofHash, xmlProofHash, proofUri, block.timestamp);
    }
    
    /**
     * @notice Sends injection to LEMX Minting for approval
     * @dev STEP 2: USD is sent to LEMX Minting platform
     * @param injectionId Injection ID
     */
    function sendToLEMX(bytes32 injectionId) external onlyRole(TREASURY_OPERATOR_ROLE) {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(injection.status == InjectionStatus.CUSTODY_LOCKED, "Invalid status");
        require(injection.jsonProofHash != bytes32(0), "Proof required");
        
        injection.status = InjectionStatus.SENT_TO_LEMX;
        injection.sentToLemxAt = block.timestamp;
        
        // Mint USD tokens to represent the locked funds
        _mint(address(this), injection.amount);
        
        emit SentToLEMX(
            injectionId,
            injection.authorizationCode,
            injection.amount,
            injection.beneficiary,
            block.timestamp
        );
    }
    
    /**
     * @notice Called when LEMX accepts the lock (SECOND SIGNATURE)
     * @dev STEP 3: LEMX Minting accepts → Signs in LocksTreasuryLUSD
     * @param injectionId Injection ID
     * @param lemxLockId Lock ID in LocksTreasuryLUSD contract
     */
    function confirmLockAccepted(
        bytes32 injectionId,
        bytes32 lemxLockId
    ) external onlyRole(TREASURY_OPERATOR_ROLE) {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(injection.status == InjectionStatus.SENT_TO_LEMX, "Invalid status");
        
        injection.status = InjectionStatus.LOCK_ACCEPTED;
        injection.lockAcceptedAt = block.timestamp;
        injection.lemxLockId = lemxLockId;
        
        lemxLockToInjection[lemxLockId] = injectionId;
        
        // Transfer USD tokens to LocksTreasuryLUSD contract
        if (locksTreasuryLUSD != address(0)) {
            _transfer(address(this), locksTreasuryLUSD, injection.amount);
        }
        
        emit LockAcceptedByLEMX(injectionId, lemxLockId, block.timestamp);
    }
    
    /**
     * @notice Called when lock is consumed for LUSD minting (THIRD SIGNATURE)
     * @dev STEP 4: Lock consumed → LUSD minted → Final hash recorded
     * @param injectionId Injection ID
     * @param lusdMintTxHash Transaction hash of LUSD minting
     * @param mintedAmount Amount of LUSD minted
     */
    function confirmMintCompleted(
        bytes32 injectionId,
        bytes32 lusdMintTxHash,
        uint256 mintedAmount
    ) external onlyRole(TREASURY_OPERATOR_ROLE) {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(injection.status == InjectionStatus.LOCK_ACCEPTED, "Invalid status");
        require(mintedAmount == injection.amount, "Amount mismatch");
        
        injection.status = InjectionStatus.CONSUMED_FOR_MINT;
        injection.consumedAt = block.timestamp;
        injection.lusdMintTxHash = lusdMintTxHash;
        
        emit LockConsumedForMint(
            injectionId,
            injection.lemxLockId,
            lusdMintTxHash,
            mintedAmount,
            block.timestamp
        );
    }
    
    /**
     * @notice Marks injection as fully completed
     * @dev FINAL STEP: Full cycle complete, published to Mint Explorer
     * @param injectionId Injection ID
     */
    function completeInjection(bytes32 injectionId) external onlyRole(TREASURY_OPERATOR_ROLE) {
        USDInjection storage injection = injections[injectionId];
        require(injection.createdAt > 0, "Injection not found");
        require(injection.status == InjectionStatus.CONSUMED_FOR_MINT, "Invalid status");
        
        injection.status = InjectionStatus.COMPLETED;
        injection.completedAt = block.timestamp;
        
        // Burn the USD tokens as they've been converted to LUSD
        // The LUSD is now backed by the locked funds in custody
        
        emit InjectionCompleted(
            injectionId,
            injection.amount,
            injection.amount, // 1:1 ratio
            injection.lusdMintTxHash,
            block.timestamp
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS - PUBLIC                                  ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    /**
     * @notice Gets injection by authorization code
     */
    function getInjectionByAuthCode(string calldata authCode) external view returns (USDInjection memory) {
        bytes32 injectionId = authCodeToInjection[authCode];
        return injections[injectionId];
    }
    
    /**
     * @notice Gets injection by LEMX lock ID
     */
    function getInjectionByLemxLock(bytes32 lemxLockId) external view returns (USDInjection memory) {
        bytes32 injectionId = lemxLockToInjection[lemxLockId];
        return injections[injectionId];
    }
    
    /**
     * @notice Gets all custody account IDs
     */
    function getAllCustodyAccountIds() external view returns (bytes32[] memory) {
        return custodyAccountIds;
    }
    
    /**
     * @notice Gets all injection IDs
     */
    function getAllInjectionIds() external view returns (bytes32[] memory) {
        return injectionIds;
    }
    
    /**
     * @notice Gets contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalCustodyBalance,
        uint256 _totalLockedForLUSD,
        uint256 _totalInjections,
        uint256 _totalISOMessages,
        uint256 _totalSupply
    ) {
        return (
            totalCustodyBalance,
            totalLockedForLUSD,
            totalInjections,
            totalISOMessages,
            totalSupply()
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ADMIN FUNCTIONS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Sets the LocksTreasuryLUSD contract address
     */
    function setLocksTreasuryLUSD(address _locksTreasuryLUSD) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_locksTreasuryLUSD != address(0), "Invalid address");
        locksTreasuryLUSD = _locksTreasuryLUSD;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
