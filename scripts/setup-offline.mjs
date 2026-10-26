import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
console.log(`Downloading ${model} for local use. This requires internet once and several GB of disk space.`);
console.log('If Ollama is not installed, install it from https://ollama.com/download first.');
const child = spawn('ollama', ['pull', model], { stdio: 'inherit', shell: false });
child.on('error', () => { console.error('Ollama was not found. Install it and rerun npm run setup:offline.'); process.exitCode = 1; });
child.on('close', async code => {
  if (code !== 0) { process.exitCode = 1; return; }
  let env = await readFile('.env.local', 'utf8').catch(() => '');
  env = /^OLLAMA_ENABLED=.*$/m.test(env) ? env.replace(/^OLLAMA_ENABLED=.*$/m, 'OLLAMA_ENABLED=true') : env + '\nOLLAMA_ENABLED=true\n';
  await writeFile('.env.local', env);
  console.log('Local model ready. Restart the app, choose Local AI, and keep Ollama running. Internet is no longer required for that model.');
});
