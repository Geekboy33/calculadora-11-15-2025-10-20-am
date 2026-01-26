// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CustodyVault - DCB Treasury Certification Platform
 * @notice Individual custody vault for bank deposits
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract CustodyVault is AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    bytes32 public bankId;
    address public usdToken;
    address public factory;
    
    uint256 public totalDeposited;
    uint256 public totalLocked;
    uint256 public totalWithdrawn;
    
    struct Deposit {
        uint256 amount;
        uint256 timestamp;
        string depositReference;
    }
    
    Deposit[] public deposits;
    
    event Deposited(uint256 indexed depositId, uint256 amount, string depositReference);
    event Locked(uint256 amount, bytes32 lockId);
    event Unlocked(uint256 amount, bytes32 lockId);
    event Withdrawn(address indexed to, uint256 amount);
    
    constructor(bytes32 _bankId, address _usdToken, address _admin) {
        bankId = _bankId;
        usdToken = _usdToken;
        factory = msg.sender;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }
    
    function deposit(uint256 amount, string calldata depositRef) external onlyRole(OPERATOR_ROLE) {
        require(amount > 0, "CustodyVault: zero amount");
        
        IERC20(usdToken).safeTransferFrom(msg.sender, address(this), amount);
        
        deposits.push(Deposit({
            amount: amount,
            timestamp: block.timestamp,
            depositReference: depositRef
        }));
        
        totalDeposited += amount;
        
        emit Deposited(deposits.length - 1, amount, depositRef);
    }
    
    function lock(uint256 amount, bytes32 lockId) external onlyRole(OPERATOR_ROLE) {
        require(getAvailableBalance() >= amount, "CustodyVault: insufficient available balance");
        totalLocked += amount;
        emit Locked(amount, lockId);
    }
    
    function unlock(uint256 amount, bytes32 lockId) external onlyRole(OPERATOR_ROLE) {
        require(totalLocked >= amount, "CustodyVault: insufficient locked balance");
        totalLocked -= amount;
        emit Unlocked(amount, lockId);
    }
    
    function withdraw(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(getAvailableBalance() >= amount, "CustodyVault: insufficient available balance");
        
        IERC20(usdToken).safeTransfer(to, amount);
        totalWithdrawn += amount;
        
        emit Withdrawn(to, amount);
    }
    
    function getAvailableBalance() public view returns (uint256) {
        uint256 currentBalance = IERC20(usdToken).balanceOf(address(this));
        if (currentBalance <= totalLocked) return 0;
        return currentBalance - totalLocked;
    }
    
    function getTotalBalance() external view returns (uint256) {
        return IERC20(usdToken).balanceOf(address(this));
    }
    
    function getLockedBalance() external view returns (uint256) {
        return totalLocked;
    }
    
    function getDepositCount() external view returns (uint256) {
        return deposits.length;
    }
    
    function getDeposit(uint256 index) external view returns (Deposit memory) {
        return deposits[index];
    }
}

/**
 * @title CustodyFactory - DCB Treasury Certification Platform
 * @notice Factory for creating custody vaults
 */
contract CustodyFactory is AccessControl {
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    
    address public usdToken;
    address public bankRegistry;
    
    mapping(bytes32 => address[]) public bankVaults;
    address[] public allVaults;
    
    event VaultCreated(bytes32 indexed bankId, address vault, uint256 vaultIndex);
    
    constructor(address _usdToken, address _bankRegistry) {
        usdToken = _usdToken;
        bankRegistry = _bankRegistry;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FACTORY_ROLE, msg.sender);
    }
    
    function createVault(bytes32 bankId) external onlyRole(FACTORY_ROLE) returns (address) {
        CustodyVault vault = new CustodyVault(bankId, usdToken, msg.sender);
        
        bankVaults[bankId].push(address(vault));
        allVaults.push(address(vault));
        
        emit VaultCreated(bankId, address(vault), bankVaults[bankId].length - 1);
        
        return address(vault);
    }
    
    function getBankVaults(bytes32 bankId) external view returns (address[] memory) {
        return bankVaults[bankId];
    }
    
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }
    
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }
}
