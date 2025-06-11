const User = require('../models/User');
const Work = require('../models/Work');
const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "bforboll81@gmail.com",
    pass: "bpfflehyrjnoojoz"
  }
});

// Send deadline alert email
const sendDeadlineAlert = async (email, name, daysLeft) => {
  const mailOptions = {
    from: "bforboll81@gmail.com",
    to: email,
    subject: `Work Deadline Alert - ${daysLeft} days remaining`,
    html: `
      <h2>Work Deadline Alert</h2>
      <p>Dear ${name},</p>
      <p>This is a reminder that you have <strong>${daysLeft} days left</strong> to complete and submit your work.</p>
      <p>Please log in to your dashboard to continue working on your assignment.</p>
      <p>Best regards,<br>The Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send work start notification email to admin
const sendWorkStartNotificationEmail = async (workData) => {
  const { userName, userEmail, projectLink, password, timestamp } = workData;

  const mailOptions = {
    from: "bforboll81@gmail.com",
    to: "bforboll81@gmail.com", // Admin email
    subject: `🚀 Work Started - ${userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">🚀 New Work Started</h2>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">User Details:</h3>
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Started At:</strong> ${timestamp.toLocaleString()}</p>
        </div>
        <div style="background-color: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Project Details:</h3>
          <p><strong>Project Link:</strong> <a href="${projectLink}" target="_blank">${projectLink}</a></p>
          <p><strong>Password:</strong> <code style="background-color: #FEF3C7; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
        </div>
        <div style="background-color: #FEF2F2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #DC2626;"><strong>⏰ Reminder:</strong> User has 4 days to complete the work. Automatic penalty will be applied after deadline.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Start work
exports.startWork = async (req, res) => {
  try {
    const { projectLink, password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.workStartedAt) {
      return res.status(400).json({ message: 'Work already started' });
    }

    if (!projectLink || !password) {
      return res.status(400).json({ message: 'Project link and password are required' });
    }

    const startTimestamp = new Date();

    // Set work start time and project details
    user.workStartedAt = startTimestamp;
    user.projectLink = projectLink;
    await user.save();

    // Create or get work document
    let work = await Work.findOne({ userId: req.user.userId });
    if (!work) {
      work = new Work({
        userId: req.user.userId,
        startedAt: startTimestamp
      });
      await work.save();
    }

    // Send real-time notification to admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('work-started', {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        projectLink,
        password,
        timestamp: startTimestamp
      });
    }

    // Send email notification to admin
    try {
      await sendWorkStartNotificationEmail({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        projectLink,
        password,
        timestamp: startTimestamp
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError.message);
    }

    res.status(200).json({
      message: 'Work started successfully',
      work,
      startedAt: user.workStartedAt,
      projectLink: user.projectLink
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Save work draft
exports.saveDraft = async (req, res) => {
  try {
    const { content } = req.body;

    let work = await Work.findOne({ userId: req.user.userId });

    if (!work) {
      return res.status(404).json({ message: 'Work not found. Please start work first.' });
    }

    work.content = content;
    work.lastSaved = new Date();
    await work.save();

    res.status(200).json({
      message: 'Draft saved successfully',
      work
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get work draft
exports.getDraft = async (req, res) => {
  try {
    const work = await Work.findOne({ userId: req.user.userId });

    if (!work) {
      return res.status(404).json({ message: 'No work found' });
    }

    res.status(200).json({ work });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Submit work
exports.submitWork = async (req, res) => {
  try {
    const { content } = req.body;

    const user = await User.findById(req.user.userId);
    const work = await Work.findOne({ userId: req.user.userId });

    if (!user || !work) {
      return res.status(404).json({ message: 'User or work not found' });
    }

    if (user.workSubmitted) {
      return res.status(400).json({ message: 'Work already submitted' });
    }

    // Check if deadline passed
    const startDate = new Date(user.workStartedAt);
    const currentDate = new Date();
    const deadlineDate = new Date(startDate.getTime() + (4 * 24 * 60 * 60 * 1000));

    if (currentDate > deadlineDate) {
      user.isPenalized = true;
    }

    const submissionTime = new Date();

    // Update work and user
    work.content = content;
    work.isSubmitted = true;
    work.submittedAt = submissionTime;
    await work.save();

    user.workSubmitted = true;
    await user.save();

    // Schedule 24-hour penalty check
    const { scheduleAutoPenalty } = require('../services/automationService');
    scheduleAutoPenalty(user._id, submissionTime);

    res.status(200).json({
      message: 'Work submitted successfully! Your work will be reviewed in 24 hours.',
      work,
      isPenalized: user.isPenalized,
      submittedAt: submissionTime,
      reviewDeadline: new Date(submissionTime.getTime() + (24 * 60 * 60 * 1000))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check deadline and send alerts (to be called by cron job)
exports.checkDeadlines = async (req, res) => {
  try {
    const users = await User.find({
      workStartedAt: { $exists: true },
      workSubmitted: false,
      isPenalized: false
    });

    const currentDate = new Date();

    for (const user of users) {
      const startDate = new Date(user.workStartedAt);
      const deadlineDate = new Date(startDate.getTime() + (4 * 24 * 60 * 60 * 1000));
      const timeRemaining = deadlineDate - currentDate;
      const daysLeft = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));

      // Send alerts for 3, 2, 1 days left
      if (daysLeft === 3 || daysLeft === 2 || daysLeft === 1) {
        await sendDeadlineAlert(user.email, user.name, daysLeft);
      }

      // Auto-penalize if deadline passed
      if (daysLeft <= 0) {
        user.isPenalized = true;
        await user.save();
      }
    }

    res.status(200).json({ message: 'Deadline check completed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
