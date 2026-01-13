// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title USDToken
 * @dev ERC-20 token representing USD with 6 decimals (like USDC)
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles
 * - MINTER_ROLE: Can mint new tokens (assigned to BridgeMinter)
 * - BURNER_ROLE: Can burn tokens
 */
contract USDToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant _decimals = 6;

    event Mint(address indexed to, uint256 amount, address indexed minter);
    event Burn(address indexed from, uint256 amount, address indexed burner);

    constructor(address admin) ERC20("DAES USD", "USD") {
        require(admin != address(0), "USDToken: admin is zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    /**
     * @dev Returns the number of decimals (6, like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "USDToken: mint to zero address");
        require(amount > 0, "USDToken: amount is zero");
        
        _mint(to, amount);
        emit Mint(to, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burn(amount);
        emit Burn(msg.sender, amount, msg.sender);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        emit Burn(account, amount, msg.sender);
    }
}
















