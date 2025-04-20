const express = require('express');
const router = express.Router();
const { User, ROLES } = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * Get profile page
 * GET /profile
 */
router.get('/', isAuthenticated, (req, res) => {
  // Retrieve success message from session and clear it
  const successMessage = req.session.success;
  delete req.session.success;

  // Retrieve error message from session and clear it
  const errorMessage = req.session.error;
  delete req.session.error;

  res.render('profile', {
    user: req.session.user,
    roles: ROLES,
    success: successMessage, // Pass session success message
    error: errorMessage // Pass session error message
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
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.session.error = error.message; // Store error in session
    res.redirect('/profile'); // Redirect without query param
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
      req.session.error = 'New password must be at least 6 characters'; // Store error in session
      return res.redirect('/profile'); // Redirect without query param
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      req.session.error = 'New passwords do not match'; // Store error in session
      return res.redirect('/profile'); // Redirect without query param
    }
    
    // Update password
    await User.updatePassword(userId, currentPassword, newPassword);
    
    req.session.success = 'Password updated successfully';
    res.redirect('/profile');
  } catch (error) {
    console.error('Password update error:', error);
    req.session.error = error.message; // Store error in session
    res.redirect('/profile'); // Redirect without query param
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
    req.session.error = error.message; // Store error in session
    res.redirect('/'); // Redirect without query param
  }
});

module.exports = router;