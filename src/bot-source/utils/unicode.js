/**
 * Mathematical Sans-Serif Bold & Italic Unicode Formatter
 * Produces clean, elegant Unicode text for modern Telegram Bot UI
 */

function toSansBold(text) {
  if (!text) return '';
  return String(text)
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Uppercase A-Z -> 0x1D5D4
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d5d4 + (code - 65));
      }
      // Lowercase a-z -> 0x1D5EE
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d5ee + (code - 97));
      }
      // Digits 0-9 -> 0x1D7EC
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1d7ec + (code - 48));
      }
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
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d608 + (code - 65));
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d622 + (code - 97));
      }
      return char;
    })
    .join('');
}

const STYLED = {
  // Main User Keyboards
  REVIEW_WORK: '📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸',
  BALANCE: '💰 𝗕𝗮𝗹𝗮𝗻𝗰𝗲',
  PROFILE: '👤 𝗣𝗿𝗼𝗳𝗶𝗹𝗲',
  REFER: '👥 𝗥𝗲𝗳𝗲𝗿',
  WITHDRAW: '💳 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄',
  SUPPORT: '🛠️ 𝗦𝘂𝗽𝗽𝗼𝗿𝘁',

  // Admin Panel Keyboards
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

  // Inline Action Buttons
  DONE: '✅ 𝗗𝗼𝗻𝗲',
  CANCEL: '❌ 𝗖𝗮𝗻𝗰𝗲𝗹',
  SUBMIT_PROOF: '📤 𝗦𝘂𝗯𝗺𝗶𝘁 𝗣𝗿𝗼𝗼𝗳',
  APPROVE: '✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲',
  REJECT: '❌ 𝗥𝗲𝗷𝗲𝗰𝘁',
  BACK_MENU: '🔙 𝗠𝗮𝗶𝗻 𝗠𝗲𝗻𝘂',
};

module.exports = {
  toSansBold,
  toSansItalic,
  STYLED,
};
