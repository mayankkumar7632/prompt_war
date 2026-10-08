import mongoose from "mongoose";
import HttpError from "./HttpError.js";

export function notFound(request, _response, next) {
  next(new HttpError(404, `Route not found: ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return response.status(400).json({ error: "Request body must contain valid JSON." });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return response.status(400).json({
      error: "Validation failed.",
      details: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return response.status(400).json({ error: "A supplied identifier is invalid." });
  }

  if (error?.code === 11000) {
    return response.status(409).json({ error: "A record with those details already exists." });
  }

  if (error instanceof HttpError) {
    return response.status(error.statusCode).json({ error: error.message });
  }

  console.error(error);
  return response.status(500).json({ error: "An unexpected server error occurred." });
}
