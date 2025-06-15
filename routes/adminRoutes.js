const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin privileges
router.use(verifyToken);
router.use(isAdmin);

// Dashboard stats
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/detailed-user-data', adminController.getDetailedUserData);

// User management routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/send-otp', adminController.sendOTPManually);
router.post('/users/:userId/send-agreement', adminController.sendAgreementLinkManually);

// Enhanced user management routes
router.get('/users/:userId/password', adminController.getUserPassword);
router.post('/users/:userId/penalize', adminController.penalizeUser);
router.post('/users/:userId/remove-penalty', adminController.removePenalty);
router.get('/users/:userId/work', adminController.getUserWork);

// Automation routes
router.post('/trigger-automation', adminController.triggerAutomation);

// Agreement management routes
router.get('/agreements', adminController.getAllAgreements);
router.post('/agreements', adminController.createAgreement);

// Signed agreement management routes
router.get('/signed-agreements', adminController.getAllSignedAgreements);
router.get('/signed-agreements/:agreementId', adminController.getSignedAgreement);
router.post('/signed-agreements/:agreementId/send-pdf', adminController.sendSignedAgreementPDF);
router.put('/agreements/:agreementId', adminController.updateAgreement);
router.delete('/agreements/:agreementId', adminController.deleteAgreement);

// Search routes
router.get('/search-users', adminController.searchUsers);

// Site configuration routes (GET is public for frontend to load config)
router.get('/site-config', adminController.getSiteConfig);
router.put('/site-config', adminController.updateSiteConfig);

// PDF management routes
router.get('/pdfs', adminController.getAllPDFs);
router.post('/pdfs/upload', adminController.uploadPDF);
router.patch('/pdfs/:pdfId/toggle', adminController.togglePDFStatus);
router.delete('/pdfs/:pdfId', adminController.deletePDF);
router.get('/pdfs/active', adminController.getActivePDFs);

module.exports = router;
