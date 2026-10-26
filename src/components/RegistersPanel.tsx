import React, { useState } from 'react';
import { CPUState, Flags, Register8 } from '../types/8085';
import { Hash, Binary, Edit3 } from 'lucide-react';

interface RegistersPanelProps {
  cpuState: CPUState;
  memoryByteAtHL: number;
  onUpdateReg: (reg: Register8, val: number) => void;
  onUpdatePC: (pc: number) => void;
  onUpdateSP: (sp: number) => void;
  onToggleFlag: (flagName: keyof Flags) => void;
}

export const RegistersPanel: React.FC<RegistersPanelProps> = ({
  cpuState,
  memoryByteAtHL,
  onUpdateReg,
  onUpdatePC,
  onUpdateSP,
  onToggleFlag,
}) => {
  const [displayBase, setDisplayBase] = useState<'hex' | 'dec' | 'bin'>('hex');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const format8 = (val: number): string => {
    val &= 0xff;
    if (displayBase === 'dec') return val.toString(10);
    if (displayBase === 'bin') return val.toString(2).padStart(8, '0');
    return val.toString(16).toUpperCase().padStart(2, '0') + 'H';
  };

  const format16 = (val: number): string => {
    val &= 0xffff;
    if (displayBase === 'dec') return val.toString(10);
    if (displayBase === 'bin') return val.toString(2).padStart(16, '0');
    return val.toString(16).toUpperCase().padStart(4, '0') + 'H';
  };

  const startEdit = (field: string, currentVal: number) => {
    setEditingField(field);
    setEditValue(currentVal.toString(16).toUpperCase());
  };

  const submitEdit = (field: string) => {
    const parsed = parseInt(editValue.replace(/h$/i, ''), 16);
    if (!isNaN(parsed)) {
      if (field === 'PC') onUpdatePC(parsed & 0xffff);
      else if (field === 'SP') onUpdateSP(parsed & 0xffff);
      else onUpdateReg(field as Register8, parsed & 0xff);
    }
    setEditingField(null);
  };

  const hlAddr = ((cpuState.H << 8) | cpuState.L) & 0xffff;

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-slate-100 select-none text-xs overflow-y-auto">
      {/* Registers Header */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <span className="font-semibold text-slate-200">8085 CPU Registers</span>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded text-[10px]">
          <button
            onClick={() => setDisplayBase('hex')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              displayBase === 'hex' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hex
          </button>
          <button
            onClick={() => setDisplayBase('dec')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              displayBase === 'dec' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dec
          </button>
          <button
            onClick={() => setDisplayBase('bin')}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              displayBase === 'bin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bin
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Accumulator Spotlight Card */}
        <div className="bg-slate-950 border border-blue-900/40 rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide">
              Accumulator (A)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">8-bit Primary Register</span>
          </div>

          <div className="flex items-center justify-between">
            {editingField === 'A' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => submitEdit('A')}
                onKeyDown={(e) => e.key === 'Enter' && submitEdit('A')}
                autoFocus
                className="w-24 bg-slate-800 border border-blue-500 text-white font-mono text-base px-2 py-0.5 rounded outline-none"
              />
            ) : (
              <div
                onClick={() => startEdit('A', cpuState.A)}
                className="group flex items-baseline gap-2 cursor-pointer"
                title="Click to edit value"
              >
                <span className="font-mono text-xl font-bold text-slate-100 tracking-tight group-hover:text-blue-400 transition-colors">
                  {format8(cpuState.A)}
                </span>
                <Edit3 className="w-3 h-3 text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            <div className="text-right font-mono text-[11px] text-slate-400">
              <div>Dec: <span className="text-slate-200">{cpuState.A}</span></div>
              <div>Bin: <span className="text-cyan-400">{cpuState.A.toString(2).padStart(8, '0')}</span></div>
            </div>
          </div>
        </div>

        {/* General Purpose Registers Grid (B, C, D, E, H, L) */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>General Purpose Registers</span>
            <span className="text-[10px] text-slate-500">Pairs: BC, DE, HL</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'B', val: cpuState.B },
              { name: 'C', val: cpuState.C },
              { name: 'D', val: cpuState.D },
              { name: 'E', val: cpuState.E },
              { name: 'H', val: cpuState.H },
              { name: 'L', val: cpuState.L },
            ].map(({ name, val }) => (
              <div
                key={name}
                onClick={() => startEdit(name, val)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-2 rounded cursor-pointer transition-colors flex items-center justify-between group"
                title={`Click to edit register ${name}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-300 font-mono w-4">{name}</span>
                </div>

                {editingField === name ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => submitEdit(name)}
                    onKeyDown={(e) => e.key === 'Enter' && submitEdit(name)}
                    autoFocus
                    className="w-16 bg-slate-800 border border-blue-500 text-white font-mono text-xs px-1 py-0.5 rounded outline-none"
                  />
                ) : (
                  <span className="font-mono text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                    {format8(val)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Memory Pointer M Card */}
        <div className="bg-slate-950 border border-amber-900/40 rounded p-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <span>M [HL Pointer]</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Addr: {hlAddr.toString(16).toUpperCase().padStart(4, '0')}H
            </div>
          </div>
          <div className="font-mono font-bold text-amber-300 text-sm">
            {format8(memoryByteAtHL)}
          </div>
        </div>

        {/* Program Counter & Stack Pointer (16-bit) */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
            Pointers & Control
          </div>
          <div className="space-y-1.5">
            {/* PC */}
            <div
              onClick={() => startEdit('PC', cpuState.PC)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-2 rounded cursor-pointer transition-colors flex items-center justify-between group"
              title="Click to edit Program Counter"
            >
              <div>
                <span className="font-bold text-slate-300 font-mono">PC</span>
                <span className="text-[10px] text-slate-500 ml-1.5">Program Counter</span>
              </div>
              {editingField === 'PC' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => submitEdit('PC')}
                  onKeyDown={(e) => e.key === 'Enter' && submitEdit('PC')}
                  autoFocus
                  className="w-20 bg-slate-800 border border-blue-500 text-white font-mono text-xs px-1.5 py-0.5 rounded outline-none"
                />
              ) : (
                <span className="font-mono text-xs font-bold text-emerald-400 group-hover:underline">
                  {format16(cpuState.PC)}
                </span>
              )}
            </div>

            {/* SP */}
            <div
              onClick={() => startEdit('SP', cpuState.SP)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-2 rounded cursor-pointer transition-colors flex items-center justify-between group"
              title="Click to edit Stack Pointer"
            >
              <div>
                <span className="font-bold text-slate-300 font-mono">SP</span>
                <span className="text-[10px] text-slate-500 ml-1.5">Stack Pointer</span>
              </div>
              {editingField === 'SP' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => submitEdit('SP')}
                  onKeyDown={(e) => e.key === 'Enter' && submitEdit('SP')}
                  autoFocus
                  className="w-20 bg-slate-800 border border-blue-500 text-white font-mono text-xs px-1.5 py-0.5 rounded outline-none"
                />
              ) : (
                <span className="font-mono text-xs font-bold text-purple-400 group-hover:underline">
                  {format16(cpuState.SP)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Flags Register (S, Z, AC, P, CY) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Flags Register (F)</span>
            <span className="text-[10px] text-slate-500 font-mono">Click to toggle</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-center font-mono">
            {[
              { key: 'sign' as keyof Flags, label: 'S', desc: 'Sign' },
              { key: 'zero' as keyof Flags, label: 'Z', desc: 'Zero' },
              { key: 'auxCarry' as keyof Flags, label: 'AC', desc: 'Aux Carry' },
              { key: 'parity' as keyof Flags, label: 'P', desc: 'Parity' },
              { key: 'carry' as keyof Flags, label: 'CY', desc: 'Carry' },
            ].map(({ key, label, desc }) => {
              const isActive = cpuState.flags[key];
              return (
                <button
                  key={key}
                  onClick={() => onToggleFlag(key)}
                  className={`p-1.5 rounded border transition-colors flex flex-col items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                  title={`${desc} flag: ${isActive ? '1 (Set)' : '0 (Reset)'}`}
                >
                  <span className="font-bold text-xs">{label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {isActive ? '1' : '0'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Execution Metrics */}
        <div className="bg-slate-950/60 border border-slate-800 rounded p-2.5 space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span>Clock Cycles:</span>
            <span className="text-slate-200 tabular-nums font-semibold">{cpuState.cycles}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Instructions:</span>
            <span className="text-slate-200 tabular-nums font-semibold">{cpuState.instructionsCount}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Interrupts (IE):</span>
            <span className={cpuState.interruptsEnabled ? 'text-emerald-400' : 'text-slate-500'}>
              {cpuState.interruptsEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
