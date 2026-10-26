import React, { useRef, useEffect } from 'react';
import { AssembledLine } from '../types/8085';

interface GtkEditorProps {
  code: string;
  setCode: (code: string) => void;
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;
  currentLineNumber: number | null;
  loadAddress: string;
  setLoadAddress: (addr: string) => void;
  showOpcodeView: boolean;
  assembledLines: AssembledLine[];
}

export const GtkEditor: React.FC<GtkEditorProps> = ({
  code,
  setCode,
  breakpoints,
  toggleBreakpoint,
  currentLineNumber,
  loadAddress,
  setLoadAddress,
  showOpcodeView,
  assembledLines,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const syntaxOverlayRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');

  // Build lookup of line number to assembled line details
  const lineAddressMap: Record<number, AssembledLine> = {};
  for (const al of assembledLines) {
    lineAddressMap[al.lineNumber] = al;
  }

  // Handle Tab key for clean 8085 indenting
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
    const top = e.currentTarget.scrollTop;
    if (syntaxOverlayRef.current) syntaxOverlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = top;
    if (syntaxOverlayRef.current) syntaxOverlayRef.current.scrollTop = top;
  };

  useEffect(() => {
    if (currentLineNumber && textareaRef.current) {
      const lineHeight = 19;
      const targetScroll = (currentLineNumber - 6) * lineHeight;
      textareaRef.current.scrollTop = Math.max(0, targetScroll);
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      if (syntaxOverlayRef.current) syntaxOverlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [currentLineNumber]);

  // Syntax highlighter matching GNUSim8085 colors from screenshot
  const renderSyntaxLine = (lineText: string, isCurrent: boolean) => {
    const commentIdx = lineText.indexOf(';');
    let beforeComment = commentIdx !== -1 ? lineText.slice(0, commentIdx) : lineText;
    let commentPart = commentIdx !== -1 ? lineText.slice(commentIdx) : '';

    const tokens: React.ReactNode[] = [];
    const mnemonicRegex = /\b(NOP|HLT|MOV|MVI|LXI|LDA|STA|LHLD|SHLD|LDAX|STAX|XCHG|ADD|ADI|ADC|ACI|SUB|SUI|SBB|SBI|INR|DCR|INX|DCX|DAD|DAA|ANA|ANI|XRA|XRI|ORA|ORI|CMP|CPI|RLC|RRC|RAL|RAR|CMA|CMC|STC|JMP|JNZ|JZ|JNC|JC|JP|JM|JPE|JPO|CALL|CNZ|CZ|CNC|CC|CP|CM|CPE|CPO|RET|RNZ|RZ|RNC|RC|RP|RM|RPE|RPO|RIM|SIM|RST|PCHL|XTHL|SPHL|PUSH|POP|IN|OUT|EI|DI|ORG|DB|DW|DS|EQU)\b/i;
    const registerRegex = /\b([ABCDEHLM]|SP|PSW)\b/i;
    const hexNumRegex = /\b([0-9][0-9A-Fa-f]*H|[0-9]+)\b/i;

    const parts = beforeComment.split(/(\s+|[,:])/);

    parts.forEach((part, idx) => {
      if (!part) return;

      if (part.endsWith(':')) {
        tokens.push(
          <span key={idx} className="text-[#800080] font-semibold">
            {part}
          </span>
        );
      } else if (mnemonicRegex.test(part.trim())) {
        tokens.push(
          <span key={idx} className="text-[#990000] font-bold">
            {part}
          </span>
        );
      } else if (registerRegex.test(part.trim())) {
        tokens.push(
          <span key={idx} className="text-[#008000] font-semibold">
            {part}
          </span>
        );
      } else if (hexNumRegex.test(part.trim())) {
        tokens.push(
          <span key={idx} className="text-[#cc00cc] font-medium">
            {part}
          </span>
        );
      } else {
        tokens.push(<span key={idx} className="text-[#2e3436]">{part}</span>);
      }
    });

    if (commentPart) {
      tokens.push(
        <span key="comment" className="text-[#0000cc] italic">
          {commentPart}
        </span>
      );
    }

    return tokens;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white border-r border-[#c2c0ba] overflow-hidden select-none">
      {/* Top Bar: Load me at [ input ] */}
      <div className="flex items-center px-3 py-1.5 bg-[#f7f6f4] border-b border-[#d8d6d0] text-xs font-sans text-slate-700 gap-2">
        <span>Load me at</span>
        <input
          type="text"
          aria-label="Load address"
          value={loadAddress}
          onChange={(e) => setLoadAddress(e.target.value)}
          placeholder="e.g. 4200h (defaults to 4200h)"
          className="flex-1 max-w-xs bg-white border border-[#b8b6b0] px-2 py-0.5 text-xs font-mono rounded-xs outline-none focus:border-blue-500 shadow-2xs"
        />
        <span className="text-[11px] text-slate-500">
          (Default execution start: 4200h)
        </span>
      </div>

      {showOpcodeView ? (
        /* Full Opcode Listing View Mode */
        <div className="flex-1 overflow-auto bg-white p-2 font-mono text-xs select-text">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#c2c0ba] text-slate-600 bg-[#f7f6f4] text-[11px] font-sans">
                <th className="py-1 px-1.5 w-8 text-center">Brk</th>
                <th className="py-1 px-2 w-12 text-right">Line</th>
                <th className="py-1 px-3 w-20 text-left">Address</th>
                <th className="py-1 px-3 w-28 text-left">Machine Code</th>
                <th className="py-1 px-3 text-left">Source Assembly</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const asm = lineAddressMap[lineNum];
                const hasBreak = breakpoints.has(lineNum);
                const isCurrent = currentLineNumber === lineNum;

                const hexBytes = asm && asm.bytes.length > 0
                  ? asm.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
                  : '';

                const addrStr = asm && asm.address !== undefined
                  ? asm.address.toString(16).toUpperCase().padStart(4, '0') + 'h'
                  : '';

                return (
                  <tr
                    key={lineNum}
                    className={`hover:bg-slate-50 border-b border-[#f4f3ef] ${
                      isCurrent ? 'bg-[#00ffff]/60 font-semibold text-slate-900' : ''
                    }`}
                  >
                    <td className="py-1 px-1 text-center">
                      <button
                        onClick={() => toggleBreakpoint(lineNum)}
                        className={`w-2.5 h-2.5 rounded-full inline-block ${
                          hasBreak ? 'bg-[#cc0000] border border-[#990000]' : 'hover:bg-slate-300'
                        }`}
                      />
                    </td>
                    <td className="py-1 px-2 text-right text-slate-400 tabular-nums">{lineNum}</td>
                    <td className="py-1 px-3 text-blue-700 font-bold">{addrStr}</td>
                    <td className="py-1 px-3 text-emerald-800 font-semibold tracking-wider">{hexBytes}</td>
                    <td className="py-1 px-3 font-mono">{lineText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Standard GNUSim8085 Editor with Address in Gutter */
        <div className="flex-1 flex overflow-hidden relative">
          {/* Line Numbers & Address Gutter */}
          <div
            ref={lineNumbersRef}
            className="w-20 bg-[#f4f3ef] border-r border-[#d4d2cc] py-2 select-none flex flex-col overflow-hidden font-mono text-xs"
          >
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const hasBreak = breakpoints.has(lineNum);
              const isCurrent = currentLineNumber === lineNum;
              const asm = lineAddressMap[lineNum];
              const addrStr = asm && asm.address !== undefined && (asm.bytes.length > 0 || asm.isLabelOnly)
                ? asm.address.toString(16).toUpperCase().padStart(4, '0') + 'h'
                : '';

              return (
                <div
                  key={lineNum}
                  onClick={() => toggleBreakpoint(lineNum)}
                  className={`h-[19px] shrink-0 leading-[19px] px-1.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 ${
                    isCurrent ? 'bg-[#00ffff]/40 font-bold' : ''
                  }`}
                  title={`Line ${lineNum} ${addrStr ? `(Address: ${addrStr})` : ''} - Click to toggle breakpoint`}
                >
                  <div className="w-2.5 h-2.5 flex items-center justify-center shrink-0">
                    {hasBreak ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#cc0000] border border-[#990000] shadow-2xs" />
                    ) : null}
                  </div>
                  <span className={`text-[11px] tabular-nums pr-1 ${isCurrent ? 'text-black font-bold' : 'text-[#555]'}`}>
                    {lineNum}
                  </span>
                  {addrStr ? (
                    <span className="text-[10px] text-blue-700 font-semibold font-mono tabular-nums">
                      {addrStr}
                    </span>
                  ) : (
                    <span className="w-7" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Text Area and Active Line Highlighter */}
          <div className="flex-1 relative overflow-hidden bg-white">
            {/* Syntax Highlighter Underlay with synchronous cyan line highlighting */}
            <div
              ref={syntaxOverlayRef}
              className="absolute inset-0 p-2 font-mono text-xs leading-[19px] whitespace-pre overflow-hidden pointer-events-none z-10"
              style={{
                lineHeight: '19px',
                tabSize: 4,
              }}
            >
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isCurrent = currentLineNumber === lineNum;
                return (
                  <div
                    key={lineNum}
                    className={`h-[19px] -mx-2 px-2 transition-colors duration-75 ${
                      isCurrent ? 'bg-[#00ffff]/80 text-black font-semibold' : ''
                    }`}
                  >
                    {renderSyntaxLine(lineText, isCurrent)}
                  </div>
                );
              })}
            </div>

            {/* Transparent Input Textarea */}
            <textarea
              aria-label="Assembly source"
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              spellCheck={false}
              className="w-full h-full p-2 bg-transparent text-transparent caret-[#2e3436] font-mono text-xs leading-[19px] resize-none outline-none border-none whitespace-pre overflow-auto relative z-20 selection:bg-blue-200 selection:text-transparent"
              style={{
                lineHeight: '19px',
                tabSize: 4,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
