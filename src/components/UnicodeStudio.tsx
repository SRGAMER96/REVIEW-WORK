import React, { useState } from 'react';
import { toSansBold, toSansItalic, toSansBoldItalic, STYLED_LABELS } from '../utils/unicode';
import { Copy, Check, Sparkles, Type } from 'lucide-react';

export const UnicodeStudio: React.FC = () => {
  const [inputText, setInputText] = useState('Review Work Bot');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const boldText = toSansBold(inputText);
  const italicText = toSansItalic(inputText);
  const boldItalicText = toSansBoldItalic(inputText);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const presetLabels = [
    { label: 'Review Work', styled: STYLED_LABELS.REVIEW_WORK },
    { label: 'Balance', styled: STYLED_LABELS.BALANCE },
    { label: 'Profile', styled: STYLED_LABELS.PROFILE },
    { label: 'Refer', styled: STYLED_LABELS.REFER },
    { label: 'Withdraw', styled: STYLED_LABELS.WITHDRAW },
    { label: 'Support', styled: STYLED_LABELS.SUPPORT },
    { label: 'Admin Panel', styled: STYLED_LABELS.ADMIN_PANEL },
    { label: 'Broadcast', styled: STYLED_LABELS.BROADCAST },
    { label: 'Add Review Work', styled: STYLED_LABELS.ADD_WORK },
    { label: 'Delete Review Work', styled: STYLED_LABELS.DELETE_WORK },
    { label: 'Ban User', styled: STYLED_LABELS.BAN_USER },
    { label: 'Unban User', styled: STYLED_LABELS.UNBAN_USER },
    { label: 'User Info', styled: STYLED_LABELS.USER_INFO },
    { label: 'Add Balance', styled: STYLED_LABELS.ADD_BALANCE },
    { label: 'Remove Balance', styled: STYLED_LABELS.REMOVE_BALANCE },
    { label: 'Set Referral %', styled: STYLED_LABELS.SET_REFERRAL },
    { label: 'Set Min Withdrawal', styled: STYLED_LABELS.SET_MIN_WITHDRAWAL },
    { label: 'Statistics', styled: STYLED_LABELS.STATISTICS },
    { label: 'Done', styled: STYLED_LABELS.CONFIRM_DONE },
    { label: 'Cancel', styled: STYLED_LABELS.CANCEL },
    { label: 'Submit Proof', styled: STYLED_LABELS.SUBMIT_PROOF },
    { label: 'Approve', styled: STYLED_LABELS.APPROVE },
    { label: 'Reject', styled: STYLED_LABELS.REJECT },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Unicode Mathematical Sans-Serif Typography Studio
            </h2>
            <p className="text-sm text-slate-400">
              Transform standard ASCII letters and numbers into clean, stylish Unicode Sans-Serif Bold & Italic characters. 100% compatible with Telegram mobile & desktop clients.
            </p>
          </div>
        </div>
      </div>

      {/* Live Converter */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Enter Your Plain Text
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type any word or phrase..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Bold */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold uppercase tracking-wider text-sky-400">Sans-Serif Bold</span>
                <span className="text-[11px] text-slate-500">U+1D5D4 - U+1D607</span>
              </div>
              <div className="text-lg text-white font-normal py-2 select-all break-words">
                {boldText || <span className="text-slate-600 italic">Preview will appear here</span>}
              </div>
            </div>
            <button
              onClick={() => handleCopy(boldText, 'bold')}
              className="mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
            >
              {copiedType === 'bold' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Styled Bold</span>
                </>
              )}
            </button>
          </div>

          {/* Italic */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold uppercase tracking-wider text-amber-400">Sans-Serif Italic</span>
                <span className="text-[11px] text-slate-500">U+1D608 - U+1D63B</span>
              </div>
              <div className="text-lg text-white font-normal py-2 select-all break-words">
                {italicText || <span className="text-slate-600 italic">Preview will appear here</span>}
              </div>
            </div>
            <button
              onClick={() => handleCopy(italicText, 'italic')}
              className="mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
            >
              {copiedType === 'italic' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Styled Italic</span>
                </>
              )}
            </button>
          </div>

          {/* Bold Italic */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold uppercase tracking-wider text-purple-400">Sans Bold Italic</span>
                <span className="text-[11px] text-slate-500">U+1D63C - U+1D66F</span>
              </div>
              <div className="text-lg text-white font-normal py-2 select-all break-words">
                {boldItalicText || <span className="text-slate-600 italic">Preview will appear here</span>}
              </div>
            </div>
            <button
              onClick={() => handleCopy(boldItalicText, 'bolditalic')}
              className="mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
            >
              {copiedType === 'bolditalic' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Bold Italic</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Bot Button Labels */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Preset Styled Bot Buttons & Badges</h3>
          </div>
          <span className="text-xs text-slate-400">{presetLabels.length} Active Bot Buttons</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {presetLabels.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg group hover:border-slate-700 transition-colors"
            >
              <div className="truncate pr-2">
                <div className="text-[11px] text-slate-500">{item.label}</div>
                <div className="text-sm font-medium text-slate-200 truncate">{item.styled}</div>
              </div>
              <button
                onClick={() => handleCopy(item.styled, `preset_${idx}`)}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Copy styled string"
              >
                {copiedType === `preset_${idx}` ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
