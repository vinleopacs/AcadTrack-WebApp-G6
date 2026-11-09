const users = require('../models/users');
const { AppError, forbidden } = require('../utils/errors');

const loadUser = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await users.findById(req.session.userId);

      if (user && user.active) {
        req.user = user;
      } else {
        req.session.userId = null;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

const requireLogin = (req, res, next) =>
  req.user ? next() : next(new AppError('Please log in again.', 401));

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Please log in again.', 401));
  return roles.includes(req.user.role) ? next() : next(forbidden());
};

const jsonOnly = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.is('application/json')) {
    return next(new AppError('Requests must be JSON.', 415));
  }
  next();
};

module.exports = { loadUser, requireLogin, requireRole, jsonOnly };
