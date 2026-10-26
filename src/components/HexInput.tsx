import React, { useState } from 'react';

export function HexInput({ value, digits, label, onCommit }: {
  value: number; digits: number; label: string; onCommit: (value: number) => void;
}) {
  const formatted = value.toString(16).toUpperCase().padStart(digits, '0');
  // Only keep a draft while editing; otherwise render the current CPU byte directly.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const text = (draft ?? formatted).trim().replace(/^0x/i, '').replace(/h$/i, '');
    if (new RegExp(`^[0-9a-f]{1,${digits}}$`, 'i').test(text)) {
      if (parseInt(text, 16) !== value) onCommit(parseInt(text, 16));
    }
    setDraft(null);
  };
  return <input aria-label={label} title={`${label} (hexadecimal, Enter or blur to save)`}
    className="w-14 border border-[#b8b6b0] bg-white px-1 text-right font-mono text-xs"
    value={draft ?? formatted} onChange={event => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') setDraft(null);
    }} />;
}

export function DecimalByteInput({ value, label, onCommit }: {
  value: number; label: string; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input aria-label={label} title="Decimal byte (0–255)" value={draft ?? String(value)}
    className="w-14 border border-[#b8b6b0] bg-white px-1 text-right font-mono text-xs"
    onChange={event => setDraft(event.target.value)}
    onBlur={() => {
      const text = (draft ?? String(value)).trim();
      const parsed = /^\d{1,3}$/.test(text) ? Number(text) : NaN;
      if (Number.isInteger(parsed) && parsed <= 255 && parsed !== value) onCommit(parsed);
      setDraft(null);
    }} onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') setDraft(null);
    }} />;
}
