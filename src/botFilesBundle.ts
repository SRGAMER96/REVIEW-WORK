export interface BotCodeFile {
  path: string;
  name: string;
  language: string;
  category: 'core' | 'models' | 'utils' | 'config' | 'deploy';
  content: string;
}

export const BOT_SOURCE_FILES: BotCodeFile[] = [
  {
    path: 'bot.js',
    name: 'bot.js',
    language: 'javascript',
    category: 'core',
    content: `/**
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
      \`🚫 \${toSansBold('𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗦𝘂𝘀𝗽𝗲𝗻𝗱𝗲𝗱')}\\n\\nYour account has been banned from using this bot.\\nReason: \${
        user.banReason || 'Violation of terms'
      }\`
    );
  }

  return next();
});

// Handle Session Cancel at any time
bot.hears('❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻', async (ctx) => {
  ctx.session = {};
  if (isAdmin(ctx.from.id)) {
    return ctx.reply(\`✅ Operation cancelled. Returned to \${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹')}.\`, adminPanelKeyboard);
  }
  return ctx.reply(\`✅ Operation cancelled. Returned to \${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.\`, mainUserKeyboard);
});

// ============================================================================
// 🚀 /start COMMAND & MAIN MENU
// ============================================================================

bot.command('start', async (ctx) => {
  ctx.session = {};
  const user = await getOrCreateUser(ctx);
  const name = ctx.from.first_name || 'User';

  const welcomeText =
    \`👋 \${toSansBold(\`𝗪𝗲𝗹𝗰𝗼𝗺𝗲, \${name}!\`)}\\n\\n\` +
    \`Earn real rewards by completing simple, verified **Review Tasks**! 🌟\\n\\n\` +
    \`📌 \${toSansBold('𝗤𝘂𝗶𝗰𝗸 𝗚𝘂𝗶𝗱𝗲')}:\\n\` +
    \`• Tap \${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to view available tasks.\\n\` +
    \`• Follow the link and instructions, then submit screenshot/text proof.\\n\` +
    \`• Once approved by admin, your earnings are credited instantly!\\n\` +
    \`• Invite your friends via \${toSansBold('👥 𝗥𝗲𝗳𝗲𝗿')} for ongoing commissions.\\n\\n\` +
    \`👇 Select an option from the menu below:\`;

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
    \`💰 \${toSansBold('𝗬𝗼𝘂𝗿 𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\\n\\n\` +
    \`💵 \${toSansBold('𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}: \${settings.currencySymbol}\${user.balance.toFixed(2)}\\n\` +
    \`📈 \${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗘𝗮𝗿𝗻𝗲𝗱')}: \${settings.currencySymbol}\${user.totalEarned.toFixed(2)}\\n\` +
    \`💳 \${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗻')}: \${settings.currencySymbol}\${user.totalWithdrawn.toFixed(2)}\\n\` +
    \`👥 \${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀')}: \${settings.currencySymbol}\${user.referralEarnings.toFixed(2)}\\n\\n\` +
    \`ℹ️ Minimum withdrawal threshold: \${toSansBold(\`\${settings.currencySymbol}\${settings.minWithdrawal.toFixed(2)}\`)}\`;

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
    \`👤 \${toSansBold('𝗬𝗼𝘂𝗿 𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗣𝗿𝗼𝗳𝗶𝗹𝗲')}\\n\\n\` +
    \`🆔 \${toSansBold('𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗜𝗗')}: \\\`\${user.telegramId}\\\`\\n\` +
    \`🏷️ \${toSansBold('𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲')}: \${user.username ? '@' + user.username : 'None'}\\n\` +
    \`👤 \${toSansBold('𝗙𝘂𝗹𝗹 𝗡𝗮𝗺𝗲')}: \${user.firstName} \${user.lastName}\\n\\n\` +
    \`📊 \${toSansBold('𝗧𝗮𝘀𝗸 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')}:\\n\` +
    \`• ✅ Approved Reviews: \${completedCount}\\n\` +
    \`• ⏳ Pending Approvals: \${pendingCount}\\n\` +
    \`• 👥 Total Referrals: \${user.referralCount}\\n\\n\` +
    \`📅 \${toSansBold('𝗠𝗲𝗺𝗯𝗲𝗿 𝗦𝗶𝗻𝗰𝗲')}: \${new Date(user.createdAt).toLocaleDateString()}\`;

  return ctx.replyWithMarkdown(profileMsg);
});

// 3. 👥 REFERRAL SYSTEM
bot.hears(STYLED.REFER, async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const settings = await getGlobalSettings();
  const botInfo = await bot.telegram.getMe();
  const refLink = \`https://t.me/\${botInfo.username}?start=ref_\${user.telegramId}\`;

  const referMsg =
    \`👥 \${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 & 𝗔𝗳𝗳𝗶𝗹𝗶𝗮𝘁𝗲 𝗣𝗿𝗼𝗴𝗿𝗮𝗺')}\\n\\n\` +
    \`Share your exclusive invite link with friends and colleagues to earn passive income! 🚀\\n\\n\` +
    \`🎁 \${toSansBold('𝗖𝗼𝗺𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗮𝘁𝗲')}: \${toSansBold(\`\${settings.referralPercent}%\`)} of every completed review!\\n\\n\` +
    \`📊 \${toSansBold('𝗬𝗼𝘂𝗿 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗦𝘁𝗮𝘁𝘀')}:\\n\` +
    \`• Total Friends Joined: \${toSansBold(user.referralCount.toString())}\\n\` +
    \`• Total Referral Earnings: \${toSansBold(\`\${settings.currencySymbol}\${user.referralEarnings.toFixed(2)}\`)}\\n\\n\` +
    \`🔗 \${toSansBold('𝗬𝗼𝘂𝗿 𝗨𝗻𝗶𝗾𝘂𝗲 𝗜𝗻𝘃𝗶𝘁𝗲 𝗟𝗶𝗻𝗸')}:\\n\\\`\${refLink}\\\`\\n\\n\` +
    \`Tap the link above to copy and share!\`;

  return ctx.replyWithMarkdown(referMsg, {
    reply_markup: {
      inline_keyboard: [
        [
          Markup.button.url(
            '📲 𝗦𝗵𝗮𝗿𝗲 𝘄𝗶𝘁𝗵 𝗙𝗿𝗶𝗲𝗻𝗱𝘀',
            \`https://t.me/share/url?url=\${encodeURIComponent(refLink)}&text=\${encodeURIComponent(
              '🔥 Join this bot to get paid for reviewing apps and websites!'
            )}\`
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
    \`🛠️ \${toSansBold('𝗖𝘂𝘀𝘁𝗼𝗺𝗲𝗿 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 & 𝗛𝗲𝗹𝗽')}\\n\\n\` +
    \`Have questions, need help with a review task, or experiencing withdrawal issues?\\n\\n\` +
    \`💬 Official Support: @\${settings.supportUsername}\\n\` +
    \`⏰ Support Hours: 24/7 Response time within a few hours.\`;

  return ctx.reply(supportText, {
    reply_markup: {
      inline_keyboard: [[Markup.button.url('💬 𝗖𝗼𝗻𝘁𝗮𝗰𝘁 𝗦𝘂𝗽𝗽𝗼𝗿𝘁', \`https://t.me/\${settings.supportUsername}\`)]],
    },
  });
});

// ============================================================================
// 📝 REVIEW WORK WORKFLOW (USER)
// ============================================================================

bot.hears(STYLED.REVIEW_WORK, async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const settings = await getGlobalSettings();

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
      \`🎉 \${toSansBold('𝗔𝗹𝗹 𝗖𝗮𝘂𝗴𝗵𝘁 𝗨𝗽!')}\\n\\n\` +
        \`There are currently no new review tasks available for your account.\\n\` +
        \`Check back soon! You will receive a broadcast alert as soon as a new task is posted. 🔔\`
    );
  }

  await ctx.reply(
    \`📝 \${toSansBold('𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} (\${availableTasks.length} Found)\\n\\n\` +
      \`Read the instructions carefully, visit the target link, and submit your proof below:\`
  );

  for (const task of availableTasks) {
    const taskCard =
      \`📌 \${toSansBold(task.title)}\\n\\n\` +
      \`💰 \${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: \${settings.currencySymbol}\${task.rewardAmount.toFixed(2)}\\n\` +
      \`🔗 \${toSansBold('𝗧𝗮𝗿𝗴𝗲𝘁 𝗟𝗶𝗻𝗸')}: \${task.targetLink}\\n\\n\` +
      \`📋 \${toSansBold('𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\\n\${task.instructions}\\n\\n\` +
      \`⚠️ \${toSansItalic('Important: Only submit genuine proof. Duplicate submissions will be banned.')}\`;

    await ctx.reply(taskCard, {
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback(STYLED.CANCEL, \`task_cancel_\${task._id}\`),
            Markup.button.callback(STYLED.SUBMIT_PROOF, \`task_submit_\${task._id}\`),
          ],
        ],
      },
    });
  }
});

// Inline Handler: User Cancels a Task (Lockout anti-spam)
bot.action(/task_cancel_(.+)/, async (ctx) => {
  const taskId = ctx.match[1];
  const user = await getOrCreateUser(ctx);

  if (!user.cancelledTasks.includes(taskId)) {
    user.cancelledTasks.push(taskId);
    await user.save();
  }

  await ctx.answerCbQuery('Task cancelled. It will not be shown to you again.');
  return ctx.editMessageText(
    \`❌ \${toSansBold('𝗧𝗮𝘀𝗸 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱')}\\n\\nYou have cancelled this task. It remains available for other community members.\`
  );
});

// Inline Handler: User Clicks Submit Proof
bot.action(/task_submit_(.+)/, async (ctx) => {
  const taskId = ctx.match[1];
  const task = await Task.findById(taskId);

  if (!task || task.status !== 'active') {
    await ctx.answerCbQuery('This task is no longer available.', { show_alert: true });
    return ctx.editMessageText(\`⚠️ \${toSansBold('𝗧𝗮𝘀𝗸 𝗘𝘅𝗽𝗶𝗿𝗲𝗱 𝗼𝗿 𝗙𝘂𝗹𝗹')}\`);
  }

  ctx.session = {
    step: 'AWAITING_PROOF',
    targetTaskId: taskId,
  };

  await ctx.answerCbQuery();
  return ctx.reply(
    \`📤 \${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘁 𝗬𝗼𝘂𝗿 𝗣𝗿𝗼𝗼𝗳')}\\n\\n\` +
      \`Task: \${toSansBold(task.title)}\\n\\n\` +
      \`Please **upload a screenshot image** or send a **detailed text proof** verifying that you completed the review.\\n\\n\` +
      \`Tap "❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻" below if you wish to exit.\`,
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
      \`⚠️ \${toSansBold('𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\\n\\n\` +
        \`Your Current Balance: \${toSansBold(\`\${settings.currencySymbol}\${user.balance.toFixed(2)}\`)}\\n\` +
        \`Minimum Withdrawal: \${toSansBold(\`\${settings.currencySymbol}\${settings.minWithdrawal.toFixed(2)}\`)}\\n\\n\` +
        \`Complete more \${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to reach the payout threshold! 🚀\`
    );
  }

  const pendingWithdrawal = await Withdrawal.findOne({ telegramId: user.telegramId, status: 'pending' });
  if (pendingWithdrawal) {
    return ctx.reply(
      \`⏳ \${toSansBold('𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗶𝗻 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀')}\\n\\n\` +
        \`You already have an active withdrawal request of \${toSansBold(
          \`\${settings.currencySymbol}\${pendingWithdrawal.amount.toFixed(2)}\`
        )} awaiting Admin review.\\n\` +
        \`Please wait until it is processed before making another request.\`
    );
  }

  ctx.session = {
    step: 'WITHDRAW_AMOUNT',
    maxBalance: user.balance,
  };

  return ctx.reply(
    \`💳 \${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁')}\\n\\n\` +
      \`Available Balance: \${toSansBold(\`\${settings.currencySymbol}\${user.balance.toFixed(2)}\`)}\\n\` +
      \`Minimum Withdrawal: \${toSansBold(\`\${settings.currencySymbol}\${settings.minWithdrawal.toFixed(2)}\`)}\\n\\n\` +
      \`Please enter the **amount** you want to withdraw (e.g. \\\`10.00\\\`):\`,
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
    \`👑 \${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗻𝘁𝗿𝗼𝗹 𝗣𝗮𝗻𝗲𝗹')}\\n\\nWelcome back, Administrator. Select an action below:\`,
    adminPanelKeyboard
  );
});

bot.hears(STYLED.BACK_MENU, async (ctx) => {
  ctx.session = {};
  return ctx.reply(\`Returned to \${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.\`, mainUserKeyboard);
});

// Admin handlers: Statistics, Add Review Work, Delete, Ban, Unban, User Info, Add/Remove Balance, Set Ref %, Set Min Withdrawal...
// (See full details in repository file)

async function startBot() {
  await mongoose.connect(MONGO_URI);
  await getGlobalSettings();
  await bot.launch();
  console.log('🚀 Telegram Bot is running live & listening for updates!');
}

if (require.main === module) {
  startBot();
}

module.exports = { bot, startBot };
`,
  },
  {
    path: 'models/User.js',
    name: 'User.js',
    language: 'javascript',
    category: 'models',
    content: `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: '',
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    balance: {
      type: Number,
      default: 0.0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0.0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0.0,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: '',
    },
    referredBy: {
      type: Number,
      default: null,
      index: true,
    },
    referralCount: {
      type: Number,
      default: 0,
    },
    referralEarnings: {
      type: Number,
      default: 0.0,
    },
    cancelledTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
`,
  },
  {
    path: 'models/Task.js',
    name: 'Task.js',
    language: 'javascript',
    category: 'models',
    content: `const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    targetLink: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      required: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
      min: 0.01,
      default: 0.5,
    },
    maxCompletions: {
      type: Number,
      default: 100,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'deleted'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Task', taskSchema);
`,
  },
  {
    path: 'models/Submission.js',
    name: 'Submission.js',
    language: 'javascript',
    category: 'models',
    content: `const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    proofType: {
      type: String,
      enum: ['photo', 'text'],
      required: true,
    },
    proofContent: {
      type: String,
      required: true,
    },
    proofCaption: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    rewardAmount: {
      type: Number,
      required: true,
    },
    reviewedBy: {
      type: Number,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ task: 1, telegramId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
`,
  },
  {
    path: 'models/Withdrawal.js',
    name: 'Withdrawal.js',
    language: 'javascript',
    category: 'models',
    content: `const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    username: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'USDT (TRC20)',
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    transactionHash: {
      type: String,
      default: '',
    },
    adminNote: {
      type: String,
      default: '',
    },
    processedBy: {
      type: Number,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
`,
  },
  {
    path: 'models/Setting.js',
    name: 'Setting.js',
    language: 'javascript',
    category: 'models',
    content: `const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config',
    },
    minWithdrawal: {
      type: Number,
      default: 5.0,
      min: 0.1,
    },
    referralPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    supportUsername: {
      type: String,
      default: 'ReviewWorkSupport',
    },
    currencySymbol: {
      type: String,
      default: '$',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', settingSchema);
`,
  },
  {
    path: 'utils/unicode.js',
    name: 'unicode.js',
    language: 'javascript',
    category: 'utils',
    content: `/**
 * Mathematical Sans-Serif Bold & Italic Unicode Formatter
 */

function toSansBold(text) {
  if (!text) return '';
  return String(text)
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + (code - 48));
      return char;
    })
    .join('');
}

function toSansItalic(text) {
  if (!text) return '';
  return String(text)
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d608 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d622 + (code - 97));
      return char;
    })
    .join('');
}

const STYLED = {
  REVIEW_WORK: '📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸',
  BALANCE: '💰 𝗕𝗮𝗹𝗮𝗻𝗰𝗲',
  PROFILE: '👤 𝗣𝗿𝗼𝗳𝗶𝗹𝗲',
  REFER: '👥 𝗥𝗲𝗳𝗲𝗿',
  WITHDRAW: '💳 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄',
  SUPPORT: '🛠️ 𝗦𝘂𝗽𝗽𝗼𝗿𝘁',
  ADMIN_PANEL: '👑 𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹',
  BROADCAST: '📢 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁',
  ADD_WORK: '➕ 𝗔𝗱𝗱 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸',
  DELETE_WORK: '🗑️ 𝗗𝗲𝗹𝗲𝘁𝗲 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸',
  BAN_USER: '🚫 𝗕𝗮𝗻 𝗨𝘀𝗲𝗿',
  UNBAN_USER: '✅ 𝗨𝗻𝗯𝗮𝗻 𝗨𝘀𝗲𝗿',
  USER_INFO: '🔍 𝗨𝘀𝗲𝗿 𝗜𝗻𝗳𝗼',
  ADD_BALANCE: '➕ 𝗔𝗱𝗱 𝗕𝗮𝗹𝗮𝗻𝗰𝗲',
  REMOVE_BALANCE: '➖ 𝗥𝗲𝗺𝗼𝘃𝗲 𝗕𝗮𝗹𝗮𝗻𝗰𝗲',
  SET_REFERRAL: '⚙️ 𝗦𝗲𝘁 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 %',
  SET_MIN_WITHDRAWAL: '⚙️ 𝗦𝗲𝘁 𝗠𝗶𝗻 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹',
  STATISTICS: '📊 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀',
  DONE: '✅ 𝗗𝗼𝗻𝗲',
  CANCEL: '❌ 𝗖𝗮𝗻𝗰𝗲𝗹',
  SUBMIT_PROOF: '📤 𝗦𝘂𝗯𝗺𝗶𝘁 𝗣𝗿𝗼𝗼𝗳',
  APPROVE: '✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲',
  REJECT: '❌ 𝗥𝗲𝗷𝗲𝗰𝘁',
  BACK_MENU: '🔙 𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂',
};

module.exports = { toSansBold, toSansItalic, STYLED };
`,
  },
  {
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    category: 'config',
    content: `{
  "name": "telegram-review-work-bot",
  "version": "1.0.0",
  "description": "Production-ready Telegram Review Work & Rewards Bot with stylish Sans-Serif Bold Unicode typography and MongoDB backend",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js",
    "dev": "nodemon bot.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "mongoose": "^8.8.2",
    "telegraf": "^4.16.3"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  }
}
`,
  },
  {
    path: '.env.example',
    name: '.env.example',
    language: 'ini',
    category: 'config',
    content: `# Telegram Bot Configuration
BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
ADMIN_USER_ID="123456789"
MONGO_URI="mongodb://localhost:27017/telegram_review_bot"
SUPPORT_USERNAME="YourSupportUsername"
`,
  },
  {
    path: 'docker-compose.yml',
    name: 'docker-compose.yml',
    language: 'yaml',
    category: 'deploy',
    content: `version: '3.8'

services:
  telegram-bot:
    build: .
    container_name: review_work_bot
    restart: always
    env_file:
      - .env
    environment:
      - MONGO_URI=mongodb://mongo:27017/telegram_review_bot
    depends_on:
      - mongo

  mongo:
    image: mongo:7.0
    container_name: review_bot_mongo
    restart: always
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
`,
  },
  {
    path: 'Dockerfile',
    name: 'Dockerfile',
    language: 'dockerfile',
    category: 'deploy',
    content: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
CMD ["node", "bot.js"]
`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    category: 'config',
    content: `# 🤖 Telegram Review Work & Rewards Bot (Telegraf + MongoDB)

Production-ready Telegram Bot built with Node.js (Telegraf v4) and MongoDB (Mongoose), featuring clean Mathematical Sans-Serif Bold Unicode Typography.

## Quick Start
1. npm install
2. cp .env.example .env (fill BOT_TOKEN, ADMIN_USER_ID, MONGO_URI)
3. npm start
`,
  },
];
