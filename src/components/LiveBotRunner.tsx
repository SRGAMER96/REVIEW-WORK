import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  Database,
  User,
  Radio,
  Clock,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';

interface BotState {
  status: 'stopped' | 'starting' | 'running' | 'error';
  tokenMasked: string;
  adminId: number;
  botInfo: any;
  startedAt: string | null;
  uptimeSeconds: number;
  errorMessage: string | null;
  isRemoteMongo: boolean;
  stats: {
    messagesCount: number;
    callbacksCount: number;
    proofsApproved: number;
    withdrawalsProcessed: number;
  };
}

interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export const LiveBotRunner: React.FC = () => {
  const [token, setToken] = useState('8949126540:AAEcBGaulew5JRcODPSHlAjiT39O-Q0B4v0');
  const [adminId, setAdminId] = useState('8962632792');
  const [mongoUri, setMongoUri] = useState('');
  const [supportUsername, setSupportUsername] = useState('SRGAMER96');

  const [status, setStatus] = useState<BotState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tokenTesting, setTokenTesting] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<{ valid?: boolean; botUser?: any; error?: string } | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  // Poll status and logs
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
      const logsRes = await fetch('/api/bot/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (e) {
      console.error('Error fetching bot status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartBot = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          adminId: Number(adminId),
          mongoUri: mongoUri.trim() || undefined,
          supportUsername,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to start bot');
      } else {
        setStatus(data.status);
        await fetchStatus();
      }
    } catch (err: any) {
      setActionError(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStopBot = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/bot/stop', { method: 'POST' });
      const data = await res.json();
      setStatus(data.status);
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to stop bot');
    } finally {
      setLoading(false);
    }
  };

  const handleTestToken = async () => {
    if (!token.trim()) {
      setTokenValidation({ valid: false, error: 'Please enter a token first' });
      return;
    }
    setTokenTesting(true);
    setTokenValidation(null);
    try {
      const res = await fetch('/api/bot/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setTokenValidation({ valid: true, botUser: data.botUser });
      } else {
        setTokenValidation({ valid: false, error: data.error || 'Token test failed' });
      }
    } catch (err: any) {
      setTokenValidation({ valid: false, error: err.message });
    } finally {
      setTokenTesting(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRunning = status?.status === 'running';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-colors ${
                isRunning
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : status?.status === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Radio className={`w-6 h-6 ${isRunning ? 'animate-pulse' : ''}`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Direct Telegram Bot Engine</h2>
                {isRunning ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE &amp; POLLING
                  </span>
                ) : status?.status === 'starting' ? (
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-950 text-amber-400 border border-amber-800">
                    STARTING...
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
                    STOPPED
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Execute and host your Telegraf v4 bot right here on this node instance. When active, anyone can open your bot on Telegram and start reviewing!
              </p>
            </div>
          </div>

          {isRunning && status?.botInfo && (
            <a
              href={`https://t.me/${status.botInfo.username}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm shrink-0"
            >
              <span>Open @{status.botInfo.username} on Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Live Metrics Grid */}
        {isRunning && status && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">Connected Bot Handle</div>
              <div className="text-sm font-semibold text-sky-400 truncate mt-0.5">
                @{status.botInfo?.username || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Live Uptime
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-400 tabular-nums mt-0.5">
                {formatUptime(status.uptimeSeconds)}
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">Total Telegram Events</div>
              <div className="text-sm font-mono font-semibold text-white tabular-nums mt-0.5">
                {status.stats.messagesCount + status.stats.callbacksCount} received
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">Active Storage Engine</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5 truncate">
                {status.isRemoteMongo ? 'MongoDB Atlas' : 'Embedded JSON DB'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Launch Configuration (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              Telegram Credentials &amp; Settings
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Node.js Server</span>
          </div>

          {actionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Bot Token Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Telegram Bot Token (from @BotFather)</label>
              <button
                type="button"
                onClick={handleTestToken}
                disabled={tokenTesting || !token}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium disabled:opacity-50"
              >
                {tokenTesting ? 'Testing...' : 'Verify Token'}
              </button>
            </div>
            <input
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTokenValidation(null);
              }}
              placeholder="e.g. 7123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
              disabled={isRunning}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60"
            />
            {tokenValidation && (
              <div
                className={`text-xs mt-1 p-2 rounded flex items-center gap-1.5 ${
                  tokenValidation.valid
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {tokenValidation.valid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Token Valid! Bot handle: <strong>@{tokenValidation.botUser?.username}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>{tokenValidation.error}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Admin User ID Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Admin Telegram ID (for /admin security control)
            </label>
            <input
              type="number"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="e.g. 52830866"
              disabled={isRunning}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60"
            />
            <p className="text-[11px] text-slate-500">
              Get your numeric Telegram ID by messaging <code>@userinfobot</code> on Telegram.
            </p>
          </div>

          {/* MongoDB Connection URI (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                MongoDB URI <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                Auto Fallback to Local JSON
              </span>
            </div>
            <input
              type="text"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              placeholder="mongodb+srv://admin:pass@cluster0.net/bot?retryWrites=true&w=majority"
              disabled={isRunning}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60"
            />
            <p className="text-[11px] text-slate-500">
              Leave blank to use the built-in persistent local database (runs immediately without needing any external database).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStartBot}
                disabled={loading || !token.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{loading ? 'Launching Bot Process...' : '▶ Start Live Telegram Bot'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStopBot}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{loading ? 'Stopping...' : '⏹ Stop Bot'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartBot}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              </>
            )}
          </div>

          {/* Quick Setup Help Card */}
          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>How to get your credentials in 30 seconds:</span>
            </div>
            <ol className="list-decimal list-inside text-slate-400 space-y-1 pl-1 text-[11px]">
              <li>
                Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline">@BotFather</a> on Telegram and send <code>/newbot</code>.
              </li>
              <li>Give your bot a name and username ending in <code>bot</code>.</li>
              <li>Copy the HTTP API token provided by BotFather and paste it above.</li>
              <li>
                Send a message to <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 underline">@userinfobot</a> to check your numeric User ID.
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Live Terminal Event Console (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[580px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Live Telegram Event Stream</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const text = logs.map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
                  navigator.clipboard.writeText(text);
                  setCopiedLog(true);
                  setTimeout(() => setCopiedLog(false), 2000);
                }}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Copy all logs"
              >
                {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Console Output Area */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 select-text">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-20 italic">
                Logs will appear here once the bot starts or events occur...
              </div>
            ) : (
              logs.map((log) => {
                const colorClass =
                  log.level === 'error'
                    ? 'text-rose-400'
                    : log.level === 'warn'
                    ? 'text-amber-400'
                    : log.level === 'success'
                    ? 'text-emerald-400'
                    : 'text-slate-300';
                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/40 py-0.5 px-1 rounded">
                    <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                    <span className={`break-words ${colorClass}`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2.5 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Streaming live polling updates directly from Telegram Bot API</span>
            <span className="font-mono">{logs.length} events logged</span>
          </div>
        </div>
      </div>
    </div>
  );
};
