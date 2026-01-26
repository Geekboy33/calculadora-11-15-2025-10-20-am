// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDCB_USD_ISO20022
 * @author Digital Commercial Bank Ltd
 * @notice Interface for the DCB USD Token with ISO 20022 Integration
 */
interface IDCB_USD_ISO20022 {
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                                ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum ISO20022MessageType {
        PACS_008,   // FI to FI Customer Credit Transfer
        PACS_009,   // FI to FI Financial Institution Credit Transfer
        PACS_002,   // Payment Status Report
        CAMT_053,   // Bank to Customer Statement
        CAMT_054,   // Bank to Customer Debit/Credit Notification
        PAIN_001    // Customer Credit Transfer Initiation
    }
    
    enum CustodyStatus {
        ACTIVE,
        LOCKED,
        PENDING_VERIFICATION,
        SUSPENDED,
        CLOSED
    }
    
    enum InjectionStatus {
        PENDING,
        VERIFIED,
        MINTED,
        REJECTED,
        CANCELLED
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                           CUSTODY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Creates a new custody account
     */
    function createCustodyAccount(
        string calldata accountName,
        string calldata bankName,
        string calldata swiftBic,
        string calldata iban,
        string calldata accountNumber,
        bool isDAES,
        bool isSWIFT
    ) external returns (bytes32 accountId);
    
    /**
     * @notice Records a deposit to custody account
     */
    function recordCustodyDeposit(
        bytes32 accountId,
        uint256 amount,
        string calldata daesReference,
        string calldata swiftReference
    ) external;
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                        ISO 20022 FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Records an ISO 20022 message on-chain
     */
    function recordISO20022Message(
        ISO20022MessageType messageType,
        string calldata messageTypeCode,
        bytes32 transactionId,
        string calldata senderBIC,
        string calldata receiverBIC,
        uint256 amount,
        bytes32 isoHash,
        string calldata instructionId,
        string calldata endToEndId
    ) external returns (bytes32 messageId);
    
    /**
     * @notice Verifies an ISO 20022 message
     */
    function verifyISO20022Message(bytes32 messageId) external;
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                     LIQUIDITY INJECTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiates a liquidity injection from custody account
     */
    function initiateLiquidityInjection(
        bytes32 custodyAccountId,
        uint256 amount,
        bytes32 isoMessageId,
        string calldata daesTransactionId,
        string calldata swiftReference,
        address beneficiary,
        string calldata notes
    ) external returns (bytes32 injectionId);
    
    /**
     * @notice Verifies a liquidity injection
     */
    function verifyLiquidityInjection(bytes32 injectionId) external;
    
    /**
     * @notice Mints tokens from a verified injection
     */
    function mintFromInjection(bytes32 injectionId) external;
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                          SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Swaps DCB-USD to LUSD at 1:1 ratio
     */
    function swapToLUSD(uint256 amount) external;
    
    /**
     * @notice Swaps LUSD to DCB-USD at 1:1 ratio
     */
    function swapFromLUSD(uint256 amount) external;
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Gets total statistics
     */
    function getStatistics() external view returns (
        uint256 totalCustodyLocked,
        uint256 totalMintedFromCustody,
        uint256 totalInjections,
        uint256 totalISOMessages,
        uint256 totalSupply,
        uint256 averageOraclePrice
    );
    
    /**
     * @notice Gets average oracle price
     */
    function getAverageOraclePrice() external view returns (uint256);
    
    // ═══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event CustodyAccountCreated(
        bytes32 indexed accountId,
        string accountName,
        string bankName,
        string swiftBic,
        address indexed owner,
        bool isDAES,
        bool isSWIFT,
        uint256 timestamp
    );
    
    event CustodyDeposit(
        bytes32 indexed accountId,
        uint256 amount,
        uint256 newBalance,
        string daesReference,
        string swiftReference,
        uint256 timestamp
    );
    
    event CustodyLocked(
        bytes32 indexed accountId,
        uint256 amount,
        uint256 totalLocked,
        bytes32 indexed injectionId,
        uint256 timestamp
    );
    
    event ISO20022MessageRecorded(
        bytes32 indexed messageId,
        ISO20022MessageType messageType,
        string messageTypeCode,
        bytes32 indexed transactionId,
        string senderBIC,
        string receiverBIC,
        uint256 amount,
        bytes32 isoHash,
        uint256 timestamp
    );
    
    event ISO20022MessageVerified(
        bytes32 indexed messageId,
        address indexed verifiedBy,
        uint256 timestamp
    );
    
    event LiquidityInjectionInitiated(
        bytes32 indexed injectionId,
        bytes32 indexed custodyAccountId,
        uint256 amount,
        bytes32 isoMessageId,
        string daesTransactionId,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    event LiquidityInjectionVerified(
        bytes32 indexed injectionId,
        address indexed verifiedBy,
        uint256 oraclePrice,
        uint256 tokensToMint,
        uint256 timestamp
    );
    
    event LiquidityInjectionMinted(
        bytes32 indexed injectionId,
        address indexed beneficiary,
        uint256 tokensMinted,
        uint256 timestamp
    );
    
    event SwappedToLUSD(
        address indexed user,
        uint256 usdAmount,
        uint256 lusdAmount,
        uint256 timestamp
    );
    
    event SwappedFromLUSD(
        address indexed user,
        uint256 lusdAmount,
        uint256 usdAmount,
        uint256 timestamp
    );
}
