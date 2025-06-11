const User = require('../models/User');
const Work = require('../models/Work');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -otp');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, mobileNumber, alternativeMobileNumber } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.name = name || user.name;
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.alternativeMobileNumber = alternativeMobileNumber || user.alternativeMobileNumber;
    
    await user.save();
    
    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        alternativeMobileNumber: user.alternativeMobileNumber,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -otp');
    const work = await Work.findOne({ userId: req.user.userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate work status
    let workStatus = 'not_started';
    let timeRemaining = null;
    let daysLeft = null;
    
    if (user.workStartedAt) {
      const startDate = new Date(user.workStartedAt);
      const currentDate = new Date();
      const deadlineDate = new Date(startDate.getTime() + (4 * 24 * 60 * 60 * 1000)); // 4 days
      
      if (user.workSubmitted) {
        workStatus = 'submitted';
      } else if (currentDate > deadlineDate) {
        workStatus = 'overdue';
        if (!user.isPenalized) {
          // Auto-penalize user
          user.isPenalized = true;
          await user.save();
        }
      } else {
        workStatus = 'in_progress';
        timeRemaining = deadlineDate - currentDate;
        daysLeft = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));
      }
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workStartedAt: user.workStartedAt,
        workSubmitted: user.workSubmitted,
        isPenalized: user.isPenalized
      },
      work: work || null,
      workStatus,
      daysLeft,
      timeRemaining
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
