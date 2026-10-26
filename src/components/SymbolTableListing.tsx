import React from 'react';
import { SymbolEntry } from '../types/8085';
import { Tag, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SymbolTableListingProps {
  symbols: Record<string, SymbolEntry>;
  startAddress: number;
  programSize: number;
  warnings: string[];
  totalCycles: number;
  instructionsCount: number;
}

export const SymbolTableListing: React.FC<SymbolTableListingProps> = ({
  symbols,
  startAddress,
  programSize,
  warnings,
  totalCycles,
  instructionsCount,
}) => {
  const symbolList = Object.values(symbols);

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 text-slate-200 font-mono text-xs select-none p-3 gap-3 overflow-y-auto">
      {/* Symbols Table */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px]">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-400" />
            Symbol Table ({symbolList.length} Symbols)
          </span>
          <span className="text-slate-500 text-[10px]">Labels & Constants</span>
        </div>

        {symbolList.length === 0 ? (
          <div className="text-slate-500 italic py-6 text-center">
            No labels or EQU symbols defined in current assembly program.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                  <th className="py-1 px-2">Label Name</th>
                  <th className="py-1 px-2">Hex Address</th>
                  <th className="py-1 px-2">Decimal</th>
                  <th className="py-1 px-2">Line</th>
                </tr>
              </thead>
              <tbody>
                {symbolList.map((sym) => (
                  <tr key={sym.name} className="hover:bg-slate-850 border-b border-slate-800/40">
                    <td className="py-1 px-2 font-bold text-amber-300">{sym.name}</td>
                    <td className="py-1 px-2 text-cyan-400 font-mono">
                      {sym.address.toString(16).toUpperCase().padStart(4, '0')}H
                    </td>
                    <td className="py-1 px-2 text-slate-400 tabular-nums">{sym.address}</td>
                    <td className="py-1 px-2 text-slate-500 tabular-nums">{sym.definedLine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assembly & Execution Summary Stats */}
      <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
        <div className="pb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          Assembler Summary & Footprint
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Program Start:</span>
            <span className="font-bold text-emerald-400">
              {startAddress.toString(16).toUpperCase().padStart(4, '0')}H ({startAddress})
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Program Size:</span>
            <span className="font-bold text-blue-400">
              {programSize} bytes
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Memory Range:</span>
            <span className="font-mono text-[11px] text-slate-300">
              {startAddress.toString(16).toUpperCase().padStart(4, '0')}H –{' '}
              {Math.max(startAddress, startAddress + programSize - 1).toString(16).toUpperCase().padStart(4, '0')}H
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Total Clock Cycles:</span>
            <span className="font-bold text-amber-400">{totalCycles} T-states</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Instructions Executed:</span>
            <span className="font-bold text-slate-200">{instructionsCount}</span>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded p-2 text-amber-300 text-[11px]">
            <div className="font-semibold flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings ({warnings.length}):</span>
            </div>
            {warnings.map((w, idx) => (
              <div key={idx} className="text-amber-200/90 pl-2">· {w}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
