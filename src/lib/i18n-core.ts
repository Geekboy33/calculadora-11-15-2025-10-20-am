/**
 * Internationalization (i18n) System - Core
 * Types and translations only (no React)
 */

export type Language = 'es' | 'en';

export interface Translations {
  // Header
  headerTitle: string;
  headerSubtitle: string;
  productionEnvironment: string;
  allSystemsOperational: string;
  dtcAnalysisReady: string;

  // Navigation
  navDashboard: string;
  navLedger: string;
  navXcpB2B: string;
  navProcessor: string;
  navBinaryReader: string;
  navAnalyzerPro: string;
  navLargeFileAnalyzer: string;
  navTransfers: string;
  navApiKeys: string;
  navAuditLogs: string;
  navBlackScreen: string;
  navAuditBank: string;
  navCustody: string;

  // Footer
  footerVersion: string;
  footerIsoCompliant: string;
  footerPciReady: string;
  footerMultiCurrency: string;
  footerEncryption: string;
  footerForensicAnalysis: string;

  // Common
  loading: string;
  error: string;
  success: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  close: string;
  refresh: string;
  export: string;
  import: string;
  download: string;
  upload: string;
  select: string;
  search: string;
  filter: string;
  clear: string;
  confirm: string;

  // Currency names
  currencyUSD: string;
  currencyEUR: string;
  currencyGBP: string;
  currencyCHF: string;
  currencyCAD: string;
  currencyAUD: string;
  currencyJPY: string;
  currencyCNY: string;
  currencyINR: string;
  currencyMXN: string;
  currencyBRL: string;
  currencyRUB: string;
  currencyKRW: string;
  currencySGD: string;
  currencyHKD: string;

  // Dashboard
  dashboardTitle: string;
  dashboardAccounts: string;
  dashboardTransactions: string;
  dashboardBalance: string;
  dashboardLoadFiles: string;
  dashboardGenerateSample: string;
  dashboardNoAccounts: string;
  dashboardWelcome: string;
  dashboardAnalyzedBalances: string;
  dashboardCurrenciesDetected: string;
  dashboardSavedInMemory: string;
  dashboardWelcomeTitle: string;
  dashboardWelcomeMessage: string;
  dashboardOrGenerateSample: string;
  dashboardViewDashboard: string;
  dashboardAccountsCount: string;
  dashboardBalancesTitle: string;
  dashboardBalancesSubtitle: string;
  dashboardBalancesSaved: string;
  dashboardDetails: string;
  dashboardRecentTransfers: string;
  dashboardNoTransfers: string;
  dashboardAccountInfo: string;
  dashboardErrorProcessing: string;
  dashboardErrorCreatingSample: string;
  dashboardNoCurrencyBlocks: string;
  dashboardFileProcessed: string;
  dashboardSampleCreated: string;
  dashboardUnknownError: string;

  // Ledger
  ledgerTitle: string;
  ledgerSubtitle: string;
  ledgerTotalAccounts: string;
  ledgerTotalTransactions: string;
  ledgerLastUpdate: string;
  ledgerStatus: string;
  ledgerOperational: string;
  ledgerNoData: string;
  ledgerUpdating: string;
  ledgerConnected: string;
  ledgerAccount: string;
  ledgerPrincipal: string;
  ledgerSecondary: string;
  ledgerTertiary: string;
  ledgerFourth: string;
  ledgerTotalBalance: string;
  ledgerAverage: string;
  ledgerHighest: string;
  ledgerLowest: string;
  ledgerUpdatedAt: string;
  ledgerOfCurrencies: string;
  ledgerProcessed: string;
  ledgerWaiting: string;
  ledgerNoAccountsLoaded: string;
  ledgerNoBalancesInLedger: string;
  ledgerUseAnalyzerToLoad: string;
  ledgerGoToAnalyzer: string;
  ledgerTransactions: string;

  // Large File Analyzer
  analyzerTitle: string;
  analyzerSubtitle: string;
  analyzerSelectFile: string;
  analyzerLoadSaved: string;
  analyzerPause: string;
  analyzerResume: string;
  analyzerStop: string;
  analyzerClearMemory: string;
  analyzerProcessing: string;
  analyzerCompleted: string;
  analyzerProgress: string;
  analyzerIndependentAccounts: string;
  analyzerGlobalSummary: string;
  analyzerUpdatingLedger: string;
  analyzerSyncingLedger: string;
  analyzerFileInfo: string;
  analyzerDetectedAlgorithm: string;
  analyzerEncryptionStatus: string;
  analyzerEncrypted: string;
  analyzerNotEncrypted: string;
  analyzerEntropy: string;
  analyzerHighEntropy: string;
  analyzerLowEntropy: string;
  analyzerTryDecrypt: string;
  analyzerLastTransactions: string;
  analyzerLoadFileForAnalysis: string;
  analyzerCurrenciesDetected: string;
  analyzerPendingProcess: string;
  analyzerProcessInterrupted: string;
  analyzerReadyToContinue: string;
  analyzerFile: string;
  analyzerSavedProgress: string;
  analyzerContinueFrom: string;
  analyzerCancelProcess: string;
  analyzerError: string;
  analyzerNoPendingProcess: string;
  analyzerCouldNotRecover: string;
  analyzerLoadFileAgain: string;
  analyzerConfirmCancel: string;
  analyzerAccountsByCurrency: string;
  analyzerUpdatingRealTime: string;
  analyzerExportReport: string;
  analyzerTotalTransactions: string;
  analyzerDetectedCurrencies: string;
  analyzerSyncing: string;
  analyzerCompletedSuccessfully: string;
  analyzerMagicNumber: string;
  analyzerEntropyAnalysis: string;
  analyzerAverageEntropy: string;
  analyzerHighEntropyDescription: string;
  analyzerLowEntropyDescription: string;
  analyzerDecryptFile: string;
  analyzerUsername: string;
  analyzerPassword: string;
  analyzerEnterUsername: string;
  analyzerEnterPassword: string;
  analyzerDecrypt: string;
  analyzerUsernamePasswordRequired: string;
  analyzerDecryptionDevelopment: string;
  analyzerNavigateToOtherModules: string;
  analyzerFloatingIndicator: string;
  analyzerProcessed: string;
  analyzerLastUpdate: string;
  analyzerTotalBalance: string;
  analyzerAverage: string;
  analyzerHighest: string;
  analyzerLowest: string;
  analyzerPrincipal: string;
  analyzerSecondary: string;
  analyzerAccount: string;
  analyzerAdding: string;

  // XCP B2B API
  xcpTitle: string;
  xcpSubtitle: string;
  xcpSecurityFeatures: string;
  xcpAuthentication: string;
  xcpObtainToken: string;
  xcpTokenActive: string;
  xcpTokenValid: string;
  xcpAvailableBalances: string;
  xcpFundsFromAnalyzer: string;
  xcpBalanceSelected: string;
  xcpCreateRemittance: string;
  xcpAmount: string;
  xcpDestinationAccount: string;
  xcpReference: string;
  xcpPurposeCode: string;
  xcpBeneficiaryName: string;
  xcpBeneficiaryIban: string;
  xcpUrgent: string;
  xcpUrgentNote: string;
  xcpSubmit: string;
  xcpProcessing: string;
  xcpRemittanceStatus: string;
  xcpTransactionId: string;
  xcpStatus: string;
  xcpCreated: string;
  xcpCompleted: string;
  xcpTransferCompleted: string;
  xcpFundsTransferred: string;
  xcpMtls: string;
  xcpTlsVersion: string;
  xcpHmac: string;
  xcpHmacAlgo: string;
  xcpJwt: string;
  xcpBearerAuth: string;
  xcpAntiReplay: string;
  xcpTimeWindow: string;
  xcpEndpoint: string;
  xcpAuth: string;
  xcpRequired: string;
  xcpCompleteDocumentation: string;
  xcpDocumentationText: string;
  xcpMtlsImplementation: string;
  xcpHmacSigning: string;
  xcpAutoRetry: string;
  xcpSchemaValidation: string;

  // Messages
  msgBalancesLoaded: string;
  msgBalancesCleared: string;
  msgConfirmClear: string;
  msgInsufficientBalance: string;
  msgTokenRequired: string;
  msgFieldsRequired: string;
  msgProcessingFile: string;
  msgAnalysisComplete: string;
  msgErrorOccurred: string;

  // Validation Messages
  validationNoCapitalTitle: string;
  validationNoCapitalAccount: string;
  validationNoCapitalBalanceTotal: string;
  validationNoCapitalBalanceAvailable: string;
  validationNoCapitalBalanceReserved: string;
  validationNoCapitalMessage: string;
  validationNoCapitalSolution: string;
  validationNoCapitalSolution1: string;
  validationNoCapitalSolution2: string;
  validationAmountExceedsTitle: string;
  validationAmountExceedsRequested: string;
  validationAmountExceedsAvailable: string;
  validationAmountExceedsMessage: string;
  validationDuplicatePledgeTitle: string;
  validationDuplicatePledgeMessage: string;
  validationDuplicatePledgeSolution: string;
  validationDuplicatePledgeSolution1: string;
  validationDuplicatePledgeSolution2: string;
  
  // Time
  timeSeconds: string;
  timeMinutes: string;
  timeHours: string;
  timeDays: string;

  // Black Screen
  blackScreenTitle: string;
  blackScreenSubtitle: string;
  blackScreenGenerator: string;
  blackScreenAvailableAccounts: string;
  blackScreenNoBalances: string;
  blackScreenUseAnalyzer: string;
  blackScreenGenerate: string;
  blackScreenConfidential: string;
  blackScreenDownloadTxt: string;
  blackScreenPrint: string;
  blackScreenClose: string;
  blackScreenBankConfirmation: string;
  blackScreenXcpBank: string;
  blackScreenDocumentConfidential: string;
  blackScreenBeneficiaryInfo: string;
  blackScreenHolder: string;
  blackScreenAccount: string;
  blackScreenBank: string;
  blackScreenSwift: string;
  blackScreenRoutingNumber: string;
  blackScreenCurrency: string;
  blackScreenMonetaryAggregates: string;
  blackScreenM1Liquid: string;
  blackScreenM1Description: string;
  blackScreenM2Near: string;
  blackScreenM2Description: string;
  blackScreenM3Broad: string;
  blackScreenM3Description: string;
  blackScreenM4Total: string;
  blackScreenM4Description: string;
  blackScreenVerifiedBalance: string;
  blackScreenTechnicalInfo: string;
  blackScreenDtcReference: string;
  blackScreenVerificationHash: string;
  blackScreenTransactionsProcessed: string;
  blackScreenIssueDate: string;
  blackScreenExpiryDate: string;
  blackScreenVerificationStatus: string;
  blackScreenVerified: string;
  blackScreenCertification: string;
  blackScreenCertificationText: string;
  blackScreenCertificationStandards: string;
  blackScreenDigitallySigned: string;
  blackScreenGeneratedBy: string;
  blackScreenCopyright: string;
  blackScreenMasterAccount: string;
  blackScreenInternational: string;
  blackScreenTotalAvailable: string;
  blackScreenPrincipal: string;

  // Login
  loginTitle: string;
  loginSubtitle: string;
  loginUser: string;
  loginPassword: string;
  loginShowPassword: string;
  loginHidePassword: string;
  loginButton: string;
  loginAuthenticating: string;
  loginInvalidCredentials: string;
  loginTooManyAttempts: string;
  loginAttempts: string;
  loginSecureConnection: string;
  loginCopyright: string;
  loginVersion: string;
  loginAllRightsReserved: string;
  // Treasury Minting Login
  tmLoginTitle: string;
  tmLoginSubtitle: string;
  tmLoginUser: string;
  tmLoginUserPlaceholder: string;
  tmLoginPassword: string;
  tmLoginPasswordPlaceholder: string;
  tmLoginButton: string;
  tmLoginAuthenticating: string;
  tmTestCredentials: string;
  tmTestUser: string;
  tmTestPassword: string;

  // App Header
  logout: string;
  logoutTitle: string;

  // Advanced Banking Dashboard
  advDashboardTitle: string;
  advDashboardSubtitle: string;
  advDashboardTotalBalance: string;
  advDashboardActiveAccounts: string;
  advDashboardTransactions: string;
  advDashboardMovements: string;
  advDashboardDebits: string;
  advDashboardCredits: string;
  advDashboardFees: string;
  advDashboardLedgerAccounts: string;
  advDashboardCurrencyDistribution: string;
  advDashboardTransactionHistory: string;
  advDashboardNoTransactions: string;
  advDashboardNoTransactionsMessage: string;
  advDashboardAllPeriods: string;
  advDashboardLast24h: string;
  advDashboardLast7d: string;
  advDashboardLast30d: string;
  advDashboardAllCurrencies: string;
  advDashboardUpdate: string;
  advDashboardUpdating: string;
  advDashboardHideBalance: string;
  advDashboardShowBalance: string;
  advDashboardConvertedBalance: string;

  // Audit Bank Panel
  auditTitle: string;
  auditSubtitle: string;
  auditStartScan: string;
  auditScanning: string;
  auditStopScan: string;
  auditExportJson: string;
  auditExportCsv: string;
  auditTotalFindings: string;
  auditFilesScanned: string;
  auditBanksDetected: string;
  auditAccountsFound: string;
  auditTotalAmount: string;
  auditClassifications: string;
  auditM0Cash: string;
  auditM1Demand: string;
  auditM2Savings: string;
  auditM3Institutional: string;
  auditM4Instruments: string;
  auditFindings: string;
  auditNoFindings: string;
  auditLoadResults: string;
  auditFile: string;
  auditBank: string;
  auditAccount: string;
  auditAmount: string;
  auditCurrency: string;
  auditClassification: string;
  auditConfidence: string;
  auditEvidence: string;
  auditDetectedAt: string;
  auditAggregatedTotals: string;
  auditEquivUsd: string;
  auditSecurityNote: string;
  auditSecurityMessage: string;
  auditConfigureDataPath: string;
  auditDataPath: string;
  auditProcessing: string;
  auditComplete: string;
  auditError: string;
  auditM0Description: string;
  auditM1Description: string;
  auditM2Description: string;
  auditM3Description: string;
  auditM4Description: string;
  auditLoadFile: string;
  auditMaskedView: string;
  auditCompleteView: string;
  auditClearData: string;
  auditDataSources: string;
  auditAnalyzerIntegration: string;
  auditAnalyzerDescription: string;
  auditActiveSubscription: string;
  auditAutoSync: string;
  auditSystemBalances: string;
  auditAnalyzeBalances: string;
  auditMonetaryClassification: string;
  auditDetailedFindings: string;
  auditScrollToSeeAll: string;
  auditViewFullReport: string;

  // DCB Treasury Certification Platform
  dcbTitle: string;
  dcbSubtitle: string;
  dcbDashboard: string;
  dcbContracts: string;
  dcbBanks: string;
  dcbCustody: string;
  dcbLocks: string;
  dcbMinting: string;
  dcbTerminal: string;
  dcbConfig: string;
  dcbWalletsRoles: string;
  dcbBack: string;
  dcbDisconnect: string;
  dcbDirectConnect: string;
  dcbDirectConnection: string;
  dcbSelectWallet: string;
  dcbCancel: string;
  dcbConnect: string;
  dcbConnecting: string;
  dcbSummary: string;
  dcbActive: string;
  dcbCustodies: string;
  dcbViewRoles: string;
  dcbAuthorized: string;
  dcbAuthorizedWallets: string;
  dcbViewDetails: string;
  dcbRecentLocks: string;
  dcbNoLocks: string;
  dcbStatus: string;
  dcbAmount: string;
  dcbExpiry: string;
  dcbBeneficiary: string;
  dcbSandbox: string;
  dcbProduction: string;
  dcbNotConnected: string;
  dcbSwitchNetwork: string;
  dcbDirect: string;
  
  // DCB Treasury - Contracts Tab
  dcbContractsV3: string;
  dcbContractsDeployed: string;
  dcbContractsPending: string;
  dcbContractsTotalLines: string;
  dcbContractsNetwork: string;
  dcbContractsChainId: string;
  dcbContractsExplorer: string;
  dcbContractsViewOnExplorer: string;
  dcbContractsCopy: string;
  dcbContractsCopied: string;
  dcbContractsFeatures: string;
  dcbContractsSourceFiles: string;
  
  // DCB Treasury - Banks Tab
  dcbBanksTitle: string;
  dcbBanksRegistered: string;
  dcbBanksAdd: string;
  dcbBanksId: string;
  dcbBanksName: string;
  dcbBanksSigner: string;
  dcbBanksStatus: string;
  dcbBanksActions: string;
  dcbBanksNoRegistered: string;
  dcbBanksAddFirst: string;
  dcbBanksRegisterNew: string;
  dcbBanksSwiftCode: string;
  dcbBanksCountry: string;
  dcbBanksRegister: string;
  dcbBanksRegistering: string;
  
  // DCB Treasury - Custody Tab
  dcbCustodyTitle: string;
  dcbCustodyAccounts: string;
  dcbCustodyCreate: string;
  dcbCustodySourceAccount: string;
  dcbCustodySelectSource: string;
  dcbCustodyAvailable: string;
  dcbCustodyLocked: string;
  dcbCustodyTotal: string;
  dcbCustodyNoAccounts: string;
  dcbCustodyCreateFirst: string;
  dcbCustodyVaultAddress: string;
  dcbCustodyMetadataHash: string;
  dcbCustodyCreatedAt: string;
  dcbCustodyLastActivity: string;
  dcbCustodyOwner: string;
  
  // DCB Treasury - Locks Tab
  dcbLocksTitle: string;
  dcbLocksCreate: string;
  dcbLocksSelectCustody: string;
  dcbLocksSelectBank: string;
  dcbLocksAmount: string;
  dcbLocksExpiry: string;
  dcbLocksUetr: string;
  dcbLocksBeneficiary: string;
  dcbLocksCreateLock: string;
  dcbLocksCreating: string;
  dcbLocksNoLocks: string;
  dcbLocksCreateFirst: string;
  dcbLocksRequested: string;
  dcbLocksLocked: string;
  dcbLocksConsumed: string;
  dcbLocksCanceled: string;
  dcbLocksConsume: string;
  dcbLocksRelease: string;
  dcbLocksBankSignature: string;
  dcbLocksIsoHash: string;
  dcbLocksDaesTxnId: string;
  
  // DCB Treasury - Minting Tab
  dcbMintingTitle: string;
  dcbMintingConsume: string;
  dcbMintingSelectLock: string;
  dcbMintingConsumeAndMint: string;
  dcbMintingConsuming: string;
  dcbMintingNoLocksAvailable: string;
  dcbMintingCreateLockFirst: string;
  dcbMintingLemxCode: string;
  dcbMintingEnterCode: string;
  dcbMintingVerify: string;
  dcbMintingVerifying: string;
  dcbMintingEnterHash: string;
  dcbMintingEnterContract: string;
  dcbMintingVerifyContract: string;
  dcbMintingContractVerified: string;
  dcbMintingContractMismatch: string;
  dcbMintingConfirmMint: string;
  dcbMintingConfirming: string;
  dcbMintingExplorer: string;
  dcbMintingHistory: string;
  dcbMintingNoHistory: string;
  dcbMintingViewDetails: string;
  dcbMintingDownloadPdf: string;
  dcbMintingAuthorizationCode: string;
  dcbMintingPublicationHash: string;
  dcbMintingContractAddress: string;
  dcbMintingLusdMinted: string;
  dcbMintingTimestamp: string;
  
  // DCB Treasury - Terminal Tab
  dcbTerminalTitle: string;
  dcbTerminalClear: string;
  dcbTerminalExport: string;
  dcbTerminalPause: string;
  dcbTerminalResume: string;
  dcbTerminalAutoScroll: string;
  dcbTerminalNoLogs: string;
  
  // DCB Treasury - Config Tab
  dcbConfigTitle: string;
  dcbConfigContractAddresses: string;
  dcbConfigNetwork: string;
  dcbConfigChainId: string;
  dcbConfigRpcUrl: string;
  dcbConfigExplorerUrl: string;
  dcbConfigSave: string;
  dcbConfigSaving: string;
  dcbConfigReset: string;
  dcbConfigResetConfirm: string;
  
  // DCB Treasury - Wallets & Roles Tab
  dcbWalletsTitle: string;
  dcbWalletsAuthorized: string;
  dcbWalletsRole: string;
  dcbWalletsAddress: string;
  dcbWalletsDescription: string;
  dcbWalletsPermissions: string;
  dcbWalletsPrivateKey: string;
  dcbWalletsShowKey: string;
  dcbWalletsHideKey: string;
  dcbWalletsCopyKey: string;
  dcbWalletsKeyCopied: string;
  
  // DCB Treasury - Flow Steps
  dcbFlowStep1: string;
  dcbFlowStep2: string;
  dcbFlowStep3: string;
  dcbFlowStep4: string;
  dcbFlowStep5: string;
  dcbFlowStep6: string;
  
  // DCB Treasury - LEMX Authorization
  dcbLemxTitle: string;
  dcbLemxPendingRequests: string;
  dcbLemxApprove: string;
  dcbLemxReject: string;
  dcbLemxApproving: string;
  dcbLemxRejecting: string;
  dcbLemxNoRequests: string;
  dcbLemxRequestDetails: string;
  dcbLemxAuthCode: string;
  dcbLemxAmount: string;
  dcbLemxRequestedAt: string;
  dcbLemxRequestedBy: string;
  
  // DCB Treasury - PDF Receipt
  dcbPdfTitle: string;
  dcbPdfCertificationNumber: string;
  dcbPdfIssuedAt: string;
  dcbPdfSourceAccount: string;
  dcbPdfDestination: string;
  dcbPdfAmountUsd: string;
  dcbPdfAmountLusd: string;
  dcbPdfAuthorizationCode: string;
  dcbPdfTxHash: string;
  dcbPdfContractAddress: string;
  dcbPdfBlockNumber: string;
  dcbPdfGasUsed: string;
  dcbPdfVerificationHash: string;
  dcbPdfOfficialDocument: string;
  dcbPdfDigitallySigned: string;
  
  // LEMX Minting Platform - Complete translations
  institution: string;
  standard: string;
  signerWallet: string;
  pending: string;
  noPendingLocks: string;
  lockReceived: string;
  viewDetails: string;
  recentLocks: string;
  activeLocks: string;
  noLogs: string;
  pendingLocksTitle: string;
  resetSandbox: string;
  connected: string;
  fullSync: string;
  treasuryCurrencies: string;
  supportedCurrencies: string;
  activeForMinting: string;
  mint: string;
  reserve: string;
  availableForMintingLabel: string;
  locksInReserve: string;
  viewReserve: string;
  totalMintedLabel: string;
  mintsCompletedCount: string;
  activeBank: string;
  connectedBank: string;
  swiftBic: string;
  totalVolume: string;
  completedMints: string;
  noMintedRecords: string;
  recentEvents: string;
  networkStatus: string;
  beneficiary: string;
  expiresAt: string;
  approve: string;
  downloadPdf: string;
  reject: string;
  mintWithCode: string;
  mintsPending: string;
  inQueueUsd: string;
  authorizationCode: string;
  amountUsd: string;
  createdAt: string;
  mintQueue: string;
  noMintOrders: string;
  locksFromDcb: string;
  enterAuthCode: string;
  lockReserve: string;
  approvedLocksTitle: string;
  approvedAt: string;
  noApprovedLocks: string;
  lusdMinted: string;
  mintedAt: string;
  mintedBy: string;
  rejectedTitle: string;
  rejectedBy: string;
  rejectedAt: string;
  noRejectedLocks: string;
  amountToMint: string;
  notificationWillBeSent: string;
  selectedAmountWillMove: string;
  youCanProceed: string;
  processingText: string;
  approveAndNotify: string;
  confirmMinting: string;
  createThisAction: string;
  confirmAndMint: string;
  confirmNewPassword: string;
  lusdContract: string;
  previous: string;
  next: string;
  lusdMintedSuccess: string;
  completed: string;
  accepted: string;
  rejected: string;
  approved: string;
  completedLabel: string;
  pendingLocks: string;
  minted: string;
  dashboard: string;
  logs: string;
  
  // Premium Mint Modal
  premiumMintTitle: string;
  premiumMintSubtitle: string;
  premiumMintAmountToConvert: string;
  premiumMintLockHash: string;
  premiumMintVusdHash: string;
  premiumMintContract: string;
  premiumMintPublish: string;
  premiumMintLockSignatureHash: string;
  premiumMintAutoCompleted: string;
  premiumMintAutoCompletedFromDcb: string;
  premiumMintEnterLockHash: string;
  premiumMintLockContractHash: string;
  premiumMintIsoMessageData: string;
  premiumMintBlockchainSignatures: string;
  premiumMintFirstSignature: string;
  premiumMintSecondSignature: string;
  premiumMintThirdSignature: string;
  premiumMintPending: string;
  premiumMintGeneratedOnPublish: string;
  premiumMintHashNote: string;
  premiumMintVusdMintHash: string;
  premiumMintVusdHashTitle: string;
  premiumMintVusdHashSubtitle: string;
  premiumMintEnterVusdHash: string;
  premiumMintVusdContractTitle: string;
  premiumMintVusdContractSubtitle: string;
  premiumMintVusdContractAddress: string;
  premiumMintNetwork: string;
  premiumMintToken: string;
  premiumMintVerificationSummary: string;
  premiumMintPublishAndMint: string;
  premiumMintPublishingVusd: string;
  premiumMintCompleteTitle: string;
  premiumMintCompleteSubtitle: string;
  premiumMintPublicationCode: string;
  premiumMintTxHash: string;
  premiumMintBlockNumber: string;
  premiumMintMintedAmount: string;
  premiumMintBeneficiary: string;
  premiumMintViewOnExplorer: string;
  premiumMintDownloadReceipt: string;
  premiumMintNewMint: string;
  premiumMintErrorTitle: string;
  premiumMintErrorSubtitle: string;
  premiumMintTryAgain: string;
  premiumMintReadyToPublish: string;
  premiumMintReadyToPublishDesc: string;
  premiumMintProductionMode: string;
  premiumMintHashesRegistered: string;
  premiumMintBothHashesMustMatch: string;
  premiumMintNotEntered: string;
  
  // Notifications - Wallet & Connection
  notifConnectedToLemonChain: string;
  notifConnectWalletManually: string;
  notifConnectingWallet: string;
  notifConnectingToLemonChain: string;
  notifConnectedBalance: string;
  notifConnectionError: string;
  notifBlockchainError: string;
  notifContinuingSandbox: string;
  notifWalletNotConfigured: string;
  notifSandboxActivated: string;
  
  // Notifications - Locks
  notifNewLockReceived: string;
  notifAmountMustBeBetween: string;
  notifRegisteringLock: string;
  notifGeneratingSecondSignature: string;
  notifMovingToReserve: string;
  notifSecondSignatureGenerated: string;
  notifLockApproved: string;
  notifLockRejected: string;
  notifRequestRejected: string;
  notifNotificationSentDcb: string;
  notifErrorApprovingLock: string;
  notifErrorRejectingLock: string;
  
  // Notifications - Minting
  notifHashAutoCompleted: string;
  notifHashesAutoCompleted: string;
  notifVusdHashAutoCompleted: string;
  notifGeneratingThirdSignature: string;
  notifVusdMinted: string;
  notifErrorMintingVusd: string;
  notifSandboxSimulating: string;
  notifErrorExecutingMint: string;
  
  // Notifications - General
  notifCopiedToClipboard: string;
  notifLocksLoaded: string;
  notifServerLocksLoaded: string;
  notifErrorConnectingServer: string;
  notifItemRemoved: string;
  notifManualPdfDownloaded: string;
  notifErrorGeneratingPdf: string;
  notifPdfGenerated: string;
  notifErrorGeneratingPdfRetry: string;
  notifResetComplete: string;
  
  // Notifications - User Management
  notifUserCreated: string;
  notifErrorCreatingUser: string;
  notifPasswordsDoNotMatch: string;
  notifPasswordUpdated: string;
  notifErrorChangingPassword: string;
  
  // Notifications - Simulation
  notifSimulatedLockReceived: string;
  
  // Lock Approval Modal
  approveLockTitle: string;
  selectAmountToMint: string;
  amountReceived: string;
  bank: string;
  amountToLock: string;
  maxAvailable: string;
  onApprovingThisLock: string;
  lockIdLabel: string;
  
  // Lock Reserve Section
  locksPendingApproval: string;
  reserveBalances: string;
  reserveBalancesSubtitle: string;
  reserve: string;
  available: string;
  original: string;
  consumed: string;
  created: string;
  moveToMintWithCode: string;
  pending: string;
  approve: string;
}

export const translations: Record<Language, Translations> = {
  es: {
    // Header
    headerTitle: 'CoreBanking System',
    headerSubtitle: 'DAES Data and Exchange Settlement',
    productionEnvironment: 'Entorno de Producción',
    allSystemsOperational: '● Todos los Sistemas Operativos',
    dtcAnalysisReady: '● Análisis Digital Commercial Bank Ltd Listo',

    // Navigation
    navDashboard: 'Dashboard',
    navLedger: 'Ledger Cuentas',
    navXcpB2B: 'API XCP B2B',
    navProcessor: 'Digital Commercial Bank Ltd Processor',
    navBinaryReader: 'Binary Reader',
    navAnalyzerPro: 'Analizador Digital Commercial Bank Ltd Pro',
    navLargeFileAnalyzer: 'Analizador Archivos Grandes',
    navTransfers: 'Transfers',
    navApiKeys: 'API Keys',
    navAuditLogs: 'Audit Logs',
    navBlackScreen: 'Black Screen',
    navAuditBank: 'Auditoría Bancaria',
    navCustody: 'Cuentas Custodio',

    // Footer
    footerVersion: 'CoreBanking v1.0.0',
    footerIsoCompliant: 'ISO 4217 Compliant',
    footerPciReady: 'PCI-DSS Ready',
    footerMultiCurrency: 'Multi-Currency: USD • EUR • GBP • CHF',
    footerEncryption: 'Encryption: AES-256-GCM',
    footerForensicAnalysis: 'Análisis Forense Digital Commercial Bank Ltd',

    // Common
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    refresh: 'Refrescar',
    export: 'Exportar',
    import: 'Importar',
    download: 'Descargar',
    upload: 'Cargar',
    select: 'Seleccionar',
    search: 'Buscar',
    filter: 'Filtrar',
    clear: 'Limpiar',
    confirm: 'Confirmar',

    // Currency names
    currencyUSD: 'Dólares (USD)',
    currencyEUR: 'Euros (EUR)',
    currencyGBP: 'Libras (GBP)',
    currencyCHF: 'Francos (CHF)',
    currencyCAD: 'Dólares Canadienses',
    currencyAUD: 'Dólares Australianos',
    currencyJPY: 'Yenes',
    currencyCNY: 'Yuan',
    currencyINR: 'Rupias',
    currencyMXN: 'Pesos Mexicanos',
    currencyBRL: 'Reales',
    currencyRUB: 'Rublos',
    currencyKRW: 'Won',
    currencySGD: 'Dólares Singapur',
    currencyHKD: 'Dólares Hong Kong',

    // Dashboard
    dashboardTitle: 'Dashboard',
    dashboardAccounts: 'cuentas',
    dashboardTransactions: 'transacciones',
    dashboardBalance: 'Balance',
    dashboardLoadFiles: 'Cargar Archivos',
    dashboardGenerateSample: 'O Generar Archivo de Muestra',
    dashboardNoAccounts: 'Sin cuentas',
    dashboardWelcome: 'Bienvenido al Sistema CoreBanking',
    dashboardAnalyzedBalances: 'Balances Analizados del Archivo Grande',
    dashboardCurrenciesDetected: 'monedas',
    dashboardSavedInMemory: 'Los balances están guardados en memoria y disponibles para transferencias API',
    dashboardWelcomeTitle: 'Bienvenido al Sistema CoreBanking',
    dashboardWelcomeMessage: 'Para comenzar, carga un archivo Digital Commercial Bank Ltd desde tu disco local. El sistema detectará automáticamente los bloques de moneda y creará las cuentas correspondientes.',
    dashboardOrGenerateSample: 'O Generar Archivo de Muestra',
    dashboardViewDashboard: 'Ver Dashboard',
    dashboardAccountsCount: 'accounts',
    dashboardBalancesTitle: 'Balances Analizados del Archivo Grande',
    dashboardBalancesSubtitle: 'transacciones',
    dashboardBalancesSaved: 'Los balances están guardados en memoria y disponibles para transferencias API',
    dashboardDetails: 'Detalles',
    dashboardRecentTransfers: 'Transferencias Recientes',
    dashboardNoTransfers: 'Sin transferencias',
    dashboardAccountInfo: 'Información de Cuenta',
    dashboardErrorProcessing: 'Error al procesar el archivo',
    dashboardErrorCreatingSample: 'Error al crear archivo de muestra',
    dashboardNoCurrencyBlocks: 'No se detectaron bloques de moneda en el archivo. Verifica que sea un archivo Digital Commercial Bank Ltd válido.',
    dashboardFileProcessed: 'Archivo procesado exitosamente. Se crearon {count} cuentas.',
    dashboardSampleCreated: 'Archivo de muestra creado. Se generaron {count} cuentas.',
    dashboardUnknownError: 'Error desconocido',

    // Ledger
    ledgerTitle: 'Account Ledger - Libro Mayor de Cuentas',
    ledgerSubtitle: 'Actualización en tiempo real desde el Analizador Digital Commercial Bank Ltd',
    ledgerTotalAccounts: 'Total Cuentas',
    ledgerTotalTransactions: 'Total Transacciones',
    ledgerLastUpdate: 'Última Actualización',
    ledgerStatus: 'Estado',
    ledgerOperational: 'Operativo',
    ledgerNoData: 'Sin Datos',
    ledgerUpdating: 'Actualizando...',
    ledgerConnected: 'Sistema conectado',
    ledgerAccount: 'Cuenta',
    ledgerPrincipal: 'PRINCIPAL',
    ledgerSecondary: 'SECUNDARIA',
    ledgerTertiary: 'TERCIARIA',
    ledgerFourth: 'CUARTA',
    ledgerTotalBalance: 'Balance Total',
    ledgerAverage: 'Promedio',
    ledgerHighest: 'Mayor',
    ledgerLowest: 'Menor',
    ledgerUpdatedAt: 'Actualizado',
    ledgerOfCurrencies: 'de 15 monedas',
    ledgerProcessed: 'procesadas',
    ledgerWaiting: 'En espera',
    ledgerNoAccountsLoaded: 'Sin Cuentas Cargadas',
    ledgerNoBalancesInLedger: 'No hay balances en el libro mayor. Usa el Analizador de Archivos Grandes para cargar datos.',
    ledgerUseAnalyzerToLoad: 'Usa el Analizador de Archivos Grandes para cargar datos',
    ledgerGoToAnalyzer: 'Ve al Analizador →',
    ledgerTransactions: 'transacciones',

    // Large File Analyzer
    analyzerTitle: 'Analizador de Archivos Grandes Digital Commercial Bank Ltd',
    analyzerSubtitle: 'Procesamiento por bloques • Extracción en tiempo real • Persistencia automática',
    analyzerSelectFile: 'Seleccionar Archivo Digital Commercial Bank Ltd',
    analyzerLoadSaved: 'Cargar Balances Guardados',
    analyzerPause: 'Pausar',
    analyzerResume: 'Reanudar',
    analyzerStop: 'Detener',
    analyzerClearMemory: 'Borrar Memoria',
    analyzerProcessing: 'Procesando...',
    analyzerCompleted: 'Completado',
    analyzerProgress: 'Progreso',
    analyzerIndependentAccounts: 'Cuentas Independientes por Moneda',
    analyzerGlobalSummary: 'RESUMEN GLOBAL',
    analyzerUpdatingLedger: 'Actualizando Ledger en Tiempo Real',
    analyzerSyncingLedger: 'Sincronizando con Ledger',
    analyzerFileInfo: 'Información del Archivo',
    analyzerDetectedAlgorithm: 'Algoritmo Detectado',
    analyzerEncryptionStatus: 'Estado de Encriptación',
    analyzerEncrypted: 'Encriptado',
    analyzerNotEncrypted: 'No Encriptado',
    analyzerEntropy: 'Análisis de Entropía',
    analyzerHighEntropy: 'ALTA ENTROPÍA',
    analyzerLowEntropy: 'BAJA ENTROPÍA',
    analyzerTryDecrypt: 'Intentar Desencriptar',
    analyzerLastTransactions: 'Últimas 10 transacciones:',
    analyzerLoadFileForAnalysis: 'Cargar Archivo para Análisis',
    analyzerCurrenciesDetected: 'monedas detectadas',
    analyzerPendingProcess: 'Proceso Pendiente',
    analyzerProcessInterrupted: '⚡ PROCESO INTERRUMPIDO - LISTO PARA CONTINUAR',
    analyzerReadyToContinue: 'Listo para Continuar',
    analyzerFile: 'Archivo',
    analyzerSavedProgress: '📊 Progreso guardado',
    analyzerContinueFrom: 'CONTINUAR DESDE',
    analyzerCancelProcess: 'Cancelar Proceso',
    analyzerError: 'Error',
    analyzerNoPendingProcess: '⚠️ No se encontró un proceso pendiente',
    analyzerCouldNotRecover: '❌ No se pudo recuperar el archivo.',
    analyzerLoadFileAgain: 'Por favor, carga el archivo nuevamente.',
    analyzerConfirmCancel: '¿Estás seguro de que quieres cancelar el proceso pendiente?',
    analyzerAccountsByCurrency: 'Cuentas por Moneda',
    analyzerUpdatingRealTime: 'Actualizando en Tiempo Real',
    analyzerExportReport: 'Exportar Reporte',
    analyzerTotalTransactions: 'Total Transacciones',
    analyzerDetectedCurrencies: 'Monedas Detectadas',
    analyzerSyncing: 'Sincronizando',
    analyzerCompletedSuccessfully: '✓ Análisis Completado Exitosamente',
    analyzerMagicNumber: 'Magic Number',
    analyzerEntropyAnalysis: 'Análisis de Entropía',
    analyzerAverageEntropy: 'Entropía Promedio',
    analyzerHighEntropyDescription: 'Los datos están fuertemente encriptados. Se requieren credenciales para desencriptar.',
    analyzerLowEntropyDescription: 'Datos estructurados sin encriptación fuerte. Balances extraíbles.',
    analyzerDecryptFile: 'Desencriptar Archivo',
    analyzerUsername: 'Username',
    analyzerPassword: 'Password',
    analyzerEnterUsername: 'Ingresa el username',
    analyzerEnterPassword: 'Ingresa el password',
    analyzerDecrypt: 'Desencriptar',
    analyzerUsernamePasswordRequired: 'Por favor ingresa username y password',
    analyzerDecryptionDevelopment: 'Función de desencriptación en desarrollo. Se requiere implementar PBKDF2 + AES-GCM',
    analyzerNavigateToOtherModules: '✓ Puedes navegar a otros módulos sin detener el proceso',
    analyzerFloatingIndicator: 'El indicador flotante te mostrará el progreso desde cualquier ventana',
    analyzerProcessed: 'procesado',
    analyzerLastUpdate: 'Última actualización',
    analyzerTotalBalance: '💰 Balance Total Acumulado',
    analyzerAverage: '📈 Promedio',
    analyzerHighest: '🔺 Mayor',
    analyzerLowest: '🔻 Menor',
    analyzerPrincipal: '🥇 PRINCIPAL',
    analyzerSecondary: '🥈 SECUNDARIA',
    analyzerAccount: 'Cuenta',
    analyzerAdding: 'Sumando...',

    // XCP B2B API
    xcpTitle: 'XCP B2B API - Remesas Internacionales',
    xcpSubtitle: 'Transferencias bancarias seguras con mTLS + HMAC-SHA256',
    xcpSecurityFeatures: 'Características de Seguridad',
    xcpAuthentication: 'Autenticación JWT',
    xcpObtainToken: 'Obtener Token JWT',
    xcpTokenActive: 'Token Activo',
    xcpTokenValid: 'Token válido por 60 minutos',
    xcpAvailableBalances: 'Balances Disponibles',
    xcpFundsFromAnalyzer: 'Fondos cargados desde el analizador Digital Commercial Bank Ltd',
    xcpBalanceSelected: 'Balance seleccionado',
    xcpCreateRemittance: 'Crear Remesa Internacional',
    xcpAmount: 'Monto',
    xcpDestinationAccount: 'Cuenta Destino',
    xcpReference: 'Referencia',
    xcpPurposeCode: 'Código de Propósito',
    xcpBeneficiaryName: 'Nombre del Beneficiario',
    xcpBeneficiaryIban: 'IBAN del Beneficiario',
    xcpUrgent: 'Transferencia Urgente',
    xcpUrgentNote: 'cargos adicionales aplican',
    xcpSubmit: 'Crear Remesa',
    xcpProcessing: 'Procesando Remesa...',
    xcpRemittanceStatus: 'Estado de la Remesa',
    xcpTransactionId: 'ID de Transacción',
    xcpStatus: 'Estado',
    xcpCreated: 'Creado',
    xcpCompleted: 'Completado',
    xcpTransferCompleted: 'Transferencia Completada',
    xcpFundsTransferred: 'Los fondos han sido transferidos exitosamente',
    xcpMtls: 'mTLS',
    xcpTlsVersion: 'TLS ≥ 1.2',
    xcpHmac: 'HMAC',
    xcpHmacAlgo: 'SHA-256',
    xcpJwt: 'JWT',
    xcpBearerAuth: 'Bearer Auth',
    xcpAntiReplay: 'Anti-Replay',
    xcpTimeWindow: '±5 min',
    xcpEndpoint: 'Endpoint',
    xcpAuth: 'Auth',
    xcpRequired: '*',
    xcpCompleteDocumentation: 'Documentación Completa',
    xcpDocumentationText: 'Para integración completa del módulo XCP B2B, consulta la documentación en src/xcp-b2b/README.md',
    xcpMtlsImplementation: '• Implementación mTLS con certificados cliente',
    xcpHmacSigning: '• Firma HMAC-SHA256 de todas las solicitudes',
    xcpAutoRetry: '• Manejo automático de reintentos con backoff exponencial',
    xcpSchemaValidation: '• Validación de esquemas con Zod',

    // Messages
    msgBalancesLoaded: 'Balances cargados desde memoria',
    msgBalancesCleared: 'Balances borrados de la memoria',
    msgConfirmClear: '¿Estás seguro de que quieres borrar todos los balances guardados?',
    msgInsufficientBalance: 'Balance insuficiente',
    msgTokenRequired: 'Debe obtener un token primero',
    msgFieldsRequired: 'Complete todos los campos requeridos',
    msgProcessingFile: 'Procesando archivo',
    msgAnalysisComplete: 'Análisis Completado',
    msgErrorOccurred: 'Error al procesar',

    // Validation Messages
    validationNoCapitalTitle: 'SIN CAPITAL DISPONIBLE',
    validationNoCapitalAccount: 'Cuenta',
    validationNoCapitalBalanceTotal: 'Balance Total',
    validationNoCapitalBalanceAvailable: 'Balance Disponible',
    validationNoCapitalBalanceReserved: 'Balance Reservado',
    validationNoCapitalMessage: 'No se puede crear pledge sin capital disponible.',
    validationNoCapitalSolution: 'Solución:',
    validationNoCapitalSolution1: 'Libera el pledge existente de esta cuenta, o',
    validationNoCapitalSolution2: 'Usa una cuenta custody con balance disponible',
    validationAmountExceedsTitle: 'MONTO EXCEDE DISPONIBLE',
    validationAmountExceedsRequested: 'Solicitado',
    validationAmountExceedsAvailable: 'Disponible',
    validationAmountExceedsMessage: 'Reduce el monto del pledge o selecciona otra cuenta.',
    validationDuplicatePledgeTitle: 'PLEDGE DUPLICADO DETECTADO',
    validationDuplicatePledgeMessage: 'Ya existe un pledge ACTIVO para esta cuenta custody.\nNo se puede desplegar el mismo capital dos veces.',
    validationDuplicatePledgeSolution: 'Solución:',
    validationDuplicatePledgeSolution1: 'Libera el pledge existente primero, o',
    validationDuplicatePledgeSolution2: 'Usa una cuenta custody diferente',

    // Time
    timeSeconds: 'segundos',
    timeMinutes: 'minutos',
    timeHours: 'horas',
    timeDays: 'días',

    // Black Screen
    blackScreenTitle: 'Bank Black Screen Bancario',
    blackScreenSubtitle: 'Sistema de Confirmaciones Bancarias Profesionales',
    blackScreenGenerator: 'Generador de Black Screens',
    blackScreenAvailableAccounts: 'Cuentas Disponibles',
    blackScreenNoBalances: 'No hay balances cargados en el Ledger',
    blackScreenUseAnalyzer: 'Usa el Analizador de Archivos Grandes para cargar balances',
    blackScreenGenerate: 'Generar Black Screen',
    blackScreenConfidential: 'CONFIDENCIAL - DOCUMENTO BANCARIO',
    blackScreenDownloadTxt: 'Descargar TXT',
    blackScreenPrint: 'Imprimir',
    blackScreenClose: 'Cerrar',
    blackScreenBankConfirmation: 'BANK BLACK SCREEN - CONFIRMACIÓN BANCARIA OFICIAL',
    blackScreenXcpBank: 'Digital Commercial Bank Ltd',
    blackScreenDocumentConfidential: 'DOCUMENTO CONFIDENCIAL - SOLO PARA USO BANCARIO AUTORIZADO',
    blackScreenBeneficiaryInfo: 'INFORMACIÓN DEL BENEFICIARIO',
    blackScreenHolder: 'Titular',
    blackScreenAccount: 'Cuenta',
    blackScreenBank: 'Banco',
    blackScreenSwift: 'SWIFT',
    blackScreenRoutingNumber: 'Routing Number',
    blackScreenCurrency: 'Moneda',
    blackScreenMonetaryAggregates: 'AGREGADOS MONETARIOS (MONETARY AGGREGATES)',
    blackScreenM1Liquid: 'M1 (Activos Líquidos)',
    blackScreenM1Description: 'Efectivo y depósitos a la vista',
    blackScreenM2Near: 'M2 (Casi Dinero)',
    blackScreenM2Description: 'M1 + Depósitos de ahorro + Pequeños depósitos a plazo',
    blackScreenM3Broad: 'M3 (Dinero en Sentido Amplio)',
    blackScreenM3Description: 'M2 + Grandes depósitos a plazo',
    blackScreenM4Total: 'M4 (Total Activos Líquidos)',
    blackScreenM4Description: 'M3 + Instrumentos del mercado monetario negociables',
    blackScreenVerifiedBalance: 'BALANCE TOTAL VERIFICADO',
    blackScreenTechnicalInfo: 'INFORMACIÓN TÉCNICA Digital Commercial Bank Ltd',
    blackScreenDtcReference: 'Referencia Digital Commercial Bank Ltd',
    blackScreenVerificationHash: 'Hash de Verificación',
    blackScreenTransactionsProcessed: 'Transacciones Procesadas',
    blackScreenIssueDate: 'Fecha de Emisión',
    blackScreenExpiryDate: 'Fecha de Vencimiento',
    blackScreenVerificationStatus: 'Estado de Verificación',
    blackScreenVerified: 'VERIFICADO Y CERTIFICADO',
    blackScreenCertification: 'CERTIFICACIÓN BANCARIA OFICIAL',
    blackScreenCertificationText: 'Este documento certifica que los fondos arriba mencionados están disponibles y verificados según los estándares internacionales bancarios y de liquidación.',
    blackScreenCertificationStandards: 'Conforme con estándares: SWIFT MT799/MT999, FEDWIRE, DTC (Depository Trust Company), ISO 20022',
    blackScreenDigitallySigned: 'FIRMADO DIGITALMENTE',
    blackScreenGeneratedBy: 'Generado por',
    blackScreenCopyright: 'DAES CoreBanking - Data and Exchange Settlement',
    blackScreenMasterAccount: 'Digital Commercial Bank Ltd MASTER ACCOUNT',
    blackScreenInternational: 'Digital Commercial Bank Ltd',
    blackScreenTotalAvailable: 'Disponible',
    blackScreenPrincipal: 'Principal',

    // Login
    loginTitle: 'DAES SYSTEM',
    loginSubtitle: 'Data and Exchange Settlement',
    loginUser: 'Usuario',
    loginPassword: 'Contraseña',
    loginShowPassword: 'Mostrar contraseña',
    loginHidePassword: 'Ocultar contraseña',
    loginButton: 'ACCEDER AL SISTEMA',
    loginAuthenticating: 'AUTENTICANDO...',
    loginInvalidCredentials: 'Credenciales incorrectas. Acceso denegado.',
    loginTooManyAttempts: 'Demasiados intentos fallidos. Sistema bloqueado por 30 segundos.',
    loginAttempts: 'Intentos',
    loginSecureConnection: 'Conexión segura • AES-256-GCM • mTLS',
    loginCopyright: '© 2025 DAES CoreBanking System',
    loginVersion: 'v3.0.0',
    loginAllRightsReserved: 'Todos los derechos reservados',
    // Treasury Minting Login
    tmLoginTitle: 'Iniciar Sesión',
    tmLoginSubtitle: 'Treasury Minting Platform',
    tmLoginUser: 'Usuario',
    tmLoginUserPlaceholder: 'Ingrese su usuario',
    tmLoginPassword: 'Contraseña',
    tmLoginPasswordPlaceholder: 'Ingrese su contraseña',
    tmLoginButton: 'Acceder',
    tmLoginAuthenticating: 'Verificando...',
    tmTestCredentials: 'Credenciales de prueba:',
    tmTestUser: 'Usuario',
    tmTestPassword: 'Contraseña',

    // App Header
    logout: 'Salir',
    logoutTitle: 'Cerrar Sesión',

    // Advanced Banking Dashboard
    advDashboardTitle: 'Dashboard Bancario',
    advDashboardSubtitle: 'Sistema de gestión financiera avanzado',
    advDashboardTotalBalance: 'Balance Total',
    advDashboardActiveAccounts: 'Cuentas Activas',
    advDashboardTransactions: 'Transacciones',
    advDashboardMovements: 'Movimientos',
    advDashboardDebits: 'Débitos',
    advDashboardCredits: 'Créditos',
    advDashboardFees: 'Comisiones',
    advDashboardLedgerAccounts: 'Cuentas del Ledger (15 Divisas)',
    advDashboardCurrencyDistribution: 'Distribución por Moneda',
    advDashboardTransactionHistory: 'Historial de Transacciones',
    advDashboardNoTransactions: 'No hay transacciones para mostrar',
    advDashboardNoTransactionsMessage: 'Las transacciones aparecerán aquí cuando realices operaciones',
    advDashboardAllPeriods: 'Todas',
    advDashboardLast24h: 'Últimas 24h',
    advDashboardLast7d: 'Última semana',
    advDashboardLast30d: 'Último mes',
    advDashboardAllCurrencies: 'Todas las monedas',
    advDashboardUpdate: 'Actualizar',
    advDashboardUpdating: 'Actualizando...',
    advDashboardHideBalance: 'Ocultar balance',
    advDashboardShowBalance: 'Mostrar balance',
    advDashboardConvertedBalance: 'Balance Total Convertido',

    // Audit Bank Panel
    auditTitle: 'Panel de Auditoría Bancaria',
    auditSubtitle: 'Detección automática de activos financieros con clasificación M0-M4',
    auditStartScan: 'Iniciar Escaneo',
    auditScanning: 'Escaneando...',
    auditStopScan: 'Detener Escaneo',
    auditExportJson: 'Exportar JSON',
    auditExportCsv: 'Exportar CSV',
    auditTotalFindings: 'Total de Hallazgos',
    auditFilesScanned: 'Archivos Escaneados',
    auditBanksDetected: 'Bancos Detectados',
    auditAccountsFound: 'Cuentas Encontradas',
    auditTotalAmount: 'Monto Total',
    auditClassifications: 'Clasificaciones Monetarias',
    auditM0Cash: 'M0 - Efectivo',
    auditM1Demand: 'M1 - Depósitos a la Vista',
    auditM2Savings: 'M2 - Ahorro',
    auditM3Institutional: 'M3 - Institucional',
    auditM4Instruments: 'M4 - Instrumentos Financieros',
    auditFindings: 'Hallazgos Detallados',
    auditNoFindings: 'No se encontraron hallazgos',
    auditLoadResults: 'Cargar Resultados',
    auditFile: 'Archivo',
    auditBank: 'Banco',
    auditAccount: 'Cuenta',
    auditAmount: 'Monto',
    auditCurrency: 'Moneda',
    auditClassification: 'Clasificación',
    auditConfidence: 'Confianza',
    auditEvidence: 'Evidencia',
    auditDetectedAt: 'Detectado',
    auditAggregatedTotals: 'Totales Agregados por Moneda',
    auditEquivUsd: 'Equiv. USD',
    auditSecurityNote: 'Nota de Seguridad',
    auditSecurityMessage: 'Los números de cuenta se enmascaran automáticamente. Los valores completos se almacenan cifrados (AES-256) cumpliendo ISO 27001 / AML / FATF.',
    auditConfigureDataPath: 'Configurar Ruta de Datos',
    auditDataPath: 'Ruta de Datos Digital Commercial Bank Ltd',
    auditProcessing: 'Procesando archivos...',
    auditComplete: 'Escaneo completado',
    auditError: 'Error durante el escaneo',
    auditM0Description: 'Efectivo físico, billetes, monedas',
    auditM1Description: 'Cuentas corrientes, depósitos a la vista',
    auditM2Description: 'Ahorro, depósitos a plazo < 1 año',
    auditM3Description: 'Depósitos institucionales > 1M USD',
    auditM4Description: 'Repos, MTNs, SKRs, commercial paper',
    auditLoadFile: 'Cargar Archivo Digital Commercial Bank Ltd',
    auditMaskedView: 'Vista Enmascarada',
    auditCompleteView: 'Vista Completa',
    auditClearData: 'Limpiar',
    auditDataSources: 'Fuentes de Datos',
    auditAnalyzerIntegration: 'Integración con Analizador de Archivos Grandes',
    auditAnalyzerDescription: 'Bank Audit está escuchando datos del Analizador en tiempo real. Cuando proceses un archivo Digital Commercial Bank Ltd en el Analizador, los datos aparecerán AUTOMÁTICAMENTE aquí.',
    auditActiveSubscription: 'Suscripción activa',
    auditAutoSync: 'Sincronización automática',
    auditSystemBalances: 'Balances del Sistema',
    auditAnalyzeBalances: 'Analizar Balances del Sistema',
    auditMonetaryClassification: 'Clasificación Monetaria M0-M4',
    auditDetailedFindings: 'Hallazgos Detallados',
    auditScrollToSeeAll: 'Scroll para ver todos',
    auditViewFullReport: 'VER INFORME COMPLETO',

    // DCB Treasury Certification Platform
    dcbTitle: 'Plataforma de Certificación de Tesorería DCB',
    dcbSubtitle: 'Digital Commercial Bank • Gestión de Tesorería Blockchain',
    dcbDashboard: 'Panel',
    dcbContracts: '📜 Contratos',
    dcbBanks: 'Bancos',
    dcbCustody: 'Custodia',
    dcbLocks: 'Bloqueos',
    dcbMinting: 'Acuñación',
    dcbTerminal: 'Terminal',
    dcbConfig: 'Configuración',
    dcbWalletsRoles: 'Wallets y Roles',
    dcbBack: 'Volver',
    dcbDisconnect: 'Desconectar',
    dcbDirectConnect: 'Conexión Directa',
    dcbDirectConnection: 'Conexión Directa a LemonChain',
    dcbSelectWallet: 'Selecciona una wallet autorizada para conectar',
    dcbCancel: 'Cancelar',
    dcbConnect: 'Conectar',
    dcbConnecting: 'Conectando...',
    dcbSummary: 'Resumen',
    dcbActive: 'Activos',
    dcbCustodies: 'Custodias',
    dcbViewRoles: 'Ver Roles',
    dcbAuthorized: 'autorizados',
    dcbAuthorizedWallets: 'Wallets Autorizadas - Lemon Chain',
    dcbViewDetails: 'Ver Detalles',
    dcbRecentLocks: 'Bloqueos Recientes',
    dcbNoLocks: 'Sin bloqueos',
    dcbStatus: 'Estado',
    dcbAmount: 'Monto',
    dcbExpiry: 'Vencimiento',
    dcbBeneficiary: 'Beneficiario',
    dcbSandbox: 'Sandbox',
    dcbProduction: 'Producción',
    dcbNotConnected: 'No Conectado',
    dcbSwitchNetwork: 'Cambiar Red',
    dcbDirect: 'Directo',
    
    // DCB Treasury - Contracts Tab
    dcbContractsV3: 'Contratos v3.0',
    dcbContractsDeployed: 'Desplegados',
    dcbContractsPending: 'Pendientes',
    dcbContractsTotalLines: 'Total de Líneas',
    dcbContractsNetwork: 'Red',
    dcbContractsChainId: 'ID de Cadena',
    dcbContractsExplorer: 'Explorador',
    dcbContractsViewOnExplorer: 'Ver en Explorador',
    dcbContractsCopy: 'Copiar',
    dcbContractsCopied: '¡Copiado!',
    dcbContractsFeatures: 'Características',
    dcbContractsSourceFiles: 'Archivos Fuente',
    
    // DCB Treasury - Banks Tab
    dcbBanksTitle: 'Gestión de Bancos',
    dcbBanksRegistered: 'Bancos Registrados',
    dcbBanksAdd: 'Agregar Banco',
    dcbBanksId: 'ID de Banco',
    dcbBanksName: 'Nombre',
    dcbBanksSigner: 'Firmante',
    dcbBanksStatus: 'Estado',
    dcbBanksActions: 'Acciones',
    dcbBanksNoRegistered: 'No hay bancos registrados',
    dcbBanksAddFirst: 'Agrega tu primer banco para comenzar',
    dcbBanksRegisterNew: 'Registrar Nuevo Banco',
    dcbBanksSwiftCode: 'Código SWIFT',
    dcbBanksCountry: 'País',
    dcbBanksRegister: 'Registrar',
    dcbBanksRegistering: 'Registrando...',
    
    // DCB Treasury - Custody Tab
    dcbCustodyTitle: 'Gestión de Custodia',
    dcbCustodyAccounts: 'Cuentas de Custodia',
    dcbCustodyCreate: 'Crear Custodia',
    dcbCustodySourceAccount: 'Cuenta Origen',
    dcbCustodySelectSource: 'Seleccionar cuenta origen',
    dcbCustodyAvailable: 'Disponible',
    dcbCustodyLocked: 'Bloqueado',
    dcbCustodyTotal: 'Total',
    dcbCustodyNoAccounts: 'No hay cuentas de custodia',
    dcbCustodyCreateFirst: 'Crea tu primera cuenta de custodia',
    dcbCustodyVaultAddress: 'Dirección del Vault',
    dcbCustodyMetadataHash: 'Hash de Metadatos',
    dcbCustodyCreatedAt: 'Creado el',
    dcbCustodyLastActivity: 'Última Actividad',
    dcbCustodyOwner: 'Propietario',
    
    // DCB Treasury - Locks Tab
    dcbLocksTitle: 'Gestión de Bloqueos',
    dcbLocksCreate: 'Crear Bloqueo',
    dcbLocksSelectCustody: 'Seleccionar Custodia',
    dcbLocksSelectBank: 'Seleccionar Banco',
    dcbLocksAmount: 'Monto a Bloquear',
    dcbLocksExpiry: 'Fecha de Vencimiento',
    dcbLocksUetr: 'UETR (Referencia)',
    dcbLocksBeneficiary: 'Beneficiario',
    dcbLocksCreateLock: 'Crear Bloqueo',
    dcbLocksCreating: 'Creando...',
    dcbLocksNoLocks: 'No hay bloqueos',
    dcbLocksCreateFirst: 'Crea tu primer bloqueo',
    dcbLocksRequested: 'Solicitado',
    dcbLocksLocked: 'Bloqueado',
    dcbLocksConsumed: 'Consumido',
    dcbLocksCanceled: 'Cancelado',
    dcbLocksConsume: 'Consumir',
    dcbLocksRelease: 'Liberar',
    dcbLocksBankSignature: 'Firma del Banco',
    dcbLocksIsoHash: 'Hash ISO',
    dcbLocksDaesTxnId: 'ID Transacción DAES',
    
    // DCB Treasury - Minting Tab
    dcbMintingTitle: 'Acuñación de VUSD',
    dcbMintingConsume: 'Consumir y Acuñar',
    dcbMintingSelectLock: 'Seleccionar Bloqueo',
    dcbMintingConsumeAndMint: 'Consumir y Acuñar VUSD',
    dcbMintingConsuming: 'Consumiendo...',
    dcbMintingNoLocksAvailable: 'No hay bloqueos disponibles',
    dcbMintingCreateLockFirst: 'Crea un bloqueo primero',
    dcbMintingLemxCode: 'Acuñar con Código LEMX',
    dcbMintingEnterCode: 'Ingresa el código de autorización',
    dcbMintingVerify: 'Verificar',
    dcbMintingVerifying: 'Verificando...',
    dcbMintingEnterHash: 'Ingresa el hash de transacción',
    dcbMintingEnterContract: 'Ingresa la dirección del contrato VUSD',
    dcbMintingVerifyContract: 'Verificar Contrato',
    dcbMintingContractVerified: '¡Contrato Verificado!',
    dcbMintingContractMismatch: 'Contrato no coincide con el oficial',
    dcbMintingConfirmMint: 'Confirmar Acuñación',
    dcbMintingConfirming: 'Confirmando...',
    dcbMintingExplorer: 'Explorador de Acuñaciones',
    dcbMintingHistory: 'Historial de Acuñaciones',
    dcbMintingNoHistory: 'No hay historial de acuñaciones',
    dcbMintingViewDetails: 'Ver Detalles',
    dcbMintingDownloadPdf: 'Descargar PDF',
    dcbMintingAuthorizationCode: 'Código de Autorización',
    dcbMintingPublicationHash: 'Hash de Publicación',
    dcbMintingContractAddress: 'Dirección del Contrato',
    dcbMintingLusdMinted: 'VUSD Acuñados',
    dcbMintingTimestamp: 'Fecha y Hora',
    
    // DCB Treasury - Terminal Tab
    dcbTerminalTitle: 'Terminal de Operaciones',
    dcbTerminalClear: 'Limpiar',
    dcbTerminalExport: 'Exportar',
    dcbTerminalPause: 'Pausar',
    dcbTerminalResume: 'Reanudar',
    dcbTerminalAutoScroll: 'Auto-desplazamiento',
    dcbTerminalNoLogs: 'Sin registros',
    
    // DCB Treasury - Config Tab
    dcbConfigTitle: 'Configuración',
    dcbConfigContractAddresses: 'Direcciones de Contratos',
    dcbConfigNetwork: 'Red',
    dcbConfigChainId: 'ID de Cadena',
    dcbConfigRpcUrl: 'URL RPC',
    dcbConfigExplorerUrl: 'URL del Explorador',
    dcbConfigSave: 'Guardar',
    dcbConfigSaving: 'Guardando...',
    dcbConfigReset: 'Restablecer',
    dcbConfigResetConfirm: '¿Restablecer configuración?',
    
    // DCB Treasury - Wallets & Roles Tab
    dcbWalletsTitle: 'Wallets y Roles',
    dcbWalletsAuthorized: 'Wallets Autorizadas',
    dcbWalletsRole: 'Rol',
    dcbWalletsAddress: 'Dirección',
    dcbWalletsDescription: 'Descripción',
    dcbWalletsPermissions: 'Permisos',
    dcbWalletsPrivateKey: 'Clave Privada',
    dcbWalletsShowKey: 'Mostrar Clave',
    dcbWalletsHideKey: 'Ocultar Clave',
    dcbWalletsCopyKey: 'Copiar Clave',
    dcbWalletsKeyCopied: '¡Clave Copiada!',
    
    // DCB Treasury - Flow Steps
    dcbFlowStep1: 'Seleccionar Cuenta Custodio M1 con fondos USD',
    dcbFlowStep2: 'Crear CustodyVault en blockchain',
    dcbFlowStep3: 'Crear Lock con firma del banco (EIP-712)',
    dcbFlowStep4: 'Consume & Mint genera código de autorización (MINT-XXXX-YYYY)',
    dcbFlowStep5: 'LEMX MintingBridge verifica y acuña VUSD',
    dcbFlowStep6: 'Publicación en Mint Explorer con TX hash',
    
    // DCB Treasury - LEMX Authorization
    dcbLemxTitle: 'Autorización LEMX',
    dcbLemxPendingRequests: 'Solicitudes Pendientes',
    dcbLemxApprove: 'Aprobar',
    dcbLemxReject: 'Rechazar',
    dcbLemxApproving: 'Aprobando...',
    dcbLemxRejecting: 'Rechazando...',
    dcbLemxNoRequests: 'No hay solicitudes pendientes',
    dcbLemxRequestDetails: 'Detalles de la Solicitud',
    dcbLemxAuthCode: 'Código de Autorización',
    dcbLemxAmount: 'Monto',
    dcbLemxRequestedAt: 'Solicitado el',
    dcbLemxRequestedBy: 'Solicitado por',
    
    // DCB Treasury - PDF Receipt
    dcbPdfTitle: 'Recibo de Certificación DCB Treasury',
    dcbPdfCertificationNumber: 'Número de Certificación',
    dcbPdfIssuedAt: 'Emitido el',
    dcbPdfSourceAccount: 'Cuenta Origen',
    dcbPdfDestination: 'Destino',
    dcbPdfAmountUsd: 'Monto USD',
    dcbPdfAmountLusd: 'Monto VUSD',
    dcbPdfAuthorizationCode: 'Código de Autorización',
    dcbPdfTxHash: 'Hash de Transacción',
    dcbPdfContractAddress: 'Dirección del Contrato',
    dcbPdfBlockNumber: 'Número de Bloque',
    dcbPdfGasUsed: 'Gas Utilizado',
    dcbPdfVerificationHash: 'Hash de Verificación',
    dcbPdfOfficialDocument: 'Documento Oficial',
    dcbPdfDigitallySigned: 'Firmado Digitalmente',
    
    // LEMX Minting Platform - Complete Spanish translations
    institution: 'Institución',
    standard: 'Estándar',
    signerWallet: 'Wallet Firmante',
    pending: 'Pendiente',
    noPendingLocks: 'No hay locks pendientes',
    lockReceived: 'Los locks de DCB Treasury aparecerán aquí',
    viewDetails: 'Ver detalles',
    recentLocks: 'Locks Recientes',
    activeLocks: 'locks activos',
    noLogs: 'No hay logs registrados',
    pendingLocksTitle: 'Locks Pendientes',
    resetSandbox: 'Reset Sandbox',
    connected: 'Conectado',
    fullSync: 'Sincronizar Todo',
    treasuryCurrencies: 'Divisas Treasury',
    supportedCurrencies: 'divisas soportadas',
    activeForMinting: 'Activo para Minting',
    mint: 'Mint',
    reserve: 'Reserva',
    availableForMintingLabel: 'Disponible para Minting',
    locksInReserve: 'locks en reserva',
    viewReserve: 'Ver Reserva',
    totalMintedLabel: 'Total Minteado',
    mintsCompletedCount: 'mints completados',
    activeBank: 'Banco Activo',
    connectedBank: 'Banco conectado para autorización',
    swiftBic: 'SWIFT/BIC',
    totalVolume: 'Volumen Total',
    completedMints: 'Mints Completados',
    noMintedRecords: 'No hay registros de minting',
    recentEvents: 'Eventos Recientes',
    networkStatus: 'Estado de Red',
    beneficiary: 'Beneficiario',
    expiresAt: 'Expira',
    approve: 'Aprobar',
    downloadPdf: 'Descargar PDF',
    reject: 'Rechazar',
    mintWithCode: 'Mint with Code',
    mintsPending: 'Mints Pendientes',
    inQueueUsd: 'En cola (USD)',
    authorizationCode: 'Código de Autorización',
    amountUsd: 'Monto USD',
    createdAt: 'Creado',
    mintQueue: 'Cola de Mint',
    noMintOrders: 'No hay órdenes de minting pendientes',
    locksFromDcb: 'Los locks aprobados de DCB Treasury aparecerán aquí',
    enterAuthCode: 'Ingresa un código de autorización para buscar',
    lockReserve: 'Lock Reserve',
    approvedLocksTitle: 'Locks Aprobados',
    approvedAt: 'Aprobado',
    noApprovedLocks: 'No hay locks aprobados',
    lusdMinted: 'VUSD Minteado',
    mintedAt: 'Minteado',
    mintedBy: 'Minteado por',
    rejectedTitle: 'Rechazados',
    rejectedBy: 'Rechazado por',
    rejectedAt: 'Rechazado',
    noRejectedLocks: 'No hay locks rechazados',
    amountToMint: 'Selecciona el monto a mintear',
    notificationWillBeSent: 'Se enviará notificación a DCB Treasury',
    selectedAmountWillMove: 'El monto seleccionado se moverá a Lock Reserve',
    youCanProceed: 'Puedes proceder con el minting desde Mint with Code',
    processingText: 'Procesando...',
    approveAndNotify: 'Aprobar y Notificar',
    confirmMinting: 'Confirmar Minting',
    createThisAction: 'Esta acción creará',
    confirmAndMint: 'Confirmar y Mintear',
    confirmNewPassword: 'Confirmar Nueva Contraseña',
    lusdContract: 'Contrato VUSD',
    previous: 'Anterior',
    next: 'Siguiente',
    lusdMintedSuccess: '¡VUSD minteado exitosamente!',
    completed: 'Completado',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    approved: 'Aprobado',
    completedLabel: 'Completados',
    pendingLocks: 'Locks Pendientes',
    minted: 'Minteado',
    dashboard: 'Dashboard',
    logs: 'Logs',
    
    // Premium Mint Modal
    premiumMintTitle: 'Protocolo de Minting VUSD',
    premiumMintSubtitle: 'Conversión USD → VUSD en LemonChain',
    premiumMintAmountToConvert: 'Monto a Convertir',
    premiumMintLockHash: 'HASH LOCK',
    premiumMintVusdHash: 'HASH VUSD',
    premiumMintContract: 'CONTRATO',
    premiumMintPublish: 'PUBLICAR',
    premiumMintLockSignatureHash: 'Hash de Firma del Smart Contract Lock',
    premiumMintAutoCompleted: 'Auto-completado desde DCB Treasury',
    premiumMintAutoCompletedFromDcb: 'Hash auto-completado desde la Primera Firma (DCB Treasury)',
    premiumMintEnterLockHash: 'Ingresa el hash de la transacción del contrato de bloqueo',
    premiumMintLockContractHash: 'Hash de Transacción Lock Contract',
    premiumMintIsoMessageData: 'Datos de Mensaje ISO 20022',
    premiumMintBlockchainSignatures: 'Firmas Blockchain',
    premiumMintFirstSignature: '1ª Firma (DCB Treasury)',
    premiumMintSecondSignature: '2ª Firma (Treasury Minting)',
    premiumMintThirdSignature: '3ª Firma (Backed Certificate)',
    premiumMintPending: 'Pendiente',
    premiumMintGeneratedOnPublish: 'Se genera al publicar',
    premiumMintHashNote: 'Este hash corresponde a la transacción de bloqueo de fondos en DCB Treasury. Ha sido auto-completado desde la Primera Firma.',
    premiumMintVusdMintHash: 'Hash de Transacción VUSD Mint',
    premiumMintVusdHashTitle: 'Hash de Mint VUSD',
    premiumMintVusdHashSubtitle: 'Hash de la transacción de mint del token VUSD',
    premiumMintEnterVusdHash: 'Ingresa el hash de la transacción del mint VUSD',
    premiumMintVusdContractTitle: 'Contrato VUSD',
    premiumMintVusdContractSubtitle: 'Verifica la dirección del contrato VUSD en LemonChain',
    premiumMintVusdContractAddress: 'Dirección del Contrato VUSD (LemonChain)',
    premiumMintNetwork: 'Red',
    premiumMintToken: 'Token',
    premiumMintVerificationSummary: 'Resumen de Verificación',
    premiumMintPublishAndMint: 'Publicar y Mintear',
    premiumMintPublishingVusd: 'Minteando VUSD en LemonChain (modo producción)...',
    premiumMintCompleteTitle: '¡Minting Completado!',
    premiumMintCompleteSubtitle: 'VUSD ha sido minteado exitosamente en LemonChain',
    premiumMintPublicationCode: 'Código de Publicación',
    premiumMintTxHash: 'Hash de Transacción',
    premiumMintBlockNumber: 'Número de Bloque',
    premiumMintMintedAmount: 'Monto Minteado',
    premiumMintBeneficiary: 'Beneficiario',
    premiumMintViewOnExplorer: 'Ver en Explorador',
    premiumMintDownloadReceipt: 'Descargar Recibo',
    premiumMintNewMint: 'Nuevo Mint',
    premiumMintErrorTitle: 'Error en Minting',
    premiumMintErrorSubtitle: 'No se pudo completar la operación',
    premiumMintTryAgain: 'Intentar de Nuevo',
    premiumMintReadyToPublish: '¿Listo para Publicar?',
    premiumMintReadyToPublishDesc: 'Revisa todos los datos antes de publicar el mint de VUSD en LemonChain',
    premiumMintProductionMode: 'Minteando VUSD en LemonChain (modo producción)...',
    premiumMintHashesRegistered: 'Hashes registrados - Listos para verificación',
    premiumMintBothHashesMustMatch: 'Ambos hashes deben coincidir para proceder',
    premiumMintNotEntered: 'No ingresado',
    
    // Notifications - Wallet & Connection
    notifConnectedToLemonChain: 'Conectado a LemonChain',
    notifConnectWalletManually: 'Conecte wallet manualmente para operaciones blockchain',
    notifConnectingWallet: 'Conectando wallet a LemonChain...',
    notifConnectingToLemonChain: 'Conectando a LemonChain...',
    notifConnectedBalance: 'Conectado a LemonChain! Balance:',
    notifConnectionError: 'Error al conectar:',
    notifBlockchainError: 'Error blockchain:',
    notifContinuingSandbox: 'Continuando en modo sandbox...',
    notifWalletNotConfigured: 'Wallet no configurado. Configure VITE_ADMIN_PRIVATE_KEY y VITE_ADMIN_ADDRESS en el archivo .env',
    notifSandboxActivated: 'Modo Sandbox activado',
    
    // Notifications - Locks
    notifNewLockReceived: 'Nuevo lock recibido:',
    notifAmountMustBeBetween: 'El monto debe estar entre 0 y',
    notifRegisteringLock: 'Registrando lock en LockReserve...',
    notifGeneratingSecondSignature: 'Generando Segunda Firma (Treasury Minting)...',
    notifMovingToReserve: 'Moviendo a reserva...',
    notifSecondSignatureGenerated: 'Segunda Firma generada en LemonChain! TX:',
    notifLockApproved: 'Lock aprobado correctamente',
    notifLockRejected: 'Lock rechazado. Notificación enviada a DCB Treasury.',
    notifRequestRejected: 'Solicitud rechazada correctamente',
    notifNotificationSentDcb: 'Notificación enviada a DCB Treasury',
    notifErrorApprovingLock: 'Error al aprobar el lock',
    notifErrorRejectingLock: 'Error al rechazar el lock',
    
    // Notifications - Minting
    notifHashAutoCompleted: 'Hash del Lock auto-completado. Procede al paso 2 para ingresar el hash de VUSD.',
    notifHashesAutoCompleted: 'Hashes auto-completados. Lock:',
    notifVusdHashAutoCompleted: 'VUSD Hash auto-completado desde Lock Hash',
    notifGeneratingThirdSignature: 'Generando Tercera Firma (Backed Certificate)...',
    notifVusdMinted: 'VUSD Minteado en LemonChain! TX:',
    notifErrorMintingVusd: 'Error mintando VUSD:',
    notifSandboxSimulating: 'Modo Sandbox - Simulando mint...',
    notifErrorExecutingMint: 'Error al ejecutar el minting',
    
    // Notifications - General
    notifCopiedToClipboard: 'Copiado al portapapeles',
    notifLocksLoaded: 'locks cargados',
    notifServerLocksLoaded: 'locks del servidor',
    notifErrorConnectingServer: 'Error conectando al servidor',
    notifItemRemoved: 'Item removido de la cola',
    notifManualPdfDownloaded: 'Manual PDF descargado exitosamente',
    notifErrorGeneratingPdf: 'Error al generar el manual PDF',
    notifPdfGenerated: 'Premium PDF generado:',
    notifErrorGeneratingPdfRetry: 'Error al generar el PDF. Intente nuevamente.',
    notifResetComplete: 'RESET COMPLETO - Todos los valores en 0',
    
    // Notifications - User Management
    notifUserCreated: 'Usuario creado correctamente',
    notifErrorCreatingUser: 'Error al crear usuario',
    notifPasswordsDoNotMatch: 'Las contraseñas no coinciden',
    notifPasswordUpdated: 'Contraseña actualizada correctamente',
    notifErrorChangingPassword: 'Error al cambiar contraseña',
    
    // Notifications - Simulation
    notifSimulatedLockReceived: 'Lock simulado recibido de DCB Treasury',
    
    // Lock Approval Modal
    approveLockTitle: 'Aprobar Lock',
    selectAmountToMint: 'Selecciona el monto a mintear',
    amountReceived: 'Monto Recibido',
    bank: 'Banco',
    amountToLock: 'Monto a Lockear (USD)',
    maxAvailable: 'Máximo disponible',
    onApprovingThisLock: 'Al aprobar este lock:',
    lockIdLabel: 'Lock ID',
    
    // Lock Reserve Section
    locksPendingApproval: 'Locks Pendientes de Aprobación',
    reserveBalances: 'Saldos en Reserva',
    reserveBalancesSubtitle: 'Restantes de Aprobaciones Parciales',
    reserve: 'RESERVA',
    available: 'Disponible',
    original: 'Original',
    consumed: 'Consumido',
    created: 'Creado',
    moveToMintWithCode: 'Mover a Mint with Code',
    pending: 'PENDIENTE',
    approve: 'Aprobar',
  },

  en: {
    // Header
    headerTitle: 'CoreBanking System',
    headerSubtitle: 'DAES Data and Exchange Settlement',
    productionEnvironment: 'Production Environment',
    allSystemsOperational: '● All Systems Operational',
    dtcAnalysisReady: '● Digital Commercial Bank Ltd Analysis Ready',

    // Navigation
    navDashboard: 'Dashboard',
    navLedger: 'Account Ledger',
    navXcpB2B: 'XCP B2B API',
    navProcessor: 'Digital Commercial Bank Ltd Processor',
    navBinaryReader: 'Binary Reader',
    navAnalyzerPro: 'Digital Commercial Bank Ltd Pro Analyzer',
    navLargeFileAnalyzer: 'Large File Analyzer',
    navTransfers: 'Transfers',
    navApiKeys: 'API Keys',
    navAuditLogs: 'Audit Logs',
    navBlackScreen: 'Black Screen',
    navAuditBank: 'Bank Audit',
    navCustody: 'Custody Accounts',

    // Footer
    footerVersion: 'CoreBanking v1.0.0',
    footerIsoCompliant: 'ISO 4217 Compliant',
    footerPciReady: 'PCI-DSS Ready',
    footerMultiCurrency: 'Multi-Currency: USD • EUR • GBP • CHF',
    footerEncryption: 'Encryption: AES-256-GCM',
    footerForensicAnalysis: 'Digital Commercial Bank Ltd Forensic Analysis',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    refresh: 'Refresh',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    select: 'Select',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    confirm: 'Confirm',

    // Currency names
    currencyUSD: 'US Dollars (USD)',
    currencyEUR: 'Euros (EUR)',
    currencyGBP: 'Pounds (GBP)',
    currencyCHF: 'Swiss Francs (CHF)',
    currencyCAD: 'Canadian Dollars',
    currencyAUD: 'Australian Dollars',
    currencyJPY: 'Japanese Yen',
    currencyCNY: 'Chinese Yuan',
    currencyINR: 'Indian Rupees',
    currencyMXN: 'Mexican Pesos',
    currencyBRL: 'Brazilian Reals',
    currencyRUB: 'Russian Rubles',
    currencyKRW: 'Korean Won',
    currencySGD: 'Singapore Dollars',
    currencyHKD: 'Hong Kong Dollars',

    // Dashboard
    dashboardTitle: 'Dashboard',
    dashboardAccounts: 'accounts',
    dashboardTransactions: 'transactions',
    dashboardBalance: 'Balance',
    dashboardLoadFiles: 'Load Files',
    dashboardGenerateSample: 'Or Generate Sample File',
    dashboardNoAccounts: 'No accounts',
    dashboardWelcome: 'Welcome to CoreBanking System',
    dashboardAnalyzedBalances: 'Analyzed Balances from Large File',
    dashboardCurrenciesDetected: 'currencies',
    dashboardSavedInMemory: 'Balances are stored in memory and available for API transfers',
    dashboardWelcomeTitle: 'Welcome to CoreBanking System',
    dashboardWelcomeMessage: 'To get started, load a Digital Commercial Bank Ltd file from your local disk. The system will automatically detect currency blocks and create the corresponding accounts.',
    dashboardOrGenerateSample: 'Or Generate Sample File',
    dashboardViewDashboard: 'View Dashboard',
    dashboardAccountsCount: 'accounts',
    dashboardBalancesTitle: 'Analyzed Balances from Large File',
    dashboardBalancesSubtitle: 'transactions',
    dashboardBalancesSaved: 'Balances are stored in memory and available for API transfers',
    dashboardDetails: 'Details',
    dashboardRecentTransfers: 'Recent Transfers',
    dashboardNoTransfers: 'No transfers',
    dashboardAccountInfo: 'Account Information',
    dashboardErrorProcessing: 'Error processing file',
    dashboardErrorCreatingSample: 'Error creating sample file',
    dashboardNoCurrencyBlocks: 'No currency blocks detected in the file. Verify that it is a valid Digital Commercial Bank Ltd file.',
    dashboardFileProcessed: 'File processed successfully. {count} accounts created.',
    dashboardSampleCreated: 'Sample file created. {count} accounts generated.',
    dashboardUnknownError: 'Unknown error',

    // Ledger
    ledgerTitle: 'Account Ledger - General Ledger',
    ledgerSubtitle: 'Real-time updates from Digital Commercial Bank Ltd Analyzer',
    ledgerTotalAccounts: 'Total Accounts',
    ledgerTotalTransactions: 'Total Transactions',
    ledgerLastUpdate: 'Last Update',
    ledgerStatus: 'Status',
    ledgerOperational: 'Operational',
    ledgerNoData: 'No Data',
    ledgerUpdating: 'Updating...',
    ledgerConnected: 'System connected',
    ledgerAccount: 'Account',
    ledgerPrincipal: 'PRIMARY',
    ledgerSecondary: 'SECONDARY',
    ledgerTertiary: 'TERTIARY',
    ledgerFourth: 'FOURTH',
    ledgerTotalBalance: 'Total Balance',
    ledgerAverage: 'Average',
    ledgerHighest: 'Highest',
    ledgerLowest: 'Lowest',
    ledgerUpdatedAt: 'Updated',
    ledgerOfCurrencies: 'of 15 currencies',
    ledgerProcessed: 'processed',
    ledgerWaiting: 'Waiting',
    ledgerNoAccountsLoaded: 'No Accounts Loaded',
    ledgerNoBalancesInLedger: 'No balances in the ledger. Use the Large File Analyzer to load data.',
    ledgerUseAnalyzerToLoad: 'Use the Large File Analyzer to load data',
    ledgerGoToAnalyzer: 'Go to Analyzer →',
    ledgerTransactions: 'transactions',

    // Large File Analyzer
    analyzerTitle: 'Large File Digital Commercial Bank Ltd Analyzer',
    analyzerSubtitle: 'Block processing • Real-time extraction • Automatic persistence',
    analyzerSelectFile: 'Select Digital Commercial Bank Ltd File',
    analyzerLoadSaved: 'Load Saved Balances',
    analyzerPause: 'Pause',
    analyzerResume: 'Resume',
    analyzerStop: 'Stop',
    analyzerClearMemory: 'Clear Memory',
    analyzerProcessing: 'Processing...',
    analyzerCompleted: 'Completed',
    analyzerProgress: 'Progress',
    analyzerIndependentAccounts: 'Independent Accounts by Currency',
    analyzerGlobalSummary: 'GLOBAL SUMMARY',
    analyzerUpdatingLedger: 'Updating Ledger in Real Time',
    analyzerSyncingLedger: 'Syncing with Ledger',
    analyzerFileInfo: 'File Information',
    analyzerDetectedAlgorithm: 'Detected Algorithm',
    analyzerEncryptionStatus: 'Encryption Status',
    analyzerEncrypted: 'Encrypted',
    analyzerNotEncrypted: 'Not Encrypted',
    analyzerEntropy: 'Entropy Analysis',
    analyzerHighEntropy: 'HIGH ENTROPY',
    analyzerLowEntropy: 'LOW ENTROPY',
    analyzerTryDecrypt: 'Try Decrypt',
    analyzerLastTransactions: 'Last 10 transactions:',
    analyzerLoadFileForAnalysis: 'Load File for Analysis',
    analyzerCurrenciesDetected: 'currencies detected',
    analyzerPendingProcess: 'Pending Process',
    analyzerProcessInterrupted: '⚡ PROCESS INTERRUPTED - READY TO CONTINUE',
    analyzerReadyToContinue: 'Ready to Continue',
    analyzerFile: 'File',
    analyzerSavedProgress: '📊 Saved progress',
    analyzerContinueFrom: 'CONTINUE FROM',
    analyzerCancelProcess: 'Cancel Process',
    analyzerError: 'Error',
    analyzerNoPendingProcess: '⚠️ No pending process found',
    analyzerCouldNotRecover: '❌ Could not recover file.',
    analyzerLoadFileAgain: 'Please load the file again.',
    analyzerConfirmCancel: 'Are you sure you want to cancel the pending process?',
    analyzerAccountsByCurrency: 'Accounts by Currency',
    analyzerUpdatingRealTime: 'Updating in Real Time',
    analyzerExportReport: 'Export Report',
    analyzerTotalTransactions: 'Total Transactions',
    analyzerDetectedCurrencies: 'Detected Currencies',
    analyzerSyncing: 'Syncing',
    analyzerCompletedSuccessfully: '✓ Analysis Completed Successfully',
    analyzerMagicNumber: 'Magic Number',
    analyzerEntropyAnalysis: 'Entropy Analysis',
    analyzerAverageEntropy: 'Average Entropy',
    analyzerHighEntropyDescription: 'Data is heavily encrypted. Credentials required to decrypt.',
    analyzerLowEntropyDescription: 'Structured data without strong encryption. Balances can be extracted.',
    analyzerDecryptFile: 'Decrypt File',
    analyzerUsername: 'Username',
    analyzerPassword: 'Password',
    analyzerEnterUsername: 'Enter username',
    analyzerEnterPassword: 'Enter password',
    analyzerDecrypt: 'Decrypt',
    analyzerUsernamePasswordRequired: 'Please enter username and password',
    analyzerDecryptionDevelopment: 'Decryption function in development. Requires PBKDF2 + AES-GCM implementation',
    analyzerNavigateToOtherModules: '✓ You can navigate to other modules without stopping the process',
    analyzerFloatingIndicator: 'The floating indicator will show progress from any window',
    analyzerProcessed: 'processed',
    analyzerLastUpdate: 'Last update',
    analyzerTotalBalance: '💰 Total Accumulated Balance',
    analyzerAverage: '📈 Average',
    analyzerHighest: '🔺 Highest',
    analyzerLowest: '🔻 Lowest',
    analyzerPrincipal: '🥇 PRIMARY',
    analyzerSecondary: '🥈 SECONDARY',
    analyzerAccount: 'Account',
    analyzerAdding: 'Adding...',

    // XCP B2B API
    xcpTitle: 'XCP B2B API - International Remittances',
    xcpSubtitle: 'Secure banking transfers with mTLS + HMAC-SHA256',
    xcpSecurityFeatures: 'Security Features',
    xcpAuthentication: 'JWT Authentication',
    xcpObtainToken: 'Obtain JWT Token',
    xcpTokenActive: 'Token Active',
    xcpTokenValid: 'Token valid for 60 minutes',
    xcpAvailableBalances: 'Available Balances',
    xcpFundsFromAnalyzer: 'Funds loaded from Digital Commercial Bank Ltd analyzer',
    xcpBalanceSelected: 'Selected balance',
    xcpCreateRemittance: 'Create International Remittance',
    xcpAmount: 'Amount',
    xcpDestinationAccount: 'Destination Account',
    xcpReference: 'Reference',
    xcpPurposeCode: 'Purpose Code',
    xcpBeneficiaryName: 'Beneficiary Name',
    xcpBeneficiaryIban: 'Beneficiary IBAN',
    xcpUrgent: 'Urgent Transfer',
    xcpUrgentNote: 'additional charges apply',
    xcpSubmit: 'Create Remittance',
    xcpProcessing: 'Processing Remittance...',
    xcpRemittanceStatus: 'Remittance Status',
    xcpTransactionId: 'Transaction ID',
    xcpStatus: 'Status',
    xcpCreated: 'Created',
    xcpCompleted: 'Completed',
    xcpTransferCompleted: 'Transfer Completed',
    xcpFundsTransferred: 'Funds have been successfully transferred',
    xcpMtls: 'mTLS',
    xcpTlsVersion: 'TLS ≥ 1.2',
    xcpHmac: 'HMAC',
    xcpHmacAlgo: 'SHA-256',
    xcpJwt: 'JWT',
    xcpBearerAuth: 'Bearer Auth',
    xcpAntiReplay: 'Anti-Replay',
    xcpTimeWindow: '±5 min',
    xcpEndpoint: 'Endpoint',
    xcpAuth: 'Auth',
    xcpRequired: '*',
    xcpCompleteDocumentation: 'Complete Documentation',
    xcpDocumentationText: 'For complete integration of the XCP B2B module, refer to the documentation at src/xcp-b2b/README.md',
    xcpMtlsImplementation: '• mTLS implementation with client certificates',
    xcpHmacSigning: '• HMAC-SHA256 signing of all requests',
    xcpAutoRetry: '• Automatic retry handling with exponential backoff',
    xcpSchemaValidation: '• Schema validation with Zod',

    // Messages
    msgBalancesLoaded: 'Balances loaded from memory',
    msgBalancesCleared: 'Balances cleared from memory',
    msgConfirmClear: 'Are you sure you want to delete all saved balances?',
    msgInsufficientBalance: 'Insufficient balance',
    msgTokenRequired: 'You must obtain a token first',
    msgFieldsRequired: 'Complete all required fields',
    msgProcessingFile: 'Processing file',
    msgAnalysisComplete: 'Analysis Complete',
    msgErrorOccurred: 'Error processing',

    // Validation Messages
    validationNoCapitalTitle: 'NO CAPITAL AVAILABLE',
    validationNoCapitalAccount: 'Account',
    validationNoCapitalBalanceTotal: 'Total Balance',
    validationNoCapitalBalanceAvailable: 'Available Balance',
    validationNoCapitalBalanceReserved: 'Reserved Balance',
    validationNoCapitalMessage: 'Cannot create pledge without available capital.',
    validationNoCapitalSolution: 'Solution:',
    validationNoCapitalSolution1: 'Release the existing pledge from this account, or',
    validationNoCapitalSolution2: 'Use a custody account with available balance',
    validationAmountExceedsTitle: 'AMOUNT EXCEEDS AVAILABLE',
    validationAmountExceedsRequested: 'Requested',
    validationAmountExceedsAvailable: 'Available',
    validationAmountExceedsMessage: 'Reduce the pledge amount or select another account.',
    validationDuplicatePledgeTitle: 'DUPLICATE PLEDGE DETECTED',
    validationDuplicatePledgeMessage: 'An ACTIVE pledge already exists for this custody account.\nThe same capital cannot be deployed twice.',
    validationDuplicatePledgeSolution: 'Solution:',
    validationDuplicatePledgeSolution1: 'Release the existing pledge first, or',
    validationDuplicatePledgeSolution2: 'Use a different custody account',

    // Time
    timeSeconds: 'seconds',
    timeMinutes: 'minutes',
    timeHours: 'hours',
    timeDays: 'days',

    // Black Screen
    blackScreenTitle: 'Banking Black Screen',
    blackScreenSubtitle: 'Professional Bank Confirmation System',
    blackScreenGenerator: 'Black Screen Generator',
    blackScreenAvailableAccounts: 'Available Accounts',
    blackScreenNoBalances: 'No balances loaded in Ledger',
    blackScreenUseAnalyzer: 'Use Large File Analyzer to load balances',
    blackScreenGenerate: 'Generate Black Screen',
    blackScreenConfidential: 'CONFIDENTIAL - BANKING DOCUMENT',
    blackScreenDownloadTxt: 'Download TXT',
    blackScreenPrint: 'Print',
    blackScreenClose: 'Close',
    blackScreenBankConfirmation: 'BANK BLACK SCREEN - OFFICIAL BANK CONFIRMATION',
    blackScreenXcpBank: 'Digital Commercial Bank Ltd',
    blackScreenDocumentConfidential: 'CONFIDENTIAL DOCUMENT - FOR AUTHORIZED BANKING USE ONLY',
    blackScreenBeneficiaryInfo: 'BENEFICIARY INFORMATION',
    blackScreenHolder: 'Account Holder',
    blackScreenAccount: 'Account',
    blackScreenBank: 'Bank',
    blackScreenSwift: 'SWIFT',
    blackScreenRoutingNumber: 'Routing Number',
    blackScreenCurrency: 'Currency',
    blackScreenMonetaryAggregates: 'MONETARY AGGREGATES',
    blackScreenM1Liquid: 'M1 (Liquid Assets)',
    blackScreenM1Description: 'Cash and demand deposits',
    blackScreenM2Near: 'M2 (Near Money)',
    blackScreenM2Description: 'M1 + Savings deposits + Small time deposits',
    blackScreenM3Broad: 'M3 (Broad Money)',
    blackScreenM3Description: 'M2 + Large time deposits',
    blackScreenM4Total: 'M4 (Total Liquid Assets)',
    blackScreenM4Description: 'M3 + Negotiable money market instruments',
    blackScreenVerifiedBalance: 'TOTAL VERIFIED BALANCE',
    blackScreenTechnicalInfo: 'Digital Commercial Bank Ltd TECHNICAL INFORMATION',
    blackScreenDtcReference: 'Digital Commercial Bank Ltd Reference',
    blackScreenVerificationHash: 'Verification Hash',
    blackScreenTransactionsProcessed: 'Transactions Processed',
    blackScreenIssueDate: 'Issue Date',
    blackScreenExpiryDate: 'Expiry Date',
    blackScreenVerificationStatus: 'Verification Status',
    blackScreenVerified: 'VERIFIED AND CERTIFIED',
    blackScreenCertification: 'OFFICIAL BANK CERTIFICATION',
    blackScreenCertificationText: 'This document certifies that the aforementioned funds are available and verified according to international banking and settlement standards.',
    blackScreenCertificationStandards: 'Compliant with standards: SWIFT MT799/MT999, FEDWIRE, DTC (Depository Trust Company), ISO 20022',
    blackScreenDigitallySigned: 'DIGITALLY SIGNED',
    blackScreenGeneratedBy: 'Generated by',
    blackScreenCopyright: 'DAES CoreBanking - Data and Exchange Settlement',
    blackScreenMasterAccount: 'Digital Commercial Bank Ltd MASTER ACCOUNT',
    blackScreenInternational: 'Digital Commercial Bank Ltd',
    blackScreenTotalAvailable: 'Available',
    blackScreenPrincipal: 'Principal',

    // Login
    loginTitle: 'DAES SYSTEM',
    loginSubtitle: 'Data and Exchange Settlement',
    loginUser: 'User',
    loginPassword: 'Password',
    loginShowPassword: 'Show password',
    loginHidePassword: 'Hide password',
    loginButton: 'ACCESS SYSTEM',
    loginAuthenticating: 'AUTHENTICATING...',
    loginInvalidCredentials: 'Invalid credentials. Access denied.',
    loginTooManyAttempts: 'Too many failed attempts. System locked for 30 seconds.',
    loginAttempts: 'Attempts',
    loginSecureConnection: 'Secure connection • AES-256-GCM • mTLS',
    loginCopyright: '© 2025 DAES CoreBanking System',
    loginVersion: 'v3.0.0',
    loginAllRightsReserved: 'All rights reserved',
    // Treasury Minting Login
    tmLoginTitle: 'Sign In',
    tmLoginSubtitle: 'Treasury Minting Platform',
    tmLoginUser: 'Username',
    tmLoginUserPlaceholder: 'Enter your username',
    tmLoginPassword: 'Password',
    tmLoginPasswordPlaceholder: 'Enter your password',
    tmLoginButton: 'Sign In',
    tmLoginAuthenticating: 'Verifying...',
    tmTestCredentials: 'Test credentials:',
    tmTestUser: 'Username',
    tmTestPassword: 'Password',

    // App Header
    logout: 'Logout',
    logoutTitle: 'Sign Out',

    // Advanced Banking Dashboard
    advDashboardTitle: 'Banking Dashboard',
    advDashboardSubtitle: 'Advanced financial management system',
    advDashboardTotalBalance: 'Total Balance',
    advDashboardActiveAccounts: 'Active Accounts',
    advDashboardTransactions: 'Transactions',
    advDashboardMovements: 'Movements',
    advDashboardDebits: 'Debits',
    advDashboardCredits: 'Credits',
    advDashboardFees: 'Fees',
    advDashboardLedgerAccounts: 'Ledger Accounts (15 Currencies)',
    advDashboardCurrencyDistribution: 'Currency Distribution',
    advDashboardTransactionHistory: 'Transaction History',
    advDashboardNoTransactions: 'No transactions to display',
    advDashboardNoTransactionsMessage: 'Transactions will appear here when you perform operations',
    advDashboardAllPeriods: 'All',
    advDashboardLast24h: 'Last 24h',
    advDashboardLast7d: 'Last week',
    advDashboardLast30d: 'Last month',
    advDashboardAllCurrencies: 'All currencies',
    advDashboardUpdate: 'Update',
    advDashboardUpdating: 'Updating...',
    advDashboardHideBalance: 'Hide balance',
    advDashboardShowBalance: 'Show balance',
    advDashboardConvertedBalance: 'Total Converted Balance',

    // Audit Bank Panel
    auditTitle: 'Bank Audit Panel',
    auditSubtitle: 'Automatic financial asset detection with M0-M4 classification',
    auditStartScan: 'Start Scan',
    auditScanning: 'Scanning...',
    auditStopScan: 'Stop Scan',
    auditExportJson: 'Export JSON',
    auditExportCsv: 'Export CSV',
    auditTotalFindings: 'Total Findings',
    auditFilesScanned: 'Files Scanned',
    auditBanksDetected: 'Banks Detected',
    auditAccountsFound: 'Accounts Found',
    auditTotalAmount: 'Total Amount',
    auditClassifications: 'Monetary Classifications',
    auditM0Cash: 'M0 - Cash',
    auditM1Demand: 'M1 - Demand Deposits',
    auditM2Savings: 'M2 - Savings',
    auditM3Institutional: 'M3 - Institutional',
    auditM4Instruments: 'M4 - Financial Instruments',
    auditFindings: 'Detailed Findings',
    auditNoFindings: 'No findings found',
    auditLoadResults: 'Load Results',
    auditFile: 'File',
    auditBank: 'Bank',
    auditAccount: 'Account',
    auditAmount: 'Amount',
    auditCurrency: 'Currency',
    auditClassification: 'Classification',
    auditConfidence: 'Confidence',
    auditEvidence: 'Evidence',
    auditDetectedAt: 'Detected',
    auditAggregatedTotals: 'Aggregated Totals by Currency',
    auditEquivUsd: 'USD Equiv.',
    auditSecurityNote: 'Security Note',
    auditSecurityMessage: 'Account numbers are automatically masked. Full values are encrypted (AES-256) complying with ISO 27001 / AML / FATF.',
    auditConfigureDataPath: 'Configure Data Path',
    auditDataPath: 'Digital Commercial Bank Ltd Data Path',
    auditProcessing: 'Processing files...',
    auditComplete: 'Scan completed',
    auditError: 'Error during scan',
    auditM0Description: 'Physical cash, bills, coins',
    auditM1Description: 'Checking accounts, demand deposits',
    auditM2Description: 'Savings, time deposits < 1 year',
    auditM3Description: 'Institutional deposits > 1M USD',
    auditM4Description: 'Repos, MTNs, SKRs, commercial paper',
    auditLoadFile: 'Load Digital Commercial Bank Ltd File',
    auditMaskedView: 'Masked View',
    auditCompleteView: 'Complete View',
    auditClearData: 'Clear',
    auditDataSources: 'Data Sources',
    auditAnalyzerIntegration: 'Integration with Large File Analyzer',
    auditAnalyzerDescription: 'Bank Audit is listening to data from the Analyzer in real-time. When you process a Digital Commercial Bank Ltd file in the Analyzer, the data will appear AUTOMATICALLY here.',
    auditActiveSubscription: 'Active subscription',
    auditAutoSync: 'Automatic sync',
    auditSystemBalances: 'System Balances',
    auditAnalyzeBalances: 'Analyze System Balances',
    auditMonetaryClassification: 'Monetary Classification M0-M4',
    auditDetailedFindings: 'Detailed Findings',
    auditScrollToSeeAll: 'Scroll to see all',
    auditViewFullReport: 'VIEW FULL REPORT',

    // DCB Treasury Certification Platform
    dcbTitle: 'DCB Treasury Certification Platform',
    dcbSubtitle: 'Digital Commercial Bank • Blockchain Treasury Management',
    dcbDashboard: 'Dashboard',
    dcbContracts: '📜 Contracts',
    dcbBanks: 'Banks',
    dcbCustody: 'Custody',
    dcbLocks: 'Locks',
    dcbMinting: 'Minting',
    dcbTerminal: 'Terminal',
    dcbConfig: 'Config',
    dcbWalletsRoles: 'Wallets & Roles',
    dcbBack: 'Back',
    dcbDisconnect: 'Disconnect',
    dcbDirectConnect: 'Direct Connect',
    dcbDirectConnection: 'Direct Connection to LemonChain',
    dcbSelectWallet: 'Select an authorized wallet to connect',
    dcbCancel: 'Cancel',
    dcbConnect: 'Connect',
    dcbConnecting: 'Connecting...',
    dcbSummary: 'Summary',
    dcbActive: 'Active',
    dcbCustodies: 'Custodies',
    dcbViewRoles: 'View Roles',
    dcbAuthorized: 'authorized',
    dcbAuthorizedWallets: 'Authorized Wallets - Lemon Chain',
    dcbViewDetails: 'View Details',
    dcbRecentLocks: 'Recent Locks',
    dcbNoLocks: 'No locks',
    dcbStatus: 'Status',
    dcbAmount: 'Amount',
    dcbExpiry: 'Expiry',
    dcbBeneficiary: 'Beneficiary',
    dcbSandbox: 'Sandbox',
    dcbProduction: 'Production',
    dcbNotConnected: 'Not Connected',
    dcbSwitchNetwork: 'Switch Network',
    dcbDirect: 'Direct',
    
    // DCB Treasury - Contracts Tab
    dcbContractsV3: 'Contracts v3.0',
    dcbContractsDeployed: 'Deployed',
    dcbContractsPending: 'Pending',
    dcbContractsTotalLines: 'Total Lines',
    dcbContractsNetwork: 'Network',
    dcbContractsChainId: 'Chain ID',
    dcbContractsExplorer: 'Explorer',
    dcbContractsViewOnExplorer: 'View on Explorer',
    dcbContractsCopy: 'Copy',
    dcbContractsCopied: 'Copied!',
    dcbContractsFeatures: 'Features',
    dcbContractsSourceFiles: 'Source Files',
    
    // DCB Treasury - Banks Tab
    dcbBanksTitle: 'Bank Management',
    dcbBanksRegistered: 'Registered Banks',
    dcbBanksAdd: 'Add Bank',
    dcbBanksId: 'Bank ID',
    dcbBanksName: 'Name',
    dcbBanksSigner: 'Signer',
    dcbBanksStatus: 'Status',
    dcbBanksActions: 'Actions',
    dcbBanksNoRegistered: 'No banks registered',
    dcbBanksAddFirst: 'Add your first bank to get started',
    dcbBanksRegisterNew: 'Register New Bank',
    dcbBanksSwiftCode: 'SWIFT Code',
    dcbBanksCountry: 'Country',
    dcbBanksRegister: 'Register',
    dcbBanksRegistering: 'Registering...',
    
    // DCB Treasury - Custody Tab
    dcbCustodyTitle: 'Custody Management',
    dcbCustodyAccounts: 'Custody Accounts',
    dcbCustodyCreate: 'Create Custody',
    dcbCustodySourceAccount: 'Source Account',
    dcbCustodySelectSource: 'Select source account',
    dcbCustodyAvailable: 'Available',
    dcbCustodyLocked: 'Locked',
    dcbCustodyTotal: 'Total',
    dcbCustodyNoAccounts: 'No custody accounts',
    dcbCustodyCreateFirst: 'Create your first custody account',
    dcbCustodyVaultAddress: 'Vault Address',
    dcbCustodyMetadataHash: 'Metadata Hash',
    dcbCustodyCreatedAt: 'Created At',
    dcbCustodyLastActivity: 'Last Activity',
    dcbCustodyOwner: 'Owner',
    
    // DCB Treasury - Locks Tab
    dcbLocksTitle: 'Lock Management',
    dcbLocksCreate: 'Create Lock',
    dcbLocksSelectCustody: 'Select Custody',
    dcbLocksSelectBank: 'Select Bank',
    dcbLocksAmount: 'Lock Amount',
    dcbLocksExpiry: 'Expiry Date',
    dcbLocksUetr: 'UETR (Reference)',
    dcbLocksBeneficiary: 'Beneficiary',
    dcbLocksCreateLock: 'Create Lock',
    dcbLocksCreating: 'Creating...',
    dcbLocksNoLocks: 'No locks',
    dcbLocksCreateFirst: 'Create your first lock',
    dcbLocksRequested: 'Requested',
    dcbLocksLocked: 'Locked',
    dcbLocksConsumed: 'Consumed',
    dcbLocksCanceled: 'Canceled',
    dcbLocksConsume: 'Consume',
    dcbLocksRelease: 'Release',
    dcbLocksBankSignature: 'Bank Signature',
    dcbLocksIsoHash: 'ISO Hash',
    dcbLocksDaesTxnId: 'DAES Transaction ID',
    
    // DCB Treasury - Minting Tab
    dcbMintingTitle: 'VUSD Minting',
    dcbMintingConsume: 'Consume & Mint',
    dcbMintingSelectLock: 'Select Lock',
    dcbMintingConsumeAndMint: 'Consume & Mint VUSD',
    dcbMintingConsuming: 'Consuming...',
    dcbMintingNoLocksAvailable: 'No locks available',
    dcbMintingCreateLockFirst: 'Create a lock first',
    dcbMintingLemxCode: 'Mint with LEMX Code',
    dcbMintingEnterCode: 'Enter authorization code',
    dcbMintingVerify: 'Verify',
    dcbMintingVerifying: 'Verifying...',
    dcbMintingEnterHash: 'Enter transaction hash',
    dcbMintingEnterContract: 'Enter VUSD contract address',
    dcbMintingVerifyContract: 'Verify Contract',
    dcbMintingContractVerified: 'Contract Verified!',
    dcbMintingContractMismatch: 'Contract does not match official',
    dcbMintingConfirmMint: 'Confirm Minting',
    dcbMintingConfirming: 'Confirming...',
    dcbMintingExplorer: 'Minting Explorer',
    dcbMintingHistory: 'Minting History',
    dcbMintingNoHistory: 'No minting history',
    dcbMintingViewDetails: 'View Details',
    dcbMintingDownloadPdf: 'Download PDF',
    dcbMintingAuthorizationCode: 'Authorization Code',
    dcbMintingPublicationHash: 'Publication Hash',
    dcbMintingContractAddress: 'Contract Address',
    dcbMintingLusdMinted: 'VUSD Minted',
    dcbMintingTimestamp: 'Timestamp',
    
    // DCB Treasury - Terminal Tab
    dcbTerminalTitle: 'Operations Terminal',
    dcbTerminalClear: 'Clear',
    dcbTerminalExport: 'Export',
    dcbTerminalPause: 'Pause',
    dcbTerminalResume: 'Resume',
    dcbTerminalAutoScroll: 'Auto-scroll',
    dcbTerminalNoLogs: 'No logs',
    
    // DCB Treasury - Config Tab
    dcbConfigTitle: 'Configuration',
    dcbConfigContractAddresses: 'Contract Addresses',
    dcbConfigNetwork: 'Network',
    dcbConfigChainId: 'Chain ID',
    dcbConfigRpcUrl: 'RPC URL',
    dcbConfigExplorerUrl: 'Explorer URL',
    dcbConfigSave: 'Save',
    dcbConfigSaving: 'Saving...',
    dcbConfigReset: 'Reset',
    dcbConfigResetConfirm: 'Reset configuration?',
    
    // DCB Treasury - Wallets & Roles Tab
    dcbWalletsTitle: 'Wallets & Roles',
    dcbWalletsAuthorized: 'Authorized Wallets',
    dcbWalletsRole: 'Role',
    dcbWalletsAddress: 'Address',
    dcbWalletsDescription: 'Description',
    dcbWalletsPermissions: 'Permissions',
    dcbWalletsPrivateKey: 'Private Key',
    dcbWalletsShowKey: 'Show Key',
    dcbWalletsHideKey: 'Hide Key',
    dcbWalletsCopyKey: 'Copy Key',
    dcbWalletsKeyCopied: 'Key Copied!',
    
    // DCB Treasury - Flow Steps
    dcbFlowStep1: 'Select M1 Custody Account with USD funds',
    dcbFlowStep2: 'Create CustodyVault on blockchain',
    dcbFlowStep3: 'Create Lock with bank signature (EIP-712)',
    dcbFlowStep4: 'Consume & Mint generates authorization code (MINT-XXXX-YYYY)',
    dcbFlowStep5: 'LEMX MintingBridge verifies and mints VUSD',
    dcbFlowStep6: 'Publication in Mint Explorer with TX hash',
    
    // DCB Treasury - LEMX Authorization
    dcbLemxTitle: 'LEMX Authorization',
    dcbLemxPendingRequests: 'Pending Requests',
    dcbLemxApprove: 'Approve',
    dcbLemxReject: 'Reject',
    dcbLemxApproving: 'Approving...',
    dcbLemxRejecting: 'Rejecting...',
    dcbLemxNoRequests: 'No pending requests',
    dcbLemxRequestDetails: 'Request Details',
    dcbLemxAuthCode: 'Authorization Code',
    dcbLemxAmount: 'Amount',
    dcbLemxRequestedAt: 'Requested At',
    dcbLemxRequestedBy: 'Requested By',
    
    // DCB Treasury - PDF Receipt
    dcbPdfTitle: 'DCB Treasury Certification Receipt',
    dcbPdfCertificationNumber: 'Certification Number',
    dcbPdfIssuedAt: 'Issued At',
    dcbPdfSourceAccount: 'Source Account',
    dcbPdfDestination: 'Destination',
    dcbPdfAmountUsd: 'USD Amount',
    dcbPdfAmountLusd: 'VUSD Amount',
    dcbPdfAuthorizationCode: 'Authorization Code',
    dcbPdfTxHash: 'Transaction Hash',
    dcbPdfContractAddress: 'Contract Address',
    dcbPdfBlockNumber: 'Block Number',
    dcbPdfGasUsed: 'Gas Used',
    dcbPdfVerificationHash: 'Verification Hash',
    dcbPdfOfficialDocument: 'Official Document',
    dcbPdfDigitallySigned: 'Digitally Signed',
    
    // LEMX Minting Platform - Complete English translations
    institution: 'Institution',
    standard: 'Standard',
    signerWallet: 'Signer Wallet',
    pending: 'Pending',
    noPendingLocks: 'No pending locks',
    lockReceived: 'Locks from DCB Treasury will appear here',
    viewDetails: 'View details',
    recentLocks: 'Recent Locks',
    activeLocks: 'active locks',
    noLogs: 'No logs recorded',
    pendingLocksTitle: 'Pending Locks',
    resetSandbox: 'Reset Sandbox',
    connected: 'Connected',
    fullSync: 'Full Sync',
    treasuryCurrencies: 'Treasury Currencies',
    supportedCurrencies: 'supported currencies',
    activeForMinting: 'Active for Minting',
    mint: 'Mint',
    reserve: 'Reserve',
    availableForMintingLabel: 'Available for Minting',
    locksInReserve: 'locks in reserve',
    viewReserve: 'View Reserve',
    totalMintedLabel: 'Total Minted',
    mintsCompletedCount: 'mints completed',
    activeBank: 'Active Bank',
    connectedBank: 'Connected bank for authorization',
    swiftBic: 'SWIFT/BIC',
    totalVolume: 'Total Volume',
    completedMints: 'Completed Mints',
    noMintedRecords: 'No minting records',
    recentEvents: 'Recent Events',
    networkStatus: 'Network Status',
    beneficiary: 'Beneficiary',
    expiresAt: 'Expires',
    approve: 'Approve',
    downloadPdf: 'Download PDF',
    reject: 'Reject',
    mintWithCode: 'Mint with Code',
    mintsPending: 'Mints Pending',
    inQueueUsd: 'In queue (USD)',
    authorizationCode: 'Authorization Code',
    amountUsd: 'USD Amount',
    createdAt: 'Created',
    mintQueue: 'Mint Queue',
    noMintOrders: 'No pending minting orders',
    locksFromDcb: 'Approved locks from DCB Treasury will appear here',
    enterAuthCode: 'Enter an authorization code to search',
    lockReserve: 'Lock Reserve',
    approvedLocksTitle: 'Approved Locks',
    approvedAt: 'Approved',
    noApprovedLocks: 'No approved locks',
    lusdMinted: 'VUSD Minted',
    mintedAt: 'Minted',
    mintedBy: 'Minted by',
    rejectedTitle: 'Rejected',
    rejectedBy: 'Rejected by',
    rejectedAt: 'Rejected',
    noRejectedLocks: 'No rejected locks',
    amountToMint: 'Select amount to mint',
    notificationWillBeSent: 'Notification will be sent to DCB Treasury',
    selectedAmountWillMove: 'Selected amount will move to Lock Reserve',
    youCanProceed: 'You can proceed with minting from Mint with Code',
    processingText: 'Processing...',
    approveAndNotify: 'Approve and Notify',
    confirmMinting: 'Confirm Minting',
    createThisAction: 'This action will create',
    confirmAndMint: 'Confirm and Mint',
    confirmNewPassword: 'Confirm New Password',
    lusdContract: 'VUSD Contract',
    previous: 'Previous',
    next: 'Next',
    lusdMintedSuccess: 'VUSD minted successfully!',
    completed: 'Completed',
    accepted: 'Accepted',
    rejected: 'Rejected',
    approved: 'Approved',
    completedLabel: 'Completed',
    pendingLocks: 'Pending Locks',
    minted: 'Minted',
    dashboard: 'Dashboard',
    logs: 'Logs',
    
    // Premium Mint Modal
    premiumMintTitle: 'VUSD Minting Protocol',
    premiumMintSubtitle: 'USD → VUSD Conversion on LemonChain',
    premiumMintAmountToConvert: 'Amount to Convert',
    premiumMintLockHash: 'LOCK HASH',
    premiumMintVusdHash: 'VUSD HASH',
    premiumMintContract: 'CONTRACT',
    premiumMintPublish: 'PUBLISH',
    premiumMintLockSignatureHash: 'Smart Contract Lock Signature Hash',
    premiumMintAutoCompleted: 'Auto-completed from DCB Treasury',
    premiumMintAutoCompletedFromDcb: 'Hash auto-completed from First Signature (DCB Treasury)',
    premiumMintEnterLockHash: 'Enter the lock contract transaction hash',
    premiumMintLockContractHash: 'Lock Contract Transaction Hash',
    premiumMintIsoMessageData: 'ISO 20022 Message Data',
    premiumMintBlockchainSignatures: 'Blockchain Signatures',
    premiumMintFirstSignature: '1st Signature (DCB Treasury)',
    premiumMintSecondSignature: '2nd Signature (Treasury Minting)',
    premiumMintThirdSignature: '3rd Signature (Backed Certificate)',
    premiumMintPending: 'Pending',
    premiumMintGeneratedOnPublish: 'Generated on publish',
    premiumMintHashNote: 'This hash corresponds to the fund locking transaction in DCB Treasury. It was auto-completed from the First Signature.',
    premiumMintVusdMintHash: 'VUSD Mint Transaction Hash',
    premiumMintVusdHashTitle: 'VUSD Mint Hash',
    premiumMintVusdHashSubtitle: 'VUSD token mint transaction hash',
    premiumMintEnterVusdHash: 'Enter the VUSD mint transaction hash',
    premiumMintVusdContractTitle: 'VUSD Contract',
    premiumMintVusdContractSubtitle: 'Verify the VUSD contract address on LemonChain',
    premiumMintVusdContractAddress: 'VUSD Contract Address (LemonChain)',
    premiumMintNetwork: 'Network',
    premiumMintToken: 'Token',
    premiumMintVerificationSummary: 'Verification Summary',
    premiumMintPublishAndMint: 'Publish and Mint',
    premiumMintPublishingVusd: 'Minting VUSD on LemonChain (production mode)...',
    premiumMintCompleteTitle: 'Minting Complete!',
    premiumMintCompleteSubtitle: 'VUSD has been successfully minted on LemonChain',
    premiumMintPublicationCode: 'Publication Code',
    premiumMintTxHash: 'Transaction Hash',
    premiumMintBlockNumber: 'Block Number',
    premiumMintMintedAmount: 'Minted Amount',
    premiumMintBeneficiary: 'Beneficiary',
    premiumMintViewOnExplorer: 'View on Explorer',
    premiumMintDownloadReceipt: 'Download Receipt',
    premiumMintNewMint: 'New Mint',
    premiumMintErrorTitle: 'Minting Error',
    premiumMintErrorSubtitle: 'Could not complete the operation',
    premiumMintTryAgain: 'Try Again',
    premiumMintReadyToPublish: 'Ready to Publish?',
    premiumMintReadyToPublishDesc: 'Review all data before publishing the VUSD mint on LemonChain',
    premiumMintProductionMode: 'Minting VUSD on LemonChain (production mode)...',
    premiumMintHashesRegistered: 'Hashes registered - Ready for verification',
    premiumMintBothHashesMustMatch: 'Both hashes must match to proceed',
    premiumMintNotEntered: 'Not entered',
    
    // Notifications - Wallet & Connection
    notifConnectedToLemonChain: 'Connected to LemonChain',
    notifConnectWalletManually: 'Connect wallet manually for blockchain operations',
    notifConnectingWallet: 'Connecting wallet to LemonChain...',
    notifConnectingToLemonChain: 'Connecting to LemonChain...',
    notifConnectedBalance: 'Connected to LemonChain! Balance:',
    notifConnectionError: 'Connection error:',
    notifBlockchainError: 'Blockchain error:',
    notifContinuingSandbox: 'Continuing in sandbox mode...',
    notifWalletNotConfigured: 'Wallet not configured. Set VITE_ADMIN_PRIVATE_KEY and VITE_ADMIN_ADDRESS in the .env file',
    notifSandboxActivated: 'Sandbox Mode activated',
    
    // Notifications - Locks
    notifNewLockReceived: 'New lock received:',
    notifAmountMustBeBetween: 'Amount must be between 0 and',
    notifRegisteringLock: 'Registering lock in LockReserve...',
    notifGeneratingSecondSignature: 'Generating Second Signature (Treasury Minting)...',
    notifMovingToReserve: 'Moving to reserve...',
    notifSecondSignatureGenerated: 'Second Signature generated on LemonChain! TX:',
    notifLockApproved: 'Lock approved successfully',
    notifLockRejected: 'Lock rejected. Notification sent to DCB Treasury.',
    notifRequestRejected: 'Request rejected successfully',
    notifNotificationSentDcb: 'Notification sent to DCB Treasury',
    notifErrorApprovingLock: 'Error approving lock',
    notifErrorRejectingLock: 'Error rejecting lock',
    
    // Notifications - Minting
    notifHashAutoCompleted: 'Lock hash auto-completed. Proceed to step 2 to enter VUSD hash.',
    notifHashesAutoCompleted: 'Hashes auto-completed. Lock:',
    notifVusdHashAutoCompleted: 'VUSD Hash auto-completed from Lock Hash',
    notifGeneratingThirdSignature: 'Generating Third Signature (Backed Certificate)...',
    notifVusdMinted: 'VUSD Minted on LemonChain! TX:',
    notifErrorMintingVusd: 'Error minting VUSD:',
    notifSandboxSimulating: 'Sandbox Mode - Simulating mint...',
    notifErrorExecutingMint: 'Error executing minting',
    
    // Notifications - General
    notifCopiedToClipboard: 'Copied to clipboard',
    notifLocksLoaded: 'locks loaded',
    notifServerLocksLoaded: 'locks from server',
    notifErrorConnectingServer: 'Error connecting to server',
    notifItemRemoved: 'Item removed from queue',
    notifManualPdfDownloaded: 'Manual PDF downloaded successfully',
    notifErrorGeneratingPdf: 'Error generating manual PDF',
    notifPdfGenerated: 'Premium PDF generated:',
    notifErrorGeneratingPdfRetry: 'Error generating PDF. Please try again.',
    notifResetComplete: 'RESET COMPLETE - All values set to 0',
    
    // Notifications - User Management
    notifUserCreated: 'User created successfully',
    notifErrorCreatingUser: 'Error creating user',
    notifPasswordsDoNotMatch: 'Passwords do not match',
    notifPasswordUpdated: 'Password updated successfully',
    notifErrorChangingPassword: 'Error changing password',
    
    // Notifications - Simulation
    notifSimulatedLockReceived: 'Simulated lock received from DCB Treasury',
    
    // Lock Approval Modal
    approveLockTitle: 'Approve Lock',
    selectAmountToMint: 'Select amount to mint',
    amountReceived: 'Amount Received',
    bank: 'Bank',
    amountToLock: 'Amount to Lock (USD)',
    maxAvailable: 'Max available',
    onApprovingThisLock: 'On approving this lock:',
    lockIdLabel: 'Lock ID',
    
    // Lock Reserve Section
    locksPendingApproval: 'Locks Pending Approval',
    reserveBalances: 'Reserve Balances',
    reserveBalancesSubtitle: 'Remaining from Partial Approvals',
    reserve: 'RESERVE',
    available: 'Available',
    original: 'Original',
    consumed: 'Consumed',
    created: 'Created',
    moveToMintWithCode: 'Move to Mint with Code',
    pending: 'PENDING',
    approve: 'Approve',
  },
};

