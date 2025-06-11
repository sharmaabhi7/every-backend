const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Agreement', agreementSchema);