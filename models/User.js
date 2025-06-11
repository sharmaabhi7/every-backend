const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  alternativeMobileNumber: {
    type: String
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isSignedAgreement: {
    type: Boolean,
    default: false
  },
  signature: {
    type: String
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  workStartedAt: {
    type: Date
  },
  projectLink: {
    type: String
  },
  workSubmitted: {
    type: Boolean,
    default: false
  },
  isPenalized: {
    type: Boolean,
    default: false
  },
  penalizedAt: {
    type: Date
  },
  penalizedReason: {
    type: String,
    enum: ['deadline_exceeded', 'manual', 'auto_24h_after_submission'],
    default: 'deadline_exceeded'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);