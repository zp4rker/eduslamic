const express = require('express');
const router = express.Router();
const { User, ROLES, db } = require('../../models/User'); // Corrected path, added db import
const { isAuthenticated, isAdmin } = require('../../middleware/auth'); // Corrected path
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
 * GET route to display the add user page - Admin only
 * GET /users/add
 */
router.get('/add', isAuthenticated, isAdmin, (req, res) => {
  // Retrieve and clear potential error/values from session (e.g., from failed POST)
  const error = req.session.error;
  const values = req.session.values;
  req.session.error = null;
  req.session.values = null;

  res.render('admin/users/add', { // Render the new add page
    title: 'Add New User',
    user: req.session.user,
    allRoles: Object.values(ROLES), // Pass all available roles
    error: error, // Pass error from session if exists
    values: values || {}, // Pass values from session or empty object
    // csrfToken: req.csrfToken() // Optional: Add CSRF token if using csurf
  });
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
      // Redirect back to the add page on error
      return res.redirect('/admin/users/add');
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      req.session.values = { name, email, phone, roles: rolesArray };
      // Redirect back to the add page on error
      return res.redirect('/admin/users/add');
    }

    // Validate password length
    if (password.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      req.session.values = { name, email, phone, roles: rolesArray };
      // Redirect back to the add page on error
      return res.redirect('/admin/users/add');
    }

    // Create user with roles array
    await User.create({ name, email, phone, roles: rolesArray, password });

    req.session.success = 'User created successfully';
    // Redirect to the user list on success
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.session.error = error.message || 'Failed to create user';
    // Ensure roles is passed back correctly even on error
    req.session.values = { ...req.body, roles: Array.isArray(req.body.roles) ? req.body.roles : (req.body.roles ? [req.body.roles] : []) };
    // Redirect back to the add page on error
    res.redirect('/admin/users/add');
  }
});

/**
 * GET route to display the edit user page - Admin only
 * GET /users/edit/:id
 */
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const userToEdit = await User.findById(userId);

    if (!userToEdit) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users');
    }

    // Retrieve and clear potential error/values from session (e.g., from failed POST)
    const error = req.session.error;
    const values = req.session.values;
    req.session.error = null;
    req.session.values = null;

    res.render('admin/users/edit', { // Render the new edit page
      title: `Edit User: ${userToEdit.name}`,
      user: req.session.user,
      userToEdit,
      allRoles: Object.values(ROLES), // Pass all available roles
      error: error, // Pass error from session if exists
      values: values || userToEdit, // Pass values from session or user data
      // csrfToken: req.csrfToken() // Optional: Add CSRF token if using csurf
    });

  } catch (error) {
    console.error('Error fetching user for edit page:', error);
    req.session.error = 'Failed to load user data for editing.';
    res.redirect('/admin/users');
  }
});

/**
 * Update user - Admin only
 * POST /users/edit/:id
 */
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  const userId = req.params.id; // Get userId here for use in catch block
  try {
    const { name, email, phone, roles } = req.body;
    
    // Ensure roles is an array and not empty
    const rolesArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    if (rolesArray.length === 0) {
      req.session.error = 'At least one role must be selected';
      req.session.values = req.body; // Pass back submitted values
      // Redirect back to the edit page for this specific user
      return res.redirect(`/admin/users/edit/${userId}`); 
    }

    // Basic validation for name and email (add more as needed)
     if (!name || !email) {
      req.session.error = 'Name and Email are required.';
      req.session.values = req.body;
      return res.redirect(`/admin/users/edit/${userId}`);
    }

    // Update user with roles array
    await User.updateProfile(userId, { name, email, phone, roles: rolesArray });

    req.session.success = 'User updated successfully';
    res.redirect('/admin/users'); // Redirect to the user list on success
  } catch (error) {
    console.error('Error updating user:', error);
    req.session.error = error.message || 'Failed to update user';
    req.session.values = req.body; // Pass back submitted values on error
    res.redirect(`/admin/users/edit/${userId}`); // Redirect back to the edit page on error
  }
});

/**
 * GET route to display the reset password page - Admin only
 * GET /users/reset-password/:id
 */
router.get('/reset-password/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const userToReset = await User.findById(userId);

    if (!userToReset) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users');
    }

    // Retrieve and clear potential error from session (e.g., from failed POST)
    const error = req.session.error;
    req.session.error = null;

    res.render('admin/users/reset-password', {
      title: `Reset Password for ${userToReset.name}`,
      user: req.session.user,
      userToReset,
      error: error, // Pass error from session if exists
      // csrfToken: req.csrfToken() // Optional: Add CSRF token if using csurf
    });

  } catch (error) {
    console.error('Error fetching user for reset password page:', error);
    req.session.error = 'Failed to load user data for password reset.';
    res.redirect('/admin/users');
  }
});

/**
 * Reset user password - Admin only
 * POST /users/reset-password/:id
 */
router.post('/reset-password/:id', isAuthenticated, isAdmin, async (req, res) => {
  const userId = req.params.id; // Get userId for use in redirects
  try {
    const { newPassword, confirmPassword } = req.body;
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      // Redirect back to the reset password page for this user
      return res.redirect(`/admin/users/reset-password/${userId}`); 
    }

    // Validate password length
    if (newPassword.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      // Redirect back to the reset password page for this user
      return res.redirect(`/admin/users/reset-password/${userId}`); 
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      // Redirect back to the reset password page for this user (though unlikely)
      return res.redirect(`/admin/users/reset-password/${userId}`); 
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user document with new password
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    await User.db.put(user);

    req.session.success = 'Password reset successfully';
    res.redirect('/admin/users'); // Redirect to user list on success
  } catch (error) {
    console.error('Error resetting password:', error);
    req.session.error = error.message || 'Failed to reset password';
    // Redirect back to the reset password page for this user on error
    res.redirect(`/admin/users/reset-password/${userId}`); 
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
    await db.remove(user); // Use the imported db object directly

    req.session.success = 'User deleted successfully';
    res.redirect('/admin/users'); // Updated path
  } catch (error) {
    console.error('Error deleting user:', error);
    req.session.error = error.message || 'Failed to delete user';
    res.redirect('/admin/users'); // Updated path
  }
});

module.exports = router;