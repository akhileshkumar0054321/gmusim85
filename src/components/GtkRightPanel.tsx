import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Plus } from 'lucide-react';
import { HexInput, DecimalByteInput } from './HexInput';
import { INSTRUCTION_CATALOG } from '../emulator/opcodes';
import type { SymbolEntry } from '../types/8085';

interface GtkRightPanelProps {
  symbols: Record<string, SymbolEntry>;
  targetMemoryAddresses?: number[];
  recentWrites?: { address: number; value: number; pc: number }[];
  modifiedAddresses?: Set<number>;
  memory: Uint8Array;
  sp: number;
  ioPorts: Uint8Array;
  onWritePort: (port: number, val: number) => void;
  onWriteMemory: (addr: number, val: number) => void;
  assemblerMessages: { line: number; message: string; type?: 'info' | 'error' | 'success' }[];
  onInsertInstruction: (text: string) => void;
  focusedMemoryAddress?: number | null;
  memoryVersion?: number;
}
const hex = (value: number, digits = 4) => value.toString(16).toUpperCase().padStart(digits, '0');
const instructions = [...INSTRUCTION_CATALOG].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));
const tabs = [ ['data', 'Data'], ['stack', 'Stack'], ['keypad', 'KeyPad'], ['memory', 'Memory'], ['io', 'I/O Ports'] ] as const;
type Tab = typeof tabs[number][0];

/** Classic GNUSim inspector matching the supplied Data/Stack/KeyPad/I/O screenshots. */
export function GtkRightPanel({ symbols, targetMemoryAddresses = [], recentWrites = [], modifiedAddresses,
  memory, sp, ioPorts, onWritePort, onWriteMemory, assemblerMessages, onInsertInstruction,
  focusedMemoryAddress, memoryVersion = 0 }: GtkRightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const [memoryStart, setMemoryStart] = useState(0x2000);
  const [memoryInput, setMemoryInput] = useState('2000');
  const [portStart, setPortStart] = useState(0);
  const [portInput, setPortInput] = useState('00');
  const [watchInput, setWatchInput] = useState('');
  const [watches, setWatches] = useState<number[]>([]);
  const [selected, setSelected] = useState('MOV');
  const [operands, setOperands] = useState('A, B');
  const [addressError, setAddressError] = useState('');
  const [inspectorHeight, setInspectorHeight] = useState(64);

  useEffect(() => {
    if (focusedMemoryAddress !== null && focusedMemoryAddress !== undefined) {
      setMemoryStart(focusedMemoryAddress); setMemoryInput(hex(focusedMemoryAddress));
    }
  }, [focusedMemoryAddress]);

  const rows = useMemo(() => {
    const addresses = new Map<number, string>();
    for (const symbol of Object.values(symbols)) if (symbol.isData) addresses.set(symbol.address, symbol.name);
    for (const address of [...targetMemoryAddresses, ...watches, ...(modifiedAddresses ?? [])]) {
      if (!addresses.has(address)) addresses.set(address, '');
    }
    for (const write of recentWrites) if (!addresses.has(write.address)) addresses.set(write.address, '');
    return [...addresses.entries()].sort(([a], [b]) => a - b);
  }, [symbols, targetMemoryAddresses, watches, modifiedAddresses, recentWrites, memoryVersion]);

  const parseAddress = (text: string, maximum: number) => {
    const clean = text.trim().replace(/^0x/i, '').replace(/h$/i, '');
    if (!/^[0-9a-f]{1,4}$/i.test(clean) || parseInt(clean, 16) > maximum) {
      setAddressError(`Enter a hex address from 00 to ${hex(maximum, maximum > 255 ? 4 : 2)}.`);
      return null;
    }
    setAddressError(''); return parseInt(clean, 16);
  };
  const jump = () => {
    const isPort = activeTab === 'io';
    const value = parseAddress(isPort ? portInput : memoryInput, isPort ? 255 : 65535);
    if (value !== null) {
      if (isPort) { setPortStart(value); setPortInput(hex(value, 2)); }
      else { setMemoryStart(value); setMemoryInput(hex(value)); }
    }
  };
  const addWatch = () => {
    const address = parseAddress(watchInput, 65535);
    if (address !== null) { setWatches(previous => [...new Set([...previous, address])]); setWatchInput(''); }
  };

  return <aside className="classic-inspector" aria-label="Simulator inspector">
    <div className="classic-tabs" role="tablist" aria-label="Inspector tabs">
      {tabs.map(([id, label]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={activeTab === id}
        onClick={() => { setActiveTab(id); setAddressError(''); }} className={activeTab === id ? 'active' : ''}>
        {(id === 'data' || id === 'stack') && <Settings size={14} aria-hidden="true" />}
        {id === 'keypad' && <span className="classic-keypad-icon" aria-hidden="true">Abc</span>}{label}
      </button>)}
    </div>
    <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="classic-tab-content" style={{ flexBasis: `${inspectorHeight}%` }}>
      {(activeTab === 'memory' || activeTab === 'io') && <form className="classic-start" onSubmit={event => { event.preventDefault(); jump(); }}>
        <label htmlFor="inspector-start">Start</label><input id="inspector-start" aria-label={activeTab === 'io' ? 'I/O start address' : 'Memory start address'}
          value={activeTab === 'io' ? portInput : memoryInput}
          onChange={event => activeTab === 'io' ? setPortInput(event.target.value) : setMemoryInput(event.target.value)} /><button type="submit" className="gtk-btn">OK</button>
      </form>}
      {addressError && <p role="alert" className="classic-error">{addressError}</p>}

      {activeTab === 'data' && <>
        <div className="classic-table-scroll"><table className="classic-table" aria-label="Data values">
          <thead><tr><th>Address</th><th>Variable</th><th>Value</th><th>Value (Decimal)</th></tr></thead>
          <tbody>{rows.map(([address, name]) => <tr key={address} className={address === focusedMemoryAddress ? 'classic-written' : ''}>
            <td><button className="classic-address" onClick={() => { setMemoryStart(address); setMemoryInput(hex(address)); setActiveTab('memory'); }}>{hex(address)}h</button></td>
            <td>{name}</td><td><HexInput label={`Data ${hex(address)}h hex`} value={memory[address]} digits={2} onCommit={value => onWriteMemory(address, value)} /></td>
            <td><DecimalByteInput label={`Data ${hex(address)}h decimal`} value={memory[address]} onCommit={value => onWriteMemory(address, value)} /></td>
          </tr>)}</tbody>
        </table></div>
        <form className="classic-watch" onSubmit={event => { event.preventDefault(); addWatch(); }}>
          <input aria-label="Watch memory address" value={watchInput} placeholder="Watch address (hex)" onChange={event => setWatchInput(event.target.value)} />
          <button className="gtk-btn" type="submit" title="Watch memory address"><Plus size={13} /></button>
        </form>
      </>}

      {activeTab === 'stack' && <div className="classic-table-scroll"><table className="classic-table" aria-label="Stack values">
        <thead><tr><th>Stack Loc</th><th>Proc/Reg</th><th>Value</th><th>Value (Decimal)</th></tr></thead>
        <tbody>{sp < 0xffff && Array.from({ length: Math.min(64, 0xffff - sp) }, (_, index) => {
          const address = sp + index;
          return <tr key={address}><td>{hex(address)}h</td><td>{index === 0 ? 'SP' : ''}</td><td>{hex(memory[address], 2)}</td><td>{memory[address]}</td></tr>;
        })}</tbody>
      </table></div>}

      {activeTab === 'keypad' && <>
        <div className="classic-keypad" aria-label="Instruction keypad">
          {instructions.map(instruction => <button key={instruction.mnemonic} type="button" aria-pressed={selected === instruction.mnemonic}
            title={instruction.description} onClick={() => { setSelected(instruction.mnemonic); setOperands(instruction.example.replace(/^\S+\s*/, '')); }}
            onDoubleClick={() => onInsertInstruction(instruction.example)}>{instruction.mnemonic}</button>)}
        </div>
        <form className="classic-operands" onSubmit={event => { event.preventDefault(); onInsertInstruction(`${selected} ${operands}`.trim()); }}>
          <label htmlFor="instruction-operands">{selected}</label><input id="instruction-operands" aria-label="Instruction operands" value={operands} onChange={event => setOperands(event.target.value)} />
          <button className="gtk-btn" type="submit">Insert</button>
        </form>
      </>}

      {(activeTab === 'memory' || activeTab === 'io') && <>
        <div className="classic-table-scroll"><table className="classic-table" aria-label={activeTab === 'io' ? 'I/O port values' : 'Memory values'}>
          <thead><tr><th>Address (Hex)</th><th>Address</th><th>Data</th></tr></thead>
          <tbody>{Array.from({ length: activeTab === 'io' ? 256 - portStart : Math.min(256, 65536 - memoryStart) }, (_, index) => {
            const isPort = activeTab === 'io'; const address = (isPort ? portStart : memoryStart) + index;
            return <tr key={`${activeTab}-${address}`} className={!isPort && address === focusedMemoryAddress ? 'classic-written' : ''}>
              <td>{hex(address, isPort ? 2 : 4)}</td><td>{address}</td><td>
                <HexInput label={isPort ? `Port ${hex(address, 2)}H` : `Memory ${hex(address)}H hex`}
                  value={isPort ? ioPorts[address] : memory[address]} digits={2} onCommit={value => isPort ? onWritePort(address, value) : onWriteMemory(address, value)} />
              </td>
            </tr>;
          })}</tbody>
        </table></div>
        {activeTab === 'memory' && <div className="classic-paging"><button className="gtk-btn" onClick={() => { const start = Math.max(0, memoryStart - 256); setMemoryStart(start); setMemoryInput(hex(start)); }}>Previous</button>
          <span>{hex(memoryStart)}–{hex(Math.min(65535, memoryStart + 255))}H</span>
          <button className="gtk-btn" disabled={memoryStart >= 65535} onClick={() => { const start = Math.min(65535, memoryStart + 256); setMemoryStart(start); setMemoryInput(hex(start)); }}>Next</button></div>}
      </>}
    </div>
    <div className="classic-divider" title="Drag to resize inspector and console" role="separator" aria-label="Resize inspector and console" aria-orientation="horizontal"
      onPointerDown={event => {
        const parent = event.currentTarget.parentElement!; const bounds = parent.getBoundingClientRect();
        const move = (moveEvent: PointerEvent) => setInspectorHeight(Math.max(30, Math.min(85, ((moveEvent.clientY - bounds.top - 35) / bounds.height) * 100)));
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true });
      }} />
    <div className="classic-console"><div className="classic-table-scroll"><table className="classic-table" aria-label="Assembler messages">
      <thead><tr><th>Line No</th><th>Assembler Message</th></tr></thead>
      <tbody>{assemblerMessages.map((message, index) => <tr key={index} className={message.type === 'error' ? 'classic-error-row' : ''}>
        <td>{message.line}</td><td className="classic-message">{message.message}</td>
      </tr>)}</tbody>
    </table></div></div>
  </aside>;
}
