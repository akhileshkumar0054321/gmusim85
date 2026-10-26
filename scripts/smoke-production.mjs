import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
const reservation = createServer();
reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const server = spawn(process.execPath, ['build/index.mjs'], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), ASSISTANT_ACCESS_TOKEN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let errors = '';
server.stderr.on('data', data => { errors += data.toString().slice(0, 2000); });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Production server did not start.')), 15000);
    server.stdout.on('data', data => { if (data.toString().includes('ready on port')) { clearTimeout(timer); resolve(); } });
    server.once('exit', code => { clearTimeout(timer); reject(new Error('Production server exited with code ' + code)); });
    server.once('error', error => { clearTimeout(timer); reject(error); });
  });
  const root = `http://127.0.0.1:${port}`;
  const health = await fetch(root + '/health'); if (!health.ok) throw new Error('Health check failed.');
  const html = await fetch(root + '/'); if (!html.ok || !(await html.text()).includes('GNUSim8085')) throw new Error('Frontend failed.');
  const response = await fetch(root + '/api/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'offline', prompt: 'multiply two 8-bit numbers' }) });
  const reply = await response.json();
  if (!response.ok || reply.provider !== 'offline' || !reply.code?.includes('DAD D')) throw new Error('Assistant API failed.');
  console.log('PASS: compiled production server, health, frontend and offline assistant API. No paid provider calls were made.');
} catch (error) {
  console.error(error.message);
  if (errors) console.error('Check the production server startup logs.');
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  const force = setTimeout(() => server.kill('SIGKILL'), 9000); force.unref();
}
