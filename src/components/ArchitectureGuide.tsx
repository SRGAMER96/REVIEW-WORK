import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Layers, Server, Cpu, RefreshCw, Send, DollarSign } from 'lucide-react';
import { STYLED_LABELS } from '../utils/unicode';

export const ArchitectureGuide: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" />
          Production Bot Architecture & Workflow Lifecycles
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Detailed operational blueprints explaining how the Telegraf engine, MongoDB indexes, referral commission trees, and anti-spam lockouts work together.
        </p>
      </div>

      {/* Lifecycle 1: Review Work & Anti-Spam Lockout */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-base font-semibold text-white">Review Work Creation & Execution Pipeline</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
            Real-time Broadcast & Verification
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-mono text-sky-400 font-semibold">STAGE 1: ADMIN CREATION</div>
            <h4 className="text-sm font-semibold text-white">Wizard & Preview</h4>
            <p className="text-xs text-slate-400">
              Admin inputs Target Link, Task Title, Instructions, and Reward amount. The bot displays a confirmation preview with <span className="text-emerald-400 font-semibold">{STYLED_LABELS.CONFIRM_DONE}</span> and <span className="text-rose-400 font-semibold">{STYLED_LABELS.CANCEL}</span> buttons.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-mono text-amber-400 font-semibold">STAGE 2: INSTANT BROADCAST</div>
            <h4 className="text-sm font-semibold text-white">Mass Notification</h4>
            <p className="text-xs text-slate-400">
              Upon clicking Done, the bot automatically broadcasts the alert to all registered users with rate-limiting (35ms delay) to avoid Telegram API 429 flood limits:
              <br />
              <span className="italic text-slate-300">"🔥 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲!..."</span>
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-mono text-purple-400 font-semibold">STAGE 3: USER WORKFLOW</div>
            <h4 className="text-sm font-semibold text-white">Anti-Spam Lockout</h4>
            <p className="text-xs text-slate-400">
              User views active tasks with two buttons:
              <br />
              • <span className="text-rose-400 font-semibold">❌ Cancel:</span> Adds taskId to user&apos;s <code className="text-xs text-sky-300">cancelledTasks</code> list. The user is locked out from spam-cancelling, while task remains active for others.
              <br />
              • <span className="text-sky-400 font-semibold">📤 Submit Proof:</span> Sends screenshot/text.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-mono text-emerald-400 font-semibold">STAGE 4: VERIFICATION</div>
            <h4 className="text-sm font-semibold text-white">Reward & Referral Credit</h4>
            <p className="text-xs text-slate-400">
              Admin reviews proof via inline Approve/Reject:
              <br />
              • <span className="text-emerald-400 font-semibold">Approve:</span> Credits user balance + calculates referrer commission and credits referrer!
              <br />
              • <span className="text-rose-400 font-semibold">Reject:</span> Task becomes active again for the user to retry.
            </p>
          </div>
        </div>
      </div>

      {/* Lifecycle 2: Withdrawal System */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-base font-semibold text-white">Withdrawal Security & Automatic Refund System</h3>
          </div>
          <span className="text-xs font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-950 border border-sky-800">
            Balance Safety Guarantee
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <DollarSign className="w-4 h-4" />
              <span>Step 1: Balance Validation</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bot verifies <code className="text-sky-300">user.balance &gt;= settings.minWithdrawal</code>. If below threshold, user is politely informed of the minimum payout limit configured by the administrator.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Step 2: Instant Balance Hold</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              To prevent double-spending or race conditions, requested funds are deducted into an escrow hold immediately upon submission, and a pending withdrawal record is created for admin review.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
              <RefreshCw className="w-4 h-4" />
              <span>Step 3: Decision & Refund Logic</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Admin reviews with inline buttons. If <strong className="text-white">Approved</strong>, marked completed. If <strong className="text-rose-400">Rejected</strong> (e.g. invalid crypto address), the bot automatically refunds 100% of the funds back to the user&apos;s balance!
            </p>
          </div>
        </div>
      </div>

      {/* Deployment Options */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" />
          Recommended Production Hosting Environments
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="font-semibold text-white">Docker Compose (Recommended)</div>
            <p className="text-slate-400">
              Run bot and MongoDB together in isolated containers with auto-restart and persistent data volumes.
            </p>
            <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-emerald-400">
              docker-compose up -d --build
            </pre>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="font-semibold text-white">Linux VPS with PM2</div>
            <p className="text-slate-400">
              Run directly on Ubuntu/Debian VPS with PM2 daemon to ensure 24/7 uptime and automated process revival.
            </p>
            <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-emerald-400">
              pm2 start bot.js --name &quot;review-bot&quot;
            </pre>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="font-semibold text-white">Railway / Render / Fly.io</div>
            <p className="text-slate-400">
              Zero-config cloud deployment. Link your GitHub repository, provide MongoDB Atlas URI, and deploy in 1 click.
            </p>
            <span className="text-[11px] text-slate-500 font-mono">
              Worker Dyno · Environment Variables
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
