/**
 * ============================================================================
 * 🤖 TELEGRAM REVIEW WORK & EARNING BOT (PRODUCTION-READY)
 * Tech Stack: Node.js (Telegraf v4) + MongoDB (Mongoose)
 * Featuring: Mathematical Sans-Serif Bold Unicode Styling
 * ============================================================================
 */

require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const mongoose = require('mongoose');

// Import MongoDB Models
const User = require('./models/User');
const Task = require('./models/Task');
const Submission = require('./models/Submission');
const Withdrawal = require('./models/Withdrawal');
const Setting = require('./models/Setting');
const { toSansBold, STYLED } = require('./utils/unicode');

// Validate Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_review_bot';
const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID);

if (!BOT_TOKEN) {
  console.error('❌ FATAL: BOT_TOKEN is missing in environment variables.');
  process.exit(1);
}

if (!ADMIN_USER_ID) {
  console.error('❌ FATAL: ADMIN_USER_ID is missing in environment variables.');
  process.exit(1);
}

// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ============================================================================
// 🎨 KEYBOARDS & MENUS
// ============================================================================

// Main User Persistent Keyboard
const mainUserKeyboard = Markup.keyboard([
  [STYLED.REVIEW_WORK, STYLED.BALANCE],
  [STYLED.PROFILE, STYLED.REFER],
  [STYLED.WITHDRAW, STYLED.SUPPORT],
]).resize();

// Admin Panel Persistent Keyboard
const adminPanelKeyboard = Markup.keyboard([
  [STYLED.BROADCAST, STYLED.ADD_WORK],
  [STYLED.DELETE_WORK, STYLED.BAN_USER],
  [STYLED.UNBAN_USER, STYLED.USER_INFO],
  [STYLED.ADD_BALANCE, STYLED.REMOVE_BALANCE],
  [STYLED.SET_REFERRAL, STYLED.SET_MIN_WITHDRAWAL],
  [STYLED.STATISTICS, STYLED.BACK_MENU],
]).resize();

// Cancel Session Keyboard (with Back button)
const cancelInputKeyboard = Markup.keyboard([['❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻']]).resize();

// ============================================================================
// ⚙️ DATABASE & SETTINGS HELPERS
// ============================================================================

async function getGlobalSettings() {
  let settings = await Setting.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await Setting.create({
      key: 'global_config',
      minWithdrawal: 5.0,
      referralPercent: 10,
      supportUsername: process.env.SUPPORT_USERNAME || 'TelegramSupport',
      currencySymbol: '$',
    });
  }
  return settings;
}

// Find or Register User Middleware helper
async function getOrCreateUser(ctx) {
  const from = ctx.from;
  if (!from) return null;

  let user = await User.findOne({ telegramId: from.id });
  if (!user) {
    // Check referral payload in /start <param>
    let referredBy = null;
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start ref_')) {
      const refId = Number(ctx.message.text.split('ref_')[1]);
      if (refId && refId !== from.id) {
        const referrer = await User.findOne({ telegramId: refId });
        if (referrer) {
          referredBy = refId;
          await User.updateOne({ telegramId: refId }, { $inc: { referralCount: 1 } });
        }
      }
    }

    user = await User.create({
      telegramId: from.id,
      username: from.username || '',
      firstName: from.first_name || '',
      lastName: from.last_name || '',
      balance: 0.0,
      referredBy: referredBy,
    });
  } else {
    // Keep username and activity fresh
    user.username = from.username || user.username;
    user.firstName = from.first_name || user.firstName;
    user.lastName = from.last_name || user.lastName;
    user.lastActiveAt = new Date();
    await user.save();
  }

  return user;
}

// Admin Check Helper
function isAdmin(telegramId) {
  return Number(telegramId) === ADMIN_USER_ID;
}

// ============================================================================
// 🛡️ GLOBAL MIDDLEWARE
// ============================================================================

bot.use(async (ctx, next) => {
  if (!ctx.from) return next();

  // Initialize session state if absent
  if (!ctx.session) ctx.session = {};

  const user = await getOrCreateUser(ctx);
  if (user && user.isBanned) {
    return ctx.reply(
      `🚫 ${toSansBold('𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗦𝘂𝘀𝗽𝗲𝗻𝗱𝗲𝗱')}\n\nYour account has been banned from using this bot.\nReason: ${
        user.banReason || 'Violation of terms'
      }`
    );
  }

  return next();
});

// Handle Session Cancel at any time
bot.hears('❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻', async (ctx) => {
  ctx.session = {};
  if (isAdmin(ctx.from.id)) {
    return ctx.reply(`✅ Operation cancelled. Returned to ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹')}.`, adminPanelKeyboard);
  }
  return ctx.reply(`✅ Operation cancelled. Returned to ${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.`, mainUserKeyboard);
});

// ============================================================================
// 🚀 /start COMMAND & MAIN MENU
// ============================================================================

bot.command('start', async (ctx) => {
  ctx.session = {};
  const user = await getOrCreateUser(ctx);
  const name = ctx.from.first_name || 'User';

  const welcomeText =
    `👋 ${toSansBold(`𝗪𝗲𝗹𝗰𝗼𝗺𝗲, ${name}!`)}\n\n` +
    `Earn real rewards by completing simple, verified **Review Tasks**! 🌟\n\n` +
    `📌 ${toSansBold('𝗤𝘂𝗶𝗰𝗸 𝗚𝘂𝗶𝗱𝗲')}:\n` +
    `• Tap ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to view available tasks.\n` +
    `• Follow the link and instructions, then submit screenshot/text proof.\n` +
    `• Once approved by admin, your earnings are credited instantly!\n` +
    `• Invite your friends via ${toSansBold('👥 𝗥𝗲𝗳𝗲𝗿')} for ongoing commissions.\n\n` +
    `👇 Select an option from the menu below:`;

  return ctx.reply(welcomeText, mainUserKeyboard);
});

// ============================================================================
// 👤 USER MENU HANDLERS
// ============================================================================

// 1. 💰 BALANCE
bot.hears(STYLED.BALANCE, async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const settings = await getGlobalSettings();

  const balanceMsg =
    `💰 ${toSansBold('𝗬𝗼𝘂𝗿 𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\n\n` +
    `💵 ${toSansBold('𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}: ${settings.currencySymbol}${user.balance.toFixed(2)}\n` +
    `📈 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗘𝗮𝗿𝗻𝗲𝗱')}: ${settings.currencySymbol}${user.totalEarned.toFixed(2)}\n` +
    `💳 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗻')}: ${settings.currencySymbol}${user.totalWithdrawn.toFixed(2)}\n` +
    `👥 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀')}: ${settings.currencySymbol}${user.referralEarnings.toFixed(2)}\n\n` +
    `ℹ️ Minimum withdrawal threshold: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}`;

  return ctx.reply(balanceMsg, {
    reply_markup: {
      inline_keyboard: [[Markup.button.callback('💳 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹', 'btn_req_withdraw')]],
    },
  });
});

// 2. 👤 PROFILE
bot.hears(STYLED.PROFILE, async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const completedCount = await Submission.countDocuments({ telegramId: ctx.from.id, status: 'approved' });
  const pendingCount = await Submission.countDocuments({ telegramId: ctx.from.id, status: 'pending' });

  const profileMsg =
    `👤 ${toSansBold('𝗬𝗼𝘂𝗿 𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗣𝗿𝗼𝗳𝗶𝗹𝗲')}\n\n` +
    `🆔 ${toSansBold('𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗜𝗗')}: \`${user.telegramId}\`\n` +
    `🏷️ ${toSansBold('𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲')}: ${user.username ? '@' + user.username : 'None'}\n` +
    `👤 ${toSansBold('𝗙𝘂𝗹𝗹 𝗡𝗮𝗺𝗲')}: ${user.firstName} ${user.lastName}\n\n` +
    `📊 ${toSansBold('𝗧𝗮𝘀𝗸 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')}:\n` +
    `• ✅ Approved Reviews: ${completedCount}\n` +
    `• ⏳ Pending Approvals: ${pendingCount}\n` +
    `• 👥 Total Referrals: ${user.referralCount}\n\n` +
    `📅 ${toSansBold('𝗠𝗲𝗺𝗯𝗲𝗿 𝗦𝗶𝗻𝗰𝗲')}: ${new Date(user.createdAt).toLocaleDateString()}`;

  return ctx.replyWithMarkdown(profileMsg);
});

// 3. 👥 REFERRAL SYSTEM
bot.hears(STYLED.REFER, async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const settings = await getGlobalSettings();
  const botInfo = await bot.telegram.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=ref_${user.telegramId}`;

  const referMsg =
    `👥 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 & 𝗔𝗳𝗳𝗶𝗹𝗶𝗮𝘁𝗲 𝗣𝗿𝗼𝗴𝗿𝗮𝗺')}\n\n` +
    `Share your exclusive invite link with friends and colleagues to earn passive income! 🚀\n\n` +
    `🎁 ${toSansBold('𝗖𝗼𝗺𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗮𝘁𝗲')}: ${toSansBold(`${settings.referralPercent}%`)} of every completed review!\n\n` +
    `📊 ${toSansBold('𝗬𝗼𝘂𝗿 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗦𝘁𝗮𝘁𝘀')}:\n` +
    `• Total Friends Joined: ${toSansBold(user.referralCount.toString())}\n` +
    `• Total Referral Earnings: ${toSansBold(`${settings.currencySymbol}${user.referralEarnings.toFixed(2)}`)}\n\n` +
    `🔗 ${toSansBold('𝗬𝗼𝘂𝗿 𝗨𝗻𝗶𝗾𝘂𝗲 𝗜𝗻𝘃𝗶𝘁𝗲 𝗟𝗶𝗻𝗸')}:\n\`${refLink}\`\n\n` +
    `Tap the link above to copy and share!`;

  return ctx.replyWithMarkdown(referMsg, {
    reply_markup: {
      inline_keyboard: [
        [
          Markup.button.url(
            '📲 𝗦𝗵𝗮𝗿𝗲 𝘄𝗶𝘁𝗵 𝗙𝗿𝗶𝗲𝗻𝗱𝘀',
            `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(
              '🔥 Join this bot to get paid for reviewing apps and websites!'
            )}`
          ),
        ],
      ],
    },
  });
});

// 4. 🛠️ SUPPORT
bot.hears(STYLED.SUPPORT, async (ctx) => {
  const settings = await getGlobalSettings();
  const supportText =
    `🛠️ ${toSansBold('𝗖𝘂𝘀𝘁𝗼𝗺𝗲𝗿 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 & 𝗛𝗲𝗹𝗽')}\n\n` +
    `Have questions, need help with a review task, or experiencing withdrawal issues?\n\n` +
    `💬 Official Support: @${settings.supportUsername}\n` +
    `⏰ Support Hours: 24/7 Response time within a few hours.`;

  return ctx.reply(supportText, {
    reply_markup: {
      inline_keyboard: [[Markup.button.url('💬 𝗖𝗼𝗻𝘁𝗮𝗰𝘁 𝗦𝘂𝗽𝗽𝗼𝗿𝘁', `https://t.me/${settings.supportUsername}`)]],
    },
  });
});

// ============================================================================
// 📝 REVIEW WORK WORKFLOW (USER)
// ============================================================================

bot.hears(STYLED.REVIEW_WORK, async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const settings = await getGlobalSettings();

  // Find all active tasks that:
  // 1. User has NOT cancelled (not in user.cancelledTasks)
  // 2. User has NOT already submitted (either pending or approved)
  const userSubmissions = await Submission.find({
    telegramId: user.telegramId,
    status: { $in: ['pending', 'approved'] },
  }).select('task');

  const excludedTaskIds = [
    ...(user.cancelledTasks || []),
    ...userSubmissions.map((s) => s.task),
  ];

  const availableTasks = await Task.find({
    status: 'active',
    _id: { $nin: excludedTaskIds },
  }).limit(5);

  if (!availableTasks || availableTasks.length === 0) {
    return ctx.reply(
      `🎉 ${toSansBold('𝗔𝗹𝗹 𝗖𝗮𝘂𝗴𝗵𝘁 𝗨𝗽!')}\n\n` +
        `There are currently no new review tasks available for your account.\n` +
        `Check back soon! You will receive a broadcast alert as soon as a new task is posted. 🔔`
    );
  }

  await ctx.reply(
    `📝 ${toSansBold('𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} (${availableTasks.length} Found)\n\n` +
      `Read the instructions carefully, visit the target link, and submit your proof below:`
  );

  // Send each task card with [ ❌ 𝗖𝗮𝗻𝗰𝗲𝗹 ] and [ 📤 𝗦𝘂𝗯𝗺𝗶𝘁 𝗣𝗿𝗼𝗼𝗳 ]
  for (const task of availableTasks) {
    const taskCard =
      `📌 ${toSansBold(task.title)}\n\n` +
      `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: ${settings.currencySymbol}${task.rewardAmount.toFixed(2)}\n` +
      `🔗 ${toSansBold('𝗧𝗮𝗿𝗴𝗲𝘁 𝗟𝗶𝗻𝗸')}: ${task.targetLink}\n\n` +
      `📋 ${toSansBold('𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\n${task.instructions}\n\n` +
      `⚠️ ${toSansItalic('Important: Only submit genuine proof. Duplicate submissions will be banned.')}`;

    await ctx.reply(taskCard, {
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback(STYLED.CANCEL, `task_cancel_${task._id}`),
            Markup.button.callback(STYLED.SUBMIT_PROOF, `task_submit_${task._id}`),
          ],
        ],
      },
    });
  }
});

// Inline Handler: User Cancels a Task
bot.action(/task_cancel_(.+)/, async (ctx) => {
  const taskId = ctx.match[1];
  const user = await getOrCreateUser(ctx);

  if (!user.cancelledTasks.includes(taskId)) {
    user.cancelledTasks.push(taskId);
    await user.save();
  }

  await ctx.answerCbQuery('Task cancelled. It will not be shown to you again.');
  return ctx.editMessageText(
    `❌ ${toSansBold('𝗧𝗮𝘀𝗸 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱')}\n\nYou have cancelled this task. It remains available for other community members.`
  );
});

// Inline Handler: User Clicks Submit Proof
bot.action(/task_submit_(.+)/, async (ctx) => {
  const taskId = ctx.match[1];
  const task = await Task.findById(taskId);

  if (!task || task.status !== 'active') {
    await ctx.answerCbQuery('This task is no longer available.', { show_alert: true });
    return ctx.editMessageText(`⚠️ ${toSansBold('𝗧𝗮𝘀𝗸 𝗘𝘅𝗽𝗶𝗿𝗲𝗱 𝗼𝗿 𝗙𝘂𝗹𝗹')}`);
  }

  // Set session state
  ctx.session = {
    step: 'AWAITING_PROOF',
    targetTaskId: taskId,
  };

  await ctx.answerCbQuery();
  return ctx.reply(
    `📤 ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘁 𝗬𝗼𝘂𝗿 𝗣𝗿𝗼𝗼𝗳')}\n\n` +
      `Task: ${toSansBold(task.title)}\n\n` +
      `Please **upload a screenshot image** or send a **detailed text proof** verifying that you completed the review.\n\n` +
      `Tap "❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻" below if you wish to exit.`,
    cancelInputKeyboard
  );
});

// ============================================================================
// 💳 WITHDRAWAL SYSTEM (USER)
// ============================================================================

bot.hears(STYLED.WITHDRAW, async (ctx) => {
  return handleWithdrawalPrompt(ctx);
});

bot.action('btn_req_withdraw', async (ctx) => {
  await ctx.answerCbQuery();
  return handleWithdrawalPrompt(ctx);
});

async function handleWithdrawalPrompt(ctx) {
  const user = await getOrCreateUser(ctx);
  const settings = await getGlobalSettings();

  if (user.balance < settings.minWithdrawal) {
    return ctx.reply(
      `⚠️ ${toSansBold('𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\n\n` +
        `Your Current Balance: ${toSansBold(`${settings.currencySymbol}${user.balance.toFixed(2)}`)}\n` +
        `Minimum Withdrawal: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}\n\n` +
        `Complete more ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to reach the payout threshold! 🚀`
    );
  }

  // Check if there is already a pending withdrawal
  const pendingWithdrawal = await Withdrawal.findOne({ telegramId: user.telegramId, status: 'pending' });
  if (pendingWithdrawal) {
    return ctx.reply(
      `⏳ ${toSansBold('𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗶𝗻 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀')}\n\n` +
        `You already have an active withdrawal request of ${toSansBold(
          `${settings.currencySymbol}${pendingWithdrawal.amount.toFixed(2)}`
        )} awaiting Admin review.\n` +
        `Please wait until it is processed before making another request.`
    );
  }

  ctx.session = {
    step: 'WITHDRAW_AMOUNT',
    maxBalance: user.balance,
  };

  return ctx.reply(
    `💳 ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁')}\n\n` +
      `Available Balance: ${toSansBold(`${settings.currencySymbol}${user.balance.toFixed(2)}`)}\n` +
      `Minimum Withdrawal: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}\n\n` +
      `Please enter the **amount** you want to withdraw (e.g. \`10.00\`):`,
    cancelInputKeyboard
  );
}

// ============================================================================
// 👑 ADMIN PANEL & SECURITY
// ============================================================================

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply('⛔ Access denied. This console is restricted.');
  }

  ctx.session = {};
  return ctx.reply(
    `👑 ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗻𝘁𝗿𝗼𝗹 𝗣𝗮𝗻𝗲𝗹')}\n\nWelcome back, Administrator. Select an action below:`,
    adminPanelKeyboard
  );
});

// Back to Main Menu from Admin Keyboard
bot.hears(STYLED.BACK_MENU, async (ctx) => {
  ctx.session = {};
  return ctx.reply(`Returned to ${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.`, mainUserKeyboard);
});

// 1. 📊 STATISTICS
bot.hears(STYLED.STATISTICS, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const totalUsers = await User.countDocuments();
  const bannedUsers = await User.countDocuments({ isBanned: true });
  const activeTasks = await Task.countDocuments({ status: 'active' });
  const pendingSubmissions = await Submission.countDocuments({ status: 'pending' });
  const approvedSubmissions = await Submission.countDocuments({ status: 'approved' });
  const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

  const totalWithdrawnAgg = await Withdrawal.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalPaid = totalWithdrawnAgg[0]?.total || 0;

  const statsMsg =
    `📊 ${toSansBold('𝗦𝘆𝘀𝘁𝗲𝗺 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')}\n\n` +
    `👥 ${toSansBold('𝗨𝘀𝗲𝗿 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n` +
    `• Total Registered Users: ${totalUsers}\n` +
    `• Active Users: ${totalUsers - bannedUsers}\n` +
    `• Banned Users: ${bannedUsers}\n\n` +
    `📝 ${toSansBold('𝗧𝗮𝘀𝗸 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n` +
    `• Active Review Tasks: ${activeTasks}\n` +
    `• Pending Proof Submissions: ${pendingSubmissions}\n` +
    `• Total Completed Reviews: ${approvedSubmissions}\n\n` +
    `💳 ${toSansBold('𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n` +
    `• Pending Withdrawals: ${pendingWithdrawals}\n` +
    `• Total Payouts Disbursed: $${totalPaid.toFixed(2)}`;

  return ctx.reply(statsMsg, adminPanelKeyboard);
});

// 2. ➕ ADD REVIEW WORK (Step-by-Step Wizard)
bot.hears(STYLED.ADD_WORK, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  ctx.session = {
    step: 'ADMIN_TASK_LINK',
    taskDraft: {},
  };

  return ctx.reply(
    `➕ ${toSansBold('𝗖𝗿𝗲𝗮𝘁𝗲 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')}\n\n` +
      `Step 1: Please enter the **Target Review Link**\n(e.g., Google Maps link, Trustpilot URL, App Store URL):`,
    cancelInputKeyboard
  );
});

// Confirmation buttons for Add Review Work
bot.action('admin_confirm_task', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const draft = ctx.session?.taskDraft;

  if (!draft || !draft.targetLink || !draft.instructions) {
    await ctx.answerCbQuery('Session expired. Please restart task creation.', { show_alert: true });
    return ctx.reply('⚠️ Creation session expired.', adminPanelKeyboard);
  }

  // Create Task in DB
  const newTask = await Task.create({
    title: draft.title || 'Review Task',
    targetLink: draft.targetLink,
    instructions: draft.instructions,
    rewardAmount: draft.rewardAmount || 0.5,
    maxCompletions: draft.maxCompletions || 100,
    createdBy: ctx.from.id,
    status: 'active',
  });

  ctx.session = {};
  await ctx.answerCbQuery('Task published successfully!');

  await ctx.editMessageText(
    `✅ ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗣𝘂𝗯𝗹𝗶𝘀𝗵𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}\nTask ID: \`${newTask._id}\``
  );

  // 📢 BROADCAST ON ADD
  // "🔥 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲! 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 𝗶𝘁 𝗳𝗮𝘀𝘁 𝗯𝗲𝗳𝗼𝗿𝗲 𝗼𝘁𝗵𝗲𝗿𝘀 𝗴𝗿𝗮𝗯 𝗶𝘁! 🏃‍♂️"
  const broadcastText =
    `🔥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲!')}\n` +
    `${toSansBold('𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 𝗶𝘁 𝗳𝗮𝘀𝘁 𝗯𝗲𝗳𝗼𝗿𝗲 𝗼𝘁𝗵𝗲𝗿𝘀 𝗴𝗿𝗮𝗯 𝗶𝘁! 🏃‍♂️')}\n\n` +
    `📌 ${toSansBold(newTask.title)}\n` +
    `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: $${newTask.rewardAmount.toFixed(2)}\n\n` +
    `Tap ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} in your menu to view and claim!`;

  // Asynchronously broadcast to users with rate limiting
  broadcastToAllUsers(broadcastText);

  return ctx.reply(`📢 Alert broadcasted to all active members!`, adminPanelKeyboard);
});

bot.action('admin_cancel_task', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.session = {};
  await ctx.answerCbQuery('Cancelled.');
  return ctx.editMessageText(`❌ ${toSansBold('𝗧𝗮𝘀𝗸 𝗖𝗿𝗲𝗮𝘁𝗶𝗼𝗻 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱')}`);
});

// 3. 🗑️ DELETE REVIEW WORK
bot.hears(STYLED.DELETE_WORK, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const tasks = await Task.find({ status: 'active' }).limit(10);
  if (!tasks.length) {
    return ctx.reply('ℹ️ No active review tasks found to delete.');
  }

  const buttons = tasks.map((t) => [
    Markup.button.callback(`🗑️ ${t.title.slice(0, 20)} ($${t.rewardAmount})`, `del_task_${t._id}`),
  ]);

  return ctx.reply(
    `🗑️ ${toSansBold('𝗦𝗲𝗹𝗲𝗰𝘁 𝗮 𝗧𝗮𝘀𝗸 𝘁𝗼 𝗗𝗲𝗹𝗲𝘁𝗲')}:`,
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/del_task_(.+)/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const taskId = ctx.match[1];
  await Task.findByIdAndUpdate(taskId, { status: 'deleted' });
  await ctx.answerCbQuery('Task deleted.');
  return ctx.editMessageText(`🗑️ ${toSansBold('𝗧𝗮𝘀𝗸 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆')}`);
});

// 4. 📢 BROADCAST
bot.hears(STYLED.BROADCAST, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  ctx.session = { step: 'BROADCAST_MESSAGE' };
  return ctx.reply(
    `📢 ${toSansBold('𝗦𝗲𝗻𝗱 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁 𝗠𝗲𝘀𝘀𝗮𝗴𝗲')}\n\n` +
      `Enter the message text you want to send to all registered users:`,
    cancelInputKeyboard
  );
});

// 5. 🚫 BAN USER & 6. ✅ UNBAN USER
bot.hears(STYLED.BAN_USER, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.session = { step: 'BAN_USER_INPUT' };
  return ctx.reply(`🚫 ${toSansBold('𝗕𝗮𝗻 𝗨𝘀𝗲𝗿')}\n\nEnter the Telegram ID or @username of the user to ban:`, cancelInputKeyboard);
});

bot.hears(STYLED.UNBAN_USER, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.session = { step: 'UNBAN_USER_INPUT' };
  return ctx.reply(`✅ ${toSansBold('𝗨𝗻𝗯𝗮𝗻 𝗨𝘀𝗲𝗿')}\n\nEnter the Telegram ID or @username of the user to unban:`, cancelInputKeyboard);
});

// 6. 🔍 USER INFO
bot.hears(STYLED.USER_INFO, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.session = { step: 'USER_INFO_INPUT' };
  return ctx.reply(`🔍 ${toSansBold('𝗨𝘀𝗲𝗿 𝗟𝗼𝗼𝗸𝘂𝗽')}\n\nEnter the Telegram ID or @username to inspect:`, cancelInputKeyboard);
});

// 7. ➕ ADD BALANCE & 8. ➖ REMOVE BALANCE
bot.hears(STYLED.ADD_BALANCE, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.session = { step: 'ADD_BALANCE_INPUT' };
  return ctx.reply(
    `➕ ${toSansBold('𝗔𝗱𝗱 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\n\nEnter Telegram ID and Amount separated by a space (e.g. \`123456789 5.00\`):`,
    cancelInputKeyboard
  );
});

bot.hears(STYLED.REMOVE_BALANCE, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.session = { step: 'REMOVE_BALANCE_INPUT' };
  return ctx.reply(
    `➖ ${toSansBold('𝗥𝗲𝗺𝗼𝘃𝗲 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\n\nEnter Telegram ID and Amount separated by a space (e.g. \`123456789 2.50\`):`,
    cancelInputKeyboard
  );
});

// 9. ⚙️ SET REFERRAL %
bot.hears(STYLED.SET_REFERRAL, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const settings = await getGlobalSettings();
  ctx.session = { step: 'SET_REF_INPUT' };
  return ctx.reply(
    `⚙️ ${toSansBold('𝗦𝗲𝘁 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗣𝗲𝗿𝗰𝗲𝗻𝘁𝗮𝗴𝗲')}\n\n` +
      `Current Commission: ${settings.referralPercent}%\n` +
      `Enter new percentage value (0 - 100):`,
    cancelInputKeyboard
  );
});

// 10. ⚙️ SET MIN WITHDRAWAL
bot.hears(STYLED.SET_MIN_WITHDRAWAL, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const settings = await getGlobalSettings();
  ctx.session = { step: 'SET_MIN_WITHDRAW_INPUT' };
  return ctx.reply(
    `⚙️ ${toSansBold('𝗦𝗲𝘁 𝗠𝗶𝗻𝗶𝗺𝘂𝗺 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹')}\n\n` +
      `Current Minimum: $${settings.minWithdrawal.toFixed(2)}\n` +
      `Enter new minimum withdrawal amount (e.g. 10.00):`,
    cancelInputKeyboard
  );
});

// ============================================================================
// 📥 PROOF APPROVAL & REJECTION (ADMIN INLINE ACTIONS)
// ============================================================================

// Approve Proof
bot.action(/proof_app_(.+)/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const submissionId = ctx.match[1];
  const submission = await Submission.findById(submissionId).populate('task');

  if (!submission || submission.status !== 'pending') {
    await ctx.answerCbQuery('This submission has already been reviewed.', { show_alert: true });
    return ctx.editMessageReplyMarkup(undefined);
  }

  submission.status = 'approved';
  submission.reviewedBy = ctx.from.id;
  submission.reviewedAt = new Date();
  await submission.save();

  // Credit user's balance
  const user = await User.findOne({ telegramId: submission.telegramId });
  if (user) {
    user.balance += submission.rewardAmount;
    user.totalEarned += submission.rewardAmount;
    await user.save();

    // Increment task completed count
    await Task.findByIdAndUpdate(submission.task._id, { $inc: { completedCount: 1 } });

    // Notify user
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `🎉 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱!')}\n\n` +
          `Your submission for "${submission.task.title}" has been verified.\n` +
          `💰 ${toSansBold(`+$${submission.rewardAmount.toFixed(2)}`)} added to your balance!`
      );
    } catch (e) {
      console.error('Failed to notify user:', e.message);
    }

    // Check Referral Commission
    if (user.referredBy) {
      const settings = await getGlobalSettings();
      const bonus = (submission.rewardAmount * settings.referralPercent) / 100;
      if (bonus > 0) {
        await User.updateOne(
          { telegramId: user.referredBy },
          {
            $inc: {
              balance: bonus,
              totalEarned: bonus,
              referralEarnings: bonus,
            },
          }
        );

        try {
          await bot.telegram.sendMessage(
            user.referredBy,
            `🎁 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀 𝗘𝗮𝗿𝗻𝗲𝗱!')}\n\n` +
              `You earned ${toSansBold(`+$${bonus.toFixed(2)}`)} from your referral's completed review!`
          );
        } catch (e) {
          console.error('Failed to notify referrer:', e.message);
        }
      }
    }
  }

  await ctx.answerCbQuery('Submission approved!');
  return ctx.editMessageCaption
    ? ctx.editMessageCaption(`✅ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} by Admin`)
    : ctx.editMessageText(`✅ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} by Admin`);
});

// Reject Proof
bot.action(/proof_rej_(.+)/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const submissionId = ctx.match[1];
  const submission = await Submission.findById(submissionId).populate('task');

  if (!submission || submission.status !== 'pending') {
    await ctx.answerCbQuery('Already reviewed.', { show_alert: true });
    return;
  }

  submission.status = 'rejected';
  submission.reviewedBy = ctx.from.id;
  submission.reviewedAt = new Date();
  await submission.save();

  // Task becomes active again for the user (they can re-submit)
  try {
    await bot.telegram.sendMessage(
      submission.telegramId,
      `⚠️ ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')}\n\n` +
        `Your proof for "${submission.task.title}" was not approved.\n` +
        `Please make sure you follow all instructions and resubmit valid proof via ${toSansBold(
          '📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸'
        )}.`
    );
  } catch (e) {
    console.error('Failed to notify user:', e.message);
  }

  await ctx.answerCbQuery('Submission rejected.');
  return ctx.editMessageCaption
    ? ctx.editMessageCaption(`❌ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')} by Admin`)
    : ctx.editMessageText(`❌ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')} by Admin`);
});

// ============================================================================
// 💳 WITHDRAWAL APPROVAL & REJECTION (ADMIN INLINE ACTIONS)
// ============================================================================

bot.action(/with_app_(.+)/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const withdrawalId = ctx.match[1];
  const withdrawal = await Withdrawal.findById(withdrawalId);

  if (!withdrawal || withdrawal.status !== 'pending') {
    await ctx.answerCbQuery('Withdrawal already handled.', { show_alert: true });
    return;
  }

  withdrawal.status = 'approved';
  withdrawal.processedBy = ctx.from.id;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  // Mark total withdrawn for user
  await User.updateOne({ telegramId: withdrawal.telegramId }, { $inc: { totalWithdrawn: withdrawal.amount } });

  try {
    await bot.telegram.sendMessage(
      withdrawal.telegramId,
      `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱 & 𝗦𝗲𝗻𝘁!')}\n\n` +
        `Your payout of ${toSansBold(`$${withdrawal.amount.toFixed(2)}`)} via ${withdrawal.paymentMethod} ` +
        `to \`${withdrawal.walletAddress}\` has been processed successfully! 🚀`
    );
  } catch (e) {
    console.error('Failed to notify user:', e.message);
  }

  await ctx.answerCbQuery('Withdrawal approved!');
  return ctx.editMessageText(`✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} ($${withdrawal.amount.toFixed(2)})`);
});

bot.action(/with_rej_(.+)/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const withdrawalId = ctx.match[1];
  const withdrawal = await Withdrawal.findById(withdrawalId);

  if (!withdrawal || withdrawal.status !== 'pending') {
    await ctx.answerCbQuery('Withdrawal already handled.', { show_alert: true });
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
        `Your withdrawal of $${withdrawal.amount.toFixed(2)} was rejected.\n` +
        `The amount has been fully refunded to your balance. Please check your wallet address or contact support.`
    );
  } catch (e) {
    console.error('Failed to notify user:', e.message);
  }

  await ctx.answerCbQuery('Withdrawal rejected and refunded.');
  return ctx.editMessageText(`❌ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱 & 𝗥𝗲𝗳𝘂𝗻𝗱𝗲𝗱')}`);
});

// ============================================================================
// 💬 SESSION STATE MACHINE & TEXT/PHOTO INPUT DISPATCHER
// ============================================================================

bot.on(['text', 'photo'], async (ctx) => {
  const step = ctx.session?.step;
  if (!step) return;

  const text = ctx.message?.text?.trim() || '';

  // 1. User Submitting Proof
  if (step === 'AWAITING_PROOF') {
    const taskId = ctx.session.targetTaskId;
    const task = await Task.findById(taskId);

    if (!task) {
      ctx.session = {};
      return ctx.reply('⚠️ Task not found or expired.', mainUserKeyboard);
    }

    let proofType = 'text';
    let proofContent = text;
    let proofCaption = ctx.message.caption || '';

    if (ctx.message.photo && ctx.message.photo.length > 0) {
      proofType = 'photo';
      // Pick highest resolution photo
      const highestPhoto = ctx.message.photo[ctx.message.photo.length - 1];
      proofContent = highestPhoto.file_id;
    }

    if (!proofContent && !proofCaption) {
      return ctx.reply('⚠️ Please provide a screenshot or text proof.');
    }

    // Create Submission Record
    const user = await getOrCreateUser(ctx);
    const submission = await Submission.create({
      task: task._id,
      user: user._id,
      telegramId: ctx.from.id,
      proofType: proofType,
      proofContent: proofContent,
      proofCaption: proofCaption,
      rewardAmount: task.rewardAmount,
      status: 'pending',
    });

    ctx.session = {};

    await ctx.reply(
      `✅ ${toSansBold('𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}\n\n` +
        `Task: ${toSansBold(task.title)}\n` +
        `Reward: $${task.rewardAmount.toFixed(2)}\n\n` +
        `Your submission is now **Pending Admin Review**. You will be notified automatically as soon as it is verified! 🔔`,
      mainUserKeyboard
    );

    // Forward notification to Admin with inline buttons
    try {
      const adminNotice =
        `📥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻!')}\n\n` +
        `👤 ${toSansBold('𝗨𝘀𝗲𝗿')}: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})\n` +
        `🆔 ${toSansBold('𝗜𝗗')}: \`${ctx.from.id}\`\n` +
        `📋 ${toSansBold('𝗧𝗮𝘀𝗸')}: ${task.title}\n` +
        `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: $${task.rewardAmount.toFixed(2)}\n` +
        (proofCaption ? `💬 Note: ${proofCaption}\n` : '') +
        (proofType === 'text' ? `\n📝 Text Proof:\n${proofContent}\n` : '');

      const inlineButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback(STYLED.APPROVE, `proof_app_${submission._id}`),
          Markup.button.callback(STYLED.REJECT, `proof_rej_${submission._id}`),
        ],
      ]);

      if (proofType === 'photo') {
        await bot.telegram.sendPhoto(ADMIN_USER_ID, proofContent, {
          caption: adminNotice,
          ...inlineButtons,
        });
      } else {
        await bot.telegram.sendMessage(ADMIN_USER_ID, adminNotice, inlineButtons);
      }
    } catch (e) {
      console.error('Failed to notify admin of submission:', e.message);
    }
    return;
  }

  // 2. Withdrawal Step 1: Amount
  if (step === 'WITHDRAW_AMOUNT') {
    const amount = parseFloat(text);
    const settings = await getGlobalSettings();
    const user = await getOrCreateUser(ctx);

    if (isNaN(amount) || amount < settings.minWithdrawal || amount > user.balance) {
      return ctx.reply(
        `⚠️ Invalid amount. Please enter a valid number between $${settings.minWithdrawal.toFixed(2)} and $${user.balance.toFixed(2)}:`
      );
    }

    ctx.session.step = 'WITHDRAW_ADDRESS';
    ctx.session.withdrawAmount = amount;

    return ctx.reply(
      `💳 Withdrawal Amount: ${toSansBold(`$${amount.toFixed(2)}`)}\n\n` +
        `Now, please send your **payout method and wallet address**\n(e.g., \`USDT TRC20: TXYZ...\` or \`TON: EQD...\` or \`Binance Pay ID: 123456\`):`,
      cancelInputKeyboard
    );
  }

  // 3. Withdrawal Step 2: Address & Submission
  if (step === 'WITHDRAW_ADDRESS') {
    const address = text;
    if (address.length < 5) {
      return ctx.reply('⚠️ Please provide a valid wallet address or payment handle:');
    }

    const amount = ctx.session.withdrawAmount;
    const user = await getOrCreateUser(ctx);

    // Re-verify balance
    if (user.balance < amount) {
      ctx.session = {};
      return ctx.reply('⚠️ Insufficient balance.', mainUserKeyboard);
    }

    // Deduct immediately into hold
    user.balance -= amount;
    await user.save();

    const withdrawal = await Withdrawal.create({
      user: user._id,
      telegramId: user.telegramId,
      username: user.username,
      amount: amount,
      paymentMethod: 'USDT / Crypto',
      walletAddress: address,
      status: 'pending',
    });

    ctx.session = {};

    await ctx.reply(
      `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱!')}\n\n` +
        `Amount: $${amount.toFixed(2)}\n` +
        `Address: \`${address}\`\n\n` +
        `Your request has been forwarded to the Administrator for verification and payout.`,
      mainUserKeyboard
    );

    // Alert Admin
    try {
      const adminWithdrawNotice =
        `💳 ${toSansBold('𝗡𝗲𝘄 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁!')}\n\n` +
        `👤 User: @${user.username || 'None'} (ID: \`${user.telegramId}\`)\n` +
        `💰 Amount: $${amount.toFixed(2)}\n` +
        `📍 Address: \`${address}\``;

      await bot.telegram.sendMessage(
        ADMIN_USER_ID,
        adminWithdrawNotice,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(STYLED.APPROVE, `with_app_${withdrawal._id}`),
            Markup.button.callback(STYLED.REJECT, `with_rej_${withdrawal._id}`),
          ],
        ])
      );
    } catch (e) {
      console.error('Failed to notify admin of withdrawal:', e.message);
    }
    return;
  }

  // ========================================================================
  // ADMIN STATES
  // ========================================================================
  if (!isAdmin(ctx.from.id)) return;

  // Task Creation Flow
  if (step === 'ADMIN_TASK_LINK') {
    if (!text.startsWith('http://') && !text.startsWith('https://')) {
      return ctx.reply('⚠️ Please provide a valid URL starting with http:// or https://');
    }
    ctx.session.taskDraft.targetLink = text;
    ctx.session.step = 'ADMIN_TASK_TITLE';
    return ctx.reply(`Step 2: Enter a brief **Title** for this task (e.g. \`Review Google Maps Restaurant\`):`);
  }

  if (step === 'ADMIN_TASK_TITLE') {
    ctx.session.taskDraft.title = text;
    ctx.session.step = 'ADMIN_TASK_INSTRUCTIONS';
    return ctx.reply(`Step 3: Enter the **Instructions text** for the user\n(e.g., \`Leave a 5-star rating with at least 15 words and attach a screenshot\`):`);
  }

  if (step === 'ADMIN_TASK_INSTRUCTIONS') {
    ctx.session.taskDraft.instructions = text;
    ctx.session.step = 'ADMIN_TASK_REWARD';
    return ctx.reply(`Step 4: Enter the **Reward amount** in USD per review (e.g. \`0.75\`):`);
  }

  if (step === 'ADMIN_TASK_REWARD') {
    const reward = parseFloat(text);
    if (isNaN(reward) || reward <= 0) {
      return ctx.reply('⚠️ Please enter a positive numerical reward:');
    }
    ctx.session.taskDraft.rewardAmount = reward;

    const draft = ctx.session.taskDraft;

    // Show Confirmation Preview with ✅ 𝗗𝗼𝗻𝗲 or ❌ 𝗖𝗮𝗻𝗰𝗲𝗹
    const previewCard =
      `📋 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗣𝗿𝗲𝘃𝗶𝗲𝘄')}\n\n` +
      `📌 ${toSansBold('𝗧𝗶𝘁𝗹𝗲')}: ${draft.title}\n` +
      `🔗 ${toSansBold('𝗧𝗮𝗿𝗴𝗲𝘁 𝗟𝗶𝗻𝗸')}: ${draft.targetLink}\n` +
      `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: $${draft.rewardAmount.toFixed(2)}\n\n` +
      `📝 ${toSansBold('𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\n${draft.instructions}\n\n` +
      `Confirm publishing this task:`;

    return ctx.reply(previewCard, {
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback(STYLED.DONE, 'admin_confirm_task'),
            Markup.button.callback(STYLED.CANCEL, 'admin_cancel_task'),
          ],
        ],
      },
    });
  }

  // Broadcast Message
  if (step === 'BROADCAST_MESSAGE') {
    ctx.session = {};
    await ctx.reply('⏳ Starting broadcast to all active users...');
    broadcastToAllUsers(text);
    return ctx.reply('✅ Broadcast queued.', adminPanelKeyboard);
  }

  // Ban User
  if (step === 'BAN_USER_INPUT') {
    ctx.session = {};
    const target = text.replace('@', '');
    const user = await User.findOne({
      $or: [{ telegramId: isNaN(Number(target)) ? null : Number(target) }, { username: target }],
    });

    if (!user) return ctx.reply(`⚠️ User not found.`, adminPanelKeyboard);

    user.isBanned = true;
    user.banReason = 'Banned by Administrator';
    await user.save();
    return ctx.reply(`🚫 User ${user.telegramId} (@${user.username}) is now banned.`, adminPanelKeyboard);
  }

  // Unban User
  if (step === 'UNBAN_USER_INPUT') {
    ctx.session = {};
    const target = text.replace('@', '');
    const user = await User.findOne({
      $or: [{ telegramId: isNaN(Number(target)) ? null : Number(target) }, { username: target }],
    });

    if (!user) return ctx.reply(`⚠️ User not found.`, adminPanelKeyboard);

    user.isBanned = false;
    await user.save();
    return ctx.reply(`✅ User ${user.telegramId} (@${user.username}) is now unbanned.`, adminPanelKeyboard);
  }

  // User Info Lookup
  if (step === 'USER_INFO_INPUT') {
    ctx.session = {};
    const target = text.replace('@', '');
    const user = await User.findOne({
      $or: [{ telegramId: isNaN(Number(target)) ? null : Number(target) }, { username: target }],
    });

    if (!user) return ctx.reply(`⚠️ User not found.`, adminPanelKeyboard);

    const info =
      `🔍 ${toSansBold('𝗨𝘀𝗲𝗿 𝗗𝗲𝘁𝗮𝗶𝗹𝘀')}\n\n` +
      `ID: \`${user.telegramId}\`\n` +
      `Username: @${user.username || 'None'}\n` +
      `Name: ${user.firstName} ${user.lastName}\n` +
      `Balance: $${user.balance.toFixed(2)}\n` +
      `Total Earned: $${user.totalEarned.toFixed(2)}\n` +
      `Withdrawn: $${user.totalWithdrawn.toFixed(2)}\n` +
      `Referrals: ${user.referralCount}\n` +
      `Status: ${user.isBanned ? '🚫 BANNED' : '✅ Active'}`;

    return ctx.reply(info, adminPanelKeyboard);
  }

  // Add Balance
  if (step === 'ADD_BALANCE_INPUT') {
    ctx.session = {};
    const [userId, amountStr] = text.split(' ');
    const amount = parseFloat(amountStr);

    if (!userId || isNaN(amount) || amount <= 0) {
      return ctx.reply('⚠️ Invalid format. Example: 123456789 5.00', adminPanelKeyboard);
    }

    const user = await User.findOneAndUpdate(
      { telegramId: Number(userId) },
      { $inc: { balance: amount, totalEarned: amount } },
      { new: true }
    );

    if (!user) return ctx.reply('⚠️ User not found.', adminPanelKeyboard);

    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `💰 ${toSansBold('𝗕𝗮𝗹𝗮𝗻𝗰𝗲 𝗖𝗿𝗲𝗱𝗶𝘁𝗲𝗱!')}\nAdmin credited +$${amount.toFixed(2)} to your account.`
      );
    } catch (e) {}

    return ctx.reply(`✅ Added +$${amount.toFixed(2)} to user ${userId}. New balance: $${user.balance.toFixed(2)}`, adminPanelKeyboard);
  }

  // Remove Balance
  if (step === 'REMOVE_BALANCE_INPUT') {
    ctx.session = {};
    const [userId, amountStr] = text.split(' ');
    const amount = parseFloat(amountStr);

    if (!userId || isNaN(amount) || amount <= 0) {
      return ctx.reply('⚠️ Invalid format. Example: 123456789 2.50', adminPanelKeyboard);
    }

    const user = await User.findOne({ telegramId: Number(userId) });
    if (!user) return ctx.reply('⚠️ User not found.', adminPanelKeyboard);

    user.balance = Math.max(0, user.balance - amount);
    await user.save();

    return ctx.reply(`✅ Deducted $${amount.toFixed(2)} from user ${userId}. New balance: $${user.balance.toFixed(2)}`, adminPanelKeyboard);
  }

  // Set Referral %
  if (step === 'SET_REF_INPUT') {
    ctx.session = {};
    const percent = parseFloat(text);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      return ctx.reply('⚠️ Invalid percentage. Must be between 0 and 100.', adminPanelKeyboard);
    }

    await Setting.updateOne({ key: 'global_config' }, { referralPercent: percent }, { upsert: true });
    return ctx.reply(`✅ Referral commission updated to ${percent}%`, adminPanelKeyboard);
  }

  // Set Min Withdrawal
  if (step === 'SET_MIN_WITHDRAW_INPUT') {
    ctx.session = {};
    const minW = parseFloat(text);
    if (isNaN(minW) || minW <= 0) {
      return ctx.reply('⚠️ Invalid amount. Must be greater than 0.', adminPanelKeyboard);
    }

    await Setting.updateOne({ key: 'global_config' }, { minWithdrawal: minW }, { upsert: true });
    return ctx.reply(`✅ Minimum withdrawal updated to $${minW.toFixed(2)}`, adminPanelKeyboard);
  }
});

// ============================================================================
// 📢 BROADCAST UTILITY WITH RATE-LIMITING
// ============================================================================
async function broadcastToAllUsers(messageText) {
  try {
    const users = await User.find({ isBanned: false }).select('telegramId');
    console.log(`Starting broadcast to ${users.length} users...`);

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await bot.telegram.sendMessage(u.telegramId, messageText);
        sent++;
      } catch (err) {
        failed++;
      }
      // Sleep 35ms between messages to stay safely below Telegram's 30 msgs/second flood limits
      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    console.log(`Broadcast completed. Sent: ${sent}, Failed: ${failed}`);
  } catch (err) {
    console.error('Broadcast error:', err.message);
  }
}

// ============================================================================
// 🚀 SERVER & DATABASE BOOTSTRAP
// ============================================================================
async function startBot() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    await getGlobalSettings();

    console.log('⏳ Launching Telegram Bot...');
    await bot.launch();
    console.log('🚀 Telegram Bot is running live & listening for updates!');

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// If run directly
if (require.main === module) {
  startBot();
}

module.exports = { bot, startBot };
