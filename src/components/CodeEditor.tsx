import React, { useRef, useEffect } from 'react';
import { AssembledLine, AssemblyError } from '../types/8085';
import { AlertCircle, FileCode } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  currentLineNumber: number | null;
  assembledLines: AssembledLine[];
  errors: AssemblyError[];
  showOpcodeListing: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  breakpoints,
  toggleBreakpoint,
  currentLineNumber,
  assembledLines,
  errors,
  showOpcodeListing,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');

  // Handle Tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Build error map by line
  const errorMap: Record<number, string> = {};
  for (const err of errors) {
    errorMap[err.line] = err.message;
  }

  // Build assembled lookup by line
  const assembledByLine: Record<number, AssembledLine> = {};
  for (const al of assembledLines) {
    assembledByLine[al.lineNumber] = al;
  }

  // Scroll active line into view if running/stepping
  useEffect(() => {
    if (currentLineNumber && textareaRef.current) {
      const lineHeight = 20;
      const targetScroll = (currentLineNumber - 5) * lineHeight;
      textareaRef.current.scrollTop = Math.max(0, targetScroll);
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, [currentLineNumber]);

  return (
    <div className="flex flex-col flex-1 h-full bg-white text-slate-800 font-mono text-xs overflow-hidden relative border-r border-slate-200">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 select-none">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800">main.asm</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-sans">{lines.length} lines</span>
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-rose-600 font-sans font-medium bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              <AlertCircle className="w-3 h-3" />
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          Click gutter to toggle breakpoints
        </div>
      </div>

      {showOpcodeListing ? (
        /* Assembled Listing View */
        <div className="flex-1 overflow-auto bg-white p-2 font-mono text-xs select-text">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 text-left text-[11px] bg-slate-50">
                <th className="py-1 px-2 w-10">Brk</th>
                <th className="py-1 px-2 w-12 text-right">Line</th>
                <th className="py-1 px-2 w-20">Address</th>
                <th className="py-1 px-2 w-28">Machine Hex</th>
                <th className="py-1 px-2">Instruction</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const asmInfo = assembledByLine[lineNum];
                const isCurrent = currentLineNumber === lineNum;
                const hasBreak = breakpoints.has(lineNum);
                const hasError = !!errorMap[lineNum];

                const hexBytes = asmInfo && asmInfo.bytes.length > 0
                  ? asmInfo.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
                  : '';

                const addrStr = asmInfo && asmInfo.address !== undefined
                  ? asmInfo.address.toString(16).toUpperCase().padStart(4, '0') + 'H'
                  : '';

                return (
                  <tr
                    key={lineNum}
                    className={`hover:bg-slate-50 transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/80 border-l-2 border-blue-600 text-blue-900 font-semibold'
                        : hasError
                        ? 'bg-rose-50 text-rose-700'
                        : 'text-slate-700'
                    }`}
                  >
                    <td className="py-1 px-2 text-center">
                      <button
                        onClick={() => toggleBreakpoint(lineNum)}
                        className={`w-2.5 h-2.5 rounded-full inline-block transition-transform cursor-pointer ${
                          hasBreak
                            ? 'bg-rose-500 scale-110 shadow-xs'
                            : 'bg-transparent hover:bg-slate-300'
                        }`}
                        title={hasBreak ? 'Clear Breakpoint' : 'Set Breakpoint'}
                      />
                    </td>
                    <td className="py-1 px-2 text-slate-400 text-right tabular-nums">{lineNum}</td>
                    <td className="py-1 px-2 text-blue-600 font-mono font-medium">{addrStr}</td>
                    <td className="py-1 px-2 text-emerald-700 font-mono font-semibold">{hexBytes}</td>
                    <td className="py-1 px-2 font-mono">
                      {isCurrent && <span className="text-blue-600 mr-1.5 font-bold">▶</span>}
                      {lineText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Standard Light Theme Editor */
        <div className="flex-1 flex overflow-hidden relative">
          {/* Gutter with Line Numbers and Breakpoints */}
          <div
            ref={lineNumbersRef}
            className="w-12 bg-slate-50 border-r border-slate-200 py-3 select-none flex flex-col overflow-hidden text-right font-mono text-xs z-10"
          >
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const hasBreak = breakpoints.has(lineNum);
              const isCurrent = currentLineNumber === lineNum;
              const hasError = !!errorMap[lineNum];

              return (
                <div
                  key={lineNum}
                  onClick={() => toggleBreakpoint(lineNum)}
                  className={`h-5 leading-5 px-1 flex items-center justify-between cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-700 font-bold'
                      : hasError
                      ? 'bg-rose-100 text-rose-600'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={`Line ${lineNum} - Click to toggle breakpoint`}
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    {hasBreak ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs block" />
                    ) : isCurrent ? (
                      <span className="text-blue-600 text-[10px] font-bold">▶</span>
                    ) : null}
                  </div>
                  <span className="tabular-nums pr-1 text-[11px]">{lineNum}</span>
                </div>
              );
            })}
          </div>

          {/* Textarea Area */}
          <div className="flex-1 relative overflow-hidden bg-white">
            {/* Active Execution Line Background Highlight */}
            {currentLineNumber && (
              <div
                className="absolute left-0 right-0 h-5 bg-blue-50 border-y border-blue-200 pointer-events-none z-0 flex items-center px-2"
                style={{
                  top: `${(currentLineNumber - 1) * 20 + 12}px`,
                }}
              >
                <span className="text-blue-600 text-xs font-bold mr-2">▶</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              spellCheck={false}
              className="w-full h-full p-3 bg-transparent text-slate-800 font-mono text-xs leading-5 resize-none outline-none border-none whitespace-pre overflow-auto relative z-10 selection:bg-blue-100"
              style={{
                lineHeight: '20px',
                tabSize: 4,
              }}
            />
          </div>
        </div>
      )}

      {/* Assembly Error Bar if errors exist */}
      {errors.length > 0 && (
        <div className="bg-rose-50 border-t border-rose-200 px-3 py-2 text-xs text-rose-800 max-h-32 overflow-y-auto">
          <div className="font-semibold text-rose-700 flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Assembly Errors ({errors.length}):</span>
          </div>
          {errors.map((err, idx) => (
            <div key={idx} className="font-mono text-[11px] text-rose-700 pl-5 py-0.5">
              <span className="font-semibold">Line {err.line}:</span> {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
