import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Wrench,
  BookOpen,
  Calculator,
  ChevronDown,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { SAMPLE_PROGRAMS, SampleProgram } from '../data/samplePrograms';

interface ToolbarProps {
  onAssemble: () => void;
  onRun: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  isRunning: boolean;
  isHalted: boolean;
  isAssembled: boolean;
  executionSpeed: number;
  setExecutionSpeed: (speed: number) => void;
  onLoadSample: (sample: SampleProgram) => void;
  onOpenBaseConverter: () => void;
  onOpenReference: () => void;
  showKeypad: boolean;
  setShowKeypad: (show: boolean | ((prev: boolean) => boolean)) => void;
  isConsoleExpanded: boolean;
  setIsConsoleExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAssemble,
  onRun,
  onPause,
  onStep,
  onReset,
  isRunning,
  isHalted,
  isAssembled,
  executionSpeed,
  setExecutionSpeed,
  onLoadSample,
  onOpenBaseConverter,
  onOpenReference,
  showKeypad,
  setShowKeypad,
  isConsoleExpanded,
  setIsConsoleExpanded,
}) => {
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 select-none z-20 shadow-xs">
      {/* Streamlined Professional Single Header */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Brand & Core Execution Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-mono font-bold text-white text-xs shadow-xs">
              8085
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-slate-900">
                GNUSim8085
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Core Action: Assemble */}
          <button
            onClick={onAssemble}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Assemble Source (F8)"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Assemble (F8)</span>
          </button>

          {/* Core Action: Run / Pause */}
          {isRunning ? (
            <button
              onClick={onPause}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Pause Execution (F9)"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={isHalted}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                isHalted
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
              }`}
              title="Run Program (F9)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run (F9)</span>
            </button>
          )}

          {/* Core Action: Step */}
          <button
            onClick={onStep}
            disabled={isRunning || isHalted}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isRunning || isHalted
                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
            title="Step One Instruction (F5)"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Step (F5)</span>
          </button>

          {/* Core Action: Reset */}
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reset Registers & PC to Start (F2)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset (F2)</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-medium text-slate-500">Speed:</span>
            <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-md">
              {[
                { label: 'Step', val: 1000 },
                { label: '5Hz', val: 200 },
                { label: '20Hz', val: 50 },
                { label: 'Fast', val: 0 },
              ].map((spd) => (
                <button
                  key={spd.label}
                  onClick={() => setExecutionSpeed(spd.val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    executionSpeed === spd.val
                      ? 'bg-white text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tools & Example Picker */}
        <div className="flex items-center gap-2">
          {/* Preloaded Example Programs Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSampleDropdown((prev) => !prev)}
              className="px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Examples</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSampleDropdown && (
              <div
                className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs max-h-96 overflow-y-auto"
                onMouseLeave={() => setShowSampleDropdown(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Select 8085 Program
                </div>
                {SAMPLE_PROGRAMS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      onLoadSample(sample);
                      setShowSampleDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900 flex items-center justify-between">
                      <span>{sample.title}</span>
                      <span className="text-[10px] text-blue-600 font-mono">{sample.category}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {sample.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Keypad Toggle */}
          <button
            onClick={() => setShowKeypad((prev) => !prev)}
            title="Toggle Instruction Keypad"
            className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showKeypad
                ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Keypad</span>
          </button>

          {/* Base Converter */}
          <button
            onClick={onOpenBaseConverter}
            title="Base Converter"
            className="px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <Calculator className="w-3.5 h-3.5 text-slate-500" />
            <span>Converter</span>
          </button>

          {/* Reference Manual */}
          <button
            onClick={onOpenReference}
            title="8085 Reference Manual"
            className="px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>8085 Docs</span>
          </button>

          {/* Console Height Expander */}
          <button
            onClick={() => setIsConsoleExpanded((prev) => !prev)}
            title={isConsoleExpanded ? 'Restore Console Size' : 'Enlarge Console'}
            className={`p-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
              isConsoleExpanded
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'text-slate-600 bg-white hover:bg-slate-50 border-slate-300'
            }`}
          >
            {isConsoleExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
