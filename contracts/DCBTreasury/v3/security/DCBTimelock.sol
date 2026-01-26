// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  ⏰ DCB TIMELOCK CONTROLLER                                                                       ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                                       ║
 * ║  ├─ Time-delayed execution of critical operations                                                ║
 * ║  ├─ Multi-proposer support                                                                       ║
 * ║  ├─ Cancellation mechanism                                                                       ║
 * ║  ├─ Grace period for execution                                                                   ║
 * ║  └─ Emergency bypass with multi-sig                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DCBTimelock
 * @author Digital Commercial Bank Ltd
 * @notice Timelock controller for critical admin operations
 */
contract DCBTimelock is AccessControl {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    string public constant VERSION = "1.0.0";
    
    /// @notice Minimum delay for standard operations (24 hours)
    uint256 public constant MIN_DELAY = 24 hours;
    
    /// @notice Maximum delay (30 days)
    uint256 public constant MAX_DELAY = 30 days;
    
    /// @notice Grace period after delay expires (7 days)
    uint256 public constant GRACE_PERIOD = 7 days;
    
    /// @notice Emergency delay (2 hours)
    uint256 public constant EMERGENCY_DELAY = 2 hours;
    
    /// @notice Required emergency approvals
    uint256 public constant EMERGENCY_APPROVALS_REQUIRED = 3;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum OperationState {
        Unset,
        Pending,
        Ready,
        Executed,
        Cancelled,
        Expired
    }
    
    enum OperationType {
        Standard,
        Critical,
        Emergency
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct TimelockOperation {
        bytes32 operationId;
        address target;
        uint256 value;
        bytes data;
        bytes32 predecessor;
        bytes32 salt;
        uint256 delay;
        uint256 scheduledAt;
        uint256 executesAt;
        uint256 expiresAt;
        OperationType opType;
        OperationState state;
        address proposer;
        string description;
    }
    
    struct EmergencyOperation {
        bytes32 operationId;
        address[] approvers;
        bool executed;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Current delay for standard operations
    uint256 public delay;
    
    /// @notice Operations mapping
    mapping(bytes32 => TimelockOperation) public operations;
    bytes32[] public operationIds;
    
    /// @notice Emergency operations
    mapping(bytes32 => EmergencyOperation) public emergencyOperations;
    
    /// @notice Total operations count
    uint256 public totalOperations;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event OperationScheduled(
        bytes32 indexed operationId,
        address indexed target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        uint256 delay,
        uint256 executesAt,
        OperationType opType,
        string description
    );
    
    event OperationExecuted(
        bytes32 indexed operationId,
        address indexed target,
        uint256 value,
        bytes data,
        address executor
    );
    
    event OperationCancelled(
        bytes32 indexed operationId,
        address canceller
    );
    
    event EmergencyApproval(
        bytes32 indexed operationId,
        address indexed approver,
        uint256 approvalCount
    );
    
    event EmergencyExecuted(
        bytes32 indexed operationId,
        address executor
    );
    
    event DelayUpdated(
        uint256 oldDelay,
        uint256 newDelay
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _admin,
        address[] memory _proposers,
        address[] memory _executors,
        uint256 _delay
    ) {
        require(_admin != address(0), "Invalid admin");
        require(_delay >= MIN_DELAY && _delay <= MAX_DELAY, "Invalid delay");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PROPOSER_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(CANCELLER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        for (uint256 i = 0; i < _proposers.length; i++) {
            _grantRole(PROPOSER_ROLE, _proposers[i]);
        }
        
        for (uint256 i = 0; i < _executors.length; i++) {
            _grantRole(EXECUTOR_ROLE, _executors[i]);
        }
        
        delay = _delay;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SCHEDULING
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Schedules a standard operation
     */
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32 operationId) {
        return _schedule(target, value, data, predecessor, salt, delay, OperationType.Standard, description);
    }
    
    /**
     * @notice Schedules a critical operation with longer delay
     */
    function scheduleCritical(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32 operationId) {
        // Critical operations have 2x delay
        return _schedule(target, value, data, predecessor, salt, delay * 2, OperationType.Critical, description);
    }
    
    function _schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 _delay,
        OperationType opType,
        string calldata description
    ) internal returns (bytes32 operationId) {
        require(target != address(0), "Invalid target");
        
        operationId = keccak256(abi.encodePacked(
            target, value, data, predecessor, salt, block.timestamp
        ));
        
        require(operations[operationId].scheduledAt == 0, "Operation exists");
        
        uint256 executesAt = block.timestamp + _delay;
        uint256 expiresAt = executesAt + GRACE_PERIOD;
        
        operations[operationId] = TimelockOperation({
            operationId: operationId,
            target: target,
            value: value,
            data: data,
            predecessor: predecessor,
            salt: salt,
            delay: _delay,
            scheduledAt: block.timestamp,
            executesAt: executesAt,
            expiresAt: expiresAt,
            opType: opType,
            state: OperationState.Pending,
            proposer: msg.sender,
            description: description
        });
        
        operationIds.push(operationId);
        totalOperations++;
        
        emit OperationScheduled(
            operationId,
            target,
            value,
            data,
            predecessor,
            _delay,
            executesAt,
            opType,
            description
        );
        
        return operationId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Executes a scheduled operation
     */
    function execute(bytes32 operationId) external payable onlyRole(EXECUTOR_ROLE) {
        TimelockOperation storage op = operations[operationId];
        
        require(op.scheduledAt > 0, "Operation not found");
        require(op.state == OperationState.Pending, "Invalid state");
        require(block.timestamp >= op.executesAt, "Not ready");
        require(block.timestamp <= op.expiresAt, "Expired");
        
        // Check predecessor
        if (op.predecessor != bytes32(0)) {
            require(
                operations[op.predecessor].state == OperationState.Executed,
                "Predecessor not executed"
            );
        }
        
        op.state = OperationState.Executed;
        
        // Execute the call
        (bool success, bytes memory returnData) = op.target.call{value: op.value}(op.data);
        require(success, string(returnData));
        
        emit OperationExecuted(operationId, op.target, op.value, op.data, msg.sender);
    }
    
    /**
     * @notice Cancels a pending operation
     */
    function cancel(bytes32 operationId) external onlyRole(CANCELLER_ROLE) {
        TimelockOperation storage op = operations[operationId];
        
        require(op.scheduledAt > 0, "Operation not found");
        require(op.state == OperationState.Pending, "Cannot cancel");
        
        op.state = OperationState.Cancelled;
        
        emit OperationCancelled(operationId, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EMERGENCY
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Schedules an emergency operation with reduced delay
     */
    function scheduleEmergency(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external onlyRole(EMERGENCY_ROLE) returns (bytes32 operationId) {
        operationId = keccak256(abi.encodePacked(
            target, value, data, block.timestamp, "EMERGENCY"
        ));
        
        require(operations[operationId].scheduledAt == 0, "Operation exists");
        
        operations[operationId] = TimelockOperation({
            operationId: operationId,
            target: target,
            value: value,
            data: data,
            predecessor: bytes32(0),
            salt: bytes32(0),
            delay: EMERGENCY_DELAY,
            scheduledAt: block.timestamp,
            executesAt: block.timestamp + EMERGENCY_DELAY,
            expiresAt: block.timestamp + EMERGENCY_DELAY + GRACE_PERIOD,
            opType: OperationType.Emergency,
            state: OperationState.Pending,
            proposer: msg.sender,
            description: description
        });
        
        // Initialize emergency approvals
        address[] memory approvers = new address[](0);
        emergencyOperations[operationId] = EmergencyOperation({
            operationId: operationId,
            approvers: approvers,
            executed: false
        });
        
        // First approval from proposer
        emergencyOperations[operationId].approvers.push(msg.sender);
        
        operationIds.push(operationId);
        totalOperations++;
        
        emit OperationScheduled(
            operationId,
            target,
            value,
            data,
            bytes32(0),
            EMERGENCY_DELAY,
            block.timestamp + EMERGENCY_DELAY,
            OperationType.Emergency,
            description
        );
        
        emit EmergencyApproval(operationId, msg.sender, 1);
        
        return operationId;
    }
    
    /**
     * @notice Approves an emergency operation
     */
    function approveEmergency(bytes32 operationId) external onlyRole(EMERGENCY_ROLE) {
        EmergencyOperation storage emergencyOp = emergencyOperations[operationId];
        TimelockOperation storage op = operations[operationId];
        
        require(op.opType == OperationType.Emergency, "Not emergency");
        require(op.state == OperationState.Pending, "Invalid state");
        require(!emergencyOp.executed, "Already executed");
        
        // Check not already approved
        for (uint256 i = 0; i < emergencyOp.approvers.length; i++) {
            require(emergencyOp.approvers[i] != msg.sender, "Already approved");
        }
        
        emergencyOp.approvers.push(msg.sender);
        
        emit EmergencyApproval(operationId, msg.sender, emergencyOp.approvers.length);
    }
    
    /**
     * @notice Executes emergency operation if enough approvals
     */
    function executeEmergency(bytes32 operationId) external payable onlyRole(EMERGENCY_ROLE) {
        EmergencyOperation storage emergencyOp = emergencyOperations[operationId];
        TimelockOperation storage op = operations[operationId];
        
        require(op.opType == OperationType.Emergency, "Not emergency");
        require(op.state == OperationState.Pending, "Invalid state");
        require(!emergencyOp.executed, "Already executed");
        require(
            emergencyOp.approvers.length >= EMERGENCY_APPROVALS_REQUIRED,
            "Not enough approvals"
        );
        
        emergencyOp.executed = true;
        op.state = OperationState.Executed;
        
        // Execute
        (bool success, bytes memory returnData) = op.target.call{value: op.value}(op.data);
        require(success, string(returnData));
        
        emit EmergencyExecuted(operationId, msg.sender);
        emit OperationExecuted(operationId, op.target, op.value, op.data, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Updates the default delay (must go through timelock)
     */
    function updateDelay(uint256 newDelay) external {
        require(msg.sender == address(this), "Must be self-call");
        require(newDelay >= MIN_DELAY && newDelay <= MAX_DELAY, "Invalid delay");
        
        uint256 oldDelay = delay;
        delay = newDelay;
        
        emit DelayUpdated(oldDelay, newDelay);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getOperationState(bytes32 operationId) external view returns (OperationState) {
        TimelockOperation storage op = operations[operationId];
        
        if (op.scheduledAt == 0) return OperationState.Unset;
        if (op.state == OperationState.Cancelled) return OperationState.Cancelled;
        if (op.state == OperationState.Executed) return OperationState.Executed;
        if (block.timestamp > op.expiresAt) return OperationState.Expired;
        if (block.timestamp >= op.executesAt) return OperationState.Ready;
        return OperationState.Pending;
    }
    
    function isOperationReady(bytes32 operationId) external view returns (bool) {
        TimelockOperation storage op = operations[operationId];
        return op.state == OperationState.Pending && 
               block.timestamp >= op.executesAt && 
               block.timestamp <= op.expiresAt;
    }
    
    function getEmergencyApprovals(bytes32 operationId) external view returns (uint256) {
        return emergencyOperations[operationId].approvers.length;
    }
    
    function getAllOperationIds() external view returns (bytes32[] memory) {
        return operationIds;
    }
    
    receive() external payable {}
}
