const cron = require('node-cron');
const User = require('../models/User');
const Work = require('../models/Work');
const nodemailer = require('nodemailer');
const { generatePenaltyReportPDF } = require('./pdfService');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || "bforboll81@gmail.com",
    pass: process.env.EMAIL_PASS || "bpfflehyrjnoojoz"
  }
});

// Send penalization notification email with PDF report
const sendPenalizationEmail = async (email, name, reason, user = null, penaltyDetails = {}) => {
  let mailOptions = {
    from: {
      name: 'ATO Penalty System',
      address: process.env.EMAIL_USER || "bforboll81@gmail.com"
    },
    to: email,
    subject: 'Work Penalized - Action Required',
    html: `
      <h2>Work Penalization Notice</h2>
      <p>Dear ${name},</p>
      <p>Your work has been marked as penalized due to: <strong>${reason}</strong></p>
      <p>Please find the detailed penalty report attached to this email.</p>
      <p>Please contact the administrator for more information if needed.</p>
      <p>Best regards,<br>The ATO Team</p>
    `
  };

  // Generate PDF report if user data is provided
  if (user) {
    try {
      const pdfResult = await generatePenaltyReportPDF(user, { reason, ...penaltyDetails });

      mailOptions.attachments = [
        {
          filename: `penalty_report_${name.replace(/\s+/g, '_')}.pdf`,
          path: pdfResult.filePath
        }
      ];

      console.log(`Penalty report PDF generated: ${pdfResult.fileName}`);
    } catch (pdfError) {
      console.error(`Failed to generate penalty report PDF for ${email}:`, pdfError.message);
      // Continue with email without PDF if generation fails
    }
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Penalization email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send penalization email to ${email}:`, error.message);
  }
};

// Auto-penalize users 24 hours after work submission
const autoPenalizeAfter24Hours = async () => {
  try {
    console.log('Running 24-hour auto-penalization check...');

    // Find all submitted work that hasn't been auto-penalized yet
    const submittedWorks = await Work.find({
      isSubmitted: true,
      isAutoPenalized: false,
      submittedAt: { $exists: true }
    }).populate('userId');

    const currentTime = new Date();
    let penalizedCount = 0;

    for (const work of submittedWorks) {
      const submissionTime = new Date(work.submittedAt);
      const timeDifference = currentTime - submissionTime;
      const hoursPassed = timeDifference / (1000 * 60 * 60); // Convert to hours

      // If 24 hours have passed since submission
      if (hoursPassed >= 24) {
        const user = work.userId;

        // Update user as penalized
        user.isPenalized = true;
        user.penalizedAt = new Date();
        user.penalizedReason = 'auto_24h_after_submission';
        await user.save();

        // Update work as auto-penalized
        work.isAutoPenalized = true;
        work.autoPenalizedAt = new Date();
        await work.save();

        // Send notification email with PDF report
        await sendPenalizationEmail(
          user.email,
          user.name,
          '24 hours have passed since work submission',
          user,
          { submittedAt: work.submittedAt }
        );

        penalizedCount++;
        console.log(`Auto-penalized user: ${user.name} (${user.email})`);
      }
    }

    console.log(`Auto-penalization check completed. ${penalizedCount} users penalized.`);
  } catch (error) {
    console.error('Error in auto-penalization process:', error.message);
  }
};

// Check for deadline violations (existing functionality enhanced)
const checkDeadlineViolations = async () => {
  try {
    console.log('Running deadline violation check...');

    const users = await User.find({
      workStartedAt: { $exists: true },
      workSubmitted: false,
      isPenalized: false
    });

    const currentDate = new Date();
    let violationCount = 0;

    for (const user of users) {
      const startDate = new Date(user.workStartedAt);
      const deadlineDate = new Date(startDate.getTime() + (4 * 24 * 60 * 60 * 1000)); // 4 days

      // If deadline has passed
      if (currentDate > deadlineDate) {
        user.isPenalized = true;
        user.penalizedAt = new Date();
        user.penalizedReason = 'deadline_exceeded';
        await user.save();

        await sendPenalizationEmail(
          user.email,
          user.name,
          'work deadline exceeded',
          user
        );

        violationCount++;
        console.log(`Deadline violation penalized: ${user.name} (${user.email})`);
      }
    }

    console.log(`Deadline check completed. ${violationCount} users penalized for deadline violations.`);
  } catch (error) {
    console.error('Error in deadline violation check:', error.message);
  }
};

// Initialize automation services
const initializeAutomation = () => {
  console.log('Initializing automation services...');

  // Run auto-penalization check every hour
  cron.schedule('0 * * * *', () => {
    console.log('Running hourly automation checks...');
    autoPenalizeAfter24Hours();
    checkDeadlineViolations();
  });

  // Run a comprehensive check every day at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily comprehensive automation check...');
    autoPenalizeAfter24Hours();
    checkDeadlineViolations();
  });

  console.log('Automation services initialized successfully');
};

// Schedule individual user penalty after 24 hours
const scheduleAutoPenalty = (userId, submissionTime) => {
  const penaltyTime = new Date(submissionTime.getTime() + (24 * 60 * 60 * 1000));
  const delay = penaltyTime.getTime() - Date.now();

  if (delay > 0) {
    setTimeout(async () => {
      try {
        const user = await User.findById(userId);
        const work = await Work.findOne({ userId });

        if (user && work && work.isSubmitted && !work.isAutoPenalized) {
          // Update user as penalized
          user.isPenalized = true;
          user.penalizedAt = new Date();
          user.penalizedReason = 'auto_24h_after_submission';
          await user.save();

          // Update work as auto-penalized
          work.isAutoPenalized = true;
          work.autoPenalizedAt = new Date();
          await work.save();

          // Send notification email
          await sendPenalizationEmail(
            user.email,
            user.name,
            '24 hours have passed since work submission',
            user,
            { submittedAt: work.submittedAt }
          );

          console.log(`Scheduled penalty applied to user: ${user.name} (${user.email})`);
        }
      } catch (error) {
        console.error('Error in scheduled penalty application:', error.message);
      }
    }, delay);

    console.log(`Penalty scheduled for user ${userId} at ${penaltyTime.toLocaleString()}`);
  }
};

module.exports = {
  initializeAutomation,
  autoPenalizeAfter24Hours,
  checkDeadlineViolations,
  sendPenalizationEmail,
  scheduleAutoPenalty
};
