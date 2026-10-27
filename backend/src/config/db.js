const mongoose = require('mongoose');
const dns = require('dns');

let isConnected = false;
let embeddedMongo = null;

// Workaround for Node.js on Windows networks where local DNS fails SRV lookups
function enableDnsFallback() {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err) {
    // Silently ignore if environment restricts custom DNS
  }
}

async function connectDB(customUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let explicitUri = customUri || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (typeof explicitUri === 'string') {
    explicitUri = explicitUri.trim().replace(/^["']|["']$/g, '');
  }

  // 1. If explicit MONGO_URI / MONGODB_URI is set (e.g. MongoDB Atlas), connect to it
  if (explicitUri) {
    // If using MongoDB SRV connection on Windows, enable public DNS upfront to avoid querySrv ECONNREFUSED
    if (explicitUri.includes('+srv')) {
      enableDnsFallback();
    }

    // If the Atlas URI does not specify a database name, append /queueless
    if (/mongodb(\+srv)?:\/\/[^/]+(\/)?(\?.*)?$/.test(explicitUri)) {
      const match = explicitUri.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/)?(\?.*)?$/);
      if (match) {
        const base = match[1];
        const query = match[2] || '?retryWrites=true&w=majority';
        explicitUri = `${base}/queueless${query.startsWith('?') ? query : '?' + query}`;
      }
    }

    try {
      const conn = await mongoose.connect(explicitUri, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: true
      });
      isConnected = true;
      console.log(`[Database] Successfully connected to MongoDB Atlas: ${conn.connection.host || 'cluster'}`);
      return conn.connection;
    } catch (err) {
      console.error(`[Database Error] Connection to MongoDB Atlas failed: ${err.message}`);
      throw err;
    }
  }

  // 2. If no MONGO_URI is specified, first attempt connecting to default local port 27017
  const defaultLocalUri = 'mongodb://127.0.0.1:27017/queueless';
  try {
    const conn = await mongoose.connect(defaultLocalUri, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: true
    });
    isConnected = true;
    console.log('[Database] Connected to local MongoDB on port 27017');
    return conn.connection;
  } catch (localErr) {
    // 3. Port 27017 is not running: boot built-in local MongoDB 7.0 for instant zero-config operation
    console.log('[Database] No active MongoDB service detected on 127.0.0.1:27017.');
    console.log('[Database] Booting built-in local MongoDB 7.0 engine for development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      embeddedMongo = await MongoMemoryServer.create();
      const embeddedUri = embeddedMongo.getUri() + 'queueless';
      const conn = await mongoose.connect(embeddedUri, { autoIndex: true });
      isConnected = true;
      console.log(`[Database] Successfully connected to local MongoDB: ${embeddedUri}`);
      console.log('[Database] Tip: To connect to MongoDB Atlas or an external service, set MONGO_URI in your .env file.');
      return conn.connection;
    } catch (embeddedErr) {
      console.error('[Database Error] Failed to launch embedded MongoDB:', embeddedErr.message);
      throw localErr;
    }
  }
}

async function disconnectDB() {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (embeddedMongo) {
    await embeddedMongo.stop();
    embeddedMongo = null;
  }
  console.log('[Database] MongoDB disconnected');
}

module.exports = {
  connectDB,
  disconnectDB
};
