const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isVerifiedAndSigned } = require('../middleware/auth');

// All user routes require authentication and verification
router.use(verifyToken);
router.use(isVerifiedAndSigned);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/dashboard', userController.getDashboard);

module.exports = router;
