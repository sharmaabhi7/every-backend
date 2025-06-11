const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);
router.get('/agreement', authController.getAgreement);

// Protected routes
router.post('/sign-agreement', verifyToken, authController.signAgreement);
router.get('/get-agreement/:userId', verifyToken, authController.getUserSignedAgreement);

module.exports = router;
