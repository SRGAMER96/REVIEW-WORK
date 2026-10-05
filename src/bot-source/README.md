# 🤖 Telegram Review Work & Rewards Bot (Telegraf + MongoDB)

A high-performance, production-ready Telegram Bot built with **Node.js (Telegraf v4)** and **MongoDB (Mongoose)**, featuring clean **Mathematical Sans-Serif Bold Unicode Typography** for stunning visual aesthetics on any Telegram client.

---

## 🌟 Key Features

1. **Persistent User Main Menu**:
   - `📝 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸`: Browse available review campaigns, target links, and instructions.
   - `💰 𝗕𝗮𝗹𝗮𝗻𝗰𝗲`: View real-time balance, lifetime earnings, total withdrawals, and referral bonuses.
   - `👤 𝗣𝗿𝗼𝗳𝗶𝗹𝗲`: User details, Telegram ID, completed review counts, and membership date.
   - `👥 𝗥𝗲𝗳𝗲𝗿`: Deep-linked invite links with automatic multi-tier commission credits.
   - `💳 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄`: Cash out rewards via USDT TRC20, TON, or custom crypto address with minimum withdrawal validation.
   - `🛠️ 𝗦𝘂𝗽𝗽𝗼𝗿𝘁`: Direct connection to official customer support.

2. **Admin Security & Panel**:
   - Strictly protected by `ADMIN_USER_ID`.
   - `📢 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁`: Batch message broadcast with automatic rate-limiting protection.
   - `➕ 𝗔𝗱𝗱 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸`: Step-by-step wizard (Link ➔ Title ➔ Instructions ➔ Reward ➔ Preview with `✅ 𝗗𝗼𝗻𝗲` / `❌ 𝗖𝗮𝗻𝗰𝗲𝗹`).
   - `🗑️ 𝗗𝗲𝗹𝗲𝘁𝗲 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸`: Interactive selector to deactivate tasks.
   - `🚫 𝗕𝗮𝗻 𝗨𝘀𝗲𝗿` / `✅ 𝗨𝗻𝗯𝗮𝗻 𝗨𝘀𝗲𝗿`: Instantly restrict or restore abusive users.
   - `🔍 𝗨𝘀𝗲𝗿 𝗜𝗻𝗳𝗼`: Query any user's stats, balance, and history.
   - `➕ 𝗔𝗱𝗱 𝗕𝗮𝗹𝗮𝗻𝗰𝗲` / `➖ 𝗥𝗲𝗺𝗼𝘃𝗲 𝗕𝗮𝗹𝗮𝗻𝗰𝗲`: Direct admin balance adjustments.
   - `⚙️ 𝗦𝗲𝘁 𝗥𝗲𝗳𝗲𝗿𝗿𝗮𝗹 %`: Live commission adjustment.
   - `⚙️ 𝗦𝗲𝘁 𝗠𝗶𝗻 𝗪𝗶𝘁𝗵𝗱𝗿𝗮𝘄𝗮𝗹`: Live threshold adjustment.
   - `📊 𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗰𝘀`: Live overview of users, tasks, proofs, and total payout volume.

3. **Anti-Spam & Task Governance**:
   - Cancel Lockout: When a user clicks `❌ 𝗖𝗮𝗻𝗰𝗲𝗹` on a task, they are locked out from that specific task, keeping it active and available for other community members.
   - Real-time Instant Broadcast when admin creates a new task:
     `🔥 𝗡𝗲𝘄 𝗥𝗲𝘃𝗶𝗲𝘄 𝗪𝗼𝗿𝗸 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲! 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 𝗶𝘁 𝗳𝗮𝘀𝘁 𝗯𝗲𝗳𝗼𝗿𝗲 𝗼𝘁𝗵𝗲𝗿𝘀 𝗴𝗿𝗮𝗯 𝗶𝘁! 🏃‍♂️`
   - Admin Inline Review: One-tap `✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲` or `❌ 𝗥𝗲𝗷𝗲𝗰𝘁` with automatic balance crediting, referral bonus distribution, and user notifications.
   - Refund on Withdrawal Rejection: If an admin rejects a withdrawal, funds are immediately restored to the user's balance.

---

## 🚀 Quick Setup & Installation

### 1. Prerequisites
- Node.js 18+ or 20+
- MongoDB instance (local or free cloud cluster at [MongoDB Atlas](https://www.mongodb.com/atlas))
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Your Telegram numeric ID from [@userinfobot](https://t.me/userinfobot)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

```env
BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
ADMIN_USER_ID="123456789"
MONGO_URI="mongodb+srv://admin:password@cluster0.mongodb.net/telegram_review_bot?retryWrites=true&w=majority"
SUPPORT_USERNAME="YourSupportUsername"
```

### 4. Run the Bot
```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

---

## 🐳 Docker Deployment

To spin up both the Bot and a dedicated MongoDB container in one command:
```bash
docker-compose up -d --build
```
Check logs:
```bash
docker-compose logs -f telegram-bot
```

---

## 🗄️ MongoDB Collections Architecture

| Collection | Description | Key Indexes |
|------------|-------------|-------------|
| `users` | User accounts, balances, referral graph, and lockout lists | `telegramId` (unique), `referredBy` |
| `tasks` | Active review campaigns, instructions, and target links | `status`, `createdAt` |
| `submissions` | Proof submissions (screenshots/text) awaiting admin review | `task`, `telegramId`, `status` |
| `withdrawals` | User payout requests with crypto addresses | `telegramId`, `status` |
| `settings` | Dynamic runtime settings (min withdrawal, ref %, support handle) | `key` (unique) |
