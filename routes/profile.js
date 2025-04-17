const express = require('express');
const router = express.Router();
const { User, ROLES } = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * Get profile edit page
 * GET /profile/edit
 */
router.get('/edit', isAuthenticated, (req, res) => {
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
    
    res.redirect('/?success=User role updated successfully');
  } catch (error) {
    console.error('Role update error:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;