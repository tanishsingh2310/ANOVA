
function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : Number.isInteger(err.status) &&
          err.status >= 400 &&
          err.status <= 599
        ? err.status
        : 500;

  if (statusCode >= 500) {
    console.error("Internal server error:", err.message);
  }

  return res.status(statusCode).json({
    message:
      statusCode >= 500
        ? "Internal server error."
        : err.message || "Request failed.",
  });
}

module.exports = errorMiddleware;
