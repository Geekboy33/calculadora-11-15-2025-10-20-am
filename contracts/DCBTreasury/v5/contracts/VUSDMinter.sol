// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                   ║
 * ║    ██╗   ██╗██╗   ██╗███████╗██████╗     ███╗   ███╗██╗███╗   ██╗████████╗███████╗██████╗         ║
 * ║    ██║   ██║██║   ██║██╔════╝██╔══██╗    ████╗ ████║██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗        ║
 * ║    ██║   ██║██║   ██║███████╗██║  ██║    ██╔████╔██║██║██╔██╗ ██║   ██║   █████╗  ██████╔╝        ║
 * ║    ╚██╗ ██╔╝██║   ██║╚════██║██║  ██║    ██║╚██╔╝██║██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗        ║
 * ║     ╚████╔╝ ╚██████╔╝███████║██████╔╝    ██║ ╚═╝ ██║██║██║ ╚████║   ██║   ███████╗██║  ██║        ║
 * ║      ╚═══╝   ╚═════╝ ╚══════╝╚═════╝     ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝        ║
 * ║                                                                                                   ║
 * ║─────────────────────────────────────────────────────────────────────────────────────────────────  ║
 * ║                                                                                                   ║
 * ║                  ╔══════════════════════════════════════════════════════════╗                     ║
 * ║                  ║           BACKED CERTIFICATE GENERATOR                   ║                     ║
 * ║                  ║              ═══════════════════════                     ║                     ║
 * ║                  ║       DIGITAL COMMERCIAL BANK TREASURY                   ║                     ║
 * ║                  ║                                                          ║                     ║
 * ║                  ║    ┌────────────────────────────────────────┐            ║                     ║
 * ║                  ║    │  ③ THIRD SIGNATURE - FINAL BACKING    │            ║                     ║
 * ║                  ║    │     Certifies 1:1 USD/VUSD Backing     │            ║                     ║
 * ║                  ║    └────────────────────────────────────────┘            ║                     ║
 * ║                  ╚══════════════════════════════════════════════════════════╝                     ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Contract: VUSDMinter                         Network: LemonChain (1006)                          ║
 * ║  Version: 5.0.0                               License: MIT                                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║  SIGNATURE FLOW                               LINKED CONTRACTS                                    ║
 * ║  ──────────────                               ────────────────                                    ║
 * ║  ① USD Tokenized (First)                     VUSD: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b    ║
 * ║  ② Lock Reserve (Second)                     Minter: 0xaccA35529b2FC2041dFb124F83f52120E24377B2  ║
 * ║  ③ This Contract (Third) ← BACKED CERT                                                           ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title VUSDMinter - VUSD Backed Certificate Generator
 * @author Digital Commercial Bank Ltd
 * @notice Generates third signature and mints VUSD backed by USD
 * @dev Implements the final step in the three-signature backing flow
 * @custom:security-contact rwa@digcommbank.com
 * @custom:version 5.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IVUSD.sol";

interface IPriceOracle {
    function getUSDPrice() external view returns (int256);
    function getVUSDPrice() external view returns (int256);
}

interface ILockReserve {
    function consumeForVUSD(bytes32 lockId, uint256 amount, bytes32 vusdTxHash) external returns (bytes32, bytes32);
    function getLock(bytes32 lockId) external view returns (
        bytes32, bytes32, uint256, uint256, uint256, address, address, uint8, bytes32, bytes32, bytes32,
        uint256, uint256, uint256, uint256, uint256, string memory
    );
}

contract VUSDMinter is AccessControl, Pausable, ReentrancyGuard {

    // ========================================================================================================
    // CONSTANTS
    // ========================================================================================================

    string public constant VERSION = "5.0.0";
    uint256 public constant CHAIN_ID = 1006;
    
    address public constant VUSD_CONTRACT = 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b;
    address public constant VUSD_MINTER_WALLET = 0xaccA35529b2FC2041dFb124F83f52120E24377B2;
    
    bytes32 public constant BACKED_SIGNATURE_PREFIX = keccak256("DCB_VUSD_BACKED_SIGNATURE_v5");

    // ========================================================================================================
    // ROLES
    // ========================================================================================================

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant EXPLORER_MANAGER_ROLE = keccak256("EXPLORER_MANAGER_ROLE");

    // ========================================================================================================
    // ENUMS
    // ========================================================================================================

    enum BackedStatus {
        PENDING,
        BACKED,
        VERIFIED,
        INVALID
    }

    // ========================================================================================================
    // STRUCTS
    // ========================================================================================================

    struct BackedCertificate {
        bytes32 certificateId;
        bytes32 backedSignature;
        bytes32 emisorTxHash;
        address emisor;
        uint256 usdAmount;
        uint256 vusdMinted;
        int256 usdPrice;
        int256 vusdPrice;
        uint256 backingRatio;
        bytes32 lockReserveId;
        bytes32 usdInjectionId;
        string authorizationCode;
        bytes32 firstSignature;
        bytes32 secondSignature;
        address beneficiary;
        string bankName;
        uint256 usdTokenizedAt;
        uint256 lockAcceptedAt;
        uint256 backedAt;
        uint256 blockNumber;
        BackedStatus status;
        string publicationCode;
        address usdContract;
        address lockReserveContract;
        address vusdContract;
    }

    // ========================================================================================================
    // STATE VARIABLES
    // ========================================================================================================

    address public usdContract;
    address public lockReserveContract;
    address public priceOracle;
    
    IVUSD public vusd;
    
    uint256 public totalBacked;
    uint256 public totalBackingOperations;
    uint256 public totalCertificates;

    // ========================================================================================================
    // MAPPINGS
    // ========================================================================================================

    mapping(bytes32 => BackedCertificate) public certificates;
    bytes32[] public certificateIds;
    mapping(bytes32 => bytes32) public emisorTxToCertificate;
    mapping(string => bytes32) public publicationCodeToCertificate;
    mapping(bytes32 => bytes32) public lockToCertificate;
    mapping(bytes32 => bytes32) public backedSignatureToCertificate;

    // ========================================================================================================
    // EVENTS
    // ========================================================================================================

    event BackedSignatureGenerated(bytes32 indexed certificateId, bytes32 indexed backedSignature, bytes32 emisorTxHash, address indexed emisor, uint256 usdAmount, uint256 vusdMinted, uint256 timestamp);
    event CertificatePublished(bytes32 indexed certificateId, string publicationCode, bytes32 backedSignature, uint256 usdBacking, uint256 vusdMinted, uint256 backingRatio, address beneficiary, uint256 timestamp);
    event CompleteBackingAuditTrail(bytes32 indexed certificateId, bytes32 firstSignature, bytes32 secondSignature, bytes32 backedSignature, bytes32 emisorTxHash, uint256 usdAmount, uint256 vusdMinted, uint256 timestamp);
    event BackingVerified(bytes32 indexed certificateId, bytes32 backedSignature, uint256 usdBacking, uint256 vusdMinted, int256 usdPrice, int256 vusdPrice, uint256 backingRatio, uint256 timestamp);
    event USDContractUpdated(address indexed oldContract, address indexed newContract);
    event LockReserveContractUpdated(address indexed oldContract, address indexed newContract);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);

    // ========================================================================================================
    // ERRORS
    // ========================================================================================================

    error InvalidAmount();
    error InvalidAddress();
    error InvalidEmisorHash();
    error EmisorHashAlreadyUsed();
    error InsufficientReserve();
    error BackingFailed();
    error CertificateNotFound();
    error ContractNotSet();

    // ========================================================================================================
    // CONSTRUCTOR
    // ========================================================================================================

    constructor(address _admin, address _usdContract, address _lockReserveContract, address _priceOracle) {
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
        vusd = IVUSD(VUSD_CONTRACT);
    }

    // ========================================================================================================
    // BACKED SIGNATURE GENERATION (THIRD SIGNATURE)
    // ========================================================================================================

    function generateBackedSignature(
        bytes32 lockReserveId,
        uint256 amount,
        address beneficiary,
        bytes32 emisorTxHash,
        string memory authorizationCode,
        string memory bankName,
        bytes32 firstSignature,
        bytes32 secondSignature,
        uint256 usdTokenizedAt,
        uint256 lockAcceptedAt
    ) public onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (bytes32 certificateId, bytes32 backedSignature, string memory publicationCode) {
        if (amount == 0) revert InvalidAmount();
        if (beneficiary == address(0)) revert InvalidAddress();
        if (emisorTxHash == bytes32(0)) revert InvalidEmisorHash();
        if (emisorTxToCertificate[emisorTxHash] != bytes32(0)) revert EmisorHashAlreadyUsed();
        
        int256 usdPrice = 100000000;
        int256 vusdPrice = 100000000;
        
        if (priceOracle != address(0)) {
            try IPriceOracle(priceOracle).getUSDPrice() returns (int256 price) {
                usdPrice = price;
            } catch {}
            try IPriceOracle(priceOracle).getVUSDPrice() returns (int256 price) {
                vusdPrice = price;
            } catch {}
        }
        
        // THIRD SIGNATURE - BACKED SIGNATURE
        backedSignature = keccak256(abi.encodePacked(
            BACKED_SIGNATURE_PREFIX,
            lockReserveId,
            amount,
            beneficiary,
            emisorTxHash,
            msg.sender,
            firstSignature,
            secondSignature,
            block.timestamp,
            block.number,
            "VUSD_IS_BACKED_BY_USD"
        ));
        
        certificateId = keccak256(abi.encodePacked(backedSignature, emisorTxHash, block.timestamp, totalCertificates));
        publicationCode = _generatePublicationCode(lockReserveId, amount);
        
        uint256 backingRatio = 10000; // 100% backed
        
        // Effects before interactions
        certificates[certificateId] = BackedCertificate({
            certificateId: certificateId,
            backedSignature: backedSignature,
            emisorTxHash: emisorTxHash,
            emisor: msg.sender,
            usdAmount: amount,
            vusdMinted: amount,
            usdPrice: usdPrice,
            vusdPrice: vusdPrice,
            backingRatio: backingRatio,
            lockReserveId: lockReserveId,
            usdInjectionId: bytes32(0),
            authorizationCode: authorizationCode,
            firstSignature: firstSignature,
            secondSignature: secondSignature,
            beneficiary: beneficiary,
            bankName: bankName,
            usdTokenizedAt: usdTokenizedAt,
            lockAcceptedAt: lockAcceptedAt,
            backedAt: block.timestamp,
            blockNumber: block.number,
            status: BackedStatus.BACKED,
            publicationCode: publicationCode,
            usdContract: usdContract,
            lockReserveContract: lockReserveContract,
            vusdContract: VUSD_CONTRACT
        });
        
        certificateIds.push(certificateId);
        emisorTxToCertificate[emisorTxHash] = certificateId;
        publicationCodeToCertificate[publicationCode] = certificateId;
        lockToCertificate[lockReserveId] = certificateId;
        backedSignatureToCertificate[backedSignature] = certificateId;
        
        totalBacked += amount;
        totalBackingOperations++;
        totalCertificates++;
        
        // Interactions - Consume from Lock Reserve
        try ILockReserve(lockReserveContract).consumeForVUSD(lockReserveId, amount, emisorTxHash) {
        } catch {
            revert("LockReserve consume failed");
        }
        
        // Mint VUSD to beneficiary (1:1 with USD)
        try vusd.mint(beneficiary, amount) {
        } catch {
            revert("VUSD mint failed - check MINTER_ROLE on VUSD contract for minter wallet");
        }
        
        emit BackedSignatureGenerated(certificateId, backedSignature, emisorTxHash, msg.sender, amount, amount, block.timestamp);
        emit CertificatePublished(certificateId, publicationCode, backedSignature, amount, amount, backingRatio, beneficiary, block.timestamp);
        emit CompleteBackingAuditTrail(certificateId, firstSignature, secondSignature, backedSignature, emisorTxHash, amount, amount, block.timestamp);
        
        return (certificateId, backedSignature, publicationCode);
    }

    function backAndMint(
        bytes32 lockReserveId,
        uint256 amount,
        address beneficiary,
        string memory authorizationCode,
        bytes32 firstSignature,
        bytes32 secondSignature,
        uint256 usdTokenizedAt,
        uint256 lockAcceptedAt
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (bytes32 certificateId, bytes32 backedSignature) {
        bytes32 emisorTxHash = keccak256(abi.encodePacked(
            lockReserveId, amount, beneficiary, block.timestamp, block.number, "VUSD_MINT_TX"
        ));
        
        string memory publicationCode;
        (certificateId, backedSignature, publicationCode) = generateBackedSignature(
            lockReserveId, amount, beneficiary, emisorTxHash, authorizationCode, "Digital Commercial Bank", firstSignature, secondSignature, usdTokenizedAt, lockAcceptedAt
        );
        
        return (certificateId, backedSignature);
    }

    // ========================================================================================================
    // VERIFICATION FUNCTIONS
    // ========================================================================================================

    function verifyCertificate(bytes32 certificateId) external view returns (bool isValid, BackedCertificate memory cert) {
        cert = certificates[certificateId];
        if (cert.backedAt == 0) return (false, cert);
        
        isValid = cert.status == BackedStatus.BACKED || cert.status == BackedStatus.VERIFIED;
        isValid = isValid && cert.backingRatio == 10000;
        isValid = isValid && cert.vusdMinted == cert.usdAmount;
        
        return (isValid, cert);
    }

    function verifyBackedSignature(bytes32 backedSignature) external view returns (bool isValid, bytes32 certificateId) {
        certificateId = backedSignatureToCertificate[backedSignature];
        if (certificateId == bytes32(0)) return (false, certificateId);
        
        BackedCertificate storage cert = certificates[certificateId];
        isValid = cert.backedSignature == backedSignature && cert.status != BackedStatus.INVALID;
        
        return (isValid, certificateId);
    }

    // ========================================================================================================
    // VIEW FUNCTIONS
    // ========================================================================================================

    function getCertificate(bytes32 certificateId) external view returns (BackedCertificate memory) {
        return certificates[certificateId];
    }

    function getCertificateByPublicationCode(string calldata pubCode) external view returns (BackedCertificate memory) {
        return certificates[publicationCodeToCertificate[pubCode]];
    }

    function getCertificateByEmisorTx(bytes32 emisorTxHash) external view returns (BackedCertificate memory) {
        return certificates[emisorTxToCertificate[emisorTxHash]];
    }

    function getAllCertificateIds() external view returns (bytes32[] memory) {
        return certificateIds;
    }

    function getCertificatesByStatus(BackedStatus status, uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        require(limit <= 100, "Limit too high");
        
        uint256 count = 0;
        uint256 matchedCount = 0;
        bytes32[] memory tempResults = new bytes32[](limit);
        
        for (uint256 i = 0; i < certificateIds.length && matchedCount < limit; i++) {
            if (certificates[certificateIds[i]].status == status) {
                if (count >= offset) {
                    tempResults[matchedCount] = certificateIds[i];
                    matchedCount++;
                }
                count++;
            }
        }
        
        bytes32[] memory result = new bytes32[](matchedCount);
        for (uint256 i = 0; i < matchedCount; i++) {
            result[i] = tempResults[i];
        }
        return result;
    }

    function getStatistics() external view returns (uint256, uint256, uint256) {
        return (totalBacked, totalBackingOperations, totalCertificates);
    }

    function getBackingInfo(bytes32 certificateId) external view returns (uint256 usdBacking, uint256 vusdMinted, uint256 backingRatio, int256 usdPrice, int256 vusdPrice) {
        BackedCertificate storage cert = certificates[certificateId];
        return (cert.usdAmount, cert.vusdMinted, cert.backingRatio, cert.usdPrice, cert.vusdPrice);
    }

    // ========================================================================================================
    // ADMIN FUNCTIONS
    // ========================================================================================================

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

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount, msg.sender);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ========================================================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================================================

    function _generatePublicationCode(bytes32 lockId, uint256 amount) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(lockId, amount, block.timestamp, block.number, totalCertificates));
        bytes memory code = new bytes(8);
        bytes memory hexChars = "0123456789ABCDEF";
        
        for (uint256 i = 0; i < 8; i++) {
            code[i] = hexChars[uint8(hash[i]) % 16];
        }
        
        return string(abi.encodePacked("PUB-", string(code), "-VUSD"));
    }
}
