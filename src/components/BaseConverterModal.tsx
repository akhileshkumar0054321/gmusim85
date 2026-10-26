import React, { useState } from 'react';
import { X, ArrowRightLeft, Calculator } from 'lucide-react';

interface BaseConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BaseConverterModal: React.FC<BaseConverterModalProps> = ({ isOpen, onClose }) => {
  const [valDec, setValDec] = useState<string>('255');
  const [valHex, setValHex] = useState<string>('00FF');
  const [valBin, setValBin] = useState<string>('0000000011111111');
  const [valOct, setValOct] = useState<string>('377');
  const [valAscii, setValAscii] = useState<string>('');
  const [is16Bit, setIs16Bit] = useState<boolean>(true);

  if (!isOpen) return null;

  const updateFromNumber = (n: number) => {
    const mask = is16Bit ? 0xffff : 0xff;
    const clamped = n & mask;

    setValDec(clamped.toString(10));
    setValHex(clamped.toString(16).toUpperCase().padStart(is16Bit ? 4 : 2, '0'));
    setValBin(clamped.toString(2).padStart(is16Bit ? 16 : 8, '0'));
    setValOct(clamped.toString(8));
    setValAscii(clamped >= 32 && clamped <= 126 ? String.fromCharCode(clamped) : '•');
  };

  const handleDecChange = (str: string) => {
    setValDec(str);
    const n = parseInt(str, 10);
    if (!isNaN(n)) updateFromNumber(n);
  };

  const handleHexChange = (str: string) => {
    setValHex(str);
    const n = parseInt(str.replace(/h$/i, ''), 16);
    if (!isNaN(n)) updateFromNumber(n);
  };

  const handleBinChange = (str: string) => {
    setValBin(str);
    const n = parseInt(str.replace(/b$/i, ''), 2);
    if (!isNaN(n)) updateFromNumber(n);
  };

  const handleOctChange = (str: string) => {
    setValOct(str);
    const n = parseInt(str.replace(/[oq]$/i, ''), 8);
    if (!isNaN(n)) updateFromNumber(n);
  };

  const numVal = parseInt(valDec, 10) || 0;
  const twosComp8 = ((~numVal + 1) & 0xff).toString(16).toUpperCase().padStart(2, '0');
  const twosComp16 = ((~numVal + 1) & 0xffff).toString(16).toUpperCase().padStart(4, '0');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 font-mono text-xs">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-200 text-sm font-sans">
              GNUSim8085 Base Converter
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5">
          {/* Bit Width Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-sans">
            <span className="text-slate-400 text-xs">Register Bit Width:</span>
            <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded text-xs">
              <button
                onClick={() => {
                  setIs16Bit(false);
                  updateFromNumber(numVal & 0xff);
                }}
                className={`px-3 py-1 rounded transition-colors ${
                  !is16Bit ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                8-bit (Byte)
              </button>
              <button
                onClick={() => {
                  setIs16Bit(true);
                  updateFromNumber(numVal & 0xffff);
                }}
                className={`px-3 py-1 rounded transition-colors ${
                  is16Bit ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                16-bit (Word)
              </button>
            </div>
          </div>

          {/* Decimal */}
          <div>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
              Decimal (Base 10)
            </label>
            <input
              type="text"
              value={valDec}
              onChange={(e) => handleDecChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Hexadecimal */}
          <div>
            <label className="text-[11px] text-amber-400 font-semibold mb-1 block">
              Hexadecimal (Base 16)
            </label>
            <input
              type="text"
              value={valHex}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-amber-300 font-mono text-sm outline-none focus:border-amber-500 uppercase tracking-wider"
            />
          </div>

          {/* Binary */}
          <div>
            <label className="text-[11px] text-cyan-400 font-semibold mb-1 block">
              Binary (Base 2)
            </label>
            <input
              type="text"
              value={valBin}
              onChange={(e) => handleBinChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-500 tracking-wider"
            />
          </div>

          {/* Octal & ASCII */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                Octal (Base 8)
              </label>
              <input
                type="text"
                value={valOct}
                onChange={(e) => handleOctChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                ASCII Character
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-emerald-400 font-mono text-sm h-8 flex items-center">
                {valAscii || '•'}
              </div>
            </div>
          </div>

          {/* Two's Complement */}
          <div className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-sans font-semibold">
              Two's Complement:
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">8-bit negative:</span>
              <span className="text-rose-400 font-semibold">{twosComp8}H</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">16-bit negative:</span>
              <span className="text-rose-400 font-semibold">{twosComp16}H</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-sans transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
