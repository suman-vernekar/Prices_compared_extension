/**
 * PricePulse - Centralized Error Handler Middleware
 * Conforms strictly to standardized API error contract:
 * { success: false, error: { code, message } }
 * Protects internal implementation and suppresses stack traces in production.
 */

class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected server error occurred.';

  // Handle Mongoose / MongoDB Specific Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((val) => val.message);
    message = messages.join('. ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_RESOURCE_ID';
    message = `Resource not found with format: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate resource already exists for ${field}.`;
  }

  // Structured response conforming to Section 27
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };

  // Only attach debug details in non-production environments
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { ApiError, errorHandler };
