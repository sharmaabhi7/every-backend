const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const workRoutes = require('./routes/workRoutes');

dotenv.config();

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('EMAIL_USER:', "bforboll81@gmail.com" ? 'Set ✅' : 'Not set ❌');
console.log('EMAIL_PASS:', "bpfflehyrjnoojoz" ? 'Set ✅' : 'Not set ❌');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set ✅' : 'Not set ❌');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✅' : 'Not set ❌');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL ? 'Set ✅' : 'Not set ❌');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173" || "https://legendary-empanada-7a799c.netlify.app",
    methods: ["GET", "POST","PUT","DELETE"],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// Security middleware with CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "data:"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "blob:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:"
      ],
      connectSrc: [
        "'self'",
        "ws:",
        "wss:",
        process.env.FRONTEND_URL || "http://localhost:5173",
        "https://api.thegreenenterprises.co.in",
        "https://legendary-empanada-7a799c.netlify.app"
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));

// Serve static files for PDFs
app.use('/userpdf', express.static(path.join(__dirname, 'userpdf')));

// Serve frontend static files (if built frontend exists)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Test route to check environment variables
app.get('/api/test-env', (req, res) => {
  res.json({
    emailUser: "bforboll81@gmail.com" ? 'Set' : 'Not set',
    emailPass: "bpfflehyrjnoojoz" ? 'Set' : 'Not set',
    mongoUri: process.env.MONGO_URI ? 'Set' : 'Not set',
    jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set'
  });
});

// Test route to check CSP headers
app.get('/api/test-csp', (req, res) => {
  res.json({
    message: 'CSP headers should be applied',
    headers: {
      'content-security-policy': res.getHeader('content-security-policy') || 'Not set'
    },
    timestamp: new Date().toISOString()
  });
});

// Serve CSP test page
app.get('/test-csp', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-csp.html'));
});

// Public site config route (no auth required)
app.get('/api/site-config', async (req, res) => {
  try {
    const SiteConfig = require('./models/SiteConfig');
    let config = await SiteConfig.findOne();

    if (!config) {
      config = new SiteConfig();
      await config.save();
    }

    res.status(200).json({ config });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/work', workRoutes);

// Catch-all handler: send back React's index.html file for non-API routes
app.use((req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }

  // Serve the frontend index.html for all other routes
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send('Error loading the application');
    }
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);

  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('Admin joined admin room');
  });

  socket.on('disconnect', () => {
    console.log('Admin disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Test email configuration after server starts
  const { testEmailConfig } = require('./controllers/authController');
  await testEmailConfig();

  // Initialize automation services
  const { initializeAutomation } = require('./services/automationService');
  initializeAutomation();
});
