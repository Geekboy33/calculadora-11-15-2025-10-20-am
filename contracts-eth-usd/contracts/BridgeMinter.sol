// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./USDToken.sol";
import "./SettlementRegistry.sol";

/**
 * @title BridgeMinter
 * @dev Mints USD tokens based on EIP-712 signed authorizations from DAES
 * 
 * Flow:
 * 1. DAES backend creates holdId and signs MintAuthorization
 * 2. Operator calls mintWithAuthorization with the signature
 * 3. Contract verifies signature, mints tokens, updates registry
 * 
 * EIP-712 Domain:
 * - name: "DAES USD BridgeMinter"
 * - version: "1"
 * - chainId: 1 (mainnet)
 * - verifyingContract: this contract
 */
contract BridgeMinter is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant DAES_SIGNER_ROLE = keccak256("DAES_SIGNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // EIP-712 TypeHash for MintAuthorization
    bytes32 public constant MINT_AUTHORIZATION_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 holdId,uint256 amount,address beneficiary,bytes32 iso20022Hash,bytes3 iso4217,uint256 deadline,uint256 nonce)"
    );

    USDToken public immutable usdToken;
    SettlementRegistry public immutable registry;

    // Prevent replay attacks
    mapping(bytes32 => bool) public usedHolds;
    mapping(address => uint256) public nonces;

    // Events
    event Minted(
        bytes32 indexed holdId,
        uint256 amount,
        address indexed beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        address indexed signer,
        uint256 timestamp
    );

    event HoldUsed(bytes32 indexed holdId, address indexed operator);

    struct MintAuthorization {
        bytes32 holdId;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 deadline;
        uint256 nonce;
    }

    constructor(
        address _usdToken,
        address _registry,
        address admin
    ) EIP712("DAES USD BridgeMinter", "1") {
        require(_usdToken != address(0), "BridgeMinter: token is zero");
        require(_registry != address(0), "BridgeMinter: registry is zero");
        require(admin != address(0), "BridgeMinter: admin is zero");

        usdToken = USDToken(_usdToken);
        registry = SettlementRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Mint USD tokens with EIP-712 authorization
     * @param auth The mint authorization struct
     * @param signature EIP-712 signature from DAES_SIGNER
     */
    function mintWithAuthorization(
        MintAuthorization calldata auth,
        bytes calldata signature
    ) external onlyRole(OPERATOR_ROLE) returns (bool) {
        // Validate deadline
        require(block.timestamp <= auth.deadline, "BridgeMinter: expired");

        // Validate holdId not used
        require(!usedHolds[auth.holdId], "BridgeMinter: holdId already used");

        // Validate amount
        require(auth.amount > 0, "BridgeMinter: amount is zero");

        // Validate beneficiary
        require(auth.beneficiary != address(0), "BridgeMinter: beneficiary is zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AUTHORIZATION_TYPEHASH,
                auth.holdId,
                auth.amount,
                auth.beneficiary,
                auth.iso20022Hash,
                auth.iso4217,
                auth.deadline,
                auth.nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(hasRole(DAES_SIGNER_ROLE, signer), "BridgeMinter: invalid signer");

        // Mark holdId as used
        usedHolds[auth.holdId] = true;
        emit HoldUsed(auth.holdId, msg.sender);

        // Create settlement in registry with HOLD status
        registry.createSettlement(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217
        );

        // Mint tokens to beneficiary
        usdToken.mint(auth.beneficiary, auth.amount);

        // Update registry to MINTED
        registry.setMinted(auth.holdId, bytes32(uint256(uint160(msg.sender))));

        emit Minted(
            auth.holdId,
            auth.amount,
            auth.beneficiary,
            auth.iso20022Hash,
            auth.iso4217,
            signer,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @dev Check if holdId has been used
     */
    function isHoldUsed(bytes32 holdId) external view returns (bool) {
        return usedHolds[holdId];
    }

    /**
     * @dev Get the EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Get the EIP-712 type hash
     */
    function getMintAuthorizationTypehash() external pure returns (bytes32) {
        return MINT_AUTHORIZATION_TYPEHASH;
    }
}
















