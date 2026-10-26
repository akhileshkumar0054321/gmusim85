import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { answer, createAssistantRouter, decodeReply } from '../server/assistant';
import { offlineReply, OFFLINE_PROGRAMS } from '../src/assistant/offline';
import { Simulator } from '../src/emulator/simulator';

function program(id: string, inputs?: number[]) {
  const entry = OFFLINE_PROGRAMS.find(item => item.id === id)!;
  const sim = new Simulator();
  assert.equal(sim.assemble(entry.code).success, true, id);
  inputs?.forEach((value, index) => sim.cpu.writeByte(0x2050 + index, value));
  sim.beginRun(); assert.equal(sim.runBatch(new Set(), 50000), 'halted', id);
  return sim;
}
for (const entry of OFFLINE_PROGRAMS) {
  test(`offline library: ${entry.id} assembles and halts`, () => { program(entry.id); });
}
test('offline multiplication stores a full 16-bit result and handles zero', () => {
  for (const [a, b] of [[0, 0], [0, 255], [255, 0], [1, 255], [255, 255]]) {
    const cpu = program('multiply', [a, b]).cpu;
    assert.equal(cpu.readByte(0x2052) | (cpu.readByte(0x2053) << 8), a * b);
  }
});
test('offline division handles quotient, remainder and division by zero', () => {
  for (const [a, b] of [[0, 1], [255, 1], [255, 16], [1, 255], [100, 0]]) {
    const cpu = program('divide', [a, b]).cpu;
    assert.equal(cpu.readByte(0x2052), b ? Math.floor(a / b) : 0);
    assert.equal(cpu.readByte(0x2053), b ? a % b : a);
    assert.equal(cpu.readByte(0x2054), b ? 0 : 1);
  }
});
test('offline addition and subtraction report carry and borrow', () => {
  assert.equal(program('add', [255, 1]).cpu.readByte(0x2053), 1);
  assert.equal(program('subtract', [1, 2]).cpu.readByte(0x2052), 255);
  assert.equal(program('subtract', [1, 2]).cpu.readByte(0x2053), 1);
  const cpu = program('add16', [255, 255, 1, 0]).cpu;
  assert.equal(cpu.readByte(0x2054), 0); assert.equal(cpu.readByte(0x2055), 0); assert.equal(cpu.readByte(0x2056), 1);
});
test('offline answers diagnose editor code and state their limited capabilities', () => {
  assert(offlineReply('multiply two numbers').code);
  assert.match(offlineReply('explain my code', 'ADD Q').text, /Invalid register/);
  assert.match(offlineReply('explain my code', 'MVI A,1\nHLT').text, /MVI/);
  assert.match(offlineReply('explain flags').text, /five flags/);
  assert.match(offlineReply('implement an arbitrary compiler').text, /limited library/);
});
test('model responses are assembler-validated, including fenced fallback', () => {
  assert.deepEqual(decodeReply('{"text":"example","code":"HLT"}', 'gemini').errors, []);
  assert(decodeReply('{"text":"example","code":"MUL A"}', 'ollama').errors!.length > 0);
  assert.equal(decodeReply('Example\n```asm\nHLT\n```', 'ollama').code, 'HLT');
});
test('assistant routes history and editor context to the provider and repairs invalid assembly once', async () => {
  let count = 0;
  const result = await answer({ mode: 'gemini', prompt: 'fix this', history: [{ role: 'user', text: 'addition' }], editorCode: 'ADD Q' }, async (provider, messages, system) => {
    count++;
    assert.equal(provider, 'gemini'); assert.match(system, /no MUL or DIV/);
    assert.match(messages[0].text, /addition/);
    return count === 1 ? '{"text":"bad","code":"MUL A"}' : '{"text":"repaired","code":"HLT"}';
  });
  assert.equal(count, 2); assert.equal(result.code, 'HLT'); assert.equal(result.provider, 'gemini');
});
test('provider failures fall back without exposing secrets; offline mode never calls a provider', async () => {
  const result = await answer({ mode: 'gemini', prompt: 'add two numbers' }, async () => { throw new Error('SECRET-EXAMPLE'); });
  assert.equal(result.provider, 'offline'); assert(result.code); assert(!JSON.stringify(result).includes('SECRET-EXAMPLE'));
  await answer({ mode: 'offline', prompt: 'add two numbers' }, async () => { assert.fail('must not call provider'); });
  const local = await answer({ mode: 'ollama', prompt: 'add two numbers' }, async provider => {
    assert.equal(provider, 'ollama'); return '{"text":"local response","code":"HLT"}';
  });
  assert.equal(local.provider, 'ollama');
});
test('HTTP API rejects malformed requests and cross-origin access, and serves valid replies', async () => {
  const app = express(); app.use('/api/assistant', createAssistantRouter(async () => '{"text":"ok","code":"HLT"}'));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number }; const url = `http://127.0.0.1:${address.port}/api/assistant/chat`;
  try {
    const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(invalid.status, 400);
    const cross = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: '{"mode":"gemini","prompt":"hi"}' });
    assert.equal(cross.status, 403);
    const valid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"mode":"gemini","prompt":"hi"}' });
    assert.equal(valid.status, 200); assert.equal((await valid.json()).provider, 'gemini');
    const status = await fetch(url.replace('/chat', '/status')); const data = await status.json();
    assert.equal('apiKey' in data, false);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
