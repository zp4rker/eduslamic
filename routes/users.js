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

    res.render('admin/users/index', { // Updated path
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
    res.render('admin/users/index', { // Updated path
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
    const { name, email, phone, roles, password, confirmPassword } = req.body;
    
    // Ensure roles is an array and not empty
    const rolesArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    if (rolesArray.length === 0) {
      req.session.error = 'At least one role must be selected';
      req.session.values = { name, email, phone, roles: rolesArray }; // Pass back the (potentially empty) array
      return res.redirect('/admin/users');
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      req.session.values = { name, email, phone, roles: rolesArray };
      return res.redirect('/admin/users'); // Updated path
    }

    // Validate password length
    if (password.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      req.session.values = { name, email, phone, roles: rolesArray };
      return res.redirect('/admin/users'); // Updated path
    }

    // Create user with roles array
    await User.create({ name, email, phone, roles: rolesArray, password });

    req.session.success = 'User created successfully';
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.session.error = error.message || 'Failed to create user';
    // Ensure roles is passed back correctly even on error
    req.session.values = { ...req.body, roles: Array.isArray(req.body.roles) ? req.body.roles : (req.body.roles ? [req.body.roles] : []) };
    res.redirect('/admin/users');
  }
});

/**
 * Update user - Admin only
 * POST /users/edit/:id
 */
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, phone, roles } = req.body;
    
    // Ensure roles is an array and not empty
    const rolesArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    if (rolesArray.length === 0) {
      req.session.error = 'At least one role must be selected';
      // Redirect back, potentially losing other edits if not handled client-side or re-fetched
      return res.redirect('/admin/users'); 
    }

    // Update user with roles array
    await User.updateProfile(userId, { name, email, phone, roles: rolesArray });

    req.session.success = 'User updated successfully';
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    req.session.error = error.message || 'Failed to update user';
    res.redirect('/admin/users'); // Updated path
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
      return res.redirect('/admin/users'); // Updated path
    }

    // Validate password length
    if (newPassword.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      return res.redirect('/admin/users'); // Updated path
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users'); // Updated path
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user document with new password
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    await User.db.put(user);

    req.session.success = 'Password reset successfully';
    res.redirect('/admin/users'); // Updated path
  } catch (error) {
    console.error('Error resetting password:', error);
    req.session.error = error.message || 'Failed to reset password';
    res.redirect('/admin/users'); // Updated path
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
      return res.redirect('/admin/users'); // Updated path
    }
    
    // Get user document
    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users'); // Updated path
    }
    
    // Delete the user
    await User.db.remove(user);

    req.session.success = 'User deleted successfully';
    res.redirect('/admin/users'); // Updated path
  } catch (error) {
    console.error('Error deleting user:', error);
    req.session.error = error.message || 'Failed to delete user';
    res.redirect('/admin/users'); // Updated path
  }
});

module.exports = router;