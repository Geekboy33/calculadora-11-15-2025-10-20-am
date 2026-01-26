// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   ██████╗  █████╗ ███╗   ██╗██╗  ██╗    ██████╗ ███████╗ ██████╗             ║
 * ║   ██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝    ██╔══██╗██╔════╝██╔════╝             ║
 * ║   ██████╔╝███████║██╔██╗ ██║█████╔╝     ██████╔╝█████╗  ██║  ███╗            ║
 * ║   ██╔══██╗██╔══██║██║╚██╗██║██╔═██╗     ██╔══██╗██╔══╝  ██║   ██║            ║
 * ║   ██████╔╝██║  ██║██║ ╚████║██║  ██╗    ██║  ██║███████╗╚██████╔╝            ║
 * ║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝             ║
 * ║                                                                               ║
 * ║   BANK REGISTRY - Digital Commercial Bank Ltd                                 ║
 * ║   Financial Institution Registry • Multi-Sig Approvals • Compliance Ready    ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * @title BankRegistry - Financial Institution Registry
 * @author Digital Commercial Bank Ltd - Treasury Division
 * @notice Production-grade registry for authorized banks and financial institutions
 *         with multi-signature approval, compliance tracking, and audit trail.
 * @dev Implements multi-sig governance for bank registration and management.
 * 
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 2.0.0
 * @custom:chain LemonChain (ID: 1006)
 * @custom:audit Pending - Q1 2026
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FEATURES:
 * ═══════════════════════════════════════════════════════════════════════════════
 * • Bank Registration with Multi-Sig Approval
 * • SWIFT/BIC Code Validation
 * • ISO 3166-1 Country Codes
 * • Compliance Level Tracking (TIER1, TIER2, TIER3)
 * • Bank Activation/Deactivation
 * • Approver Management
 * • Full Audit Trail
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

contract BankRegistry {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract version
    string public constant VERSION = "2.0.0";
    
    /// @notice Contract name
    string public constant NAME = "DCB Bank Registry";
    
    /// @notice Issuer name
    string public constant ISSUER = "Digital Commercial Bank Ltd";

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Compliance levels
    enum ComplianceLevel {
        NONE,       // Not compliant
        TIER3,      // Basic compliance
        TIER2,      // Standard compliance
        TIER1       // Full compliance
    }
    
    /// @notice Bank status
    enum BankStatus {
        NONE,           // Not registered
        PENDING,        // Pending approval
        ACTIVE,         // Active and operational
        SUSPENDED,      // Temporarily suspended
        DEACTIVATED     // Permanently deactivated
    }
    
    /// @notice Bank information structure
    struct Bank {
        // Identification
        bytes32 bankId;                 // Unique bank identifier
        string name;                    // Legal name
        string bic;                     // Bank Identifier Code (SWIFT)
        string country;                 // ISO 3166-1 alpha-2 country code
        
        // Addresses
        address walletAddress;          // Primary wallet address
        address signerAddress;          // Authorized signer address
        
        // Status
        BankStatus status;
        ComplianceLevel complianceLevel;
        
        // Timestamps
        uint256 registeredAt;
        uint256 lastUpdatedAt;
        uint256 lastActivityAt;
        
        // Metadata
        string legalEntityId;           // LEI code if available
        string regulatoryId;            // Local regulatory ID
        uint256 transactionLimit;       // Max transaction limit (0 = unlimited)
    }
    
    /// @notice Pending approval structure
    struct PendingApproval {
        uint256 approvalId;
        address proposedBankAddress;
        string name;
        string bic;
        string country;
        ComplianceLevel complianceLevel;
        
        address proposer;
        uint256 createdAt;
        uint256 expiresAt;
        
        uint256 approvalsCount;
        uint256 rejectionsCount;
        bool executed;
        bool rejected;
        
        mapping(address => bool) hasVoted;
        mapping(address => bool) votedYes;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract admin
    address public admin;
    
    /// @notice Banks mapping (address => Bank)
    mapping(address => Bank) private _banks;
    
    /// @notice Banks by ID mapping
    mapping(bytes32 => address) public bankIdToAddress;
    
    /// @notice Registered bank addresses
    address[] public registeredBanks;
    
    /// @notice Approvers mapping
    mapping(address => bool) public isApprover;
    
    /// @notice Approvers list
    address[] public approvers;
    
    /// @notice Required approvals for registration
    uint256 public requiredApprovals;
    
    /// @notice Pending approvals mapping
    mapping(uint256 => PendingApproval) private _pendingApprovals;
    
    /// @notice Next approval ID
    uint256 public nextApprovalId;
    
    /// @notice Approval validity period (default 7 days)
    uint256 public approvalValidityPeriod = 7 days;
    
    /// @notice Total banks registered
    uint256 public totalBanksRegistered;
    
    /// @notice Total active banks
    uint256 public activeBanksCount;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a bank is registered
    event BankRegistered(
        bytes32 indexed bankId,
        address indexed bankAddress,
        string name,
        string bic,
        string country,
        ComplianceLevel complianceLevel,
        uint256 timestamp
    );
    
    /// @notice Emitted when bank info is updated
    event BankUpdated(
        address indexed bankAddress,
        string name,
        string bic,
        ComplianceLevel complianceLevel,
        uint256 timestamp
    );
    
    /// @notice Emitted when bank status changes
    event BankStatusChanged(
        address indexed bankAddress,
        BankStatus oldStatus,
        BankStatus newStatus,
        uint256 timestamp
    );
    
    /// @notice Emitted when approval is requested
    event ApprovalRequested(
        uint256 indexed approvalId,
        address indexed proposedBank,
        string name,
        address indexed proposer,
        uint256 expiresAt
    );
    
    /// @notice Emitted when vote is cast
    event VoteCast(
        uint256 indexed approvalId,
        address indexed voter,
        bool approved,
        uint256 currentApprovals,
        uint256 currentRejections
    );
    
    /// @notice Emitted when approval is executed
    event ApprovalExecuted(
        uint256 indexed approvalId,
        address indexed bankAddress,
        uint256 timestamp
    );
    
    /// @notice Emitted when approval is rejected
    event ApprovalRejected(
        uint256 indexed approvalId,
        uint256 timestamp
    );
    
    /// @notice Emitted when approver is added
    event ApproverAdded(address indexed approver, uint256 timestamp);
    
    /// @notice Emitted when approver is removed
    event ApproverRemoved(address indexed approver, uint256 timestamp);
    
    /// @notice Emitted when required approvals change
    event RequiredApprovalsChanged(uint256 oldValue, uint256 newValue);
    
    /// @notice Emitted when admin is transferred
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error ZeroAddress();
    error EmptyString();
    error InvalidBIC();
    error InvalidCountryCode();
    error BankAlreadyRegistered();
    error BankNotRegistered();
    error BankNotActive();
    error ApprovalNotFound();
    error ApprovalExpired();
    error ApprovalAlreadyExecuted();
    error AlreadyVoted();
    error NotApprover();
    error NotAdmin();
    error InsufficientApprovals();
    error CannotRemoveApprover();
    error InvalidRequiredApprovals();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier onlyApprover() {
        if (!isApprover[msg.sender]) revert NotApprover();
        _;
    }
    
    modifier onlyAdminOrApprover() {
        if (msg.sender != admin && !isApprover[msg.sender]) revert NotApprover();
        _;
    }
    
    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }
    
    modifier validString(string memory str) {
        if (bytes(str).length == 0) revert EmptyString();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initializes the BankRegistry
     * @param _admin Initial admin address
     * @param _initialApprovers Initial approvers array
     * @param _requiredApprovals Number of required approvals
     */
    constructor(
        address _admin,
        address[] memory _initialApprovers,
        uint256 _requiredApprovals
    ) {
        if (_admin == address(0)) revert ZeroAddress();
        if (_requiredApprovals == 0) revert InvalidRequiredApprovals();
        if (_requiredApprovals > _initialApprovers.length + 1) revert InvalidRequiredApprovals();
        
        admin = _admin;
        
        // Add admin as approver
        isApprover[_admin] = true;
        approvers.push(_admin);
        emit ApproverAdded(_admin, block.timestamp);
        
        // Add initial approvers
        for (uint256 i = 0; i < _initialApprovers.length; i++) {
            if (_initialApprovers[i] != address(0) && !isApprover[_initialApprovers[i]]) {
                isApprover[_initialApprovers[i]] = true;
                approvers.push(_initialApprovers[i]);
                emit ApproverAdded(_initialApprovers[i], block.timestamp);
            }
        }
        
        requiredApprovals = _requiredApprovals;
        nextApprovalId = 1;
        
        emit AdminTransferred(address(0), _admin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BANK REGISTRATION (DIRECT - Admin Only)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Registers a bank directly (admin only, bypasses multi-sig)
     * @param bankAddress Wallet address of the bank
     * @param name Legal name of the bank
     * @param bic Bank Identifier Code (SWIFT)
     * @param country ISO 3166-1 alpha-2 country code
     * @param complianceLevel Compliance tier
     * @return bankId The unique bank identifier
     */
    function registerBankDirect(
        address bankAddress,
        string calldata name,
        string calldata bic,
        string calldata country,
        ComplianceLevel complianceLevel
    ) 
        external 
        onlyAdmin 
        validAddress(bankAddress)
        validString(name)
        validString(bic)
        returns (bytes32 bankId)
    {
        if (_banks[bankAddress].status != BankStatus.NONE) revert BankAlreadyRegistered();
        if (!_isValidBIC(bic)) revert InvalidBIC();
        if (!_isValidCountryCode(country)) revert InvalidCountryCode();
        
        bankId = _generateBankId(bankAddress, name, bic);
        
        _banks[bankAddress] = Bank({
            bankId: bankId,
            name: name,
            bic: bic,
            country: country,
            walletAddress: bankAddress,
            signerAddress: bankAddress,
            status: BankStatus.ACTIVE,
            complianceLevel: complianceLevel,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            lastActivityAt: block.timestamp,
            legalEntityId: "",
            regulatoryId: "",
            transactionLimit: 0
        });
        
        bankIdToAddress[bankId] = bankAddress;
        registeredBanks.push(bankAddress);
        totalBanksRegistered++;
        activeBanksCount++;
        
        emit BankRegistered(
            bankId,
            bankAddress,
            name,
            bic,
            country,
            complianceLevel,
            block.timestamp
        );
        
        return bankId;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BANK REGISTRATION (MULTI-SIG)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Proposes a bank registration (requires multi-sig approval)
     * @param bankAddress Wallet address of the bank
     * @param name Legal name of the bank
     * @param bic Bank Identifier Code (SWIFT)
     * @param country ISO 3166-1 alpha-2 country code
     * @param complianceLevel Compliance tier
     * @return approvalId The approval request ID
     */
    function proposeBankRegistration(
        address bankAddress,
        string calldata name,
        string calldata bic,
        string calldata country,
        ComplianceLevel complianceLevel
    )
        external
        onlyAdminOrApprover
        validAddress(bankAddress)
        validString(name)
        validString(bic)
        returns (uint256 approvalId)
    {
        if (_banks[bankAddress].status != BankStatus.NONE) revert BankAlreadyRegistered();
        if (!_isValidBIC(bic)) revert InvalidBIC();
        if (!_isValidCountryCode(country)) revert InvalidCountryCode();
        
        approvalId = nextApprovalId++;
        
        PendingApproval storage approval = _pendingApprovals[approvalId];
        approval.approvalId = approvalId;
        approval.proposedBankAddress = bankAddress;
        approval.name = name;
        approval.bic = bic;
        approval.country = country;
        approval.complianceLevel = complianceLevel;
        approval.proposer = msg.sender;
        approval.createdAt = block.timestamp;
        approval.expiresAt = block.timestamp + approvalValidityPeriod;
        approval.approvalsCount = 0;
        approval.rejectionsCount = 0;
        approval.executed = false;
        approval.rejected = false;
        
        emit ApprovalRequested(
            approvalId,
            bankAddress,
            name,
            msg.sender,
            approval.expiresAt
        );
        
        return approvalId;
    }
    
    /**
     * @notice Votes on a pending bank registration
     * @param approvalId ID of the pending approval
     * @param approve True to approve, false to reject
     */
    function vote(uint256 approvalId, bool approve) external onlyApprover {
        PendingApproval storage approval = _pendingApprovals[approvalId];
        
        if (approval.proposedBankAddress == address(0)) revert ApprovalNotFound();
        if (block.timestamp > approval.expiresAt) revert ApprovalExpired();
        if (approval.executed || approval.rejected) revert ApprovalAlreadyExecuted();
        if (approval.hasVoted[msg.sender]) revert AlreadyVoted();
        
        approval.hasVoted[msg.sender] = true;
        approval.votedYes[msg.sender] = approve;
        
        if (approve) {
            approval.approvalsCount++;
        } else {
            approval.rejectionsCount++;
        }
        
        emit VoteCast(
            approvalId,
            msg.sender,
            approve,
            approval.approvalsCount,
            approval.rejectionsCount
        );
        
        // Auto-execute if enough approvals
        if (approval.approvalsCount >= requiredApprovals) {
            _executeApproval(approvalId);
        }
        
        // Auto-reject if majority rejects
        uint256 totalApprovers = approvers.length;
        if (approval.rejectionsCount > totalApprovers / 2) {
            approval.rejected = true;
            emit ApprovalRejected(approvalId, block.timestamp);
        }
    }
    
    /**
     * @notice Executes a pending approval
     * @param approvalId ID of the pending approval
     */
    function executeApproval(uint256 approvalId) external onlyAdminOrApprover {
        PendingApproval storage approval = _pendingApprovals[approvalId];
        
        if (approval.proposedBankAddress == address(0)) revert ApprovalNotFound();
        if (approval.executed || approval.rejected) revert ApprovalAlreadyExecuted();
        if (approval.approvalsCount < requiredApprovals) revert InsufficientApprovals();
        
        _executeApproval(approvalId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BANK MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Updates bank information
     * @param bankAddress Address of the bank
     * @param name New name (empty to keep current)
     * @param bic New BIC (empty to keep current)
     * @param complianceLevel New compliance level
     */
    function updateBank(
        address bankAddress,
        string calldata name,
        string calldata bic,
        ComplianceLevel complianceLevel
    ) external onlyAdmin {
        Bank storage bank = _banks[bankAddress];
        if (bank.status == BankStatus.NONE) revert BankNotRegistered();
        
        if (bytes(name).length > 0) {
            bank.name = name;
        }
        if (bytes(bic).length > 0) {
            if (!_isValidBIC(bic)) revert InvalidBIC();
            bank.bic = bic;
        }
        if (complianceLevel != ComplianceLevel.NONE) {
            bank.complianceLevel = complianceLevel;
        }
        
        bank.lastUpdatedAt = block.timestamp;
        
        emit BankUpdated(
            bankAddress,
            bank.name,
            bank.bic,
            bank.complianceLevel,
            block.timestamp
        );
    }
    
    /**
     * @notice Suspends a bank
     * @param bankAddress Address of the bank
     */
    function suspendBank(address bankAddress) external onlyAdmin {
        Bank storage bank = _banks[bankAddress];
        if (bank.status == BankStatus.NONE) revert BankNotRegistered();
        if (bank.status != BankStatus.ACTIVE) revert BankNotActive();
        
        BankStatus oldStatus = bank.status;
        bank.status = BankStatus.SUSPENDED;
        bank.lastUpdatedAt = block.timestamp;
        activeBanksCount--;
        
        emit BankStatusChanged(bankAddress, oldStatus, BankStatus.SUSPENDED, block.timestamp);
    }
    
    /**
     * @notice Reactivates a suspended bank
     * @param bankAddress Address of the bank
     */
    function reactivateBank(address bankAddress) external onlyAdmin {
        Bank storage bank = _banks[bankAddress];
        if (bank.status == BankStatus.NONE) revert BankNotRegistered();
        if (bank.status != BankStatus.SUSPENDED) revert BankNotActive();
        
        BankStatus oldStatus = bank.status;
        bank.status = BankStatus.ACTIVE;
        bank.lastUpdatedAt = block.timestamp;
        activeBanksCount++;
        
        emit BankStatusChanged(bankAddress, oldStatus, BankStatus.ACTIVE, block.timestamp);
    }
    
    /**
     * @notice Permanently deactivates a bank
     * @param bankAddress Address of the bank
     */
    function deactivateBank(address bankAddress) external onlyAdmin {
        Bank storage bank = _banks[bankAddress];
        if (bank.status == BankStatus.NONE) revert BankNotRegistered();
        
        BankStatus oldStatus = bank.status;
        if (oldStatus == BankStatus.ACTIVE) {
            activeBanksCount--;
        }
        
        bank.status = BankStatus.DEACTIVATED;
        bank.lastUpdatedAt = block.timestamp;
        
        emit BankStatusChanged(bankAddress, oldStatus, BankStatus.DEACTIVATED, block.timestamp);
    }
    
    /**
     * @notice Updates bank signer address
     * @param bankAddress Address of the bank
     * @param newSigner New signer address
     */
    function updateBankSigner(address bankAddress, address newSigner) 
        external 
        onlyAdmin 
        validAddress(newSigner) 
    {
        Bank storage bank = _banks[bankAddress];
        if (bank.status == BankStatus.NONE) revert BankNotRegistered();
        
        bank.signerAddress = newSigner;
        bank.lastUpdatedAt = block.timestamp;
    }
    
    /**
     * @notice Sets bank transaction limit
     * @param bankAddress Address of the bank
     * @param limit New limit (0 = unlimited)
     */
    function setBankTransactionLimit(address bankAddress, uint256 limit) external onlyAdmin {
        Bank storage bank = _banks[bankAddress];
        if (bank.status == BankStatus.NONE) revert BankNotRegistered();
        
        bank.transactionLimit = limit;
        bank.lastUpdatedAt = block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // APPROVER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Adds a new approver
     * @param approver Address of the new approver
     */
    function addApprover(address approver) external onlyAdmin validAddress(approver) {
        if (isApprover[approver]) return;
        
        isApprover[approver] = true;
        approvers.push(approver);
        
        emit ApproverAdded(approver, block.timestamp);
    }
    
    /**
     * @notice Removes an approver
     * @param approver Address of the approver to remove
     */
    function removeApprover(address approver) external onlyAdmin {
        if (!isApprover[approver]) revert NotApprover();
        if (approvers.length <= requiredApprovals) revert CannotRemoveApprover();
        
        isApprover[approver] = false;
        
        // Remove from array
        for (uint256 i = 0; i < approvers.length; i++) {
            if (approvers[i] == approver) {
                approvers[i] = approvers[approvers.length - 1];
                approvers.pop();
                break;
            }
        }
        
        emit ApproverRemoved(approver, block.timestamp);
    }
    
    /**
     * @notice Sets required approvals count
     * @param required New required count
     */
    function setRequiredApprovals(uint256 required) external onlyAdmin {
        if (required == 0) revert InvalidRequiredApprovals();
        if (required > approvers.length) revert InvalidRequiredApprovals();
        
        uint256 oldValue = requiredApprovals;
        requiredApprovals = required;
        
        emit RequiredApprovalsChanged(oldValue, required);
    }
    
    /**
     * @notice Sets approval validity period
     * @param period New period in seconds
     */
    function setApprovalValidityPeriod(uint256 period) external onlyAdmin {
        if (period < 1 days) revert InvalidRequiredApprovals();
        approvalValidityPeriod = period;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Gets bank details
     * @param bankAddress Address of the bank
     * @return bankId The unique identifier of the bank
     * @return name The name of the bank
     * @return bic The BIC code of the bank
     * @return country The country of the bank
     * @return walletAddress The wallet address of the bank
     * @return signerAddress The signer address of the bank
     * @return status The current status of the bank
     * @return complianceLevel The compliance level of the bank
     * @return registeredAt The timestamp when the bank was registered
     * @return lastUpdatedAt The timestamp when the bank was last updated
     */
    function getBank(address bankAddress) external view returns (
        bytes32 bankId,
        string memory name,
        string memory bic,
        string memory country,
        address walletAddress,
        address signerAddress,
        BankStatus status,
        ComplianceLevel complianceLevel,
        uint256 registeredAt,
        uint256 lastUpdatedAt
    ) {
        Bank storage bank = _banks[bankAddress];
        return (
            bank.bankId,
            bank.name,
            bank.bic,
            bank.country,
            bank.walletAddress,
            bank.signerAddress,
            bank.status,
            bank.complianceLevel,
            bank.registeredAt,
            bank.lastUpdatedAt
        );
    }
    
    /**
     * @notice Checks if bank is registered
     * @param bankAddress Address to check
     * @return True if registered
     */
    function isBankRegistered(address bankAddress) external view returns (bool) {
        return _banks[bankAddress].status != BankStatus.NONE;
    }
    
    /**
     * @notice Checks if bank is active
     * @param bankAddress Address to check
     * @return True if active
     */
    function isBankActive(address bankAddress) external view returns (bool) {
        return _banks[bankAddress].status == BankStatus.ACTIVE;
    }
    
    /**
     * @notice Gets all registered banks
     * @return Array of bank addresses
     */
    function getAllBanks() external view returns (address[] memory) {
        return registeredBanks;
    }
    
    /**
     * @notice Gets all approvers
     * @return Array of approver addresses
     */
    function getAllApprovers() external view returns (address[] memory) {
        return approvers;
    }
    
    /**
     * @notice Gets pending approval details
     * @param approvalId Approval ID
     */
    function getPendingApproval(uint256 approvalId) external view returns (
        address proposedBankAddress,
        string memory name,
        string memory bic,
        string memory country,
        ComplianceLevel complianceLevel,
        address proposer,
        uint256 createdAt,
        uint256 expiresAt,
        uint256 approvalsCount,
        uint256 rejectionsCount,
        bool executed,
        bool rejected
    ) {
        PendingApproval storage approval = _pendingApprovals[approvalId];
        return (
            approval.proposedBankAddress,
            approval.name,
            approval.bic,
            approval.country,
            approval.complianceLevel,
            approval.proposer,
            approval.createdAt,
            approval.expiresAt,
            approval.approvalsCount,
            approval.rejectionsCount,
            approval.executed,
            approval.rejected
        );
    }
    
    /**
     * @notice Checks if approver has voted
     * @param approvalId Approval ID
     * @param approver Approver address
     * @return hasVoted Whether voted
     * @return votedYes How they voted
     */
    function getVote(uint256 approvalId, address approver) 
        external 
        view 
        returns (bool hasVoted, bool votedYes) 
    {
        PendingApproval storage approval = _pendingApprovals[approvalId];
        return (approval.hasVoted[approver], approval.votedYes[approver]);
    }
    
    /**
     * @notice Gets registry statistics
     */
    function getStats() external view returns (
        uint256 _totalBanksRegistered,
        uint256 _activeBanksCount,
        uint256 _approversCount,
        uint256 _requiredApprovals,
        uint256 _pendingApprovalsCount
    ) {
        return (
            totalBanksRegistered,
            activeBanksCount,
            approvers.length,
            requiredApprovals,
            nextApprovalId - 1
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfers admin role
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin validAddress(newAdmin) {
        address previousAdmin = admin;
        admin = newAdmin;
        emit AdminTransferred(previousAdmin, newAdmin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _executeApproval(uint256 approvalId) internal {
        PendingApproval storage approval = _pendingApprovals[approvalId];
        
        bytes32 bankId = _generateBankId(
            approval.proposedBankAddress,
            approval.name,
            approval.bic
        );
        
        _banks[approval.proposedBankAddress] = Bank({
            bankId: bankId,
            name: approval.name,
            bic: approval.bic,
            country: approval.country,
            walletAddress: approval.proposedBankAddress,
            signerAddress: approval.proposedBankAddress,
            status: BankStatus.ACTIVE,
            complianceLevel: approval.complianceLevel,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            lastActivityAt: block.timestamp,
            legalEntityId: "",
            regulatoryId: "",
            transactionLimit: 0
        });
        
        bankIdToAddress[bankId] = approval.proposedBankAddress;
        registeredBanks.push(approval.proposedBankAddress);
        totalBanksRegistered++;
        activeBanksCount++;
        
        approval.executed = true;
        
        emit BankRegistered(
            bankId,
            approval.proposedBankAddress,
            approval.name,
            approval.bic,
            approval.country,
            approval.complianceLevel,
            block.timestamp
        );
        
        emit ApprovalExecuted(approvalId, approval.proposedBankAddress, block.timestamp);
    }
    
    function _generateBankId(
        address bankAddress,
        string memory name,
        string memory bic
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            bankAddress,
            name,
            bic,
            block.chainid,
            block.timestamp
        ));
    }
    
    function _isValidBIC(string memory bic) internal pure returns (bool) {
        bytes memory bicBytes = bytes(bic);
        // BIC must be 8 or 11 characters
        return bicBytes.length == 8 || bicBytes.length == 11;
    }
    
    function _isValidCountryCode(string memory country) internal pure returns (bool) {
        bytes memory countryBytes = bytes(country);
        // ISO 3166-1 alpha-2 codes are 2 characters
        return countryBytes.length == 2;
    }
}
