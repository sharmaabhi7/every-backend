const mongoose = require('mongoose');

const workReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',
    required: true
  },
  submittedAt: {
    type: Date,
    required: true
  },
  reviewedAt: {
    type: Date
  },
  accuracyResult: {
    correct: {
      type: Number,
      default: 0
    },
    wrong: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  autoReviewScheduledAt: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('WorkReview', workReviewSchema);
