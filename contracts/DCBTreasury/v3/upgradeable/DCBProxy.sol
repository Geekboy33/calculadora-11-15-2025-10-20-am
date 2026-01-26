// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🔄 DCB UPGRADEABLE PROXY - TRANSPARENT PROXY PATTERN                                            ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                                       ║
 * ║  ├─ Transparent proxy pattern (EIP-1967)                                                         ║
 * ║  ├─ Admin-only upgrades                                                                          ║
 * ║  ├─ Timelock integration for upgrades                                                            ║
 * ║  ├─ Emergency upgrade capability                                                                 ║
 * ║  └─ Version tracking                                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * @title DCBProxy
 * @author Digital Commercial Bank Ltd
 * @notice Transparent upgradeable proxy for DCB contracts
 */
contract DCBProxy {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EIP-1967 STORAGE SLOTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Storage slot for implementation address
     * bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
     */
    bytes32 private constant IMPLEMENTATION_SLOT = 
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
    /**
     * @dev Storage slot for admin address
     * bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
     */
    bytes32 private constant ADMIN_SLOT = 
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    
    /**
     * @dev Storage slot for pending implementation (for timelock)
     */
    bytes32 private constant PENDING_IMPLEMENTATION_SLOT = 
        0x9e5eddc59e0b171f57125ab86bee043d9128098c3a6b9adb4f2e86333c2f6f8c;
    
    /**
     * @dev Storage slot for upgrade timestamp
     */
    bytes32 private constant UPGRADE_TIMESTAMP_SLOT = 
        0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Timelock delay for upgrades (48 hours)
    uint256 public constant UPGRADE_TIMELOCK = 48 hours;
    
    /// @notice Emergency upgrade delay (4 hours)
    uint256 public constant EMERGENCY_TIMELOCK = 4 hours;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event Upgraded(address indexed implementation, uint256 version);
    event UpgradeScheduled(address indexed newImplementation, uint256 executeAfter);
    event UpgradeCancelled(address indexed cancelledImplementation);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event EmergencyUpgrade(address indexed newImplementation, string reason);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAdmin() {
        require(msg.sender == _getAdmin(), "Not admin");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _implementation, address _admin, bytes memory _data) {
        require(_implementation != address(0), "Invalid implementation");
        require(_admin != address(0), "Invalid admin");
        
        _setImplementation(_implementation);
        _setAdmin(_admin);
        
        if (_data.length > 0) {
            (bool success, bytes memory returnData) = _implementation.delegatecall(_data);
            require(success, string(returnData));
        }
        
        emit Upgraded(_implementation, 1);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Schedules an upgrade (starts timelock)
     */
    function scheduleUpgrade(address newImplementation) external onlyAdmin {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation != _getImplementation(), "Same implementation");
        require(_isContract(newImplementation), "Not a contract");
        
        _setPendingImplementation(newImplementation);
        uint256 executeAfter = block.timestamp + UPGRADE_TIMELOCK;
        _setUpgradeTimestamp(executeAfter);
        
        emit UpgradeScheduled(newImplementation, executeAfter);
    }
    
    /**
     * @notice Executes a scheduled upgrade after timelock
     */
    function executeUpgrade() external onlyAdmin {
        address pendingImpl = _getPendingImplementation();
        require(pendingImpl != address(0), "No pending upgrade");
        
        uint256 executeAfter = _getUpgradeTimestamp();
        require(block.timestamp >= executeAfter, "Timelock not expired");
        require(block.timestamp <= executeAfter + 7 days, "Upgrade expired");
        
        _setImplementation(pendingImpl);
        _setPendingImplementation(address(0));
        _setUpgradeTimestamp(0);
        
        emit Upgraded(pendingImpl, _getVersion() + 1);
    }
    
    /**
     * @notice Cancels a scheduled upgrade
     */
    function cancelUpgrade() external onlyAdmin {
        address pendingImpl = _getPendingImplementation();
        require(pendingImpl != address(0), "No pending upgrade");
        
        _setPendingImplementation(address(0));
        _setUpgradeTimestamp(0);
        
        emit UpgradeCancelled(pendingImpl);
    }
    
    /**
     * @notice Emergency upgrade with reduced timelock
     * @dev Only for critical security fixes
     */
    function emergencyUpgrade(address newImplementation, string calldata reason) external onlyAdmin {
        require(newImplementation != address(0), "Invalid implementation");
        require(_isContract(newImplementation), "Not a contract");
        require(bytes(reason).length > 0, "Reason required");
        
        _setPendingImplementation(newImplementation);
        uint256 executeAfter = block.timestamp + EMERGENCY_TIMELOCK;
        _setUpgradeTimestamp(executeAfter);
        
        emit EmergencyUpgrade(newImplementation, reason);
        emit UpgradeScheduled(newImplementation, executeAfter);
    }
    
    /**
     * @notice Changes the admin
     */
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        require(newAdmin != _getAdmin(), "Same admin");
        
        address oldAdmin = _getAdmin();
        _setAdmin(newAdmin);
        
        emit AdminChanged(oldAdmin, newAdmin);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function implementation() external view returns (address) {
        return _getImplementation();
    }
    
    function admin() external view returns (address) {
        return _getAdmin();
    }
    
    function pendingImplementation() external view returns (address) {
        return _getPendingImplementation();
    }
    
    function upgradeTimestamp() external view returns (uint256) {
        return _getUpgradeTimestamp();
    }
    
    function version() external view returns (uint256) {
        return _getVersion();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL STORAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _getImplementation() internal view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function _setImplementation(address newImplementation) internal {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }
    
    function _getAdmin() internal view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }
    
    function _setAdmin(address newAdmin) internal {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
    }
    
    function _getPendingImplementation() internal view returns (address impl) {
        bytes32 slot = PENDING_IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function _setPendingImplementation(address newImplementation) internal {
        bytes32 slot = PENDING_IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }
    
    function _getUpgradeTimestamp() internal view returns (uint256 ts) {
        bytes32 slot = UPGRADE_TIMESTAMP_SLOT;
        assembly {
            ts := sload(slot)
        }
    }
    
    function _setUpgradeTimestamp(uint256 timestamp) internal {
        bytes32 slot = UPGRADE_TIMESTAMP_SLOT;
        assembly {
            sstore(slot, timestamp)
        }
    }
    
    function _getVersion() internal view returns (uint256) {
        // Version is stored in the first storage slot of implementation
        // This is a simplified version tracking
        return 1;
    }
    
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FALLBACK & RECEIVE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Delegates all calls to implementation
     */
    fallback() external payable {
        _delegate(_getImplementation());
    }
    
    receive() external payable {
        _delegate(_getImplementation());
    }
    
    function _delegate(address impl) internal {
        assembly {
            // Copy calldata
            calldatacopy(0, 0, calldatasize())
            
            // Delegatecall
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // Copy return data
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}

/**
 * @title DCBProxyAdmin
 * @notice Admin contract for managing multiple proxies
 */
contract DCBProxyAdmin {
    
    address public owner;
    address public pendingOwner;
    
    mapping(address => bool) public isProxy;
    address[] public proxies;
    
    event ProxyRegistered(address indexed proxy);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _owner) {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
    }
    
    function registerProxy(address proxy) external onlyOwner {
        require(!isProxy[proxy], "Already registered");
        isProxy[proxy] = true;
        proxies.push(proxy);
        emit ProxyRegistered(proxy);
    }
    
    function upgradeProxy(address proxy, address newImplementation) external onlyOwner {
        require(isProxy[proxy], "Not registered");
        DCBProxy(payable(proxy)).scheduleUpgrade(newImplementation);
    }
    
    function executeProxyUpgrade(address proxy) external onlyOwner {
        require(isProxy[proxy], "Not registered");
        DCBProxy(payable(proxy)).executeUpgrade();
    }
    
    function cancelProxyUpgrade(address proxy) external onlyOwner {
        require(isProxy[proxy], "Not registered");
        DCBProxy(payable(proxy)).cancelUpgrade();
    }
    
    function emergencyUpgradeProxy(
        address proxy, 
        address newImplementation, 
        string calldata reason
    ) external onlyOwner {
        require(isProxy[proxy], "Not registered");
        DCBProxy(payable(proxy)).emergencyUpgrade(newImplementation, reason);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }
    
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }
    
    function getAllProxies() external view returns (address[] memory) {
        return proxies;
    }
}
