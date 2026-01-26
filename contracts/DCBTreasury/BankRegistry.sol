// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title BankRegistry - DCB Treasury Certification Platform
 * @notice Registry of authorized banks and financial institutions
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 * @author DCB Treasury Team
 * 
 * This contract manages:
 * - Bank registration and verification
 * - Multi-signature approval for bank operations
 * - Bank metadata (BIC, SWIFT, address)
 * - Compliance status tracking
 */

contract BankRegistry {
    // ─────────────────────────────────────────────────────────────────────────────
    // DATA STRUCTURES
    // ─────────────────────────────────────────────────────────────────────────────
    
    struct Bank {
        string name;
        string bic;           // Bank Identifier Code (SWIFT)
        string country;       // ISO 3166-1 alpha-2 country code
        address walletAddress;
        bool isRegistered;
        bool isActive;
        uint256 registeredAt;
        uint256 lastUpdated;
        string complianceLevel; // "TIER1", "TIER2", "TIER3"
    }
    
    struct BankApproval {
        address bankAddress;
        string name;
        string bic;
        string country;
        string complianceLevel;
        uint256 approvalsCount;
        uint256 createdAt;
        bool executed;
        mapping(address => bool) approvals;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public admin;
    mapping(address => Bank) public banks;
    address[] public registeredBankAddresses;
    
    // Multi-sig approvers
    mapping(address => bool) public approvers;
    address[] public approverList;
    uint256 public requiredApprovals;
    
    // Pending approvals
    mapping(uint256 => BankApproval) public pendingApprovals;
    uint256 public nextApprovalId;
    
    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────
    
    event BankRegistered(
        address indexed bankAddress,
        string name,
        string bic,
        string country,
        uint256 timestamp
    );
    
    event BankUpdated(
        address indexed bankAddress,
        string name,
        string bic,
        uint256 timestamp
    );
    
    event BankDeactivated(address indexed bankAddress, uint256 timestamp);
    event BankReactivated(address indexed bankAddress, uint256 timestamp);
    
    event ApprovalRequested(
        uint256 indexed approvalId,
        address indexed bankAddress,
        string name,
        address requestedBy
    );
    
    event ApprovalGiven(
        uint256 indexed approvalId,
        address indexed approver,
        uint256 currentApprovals
    );
    
    event ApprovalExecuted(uint256 indexed approvalId, address indexed bankAddress);
    
    event ApproverAdded(address indexed approver);
    event ApproverRemoved(address indexed approver);
    event RequiredApprovalsChanged(uint256 oldValue, uint256 newValue);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "BankRegistry: caller is not admin");
        _;
    }
    
    modifier onlyApprover() {
        require(approvers[msg.sender], "BankRegistry: caller is not approver");
        _;
    }
    
    modifier onlyAdminOrApprover() {
        require(
            msg.sender == admin || approvers[msg.sender],
            "BankRegistry: caller is not admin or approver"
        );
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor() {
        admin = msg.sender;
        approvers[msg.sender] = true;
        approverList.push(msg.sender);
        requiredApprovals = 1;
        nextApprovalId = 1;
        
        emit AdminTransferred(address(0), msg.sender);
        emit ApproverAdded(msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BANK REGISTRATION (DIRECT - Admin Only)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Register a bank directly (admin only, bypasses multi-sig)
     * @param _bankAddress Wallet address of the bank
     * @param _name Bank name
     * @param _bic Bank Identifier Code (SWIFT)
     * @param _country ISO country code
     * @param _complianceLevel Compliance tier
     */
    function registerBankDirect(
        address _bankAddress,
        string memory _name,
        string memory _bic,
        string memory _country,
        string memory _complianceLevel
    ) external onlyAdmin {
        require(_bankAddress != address(0), "BankRegistry: invalid address");
        require(!banks[_bankAddress].isRegistered, "BankRegistry: bank already registered");
        require(bytes(_name).length > 0, "BankRegistry: name required");
        require(bytes(_bic).length > 0, "BankRegistry: BIC required");
        
        banks[_bankAddress] = Bank({
            name: _name,
            bic: _bic,
            country: _country,
            walletAddress: _bankAddress,
            isRegistered: true,
            isActive: true,
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp,
            complianceLevel: _complianceLevel
        });
        
        registeredBankAddresses.push(_bankAddress);
        
        emit BankRegistered(_bankAddress, _name, _bic, _country, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BANK REGISTRATION (MULTI-SIG)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Request bank registration (requires multi-sig approval)
     * @param _bankAddress Wallet address of the bank
     * @param _name Bank name
     * @param _bic Bank Identifier Code (SWIFT)
     * @param _country ISO country code
     * @param _complianceLevel Compliance tier
     * @return approvalId The ID of the pending approval
     */
    function requestBankRegistration(
        address _bankAddress,
        string memory _name,
        string memory _bic,
        string memory _country,
        string memory _complianceLevel
    ) external onlyAdminOrApprover returns (uint256 approvalId) {
        require(_bankAddress != address(0), "BankRegistry: invalid address");
        require(!banks[_bankAddress].isRegistered, "BankRegistry: bank already registered");
        require(bytes(_name).length > 0, "BankRegistry: name required");
        
        approvalId = nextApprovalId++;
        
        BankApproval storage approval = pendingApprovals[approvalId];
        approval.bankAddress = _bankAddress;
        approval.name = _name;
        approval.bic = _bic;
        approval.country = _country;
        approval.complianceLevel = _complianceLevel;
        approval.approvalsCount = 0;
        approval.createdAt = block.timestamp;
        approval.executed = false;
        
        emit ApprovalRequested(approvalId, _bankAddress, _name, msg.sender);
        
        return approvalId;
    }
    
    /**
     * @notice Approve a pending bank registration
     * @param _approvalId ID of the pending approval
     */
    function approveBankRegistration(uint256 _approvalId) external onlyApprover {
        BankApproval storage approval = pendingApprovals[_approvalId];
        
        require(!approval.executed, "BankRegistry: already executed");
        require(approval.bankAddress != address(0), "BankRegistry: invalid approval");
        require(!approval.approvals[msg.sender], "BankRegistry: already approved");
        
        approval.approvals[msg.sender] = true;
        approval.approvalsCount++;
        
        emit ApprovalGiven(_approvalId, msg.sender, approval.approvalsCount);
        
        // Auto-execute if enough approvals
        if (approval.approvalsCount >= requiredApprovals) {
            _executeRegistration(_approvalId);
        }
    }
    
    /**
     * @notice Execute a bank registration after sufficient approvals
     * @param _approvalId ID of the pending approval
     */
    function executeRegistration(uint256 _approvalId) external onlyAdminOrApprover {
        BankApproval storage approval = pendingApprovals[_approvalId];
        
        require(!approval.executed, "BankRegistry: already executed");
        require(
            approval.approvalsCount >= requiredApprovals,
            "BankRegistry: insufficient approvals"
        );
        
        _executeRegistration(_approvalId);
    }
    
    function _executeRegistration(uint256 _approvalId) internal {
        BankApproval storage approval = pendingApprovals[_approvalId];
        
        banks[approval.bankAddress] = Bank({
            name: approval.name,
            bic: approval.bic,
            country: approval.country,
            walletAddress: approval.bankAddress,
            isRegistered: true,
            isActive: true,
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp,
            complianceLevel: approval.complianceLevel
        });
        
        registeredBankAddresses.push(approval.bankAddress);
        approval.executed = true;
        
        emit BankRegistered(
            approval.bankAddress,
            approval.name,
            approval.bic,
            approval.country,
            block.timestamp
        );
        emit ApprovalExecuted(_approvalId, approval.bankAddress);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // BANK MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Update bank information
     * @param _bankAddress Address of the bank to update
     * @param _name New bank name
     * @param _bic New BIC code
     * @param _complianceLevel New compliance level
     */
    function updateBank(
        address _bankAddress,
        string memory _name,
        string memory _bic,
        string memory _complianceLevel
    ) external onlyAdmin {
        require(banks[_bankAddress].isRegistered, "BankRegistry: bank not registered");
        
        Bank storage bank = banks[_bankAddress];
        
        if (bytes(_name).length > 0) bank.name = _name;
        if (bytes(_bic).length > 0) bank.bic = _bic;
        if (bytes(_complianceLevel).length > 0) bank.complianceLevel = _complianceLevel;
        
        bank.lastUpdated = block.timestamp;
        
        emit BankUpdated(_bankAddress, bank.name, bank.bic, block.timestamp);
    }
    
    /**
     * @notice Deactivate a bank
     * @param _bankAddress Address of the bank to deactivate
     */
    function deactivateBank(address _bankAddress) external onlyAdmin {
        require(banks[_bankAddress].isRegistered, "BankRegistry: bank not registered");
        require(banks[_bankAddress].isActive, "BankRegistry: bank already inactive");
        
        banks[_bankAddress].isActive = false;
        banks[_bankAddress].lastUpdated = block.timestamp;
        
        emit BankDeactivated(_bankAddress, block.timestamp);
    }
    
    /**
     * @notice Reactivate a bank
     * @param _bankAddress Address of the bank to reactivate
     */
    function reactivateBank(address _bankAddress) external onlyAdmin {
        require(banks[_bankAddress].isRegistered, "BankRegistry: bank not registered");
        require(!banks[_bankAddress].isActive, "BankRegistry: bank already active");
        
        banks[_bankAddress].isActive = true;
        banks[_bankAddress].lastUpdated = block.timestamp;
        
        emit BankReactivated(_bankAddress, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // APPROVER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add a new approver
     * @param _approver Address of the new approver
     */
    function addApprover(address _approver) external onlyAdmin {
        require(_approver != address(0), "BankRegistry: invalid address");
        require(!approvers[_approver], "BankRegistry: already an approver");
        
        approvers[_approver] = true;
        approverList.push(_approver);
        
        emit ApproverAdded(_approver);
    }
    
    /**
     * @notice Remove an approver
     * @param _approver Address of the approver to remove
     */
    function removeApprover(address _approver) external onlyAdmin {
        require(approvers[_approver], "BankRegistry: not an approver");
        require(approverList.length > requiredApprovals, "BankRegistry: cannot remove, would break quorum");
        
        approvers[_approver] = false;
        
        // Remove from array
        for (uint256 i = 0; i < approverList.length; i++) {
            if (approverList[i] == _approver) {
                approverList[i] = approverList[approverList.length - 1];
                approverList.pop();
                break;
            }
        }
        
        emit ApproverRemoved(_approver);
    }
    
    /**
     * @notice Set required number of approvals
     * @param _required New required approvals count
     */
    function setRequiredApprovals(uint256 _required) external onlyAdmin {
        require(_required > 0, "BankRegistry: must require at least 1 approval");
        require(_required <= approverList.length, "BankRegistry: cannot exceed approver count");
        
        uint256 oldValue = requiredApprovals;
        requiredApprovals = _required;
        
        emit RequiredApprovalsChanged(oldValue, _required);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if a bank is registered
     * @param _bankAddress Address to check
     * @return True if registered
     */
    function isBankRegistered(address _bankAddress) external view returns (bool) {
        return banks[_bankAddress].isRegistered;
    }
    
    /**
     * @notice Check if a bank is active
     * @param _bankAddress Address to check
     * @return True if active
     */
    function isBankActive(address _bankAddress) external view returns (bool) {
        return banks[_bankAddress].isRegistered && banks[_bankAddress].isActive;
    }
    
    /**
     * @notice Get bank details
     * @param _bankAddress Address of the bank
     * @return name Bank name
     * @return bic Bank BIC/SWIFT code
     * @return country Country code
     * @return isActive Active status
     * @return complianceLevel Compliance tier
     */
    function getBankDetails(address _bankAddress) external view returns (
        string memory name,
        string memory bic,
        string memory country,
        bool isActive,
        string memory complianceLevel
    ) {
        Bank storage bank = banks[_bankAddress];
        return (bank.name, bank.bic, bank.country, bank.isActive, bank.complianceLevel);
    }
    
    /**
     * @notice Get total number of registered banks
     * @return Count of registered banks
     */
    function getBankCount() external view returns (uint256) {
        return registeredBankAddresses.length;
    }
    
    /**
     * @notice Get all registered bank addresses
     * @return Array of bank addresses
     */
    function getAllBanks() external view returns (address[] memory) {
        return registeredBankAddresses;
    }
    
    /**
     * @notice Get approver count
     * @return Number of approvers
     */
    function getApproverCount() external view returns (uint256) {
        return approverList.length;
    }
    
    /**
     * @notice Get all approvers
     * @return Array of approver addresses
     */
    function getAllApprovers() external view returns (address[] memory) {
        return approverList;
    }
    
    /**
     * @notice Check if address has approved a pending registration
     * @param _approvalId Approval ID
     * @param _approver Approver address
     * @return True if approved
     */
    function hasApproved(uint256 _approvalId, address _approver) external view returns (bool) {
        return pendingApprovals[_approvalId].approvals[_approver];
    }
    
    /**
     * @notice Get pending approval details
     * @param _approvalId Approval ID
     * @return bankAddress Address of the bank
     * @return name Bank name
     * @return approvalsCount Current approvals
     * @return executed Whether executed
     */
    function getApprovalDetails(uint256 _approvalId) external view returns (
        address bankAddress,
        string memory name,
        uint256 approvalsCount,
        bool executed
    ) {
        BankApproval storage approval = pendingApprovals[_approvalId];
        return (approval.bankAddress, approval.name, approval.approvalsCount, approval.executed);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfer admin role to new address
     * @param newAdmin Address of new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "BankRegistry: new admin is zero address");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
}
