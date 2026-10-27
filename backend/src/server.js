const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./config/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Bind to port immediately so cloud providers (Render, Railway) detect healthy port binding
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  QueueLess Backend Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });

  try {
    await connectDB();
    await seedInitialData();
  } catch (error) {
    console.error('[Startup Warning] Initial database connection error:', error.message);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
