/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProgramFiles } from './components/useProgramFiles';
import { AIAssistant } from './components/AIAssistant';
import { GtkMenubar } from './components/GtkMenubar';
import { GtkLeftPanel } from './components/GtkLeftPanel';
import { GtkEditor } from './components/GtkEditor';
import { GtkRightPanel } from './components/GtkRightPanel';
import { BaseConverterModal } from './components/BaseConverterModal';
import { ReferenceModal } from './components/ReferenceModal';
import { Simulator } from './emulator/simulator';
import { SampleProgram } from './data/samplePrograms';
import { AssemblyResult, Register8 } from './types/8085';

const DEFAULT_GNUSIM_CODE = `; Add two 8-bit numbers and store the answer at 2052H
; You can edit the input bytes at 2050H and 2051H after assembling.
        LDA 2050H
        MOV B, A
        LDA 2051H
        ADD B
        STA 2052H
        HLT

        ORG 2050H
INPUT1: DB 23H
INPUT2: DB 46H
RESULT: DS 1
`;

interface ConsoleMessage {
  line: number;
  message: string;
  type?: 'info' | 'error' | 'success';
}

export default function App() {
  const [simulator] = useState(() => new Simulator());
  const cpu = simulator.cpu;
  const [memoryVersion, setMemoryVersion] = useState(0);
  const [code, setCode] = useState(DEFAULT_GNUSIM_CODE);
  const [loadAddress, setLoadAddress] = useState('');
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [assemblyResult, setAssemblyResult] = useState<AssemblyResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('Simulator: Ready');
  const [assemblerMessages, setAssemblerMessages] = useState<ConsoleMessage[]>([]);
  const [showOpcodeView, setShowOpcodeView] = useState(false);
  const [showBaseConverter, setShowBaseConverter] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [focusedMemoryAddress, setFocusedMemoryAddress] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runGeneration = useRef(0);
  const breakpointsRef = useRef(breakpoints);
  useEffect(() => { breakpointsRef.current = breakpoints; }, [breakpoints]);
  const isHalted = assemblyResult?.success ? cpu.isHalted : false;
  const currentLineNumber = simulator.currentLine;

  const syncCPUState = useCallback(() => setMemoryVersion(n => n + 1), []);
  const addConsoleMessage = useCallback((line: number, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAssemblerMessages(prev => [...prev.slice(-499), { line, message, type }]);
  }, []);

  const stopExecution = useCallback(() => {
    runGeneration.current++;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    simulator.cancelRun();
    setIsRunning(false);
  }, [simulator]);

  const publishAssembly = useCallback((res: AssemblyResult) => {
    setAssemblyResult(res);
    setFocusedMemoryAddress(null);
    setAssemblerMessages(res.success ? [
      { line: 0, message: 'Program assembled successfully', type: 'success' },
      { line: 0, message: `Loaded ${res.programSize} bytes. Entry: ${res.startAddress.toString(16).toUpperCase()}H.`, type: 'info' },
    ] : res.errors.map(err => ({ line: err.line, message: err.message, type: 'error' })));
    setStatusText(res.success ? 'Simulator: Ready to execute' : 'Simulator: Assembly errors detected');
    syncCPUState();
  }, [syncCPUState]);

  const handleAssemble = useCallback(() => {
    stopExecution();
    const res = simulator.assemble(code, loadAddress);
    publishAssembly(res);
    return res.success;
  }, [code, loadAddress, simulator, stopExecution, publishAssembly]);

  const ensureProgram = useCallback(() => {
    const previous = simulator.assembly;
    const res = simulator.ensureAssembled(code, loadAddress);
    if (res !== previous || assemblyResult !== res) publishAssembly(res);
    return res.success;
  }, [code, loadAddress, simulator, publishAssembly, assemblyResult]);

  const publishCPU = useCallback((writesBefore: number) => {
    if (cpu.memoryWriteCount > writesBefore) {
      const write = cpu.recentWrites[cpu.recentWrites.length - 1];
      setFocusedMemoryAddress(write.address);
      addConsoleMessage(simulator.currentLine ?? 0,
        `Memory [${write.address.toString(16).toUpperCase().padStart(4, '0')}H] = ${write.value.toString(16).toUpperCase().padStart(2, '0')}H (${write.value} decimal)`, 'success');
    }
    syncCPUState();
  }, [cpu, simulator, addConsoleMessage, syncCPUState]);

  const handleStepIn = useCallback(() => {
    stopExecution();
    if (!ensureProgram()) return;
    const before = cpu.memoryWriteCount;
    simulator.step();
    publishCPU(before);
    setStatusText(cpu.isHalted ? 'Simulator: Program halted (HLT)' : 'Simulator: Paused after one instruction');
  }, [stopExecution, ensureProgram, cpu, simulator, publishCPU]);

  const startExecution = useCallback((stepOver = false) => {
    stopExecution();
    if (!ensureProgram()) return;
    if (cpu.isHalted) {
      setStatusText('Simulator: Program halted. Reset to execute again.');
      return;
    }
    simulator.beginRun(stepOver);
    if (stepOver && !simulator.isSteppingOver) {
      handleStepIn();
      return;
    }
    const generation = runGeneration.current;
    let executed = 0;
    setIsRunning(true);
    setStatusText(stepOver ? 'Simulator: Stepping over subroutine' : 'Simulator: Program running');
    const tick = () => {
      if (generation !== runGeneration.current) return;
      const before = cpu.memoryWriteCount;
      const countBefore = cpu.instructionsCount;
      try {
        const reason = simulator.runBatch(breakpointsRef.current);
        executed += cpu.instructionsCount - countBefore;
        publishCPU(before);
        if (reason !== 'limit' || executed >= 1000000) {
          setIsRunning(false);
          timerRef.current = null;
          const message = reason === 'halted' ? `Program halted (HLT). Total cycles: ${cpu.cycles}.`
            : reason === 'breakpoint' ? `Paused at breakpoint on line ${simulator.currentLine}.`
            : reason === 'step-over' ? 'Subroutine completed. Paused after call.'
            : 'Paused after 1,000,000 instructions. Check loops or press Run to continue.';
          setStatusText(`Simulator: ${message}`);
          addConsoleMessage(simulator.currentLine ?? 0, message);
        } else timerRef.current = setTimeout(tick, 16);
      } catch (error) {
        stopExecution();
        syncCPUState();
        setStatusText('Simulator: Execution error');
        addConsoleMessage(simulator.currentLine ?? 0, String(error), 'error');
      }
    };
    timerRef.current = setTimeout(tick, 0);
  }, [stopExecution, ensureProgram, cpu, simulator, breakpoints, publishCPU, handleStepIn, addConsoleMessage, syncCPUState]);

  const handleRun = useCallback(() => startExecution(), [startExecution]);
  const handleStepOver = useCallback(() => startExecution(true), [startExecution]);
  const handleStop = useCallback(() => {
    stopExecution();
    setStatusText('Simulator: Execution stopped');
    syncCPUState();
  }, [stopExecution, syncCPUState]);
  const handleReset = useCallback(() => {
    stopExecution();
    simulator.reset();
    setFocusedMemoryAddress(null);
    syncCPUState();
    setStatusText('Simulator: CPU reset; program reloaded; other RAM and ports preserved');
  }, [stopExecution, simulator, syncCPUState]);

  useEffect(() => {
    publishAssembly(simulator.assemble(DEFAULT_GNUSIM_CODE));
    return () => {
      runGeneration.current++;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [simulator, publishAssembly]);

  // Editing invalidates stale addresses/highlights and cancels any running batch.
  const handleCodeChange = (next: string) => {
    stopExecution();
    setCode(next);
    setAssemblyResult(null);
    setStatusText('Simulator: Source changed; assemble or run to load it');
  };
  const handleLoadAddressChange = (next: string) => {
    stopExecution();
    setLoadAddress(next);
    setAssemblyResult(null);
    setStatusText('Simulator: Load address changed; assemble or run to load it');
  };

  const toggleBreakpoint = (lineNum: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(lineNum)) next.delete(lineNum);
      else next.add(lineNum);
      return next;
    });
  };

  const handleLoadSample = (sample: SampleProgram) => {
    stopExecution();
    setCode(sample.code);
    setBreakpoints(new Set());
    publishAssembly(simulator.assemble(sample.code, loadAddress));
  };

  const handleInsertInstruction = (ins: string) => {
    const editor = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Assembly source"]');
    const position = editor?.selectionStart ?? code.length;
    const lineStart = code.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
    handleCodeChange(code.slice(0, lineStart) + '        ' + ins + '\n' + code.slice(lineStart));
  };

  const files = useProgramFiles(code, source => { handleCodeChange(source); setBreakpoints(new Set()); }, message => { setStatusText(`Simulator: ${message}`); addConsoleMessage(0, message); });
  const handleSaveFile = () => { void files.save(); };
  const handleSaveAs = () => { void files.save(true); };
  const handleOpenFile = () => { void files.open(); };
  const handleNewFile = files.create;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const fileAction = ({ n: handleNewFile, o: handleOpenFile, s: event.shiftKey ? handleSaveAs : handleSaveFile } as Record<string, () => void>)[event.key.toLowerCase()];
        if (fileAction) { event.preventDefault(); fileAction(); return; }
      }
      const action = ({ F5: handleStepIn, F6: handleStepOver, F9: handleRun, F8: handleAssemble } as Record<string, () => unknown>)[event.key];
      if (action) { event.preventDefault(); action(); }
      if (event.key === 'Escape') handleStop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleStepIn, handleStepOver, handleRun, handleAssemble, handleStop, handleNewFile, handleOpenFile, handleSaveFile, handleSaveAs]);

  const cpuState = cpu.getState();
  const updateActiveLineFromPC = syncCPUState;
  const writeMemory = (address: number, value: number) => {
    cpu.writeByte(address, value);
    setFocusedMemoryAddress(address & 0xffff);
    syncCPUState();
  };
  const readMemory = useCallback((address: number) => cpu.readByte(address), [cpu]);
  const readPort = useCallback((port: number) => cpu.readPort(port), [cpu]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#edece8] text-[#2e3436] overflow-hidden font-sans select-none">
      {/* 1. GNUSim8085 Menu Bar & Exact Icon Toolbar */}
      <GtkMenubar
        onAssemble={handleAssemble}
        onRun={handleRun}
        onStepOver={handleStepOver}
        onStepIn={handleStepIn}
        onReset={handleReset}
        onStop={handleStop}
        onToggleOpcodeView={() => setShowOpcodeView((prev) => !prev)}
        showOpcodeView={showOpcodeView}
        isRunning={isRunning}
        isHalted={isHalted}
        onLoadSample={handleLoadSample}
        onOpenBaseConverter={() => setShowBaseConverter(true)}
        onOpenReference={() => setShowReference(true)}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveAs={handleSaveAs}
        fileName={files.name + (files.dirty ? " *" : "")}
        assistant={<AIAssistant editorCode={code} onUseCode={next => { handleCodeChange(next); setBreakpoints(new Set()); }} />}
        onToggleBreakpoint={() => { if (currentLineNumber !== null) toggleBreakpoint(currentLineNumber); }}
        hasCurrentBreakpoint={currentLineNumber !== null && breakpoints.has(currentLineNumber)}
      />

      {/* 2. Main 3-Column Interface matching Screenshot */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Registers, Flags, Decimal-Hex Conversion, I/O Ports, Memory */}
        <GtkLeftPanel
          cpuState={cpuState}
          onUpdateReg={(reg, val) => {
            if (reg === 'M') writeMemory(cpu.getHL(), val);
            else cpu.setReg(reg as Register8, val);
            syncCPUState();
          }}
          onUpdatePC={(pc) => {
            cpu.PC = pc & 0xffff;
            cpu.isHalted = false;
            syncCPUState();
            updateActiveLineFromPC();
          }}
          onUpdateSP={(sp) => {
            cpu.SP = sp & 0xffff;
            syncCPUState();
          }}
          onToggleFlag={(flag) => {
            cpu.flags[flag] = !cpu.flags[flag];
            syncCPUState();
          }}
          onWritePort={(port, val) => {
            cpu.writePort(port, val);
            syncCPUState();
          }}
          readPort={readPort}
          onWriteMemory={writeMemory}
          readMemory={readMemory}
          focusedMemoryAddress={focusedMemoryAddress}
          memoryVersion={memoryVersion}
        />

        {/* Center Panel: "Load me at" + Code Editor with Cyan Active Line */}
        <GtkEditor
          code={code}
          setCode={handleCodeChange}
          breakpoints={breakpoints}
          toggleBreakpoint={toggleBreakpoint}
          currentLineNumber={assemblyResult?.success ? currentLineNumber : null}
          loadAddress={loadAddress}
          setLoadAddress={handleLoadAddressChange}
          showOpcodeView={showOpcodeView}
          assembledLines={assemblyResult ? assemblyResult.lines : []}
        />

        {/* Right Panel: Tabs (Data, Stack, KeyPad, Memory, I/O Ports) + BIG CONSOLE */}
        <GtkRightPanel
          symbols={assemblyResult ? assemblyResult.symbols : {}}
          targetMemoryAddresses={assemblyResult ? assemblyResult.targetMemoryAddresses : []}
          recentWrites={cpu.recentWrites}
          modifiedAddresses={cpu.modifiedAddresses}
          memory={cpu.memory}
          sp={cpuState.SP}
          ioPorts={cpu.ioPorts}
          onWritePort={(port, val) => {
            cpu.writePort(port, val);
            syncCPUState();
          }}
          onWriteMemory={writeMemory}
          assemblerMessages={assemblerMessages}
          onInsertInstruction={handleInsertInstruction}
          focusedMemoryAddress={focusedMemoryAddress}
          memoryVersion={memoryVersion}
        />
      </div>

      {/* 3. Bottom Status Bar matching Screenshot */}
      <div className="h-6 bg-[#edece8] border-t border-[#c2c0ba] px-3 flex items-center justify-between text-xs font-sans text-slate-700 select-none">
        <span className="font-medium text-[11px]">{statusText}</span>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
          <span>PC: {cpuState.PC.toString(16).toUpperCase().padStart(4, '0')}h</span>
          <span>SP: {cpuState.SP.toString(16).toUpperCase().padStart(4, '0')}h</span>
          <span>Cycles: {cpuState.cycles}</span>
        </div>
      </div>

      {files.controls}

      {/* Base Converter Modal */}
      <BaseConverterModal
        isOpen={showBaseConverter}
        onClose={() => setShowBaseConverter(false)}
      />

      {/* Reference Modal */}
      <ReferenceModal
        isOpen={showReference}
        onClose={() => setShowReference(false)}
      />
    </div>
  );
}
