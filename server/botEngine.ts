import { Telegraf, Markup, session } from 'telegraf';
import { getDBModels } from './db';
import { toSansBold, toSansItalic, normalizeText, STYLED_LABELS } from '../src/utils/unicode';

export interface BotLogEntry {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface BotState {
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

class BotManager {
  private bot: Telegraf | null = null;
  private logs: BotLogEntry[] = [];
  private state: BotState = {
    status: 'stopped',
    tokenMasked: '',
    adminId: 8962632792,
    botInfo: null,
    startedAt: null,
    uptimeSeconds: 0,
    errorMessage: null,
    isRemoteMongo: false,
    stats: {
      messagesCount: 0,
      callbacksCount: 0,
      proofsApproved: 0,
      withdrawalsProcessed: 0,
    },
  };
  private startTime: number | null = null;

  public addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    const entry: BotLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      level,
      message,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 250) this.logs.pop();
    console.log(`[BotEngine ${level.toUpperCase()}] ${message}`);
  }

  public getLogs(): BotLogEntry[] {
    return this.logs;
  }

  public getStatus(): BotState {
    if (this.startTime && this.state.status === 'running') {
      this.state.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }
    return this.state;
  }

  public async start(config: {
    token: string;
    adminId: number;
    mongoUri?: string;
    supportUsername?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.state.status === 'running') {
      await this.stop();
    }

    this.state.status = 'starting';
    this.state.errorMessage = null;
    const token = config.token.trim();
    const adminId = Number(config.adminId);

    // Multi-Admin Configuration:
    // Both 8962632792 (Creator Admin) and 8914279465 (Co-Admin) have 100% full administrator rights
    const ADMIN_IDS: number[] = [8962632792, 8914279465];
    if (adminId && !ADMIN_IDS.includes(adminId)) {
      ADMIN_IDS.push(adminId);
    }
    const isAdmin = (id: any): boolean => {
      const num = Number(id);
      return !isNaN(num) && ADMIN_IDS.includes(num);
    };

    if (!token) {
      this.state.status = 'error';
      this.state.errorMessage = 'Bot Token is required';
      return { success: false, error: 'Bot Token is required' };
    }

    this.state.tokenMasked =
      token.length > 10 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '****';
    this.state.adminId = adminId;

    this.addLog('info', `Initializing Telegraf engine with token (${this.state.tokenMasked})...`);

    try {
      // 1. Initialize DB models
      const models = await getDBModels(config.mongoUri);
      this.state.isRemoteMongo = models.isRemoteMongo;
      this.addLog('info', `Database layer active: ${models.isRemoteMongo ? 'MongoDB Atlas' : 'Embedded JSON Store'}`);

      const { User, Task, Submission, Withdrawal, Setting } = models;

      // 2. Initialize Telegraf
      const bot = new Telegraf(token);
      this.bot = bot;

      // Global error handler
      bot.catch((err: any, ctx: any) => {
        const errMsg = err?.message || String(err);
        this.addLog('error', `Telegram update error: ${errMsg}`);
        console.error(`[Telegraf Error]`, err);
      });

      bot.use(session());

      // In-Memory Session Storage: 100% reliable state management
      const userStateMap = new Map<number, { step: string; data?: any }>();

      // Keyboards
      const getMainMenuKeyboard = (userId: number) => {
        const rows: any[] = [
          [STYLED_LABELS.REVIEW_WORK, STYLED_LABELS.BALANCE],
          [STYLED_LABELS.PROFILE, STYLED_LABELS.REFER],
          [STYLED_LABELS.WITHDRAW, STYLED_LABELS.SUPPORT],
        ];

        if (isAdmin(userId)) {
          rows.push([STYLED_LABELS.ADMIN_PANEL]);
        }

        return Markup.keyboard(rows).resize();
      };

      const adminPanelKeyboard = Markup.keyboard([
        [STYLED_LABELS.BROADCAST, STYLED_LABELS.ADD_WORK],
        [STYLED_LABELS.DELETE_WORK, STYLED_LABELS.STATISTICS],
        [STYLED_LABELS.BAN_USER, STYLED_LABELS.UNBAN_USER],
        [STYLED_LABELS.USER_INFO, STYLED_LABELS.ADD_BALANCE],
        [STYLED_LABELS.REMOVE_BALANCE, STYLED_LABELS.SET_REFERRAL],
        [STYLED_LABELS.SET_MIN_WITHDRAWAL, STYLED_LABELS.BACK_MENU],
      ]).resize();

      const cancelInputKeyboard = Markup.keyboard([['❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻']]).resize();

      // Helpers
      const getSettings = async () => {
        let s = await Setting.findOne({ key: 'global_config' });
        if (!s) {
          s = await Setting.create({
            key: 'global_config',
            minWithdrawal: 50.0,
            referralPercent: 10,
            supportUsername: config.supportUsername || 'SRGAMER96',
            currencySymbol: '₹',
          });
        }
        // Force currency to ₹ as requested
        if (s.currencySymbol !== '₹') {
          s.currencySymbol = '₹';
          await s.save();
        }
        return s;
      };

      const getOrCreateUser = async (ctx: any) => {
        const from = ctx.from;
        if (!from) return null;

        let user = await User.findOne({ telegramId: from.id });
        if (!user) {
          let referredBy = null;
          if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start ref_')) {
            const refId = Number(ctx.message.text.split('ref_')[1]);
            if (refId && refId !== from.id) {
              const referrer = await User.findOne({ telegramId: refId });
              if (referrer) {
                referredBy = refId;
                await User.updateOne({ telegramId: refId }, { $inc: { referralCount: 1 } });
                this.addLog('success', `New user ${from.id} registered with referral from ${refId}`);
              }
            }
          }

          user = await User.create({
            telegramId: from.id,
            username: from.username || '',
            firstName: from.first_name || '',
            lastName: from.last_name || '',
            balance: 0.0,
            referredBy,
            cancelledTasks: [],
          });
        } else {
          user.username = from.username || user.username;
          user.firstName = from.first_name || user.firstName;
          user.lastName = from.last_name || user.lastName;
          await user.save();
        }
        return user;
      };

      // Middleware: Ban check & Logging
      bot.use(async (ctx: any, next) => {
        if (!ctx.from) return next();

        if (ctx.message) {
          this.state.stats.messagesCount++;
          const fromUser = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || 'User';
          const text = (ctx.message as any).text || (ctx.message as any).caption || '[Media]';
          this.addLog('info', `Message from ${fromUser} (ID: ${ctx.from?.id}): "${text.slice(0, 40)}"`);
        } else if (ctx.callbackQuery) {
          this.state.stats.callbacksCount++;
          const data = (ctx.callbackQuery as any).data;
          this.addLog('info', `CallbackQuery from ID ${ctx.from?.id}: "${data}"`);
        }

        const user = await getOrCreateUser(ctx);
        if (user && user.isBanned) {
          return ctx.reply(
            `🚫 ${toSansBold('𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗦𝘂𝘀𝗽𝗲𝗻𝗱𝗲𝗱')}\n\nYour account has been banned from using this bot.\nReason: ${
              user.banReason || 'Violation of community terms'
            }`
          );
        }
        return next();
      });

      // Handle Cancel Operation
      bot.hears(['❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻', '/cancel'], async (ctx: any) => {
        userStateMap.delete(ctx.from.id);
        if (isAdmin(ctx.from.id)) {
          return ctx.reply(`✅ Operation cancelled. Returned to ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹')}.`, adminPanelKeyboard);
        }
        return ctx.reply(`✅ Operation cancelled. Returned to ${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.`, getMainMenuKeyboard(ctx.from.id));
      });

      // /start Command
      bot.command('start', async (ctx: any) => {
        userStateMap.delete(ctx.from.id);
        await getOrCreateUser(ctx);
        const name = ctx.from.first_name || 'Friend';
        const settings = await getSettings();

        const welcomeText =
          `🌟 ${toSansBold(`𝗪𝗲𝗹𝗰𝗼𝗺𝗲, ${name}!`)} 🌟\n\n` +
          `💰 Earn real **${settings.currencySymbol} Rupee rewards** by completing simple **Review Work**!\n\n` +
          `📌 ${toSansBold('𝗤𝘂𝗶𝗰𝗸 𝗦𝘁𝗮𝗿𝘁 𝗚𝘂𝗶𝗱𝗲')}:\n` +
          `• Tap ${toSansBold('🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢')} to get a review link.\n` +
          `• Follow the link, complete the review, and submit screenshot proof.\n` +
          `• Once approved by admin, earnings are credited instantly!\n` +
          `• Withdraw your balance via UPI anytime!\n\n` +
          (isAdmin(ctx.from.id) ? `👑 ${toSansBold('𝗬𝗼𝘂 𝗮𝗿𝗲 𝗹𝗼𝗴𝗴𝗲𝗱 𝗶𝗻 𝗮𝘀 𝗦𝘆𝘀𝘁𝗲𝗺 𝗔𝗱𝗺𝗶𝗻𝗶𝘀𝘁𝗿𝗮𝘁𝗼𝗿.')}\n\n` : '') +
          `👇 Select an option from the menu below:`;

        return ctx.reply(welcomeText, getMainMenuKeyboard(ctx.from.id));
      });

      // ============================================================================
      // 📝 REVIEW WORK HANDLER (DELIVERS 1 TASK AT A TIME)
      // ============================================================================
      const handleReviewWork = async (ctx: any) => {
        const user = await getOrCreateUser(ctx);
        const settings = await getSettings();

        // Tasks the user already submitted (pending or approved)
        const userSubmissions = await Submission.find({
          telegramId: user.telegramId,
          status: { $in: ['pending', 'approved'] },
        }).select('task');

        const submittedIds = userSubmissions.map((s: any) => String(s.task));

        // Count total remaining uncompleted tasks
        const totalRemaining = await Task.countDocuments({
          status: 'active',
          _id: { $nin: submittedIds },
        });

        // Find the single next available task
        const currentTask = await Task.findOne({
          status: 'active',
          _id: { $nin: submittedIds },
        }).sort({ createdAt: 1 });

        if (!currentTask) {
          return ctx.reply(
            `🎉 ${toSansBold('𝗔𝗹𝗹 𝗖𝗮𝘂𝗴𝗵𝘁 𝗨𝗽!')}\n\n` +
              `You have completed all available review tasks! 🥳\n` +
              `Check back soon! You will receive an instant notification as soon as a new task is posted. 🔔`
          );
        }

        // Deliver ONLY the Link + Message cleanly to the user
        const taskCard =
          `📝 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} (1 of ${totalRemaining} Tasks Available)\n\n` +
          `🔗 ${toSansBold('𝗟𝗶𝗻𝗸')}:\n${currentTask.targetLink}\n\n` +
          `📝 ${toSansBold('𝗠𝗲𝘀𝘀𝗮𝗴𝗲 / 𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\n${currentTask.instructions}\n\n` +
          `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: ${settings.currencySymbol}${currentTask.rewardAmount.toFixed(2)}\n\n` +
          `👇 Complete the task above, then tap "Submit Proof" below:`;

        return ctx.reply(taskCard, {
          disable_web_page_preview: false,
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('❌ 𝗖𝗮𝗻𝗰𝗲𝗹', `task_cancel_${currentTask._id}`),
                Markup.button.callback('📤 𝗦𝘂𝗯𝗺𝗶𝘁 𝗣𝗿𝗼𝗼𝗳 🚀', `task_submit_${currentTask._id}`),
              ],
            ],
          },
        });
      };

      // Task Cancel Callback - Stays right there for next time!
      bot.action(/task_cancel_(.+)/, async (ctx: any) => {
        await ctx.answerCbQuery('Task closed.');
        return ctx.editMessageText(
          `❌ ${toSansBold('𝗧𝗮𝘀𝗸 𝗖𝗹𝗼𝘀𝗲𝗱')}\n\nThis task is waiting for you! Whenever you're ready, tap ${toSansBold(
            '🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢'
          )} from your menu to continue.`
        );
      });

      // Task Submit Callback
      bot.action(/task_submit_(.+)/, async (ctx: any) => {
        const taskId = ctx.match[1];
        const task = await Task.findById(taskId);

        if (!task || task.status !== 'active') {
          await ctx.answerCbQuery('This task is no longer available.', { show_alert: true });
          return ctx.editMessageText(`⚠️ ${toSansBold('𝗧𝗮𝘀𝗸 𝗘𝘅𝗽𝗶𝗿𝗲𝗱 𝗼𝗿 𝗙𝘂𝗹𝗹')}`);
        }

        userStateMap.set(ctx.from.id, {
          step: 'AWAITING_PROOF',
          data: { targetTaskId: taskId },
        });

        await ctx.answerCbQuery();
        return ctx.reply(
          `📤 ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘁 𝗬𝗼𝘂𝗿 𝗣𝗿𝗼𝗼𝗳')}\n\n` +
            `🔗 Link: ${task.targetLink}\n\n` +
            `Please **upload a screenshot image** or send your review text proof verifying that you completed the review.\n\n` +
            `Tap "❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻" below if you wish to exit.`,
          cancelInputKeyboard
        );
      });

      // ============================================================================
      // 💳 WITHDRAWAL HANDLER (ONLY UPI!)
      // ============================================================================
      const handleWithdrawPrompt = async (ctx: any) => {
        const user = await getOrCreateUser(ctx);
        const settings = await getSettings();

        if (user.balance < settings.minWithdrawal) {
          return ctx.reply(
            `⚠️ ${toSansBold('𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\n\n` +
              `Your Current Balance: ${toSansBold(`${settings.currencySymbol}${user.balance.toFixed(2)}`)}\n` +
              `Minimum Withdrawal: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}\n\n` +
              `Complete more ${toSansBold('🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢')} to reach the payout threshold! 🚀`
          );
        }

        const pending = await Withdrawal.findOne({ telegramId: user.telegramId, status: 'pending' });
        if (pending) {
          return ctx.reply(
            `⏳ ${toSansBold('𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗶𝗻 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀')}\n\n` +
              `You already have an active withdrawal request of ${settings.currencySymbol}${pending.amount.toFixed(
                2
              )} awaiting Admin review.`
          );
        }

        userStateMap.set(ctx.from.id, {
          step: 'WITHDRAW_AMOUNT',
          data: { maxBalance: user.balance },
        });

        return ctx.reply(
          `💳 ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 (𝗨𝗣𝗜 𝗢𝗻𝗹𝘆)')}\n\n` +
            `Available Balance: ${toSansBold(`${settings.currencySymbol}${user.balance.toFixed(2)}`)}\n` +
            `Minimum Withdrawal: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}\n\n` +
            `Please enter the **amount in ${settings.currencySymbol}** you want to withdraw (e.g. \`50\` or \`100\`):`,
          cancelInputKeyboard
        );
      };

      bot.action('btn_req_withdraw', async (ctx: any) => {
        await ctx.answerCbQuery();
        return handleWithdrawPrompt(ctx);
      });

      // ============================================================================
      // 💬 MESSAGE & BUTTON DISPATCHER (100% RELIABLE MATCHING VIA normalizeText)
      // ============================================================================
      bot.on(['text', 'photo'], async (ctx: any) => {
        const fromId = ctx.from?.id;
        if (!fromId) return;

        const rawText = ctx.message?.text?.trim() || '';
        const norm = normalizeText(rawText);
        const settings = await getSettings();

        // 1. Check if user is in an active wizard step
        const currentSession = userStateMap.get(fromId);
        if (currentSession && currentSession.step) {
          const step = currentSession.step;

          // A. Proof Submission
          if (step === 'AWAITING_PROOF') {
            const taskId = currentSession.data?.targetTaskId;
            const task = await Task.findById(taskId);
            if (!task) {
              userStateMap.delete(fromId);
              return ctx.reply('⚠️ Task expired.', getMainMenuKeyboard(fromId));
            }

            let proofType = 'text';
            let proofContent = rawText;
            let proofCaption = ctx.message.caption || '';

            if (ctx.message.photo && ctx.message.photo.length > 0) {
              proofType = 'photo';
              proofContent = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            }

            const user = await getOrCreateUser(ctx);
            const sub = await Submission.create({
              task: task._id,
              user: user._id,
              telegramId: fromId,
              proofType,
              proofContent,
              proofCaption,
              rewardAmount: task.rewardAmount,
              status: 'pending',
            });

            userStateMap.delete(fromId);
            await ctx.reply(
              `✅ ${toSansBold('𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}\n\n` +
                `Your submission is now **Pending Admin Review**.\n\n` +
                `👉 Tap ${toSansBold('🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢')} to get your next task! 🚀`,
              getMainMenuKeyboard(fromId)
            );

            this.addLog('info', `User ${fromId} submitted proof for task "${task.title}"`);

            // Notify Admin with UPI ID format
            try {
              const adminNotice =
                `📥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻!')}\n\n` +
                `👤 User: @${ctx.from.username || 'None'} (ID: ${fromId})\n` +
                `🔗 Link: ${task.targetLink}\n` +
                `💰 Reward: ${settings.currencySymbol}${task.rewardAmount.toFixed(2)}\n` +
                (proofType === 'text' ? `\n📝 Proof:\n${proofContent}` : '');

              const inlineBtns = Markup.inlineKeyboard([
                [
                  Markup.button.callback('✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲 & 𝗣𝗮𝘆 ₹', `proof_app_${sub._id}`),
                  Markup.button.callback('❌ 𝗥𝗲𝗷𝗲𝗰𝘁 𝗣𝗿𝗼𝗼𝗳', `proof_rej_${sub._id}`),
                ],
              ]);

              for (const aId of ADMIN_IDS) {
                try {
                  if (proofType === 'photo') {
                    await bot.telegram.sendPhoto(aId, proofContent, { caption: adminNotice, ...inlineBtns });
                  } else {
                    await bot.telegram.sendMessage(aId, adminNotice, inlineBtns);
                  }
                } catch (e) {}
              }
            } catch (e) {}
            return;
          }

          // B. Withdrawal Step 1 (Amount)
          if (step === 'WITHDRAW_AMOUNT') {
            const amount = parseFloat(rawText);
            const user = await getOrCreateUser(ctx);

            if (isNaN(amount) || amount < settings.minWithdrawal || amount > user.balance) {
              return ctx.reply(
                `⚠️ Invalid amount. Must be between ${settings.currencySymbol}${settings.minWithdrawal.toFixed(
                  2
                )} and ${settings.currencySymbol}${user.balance.toFixed(2)}:`
              );
            }

            userStateMap.set(fromId, {
              step: 'WITHDRAW_UPI',
              data: { withdrawAmount: amount },
            });

            return ctx.reply(
              `💳 Withdrawal Amount: ${toSansBold(`${settings.currencySymbol}${amount.toFixed(2)}`)}\n\n` +
                `📱 Please enter your **UPI ID**\n(e.g., \`user@okaxis\`, \`9876543210@paytm\` or \`mobile@upi\`):`,
              cancelInputKeyboard
            );
          }

          // C. Withdrawal Step 2 (UPI ID Only!)
          if (step === 'WITHDRAW_UPI') {
            const upiId = rawText;
            const amount = currentSession.data?.withdrawAmount;
            const user = await getOrCreateUser(ctx);

            if (user.balance < amount) {
              userStateMap.delete(fromId);
              return ctx.reply('⚠️ Insufficient balance.', getMainMenuKeyboard(fromId));
            }

            user.balance -= amount;
            await user.save();

            const wd = await Withdrawal.create({
              user: user._id,
              telegramId: user.telegramId,
              username: user.username,
              amount,
              paymentMethod: 'UPI',
              walletAddress: upiId,
              status: 'pending',
            });

            userStateMap.delete(fromId);
            await ctx.reply(
              `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱!')}\n\n` +
                `💰 Amount: ${settings.currencySymbol}${amount.toFixed(2)}\n` +
                `🆔 UPI ID: ${upiId}\n\n` +
                `Admin will verify and transfer your payout to your UPI ID shortly.`,
              getMainMenuKeyboard(fromId)
            );

            this.addLog('info', `User ${fromId} requested withdrawal of ${settings.currencySymbol}${amount.toFixed(2)} to UPI: ${upiId}`);

            // Notify Admins strictly with "UPI ID" field as requested!
            for (const aId of ADMIN_IDS) {
              try {
                await bot.telegram.sendMessage(
                  aId,
                  `💳 ${toSansBold('𝗡𝗲𝘄 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁!')}\n\n` +
                    `👤 User: @${user.username || 'None'} (ID: ${user.telegramId})\n` +
                    `💰 Amount: ${settings.currencySymbol}${amount.toFixed(2)}\n` +
                    `🆔 ${toSansBold('𝗨𝗣𝗜 𝗜𝗗')}: ${upiId}`,
                  Markup.inlineKeyboard([
                    [
                      Markup.button.callback('✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲', `with_app_${wd._id}`),
                      Markup.button.callback('❌ 𝗥𝗲𝗷𝗲𝗰𝘁', `with_rej_${wd._id}`),
                    ],
                  ])
                );
              } catch (e) {}
            }
            return;
          }

          // D. Admin Add Work Wizard (EXACTLY 2 STEPS: Link -> Message -> Done/Cancel)
          if (isAdmin(fromId)) {
            if (step === 'ADMIN_ADD_LINK') {
              currentSession.data.draft.targetLink = rawText;
              currentSession.step = 'ADMIN_ADD_MESSAGE';
              return ctx.reply(
                `📍 ${toSansBold('Step 2/2: Enter Task Message / Instructions')}\n\n` +
                  `(Type the review details and instructions that users should follow):`,
                cancelInputKeyboard
              );
            }

            if (step === 'ADMIN_ADD_MESSAGE') {
              currentSession.data.draft.instructions = rawText;
              const draft = currentSession.data.draft;

              return ctx.reply(
                `📋 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗣𝗿𝗲𝘃𝗶𝗲𝘄')} 📋\n\n` +
                  `🔗 ${toSansBold('𝗟𝗶𝗻𝗸')}:\n${draft.targetLink}\n\n` +
                  `📝 ${toSansBold('𝗠𝗲𝘀𝘀𝗮𝗴𝗲 / 𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\n${draft.instructions}\n\n` +
                  `Do you want to publish this review work?`,
                Markup.inlineKeyboard([
                  [
                    Markup.button.callback('✅ 𝗗𝗼𝗻𝗲', 'admin_confirm_task'),
                    Markup.button.callback('❌ 𝗖𝗮𝗻𝗰𝗲𝗹', 'admin_cancel_task'),
                  ],
                ])
              );
            }

            // Broadcast
            if (step === 'ADMIN_BROADCAST') {
              userStateMap.delete(fromId);
              const allUsers = await User.find({ isBanned: false });
              let count = 0;

              await ctx.reply(`📢 Broadcasting message to ${allUsers.length} members...`);

              for (const u of allUsers) {
                try {
                  if (ctx.message.photo && ctx.message.photo.length > 0) {
                    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                    await bot.telegram.sendPhoto(u.telegramId, photoId, { caption: ctx.message.caption || '' });
                  } else {
                    await bot.telegram.sendMessage(u.telegramId, rawText);
                  }
                  count++;
                  await new Promise((r) => setTimeout(r, 40));
                } catch (e) {}
              }

              return ctx.reply(`✅ Broadcast sent successfully to ${count} members!`, adminPanelKeyboard);
            }

            // Ban User
            if (step === 'ADMIN_BAN_USER') {
              userStateMap.delete(fromId);
              const targetId = parseInt(rawText);
              if (isNaN(targetId)) return ctx.reply('⚠️ Invalid Telegram ID.', adminPanelKeyboard);

              const targetUser = await User.findOne({ telegramId: targetId });
              if (!targetUser) return ctx.reply(`⚠️ User with ID ${targetId} not found.`, adminPanelKeyboard);

              targetUser.isBanned = true;
              targetUser.banReason = 'Suspended by Administrator';
              await targetUser.save();

              try {
                await bot.telegram.sendMessage(targetId, '🚫 Your account has been suspended by the administrator.');
              } catch (e) {}

              return ctx.reply(`🚫 User ${targetId} (@${targetUser.username || 'None'}) has been banned.`, adminPanelKeyboard);
            }

            // Unban User
            if (step === 'ADMIN_UNBAN_USER') {
              userStateMap.delete(fromId);
              const targetId = parseInt(rawText);
              if (isNaN(targetId)) return ctx.reply('⚠️ Invalid Telegram ID.', adminPanelKeyboard);

              const targetUser = await User.findOne({ telegramId: targetId });
              if (!targetUser) return ctx.reply(`⚠️ User with ID ${targetId} not found.`, adminPanelKeyboard);

              targetUser.isBanned = false;
              targetUser.banReason = '';
              await targetUser.save();

              try {
                await bot.telegram.sendMessage(targetId, '✅ Your account has been unbanned. You can now use the bot again!');
              } catch (e) {}

              return ctx.reply(`✅ User ${targetId} (@${targetUser.username || 'None'}) has been unbanned.`, adminPanelKeyboard);
            }

            // User Info Lookup
            if (step === 'ADMIN_USER_INFO') {
              userStateMap.delete(fromId);
              const query = rawText.replace('@', '');
              const targetId = parseInt(query);

              const targetUser = await User.findOne({
                $or: [{ telegramId: isNaN(targetId) ? 0 : targetId }, { username: query }],
              });

              if (!targetUser) return ctx.reply(`⚠️ User "${rawText}" not found.`, adminPanelKeyboard);

              const completed = await Submission.countDocuments({ telegramId: targetUser.telegramId, status: 'approved' });
              const pending = await Submission.countDocuments({ telegramId: targetUser.telegramId, status: 'pending' });

              const infoCard =
                `👤 ${toSansBold('𝗨𝘀𝗲𝗿 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻')} 👤\n\n` +
                `🆔 ${toSansBold('𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗜𝗗')}: \`${targetUser.telegramId}\`\n` +
                `🏷️ ${toSansBold('𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲')}: @${targetUser.username || 'None'}\n` +
                `👤 ${toSansBold('𝗡𝗮𝗺𝗲')}: ${targetUser.firstName} ${targetUser.lastName}\n\n` +
                `💵 ${toSansBold('𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}: ${settings.currencySymbol}${targetUser.balance.toFixed(2)}\n` +
                `📈 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗘𝗮𝗿𝗻𝗲𝗱')}: ${settings.currencySymbol}${targetUser.totalEarned.toFixed(2)}\n` +
                `💳 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗻')}: ${settings.currencySymbol}${targetUser.totalWithdrawn.toFixed(2)}\n` +
                `👥 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹𝘀')}: ${targetUser.referralCount} (${settings.currencySymbol}${targetUser.referralEarnings.toFixed(2)})\n\n` +
                `📊 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄𝘀')}: ✅ ${completed} approved | ⏳ ${pending} pending\n` +
                `🚫 ${toSansBold('𝗦𝘁𝗮𝘁𝘂𝘀')}: ${targetUser.isBanned ? '❌ BANNED' : '✅ ACTIVE'}\n` +
                `📅 ${toSansBold('𝗝𝗼𝗶𝗻𝗲𝗱')}: ${new Date(targetUser.createdAt).toLocaleDateString()}`;

              return ctx.reply(infoCard, adminPanelKeyboard);
            }

            // Add Balance 1 (User ID)
            if (step === 'ADMIN_ADD_BAL_USER') {
              const targetId = parseInt(rawText);
              if (isNaN(targetId)) return ctx.reply('⚠️ Invalid Telegram ID.', cancelInputKeyboard);

              const targetUser = await User.findOne({ telegramId: targetId });
              if (!targetUser) return ctx.reply(`⚠️ User with ID ${targetId} not found.`, adminPanelKeyboard);

              userStateMap.set(fromId, {
                step: 'ADMIN_ADD_BAL_AMOUNT',
                data: { targetUserId: targetId },
              });

              return ctx.reply(
                `User: @${targetUser.username || 'None'} (Current: ${settings.currencySymbol}${targetUser.balance.toFixed(2)})\n\n` +
                  `Enter the **amount in ${settings.currencySymbol}** to credit:`,
                cancelInputKeyboard
              );
            }

            // Add Balance 2 (Amount)
            if (step === 'ADMIN_ADD_BAL_AMOUNT') {
              const targetId = currentSession.data?.targetUserId;
              userStateMap.delete(fromId);
              const amount = parseFloat(rawText);

              if (isNaN(amount) || amount <= 0) return ctx.reply('⚠️ Invalid amount.', adminPanelKeyboard);

              const targetUser = await User.findOne({ telegramId: targetId });
              if (targetUser) {
                targetUser.balance += amount;
                targetUser.totalEarned += amount;
                await targetUser.save();

                try {
                  await bot.telegram.sendMessage(
                    targetId,
                    `💰 ${toSansBold('𝗕𝗮𝗹𝗮𝗻𝗰𝗲 𝗖𝗿𝗲𝗱𝗶𝘁𝗲𝗱!')}\n\n` +
                      `An administrator added ${toSansBold(`+${settings.currencySymbol}${amount.toFixed(2)}`)} to your balance!\n` +
                      `New Balance: ${toSansBold(`${settings.currencySymbol}${targetUser.balance.toFixed(2)}`)}`
                  );
                } catch (e) {}

                return ctx.reply(
                  `✅ Credited ${settings.currencySymbol}${amount.toFixed(2)} to User ${targetId}.\nNew Balance: ${settings.currencySymbol}${targetUser.balance.toFixed(2)}`,
                  adminPanelKeyboard
                );
              }
            }

            // Remove Balance 1 (User ID)
            if (step === 'ADMIN_REM_BAL_USER') {
              const targetId = parseInt(rawText);
              if (isNaN(targetId)) return ctx.reply('⚠️ Invalid Telegram ID.', cancelInputKeyboard);

              const targetUser = await User.findOne({ telegramId: targetId });
              if (!targetUser) return ctx.reply(`⚠️ User with ID ${targetId} not found.`, adminPanelKeyboard);

              userStateMap.set(fromId, {
                step: 'ADMIN_REM_BAL_AMOUNT',
                data: { targetUserId: targetId },
              });

              return ctx.reply(
                `User: @${targetUser.username || 'None'} (Current: ${settings.currencySymbol}${targetUser.balance.toFixed(2)})\n\n` +
                  `Enter the **amount in ${settings.currencySymbol}** to deduct:`,
                cancelInputKeyboard
              );
            }

            // Remove Balance 2 (Amount)
            if (step === 'ADMIN_REM_BAL_AMOUNT') {
              const targetId = currentSession.data?.targetUserId;
              userStateMap.delete(fromId);
              const amount = parseFloat(rawText);

              if (isNaN(amount) || amount <= 0) return ctx.reply('⚠️ Invalid amount.', adminPanelKeyboard);

              const targetUser = await User.findOne({ telegramId: targetId });
              if (targetUser) {
                targetUser.balance = Math.max(0, targetUser.balance - amount);
                await targetUser.save();

                return ctx.reply(
                  `✅ Deducted ${settings.currencySymbol}${amount.toFixed(2)} from User ${targetId}.\nNew Balance: ${settings.currencySymbol}${targetUser.balance.toFixed(2)}`,
                  adminPanelKeyboard
                );
              }
            }

            // Set Referral %
            if (step === 'ADMIN_SET_REF') {
              userStateMap.delete(fromId);
              const percent = parseInt(rawText);
              if (isNaN(percent) || percent < 0 || percent > 100) {
                return ctx.reply('⚠️ Invalid percentage.', adminPanelKeyboard);
              }

              await Setting.updateOne({ key: 'global_config' }, { referralPercent: percent });
              return ctx.reply(`✅ Referral commission updated to ${percent}%.`, adminPanelKeyboard);
            }

            // Set Min Withdrawal
            if (step === 'ADMIN_SET_MIN_WD') {
              userStateMap.delete(fromId);
              const minWd = parseFloat(rawText);
              if (isNaN(minWd) || minWd <= 0) return ctx.reply('⚠️ Invalid amount.', adminPanelKeyboard);

              await Setting.updateOne({ key: 'global_config' }, { minWithdrawal: minWd });
              return ctx.reply(
                `✅ Minimum withdrawal threshold updated to ${settings.currencySymbol}${minWd.toFixed(2)}.`,
                adminPanelKeyboard
              );
            }
          }
        }

        // ========================================================================
        // 2. MAIN KEYBOARD COMMANDS (NORMALIZED MATCHING)
        // ========================================================================

        // A. REVIEW WORK BUTTON
        if (
          ((norm.includes('review') || rawText.includes('REVIEW')) && !norm.includes('add') && !norm.includes('delete')) ||
          rawText === STYLED_LABELS.REVIEW_WORK
        ) {
          return handleReviewWork(ctx);
        }

        // B. BALANCE
        if (norm.includes('balance') || rawText === STYLED_LABELS.BALANCE) {
          const user = await getOrCreateUser(ctx);
          const balanceMsg =
            `💎 ${toSansBold('𝗬𝗼𝘂𝗿 𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')} 💎\n\n` +
            `💵 ${toSansBold('𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}: ${settings.currencySymbol}${user.balance.toFixed(2)}\n` +
            `📈 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗘𝗮𝗿𝗻𝗲𝗱')}: ${settings.currencySymbol}${user.totalEarned.toFixed(2)}\n` +
            `💳 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗻')}: ${settings.currencySymbol}${user.totalWithdrawn.toFixed(2)}\n` +
            `🎁 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀')}: ${settings.currencySymbol}${user.referralEarnings.toFixed(2)}\n\n` +
            `ℹ️ Minimum withdrawal threshold: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}`;

          return ctx.reply(balanceMsg, {
            reply_markup: {
              inline_keyboard: [[Markup.button.callback('💸 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗡𝗼𝘄', 'btn_req_withdraw')]],
            },
          });
        }

        // C. PROFILE
        if (norm.includes('profile') || rawText === STYLED_LABELS.PROFILE) {
          const user = await getOrCreateUser(ctx);
          const completedCount = await Submission.countDocuments({ telegramId: ctx.from.id, status: 'approved' });
          const pendingCount = await Submission.countDocuments({ telegramId: ctx.from.id, status: 'pending' });

          const profileMsg =
            `🔮 ${toSansBold('𝗬𝗼𝘂𝗿 𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗣𝗿𝗼𝗳𝗶𝗹𝗲')} 🔮\n\n` +
            `🆔 ${toSansBold('𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗜𝗗')}: ${user.telegramId}\n` +
            `🏷️ ${toSansBold('𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲')}: ${user.username ? '@' + user.username : 'None'}\n` +
            `👤 ${toSansBold('𝗙𝘂𝗹𝗹 𝗡𝗮𝗺𝗲')}: ${user.firstName} ${user.lastName}\n\n` +
            `📊 ${toSansBold('𝗧𝗮𝘀𝗸 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')}:\n` +
            `• ✅ Approved Reviews: ${completedCount}\n` +
            `• ⏳ Pending Approvals: ${pendingCount}\n` +
            `• 👥 Total Referrals: ${user.referralCount}\n\n` +
            `📅 ${toSansBold('𝗠𝗲𝗺𝗯𝗲𝗿 𝗦𝗶𝗻𝗰𝗲')}: ${new Date(user.createdAt).toLocaleDateString()}`;

          return ctx.reply(profileMsg);
        }

        // D. REFER
        if (norm.includes('refer') || norm.includes('invite') || rawText === STYLED_LABELS.REFER) {
          const user = await getOrCreateUser(ctx);
          const me = await bot.telegram.getMe();
          const refLink = `https://t.me/${me.username}?start=ref_${user.telegramId}`;

          const referMsg =
            `🚀 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 & 𝗔𝗳𝗳𝗶𝗹𝗶𝗮𝘁𝗲 𝗣𝗿𝗼𝗴𝗿𝗮𝗺')} 🚀\n\n` +
            `Invite friends to earn passive income! 💸\n\n` +
            `🎁 ${toSansBold('𝗖𝗼𝗺𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗮𝘁𝗲')}: ${toSansBold(`${settings.referralPercent}%`)} of every completed review!\n\n` +
            `📊 ${toSansBold('𝗬𝗼𝘂𝗿 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗦𝘁𝗮𝘁𝘀')}:\n` +
            `• Total Friends Joined: ${toSansBold(user.referralCount.toString())}\n` +
            `• Total Referral Earnings: ${toSansBold(`${settings.currencySymbol}${user.referralEarnings.toFixed(2)}`)}\n\n` +
            `🔗 ${toSansBold('𝗬𝗼𝘂𝗿 𝗨𝗻𝗶𝗾𝘂𝗲 𝗜𝗻𝘃𝗶𝘁𝗲 𝗟𝗶𝗻𝗸')}:\n${refLink}\n\n` +
            `👇 Tap the button below to share with your friends or groups in 1 click:`;

          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(
            `🔥 Get paid in ₹ Rupee for simple online reviews! Join @${me.username} and start earning now! 💸`
          )}`;

          return ctx.reply(referMsg, {
            reply_markup: {
              inline_keyboard: [
                [Markup.button.url('📲 𝗦𝗵𝗮𝗿𝗲 𝘄𝗶𝘁𝗵 𝗙𝗿𝗶𝗲𝗻𝗱𝘀 🚀', shareUrl)],
              ],
            },
          });
        }

        // E. SUPPORT (@SRGAMER96 strictly in English)
        if (norm.includes('support') || rawText === STYLED_LABELS.SUPPORT) {
          const cleanSupportHandle = 'SRGAMER96';

          const supportText =
            `🛟 ${toSansBold('𝟮𝟰/𝟳 𝗖𝘂𝘀𝘁𝗼𝗺𝗲𝗿 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 & 𝗛𝗲𝗹𝗽')} 🛟\n\n` +
            `Need help with a review task, submission verification, or withdrawal issue?\n\n` +
            `👤 ${toSansBold('𝗢𝗳𝗳𝗶𝗰𝗶𝗮𝗹 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗠𝗮𝗻𝗮𝗴𝗲𝗿')}: @${cleanSupportHandle}\n` +
            `⏰ ${toSansBold('𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲 𝗧𝗶𝗺𝗲')}: Within a few minutes!\n\n` +
            `👇 Click the button below to open a direct chat with our support manager:`;

          return ctx.reply(supportText, {
            reply_markup: {
              inline_keyboard: [
                [Markup.button.url(`💬 𝗖𝗼𝗻𝘁𝗮𝗰𝘁 @${cleanSupportHandle} ↗️`, `https://t.me/${cleanSupportHandle}`)],
              ],
            },
          });
        }

        // F. WITHDRAW
        if (norm.includes('withdraw') || rawText === STYLED_LABELS.WITHDRAW) {
          return handleWithdrawPrompt(ctx);
        }

        // G. ADMIN PANEL MASTER BUTTON
        if (norm.includes('admin') || rawText === STYLED_LABELS.ADMIN_PANEL) {
          if (!isAdmin(fromId)) return ctx.reply('⛔ Access denied.');
          userStateMap.delete(fromId);
          return ctx.reply(
            `👑 ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗻𝘁𝗿𝗼𝗹 𝗣𝗮𝗻𝗲𝗹')} 👑\n\n` +
              `Welcome Administrator @${ctx.from.username || 'Admin'}!\n` +
              `Select any of the management actions below:`,
            adminPanelKeyboard
          );
        }

        // H. BACK TO MAIN MENU
        if (norm.includes('main menu') || norm.includes('back') || rawText === STYLED_LABELS.BACK_MENU) {
          userStateMap.delete(fromId);
          return ctx.reply(`Returned to ${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.`, getMainMenuKeyboard(fromId));
        }

        // ========================================================================
        // 3. ADMIN PANEL ACTIONS (fromId === adminId)
        // ========================================================================
        if (isAdmin(fromId)) {
          // ADD WORK (2 STEPS: Link -> Message -> Done/Cancel)
          if (norm.includes('add') || rawText.includes('ADD WORK') || rawText === STYLED_LABELS.ADD_WORK) {
            userStateMap.set(fromId, {
              step: 'ADMIN_ADD_LINK',
              data: { draft: {} },
            });
            return ctx.reply(
              `➕ ${toSansBold('𝗖𝗿𝗲𝗮𝘁𝗲 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')}\n\n` +
                `📍 ${toSansBold('Step 1/2: Enter Review Link')}\n` +
                `(e.g., Google Maps link, Trustpilot URL, Play Store link):`,
              cancelInputKeyboard
            );
          }

          // BROADCAST
          if (norm.includes('broadcast') || rawText === STYLED_LABELS.BROADCAST) {
            userStateMap.set(fromId, { step: 'ADMIN_BROADCAST' });
            return ctx.reply(
              `📢 ${toSansBold('𝗦𝗲𝗻𝗱 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁 𝗠𝗲𝘀𝘀𝗮𝗴𝗲')}\n\n` +
                `Please send the **text message** (or **photo with caption**) you want to broadcast to all members:`,
              cancelInputKeyboard
            );
          }

          // DELETE WORK
          if (norm.includes('delete') || rawText.includes('DELETE WORK') || rawText === STYLED_LABELS.DELETE_WORK) {
            const activeTasks = await Task.find({ status: 'active' });
            if (!activeTasks || activeTasks.length === 0) {
              return ctx.reply('⚠️ No active review tasks found in database.', adminPanelKeyboard);
            }

            await ctx.reply(`🗑️ ${toSansBold('𝗦𝗲𝗹𝗲𝗰𝘁 𝗮 𝗧𝗮𝘀𝗸 𝘁𝗼 𝗗𝗲𝗹𝗲𝘁𝗲')} (${activeTasks.length} Active):`);

            for (const t of activeTasks) {
              await ctx.reply(
                `🔗 Link: ${t.targetLink}\n📝 Instructions: ${t.instructions.slice(0, 60)}...`,
                Markup.inlineKeyboard([[Markup.button.callback(`🗑️ Delete Task`, `admin_del_task_${t._id}`)]])
              );
            }
            return;
          }

          // BAN USER
          if (norm.includes('ban') && !norm.includes('unban')) {
            userStateMap.set(fromId, { step: 'ADMIN_BAN_USER' });
            return ctx.reply(
              `🚫 ${toSansBold('𝗕𝗮𝗻 𝗨𝘀𝗲𝗿')}\n\nPlease enter the **Telegram ID** of the user you want to ban:`,
              cancelInputKeyboard
            );
          }

          // UNBAN USER
          if (norm.includes('unban')) {
            userStateMap.set(fromId, { step: 'ADMIN_UNBAN_USER' });
            return ctx.reply(
              `✅ ${toSansBold('𝗨𝗻𝗯𝗮𝗻 𝗨𝘀𝗲𝗿')}\n\nPlease enter the **Telegram ID** of the user you want to unban:`,
              cancelInputKeyboard
            );
          }

          // USER INFO
          if (norm.includes('info') || rawText === STYLED_LABELS.USER_INFO) {
            userStateMap.set(fromId, { step: 'ADMIN_USER_INFO' });
            return ctx.reply(
              `🔍 ${toSansBold('𝗨𝘀𝗲𝗿 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻 𝗟𝗼𝗼𝗸𝘂𝗽')}\n\nPlease enter the **Telegram ID** or **@username** of the user:`,
              cancelInputKeyboard
            );
          }

          // ADD BALANCE
          if (norm.includes('add') && norm.includes('bal')) {
            userStateMap.set(fromId, { step: 'ADMIN_ADD_BAL_USER' });
            return ctx.reply(
              `💰 ${toSansBold('𝗔𝗱𝗱 𝗕𝗮𝗹𝗮𝗻𝗰𝗲 𝘁𝗼 𝗨𝘀𝗲𝗿')}\n\nPlease enter the recipient user's **Telegram ID**:`,
              cancelInputKeyboard
            );
          }

          // REMOVE BALANCE
          if (norm.includes('remove') && norm.includes('bal')) {
            userStateMap.set(fromId, { step: 'ADMIN_REM_BAL_USER' });
            return ctx.reply(
              `➖ ${toSansBold('𝗥𝗲𝗺𝗼𝘃𝗲 𝗕𝗮𝗹𝗮𝗻𝗰𝗲 𝗳𝗿𝗼𝗺 𝗨𝘀𝗲𝗿')}\n\nPlease enter the user's **Telegram ID**:`,
              cancelInputKeyboard
            );
          }

          // SET REFERRAL %
          if (norm.includes('set') && norm.includes('ref')) {
            userStateMap.set(fromId, { step: 'ADMIN_SET_REF' });
            return ctx.reply(
              `⚙️ ${toSansBold('𝗦𝗲𝘁 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗖𝗼𝗺𝗺𝗶𝘀𝘀𝗶𝗼𝗻')}\n\nCurrent: ${settings.referralPercent}%\nEnter the new percentage rate (e.g. \`10\` or \`15\`):`,
              cancelInputKeyboard
            );
          }

          // SET MIN WITHDRAWAL
          if (norm.includes('min') && (norm.includes('w') || norm.includes('withdraw'))) {
            userStateMap.set(fromId, { step: 'ADMIN_SET_MIN_WD' });
            return ctx.reply(
              `⚙️ ${toSansBold('𝗦𝗲𝘁 𝗠𝗶𝗻𝗶𝗺𝘂𝗺 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹')}\n\nCurrent: ${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}\nEnter the new minimum withdrawal in ${settings.currencySymbol}:`,
              cancelInputKeyboard
            );
          }

          // STATISTICS
          if (norm.includes('stat') || rawText === STYLED_LABELS.STATISTICS) {
            const totalUsers = await User.countDocuments();
            const bannedUsers = await User.countDocuments({ isBanned: true });
            const activeTasks = await Task.countDocuments({ status: 'active' });
            const pendingSubmissions = await Submission.countDocuments({ status: 'pending' });
            const approvedSubmissions = await Submission.countDocuments({ status: 'approved' });
            const totalWithdrawnAgg = await Withdrawal.aggregate([{ $match: { status: 'approved' } }]);
            const totalPaid = totalWithdrawnAgg[0]?.total || 0;

            return ctx.reply(
              `📊 ${toSansBold('𝗦𝘆𝘀𝘁𝗲𝗺 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')} 📊\n\n` +
                `👥 ${toSansBold('𝗨𝘀𝗲𝗿 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n` +
                `• Total Registered Users: ${totalUsers}\n` +
                `• Active Users: ${totalUsers - bannedUsers}\n` +
                `• Banned Users: ${bannedUsers}\n\n` +
                `📝 ${toSansBold('𝗧𝗮𝘀𝗸 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n` +
                `• Active Review Tasks: ${activeTasks}\n` +
                `• Pending Proof Submissions: ${pendingSubmissions}\n` +
                `• Total Completed Reviews: ${approvedSubmissions}\n\n` +
                `💳 ${toSansBold('𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n` +
                `• Total Payouts Disbursed: ${settings.currencySymbol}${totalPaid.toFixed(2)}\n` +
                `• Current Min Withdrawal: ${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}\n` +
                `• Current Referral Commission: ${settings.referralPercent}%`,
              adminPanelKeyboard
            );
          }
        }
      });

      // Confirm / Publish Task from Preview
      bot.action('admin_confirm_task', async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const currentSession = userStateMap.get(ctx.from.id);
        const draft = currentSession?.data?.draft;
        const settings = await getSettings();

        if (!draft || !draft.targetLink) {
          await ctx.answerCbQuery('Session expired.', { show_alert: true });
          return ctx.reply('⚠️ Task session expired. Tap "➕ Add Review Work" again.', adminPanelKeyboard);
        }

        const newTask = await Task.create({
          title: 'Review Task',
          targetLink: draft.targetLink,
          instructions: draft.instructions,
          rewardAmount: 10.0,
          maxCompletions: 100,
          createdBy: ctx.from.id,
          status: 'active',
        });

        userStateMap.delete(ctx.from.id);
        await ctx.answerCbQuery('✅ Review Work published!');
        await ctx.editMessageText(
          `✅ ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗣𝘂𝗯𝗹𝗶𝘀𝗵𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}\n\n` +
            `🔗 Link: ${newTask.targetLink}\n` +
            `📝 Message: ${newTask.instructions}\n\n` +
            `📢 Broadcasting alert to all members now...`
        );

        this.addLog('success', `Admin published new task (${newTask.targetLink})`);

        // Broadcast to users (clean link + message only)
        const alertText =
          `🔥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲!')}\n\n` +
          `🔗 ${toSansBold('𝗟𝗶𝗻𝗸')}:\n${newTask.targetLink}\n\n` +
          `📝 ${toSansBold('𝗠𝗲𝘀𝘀𝗮𝗴𝗲')}:\n${newTask.instructions}\n\n` +
          `Tap ${toSansBold('🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢')} in your menu to view and claim! 🏃‍♂️`;

        const allUsers = await User.find({ isBanned: false });
        let sentCount = 0;
        for (const u of allUsers) {
          try {
            await bot.telegram.sendMessage(u.telegramId, alertText);
            sentCount++;
            await new Promise((r) => setTimeout(r, 40));
          } catch (e) {}
        }
        return ctx.reply(`📢 Alert successfully broadcasted to ${sentCount} members!`, adminPanelKeyboard);
      });

      // Cancel Task Creation
      bot.action('admin_cancel_task', async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        userStateMap.delete(ctx.from.id);
        await ctx.answerCbQuery('Cancelled.');
        await ctx.editMessageText(`❌ ${toSansBold('𝗧𝗮𝘀𝗸 𝗖𝗿𝗲𝗮𝘁𝗶𝗼𝗻 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱')}`);
        return ctx.reply(`Returned to ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹')}.`, adminPanelKeyboard);
      });

      // Delete Task Action Callback
      bot.action(/admin_del_task_(.+)/, async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const taskId = ctx.match[1];
        await Task.findByIdAndUpdate(taskId, { status: 'deleted' });
        await ctx.answerCbQuery('Task deleted.');
        return ctx.editMessageText(`🗑️ ${toSansBold('𝗧𝗮𝘀𝗸 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}`);
      });

      // Proof Approval & Rejection Actions
      bot.action(/proof_app_(.+)/, async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const subId = ctx.match[1];
        const submission = await Submission.findById(subId).populate('task');
        const settings = await getSettings();

        if (!submission || submission.status !== 'pending') {
          await ctx.answerCbQuery('Already reviewed.');
          return;
        }

        submission.status = 'approved';
        submission.reviewedBy = ctx.from.id;
        submission.reviewedAt = new Date();
        await submission.save();

        this.state.stats.proofsApproved++;

        // Credit user balance
        const worker = await User.findOne({ telegramId: submission.telegramId });
        if (worker) {
          worker.balance += submission.rewardAmount;
          worker.totalEarned += submission.rewardAmount;
          await worker.save();

          await Task.findByIdAndUpdate(submission.task._id, { $inc: { completedCount: 1 } });

          try {
            await bot.telegram.sendMessage(
              worker.telegramId,
              `🎉 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱!')}\n\n` +
                `💰 ${toSansBold(`+${settings.currencySymbol}${submission.rewardAmount.toFixed(2)}`)} added to your balance!`
            );
          } catch (e) {}

          // Referral commission
          if (worker.referredBy) {
            const bonus = (submission.rewardAmount * settings.referralPercent) / 100;
            if (bonus > 0) {
              await User.updateOne(
                { telegramId: worker.referredBy },
                { $inc: { balance: bonus, totalEarned: bonus, referralEarnings: bonus } }
              );
              try {
                await bot.telegram.sendMessage(
                  worker.referredBy,
                  `🎁 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀 𝗘𝗮𝗿𝗻𝗲𝗱!')}\n\n` +
                    `You earned ${toSansBold(`+${settings.currencySymbol}${bonus.toFixed(2)}`)} from your referral!`
                );
              } catch (e) {}
            }
          }
        }

        await ctx.answerCbQuery('Approved!');
        this.addLog('success', `Admin approved submission ${subId} (${settings.currencySymbol}${submission.rewardAmount})`);
        return ctx.editMessageText
          ? ctx.editMessageText(`✅ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} (${settings.currencySymbol}${submission.rewardAmount.toFixed(2)} credited)`)
          : ctx.editMessageCaption(`✅ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} (${settings.currencySymbol}${submission.rewardAmount.toFixed(2)} credited)`);
      });

      bot.action(/proof_rej_(.+)/, async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const subId = ctx.match[1];
        const submission = await Submission.findById(subId).populate('task');

        if (!submission || submission.status !== 'pending') {
          await ctx.answerCbQuery('Already handled.');
          return;
        }

        submission.status = 'rejected';
        submission.reviewedBy = ctx.from.id;
        submission.reviewedAt = new Date();
        await submission.save();

        try {
          await bot.telegram.sendMessage(
            submission.telegramId,
            `⚠️ ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')}\n\n` +
              `Your proof was not approved. Please resubmit valid proof via ${toSansBold('🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢')}.`
          );
        } catch (e) {}

        await ctx.answerCbQuery('Rejected.');
        this.addLog('warn', `Admin rejected submission ${subId}`);
        return ctx.editMessageText
          ? ctx.editMessageText(`❌ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')} by Admin`)
          : ctx.editMessageCaption(`❌ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')} by Admin`);
      });

      // Withdrawal Approval & Rejection Actions
      bot.action(/with_app_(.+)/, async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const wdId = ctx.match[1];
        const withdrawal = await Withdrawal.findById(wdId);
        const settings = await getSettings();

        if (!withdrawal || withdrawal.status !== 'pending') {
          await ctx.answerCbQuery('Already handled.');
          return;
        }

        withdrawal.status = 'approved';
        withdrawal.processedBy = ctx.from.id;
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        await User.updateOne({ telegramId: withdrawal.telegramId }, { $inc: { totalWithdrawn: withdrawal.amount } });
        this.state.stats.withdrawalsProcessed++;

        try {
          await bot.telegram.sendMessage(
            withdrawal.telegramId,
            `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱 & 𝗦𝗲𝗻𝘁!')}\n\n` +
              `Your UPI payout of ${toSansBold(`${settings.currencySymbol}${withdrawal.amount.toFixed(2)}`)} to \`${withdrawal.walletAddress}\` has been disbursed!`
          );
        } catch (e) {}

        await ctx.answerCbQuery('Withdrawal approved!');
        this.addLog('success', `Admin approved withdrawal ${wdId} (${settings.currencySymbol}${withdrawal.amount})`);
        return ctx.editMessageText(`✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} (${settings.currencySymbol}${withdrawal.amount.toFixed(2)} sent via UPI)`);
      });

      bot.action(/with_rej_(.+)/, async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const wdId = ctx.match[1];
        const withdrawal = await Withdrawal.findById(wdId);
        const settings = await getSettings();

        if (!withdrawal || withdrawal.status !== 'pending') {
          await ctx.answerCbQuery('Already handled.');
          return;
        }

        withdrawal.status = 'rejected';
        withdrawal.processedBy = ctx.from.id;
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        // Refund held balance back to user
        await User.updateOne({ telegramId: withdrawal.telegramId }, { $inc: { balance: withdrawal.amount } });

        try {
          await bot.telegram.sendMessage(
            withdrawal.telegramId,
            `❌ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')}\n\n` +
              `Your withdrawal of ${settings.currencySymbol}${withdrawal.amount.toFixed(2)} was rejected.\n` +
              `The amount has been fully refunded to your balance.`
          );
        } catch (e) {}

        await ctx.answerCbQuery('Rejected and refunded.');
        this.addLog('warn', `Admin rejected withdrawal ${wdId} (refunded ${settings.currencySymbol}${withdrawal.amount})`);
        return ctx.editMessageText(`❌ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱 & 𝗥𝗲𝗳𝘂𝗻𝗱𝗲𝗱')}`);
      });

      // 3. Test Bot connection via getMe()
      const botUser = await bot.telegram.getMe();
      this.state.botInfo = botUser;
      this.addLog('success', `Telegram API handshake verified! Connected as @${botUser.username} (${botUser.first_name})`);

      // 4. Launch polling
      bot.launch();

      this.state.status = 'running';
      this.state.startedAt = new Date().toISOString();
      this.startTime = Date.now();
      this.addLog('success', `🚀 Bot is RUNNING LIVE! Users can open @${botUser.username} on Telegram to interact.`);

      return { success: true };
    } catch (err: any) {
      this.state.status = 'error';
      this.state.errorMessage = err.message || 'Failed to start bot';
      this.addLog('error', `Failed to start bot: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  public async stop(): Promise<void> {
    if (this.bot) {
      try {
        this.addLog('info', 'Stopping Telegraf bot polling...');
        this.bot.stop('SIGINT');
      } catch (e: any) {
        console.error('Error stopping bot:', e.message);
      }
      this.bot = null;
    }
    this.state.status = 'stopped';
    this.startTime = null;
    this.addLog('warn', 'Bot process stopped.');
  }
}

export const botManager = new BotManager();
