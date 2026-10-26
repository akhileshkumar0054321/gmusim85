import { CPUState, Flags, Register8 } from '../types/8085';

export interface MemoryWriteEvent {
  address: number;
  value: number;
  pc: number;
}

export class CPU8085 {
  // Registers
  public A: number = 0;
  public B: number = 0;
  public C: number = 0;
  public D: number = 0;
  public E: number = 0;
  public H: number = 0;
  public L: number = 0;
  public PC: number = 0x0800;
  public SP: number = 0xffff;

  // Flags
  public flags: Flags = {
    sign: false,
    zero: false,
    auxCarry: false,
    parity: false,
    carry: false,
  };

  public interruptsEnabled: boolean = false;
  public mask7_5: boolean = false;
  public mask6_5: boolean = false;
  public mask5_5: boolean = false;

  public serialInput = false;
  public serialOutput = false;
  public pending7_5 = false;
  public pending6_5 = false;
  public pending5_5 = false;
  public isHalted: boolean = false;
  public cycles: number = 0;
  public instructionsCount: number = 0;
  public lastPC: number = 0x0800;

  // 64 KB Memory
  public memory: Uint8Array = new Uint8Array(65536);

  // 256 I/O Ports
  public ioPorts: Uint8Array = new Uint8Array(256);

  // Set of memory addresses modified during simulation
  public modifiedAddresses: Set<number> = new Set();
  public modifiedPorts: Set<number> = new Set();
  public recentWrites: MemoryWriteEvent[] = [];
  public memoryWriteCount = 0;
  public lastWrittenAddress: number | null = null;

  constructor() {
    this.reset();
  }

  public reset(resetMemory: boolean = false): void {
    this.A = 0;
    this.B = 0;
    this.C = 0;
    this.D = 0;
    this.E = 0;
    this.H = 0;
    this.L = 0;
    this.PC = 0x0800;
    this.SP = 0xffff;
    this.flags = {
      sign: false,
      zero: false,
      auxCarry: false,
      parity: false,
      carry: false,
    };
    this.interruptsEnabled = false;
    this.mask7_5 = false;
    this.mask6_5 = false;
    this.mask5_5 = false;
    this.serialOutput = false;
    this.pending7_5 = this.pending6_5 = this.pending5_5 = false;
    this.isHalted = false;
    this.cycles = 0;
    this.instructionsCount = 0;
    this.lastPC = 0x0800;
    this.modifiedAddresses.clear();
    this.modifiedPorts.clear();
    this.recentWrites = [];
    this.memoryWriteCount = 0;
    this.lastWrittenAddress = null;

    if (resetMemory) {
      this.memory.fill(0);
      this.ioPorts.fill(0);
    }
  }

  public loadProgram(memoryBytes: { [address: number]: number }, startAddress: number): void {
    this.reset();
    for (const [addrStr, byteVal] of Object.entries(memoryBytes)) {
      const addr = parseInt(addrStr, 10);
      this.memory[addr & 0xffff] = byteVal & 0xff;

    }
    this.PC = startAddress & 0xffff;
    this.lastPC = this.PC;
  }

  public getState(): CPUState {
    return {
      A: this.A,
      B: this.B,
      C: this.C,
      D: this.D,
      E: this.E,
      H: this.H,
      L: this.L,
      PC: this.PC,
      SP: this.SP,
      flags: { ...this.flags },
      interruptsEnabled: this.interruptsEnabled,
      mask7_5: this.mask7_5,
      mask6_5: this.mask6_5,
      mask5_5: this.mask5_5,
      isHalted: this.isHalted,
      cycles: this.cycles,
      instructionsCount: this.instructionsCount,
      lastPC: this.lastPC,
    };
  }

  // Helper for M (memory pointed to by HL)
  public getHL(): number {
    return ((this.H << 8) | this.L) & 0xffff;
  }

  public setHL(val: number): void {
    this.H = (val >> 8) & 0xff;
    this.L = val & 0xff;
  }

  public getBC(): number {
    return ((this.B << 8) | this.C) & 0xffff;
  }

  public setBC(val: number): void {
    this.B = (val >> 8) & 0xff;
    this.C = val & 0xff;
  }

  public getDE(): number {
    return ((this.D << 8) | this.E) & 0xffff;
  }

  public setDE(val: number): void {
    this.D = (val >> 8) & 0xff;
    this.E = val & 0xff;
  }

  public getPSW(): number {
    let f = 0x02; // Bit 1 is always 1
    if (this.flags.sign) f |= 0x80;
    if (this.flags.zero) f |= 0x40;
    if (this.flags.auxCarry) f |= 0x10;
    if (this.flags.parity) f |= 0x04;
    if (this.flags.carry) f |= 0x01;
    return ((this.A << 8) | f) & 0xffff;
  }

  public setPSW(val: number): void {
    this.A = (val >> 8) & 0xff;
    const f = val & 0xff;
    this.flags.sign = (f & 0x80) !== 0;
    this.flags.zero = (f & 0x40) !== 0;
    this.flags.auxCarry = (f & 0x10) !== 0;
    this.flags.parity = (f & 0x04) !== 0;
    this.flags.carry = (f & 0x01) !== 0;
  }

  public readByte(addr: number): number {
    return this.memory[addr & 0xffff];
  }

  public writeByte(addr: number, val: number, isStackOp: boolean = false): void {
    const a = addr & 0xffff;
    const v = val & 0xff;
    this.memory[a] = v;
    this.modifiedAddresses.add(a);
    if (!isStackOp) {
      this.lastWrittenAddress = a;
      this.memoryWriteCount++;
      if (this.recentWrites.length >= 4096) this.recentWrites.splice(0, 2048);
      this.recentWrites.push({ address: a, value: v, pc: this.lastPC });
    }
  }

  public readPort(port: number): number {
    return this.ioPorts[port & 0xff];
  }

  public writePort(port: number, val: number): void {
    const p = port & 0xff;
    this.ioPorts[p] = val & 0xff;
    this.modifiedPorts.add(p);
  }

  public getReg(reg: Register8): number {
    switch (reg) {
      case 'A': return this.A;
      case 'B': return this.B;
      case 'C': return this.C;
      case 'D': return this.D;
      case 'E': return this.E;
      case 'H': return this.H;
      case 'L': return this.L;
      case 'M': return this.readByte(this.getHL());
    }
  }

  public setReg(reg: Register8, val: number): void {
    val &= 0xff;
    switch (reg) {
      case 'A': this.A = val; break;
      case 'B': this.B = val; break;
      case 'C': this.C = val; break;
      case 'D': this.D = val; break;
      case 'E': this.E = val; break;
      case 'H': this.H = val; break;
      case 'L': this.L = val; break;
      case 'M': this.writeByte(this.getHL(), val); break;
    }
  }

  // Parity: true if even number of 1 bits
  private checkParity(val: number): boolean {
    val &= 0xff;
    let count = 0;
    for (let i = 0; i < 8; i++) {
      if ((val & (1 << i)) !== 0) count++;
    }
    return count % 2 === 0;
  }

  private updateSZP(val: number): void {
    val &= 0xff;
    this.flags.zero = val === 0;
    this.flags.sign = (val & 0x80) !== 0;
    this.flags.parity = this.checkParity(val);
  }

  // Push 16-bit word to stack
  public push16(val: number): void {
    const hi = (val >> 8) & 0xff;
    const lo = val & 0xff;
    this.SP = (this.SP - 1) & 0xffff;
    this.writeByte(this.SP, hi, true);
    this.SP = (this.SP - 1) & 0xffff;
    this.writeByte(this.SP, lo, true);
  }

  // Pop 16-bit word from stack
  public pop16(): number {
    const lo = this.readByte(this.SP);
    this.SP = (this.SP + 1) & 0xffff;
    const hi = this.readByte(this.SP);
    this.SP = (this.SP + 1) & 0xffff;
    return ((hi << 8) | lo) & 0xffff;
  }

  // Execute a single instruction at current PC
  public step(): { cycles: number; pc: number; opcode: number } {
    if (this.isHalted) {
      return { cycles: 0, pc: this.PC, opcode: 0x76 };
    }

    this.lastPC = this.PC;
    const opcode = this.readByte(this.PC);
    this.PC = (this.PC + 1) & 0xffff;
    this.instructionsCount++;

    let tStates = 4;

    const readImm8 = (): number => {
      const b = this.readByte(this.PC);
      this.PC = (this.PC + 1) & 0xffff;
      return b;
    };

    const readImm16 = (): number => {
      const lo = readImm8();
      const hi = readImm8();
      return (hi << 8) | lo;
    };

    // Decode opcode
    if (opcode === 0x00) {
      // NOP
      tStates = 4;
    } else if (opcode === 0x76) {
      // HLT
      this.isHalted = true;
      tStates = 5;
    } else if ((opcode & 0xc0) === 0x40) {
      // MOV r1, r2 (0x40 - 0x7f, excluding 0x76)
      const dst = (opcode >> 3) & 0x07;
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const val = this.getReg(regNames[src]);
      this.setReg(regNames[dst], val);
      tStates = (dst === 6 || src === 6) ? 7 : 4;
    } else if ((opcode & 0xc7) === 0x06) {
      // MVI r, d8
      const dst = (opcode >> 3) & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const data = readImm8();
      this.setReg(regNames[dst], data);
      tStates = dst === 6 ? 10 : 7;
    } else if ((opcode & 0xcf) === 0x01) {
      // LXI rp, d16
      const rp = (opcode >> 4) & 0x03;
      const d16 = readImm16();
      if (rp === 0) this.setBC(d16);
      else if (rp === 1) this.setDE(d16);
      else if (rp === 2) this.setHL(d16);
      else if (rp === 3) this.SP = d16;
      tStates = 10;
    } else if (opcode === 0x3a) {
      // LDA addr
      const addr = readImm16();
      this.A = this.readByte(addr);
      tStates = 13;
    } else if (opcode === 0x32) {
      // STA addr
      const addr = readImm16();
      this.writeByte(addr, this.A);
      tStates = 13;
    } else if (opcode === 0x2a) {
      // LHLD addr
      const addr = readImm16();
      this.L = this.readByte(addr);
      this.H = this.readByte(addr + 1);
      tStates = 16;
    } else if (opcode === 0x22) {
      // SHLD addr
      const addr = readImm16();
      this.writeByte(addr, this.L);
      this.writeByte(addr + 1, this.H);
      tStates = 16;
    } else if (opcode === 0x0a) {
      // LDAX B
      this.A = this.readByte(this.getBC());
      tStates = 7;
    } else if (opcode === 0x1a) {
      // LDAX D
      this.A = this.readByte(this.getDE());
      tStates = 7;
    } else if (opcode === 0x02) {
      // STAX B
      this.writeByte(this.getBC(), this.A);
      tStates = 7;
    } else if (opcode === 0x12) {
      // STAX D
      this.writeByte(this.getDE(), this.A);
      tStates = 7;
    } else if (opcode === 0xeb) {
      // XCHG
      const tmpH = this.H;
      const tmpL = this.L;
      this.H = this.D;
      this.L = this.E;
      this.D = tmpH;
      this.E = tmpL;
      tStates = 4;
    } else if ((opcode & 0xf8) === 0x80) {
      // ADD r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const val = this.getReg(regNames[src]);
      this.doAdd(val, false);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xc6) {
      // ADI d8
      const val = readImm8();
      this.doAdd(val, false);
      tStates = 7;
    } else if ((opcode & 0xf8) === 0x88) {
      // ADC r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const val = this.getReg(regNames[src]);
      this.doAdd(val, true);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xce) {
      // ACI d8
      const val = readImm8();
      this.doAdd(val, true);
      tStates = 7;
    } else if ((opcode & 0xf8) === 0x90) {
      // SUB r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const val = this.getReg(regNames[src]);
      this.doSub(val, false);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xd6) {
      // SUI d8
      const val = readImm8();
      this.doSub(val, false);
      tStates = 7;
    } else if ((opcode & 0xf8) === 0x98) {
      // SBB r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const val = this.getReg(regNames[src]);
      this.doSub(val, true);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xde) {
      // SBI d8
      const val = readImm8();
      this.doSub(val, true);
      tStates = 7;
    } else if ((opcode & 0xc7) === 0x04) {
      // INR r
      const rIdx = (opcode >> 3) & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const r = regNames[rIdx];
      const orig = this.getReg(r);
      const res = (orig + 1) & 0xff;
      this.flags.auxCarry = (orig & 0x0f) === 0x0f;
      this.updateSZP(res);
      this.setReg(r, res);
      tStates = r === 'M' ? 10 : 4;
    } else if ((opcode & 0xc7) === 0x05) {
      // DCR r
      const rIdx = (opcode >> 3) & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const r = regNames[rIdx];
      const orig = this.getReg(r);
      const res = (orig - 1) & 0xff;
      this.flags.auxCarry = (orig & 0x0f) === 0;
      this.updateSZP(res);
      this.setReg(r, res);
      tStates = r === 'M' ? 10 : 4;
    } else if ((opcode & 0xcf) === 0x03) {
      // INX rp
      const rp = (opcode >> 4) & 0x03;
      if (rp === 0) this.setBC((this.getBC() + 1) & 0xffff);
      else if (rp === 1) this.setDE((this.getDE() + 1) & 0xffff);
      else if (rp === 2) this.setHL((this.getHL() + 1) & 0xffff);
      else if (rp === 3) this.SP = (this.SP + 1) & 0xffff;
      tStates = 6;
    } else if ((opcode & 0xcf) === 0x0b) {
      // DCX rp
      const rp = (opcode >> 4) & 0x03;
      if (rp === 0) this.setBC((this.getBC() - 1) & 0xffff);
      else if (rp === 1) this.setDE((this.getDE() - 1) & 0xffff);
      else if (rp === 2) this.setHL((this.getHL() - 1) & 0xffff);
      else if (rp === 3) this.SP = (this.SP - 1) & 0xffff;
      tStates = 6;
    } else if ((opcode & 0xcf) === 0x09) {
      // DAD rp
      const rp = (opcode >> 4) & 0x03;
      let val = 0;
      if (rp === 0) val = this.getBC();
      else if (rp === 1) val = this.getDE();
      else if (rp === 2) val = this.getHL();
      else if (rp === 3) val = this.SP;
      const sum = this.getHL() + val;
      this.flags.carry = sum > 0xffff;
      this.setHL(sum & 0xffff);
      tStates = 10;
    } else if (opcode === 0x27) {
      // DAA (Decimal Adjust Accumulator)
      const original = this.A;
      let correction = 0;
      if ((original & 0x0f) > 9 || this.flags.auxCarry) correction |= 0x06;
      if (original > 0x99 || this.flags.carry) correction |= 0x60;
      this.flags.auxCarry = ((original & 0x0f) + (correction & 0x0f)) > 0x0f;
      this.flags.carry = this.flags.carry || original > 0x99;
      this.A = (original + correction) & 0xff;
      this.updateSZP(this.A);
      tStates = 4;
    } else if ((opcode & 0xf8) === 0xa0) {
      // ANA r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      this.A &= this.getReg(regNames[src]);
      this.flags.carry = false;
      this.flags.auxCarry = true; // In 8085 ANA sets AC
      this.updateSZP(this.A);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xe6) {
      // ANI d8
      this.A &= readImm8();
      this.flags.carry = false;
      this.flags.auxCarry = true;
      this.updateSZP(this.A);
      tStates = 7;
    } else if ((opcode & 0xf8) === 0xa8) {
      // XRA r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      this.A ^= this.getReg(regNames[src]);
      this.flags.carry = false;
      this.flags.auxCarry = false;
      this.updateSZP(this.A);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xee) {
      // XRI d8
      this.A ^= readImm8();
      this.flags.carry = false;
      this.flags.auxCarry = false;
      this.updateSZP(this.A);
      tStates = 7;
    } else if ((opcode & 0xf8) === 0xb0) {
      // ORA r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      this.A |= this.getReg(regNames[src]);
      this.flags.carry = false;
      this.flags.auxCarry = false;
      this.updateSZP(this.A);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xf6) {
      // ORI d8
      this.A |= readImm8();
      this.flags.carry = false;
      this.flags.auxCarry = false;
      this.updateSZP(this.A);
      tStates = 7;
    } else if ((opcode & 0xf8) === 0xb8) {
      // CMP r
      const src = opcode & 0x07;
      const regNames: Register8[] = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const val = this.getReg(regNames[src]);
      this.doCompare(val);
      tStates = src === 6 ? 7 : 4;
    } else if (opcode === 0xfe) {
      // CPI d8
      const val = readImm8();
      this.doCompare(val);
      tStates = 7;
    } else if (opcode === 0x07) {
      // RLC
      const bit7 = (this.A >> 7) & 0x01;
      this.flags.carry = bit7 === 1;
      this.A = ((this.A << 1) | bit7) & 0xff;
      tStates = 4;
    } else if (opcode === 0x0f) {
      // RRC
      const bit0 = this.A & 0x01;
      this.flags.carry = bit0 === 1;
      this.A = ((this.A >> 1) | (bit0 << 7)) & 0xff;
      tStates = 4;
    } else if (opcode === 0x17) {
      // RAL
      const oldCY = this.flags.carry ? 1 : 0;
      this.flags.carry = ((this.A >> 7) & 0x01) === 1;
      this.A = ((this.A << 1) | oldCY) & 0xff;
      tStates = 4;
    } else if (opcode === 0x1f) {
      // RAR
      const oldCY = this.flags.carry ? 1 : 0;
      this.flags.carry = (this.A & 0x01) === 1;
      this.A = ((this.A >> 1) | (oldCY << 7)) & 0xff;
      tStates = 4;
    } else if (opcode === 0x2f) {
      // CMA
      this.A = ~this.A & 0xff;
      tStates = 4;
    } else if (opcode === 0x3f) {
      // CMC
      this.flags.carry = !this.flags.carry;
      tStates = 4;
    } else if (opcode === 0x37) {
      // STC
      this.flags.carry = true;
      tStates = 4;
    } else if (opcode === 0xc3) {
      // JMP addr
      this.PC = readImm16();
      tStates = 10;
    } else if (opcode === 0xc2) {
      // JNZ addr
      const addr = readImm16();
      if (!this.flags.zero) this.PC = addr;
      tStates = (!this.flags.zero) ? 10 : 7;
    } else if (opcode === 0xca) {
      // JZ addr
      const addr = readImm16();
      if (this.flags.zero) this.PC = addr;
      tStates = (this.flags.zero) ? 10 : 7;
    } else if (opcode === 0xd2) {
      // JNC addr
      const addr = readImm16();
      if (!this.flags.carry) this.PC = addr;
      tStates = (!this.flags.carry) ? 10 : 7;
    } else if (opcode === 0xda) {
      // JC addr
      const addr = readImm16();
      if (this.flags.carry) this.PC = addr;
      tStates = (this.flags.carry) ? 10 : 7;
    } else if (opcode === 0xe2) {
      // JPO addr
      const addr = readImm16();
      if (!this.flags.parity) this.PC = addr;
      tStates = (!this.flags.parity) ? 10 : 7;
    } else if (opcode === 0xea) {
      // JPE addr
      const addr = readImm16();
      if (this.flags.parity) this.PC = addr;
      tStates = (this.flags.parity) ? 10 : 7;
    } else if (opcode === 0xf2) {
      // JP addr
      const addr = readImm16();
      if (!this.flags.sign) this.PC = addr;
      tStates = (!this.flags.sign) ? 10 : 7;
    } else if (opcode === 0xfa) {
      // JM addr
      const addr = readImm16();
      if (this.flags.sign) this.PC = addr;
      tStates = (this.flags.sign) ? 10 : 7;
    } else if (opcode === 0xe9) {
      // PCHL
      this.PC = this.getHL();
      tStates = 6;
    } else if (opcode === 0xcd) {
      // CALL addr
      const addr = readImm16();
      this.push16(this.PC);
      this.PC = addr;
      tStates = 18;
    } else if (opcode === 0xc4) {
      // CNZ addr
      const addr = readImm16();
      if (!this.flags.zero) {
        this.push16(this.PC);
        this.PC = addr;
        tStates = 18;
      } else {
        tStates = 9;
      }
    } else if (opcode === 0xcc) {
      // CZ addr
      const addr = readImm16();
      if (this.flags.zero) {
        this.push16(this.PC);
        this.PC = addr;
        tStates = 18;
      } else {
        tStates = 9;
      }
    } else if (opcode === 0xd4) {
      // CNC addr
      const addr = readImm16();
      if (!this.flags.carry) {
        this.push16(this.PC);
        this.PC = addr;
        tStates = 18;
      } else {
        tStates = 9;
      }
    } else if (opcode === 0xdc) {
      // CC addr
      const addr = readImm16();
      if (this.flags.carry) {
        this.push16(this.PC);
        this.PC = addr;
        tStates = 18;
      } else {
        tStates = 9;
      }
    } else if ([0xe4, 0xec, 0xf4, 0xfc].includes(opcode)) {
      const addr = readImm16();
      const condition = opcode === 0xe4 ? !this.flags.parity : opcode === 0xec ? this.flags.parity
        : opcode === 0xf4 ? !this.flags.sign : this.flags.sign;
      if (condition) { this.push16(this.PC); this.PC = addr; }
      tStates = condition ? 18 : 9;
    } else if (opcode === 0xc9) {
      // RET
      this.PC = this.pop16();
      tStates = 10;
    } else if (opcode === 0xc0) {
      // RNZ
      if (!this.flags.zero) {
        this.PC = this.pop16();
        tStates = 12;
      } else {
        tStates = 6;
      }
    } else if (opcode === 0xc8) {
      // RZ
      if (this.flags.zero) {
        this.PC = this.pop16();
        tStates = 12;
      } else {
        tStates = 6;
      }
    } else if (opcode === 0xd0) {
      // RNC
      if (!this.flags.carry) {
        this.PC = this.pop16();
        tStates = 12;
      } else {
        tStates = 6;
      }
    } else if (opcode === 0xd8) {
      // RC
      if (this.flags.carry) {
        this.PC = this.pop16();
        tStates = 12;
      } else {
        tStates = 6;
      }
    } else if ([0xe0, 0xe8, 0xf0, 0xf8].includes(opcode)) {
      const condition = opcode === 0xe0 ? !this.flags.parity : opcode === 0xe8 ? this.flags.parity
        : opcode === 0xf0 ? !this.flags.sign : this.flags.sign;
      if (condition) this.PC = this.pop16();
      tStates = condition ? 12 : 6;
    } else if ((opcode & 0xc7) === 0xc7) {
      // RST n
      const n = (opcode >> 3) & 0x07;
      this.push16(this.PC);
      this.PC = n * 8;
      tStates = 12;
    } else if ((opcode & 0xcf) === 0xc5) {
      // PUSH rp
      const rp = (opcode >> 4) & 0x03;
      if (rp === 0) this.push16(this.getBC());
      else if (rp === 1) this.push16(this.getDE());
      else if (rp === 2) this.push16(this.getHL());
      else if (rp === 3) this.push16(this.getPSW());
      tStates = 12;
    } else if ((opcode & 0xcf) === 0xc1) {
      // POP rp
      const rp = (opcode >> 4) & 0x03;
      if (rp === 0) this.setBC(this.pop16());
      else if (rp === 1) this.setDE(this.pop16());
      else if (rp === 2) this.setHL(this.pop16());
      else if (rp === 3) this.setPSW(this.pop16());
      tStates = 10;
    } else if (opcode === 0xe3) {
      // XTHL
      const lo = this.readByte(this.SP);
      const hi = this.readByte(this.SP + 1);
      this.writeByte(this.SP, this.L, true);
      this.writeByte(this.SP + 1, this.H, true);
      this.L = lo;
      this.H = hi;
      tStates = 16;
    } else if (opcode === 0xf9) {
      // SPHL
      this.SP = this.getHL();
      tStates = 6;
    } else if (opcode === 0xdb) {
      // IN port
      const port = readImm8();
      this.A = this.readPort(port);
      tStates = 10;
    } else if (opcode === 0xd3) {
      // OUT port
      const port = readImm8();
      this.writePort(port, this.A);
      tStates = 10;
    } else if (opcode === 0x20) {
      // RIM: SID, pending requests, interrupt enable, interrupt masks.
      this.A = (this.serialInput ? 0x80 : 0) | (this.pending7_5 ? 0x40 : 0)
        | (this.pending6_5 ? 0x20 : 0) | (this.pending5_5 ? 0x10 : 0)
        | (this.interruptsEnabled ? 8 : 0) | (this.mask7_5 ? 4 : 0)
        | (this.mask6_5 ? 2 : 0) | (this.mask5_5 ? 1 : 0);
      tStates = 4;
    } else if (opcode === 0x30) {
      if (this.A & 8) {
        this.mask7_5 = !!(this.A & 4);
        this.mask6_5 = !!(this.A & 2);
        this.mask5_5 = !!(this.A & 1);
      }
      if (this.A & 0x10) this.pending7_5 = false;
      if (this.A & 0x40) this.serialOutput = !!(this.A & 0x80);
      tStates = 4;
    } else if (opcode === 0xfb) {
      // EI
      this.interruptsEnabled = true;
      tStates = 4;
    } else if (opcode === 0xf3) {
      // DI
      this.interruptsEnabled = false;
      tStates = 4;
    } else {
      // Unknown or unsupported opcode
      tStates = 4;
    }

    this.cycles += tStates;
    return { cycles: tStates, pc: this.lastPC, opcode };
  }

  private doAdd(val: number, withCarry: boolean): void {
    const c = withCarry && this.flags.carry ? 1 : 0;
    const res = this.A + val + c;
    this.flags.carry = res > 0xff;
    this.flags.auxCarry = ((this.A & 0x0f) + (val & 0x0f) + c) > 0x0f;
    this.A = res & 0xff;
    this.updateSZP(this.A);
  }

  private doSub(val: number, withBorrow: boolean): void {
    const b = withBorrow && this.flags.carry ? 1 : 0;
    const res = this.A - val - b;
    this.flags.carry = res < 0;
    this.flags.auxCarry = ((this.A & 0x0f) - (val & 0x0f) - b) < 0;
    this.A = res & 0xff;
    this.updateSZP(this.A);
  }

  private doCompare(val: number): void {
    const res = this.A - val;
    this.flags.carry = res < 0;
    this.flags.auxCarry = ((this.A & 0x0f) - (val & 0x0f)) < 0;
    this.updateSZP(res & 0xff);
  }
}
