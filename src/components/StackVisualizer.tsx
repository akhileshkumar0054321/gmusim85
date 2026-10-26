import React from 'react';
import { Layers } from 'lucide-react';

interface StackVisualizerProps {
  memory: Uint8Array;
  sp: number;
}

export const StackVisualizer: React.FC<StackVisualizerProps> = ({ memory, sp }) => {
  // We inspect stack starting from SP up towards 0xFFFF (stack grows downward, so addresses above SP hold pushed data)
  const maxStackItems = 16;
  const stackEntries: { address: number; value: number; isSP: boolean }[] = [];

  // Show a few below SP as well
  const startAddr = Math.max(0, sp - 2);
  const endAddr = Math.min(0xffff, sp + 28);

  for (let addr = endAddr; addr >= startAddr; addr--) {
    stackEntries.push({
      address: addr,
      value: memory[addr],
      isSP: addr === sp,
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs select-none p-3 overflow-y-auto">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px]">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold text-slate-300">8085 Stack Frame Visualizer</span>
        </div>
        <div className="text-slate-400">
          SP = <span className="text-purple-400 font-bold">{sp.toString(16).toUpperCase().padStart(4, '0')}H</span>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 mb-2 font-sans">
        Stack grows downwards in memory (from high addresses toward 0000H). Instructions like <code className="text-slate-200 font-mono">PUSH</code> and <code className="text-slate-200 font-mono">CALL</code> decrement SP.
      </div>

      <div className="max-w-md w-full mx-auto space-y-1">
        {stackEntries.map((item) => {
          const isAtSP = item.isSP;
          const isPushed = item.address >= sp;

          return (
            <div
              key={item.address}
              className={`flex items-center justify-between p-1.5 rounded border transition-colors ${
                isAtSP
                  ? 'bg-purple-950/60 border-purple-500 text-purple-200 font-bold shadow-xs'
                  : isPushed
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-950 border-slate-800/50 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] w-8">
                  {isAtSP ? '▶ SP' : ''}
                </span>
                <span className="text-slate-400 font-semibold">
                  {item.address.toString(16).toUpperCase().padStart(4, '0')}H
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500">
                  {isAtSP ? 'Top of Stack' : item.address > sp ? `SP + ${(item.address - sp)}` : 'Unused'}
                </span>
                <span className={`font-mono text-xs tabular-nums px-2 py-0.5 rounded ${
                  isAtSP ? 'bg-purple-900 text-purple-100 font-bold' : 'bg-slate-950 text-slate-200'
                }`}>
                  {item.value.toString(16).toUpperCase().padStart(2, '0')}H
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
