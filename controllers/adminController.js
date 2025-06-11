const User = require('../models/User');
const Work = require('../models/Work');
const Agreement = require('../models/Agreement');
const SignedAgreement = require('../models/SignedAgreement');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "bforboll81@gmail.com",
    pass: "bpfflehyrjnoojoz"
  }
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: "bforboll81@gmail.com",
    to: email,
    subject: 'Email Verification OTP',
    html: `<p>Your OTP for email verification is: <strong>${otp}</strong></p>`
  };

  await transporter.sendMail(mailOptions);
};

// Send agreement link
const sendAgreementLink = async (email, token) => {
  const agreementLink = `${process.env.FRONTEND_URL}/sign-agreement/${token}`;

  const mailOptions = {
    from: "bforboll81@gmail.com",
    to: email,
    subject: 'Sign Agreement',
    html: `<p>Please sign the agreement by clicking on this link: <a href="${agreementLink}">Sign Agreement</a></p>`
  };

  await transporter.sendMail(mailOptions);
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    // Get work data for each user
    const usersWithWork = await Promise.all(users.map(async (user) => {
      const work = await Work.findOne({ userId: user._id });
      return {
        ...user.toObject(),
        work: work || null
      };
    }));

    res.status(200).json({ users: usersWithWork });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const { name, email, mobileNumber, alternativeMobileNumber, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      mobileNumber,
      alternativeMobileNumber,
      password,
      role: role || 'user',
      otp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    await newUser.save();

    // Send OTP
    await sendOTP(email, otp);

    res.status(201).json({
      message: 'User created successfully. OTP sent to email.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, mobileNumber, alternativeMobileNumber, role, isVerified, isSignedAgreement, isPenalized, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.alternativeMobileNumber = alternativeMobileNumber || user.alternativeMobileNumber;
    user.role = role || user.role;

    // Update password if provided
    if (password) {
      user.password = password;
    }

    if (typeof isVerified === 'boolean') user.isVerified = isVerified;
    if (typeof isSignedAgreement === 'boolean') user.isSignedAgreement = isSignedAgreement;
    if (typeof isPenalized === 'boolean') {
      user.isPenalized = isPenalized;
      if (isPenalized && !user.penalizedAt) {
        user.penalizedAt = new Date();
        user.penalizedReason = 'manual';
      } else if (!isPenalized) {
        user.penalizedAt = null;
        user.penalizedReason = null;
      }
    }

    await user.save();

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isSignedAgreement: user.isSignedAgreement,
        isPenalized: user.isPenalized
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's work as well
    await Work.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send OTP manually
exports.sendOTPManually = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    // Send OTP
    await sendOTP(user.email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send agreement link manually
exports.sendAgreementLinkManually = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate token for agreement signing
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send agreement link and OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    await sendAgreementLink(user.email, token);
    await sendOTP(user.email, otp);

    res.status(200).json({ message: 'Agreement link and OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all agreements
exports.getAllAgreements = async (req, res) => {
  try {
    const agreements = await Agreement.find().sort({ version: -1 });
    res.status(200).json({ agreements });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new agreement
exports.createAgreement = async (req, res) => {
  try {
    const { content } = req.body;

    // Get the latest version number
    const latestAgreement = await Agreement.findOne().sort({ version: -1 });
    const newVersion = latestAgreement ? latestAgreement.version + 1 : 1;

    const newAgreement = new Agreement({
      content,
      version: newVersion
    });

    await newAgreement.save();

    res.status(201).json({
      message: 'Agreement created successfully',
      agreement: newAgreement
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update agreement
exports.updateAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { content } = req.body;

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    agreement.content = content;
    await agreement.save();

    res.status(200).json({
      message: 'Agreement updated successfully',
      agreement
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete agreement
exports.deleteAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    await Agreement.findByIdAndDelete(agreementId);

    res.status(200).json({ message: 'Agreement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const verifiedUsers = await User.countDocuments({ role: 'user', isVerified: true });
    const signedUsers = await User.countDocuments({ role: 'user', isSignedAgreement: true });
    const workingUsers = await User.countDocuments({ role: 'user', workStartedAt: { $exists: true }, workSubmitted: false });
    const submittedUsers = await User.countDocuments({ role: 'user', workSubmitted: true });
    const penalizedUsers = await User.countDocuments({ role: 'user', isPenalized: true });

    res.status(200).json({
      stats: {
        totalUsers,
        verifiedUsers,
        signedUsers,
        workingUsers,
        submittedUsers,
        penalizedUsers
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user password (admin only)
exports.getUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name email password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      userId: user._id,
      name: user.name,
      email: user.email,
      password: user.password
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Manually penalize user
exports.penalizeUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isPenalized = true;
    user.penalizedAt = new Date();
    user.penalizedReason = reason || 'manual';
    await user.save();

    // Send notification email with PDF report
    const { sendPenalizationEmail } = require('../services/automationService');
    await sendPenalizationEmail(user.email, user.name, reason || 'manual penalization by admin', user);

    res.status(200).json({
      message: 'User penalized successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPenalized: user.isPenalized,
        penalizedAt: user.penalizedAt,
        penalizedReason: user.penalizedReason
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove penalty from user
exports.removePenalty = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isPenalized = false;
    user.penalizedAt = null;
    user.penalizedReason = null;
    await user.save();

    res.status(200).json({
      message: 'Penalty removed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPenalized: user.isPenalized
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user work content
exports.getUserWork = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name email workStartedAt workSubmitted');
    const work = await Work.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        workStartedAt: user.workStartedAt,
        workSubmitted: user.workSubmitted
      },
      work: work || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get detailed user data for admin panel
exports.getDetailedUserData = async (req, res) => {
  try {
    // Get users by category
    const signedAgreements = await User.find({
      role: 'user',
      isSignedAgreement: true
    }).select('name email signature isVerified workStartedAt workSubmitted isPenalized penalizedAt createdAt');

    const verifiedUsers = await User.find({
      role: 'user',
      isVerified: true
    }).select('name email isSignedAgreement workStartedAt workSubmitted isPenalized penalizedAt createdAt');

    const activeUsers = await User.find({
      role: 'user',
      workStartedAt: { $exists: true },
      workSubmitted: false,
      isPenalized: false
    }).select('name email workStartedAt isVerified isSignedAgreement createdAt');

    const submittedWork = await User.find({
      role: 'user',
      workSubmitted: true
    }).populate({
      path: '_id',
      select: 'name email workStartedAt submittedAt'
    });

    // Get work data for submitted users
    const submittedWorkWithContent = await Promise.all(
      submittedWork.map(async (user) => {
        const work = await Work.findOne({ userId: user._id });
        return {
          ...user.toObject(),
          work: work || null
        };
      })
    );

    const penalizedWork = await User.find({
      role: 'user',
      isPenalized: true
    }).select('name email isPenalized penalizedAt penalizedReason workStartedAt workSubmitted createdAt');

    res.status(200).json({
      signedAgreements,
      verifiedUsers,
      activeUsers,
      submittedWork: submittedWorkWithContent,
      penalizedWork
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Trigger automation manually
exports.triggerAutomation = async (req, res) => {
  try {
    const { autoPenalizeAfter24Hours, checkDeadlineViolations } = require('../services/automationService');

    // Run both automation functions
    await autoPenalizeAfter24Hours();
    await checkDeadlineViolations();

    res.status(200).json({ message: 'Automation triggered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all signed agreements
exports.getAllSignedAgreements = async (req, res) => {
  try {
    const signedAgreements = await SignedAgreement.find()
      .populate('userId', 'name email mobileNumber')
      .populate('agreementId', 'version')
      .sort({ signedAt: -1 });

    res.status(200).json({ signedAgreements });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get specific signed agreement
exports.getSignedAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;

    const signedAgreement = await SignedAgreement.findById(agreementId)
      .populate('userId', 'name email mobileNumber')
      .populate('agreementId', 'version');

    if (!signedAgreement) {
      return res.status(404).json({ message: 'Signed agreement not found' });
    }

    res.status(200).json({ signedAgreement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send signed agreement PDF to user manually
exports.sendSignedAgreementPDF = async (req, res) => {
  try {
    const { agreementId } = req.params;

    const signedAgreement = await SignedAgreement.findById(agreementId)
      .populate('userId', 'name email');

    if (!signedAgreement) {
      return res.status(404).json({ message: 'Signed agreement not found' });
    }

    if (!signedAgreement.pdfPath) {
      return res.status(404).json({ message: 'PDF file not found for this agreement' });
    }

    // Check if PDF file exists
    try {
      await fs.access(signedAgreement.pdfPath);
    } catch (fileError) {
      return res.status(404).json({ message: 'PDF file not found on server' });
    }

    // Send email with PDF attachment
    const mailOptions = {
      from: {
        name: 'ATO Agreement System',
        address: process.env.EMAIL_USER || "bforboll81@gmail.com"
      },
      to: signedAgreement.userEmail,
      subject: 'Your Signed Agreement - Requested Copy',
      html: `
        <h2>Signed Agreement Copy</h2>
        <p>Dear ${signedAgreement.userName},</p>
        <p>As requested, please find your signed agreement document attached to this email.</p>
        <p>This document was originally signed on ${new Date(signedAgreement.signedAt).toLocaleString()}.</p>
        <p>Best regards,<br>The ATO Team</p>
      `,
      attachments: [
        {
          filename: `signed_agreement_${signedAgreement.userName.replace(/\s+/g, '_')}.pdf`,
          path: signedAgreement.pdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: `Signed agreement PDF sent to ${signedAgreement.userName} successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};