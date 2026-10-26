import React, { useState } from 'react';
import { Cpu, Terminal, ToggleLeft, ToggleRight, Radio } from 'lucide-react';

interface IOPortsPanelProps {
  ioPorts: Uint8Array;
  onWritePort: (port: number, val: number) => void;
  terminalOutput: string;
  onClearTerminal: () => void;
  onSendTerminalChar: (char: string) => void;
}

export const IOPortsPanel: React.FC<IOPortsPanelProps> = ({
  ioPorts,
  onWritePort,
  terminalOutput,
  onClearTerminal,
  onSendTerminalChar,
}) => {
  const [selectedPort, setSelectedPort] = useState<number>(0);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [terminalInput, setTerminalInput] = useState<string>('');

  const port0Val = ioPorts[0x00]; // Dipswitches
  const port1Val = ioPorts[0x01]; // 8-LED Bar
  const port2Val = ioPorts[0x02]; // 7-Segment Display
  const port3Val = ioPorts[0x03]; // Serial Terminal

  const toggleSwitchBit = (bitIndex: number) => {
    const current = port0Val;
    const updated = current ^ (1 << bitIndex);
    onWritePort(0x00, updated);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput) {
      for (const char of terminalInput) {
        onSendTerminalChar(char);
      }
      setTerminalInput('');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 text-slate-200 font-mono text-xs select-none">
      {/* Interactive Virtual Peripherals Section */}
      <div className="w-full md:w-3/5 p-3 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Simulated 8085 Hardware Peripherals
          </span>
          <span className="text-slate-500 text-[10px]">IN/OUT 00H-03H</span>
        </div>

        {/* Peripheral 1: 8-LED Bar (Port 01H) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-200 text-xs">
              Port 01H: 8-Bit LED Output Bar
            </span>
            <span className="font-mono text-blue-400 font-bold">
              {port1Val.toString(16).toUpperCase().padStart(2, '0')}H ({port1Val})
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
            {Array.from({ length: 8 }).map((_, i) => {
              const bitIndex = 7 - i; // D7 on left, D0 on right
              const isOn = (port1Val & (1 << bitIndex)) !== 0;

              return (
                <div key={bitIndex} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-5 h-5 rounded-full transition-all duration-150 flex items-center justify-center ${
                      isOn
                        ? 'bg-rose-500 shadow-md shadow-rose-500/80 ring-2 ring-rose-400/50'
                        : 'bg-slate-800/80 border border-slate-700'
                    }`}
                  >
                    {isOn && <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">D{bitIndex}</span>
                  <span className={`text-[10px] font-mono ${isOn ? 'text-rose-400 font-bold' : 'text-slate-600'}`}>
                    {isOn ? '1' : '0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peripheral 2: Dual 7-Segment Display (Port 02H) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-200 text-xs">
              Port 02H: Dual 7-Segment Hex Display
            </span>
            <span className="font-mono text-blue-400 font-bold">
              {port2Val.toString(16).toUpperCase().padStart(2, '0')}H
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 bg-slate-950 p-3 rounded border border-slate-800">
            {/* Hex Digit 1 (High Nibble) */}
            <div className="bg-slate-900/90 border border-amber-900/60 rounded px-4 py-2 font-mono text-3xl font-black text-amber-400 shadow-inner tracking-widest">
              {((port2Val >> 4) & 0x0f).toString(16).toUpperCase()}
            </div>

            {/* Hex Digit 2 (Low Nibble) */}
            <div className="bg-slate-900/90 border border-amber-900/60 rounded px-4 py-2 font-mono text-3xl font-black text-amber-400 shadow-inner tracking-widest">
              {(port2Val & 0x0f).toString(16).toUpperCase()}
            </div>

            <div className="text-[11px] text-slate-400 font-sans">
              <div>Decimal: <span className="text-slate-200 font-mono font-bold">{port2Val}</span></div>
              <div>Binary: <span className="text-cyan-400 font-mono">{port2Val.toString(2).padStart(8, '0')}</span></div>
            </div>
          </div>
        </div>

        {/* Peripheral 3: 8-Bit DIP Switch Bank (Port 00H) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-semibold text-slate-200 text-xs">
                Port 00H: 8-Bit DIP Switch Input Bank
              </span>
              <div className="text-[10px] text-slate-500 font-sans">
                Toggle switches below to feed data into <code className="font-mono text-slate-300">IN 00H</code>
              </div>
            </div>
            <span className="font-mono text-emerald-400 font-bold">
              {port0Val.toString(16).toUpperCase().padStart(2, '0')}H
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 bg-slate-950 p-2.5 rounded border border-slate-800">
            {Array.from({ length: 8 }).map((_, i) => {
              const bitIndex = 7 - i;
              const isOn = (port0Val & (1 << bitIndex)) !== 0;

              return (
                <button
                  key={bitIndex}
                  onClick={() => toggleSwitchBit(bitIndex)}
                  className={`flex flex-col items-center gap-1.5 p-1.5 rounded transition-colors ${
                    isOn ? 'bg-emerald-950/50 border border-emerald-600/40' : 'hover:bg-slate-850'
                  }`}
                  title={`Toggle Switch Bit ${bitIndex}`}
                >
                  <span className="text-[10px] text-slate-400 font-mono">SW{bitIndex}</span>
                  <div
                    className={`w-4 h-8 rounded-xs border flex flex-col justify-between p-0.5 transition-colors ${
                      isOn ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-slate-600'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 bg-white rounded-xs shadow-xs transition-transform ${
                        isOn ? 'translate-y-0' : 'translate-y-3.5'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-mono ${isOn ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    {isOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Peripheral 4: ASCII Serial Console / Teletype (Port 03H) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Port 03H: Virtual Teletype Terminal
            </span>
            <button
              onClick={onClearTerminal}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded p-2 h-20 overflow-y-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap select-text">
            {terminalOutput || <span className="text-slate-600 italic">No console output yet. Write ASCII chars to OUT 03H.</span>}
          </div>

          <form onSubmit={handleTerminalSubmit} className="flex gap-2 mt-2">
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Type character to send to IN 03H..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* 256 Ports Raw Table View */}
      <div className="w-full md:w-2/5 p-3 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] mb-2">
          <span className="font-semibold text-slate-300">All 256 I/O Ports (00H - FFH)</span>
          <span className="text-slate-500 text-[10px]">Click to edit port</span>
        </div>

        <div className="flex-1 overflow-y-auto border border-slate-800 rounded bg-slate-950">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px] text-left sticky top-0 bg-slate-900">
                <th className="py-1 px-2">Port (Hex)</th>
                <th className="py-1 px-2">Dec</th>
                <th className="py-1 px-2">Hex Val</th>
                <th className="py-1 px-2">Binary</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 256 }).map((_, p) => {
                const val = ioPorts[p];
                const isSelected = selectedPort === p;

                return (
                  <tr
                    key={p}
                    onClick={() => setSelectedPort(p)}
                    className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                      val > 0 ? 'bg-blue-950/20 text-blue-200' : 'text-slate-400'
                    } ${isSelected ? 'bg-slate-800' : ''}`}
                  >
                    <td className="py-1 px-2 text-slate-300 font-bold">
                      {p.toString(16).toUpperCase().padStart(2, '0')}H
                    </td>
                    <td className="py-1 px-2 text-slate-500 tabular-nums">{p}</td>
                    <td className="py-1 px-2 text-amber-300 font-bold">
                      {val.toString(16).toUpperCase().padStart(2, '0')}H
                    </td>
                    <td className="py-1 px-2 text-slate-400 text-[11px]">
                      {val.toString(2).padStart(8, '0')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
