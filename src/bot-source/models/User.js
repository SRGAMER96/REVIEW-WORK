const mongoose = require('mongoose');

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
      type: Number, // telegramId of the referrer
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
    // List of task IDs the user has cancelled, locking them out from that specific task
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
