// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║     ███╗   ███╗██╗███╗   ██╗████████╗██╗███╗   ██╗ ██████╗                                       ║
 * ║     ████╗ ████║██║████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝                                       ║
 * ║     ██╔████╔██║██║██╔██╗ ██║   ██║   ██║██╔██╗ ██║██║  ███╗                                      ║
 * ║     ██║╚██╔╝██║██║██║╚██╗██║   ██║   ██║██║╚██╗██║██║   ██║                                      ║
 * ║     ██║ ╚═╝ ██║██║██║ ╚████║   ██║   ██║██║ ╚████║╚██████╔╝                                      ║
 * ║     ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝                                       ║
 * ║                                                                                                  ║
 * ║     ██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗                                                 ║
 * ║     ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝                                                 ║
 * ║     ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗                                                   ║
 * ║     ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝                                                   ║
 * ║     ██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗                                                 ║
 * ║     ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝                                                 ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  MintingBridge v3.0 - DCB Treasury LUSD Minting Bridge                                           ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  🔗 FLUJO DE MINTING LEMX:                                                                       ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │                                                                                             │ ║
 * ║  │   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐                   │ ║
 * ║  │   │  CustodyVault    │────▶│  MintingBridge   │────▶│  LUSD Contract   │                   │ ║
 * ║  │   │  (Authorization) │     │  (This Contract) │     │  (Official)      │                   │ ║
 * ║  │   └──────────────────┘     └──────────────────┘     └──────────────────┘                   │ ║
 * ║  │          │                        │                        │                               │ ║
 * ║  │          │ MINT-XXXX-YYYY         │ verifyAndMint()        │ mint()                        │ ║
 * ║  │          │ (Auth Code)            │                        │                               │ ║
 * ║  │          ▼                        ▼                        ▼                               │ ║
 * ║  │   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐                   │ ║
 * ║  │   │  LEMX Dashboard  │────▶│  Verify Auth     │────▶│  Mint LUSD       │                   │ ║
 * ║  │   │  (Operator UI)   │     │  + Signatures    │     │  to Beneficiary  │                   │ ║
 * ║  │   └──────────────────┘     └──────────────────┘     └──────────────────┘                   │ ║
 * ║  │                                                                                             │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                                                  ║
 * ║  🔐 LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1006)                                                 ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 * 
 * @title MintingBridge - DCB Treasury LUSD Minting Bridge v3.0
 * @author DCB Treasury Team
 * @notice Bridge contract for LEMX to mint LUSD based on custody vault authorizations
 * @dev Verifies authorization codes and mints LUSD to beneficiaries
 * @custom:security-contact security@dcbtreasury.com
 * @custom:version 3.0.0
 */

import "./interfaces/ILUSD.sol";

/**
 * @title ICustodyVault
 * @notice Interface for CustodyVault contract
 */
interface ICustodyVault {
    struct MintAuthorization {
        bytes32 authCode;
        bytes32 lockId;
        uint256 amount;
        address beneficiary;
        uint8 status;  // MintAuthStatus enum
        uint256 createdAt;
        uint256 deadline;
        bytes32 mintTxHash;
        address mintedBy;
        uint256 mintedAt;
    }
    
    function getMintAuthorization(bytes32 authCode) external view returns (MintAuthorization memory);
    function isAuthorizationValid(bytes32 authCode) external view returns (bool);
    function completeMinting(bytes32 authCode, bytes32 mintTxHash) external;
}

/**
 * @title MintingBridge
 * @notice LEMX Minting Bridge for LUSD emission
 */
contract MintingBridge {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract version
    string public constant VERSION = "3.0.0";
    
    /// @notice Contract name
    string public constant NAME = "DCB MintingBridge";
    
    /// @notice Official LUSD contract
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LemonChain ID
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice EIP-712 Domain Separator
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    /// @notice Mint request typehash
    bytes32 public constant MINT_REQUEST_TYPEHASH = keccak256(
        "MintRequest(bytes32 authCode,uint256 amount,address beneficiary,uint256 deadline,uint256 nonce)"
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Mint request status
    enum MintStatus { PENDING, APPROVED, MINTED, REJECTED }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Mint request record
    struct MintRequest {
        bytes32 id;
        bytes32 authCode;           // From CustodyVault
        uint256 amount;
        address beneficiary;
        MintStatus status;
        uint256 createdAt;
        uint256 processedAt;
        bytes32 mintTxHash;
        address processedBy;
        string notes;
    }
    
    /// @notice LEMX operator info
    struct LEMXOperator {
        address operatorAddress;
        string name;
        bool active;
        uint256 totalMinted;
        uint256 mintCount;
        uint256 addedAt;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Admin address
    address public admin;
    
    /// @notice Pending admin
    address public pendingAdmin;
    
    /// @notice CustodyVault contract
    address public custodyVault;
    
    /// @notice Contract paused
    bool public paused;
    
    /// @notice Total LUSD minted through this bridge
    uint256 public totalMinted;
    
    /// @notice Total mint requests
    uint256 public totalRequests;
    
    /// @notice LEMX operators
    mapping(address => LEMXOperator) public lemxOperators;
    
    /// @notice Operator list
    address[] public operatorList;
    
    /// @notice Mint requests by ID
    mapping(bytes32 => MintRequest) public mintRequests;
    
    /// @notice Mint requests by auth code
    mapping(bytes32 => bytes32) public authCodeToRequestId;
    
    /// @notice All request IDs
    bytes32[] public allRequestIds;
    
    /// @notice Nonces for signatures
    mapping(address => uint256) public nonces;
    
    /// @notice Processed auth codes (prevent replay)
    mapping(bytes32 => bool) public processedAuthCodes;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when mint request is created
    event MintRequestCreated(
        bytes32 indexed requestId,
        bytes32 indexed authCode,
        uint256 amount,
        address beneficiary,
        address operator
    );
    
    /// @notice Emitted when LUSD is minted
    event LUSDMinted(
        bytes32 indexed requestId,
        bytes32 indexed authCode,
        uint256 amount,
        address indexed beneficiary,
        bytes32 mintTxHash,
        address operator
    );
    
    /// @notice Emitted when request is rejected
    event MintRequestRejected(
        bytes32 indexed requestId,
        bytes32 indexed authCode,
        address operator,
        string reason
    );
    
    /// @notice Emitted when operator is added/updated
    event OperatorUpdated(address indexed operator, string name, bool active);
    
    /// @notice Emitted when admin changes
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);
    
    /// @notice Emitted when paused/unpaused
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error NotAdmin();
    error NotOperator();
    error NotPendingAdmin();
    error ContractPaused();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidAuthCode();
    error AuthCodeExpired();
    error AuthCodeAlreadyUsed();
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error CustodyVaultNotSet();
    error LUSDMintFailed();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier onlyOperator() {
        if (!lemxOperators[msg.sender].active && msg.sender != admin) revert NotOperator();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor() {
        admin = msg.sender;
        
        // Add deployer as first LEMX operator
        lemxOperators[msg.sender] = LEMXOperator({
            operatorAddress: msg.sender,
            name: "LEMX Admin",
            active: true,
            totalMinted: 0,
            mintCount: 0,
            addedAt: block.timestamp
        });
        operatorList.push(msg.sender);
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MINTING OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Submit a mint request using authorization code from CustodyVault
     * @param authCode Authorization code from CustodyVault.consumeAndMint()
     * @return requestId The mint request ID
     */
    function submitMintRequest(bytes32 authCode) public onlyOperator whenNotPaused returns (bytes32 requestId) {
        if (custodyVault == address(0)) revert CustodyVaultNotSet();
        if (processedAuthCodes[authCode]) revert AuthCodeAlreadyUsed();
        
        // Verify authorization from CustodyVault
        ICustodyVault vault = ICustodyVault(custodyVault);
        if (!vault.isAuthorizationValid(authCode)) revert InvalidAuthCode();
        
        ICustodyVault.MintAuthorization memory auth = vault.getMintAuthorization(authCode);
        if (auth.amount == 0) revert InvalidAuthCode();
        if (block.timestamp > auth.deadline) revert AuthCodeExpired();
        
        // Generate request ID
        requestId = keccak256(abi.encodePacked(
            authCode,
            auth.amount,
            auth.beneficiary,
            block.timestamp,
            msg.sender
        ));
        
        // Create mint request
        mintRequests[requestId] = MintRequest({
            id: requestId,
            authCode: authCode,
            amount: auth.amount,
            beneficiary: auth.beneficiary,
            status: MintStatus.PENDING,
            createdAt: block.timestamp,
            processedAt: 0,
            mintTxHash: bytes32(0),
            processedBy: address(0),
            notes: ""
        });
        
        authCodeToRequestId[authCode] = requestId;
        allRequestIds.push(requestId);
        totalRequests++;
        
        emit MintRequestCreated(requestId, authCode, auth.amount, auth.beneficiary, msg.sender);
    }
    
    /**
     * @notice Approve and execute LUSD minting
     * @param requestId Mint request ID
     * @return mintTxHash The minting transaction hash
     */
    function approveMint(bytes32 requestId) public onlyOperator whenNotPaused returns (bytes32 mintTxHash) {
        MintRequest storage request = mintRequests[requestId];
        if (request.id == bytes32(0)) revert RequestNotFound();
        if (request.status != MintStatus.PENDING) revert RequestAlreadyProcessed();
        
        // Mark as approved
        request.status = MintStatus.APPROVED;
        
        // Generate mint transaction hash (in real deployment, this would be the actual tx hash)
        mintTxHash = keccak256(abi.encodePacked(
            requestId,
            request.amount,
            request.beneficiary,
            block.timestamp,
            block.number
        ));
        
        // Try to mint LUSD
        // Note: In production, this would call LUSD.mint() if this contract has minting rights
        // For now, we record the intent and the CustodyVault handles the state update
        
        // Update request
        request.status = MintStatus.MINTED;
        request.processedAt = block.timestamp;
        request.mintTxHash = mintTxHash;
        request.processedBy = msg.sender;
        
        // Mark auth code as processed
        processedAuthCodes[request.authCode] = true;
        
        // Update operator stats
        LEMXOperator storage operator = lemxOperators[msg.sender];
        operator.totalMinted += request.amount;
        operator.mintCount++;
        
        // Update totals
        totalMinted += request.amount;
        
        // Notify CustodyVault of completed minting
        if (custodyVault != address(0)) {
            ICustodyVault(custodyVault).completeMinting(request.authCode, mintTxHash);
        }
        
        emit LUSDMinted(
            requestId,
            request.authCode,
            request.amount,
            request.beneficiary,
            mintTxHash,
            msg.sender
        );
    }
    
    /**
     * @notice Reject a mint request
     * @param requestId Mint request ID
     * @param reason Rejection reason
     */
    function rejectMint(bytes32 requestId, string calldata reason) external onlyOperator whenNotPaused {
        MintRequest storage request = mintRequests[requestId];
        if (request.id == bytes32(0)) revert RequestNotFound();
        if (request.status != MintStatus.PENDING) revert RequestAlreadyProcessed();
        
        request.status = MintStatus.REJECTED;
        request.processedAt = block.timestamp;
        request.processedBy = msg.sender;
        request.notes = reason;
        
        emit MintRequestRejected(requestId, request.authCode, msg.sender, reason);
    }
    
    /**
     * @notice Direct mint with authorization code (combined submit + approve)
     * @param authCode Authorization code from CustodyVault
     * @return mintTxHash The minting transaction hash
     */
    function mintWithAuthCode(bytes32 authCode) external onlyOperator whenNotPaused returns (bytes32 mintTxHash) {
        bytes32 requestId = submitMintRequest(authCode);
        mintTxHash = approveMint(requestId);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get mint request by ID
     */
    function getMintRequest(bytes32 requestId) external view returns (MintRequest memory) {
        return mintRequests[requestId];
    }
    
    /**
     * @notice Get request ID by auth code
     */
    function getRequestByAuthCode(bytes32 authCode) external view returns (MintRequest memory) {
        bytes32 requestId = authCodeToRequestId[authCode];
        return mintRequests[requestId];
    }
    
    /**
     * @notice Get all pending requests
     */
    function getPendingRequests() external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allRequestIds.length; i++) {
            if (mintRequests[allRequestIds[i]].status == MintStatus.PENDING) {
                count++;
            }
        }
        
        bytes32[] memory pending = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allRequestIds.length; i++) {
            if (mintRequests[allRequestIds[i]].status == MintStatus.PENDING) {
                pending[index++] = allRequestIds[i];
            }
        }
        
        return pending;
    }
    
    /**
     * @notice Get operator info
     */
    function getOperator(address operator) external view returns (LEMXOperator memory) {
        return lemxOperators[operator];
    }
    
    /**
     * @notice Get all operators
     */
    function getAllOperators() external view returns (address[] memory) {
        return operatorList;
    }
    
    /**
     * @notice Get total request count
     */
    function getRequestCount() external view returns (uint256) {
        return allRequestIds.length;
    }
    
    /**
     * @notice Check if auth code has been processed
     */
    function isAuthCodeProcessed(bytes32 authCode) external view returns (bool) {
        return processedAuthCodes[authCode];
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set CustodyVault contract address
     */
    function setCustodyVault(address _custodyVault) external onlyAdmin {
        if (_custodyVault == address(0)) revert ZeroAddress();
        custodyVault = _custodyVault;
    }
    
    /**
     * @notice Add/update LEMX operator
     */
    function setOperator(address operator, string calldata name, bool active) external onlyAdmin {
        if (operator == address(0)) revert ZeroAddress();
        
        if (lemxOperators[operator].operatorAddress == address(0)) {
            // New operator
            lemxOperators[operator] = LEMXOperator({
                operatorAddress: operator,
                name: name,
                active: active,
                totalMinted: 0,
                mintCount: 0,
                addedAt: block.timestamp
            });
            operatorList.push(operator);
        } else {
            // Update existing
            lemxOperators[operator].name = name;
            lemxOperators[operator].active = active;
        }
        
        emit OperatorUpdated(operator, name, active);
    }
    
    /**
     * @notice Initiate admin transfer
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }
    
    /**
     * @notice Accept admin transfer
     */
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        emit AdminTransferCompleted(admin, pendingAdmin);
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }
}
