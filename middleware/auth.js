// Shared authentication/authorization middleware
const { ROLES } = require('../models/User');

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === ROLES.ADMIN) {
    return next();
  }
  res.redirect('/');
}

module.exports = { isAuthenticated, isAdmin };