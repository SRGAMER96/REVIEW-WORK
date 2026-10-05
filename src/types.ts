export interface IUser {
  _id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  isBanned: boolean;
  banReason?: string;
  referredBy: number | null;
  referralCount: number;
  referralEarnings: number;
  cancelledTasks: string[]; // task IDs
  createdAt: string;
}

export interface ITask {
  _id: string;
  title: string;
  targetLink: string;
  instructions: string;
  rewardAmount: number;
  maxCompletions: number;
  completedCount: number;
  status: 'active' | 'paused' | 'completed' | 'deleted';
  createdBy: number;
  createdAt: string;
}

export interface ISubmission {
  _id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  telegramId: number;
  username: string;
  userFullName: string;
  proofType: 'photo' | 'text';
  proofContent: string;
  proofCaption?: string;
  status: 'pending' | 'approved' | 'rejected';
  rewardAmount: number;
  rejectionReason?: string;
  createdAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
}

export interface IWithdrawal {
  _id: string;
  userId: string;
  telegramId: number;
  username: string;
  amount: number;
  paymentMethod: string;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
}

export interface IGlobalSettings {
  minWithdrawal: number;
  referralPercent: number;
  supportUsername: string;
  currencySymbol: string;
  botUsername: string;
}

export interface IBotMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  userId: number; // For multi-chat simulation
  text: string;
  timestamp: string;
  photoUrl?: string;
  inlineButtons?: Array<
    Array<{
      text: string;
      callbackData?: string;
      url?: string;
    }>
  >;
}
