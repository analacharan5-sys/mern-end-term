const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./config/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Bind explicitly to 0.0.0.0 so cloud providers (Render, Railway, Docker) route incoming traffic
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`  QueueLess Backend Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Fatal Server Error] Port ${PORT} is already in use by another process.`);
    } else {
      console.error('[Fatal Server Error]', err.message);
    }
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
