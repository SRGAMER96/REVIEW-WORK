import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bot_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBState {
  users: any[];
  tasks: any[];
  submissions: any[];
  withdrawals: any[];
  settings: any[];
}

function loadLocalDB(): DBState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading local DB, initializing fresh:', e);
  }

  // Seed default data
  const defaultState: DBState = {
    users: [
      {
        _id: 'usr_admin',
        telegramId: 9990001,
        username: 'AdminChief',
        firstName: 'System',
        lastName: 'Admin',
        balance: 500.0,
        totalEarned: 500.0,
        totalWithdrawn: 0.0,
        isBanned: false,
        referredBy: null,
        referralCount: 5,
        referralEarnings: 45.0,
        cancelledTasks: [],
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'usr_alice',
        telegramId: 1000101,
        username: 'AliceWorker',
        firstName: 'Alice',
        lastName: 'Vance',
        balance: 6.5,
        totalEarned: 14.5,
        totalWithdrawn: 8.0,
        isBanned: false,
        referredBy: null,
        referralCount: 1,
        referralEarnings: 0.8,
        cancelledTasks: [],
        createdAt: new Date().toISOString(),
      },
    ],
    tasks: [
      {
        _id: 'task_gmaps_01',
        title: 'Google Maps: Bella Vista Bistro Review',
        targetLink: 'https://maps.google.com/?cid=984729104',
        instructions:
          'Visit the Google Maps listing, rate 5 stars ⭐, and post a genuine review mentioning the delicious seafood pasta and great ambience. Submit a clear screenshot of your posted review.',
        rewardAmount: 0.8,
        maxCompletions: 50,
        completedCount: 14,
        status: 'active',
        createdBy: 9990001,
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'task_trustpilot_02',
        title: 'Trustpilot: SwiftPay Wallet 5-Star Rating',
        targetLink: 'https://www.trustpilot.com/review/swiftpay.io',
        instructions:
          'Write a 5-star review on Trustpilot highlighting instant USDT withdrawals, clean UI, and friendly customer support. Must be at least 2 sentences long.',
        rewardAmount: 1.25,
        maxCompletions: 30,
        completedCount: 8,
        status: 'active',
        createdBy: 9990001,
        createdAt: new Date().toISOString(),
      },
    ],
    submissions: [],
    withdrawals: [],
    settings: [
      {
        _id: 'set_global',
        key: 'global_config',
        minWithdrawal: 50.0,
        referralPercent: 10,
        supportUsername: 'SRGAMER96',
        currencySymbol: '₹',
      },
    ],
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2));
  return defaultState;
}

let dbCache: DBState = loadLocalDB();

function saveLocalDB() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbCache, null, 2));
  } catch (e) {
    console.error('Failed to save local DB:', e);
  }
}

// Wrapper for Model Objects to provide Mongoose-compatible .save()
function makeDocument(obj: any, collectionName: keyof DBState) {
  if (!obj) return null;
  const clone = { ...obj };

  Object.defineProperty(clone, 'save', {
    enumerable: false,
    value: async function () {
      const list = dbCache[collectionName];
      const index = list.findIndex((item) => item._id === this._id);
      if (index !== -1) {
        list[index] = { ...this };
        saveLocalDB();
      }
      return this;
    },
  });

  return clone;
}

export const LocalModels = {
  User: {
    findOne: async (query: any) => {
      let match = null;
      if (query.telegramId) {
        match = dbCache.users.find((u) => u.telegramId === Number(query.telegramId));
      } else if (query.$or) {
        for (const q of query.$or) {
          if (q.telegramId) {
            match = dbCache.users.find((u) => u.telegramId === Number(q.telegramId));
            if (match) break;
          }
          if (q.username) {
            match = dbCache.users.find((u) => u.username?.toLowerCase() === q.username.toLowerCase());
            if (match) break;
          }
        }
      }
      return match ? makeDocument(match, 'users') : null;
    },
    create: async (data: any) => {
      const doc = {
        _id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        balance: 0.0,
        totalEarned: 0.0,
        totalWithdrawn: 0.0,
        isBanned: false,
        banReason: '',
        referralCount: 0,
        referralEarnings: 0.0,
        cancelledTasks: [],
        createdAt: new Date().toISOString(),
        ...data,
      };
      dbCache.users.push(doc);
      saveLocalDB();
      return makeDocument(doc, 'users');
    },
    updateOne: async (query: any, update: any) => {
      const match = dbCache.users.find((u) => u.telegramId === Number(query.telegramId));
      if (match) {
        if (update.$inc) {
          for (const key of Object.keys(update.$inc)) {
            match[key] = (match[key] || 0) + update.$inc[key];
          }
        }
        if (update.$set) {
          Object.assign(match, update.$set);
        }
        saveLocalDB();
      }
      return { modifiedCount: match ? 1 : 0 };
    },
    findOneAndUpdate: async (query: any, update: any) => {
      const match = dbCache.users.find((u) => u.telegramId === Number(query.telegramId));
      if (match) {
        if (update.$inc) {
          for (const key of Object.keys(update.$inc)) {
            match[key] = (match[key] || 0) + update.$inc[key];
          }
        }
        if (update.$set) {
          Object.assign(match, update.$set);
        }
        saveLocalDB();
        return makeDocument(match, 'users');
      }
      return null;
    },
    find: (filter: any = {}) => {
      let res = [...dbCache.users];
      if (filter.isBanned !== undefined) {
        res = res.filter((u) => u.isBanned === filter.isBanned);
      }
      return {
        select: (fields: string) => res.map((u) => makeDocument(u, 'users')),
        then: (resolve: any) => resolve(res.map((u) => makeDocument(u, 'users'))),
      };
    },
    countDocuments: async (filter: any = {}) => {
      if (filter.isBanned !== undefined) {
        return dbCache.users.filter((u) => u.isBanned === filter.isBanned).length;
      }
      return dbCache.users.length;
    },
  },

  Task: {
    find: (filter: any = {}) => {
      let res = [...dbCache.tasks];
      if (filter.status) {
        res = res.filter((t) => t.status === filter.status);
      }
      if (filter._id && filter._id.$nin) {
        const excluded = filter._id.$nin.map((id: any) => String(id));
        res = res.filter((t) => !excluded.includes(String(t._id)));
      }
      return {
        limit: (n: number) => res.slice(0, n).map((t) => makeDocument(t, 'tasks')),
        then: (resolve: any) => resolve(res.map((t) => makeDocument(t, 'tasks'))),
      };
    },
    findById: async (id: string) => {
      const match = dbCache.tasks.find((t) => String(t._id) === String(id));
      return match ? makeDocument(match, 'tasks') : null;
    },
    findByIdAndUpdate: async (id: string, update: any) => {
      const match = dbCache.tasks.find((t) => String(t._id) === String(id));
      if (match) {
        if (update.$inc) {
          for (const key of Object.keys(update.$inc)) {
            match[key] = (match[key] || 0) + update.$inc[key];
          }
        }
        if (update.status) match.status = update.status;
        saveLocalDB();
        return makeDocument(match, 'tasks');
      }
      return null;
    },
    create: async (data: any) => {
      const doc = {
        _id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        completedCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        ...data,
      };
      dbCache.tasks.push(doc);
      saveLocalDB();
      return makeDocument(doc, 'tasks');
    },
    findOne: (filter: any = {}) => {
      let res = [...dbCache.tasks];
      if (filter.status) {
        res = res.filter((t) => t.status === filter.status);
      }
      if (filter._id && filter._id.$nin) {
        const excluded = filter._id.$nin.map((id: any) => String(id));
        res = res.filter((t) => !excluded.includes(String(t._id)));
      }
      return {
        sort: (sortObj: any) => {
          return {
            then: (resolve: any) => resolve(res.length > 0 ? makeDocument(res[0], 'tasks') : null),
          };
        },
        then: (resolve: any) => resolve(res.length > 0 ? makeDocument(res[0], 'tasks') : null),
      };
    },
    countDocuments: async (filter: any = {}) => {
      let res = [...dbCache.tasks];
      if (filter.status) {
        res = res.filter((t) => t.status === filter.status);
      }
      if (filter._id && filter._id.$nin) {
        const excluded = filter._id.$nin.map((id: any) => String(id));
        res = res.filter((t) => !excluded.includes(String(t._id)));
      }
      return res.length;
    },
  },

  Submission: {
    find: (filter: any = {}) => {
      let res = [...dbCache.submissions];
      if (filter.telegramId) {
        res = res.filter((s) => s.telegramId === Number(filter.telegramId));
      }
      if (filter.status && filter.status.$in) {
        res = res.filter((s) => filter.status.$in.includes(s.status));
      }
      return {
        select: (fields: string) => res.map((s) => makeDocument(s, 'submissions')),
        then: (resolve: any) => resolve(res.map((s) => makeDocument(s, 'submissions'))),
      };
    },
    findById: (id: string) => {
      const match = dbCache.submissions.find((s) => String(s._id) === String(id));
      return {
        populate: async (field: string) => {
          if (!match) return null;
          const clone = { ...match };
          if (field === 'task') {
            const task = dbCache.tasks.find((t) => String(t._id) === String(match.task));
            clone.task = task || { title: 'Review Task', _id: match.task };
          }
          return makeDocument(clone, 'submissions');
        },
        then: (resolve: any) => resolve(match ? makeDocument(match, 'submissions') : null),
      };
    },
    create: async (data: any) => {
      const doc = {
        _id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...data,
      };
      dbCache.submissions.push(doc);
      saveLocalDB();
      return makeDocument(doc, 'submissions');
    },
    countDocuments: async (filter: any = {}) => {
      let res = dbCache.submissions;
      if (filter.status) {
        res = res.filter((s) => s.status === filter.status);
      }
      if (filter.telegramId) {
        res = res.filter((s) => s.telegramId === Number(filter.telegramId));
      }
      return res.length;
    },
  },

  Withdrawal: {
    findOne: async (query: any) => {
      const match = dbCache.withdrawals.find(
        (w) => w.telegramId === Number(query.telegramId) && w.status === query.status
      );
      return match ? makeDocument(match, 'withdrawals') : null;
    },
    findById: async (id: string) => {
      const match = dbCache.withdrawals.find((w) => String(w._id) === String(id));
      return match ? makeDocument(match, 'withdrawals') : null;
    },
    create: async (data: any) => {
      const doc = {
        _id: `wd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...data,
      };
      dbCache.withdrawals.push(doc);
      saveLocalDB();
      return makeDocument(doc, 'withdrawals');
    },
    countDocuments: async (filter: any = {}) => {
      if (filter.status) {
        return dbCache.withdrawals.filter((w) => w.status === filter.status).length;
      }
      return dbCache.withdrawals.length;
    },
    aggregate: async (pipeline: any[]) => {
      const approved = dbCache.withdrawals.filter((w) => w.status === 'approved');
      const total = approved.reduce((sum, item) => sum + (item.amount || 0), 0);
      return [{ _id: null, total }];
    },
  },

  Setting: {
    findOne: async (query: any) => {
      const match = dbCache.settings.find((s) => s.key === (query.key || 'global_config'));
      return match ? makeDocument(match, 'settings') : null;
    },
    create: async (data: any) => {
      const doc = {
        _id: 'set_global',
        minWithdrawal: 50.0,
        referralPercent: 10,
        supportUsername: 'SRGAMER96',
        currencySymbol: '₹',
        ...data,
      };
      dbCache.settings.push(doc);
      saveLocalDB();
      return makeDocument(doc, 'settings');
    },
    updateOne: async (query: any, update: any, options: any = {}) => {
      let match = dbCache.settings.find((s) => s.key === (query.key || 'global_config'));
      if (!match && options.upsert) {
        match = { _id: 'set_global', key: 'global_config', ...update };
        dbCache.settings.push(match);
      } else if (match) {
        Object.assign(match, update);
      }
      saveLocalDB();
      return { modifiedCount: 1 };
    },
  },
};

export async function getDBModels(mongoUri?: string) {
  if (mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      console.log('Connecting to provided MongoDB URI...');
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      }
      console.log('Connected to remote MongoDB successfully.');
      return {
        isRemoteMongo: true,
        User: require('../src/bot-source/models/User'),
        Task: require('../src/bot-source/models/Task'),
        Submission: require('../src/bot-source/models/Submission'),
        Withdrawal: require('../src/bot-source/models/Withdrawal'),
        Setting: require('../src/bot-source/models/Setting'),
      };
    } catch (err: any) {
      console.warn('Failed to connect to MongoDB URI, falling back to local persistent store:', err.message);
    }
  }

  return {
    isRemoteMongo: false,
    ...LocalModels,
  };
}

export function getLocalDBSnapshot() {
  return dbCache;
}
