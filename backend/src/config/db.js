const mongoose = require('mongoose');

let isConnected = false;

async function connectDB(customUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/queueless';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host || 'local'}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    throw error;
  }
}

async function disconnectDB() {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected');
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
