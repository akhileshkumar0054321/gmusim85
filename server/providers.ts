import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import type { AIProvider, ChatTurn } from '../src/assistant/offline';

export type FailureReason = 'not-configured' | 'authentication' | 'access' | 'quota' | 'quota-exhausted' | 'model' | 'timeout' | 'network' | 'invalid-response';
export class ProviderError extends Error {
  constructor(readonly reason: FailureReason) { super(reason); }
}
export function failureReason(error: unknown): FailureReason {
  if (error instanceof ProviderError) return error.reason;
  const value = error as { status?: number; name?: string; code?: string };
  if (value?.status === 401) return 'authentication';
  if (value?.status === 403) return 'access';
  if (value?.status === 429) return value.code === 'insufficient_quota' ? 'quota-exhausted' : 'quota';
  if (value?.status === 404) return 'model';
  if (value?.name === 'TimeoutError' || value?.name === 'AbortError' || value?.name === 'APIConnectionTimeoutError') return 'timeout';
  return 'network';
}
export type Generator = (provider: AIProvider, messages: ChatTurn[], system: string, signal?: AbortSignal) => Promise<string>;
export const ANSWER_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['text', 'code'],
  properties: { text: { type: 'string' }, code: { type: 'string' } },
};

export function openAIRequest(messages: ChatTurn[], system: string) {
  return {
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    instructions: system,
    input: messages.map(turn => ({ role: turn.role, content: turn.text })),
    store: false,
    max_output_tokens: 4096,
    text: { format: { type: 'json_schema' as const, name: 'assembly_answer', strict: true, schema: ANSWER_SCHEMA } },
  };
}

export const generate: Generator = async (provider, messages, system, outerSignal) => {
  const timeout = AbortSignal.timeout(provider === 'ollama' ? 65000 : 18000);
  const signal = outerSignal ? AbortSignal.any([outerSignal, timeout]) : timeout;
  signal.throwIfAborted();
  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new ProviderError('not-configured');
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 18000, maxRetries: 0 });
    const response = await ai.responses.create(openAIRequest(messages, system), { signal });
    if (response.status !== 'completed' || !response.output_text) throw new ProviderError('invalid-response');
    return response.output_text;
  }
  if (provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) throw new ProviderError('not-configured');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 18000 } });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      contents: messages.map(turn => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.text }] })),
      config: { systemInstruction: system, temperature: 0.15, maxOutputTokens: 4096, responseMimeType: 'application/json', abortSignal: signal },
    });
    if (!response.text) throw new ProviderError('invalid-response');
    return response.text;
  }
  // The local target is fixed; request bodies cannot choose arbitrary backend URLs.
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b', stream: false, format: 'json',
      options: { temperature: 0.15, num_predict: 4096 },
      messages: [{ role: 'system', content: system }, ...messages.map(turn => ({ role: turn.role, content: turn.text }))],
    }),
  });
  if (!response.ok) throw new ProviderError('model');
  const data = await response.json();
  if (!data.message?.content) throw new ProviderError('invalid-response');
  return data.message.content;
};
