const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
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

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));

// Serve static files for PDFs
app.use('/userpdf', express.static(path.join(__dirname, 'userpdf')));

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
