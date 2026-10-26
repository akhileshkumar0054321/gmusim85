import { answer } from './assistant';
import { Simulator } from '../src/emulator/simulator';

const reply = await answer({ mode: 'openai', prompt: 'Write a complete 8085 program: set A=23H and B=46H, add them, store the sum at 2052H, then HLT. Return the program in code.' });
if (reply.provider !== 'openai' || !reply.code || reply.errors?.length) {
  console.error(reply.notice || 'OpenAI did not return valid assembly. Check API credentials, quota, and model access.');
  process.exitCode = 1;
} else {
  const sim = new Simulator();
  const result = sim.assemble(reply.code);
  sim.beginRun();
  const reason = result.success ? sim.runBatch(new Set(), 10000) : 'assembly-error';
  const correct = reason === 'halted' && sim.cpu.readByte(0x2052) === 0x69;
  console.log(correct ? 'PASS: OpenAI generated valid code, it halted, and memory 2052H contains 69H.'
    : 'FAIL: The generated program did not produce the expected result. Try again or inspect the model output in the app.');
  if (!correct) process.exitCode = 1;
}
