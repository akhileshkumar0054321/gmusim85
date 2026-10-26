import React, { useState } from 'react';
import { Search, RotateCcw, ArrowRight } from 'lucide-react';

interface MemoryInspectorProps {
  memory: Uint8Array;
  modifiedAddresses: Set<number>;
  pc: number;
  sp: number;
  hl: number;
  onWriteByte: (addr: number, val: number) => void;
  onClearMemory: () => void;
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({
  memory,
  modifiedAddresses,
  pc,
  sp,
  hl,
  onWriteByte,
  onClearMemory,
}) => {
  const [baseAddress, setBaseAddress] = useState<number>(0x2000);
  const [jumpInput, setJumpInput] = useState<string>('2000H');
  const [editingAddr, setEditingAddr] = useState<number | null>(null);
  const [editVal, setEditVal] = useState<string>('');

  const numRows = 16; // 16 rows * 16 bytes = 256 bytes visible at once
  const bytesPerRow = 16;

  const handleJump = () => {
    let clean = jumpInput.trim().toUpperCase();
    if (clean === 'PC') {
      setBaseAddress(pc & ~0x0f);
      return;
    }
    if (clean === 'SP') {
      setBaseAddress(sp & ~0x0f);
      return;
    }
    if (clean === 'HL' || clean === 'M') {
      setBaseAddress(hl & ~0x0f);
      return;
    }
    if (clean.endsWith('H')) clean = clean.slice(0, -1);
    const parsed = parseInt(clean, 16);
    if (!isNaN(parsed)) {
      setBaseAddress(Math.max(0, Math.min(0xff00, parsed & ~0x0f)));
    }
  };

  const handlePrevPage = () => {
    setBaseAddress((prev) => Math.max(0, prev - 256));
  };

  const handleNextPage = () => {
    setBaseAddress((prev) => Math.min(0xff00, prev + 256));
  };

  const startEdit = (addr: number) => {
    setEditingAddr(addr);
    setEditVal(memory[addr].toString(16).toUpperCase().padStart(2, '0'));
  };

  const submitEdit = (addr: number) => {
    const val = parseInt(editVal.replace(/h$/i, ''), 16);
    if (!isNaN(val)) {
      onWriteByte(addr, val & 0xff);
    }
    setEditingAddr(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs select-none">
      {/* Navigation & Jump Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Jump to Address:</span>
          <div className="flex items-center">
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              placeholder="e.g. 2000H, PC, SP"
              className="w-24 bg-slate-950 border border-slate-700 text-slate-100 px-2 py-0.5 rounded-l text-xs outline-none focus:border-blue-500 uppercase font-mono"
            />
            <button
              onClick={handleJump}
              className="bg-slate-800 hover:bg-slate-700 border border-l-0 border-slate-700 px-2 py-0.5 rounded-r text-slate-300 hover:text-white"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Quick jump pills */}
          <div className="flex items-center gap-1 ml-2">
            {[
              { label: '0800H', addr: 0x0800 },
              { label: '2000H', addr: 0x2000 },
              { label: '2050H', addr: 0x2050 },
              { label: 'PC', addr: pc & ~0x0f },
              { label: 'SP', addr: sp & ~0x0f },
              { label: 'M (HL)', addr: hl & ~0x0f },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  setBaseAddress(q.addr);
                  setJumpInput(q.label);
                }}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-[10px]"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-cyan-400" />
              <span className="text-slate-400">PC</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-purple-400" />
              <span className="text-slate-400">SP</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-400" />
              <span className="text-slate-400">Modified</span>
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handlePrevPage}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
            >
              ▲ -256B
            </button>
            <button
              onClick={handleNextPage}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
            >
              ▼ +256B
            </button>
          </div>
        </div>
      </div>

      {/* Hex Dump Grid */}
      <div className="flex-1 overflow-auto p-2">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800 text-left text-[11px]">
              <th className="py-1 px-2 w-16 text-slate-400">Offset</th>
              {Array.from({ length: 16 }).map((_, i) => (
                <th key={i} className="py-1 px-1.5 text-center text-slate-400 w-7">
                  +{i.toString(16).toUpperCase()}
                </th>
              ))}
              <th className="py-1 px-3 text-left text-slate-400">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRows }).map((_, rowIdx) => {
              const rowAddr = baseAddress + rowIdx * bytesPerRow;
              if (rowAddr > 0xffff) return null;

              const rowBytes: number[] = [];
              let asciiStr = '';

              for (let col = 0; col < bytesPerRow; col++) {
                const a = rowAddr + col;
                if (a <= 0xffff) {
                  const b = memory[a];
                  rowBytes.push(b);
                  // Printable ascii
                  asciiStr += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
                }
              }

              return (
                <tr key={rowAddr} className="hover:bg-slate-900/50">
                  {/* Address column */}
                  <td className="py-0.5 px-2 text-slate-400 font-semibold">
                    {rowAddr.toString(16).toUpperCase().padStart(4, '0')}H
                  </td>

                  {/* 16 Hex Bytes */}
                  {rowBytes.map((byteVal, colIdx) => {
                    const currentAddr = rowAddr + colIdx;
                    const isPC = currentAddr === pc;
                    const isSP = currentAddr === sp;
                    const isHL = currentAddr === hl;
                    const isMod = modifiedAddresses.has(currentAddr);
                    const isEditing = editingAddr === currentAddr;

                    let bgClass = 'hover:bg-slate-800';
                    let textClass = isMod ? 'text-amber-300 font-semibold' : 'text-slate-300';

                    if (isPC) {
                      bgClass = 'bg-cyan-900/60 ring-1 ring-cyan-400';
                      textClass = 'text-cyan-200 font-bold';
                    } else if (isSP) {
                      bgClass = 'bg-purple-900/60 ring-1 ring-purple-400';
                      textClass = 'text-purple-200 font-bold';
                    } else if (isHL) {
                      bgClass = 'bg-emerald-950/60 ring-1 ring-emerald-500';
                    }

                    return (
                      <td
                        key={colIdx}
                        onClick={() => startEdit(currentAddr)}
                        className={`py-0.5 px-1 text-center cursor-pointer rounded-xs transition-colors ${bgClass}`}
                        title={`Address: ${currentAddr.toString(16).toUpperCase().padStart(4, '0')}H (${currentAddr})\nValue: ${byteVal.toString(16).toUpperCase().padStart(2, '0')}H (${byteVal})\nClick to edit`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={() => submitEdit(currentAddr)}
                            onKeyDown={(e) => e.key === 'Enter' && submitEdit(currentAddr)}
                            autoFocus
                            className="w-6 bg-blue-600 text-white font-mono text-xs text-center outline-none rounded"
                          />
                        ) : (
                          <span className={`${textClass} tabular-nums block`}>
                            {byteVal.toString(16).toUpperCase().padStart(2, '0')}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* ASCII Representation */}
                  <td className="py-0.5 px-3 text-slate-400 font-mono tracking-widest text-[11px]">
                    {asciiStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
