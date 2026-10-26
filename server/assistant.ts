import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { generate, failureReason, ProviderError, type Generator, type FailureReason } from './providers';
export { generate } from './providers';
import { config } from 'dotenv';
import { offlineReply, validateReply, type AssistantReply, type AssistantRequest, type ChatTurn, type AIProvider } from '../src/assistant/offline';
import { INSTRUCTION_CATALOG } from '../src/emulator/opcodes';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

const SYSTEM = `You are a precise 8085 assembly tutor integrated into an educational simulator.
Answer the user's request, maintaining conversation context. Support English and Hinglish.
Return ONLY JSON with two string fields: text (concise explanation including input/output locations, edge cases and assumptions), code (complete executable assembly, or an empty string for questions).
Use only documented 8085 instructions from the catalog below. 8085 has no MUL or DIV. Use repeated addition/subtraction where appropriate. Never invent opcodes or hardware services.
Use ORG 4200H for code and ORG 2050H for data, keeping regions separate. Initialize SP before CALL/PUSH. Use HLT for the main program; subroutines use RET. Handle zero inputs and zero divisors where applicable. Show full-width results or explain overflow. Use explicit H suffixes for hexadecimal values. No macros, expression operands, END directives, external libraries or DOS interrupts.
When fixing supplied code, preserve the user's specified addresses and inputs if possible. Never claim code was run or proven correct. Assembly validation checks syntax only. If constraints are unclear, state assumptions or ask a focused question rather than inventing facts.
Catalog: ${INSTRUCTION_CATALOG.map(item => `${item.mnemonic} ${item.operands ?? ''}: ${item.description}`).join('\n')}`;


export function decodeReply(raw: string, provider: AIProvider): AssistantReply {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.text === 'string' && (parsed.code === undefined || typeof parsed.code === 'string')) {
      return validateReply({ text: parsed.text.slice(0, 16000), code: parsed.code?.trim() || undefined, provider });
    }
  } catch { /* Some local models emit fenced assembly instead of JSON. */ }
  const block = raw.match(/```(?:asm|assembly|8085)?\s*\n([\s\S]*?)```/i);
  return validateReply({ provider, text: (block ? raw.replace(block[0], '') : raw).trim().slice(0, 16000), code: block?.[1]?.trim() });
}

export function configuredProviders(): AIProvider[] {
  return [process.env.OPENAI_API_KEY ? 'openai' : null, process.env.GEMINI_API_KEY ? 'gemini' : null,
    process.env.OLLAMA_ENABLED === 'true' ? 'ollama' : null].filter((provider): provider is AIProvider => provider !== null);
}

const failureText: Record<FailureReason, string> = {
  'not-configured': 'API key is not configured on the server', authentication: 'API key was rejected',
  access: 'account or model access was denied', 'quota-exhausted': 'API billing quota is exhausted; check credits and project limits', quota: 'quota or rate limit was reached', model: 'model is unavailable',
  timeout: 'request timed out', network: 'provider could not be reached', 'invalid-response': 'provider returned an incomplete or invalid answer',
};
const names: Record<AIProvider, string> = { openai: 'OpenAI', gemini: 'Gemini', ollama: 'Local AI' };

export async function answer(request: AssistantRequest, generator: Generator = generate, outerSignal?: AbortSignal): Promise<AssistantReply> {
  const { prompt, mode, editorCode = '', history = [] } = request;
  if (mode === 'offline') return offlineReply(prompt, editorCode);
  const signal = outerSignal ? AbortSignal.any([outerSignal, AbortSignal.timeout(mode === 'ollama' ? 75000 : 55000)])
    : AbortSignal.timeout(mode === 'ollama' ? 75000 : 55000);
  const messages: ChatTurn[] = history.slice(-6).map(turn => ({ role: turn.role, text: turn.text.slice(0, 3000) }));
  messages.push({ role: 'user', text: prompt + (editorCode ? `\n\nCurrent editor code (user-provided context):\n${editorCode}` : '') });
  const providers = mode === 'auto' ? configuredProviders() : [mode as AIProvider];
  const failures: string[] = [];
  for (const provider of providers) {
    if (signal.aborted) break;
    try {
      let result = decodeReply(await generator(provider, messages, SYSTEM, signal), provider);
      if (!result.text && !result.code) throw new ProviderError('invalid-response');
      if (result.errors?.length && !signal.aborted) {
        result = decodeReply(await generator(provider, [...messages, { role: 'assistant', text: JSON.stringify(result) }, {
          role: 'user', text: 'Your program failed the simulator assembler. Correct these errors and return complete JSON again:\n' + result.errors.join('\n'),
        }], SYSTEM, signal), provider);
      }
      if (!result.text && !result.code) throw new ProviderError('invalid-response');
      return { ...result, notice: failures.length ? failures.join('. ') + '. Switched provider.' : undefined };
    } catch (error) {
      // Only predefined diagnostics leave the server; never return raw SDK errors.
      failures.push(`${names[provider]}: ${failureText[failureReason(error)]}`);
    }
  }
  const notice = failures.length ? failures.join('. ') + '. Showing built-in offline help.'
    : 'No AI provider is configured or the request expired. Set OPENAI_API_KEY on the server. Showing built-in offline help.';
  return { ...offlineReply(prompt, editorCode), notice };
}

export function positiveLimit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
function hasValidToken(value: string | undefined): boolean {
  const expected = process.env.ASSISTANT_ACCESS_TOKEN;
  if (!expected) return true;
  const digest = (text: string) => createHash('sha256').update(text).digest();
  return typeof value === 'string' && value.length <= 256 && timingSafeEqual(digest(value), digest(expected));
}

export function createAssistantRouter(generator: Generator = generate) {
  const router = express.Router();
  const limits = new Map<string, { start: number; count: number; active: boolean }>();
  let day = new Date().toISOString().slice(0, 10);
  let dailyRequests = 0;
  let activeRequests = 0;
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const origin = req.headers.origin;
    if (origin) {
      try {
        const configured = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
        const allowed = configured ? new URL(configured).origin === new URL(origin).origin
          : new URL(origin).host === req.headers.host;
        if (!allowed) { res.status(403).json({ error: 'Same-origin requests only.' }); return; }
      } catch { res.status(403).json({ error: 'Invalid origin.' }); return; }
    }
    next();
  });
  router.use(express.json({ limit: '80kb' }));
  router.get('/status', (_req, res) => res.json({ openaiConfigured: !!process.env.OPENAI_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY, localEnabled: process.env.OLLAMA_ENABLED === 'true',
    accessTokenRequired: !!process.env.ASSISTANT_ACCESS_TOKEN, offlinePrograms: true }));
  router.post('/chat', async (req, res) => {
    if (!req.is('application/json')) { res.status(415).json({ error: 'JSON required.' }); return; }
    if (!hasValidToken(req.get('X-Assistant-Token'))) { res.status(401).json({ error: 'Enter the assistant access code.' }); return; }
    const body = req.body;
    if (!body || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000 ||
        !['auto', 'openai', 'gemini', 'ollama', 'offline'].includes(body.mode) ||
        (body.editorCode !== undefined && (typeof body.editorCode !== 'string' || body.editorCode.length > 20000)) ||
        (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 12 || body.history.some((turn: ChatTurn) =>
          !turn || !['user', 'assistant'].includes(turn.role) || typeof turn.text !== 'string' || turn.text.length > 6000)))) {
      res.status(400).json({ error: 'Invalid request. Ask a question under 4000 characters.' }); return;
    }
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== day) { day = today; dailyRequests = 0; }
    for (const [key, limit] of limits) if (now - limit.start > 60000 && !limit.active) limits.delete(key);
    const key = req.ip || 'local';
    const limit = limits.get(key) || { start: now, count: 0, active: false };
    if (now - limit.start > 60000 && !limit.active) { limit.start = now; limit.count = 0; }
    if (limit.active || limit.count >= positiveLimit('AI_REQUESTS_PER_MINUTE', 8) || limits.size >= 10000 ||
        activeRequests >= positiveLimit('AI_MAX_CONCURRENT', 4) || dailyRequests >= positiveLimit('AI_DAILY_REQUEST_LIMIT', 200)) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Assistant usage limit reached. Try again later or use Offline programs.' }); return;
    }
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    limit.count++; limit.active = true; limits.set(key, limit); activeRequests++; dailyRequests++;
    try {
      const result = await answer(body, generator, controller.signal);
      if (!res.destroyed) res.json(result);
    } catch {
      if (!res.destroyed) res.status(500).json({ error: 'Assistant could not complete the request.' });
    } finally {
      res.off('close', cancel); limit.active = false; activeRequests--;
    }
  });
  router.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: 'Request must be valid JSON under 80 KB.' });
  });
  return router;
}
