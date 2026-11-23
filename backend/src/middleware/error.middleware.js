export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(error, req, res, next) {
  const status = error.statusCode || (error.name === 'ValidationError' ? 400 :
    error.name === 'CastError' ? 400 : error.code === 11000 ? 409 :
      error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500);
  const message = error.code === 11000 ? 'A record with that value already exists.' :
    error.name === 'ValidationError' ? Object.values(error.errors).map((item) => item.message).join(', ') :
      error.message || 'Internal server error.';
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message });
}
