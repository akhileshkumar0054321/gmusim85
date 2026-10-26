import {
  AssemblyError,
  AssemblyResult,
  AssembledLine,
  SymbolEntry,
} from '../types/8085';
import { REG_CODES, RP_CODES } from './opcodes';

// Helper to parse numbers (Hex with H, 0x, or decimal)
export function parseNumber(val: string, symbols: Record<string, SymbolEntry> = {}): number | null {
  val = val.trim();
  if (!val) return null;

  // Check symbol table
  const upper = val.toUpperCase();
  if (symbols[upper]) {
    return symbols[upper].address;
  }

  // Hex format: 2000H or 0FFH
  if (/^[0-9A-F]+H$/.test(upper)) {
    const hex = upper.slice(0, -1);
    const n = parseInt(hex, 16);
    return isNaN(n) ? null : n;
  }

  // Hex format: 0x2000
  if (/^0X[0-9A-F]+$/.test(upper)) {
    const n = parseInt(upper.slice(2), 16);
    return isNaN(n) ? null : n;
  }

  // Suffix forms must be checked before permissive bare hexadecimal.
  if (/^[01]+B$/.test(upper)) return parseInt(upper.slice(0, -1), 2);
  if (/^[0-9A-F]+$/.test(upper) && /[A-F]/.test(upper)) return parseInt(upper, 16);

  // Octal format: 77O or 77Q
  if ((upper.endsWith('O') || upper.endsWith('Q')) && /^[0-7]+[OQ]$/.test(upper)) {
    const n = parseInt(upper.slice(0, -1), 8);
    return isNaN(n) ? null : n;
  }

  // Character literal: 'A'
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    const inner = val.slice(1, -1);
    return inner.length > 0 ? inner.charCodeAt(0) : 0;
  }

  // Plain decimal
  if (/^-?\d+$/.test(val)) {
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  return null;
}

// 8085 addresses are 16-bit hex by convention (e.g. 2050, 4200, 2000H)
export function parse16BitAddress(val: string, symbols: Record<string, SymbolEntry> = {}): number | null {
  val = val.trim();
  if (!val) return null;
  const upper = val.toUpperCase();
  if (symbols[upper]) {
    return symbols[upper].address;
  }
  // Standard 3-4 digit hex address without H (e.g. 2050, 4200, 0800, 2000)
  if (/^[0-9A-F]{3,4}$/i.test(upper)) {
    const n = parseInt(upper, 16);
    if (!isNaN(n)) return n;
  }
  return parseNumber(val, symbols);
}

export function assemble8085(sourceCode: string, defaultStartAddress: number = 0x4200): AssemblyResult {
  const lines = sourceCode.split('\n');
  const errors: AssemblyError[] = [];
  const warnings: string[] = [];
  const symbols: Record<string, SymbolEntry> = {};
  const assembledLines: AssembledLine[] = [];
  const memoryBytes: { [address: number]: number } = {};

  let currentAddress = defaultStartAddress & 0xffff;
  let initialStartAddress: number | null = null;

  // First pass: Find symbols and calculate addresses
  interface ParsedLine {
    lineNum: number;
    rawText: string;
    cleanText: string;
    label?: string;
    mnemonic?: string;
    operands?: string[];
    isDirective?: boolean;
    byteLength: number;
    address: number;
  }

  const parsedLines: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;

    // Quote-aware comment stripping
    let commentIdx = -1;
    let inSingle = false;
    let inDouble = false;
    for (let c = 0; c < rawLine.length; c++) {
      const ch = rawLine[c];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === ';' && !inSingle && !inDouble) {
        commentIdx = c;
        break;
      }
    }

    let lineWithoutComment = rawLine;
    if (commentIdx !== -1) {
      lineWithoutComment = rawLine.slice(0, commentIdx);
    }
    const clean = lineWithoutComment.trim();

    if (!clean) {
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: '',
        byteLength: 0,
        address: currentAddress,
      });
      continue;
    }

    let text = clean;
    let label: string | undefined;

    // Check for label
    const colonIdx = text.indexOf(':');
    if (colonIdx !== -1) {
      label = text.slice(0, colonIdx).trim().toUpperCase();
      text = text.slice(colonIdx + 1).trim();

      if (label) {
        if (symbols[label]) {
          errors.push({ line: lineNum, message: `Duplicate label defined: '${label}'`, sourceText: rawLine });
        } else {
          symbols[label] = { name: label, address: currentAddress, definedLine: lineNum };
        }
      }
    }

    // Check for EQU directive: LABEL EQU value
    const equMatch = text.match(/^([A-Za-z0-9_]+)\s+EQU\s+(.+)$/i);
    if (equMatch) {
      const equLabel = equMatch[1].toUpperCase();
      const equValStr = equMatch[2].trim();
      const val = parseNumber(equValStr, symbols);
      if (val === null) {
        errors.push({ line: lineNum, message: `Invalid EQU value expression: ${equValStr}`, sourceText: rawLine });
      } else {
        symbols[equLabel] = { name: equLabel, address: val & 0xffff, definedLine: lineNum, isData: true };
      }
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: text,
        label: equLabel,
        isDirective: true,
        byteLength: 0,
        address: currentAddress,
      });
      continue;
    }

    // If only a label was on this line
    if (!text) {
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: '',
        label,
        byteLength: 0,
        address: currentAddress,
      });
      continue;
    }

    // Extract mnemonic and operands
    const parts = text.split(/\s+/);
    const mnemonic = parts[0].toUpperCase();
    const operandStr = text.slice(mnemonic.length).trim();

    // Directives
    if (mnemonic === 'ORG') {
      const addr = parse16BitAddress(operandStr, symbols);
      if (addr === null || addr < 0 || addr > 0xffff) {
        errors.push({ line: lineNum, message: `Invalid ORG address: '${operandStr}'`, sourceText: rawLine });
      } else {
        currentAddress = addr;
        if (initialStartAddress === null) {
          initialStartAddress = addr;
        }
      }
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: text,
        label,
        mnemonic,
        isDirective: true,
        byteLength: 0,
        address: currentAddress,
      });
      continue;
    }

    if (mnemonic === 'DB') {
      if (label && symbols[label]) {
        symbols[label].isData = true;
      }
      // Define Byte (comma separated)
      const byteTokens = parseCommaSeparated(operandStr);
      let byteLen = 0;
      for (const tok of byteTokens) {
        if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'"))) {
          byteLen += tok.slice(1, -1).length;
        } else {
          byteLen += 1;
        }
      }
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: text,
        label,
        mnemonic,
        operands: byteTokens,
        isDirective: true,
        byteLength: byteLen,
        address: currentAddress,
      });
      currentAddress += byteLen;
      continue;
    }

    if (mnemonic === 'DW') {
      if (label && symbols[label]) {
        symbols[label].isData = true;
      }
      // Define Word (16-bit)
      const wordTokens = parseCommaSeparated(operandStr);
      const byteLen = wordTokens.length * 2;
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: text,
        label,
        mnemonic,
        operands: wordTokens,
        isDirective: true,
        byteLength: byteLen,
        address: currentAddress,
      });
      currentAddress += byteLen;
      continue;
    }

    if (mnemonic === 'DS') {
      if (label && symbols[label]) {
        symbols[label].isData = true;
      }
      // Define Storage (reserve bytes)
      const parsedCount = parseNumber(operandStr, symbols);
      const count = parsedCount !== null && parsedCount >= 0 && parsedCount <= 65536 ? parsedCount : 0;
      if (parsedCount === null || parsedCount < 0 || parsedCount > 65536) {
        errors.push({ line: lineNum, message: 'DS requires a size between 0 and 65536.' });
      }
      parsedLines.push({
        lineNum,
        rawText: rawLine,
        cleanText: text,
        label,
        mnemonic,
        operands: [operandStr],
        isDirective: true,
        byteLength: count,
        address: currentAddress,
      });
      currentAddress += count;
      continue;
    }

    if (mnemonic === 'END') break;

    // Normal instruction length calculation
    const operands = parseCommaSeparated(operandStr);
    const byteLength = getInstructionLength(mnemonic, operands);
    if (byteLength === 0) {
      errors.push({ line: lineNum, message: `Unknown instruction or syntax: '${mnemonic}'`, sourceText: rawLine });
    }

    parsedLines.push({
      lineNum,
      rawText: rawLine,
      cleanText: text,
      label,
      mnemonic,
      operands,
      isDirective: false,
      byteLength,
      address: currentAddress,
    });

    if (initialStartAddress === null) {
      initialStartAddress = currentAddress;
    }

    currentAddress += byteLength;
  }

  const targetAddresses = new Set<number>();

  for (const pl of parsedLines) {
    if (pl.byteLength > 0 && pl.address + pl.byteLength > 65536) {
      errors.push({ line: pl.lineNum, message: 'Program exceeds the 64 KB memory address space.' });
    }
  }

  // Second pass: Generate machine code bytes
  for (const pl of parsedLines) {
    if (!pl.cleanText && pl.label) {
      assembledLines.push({
        lineNumber: pl.lineNum,
        source: pl.rawText,
        address: pl.address,
        bytes: [],
        isLabelOnly: true,
      });
      continue;
    }

    if (!pl.cleanText) {
      assembledLines.push({
        lineNumber: pl.lineNum,
        source: pl.rawText,
        bytes: [],
      });
      continue;
    }

    if (pl.isDirective) {
      const generatedBytes: number[] = [];
      if (pl.mnemonic === 'DB' && pl.operands) {
        for (const op of pl.operands) {
          if ((op.startsWith('"') && op.endsWith('"')) || (op.startsWith("'") && op.endsWith("'"))) {
            const str = op.slice(1, -1);
            for (let c = 0; c < str.length; c++) {
              generatedBytes.push(str.charCodeAt(c));
            }
          } else {
            const val = parseNumber(op, symbols);
            if (val === null || val < -128 || val > 255) {
              errors.push({ line: pl.lineNum, message: `Invalid byte literal: '${op}'` });
            } else {
              generatedBytes.push(val & 0xff);
            }
          }
        }
      } else if (pl.mnemonic === 'DW' && pl.operands) {
        for (const op of pl.operands) {
          const val = parseNumber(op, symbols);
          if (val === null || val < -32768 || val > 65535) {
            errors.push({ line: pl.lineNum, message: `Invalid word literal: '${op}'` });
          } else {
            generatedBytes.push(val & 0xff);
            generatedBytes.push((val >> 8) & 0xff);
          }
        }
      } else if (pl.mnemonic === 'DS') {
        const count = pl.byteLength;
        for (let k = 0; k < count; k++) {
          generatedBytes.push(0x00);
        }
      }

      for (let b = 0; b < generatedBytes.length; b++) {
        memoryBytes[pl.address + b] = generatedBytes[b];
      }

      assembledLines.push({
        lineNumber: pl.lineNum,
        source: pl.rawText,
        address: pl.address,
        bytes: generatedBytes,
      });
      continue;
    }

    // Assemble instruction
    if (pl.mnemonic) {
      const bytes = encodeInstruction(pl.mnemonic, pl.operands || [], symbols, pl.lineNum, errors, targetAddresses);
      for (let b = 0; b < bytes.length; b++) {
        memoryBytes[pl.address + b] = bytes[b];
      }

      assembledLines.push({
        lineNumber: pl.lineNum,
        source: pl.rawText,
        address: pl.address,
        bytes,
      });
    }
  }

  const startAddr = initialStartAddress !== null ? initialStartAddress : defaultStartAddress;
  const programSize = Object.keys(memoryBytes).length;

  return {
    success: errors.length === 0,
    errors,
    warnings,
    lines: assembledLines,
    symbols,
    memoryBytes,
    startAddress: startAddr,
    programSize,
    targetMemoryAddresses: Array.from(targetAddresses),
  };
}

function parseCommaSeparated(str: string): string[] {
  if (!str.trim()) return [];
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch === "'" || ch === '"') && (!inQuote || quoteChar === ch)) {
      inQuote = !inQuote;
      quoteChar = inQuote ? ch : '';
      current += ch;
    } else if (ch === ',' && !inQuote) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
}

function getInstructionLength(mnemonic: string, operands: string[]): number {
  switch (mnemonic) {
    // 1-byte instructions
    case 'MOV':
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
    case 'INX':
    case 'DCX':
    case 'DAD':
    case 'DAA':
    case 'CMA':
    case 'CMC':
    case 'STC':
    case 'RLC':
    case 'RRC':
    case 'RAL':
    case 'RAR':
    case 'XCHG':
    case 'XTHL':
    case 'SPHL':
    case 'PCHL':
    case 'PUSH':
    case 'POP':
    case 'RET':
    case 'RNZ':
    case 'RZ':
    case 'RNC':
    case 'RC':
    case 'RPO':
    case 'RPE':
    case 'RP':
    case 'RM':
    case 'NOP':
    case 'HLT':
    case 'DI':
    case 'EI':
    case 'RIM':
    case 'SIM':
    case 'RST':
    case 'LDAX':
    case 'STAX':
      return 1;

    // 2-byte instructions
    case 'MVI':
    case 'ADI':
    case 'ACI':
    case 'SUI':
    case 'SBI':
    case 'ANI':
    case 'XRI':
    case 'ORI':
    case 'CPI':
    case 'IN':
    case 'OUT':
      return 2;

    // 3-byte instructions
    case 'LXI':
    case 'LDA':
    case 'STA':
    case 'LHLD':
    case 'SHLD':
    case 'JMP':
    case 'JNZ':
    case 'JZ':
    case 'JNC':
    case 'JC':
    case 'JPO':
    case 'JPE':
    case 'JP':
    case 'JM':
    case 'CALL':
    case 'CNZ':
    case 'CZ':
    case 'CNC':
    case 'CC':
    case 'CPO':
    case 'CPE':
    case 'CP':
    case 'CM':
      return 3;

    default:
      return 0;
  }
}

function encodeInstruction(
  mnemonic: string,
  operands: string[],
  symbols: Record<string, SymbolEntry>,
  lineNum: number,
  errors: AssemblyError[],
  targetAddresses?: Set<number>
): number[] {
  const op1 = operands[0] ? operands[0].toUpperCase() : '';
  const op2 = operands[1] ? operands[1].toUpperCase() : '';

  const twoOperands = ['MOV', 'MVI', 'LXI'];
  const noOperands = ['NOP', 'HLT', 'DAA', 'CMA', 'CMC', 'STC', 'RLC', 'RRC', 'RAL', 'RAR', 'XCHG', 'XTHL', 'SPHL', 'PCHL', 'RET', 'RNZ', 'RZ', 'RNC', 'RC', 'RPO', 'RPE', 'RP', 'RM', 'EI', 'DI', 'RIM', 'SIM'];
  const expected = twoOperands.includes(mnemonic) ? 2 : noOperands.includes(mnemonic) ? 0 : 1;
  if (operands.length !== expected || operands.some(op => !op.trim())) {
    errors.push({ line: lineNum, message: `${mnemonic} expects ${expected} operand(s).` });
    return [];
  }
  if (['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP', 'INR', 'DCR'].includes(mnemonic) && REG_CODES[op1] === undefined) {
    errors.push({ line: lineNum, message: `Invalid register '${op1}' for ${mnemonic}.` });
    return [];
  }
  const validPairs = ['B', 'BC', 'D', 'DE', 'H', 'HL', 'SP'];
  const stackPairs = ['B', 'BC', 'D', 'DE', 'H', 'HL', 'PSW'];
  if ((['LXI', 'INX', 'DCX', 'DAD'].includes(mnemonic) && !validPairs.includes(op1)) ||
      (['PUSH', 'POP'].includes(mnemonic) && !stackPairs.includes(op1))) {
    errors.push({ line: lineNum, message: `Invalid register pair '${op1}' for ${mnemonic}.` });
    return [];
  }

  const get16BitAddr = (arg: string): [number, number] => {
    const val = parse16BitAddress(arg, symbols);
    if (val === null || val < 0 || val > 0xffff) {
      errors.push({ line: lineNum, message: `Undefined symbol or invalid address: '${arg}'` });
      return [0, 0];
    }
    return [val & 0xff, (val >> 8) & 0xff];
  };

  const get8BitData = (arg: string): number => {
    const val = parseNumber(arg, symbols);
    if (val === null || val < -128 || val > 255) {
      errors.push({ line: lineNum, message: `Invalid 8-bit data expression: '${arg}'` });
      return 0;
    }
    return val & 0xff;
  };

  switch (mnemonic) {
    case 'MOV': {
      if (REG_CODES[op1] === undefined || REG_CODES[op2] === undefined) {
        errors.push({ line: lineNum, message: `Invalid registers for MOV: '${op1}', '${op2}'` });
        return [0x00];
      }
      if (op1 === 'M' && op2 === 'M') {
        errors.push({ line: lineNum, message: `MOV M, M is invalid (encodes as HLT)` });
        return [0x76];
      }
      return [0x40 | (REG_CODES[op1] << 3) | REG_CODES[op2]];
    }

    case 'MVI': {
      if (REG_CODES[op1] === undefined) {
        errors.push({ line: lineNum, message: `Invalid register for MVI: '${op1}'` });
        return [0x00, 0x00];
      }
      return [(REG_CODES[op1] << 3) | 0x06, get8BitData(operands[1])];
    }

    case 'LXI': {
      if (RP_CODES[op1] === undefined) {
        errors.push({ line: lineNum, message: `Invalid register pair for LXI: '${op1}' (expected B, D, H, or SP)` });
        return [0x00, 0x00, 0x00];
      }
      const [lo, hi] = get16BitAddr(op2);
      if (op1 === 'H' || op1 === 'HL') {
        targetAddresses?.add((hi << 8) | lo);
      }
      return [(RP_CODES[op1] << 4) | 0x01, lo, hi];
    }

    case 'LDA': {
      const [lo, hi] = get16BitAddr(op1);
      targetAddresses?.add((hi << 8) | lo);
      return [0x3a, lo, hi];
    }

    case 'STA': {
      const [lo, hi] = get16BitAddr(op1);
      targetAddresses?.add((hi << 8) | lo);
      return [0x32, lo, hi];
    }

    case 'LHLD': {
      const [lo, hi] = get16BitAddr(op1);
      const addr = (hi << 8) | lo;
      targetAddresses?.add(addr);
      targetAddresses?.add((addr + 1) & 0xffff);
      return [0x2a, lo, hi];
    }

    case 'SHLD': {
      const [lo, hi] = get16BitAddr(op1);
      const addr = (hi << 8) | lo;
      targetAddresses?.add(addr);
      targetAddresses?.add((addr + 1) & 0xffff);
      return [0x22, lo, hi];
    }

    case 'LDAX': {
      if (op1 === 'B' || op1 === 'BC') return [0x0a];
      if (op1 === 'D' || op1 === 'DE') return [0x1a];
      errors.push({ line: lineNum, message: `LDAX only accepts register pair B or D` });
      return [0x0a];
    }

    case 'STAX': {
      if (op1 === 'B' || op1 === 'BC') return [0x02];
      if (op1 === 'D' || op1 === 'DE') return [0x12];
      errors.push({ line: lineNum, message: `STAX only accepts register pair B or D` });
      return [0x02];
    }

    case 'XCHG':
      return [0xeb];

    // Arithmetic
    case 'ADD':
      return [0x80 | (REG_CODES[op1] ?? 0)];
    case 'ADI':
      return [0xc6, get8BitData(operands[0])];
    case 'ADC':
      return [0x88 | (REG_CODES[op1] ?? 0)];
    case 'ACI':
      return [0xce, get8BitData(operands[0])];
    case 'SUB':
      return [0x90 | (REG_CODES[op1] ?? 0)];
    case 'SUI':
      return [0xd6, get8BitData(operands[0])];
    case 'SBB':
      return [0x98 | (REG_CODES[op1] ?? 0)];
    case 'SBI':
      return [0xde, get8BitData(operands[0])];

    case 'INR':
      return [(REG_CODES[op1] << 3) | 0x04];
    case 'DCR':
      return [(REG_CODES[op1] << 3) | 0x05];
    case 'INX':
      return [(RP_CODES[op1] << 4) | 0x03];
    case 'DCX':
      return [(RP_CODES[op1] << 4) | 0x0b];
    case 'DAD':
      return [(RP_CODES[op1] << 4) | 0x09];
    case 'DAA':
      return [0x27];

    // Logical
    case 'ANA':
      return [0xa0 | (REG_CODES[op1] ?? 0)];
    case 'ANI':
      return [0xe6, get8BitData(operands[0])];
    case 'XRA':
      return [0xa8 | (REG_CODES[op1] ?? 0)];
    case 'XRI':
      return [0xee, get8BitData(operands[0])];
    case 'ORA':
      return [0xb0 | (REG_CODES[op1] ?? 0)];
    case 'ORI':
      return [0xf6, get8BitData(operands[0])];
    case 'CMP':
      return [0xb8 | (REG_CODES[op1] ?? 0)];
    case 'CPI':
      return [0xfe, get8BitData(operands[0])];

    case 'RLC':
      return [0x07];
    case 'RRC':
      return [0x0f];
    case 'RAL':
      return [0x17];
    case 'RAR':
      return [0x1f];
    case 'CMA':
      return [0x2f];
    case 'CMC':
      return [0x3f];
    case 'STC':
      return [0x37];

    // Jumps
    case 'JMP': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xc3, lo, hi];
    }
    case 'JNZ': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xc2, lo, hi];
    }
    case 'JZ': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xca, lo, hi];
    }
    case 'JNC': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xd2, lo, hi];
    }
    case 'JC': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xda, lo, hi];
    }
    case 'JPO': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xe2, lo, hi];
    }
    case 'JPE': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xea, lo, hi];
    }
    case 'JP': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xf2, lo, hi];
    }
    case 'JM': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xfa, lo, hi];
    }
    case 'PCHL':
      return [0xe9];

    // Calls
    case 'CALL': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xcd, lo, hi];
    }
    case 'CNZ': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xc4, lo, hi];
    }
    case 'CZ': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xcc, lo, hi];
    }
    case 'CNC': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xd4, lo, hi];
    }
    case 'CC': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xdc, lo, hi];
    }
    case 'CPO': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xe4, lo, hi];
    }
    case 'CPE': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xec, lo, hi];
    }
    case 'CP': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xf4, lo, hi];
    }
    case 'CM': {
      const [lo, hi] = get16BitAddr(op1);
      return [0xfc, lo, hi];
    }

    // Returns
    case 'RET':
      return [0xc9];
    case 'RNZ':
      return [0xc0];
    case 'RZ':
      return [0xc8];
    case 'RNC':
      return [0xd0];
    case 'RC':
      return [0xd8];
    case 'RPO':
      return [0xe0];
    case 'RPE':
      return [0xe8];
    case 'RP':
      return [0xf0];
    case 'RM':
      return [0xf8];

    // RST
    case 'RST': {
      const n = parseNumber(op1, symbols);
      if (n === null || n < 0 || n > 7) {
        errors.push({ line: lineNum, message: `RST expects interrupt vector 0 to 7` });
        return [0xc7];
      }
      return [0xc7 | ((n & 7) << 3)];
    }

    // Stack
    case 'PUSH': {
      if (RP_CODES[op1] === undefined) {
        errors.push({ line: lineNum, message: `Invalid register pair for PUSH: '${op1}' (expected B, D, H, or PSW)` });
        return [0xc5];
      }
      return [(RP_CODES[op1] << 4) | 0xc5];
    }
    case 'POP': {
      if (RP_CODES[op1] === undefined) {
        errors.push({ line: lineNum, message: `Invalid register pair for POP: '${op1}' (expected B, D, H, or PSW)` });
        return [0xc1];
      }
      return [(RP_CODES[op1] << 4) | 0xc1];
    }
    case 'XTHL':
      return [0xe3];
    case 'SPHL':
      return [0xf9];

    // I/O & Machine
    case 'IN':
      return [0xdb, get8BitData(operands[0])];
    case 'OUT':
      return [0xd3, get8BitData(operands[0])];
    case 'EI':
      return [0xfb];
    case 'DI':
      return [0xf3];
    case 'NOP':
      return [0x00];
    case 'HLT':
      return [0x76];
    case 'RIM':
      return [0x20];
    case 'SIM':
      return [0x30];

    default:
      errors.push({ line: lineNum, message: `Unsupported instruction '${mnemonic}'` });
      return [0x00];
  }
}
