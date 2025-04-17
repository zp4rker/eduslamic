const express = require('express');
const router = express.Router();
const { User, ROLES } = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

/**
 * Get all users - Admin only
 * GET /users
 */
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Fetch all users using the findAll method
    const users = await User.findAll();
    
    // Retrieve and clear success and error messages from session
    const success = req.session.success;
    const error = req.session.error;
    req.session.success = null;
    req.session.error = null;

    res.render('users/index', { 
      title: 'User Management',
      user: req.session.user, 
      users,
      roles: ROLES,
      success,
      error,
      values: {}
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('users/index', { 
      title: 'User Management',
      user: req.session.user, 
      users: [],
      roles: ROLES,
      error: 'Failed to load users',
      values: {}
    });
  }
});

/**
 * Create new user - Admin only
 * POST /users/create
 */
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, phone, role, password, confirmPassword } = req.body;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      req.session.values = { name, email, phone, role };
      return res.redirect('/users');
    }

    // Validate password length
    if (password.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      req.session.values = { name, email, phone, role };
      return res.redirect('/users');
    }

    // Create user
    await User.create({ name, email, phone, role, password });

    req.session.success = 'User created successfully';
    res.redirect('/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.session.error = error.message || 'Failed to create user';
    req.session.values = req.body;
    res.redirect('/users');
  }
});

/**
 * Update user - Admin only
 * POST /users/edit/:id
 */
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, phone, role } = req.body;
    
    // Update user
    await User.updateProfile(userId, { name, email, phone, role });

    req.session.success = 'User updated successfully';
    res.redirect('/users');
  } catch (error) {
    console.error('Error updating user:', error);
    req.session.error = error.message || 'Failed to update user';
    res.redirect('/users');
  }
});

/**
 * Reset user password - Admin only
 * POST /users/reset-password/:id
 */
router.post('/reset-password/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword, confirmPassword } = req.body;
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      return res.redirect('/users');
    }

    // Validate password length
    if (newPassword.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      return res.redirect('/users');
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect('/users');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user document with new password
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    await User.db.put(user);

    req.session.success = 'Password reset successfully';
    res.redirect('/users');
  } catch (error) {
    console.error('Error resetting password:', error);
    req.session.error = error.message || 'Failed to reset password';
    res.redirect('/users');
  }
});

/**
 * Delete user - Admin only
 * POST /users/delete/:id
 */
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.session.user._id) {
      req.session.error = 'You cannot delete your own account';
      return res.redirect('/users');
    }
    
    // Get user document
    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect('/users');
    }
    
    // Delete the user
    await User.db.remove(user);

    req.session.success = 'User deleted successfully';
    res.redirect('/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.session.error = error.message || 'Failed to delete user';
    res.redirect('/users');
  }
});

module.exports = router;