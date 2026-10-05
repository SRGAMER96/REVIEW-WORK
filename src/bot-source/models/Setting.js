const mongoose = require('mongoose');

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
      default: 5.0, // Default $5.00
      min: 0.1,
    },
    referralPercent: {
      type: Number,
      default: 10, // Default 10% commission
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
