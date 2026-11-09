class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const invalid = message => new AppError(message, 400);
const forbidden = (message = 'You are not allowed to do that.') => new AppError(message, 403);
const notFound = (message = 'Not found.') => new AppError(message, 404);

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const required = (...values) => {
  if (!values.every(v => String(v ?? '').trim())) {
    throw invalid('This is a required field.');
  }
};

module.exports = { AppError, invalid, forbidden, notFound, wrap, required };
