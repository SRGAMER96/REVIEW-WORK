const mongoose = require('mongoose');

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
      type: String, // Telegram file_id if photo, or raw text proof
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
      type: Number, // Admin telegramId
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

// Composite index to easily query user submissions for a specific task
submissionSchema.index({ task: 1, telegramId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
