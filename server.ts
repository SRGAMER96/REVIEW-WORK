import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { botManager } from './server/botEngine';
import { getLocalDBSnapshot } from './server/db';

dotenv.config();

// Process safety guards
process.on('uncaughtException', (err) => {
  console.error('[Process UncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process UnhandledRejection]', reason);
});

const app = express();
const PORT = 3000;

app.use(express.json());

// ============================================================================
// 🤖 TELEGRAM BOT MANAGEMENT API
// ============================================================================

// 1. Get live status
app.get('/api/bot/status', (req, res) => {
  res.json(botManager.getStatus());
});

// 2. Get live event logs
app.get('/api/bot/logs', (req, res) => {
  res.json(botManager.getLogs());
});

// 3. Start bot process
app.post('/api/bot/start', async (req, res) => {
  const { token, adminId, mongoUri, supportUsername } = req.body;

  const botToken = token || process.env.BOT_TOKEN;
  const targetAdminId = adminId || process.env.ADMIN_USER_ID || 9990001;
  const targetMongoUri = mongoUri || process.env.MONGO_URI;
  const targetSupport = supportUsername || process.env.SUPPORT_USERNAME || 'ReviewWorkSupport';

  if (!botToken) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid Telegram Bot Token (obtained from @BotFather).',
    });
  }

  const result = await botManager.start({
    token: botToken,
    adminId: Number(targetAdminId),
    mongoUri: targetMongoUri,
    supportUsername: targetSupport,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    status: botManager.getStatus(),
  });
});

// 4. Stop bot process
app.post('/api/bot/stop', async (req, res) => {
  await botManager.stop();
  res.json({
    success: true,
    status: botManager.getStatus(),
  });
});

// 5. Test token validity via Telegram getMe
app.post('/api/bot/test-token', async (req, res) => {
  const token = req.body.token || process.env.BOT_TOKEN;
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token is missing' });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (data.ok) {
      return res.json({ valid: true, botUser: data.result });
    } else {
      return res.status(400).json({ valid: false, error: data.description || 'Invalid Telegram Bot Token' });
    }
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: `Connection failed: ${err.message}` });
  }
});

// 6. Inspect server DB snapshot
app.get('/api/bot/database', (req, res) => {
  res.json(getLocalDBSnapshot());
});

// ============================================================================
// 🌐 VITE MIDDLEWARE & FRONTEND INTEGRATION
// ============================================================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Auto-start bot if BOT_TOKEN is already present in process.env
  if (process.env.BOT_TOKEN && process.env.ADMIN_USER_ID) {
    console.log('Found BOT_TOKEN in environment variables, starting bot automatically...');
    botManager.start({
      token: process.env.BOT_TOKEN,
      adminId: Number(process.env.ADMIN_USER_ID),
      mongoUri: process.env.MONGO_URI,
      supportUsername: process.env.SUPPORT_USERNAME,
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Telegram Bot Studio Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
