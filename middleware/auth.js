// Shared authentication/authorization middleware
const { ROLES } = require('../models/User');

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  // Check if user exists, has roles array, and includes ADMIN role
  if (req.session.user && Array.isArray(req.session.user.roles) && req.session.user.roles.includes(ROLES.ADMIN)) {
    return next();
  }
  // Optionally add a flash message for unauthorized access
  // req.flash('error', 'You do not have permission to access this page.');
  res.redirect('/'); // Redirect non-admins
}

module.exports = { isAuthenticated, isAdmin };