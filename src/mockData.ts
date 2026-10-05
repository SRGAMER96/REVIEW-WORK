import { IUser, ITask, ISubmission, IWithdrawal, IGlobalSettings } from './types';

export const INITIAL_SETTINGS: IGlobalSettings = {
  minWithdrawal: 50.0,
  referralPercent: 10,
  supportUsername: 'SRGAMER96',
  currencySymbol: '₹',
  botUsername: 'REVIEW_WORK_OP_BOT',
};

export const INITIAL_USERS: IUser[] = [
  {
    _id: 'usr_admin',
    telegramId: 8962632792,
    username: 'SRGAMER96',
    firstName: 'ᏕᏒ_ᎶᏗᎷᏋᏒ96',
    lastName: '',
    balance: 500.0,
    totalEarned: 500.0,
    totalWithdrawn: 0.0,
    isBanned: false,
    referredBy: null,
    referralCount: 5,
    referralEarnings: 45.0,
    cancelledTasks: [],
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    _id: 'usr_alice',
    telegramId: 1000101,
    username: 'AliceWorker',
    firstName: 'Alice',
    lastName: 'Vance',
    balance: 65.0,
    totalEarned: 145.0,
    totalWithdrawn: 80.0,
    isBanned: false,
    referredBy: null,
    referralCount: 1, // Bob was referred by Alice!
    referralEarnings: 15.0,
    cancelledTasks: [],
    createdAt: '2026-09-15T12:30:00Z',
  },
  {
    _id: 'usr_bob',
    telegramId: 1000202,
    username: 'BobCrypto',
    firstName: 'Bob',
    lastName: 'Miller',
    balance: 35.0,
    totalEarned: 35.0,
    totalWithdrawn: 0.0,
    isBanned: false,
    referredBy: 1000101, // Referred by Alice
    referralCount: 0,
    referralEarnings: 0.0,
    cancelledTasks: [],
    createdAt: '2026-10-01T09:15:00Z',
  },
];

export const INITIAL_TASKS: ITask[] = [
  {
    _id: 'task_gmaps_01',
    title: 'Google Maps: Bella Vista Bistro 5-Star Review',
    targetLink: 'https://maps.google.com/?cid=984729104',
    instructions:
      'Visit the Google Maps listing, rate 5 stars ⭐, and post a genuine review mentioning the delicious seafood pasta and great ambience. Submit a clear screenshot of your posted review.',
    rewardAmount: 25.0,
    maxCompletions: 50,
    completedCount: 14,
    status: 'active',
    createdBy: 8962632792,
    createdAt: '2026-10-02T14:20:00Z',
  },
  {
    _id: 'task_trustpilot_02',
    title: 'Trustpilot: SwiftPay Wallet 5-Star Rating',
    targetLink: 'https://www.trustpilot.com/review/swiftpay.io',
    instructions:
      'Write a 5-star review on Trustpilot highlighting instant UPI withdrawals, clean UI, and friendly customer support. Must be at least 2 sentences long.',
    rewardAmount: 40.0,
    maxCompletions: 30,
    completedCount: 8,
    status: 'active',
    createdBy: 8962632792,
    createdAt: '2026-10-03T08:45:00Z',
  },
  {
    _id: 'task_playstore_03',
    title: 'Play Store: CryptoFlow App Download & 5-Star Review',
    targetLink: 'https://play.google.com/store/apps/details?id=com.cryptoflow.app',
    instructions:
      'Download and install the app from Google Play, leave a detailed 5-star rating praising the speedy performance, and attach a screenshot showing your published review.',
    rewardAmount: 50.0,
    maxCompletions: 100,
    completedCount: 22,
    status: 'active',
    createdBy: 8962632792,
    createdAt: '2026-10-04T11:10:00Z',
  },
];

export const INITIAL_SUBMISSIONS: ISubmission[] = [
  {
    _id: 'sub_sample_01',
    taskId: 'task_trustpilot_02',
    taskTitle: 'Trustpilot: SwiftPay Wallet 5-Star Rating',
    userId: 'usr_bob',
    telegramId: 1000202,
    username: 'BobCrypto',
    userFullName: 'Bob Miller',
    proofType: 'text',
    proofContent:
      'SwiftPay is the best micro-wallet I have used this year. The UPI withdrawals take less than 2 minutes and support helped me promptly.',
    status: 'pending',
    rewardAmount: 40.0,
    createdAt: '2026-10-04T18:25:00Z',
  },
  {
    _id: 'sub_sample_02',
    taskId: 'task_gmaps_01',
    taskTitle: 'Google Maps: Bella Vista Bistro Review',
    userId: 'usr_alice',
    telegramId: 1000101,
    username: 'AliceWorker',
    userFullName: 'Alice Vance',
    proofType: 'photo',
    proofContent: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500',
    proofCaption: 'Posted 5-star review under name Alice V.',
    status: 'approved',
    rewardAmount: 25.0,
    reviewedBy: 8962632792,
    reviewedAt: '2026-10-03T16:00:00Z',
    createdAt: '2026-10-03T15:30:00Z',
  },
];

export const INITIAL_WITHDRAWALS: IWithdrawal[] = [
  {
    _id: 'wd_sample_01',
    userId: 'usr_alice',
    telegramId: 1000101,
    username: 'AliceWorker',
    amount: 80.0,
    paymentMethod: 'UPI / GPay',
    walletAddress: 'alice@oksbi',
    status: 'pending',
    createdAt: '2026-10-04T19:00:00Z',
  },
];
