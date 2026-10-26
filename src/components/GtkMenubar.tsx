import React, { useState } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Printer,
  Settings,
  RotateCcw,
  Play,
  ArrowUp,
  ArrowUpLeft,
  Circle,
  XCircle,
  Table,
  HelpCircle,
  Sparkles,
  Calculator,
  BookOpen,
} from 'lucide-react';
import { SAMPLE_PROGRAMS, SampleProgram } from '../data/samplePrograms';

interface GtkMenubarProps {
  onAssemble: () => void;
  onRun: () => void;
  onStepOver: () => void;
  onStepIn: () => void;
  onReset: () => void;
  onStop: () => void;
  onToggleOpcodeView: () => void;
  showOpcodeView: boolean;
  isRunning: boolean;
  isHalted: boolean;
  onLoadSample: (sample: SampleProgram) => void;
  onOpenBaseConverter: () => void;
  onOpenReference: () => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAs: () => void;
  fileName: string;
  assistant: React.ReactNode;
  onToggleBreakpoint: () => void;
  hasCurrentBreakpoint: boolean;
}

export const GtkMenubar: React.FC<GtkMenubarProps> = ({
  onAssemble,
  onRun,
  onStepOver,
  onStepIn,
  onReset,
  onStop,
  onToggleOpcodeView,
  showOpcodeView,
  isRunning,
  isHalted,
  onLoadSample,
  onOpenBaseConverter,
  onOpenReference,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveAs,
  fileName,
  assistant,
  onToggleBreakpoint,
  hasCurrentBreakpoint,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <div className="flex flex-col bg-[#edece8] border-b border-[#c2c0ba] select-none text-xs">
      {/* GNOME / Ubuntu Classic Window Titlebar */}
      <div className="h-7 bg-gradient-to-r from-[#3c3b37] via-[#484642] to-[#3c3b37] text-[#dfdbd2] flex items-center justify-between px-3 font-sans text-xs shadow-xs">
        <div className="w-16" />
        <div className="font-semibold tracking-wide text-[11px] text-[#f2efe8]">
          GNUSim8085 — {fileName}
        </div>
        <div className="flex items-center gap-1.5 w-16 justify-end">
          <span className="w-3.5 h-3.5 rounded-full bg-[#52504a] hover:bg-[#6c6962] cursor-pointer inline-flex items-center justify-center text-[9px] text-[#222]">
            _
          </span>
          <span className="w-3.5 h-3.5 rounded-full bg-[#52504a] hover:bg-[#6c6962] cursor-pointer inline-flex items-center justify-center text-[9px] text-[#222]">
            □
          </span>
          <span className="w-3.5 h-3.5 rounded-full bg-[#e95420] hover:bg-[#ff6f3d] cursor-pointer inline-flex items-center justify-center text-[10px] text-white font-bold">
            ×
          </span>
        </div>
      </div>

      {/* Menu Bar: File, Reset, Assembler, Debug, Help */}
      <div className="flex items-center px-2 py-0.5 bg-[#eae8e3] border-b border-[#d4d2cc] text-[#2e3436] font-sans text-[11px] relative z-40">
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            className={`px-2 py-0.5 rounded-xs hover:bg-[#3465a4] hover:text-white cursor-pointer ${
              activeMenu === 'file' ? 'bg-[#3465a4] text-white' : ''
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div
              className="absolute left-0 mt-0.5 w-48 bg-white border border-[#b8b6b0] shadow-md py-1 rounded-xs z-50 text-[11px]"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => { onNewFile(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>New</span>
                <span className="text-[10px] text-slate-400">Ctrl+N</span>
              </button>
              <button
                onClick={() => { onOpenFile(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>Open...</span>
                <span className="text-[10px] text-slate-400">Ctrl+O</span>
              </button>
              <button
                onClick={() => { onSaveFile(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>Save</span>
                <span className="text-[10px] text-slate-400">Ctrl+S</span>
              </button>
              <button onClick={() => { onSaveAs(); setActiveMenu(null); }} className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"><span>Save As...</span><span className="text-[10px] text-slate-400">Ctrl+Shift+S</span></button>
              <div className="border-t border-[#e2e0da] my-1" />
              <div className="px-3 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                Load Example
              </div>
              {SAMPLE_PROGRAMS.slice(0, 6).map((prog) => (
                <button
                  key={prog.id}
                  onClick={() => { onLoadSample(prog); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white text-slate-700"
                >
                  {prog.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onReset}
          className="px-2 py-0.5 rounded-xs hover:bg-[#3465a4] hover:text-white cursor-pointer"
        >
          Reset
        </button>

        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'assembler' ? null : 'assembler')}
            className={`px-2 py-0.5 rounded-xs hover:bg-[#3465a4] hover:text-white cursor-pointer ${
              activeMenu === 'assembler' ? 'bg-[#3465a4] text-white' : ''
            }`}
          >
            Assembler
          </button>
          {activeMenu === 'assembler' && (
            <div
              className="absolute left-0 mt-0.5 w-44 bg-white border border-[#b8b6b0] shadow-md py-1 rounded-xs z-50 text-[11px]"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => { onAssemble(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>Assemble</span>
                <span className="text-[10px] text-slate-400">F8</span>
              </button>
              <button
                onClick={() => { onToggleOpcodeView(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white"
              >
                {showOpcodeView ? 'Hide Opcode Listing' : 'Show Opcode Listing'}
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'debug' ? null : 'debug')}
            className={`px-2 py-0.5 rounded-xs hover:bg-[#3465a4] hover:text-white cursor-pointer ${
              activeMenu === 'debug' ? 'bg-[#3465a4] text-white' : ''
            }`}
          >
            Debug
          </button>
          {activeMenu === 'debug' && (
            <div
              className="absolute left-0 mt-0.5 w-44 bg-white border border-[#b8b6b0] shadow-md py-1 rounded-xs z-50 text-[11px]"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => { onRun(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>Execute / Run</span>
                <span className="text-[10px] text-slate-400">F9</span>
              </button>
              <button
                onClick={() => { onStepOver(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>Step Over</span>
                <span className="text-[10px] text-slate-400">F6</span>
              </button>
              <button
                onClick={() => { onStepIn(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center justify-between"
              >
                <span>Step In</span>
                <span className="text-[10px] text-slate-400">F5</span>
              </button>
              <button
                onClick={() => { onStop(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white"
              >
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
            className={`px-2 py-0.5 rounded-xs hover:bg-[#3465a4] hover:text-white cursor-pointer ${
              activeMenu === 'help' ? 'bg-[#3465a4] text-white' : ''
            }`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div
              className="absolute left-0 mt-0.5 w-48 bg-white border border-[#b8b6b0] shadow-md py-1 rounded-xs z-50 text-[11px]"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => { onOpenReference(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>8085 Instruction Guide</span>
              </button>
              <button
                onClick={() => { onOpenBaseConverter(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-[#3465a4] hover:text-white flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-600" />
                <span>Base Converter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main GNUSim8085 Toolbar matching the screenshot icons exactly */}
      <div className="flex items-center px-2 py-1 bg-gradient-to-b from-[#faf9f7] to-[#edece8] border-b border-[#c2c0ba] gap-1">
        {/* New */}
        <button
          onClick={onNewFile}
          className="p-1 hover:bg-[#dfddd7] rounded-xs border border-transparent hover:border-[#b8b6b0] cursor-pointer"
          title="New File (Ctrl+N)"
        >
          <div className="w-4 h-4 bg-white border border-[#888] rounded-xs flex items-center justify-center text-[10px] text-amber-600 shadow-2xs font-bold">
            +
          </div>
        </button>

        {/* Open */}
        <button
          onClick={onOpenFile}
          className="p-1 hover:bg-[#dfddd7] rounded-xs border border-transparent hover:border-[#b8b6b0] cursor-pointer"
          title="Open File (Ctrl+O)"
        >
          <FolderOpen className="w-4 h-4 text-amber-600 fill-amber-100" />
        </button>

        {/* Save */}
        <button
          onClick={onSaveFile}
          className="p-1 hover:bg-[#dfddd7] rounded-xs border border-transparent hover:border-[#b8b6b0] cursor-pointer"
          title="Save File (Ctrl+S)"
        >
          <Save className="w-4 h-4 text-blue-700" />
        </button>

        {/* Examples */}
        <button
          onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          className="p-1 hover:bg-[#dfddd7] rounded-xs border border-transparent hover:border-[#b8b6b0] cursor-pointer"
          title="Load Sample Assembly Code"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </button>

        <div className="h-4 w-px bg-[#c2c0ba] mx-1" />

        {/* Assemble Button (Gear) */}
        <button
          onClick={onAssemble}
          className="p-1 hover:bg-[#dfddd7] rounded-xs border border-transparent hover:border-[#b8b6b0] cursor-pointer"
          title="Assemble Code (F8)"
        >
          <Settings className="w-4 h-4 text-[#4a90d9]" />
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="p-1 hover:bg-[#dfddd7] rounded-xs border border-transparent hover:border-[#b8b6b0] cursor-pointer"
          title="Reset Registers & PC to Start"
        >
          <RotateCcw className="w-4 h-4 text-[#3465a4]" />
        </button>

        <div className="h-4 w-px bg-[#c2c0ba] mx-1" />

        {/* Run (Orange Arrow) */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`p-1 rounded-xs border border-transparent cursor-pointer ${
            isRunning ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#dfddd7] hover:border-[#b8b6b0]'
          }`}
          title="Execute / Run (F9)"
        >
          <Play className="w-4 h-4 text-[#e95420] fill-[#e95420]" />
        </button>

        {/* Step Over (Orange Up Arrow) */}
        <button
          onClick={onStepOver}
          disabled={isRunning || isHalted}
          className={`p-1 rounded-xs border border-transparent cursor-pointer ${
            isRunning || isHalted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#dfddd7] hover:border-[#b8b6b0]'
          }`}
          title="Step Over (F6)"
        >
          <ArrowUp className="w-4 h-4 text-[#e95420]" />
        </button>

        {/* Step In (Orange Left-Up Arrow) */}
        <button
          onClick={onStepIn}
          disabled={isRunning || isHalted}
          className={`p-1 rounded-xs border border-transparent cursor-pointer ${
            isRunning || isHalted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#dfddd7] hover:border-[#b8b6b0]'
          }`}
          title="Step In (F5)"
        >
          <ArrowUpLeft className="w-4 h-4 text-[#e95420]" />
        </button>

        {/* Breakpoint Stop Indicator (Red Circle) */}
        <button
          onClick={onToggleBreakpoint}
          className="p-1 flex items-center justify-center cursor-pointer"
          title="Toggle breakpoint at current instruction"
          aria-pressed={hasCurrentBreakpoint}
        >
          <div className={`w-3.5 h-3.5 rounded-full border border-[#990000] shadow-2xs ${hasCurrentBreakpoint ? 'bg-[#cc0000]' : 'bg-transparent'}`} />
        </button>

        {/* Stop (Red Circle with X) */}
        <button
          onClick={onStop}
          disabled={!isRunning}
          className={`p-1 rounded-xs border border-transparent cursor-pointer ${
            !isRunning ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#dfddd7] hover:border-[#b8b6b0]'
          }`}
          title="Stop Execution"
        >
          <XCircle className="w-4 h-4 text-[#cc0000]" />
        </button>

        {/* Opcode Listing View Toggle */}
        <button
          onClick={onToggleOpcodeView}
          className={`p-1 rounded-xs border cursor-pointer ${
            showOpcodeView
              ? 'bg-[#d8d6d0] border-[#9c9a94]'
              : 'border-transparent hover:bg-[#dfddd7] hover:border-[#b8b6b0]'
          }`}
          title="Toggle Opcode Hex Listing View"
        >
          <Table className="w-4 h-4 text-[#4a90d9]" />
        </button>
        <div className="ml-auto flex items-center">{assistant}</div>
      </div>
    </div>
  );
};
