import { useState, useCallback } from 'react';
import { Search, Download } from 'lucide-react';
import { CurrencyMatch } from '../lib/dtc1b-parser';

interface HexViewerProps {
  data: Uint8Array;
  highlights?: Array<{ start: number; end: number; color: string; label: string }>;
  matches?: CurrencyMatch[];
  onSelectOffset?: (offset: number) => void;
}

export function HexViewer({ data, highlights = [], matches = [], onSelectOffset }: HexViewerProps) {
  const [searchPattern, setSearchPattern] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);

  const bytesPerRow = 16;
  const totalRows = Math.ceil(data.length / bytesPerRow);

  const handleSearch = useCallback(() => {
    if (!searchPattern) {
      setSearchResults([]);
      return;
    }

    const results: number[] = [];
    const pattern = searchPattern.toUpperCase();
    const encoder = new TextEncoder();
    const patternBytes = encoder.encode(pattern);

    for (let i = 0; i <= data.length - patternBytes.length; i++) {
      let match = true;
      for (let j = 0; j < patternBytes.length; j++) {
        if (data[i + j] !== patternBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) results.push(i);
    }

    setSearchResults(results);
  }, [searchPattern, data]);

  const isHighlighted = (offset: number): { color: string; label: string } | null => {
    for (const h of highlights) {
      if (offset >= h.start && offset < h.end) {
        return { color: h.color, label: h.label };
      }
    }
    return null;
  };

  const isSearchResult = (offset: number): boolean => {
    return searchResults.includes(offset);
  };

  const handleOffsetClick = (offset: number) => {
    setSelectedOffset(offset);
    onSelectOffset?.(offset);
  };

  const exportAsJSON = () => {
    const exportData = {
      size: data.length,
      matches: matches.map(m => ({
        offset: m.offset,
        currency: m.currency,
        amount: m.amount?.toString(),
        confidence: m.confidence
      })),
      highlights,
      hexDump: Array.from(data).map((b, i) => ({
        offset: i,
        hex: b.toString(16).padStart(2, '0'),
        ascii: b >= 32 && b < 127 ? String.fromCharCode(b) : '.'
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hex-dump.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search pattern (e.g., USD, EUR)..."
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[var(--bg-hover)] px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>Size: {data.length} bytes</span>
          {searchResults.length > 0 && (
            <span className="text-white">| {searchResults.length} matches</span>
          )}
        </div>

        <button
          onClick={exportAsJSON}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] rounded text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-xs">
        <div className="space-y-1">
          {Array.from({ length: totalRows }).map((_, rowIndex) => {
            const offset = rowIndex * bytesPerRow;
            const rowBytes = data.slice(offset, offset + bytesPerRow);

            return (
              <div key={rowIndex} className="flex gap-4 hover:bg-[var(--bg-elevated)] px-2 py-1 rounded">
                <div className="text-[var(--text-muted)] w-20 flex-shrink-0 select-none">
                  {offset.toString(16).padStart(8, '0')}
                </div>

                <div className="flex gap-2 flex-1">
                  {Array.from({ length: bytesPerRow }).map((_, byteIndex) => {
                    const byteOffset = offset + byteIndex;
                    const byte = rowBytes[byteIndex];

                    if (byte === undefined) {
                      return <span key={byteIndex} className="w-6 text-center text-slate-700">··</span>;
                    }

                    const highlight = isHighlighted(byteOffset);
                    const isSearch = isSearchResult(byteOffset);
                    const isSelected = selectedOffset === byteOffset;

                    let className = 'w-6 text-center cursor-pointer transition-colors';

                    if (isSelected) {
                      className += ' bg-blue-600 text-white font-bold';
                    } else if (highlight) {
                      className += ` ${highlight.color} font-semibold`;
                    } else if (isSearch) {
                      className += ' bg-yellow-500 text-slate-900 font-bold';
                    } else {
                      className += ' hover:bg-[var(--bg-hover)]';
                    }

                    return (
                      <span
                        key={byteIndex}
                        className={className}
                        onClick={() => handleOffsetClick(byteOffset)}
                        title={highlight ? highlight.label : `Offset: 0x${byteOffset.toString(16)}`}
                      >
                        {byte.toString(16).padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-0 flex-shrink-0 text-[var(--text-secondary)]">
                  {Array.from({ length: bytesPerRow }).map((_, byteIndex) => {
                    const byte = rowBytes[byteIndex];
                    if (byte === undefined) return <span key={byteIndex}>·</span>;

                    const char = byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·';
                    return <span key={byteIndex}>{char}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
          <h3 className="text-sm font-semibold mb-2 text-[var(--text-secondary)]">Detected Currency Blocks</h3>
          <div className="space-y-1">
            {matches.map((match, idx) => (
              <div
                key={idx}
                onClick={() => handleOffsetClick(match.offset)}
                className="flex items-center justify-between text-xs p-2 bg-[var(--bg-hover)] rounded cursor-pointer hover:bg-[var(--bg-active)] transition-colors"
              >
                <span className="text-[var(--text-secondary)]">0x{match.offset.toString(16).padStart(8, '0')}</span>
                <span className="font-semibold text-white">{match.currency}</span>
                <span className="text-[var(--text-secondary)]">
                  {match.amount ? `${match.amount.toString()} units` : 'N/A'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  match.confidence === 'high' ? 'bg-white/10 text-black' :
                  match.confidence === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  {match.confidence}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
