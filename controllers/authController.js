const User = require('../models/User');
const Agreement = require('../models/Agreement');
const SignedAgreement = require('../models/SignedAgreement');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { generateSignedAgreementPDF } = require('../services/pdfService');


// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: "bforboll81@gmail.com",
    pass: "bpfflehyrjnoojoz"
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true, // Enable debug output
  logger: true // Log to console
});

// Test email configuration function (called from server.js after env is loaded)
const testEmailConfig = async () => {
  if (process.env.SKIP_EMAIL === 'true') {
    console.log('\n📧 EMAIL TESTING SKIPPED (Testing Mode)');
    console.log('📧 SKIP_EMAIL=true - OTPs will be displayed in console');
    console.log('📧 To enable real email sending, set SKIP_EMAIL=false in .env\n');
    return true;
  }

  try {
    console.log('\n📧 Testing email configuration...');
    console.log('📧 Email User:', "bforboll81@gmail.com");
    console.log('📧 Email Pass length:', "bpfflehyrjnoojoz" ? "bpfflehyrjnoojoz".length : 'Not set');

    await transporter.verify();
    console.log('✅ Email configuration is valid and ready to send emails\n');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.error('❌ Please check your EMAIL_USER and EMAIL_PASS in .env file');
    console.error('❌ Make sure you are using Gmail App Password, not regular password\n');
    return false;
  }
};

// Export the test function so it can be called from server.js
module.exports.testEmailConfig = testEmailConfig;

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTP = async (email, otp, retryCount = 0) => {
  const maxRetries = 3;

  try {
    console.log(`\n📧 Attempting to send OTP email (attempt ${retryCount + 1}/${maxRetries + 1})`);
    console.log('📧 To:', email);
    console.log('📧 From:', "bforboll81@gmail.com");
    console.log('📧 OTP:', otp);

    const mailOptions = {
      from: {
        name: 'ATO Verification',
        address: "bforboll81@gmail.com"
      },
      to: email,
      subject: '🔐 Email Verification OTP - ATO',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0; font-size: 28px;">🔐 Email Verification</h1>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello!</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thank you for registering with our MERN Stack Application. To complete your registration, please use the following One-Time Password (OTP):</p>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <div style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>

            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                ⏰ <strong>Important:</strong> This OTP will expire in <strong>10 minutes</strong> for security reasons.
              </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">If you didn't request this verification, please ignore this email. Your account will remain secure.</p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

            <div style="text-align: center; color: #9CA3AF; font-size: 12px;">
              <p>This email was sent from MERN Stack Application</p>
              <p>© 2025 ATO. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Email Verification OTP

        Hello!

        Thank you for registering with our MERN Stack Application.
        Your OTP for email verification is: ${otp}

        This OTP will expire in 10 minutes.

        If you didn't request this verification, please ignore this email.

        Best regards,
        ATO Team
      `
    };

    console.log('📧 Sending email...');
    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Response:', result.response);

    return result;
  } catch (error) {
    console.error(`❌ Email sending failed (attempt ${retryCount + 1}):`, error.message);

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying in 2 seconds... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendOTP(email, otp, retryCount + 1);
    }

    // If all retries failed, throw detailed error
    console.error('❌ All email sending attempts failed');
    console.error('❌ Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });

    throw new Error(`Failed to send email after ${maxRetries + 1} attempts: ${error.message}`);
  }
};

// Send agreement link
const sendAgreementLink = async (email, token) => {
  const agreementLink = `${process.env.FRONTEND_URL}/sign-agreement/${token}`;

  try {
    console.log('📧 Preparing agreement link email...');

    const mailOptions = {
      from: {
        name: 'ATO Agreement',
        address: "bforboll81@gmail.com"
      },
      to: email,
      subject: '📝 Agreement Signing Required - ATO',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin: 0; font-size: 28px;">📝 Agreement Signing</h1>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Congratulations!</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your email has been successfully verified. To complete your registration and access the platform, please sign the user agreement.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${agreementLink}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                📝 Sign Agreement Now
              </a>
            </div>

            <div style="background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                🔗 <strong>Direct Link:</strong> If the button doesn't work, copy and paste this link in your browser:
              </p>
              <p style="margin: 5px 0 0 0; color: #1E40AF; font-size: 12px; word-break: break-all;">
                ${agreementLink}
              </p>
            </div>

            <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">This link is valid for 24 hours. After signing the agreement, you'll be able to access your dashboard and start working.</p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

            <div style="text-align: center; color: #9CA3AF; font-size: 12px;">
              <p>This email was sent from MERN Stack Application</p>
              <p>© 2025 ATO. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
      text: `
        Agreement Signing Required

        Congratulations!

        Your email has been successfully verified. To complete your registration and access the platform, please sign the user agreement.

        Click here to sign the agreement: ${agreementLink}

        This link is valid for 24 hours.

        Best regards,
        ATO Team
      `
    };

    console.log('📧 Sending agreement link email...');
    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Agreement link email sent successfully!');
    console.log('📧 Message ID:', result.messageId);

    return result;
  } catch (error) {
    console.error('❌ Agreement link email sending failed:', error.message);
    throw error;
  }
};

// Register user
exports.register = async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { name, email, mobileNumber, alternativeMobileNumber, password } = req.body;

    // Check if user already exists
    console.log('Checking if user exists with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }
    console.log('User does not exist, proceeding with registration');

    // Generate OTP
    console.log('Generating OTP...');
    const otp = generateOTP();
    console.log('Generated OTP:', otp);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    console.log('OTP expiry set to:', otpExpiry); // OTP valid for 10 minutes

    // Create new user
    console.log('Creating new user...');
    const newUser = new User({
      name,
      email,
      mobileNumber,
      alternativeMobileNumber,
      password, // Plain text as required
      otp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    console.log('Saving user to database...');
    await newUser.save();
    console.log('User saved successfully with ID:', newUser._id);

    // Send OTP
    if (process.env.SKIP_EMAIL === 'true') {
      console.log('\n📧 EMAIL SENDING SKIPPED (Testing Mode)');
      console.log('📝 OTP for verification:', otp);
      console.log('📝 Copy this OTP to verify your email\n');
    } else {
      console.log('\n📧 Sending OTP email to:', email);
      try {
        await sendOTP(email, otp);
        console.log('✅ Registration completed successfully with OTP sent to email');
      } catch (emailError) {
        console.error('❌ Email sending failed during registration:', emailError.message);
        console.log('📝 OTP for manual verification (in case email failed):', otp);
        // Continue with registration even if email fails - user can still verify manually
      }
    }

    res.status(201).json({ message: 'User registered. Please verify your email.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    console.log('OTP verification request received:', req.body);
    const { email, otp } = req.body;

    console.log('Looking for user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found. Stored OTP:', user.otp?.code, 'Provided OTP:', otp);
    if (!user.otp || user.otp.code !== otp) {
      console.log('Invalid OTP provided');
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    console.log('OTP expiry:', user.otp.expiresAt, 'Current time:', new Date());
    if (new Date() > user.otp.expiresAt) {
      console.log('OTP has expired');
      return res.status(400).json({ message: 'OTP expired' });
    }

    console.log('OTP verified successfully. Updating user...');
    // Update user verification status
    user.isVerified = true;
    user.otp = undefined;
    await user.save();
    console.log('User verification status updated');

    // Generate token for agreement signing
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('Agreement token generated:', token.substring(0, 20) + '...');

    // Send agreement link
    if (process.env.SKIP_EMAIL === 'true') {
      console.log('\n📧 EMAIL SENDING SKIPPED (Testing Mode)');
      console.log('🔗 Agreement link for manual access:', `${process.env.FRONTEND_URL}/sign-agreement/${token}`);
      console.log('🔗 Copy this link to sign the agreement\n');
    } else {
      console.log('\n📧 Sending agreement link to:', email);
      try {
        await sendAgreementLink(email, token);
        console.log('✅ Agreement link sent successfully to email');
      } catch (emailError) {
        console.error('❌ Failed to send agreement link:', emailError.message);
        console.log('🔗 Agreement link for manual access:', `${process.env.FRONTEND_URL}/sign-agreement/${token}`);
      }
    }

    res.status(200).json({
      message: 'Email verified. Please sign the agreement.',
      agreementLink: `${process.env.FRONTEND_URL}/sign-agreement/${token}`
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

      user.otp = {
        code: otp,
        expiresAt: otpExpiry
      };
      await user.save();

      // Send OTP with email skip logic
      if (process.env.SKIP_EMAIL === 'true') {
        console.log('Email sending skipped. OTP for verification:', otp);
      } else {
        try {
          await sendOTP(email, otp);
        } catch (emailError) {
          console.error('Failed to send OTP:', emailError.message);
          console.log('OTP for manual verification:', otp);
        }
      }

      return res.status(403).json({ message: 'Email not verified', requiresVerification: true });
    }

    if (!user.isSignedAgreement) {
      // Generate token for agreement signing
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

      // Send agreement link with email skip logic
      if (process.env.SKIP_EMAIL === 'true') {
        console.log('Email sending skipped. Agreement link:', `${process.env.FRONTEND_URL}/sign-agreement/${token}`);
      } else {
        try {
          await sendAgreementLink(email, token);
        } catch (emailError) {
          console.error('Failed to send agreement link:', emailError.message);
          console.log('Agreement link for manual access:', `${process.env.FRONTEND_URL}/sign-agreement/${token}`);
        }
      }

      return res.status(403).json({
        message: 'Agreement not signed',
        requiresAgreement: true,
        agreementLink: `${process.env.FRONTEND_URL}/sign-agreement/${token}`
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sign agreement
exports.signAgreement = async (req, res) => {
  try {
    const { signature } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the latest agreement
    const agreement = await Agreement.findOne().sort({ version: -1 });
    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Create agreement content with user data inserted
    const agreementContentWithUserData = agreement.content
      .replace(/\[USER_NAME\]/g, user.name)
      .replace(/\[MOBILE_NUMBER\]/g, user.mobileNumber);

    // Create signed agreement record
    const signedAgreement = new SignedAgreement({
      userId: user._id,
      agreementId: agreement._id,
      userName: user.name,
      userEmail: user.email,
      userMobileNumber: user.mobileNumber,
      signature: signature,
      agreementContent: agreementContentWithUserData
    });

    await signedAgreement.save();

    // Update user
    user.signature = signature;
    user.isSignedAgreement = true;
    await user.save();

    // Generate PDF and send emails
    try {
      const pdfResult = await generateSignedAgreementPDF(signedAgreement);

      // Update signed agreement with PDF path
      signedAgreement.pdfPath = pdfResult.filePath;
      await signedAgreement.save();

      // Send email to user with signed agreement
      await sendSignedAgreementEmail(user.email, user.name, pdfResult.filePath);

      // Send notification to admin
      await sendAdminNotificationEmail(user.name, user.email);

      console.log('Signed agreement PDF generated and emails sent successfully');
    } catch (emailError) {
      console.error('Error generating PDF or sending emails:', emailError.message);
      // Don't fail the signing process if email fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Agreement signed successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get agreement
exports.getAgreement = async (req, res) => {
  try {
    // Get the latest agreement
    const agreement = await Agreement.findOne().sort({ version: -1 });

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // If user is authenticated, get their info to insert into agreement
    let agreementContent = agreement.content;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user) {
          // Replace placeholders with actual user data
          agreementContent = agreement.content
            .replace(/\[USER_NAME\]/g, user.name)
            .replace(/\[MOBILE_NUMBER\]/g, user.mobileNumber);
        }
      } catch (tokenError) {
        // If token is invalid, just return the original content
        console.log('Token verification failed for agreement content:', tokenError.message);
      }
    }

    res.status(200).json({
      agreement: {
        ...agreement.toObject(),
        content: agreementContent
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send signed agreement email with PDF attachment
const sendSignedAgreementEmail = async (email, name, pdfPath) => {
  const mailOptions = {
    from: {
      name: 'ATO Agreement System',
      address: process.env.EMAIL_USER || "bforboll81@gmail.com"
    },
    to: email,
    subject: 'Your Signed Agreement - Copy Attached',
    html: `
      <h2>Agreement Signed Successfully</h2>
      <p>Dear ${name},</p>
      <p>Thank you for signing the agreement. Please find your signed agreement document attached to this email.</p>
      <p>This document serves as proof of your digital signature and acceptance of the terms and conditions.</p>
      <p>Please keep this document for your records.</p>
      <p>Best regards,<br>The ATO Team</p>
    `,
    attachments: [
      {
        filename: `signed_agreement_${name.replace(/\s+/g, '_')}.pdf`,
        path: pdfPath
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Signed agreement email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send signed agreement email to ${email}:`, error.message);
    throw error;
  }
};

// Get user's signed agreement
exports.getUserSignedAgreement = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Check if user is requesting their own agreement or if admin
    if (requestingUserRole !== 'admin' && requestingUserId !== userId) {
      return res.status(403).json({ message: 'Access denied. You can only view your own agreement.' });
    }

    const signedAgreement = await SignedAgreement.findOne({ userId }).populate('userId', 'name email');

    if (!signedAgreement) {
      return res.status(404).json({ message: 'Signed agreement not found' });
    }

    res.status(200).json({
      agreement: {
        id: signedAgreement._id,
        content: signedAgreement.agreementContent,
        signature: signedAgreement.signature,
        signedAt: signedAgreement.signedAt,
        userName: signedAgreement.userName,
        userEmail: signedAgreement.userEmail,
        userMobileNumber: signedAgreement.userMobileNumber,
        pdfPath: signedAgreement.pdfPath
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send admin notification email
const sendAdminNotificationEmail = async (userName, userEmail) => {
  const adminEmail = process.env.ADMIN_EMAIL || "bforboll81@gmail.com";

  const mailOptions = {
    from: {
      name: 'ATO Agreement System',
      address: process.env.EMAIL_USER || "bforboll81@gmail.com"
    },
    to: adminEmail,
    subject: 'New Agreement Signed - Admin Notification',
    html: `
      <h2>New Agreement Signed</h2>
      <p>A new user has signed the agreement:</p>
      <ul>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Signed At:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>You can view all signed agreements in the admin dashboard.</p>
      <p>Best regards,<br>ATO System</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin notification email sent for user: ${userName}`);
  } catch (error) {
    console.error(`Failed to send admin notification email:`, error.message);
    throw error;
  }
};