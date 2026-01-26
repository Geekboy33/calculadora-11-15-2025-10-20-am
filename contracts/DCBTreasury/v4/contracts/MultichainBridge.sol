// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║    ███╗   ███╗██╗   ██╗██╗  ████████╗██╗ ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗    ██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗║
 * ║    ████╗ ████║██║   ██║██║  ╚══██╔══╝██║██╔════╝██║  ██║██╔══██╗██║████╗  ██║    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝║
 * ║    ██╔████╔██║██║   ██║██║     ██║   ██║██║     ███████║███████║██║██╔██╗ ██║    ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗  ║
 * ║    ██║╚██╔╝██║██║   ██║██║     ██║   ██║██║     ██╔══██║██╔══██║██║██║╚██╗██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝  ║
 * ║    ██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║╚██████╗██║  ██║██║  ██║██║██║ ╚████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗║
 * ║    ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  🌐 MULTICHAIN BRIDGE - CROSS-CHAIN USD TRANSFERS                                                                            ║
 * ║                                                                                                                              ║
 * ║  📋 Contract: MultichainBridge                                                                                               ║
 * ║  🔓 License: MIT (Open Source & Public)                                                                                      ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💡 SUPPORTED CHAINS:                                                                                                        ║
 * |  |-- LemonChain (1006)      - Primary Chain                                                                                ║
 * ║  ├─ 🔷 Ethereum (1)           - Bridge Support                                                                               ║
 * ║  ├─ 🟣 Polygon (137)          - Bridge Support                                                                               ║
 * ║  ├─ 🔵 Arbitrum (42161)       - Bridge Support                                                                               ║
 * ║  ├─ 🔴 Optimism (10)          - Bridge Support                                                                               ║
 * ║  ├─ 🟡 BSC (56)               - Bridge Support                                                                               ║
 * ║  ├─ 🔶 Avalanche (43114)      - Bridge Support                                                                               ║
 * ║  └─ ⚫ Base (8453)            - Bridge Support                                                                               ║
 * ║                                                                                                                              ║
 * ║  🔄 BRIDGE FLOW:                                                                                                             ║
 * ║  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
 * ║  │  1. User initiates bridge on source chain (lockForBridge)                                                             │  ║
 * ║  │  2. Bridge relayers verify transaction on source chain                                                                │  ║
 * ║  │  3. Relayers submit proof to destination chain                                                                        │  ║
 * ║  │  4. Destination chain mints/releases tokens to user (completeBridge)                                                  │  ║
 * ║  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title MultichainBridge - Cross-chain USD Token Bridge
 * @author Digital Commercial Bank Ltd
 * @notice Enables cross-chain transfers of USD tokens
 * @dev Lock & Mint / Burn & Release bridge pattern
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 4.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IUSD {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MultichainBridge is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Contract version
    string public constant VERSION = "4.0.0";
    
    /// @notice Contract name
    string public constant CONTRACT_NAME = "Multichain Bridge";

    // ══════════════════════════════════════════════════════════════════════════════
    // SUPPORTED CHAINS
    // ══════════════════════════════════════════════════════════════════════════════
    
    uint256 public constant CHAIN_LEMONCHAIN = 1006;
    uint256 public constant CHAIN_ETHEREUM = 1;
    uint256 public constant CHAIN_POLYGON = 137;
    uint256 public constant CHAIN_ARBITRUM = 42161;
    uint256 public constant CHAIN_OPTIMISM = 10;
    uint256 public constant CHAIN_BSC = 56;
    uint256 public constant CHAIN_AVALANCHE = 43114;
    uint256 public constant CHAIN_BASE = 8453;

    // ══════════════════════════════════════════════════════════════════════════════
    // ROLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Role for bridge relayers
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    
    /// @notice Role for bridge operators
    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");
    
    /// @notice Role for fee managers
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // ══════════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Bridge request status
    enum BridgeStatus {
        PENDING,        // Waiting for relayer confirmation
        PROCESSING,     // Being processed by relayers
        COMPLETED,      // Successfully bridged
        FAILED,         // Failed to bridge
        REFUNDED,       // Refunded to sender
        CANCELLED       // Cancelled by user or admin
    }

    /// @notice Bridge direction
    enum BridgeDirection {
        OUTGOING,       // From this chain to another
        INCOMING        // From another chain to this
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Chain configuration
    struct ChainConfig {
        uint256 chainId;
        string chainName;
        address bridgeContract;     // Bridge contract on that chain
        address usdContract;        // USD contract on that chain
        bool isActive;
        uint256 minBridgeAmount;    // Minimum amount to bridge
        uint256 maxBridgeAmount;    // Maximum amount per transaction
        uint256 dailyLimit;         // Daily bridge limit
        uint256 dailyBridged;       // Amount bridged today
        uint256 lastResetDay;       // Last day the counter was reset
        uint256 bridgeFee;          // Fee in basis points (100 = 1%)
        uint256 confirmationsRequired; // Confirmations needed
    }

    /// @notice Bridge request
    struct BridgeRequest {
        bytes32 requestId;
        
        // Chain info
        uint256 sourceChain;
        uint256 destinationChain;
        BridgeDirection direction;
        
        // Amount info
        uint256 amount;
        uint256 fee;
        uint256 netAmount;          // Amount after fee
        
        // Parties
        address sender;
        address recipient;
        
        // Status
        BridgeStatus status;
        
        // Signatures & verification
        bytes32 sourceTransactionHash;
        bytes32 destinationTransactionHash;
        uint256 confirmations;
        mapping(address => bool) relayerConfirmed;
        
        // Timestamps
        uint256 initiatedAt;
        uint256 completedAt;
        uint256 expiresAt;
        
        // Proof
        bytes32 merkleRoot;
        bytes32[] merkleProof;
    }

    /// @notice Bridge request info (for view functions without mapping)
    struct BridgeRequestInfo {
        bytes32 requestId;
        uint256 sourceChain;
        uint256 destinationChain;
        BridgeDirection direction;
        uint256 amount;
        uint256 fee;
        uint256 netAmount;
        address sender;
        address recipient;
        BridgeStatus status;
        bytes32 sourceTransactionHash;
        bytes32 destinationTransactionHash;
        uint256 confirmations;
        uint256 initiatedAt;
        uint256 completedAt;
        uint256 expiresAt;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Current chain ID
    uint256 public immutable currentChainId;
    
    /// @notice USD Token contract
    address public usdContract;
    
    /// @notice Fee collector address
    address public feeCollector;
    
    /// @notice Total bridged out
    uint256 public totalBridgedOut;
    
    /// @notice Total bridged in
    uint256 public totalBridgedIn;
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;
    
    /// @notice Default bridge expiry (24 hours)
    uint256 public defaultBridgeExpiry = 24 hours;
    
    /// @notice Minimum confirmations required
    uint256 public minConfirmations = 3;
    
    /// @notice Nonce for request IDs
    uint256 public bridgeNonce;

    // ══════════════════════════════════════════════════════════════════════════════
    // MAPPINGS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Chain configurations by chain ID
    mapping(uint256 => ChainConfig) public chainConfigs;
    
    /// @notice Supported chain IDs
    uint256[] public supportedChainIds;
    
    /// @notice Bridge requests by ID
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    
    /// @notice All bridge request IDs
    bytes32[] public bridgeRequestIds;
    
    /// @notice Source tx hash to request ID (prevent replay)
    mapping(bytes32 => bytes32) public sourceTxToRequest;
    
    /// @notice User's bridge requests
    mapping(address => bytes32[]) public userBridgeRequests;
    
    /// @notice Processed nonces per chain (prevent replay)
    mapping(uint256 => mapping(uint256 => bool)) public processedNonces;

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when bridge is initiated
    event BridgeInitiated(
        bytes32 indexed requestId,
        address indexed sender,
        address indexed recipient,
        uint256 sourceChain,
        uint256 destinationChain,
        uint256 amount,
        uint256 fee,
        uint256 netAmount,
        uint256 timestamp
    );

    /// @notice Emitted when relayer confirms
    event RelayerConfirmed(
        bytes32 indexed requestId,
        address indexed relayer,
        uint256 confirmations,
        uint256 timestamp
    );

    /// @notice Emitted when bridge is completed
    event BridgeCompleted(
        bytes32 indexed requestId,
        address indexed recipient,
        uint256 amount,
        bytes32 destinationTxHash,
        uint256 timestamp
    );

    /// @notice Emitted when bridge fails
    event BridgeFailed(
        bytes32 indexed requestId,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when bridge is refunded
    event BridgeRefunded(
        bytes32 indexed requestId,
        address indexed sender,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when chain is configured
    event ChainConfigured(
        uint256 indexed chainId,
        string chainName,
        address bridgeContract,
        address usdContract,
        bool isActive
    );

    /// @notice Emitted when fee is updated
    event FeeUpdated(
        uint256 indexed chainId,
        uint256 oldFee,
        uint256 newFee
    );

    /// @notice Emitted when fees are collected
    event FeesCollected(
        address indexed collector,
        uint256 amount,
        uint256 timestamp
    );

    // ══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════════

    error InvalidChain();
    error ChainNotSupported();
    error InvalidAmount();
    error AmountBelowMinimum();
    error AmountAboveMaximum();
    error DailyLimitExceeded();
    error InvalidAddress();
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error RequestExpired();
    error InsufficientConfirmations();
    error AlreadyConfirmed();
    error InvalidSignature();
    error InvalidProof();
    error ReplayAttack();

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════════

    constructor(address _admin, address _usdContract, address _feeCollector) {
        if (_admin == address(0)) revert InvalidAddress();
        if (_usdContract == address(0)) revert InvalidAddress();
        if (_feeCollector == address(0)) revert InvalidAddress();
        
        currentChainId = block.chainid;
        usdContract = _usdContract;
        feeCollector = _feeCollector;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(RELAYER_ROLE, _admin);
        _grantRole(BRIDGE_OPERATOR_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
        
        // Initialize supported chains
        _initializeSupportedChains();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // BRIDGE FUNCTIONS - OUTGOING
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initiates a bridge transfer to another chain
     * @param destinationChain Destination chain ID
     * @param recipient Recipient address on destination chain
     * @param amount Amount to bridge
     * @return requestId The bridge request ID
     */
    function bridgeTo(
        uint256 destinationChain,
        address recipient,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (bytes32 requestId) {
        // Validations
        ChainConfig storage destConfig = chainConfigs[destinationChain];
        if (!destConfig.isActive) revert ChainNotSupported();
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (amount < destConfig.minBridgeAmount) revert AmountBelowMinimum();
        if (amount > destConfig.maxBridgeAmount) revert AmountAboveMaximum();
        
        // Check daily limit
        _checkAndUpdateDailyLimit(destinationChain, amount);
        
        // Calculate fee
        uint256 fee = (amount * destConfig.bridgeFee) / 10000;
        uint256 netAmount = amount - fee;
        
        // Generate request ID
        requestId = keccak256(abi.encodePacked(
            currentChainId,
            destinationChain,
            msg.sender,
            recipient,
            amount,
            block.timestamp,
            bridgeNonce++
        ));
        
        // Create request
        BridgeRequest storage request = bridgeRequests[requestId];
        request.requestId = requestId;
        request.sourceChain = currentChainId;
        request.destinationChain = destinationChain;
        request.direction = BridgeDirection.OUTGOING;
        request.amount = amount;
        request.fee = fee;
        request.netAmount = netAmount;
        request.sender = msg.sender;
        request.recipient = recipient;
        request.status = BridgeStatus.PENDING;
        request.initiatedAt = block.timestamp;
        request.expiresAt = block.timestamp + defaultBridgeExpiry;
        
        // Update mappings
        bridgeRequestIds.push(requestId);
        userBridgeRequests[msg.sender].push(requestId);
        
        // Lock tokens (transfer to bridge)
        IERC20(usdContract).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update statistics
        totalBridgedOut += amount;
        if (fee > 0) {
            totalFeesCollected += fee;
        }
        
        emit BridgeInitiated(
            requestId,
            msg.sender,
            recipient,
            currentChainId,
            destinationChain,
            amount,
            fee,
            netAmount,
            block.timestamp
        );
        
        return requestId;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // BRIDGE FUNCTIONS - INCOMING (Relayer)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Relayer confirms an incoming bridge request
     * @param requestId Request ID from source chain
     * @param sourceChain Source chain ID
     * @param sender Original sender
     * @param recipient Recipient on this chain
     * @param amount Amount being bridged (net after fee)
     * @param sourceTxHash Transaction hash on source chain
     * @param nonce Unique nonce for this bridge
     * @param signature Relayer signature
     */
    function confirmBridge(
        bytes32 requestId,
        uint256 sourceChain,
        address sender,
        address recipient,
        uint256 amount,
        bytes32 sourceTxHash,
        uint256 nonce,
        bytes calldata signature
    ) external onlyRole(RELAYER_ROLE) nonReentrant {
        // Prevent replay
        if (processedNonces[sourceChain][nonce]) revert ReplayAttack();
        if (sourceTxToRequest[sourceTxHash] != bytes32(0)) revert ReplayAttack();
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            requestId,
            sourceChain,
            currentChainId,
            sender,
            recipient,
            amount,
            sourceTxHash,
            nonce
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        if (!hasRole(RELAYER_ROLE, signer)) revert InvalidSignature();
        
        // Get or create request
        BridgeRequest storage request = bridgeRequests[requestId];
        
        if (request.initiatedAt == 0) {
            // New incoming request
            request.requestId = requestId;
            request.sourceChain = sourceChain;
            request.destinationChain = currentChainId;
            request.direction = BridgeDirection.INCOMING;
            request.amount = amount;
            request.netAmount = amount;
            request.sender = sender;
            request.recipient = recipient;
            request.status = BridgeStatus.PROCESSING;
            request.sourceTransactionHash = sourceTxHash;
            request.initiatedAt = block.timestamp;
            request.expiresAt = block.timestamp + defaultBridgeExpiry;
            
            bridgeRequestIds.push(requestId);
            userBridgeRequests[recipient].push(requestId);
            sourceTxToRequest[sourceTxHash] = requestId;
        }
        
        // Check if already confirmed by this relayer
        if (request.relayerConfirmed[msg.sender]) revert AlreadyConfirmed();
        
        // Add confirmation
        request.relayerConfirmed[msg.sender] = true;
        request.confirmations++;
        
        emit RelayerConfirmed(requestId, msg.sender, request.confirmations, block.timestamp);
        
        // Complete if enough confirmations
        if (request.confirmations >= minConfirmations && request.status == BridgeStatus.PROCESSING) {
            _completeBridge(requestId);
        }
        
        // Mark nonce as processed
        processedNonces[sourceChain][nonce] = true;
    }

    /**
     * @notice Completes a bridge request (releases/mints tokens)
     * @param requestId Request ID
     */
    function _completeBridge(bytes32 requestId) internal {
        BridgeRequest storage request = bridgeRequests[requestId];
        
        if (request.status != BridgeStatus.PROCESSING) revert RequestAlreadyProcessed();
        if (request.confirmations < minConfirmations) revert InsufficientConfirmations();
        
        // Update status
        request.status = BridgeStatus.COMPLETED;
        request.completedAt = block.timestamp;
        request.destinationTransactionHash = bytes32(block.number);
        
        // Release tokens to recipient
        IERC20(usdContract).safeTransfer(request.recipient, request.netAmount);
        
        // Update statistics
        totalBridgedIn += request.netAmount;
        
        emit BridgeCompleted(
            requestId,
            request.recipient,
            request.netAmount,
            request.destinationTransactionHash,
            block.timestamp
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // REFUND FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Refunds an expired or failed bridge request
     * @param requestId Request ID
     */
    function refundBridge(bytes32 requestId) external nonReentrant {
        BridgeRequest storage request = bridgeRequests[requestId];
        
        if (request.initiatedAt == 0) revert RequestNotFound();
        if (request.direction != BridgeDirection.OUTGOING) revert InvalidChain();
        if (request.status != BridgeStatus.PENDING && request.status != BridgeStatus.FAILED) {
            revert RequestAlreadyProcessed();
        }
        if (block.timestamp < request.expiresAt && request.status != BridgeStatus.FAILED) {
            revert RequestExpired();
        }
        
        // Only sender or admin can refund
        require(
            msg.sender == request.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        // Update status
        request.status = BridgeStatus.REFUNDED;
        request.completedAt = block.timestamp;
        
        // Refund tokens (minus fee which is already deducted)
        uint256 refundAmount = request.amount - request.fee;
        IERC20(usdContract).safeTransfer(request.sender, refundAmount);
        
        // Update statistics
        totalBridgedOut -= request.amount;
        
        emit BridgeRefunded(requestId, request.sender, refundAmount, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets bridge request info
     */
    function getBridgeRequest(bytes32 requestId) external view returns (BridgeRequestInfo memory) {
        BridgeRequest storage request = bridgeRequests[requestId];
        return BridgeRequestInfo({
            requestId: request.requestId,
            sourceChain: request.sourceChain,
            destinationChain: request.destinationChain,
            direction: request.direction,
            amount: request.amount,
            fee: request.fee,
            netAmount: request.netAmount,
            sender: request.sender,
            recipient: request.recipient,
            status: request.status,
            sourceTransactionHash: request.sourceTransactionHash,
            destinationTransactionHash: request.destinationTransactionHash,
            confirmations: request.confirmations,
            initiatedAt: request.initiatedAt,
            completedAt: request.completedAt,
            expiresAt: request.expiresAt
        });
    }

    /**
     * @notice Gets user's bridge requests
     */
    function getUserBridgeRequests(address user) external view returns (bytes32[] memory) {
        return userBridgeRequests[user];
    }

    /**
     * @notice Gets supported chains
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChainIds;
    }

    /**
     * @notice Gets chain config
     */
    function getChainConfig(uint256 chainId) external view returns (
        string memory chainName,
        address bridgeContract,
        address usdContractAddr,
        bool isActive,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 bridgeFee
    ) {
        ChainConfig storage config = chainConfigs[chainId];
        return (
            config.chainName,
            config.bridgeContract,
            config.usdContract,
            config.isActive,
            config.minBridgeAmount,
            config.maxBridgeAmount,
            config.dailyLimit,
            config.bridgeFee
        );
    }

    /**
     * @notice Calculates bridge fee
     */
    function calculateBridgeFee(uint256 destinationChain, uint256 amount) external view returns (uint256 fee, uint256 netAmount) {
        ChainConfig storage config = chainConfigs[destinationChain];
        fee = (amount * config.bridgeFee) / 10000;
        netAmount = amount - fee;
    }

    /**
     * @notice Gets bridge statistics
     */
    function getStatistics() external view returns (
        uint256 _totalBridgedOut,
        uint256 _totalBridgedIn,
        uint256 _totalFeesCollected,
        uint256 _totalRequests,
        uint256 _pendingRequests
    ) {
        uint256 pending = 0;
        for (uint256 i = 0; i < bridgeRequestIds.length; i++) {
            if (bridgeRequests[bridgeRequestIds[i]].status == BridgeStatus.PENDING ||
                bridgeRequests[bridgeRequestIds[i]].status == BridgeStatus.PROCESSING) {
                pending++;
            }
        }
        return (totalBridgedOut, totalBridgedIn, totalFeesCollected, bridgeRequestIds.length, pending);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Configures a chain for bridging
     */
    function configureChain(
        uint256 chainId,
        string calldata chainName,
        address bridgeContract,
        address usdContractAddr,
        bool isActive,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 bridgeFee,
        uint256 confirmations
    ) external onlyRole(BRIDGE_OPERATOR_ROLE) {
        // Add to supported chains if new
        bool exists = false;
        for (uint256 i = 0; i < supportedChainIds.length; i++) {
            if (supportedChainIds[i] == chainId) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            supportedChainIds.push(chainId);
        }
        
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            chainName: chainName,
            bridgeContract: bridgeContract,
            usdContract: usdContractAddr,
            isActive: isActive,
            minBridgeAmount: minAmount,
            maxBridgeAmount: maxAmount,
            dailyLimit: dailyLimit,
            dailyBridged: 0,
            lastResetDay: block.timestamp / 1 days,
            bridgeFee: bridgeFee,
            confirmationsRequired: confirmations
        });
        
        emit ChainConfigured(chainId, chainName, bridgeContract, usdContractAddr, isActive);
    }

    /**
     * @notice Updates bridge fee for a chain
     */
    function updateBridgeFee(uint256 chainId, uint256 newFee) external onlyRole(FEE_MANAGER_ROLE) {
        require(newFee <= 500, "Fee too high"); // Max 5%
        uint256 oldFee = chainConfigs[chainId].bridgeFee;
        chainConfigs[chainId].bridgeFee = newFee;
        emit FeeUpdated(chainId, oldFee, newFee);
    }

    /**
     * @notice Sets fee collector
     */
    function setFeeCollector(address _feeCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeCollector == address(0)) revert InvalidAddress();
        feeCollector = _feeCollector;
    }

    /**
     * @notice Collects accumulated fees
     */
    function collectFees() external onlyRole(FEE_MANAGER_ROLE) {
        uint256 balance = IERC20(usdContract).balanceOf(address(this));
        uint256 lockedAmount = totalBridgedOut - totalBridgedIn; // Approximate locked amount
        uint256 availableFees = balance > lockedAmount ? balance - lockedAmount : 0;
        
        if (availableFees > 0) {
            IERC20(usdContract).safeTransfer(feeCollector, availableFees);
            emit FeesCollected(feeCollector, availableFees, block.timestamp);
        }
    }

    /**
     * @notice Sets minimum confirmations
     */
    function setMinConfirmations(uint256 _minConfirmations) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_minConfirmations >= 1 && _minConfirmations <= 10, "Invalid confirmations");
        minConfirmations = _minConfirmations;
    }

    /**
     * @notice Pauses the bridge
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses the bridge
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Checks and updates daily limit
     */
    function _checkAndUpdateDailyLimit(uint256 chainId, uint256 amount) internal {
        ChainConfig storage config = chainConfigs[chainId];
        uint256 currentDay = block.timestamp / 1 days;
        
        // Reset if new day
        if (currentDay > config.lastResetDay) {
            config.dailyBridged = 0;
            config.lastResetDay = currentDay;
        }
        
        // Check limit
        if (config.dailyBridged + amount > config.dailyLimit) revert DailyLimitExceeded();
        
        // Update
        config.dailyBridged += amount;
    }

    /**
     * @notice Initializes supported chains
     */
    function _initializeSupportedChains() internal {
        // LemonChain (Primary)
        _addDefaultChain(CHAIN_LEMONCHAIN, "LemonChain", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 10); // 0.1% fee
        
        // Ethereum
        _addDefaultChain(CHAIN_ETHEREUM, "Ethereum", 1000 * 1e6, 10_000_000 * 1e6, 50_000_000 * 1e6, 25); // 0.25% fee
        
        // Polygon
        _addDefaultChain(CHAIN_POLYGON, "Polygon", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 10);
        
        // Arbitrum
        _addDefaultChain(CHAIN_ARBITRUM, "Arbitrum", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 10);
        
        // Optimism
        _addDefaultChain(CHAIN_OPTIMISM, "Optimism", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 10);
        
        // BSC
        _addDefaultChain(CHAIN_BSC, "BNB Smart Chain", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 15);
        
        // Avalanche
        _addDefaultChain(CHAIN_AVALANCHE, "Avalanche", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 15);
        
        // Base
        _addDefaultChain(CHAIN_BASE, "Base", 100 * 1e6, 10_000_000 * 1e6, 100_000_000 * 1e6, 10);
    }

    function _addDefaultChain(
        uint256 chainId,
        string memory chainName,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 fee
    ) internal {
        supportedChainIds.push(chainId);
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            chainName: chainName,
            bridgeContract: address(0), // To be set later
            usdContract: address(0),     // To be set later
            isActive: chainId == currentChainId, // Only current chain active by default
            minBridgeAmount: minAmount,
            maxBridgeAmount: maxAmount,
            dailyLimit: dailyLimit,
            dailyBridged: 0,
            lastResetDay: block.timestamp / 1 days,
            bridgeFee: fee,
            confirmationsRequired: 3
        });
    }
}
