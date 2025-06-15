const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema({
  navbarTitle: {
    type: String,
    default: 'DataEntry Pro'
  },
  footerContactNumber: {
    type: String,
    default: '+1 (555) 123-4567'
  },
  footerAddress: {
    type: String,
    default: '123 Business Street, City, State 12345'
  },
  footerEmail: {
    type: String,
    default: 'bforboll81@gmail.com'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
