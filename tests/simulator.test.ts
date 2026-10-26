import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulator } from '../src/emulator/simulator';
import { assemble8085, parseNumber } from '../src/emulator/assembler';
import { SAMPLE_PROGRAMS } from '../src/data/samplePrograms';

function load(source: string) {
  const sim = new Simulator();
  const result = sim.assemble(source);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  return sim;
}
function finish(sim: Simulator) {
  sim.beginRun();
  assert.equal(sim.runBatch(new Set(), 20000), 'halted');
}

test('addition reads manually entered RAM and stores the result; assembly preserves input RAM', () => {
  const sim = new Simulator();
  sim.cpu.writeByte(0x2050, 0x23);
  sim.cpu.writeByte(0x2051, 0x46);
  assert.equal(sim.assemble('LDA 2050H\nMOV B,A\nLDA 2051H\nADD B\nSTA 2052H\nHLT').success, true);
  finish(sim);
  assert.equal(sim.cpu.readByte(0x2052), 0x69);
  assert.equal(sim.cpu.A, 0x69);
  assert.equal(sim.cpu.lastWrittenAddress, 0x2052);
});

test('all memory write instructions update shared RAM, including zero and word boundary writes', () => {
  const sim = load('LXI H,2050H\nMVI M,23H\nINR M\nDCR M\nMVI A,46H\nMOV M,A\nLXI B,2051H\nSTAX B\nLXI D,2052H\nSTAX D\nLXI H,1234H\nSHLD FFFFH\nMVI A,0\nSTA 2053H\nHLT');
  finish(sim);
  assert.deepEqual(Array.from(sim.cpu.memory.slice(0x2050, 0x2054)), [0x46, 0x46, 0x46, 0]);
  assert.equal(sim.cpu.readByte(0xffff), 0x34);
  assert.equal(sim.cpu.readByte(0), 0x12);
  assert(sim.cpu.modifiedAddresses.has(0x2053));
});

test('run and step use changed code and changed load address; failed assembly cannot run stale code', () => {
  const sim = load('MVI A,1\nHLT');
  sim.step();
  assert.equal(sim.cpu.A, 1);
  sim.ensureAssembled('MVI A,2\nHLT', '5000');
  assert.equal(sim.cpu.PC, 0x5000);
  assert.equal(sim.currentLine, 1);
  sim.step();
  assert.equal(sim.cpu.A, 2);
  assert.equal(sim.currentLine, 2);
  assert.equal(sim.ensureAssembled('MVI A,', '5000').success, false);
  assert.equal(sim.assemble('HLT', '1234junk').success, false);
});

test('breakpoint pauses before execution, resumes once, and stops again after looping back', () => {
  const sim = load('INR A\nJMP 4200H');
  sim.beginRun();
  assert.equal(sim.runBatch(new Set([1])), 'breakpoint');
  assert.equal(sim.cpu.A, 0);
  sim.beginRun();
  assert.equal(sim.runBatch(new Set([1])), 'breakpoint');
  assert.equal(sim.cpu.A, 1);
  sim.step();
  assert.equal(sim.cpu.A, 2);
});

test('nested CALL step-over stops at return address with original stack depth', () => {
  const sim = load('CALL SUB1\nHLT\nSUB1: CALL SUB2\nRET\nSUB2: INR A\nRET');
  sim.beginRun(true);
  assert.equal(sim.runBatch(new Set()), 'step-over');
  assert.equal(sim.cpu.A, 1);
  assert.equal(sim.cpu.SP, 0xffff);
  assert.equal(sim.currentLine, 2);
  sim.step();
  assert.equal(sim.cpu.isHalted, true);
  sim.reset();
  assert.equal(sim.cpu.isHalted, false);
  assert.equal(sim.currentLine, 1);
});

test('bounded run can stop and resume without resetting registers or input ports', () => {
  const sim = load('IN 00H\nINR A\nOUT 01H\nJMP 4202H');
  sim.cpu.writePort(0, 0x10);
  sim.beginRun();
  assert.equal(sim.runBatch(new Set(), 3), 'limit');
  assert.equal(sim.cpu.readPort(1), 0x11);
  sim.cancelRun();
  const pc = sim.cpu.PC;
  sim.beginRun();
  sim.runBatch(new Set(), 3);
  assert.equal(sim.cpu.PC, pc);
  assert.equal(sim.cpu.readPort(1), 0x12);
  sim.cpu.writeByte(0x2050, 0xab);
  sim.reset();
  assert.equal(sim.cpu.A, 0);
  assert.equal(sim.cpu.readByte(0x2050), 0xab);
  assert.equal(sim.cpu.readPort(0), 0x10);
});

test('assembler rejects invalid registers, register pairs, counts, ranges and operands', () => {
  for (const source of ['ADD Q', 'INR Q', 'INX Q', 'PUSH SP', 'POP SP', 'LXI PSW,1234H', 'MVI A,256', 'STA 10000H', 'HLT 1', 'MOV A,B,C', 'DS -1', 'DS 999999999', 'ORG FFFFH\nMVI A,1']) {
    assert.equal(assemble8085(source).success, false, source);
  }
  assert.equal(parseNumber('1010B'), 10);
  assert.equal(parseNumber('12GH'), null);
  const sim = load("MVI A,'a'\nHLT");
  finish(sim);
  assert.equal(sim.cpu.A, 97);
  assert.equal(assemble8085('DS 0').programSize, 0);
});

for (const [call, flags] of [
  ['CPO', { parity: false }], ['CPE', { parity: true }], ['CP', { sign: false }], ['CM', { sign: true }],
] as const) {
  test(`${call} calls only when its condition is true`, () => {
    const sim = load(`${call} SUB1\nHLT\nSUB1: MVI A,42H\nRET`);
    Object.assign(sim.cpu.flags, flags);
    finish(sim);
    assert.equal(sim.cpu.A, 0x42);
    assert.equal(sim.cpu.SP, 0xffff);
    sim.reset();
    Object.assign(sim.cpu.flags, Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, !v])));
    finish(sim);
    assert.equal(sim.cpu.A, 0);
  });
}
for (const [ret, flags] of [
  ['RPO', { parity: false }], ['RPE', { parity: true }], ['RP', { sign: false }], ['RM', { sign: true }],
] as const) {
  test(`${ret} returns only when its condition is true`, () => {
    const sim = load(`CALL SUB1\nHLT\nSUB1: ${ret}\nMVI A,42H\nRET`);
    Object.assign(sim.cpu.flags, flags);
    finish(sim);
    assert.equal(sim.cpu.A, 0);
    sim.reset();
    Object.assign(sim.cpu.flags, Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, !v])));
    finish(sim);
    assert.equal(sim.cpu.A, 0x42);
  });
}

test('SIM and RIM share interrupt masks and serial state', () => {
  const sim = load('MVI A,0CFH\nSIM\nEI\nRIM\nHLT');
  finish(sim);
  assert.equal(sim.cpu.A, 0x0f);
  assert.equal(sim.cpu.serialOutput, true);
});

test('DAA propagates BCD decimal carry and recomputes auxiliary carry', () => {
  for (const [a, b, expected, carry] of [[0x09, 0x09, 0x18, false], [0x99, 0x01, 0, true], [0x45, 0x38, 0x83, false]]) {
    const sim = load(`MVI A,${a}\nADI ${b}\nDAA\nHLT`);
    finish(sim);
    assert.equal(sim.cpu.A, expected);
    assert.equal(sim.cpu.flags.carry, carry);
  }
});

const expected: Record<string, [number, number[]]> = {
  factorial: [0x2050, [120]],
  bubble_sort: [0x2050, [4, 0x12, 0x25, 0x43, 0x89]],
  fibonacci: [0x2050, [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]],
  find_max: [0x2060, [0x9a, 5]],
  hex_to_bcd: [0x2060, [2, 5, 5]],
  block_transfer: [0x2070, [0x11, 0x22, 0x33, 0x44]],
  palindrome: [0x2060, [1]],
};
for (const sample of SAMPLE_PROGRAMS) {
  test(`sample ${sample.id} halts and produces the documented result without overwriting code`, () => {
    const sim = load(sample.code);
    const codeAddresses = new Set(sim.assembly!.lines.filter(line => !/^\s*\w*:?\s*(DB|DW|DS)\b/i.test(line.source)).flatMap(line => line.bytes.map((_, i) => line.address! + i)));
    finish(sim);
    assert.equal(sim.cpu.recentWrites.some(write => codeAddresses.has(write.address)), false);
    if (expected[sample.id]) {
      const [address, values] = expected[sample.id];
      assert.deepEqual(Array.from(sim.cpu.memory.slice(address, address + values.length)), values);
    } else assert.equal(sim.cpu.readPort(1), 16);
  });
}

test('memory-write tracking stays bounded while retaining the final byte and total count', () => {
  const sim = new Simulator();
  for (let i = 0; i < 10000; i++) sim.cpu.writeByte(0x2050, i);
  assert(sim.cpu.recentWrites.length <= 4096);
  assert.equal(sim.cpu.memoryWriteCount, 10000);
  assert.equal(sim.cpu.recentWrites.at(-1)?.value, 9999 & 255);
  assert.equal(sim.cpu.readByte(0x2050), 9999 & 255);
});
