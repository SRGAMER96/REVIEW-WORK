import React, { useState } from 'react';
import { IUser, ITask, ISubmission, IWithdrawal, IGlobalSettings } from '../types';
import { Database, Users, CheckSquare, Clock, ArrowDownToLine, Settings, RefreshCw, Plus, CheckCircle, XCircle } from 'lucide-react';

interface DatabaseExplorerProps {
  users: IUser[];
  tasks: ITask[];
  submissions: ISubmission[];
  withdrawals: IWithdrawal[];
  settings: IGlobalSettings;
  onResetData: () => void;
  onUpdateSettings: (settings: IGlobalSettings) => void;
  onApproveSubmission: (subId: string) => void;
  onRejectSubmission: (subId: string) => void;
  onApproveWithdrawal: (wdId: string) => void;
  onRejectWithdrawal: (wdId: string) => void;
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  users,
  tasks,
  submissions,
  withdrawals,
  settings,
  onResetData,
  onUpdateSettings,
  onApproveSubmission,
  onRejectSubmission,
  onApproveWithdrawal,
  onRejectWithdrawal,
}) => {
  const [activeCollection, setActiveCollection] = useState<'users' | 'tasks' | 'submissions' | 'withdrawals' | 'settings'>('users');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const pendingSubCount = submissions.filter((s) => s.status === 'pending').length;
  const pendingWdCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              MongoDB Database Inspector
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Connected: localhost:27017
              </span>
            </h2>
            <p className="text-sm text-slate-400">
              Live inspection of MongoDB document collections backing the Telegram Bot. All changes in the chat simulator sync here instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                viewMode === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              JSON Raw
            </button>
          </div>

          <button
            onClick={onResetData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* Collection Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveCollection('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
            activeCollection === 'users'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveCollection('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
            activeCollection === 'tasks'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveCollection('submissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
            activeCollection === 'submissions'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>submissions ({submissions.length})</span>
          {pendingSubCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
              {pendingSubCount} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveCollection('withdrawals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
            activeCollection === 'withdrawals'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>withdrawals ({withdrawals.length})</span>
          {pendingWdCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
              {pendingWdCount} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveCollection('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
            activeCollection === 'settings'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>settings</span>
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {viewMode === 'json' ? (
          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px]">
            <pre>
              {JSON.stringify(
                activeCollection === 'users'
                  ? users
                  : activeCollection === 'tasks'
                  ? tasks
                  : activeCollection === 'submissions'
                  ? submissions
                  : activeCollection === 'withdrawals'
                  ? withdrawals
                  : settings,
                null,
                2
              )}
            </pre>
          </div>
        ) : (
          <div>
            {/* 1. USERS TABLE */}
            {activeCollection === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">Telegram ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                      <th className="py-3 px-4 text-right">Total Earned</th>
                      <th className="py-3 px-4 text-right">Withdrawn</th>
                      <th className="py-3 px-4">Referrals</th>
                      <th className="py-3 px-4">Cancelled Tasks</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-sky-400 font-semibold">{u.telegramId}</td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-medium text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-[11px] text-slate-500">@{u.username || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold tabular-nums">
                          ${u.balance.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 tabular-nums">
                          ${u.totalEarned.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 tabular-nums">
                          ${u.totalWithdrawn.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs">
                          <div>Count: <span className="font-mono text-white">{u.referralCount}</span></div>
                          <div className="text-[11px] text-slate-500">
                            Ref by: {u.referredBy ? <span className="text-sky-400 font-mono">{u.referredBy}</span> : 'None'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {u.cancelledTasks && u.cancelledTasks.length > 0 ? (
                            <span className="text-amber-400 font-mono text-[11px]">
                              {u.cancelledTasks.length} task locked
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.isBanned ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-800">
                              BANNED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ACTIVE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. TASKS TABLE */}
            {activeCollection === 'tasks' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Target Link</th>
                      <th className="py-3 px-4 text-right">Reward</th>
                      <th className="py-3 px-4 text-center">Progress</th>
                      <th className="py-3 px-4">Instructions</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tasks.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-white max-w-[200px] truncate">
                          {t.title}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-sky-400 max-w-[180px] truncate">
                          <a href={t.targetLink} target="_blank" rel="noreferrer" className="underline hover:text-sky-300">
                            {t.targetLink}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400 tabular-nums">
                          ${t.rewardAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {t.completedCount} / {t.maxCompletions}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-[250px] line-clamp-2">
                          {t.instructions}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                              t.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. SUBMISSIONS TABLE */}
            {activeCollection === 'submissions' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Proof Content</th>
                      <th className="py-3 px-4 text-right">Reward</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No submissions recorded yet. Submit a task review in the chat simulator!
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{sub.userFullName}</div>
                            <div className="font-mono text-[11px] text-sky-400">ID: {sub.telegramId}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200 max-w-[180px] truncate">
                            {sub.taskTitle}
                          </td>
                          <td className="py-3 px-4 max-w-[280px]">
                            <div className="text-[11px] text-slate-300 line-clamp-2">
                              {sub.proofContent}
                            </div>
                            {sub.proofCaption && (
                              <div className="text-[10px] text-slate-500 mt-0.5">Caption: {sub.proofCaption}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                            ${sub.rewardAmount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                                sub.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : sub.status === 'rejected'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {sub.status === 'pending' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => onApproveSubmission(sub._id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => onRejectSubmission(sub._id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. WITHDRAWALS TABLE */}
            {activeCollection === 'withdrawals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Destination Address</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No withdrawal requests found.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr key={w._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{w.username || 'User'}</div>
                            <div className="font-mono text-[11px] text-sky-400">ID: {w.telegramId}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                            ${w.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{w.paymentMethod}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[220px] truncate">
                            {w.walletAddress}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                                w.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : w.status === 'rejected'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {w.status === 'pending' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => onApproveWithdrawal(w._id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => onRejectWithdrawal(w._id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium transition-colors"
                                  title="Reject and refund balance to user"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject & Refund</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. SETTINGS FORM */}
            {activeCollection === 'settings' && (
              <div className="p-6 max-w-2xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Global Bot Runtime Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Minimum Withdrawal ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settings.minWithdrawal}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, minWithdrawal: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Referral Commission (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.referralPercent}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, referralPercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Support Telegram Handle</label>
                    <input
                      type="text"
                      value={settings.supportUsername}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, supportUsername: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bot Username</label>
                    <input
                      type="text"
                      value={settings.botUsername}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, botUsername: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
