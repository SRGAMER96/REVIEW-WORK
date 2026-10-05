import React, { useState } from 'react';
import { TelegramSimulator } from './components/TelegramSimulator';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { CodeStudio } from './components/CodeStudio';
import { UnicodeStudio } from './components/UnicodeStudio';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { LiveBotRunner } from './components/LiveBotRunner';
import {
  INITIAL_USERS,
  INITIAL_TASKS,
  INITIAL_SUBMISSIONS,
  INITIAL_WITHDRAWALS,
  INITIAL_SETTINGS,
} from './mockData';
import { IUser, ITask, ISubmission, IWithdrawal, IGlobalSettings } from './types';
import { BOT_SOURCE_FILES } from './botFilesBundle';
import {
  Bot,
  Database,
  Code2,
  Sparkles,
  Layers,
  Download,
  CheckCircle,
  ExternalLink,
  Radio,
  Play,
} from 'lucide-react';
import JSZip from 'jszip';

export default function App() {
  const [activeTab, setActiveTab] = useState<'runner' | 'simulator' | 'database' | 'code' | 'unicode' | 'architecture'>('runner');

  // Shared Application State representing the live MongoDB database
  const [users, setUsers] = useState<IUser[]>(INITIAL_USERS);
  const [tasks, setTasks] = useState<ITask[]>(INITIAL_TASKS);
  const [submissions, setSubmissions] = useState<ISubmission[]>(INITIAL_SUBMISSIONS);
  const [withdrawals, setWithdrawals] = useState<IWithdrawal[]>(INITIAL_WITHDRAWALS);
  const [settings, setSettings] = useState<IGlobalSettings>(INITIAL_SETTINGS);

  const [isZipping, setIsZipping] = useState(false);

  const handleResetData = () => {
    setUsers(INITIAL_USERS);
    setTasks(INITIAL_TASKS);
    setSubmissions(INITIAL_SUBMISSIONS);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setSettings(INITIAL_SETTINGS);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
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

  // Direct actions from Database Explorer
  const handleApproveSubmission = (subId: string) => {
    const sub = submissions.find((s) => s._id === subId);
    if (!sub || sub.status !== 'pending') return;

    setSubmissions((prev) =>
      prev.map((s) => (s._id === subId ? { ...s, status: 'approved' } : s))
    );

    setTasks((prev) =>
      prev.map((t) => (t._id === sub.taskId ? { ...t, completedCount: t.completedCount + 1 } : t))
    );

    const worker = users.find((u) => u.telegramId === sub.telegramId);
    if (worker) {
      setUsers((prev) =>
        prev.map((u) =>
          u.telegramId === sub.telegramId
            ? { ...u, balance: u.balance + sub.rewardAmount, totalEarned: u.totalEarned + sub.rewardAmount }
            : u
        )
      );

      if (worker.referredBy) {
        const bonus = (sub.rewardAmount * settings.referralPercent) / 100;
        setUsers((prev) =>
          prev.map((u) =>
            u.telegramId === worker.referredBy
              ? {
                  ...u,
                  balance: u.balance + bonus,
                  totalEarned: u.totalEarned + bonus,
                  referralEarnings: u.referralEarnings + bonus,
                }
              : u
          )
        );
      }
    }
  };

  const handleRejectSubmission = (subId: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s._id === subId ? { ...s, status: 'rejected' } : s))
    );
  };

  const handleApproveWithdrawal = (wdId: string) => {
    const wd = withdrawals.find((w) => w._id === wdId);
    if (!wd || wd.status !== 'pending') return;

    setWithdrawals((prev) =>
      prev.map((w) => (w._id === wdId ? { ...w, status: 'approved' } : w))
    );

    setUsers((prev) =>
      prev.map((u) =>
        u.telegramId === wd.telegramId ? { ...u, totalWithdrawn: u.totalWithdrawn + wd.amount } : u
      )
    );
  };

  const handleRejectWithdrawal = (wdId: string) => {
    const wd = withdrawals.find((w) => w._id === wdId);
    if (!wd || wd.status !== 'pending') return;

    setWithdrawals((prev) =>
      prev.map((w) => (w._id === wdId ? { ...w, status: 'rejected' } : w))
    );

    // Refund back to user balance
    setUsers((prev) =>
      prev.map((u) =>
        u.telegramId === wd.telegramId ? { ...u, balance: u.balance + wd.amount } : u
      )
    );
  };

  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Bar Contract (3 zones) */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Bot className="w-5 h-5" />
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('simulator');
              }}
              className="text-base font-bold tracking-tight text-white hover:text-sky-300 transition-colors"
            >
              Telegram Bot Studio
            </a>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('runner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'runner'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/80 shadow-sm'
                  : 'text-emerald-400/90 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>🚀 Run Live Bot</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Web Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 relative ${
                activeTab === 'database'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>MongoDB Explorer</span>
              {(pendingSubmissionsCount > 0 || pendingWithdrawalsCount > 0) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Code Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('unicode')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'unicode'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unicode Typography</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture &amp; Docs</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Archiving...' : 'Download Bot (.zip)'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'runner' && <LiveBotRunner />}

        {activeTab === 'simulator' && (
          <TelegramSimulator
            users={users}
            tasks={tasks}
            submissions={submissions}
            withdrawals={withdrawals}
            settings={settings}
            onUpdateUsers={setUsers}
            onUpdateTasks={setTasks}
            onUpdateSubmissions={setSubmissions}
            onUpdateWithdrawals={setWithdrawals}
            onUpdateSettings={setSettings}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseExplorer
            users={users}
            tasks={tasks}
            submissions={submissions}
            withdrawals={withdrawals}
            settings={settings}
            onResetData={handleResetData}
            onUpdateSettings={setSettings}
            onApproveSubmission={handleApproveSubmission}
            onRejectSubmission={handleRejectSubmission}
            onApproveWithdrawal={handleApproveWithdrawal}
            onRejectWithdrawal={handleRejectWithdrawal}
          />
        )}

        {activeTab === 'code' && <CodeStudio />}

        {activeTab === 'unicode' && <UnicodeStudio />}

        {activeTab === 'architecture' && <ArchitectureGuide />}
      </main>

      {/* Quiet, unboxed footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Telegraf v4</span>
            <span aria-hidden="true">·</span>
            <span>MongoDB Mongoose</span>
            <span aria-hidden="true">·</span>
            <span>Mathematical Sans-Serif Bold Unicode</span>
            <span aria-hidden="true">·</span>
            <span>Node.js 20</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Production-ready Telegram Review Work Bot Script &amp; Schemas
          </div>
        </div>
      </footer>
    </div>
  );
}
