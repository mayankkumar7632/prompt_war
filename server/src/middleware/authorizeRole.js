import HttpError from "./HttpError.js";

export function authorizeRole(...allowedRoles) {
  return function roleAuthorization(request, _response, next) {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      next(new HttpError(403, "Your account does not have permission to access this resource."));
      return;
    }
    next();
  };
}
