const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from cwd, backend/.env, root .env, or atlas-credentials.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../atlas-credentials.env') });

const { csrfProtection } = require('./middleware/csrf');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const slotRoutes = require('./routes/slotRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const queueRoutes = require('./routes/queueRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Trust reverse proxy (Render, Railway, Nginx, ALB) for accurate client IP in rate limiting & secure cookies
app.set('trust proxy', 1);

// CORS configuration: supports credentials (HttpOnly cookies) and all local dev ports (5173, 5174, etc.)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-side)
      if (!origin) return callback(null, true);

      // Allow all localhost and 127.0.0.1 ports dynamically in development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, origin);
      }

      // Allow production client URL
      if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
        return callback(null, origin);
      }

      // Fallback: permit origin with credentials enabled
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token', 'X-Requested-With', 'Accept', 'Origin']
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Anti-CSRF Protection for cookie-authenticated state-changing operations
app.use(csrfProtection);

// Global Rate Limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'QueueLess Backend API',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);

// In production, serve built frontend static files
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const fs = require('fs');

if (fs.existsSync(frontendDistPath)) {
  console.log(`[Static] Serving frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    // If request starts with /api, let 404 handler handle it
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.warn(`[Static Warning] Frontend dist directory not found at: ${frontendDistPath}`);
  app.get('/', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>QueueLess Backend</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;max-width:600px;margin:auto;color:#1e293b;}</style></head>
        <body>
          <h2>QueueLess Campus Services API is Running</h2>
          <p>Status: <strong>Healthy</strong></p>
          <p>The frontend static build was not found at <code>frontend/dist</code>. Run <code>npm run build</code> to compile the client application.</p>
          <p><a href="/api/health">Check API Health</a> | <a href="/api/services">View Services</a></p>
        </body>
      </html>
    `);
  });
}

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
