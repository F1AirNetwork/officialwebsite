/**
 * Standardised API response helpers.
 * All controllers use these so the frontend always gets a consistent shape.
 *
 * Success:  { success: true,  data: {...},  message?: "..." }
 * Error:    { success: false, error: "...", errors?: [...] }
 */

export const sendSuccess = (res, data = null, message = null, statusCode = 200) => {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

export const sendCreated = (res, data, message = "Created successfully") =>
  sendSuccess(res, data, message, 201);

export const sendError = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
  const payload = { success: false, error: message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

export const sendNotFound = (res, message = "Resource not found") =>
  sendError(res, message, 404);

export const sendUnauthorized = (res, message = "Unauthorized") =>
  sendError(res, message, 401);

export const sendForbidden = (res, message = "Forbidden") =>
  sendError(res, message, 403);

export const sendBadRequest = (res, message = "Bad request", errors = null) =>
  sendError(res, message, 400, errors);