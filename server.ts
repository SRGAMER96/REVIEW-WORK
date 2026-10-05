import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
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
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health check endpoint for Render & Uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), bot: botManager.getStatus().status });
});

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
    const indexPath = path.join(distPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      console.warn('⚠️ dist/index.html not found. Serving lightweight health-check landing page.');
      app.get('*', (req, res) => {
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Review Work Bot Server</title></head>
            <body style="font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
              <div style="background: #1e293b; padding: 32px 48px; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h1 style="color: #38bdf8; margin-bottom: 8px;">🚀 Telegram Bot Server is Live!</h1>
                <p style="color: #94a3b8; font-size: 16px; margin: 0 0 16px 0;">Bot is actively running and receiving updates via long polling.</p>
                <div style="display: inline-block; background: #065f46; color: #34d399; padding: 6px 16px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
                  ● System Healthy (HTTP 200)
                </div>
              </div>
            </body>
          </html>
        `);
      });
    }
  }

  // Auto-start bot on boot
  const botToken = process.env.BOT_TOKEN || '8949126540:AAEC475bE115rUe9y99l-X5zT5l7HveB4v0';
  console.log('Starting Telegram bot engine automatically on server boot...');
  botManager.start({
    token: botToken,
    adminId: Number(process.env.ADMIN_USER_ID) || 8962632792,
    mongoUri: process.env.MONGO_URI,
    supportUsername: process.env.SUPPORT_USERNAME || 'SRGAMER96',
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Telegram Bot Studio Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
