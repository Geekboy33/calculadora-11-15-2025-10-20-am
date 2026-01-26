// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║      ██████╗██╗   ██╗███████╗████████╗ ██████╗ ██████╗ ██╗   ██╗                                 ║
 * ║     ██╔════╝██║   ██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝                                 ║
 * ║     ██║     ██║   ██║███████╗   ██║   ██║   ██║██║  ██║ ╚████╔╝                                  ║
 * ║     ██║     ██║   ██║╚════██║   ██║   ██║   ██║██║  ██║  ╚██╔╝                                   ║
 * ║     ╚██████╗╚██████╔╝███████║   ██║   ╚██████╔╝██████╔╝   ██║                                    ║
 * ║      ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝    ╚═╝                                    ║
 * ║                                                                                                  ║
 * ║     ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗                                                     ║
 * ║     ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝                                                     ║
 * ║     ██║   ██║███████║██║   ██║██║     ██║                                                        ║
 * ║     ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║                                                        ║
 * ║      ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║                                                        ║
 * ║       ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  CustodyVault v3.0 - DCB Treasury Certification Platform                                         ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  📋 FLUJO DCB TREASURY:                                                                          ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │  1. CUSTODY ACCOUNT (M1 Banking)                                                            │ ║
 * ║  │     └─→ Usuario selecciona cuenta custodio con fondos USD                                   │ ║
 * ║  │                                                                                             │ ║
 * ║  │  2. CUSTODY VAULT (Este Contrato)                                                           │ ║
 * ║  │     └─→ Se crea vault en blockchain con fondos reservados                                   │ ║
 * ║  │     └─→ Fondos quedan bloqueados y respaldados                                              │ ║
 * ║  │                                                                                             │ ║
 * ║  │  3. LOCK REQUEST                                                                            │ ║
 * ║  │     └─→ Banco firma solicitud de lock con EIP-712                                           │ ║
 * ║  │     └─→ Se genera lockId único con trazabilidad ISO 20022                                   │ ║
 * ║  │                                                                                             │ ║
 * ║  │  4. CONSUME & MINT                                                                          │ ║
 * ║  │     └─→ Operador consume el lock y genera código de autorización                            │ ║
 * ║  │     └─→ Código MINT-XXXX-YYYY enviado a LEMX                                                │ ║
 * ║  │                                                                                             │ ║
 * ║  │  5. LEMX AUTHORIZATION                                                                      │ ║
 * ║  │     └─→ LEMX verifica código y mintea LUSD                                                  │ ║
 * ║  │     └─→ Se publica en Mint Explorer con hash de transacción                                 │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                                                  ║
 * ║  🔗 LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1006)                                                 ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 * 
 * @title CustodyVault - DCB Treasury Custody Vault v3.0
 * @author DCB Treasury Team
 * @notice Manages custody vaults for USD funds backing LUSD minting
 * @dev Part of the DCB Treasury Certification Platform
 * @custom:security-contact security@dcbtreasury.com
 * @custom:version 3.0.0
 */

import "./interfaces/ILUSD.sol";

/**
 * @title CustodyVault
 * @notice Custody vault contract for DCB Treasury - manages USD funds for LUSD minting
 */
contract CustodyVault {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract version
    string public constant VERSION = "3.0.0";
    
    /// @notice Contract name for EIP-712
    string public constant NAME = "DCB CustodyVault";
    
    /// @notice Official LUSD contract
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LemonChain ID
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice EIP-712 Domain Separator
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    /// @notice Lock request typehash
    bytes32 public constant LOCK_REQUEST_TYPEHASH = keccak256(
        "LockRequest(uint256 vaultId,uint256 amount,address beneficiary,bytes32 isoHash,uint256 expiry,uint256 nonce)"
    );
    
    /// @notice Mint authorization typehash
    bytes32 public constant MINT_AUTH_TYPEHASH = keccak256(
        "MintAuthorization(bytes32 lockId,uint256 amount,address beneficiary,bytes32 authCode,uint256 deadline)"
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Vault status
    enum VaultStatus { ACTIVE, FROZEN, CLOSED }
    
    /// @notice Lock status
    enum LockStatus { PENDING, LOCKED, CONSUMED, CANCELLED, EXPIRED }
    
    /// @notice Mint authorization status
    enum MintAuthStatus { PENDING, APPROVED, MINTED, REJECTED, EXPIRED }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Vault information
    struct Vault {
        uint256 id;
        address owner;
        uint256 totalBalance;       // Total USD deposited
        uint256 availableBalance;   // Available for locking
        uint256 lockedBalance;      // Currently locked
        uint256 mintedBalance;      // Already minted to LUSD
        VaultStatus status;
        bytes32 metadataHash;       // Reference to off-chain data
        string sourceBankAccount;   // Source custody account reference
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    /// @notice Lock information
    struct Lock {
        bytes32 lockId;
        uint256 vaultId;
        uint256 amount;
        address beneficiary;
        address bankSigner;
        bytes32 isoHash;            // ISO 20022 message hash
        bytes32 daesTxnId;          // DAES transaction ID
        uint256 expiry;
        LockStatus status;
        uint256 createdAt;
        uint256 consumedAt;
        bytes32 authorizationCode;  // MINT-XXXX-YYYY code
    }
    
    /// @notice Mint authorization
    struct MintAuthorization {
        bytes32 authCode;           // Authorization code (MINT-XXXX-YYYY)
        bytes32 lockId;
        uint256 amount;
        address beneficiary;
        MintAuthStatus status;
        uint256 createdAt;
        uint256 deadline;
        bytes32 mintTxHash;         // LEMX minting transaction hash
        address mintedBy;           // LEMX operator who minted
        uint256 mintedAt;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Admin address
    address public admin;
    
    /// @notice Pending admin for 2-step transfer
    address public pendingAdmin;
    
    /// @notice Treasury address (receives fees)
    address public treasury;
    
    /// @notice LEMX minting bridge address
    address public mintingBridge;
    
    /// @notice Bank registry contract
    address public bankRegistry;
    
    /// @notice Contract paused state
    bool public paused;
    
    /// @notice Next vault ID
    uint256 public nextVaultId;
    
    /// @notice Total vaults created
    uint256 public totalVaults;
    
    /// @notice Total USD locked
    uint256 public totalLocked;
    
    /// @notice Total LUSD minted through this contract
    uint256 public totalMinted;
    
    /// @notice Vault operators
    mapping(address => bool) public operators;
    
    /// @notice Bank signers
    mapping(address => bool) public bankSigners;
    
    /// @notice Vaults by ID
    mapping(uint256 => Vault) public vaults;
    
    /// @notice Locks by ID
    mapping(bytes32 => Lock) public locks;
    
    /// @notice Mint authorizations by code
    mapping(bytes32 => MintAuthorization) public mintAuthorizations;
    
    /// @notice User vaults
    mapping(address => uint256[]) public userVaults;
    
    /// @notice Vault locks
    mapping(uint256 => bytes32[]) public vaultLocks;
    
    /// @notice Nonces for signatures
    mapping(address => uint256) public nonces;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when vault is created
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed owner,
        uint256 amount,
        string sourceBankAccount,
        bytes32 metadataHash
    );
    
    /// @notice Emitted when funds are deposited
    event FundsDeposited(
        uint256 indexed vaultId,
        uint256 amount,
        uint256 newBalance
    );
    
    /// @notice Emitted when lock is created
    event LockCreated(
        bytes32 indexed lockId,
        uint256 indexed vaultId,
        uint256 amount,
        address beneficiary,
        address bankSigner,
        bytes32 isoHash
    );
    
    /// @notice Emitted when lock is consumed
    event LockConsumed(
        bytes32 indexed lockId,
        bytes32 indexed authorizationCode,
        address operator,
        uint256 timestamp
    );
    
    /// @notice Emitted when mint authorization is created
    event MintAuthorizationCreated(
        bytes32 indexed authCode,
        bytes32 indexed lockId,
        uint256 amount,
        address beneficiary,
        uint256 deadline
    );
    
    /// @notice Emitted when LUSD is minted
    event LUSDMinted(
        bytes32 indexed authCode,
        bytes32 indexed mintTxHash,
        uint256 amount,
        address beneficiary,
        address mintedBy
    );
    
    /// @notice Emitted when admin is changed
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);
    
    /// @notice Emitted when contract is paused/unpaused
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error NotAdmin();
    error NotOperator();
    error NotBankSigner();
    error NotPendingAdmin();
    error ContractPaused();
    error ZeroAddress();
    error ZeroAmount();
    error VaultNotFound();
    error VaultNotActive();
    error InsufficientBalance();
    error LockNotFound();
    error LockNotLocked();
    error LockExpired();
    error InvalidSignature();
    error AuthorizationNotFound();
    error AuthorizationExpired();
    error AuthorizationAlreadyUsed();
    error InvalidAuthCode();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != admin) revert NotOperator();
        _;
    }
    
    modifier onlyBankSigner() {
        if (!bankSigners[msg.sender]) revert NotBankSigner();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _treasury) {
        if (_treasury == address(0)) revert ZeroAddress();
        
        admin = msg.sender;
        treasury = _treasury;
        operators[msg.sender] = true;
        nextVaultId = 1;
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VAULT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new custody vault
     * @param owner Vault owner address
     * @param amount Initial USD amount (in 6 decimals)
     * @param sourceBankAccount Source custody account reference
     * @param metadataHash Off-chain metadata hash
     * @return vaultId The created vault ID
     */
    function createVault(
        address owner,
        uint256 amount,
        string calldata sourceBankAccount,
        bytes32 metadataHash
    ) external onlyOperator whenNotPaused returns (uint256 vaultId) {
        if (owner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        vaultId = nextVaultId++;
        
        vaults[vaultId] = Vault({
            id: vaultId,
            owner: owner,
            totalBalance: amount,
            availableBalance: amount,
            lockedBalance: 0,
            mintedBalance: 0,
            status: VaultStatus.ACTIVE,
            metadataHash: metadataHash,
            sourceBankAccount: sourceBankAccount,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        userVaults[owner].push(vaultId);
        totalVaults++;
        
        emit VaultCreated(vaultId, owner, amount, sourceBankAccount, metadataHash);
    }
    
    /**
     * @notice Deposit additional funds to vault
     * @param vaultId Vault ID
     * @param amount Amount to deposit
     */
    function depositToVault(uint256 vaultId, uint256 amount) external onlyOperator whenNotPaused {
        Vault storage vault = vaults[vaultId];
        if (vault.id == 0) revert VaultNotFound();
        if (vault.status != VaultStatus.ACTIVE) revert VaultNotActive();
        if (amount == 0) revert ZeroAmount();
        
        vault.totalBalance += amount;
        vault.availableBalance += amount;
        vault.updatedAt = block.timestamp;
        
        emit FundsDeposited(vaultId, amount, vault.totalBalance);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LOCK OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a lock request with bank signature
     * @param vaultId Vault ID
     * @param amount Amount to lock
     * @param beneficiary LUSD beneficiary address
     * @param isoHash ISO 20022 message hash
     * @param daesTxnId DAES transaction ID
     * @param expiry Lock expiry timestamp
     * @param bankSignature Bank signer EIP-712 signature
     * @return lockId The created lock ID
     */
    function createLock(
        uint256 vaultId,
        uint256 amount,
        address beneficiary,
        bytes32 isoHash,
        bytes32 daesTxnId,
        uint256 expiry,
        bytes calldata bankSignature
    ) external onlyOperator whenNotPaused returns (bytes32 lockId) {
        Vault storage vault = vaults[vaultId];
        if (vault.id == 0) revert VaultNotFound();
        if (vault.status != VaultStatus.ACTIVE) revert VaultNotActive();
        if (amount == 0) revert ZeroAmount();
        if (amount > vault.availableBalance) revert InsufficientBalance();
        if (beneficiary == address(0)) revert ZeroAddress();
        
        // Verify bank signature
        uint256 nonce = nonces[vault.owner]++;
        bytes32 structHash = keccak256(abi.encode(
            LOCK_REQUEST_TYPEHASH,
            vaultId,
            amount,
            beneficiary,
            isoHash,
            expiry,
            nonce
        ));
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = _recoverSigner(digest, bankSignature);
        
        if (!bankSigners[signer]) revert InvalidSignature();
        
        // Generate lock ID
        lockId = keccak256(abi.encodePacked(
            vaultId,
            amount,
            beneficiary,
            daesTxnId,
            block.timestamp,
            block.number
        ));
        
        // Create lock
        locks[lockId] = Lock({
            lockId: lockId,
            vaultId: vaultId,
            amount: amount,
            beneficiary: beneficiary,
            bankSigner: signer,
            isoHash: isoHash,
            daesTxnId: daesTxnId,
            expiry: expiry,
            status: LockStatus.LOCKED,
            createdAt: block.timestamp,
            consumedAt: 0,
            authorizationCode: bytes32(0)
        });
        
        // Update vault balances
        vault.availableBalance -= amount;
        vault.lockedBalance += amount;
        vault.updatedAt = block.timestamp;
        
        vaultLocks[vaultId].push(lockId);
        totalLocked += amount;
        
        emit LockCreated(lockId, vaultId, amount, beneficiary, signer, isoHash);
    }
    
    /**
     * @notice Consume a lock and generate mint authorization code
     * @param lockId Lock ID to consume
     * @return authCode Authorization code for LEMX minting
     */
    function consumeAndMint(bytes32 lockId) external onlyOperator whenNotPaused returns (bytes32 authCode) {
        Lock storage lock = locks[lockId];
        if (lock.lockId == bytes32(0)) revert LockNotFound();
        if (lock.status != LockStatus.LOCKED) revert LockNotLocked();
        if (lock.expiry != 0 && block.timestamp > lock.expiry) revert LockExpired();
        
        // Generate authorization code (MINT-XXXX-YYYY format as bytes32)
        authCode = keccak256(abi.encodePacked(
            "MINT",
            lockId,
            block.timestamp,
            block.number,
            msg.sender
        ));
        
        // Update lock
        lock.status = LockStatus.CONSUMED;
        lock.consumedAt = block.timestamp;
        lock.authorizationCode = authCode;
        
        // Create mint authorization
        uint256 deadline = block.timestamp + 24 hours; // 24 hour deadline
        
        mintAuthorizations[authCode] = MintAuthorization({
            authCode: authCode,
            lockId: lockId,
            amount: lock.amount,
            beneficiary: lock.beneficiary,
            status: MintAuthStatus.PENDING,
            createdAt: block.timestamp,
            deadline: deadline,
            mintTxHash: bytes32(0),
            mintedBy: address(0),
            mintedAt: 0
        });
        
        emit LockConsumed(lockId, authCode, msg.sender, block.timestamp);
        emit MintAuthorizationCreated(authCode, lockId, lock.amount, lock.beneficiary, deadline);
    }
    
    /**
     * @notice Complete minting with LEMX transaction hash
     * @dev Called by LEMX minting bridge after minting LUSD
     * @param authCode Authorization code
     * @param mintTxHash LEMX minting transaction hash
     */
    function completeMinting(bytes32 authCode, bytes32 mintTxHash) external whenNotPaused {
        // Only minting bridge or admin can complete
        if (msg.sender != mintingBridge && msg.sender != admin) revert NotOperator();
        
        MintAuthorization storage auth = mintAuthorizations[authCode];
        if (auth.authCode == bytes32(0)) revert AuthorizationNotFound();
        if (auth.status != MintAuthStatus.PENDING) revert AuthorizationAlreadyUsed();
        if (block.timestamp > auth.deadline) revert AuthorizationExpired();
        
        // Update authorization
        auth.status = MintAuthStatus.MINTED;
        auth.mintTxHash = mintTxHash;
        auth.mintedBy = msg.sender;
        auth.mintedAt = block.timestamp;
        
        // Update vault
        Lock storage lock = locks[auth.lockId];
        Vault storage vault = vaults[lock.vaultId];
        
        vault.lockedBalance -= auth.amount;
        vault.mintedBalance += auth.amount;
        vault.updatedAt = block.timestamp;
        
        totalLocked -= auth.amount;
        totalMinted += auth.amount;
        
        emit LUSDMinted(authCode, mintTxHash, auth.amount, auth.beneficiary, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get vault information
     */
    function getVault(uint256 vaultId) external view returns (Vault memory) {
        return vaults[vaultId];
    }
    
    /**
     * @notice Get lock information
     */
    function getLock(bytes32 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }
    
    /**
     * @notice Get mint authorization
     */
    function getMintAuthorization(bytes32 authCode) external view returns (MintAuthorization memory) {
        return mintAuthorizations[authCode];
    }
    
    /**
     * @notice Get user's vault IDs
     */
    function getUserVaults(address user) external view returns (uint256[] memory) {
        return userVaults[user];
    }
    
    /**
     * @notice Get vault's lock IDs
     */
    function getVaultLocks(uint256 vaultId) external view returns (bytes32[] memory) {
        return vaultLocks[vaultId];
    }
    
    /**
     * @notice Verify authorization code is valid
     */
    function isAuthorizationValid(bytes32 authCode) external view returns (bool) {
        MintAuthorization storage auth = mintAuthorizations[authCode];
        return auth.authCode != bytes32(0) && 
               auth.status == MintAuthStatus.PENDING && 
               block.timestamp <= auth.deadline;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate admin transfer
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }
    
    /**
     * @notice Accept admin transfer
     */
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        emit AdminTransferCompleted(admin, pendingAdmin);
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }
    
    /**
     * @notice Add/remove operator
     */
    function setOperator(address operator, bool status) external onlyAdmin {
        operators[operator] = status;
    }
    
    /**
     * @notice Add/remove bank signer
     */
    function setBankSigner(address signer, bool status) external onlyAdmin {
        bankSigners[signer] = status;
    }
    
    /**
     * @notice Set minting bridge address
     */
    function setMintingBridge(address _mintingBridge) external onlyAdmin {
        mintingBridge = _mintingBridge;
    }
    
    /**
     * @notice Set bank registry address
     */
    function setBankRegistry(address _bankRegistry) external onlyAdmin {
        bankRegistry = _bankRegistry;
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Recover signer from signature
     */
    function _recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) v += 27;
        
        return ecrecover(digest, v, r, s);
    }
}
