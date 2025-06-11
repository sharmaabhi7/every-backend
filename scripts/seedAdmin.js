const mongoose = require('mongoose');
const User = require('../models/User');
const Agreement = require('../models/Agreement');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      mobileNumber: '9999999999',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      isSignedAgreement: true
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');

    // Create default agreement if none exists
    const existingAgreement = await Agreement.findOne();
    if (!existingAgreement) {
      const defaultAgreement = new Agreement({
        content: `TERMS AND CONDITIONS AGREEMENT

I, [USER_NAME], holder of mobile number [MOBILE_NUMBER], hereby acknowledge and agree to the following terms and conditions:

1. PERSONAL INFORMATION
   - Name: [USER_NAME]
   - Mobile Number: [MOBILE_NUMBER]
   - I confirm that the above information is accurate and up-to-date.

2. WORK ASSIGNMENT
   - I will be assigned a work task that must be completed within 4 days of starting.
   - The work must be original and completed by me personally.
   - I may save drafts and continue working until submission.

3. DEADLINE COMPLIANCE
   - I have exactly 4 days (96 hours) from the time I start work to submit.
   - I understand that failure to submit within the deadline will result in automatic penalties.
   - I acknowledge that daily reminders will be sent as the deadline approaches.

4. SUBMISSION REQUIREMENTS
   - All work must be submitted through the provided online editor.
   - Once submitted, no further changes can be made.
   - Submissions are final and binding.

5. PENALTIES
   - I understand that late submission will result in automatic penalty status.
   - I acknowledge that penalized users may face restrictions on future assignments.
   - I agree that penalty reports will be automatically generated and sent after 24 hours of submission.

6. COMMUNICATION
   - All official communication will be sent to my registered email address.
   - I am responsible for checking my email regularly.
   - OTP verification is required for account security.

7. AGREEMENT MODIFICATIONS
   - These terms may be updated from time to time.
   - I will be notified of any significant changes.
   - Continued use of the platform constitutes acceptance of updated terms.

By providing my digital signature below, I, [USER_NAME], confirm that I have read, understood, and agree to be bound by these terms and conditions.

Signatory: [USER_NAME]
Mobile: [MOBILE_NUMBER]
Date: [Current Date]
Signature: [Digital Signature Required]`,
        version: 1
      });

      await defaultAgreement.save();
      console.log('Default agreement created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
