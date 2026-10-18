const mongoose = require('mongoose');

/**
 * Connect to shared MongoDB instance
 * Supports standard ANOVA Atlas connection string or fallback to local MongoDB
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoURI) {
    console.warn('[ANOVA DB] Warning: Neither MONGODB_URI nor MONGO_URI is defined in environment variables.');
    console.log('[ANOVA DB] Running in fallback/offline mode.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[ANOVA DB] MongoDB connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`[ANOVA DB] Connection error: ${error.message}`);
    // Do not crash the process in development if MongoDB is offline; let services gracefully fallback
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

module.exports = connectDB;
