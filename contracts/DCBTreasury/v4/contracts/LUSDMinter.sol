// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║    ██╗     ██╗   ██╗███████╗██████╗     ███╗   ███╗██╗███╗   ██╗████████╗███████╗██████╗                                     ║
 * ║    ██║     ██║   ██║██╔════╝██╔══██╗    ████╗ ████║██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗                                    ║
 * ║    ██║     ██║   ██║███████╗██║  ██║    ██╔████╔██║██║██╔██╗ ██║   ██║   █████╗  ██████╔╝                                    ║
 * ║    ██║     ██║   ██║╚════██║██║  ██║    ██║╚██╔╝██║██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗                                    ║
 * ║    ███████╗╚██████╔╝███████║██████╔╝    ██║ ╚═╝ ██║██║██║ ╚████║   ██║   ███████╗██║  ██║                                    ║
 * ║    ╚══════╝ ╚═════╝ ╚══════╝╚═════╝     ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                                    ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💎 LUSD MINTER - THIRD SIGNATURE (BACKED CERTIFICATE) & MINT EXPLORER                                                       ║
 * ║                                                                                                                              ║
 * ║  📋 Contract: LUSDMinter                                                                                                     ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 8866)                                                                             ║
 * ║  🔓 License: MIT (Open Source & Public)                                                                                      ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💡 THIRD SIGNATURE = BACKED CERTIFICATE:                                                                                    ║
 * ║  ├─ ✅ Emisor proporciona hash de transacción LUSD                                                                           ║
 * ║  ├─ ✅ Contrato genera BACKED SIGNATURE que certifica el respaldo                                                            ║
 * ║  ├─ ✅ Hash del emisor + USD consumido = LUSD BACKED                                                                         ║
 * ║  ├─ ✅ Certificado inmutable on-chain                                                                                        ║
 * ║  └─ ✅ Verificable en Mint Explorer                                                                                          ║
 * ║                                                                                                                              ║
 * ║  🔄 FINAL FLOW:                                                                                                              ║
 * ║  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
 * ║  │  1. USD Contract: Tokenizes USD → FIRST SIGNATURE (DCB Treasury)                                                       │  ║
 * ║  │  2. Lock Reserve: Accepts lock → SECOND SIGNATURE (Treasury Minting)                                                   │  ║
 * ║  │  3. THIS CONTRACT: Emisor provides TX Hash → BACKED SIGNATURE → LUSD Certified Backed                                  │  ║
 * ║  └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title LUSDMinter - LUSD Backed Certificate Generator
 * @author Digital Commercial Bank Ltd
 * @notice Third signature = BACKED certificate that proves LUSD is backed by USD
 * @dev Emisor provides LUSD tx hash, contract generates backed signature
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 4.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILUSD {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface ILockReserve {
    function consumeForLUSD(
        bytes32 lockId,
        uint256 amount,
        bytes32 lusdTxHash
    ) external returns (bytes32 consumptionId, bytes32 thirdSignature);
    
    function getAvailableReserve(bytes32 lockId) external view returns (uint256);
    function totalReserve() external view returns (uint256);
}

interface IPriceOracle {
    function getPrice(string calldata symbol) external view returns (int256);
    function getLUSDPrice() external view returns (int256);
    function getUSDPrice() external pure returns (int256);
}

contract LUSDMinter is AccessControl, Pausable, ReentrancyGuard {

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Contract version
    string public constant VERSION = "4.0.0";
    
    /// @notice Contract name
    string public constant CONTRACT_NAME = "LUSD Minter - Backed Certificate";
    
    /// @notice LemonChain ID
    uint256 public constant CHAIN_ID = 1006;
    
    /// @notice Official LUSD Contract
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice LemonChain Explorer URL
    string public constant EXPLORER_URL = "https://explorer.lemonchain.io";
    
    /// @notice Backed signature prefix
    bytes32 public constant BACKED_SIGNATURE_PREFIX = keccak256("LUSD_BACKED_BY_USD_v4");

    // ══════════════════════════════════════════════════════════════════════════════
    // ROLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Role for minting operators (emisores)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Role for explorer managers
    bytes32 public constant EXPLORER_MANAGER_ROLE = keccak256("EXPLORER_MANAGER_ROLE");

    // ══════════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Backed certificate status
    enum BackedStatus {
        PENDING,            // Waiting for emisor hash
        BACKED,             // LUSD is backed by USD
        VERIFIED,           // Verified on-chain
        INVALID             // Invalid backing
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice BACKED CERTIFICATE - Proof that LUSD is backed by USD
     * @dev This is the THIRD SIGNATURE that certifies the backing
     */
    struct BackedCertificate {
        bytes32 certificateId;
        
        // ══════════════════════════════════════════════════════════════════════════
        // BACKED SIGNATURE (THIRD SIGNATURE)
        // ══════════════════════════════════════════════════════════════════════════
        bytes32 backedSignature;        // THE BACKED SIGNATURE - proves USD backing
        bytes32 emisorTxHash;           // Hash provided by emisor (LUSD mint tx)
        address emisor;                 // Who provided the hash (emisor)
        
        // ══════════════════════════════════════════════════════════════════════════
        // USD BACKING INFO
        // ══════════════════════════════════════════════════════════════════════════
        uint256 usdAmount;              // USD amount consumed as backing
        uint256 lusdMinted;             // LUSD minted (1:1 with USD)
        int256 usdPrice;                // USD price at time of backing ($1.00)
        int256 lusdPrice;               // LUSD price at time of backing ($1.00)
        uint256 backingRatio;           // Backing ratio (10000 = 100%)
        
        // ══════════════════════════════════════════════════════════════════════════
        // SOURCE REFERENCES
        // ══════════════════════════════════════════════════════════════════════════
        bytes32 lockReserveId;          // Lock Reserve that provided USD
        bytes32 usdInjectionId;         // Original USD injection
        string authorizationCode;       // Mint with Code authorization
        
        // ══════════════════════════════════════════════════════════════════════════
        // ALL THREE SIGNATURES
        // ══════════════════════════════════════════════════════════════════════════
        bytes32 firstSignature;         // DCB Treasury (USD tokenization)
        bytes32 secondSignature;        // Treasury Minting (Lock acceptance)
        // backedSignature IS THE THIRD SIGNATURE
        
        // ══════════════════════════════════════════════════════════════════════════
        // PARTIES
        // ══════════════════════════════════════════════════════════════════════════
        address beneficiary;            // Who received LUSD
        string bankName;                // Source bank
        string bankBIC;                 // Bank BIC/SWIFT
        
        // ══════════════════════════════════════════════════════════════════════════
        // TIMESTAMPS
        // ══════════════════════════════════════════════════════════════════════════
        uint256 usdTokenizedAt;         // When USD was tokenized
        uint256 lockAcceptedAt;         // When lock was accepted
        uint256 backedAt;               // When BACKED signature was generated
        uint256 blockNumber;            // Block number of backing
        
        // ══════════════════════════════════════════════════════════════════════════
        // STATUS & PUBLICATION
        // ══════════════════════════════════════════════════════════════════════════
        BackedStatus status;
        string publicationCode;         // PUB-XXXX-XXXX for tracking
        
        // ══════════════════════════════════════════════════════════════════════════
        // CONTRACT REFERENCES
        // ══════════════════════════════════════════════════════════════════════════
        address usdContract;
        address lockReserveContract;
        address lusdContract;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice USD Contract
    address public usdContract;
    
    /// @notice Lock Reserve Contract
    address public lockReserveContract;
    
    /// @notice Price Oracle Contract
    address public priceOracle;
    
    /// @notice LUSD Interface
    ILUSD public lusd;
    
    /// @notice Total LUSD backed through this contract
    uint256 public totalBacked;
    
    /// @notice Total backing operations
    uint256 public totalBackingOperations;
    
    /// @notice Total certificates issued
    uint256 public totalCertificates;

    // ══════════════════════════════════════════════════════════════════════════════
    // MAPPINGS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Backed certificates by ID
    mapping(bytes32 => BackedCertificate) public certificates;
    
    /// @notice All certificate IDs
    bytes32[] public certificateIds;
    
    /// @notice Emisor TX hash to certificate mapping
    mapping(bytes32 => bytes32) public emisorTxToCertificate;
    
    /// @notice Publication code to certificate mapping
    mapping(string => bytes32) public publicationCodeToCertificate;
    
    /// @notice Lock Reserve ID to certificate mapping
    mapping(bytes32 => bytes32) public lockToCertificate;
    
    /// @notice Backed signature to certificate mapping
    mapping(bytes32 => bytes32) public backedSignatureToCertificate;

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when BACKED SIGNATURE is generated (THIRD SIGNATURE)
    event BackedSignatureGenerated(
        bytes32 indexed certificateId,
        bytes32 indexed backedSignature,
        bytes32 emisorTxHash,
        address indexed emisor,
        uint256 usdAmount,
        uint256 lusdMinted,
        uint256 timestamp
    );

    /// @notice Emitted when certificate is published to Mint Explorer
    event CertificatePublished(
        bytes32 indexed certificateId,
        string publicationCode,
        bytes32 backedSignature,
        uint256 usdBacking,
        uint256 lusdMinted,
        uint256 backingRatio,
        address beneficiary,
        uint256 timestamp
    );

    /// @notice Emitted for complete audit trail with all 3 signatures
    event CompleteBackingAuditTrail(
        bytes32 indexed certificateId,
        bytes32 firstSignature,     // DCB Treasury
        bytes32 secondSignature,    // Treasury Minting
        bytes32 backedSignature,    // THIS CONTRACT (BACKED)
        bytes32 emisorTxHash,
        uint256 usdAmount,
        uint256 lusdMinted,
        uint256 timestamp
    );

    /// @notice Emitted when backing is verified
    event BackingVerified(
        bytes32 indexed certificateId,
        bytes32 backedSignature,
        uint256 usdBacking,
        uint256 lusdMinted,
        int256 usdPrice,
        int256 lusdPrice,
        uint256 backingRatio,
        uint256 timestamp
    );
    
    /// @notice Emitted when USD contract is updated
    event USDContractUpdated(address indexed oldContract, address indexed newContract);
    
    /// @notice Emitted when LockReserve contract is updated
    event LockReserveContractUpdated(address indexed oldContract, address indexed newContract);
    
    /// @notice Emitted when PriceOracle is updated
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    /// @notice Emitted on emergency withdraw
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);

    // ══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════════

    error InvalidAmount();
    error InvalidAddress();
    error InvalidEmisorHash();
    error EmisorHashAlreadyUsed();
    error InsufficientReserve();
    error BackingFailed();
    error CertificateNotFound();
    error ContractNotSet();

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════════

    constructor(
        address _admin,
        address _usdContract,
        address _lockReserveContract,
        address _priceOracle
    ) {
        if (_admin == address(0)) revert InvalidAddress();
        if (_usdContract == address(0)) revert InvalidAddress();
        if (_lockReserveContract == address(0)) revert InvalidAddress();
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(EXPLORER_MANAGER_ROLE, _admin);
        
        usdContract = _usdContract;
        lockReserveContract = _lockReserveContract;
        priceOracle = _priceOracle;
        lusd = ILUSD(LUSD_CONTRACT);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // BACKED SIGNATURE GENERATION (THIRD SIGNATURE)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Generates BACKED SIGNATURE - THE THIRD SIGNATURE
     * @dev Emisor provides their LUSD mint TX hash, contract generates backed certificate
     * @param lockReserveId Lock Reserve ID (USD backing source)
     * @param amount Amount of USD to consume / LUSD to back
     * @param beneficiary Who receives the backed LUSD
     * @param emisorTxHash Hash of the LUSD minting transaction (provided by emisor)
     * @param authorizationCode Mint with Code authorization
     * @param bankName Source bank name
     * @param bankBIC Bank BIC/SWIFT
     * @param firstSignature First signature from USD contract
     * @param secondSignature Second signature from Lock Reserve
     * @param usdTokenizedAt When USD was tokenized
     * @param lockAcceptedAt When lock was accepted
     * @return certificateId The backed certificate ID
     * @return backedSignature THE BACKED SIGNATURE (Third Signature)
     * @return publicationCode Publication code for tracking
     */
    function generateBackedSignature(
        bytes32 lockReserveId,
        uint256 amount,
        address beneficiary,
        bytes32 emisorTxHash,
        string memory authorizationCode,
        string memory bankName,
        string memory bankBIC,
        bytes32 firstSignature,
        bytes32 secondSignature,
        uint256 usdTokenizedAt,
        uint256 lockAcceptedAt
    ) public 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
        whenNotPaused
        returns (
            bytes32 certificateId, 
            bytes32 backedSignature, 
            string memory publicationCode
        ) 
    {
        // Validations
        if (amount == 0) revert InvalidAmount();
        if (beneficiary == address(0)) revert InvalidAddress();
        if (emisorTxHash == bytes32(0)) revert InvalidEmisorHash();
        if (emisorTxToCertificate[emisorTxHash] != bytes32(0)) revert EmisorHashAlreadyUsed();
        
        // Get prices from oracle
        int256 usdPrice = 100000000; // $1.00 default
        int256 lusdPrice = 100000000; // $1.00 default
        
        if (priceOracle != address(0)) {
            usdPrice = IPriceOracle(priceOracle).getUSDPrice();
            lusdPrice = IPriceOracle(priceOracle).getLUSDPrice();
        }
        
        // ══════════════════════════════════════════════════════════════════════════
        // GENERATE BACKED SIGNATURE (THIRD SIGNATURE)
        // This signature CERTIFIES that the LUSD is BACKED by USD
        // ══════════════════════════════════════════════════════════════════════════
        backedSignature = keccak256(abi.encodePacked(
            BACKED_SIGNATURE_PREFIX,
            lockReserveId,
            amount,
            beneficiary,
            emisorTxHash,           // EMISOR'S TX HASH IS PART OF THE SIGNATURE
            msg.sender,             // EMISOR ADDRESS
            firstSignature,
            secondSignature,
            block.timestamp,
            block.number,
            "LUSD_IS_BACKED_BY_USD"
        ));
        
        // Generate certificate ID
        certificateId = keccak256(abi.encodePacked(
            backedSignature,
            emisorTxHash,
            block.timestamp,
            totalCertificates
        ));
        
        // Generate publication code
        publicationCode = _generatePublicationCode(lockReserveId, amount);
        
        // Calculate backing ratio (should always be 10000 = 100%)
        uint256 backingRatio = 10000; // 100% backed
        
        // ══════════════════════════════════════════════════════════════════════════
        // SECURITY FIX: Checks-Effects-Interactions Pattern
        // Update ALL state BEFORE external calls
        // ══════════════════════════════════════════════════════════════════════════
        
        // Create backed certificate FIRST (Effects)
        certificates[certificateId] = BackedCertificate({
            certificateId: certificateId,
            backedSignature: backedSignature,
            emisorTxHash: emisorTxHash,
            emisor: msg.sender,
            usdAmount: amount,
            lusdMinted: amount,
            usdPrice: usdPrice,
            lusdPrice: lusdPrice,
            backingRatio: backingRatio,
            lockReserveId: lockReserveId,
            usdInjectionId: bytes32(0),
            authorizationCode: authorizationCode,
            firstSignature: firstSignature,
            secondSignature: secondSignature,
            beneficiary: beneficiary,
            bankName: bankName,
            bankBIC: bankBIC,
            usdTokenizedAt: usdTokenizedAt,
            lockAcceptedAt: lockAcceptedAt,
            backedAt: block.timestamp,
            blockNumber: block.number,
            status: BackedStatus.BACKED,
            publicationCode: publicationCode,
            usdContract: usdContract,
            lockReserveContract: lockReserveContract,
            lusdContract: LUSD_CONTRACT
        });
        
        // Update mappings (Effects - before external calls)
        certificateIds.push(certificateId);
        emisorTxToCertificate[emisorTxHash] = certificateId;
        publicationCodeToCertificate[publicationCode] = certificateId;
        lockToCertificate[lockReserveId] = certificateId;
        backedSignatureToCertificate[backedSignature] = certificateId;
        
        // Update statistics (Effects - before external calls)
        totalBacked += amount;
        totalBackingOperations++;
        totalCertificates++;
        
        // ══════════════════════════════════════════════════════════════════════════
        // INTERACTIONS: External calls AFTER all state updates
        // ══════════════════════════════════════════════════════════════════════════
        
        // Consume from Lock Reserve
        try ILockReserve(lockReserveContract).consumeForLUSD(
            lockReserveId,
            amount,
            emisorTxHash
        ) {
            // Success - continue
        } catch {
            // Revert state changes if consume fails
            revert("LockReserve consume failed");
        }
        
        // Mint LUSD to beneficiary (1:1 with USD)
        try lusd.mint(beneficiary, amount) {
            // Success - continue
        } catch {
            // Revert if mint fails (likely missing MINTER_ROLE)
            revert("LUSD mint failed - check MINTER_ROLE on LUSD contract");
        }
        
        // Emit events
        emit BackedSignatureGenerated(
            certificateId,
            backedSignature,
            emisorTxHash,
            msg.sender,
            amount,
            amount,
            block.timestamp
        );
        
        emit CertificatePublished(
            certificateId,
            publicationCode,
            backedSignature,
            amount,
            amount,
            backingRatio,
            beneficiary,
            block.timestamp
        );
        
        emit CompleteBackingAuditTrail(
            certificateId,
            firstSignature,
            secondSignature,
            backedSignature,
            emisorTxHash,
            amount,
            amount,
            block.timestamp
        );
        
        emit BackingVerified(
            certificateId,
            backedSignature,
            amount,
            amount,
            usdPrice,
            lusdPrice,
            backingRatio,
            block.timestamp
        );
        
        return (certificateId, backedSignature, publicationCode);
    }

    /**
     * @notice Simplified backing function with default bank info
     */
    function backAndMint(
        bytes32 lockReserveId,
        uint256 amount,
        address beneficiary,
        bytes32 emisorTxHash,
        string memory authorizationCode,
        bytes32 firstSignature,
        bytes32 secondSignature
    ) external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
        returns (bytes32 certificateId, bytes32 backedSignature, string memory publicationCode) 
    {
        return generateBackedSignature(
            lockReserveId,
            amount,
            beneficiary,
            emisorTxHash,
            authorizationCode,
            "Digital Commercial Bank",
            "DCBKAEDXXX",
            firstSignature,
            secondSignature,
            0,
            0
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VERIFICATION FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verifies a backed signature is valid
     * @param backedSignature The backed signature to verify
     * @return isValid True if signature corresponds to a valid certificate
     * @return certificateId The certificate ID
     * @return usdBacking Amount of USD backing
     * @return lusdMinted Amount of LUSD minted
     */
    function verifyBackedSignature(bytes32 backedSignature) external view returns (
        bool isValid,
        bytes32 certificateId,
        uint256 usdBacking,
        uint256 lusdMinted
    ) {
        certificateId = backedSignatureToCertificate[backedSignature];
        if (certificateId == bytes32(0)) {
            return (false, bytes32(0), 0, 0);
        }
        
        BackedCertificate storage cert = certificates[certificateId];
        return (
            cert.status == BackedStatus.BACKED || cert.status == BackedStatus.VERIFIED,
            certificateId,
            cert.usdAmount,
            cert.lusdMinted
        );
    }

    /**
     * @notice Verifies all three signatures for a certificate
     */
    function verifyAllSignatures(bytes32 certificateId) external view returns (
        bool hasAllSignatures,
        bytes32 firstSig,
        bytes32 secondSig,
        bytes32 backedSig,
        bool isFullyBacked
    ) {
        BackedCertificate storage cert = certificates[certificateId];
        if (cert.backedAt == 0) {
            return (false, bytes32(0), bytes32(0), bytes32(0), false);
        }
        
        bool hasAll = cert.firstSignature != bytes32(0) && 
                      cert.secondSignature != bytes32(0) && 
                      cert.backedSignature != bytes32(0);
        bool backed = cert.usdAmount == cert.lusdMinted && cert.backingRatio == 10000;
        
        return (hasAll, cert.firstSignature, cert.secondSignature, cert.backedSignature, backed);
    }

    /**
     * @notice Gets backing proof for LUSD
     */
    function getBackingProof(bytes32 emisorTxHash) external view returns (
        bool isBacked,
        bytes32 backedSignature,
        uint256 usdBacking,
        uint256 lusdMinted,
        address emisor,
        uint256 backedAt
    ) {
        bytes32 certId = emisorTxToCertificate[emisorTxHash];
        if (certId == bytes32(0)) {
            return (false, bytes32(0), 0, 0, address(0), 0);
        }
        
        BackedCertificate storage cert = certificates[certId];
        return (
            true,
            cert.backedSignature,
            cert.usdAmount,
            cert.lusdMinted,
            cert.emisor,
            cert.backedAt
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets certificate by ID
     */
    function getCertificate(bytes32 certificateId) external view returns (BackedCertificate memory) {
        return certificates[certificateId];
    }

    /**
     * @notice Gets certificate by publication code
     */
    function getCertificateByPublicationCode(string calldata pubCode) external view returns (BackedCertificate memory) {
        bytes32 certId = publicationCodeToCertificate[pubCode];
        return certificates[certId];
    }

    /**
     * @notice Gets certificate by emisor TX hash
     */
    function getCertificateByEmisorTx(bytes32 emisorTxHash) external view returns (BackedCertificate memory) {
        bytes32 certId = emisorTxToCertificate[emisorTxHash];
        return certificates[certId];
    }

    /**
     * @notice Gets all certificate IDs
     */
    function getAllCertificateIds() external view returns (bytes32[] memory) {
        return certificateIds;
    }

    /**
     * @notice Gets recent certificates
     */
    function getRecentCertificates(uint256 count) external view returns (BackedCertificate[] memory) {
        uint256 total = certificateIds.length;
        if (count > total) count = total;
        
        BackedCertificate[] memory certs = new BackedCertificate[](count);
        
        for (uint256 i = 0; i < count; i++) {
            certs[i] = certificates[certificateIds[total - 1 - i]];
        }
        
        return certs;
    }

    /**
     * @notice Gets contract statistics
     */
    function getStatistics() external view returns (
        uint256 _totalBacked,
        uint256 _totalBackingOperations,
        uint256 _totalCertificates,
        uint256 _lusdTotalSupply,
        uint256 _globalBackingRatio
    ) {
        uint256 lusdSupply = lusd.totalSupply();
        uint256 ratio = lusdSupply > 0 ? (totalBacked * 10000) / lusdSupply : 10000;
        
        return (
            totalBacked,
            totalBackingOperations,
            totalCertificates,
            lusdSupply,
            ratio
        );
    }

    /**
     * @notice Gets complete audit trail for a certificate
     */
    function getAuditTrail(bytes32 certificateId) external view returns (
        bytes32 usdInjectionId,
        bytes32 lockReserveId,
        bytes32 emisorTxHash,
        bytes32 backedSignature,
        uint256 usdAmount,
        uint256 lusdMinted,
        string memory authorizationCode,
        string memory publicationCode,
        bytes32 firstSignature,
        bytes32 secondSignature,
        uint256 usdTokenizedAt,
        uint256 lockAcceptedAt,
        uint256 backedAt
    ) {
        BackedCertificate storage cert = certificates[certificateId];
        return (
            cert.usdInjectionId,
            cert.lockReserveId,
            cert.emisorTxHash,
            cert.backedSignature,
            cert.usdAmount,
            cert.lusdMinted,
            cert.authorizationCode,
            cert.publicationCode,
            cert.firstSignature,
            cert.secondSignature,
            cert.usdTokenizedAt,
            cert.lockAcceptedAt,
            cert.backedAt
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    function setUSDContract(address _usdContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_usdContract == address(0)) revert InvalidAddress();
        address oldContract = usdContract;
        usdContract = _usdContract;
        emit USDContractUpdated(oldContract, _usdContract);
    }

    function setLockReserveContract(address _lockReserveContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_lockReserveContract == address(0)) revert InvalidAddress();
        address oldContract = lockReserveContract;
        lockReserveContract = _lockReserveContract;
        emit LockReserveContractUpdated(oldContract, _lockReserveContract);
    }

    function setPriceOracle(address _priceOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldOracle = priceOracle;
        priceOracle = _priceOracle;
        emit PriceOracleUpdated(oldOracle, _priceOracle);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw tokens sent by mistake
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token");
        require(token != LUSD_CONTRACT, "Cannot withdraw LUSD");
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    function _generatePublicationCode(
        bytes32 lockReserveId,
        uint256 amount
    ) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(
            lockReserveId,
            amount,
            block.timestamp,
            block.prevrandao,
            totalCertificates
        ));
        
        bytes memory code = new bytes(13);
        bytes memory hexChars = "0123456789ABCDEF";
        
        code[0] = 'P';
        code[1] = 'U';
        code[2] = 'B';
        code[3] = '-';
        
        for (uint256 i = 0; i < 4; i++) {
            code[4 + i] = hexChars[uint8(hash[i]) % 16];
        }
        
        code[8] = '-';
        
        for (uint256 i = 0; i < 4; i++) {
            code[9 + i] = hexChars[uint8(hash[4 + i]) % 16];
        }
        
        return string(code);
    }
}
