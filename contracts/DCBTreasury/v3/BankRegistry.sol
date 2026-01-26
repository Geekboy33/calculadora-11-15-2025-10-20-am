// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║     ██████╗  █████╗ ███╗   ██╗██╗  ██╗    ██████╗ ███████╗ ██████╗ ██╗███████╗████████╗██████╗ ██╗   ██╗║
 * ║     ██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝    ██╔══██╗██╔════╝██╔════╝ ██║██╔════╝╚══██╔══╝██╔══██╗╚██╗ ██╔╝║
 * ║     ██████╔╝███████║██╔██╗ ██║█████╔╝     ██████╔╝█████╗  ██║  ███╗██║███████╗   ██║   ██████╔╝ ╚████╔╝ ║
 * ║     ██╔══██╗██╔══██║██║╚██╗██║██╔═██╗     ██╔══██╗██╔══╝  ██║   ██║██║╚════██║   ██║   ██╔══██╗  ╚██╔╝  ║
 * ║     ██████╔╝██║  ██║██║ ╚████║██║  ██╗    ██║  ██║███████╗╚██████╔╝██║███████║   ██║   ██║  ██║   ██║   ║
 * ║     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  BankRegistry v3.0 - DCB Treasury Bank Management System                                         ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  🔗 LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                 ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  FEATURES:                                                                                       ║
 * ║  ├─ 🏦 Multi-bank Registration & Management                                                      ║
 * ║  ├─ 🗳️  Governance Proposal System                                                                ║
 * ║  ├─ ✅ Multi-signature Approvals                                                                 ║
 * ║  ├─ 📊 Compliance Level Tracking                                                                 ║
 * ║  ├─ 🔐 KYC/AML Verification Status                                                               ║
 * ║  ├─ 📈 Transaction Volume Tracking                                                               ║
 * ║  ├─ ⏱️  Proposal Expiration System                                                                ║
 * ║  └─ 📝 Comprehensive Audit Trail                                                                 ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 * 
 * @title BankRegistry - DCB Treasury Bank Management v3.0
 * @author DCB Treasury Team
 * @notice Professional bank registry with governance capabilities
 * @dev Multi-sig approval system for bank management
 * @custom:security-contact security@dcbtreasury.com
 * @custom:version 3.0.0
 */

contract BankRegistry {
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              CONSTANTS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version
    string public constant VERSION = "3.0.0";
    
    /// @notice Official LUSD contract address
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice Minimum approvals required for proposals
    uint256 public constant MIN_APPROVALS = 2;
    
    /// @notice Default proposal duration (7 days)
    uint256 public constant DEFAULT_PROPOSAL_DURATION = 7 days;
    
    /// @notice Maximum banks allowed
    uint256 public constant MAX_BANKS = 1000;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               ENUMS                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Bank status enumeration
    enum BankStatus {
        PENDING,        // Awaiting approval
        ACTIVE,         // Fully operational
        SUSPENDED,      // Temporarily suspended
        REVOKED,        // Permanently revoked
        UNDER_REVIEW    // Under compliance review
    }
    
    /// @notice Compliance level enumeration
    enum ComplianceLevel {
        NONE,           // No compliance verification
        BASIC,          // Basic KYC
        STANDARD,       // Standard KYC + AML
        ENHANCED,       // Enhanced due diligence
        FULL            // Full regulatory compliance
    }
    
    /// @notice Proposal type enumeration
    enum ProposalType {
        REGISTER_BANK,
        UPDATE_STATUS,
        UPDATE_COMPLIANCE,
        REMOVE_BANK,
        UPDATE_SIGNER
    }
    
    /// @notice Proposal status enumeration
    enum ProposalStatus {
        PENDING,
        APPROVED,
        REJECTED,
        EXECUTED,
        EXPIRED
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               STRUCTS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Bank information structure
    struct Bank {
        bytes32 bankId;
        string name;
        string bic;
        string country;
        string jurisdiction;
        address walletAddress;
        address signerAddress;
        BankStatus status;
        ComplianceLevel complianceLevel;
        uint256 registeredAt;
        uint256 lastUpdatedAt;
        uint256 totalTransactions;
        uint256 totalVolume;
        bool kycVerified;
        bool amlVerified;
    }
    
    /// @notice Proposal structure
    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address targetBank;
        bytes data;
        address proposer;
        uint256 createdAt;
        uint256 expiresAt;
        ProposalStatus status;
        uint256 approvalCount;
        uint256 rejectionCount;
        string description;
    }
    
    /// @notice Vote record
    struct Vote {
        address voter;
        bool approved;
        string comment;
        uint256 timestamp;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                            STATE VARIABLES                                ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract admin
    address public admin;
    
    /// @notice Pending admin for 2-step transfer
    address public pendingAdmin;
    
    /// @notice Contract paused state
    bool public paused;
    
    /// @notice Required approvals for proposals
    uint256 public requiredApprovals;
    
    /// @notice Proposal duration
    uint256 public proposalDuration;
    
    /// @notice Total proposals created
    uint256 public proposalCount;
    
    /// @notice Deployment timestamp
    uint256 public immutable deployedAt;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              MAPPINGS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Approvers mapping
    mapping(address => bool) public approvers;
    
    /// @notice Banks by address
    mapping(address => Bank) public banks;
    
    /// @notice Banks by ID
    mapping(bytes32 => address) public bankById;
    
    /// @notice Banks by BIC
    mapping(string => address) public bankByBic;
    
    /// @notice Registered bank addresses
    address[] public registeredBanks;
    
    /// @notice Bank registered flag
    mapping(address => bool) public isBankRegistered;
    
    /// @notice Proposals mapping
    mapping(uint256 => Proposal) public proposals;
    
    /// @notice Proposal votes
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice Proposal vote records
    mapping(uint256 => Vote[]) public proposalVotes;
    
    /// @notice Approvers list
    address[] public approversList;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               EVENTS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Bank registered event
    event BankRegistered(
        address indexed bankAddress,
        bytes32 indexed bankId,
        string name,
        string bic,
        address indexed registeredBy,
        uint256 timestamp
    );
    
    /// @notice Bank status changed event
    event BankStatusChanged(
        address indexed bankAddress,
        BankStatus oldStatus,
        BankStatus newStatus,
        address indexed changedBy,
        uint256 timestamp
    );
    
    /// @notice Bank compliance updated event
    event BankComplianceUpdated(
        address indexed bankAddress,
        ComplianceLevel oldLevel,
        ComplianceLevel newLevel,
        address indexed updatedBy,
        uint256 timestamp
    );
    
    /// @notice Bank removed event
    event BankRemoved(
        address indexed bankAddress,
        bytes32 indexed bankId,
        address indexed removedBy,
        uint256 timestamp
    );
    
    /// @notice Proposal created event
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        address indexed proposer,
        address targetBank,
        string description,
        uint256 expiresAt
    );
    
    /// @notice Vote cast event
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool approved,
        string comment,
        uint256 timestamp
    );
    
    /// @notice Proposal executed event
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        uint256 timestamp
    );
    
    /// @notice Proposal rejected event
    event ProposalRejected(
        uint256 indexed proposalId,
        uint256 timestamp
    );
    
    /// @notice Proposal expired event
    event ProposalExpired(
        uint256 indexed proposalId,
        uint256 timestamp
    );
    
    /// @notice Approver events
    event ApproverAdded(address indexed approver, address indexed addedBy, uint256 timestamp);
    event ApproverRemoved(address indexed approver, address indexed removedBy, uint256 timestamp);
    
    /// @notice Admin events
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed previousAdmin, address indexed newAdmin);
    
    /// @notice State events
    event Paused(address indexed pausedBy, uint256 timestamp);
    event Unpaused(address indexed unpausedBy, uint256 timestamp);
    
    /// @notice Transaction recorded event
    event TransactionRecorded(
        address indexed bankAddress,
        uint256 amount,
        uint256 newTotalVolume,
        uint256 timestamp
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               ERRORS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    error Unauthorized();
    error ZeroAddress();
    error InvalidBIC();
    error InvalidCountry();
    error BankExists();
    error BankNotFound();
    error NotApprover();
    error AlreadyVoted();
    error ProposalNotFound();
    error ProposalExpiredError();
    error ProposalNotPending();
    error InsufficientApprovals();
    error ContractPaused();
    error MaxBanksReached();
    error InvalidProposalType();
    error NoPendingAdmin();
    error NotPendingAdmin();
    error AlreadyApprover();
    error BankNotActive();
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              MODIFIERS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }
    
    modifier onlyApprover() {
        if (!approvers[msg.sender] && msg.sender != admin) revert NotApprover();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier bankExists(address bankAddress) {
        if (!isBankRegistered[bankAddress]) revert BankNotFound();
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        if (proposalId == 0 || proposalId > proposalCount) revert ProposalNotFound();
        _;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                             CONSTRUCTOR                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Deploys the BankRegistry contract
     */
    constructor() {
        admin = msg.sender;
        approvers[msg.sender] = true;
        approversList.push(msg.sender);
        
        deployedAt = block.timestamp;
        requiredApprovals = MIN_APPROVALS;
        proposalDuration = DEFAULT_PROPOSAL_DURATION;
        
        emit AdminTransferCompleted(address(0), msg.sender);
        emit ApproverAdded(msg.sender, address(0), block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                      BANK REGISTRATION (DIRECT)                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Registers a new bank directly (admin only)
     * @param bankAddress Bank wallet address
     * @param name Bank name
     * @param bic Bank BIC code
     * @param country Bank country
     * @param jurisdiction Bank jurisdiction
     * @param signerAddress Bank signer address
     */
    function registerBank(
        address bankAddress,
        string calldata name,
        string calldata bic,
        string calldata country,
        string calldata jurisdiction,
        address signerAddress
    ) external onlyAdmin whenNotPaused {
        _registerBank(bankAddress, name, bic, country, jurisdiction, signerAddress);
    }
    
    /**
     * @notice Updates bank status directly (admin only)
     * @param bankAddress Bank address
     * @param newStatus New status
     */
    function updateBankStatus(address bankAddress, BankStatus newStatus) 
        external 
        onlyAdmin 
        whenNotPaused 
        bankExists(bankAddress) 
    {
        Bank storage bank = banks[bankAddress];
        BankStatus oldStatus = bank.status;
        
        bank.status = newStatus;
        bank.lastUpdatedAt = block.timestamp;
        
        emit BankStatusChanged(bankAddress, oldStatus, newStatus, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Updates bank compliance level directly (admin only)
     * @param bankAddress Bank address
     * @param newLevel New compliance level
     */
    function updateBankCompliance(address bankAddress, ComplianceLevel newLevel)
        external
        onlyAdmin
        whenNotPaused
        bankExists(bankAddress)
    {
        Bank storage bank = banks[bankAddress];
        ComplianceLevel oldLevel = bank.complianceLevel;
        
        bank.complianceLevel = newLevel;
        bank.lastUpdatedAt = block.timestamp;
        
        emit BankComplianceUpdated(bankAddress, oldLevel, newLevel, msg.sender, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         PROPOSAL SYSTEM                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Creates a new proposal
     * @param proposalType Type of proposal
     * @param targetBank Target bank address
     * @param data Encoded proposal data
     * @param description Proposal description
     * @return proposalId New proposal ID
     */
    function createProposal(
        ProposalType proposalType,
        address targetBank,
        bytes calldata data,
        string calldata description
    ) external onlyApprover whenNotPaused returns (uint256 proposalId) {
        // Validate based on proposal type
        if (proposalType == ProposalType.REGISTER_BANK) {
            if (isBankRegistered[targetBank]) revert BankExists();
        } else {
            if (!isBankRegistered[targetBank]) revert BankNotFound();
        }
        
        proposalCount++;
        proposalId = proposalCount;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: proposalType,
            targetBank: targetBank,
            data: data,
            proposer: msg.sender,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + proposalDuration,
            status: ProposalStatus.PENDING,
            approvalCount: 0,
            rejectionCount: 0,
            description: description
        });
        
        emit ProposalCreated(
            proposalId,
            proposalType,
            msg.sender,
            targetBank,
            description,
            block.timestamp + proposalDuration
        );
        
        return proposalId;
    }
    
    /**
     * @notice Votes on a proposal
     * @param proposalId Proposal ID
     * @param approve Whether to approve
     * @param comment Vote comment
     */
    function vote(uint256 proposalId, bool approve, string calldata comment)
        external
        onlyApprover
        whenNotPaused
        proposalExists(proposalId)
    {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.status != ProposalStatus.PENDING) revert ProposalNotPending();
        if (block.timestamp > proposal.expiresAt) {
            proposal.status = ProposalStatus.EXPIRED;
            emit ProposalExpired(proposalId, block.timestamp);
            revert ProposalExpiredError();
        }
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        
        hasVoted[proposalId][msg.sender] = true;
        
        if (approve) {
            proposal.approvalCount++;
        } else {
            proposal.rejectionCount++;
        }
        
        proposalVotes[proposalId].push(Vote({
            voter: msg.sender,
            approved: approve,
            comment: comment,
            timestamp: block.timestamp
        }));
        
        emit VoteCast(proposalId, msg.sender, approve, comment, block.timestamp);
        
        // Auto-execute if enough approvals
        if (proposal.approvalCount >= requiredApprovals) {
            _executeProposal(proposalId);
        }
    }
    
    /**
     * @notice Executes an approved proposal
     * @param proposalId Proposal ID
     */
    function executeProposal(uint256 proposalId)
        external
        onlyApprover
        whenNotPaused
        proposalExists(proposalId)
    {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.status != ProposalStatus.PENDING) revert ProposalNotPending();
        if (block.timestamp > proposal.expiresAt) {
            proposal.status = ProposalStatus.EXPIRED;
            emit ProposalExpired(proposalId, block.timestamp);
            revert ProposalExpiredError();
        }
        if (proposal.approvalCount < requiredApprovals) revert InsufficientApprovals();
        
        _executeProposal(proposalId);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                      BANK TRANSACTION TRACKING                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Records a transaction for a bank
     * @param bankAddress Bank address
     * @param amount Transaction amount
     */
    function recordTransaction(address bankAddress, uint256 amount)
        external
        onlyApprover
        whenNotPaused
        bankExists(bankAddress)
    {
        Bank storage bank = banks[bankAddress];
        if (bank.status != BankStatus.ACTIVE) revert BankNotActive();
        
        bank.totalTransactions++;
        bank.totalVolume += amount;
        bank.lastUpdatedAt = block.timestamp;
        
        emit TransactionRecorded(bankAddress, amount, bank.totalVolume, block.timestamp);
    }
    
    /**
     * @notice Updates KYC verification status
     * @param bankAddress Bank address
     * @param verified Verification status
     */
    function updateKYCStatus(address bankAddress, bool verified)
        external
        onlyAdmin
        bankExists(bankAddress)
    {
        banks[bankAddress].kycVerified = verified;
        banks[bankAddress].lastUpdatedAt = block.timestamp;
    }
    
    /**
     * @notice Updates AML verification status
     * @param bankAddress Bank address
     * @param verified Verification status
     */
    function updateAMLStatus(address bankAddress, bool verified)
        external
        onlyAdmin
        bankExists(bankAddress)
    {
        banks[bankAddress].amlVerified = verified;
        banks[bankAddress].lastUpdatedAt = block.timestamp;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         ADMIN FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Initiates admin transfer
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }
    
    /**
     * @notice Accepts admin transfer
     */
    function acceptAdmin() external {
        if (pendingAdmin == address(0)) revert NoPendingAdmin();
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        
        address previousAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        
        emit AdminTransferCompleted(previousAdmin, admin);
    }
    
    /**
     * @notice Adds an approver
     * @param approver Approver address
     */
    function addApprover(address approver) external onlyAdmin {
        if (approver == address(0)) revert ZeroAddress();
        if (approvers[approver]) revert AlreadyApprover();
        
        approvers[approver] = true;
        approversList.push(approver);
        
        emit ApproverAdded(approver, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Removes an approver
     * @param approver Approver address
     */
    function removeApprover(address approver) external onlyAdmin {
        if (!approvers[approver]) revert NotApprover();
        
        approvers[approver] = false;
        
        // Remove from list
        for (uint256 i = 0; i < approversList.length; i++) {
            if (approversList[i] == approver) {
                approversList[i] = approversList[approversList.length - 1];
                approversList.pop();
                break;
            }
        }
        
        emit ApproverRemoved(approver, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Sets required approvals
     * @param _requiredApprovals New required approvals
     */
    function setRequiredApprovals(uint256 _requiredApprovals) external onlyAdmin {
        require(_requiredApprovals >= MIN_APPROVALS, "Below minimum");
        requiredApprovals = _requiredApprovals;
    }
    
    /**
     * @notice Sets proposal duration
     * @param _duration New duration in seconds
     */
    function setProposalDuration(uint256 _duration) external onlyAdmin {
        require(_duration >= 1 days, "Duration too short");
        proposalDuration = _duration;
    }
    
    /**
     * @notice Pauses the contract
     */
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                          VIEW FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets bank details
     * @param bankAddress Bank address
     * @return Bank struct data
     */
    function getBank(address bankAddress) 
        external 
        view 
        bankExists(bankAddress) 
        returns (Bank memory) 
    {
        return banks[bankAddress];
    }
    
    /**
     * @notice Gets bank by BIC
     * @param bic Bank BIC code
     * @return Bank address
     */
    function getBankByBIC(string calldata bic) external view returns (address) {
        return bankByBic[bic];
    }
    
    /**
     * @notice Gets all registered banks
     * @return Array of bank addresses
     */
    function getAllBanks() external view returns (address[] memory) {
        return registeredBanks;
    }
    
    /**
     * @notice Gets bank count
     * @return Number of registered banks
     */
    function getBankCount() external view returns (uint256) {
        return registeredBanks.length;
    }
    
    /**
     * @notice Gets active banks
     * @return Array of active bank addresses
     */
    function getActiveBanks() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active banks
        for (uint256 i = 0; i < registeredBanks.length; i++) {
            if (banks[registeredBanks[i]].status == BankStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        // Build result array
        address[] memory activeBanks = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < registeredBanks.length; i++) {
            if (banks[registeredBanks[i]].status == BankStatus.ACTIVE) {
                activeBanks[index] = registeredBanks[i];
                index++;
            }
        }
        
        return activeBanks;
    }
    
    /**
     * @notice Gets proposal details
     * @param proposalId Proposal ID
     * @return Proposal struct data
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (Proposal memory) 
    {
        return proposals[proposalId];
    }
    
    /**
     * @notice Gets proposal votes
     * @param proposalId Proposal ID
     * @return Array of votes
     */
    function getProposalVotes(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (Vote[] memory) 
    {
        return proposalVotes[proposalId];
    }
    
    /**
     * @notice Gets all approvers
     * @return Array of approver addresses
     */
    function getApprovers() external view returns (address[] memory) {
        return approversList;
    }
    
    /**
     * @notice Gets approver count
     * @return Number of approvers
     */
    function getApproverCount() external view returns (uint256) {
        return approversList.length;
    }
    
    /**
     * @notice Checks if address is approver
     * @param account Address to check
     * @return True if approver
     */
    function isApprover(address account) external view returns (bool) {
        return approvers[account];
    }
    
    /**
     * @notice Gets registry statistics
     * @return _bankCount Total banks
     * @return _proposalCount Total proposals
     * @return _approverCount Total approvers
     * @return _deployedAt Deployment timestamp
     */
    function getStatistics() external view returns (
        uint256 _bankCount,
        uint256 _proposalCount,
        uint256 _approverCount,
        uint256 _deployedAt
    ) {
        return (registeredBanks.length, proposalCount, approversList.length, deployedAt);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        INTERNAL FUNCTIONS                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Internal bank registration
     */
    function _registerBank(
        address bankAddress,
        string memory name,
        string memory bic,
        string memory country,
        string memory jurisdiction,
        address signerAddress
    ) internal {
        if (bankAddress == address(0)) revert ZeroAddress();
        if (signerAddress == address(0)) revert ZeroAddress();
        if (bytes(bic).length == 0) revert InvalidBIC();
        if (bytes(country).length == 0) revert InvalidCountry();
        if (isBankRegistered[bankAddress]) revert BankExists();
        if (registeredBanks.length >= MAX_BANKS) revert MaxBanksReached();
        
        bytes32 bankId = keccak256(abi.encodePacked(bankAddress, bic, block.timestamp));
        
        banks[bankAddress] = Bank({
            bankId: bankId,
            name: name,
            bic: bic,
            country: country,
            jurisdiction: jurisdiction,
            walletAddress: bankAddress,
            signerAddress: signerAddress,
            status: BankStatus.ACTIVE,
            complianceLevel: ComplianceLevel.BASIC,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            totalTransactions: 0,
            totalVolume: 0,
            kycVerified: false,
            amlVerified: false
        });
        
        bankById[bankId] = bankAddress;
        bankByBic[bic] = bankAddress;
        registeredBanks.push(bankAddress);
        isBankRegistered[bankAddress] = true;
        
        emit BankRegistered(bankAddress, bankId, name, bic, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Internal proposal execution
     */
    function _executeProposal(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        proposal.status = ProposalStatus.EXECUTED;
        
        if (proposal.proposalType == ProposalType.REGISTER_BANK) {
            // Decode and register bank
            (
                string memory name,
                string memory bic,
                string memory country,
                string memory jurisdiction,
                address signerAddress
            ) = abi.decode(proposal.data, (string, string, string, string, address));
            
            _registerBank(proposal.targetBank, name, bic, country, jurisdiction, signerAddress);
            
        } else if (proposal.proposalType == ProposalType.UPDATE_STATUS) {
            BankStatus newStatus = abi.decode(proposal.data, (BankStatus));
            Bank storage bank = banks[proposal.targetBank];
            BankStatus oldStatus = bank.status;
            bank.status = newStatus;
            bank.lastUpdatedAt = block.timestamp;
            
            emit BankStatusChanged(proposal.targetBank, oldStatus, newStatus, msg.sender, block.timestamp);
            
        } else if (proposal.proposalType == ProposalType.UPDATE_COMPLIANCE) {
            ComplianceLevel newLevel = abi.decode(proposal.data, (ComplianceLevel));
            Bank storage bank = banks[proposal.targetBank];
            ComplianceLevel oldLevel = bank.complianceLevel;
            bank.complianceLevel = newLevel;
            bank.lastUpdatedAt = block.timestamp;
            
            emit BankComplianceUpdated(proposal.targetBank, oldLevel, newLevel, msg.sender, block.timestamp);
            
        } else if (proposal.proposalType == ProposalType.REMOVE_BANK) {
            Bank storage bank = banks[proposal.targetBank];
            bank.status = BankStatus.REVOKED;
            bank.lastUpdatedAt = block.timestamp;
            
            emit BankRemoved(proposal.targetBank, bank.bankId, msg.sender, block.timestamp);
            
        } else if (proposal.proposalType == ProposalType.UPDATE_SIGNER) {
            address newSigner = abi.decode(proposal.data, (address));
            banks[proposal.targetBank].signerAddress = newSigner;
            banks[proposal.targetBank].lastUpdatedAt = block.timestamp;
        }
        
        emit ProposalExecuted(proposalId, msg.sender, block.timestamp);
    }
}
