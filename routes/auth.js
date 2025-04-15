const express = require('express');
const router = express.Router();
const { User, ROLES } = require('../models/User');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === ROLES.ADMIN) {
    return next();
  }
  res.redirect('/');
};

/**
 * Register route - Admin only
 * POST /auth/register
 */
router.post('/register', isAdmin, async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role } = req.body;
    
    // Validate inputs
    if (!name || !email || !phone || !password) {
      return res.render('register', { 
        error: 'All fields are required',
        values: { name, email, phone, role },
        isAdmin: true
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', { 
        error: 'Passwords do not match',
        values: { name, email, phone, role },
        isAdmin: true
      });
    }

    // Validate role
    let selectedRole = role || ROLES.PARENT;
    
    // Create the user with role
    const user = await User.create({ 
      name, 
      email, 
      phone, 
      password,
      role: selectedRole
    });
    
    // Redirect to dashboard with success message
    res.redirect('/?success=User created successfully');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { 
      error: error.message,
      values: { 
        name: req.body.name, 
        email: req.body.email, 
        phone: req.body.phone,
        role: req.body.role 
      },
      isAdmin: true
    });
  }
});

/**
 * User creation page - Admin only
 * GET /auth/register
 */
router.get('/register', isAdmin, (req, res) => {
  res.render('register', { 
    values: {},
    isAdmin: true
  });
});

/**
 * Admin user creation page
 * GET /auth/register-admin
 */
router.get('/register-admin', isAdmin, (req, res) => {
  res.render('register', { 
    values: {},
    isAdmin: true
  });
});

/**
 * Login route
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.render('login', { 
        error: 'Email and password are required',
        values: { email }
      });
    }
    
    // Authenticate the user
    const user = await User.authenticate(email, password);
    
    if (!user) {
      return res.render('login', { 
        error: 'Invalid email or password',
        values: { email }
      });
    }
    
    // Log the user in
    req.session.user = user;
    
    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { 
      error: 'An error occurred during login',
      values: { email: req.body.email }
    });
  }
});

/**
 * Logout route
 * GET /auth/logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Logout error:', error);
    }
    res.redirect('/');
  });
});

/**
 * Login page
 * GET /auth/login
 */
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { values: {} });
});

module.exports = router;