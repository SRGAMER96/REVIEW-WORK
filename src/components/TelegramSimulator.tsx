import React, { useState, useRef, useEffect } from 'react';
import { IUser, ITask, ISubmission, IWithdrawal, IGlobalSettings, IBotMessage } from '../types';
import { toSansBold, toSansItalic, STYLED_LABELS } from '../utils/unicode';
import {
  Send,
  Paperclip,
  Smile,
  ShieldAlert,
  Crown,
  User,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface TelegramSimulatorProps {
  users: IUser[];
  tasks: ITask[];
  submissions: ISubmission[];
  withdrawals: IWithdrawal[];
  settings: IGlobalSettings;
  onUpdateUsers: (updater: (prev: IUser[]) => IUser[]) => void;
  onUpdateTasks: (updater: (prev: ITask[]) => ITask[]) => void;
  onUpdateSubmissions: (updater: (prev: ISubmission[]) => ISubmission[]) => void;
  onUpdateWithdrawals: (updater: (prev: IWithdrawal[]) => IWithdrawal[]) => void;
  onUpdateSettings: (updater: (prev: IGlobalSettings) => IGlobalSettings) => void;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  users,
  tasks,
  submissions,
  withdrawals,
  settings,
  onUpdateUsers,
  onUpdateTasks,
  onUpdateSubmissions,
  onUpdateWithdrawals,
  onUpdateSettings,
}) => {
  // Current active logged-in persona in the Telegram app
  const [activeUserId, setActiveUserId] = useState<number>(8962632792); // Admin @SRGAMER96 by default
  const [inAdminMenu, setInAdminMenu] = useState<boolean>(false);
  const currentUser = users.find((u) => u.telegramId === activeUserId) || users[0];
  const isAdmin = currentUser.telegramId === 8962632792 || currentUser.telegramId === 9990001;

  // Track chat histories for each user persona
  const [messagesByUser, setMessagesByUser] = useState<Record<number, IBotMessage[]>>({
    // Initial Alice chat
    1000101: [
      {
        id: 'msg_welcome_alice',
        sender: 'bot',
        userId: 1000101,
        text: `👋 ${toSansBold('𝗪𝗲𝗹𝗰𝗼𝗺𝗲, Alice!')}\n\nEarn real rewards by completing simple, verified **Review Tasks**! 🌟\n\n📌 ${toSansBold('𝗤𝘂𝗶𝗰𝗸 𝗚𝘂𝗶𝗱𝗲')}:\n• Tap ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to view available tasks.\n• Follow the link and instructions, then submit screenshot/text proof.\n• Once approved by admin, your earnings are credited instantly!\n• Invite your friends via ${toSansBold('👥 𝗥𝗲𝗳𝗲𝗿')} for ongoing commissions.\n\n👇 Select an option from the menu below:`,
        timestamp: '10:00 AM',
      },
    ],
    // Initial Bob chat
    1000202: [
      {
        id: 'msg_welcome_bob',
        sender: 'bot',
        userId: 1000202,
        text: `👋 ${toSansBold('𝗪𝗲𝗹𝗰𝗼𝗺𝗲, Bob!')}\n\nYou were referred by @AliceWorker. Earn real rewards by completing review tasks!`,
        timestamp: '10:05 AM',
      },
    ],
    // Initial Admin chat
    9990001: [
      {
        id: 'msg_admin_init',
        sender: 'bot',
        userId: 9990001,
        text: `👑 ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗻𝘁𝗿𝗼𝗹 𝗣𝗮𝗻𝗲𝗹')}\n\nWelcome back, Administrator. Select an action below:`,
        timestamp: '09:50 AM',
      },
      {
        id: 'msg_admin_pending_sub',
        sender: 'bot',
        userId: 9990001,
        text: `📥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻!')}\n\n👤 ${toSansBold('𝗨𝘀𝗲𝗿')}: Bob Miller (@BobCrypto)\n🆔 ${toSansBold('𝗜𝗗')}: \`1000202\`\n📋 ${toSansBold('𝗧𝗮𝘀𝗸')}: Trustpilot: SwiftPay Wallet 5-Star Rating\n💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: $1.25\n\n📝 Text Proof:\n"SwiftPay is the best micro-wallet I have used this year. The USDT withdrawals take less than 2 minutes..."`,
        timestamp: '10:10 AM',
        inlineButtons: [
          [
            { text: STYLED_LABELS.APPROVE, callbackData: 'proof_app_sub_sample_01' },
            { text: STYLED_LABELS.REJECT, callbackData: 'proof_rej_sub_sample_01' },
          ],
        ],
      },
      {
        id: 'msg_admin_pending_wd',
        sender: 'bot',
        userId: 9990001,
        text: `💳 ${toSansBold('𝗡𝗲𝘄 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁!')}\n\n👤 User: @AliceWorker (ID: \`1000101\`)\n💰 Amount: $5.50\n📍 Address: \`TYDzsXDvTxGchG8UvWBE4m8Yq79tZ3bVpQ\``,
        timestamp: '10:12 AM',
        inlineButtons: [
          [
            { text: STYLED_LABELS.APPROVE, callbackData: 'with_app_wd_sample_01' },
            { text: STYLED_LABELS.REJECT, callbackData: 'with_rej_wd_sample_01' },
          ],
        ],
      },
    ],
  });

  // Simulator step machine per user
  const [userSession, setUserSession] = useState<
    Record<
      number,
      {
        step?: string;
        targetTaskId?: string;
        taskDraft?: Partial<ITask>;
        withdrawAmount?: number;
      }
    >
  >({});

  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeMessages = messagesByUser[activeUserId] || [];
  const currentSession = userSession[activeUserId] || {};

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const addMessage = (userId: number, message: Omit<IBotMessage, 'id' | 'timestamp' | 'userId'>) => {
    const newMsg: IBotMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessagesByUser((prev) => ({
      ...prev,
      [userId]: [...(prev[userId] || []), newMsg],
    }));
  };

  const broadcastMessage = (text: string, inlineButtons?: IBotMessage['inlineButtons']) => {
    setMessagesByUser((prev) => {
      const updated = { ...prev };
      users.forEach((u) => {
        if (!u.isBanned) {
          const newMsg: IBotMessage = {
            id: `bcast_${Date.now()}_${u.telegramId}`,
            sender: 'bot',
            userId: u.telegramId,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inlineButtons,
          };
          updated[u.telegramId] = [...(updated[u.telegramId] || []), newMsg];
        }
      });
      return updated;
    });
  };

  // Dispatch User Message or Button Click
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;
    setInputMessage('');

    // Append user message
    addMessage(activeUserId, {
      sender: 'user',
      text,
    });

    // Check if user is banned
    if (currentUser.isBanned) {
      setTimeout(() => {
        addMessage(activeUserId, {
          sender: 'bot',
          text: `🚫 ${toSansBold('𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗦𝘂𝘀𝗽𝗲𝗻𝗱𝗲𝗱')}\n\nYour account has been banned from using this bot.\nReason: ${
            currentUser.banReason || 'Violation of terms'
          }`,
        });
      }, 250);
      return;
    }

    // Process Bot Response
    setTimeout(() => {
      processCommand(text);
    }, 300);
  };

  const processCommand = (text: string) => {
    const session = userSession[activeUserId] || {};

    // 1. Check for cancel operation
    if (text === '❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻' || text.toLowerCase() === '/cancel') {
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
      addMessage(activeUserId, {
        sender: 'bot',
        text: `✅ Operation cancelled. Returned to ${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.`,
      });
      return;
    }

    // 2. /start command
    if (text.startsWith('/start')) {
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
      addMessage(activeUserId, {
        sender: 'bot',
        text: `👋 ${toSansBold(`𝗪𝗲𝗹𝗰𝗼𝗺𝗲, ${currentUser.firstName}!`)}\n\nEarn real rewards by completing simple, verified **Review Tasks**! 🌟\n\n📌 ${toSansBold('𝗤𝘂𝗶𝗰𝗸 𝗚𝘂𝗶𝗱𝗲')}:\n• Tap ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to view available tasks.\n• Follow the link and instructions, then submit screenshot/text proof.\n• Once approved by admin, your earnings are credited instantly!\n• Invite your friends via ${toSansBold('👥 𝗥𝗲𝗳𝗲𝗿')} for ongoing commissions.\n\n👇 Select an option from the menu below:`,
      });
      return;
    }

    // 3. /admin command or Admin Panel button
    if (text === '/admin' || text === STYLED_LABELS.ADMIN_PANEL || text.includes('𝗔𝗱𝗺𝗶𝗻') || text.includes('ADMIN')) {
      if (!isAdmin) {
        addMessage(activeUserId, {
          sender: 'bot',
          text: '⛔ Access denied. This console is restricted.',
        });
        return;
      }
      setInAdminMenu(true);
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
      addMessage(activeUserId, {
        sender: 'bot',
        text: `👑 ${toSansBold('𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗻𝘁𝗿𝗼𝗹 𝗣𝗮𝗻𝗲𝗹')} 👑\n\nWelcome back, Administrator. Select an action below:`,
      });
      return;
    }

    // Back to user main menu
    if (text === STYLED_LABELS.BACK_MENU || text.includes('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂') || text.includes('USER MENU')) {
      setInAdminMenu(false);
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
      addMessage(activeUserId, {
        sender: 'bot',
        text: `Returned to ${toSansBold('𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂')}.`,
      });
      return;
    }

    // 4. USER MENU BUTTONS
    // ----------------------------------------------------
    if (text === STYLED_LABELS.BALANCE || text.includes('𝗕𝗔𝗟𝗔𝗡𝗖𝗘') || text.includes('𝗕𝗮𝗹𝗮𝗻𝗰𝗲')) {
      addMessage(activeUserId, {
        sender: 'bot',
        text: `💎 ${toSansBold('𝗬𝗼𝘂𝗿 𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')} 💎\n\n💵 ${toSansBold('𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}: ${settings.currencySymbol}${currentUser.balance.toFixed(2)}\n📈 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗘𝗮𝗿𝗻𝗲𝗱')}: ${settings.currencySymbol}${currentUser.totalEarned.toFixed(2)}\n💳 ${toSansBold('𝗧𝗼𝘁𝗮𝗹 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗻')}: ${settings.currencySymbol}${currentUser.totalWithdrawn.toFixed(2)}\n🎁 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀')}: ${settings.currencySymbol}${currentUser.referralEarnings.toFixed(2)}\n\nℹ️ Minimum withdrawal threshold: ${toSansBold(`${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)}`)}`,
        inlineButtons: [[{ text: '💸 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗡𝗼𝘄', callbackData: 'btn_req_withdraw' }]],
      });
      return;
    }

    if (text === STYLED_LABELS.PROFILE || text.includes('𝗣𝗥𝗢𝗙𝗜𝗟𝗘') || text.includes('𝗣𝗿𝗼𝗳𝗶𝗹𝗲')) {
      const userCompletedCount = submissions.filter(
        (s) => s.telegramId === currentUser.telegramId && s.status === 'approved'
      ).length;
      const userPendingCount = submissions.filter(
        (s) => s.telegramId === currentUser.telegramId && s.status === 'pending'
      ).length;

      addMessage(activeUserId, {
        sender: 'bot',
        text: `🔮 ${toSansBold('𝗬𝗼𝘂𝗿 𝗔𝗰𝗰𝗼𝘂𝗻𝘁 𝗣𝗿𝗼𝗳𝗶𝗹𝗲')} 🔮\n\n🆔 ${toSansBold('𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗜𝗗')}: ${currentUser.telegramId}\n🏷️ ${toSansBold('𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲')}: ${currentUser.username ? '@' + currentUser.username : 'None'}\n👤 ${toSansBold('𝗙𝘂𝗹𝗹 𝗡𝗮𝗺𝗲')}: ${currentUser.firstName} ${currentUser.lastName}\n\n📊 ${toSansBold('𝗧𝗮𝘀𝗸 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')}:\n• ✅ Approved Reviews: ${userCompletedCount}\n• ⏳ Pending Approvals: ${userPendingCount}\n• 👥 Total Referrals: ${currentUser.referralCount}\n\n📅 ${toSansBold('𝗠𝗲𝗺𝗯𝗲𝗿 𝗦𝗶𝗻𝗰𝗲')}: ${new Date(currentUser.createdAt).toLocaleDateString()}`,
      });
      return;
    }

    if (text === STYLED_LABELS.REFER || text.includes('𝗜𝗡𝗩𝗜𝗧𝗘') || text.includes('𝗥𝗲𝗳𝗲𝗿')) {
      const refLink = `https://t.me/${settings.botUsername}?start=ref_${currentUser.telegramId}`;
      addMessage(activeUserId, {
        sender: 'bot',
        text: `🚀 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 & 𝗔𝗳𝗳𝗶𝗹𝗶𝗮𝘁𝗲 𝗣𝗿𝗼𝗴𝗿𝗮𝗺')} 🚀\n\nInvite friends to earn passive income! 💸\n\n🎁 ${toSansBold('𝗖𝗼𝗺𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗮𝘁𝗲')}: ${toSansBold(`${settings.referralPercent}%`)} of every completed review!\n\n📊 ${toSansBold('𝗬𝗼𝘂𝗿 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗦𝘁𝗮𝘁𝘀')}:\n• Total Friends Joined: ${toSansBold(currentUser.referralCount.toString())}\n• Total Referral Earnings: ${toSansBold(`${settings.currencySymbol}${currentUser.referralEarnings.toFixed(2)}`)}\n\n🔗 ${toSansBold('𝗬𝗼𝘂𝗿 𝗨𝗻𝗶𝗾𝘂𝗲 𝗜𝗻𝘃𝗶𝘁𝗲 𝗟𝗶𝗻𝗸')}:\n${refLink}\n\n👇 Tap the button below to share with your friends or groups in 1 click:`,
        inlineButtons: [
          [
            { text: '📲 𝗦𝗵𝗮𝗿𝗲 𝘄𝗶𝘁𝗵 𝗙𝗿𝗶𝗲𝗻𝗱𝘀 🚀', callbackData: 'btn_share_dummy' },
          ],
        ],
      });
      return;
    }

    if (text === STYLED_LABELS.SUPPORT || text.includes('𝗦𝗨𝗣𝗣𝗢𝗥𝗧') || text.includes('𝗦𝘂𝗽𝗽𝗼𝗿𝘁')) {
      addMessage(activeUserId, {
        sender: 'bot',
        text: `🛟 ${toSansBold('𝟮𝟰/𝟳 𝗖𝘂𝘀𝘁𝗼𝗺𝗲𝗿 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 & 𝗛𝗲𝗹𝗽')} 🛟\n\nNeed help with a review task, submission verification, or withdrawal issue?\n\n👤 ${toSansBold('𝗢𝗳𝗳𝗶𝗰𝗶𝗮𝗹 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 𝗠𝗮𝗻𝗮𝗴𝗲𝗿')}: @${settings.supportUsername}\n⏰ ${toSansBold('𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲 𝗧𝗶𝗺𝗲')}: Within a few minutes!\n\n👇 Click the button below to open a direct chat with our support manager:`,
        inlineButtons: [
          [
            { text: `💬 𝗖𝗼𝗻𝘁𝗮𝗰𝘁 @${settings.supportUsername} ↗️`, callbackData: 'btn_contact_support' },
          ],
        ],
      });
      return;
    }

    if (text === STYLED_LABELS.REVIEW_WORK || text.includes('𝗥𝗘𝗩𝗜𝗘𝗪') || text.includes('𝗥𝗲𝘃𝗶𝗲𝘄')) {
      // Find active tasks not submitted
      const userSubmissions = submissions
        .filter((s) => s.telegramId === currentUser.telegramId && s.status !== 'rejected')
        .map((s) => s.taskId);

      const availableTasks = tasks.filter((t) => t.status === 'active' && !userSubmissions.includes(t._id));

      if (availableTasks.length === 0) {
        addMessage(activeUserId, {
          sender: 'bot',
          text: `🎉 ${toSansBold('𝗔𝗹𝗹 𝗖𝗮𝘂𝗴𝗵𝘁 𝗨𝗽!')}\n\nYou have completed all available review tasks! 🥳\nCheck back soon! You will receive an instant alert as soon as a new task is posted. 🔔`,
        });
        return;
      }

      const currentTask = availableTasks[0];

      addMessage(activeUserId, {
        sender: 'bot',
        text: `📝 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} (1 of ${availableTasks.length} Available)\n\n` +
          `🔗 ${toSansBold('𝗟𝗶𝗻𝗸')}:\n${currentTask.targetLink}\n\n` +
          `📝 ${toSansBold('𝗠𝗲𝘀𝘀𝗮𝗴𝗲 / 𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\n${currentTask.instructions}\n\n` +
          `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: ${settings.currencySymbol}${currentTask.rewardAmount.toFixed(2)}\n\n` +
          `👇 Complete the task above, then tap "Submit Proof" below:`,
        inlineButtons: [
          [
            { text: '❌ 𝗖𝗮𝗻𝗰𝗲𝗹', callbackData: `task_cancel_${currentTask._id}` },
            { text: '📤 𝗦𝘂𝗯𝗺𝗶𝘁 𝗣𝗿𝗼𝗼𝗳 🚀', callbackData: `task_submit_${currentTask._id}` },
          ],
        ],
      });
      return;
    }

    if (text === STYLED_LABELS.WITHDRAW || text.includes('𝗪𝗜𝗧𝗛𝗗𝗥𝗔𝗪') || text.includes('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄')) {
      handleWithdrawalStart();
      return;
    }

    // 5. SESSION FLOWS (Awaiting input)
    // ----------------------------------------------------
    if (session.step === 'AWAITING_PROOF') {
      const taskId = session.targetTaskId;
      const task = tasks.find((t) => t._id === taskId);

      if (!task) {
        addMessage(activeUserId, { sender: 'bot', text: '⚠️ Task expired or not found.' });
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        return;
      }

      // Create new submission
      const newSubId = `sub_${Date.now()}`;
      const newSubmission: ISubmission = {
        _id: newSubId,
        taskId: task._id,
        taskTitle: task.title,
        userId: currentUser._id,
        telegramId: currentUser.telegramId,
        username: currentUser.username,
        userFullName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        proofType: text.startsWith('[Screenshot') ? 'photo' : 'text',
        proofContent: text,
        proofCaption: text.startsWith('[Screenshot') ? 'Screenshot attachment verified' : '',
        status: 'pending',
        rewardAmount: task.rewardAmount,
        createdAt: new Date().toISOString(),
      };

      onUpdateSubmissions((prev) => [newSubmission, ...prev]);
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));

      addMessage(activeUserId, {
        sender: 'bot',
        text: `✅ ${toSansBold('𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}\n\nTask: ${toSansBold(task.title)}\nReward: $${task.rewardAmount.toFixed(2)}\n\nYour submission is now **Pending Admin Review**. You will be notified automatically as soon as it is verified! 🔔`,
      });

      // Send instant review notification card to Admin Chief (ID: 9990001)
      addMessage(9990001, {
        sender: 'bot',
        text: `📥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻!')}\n\n👤 ${toSansBold('𝗨𝘀𝗲𝗿')}: ${currentUser.firstName} (@${currentUser.username || 'N/A'})\n🆔 ${toSansBold('𝗜𝗗')}: \`${currentUser.telegramId}\`\n📋 ${toSansBold('𝗧𝗮𝘀𝗸')}: ${task.title}\n💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: $${task.rewardAmount.toFixed(2)}\n\n📝 Proof:\n"${text}"`,
        inlineButtons: [
          [
            { text: STYLED_LABELS.APPROVE, callbackData: `proof_app_${newSubId}` },
            { text: STYLED_LABELS.REJECT, callbackData: `proof_rej_${newSubId}` },
          ],
        ],
      });
      return;
    }

    if (session.step === 'WITHDRAW_AMOUNT') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount < settings.minWithdrawal || amount > currentUser.balance) {
        addMessage(activeUserId, {
          sender: 'bot',
          text: `⚠️ Invalid amount. Please enter a valid number between ${settings.currencySymbol}${settings.minWithdrawal.toFixed(2)} and ${settings.currencySymbol}${currentUser.balance.toFixed(2)}:`,
        });
        return;
      }

      setUserSession((prev) => ({
        ...prev,
        [activeUserId]: { step: 'WITHDRAW_ADDRESS', withdrawAmount: amount },
      }));

      addMessage(activeUserId, {
        sender: 'bot',
        text: `💳 Withdrawal Amount: ${toSansBold(`${settings.currencySymbol}${amount.toFixed(2)}`)}\n\n📱 Please enter your **UPI ID**\n(e.g., \`user@okaxis\`, \`9876543210@paytm\` or \`mobile@upi\`):`,
      });
      return;
    }

    if (session.step === 'WITHDRAW_ADDRESS') {
      const amount = session.withdrawAmount || settings.minWithdrawal;
      const upiId = text;

      // Deduct balance immediately into hold
      onUpdateUsers((prev) =>
        prev.map((u) =>
          u.telegramId === currentUser.telegramId ? { ...u, balance: Math.max(0, u.balance - amount) } : u
        )
      );

      const newWdId = `wd_${Date.now()}`;
      const newWithdrawal: IWithdrawal = {
        _id: newWdId,
        userId: currentUser._id,
        telegramId: currentUser.telegramId,
        username: currentUser.username,
        amount,
        paymentMethod: 'UPI',
        walletAddress: upiId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      onUpdateWithdrawals((prev) => [newWithdrawal, ...prev]);
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));

      addMessage(activeUserId, {
        sender: 'bot',
        text: `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱!')}\n\n💰 Amount: ${settings.currencySymbol}${amount.toFixed(2)}\n🆔 UPI ID: \`${upiId}\`\n\nYour request has been forwarded to the Administrator for UPI transfer.`,
      });

      // Send instant withdrawal notification to Admin
      addMessage(8962632792, {
        sender: 'bot',
        text: `💳 ${toSansBold('𝗡𝗲𝘄 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁!')}\n\n👤 ${toSansBold('𝗨𝘀𝗲𝗿')}: ${currentUser.firstName} (@${currentUser.username || 'N/A'})\n🆔 ${toSansBold('𝗜𝗗')}: \`${currentUser.telegramId}\`\n💰 ${toSansBold('𝗔𝗺𝗼𝘂𝗻𝘁')}: ${settings.currencySymbol}${amount.toFixed(2)}\n🆔 ${toSansBold('𝗨𝗣𝗜 𝗜𝗗')}: \`${upiId}\``,
        inlineButtons: [
          [
            { text: STYLED_LABELS.APPROVE, callbackData: `with_app_${newWdId}` },
            { text: STYLED_LABELS.REJECT, callbackData: `with_rej_${newWdId}` },
          ],
        ],
      });
    }

    // 6. ADMIN BUTTONS & WIZARDS
    // ----------------------------------------------------
    if (isAdmin) {
      if (text === STYLED_LABELS.STATISTICS) {
        const totalUsers = users.length;
        const bannedUsers = users.filter((u) => u.isBanned).length;
        const activeTaskCount = tasks.filter((t) => t.status === 'active').length;
        const pendingSubCount = submissions.filter((s) => s.status === 'pending').length;
        const approvedSubCount = submissions.filter((s) => s.status === 'approved').length;
        const totalPaid = withdrawals
          .filter((w) => w.status === 'approved')
          .reduce((acc, w) => acc + w.amount, 0);

        addMessage(activeUserId, {
          sender: 'bot',
          text: `📊 ${toSansBold('𝗦𝘆𝘀𝘁𝗲𝗺 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀')}\n\n👥 ${toSansBold('𝗨𝘀𝗲𝗿 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n• Total Registered Users: ${totalUsers}\n• Active Users: ${totalUsers - bannedUsers}\n• Banned Users: ${bannedUsers}\n\n📝 ${toSansBold('𝗧𝗮𝘀𝗸 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n• Active Review Tasks: ${activeTaskCount}\n• Pending Proof Submissions: ${pendingSubCount}\n• Total Completed Reviews: ${approvedSubCount}\n\n💳 ${toSansBold('𝗙𝗶𝗻𝗮𝗻𝗰𝗶𝗮𝗹 𝗠𝗲𝘁𝗿𝗶𝗰𝘀')}:\n• Total Payouts Disbursed: $${totalPaid.toFixed(2)}`,
        });
        return;
      }

      if (text === STYLED_LABELS.ADD_WORK) {
        setUserSession((prev) => ({
          ...prev,
          [activeUserId]: { step: 'ADMIN_TASK_LINK', taskDraft: {} },
        }));

        addMessage(activeUserId, {
          sender: 'bot',
          text: `➕ ${toSansBold('𝗖𝗿𝗲𝗮𝘁𝗲 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')}\n\n📍 ${toSansBold('Step 1/2: Enter Review Link')}\n(e.g., Google Maps link, Trustpilot URL, Play Store link):`,
        });
        return;
      }

      if (session.step === 'ADMIN_TASK_LINK') {
        const link = text;
        setUserSession((prev) => ({
          ...prev,
          [activeUserId]: {
            step: 'ADMIN_TASK_MESSAGE',
            taskDraft: { targetLink: link },
          },
        }));

        addMessage(activeUserId, {
          sender: 'bot',
          text: `📍 ${toSansBold('Step 2/2: Enter Task Message / Instructions')}\n\n(Type the review details and instructions that users should follow):`,
        });
        return;
      }

      if (session.step === 'ADMIN_TASK_MESSAGE') {
        const instructions = text;
        const draft = {
          title: 'Review Task',
          targetLink: session.taskDraft?.targetLink || 'https://maps.google.com',
          instructions,
          rewardAmount: 10.0,
        };

        setUserSession((prev) => ({
          ...prev,
          [activeUserId]: { step: 'ADMIN_TASK_CONFIRM', taskDraft: draft },
        }));

        // Show Confirmation Preview with ✅ 𝗗𝗼𝗻𝗲 or ❌ 𝗖𝗮𝗻𝗰𝗲𝗹
        addMessage(activeUserId, {
          sender: 'bot',
          text: `📋 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗣𝗿𝗲𝘃𝗶𝗲𝘄')} 📋\n\n` +
            `🔗 ${toSansBold('𝗟𝗶𝗻𝗸')}:\n${draft.targetLink}\n\n` +
            `📝 ${toSansBold('𝗠𝗲𝘀𝘀𝗮𝗴𝗲 / 𝗜𝗻𝘀𝘁𝗿𝘂𝗰𝘁𝗶𝗼𝗻𝘀')}:\n${draft.instructions}\n\n` +
            `Do you want to publish this review work?`,
          inlineButtons: [
            [
              { text: '✅ 𝗗𝗼𝗻𝗲', callbackData: 'admin_confirm_task' },
              { text: '❌ 𝗖𝗮𝗻𝗰𝗲𝗹', callbackData: 'admin_cancel_task' },
            ],
          ],
        });
        return;
      }

      if (text === STYLED_LABELS.BROADCAST) {
        setUserSession((prev) => ({ ...prev, [activeUserId]: { step: 'BROADCAST_INPUT' } }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `📢 ${toSansBold('𝗦𝗲𝗻𝗱 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁 𝗠𝗲𝘀𝘀𝗮𝗴𝗲')}\n\nEnter the message text you want to broadcast to all registered users:`,
        });
        return;
      }

      if (session.step === 'BROADCAST_INPUT') {
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        broadcastMessage(`📢 ${toSansBold('𝗔𝗻𝗻𝗼𝘂𝗻𝗰𝗲𝗺𝗲𝗻𝘁')}\n\n${text}`);
        addMessage(activeUserId, {
          sender: 'bot',
          text: `✅ Broadcast sent to all ${users.length} active users!`,
        });
        return;
      }

      if (text === STYLED_LABELS.BAN_USER) {
        setUserSession((prev) => ({ ...prev, [activeUserId]: { step: 'BAN_INPUT' } }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `🚫 ${toSansBold('𝗕𝗮𝗻 𝗨𝘀𝗲𝗿')}\n\nEnter the Telegram ID or @username of the user to ban:`,
        });
        return;
      }

      if (session.step === 'BAN_INPUT') {
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        const target = text.replace('@', '');
        let targetUser = users.find(
          (u) => u.telegramId.toString() === target || u.username.toLowerCase() === target.toLowerCase()
        );

        if (!targetUser) {
          addMessage(activeUserId, { sender: 'bot', text: '⚠️ User not found.' });
          return;
        }

        onUpdateUsers((prev) =>
          prev.map((u) => (u.telegramId === targetUser!.telegramId ? { ...u, isBanned: true } : u))
        );

        addMessage(activeUserId, {
          sender: 'bot',
          text: `🚫 User ${targetUser.telegramId} (@${targetUser.username}) is now banned.`,
        });
        return;
      }

      if (text === STYLED_LABELS.UNBAN_USER) {
        setUserSession((prev) => ({ ...prev, [activeUserId]: { step: 'UNBAN_INPUT' } }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `✅ ${toSansBold('𝗨𝗻𝗯𝗮𝗻 𝗨𝘀𝗲𝗿')}\n\nEnter the Telegram ID or @username of the user to unban:`,
        });
        return;
      }

      if (session.step === 'UNBAN_INPUT') {
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        const target = text.replace('@', '');
        let targetUser = users.find(
          (u) => u.telegramId.toString() === target || u.username.toLowerCase() === target.toLowerCase()
        );

        if (!targetUser) {
          addMessage(activeUserId, { sender: 'bot', text: '⚠️ User not found.' });
          return;
        }

        onUpdateUsers((prev) =>
          prev.map((u) => (u.telegramId === targetUser!.telegramId ? { ...u, isBanned: false } : u))
        );

        addMessage(activeUserId, {
          sender: 'bot',
          text: `✅ User ${targetUser.telegramId} (@${targetUser.username}) is unbanned.`,
        });
        return;
      }

      if (text === STYLED_LABELS.USER_INFO) {
        setUserSession((prev) => ({ ...prev, [activeUserId]: { step: 'USER_INFO_INPUT' } }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `🔍 ${toSansBold('𝗨𝘀𝗲𝗿 𝗟𝗼𝗼𝗸𝘂𝗽')}\n\nEnter the Telegram ID or @username:`,
        });
        return;
      }

      if (session.step === 'USER_INFO_INPUT') {
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        const target = text.replace('@', '');
        let u = users.find(
          (user) => user.telegramId.toString() === target || user.username.toLowerCase() === target.toLowerCase()
        );

        if (!u) {
          addMessage(activeUserId, { sender: 'bot', text: '⚠️ User not found.' });
          return;
        }

        addMessage(activeUserId, {
          sender: 'bot',
          text: `🔍 ${toSansBold('𝗨𝘀𝗲𝗿 𝗗𝗲𝘁𝗮𝗶𝗹𝘀')}\n\nID: \`${u.telegramId}\`\nUsername: @${u.username || 'None'}\nName: ${u.firstName} ${u.lastName}\nBalance: $${u.balance.toFixed(2)}\nTotal Earned: $${u.totalEarned.toFixed(2)}\nWithdrawn: $${u.totalWithdrawn.toFixed(2)}\nReferrals: ${u.referralCount}\nStatus: ${u.isBanned ? '🚫 BANNED' : '✅ Active'}`,
        });
        return;
      }

      if (text === STYLED_LABELS.DELETE_WORK) {
        const activeTasks = tasks.filter((t) => t.status === 'active');
        if (activeTasks.length === 0) {
          addMessage(activeUserId, { sender: 'bot', text: 'ℹ️ No active review tasks found to delete.' });
          return;
        }

        const buttons = activeTasks.map((t) => [
          { text: `🗑️ ${t.title.slice(0, 25)}`, callbackData: `del_task_${t._id}` },
        ]);

        addMessage(activeUserId, {
          sender: 'bot',
          text: `🗑️ ${toSansBold('𝗦𝗲𝗹𝗲𝗰𝘁 𝗮 𝗧𝗮𝘀𝗸 𝘁𝗼 𝗗𝗲𝗹𝗲𝘁𝗲')}:`,
          inlineButtons: buttons,
        });
        return;
      }

      if (text === STYLED_LABELS.SET_REFERRAL) {
        setUserSession((prev) => ({ ...prev, [activeUserId]: { step: 'SET_REF_INPUT' } }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `⚙️ ${toSansBold('𝗦𝗲𝘁 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗣𝗲𝗿𝗰𝗲𝗻𝘁𝗮𝗴𝗲')}\n\nCurrent Commission: ${settings.referralPercent}%\nEnter new percentage value (0 - 100):`,
        });
        return;
      }

      if (session.step === 'SET_REF_INPUT') {
        const val = parseFloat(text);
        if (isNaN(val) || val < 0 || val > 100) {
          addMessage(activeUserId, { sender: 'bot', text: '⚠️ Invalid percentage.' });
          return;
        }
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        onUpdateSettings((prev) => ({ ...prev, referralPercent: val }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `✅ Referral commission updated to ${val}%`,
        });
        return;
      }

      if (text === STYLED_LABELS.SET_MIN_WITHDRAWAL) {
        setUserSession((prev) => ({ ...prev, [activeUserId]: { step: 'SET_MIN_WD_INPUT' } }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `⚙️ ${toSansBold('𝗦𝗲𝘁 𝗠𝗶𝗻𝗶𝗺𝘂𝗺 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹')}\n\nCurrent Minimum: $${settings.minWithdrawal.toFixed(2)}\nEnter new minimum withdrawal amount:`,
        });
        return;
      }

      if (session.step === 'SET_MIN_WD_INPUT') {
        const val = parseFloat(text);
        if (isNaN(val) || val <= 0) {
          addMessage(activeUserId, { sender: 'bot', text: '⚠️ Invalid amount.' });
          return;
        }
        setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
        onUpdateSettings((prev) => ({ ...prev, minWithdrawal: val }));
        addMessage(activeUserId, {
          sender: 'bot',
          text: `✅ Minimum withdrawal threshold updated to $${val.toFixed(2)}`,
        });
        return;
      }
    }

    // Default Fallback
    addMessage(activeUserId, {
      sender: 'bot',
      text: `🤖 Command not recognized. Please use the menu buttons below or type /start.`,
    });
  };

  const handleWithdrawalStart = () => {
    if (currentUser.balance < settings.minWithdrawal) {
      addMessage(activeUserId, {
        sender: 'bot',
        text: `⚠️ ${toSansBold('𝗜𝗻𝘀𝘂𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝘁 𝗕𝗮𝗹𝗮𝗻𝗰𝗲')}\n\nYour Current Balance: ${toSansBold(`$${currentUser.balance.toFixed(2)}`)}\nMinimum Withdrawal: ${toSansBold(`$${settings.minWithdrawal.toFixed(2)}`)}\n\nComplete more ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} to reach the payout threshold! 🚀`,
      });
      return;
    }

    const pending = withdrawals.find((w) => w.telegramId === currentUser.telegramId && w.status === 'pending');
    if (pending) {
      addMessage(activeUserId, {
        sender: 'bot',
        text: `⏳ ${toSansBold('𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗶𝗻 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀')}\n\nYou already have an active withdrawal request of ${toSansBold(
          `$${pending.amount.toFixed(2)}`
        )} awaiting Admin review.\nPlease wait until it is processed.`,
      });
      return;
    }

    setUserSession((prev) => ({
      ...prev,
      [activeUserId]: { step: 'WITHDRAW_AMOUNT' },
    }));

    addMessage(activeUserId, {
      sender: 'bot',
      text: `💳 ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁')}\n\nAvailable Balance: ${toSansBold(`$${currentUser.balance.toFixed(2)}`)}\nMinimum Withdrawal: ${toSansBold(`$${settings.minWithdrawal.toFixed(2)}`)}\n\nPlease enter the **amount** you want to withdraw (e.g. \`10.00\`):`,
    });
  };

  // Inline Button Click Handler
  const handleInlineCallback = (callbackData: string) => {
    // 1. Task Dismiss (Cancel)
    if (callbackData.startsWith('task_cancel_')) {
      addMessage(activeUserId, {
        sender: 'bot',
        text: `❌ ${toSansBold('𝗧𝗮𝘀𝗸 𝗗𝗶𝘀𝗺𝗶𝘀𝘀𝗲𝗱')}\n\nYou dismissed this task. You can view and complete it anytime from the menu.`,
      });
      return;
    }

    // 2. Task Submit Proof
    if (callbackData.startsWith('task_submit_')) {
      const taskId = callbackData.replace('task_submit_', '');
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      setUserSession((prev) => ({
        ...prev,
        [activeUserId]: { step: 'AWAITING_PROOF', targetTaskId: taskId },
      }));

      addMessage(activeUserId, {
        sender: 'bot',
        text: `📤 ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘁 𝗬𝗼𝘂𝗿 𝗣𝗿𝗼𝗼𝗳')}\n\nTask: ${toSansBold(task.title)}\n\nPlease type your review text proof below, or click the **Attach Proof Screenshot** button above the input bar:`,
      });
      return;
    }

    // 3. Admin Confirm Add Task
    if (callbackData === 'admin_confirm_task') {
      const draft = currentSession.taskDraft;
      if (!draft) return;

      const newTaskId = `task_${Date.now()}`;
      const newTask: ITask = {
        _id: newTaskId,
        title: draft.title || 'Review Task',
        targetLink: draft.targetLink || 'https://google.com',
        instructions: draft.instructions || 'Leave 5-star review',
        rewardAmount: draft.rewardAmount || 0.5,
        maxCompletions: 100,
        completedCount: 0,
        status: 'active',
        createdBy: 9990001,
        createdAt: new Date().toISOString(),
      };

      onUpdateTasks((prev) => [newTask, ...prev]);
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));

      addMessage(activeUserId, {
        sender: 'bot',
        text: `✅ ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗣𝘂𝗯𝗹𝗶𝘀𝗵𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!')}\nTask ID: \`${newTaskId}\``,
      });

      // 🔥 BROADCAST ON ADD TO ALL USERS:
      // "🔥 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲! 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 𝗶𝘁 𝗳𝗮𝘀𝘁 𝗯𝗲𝗳𝗼𝗿𝗲 𝗼𝘁𝗵𝗲𝗿𝘀 𝗴𝗿𝗮𝗯 𝗶𝘁! 🏃‍♂️"
      const broadcastAlert =
        `🔥 ${toSansBold('𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲!')}\n` +
        `${toSansBold('𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 𝗶𝘁 𝗳𝗮𝘀𝘁 𝗯𝗲𝗳𝗼𝗿𝗲 𝗼𝘁𝗵𝗲𝗿𝘀 𝗴𝗿𝗮𝗯 𝗶𝘁! 🏃‍♂️')}\n\n` +
        `📌 ${toSansBold(newTask.title)}\n` +
        `💰 ${toSansBold('𝗥𝗲𝘄𝗮𝗿𝗱')}: $${newTask.rewardAmount.toFixed(2)}\n\n` +
        `Tap ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')} in your menu to view and claim!`;

      broadcastMessage(broadcastAlert);
      return;
    }

    if (callbackData === 'admin_cancel_task') {
      setUserSession((prev) => ({ ...prev, [activeUserId]: {} }));
      addMessage(activeUserId, {
        sender: 'bot',
        text: `❌ ${toSansBold('𝗧𝗮𝘀𝗸 𝗖𝗿𝗲𝗮𝘁𝗶𝗼𝗻 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱')}`,
      });
      return;
    }

    // 4. Delete task
    if (callbackData.startsWith('del_task_')) {
      const taskId = callbackData.replace('del_task_', '');
      onUpdateTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: 'deleted' } : t))
      );
      addMessage(activeUserId, {
        sender: 'bot',
        text: `🗑️ ${toSansBold('𝗧𝗮𝘀𝗸 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆')}`,
      });
      return;
    }

    // 5. Proof Approval / Rejection (Admin)
    if (callbackData.startsWith('proof_app_')) {
      const subId = callbackData.replace('proof_app_', '');
      const sub = submissions.find((s) => s._id === subId);
      if (!sub || sub.status !== 'pending') return;

      onUpdateSubmissions((prev) =>
        prev.map((s) => (s._id === subId ? { ...s, status: 'approved' } : s))
      );

      // Increment task completed count
      onUpdateTasks((prev) =>
        prev.map((t) => (t._id === sub.taskId ? { ...t, completedCount: t.completedCount + 1 } : t))
      );

      // Credit worker balance
      const worker = users.find((u) => u.telegramId === sub.telegramId);
      if (worker) {
        onUpdateUsers((prev) =>
          prev.map((u) =>
            u.telegramId === sub.telegramId
              ? {
                  ...u,
                  balance: u.balance + sub.rewardAmount,
                  totalEarned: u.totalEarned + sub.rewardAmount,
                }
              : u
          )
        );

        // Notify Worker
        addMessage(sub.telegramId, {
          sender: 'bot',
          text: `🎉 ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱!')}\n\nYour submission for "${sub.taskTitle}" has been verified.\n💰 ${toSansBold(`+$${sub.rewardAmount.toFixed(2)}`)} added to your balance!`,
        });

        // Referral Commission distribution
        if (worker.referredBy) {
          const referrerBonus = (sub.rewardAmount * settings.referralPercent) / 100;
          if (referrerBonus > 0) {
            onUpdateUsers((prev) =>
              prev.map((u) =>
                u.telegramId === worker.referredBy
                  ? {
                      ...u,
                      balance: u.balance + referrerBonus,
                      totalEarned: u.totalEarned + referrerBonus,
                      referralEarnings: u.referralEarnings + referrerBonus,
                    }
                  : u
              )
            );

            // Notify Referrer
            addMessage(worker.referredBy, {
              sender: 'bot',
              text: `🎁 ${toSansBold('𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 𝗕𝗼𝗻𝘂𝘀 𝗘𝗮𝗿𝗻𝗲𝗱!')}\n\nYou earned ${toSansBold(`+$${referrerBonus.toFixed(2)}`)} from your referral @${worker.username}'s completed review!`,
            });
          }
        }
      }

      addMessage(activeUserId, {
        sender: 'bot',
        text: `✅ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} ($${sub.rewardAmount.toFixed(2)} credited)`,
      });
      return;
    }

    if (callbackData.startsWith('proof_rej_')) {
      const subId = callbackData.replace('proof_rej_', '');
      const sub = submissions.find((s) => s._id === subId);
      if (!sub || sub.status !== 'pending') return;

      onUpdateSubmissions((prev) =>
        prev.map((s) => (s._id === subId ? { ...s, status: 'rejected' } : s))
      );

      // Notify Worker
      addMessage(sub.telegramId, {
        sender: 'bot',
        text: `⚠️ ${toSansBold('𝗥𝗲𝘃𝗶𝗲𝘄 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')}\n\nYour proof for "${sub.taskTitle}" was not approved.\nPlease make sure you follow all instructions and resubmit valid proof via ${toSansBold('📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸')}.`,
      });

      addMessage(activeUserId, {
        sender: 'bot',
        text: `❌ ${toSansBold('𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')}`,
      });
      return;
    }

    // 6. Withdrawal Approval / Rejection (Admin)
    if (callbackData.startsWith('with_app_')) {
      const wdId = callbackData.replace('with_app_', '');
      const wd = withdrawals.find((w) => w._id === wdId);
      if (!wd || wd.status !== 'pending') return;

      onUpdateWithdrawals((prev) =>
        prev.map((w) => (w._id === wdId ? { ...w, status: 'approved' } : w))
      );

      onUpdateUsers((prev) =>
        prev.map((u) =>
          u.telegramId === wd.telegramId ? { ...u, totalWithdrawn: u.totalWithdrawn + wd.amount } : u
        )
      );

      // Notify user
      addMessage(wd.telegramId, {
        sender: 'bot',
        text: `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱 & 𝗦𝗲𝗻𝘁!')}\n\nYour payout of ${toSansBold(`$${wd.amount.toFixed(2)}`)} to \`${wd.walletAddress}\` has been processed successfully! 🚀`,
      });

      addMessage(activeUserId, {
        sender: 'bot',
        text: `✅ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱')} ($${wd.amount.toFixed(2)})`,
      });
      return;
    }

    if (callbackData.startsWith('with_rej_')) {
      const wdId = callbackData.replace('with_rej_', '');
      const wd = withdrawals.find((w) => w._id === wdId);
      if (!wd || wd.status !== 'pending') return;

      onUpdateWithdrawals((prev) =>
        prev.map((w) => (w._id === wdId ? { ...w, status: 'rejected' } : w))
      );

      // Refund held balance back to user
      onUpdateUsers((prev) =>
        prev.map((u) =>
          u.telegramId === wd.telegramId ? { ...u, balance: u.balance + wd.amount } : u
        )
      );

      // Notify user of refund
      addMessage(wd.telegramId, {
        sender: 'bot',
        text: `❌ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱')}\n\nYour withdrawal of $${wd.amount.toFixed(2)} was rejected.\nThe amount has been fully refunded to your balance. Please verify your payout address.`,
      });

      addMessage(activeUserId, {
        sender: 'bot',
        text: `❌ ${toSansBold('𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱 & 𝗥𝗲𝗳𝘂𝗻𝗱𝗲𝗱')}`,
      });
      return;
    }

    if (callbackData === 'btn_req_withdraw') {
      handleWithdrawalStart();
      return;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Persona Switcher Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Simulate As Telegram Account:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {users.map((u) => {
            const isUserAdmin = u.telegramId === 9990001;
            const isSelected = u.telegramId === activeUserId;
            return (
              <button
                key={u.telegramId}
                onClick={() => {
                  setActiveUserId(u.telegramId);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? isUserAdmin
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {isUserAdmin ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <User className="w-3.5 h-3.5 text-sky-400" />}
                <span>
                  {u.firstName} (@{u.username || 'User'})
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-semibold tabular-nums ml-1">
                  ${u.balance.toFixed(2)}
                </span>
                {u.isBanned && <span className="text-red-400 text-[10px] ml-1">[BANNED]</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Telegram App Window */}
      <div className="bg-[#17212b] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[740px]">
        {/* Telegram Header */}
        <div className="bg-[#242f3d] px-5 py-3.5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                RW
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#242f3d]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-sm tracking-tight">
                  Review &amp; Earn Official Bot
                </span>
                <span className="text-sky-400 text-xs" title="Verified Bot">✓</span>
              </div>
              <div className="text-[11px] text-sky-400/90 font-mono">
                @{settings.botUsername} · bot
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendMessage('/start')}
              className="px-2.5 py-1 rounded bg-[#17212b] hover:bg-[#2b3a4a] text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
              title="Restart /start command"
            >
              /start
            </button>

            {isAdmin && (
              <button
                onClick={() => handleSendMessage('/admin')}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono border border-amber-500/40 transition-colors"
                title="Open Admin Panel"
              >
                /admin
              </button>
            )}

            <button
              onClick={() => {
                setMessagesByUser((prev) => ({ ...prev, [activeUserId]: [] }));
                handleSendMessage('/start');
              }}
              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              title="Clear chat and restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1621] relative">
          {/* Subtle Telegram patterned watermark indicator */}
          <div className="text-center my-1">
            <span className="px-3 py-1 rounded-full text-[11px] text-slate-400 bg-[#182533]/80 border border-slate-800">
              Encrypted Telegram Cloud Chat · Production Telegraf v4
            </span>
          </div>

          {activeMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] ${
                  isUser ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-md select-text ${
                    isUser
                      ? 'bg-[#2b5278] text-white rounded-br-xs'
                      : 'bg-[#182533] text-slate-100 rounded-bl-xs border border-slate-800/60'
                  }`}
                >
                  {/* Message content */}
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] text-right mt-1.5 font-mono ${
                      isUser ? 'text-sky-200/70' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp} {isUser && '✓✓'}
                  </div>
                </div>

                {/* Inline Buttons attached to message */}
                {msg.inlineButtons && msg.inlineButtons.length > 0 && (
                  <div className="w-full mt-1.5 space-y-1">
                    {msg.inlineButtons.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-2 gap-1.5">
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => btn.callbackData && handleInlineCallback(btn.callbackData)}
                            className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2e3d4f] active:bg-[#384a60] text-sky-300 text-xs font-semibold text-center transition-colors border border-slate-700/60 shadow-sm"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Sample Attach Proof Toolbar (Visible when submitting proof) */}
        {currentSession.step === 'AWAITING_PROOF' && (
          <div className="bg-[#242f3d] px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-amber-300 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Awaiting Proof for Review Task
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleSendMessage('[Screenshot Attached] Left 5-star review: "Excellent service and lovely food!"')
                }
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-[11px] transition-colors"
              >
                + Quick Sample Screenshot Proof
              </button>
            </div>
          </div>
        )}

        {/* Persistent Keyboard (Docked at bottom of Telegram chat) */}
        <div className="bg-[#17212b] p-3 border-t border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            {inAdminMenu ? (
              // Admin Panel Persistent Keyboard (11 stylish buttons + Main Menu)
              <>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.BROADCAST)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.BROADCAST}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.ADD_WORK)}
                  className="py-2 px-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-medium text-center border border-emerald-800/60 transition-colors truncate"
                >
                  {STYLED_LABELS.ADD_WORK}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.DELETE_WORK)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.DELETE_WORK}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.STATISTICS)}
                  className="py-2 px-2.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 text-xs font-medium text-center border border-sky-800/60 transition-colors truncate"
                >
                  {STYLED_LABELS.STATISTICS}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.BAN_USER)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.BAN_USER}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.UNBAN_USER)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.UNBAN_USER}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.USER_INFO)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.USER_INFO}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.ADD_BALANCE)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.ADD_BALANCE}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.SET_REFERRAL)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.SET_REFERRAL}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.SET_MIN_WITHDRAWAL)}
                  className="py-2 px-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-slate-100 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.SET_MIN_WITHDRAWAL}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.BACK_MENU)}
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium text-center border border-slate-700 transition-colors truncate col-span-2 sm:col-span-2"
                >
                  {STYLED_LABELS.BACK_MENU}
                </button>
              </>
            ) : (
              // Standard User Persistent Keyboard (Vibrant Styled buttons + Admin Panel button for Admin)
              <>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.REVIEW_WORK)}
                  className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-emerald-300 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.REVIEW_WORK}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.BALANCE)}
                  className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-amber-300 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.BALANCE}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.PROFILE)}
                  className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-purple-300 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.PROFILE}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.REFER)}
                  className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-sky-300 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.REFER}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.WITHDRAW)}
                  className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-rose-300 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.WITHDRAW}
                </button>
                <button
                  onClick={() => handleSendMessage(STYLED_LABELS.SUPPORT)}
                  className="py-2 px-3 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-teal-300 text-xs font-medium text-center border border-slate-700/60 transition-colors truncate"
                >
                  {STYLED_LABELS.SUPPORT}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleSendMessage(STYLED_LABELS.ADMIN_PANEL)}
                    className="py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold text-center border border-amber-500/50 transition-colors col-span-2 sm:col-span-3 truncate shadow-sm"
                  >
                    {STYLED_LABELS.ADMIN_PANEL}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Telegram Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => handleSendMessage('❌ 𝗖𝗮𝗻𝗰𝗲𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻')}
              className="p-2.5 rounded-lg bg-[#242f3d] hover:bg-[#2f3d4f] text-rose-400 text-xs font-medium transition-colors"
              title="Cancel current wizard or operation"
            >
              Cancel
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Write a message or command..."
              className="flex-1 px-4 py-2.5 bg-[#242f3d] border border-slate-700/80 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />

            <button
              type="submit"
              className="p-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
