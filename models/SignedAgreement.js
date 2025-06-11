const mongoose = require('mongoose');

const signedAgreementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userMobileNumber: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  agreementContent: {
    type: String,
    required: true
  },
  signedAt: {
    type: Date,
    default: Date.now
  },
  pdfPath: {
    type: String // Path to the generated PDF file
  }
});

module.exports = mongoose.model('SignedAgreement', signedAgreementSchema);
