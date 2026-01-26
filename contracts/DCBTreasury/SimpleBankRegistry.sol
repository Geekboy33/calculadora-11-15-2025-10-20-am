// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleBankRegistry - DCB Treasury Certification Platform
 * @notice Simplified Bank Registry for LemonChain
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract SimpleBankRegistry {
    struct Bank {
        bytes32 bankId;
        string name;
        string swiftCode;
        address signer;
        bool active;
        uint256 registeredAt;
    }
    
    address public admin;
    mapping(bytes32 => Bank) public banks;
    mapping(address => bytes32) public signerToBank;
    bytes32[] public bankIds;
    
    event BankRegistered(bytes32 indexed bankId, string name, address signer);
    event BankUpdated(bytes32 indexed bankId, bool active);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "BankRegistry: not admin");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function registerBank(
        string calldata _name,
        string calldata _swiftCode,
        address _signer
    ) external onlyAdmin returns (bytes32) {
        require(_signer != address(0), "BankRegistry: invalid signer");
        require(signerToBank[_signer] == bytes32(0), "BankRegistry: signer already registered");
        
        bytes32 bankId = keccak256(abi.encodePacked(_name, _swiftCode, block.timestamp));
        
        banks[bankId] = Bank({
            bankId: bankId,
            name: _name,
            swiftCode: _swiftCode,
            signer: _signer,
            active: true,
            registeredAt: block.timestamp
        });
        
        signerToBank[_signer] = bankId;
        bankIds.push(bankId);
        
        emit BankRegistered(bankId, _name, _signer);
        return bankId;
    }
    
    function updateBankStatus(bytes32 _bankId, bool _active) external onlyAdmin {
        require(banks[_bankId].bankId != bytes32(0), "BankRegistry: bank not found");
        banks[_bankId].active = _active;
        emit BankUpdated(_bankId, _active);
    }
    
    function getBank(bytes32 _bankId) external view returns (Bank memory) {
        return banks[_bankId];
    }
    
    function getBankCount() external view returns (uint256) {
        return bankIds.length;
    }
    
    function isBankActive(bytes32 _bankId) external view returns (bool) {
        return banks[_bankId].active;
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
