// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleLUSD - Lemon USD Stablecoin
 * @notice Simplified stablecoin for LemonChain
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract SimpleLUSD {
    string public name = "Lemon USD";
    string public symbol = "LUSD";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public admin;
    address public issuerController;
    mapping(address => bool) public minters;
    
    uint256 public totalMintedFromLocks;
    uint256 public totalBurned;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MintedFromLock(address indexed to, uint256 amount, bytes32 indexed lockId);
    event BurnedForRedemption(address indexed from, uint256 amount, string redemptionRef);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "LUSD: not admin");
        _;
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == admin || msg.sender == issuerController, "LUSD: not minter");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        minters[msg.sender] = true;
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "LUSD: insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "LUSD: insufficient balance");
        require(allowance[from][msg.sender] >= value, "LUSD: insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
    
    function setIssuerController(address _controller) external onlyAdmin {
        issuerController = _controller;
        minters[_controller] = true;
    }
    
    function addMinter(address minter) external onlyAdmin {
        minters[minter] = true;
    }
    
    function removeMinter(address minter) external onlyAdmin {
        minters[minter] = false;
    }
    
    function mintFromLock(address to, uint256 amount, bytes32 lockId) external onlyMinter {
        totalSupply += amount;
        balanceOf[to] += amount;
        totalMintedFromLocks += amount;
        emit Transfer(address(0), to, amount);
        emit MintedFromLock(to, amount, lockId);
    }
    
    function burnForRedemption(uint256 amount, string calldata redemptionRef) external {
        require(balanceOf[msg.sender] >= amount, "LUSD: insufficient balance");
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        totalBurned += amount;
        emit Transfer(msg.sender, address(0), amount);
        emit BurnedForRedemption(msg.sender, amount, redemptionRef);
    }
    
    function getCirculatingSupply() external view returns (uint256) {
        return totalSupply;
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
