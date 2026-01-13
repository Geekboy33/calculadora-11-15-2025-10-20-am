// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SettlementRegistry
 * @dev On-chain registry for tracking settlement status of DAES operations
 * 
 * Status Flow:
 * NONE -> HOLD -> MINTED -> DELIVERED (success)
 *                       -> FAILED (if swap fails)
 */
contract SettlementRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        NONE,       // 0 - Not registered
        HOLD,       // 1 - Funds held, awaiting mint
        MINTED,     // 2 - Tokens minted
        DELIVERED,  // 3 - Successfully delivered to user
        FAILED      // 4 - Operation failed
    }

    struct Settlement {
        Status status;
        uint256 amount;
        address beneficiary;
        bytes32 iso20022Hash;
        bytes3 iso4217;
        uint256 timestamp;
        bytes32 txRef;
    }

    // holdId => Settlement
    mapping(bytes32 => Settlement) public settlements;

    // Events
    event StatusUpdated(
        bytes32 indexed holdId,
        Status indexed oldStatus,
        Status indexed newStatus,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217,
        uint256 timestamp
    );

    event SettlementCreated(
        bytes32 indexed holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    );

    constructor(address admin) {
        require(admin != address(0), "SettlementRegistry: admin is zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Create a new settlement with HOLD status
     */
    function createSettlement(
        bytes32 holdId,
        uint256 amount,
        address beneficiary,
        bytes32 iso20022Hash,
        bytes3 iso4217
    ) external onlyRole(OPERATOR_ROLE) {
        require(settlements[holdId].status == Status.NONE, "SettlementRegistry: already exists");
        require(amount > 0, "SettlementRegistry: amount is zero");
        require(beneficiary != address(0), "SettlementRegistry: beneficiary is zero");

        settlements[holdId] = Settlement({
            status: Status.HOLD,
            amount: amount,
            beneficiary: beneficiary,
            iso20022Hash: iso20022Hash,
            iso4217: iso4217,
            timestamp: block.timestamp,
            txRef: bytes32(0)
        });

        emit SettlementCreated(holdId, amount, beneficiary, iso20022Hash, iso4217);
        emit StatusUpdated(
            holdId,
            Status.NONE,
            Status.HOLD,
            amount,
            beneficiary,
            iso20022Hash,
            iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to MINTED
     */
    function setMinted(bytes32 holdId, bytes32 txRef) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.HOLD, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.MINTED;
        s.txRef = txRef;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.MINTED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to DELIVERED
     */
    function setDelivered(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(s.status == Status.MINTED, "SettlementRegistry: invalid status");

        Status oldStatus = s.status;
        s.status = Status.DELIVERED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.DELIVERED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Update settlement status to FAILED
     */
    function setFailed(bytes32 holdId) external onlyRole(OPERATOR_ROLE) {
        Settlement storage s = settlements[holdId];
        require(
            s.status == Status.HOLD || s.status == Status.MINTED,
            "SettlementRegistry: invalid status"
        );

        Status oldStatus = s.status;
        s.status = Status.FAILED;
        s.timestamp = block.timestamp;

        emit StatusUpdated(
            holdId,
            oldStatus,
            Status.FAILED,
            s.amount,
            s.beneficiary,
            s.iso20022Hash,
            s.iso4217,
            block.timestamp
        );
    }

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 holdId) external view returns (Settlement memory) {
        return settlements[holdId];
    }

    /**
     * @dev Check if holdId exists
     */
    function exists(bytes32 holdId) external view returns (bool) {
        return settlements[holdId].status != Status.NONE;
    }

    /**
     * @dev Get settlement status
     */
    function getStatus(bytes32 holdId) external view returns (Status) {
        return settlements[holdId].status;
    }
}
















