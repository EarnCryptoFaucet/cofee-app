/**
 * server.js
 * Main Express server for Coffee Shop Management System
 * Production-ready with proper middleware and error handling
 */

const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();

// ── Port config (Railway compatible) ──
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── CORS headers (for dev flexibility) ──
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Serve static frontend files ──
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API routes ──
app.use('/api', routes);

// ── Health check endpoint ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'BrewTrack - Coffee Shop Management',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Serve index.html for all non-API routes (SPA support) ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`
  ☕ BrewTrack Coffee Shop Management System
  ─────────────────────────────────────────
  🚀 Server running on port ${PORT}
  📦 Environment: ${process.env.NODE_ENV || 'development'}
  🌐 URL: http://localhost:${PORT}
  ─────────────────────────────────────────
  `);
});

module.exports = app;
