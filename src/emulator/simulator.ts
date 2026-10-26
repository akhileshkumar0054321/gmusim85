import { CPU8085 } from './cpu';
import { assemble8085 } from './assembler';
import type { AssemblyResult } from '../types/8085';

export type PauseReason = 'halted' | 'breakpoint' | 'step-over' | 'limit';

/** Shared execution model used by Assemble, Run, Step and Reset. */
export class Simulator {
  readonly cpu = new CPU8085();
  assembly: AssemblyResult | null = null;
  private assembledKey = '';
  private pausedBreakpoint: number | null = null;
  private skipBreakpointOnce: number | null = null;
  private stepOverTarget: { pc: number; sp: number } | null = null;

  assemble(source: string, loadAddress = ''): AssemblyResult {
    const text = loadAddress.trim().replace(/^0x/i, '').replace(/h$/i, '');
    if (text && !/^[0-9a-f]{1,4}$/i.test(text)) {
      this.assembly = {
        success: false, errors: [{ line: 0, message: 'Load address must be a hexadecimal address from 0000H to FFFFH.' }],
        warnings: [], lines: [], symbols: {}, memoryBytes: {}, startAddress: 0x4200, programSize: 0,
      };
    } else {
      this.assembly = assemble8085(source, text ? parseInt(text, 16) : 0x4200);
    }
    this.assembledKey = JSON.stringify([source, loadAddress]);
    this.cancelRun();
    this.pausedBreakpoint = null;
    if (this.assembly.success) this.cpu.loadProgram(this.assembly.memoryBytes, this.assembly.startAddress);
    return this.assembly;
  }

  ensureAssembled(source: string, loadAddress = ''): AssemblyResult {
    if (!this.assembly?.success || this.assembledKey !== JSON.stringify([source, loadAddress])) {
      return this.assemble(source, loadAddress);
    }
    return this.assembly;
  }

  get currentLine(): number | null {
    const address = this.cpu.isHalted ? this.cpu.lastPC : this.cpu.PC;
    return this.assembly?.lines.find(line => line.address === address && line.bytes.length > 0)?.lineNumber ?? null;
  }

  reset(): void {
    this.cancelRun();
    this.pausedBreakpoint = null;
    if (this.assembly?.success) this.cpu.loadProgram(this.assembly.memoryBytes, this.assembly.startAddress);
    else this.cpu.reset();
  }

  step(): void {
    this.cancelRun();
    this.pausedBreakpoint = null;
    this.cpu.step();
  }

  beginRun(stepOver = false): void {
    this.skipBreakpointOnce = (stepOver || this.pausedBreakpoint === this.cpu.PC) ? this.cpu.PC : null;
    this.pausedBreakpoint = null;
    this.stepOverTarget = null;
    if (stepOver) {
      const opcode = this.cpu.readByte(this.cpu.PC);
      const isCall = opcode === 0xcd || (opcode & 0xc7) === 0xc4;
      const isRestart = (opcode & 0xc7) === 0xc7;
      if (isCall || isRestart) {
        this.stepOverTarget = { pc: (this.cpu.PC + (isCall ? 3 : 1)) & 0xffff, sp: this.cpu.SP };
      }
    }
  }

  cancelRun(): void {
    this.stepOverTarget = null;
    this.skipBreakpointOnce = null;
  }

  get isSteppingOver(): boolean { return this.stepOverTarget !== null; }

  /** Bounded batches let the browser repaint and process Stop between batches. */
  runBatch(breakpoints: Set<number>, maxInstructions = 500): PauseReason {
    for (let i = 0; i < maxInstructions; i++) {
      if (this.cpu.isHalted) return 'halted';
      if (this.stepOverTarget && this.cpu.PC === this.stepOverTarget.pc && this.cpu.SP === this.stepOverTarget.sp) {
        this.stepOverTarget = null;
        return 'step-over';
      }
      if (this.currentLine !== null && breakpoints.has(this.currentLine) && this.skipBreakpointOnce !== this.cpu.PC) {
        this.pausedBreakpoint = this.cpu.PC;
        return 'breakpoint';
      }
      this.skipBreakpointOnce = null;
      this.cpu.step();
    }
    return this.cpu.isHalted ? 'halted' : 'limit';
  }
}
