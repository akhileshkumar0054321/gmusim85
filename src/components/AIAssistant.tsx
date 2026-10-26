import React, { useEffect, useRef, useState } from 'react';
import { Plus, X, Send, Square, Bot, Copy, FileCode2 } from 'lucide-react';
import { offlineReply, validateReply, type AssistantReply, type AssistantMode, type ChatTurn } from '../assistant/offline';

interface Message { id: number; role: 'user' | 'assistant'; text: string; reply?: AssistantReply }
export function AIAssistant({ editorCode, onUseCode }: { editorCode: string; onUseCode: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('auto');
  const [prompt, setPrompt] = useState('');
  const [includeCode, setIncludeCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [tokenRequired, setTokenRequired] = useState(false);
  const [configuration, setConfiguration] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/assistant/status', { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(status => {
      if (!status || controller.signal.aborted) return;
      setTokenRequired(!!status.accessTokenRequired);
      const providers = [status.openaiConfigured ? 'OpenAI' : '', status.geminiConfigured ? 'Gemini' : '', status.localEnabled ? 'Local AI' : ''].filter(Boolean);
      setConfiguration(providers.length ? providers.join(', ') + ' configured on server' : 'No AI key configured on server. Offline programs are available.');
    }).catch(() => { if (!controller.signal.aborted) setConfiguration('AI server unreachable. Offline programs remain available.'); });
    return () => controller.abort();
  }, [open]);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages, busy, open]);

  const ask = async (question = prompt) => {
    const text = question.trim();
    if (!text || busy) return;
    const history: ChatTurn[] = messages.slice(-8).map(message => ({ role: message.role, text: (message.text + (message.reply?.code ? '\n' + message.reply.code : '')).slice(0, 6000) }));
    setMessages(previous => [...previous.slice(-39), { id: sequence.current++, role: 'user', text }]);
    setPrompt(''); setBusy(true); setNotice('');
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 90000);
    let reply: AssistantReply;
    try {
      if (mode === 'offline' || (['openai', 'gemini'].includes(mode) && navigator.onLine === false)) {
        reply = offlineReply(text, includeCode ? editorCode : '');
      } else {
        const response = await fetch('/api/assistant/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { 'X-Assistant-Token': accessToken } : {}) }, signal: controller.signal,
          body: JSON.stringify({ prompt: text, mode: mode === 'auto' && navigator.onLine === false ? 'ollama' : mode, history, editorCode: includeCode ? editorCode : '' }),
        });
        if (!response.ok) {
          if (response.status === 401) { setTokenRequired(true); throw new Error('access-code'); }
          if (response.status === 429) throw new Error('rate-limit');
          throw new Error('unavailable');
        }
        const data = await response.json();
        if (!data || typeof data.text !== 'string' || !['openai', 'gemini', 'ollama', 'offline'].includes(data.provider) ||
          (data.code !== undefined && typeof data.code !== 'string')) throw new Error('invalid-response');
        reply = validateReply(data);
      }
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous, { id: sequence.current++, role: 'assistant', text: reply.text, reply }]);
      }
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') setNotice('Response stopped.');
      else {
        reply = { ...offlineReply(text, includeCode ? editorCode : ''), notice: error instanceof Error && error.message === 'access-code'
          ? 'An assistant access code is required. Enter it above to use AI. Showing offline help.'
          : error instanceof Error && error.message === 'rate-limit'
          ? 'Assistant usage limit reached. Try later or use Offline programs. Showing offline help.'
          : 'AI service is unreachable or timed out. Showing built-in offline help.' };
        setMessages(previous => [...previous, { id: sequence.current++, role: 'assistant', text: reply.text, reply }]);
      }
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      setBusy(false);
    }
  };

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setNotice('Code copied.'); }
    catch { setNotice('Copy is unavailable here. Select the code and copy it, or use it in the editor.'); }
  };

  return <>
    <button type="button" aria-label={open ? 'Hide AI assistant' : 'Open AI assistant'} aria-expanded={open}
      onClick={() => setOpen(value => !value)}
      className="p-1 flex items-center justify-center rounded-xs border border-transparent text-[#2e3436] hover:bg-[#dfddd7] hover:border-[#b8b6b0] cursor-pointer"
      title="8085 AI assistant">
      <Plus size={16} />
    </button>
    {open && <section role="dialog" aria-modal="false" aria-label="8085 AI assistant"
      className="fixed right-3 top-20 z-50 flex w-[min(460px,calc(100vw-32px))] h-[min(680px,calc(100dvh-100px))] flex-col rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xl select-text overflow-hidden">
      <header className="flex items-center gap-2 bg-[#204a87] px-4 py-3 text-white">
        <Bot size={20} /><div className="flex-1"><h2 className="text-sm font-bold">8085 code assistant</h2><p className="text-[11px] text-blue-100">Ask, inspect, then use code in your simulator</p></div>
        <button type="button" aria-label="Close assistant" title="Hide assistant" onClick={() => setOpen(false)} className="p-1"><X size={18} /></button>
      </header>
      <div className="space-y-2 border-b bg-slate-50 px-3 py-2 text-xs">
        <label className="flex items-center justify-between gap-2">Mode
          <select aria-label="Assistant mode" value={mode} onChange={event => setMode(event.target.value as AssistantMode)} className="rounded border bg-white p-1">
            <option value="auto">Auto (OpenAI first)</option><option value="openai">OpenAI (internet)</option><option value="gemini">Gemini (internet)</option>
            <option value="ollama">Local AI (Ollama)</option><option value="offline">Offline programs</option>
          </select>
        </label>
        <p className="text-[11px] text-slate-600">{mode === 'offline' ? 'Tested examples and instruction help. No internet or model needed.'
          : mode === 'ollama' ? 'For custom offline answers: run this app locally with Ollama and a downloaded model.'
          : 'OpenAI and Gemini need internet. Provider failures fall back to clearly labelled offline help.'}</p>
        {configuration && <p className="text-[10px] text-slate-500">{configuration}</p>}
        {tokenRequired && <label className="flex items-center gap-2">Access code<input aria-label="Assistant access code" type="password" autoComplete="off" value={accessToken} maxLength={256} onChange={event => setAccessToken(event.target.value)} className="min-w-0 flex-1 rounded border bg-white p-1" /></label>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={includeCode} onChange={event => setIncludeCode(event.target.checked)} />Include current editor code with my question</label>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
        {!messages.length && <div className="space-y-3 rounded-lg bg-blue-50 p-3 text-xs">
          <p>Generate 8085 programs, ask about flags, or include your editor code to explain and debug it. Code is checked by this simulator’s assembler before you can use it.</p>
          <div className="flex flex-wrap gap-2">{['Add two 8-bit numbers', 'Multiply two 8-bit numbers', 'CALL RET subroutine', 'Explain flags'].map(question =>
            <button key={question} type="button" onClick={() => void ask(question)} disabled={busy} className="rounded-full border border-blue-200 bg-white px-2 py-1 text-blue-800">{question}</button>)}</div>
        </div>}
        {messages.map(message => <article key={message.id} className={`rounded-lg p-3 text-xs ${message.role === 'user' ? 'ml-8 bg-blue-50' : 'bg-slate-50 border border-slate-200'}`}>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-500">{message.role === 'user' ? 'You' : message.reply?.provider === 'openai' ? 'OpenAI' : message.reply?.provider === 'gemini' ? 'Gemini' : message.reply?.provider === 'ollama' ? 'Local AI · Ollama' : 'Offline program library'}</div>
          {message.reply?.notice && <p className="mb-2 rounded bg-amber-50 p-2 text-amber-800">{message.reply.notice}</p>}
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          {message.reply?.code && <div className="mt-2 space-y-2">
            <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100"><code>{message.reply.code}</code></pre>
            <p className={message.reply.errors?.length ? 'text-red-700' : 'text-emerald-700'}>{message.reply.errors?.length ? 'Assembly errors — ask for a correction:\n' + message.reply.errors.join('\n') : 'Assembler check passed · test inputs and results before relying on it.'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyCode(message.reply!.code!)} className="flex items-center gap-1 rounded border bg-white px-2 py-1"><Copy size={12} />Copy code</button>
              <button type="button" disabled={!!message.reply.errors?.length} onClick={() => { onUseCode(message.reply!.code!); setNotice('Code loaded into editor. Press Assemble, then Run.'); }}
                className="flex items-center gap-1 rounded bg-[#3465a4] px-2 py-1 text-white disabled:opacity-40"><FileCode2 size={12} />Use code (replace editor)</button>
            </div>
          </div>}
        </article>)}
        {busy && <p role="status" className="text-xs text-slate-500">{mode === 'ollama' ? 'Local model is thinking; first load can take a moment…' : 'Preparing your answer…'}</p>}
        <div ref={bottom} />
      </div>
      {notice && <p role="status" className="px-3 py-1 text-xs text-blue-800">{notice}</p>}
      <form onSubmit={event => { event.preventDefault(); void ask(); }} className="border-t bg-white p-3">
        <textarea aria-label="Ask the 8085 assistant" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={4000} rows={2}
          placeholder="e.g. Multiply two 8-bit numbers; store the 16-bit result…"
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(); } }}
          className="w-full resize-none rounded border border-slate-300 p-2 text-xs outline-none focus:border-blue-500" />
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          <button type="button" disabled={busy || !messages.length} onClick={() => { setMessages([]); setNotice(''); }} className="text-slate-500 disabled:opacity-40">Clear chat</button>
          {busy ? <button type="button" aria-label="Stop assistant response" onClick={() => abortRef.current?.abort()} className="flex items-center gap-1 rounded border px-3 py-1.5"><Square size={12} />Stop</button>
            : <button type="submit" disabled={!prompt.trim()} className="flex items-center gap-1 rounded bg-[#3465a4] px-3 py-1.5 text-white disabled:opacity-40"><Send size={12} />Send</button>}
        </div>
      </form>
    </section>}
  </>;
}
