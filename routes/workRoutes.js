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

// Admin route for deadline checking (can be called by cron job)
router.post('/check-deadlines', workController.checkDeadlines);

module.exports = router;
