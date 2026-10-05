/**
 * Unicode Sans-Serif Bold & Italic Text Formatter
 * Produces clean, stylish Mathematical Sans-Serif Bold/Italic characters
 * for modern, beautiful, and readable Telegram Bot UI.
 */

// Mathematical Sans-Serif Bold
// Capital 'A' -> U+1D5D4, 'Z' -> U+1D5ED
// Small 'a' -> U+1D5EE, 'z' -> U+1D607
// Digit '0' -> U+1D7EC, '9' -> U+1D7F5
export function toSansBold(text: string): string {
  if (!text) return '';
  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d5d4 + (code - 65));
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d5ee + (code - 97));
      }
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1d7ec + (code - 48));
      }
      return char;
    })
    .join('');
}

// Mathematical Sans-Serif Italic
export function toSansItalic(text: string): string {
  if (!text) return '';
  return text
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

// Mathematical Sans-Serif Bold Italic
export function toSansBoldItalic(text: string): string {
  if (!text) return '';
  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d63c + (code - 65));
      }
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d656 + (code - 97));
      }
      return char;
    })
    .join('');
}

// Convert Mathematical Sans-Serif Bold/Italic & styled Unicode characters back to plain ASCII for 100% reliable matching
export function normalizeText(text: string): string {
  if (!text) return '';
  let res = '';
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    // Sans bold uppercase (A-Z)
    if (code >= 0x1d5d4 && code <= 0x1d5ed) {
      res += String.fromCharCode(65 + (code - 0x1d5d4));
    }
    // Sans bold lowercase (a-z)
    else if (code >= 0x1d5ee && code <= 0x1d607) {
      res += String.fromCharCode(97 + (code - 0x1d5ee));
    }
    // Sans bold digits (0-9)
    else if (code >= 0x1d7ec && code <= 0x1d7f5) {
      res += String.fromCharCode(48 + (code - 0x1d7ec));
    }
    // Sans italic uppercase
    else if (code >= 0x1d608 && code <= 0x1d621) {
      res += String.fromCharCode(65 + (code - 0x1d608));
    }
    // Sans italic lowercase
    else if (code >= 0x1d622 && code <= 0x1d63b) {
      res += String.fromCharCode(97 + (code - 0x1d622));
    }
    // Other characters
    else {
      res += char;
    }
  }
  return res.toLowerCase().trim();
}

/**
 * Vibrant & Highly Styled Unicode Labels with Emojis for Telegram Keyboards
 */
export const STYLED_LABELS = {
  // User Persistent Menu (Vibrant Color Emojis + Mathematical Bold)
  REVIEW_WORK: '🟢 📝 𝗥𝗘𝗩𝗜𝗘𝗪 𝗪𝗢𝗥𝗞 🟢',
  BALANCE: '💎 💰 𝗠𝗬 𝗕𝗔𝗟𝗔𝗡𝗖𝗘 💎',
  PROFILE: '🔮 👤 𝗠𝗬 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 🔮',
  REFER: '🚀 👥 𝗜𝗡𝗩𝗜𝗧𝗘 & 𝗘𝗔𝗥𝗡 🚀',
  WITHDRAW: '💸 💳 𝗪𝗜𝗧𝗛𝗗𝗥𝗔𝗪 ₹ 💸',
  SUPPORT: '🛟 🛠️ 𝟮𝟰/𝟳 𝗦𝗨𝗣𝗣𝗢𝗥𝗧 🛟',

  // Admin Master Button (in main menu for admin)
  ADMIN_PANEL: '👑 ⚡ 𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗡𝗧𝗥𝗢𝗟 𝗣𝗔𝗡𝗘𝗟 ⚡ 👑',

  // Admin Panel Dedicated Menu
  BROADCAST: '📢 ⚡ 𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 📢',
  ADD_WORK: '➕ 📝 𝗔𝗗𝗗 𝗪𝗢𝗥𝗞 ➕',
  DELETE_WORK: '🗑️ ❌ 𝗗𝗘𝗟𝗘𝗧𝗘 𝗪𝗢𝗥𝗞 🗑️',
  STATISTICS: '📊 📈 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦 📊',
  BAN_USER: '🚫 🔒 𝗕𝗔𝗡 𝗨𝗦𝗘𝗥 🚫',
  UNBAN_USER: '✅ 🔓 𝗨𝗡𝗕𝗔𝗡 𝗨𝗦𝗘𝗥 ✅',
  USER_INFO: '🔍 👤 𝗨𝗦𝗘𝗥 𝗜𝗡𝗙𝗢 🔍',
  ADD_BALANCE: '💰 ➕ 𝗔𝗗𝗗 𝗕𝗔𝗟𝗔𝗡𝗖𝗘 💰',
  REMOVE_BALANCE: '➖ 💸 𝗥𝗘𝗠𝗢𝗩𝗘 𝗕𝗔𝗟 ➖',
  SET_REFERRAL: '⚙️ 🎁 𝗦𝗘𝗧 𝗥𝗘𝗙 % ⚙️',
  SET_MIN_WITHDRAWAL: '⚙️ 💳 𝗦𝗘𝗧 𝗠𝗜𝗡 𝗪𝗗 ⚙️',
  BACK_MENU: '🔙 🏠 𝗠𝗔𝗜𝗡 𝗠𝗘𝗡𝗨 🔙',

  // Action Buttons
  CONFIRM_DONE: '✅ 𝗗𝗼𝗻𝗲 & 𝗣𝘂𝗯𝗹𝗶𝘀𝗵',
  CANCEL: '❌ 𝗗𝗶𝘀𝗺𝗶𝘀𝘀',
  SUBMIT_PROOF: '📤 𝗦𝘂𝗯𝗺𝗶𝘁 𝗣𝗿𝗼𝗼𝗳 🚀',
  APPROVE: '✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲 & 𝗣𝗮𝘆 ₹',
  REJECT: '❌ 𝗥𝗲𝗷𝗲𝗰𝘁 𝗣𝗿𝗼𝗼𝗳',
};
