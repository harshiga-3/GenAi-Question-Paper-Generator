require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const generateRoutes = require('./routes/generate');
const papersRoutes = require('./routes/papers');
const criteriaRoutes = require('./routes/criteria');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/generate', generateRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/criteria', criteriaRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'QPG Server is running',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    aiClient: 'rest-v1'
  });
});

// Error handler (must be after routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Connect to MongoDB (optional - falls back to in-memory store if not configured)
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.warn('⚠️  MongoDB not connected, using in-memory store:', err.message));
} else {
  console.log('ℹ️  No MONGO_URI set. Using in-memory store for development.');
}

app.listen(PORT, () => {
  console.log(`🚀 QPG Backend running at http://localhost:${PORT}`);
});
