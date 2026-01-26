// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILockBox {
    function consumeLock(bytes32 lockId, uint256 lusdAmount) external;
    function getLock(bytes32 lockId) external view returns (
        bytes32, bytes32, address, uint256, uint256, uint256, uint256, string memory, uint8, address, address, uint256
    );
}

interface ILUSD {
    function mintFromLock(address to, uint256 amount, bytes32 lockId) external;
}

interface ICustodyVault {
    function lock(uint256 amount, bytes32 lockId) external;
}

/**
 * @title IssuerController - DCB Treasury Certification Platform
 * @notice Controls LUSD issuance from consumed locks
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract IssuerController is AccessControl {
    bytes32 public constant ISSUER_OPERATOR_ROLE = keccak256("ISSUER_OPERATOR_ROLE");
    
    address public lockBox;
    address public lusd;
    address public reserveVault;
    
    uint256 public totalIssued;
    uint256 public issuanceFeeRate; // basis points (100 = 1%)
    
    struct Issuance {
        bytes32 lockId;
        address recipient;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
    }
    
    Issuance[] public issuances;
    
    event LUSDIssued(bytes32 indexed lockId, address indexed recipient, uint256 amount, uint256 fee);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    
    constructor(address _lockBox, address _lusd) {
        lockBox = _lockBox;
        lusd = _lusd;
        issuanceFeeRate = 0; // 0% fee initially
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_OPERATOR_ROLE, msg.sender);
    }
    
    function setReserveVault(address _vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reserveVault = _vault;
    }
    
    function setFeeRate(uint256 _rate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rate <= 1000, "IssuerController: fee too high"); // Max 10%
        uint256 oldRate = issuanceFeeRate;
        issuanceFeeRate = _rate;
        emit FeeRateUpdated(oldRate, _rate);
    }
    
    function issueLUSD(
        bytes32 lockId,
        address recipient,
        uint256 amount
    ) external onlyRole(ISSUER_OPERATOR_ROLE) {
        require(recipient != address(0), "IssuerController: invalid recipient");
        require(amount > 0, "IssuerController: zero amount");
        
        // Calculate fee
        uint256 fee = (amount * issuanceFeeRate) / 10000;
        uint256 netAmount = amount - fee;
        
        // Consume the lock
        ILockBox(lockBox).consumeLock(lockId, amount);
        
        // Mint LUSD to recipient
        ILUSD(lusd).mintFromLock(recipient, netAmount, lockId);
        
        // Mint fee to reserve vault if applicable
        if (fee > 0 && reserveVault != address(0)) {
            ILUSD(lusd).mintFromLock(reserveVault, fee, lockId);
        }
        
        issuances.push(Issuance({
            lockId: lockId,
            recipient: recipient,
            amount: netAmount,
            fee: fee,
            timestamp: block.timestamp
        }));
        
        totalIssued += amount;
        
        emit LUSDIssued(lockId, recipient, netAmount, fee);
    }
    
    function getIssuanceCount() external view returns (uint256) {
        return issuances.length;
    }
    
    function getIssuance(uint256 index) external view returns (Issuance memory) {
        return issuances[index];
    }
    
    function getAllIssuances() external view returns (Issuance[] memory) {
        return issuances;
    }
}
