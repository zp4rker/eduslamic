const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * Register route
 * POST /auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;
    
    // Validate inputs
    if (!name || !email || !phone || !password) {
      return res.render('register', { 
        error: 'All fields are required',
        values: { name, email, phone }
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', { 
        error: 'Passwords do not match',
        values: { name, email, phone }
      });
    }
    
    // Create the user
    const user = await User.create({ name, email, phone, password });
    
    // Log the user in
    req.session.user = user;
    
    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { 
      error: error.message,
      values: { name: req.body.name, email: req.body.email, phone: req.body.phone }
    });
  }
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
 * Register page
 * GET /auth/register
 */
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('register', { values: {} });
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