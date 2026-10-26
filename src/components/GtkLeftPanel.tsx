import React, { useEffect, useState } from 'react';
import { AlignLeft, Lightbulb, RotateCw } from 'lucide-react';
import { HexInput } from './HexInput';
import type { CPUState, Flags, Register8 } from '../types/8085';

interface GtkLeftPanelProps {
  cpuState: CPUState;
  onUpdateReg: (reg: Register8, val: number) => void;
  onUpdatePC: (pc: number) => void;
  onUpdateSP: (sp: number) => void;
  onToggleFlag: (flag: keyof Flags) => void;
  onWritePort: (port: number, val: number) => void;
  readPort: (port: number) => number;
  onWriteMemory: (addr: number, val: number) => void;
  readMemory: (addr: number) => number;
  focusedMemoryAddress?: number | null;
  memoryVersion?: number;
}
const hex = (value: number, digits: number) => value.toString(16).toUpperCase().padStart(digits, '0');

/** A full 16-bit editor with the two byte columns of the original sidebar. */
function WordRegister({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  return <div className="sidebar-word-register">
    <span aria-hidden="true" className="sidebar-word-bytes"><span>{hex((value >> 8) & 255, 2)}</span><span>{hex(value & 255, 2)}</span></span>
    <HexInput label={label} value={value} digits={4} onCommit={onCommit} />
  </div>;
}

export function GtkLeftPanel({ cpuState, onUpdateReg, onUpdatePC, onUpdateSP, onToggleFlag,
  onWritePort, readPort, onWriteMemory, readMemory, focusedMemoryAddress, memoryVersion }: GtkLeftPanelProps) {
  const [decimal, setDecimal] = useState('0');
  const [hexadecimal, setHexadecimal] = useState('0');
  const [portAddress, setPortAddress] = useState('00');
  const [portValue, setPortValue] = useState('00');
  const [memoryAddress, setMemoryAddress] = useState('0000');
  const [memoryValue, setMemoryValue] = useState('00');
  const [error, setError] = useState('');
  const parseHex = (text: string, maximum: number) => {
    const clean = text.trim().replace(/^0x/i, '').replace(/h$/i, '');
    return /^[0-9a-f]+$/i.test(clean) && parseInt(clean, 16) <= maximum ? parseInt(clean, 16) : null;
  };
  const currentPort = parseHex(portAddress, 255);
  const currentAddress = parseHex(memoryAddress, 65535);

  useEffect(() => {
    if (focusedMemoryAddress !== undefined && focusedMemoryAddress !== null) setMemoryAddress(hex(focusedMemoryAddress, 4));
  }, [focusedMemoryAddress]);
  useEffect(() => {
    if (currentAddress !== null) setMemoryValue(hex(readMemory(currentAddress), 2));
  }, [currentAddress, memoryVersion, readMemory]);
  useEffect(() => {
    if (currentPort !== null) setPortValue(hex(readPort(currentPort), 2));
  }, [currentPort, memoryVersion, readPort]);

  const convert = (toHex: boolean) => {
    if (toHex) {
      const value = /^\d+$/.test(decimal.trim()) ? Number(decimal.trim()) : NaN;
      if (!Number.isSafeInteger(value) || value > 65535) { setError('Decimal value must be between 0 and 65535.'); return; }
      setHexadecimal(value.toString(16).toUpperCase());
    } else {
      const value = parseHex(hexadecimal, 65535);
      if (value === null) { setError('Hex value must be between 0000H and FFFFH.'); return; }
      setDecimal(String(value));
    }
    setError('');
  };
  const stepAddress = (memory: boolean, delta: number) => {
    const maximum = memory ? 65535 : 255;
    const value = Math.max(0, Math.min(maximum, ((memory ? currentAddress : currentPort) ?? 0) + delta));
    if (memory) setMemoryAddress(hex(value, 4)); else setPortAddress(hex(value, 2));
    setError('');
  };
  const update = (memory: boolean) => {
    const address = memory ? currentAddress : currentPort;
    const value = parseHex(memory ? memoryValue : portValue, 255);
    if (address === null || value === null) { setError('Use a valid hexadecimal address and a byte from 00H to FFH.'); return; }
    if (memory) onWriteMemory(address, value); else onWritePort(address, value);
    setError('');
  };
  const flagsByte = 2 | (cpuState.flags.sign ? 128 : 0) | (cpuState.flags.zero ? 64 : 0)
    | (cpuState.flags.auxCarry ? 16 : 0) | (cpuState.flags.parity ? 4 : 0) | (cpuState.flags.carry ? 1 : 0);
  const interruptByte = (cpuState.interruptsEnabled ? 8 : 0) | (cpuState.mask7_5 ? 4 : 0)
    | (cpuState.mask6_5 ? 2 : 0) | (cpuState.mask5_5 ? 1 : 0);
  const flags: [keyof Flags, string, string][] = [ ['sign', 'S', 'Sign'], ['zero', 'Z', 'Zero'],
    ['auxCarry', 'AC', 'Auxiliary carry'], ['parity', 'P', 'Parity'], ['carry', 'C', 'Carry'] ];

  return <aside className="classic-sidebar" aria-label="CPU sidebar">
    <div className="sidebar-registers-flags">
      <fieldset className="sidebar-registers"><legend>Registers</legend>
        <div className="sidebar-register-row"><span className="sidebar-register-name">A</span>
          <div className="sidebar-accumulator"><HexInput label="Register A" value={cpuState.A} digits={2} onCommit={value => onUpdateReg('A', value)} /></div>
        </div>
        {([['B', 'C'], ['D', 'E'], ['H', 'L']] as const).map(([high, low]) =>
          <div className="sidebar-register-row" key={high}><span className="sidebar-register-name">{high}{low}</span>
            <div className="sidebar-register-bytes">
              <HexInput label={`Register ${high}`} value={cpuState[high]} digits={2} onCommit={value => onUpdateReg(high, value)} />
              <HexInput label={`Register ${low}`} value={cpuState[low]} digits={2} onCommit={value => onUpdateReg(low, value)} />
            </div>
          </div>)}
        <div className="sidebar-register-row"><span className="sidebar-register-name">PSW</span>
          <div className="sidebar-register-bytes" aria-label="Processor status word"><span>{hex(cpuState.A, 2)}</span><span>{hex(flagsByte, 2)}</span></div>
        </div>
        <div className="sidebar-register-row"><span className="sidebar-register-name">PC</span><WordRegister label="Program counter" value={cpuState.PC} onCommit={onUpdatePC} /></div>
        <div className="sidebar-register-row"><span className="sidebar-register-name">SP</span><WordRegister label="Stack pointer" value={cpuState.SP} onCommit={onUpdateSP} /></div>
        <div className="sidebar-register-row"><span className="sidebar-register-name sidebar-interrupt-name">Int-Reg</span><span className="sidebar-interrupt-value" title="Interrupt enable and mask bits" aria-label="Interrupt register">{hex(interruptByte, 2)}</span></div>
      </fieldset>
      <fieldset className="sidebar-flags"><legend>Flag</legend>
        <div className="sidebar-flag-rows">{flags.map(([flag, short, label]) => <button key={flag} type="button" onClick={() => onToggleFlag(flag)}
          title={`Click to toggle ${label} flag`} aria-label={`${label} flag`} aria-pressed={cpuState.flags[flag]}>
          <span>{short}</span><span>{cpuState.flags[flag] ? '1' : '0'}</span>
        </button>)}</div>
      </fieldset>
    </div>

    <fieldset className="sidebar-converter"><legend><Lightbulb size={11} aria-hidden="true" />Decimal - Hex Conversion</legend>
      <div className="sidebar-converter-columns">
        <label>Decimal<input aria-label="Decimal conversion value" value={decimal} onChange={event => setDecimal(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') convert(true); }} /></label>
        <label>Hex<input aria-label="Hex conversion value" value={hexadecimal} onChange={event => setHexadecimal(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') convert(false); }} /></label>
      </div>
      <div className="sidebar-converter-buttons"><button type="button" className="gtk-btn" onClick={() => convert(true)}>⇨To Hex</button><button type="button" className="gtk-btn" onClick={() => convert(false)}>⇦To Dec</button></div>
    </fieldset>

    {[false, true].map(memory => <fieldset className="sidebar-value-group" key={String(memory)}><legend><AlignLeft size={11} aria-hidden="true" />{memory ? 'Memory' : 'I/O Ports'}</legend>
      <div className="sidebar-byte-controls">
        <div className="sidebar-address-stepper">
          <input aria-label={memory ? 'Memory address' : 'Port address'} title="Hexadecimal address" value={memory ? memoryAddress : portAddress}
            onChange={event => memory ? setMemoryAddress(event.target.value) : setPortAddress(event.target.value)} />
          <button type="button" aria-label={memory ? 'Previous Byte' : 'Previous Port'} title={memory ? 'Previous Byte' : 'Previous Port'} disabled={(memory ? currentAddress : currentPort) === 0} onClick={() => stepAddress(memory, -1)}>-</button>
          <button type="button" aria-label={memory ? 'Next Byte' : 'Next Port'} title={memory ? 'Next Byte' : 'Next Port'} disabled={(memory ? currentAddress : currentPort) === (memory ? 65535 : 255)} onClick={() => stepAddress(memory, 1)}>+</button>
        </div>
        <input aria-label={memory ? 'Memory value' : 'Port value'} title="Hexadecimal byte" value={memory ? memoryValue : portValue}
          onChange={event => memory ? setMemoryValue(event.target.value) : setPortValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') update(memory); }} />
      </div>
      <button type="button" className="gtk-btn sidebar-update" onClick={() => update(memory)}><RotateCw size={11} aria-hidden="true" />{memory ? 'Update Memory' : 'Update Port Value'}</button>
    </fieldset>)}
    {error && <p role="alert" className="sidebar-error">{error}</p>}
  </aside>;
}
