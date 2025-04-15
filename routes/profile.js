const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

/**
 * Get profile edit page
 * GET /profile/edit
 */
router.get('/edit', isAuthenticated, (req, res) => {
  res.render('profile', {
    user: req.session.user,
    success: req.query.success,
    error: req.query.error
  });
});

/**
 * Update profile information
 * POST /profile/update
 */
router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session.user._id;
    
    // Update user profile
    const updatedUser = await User.updateProfile(userId, { name, email, phone });
    
    // Update session with new user data
    req.session.user = updatedUser;
    
    res.redirect('/profile/edit?success=Profile updated successfully');
  } catch (error) {
    console.error('Profile update error:', error);
    res.redirect(`/profile/edit?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Change password
 * POST /profile/password
 */
router.post('/password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user._id;
    
    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.redirect('/profile/edit?error=New password must be at least 6 characters');
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.redirect('/profile/edit?error=New passwords do not match');
    }
    
    // Update password
    await User.updatePassword(userId, currentPassword, newPassword);
    
    res.redirect('/profile/edit?success=Password updated successfully');
  } catch (error) {
    console.error('Password update error:', error);
    res.redirect(`/profile/edit?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;