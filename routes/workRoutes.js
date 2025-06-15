const express = require('express');
const router = express.Router();
const workController = require('../controllers/workController');
const { verifyToken, isVerifiedAndSigned } = require('../middleware/auth');

// All work routes require authentication and verification
router.use(verifyToken);
router.use(isVerifiedAndSigned);

// Work management routes
router.post('/start', workController.startWork);
router.post('/save-draft', workController.saveDraft);
router.get('/draft', workController.getDraft);
router.post('/submit', workController.submitWork);

// Get active PDFs for users
router.get('/pdfs', async (req, res) => {
  try {
    const AdminPDF = require('../models/AdminPDF');
    const pdfs = await AdminPDF.find({ isActive: true })
      .select('title description filename originalName fileSize uploadedAt')
      .sort({ uploadedAt: -1 });

    res.status(200).json({ pdfs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin route for deadline checking (can be called by cron job)
router.post('/check-deadlines', workController.checkDeadlines);

module.exports = router;
