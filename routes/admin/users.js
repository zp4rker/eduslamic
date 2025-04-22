const express = require('express');
const router = express.Router();
const { User, ROLES, db } = require('../../models/User');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    const success = req.session.success;
    const error = req.session.error;
    req.session.success = null;
    req.session.error = null;

    res.render('admin/users/index', {
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
    res.render('admin/users/index', {
      title: 'User Management',
      user: req.session.user, 
      users: [],
      roles: ROLES,
      error: 'Failed to load users',
      values: {}
    });
  }
});

router.get('/add', isAuthenticated, isAdmin, (req, res) => {
  const error = req.session.error;
  const values = req.session.values;
  req.session.error = null;
  req.session.values = null;

  res.render('admin/users/add', {
    title: 'Add New User',
    user: req.session.user,
    allRoles: Object.values(ROLES),
    error: error,
    values: values || {},
  });
});

router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, phone, roles, password, confirmPassword } = req.body;
    const rolesArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    if (rolesArray.length === 0) {
      req.session.error = 'At least one role must be selected';
      req.session.values = { name, email, phone, roles: rolesArray };
      return res.redirect('/admin/users/add');
    }

    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      req.session.values = { name, email, phone, roles: rolesArray };
      return res.redirect('/admin/users/add');
    }

    if (password.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      req.session.values = { name, email, phone, roles: rolesArray };
      return res.redirect('/admin/users/add');
    }

    await User.create({ name, email, phone, roles: rolesArray, password });

    req.session.success = 'User created successfully';
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.session.error = error.message || 'Failed to create user';
    req.session.values = { ...req.body, roles: Array.isArray(req.body.roles) ? req.body.roles : (req.body.roles ? [req.body.roles] : []) };
    res.redirect('/admin/users/add');
  }
});

router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const userToEdit = await User.findById(userId);

    if (!userToEdit) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users');
    }

    const error = req.session.error;
    const values = req.session.values;
    req.session.error = null;
    req.session.values = null;

    res.render('admin/users/edit', {
      title: `Edit User: ${userToEdit.name}`,
      user: req.session.user,
      userToEdit,
      allRoles: Object.values(ROLES),
      error: error,
      values: values || userToEdit,
    });

  } catch (error) {
    console.error('Error fetching user for edit page:', error);
    req.session.error = 'Failed to load user data for editing.';
    res.redirect('/admin/users');
  }
});

router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const { name, email, phone, roles } = req.body;
    const rolesArray = Array.isArray(roles) ? roles : (roles ? [roles] : []);
    if (rolesArray.length === 0) {
      req.session.error = 'At least one role must be selected';
      req.session.values = req.body;
      return res.redirect(`/admin/users/edit/${userId}`); 
    }

    if (!name || !email) {
      req.session.error = 'Name and Email are required.';
      req.session.values = req.body;
      return res.redirect(`/admin/users/edit/${userId}`);
    }

    await User.updateProfile(userId, { name, email, phone, roles: rolesArray });

    req.session.success = 'User updated successfully';
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    req.session.error = error.message || 'Failed to update user';
    req.session.values = req.body;
    res.redirect(`/admin/users/edit/${userId}`);
  }
});

router.get('/reset-password/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const userToReset = await User.findById(userId);

    if (!userToReset) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users');
    }

    const error = req.session.error;
    req.session.error = null;

    res.render('admin/users/reset-password', {
      title: `Reset Password for ${userToReset.name}`,
      user: req.session.user,
      userToReset,
      error: error,
    });

  } catch (error) {
    console.error('Error fetching user for reset password page:', error);
    req.session.error = 'Failed to load user data for password reset.';
    res.redirect('/admin/users');
  }
});

router.post('/reset-password/:id', isAuthenticated, isAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const { newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      req.session.error = 'Passwords do not match';
      return res.redirect(`/admin/users/reset-password/${userId}`); 
    }

    if (newPassword.length < 6) {
      req.session.error = 'Password must be at least 6 characters';
      return res.redirect(`/admin/users/reset-password/${userId}`); 
    }

    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect(`/admin/users/reset-password/${userId}`); 
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    await User.db.put(user);

    req.session.success = 'Password reset successfully';
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error resetting password:', error);
    req.session.error = error.message || 'Failed to reset password';
    res.redirect(`/admin/users/reset-password/${userId}`); 
  }
});

router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.session.user._id) {
      req.session.error = 'You cannot delete your own account';
      return res.redirect('/admin/users');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect('/admin/users');
    }
    
    await db.remove(user);

    req.session.success = 'User deleted successfully';
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.session.error = error.message || 'Failed to delete user';
    res.redirect('/admin/users');
  }
});

module.exports = router;