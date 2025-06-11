const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date
  },
  lastSaved: {
    type: Date
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date
  },
  autoPenalizedAt: {
    type: Date
  },
  isAutoPenalized: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Work', workSchema);