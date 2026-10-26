/**
 * Intel 8085 CPU & Assembler Types
 */

export interface Flags {
  sign: boolean;      // S (bit 7)
  zero: boolean;      // Z (bit 6)
  auxCarry: boolean;  // AC (bit 4)
  parity: boolean;    // P (bit 2)
  carry: boolean;     // CY (bit 0)
}

export type Register8 = 'A' | 'B' | 'C' | 'D' | 'E' | 'H' | 'L' | 'M';
export type RegisterPair = 'B' | 'D' | 'H' | 'SP' | 'PSW';

export interface CPUState {
  // 8-bit registers
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  H: number;
  L: number;
  // 16-bit registers
  PC: number;
  SP: number;
  // Flags
  flags: Flags;
  // Interrupts
  interruptsEnabled: boolean;
  mask7_5: boolean;
  mask6_5: boolean;
  mask5_5: boolean;
  // Execution status
  isHalted: boolean;
  cycles: number;
  instructionsCount: number;
  lastPC: number;
}

export interface AssembledLine {
  lineNumber: number;
  source: string;
  address?: number;
  bytes: number[];
  isLabelOnly?: boolean;
}

export interface SymbolEntry {
  name: string;
  address: number;
  definedLine: number;
  isData?: boolean;
}

export interface AssemblyResult {
  success: boolean;
  errors: AssemblyError[];
  warnings: string[];
  lines: AssembledLine[];
  symbols: Record<string, SymbolEntry>;
  memoryBytes: { [address: number]: number };
  startAddress: number;
  programSize: number;
  targetMemoryAddresses?: number[];
}

export interface AssemblyError {
  line: number;
  message: string;
  sourceText?: string;
}

export interface InstructionInfo {
  mnemonic: string;
  operands?: string;
  bytes: number;
  cycles: number;
  flagsAffected: string;
  category: 'data_transfer' | 'arithmetic' | 'logical' | 'branch' | 'stack_io';
  description: string;
  example: string;
}
