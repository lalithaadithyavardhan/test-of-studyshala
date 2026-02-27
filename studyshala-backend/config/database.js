const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // FIXED: Removed deprecated options (useNewUrlParser, useUnifiedTopology)
    // Mongoose 6+ no longer requires them and will throw warnings if included.
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`CRITICAL MongoDB connection error: ${error.message}`); // Forced console print
    process.exit(1);
  }
};

module.exports = connectDB;
