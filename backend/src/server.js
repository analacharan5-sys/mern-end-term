const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./config/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  QueueLess Backend Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
