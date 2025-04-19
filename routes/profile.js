const express = require('express');
const router = express.Router();
const { User, ROLES } = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * Get profile page
 * GET /profile
 */
router.get('/', isAuthenticated, (req, res) => {
  res.render('profile', {
    user: req.session.user,
    roles: ROLES,
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
    
    req.session.success = 'Profile updated successfully';
    res.redirect('/profile'); // Changed redirect from /profile/edit
  } catch (error) {
    console.error('Profile update error:', error);
    res.redirect(`/profile?error=${encodeURIComponent(error.message)}`); // Changed redirect from /profile/edit
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
      return res.redirect('/profile?error=New password must be at least 6 characters'); // Changed redirect from /profile/edit
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.redirect('/profile?error=New passwords do not match'); // Changed redirect from /profile/edit
    }
    
    // Update password
    await User.updatePassword(userId, currentPassword, newPassword);
    
    req.session.success = 'Password updated successfully';
    res.redirect('/profile'); // Changed redirect from /profile/edit
  } catch (error) {
    console.error('Password update error:', error);
    res.redirect(`/profile?error=${encodeURIComponent(error.message)}`); // Changed redirect from /profile/edit
  }
});

/**
 * Admin only: Update user role
 * POST /profile/role/:userId
 */
router.post('/role/:userId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.userId;
    
    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Update user role
    const updatedUser = await User.updateProfile(userId, { role });
    
    // If updating own role, update session
    if (userId === req.session.user._id) {
      req.session.user = updatedUser;
    }
    
    req.session.success = 'User role updated successfully';
    res.redirect('/');
  } catch (error) {
    console.error('Role update error:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;