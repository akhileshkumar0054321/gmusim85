import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
});
dom.window.confirm = () => true;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { render, screen, fireEvent, waitFor, cleanup, act } = await import('@testing-library/react');
afterEach(() => cleanup());
const { default: App } = await import('../src/App');
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const click = (title: string) => fireEvent.click(screen.getByTitle(title));
const edit = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });
const halted = () => waitFor(() => assert.match(document.body.textContent!, /Program halted \(HLT\)\. Total cycles/));

test('UI: RAM writes refresh Data, Memory and left inspector; Step, Run and Reset share state', async () => {
  render(<App />);
  assert.equal(input('Register A').value, '00');
  assert.equal(input('Data 2050h hex').value, '23');
  edit('Data 2050h hex', '10');
  fireEvent.blur(input('Data 2050h hex'));
  assert.equal(input('Memory address').value, '2050');
  assert.equal(input('Memory value').value, '10');
  click('Step In (F5)');
  assert.equal(input('Register A').value, '10');
  assert.equal(input('Program counter').value, '4203');
  click('Execute / Run (F9)');
  await halted();
  await waitFor(() => assert.equal(input('Register A').value, '56'));
  assert.equal(input('Data 2052h hex').value, '56');
  assert.equal(input('Data 2052h decimal').value, '86');
  await waitFor(() => assert.equal(input('Memory value').value, '56'));
  fireEvent.click(screen.getByRole('tab', { name: /^Memory$/ }));
  assert.equal(input('Memory 2052H hex').value, '56');
  edit('Memory 2052H hex', '00');
  fireEvent.blur(input('Memory 2052H hex'));
  assert.equal(input('Memory value').value, '00');
  fireEvent.click(screen.getByRole('tab', { name: /^Data$/ }));
  assert.equal(input('Data 2052h hex').value, '00');
  click('Reset Registers & PC to Start');
  assert.equal(input('Register A').value, '00');
  assert.equal(input('Program counter').value, '4200');
  cleanup();
});

test('UI: source edits after HLT enable Step and changed load address is used on F5', async () => {
  render(<App />);
  click('Execute / Run (F9)');
  await halted();
  edit('Assembly source', 'MVI A,42H\nSTA 3000H\nHLT');
  assert.equal((screen.getByTitle('Step In (F5)') as HTMLButtonElement).disabled, false);
  edit('Load address', '5000H');
  fireEvent.keyDown(window, { key: 'F5' });
  assert.equal(input('Program counter').value, '5002');
  assert.equal(input('Register A').value, '42');
  fireEvent.keyDown(window, { key: 'F9' });
  await halted();
  await waitFor(() => assert.equal(input('Data 3000h hex').value, '42'));
  edit('Assembly source', 'ADD Q');
  click('Execute / Run (F9)');
  assert.match(document.body.textContent!, /Invalid register 'Q'/);
  assert.equal(input('Register A').value, '42');
  cleanup();
});

test('UI: Stop interrupts loops, breakpoint stops before execution and resumes correctly', async () => {
  render(<App />);
  edit('Assembly source', 'INR A\nJMP 4200H');
  click('Execute / Run (F9)');
  await waitFor(() => assert.equal((screen.getByTitle('Stop Execution') as HTMLButtonElement).disabled, false));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); });
  click('Stop Execution');
  const value = input('Register A').value;
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); });
  assert.equal(input('Register A').value, value);
  click('Reset Registers & PC to Start');
  fireEvent.click(screen.getByTitle('Line 1 (Address: 4200h) - Click to toggle breakpoint'));
  click('Execute / Run (F9)');
  await waitFor(() => assert.match(document.body.textContent!, /Paused at breakpoint on line 1/));
  assert.equal(input('Register A').value, '00');
  click('Execute / Run (F9)');
  await waitFor(() => assert.equal(input('Register A').value, '01'));
  cleanup();
});

test('UI: register, port and memory edits are consumed by instructions and IO views refresh', async () => {
  render(<App />);
  edit('Assembly source', 'IN 00H\nADD B\nOUT 01H\nSTA 3000H\nHLT');
  click('Assemble Code (F8)');
  edit('Register B', '05'); fireEvent.blur(input('Register B'));
  edit('Port address', '00'); edit('Port value', '10');
  fireEvent.click(screen.getByRole('button', { name: 'Update Port Value' }));
  click('Execute / Run (F9)');
  await halted();
  await waitFor(() => assert.equal(input('Register A').value, '15'));
  assert.equal(input('Data 3000h hex').value, '15');
  fireEvent.click(screen.getByRole('tab', { name: /^I\/O Ports$/ }));
  assert.equal(input('Port 01H').value, '15');
  edit('Port 01H', 'AA'); fireEvent.blur(input('Port 01H'));
  edit('Port address', '01');
  assert.equal(input('Port value').value, 'AA');
  cleanup();
});

test('UI: Step Over executes a nested subroutine and keypad inserts valid instruction at cursor', async () => {
  render(<App />);
  edit('Assembly source', 'CALL SUB1\nHLT\nSUB1: CALL SUB2\nRET\nSUB2: INR A\nRET');
  click('Step Over (F6)');
  await waitFor(() => assert.match(document.body.textContent!, /Subroutine completed/));
  assert.equal(input('Register A').value, '01');
  assert.equal(input('Program counter').value, '4203');
  const source = input('Assembly source') as unknown as HTMLTextAreaElement;
  source.setSelectionRange(0, 0);
  fireEvent.click(screen.getByRole('tab', { name: /KeyPad/ }));
  fireEvent.click(screen.getByRole('button', { name: /^HLT$/ }));
  assert.equal(input('Instruction operands').value, '');
  fireEvent.click(screen.getByRole('button', { name: /^Insert$/ }));
  assert.match(source.value, /^\s*HLT\nCALL SUB1/);
  cleanup();
});

test('UI: sample menu resets CPU and links sample code, breakpoints and output memory', async () => {
  render(<App />);
  click('Toggle breakpoint at current instruction');
  assert.equal(screen.getByTitle('Toggle breakpoint at current instruction').getAttribute('aria-pressed'), 'true');
  click('Load Sample Assembly Code');
  fireEvent.click(screen.getByText('Factorial of a Number'));
  assert.equal(input('Register A').value, '00');
  assert.equal(screen.getByTitle('Toggle breakpoint at current instruction').getAttribute('aria-pressed'), 'false');
  click('Execute / Run (F9)');
  await waitFor(() => assert.equal(input('Data 2050h hex').value, '78'));
  fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
  assert.match(input('Assembly source').value, /New 8085 Assembly Program/);
  assert.equal((screen.getByTitle('Step In (F5)') as HTMLButtonElement).disabled, false);
});

test('UI: assistant opens and hides, offline code validates and replaces editor only on request', async () => {
  render(<App />);
  const original = input('Assembly source').value;
  fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
  fireEvent.change(input('Assistant mode'), { target: { value: 'offline' } });
  fireEvent.click(screen.getByRole('button', { name: 'Multiply two 8-bit numbers' }));
  await waitFor(() => assert(screen.getByText('Assembler check passed · test inputs and results before relying on it.')));
  assert.equal(input('Assembly source').value, original);
  fireEvent.click(screen.getByRole('button', { name: 'Use code (replace editor)' }));
  assert.match(input('Assembly source').value, /DAD D/);
  fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
  assert.equal(screen.queryByRole('dialog', { name: '8085 AI assistant' }), null);
  click('Execute / Run (F9)');
  await waitFor(() => assert.equal(input('Data 2052h hex').value, '20'));
  assert.equal(input('Data 2053h hex').value, '01');
  fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
  assert(screen.getByText('Offline program library'));
});

test('UI: assistant sends history, includes editor only by opt-in, and blocks invalid generated code', async () => {
  const previousFetch = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = (async (_url: unknown, options: any) => {
    bodies.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ provider: 'gemini', text: 'Generated code', code: 'MUL A' }) } as Response;
  }) as typeof fetch;
  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    edit('Ask the 8085 assistant', 'generate a multiply routine');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => assert(screen.getByText(/Assembly errors/)));
    assert.equal((screen.getByRole('button', { name: 'Use code (replace editor)' }) as HTMLButtonElement).disabled, true);
    assert.equal(bodies[0].editorCode, '');
    fireEvent.click(screen.getByLabelText('Include current editor code with my question'));
    edit('Ask the 8085 assistant', 'fix my code');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => assert.equal(bodies.length, 2));
    assert.match(bodies[1].editorCode, /LDA 2050H/);
    assert.equal(bodies[1].history.length, 2);
    await waitFor(() => assert.equal(screen.queryByRole('button', { name: 'Stop assistant response' }), null));
  } finally { globalThis.fetch = previousFetch; }
});

test('UI: reference inspector has plain notebook tables, hex start controls and a blank initial stack', () => {
  render(<App />);
  assert.equal(screen.getAllByRole('tab').length, 5);
  fireEvent.click(screen.getByRole('tab', { name: 'Stack' }));
  assert(screen.getByRole('columnheader', { name: 'Stack Loc' }));
  assert.equal(screen.getByRole('table', { name: 'Stack values' }).querySelectorAll('tbody tr').length, 0);
  fireEvent.click(screen.getByRole('tab', { name: 'I/O Ports' }));
  assert(screen.getByRole('columnheader', { name: 'Address (Hex)' }));
  edit('I/O start address', 'F0');
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  assert.equal(screen.getByRole('table', { name: 'I/O port values' }).querySelectorAll('tbody tr').length, 16);
  fireEvent.click(screen.getByRole('tab', { name: 'Memory' }));
  edit('Memory start address', 'FFFF');
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  assert.equal(screen.getByRole('table', { name: 'Memory values' }).querySelectorAll('tbody tr').length, 1);
});

test('UI: deployment access code and OpenAI response identity are wired correctly', async () => {
  const previousFetch = globalThis.fetch;
  let sentToken = '';
  globalThis.fetch = (async (url: any, options: any) => {
    if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ openaiConfigured: true, accessTokenRequired: true }) } as Response;
    sentToken = options.headers['X-Assistant-Token'];
    return { ok: true, json: async () => ({ provider: 'openai', text: 'OpenAI addition', code: 'MVI A,23H\nMVI B,46H\nADD B\nSTA 2052H\nHLT' }) } as Response;
  }) as typeof fetch;
  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    await waitFor(() => assert(screen.getByLabelText('Assistant access code')));
    edit('Assistant access code', 'class-test');
    fireEvent.change(input('Assistant mode'), { target: { value: 'openai' } });
    edit('Ask the 8085 assistant', 'addition');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => assert(screen.getByText('OpenAI addition')));
    assert.equal(sentToken, 'class-test');
    assert(screen.getByText('OpenAI', { selector: 'article div' }));
  } finally { globalThis.fetch = previousFetch; }
});

test('UI: paired sidebar register editors and word fields drive the actual CPU', async () => {
  render(<App />);
  edit('Assembly source', 'MOV A,M\nHLT'); click('Assemble Code (F8)');
  edit('Register H', '20'); fireEvent.blur(input('Register H'));
  edit('Register L', '50'); fireEvent.blur(input('Register L'));
  edit('Memory address', '2050'); edit('Memory value', 'AA');
  fireEvent.click(screen.getByRole('button', { name: 'Update Memory' }));
  edit('Program counter', '4200'); fireEvent.blur(input('Program counter'));
  edit('Stack pointer', 'FFF0'); fireEvent.blur(input('Stack pointer'));
  fireEvent.click(screen.getByRole('button', { name: 'Carry flag' }));
  assert.equal(screen.getByRole('button', { name: 'Carry flag' }).getAttribute('aria-pressed'), 'true');
  click('Execute / Run (F9)');
  await waitFor(() => assert.equal(input('Register A').value, 'AA'));
  assert.equal(input('Stack pointer').value, 'FFF0');
  assert.equal(input('Program counter').value, '4202');
  assert.match(screen.getByLabelText('Processor status word').textContent!, /AA03/);
});

test('UI: sidebar conversion and byte update validation prevent silently wrapped values', () => {
  render(<App />);
  edit('Decimal conversion value', '255');
  fireEvent.click(screen.getByRole('button', { name: /To Hex/ }));
  assert.equal(input('Hex conversion value').value, 'FF');
  edit('Hex conversion value', '1000');
  fireEvent.click(screen.getByRole('button', { name: /To Dec/ }));
  assert.equal(input('Decimal conversion value').value, '4096');
  edit('Memory address', '2050'); edit('Memory value', '100');
  fireEvent.click(screen.getByRole('button', { name: 'Update Memory' }));
  assert.match(screen.getByRole('alert').textContent!, /valid hexadecimal/);
  assert.equal(input('Data 2050h hex').value, '23');
});


test('UI: computer file picker opens a program, Save writes it, Save As chooses a new file', async () => {
  const browser = window as any;
  const writes: string[] = [];
  const handle = { name: 'computer.asm', getFile: async () => new dom.window.File(['MVI A,7FH\nHLT'], 'computer.asm'), createWritable: async () => ({ write: async (value: string) => { writes.push(value); }, close: async () => {} }) };
  browser.showOpenFilePicker = async () => [handle];
  let options: any;
  browser.showSaveFilePicker = async (value: any) => { options = value; return { ...handle, name: 'copy.asm' }; };
  try {
    render(<App />);
    click('Open File (Ctrl+O)');
    await waitFor(() => assert.equal(input('Assembly source').value, 'MVI A,7FH\nHLT'));
    assert(screen.getByText('GNUSim8085 — computer.asm'));
    edit('Assembly source', 'MVI A,55H\nHLT');
    click('Save File (Ctrl+S)');
    await waitFor(() => assert.deepEqual(writes, ['MVI A,55H\nHLT']));
    fireEvent.keyDown(window, { key: 's', ctrlKey: true, shiftKey: true });
    await waitFor(() => assert.equal(writes.length, 2));
    assert.equal(options.suggestedName, 'computer.asm');
    assert(screen.getByText('GNUSim8085 — copy.asm'));
    click('Execute / Run (F9)'); await halted();
    assert.equal(input('Register A').value, '55');
  } finally { delete browser.showOpenFilePicker; delete browser.showSaveFilePicker; }
});

test('UI: fallback Open reads computer files, New protects edits, Save As validates download filename', async () => {
  render(<App />);
  fireEvent.change(input('Open program from computer'), { target: { files: [new dom.window.File(['NOP\nHLT'], 'local.asm')] } });
  await waitFor(() => assert.equal(input('Assembly source').value, 'NOP\nHLT'));
  edit('Assembly source', 'MVI A,42H\nHLT');
  dom.window.confirm = () => false;
  click('New File (Ctrl+N)');
  assert.match(input('Assembly source').value, /42H/);
  dom.window.confirm = () => true;
  click('New File (Ctrl+N)');
  assert(screen.getByText('GNUSim8085 — untitled.asm *'));
  click('Save File (Ctrl+S)');
  edit('Program filename', '../invalid');
  fireEvent.click(screen.getByRole('button', { name: 'Download file' }));
  assert.match(screen.getByRole('alert').textContent!, /valid filename/);
  const originalClick = dom.window.HTMLAnchorElement.prototype.click;
  const originalURL = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let downloaded = '';
  URL.createObjectURL = () => 'blob:test'; URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };
  try {
    edit('Program filename', 'my-program');
    fireEvent.click(screen.getByRole('button', { name: 'Download file' }));
    assert.equal(downloaded, 'my-program.asm');
    assert.equal(screen.queryByRole('dialog', { name: 'Save program as' }), null);
    assert(screen.getByText('GNUSim8085 — my-program.asm'));
  } finally { dom.window.HTMLAnchorElement.prototype.click = originalClick; URL.createObjectURL = originalURL; URL.revokeObjectURL = originalRevoke; }
});
