// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🏛️ DCB GOVERNANCE - ON-CHAIN VOTING & PROPOSAL SYSTEM                                           ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                                       ║
 * ║  ├─ Proposal creation and voting                                                                 ║
 * ║  ├─ Quorum requirements                                                                          ║
 * ║  ├─ Voting power based on stake                                                                  ║
 * ║  ├─ Timelock integration                                                                         ║
 * ║  └─ Emergency proposals                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DCBGovernance
 * @author Digital Commercial Bank Ltd
 * @notice On-chain governance for DCB Treasury system
 */
contract DCBGovernance is AccessControl, ReentrancyGuard {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    string public constant VERSION = "1.0.0";
    
    /// @notice Minimum voting period (3 days)
    uint256 public constant MIN_VOTING_PERIOD = 3 days;
    
    /// @notice Maximum voting period (14 days)
    uint256 public constant MAX_VOTING_PERIOD = 14 days;
    
    /// @notice Proposal threshold (minimum voting power to create proposal)
    uint256 public constant PROPOSAL_THRESHOLD = 100_000 * 1e6; // 100k USD equivalent
    
    /// @notice Quorum percentage (10% = 1000 basis points)
    uint256 public constant QUORUM_BPS = 1000;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    enum VoteType {
        Against,
        For,
        Abstain
    }
    
    enum ProposalCategory {
        PARAMETER_CHANGE,
        CONTRACT_UPGRADE,
        ROLE_ASSIGNMENT,
        EMERGENCY,
        TREASURY_ACTION,
        ORACLE_UPDATE,
        KYC_POLICY
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct Proposal {
        uint256 proposalId;
        address proposer;
        
        // Targets
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string[] signatures;
        
        // Metadata
        string title;
        string description;
        ProposalCategory category;
        
        // Timing
        uint256 startBlock;
        uint256 endBlock;
        uint256 startTime;
        uint256 endTime;
        
        // Votes
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        
        // State
        bool canceled;
        bool executed;
        uint256 eta; // Execution time after queue
    }
    
    struct Vote {
        bool hasVoted;
        VoteType voteType;
        uint256 votingPower;
        uint256 votedAt;
        string reason;
    }
    
    struct VotingPower {
        uint256 baseVotes;
        uint256 delegatedVotes;
        uint256 totalVotes;
        address delegate;
        uint256 lastUpdated;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Timelock contract
    address public timelock;
    
    /// @notice Voting period in blocks
    uint256 public votingPeriod;
    
    /// @notice Voting delay in blocks
    uint256 public votingDelay;
    
    /// @notice Total voting power
    uint256 public totalVotingPower;
    
    /// @notice Proposals
    mapping(uint256 => Proposal) public proposals;
    uint256[] public proposalIds;
    uint256 public proposalCount;
    
    /// @notice Votes by proposal and voter
    mapping(uint256 => mapping(address => Vote)) public votes;
    
    /// @notice Voting power by address
    mapping(address => VotingPower) public votingPowers;
    
    /// @notice Delegation
    mapping(address => address) public delegates;
    
    /// @notice Proposal hashes for uniqueness
    mapping(bytes32 => bool) public proposalHashes;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        ProposalCategory category,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteType voteType,
        uint256 votingPower,
        string reason
    );
    
    event ProposalCanceled(
        uint256 indexed proposalId,
        address canceledBy
    );
    
    event ProposalQueued(
        uint256 indexed proposalId,
        uint256 eta
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address executor
    );
    
    event VotingPowerUpdated(
        address indexed account,
        uint256 oldPower,
        uint256 newPower
    );
    
    event DelegateChanged(
        address indexed delegator,
        address indexed fromDelegate,
        address indexed toDelegate
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _admin,
        address _timelock,
        uint256 _votingPeriod,
        uint256 _votingDelay
    ) {
        require(_admin != address(0), "Invalid admin");
        require(_votingPeriod >= MIN_VOTING_PERIOD && _votingPeriod <= MAX_VOTING_PERIOD, "Invalid voting period");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PROPOSER_ROLE, _admin);
        _grantRole(VOTER_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        
        timelock = _timelock;
        votingPeriod = _votingPeriod;
        votingDelay = _votingDelay;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PROPOSAL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Creates a new proposal
     */
    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        string[] calldata signatures,
        string calldata title,
        string calldata description,
        ProposalCategory category
    ) external onlyRole(PROPOSER_ROLE) returns (uint256 proposalId) {
        require(targets.length > 0, "Empty proposal");
        require(targets.length == values.length, "Length mismatch");
        require(targets.length == calldatas.length, "Length mismatch");
        require(bytes(title).length > 0, "Empty title");
        
        // Check proposer has enough voting power
        require(
            votingPowers[msg.sender].totalVotes >= PROPOSAL_THRESHOLD,
            "Below proposal threshold"
        );
        
        // Generate unique proposal ID
        bytes32 proposalHash = keccak256(abi.encodePacked(
            targets, values, calldatas, keccak256(bytes(description))
        ));
        require(!proposalHashes[proposalHash], "Duplicate proposal");
        proposalHashes[proposalHash] = true;
        
        proposalId = ++proposalCount;
        
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;
        
        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            proposer: msg.sender,
            targets: targets,
            values: values,
            calldatas: calldatas,
            signatures: signatures,
            title: title,
            description: description,
            category: category,
            startBlock: block.number + (votingDelay / 12), // Approximate blocks
            endBlock: block.number + ((votingDelay + votingPeriod) / 12),
            startTime: startTime,
            endTime: endTime,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false,
            eta: 0
        });
        
        proposalIds.push(proposalId);
        
        emit ProposalCreated(proposalId, msg.sender, title, category, startTime, endTime);
        
        return proposalId;
    }
    
    /**
     * @notice Casts a vote
     */
    function castVote(
        uint256 proposalId,
        VoteType voteType,
        string calldata reason
    ) external onlyRole(VOTER_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.proposalId != 0, "Proposal not found");
        require(state(proposalId) == ProposalState.Active, "Voting not active");
        
        Vote storage vote = votes[proposalId][msg.sender];
        require(!vote.hasVoted, "Already voted");
        
        uint256 votingPower = getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");
        
        vote.hasVoted = true;
        vote.voteType = voteType;
        vote.votingPower = votingPower;
        vote.votedAt = block.timestamp;
        vote.reason = reason;
        
        if (voteType == VoteType.For) {
            proposal.forVotes += votingPower;
        } else if (voteType == VoteType.Against) {
            proposal.againstVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, voteType, votingPower, reason);
    }
    
    /**
     * @notice Queues a successful proposal
     */
    function queue(uint256 proposalId) external {
        require(state(proposalId) == ProposalState.Succeeded, "Not succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        uint256 eta = block.timestamp + 1 days; // 1 day timelock
        
        proposal.eta = eta;
        
        emit ProposalQueued(proposalId, eta);
    }
    
    /**
     * @notice Executes a queued proposal
     */
    function execute(uint256 proposalId) external payable onlyRole(EXECUTOR_ROLE) nonReentrant {
        require(state(proposalId) == ProposalState.Queued, "Not queued");
        
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.eta, "Timelock not expired");
        require(block.timestamp <= proposal.eta + 14 days, "Proposal expired");
        
        proposal.executed = true;
        
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, bytes memory returnData) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            require(success, string(returnData));
        }
        
        emit ProposalExecuted(proposalId, msg.sender);
    }
    
    /**
     * @notice Cancels a proposal
     */
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.proposalId != 0, "Proposal not found");
        require(!proposal.executed, "Already executed");
        require(
            msg.sender == proposal.proposer || hasRole(GUARDIAN_ROLE, msg.sender),
            "Not authorized"
        );
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VOTING POWER
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Sets voting power for an account
     */
    function setVotingPower(address account, uint256 power) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldPower = votingPowers[account].totalVotes;
        
        votingPowers[account].baseVotes = power;
        votingPowers[account].totalVotes = power + votingPowers[account].delegatedVotes;
        votingPowers[account].lastUpdated = block.timestamp;
        
        totalVotingPower = totalVotingPower - oldPower + votingPowers[account].totalVotes;
        
        emit VotingPowerUpdated(account, oldPower, votingPowers[account].totalVotes);
    }
    
    /**
     * @notice Delegates voting power
     */
    function delegate(address delegatee) external {
        require(delegatee != address(0), "Invalid delegatee");
        require(delegatee != msg.sender, "Cannot self-delegate");
        
        address oldDelegate = delegates[msg.sender];
        delegates[msg.sender] = delegatee;
        
        uint256 delegatorPower = votingPowers[msg.sender].baseVotes;
        
        if (oldDelegate != address(0)) {
            votingPowers[oldDelegate].delegatedVotes -= delegatorPower;
            votingPowers[oldDelegate].totalVotes -= delegatorPower;
        }
        
        votingPowers[delegatee].delegatedVotes += delegatorPower;
        votingPowers[delegatee].totalVotes += delegatorPower;
        
        votingPowers[msg.sender].delegate = delegatee;
        
        emit DelegateChanged(msg.sender, oldDelegate, delegatee);
    }
    
    function getVotingPower(address account) public view returns (uint256) {
        return votingPowers[account].totalVotes;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.proposalId == 0) return ProposalState.Pending;
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;
        
        // Check if quorum reached
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorum = (totalVotingPower * QUORUM_BPS) / BPS_DENOMINATOR;
        
        if (totalVotes < quorum) return ProposalState.Defeated;
        if (proposal.forVotes <= proposal.againstVotes) return ProposalState.Defeated;
        if (proposal.eta == 0) return ProposalState.Succeeded;
        if (block.timestamp >= proposal.eta + 14 days) return ProposalState.Expired;
        
        return ProposalState.Queued;
    }
    
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }
    
    function getAllProposalIds() external view returns (uint256[] memory) {
        return proposalIds;
    }
    
    function getActiveProposals() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < proposalIds.length; i++) {
            if (state(proposalIds[i]) == ProposalState.Active) {
                count++;
            }
        }
        
        uint256[] memory active = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < proposalIds.length; i++) {
            if (state(proposalIds[i]) == ProposalState.Active) {
                active[idx++] = proposalIds[i];
            }
        }
        
        return active;
    }
    
    function quorumVotes() external view returns (uint256) {
        return (totalVotingPower * QUORUM_BPS) / BPS_DENOMINATOR;
    }
    
    receive() external payable {}
}
