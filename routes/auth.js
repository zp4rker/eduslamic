const express = require('express');
const router = express.Router();
const { User, ROLES } = require('../models/User');
const { isAdmin } = require('../middleware/auth');

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
        values: { email },
        layout: 'layouts/minimal'
      });
    }
    
    // Authenticate the user
    const user = await User.authenticate(email, password);
    
    if (!user) {
      return res.render('login', { 
        error: 'Invalid email or password',
        values: { email },
        layout: 'layouts/minimal'
      });
    }
    
    // Log the user in
    req.session.user = user;
    
    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { 
      error: 'An error occurred during login',
      values: { email: req.body.email },
      layout: 'layouts/minimal'
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
  res.render('login', { values: {}, layout: 'layouts/minimal' });
});

module.exports = router;