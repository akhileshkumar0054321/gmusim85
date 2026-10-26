import React, { useState } from 'react';
import { INSTRUCTION_CATALOG } from '../emulator/opcodes';
import { InstructionInfo } from '../types/8085';
import { Search, Plus, X, ChevronRight } from 'lucide-react';

interface KeypadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertInstruction: (instructionText: string) => void;
}

export const KeypadDrawer: React.FC<KeypadDrawerProps> = ({
  isOpen,
  onClose,
  onInsertInstruction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeInstruction, setActiveInstruction] = useState<InstructionInfo>(INSTRUCTION_CATALOG[0]);

  // Operand customizer states
  const [opReg1, setOpReg1] = useState<string>('A');
  const [opReg2, setOpReg2] = useState<string>('B');
  const [opPair, setOpPair] = useState<string>('H');
  const [opData, setOpData] = useState<string>('00H');
  const [opAddr, setOpAddr] = useState<string>('2000H');

  if (!isOpen) return null;

  const filtered = INSTRUCTION_CATALOG.filter((ins) => {
    const matchesCat = selectedCategory === 'all' || ins.category === selectedCategory;
    const matchesSearch =
      ins.mnemonic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ins.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const generateInstructionString = (info: InstructionInfo): string => {
    switch (info.mnemonic) {
      case 'MOV':
        return `MOV ${opReg1}, ${opReg2}`;
      case 'MVI':
        return `MVI ${opReg1}, ${opData}`;
      case 'LXI':
        return `LXI ${opPair}, ${opAddr}`;
      case 'LDA':
      case 'STA':
      case 'LHLD':
      case 'SHLD':
      case 'JMP':
      case 'JNZ':
      case 'JZ':
      case 'JNC':
      case 'JC':
      case 'JP':
      case 'JM':
      case 'CALL':
      case 'CNZ':
      case 'CZ':
        return `${info.mnemonic} ${opAddr}`;
      case 'ADD':
      case 'ADC':
      case 'SUB':
      case 'SBB':
      case 'ANA':
      case 'XRA':
      case 'ORA':
      case 'CMP':
      case 'INR':
      case 'DCR':
        return `${info.mnemonic} ${opReg1}`;
      case 'ADI':
      case 'ACI':
      case 'SUI':
      case 'SBI':
      case 'ANI':
      case 'XRI':
      case 'ORI':
      case 'CPI':
        return `${info.mnemonic} ${opData}`;
      case 'INX':
      case 'DCX':
      case 'DAD':
        return `${info.mnemonic} ${opPair}`;
      case 'PUSH':
      case 'POP':
        return `${info.mnemonic} ${opPair === 'SP' ? 'PSW' : opPair}`;
      case 'IN':
      case 'OUT':
        return `${info.mnemonic} ${opData}`;
      case 'LDAX':
      case 'STAX':
        return `${info.mnemonic} ${opPair === 'H' ? 'B' : opPair}`;
      default:
        return info.mnemonic;
    }
  };

  const handleInsert = () => {
    const text = generateInstructionString(activeInstruction);
    onInsertInstruction(`      ${text}`);
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-slate-100 select-none text-xs z-30 shadow-xl">
      {/* Keypad Header */}
      <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span>8085 Instruction Keypad</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          title="Close Keypad"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 p-2 bg-slate-950/50 border-b border-slate-800">
        {[
          { id: 'all', label: 'All' },
          { id: 'data_transfer', label: 'Data' },
          { id: 'arithmetic', label: 'Arith' },
          { id: 'logical', label: 'Logic' },
          { id: 'branch', label: 'Branch' },
          { id: 'stack_io', label: 'Stack/IO' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search instructions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Instruction List Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((ins) => {
            const isSelected = activeInstruction.mnemonic === ins.mnemonic;
            return (
              <button
                key={ins.mnemonic}
                onClick={() => setActiveInstruction(ins)}
                className={`py-1.5 px-2 rounded font-mono text-xs font-semibold border transition-all text-center ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                {ins.mnemonic}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Instruction Details & Wizard Inserter */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm text-blue-400">
            {activeInstruction.mnemonic}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>{activeInstruction.bytes} Byte{activeInstruction.bytes > 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{activeInstruction.cycles} T-States</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-300">
          {activeInstruction.description}
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          Flags: <span className="text-amber-400">{activeInstruction.flagsAffected}</span>
        </div>

        {/* Wizard Parameter Inputs */}
        <div className="bg-slate-900 border border-slate-800 rounded p-2 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
            Instruction Arguments
          </div>

          {/* If instruction accepts Reg 1 */}
          {['MOV', 'MVI', 'ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP', 'INR', 'DCR'].includes(
            activeInstruction.mnemonic
          ) && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Register:</span>
              <select
                value={opReg1}
                onChange={(e) => setOpReg1(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono"
              >
                {['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* If instruction accepts Reg 2 */}
          {['MOV'].includes(activeInstruction.mnemonic) && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Source:</span>
              <select
                value={opReg2}
                onChange={(e) => setOpReg2(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono"
              >
                {['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* If instruction accepts Reg Pair */}
          {['LXI', 'INX', 'DCX', 'DAD', 'PUSH', 'POP', 'LDAX', 'STAX'].includes(
            activeInstruction.mnemonic
          ) && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Reg Pair:</span>
              <select
                value={opPair}
                onChange={(e) => setOpPair(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono"
              >
                {['B', 'D', 'H', 'SP'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* If instruction accepts 8-bit Data */}
          {['MVI', 'ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI', 'IN', 'OUT'].includes(
            activeInstruction.mnemonic
          ) && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">8-bit Data:</span>
              <input
                type="text"
                value={opData}
                onChange={(e) => setOpData(e.target.value)}
                className="w-20 bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right"
              />
            </div>
          )}

          {/* If instruction accepts 16-bit Address */}
          {['LXI', 'LDA', 'STA', 'LHLD', 'SHLD', 'JMP', 'JNZ', 'JZ', 'JNC', 'JC', 'JP', 'JM', 'CALL', 'CNZ', 'CZ'].includes(
            activeInstruction.mnemonic
          ) && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">16-bit Target:</span>
              <input
                type="text"
                value={opAddr}
                onChange={(e) => setOpAddr(e.target.value)}
                className="w-24 bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right"
              />
            </div>
          )}
        </div>

        {/* Formatted Preview & Insert Button */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-xs text-emerald-400 font-semibold truncate max-w-[140px]">
            {generateInstructionString(activeInstruction)}
          </span>
          <button
            onClick={handleInsert}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
