import { assemble8085 } from '../emulator/assembler';
import { INSTRUCTION_CATALOG } from '../emulator/opcodes';
import { SAMPLE_PROGRAMS } from '../data/samplePrograms';

export type AIProvider = 'openai' | 'gemini' | 'ollama';
export interface AssistantReply {
  text: string;
  code?: string;
  provider: AIProvider | 'offline';
  notice?: string;
  errors?: string[];
}
export interface ChatTurn { role: 'user' | 'assistant'; text: string }
export type AssistantMode = 'auto' | 'openai' | 'gemini' | 'ollama' | 'offline';
export interface AssistantRequest { prompt: string; mode: AssistantMode; history?: ChatTurn[]; editorCode?: string }

export function validateReply(reply: AssistantReply): AssistantReply {
  if (!reply.code) return reply;
  if (reply.code.length > 20000) return { ...reply, errors: ['Program is too large. Ask for a smaller routine.'] };
  const result = assemble8085(reply.code);
  return { ...reply, errors: result.errors.map(error => `Line ${error.line}: ${error.message}`) };
}

interface OfflineProgram { id: string; title: string; matches: RegExp; text: string; code: string }
const wrap = (body: string) => `; Code: 4200H. Data: 2050H onwards. All literals with H are hexadecimal.\nORG 4200H\n${body.trim()}\n`;
export const OFFLINE_PROGRAMS: OfflineProgram[] = [
  { id: 'add16', title: '16-bit addition', matches: /(?:16[ -]?bit|two words).*(?:add|sum)|(?:add|sum).*(?:16[ -]?bit|two words)/i,
    text: 'Adds words at 2050H–2051H and 2052H–2053H. Stores the 16-bit sum at 2054H–2055H and carry at 2056H. Low byte comes first.',
    code: wrap(`LHLD 2050H\nXCHG\nLHLD 2052H\nDAD D\nSHLD 2054H\nMVI A,00H\nACI 00H\nSTA 2056H\nHLT\nORG 2050H\nDB 34H,12H,78H,56H`) },
  { id: 'multiply', title: '8-bit multiplication', matches: /multipl|product|guna/i,
    text: 'Unsigned multiplication by repeated addition. Inputs: 2050H and 2051H. Full 16-bit product: 2052H (low), 2053H (high). Default: 12H × 10H = 0120H. Handles a zero multiplier.',
    code: wrap(`LDA 2050H\nMOV E,A\nMVI D,00H\nLDA 2051H\nMOV C,A\nLXI H,0000H\nORA A\nJZ STORE\nLOOP: DAD D\nDCR C\nJNZ LOOP\nSTORE: SHLD 2052H\nHLT\nORG 2050H\nDB 12H,10H`) },
  { id: 'divide', title: '8-bit division', matches: /divid|divis|quotient|remainder/i,
    text: 'Unsigned repeated-subtraction division. Dividend: 2050H; divisor: 2051H; quotient: 2052H; remainder: 2053H. Status at 2054H is 01H for division by zero, otherwise 00H. Default: 19H ÷ 04H gives 06H with remainder 01H.',
    code: wrap(`MVI A,00H\nSTA 2054H\nLDA 2051H\nORA A\nJZ BAD\nMOV B,A\nLDA 2050H\nMVI C,00H\nLOOP: CMP B\nJC DONE\nSUB B\nINR C\nJMP LOOP\nDONE: STA 2053H\nMOV A,C\nSTA 2052H\nHLT\nBAD: LDA 2050H\nSTA 2053H\nMVI A,00H\nSTA 2052H\nMVI A,01H\nSTA 2054H\nHLT\nORG 2050H\nDB 19H,04H`) },
  { id: 'subroutine', title: 'CALL / RET subroutine', matches: /sub[ -]?routine|\bcall\b|\bret\b/i,
    text: 'Initializes SP to FFFFH, calls a routine that adds the two input bytes and returns. Sum is stored at 2052H. Step Over executes the routine and pauses after CALL.',
    code: wrap(`LXI SP,0FFFFH\nCALL SUM\nSTA 2052H\nHLT\nSUM: LDA 2050H\nMOV B,A\nLDA 2051H\nADD B\nRET\nORG 2050H\nDB 23H,46H`) },
  { id: 'add', title: '8-bit addition with carry', matches: /\badd|addition|sum|jod/i,
    text: 'Adds the bytes at 2050H and 2051H. Sum: 2052H. Carry byte: 2053H (00H or 01H). Default: 23H + 46H = 69H. Edit the DB values for different inputs.',
    code: wrap(`LDA 2050H\nMOV B,A\nLDA 2051H\nADD B\nSTA 2052H\nMVI A,00H\nACI 00H\nSTA 2053H\nHLT\nORG 2050H\nDB 23H,46H`) },
  { id: 'subtract', title: '8-bit subtraction with borrow', matches: /subtract|minus|difference|ghata/i,
    text: 'Subtracts [2051H] from [2050H]. Difference: 2052H; borrow byte: 2053H. Default: 46H − 23H = 23H. Underflow wraps to 8 bits and sets the borrow byte.',
    code: wrap(`LDA 2051H\nMOV B,A\nLDA 2050H\nSUB B\nSTA 2052H\nMVI A,00H\nACI 00H\nSTA 2053H\nHLT\nORG 2050H\nDB 46H,23H`) },
  { id: 'ones', title: 'Count set bits', matches: /count.*(?:ones|one bits|set bits|1s)|hamming|population/i,
    text: 'Counts 1 bits in the byte at 2050H and stores the count at 2051H. Default: B5H has five set bits.',
    code: wrap(`LDA 2050H\nMVI B,08H\nMVI C,00H\nLOOP: RRC\nJNC NEXT\nINR C\nNEXT: DCR B\nJNZ LOOP\nMOV A,C\nSTA 2051H\nHLT\nORG 2050H\nDB 0B5H`) },
  { id: 'complement', title: "Two's complement", matches: /complement|negat/i,
    text: "Computes the two's complement of the byte at 2050H (CMA then INR A), stored at 2051H. Default: 05H → FBH.",
    code: wrap(`LDA 2050H\nCMA\nINR A\nSTA 2051H\nHLT\nORG 2050H\nDB 05H`) },
  { id: 'compare', title: 'Compare two unsigned bytes', matches: /compar|greater|less than|equal/i,
    text: 'Compares [2050H] against [2051H]. Stores 01H for greater, 00H for equal, FFH for less at 2052H.',
    code: wrap(`LDA 2051H\nMOV B,A\nLDA 2050H\nCMP B\nJZ EQUAL\nJC LESS\nMVI A,01H\nJMP STORE\nEQUAL: MVI A,00H\nJMP STORE\nLESS: MVI A,0FFH\nSTORE: STA 2052H\nHLT\nORG 2050H\nDB 46H,23H`) },
  { id: 'io', title: 'Input / output', matches: /\bio\b|i\/o|\bport|\bled|input.output/i,
    text: 'Reads Port 00H and writes the same byte to Port 01H. Set Port 00H before Run; inspect the I/O tab to see the output.',
    code: wrap(`IN 00H\nOUT 01H\nSTA 2050H\nHLT`) },
  ...SAMPLE_PROGRAMS.filter(sample => sample.id !== 'io_led_counter').map(sample => ({
    id: sample.id, title: sample.title, text: sample.description + ' Uses the bundled example with its documented default inputs.', code: sample.code,
    matches: ({ factorial: /factorial|\bn!/i, bubble_sort: /sort|ascending|bubble/i,
      fibonacci: /fibo/i, find_max: /largest|smallest|maximum|minimum|\bmax\b|\bmin\b/i,
      hex_to_bcd: /bcd|decimal conversion/i, block_transfer: /block|copy|transfer/i, palindrome: /palindrome/i } as Record<string, RegExp>)[sample.id],
  })),
];

export function offlineReply(prompt: string, editorCode = ''): AssistantReply {
  const base = { provider: 'offline' as const };
  if (/flag|carry flag|parity|auxiliary|\bPSW\b/i.test(prompt) && !/code|program|write|generate/i.test(prompt)) {
    return { ...base, text: '8085 has five flags: S is bit 7 of the result; Z is set for a zero result; P is set for an even number of 1 bits; CY records carry/borrow; AC tracks the lower-nibble carry used by BCD adjustment. Instructions affect different flags: MOV/MVI/LDA/STA do not change them; INR/DCR preserve CY; DAD changes CY only. Ask for an instruction name for its flag effects.' };
  }
  if (/explain|debug|fix|error|correct|samjha/i.test(prompt) && editorCode.trim()) {
    const assembly = assemble8085(editorCode);
    if (!assembly.success) return { ...base, text: 'The current editor has these assembly errors:\n' + assembly.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n') + '\nOffline mode can diagnose syntax, but cannot reliably rewrite arbitrary programs. Select Local AI after installing Ollama for that.' };
    const explanations = editorCode.split('\n').flatMap((line, i) => {
      const instruction = line.replace(/;.*/, '').replace(/^\s*\w+:\s*/, '').trim().split(/\s/)[0]?.toUpperCase();
      const item = INSTRUCTION_CATALOG.find(item => item.mnemonic === instruction);
      return item ? [`Line ${i + 1}, ${instruction}: ${item.description}. Flags: ${item.flagsAffected}.`] : [];
    });
    return { ...base, text: 'The editor assembles successfully. This checks syntax, not algorithm correctness.\n\n' + explanations.slice(0, 100).join('\n') };
  }
  const mnemonic = INSTRUCTION_CATALOG.find(item => new RegExp(`\\b${item.mnemonic}\\b`, 'i').test(prompt));
  if (mnemonic && /explain|what|instruction|meaning|syntax|how.*work/i.test(prompt)) {
    return { ...base, text: `${mnemonic.mnemonic}: ${mnemonic.description}\nSyntax: ${mnemonic.mnemonic} ${mnemonic.operands ?? ''}\nExample: ${mnemonic.example}\nSize: ${mnemonic.bytes} byte(s). Flags: ${mnemonic.flagsAffected}.` };
  }
  const match = OFFLINE_PROGRAMS.find(program => program.matches?.test(prompt));
  if (match) return validateReply({ ...base, text: `${match.title}\n${match.text}\n\nOffline mode supplies the tested default example; it does not customize arbitrary constraints or numeric inputs.`, code: match.code });
  return { ...base, text: 'Offline programs work without an internet connection or a downloaded model. Available: ' + OFFLINE_PROGRAMS.map(item => item.title).join(', ') + '. I can also explain instructions and check editor syntax.\n\nFor custom programs, follow-up reasoning or arbitrary code repairs while offline, install Ollama and download a local model once, then select Local AI. Built-in offline programs are a limited library, not a general AI model.' };
}
