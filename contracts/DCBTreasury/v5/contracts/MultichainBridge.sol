// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                   ║
 * ║    ███╗   ███╗██╗   ██╗██╗  ████████╗██╗ ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗                     ║
 * ║    ████╗ ████║██║   ██║██║  ╚══██╔══╝██║██╔════╝██║  ██║██╔══██╗██║████╗  ██║                     ║
 * ║    ██╔████╔██║██║   ██║██║     ██║   ██║██║     ███████║███████║██║██╔██╗ ██║                     ║
 * ║    ██║╚██╔╝██║██║   ██║██║     ██║   ██║██║     ██╔══██║██╔══██║██║██║╚██╗██║                     ║
 * ║    ██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║╚██████╗██║  ██║██║  ██║██║██║ ╚████║                     ║
 * ║    ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝                     ║
 * ║                                                                                                   ║
 * ║    ██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗                                                   ║
 * ║    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝                                                   ║
 * ║    ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗                                                     ║
 * ║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝                                                     ║
 * ║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗                                                   ║
 * ║    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝                                                   ║
 * ║                                                                                                   ║
 * ║─────────────────────────────────────────────────────────────────────────────────────────────────  ║
 * ║                                                                                                   ║
 * ║                  ╔══════════════════════════════════════════════════════════╗                     ║
 * ║                  ║        DIGITAL COMMERCIAL BANK TREASURY                  ║                     ║
 * ║                  ║           Cross-Chain VUSD Bridge                        ║                     ║
 * ║                  ╚══════════════════════════════════════════════════════════╝                     ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Contract: MultichainBridge                   Network: LemonChain (1006)                          ║
 * ║  Version: 5.0.0                               License: MIT                                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║  SUPPORTED NETWORKS                           MECHANISM                                           ║
 * ║  ──────────────────                           ─────────                                           ║
 * ║  • LemonChain  (1006)   • Arbitrum (42161)   Lock & Mint                                         ║
 * ║  • Ethereum    (1)      • Optimism (10)      Burn & Release                                      ║
 * ║  • BSC         (56)     • Avalanche (43114)                                                      ║
 * ║  • Polygon     (137)    • Base     (8453)    VUSD: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b    ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title MultichainBridge - Cross-Chain VUSD Bridge
 * @author Digital Commercial Bank Ltd
 * @notice Enables VUSD transfers between LemonChain and other networks
 * @dev Implements lock/mint pattern with multi-relayer confirmation
 * @custom:security-contact rwa@digcommbank.com
 * @custom:version 5.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVUSD {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract MultichainBridge is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========================================================================================================
    // CONSTANTS
    // ========================================================================================================

    string public constant VERSION = "5.0.0";
    
    uint256 public constant CHAIN_LEMONCHAIN = 1006;
    uint256 public constant CHAIN_ETHEREUM = 1;
    uint256 public constant CHAIN_BSC = 56;
    uint256 public constant CHAIN_POLYGON = 137;
    uint256 public constant CHAIN_ARBITRUM = 42161;
    uint256 public constant CHAIN_OPTIMISM = 10;
    uint256 public constant CHAIN_AVALANCHE = 43114;
    uint256 public constant CHAIN_BASE = 8453;
    
    address public constant VUSD_CONTRACT = 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b;
    address public constant VUSD_MINTER_WALLET = 0xaccA35529b2FC2041dFb124F83f52120E24377B2;
    
    uint256 public constant MIN_CONFIRMATIONS = 2;
    uint256 public constant MAX_CONFIRMATIONS = 5;

    // ========================================================================================================
    // ROLES
    // ========================================================================================================

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");

    // ========================================================================================================
    // ENUMS
    // ========================================================================================================

    enum TransferStatus {
        PENDING,
        CONFIRMED,
        COMPLETED,
        FAILED,
        REFUNDED
    }

    enum TransferDirection {
        OUTBOUND,
        INBOUND
    }

    // ========================================================================================================
    // STRUCTS
    // ========================================================================================================

    struct ChainConfig {
        uint256 chainId;
        string name;
        bool isActive;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 dailyLimit;
        uint256 dailyUsed;
        uint256 lastResetDay;
        uint256 fee;
        address bridgeContract;
    }

    struct CrossChainTransfer {
        bytes32 transferId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 fee;
        uint256 sourceChain;
        uint256 destChain;
        TransferDirection direction;
        TransferStatus status;
        uint256 confirmations;
        uint256 requiredConfirmations;
        uint256 initiatedAt;
        uint256 completedAt;
        bytes32 sourceTxHash;
        bytes32 destTxHash;
    }

    // ========================================================================================================
    // STATE VARIABLES
    // ========================================================================================================

    IVUSD public vusd;
    
    uint256 public totalLocked;
    uint256 public totalBridged;
    uint256 public totalTransfers;
    uint256 public requiredConfirmations = 2;
    uint256 public bridgeFee = 10; // 0.1% (basis points)
    address public feeRecipient;

    // ========================================================================================================
    // MAPPINGS
    // ========================================================================================================

    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(bytes32 => CrossChainTransfer) public transfers;
    bytes32[] public transferIds;
    mapping(bytes32 => mapping(address => bool)) public relayerConfirmations;
    mapping(bytes32 => address[]) public transferRelayers;
    uint256[] public supportedChainIds;
    mapping(bytes32 => bool) public processedSourceTxs;

    // ========================================================================================================
    // EVENTS
    // ========================================================================================================

    event TransferInitiated(bytes32 indexed transferId, address indexed sender, address indexed recipient, uint256 amount, uint256 sourceChain, uint256 destChain, uint256 timestamp);
    event TransferConfirmed(bytes32 indexed transferId, address indexed relayer, uint256 confirmations, uint256 required, uint256 timestamp);
    event TransferCompleted(bytes32 indexed transferId, address indexed recipient, uint256 amount, bytes32 destTxHash, uint256 timestamp);
    event TransferFailed(bytes32 indexed transferId, string reason, uint256 timestamp);
    event TransferRefunded(bytes32 indexed transferId, address indexed recipient, uint256 amount, uint256 timestamp);
    event ChainConfigured(uint256 indexed chainId, string name, bool isActive, uint256 minAmount, uint256 maxAmount);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event RequiredConfirmationsUpdated(uint256 oldValue, uint256 newValue);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);

    // ========================================================================================================
    // ERRORS
    // ========================================================================================================

    error InvalidAmount();
    error InvalidChain();
    error ChainNotActive();
    error DailyLimitExceeded();
    error TransferNotFound();
    error TransferNotPending();
    error AlreadyConfirmed();
    error InsufficientConfirmations();
    error TransferAlreadyProcessed();
    error InvalidRecipient();

    // ========================================================================================================
    // CONSTRUCTOR
    // ========================================================================================================

    constructor(address _admin, address _feeRecipient) {
        require(_admin != address(0), "Invalid admin");
        require(block.chainid == CHAIN_LEMONCHAIN, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(RELAYER_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
        _grantRole(BRIDGE_OPERATOR_ROLE, _admin);
        
        vusd = IVUSD(VUSD_CONTRACT);
        feeRecipient = _feeRecipient;
        
        _initializeChains();
    }

    // ========================================================================================================
    // BRIDGE FUNCTIONS - OUTBOUND (Lock on LemonChain)
    // ========================================================================================================

    function bridgeToChain(uint256 destChain, address recipient, uint256 amount) external nonReentrant whenNotPaused returns (bytes32 transferId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        
        ChainConfig storage config = chainConfigs[destChain];
        if (!config.isActive) revert ChainNotActive();
        if (amount < config.minAmount || amount > config.maxAmount) revert InvalidAmount();
        
        // Reset daily limit if new day
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > config.lastResetDay) {
            config.lastResetDay = currentDay;
            config.dailyUsed = 0;
        }
        if (config.dailyUsed + amount > config.dailyLimit) revert DailyLimitExceeded();
        
        uint256 fee = (amount * bridgeFee) / 10000;
        uint256 netAmount = amount - fee;
        
        transferId = keccak256(abi.encodePacked(
            msg.sender, recipient, amount, CHAIN_LEMONCHAIN, destChain, block.timestamp, totalTransfers
        ));
        
        // Effects before interactions
        transfers[transferId] = CrossChainTransfer({
            transferId: transferId,
            sender: msg.sender,
            recipient: recipient,
            amount: netAmount,
            fee: fee,
            sourceChain: CHAIN_LEMONCHAIN,
            destChain: destChain,
            direction: TransferDirection.OUTBOUND,
            status: TransferStatus.PENDING,
            confirmations: 0,
            requiredConfirmations: requiredConfirmations,
            initiatedAt: block.timestamp,
            completedAt: 0,
            sourceTxHash: bytes32(0),
            destTxHash: bytes32(0)
        });
        
        transferIds.push(transferId);
        totalTransfers++;
        config.dailyUsed += amount;
        totalLocked += netAmount;
        
        // Interactions
        IERC20(VUSD_CONTRACT).safeTransferFrom(msg.sender, address(this), amount);
        if (fee > 0) {
            IERC20(VUSD_CONTRACT).safeTransfer(feeRecipient, fee);
        }
        
        emit TransferInitiated(transferId, msg.sender, recipient, netAmount, CHAIN_LEMONCHAIN, destChain, block.timestamp);
        return transferId;
    }

    // ========================================================================================================
    // BRIDGE FUNCTIONS - INBOUND (Mint on LemonChain)
    // ========================================================================================================

    function confirmInboundTransfer(
        bytes32 transferId,
        address sender,
        address recipient,
        uint256 amount,
        uint256 sourceChain,
        bytes32 sourceTxHash
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused {
        if (processedSourceTxs[sourceTxHash]) revert TransferAlreadyProcessed();
        if (relayerConfirmations[transferId][msg.sender]) revert AlreadyConfirmed();
        
        CrossChainTransfer storage transfer = transfers[transferId];
        
        if (transfer.initiatedAt == 0) {
            // Create new inbound transfer
            transfers[transferId] = CrossChainTransfer({
                transferId: transferId,
                sender: sender,
                recipient: recipient,
                amount: amount,
                fee: 0,
                sourceChain: sourceChain,
                destChain: CHAIN_LEMONCHAIN,
                direction: TransferDirection.INBOUND,
                status: TransferStatus.PENDING,
                confirmations: 0,
                requiredConfirmations: requiredConfirmations,
                initiatedAt: block.timestamp,
                completedAt: 0,
                sourceTxHash: sourceTxHash,
                destTxHash: bytes32(0)
            });
            transferIds.push(transferId);
            totalTransfers++;
            transfer = transfers[transferId];
        }
        
        if (transfer.status != TransferStatus.PENDING) revert TransferNotPending();
        
        relayerConfirmations[transferId][msg.sender] = true;
        transferRelayers[transferId].push(msg.sender);
        transfer.confirmations++;
        
        emit TransferConfirmed(transferId, msg.sender, transfer.confirmations, transfer.requiredConfirmations, block.timestamp);
        
        if (transfer.confirmations >= transfer.requiredConfirmations) {
            _completeInboundTransfer(transferId);
        }
    }

    function _completeInboundTransfer(bytes32 transferId) internal {
        CrossChainTransfer storage transfer = transfers[transferId];
        
        transfer.status = TransferStatus.COMPLETED;
        transfer.completedAt = block.timestamp;
        processedSourceTxs[transfer.sourceTxHash] = true;
        totalBridged += transfer.amount;
        
        // Mint VUSD to recipient
        vusd.mint(transfer.recipient, transfer.amount);
        
        emit TransferCompleted(transferId, transfer.recipient, transfer.amount, bytes32(0), block.timestamp);
    }

    // ========================================================================================================
    // RELEASE FUNCTIONS (After confirmation on destination chain)
    // ========================================================================================================

    function confirmOutboundCompletion(bytes32 transferId, bytes32 destTxHash) external onlyRole(RELAYER_ROLE) nonReentrant {
        CrossChainTransfer storage transfer = transfers[transferId];
        if (transfer.initiatedAt == 0) revert TransferNotFound();
        if (transfer.direction != TransferDirection.OUTBOUND) revert TransferNotPending();
        if (relayerConfirmations[transferId][msg.sender]) revert AlreadyConfirmed();
        
        relayerConfirmations[transferId][msg.sender] = true;
        transferRelayers[transferId].push(msg.sender);
        transfer.confirmations++;
        
        emit TransferConfirmed(transferId, msg.sender, transfer.confirmations, transfer.requiredConfirmations, block.timestamp);
        
        if (transfer.confirmations >= transfer.requiredConfirmations && transfer.status == TransferStatus.PENDING) {
            transfer.status = TransferStatus.COMPLETED;
            transfer.completedAt = block.timestamp;
            transfer.destTxHash = destTxHash;
            totalBridged += transfer.amount;
            
            emit TransferCompleted(transferId, transfer.recipient, transfer.amount, destTxHash, block.timestamp);
        }
    }

    // ========================================================================================================
    // REFUND FUNCTIONS
    // ========================================================================================================

    function refundTransfer(bytes32 transferId) external onlyRole(BRIDGE_OPERATOR_ROLE) nonReentrant {
        CrossChainTransfer storage transfer = transfers[transferId];
        if (transfer.initiatedAt == 0) revert TransferNotFound();
        if (transfer.status != TransferStatus.PENDING && transfer.status != TransferStatus.FAILED) revert TransferNotPending();
        if (transfer.direction != TransferDirection.OUTBOUND) revert TransferNotPending();
        
        transfer.status = TransferStatus.REFUNDED;
        totalLocked -= transfer.amount;
        
        IERC20(VUSD_CONTRACT).safeTransfer(transfer.sender, transfer.amount);
        
        emit TransferRefunded(transferId, transfer.sender, transfer.amount, block.timestamp);
    }

    // ========================================================================================================
    // VIEW FUNCTIONS
    // ========================================================================================================

    function getTransfer(bytes32 transferId) external view returns (CrossChainTransfer memory) {
        return transfers[transferId];
    }

    function getChainConfig(uint256 chainId) external view returns (ChainConfig memory) {
        return chainConfigs[chainId];
    }

    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChainIds;
    }

    function getAllTransferIds() external view returns (bytes32[] memory) {
        return transferIds;
    }

    function getTransfersByStatus(TransferStatus status, uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        require(limit <= 100, "Limit too high");
        
        uint256 count = 0;
        uint256 matchedCount = 0;
        bytes32[] memory tempResults = new bytes32[](limit);
        
        for (uint256 i = 0; i < transferIds.length && matchedCount < limit; i++) {
            if (transfers[transferIds[i]].status == status) {
                if (count >= offset) {
                    tempResults[matchedCount] = transferIds[i];
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

    function getStatistics() external view returns (uint256, uint256, uint256) {
        return (totalLocked, totalBridged, totalTransfers);
    }

    function getTransferRelayers(bytes32 transferId) external view returns (address[] memory) {
        return transferRelayers[transferId];
    }

    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * bridgeFee) / 10000;
    }

    // ========================================================================================================
    // ADMIN FUNCTIONS
    // ========================================================================================================

    function configureChain(
        uint256 chainId,
        string calldata name,
        bool isActive,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 fee,
        address bridgeContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            name: name,
            isActive: isActive,
            minAmount: minAmount,
            maxAmount: maxAmount,
            dailyLimit: dailyLimit,
            dailyUsed: chainConfigs[chainId].dailyUsed,
            lastResetDay: chainConfigs[chainId].lastResetDay,
            fee: fee,
            bridgeContract: bridgeContract
        });
        
        bool found = false;
        for (uint256 i = 0; i < supportedChainIds.length; i++) {
            if (supportedChainIds[i] == chainId) {
                found = true;
                break;
            }
        }
        if (!found) {
            supportedChainIds.push(chainId);
        }
        
        emit ChainConfigured(chainId, name, isActive, minAmount, maxAmount);
    }

    function setChainActive(uint256 chainId, bool isActive) external onlyRole(BRIDGE_OPERATOR_ROLE) {
        chainConfigs[chainId].isActive = isActive;
    }

    function setBridgeFee(uint256 _fee) external onlyRole(FEE_MANAGER_ROLE) {
        require(_fee <= 100, "Fee too high"); // Max 1%
        uint256 oldFee = bridgeFee;
        bridgeFee = _fee;
        emit FeeUpdated(oldFee, _fee);
    }

    function setFeeRecipient(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_recipient != address(0), "Invalid recipient");
        feeRecipient = _recipient;
    }

    function setRequiredConfirmations(uint256 _confirmations) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_confirmations >= MIN_CONFIRMATIONS && _confirmations <= MAX_CONFIRMATIONS, "Invalid confirmations");
        uint256 oldValue = requiredConfirmations;
        requiredConfirmations = _confirmations;
        emit RequiredConfirmationsUpdated(oldValue, _confirmations);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
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

    function _initializeChains() internal {
        uint256 defaultMin = 10 * 1e6;      // 10 VUSD
        uint256 defaultMax = 1_000_000 * 1e6; // 1M VUSD
        uint256 defaultDaily = 10_000_000 * 1e6; // 10M VUSD daily
        
        // Ethereum
        chainConfigs[CHAIN_ETHEREUM] = ChainConfig({
            chainId: CHAIN_ETHEREUM,
            name: "Ethereum",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 15,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_ETHEREUM);
        
        // BSC
        chainConfigs[CHAIN_BSC] = ChainConfig({
            chainId: CHAIN_BSC,
            name: "BNB Smart Chain",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 10,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_BSC);
        
        // Polygon
        chainConfigs[CHAIN_POLYGON] = ChainConfig({
            chainId: CHAIN_POLYGON,
            name: "Polygon",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 5,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_POLYGON);
        
        // Arbitrum
        chainConfigs[CHAIN_ARBITRUM] = ChainConfig({
            chainId: CHAIN_ARBITRUM,
            name: "Arbitrum One",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 5,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_ARBITRUM);
        
        // Optimism
        chainConfigs[CHAIN_OPTIMISM] = ChainConfig({
            chainId: CHAIN_OPTIMISM,
            name: "Optimism",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 5,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_OPTIMISM);
        
        // Avalanche
        chainConfigs[CHAIN_AVALANCHE] = ChainConfig({
            chainId: CHAIN_AVALANCHE,
            name: "Avalanche C-Chain",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 10,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_AVALANCHE);
        
        // Base
        chainConfigs[CHAIN_BASE] = ChainConfig({
            chainId: CHAIN_BASE,
            name: "Base",
            isActive: true,
            minAmount: defaultMin,
            maxAmount: defaultMax,
            dailyLimit: defaultDaily,
            dailyUsed: 0,
            lastResetDay: block.timestamp / 1 days,
            fee: 5,
            bridgeContract: address(0)
        });
        supportedChainIds.push(CHAIN_BASE);
    }
}
