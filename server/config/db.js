const mongoose = require('mongoose');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log(`MongoDB connected to database: ${conn.connection.name}`);
};

module.exports = connectDB;
