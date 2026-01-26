// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleUSD - DCB Treasury Certification Platform
 * @notice Simplified ERC-20 token for LemonChain compatibility
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 */
contract SimpleUSD {
    string public name = "DCB USD";
    string public symbol = "USD";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public admin;
    mapping(address => bool) public minters;
    mapping(address => bool) public whitelist;
    bool public whitelistEnabled;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event WhitelistUpdated(address indexed account, bool status);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "USD: not admin");
        _;
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == admin, "USD: not minter");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        minters[msg.sender] = true;
        whitelist[msg.sender] = true;
        whitelistEnabled = false;
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "USD: insufficient balance");
        if (whitelistEnabled) {
            require(whitelist[msg.sender] && whitelist[to], "USD: not whitelisted");
        }
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
        require(balanceOf[from] >= value, "USD: insufficient balance");
        require(allowance[from][msg.sender] >= value, "USD: insufficient allowance");
        if (whitelistEnabled) {
            require(whitelist[from] && whitelist[to], "USD: not whitelisted");
        }
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
    
    function mint(address to, uint256 amount) external onlyMinter {
        if (whitelistEnabled) {
            require(whitelist[to], "USD: recipient not whitelisted");
        }
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "USD: insufficient balance");
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function addMinter(address minter) external onlyAdmin {
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    function removeMinter(address minter) external onlyAdmin {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    function setWhitelist(address account, bool status) external onlyAdmin {
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    function toggleWhitelist(bool enabled) external onlyAdmin {
        whitelistEnabled = enabled;
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
