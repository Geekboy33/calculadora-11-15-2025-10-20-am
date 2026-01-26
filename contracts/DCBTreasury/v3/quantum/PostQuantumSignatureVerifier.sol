// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                  ║
 * ║   ██████╗  ██████╗ ███████╗████████╗     ██████╗ ██╗   ██╗ █████╗ ███╗   ██╗████████╗██╗   ██╗███╗   ███╗        ║
 * ║   ██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝    ██╔═══██╗██║   ██║██╔══██╗████╗  ██║╚══██╔══╝██║   ██║████╗ ████║        ║
 * ║   ██████╔╝██║   ██║███████╗   ██║       ██║   ██║██║   ██║███████║██╔██╗ ██║   ██║   ██║   ██║██╔████╔██║        ║
 * ║   ██╔═══╝ ██║   ██║╚════██║   ██║       ██║▄▄ ██║██║   ██║██╔══██║██║╚██╗██║   ██║   ██║   ██║██║╚██╔╝██║        ║
 * ║   ██║     ╚██████╔╝███████║   ██║       ╚██████╔╝╚██████╔╝██║  ██║██║ ╚████║   ██║   ╚██████╔╝██║ ╚═╝ ██║        ║
 * ║   ╚═╝      ╚═════╝ ╚══════╝   ╚═╝        ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝        ║
 * ║                                                                                                                  ║
 * ║   ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ████████╗██╗   ██╗██████╗ ███████╗███████╗                               ║
 * ║   ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██╔════╝██╔════╝                               ║
 * ║   ███████╗██║██║  ███╗██╔██╗ ██║███████║   ██║   ██║   ██║██████╔╝█████╗  ███████╗                               ║
 * ║   ╚════██║██║██║   ██║██║╚██╗██║██╔══██║   ██║   ██║   ██║██╔══██╗██╔══╝  ╚════██║                               ║
 * ║   ███████║██║╚██████╔╝██║ ╚████║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗███████║                               ║
 * ║   ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝                               ║
 * ║                                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                  ║
 * ║  🔐 POST-QUANTUM CRYPTOGRAPHY SIGNATURE VERIFIER                                                                 ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                                        ║
 * ║                                                                                                                  ║
 * ║  📜 NIST PQC Standards Implemented:                                                                              ║
 * ║  ├─ ML-DSA (FIPS 204) - Previously CRYSTALS-Dilithium                                                            ║
 * ║  ├─ SLH-DSA (FIPS 205) - Previously SPHINCS+                                                                     ║
 * ║  └─ Hybrid Mode: ECDSA + PQC for transition period                                                               ║
 * ║                                                                                                                  ║
 * ║  🛡️ SECURITY FEATURES:                                                                                           ║
 * ║  ├─ Quantum-resistant digital signatures                                                                         ║
 * ║  ├─ Crypto-agility (switchable algorithms)                                                                       ║
 * ║  ├─ Dual-signature verification (classical + PQC)                                                                ║
 * ║  ├─ Protection against "Harvest Now, Decrypt Later"                                                              ║
 * ║  └─ Future-proof architecture                                                                                    ║
 * ║                                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title PostQuantumSignatureVerifier
 * @author Digital Commercial Bank Ltd
 * @notice Implements post-quantum cryptographic signature verification
 * @dev Supports ML-DSA, SLH-DSA, and hybrid ECDSA+PQC modes
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 1.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PostQuantumSignatureVerifier is AccessControl, Pausable {
    using ECDSA for bytes32;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              CONSTANTS & VERSION                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    string public constant VERSION = "1.0.0";
    string public constant STANDARD = "NIST FIPS 204/205";
    
    /// @notice ML-DSA-65 (Dilithium3) parameters
    uint256 public constant ML_DSA_65_PK_SIZE = 1952;    // Public key size in bytes
    uint256 public constant ML_DSA_65_SIG_SIZE = 3293;   // Signature size in bytes
    
    /// @notice ML-DSA-87 (Dilithium5) parameters - Higher security
    uint256 public constant ML_DSA_87_PK_SIZE = 2592;
    uint256 public constant ML_DSA_87_SIG_SIZE = 4595;
    
    /// @notice SLH-DSA-SHAKE-256f (SPHINCS+) parameters
    uint256 public constant SLH_DSA_256F_PK_SIZE = 64;
    uint256 public constant SLH_DSA_256F_SIG_SIZE = 49856;
    
    /// @notice SLH-DSA-SHAKE-128f (SPHINCS+ smaller variant)
    uint256 public constant SLH_DSA_128F_PK_SIZE = 32;
    uint256 public constant SLH_DSA_128F_SIG_SIZE = 17088;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  ACCESS ROLES                                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant PQC_ADMIN_ROLE = keccak256("PQC_ADMIN_ROLE");
    bytes32 public constant KEY_MANAGER_ROLE = keccak256("KEY_MANAGER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                     ENUMS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Supported PQC algorithms
    enum PQCAlgorithm {
        NONE,               // 0 - Not set
        ML_DSA_65,          // 1 - CRYSTALS-Dilithium Level 3 (NIST Security Level 3)
        ML_DSA_87,          // 2 - CRYSTALS-Dilithium Level 5 (NIST Security Level 5)
        SLH_DSA_128F,       // 3 - SPHINCS+-SHAKE-128f (Hash-based, fast)
        SLH_DSA_256F,       // 4 - SPHINCS+-SHAKE-256f (Hash-based, high security)
        HYBRID_ECDSA_ML_DSA // 5 - Hybrid: ECDSA + ML-DSA-65
    }
    
    /// @notice Verification mode
    enum VerificationMode {
        CLASSICAL_ONLY,     // Only ECDSA (legacy)
        PQC_ONLY,           // Only post-quantum
        HYBRID_BOTH,        // Both required (maximum security)
        HYBRID_ANY          // Either valid (transition mode)
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    STRUCTS                                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Post-Quantum Public Key record
     */
    struct PQCPublicKey {
        bytes32 keyId;
        address owner;
        PQCAlgorithm algorithm;
        bytes publicKeyData;        // Full PQC public key
        bytes32 publicKeyHash;      // Hash for quick lookup
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 usageCount;
        string metadata;
    }
    
    /**
     * @notice Signature verification record
     */
    struct SignatureRecord {
        bytes32 signatureId;
        bytes32 messageHash;
        address signer;
        PQCAlgorithm algorithm;
        bool isValid;
        uint256 verifiedAt;
        bytes32 classicalSigHash;   // Hash of ECDSA signature (if hybrid)
        bytes32 pqcSigHash;         // Hash of PQC signature
    }
    
    /**
     * @notice Hybrid signature bundle
     */
    struct HybridSignature {
        bytes ecdsaSignature;       // Classical ECDSA signature
        bytes pqcSignature;         // Post-quantum signature
        PQCAlgorithm pqcAlgorithm;
        bytes32 pqcPublicKeyHash;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              STATE VARIABLES                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Current verification mode
    VerificationMode public verificationMode;
    
    /// @notice Default PQC algorithm
    PQCAlgorithm public defaultAlgorithm;
    
    /// @notice PQC Public keys by ID
    mapping(bytes32 => PQCPublicKey) public pqcPublicKeys;
    bytes32[] public publicKeyIds;
    
    /// @notice Owner to public key mapping
    mapping(address => bytes32[]) public ownerToKeys;
    
    /// @notice Public key hash to ID mapping
    mapping(bytes32 => bytes32) public publicKeyHashToId;
    
    /// @notice Signature records
    mapping(bytes32 => SignatureRecord) public signatureRecords;
    bytes32[] public signatureIds;
    
    /// @notice Trusted verifiers (off-chain PQC verification services)
    mapping(address => bool) public trustedVerifiers;
    
    /// @notice Total keys registered
    uint256 public totalKeys;
    
    /// @notice Total signatures verified
    uint256 public totalVerifications;
    
    /// @notice Statistics by algorithm
    mapping(PQCAlgorithm => uint256) public algorithmUsage;
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                    EVENTS                                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    event PQCPublicKeyRegistered(
        bytes32 indexed keyId,
        address indexed owner,
        PQCAlgorithm algorithm,
        bytes32 publicKeyHash,
        uint256 expiresAt
    );
    
    event PQCPublicKeyRevoked(
        bytes32 indexed keyId,
        address indexed owner,
        string reason
    );
    
    event SignatureVerified(
        bytes32 indexed signatureId,
        bytes32 indexed messageHash,
        address indexed signer,
        PQCAlgorithm algorithm,
        bool isValid,
        bool isHybrid
    );
    
    event HybridSignatureVerified(
        bytes32 indexed signatureId,
        bytes32 messageHash,
        bool ecdsaValid,
        bool pqcValid,
        bool overallValid
    );
    
    event VerificationModeChanged(
        VerificationMode oldMode,
        VerificationMode newMode
    );
    
    event TrustedVerifierUpdated(
        address indexed verifier,
        bool isTrusted
    );
    
    event QuantumThreatLevelUpdated(
        uint8 oldLevel,
        uint8 newLevel,
        string reason
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                                  CONSTRUCTOR                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PQC_ADMIN_ROLE, _admin);
        _grantRole(KEY_MANAGER_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
        
        // Start in hybrid mode for transition
        verificationMode = VerificationMode.HYBRID_ANY;
        defaultAlgorithm = PQCAlgorithm.ML_DSA_65;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           PUBLIC KEY MANAGEMENT                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Registers a new PQC public key
     * @param owner Owner of the key
     * @param algorithm PQC algorithm type
     * @param publicKeyData Full public key data
     * @param validityPeriod How long the key is valid
     * @param metadata Additional metadata
     * @return keyId The generated key ID
     */
    function registerPublicKey(
        address owner,
        PQCAlgorithm algorithm,
        bytes calldata publicKeyData,
        uint256 validityPeriod,
        string calldata metadata
    ) external onlyRole(KEY_MANAGER_ROLE) returns (bytes32 keyId) {
        require(owner != address(0), "Invalid owner");
        require(algorithm != PQCAlgorithm.NONE, "Invalid algorithm");
        require(publicKeyData.length > 0, "Empty public key");
        require(validityPeriod > 0 && validityPeriod <= 365 days * 5, "Invalid validity");
        
        // Validate key size based on algorithm
        _validateKeySize(algorithm, publicKeyData.length);
        
        // Generate key ID
        keyId = keccak256(abi.encodePacked(
            owner, algorithm, publicKeyData, block.timestamp, totalKeys
        ));
        
        require(pqcPublicKeys[keyId].createdAt == 0, "Key already exists");
        
        bytes32 publicKeyHash = keccak256(publicKeyData);
        require(publicKeyHashToId[publicKeyHash] == bytes32(0), "Key hash already registered");
        
        pqcPublicKeys[keyId] = PQCPublicKey({
            keyId: keyId,
            owner: owner,
            algorithm: algorithm,
            publicKeyData: publicKeyData,
            publicKeyHash: publicKeyHash,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + validityPeriod,
            usageCount: 0,
            metadata: metadata
        });
        
        publicKeyIds.push(keyId);
        ownerToKeys[owner].push(keyId);
        publicKeyHashToId[publicKeyHash] = keyId;
        totalKeys++;
        
        emit PQCPublicKeyRegistered(keyId, owner, algorithm, publicKeyHash, block.timestamp + validityPeriod);
        
        return keyId;
    }
    
    /**
     * @notice Revokes a PQC public key
     */
    function revokePublicKey(bytes32 keyId, string calldata reason) 
        external 
        onlyRole(KEY_MANAGER_ROLE) 
    {
        PQCPublicKey storage key = pqcPublicKeys[keyId];
        require(key.createdAt > 0, "Key not found");
        require(key.isActive, "Key already revoked");
        
        key.isActive = false;
        
        emit PQCPublicKeyRevoked(keyId, key.owner, reason);
    }
    
    function _validateKeySize(PQCAlgorithm algorithm, uint256 size) internal pure {
        if (algorithm == PQCAlgorithm.ML_DSA_65) {
            require(size == ML_DSA_65_PK_SIZE, "Invalid ML-DSA-65 key size");
        } else if (algorithm == PQCAlgorithm.ML_DSA_87) {
            require(size == ML_DSA_87_PK_SIZE, "Invalid ML-DSA-87 key size");
        } else if (algorithm == PQCAlgorithm.SLH_DSA_128F) {
            require(size == SLH_DSA_128F_PK_SIZE, "Invalid SLH-DSA-128f key size");
        } else if (algorithm == PQCAlgorithm.SLH_DSA_256F) {
            require(size == SLH_DSA_256F_PK_SIZE, "Invalid SLH-DSA-256f key size");
        }
        // HYBRID_ECDSA_ML_DSA uses ML_DSA_65 for PQC part
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                           SIGNATURE VERIFICATION                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Verifies a classical ECDSA signature
     * @param messageHash Hash of the message
     * @param signature ECDSA signature
     * @param expectedSigner Expected signer address
     * @return isValid Whether signature is valid
     */
    function verifyECDSA(
        bytes32 messageHash,
        bytes calldata signature,
        address expectedSigner
    ) public view returns (bool isValid) {
        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);
        return recoveredSigner == expectedSigner;
    }
    
    /**
     * @notice Verifies a PQC signature (via trusted verifier attestation)
     * @dev Since PQC verification is computationally expensive, we use off-chain verification
     *      with on-chain attestation from trusted verifiers
     * @param messageHash Hash of the message
     * @param pqcPublicKeyHash Hash of the PQC public key
     * @param pqcSignatureHash Hash of the PQC signature
     * @param verifierAttestation Attestation from trusted verifier
     * @return isValid Whether signature is valid
     */
    function verifyPQCSignature(
        bytes32 messageHash,
        bytes32 pqcPublicKeyHash,
        bytes32 pqcSignatureHash,
        bytes calldata verifierAttestation
    ) public returns (bool isValid) {
        // Get the key
        bytes32 keyId = publicKeyHashToId[pqcPublicKeyHash];
        require(keyId != bytes32(0), "PQC key not found");
        
        PQCPublicKey storage key = pqcPublicKeys[keyId];
        require(key.isActive, "PQC key revoked");
        require(block.timestamp <= key.expiresAt, "PQC key expired");
        
        // Decode verifier attestation
        // Format: [verifierAddress(20) | timestamp(32) | validFlag(1) | verifierSignature(65)]
        require(verifierAttestation.length >= 118, "Invalid attestation");
        
        address verifier = address(bytes20(verifierAttestation[:20]));
        require(trustedVerifiers[verifier], "Untrusted verifier");
        
        uint256 attestationTimestamp = uint256(bytes32(verifierAttestation[20:52]));
        require(block.timestamp - attestationTimestamp <= 5 minutes, "Attestation expired");
        
        bool validFlag = verifierAttestation[52] == 0x01;
        
        // Verify the verifier's signature on the attestation
        bytes32 attestationHash = keccak256(abi.encodePacked(
            messageHash,
            pqcPublicKeyHash,
            pqcSignatureHash,
            attestationTimestamp,
            validFlag
        ));
        
        bytes memory verifierSig = verifierAttestation[53:118];
        address recoveredVerifier = attestationHash.toEthSignedMessageHash().recover(verifierSig);
        require(recoveredVerifier == verifier, "Invalid verifier signature");
        
        // Update key usage
        key.usageCount++;
        algorithmUsage[key.algorithm]++;
        
        // Record the verification
        bytes32 sigId = keccak256(abi.encodePacked(
            messageHash, pqcSignatureHash, block.timestamp
        ));
        
        signatureRecords[sigId] = SignatureRecord({
            signatureId: sigId,
            messageHash: messageHash,
            signer: key.owner,
            algorithm: key.algorithm,
            isValid: validFlag,
            verifiedAt: block.timestamp,
            classicalSigHash: bytes32(0),
            pqcSigHash: pqcSignatureHash
        });
        
        signatureIds.push(sigId);
        totalVerifications++;
        
        emit SignatureVerified(sigId, messageHash, key.owner, key.algorithm, validFlag, false);
        
        return validFlag;
    }
    
    /**
     * @notice Verifies a hybrid signature (ECDSA + PQC)
     * @param messageHash Hash of the message
     * @param hybridSig The hybrid signature bundle
     * @param expectedSigner Expected signer address
     * @return isValid Whether signature is valid according to current mode
     */
    function verifyHybridSignature(
        bytes32 messageHash,
        HybridSignature calldata hybridSig,
        address expectedSigner,
        bytes calldata verifierAttestation
    ) external returns (bool isValid) {
        bool ecdsaValid = verifyECDSA(messageHash, hybridSig.ecdsaSignature, expectedSigner);
        
        bytes32 pqcSigHash = keccak256(hybridSig.pqcSignature);
        bool pqcValid = verifyPQCSignature(
            messageHash,
            hybridSig.pqcPublicKeyHash,
            pqcSigHash,
            verifierAttestation
        );
        
        // Determine validity based on mode
        bool overallValid;
        if (verificationMode == VerificationMode.CLASSICAL_ONLY) {
            overallValid = ecdsaValid;
        } else if (verificationMode == VerificationMode.PQC_ONLY) {
            overallValid = pqcValid;
        } else if (verificationMode == VerificationMode.HYBRID_BOTH) {
            overallValid = ecdsaValid && pqcValid;
        } else { // HYBRID_ANY
            overallValid = ecdsaValid || pqcValid;
        }
        
        bytes32 sigId = keccak256(abi.encodePacked(
            messageHash, hybridSig.ecdsaSignature, hybridSig.pqcSignature, block.timestamp
        ));
        
        emit HybridSignatureVerified(sigId, messageHash, ecdsaValid, pqcValid, overallValid);
        
        return overallValid;
    }
    
    /**
     * @notice Simple verification check for contracts
     * @dev Returns true if signature meets current security requirements
     */
    function isSignatureValid(
        bytes32 messageHash,
        address signer,
        bytes calldata signature,
        bytes32 pqcKeyHash,
        bytes calldata pqcSig,
        bytes calldata verifierAttestation
    ) external returns (bool) {
        if (verificationMode == VerificationMode.CLASSICAL_ONLY) {
            return verifyECDSA(messageHash, signature, signer);
        }
        
        bool ecdsaValid = verifyECDSA(messageHash, signature, signer);
        bool pqcValid = false;
        
        if (pqcKeyHash != bytes32(0) && pqcSig.length > 0) {
            bytes32 pqcSigHash = keccak256(pqcSig);
            pqcValid = verifyPQCSignature(messageHash, pqcKeyHash, pqcSigHash, verifierAttestation);
        }
        
        if (verificationMode == VerificationMode.PQC_ONLY) {
            return pqcValid;
        } else if (verificationMode == VerificationMode.HYBRID_BOTH) {
            return ecdsaValid && pqcValid;
        } else { // HYBRID_ANY
            return ecdsaValid || pqcValid;
        }
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              ADMIN FUNCTIONS                                          ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Sets the verification mode
     */
    function setVerificationMode(VerificationMode newMode) external onlyRole(PQC_ADMIN_ROLE) {
        VerificationMode oldMode = verificationMode;
        verificationMode = newMode;
        emit VerificationModeChanged(oldMode, newMode);
    }
    
    /**
     * @notice Sets the default algorithm
     */
    function setDefaultAlgorithm(PQCAlgorithm algorithm) external onlyRole(PQC_ADMIN_ROLE) {
        require(algorithm != PQCAlgorithm.NONE, "Invalid algorithm");
        defaultAlgorithm = algorithm;
    }
    
    /**
     * @notice Adds/removes trusted verifier
     */
    function setTrustedVerifier(address verifier, bool isTrusted) external onlyRole(PQC_ADMIN_ROLE) {
        require(verifier != address(0), "Invalid verifier");
        trustedVerifiers[verifier] = isTrusted;
        emit TrustedVerifierUpdated(verifier, isTrusted);
    }
    
    /**
     * @notice Emergency: Upgrade to PQC-only mode if quantum threat detected
     */
    function activateQuantumEmergency() external onlyRole(DEFAULT_ADMIN_ROLE) {
        verificationMode = VerificationMode.PQC_ONLY;
        emit QuantumThreatLevelUpdated(0, 10, "Quantum threat detected - PQC only mode activated");
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════════════════╗
    // ║                              VIEW FUNCTIONS                                           ║
    // ╚═══════════════════════════════════════════════════════════════════════════════════════╝
    
    function getPublicKey(bytes32 keyId) external view returns (PQCPublicKey memory) {
        return pqcPublicKeys[keyId];
    }
    
    function getOwnerKeys(address owner) external view returns (bytes32[] memory) {
        return ownerToKeys[owner];
    }
    
    function getActiveKeyForOwner(address owner) external view returns (bytes32) {
        bytes32[] memory keys = ownerToKeys[owner];
        for (uint256 i = 0; i < keys.length; i++) {
            PQCPublicKey storage key = pqcPublicKeys[keys[i]];
            if (key.isActive && block.timestamp <= key.expiresAt) {
                return keys[i];
            }
        }
        return bytes32(0);
    }
    
    function getSignatureRecord(bytes32 sigId) external view returns (SignatureRecord memory) {
        return signatureRecords[sigId];
    }
    
    function getAlgorithmName(PQCAlgorithm algorithm) external pure returns (string memory) {
        if (algorithm == PQCAlgorithm.ML_DSA_65) return "ML-DSA-65 (Dilithium3)";
        if (algorithm == PQCAlgorithm.ML_DSA_87) return "ML-DSA-87 (Dilithium5)";
        if (algorithm == PQCAlgorithm.SLH_DSA_128F) return "SLH-DSA-SHAKE-128f (SPHINCS+)";
        if (algorithm == PQCAlgorithm.SLH_DSA_256F) return "SLH-DSA-SHAKE-256f (SPHINCS+)";
        if (algorithm == PQCAlgorithm.HYBRID_ECDSA_ML_DSA) return "Hybrid ECDSA + ML-DSA-65";
        return "NONE";
    }
    
    function getStatistics() external view returns (
        uint256 _totalKeys,
        uint256 _totalVerifications,
        VerificationMode _currentMode,
        PQCAlgorithm _defaultAlgorithm
    ) {
        return (totalKeys, totalVerifications, verificationMode, defaultAlgorithm);
    }
}
