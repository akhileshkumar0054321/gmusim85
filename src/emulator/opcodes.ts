import { InstructionInfo } from '../types/8085';

export interface OpcodeDef {
  opcode: number;
  mnemonic: string;
  bytes: number;
  cycles: number;
  flags: string;
  format: string; // e.g. "MOV r1, r2", "LXI B, d16"
}

export const INSTRUCTION_CATALOG: InstructionInfo[] = [
  // Data Transfer Group
  { mnemonic: 'MOV', operands: 'r1, r2', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'data_transfer', description: 'Move content of r2 into r1', example: 'MOV A, B' },
  { mnemonic: 'MVI', operands: 'r, data', bytes: 2, cycles: 7, flagsAffected: 'None', category: 'data_transfer', description: 'Move 8-bit immediate data into register r or memory M', example: 'MVI A, 32H' },
  { mnemonic: 'LXI', operands: 'rp, data16', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'data_transfer', description: 'Load 16-bit immediate data into register pair rp (B, D, H, SP)', example: 'LXI H, 2050H' },
  { mnemonic: 'LDA', operands: 'addr', bytes: 3, cycles: 13, flagsAffected: 'None', category: 'data_transfer', description: 'Load Accumulator direct from 16-bit memory address', example: 'LDA 2500H' },
  { mnemonic: 'STA', operands: 'addr', bytes: 3, cycles: 13, flagsAffected: 'None', category: 'data_transfer', description: 'Store Accumulator direct into 16-bit memory address', example: 'STA 2500H' },
  { mnemonic: 'LHLD', operands: 'addr', bytes: 3, cycles: 16, flagsAffected: 'None', category: 'data_transfer', description: 'Load H and L registers direct from 16-bit memory address', example: 'LHLD 2050H' },
  { mnemonic: 'SHLD', operands: 'addr', bytes: 3, cycles: 16, flagsAffected: 'None', category: 'data_transfer', description: 'Store H and L registers direct to 16-bit memory address', example: 'SHLD 2050H' },
  { mnemonic: 'LDAX', operands: 'rp', bytes: 1, cycles: 7, flagsAffected: 'None', category: 'data_transfer', description: 'Load Accumulator indirect using address in BC or DE', example: 'LDAX B' },
  { mnemonic: 'STAX', operands: 'rp', bytes: 1, cycles: 7, flagsAffected: 'None', category: 'data_transfer', description: 'Store Accumulator indirect into address in BC or DE', example: 'STAX D' },
  { mnemonic: 'XCHG', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'data_transfer', description: 'Exchange HL register pair with DE register pair', example: 'XCHG' },

  // Arithmetic Group
  { mnemonic: 'ADD', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Add register r or memory M to Accumulator', example: 'ADD B' },
  { mnemonic: 'ADI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Add 8-bit immediate data to Accumulator', example: 'ADI 05H' },
  { mnemonic: 'ADC', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Add register r or M with Carry to Accumulator', example: 'ADC C' },
  { mnemonic: 'ACI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Add 8-bit immediate data with Carry to Accumulator', example: 'ACI 10H' },
  { mnemonic: 'SUB', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Subtract register r or memory M from Accumulator', example: 'SUB D' },
  { mnemonic: 'SUI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Subtract 8-bit immediate data from Accumulator', example: 'SUI 0AH' },
  { mnemonic: 'SBB', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Subtract register r or M with Borrow from Accumulator', example: 'SBB E' },
  { mnemonic: 'SBI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Subtract 8-bit immediate data with Borrow from Accumulator', example: 'SBI 01H' },
  { mnemonic: 'INR', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P', category: 'arithmetic', description: 'Increment register r or memory M by 1', example: 'INR C' },
  { mnemonic: 'DCR', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P', category: 'arithmetic', description: 'Decrement register r or memory M by 1', example: 'DCR B' },
  { mnemonic: 'INX', operands: 'rp', bytes: 1, cycles: 6, flagsAffected: 'None', category: 'arithmetic', description: 'Increment 16-bit register pair rp by 1', example: 'INX H' },
  { mnemonic: 'DCX', operands: 'rp', bytes: 1, cycles: 6, flagsAffected: 'None', category: 'arithmetic', description: 'Decrement 16-bit register pair rp by 1', example: 'DCX D' },
  { mnemonic: 'DAD', operands: 'rp', bytes: 1, cycles: 10, flagsAffected: 'CY', category: 'arithmetic', description: 'Add 16-bit register pair rp to HL pair', example: 'DAD B' },
  { mnemonic: 'DAA', operands: '', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P, CY', category: 'arithmetic', description: 'Decimal Adjust Accumulator (for BCD arithmetic)', example: 'DAA' },

  // Logical Group
  { mnemonic: 'ANA', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC=1, P, CY=0', category: 'logical', description: 'Logical AND register r or M with Accumulator', example: 'ANA B' },
  { mnemonic: 'ANI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC=1, P, CY=0', category: 'logical', description: 'Logical AND immediate data with Accumulator', example: 'ANI 0FH' },
  { mnemonic: 'ORA', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC=0, P, CY=0', category: 'logical', description: 'Logical OR register r or M with Accumulator', example: 'ORA C' },
  { mnemonic: 'ORI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC=0, P, CY=0', category: 'logical', description: 'Logical OR immediate data with Accumulator', example: 'ORI F0H' },
  { mnemonic: 'XRA', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC=0, P, CY=0', category: 'logical', description: 'Exclusive OR register r or M with Accumulator', example: 'XRA A' },
  { mnemonic: 'XRI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC=0, P, CY=0', category: 'logical', description: 'Exclusive OR immediate data with Accumulator', example: 'XRI FFH' },
  { mnemonic: 'CMP', operands: 'r', bytes: 1, cycles: 4, flagsAffected: 'S, Z, AC, P, CY', category: 'logical', description: 'Compare register r or M with Accumulator', example: 'CMP B' },
  { mnemonic: 'CPI', operands: 'data', bytes: 2, cycles: 7, flagsAffected: 'S, Z, AC, P, CY', category: 'logical', description: 'Compare immediate data with Accumulator', example: 'CPI 00H' },
  { mnemonic: 'RLC', operands: '', bytes: 1, cycles: 4, flagsAffected: 'CY', category: 'logical', description: 'Rotate Accumulator Left', example: 'RLC' },
  { mnemonic: 'RRC', operands: '', bytes: 1, cycles: 4, flagsAffected: 'CY', category: 'logical', description: 'Rotate Accumulator Right', example: 'RRC' },
  { mnemonic: 'RAL', operands: '', bytes: 1, cycles: 4, flagsAffected: 'CY', category: 'logical', description: 'Rotate Accumulator Left Through Carry', example: 'RAL' },
  { mnemonic: 'RAR', operands: '', bytes: 1, cycles: 4, flagsAffected: 'CY', category: 'logical', description: 'Rotate Accumulator Right Through Carry', example: 'RAR' },
  { mnemonic: 'CMA', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'logical', description: 'Complement Accumulator (1s complement)', example: 'CMA' },
  { mnemonic: 'CMC', operands: '', bytes: 1, cycles: 4, flagsAffected: 'CY', category: 'logical', description: 'Complement Carry flag', example: 'CMC' },
  { mnemonic: 'STC', operands: '', bytes: 1, cycles: 4, flagsAffected: 'CY=1', category: 'logical', description: 'Set Carry flag to 1', example: 'STC' },

  // Branching Group
  { mnemonic: 'JMP', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Unconditional Jump to 16-bit address', example: 'JMP 2000H' },
  { mnemonic: 'JNZ', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Not Zero (Z=0)', example: 'JNZ LOOP' },
  { mnemonic: 'JZ', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Zero (Z=1)', example: 'JZ DONE' },
  { mnemonic: 'JNC', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if No Carry (CY=0)', example: 'JNC NEXT' },
  { mnemonic: 'JC', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Carry (CY=1)', example: 'JC OVERFLOW' },
  { mnemonic: 'JP', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Positive (S=0)', example: 'JP POS' },
  { mnemonic: 'JM', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Minus (S=1)', example: 'JM NEG' },
  { mnemonic: 'JPE', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Parity Even (P=1)', example: 'JPE EVEN' },
  { mnemonic: 'JPO', operands: 'addr', bytes: 3, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Jump if Parity Odd (P=0)', example: 'JPO ODD' },
  { mnemonic: 'PCHL', operands: '', bytes: 1, cycles: 6, flagsAffected: 'None', category: 'branch', description: 'Load Program Counter with HL pair', example: 'PCHL' },
  { mnemonic: 'CALL', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine unconditionally', example: 'CALL DELAY' },
  { mnemonic: 'CNZ', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Not Zero', example: 'CNZ SUBR' },
  { mnemonic: 'CZ', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Zero', example: 'CZ SUBR' },
  { mnemonic: 'CNC', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if No Carry', example: 'CNC SUBR' },
  { mnemonic: 'CC', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Carry', example: 'CC SUBR' },
  { mnemonic: 'CPO', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Parity Odd (P=0)', example: 'CPO SUBR' },
  { mnemonic: 'CPE', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Parity Even (P=1)', example: 'CPE SUBR' },
  { mnemonic: 'CP', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Positive (S=0)', example: 'CP SUBR' },
  { mnemonic: 'CM', operands: 'addr', bytes: 3, cycles: 18, flagsAffected: 'None', category: 'branch', description: 'Call Subroutine if Minus (S=1)', example: 'CM SUBR' },
  { mnemonic: 'RET', operands: '', bytes: 1, cycles: 10, flagsAffected: 'None', category: 'branch', description: 'Return from Subroutine unconditionally', example: 'RET' },
  { mnemonic: 'RNZ', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Not Zero', example: 'RNZ' },
  { mnemonic: 'RZ', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Zero', example: 'RZ' },
  { mnemonic: 'RNC', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if No Carry', example: 'RNC' },
  { mnemonic: 'RC', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Carry', example: 'RC' },
  { mnemonic: 'RPO', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Parity Odd (P=0)', example: 'RPO' },
  { mnemonic: 'RPE', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Parity Even (P=1)', example: 'RPE' },
  { mnemonic: 'RP', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Positive (S=0)', example: 'RP' },
  { mnemonic: 'RM', operands: '', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Return if Minus (S=1)', example: 'RM' },
  { mnemonic: 'RST', operands: 'n', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'branch', description: 'Restart (call 8*n where n is 0-7)', example: 'RST 1' },

  // Stack, I/O and Machine Control Group
  { mnemonic: 'PUSH', operands: 'rp', bytes: 1, cycles: 12, flagsAffected: 'None', category: 'stack_io', description: 'Push register pair (B, D, H, PSW) onto stack', example: 'PUSH H' },
  { mnemonic: 'POP', operands: 'rp', bytes: 1, cycles: 10, flagsAffected: 'None (PSW affects flags)', category: 'stack_io', description: 'Pop register pair (B, D, H, PSW) from stack', example: 'POP H' },
  { mnemonic: 'XTHL', operands: '', bytes: 1, cycles: 16, flagsAffected: 'None', category: 'stack_io', description: 'Exchange top of stack with HL', example: 'XTHL' },
  { mnemonic: 'SPHL', operands: '', bytes: 1, cycles: 6, flagsAffected: 'None', category: 'stack_io', description: 'Copy HL into Stack Pointer SP', example: 'SPHL' },
  { mnemonic: 'IN', operands: 'port', bytes: 2, cycles: 10, flagsAffected: 'None', category: 'stack_io', description: 'Read byte from 8-bit I/O port into Accumulator', example: 'IN 00H' },
  { mnemonic: 'OUT', operands: 'port', bytes: 2, cycles: 10, flagsAffected: 'None', category: 'stack_io', description: 'Write byte from Accumulator to 8-bit I/O port', example: 'OUT 01H' },
  { mnemonic: 'EI', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'stack_io', description: 'Enable Interrupts', example: 'EI' },
  { mnemonic: 'DI', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'stack_io', description: 'Disable Interrupts', example: 'DI' },
  { mnemonic: 'NOP', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'stack_io', description: 'No Operation', example: 'NOP' },
  { mnemonic: 'HLT', operands: '', bytes: 1, cycles: 5, flagsAffected: 'None', category: 'stack_io', description: 'Halt Processor execution', example: 'HLT' },
  { mnemonic: 'RIM', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'stack_io', description: 'Read Interrupt Mask', example: 'RIM' },
  { mnemonic: 'SIM', operands: '', bytes: 1, cycles: 4, flagsAffected: 'None', category: 'stack_io', description: 'Set Interrupt Mask', example: 'SIM' },
];

// Register encoding maps for 8085
export const REG_CODES: Record<string, number> = {
  B: 0, C: 1, D: 2, E: 3, H: 4, L: 5, M: 6, A: 7
};

export const CODE_TO_REG = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];

export const RP_CODES: Record<string, number> = {
  B: 0, BC: 0,
  D: 1, DE: 1,
  H: 2, HL: 2,
  SP: 3,
  PSW: 3
};
