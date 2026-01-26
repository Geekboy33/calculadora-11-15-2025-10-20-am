import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle, Copy, ExternalLink,
  Loader2, RefreshCw, Eye, Lock, Unlock, Coins, Building2, FileText,
  Hash, Activity, Zap, Globe, Key, Users, Database, Send, Download,
  ChevronDown, ChevronRight, Check, X, Wallet, Link2, ArrowRight,
  Sparkles, Award, TrendingUp, BarChart3, PieChart, Layers
} from 'lucide-react';
import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MintAuthorizationRequest {
  id: string;
  requestCode: string;
  certificationNumber: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'minted';
  
  // Source of Funds
  sourceOfFunds: {
    accountId: string;
    accountName: string;
    accountType: 'blockchain' | 'banking';
    bankName: string;
    bankId: string;
    currency: string;
    originalBalance: number;
    reservedAmount: number;
  };
  
  // Minting Details
  mintDetails: {
    requestedAmount: number;
    approvedAmount?: number;
    tokenSymbol: string;
    beneficiaryAddress: string;
    vaultAddress: string;
    lockId: string;
  };
  
  // Digital Signatures
  signatures: {
    role: string;
    signerAddress: string;
    signerName: string;
    timestamp: string;
    signatureHash: string;
    status: 'pending' | 'signed' | 'rejected';
  }[];
  
  // Blockchain Data
  blockchain: {
    network: string;
    chainId: number;
    custodyTxHash?: string;
    lockTxHash?: string;
    mintTxHash?: string;
    blockNumber?: number;
    gasUsed?: string;
  };
  
  // Authorization Code (generated on approval)
  authorizationCode?: string;
  approvedAt?: string;
  approvedBy?: string;
  
  // Minting Reference (used when minting)
  mintingReference?: string;
  mintedAt?: string;
  
  // Metadata
  metadata: {
    isoMessageId?: string;
    uetr?: string;
    reference?: string;
    purpose?: string;
    notes?: string;
  };
}

interface LEMXAuthorizationDashboardProps {
  isEmbedded?: boolean;
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

const generateAuthorizationCode = (): string => {
  const prefix = 'LEMX';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const checksum = ((parseInt(timestamp, 36) + parseInt(random, 36)) % 9999).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}-${checksum}`;
};

const generateRequestCode = (): string => {
  return `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════════
const STORAGE_KEY_REQUESTS = 'lemx_mint_authorization_requests';
const STORAGE_KEY_PENDING_LOCKS = 'lemx_pending_locks';
const STORAGE_KEY_MINT_REQUESTS = 'lemx_mint_requests';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert Lock to MintAuthorizationRequest
// ═══════════════════════════════════════════════════════════════════════════════
interface PendingLock {
  id: string;
  lockId: string;
  authorizationCode?: string;
  timestamp: string;
  lockDetails: {
    amount: string;
    currency: string;
    beneficiary: string;
    custodyVault: string;
    expiry: string;
  };
  bankInfo: {
    bankId: string;
    bankName: string;
    signerAddress: string;
  };
  sourceOfFunds: {
    accountId: string;
    accountName: string;
    accountType: 'blockchain' | 'banking';
    originalBalance: string;
  };
  signatures: {
    role: string;
    address: string;
    hash: string;
    timestamp: string;
  }[];
  blockchain: {
    txHash?: string;
    blockNumber?: number;
    chainId: number;
    network: string;
  };
  isoData?: {
    messageId?: string;
    uetr?: string;
    isoHash?: string;
  };
  certificationNumber?: string;
  dcbTreasuryRef?: string;
  status?: string;
}

function convertLockToRequest(lock: PendingLock): MintAuthorizationRequest {
  return {
    id: lock.id,
    requestCode: `REQ-${lock.lockId}`,
    certificationNumber: lock.certificationNumber || `CERT-${lock.lockId}`,
    createdAt: lock.timestamp,
    expiresAt: lock.lockDetails.expiry,
    status: lock.authorizationCode ? 'approved' : 'pending',
    sourceOfFunds: {
      accountId: lock.sourceOfFunds.accountId,
      accountName: lock.sourceOfFunds.accountName,
      accountType: lock.sourceOfFunds.accountType,
      bankName: lock.bankInfo.bankName,
      bankId: lock.bankInfo.bankId,
      currency: lock.lockDetails.currency,
      originalBalance: parseFloat(lock.sourceOfFunds.originalBalance),
      reservedAmount: parseFloat(lock.lockDetails.amount)
    },
    mintDetails: {
      requestedAmount: parseFloat(lock.lockDetails.amount),
      approvedAmount: lock.authorizationCode ? parseFloat(lock.lockDetails.amount) : undefined,
      tokenSymbol: 'VUSD',
      beneficiaryAddress: lock.lockDetails.beneficiary,
      vaultAddress: lock.lockDetails.custodyVault,
      lockId: lock.lockId
    },
    signatures: lock.signatures.map(sig => ({
      role: sig.role,
      signerAddress: sig.address,
      signerName: sig.role,
      timestamp: sig.timestamp,
      signatureHash: sig.hash,
      status: 'signed' as const
    })),
    blockchain: {
      network: lock.blockchain.network,
      chainId: lock.blockchain.chainId,
      lockTxHash: lock.blockchain.txHash,
      blockNumber: lock.blockchain.blockNumber
    },
    authorizationCode: lock.authorizationCode,
    approvedAt: lock.authorizationCode ? new Date().toISOString() : undefined,
    metadata: {
      isoMessageId: lock.isoData?.messageId,
      uetr: lock.isoData?.uetr,
      reference: lock.dcbTreasuryRef
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LEMXAuthorizationDashboard({ isEmbedded = false, onClose }: LEMXAuthorizationDashboardProps) {
  // State
  const [requests, setRequests] = useState<MintAuthorizationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MintAuthorizationRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [pendingLocksCount, setPendingLocksCount] = useState(0);

  // Load requests from storage AND from pending locks
  useEffect(() => {
    const loadData = () => {
      // Load existing requests
      const savedRequests = localStorage.getItem(STORAGE_KEY_REQUESTS);
      let existingRequests: MintAuthorizationRequest[] = [];
      if (savedRequests) {
        try {
          existingRequests = JSON.parse(savedRequests);
        } catch (e) {
          console.error('Failed to load requests:', e);
        }
      }

      // Load pending locks from DCB Treasury
      const pendingLocksJson = localStorage.getItem(STORAGE_KEY_PENDING_LOCKS);
      if (pendingLocksJson) {
        try {
          const pendingLocks: PendingLock[] = JSON.parse(pendingLocksJson);
          console.log('📦 Found pending locks:', pendingLocks.length);
          setPendingLocksCount(pendingLocks.length);
          
          // Convert locks to requests and merge
          pendingLocks.forEach(lock => {
            const existingRequest = existingRequests.find(r => r.mintDetails.lockId === lock.lockId);
            if (!existingRequest) {
              const newRequest = convertLockToRequest(lock);
              existingRequests.push(newRequest);
              console.log('✅ Added new request from lock:', lock.lockId);
            }
          });
        } catch (e) {
          console.error('Failed to load pending locks:', e);
        }
      }

      setRequests(existingRequests);
    };

    loadData();

    // Poll for new locks every 3 seconds
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Save requests to storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
  }, [requests]);

  // Filter requests by status
  const filteredRequests = requests.filter(req => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return req.status === 'pending';
    if (activeTab === 'approved') return req.status === 'approved' || req.status === 'minted';
    if (activeTab === 'rejected') return req.status === 'rejected' || req.status === 'expired';
    return true;
  });

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved' || r.status === 'minted').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalAmount: requests.filter(r => r.status === 'approved' || r.status === 'minted')
      .reduce((sum, r) => sum + (r.mintDetails.approvedAmount || r.mintDetails.requestedAmount), 0)
  };

  // Approve request
  const approveRequest = async (request: MintAuthorizationRequest) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500)); // Simulate processing
      
      const authCode = generateAuthorizationCode();
      const updatedRequest: MintAuthorizationRequest = {
        ...request,
        status: 'approved',
        authorizationCode: authCode,
        approvedAt: new Date().toISOString(),
        approvedBy: 'LEMX_OPERATOR',
        mintDetails: {
          ...request.mintDetails,
          approvedAmount: request.mintDetails.requestedAmount
        },
        signatures: request.signatures.map(sig => ({
          ...sig,
          status: 'signed' as const,
          timestamp: new Date().toISOString()
        }))
      };

      setRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));
      setSelectedRequest(updatedRequest);
      setShowApprovalModal(false);
      
      // Auto-generate PDF
      generateApprovalPDF(updatedRequest);
      
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reject request
  const rejectRequest = async (request: MintAuthorizationRequest, reason: string) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      
      const updatedRequest: MintAuthorizationRequest = {
        ...request,
        status: 'rejected',
        metadata: {
          ...request.metadata,
          notes: reason
        }
      };

      setRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));
      setSelectedRequest(null);
      setShowRejectModal(false);
      setRejectReason('');
      
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Generate Approval PDF
  const generateApprovalPDF = (request: MintAuthorizationRequest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Premium colors
    const primaryDark = [10, 25, 47] as [number, number, number];
    const accentGold = [212, 175, 55] as [number, number, number];
    const accentCyan = [0, 212, 255] as [number, number, number];
    const successGreen = [16, 185, 129] as [number, number, number];
    
    // === HEADER WITH GRADIENT EFFECT ===
    doc.setFillColor(...primaryDark);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Gold accent line
    doc.setFillColor(...accentGold);
    doc.rect(0, 45, pageWidth, 2, 'F');
    
    // Blockchain pattern (decorative)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    for (let i = 0; i < 10; i++) {
      doc.line(pageWidth - 60 + i * 6, 5, pageWidth - 60 + i * 6, 40);
      doc.line(pageWidth - 60, 5 + i * 4, pageWidth - 5, 5 + i * 4);
    }
    
    // Logo area
    doc.setFillColor(...accentCyan);
    doc.circle(25, 22, 12, 'F');
    doc.setFillColor(...primaryDark);
    doc.circle(25, 22, 9, 'F');
    doc.setTextColor(...accentCyan);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMX', 25, 24, { align: 'center' });
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LEMONCHAIN', 45, 18);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Mint Authorization Certificate', 45, 26);
    
    // Status badge
    doc.setFillColor(...successGreen);
    doc.roundedRect(pageWidth - 50, 12, 40, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('APPROVED', pageWidth - 30, 20, { align: 'center' });
    doc.setFontSize(6);
    doc.text('AUTHORIZED', pageWidth - 30, 26, { align: 'center' });
    
    let yPos = 58;
    
    // === AUTHORIZATION CODE SECTION ===
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
    doc.setDrawColor(...accentGold);
    doc.setLineWidth(1);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'S');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('AUTHORIZATION CODE', pageWidth / 2, yPos + 8, { align: 'center' });
    
    doc.setTextColor(...primaryDark);
    doc.setFontSize(18);
    doc.setFont('courier', 'bold');
    doc.text(request.authorizationCode || 'N/A', pageWidth / 2, yPos + 22, { align: 'center' });
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Use this code as reference for minting VUSD tokens`, pageWidth / 2, yPos + 30, { align: 'center' });
    
    yPos += 45;
    
    // === MINTING DETAILS ===
    doc.setTextColor(...primaryDark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MINTING AUTHORIZATION DETAILS', 15, yPos);
    
    yPos += 3;
    doc.setDrawColor(...accentGold);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 100, yPos);
    
    yPos += 10;
    
    // Details grid
    const addDetailRow = (label: string, value: string, x: number, y: number) => {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x, y);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x, y + 5);
    };
    
    // Left column
    addDetailRow('Certification Number', request.certificationNumber, 15, yPos);
    addDetailRow('Request Code', request.requestCode, 15, yPos + 15);
    addDetailRow('Approved Amount', `${request.mintDetails.approvedAmount?.toLocaleString() || request.mintDetails.requestedAmount.toLocaleString()} VUSD`, 15, yPos + 30);
    addDetailRow('Beneficiary', request.mintDetails.beneficiaryAddress.slice(0, 20) + '...', 15, yPos + 45);
    
    // Right column
    addDetailRow('Network', `${request.blockchain.network} (ID: ${request.blockchain.chainId})`, 110, yPos);
    addDetailRow('Approved Date', new Date(request.approvedAt || '').toLocaleString(), 110, yPos + 15);
    addDetailRow('Vault Address', request.mintDetails.vaultAddress.slice(0, 20) + '...', 110, yPos + 30);
    addDetailRow('Lock ID', request.mintDetails.lockId.slice(0, 20) + '...', 110, yPos + 45);
    
    yPos += 65;
    
    // === SOURCE OF FUNDS ===
    doc.setFillColor(...primaryDark);
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SOURCE OF FUNDS VERIFICATION', 20, yPos + 8);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank: ${request.sourceOfFunds.bankName}`, 20, yPos + 16);
    doc.text(`Account: ${request.sourceOfFunds.accountName}`, 20, yPos + 22);
    doc.text(`Reserved: ${request.sourceOfFunds.currency} ${request.sourceOfFunds.reservedAmount.toLocaleString()}`, 110, yPos + 16);
    doc.text(`Original Balance: ${request.sourceOfFunds.currency} ${request.sourceOfFunds.originalBalance.toLocaleString()}`, 110, yPos + 22);
    
    yPos += 40;
    
    // === DIGITAL SIGNATURES ===
    doc.setTextColor(...primaryDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DIGITAL SIGNATURES', 15, yPos);
    
    yPos += 8;
    
    const sigWidth = (pageWidth - 40) / 3;
    request.signatures.forEach((sig, index) => {
      const sigX = 15 + (index * (sigWidth + 5));
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(sigX, yPos, sigWidth, 28, 2, 2, 'F');
      
      // Checkmark
      doc.setFillColor(...successGreen);
      doc.circle(sigX + sigWidth - 6, yPos + 6, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('✓', sigX + sigWidth - 6, yPos + 8, { align: 'center' });
      
      doc.setTextColor(...accentCyan);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(sig.role, sigX + 5, yPos + 8);
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(sig.signerName, sigX + 5, yPos + 14);
      doc.text(sig.signerAddress.slice(0, 18) + '...', sigX + 5, yPos + 19);
      doc.text(new Date(sig.timestamp).toLocaleString(), sigX + 5, yPos + 24);
    });
    
    yPos += 38;
    
    // === BLOCKCHAIN TRANSACTION ===
    if (request.blockchain.custodyTxHash) {
      doc.setFillColor(...accentCyan);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('BLOCKCHAIN TRANSACTION HASH', 20, yPos + 8);
      
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.text(request.blockchain.custodyTxHash, 20, yPos + 16);
      
      if (request.blockchain.blockNumber) {
        doc.text(`Block: ${request.blockchain.blockNumber.toLocaleString()}`, pageWidth - 60, yPos + 16);
      }
    }
    
    // === FOOTER ===
    doc.setFillColor(...primaryDark);
    doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    doc.setFillColor(...accentGold);
    doc.rect(0, pageHeight - 25, pageWidth, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LemonChain • Digital Asset Exchange Settlement', 15, pageHeight - 15);
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('This is an electronically generated authorization certificate.', 15, pageHeight - 10);
    doc.text(`Generated: ${new Date().toISOString()}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    
    // Save
    doc.save(`LEMX-Authorization-${request.authorizationCode}.pdf`);
  };

  // Format address
  const formatAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'N/A';

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'minted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className={`${isEmbedded ? '' : 'min-h-screen'} bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white`}>
      {/* Animated background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  LEMX Authorization Dashboard
                </h1>
                <p className="text-sm text-slate-400">
                  LemonChain • Mint Authorization Control Center
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Network Badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-cyan-400">LemonChain (1006)</span>
              </div>

              {/* Refresh */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-slate-400" />
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="relative z-10 border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-slate-400">Total Requests</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-800/50 border border-yellow-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                  <p className="text-xs text-slate-400">Pending</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-800/50 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
                  <p className="text-xs text-slate-400">Approved</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-800/50 border border-red-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
                  <p className="text-xs text-slate-400">Rejected</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Coins className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400">{stats.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">VUSD Approved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && stats.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500 text-black">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Requests Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRequests.length === 0 ? (
            <div className="col-span-2 text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-500 text-lg">No authorization requests found</p>
              <p className="text-slate-600 text-sm mt-2">
                Requests from DCB Treasury will appear here for approval
              </p>
            </div>
          ) : (
            filteredRequests.map(request => (
              <div
                key={request.id}
                className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-xl ${
                  selectedRequest?.id === request.id
                    ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => setSelectedRequest(request)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      request.status === 'pending' ? 'bg-yellow-500/20' :
                      request.status === 'approved' ? 'bg-emerald-500/20' :
                      request.status === 'minted' ? 'bg-purple-500/20' :
                      'bg-red-500/20'
                    }`}>
                      {request.status === 'pending' ? <Clock className="w-5 h-5 text-yellow-400" /> :
                       request.status === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                       request.status === 'minted' ? <Coins className="w-5 h-5 text-purple-400" /> :
                       <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{request.certificationNumber}</p>
                      <p className="text-xs text-slate-400">{request.requestCode}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>

                {/* Amount */}
                <div className="mb-4 p-3 rounded-xl bg-slate-900/50">
                  <p className="text-xs text-slate-500 mb-1">Requested Amount</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {request.mintDetails.requestedAmount.toLocaleString()} <span className="text-sm text-slate-400">VUSD</span>
                  </p>
                </div>

                {/* Source */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Bank</p>
                    <p className="text-white font-medium truncate">{request.sourceOfFunds.bankName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Account</p>
                    <p className="text-white font-medium truncate">{request.sourceOfFunds.accountName}</p>
                  </div>
                </div>

                {/* Signatures Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500">Signatures</span>
                    <span className="text-slate-400">
                      {request.signatures.filter(s => s.status === 'signed').length} / {request.signatures.length}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {request.signatures.map((sig, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${
                          sig.status === 'signed' ? 'bg-emerald-500' :
                          sig.status === 'rejected' ? 'bg-red-500' :
                          'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Authorization Code (if approved) */}
                {request.authorizationCode && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-xs text-emerald-400 mb-1">Authorization Code</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-white">{request.authorizationCode}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(request.authorizationCode!, 'auth');
                        }}
                        className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                      >
                        {copiedCode === 'auth' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(request);
                        setShowApprovalModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {/* Download PDF for approved */}
                {request.status === 'approved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateApprovalPDF(request);
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Authorization PDF
                  </button>
                )}

                {/* Timestamp */}
                <p className="text-xs text-slate-600 mt-4 text-right">
                  {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-emerald-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Approve Mint Request</h3>
                  <p className="text-sm text-slate-400">{selectedRequest.certificationNumber}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50">
                <p className="text-sm text-slate-400 mb-2">Amount to Approve</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {selectedRequest.mintDetails.requestedAmount.toLocaleString()} VUSD
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Source Bank</p>
                  <p className="font-medium">{selectedRequest.sourceOfFunds.bankName}</p>
                </div>
                <div>
                  <p className="text-slate-500">Beneficiary</p>
                  <p className="font-mono text-xs">{formatAddress(selectedRequest.mintDetails.beneficiaryAddress)}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">Confirmation Required</p>
                    <p className="text-sm text-slate-400 mt-1">
                      By approving, you authorize the minting of {selectedRequest.mintDetails.requestedAmount.toLocaleString()} VUSD tokens.
                      An authorization code will be generated for reference.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => approveRequest(selectedRequest)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Approve & Generate Code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-red-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/20">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Reject Mint Request</h3>
                  <p className="text-sm text-slate-400">{selectedRequest.certificationNumber}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-red-500 resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectRequest(selectedRequest, rejectReason)}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    Reject Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LEMXAuthorizationDashboard;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TO CREATE MINT REQUEST FROM DCB TREASURY
// ═══════════════════════════════════════════════════════════════════════════════

export function createMintAuthorizationRequest(
  certification: {
    certificationNumber: string;
    amount: number;
    currency: string;
    sourceAccount: {
      id: string;
      name: string;
      type: 'blockchain' | 'banking';
      currency: string;
      balanceBefore: number;
      balanceAfter: number;
    };
    vaultAddress?: string;
    lockId?: string;
    lemxTxHash?: string;
    lemxBlockNumber?: number;
    signatures: {
      role: string;
      address: string;
      timestamp: string;
      signatureHash: string;
    }[];
    bank: {
      id: string;
      name: string;
      signer: string;
    };
    metadata: {
      isoMessageId?: string;
      uetr?: string;
      reference?: string;
      beneficiary?: string;
      purpose?: string;
    };
    operatorWallet: string;
  }
): MintAuthorizationRequest {
  const requestCode = generateRequestCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    requestCode,
    certificationNumber: certification.certificationNumber,
    createdAt: new Date().toISOString(),
    expiresAt,
    status: 'pending',
    
    sourceOfFunds: {
      accountId: certification.sourceAccount.id,
      accountName: certification.sourceAccount.name,
      accountType: certification.sourceAccount.type,
      bankName: certification.bank.name,
      bankId: certification.bank.id,
      currency: certification.currency,
      originalBalance: certification.sourceAccount.balanceBefore,
      reservedAmount: certification.amount
    },
    
    mintDetails: {
      requestedAmount: certification.amount,
      tokenSymbol: 'VUSD',
      beneficiaryAddress: certification.operatorWallet,
      vaultAddress: certification.vaultAddress || '',
      lockId: certification.lockId || ''
    },
    
    signatures: certification.signatures.map(sig => ({
      role: sig.role,
      signerAddress: sig.address,
      signerName: sig.role.replace('_', ' '),
      timestamp: sig.timestamp,
      signatureHash: sig.signatureHash,
      status: 'signed' as const
    })),
    
    blockchain: {
      network: 'LemonChain',
      chainId: 1006,
      custodyTxHash: certification.lemxTxHash,
      blockNumber: certification.lemxBlockNumber
    },
    
    metadata: certification.metadata
  };
}
