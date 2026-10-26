import React, { useEffect, useRef, useState } from 'react';

interface ProgramHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}
type FileWindow = Window & {
  showOpenFilePicker?: (options: object) => Promise<ProgramHandle[]>;
  showSaveFilePicker?: (options: object) => Promise<ProgramHandle>;
};
const types = [{ description: '8085 assembly program', accept: { 'text/plain': ['.asm', '.txt'] } }];

export function useProgramFiles(code: string, replace: (source: string) => void, report: (message: string) => void) {
  const [name, setName] = useState('program.asm');
  const [savedCode, setSavedCode] = useState(code);
  const [handle, setHandle] = useState<ProgramHandle | null>(null);
  const [saveName, setSaveName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dirty = code !== savedCode;
  const mayReplace = () => !dirty || window.confirm('Discard unsaved changes? Save your program first if you want to keep them.');
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const failure = (cause: unknown) => {
    if ((cause as { name?: string })?.name !== 'AbortError') report('File operation failed. Check file permissions and try again.');
  };
  const load = async (file: File, nextHandle: ProgramHandle | null) => {
    if (file.size > 1024 * 1024) { report('Program is too large. Choose a text file under 1 MB.'); return; }
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
    replace(source); setSavedCode(source); setName(file.name); setHandle(nextHandle);
    report(`Opened ${file.name}`);
  };
  const open = async () => {
    if (busy || !mayReplace()) return;
    const picker = (window as FileWindow).showOpenFilePicker;
    if (!picker) { input.current?.click(); return; }
    setBusy(true);
    try { const [next] = await picker.call(window, { types, multiple: false }); await load(await next.getFile(), next); }
    catch (cause) { failure(cause); }
    finally { setBusy(false); }
  };
  const save = async (as = false) => {
    if (busy) return;
    const picker = (window as FileWindow).showSaveFilePicker;
    if ((as || !handle) && !picker) { setSaveName(name); setError(''); return; }
    setBusy(true);
    const snapshot = code;
    try {
      const target = !as && handle ? handle : await picker!.call(window, { suggestedName: name, types });
      const writable = await target.createWritable();
      await writable.write(snapshot); await writable.close();
      setHandle(target); setName(target.name); setSavedCode(snapshot); report(`Saved ${target.name}`);
    } catch (cause) { failure(cause); }
    finally { setBusy(false); }
  };
  const create = () => {
    if (busy || !mayReplace()) return;
    const source = '; New 8085 Assembly Program\n\n        NOP\n        HLT\n';
    replace(source); setSavedCode(''); setName('untitled.asm'); setHandle(null); report('New program created. Use Save to choose a file on your computer.');
  };
  const controls = <>
    <input ref={input} type="file" accept=".asm,.txt,text/plain" aria-label="Open program from computer" hidden
      onChange={async event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
        if (!file) return;
        setBusy(true);
        try { await load(file, null); } catch (cause) { failure(cause); } finally { setBusy(false); }
      }} />
    {saveName !== null && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25">
      <form role="dialog" aria-modal="true" aria-label="Save program as" className="w-80 border border-[#99978f] bg-[#edece8] p-4 shadow-lg text-xs"
        onSubmit={event => {
          event.preventDefault();
          let filename = saveName.trim();
          if (!filename || /[\\/:*?"<>|\x00-\x1f]/.test(filename) || /^\.+$/.test(filename)) { setError('Enter a valid filename without folder separators.'); return; }
          if (!/\.(asm|txt)$/i.test(filename)) filename += '.asm';
          try {
            const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
            const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setName(filename); setHandle(null); setSavedCode(code); setSaveName(null);
            report(`Download requested: ${filename}. Check your browser downloads.`);
          } catch (cause) { failure(cause); }
        }}>
        <h2 className="font-bold mb-3">Save program as</h2>
        <label>File name<input autoFocus aria-label="Program filename" className="gtk-input w-full mt-1" value={saveName} onChange={event => setSaveName(event.target.value)} /></label>
        <p className="my-2">Your browser will download the file. Its settings control the save location.</p>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 mt-3"><button type="button" className="gtk-btn" onClick={() => setSaveName(null)}>Cancel</button><button className="gtk-btn" type="submit">Download file</button></div>
      </form>
    </div>}
  </>;
  return { name, dirty, open, save, create, controls };
}
