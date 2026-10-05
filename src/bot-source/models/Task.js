const mongoose = require('mongoose');

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
      default: 100, // Limit how many submissions before auto-completing
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
      type: Number, // Admin telegramId
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Task', taskSchema);
