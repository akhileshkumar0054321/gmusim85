import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApplication } from '../server/app';
import { answer, configuredProviders, createAssistantRouter } from '../server/assistant';
import { openAIRequest, ProviderError, failureReason } from '../server/providers';
import { assemble8085 } from '../src/emulator/assembler';
import express from 'express';

const generated = JSON.stringify({ text: 'Addition example', code: 'MVI A,23H\nMVI B,46H\nADD B\nSTA 2052H\nHLT' });
function environment(values: Record<string, string | undefined>) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  return () => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
}
async function serve(app: express.Express, run: (url: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const { port } = server.address() as { port: number };
  try { await run(`http://127.0.0.1:${port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
const post = (url: string, mode = 'openai', headers = {}) => fetch(url + '/api/assistant/chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ mode, prompt: 'add two numbers' }),
});

test('OpenAI uses structured Responses output, bounded output and nonstored requests', () => {
  const restore = environment({ OPENAI_MODEL: 'gpt-4.1-mini' });
  try {
    const body = openAIRequest([{ role: 'user', text: 'addition' }], 'Tutor instructions');
    assert.equal(body.model, 'gpt-4.1-mini'); assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true); assert.equal(body.text.format.schema.additionalProperties, false);
    assert.equal(body.max_output_tokens, 4096); assert(!JSON.stringify(body).includes('API_KEY'));
  } finally { restore(); }
});
test('Auto selects OpenAI first and transparently switches after a quota failure', async () => {
  const restore = environment({ OPENAI_API_KEY: 'test-only', GEMINI_API_KEY: 'test-only', OLLAMA_ENABLED: 'false' });
  try {
    assert.deepEqual(configuredProviders(), ['openai', 'gemini']);
    const calls: string[] = [];
    const reply = await answer({ mode: 'auto', prompt: 'addition' }, async provider => {
      calls.push(provider); if (provider === 'openai') throw { status: 429 }; return generated;
    });
    assert.deepEqual(calls, ['openai', 'gemini']); assert.equal(reply.provider, 'gemini');
    assert.match(reply.notice!, /OpenAI.*quota/); assert.equal(assemble8085(reply.code!).success, true);
  } finally { restore(); }
});
test('missing credentials and credential errors are specific without leaking raw SDK errors', async () => {
  const restore = environment({ OPENAI_API_KEY: undefined, GEMINI_API_KEY: undefined, OLLAMA_ENABLED: 'false' });
  try {
    const missing = await answer({ mode: 'auto', prompt: 'addition' }, async () => assert.fail('unconfigured provider must not run'));
    assert.equal(missing.provider, 'offline'); assert.match(missing.notice!, /OPENAI_API_KEY/);
    const rejected = await answer({ mode: 'openai', prompt: 'addition' }, async () => { throw { status: 401, message: 'PRIVATE-SECRET' }; });
    assert.match(rejected.notice!, /key was rejected/); assert(!JSON.stringify(rejected).includes('PRIVATE-SECRET'));
    assert.equal(failureReason(new ProviderError('not-configured')), 'not-configured');
    assert.equal(failureReason({ status: 429, code: 'insufficient_quota' }), 'quota-exhausted');
  } finally { restore(); }
});
test('production app serves health and code, denies unknown API/assets, and bypasses cache for API/SW', async () => {
  await serve(createApplication(async () => generated), async url => {
    const health = await fetch(url + '/health'); assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok');
    const html = await fetch(url + '/'); assert.match(await html.text(), /GNUSim8085/);
    assert.equal(html.headers.get('x-powered-by'), null); assert.match(html.headers.get('content-security-policy')!, /connect-src 'self'/);
    const sw = await fetch(url + '/sw.js'); assert.equal(sw.headers.get('cache-control'), 'no-cache');
    assert.equal((await fetch(url + '/api/not-real')).status, 404);
    assert.equal((await fetch(url + '/assets/missing.js')).status, 404);
    assert.equal((await fetch(url + '/.env.local')).status, 404);
    const response = await post(url); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).provider, 'openai');
  });
});
test('optional access code is enforced and configured public origin works behind a reverse proxy', async () => {
  const restore = environment({ ASSISTANT_ACCESS_TOKEN: 'class-access-code', APP_ORIGIN: 'https://sim.example', TRUST_PROXY: '1' });
  try {
    await serve(createApplication(async () => generated), async url => {
      const denied = await post(url); assert.equal(denied.status, 401);
      const allowed = await post(url, 'openai', { Origin: 'https://sim.example', 'X-Assistant-Token': 'class-access-code', 'X-Forwarded-For': '198.51.100.1' });
      assert.equal(allowed.status, 200);
      const cross = await post(url, 'openai', { Origin: 'https://bad.example', 'X-Assistant-Token': 'class-access-code' });
      assert.equal(cross.status, 403);
      const status = await (await fetch(url + '/api/assistant/status')).json();
      assert.equal(status.accessTokenRequired, true); assert(!JSON.stringify(status).includes('class-access-code'));
    });
  } finally { restore(); }
});
test('per-client and daily limits stop additional model calls', async () => {
  const restore = environment({ AI_REQUESTS_PER_MINUTE: '1', AI_DAILY_REQUEST_LIMIT: '1', ASSISTANT_ACCESS_TOKEN: undefined });
  let calls = 0;
  try {
    const app = express(); app.use('/api/assistant', createAssistantRouter(async () => { calls++; return generated; }));
    await serve(app, async url => {
      assert.equal((await post(url)).status, 200);
      const limited = await post(url); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
      assert.equal(calls, 1);
    });
  } finally { restore(); }
});
test('disconnect cancellation is forwarded to model calls', async () => {
  const app = createApplication(async (_provider, _messages, _system, signal) => {
    await new Promise<void>((_resolve, reject) => {
      signal!.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
    });
    return generated;
  });
  await serve(app, async url => {
    const controller = new AbortController();
    const request = fetch(url + '/api/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: '{"mode":"openai","prompt":"addition"}', signal: controller.signal }).catch(() => null);
    setTimeout(() => controller.abort(), 30);
    assert.equal(await request, null);
  });
});

test('OpenAI SDK sends the structured request and returns model text through the real adapter', async () => {
  const restore = environment({ OPENAI_API_KEY: 'adapter-test-key', OPENAI_MODEL: 'gpt-4.1-mini' });
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url: any, options: any) => {
      assert.equal(String(url), 'https://api.openai.com/v1/responses');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'gpt-4.1-mini'); assert.equal(body.text.format.type, 'json_schema');
      assert.equal(body.store, false);
      return new Response(JSON.stringify({ id: 'resp_test', object: 'response', status: 'completed', output: [{
        type: 'message', id: 'msg_test', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: generated, annotations: [] }],
      }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    const { generate } = await import('../server/providers');
    const text = await generate('openai', [{ role: 'user', text: 'Add numbers' }], 'Tutor');
    assert.equal(text, generated);
  } finally { globalThis.fetch = originalFetch; restore(); }
});
