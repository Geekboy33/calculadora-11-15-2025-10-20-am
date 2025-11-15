/**
 * Public API Verification Page
 * Página pública para verificar cuentas custodio a través de URL
 * https://luxliqdaes.cloud/blockchain/verify/{ACCOUNT_ID}
 */

import { useEffect, useState } from 'react';
import { Shield, CheckCircle, Lock, TrendingUp, Calendar, Hash, Key, Award, AlertCircle } from 'lucide-react';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

interface VerificationPageProps {
  accountId: string;
}

export function PublicVerificationPage({ accountId }: VerificationPageProps) {
  const [account, setAccount] = useState<CustodyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccountData();
  }, [accountId]);

  const loadAccountData = () => {
    try {
      setLoading(true);
      const accounts = custodyStore.getAccounts();
      const foundAccount = accounts.find(a => a.id === accountId);

      if (!foundAccount) {
        setError('Account not found');
        return;
      }

      setAccount(foundAccount);
      setError(null);
    } catch (err) {
      setError('Error loading account data');
      console.error('Error loading account:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying account...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500/50 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-500 mb-2">Verification Failed</h1>
          <p className="text-gray-400">{error || 'Account not found'}</p>
        </div>
      </div>
    );
  }

  const accountTypeDisplay = account.accountType === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING ACCOUNT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-700 rounded-full mb-4 shadow-[0_0_30px_rgba(0,255,136,0.5)]">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            DAES Custody Verification
          </h1>
          <p className="text-gray-400">Data and Exchange Settlement - Official Verification</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-semibold">Verified Account</span>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-gradient-to-br from-gray-900/50 to-black border border-green-500/30 rounded-lg p-8 shadow-[0_0_50px_rgba(0,255,136,0.1)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-green-400 mb-2">{account.accountName}</h2>
              <p className="text-gray-400 text-sm">{accountTypeDisplay}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Account Number</div>
              <div className="text-xl font-mono font-bold text-green-400">{account.accountNumber}</div>
            </div>
          </div>

          {/* Balance Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Total Balance</span>
              </div>
              <div className="text-3xl font-bold text-green-400 font-mono">
                {account.currency} {account.totalBalance.toLocaleString()}
              </div>
            </div>

            <div className="bg-black/50 border border-yellow-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Reserved</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400 font-mono">
                {account.currency} {account.reservedBalance.toLocaleString()}
              </div>
            </div>

            <div className="bg-black/50 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Available</span>
              </div>
              <div className="text-3xl font-bold text-blue-400 font-mono">
                {account.currency} {account.availableBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Account Information
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Account ID</div>
                  <div className="font-mono text-sm text-white break-all">{account.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Currency</div>
                  <div className="font-mono font-bold text-white">{account.currency}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Account Type</div>
                  <div className="font-bold text-white">{accountTypeDisplay}</div>
                </div>
                {account.accountType === 'blockchain' && (
                  <>
                    <div>
                      <div className="text-sm text-gray-400">Blockchain</div>
                      <div className="font-bold text-white">{account.blockchainLink}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Token Symbol</div>
                      <div className="font-mono font-bold text-white">{account.tokenSymbol}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Contract Address</div>
                      <div className="font-mono text-xs text-white break-all">{account.contractAddress}</div>
                    </div>
                  </>
                )}
                {account.accountType === 'banking' && (
                  <>
                    <div>
                      <div className="text-sm text-gray-400">Bank Name</div>
                      <div className="font-bold text-white">{account.bankName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">IBAN</div>
                      <div className="font-mono text-sm text-white">{account.iban}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">SWIFT/BIC</div>
                      <div className="font-mono text-sm text-white">{account.swiftCode}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Security & Verification
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Verification Hash</div>
                  <div className="font-mono text-xs text-white break-all bg-black/50 p-2 rounded">
                    {account.verificationHash}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">API Status</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                    account.apiStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                    account.apiStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      account.apiStatus === 'active' ? 'bg-green-400' :
                      account.apiStatus === 'pending' ? 'bg-yellow-400' :
                      'bg-gray-400'
                    }`}></div>
                    {account.apiStatus.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">AML Score</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          account.amlScore >= 90 ? 'bg-green-500' :
                          account.amlScore >= 75 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${account.amlScore}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-white">{account.amlScore}/100</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Risk Level</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    account.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                    account.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {account.riskLevel.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-black/30 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Created</span>
              </div>
              <div className="text-sm text-white">{new Date(account.createdAt).toLocaleString()}</div>
            </div>
            <div className="bg-black/30 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Last Updated</span>
              </div>
              <div className="text-sm text-white">{new Date(account.lastUpdated).toLocaleString()}</div>
            </div>
            <div className="bg-black/30 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Last Audit</span>
              </div>
              <div className="text-sm text-white">{new Date(account.lastAudit).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Compliance Standards */}
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Compliance & Standards
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`bg-black/50 border rounded-lg p-4 ${
              account.iso27001Compliant ? 'border-green-500/50' : 'border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {account.iso27001Compliant ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-semibold text-white">ISO 27001:2022</span>
              </div>
              <p className="text-xs text-gray-400">Information Security Management</p>
            </div>

            <div className={`bg-black/50 border rounded-lg p-4 ${
              account.iso20022Compatible ? 'border-green-500/50' : 'border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {account.iso20022Compatible ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-semibold text-white">ISO 20022</span>
              </div>
              <p className="text-xs text-gray-400">Financial Interoperability</p>
            </div>

            <div className={`bg-black/50 border rounded-lg p-4 ${
              account.fatfAmlVerified ? 'border-green-500/50' : 'border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {account.fatfAmlVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-semibold text-white">FATF AML/CFT</span>
              </div>
              <p className="text-xs text-gray-400">Anti-Money Laundering</p>
            </div>

            <div className={`bg-black/50 border rounded-lg p-4 ${
              account.kycVerified ? 'border-green-500/50' : 'border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {account.kycVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-semibold text-white">KYC Verified</span>
              </div>
              <p className="text-xs text-gray-400">Know Your Customer</p>
            </div>
          </div>

          <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
            <h4 className="font-semibold text-white mb-3">Certification Statement</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              This document certifies that the funds mentioned above are reserved and under custody
              of the DAES (Data and Exchange Settlement) system for backing stablecoins and tokenized
              assets on blockchain. All operations comply with international standards including ISO 27001:2022
              for information security, ISO 20022 for financial messaging, and FATF guidelines for AML/CFT compliance.
            </p>
          </div>
        </div>

        {/* API Integration Status */}
        {(account.vusdBalanceEnabled || account.daesPledgeEnabled) && (
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-purple-400 mb-6">API Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {account.vusdBalanceEnabled && (
                <div className="bg-black/50 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-white">API VUSD</span>
                    </div>
                    <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                      ACTIVE
                    </div>
                  </div>
                  {account.vusdBalanceId && (
                    <div className="text-xs text-gray-400">
                      Balance ID: <span className="font-mono text-green-400">{account.vusdBalanceId}</span>
                    </div>
                  )}
                </div>
              )}

              {account.daesPledgeEnabled && (
                <div className="bg-black/50 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-400" />
                      <span className="font-semibold text-white">DAES Pledge/Escrow</span>
                    </div>
                    <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                      ACTIVE
                    </div>
                  </div>
                  {account.daesPledgeId && (
                    <div className="text-xs text-gray-400">
                      Pledge ID: <span className="font-mono text-blue-400">{account.daesPledgeId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-800">
          <p className="text-sm text-gray-500 mb-2">
            © {new Date().getFullYear()} DAES - Data and Exchange Settlement
          </p>
          <p className="text-xs text-gray-600">
            Generated: {new Date().toISOString()} | Verification Hash: {account.verificationHash.substring(0, 16)}...
          </p>
        </div>
      </div>
    </div>
  );
}
