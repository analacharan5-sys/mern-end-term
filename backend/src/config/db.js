const mongoose = require('mongoose');

let isConnected = false;
let embeddedMongo = null;

async function connectDB(customUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const explicitUri = customUri || process.env.MONGO_URI;

  // 1. If explicit MONGO_URI is set (e.g. in .env or Atlas connection string), connect to it
  if (explicitUri) {
    try {
      const conn = await mongoose.connect(explicitUri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: true
      });
      isConnected = true;
      console.log(`[Database] Connected to MongoDB: ${conn.connection.host || 'remote'}`);
      return conn.connection;
    } catch (err) {
      console.error(`[Database Error] Connection to MONGO_URI failed: ${err.message}`);
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
