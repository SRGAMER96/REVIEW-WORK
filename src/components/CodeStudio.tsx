import React, { useState } from 'react';
import { BOT_SOURCE_FILES, BotCodeFile } from '../botFilesBundle';
import { Code, Download, Copy, Check, FileText, Folder, Terminal, Sparkles } from 'lucide-react';
import JSZip from 'jszip';

export const CodeStudio: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<BotCodeFile>(BOT_SOURCE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add each file to the zip archive
      for (const file of BOT_SOURCE_FILES) {
        zip.file(file.path, file.content);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'telegram-review-work-bot.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'core', label: 'Core Bot' },
    { id: 'models', label: 'Mongoose Schemas' },
    { id: 'utils', label: 'Typography Utility' },
    { id: 'config', label: 'Config & Readme' },
    { id: 'deploy', label: 'Docker' },
  ];
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFiles =
    activeCategory === 'all'
      ? BOT_SOURCE_FILES
      : BOT_SOURCE_FILES.filter((f) => f.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Production Source Code Hub
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                Node.js + Telegraf v4 + MongoDB
              </span>
            </h2>
            <p className="text-sm text-slate-400">
              Bug-free, production-grade standalone codebase. Includes mathematical Unicode font transformation, referral engine, and withdrawal handlers.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isZipping ? 'Generating Archive...' : 'Download Bot Project (.zip)'}</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Explorer Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-sky-400" />
              Project Files
            </span>
            <span className="text-[11px] font-mono text-slate-500">{BOT_SOURCE_FILES.length} files</span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeCategory === c.id
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">{file.language}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Terminal Guide Box */}
          <div className="mt-4 pt-3 border-t border-slate-800 bg-slate-950/60 p-3 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Run Command</span>
            </div>
            <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto select-all">
              npm install && npm start
            </pre>
          </div>
        </div>

        {/* Right: Code Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[700px]">
          {/* File Tab Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-mono font-medium text-white">{selectedFile.path}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {selectedFile.language}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed">
            <div className="table w-full">
              {selectedFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row hover:bg-slate-900/50">
                  <span className="table-cell pr-4 text-right select-none text-slate-600 text-[11px] w-10">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre select-text font-mono">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
