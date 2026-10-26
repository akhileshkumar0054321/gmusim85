import React, { useState } from 'react';
import { X, Search, BookOpen, Cpu, Info } from 'lucide-react';
import { INSTRUCTION_CATALOG } from '../emulator/opcodes';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'architecture' | 'interrupts'>('instructions');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredInstructions = INSTRUCTION_CATALOG.filter((ins) => {
    const q = searchQuery.toLowerCase();
    return (
      ins.mnemonic.toLowerCase().includes(q) ||
      ins.description.toLowerCase().includes(q) ||
      ins.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden text-slate-100 text-xs">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-200 text-sm">
              Intel 8085 Microprocessor Reference & Guide
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-4">
          {[
            { id: 'instructions', label: 'Instruction Set' },
            { id: 'architecture', label: 'CPU Architecture & Flags' },
            { id: 'interrupts', label: 'Interrupts & Memory Map' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'instructions' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search instruction, mnemonic, or behavior (e.g. MOV, ADD, JMP, Stack)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full font-mono text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 px-3 w-28">Mnemonic</th>
                      <th className="py-2 px-2 w-16">Bytes</th>
                      <th className="py-2 px-2 w-20">T-States</th>
                      <th className="py-2 px-3 w-32">Flags</th>
                      <th className="py-2 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstructions.map((ins) => (
                      <tr
                        key={ins.mnemonic}
                        className="hover:bg-slate-800/60 border-b border-slate-800/40 text-slate-300"
                      >
                        <td className="py-2 px-3 font-bold text-amber-300">
                          {ins.mnemonic} {ins.operands}
                        </td>
                        <td className="py-2 px-2 text-slate-400 tabular-nums">{ins.bytes}</td>
                        <td className="py-2 px-2 text-blue-400 tabular-nums">{ins.cycles}</td>
                        <td className="py-2 px-3 text-cyan-300 text-[11px]">{ins.flagsAffected}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{ins.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <h4 className="font-bold text-slate-200 text-sm mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  Intel 8085 Microprocessor Architecture
                </h4>
                <p className="text-slate-400 leading-relaxed mb-3">
                  The Intel 8085 is an 8-bit NMOS microprocessor with an internal 16-bit address bus capable of addressing 64 KB of memory (0000H to FFFFH). It operates on a single +5V power supply with a 3.072 MHz clock frequency (derived from a 6.144 MHz crystal divided by two).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div className="font-semibold text-blue-400 mb-1">Accumulator (A)</div>
                    <p className="text-slate-400 text-[11px]">
                      8-bit primary register that stores operands for arithmetic/logical operations and the results of ALU computations.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div className="font-semibold text-blue-400 mb-1">General Registers (B, C, D, E, H, L)</div>
                    <p className="text-slate-400 text-[11px]">
                      Six 8-bit registers that can be used independently or combined into 16-bit register pairs: BC, DE, and HL (where HL is commonly the Memory Data Pointer M).
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div className="font-semibold text-blue-400 mb-1">Program Counter (PC)</div>
                    <p className="text-slate-400 text-[11px]">
                      16-bit register that tracks the memory address of the next instruction to be fetched and executed.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div className="font-semibold text-blue-400 mb-1">Stack Pointer (SP)</div>
                    <p className="text-slate-400 text-[11px]">
                      16-bit pointer that stores the top address of the system stack in RAM, decremented on PUSH/CALL and incremented on POP/RET.
                    </p>
                  </div>
                </div>
              </div>

              {/* Flags explanation */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <h4 className="font-bold text-slate-200 text-sm mb-2">Flags Register (F) Layout</h4>
                <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="font-bold text-amber-400">S (Bit 7)</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">Sign: 1 if bit 7 is set (negative)</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="font-bold text-amber-400">Z (Bit 6)</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">Zero: 1 if ALU result is zero</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="font-bold text-amber-400">AC (Bit 4)</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">Aux Carry: carry from bit 3 to 4 (DAA)</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="font-bold text-amber-400">P (Bit 2)</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">Parity: 1 if number of 1-bits is even</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <div className="font-bold text-amber-400">CY (Bit 0)</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">Carry: 1 if arithmetic carry occurred</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interrupts' && (
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <h4 className="font-bold text-slate-200 text-sm mb-2">
                  8085 Hardware Interrupt Vectors
                </h4>
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 px-2">Interrupt</th>
                      <th className="py-2 px-2">Vector Address</th>
                      <th className="py-2 px-2">Priority</th>
                      <th className="py-2 px-2">Trigger Type</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800/40">
                      <td className="py-2 px-2 font-bold text-rose-400">TRAP</td>
                      <td className="py-2 px-2 text-cyan-400">0024H</td>
                      <td className="py-2 px-2">1 (Highest)</td>
                      <td className="py-2 px-2 text-slate-400 font-sans">Non-maskable (Edge & Level)</td>
                    </tr>
                    <tr className="border-b border-slate-800/40">
                      <td className="py-2 px-2 font-bold text-amber-400">RST 7.5</td>
                      <td className="py-2 px-2 text-cyan-400">003CH</td>
                      <td className="py-2 px-2">2</td>
                      <td className="py-2 px-2 text-slate-400 font-sans">Maskable (Rising Edge)</td>
                    </tr>
                    <tr className="border-b border-slate-800/40">
                      <td className="py-2 px-2 font-bold text-amber-400">RST 6.5</td>
                      <td className="py-2 px-2 text-cyan-400">0034H</td>
                      <td className="py-2 px-2">3</td>
                      <td className="py-2 px-2 text-slate-400 font-sans">Maskable (High Level)</td>
                    </tr>
                    <tr className="border-b border-slate-800/40">
                      <td className="py-2 px-2 font-bold text-amber-400">RST 5.5</td>
                      <td className="py-2 px-2 text-cyan-400">002CH</td>
                      <td className="py-2 px-2">4</td>
                      <td className="py-2 px-2 text-slate-400 font-sans">Maskable (High Level)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-bold text-blue-400">INTR</td>
                      <td className="py-2 px-2 text-cyan-400">External</td>
                      <td className="py-2 px-2">5 (Lowest)</td>
                      <td className="py-2 px-2 text-slate-400 font-sans">Maskable (High Level)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
