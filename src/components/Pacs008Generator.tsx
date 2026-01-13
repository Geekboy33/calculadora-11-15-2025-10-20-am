/**
 * ISO 20022 pacs.008 Generator - UI Component
 * 
 * Panel completo para generar, validar y descargar mensajes pacs.008
 * En conformidad con ISO 20022 y requisitos de UAT
 */

import { useState } from 'react';
import {
  Download,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  RefreshCw,
  Code,
  Terminal,
  Hash,
  Zap,
  Clock,
  Info
} from 'lucide-react';
import {
  generatePacs008XML,
  validatePacs008XML,
  downloadXML,
  copyXMLToClipboard,
  extractPacs008Info,
  generateTransactionMetadata,
  type Pacs008Params
} from '../lib/iso20022-pacs008-generator';

export function Pacs008Generator() {
  // Estado del formulario
  const [params, setParams] = useState<Pacs008Params>({
    messageId: `DAES-MSG-${Date.now()}`,
    creditorBIC: 'DEUTDEDD',
    debtorBIC: 'DIGCGB2L',
    amount: 100000.04,
    currency: 'USD',
    creditorName: 'Deutsche Bank AG',
    debtorName: 'DAES CoreBanking Ltd',
    creditorIBAN: 'DE89370400440532013000',
    debtorIBAN: 'GB82WEST12345698765432',
    settlementMethod: 'CLRG',
    chargeBearer: 'SHAR',
    description: 'Test payment - ISO 20022 pacs.008 validation'
  });

  // Estado del XML generado
  const [generatedXML, setGeneratedXML] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [xmlInfo, setXmlInfo] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [showXML, setShowXML] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generar XML
  const handleGenerateXML = () => {
    setIsLoading(true);
    try {
      const xml = generatePacs008XML(params);
      setGeneratedXML(xml);
      
      // Validar
      const validationResult = validatePacs008XML(xml);
      setValidation(validationResult);
      
      // Extraer información
      const info = extractPacs008Info(xml);
      setXmlInfo(info);
      
      // Generar metadata
      const meta = generateTransactionMetadata(xml);
      setMetadata(meta);
      
      setShowXML(false);
    } catch (error) {
      console.error('Error generating XML:', error);
      setValidation({ valid: false, errors: ['Error generating XML'] });
    } finally {
      setIsLoading(false);
    }
  };

  // Descargar XML
  const handleDownload = () => {
    if (generatedXML) {
      downloadXML(generatedXML, `pacs.008_test_case_${Date.now()}.xml`);
    }
  };

  // Copiar XML
  const handleCopyXML = async () => {
    if (generatedXML) {
      try {
        await copyXMLToClipboard(generatedXML);
        setCopiedText('xml');
        setTimeout(() => setCopiedText(null), 2000);
      } catch (error) {
        console.error('Error copying:', error);
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl border border-blue-500/30">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <FileCode className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">pacs.008 Message Generator</h3>
              <p className="text-sm text-slate-300">
                Generate real ISO 20022 FIToFICstmrCdtTrf (Credit Transfer) messages for UAT testing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="p-6 bg-[#1a1a2e] rounded-2xl border border-slate-700">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Transaction Parameters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              value={params.amount}
              onChange={(e) => setParams({ ...params, amount: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              placeholder="100000.04"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Currency</label>
            <input
              type="text"
              maxLength={3}
              value={params.currency}
              onChange={(e) => setParams({ ...params, currency: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              placeholder="USD"
            />
          </div>

          {/* Debtor BIC */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Debtor BIC (Sender)</label>
            <input
              type="text"
              value={params.debtorBIC}
              onChange={(e) => setParams({ ...params, debtorBIC: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              placeholder="DIGCGB2L"
            />
          </div>

          {/* Creditor BIC */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Creditor BIC (Receiver)</label>
            <input
              type="text"
              value={params.creditorBIC}
              onChange={(e) => setParams({ ...params, creditorBIC: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              placeholder="DEUTDEDD"
            />
          </div>

          {/* Settlement Method */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Settlement Method</label>
            <select
              value={params.settlementMethod}
              onChange={(e) => setParams({ ...params, settlementMethod: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
            >
              <option value="CLRG">CLRG - Clearing</option>
              <option value="INDA">INDA - Instructing Agent</option>
              <option value="INGA">INGA - Instructing Agent</option>
              <option value="COVE">COVE - Cover</option>
            </select>
          </div>

          {/* Charge Bearer */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Charge Bearer</label>
            <select
              value={params.chargeBearer}
              onChange={(e) => setParams({ ...params, chargeBearer: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
            >
              <option value="SLEV">SLEV - ServiceLevel</option>
              <option value="SHAR">SHAR - Shared</option>
              <option value="CRED">CRED - Creditor</option>
              <option value="DEBT">DEBT - Debtor</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateXML}
          disabled={isLoading}
          className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {isLoading ? 'Generating...' : 'Generate pacs.008 Message'}
        </button>
      </div>

      {/* Generated XML Section */}
      {generatedXML && (
        <>
          {/* Validation Results */}
          {validation && (
            <div className={`p-6 rounded-2xl border ${
              validation.valid 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-4">
                {validation.valid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h4 className={`font-bold mb-2 ${
                    validation.valid ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {validation.valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                  </h4>
                  {validation.errors.length > 0 && (
                    <div className="space-y-1">
                      {validation.errors.map((error, i) => (
                        <p key={i} className={`text-sm ${
                          validation.valid ? 'text-emerald-300' : 'text-red-300'
                        }`}>
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Info */}
          {xmlInfo && (
            <div className="p-6 bg-[#1a1a2e] rounded-2xl border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Extracted Transaction Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Message ID</div>
                  <div className="font-mono text-sm text-cyan-400 break-all">{xmlInfo.messageId}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">UETR (UUID)</div>
                  <div className="font-mono text-sm text-cyan-400 break-all">{xmlInfo.uetr}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Amount & Currency</div>
                  <div className="font-mono text-sm text-emerald-400">{xmlInfo.amount} {xmlInfo.currency}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Created At</div>
                  <div className="font-mono text-sm text-yellow-400">{new Date(xmlInfo.createdAt).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Debtor</div>
                  <div className="text-sm text-white">{xmlInfo.debtor}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Creditor</div>
                  <div className="text-sm text-white">{xmlInfo.creditor}</div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="p-6 bg-[#1a1a2e] rounded-2xl border border-slate-700">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Export Metadata
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Filename</div>
                  <div className="text-sm text-white font-mono">{metadata.filename}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Encoding</div>
                  <div className="text-sm text-green-400 font-mono">{metadata.encoding}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">File Size</div>
                  <div className="text-sm text-white font-mono">{(metadata.size / 1024).toFixed(2)} KB</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Checksum</div>
                  <div className="text-sm text-yellow-400 font-mono">{metadata.checksum}</div>
                </div>
              </div>
            </div>
          )}

          {/* XML Display Toggle */}
          <button
            onClick={() => setShowXML(!showXML)}
            className="w-full py-3 px-4 bg-slate-900 border border-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {showXML ? (
              <>
                <Eye className="w-4 h-4" />
                Hide Raw XML
              </>
            ) : (
              <>
                <Code className="w-4 h-4" />
                Show Raw XML
              </>
            )}
          </button>

          {/* Raw XML Display */}
          {showXML && (
            <div className="p-6 bg-[#1a1a2e] rounded-2xl border border-slate-700 overflow-x-auto">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                {generatedXML}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleDownload}
              className="py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-500 hover:to-green-600 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download XML
            </button>
            <button
              onClick={handleCopyXML}
              className="py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copiedText === 'xml' ? 'Copied!' : 'Copy XML'}
            </button>
            <button
              onClick={handleGenerateXML}
              className="py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate New
            </button>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300">
              ✅ The generated XML is a real ISO 20022 pacs.008 message ready for UAT testing. 
              Download the file (pacs.008_test_case_*.xml) and share it with the integration team. 
              The UETR (UUID) is unique for each generation.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default Pacs008Generator;
